// CESTINO DEI RAPPORTI: un rapporto eliminato non sparisce subito.
// Va in "deleted_logs" (stesso id) con chi l'ha eliminato e quando; le foto restano dove sono.
// Dall'Area admin → Cestino si recupera con un tocco (torna uguale, foto comprese) per 30 giorni,
// poi il server (api/reminders.js) lo cancella per sempre insieme alle foto.
import { collection, doc, limit, orderBy, query, serverTimestamp, writeBatch } from "firebase/firestore";
import { getDoc, getDocs } from "./metered";
import { db, appId } from "./firebase";
import { logsChanged } from "./logsWindow";
import { removeLogPhotos, isPhotoRef } from "./logPhotos";

export const TRASH_COLL = "deleted_logs";
export const TRASH_DAYS = 30;
const base = (c) => collection(db, "artifacts", appId, "public", "data", c);
const logRef = (id) => doc(base("maintenance_logs"), id);
const trashRef = (id) => doc(base(TRASH_COLL), id);

// campi aggiunti dall'app quando legge (non vanno salvati)
const clean = (o) => {
  const x = { ...o };
  delete x.id;
  if (Number(x.photoCount) > 0 && Array.isArray(x.photos) && x.photos.every(isPhotoRef)) delete x.photos;
  return x;
};

// elimina = sposta nel cestino. «log» è il rapporto già in memoria (serve se manca la rete)
export const trashLog = async (id, who = "", log = null) => {
  let data = null;
  try {
    const s = await getDoc(logRef(id));
    if (s.exists()) data = s.data();
  } catch (e) {
    // senza rete: uso quello che ho
  }
  if (!data && log) data = clean(log);
  const b = writeBatch(db);
  if (data) b.set(trashRef(id), { ...data, deletedAt: serverTimestamp(), deletedAtMs: Date.now(), deletedBy: who || "" });
  b.delete(logRef(id));
  await b.commit();
  if (!data) removeLogPhotos(id); // niente da conservare
  logsChanged();
};

export const listTrash = async () => {
  const snap = await getDocs(query(base(TRASH_COLL), orderBy("deletedAt", "desc"), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// recupera: torna tra gli interventi com'era
export const restoreLog = async (row) => {
  const data = { ...row };
  ["id", "deletedAt", "deletedAtMs", "deletedBy"].forEach((k) => delete data[k]);
  const b = writeBatch(db);
  b.set(logRef(row.id), data);
  b.delete(trashRef(row.id));
  await b.commit();
  logsChanged();
};

// elimina per sempre (anche le foto)
export const purgeLog = async (id) => {
  const b = writeBatch(db);
  b.delete(trashRef(id));
  await b.commit();
  removeLogPhotos(id);
};

// giorni che mancano alla cancellazione definitiva
export const daysLeft = (row, now = Date.now()) => {
  const t = row.deletedAt && row.deletedAt.seconds ? row.deletedAt.seconds * 1000 : Number(row.deletedAtMs) || now;
  return Math.max(0, Math.ceil((t + TRASH_DAYS * 864e5 - now) / 864e5));
};
