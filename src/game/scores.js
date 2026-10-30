// CLASSIFICA DEL GIOCO tra i tecnici: un documento per tecnico (il suo record).
// Si legge solo aprendo il gioco e a fine partita (al massimo 10 righe).
import { doc, collection, query, orderBy, limit } from "firebase/firestore";
import { setDoc } from "../tracked";
import { getDoc, getDocs } from "../metered";
import { db, appId } from "../firebase";
import { key } from "../chat";

const COLL = "game_scores";
const ref = () => collection(db, "artifacts", appId, "public", "data", COLL);

export const topScores = async () => {
  const s = await getDocs(query(ref(), orderBy("best", "desc"), limit(10)));
  return s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.name && Number(r.best) > 0);
};

const myDoc = (k) => doc(ref(), k.replace(/[^a-z0-9_-]/gi, "_"));

// il livello più alto raggiunto dal tecnico (vale su tutti i telefoni)
export const myStage = async (me) => {
  const k = key(me);
  if (!k) return 0;
  const cur = await getDoc(myDoc(k));
  return cur.exists() ? Number(cur.data().stage) || 0 : 0;
};

// salva il record se è più alto di quello che c'è, e il livello se è più alto
export const saveScore = async (me, score, look = "", stage = 0) => {
  const k = key(me);
  if (!k || !(score > 0 || stage > 1)) return false;
  const d = myDoc(k);
  const cur = await getDoc(d);
  const old = cur.exists() ? cur.data() : {};
  const best = Number(old.best) || 0;
  const oldStage = Number(old.stage) || 0;
  if (score <= best && stage <= oldStage) return false;
  await setDoc(d, {
    name: String(me).trim(),
    owner: k,
    best: Math.max(best, score),
    stage: Math.max(oldStage, stage),
    at: score > best ? Date.now() : old.at || Date.now(),
    look: look || old.look || "",
  });
  return true;
};
