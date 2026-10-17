// FUNE e CATENA sostituite: dati obbligatori (certificato, diametro, lunghezza).
// Salvati nel rapporto come  fune: {...}  e  catena: {...}  (solo se sostituite).

export const ROPE_ITEMS = [
  { id: "fune", label: "fune", title: "Fune", keyword: /\bfun[ei]\b/i },
  { id: "catena", label: "catena", title: "Catena", keyword: /\bcaten[ae]\b/i },
];

// stato vuoto nel modulo
export const emptyRope = () => ({
  on: false,
  auto: false, // spuntata in automatico dalla descrizione
  touched: false, // il tecnico l'ha spuntata/tolta a mano: niente più automatismi
  certificato: "",
  diametro: "",
  lunghezza: "",
  nonDisponibile: false,
  motivo: "",
});

// --- riconoscimento nella descrizione ("sostituita fune", non "fune da sostituire") ---
const REPLACED =
  /\b(sostituit[aoie]|sostituzione|sostituzioni|cambiat[aoie]|cambio|montat[aoie]|installat[aoie]|rimpiazzat[aoie]|messa nuova|nuova fune|nuova catena)\b/i;
const NOT_DONE =
  /\b(da\s+(sostituire|cambiare|montare|installare|ordinare|fare)|sostituire|cambiare|consiglia\w*|preventiv\w*|occorre|bisogna|ordinat[aoie]|in\s+attesa)\b/i;
const OIL =
  /\b(cambio|cambiat[aoie]|sostituit[aoie]|sostituzione)\s+(dell'|del\s+|dello\s+|di\s+)?(olio|grasso|lubrificante)\b/gi;
const ABBREVIATIONS = ["matr", "mat", "n", "nr", "num", "diam", "rif", "art", "cert", "es", "ecc"];
// frasi, senza "lookbehind" nelle regex (non funziona su iPhone con iOS < 16.4)
const sentencesOf = (text) =>
  String(text || "")
    .replace(/([.;!?])\s+/g, (match, punct, offset, whole) => {
      const before = whole.slice(0, offset).match(/(\S+)$/);
      const word = before ? before[1].toLowerCase() : "";
      return punct === "." && ABBREVIATIONS.includes(word) ? match : punct + "\n";
    })
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

export const detectReplacements = (description) => {
  const found = { fune: false, catena: false };
  for (const sentence of sentencesOf(description)) {
    const s = sentence.replace(OIL, " ");
    if (!REPLACED.test(s) || NOT_DONE.test(s)) continue;
    for (const item of ROPE_ITEMS) if (item.keyword.test(s)) found[item.id] = true;
  }
  return found;
};

// aggiorna le caselle in base alla descrizione (solo quelle non toccate a mano)
export const autoTick = (ropes, description) => {
  const found = detectReplacements(description);
  const next = { ...ropes };
  for (const { id } of ROPE_ITEMS) {
    const r = next[id] || emptyRope();
    if (r.touched) continue;
    if (found[id] && !r.on) next[id] = { ...r, on: true, auto: true };
    else if (!found[id] && r.on && r.auto) next[id] = { ...r, on: false, auto: false };
  }
  return next;
};

// numero positivo, accetta la virgola ("10,5")
const parseNum = (v) => {
  const n = parseFloat(String(v === undefined || v === null ? "" : v).replace(",", ".").trim());
  return isFinite(n) && n > 0 ? n : null;
};

// controllo prima del salvataggio: restituisce il messaggio d'errore oppure ""
export const validateRopes = (ropes) => {
  for (const { id, label } of ROPE_ITEMS) {
    const r = ropes && ropes[id];
    if (!r || !r.on) continue;
    if (r.nonDisponibile) {
      if (!String(r.motivo || "").trim())
        return `Hai indicato che i dati della ${label} non sono disponibili: scrivi il motivo.`;
      continue;
    }
    const missing = [];
    if (!String(r.certificato || "").trim()) missing.push("numero certificato");
    if (!parseNum(r.diametro)) missing.push("diametro");
    if (!parseNum(r.lunghezza)) missing.push("lunghezza");
    if (missing.length)
      return `Hai sostituito la ${label}: inserisci ${missing.join(", ")}. Se non li hai ora, spunta "Non disponibile ora" e scrivi il motivo.`;
  }
  return "";
};

// da modulo a dati salvati (null = non sostituita)
export const toSavedRope = (r) => {
  if (!r || !r.on) return null;
  if (r.nonDisponibile)
    return { nonDisponibile: true, motivo: String(r.motivo || "").trim(), certificato: String(r.certificato || "").trim(), diametro: parseNum(r.diametro), lunghezza: parseNum(r.lunghezza) };
  return { nonDisponibile: false, motivo: "", certificato: String(r.certificato || "").trim(), diametro: parseNum(r.diametro), lunghezza: parseNum(r.lunghezza) };
};

// da dati salvati a modulo (per Modifica intervento)
export const fromSavedRope = (saved) =>
  saved
    ? {
        ...emptyRope(),
        on: true,
        touched: true,
        certificato: saved.certificato || "",
        diametro: saved.diametro ? String(saved.diametro).replace(".", ",") : "",
        lunghezza: saved.lunghezza ? String(saved.lunghezza).replace(".", ",") : "",
        nonDisponibile: !!saved.nonDisponibile,
        motivo: saved.motivo || "",
      }
    : emptyRope();

const fmt = (n) => String(n).replace(".", ",");

// testo breve per schede, ricerca e stampa
export const formatRope = (saved) => {
  if (!saved) return "";
  const parts = [];
  if (saved.certificato) parts.push(`Cert. ${saved.certificato}`);
  if (saved.diametro) parts.push(`Ø ${fmt(saved.diametro)} mm`);
  if (saved.lunghezza) parts.push(`${fmt(saved.lunghezza)} m`);
  if (saved.nonDisponibile)
    parts.push(`dati non disponibili${saved.motivo ? ": " + saved.motivo : ""}`);
  return parts.join(" · ");
};

// ultima fune / catena montata su una gru (dagli interventi della gru)
export const lastRopeOf = (logs, id) => {
  const key = (ds) => {
    const p = String(ds || "").split("/").map(Number);
    return p.length === 3 && p.every((n) => !isNaN(n)) ? p[2] * 10000 + p[1] * 100 + p[0] : 0;
  };
  return (
    [...(logs || [])]
      .filter((l) => l && l[id])
      .sort((a, b) => key(b.dateString) - key(a.dateString))[0] || null
  );
};
