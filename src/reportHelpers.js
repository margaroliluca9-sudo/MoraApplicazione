// AIUTI PER SCRIVERE IL RAPPORTO
//  - bozza salvata da sola sul telefono (se l'app si chiude il rapporto non si perde)
//  - frasi rapide: le frasi più scritte negli interventi, da aggiungere con un tocco
import { sentencesOf } from "./assistant";

const DRAFT_KEY = "mora_report_draft";

export const loadDraft = () => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    return d && d.data && (d.data.customer || d.data.description) ? d : null;
  } catch (e) {
    return null;
  }
};
export const saveDraft = (data) => {
  const draft = { data, savedAt: Date.now() };
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (e) {
    // telefono pieno: salvo senza foto
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, data: { ...data, photos: [] }, noPhotos: true }));
    } catch (err) {
      // niente
    }
  }
};
export const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (e) {
    // niente
  }
};
// "oggi 14:20" / "ieri 9:05" / "16/10 18:30"
export const draftWhen = (ms) => {
  const d = new Date(ms || 0);
  const t = new Date();
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (d.toDateString() === t.toDateString()) return "oggi " + hm;
  const y = new Date(t);
  y.setDate(t.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "ieri " + hm;
  return `${d.getDate()}/${d.getMonth() + 1} ${hm}`;
};

const DEFAULT_PHRASES = [
  "Prove funzionali ok",
  "Regolato freno sollevamento",
  "Verifica trimestrale",
  "Controllato finecorsa",
  "Pulizia generale",
  "Ricerca guasto",
];
const clean = (s) =>
  String(s || "")
    .replace(/[.;:,!\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
// le frasi brevi più scritte (prima quelle del tecnico, poi di tutti)
export const quickPhrases = (logs = [], me = "", max = 8) => {
  const count = {};
  const shown = {};
  const meKey = String(me || "").trim().toLowerCase();
  logs.slice(0, 600).forEach((l) => {
    const mine = String(l.technician || "").trim().toLowerCase() === meKey;
    sentencesOf(l.description).forEach((raw) => {
      const s = clean(raw);
      if (s.length < 6 || s.length > 42 || /\d{3,}/.test(s)) return;
      const k = s.toLowerCase();
      count[k] = (count[k] || 0) + (mine ? 2 : 1);
      if (!shown[k]) shown[k] = s.charAt(0).toUpperCase() + s.slice(1);
    });
  });
  const top = Object.keys(count)
    .filter((k) => count[k] >= 3)
    .sort((a, b) => count[b] - count[a])
    .slice(0, max)
    .map((k) => shown[k]);
  DEFAULT_PHRASES.forEach((p) => {
    if (top.length < max && !top.some((t) => t.toLowerCase() === p.toLowerCase())) top.push(p);
  });
  return top;
};
// aggiunge una frase alla descrizione (con il punto)
export const addPhrase = (text, phrase) => {
  const t = String(text || "").replace(/\s+$/, "");
  if (!t) return phrase + ".";
  return t + (/[.!?]$/.test(t) ? " " : ". ") + phrase + ".";
};
