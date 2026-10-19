// COSA HO CAMBIATO (La mia area): quanti pezzi ha sostituito il tecnico, letti dai suoi rapporti.
// Conta le frasi con «sostituito / cambiato / montato / nuovo…» (non «da sostituire», «consigliato»…),
// con la quantità se scritta («cambiati 2 fusibili»). Funi e catene contano anche dai dati
// della fune/catena sostituita nel modulo.
import { findDoneParts, partsSentences, NOT_DONE, OIL } from "./van";
import { isMine, isoFromLogDate } from "./personal";

// pezzi da riconoscere: nome (singolare, plurale) + altri modi in cui si scrivono
export const PARTS = [
  { id: "fune", one: "fune", many: "funi", words: "funi; fune di sollevamento" },
  { id: "catena", one: "catena", many: "catene", words: "catene" },
  { id: "guidafune", one: "guidafune", many: "guidafuni", words: "guidafuni; guida fune; guida funi" },
  { id: "gancio", one: "gancio", many: "ganci", words: "ganci" },
  { id: "sicura", one: "sicura del gancio", many: "sicure del gancio", words: "sicura gancio; sicure; sicura; linguetta gancio" },
  { id: "contattore", one: "contattore", many: "contattori", words: "contattori; teleruttore; teleruttori" },
  { id: "finecorsa", one: "finecorsa", many: "finecorsa", words: "fine corsa; finecorse" },
  { id: "pulsantiera", one: "pulsantiera", many: "pulsantiere", words: "pulsantiere" },
  { id: "radiocomando", one: "radiocomando", many: "radiocomandi", words: "radiocomandi; radio comando" },
  { id: "freno", one: "freno", many: "freni", words: "freni; ferodo; ferodi; elettrofreno; disco freno" },
  { id: "motore", one: "motore", many: "motori", words: "motori; motoriduttore; motoriduttori" },
  { id: "riduttore", one: "riduttore", many: "riduttori", words: "riduttori" },
  { id: "ruota", one: "ruota", many: "ruote", words: "ruote" },
  { id: "cuscinetto", one: "cuscinetto", many: "cuscinetti", words: "cuscinetti" },
  { id: "puleggia", one: "puleggia", many: "pulegge", words: "pulegge" },
  { id: "tamburo", one: "tamburo", many: "tamburi", words: "tamburi" },
  { id: "fusibile", one: "fusibile", many: "fusibili", words: "fusibili" },
  { id: "rele", one: "relè", many: "relè", words: "rele" },
  { id: "inverter", one: "inverter", many: "inverter", words: "inverter" },
  { id: "trasformatore", one: "trasformatore", many: "trasformatori", words: "trasformatori" },
  { id: "cavo", one: "cavo", many: "cavi", words: "cavi; festone" },
  { id: "tampone", one: "tampone", many: "tamponi", words: "tamponi; respingente; respingenti; paracolpi" },
  { id: "spazzole", one: "spazzola", many: "spazzole", words: "spazzola; spazzole; collettore" },
].map((p) => ({ ...p, name: p.one, unit: "pz" }));

export const partLabel = (p, n) => `${n} ${n === 1 ? p.one : p.many}`;

