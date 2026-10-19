// IN CIMA ALLA HOME: un cielo che cambia OGNI VOLTA che si apre l'app, e un carroponte da toccare.
//  - fisso: il cielo segue l'ora (alba, giorno, tramonto, notte)
//  - a caso a ogni apertura (e quando si torna nell'app dopo un po'): sfumatura del cielo,
//    tempo (sereno, nuvole, pioggia, temporale, nebbia, vento, arcobaleno, neve d'inverno),
//    sfondo (capannone, città, colline, montagne), colore della trave, carico appeso al gancio,
//    1-2 "ospiti" (camion, muletto, aereo, elicottero, mongolfiera, palloncino, stormo, aquilone,
//    gatto sulla trave, stella cadente, lucciole, e raramente un disco volante), fase della luna
//  - non ripete la stessa scena della volta prima
//  - periodo dell'anno: lucine a Natale, pipistrelli ad Halloween; weekend: carrello fermo
//  - traguardi (50, 100, 150… interventi nell'anno): coriandoli
//  - tocco: il bozzello scende con le funi, si ferma, risale e oscilla (a volte lo fa da solo)
import React, { useEffect, useMemo, useState } from "react";
import { MONTHS } from "../personal";
import { seasonOf } from "../season";

// numero "a caso" ripetibile da un seme
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

const PALETTES = {
  alba: [["#fde68a", "#fdba74", "#f9a8d4"], ["#fecaca", "#fdba74", "#fde68a"], ["#c4b5fd", "#f9a8d4", "#fed7aa"]],
  giorno: [["#7dd3fc", "#bae6fd", "#e0f2fe"], ["#60a5fa", "#93c5fd", "#dbeafe"], ["#38bdf8", "#a5f3fc", "#ecfeff"]],
  tramonto: [["#7c3aed", "#f97316", "#fcd34d"], ["#be185d", "#fb7185", "#fdba74"], ["#1e3a8a", "#c026d3", "#fb923c"]],
  notte: [["#020617", "#1e293b", "#334155"], ["#0c0a3e", "#1e1b4b", "#312e81"], ["#042f2e", "#0f172a", "#1e293b"]],
};
const GREY = {
  pioggia: ["#64748b", "#94a3b8", "#cbd5e1"],
  temporale: ["#334155", "#475569", "#64748b"],
  nebbia: ["#cbd5e1", "#e2e8f0", "#f1f5f9"],
  notte: ["#0f172a", "#1e293b", "#334155"],
};
const GIRDER = ["#f2b705", "#ef4444", "#f97316", "#22c55e", "#3b82f6", "#a855f7", "#14b8a6", "#e11d48"];
const TRUCK = ["#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#f8fafc", "#7c3aed"];
const CONFETTI = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

export const WEATHERS = ["sereno", "nuvoloso", "pioggia", "temporale", "nebbia", "vento", "arcobaleno", "neve"];
export const GUESTS = ["camion", "muletto", "aereo", "elicottero", "mongolfiera", "palloncino", "stormo", "aquilone", "gatto", "stella", "lucciole", "ufo"];
export const BACKS = ["capannone", "citta", "colline", "montagne"];
export const LOADS = ["niente", "cassa", "bobina", "trave", "sacco"];

const pickW = (r, w) => {
  const list = Object.entries(w).filter(([, v]) => v > 0);
  let x = r() * list.reduce((a, [, v]) => a + v, 0);
  for (const [k, v] of list) if ((x -= v) < 0) return k;
  return list[list.length - 1][0];
};

