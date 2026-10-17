import React, { useMemo } from "react";
import { Lightbulb, Repeat, History } from "lucide-react";
import { getTechsString } from "../utils";
import { pendingItems, repeatedFaults, machineSummary } from "../assistant";

// Avvisi dell'assistente su una gru (vedi assistant.js):
//  riassunto in una riga, "L'ultima volta…" (cose in sospeso), guasto che si ripete.
export const AssistantPanel = ({ machineLogs, showSummary = true }) => {
  const data = useMemo(() => {
    const logs = machineLogs || [];
    return {
      summary: machineSummary(logs),
      pending: pendingItems(logs).slice(0, 5),
      repeated: repeatedFaults(logs),
    };
  }, [machineLogs]);

  const { summary, pending, repeated } = data;
  if (!summary) return null;
  const nothing = !pending.length && !repeated.length;
  if (nothing && !showSummary) return null;

  return (
    <div data-section="assistant" className="space-y-2">
      {showSummary && (
        <div
          data-assistant="summary"
          className="flex items-start gap-2 text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
        >
          <History className="w-4 h-4 shrink-0 text-slate-400" />
          <span>
            {summary.count === 1
              ? "1 intervento"
              : `${summary.count} interventi dal ${summary.firstYear}`}
            {" · ultimo "}
            {summary.last.dateString}
            {summary.top.length > 0 &&
              " · più spesso: " +
                summary.top.map((t) => `${t.label} (${t.count})`).join(", ")}
          </span>
        </div>
      )}

      {repeated.map((r) => (
        <div
          key={r.id}
          data-assistant="repeated"
          className="flex items-start gap-2 text-xs font-bold text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2"
        >
          <Repeat className="w-4 h-4 shrink-0 text-red-600" />
          <span>
            Guasto che si ripete: {r.label} in {r.count} interventi negli ultimi
            2 mesi ({r.dates.join(", ")}). Forse conviene cercare la causa.
          </span>
        </div>
      ))}

      {pending.length > 0 && (
        <div
          data-assistant="pending"
          className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5"
        >
          <p className="flex items-center gap-1.5 text-[11px] font-black text-amber-800 uppercase tracking-wide mb-1.5">
            <Lightbulb className="w-4 h-4 text-amber-600" /> L'ultima volta…
          </p>
          <ul className="space-y-1.5">
            {pending.map((p, i) => (
              <li
                key={p.log.id + "-" + i}
                data-pending-item
                className="text-xs text-amber-900 leading-snug break-words"
              >
                <span className="font-bold">
                  {p.log.dateString}
                  {getTechsString(p.log) ? ` (${getTechsString(p.log)})` : ""}:
                </span>{" "}
                “{p.sentence}”
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
