// PAESI TOLTI DALL'APP: paese, indirizzo e posizione dei clienti non si usano più (sbagliavano troppo).
// Qui li cancello anche dal database: ogni volta che arriva la lista dei clienti, quelli che li hanno ancora
// (per esempio riscritti dalla vecchia copia del programma del Drive) vengono puliti. Gli altri dati del cliente non si toccano.
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { db, appId } from "./firebase";

export const PLACE_FIELDS = ["city", "address", "placeSource", "placeFolder", "placeSheet", "placeSheetUrl", "lat", "lng", "geoKey", "geo", "mapsUrl"];
const done = new Set();
export const clearPlaces = (customers) => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  (customers || []).forEach((c) => {
    if (!c || !c.id) return;
    const has = PLACE_FIELDS.filter((k) => c[k] !== undefined);
    const key = c.id + ":" + has.join(",");
    if (!has.length || done.has(key)) return;
    done.add(key);
    const data = {};
    has.forEach((k) => (data[k] = deleteField()));
    updateDoc(doc(db, "artifacts", appId, "public", "data", "customers", c.id), data).catch(() => done.delete(key));
  });
};
