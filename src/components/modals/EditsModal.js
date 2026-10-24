// STORIA DELLE MODIFICHE di un rapporto: chi l'ha scritto, poi ogni modifica (chi, quando, prima → dopo)
import React from "react";
import { X, History, PenLine, FilePlus2 } from "lucide-react";
import { editsOf } from "../../logHistory";

const fmt = (ms) => (ms ? new Date(ms).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

export const EditsModal = ({ log, onClose, color = "blue" }) => {
  const list = editsOf(log).slice().reverse();
  const created = log.createdAt && log.createdAt.seconds ? log.createdAt.seconds * 1000 : 0;
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[210] flex items-end md:items-center justify-center md:p-4 backdrop-blur-sm" data-section="log-edits" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[88vh] flex flex-col bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <span className={`w-10 h-10 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center`}>
            <History className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-800">Storia delle modifiche</h3>
            <p className="text-xs text-slate-500 truncate">
              {log.customer} · gru {log.machineId} · {log.dateString}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-3">
          {list.map((e, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 p-3" data-edit-row>
              <p className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                <PenLine className="w-4 h-4 text-amber-600" /> {e.who || "Qualcuno"} · <span className="font-semibold text-slate-500">{fmt(e.at)}</span>
              </p>
              <ul className="mt-2 space-y-1.5">
                {(e.changes || []).map((c, j) => (
                  <li key={j} className="text-sm">
                    <span className="font-bold text-slate-700">{c.f}: </span>
                    <span className="text-red-700 line-through decoration-red-300">{c.a || "(vuoto)"}</span>
                    <span className="text-slate-400"> → </span>
                    <span className="text-emerald-700 font-semibold">{c.b || "(vuoto)"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 flex items-center gap-2">
            <FilePlus2 className="w-4 h-4 text-slate-400" /> Scritto da <b className="text-slate-800">{log.technician || "—"}</b>
            {created ? ` · ${fmt(created)}` : ""}
          </div>
        </div>
      </div>
    </div>
  );
};
