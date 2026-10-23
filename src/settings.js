// IMPOSTAZIONI PERSONALI (La mia area → ⚙ Impostazioni). Valgono per questo telefono.
//  - notifiche: accese/spente sul telefono + quali (messaggi dei colleghi, promemoria/impegni)
//    le scelte "quali" stanno anche sull'iscrizione del telefono (push_subscriptions) così il server le rispetta
//  - animazione all'avvio sì/no
//  - farmi vedere tra i «Tecnici online» sì/no
import { setDoc } from "firebase/firestore";
import { chatDoc, subId, myEndpoint, key as techKey } from "./chat";

const KEY = "mora_personal_settings";
const ASKED = "mora_notify_asked_v1"; // domanda "attivi le notifiche?" già fatta su questo telefono

export const DEFAULT_SETTINGS = { chat: true, reminders: true, splash: true, showOnline: true, hours: false };

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
export const setSetting = (k, v) => {
  const next = saveSettings({ ...getSettings(), [k]: v });
  pushSettings(next);
  return next;
};

// ---- UGUALI SU TUTTI I TELEFONI DEL TECNICO ----
// .../public/data/personal_settings/<tecnico> { owner, values: {…}, hoursStd, hoursSince, updatedAt }
// Le notifiche accese/spente restano del singolo telefono (il permesso è del telefono);
// tutto il resto (quali notifiche, animazione, farsi vedere online, Le mie ore e il suo orario) segue il tecnico.
export const SETTINGS_COLL = "personal_settings";
const SYNC_KEYS = ["chat", "reminders", "splash", "showOnline", "hours", "heroAnim"];
const EXTRA = { hoursStd: "mora_hours_std", hoursSince: "mora_hours_since" };
let OWNER = "";
export const settingsDocId = (me) => techKey(me).replace(/[^a-z0-9_-]/gi, "_");
export const setSettingsOwner = (me) => {
  OWNER = me ? techKey(me) : "";
};
const readExtra = () => {
  const o = {};
  try {
    Object.entries(EXTRA).forEach(([k, ls]) => {
      const v = localStorage.getItem(ls);
      if (v) o[k] = k === "hoursStd" ? Number(v) : v;
    });
  } catch (e) {
    // niente
  }
  return o;
};
export const pushSettings = (settings = getSettings()) => {
  if (!OWNER) return Promise.resolve(false);
  const values = {};
  SYNC_KEYS.forEach((k) => {
    if (settings[k] !== undefined) values[k] = settings[k];
  });
  return setDoc(chatDoc(SETTINGS_COLL, OWNER.replace(/[^a-z0-9_-]/gi, "_")), { owner: OWNER, values, ...readExtra(), updatedAt: Date.now() }, { merge: true })
    .then(() => true)
    .catch(() => false);
};
// un valore "in più" (orario normale delle ore, da quando contano): salvo qui e lo mando
export const syncExtra = (k, v) => {
  try {
    if (EXTRA[k]) localStorage.setItem(EXTRA[k], String(v));
  } catch (e) {
    // niente
  }
  pushSettings();
};
// arrivano le impostazioni dal tecnico (da un altro telefono): le applico qui senza rimandarle
export const applyRemoteSettings = (data) => {
  if (!data) return false;
  const cur = getSettings();
  const vals = data.values || {};
  const next = { ...cur };
  let changed = false;
  SYNC_KEYS.forEach((k) => {
    if (vals[k] !== undefined && vals[k] !== cur[k]) {
      next[k] = vals[k];
      changed = true;
    }
  });
  try {
    Object.entries(EXTRA).forEach(([k, ls]) => {
      if (data[k] !== undefined && data[k] !== null && String(data[k]) !== (localStorage.getItem(ls) || "")) {
        localStorage.setItem(ls, String(data[k]));
        changed = true;
      }
    });
  } catch (e) {
    // niente
  }
  if (changed) saveSettings(next);
  return changed;
};

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
