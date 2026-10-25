// INTERVENTI, CLIENTI E GRU SENZA RISCARICARE TUTTO (per stare nelle 50.000 letture gratis al giorno).
// Prima ogni apertura dell'app rileggeva dal server tutti gli interventi, le gru e i clienti (~1.400 letture).
// Adesso:
//  1. si parte dalla copia sul telefono (gratis, anche senza rete);
//  2. ogni tanto (clienti ogni giorno, gru e interventi ogni settimana) una rilettura completa dal server,
//     per sicurezza;
//  3. in diretta si guarda solo «changes» (i biglietti lasciati da tracked.js a ogni scrittura) e si
//     rilegge solo il documento cambiato: una lettura per modifica invece di 1.400 per apertura.
// Gli interventi degli ultimi 3 giorni restano anche in diretta (rapporti nuovi subito, e quelli non
// ancora inviati quando manca la rete).
import { collection, doc, getDocsFromCache, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { db, appId } from "./firebase";
import { getDocsFromServer, getDocFromServer } from "./metered";
import { CHANGES, deviceKey } from "./tracked";

const DAY = 864e5;
export const FULL_EVERY = { customers: DAY, machines: 7 * DAY, maintenance_logs: 7 * DAY };
const OVERLAP = 15 * 60 * 1000; // margine per gli orologi dei telefoni
const coll = (c) => collection(db, "artifacts", appId, "public", "data", c);
const rowsOf = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

const KEY = "mora_sync_v1";
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch (e) {
    return {};
  }
};
const save = (s) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    // niente
  }
};
export const syncState = () => load();

export const fromCache = async (c) => {
  try {
    return rowsOf(await getDocsFromCache(coll(c)));
  } catch (e) {
    return null;
  }
};

// rilettura completa dal server se è ora (o se il telefono non ha ancora niente)
const fullIfDue = async (c, cached, onRows, force) => {
  const s = load();
  const last = (s.full && s.full[c]) || 0;
  if (!force && cached && cached.length && Date.now() - last < FULL_EVERY[c]) return false;
  const started = Date.now();
  const rows = rowsOf(await getDocsFromServer(coll(c)));
  onRows(rows, { server: true });
  const n = load();
  n.full = { ...(n.full || {}), [c]: started };
  // i biglietti più vecchi della rilettura non servono più
  n.cursor = Math.max(n.cursor || 0, Math.min(...Object.values(n.full)));
  save(n);
  return true;
};

// Avvia la sincronizzazione delle raccolte. handlers = { customers: (rows, meta) => …, … }
// Restituisce la funzione per fermarla.
export const startSync = (handlers, { onServer, onError } = {}) => {
  const names = Object.keys(handlers);
  let stopped = false;
  const busy = {};
  const reload = async (c) => {
    if (stopped) return;
    const rows = await fromCache(c);
    if (rows && !stopped) handlers[c](rows, { server: false });
  };

  // 1-2: copia sul telefono, poi rilettura completa se è ora
  const boot = async () => {
    for (const c of names) {
      const cached = await fromCache(c);
      if (stopped) return;
      if (cached && cached.length) handlers[c](cached, { server: false });
      try {
        if (await fullIfDue(c, cached, (r, m) => !stopped && handlers[c](r, m))) onServer && onServer();
      } catch (e) {
        if (onError) onError(e);
        if (!cached || !cached.length) handlers[c]([], { server: false });
      }
    }
    listen();
  };

  // 3: i biglietti in changes dopo l'ultimo visto
  let unsub = () => {};
  const listen = () => {
    if (stopped) return;
    const s = load();
    const since = Math.max(0, (s.cursor || Date.now()) - OVERLAP);
    const seen = new Set();
    unsub = onSnapshot(
      query(coll(CHANGES), where("at", ">", Timestamp.fromMillis(since))),
      async (snap) => {
        if (snap.metadata && snap.metadata.fromCache === false && onServer) onServer();
        const todo = {};
        let maxAt = 0;
        snap.docChanges().forEach((ch) => {
          if (ch.type === "removed") return;
          const d = ch.doc;
          if (seen.has(d.id) || d.metadata.hasPendingWrites) return;
          const x = d.data();
          const at = x.at && x.at.toMillis ? x.at.toMillis() : 0;
          if (!at) return;
          seen.add(d.id);
          maxAt = Math.max(maxAt, at);
          if (!handlers[x.c] || x.dev === deviceKey()) return; // scritto da questo telefono: c'è già
          const t = (todo[x.c] = todo[x.c] || new Set());
          [...(x.ids || []), ...(x.dels || [])].forEach((id) => t.add(id));
        });
        for (const [c, ids] of Object.entries(todo)) {
          for (const id of ids) {
            if (stopped) return;
            try {
              await getDocFromServer(doc(coll(c), id)); // aggiorna la copia sul telefono (anche se cancellato)
            } catch (e) {
              // senza rete: la prossima volta
            }
          }
          await reload(c);
        }
        if (maxAt) {
          const n = load();
          n.cursor = Math.max(n.cursor || 0, maxAt);
          save(n);
        }
      },
      (e) => onError && onError(e)
    );
  };

  // scritture fatte da questo telefono (tracked.js): rileggo dalla copia
  const onLocal = (e) => {
    (e.detail || []).forEach((c) => {
      if (handlers[c] && !busy[c]) {
        busy[c] = true;
        reload(c).finally(() => {
          busy[c] = false;
        });
      }
    });
  };
  window.addEventListener("mora-data-changed", onLocal);
  boot();
  return () => {
    stopped = true;
    unsub();
    window.removeEventListener("mora-data-changed", onLocal);
  };
};

// interventi recenti in diretta (nuovi rapporti e quelli in attesa di rete)
export const recentLogsQuery = (days = 3) =>
  query(coll("maintenance_logs"), where("createdAt", ">=", Timestamp.fromMillis(Date.now() - days * DAY)));

// rilettura completa subito (es. dal tasto «Aggiorna» o dopo un ripristino)
export const forceFull = async (c, onRows) => fullIfDue(c, null, onRows, true);
