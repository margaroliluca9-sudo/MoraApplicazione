// VERBALE UNICO DELLA GRU: i controlli fatti sulla stessa gru nello stesso giro (fune, catena, ganci del paranco)
// si mettono da parte qui (sul telefono) e poi escono in un PDF solo. Uno per gru (cliente + matricola).
// { [chiave]: { crane: { customerName, matricola, type, capacity }, items: [{ id, at, rep }] } }
const KEY = "mora_crane_basket";
const norm = (v) => String(v || "").trim().toUpperCase().replace(/\s+/g, "");
export const basketKey = (c) => `${norm(c && c.customerName)}|${norm(c && c.matricola)}`;
const read = () => {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) || "{}");
    return o && typeof o === "object" ? o : {};
  } catch (e) {
    return {};
  }
};
const write = (o) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(o));
  } catch (e) {
    // spazio pieno: niente
  }
  window.dispatchEvent(new CustomEvent("mora-basket"));
};
export const listBaskets = () =>
  Object.entries(read())
    .map(([k, b]) => ({ key: k, ...b }))
    .filter((b) => b.crane && b.items && b.items.length)
    .sort((a, b) => (b.items[b.items.length - 1].at || 0) - (a.items[a.items.length - 1].at || 0));
export const addToBasket = (crane, rep) => {
  const o = read();
  const k = basketKey(crane);
  const b = o[k] || { crane, items: [] };
  b.crane = crane;
  b.items = [...b.items, { id: Math.random().toString(36).slice(2, 9), at: Date.now(), rep }];
  o[k] = b;
  write(o);
  return b.items.length;
};
export const removeFromBasket = (k, id) => {
  const o = read();
  if (!o[k]) return;
  o[k].items = o[k].items.filter((i) => i.id !== id);
  if (!o[k].items.length) delete o[k];
  write(o);
};
export const clearBasket = (k) => {
  const o = read();
  delete o[k];
  write(o);
};
const WHAT = { fune: "Fune", catena: "Catena", paranco: "Paranco", fascia: "Braca" };
export const repName = (rep) => {
  const t = rep && rep.tiles && rep.tiles[0];
  if (rep && rep.type === "paranco" && t) return `${t[0]} ${t[1]}`;
  return WHAT[rep && rep.type] || "Controllo";
};
// il verbale unico: tutti i controlli dentro; esito NON IDONEO se almeno uno lo è
export const basketRep = (b) => {
  const reps = b.items.map((i) => i.rep);
  const level = reps.some((r) => r.level === "scarto") ? "scarto" : reps.some((r) => r.level === "attenzione") ? "attenzione" : "ok";
  const bad = reps.filter((r) => r.esito && /NON/.test(r.esito));
  return {
    type: "gru",
    title: "VERBALE CONTROLLO GRU",
    reps,
    level,
    esito: bad.length ? "NON IDONEA" : "IDONEA",
    azione: bad.length ? `Da sistemare: ${bad.map(repName).join(", ")}.` : "Tutti i controlli entro i limiti.",
  };
};
