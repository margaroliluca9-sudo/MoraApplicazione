// Interruttore acceso/spento (uguale in tutta l'app): verde = acceso.
import React from "react";

export const Switch = ({ on, onChange, label, id }) => (
  <button
    type="button"
    role="switch"
    aria-checked={!!on}
    aria-pressed={!!on}
    aria-label={label}
    data-switch={id}
    onClick={() => onChange(!on)}
    className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${on ? "bg-emerald-500" : "bg-slate-300"}`}
  >
    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`} />
  </button>
);

// riga di impostazione: titolo, spiegazione e interruttore
export const SwitchRow = ({ title, text, on, onChange, id, section }) => (
  <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white" data-section={section}>
    <div className="min-w-0">
      <span className="text-sm font-bold text-slate-800 block">{title}</span>
      <span className="text-xs text-slate-500 leading-snug block mt-0.5">{text}</span>
    </div>
    <Switch on={on} onChange={onChange} label={title} id={id} />
  </div>
);
