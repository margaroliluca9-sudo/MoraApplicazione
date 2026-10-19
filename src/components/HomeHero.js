// IN CIMA ALLA HOME: un cielo che cambia da solo (alba, giorno, tramonto, notte), un carroponte
// che si può toccare (il gancio scende e risale), ogni giorno dettagli diversi (nuvole, uccelli,
// colore della trave) e una "curiosità" diversa sul proprio lavoro.
import React, { useMemo, useState } from "react";
import { MONTHS } from "../personal";

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
};
const GIRDER = ["#f2b705", "#ef4444", "#f97316", "#22c55e", "#3b82f6"];

const HERO_CSS = `
@keyframes moraCloud { from { transform: translateX(-30%); } to { transform: translateX(130%); } }
@keyframes moraTwinkle { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
@keyframes moraSway { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
@keyframes moraHook { 0% { transform: translateY(0); } 45% { transform: translateY(26px); } 55% { transform: translateY(26px); } 100% { transform: translateY(0); } }
@keyframes moraTrolley { 0%,100% { transform: translateX(0); } 50% { transform: translateX(46px); } }
@keyframes moraBird { from { transform: translate(-10%, 0); } to { transform: translate(120%, -12px); } }
.mh-cloud { animation: moraCloud linear infinite; }
.mh-star { animation: moraTwinkle 2.4s ease-in-out infinite; }
.mh-hook { transform-box: fill-box; transform-origin: 50% 0; animation: moraSway 3s ease-in-out infinite; }
.mh-hook.drop { animation: moraHook 1.6s ease-in-out 1; }
.mh-trolley { animation: moraTrolley 9s ease-in-out infinite; }
.mh-bird { animation: moraBird linear infinite; }
@media (prefers-reduced-motion: reduce) { .mh-cloud, .mh-star, .mh-hook, .mh-trolley, .mh-bird { animation: none !important; } }
`;

