// UFFICIO → grafici del periodo scelto (mese o anno):
//  - «Gru con più guasti»: le gru dove si è riparato di più (non contano le verifiche periodiche)
//  - «Clienti con più interventi»: per ognuno verifiche e riparazioni
// Tocca una riga per vedere gli interventi. Colori controllati per chi distingue male i colori
// (blu = verifiche, arancio = riparazioni) e sempre con la scritta accanto.
import React, { useMemo } from "react";
import { Wrench, Building2 } from "lucide-react";

// riparazione = c'è stato da sistemare qualcosa; verifica = controllo periodico senza riparazioni
const FIX = /(sostitu|ripar|guast|rott|cambiat|non funzion|blocc|smontat|rifatt|aggiust|bruciat|spezzat|sistemat|montat)/i;
export const isRepair = (l) => FIX.test(String((l && l.description) || ""));

export const officeCharts = (logs) => {
  const cranes = new Map();
  const clients = new Map();
  logs.forEach((l) => {
    const fix = isRepair(l);
    const c = String(l.customer || "").trim();
    if (!c) return;
    const k = `${c}|${l.machineId || ""}`;
    if (fix) {
      const x = cranes.get(k) || { customer: c, machineId: l.machineId || "", type: l.machineType || "", n: 0, logs: [] };
      x.n += 1;
      x.logs.push(l);
      cranes.set(k, x);
    }
    const y = clients.get(c) || { customer: c, check: 0, fix: 0, logs: [] };
    if (fix) y.fix += 1;
    else y.check += 1;
    y.logs.push(l);
    clients.set(c, y);
  });
  return {
    cranes: [...cranes.values()].sort((a, b) => b.n - a.n || a.customer.localeCompare(b.customer)).slice(0, 8),
    clients: [...clients.values()].sort((a, b) => b.check + b.fix - (a.check + a.fix) || a.customer.localeCompare(b.customer)).slice(0, 8),
  };
};

const Panel = ({ icon: Icon, title, label, children, section }) => (
  <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm" data-section={section}>
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-slate-500" />
      <h4 className="text-sm font-black text-slate-700">
        {title} <span className="text-slate-400 font-bold">{label}</span>
      </h4>
    </div>
    {children}
  </div>
);

export const OfficeCharts = ({ logs, label = "", onOpen }) => {
  const { cranes, clients } = useMemo(() => officeCharts(logs), [logs]);
  const maxC = Math.max(1, ...cranes.map((x) => x.n));
  const maxK = Math.max(1, ...clients.map((x) => x.check + x.fix));
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6" data-section="office-charts">
      <Panel icon={Wrench} title="Gru con più guasti" label={label} section="chart-cranes">
        {cranes.length === 0 ? (
          <p className="text-sm text-slate-400">Nessuna riparazione in questo periodo.</p>
        ) : (
          <div className="space-y-2.5">
            {cranes.map((x) => (
              <button
                key={x.customer + x.machineId}
                type="button"
                onClick={() => onOpen && onOpen(`Guasti: ${x.customer} · gru ${x.machineId}`, x.logs)}
                title={`${x.customer} · gru ${x.machineId}: ${x.n} ${x.n === 1 ? "riparazione" : "riparazioni"}`}
                className="w-full text-left group"
                data-chart-row
              >
                <span className="flex justify-between gap-2 text-sm">
                  <span className="font-bold text-slate-700 truncate group-hover:underline">
                    {x.customer} <span className="font-semibold text-slate-500">· gru {x.machineId}</span>
                  </span>
                  <span className="font-black text-slate-800 tabular-nums shrink-0">{x.n}</span>
                </span>
                <span className="mt-1 block h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <span className="mora-bar-fix block h-full rounded-full" style={{ width: `${(x.n / maxC) * 100}%` }} />
                </span>
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">Contano le riparazioni (sostituito, riparato, guasto…), non le verifiche periodiche.</p>
      </Panel>
      <Panel icon={Building2} title="Clienti con più interventi" label={label} section="chart-clients">
        <div className="flex gap-4 mb-3 text-xs font-bold text-slate-600" data-chart-legend>
          <span className="flex items-center gap-1.5"><span className="mora-bar-check w-3 h-3 rounded-sm" /> Verifiche</span>
          <span className="flex items-center gap-1.5"><span className="mora-bar-fix w-3 h-3 rounded-sm" /> Riparazioni</span>
        </div>
        {clients.length === 0 ? (
          <p className="text-sm text-slate-400">Nessun intervento in questo periodo.</p>
        ) : (
          <div className="space-y-2.5">
            {clients.map((x) => {
              const tot = x.check + x.fix;
              return (
                <button
                  key={x.customer}
                  type="button"
                  onClick={() => onOpen && onOpen(`Interventi: ${x.customer}`, x.logs)}
                  title={`${x.customer}: ${x.check} verifiche, ${x.fix} riparazioni`}
                  className="w-full text-left group"
                  data-chart-row
                >
                  <span className="flex justify-between gap-2 text-sm">
                    <span className="font-bold text-slate-700 truncate group-hover:underline">{x.customer}</span>
                    <span className="text-slate-500 tabular-nums shrink-0">
                      <b className="text-slate-800">{tot}</b> · {x.check} ver. · {x.fix} rip.
                    </span>
                  </span>
                  <span className="mt-1 flex h-2.5 rounded-full overflow-hidden gap-[2px]" style={{ width: `${(tot / maxK) * 100}%` }}>
                    {x.check > 0 && <span className="mora-bar-check h-full" style={{ flexGrow: x.check }} />}
                    {x.fix > 0 && <span className="mora-bar-fix h-full" style={{ flexGrow: x.fix }} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
};
