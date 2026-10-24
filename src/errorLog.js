// ERRORI SUI TELEFONI: se l'app va in errore sul telefono di un tecnico lascia una nota nel database
// (app_errors), così in Area admin → System si vede cosa è successo anche se nessuno lo segnala.
// Pochi documenti: al massimo 5 per apertura e 15 al giorno per telefono, gli errori uguali una volta sola.
// Il server (api/reminders.js) cancella le note più vecchie di 60 giorni.
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, appId } from "./firebase";

export const ERRORS_COLL = "app_errors";
const PER_OPEN = 5;
const PER_DAY = 15;
const DAY_KEY = "mora_err_day";

let who = "";
let screen = "";
let sent = 0;
const seen = new Set();
// chi sta usando l'app e in che schermata (lo aggiorna App.js)
export const setErrorContext = (name, where) => {
  if (name != null) who = String(name || "");
  if (where != null) screen = String(where || "");
};

// telefono in parole semplici: «Android 14 · Chrome 129», «iPhone iOS 17.5 · Safari»
export const deviceName = (ua = navigator.userAgent || "") => {
  let os = "Computer";
  let m;
  if ((m = ua.match(/Android (\d+(?:\.\d+)?)/))) os = "Android " + m[1];
  else if ((m = ua.match(/(iPhone|iPad).*? OS (\d+)[_.](\d+)/))) os = `${m[1]} iOS ${m[2]}.${m[3]}`;
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "Mac";
  let br = "";
  if ((m = ua.match(/SamsungBrowser\/(\d+)/))) br = "Samsung Internet " + m[1];
  else if ((m = ua.match(/Edg\/(\d+)/))) br = "Edge " + m[1];
  else if ((m = ua.match(/(?:Chrome|CriOS)\/(\d+)/))) br = "Chrome " + m[1];
  else if ((m = ua.match(/(?:Firefox|FxiOS)\/(\d+)/))) br = "Firefox " + m[1];
  else if (/Safari\//.test(ua)) br = "Safari";
  const app = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches ? " · app installata" : "";
  return [os, br].filter(Boolean).join(" · ") + app;
};

// errori che non sono colpa dell'app (estensioni del browser, rumore noto, rete assente)
export const ignorable = (msg = "", stack = "") =>
  !msg ||
  /ResizeObserver loop|^Script error\.?$|Non-Error promise rejection|AbortError|The user aborted|Load failed$|Failed to fetch$|NetworkError|net::ERR|Loading chunk .* failed|ChunkLoadError/i.test(msg) ||
  /(chrome|moz|safari)-extension:\/\//.test(stack);

// versione dell'app = nome del file del programma (cambia a ogni pubblicazione)
const appVersion = () => {
  const el = document.querySelector('script[src*="/static/js/main"]');
  return el ? el.getAttribute("src").split("/").pop().replace(/^main\.|\.js$/g, "") : "";
};

const dayOk = () => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [d, n] = (localStorage.getItem(DAY_KEY) || "").split("|");
    const count = d === today ? Number(n) || 0 : 0;
    if (count >= PER_DAY) return false;
    localStorage.setItem(DAY_KEY, `${today}|${count + 1}`);
    return true;
  } catch (e) {
    return true;
  }
};

export const reportError = (err, kind = "errore") => {
  try {
    const msg = String((err && (err.message || err.reason)) || err || "").slice(0, 300);
    const stack = String((err && err.stack) || "").slice(0, 900);
    if (ignorable(msg, stack)) return false;
    const k = msg + "|" + screen;
    if (seen.has(k) || sent >= PER_OPEN) return false;
    seen.add(k);
    if (!dayOk()) return false;
    sent += 1;
    const data = {
      when: serverTimestamp(),
      at: Date.now(),
      kind,
      msg,
      stack,
      screen,
      who,
      device: deviceName(),
      online: navigator.onLine !== false,
      version: appVersion(),
    };
    if (window.__moraTest) (window.__errReports = window.__errReports || []).push(data);
    addDoc(collection(db, "artifacts", appId, "public", "data", ERRORS_COLL), data).catch(() => {});
    return true;
  } catch (e) {
    return false;
  }
};

// «SEGNALA UN PROBLEMA» (menu in alto a destra): il tecnico scrive cosa non va e può aggiungere
// una foto dello schermo. Finisce nello stesso elenco di Area admin → System.
const REP_KEY = "mora_rep_day";
export const sendReport = async ({ text = "", photo = "" } = {}) => {
  const msg = String(text || "").trim().slice(0, 1000);
  if (!msg && !photo) throw new Error("vuoto");
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [d, n] = (localStorage.getItem(REP_KEY) || "").split("|");
    const count = d === today ? Number(n) || 0 : 0;
    if (count >= 10) throw new Error("troppe");
    localStorage.setItem(REP_KEY, `${today}|${count + 1}`);
  } catch (e) {
    if (e && e.message === "troppe") throw e;
  }
  const data = {
    when: serverTimestamp(),
    at: Date.now(),
    kind: "segnalazione",
    msg: msg || "(solo foto)",
    stack: "",
    screen,
    who,
    device: deviceName(),
    online: navigator.onLine !== false,
    version: appVersion(),
    photo: photo || "",
  };
  if (window.__moraTest) (window.__errReports = window.__errReports || []).push(data);
  // senza rete parte da sola appena torna (il database la tiene in coda)
  addDoc(collection(db, "artifacts", appId, "public", "data", ERRORS_COLL), data).catch(() => {});
  return true;
};

let installed = false;
export const installErrorLog = () => {
  if (installed) return;
  installed = true;
  window.addEventListener("error", (ev) => reportError(ev.error || { message: ev.message, stack: `${ev.filename || ""}:${ev.lineno || ""}` }, "errore"));
  window.addEventListener("unhandledrejection", (ev) => reportError(ev.reason || { message: "Errore senza descrizione" }, "promessa"));
};
