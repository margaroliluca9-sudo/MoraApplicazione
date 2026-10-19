// STRAORDINARI (La mia area, si accende da ⚙ Impostazioni): le ore in più di ogni giorno.
//  .../public/data/personal_overtime { owner, date "aaaa-mm-gg", minutes, note, updatedAt }
// Le vede solo il tecnico (come le note). Più righe nello stesso giorno si sommano.
import { addDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { chatRef, chatDoc, key } from "./chat";
import { MONTHS, parseIso } from "./personal";

export const OVERTIME = "personal_overtime";
export const QUICK = [30, 60, 90, 120];

// 90 -> "1 h 30", 30 -> "30 min", 120 -> "2 h"
export const fmtMin = (m) => {
  const n = Math.round(Number(m) || 0);
  const h = Math.floor(Math.abs(n) / 60);
  const r = Math.abs(n) % 60;
  const s = h ? (r ? `${h} h ${String(r).padStart(2, "0")}` : `${h} h`) : `${r} min`;
  return n < 0 ? "-" + s : s;
};
export const ym = (iso) => String(iso || "").slice(0, 7); // "2026-10"
export const ymOf = (y, m) => `${y}-${String(m + 1).padStart(2, "0")}`;
export const monthLabel = (y, m) => `${MONTHS[m]} ${y}`;

// righe del mese raggruppate per giorno (dal più recente)
export const daysOf = (list, y, m) => {
  const key0 = ymOf(y, m);
  const by = {};
  (list || []).forEach((o) => {
    if (ym(o.date) !== key0) return;
    (by[o.date] = by[o.date] || []).push(o);
  });
  return Object.keys(by)
    .sort((a, b) => b.localeCompare(a))
    .map((date) => ({ date, items: by[date], minutes: by[date].reduce((t, o) => t + (Number(o.minutes) || 0), 0) }));
};
export const monthTotal = (list, y, m) => daysOf(list, y, m).reduce((t, d) => t + d.minutes, 0);

const DOW = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
export const shortDay = (iso) => {
  const d = parseIso(iso);
  return d ? `${DOW[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}` : iso;
};

// testo da mandare (WhatsApp, mail) o incollare
export const summaryText = (me, list, y, m) => {
  const days = daysOf(list, y, m).slice().reverse();
  const lines = days.map((d) => {
    const notes = d.items.map((o) => o.note).filter(Boolean).join(", ");
    return `${shortDay(d.date)}: ${fmtMin(d.minutes)}${notes ? " (" + notes + ")" : ""}`;
  });
  return `Straordinari ${monthLabel(y, m).toLowerCase()} – ${me}\n${lines.join("\n")}\nTotale: ${fmtMin(monthTotal(list, y, m))}`;
};

export const saveOvertime = async (me, o) => {
  const data = {
    owner: key(me),
    date: o.date,
    minutes: Math.max(1, Math.round(Number(o.minutes) || 0)),
    note: String(o.note || "").trim().slice(0, 120),
    updatedAt: Date.now(),
  };
  if (o.id) {
    await setDoc(chatDoc(OVERTIME, o.id), data);
    return o.id;
  }
  const r = await addDoc(chatRef(OVERTIME), { ...data, createdAt: serverTimestamp() });
  return r.id;
};
export const removeOvertime = (id) => deleteDoc(chatDoc(OVERTIME, id));
