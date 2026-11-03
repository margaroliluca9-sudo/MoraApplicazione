// VERBALI DI CONTROLLO FUNE / CATENA STAMPATI (Fune e catena → «Verbali stampati»).
// Raccolta a sé (wear_reports): NON tocca gli interventi. Un documento per verbale:
//   { at, day, type: "fune"|"catena", esito, level, rep (JSON del verbale), crane { customerName, matricola, type, capacity }, tech, owner }
// Si leggono solo aprendo «Fune e catena» (gli ultimi 20).
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
import { addDoc, deleteDoc } from "./tracked";
import { getDocs } from "./metered";
import { db, appId } from "./firebase";
import { key } from "./chat";

export const WEAR_REPORTS = "wear_reports";
const ref = () => collection(db, "artifacts", appId, "public", "data", WEAR_REPORTS);

export const saveWearReport = ({ rep, crane = null, tech = "", day }) =>
  addDoc(ref(), {
    at: Date.now(),
    day: day || new Date().toLocaleDateString("it-IT"),
    type: rep.type,
    esito: rep.esito,
    level: rep.level,
    rep: JSON.stringify(rep),
    crane: crane ? { customerName: String(crane.customerName || ""), matricola: String(crane.matricola || ""), type: String(crane.type || ""), capacity: String(crane.capacity || "") } : null,
    tech: String(tech || ""),
    owner: key(tech) || "",
  });

// solo admin (Fune e catena → Verbali stampati → cestino)
export const deleteWearReport = (id) => deleteDoc(doc(ref(), id));

export const listWearReports = async (n = 20) => {
  const s = await getDocs(query(ref(), orderBy("at", "desc"), limit(n)));
  return s.docs
    .map((d) => {
      const x = { id: d.id, ...d.data() };
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