// LA SCENA: tutto quello che cambia a caso (rand = funzione 0..1)
export const sceneOf = (rand, { hour = 12, month = 0, weekend = false, force = [] } = {}) => {
  const r = rand;
  const sky0 = skyOf(hour);
  const night = sky0 === "notte";
  const day = sky0 === "giorno" || sky0 === "alba";
  const winter = month === 11 || month === 0 || month === 1;
  const summer = month >= 5 && month <= 7;
  const has = (list) => force.find((f) => list.includes(f));
  const weather =
    has(WEATHERS) ||
    pickW(r, {
      sereno: 30,
      nuvoloso: 20,
      pioggia: summer ? 5 : 10,
      temporale: winter ? 0 : summer ? 8 : 4,
      nebbia: sky0 === "notte" || summer ? 0 : winter ? 12 : 8,
      vento: 10,
      arcobaleno: sky0 === "giorno" || sky0 === "tramonto" ? 6 : 0,
      neve: winter ? 25 : month === 10 || month === 2 ? 4 : 0,
    });
  const wet = weather === "pioggia" || weather === "temporale";
  const clear = weather === "sereno" || weather === "vento" || weather === "nuvoloso" || weather === "arcobaleno";
  const okGuest = {
    camion: weekend ? 0 : 20,
    muletto: 12,
    aereo: !night && !wet && weather !== "nebbia" ? 14 : 0,
    elicottero: weather !== "temporale" ? 8 : 0,
    mongolfiera: day && clear ? 8 : 0,
    palloncino: !night && !wet ? 8 : 0,
    stormo: !night && clear ? 10 : 0,
    aquilone: !night && (weather === "vento" || weather === "sereno") ? 12 : 0,
    gatto: 10,
    stella: night && (weather === "sereno" || weather === "vento") ? 18 : 0,
    lucciole: night && summer && !wet ? 14 : 0,
    ufo: night ? 3 : 0,
  };
  const forcedGuests = force.filter((f) => GUESTS.includes(f));
  const guests = [...forcedGuests];
  if (!forcedGuests.length) {
    const n = r() < 0.5 ? 1 : 2;
    while (guests.length < n) {
      const g = pickW(r, okGuest);
      okGuest[g] = 0;
      guests.push(g);
      if (!Object.values(okGuest).some((v) => v > 0)) break;
    }
  }
  const palette = PALETTES[sky0][Math.floor(r() * 3)];
  const colors =
    weather === "temporale" ? (night ? GREY.notte : GREY.temporale) : weather === "pioggia" ? (night ? GREY.notte : GREY.pioggia) : weather === "nebbia" && day ? GREY.nebbia : palette;
  const cloudN = { sereno: 1, nuvoloso: 5, pioggia: 5, temporale: 6, nebbia: 2, vento: 4, arcobaleno: 3, neve: 3 }[weather];
  return {
    sky0,
    weather,
    guests,
    back: has(BACKS) || pickW(r, { capannone: 35, citta: 25, colline: 20, montagne: 20 }),
    load: has(LOADS) || pickW(r, { niente: 40, cassa: 20, bobina: 15, trave: 15, sacco: 10 }),
    colors,
    girder: GIRDER[Math.floor(r() * GIRDER.length)],
    truckColor: TRUCK[Math.floor(r() * TRUCK.length)],
    trolleyDelay: -r() * 11,
    autoDrop: force.includes("gancio") || r() < 0.35,
    moon: ["piena", "crescente", "mezza"][Math.floor(r() * 3)],
    sunX: 318 + r() * 44,
    clouds: Array.from({ length: cloudN + Math.floor(r() * 2) }, () => ({ y: 4 + r() * 42, s: 0.6 + r() * 0.8, d: (weather === "vento" ? 9 : 30) + r() * 25, delay: -r() * 40 })),
    stars: Array.from({ length: 26 }, () => ({ x: 60 + r() * 340, y: r() * 90, d: r() * 2.4 })),
    flakes: Array.from({ length: 30 }, () => ({ x: r() * 400, d: 4 + r() * 5, delay: -r() * 9, s: 1 + r() * 1.6 })),
    drops: Array.from({ length: weather === "temporale" ? 50 : 36 }, () => ({ x: r() * 420, delay: -r() * 0.7 })),
    leaves: Array.from({ length: 7 }, () => ({ y: 20 + r() * 110, d: 3 + r() * 3, delay: -r() * 6, c: ["#f59e0b", "#ea580c", "#84cc16"][Math.floor(r() * 3)] })),
    bugs: Array.from({ length: 12 }, () => ({ x: 200 + r() * 200, y: 95 + r() * 45, d: 1 + r() * 2 })),
    city: Array.from({ length: 7 }, () => ({ w: 16 + r() * 14, h: 22 + r() * 40, lit: r() })),
    fact: r(),
    hello: r(),
  };
};
const signature = (s) => [s.weather, s.back, s.load, ...s.guests].join("|");

