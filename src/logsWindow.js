// INTERVENTI NEGLI ANNI: cosa si scarica e quando.
// Con gli anni gli interventi diventano migliaia: scaricarli tutti a ogni apertura costerebbe
// troppe letture (piano gratuito di Firebase). Allora:
//  - l'anno in corso e quello prima: sempre aggiornati in diretta (come prima);
//  - i più vecchi: subito dalla copia sul telefono, e dal server al massimo una volta al giorno.
// Nell'app si vedono sempre tutti, in ogni pagina.
// Si accende da solo (settings/layout.logsWindowed) quando l'admin ha sistemato i pochi interventi
// senza data di creazione: fino ad allora si scarica tutto come prima.
import { collection, doc, query, where, getDocsFromCache, Timestamp } from "firebase/firestore";
import { writeBatch, setDoc } from "./tracked";
import { getDocsFromServer } from "./metered";
import { db, appId } from "./firebase";

const logsColl = () => collection(db, "artifacts", appId, "public", "data", "maintenance_logs");
const LAST = "mora_old_logs_sync";
const DAY = 864e5;

// dal 1° gennaio dell'anno scorso
export const windowStart = (now = new Date()) => new Date(now.getFullYear() - 1, 0, 1).getTime();
export const recentQuery = (start) => query(logsColl(), where("createdAt", ">=", Timestamp.fromMillis(start)));
const olderQuery = (start) => query(logsColl(), where("createdAt", "<", Timestamp.fromMillis(start)));
const rows = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

const lastSync = () => {
  try {
    return Number(localStorage.getItem(LAST) || 0);
  } catch (e) {
    return 0;
  }
};
const markSync = () => {
  try {
    localStorage.setItem(LAST, String(Date.now()));
  } catch (e) {
    // niente
  }
};

// interventi vecchi: prima la copia sul telefono, poi (se è passato un giorno) il server
export const loadOlder = async (start, onRows, { force = false } = {}) => {
  let fromCache = null;
  try {
    fromCache = rows(await getDocsFromCache(olderQuery(start)));
    onRows(fromCache);
  } catch (e) {
    // nessuna copia sul telefono
  }
  if (!force && fromCache && Date.now() - lastSync() < DAY) return;
  try {
    onRows(rows(await getDocsFromServer(olderQuery(start))));
    markSync();
  } catch (e) {
    // senza rete: resta la copia
  }
};
// rilettura veloce dalla copia (dopo una modifica fatta da questo telefono)
export const reloadOlderFromCache = async (start, onRows) => {
  try {
    onRows(rows(await getDocsFromCache(olderQuery(start))));
  } catch (e) {
    // niente
  }
};

// avviso: ho modificato degli interventi (anche vecchi) da questo telefono
export const logsChanged = () => {
  try {
    window.dispatchEvent(new CustomEvent("mora-logs-changed"));
  } catch (e) {
    // niente
  }
};

// data di creazione presunta di un intervento senza createdAt (dalla data dell'intervento, a mezzogiorno)
export const createdFromDate = (dateString) => {
  const p = String(dateString || "").split("/").map(Number);
  if (p.length !== 3 || !p[2]) return Date.now();
  const d = new Date(p[2], (p[1] || 1) - 1, p[0] || 1, 12);
  return Number.isNaN(d.getTime()) ? Date.now() : d.getTime();
};
const hasCreated = (l) => l.createdAt && typeof l.createdAt.seconds === "number";

// SOLO ADMIN, con tutti gli interventi scaricati: metto la data di creazione a chi non ce l'ha;
// quando non manca più a nessuno accendo il sistema "anni" per tutti.
export const prepareWindow = async (rawLogs) => {
  const missing = rawLogs.filter((l) => !hasCreated(l));
  for (let i = 0; i < missing.length; i += 400) {
    const batch = writeBatch(db);
    missing.slice(i, i + 400).forEach((l) =>
      batch.update(doc(logsColl(), l.id), { createdAt: Timestamp.fromMillis(createdFromDate(l.dateString)) })
    );
    await batch.commit();
  }
  if (!missing.length && rawLogs.length) {
    await setDoc(doc(db, "artifacts", appId, "public", "data", "settings", "layout"), { logsWindowed: true }, { merge: true });
    return "on";
  }
  return missing.length;
};
