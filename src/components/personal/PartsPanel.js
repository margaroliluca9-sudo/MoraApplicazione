// La mia area → «Cosa ho cambiato»: i pezzi sostituiti dal tecnico nell'anno (o nel mese),
// letti dai suoi rapporti, con i dettagli (diametro e metri delle funi, ampere dei fusibili,
// modelli dei contattori, kW dei motori, salita/discesa dei finecorsa…), i clienti e gli
// interventi. In fondo «Altri pezzi»: quello che è stato sostituito ma non è nella lista.
import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, Wrench } from "lucide-react";
import { PanelHeader } from "./PersonalUi";
import { myChanges } from "../../myParts";
import { MONTHS, isoFromLogDate } from "../../personal";

const shortDate = (iso) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;
const fullDate = (iso) => `${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}/${iso.slice(0, 4)}`;
const nice = (s) => String(s || "").toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());

const Chip = ({ children, n, tone = "slate" }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold bg-${tone}-50 text-${tone}-800 border border-${tone}-100`}>
    {children}
    {n > 1 && <span className="opacity-60">×{n}</span>}
  </span>
);

// una riga: numero grande, nome, riassunto dei dettagli; toccando si apre tutto
const Row = ({ id, qty, name, row, color, open, onToggle, onOpenMachine }) => {
  const summary = [
    ...row.details.slice(0, 3).map(([d, n]) => (n > 1 ? `${d} ×${n}` : d)),
    row.meters ? `${String(row.meters).replace(".", ",")} m in tutto` : "",
  ].filter(Boolean);
  const top = row.customers[0];
  return (
    <div data-part={id}>
      <button type="button" onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3">
        <span className={`w-12 h-12 rounded-2xl bg-${color}-50 text-${color}-700 flex items-center justify-center text-xl font-black shrink-0`}>{qty}</span>
        <span className="flex-1 min-w-0">
          <span className="block font-black text-slate-800 leading-tight">{name}</span>
          {summary.length > 0 && <span className="block text-xs font-bold text-slate-600 mt-0.5 truncate" data-part-summary>{summary.join(" · ")}</span>}
          <span className="block text-[11px] font-semibold text-slate-400 mt-0.5 truncate">
            ultima {shortDate(row.last)}
            {top ? ` · più da ${nice(top[0])}${top[1] > 1 ? ` (${top[1]})` : ""}` : ""}
          </span>
        </span>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3" data-part-logs>
          {row.details.length > 0 && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Dettagli</p>
              <div className="flex flex-wrap gap-1.5" data-part-details>
                {row.details.map(([d, n]) => (
                  <Chip key={d} n={n} tone={color}>{d}</Chip>
                ))}
                {row.meters > 0 && <Chip tone="slate">{String(row.meters).replace(".", ",")} m in tutto</Chip>}
              </div>
            </div>
          )}
          {row.customers.length > 0 && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide mb-1.5">Clienti</p>
              <div className="flex flex-wrap gap-1.5">
                {row.customers.map(([c, n]) => (
                  <Chip key={c} n={n}>{nice(c)}</Chip>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide">Interventi</p>
            {row.logs.map((x, i) => (
              <button key={i} type="button" onClick={() => onOpenMachine && x.log.machineId && onOpenMachine(x.log.machineId, x.log.customer)}
                className="w-full text-left rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2">
                <span className="flex items-center gap-2 text-sm font-black text-slate-800">
                  <span className="truncate">{x.log.customer}</span>
                  {x.log.machineId && <span className="text-slate-500 font-bold shrink-0">· gru {x.log.machineId}</span>}
                  <span className="ml-auto text-xs font-bold text-slate-500 shrink-0">{fullDate(x.iso)}</span>
                </span>
                <span className="block text-xs text-slate-500 mt-0.5 line-clamp-2">
                  {x.qty > 1 ? `${x.qty} pezzi · ` : ""}
                  {x.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const PartsPanel = ({ me, logs = [], color = "blue", onBack, onClose, onOpenMachine }) => {
  const now = new Date();
  const thisYear = now.getFullYear();
  const [year, setYear] = useState(thisYear);
  const [onlyMonth, setOnlyMonth] = useState(false);
  const [open, setOpen] = useState(null);
  const month = onlyMonth ? now.getMonth() : null;
  const rows = useMemo(() => myChanges(logs, me, { year, month }), [logs, me, year, month]);
  const others = rows.others || [];
  const jobs = useMemo(() => new Set([...rows, ...others].flatMap((r) => r.logs.map((l) => l.log))).size, [rows, others]);
  const total = rows.reduce((a, r) => a + r.qty, 0) + others.reduce((a, r) => a + r.qty, 0);
  const customers = useMemo(() => new Set([...rows, ...others].flatMap((r) => r.logs.map((l) => String(l.log.customer || "").trim()))).size, [rows, others]);
  const years = useMemo(() => {
    const ys = new Set([thisYear]);
    (logs || []).forEach((l) => {
      const iso = isoFromLogDate(l.dateString);
      if (iso) ys.add(Number(iso.slice(0, 4)));
    });
    return [...ys].sort();
  }, [logs, thisYear]);
  const first = me ? String(me).split(" ")[0] : "";
  const when = onlyMonth ? `a ${MONTHS[now.getMonth()].toLowerCase()}` : year === thisYear ? "quest'anno" : `nel ${year}`;
  const toggle = (id) => setOpen(open === id ? null : id);
  const rope = rows.find((r) => r.part.id === "fune");

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
            <button type="button" aria-label="Anno dopo" disabled={year >= thisYear} onClick={() => { setYear(year + 1); setOnlyMonth(false); setOpen(null); }} className="w-10 h-10 flex items-center justify-center disabled:opacity-30">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          {year === thisYear && (
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

        <div className={`rounded-3xl bg-${color}-600 text-white p-5 space-y-3`} data-parts-head>
          <p className="text-lg font-black leading-snug">
            {first ? `${first}, ` : ""}
            {total ? `${when} hai cambiato` : `${when} non risultano pezzi cambiati`}
          </p>
          {total > 0 && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[[total, total === 1 ? "pezzo" : "pezzi"], [jobs, jobs === 1 ? "intervento" : "interventi"], [customers, customers === 1 ? "cliente" : "clienti"]].map(([n, l]) => (
                <div key={l} className="rounded-2xl bg-white/15 py-2">
                  <div className="text-2xl font-black leading-none">{n}</div>
                  <div className="text-[11px] font-bold text-white/80 mt-1">{l}</div>
                </div>
              ))}
            </div>
          )}
          {rope && rope.meters > 0 && (
            <p className="text-sm font-bold text-white/90" data-parts-rope>
              Fune montata: {String(rope.meters).replace(".", ",")} m
              {rope.details.filter(([d]) => d.startsWith("Ø")).length ? ` (${rope.details.filter(([d]) => d.startsWith("Ø")).map(([d, n]) => (n > 1 ? `${d} ×${n}` : d)).join(", ")})` : ""}
            </p>
          )}
        </div>

        {rows.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden" data-parts-list>
            {rows.map((r) => (
              <Row key={r.part.id} id={r.part.id} qty={r.qty} name={r.qty === 1 ? r.part.one : r.part.many} row={r} color={color}
                open={open === r.part.id} onToggle={() => toggle(r.part.id)} onOpenMachine={onOpenMachine} />
            ))}
          </div>
        )}

        {others.length > 0 && (
          <div className="space-y-2" data-parts-others>
            <h4 className="px-2 text-xs font-black text-slate-500">Altri pezzi cambiati</h4>
            <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
              {others.map((r) => (
                <Row key={"o:" + r.name} id={"altro:" + r.name} qty={r.qty} name={r.name} row={r} color={color}
                  open={open === "o:" + r.name} onToggle={() => toggle("o:" + r.name)} onOpenMachine={onOpenMachine} />
              ))}
            </div>
          </div>
        )}

        {!rows.length && !others.length && (
          <div className="text-center py-8 text-slate-500">
            <Wrench className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold mt-2">Niente da contare per ora</p>
          </div>
        )}
        <p className="text-xs text-slate-400 text-center px-4 leading-relaxed">
          Conto quello che scrivi nei rapporti come «sostituito», «cambiato», «montato» (e la fune o catena sostituita, con diametro e lunghezza). Più dettagli scrivi (Ø10, 30 m, 10 A, LC1D18, salita…) più qui è preciso. «Da sostituire» o «consigliato» non contano.
        </p>
      </div>
    </div>
  );
};

