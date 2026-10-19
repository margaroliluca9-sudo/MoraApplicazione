import React, { useMemo } from "react";
import {
  Factory,
  User,
  X,
  ClipboardList,
  Camera,
  PlusCircle,
} from "lucide-react";
import { getTechsString, formatCapacity, getSafeMatricola } from "../../utils";
import { ROPE_ITEMS, formatRopeLong, lastRopeOf } from "../../ropes";
import { AssistantPanel } from "../AssistantPanel";
import { PrintLogButton } from "../PrintLogButton";

// "oggi", "ieri", "5 giorni fa", "3 settimane fa", "2 mesi fa", "1 anno fa"
const agoLabel = (dateString) => {
  const [d, m, y] = String(dateString || "").split("/").map(Number);
  if (!d || !m || !y) return "";
  const t = new Date();
  const days = Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate()) - new Date(y, m - 1, d)) / 86400000);
  if (days <= 0) return "oggi";
  if (days === 1) return "ieri";
  if (days < 14) return `${days} giorni fa`;
  if (days < 45) return `${Math.round(days / 7)} settimane fa`;
  if (days < 365) return `${Math.round(days / 30)} mesi fa`;
  const yrs = Math.floor(days / 365);
  return yrs === 1 ? "1 anno fa" : `${yrs} anni fa`;
};

export const MachineHistoryModal = ({
  machine,
  allLogs,
  onClose,
  onOpenCustomer,
  onOpenPhotos,
  themeColor,
  onNewReport = null, // "Nuovo rapporto su questa gru" (non per l'ufficio)
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
    <div className="fixed inset-0 bg-slate-900/50 z-[200] flex items-stretch md:items-center justify-center md:p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-4xl h-full md:h-[90vh] md:rounded-3xl overflow-hidden flex flex-col shadow-2xl bg-white" data-section="machine-card">
        <div className="bg-white px-4 pt-4 pb-4 flex flex-col gap-3 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-${color}-50 text-${color}-700 flex items-center justify-center shrink-0`}>
              <Factory className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <button type="button" onClick={() => onOpenCustomer(machine.customerName)} className="text-left block max-w-full">
                <h2 className="text-xl font-black uppercase tracking-tight leading-tight text-slate-800 break-words">
                  {machine.customerName}
                </h2>
              </button>
              <p className="text-sm font-bold mt-1">
                <span className={`text-${color}-700`}>Gru {getSafeMatricola(machine)}</span>
                <span className="text-slate-500 font-semibold">
                  {machine.type ? ` · ${machine.type}` : ""}
                  {machine.capacity ? ` · ${formatCapacity(machine.capacity)}` : ""}
                </span>
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Chiudi" className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          {ROPE_ITEMS.map(({ id, title }) => {
            const last = lastRopeOf(machineLogs, id);
            return last ? (
              <div key={id} data-last-rope={id} className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Ultima {title.toLowerCase()} ({last.dateString}): {formatRopeLong(last[id])}
              </div>
            ) : null;
          })}
          <div className="relative z-10 space-y-3" data-section="machine-summary">
            <p className="text-sm font-semibold text-slate-600">
              <b className="text-slate-800">{machineLogs.length} {machineLogs.length === 1 ? "intervento" : "interventi"}</b>
              {machineLogs[0] ? ` · ultimo ${agoLabel(machineLogs[0].dateString)} (${getTechsString(machineLogs[0])})` : ""}
            </p>
            {onNewReport && (
              <button
                type="button"
                data-action="new-on-machine"
                onClick={() =>
                  onNewReport({
                    customer: machine.customerName,
                    machineId: getSafeMatricola(machine),
                    machineType: machine.type || "",
                    capacity: machine.capacity || "",
                  })
                }
                className={`w-full h-12 rounded-xl bg-${color}-600 text-white font-black flex items-center justify-center gap-2 active:scale-[0.98]`}
              >
                <PlusCircle className="w-5 h-5" /> Nuovo rapporto su questa gru
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50">
          <div className="mb-4">
            <AssistantPanel machineLogs={machineLogs} />
          </div>
          <div className="space-y-3">
            {machineLogs.map((log) => (
              <div key={log.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2" data-machine-log>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-black text-slate-800">
                    {log.dateString}
                    <span className="font-semibold text-slate-400"> · {agoLabel(log.dateString)}</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-500 min-w-0">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{getTechsString(log)}</span>
                  </span>
                </div>
                <p className="text-slate-700 text-[15px] leading-snug whitespace-pre-wrap break-words">{log.description}</p>
                {ROPE_ITEMS.filter(({ id }) => log[id]).map(({ id, title }) => (
                  <div key={id} className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 w-fit max-w-full">
                    {title} sostituita: {formatRopeLong(log[id])}
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {log.photos && log.photos.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => onOpenPhotos(log.photos)}
                      className="h-9 px-3 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 flex items-center gap-1.5"
                    >
                      <Camera className="w-4 h-4" /> {log.photos.length} foto
                    </button>
                  ) : (
                    <span />
                  )}
                  <PrintLogButton log={log} />
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
