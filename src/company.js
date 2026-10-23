// DATI DELL'AZIENDA modificabili dall'admin (senza riprogrammare l'app).
// Stanno nel database in settings/azienda e una copia resta sul telefono (anche senza rete):
//  - company:  intestazione dei fogli stampati (nome, indirizzo, telefono, sito/mail)
//  - adminHash / staffHash: impronte delle password (se mancano valgono quelle di passwords.js)
//  - notices:  avvisi nella scritta della Home, ognuno dal giorno «from» al giorno «to»
//  - closures: chiusure aziendali (Le mie ore li segna da solo; niente promemoria delle ore)
//              «yearly» = si ripete ogni anno negli stessi giorni
import { setPasswordHashes } from "./passwords";

export const COMPANY_DEFAULT = {
  name: "ELETTROMECCANICA MORA s.r.l.",
  address: "Via Piola n. 16 - 28013 GATTICO-VERUNO (NO)",
  phone: "Tel. 0322 84.17.24 - Fax 0322 83.55.82",
  web: "www.emora.it  info@emora.it - contabile@emora.it",
};
export const COMPANY_FIELDS = [
  ["name", "Nome dell'azienda"],
  ["address", "Indirizzo"],
  ["phone", "Telefono / fax"],
  ["web", "Sito e mail"],
];

const KEY = "mora_company_v1";
const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch (e) {
    return {};
  }
};
let current = read();
setPasswordHashes(current);

const listeners = new Set();
export const onCompanyChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const companySettings = () => current;

// arriva dal database (App.js)
export const applyCompany = (data) => {
  current = data && typeof data === "object" ? data : {};
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch (e) {
    // spazio pieno: pazienza
  }
  setPasswordHashes(current);
  listeners.forEach((fn) => fn(current));
};

export const companyInfo = () => {
  const c = current.company || {};
  const out = { ...COMPANY_DEFAULT };
  Object.keys(COMPANY_DEFAULT).forEach((k) => {
    if (typeof c[k] === "string" && c[k].trim()) out[k] = c[k].trim();
  });
  return out;
};

// --- date (aaaa-mm-gg) ---
const md = (iso) => String(iso || "").slice(5, 10);
const inRange = (iso, from, to, yearly) => {
  if (!from) return false;
  const t = to || from;
  if (!yearly) return iso >= from && iso <= t;
  const x = md(iso);
  const a = md(from);
  const b = md(t);
  return a <= b ? x >= a && x <= b : x >= a || x <= b; // es. 24/12 – 6/1
};
const isoToday = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

// avvisi da mostrare oggi
export const activeNotices = (now = new Date(), list = current.notices) => {
  const iso = isoToday(now);
  return (Array.isArray(list) ? list : [])
    .filter((n) => n && String(n.text || "").trim() && inRange(iso, n.from, n.to, false))
    .map((n) => String(n.text).trim());
};

// chiusura aziendale di quel giorno (o null)
export const closureOf = (iso, list = current.closures) =>
  (Array.isArray(list) ? list : []).find((c) => c && inRange(iso, c.from, c.to, !!c.yearly)) || null;

export const _test = { inRange, isoToday };
