import React, { useMemo } from "react";
import {
  Factory,
  User,
  X,
  Calendar as CalendarIcon,
  ClipboardList,
  ArrowLeft,
  Camera,
} from "lucide-react";
import { getTechsString, formatCapacity, getSafeMatricola } from "../../utils";
import { getProPanelClass } from "../../ui";
import { ROPE_ITEMS, formatRopeLong, lastRopeOf } from "../../ropes";
import { AssistantPanel } from "../AssistantPanel";
import { PrintLogButton } from "../PrintLogButton";

export const MachineHistoryModal = ({
  machine,
  allLogs,
  onClose,
  onOpenCustomer,
  onOpenPhotos,
  themeColor,
}) => {
  const machineLogs = useMemo(() => {
    const mat = getSafeMatricola(machine).toLowerCase();
    const cust = machine.customerName.toUpperCase();
    return allLogs.filter(
      (l) =>
        l.machineId.toLowerCase() === mat && l.customer.toUpperCase() === cust
    );
  }, [allLogs, machine]);

  const color = themeColor || "blue";

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className={`w-full max-w-4xl h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl ${getProPanelClass(
          color
        )}`}
      >
        <div
          className={`bg-slate-50 p-6 flex flex-col gap-4 border-b border-slate-200 relative overflow-hidden`}
        >
          <div className="flex justify-between items-start relative z-10">
            <button
              onClick={onClose}
              className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm transition-all active:scale-95 group text-slate-600"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
              <span className="font-bold text-[10px] uppercase tracking-wider">
                Indietro
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white rounded-full border border-slate-300 hover:bg-slate-100 transition-all text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div
              className={`p-3 bg-${color}-100 rounded-xl border border-${color}-200 text-${color}-700`}
            >
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <button
                onClick={() => onOpenCustomer(machine.customerName)}
                className="text-left group/title"
              >
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-tight text-slate-800 hover:text-blue-700 transition-colors underline decoration-slate-300 underline-offset-4 decoration-2">
                  {machine.customerName}
                </h2>
              </button>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 mt-2">
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  MAT: {getSafeMatricola(machine)}
                </span>
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  {machine.type}
                </span>
                {machine.capacity && (
                  <span className="bg-white px-2 py-1 rounded border border-slate-200">
                    {formatCapacity(machine.capacity)}
                  </span>
                )}
              </div>
              {ROPE_ITEMS.map(({ id, title }) => {
                const last = lastRopeOf(machineLogs, id);
                return last ? (
                  <div
                    key={id}
                    data-last-rope={id}
                    className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-2 w-fit max-w-full"
                  >
                    Ultima {title.toLowerCase()} ({last.dateString}):{" "}
                    {formatRopeLong(last[id])}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-100">
          <div className="mb-4">
            <AssistantPanel machineLogs={machineLogs} />
          </div>
          <div className="space-y-4">
            {machineLogs.map((log, idx) => (
              <div key={log.id} className="flex gap-4 group">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 bg-${color}-600 rounded-full ring-4 ring-slate-200 mt-1.5 shrink-0`}
                  ></div>
                  {idx !== machineLogs.length - 1 && (
                    <div className="w-0.5 bg-slate-300 flex-1 my-1 rounded-full"></div>
                  )}
                </div>
                <div
                  className={`p-5 rounded-2xl flex-1 relative overflow-hidden group/card transition-all ${getProPanelClass(
                    color
                  )} hover:shadow-md`}
                >
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div
                      className={`flex items-center gap-2 bg-${color}-50 px-2 py-1 rounded-lg border border-${color}-100`}
                    >
                      <CalendarIcon className={`w-3 h-3 text-${color}-600`} />
                      <span
                        className={`text-${color}-800 font-bold text-[10px] uppercase tracking-wider`}
                      >
                        {log.dateString}
                      </span>
                    </div>

                    {/* INFO TECNICO E FOTO */}
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg text-slate-500 border border-slate-100">
                        <User className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-tight">
                          {getTechsString(log)}
                        </span>
                      </div>
                      {log.photos && log.photos.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPhotos(log.photos);
                          }}
                          className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg uppercase flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                        >
                          <Camera className="w-3 h-3" /> {log.photos.length}{" "}
                          FOTO
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-700 text-xs md:text-sm leading-relaxed font-medium relative z-10 italic whitespace-pre-wrap break-words">
                    "{log.description}"
                  </p>
                  {ROPE_ITEMS.filter(({ id }) => log[id]).map(({ id, title }) => (
                    <div
                      key={id}
                      className="relative z-10 mt-3 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 w-fit max-w-full"
                    >
                      {title} sostituita: {formatRopeLong(log[id])}
                    </div>
                  ))}
                  <div className="relative z-10 mt-3 flex justify-end">
                    <PrintLogButton log={log} />
                  </div>
                </div>
              </div>
            ))}
            {machineLogs.length === 0 && (
              <div className="text-center py-20 opacity-30">
                <ClipboardList className="w-16 h-16 mx-auto mb-2 text-slate-400" />
                <p className="font-bold uppercase text-xs tracking-widest text-slate-500">
                  Nessun dato
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
