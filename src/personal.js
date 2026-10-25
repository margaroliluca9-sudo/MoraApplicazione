// LA MIA AREA: cose personali di ogni tecnico (le vede solo lui).
//  .../public/data/personal_events     impegni del calendario { owner, date "aaaa-mm-gg", time "hh:mm", title, place, notifyBefore, notifyAt, pending }
//  .../public/data/personal_notes      note { owner, title, text, items [{ t, done }], pinned, updatedAt }
//  .../public/data/personal_reminders  promemoria { owner, title, date, time, notify, notifyAt, pending, done, doneAt }
//  .../public/data/personal_contacts   contatti rapidi { owner, name, role, phone }
// "owner" = nome del tecnico in minuscolo. L'app carica solo i documenti del tecnico collegato.
// Le notifiche dei promemoria/impegni le manda /api/reminders (chiamato ogni 5 minuti).
import { serverTimestamp } from "firebase/firestore";
import { addDoc, deleteDoc, setDoc } from "./tracked";
import { chatRef, chatDoc, key } from "./chat";

export const PERSONAL = {
  events: "personal_events",
  notes: "personal_notes",
  reminders: "personal_reminders",
  contacts: "personal_contacts",
  hours: "personal_hours", // le mie ore (vedi hours.js)
  hoursReminder: "hours_reminders", // promemoria delle ore (uno per tecnico)
};

