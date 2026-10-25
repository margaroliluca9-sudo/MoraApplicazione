// SCRITTURE «SEGNATE» PER RISPARMIARE LETTURE (vedi sync.js).
// Interventi, clienti e gru non si riscaricano più tutti a ogni apertura dell'app: il telefono tiene la sua
// copia e chiede al server solo quello che è cambiato. Per saperlo, ogni scrittura su queste tre raccolte
// lascia anche un «biglietto» in changes: { c: raccolta, ids: [...], dels: [...], at, dev }.
// Questi sono gli stessi setDoc / updateDoc / addDoc / deleteDoc / writeBatch di Firebase: per le altre
// raccolte non cambia niente.
import {
  setDoc as fsSetDoc,
  addDoc as fsAddDoc,
  updateDoc as fsUpdateDoc,
  deleteDoc as fsDeleteDoc,
  writeBatch as fsWriteBatch,
  collection,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db, appId } from "./firebase";

export const TRACKED = ["maintenance_logs", "customers", "machines"];
export const CHANGES = "changes";

const DEV_KEY = "mora_device_id";
export const deviceKey = () => {
  try {
    let d = localStorage.getItem(DEV_KEY);
    if (!d) {
      d = Math.random().toString(36).slice(2, 10);
      localStorage.setItem(DEV_KEY, d);
    }
    return d;
  } catch (e) {
    return "x";
  }
};

// { c, id } se il documento è di una raccolta segnata
const infoOf = (ref) => {
  const seg = String((ref && ref.path) || "").split("/");
  const c = seg[seg.length - 2];
  return TRACKED.includes(c) ? { c, id: seg[seg.length - 1] } : null;
};

const changesRef = () => doc(collection(db, "artifacts", appId, "public", "data", CHANGES));

// un biglietto per raccolta: chi è cambiato e chi è stato cancellato
const notes = (ops) => {
  const by = {};
  ops.forEach(({ c, id, del }) => {
    const x = (by[c] = by[c] || { ids: new Set(), dels: new Set() });
    if (del) {
      x.dels.add(id);
      x.ids.delete(id);
    } else {
      x.ids.add(id);
      x.dels.delete(id);
    }
  });
  return Object.entries(by).map(([c, x]) => ({ c, ids: [...x.ids], dels: [...x.dels], at: serverTimestamp(), dev: deviceKey() }));
};

// avviso dentro l'app: rileggi dalla copia sul telefono (la scrittura c'è già, anche senza rete)
const announce = (ops) => {
  const cs = [...new Set(ops.map((o) => o.c))];
  if (!cs.length) return;
  setTimeout(() => {
    try {
      window.dispatchEvent(new CustomEvent("mora-data-changed", { detail: cs }));
    } catch (e) {
      // niente
    }
  }, 30);
};

export const writeBatch = (database = db) => {
  const b = fsWriteBatch(database);
  const ops = [];
  const w = {
    set(ref, data, opts) {
      const i = infoOf(ref);
      if (i) ops.push(i);
      if (opts) b.set(ref, data, opts);
      else b.set(ref, data);
      return w;
    },
    update(ref, ...args) {
      const i = infoOf(ref);
      if (i) ops.push(i);
      b.update(ref, ...args);
      return w;
    },
    delete(ref) {
      const i = infoOf(ref);
      if (i) ops.push({ ...i, del: true });
      b.delete(ref);
      return w;
    },
    commit() {
      notes(ops).forEach((n) => b.set(changesRef(), n));
      const p = b.commit();
      announce(ops);
      return p;
    },
  };
  return w;
};

const single = (ref, del, apply) => {
  const i = infoOf(ref);
  if (!i) return null;
  const b = writeBatch();
  apply(b);
  return b.commit();
};

export const setDoc = (ref, data, opts) => single(ref, false, (b) => b.set(ref, data, opts)) || (opts ? fsSetDoc(ref, data, opts) : fsSetDoc(ref, data));
export const updateDoc = (ref, ...args) => single(ref, false, (b) => b.update(ref, ...args)) || fsUpdateDoc(ref, ...args);
export const deleteDoc = (ref) => single(ref, true, (b) => b.delete(ref)) || fsDeleteDoc(ref);
export const addDoc = async (collRef, data) => {
  const seg = String((collRef && collRef.path) || "").split("/");
  if (!TRACKED.includes(seg[seg.length - 1])) return fsAddDoc(collRef, data);
  const r = doc(collRef);
  await setDoc(r, data);
  return r;
};
