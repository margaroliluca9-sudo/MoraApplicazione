// VERBALI DI CONTROLLO FUNE / CATENA STAMPATI (Fune e catena → «Verbali stampati»).
// Raccolta a sé (wear_reports): NON tocca gli interventi. Un documento per verbale:
//   { at, day, type: "fune"|"catena", esito, level, rep (JSON del verbale), crane { customerName, matricola, type, capacity }, tech, owner }
// Si leggono solo aprendo «Fune e catena» (gli ultimi 20).
import { collection, query, orderBy, limit, doc, waitForPendingWrites } from "firebase/firestore";
import { addDoc, deleteDoc } from "./tracked";
import { getDocs } from "./metered";
import { db, appId } from "./firebase";
import { key } from "./chat";

export const WEAR_REPORTS = "wear_reports";
const ref = () => collection(db, "artifacts", appId, "public", "data", WEAR_REPORTS);

// VERBALI NON ANCORA MANDATI (senza rete): il telefono li tiene e li manda da solo quando torna la rete.
// Qui si contano, per la striscia in alto («2 verbali da mandare»).
const PKEY = "mora_wear_pending";
const readP = () => {
  try {
    const a = JSON.parse(localStorage.getItem(PKEY) || "[]");
    return Array.isArray(a) ? a : [];
  } catch (e) {
    return [];
  }
};
const writeP = (a) => {
  try {
    localStorage.setItem(PKEY, JSON.stringify(a));
  } catch (e) {
    // niente
  }
  window.dispatchEvent(new CustomEvent("mora-wear-pending"));
};
export const pendingWearCount = () => readP().length;
// quando il server ha ricevuto tutto quello che aspettava, la lista si svuota (anche dopo aver chiuso l'app)
export const watchPendingWear = () => {
  if (!readP().length) return;
  try {
    waitForPendingWrites(db)
      .then(() => {
        writeP([]);
        window.dispatchEvent(new CustomEvent("mora-wear-saved"));
      })
      .catch(() => {});
  } catch (e) {
    // niente
  }
};
export const saveWearReport = ({ rep, crane = null, tech = "", day }) => {
  const pid = Math.random().toString(36).slice(2, 10);
  writeP([...readP(), pid]);
  const done = () => writeP(readP().filter((x) => x !== pid));
  return addDoc(ref(), {
    at: Date.now(),
    day: day || new Date().toLocaleDateString("it-IT"),
    type: rep.type,
    esito: rep.esito,
    level: rep.level,
    rep: JSON.stringify(rep),
    crane: crane ? { customerName: String(crane.customerName || ""), matricola: String(crane.matricola || ""), type: String(crane.type || ""), capacity: String(crane.capacity || "") } : null,
    tech: String(tech || ""),
    owner: key(tech) || "",
  }).then((r) => {
    done();
    return r;
  });
};

// solo admin (Fune e catena → Verbali stampati → cestino)
export const deleteWearReport = (id) => deleteDoc(doc(ref(), id));

export const listWearReports = async (n = 20) => {
  const s = await getDocs(query(ref(), orderBy("at", "desc"), limit(n)));
  return s.docs
    .map((d) => {
      const x = { id: d.id, ...d.data(), pending: !!(d.metadata && d.metadata.hasPendingWrites) };
      try {
        x.rep = typeof x.rep === "string" ? JSON.parse(x.rep) : x.rep;
      } catch (e) {
        x.rep = null;
      }
      return x;
    })
    .filter((x) => x.rep)
    .sort((a, b) => (b.at || 0) - (a.at || 0));
};
