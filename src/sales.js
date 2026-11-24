// COMMERCIALE: le pratiche con i clienti (preventivi, richieste, chiamate da fare) che seguono i tecnici
// abilitati (di base Luca e Marco). Sono CONDIVISE tra loro: tutti vedono tutte le pratiche, chi la segue,
// cosa è stato fatto (diario) e il prossimo passo. Gli altri tecnici non vedono la sezione.
//  .../public/data/sales_items  { customer, title, kind, status, owner, amount, contact, phone,
//                                 nextDate "aaaa-mm-gg", nextWhat, entries [{ at, who, kind, text }],
//                                 createdAt, createdBy, updatedAt, updatedBy }
import { serverTimestamp } from "firebase/firestore";
import { addDoc, deleteDoc, setDoc } from "./tracked";
import { chatRef, chatDoc, key } from "./chat";
import { todayIso, isoOf, parseIso, saveReminder } from "./personal";
import { buildXlsx } from "./xlsx";
import { pendingItems } from "./assistant";

export const SALES = "sales_items";
export const DEFAULT_SALES_USERS = ["luca", "marco"];

// chi vede la sezione (Admin → Design → «Commerciale»); di base Luca e Marco
export const salesUsers = (cfg) => (cfg && Array.isArray(cfg.salesUsers) && cfg.salesUsers.length ? cfg.salesUsers.map(key) : DEFAULT_SALES_USERS);
export const canSales = (cfg, me) => !!key(me) && salesUsers(cfg).includes(key(me));
export const nameOf = (k) => {
  const s = String(k || "").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
};

export const KINDS = [
  { id: "quote", label: "Preventivo" },
  { id: "request", label: "Richiesta del cliente" },
  { id: "call", label: "Chiamata da fare" },
  { id: "visit", label: "Sopralluogo" },
  { id: "other", label: "Altro" },
];
export const STATUSES = [
  { id: "todo", label: "Da fare", open: true, tone: "blue" },
  { id: "wait", label: "In attesa del cliente", short: "In attesa", open: true, tone: "amber" },
  { id: "won", label: "Acquisito", open: false, tone: "emerald" },
  { id: "lost", label: "Perso", open: false, tone: "red" },
  { id: "done", label: "Chiuso", open: false, tone: "slate" },
];
// cosa si scrive nel diario
export const ENTRY_KINDS = [
  { id: "call", label: "Chiamata" },
  { id: "mail", label: "Email" },
  { id: "visit", label: "Visita" },
  { id: "quote", label: "Preventivo inviato" },
  { id: "note", label: "Nota" },
];
export const kindLabel = (id) => (KINDS.find((k) => k.id === id) || KINDS[4]).label;
export const statusOf = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];
export const entryLabel = (id) => (ENTRY_KINDS.find((k) => k.id === id) || ENTRY_KINDS[4]).label;
export const isOpen = (it) => statusOf(it && it.status).open;

// giorni da oggi per il prossimo passo
export const plusDays = (n, now = new Date()) => isoOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() + n));
export const nextMonday = (now = new Date()) => plusDays(((8 - now.getDay()) % 7) || 7, now);

// prossimo passo: scaduto, oggi o più avanti
export const dueState = (it, now = new Date()) => {
  if (!isOpen(it) || !it.nextDate) return "";
  const t = todayIso(now);
  return it.nextDate < t ? "late" : it.nextDate === t ? "today" : "later";
};
export const lastEntry = (it) => {
  const e = Array.isArray(it && it.entries) ? it.entries : [];
  return e.length ? e[e.length - 1] : null;
};
const lastAt = (it) => (it && (it.updatedAt || (lastEntry(it) || {}).at)) || 0;

// elenco ordinato: prima i più urgenti (scaduti, oggi, poi per data), senza data in fondo; chiusi dal più recente
export const sortItems = (list) =>
  [...(list || [])].sort((a, b) => {
    const oa = isOpen(a) ? 0 : 1;
    const ob = isOpen(b) ? 0 : 1;
    if (oa !== ob) return oa - ob;
    if (oa === 1) return lastAt(b) - lastAt(a);
    return (a.nextDate || "9999").localeCompare(b.nextDate || "9999") || lastAt(b) - lastAt(a);
  });

