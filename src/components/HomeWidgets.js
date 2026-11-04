// IN CIMA ALLA HOME, LE ALTRE PAGINE DEL CAROSELLO (dopo il carroponte e la misura veloce), disegnate dall'app:
//  - «Calendario»: il foglio del calendario da strappare con il giorno grande e le cose da fare oggi
//  - «Contachilometri»: il cruscotto con la lancetta e il contatore dei miei interventi dell'anno
//  - «Cartello»: il cartello giallo di sicurezza con la regola del giorno (testi già nell'app, parola per parola)
// Ogni pagina riceve active = true quando è quella in vista (così le animazioni partono quando la vedi).
import React, { useEffect, useState } from "react";
import { MONTHS } from "../personal";
import { SLING_TEXT, SLING_SOURCE } from "../slingRules";
import { CHAIN_TEXT, CHAIN_SOURCE } from "../chainSlings";
import { myYearCount } from "./HomeHero";

const DAY = 86400000;
const DAYS = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const H = "h-full min-h-[184px] md:min-h-[220px] lg:min-h-[240px]";

// ---------------------------------------------------------------- CALENDARIO DA STRAPPARE
export const CalendarWidget = ({ items = [], active = false, now = new Date(), onOpen }) => {
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (!active) return undefined;
    setFlip(true);
    const t = setTimeout(() => setFlip(false), 700);
    return () => clearTimeout(t);
  }, [active]);
  const list = items.slice(0, 2);
  return (
    <button type="button" onClick={onOpen} className={`${H} w-full rounded-3xl relative overflow-hidden text-left`} style={{ background: "linear-gradient(160deg,#fef3c7,#fde68a 60%,#fcd34d)" }} data-home-widget="calendar">
      <style>{"@keyframes moraTear{0%{transform:rotate(0) translateY(0);opacity:1}100%{transform:rotate(-14deg) translate(-30px,60px);opacity:0}}"}</style>
      {/* puntine e ombra del muro */}
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(#b45309 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
      <div className="relative h-full flex items-stretch gap-3 p-4">
        <div className="relative w-[132px] shrink-0">
          {/* fogli sotto */}
          <div className="absolute inset-x-1 top-3 bottom-[-4px] rounded-2xl bg-white/70 shadow" />
          <div className="absolute inset-x-0.5 top-2 bottom-[-2px] rounded-2xl bg-white/85 shadow" />
          {/* il foglio di oggi */}
          <div className="relative h-full rounded-2xl bg-white shadow-lg overflow-hidden flex flex-col">
            <div className="bg-red-600 text-white text-center py-1.5 relative">
              <span className="absolute left-5 -top-1.5 w-2.5 h-4 rounded-full bg-slate-700 border-2 border-slate-300" />
              <span className="absolute right-5 -top-1.5 w-2.5 h-4 rounded-full bg-slate-700 border-2 border-slate-300" />
              <span className="text-xs font-black uppercase tracking-[0.2em]">{MONTHS[now.getMonth()]}</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <span className="font-black text-slate-900 tabular-nums leading-none" style={{ fontSize: 64, letterSpacing: "-3px" }} data-cal-day>
                {now.getDate()}
              </span>
              <span className="text-sm font-black text-red-600 mt-1">{DAYS[now.getDay()]}</span>
            </div>
            <div className="h-2 border-t border-dashed border-slate-300" />
          </div>
          {/* il foglio di ieri che vola via */}
          {flip && (
            <div className="absolute inset-0 rounded-2xl bg-white shadow-lg flex items-center justify-center pointer-events-none" style={{ animation: "moraTear .7s ease-in forwards", transformOrigin: "top left" }}>
              <span className="font-black text-slate-300 tabular-nums" style={{ fontSize: 64 }}>
                {new Date(now.getTime() - DAY).getDate()}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-[11px] font-black uppercase tracking-wider text-amber-800">Oggi</p>
          {list.length === 0 ? (
            <p className="text-lg font-black text-amber-950 leading-snug mt-1" data-cal-empty>
              Niente in agenda.
              <span className="block text-sm font-bold text-amber-800">Buon lavoro!</span>
            </p>
          ) : (
            <ul className="mt-1 space-y-1.5" data-cal-items={items.length}>
              {list.map((it, i) => (
                <li key={it.id || i} className="flex items-start gap-2">
                  <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${it.late ? "bg-red-600" : it.kind === "event" ? "bg-blue-600" : "bg-amber-600"}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-amber-950 leading-tight line-clamp-2">{it.title}</span>
                    <span className="block text-[11px] font-bold text-amber-800">{it.late ? "in ritardo" : it.time || (it.kind === "event" ? "tutto il giorno" : "promemoria")}</span>
                  </span>
                </li>
              ))}
              {items.length > 2 && <li className="text-[11px] font-black text-amber-800">e altre {items.length - 2}</li>}
            </ul>
          )}
        </div>
      </div>
    </button>
  );
};

// ---------------------------------------------------------------- CONTACHILOMETRI DELL'ANNO
const Roll = ({ d, active }) => (
  <span className="relative inline-block w-[22px] h-[30px] overflow-hidden rounded-[4px] bg-slate-950 border border-slate-700 mx-[1px]">
    <span className="absolute left-0 right-0 flex flex-col items-center transition-transform duration-[1400ms] ease-out" style={{ transform: `translateY(-${active ? d * 30 : 0}px)` }}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
        <span key={n} className="h-[30px] leading-[30px] text-[19px] font-black text-white tabular-nums font-mono">
          {n}
        </span>
      ))}
    </span>
    <span className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(#000a,transparent 35%,transparent 65%,#000a)" }} />
  </span>
);

