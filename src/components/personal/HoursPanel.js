// LA MIA AREA · Le mie ore: calendario degli orari (ore fatte, straordinari, ore in meno,
// ferie, permessi, malattia) con il riepilogo del mese.
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Minus, Share2, Check, BellRing, FileText, MessageSquareText } from "lucide-react";
import { openPdf } from "../PdfHost";
import { buildHoursPdf, pdfFileName } from "../../pdf";
import { Switch } from "./SettingsPanel";
import { todayIso, longDay, monthGrid } from "../../personal";
import {
  KINDS, fmtMin, fmtDelta, byDate, deltaOf, isFreeDay, monthSummary, cellLabel, monthLabel,
  saveDay, removeDay, getStd, setStd, withDefaults, getSince, saveHoursReminder,
  periodDays, rangeSummary, presetPeriods, periodText, periodLabel,
} from "../../hours";
import { describeError } from "../../utils";
import { PanelHeader, Sheet, Field, INPUT, PrimaryBtn, GhostBtn } from "./PersonalUi";

const TONE = {
  auto: "text-slate-400",
  slate: "text-slate-600",
  emerald: "text-emerald-700",
  amber: "text-amber-700",
  blue: "text-blue-700",
  purple: "text-purple-700",
  red: "text-red-700",
};
const DOT = { slate: "bg-slate-400", emerald: "bg-emerald-500", amber: "bg-amber-500", blue: "bg-blue-500", purple: "bg-purple-500", red: "bg-red-500" };

