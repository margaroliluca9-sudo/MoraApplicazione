// MAGAZZINO DEL FURGONE
//  .../public/data/vans       furgoni { name, plate, users: ["luca", "marco"] }  (li crea e assegna l'admin)
//  .../public/data/van_items  articoli { vanId, name, code, cat, unit, qty, min, where, words }
//  .../public/data/van_moves  movimenti { vanId, itemId, itemName, delta, kind, author, logId, note, at }
// Un tecnico vede il magazzino SOLO se l'admin gli ha assegnato un furgone.
// Chi non ha furgone: nessuna domanda, nessuno scarico, tutto come prima.
// Scarico automatico: quando si salva un rapporto, la descrizione viene letta e i pezzi
// montati ("sostituito contattore", "cambiati 2 fusibili 10A") vengono tolti dal furgone.
import { addDoc, deleteDoc, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { chatRef, chatDoc, key } from "./chat";

export const VAN = { vans: "vans", items: "van_items", moves: "van_moves" };
export const CATEGORIES = ["Elettrico", "Pulsantiere", "Cavi", "Meccanica", "Consumo", "Altro"];
export const UNITS = ["pz", "m", "kit", "conf", "L"];

// --- chi usa quale furgone ---
export const vanOf = (vans, me) => (vans || []).find((v) => (v.users || []).includes(key(me))) || null;
export const itemsOf = (items, vanId) =>
  (items || []).filter((i) => i.vanId === vanId).sort((a, b) => String(a.name).localeCompare(String(b.name)));
export const num = (v) => {
  const n = parseFloat(String(v === undefined || v === null ? "" : v).replace(",", "."));
  return isFinite(n) ? n : 0;
};
export const fmtQty = (v) => String(Math.round(num(v) * 100) / 100).replace(".", ",");
export const isLow = (it) => num(it.min) > 0 && num(it.qty) < num(it.min);
export const lowItems = (items) => (items || []).filter(isLow);
// quanto manca per tornare alla scorta minima
export const toOrder = (it) => Math.max(0, num(it.min) - Math.max(0, num(it.qty)));

// --- riconoscimento dei pezzi nella descrizione ---
const STOP = new Set(["di", "da", "del", "della", "dello", "dei", "delle", "per", "e", "con", "il", "la", "lo", "le", "i", "gli", "un", "una", "uno", "pz", "n", "nr", "numero", "x"]);
const WORDNUM = { un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6 };
// testo -> parole semplici: minuscole, senza accenti, "10 A" -> "10a", "8G1,5" = "8x1.5"
export const tokensOf = (text) =>
  String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/×/g, "x")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\b(\d+)\s*[gx]\s*(\d+(?:\.\d+)?)\b/g, "$1x$2")
    .replace(/(\d)\s+(a|ah|v|vdc|vac|mm|kw|kg)\b/g, "$1$2")
    .match(/[a-z0-9]+(?:\.\d+)?/g) || [];
// radice della parola: "fusibili" e "fusibile" -> "fusibil"
export const stem = (t) => (/^\d/.test(t) || t.length <= 4 ? t : t.replace(/[aeiou]$/, ""));
const phraseStems = (phrase) => tokensOf(phrase).filter((t) => !STOP.has(t)).map(stem);
// frasi con cui riconoscere un articolo: il nome + le parole scritte dal tecnico ("teleruttore, contattore")
export const phrasesOf = (item) =>
  [item.name, ...String(item.words || "").split(/[;\n]|,\s+/)]
    .map(phraseStems)
    .filter((p) => p.length > 0);

// funi, catene e motori si prendono in ditta prima dell'intervento: mai scalati in automatico
const NEVER_AUTO = new Set(["fune", "funi", "funa", "caten", "motor", "motore", "motori", "motoridutt", "paranc"]);
export const autoAllowed = (item) => {
  const first = phraseStems(item.name)[0];
  return !!first && !NEVER_AUTO.has(first);
};

const DONE =
  /\b(sostitu(it|t)[aoie]|sostituzion[ei]|sostituendo|cambiat[aoie]|cambio|montat[aoie]|installat[aoie]|aggiunt[aoie]|mess[oaie]|inserit[aoie]|rimpiazzat[aoie]|nuov[aoie])\b/i;
