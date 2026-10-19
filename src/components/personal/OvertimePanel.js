// LA MIA AREA · Straordinari: le ore in più, giorno per giorno, con il totale del mese.
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Minus, Share2, Clock } from "lucide-react";
import { todayIso, longDay } from "../../personal";
import { QUICK, fmtMin, daysOf, monthTotal, monthLabel, shortDay, summaryText, saveOvertime, removeOvertime } from "../../overtime";
import { describeError } from "../../utils";
import { PanelHeader, Sheet, Field, INPUT, PrimaryBtn, GhostBtn, Empty } from "./PersonalUi";

export const OvertimePanel = ({ me, overtime = [], onBack, onClose, color = "blue" }) => {
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [edit, setEdit] = useState(null); // { id?, date, minutes, note }
  const [flash, setFlash] = useState(null); // { text, id } dopo un'aggiunta veloce (con "Annulla")
  const [error, setError] = useState("");
  const today = todayIso();
  const days = daysOf(overtime, cur.y, cur.m);
  const total = monthTotal(overtime, cur.y, cur.m);
  const todayMin = daysOf(overtime, now.getFullYear(), now.getMonth()).find((d) => d.date === today);

  const shift = (d) => setCur(({ y, m }) => {
    const x = new Date(y, m + d, 1);
    return { y: x.getFullYear(), m: x.getMonth() };
  });
  const quick = async (min) => {
    setError("");
    try {
      const id = await saveOvertime(me, { date: today, minutes: min, note: "" });
      setFlash({ text: `Aggiunti ${fmtMin(min)} a oggi`, id });
      setCur({ y: now.getFullYear(), m: now.getMonth() });
      setTimeout(() => setFlash((f) => (f && f.id === id ? null : f)), 5000);
    } catch (e) {
      setError("Non salvato: " + describeError(e));
    }
  };
  const undo = async () => {
    if (!flash) return;
    try {
      await removeOvertime(flash.id);
    } catch (e) {
      // niente
    }
    setFlash(null);
  };
  const save = async () => {
    if (!edit.date) return setError("Scegli il giorno.");
    if (!(edit.minutes > 0)) return setError("Scrivi quanto tempo in più.");
    try {
      await saveOvertime(me, edit);
      setEdit(null);
      setError("");
    } catch (e) {
      setError("Non salvato: " + describeError(e));
    }
  };
  const del = async () => {
    try {
      await removeOvertime(edit.id);
      setEdit(null);
    } catch (e) {
      setError("Non eliminato: " + describeError(e));
    }
  };
  const share = async () => {
    const text = summaryText(me, overtime, cur.y, cur.m);
    try {
      if (navigator.share) await navigator.share({ title: "Straordinari", text });
      else {
        await navigator.clipboard.writeText(text);
        setFlash({ text: "Riepilogo copiato: incollalo dove vuoi", id: "copy" });
      }
    } catch (e) {
      // annullato
    }
  };
  const step = (d) => setEdit((e) => ({ ...e, minutes: Math.max(15, (Number(e.minutes) || 0) + d) }));

  return (
    <div className="flex flex-col h-full" data-section="area-overtime">
      <PanelHeader
        title="Straordinari"
        sub="Li vedi solo tu"
        onBack={onBack}
        onClose={onClose}
        color={color}
        action={{ label: "Aggiungi", onClick: () => { setError(""); setEdit({ date: today, minutes: 30, note: "" }); } }}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3" data-section="overtime-quick">
          <div className="flex items-baseline justify-between">
            <h4 className="font-black text-slate-800">Oggi in più</h4>
            <span className="text-sm font-bold text-slate-500" data-overtime-today>{todayMin ? fmtMin(todayMin.minutes) : "niente"}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {QUICK.map((min) => (
              <button key={min} type="button" data-quick={min} onClick={() => quick(min)}
                className={`h-12 rounded-2xl bg-${color}-50 border border-${color}-200 text-${color}-800 font-black text-sm active:scale-95`}>
                +{fmtMin(min)}
              </button>
            ))}
          </div>
          {flash && (
            <div className="flex items-center justify-between gap-2 text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2" data-section="overtime-flash">
              <span>{flash.text}</span>
              {flash.id !== "copy" && (
                <button type="button" onClick={undo} className="underline text-emerald-900 shrink-0">Annulla</button>
              )}
            </div>
          )}
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-2 py-2 border-b border-slate-100">
            <button type="button" onClick={() => shift(-1)} aria-label="Mese prima" className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <span className="flex-1 text-center font-black text-slate-800" data-overtime-month>{monthLabel(cur.y, cur.m)}</span>
            <button type="button" onClick={() => shift(1)} aria-label="Mese dopo" className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className={`px-4 py-4 flex items-end justify-between bg-${color}-600 text-white`}>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide opacity-80">Totale del mese</div>
              <div className="text-4xl font-black leading-none mt-1" data-overtime-total>{fmtMin(total)}</div>
              <div className="text-sm font-semibold opacity-90 mt-1">{days.length === 1 ? "1 giorno" : `${days.length} giorni`}</div>
            </div>
            {days.length > 0 && (
              <button type="button" onClick={share} data-action="overtime-share"
                className="h-10 px-3 rounded-full bg-white/20 text-white font-bold text-sm flex items-center gap-1.5">
                <Share2 className="w-4 h-4" /> Manda
              </button>
            )}
          </div>
          {!days.length && <Empty>Nessuno straordinario segnato in questo mese.</Empty>}
          <ul className="divide-y divide-slate-100">
            {days.map((d) => (
              <li key={d.date} data-overtime-day={d.date}>
                {d.items.map((o, i) => (
                  <button key={o.id} type="button" onClick={() => { setError(""); setEdit({ ...o }); }}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50">
                    <span className="w-16 shrink-0 text-sm font-black text-slate-700">{i === 0 ? shortDay(d.date) : ""}</span>
                    <span className="flex-1 min-w-0 text-sm text-slate-600 truncate">{o.note || <span className="text-slate-400">—</span>}</span>
                    <span className="font-black text-slate-800 shrink-0">{fmtMin(o.minutes)}</span>
                  </button>
                ))}
                {d.items.length > 1 && (
                  <div className="px-4 pb-2 -mt-1 text-right text-xs font-bold text-slate-400">nel giorno: {fmtMin(d.minutes)}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {edit && (
        <Sheet
          title={edit.id ? "Modifica straordinario" : "Nuovo straordinario"}
          onClose={() => setEdit(null)}
          section="overtime-edit"
          footer={
            <>
              {edit.id && <GhostBtn danger onClick={del}>Elimina</GhostBtn>}
              <PrimaryBtn color={color} onClick={save}>Salva</PrimaryBtn>
            </>
          }
        >
          <Field label="Giorno" hint={longDay(edit.date)}>
            <input type="date" className={INPUT} value={edit.date} aria-label="Giorno" onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
          </Field>
          <Field label="Quanto in più">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => step(-15)} aria-label="Meno 15 minuti" className="w-12 h-12 rounded-2xl border border-slate-300 flex items-center justify-center">
                <Minus className="w-5 h-5" />
              </button>
              <span className="flex-1 text-center text-3xl font-black text-slate-800" data-overtime-edit-min>{fmtMin(edit.minutes)}</span>
              <button type="button" onClick={() => step(15)} aria-label="Più 15 minuti" className="w-12 h-12 rounded-2xl border border-slate-300 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </Field>
          <Field label="Nota (facoltativa)">
            <input className={INPUT} value={edit.note} aria-label="Nota" placeholder="Es. AMUT, guasto urgente" onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
          </Field>
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Con + e − cambi di 15 minuti.</p>
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        </Sheet>
      )}
    </div>
  );
};
