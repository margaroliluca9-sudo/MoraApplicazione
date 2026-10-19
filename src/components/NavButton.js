import React from "react";

// --- COMPONENTI UI MINORI ---
export const NavButton = React.memo(
  ({ icon: Icon, label, active, onClick, desktop = false, color = "blue" }) => {
    if (desktop) {
      return (
        <button
          onClick={onClick}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
            active
              ? `bg-${color}-700 text-white shadow-md`
              : `text-slate-600 hover:bg-white`
          }`}
        >
          <Icon className="w-4 h-4" /> {label}
        </button>
      );
    }
    return (
      <button
        onClick={onClick}
        className="flex-1 flex flex-col items-center justify-center gap-1 group py-2 transition-all active:scale-95"
      >
        <div
          className={`p-2 rounded-xl transition-all duration-300 ${
            active
              ? `bg-${color}-700 text-white shadow-lg scale-110`
              : "text-slate-400 hover:bg-slate-200"
          }`}
        >
          <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
        </div>
        <span
          className={`text-[11px] font-black uppercase tracking-tight mt-0.5 transition-colors ${
            active ? `text-${color}-800` : "text-slate-500"
          }`}
        >
          {label}
        </span>
      </button>
    );
  }
);
