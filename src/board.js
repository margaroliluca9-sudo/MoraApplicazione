// BACHECA TRA TECNICI: messaggi (testo, foto, "importante" in alto) e notifiche sui telefoni.
// Messaggi in  .../public/data/board_messages   (spariscono dopo 30 giorni, tranne quelli fissati)
// Telefoni iscritti alle notifiche in  .../public/data/push_subscriptions
// Le notifiche le spedisce il "postino" /api/notify (cartella api/, gira su Vercel).
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, appId } from "./firebase";

export const BOARD_DAYS = 30;
export const VAPID_PUBLIC_KEY =
  "BMTDaawgn4Me2RivufzqaFUb5ZWia54xy8Ea43IX2Cw94bDkrknJrPZ40dH3UQLa9v9kOE5xbprUmcFfjwYrgUw";

export const boardRef = (name) => collection(db, "artifacts", appId, "public", "data", name);
export const boardDoc = (name, id) => doc(db, "artifacts", appId, "public", "data", name, id);

const same = (a, b) =>
  String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();

// ora del messaggio (appena scritto, prima che il server metta l'ora: adesso)
export const msgTime = (m) =>
  m && m.createdAt && m.createdAt.seconds ? m.createdAt.seconds * 1000 : Date.now();

export const isExpired = (m, now = Date.now()) =>
  !m.pinned &&
  !!(m.createdAt && m.createdAt.seconds) &&
  now - m.createdAt.seconds * 1000 > BOARD_DAYS * 86400000;

// prima i messaggi importanti, poi dal più recente
export const sortBoard = (msgs) =>
  [...(msgs || [])].sort(
    (a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || msgTime(b) - msgTime(a)
  );

// --- messaggi letti (su questo telefono) ---
const READ_KEY = "mora_board_read";
export const getLastRead = () => {
  try {
    return Number(localStorage.getItem(READ_KEY)) || 0;
  } catch (e) {
    return 0;
  }
};
export const markRead = (t = Date.now()) => {
  try {
    localStorage.setItem(READ_KEY, String(t));
  } catch (e) {
    // memoria del telefono non disponibile: pazienza
  }
  window.dispatchEvent(new Event("mora-board-read"));
};
export const unreadCount = (msgs, me, lastRead = getLastRead()) =>
  (msgs || []).filter((m) => !isExpired(m) && msgTime(m) > lastRead && !same(m.author, me))
    .length;

// "oggi 14:20", "ieri 9:05", "18/10 14:20"
export const formatWhen = (m, now = new Date()) => {
  const d = new Date(msgTime(m));
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  if (diff === 0) return `oggi ${hm}`;
  if (diff === 1) return `ieri ${hm}`;
  return `${d.getDate()}/${d.getMonth() + 1} ${hm}`;
};

// =====================================================================
// NOTIFICHE
// =====================================================================
export const pushSupported = () =>
  typeof window !== "undefined" &&
  !!navigator.serviceWorker &&
  !!window.PushManager &&
  !!window.Notification;
// permesso notifiche ("default" | "granted" | "denied"), senza errori sui browser che non le hanno
const permission = () => (window.Notification && window.Notification.permission) || "default";
export const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () =>
  (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
  navigator.standalone === true;

const keyBytes = (b64) => {
  const s = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(s);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
// nome del documento per un telefono (dall'indirizzo di notifica)
export const subId = (endpoint) => {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const s = String(endpoint || "");
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
  }
  return "s" + h1.toString(36) + h2.toString(36) + s.length.toString(36);
};

// stato delle notifiche su questo telefono:
// "unsupported" | "install" (iPhone: va installata) | "denied" | "off" | "on"
export const getPushState = async () => {
  if (!pushSupported()) return isIos() && !isStandalone() ? "install" : "unsupported";
  if (permission() === "denied") return "denied";
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    return sub && permission() === "granted" ? "on" : "off";
  } catch (e) {
    return "off";
  }
};

const saveSubscription = async (sub, techName) => {
  const j = sub.toJSON();
  await setDoc(boardDoc("push_subscriptions", subId(j.endpoint)), {
    endpoint: j.endpoint,
    keys: j.keys,
    technician: techName || "",
    updatedAt: serverTimestamp(),
    device: String(navigator.userAgent || "").slice(0, 120),
  });
  return j;
};

// da chiamare DENTRO il tocco sul pulsante (iPhone lo pretende)
export const enablePush = async (techName) => {
  if (!pushSupported()) throw new Error("Questo telefono non supporta le notifiche.");
  const granted = await window.Notification.requestPermission();
  if (granted !== "granted")
    throw new Error("Notifiche non permesse: riattivale dalle impostazioni del telefono.");
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub)
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
    });
  return saveSubscription(sub, techName);
};

export const disablePush = async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (!sub) return;
  await deleteDoc(boardDoc("push_subscriptions", subId(sub.endpoint))).catch(() => {});
  await sub.unsubscribe();
};

// all'avvio: se le notifiche sono già permesse, tengo aggiornata l'iscrizione
export const refreshPush = async (techName) => {
  if (!pushSupported() || permission() !== "granted") return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    const sub = await reg.pushManager.getSubscription();
    return sub ? await saveSubscription(sub, techName) : null;
  } catch (e) {
    return null;
  }
};

export const myEndpoint = async () => {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    return sub ? sub.endpoint : "";
  } catch (e) {
    return "";
  }
};

// testo della notifica
export const notificationFor = (m) => ({
  title: `${m.pinned ? "IMPORTANTE · " : ""}Bacheca · ${m.author || "Tecnico"}`,
  text: m.text ? m.text + (m.photo ? " (foto)" : "") : m.photo ? "Ha mandato una foto" : "",
  tag: m.id || "bacheca",
});

// manda la notifica a tutti i telefoni iscritti, tranne quelli di chi ha scritto
export const notifyBoard = async (message) => {
  const mine = pushSupported() ? await myEndpoint() : "";
  const snap = await getDocs(boardRef("push_subscriptions"));
  const subs = snap.docs
    .map((d) => d.data())
    .filter((s) => s.endpoint && s.endpoint !== mine && !same(s.technician, message.author));
  if (!subs.length) return { sent: 0, gone: [] };
  const r = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...notificationFor(message),
      subscriptions: subs.map((s) => ({ endpoint: s.endpoint, keys: s.keys })),
    }),
  });
  const res = await r.json().catch(() => ({}));
  // telefoni che non sono più iscritti: li tolgo dall'elenco
  (res.gone || []).forEach((e) =>
    deleteDoc(boardDoc("push_subscriptions", subId(e))).catch(() => {})
  );
  return res;
};
