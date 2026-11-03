// CLASSIFICA E PARTITA SALVATA del gioco tra i tecnici: un documento per tecnico in game_scores.
//   best / stage      record di punti e livello più alto (di sempre)
//   week / weekBest   record della settimana (week = «2026-W45»: lunedì → domenica)
//   games             partite finite
//   day / dayBest     sfida del giorno: giorno («2026-11-03») e record di quel giorno
//   medals            medaglie vinte («s2:velluto,porto»: la stagione davanti)
//   save / saveAt     la partita lasciata a metà (JSON: livello, punti, vite…), così riprendi anche da un altro telefono
//   season           stagione della classifica: quando la si azzera si passa alla stagione dopo e tutto quello
//                    della stagione prima non conta più (record, livello, partita salvata). Stagione 2: dal 3/11/2026.
// Si legge solo aprendo il gioco e a fine partita (pochi documenti: uno per tecnico).
import { doc, collection, query, limit } from "firebase/firestore";
import { setDoc } from "../tracked";
import { getDoc, getDocs } from "../metered";
import { db, appId } from "../firebase";
import { key } from "../chat";

const COLL = "game_scores";
export const SEASON = 2;
const cur = (d) => (d && Number(d.season) === SEASON ? d : {});
const ref = () => collection(db, "artifacts", appId, "public", "data", COLL);
const myDoc = (k) => doc(ref(), k.replace(/[^a-z0-9_-]/gi, "_"));

// settimana ISO (lunedì → domenica): «2026-W45»
export const weekKey = (d = new Date()) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
};

// giorno della sfida (ora di qui): «2026-11-03»
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const medalsOf = (r) => {
  const m = String((r && r.medals) || "");
  return m.startsWith(`s${SEASON}:`) ? m.slice(String(SEASON).length + 2).split(",").filter(Boolean) : [];
};
// tutti i tecnici in classifica (righe con almeno un punto)
export const allScores = async () => {
  const s = await getDocs(query(ref(), limit(60)));
  return s.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => Number(r.season) === SEASON && r.name && (Number(r.best) > 0 || Number(r.stage) > 1 || Number(r.dayBest) > 0));
};
// classifica di sempre (per punti, poi livello), della settimana o della sfida di oggi («day»)
export const rank = (rows = [], mode = "all", now = new Date()) => {
  const wk = weekKey(now);
  const dk = dayKey(now);
  return rows
    .map((r) => ({
      ...r,
      pts: mode === "day" ? (r.day === dk ? Number(r.dayBest) || 0 : 0) : mode === "week" ? (r.week === wk ? Number(r.weekBest) || 0 : 0) : Number(r.best) || 0,
      nMedals: medalsOf(r).length,
    }))
    .filter((r) => r.pts > 0)
    .sort((a, b) => b.pts - a.pts || (Number(b.stage) || 0) - (Number(a.stage) || 0) || String(a.name).localeCompare(String(b.name)));
};
// vecchio nome (prima della classifica settimanale)
export const topScores = async () => rank(await allScores()).slice(0, 10);

// il mio documento (livello più alto e partita salvata): vale su tutti i telefoni del tecnico
export const myData = async (me) => {
  const k = key(me);
  if (!k) return null;
  const snap = await getDoc(myDoc(k));
  if (!snap.exists()) return null;
  const raw = snap.data() || {};
  const d = cur(raw);
  // la partita salvata ha la sua stagione (si salva anche prima del primo record della stagione)
  let save = null;
  try {
    save = raw.save ? JSON.parse(raw.save) : null;
  } catch (e) {
    save = null;
  }
  if (save && Number(save.season) !== SEASON) save = null;
  return { stage: Number(d.stage) || 0, best: Number(d.best) || 0, save, saveAt: save ? Number(raw.saveAt) || 0 : 0, medals: medalsOf(raw) };
};
export const myStage = async (me) => ((await myData(me)) || {}).stage || 0;

// record (di sempre e della settimana) e livello: solo se più alti di quelli che ci sono
// ended = partita finita (conta una partita in più)
export const saveScore = async (me, score, look = "", stage = 0, ended = true) => {
  const k = key(me);
  if (!k || !(score > 0 || stage > 1)) return false;
  const d = myDoc(k);
  const snap = await getDoc(d);
  const old = snap.exists() ? cur(snap.data()) : {};
  const best = Number(old.best) || 0;
  const oldStage = Number(old.stage) || 0;
  const wk = weekKey();
  const oldWeek = old.week === wk ? Number(old.weekBest) || 0 : 0;
  if (score <= best && stage <= oldStage && score <= oldWeek && !ended) return false;
  await setDoc(
    d,
    {
      name: String(me).trim(),
      owner: k,
      best: Math.max(best, score),
      stage: Math.max(oldStage, stage),
      at: score > best ? Date.now() : old.at || Date.now(),
      look: look || old.look || "",
      week: wk,
      weekBest: Math.max(oldWeek, score),
      games: (Number(old.games) || 0) + (ended ? 1 : 0),
      season: SEASON,
    },
    { merge: true }
  );
  return true;
};

// sfida del giorno: solo il record di oggi (la classifica normale non cambia)
export const saveDaily = async (me, score, look = "") => {
  const k = key(me);
  if (!k || !(score > 0)) return false;
  const d = myDoc(k);
  const snap = await getDoc(d);
  const old = snap.exists() ? cur(snap.data()) : {};
  const dk = dayKey();
  const oldDay = old.day === dk ? Number(old.dayBest) || 0 : 0;
  if (score <= oldDay) return false;
  await setDoc(
    d,
    {
      name: String(me).trim(),
      owner: k,
      best: Number(old.best) || 0,
      stage: Number(old.stage) || 0,
      week: old.week || "",
      weekBest: Number(old.weekBest) || 0,
      games: Number(old.games) || 0,
      look: look || old.look || "",
      day: dk,
      dayBest: score,
      season: SEASON,
    },
    { merge: true }
  );
  return true;
};
// medaglie vinte (tutte, non solo le nuove)
export const saveMedals = async (me, list) => {
  const k = key(me);
  if (!k) return false;
  await setDoc(myDoc(k), { name: String(me).trim(), owner: k, medals: `s${SEASON}:${[...new Set(list)].join(",")}` }, { merge: true });
  return true;
};

// partita lasciata a metà (o null per toglierla)
export const saveGame = async (me, snap) => {
  const k = key(me);
  if (!k) return false;
  await setDoc(myDoc(k), { name: String(me).trim(), owner: k, save: snap ? JSON.stringify({ ...snap, season: SEASON }) : "", saveAt: snap ? Date.now() : 0 }, { merge: true });
  return true;
};
