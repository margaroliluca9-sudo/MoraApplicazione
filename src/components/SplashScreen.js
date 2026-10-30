import React from "react";
import { greetingOf } from "../season";

// Schermata di avvio: un carroponte solleva la cassa "MORA", accanto una gru a bandiera.
// Dura circa 2,4 secondi. Con "Riduci movimento" attivo mostra subito l'immagine finale.
// Cambia da sola col periodo dell'anno (season.js): Natale (regalo, neve, lucine),
// Pasqua (uovo, prato, fiori), Estate (sole, pallone), Halloween (zucca, pipistrelli),
// San Valentino (cuori che salgono, scatola a cuore), Carnevale (coriandoli, stelle filanti, maschera),
// Festa della Repubblica (Frecce Tricolori, tricolore), Autunno (foglie che cadono).
const SPLASH_CSS = `
.mora-splash {
  --k: .85;
  --s-bg: #0b1220; --s-grid: rgba(120, 150, 200, 0.07);
  --s-steel: #8aa0bd; --s-steel-dark: #1c2738; --s-girder: #f2b705; --s-hazard: #10151f;
  --s-text: #f1f5f9; --s-muted: #6f819b; --s-accent: #3b82f6; --s-crate: #24324a; --s-crate-edge: #3b4d6b;
  position: fixed; inset: 0; z-index: 100; overflow: hidden;
  background:
    repeating-linear-gradient(0deg, var(--s-grid) 0 1px, transparent 1px 22px),
    repeating-linear-gradient(90deg, var(--s-grid) 0 1px, transparent 1px 22px),
    var(--s-bg);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
  font-family: "Barlow Condensed", "Arial Narrow", "Barlow", sans-serif;
  padding: env(safe-area-inset-top, 0px) 16px env(safe-area-inset-bottom, 0px);
}
.mora-splash.light {
  --s-bg: #f3f6fa; --s-grid: rgba(29, 78, 216, 0.06);
  --s-steel: #4a5d78; --s-steel-dark: #c9d4e2; --s-hazard: #1b2230;
  --s-text: #0f172a; --s-muted: #64748b; --s-accent: #1d4ed8; --s-crate: #dbe4f0; --s-crate-edge: #9fb2cc;
}
.mora-splash svg { width: min(88vw, 420px); height: auto; display: block; overflow: visible; }
.mora-splash svg * { transform-box: view-box; }
.mora-splash .s-wordmark { text-align: center; line-height: 1; }
.mora-splash .s-title { color: var(--s-text); font-weight: 800; font-size: min(30px, 7.4vw); letter-spacing: 3px; text-transform: uppercase; white-space: nowrap; }
.mora-splash .s-sub { color: var(--s-muted); font-family: "Barlow", "Segoe UI", sans-serif; font-weight: 500; font-size: 12px; letter-spacing: 2.5px; text-transform: uppercase; margin-top: 8px; }
.mora-splash .s-bar { width: 132px; height: 3px; border-radius: 3px; background: rgba(111, 129, 155, .3); overflow: hidden; }
.mora-splash .s-bar i { display: block; height: 100%; width: 100%; background: var(--s-accent); transform-origin: left; }

.mora-splash .col      { transform-origin: 0 240px; animation: ms-rise calc(.45s*var(--k)) cubic-bezier(.2,.8,.2,1) both; }
.mora-splash .col.r    { animation-delay: calc(.08s*var(--k)); }
.mora-splash .ground   { stroke-dasharray: 340; animation: ms-draw calc(.6s*var(--k)) cubic-bezier(.3,0,.2,1) both; }
.mora-splash .girder   { animation: ms-drop calc(.5s*var(--k)) calc(.35s*var(--k)) cubic-bezier(.2,.9,.25,1.15) both; }
.mora-splash .trolley  { animation: ms-travel calc(.6s*var(--k)) calc(.8s*var(--k)) cubic-bezier(.45,0,.2,1) both; }
.mora-splash .rope     { transform-origin: 0 74px; transform: scaleY(.53); animation: ms-rope calc(1.2s*var(--k)) calc(1.35s*var(--k)) cubic-bezier(.4,0,.2,1) both; }
.mora-splash .hook     { transform: translateY(-50px); animation: ms-hook calc(1.2s*var(--k)) calc(1.35s*var(--k)) cubic-bezier(.4,0,.2,1) both; }
.mora-splash .load     { transform: translateY(-50px); animation: ms-lift calc(1.2s*var(--k)) calc(1.35s*var(--k)) cubic-bezier(.4,0,.2,1) both; }
.mora-splash .pendulum { transform-origin: 180px 74px; animation: ms-sway calc(2.4s*var(--k)) calc(2.6s*var(--k)) ease-in-out infinite alternate; }
.mora-splash .jib-col  { transform-origin: 0 240px; animation: ms-rise calc(.45s*var(--k)) calc(.2s*var(--k)) cubic-bezier(.2,.8,.2,1) both; }
.mora-splash .jib-arm  { transform-origin: 82px 0; animation: ms-swing calc(.9s*var(--k)) calc(.55s*var(--k)) cubic-bezier(.3,0,.2,1) both; }
.mora-splash .jib-hook { animation: ms-bob calc(1.8s*var(--k)) calc(1.45s*var(--k)) ease-in-out infinite alternate; }
.mora-splash .s-wordmark { animation: ms-rise-in calc(.6s*var(--k)) calc(2.15s*var(--k)) cubic-bezier(.2,.8,.2,1) both; }
.mora-splash .s-bar    { animation: ms-fade-in calc(.4s*var(--k)) calc(.2s*var(--k)) both; }
.mora-splash .s-bar i  { animation: ms-load calc(2.8s*var(--k)) cubic-bezier(.4,0,.2,1) both; }

@keyframes ms-rise    { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes ms-draw    { from { stroke-dashoffset: 340; } to { stroke-dashoffset: 0; } }
@keyframes ms-drop    { from { transform: translateY(-46px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes ms-travel  { from { transform: translateX(-118px); } to { transform: translateX(0); } }
@keyframes ms-rope    { 0% { transform: scaleY(.08); } 45%, 55% { transform: scaleY(1); } 100% { transform: scaleY(.53); } }
@keyframes ms-hook    { 0% { transform: translateY(-97px); } 45%, 55% { transform: translateY(0); } 100% { transform: translateY(-50px); } }
@keyframes ms-lift    { 0%, 55% { transform: translateY(0); } 100% { transform: translateY(-50px); } }
@keyframes ms-sway    { from { transform: rotate(-1.4deg); } to { transform: rotate(1.4deg); } }
@keyframes ms-swing   { from { transform: scaleX(-1); opacity: 0; } 15% { opacity: 1; } to { transform: scaleX(1); opacity: 1; } }
@keyframes ms-bob     { from { transform: translateY(0); } to { transform: translateY(5px); } }
@keyframes ms-rise-in { from { transform: translateY(14px); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes ms-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes ms-load    { from { transform: scaleX(0); } to { transform: scaleX(1); } }

/* --- periodi dell'anno --- */
.mora-splash.s-natale { --s-bg: #0a1830; --s-accent: #ef4444; }
.mora-splash.s-natale.light { --s-bg: #eef4fb; --s-accent: #dc2626; }
.mora-splash.s-pasqua, .mora-splash.s-pasqua.light { --s-bg: #fdf7ee; --s-grid: rgba(190, 140, 200, 0.10); --s-text: #3b2a4d; --s-muted: #8a6f9e; --s-accent: #c084fc; --s-steel: #6b5b7b; --s-steel-dark: #ede4f5; --s-hazard: #3b2a4d; }
.mora-splash.s-estate { --s-bg: #0d2033; --s-accent: #f59e0b; }
.mora-splash.s-estate.light { --s-bg: #fff8e8; --s-accent: #f59e0b; }
.mora-splash.s-halloween, .mora-splash.s-halloween.light { --s-bg: #1a0f24; --s-grid: rgba(249, 115, 22, 0.06); --s-text: #fde7d3; --s-muted: #c08a5e; --s-accent: #f97316; --s-steel: #9d8bb0; --s-steel-dark: #2a1b38; --s-hazard: #120a19; }
.mora-splash .snow { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.mora-splash .snow i { position: absolute; top: -12px; border-radius: 50%; background: #fff; opacity: .85; animation: ms-snow linear infinite; }
.mora-splash.light .snow i { background: #9ec5f0; }
.mora-splash .bulb { animation: ms-blink 1.1s ease-in-out infinite alternate; }
.mora-splash .bulb.b2 { animation-delay: .55s; }
.mora-splash .sun-rays { transform-origin: 318px 22px; animation: ms-spin 12s linear infinite; }
.mora-splash .bat { animation: ms-bat 3.2s ease-in-out infinite; }
.mora-splash .bat.b2 { animation-delay: -1.6s; animation-duration: 3.8s; }
.mora-splash .petal { transform-origin: center; animation: ms-bob 1.6s ease-in-out infinite alternate; }
@keyframes ms-snow  { from { transform: translateY(0); } to { transform: translateY(110vh); } }
/* San Valentino, Carnevale, Repubblica, Autunno */
.mora-splash.s-sanvalentino { --s-bg: #2a0f1d; --s-grid: rgba(244, 114, 182, 0.07); --s-accent: #f43f5e; --s-text: #ffe4ec; --s-muted: #f9a8c4; }
.mora-splash.s-sanvalentino.light { --s-bg: #fff1f4; --s-text: #4c0519; --s-muted: #be6280; --s-accent: #e11d48; }
.mora-splash.s-carnevale { --s-bg: #1b1240; --s-grid: rgba(250, 204, 21, 0.07); --s-accent: #a855f7; }
.mora-splash.s-carnevale.light { --s-bg: #faf5ff; --s-accent: #9333ea; }
.mora-splash.s-repubblica { --s-bg: #0c1a2e; --s-accent: #16a34a; }
.mora-splash.s-repubblica.light { --s-bg: #f4f9ff; --s-accent: #15803d; }
.mora-splash.s-autunno { --s-bg: #1f150c; --s-grid: rgba(234, 88, 12, 0.07); --s-text: #fdecd8; --s-muted: #c9976a; --s-accent: #ea580c; --s-steel: #a8977f; --s-steel-dark: #2e2216; }
.mora-splash.s-autunno.light { --s-bg: #fdf6ec; --s-text: #431407; --s-muted: #9a6b44; --s-accent: #c2410c; --s-steel: #6b5a45; --s-steel-dark: #eadcc8; }
.mora-splash .fall { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.mora-splash .fall i { position: absolute; top: -20px; display: block; animation: ms-fall linear infinite; }
.mora-splash .fall.up i { top: auto; bottom: -24px; animation-name: ms-up; }
.mora-splash .fall .heart { width: 14px; height: 14px; background: #f43f5e; transform: rotate(45deg); border-radius: 2px 0 2px 0; opacity: .85; }
.mora-splash .fall .heart::before, .mora-splash .fall .heart::after { content: ""; position: absolute; width: 14px; height: 14px; border-radius: 50%; background: inherit; }
.mora-splash .fall .heart::before { left: -7px; top: 0; } .mora-splash .fall .heart::after { left: 0; top: -7px; }
.mora-splash .fall .leaf { width: 14px; height: 9px; border-radius: 0 100% 0 100%; }
.mora-splash .streamer { stroke-dasharray: 240; animation: ms-draw2 1.4s .3s ease-out both; }
.mora-splash .frecce path { stroke-dasharray: 420; animation: ms-draw2 1.8s .2s cubic-bezier(.3,0,.2,1) both; }
.mora-splash .frecce .jet { animation: ms-fly 1.8s .2s cubic-bezier(.3,0,.2,1) both; }
@keyframes ms-fall  { 0% { transform: translate(0, 0) rotate(0); } 50% { transform: translate(18px, 55vh) rotate(200deg); } 100% { transform: translate(-10px, 112vh) rotate(380deg); } }
@keyframes ms-up    { 0% { transform: translate(0, 0) rotate(45deg); opacity: 0; } 10% { opacity: .9; } 100% { transform: translate(14px, -112vh) rotate(45deg); opacity: 0; } }
@keyframes ms-draw2 { from { stroke-dashoffset: 420; } to { stroke-dashoffset: 0; } }
@keyframes ms-fly   { from { transform: translateX(-330px); opacity: 0; } 10% { opacity: 1; } to { transform: translateX(0); opacity: 1; } }
@keyframes ms-blink { from { opacity: .35; } to { opacity: 1; } }
@keyframes ms-spin  { to { transform: rotate(360deg); } }
@keyframes ms-bat   { 0% { transform: translate(0, 0); } 50% { transform: translate(-26px, 8px); } 100% { transform: translate(0, 0); } }

@media (prefers-reduced-motion: reduce) {
  .mora-splash * { animation: none !important; }
}
`;