const NOT_DONE =
  /\b(da\s+(sostituire|cambiare|montare|ordinare|fare)|sostituire|cambiare|consiglia\w*|occorre|bisogna|valutare|preventiv\w*|rilievo|in\s+attesa|ordinat[aoie]|fornit[aoie]\s+da(l|i)?\s+client\w*|di\s+loro\s+fornitura|da\s+loro|per\s+(la\s+)?sostituzion\w*)\b/i;
const OIL = /\b(cambio|cambiat[aoie]|sostitu\w+)\s+(dell'|del\s+|dello\s+|di\s+)?(olio|grasso|lubrificante)\b/gi;
const ABBR = ["matr", "mat", "n", "nr", "num", "diam", "d", "rif", "art", "cert", "es", "ecc", "sig", "mt"];
// frasi: a capo, "/", ";", e "." a fine frase (non "n." o "mt.")
export const partsSentences = (text) =>
  String(text || "")
    .replace(/([.;!?/])\s*/g, (match, punct, offset, whole) => {
      const before = whole.slice(0, offset).match(/(\S+)$/);
      const word = before ? before[1].toLowerCase() : "";
      // "n. 3", "mt. 6", "10.5": il punto non chiude la frase se dopo c'è un numero
      const next = whole.charAt(offset + match.length);
      if (punct === "." && /\d/.test(next) && (ABBR.includes(word) || /\d$/.test(word))) return match;
      return punct + "\n";
    })
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

const METERS = /(?:\bmt\.?\s*|\bm\.?\s*|\bmetri\s*|lunghezza\s*)(\d+(?:[,.]\d+)?)\b|\b(\d+(?:[,.]\d+)?)\s*(?:mt|m|metri)\b/i;
// quantità: numero subito prima del pezzo ("3 fusibili", "n.2 contatti", "due gommini"); per i metri "mt 6" / "6 m"
const qtyFor = (sentence, toks, firstIdx, unit) => {
  if (unit === "m") {
    // tolgo le sezioni dei cavi ("8x1,5", "16G1,5") che non sono metri
    const m = sentence.replace(/\d+\s*[gx×]\s*\d+(?:[.,]\d+)?/gi, " ").match(METERS);
    if (m) {
      const v = num(m[1] || m[2]);
      if (v > 0 && v <= 200) return v;
    }
    return null;
  }
  for (let k = firstIdx - 1; k >= Math.max(0, firstIdx - 3); k--) {
    const t = toks[k];
    if (/^\d{1,2}$/.test(t) && +t > 0 && +t <= 50) return +t;
    if (/^n\d{1,2}$/.test(t)) return +t.slice(1);
    if (WORDNUM[t]) return WORDNUM[t];
    if (!STOP.has(t)) break;
  }
  return 1;
};

// pezzi montati secondo la descrizione: [{ item, qty, unknown, text }]
const matchDone = (description, items, allow) => {
  const found = new Map();
  for (const raw of partsSentences(description)) {
    const sentence = raw.replace(OIL, " ");
    if (!DONE.test(sentence) || NOT_DONE.test(sentence)) continue;
    const toks = tokensOf(sentence);
    const stems = toks.map(stem);
    const hits = [];
    for (const item of items || []) {
      if (!allow(item)) continue;
      let best = null;
      for (const ph of phrasesOf(item)) {
        if (!ph.every((s) => stems.includes(s))) continue;
        const firstIdx = Math.min(...ph.map((s) => stems.indexOf(s)));
        if (!best || ph.length > best.ph.length) best = { ph, firstIdx };
      }
      if (best) hits.push({ item, ...best });
    }
    // se due articoli combaciano, vince il più preciso ("fusibili 10a" batte "fusibili")
    const kept = hits.filter(
      (h) => !hits.some((o) => o !== h && o.ph.length > h.ph.length && h.ph.every((s) => o.ph.includes(s)))
    );
    for (const h of kept) {
      if (found.has(h.item.id)) continue;
      const q = qtyFor(sentence, toks, h.firstIdx, h.item.unit);
      found.set(h.item.id, { item: h.item, qty: q || 0, unknown: q == null, text: raw });
    }
  }
  return [...found.values()];
};
export const findUsedParts = (description, items) => matchDone(description, items, autoAllowed);
// tutti i pezzi sostituiti (anche funi, catene, motori): per «Cosa ho cambiato» in La mia area
export const findDoneParts = (description, items) => matchDone(description, items, () => true);

// --- scritture ---
const now = () => Date.now();
export const recordMove = (move) =>
  addDoc(chatRef(VAN.moves), { ...move, at: now(), createdAt: serverTimestamp() });

// cambia la quantità di un articolo (+ = caricato, − = usato) e registra il movimento
export const moveItem = async (item, delta, { kind, author, logId = null, note = "" }) => {
  if (!delta) return;
  await updateDoc(chatDoc(VAN.items, item.id), { qty: increment(delta), updatedAt: now() });
  await recordMove({ vanId: item.vanId, itemId: item.id, itemName: item.name, unit: item.unit || "pz", delta, kind, author: author || "", logId, note });
};
// inventario: "ne ho contati N"
export const countItem = async (item, counted, author) => {
  const delta = num(counted) - num(item.qty);
  await updateDoc(chatDoc(VAN.items, item.id), { qty: num(counted), countedAt: now(), updatedAt: now() });
  await recordMove({ vanId: item.vanId, itemId: item.id, itemName: item.name, unit: item.unit || "pz", delta, kind: "inventario", counted: num(counted), author: author || "", logId: null, note: "" });
};

// scarico dal rapporto appena salvato: restituisce le righe scalate (anche quelle senza quantità)
export const applyReport = async ({ van, items, description, logId, author, note }) => {
  const used = findUsedParts(description, itemsOf(items, van.id));
  for (const u of used) {
    if (u.qty > 0) await moveItem(u.item, -u.qty, { kind: "rapporto", author, logId, note });
  }
  return used;
};
// correzione dopo lo scarico: righe { item, before, after }
export const applyCorrections = async (rows, { author, logId, note }) => {
  for (const r of rows) {
    const delta = num(r.before) - num(r.after);
    if (delta) await moveItem(r.item, delta, { kind: "correzione", author, logId, note });
  }
};

export const saveItem = async (vanId, it, author) => {
  const data = {
    vanId,
    name: String(it.name || "").trim(),
    code: String(it.code || "").trim(),
    cat: it.cat || "Altro",
    unit: it.unit || "pz",
    min: num(it.min),
    where: String(it.where || "").trim(),
    words: String(it.words || "").trim(),
    updatedAt: now(),
  };
  if (it.id) return updateDoc(chatDoc(VAN.items, it.id), data);
  const qty = num(it.qty);
  const ref = await addDoc(chatRef(VAN.items), { ...data, qty, createdAt: serverTimestamp() });
  if (qty) await recordMove({ vanId, itemId: ref.id, itemName: data.name, unit: data.unit, delta: qty, kind: "carico", author: author || "", logId: null, note: "Articolo nuovo" });
  return ref;
};
export const removeItem = (item) => deleteDoc(chatDoc(VAN.items, item.id));

// --- furgoni (solo admin) ---
export const saveVan = (v) => {
  const data = { name: String(v.name || "").trim(), plate: String(v.plate || "").trim().toUpperCase(), users: v.users || [], updatedAt: now() };
  if (v.id) return setDoc(chatDoc(VAN.vans, v.id), data);
  return addDoc(chatRef(VAN.vans), { ...data, createdAt: serverTimestamp() });
};
export const removeVan = async (van, items) => {
  for (const it of itemsOf(items, van.id)) await removeItem(it);
  await deleteDoc(chatDoc(VAN.vans, van.id));
};
// assegna un tecnico a un furgone (o a nessuno): un tecnico usa un solo furgone
export const assignTech = async (vans, techName, vanId) => {
  const k = key(techName);
  for (const v of vans || []) {
    const has = (v.users || []).includes(k);
    const want = v.id === vanId;
    if (has === want) continue;
    const users = want ? [...(v.users || []), k] : (v.users || []).filter((u) => u !== k);
    await updateDoc(chatDoc(VAN.vans, v.id), { users, updatedAt: now() });
  }
};

// testo dei movimenti: "Montato da Marco: MARIO ROSSI SRL · gru 6"
export const moveLabel = (m) => {
  const who = m.author ? ` (${m.author})` : "";
  if (m.kind === "rapporto") return `Montato${who}${m.note ? ": " + m.note : ""}`;
  if (m.kind === "correzione") return `Correzione rapporto${who}${m.note ? ": " + m.note : ""}`;
  if (m.kind === "inventario") return `Inventario: contati ${fmtQty(m.counted)}${who}`;
  if (m.kind === "carico") return `Caricato${who}${m.note ? " · " + m.note : ""}`;
  return `Usato a mano${who}${m.note ? " · " + m.note : ""}`;
};
