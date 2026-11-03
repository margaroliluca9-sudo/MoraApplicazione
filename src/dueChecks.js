// VERIFICHE IN SCADENZA (Ufficio): il programma del Drive (apps-script/paesi-dal-drive.gs) ogni mattina legge i
// nomi dei fogli di ogni cartella cliente («T10.26» = trimestrale di ottobre 2026, «A10.26» = annuale) e scrive in
// settings/drive_checks, per ogni cartella: { id, c: cliente, n: cartella, u: 202610, t: "T"|"A", q: trimestrale, f: foglio }.
// Qui calcolo la prossima: trimestrale = 3 mesi dopo l'ultima, solo annuale = 12 mesi dopo.
import { doc } from "firebase/firestore";
import { db, appId } from "./firebase";
import { getDoc } from "./metered";

const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const MESI_LUNGHI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
// 202610 → numero di mesi (per fare le differenze)
const idx = (p) => Math.floor(p / 100) * 12 + (p % 100) - 1;
const fromIdx = (i) => Math.floor(i / 12) * 100 + (i % 12) + 1;
export const periodLabel = (p, long = false) => `${(long ? MESI_LUNGHI : MESI)[(p % 100) - 1]} ${Math.floor(p / 100)}`;
export const shortName = (p, t) => `${t}${String(p % 100).padStart(2, "0")}.${String(Math.floor(p / 100) % 100).padStart(2, "0")}`;

const STALE = 18; // ultima verifica più vecchia di un anno e mezzo: forse il cliente non è più seguito

// righe pronte per la lista: { key, name, folder, last, lastLabel, every, next, nextLabel, late (mesi), group }
// group: "late" scaduta · "now" questo mese · "next" mese prossimo · "later" più avanti · "stale" ferma
export const dueList = (entries = [], customers = [], now = new Date()) => {
  const byId = new Map(customers.map((c) => [c.id, c]));
  const cur = now.getFullYear() * 12 + now.getMonth();
  return entries
    .filter((e) => e && Number(e.u) > 0 && !(e.c && byId.get(e.c) && byId.get(e.c).driveNone))
    .map((e) => {
      const every = e.q ? 3 : 12;
      const nextI = idx(e.u) + every;
      const late = cur - nextI;
      const cust = e.c ? byId.get(e.c) : null;
      const parts = String(e.n || "").split(" › ");
      const group = cur - idx(e.u) > STALE ? "stale" : late > 0 ? "late" : late === 0 ? "now" : late === -1 ? "next" : "later";
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

let cache = null;
export const loadDueChecks = () => {
  if (!cache)
    cache = getDoc(doc(db, "artifacts", appId, "public", "data", "settings", "drive_checks"))
      .then((s) => {
        if (!s.exists()) return { list: [], updatedAt: "", missing: true };
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
