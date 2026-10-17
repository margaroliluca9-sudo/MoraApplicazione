import React from "react";
import {
  PlusCircle,
  History,
  Settings,
  Briefcase,
  Database,
  Folder,
} from "lucide-react";

// --- VIEWS PRINCIPALI ---

export const DashboardView = ({ onNavigate, layoutConfig, onAdminAccess }) => {
  const color = layoutConfig?.themeColor || "blue";
  const order = layoutConfig?.dashboardOrder || [
    "new",
    "explore",
    "history",
    "database",
    "office",
    "admin",
  ];

  const items = {
    new: {
      id: "new",
      label: "Nuovo Rapporto",
      icon: PlusCircle,
      desc: "Registra nuovo intervento",
      action: () => onNavigate("new"),
      primary: true,
    },
    explore: {
      id: "explore",
      label: "Esplora",
      icon: Folder,
      desc: "Sfoglia clienti e macchine",
      action: () => onNavigate("explore"),
    },
    history: {
      id: "history",
      label: "Storico",
      icon: History,
      desc: "Cronologia interventi",
      action: () => onNavigate("history"),
    },
    database: {
      id: "database",
      label: "Database",
      icon: Database,
      desc: "Gestione anagrafiche",
      action: () => onNavigate("database"),
    },
    office: {
      id: "office",
      label: "Ufficio",
      icon: Briefcase,
      desc: "Statistiche e stampe",
      action: () => onNavigate("office"),
    },
    admin: {
      id: "admin",
      label: "Impostazioni",
      icon: Settings,
      desc: "Configurazione app",
      action: onAdminAccess,
    },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {order.map((key) => {
        const item = items[key];
        if (!item) return null;
        const Icon = item.icon;

        if (item.primary) {
          return (
            <button
              key={key}
              onClick={item.action}
              className={`col-span-1 md:col-span-2 lg:col-span-3 p-8 rounded-3xl shadow-lg border-2 border-transparent bg-${color}-600 hover:bg-${color}-700 text-white flex flex-col md:flex-row items-center justify-center gap-4 transition-all active:scale-95 group`}
            >
              <div
                className={`p-4 bg-white/20 rounded-full group-hover:scale-110 transition-transform`}
              >
                <Icon className="w-10 h-10" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-2xl font-black uppercase tracking-tight">
                  {item.label}
                </h3>
                <p className={`text-${color}-100 font-medium mt-1`}>
                  {item.desc}
                </p>
              </div>
            </button>
          );
        }

        return (
          <button
            key={key}
            onClick={item.action}
            className={`p-6 bg-white rounded-3xl shadow-sm border border-slate-200 hover:border-${color}-300 hover:shadow-md flex flex-col items-center justify-center gap-4 transition-all active:scale-95 group`}
          >
            <div
              className={`p-4 bg-${color}-50 text-${color}-600 rounded-2xl group-hover:bg-${color}-600 group-hover:text-white transition-colors`}
            >
              <Icon className="w-8 h-8" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                {item.label}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};
