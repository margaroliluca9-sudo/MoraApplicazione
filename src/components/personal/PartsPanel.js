// La mia area → «Cosa ho cambiato»: i pezzi sostituiti dal tecnico nell'anno (o nel mese),
// letti dai suoi rapporti. Toccando un pezzo si vedono gli interventi dove l'ha cambiato.
import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Wrench } from "lucide-react";
import { PanelHeader } from "./PersonalUi";
import { myChanges, partLabel } from "../../myParts";
import { MONTHS, isoFromLogDate } from "../../personal";

const shortDate = (iso) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}/${iso.slice(0, 4)}`;

export const PartsPanel = ({ me, logs = [], color = "blue", onBack, onClose, onOpenMachine }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [onlyMonth, setOnlyMonth] = useState(false);
  const [open, setOpen] = useState(null);
  const month = onlyMonth ? now.getMonth() : null;
  const rows = useMemo(() => myChanges(logs, me, { year, month }), [logs, me, year, month]);
  const jobs = useMemo(() => new Set(rows.flatMap((r) => r.logs.map((l) => l.log))).size, [rows]);
  const total = rows.reduce((a, r) => a + r.qty, 0);
  const thisYear = now.getFullYear();
  const years = useMemo(() => {
    const ys = new Set([thisYear]);
    (logs || []).forEach((l) => {
      const iso = isoFromLogDate(l.dateString);
      if (iso) ys.add(Number(iso.slice(0, 4)));
    });
    return [...ys].sort();
  }, [logs, thisYear]);
  const first = me ? String(me).split(" ")[0] : "";
  const when = onlyMonth ? `a ${MONTHS[now.getMonth()].toLowerCase()}` : year === now.getFullYear() ? "quest'anno" : `nel ${year}`;
  const max = rows.length ? rows[0].qty : 1;

  return (
    <div className="flex flex-col h-full" data-section="area-parts">
      <PanelHeader title="Cosa ho cambiato" sub="Dai tuoi rapporti" onBack={onBack} onClose={onClose} color={color} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white rounded-full border border-slate-200">
            <button type="button" aria-label="Anno prima" disabled={year <= years[0]} onClick={() => { setYear(year - 1); setOnlyMonth(false); setOpen(null); }} className="w-10 h-10 flex items-center justify-center disabled:opacity-30">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <span className="font-black text-slate-800 w-12 text-center" data-parts-year>{year}</span>
            <button type="button" aria-label="Anno dopo" disabled={year >= now.getFullYear()} onClick={() => { setYear(year + 1); setOnlyMonth(false); setOpen(null); }} className="w-10 h-10 flex items-center justify-center disabled:opacity-30">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          {year === now.getFullYear() && (
            <div className="flex bg-white rounded-full border border-slate-200 p-1 ml-auto">
              {[[false, "Anno"], [true, MONTHS[now.getMonth()]]].map(([v, l]) => (
                <button key={l} type="button" data-parts-period={v ? "mese" : "anno"} onClick={() => { setOnlyMonth(v); setOpen(null); }}
                  className={`h-8 px-3 rounded-full text-sm font-black ${onlyMonth === v ? `bg-${color}-600 text-white` : "text-slate-500"}`}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`rounded-3xl bg-${color}-600 text-white p-5`} data-parts-head>
          <p className="text-lg font-black leading-snug">
            {first ? `${first}, ` : ""}
            {total ? `${when} hai cambiato` : `${when} non risultano pezzi cambiati`}
          </p>
          {total > 0 && (
            <p className="text-sm font-semibold text-white/80 mt-1">
              {total} {total === 1 ? "pezzo" : "pezzi"} in {jobs} {jobs === 1 ? "intervento" : "interventi"}
            </p>
          )}
        </div>

        {rows.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden" data-parts-list>
            {rows.map((r) => (
              <div key={r.part.id} data-part={r.part.id}>
                <button type="button" onClick={() => setOpen(open === r.part.id ? null : r.part.id)} className="w-full text-left px-4 py-3 flex items-center gap-3">
                  <span className={`w-12 h-12 rounded-2xl bg-${color}-50 text-${color}-700 flex items-center justify-center text-xl font-black shrink-0`}>{r.qty}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-black text-slate-800 leading-tight">{r.qty === 1 ? r.part.one : r.part.many}</span>
                    <span className="block h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
                      <span className={`block h-full rounded-full bg-${color}-500`} style={{ width: `${Math.max(6, (r.qty / max) * 100)}%` }} />
                    </span>
                  </span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open === r.part.id ? "rotate-180" : ""}`} />
                </button>
                {open === r.part.id && (
                  <div className="px-4 pb-3 space-y-2" data-part-logs>
                    {r.logs.map((x, i) => (
                      <button key={i} type="button" onClick={() => onOpenMachine && x.log.machineId && onOpenMachine(x.log.machineId, x.log.customer)}
                        className="w-full text-left rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2">
                        <span className="flex items-center gap-2 text-sm font-black text-slate-800">
                          <span className="truncate">{x.log.customer}</span>
                          {x.log.machineId && <span className="text-slate-500 font-bold shrink-0">· gru {x.log.machineId}</span>}
                          <span className="ml-auto text-xs font-bold text-slate-500 shrink-0">{shortDate(x.iso)}</span>
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {x.qty > 1 ? `${partLabel(r.part, x.qty)} · ` : ""}
                          {x.text}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!rows.length && (
          <div className="text-center py-8 text-slate-500">
            <Wrench className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold mt-2">Niente da contare per ora</p>
          </div>
        )}
        <p className="text-xs text-slate-400 text-center px-4 leading-relaxed">
          Conto quello che scrivi nei rapporti come «sostituito», «cambiato», «montato» (e la fune o catena sostituita). «Da sostituire» o «consigliato» non contano. Vale per i rapporti dove ci sei tu, anche come aiuto.
        </p>
      </div>
    </div>
  );
};
