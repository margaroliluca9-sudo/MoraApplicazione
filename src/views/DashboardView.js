import React, { useMemo, useState } from "react";
import {
  PlusCircle,
  Search,
  X,
  User,
  Users,
  Factory,
  ClipboardList,
  ChevronRight,
  History,
  Settings,
  Briefcase,
  Database,
  Folder,
} from "lucide-react";

import { getSafeMatricola } from "../utils";
import { formatRope } from "../ropes";
import {
  MyLogsModal,
  isMyLog,
  isThisMonth,
} from "../components/modals/MyLogsModal";

// --- VIEWS PRINCIPALI ---

// testo semplificato per la ricerca: minuscole, senza accenti, punti e trattini
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
const dateKey = (ds) => {
  const p = String(ds || "")
    .split("/")
    .map(Number);
  return p.length === 3 && p.every((n) => !isNaN(n))
    ? p[2] * 10000 + p[1] * 100 + p[0]
    : 0;
};
const MAX = { customers: 5, machines: 5, logs: 8 };

export const DashboardView = ({
  onNavigate,
  layoutConfig,
  onAdminAccess,
  logs = [],
  customers = [],
  machines = [],
  currentTechName = "",
  onOpenCustomer = () => {},
  onOpenMachine = () => {},
}) => {
  const color = layoutConfig?.themeColor || "blue";
  const [query, setQuery] = useState("");
  const [showMine, setShowMine] = useState(false);
  let order = layoutConfig?.dashboardOrder || [
    "new",
    "explore",
    "history",
    "database",
    "office",
    "admin",
  ];
  // riquadro "I miei interventi" subito dopo "Nuovo Rapporto"
  if (currentTechName && !order.includes("mine")) {
    order = [...order];
    const i = order.indexOf("new");
    order.splice(i === -1 ? 0 : i + 1, 0, "mine");
  }

  const myMonthCount = useMemo(
    () =>
      logs.filter((l) => isMyLog(l, currentTechName) && isThisMonth(l)).length,
    [logs, currentTechName],
  );

  // RICERCA UNICA: clienti, gru, interventi (anche per N. assistenza)
  const tokens = query.trim().split(/\s+/).map(norm).filter(Boolean);
  const searching = query.trim().length >= 2 && tokens.length > 0;
  const results = useMemo(() => {
    if (!searching) return null;
    const hit = (text) => {
      const h = norm(text);
      return tokens.every((t) => h.includes(t));
    };
    const cs = customers.filter((c) => hit(c.name));
    const ms = machines.filter((m) =>
      hit(`${getSafeMatricola(m)} ${m.customerName} ${m.type || ""}`),
    );
    const ls = logs
      .filter((l) =>
        hit(
          `${l.ticketNumber || ""} ${l.customer} ${l.machineId} ${l.description} ${l.technician} ${(l.additionalTechnicians || []).join(" ")} ${l.dateString} ${formatRope(l.fune)} ${formatRope(l.catena)}`,
        ),
      )
      .sort((a, b) => dateKey(b.dateString) - dateKey(a.dateString));
    return { cs, ms, ls };
  }, [query, customers, machines, logs]);

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
    mine: {
      id: "mine",
      label: "I miei interventi",
      icon: User,
      desc:
        myMonthCount === 1
          ? "1 intervento questo mese"
          : `${myMonthCount} interventi questo mese`,
      action: () => setShowMine(true),
    },
  };

  const Section = ({ title, icon: Icon, total, max, children }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">
        <Icon className="w-3.5 h-3.5" /> {title} ({total})
      </div>
      {children}
      {total > max && (
        <p className="text-[10px] text-slate-400 ml-1">
          Altri {total - max}: scrivi di più per restringere
        </p>
      )}
    </div>
  );
  const rowClass =
    "w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-3";

  const searchBox = (
    <div className="relative" data-section="home-search">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
      <input
        type="text"
        aria-label="Cerca clienti, gru, interventi"
        placeholder="Cerca cliente, gru, N. assistenza..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm font-semibold text-sm text-slate-800 outline-none placeholder:text-slate-400"
      />
      {query && (
        <button
          type="button"
          aria-label="Cancella ricerca"
          onClick={() => setQuery("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      )}
    </div>
  );

  if (searching) {
    const { cs, ms, ls } = results;
    const none = !cs.length && !ms.length && !ls.length;
    return (
      <div className="space-y-5" data-section="search-results">
        {searchBox}
        {none && (
          <p className="text-sm text-slate-400 italic text-center py-8">
            Nessun risultato per "{query.trim()}".
          </p>
        )}
        {cs.length > 0 && (
          <Section
            title="Clienti"
            icon={Users}
            total={cs.length}
            max={MAX.customers}
          >
            {cs.slice(0, MAX.customers).map((c) => (
              <button
                key={c.id}
                type="button"
                className={rowClass}
                onClick={() => onOpenCustomer(c.name)}
              >
                <span className="flex-1 min-w-0 font-bold text-sm text-slate-800 truncate">
                  {c.name}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </Section>
        )}
        {ms.length > 0 && (
          <Section
            title="Gru"
            icon={Factory}
            total={ms.length}
            max={MAX.machines}
          >
            {ms.slice(0, MAX.machines).map((m) => (
              <button
                key={m.id}
                type="button"
                className={rowClass}
                onClick={() =>
                  onOpenMachine(getSafeMatricola(m), m.customerName)
                }
              >
                <span className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-slate-800 block truncate">
                    {getSafeMatricola(m)}
                  </span>
                  <span className="text-xs text-slate-500 block truncate">
                    {m.customerName}
                    {m.type ? ` · ${m.type}` : ""}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </Section>
        )}
        {ls.length > 0 && (
          <Section
            title="Interventi"
            icon={ClipboardList}
            total={ls.length}
            max={MAX.logs}
          >
            {ls.slice(0, MAX.logs).map((l) => (
              <button
                key={l.id}
                type="button"
                className={rowClass}
                onClick={() => onOpenMachine(l.machineId, l.customer)}
              >
                <span className="flex-1 min-w-0">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">
                    {l.dateString}
                    {l.ticketNumber ? ` · N. ${l.ticketNumber}` : ""}
                  </span>
                  <span className="font-bold text-sm text-slate-800 block truncate">
                    {l.customer} · {l.machineId}
                  </span>
                  <span className="text-xs text-slate-500 block truncate">
                    {l.description}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </Section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {searchBox}
      {showMine && (
        <MyLogsModal
          logs={logs}
          techName={currentTechName}
          color={color}
          onClose={() => setShowMine(false)}
          onOpenMachine={onOpenMachine}
        />
      )}
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
    </div>
  );
};
