// FUNE e CATENA sostituite: dati obbligatori (certificato, diametro, lunghezza; per la fune anche il tipo).
import { fasFamily, fasItem, fasCode, FAS_ROPES } from "./fasRopes";
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
  declined: false, // «Non ho sostituito la fune» (la descrizione ne parlava ma non l'ha cambiata)
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
      return `Hai sostituito la ${label}: inserisci ${missing.join(", ")}. Se l'hai sostituita ma non hai i dati adesso, spunta «L'ho sostituita ma non ho i dati adesso» e scrivi il motivo; se non l'hai sostituita, spunta «Non ho sostituito la ${label}».`;
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

// CHE FUNE C'È MONTATA (per il controllo «Fune e catena»): dall'ultimo rapporto con la fune sostituita.
// Rapporti nuovi: tipo scritto (fas o costruzione). Rapporti di prima: lo cerco nel certificato e nella
// descrizione (codice FAS come «FZ636A12» / «FZ636AC», oppure la costruzione come «6x36», «8x19», «35x7»).
const CONS_IDS = ROPE_TYPES.map((r) => r[0]);
const fasInText = (text) => {
  const toks = String(text || "").toUpperCase().match(/\bF[LZX][A-Z0-9]{2,}(?:[.,]\d)?\b/g) || [];
  for (const t of toks) {
    for (const f of FAS_ROPES) {
      if (f.id === t) return { fas: f.id, d: null };
      const it = f.it.find((x) => x[0].split("/").includes(t));
      if (it) return { fas: f.id, d: it[1] };
    }
  }
  return null;
};
const consInText = (text) => {
  const m = String(text || "").toLowerCase().match(/\b(\d{1,2})\s*[x×]\s*k?(\d{1,2})/);
  if (!m) return null;
  let id = `${m[1]}x${m[2]}`;
  if (id === "19x7") id = "18x7";
  if (id === "6x25") id = "6x19"; // filler: 19 fili portanti
  if (id === "8x25") id = "8x19";
  return CONS_IDS.includes(id) ? { costruzione: id } : null;
};
// rapporti di prima (senza i campi della fune): «sostituita fune 6x36 Ø12», «montata fune nuova FZ636A12»…
const ROPE_DONE = /(sostitu\w*|cambi\w*|montat\w*|messa|mess[oa] su|rifatt\w*)\s+(?:anche\s+)?(?:la\s+|della\s+|di\s+|una\s+)?(?:nuova\s+)?fun[ei]\b|\bfun[ei]\s+(?:nuova|sostituita|cambiata|montata)/i;
export const ropeReplacedInText = (text) => ROPE_DONE.test(String(text || ""));
const diamInText = (text) => {
  const t = String(text || "");
  const m = t.match(/(?:ø|⌀|diam\.?|diametro|\bd\.?)\s*=?\s*(\d{1,2}(?:[.,]\d)?)/i) || t.match(/\b(\d{1,2}(?:[.,]\d)?)\s*mm\b/i);
  const d = m ? Number(m[1].replace(",", ".")) : 0;
  return d >= 3 && d <= 60 ? d : null;
};
export const ropeTypeOfLog = (log) => {
  const f = log && (log.fune || (ropeReplacedInText(log.description) ? {} : null));
  if (!f) return null;
  if (f.fas) return { fas: f.fas, diametro: f.diametro, from: "rapporto" };
  if (f.costruzione) return { costruzione: f.costruzione, diametro: f.diametro, from: "rapporto" };
  const text = `${f.certificato || ""} ${f.codice || ""} ${log.description || ""}`;
  const fx = fasInText(text);
  if (fx) return { fas: fx.fas, diametro: f.diametro || fx.d || diamInText(log.description), from: "testo" };
  const cx = consInText(text);
  if (cx) return { ...cx, diametro: f.diametro || diamInText(log.description), from: "testo" };
  return null;
};
// le gru di cui si sa la fune montata: { "CLIENTE|MATRICOLA": { log, type } } (l'ultima sostituzione per gru)
export const knownRopes = (logs) => {
  const key = (ds) => {
    const p = String(ds || "").split("/").map(Number);
    return p.length === 3 ? p[2] * 10000 + p[1] * 100 + p[0] : 0;
  };
  const last = {};
  (logs || []).forEach((l) => {
    // sostituita con i campi della fune, oppure (rapporti di prima) scritto nella descrizione
    if (!l || !(l.fune || ropeReplacedInText(l.description))) return;
    const k = `${String(l.customer || "").trim().toUpperCase()}|${String(l.machineId || "").trim().toUpperCase()}`;
    if (!last[k] || key(l.dateString) > key(last[k].dateString)) last[k] = l;
  });
  const out = {};
  Object.keys(last).forEach((k) => {
    const t = ropeTypeOfLog(last[k]);
    if (!t) return;
    const l = last[k];
    // rapporto senza i campi della fune: la fune la ricostruisco dalla descrizione (solo per mostrarla)
    out[k] = { log: l.fune ? l : { ...l, fune: { diametro: t.diametro || null, certificato: "", lunghezza: null } }, type: t };
  });
  return out;
};