// ---- DETTAGLI letti dalla frase: diametro, metri, ampere, kW, volt, modello, dove ----
const num = (v) => Number(String(v).replace(",", "."));
const fmtN = (v) => String(Math.round(num(v) * 100) / 100).replace(".", ",");
const ROLES = [
  ["sollevamento", /\bsollev\w*|\bsalita\b|\bdiscesa\b|\bgancio\b/i],
  ["traslazione ponte", /\btraslaz\w*\s+(del\s+)?ponte|\bponte\b/i],
  ["traslazione carrello", /\bcarrello\b/i],
  ["traslazione", /\btraslaz\w*/i],
  ["salita", /\bsalita\b/i],
  ["discesa", /\bdiscesa\b/i],
  ["generale", /\bgeneral\w*/i],
  ["emergenza", /\bemergenz\w*|\bfungo\b/i],
];
// quali dettagli contano per ogni pezzo
const WANT = {
  fune: ["diam", "len", "role"],
  catena: ["diam", "len"],
  guidafune: ["diam"],
  contattore: ["model", "volt", "roleDir"],
  finecorsa: ["roleFc"],
  pulsantiera: ["tasti"],
  radiocomando: ["model"],
  freno: ["role"],
  motore: ["kw", "role"],
  riduttore: ["role"],
  ruota: ["diam", "role"],
  cuscinetto: ["model"],
  fusibile: ["amp"],
  rele: ["amp", "volt", "model"],
  inverter: ["kw", "model"],
  trasformatore: ["volt"],
  cavo: ["len", "sez"],
};
export const detailsOf = (partId, sentence) => {
  const t = String(sentence || "");
  const want = WANT[partId] || [];
  const out = [];
  if (want.includes("diam")) {
    const m = t.match(/(?:Ø|ø|\bdiam\.?\s*|\bd\.\s*|\bdiametro\s*)(\d+(?:[.,]\d+)?)/i) || t.match(/\b(\d{1,2}(?:[.,]\d)?)\s*mm\b/i);
    if (m) out.push(`Ø${fmtN(m[1])} mm`);
  }
  if (want.includes("len")) {
    const m = t.replace(/\d+\s*[gx×]\s*\d+(?:[.,]\d+)?/gi, " ").match(/(?:\bmt\.?\s*|\bmetri\s*|\blungh\w*\.?\s*)(\d+(?:[.,]\d+)?)|\b(\d+(?:[.,]\d+)?)\s*(?:mt|m|metri)\b/i);
    if (m) out.push(`${fmtN(m[1] || m[2])} m`);
  }
  if (want.includes("sez")) {
    const m = t.match(/\b(\d+)\s*[gx×]\s*(\d+(?:[.,]\d+)?)\b/i);
    if (m) out.push(`${m[1]}x${fmtN(m[2])}`);
  }
  if (want.includes("amp")) {
    const m = t.match(/\b(\d+(?:[.,]\d+)?)\s*A\b/);
    if (m) out.push(`${fmtN(m[1])} A`);
  }
  if (want.includes("kw")) {
    const m = t.match(/\b(\d+(?:[.,]\d+)?)\s*kw\b/i);
    if (m) out.push(`${fmtN(m[1])} kW`);
  }
  if (want.includes("volt")) {
    const m = t.match(/\b(\d{2,3})\s*v(?:ac|dc|olt)?\b/i);
    if (m) out.push(`${m[1]} V`);
  }
  if (want.includes("tasti")) {
    const m = t.match(/\b(\d{1,2})\s*(?:tasti|pulsanti)\b/i);
    if (m) out.push(`${m[1]} tasti`);
  }
  if (want.includes("model")) {
    const m = t.match(/\b([A-Z]{1,5}[0-9][A-Z0-9-]{1,12})\b/);
    if (m && !/^\d/.test(m[1])) out.push(m[1]);
  }
  if (want.includes("roleFc")) {
    const r = ROLES.find(([name, re]) => ["salita", "discesa", "traslazione carrello", "traslazione ponte", "traslazione"].includes(name) && re.test(t));
    if (r) out.push(r[0]);
  }
  if (want.includes("roleDir")) {
    const r = ROLES.find(([name, re]) => ["salita", "discesa", "traslazione ponte", "traslazione carrello", "traslazione", "generale", "emergenza"].includes(name) && re.test(t));
    if (r) out.push(r[0]);
  }
  if (want.includes("role")) {
    const r = ROLES.find(([name, re]) => ["sollevamento", "traslazione ponte", "traslazione carrello", "traslazione", "generale", "emergenza"].includes(name) && re.test(t));
    if (r) out.push(r[0]);
  }
  return out;
};

