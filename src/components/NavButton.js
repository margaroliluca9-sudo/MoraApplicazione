import React from "react";

// --- COMPONENTI UI MINORI ---
export const NavButton = React.memo(
  ({ icon: Icon, label, active, onClick, desktop = false, color = "blue", big = false, id }) => {
    if (desktop) {
      return (
        <button
          onClick={onClick}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm transition-all duration-200 ${
            active
              ? `bg-${color}-700 text-white shadow-md`
              : `text-slate-600 hover:bg-white`
          }`}
        >
          <Icon className="w-4 h-4" /> {label}
        </button>
      );
    }
    // tasto grande al centro (Nuovo rapporto): tondo pieno, un po' più in alto della barra
    if (big)
      return (
        <button onClick={onClick} data-nav={id} aria-current={active ? "page" : undefined} className="flex-1 flex flex-col items-center justify-end gap-1 transition-transform active:scale-95">
          <span className={`-mt-6 w-14 h-14 rounded-full bg-${color}-600 text-white flex items-center justify-center shadow-lg shadow-${color}-600/30 ring-4 ring-white`}>
            <Icon className="w-7 h-7" strokeWidth={2.4} />
          </span>
          <span className={`text-xs font-bold text-${color}-700`}>{label}</span>
        </button>
      );
    return (
      <button
        onClick={onClick}
        data-nav={id}
        aria-current={active ? "page" : undefined}
        className="flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-transform active:scale-95"
      >
        <span
          className={`w-14 h-8 rounded-full flex items-center justify-center transition-colors duration-300 ${
            active ? `bg-${color}-100 text-${color}-700` : "text-slate-500"
          }`}
        >
          <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 2} />
        </span>
        <span
          className={`text-xs transition-colors ${
            active ? `font-bold text-${color}-700` : "font-semibold text-slate-500"
          }`}
        >
          {label}
        </span>
      </button>
    );
  }
);
