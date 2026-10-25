// LETTURE «UNA VOLTA AL GIORNO»: per i dati che cambiano al massimo una volta al giorno (es. le gru lette dal
// Drive, che il programma di Google aggiorna ogni mattina) uso la copia sul telefono e chiedo al server solo
// se l'ultima volta è stata più di un giorno fa. Così aprire Admin → Drive non costa centinaia di letture ogni volta.
import { getDocsFromCache } from "firebase/firestore";
import { getDocsFromServer } from "./metered";

const DAY = 864e5;
const KEY = "mora_daily_v1";
const stamps = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch (e) {
    return {};
  }
};
const stamp = (k) => {
  try {
    const s = stamps();
    s[k] = Date.now();
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    // niente
  }
};
const rowsOf = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

export const loadDaily = async (key, ref, maxAge = DAY) => {
  let cached = null;
  try {
    cached = rowsOf(await getDocsFromCache(ref));
  } catch (e) {
    cached = null;
  }
  if (cached && cached.length && Date.now() - (stamps()[key] || 0) < maxAge) return cached;
  try {
    const rows = rowsOf(await getDocsFromServer(ref));
    stamp(key);
    return rows;
  } catch (e) {
    if (cached) return cached;
    throw e;
  }
};