const S = {
  steel: "var(--s-steel)",
  steelDark: "var(--s-steel-dark)",
  girder: "var(--s-girder)",
  hazard: "var(--s-hazard)",
  accent: "var(--s-accent)",
  text: "var(--s-text)",
  crate: "var(--s-crate)",
  crateEdge: "var(--s-crate-edge)",
};
const LABEL_FONT = "Barlow Condensed, Arial Narrow, sans-serif";

// carico appeso al carroponte
const Load = ({ season }) => {
  const slings = <path d="M180 199 L160 206 M180 199 L200 206" stroke={S.steel} strokeWidth="1.2" />;
  if (season === "natale")
    return (
      <g>
        {slings}
        <rect x="152" y="206" width="56" height="34" rx="2" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1.5" />
        <rect x="194" y="206" width="7" height="34" fill="#facc15" />
        <rect x="152" y="212" width="56" height="5" fill="#facc15" />
        <path d="M197.5 206 q-12 -10 -14 -2 q2 6 14 2 q12 4 14 -2 q-2 -8 -14 2z" fill="#facc15" stroke="#a16207" strokeWidth=".8" />
        <text x="173" y="233" textAnchor="middle" fontFamily={LABEL_FONT} fontWeight="800" fontSize="11" letterSpacing="1.5" fill="#fff">MORA</text>
      </g>
    );
  if (season === "pasqua")
    return (
      <g>
        <path d="M180 199 L172 204 M180 199 L188 204" stroke={S.steel} strokeWidth="1.2" />
        <ellipse cx="180" cy="222" rx="24" ry="19" fill="#fbcfe8" stroke="#db2777" strokeWidth="1.2" />
        <path d="M157 216 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l6 5 l6 -5 l4 4" fill="none" stroke="#a855f7" strokeWidth="2" />
        <path d="M158 230 h44" stroke="#22c55e" strokeWidth="2.2" />
        <text x="180" y="227" textAnchor="middle" fontFamily={LABEL_FONT} fontWeight="800" fontSize="9" letterSpacing="1.5" fill="#831843">MORA</text>
      </g>
    );
  if (season === "sanvalentino")
    return (
      <g>
        <path d="M180 199 L168 208 M180 199 L192 208" stroke={S.steel} strokeWidth="1.2" />
        <path d="M180 240 C150 222 150 204 166 204 C174 204 178 209 180 213 C182 209 186 204 194 204 C210 204 210 222 180 240Z" fill="#e11d48" stroke="#881337" strokeWidth="1.4" />
        <text x="180" y="225" textAnchor="middle" fontFamily={LABEL_FONT} fontWeight="800" fontSize="9" letterSpacing="1.2" fill="#fff">MORA</text>
      </g>
    );
  if (season === "carnevale")
    return (
      <g>
        {slings}
        <rect x="152" y="206" width="56" height="34" rx="2" fill="#7c3aed" stroke="#4c1d95" strokeWidth="1.5" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <rect key={i} x={152 + i * 8} y="206" width="4" height="34" fill={["#facc15", "#22c55e", "#f43f5e", "#38bdf8"][i % 4]} opacity=".85" />
        ))}
        <path d="M162 214 q8 -6 18 0 q10 -6 18 0 q-2 9 -9 9 q-5 0 -9 -4 q-4 4 -9 4 q-7 0 -9 -9z" fill="#111827" />
        <text x="180" y="236" textAnchor="middle" fontFamily={LABEL_FONT} fontWeight="800" fontSize="9" letterSpacing="1.2" fill="#fff">MORA</text>
      </g>
    );
  if (season === "repubblica")
    return (
      <g>
        {slings}
        <rect x="152" y="206" width="19" height="34" fill="#16a34a" />
        <rect x="171" y="206" width="18" height="34" fill="#f8fafc" />
        <rect x="189" y="206" width="19" height="34" fill="#dc2626" />
        <rect x="152" y="206" width="56" height="34" rx="2" fill="none" stroke="#334155" strokeWidth="1.5" />
        <text x="180" y="227" textAnchor="middle" fontFamily={LABEL_FONT} fontWeight="800" fontSize="10" letterSpacing="1.5" fill="#0f172a">MORA</text>
      </g>
    );
  if (season === "autunno")
    return (
      <g>
        {slings}
        <rect x="152" y="206" width="56" height="34" rx="2" fill="#92400e" stroke="#451a03" strokeWidth="1.5" />
        <line x1="152" y1="217" x2="208" y2="217" stroke="#451a03" strokeWidth="1" />
        <text x="180" y="233" textAnchor="middle" fontFamily={LABEL_FONT} fontWeight="800" fontSize="12" letterSpacing="2" fill="#fde68a">MORA</text>
        <path d="M200 206 q8 -10 14 -4 q-2 8 -14 4z" fill="#f59e0b" />
        <path d="M158 206 q-6 -9 -12 -3 q3 7 12 3z" fill="#dc2626" />
      </g>
    );
  if (season === "halloween")
    return (
      <g>
        <path d="M180 199 L176 205 M180 199 L184 205" stroke={S.steel} strokeWidth="1.2" />
        <rect x="177" y="203" width="6" height="7" rx="1.5" fill="#4d7c0f" />
        <ellipse cx="168" cy="224" rx="14" ry="16" fill="#ea580c" />
        <ellipse cx="192" cy="224" rx="14" ry="16" fill="#ea580c" />
        <ellipse cx="180" cy="224" rx="15" ry="17" fill="#f97316" stroke="#9a3412" strokeWidth="1" />
        <path d="M168 217 l5 -6 l5 6z M182 217 l5 -6 l5 6z" fill="#1a0f24" />
        <path d="M166 228 q14 12 28 0 l-4 4 l-3 -3 l-3 4 l-4 -4 l-4 4 l-3 -4 l-3 3z" fill="#1a0f24" />
      </g>
    );
  return (
    <g>
      {slings}
      <rect x="152" y="206" width="56" height="34" rx="2" fill={S.crate} stroke={S.crateEdge} strokeWidth="1.5" />
      <line x1="152" y1="217" x2="208" y2="217" stroke={S.crateEdge} strokeWidth="1" />
      <text x="180" y="233" textAnchor="middle" fontFamily={LABEL_FONT} fontWeight="800" fontSize="12" letterSpacing="2" fill={S.text}>
        MORA
      </text>
    </g>
  );
};

