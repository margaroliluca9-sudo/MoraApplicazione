// COSA HO CAMBIATO (La mia area): quanti pezzi ha sostituito il tecnico, letti dai suoi rapporti.
// Conta le frasi con «sostituito / cambiato / montato / nuovo…» (non «da sostituire», «consigliato»…),
// con la quantità se scritta («cambiati 2 fusibili»). Funi e catene contano anche dai dati
// della fune/catena sostituita nel modulo.
import { findDoneParts } from "./van";
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

// [{ part, qty, logs: [{ log, qty, text }] }] dal più cambiato
export const myChanges = (logs, me, { year, month = null } = {}) => {
  const out = new Map();
  for (const log of logs || []) {
    if (!isMine(log, me)) continue;
    const iso = isoFromLogDate(log.dateString);
    if (!iso || Number(iso.slice(0, 4)) !== year) continue;
    if (month != null && Number(iso.slice(5, 7)) !== month + 1) continue;
    const found = new Map(findDoneParts(log.description, PARTS).map((f) => [f.item.id, { qty: f.qty || 1, text: f.text }]));
    // fune / catena sostituita compilata nel modulo
    ["fune", "catena"].forEach((k) => {
      if (log[k] && !found.has(k)) found.set(k, { qty: 1, text: k === "fune" ? "Fune sostituita" : "Catena sostituita" });
    });
    found.forEach((f, id) => {
      const part = PARTS.find((p) => p.id === id);
      const row = out.get(id) || { part, qty: 0, logs: [] };
      row.qty += f.qty;
      row.logs.push({ log, iso, qty: f.qty, text: f.text });
      out.set(id, row);
    });
  }
  return [...out.values()]
    .map((r) => ({ ...r, logs: r.logs.sort((a, b) => b.iso.localeCompare(a.iso)) }))
    .sort((a, b) => b.qty - a.qty || a.part.one.localeCompare(b.part.one));
};
