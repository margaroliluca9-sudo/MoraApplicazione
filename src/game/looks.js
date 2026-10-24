// IL TUO CARROPONTE: colori della trave che si sbloccano col tuo record (punti) e il nome scritto sulla trave.
// Restano su questo telefono; il colore si vede anche accanto al tuo nome in classifica.
const KEY = "mora_crane_look";

export const LOOKS = [
  { id: "giallo", label: "Giallo cantiere", need: 0, top: "#fde047", bottom: "#eab308", edge: "#a16207", ink: "#111827" },
  { id: "arancio", label: "Arancio", need: 100, top: "#fdba74", bottom: "#f97316", edge: "#9a3412", ink: "#111827" },
  { id: "blu", label: "Blu Mora", need: 250, top: "#60a5fa", bottom: "#2563eb", edge: "#1e3a8a", ink: "#ffffff" },
  { id: "rosso", label: "Rosso", need: 500, top: "#f87171", bottom: "#dc2626", edge: "#7f1d1d", ink: "#ffffff" },
  { id: "verde", label: "Verde", need: 800, top: "#4ade80", bottom: "#16a34a", edge: "#14532d", ink: "#0f172a" },
  { id: "nero", label: "Nero e oro", need: 1200, top: "#334155", bottom: "#0f172a", edge: "#f59e0b", ink: "#fbbf24" },
  { id: "strisce", label: "Strisce cantiere", need: 2000, top: "#fde047", bottom: "#eab308", edge: "#111827", ink: "#111827", stripes: true },
];
export const lookById = (id) => LOOKS.find((l) => l.id === id) || LOOKS[0];
export const unlocked = (look, record) => (Number(record) || 0) >= look.need;

// nome sulla trave: lettere e numeri, al massimo 10 (MAIUSCOLO come le scritte vere)
export const cleanName = (s) =>
  String(s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9ÀÈÉÌÒÙ .'-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 10);

export const readLook = () => {
  try {
    const x = JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    return { id: lookById(x.id).id, name: cleanName(x.name || "") };
  } catch (e) {
    return { id: "giallo", name: "" };
  }
};
export const saveLook = (look) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ id: look.id, name: cleanName(look.name) }));
  } catch (e) {
    // niente
  }
};
