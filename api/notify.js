// POSTINO DELLE NOTIFICHE (funzione Vercel, indirizzo /api/notify).
// L'app gli manda il messaggio della chat e l'elenco dei telefoni che lo devono ricevere:
// lui cifra il messaggio e lo spedisce a ciascun telefono (Google, Apple, Mozilla...).
// Standard "Web Push" (cifratura RFC 8291 aes128gcm + firma VAPID RFC 8292), senza librerie.
// NB: la chiave privata è qui nel codice per scelta del titolare (repository pubblico):
// chi la legge potrebbe mandare notifiche finte ai telefoni iscritti.
const crypto = require("crypto");

const VAPID = {
  publicKey:
    "BMTDaawgn4Me2RivufzqaFUb5ZWia54xy8Ea43IX2Cw94bDkrknJrPZ40dH3UQLa9v9kOE5xbprUmcFfjwYrgUw",
  x: "xMNprCCfgx7ZGK-5_OpoVRvllaJrnjHLwRrjchfYLD0",
  y: "4bDkrknJrPZ40dH3UQLa9v9kOE5xbprUmcFfjwYrgUw",
  d: "X2A2lKoz-sjx-lcNw3S-VGztQTeUy35OCv6M4JtTfpc",
  subject: "mailto:info@emora.it",
};

// solo i servizi di notifica veri (niente indirizzi a caso)
const PUSH_HOSTS = [
  "fcm.googleapis.com",
  "android.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "web.push.apple.com",
  "push.apple.com",
  "notify.windows.com",
];
const allowedEndpoint = (endpoint) => {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && PUSH_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
  } catch (e) {
    return false;
  }
};

const b64u = (buf) => Buffer.from(buf).toString("base64url");
const fromB64u = (s) =>
  Buffer.from(String(s || "").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "base64url");
const ZERO = Buffer.from([0]);
const ONE = Buffer.from([1]);

let vapidKey = null;
const privateKey = () =>
  vapidKey ||
  (vapidKey = crypto.createPrivateKey({
    key: { kty: "EC", crv: "P-256", x: VAPID.x, y: VAPID.y, d: VAPID.d },
    format: "jwk",
  }));

// intestazione "Authorization: vapid t=<firma>, k=<chiave pubblica>"
const vapidAuth = (endpoint, now = Date.now()) => {
  const aud = new URL(endpoint).origin;
  const header = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const claims = b64u(
    JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: VAPID.subject })
  );
  const sig = crypto.sign("sha256", Buffer.from(header + "." + claims), {
    key: privateKey(),
    dsaEncoding: "ieee-p1363",
  });
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${VAPID.publicKey}`;
};

const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();

// cifratura del messaggio per un telefono (RFC 8291)
const encrypt = (sub, payload, opts = {}) => {
  const uaPublic = fromB64u(sub.keys.p256dh);
  const authSecret = fromB64u(sub.keys.auth);
  const salt = opts.salt || crypto.randomBytes(16);
  const local = opts.ecdh || crypto.createECDH("prime256v1");
  if (!opts.ecdh) local.generateKeys();
  const asPublic = local.getPublicKey();
  const shared = local.computeSecret(uaPublic);
  const prkKey = hmac(authSecret, shared);
  const keyInfo = Buffer.concat([Buffer.from("WebPush: info"), ZERO, uaPublic, asPublic]);
  const ikm = hmac(prkKey, Buffer.concat([keyInfo, ONE]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.concat([Buffer.from("Content-Encoding: aes128gcm"), ZERO, ONE])).subarray(0, 16);
  const nonce = hmac(prk, Buffer.concat([Buffer.from("Content-Encoding: nonce"), ZERO, ONE])).subarray(0, 12);
  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const body = Buffer.concat([
    cipher.update(Buffer.concat([Buffer.from(payload, "utf8"), Buffer.from([2])])),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  const rs = Buffer.alloc(4);
  rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, body]);
};

const sendOne = async (sub, payload) => {
  try {
    const r = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "86400",
        Urgency: "high",
        Authorization: vapidAuth(sub.endpoint),
      },
      body: encrypt(sub, payload),
    });
    return { endpoint: sub.endpoint, status: r.status };
  } catch (e) {
    return { endpoint: sub.endpoint, status: 0 };
  }
};

const handler = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Usa POST" });
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};
  const subs = (Array.isArray(body.subscriptions) ? body.subscriptions : [])
    .filter((s) => s && allowedEndpoint(s.endpoint) && s.keys && s.keys.p256dh && s.keys.auth)
    .slice(0, 200);
  const payload = JSON.stringify({
    title: String(body.title || "Chat Mora").slice(0, 80),
    body: String(body.text || "").slice(0, 300),
    tag: String(body.tag || "chat").slice(0, 64),
    // solo indirizzi interni dell'app che aprono una conversazione
    url: /^\/\?chat=[A-Za-z0-9%._~:|-]{1,160}$/.test(String(body.url || "")) ? body.url : "/?chat=group",
  });
  const results = await Promise.all(subs.map((s) => sendOne(s, payload)));
  res.status(200).json({
    sent: results.filter((r) => r.status >= 200 && r.status < 300).length,
    gone: results.filter((r) => r.status === 404 || r.status === 410).map((r) => r.endpoint),
    statuses: results.map((r) => r.status),
  });
};

module.exports = handler;
module.exports.encrypt = encrypt;
module.exports.vapidAuth = vapidAuth;
module.exports.allowedEndpoint = allowedEndpoint;
module.exports.VAPID_PUBLIC_KEY = VAPID.publicKey;
