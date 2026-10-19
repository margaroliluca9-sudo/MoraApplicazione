// AVVISI DI PROMEMORIA E IMPEGNI ("La mia area").
// Viene chiamato ogni 5 minuti (GitHub Actions, .github/workflows/promemoria.yml).
// Cerca i promemoria/impegni con l'avviso scaduto e non ancora mandato, manda la notifica
// ai telefoni di quel tecnico e li segna come avvisati.
const { encrypt, vapidAuth, allowedEndpoint } = require("./notify");

const PROJECT = "mora-app-36607";
const API_KEY = "AIzaSyCQ3VhCtvxIP2cxtdSgMzYXaTg4E1zPlZE";
const DATA = "artifacts/mora-maintenance-v1/public/data";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const LATE_LIMIT = 6 * 3600 * 1000; // avvisi più vecchi di 6 ore: non li mando più

// --- valori di Firestore (formato REST) ---
const fromValue = (v) => {
  if (!v || typeof v !== "object") return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(fromValue);
  if ("mapValue" in v) return fromFields(v.mapValue.fields || {});
  return null;
};
const fromFields = (fields) => {
  const o = {};
  for (const k of Object.keys(fields || {})) o[k] = fromValue(fields[k]);
  return o;
};
const docOf = (d) => ({ name: d.name, id: d.name.split("/").pop(), ...fromFields(d.fields) });
const key = (s) => String(s || "").trim().toLowerCase();

// accesso al database: prima senza credenziali, se serve come utente anonimo (come l'app)
let token = null;
const signIn = async () => {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const j = await r.json();
  token = j.idToken || null;
  return token;
};
const call = async (url, opts = {}, retry = true) => {
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) };
  const r = await fetch(url, { ...opts, headers });
  if ((r.status === 401 || r.status === 403) && retry) {
    await signIn();
    return call(url, opts, false);
  }
  if (!r.ok) throw new Error(`Firestore ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

const pendingOf = async (collectionId) => {
  const rows = await call(`${BASE}/${DATA}:runQuery`, {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: { fieldFilter: { field: { fieldPath: "pending" }, op: "EQUAL", value: { booleanValue: true } } },
        limit: 300,
      },
    }),
  });
  return (rows || []).filter((x) => x.document).map((x) => docOf(x.document));
};
const subscriptions = async () => {
  const out = [];
  let page = "";
  for (let i = 0; i < 5; i++) {
    const j = await call(`${BASE}/${DATA}/push_subscriptions?pageSize=300${page ? "&pageToken=" + page : ""}`);
    (j.documents || []).forEach((d) => out.push(docOf(d)));
    if (!j.nextPageToken) break;
    page = j.nextPageToken;
  }
  return out;
};
const markSent = (doc, now) =>
  call(`https://firestore.googleapis.com/v1/${doc.name}?updateMask.fieldPaths=pending&updateMask.fieldPaths=notifiedAt`, {
    method: "PATCH",
    body: JSON.stringify({ fields: { pending: { booleanValue: false }, notifiedAt: { integerValue: String(now) } } }),
  });

const send = async (sub, payload) => {
  try {
    const r = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "21600",
        Urgency: "high",
        Authorization: vapidAuth(sub.endpoint),
      },
      body: encrypt(sub, payload),
    });
    return r.status;
  } catch (e) {
    return 0;
  }
};

// testo della notifica
const dayText = (iso) => {
  const p = String(iso || "").split("-");
  return p.length === 3 ? `${Number(p[2])}/${Number(p[1])}` : "";
};
const messageFor = (kind, d) =>
  kind === "event"
    ? {
        title: `Impegno${d.time ? " alle " + d.time : " il " + dayText(d.date)}`,
        body: [d.title, d.place].filter(Boolean).join(" · "),
        tag: "evento-" + d.id,
        url: "/?area=calendar",
      }
    : {
        title: "Promemoria",
        body: d.title || "",
        tag: "promemoria-" + d.id,
        url: "/?area=reminders",
      };

const run = async (now = Date.now()) => {
  const due = [];
  for (const [kind, coll] of [["reminder", "personal_reminders"], ["event", "personal_events"]]) {
    for (const d of await pendingOf(coll)) {
      if (d.notifyAt && d.notifyAt <= now + 60000) due.push({ kind, d });
    }
  }
  if (!due.length) return { due: 0, sent: 0 };
  const subs = (await subscriptions()).filter((s) => allowedEndpoint(s.endpoint) && s.keys && s.keys.p256dh && s.keys.auth);
  let sent = 0;
  for (const { kind, d } of due) {
    if (d.done) {
      await markSent(d, now);
      continue;
    }
    if (now - d.notifyAt <= LATE_LIMIT) {
      const m = messageFor(kind, d);
      const payload = JSON.stringify({ title: m.title.slice(0, 80), body: m.body.slice(0, 300), tag: m.tag.slice(0, 64), url: m.url });
      const mine = subs.filter((s) => key(s.technician) === key(d.owner) && s.reminders !== false);
      const res = await Promise.all(mine.map((s) => send(s, payload)));
      sent += res.filter((st) => st >= 200 && st < 300).length;
    }
    await markSent(d, now);
  }
  return { due: due.length, sent };
};

const handler = async (req, res) => {
  try {
    const out = await run();
    res.status(200).json({ ok: true, ...out, at: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message ? e.message : e) });
  }
};

module.exports = handler;
module.exports.run = run;
module.exports.fromFields = fromFields;
module.exports.messageFor = messageFor;
