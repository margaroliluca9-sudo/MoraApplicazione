// IMPOSTAZIONI PERSONALI (La mia area → ⚙ Impostazioni). Valgono per questo telefono.
//  - notifiche: accese/spente sul telefono + quali (messaggi dei colleghi, promemoria/impegni)
//    le scelte "quali" stanno anche sull'iscrizione del telefono (push_subscriptions) così il server le rispetta
//  - animazione all'avvio sì/no
//  - farmi vedere tra i «Tecnici online» sì/no
import { setDoc } from "firebase/firestore";
import { chatDoc, subId, myEndpoint } from "./chat";

const KEY = "mora_personal_settings";
const ASKED = "mora_notify_asked_v1"; // domanda "attivi le notifiche?" già fatta su questo telefono

export const DEFAULT_SETTINGS = { chat: true, reminders: true, splash: true, showOnline: true };

export const getSettings = () => {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(KEY) || "{}") || {}) };
  } catch (e) {
    return { ...DEFAULT_SETTINGS };
  }
};
export const saveSettings = (next) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (e) {
    // niente
  }
  try {
    window.dispatchEvent(new CustomEvent("mora-settings", { detail: next }));
  } catch (e) {
    // niente
  }
  return next;
};
export const setSetting = (k, v) => saveSettings({ ...getSettings(), [k]: v });

// quali notifiche: le scrivo anche sull'iscrizione di questo telefono
export const syncNotifyKinds = async (settings = getSettings()) => {
  const endpoint = await myEndpoint();
  if (!endpoint) return false;
  await setDoc(chatDoc("push_subscriptions", subId(endpoint)), { chat: settings.chat !== false, reminders: settings.reminders !== false }, { merge: true });
  return true;
};

// la domanda dopo l'aggiornamento: una volta sola per telefono
export const wasAsked = () => {
  try {
    return localStorage.getItem(ASKED) === "1";
  } catch (e) {
    return true;
  }
};
// iPhone senza app installata: il consiglio "installala" lo do una volta sola
const TIP = "mora_notify_install_tip";
export const installTipShown = () => {
  try {
    return localStorage.getItem(TIP) === "1";
  } catch (e) {
    return true;
  }
};
export const markInstallTip = () => {
  try {
    localStorage.setItem(TIP, "1");
  } catch (e) {
    // niente
  }
};
export const markAsked = () => {
  try {
    localStorage.setItem(ASKED, "1");
  } catch (e) {
    // niente
  }
};

// notifica di prova (sul telefono, senza passare dal server)
export const testNotification = async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) throw new Error("Notifiche non attive su questo telefono.");
  await reg.showNotification("Assistenza Mora", {
    body: "Le notifiche funzionano 👍",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "prova",
  });
};
