// La mia area → «Il mio anno»: il riepilogo personale dell'anno (src/myYear.js).
import React, { useMemo } from "react";
import { PanelHeader } from "./PersonalUi";
import { myYear } from "../../myYear";
import { MONTHS } from "../../personal";

const nice = (s) => String(s || "").toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());

const Big = ({ n, label, tone }) => (
  <div className={`rounded-3xl p-4 ${tone}`}>
    <p className="text-4xl font-black leading-none tabular-nums">{n}</p>
    <p className="text-sm font-bold mt-1">{label}</p>
  </div>
);

export const YearPanel = ({ me, logs = [], year, color = "blue", onBack, onClose }) => {
  const y = useMemo(() => myYear(logs, me, year), [logs, me, year]);
  const max = Math.max(1, ...y.months);
  const diff = y.total - y.prev;
  return (
    <div className="flex flex-col h-full" data-section="my-year">
      <PanelHeader title={`Il mio ${year}`} sub={me} onBack={onBack} onClose={onClose} color={color} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        <div className={`rounded-3xl bg-${color}-600 text-white p-5`}>
          <p className="text-sm font-black uppercase tracking-wider opacity-90">Il tuo anno in Mora</p>
          <p className="font-black leading-none mt-2 tabular-nums" style={{ fontSize: 64 }} data-year-total>
            {y.total}
          </p>
          <p className="text-lg font-black">{y.total === 1 ? "intervento" : "interventi"} nel {year}</p>
          {y.prev > 0 && (
            <p className="text-sm font-bold opacity-90 mt-1">
              {diff > 0 ? `${diff} in più del ${year - 1}` : diff < 0 ? `${-diff} in meno del ${year - 1}` : `come nel ${year - 1}`} ({y.prev})
            </p>
          )}
        </div>
        {!y.total ? (
          <p className="text-sm text-slate-500 text-center py-6">Nessun intervento con il tuo nome nel {year}.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Big n={y.customers} label={y.customers === 1 ? "cliente" : "clienti visitati"} tone="bg-white border border-slate-200 text-slate-800" />
              <Big n={y.cranes} label={y.cranes === 1 ? "gru" : "gru diverse"} tone="bg-white border border-slate-200 text-slate-800" />
              <Big n={y.days} label={y.days === 1 ? "giorno di lavoro" : "giorni con interventi"} tone="bg-white border border-slate-200 text-slate-800" />
              <Big n={y.ropes + y.chains} label="funi e catene sostituite" tone="bg-white border border-slate-200 text-slate-800" />
            </div>
            <section className="bg-white rounded-3xl border border-slate-200 p-4" data-year-months>
              <h4 className="font-black text-slate-800">Mese per mese</h4>
              <p className="text-sm text-slate-500">
                Il più pieno: <b className="text-slate-800">{y.bestMonth}</b> ({y.bestMonthN})
              </p>
              <div className="flex items-end gap-1 h-28 mt-3">
                {y.months.map((n, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-black text-slate-500">{n || ""}</span>
                    <div className={`w-full rounded-t-md ${MONTHS[i] === y.bestMonth ? `bg-${color}-600` : "bg-slate-300"}`} style={{ height: `${(n / max) * 80}px`, minHeight: n ? 4 : 1 }} />
                    <span className="text-[10px] font-bold text-slate-400">{MONTHS[i].slice(0, 1)}</span>
                  </div>
                ))}
              </div>
            </section>
            {[
              ["I clienti dove sei andato di più", y.topCustomers],
              ["Le gru che hai seguito di più", y.topCranes],
              ["I colleghi con cui hai lavorato di più", y.mates],
            ].map(([t, list]) =>
              list.length ? (
                <section key={t} className="bg-white rounded-3xl border border-slate-200 p-4 space-y-2">
                  <h4 className="font-black text-slate-800">{t}</h4>
                  {list.map(([name, n], i) => (
                    <div key={name} className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${i === 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{i + 1}</span>
                      <span className="flex-1 min-w-0 font-bold text-slate-800 truncate">{nice(name)}</span>
                      <span className="text-sm font-black text-slate-500">{n}</span>
                    </div>
                  ))}
                </section>
              ) : null
            )}
            {y.photos > 0 && <p className="text-sm text-slate-500 text-center">E {y.photos} foto scattate nei rapporti.</p>}
          </>
        )}
        <p className="text-[11px] text-slate-400 text-center">Contano gli interventi dove sei tecnico principale o in aiuto.</p>
      </div>
    </div>
  );
};
