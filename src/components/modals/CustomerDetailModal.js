import React from "react";
import { EmptyState } from "../EmptyState";
import {
  X,
  ChevronRight,
  Users,
  Printer,
  Clock,
  Camera,
} from "lucide-react";
import { formatCapacity, getSafeMatricola, getTechsString, lastLog } from "../../utils";
import { getProPanelClass } from "../../ui";
import { printCustomer } from "../PrintCustomer";

export const CustomerDetailModal = ({
  customerName,
  customers = [],
  machines,
  logs = [],
  onClose,
  onOpenMachine,
  themeColor,
}) => {
  const color = themeColor || "blue";
  const customerMachines = machines.filter(
    (m) => m.customerName === customerName
  );
  // interventi di questo cliente: l'ultimo in cima, e per ogni gru la data del suo ultimo
  const myLogs = logs.filter((l) => l.customer === customerName);
  const last = lastLog(myLogs);
  const lastOf = (m) => lastLog(myLogs.filter((l) => l.machineId === getSafeMatricola(m)));

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className={`w-full max-w-2xl h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl ${getProPanelClass(
          color
        )}`}
      >
        <div className="bg-slate-50 p-6 flex justify-between items-center gap-3 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-3 bg-${color}-100 rounded-xl text-${color}-600`}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-800 break-words">
                {customerName}
              </h2>
              <p className="text-xs text-slate-500 font-bold">
                {customerMachines.length} Gru Registrate
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => printCustomer({ customerName, customers, machines, logs })}
              data-action="print-customer"
              className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-sm text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
              aria-label="Stampa scheda cliente"
            >
              <Printer className="w-4 h-4" />
              <span className="font-bold text-[10px] uppercase tracking-wider">
                Stampa
              </span>
            </button>
            <button
              onClick={onClose}
              aria-label="Chiudi"
              className="p-2 bg-white rounded-full border border-slate-300 hover:bg-slate-100 transition-all text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-100">
          {last ? (
            <button
              type="button"
              onClick={() => onOpenMachine(last.machineId, customerName)}
              data-customer-last={last.machineId}
              className={`w-full text-left mb-4 bg-white rounded-2xl border-2 border-${color}-200 p-4 shadow-sm active:scale-[0.99] transition-all`}
            >
              <span className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-${color}-700`}>
                <Clock className="w-4 h-4" /> Ultimo intervento
              </span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                <span className="font-black text-slate-800">{last.dateString}</span>
                <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded">Gru {last.machineId}</span>
                <span className="text-xs font-bold text-slate-500">{getTechsString(last)}</span>
                {last.photos && last.photos.length > 0 && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                    <Camera className="w-3 h-3" /> {last.photos.length}
                  </span>
                )}
              </span>
              {last.description && <span className="block mt-1.5 text-sm text-slate-600 leading-snug line-clamp-3 whitespace-pre-wrap break-words">{last.description}</span>}
              <span className={`flex items-center gap-1 mt-2 text-xs font-black text-${color}-700`}>
                Apri la gru <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          ) : (
            <p className="mb-4 text-xs font-bold text-slate-400 text-center" data-customer-last="">Ancora nessun intervento per questo cliente.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerMachines.length === 0 && (
              <div className="col-span-full">
                <EmptyState color={color} title="Nessuna gru per questo cliente" text="Le gru compaiono qui appena c'è il primo rapporto." />
              </div>
            )}
            {customerMachines.map((m) => {
              const ml = lastOf(m);
              return (
              <div
                key={m.id}
                onClick={() => onOpenMachine(getSafeMatricola(m), customerName)}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-black text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    MAT: {getSafeMatricola(m)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg uppercase">
                    {m.type}
                  </span>
                  {m.capacity && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg uppercase">
                      {formatCapacity(m.capacity)}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[11px] font-bold text-slate-500" data-machine-last>
                  {ml ? `Ultimo intervento: ${ml.dateString}` : "Nessun intervento"}
                </p>
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
