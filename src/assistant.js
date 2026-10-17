// ASSISTENTE DEL TECNICO: legge i rapporti già scritti e aiuta.
//  - "L'ultima volta…": cose lasciate in sospeso (spariscono da sole quando un
//    rapporto successivo dice che quel pezzo è stato sostituito/riparato/sistemato)
//  - guasto che si ripete: stesso componente in 2+ interventi negli ultimi 60 giorni
//  - riassunto della gru in una riga
//  - matricole scritte in modo diverso (stesso cliente)
import { getSafeMatricola } from "./utils";

export const COMPONENTS = [
  { id: "fune", label: "fune", re: /\bfun[ei]\b/i },
  { id: "catena", label: "catena", re: /\bcaten[ae]\b/i },
  { id: "freno", label: "freno", re: /\bfren[oi]\b|\bferod\w*/i },
  { id: "finecorsa", label: "finecorsa", re: /\bfine\s?-?\s?cors[ae]\b/i },
  { id: "pulsantiera", label: "pulsantiera", re: /\bpulsantier[ae]\b/i },
  { id: "radiocomando", label: "radiocomando", re: /\bradiocomand[oi]\b|\btelecomand[oi]\b/i },
  { id: "motore", label: "motore", re: /\bmotor[ei]\b|\bmotoridutt\w*/i },
  { id: "riduttore", label: "riduttore", re: /\bridutt\w*/i },
  { id: "gancio", label: "gancio", re: /\bganc(io|i)\b/i },
  { id: "inverter", label: "inverter", re: /\binverter\b/i },
  { id: "contattore", label: "contattori", re: /\bcontattor[ei]\b/i },
  { id: "carrello", label: "carrello", re: /\bcarrell[oi]\b/i },
  { id: "ruote", label: "ruote", re: /\bruot[ae]\b/i },
  { id: "quadro", label: "quadro elettrico", re: /\bquadr[oi]\s+elettric[oi]\b|\bquadr[oi]\b/i },
  { id: "festone", label: "cavi / festone", re: /\bfestone\b|\bcav[oi]\b/i },
];
export const componentLabel = (id) => (COMPONENTS.find((c) => c.id === id) || { label: id }).label;
const componentsIn = (text) => COMPONENTS.filter((c) => c.re.test(text)).map((c) => c.id);

