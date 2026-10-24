// CLASSIFICA DEL GIOCO tra i tecnici: un documento per tecnico (il suo record).
// Si legge solo aprendo il gioco e a fine partita (al massimo 10 righe).
import { doc, collection, setDoc, query, orderBy, limit } from "firebase/firestore";
import { getDoc, getDocs } from "../metered";
import { db, appId } from "../firebase";
import { key } from "../chat";

const COLL = "game_scores";
const ref = () => collection(db, "artifacts", appId, "public", "data", COLL);

export const topScores = async () => {
  const s = await getDocs(query(ref(), orderBy("best", "desc"), limit(10)));
  return s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.name && Number(r.best) > 0);
};

// salva il record solo se è più alto di quello che c'è
export const saveScore = async (me, score, look = "") => {
  const k = key(me);
  if (!k || !(score > 0)) return false;
  const d = doc(ref(), k.replace(/[^a-z0-9_-]/gi, "_"));
  const cur = await getDoc(d);
  const best = cur.exists() ? Number(cur.data().best) || 0 : 0;
  if (score <= best) return false;
  await setDoc(d, { name: String(me).trim(), owner: k, best: score, at: Date.now(), look: look || "" });
  return true;
};
