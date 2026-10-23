// NUMERO DI ASSISTENZA: ogni anno riparte da 1, quindi il «5» del 2025, del 2026 e del 2027
// sono assistenze diverse. Un'assistenza si riconosce da numero + anno (l'anno dell'intervento).
// Nella ricerca: «5» trova i n. 5 di tutti gli anni (prima il più recente), «5/2027», «5 2027»,
// «5 del 2027» o «5/27» solo quello del 2027. Il numero deve essere uguale, non «contiene»:
// cercando 5 non escono il 15, il 25, il 105…

// anno dell'intervento (dalla data gg/mm/aaaa)
export const ticketYear = (log) => {
  const p = String((log && log.dateString) || "").split("/");
  return p.length === 3 ? p[2] : "";
};
// "N. 0005", "#5", " 5 " → "5"
export const cleanTicket = (s) =>
  String(s || "")
    .trim()
    .replace(/^(n\s*\.?\s*|nr\s*\.?\s*|num\s*\.?\s*|#)/i, "")
    .trim()
    .replace(/^0+(?=\w)/, "")
    .toLowerCase();
export const sameTicket = (a, b) => {
  const x = cleanTicket(a);
  return x !== "" && x === cleanTicket(b);
};

// la ricerca è un numero di assistenza? → { num, year } (year "" = tutti gli anni)
export const parseTicketQuery = (q) => {
  const m = String(q || "")
    .trim()
    .toLowerCase()
    .match(/^(?:n\s*\.?\s*|nr\s*\.?\s*|n°\s*|#)?(\d{1,7})(?:\s*(?:\/|-|\s+del\s+|\s+)\s*(\d{4}|\d{2}))?$/);
  if (!m) return null;
  let year = m[2] || "";
  if (year.length === 2) year = "20" + year;
  return { num: cleanTicket(m[1]), year };
};
export const matchTicket = (log, tq) =>
  !!(log && tq && log.ticketNumber && cleanTicket(log.ticketNumber) === tq.num && (!tq.year || ticketYear(log) === tq.year));

// "5/2027" (solo se c'è il numero)
export const ticketLabel = (log) => (log && log.ticketNumber ? `${String(log.ticketNumber).trim()}/${ticketYear(log)}` : "");

// stesso numero nello stesso anno, su un altro intervento (per avvisare chi lo scrive)
export const ticketTwins = (logs, ticketNumber, year, selfId = null) =>
  cleanTicket(ticketNumber)
    ? (logs || []).filter((l) => l.id !== selfId && ticketYear(l) === String(year) && sameTicket(l.ticketNumber, ticketNumber))
    : [];
