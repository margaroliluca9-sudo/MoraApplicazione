// UFFICIO → «Verifiche in scadenza»: dai nomi dei fogli nel Drive (vedi src/dueChecks.js).
// In cima le scadute (rosso), poi questo mese (giallo) e il mese prossimo (blu); più avanti e ferme si aprono a parte.
// Se l'ultimo foglio è un'annuale e non si sa se il cliente è trimestrale, lo chiedo qui (una volta, salvato nel cliente).
// Toccando «trimestrale» / «annuale» su una riga si cambia (per i clienti dove la regola sbaglia).
import React, { useEffect, useMemo, useState } from "react";
import { doc } from "firebase/firestore";
import { CalendarClock, ChevronDown, Loader2, HelpCircle } from "lucide-react";
import { db, appId } from "../firebase";
import { updateDoc } from "../tracked";
import { dueList, lateText, loadDueChecks, periodLabel } from "../dueChecks";

const saveEvery = (id, every) => updateDoc(doc(db, "artifacts", appId, "public", "data", "customers", id), { checkEvery: every });

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

const Name = ({ r }) => (
  <p className="font-bold text-slate-800 text-sm truncate">
    {r.name}
    {r.folder && <span className="font-medium text-slate-400"> › {r.folder}</span>}
  </p>
);

const Row = ({ r, chip, onEvery }) => (
  <li className="flex items-center gap-3 py-2.5 border-t border-slate-100 first:border-t-0" data-due-row={r.group} data-due-name={r.name}>
    <div className="flex-1 min-w-0">
      <Name r={r} />
      <p className="text-xs text-slate-500 truncate" title={r.sheet}>
        ultima {r.lastLabel} ·{" "}
        {r.matched ? (
          <button type="button" onClick={() => onEvery(r, r.every === 3 ? 12 : 3)} className="underline decoration-dotted underline-offset-2" title="Tocca per cambiare" data-due-every={r.every}>
            {r.every === 3 ? "trimestrale" : "annuale"}
          </button>
        ) : (
          <span>{r.every === 3 ? "trimestrale" : "annuale"}</span>
        )}
        {!r.matched && " · cartella non abbinata"}
      </p>
    </div>
    <span className={`shrink-0 text-right text-xs font-bold rounded-xl border px-2.5 py-1 leading-tight ${chip}`}>
      <span className="block capitalize">{r.nextLabel}</span>
      <span className="block font-medium opacity-80">{lateText(r)}</span>
    </span>
  </li>
);

const AskRow = ({ r, onEvery }) => (
  <li className="py-2.5 border-t border-slate-200 first:border-t-0" data-due-row="ask" data-due-name={r.name}>
    <Name r={r} />
    <p className="text-xs text-slate-500">ultima {r.lastLabel}: le verifiche le fa ogni 3 mesi o solo una volta all'anno?</p>
    {r.matched ? (
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => onEvery(r, 3)} className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold" data-due-ask="3">
          Trimestrale
        </button>
        <button type="button" onClick={() => onEvery(r, 12)} className="flex-1 h-10 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-bold" data-due-ask="12">
          Solo annuale
        </button>
      </div>
    ) : (
      <p className="mt-1 text-xs text-slate-400">Prima abbina la cartella a un cliente (Admin → Drive).</p>
    )}
  </li>
);

export const DueChecksCard = ({ customers = [], color = "blue", now }) => {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState({});
  const [every, setEvery] = useState({});
  const [err, setErr] = useState("");
  const onEvery = async (r, v) => {
    if (!r.customerId) return;
    setErr("");
    setEvery((o) => ({ ...o, [r.customerId]: v }));
    try {
      await saveEvery(r.customerId, v);
    } catch (e) {
      setEvery((o) => {
        const n = { ...o };
        delete n[r.customerId];
        return n;
      });
      setErr("Non salvato: controlla la rete e riprova.");
    }
  };
  useEffect(() => {
    let alive = true;
    loadDueChecks().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);
  const rows = useMemo(() => (data ? dueList(data.list, customers, now || new Date(), every) : []), [data, customers, now, every]);
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
            : "Non ci sono ancora fogli di verifica letti dal Drive: compaiono dopo il giro del programma del Drive (ogni mattina alle 10, o «Aggiorna adesso» in Admin → Drive)."}
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

          {err && <p className="mt-3 text-sm font-bold text-red-700">{err}</p>}
          {of("ask").length > 0 && (
            <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3" data-due-group="ask">
              <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5 mb-1">
                <HelpCircle className="w-4 h-4" /> Da sapere una volta sola ({of("ask").length})
              </h4>
              <p className="text-xs text-slate-500 mb-1">L'ultimo foglio è un'annuale: dimmi se il cliente fa anche le trimestrali, così calcolo la prossima.</p>
              <ul>
                {(open.ask || of("ask").length <= FIRST + 2 ? of("ask") : of("ask").slice(0, FIRST)).map((r) => (
                  <AskRow key={r.key} r={r} onEvery={onEvery} />
                ))}
              </ul>
              {!open.ask && of("ask").length > FIRST + 2 && (
                <button type="button" onClick={() => toggle("ask")} className="mt-1 text-sm font-bold text-slate-700" data-due-more="ask">
                  Mostra tutti ({of("ask").length})
                </button>
              )}
            </section>
          )}

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
                    <Row key={r.key} r={r} chip={g.chip} onEvery={onEvery} />
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
                      <Row key={r.key} r={r} chip="bg-slate-50 text-slate-600 border-slate-200" onEvery={onEvery} />
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
