// FUNI E CATENE DAL DRIVE
// Ogni mattina il programmino in apps-script/paesi-dal-drive.gs legge l'ultimo foglio di verifica di ogni
// cliente (cartella Clienti/Verifiche nel Drive) e scrive una riga per gru in drive_cranes:
// { customerId, customerName, fab, fabKey, interno, internoKey, tipo, portata, paranco, matricola, anno,
//   stato: "Fune idonea …", foglio: "Trimestrale 10/2026", updatedAt }.
// Sulla scheda della gru l'app cerca la riga con lo stesso numero di fabbrica (quello scritto in Matricola).
import { getSafeMatricola } from "./utils";

// stessa regola del programmino: "4738 A" → "4738A", "2774 (1)" → "2774", "625/1987N.1" → "625/1987"
export const fabKey = (s) => {
  const t = String(s || "").toUpperCase().replace(/[.\s]/g, "");
  const m = t.match(/^[A-Z]{0,4}\d{2,8}(?:[A-Z](?![A-Z])|\/\d{1,4}|-\d{1,3})?/);
  return m ? m[0] : "";
};

const normCust = (s) => String(s || "").trim().toUpperCase();

// correzioni fatte in Admin → Drive (il programma del Drive non le tocca):
//   fix: { stato, tipo, portata, paranco, matricola, anno }  → valgono al posto di quelle del foglio
//   linkTo: "M12"  → questa riga va sulla gru dell'app con questa matricola (invece che col numero di fabbrica)
//   hidden: true   → non mostrarla da nessuna parte
export const FIX_FIELDS = [
  ["stato", "Fune / catena"],
  ["tipo", "Tipo"],
  ["portata", "Portata (kg)"],
  ["paranco", "Paranco"],
  ["matricola", "Matricola INAIL"],
  ["anno", "Anno"],
];
export const withFix = (r) => {
  if (!r) return r;
  const out = { ...r };
  const fix = r.fix || {};
  FIX_FIELDS.forEach(([k]) => {
    if (String(fix[k] || "").trim()) out[k] = fix[k];
  });
  return out;
};
export const isFixed = (r) => !!r && (!!String(r.linkTo || "").trim() || FIX_FIELDS.some(([k]) => String((r.fix || {})[k] || "").trim()));

// la riga del Drive che corrisponde a questa gru (o null), già con le correzioni
export const findDriveCrane = (rows, matricola, customerName) => {
  const k = fabKey(matricola);
  if (!k) return null;
  const cust = normCust(customerName);
  const mine = (rows || []).filter((r) => !r.hidden && (!cust || normCust(r.customerName) === cust));
  const linked = mine.find((r) => r.linkTo && fabKey(r.linkTo) === k);
  if (linked) return withFix(linked);
  const free = mine.filter((r) => !r.linkTo);
  return withFix(free.find((r) => r.fabKey === k) || free.find((r) => r.internoKey && r.internoKey === k) || null);
};

// a quale gru dell'app va questa riga (o null)
export const machineOfRow = (row, machines) => {
  const list = (machines || []).filter((m) => normCust(m.customerName) === normCust(row.customerName));
  const mat = getSafeMatricola;
  if (row.linkTo) return list.find((m) => fabKey(mat(m)) === fabKey(row.linkTo)) || null;
  return list.find((m) => fabKey(mat(m)) === row.fabKey) || (row.internoKey ? list.find((m) => fabKey(mat(m)) === row.internoKey) : null) || null;
};

// colore dello stato: rosso = da fermare, giallo = da guardare, verde = a posto
export const statoTone = (s) => {
  const t = String(s || "").toLowerCase();
  if (/non idone|fuori servizio|sostituire subito|da sostituire/.test(t)) return "red";
  if (/sostitu|controllo|distort|gobb|rott|usura|usurat/.test(t)) return "amber";
  if (/idone|nella norma|ok\b/.test(t)) return "emerald";
  return "slate";
};