// oggettino appeso alla gru a bandiera
const JibCharm = ({ season }) => {
  if (season === "natale")
    return (
      <g>
        <circle cx="125.5" cy="179" r="5.5" fill="#ef4444" stroke="#7f1d1d" strokeWidth=".8" />
        <rect x="123.5" y="172" width="4" height="2.5" fill="#facc15" />
        <circle cx="123.8" cy="177.5" r="1.3" fill="#fff" opacity=".7" />
      </g>
    );
  if (season === "pasqua") return <ellipse cx="125.5" cy="180" rx="5" ry="6.5" fill="#bfdbfe" stroke="#3b82f6" strokeWidth=".8" />;
  if (season === "estate")
    return (
      <g>
        <circle cx="125.5" cy="180" r="6.5" fill="#fff" stroke="#0ea5e9" strokeWidth=".8" />
        <path d="M119 180 a6.5 6.5 0 0 1 13 0z" fill="#ef4444" />
        <path d="M125.5 173.5 v13" stroke="#facc15" strokeWidth="2" />
      </g>
    );
  if (season === "sanvalentino") return <path d="M125.5 187 C118 182 118 175 122 175 C124 175 125 176.5 125.5 177.5 C126 176.5 127 175 129 175 C133 175 133 182 125.5 187Z" fill="#f43f5e" />;
  if (season === "carnevale")
    return (
      <g>
        <path d="M119 177 q3 -3 6.5 0 q3.5 -3 6.5 0 q-1 5 -4 5 q-2 0 -2.5 -2 q-.5 2 -2.5 2 q-3 0 -4 -5z" fill="#a855f7" stroke="#facc15" strokeWidth=".8" />
      </g>
    );
  if (season === "repubblica")
    return (
      <g>
        <rect x="121" y="174" width="3" height="8" fill="#16a34a" />
        <rect x="124" y="174" width="3" height="8" fill="#f8fafc" />
        <rect x="127" y="174" width="3" height="8" fill="#dc2626" />
      </g>
    );
  if (season === "autunno") return <path d="M125.5 186 q-7 -5 -4 -11 q4 1 4 4 q0 -3 4 -4 q3 6 -4 11z" fill="#ea580c" />;
  if (season === "halloween")
    return (
      <g>
        <path d="M120 186 v-8 a5.5 5.5 0 0 1 11 0 v8 l-2 -2 l-1.8 2 l-1.8 -2 l-1.8 2 l-1.8 -2z" fill="#f8fafc" />
        <circle cx="123.8" cy="178" r="1" fill="#1a0f24" />
        <circle cx="127.2" cy="178" r="1" fill="#1a0f24" />
      </g>
    );
  return null;
};

