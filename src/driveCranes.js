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

// matricola scritta in modo uguale (senza spazi e punti, maiuscolo): per gli abbinamenti fatti a mano
export const sameMat = (a, b) => {
  const n = (x) => String(x || "").toUpperCase().replace(/[.\s]/g, "");
  return !!n(a) && n(a) === n(b);
};

// linkTo = "-": «non è nessuna gru dell'app» (deciso in Admin → Drive)
const autoMatch = (row, mat) => {
  const k = fabKey(mat);
  if (!k) return false;
  return (!!row.fabKey && row.fabKey === k) || (!row.fabKey && !!row.internoKey && row.internoKey === k);
};
const autoMatchInterno = (row, mat) => {
  const k = fabKey(mat);
  return !!k && !!row.fabKey && !!row.internoKey && row.internoKey === k;
};

// la riga del Drive che corrisponde a questa gru (o null), già con le correzioni
export const findDriveCrane = (rows, matricola, customerName) => {
  const cust = normCust(customerName);
  const mine = (rows || []).filter((r) => !r.hidden && (!cust || normCust(r.customerName) === cust));
  const linked = mine.find((r) => r.linkTo && r.linkTo !== "-" && sameMat(r.linkTo, matricola));
  if (linked) return withFix(linked);
  const free = mine.filter((r) => !r.linkTo);
  return withFix(free.find((r) => autoMatch(r, matricola)) || free.find((r) => autoMatchInterno(r, matricola)) || null);
};

// a quale gru dell'app va questa riga (o null) e come: "mano" | "fabbrica" | "interno"
export const matchOfRow = (row, machines) => {
  const list = (machines || []).filter((m) => normCust(m.customerName) === normCust(row.customerName));
  if (row.linkTo === "-") return null;
  if (row.linkTo) {
    const m = list.find((x) => sameMat(getSafeMatricola(x), row.linkTo));
    return m ? { m, how: "mano" } : null;
  }
  let m = list.find((x) => autoMatch(row, getSafeMatricola(x)));
  if (m) return { m, how: row.fabKey ? "fabbrica" : "interno" };
  m = list.find((x) => autoMatchInterno(row, getSafeMatricola(x)));
  return m ? { m, how: "interno" } : null;
};
export const machineOfRow = (row, machines) => {
  const r = matchOfRow(row, machines);
  return r ? r.m : null;
};

// ---------- CONTROLLI: gru abbinate in modo dubbio ----------
// portata in kg: "2.000" → 2000, "3,2 t" → 3200, "500 kg" → 500
export const kgOf = (v) => {
  const s = String(v || "").toLowerCase().replace(/\s+/g, "");
  const m = s.match(/(\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)(t|ton|kg)?/);
  if (!m) return null;
  let n = /^\d{1,3}(\.\d{3})+$/.test(m[1]) ? Number(m[1].replace(/\./g, "")) : Number(m[1].replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (m[2] === "t" || m[2] === "ton") n *= 1000;
  return Math.round(n);
};
// tipo di gru «a grandi linee», per confrontare Drive e app
export const tipoCat = (v) => {
  const s = String(v || "").toLowerCase();
  if (/bandiera|girevol/.test(s)) return "bandiera";
  if (/bi\s*-?\s*trave|bitrave|birotaia|doppia trave/.test(s)) return "bitrave";
  if (/mono\s*-?\s*trave|monotrave|monorotaia/.test(s)) return "monotrave";
  if (/cavallett|portale|semiportale/.test(s)) return "portale";
  return null;
};
const TIPO_LABEL = { bandiera: "bandiera", bitrave: "bitrave", monotrave: "monotrave", portale: "a portale" };

// differenze tra la riga del Drive (con correzioni) e la gru dell'app
export const diffOf = (row, m) => {
  const r = withFix(row);
  const out = [];
  const td = tipoCat(r.tipo);
  const ta = tipoCat(m.type);
  if (td && ta && td !== ta) out.push(`tipo diverso: sul Drive ${TIPO_LABEL[td]}, nell'app ${TIPO_LABEL[ta]}`);
  const kd = kgOf(r.portata);
  const ka = kgOf(m.capacity);
  if (kd && ka && Math.abs(kd - ka) > Math.max(ka, kd) * 0.02) out.push(`portata diversa: sul Drive ${kd} kg, nell'app ${ka} kg`);
  return out;
};

const near = (a, b) => {
  if (!a || !b || a.length < 3 || b.length < 3) return false;
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  // al massimo una cifra diversa, in più o in meno
  let i = 0;
  let j = 0;
  let e = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      e++;
      if (e > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else {
        i++;
        j++;
      }
    }
  }
  return e + (a.length - i) + (b.length - j) <= 1;
};