export const OdometerWidget = ({ logs = [], me = "", active = false, now = new Date() }) => {
  const n = myYearCount(logs, me, now);
  const goal = Math.max(50, Math.ceil((n + 1) / 50) * 50);
  const from = goal - 50;
  const frac = Math.min(1, (n - from) / 50);
  const ang = -120 + 240 * (active ? frac : 0);
  const digits = String(n).padStart(4, "0").slice(-4).split("").map(Number);
  const R = 62;
  const cx = 80;
  const cy = 78;
  const pt = (a, r) => [cx + r * Math.sin((a * Math.PI) / 180), cy - r * Math.cos((a * Math.PI) / 180)];
  const arc = (a1, a2, r) => {
    const [x1, y1] = pt(a1, r);
    const [x2, y2] = pt(a2, r);
    return `M${x1},${y1} A${r},${r} 0 ${a2 - a1 > 180 ? 1 : 0},1 ${x2},${y2}`;
  };
  return (
    <div className={`${H} rounded-3xl relative overflow-hidden text-white`} style={{ background: "radial-gradient(120% 120% at 30% 20%,#1e293b,#020617)" }} data-home-widget="odometer" data-odo-count={n}>
      <div className="relative h-full flex items-center gap-2 p-3">
        <svg viewBox="0 0 160 130" className="w-[46%] max-w-[210px] shrink-0" aria-label={`Contachilometri: ${n} interventi nel ${now.getFullYear()}`}>
          <defs>
            <linearGradient id="odoArc" x1="0" x2="1">
              <stop offset="0" stopColor="#22c55e" />
              <stop offset=".6" stopColor="#facc15" />
              <stop offset="1" stopColor="#f97316" />
            </linearGradient>
            <filter id="odoGlow">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>
          <path d={arc(-120, 120, R)} fill="none" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
          <path d={arc(-120, 120, R)} fill="none" stroke="url(#odoArc)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(2 * Math.PI * R * 240) / 360}`} strokeDashoffset={`${((2 * Math.PI * R * 240) / 360) * (1 - (active ? frac : 0))}`} style={{ transition: "stroke-dashoffset 1.4s ease-out" }} />
          {Array.from({ length: 11 }).map((_, i) => {
            const a = -120 + i * 24;
            const [x1, y1] = pt(a, R - 12);
            const [x2, y2] = pt(a, R - (i % 5 === 0 ? 22 : 17));
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth={i % 5 === 0 ? 2.2 : 1.2} />;
          })}
          {[0, 5, 10].map((i) => {
            const [x, y] = pt(-120 + i * 24, R - 32);
            return (
              <text key={i} x={x} y={Number(y) + 4} textAnchor="middle" fontSize="10" fontWeight="800" fill="#cbd5e1">
                {from + i * 5}
              </text>
            );
          })}
          <g style={{ transform: `rotate(${ang}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: "transform 1.4s cubic-bezier(.2,1.4,.4,1)" }}>
            <line x1={cx} y1={cy + 8} x2={cx} y2={cy - R + 8} stroke="#f97316" strokeWidth="5" strokeLinecap="round" filter="url(#odoGlow)" opacity=".7" />
            <line x1={cx} y1={cy + 8} x2={cx} y2={cy - R + 8} stroke="#fb923c" strokeWidth="2.5" strokeLinecap="round" />
          </g>
          <circle cx={cx} cy={cy} r="7" fill="#0f172a" stroke="#f97316" strokeWidth="2" />
          <text x={cx} y="122" textAnchor="middle" fontSize="9" fontWeight="800" fill="#64748b" letterSpacing="2">
            INTERVENTI
          </text>
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-400">Il tuo {now.getFullYear()}</p>
          <div className="mt-1.5 inline-flex p-1 rounded-lg bg-slate-800 border border-slate-600 shadow-inner" data-odo-digits>
            {digits.map((d, i) => (
              <Roll key={i} d={d} active={active} />
            ))}
          </div>
          <p className="text-sm font-bold text-slate-300 mt-2 leading-snug">
            {n === 1 ? "intervento" : "interventi"} quest'anno
          </p>
          <p className="text-[12px] font-bold text-slate-400 leading-snug" data-odo-goal={goal}>
            {goal - n === 1 ? "Ne manca 1" : `Ne mancano ${goal - n}`} al traguardo dei {goal}
          </p>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- CARTELLO DI SICUREZZA: LA REGOLA DEL GIORNO
export const RULES = [
  { t: SLING_TEXT.angolo, s: SLING_SOURCE },
  { t: SLING_TEXT.spigoli, s: SLING_SOURCE },
  { t: SLING_TEXT.nodi, s: SLING_SOURCE },
  { t: SLING_TEXT.danneggiate, s: SLING_SOURCE },
  { t: SLING_TEXT.verifiche, s: SLING_SOURCE },
  { t: SLING_TEXT.chimici, s: SLING_SOURCE },
  { t: CHAIN_TEXT.perno, s: CHAIN_SOURCE },
  { t: CHAIN_TEXT.usura, s: CHAIN_SOURCE },
  { t: "Le funi e le catene debbono essere sottoposte a controlli trimestrali in mancanza di specifica indicazione da parte del fabbricante.", s: "D.Lgs. 81/2008, Allegato VI, punto 3.1.2" },
];
export const ruleOfDay = (now = new Date()) => {
  const n = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / DAY);
  return RULES[n % RULES.length];
};

export const SignWidget = ({ active = false, now = new Date() }) => {
  const r = ruleOfDay(now);
  return (
    <div className={`${H} rounded-3xl relative overflow-hidden p-2.5`} style={{ background: "repeating-linear-gradient(-45deg,#111827 0 16px,#facc15 16px 32px)" }} data-home-widget="sign">
      <style>{"@keyframes moraSwing{0%{transform:rotate(-2.5deg)}50%{transform:rotate(2deg)}100%{transform:rotate(0)}}"}</style>
      <div className="relative h-full rounded-2xl bg-yellow-300 border-[3px] border-slate-900 flex items-center gap-3 p-3 shadow-inner" style={{ animation: active ? "moraSwing .9s ease-out" : "none", transformOrigin: "top center" }}>
        {/* bulloni */}
        {["left-1.5 top-1.5", "right-1.5 top-1.5", "left-1.5 bottom-1.5", "right-1.5 bottom-1.5"].map((p) => (
          <span key={p} className={`absolute ${p} w-2.5 h-2.5 rounded-full bg-slate-500 border border-slate-800`} />
        ))}
        <svg viewBox="0 0 100 90" className="w-[30%] max-w-[110px] shrink-0" aria-hidden="true">
          <path d="M50,6 L95,84 L5,84 Z" fill="#facc15" stroke="#111827" strokeWidth="8" strokeLinejoin="round" />
          {/* gancio con carico */}
          <line x1="50" y1="30" x2="50" y2="44" stroke="#111827" strokeWidth="4" />
          <path d="M50,44 q-8,0 -8,8 q0,8 8,8 q7,0 8,-6" fill="none" stroke="#111827" strokeWidth="4.5" strokeLinecap="round" />
          <rect x="38" y="62" width="24" height="14" rx="2" fill="#111827" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900">Regola del giorno</p>
          <p className="text-[15px] font-black text-slate-900 leading-snug mt-1" data-rule-text>
            «{r.t}»
          </p>
          <p className="text-[10px] font-bold text-slate-700 mt-1 leading-tight line-clamp-2">{r.s}</p>
        </div>
      </div>
    </div>
  );
};
