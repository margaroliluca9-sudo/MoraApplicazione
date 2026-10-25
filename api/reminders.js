// AVVISI DI PROMEMORIA E IMPEGNI ("La mia area").
// Viene chiamato ogni 5 minuti (GitHub Actions, .github/workflows/promemoria.yml).
// Manda anche il promemoria di «Le mie ore» (hours_reminders) dal lunedì al venerdì.
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

// --- LE MIE ORE: "Hai fatto ore in più o in meno?" dal lunedì al venerdì all'ora scelta ---
// ora italiana (il server è in UTC)
const romeNow = (now) => {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
  });
  const p = Object.fromEntries(f.formatToParts(new Date(now)).map((x) => [x.type, x.value]));
  return { iso: `${p.year}-${p.month}-${p.day}`, min: (Number(p.hour) % 24) * 60 + Number(p.minute), dow: p.weekday };
};
const easterOf = (year) => {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
};
const isHoliday = (iso) => {
  if (["01-01", "01-06", "04-25", "05-01", "06-02", "08-15", "11-01", "12-08", "12-25", "12-26"].includes(iso.slice(5))) return true;
  const e = easterOf(Number(iso.slice(0, 4)));
  return new Date(e.getTime() + 86400000).toISOString().slice(0, 10) === iso; // Pasquetta
};
const listAll = async (coll) => {
  const out = [];
  let page = "";
  for (let i = 0; i < 5; i++) {
    const j = await call(`${BASE}/${DATA}/${coll}?pageSize=300${page ? "&pageToken=" + page : ""}`);
    (j.documents || []).forEach((d) => out.push(docOf(d)));
    if (!j.nextPageToken) break;
    page = j.nextPageToken;
  }
  return out;
};
const exists = async (coll, id) => {
  try {
    await call(`${BASE}/${DATA}/${coll}/${encodeURIComponent(id)}`);
    return true;
  } catch (e) {
    if (/Firestore 404/.test(String(e.message))) return false;
    throw e;
  }
};
const HOURS_MSG = {
  title: "Le mie ore",
  body: "Hai fatto ore in più o in meno oggi? Tocca per segnarlo (se è una giornata normale non serve).",
  url: "/?area=hours",
};
// promemoria delle ore da mandare adesso
const hoursDue = async (now) => {
  const r = romeNow(now);
  if (r.dow === "Sat" || r.dow === "Sun" || isHoliday(r.iso)) return [];
  const docs = await listAll("hours_reminders");
  const due = docs.filter((d) => {
    if (!d.enabled || !d.owner || d.lastSent === r.iso) return false;
    const [h, m] = String(d.time || "17:30").split(":").map(Number);
    const t = (h || 0) * 60 + (m || 0);
    return r.min >= t && r.min < t + 180;
  }).map((d) => ({ d, iso: r.iso }));
  // chiusura aziendale (area admin): niente promemoria delle ore
  if (due.length && (await isClosure(r.iso))) return [];
  return due;
};

// chiusure aziendali decise dall'admin (settings/azienda.closures), anche «ogni anno»
const inRange = (iso, from, to, yearly) => {
  if (!from) return false;
  const t = to || from;
  if (!yearly) return iso >= from && iso <= t;
  const x = iso.slice(5, 10);
  const a = String(from).slice(5, 10);
  const b = String(t).slice(5, 10);
  return a <= b ? x >= a && x <= b : x >= a || x <= b;
};
const isClosure = async (iso) => {
  try {
    const j = await call(`${BASE}/${DATA}/settings/azienda`);
    const list = (fromFields(j.fields || {}).closures) || [];
    return list.some((c) => c && inRange(iso, c.from, c.to, !!c.yearly));
  } catch (e) {
    return false;
  }
};
const markHoursSent = (doc, iso) =>
  call(`https://firestore.googleapis.com/v1/${doc.name}?updateMask.fieldPaths=lastSent`, {
    method: "PATCH",
    body: JSON.stringify({ fields: { lastSent: { stringValue: iso } } }),
  });

