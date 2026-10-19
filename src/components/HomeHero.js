// IN CIMA ALLA HOME: un cielo che cambia da solo e un carroponte che si può toccare.
//  - ora del giorno: alba, giorno, tramonto, notte (con luna, stelle e finestre accese)
//  - ogni giorno a caso: nuvole, uccelli, colore della trave, aereo, pioggia, camion che passa
//  - periodo dell'anno: neve d'inverno, lucine a Natale, pipistrelli ad Halloween, sole grande d'estate
//  - weekend: carrello fermo; traguardi (50, 100, 150… interventi nell'anno): coriandoli
//  - tocco: il bozzello scende con le funi, si ferma, risale e oscilla
//  - "curiosità del giorno" presa dai propri interventi
import React, { useMemo, useState } from "react";
import { MONTHS } from "../personal";
import { seasonOf } from "../season";

// numero "a caso" ma uguale per tutto il giorno
const seedOf = (s) => {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

export const skyOf = (hour) =>
  hour >= 5 && hour < 9 ? "alba" : hour >= 9 && hour < 17 ? "giorno" : hour >= 17 && hour < 20 ? "tramonto" : "notte";

const SKY = {
  alba: ["#fde68a", "#fdba74", "#f9a8d4"],
  giorno: ["#7dd3fc", "#bae6fd", "#e0f2fe"],
  tramonto: ["#7c3aed", "#f97316", "#fcd34d"],
  notte: ["#020617", "#1e293b", "#334155"],
  pioggia: ["#64748b", "#94a3b8", "#cbd5e1"],
  pioggiaNotte: ["#0f172a", "#1e293b", "#334155"],
};
const GIRDER = ["#f2b705", "#ef4444", "#f97316", "#22c55e", "#3b82f6"];
const TRUCK = ["#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#f8fafc"];
const CONFETTI = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

const HERO_CSS = `
@keyframes mhCloud { from { transform: translateX(-30%); } to { transform: translateX(130%); } }
@keyframes mhTwinkle { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
@keyframes mhTrolley { 0%,100% { transform: translateX(0); } 50% { transform: translateX(70px); } }
@keyframes mhSway { 0%,100% { transform: rotate(-1.6deg); } 50% { transform: rotate(1.6deg); } }
@keyframes mhBlock { 0% { transform: translateY(0); animation-timing-function: cubic-bezier(.45,0,.55,1); }
  42% { transform: translateY(54px); } 58% { transform: translateY(54px); animation-timing-function: cubic-bezier(.45,0,.55,1); } 100% { transform: translateY(0); } }
@keyframes mhRope { 0% { transform: scaleY(1); animation-timing-function: cubic-bezier(.45,0,.55,1); }
  42% { transform: scaleY(3.7); } 58% { transform: scaleY(3.7); animation-timing-function: cubic-bezier(.45,0,.55,1); } 100% { transform: scaleY(1); } }
@keyframes mhSettle { 0% { transform: rotate(0); } 15% { transform: rotate(4deg); } 30% { transform: rotate(-3deg); } 45% { transform: rotate(2deg); } 60% { transform: rotate(-1deg); } 80% { transform: rotate(.4deg); } 100% { transform: rotate(0); } }
@keyframes mhBird { from { transform: translate(-10%, 0); } to { transform: translate(120%, -12px); } }
@keyframes mhPlane { from { transform: translateX(-60px); } to { transform: translateX(460px); } }
@keyframes mhRain { from { transform: translateY(-20px); } to { transform: translateY(160px); } }
@keyframes mhSnow { from { transform: translate(0, -10px); } to { transform: translate(12px, 160px); } }
@keyframes mhTruck { 0% { transform: translateX(-90px); } 45%,100% { transform: translateX(470px); } }
@keyframes mhWheel { to { transform: rotate(360deg); } }
@keyframes mhConfetti { from { transform: translateY(-20px) rotate(0); } to { transform: translateY(170px) rotate(540deg); } }
@keyframes mhBat { 0%,100% { transform: translate(0,0) scaleY(1); } 25% { transform: translate(18px,-6px) scaleY(.4); } 50% { transform: translate(36px,0) scaleY(1); } 75% { transform: translate(18px,6px) scaleY(.4); } }
@keyframes mhBlink { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
.mh-cloud { animation: mhCloud linear infinite; }
.mh-star { animation: mhTwinkle 2.4s ease-in-out infinite; }
.mh-trolley { animation: mhTrolley 11s ease-in-out infinite; }
.mh-hang { transform-box: fill-box; transform-origin: 50% 0; animation: mhSway 3.4s ease-in-out infinite; }
.mh-hang.settle { animation: mhSettle 1.8s ease-out 2.6s 1 both; }
.mh-block.drop { animation: mhBlock 2.6s 1 both; }
.mh-rope { transform-box: fill-box; transform-origin: 50% 0; }
.mh-rope.drop { animation: mhRope 2.6s 1 both; }
.mh-bird { animation: mhBird linear infinite; }
.mh-plane { animation: mhPlane 22s linear infinite; }
.mh-rain { animation: mhRain .7s linear infinite; }
.mh-snow { animation: mhSnow linear infinite; }
.mh-truck { animation: mhTruck 16s linear infinite; }
.mh-wheel { transform-box: fill-box; transform-origin: 50% 50%; animation: mhWheel .5s linear infinite; }
.mh-confetti { animation: mhConfetti linear infinite; }
.mh-bat { transform-box: fill-box; animation: mhBat 2s ease-in-out infinite; }
.mh-light { animation: mhBlink 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .mh-cloud,.mh-star,.mh-trolley,.mh-hang,.mh-block,.mh-rope,.mh-bird,.mh-plane,.mh-rain,.mh-snow,.mh-truck,.mh-wheel,.mh-confetti,.mh-bat,.mh-light { animation: none !important; }
}
`;

const isMe = (l, k) =>
  String(l.technician || "").trim().toLowerCase() === k ||
  (l.additionalTechnicians || []).some((t) => String(t).trim().toLowerCase() === k);

// interventi dell'anno del tecnico
export const myYearCount = (logs = [], me = "", now = new Date()) => {
  const k = String(me || "").trim().toLowerCase();
  return logs.filter((l) => String(l.dateString || "").endsWith("/" + now.getFullYear()) && isMe(l, k)).length;
};
// traguardo: 50, 100, 150… interventi nell'anno
export const isMilestone = (n) => n > 0 && n % 50 === 0;

// curiosità del giorno (dai propri interventi)
export const factsOf = (logs = [], me = "", now = new Date()) => {
  const k = String(me || "").trim().toLowerCase();
  const mine = logs.filter((l) => isMe(l, k));
  const y = now.getFullYear();
  const ofYear = mine.filter((l) => String(l.dateString || "").endsWith("/" + y));
  const ofMonth = ofYear.filter((l) => Number(String(l.dateString).split("/")[1]) === now.getMonth() + 1);
  const top = (arr, f) => {
    const c = {};
    arr.forEach((l) => {
      const v = f(l);
      if (v) c[v] = (c[v] || 0) + 1;
    });
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  };
  const out = [];
  if (ofYear.length) out.push(`Nel ${y} hai fatto ${ofYear.length} ${ofYear.length === 1 ? "intervento" : "interventi"}`);
  if (ofMonth.length) out.push(`A ${MONTHS[now.getMonth()].toLowerCase()} sei a quota ${ofMonth.length}`);
  const c = top(ofYear, (l) => l.customer);
  if (c && c[1] > 1) out.push(`Il cliente dove vai di più: ${c[0]} (${c[1]} volte)`);
  const ropes = ofYear.filter((l) => l.fune || l.catena).length;
  if (ropes) out.push(`Funi e catene cambiate quest'anno: ${ropes}`);
  const mate = top(ofYear, (l) => [l.technician, ...(l.additionalTechnicians || [])].find((t) => t && String(t).trim().toLowerCase() !== k));
  if (mate && mate[1] > 1) out.push(`Il collega con cui lavori di più: ${mate[0]}`);
  const g = top(ofYear, (l) => (l.customer && l.machineId ? `${l.customer}, gru ${l.machineId}` : ""));
  if (g && g[1] > 2) out.push(`La gru che vedi più spesso: ${g[0]}`);
  const nextGoal = Math.ceil((ofYear.length + 1) / 50) * 50;
  if (ofYear.length && nextGoal - ofYear.length <= 5) out.push(`Ancora ${nextGoal - ofYear.length} e arrivi a ${nextGoal} interventi`);
  const dow = now.getDay();
  if (dow === 1) out.push("Lunedì: buon inizio settimana");
  if (dow === 5) out.push("Venerdì: ancora uno sforzo e c'è il weekend");
  if (!out.length) out.push("Buon lavoro!");
  return out;
};

// pioggia di coriandoli (traguardi)
export const Confetti = ({ count = 40, seed = "c" }) => {
  const pieces = useMemo(() => {
    const r = seedOf(seed);
    return Array.from({ length: count }, () => ({ x: r() * 100, d: 2.2 + r() * 2.5, delay: -r() * 4, c: CONFETTI[Math.floor(r() * CONFETTI.length)], w: 4 + r() * 4 }));
  }, [count, seed]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" data-confetti>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="mh-confetti absolute top-0 block rounded-sm"
          style={{ left: p.x + "%", width: p.w, height: p.w * 1.6, background: p.c, animationDuration: p.d + "s", animationDelay: p.delay + "s" }}
        />
      ))}
    </div>
  );
};