// il punto della situazione
export const summary = (list, now = new Date()) => {
  const open = (list || []).filter(isOpen);
  const ym = todayIso(now).slice(0, 7);
  const closedMonth = (list || []).filter((i) => !isOpen(i) && i.closedAt && isoOf(new Date(i.closedAt)).slice(0, 7) === ym);
  const quotes = open.filter((i) => i.kind === "quote");
  return {
    due: open.filter((i) => ["late", "today"].includes(dueState(i, now))).length,
    late: open.filter((i) => dueState(i, now) === "late").length,
    wait: open.filter((i) => i.status === "wait").length,
    open: open.length,
    quotes: quotes.length,
    quotesAmount: quotes.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    won: closedMonth.filter((i) => i.status === "won").length,
    wonAmount: closedMonth.filter((i) => i.status === "won").reduce((s, i) => s + (Number(i.amount) || 0), 0),
    lost: closedMonth.filter((i) => i.status === "lost").length,
  };
};

// ultime cose fatte dagli altri (per «Novità dal collega»)
export const newsFor = (list, me, max = 5) =>
  (list || [])
    .flatMap((it) => (it.entries || []).map((e) => ({ it, e })))
    .filter(({ e }) => key(e.who) && key(e.who) !== key(me))
    .sort((a, b) => (b.e.at || 0) - (a.e.at || 0))
    .slice(0, max);

