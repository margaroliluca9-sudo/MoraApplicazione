import React from "react";

export const AdminTab = React.memo(
  ({ active, onClick, icon: Icon, label, color = "blue" }) => (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[90px] flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${
        active
          ? `bg-${color}-700 text-white shadow-md border-b-4 border-${color}-900`
          : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-300 shadow-sm"
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  )
);