// ---- ALTRI PEZZI: «sostituito X» con X che non è nella lista ----
const VERB = /\b(?:sostitu(?:it|t)[aoie]|cambiat[aoie]|montat[aoie]|installat[aoie]|rimpiazzat[aoie])\s+(?:(?:il|lo|la|i|gli|le|l'|un|uno|una|n\.?\s*\d+|\d+|due|tre|quattro|nuov[aoie]|anche)\s+)*([a-zàèéìòù][\w'àèéìòù-]*(?:\s+(?:di|del|della|dello|dei|delle|per|a)?\s*[a-zàèéìòù][\w'àèéìòù-]*){0,2})/gi;
const STOPW = /^(con|e|per|su|sul|sulla|in|il|lo|la|da|del|della|ok|tutto|tutti|tutte|completo|completa|olio|grasso|lubrificante)$/i;
const knownPart = (phrase) => findDoneParts("sostituito " + phrase, PARTS).length > 0;
export const otherParts = (text) => {
  const out = [];
  for (const raw of partsSentences(text)) {
    const sentence = raw.replace(OIL, " ");
    if (NOT_DONE.test(sentence)) continue;
    for (const m of sentence.matchAll(VERB)) {
      let ph = m[1].toLowerCase().replace(/\s+(e|con|ed|per|alla|al|sul|sulla|in)\s.*$/, "").replace(/\s+(e|con|ed|per)$/, "").trim();
      ph = ph.split(/\s+/).filter((w, i, a) => !(i === a.length - 1 && /^(di|del|della|dello|dei|delle|per|a)$/.test(w))).join(" ");
      if (!ph || STOPW.test(ph.split(" ")[0]) || ph.length < 4 || knownPart(ph)) continue;
      out.push({ name: ph, text: raw });
    }
  }
  return out;
};

const stamp = (log) => isoFromLogDate(log.dateString);

// [{ part, qty, logs: [{ log, iso, qty, text, details }], details: [[label, n]], meters, customers: [[nome, n]] }]
export const myChanges = (logs, me, { year, month = null } = {}) => {
  const out = new Map();
  const others = new Map();
  for (const log of logs || []) {
    if (!isMine(log, me)) continue;
    const iso = stamp(log);
    if (!iso || Number(iso.slice(0, 4)) !== year) continue;
    if (month != null && Number(iso.slice(5, 7)) !== month + 1) continue;
    const found = new Map(findDoneParts(log.description, PARTS).map((f) => [f.item.id, { qty: f.qty || 1, text: f.text }]));
    // fune / catena sostituita compilata nel modulo (con diametro e lunghezza)
    ["fune", "catena"].forEach((k) => {
      const r = log[k];
      if (!r) return;
      const extra = [r.diametro ? `Ø${fmtN(r.diametro)} mm` : "", r.lunghezza ? `${fmtN(r.lunghezza)} m` : ""].filter(Boolean).join(" ");
      if (!found.has(k)) found.set(k, { qty: 1, text: (k === "fune" ? "Fune sostituita " : "Catena sostituita ") + extra });
      else found.get(k).form = extra;
    });
    found.forEach((f, id) => {
      const part = PARTS.find((p) => p.id === id);
      const row = out.get(id) || { part, qty: 0, logs: [] };
      const details = detailsOf(id, (f.form ? f.form + " " : "") + f.text);
      row.qty += f.qty;
      row.logs.push({ log, iso, qty: f.qty, text: f.text, details });
      out.set(id, row);
    });
    for (const o of otherParts(log.description)) {
      const row = others.get(o.name) || { name: o.name, qty: 0, logs: [] };
      row.qty += 1;
      row.logs.push({ log, iso, qty: 1, text: o.text, details: [] });
      others.set(o.name, row);
    }
  }
  const finish = (r) => {
    const det = {};
    const cus = {};
    let meters = 0;
    for (const l of r.logs) {
      l.details.filter((d) => !/ m$/.test(d)).forEach((d) => (det[d] = (det[d] || 0) + l.qty));
      const m = l.details.find((d) => / m$/.test(d));
      if (m) meters += num(m.replace(" m", "").replace(",", ".")) * (l.qty || 1);
      const c = String(l.log.customer || "").trim();
      if (c) cus[c] = (cus[c] || 0) + l.qty;
    }
    const byN = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
    return { ...r, logs: r.logs.sort((a, b) => b.iso.localeCompare(a.iso)), details: byN(det), meters: Math.round(meters * 10) / 10, customers: byN(cus), last: r.logs.length ? r.logs.map((l) => l.iso).sort().pop() : "" };
  };
  const rows = [...out.values()].map(finish).sort((a, b) => b.qty - a.qty || a.part.one.localeCompare(b.part.one));
  rows.others = [...others.values()].map(finish).sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
  return rows;
};
