// CONTROLLO DOPPIONI (area admin → Clienti / Gru → "Doppioni").
// Una coppia alla volta: per ognuno si vede quanti interventi (e gru) ha, l'app consiglia quale
// tenere (quello con più storia) e si sceglie: tieni questo, tieni l'altro, sono diversi, salta.
// Unire non si può annullare: prima di farlo chiede conferma dicendo cosa succede.
import React, { useMemo, useState } from "react";
import { X, RefreshCw, CheckCircle, Copy, Star } from "lucide-react";
import { getSafeMatricola } from "../../utils";
import { EmptyState } from "../EmptyState";

const norm = (s) => String(s || "").trim().toUpperCase();

// numeri utili per decidere
const factsOf = (item, type, logs, machines) => {
  if (type === "customer") {
    const n = norm(item.name);
    const mine = logs.filter((l) => norm(l.customer) === n);
    return {
      title: item.name,
      logs: mine.length,
      lines: [
        `${mine.length} ${mine.length === 1 ? "intervento" : "interventi"}`,
        `${machines.filter((m) => norm(m.customerName) === n).length} gru`,
        mine[0] ? `ultimo: ${mine[0].dateString}` : "nessun intervento",
      ],
    };
  }
  const mat = norm(getSafeMatricola(item));
  const cust = norm(item.customerName);
  const mine = logs.filter((l) => (norm(l.machineId) === mat && norm(l.customer) === cust) || l.machineId === item.id);
  return {
    title: `Gru ${getSafeMatricola(item)}`,
    sub: item.customerName,
    logs: mine.length,
    lines: [
      `${mine.length} ${mine.length === 1 ? "intervento" : "interventi"}`,
      [item.type, item.capacity ? `${item.capacity} kg` : ""].filter(Boolean).join(" · ") || "tipo non indicato",
      mine[0] ? `ultimo: ${mine[0].dateString}` : "nessun intervento",
    ],
  };
};

