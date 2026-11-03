// VERIFICHE IN SCADENZA (Ufficio): il programma del Drive (apps-script/paesi-dal-drive.gs) ogni mattina legge i
// nomi dei fogli di ogni cartella cliente («T10.26» = trimestrale di ottobre 2026, «A10.26» = annuale) e scrive in
// settings/drive_checks, per ogni cartella: { id, c: cliente, n: cartella, u: 202610, t: "T"|"A", q: trimestrale, f: foglio }.
// Qui calcolo la prossima: trimestrale = 3 mesi dopo l'ultima, solo annuale = 12 mesi dopo.
// Finché il programma del Drive non è aggiornato (niente settings/drive_checks) uso quello che c'è già: le gru lette
// dal Drive (drive_cranes) dicono il nome dell'ultimo foglio di ogni cartella. Con «T» è trimestrale di sicuro;
// con «A» può essere un trimestrale che ha appena fatto l'annuale o un cliente solo annuale: lo chiedo una volta
// in Ufficio e lo salvo nel cliente (checkEvery: 3 o 12), che vale sempre prima di tutto.
import { doc, collection } from "firebase/firestore";
import { db, appId } from "./firebase";
import { getDoc } from "./metered";
import { loadDaily } from "./dailyCache";

const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const MESI_LUNGHI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
// 202610 → numero di mesi (per fare le differenze)
const idx = (p) => Math.floor(p / 100) * 12 + (p % 100) - 1;
const fromIdx = (i) => Math.floor(i / 12) * 100 + (i % 12) + 1;
export const periodLabel = (p, long = false) => `${(long ? MESI_LUNGHI : MESI)[(p % 100) - 1]} ${Math.floor(p / 100)}`;
export const shortName = (p, t) => `${t}${String(p % 100).padStart(2, "0")}.${String(Math.floor(p / 100) % 100).padStart(2, "0")}`;

const STALE = 18; // ultima verifica più vecchia di un anno e mezzo: forse il cliente non è più seguito

// «SARPOM T10.26.docx», «Cliente A 04/26», «OLTEK%20A10.25» → { p: 202610, t: "T" } (stessa regola del programma del Drive)
export const periodOfName = (nome) => {
  const n = String(nome || "").replace(/%20/gi, " ").replace(/%2c/gi, ",");
  const m = n.match(/(?:^|[^A-Z0-9])([TA]) ?(\d{1,2}) ?[./\\,-] ?(\d{2})(?:[^0-9]|$)/i);
  if (!m) return null;
  const mese = Number(m[2]);
  if (mese < 1 || mese > 12) return null;
  return { p: (2000 + Number(m[3])) * 100 + mese, t: m[1].toUpperCase() };
};

// dalle gru lette dal Drive: una riga per cartella con l'ultimo foglio (q: true se «T», null se «A» = da chiedere)
export const entriesFromCranes = (rows = []) => {
  const by = new Map();
  rows.forEach((r) => {
    if (!r || r.hidden || !r.customerId) return;
    const x = periodOfName(r.foglioNome);
    if (!x) return;
    const k = r.cartellaId || r.cartella || r.customerId;
    const old = by.get(k);
    if (!old || x.p > old.u) by.set(k, { id: k, c: r.customerId, n: r.cartella || r.customerName || "", u: x.p, t: x.t, q: x.t === "T" ? true : null, f: r.foglioNome });
  });
  return [...by.values()];
};

// righe pronte per la lista: { key, name, folder, last, lastLabel, every, next, nextLabel, late (mesi), group }
// group: "ask" da chiedere (ultima «A», non si sa se trimestrale) · "late" scaduta · "now" questo mese · "next" mese prossimo · "later" più avanti · "stale" ferma
// every: { idCliente: 3 | 12 } scelte appena fatte (prima che arrivino dal database)
export const dueList = (entries = [], customers = [], now = new Date(), every = {}) => {
  const byId = new Map(customers.map((c) => [c.id, every[c.id] ? { ...c, checkEvery: every[c.id] } : c]));
  const cur = now.getFullYear() * 12 + now.getMonth();
  return entries
    .filter((e) => e && Number(e.u) > 0 && !(e.c && byId.get(e.c) && byId.get(e.c).driveNone))
    .map((e) => {
      const cust = e.c ? byId.get(e.c) : null;
      const chosen = cust && [3, 12].includes(Number(cust.checkEvery)) ? Number(cust.checkEvery) : 0;
      const every = chosen || (e.q === true ? 3 : e.q === false ? 12 : 0);
      const nextI = idx(e.u) + (every || 3);
      const late = cur - nextI;
      const parts = String(e.n || "").split(" › ");
      const group = cur - idx(e.u) > STALE ? "stale" : !every ? "ask" : late > 0 ? "late" : late === 0 ? "now" : late === -1 ? "next" : "later";
      return {
        key: e.id || e.n,
        customerId: cust ? cust.id : "",
        name: cust ? cust.name : parts[0] || "Cartella senza nome",
        folder: parts.length > 1 ? parts.slice(1).join(" › ") : "",
        matched: !!cust,
        last: e.u,
        lastLabel: shortName(e.u, e.t),
        sheet: e.f || "",
        every,
        chosen: !!chosen,
        next: fromIdx(nextI),
        nextLabel: periodLabel(fromIdx(nextI)),
        late,
        group,
      };
    })
    .sort((a, b) => b.late - a.late || a.name.localeCompare(b.name));
};

export const lateText = (r) =>
  r.late > 0 ? `scaduta da ${r.late === 1 ? "1 mese" : r.late + " mesi"}` : r.late === 0 ? "questo mese" : r.late === -1 ? "il mese prossimo" : `tra ${-r.late} mesi`;

const fromCranes = () =>
  loadDaily("drive_cranes", collection(db, "artifacts", appId, "public", "data", "drive_cranes")).then((rows) => {
    const list = entriesFromCranes(rows);
    const at = rows.map((r) => r.updatedAt || "").sort().pop() || "";
    return list.length ? { list, updatedAt: at, fromCranes: true } : { list: [], updatedAt: "", missing: true };
  });

let cache = null;
export const loadDueChecks = () => {
  if (!cache)
    cache = getDoc(doc(db, "artifacts", appId, "public", "data", "settings", "drive_checks"))
      .then((s) => {
        if (!s.exists()) return fromCranes();
        const d = s.data() || {};
        let list = [];
        try {
          list = JSON.parse(d.list || "[]");
        } catch (e) {
          list = [];
        }
        return { list: Array.isArray(list) ? list : [], updatedAt: d.updatedAt || "" };
      })
      .catch((e) => {
        console.error(e);
        cache = null;
        return { list: [], updatedAt: "", error: true };
      });
  return cache;
};
