// CHAT TRA TECNICI: gruppo con tutti + chat private, foto, messaggio fissato, "Letto da…",
// notifiche sui telefoni.
//  .../public/data/chat_messages       messaggi { conv, text, author, authorKey, photoId, pinned, createdAt, at }
//  .../public/data/chat_photos         foto dei messaggi (caricate solo quando servono)
//  .../public/data/chat_audio          vocali { conv, data (audio in base64), mime, dur } (caricati quando li ascolti)
//  .../public/data/chat_reads          fin dove ha letto ognuno { conv, user, at }
//  .../public/data/push_subscriptions  telefoni iscritti alle notifiche
// Conversazioni: "group" (tutti) oppure "dm:anna|marco" (nomi in minuscolo, in ordine).
// Le notifiche le spedisce il "postino" /api/notify (cartella api/, gira su Vercel).
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { addDoc, setDoc, deleteDoc, updateDoc } from "./tracked";
import { getDocs } from "./metered";
import { db, appId } from "./firebase";

export const VAPID_PUBLIC_KEY =
  "BMTDaawgn4Me2RivufzqaFUb5ZWia54xy8Ea43IX2Cw94bDkrknJrPZ40dH3UQLa9v9kOE5xbprUmcFfjwYrgUw";

export const chatRef = (name) => collection(db, "artifacts", appId, "public", "data", name);
export const chatDoc = (name, id) => doc(db, "artifacts", appId, "public", "data", name, id);

// =====================================================================
// CONVERSAZIONI
// =====================================================================
export const GROUP = "group";
export const key = (name) => String(name || "").trim().toLowerCase();
export const dmId = (a, b) => "dm:" + [key(a), key(b)].sort().join("|");
export const dmMembers = (conv) => (String(conv).startsWith("dm:") ? conv.slice(3).split("|") : []);
export const canSee = (conv, me) => conv === GROUP || dmMembers(conv).includes(key(me));
export const otherOf = (conv, me) => dmMembers(conv).find((m) => m !== key(me)) || key(me);

