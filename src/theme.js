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

// Applica il tema alla pagina e restituisce true se è scuro
export const applyTheme = (mode) => {
  const dark = isDarkMode(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#0b1220" : "#1d4ed8");
  root.style.setProperty("--mora-status", dark ? "#0b1220" : "#1d4ed8");
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
