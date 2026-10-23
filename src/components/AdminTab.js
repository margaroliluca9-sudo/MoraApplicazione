import React from "react";

// pulsanti in alto nelle Impostazioni: pillole in una barra che scorre
export const AdminTab = React.memo(({ active, onClick, icon: Icon, label, color = "blue" }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`shrink-0 flex items-center gap-2 h-10 px-4 rounded-full font-bold text-sm transition-colors ${
      active ? `bg-${color}-600 text-white shadow-sm` : "text-slate-600 hover:bg-slate-100"
    }`}
  >
    <Icon className="w-4 h-4" /> {label}
  </button>
));