const Column = ({ x, className }) => (
  <g className={className}>
    <rect x={x} y="70" width="12" height="170" fill={S.steelDark} stroke={S.steel} strokeWidth="1.5" />
    <line x1={x} y1="100" x2={x + 12} y2="130" stroke={S.steel} strokeWidth="1" />
    <line x1={x + 12} y1="130" x2={x} y2="160" stroke={S.steel} strokeWidth="1" />
    <line x1={x} y1="160" x2={x + 12} y2="190" stroke={S.steel} strokeWidth="1" />
  </g>
);

const LABELS = {
  normale: "un carroponte solleva una cassa, accanto una gru a bandiera",
  natale: "sotto la neve un carroponte con le lucine solleva un regalo",
  pasqua: "su un prato fiorito un carroponte solleva un uovo di Pasqua",
  estate: "sotto il sole un carroponte solleva una cassa, la gru a bandiera regge un pallone",
  halloween: "di notte un carroponte solleva una zucca, volano i pipistrelli",
  sanvalentino: "salgono i cuori, il carroponte solleva una scatola a forma di cuore",
  carnevale: "cadono i coriandoli, il carroponte solleva una cassa a strisce con la maschera",
  repubblica: "passano le Frecce Tricolori, il carroponte solleva una cassa tricolore",
  autunno: "cadono le foglie, il carroponte solleva una cassa di legno",
};