const HERO_CSS = `
@keyframes mhCloud { from { transform: translateX(-30%); } to { transform: translateX(130%); } }
@keyframes mhTwinkle { 0%,100% { opacity: .25; } 50% { opacity: 1; } }
@keyframes mhTrolley { 0%,100% { transform: translateX(0); } 50% { transform: translateX(70px); } }
@keyframes mhSway { 0%,100% { transform: rotate(-1.6deg); } 50% { transform: rotate(1.6deg); } }
@keyframes mhBlock { 0% { transform: translateY(0); animation-timing-function: cubic-bezier(.45,0,.55,1); }
  42% { transform: translateY(var(--mh-d)); } 58% { transform: translateY(var(--mh-d)); animation-timing-function: cubic-bezier(.45,0,.55,1); } 100% { transform: translateY(0); } }
@keyframes mhRope { 0% { transform: scaleY(1); animation-timing-function: cubic-bezier(.45,0,.55,1); }
  42% { transform: scaleY(var(--mh-s)); } 58% { transform: scaleY(var(--mh-s)); animation-timing-function: cubic-bezier(.45,0,.55,1); } 100% { transform: scaleY(1); } }
@keyframes mhSettle { 0% { transform: rotate(0); } 15% { transform: rotate(4deg); } 30% { transform: rotate(-3deg); } 45% { transform: rotate(2deg); } 60% { transform: rotate(-1deg); } 80% { transform: rotate(.4deg); } 100% { transform: rotate(0); } }
@keyframes mhBird { from { transform: translate(-10%, 0); } to { transform: translate(120%, -14px); } }
@keyframes mhPlane { from { transform: translateX(-60px); } to { transform: translateX(460px); } }
@keyframes mhHeli { from { transform: translate(460px, 0); } to { transform: translate(-80px, 8px); } }
@keyframes mhRotor { from { transform: scaleX(1); } to { transform: scaleX(.15); } }
@keyframes mhDrift { from { transform: translate(300px, 30px); } to { transform: translate(392px, -6px); } }
@keyframes mhRise { 0% { transform: translate(0, 0); } 50% { transform: translate(-14px, -90px); } 100% { transform: translate(6px, -190px); } }
@keyframes mhKite { 0%,100% { transform: rotate(-8deg) translateY(0); } 50% { transform: rotate(8deg) translateY(-4px); } }
@keyframes mhTail { 0%,100% { transform: rotate(-14deg); } 50% { transform: rotate(14deg); } }
@keyframes mhShoot { 0% { transform: translate(0,0); opacity: 0; } 4% { opacity: 1; } 14% { transform: translate(-140px, 60px); opacity: 0; } 100% { transform: translate(-140px, 60px); opacity: 0; } }
@keyframes mhBug { 0%,100% { opacity: .1; transform: translate(0,0); } 50% { opacity: 1; transform: translate(4px,-5px); } }
@keyframes mhUfo { 0%,100% { transform: translate(0, 0); } 50% { transform: translate(-16px, 5px); } }
@keyframes mhBeam { 0%,100% { opacity: .15; } 50% { opacity: .45; } }
@keyframes mhRain { from { transform: translateY(-20px); } to { transform: translateY(160px); } }
@keyframes mhSnow { from { transform: translate(0, -10px); } to { transform: translate(12px, 160px); } }
@keyframes mhLeaf { from { transform: translate(-30px, 0) rotate(0); } to { transform: translate(450px, 30px) rotate(720deg); } }
@keyframes mhFog { from { transform: translateX(-40px); } to { transform: translateX(40px); } }
@keyframes mhFlash { 0%,90%,93%,100% { opacity: 0; } 91% { opacity: .75; } 94% { opacity: .5; } 95% { opacity: 0; } }
@keyframes mhTruck { 0% { transform: translateX(-90px); } 45%,100% { transform: translateX(470px); } }
@keyframes mhFork { 0%,15% { transform: translateX(0); } 50%,65% { transform: translateX(90px); } 100% { transform: translateX(0); } }
@keyframes mhWheel { to { transform: rotate(360deg); } }
@keyframes mhCatTail { 0%,100% { transform: rotate(-10deg); } 50% { transform: rotate(18deg); } }
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
.mh-heli { animation: mhHeli 20s linear infinite; }
.mh-rotor { transform-box: fill-box; transform-origin: 50% 50%; animation: mhRotor .12s linear infinite alternate; }
.mh-drift { animation: mhDrift 40s ease-in-out infinite alternate; }
.mh-rise { animation: mhRise 16s linear infinite; }
.mh-kite { transform-box: fill-box; transform-origin: 50% 100%; animation: mhKite 2.6s ease-in-out infinite; }
.mh-tail { transform-box: fill-box; transform-origin: 50% 0; animation: mhTail 1.3s ease-in-out infinite; }
.mh-shoot { animation: mhShoot 6s ease-out infinite; }
.mh-bug { animation: mhBug ease-in-out infinite; }
.mh-ufo { animation: mhUfo 5s ease-in-out infinite; }
.mh-beam { animation: mhBeam 1.6s ease-in-out infinite; }
.mh-rain { animation: mhRain .7s linear infinite; }
.mh-snow { animation: mhSnow linear infinite; }
.mh-leaf { animation: mhLeaf linear infinite; }
.mh-fog { animation: mhFog 9s ease-in-out infinite alternate; }
.mh-flash { animation: mhFlash 7s linear infinite; }
.mh-truck { animation: mhTruck 16s linear infinite; }
.mh-fork { animation: mhFork 9s ease-in-out infinite; }
.mh-wheel { transform-box: fill-box; transform-origin: 50% 50%; animation: mhWheel .5s linear infinite; }
.mh-cattail { transform-box: fill-box; transform-origin: 0 100%; animation: mhCatTail 1.8s ease-in-out infinite; }
.mh-confetti { animation: mhConfetti linear infinite; }
.mh-bat { transform-box: fill-box; animation: mhBat 2s ease-in-out infinite; }
.mh-light { animation: mhBlink 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  [class^="mh-"], [class*=" mh-"] { animation: none !important; }
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

// curiosità (dai propri interventi)
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
// frasi del cielo (a volte al posto della curiosità)
const SKY_LINES = {
  pioggia: "Piove: occhio alle scale bagnate",
  temporale: "Temporale in arrivo: meglio al coperto",
  nebbia: "Nebbia: guida piano",
  vento: "C'è vento oggi",
  arcobaleno: "È uscito l'arcobaleno",
  neve: "Nevica: copriti bene",
  ufo: "Hai visto anche tu quella luce?",
  gatto: "C'è un gatto sulla trave…",
  stella: "Una stella cadente: esprimi un desiderio",
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

// carico appeso al gancio (coordinate del carroponte; il gancio finisce a y≈109)
const Load = ({ kind }) => {
  if (kind === "niente") return null;
  const sling = <path d="M67 108 L60 116 M67 108 L86 116" stroke="#111827" strokeWidth="1" fill="none" />;
  if (kind === "cassa")
    return (
      <g>
        {sling}
        <rect x="58" y="116" width="30" height="16" rx="1" fill="#b45309" stroke="#78350f" strokeWidth="1" />
        <path d="M58 121 h30 M58 127 h30 M63 116 v16 M83 116 v16" stroke="#78350f" strokeWidth="1" />
      </g>
    );
  if (kind === "bobina")
    return (
      <g>
        {sling}
        <rect x="58" y="116" width="30" height="16" rx="3" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
        <ellipse cx="88" cy="124" rx="3" ry="8" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
        <path d="M60 120 h26 M60 124 h26 M60 128 h26" stroke="#64748b" strokeWidth=".6" />
      </g>
    );
  if (kind === "trave")
    return (
      <g>
        <path d="M67 108 L46 118 M67 108 L98 118" stroke="#111827" strokeWidth="1" fill="none" />
        <rect x="40" y="118" width="64" height="3" fill="#475569" />
        <rect x="40" y="127" width="64" height="3" fill="#475569" />
        <rect x="40" y="121" width="64" height="6" fill="#64748b" />
      </g>
    );
  return (
    <g>
      <path d="M67 108 L62 117 M67 108 L82 117" stroke="#111827" strokeWidth="1" fill="none" />
      <path d="M60 117 h24 l3 15 q-15 4 -30 0z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
      <text x="72" y="128" fontSize="5" fontWeight="900" textAnchor="middle" fill="#94a3b8">
        kg
      </text>
    </g>
  );
};

// sfondo dietro alla gru
const Back = ({ kind, night, dark, city }) => {
  if (kind === "citta") {
    let x = 190;
    return (
      <g opacity={dark ? 1 : 0.5}>
        {city.map((b, i) => {
          const el = (
            <g key={i}>
              <rect x={x} y={146 - b.h} width={b.w} height={b.h} fill={dark ? "#111827" : "#94a3b8"} />
              {Array.from({ length: Math.floor(b.h / 10) }, (_, j) => (
                <rect key={j} x={x + 4} y={146 - b.h + 4 + j * 10} width={b.w - 8} height="3" fill={night ? "#fcd34d" : dark ? "#334155" : "#cbd5e1"} opacity={night ? (((j + i) * 7) % 10) / 10 + 0.2 * b.lit : 1} />
              ))}
            </g>
          );
          x += b.w + 2;
          return el;
        })}
      </g>
    );
  }
  if (kind === "colline")
    return (
      <g>
        <ellipse cx="250" cy="160" rx="110" ry="40" fill={night ? "#0f172a" : dark ? "#4c1d95" : "#86efac"} opacity={night ? 1 : 0.7} />
        <ellipse cx="380" cy="160" rx="100" ry="30" fill={night ? "#1e293b" : dark ? "#6d28d9" : "#4ade80"} opacity={night ? 1 : 0.7} />
      </g>
    );
  if (kind === "montagne")
    return (
      <g opacity={night ? 1 : 0.75}>
        <path d="M170 146 L240 70 L310 146z" fill={night ? "#1e293b" : dark ? "#581c87" : "#94a3b8"} />
        <path d="M240 70 L226 86 L236 82 L244 88 L254 85z" fill="#f8fafc" opacity=".9" />
        <path d="M280 146 L345 82 L410 146z" fill={night ? "#0f172a" : dark ? "#4c1d95" : "#64748b"} />
        <path d="M345 82 L332 95 L342 92 L350 97 L358 94z" fill="#f8fafc" opacity=".9" />
      </g>
    );
  return (
    <g transform="translate(232 104)" opacity={dark ? 1 : 0.55}>
      <path d="M0 46 V14 l22 -14 v14 l22 -14 v14 l22 -14 v14 l22 -14 v46z" fill={dark ? "#111827" : "#94a3b8"} />
      {[6, 28, 50, 72].map((x, i) => (
        <rect key={i} x={x} y="24" width="10" height="7" rx="1" fill={night ? "#fcd34d" : dark ? "#334155" : "#cbd5e1"} opacity={night && i === 2 ? 0.4 : 1} />
      ))}
    </g>
  );
};

const randomSeed = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const LAST = "mora_hero_last";

export const HomeHero = ({ me = "", logs = [], todayCount = 0, now = new Date(), force = [] }) => {
  const hour = now.getHours();
  const month = now.getMonth();
  const season = seasonOf(now);
  const weekend = now.getDay() === 0 || now.getDay() === 6;
  const [seed, setSeed] = useState(randomSeed);
  const [drop, setDrop] = useState(0);
  const forced = force.join(",");

  // tornando nell'app dopo almeno un minuto: scena nuova
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 60000) {
        setSeed(randomSeed());
        setDrop(0);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const sc = useMemo(() => {
    const r = seedOf(seed);
    const opts = { hour, month, weekend, force: forced ? forced.split(",") : [] };
    let s = sceneOf(r, opts);
    let last = "";
    try {
      last = localStorage.getItem(LAST) || "";
    } catch (e) {
      last = "";
    }
    // mai la stessa scena della volta prima
    for (let i = 0; i < 6 && !forced && signature(s) === last; i++) s = sceneOf(r, opts);
    try {
      localStorage.setItem(LAST, signature(s));
    } catch (e) {
      // niente
    }
    return s;
  }, [seed, hour, month, weekend, forced]);

  // a volte il gancio scende da solo poco dopo l'apertura
  useEffect(() => {
    if (!sc.autoDrop) return undefined;
    const t = setTimeout(() => setDrop((d) => d || 1), 1500);
    return () => clearTimeout(t);
  }, [sc]);

  const { sky0, weather, guests } = sc;
  const night = sky0 === "notte";
  const wet = weather === "pioggia" || weather === "temporale";
  const dark = night || sky0 === "tramonto" || weather === "temporale";
  const hasG = (g) => guests.includes(g);
  const yearCount = useMemo(() => myYearCount(logs, me, now), [logs, me, now]);
  const party = isMilestone(yearCount) || force.includes("traguardo");
  const facts = useMemo(() => factsOf(logs, me, now), [logs, me, now]);
  const skyLine = SKY_LINES[guests.find((g) => SKY_LINES[g])] || SKY_LINES[weather];
  const pool = [...facts, ...(skyLine ? [skyLine, skyLine] : []), ...(weekend ? ["Weekend: il carroponte riposa, e anche tu"] : []), "Tocca il cielo e guarda il gancio"];
  const fact = party ? `🎉 Traguardo: ${yearCount} interventi nel ${now.getFullYear()}!` : pool[Math.floor(sc.fact * pool.length)];
  const [c1, c2, c3] = sc.colors;
  const hellos = hour < 13 ? ["Buongiorno", "Buongiorno", "Ciao", "Buona giornata"] : hour < 18 ? ["Buon pomeriggio", "Ciao", "Buon pomeriggio"] : ["Buonasera", "Buonasera", "Ciao"];
  const hello = hellos[Math.floor(sc.hello * hellos.length)];
  const steel = dark ? "#0f172a" : "#475569";
  const rope = dark ? "#cbd5e1" : "#334155";
  const loaded = sc.load !== "niente";
  const cat = night ? "#64748b" : "#111827";
  const showSun = !wet && weather !== "nebbia";
  const extras = [weather, sc.back, "carico-" + sc.load, ...guests, weekend && "weekend", party && "traguardo", season !== "normale" && season];

  return (
    <div
      className="relative overflow-hidden rounded-3xl shadow-sm select-none cursor-pointer"
      style={{ background: `linear-gradient(180deg, ${c1}, ${c2} 60%, ${c3})` }}
      data-section="home-hero"
      data-sky={sky0}
      data-extra={extras.filter(Boolean).join(" ")}
      onClick={() => setDrop((d) => d + 1)}
    >
      <style>{HERO_CSS}</style>
      <svg viewBox="0 0 400 150" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
        {/* stelle, luna, sole */}
        {night && !wet && sc.stars.map((s, i) => <circle key={i} className="mh-star" cx={s.x} cy={s.y} r={i % 5 ? 0.9 : 1.5} fill="#fff" style={{ animationDelay: s.d + "s" }} />)}
        {showSun &&
          (night ? (
            <g transform="translate(366 22)">
              <circle r="12" fill="#f8fafc" />
              {sc.moon === "crescente" && <circle r="12" cx="5" cy="-4" fill={c1} />}
              {sc.moon === "mezza" && <path d="M0 -12 A12 12 0 0 1 0 12z" fill={c1} opacity=".92" />}
              {sc.moon === "piena" && <circle cx="-4" cy="-3" r="2.5" fill="#e2e8f0" />}
            </g>
          ) : (
            <circle cx={sky0 === "tramonto" ? 368 : sc.sunX} cy={sky0 === "giorno" ? 24 : sky0 === "alba" ? 42 : 60} r={season === "estate" ? 22 : 15} fill={sky0 === "giorno" ? "#fde047" : "#fff7ed"} opacity=".95" />
          ))}
        {/* arcobaleno */}
        {weather === "arcobaleno" &&
          ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#8b5cf6"].map((c, i) => (
            <path key={c} d={`M${215 + i * 4} 150 A${115 - i * 4} ${115 - i * 4} 0 0 1 ${445 - i * 4} 150`} stroke={c} strokeWidth="4" fill="none" opacity=".45" />
          ))}
        {/* stella cadente */}
        {hasG("stella") && (
          <g className="mh-shoot" style={{ animationDelay: "1s" }}>
            <line x1="390" y1="6" x2="406" y2="0" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="390" cy="6" r="1.6" fill="#fff" />
          </g>
        )}
        {/* disco volante (raro) */}
        {hasG("ufo") && (
          <g className="mh-ufo">
            <path d="M330 34 L312 120 L356 120z" fill="#a7f3d0" className="mh-beam" />
            <ellipse cx="334" cy="32" rx="16" ry="5" fill="#94a3b8" />
            <ellipse cx="334" cy="28" rx="7" ry="5" fill="#a7f3d0" opacity=".9" />
            {[-10, -3, 4, 11].map((x) => (
              <circle key={x} className="mh-light" cx={334 + x} cy="33" r="1.1" fill="#fde047" />
            ))}
          </g>
        )}
        {/* aereo */}
        {hasG("aereo") && (
          <g className="mh-plane" style={{ animationDelay: "-6s" }}>
            <g transform="translate(0 16)" fill="#f8fafc">
              <rect x="0" y="0" width="22" height="3.4" rx="1.7" />
              <path d="M8 1.7 l6 -6 h2.5 l-3 6z M8 1.7 l6 6 h2.5 l-3 -6z M1 1.7 l-1 -4 h2 l2 4z" />
            </g>
            <line x1="-40" y1="17.7" x2="-2" y2="17.7" stroke="#fff" strokeWidth="1" opacity=".5" />
          </g>
        )}
        {/* elicottero */}
        {hasG("elicottero") && (
          <g className="mh-heli" style={{ animationDelay: "-5s" }}>
            <g transform="translate(0 28)">
              <ellipse cx="10" cy="6" rx="9" ry="5" fill={dark ? "#e2e8f0" : "#dc2626"} />
              <rect x="17" y="4.5" width="16" height="2" fill={dark ? "#e2e8f0" : "#dc2626"} />
              <rect x="31" y="1" width="2" height="6" fill={dark ? "#e2e8f0" : "#7f1d1d"} />
              <ellipse cx="6" cy="5" rx="3" ry="2.4" fill="#bae6fd" />
              <rect className="mh-rotor" x="-4" y="-1" width="28" height="1.4" fill="#1f2937" />
              <path d="M3 12 h14" stroke="#1f2937" strokeWidth="1.2" />
              {night && <circle className="mh-light" cx="10" cy="11" r="1.2" fill="#ef4444" />}
            </g>
          </g>
        )}
        {/* mongolfiera */}
        {hasG("mongolfiera") && (
          <g className="mh-drift">
            <g transform="translate(0 20)">
              <path d="M0 0 c-14 0 -16 18 -4 26 h8 c12 -8 10 -26 -4 -26z" fill="#f43f5e" />
              <path d="M0 0 c-5 0 -6 18 -2 26 h4 c4 -8 3 -26 -2 -26z" fill="#facc15" />
              <path d="M-4 26 l1 5 M4 26 l-1 5" stroke="#78350f" strokeWidth=".8" />
              <rect x="-3.5" y="31" width="7" height="5" fill="#92400e" />
            </g>
          </g>
        )}
        {/* nuvole */}
        {(!night || wet || weather === "nuvoloso") &&
          sc.clouds.map((c, i) => (
            <g key={i} className="mh-cloud" style={{ animationDuration: c.d + "s", animationDelay: c.delay + "s" }}>
              <g transform={`translate(0 ${c.y}) scale(${c.s})`} fill={wet ? (dark ? "#475569" : "#e2e8f0") : night ? "#334155" : "#fff"} opacity={wet ? 0.9 : sky0 === "giorno" ? 0.9 : 0.6}>
                <ellipse cx="30" cy="12" rx="22" ry="9" />
                <ellipse cx="48" cy="8" rx="16" ry="10" />
                <ellipse cx="62" cy="13" rx="14" ry="7" />
              </g>
            </g>
          ))}
        {/* lampo */}
        {weather === "temporale" && (
          <g>
            <rect className="mh-flash" x="0" y="0" width="400" height="150" fill="#fff" />
            <path className="mh-flash" d="M350 10 l-10 26 h8 l-12 30 l22 -36 h-9 l9 -20z" fill="#fef08a" />
          </g>
        )}
        {/* stormo / palloncino / aquilone */}
        {hasG("stormo") &&
          Array.from({ length: 7 }, (_, i) => {
            const row = Math.ceil(i / 2);
            const side = i % 2 ? 1 : -1;
            return (
              <g key={i} className="mh-bird" style={{ animationDuration: "18s", animationDelay: "-4s" }}>
                <path d={`M${-row * 9} ${26 + side * row * 5} q3 -3 6 0 q3 -3 6 0`} stroke={dark ? "#fde68a" : "#334155"} strokeWidth="1.2" fill="none" />
              </g>
            );
          })}
        {hasG("palloncino") && (
          <g className="mh-rise" style={{ animationDelay: "-3s" }}>
            <g transform="translate(345 160)">
              <ellipse cx="0" cy="0" rx="6" ry="7.5" fill="#ef4444" />
              <path d="M-1 7.5 h2 l-1 2z" fill="#b91c1c" />
              <path d="M0 9.5 q-3 6 0 10 q3 4 0 9" stroke="#475569" strokeWidth=".7" fill="none" />
              <ellipse cx="-2" cy="-3" rx="1.6" ry="2.4" fill="#fff" opacity=".5" />
            </g>
          </g>
        )}
        {hasG("aquilone") && (
          <g>
            <path d="M350 40 Q330 90 300 146" stroke="#e5e7eb" strokeWidth=".6" fill="none" opacity=".8" />
            <g className="mh-kite">
              <path d="M350 22 l9 12 l-9 14 l-9 -14z" fill="#f59e0b" />
              <path d="M350 22 v26 M341 34 h18" stroke="#78350f" strokeWidth=".6" />
              <g className="mh-tail">
                <path d="M350 48 q-4 6 0 12 q4 6 0 12" stroke="#ef4444" strokeWidth="1" fill="none" />
                <path d="M348 55 l4 2 M348 63 l4 2" stroke="#3b82f6" strokeWidth="2" />
              </g>
            </g>
          </g>
        )}
        {season === "halloween" &&
          [0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${300 + i * 26} ${14 + i * 10})`}>
              <path className="mh-bat" style={{ animationDelay: -i * 0.6 + "s" }} d="M0 0 q4 -6 8 -1 q2 -3 4 0 q2 -3 4 0 q4 -5 8 1 q-6 0 -8 4 q-2 -2 -4 0 q-2 -2 -4 0 q-2 -4 -8 -4z" fill={night ? "#94a3b8" : "#111827"} />
            </g>
          ))}
        {/* sfondo */}
        <Back kind={sc.back} night={night} dark={dark} city={sc.city} />
        {/* carroponte */}
        <g transform="translate(262 40) scale(0.66)">
          <rect x="0" y="62" width="9" height="104" fill={steel} />
          <rect x="176" y="62" width="9" height="104" fill={steel} />
          <rect x="-6" y="56" width="197" height="10" rx="2" fill={sc.girder} />
          {Array.from({ length: 12 }, (_, i) => (
            <rect key={i} x={-4 + i * 16} y="58" width="7" height="6" fill="#111827" opacity=".35" />
          ))}
          {season === "natale" &&
            Array.from({ length: 13 }, (_, i) => (
              <circle key={i} className="mh-light" cx={-2 + i * 15.5} cy="69" r="2.2" fill={CONFETTI[i % CONFETTI.length]} style={{ animationDelay: (i % 3) * 0.4 + "s" }} />
            ))}
          {/* gatto seduto sulla trave */}
          {hasG("gatto") && (
            <g transform="translate(150 56)">
              <ellipse cx="0" cy="-6" rx="6" ry="6" fill={cat} />
              <circle cx="-4" cy="-14" r="4" fill={cat} />
              <path d="M-7.5 -16 l1 -5 l2.5 3z M-3 -17.5 l2 -4.5 l1.5 4z" fill={cat} />
              <path className="mh-cattail" d="M5 -2 q8 0 7 -10" stroke={cat} strokeWidth="2" fill="none" strokeLinecap="round" />
              <circle cx="-5.5" cy="-14.5" r=".9" fill={night ? "#fde047" : "#94a3b8"} />
              <circle cx="-2.5" cy="-14.5" r=".9" fill={night ? "#fde047" : "#94a3b8"} />
            </g>
          )}
          <g className={weekend ? "" : "mh-trolley"} style={{ animationDelay: sc.trolleyDelay + "s" }}>
            <rect x="56" y="47" width="34" height="11" rx="2" fill="#1f2937" />
            <circle cx="62" cy="47" r="2.4" fill="#64748b" />
            <circle cx="84" cy="47" r="2.4" fill="#64748b" />
            <rect x="64" y="50" width="18" height="6" rx="3" fill="#94a3b8" />
            {/* funi + bozzello + gancio (+ carico), che oscillano */}
            <g key={drop} className={`mh-hang ${drop ? "settle" : ""}`} style={{ "--mh-d": loaded ? "34px" : "54px", "--mh-s": loaded ? "2.7" : "3.7" }}>
              <rect className={`mh-rope ${drop ? "drop" : ""}`} x="68" y="58" width="1.4" height="20" fill={rope} />
              <rect className={`mh-rope ${drop ? "drop" : ""}`} x="76.6" y="58" width="1.4" height="20" fill={rope} />
              <g className={`mh-block ${drop ? "drop" : ""}`}>
                <rect x="64" y="77" width="18" height="15" rx="3" fill={sc.girder} stroke="#111827" strokeWidth="1" />
                <circle cx="73" cy="84.5" r="4.2" fill="#111827" opacity=".55" />
                <circle cx="73" cy="84.5" r="1.4" fill="#e5e7eb" />
                <rect x="71.6" y="92" width="2.8" height="5" fill="#374151" />
                <path d="M73 97 c0 0 0 3 0 4 c0 5 -2 8 -6 8 c-4 0 -6 -3 -6 -6" stroke="#374151" strokeWidth="3.4" fill="none" strokeLinecap="round" />
                <path d="M61 103 l0.5 -3.4" stroke="#374151" strokeWidth="3.4" strokeLinecap="round" />
                <line x1="73.4" y1="99" x2="62.5" y2="100.5" stroke="#f59e0b" strokeWidth="1.2" />
                <Load kind={sc.load} />
              </g>
            </g>
          </g>
        </g>
        {/* lucciole */}
        {hasG("lucciole") && sc.bugs.map((b, i) => <circle key={i} className="mh-bug" cx={b.x} cy={b.y} r="1.3" fill="#fde047" style={{ animationDuration: 1.5 + b.d + "s", animationDelay: -b.d + "s" }} />)}
        {/* muletto */}
        {hasG("muletto") && (
          <g className="mh-fork">
            <g transform="translate(250 125)">
              <rect x="0" y="6" width="18" height="12" rx="2" fill="#f59e0b" stroke="#1f2937" strokeWidth=".8" />
              <path d="M3 6 v-8 h10 v8" stroke="#1f2937" strokeWidth="1.4" fill="none" />
              <rect x="19" y="-6" width="2" height="24" fill="#374151" />
              <path d="M21 17 h9" stroke="#374151" strokeWidth="1.6" />
              <rect x="21" y="9" width="9" height="7" fill="#b45309" />
              <g className="mh-wheel">
                <circle cx="5" cy="19" r="3" fill="#111827" />
              </g>
              <g className="mh-wheel">
                <circle cx="15" cy="19" r="3" fill="#111827" />
              </g>
            </g>
          </g>
        )}
        {/* camion */}
        {hasG("camion") && !weekend && (
          <g className="mh-truck" style={{ animationDelay: "-3s" }}>
            <g transform="translate(0 128)">
              <rect x="0" y="0" width="40" height="14" rx="1.5" fill={sc.truckColor} stroke="#1f2937" strokeWidth=".8" />
              <path d="M40 4 h9 l5 5 v5 h-14z" fill={sc.truckColor} stroke="#1f2937" strokeWidth=".8" />
              <rect x="43" y="5.5" width="6" height="4" fill="#bae6fd" />
              {(night || wet) && <circle cx="54" cy="12" r="1.6" fill="#fde68a" />}
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
        {/* nebbia, pioggia, neve, foglie */}
        {weather === "nebbia" &&
          [60, 95, 128].map((y, i) => (
            <rect key={y} className="mh-fog" x="-60" y={y} width="520" height="22" rx="11" fill="#fff" opacity={0.45 - i * 0.05} style={{ animationDelay: -i * 3 + "s" }} />
          ))}
        {wet &&
          sc.drops.map((d, i) => (
            <line key={i} className="mh-rain" x1={d.x} y1="0" x2={d.x - (weather === "temporale" ? 7 : 4)} y2="9" stroke={dark ? "#94a3b8" : "#475569"} strokeWidth="1" opacity=".55" style={{ animationDelay: d.delay + "s" }} />
          ))}
        {weather === "neve" &&
          sc.flakes.map((f, i) => <circle key={i} className="mh-snow" cx={f.x} cy="0" r={f.s} fill="#fff" opacity=".9" style={{ animationDuration: f.d + "s", animationDelay: f.delay + "s" }} />)}
        {weather === "vento" &&
          sc.leaves.map((l, i) => <ellipse key={i} className="mh-leaf" cx="0" cy={l.y} rx="3" ry="1.6" fill={l.c} style={{ animationDuration: l.d + "s", animationDelay: l.delay + "s" }} />)}
      </svg>
      {party && <Confetti seed={seed} />}
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