// nome come scritto nell'elenco tecnici ("marco" -> "Marco")
export const displayName = (k, technicians = []) => {
  const t = technicians.find((x) => key(x.name) === key(k));
  if (t) return t.name;
  const s = String(k || "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const convTitle = (conv, me, technicians) =>
  conv === GROUP ? "Gruppo tecnici" : displayName(otherOf(conv, me), technicians);

// ora del messaggio (appena scritto, prima dell'ora del server: quella del telefono)
export const msgTime = (m) =>
  m && m.createdAt && m.createdAt.seconds ? m.createdAt.seconds * 1000 : (m && m.at) || Date.now();

export const messagesOf = (msgs, conv) =>
  (msgs || []).filter((m) => m.conv === conv).sort((a, b) => msgTime(a) - msgTime(b));

// --- letture: fin dove ha letto ognuno, per conversazione ---
export const readId = (conv, user) => `${conv}__${key(user)}`.replace(/\//g, "_");
export const lastReadOf = (reads, conv, user) => {
  const r = (reads || []).find((x) => x.conv === conv && x.user === key(user));
  return r ? r.at || 0 : 0;
};
export const unreadIn = (msgs, reads, conv, me) => {
  const since = lastReadOf(reads, conv, me);
  return (msgs || []).filter(
    (m) => m.conv === conv && m.authorKey !== key(me) && msgTime(m) > since
  ).length;
};
// numero totale da leggere (gruppo + private dove ci sono io)
export const unreadTotal = (msgs, reads, me) => {
  const convs = new Set((msgs || []).map((m) => m.conv).filter((c) => canSee(c, me)));
  let n = 0;
  convs.forEach((c) => (n += unreadIn(msgs, reads, c, me)));
  return n;
};
// chi ha letto un mio messaggio (escluso chi l'ha scritto)
export const readersOf = (m, reads) =>
  (reads || [])
    .filter((r) => r.conv === m.conv && r.user !== m.authorKey && (r.at || 0) >= msgTime(m))
    .map((r) => r.user);

export const markConvRead = async (conv, me, reads, msgs) => {
  if (!me) return;
  const newest = messagesOf(msgs, conv).reduce((t, m) => Math.max(t, msgTime(m)), 0);
  if (!newest || lastReadOf(reads, conv, me) >= newest) return;
  await setDoc(chatDoc("chat_reads", readId(conv, me)), {
    conv,
    user: key(me),
    at: Math.max(newest, Date.now()),
  });
};

// "14:20"; separatori "Oggi", "Ieri", "18/10/2026"
export const timeOf = (m) => {
  const d = new Date(msgTime(m));
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export const dayLabel = (m, now = new Date()) => {
  const d = new Date(msgTime(m));
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  if (diff === 0) return "Oggi";
  if (diff === 1) return "Ieri";
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};
// "oggi 14:20" / "ieri" / "18/10" (elenco conversazioni)
export const shortWhen = (m, now = new Date()) => {
  const l = dayLabel(m, now);
  if (l === "Oggi") return timeOf(m);
  if (l === "Ieri") return "ieri";
  const d = new Date(msgTime(m));
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

// invio di un messaggio (la foto e il vocale vanno in un documento a parte)
export const sendMessage = async ({ conv, text, photo, audio, author, via }) => {
  let photoId = null;
  if (photo) {
    const p = await addDoc(chatRef("chat_photos"), { conv, data: photo, createdAt: serverTimestamp() });
    photoId = p.id;
  }
  let audioId = null;
  if (audio && audio.data) {
    const a = await addDoc(chatRef("chat_audio"), { conv, data: audio.data, mime: audio.mime || "", dur: Math.round(audio.dur || 0), createdAt: serverTimestamp() });
    audioId = a.id;
  }
  const data = {
    conv,
    text: String(text || "").trim(),
    author: author || "Tecnico",
    authorKey: key(author),
    photoId,
    pinned: false,
    createdAt: serverTimestamp(),
    at: Date.now(),
  };
  if (audioId) {
    data.audioId = audioId;
    data.audioDur = Math.round(audio.dur || 0);
  }
  if (via) data.via = via; // "online" = scritto dal menu Tecnici online
  const ref = await addDoc(chatRef("chat_messages"), data);
  return { ...data, id: ref.id };
};

// modifica del testo di un mio messaggio (resta scritto «modificato»)
export const editMessage = (m, text) => updateDoc(chatDoc("chat_messages", m.id), { text: String(text || "").trim(), editedAt: Date.now() });

// eliminazione: messaggio + foto + vocale
export const removeMessage = async (m) => {
  await deleteDoc(chatDoc("chat_messages", m.id));
  if (m.photoId) deleteDoc(chatDoc("chat_photos", m.photoId)).catch(() => {});
  if (m.audioId) deleteDoc(chatDoc("chat_audio", m.audioId)).catch(() => {});
};

// «0:07», «1:25»
export const durLabel = (s) => {
  const n = Math.max(0, Math.round(Number(s) || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
};
// anteprima nell'elenco e nelle notifiche
export const previewOf = (m) => (m.text ? m.text : m.audioId ? `🎤 Vocale ${durLabel(m.audioDur)}` : m.photoId ? "Foto" : "");

// =====================================================================
// VOCALI: registrazione col microfono del telefono. Prima scelta audio/mp4 (si sente su iPhone e Android),
// altrimenti quello che il telefono sa fare. Al massimo 2 minuti, qualità «voce» (pesa poco).
// =====================================================================
export const VOICE_MAX = 120;
export const voiceSupported = () => typeof window !== "undefined" && !!window.MediaRecorder && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
const pickMime = () => {
  const list = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  try {
    return list.find((t) => window.MediaRecorder.isTypeSupported && window.MediaRecorder.isTypeSupported(t)) || "";
  } catch (e) {
    return "";
  }
};
const toDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
// avvia la registrazione; restituisce { stop(): Promise<{data,mime,dur}>, cancel() }
export const startVoice = async () => {
  if (!voiceSupported()) throw new Error("Questo telefono non può registrare vocali dall'app.");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = pickMime();
  const rec = new window.MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 });
  const chunks = [];
  const t0 = Date.now();
  rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
  const done = new Promise((resolve) => {
    rec.onstop = () => resolve();
  });
  rec.start(1000);
  const close = () => stream.getTracks().forEach((t) => t.stop());
  return {
    startedAt: t0,
    stop: async () => {
      if (rec.state !== "inactive") rec.stop();
      await done;
      close();
      const type = rec.mimeType || mime || "audio/mp4";
      const blob = new Blob(chunks, { type });
      if (blob.size > 700000) throw new Error("Vocale troppo lungo: massimo 2 minuti.");
      return { data: await toDataUrl(blob), mime: type, dur: Math.min(VOICE_MAX, (Date.now() - t0) / 1000) };
    },
    cancel: () => {
      try {
        if (rec.state !== "inactive") rec.stop();
      } catch (e) {
        // niente
      }
      close();
    },
  };
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
  // quali notifiche vuole (La mia area → Impostazioni): restano anche quando l'iscrizione si aggiorna
  let kinds = {};
  try {
    const st = JSON.parse(localStorage.getItem("mora_personal_settings") || "{}") || {};
    kinds = { chat: st.chat !== false, reminders: st.reminders !== false };
  } catch (e) {
    kinds = {};
  }
  await setDoc(
    chatDoc("push_subscriptions", subId(j.endpoint)),
    {
      endpoint: j.endpoint,
      keys: j.keys,
      technician: techName || "",
      updatedAt: serverTimestamp(),
      device: String(navigator.userAgent || "").slice(0, 120),
      ...kinds,
    },
    { merge: true }
  );
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
  await deleteDoc(chatDoc("push_subscriptions", subId(sub.endpoint))).catch(() => {});
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
  title: m.conv === GROUP ? `Gruppo tecnici · ${m.author}` : `${m.author} (privato)`,
  text: m.text ? m.text + (m.photoId ? " (foto)" : "") : m.audioId ? `Messaggio vocale (${durLabel(m.audioDur)})` : m.photoId ? "Ha mandato una foto" : "",
  tag: "chat-" + m.conv,
  url: (m.via === "online" ? "/?online=" : "/?chat=") + encodeURIComponent(m.conv),
});

// chi deve ricevere la notifica: gruppo = tutti tranne chi scrive; privata = solo l'altro
export const recipientsFor = (m, subs, mine = "") =>
  (subs || []).filter((s) => {
    if (!s.endpoint || s.endpoint === mine || key(s.technician) === m.authorKey) return false;
    if (s.chat === false) return false; // ha spento le notifiche dei messaggi
    return m.conv === GROUP || dmMembers(m.conv).includes(key(s.technician));
  });

export const notifyChat = async (message) => {
  const mine = pushSupported() ? await myEndpoint() : "";
  const snap = await getDocs(chatRef("push_subscriptions"));
  const subs = recipientsFor(message, snap.docs.map((d) => d.data()), mine);
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
    deleteDoc(chatDoc("push_subscriptions", subId(e))).catch(() => {})
  );
  return res;
};
