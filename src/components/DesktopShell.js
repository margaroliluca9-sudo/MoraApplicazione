// TABLET E PC: l'app sembra un programma. A sinistra il menu sempre visibile, in alto le schede
// aperte (come nel browser): si passa da una all'altra con un clic e si chiudono con la ×.
// Sotto i 768 px resta la versione telefono (barra in basso).
import React from "react";
import { Home, PlusCircle, History, Folder, Database, Briefcase, UserCircle, Settings, X } from "lucide-react";
import { CraneMark } from "./CraneMark";

export const TAB_INFO = {
  dashboard: { label: "Home", icon: Home },
  new: { label: "Nuovo rapporto", icon: PlusCircle },
  history: { label: "Storico", icon: History },
  explore: { label: "Esplora", icon: Folder },
  database: { label: "Elenco gru", icon: Database },
  office: { label: "Ufficio", icon: Briefcase },
  area: { label: "La mia area", icon: UserCircle },
  admin: { label: "Impostazioni", icon: Settings },
};

export const Sidebar = ({ active, onGo, onArea, onAdmin, isOffice, title, color = "blue", compact }) => {
  const items = isOffice
    ? [["dashboard"], ["history", "Interventi"], ["explore"]]
    : [["dashboard"], ["new"], ["history"], ["explore"], ["office"]];
  const Item = ({ id, label, icon: Icon, onClick, on }) => (
    <button
      type="button"
      data-side={id}
      onClick={onClick}
      title={label}
      className={`w-full flex items-center ${compact ? "flex-col gap-1 py-2.5 px-1" : "gap-3 px-3 h-11"} rounded-xl font-bold transition-colors ${
        on ? `bg-${color}-600 text-white shadow-sm` : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className={compact ? "text-[10px] leading-tight text-center" : "text-sm truncate"}>{label}</span>
    </button>
  );
  return (
    <aside
      className={`fixed left-0 bottom-0 z-40 bg-white border-r border-slate-200 flex flex-col ${compact ? "w-20 px-2" : "w-60 px-3"} py-4 gap-1`}
      style={{ top: "var(--mora-safe-top)" }}
      data-section="sidebar"
    >
      <button type="button" onClick={() => onGo("dashboard")} className={`flex items-center ${compact ? "justify-center" : "gap-3 px-2"} mb-4`}>
        <span className={`p-2 rounded-xl bg-${color}-600 text-white shadow-lg`}>
          <CraneMark className="w-5 h-5" />
        </span>
        {!compact && <span className="font-black uppercase tracking-tighter text-slate-800 leading-none text-left">{title}</span>}
      </button>
      {items.map(([id, label]) => (
        <Item key={id} id={id} label={label || TAB_INFO[id].label} icon={TAB_INFO[id].icon} on={active === id || (id === "explore" && active === "database")} onClick={() => onGo(id)} />
      ))}
      {!isOffice && <Item id="area" label="La mia area" icon={UserCircle} on={active === "area"} onClick={onArea} />}
      <div className="flex-1" />
      {!isOffice && <Item id="admin" label="Impostazioni" icon={Settings} on={active === "admin"} onClick={onAdmin} />}
    </aside>
  );
};

export const TabStrip = ({ tabs, active, onGo, onClose, color = "blue" }) => (
  <div className="flex items-end gap-1 px-4 pt-2 border-b border-slate-200 bg-slate-100 overflow-x-auto no-scrollbar" data-section="tab-strip">
    {tabs.map((id) => {
      const info = TAB_INFO[id];
      if (!info) return null;
      const Icon = info.icon;
      const on = id === active;
      return (
        <div
          key={id}
          data-tab={id}
          className={`group flex items-center gap-2 h-10 pl-3 ${id === "dashboard" ? "pr-3" : "pr-1.5"} rounded-t-xl border border-b-0 cursor-pointer shrink-0 max-w-[220px] ${
            on ? "bg-white border-slate-200 text-slate-800 -mb-px" : "bg-slate-200/60 border-transparent text-slate-500 hover:bg-slate-200"
          }`}
          onClick={() => onGo(id)}
        >
          <Icon className={`w-4 h-4 shrink-0 ${on ? `text-${color}-600` : ""}`} />
          <span className="text-sm font-bold truncate">{info.label}</span>
          {id !== "dashboard" && (
            <button
              type="button"
              aria-label={`Chiudi scheda ${info.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(id);
              }}
              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-slate-300/70"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      );
    })}
  </div>
);
