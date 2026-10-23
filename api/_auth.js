// SICUREZZA (usato da /api/login e /api/reminders; il trattino basso = non è un indirizzo).
// Con la "chiave di servizio" di Firebase (Vercel → Settings → Environment Variables →
// FIREBASE_SERVICE_ACCOUNT = contenuto del file JSON scaricato da Firebase) il server firma un
// "pass" per chi ha messo la password giusta. Il database accetta solo chi ha il pass.
// Niente librerie: il pass è un JWT firmato RS256 con la chiave privata.
const crypto = require("crypto");

const PROJECT = "mora-app-36607";
const API_KEY = "AIzaSyCQ3VhCtvxIP2cxtdSgMzYXaTg4E1zPlZE";
const AUD = "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";

// la chiave di servizio (null = non ancora messa su Vercel: tutto funziona come prima)
const serviceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw);
    if (!sa.client_email || !sa.private_key) return null;
    return { email: sa.client_email, key: String(sa.private_key).replace(/\\n/g, "\n") };
  } catch (e) {
    return null;
  }
};

const b64u = (x) => Buffer.from(typeof x === "string" ? x : JSON.stringify(x)).toString("base64url");

// pass per Firebase: uid + ruolo. Vale 1 ora per essere usato; poi Firebase tiene la sessione da solo.
const customToken = (sa, uid, claims) => {
  const now = Math.floor(Date.now() / 1000);
  const head = b64u({ alg: "RS256", typ: "JWT" });
  const body = b64u({ iss: sa.email, sub: sa.email, aud: AUD, iat: now, exp: now + 3600, uid, claims });
  const sig = crypto.sign("RSA-SHA256", Buffer.from(`${head}.${body}`), sa.key).toString("base64url");
  return `${head}.${body}.${sig}`;
};

// il server stesso entra nel database (per leggere l'elenco dei tecnici, per i promemoria)
let serverTok = null;
const serverIdToken = async (sa) => {
  if (serverTok && serverTok.until > Date.now()) return serverTok.id;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken(sa, "mora-server", { mora: true, role: "server" }), returnSecureToken: true }),
  });
  const j = await r.json();
  if (!j.idToken) throw new Error("Accesso del server non riuscito: " + JSON.stringify(j.error || j).slice(0, 200));
  serverTok = { id: j.idToken, until: Date.now() + 50 * 60 * 1000 };
  return j.idToken;
};

// le password: impronta SHA-256 di "mora-app-36607|" + password (come in src/passwords.js).
// Si possono spostare su Vercel (MORA_ADMIN_HASH, MORA_STAFF_HASH) per toglierle dal codice.
const SALT = "mora-app-36607|";
const ADMIN_HASH = process.env.MORA_ADMIN_HASH || "4aa7205a535d1d0f06732b04fe12e5b09111bdfc39c84c0c32f2fac70cbfa5f0";
const STAFF_HASH = process.env.MORA_STAFF_HASH || "deea72fa43190f2a127ed2f339a704e5e272dc184067b45f1fd0d783aba10370";
const hashOf = (pw) => crypto.createHash("sha256").update(SALT + String(pw || ""), "utf8").digest("hex");
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const isAdminPw = (pw) => same(hashOf(pw), ADMIN_HASH);
const isStaffPw = (pw) => same(hashOf(pw), STAFF_HASH);

module.exports = { PROJECT, API_KEY, serviceAccount, customToken, serverIdToken, isAdminPw, isStaffPw };
