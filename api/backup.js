// COPIA DI SICUREZZA DALL'APP (area admin → System → «Fai una copia adesso»).
// GET  /api/backup            → le ultime copie (data e se sono riuscite)
// POST /api/backup {password} → fa partire subito la copia (stessa di ogni domenica: .github/workflows/backup.yml)
// Serve la password admin (controllata qui, anche quella cambiata dall'area admin «Azienda»).
// Per far partire la copia serve la chiave GitHub nella variabile GITHUB_BACKUP_TOKEN su Vercel
// (mai nel codice: il progetto è pubblico).
const crypto = require("crypto");

const REPO = "margaroliluca9-sudo/MoraApplicazione";
const WORKFLOW = "backup.yml";
const PROJECT = "mora-app-36607";
const API_KEY = "AIzaSyCQ3VhCtvxIP2cxtdSgMzYXaTg4E1zPlZE"; // chiave web pubblica (è già dentro l'app)
const DATA = "artifacts/mora-maintenance-v1/public/data";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const SALT = "mora-app-36607|";
const ADMIN_HASH = "4aa7205a535d1d0f06732b04fe12e5b09111bdfc39c84c0c32f2fac70cbfa5f0"; // come in src/passwords.js

const gh = (path, opts = {}) => {
  const token = process.env.GITHUB_BACKUP_TOKEN;
  return fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...opts,
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "mora-app",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
  });
};

// impronta della password admin: quella cambiata dall'area admin (settings/azienda) o quella di sempre
const adminHash = async () => {
  try {
    const s = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    });
    const token = (await s.json()).idToken;
    const r = await fetch(`${BASE}/${DATA}/settings/azienda`, { headers: token ? { Authorization: "Bearer " + token } : {} });
    if (r.ok) {
      const j = await r.json();
      const h = j.fields && j.fields.adminHash && j.fields.adminHash.stringValue;
      if (h && /^[0-9a-f]{64}$/.test(h)) return h;
    }
  } catch (e) {
    // database non raggiungibile: vale quella di sempre
  }
  return ADMIN_HASH;
};
const sha = (t) => crypto.createHash("sha256").update(t, "utf8").digest("hex");

const lastRuns = async () => {
  const r = await gh(`/actions/workflows/${WORKFLOW}/runs?per_page=5`);
  if (!r.ok) return [];
  const j = await r.json();
  return (j.workflow_runs || []).map((x) => ({
    at: x.created_at,
    status: x.status, // queued | in_progress | completed
    ok: x.conclusion === "success",
    conclusion: x.conclusion,
    manual: x.event === "workflow_dispatch",
    url: x.html_url,
  }));
};

const readBody = async (req) => {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  return {};
};

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      return res.status(200).json({ ok: true, ready: !!process.env.GITHUB_BACKUP_TOKEN, runs: await lastRuns() });
    }
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Metodo non permesso" });
    const { password } = await readBody(req);
    if (typeof password !== "string" || !password || sha(SALT + password) !== (await adminHash())) {
      return res.status(403).json({ ok: false, error: "Password admin sbagliata." });
    }
    if (!process.env.GITHUB_BACKUP_TOKEN) {
      return res.status(503).json({ ok: false, error: "Manca la chiave GitHub su Vercel (GITHUB_BACKUP_TOKEN)." });
    }
    // una alla volta: se ce n'è già una partita da meno di 10 minuti non ne lancio un'altra
    const runs = await lastRuns();
    const busy = runs.find((x) => x.status !== "completed" || Date.now() - Date.parse(x.at) < 10 * 60 * 1000);
    if (busy) return res.status(200).json({ ok: true, already: true, runs });
    const r = await gh(`/actions/workflows/${WORKFLOW}/dispatches`, { method: "POST", body: JSON.stringify({ ref: "main" }) });
    if (r.status !== 204) {
      const t = (await r.text()).slice(0, 200);
      return res.status(502).json({ ok: false, error: `GitHub non ha fatto partire la copia (${r.status}). ${t}` });
    }
    return res.status(200).json({ ok: true, started: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String((e && e.message) || e) });
  }
};
