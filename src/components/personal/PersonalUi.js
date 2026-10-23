// Pezzi grafici comuni della "La mia area" e del magazzino furgone.
import React, { useRef, useState } from "react";
import { ArrowLeft, X, Plus } from "lucide-react";

export const INPUT =
  "w-full px-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400";

// intestazione di una sezione: indietro + titolo + pulsante a destra
export const PanelHeader = ({ title, sub, onBack, onClose, action, color = "blue" }) => (
  <div className="px-3 py-3 border-b border-slate-200 bg-white flex items-center gap-2 shrink-0">
    {onBack && (
      <button type="button" onClick={onBack} aria-label="Indietro" className="p-2.5 rounded-full hover:bg-slate-100">
        <ArrowLeft className="w-5 h-5 text-slate-600" />
      </button>
    )}
    <div className="flex-1 min-w-0 pl-1">
      <h3 className="font-black text-slate-800 text-lg leading-tight truncate" data-panel-title>
        {title}
      </h3>
      {sub && <p className="text-xs font-bold text-slate-500 truncate">{sub}</p>}
    </div>
    {action && (
      <button
        type="button"
        onClick={action.onClick}
        data-action={action.id || "add"}
        className={`h-10 px-3.5 rounded-full bg-${color}-600 text-white font-bold text-sm flex items-center gap-1.5 shrink-0`}
      >
        <Plus className="w-4 h-4" /> {action.label}
      </button>
    )}
    {onClose && (
      <button type="button" onClick={onClose} aria-label="Chiudi" className="p-2.5 rounded-full hover:bg-slate-100">
        <X className="w-5 h-5 text-slate-500" />
      </button>
    )}
  </div>
);

// finestra dal basso con un modulo
// finestra dal basso: si chiude con la X o tirandola giù dalla barretta in alto
export const Sheet = ({ title, onClose, children, footer, section }) => {
  const [dy, setDy] = useState(0);
  const start = useRef(null);
  const down = (e) => {
    start.current = e.clientY;
    if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (start.current == null) return;
    setDy(Math.max(0, e.clientY - start.current));
  };
  const up = () => {
    if (start.current == null) return;
    start.current = null;
    if (dy > 110) onClose();
    setDy(0);
  };
  return (
    <div className="fixed inset-0 z-[220] bg-slate-900/50 flex items-end md:items-center justify-center backdrop-blur-sm" data-section={section}>
      <div className="w-full md:max-w-lg max-h-[92vh] flex flex-col bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden"
        style={{ transform: dy ? `translateY(${dy}px)` : undefined, transition: dy ? "none" : "transform .2s" }}>
        <div className="touch-none cursor-grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} data-sheet-grab>
          <div className="mx-auto mt-2 w-10 h-1.5 rounded-full bg-slate-300 md:hidden" />
          <div className="px-5 pt-3 pb-3 flex items-center gap-2 border-b border-slate-100">
            <h4 className="flex-1 font-black text-slate-800 text-lg">{title}</h4>
            <button type="button" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} aria-label="Chiudi" className="p-2 rounded-full hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
        <div className="px-5 py-4 overflow-y-auto space-y-4">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-slate-100 flex gap-3">{footer}</div>}
      </div>
    </div>
  );
};

export const Field = ({ label, children, hint }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-black text-slate-500 uppercase tracking-wide">{label}</span>
    {children}
    {hint && <span className="block text-xs text-slate-500">{hint}</span>}
  </label>
);

export const PrimaryBtn = ({ children, color = "blue", ...p }) => (
  <button
    type="button"
    {...p}
    className={`flex-1 h-12 rounded-xl bg-${color}-600 hover:bg-${color}-700 text-white font-black text-sm uppercase tracking-wide disabled:opacity-50 ${p.className || ""}`}
  >
    {children}
  </button>
);
export const GhostBtn = ({ children, danger, ...p }) => (
  <button
    type="button"
    {...p}
    className={`h-12 px-4 rounded-xl border font-bold text-sm ${
      danger ? "border-red-200 text-red-600 bg-red-50" : "border-slate-300 text-slate-700 bg-white"
    } ${p.className || ""}`}
  >
    {children}
  </button>
);

export const Empty = ({ children }) => (
  <p className="text-sm text-slate-500 text-center py-10 px-6 leading-relaxed">{children}</p>
);
