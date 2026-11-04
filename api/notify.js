// POSTINO DELLE NOTIFICHE (funzione Vercel, indirizzo /api/notify).
// L'app gli manda il messaggio della chat e l'elenco dei telefoni che lo devono ricevere:
// lui cifra il messaggio e lo spedisce a ciascun telefono (Google, Apple, Mozilla...).
// Standard "Web Push" (cifratura RFC 8291 aes128gcm + firma VAPID RFC 8292), senza librerie.
// La chiave VAPID NON sta nel codice (il repository è pubblico): si ricava da una frase segreta che sta solo
// nelle impostazioni di Vercel (variabile d'ambiente VAPID_SEED). Stessa frase = stessa chiave, sempre.
// La chiave pubblica la chiede l'app con GET /api/notify (serve ai telefoni per iscriversi).
const crypto = require("crypto");

const SUBJECT = "mailto:info@emora.it";
// ordine della curva P-256
const N = BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551");
let cached = null;
const vapidKeys = () => {
  const seed = String(process.env.VAPID_SEED || "").trim();
  if (seed.length < 16) return null;
  if (cached && cached.seed === seed) return cached;
  // dalla frase: 32 byte con HKDF-SHA256; se fuori dalla curva (quasi impossibile) si riprova col contatore
  for (let i = 0; i < 100; i++) {
    const d = Buffer.from(crypto.hkdfSync("sha256", Buffer.from(seed, "utf8"), Buffer.from("mora-vapid"), Buffer.from("p256-" + i), 32));
    const n = BigInt("0x" + d.toString("hex"));
    if (n === BigInt(0) || n >= N) continue;
    const ecdh = crypto.createECDH("prime256v1");
    ecdh.setPrivateKey(d);
    const pub = ecdh.getPublicKey();
    cached = { seed, d: b64u(d), x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)), publicKey: b64u(pub), key: null };
    return cached;
  }
  return null;
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

const privateKey = (k) =>
  k.key ||
  (k.key = crypto.createPrivateKey({
    key: { kty: "EC", crv: "P-256", x: k.x, y: k.y, d: k.d },
    format: "jwk",
  }));

// intestazione "Authorization: vapid t=<firma>, k=<chiave pubblica>"
const vapidAuth = (endpoint, now = Date.now()) => {
  const k = vapidKeys();
  if (!k) throw new Error("Manca VAPID_SEED nelle impostazioni di Vercel");
  const aud = new URL(endpoint).origin;
  const header = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const claims = b64u(
    JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: SUBJECT })
  );
  const sig = crypto.sign("sha256", Buffer.from(header + "." + claims), {
    key: privateKey(k),
    dsaEncoding: "ieee-p1363",
  });
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${k.publicKey}`;
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
  // l'app chiede la chiave pubblica per iscrivere il telefono
  if (req.method === "GET") {
    const k = vapidKeys();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ publicKey: k ? k.publicKey : null });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Usa GET o POST" });
  if (!vapidKeys()) return res.status(503).json({ error: "Notifiche non configurate: manca VAPID_SEED su Vercel", sent: 0, gone: [] });
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
module.exports.vapidKeys = vapidKeys;