// per un cliente: { doubts: [{ row, m, reasons }], suggestions: [{ row, m, why }], orphans: [row] }
//  - dubbi: gru abbinate ma con tipo/portata diversi, abbinate col numero interno, o due righe sulla stessa gru
//  - suggerimenti: righe senza gru nell'app per cui c'è una gru «quasi uguale» (numero con una cifra diversa,
//    oppure unica con stessa portata e stesso tipo)
//  - orfane: righe senza gru nell'app e senza suggerimenti
// Quello che hai già confermato (okFor) o deciso a mano (linkTo) non viene più chiesto.
export const reviewCustomer = (rows, machines) => {
  const vis = (rows || []).filter((r) => !r.hidden);
  const matched = vis.map((row) => ({ row, x: matchOfRow(row, machines) }));
  const used = {};
  matched.forEach(({ x }) => {
    if (x) used[x.m.id] = (used[x.m.id] || 0) + 1;
  });
  const doubts = [];
  const suggestions = [];
  const orphans = [];
  matched.forEach(({ row, x }) => {
    if (x) {
      if (row.okFor === x.m.id) return;
      const reasons = [];
      if (used[x.m.id] > 1) reasons.push("anche un'altra riga del Drive finisce su questa gru");
      if (x.how === "mano") {
        if (reasons.length) doubts.push({ row, m: x.m, reasons });
        return;
      }
      if (x.how === "interno") reasons.push("abbinata col numero interno, non col numero di fabbrica");
      reasons.push(...diffOf(row, x.m));
      if (reasons.length) doubts.push({ row, m: x.m, reasons });
      return;
    }
    if (row.linkTo === "-" || row.noApp) return;
    const mine = (machines || []).filter((m) => normCust(m.customerName) === normCust(row.customerName) && !used[m.id] && m.id !== row.noSugg);
    const r = withFix(row);
    const byNum = mine.filter((m) => near(fabKey(getSafeMatricola(m)).replace(/\D/g, ""), String(row.fabKey || "").replace(/\D/g, "")));
    if (byNum.length === 1) {
      suggestions.push({ row, m: byNum[0], why: "il numero è quasi uguale" });
      return;
    }
    const kd = kgOf(r.portata);
    const td = tipoCat(r.tipo);
    const bySpec = kd && td ? mine.filter((m) => kgOf(m.capacity) === kd && tipoCat(m.type) === td) : [];
    if (bySpec.length === 1) {
      suggestions.push({ row, m: bySpec[0], why: "stessa portata e stesso tipo" });
      return;
    }
    orphans.push(row);
  });
  return { doubts, suggestions, orphans };
};

// colore dello stato: rosso = da fermare, giallo = da guardare, verde = a posto
export const statoTone = (s) => {
  const t = String(s || "").toLowerCase();
  if (/non idone|fuori servizio|sostituire subito|da sostituire/.test(t)) return "red";
  if (/sostitu|controllo|distort|gobb|rott|usura|usurat/.test(t)) return "amber";
  if (/idone|nella norma|ok\b/.test(t)) return "emerald";
  return "slate";
};
