// LA MIA AREA · Calendario: impegni personali + interventi già fatti (dallo Storico).
import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, Bell, MapPin } from "lucide-react";
import {
  MONTHS,
  NOTIFY_BEFORE,
  monthGrid,
  todayIso,
  parseIso,
  longDay,
  eventsOn,
  jobDays,
  saveEvent,
  removePersonal,
} from "../../personal";
import { describeError } from "../../utils";
import { PanelHeader, Sheet, Field, INPUT, PrimaryBtn, GhostBtn } from "./PersonalUi";
import { PrintLogButton } from "../PrintLogButton";

const blank = (date) => ({ title: "", date, time: "", place: "", notifyBefore: "" });

export const CalendarPanel = ({ me, events, logs, onBack, onClose, color = "blue", onOpenMachine }) => {
  const today = todayIso();
  const [sel, setSel] = useState(today);
  const start = parseIso(today);
  const [ym, setYm] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState("");
  const jobs = useMemo(() => jobDays(logs, me), [logs, me]);
  const cells = monthGrid(ym.y, ym.m);
  const dayEvents = eventsOn(events, sel);
  const dayJobs = jobs[sel] || [];
  const hasEvent = useMemo(() => new Set((events || []).map((e) => e.date)), [events]);

  const shift = (d) =>
    setYm((p) => {
      const m = p.m + d;
      return { y: p.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });

  const save = async () => {
    if (!edit.title.trim()) return setError("Scrivi cosa devi fare.");
    if (!edit.date) return setError("Scegli il giorno.");
    try {
      await saveEvent(me, edit);
      setSel(edit.date);
      setEdit(null);
      setError("");
    } catch (e) {
      setError("Non salvato: " + describeError(e));
    }
  };
  const del = async () => {
    try {
      await removePersonal("events", edit.id);
      setEdit(null);
    } catch (e) {
      setError("Non eliminato: " + describeError(e));
    }
  };

  return (
    <div className="flex flex-col h-full" data-section="area-calendar">
      <PanelHeader
        title="Calendario"
        onBack={onBack}
        onClose={onClose}
        color={color}
        action={{ label: "Impegno", onClick: () => { setError(""); setEdit(blank(sel)); } }}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        <section className="bg-white rounded-3xl border border-slate-200 p-3">
          <div className="flex items-center justify-between px-1 pb-2">
            <button type="button" aria-label="Mese precedente" onClick={() => shift(-1)} className="p-2.5 rounded-full hover:bg-slate-100">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="font-black text-slate-800 text-base" data-month>
              {MONTHS[ym.m]} {ym.y}
            </div>
            <button type="button" aria-label="Mese successivo" onClick={() => shift(1)} className="p-2.5 rounded-full hover:bg-slate-100">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-black text-slate-400 pb-1">
            {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((iso, i) =>
              iso ? (
                <button
                  key={iso}
                  type="button"
                  data-day={iso}
                  onClick={() => setSel(iso)}
                  aria-label={longDay(iso)}
                  aria-pressed={iso === sel}
                  className="flex flex-col items-center gap-0.5 py-1 rounded-xl hover:bg-slate-50"
                >
                  <span
                    className={`w-8 h-8 leading-8 rounded-full text-sm font-bold ${
                      iso === sel
                        ? `bg-${color}-600 text-white`
                        : iso === today
                          ? `text-${color}-700 ring-2 ring-${color}-500`
                          : "text-slate-700"
                    }`}
                  >
                    {Number(iso.slice(8))}
                  </span>
                  <span className="flex gap-0.5 h-1.5">
                    {jobs[iso] && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    {hasEvent.has(iso) && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                  </span>
                </button>
              ) : (
                <div key={"e" + i} />
              )
            )}
          </div>
          <div className="flex gap-4 justify-center pt-2 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />Interventi fatti</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" />Impegni</span>
          </div>
        </section>

        <section className="space-y-2" data-section="day-list">
          <h4 className="font-black text-slate-800 px-1">{longDay(sel)}</h4>
          {!dayEvents.length && !dayJobs.length && (
            <p className="text-sm text-slate-500 px-1">Niente in questo giorno. Tocca «Impegno» per aggiungerne uno.</p>
          )}
          {dayEvents.map((e) => (
            <button
              key={e.id}
              type="button"
              data-event={e.id}
              onClick={() => {
                setError("");
                setEdit({ ...blank(e.date), ...e, notifyBefore: e.notifyBefore == null ? "" : String(e.notifyBefore) });
              }}
              className="w-full text-left bg-white rounded-2xl border border-slate-200 p-3 flex gap-3 items-center"
            >
              <span className="w-14 text-center font-black text-orange-700 text-sm">{e.time || "—"}</span>
              <span className="flex-1 min-w-0 border-l-[3px] border-orange-500 pl-3">
                <span className="block font-bold text-slate-800 break-words">{e.title}</span>
                <span className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                  {e.place && (<span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.place}</span>)}
                  {e.notifyBefore != null && (<span className="flex items-center gap-1"><Bell className="w-3 h-3" />avviso</span>)}
                </span>
              </span>
            </button>
          ))}
          {dayJobs.map((l) => (
            <div key={l.id} className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => onOpenMachine && onOpenMachine(l.machineId, l.customer)}
              className="flex-1 min-w-0 text-left bg-white rounded-2xl border border-slate-200 p-3 flex gap-3 items-center"
            >
              <span className="w-14 flex justify-center">
                <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </span>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-slate-800 truncate">
                  {l.customer} · {l.machineId}
                  {l.ticketNumber ? ` (N. ${l.ticketNumber})` : ""}
                </span>
                <span className="block text-xs text-slate-500 truncate">Intervento fatto · {l.description}</span>
              </span>
            </button>
            <PrintLogButton log={l} variant="square" />
            </div>
          ))}
        </section>
      </div>

      {edit && (
        <Sheet
          title={edit.id ? "Impegno" : "Nuovo impegno"}
          section="event-form"
          onClose={() => setEdit(null)}
          footer={
            <>
              {edit.id && (<GhostBtn danger onClick={del}>Elimina</GhostBtn>)}
              <PrimaryBtn color={color} onClick={save}>Salva</PrimaryBtn>
            </>
          }
        >
          <Field label="Cosa">
            <input className={INPUT} value={edit.title} aria-label="Cosa" placeholder="Es. Mario Rossi Srl – sostituzione fune gru 6" onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Giorno">
              <input type="date" className={INPUT} value={edit.date} aria-label="Giorno" onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
            </Field>
            <Field label="Ora">
              <input type="time" className={INPUT} value={edit.time} aria-label="Ora" onChange={(e) => setEdit({ ...edit, time: e.target.value })} />
            </Field>
          </div>
          <Field label="Dove (facoltativo)">
            <input className={INPUT} value={edit.place} aria-label="Dove" placeholder="Es. Novara" onChange={(e) => setEdit({ ...edit, place: e.target.value })} />
          </Field>
          <Field label="Avviso sul telefono" hint={edit.time ? "" : "Senza ora l'avviso arriva alle 8:00."}>
            <select className={INPUT} value={edit.notifyBefore} aria-label="Avviso" onChange={(e) => setEdit({ ...edit, notifyBefore: e.target.value })}>
              {NOTIFY_BEFORE.map((o) => (
                <option key={o.v} value={o.v}>{o.label}</option>
              ))}
            </select>
          </Field>
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        </Sheet>
      )}
    </div>
  );
};
