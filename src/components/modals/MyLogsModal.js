import React, { useMemo, useState } from "react";
import { X, User, ChevronRight, Camera } from "lucide-react";
import { getTechsString } from "../../utils";
import { getProPanelClass } from "../../ui";
import { PrintLogButton } from "../PrintLogButton";

// Data "g/m/aaaa" -> numero ordinabile
const dateKey = (ds) => {
  const p = String(ds || "")
    .split("/")
    .map(Number);
  return p.length === 3 && p.every((n) => !isNaN(n))
    ? p[2] * 10000 + p[1] * 100 + p[0]
    : 0;
};

// Interventi in cui il tecnico era principale o aggiuntivo
export const isMyLog = (log, techName) => {
  const me = String(techName || "")
    .trim()
    .toLowerCase();
  if (!me) return false;
  const all = [log.technician, ...(log.additionalTechnicians || [])];
  return all.some(
    (t) =>
      String(t || "")
        .trim()
        .toLowerCase() === me,
  );
};

export const isThisMonth = (log, now = new Date()) => {
  const p = String(log.dateString || "")
    .split("/")
    .map(Number);
  return (
    p.length === 3 && p[1] === now.getMonth() + 1 && p[2] === now.getFullYear()
  );
};

export const MyLogsModal = ({
  logs,
  techName,
  onClose,
  onOpenMachine,
  color = "blue",
}) => {
  const [range, setRange] = useState("month");
  const mine = useMemo(
    () =>
      logs
        .filter((l) => isMyLog(l, techName))
        .sort((a, b) => dateKey(b.dateString) - dateKey(a.dateString)),
    [logs, techName],
  );
  const shown = range === "month" ? mine.filter((l) => isThisMonth(l)) : mine;

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[150] flex items-center justify-center p-4 backdrop-blur-md">
      <div
        className={`w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl overflow-hidden ${getProPanelClass(color)}`}
        data-section="my-logs"
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-xl bg-${color}-50 text-${color}-600 shrink-0`}
            >
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-slate-800 uppercase text-lg leading-tight">
                I miei interventi
              </h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase truncate">
                {techName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="p-2 hover:bg-slate-100 rounded-full shrink-0"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div
            className="flex bg-slate-100 p-1 rounded-lg w-fit"
            role="group"
            aria-label="Periodo"
          >
            {[
              [
                "month",
                `Questo mese (${mine.filter((l) => isThisMonth(l)).length})`,
              ],
              ["all", `Tutti (${mine.length})`],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={range === id}
                onClick={() => setRange(id)}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                  range === id
                    ? "bg-white shadow text-slate-800"
                    : "text-slate-500"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2 custom-scrollbar">
          {shown.length === 0 && (
            <p className="text-sm text-slate-400 italic text-center py-8">
              {range === "month"
                ? "Nessun intervento questo mese."
                : "Nessun intervento a tuo nome."}
            </p>
          )}
          {shown.map((l) => (
            <div key={l.id} className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => onOpenMachine(l.machineId, l.customer)}
              className="flex-1 min-w-0 text-left p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center gap-3"
              data-my-log={l.id}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase">
                    {l.dateString}
                  </span>
                  {l.ticketNumber && (
                    <span className={`text-[10px] font-bold text-${color}-600`}>
                      N. {l.ticketNumber}
                    </span>
                  )}
                  {l.photos && l.photos.length > 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <Camera className="w-3 h-3" /> {l.photos.length}
                    </span>
                  )}
                </div>
                <div className="font-bold text-sm text-slate-800 truncate">
                  {l.customer} · {l.machineId}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {l.description}
                </div>
                {(l.additionalTechnicians || []).length > 0 && (
                  <div className="text-[10px] text-slate-400 truncate">
                    Con: {getTechsString(l)}
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
            <PrintLogButton log={l} variant="square" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
