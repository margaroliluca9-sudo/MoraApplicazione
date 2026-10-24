// SCHERMO PER LA TV DELL'UFFICIO: a tutto schermo, si aggiorna da solo.
// Interventi di oggi, tecnici online, numeri del mese, ultimi 7 giorni, avvisi aziendali.
// Si apre da Ufficio → «Schermo TV» oppure con l'indirizzo dell'app + ?tv=1 (utile come preferito sulla TV).
// Non legge niente di più: usa gli stessi dati che l'app ha già.
import React, { useEffect, useMemo, useState } from "react";
import { X, Maximize, Users, Wrench, ClipboardCheck, CalendarDays, Megaphone } from "lucide-react";
import { isRepair } from "./OfficeCharts";

const parse = (ds) => {
  const p = String(ds || "").split("/").map(Number);
  return p.length === 3 && p.every((n) => !isNaN(n)) ? new Date(p[2], p[1] - 1, p[0]) : null;
};
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const created = (l) => (l.createdAt && l.createdAt.seconds ? l.createdAt.seconds * 1000 : 0);
const techs = (l) => [l.technician, ...(l.additionalTechnicians || [])].filter((t) => String(t || "").trim()).join(", ");
const DAYS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

export const tvNumbers = (logs, now = new Date()) => {
  const today = logs.filter((l) => sameDay(parse(l.dateString), now)).sort((a, b) => created(b) - created(a));
  const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterday = logs.filter((l) => sameDay(parse(l.dateString), y)).sort((a, b) => created(b) - created(a));
  const month = logs.filter((l) => {
    const d = parse(l.dateString);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
    const n = logs.filter((l) => sameDay(parse(l.dateString), d)).length;
    return { d, n, label: i === 6 ? "Oggi" : DAYS[d.getDay()] };
  });
  return { today, yesterday, month: month.length, fix: month.filter(isRepair).length, check: month.filter((l) => !isRepair(l)).length, week };
};