// coriandoli, cuori, foglie (posizioni fisse, sempre uguali)
const BITS = Array.from({ length: 30 }, (_, i) => ({
  left: (i * 41) % 100,
  dur: 3.5 + ((i * 13) % 5),
  delay: -((i * 7) % 8),
  k: i % 5,
}));
const CONFETTI = ["#f43f5e", "#facc15", "#22c55e", "#38bdf8", "#a855f7"];
const LEAVES = ["#ea580c", "#d97706", "#b91c1c", "#ca8a04", "#9a3412"];
const Falling = ({ season }) => {
  if (season === "carnevale")
    return (
      <div className="fall" aria-hidden="true">
        {BITS.map((b, i) => (
          <i key={i} style={{ left: b.left + "%", width: 6 + (b.k % 3) * 2, height: 9, background: CONFETTI[b.k], animationDuration: b.dur + "s", animationDelay: b.delay + "s", borderRadius: b.k % 2 ? "50%" : 1 }} />
        ))}
      </div>
    );
  if (season === "autunno")
    return (
      <div className="fall" aria-hidden="true">
        {BITS.slice(0, 18).map((b, i) => (
          <i key={i} className="leaf" style={{ left: b.left + "%", background: LEAVES[b.k], animationDuration: b.dur + 2 + "s", animationDelay: b.delay + "s" }} />
        ))}
      </div>
    );
  if (season === "sanvalentino")
    return (
      <div className="fall up" aria-hidden="true">
        {BITS.slice(0, 14).map((b, i) => (
          <i key={i} className="heart" style={{ left: b.left + "%", animationDuration: b.dur + 1 + "s", animationDelay: b.delay + "s", transform: `scale(${0.6 + (b.k % 3) * 0.25})` }} />
        ))}
      </div>
    );
  return null;
};

