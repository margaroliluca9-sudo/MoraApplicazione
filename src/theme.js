// Tema chiaro / scuro, scelto per ogni dispositivo.
// "auto" segue l'impostazione del telefono.
const KEY = "mora_theme";
export const THEME_MODES = ["auto", "light", "dark"];
export const THEME_LABELS = {
  auto: "Tema automatico",
  light: "Tema chiaro",
  dark: "Tema scuro",
};

export const getThemeMode = () => {
  try {
    const v = localStorage.getItem(KEY);
    return THEME_MODES.includes(v) ? v : "auto";
  } catch (e) {
    return "auto";
  }
};

export const saveThemeMode = (mode) => {
  try {
    localStorage.setItem(KEY, mode);
  } catch (e) {}
};

const darkQuery = () => {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)");
  } catch (e) {
    return null;
  }
};

export const isDarkMode = (mode) => {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  const q = darkQuery();
  return !!(q && q.matches);
};

// colore della striscia in alto (ora e batteria): col tema chiaro il colore dell'app (Admin → Design o
// «Il mio aspetto»), col tema scuro scura. Segue il tema che l'app sta mostrando davvero (classe «dark»).
const STATUS_HEX = { blue: "#2563eb", indigo: "#4f46e5", teal: "#0d9488", green: "#16a34a", red: "#dc2626", rose: "#e11d48", orange: "#ea580c", amber: "#d97706", purple: "#9333ea", slate: "#475569" };
let statusColor = "blue";
const paintStatus = () => {
  const dark = document.documentElement.classList.contains("dark");
  const hex = dark ? "#0b1220" : STATUS_HEX[statusColor] || STATUS_HEX.blue;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", hex);
  document.documentElement.style.setProperty("--mora-status", hex);
};
export const setStatusColor = (color) => {
  statusColor = color || "blue";
  paintStatus();
};

// Applica il tema alla pagina e restituisce true se è scuro
export const applyTheme = (mode) => {
  const dark = isDarkMode(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  paintStatus();
  return dark;
};

// Avvisa quando cambia il tema del telefono (serve solo in "auto")
export const onSystemThemeChange = (callback) => {
  const q = darkQuery();
  if (!q) return () => {};
  if (q.addEventListener) {
    q.addEventListener("change", callback);
    return () => q.removeEventListener("change", callback);
  }
  // Safari vecchi (iOS < 14)
  q.addListener(callback);
  return () => q.removeListener(callback);
};