// frasi che lasciano qualcosa in sospeso
const PENDING =
  /\b(da\s+(sostituire|cambiare|ricontrollare|verificare|controllare|riparare|revisionare|ordinare|sistemare|monitorare)|da\s+tenere\s+d['’]?\s*occhio|consigliat[aoie]\s+(la\s+|il\s+)?(sostituzione|revisione|verifica)|si\s+consiglia|consigli[oa]\s+di|revisione\s+a\s+terra|in\s+attesa\s+(di\s+|del\s+|della\s+|dello\s+|dei\s+|delle\s+)?(ricamb\w*|pezz\w*|material\w*|\w+)|in\s+attesa)\b/i;
// frasi che dicono che il lavoro è stato fatto
const DONE =
  /\b(sostituit[aoie]|sostituzione\s+(della|del|dello|dei|delle)?\s*\w+\s+(eseguita|effettuata)|cambiat[aoie]|montat[aoie]|installat[aoie]|riparat[aoie]|sistemat[aoie]|revisionat[aoie]|ripristinat[aoie]|rimess[aoie]|risolt[aoie]|regolat[aoie]|tarat[aoie])\b/i;
// frasi che parlano di un guasto o di una riparazione (i controlli "ok" non contano)
const FAULT =
  /\b(guast\w*|rott[aoie]|non\s+funzion\w*|difettos\w*|bloccat\w*|usurat\w*|consumat\w*|rumoros\w*|perdit\w*|bruciat\w*|danneggiat\w*|allentat\w*|anomal\w*|scattat\w*|interviene|intervenut\w*|si\s+ferma|ferm[ao]|sostituit[aoie]|cambiat[aoie]|riparat[aoie]|sistemat[aoie]|ripristinat[aoie])\b/i;
const OIL = /\b(cambio|cambiat[aoie]|sostituit[aoie]|sostituzione)\s+(dell'|del\s+|dello\s+|di\s+)?(olio|grasso|lubrificante)\b/gi;

const ABBREVIATIONS = ["matr", "mat", "n", "nr", "num", "diam", "rif", "art", "cert", "es", "ecc", "sig"];
// frasi (senza "lookbehind": non funziona su iPhone con iOS < 16.4)
export const sentencesOf = (text) =>
  String(text || "")
    .replace(/([.;!?])\s+/g, (match, punct, offset, whole) => {
      const before = whole.slice(0, offset).match(/(\S+)$/);
      const word = before ? before[1].toLowerCase() : "";
      return punct === "." && ABBREVIATIONS.includes(word) ? match : punct + "\n";
    })
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

const dayKey = (ds) => {
  const p = String(ds || "").split("/").map(Number);
  return p.length === 3 && p.every((n) => !isNaN(n)) ? p[2] * 10000 + p[1] * 100 + p[0] : 0;
};
const toDate = (ds) => {
  const p = String(ds || "").split("/").map(Number);
  return p.length === 3 && p.every((n) => !isNaN(n)) ? new Date(p[2], p[1] - 1, p[0]) : null;
};
// ordine cronologico (a parità di giorno conta l'ora di creazione)
const orderKey = (l) => dayKey(l.dateString) * 1e10 + ((l.createdAt && l.createdAt.seconds) || 0);

// interventi di una gru (stessa matricola e stesso cliente, maiuscole indifferenti)
export const logsOfMachine = (allLogs, matricola, customer) => {
  const mat = String(matricola || "").trim().toLowerCase();
  const cust = String(customer || "").trim().toUpperCase();
  if (!mat) return [];
  return (allLogs || []).filter(
    (l) =>
      String(l.machineId || "").trim().toLowerCase() === mat &&
      String(l.customer || "").trim().toUpperCase() === cust
  );
};

// --- 1. "L'ultima volta…": cose lasciate in sospeso e non ancora risolte ---
export const pendingItems = (machineLogs, { now = new Date(), maxAgeDays = 365 } = {}) => {
  const logs = [...(machineLogs || [])].sort((a, b) => orderKey(a) - orderKey(b));
  const items = [];
  logs.forEach((log, idx) => {
    for (const sentence of sentencesOf(log.description)) {
      const s = sentence.replace(OIL, " ");
      if (!PENDING.test(s)) continue;
      items.push({ log, idx, sentence, components: componentsIn(s) });
    }
  });
  const limit = new Date(now.getTime() - maxAgeDays * 86400000);
  return items.filter(({ log, idx, components }) => {
    const d = toDate(log.dateString);
    if (d && d < limit) return false;
    const later = logs.slice(idx + 1);
    if (!components.length) return later.length === 0; // senza pezzo: vale fino al rapporto successivo
    // risolto se un rapporto successivo dice che quel pezzo è stato fatto
    return !later.some((l) =>
      sentencesOf(l.description).some((sent) => {
        const s = sent.replace(OIL, " ");
        if (!DONE.test(s) || PENDING.test(s)) return false;
        return components.some((c) => COMPONENTS.find((x) => x.id === c).re.test(s));
      }) || components.some((c) => l[c]) // fune/catena con dati inseriti
    );
  }).reverse(); // dal più recente
};

// --- 6. guasto che si ripete: stesso componente in 2+ interventi negli ultimi 60 giorni ---
export const repeatedFaults = (machineLogs, { now = new Date(), days = 60, min = 2 } = {}) => {
  const from = new Date(now.getTime() - days * 86400000);
  const counts = {};
  for (const l of machineLogs || []) {
    const d = toDate(l.dateString);
    if (!d || d < from || d > now) continue;
    const ids = new Set();
    for (const sent of sentencesOf(l.description)) {
      const s = sent.replace(OIL, " ");
      if (FAULT.test(s) || PENDING.test(s)) componentsIn(s).forEach((c) => ids.add(c));
    }
    for (const c of ids) (counts[c] = counts[c] || []).push(l.dateString);
  }
  return Object.entries(counts)
    .filter(([, dates]) => dates.length >= min)
    .map(([id, dates]) => ({ id, label: componentLabel(id), count: dates.length, dates: dates.sort((a, b) => dayKey(a) - dayKey(b)) }))
    .sort((a, b) => b.count - a.count);
};

// --- 8. riassunto della gru ---
export const machineSummary = (machineLogs) => {
  const logs = [...(machineLogs || [])].sort((a, b) => orderKey(b) - orderKey(a));
  if (!logs.length) return null;
  const firstYear = Math.min(...logs.map((l) => (toDate(l.dateString) || new Date()).getFullYear()));
  const freq = {};
  for (const l of logs) {
    const ids = new Set();
    for (const sent of sentencesOf(l.description)) {
      const s = sent.replace(OIL, " ");
      if (FAULT.test(s) || PENDING.test(s)) componentsIn(s).forEach((c) => ids.add(c));
    }
    for (const c of ids) freq[c] = (freq[c] || 0) + 1;
  }
  const top = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, n]) => ({ id, label: componentLabel(id), count: n }));
  return { count: logs.length, firstYear, last: logs[0], top };
};

// --- 9. matricole scritte in modo diverso (solo stesso cliente) ---
export const normalizeMatricola = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
export const findSameMatricola = (machines, matricola, customer) => {
  const n = normalizeMatricola(matricola);
  const cust = String(customer || "").trim().toUpperCase();
  if (!n || !cust) return null;
  return (
    (machines || []).find(
      (m) =>
        String(m.customerName || "").trim().toUpperCase() === cust &&
        normalizeMatricola(getSafeMatricola(m)) === n &&
        getSafeMatricola(m) !== String(matricola || "").trim().toUpperCase()
    ) || null
  );
};
