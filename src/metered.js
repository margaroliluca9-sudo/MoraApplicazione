// CONTATORE DELLE LETTURE DEL DATABASE (Firestore conta e fa pagare le letture: gratis 50.000 al giorno).
// Tutte le letture dell'app passano da qui: si contano quelle arrivate dal server (non quelle dalla
// copia sul telefono), divise per raccolta. Ogni 10 minuti il telefono scrive il suo totale del giorno
// in read_stats (un solo documento per telefono al giorno) e l'admin vede la somma in System.
import {
  onSnapshot as fsOnSnapshot,
  getDocs as fsGetDocs,
  getDoc as fsGetDoc,
  getDocsFromServer as fsGetDocsFromServer,
  getDocFromServer as fsGetDocFromServer,
  doc,
  collection,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, appId } from "./firebase";

export const READS_COLL = "read_stats";
export const FREE_READS = 50000;
const KEY = "mora_reads_v1";
const DEV = "mora_device_id";

const today = () => {
  const d = new Date();
  // il conteggio di Firestore riparte a mezzanotte ora del Pacifico (le 9 da noi): uso la stessa giornata
  const pac = new Date(d.getTime() - 9 * 3600 * 1000);
  return `${pac.getFullYear()}-${String(pac.getMonth() + 1).padStart(2, "0")}-${String(pac.getDate()).padStart(2, "0")}`;
};
const load = () => {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || "null");
    if (x && x.date === today()) return x;
  } catch (e) {
    // niente
  }
  return { date: today(), total: 0, by: {} };
};
let state = load();
let dirty = false;
let who = "";
export const setReadsOwner = (name) => {
  who = String(name || "");
};
const deviceId = () => {
  try {
    let id = localStorage.getItem(DEV);
    if (!id) {
      id = Math.random().toString(36).slice(2, 10);
      localStorage.setItem(DEV, id);
    }
    return id;
  } catch (e) {
    return "x";
  }
};

// nome della raccolta da un riferimento (documento o ricerca)
export const collOf = (ref) => {
  try {
    let p = ref && ref.path;
    if (!p && ref && ref._query && ref._query.path) {
      const qp = ref._query.path;
      p = typeof qp.canonicalString === "function" ? qp.canonicalString() : typeof qp.toArray === "function" ? qp.toArray().join("/") : String(qp);
    }
    if (!p) return "altro";
    const seg = String(p).split("/").filter(Boolean);
    // documento: .../raccolta/id ; raccolta: .../raccolta
    const isDoc = ref && (ref.type === "document" || ref.kind === "doc");
    return (isDoc ? seg[seg.length - 2] : seg[seg.length - 1]) || "altro";
  } catch (e) {
    return "altro";
  }
};

export const countReads = (coll, n) => {
  if (!(n > 0)) return;
  if (state.date !== today()) state = { date: today(), total: 0, by: {} };
  state.total += n;
  state.by[coll] = (state.by[coll] || 0) + n;
  dirty = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // niente
  }
};
export const readsToday = () => (state.date === today() ? state : { date: today(), total: 0, by: {} });

const fromServer = (snap) => !(snap && snap.metadata && snap.metadata.fromCache);
// letture «pagate» di una risposta: i documenti arrivati (una ricerca vuota conta 1)
const billed = (snap, first) => {
  if (!snap) return 0;
  if (typeof snap.exists === "function" && !snap.docs) return 1;
  let n = 0;
  try {
    n = typeof snap.docChanges === "function" ? snap.docChanges().length : snap.size || 0;
  } catch (e) {
    n = snap.size || 0;
  }
  return first ? Math.max(1, n) : n;
};

export const onSnapshot = (ref, ...args) => {
  const coll = collOf(ref);
  let first = true;
  const idx = args.findIndex((a) => typeof a === "function");
  if (idx < 0) return fsOnSnapshot(ref, ...args);
  const next = args[idx];
  const wrapped = (snap) => {
    if (fromServer(snap)) {
      countReads(coll, billed(snap, first));
      first = false;
    }
    next(snap);
  };
  const a = args.slice();
  a[idx] = wrapped;
  return fsOnSnapshot(ref, ...a);
};
const counted = (fn) => (ref, ...rest) =>
  fn(ref, ...rest).then((snap) => {
    if (fromServer(snap)) countReads(collOf(ref), billed(snap, true));
    return snap;
  });
export const getDocs = counted(fsGetDocs);
export const getDoc = counted(fsGetDoc);
export const getDocsFromServer = counted(fsGetDocsFromServer);
export const getDocFromServer = counted(fsGetDocFromServer);

// ogni 10 minuti (e quando l'app va in sottofondo) salvo il totale del giorno di questo telefono
export const flushReads = () => {
  if (!dirty || !state.total) return Promise.resolve(false);
  dirty = false;
  const s = readsToday();
  const id = `${s.date}_${deviceId()}`;
  return setDoc(doc(collection(db, "artifacts", appId, "public", "data", READS_COLL), id), {
    date: s.date,
    who,
    device: deviceId(),
    total: s.total,
    by: s.by,
    updatedAt: serverTimestamp(),
  }).then(
    () => true,
    () => {
      dirty = true;
      return false;
    }
  );
};
let started = false;
export const startReadsMeter = () => {
  if (started) return;
  started = true;
  setInterval(flushReads, 10 * 60 * 1000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushReads();
  });
};
