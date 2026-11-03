// «IL MIO ANNO»: riepilogo personale dell'anno per il tecnico (Mia area, dal 1° dicembre al 31 gennaio).
// Solo dai suoi interventi (tecnico principale o in aiuto): quanti, clienti, gru, mese più pieno, colleghi, funi e catene.
import { MONTHS } from "./personal";

const k = (s) => String(s || "").trim().toLowerCase();
const isMine = (l, me) => k(l.technician) === k(me) || (l.additionalTechnicians || []).some((t) => k(t) === k(me));
const parts = (ds) => String(ds || "").split("/").map(Number); // gg/mm/aaaa

// anno da mostrare: a dicembre quello in corso, a gennaio quello appena finito; altrimenti nessuno
export const yearToShow = (now = new Date()) => (now.getMonth() === 11 ? now.getFullYear() : now.getMonth() === 0 ? now.getFullYear() - 1 : null);

const top = (arr, f, n = 3) => {
  const c = {};
  arr.forEach((l) => {
    const v = f(l);
    if (v) c[v] = (c[v] || 0) + 1;
  });
  return Object.entries(c)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "it"))
    .slice(0, n);
};

export const myYear = (logs = [], me = "", year) => {
  const mine = logs.filter((l) => l && isMine(l, me) && parts(l.dateString)[2] === year);
  const prev = logs.filter((l) => l && isMine(l, me) && parts(l.dateString)[2] === year - 1).length;
  const months = Array(12).fill(0);
  mine.forEach((l) => {
    const m = parts(l.dateString)[1];
    if (m >= 1 && m <= 12) months[m - 1]++;
  });
  const best = months.reduce((b, n, i) => (n > months[b] ? i : b), 0);
  const days = new Set(mine.map((l) => l.dateString)).size;
  const customers = new Set(mine.map((l) => k(l.customer)).filter(Boolean)).size;
  const cranes = new Set(mine.map((l) => `${k(l.customer)}|${k(l.machineId)}`).filter((x) => x !== "|")).size;
  const mates = top(mine, (l) => [l.technician, ...(l.additionalTechnicians || [])].find((t) => t && k(t) !== k(me)));
  return {
    year,
    total: mine.length,
    prev,
    days,
    customers,
    cranes,
    months,
    bestMonth: mine.length ? MONTHS[best] : "",
    bestMonthN: mine.length ? months[best] : 0,
    topCustomers: top(mine, (l) => l.customer),
    topCranes: top(mine, (l) => (l.customer && l.machineId ? `${l.customer} · ${l.machineId}` : "")),
    mates,
    ropes: mine.filter((l) => l.fune && !l.fune.declined).length,
    chains: mine.filter((l) => l.catena && !l.catena.declined).length,
    photos: mine.reduce((s, l) => s + ((l.photos && l.photos.length) || 0), 0),
  };
};
