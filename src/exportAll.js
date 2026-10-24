// ESPORTA TUTTO IN EXCEL (Area admin → System): un file con tre fogli
//  - Interventi: tutti i rapporti, dal più recente (data, rapportino, tecnici, cliente, gru, descrizione, fune/catena, foto)
//  - Clienti: nome, quante gru, quanti interventi, primo e ultimo intervento
//  - Gru: cliente, matricola, tipo, portata, quanti interventi, quante riparazioni, ultimo intervento
// Legge i rapporti dal database una volta sola (non usa quelli già caricati: sul telefono ci sono solo gli ultimi).
import { collection } from "firebase/firestore";
import { db, appId } from "./firebase";
import { getDocs, getDocsFromServer } from "./metered";
import { buildXlsx } from "./xlsx";
import { formatRope } from "./ropes";
import { getSafeMatricola } from "./utils";
import { isRepair } from "./repairs";

const coll = (c) => collection(db, "artifacts", appId, "public", "data", c);

// "3/9/2026" → numero ordinabile 20260903 (0 se non si capisce)
export const dateKey = (s) => {
  const m = String(s || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1]) : 0;
};
const two = (n) => String(n).padStart(2, "0");
export const niceDate = (s) => {
  const k = dateKey(s);
  return k ? `${two(k % 100)}/${two(Math.floor(k / 100) % 100)}/${Math.floor(k / 10000)}` : String(s || "");
};
// per Excel: date vere (si ordinano e si filtrano), altrimenti il testo com'è
const kToCell = (k) => (k ? { date: new Date(Math.floor(k / 10000), (Math.floor(k / 100) % 100) - 1, k % 100) } : "");
const dateCell = (s) => (dateKey(s) ? kToCell(dateKey(s)) : String(s || ""));
const stamp = (t) => {
  try {
    const d = t && typeof t.toDate === "function" ? t.toDate() : t && t.seconds ? new Date(t.seconds * 1000) : null;
    return d && !Number.isNaN(d.getTime()) ? { time: d } : "";
  } catch (e) {
    return "";
  }
};
const up = (s) => String(s || "").toUpperCase().trim();
const num = (v) => {
  const n = Number(String(v == null ? "" : v).replace(",", "."));
  return String(v || "").trim() && Number.isFinite(n) ? n : v || "";
};
const photosOf = (l) => Number(l.photoCount) || (Array.isArray(l.photos) ? l.photos.length : 0);
const byNewest = (a, b) => dateKey(b.dateString) - dateKey(a.dateString) || ((b.createdAt && b.createdAt.seconds) || 0) - ((a.createdAt && a.createdAt.seconds) || 0);