const Card = ({ f, best, color, onKeep, busy, side }) => (
  <div
    className={`flex-1 min-w-0 rounded-2xl border-2 p-4 flex flex-col gap-3 ${best ? `border-${color}-400 bg-${color}-50` : "border-slate-200 bg-white"}`}
    data-dup-side={side}
  >
    <div className="min-h-[20px]">
      {best && (
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold text-${color}-700 bg-white border border-${color}-200 rounded-full px-2 py-0.5`}>
          <Star className="w-3 h-3" /> Consigliato da tenere
        </span>
      )}
    </div>
    <div>
      <p className="font-black text-slate-800 break-words leading-tight">{f.title}</p>
      {f.sub && <p className="text-xs font-semibold text-slate-500 break-words">{f.sub}</p>}
    </div>
    <ul className="text-sm text-slate-600 space-y-0.5">
      {f.lines.map((l) => (
        <li key={l}>{l}</li>
      ))}
    </ul>
    <button
      type="button"
      disabled={busy}
      onClick={onKeep}
      data-action={`keep-${side}`}
      className={`mt-auto h-11 rounded-full font-bold text-sm transition-colors disabled:opacity-50 ${best ? `bg-${color}-600 text-white hover:bg-${color}-700` : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
    >
      Tieni questo
    </button>
  </div>
);

export const DuplicatesModal = ({ analysis, onClose, onDirectMerge, onIgnore, logs = [], machines = [], color = "blue" }) => {
  const [pairs] = useState(analysis.pairs);
  const [i, setI] = useState(0);
  const [ask, setAsk] = useState(null); // { keep, drop }
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState({ merged: 0, different: 0, skipped: 0 });
  const [gone, setGone] = useState([]); // id già uniti (le coppie con loro si saltano)
  const type = analysis.type;

  // salto le coppie con un elemento già tolto da un'unione precedente
  const next = (from) => {
    let k = from;
    while (k < pairs.length && (gone.includes(pairs[k][0].id) || gone.includes(pairs[k][1].id))) k++;
    return k;
  };
  const cur = i < pairs.length ? pairs[i] : null;
  const facts = useMemo(
    () => (cur ? cur.map((x) => factsOf(x, type, logs, machines)) : []),
    [cur, type, logs, machines]
  );
  const best = facts.length ? (facts[0].logs >= facts[1].logs ? 0 : 1) : 0;
  const go = (k, gl = gone) => {
    let n = k;
    while (n < pairs.length && (gl.includes(pairs[n][0].id) || gl.includes(pairs[n][1].id))) n++;
    setI(n);
  };

  const confirmMerge = async () => {
    setBusy(true);
    try {
      const ok = await onDirectMerge(ask.drop, ask.keep, type);
      if (ok === false) {
        setAsk(null);
        return;
      }
      const gl = [...gone, ask.drop.id];
      setGone(gl);
      setDone((d) => ({ ...d, merged: d.merged + 1 }));
      setAsk(null);
      go(i + 1, gl);
    } finally {
      setBusy(false);
    }
  };
  const different = async () => {
    setBusy(true);
    try {
      const ok = await onIgnore(cur[0], cur[1]);
      if (ok === false) return;
      setDone((d) => ({ ...d, different: d.different + 1 }));
      go(i + 1);
    } finally {
      setBusy(false);
    }
  };
  const skip = () => {
    setDone((d) => ({ ...d, skipped: d.skipped + 1 }));
    go(i + 1);
  };
  const what = type === "customer" ? "clienti" : "gru";
  const left = Math.max(0, pairs.length - next(i));

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[230] flex items-end md:items-center justify-center md:p-4 backdrop-blur-sm animate-in fade-in" data-section="duplicates">
      <div className="w-full max-w-2xl bg-white rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-2xl bg-${color}-100 text-${color}-700 flex items-center justify-center shrink-0`}>
              <Copy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-slate-800 tracking-tight text-lg leading-tight">Controllo doppioni</h3>
              <p className="text-xs font-semibold text-slate-500" data-dup-progress>
                {cur ? `${i + 1} di ${pairs.length} · ${what} che sembrano uguali` : `${what}: controllo finito`}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center shrink-0">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        {cur && (
          <div className="h-1.5 bg-slate-100">
            <div className={`h-full bg-${color}-500 transition-all`} style={{ width: `${(i / pairs.length) * 100}%` }} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {!cur ? (
            pairs.length === 0 ? (
              <EmptyState color={color} title="Nessun doppione" text={`Non ci sono ${what} che sembrano uguali.`} />
            ) : (
              <div className="text-center py-8" data-dup-summary>
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-black text-slate-800 text-lg">Fatto!</p>
                <p className="text-sm text-slate-500 mt-1">
                  Uniti {done.merged} · Diversi {done.different} · Saltati {done.skipped}
                </p>
                {done.skipped > 0 && <p className="text-xs text-slate-400 mt-2">Quelli saltati te li ripropone la prossima volta.</p>}
                <button type="button" onClick={onClose} className={`mt-5 h-11 px-6 rounded-full bg-${color}-600 text-white font-bold text-sm`}>
                  Chiudi
                </button>
              </div>
            )
          ) : ask ? (
            <div className="py-4 space-y-4" data-dup-confirm>
              <p className="text-base text-slate-700 leading-snug">
                Tutti gli interventi{type === "customer" ? " e le gru" : ""} di <b className="break-words">{ask.dropTitle}</b> passano a{" "}
                <b className="break-words">{ask.keepTitle}</b>, e <b>{ask.dropTitle}</b> viene tolto dall'elenco.
              </p>
              <p className="text-sm text-slate-500">Non si può annullare.</p>
              <div className="flex gap-3">
                <button type="button" disabled={busy} onClick={() => setAsk(null)} className="flex-1 h-11 rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
                  Annulla
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirmMerge}
                  data-action="confirm-merge"
                  className={`flex-1 h-11 rounded-full bg-${color}-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60`}
                >
                  {busy && <RefreshCw className="w-4 h-4 animate-spin" />} Unisci
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-3">Sono la stessa cosa scritta in due modi? Scegli quale tenere: l'altro ci finisce dentro.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                {[0, 1].map((s) => (
                  <Card
                    key={s}
                    side={s === 0 ? "a" : "b"}
                    f={facts[s]}
                    best={s === best}
                    color={color}
                    busy={busy}
                    onKeep={() =>
                      setAsk({ keep: cur[s], drop: cur[1 - s], keepTitle: facts[s].title, dropTitle: facts[1 - s].title })
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {cur && !ask && (
          <div className="p-4 border-t border-slate-100 flex gap-3">
            <button type="button" disabled={busy} onClick={different} data-action="dup-different" className="flex-1 h-11 rounded-full bg-slate-100 text-slate-700 font-bold text-sm disabled:opacity-50">
              Sono diversi
            </button>
            <button type="button" disabled={busy} onClick={skip} data-action="dup-skip" className="flex-1 h-11 rounded-full border border-slate-200 text-slate-500 font-bold text-sm disabled:opacity-50">
              Salta{left > 1 ? ` (${left - 1} dopo)` : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
