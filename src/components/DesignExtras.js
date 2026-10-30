// ADMIN → DESIGN: nome dell'app, colore e tutte le animazioni dell'anno da vedere quando vuoi
// (avvio e cielo della Home), più la scelta «Automatica» o una fissa.
import React, { useState } from "react";
import { Check, Play, X, RotateCcw, Sun, Moon } from "lucide-react";
import { SEASONS, SEASON_INFO, seasonOf } from "../season";
import { THEME_COLORS } from "../home";
import { SplashScreen } from "./SplashScreen";
import { HomeHero } from "./HomeHero";

const COLOR_LABEL = { blue: "Blu", indigo: "Indaco", teal: "Petrolio", green: "Verde", red: "Rosso", rose: "Rosa", orange: "Arancio", amber: "Ambra", purple: "Viola", slate: "Grigio" };
const EMOJI = { normale: "🏗️", natale: "🎄", sanvalentino: "❤️", carnevale: "🎭", pasqua: "🥚", repubblica: "🇮🇹", estate: "☀️", autunno: "🍂", halloween: "🎃" };

// la festa che vale adesso (fissa scelta dall'admin, oppure quella del periodo)
export const seasonNow = (cfg = {}, now = new Date()) => {
  if (cfg.seasonalSplash === false) return "normale";
  return SEASONS.includes(cfg.seasonForce) ? cfg.seasonForce : seasonOf(now);
};

export const AppNameField = ({ layoutConfig, onUpdateLayout, color }) => {
  const saved = layoutConfig.appTitle || "";
  const [v, setV] = useState(saved);
  const clean = v.trim().slice(0, 40);
  return (
    <div className="space-y-1.5" data-section="app-name">
      <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 block">Nome dell'app</span>
      <div className="flex gap-2">
        <input value={v} maxLength={40} onChange={(e) => setV(e.target.value)} placeholder="Assistenza Mora" data-app-name className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800" />
        <button type="button" disabled={!clean || clean === saved} onClick={() => onUpdateLayout({ ...layoutConfig, appTitle: clean })} data-action="app-name-save" className={`h-11 px-4 rounded-xl bg-${color}-600 text-white text-sm font-bold disabled:opacity-40`}>
          Salva
        </button>
      </div>
      <span className="text-[10px] text-slate-500 ml-1 block">Si vede in alto nell'app e nell'animazione di avvio. Il nome sotto l'icona del telefono resta quello scelto quando l'avete installata.</span>
    </div>
  );
};

export const ThemeColors = ({ layoutConfig, onUpdateLayout }) => (
  <div className="space-y-1.5" data-section="theme-colors">
    <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 block">Colore dell'app</span>
    <div className="grid grid-cols-5 gap-2">
      {THEME_COLORS.map((c) => {
        const on = (layoutConfig.themeColor || "blue") === c;
        return (
          <button key={c} type="button" onClick={() => onUpdateLayout({ ...layoutConfig, themeColor: c })} data-theme-color={c} aria-pressed={on} className={`rounded-xl border-2 p-1.5 flex flex-col items-center gap-1 ${on ? "border-slate-800 bg-white" : "border-transparent"}`}>
            <span className={`w-8 h-8 rounded-full bg-${c}-600 flex items-center justify-center text-white`}>{on && <Check className="w-4 h-4" />}</span>
            <span className="text-[10px] font-bold text-slate-600">{COLOR_LABEL[c] || c}</span>
          </button>
        );
      })}
    </div>
  </div>
);

