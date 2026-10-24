import React, { useState, useMemo } from "react";
import { fuzzyFilter } from "../fuzzy";
import { EmptyState } from "../components/EmptyState";
import { Search, ChevronRight, Users } from "lucide-react";
import { getTechsString, getSafeMatricola } from "../utils";
import { PRO_INPUT, getProPanelClass } from "../ui";
import { PrintLogButton } from "../components/PrintLogButton";

export const DatabaseView = ({
  customers,
  machines,
  logs,
  themeColor,
  onOpenCustomer,
  onOpenMachine,
}) => {
  const [tab, setTab] = useState("customers");
  const [searchTerm, setSearchTerm] = useState("");
  const color = themeColor || "blue";

  const filteredData = useMemo(() => {
    // ricerca che perdona gli errori di battitura (vedi fuzzy.js)
    const s = searchTerm;
    if (tab === "customers") return fuzzyFilter(customers.filter((c) => c.name), s, (c) => c.name);
    if (tab === "machines") return fuzzyFilter(machines, s, (m) => `${m.matricola || m.id} ${m.customerName || ""}`);
    if (tab === "logs") return fuzzyFilter(logs, s, (l) => `${l.description || ""} ${l.machineId || ""} ${l.customer || ""}`);
    return [];
  }, [tab, searchTerm, customers, machines, logs]);

  return (
    <div
      className={`h-[calc(100vh-160px)] md:h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-500 ${getProPanelClass(
        color
      )} overflow-hidden`}
    >
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTab("customers")}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === "customers"
                ? `bg-${color}-600 text-white shadow-md`
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Clienti
          </button>
          <button
            onClick={() => setTab("machines")}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === "machines"
                ? `bg-${color}-600 text-white shadow-md`
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Gru
          </button>
          <button
            onClick={() => setTab("logs")}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === "logs"
                ? `bg-${color}-600 text-white shadow-md`
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Interventi
          </button>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Cerca nel database..."
            className={PRO_INPUT}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute right-3 top-3 text-slate-400 w-5 h-5" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 bg-slate-100 custom-scrollbar">
        {filteredData.length === 0 && (
          <EmptyState title="Niente da mostrare" text="Prova a cambiare quello che hai scritto nella ricerca." />
        )}
        {tab === "customers" &&
          filteredData.map((c) => (
            <div
              key={c.id}
              onClick={() => onOpenCustomer(c.name)}
              className="p-4 mb-2 bg-white rounded-xl shadow-sm border border-slate-200 flex justify-between items-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                  <Users className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-slate-700">
                  {c.name}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          ))}
        {tab === "machines" &&
          filteredData.map((m) => (
            <div
              key={m.id}
              onClick={() => onOpenMachine(getSafeMatricola(m), m.customerName)}
              className="p-4 mb-2 bg-white rounded-xl shadow-sm border border-slate-200 flex justify-between items-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div>
                <span className="font-black text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {getSafeMatricola(m)}
                </span>
                <p className="text-[10px] font-bold text-slate-500 mt-1">
                  {m.customerName}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block">
                  {m.type}
                </span>
              </div>
            </div>
          ))}
        {tab === "logs" &&
          filteredData.map((l) => (
            <div
              key={l.id}
              className="p-4 mb-2 bg-white rounded-xl shadow-sm border border-slate-200 transition-all"
            >
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {l.dateString}
                </span>
                <span className="text-[10px] font-bold text-blue-600">
                  {getTechsString(l)}
                </span>
              </div>
              <div className="font-bold text-xs text-slate-800 mb-1">
                {l.customer} - {l.machineId}
              </div>
              <p className="text-[11px] text-slate-500 italic whitespace-pre-wrap break-words">
                "{l.description}"
              </p>
              <div className="mt-2">
                <PrintLogButton log={l} />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
