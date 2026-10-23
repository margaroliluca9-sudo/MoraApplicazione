// ENTRATA NELL'APP (funzione Vercel, indirizzo /api/login).
// Nome + password aziendale come sempre: la password si controlla QUI sul server e, se è giusta,
// si risponde con il "pass" per il database (ruolo tecnico, ufficio o admin).
// Senza la chiave di servizio su Vercel risponde 503: l'app allora entra come prima.
//   POST { name, password }        -> { token, name, role }
//   POST { password, admin: true } -> { token, role: "admin" } (sblocco Impostazioni / eliminazioni)
//   GET                            -> { enabled: true|false }
const { serviceAccount, customToken, serverIdToken, isAdminPw, isStaffPw, PROJECT } = require("./_auth");

const DATA = "artifacts/mora-maintenance-v1/public/data";
const send = (res, code, data) => res.status(code).json(data);
const key = (s) => String(s || "").trim().toLowerCase();
const uidOf = (name) => "tech-" + key(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);

// tentativi sbagliati: dopo 8 in 10 minuti dallo stesso indirizzo si aspetta
const tries = new Map();
const blocked = (ip) => {
  const now = Date.now();
  const t = (tries.get(ip) || []).filter((x) => now - x < 10 * 60 * 1000);
  tries.set(ip, t);
  return t.length >= 8;
};
const failed = (ip) => tries.set(ip, [...(tries.get(ip) || []), Date.now()]);

// elenco dello Staff (nome e ruolo), letto dal database con l'accesso del server
const staff = async (sa) => {
  const id = await serverIdToken(sa);
  const out = [];
  let page = "";
  do {
    const r = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${DATA}/technicians?pageSize=300${page ? "&pageToken=" + page : ""}`,
      { headers: { Authorization: "Bearer " + id } }
    );
    const j = await r.json();
    if (!r.ok) throw new Error("Elenco Staff non leggibile");
    (j.documents || []).forEach((d) => {
      const f = d.fields || {};
      out.push({ name: (f.name && f.name.stringValue) || "", role: (f.role && f.role.stringValue) || "tecnico" });
    });
    page = j.nextPageToken || "";
  } while (page);
  return out;
};

const handler = async (req, res) => {
  const sa = serviceAccount();
  if (req.method === "GET") return send(res, 200, { enabled: !!sa });
  if (req.method !== "POST") return send(res, 405, { error: "Usa POST" });
  const origin = String(req.headers.origin || "");
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "");
  if (origin && host && origin.replace(/^https?:\/\//, "") !== host) return send(res, 403, { error: "Non permesso" });
  if (!sa) return send(res, 503, { error: "non-configurato" });
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  body = body || {};
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
  if (blocked(ip)) return send(res, 429, { error: "Troppi tentativi: riprova tra qualche minuto." });
  const password = String(body.password || "");
  const name = String(body.name || "").trim();

  try {
    // solo la password di amministratore (Impostazioni, eliminazioni)
    if (body.admin) {
      if (!isAdminPw(password)) {
        failed(ip);
        return send(res, 401, { error: "Password errata." });
      }
      const who = name || "admin";
      return send(res, 200, { token: customToken(sa, uidOf(who), { mora: true, role: "admin", name: who }), name: who, role: "admin" });
    }
    if (!name || !password) return send(res, 400, { error: "Inserisci il tuo Nome e la Password aziendale." });
    if (isAdminPw(password)) {
      return send(res, 200, { token: customToken(sa, uidOf(name), { mora: true, role: "admin", name }), name, role: "admin" });
    }
    if (isStaffPw(password)) {
      const t = (await staff(sa)).find((x) => key(x.name) === key(name));
      if (!t) return send(res, 403, { error: "Nome non autorizzato. Chiedi all'amministratore di aggiungerti all'elenco dello Staff." });
      const role = t.role === "ufficio" ? "ufficio" : "tecnico";
      return send(res, 200, { token: customToken(sa, uidOf(t.name), { mora: true, role, name: t.name }), name: t.name, role });
    }
    failed(ip);
    return send(res, 401, { error: "Password errata." });
  } catch (e) {
    return send(res, 500, { error: "Accesso non riuscito, riprova." });
  }
};

module.exports = handler;