// --- date ---
const pad = (n) => String(n).padStart(2, "0");
export const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayIso = (now = new Date()) => isoOf(now);
export const parseIso = (iso) => {
  const p = String(iso || "").split("-").map(Number);
  return p.length === 3 && p.every((n) => !isNaN(n)) ? new Date(p[0], p[1] - 1, p[2]) : null;
};
// "16/10/2026" (data degli interventi) -> "2026-10-16"
export const isoFromLogDate = (ds) => {
  const p = String(ds || "").split("/").map(Number);
  return p.length === 3 && p.every((n) => !isNaN(n)) ? `${p[2]}-${pad(p[1])}-${pad(p[0])}` : "";
};
const DAYS = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
export const MONTHS = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
// "Lunedì 19 ottobre"
export const longDay = (iso) => {
  const d = parseIso(iso);
  return d ? `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()}` : "";
};
// "Oggi", "Domani", "Ieri" oppure "Mercoledì 21/10"
export const relDay = (iso, now = new Date()) => {
  const d = parseIso(iso);
  if (!d) return "";
  const diff = Math.round((d - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  if (diff === 0) return "Oggi";
  if (diff === 1) return "Domani";
  if (diff === -1) return "Ieri";
  return `${DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
};
// momento (in millisecondi) di un giorno + ora; senza ora: alle 8:00
export const momentOf = (iso, time) => {
  const d = parseIso(iso);
  if (!d) return null;
  const [h, m] = /^\d{1,2}:\d{2}$/.test(String(time || "")) ? time.split(":").map(Number) : [8, 0];
  d.setHours(h, m, 0, 0);
  return d.getTime();
};
// griglia del mese (settimane da lunedì): null = casella vuota
export const monthGrid = (year, month) => {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array(lead).fill(null);
  for (let n = 1; n <= days; n++) cells.push(isoOf(new Date(year, month, n)));
  while (cells.length % 7) cells.push(null);
  return cells;
};

// --- ordinamenti ---
const timeKey = (t) => (/^\d{1,2}:\d{2}$/.test(String(t || "")) ? t.padStart(5, "0") : "99:99");
export const sortEvents = (list) =>
  [...(list || [])].sort((a, b) => (a.date + timeKey(a.time)).localeCompare(b.date + timeKey(b.time)));
export const eventsOn = (events, iso) => sortEvents((events || []).filter((e) => e.date === iso));
export const openReminders = (list) =>
  [...(list || [])]
    .filter((r) => !r.done)
    .sort((a, b) => ((a.date || "9999") + timeKey(a.time)).localeCompare((b.date || "9999") + timeKey(b.time)));
export const doneReminders = (list) =>
  [...(list || [])].filter((r) => r.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
export const sortNotes = (list) =>
  [...(list || [])].sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.updatedAt || 0) - (a.updatedAt || 0)
  );

// "Oggi" in cima all'area: impegni di oggi + promemoria di oggi (o scaduti e non fatti)
export const todayItems = (events, reminders, now = new Date()) => {
  const iso = todayIso(now);
  const ev = eventsOn(events, iso).map((e) => ({ kind: "event", id: e.id, time: e.time, title: e.title, sub: e.place }));
  const rem = openReminders(reminders)
    .filter((r) => r.date && r.date <= iso)
    .map((r) => ({ kind: "reminder", id: r.id, time: r.date < iso ? "" : r.time, late: r.date < iso, title: r.title }));
  return [...ev, ...rem].sort((a, b) => timeKey(a.time).localeCompare(timeKey(b.time)));
};

// numeri del mese: interventi fatti e clienti visitati
export const isMine = (log, me) =>
  [log.technician, ...(log.additionalTechnicians || [])].some((t) => key(t) === key(me));
export const monthNumbers = (logs, me, now = new Date()) => {
  const prefix = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-`;
  const mine = (logs || []).filter((l) => isMine(l, me) && isoFromLogDate(l.dateString).startsWith(prefix));
  return { jobs: mine.length, customers: new Set(mine.map((l) => String(l.customer || "").trim().toUpperCase())).size };
};
// giorni del calendario con interventi fatti dal tecnico
export const jobDays = (logs, me) => {
  const map = {};
  (logs || []).forEach((l) => {
    if (!isMine(l, me)) return;
    const iso = isoFromLogDate(l.dateString);
    if (iso) (map[iso] = map[iso] || []).push(l);
  });
  return map;
};

// --- avvisi ---
export const NOTIFY_BEFORE = [
  { v: "", label: "Nessun avviso" },
  { v: "0", label: "All'ora dell'impegno" },
  { v: "15", label: "15 minuti prima" },
  { v: "60", label: "1 ora prima" },
  { v: "1440", label: "Il giorno prima" },
];
const withNotify = (data, at) => {
  const ok = at && at > Date.now() - 60000;
  return { ...data, notifyAt: ok ? at : null, pending: !!ok };
};

// --- salvataggi (ogni documento porta il proprietario) ---
const stamp = (me, data) => ({ ...data, owner: key(me), updatedAt: Date.now() });

export const saveEvent = async (me, ev) => {
  const before = ev.notifyBefore === "" || ev.notifyBefore == null ? null : Number(ev.notifyBefore);
  const start = momentOf(ev.date, ev.time);
  const data = withNotify(
    {
      date: ev.date,
      time: ev.time || "",
      title: String(ev.title || "").trim(),
      place: String(ev.place || "").trim(),
      notifyBefore: before,
    },
    before == null || !start ? null : start - before * 60000
  );
  if (ev.id) return setDoc(chatDoc(PERSONAL.events, ev.id), stamp(me, data));
  return addDoc(chatRef(PERSONAL.events), { ...stamp(me, data), createdAt: serverTimestamp() });
};

export const saveReminder = async (me, r) => {
  const data = withNotify(
    {
      title: String(r.title || "").trim(),
      date: r.date || "",
      time: r.date ? r.time || "" : "",
      notify: !!r.notify && !!r.date,
      done: !!r.done,
      doneAt: r.done ? r.doneAt || Date.now() : null,
    },
    r.notify && r.date && !r.done ? momentOf(r.date, r.time) : null
  );
  if (r.id) return setDoc(chatDoc(PERSONAL.reminders, r.id), stamp(me, data));
  return addDoc(chatRef(PERSONAL.reminders), { ...stamp(me, data), createdAt: serverTimestamp() });
};

export const saveNote = async (me, n) => {
  const data = {
    title: String(n.title || "").trim(),
    text: String(n.text || ""),
    items: (n.items || []).filter((i) => String(i.t || "").trim()).map((i) => ({ t: String(i.t).trim(), done: !!i.done })),
    pinned: !!n.pinned,
    // foto o fogli scansionati (data URL JPEG, al massimo 3)
    photos: (n.photos || []).filter((x) => typeof x === "string" && x.startsWith("data:image/")).slice(0, 3),
  };
  if (n.id) return setDoc(chatDoc(PERSONAL.notes, n.id), stamp(me, data));
  return addDoc(chatRef(PERSONAL.notes), { ...stamp(me, data), createdAt: serverTimestamp() });
};

export const saveContact = async (me, c) => {
  const data = {
    name: String(c.name || "").trim(),
    role: String(c.role || "").trim(),
    phone: String(c.phone || "").trim(),
  };
  if (c.id) return setDoc(chatDoc(PERSONAL.contacts, c.id), stamp(me, data));
  return addDoc(chatRef(PERSONAL.contacts), { ...stamp(me, data), createdAt: serverTimestamp() });
};

export const removePersonal = (kind, id) => deleteDoc(chatDoc(PERSONAL[kind], id));

// numero per il link "chiama" (solo cifre e +)
export const telHref = (phone) => {
  const p = String(phone || "").replace(/[^\d+]/g, "");
  return p.length >= 3 ? "tel:" + p : "";
};