// ore per il promemoria: dalle 12:00 alle 21:00 ogni 15 minuti
const REM_TIMES = Array.from({ length: 37 }, (_, i) => {
  const m = 12 * 60 + i * 15;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

const Stepper = ({ value, onChange, step = 15, min = 0, max = 960, label }) => (
  <div className="flex items-center gap-3">
    <button type="button" onClick={() => onChange(Math.max(min, value - step))} aria-label={"Meno " + step + " minuti"} className="w-12 h-12 rounded-2xl border border-slate-300 flex items-center justify-center">
      <Minus className="w-5 h-5" />
    </button>
    <span className="flex-1 text-center text-3xl font-black text-slate-800" data-hours-value={label}>{fmtMin(value)}</span>
    <button type="button" onClick={() => onChange(Math.min(max, value + step))} aria-label={"Più " + step + " minuti"} className="w-12 h-12 rounded-2xl border border-slate-300 flex items-center justify-center">
      <Plus className="w-5 h-5" />
    </button>
  </div>
);

export const HoursPanel = ({ me, hours = [], reminder = null, onBack, onClose, color = "blue" }) => {
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [std, setStdState] = useState(getStd);
  const [edit, setEdit] = useState(null); // { date, kind, minutes, note, exists }
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const today = todayIso();
  const since = getSince();
  // con i giorni normali automatici (lun–ven, 8 h) fino a oggi
  const all = withDefaults(hours, cur.y, cur.m, std, since);
  const map = byDate(all);
  const cells = monthGrid(cur.y, cur.m);
  const sum = monthSummary(all, cur.y, cur.m, std);
  const todayH = byDate(withDefaults(hours, now.getFullYear(), now.getMonth(), std, since))[today];
  const [rem, setRem] = useState(() => ({ enabled: !!(reminder && reminder.enabled), time: (reminder && reminder.time) || "17:30" }));
  const saveRem = async (next) => {
    setRem(next);
    try {
      await saveHoursReminder(me, next);
    } catch (e) {
      setError("Non salvato: " + describeError(e));
    }
  };

  const shift = (d) =>
    setCur(({ y, m }) => {
      const x = new Date(y, m + d, 1);
      return { y: x.getFullYear(), m: x.getMonth() };
    });
  const open = (date) => {
    setError("");
    const h = map[date];
    setEdit(h && !h.auto ? { ...h, exists: true } : { date, kind: h ? h.kind : "lavoro", minutes: h ? h.minutes : isFreeDay(date) ? 240 : std, note: "", exists: false });
  };
  const quick = async (h, msg) => {
    setError("");
    try {
      await saveDay(me, { note: "", ...h, date: today });
      setFlash(msg);
      setTimeout(() => setFlash((f) => (f === msg ? "" : f)), 4000);
    } catch (e) {
      setError("Non salvato: " + describeError(e));
    }
  };
  const todayMin = todayH && todayH.kind === "lavoro" ? Number(todayH.minutes) || 0 : std;
  const save = async () => {
    try {
      await saveDay(me, edit);
      setEdit(null);
    } catch (e) {
      setError("Non salvato: " + describeError(e));
    }
  };
  const del = async () => {
    try {
      await removeDay(me, edit.date);
      setEdit(null);
    } catch (e) {
      setError("Non tolto: " + describeError(e));
    }
  };
  // MANDA: scegli il periodo, poi PDF (carino, con le note) o testo
  const [send, setSend] = useState(null); // { id, from, to }
  const presets = presetPeriods(now);
  const openSend = () => {
    const ym = `${cur.y}-${String(cur.m + 1).padStart(2, "0")}`;
    const p = presets.find((x) => x.from.slice(0, 7) === ym && (x.id === "mese" || x.id === "scorso"));
    setSend(p ? { ...p } : { id: "scelta", from: `${ym}-01`, to: `${ym}-${String(new Date(cur.y, cur.m + 1, 0).getDate()).padStart(2, "0")}` });
  };
  const sendDays = send ? periodDays(hours, send.from, send.to, std, since) : [];
  const sendSum = rangeSummary(sendDays, std);
  const sendPdf = () =>
    openPdf(() => buildHoursPdf({ me, from: send.from, to: send.to, days: sendDays, std }), pdfFileName("Ore", me, send.from, send.to));
  const sendText = async () => {
    const text = periodText(me, sendDays, send.from, send.to, std);
    try {
      if (navigator.share) await navigator.share({ title: "Le mie ore", text });
      else {
        await navigator.clipboard.writeText(text);
        setFlash("Riepilogo copiato: incollalo dove vuoi");
      }
    } catch (e) {
      // annullato
    }
  };
  const changeStd = (n) => {
    setStd(n);
    setStdState(n);
  };
  const todayText = !todayH
    ? "da segnare"
    : todayH.auto
      ? todayH.kind === "lavoro" ? `${fmtMin(todayH.minutes)} (normale)` : "festa"
      : todayH.kind === "lavoro"
      ? fmtMin(todayH.minutes) + (deltaOf(todayH, std) ? ` (${fmtDelta(deltaOf(todayH, std))})` : "")
      : todayH.kind === "permesso"
        ? "permesso " + fmtMin(todayH.minutes)
        : KINDS.find((k) => k.id === todayH.kind).label;

  return (
    <div className="flex flex-col h-full" data-section="area-hours">
      <PanelHeader title="Le mie ore" sub="Le vedi solo tu" onBack={onBack} onClose={onClose} color={color} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {/* OGGI */}
        <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3" data-section="hours-today">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="font-black text-slate-800">Oggi</h4>
            <span className="text-sm font-bold text-slate-500" data-hours-today>{todayText}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button type="button" data-quick="std" onClick={() => quick({ kind: "lavoro", minutes: std }, `Oggi: ${fmtMin(std)}`)}
              className={`h-12 rounded-2xl bg-${color}-600 text-white font-black text-sm flex items-center justify-center gap-1 active:scale-95`}>
              <Check className="w-4 h-4" /> {fmtMin(std)}
            </button>
            <button type="button" data-quick="+30" onClick={() => quick({ ...(todayH && todayH.kind === "lavoro" ? todayH : {}), kind: "lavoro", minutes: todayMin + 30 }, `Oggi: ${fmtMin(todayMin + 30)}`)}
              className="h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-sm active:scale-95">
              +30 min
            </button>
            <button type="button" data-quick="+60" onClick={() => quick({ ...(todayH && todayH.kind === "lavoro" ? todayH : {}), kind: "lavoro", minutes: todayMin + 60 }, `Oggi: ${fmtMin(todayMin + 60)}`)}
              className="h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-sm active:scale-95">
              +1 h
            </button>
            <button type="button" data-quick="altro" onClick={() => open(today)}
              className="h-12 rounded-2xl border border-slate-300 text-slate-700 font-black text-sm active:scale-95">
              Altro…
            </button>
          </div>
          {flash && <p className="text-sm font-bold text-emerald-700" data-section="hours-flash">{flash}</p>}
          {error && !edit && <p className="text-sm font-bold text-red-600">{error}</p>}
        </section>

        {/* CALENDARIO */}
        <section className="bg-white rounded-3xl border border-slate-200 p-3" data-section="hours-calendar">
          <div className="flex items-center justify-between px-1 pb-2">
            <button type="button" aria-label="Mese prima" onClick={() => shift(-1)} className="p-2.5 rounded-full hover:bg-slate-100">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="font-black text-slate-800" data-hours-month>{monthLabel(cur.y, cur.m)}</div>
            <button type="button" aria-label="Mese dopo" onClick={() => shift(1)} className="p-2.5 rounded-full hover:bg-slate-100">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-black text-slate-400 pb-1">
            {["L", "M", "M", "G", "V", "S", "D"].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((iso, i) => {
              if (!iso) return <div key={"e" + i} />;
              const lab = cellLabel(map[iso], std);
              const weekend = i % 7 >= 5;
              return (
                <button key={iso} type="button" data-hours-day={iso} onClick={() => open(iso)} aria-label={longDay(iso)}
                  className={`h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 border ${
                    iso === today ? `border-${color}-500 ring-1 ring-${color}-300` : lab ? "border-slate-200 bg-slate-50" : "border-transparent"
                  } ${weekend && !lab ? "opacity-60" : ""}`}>
                  <span className={`text-sm font-bold ${iso === today ? `text-${color}-700` : "text-slate-700"}`}>{Number(iso.slice(8))}</span>
                  <span className={`text-[11px] font-black leading-none h-3 ${lab ? TONE[lab.tone] : ""}`} data-cell-label>{lab ? lab.text : ""}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center pt-3 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300" />8 grigio = normale (automatico)</span>
            <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${DOT.slate}`} />8 = segnato da te</span>
            <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${DOT.emerald}`} />+ in più</span>
            <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${DOT.amber}`} />− in meno</span>
            <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${DOT.blue}`} />F ferie</span>
            <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${DOT.purple}`} />P permesso</span>
            <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${DOT.red}`} />M malattia</span>
            <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${DOT.slate}`} />R riposo</span>
          </div>
        </section>

        {/* RIEPILOGO */}
        <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden" data-section="hours-summary">
          <div className={`px-4 py-4 bg-${color}-600 text-white flex items-end justify-between gap-2`}>
            <div>
              <div className="text-xs font-bold opacity-80">{monthLabel(cur.y, cur.m)}</div>
              <div className="text-3xl font-black leading-none mt-1" data-hours-worked>{fmtMin(sum.worked)}</div>
              <div className="text-sm font-semibold opacity-90 mt-1">lavorate in {sum.workDays} {sum.workDays === 1 ? "giorno" : "giorni"}</div>
            </div>
            <button type="button" onClick={openSend} data-action="hours-share" className="h-10 px-3 rounded-full bg-white/20 text-white font-bold text-sm flex items-center gap-1.5">
              <Share2 className="w-4 h-4" /> Manda
            </button>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
            {[
              ["Straordinari", fmtMin(sum.extra), "text-emerald-700", "extra"],
              ["Ore in meno", fmtMin(sum.less), "text-amber-700", "less"],
              ["Permessi", fmtMin(sum.permesso), "text-purple-700", "permesso"],
            ].map(([l, v, c, id]) => (
              <div key={l} className="p-3 text-center">
                <div className={`text-lg font-black ${c}`} data-sum={id}>{v}</div>
                <div className="text-[11px] font-bold text-slate-500">{l}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            {[
              ["Ferie", sum.ferie, "text-blue-700", "ferie"],
              ["Malattia", sum.malattia, "text-red-700", "malattia"],
              ["Riposo", sum.festa, "text-slate-700", "festa"],
            ].map(([l, v, c, id]) => (
              <div key={l} className="p-3 text-center">
                <div className={`text-lg font-black ${c}`} data-sum={id}>{v} {v === 1 ? "g" : "gg"}</div>
                <div className="text-[11px] font-bold text-slate-500">{l}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3" data-section="hours-reminder">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </span>
            <div className="flex-1">
              <div className="font-bold text-slate-800">Ricordamelo</div>
              <div className="text-xs text-slate-500">Dal lunedì al venerdì una notifica: «Hai fatto ore in più o in meno?»</div>
            </div>
            <Switch id="hours-reminder" label="Ricordamelo" on={rem.enabled} onChange={(v) => saveRem({ ...rem, enabled: v })} />
          </div>
          {rem.enabled && (
            <div className="flex items-center gap-3 pl-[52px]">
              <span className="text-sm font-bold text-slate-600 flex-1">Alle ore</span>
              <select value={rem.time} aria-label="Ora del promemoria" data-field="hours-reminder-time"
                onChange={(e) => saveRem({ ...rem, time: e.target.value })}
                className="h-11 px-3 rounded-xl border border-slate-300 bg-slate-50 font-black text-slate-800">
                {REM_TIMES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}
          {rem.enabled && (
            <p className="text-xs text-slate-500 pl-[52px]">Servono le notifiche accese (⚙ Impostazioni). Se hai già segnato il giorno non arriva.</p>
          )}
        </section>

        <section className="bg-white rounded-3xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="font-bold text-slate-800">Orario normale</div>
            <div className="text-xs text-slate-500">Da lunedì a venerdì conta da solo, se non scrivi altro</div>
          </div>
          <button type="button" aria-label="Orario normale meno 30 minuti" onClick={() => changeStd(Math.max(60, std - 30))} className="w-10 h-10 rounded-xl border border-slate-300 flex items-center justify-center"><Minus className="w-4 h-4" /></button>
          <span className="w-16 text-center font-black text-slate-800" data-hours-std>{fmtMin(std)}</span>
          <button type="button" aria-label="Orario normale più 30 minuti" onClick={() => changeStd(Math.min(720, std + 30))} className="w-10 h-10 rounded-xl border border-slate-300 flex items-center justify-center"><Plus className="w-4 h-4" /></button>
        </section>
      </div>

      {send && (
        <Sheet
          title="Manda le ore"
          section="hours-send"
          onClose={() => setSend(null)}
          footer={
            <>
              <GhostBtn onClick={sendText}>
                <MessageSquareText className="w-4 h-4 inline mr-1" /> Testo
              </GhostBtn>
              <PrimaryBtn color={color} onClick={sendPdf}>
                <FileText className="w-4 h-4 inline mr-1" /> PDF
              </PrimaryBtn>
            </>
          }
        >
          <Field label="Periodo">
            <div className="flex flex-wrap gap-2" data-section="hours-periods">
              {[...presets, { id: "scelta", label: "Scegli le date" }].map((p) => (
                <button key={p.id} type="button" data-period={p.id}
                  onClick={() => setSend(p.id === "scelta" ? { ...send, id: "scelta" } : { ...p })}
                  className={`h-10 px-3.5 rounded-full text-sm font-bold border ${send.id === p.id ? `bg-${color}-600 border-${color}-600 text-white` : "bg-white border-slate-300 text-slate-700"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </Field>
          {send.id === "scelta" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dal">
                <input type="date" className={`${INPUT} mora-date`} value={send.from} aria-label="Dal" onChange={(e) => setSend({ ...send, from: e.target.value })} />
              </Field>
              <Field label="Al">
                <input type="date" className={`${INPUT} mora-date`} value={send.to} aria-label="Al" onChange={(e) => setSend({ ...send, to: e.target.value })} />
              </Field>
            </div>
          )}
          <div className={`rounded-2xl bg-${color}-50 p-4 space-y-1`} data-section="hours-send-sum">
            <p className="text-xs font-black text-slate-500">{periodLabel(send.from, send.to)}</p>
            <p className="text-2xl font-black text-slate-800">{fmtMin(sendSum.worked)} <span className="text-sm font-bold text-slate-500">in {sendSum.workDays} giorni</span></p>
            <p className="text-sm font-bold text-slate-600">
              {[sendSum.extra && `+${fmtMin(sendSum.extra)} straordinari`, sendSum.less && `-${fmtMin(sendSum.less)} in meno`, sendSum.ferie && `${sendSum.ferie} g ferie`, sendSum.permesso && `${fmtMin(sendSum.permesso)} permessi`, sendSum.malattia && `${sendSum.malattia} g malattia`].filter(Boolean).join(" · ") || "Nessuna differenza dall'orario normale"}
            </p>
            <p className="text-xs text-slate-500">Nel PDF: riepilogo e un giorno per riga con le note.</p>
          </div>
        </Sheet>
      )}
      {edit && (
        <Sheet
          title={longDay(edit.date)}
          onClose={() => setEdit(null)}
          section="hours-edit"
          footer={
            <>
              {edit.exists && <GhostBtn danger onClick={del}>Togli</GhostBtn>}
              <PrimaryBtn color={color} onClick={save}>Salva</PrimaryBtn>
            </>
          }
        >
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo di giornata">
            {KINDS.map((k) => (
              <button key={k.id} type="button" data-kind={k.id} aria-pressed={edit.kind === k.id}
                onClick={() => setEdit({ ...edit, kind: k.id, minutes: k.id === "lavoro" ? (edit.kind === "lavoro" ? edit.minutes : isFreeDay(edit.date) ? 240 : std) : k.id === "permesso" ? 120 : 0 })}
                className={`h-10 px-4 rounded-full text-sm font-bold border-2 ${edit.kind === k.id ? "border-slate-800 bg-slate-800 text-white" : "border-slate-200 text-slate-600"}`}>
                {k.label}
              </button>
            ))}
          </div>
          {edit.kind === "lavoro" && (
            <Field label="Ore fatte">
              <Stepper label="lavoro" value={Number(edit.minutes) || 0} onChange={(v) => setEdit({ ...edit, minutes: v })} />
              <p className={`text-center text-sm font-black ${deltaOf(edit, std) > 0 ? "text-emerald-700" : deltaOf(edit, std) < 0 ? "text-amber-700" : "text-slate-500"}`} data-hours-delta>
                {deltaOf(edit, std) > 0 ? `${fmtMin(deltaOf(edit, std))} di straordinario` : deltaOf(edit, std) < 0 ? `${fmtMin(-deltaOf(edit, std))} in meno` : "giornata normale"}
              </p>
            </Field>
          )}
          {edit.kind === "permesso" && (
            <Field label="Ore di permesso">
              <Stepper label="permesso" value={Number(edit.minutes) || 0} onChange={(v) => setEdit({ ...edit, minutes: v })} />
            </Field>
          )}
          <Field label="Nota (facoltativa)">
            <input className={INPUT} value={edit.note || ""} aria-label="Nota" placeholder="Es. Rossi guasto urgente, visita medica" onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
          </Field>
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        </Sheet>
      )}
    </div>
  );
};
