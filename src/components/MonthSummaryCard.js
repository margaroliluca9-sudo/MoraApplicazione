// UFFICIO → «Riepilogo del mese»: il PDF del mese appena finito è sempre pronto (numeri, tecnici,
// clienti, gru con più guasti e tutti gli interventi). Si può scegliere anche un mese prima.
// Il 1° di ogni mese alle 9 all'admin arriva anche l'avviso sul telefono (api/reminders.js).
import React, { useMemo, useState } from "react";
import { FileText, Download, Sparkles } from "lucide-react";
import { buildMonthSummaryPdf, pdfFileName } from "../pdf";
import { openPdf } from "./PdfHost";
import { isRepair } from "../repairs";

const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
export const monthLabel = (y, m) => `${MESI[m]} ${y}`;
// interventi di un mese (m da 0 a 11)
export const logsOfMonth = (logs, y, m) =>
  logs.filter((l) => {
    const p = String(l.dateString || "").split("/").map(Number);
    return p.length === 3 && p[2] === y && p[1] - 1 === m;
  });

export const MonthSummaryCard = ({ logs = [], color = "blue", now = new Date() }) => {
  // gli ultimi 12 mesi finiti (il primo è quello appena finito)
  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 1 - i, 1);
        return { y: d.getFullYear(), m: d.getMonth(), key: `${d.getFullYear()}-${d.getMonth()}` };
      }),
    [now]
  );
  const [sel, setSel] = useState(months[0].key);
  const cur = months.find((x) => x.key === sel) || months[0];
  const list = useMemo(() => logsOfMonth(logs, cur.y, cur.m), [logs, cur.y, cur.m]);
  const fix = list.filter(isRepair).length;
  const fresh = now.getDate() <= 7 && sel === months[0].key;
  const today = now.toLocaleDateString("it-IT");
  const download = () =>
    openPdf(() => buildMonthSummaryPdf({ logs: list, monthLabel: monthLabel(cur.y, cur.m), today }), pdfFileName("Riepilogo", MESI[cur.m], String(cur.y)));
  return (
    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm" data-section="month-summary">
      <div className="flex items-start gap-3">
        <span className={`w-11 h-11 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
          <FileText className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-800 flex items-center gap-2 flex-wrap">
            Riepilogo del mese
            {fresh && (
              <span className="text-xs font-black text-amber-800 bg-amber-100 rounded-full px-2 py-0.5 flex items-center gap-1" data-summary-new>
                <Sparkles className="w-3 h-3" /> Pronto
              </span>
            )}
          </p>
          <p className="text-sm text-slate-500">Numeri, tecnici, clienti, gru con più guasti e tutti gli interventi del mese, in un PDF.</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          aria-label="Mese del riepilogo"
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 capitalize"
          data-summary-month
        >
          {months.map((x) => (
            <option key={x.key} value={x.key}>
              {monthLabel(x.y, x.m)}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-600" data-summary-count>
          <b className="text-slate-800">{list.length}</b> interventi · {list.length - fix} verifiche · {fix} riparazioni
        </span>
        <button
          type="button"
          onClick={download}
          disabled={!list.length}
          data-action="summary-pdf"
          className={`ml-auto h-11 px-4 rounded-xl bg-${color}-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50`}
        >
          <Download className="w-4 h-4" /> Scarica il PDF
        </button>
      </div>
    </div>
  );
};
