// Periodo dell'anno per l'animazione di avvio e il cielo della Home (cambia da sola):
//  natale        1 dicembre – 6 gennaio (Buon Natale / Buon anno)
//  sanvalentino  13 – 14 febbraio (cuori)
//  carnevale     dal Giovedì grasso al Martedì grasso (coriandoli e stelle filanti)
//  pasqua        dalla Domenica delle Palme a Pasquetta
//  repubblica    1 – 2 giugno (Frecce Tricolori)
//  estate        21 giugno – 10 settembre (Ferragosto il 15 agosto)
//  autunno       22 settembre – 24 ottobre (foglie che cadono)
//  halloween     25 ottobre – 2 novembre
//  normale       il resto dell'anno
export const SEASONS = ["normale", "natale", "sanvalentino", "carnevale", "pasqua", "repubblica", "estate", "autunno", "halloween"];

// nome e date, per l'elenco in Admin → Design
export const SEASON_INFO = {
  normale: { label: "Classica", when: "Tutto il resto dell'anno" },
  natale: { label: "Natale", when: "1 dicembre – 6 gennaio" },
  sanvalentino: { label: "San Valentino", when: "13 – 14 febbraio" },
  carnevale: { label: "Carnevale", when: "Dal Giovedì al Martedì grasso" },
  pasqua: { label: "Pasqua", when: "Dalle Palme a Pasquetta" },
  repubblica: { label: "Festa della Repubblica", when: "1 – 2 giugno" },
  estate: { label: "Estate", when: "21 giugno – 10 settembre" },
  autunno: { label: "Autunno", when: "22 settembre – 24 ottobre" },
  halloween: { label: "Halloween", when: "25 ottobre – 2 novembre" },
};

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
  // Carnevale: Martedì grasso = 47 giorni prima di Pasqua, Giovedì grasso 5 giorni prima
  const fatTue = new Date(easter);
  fatTue.setDate(easter.getDate() - 47);
  const fatThu = new Date(fatTue);
  fatThu.setDate(fatTue.getDate() - 5);
  if (t >= fatThu.getTime() && t <= fatTue.getTime()) return "carnevale";
  if (x >= 213 && x <= 214) return "sanvalentino";
  const from = new Date(easter);
  from.setDate(easter.getDate() - 7);
  const to = new Date(easter);
  to.setDate(easter.getDate() + 1);
  if (t >= from.getTime() && t <= to.getTime()) return "pasqua";
  if (x >= 601 && x <= 602) return "repubblica";
  if (x >= 621 && x <= 910) return "estate";
  if (x >= 922 && x <= 1024) return "autunno";
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
  if (season === "sanvalentino") return "Buon San Valentino!";
  if (season === "carnevale") return "Buon Carnevale!";
  if (season === "repubblica") return "Buona Festa della Repubblica!";
  if (season === "autunno") return "Buon autunno!";
  return "Gru e carroponti";
};