// "Tecnici online": ogni apertura dell'app lascia un documento in active_users che nessuno
// cancellava; l'app li leggeva tutti a ogni avvio. Una volta all'ora tolgo quelli fermi da 2 giorni.
const STALE = 2 * 24 * 3600 * 1000;
// tolgo i documenti di una raccolta con il campo data più vecchio di "before"
const cleanOld = async (collectionId, fieldPath, before) => {
  const rows = await call(`${BASE}/${DATA}:runQuery`, {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: "LESS_THAN",
            value: { timestampValue: new Date(before).toISOString() },
          },
        },
        limit: 400,
      },
    }),
  });
  const names = (rows || []).filter((x) => x.document).map((x) => x.document.name);
  if (!names.length) return 0;
  await call(`${BASE}:commit`, { method: "POST", body: JSON.stringify({ writes: names.map((n) => ({ delete: n })) }) });
  return names.length;
};
// registro degli accessi (area admin → System mostra gli ultimi 50): tengo un anno
const LOG_KEEP = 365 * 24 * 3600 * 1000;
const ERR_KEEP = 60 * 24 * 3600 * 1000;
const TRASH_KEEP = 30 * 24 * 3600 * 1000;
const cleanTrash = async (before) => {
  const rows = await call(`${BASE}/${DATA}:runQuery`, {
    method: "POST",
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "deleted_logs" }],
        where: { fieldFilter: { field: { fieldPath: "deletedAt" }, op: "LESS_THAN", value: { timestampValue: new Date(before).toISOString() } } },
        limit: 200,
      },
    }),
  });
  const names = (rows || []).filter((x) => x.document).map((x) => x.document.name);
  if (!names.length) return 0;
  const writes = [];
  names.forEach((n) => {
    writes.push({ delete: n });
    writes.push({ delete: n.replace("/deleted_logs/", "/log_photos/") });
  });
  await call(`${BASE}:commit`, { method: "POST", body: JSON.stringify({ writes }) });
  return names.length;
};
const cleanPresence = async (now) => {
  const n = await cleanOld("active_users", "lastActive", now - STALE);
  await cleanOld("access_logs", "timestamp", now - LOG_KEEP).catch(() => 0);
  // cestino dei rapporti (Area admin → Cestino): dopo 30 giorni via per sempre, foto comprese
  await cleanTrash(now - TRASH_KEEP).catch(() => 0);
  // errori arrivati dai telefoni (Area admin → System): tengo 60 giorni
  await cleanOld("app_errors", "when", now - ERR_KEEP).catch(() => 0);
  // biglietti delle modifiche (sync.js): servono ai telefoni per una settimana, ne tengo 9 giorni
  await cleanOld("changes", "at", now - 9 * 24 * 3600 * 1000).catch(() => 0);
  return n;
};

// RIEPILOGO DEL MESE: il 1° del mese dalle 9 avviso all'admin (Luca) che in Ufficio c'è il PDF del mese finito.
// Una volta sola: il mese avvisato resta in settings/riepilogo.
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const ADMINS = ["luca"];
const monthNotice = async (now) => {
  const r = romeNow(now);
  if (r.iso.slice(8) !== "01" || r.min < 9 * 60) return 0;
  const y = Number(r.iso.slice(0, 4));
  const m = Number(r.iso.slice(5, 7)) - 1; // mese di oggi (0-11)
  const py = m === 0 ? y - 1 : y;
  const pm = m === 0 ? 11 : m - 1;
  const key2 = `${py}-${String(pm + 1).padStart(2, "0")}`;
  let last = "";
  try {
    const d = await call(`${BASE}/${DATA}/settings/riepilogo`);
    last = (fromFields(d.fields || {}).lastMonth) || "";
  } catch (e) {
    if (!/Firestore 404/.test(String(e.message))) throw e;
  }
  if (last === key2) return 0;
  // prima segno (così anche se qualcosa va storto non arrivano avvisi doppi)
  await call(`${BASE}/${DATA}/settings/riepilogo?updateMask.fieldPaths=lastMonth`, {
    method: "PATCH",
    body: JSON.stringify({ fields: { lastMonth: { stringValue: key2 } } }),
  });
  const subs = (await subscriptions()).filter((s) => allowedEndpoint(s.endpoint) && s.keys && s.keys.p256dh && s.keys.auth && ADMINS.includes(key(s.technician)));
  const payload = JSON.stringify({
    title: `Riepilogo di ${MESI[pm]} pronto`,
    body: `In Ufficio trovi il PDF di ${MESI[pm]} ${py}: interventi, tecnici, clienti e gru con più guasti.`,
    tag: `riepilogo-${key2}`,
    url: "/",
  });
  const res = await Promise.all(subs.map((s) => send(s, payload)));
  return res.filter((st) => st >= 200 && st < 300).length;
};

const run = async (now = Date.now()) => {
  // riepilogo del mese (il 1° dalle 9): un avviso all'admin
  const monthSent = await monthNotice(now).catch(() => 0);
  // il controllo gira ogni 5 minuti: la pulizia solo nei primi 5 minuti di ogni ora
  if (new Date(now).getUTCMinutes() < 5) await cleanPresence(now).catch(() => 0);
  const due = [];
  for (const [kind, coll] of [["reminder", "personal_reminders"], ["event", "personal_events"]]) {
    for (const d of await pendingOf(coll)) {
      if (d.notifyAt && d.notifyAt <= now + 60000) due.push({ kind, d });
    }
  }
  const hours = await hoursDue(now).catch(() => []);
  if (!due.length && !hours.length) return { due: 0, sent: monthSent, hours: 0 };
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
  for (const { d, iso } of hours) {
    const owner = key(d.owner);
    // se ha già segnato il giorno non serve ricordarlo
    const done = await exists("personal_hours", `${owner}_${iso}`.replace(/[^a-z0-9_-]/gi, "_"));
    if (!done) {
      const payload = JSON.stringify({ ...HOURS_MSG, tag: "ore-" + iso });
      const mine = subs.filter((s) => key(s.technician) === owner && s.reminders !== false);
      const res = await Promise.all(mine.map((s) => send(s, payload)));
      sent += res.filter((st) => st >= 200 && st < 300).length;
    }
    await markHoursSent(d, iso);
  }
  return { due: due.length, hours: hours.length, sent: sent + monthSent };
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
module.exports.monthNotice = monthNotice;
module.exports.fromFields = fromFields;
module.exports.messageFor = messageFor;
module.exports.romeNow = romeNow;
module.exports.isHoliday = isHoliday;
module.exports.inRange = inRange;
