// Periodo dell'anno per l'animazione di avvio (cambia da sola):
//  natale     1 dicembre – 6 gennaio (Buon Natale / Buon anno)
//  pasqua     dalla Domenica delle Palme a Pasquetta
//  estate     21 giugno – 10 settembre (Ferragosto il 15 agosto)
//  halloween  25 ottobre – 2 novembre
//  normale    il resto dell'anno
export const SEASONS = ["normale", "natale", "pasqua", "estate", "halloween"];

// Pasqua (calendario gregoriano, algoritmo di Meeus/Jones/Butcher)
export const easterOf = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
};

const md = (d) => (d.getMonth() + 1) * 100 + d.getDate();
const dayOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const seasonOf = (now = new Date()) => {
  const x = md(now);
  if (x >= 1201 || x <= 106) return "natale";
  const easter = easterOf(now.getFullYear());
  const t = dayOnly(now).getTime();
  const from = new Date(easter);
  from.setDate(easter.getDate() - 7);
  const to = new Date(easter);
  to.setDate(easter.getDate() + 1);
  if (t >= from.getTime() && t <= to.getTime()) return "pasqua";
  if (x >= 621 && x <= 910) return "estate";
  if (x >= 1025 && x <= 1102) return "halloween";
  return "normale";
};

// scritta sotto il titolo
export const greetingOf = (season, now = new Date()) => {
  const x = md(now);
  if (season === "natale") return x >= 1226 || x <= 106 ? (x >= 1231 || x <= 106 ? "Buon anno!" : "Buone feste!") : "Buon Natale!";
  if (season === "pasqua") return "Buona Pasqua!";
  if (season === "estate") return x === 815 ? "Buon Ferragosto!" : "Buona estate!";
  if (season === "halloween") return "Buon Halloween!";
  return "Gru e carroponti";
};