// neve (posizioni fisse: niente casualità, sempre uguale)
const FLAKES = Array.from({ length: 28 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 3 + ((i * 7) % 5),
  dur: 4 + ((i * 13) % 6),
  delay: -((i * 11) % 9),
}));

export const SplashScreen = ({ dark = true, title = "Assistenza Mora", season = "normale" }) => (
  <div
    className={`mora-splash${dark ? "" : " light"} s-${season}`}
    role="img"
    aria-label={"Avvio dell'app: " + (LABELS[season] || LABELS.normale)}
    data-season={season}
  >
    <style>{SPLASH_CSS}</style>
    <Falling season={season} />
    {season === "natale" && (
      <div className="snow" aria-hidden="true">
        {FLAKES.map((f, i) => (
          <i key={i} style={{ left: f.left + "%", width: f.size, height: f.size, animationDuration: f.dur + "s", animationDelay: f.delay + "s" }} />
        ))}
      </div>
    )}
    <svg viewBox="0 0 360 260" aria-hidden="true">
      <defs>
        <pattern id="mora-hazard" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill={S.girder} />
          <rect width="5" height="10" fill={S.hazard} />
        </pattern>
      </defs>

      {season === "estate" && (
        <g>
          <g className="sun-rays">
            {Array.from({ length: 12 }, (_, i) => (
              <line key={i} x1="318" y1="2" x2="318" y2="-6" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${i * 30} 318 22)`} />
            ))}
          </g>
          <circle cx="318" cy="22" r="14" fill="#fbbf24" />
        </g>
      )}
      {season === "repubblica" && (
        <g className="frecce">
          {[["#16a34a", 8], ["#f8fafc", 16], ["#dc2626", 24]].map(([c, y]) => (
            <path key={c} d={`M10 ${y + 10} Q 170 ${y - 14} 340 ${y}`} fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" opacity=".9" />
          ))}
          {[8, 16, 24].map((y) => (
            <path key={y} className="jet" d={`M340 ${y} l-9 -2.5 l2 2.5 l-2 2.5z`} fill="#1e3a8a" />
          ))}
        </g>
      )}
      {season === "carnevale" && (
        <g>
          {[["#facc15", "M20 30 q20 -20 40 0 t40 0 t40 0"], ["#38bdf8", "M220 18 q20 20 40 0 t40 0 t40 0"], ["#f43f5e", "M120 6 q15 15 30 0 t30 0 t30 0"]].map(([c, d]) => (
            <path key={c} className="streamer" d={d} fill="none" stroke={c} strokeWidth="2.4" strokeLinecap="round" />
          ))}
        </g>
      )}
      {season === "halloween" && (
        <g>
          <circle cx="316" cy="20" r="15" fill="#fde68a" opacity=".9" />
          <circle cx="322" cy="16" r="13" fill="var(--s-bg)" />
          <path className="bat" d="M250 26 q6 -8 12 0 q3 -4 6 0 q3 -4 6 0 q6 -8 12 0 q-9 2 -18 8 q-9 -6 -18 -8z" fill="#2a1b38" stroke="#f97316" strokeWidth=".8" />
          <path className="bat b2" d="M70 30 q5 -7 10 0 q2.5 -3.5 5 0 q2.5 -3.5 5 0 q5 -7 10 0 q-7.5 2 -15 7 q-7.5 -5 -15 -7z" fill="#2a1b38" stroke="#f97316" strokeWidth=".8" />
        </g>
      )}
      <line className="ground" x1="10" y1="240" x2="350" y2="240" stroke={S.steel} strokeWidth="2" strokeLinecap="round" />
      {season === "pasqua" && (
        <g>
          {[22, 58, 104, 230, 262, 296, 336].map((x) => (
            <path key={x} d={`M${x} 240 q2 -9 4 0 q2 -7 4 0 q2 -10 4 0`} fill="none" stroke="#65a30d" strokeWidth="1.6" strokeLinecap="round" />
          ))}
          {[[44, "#f9a8d4"], [248, "#fde047"], [318, "#a5b4fc"]].map(([x, c]) => (
            <g key={x} className="petal">
              <line x1={x} y1="240" x2={x} y2="228" stroke="#65a30d" strokeWidth="1.4" />
              {[0, 72, 144, 216, 288].map((r) => (
                <ellipse key={r} cx={x} cy="222" rx="2.6" ry="4.6" fill={c} transform={`rotate(${r} ${x} 226)`} />
              ))}
              <circle cx={x} cy="226" r="2.2" fill="#f59e0b" />
            </g>
          ))}
        </g>
      )}
      <Column x={34} className="col" />
      <Column x={314} className="col r" />

      {/* trave del carroponte */}
      <g className="girder">
        <rect x="24" y="52" width="30" height="10" rx="2" fill={S.steelDark} stroke={S.steel} strokeWidth="1.5" />
        <rect x="306" y="52" width="30" height="10" rx="2" fill={S.steelDark} stroke={S.steel} strokeWidth="1.5" />
        <rect x="30" y="58" width="300" height="16" fill={S.girder} />
        <rect x="30" y="70" width="300" height="4" fill="url(#mora-hazard)" />
        <rect x="30" y="58" width="300" height="16" fill="none" stroke={S.hazard} strokeOpacity=".35" strokeWidth="1" />
        {season === "natale" && (
          <g>
            <path d="M30 76 Q 60 86 90 76 T 150 76 T 210 76 T 270 76 T 330 76" fill="none" stroke="#14532d" strokeWidth="1.2" />
            {[45, 75, 105, 135, 165, 195, 225, 255, 285, 315].map((x, i) => (
              <circle key={x} className={`bulb${i % 2 ? " b2" : ""}`} cx={x} cy={i % 2 ? 79 : 82} r="2.6" fill={["#ef4444", "#facc15", "#22c55e", "#3b82f6"][i % 4]} />
            ))}
          </g>
        )}
        <rect x="250" y="60" width="44" height="9" rx="1.5" fill={S.hazard} />
        <text x="272" y="67" textAnchor="middle" fontFamily={LABEL_FONT} fontWeight="800" fontSize="7.5" fill={S.girder} letterSpacing=".5">
          2000 kg
        </text>
      </g>

      {/* carrello con fune e gancio */}
      <g className="trolley">
        <rect x="162" y="44" width="36" height="12" rx="2" fill={S.steelDark} stroke={S.steel} strokeWidth="1.5" />
        <circle cx="170" cy="57" r="2.6" fill={S.steel} />
        <circle cx="190" cy="57" r="2.6" fill={S.steel} />
        <rect x="174" y="47" width="12" height="6" rx="1" fill={S.accent} />
        <g className="pendulum">
          <rect className="rope" x="179.2" y="74" width="1.6" height="108" fill={S.steel} />
          <g className="hook">
            <rect x="172" y="180" width="16" height="9" rx="2" fill={S.accent} />
            <path d="M180 189 v5 a5 5 0 1 1 -5 5" fill="none" stroke={S.steel} strokeWidth="2.4" strokeLinecap="round" />
          </g>
        </g>
      </g>

      {/* carico a terra, agganciato e sollevato (cambia col periodo dell'anno) */}
      <g className="pendulum">
        <g className="load">
          <Load season={season} />
        </g>
      </g>

      {/* gru a bandiera */}
      <g className="jib-col">
        <rect x="76" y="128" width="12" height="112" fill={S.steelDark} stroke={S.steel} strokeWidth="1.5" />
        <rect x="70" y="236" width="24" height="4" fill={S.steel} />
      </g>
      <g className="jib-arm">
        <path d="M82 132 H140 V138 H88 Z" fill={S.girder} stroke={S.hazard} strokeOpacity=".35" strokeWidth="1" />
        <line x1="82" y1="122" x2="138" y2="133" stroke={S.steel} strokeWidth="1.5" />
        <rect x="78" y="118" width="8" height="10" fill={S.steel} />
        <g className="jib-hook">
          <rect x="124" y="138" width="10" height="6" rx="1" fill={S.steelDark} stroke={S.steel} strokeWidth="1" />
          <line x1="129" y1="144" x2="129" y2="166" stroke={S.steel} strokeWidth="1.2" />
          <path d="M129 166 v3 a3.5 3.5 0 1 1 -3.5 3.5" fill="none" stroke={S.steel} strokeWidth="1.8" strokeLinecap="round" />
          <JibCharm season={season} />
        </g>
      </g>
    </svg>

    <div className="s-wordmark">
      <div className="s-title">{title}</div>
      <div className="s-sub">{greetingOf(season)}</div>
    </div>
    <div className="s-bar">
      <i />
    </div>
  </div>
);
