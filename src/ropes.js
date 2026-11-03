// FUNE e CATENA sostituite: dati obbligatori (certificato, diametro, lunghezza; per la fune anche il tipo).
import { fasFamily, fasItem, fasCode } from "./fasRopes";
// Salvati nel rapporto come  fune: {...}  e  catena: {...}  (solo se sostituite).
// Dal certificato (facoltativi): costruzione (es. "6x36", vedi wearRules.ROPES), marca (FAS, Teci…), rottura
// (carico di rottura minimo, kN); per la catena grado e passo (mm). Servono al controllo «Fune e catena».

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
  fas: "", // famiglia del catalogo FAS (es. "FZ636AC")
  codice: "", // codice articolo dal certificato (es. "FZ636A12")
  costruzione: "",
  marca: "",
  rottura: "",
  grado: "",
  passo: "",
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
    if (id === "fune" && !r.fas && !String(r.costruzione || "").trim()) missing.push("tipo di fune (codice FAS del certificato o costruzione)");
    if (!String(r.certificato || "").trim()) missing.push("numero certificato");
    if (!parseNum(r.diametro)) missing.push("diametro");
    if (!parseNum(r.lunghezza)) missing.push("lunghezza");
    if (missing.length)
      return `Hai sostituito la ${label}: inserisci ${missing.join(", ")}. Se non li hai ora, spunta "Non disponibile ora" e scrivi il motivo.`;
  }
  return "";
};

// dati del certificato in più (solo quelli scritti)
const extras = (r) => {
  const o = {};
  const fam = r.fas ? fasFamily(r.fas) : null;
  if (fam) {
    o.fas = fam.id;
    o.marca = "FAS";
    const it = fasItem(fam, parseNum(r.diametro));
    if (String(r.codice || "").trim()) o.codice = String(r.codice).trim().toUpperCase();
    else if (it) o.codice = fasCode(fam, it);
    if (!parseNum(r.rottura) && it) o.rottura = it.kN;
  }
  if (String(r.costruzione || "").trim()) o.costruzione = String(r.costruzione).trim();
  if (!fam && String(r.marca || "").trim()) o.marca = String(r.marca).trim();
  if (parseNum(r.rottura)) o.rottura = parseNum(r.rottura);
  if (String(r.grado || "").trim()) o.grado = String(r.grado).trim();
  if (parseNum(r.passo)) o.passo = parseNum(r.passo);
  return o;
};
// da modulo a dati salvati (null = non sostituita)
export const toSavedRope = (r) => {
  if (!r || !r.on) return null;
  if (r.nonDisponibile)
    return { nonDisponibile: true, motivo: String(r.motivo || "").trim(), certificato: String(r.certificato || "").trim(), diametro: parseNum(r.diametro), lunghezza: parseNum(r.lunghezza), ...extras(r) };
  return { nonDisponibile: false, motivo: "", certificato: String(r.certificato || "").trim(), diametro: parseNum(r.diametro), lunghezza: parseNum(r.lunghezza), ...extras(r) };
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
        fas: saved.fas || "",
        codice: saved.codice || "",
        costruzione: saved.costruzione || "",
        marca: saved.marca || "",
        rottura: saved.rottura ? String(saved.rottura).replace(".", ",") : "",
        grado: saved.grado || "",
        passo: saved.passo ? String(saved.passo).replace(".", ",") : "",
      }
    : emptyRope();

const fmt = (n) => String(n).replace(".", ",");
// nome della costruzione (stesso elenco del controllo Fune e catena)
export const ROPE_TYPES = [
  ["6x7", "6×7"],
  ["6x19", "6×19 (Seale, Warrington, Filler)"],
  ["6x26", "6×26 WS"],
  ["6x31", "6×31 WS"],
  ["6x36", "6×36 WS"],
  ["6x41", "6×41 WS"],
  ["8x19", "8×19 (Seale, Warrington, Filler)"],
  ["8x26", "8×26 WS"],
  ["8x31", "8×31 WS"],
  ["8x36", "8×36 WS"],
  ["18x7", "18×7 / 19×7 antigiro"],
  ["35x7", "35×7 / 35(W)×7 antigiro"],
];
export const ropeName = (id) => (ROPE_TYPES.find((r) => r[0] === id) || [id, id])[1];

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

// testo completo con le etichette (Storico): "Certificato X · Diametro 10,5 mm · Lunghezza 32 m"
export const formatRopeLong = (saved) => {
  if (!saved) return "";
  const parts = [];
  // quando i dati "non sono disponibili" mostro solo quelli inseriti + il motivo
  const all = !saved.nonDisponibile;
  if (all || saved.certificato) parts.push(`Certificato ${saved.certificato || "-"}`);
  if (all || saved.diametro) parts.push(`Diametro ${saved.diametro ? fmt(saved.diametro) + " mm" : "-"}`);
  if (all || saved.lunghezza) parts.push(`Lunghezza ${saved.lunghezza ? fmt(saved.lunghezza) + " m" : "-"}`);
  if (saved.fas) parts.push(`FAS ${saved.fas}${saved.codice ? " (" + saved.codice + ")" : ""}${fasFamily(saved.fas) ? " " + fasFamily(saved.fas).cons.join("/") : ""}`);
  if (saved.costruzione) parts.push(`Costruzione ${ropeName(saved.costruzione)}`);
  if (saved.grado) parts.push(`Grado ${saved.grado}`);
  if (saved.marca && !saved.fas) parts.push(saved.marca);
  if (saved.rottura) parts.push(`Carico di rottura ${fmt(saved.rottura)} kN`);
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
