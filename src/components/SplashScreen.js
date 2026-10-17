import React from "react";

// Schermata di avvio: un carroponte solleva la cassa "MORA", accanto una gru a bandiera.
// Dura circa 2,4 secondi. Con "Riduci movimento" attivo mostra subito l'immagine finale.
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

const Column = ({ x, className }) => (
  <g className={className}>
    <rect x={x} y="70" width="12" height="170" fill={S.steelDark} stroke={S.steel} strokeWidth="1.5" />
    <line x1={x} y1="100" x2={x + 12} y2="130" stroke={S.steel} strokeWidth="1" />
    <line x1={x + 12} y1="130" x2={x} y2="160" stroke={S.steel} strokeWidth="1" />
    <line x1={x} y1="160" x2={x + 12} y2="190" stroke={S.steel} strokeWidth="1" />
  </g>
);

export const SplashScreen = ({ dark = true, title = "Assistenza Mora" }) => (
  <div
    className={`mora-splash${dark ? "" : " light"}`}
    role="img"
    aria-label="Avvio dell'app: un carroponte solleva una cassa, accanto una gru a bandiera"
  >
    <style>{SPLASH_CSS}</style>
    <svg viewBox="0 0 360 260" aria-hidden="true">
      <defs>
        <pattern id="mora-hazard" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="10" height="10" fill={S.girder} />
          <rect width="5" height="10" fill={S.hazard} />
        </pattern>
      </defs>

      <line className="ground" x1="10" y1="240" x2="350" y2="240" stroke={S.steel} strokeWidth="2" strokeLinecap="round" />
      <Column x={34} className="col" />
      <Column x={314} className="col r" />

      {/* trave del carroponte */}
      <g className="girder">
        <rect x="24" y="52" width="30" height="10" rx="2" fill={S.steelDark} stroke={S.steel} strokeWidth="1.5" />
        <rect x="306" y="52" width="30" height="10" rx="2" fill={S.steelDark} stroke={S.steel} strokeWidth="1.5" />
        <rect x="30" y="58" width="300" height="16" fill={S.girder} />
        <rect x="30" y="70" width="300" height="4" fill="url(#mora-hazard)" />
        <rect x="30" y="58" width="300" height="16" fill="none" stroke={S.hazard} strokeOpacity=".35" strokeWidth="1" />
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

      {/* carico a terra, agganciato e sollevato */}
      <g className="pendulum">
        <g className="load">
          <path d="M180 199 L160 206 M180 199 L200 206" stroke={S.steel} strokeWidth="1.2" />
          <rect x="152" y="206" width="56" height="34" rx="2" fill={S.crate} stroke={S.crateEdge} strokeWidth="1.5" />
          <line x1="152" y1="217" x2="208" y2="217" stroke={S.crateEdge} strokeWidth="1" />
          <text x="180" y="233" textAnchor="middle" fontFamily={LABEL_FONT} fontWeight="800" fontSize="12" letterSpacing="2" fill={S.text}>
            MORA
          </text>
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
        </g>
      </g>
    </svg>

    <div className="s-wordmark">
      <div className="s-title">{title}</div>
      <div className="s-sub">Gru e carroponti</div>
    </div>
    <div className="s-bar">
      <i />
    </div>
  </div>
);