// curiosità del giorno (dai propri interventi)
export const factsOf = (logs = [], me = "", now = new Date()) => {
  const k = String(me || "").trim().toLowerCase();
  const mine = logs.filter(
    (l) =>
      String(l.technician || "").trim().toLowerCase() === k ||
      (l.additionalTechnicians || []).some((t) => String(t).trim().toLowerCase() === k)
  );
  const y = now.getFullYear();
  const ofYear = mine.filter((l) => String(l.dateString || "").endsWith("/" + y));
  const ofMonth = ofYear.filter((l) => Number(String(l.dateString).split("/")[1]) === now.getMonth() + 1);
  const count = (arr, f) => {
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
  const top = count(ofYear, (l) => l.customer);
  if (top && top[1] > 1) out.push(`Il cliente dove vai di più: ${top[0]} (${top[1]} volte)`);
  const ropes = ofYear.filter((l) => l.fune || l.catena).length;
  if (ropes) out.push(`Funi e catene cambiate quest'anno: ${ropes}`);
  const mate = count(ofYear.filter((l) => (l.additionalTechnicians || []).length || String(l.technician || "").trim().toLowerCase() !== k), (l) =>
    [l.technician, ...(l.additionalTechnicians || [])].find((t) => String(t).trim().toLowerCase() !== k)
  );
  if (mate && mate[1] > 1) out.push(`Il collega con cui lavori di più: ${mate[0]}`);
  const dow = now.getDay();
  if (dow === 1) out.push("Lunedì: buon inizio settimana");
  if (dow === 5) out.push("Venerdì: ancora uno sforzo e c'è il weekend");
  if (!out.length) out.push("Buon lavoro!");
  return out;
};

export const HomeHero = ({ me = "", logs = [], todayCount = 0, now = new Date() }) => {
  const iso = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const sky = skyOf(now.getHours());
  const [drop, setDrop] = useState(0);
  const look = useMemo(() => {
    const r = seedOf(iso + me);
    return {
      clouds: Array.from({ length: 2 + Math.floor(r() * 3) }, () => ({ y: 10 + r() * 40, s: 0.6 + r() * 0.7, d: 28 + r() * 30, delay: -r() * 40 })),
      stars: Array.from({ length: 22 }, () => ({ x: r() * 400, y: r() * 80, d: r() * 2.4 })),
      birds: r() < 0.6 && sky !== "notte" ? 1 + Math.floor(r() * 3) : 0,
      girder: GIRDER[Math.floor(r() * GIRDER.length)],
      fact: r(),
    };
  }, [iso, me, sky]);
  const facts = useMemo(() => factsOf(logs, me, now), [logs, me, now]);
  const fact = facts[Math.floor(look.fact * facts.length)];
  const [c1, c2, c3] = SKY[sky];
  const dark = sky === "notte" || sky === "tramonto";
  const hour = now.getHours();
  const hello = hour < 13 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";

  return (
    <div
      className="relative overflow-hidden rounded-3xl shadow-sm select-none"
      style={{ background: `linear-gradient(180deg, ${c1}, ${c2} 60%, ${c3})` }}
      data-section="home-hero"
      data-sky={sky}
      onClick={() => setDrop((d) => d + 1)}
    >
      <style>{HERO_CSS}</style>
      <svg viewBox="0 0 400 150" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
        {sky === "notte" &&
          look.stars.map((s, i) => <circle key={i} className="mh-star" cx={s.x} cy={s.y} r={i % 5 ? 1 : 1.6} fill="#fff" style={{ animationDelay: s.d + "s" }} />)}
        {sky === "notte" ? (
          <g transform="translate(330 30)"><circle r="14" fill="#f8fafc" /><circle r="14" cx="6" cy="-4" fill={c1} /></g>
        ) : (
          <circle cx={sky === "alba" ? 60 : sky === "tramonto" ? 340 : 320} cy={sky === "giorno" ? 26 : 70} r="16" fill={sky === "giorno" ? "#fde047" : "#fff7ed"} opacity=".95" />
        )}
        {sky !== "notte" &&
          look.clouds.map((c, i) => (
            <g key={i} className="mh-cloud" style={{ animationDuration: c.d + "s", animationDelay: c.delay + "s" }}>
              <g transform={`translate(0 ${c.y}) scale(${c.s})`} fill="#fff" opacity={sky === "giorno" ? 0.9 : 0.55}>
                <ellipse cx="30" cy="12" rx="22" ry="9" /><ellipse cx="48" cy="8" rx="16" ry="10" /><ellipse cx="62" cy="13" rx="14" ry="7" />
              </g>
            </g>
          ))}
        {Array.from({ length: look.birds }, (_, i) => (
          <g key={i} className="mh-bird" style={{ animationDuration: 16 + i * 5 + "s", animationDelay: -i * 4 + "s" }}>
            <path d={`M0 ${30 + i * 9} q4 -4 8 0 q4 -4 8 0`} stroke={dark ? "#fde68a" : "#334155"} strokeWidth="1.4" fill="none" />
          </g>
        ))}
        {/* carroponte */}
        <g transform="translate(262 40) scale(0.66)">
          <rect x="0" y="62" width="9" height="104" fill={dark ? "#0f172a" : "#475569"} />
          <rect x="176" y="62" width="9" height="104" fill={dark ? "#0f172a" : "#475569"} />
          <rect x="-6" y="56" width="197" height="10" rx="2" fill={look.girder} />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={-4 + i * 16} y="58" width="7" height="6" fill="#111827" opacity=".35" />
          ))}
          <g className="mh-trolley">
            <rect x="60" y="50" width="26" height="9" rx="2" fill={dark ? "#1e293b" : "#1f2937"} />
            <g key={drop} className={`mh-hook ${drop ? "drop" : ""}`}>
              <line x1="73" y1="59" x2="73" y2="92" stroke={dark ? "#cbd5e1" : "#1f2937"} strokeWidth="1.6" />
              <path d="M73 92 v5 a4 4 0 1 1 -4 4" stroke={dark ? "#cbd5e1" : "#1f2937"} strokeWidth="2.2" fill="none" strokeLinecap="round" />
            </g>
          </g>
        </g>
        <rect x="0" y="146" width="400" height="4" fill={dark ? "#0f172a" : "#64748b"} opacity=".5" />
      </svg>
      <div className="relative px-5 pt-4 pb-5 min-h-[150px] flex flex-col justify-between" style={{ paddingRight: "36%" }}>
        <div>
          <p className={`text-[22px] font-black leading-tight ${dark ? "text-white" : "text-slate-900"}`}>
            {hello}{me ? "," : ""}
            <br />
            {me}
          </p>
          <p className={`text-sm font-bold mt-1 ${dark ? "text-white/80" : "text-slate-700"}`}>
            {["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"][now.getDay()]} {now.getDate()} {MONTHS[now.getMonth()].toLowerCase()}
            {todayCount > 0 ? ` · ${todayCount === 1 ? "1 cosa" : todayCount + " cose"} da fare` : ""}
          </p>
        </div>
        <p className={`mt-3 text-xs font-bold rounded-xl px-2.5 py-1.5 w-fit max-w-full ${dark ? "bg-white/15 text-white" : "bg-white/70 text-slate-700"}`} data-hero-fact>
          {fact}
        </p>
      </div>
    </div>
  );
};
