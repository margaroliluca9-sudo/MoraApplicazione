// "Modifica aspetto": modelli pronti + ogni dettaglio della grafica (vale solo per il tecnico).
import React, { useState } from "react";
import { Check, ChevronDown, RotateCcw } from "lucide-react";
import { PRESETS, THEME_COLORS, MODES } from "../home";
import { FONT_OPTIONS, FONT_SCALE_OPTIONS, RADIUS_OPTIONS, DENSITY_OPTIONS } from "../appearance";

const COLOR_LABEL = { blue: "Blu", red: "Rosso", green: "Verde", purple: "Viola", orange: "Arancio", slate: "Grigio" };
const FONT_CSS = {
  barlow: '"Barlow Condensed", "Barlow", sans-serif',
  inter: '"Inter", sans-serif',
  roboto: '"Roboto", sans-serif',
  opensans: '"Open Sans", sans-serif',
  lato: '"Lato", sans-serif',
  montserrat: '"Montserrat", sans-serif',
  system: "system-ui, -apple-system, sans-serif",
};
const RADIUS_PX = { square: 4, normal: 12, round: 20 };

const Seg = ({ label, value, options, onChange, id }) => (
  <div className="space-y-1.5">
    <span className="text-xs font-black text-slate-500">{label}</span>
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label} data-look={id}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} data-value={o.id} onClick={() => onChange(o.id)}
          className={`h-10 px-3 rounded-xl text-sm font-bold border-2 ${value === o.id ? "border-slate-800 text-slate-800 bg-slate-50" : "border-slate-200 text-slate-600"}`}>
          {o.label}
        </button>
      ))}
    </div>
  </div>
);

export const LookEditor = ({ look, base = {}, mode = "auto", onChange }) => {
  const [more, setMore] = useState(!!(look && look.preset === "custom"));
  // valori attuali: quelli scelti, altrimenti quelli dell'admin
  const cur = {
    themeColor: (look && look.themeColor) || base.themeColor || "blue",
    mode: (look && look.mode) || mode || "auto",
    fontFamily: (look && look.fontFamily) || base.fontFamily || "barlow",
    fontScale: (look && look.fontScale) || base.fontScale || "normal",
    radiusStyle: (look && look.radiusStyle) || base.radiusStyle || "normal",
    density: (look && look.density) || base.density || "normal",
  };
  const presetId = look ? look.preset || "custom" : null;
  const setOne = (k, v) => onChange({ ...cur, [k]: v, preset: "custom" });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 space-y-4" data-section="look-editor">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-black text-slate-800 text-sm">Aspetto dell'app</h4>
        {look && (
          <button type="button" data-action="look-reset" onClick={() => onChange(null)} className="text-xs font-bold text-slate-500 flex items-center gap-1 min-h-[36px]">
            <RotateCcw className="w-3.5 h-3.5" /> Come l'app
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500 font-semibold -mt-2">Scegli un modello: lo vedi subito su tutta l'app. Vale solo per te.</p>

      <div className="grid grid-cols-2 gap-2" data-section="look-presets">
        {PRESETS.map((p) => {
          const on = presetId === p.id;
          const c = p.look.themeColor;
          const dark = p.look.mode === "dark";
          return (
            <button key={p.id} type="button" data-preset={p.id} aria-pressed={on} onClick={() => onChange({ ...p.look, preset: p.id })}
              className={`relative text-left rounded-2xl border-2 overflow-hidden ${on ? "border-slate-800" : "border-slate-200"}`}>
              <span className={`block p-2.5 ${dark ? "bg-slate-900" : "bg-slate-50"}`} style={{ borderRadius: 0 }}>
                <span className={`block h-3 bg-${c}-600 mb-2`} style={{ borderRadius: RADIUS_PX[p.look.radiusStyle] / 3 }} />
                <span className="flex gap-1.5">
                  <span className={`flex-1 h-8 ${dark ? "bg-slate-800" : "bg-white"} border ${dark ? "border-slate-700" : "border-slate-200"} flex items-center justify-center`} style={{ borderRadius: RADIUS_PX[p.look.radiusStyle] / 2 }}>
                    <span className={`w-3 h-3 bg-${c}-500`} style={{ borderRadius: RADIUS_PX[p.look.radiusStyle] / 4 }} />
                  </span>
                  <span className={`flex-1 h-8 ${dark ? "bg-slate-800" : "bg-white"} border ${dark ? "border-slate-700" : "border-slate-200"} flex items-center justify-center`} style={{ borderRadius: RADIUS_PX[p.look.radiusStyle] / 2 }}>
                    <span className={`font-black ${dark ? "text-white" : "text-slate-800"}`} style={{ fontFamily: FONT_CSS[p.look.fontFamily], fontSize: p.look.fontScale === "xlarge" ? 15 : p.look.fontScale === "small" ? 10 : 12 }}>Aa</span>
                  </span>
                </span>
              </span>
              <span className="block px-2.5 py-2 bg-white">
                <span className="block font-black text-slate-800 text-sm">{p.label}</span>
                <span className="block text-[11px] text-slate-500 leading-tight">{p.about}</span>
              </span>
              {on && (
                <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button type="button" data-action="look-more" onClick={() => setMore(!more)} aria-expanded={more}
        className="w-full h-11 rounded-xl border border-slate-200 font-bold text-sm text-slate-700 flex items-center justify-center gap-2">
        {presetId === "custom" ? "Personalizzato · " : ""}Personalizza ogni dettaglio
        <ChevronDown className={`w-4 h-4 transition-transform ${more ? "rotate-180" : ""}`} />
      </button>

      {more && (
        <div className="space-y-4" data-section="look-details">
          <div className="space-y-1.5">
            <span className="text-xs font-black text-slate-500">Colore principale</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Colore principale" data-look="themeColor">
              {THEME_COLORS.map((c) => (
                <button key={c} type="button" aria-pressed={cur.themeColor === c} data-value={c} aria-label={COLOR_LABEL[c]} onClick={() => setOne("themeColor", c)}
                  className={`h-11 pl-2 pr-3 rounded-full border-2 flex items-center gap-2 text-sm font-bold ${cur.themeColor === c ? "border-slate-800 text-slate-800" : "border-slate-200 text-slate-600"}`}>
                  <span className={`w-6 h-6 rounded-full bg-${c}-600`} />
                  {COLOR_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
          <Seg id="mode" label="Tema" value={cur.mode} options={MODES} onChange={(v) => setOne("mode", v)} />
          <div className="space-y-1.5">
            <span className="text-xs font-black text-slate-500">Carattere</span>
            <select value={cur.fontFamily} aria-label="Carattere" data-look="fontFamily" onChange={(e) => setOne("fontFamily", e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-300 bg-slate-50 font-bold text-slate-800">
              {FONT_OPTIONS.map((f) => (<option key={f.id} value={f.id}>{f.label}</option>))}
            </select>
          </div>
          <Seg id="fontScale" label="Grandezza lettere" value={cur.fontScale} options={FONT_SCALE_OPTIONS} onChange={(v) => setOne("fontScale", v)} />
          <Seg id="radiusStyle" label="Angoli" value={cur.radiusStyle} options={RADIUS_OPTIONS} onChange={(v) => setOne("radiusStyle", v)} />
          <Seg id="density" label="Spaziatura" value={cur.density} options={DENSITY_OPTIONS} onChange={(v) => setOne("density", v)} />
        </div>
      )}
    </div>
  );
};