// anteprima a tutto schermo: avvio (si rivede) oppure cielo della Home (giorno / notte)
const Preview = ({ season, kind, title, dark, onClose }) => {
  const [run, setRun] = useState(0);
  const [night, setNight] = useState(false);
  const d = new Date();
  const now = new Date(d.getFullYear(), d.getMonth(), d.getDate(), night ? 21 : 11, 30);
  return (
    <div className="fixed inset-0 z-[900] bg-slate-900" data-section="season-preview" data-preview={kind + ":" + season}>
      {kind === "splash" ? (
        <div key={run} className="absolute inset-0 z-0">
          <SplashScreen season={season} dark={dark} title={title} />
        </div>
      ) : (
        <div className="absolute inset-0 overflow-y-auto bg-slate-100 px-3 pb-3" style={{ paddingTop: 72 }}>
          <div className="max-w-xl mx-auto">
            <HomeHero key={season + night} me="Anteprima" logs={[]} now={now} season={season} />
          </div>
        </div>
      )}
      <div className="absolute top-3 left-3 right-3 z-[950] flex items-center gap-2">
        <span className="flex-1 min-w-0 truncate rounded-full bg-black/60 text-white text-sm font-bold px-3 py-2">
          {EMOJI[season]} {SEASON_INFO[season].label} · {kind === "splash" ? "avvio" : "cielo della Home"}
        </span>
        {kind === "splash" ? (
          <button type="button" onClick={() => setRun((r) => r + 1)} className="h-10 px-3 rounded-full bg-white text-slate-800 text-sm font-bold flex items-center gap-1.5" data-action="preview-again">
            <RotateCcw className="w-4 h-4" /> Rivedi
          </button>
        ) : (
          <button type="button" onClick={() => setNight(!night)} className="h-10 px-3 rounded-full bg-white text-slate-800 text-sm font-bold flex items-center gap-1.5" data-action="preview-night">
            {night ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} {night ? "Giorno" : "Notte"}
          </button>
        )}
        <button type="button" onClick={onClose} aria-label="Chiudi l'anteprima" className="h-10 w-10 rounded-full bg-white text-slate-800 flex items-center justify-center" data-action="preview-close">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export const SeasonGallery = ({ layoutConfig, onUpdateLayout, color, dark = true }) => {
  const [show, setShow] = useState(null); // { season, kind }
  const auto = seasonOf();
  const forced = SEASONS.includes(layoutConfig.seasonForce) ? layoutConfig.seasonForce : "";
  const off = layoutConfig.seasonalSplash === false;
  const set = (patch) => onUpdateLayout({ ...layoutConfig, ...patch });
  return (
    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-3" data-section="season-gallery">
      <div>
        <span className="text-xs font-bold text-slate-700 block">Animazioni dell'anno</span>
        <span className="text-[10px] text-slate-500">
          Cambiano da sole col periodo: all'apertura dell'app e nel cielo della Home. Toccane una per vederla adesso.
          {" "}Oggi: <b>{SEASON_INFO[seasonNow(layoutConfig)].label}</b>
          {forced ? " (scelta da te)" : off ? " (feste spente)" : ""}.
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SEASONS.map((s) => {
          const isNow = s === seasonNow(layoutConfig);
          return (
            <div key={s} className={`bg-white rounded-xl border p-2.5 flex flex-wrap items-center gap-2.5 ${isNow ? `border-${color}-400 ring-1 ring-${color}-200` : "border-slate-200"}`} data-season-card={s}>
              <span className="text-2xl w-9 text-center shrink-0" aria-hidden="true">{EMOJI[s]}</span>
              <span className="flex-1 min-w-[140px]">
                <span className="block text-sm font-black text-slate-800">
                  {SEASON_INFO[s].label}
                  {s === auto && !forced && !off && <span className={`ml-1.5 text-[10px] font-bold text-${color}-700`}>ADESSO</span>}
                </span>
                <span className="block text-[11px] text-slate-500">{SEASON_INFO[s].when}</span>
              </span>
              <span className="flex gap-1.5 ml-auto">
              <button type="button" onClick={() => setShow({ season: s, kind: "splash" })} data-action="see-splash" className={`h-9 px-2.5 rounded-lg bg-${color}-600 text-white text-xs font-bold flex items-center gap-1 shrink-0`}>
                <Play className="w-3.5 h-3.5" /> Avvio
              </button>
              <button type="button" onClick={() => setShow({ season: s, kind: "hero" })} data-action="see-hero" className="h-9 px-2.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold shrink-0">
                Cielo
              </button>
              </span>
            </div>
          );
        })}
      </div>
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 block">Quale usare</span>
        <select
          className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-800"
          value={off ? "off" : forced || "auto"}
          data-season-choice
          onChange={(e) => {
            const v = e.target.value;
            if (v === "auto") set({ seasonalSplash: true, seasonForce: "" });
            else if (v === "off") set({ seasonalSplash: false, seasonForce: "" });
            else set({ seasonalSplash: true, seasonForce: v });
          }}
        >
          <option value="auto">Automatica: cambia da sola col periodo dell'anno</option>
          <option value="off">Sempre la classica (niente feste)</option>
          {SEASONS.filter((s) => s !== "normale").map((s) => (
            <option key={s} value={s}>
              Sempre {SEASON_INFO[s].label}
            </option>
          ))}
        </select>
      </div>
      {show && <Preview season={show.season} kind={show.kind} title={layoutConfig.appTitle || "Assistenza Mora"} dark={dark} onClose={() => setShow(null)} />}
    </div>
  );
};
