// COMPILA VERIFICA DALL'APP (PROVA, solo per i tecnici abilitati in Admin → Clienti e gru → Drive).
// Il tecnico in cantiere scrive com'è la fune o la catena di ogni gru; il programma di Google
// (apps-script/paesi-dal-drive.gs, «controlla» ogni 5 minuti) lo scrive nel foglio della verifica nel Drive,
// nella colonna «Note» (se manca la aggiunge), così l'ufficio lo vede. Nient'altro del Drive viene toccato.
//  - field_checks/<id file>: foglio preparato dal programma (righe delle gru), chiesto con field «prep»
//  - field_entries/<id file>__<riga>: quello che scrive il tecnico (written: false finché non è nel Drive)
import { collection, doc, query, where } from "firebase/firestore";
import { db, appId } from "./firebase";
import { setDoc } from "./tracked";

const base = (c) => collection(db, "artifacts", appId, "public", "data", c);
export const placesRef = () => doc(db, "artifacts", appId, "public", "data", "settings", "drive_places");
export const openChecksQuery = () => query(base("field_checks"), where("open", "==", true));
export const entriesQuery = (fileId) => query(base("field_entries"), where("fileId", "==", fileId));
export const prepRef = (customerId) => doc(base("field_prep"), String(customerId).replace(/[^A-Za-z0-9_-]/g, "_"));
export const entryId = (fileId, k) => `${fileId}__${String(k).replace(/[^A-Za-z0-9_-]/g, "_")}`;

export const ESITI = ["Idonea", "Idonea da tenere sotto controllo", "Da sostituire", "Fuori servizio"];
export const ELEMENTI = ["Fune", "Catena", ""];

// chi può usare la prova: nomi in settings/layout.fieldCheckTechs (minuscolo, senza spazi ai lati)
export const fieldChecksAllowed = (layoutConfig, me) => {
  const list = (layoutConfig && Array.isArray(layoutConfig.fieldCheckTechs) && layoutConfig.fieldCheckTechs) || [];
  const k = String(me || "").trim().toLowerCase();
  return !!k && list.map((x) => String(x).trim().toLowerCase()).includes(k);
};

// fune o catena? lo indovino da quello che c'era scritto prima o dal tipo di gru
export const guessElement = (row) => {
  const t = `${row.prima || ""} ${row.tipo || ""}`.toLowerCase();
  if (/catena/.test(t)) return "Catena";
  if (/fune/.test(t)) return "Fune";
  return "";
};

// il testo che finisce nel foglio: «Catena idonea da tenere sotto controllo, 1 maglia usurata»
export const composeText = ({ elemento, esito, note }) => {
  const e = String(esito || "").trim();
  const head = elemento && e ? `${elemento} ${e.charAt(0).toLowerCase()}${e.slice(1)}` : elemento || e;
  return [head, String(note || "").trim()].filter(Boolean).join(", ");
};

// avviso al programma del Drive: c'è qualcosa da fare (lo guarda ogni 5 minuti)
const bump = (extra = {}) => setDoc(placesRef(), { compila: new Date().toISOString(), ...extra }, { merge: true });

// fileId: il tecnico ha scelto lui il file dall'elenco (altrimenti il programma sceglie dal nome)
export const requestPrep = (customerId, fileId = "") => bump({ prep: { [customerId]: new Date().toISOString() + (fileId ? `|${fileId}` : "") } });

// «T10.26» → «trimestrale di ottobre 2026», «A04.26» → «annuale di aprile 2026»
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
export const periodLabel = (name) => {
  const m = String(name || "").match(/(?:^|[^A-Z0-9])([TA]) ?(\d{1,2}) ?[./\\-] ?(\d{2})(?:[^0-9]|$)/i);
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return "";
  return `${m[1].toUpperCase() === "A" ? "annuale" : "trimestrale"} di ${MESI[Number(m[2]) - 1]} 20${m[3]}`;
};

export const altFilesOf = (check) => {
  try {
    const r = JSON.parse((check && check.altri) || "[]");
    return Array.isArray(r) ? r : [];
  } catch (e) {
    return [];
  }
};

export const saveEntry = async ({ check, row, elemento, esito, note, me }) => {
  const testo = composeText({ elemento, esito, note });
  await setDoc(doc(base("field_entries"), entryId(check.fileId, row.k)), {
    fileId: check.fileId,
    customerId: check.customerId || "",
    k: row.k,
    elemento: elemento || "",
    esito: esito || "",
    note: String(note || "").trim(),
    testo,
    by: me || "",
    at: new Date().toISOString(),
    written: false,
    errore: "",
  });
  await bump();
  return testo;
};

export const closeCheck = (check) => setDoc(doc(base("field_checks"), check.fileId), { open: false }, { merge: true });

export const rowsOf = (check) => {
  try {
    const r = JSON.parse((check && check.righe) || "[]");
    return Array.isArray(r) ? r : [];
  } catch (e) {
    return [];
  }
};
