// FUNI E CATENE DAL DRIVE
// Ogni mattina il programmino in apps-script/paesi-dal-drive.gs legge l'ultimo foglio di verifica di ogni
// cliente (cartella Clienti/Verifiche nel Drive) e scrive una riga per gru in drive_cranes:
// { customerId, customerName, fab, fabKey, interno, internoKey, tipo, portata, paranco, matricola, anno,
//   stato: "Fune idonea …", foglio: "Trimestrale 10/2026", updatedAt }.
// Sulla scheda della gru l'app cerca la riga con lo stesso numero di fabbrica (quello scritto in Matricola).

// stessa regola del programmino: "4738 A" → "4738A", "2774 (1)" → "2774", "625/1987N.1" → "625/1987"
export const fabKey = (s) => {
  const t = String(s || "").toUpperCase().replace(/[.\s]/g, "");
  const m = t.match(/^[A-Z]{0,4}\d{2,8}(?:[A-Z](?![A-Z])|\/\d{1,4}|-\d{1,3})?/);
  return m ? m[0] : "";
};

const normCust = (s) => String(s || "").trim().toUpperCase();

// la riga del Drive che corrisponde a questa gru (o null)
export const findDriveCrane = (rows, matricola, customerName) => {
  const k = fabKey(matricola);
  if (!k) return null;
  const cust = normCust(customerName);
  const mine = (rows || []).filter((r) => !cust || normCust(r.customerName) === cust);
  return mine.find((r) => r.fabKey === k) || mine.find((r) => r.internoKey && r.internoKey === k) || null;
};

// colore dello stato: rosso = da fermare, giallo = da guardare, verde = a posto
export const statoTone = (s) => {
  const t = String(s || "").toLowerCase();
  if (/non idone|fuori servizio|sostituire subito|da sostituire/.test(t)) return "red";
  if (/sostitu|controllo|distort|gobb|rott|usura|usurat/.test(t)) return "amber";
  if (/idone|nella norma|ok\b/.test(t)) return "emerald";
  return "slate";
};
