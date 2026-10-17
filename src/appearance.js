// Opzioni grafiche di Admin > Design (valgono per tutti i telefoni):
// carattere, grandezza lettere, angoli, spaziatura, animazione di avvio.
// Una copia viene salvata sul telefono per applicarle subito all'apertura.
const CACHE_KEY = "mora_layout_cache";

export const FONT_OPTIONS = [
  { id: "barlow", label: "Barlow (predefinito)", body: '"Barlow"', head: '"Barlow Condensed"', google: null },
  { id: "inter", label: "Inter", body: '"Inter"', head: '"Inter"', google: "Inter:wght@400;500;600;700;800;900" },
  { id: "roboto", label: "Roboto", body: '"Roboto"', head: '"Roboto Condensed"', google: "Roboto:wght@400;500;700;900&family=Roboto+Condensed:wght@700;800;900" },
  { id: "opensans", label: "Open Sans", body: '"Open Sans"', head: '"Open Sans"', google: "Open+Sans:wght@400;500;600;700;800" },
  { id: "lato", label: "Lato", body: '"Lato"', head: '"Lato"', google: "Lato:wght@400;700;900" },
  { id: "montserrat", label: "Montserrat", body: '"Montserrat"', head: '"Montserrat"', google: "Montserrat:wght@400;500;600;700;800;900" },
  { id: "system", label: "Carattere del telefono", body: "system-ui, -apple-system", head: "system-ui, -apple-system", google: null },
];

export const FONT_SCALE_OPTIONS = [
  { id: "small", label: "Piccole", value: 0.9 },
  { id: "normal", label: "Normali", value: 1 },
  { id: "large", label: "Grandi", value: 1.12 },
  { id: "xlarge", label: "Molto grandi", value: 1.25 },
];

export const RADIUS_OPTIONS = [
  { id: "square", label: "Squadrati", value: 0.35 },
  { id: "normal", label: "Normali", value: 1 },
  { id: "round", label: "Arrotondati", value: 1.6 },
];

export const DENSITY_OPTIONS = [
  { id: "compact", label: "Compatta", value: 0.75 },
  { id: "normal", label: "Normale", value: 1 },
  { id: "comfortable", label: "Ariosa", value: 1.2 },
];

export const APPEARANCE_DEFAULTS = {
  fontFamily: "barlow",
  fontScale: "normal",
  radiusStyle: "normal",
  density: "normal",
  showSplash: true,
};

const pick = (list, id) => list.find((o) => o.id === id) || list.find((o) => o.id === "normal") || list[0];
const FALLBACK = '"Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const getCachedLayout = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data && typeof data === "object" ? data : {};
  } catch (e) {
    return {};
  }
};

export const cacheLayout = (cfg) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cfg));
  } catch (e) {}
};

// Applica le opzioni alla pagina (variabili CSS su <html> + caricamento del carattere)
export const applyAppearance = (cfg = {}) => {
  const c = { ...APPEARANCE_DEFAULTS, ...cfg };
  const root = document.documentElement;
  const font = pick(FONT_OPTIONS, c.fontFamily);
  root.style.setProperty("--mora-fs", String(pick(FONT_SCALE_OPTIONS, c.fontScale).value));
  root.style.setProperty("--mora-radius", String(pick(RADIUS_OPTIONS, c.radiusStyle).value));
  root.style.setProperty("--mora-space", String(pick(DENSITY_OPTIONS, c.density).value));
  root.style.setProperty("--mora-font", `${font.body}, ${FALLBACK}`);
  root.style.setProperty("--mora-font-head", `${font.head}, ${font.body}, ${FALLBACK}`);
  root.setAttribute("data-font", font.id);
  if (font.google) {
    const href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
    let link = document.getElementById("mora-font-link");
    if (!link) {
      link = document.createElement("link");
      link.id = "mora-font-link";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
  }
  return c;
};