export const euro = (n) => {
  const v = Number(n);
  if (!v) return "";
  // «€ 8.400» e «€ 1.250,50»: il punto delle migliaia anche sotto i 10.000 (toLocaleString non lo mette)
  const [int, dec] = (Math.round(v * 100) / 100).toFixed(2).split(".");
  return "€ " + int.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (dec !== "00" ? "," + dec : "");
};
// "12/11" oppure "12/11/2025" se di un altro anno
export const shortDate = (ms, now = new Date()) => {
  if (!ms) return "";
  const d = new Date(ms);
  return d.getFullYear() === now.getFullYear() ? `${d.getDate()}/${d.getMonth() + 1}` : `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};
export const isoShort = (iso) => {
  const d = parseIso(iso);
  return d ? `${d.getDate()}/${d.getMonth() + 1}` : "";
};

const clean = (it) => ({
  customer: String(it.customer || "").trim().toUpperCase(),
  title: String(it.title || "").trim(),
  kind: KINDS.some((k) => k.id === it.kind) ? it.kind : "other",
  status: STATUSES.some((s) => s.id === it.status) ? it.status : "todo",
  owner: key(it.owner),
  // già numero (pratica salvata): resta com'è; scritto a mano: «1.250,50» → 1250.5
  // (prima un importo salvato con i centesimi, 1250.5, a ogni spunta diventava 12505)
  amount: typeof it.amount === "number" ? it.amount || null : Number(String(it.amount == null ? "" : it.amount).replace(/\./g, "").replace(",", ".")) || null,
  contact: String(it.contact || "").trim(),
  phone: String(it.phone || "").trim(),
  nextDate: it.nextDate || "",
  nextWhat: String(it.nextWhat || "").trim(),
  entries: (it.entries || []).filter((e) => e && String(e.text || "").trim()).slice(-200),
});

// salva la pratica; «remind»: promemoria con avviso sul telefono a chi la segue, il giorno del prossimo passo alle 9
export const saveItem = async (me, it, { remind = false } = {}) => {
  const data = { ...clean(it), updatedAt: Date.now(), updatedBy: key(me) };
  if (!isOpen(data)) data.closedAt = it.closedAt || Date.now();
  else data.closedAt = null;
  if (remind && data.nextDate && isOpen(data) && data.owner)
    await saveReminder(data.owner, { title: `${data.customer}: ${data.nextWhat || data.title || kindLabel(data.kind)}`, date: data.nextDate, time: "09:00", notify: true });
  if (it.id) return setDoc(chatDoc(SALES, it.id), { ...data, createdAt: it.createdAt || null, createdBy: it.createdBy || key(me) });
  return addDoc(chatRef(SALES), { ...data, createdAt: serverTimestamp(), createdBy: key(me) });
};
export const withEntry = (it, me, kind, text) => ({ ...it, entries: [...(it.entries || []), { at: Date.now(), who: key(me), kind, text: String(text || "").trim() }] });
export const removeItem = (id) => deleteDoc(chatDoc(SALES, id));

// TABELLA EXCEL della lista: foglio «Lista» (una riga per cosa da fare) e foglio «Note» (una riga per nota)
const toDate = (ms) => (ms ? { date: new Date(ms) } : "");
const textOfItem = (it) => [it.customer, it.title].filter(Boolean).join(": ");
export const salesXlsx = (items) => {
  const list = sortItems(items || []);
  const lista = list.map((it) => {
    const e = it.entries || [];
    const le = e.length ? e[e.length - 1] : null;
    const d = dueState(it);
    return [
      textOfItem(it),
      nameOf(it.owner),
      it.nextDate ? { date: parseIso(it.nextDate) } : "",
      !isOpen(it) ? "Fatto" : d === "late" ? "In ritardo" : d === "today" ? "Da fare oggi" : "Da fare",
      le ? le.text : "",
      e.length,
      nameOf(it.createdBy),
      toDate(it.updatedAt),
      nameOf(it.updatedBy),
    ];
  });
  const note = [];
  list.forEach((it) => (it.entries || []).forEach((e) => note.push([textOfItem(it), toDate(e.at), nameOf(e.who), e.text])));
  return buildXlsx([
    {
      name: "Lista",
      cols: [
        { title: "Cosa c'è da fare", width: 60 },
        { title: "Chi", width: 12 },
        { title: "Quando", width: 12 },
        { title: "Stato", width: 14 },
        { title: "Ultima nota", width: 45 },
        { title: "N. note", width: 9 },
        { title: "Aggiunta da", width: 13 },
        { title: "Ultima modifica", width: 15 },
        { title: "Modificata da", width: 14 },
      ],
      rows: lista,
    },
    {
      name: "Note",
      cols: [
        { title: "Cosa c'è da fare", width: 60 },
        { title: "Data", width: 12 },
        { title: "Chi", width: 12 },
        { title: "Nota", width: 70 },
      ],
      rows: note,
    },
  ]);
};
export const salesFileName = (now = new Date()) => `Commerciale ${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}.xlsx`;

// LAVORI DAGLI INTERVENTI (scheda a parte del Commerciale, SOLO LETTURA: non scrive niente nella lista).
// Nei rapporti degli ultimi 12 mesi le cose consigliate o da fare («fune da sostituire alla prossima verifica»,
// «si consiglia la revisione del freno») che nessun rapporto SUCCESSIVO sulla stessa gru dice fatte.
// Le regole sono quelle di «L'ultima volta…» (assistant.js → pendingItems): una cosa con un pezzo (fune, catena,
// freno, finecorsa…) è chiusa se un rapporto dopo dice quel pezzo sostituito/riparato/sistemato o ha i dati della
// fune/catena nuova; una cosa senza pezzo vale solo fino al rapporto successivo sulla gru.
const SALE_HINT = /\b(da\s+(sostituire|cambiare|riparare|revisionare|ordinare)|consigliat[aoie]|si\s+consiglia|consigli[oa]\s+di|revisione\s+a\s+terra)\b/i;
const dayKey = (l) => {
  const p = String((l && l.dateString) || "").split("/").map(Number);
  return p.length === 3 ? p[2] * 10000 + p[1] * 100 + p[0] : 0;
};
export const jobsFromLogs = (logs, { now = new Date(), days = 365 } = {}) => {
  const byMachine = {};
  (logs || []).forEach((l) => {
    if (!l || !l.customer) return;
    const k = `${String(l.customer).trim().toUpperCase()}|${String(l.machineId || "").trim().toUpperCase()}`;
    (byMachine[k] = byMachine[k] || []).push(l);
  });
  const out = [];
  Object.values(byMachine).forEach((list) =>
    pendingItems(list, { now, maxAgeDays: days }).forEach(({ log, sentence }) => {
      if (!SALE_HINT.test(sentence)) return;
      out.push({ id: `${log.id}|${out.length}`, log, sentence: sentence.trim().replace(/[.;]+$/, "") });
    })
  );
  return out.sort((a, b) => dayKey(b.log) - dayKey(a.log));
};

// frasi pronte per scrivere più in fretta
export const QUICK = ["Mandare il preventivo", "Richiamare per conferma", "Fissare la data dell'intervento", "Proporre la verifica periodica", "Sentire se hanno bisogno"];
