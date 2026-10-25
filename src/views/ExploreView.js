import React, { useState, useMemo, useCallback } from "react";
import { fuzzyFilter } from "../fuzzy";
import {
  Search,
  Factory,
  ChevronRight,
  Users,
  Camera,
  Printer,
} from "lucide-react";
import { getTechsString, formatCapacity, getSafeMatricola } from "../utils";
import { PRO_INPUT, getProPanelClass } from "../ui";
import { PrintLogButton } from "../components/PrintLogButton";
import { placeOf } from "../places";
import { printCustomer } from "../components/PrintCustomer";

export const ExploreView = React.memo(
  ({ customers, machines, logs, color = "blue", onOpenPhotos }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCustomer, setExpandedCustomer] = useState(null);
    const [expandedMachine, setExpandedMachine] = useState(null);

    const filteredCustomers = useMemo(() => {
      if (!searchTerm) return customers;
      // perdona gli errori di battitura (vedi fuzzy.js)
      return fuzzyFilter(customers, searchTerm, (c) => `${c.name} ${c.city || ""}`);
    }, [customers, searchTerm]);

    const getCustomerMachines = useCallback(
      (customerName) => {
        return machines.filter((m) => m.customerName === customerName);
      },
      [machines]
    );

    const getMachineLogs = useCallback(
      (machineMatricola, customerName) => {
        return logs.filter(
          (l) => l.machineId === machineMatricola && l.customer === customerName
        );
      },
      [logs]
    );

    const toggleCustomer = (cName) => {
      setExpandedCustomer((prev) => (prev === cName ? null : cName));
      setExpandedMachine(null);
    };

    const toggleMachine = (e, mId) => {
      e.stopPropagation();
      setExpandedMachine((prev) => (prev === mId ? null : mId));
    };

    return (
      <div className="h-[calc(100vh-160px)] md:h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-500">
        <div className={`p-4 ${getProPanelClass(color)} mb-4`}>
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca Cliente..."
              className={PRO_INPUT}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-3 top-3.5 text-slate-400 w-5 h-5" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pb-20">
          {filteredCustomers.map((c) => {
            const isCustExpanded = expandedCustomer === c.name;
            const myMachines = isCustExpanded
              ? getCustomerMachines(c.name)
              : [];

            return (
              <div
                key={c.id}
                className={`bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden ${
                  isCustExpanded
                    ? `border-${color}-500 ring-1 ring-${color}-200`
                    : "border-slate-200"
                }`}
              >
                <div
                  onClick={() => toggleCustomer(c.name)}
                  className="p-4 flex justify-between items-center cursor-pointer bg-slate-50 hover:bg-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <Users
                      className={`w-5 h-5 ${
                        isCustExpanded ? `text-${color}-600` : "text-slate-400"
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block font-bold text-sm text-slate-700">
                        {c.name}
                      </span>
                      {placeOf(c) && (
                        <span className="block text-xs text-slate-500 truncate" data-customer-place>
                          {placeOf(c)}
                        </span>
                      )}
                    </span>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
                      isCustExpanded ? "rotate-90" : ""
                    }`}
                  />
                </div>

                {isCustExpanded && (
                  <div className="bg-white border-t border-slate-100">
                    <div className="px-4 pt-3 pb-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => printCustomer({ customerName: c.name, customers, machines, logs })}
                        data-action="print-customer"
                        className="h-9 px-3 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Printer className="w-4 h-4" /> Stampa scheda cliente
                      </button>
                    </div>
                    {myMachines.length === 0 && (
                      <div className="p-4 text-xs text-slate-400 italic text-center">
                        Nessuna gru registrata.
                      </div>
                    )}
                    {myMachines.map((m) => {
                      const isMachExpanded = expandedMachine === m.id;
                      const myLogs = isMachExpanded
                        ? getMachineLogs(getSafeMatricola(m), m.customerName)
                        : [];

                      return (
                        <div
                          key={m.id}
                          className="border-b border-slate-50 last:border-0"
                        >
                          <div
                            onClick={(e) => toggleMachine(e, m.id)}
                            className="p-3 pl-8 flex justify-between items-center cursor-pointer hover:bg-blue-50/50"
                          >
                            <div className="flex items-center gap-3">
                              <Factory
                                className={`w-4 h-4 ${
                                  isMachExpanded
                                    ? "text-orange-500"
                                    : "text-slate-300"
                                }`}
                              />
                              <div>
                                <span className="text-xs font-black text-slate-700 block">
                                  {getSafeMatricola(m)}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 rounded border border-slate-200 uppercase">
                                    {m.type}
                                  </span>
                                  {m.capacity && (
                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 rounded border border-slate-200 uppercase">
                                      {formatCapacity(m.capacity)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ChevronRight
                              className={`w-3 h-3 text-slate-300 transition-transform duration-300 ${
                                isMachExpanded ? "rotate-90" : ""
                              }`}
                            />
                          </div>

                          {isMachExpanded && (
                            <div className="bg-slate-50/50 p-2 pl-12 space-y-2">
                              {myLogs.length === 0 && (
                                <div className="text-[10px] text-slate-400 italic">
                                  Nessun intervento.
                                </div>
                              )}
                              {myLogs.map((l) => (
                                <div
                                  key={l.id}
                                  className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative"
                                >
                                  <div className="flex justify-between mb-1">
                                    <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                                      {l.dateString}
                                    </span>
                                    <span className="text-[9px] font-bold text-blue-600">
                                      {getTechsString(l)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap break-words mb-2">
                                    "{l.description}"
                                  </p>
                                  {/* BOTTONE FOTO ESPLORA */}
                                  {l.photos && l.photos.length > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenPhotos(l.photos);
                                      }}
                                      className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg uppercase flex items-center gap-1 w-fit hover:bg-emerald-100 transition-colors"
                                    >
                                      <Camera className="w-3 h-3" />{" "}
                                      {l.photos.length} FOTO
                                    </button>
                                  )}
                                  <div className="mt-2">
                                    <PrintLogButton log={l} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