export const TvScreen = ({ logs = [], users = [], notices = [], onClose, color = "blue" }) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  // lo schermo non si spegne da solo (se il browser lo permette)
  useEffect(() => {
    let lock = null;
    const ask = () => {
      try {
        if (navigator.wakeLock && document.visibilityState === "visible") navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
      } catch (e) {
        // niente
      }
    };
    ask();
    document.addEventListener("visibilitychange", ask);
    const onKey = (e) => e.key === "Escape" && onClose && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("visibilitychange", ask);
      window.removeEventListener("keydown", onKey);
      try {
        if (lock) lock.release();
      } catch (e) {
        // niente
      }
    };
  }, [onClose]);
  const day = now.toDateString();
  // si ricalcola quando cambiano i dati o il giorno
  const n = useMemo(() => tvNumbers(logs, new Date(day)), [logs, day]);
  const maxW = Math.max(1, ...n.week.map((x) => x.n));
  const full = () => {
    try {
      const el = document.documentElement;
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.requestFullscreen) el.requestFullscreen();
    } catch (e) {
      // niente
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-slate-950 text-white overflow-y-auto" data-section="tv-screen">
      <div className="min-h-full flex flex-col p-4 md:p-8 gap-4 md:gap-6">
        <header className="flex items-center gap-4">
          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-${color}-600 flex items-center justify-center text-2xl md:text-3xl font-black`}>M</div>
          <div className="flex-1 min-w-0">
            <p className="text-xl md:text-3xl xl:text-4xl font-black leading-tight">Assistenza Mora</p>
            <p className="text-sm md:text-xl xl:text-2xl text-slate-400 font-bold capitalize">{now.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <p className="text-4xl md:text-7xl font-black tabular-nums" data-tv-clock>
            {now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={onClose} aria-label="Chiudi lo schermo TV" className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <X className="w-6 h-6" />
            </button>
            <button type="button" onClick={full} aria-label="Tutto schermo" className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <section className="lg:col-span-2 rounded-3xl bg-white/5 border border-white/10 p-4 md:p-6 flex flex-col min-h-[300px]" data-tv-today>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xl md:text-3xl xl:text-4xl font-black">Interventi di oggi</h2>
              <span className="text-4xl md:text-6xl font-black text-emerald-400 tabular-nums">{n.today.length}</span>
            </div>
            {n.today.length === 0 ? (
              <p className="text-lg md:text-2xl text-slate-400 font-bold">Ancora nessun rapporto oggi.</p>
            ) : (
              <ul className="space-y-2 md:space-y-3 overflow-hidden">
                {n.today.slice(0, 8).map((l) => (
                  <li key={l.id} className="rounded-2xl bg-white/5 px-4 py-3 flex items-center gap-3 md:gap-4">
                    <span className={`w-3 h-3 md:w-4 md:h-4 rounded-full shrink-0 ${isRepair(l) ? "mora-bar-fix" : "mora-bar-check"}`} aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-lg md:text-2xl xl:text-3xl font-black truncate">
                        {l.customer} <span className="text-slate-400 font-bold">· gru {l.machineId}</span>
                      </span>
                      <span className="block text-sm md:text-lg xl:text-xl text-slate-300 truncate">{l.description}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-sm md:text-lg font-bold text-slate-200">{techs(l)}</span>
                      <span className="block text-xs md:text-base text-slate-400">{isRepair(l) ? "Riparazione" : "Verifica"}{created(l) ? ` · ${new Date(created(l)).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}` : ""}</span>
                    </span>
                  </li>
                ))}
                {n.today.length > 8 && <li className="text-slate-400 font-bold md:text-xl px-2">e altri {n.today.length - 8}…</li>}
              </ul>
            )}
            {n.today.length < 5 && n.yesterday.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/10" data-tv-yesterday>
                <h3 className="text-base md:text-xl xl:text-2xl font-black text-slate-400 mb-2">Ieri · {n.yesterday.length}</h3>
                <ul className="space-y-1.5">
                  {n.yesterday.slice(0, 6 - n.today.length).map((l) => (
                    <li key={l.id} className="flex items-center gap-3 text-slate-300 md:text-lg xl:text-xl">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isRepair(l) ? "mora-bar-fix" : "mora-bar-check"}`} aria-hidden="true" />
                      <span className="font-bold truncate">{l.customer}</span>
                      <span className="text-slate-500 shrink-0">gru {l.machineId}</span>
                      <span className="ml-auto text-slate-400 truncate">{techs(l)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-auto pt-4 text-xs md:text-base text-slate-500 flex gap-4">
              <span className="flex items-center gap-1.5"><span className="mora-bar-check w-3 h-3 rounded-full" /> Verifica</span>
              <span className="flex items-center gap-1.5"><span className="mora-bar-fix w-3 h-3 rounded-full" /> Riparazione</span>
            </p>
          </section>

          <div className="flex flex-col gap-4 md:gap-6">
            <section className="rounded-3xl bg-white/5 border border-white/10 p-4 md:p-6" data-tv-online>
              <h2 className="text-lg md:text-2xl font-black flex items-center gap-2 mb-3">
                <Users className="w-6 h-6 text-emerald-400" /> Tecnici online <span className="ml-auto text-emerald-400 tabular-nums">{users.length}</span>
              </h2>
              {users.length === 0 ? (
                <p className="text-slate-400 font-bold">Nessuno collegato adesso.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {users.map((u) => (
                    <span key={u.id || u.technician} className="px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-200 font-bold md:text-lg flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> {u.technician}
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl bg-white/5 border border-white/10 p-4 md:p-6" data-tv-month>
              <h2 className="text-lg md:text-2xl font-black flex items-center gap-2 mb-3 capitalize">
                <CalendarDays className="w-6 h-6 text-sky-400" /> {now.toLocaleDateString("it-IT", { month: "long" })}
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-white/5 py-3">
                  <p className="text-3xl md:text-5xl font-black tabular-nums">{n.month}</p>
                  <p className="text-xs md:text-base text-slate-400 font-bold">interventi</p>
                </div>
                <div className="rounded-2xl bg-white/5 py-3">
                  <p className="text-3xl md:text-5xl font-black tabular-nums flex items-center justify-center gap-1"><ClipboardCheck className="w-5 h-5 md:w-7 md:h-7 text-sky-400" />{n.check}</p>
                  <p className="text-xs md:text-base text-slate-400 font-bold">verifiche</p>
                </div>
                <div className="rounded-2xl bg-white/5 py-3">
                  <p className="text-3xl md:text-5xl font-black tabular-nums flex items-center justify-center gap-1"><Wrench className="w-5 h-5 md:w-7 md:h-7 text-orange-400" />{n.fix}</p>
                  <p className="text-xs md:text-base text-slate-400 font-bold">riparazioni</p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white/5 border border-white/10 p-4 md:p-6" data-tv-week>
              <h2 className="text-lg md:text-2xl font-black mb-3">Ultimi 7 giorni</h2>
              <div className="flex items-end gap-2 h-28 md:h-40">
                {n.week.map((x) => (
                  <div key={x.label + x.d.getDate()} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${x.label}: ${x.n} interventi`}>
                    <span className="text-sm md:text-lg font-black tabular-nums">{x.n}</span>
                    <span className={`w-full rounded-t-md ${x.label === "Oggi" ? "bg-emerald-400" : "bg-sky-500"}`} style={{ height: `${Math.max(4, (x.n / maxW) * 100)}%` }} />
                    <span className="text-xs md:text-base text-slate-400 font-bold">{x.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {notices.length > 0 && (
          <footer className="rounded-3xl bg-amber-400 text-slate-900 px-5 py-3 md:py-4 flex items-center gap-3" data-tv-notices>
            <Megaphone className="w-6 h-6 md:w-8 md:h-8 shrink-0" />
            <p className="text-lg md:text-2xl font-black">{notices.join("  ·  ")}</p>
          </footer>
        )}
      </div>
    </div>
  );
};
