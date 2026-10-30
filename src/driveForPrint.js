// STAMPA: aggiunge al rapporto i dati presi dal Drive (paese e indirizzo del cliente, dati della gru e stato di
// fune o catena dall'ultimo foglio di verifica). Se non ci sono o non si riesce a leggerli, il rapporto esce
// come prima: la stampa non deve mai bloccarsi per questo.
import { collection, query, where } from "firebase/firestore";
import { db, appId } from "./firebase";
import { getDocs } from "./metered";
import { loadRows } from "./components/DriveCraneInfo";
import { findDriveCrane } from "./driveCranes";
import { placeOf } from "./places";
import { emailsForLog } from "./profile";

const placeCache = {};
const placeFor = (name) => {
  const k = String(name || "");
  if (!k) return Promise.resolve("");
  if (!placeCache[k]) {
    placeCache[k] = getDocs(query(collection(db, "artifacts", appId, "public", "data", "customers"), where("name", "==", k)))
      .then((s) => (s.docs[0] ? placeOf(s.docs[0].data()) : ""))
      .catch(() => {
        delete placeCache[k];
        return "";
      });
  }
  return placeCache[k];
};

export const withDriveInfo = async (log) => {
  if (!log) return log;
  log = { ...log, _emails: emailsForLog(log) }; // email della ditta dei tecnici (Il mio profilo)
  try {
    const [rows, place] = await Promise.all([loadRows(log.customer), placeFor(log.customer)]);
    return { ...log, _drive: findDriveCrane(rows, log.machineId, log.customer), _place: place };
  } catch (e) {
    console.error(e);
    return log;
  }
};
