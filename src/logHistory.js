// STORIA DELLE MODIFICHE DI UN RAPPORTO: ogni volta che qualcuno lo modifica, nel rapporto stesso
// (campo «edits») resta chi, quando e cosa è cambiato (prima → dopo). Le ultime 15 modifiche.
// Nessuna lettura in più: si scrive insieme alla modifica.
import { formatRope } from "./ropes";

export const MAX_EDITS = 15;
const FIELDS = [
  ["customer", "Cliente"],
  ["machineId", "Gru"],
  ["machineType", "Tipo di gru"],
  ["capacity", "Portata"],
  ["dateString", "Data"],
  ["ticketNumber", "N. assistenza"],
  ["technician", "Tecnico"],
  ["additionalTechnicians", "Colleghi"],
  ["description", "Descrizione"],
  ["fune", "Fune"],
  ["catena", "Catena"],
];
const show = (k, v) => {
  if (v == null || v === "") return "";
  if (k === "fune" || k === "catena") return typeof v === "object" ? formatRope(v) : String(v);
  if (Array.isArray(v)) return v.filter((x) => String(x).trim()).join(", ");
  return String(v);
};
const cut = (s) => (s.length > 160 ? s.slice(0, 157) + "…" : s);

// cosa è cambiato tra prima e dopo: [{ f: "Descrizione", a: "vecchio", b: "nuovo" }]
export const diffLog = (before = {}, after = {}, photosBefore = null, photosAfter = null) => {
  const out = [];
  FIELDS.forEach(([k, label]) => {
    if (!(k in after)) return;
    const a = show(k, before[k]);
    const b = show(k, after[k]);
    if (a.trim().toUpperCase() !== b.trim().toUpperCase() || (k === "description" && a !== b)) out.push({ f: label, a: cut(a), b: cut(b) });
  });
  if (photosBefore != null && photosAfter != null && photosBefore !== photosAfter) out.push({ f: "Foto", a: String(photosBefore), b: String(photosAfter) });
  return out;
};

// nuova lista di modifiche (le ultime 15) oppure null se non è cambiato niente
export const withEdit = (log, changes, who) => {
  if (!changes.length) return null;
  const list = Array.isArray(log.edits) ? log.edits : [];
  return [...list, { at: Date.now(), who: who || "", changes }].slice(-MAX_EDITS);
};

export const editsOf = (log) => (Array.isArray(log && log.edits) ? log.edits : []);
