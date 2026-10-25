// LE MIE ORE (La mia area, si accende da ⚙ Impostazioni): un calendario solo per gli orari.
//  .../public/data/personal_hours { owner, date "aaaa-mm-gg", kind, minutes, note, updatedAt }
//   kind: "lavoro"   minutes = ore fatte (es. 510 = 8 h 30 → 30 min di straordinario)
//         "permesso" minutes = ore di permesso
//         "ferie" | "malattia" | "festa"  giorno intero (minutes ignorato)
// Un documento per giorno (id = owner_data). Le vede solo il tecnico.
import { setDoc, deleteDoc } from "./tracked";
import { chatDoc, key } from "./chat";
import { MONTHS, parseIso, isoOf } from "./personal";
import { easterOf } from "./season";
import { closureOf } from "./company";
import { syncExtra } from "./settings";

export const HOURS = "personal_hours";
export const STD_DEFAULT = 480; // orario normale: 8 ore

export const KINDS = [
  { id: "lavoro", label: "Lavoro", short: "", tone: "slate" },
  { id: "ferie", label: "Ferie", short: "F", tone: "blue" },
  { id: "permesso", label: "Permesso", short: "P", tone: "purple" },
  { id: "malattia", label: "Malattia", short: "M", tone: "red" },
  { id: "festa", label: "Festa / riposo", short: "R", tone: "slate" },
];
export const kindOf = (id) => KINDS.find((k) => k.id === id) || KINDS[0];