export const exportSheets = ({ logs, customers = [], machines = [] }) => {
  const sorted = [...logs].sort(byNewest);
  const interventi = {
    name: "Interventi",
    cols: [
      { title: "Data", width: 12 },
      { title: "Rapportino", width: 12 },
      { title: "Tecnico", width: 18 },
      { title: "Colleghi", width: 22 },
      { title: "Cliente", width: 28 },
      { title: "Gru (matricola)", width: 16 },
      { title: "Tipo di gru", width: 18 },
      { title: "Portata", width: 10 },
      { title: "Descrizione", width: 70 },
      { title: "Riparazione", width: 12 },
      { title: "Fune sostituita", width: 28 },
      { title: "Catena sostituita", width: 28 },
      { title: "Foto", width: 7 },
      { title: "Scritto il", width: 17 },
    ],
    rows: sorted.map((l) => [
      dateCell(l.dateString),
      num(l.ticketNumber),
      l.technician || "",
      (l.additionalTechnicians || []).filter(Boolean).join(", "),
      up(l.customer),
      up(l.machineId),
      l.machineType || "",
      num(l.capacity),
      l.description || "",
      isRepair(l) ? "sì" : "",
      formatRope(l.fune),
      formatRope(l.catena),
      photosOf(l) || "",
      stamp(l.createdAt),
    ]),
  };

  // clienti: quelli in anagrafica + quelli che compaiono solo nei rapporti
  const cli = new Map();
  const cliOf = (name) => {
    const k = up(name);
    if (!k) return null;
    if (!cli.has(k)) cli.set(k, { name: k, cranes: new Set(), n: 0, first: 0, last: 0 });
    return cli.get(k);
  };
  customers.forEach((c) => cliOf(c.name));
  machines.forEach((m) => {
    const c = cliOf(m.customerName);
    if (c) c.cranes.add(up(getSafeMatricola(m)));
  });
  // gru: quelle in anagrafica + quelle che compaiono solo nei rapporti
  const gru = new Map();
  const gruOf = (customer, id, extra = {}) => {
    const k = up(customer) + "|" + up(id);
    if (!up(customer) || !up(id)) return null;
    if (!gru.has(k)) gru.set(k, { customer: up(customer), id: up(id), type: "", capacity: "", n: 0, fix: 0, last: 0 });
    const g = gru.get(k);
    if (extra.type && !g.type) g.type = extra.type;
    if (extra.capacity && !g.capacity) g.capacity = extra.capacity;
    return g;
  };
  machines.forEach((m) => gruOf(m.customerName, getSafeMatricola(m), { type: m.type, capacity: m.capacity }));
  sorted.forEach((l) => {
    const k = dateKey(l.dateString);
    const c = cliOf(l.customer);
    if (c) {
      c.n += 1;
      if (l.machineId) c.cranes.add(up(l.machineId));
      if (k && (!c.first || k < c.first)) c.first = k;
      if (k > c.last) c.last = k;
    }
    const g = gruOf(l.customer, l.machineId, { type: l.machineType, capacity: l.capacity });
    if (g) {
      g.n += 1;
      if (isRepair(l)) g.fix += 1;
      if (k > g.last) g.last = k;
    }
  });
  const kDate = kToCell;

  const clienti = {
    name: "Clienti",
    cols: [
      { title: "Cliente", width: 32 },
      { title: "Gru", width: 8 },
      { title: "Interventi", width: 11 },
      { title: "Primo intervento", width: 16 },
      { title: "Ultimo intervento", width: 16 },
    ],
    rows: [...cli.values()]
      .sort((a, b) => a.name.localeCompare(b.name, "it"))
      .map((c) => [c.name, c.cranes.size, c.n, kDate(c.first), kDate(c.last)]),
  };
  const gruSheet = {
    name: "Gru",
    cols: [
      { title: "Cliente", width: 32 },
      { title: "Matricola", width: 14 },
      { title: "Tipo di gru", width: 20 },
      { title: "Portata", width: 10 },
      { title: "Interventi", width: 11 },
      { title: "Riparazioni", width: 12 },
      { title: "Ultimo intervento", width: 16 },
    ],
    rows: [...gru.values()]
      .sort((a, b) => a.customer.localeCompare(b.customer, "it") || a.id.localeCompare(b.id, "it", { numeric: true }))
      .map((g) => [g.customer, g.id, g.type || "", num(g.capacity), g.n, g.fix, kDate(g.last)]),
  };
  return [interventi, clienti, gruSheet];
};

export const loadAllLogs = async () => {
  let snap;
  try {
    snap = await getDocsFromServer(coll("maintenance_logs"));
  } catch (e) {
    snap = await getDocs(coll("maintenance_logs")); // senza rete: quelli che ha il telefono
  }
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const exportFileName = (now = new Date()) => `Mora-tutto-${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}.xlsx`;

export const buildExport = async ({ customers, machines }) => {
  const logs = await loadAllLogs();
  const sheets = exportSheets({ logs, customers, machines });
  return { bytes: buildXlsx(sheets), counts: { logs: sheets[0].rows.length, customers: sheets[1].rows.length, cranes: sheets[2].rows.length } };
};
