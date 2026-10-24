// FOTO DEI RAPPORTI TENUTE A PARTE.
// Prima le foto stavano dentro il rapporto: ogni apertura dell'app scaricava anche tutte le foto
// di tutti gli interventi (MB inutili, lento con poco segnale). Ora stanno nella raccolta
// "log_photos" (un documento per rapporto, stesso id) e si scaricano solo quando servono.
// Nel rapporto restano photoCount (quante) e photoRev (versione, per sapere se la copia è vecchia).
// Dentro l'app log.photos resta una lista lunga quanto le foto: per i rapporti nuovi contiene
// dei segnaposto ("mora-foto:id:rev:n") che diventano foto vere con resolvePhotos/withPhotos.
// I rapporti vecchi con le foto dentro continuano a funzionare come prima.
import { doc, collection, getDocFromCache, writeBatch, deleteDoc } from "firebase/firestore";
import { getDocFromServer } from "./metered";
import { db, appId } from "./firebase";
import { logsChanged } from "./logsWindow";

export const PHOTO_COLL = "log_photos";
const REF = "mora-foto:";
const photoDoc = (id) => doc(db, "artifacts", appId, "public", "data", PHOTO_COLL, id);
const logsColl = () => collection(db, "artifacts", appId, "public", "data", "maintenance_logs");

export const isPhotoRef = (p) => typeof p === "string" && p.startsWith(REF);
const parse = (p) => {
  const [id, rev, i] = p.slice(REF.length).split(":");
  return { id, rev: Number(rev) || 0, i: Number(i) || 0 };
};

// rapporto letto dal database → log.photos con i segnaposto (se le foto sono a parte)
export const withPhotoRefs = (log) => {
  const n = Number(log.photoCount) || 0;
  if (!n || (Array.isArray(log.photos) && log.photos.length)) return log;
  const rev = Number(log.photoRev) || 0;
  return { ...log, photos: Array.from({ length: n }, (_, i) => `${REF}${log.id}:${rev}:${i}`) };
};

// foto di un rapporto: prima la copia sul telefono (se è quella giusta), poi il server
const mem = new Map();
const fetchPhotos = async (id, rev) => {
  try {
    const c = await getDocFromCache(photoDoc(id));
    const d = c.exists() ? c.data() : null;
    if (d && (Number(d.rev) || 0) === rev) return d.photos || [];
  } catch (e) {
    // non c'è ancora sul telefono
  }
  try {
    const s = await getDocFromServer(photoDoc(id));
    return s.exists() ? s.data().photos || [] : [];
  } catch (e) {
    // senza rete: uso la copia che c'è, anche se non è l'ultima
    const c = await getDocFromCache(photoDoc(id));
    return c.exists() ? c.data().photos || [] : [];
  }
};
const photosOf = (id, rev) => {
  const k = `${id}:${rev}`;
  if (!mem.has(k)) {
    mem.set(
      k,
      fetchPhotos(id, rev).catch((e) => {
        mem.delete(k);
        throw e;
      })
    );
  }
  return mem.get(k);
};

// lista di foto (anche con segnaposto) → foto vere
export const resolvePhotos = async (list) => {
  if (!Array.isArray(list) || !list.some(isPhotoRef)) return list || [];
  const out = [];
  for (const p of list) {
    if (!isPhotoRef(p)) {
      out.push(p);
      continue;
    }
    const { id, rev, i } = parse(p);
    const all = await photosOf(id, rev);
    if (all[i]) out.push(all[i]);
  }
  return out;
};
export const withPhotos = async (log) =>
  log && Array.isArray(log.photos) && log.photos.some(isPhotoRef) ? { ...log, photos: await resolvePhotos(log.photos) } : log;
// per stampare: se le foto non si scaricano (senza rete) stampo il rapporto senza foto
export const withPhotosOr = (log) => withPhotos(log).catch(() => log);

// SALVATAGGIO: nel batch metto le foto a parte; restituisce i campi da scrivere nel rapporto
export const putPhotos = (batch, logId, photos) => {
  const list = (photos || []).filter((p) => typeof p === "string" && !isPhotoRef(p));
  const rev = Date.now();
  if (!list.length) {
    batch.delete(photoDoc(logId));
    return { photos: [], photoCount: 0, photoRev: rev };
  }
  batch.set(photoDoc(logId), { photos: list, rev, updatedAt: rev });
  return { photos: [], photoCount: list.length, photoRev: rev };
};
export const newLogId = () => doc(logsColl()).id;
// rapporto cancellato: tolgo anche le sue foto
export const removeLogPhotos = (logId) => deleteDoc(photoDoc(logId)).catch(() => {});

// SPOSTAMENTO DEI RAPPORTI VECCHI: quelli con le foto dentro, pochi alla volta.
// Foto e rapporto cambiano insieme (o tutto o niente), quindi non si perde nulla.
export const movePhotosOut = async (rawLogs, max = 5) => {
  const todo = rawLogs.filter((l) => Array.isArray(l.photos) && l.photos.some((p) => typeof p === "string" && p.startsWith("data:"))).slice(0, max);
  for (const l of todo) {
    const batch = writeBatch(db);
    const fields = putPhotos(batch, l.id, l.photos);
    batch.update(doc(logsColl(), l.id), fields);
    await batch.commit();
  }
  if (todo.length) logsChanged();
  return todo.length;
};

// in sottofondo: tengo sul telefono le foto dei rapporti recenti, così si vedono anche senza rete
export const prefetchRecent = async (logs, days = 45) => {
  const since = Date.now() - days * 864e5;
  const recent = logs.filter((l) => {
    if (!(Number(l.photoCount) > 0)) return false;
    const t = l.createdAt && l.createdAt.seconds ? l.createdAt.seconds * 1000 : Number(l.photoRev) || 0;
    return t >= since;
  });
  for (const l of recent.slice(0, 60)) {
    try {
      await photosOf(l.id, Number(l.photoRev) || 0);
    } catch (e) {
      return;
    }
  }
};