// 90 -> "1 h 30", 30 -> "30 min", 480 -> "8 h"
export const fmtMin = (m) => {
  const n = Math.round(Number(m) || 0);
  const a = Math.abs(n);
  const h = Math.floor(a / 60);
  const r = a % 60;
  const s = h ? (r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`) : `${r} min`;
  return n < 0 ? "-" + s : s;
};
// differenza dall'orario normale: "+30 min", "-1 h", "" se uguale
export const fmtDelta = (d) => (d > 0 ? "+" + fmtMin(d) : d < 0 ? fmtMin(d) : "");

export const docId = (me, date) => `${key(me)}_${date}`.replace(/[^a-z0-9_-]/gi, "_");
export const ymOf = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
export const monthLabel = (y, m) => `${MONTHS[m]} ${y}`;

export const byDate = (list) => {
  const o = {};
  (list || []).forEach((h) => {
    if (h && h.date) o[h.date] = h;
  });
  return o;
};

// FESTE NAZIONALI (non contano come giorno di lavoro)
const FIXED = ["01-01", "01-06", "04-25", "05-01", "06-02", "08-15", "11-01", "12-08", "12-25", "12-26"];
export const isHoliday = (iso) => {
  const md = String(iso).slice(5);
  if (FIXED.includes(md)) return true;
  const y = Number(String(iso).slice(0, 4));
  const e = easterOf(y);
  const pasquetta = new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1);
  return isoOf(pasquetta) === iso;
};
// sabato, domenica e feste (anche le chiusure aziendali segnate come «festa»):
// niente orario normale, tutte le ore fatte sono straordinario
export const isFreeDay = (iso) => {
  const d = parseIso(iso);
  if (!d) return false;
  if (d.getDay() === 0 || d.getDay() === 6 || isHoliday(iso)) return true;
  const c = closureOf(iso);
  return !!c && c.kind === "festa";
};
export const stdOf = (iso, std = STD_DEFAULT) => (iso && isFreeDay(iso) ? 0 : std);
export const deltaOf = (h, std = STD_DEFAULT) => (h && h.kind === "lavoro" ? (Number(h.minutes) || 0) - stdOf(h.date, std) : 0);

// DI BASE: dal lunedì al venerdì (non festivi) sono giornate normali di lavoro, fino a oggi,
// dal giorno in cui il tecnico ha acceso «Le mie ore». Si cambiano toccando il giorno.
export const withDefaults = (list, y, m, std = STD_DEFAULT, since = "", today = isoOf(new Date())) => {
  const map = byDate(list);
  const out = [...(list || [])];
  const days = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const iso = isoOf(new Date(y, m, d));
    if (iso > today || (since && iso < since) || map[iso]) continue;
    const dow = new Date(y, m, d).getDay();
    if (dow === 0 || dow === 6) continue;
    // chiusura aziendale (decisa dall'admin): ferie o festa, con il suo nome
    const c = isHoliday(iso) ? null : closureOf(iso);
    if (c) out.push({ date: iso, kind: c.kind === "festa" ? "festa" : "ferie", minutes: 0, auto: true, note: String(c.label || "Chiusura aziendale") });
    else out.push(isHoliday(iso) ? { date: iso, kind: "festa", minutes: 0, auto: true } : { date: iso, kind: "lavoro", minutes: std, auto: true });
  }
  return out;
};

// riepilogo del mese
export const monthSummary = (list, y, m, std = STD_DEFAULT) => {
  const k = ymOf(y, m);
  const s = { worked: 0, extra: 0, less: 0, workDays: 0, ferie: 0, malattia: 0, festa: 0, permesso: 0 };
  (list || []).forEach((h) => {
    if (String(h.date).slice(0, 7) !== k) return;
    if (h.kind === "lavoro") {
      const min = Number(h.minutes) || 0;
      s.worked += min;
      s.workDays += 1;
      const d = deltaOf(h, std);
      if (d > 0) s.extra += d;
      if (d < 0) s.less += -d;
    } else if (h.kind === "permesso") s.permesso += Number(h.minutes) || 0;
    else if (s[h.kind] !== undefined) s[h.kind] += 1;
  });
  return s;
};

// scritta piccola dentro la casella del calendario
export const cellLabel = (h, std = STD_DEFAULT) => {
  if (!h) return null;
  if (h.kind === "lavoro") {
    const d = deltaOf(h, std);
    if (h.auto) return { text: short(h.minutes), tone: "auto" };
    if (isFreeDay(h.date)) return { text: "+" + short(h.minutes), tone: "emerald" };
    if (d > 0) return { text: "+" + short(d), tone: "emerald" };
    if (d < 0) return { text: "-" + short(-d), tone: "amber" };
    return { text: short(h.minutes), tone: "slate" };
  }
  if (h.kind === "permesso") return { text: "P" + (h.minutes ? " " + short(h.minutes) : ""), tone: "purple" };
  const k = kindOf(h.kind);
  return { text: k.short, tone: k.tone };
};
// 90 -> "1½", 30 -> "½", 480 -> "8", 75 -> "1:15"
const short = (m) => {
  const n = Math.round(Number(m) || 0);
  const h = Math.floor(n / 60);
  const r = n % 60;
  if (r === 0) return String(h);
  if (r === 30) return (h ? h : "") + "½";
  return `${h}:${String(r).padStart(2, "0")}`;
};

const DOW = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
export const shortDay = (iso) => {
  const d = parseIso(iso);
  return d ? `${DOW[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}` : iso;
};
export const dayText = (h, std = STD_DEFAULT) => {
  if (h.kind === "lavoro") {
    const d = deltaOf(h, std);
    return fmtMin(h.minutes) + (d ? ` (${fmtDelta(d)})` : "");
  }
  if (h.kind === "permesso") return "permesso " + fmtMin(h.minutes);
  return kindOf(h.kind).label.toLowerCase();
};

// testo da mandare (WhatsApp, mail)
export const summaryText = (me, list, y, m, std = STD_DEFAULT) => {
  const k = ymOf(y, m);
  const days = (list || []).filter((h) => String(h.date).slice(0, 7) === k).sort((a, b) => a.date.localeCompare(b.date));
  const s = monthSummary(list, y, m, std);
  // i giorni normali messi in automatico non li elenco (contano nel totale)
  const lines = days.filter((h) => !h.auto || h.kind !== "lavoro").map((h) => `${shortDay(h.date)}: ${dayText(h, std)}${h.note ? " – " + h.note : ""}`);
  const tot = [
    `Ore lavorate: ${fmtMin(s.worked)} in ${s.workDays} giorni`,
    s.extra ? `Straordinari: ${fmtMin(s.extra)}` : "",
    s.less ? `Ore in meno: ${fmtMin(s.less)}` : "",
    s.ferie ? `Ferie: ${s.ferie} ${s.ferie === 1 ? "giorno" : "giorni"}` : "",
    s.permesso ? `Permessi: ${fmtMin(s.permesso)}` : "",
    s.malattia ? `Malattia: ${s.malattia} ${s.malattia === 1 ? "giorno" : "giorni"}` : "",
  ].filter(Boolean);
  const intro = `(gli altri giorni da lunedì a venerdì: ${fmtMin(std)}; sabato, domenica e feste tutto straordinario)`;
  return `Ore di ${monthLabel(y, m).toLowerCase()} – ${me}\n${lines.join("\n")}${lines.length ? "\n" : ""}${intro}\n\n${tot.join("\n")}`;
};

// avviso l'app: i giorni vecchi (anni passati) li rilegge dalla copia sul telefono
const changed = (p) => {
  try {
    window.dispatchEvent(new CustomEvent("mora-hours-changed"));
  } catch (e) {
    // niente
  }
  return p;
};
export const saveDay = (me, h) =>
  changed(
    setDoc(chatDoc(HOURS, docId(me, h.date)), {
      owner: key(me),
      date: h.date,
      kind: h.kind,
      minutes: Math.max(0, Math.round(Number(h.minutes) || 0)),
      note: String(h.note || "").trim().slice(0, 120),
      updatedAt: Date.now(),
    })
  );
export const removeDay = (me, date) => changed(deleteDoc(chatDoc(HOURS, docId(me, date))));

// orario normale del tecnico (vale per questo telefono)
const STD_KEY = "mora_hours_std";
export const getStd = () => {
  try {
    const n = Number(localStorage.getItem(STD_KEY));
    return n >= 60 && n <= 720 ? n : STD_DEFAULT;
  } catch (e) {
    return STD_DEFAULT;
  }
};
// da quando conta i giorni automatici (il giorno in cui si accende «Le mie ore»)
const SINCE_KEY = "mora_hours_since";
export const getSince = () => {
  try {
    return localStorage.getItem(SINCE_KEY) || "";
  } catch (e) {
    return "";
  }
};
export const markSince = () => {
  try {
    if (!localStorage.getItem(SINCE_KEY)) syncExtra("hoursSince", isoOf(new Date()));
  } catch (e) {
    // niente
  }
};

// PROMEMORIA DELLE ORE: notifica dal lunedì al venerdì all'ora scelta (la manda /api/reminders)
//  .../public/data/hours_reminders/<tecnico> { owner, enabled, time "17:30", lastSent }
export const HOURS_REMINDERS = "hours_reminders";
export const saveHoursReminder = (me, r) =>
  setDoc(chatDoc(HOURS_REMINDERS, key(me).replace(/[^a-z0-9_-]/gi, "_")), {
    owner: key(me),
    enabled: !!r.enabled,
    time: /^\d{2}:\d{2}$/.test(r.time || "") ? r.time : "17:30",
    updatedAt: Date.now(),
  }, { merge: true });

export const setStd = (n) => {
  try {
    syncExtra("hoursStd", n);
  } catch (e) {
    // niente
  }
};

// ---- PERIODO A SCELTA (Manda: PDF o testo) ----
// tutti i giorni tra "from" e "to" (aaaa-mm-gg), con i giorni normali automatici
export const periodDays = (list, from, to, std = STD_DEFAULT, since = "", today = isoOf(new Date())) => {
  const out = [];
  if (!from || !to || from > to) return out;
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7)) - 1;
  const ey = Number(to.slice(0, 4));
  const em = Number(to.slice(5, 7)) - 1;
  while (y < ey || (y === ey && m <= em)) {
    const k = ymOf(y, m);
    withDefaults(list, y, m, std, since, today).forEach((h) => {
      if (String(h.date).slice(0, 7) === k && h.date >= from && h.date <= to) out.push(h);
    });
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
};
export const rangeSummary = (days, std = STD_DEFAULT) => {
  const s = { worked: 0, extra: 0, less: 0, workDays: 0, ferie: 0, malattia: 0, festa: 0, permesso: 0 };
  (days || []).forEach((h) => {
    if (h.kind === "lavoro") {
      s.worked += Number(h.minutes) || 0;
      s.workDays += 1;
      const d = deltaOf(h, std);
      if (d > 0) s.extra += d;
      if (d < 0) s.less += -d;
    } else if (h.kind === "permesso") s.permesso += Number(h.minutes) || 0;
    else if (s[h.kind] !== undefined) s[h.kind] += 1;
  });
  return s;
};
const pad2 = (n) => String(n).padStart(2, "0");
const iso3 = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
// periodi pronti
export const presetPeriods = (now = new Date()) => {
  const y = now.getFullYear();
  const m = now.getMonth();
  const dow = (now.getDay() + 6) % 7; // lunedì = 0
  const mon = new Date(y, m, now.getDate() - dow);
  const lastMon = new Date(y, m, now.getDate() - dow - 7);
  return [
    { id: "mese", label: "Questo mese", from: iso3(new Date(y, m, 1)), to: iso3(new Date(y, m + 1, 0)) },
    { id: "scorso", label: "Mese scorso", from: iso3(new Date(y, m - 1, 1)), to: iso3(new Date(y, m, 0)) },
    { id: "settimana", label: "Questa settimana", from: iso3(mon), to: iso3(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6)) },
    { id: "settscorsa", label: "Settimana scorsa", from: iso3(lastMon), to: iso3(new Date(lastMon.getFullYear(), lastMon.getMonth(), lastMon.getDate() + 6)) },
    { id: "anno", label: "Quest'anno", from: `${y}-01-01`, to: `${y}-12-31` },
  ];
};
export const fmtIso = (iso) => (iso ? `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}/${iso.slice(0, 4)}` : "");
export const periodLabel = (from, to) => `dal ${fmtIso(from)} al ${fmtIso(to)}`;
// testo del periodo (WhatsApp, mail)
export const periodText = (me, days, from, to, std = STD_DEFAULT) => {
  const s = rangeSummary(days, std);
  const lines = days.filter((h) => !h.auto || h.kind !== "lavoro").map((h) => `${shortDay(h.date)}: ${dayText(h, std)}${h.note ? " – " + h.note : ""}`);
  const tot = [
    `Ore lavorate: ${fmtMin(s.worked)} in ${s.workDays} giorni`,
    s.extra ? `Straordinari: ${fmtMin(s.extra)}` : "",
    s.less ? `Ore in meno: ${fmtMin(s.less)}` : "",
    s.ferie ? `Ferie: ${s.ferie} ${s.ferie === 1 ? "giorno" : "giorni"}` : "",
    s.permesso ? `Permessi: ${fmtMin(s.permesso)}` : "",
    s.malattia ? `Malattia: ${s.malattia} ${s.malattia === 1 ? "giorno" : "giorni"}` : "",
  ].filter(Boolean);
  return `Ore ${periodLabel(from, to)} – ${me}\n${lines.join("\n")}${lines.length ? "\n" : ""}(gli altri giorni da lunedì a venerdì: ${fmtMin(std)}; sabato, domenica e feste tutto straordinario)\n\n${tot.join("\n")}`;
};
