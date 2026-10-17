// Classi grafiche comuni (input, bottoni, pannelli).
// --- STILI GLOBALI ---
export const PRO_INPUT =
  "w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400";

export const PRO_BUTTON_SECONDARY =
  "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-sm active:scale-95 transition-all font-bold";

export const getButtonPrimaryClass = (color) =>
  `bg-${color}-700 text-white shadow-md hover:bg-${color}-800 active:scale-95 transition-all border border-transparent font-bold tracking-wide`;

export const getProPanelClass = (color) =>
  `bg-white rounded-xl shadow-md border-t-4 border-t-${color}-600 border-x border-b border-slate-200`;
