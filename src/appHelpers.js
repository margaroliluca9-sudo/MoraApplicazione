// Piccoli aiuti usati da App.js (spostati qui per tenere App.js più corto).
import { SEASONS } from "./season";
import { seasonNow } from "./components/DesignExtras";

// SENZA RETE: "aggiornati oggi alle 8:42" / "ieri alle 17:10" / "il 16/10 alle 9:00"
export const readLastSync = () => {
  try {
    return Number(localStorage.getItem("mora_last_sync")) || 0;
  } catch (e) {
    return 0;
  }
};
export const syncWhen = (ms) => {
  const d = new Date(ms);
  const t = new Date();
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(t) - day(d)) / 86400000);
  if (diff === 0) return "oggi alle " + hm;
  if (diff === 1) return "ieri alle " + hm;
  return `il ${d.getDate()}/${d.getMonth() + 1} alle ${hm}`;
};

// porta in vista un riquadro (es. «riepilogo» = Riepilogo del mese in Ufficio), riprovando finché la pagina è pronta
export const focusSection = (name, tries = 12) => {
  const el = document.querySelector(`[data-focus="${name}"]`);
  if (el && el.scrollIntoView) el.scrollIntoView({ block: "center", behavior: "smooth" });
  else if (tries > 0) setTimeout(() => focusSection(name, tries - 1), 500);
};

// animazione di avvio del periodo dell'anno (si può provare con "?stagione=natale")
export const splashSeason = (cfg) => {
  try {
    const forced = new URLSearchParams(window.location.search).get("stagione");
    if (SEASONS.includes(forced)) return forced;
  } catch (e) {
    // niente
  }
  return seasonNow(cfg); // automatica, fissa (Admin → Design) o spenta
};
