// IL MIO PROFILO (La mia area → Il mio profilo): nome e cognome, email della ditta, foto e password personale.
//  - technicians/<id>: { name, surname, email, photoAt, passHash }   (photoAt = quando ha messo la foto)
//  - tech_photos/<id del tecnico>: { data (jpeg 320 px), at }        (letta una volta e poi tenuta nel telefono)
// Password personale: chi la mette entra con quella (non più con la password aziendale dei tecnici).
// Se la dimentica, l'admin in Staff gliela toglie e torna a valere la password aziendale.
import { doc, deleteField } from "firebase/firestore";
import { db, appId } from "./firebase";
import { setDoc, updateDoc, deleteDoc } from "./tracked";
import { getDoc } from "./metered";
import { passwordHash, isStaffPassword, isAdminPassword } from "./passwords";

const base = ["artifacts", appId, "public", "data"];
export const pkey = (name) => String(name || "").trim().toLowerCase();
const photoRef = (tech) => doc(db, ...base, "tech_photos", String(tech.id));
const techRef = (id) => doc(db, ...base, "technicians", id);

export const techOf = (technicians, name) => (technicians || []).find((t) => pkey(t.name) === pkey(name)) || null;
export const fullName = (t) => (t ? [t.name, t.surname].filter(Boolean).join(" ") : "");
// elenco tecnici tenuto a mente (lo aggiorna App.js): serve alla stampa per l'email di chi ha fatto l'intervento
let known = [];
export const rememberTechs = (list) => {
  known = Array.isArray(list) ? list : [];
};
// «marco@ditta.it» oppure, con più tecnici, «Marco: marco@ditta.it · Ale: ale@ditta.it» (solo chi l'ha messa)
export const emailsForLog = (log, list = known) => {
  const names = [log && log.technician, ...((log && log.additionalTechnicians) || [])].filter(Boolean);
  const found = names.map((n) => [n, (techOf(list, n) || {}).email]).filter(([, e]) => e);
  if (!found.length) return "";
  return names.length === 1 ? found[0][1] : found.map(([n, e]) => `${n}: ${e}`).join(" · ");
};
export const validEmail = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());

// --- password per entrare ---
// con password personale: vale quella (o la password admin); senza: la password aziendale dei tecnici
export const loginOk = (tech, password) => {
  if (!tech) return false;
  if (tech.passHash) return passwordHash(password) === tech.passHash;
  return isStaffPassword(password);
};
export const currentOk = (tech, password) => loginOk(tech, password) || isAdminPassword(password);
export const passwordProblem = (p) => {
  const s = String(p || "");
  if (s.length < 6) return "Almeno 6 caratteri.";
  if (isStaffPassword(s) || isAdminPassword(s)) return "Scegline una diversa dalla password aziendale.";
  return "";
};
export const setPersonalPassword = (tech, password) => updateDoc(techRef(tech.id), { passHash: passwordHash(password) });
export const clearPersonalPassword = (tech) => updateDoc(techRef(tech.id), { passHash: deleteField() });

export const saveProfile = (tech, { surname, email }) =>
  updateDoc(techRef(tech.id), { surname: String(surname || "").trim(), email: String(email || "").trim().toLowerCase() });

// --- foto ---
const LS = "mora_tech_photo_";
const memo = {};
const fromPhone = (k, at) => {
  try {
    const j = JSON.parse(localStorage.getItem(LS + k) || "null");
    return j && j.at === at ? j.data : null;
  } catch (e) {
    return null;
  }
};
const toPhone = (k, at, data) => {
  try {
    localStorage.setItem(LS + k, JSON.stringify({ at, data }));
  } catch (e) {
    // telefono pieno: la riprendo la prossima volta
  }
};
const waiting = {};
// foto di un tecnico (null se non c'è): una lettura sola finché non la cambia
export const loadPhoto = (tech) => {
  if (!tech || !tech.photoAt) return Promise.resolve(null);
  const k = String(tech.id);
  const id = `${k}|${tech.photoAt}`;
  if (memo[id] !== undefined) return Promise.resolve(memo[id]);
  const saved = fromPhone(k, tech.photoAt);
  if (saved) {
    memo[id] = saved;
    return Promise.resolve(saved);
  }
  if (!waiting[id])
    waiting[id] = getDoc(photoRef(tech))
      .then((s) => {
        const data = s.exists() ? (s.data() || {}).data || null : null;
        memo[id] = data;
        if (data) toPhone(k, tech.photoAt, data);
        return data;
      })
      .catch(() => null);
  return waiting[id];
};
export const photoNow = (tech) => (tech && tech.photoAt ? memo[`${tech.id}|${tech.photoAt}`] || fromPhone(String(tech.id), tech.photoAt) : null);

// foto quadrata piccola (320 px, ritagliata al centro): pesa poco
export const squarePhoto = (file, side = 320) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const s = Math.min(img.width, img.height);
        const c = document.createElement("canvas");
        c.width = side;
        c.height = side;
        c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, side, side);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });

export const savePhoto = async (tech, data) => {
  const at = Date.now();
  await setDoc(photoRef(tech), { data, at, name: tech.name });
  await updateDoc(techRef(tech.id), { photoAt: at });
  memo[`${tech.id}|${at}`] = data;
  toPhone(String(tech.id), at, data);
};
export const removePhoto = async (tech) => {
  await updateDoc(techRef(tech.id), { photoAt: deleteField() });
  await deleteDoc(photoRef(tech)).catch(() => {});
};