export const HomeHero = ({ me = "", logs = [], todayCount = 0, now = new Date(), force = [] }) => {
  const dayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const sky0 = skyOf(now.getHours());
  const season = seasonOf(now);
  const month = now.getMonth();
  const weekend = now.getDay() === 0 || now.getDay() === 6;
  const [drop, setDrop] = useState(0);
  const forced = force.join(",");
  const look = useMemo(() => {
    const r = seedOf(dayKey + me);
    const f = (k) => forced.split(",").includes(k);
    const rain = f("pioggia") || (r() < 0.18 && season !== "estate");
    const snowy = month === 11 || month === 0 || month === 1;
    return {
      rain,
      snow: f("neve") || (!rain && snowy && r() < 0.6),
      clouds: Array.from({ length: (rain ? 4 : 2) + Math.floor(r() * 3) }, () => ({ y: 6 + r() * 40, s: 0.6 + r() * 0.8, d: 30 + r() * 30, delay: -r() * 40 })),
      stars: Array.from({ length: 24 }, () => ({ x: 40 + r() * 360, y: r() * 80, d: r() * 2.4 })),
      flakes: Array.from({ length: 28 }, () => ({ x: r() * 400, d: 4 + r() * 5, delay: -r() * 9, s: 1 + r() * 1.6 })),
      drops: Array.from({ length: 36 }, () => ({ x: r() * 420, delay: -r() * 0.7 })),
      birds: r() < 0.6 ? 1 + Math.floor(r() * 3) : 0,
      plane: f("aereo") || r() < 0.35,
      truck: f("camion") || r() < 0.55,
      truckColor: TRUCK[Math.floor(r() * TRUCK.length)],
      girder: GIRDER[Math.floor(r() * GIRDER.length)],
      fact: r(),
    };
  }, [dayKey, me, season, month, forced]);
  const sky = look.rain ? (sky0 === "notte" ? "pioggiaNotte" : "pioggia") : sky0;
  const night = sky0 === "notte";
  const dark = night || sky0 === "tramonto";
  const yearCount = useMemo(() => myYearCount(logs, me, now), [logs, me, now]);
  const party = isMilestone(yearCount) || force.includes("traguardo");
  const facts = useMemo(() => factsOf(logs, me, now), [logs, me, now]);
  const fact = party ? `🎉 Traguardo: ${yearCount} interventi nel ${now.getFullYear()}!` : weekend ? "Weekend: il carroponte riposa, e anche tu" : facts[Math.floor(look.fact * facts.length)];
  const [c1, c2, c3] = SKY[sky];
  const hour = now.getHours();
  const hello = hour < 13 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";
  const steel = dark ? "#0f172a" : "#475569";
  const rope = dark ? "#cbd5e1" : "#334155";
  const extras = [look.rain && "pioggia", look.snow && "neve", look.truck && !weekend && "camion", look.plane && !night && !look.rain && "aereo", weekend && "weekend", party && "traguardo", season !== "normale" && season];

  return (
    <div
      className="relative overflow-hidden rounded-3xl shadow-sm select-none cursor-pointer"
      style={{ background: `linear-gradient(180deg, ${c1}, ${c2} 60%, ${c3})` }}
      data-section="home-hero"
      data-sky={sky}
      data-extra={extras.filter(Boolean).join(" ")}
      onClick={() => setDrop((d) => d + 1)}
    >
      <style>{HERO_CSS}</style>
      <svg viewBox="0 0 400 150" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
        {/* stelle, luna, sole */}
        {night && !look.rain && look.stars.map((s, i) => <circle key={i} className="mh-star" cx={s.x} cy={s.y} r={i % 5 ? 0.9 : 1.5} fill="#fff" style={{ animationDelay: s.d + "s" }} />)}
        {!look.rain &&
          (night ? (
            <g transform="translate(366 22)">
              <circle r="12" fill="#f8fafc" />
              <circle r="12" cx="5" cy="-4" fill={c1} />
            </g>
          ) : (
            <circle
              cx={sky0 === "alba" ? 312 : sky0 === "tramonto" ? 368 : 336}
              cy={sky0 === "giorno" ? 24 : sky0 === "alba" ? 42 : 60}
              r={season === "estate" ? 22 : 15}
              fill={sky0 === "giorno" ? "#fde047" : "#fff7ed"}
              opacity=".95"
            />
          ))}
        {/* aereo */}
        {look.plane && !night && !look.rain && (
          <g className="mh-plane" style={{ animationDelay: "-6s" }}>
            <g transform="translate(0 16)" fill="#f8fafc">
              <rect x="0" y="0" width="22" height="3.4" rx="1.7" />
              <path d="M8 1.7 l6 -6 h2.5 l-3 6z M8 1.7 l6 6 h2.5 l-3 -6z M1 1.7 l-1 -4 h2 l2 4z" />
            </g>
            <line x1="-40" y1="17.7" x2="-2" y2="17.7" stroke="#fff" strokeWidth="1" opacity=".5" />
          </g>
        )}
        {/* nuvole */}
        {(!night || look.rain) &&
          look.clouds.map((c, i) => (
            <g key={i} className="mh-cloud" style={{ animationDuration: c.d + "s", animationDelay: c.delay + "s" }}>
              <g transform={`translate(0 ${c.y}) scale(${c.s})`} fill={look.rain ? (night ? "#475569" : "#e2e8f0") : "#fff"} opacity={look.rain ? 0.9 : sky0 === "giorno" ? 0.9 : 0.55}>
                <ellipse cx="30" cy="12" rx="22" ry="9" />
                <ellipse cx="48" cy="8" rx="16" ry="10" />
                <ellipse cx="62" cy="13" rx="14" ry="7" />
              </g>
            </g>
          ))}
        {/* uccelli / pipistrelli */}
        {!look.rain &&
          !night &&
          Array.from({ length: look.birds }, (_, i) => (
            <g key={i} className="mh-bird" style={{ animationDuration: 16 + i * 5 + "s", animationDelay: -i * 4 + "s" }}>
              <path d={`M0 ${30 + i * 9} q4 -4 8 0 q4 -4 8 0`} stroke={dark ? "#fde68a" : "#334155"} strokeWidth="1.3" fill="none" />
            </g>
          ))}
        {season === "halloween" &&
          [0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${300 + i * 26} ${14 + i * 10})`}>
              <path
                className="mh-bat"
                style={{ animationDelay: -i * 0.6 + "s" }}
                d="M0 0 q4 -6 8 -1 q2 -3 4 0 q2 -3 4 0 q4 -5 8 1 q-6 0 -8 4 q-2 -2 -4 0 q-2 -2 -4 0 q-2 -4 -8 -4z"
                fill={night ? "#94a3b8" : "#111827"}
              />
            </g>
          ))}
        {/* capannone sullo sfondo (di notte finestre accese) */}
        <g transform="translate(232 104)" opacity={dark ? 1 : 0.55}>
          <path d="M0 46 V14 l22 -14 v14 l22 -14 v14 l22 -14 v14 l22 -14 v46z" fill={dark ? "#111827" : "#94a3b8"} />
          {[6, 28, 50, 72].map((x, i) => (
            <rect key={i} x={x} y="24" width="10" height="7" rx="1" fill={night ? "#fcd34d" : dark ? "#334155" : "#cbd5e1"} opacity={night && i === 2 ? 0.4 : 1} />
          ))}
        </g>
        {/* carroponte */}
        <g transform="translate(262 40) scale(0.66)">
          <rect x="0" y="62" width="9" height="104" fill={steel} />
          <rect x="176" y="62" width="9" height="104" fill={steel} />
          <rect x="-6" y="56" width="197" height="10" rx="2" fill={look.girder} />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={-4 + i * 16} y="58" width="7" height="6" fill="#111827" opacity=".35" />
          ))}
          {season === "natale" &&
            Array.from({ length: 13 }, (_, i) => (
              <circle key={i} className="mh-light" cx={-2 + i * 15.5} cy="69" r="2.2" fill={CONFETTI[i % CONFETTI.length]} style={{ animationDelay: (i % 3) * 0.4 + "s" }} />
            ))}
          <g className={weekend ? "" : "mh-trolley"}>
            {/* carrello con le ruote e il tamburo */}
            <rect x="56" y="47" width="34" height="11" rx="2" fill="#1f2937" />
            <circle cx="62" cy="47" r="2.4" fill="#64748b" />
            <circle cx="84" cy="47" r="2.4" fill="#64748b" />
            <rect x="64" y="50" width="18" height="6" rx="3" fill="#94a3b8" />
            {/* funi + bozzello + gancio, che oscillano */}
            <g key={drop} className={`mh-hang ${drop ? "settle" : ""}`}>
              <rect className={`mh-rope ${drop ? "drop" : ""}`} x="68" y="58" width="1.4" height="20" fill={rope} />
              <rect className={`mh-rope ${drop ? "drop" : ""}`} x="76.6" y="58" width="1.4" height="20" fill={rope} />
              <g className={`mh-block ${drop ? "drop" : ""}`}>
                <rect x="64" y="77" width="18" height="15" rx="3" fill={look.girder} stroke="#111827" strokeWidth="1" />
                <circle cx="73" cy="84.5" r="4.2" fill="#111827" opacity=".55" />
                <circle cx="73" cy="84.5" r="1.4" fill="#e5e7eb" />
                <rect x="71.6" y="92" width="2.8" height="5" fill="#374151" />
                <path d="M73 97 c0 0 0 3 0 4 c0 5 -2 8 -6 8 c-4 0 -6 -3 -6 -6" stroke="#374151" strokeWidth="3.4" fill="none" strokeLinecap="round" />
                <path d="M61 103 l0.5 -3.4" stroke="#374151" strokeWidth="3.4" strokeLinecap="round" />
                <line x1="73.4" y1="99" x2="62.5" y2="100.5" stroke="#f59e0b" strokeWidth="1.2" />
              </g>
            </g>
          </g>
        </g>
        {/* camion che passa */}
        {look.truck && !weekend && (
          <g className="mh-truck" style={{ animationDelay: "-3s" }}>
            <g transform="translate(0 128)">
              <rect x="0" y="0" width="40" height="14" rx="1.5" fill={look.truckColor} stroke="#1f2937" strokeWidth=".8" />
              <path d="M40 4 h9 l5 5 v5 h-14z" fill={look.truckColor} stroke="#1f2937" strokeWidth=".8" />
              <rect x="43" y="5.5" width="6" height="4" fill="#bae6fd" />
              {night && <circle cx="54" cy="12" r="1.6" fill="#fde68a" />}
              {[9, 30, 47].map((x) => (
                <g key={x} className="mh-wheel">
                  <circle cx={x} cy="15" r="3.2" fill="#111827" />
                  <rect x={x - 0.4} y="12.4" width="0.8" height="5.2" fill="#9ca3af" />
                </g>
              ))}
            </g>
          </g>
        )}
        <rect x="0" y="146" width="400" height="4" fill={dark ? "#0f172a" : "#64748b"} opacity=".5" />
        {/* pioggia / neve */}
        {look.rain &&
          look.drops.map((d, i) => (
            <line key={i} className="mh-rain" x1={d.x} y1="0" x2={d.x - 4} y2="9" stroke={night ? "#94a3b8" : "#475569"} strokeWidth="1" opacity=".55" style={{ animationDelay: d.delay + "s" }} />
          ))}
        {look.snow &&
          look.flakes.map((f, i) => (
            <circle key={i} className="mh-snow" cx={f.x} cy="0" r={f.s} fill="#fff" opacity=".9" style={{ animationDuration: f.d + "s", animationDelay: f.delay + "s" }} />
          ))}
      </svg>
      {party && <Confetti seed={dayKey} />}
      <div className="relative px-5 pt-4 pb-5 min-h-[150px] flex flex-col justify-between" style={{ paddingRight: "36%" }}>
        <div>
          <p className={`text-[22px] font-black leading-tight ${dark ? "text-white" : "text-slate-900"}`}>
            {hello}
            {me ? "," : ""}
            <br />
            {me}
          </p>
          <p className={`text-sm font-bold mt-1 ${dark ? "text-white/80" : "text-slate-700"}`}>
            {["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"][now.getDay()]} {now.getDate()} {MONTHS[month].toLowerCase()}
            {todayCount > 0 ? ` · ${todayCount === 1 ? "1 cosa" : todayCount + " cose"} da fare` : ""}
          </p>
        </div>
        <p className={`mt-3 text-xs font-bold rounded-xl px-2.5 py-1.5 w-fit max-w-full ${dark ? "bg-white/15 text-white" : "bg-white/75 text-slate-700"}`} data-hero-fact>
          {fact}
        </p>
      </div>
    </div>
  );
};
