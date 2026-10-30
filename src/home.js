// HOME PERSONALIZZATA: ogni tecnico sceglie ordine, grandezza, colore e quali riquadri vedere.
//  .../public/data/home_prefs/<nome tecnico in minuscolo>
//    { order: [id...] (riquadri visibili, in ordine), hidden: [id...], sizes: { id: "s"|"m"|"l" },
//      colors: { id: "blue"|... }, search: true|false, compact: true|false,
//      look: { preset, themeColor, mode, fontFamily, fontScale, radiusStyle, density } }   (aspetto dell'app)
// Senza preferenze salvate la Home è quella standard decisa dall'admin.
import { setDoc } from "./tracked";
import { chatDoc, key } from "./chat";

export const HOME_PREFS = "home_prefs";
export const SIZES = [
  { v: "s", label: "Piccolo" },
  { v: "m", label: "Medio" },
  { v: "l", label: "Grande" },
];
// colori con la versione per il tema scuro
export const COLORS = ["auto", "blue", "green", "orange", "red", "purple", "amber", "slate"];
export const COLOR_NAMES = {
  auto: "Come l'app",
  blue: "Blu",
  green: "Verde",
  orange: "Arancio",
  red: "Rosso",
  purple: "Viola",
  amber: "Giallo",
  slate: "Grigio",
};
// riquadri informativi (da aggiungere a scelta)
export const WIDGETS = ["w_today", "w_recent", "w_month", "w_van"];
export const isWidget = (id) => String(id).startsWith("w_");
export const sizesFor = (id) => (id === "new" || isWidget(id) ? ["m", "l"] : ["s", "m", "l"]);
export const defaultSize = (id) => (id === "new" || isWidget(id) ? "l" : "m");

// --- ASPETTO PERSONALE (vale solo per il tecnico, sopra le scelte dell'admin) ---
export const LOOK_KEYS = ["themeColor", "mode", "fontFamily", "fontScale", "radiusStyle", "density"];
export const THEME_COLORS = ["blue", "indigo", "teal", "green", "red", "rose", "orange", "amber", "purple", "slate"];
export const MODES = [
  { id: "auto", label: "Automatico" },
  { id: "light", label: "Chiaro" },
  { id: "dark", label: "Scuro" },
];
// modelli pronti
export const PRESETS = [
  { id: "classico", label: "Classico Mora", about: "Blu, come l'app di sempre", look: { themeColor: "blue", mode: "auto", fontFamily: "barlow", fontScale: "normal", radiusStyle: "normal", density: "normal" } },
  { id: "officina", label: "Officina", about: "Lettere grandi, alto contrasto, per i guanti", look: { themeColor: "orange", mode: "light", fontFamily: "roboto", fontScale: "xlarge", radiusStyle: "square", density: "comfortable" } },
  { id: "notte", label: "Notte", about: "Scuro, riposa gli occhi", look: { themeColor: "purple", mode: "dark", fontFamily: "inter", fontScale: "normal", radiusStyle: "round", density: "normal" } },
  { id: "compatto", label: "Compatto", about: "Più cose nello schermo", look: { themeColor: "green", mode: "auto", fontFamily: "system", fontScale: "small", radiusStyle: "square", density: "compact" } },
  { id: "elegante", label: "Elegante", about: "Grigio, angoli morbidi, ariosa", look: { themeColor: "slate", mode: "light", fontFamily: "montserrat", fontScale: "normal", radiusStyle: "round", density: "comfortable" } },
  { id: "vista", label: "Lettura facile", about: "Lettere molto grandi e spazi ampi", look: { themeColor: "blue", mode: "light", fontFamily: "lato", fontScale: "xlarge", radiusStyle: "normal", density: "comfortable" } },
  { id: "rosso", label: "Rosso Mora", about: "Rosso deciso, tema scuro", look: { themeColor: "red", mode: "dark", fontFamily: "barlow", fontScale: "normal", radiusStyle: "normal", density: "normal" } },
];
// aspetto pulito (solo valori ammessi); null = come l'admin
export const cleanLook = (look) => {
  if (!look || typeof look !== "object") return null;
  const out = {};
  LOOK_KEYS.forEach((k) => {
    if (look[k] != null && look[k] !== "") out[k] = String(look[k]);
  });
  if (out.themeColor && !THEME_COLORS.includes(out.themeColor)) delete out.themeColor;
  if (out.mode && !MODES.some((m) => m.id === out.mode)) delete out.mode;
  if (look.preset) out.preset = String(look.preset);
  return Object.keys(out).length ? out : null;
};

const cacheKey = (me) => "mora_home_" + key(me);
export const cachedPrefs = (me) => {
  try {
    const s = localStorage.getItem(cacheKey(me));
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
};
export const cachePrefs = (me, prefs) => {
  try {
    if (prefs) localStorage.setItem(cacheKey(me), JSON.stringify(prefs));
    else localStorage.removeItem(cacheKey(me));
  } catch (e) {
    // niente
  }
};

// Home effettiva: riquadri visibili in ordine + quelli nascosti che si possono aggiungere
// base = ordine standard (admin); available = tutti gli id che esistono per questo tecnico
export const resolveHome = (base, prefs, available) => {
  const p = prefs || {};
  const ok = (id) => available.includes(id);
  const hidden = (p.hidden || []).filter((id) => ok(id) && id !== "new");
  let order = (p.order || []).filter((id, i, a) => ok(id) && !hidden.includes(id) && a.indexOf(id) === i);
  if (!p.order) order = base.filter(ok);
  // riquadri standard nuovi (non ancora scelti né nascosti): in fondo
  base.forEach((id) => {
    if (ok(id) && !order.includes(id) && !hidden.includes(id)) order.push(id);
  });
  if (!order.includes("new") && ok("new")) order.unshift("new");
  const sizes = {};
  const colors = {};
  order.forEach((id) => {
    const s = p.sizes && p.sizes[id];
    sizes[id] = sizesFor(id).includes(s) ? s : defaultSize(id);
    colors[id] = COLORS.includes(p.colors && p.colors[id]) ? p.colors[id] : "auto";
  });
  return {
    order,
    hidden: available.filter((id) => !order.includes(id)),
    sizes,
    colors,
    search: p.search !== false,
    compact: !!p.compact,
    look: cleanLook(p.look),
  };
};

// spostamenti
export const moveTo = (order, id, targetId) => {
  const from = order.indexOf(id);
  const to = order.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return order;
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
};
export const moveBy = (order, id, delta) => {
  const i = order.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= order.length) return order;
  return moveTo(order, id, order[j]);
};

export const savePrefs = async (me, home) => {
  const data = {
    order: home.order,
    hidden: home.hidden,
    sizes: home.sizes,
    colors: home.colors,
    search: home.search,
    compact: home.compact,
    look: cleanLook(home.look),
    updatedAt: Date.now(),
  };
  cachePrefs(me, data);
  await setDoc(chatDoc(HOME_PREFS, key(me)), data);
  return data;
};
// "Ripristina": torna alla Home standard
export const resetPrefs = async (me) => {
  cachePrefs(me, null);
  await setDoc(chatDoc(HOME_PREFS, key(me)), { reset: true, updatedAt: Date.now() });
};
