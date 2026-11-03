// UFFICIO → «Verifiche in scadenza»: dai nomi dei fogli nel Drive (vedi src/dueChecks.js).
// In cima le scadute (rosso), poi questo mese (giallo) e il mese prossimo (blu); più avanti e ferme si aprono a parte.
import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronDown, Loader2 } from "lucide-react";
import { dueList, lateText, loadDueChecks, periodLabel } from "../dueChecks";

const GROUPS = [
  { id: "late", title: "Scadute", dot: "bg-red-500", chip: "bg-red-50 text-red-700 border-red-200" },
  { id: "now", title: "Questo mese", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-800 border-amber-200" },
  { id: "next", title: "Il mese prossimo", dot: "bg-blue-500", chip: "bg-blue-50 text-blue-700 border-blue-200" },
];
const FOLDED = [
  { id: "later", title: "Più avanti" },
  { id: "stale", title: "Ferme da più di un anno e mezzo" },
];
const FIRST = 8;

const Row = ({ r, chip }) => (
  <li className="flex items-center gap-3 py-2.5 border-t border-slate-100 first:border-t-0" data-due-row={r.group} data-due-name={r.name}>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-slate-800 text-sm truncate">
        {r.name}
        {r.folder && <span className="font-medium text-slate-400"> › {r.folder}</span>}
      </p>
      <p className="text-xs text-slate-500 truncate" title={r.sheet}>
        ultima {r.lastLabel} · {r.every === 3 ? "trimestrale" : "annuale"}
        {!r.matched && " · cartella non abbinata"}
      </p>
    </div>
    <span className={`shrink-0 text-right text-xs font-bold rounded-xl border px-2.5 py-1 leading-tight ${chip}`}>
      <span className="block capitalize">{r.nextLabel}</span>
      <span className="block font-medium opacity-80">{lateText(r)}</span>
    </span>
  </li>
);

export const DueChecksCard = ({ customers = [], color = "blue", now }) => {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState({});
  useEffect(() => {
    let alive = true;
    loadDueChecks().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);
  const rows = useMemo(() => (data ? dueList(data.list, customers, now || new Date()) : []), [data, customers, now]);
  const of = (g) => rows.filter((r) => r.group === g);
  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const monthName = (plus) => {
    const n = now || new Date();
    const d = new Date(n.getFullYear(), n.getMonth() + plus, 1);
    return periodLabel(d.getFullYear() * 100 + d.getMonth() + 1, true).split(" ")[0];
  };
  const when = data && data.updatedAt ? new Date(data.updatedAt).toLocaleDateString("it-IT", { day: "numeric", month: "long" }) : "";

  return (
    <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm" data-section="due-checks" data-focus="scadenze">
      <div className="flex items-start gap-3">
        <span className={`w-11 h-11 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
          <CalendarClock className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-800">Verifiche in scadenza</p>
          <p className="text-sm text-slate-500">
            Dai fogli nel Drive: «T» trimestrale (la prossima 3 mesi dopo), solo «A» annuale (12 mesi dopo).
            {when && <span className="text-slate-400"> Aggiornato il {when}.</span>}
          </p>
        </div>
      </div>

      {!data && (
        <p className="mt-4 text-sm text-slate-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carico…
        </p>
      )}
      {data && (data.missing || data.error) && (
        <p className="mt-4 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3" data-due-empty>
          {data.error
            ? "Non riesco a leggere le scadenze adesso: riprova tra poco."
            : "Le scadenze arrivano dal programma del Drive: serve la versione nuova (7) incollata in Google Script. Dopo il primo giro (ogni mattina alle 10, o «Aggiorna adesso» in Admin → Drive) compaiono qui."}
        </p>
      )}

      {data && !data.missing && !data.error && (
        <>
          <div className="mt-4 flex flex-wrap gap-2" data-due-counts>
            {GROUPS.map((g) => (
              <span key={g.id} className={`text-xs font-bold rounded-full border px-2.5 py-1 flex items-center gap-1.5 ${g.chip}`}>
                <span className={`w-2 h-2 rounded-full ${g.dot}`} />
                {of(g.id).length} {g.id === "late" ? (of("late").length === 1 ? "scaduta" : "scadute") : `a ${monthName(g.id === "now" ? 0 : 1)}`}
              </span>
            ))}
          </div>

          {GROUPS.map((g) => {
            const list = of(g.id);
            if (!list.length) return null;
            const all = open[g.id] || list.length <= FIRST + 2;
            return (
              <section key={g.id} className="mt-4" data-due-group={g.id}>
                <h4 className="text-xs font-black text-slate-500 flex items-center gap-1.5 mb-1">
                  <span className={`w-2 h-2 rounded-full ${g.dot}`} /> {g.title} ({list.length})
                </h4>
                <ul>
                  {(all ? list : list.slice(0, FIRST)).map((r) => (
                    <Row key={r.key} r={r} chip={g.chip} />
                  ))}
                </ul>
                {!all && (
                  <button type="button" onClick={() => toggle(g.id)} className={`mt-1 text-sm font-bold text-${color}-700`} data-due-more={g.id}>
                    Mostra tutte ({list.length})
                  </button>
                )}
              </section>
            );
          })}

          {!GROUPS.some((g) => of(g.id).length) && (
            <p className="mt-4 text-sm text-emerald-700 font-bold" data-due-none>
              Nessuna verifica scaduta né in arrivo nei prossimi due mesi.
            </p>
          )}

          {FOLDED.map((g) => {
            const list = of(g.id);
            if (!list.length) return null;
            return (
              <div key={g.id} className="mt-3 border-t border-slate-100 pt-2" data-due-group={g.id}>
                <button type="button" onClick={() => toggle(g.id)} className="w-full flex items-center justify-between text-sm font-bold text-slate-600 py-1" data-due-toggle={g.id}>
                  {g.title} ({list.length})
                  <ChevronDown className={`w-4 h-4 transition-transform ${open[g.id] ? "rotate-180" : ""}`} />
                </button>
                {open[g.id] && (
                  <ul>
                    {list.map((r) => (
                      <Row key={r.key} r={r} chip="bg-slate-50 text-slate-600 border-slate-200" />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
