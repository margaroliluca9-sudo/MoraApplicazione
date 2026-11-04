// FUNE E CATENA: i disegni fatti dall'app (sezione della fune, misure, difetti, modi di imbracare).
import React, { useMemo } from "react";
import { ropeSection, describeCons } from "../../../ropeSection";

// SEZIONE DELLA FUNE NOTA (disegno indicativo dell'app dalla costruzione: trefoli, fili, anima)
export const FILL = { strand: "#f1f5f9", wire: "#a8b4c4", fiber: "#d6b98c", plastic: "#93c5fd" };
export const RopeSectionArt = ({ cons, size = 150 }) => {
  const list = useMemo(() => ropeSection(cons), [cons]);
  if (!list.length) return null;
  return (
    <div className="flex items-center gap-3" data-rope-section={cons}>
      <svg viewBox="-1.05 -1.05 2.1 2.1" width={size} height={size} className="shrink-0" aria-label={`Sezione della fune ${cons}`}>
        <circle cx="0" cy="0" r="1.03" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.015" />
        {list.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={FILL[c.t] || FILL.wire} stroke={c.t === "strand" ? "#64748b" : "#334155"} strokeWidth={c.t === "wire" ? 0.005 : 0.012} />
        ))}
      </svg>
      <div className="min-w-0 text-xs text-slate-600 leading-snug">
        <p className="font-black text-slate-800 text-sm">{cons}</p>
        <p>{describeCons(cons)}</p>
        <p className="text-[10px] text-slate-400 mt-1">Disegno indicativo fatto dall'app dalla costruzione (non è il disegno del catalogo FAS).</p>
      </div>
    </div>
  );
};
// disegnini per riconoscere la fune a occhio
export const Section = ({ n, big = false }) => {
  const outer = n === "tanti" ? 14 : Number(n);
  const R = 15;
  const r = n === "tanti" ? 3.6 : n === "8" ? 5 : 6.2;
  return (
    <svg viewBox="0 0 44 44" className={big ? "w-28 h-28" : "w-11 h-11"} aria-hidden="true">
      <circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" strokeOpacity=".25" />
      {n === "tanti" && [0, 1, 2, 3, 4, 5].map((i) => <circle key={"i" + i} cx={22 + 7 * Math.cos((i * Math.PI) / 3)} cy={22 + 7 * Math.sin((i * Math.PI) / 3)} r="3" fill="currentColor" opacity=".45" />)}
      {Array.from({ length: outer }, (_, i) => (
        <circle key={i} cx={22 + (n === "tanti" ? 16 : R) * Math.cos((i * 2 * Math.PI) / outer)} cy={22 + (n === "tanti" ? 16 : R) * Math.sin((i * 2 * Math.PI) / outer)} r={r} fill="currentColor" opacity=".8" />
      ))}
      {n !== "tanti" && <circle cx="22" cy="22" r={n === "8" ? 8 : 7} fill="currentColor" opacity=".3" />}
    </svg>
  );
};
export const Lay = ({ kind }) => (
  <svg viewBox="0 0 80 28" className="w-20 h-7" aria-hidden="true">
    <rect x="1" y="3" width="78" height="22" rx="11" fill="currentColor" opacity=".12" />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <path key={i} d={`M${i * 14 - 4} 25 L${i * 14 + 10} 3`} stroke="currentColor" strokeOpacity=".55" strokeWidth="1.6" />
    ))}
    {Array.from({ length: 16 }, (_, i) =>
      kind === "crociata" ? (
        <path key={"w" + i} d={`M${i * 5 + 2} ${8 + (i % 3) * 5} h4`} stroke="currentColor" strokeWidth="1.2" />
      ) : (
        <path key={"w" + i} d={`M${i * 5} ${18 - (i % 3) * 4} l3 -5`} stroke="currentColor" strokeWidth="1.2" />
      )
    )}
  </svg>
);
// fune vista di lato: trefoli in diagonale (più sono, più sono sottili)
export const Side = ({ strands = 6, kind = "crociata" }) => {
  const k = strands === "tanti" ? 16 : Number(strands);
  const step = 120 / k;
  return (
    <svg viewBox="0 0 200 60" className="w-full h-16" aria-hidden="true">
      <defs>
        <clipPath id={`rope-${strands}-${kind}`}>
          <rect x="2" y="8" width="196" height="44" rx="22" />
        </clipPath>
      </defs>
      <g clipPath={`url(#rope-${strands}-${kind})`}>
        <rect x="0" y="0" width="200" height="60" fill="#94a3b8" />
        {Array.from({ length: Math.ceil(260 / step) }, (_, i) => (
          <g key={i}>
            <path d={`M${i * step - 40} 60 L${i * step + 10} 0`} stroke="#334155" strokeWidth="1.4" />
            {kind === "crociata"
              ? [0, 1, 2].map((j) => <path key={j} d={`M${i * step - 30 + j * 9} ${46 - j * 12} h${Math.max(3, step * 0.5)}`} stroke="#e2e8f0" strokeWidth="1" />)
              : [0, 1, 2].map((j) => <path key={j} d={`M${i * step - 34 + j * 13} ${54 - j * 16} l${step * 0.22} -${step * 0.26 + 3}`} stroke="#e2e8f0" strokeWidth="1" />)}
          </g>
        ))}
      </g>
      <rect x="2" y="8" width="196" height="44" rx="22" fill="none" stroke="#0f172a" strokeOpacity=".5" />
    </svg>
  );
};
// disegni delle schede «i» sulle misure
export const RopeBand = ({ y = 10, w = 260, broken = false }) => (
  <g>
    <rect x="10" y={y} width={w} height="22" rx="11" fill="#94a3b8" />
    {Array.from({ length: Math.round(w / 14) }).map((_, i) => (
      <path key={i} d={`M${14 + i * 14} ${y + 1} l10 20`} stroke="#475569" strokeWidth="3" strokeLinecap="round" />
    ))}
    {broken && (
      <g stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
        <path d={`M120 ${y + 4} l10 -9`} />
        <path d={`M126 ${y + 6} l14 -6`} />
        <path d={`M190 ${y + 18} l9 9`} />
      </g>
    )}
  </g>
);
export const TrattoArt = () => (
  <svg viewBox="0 0 280 92" className="w-full max-w-xs" aria-hidden="true">
    <RopeBand />
    <g stroke="#1d4ed8" strokeWidth="2.5" fill="none">
      <path d="M20 42 v8 h44 v-8" />
      <path d="M20 62 v8 h240 v-8" />
    </g>
    <text x="42" y="60" textAnchor="middle" fontSize="11" fontWeight="900" fill="#1d4ed8">6d</text>
    <text x="140" y="86" textAnchor="middle" fontSize="11" fontWeight="900" fill="#1d4ed8">30d (5 volte più lungo)</text>
  </svg>
);
export const FiliArt = () => (
  <svg viewBox="0 0 280 50" className="w-full max-w-xs" aria-hidden="true">
    <RopeBand y={14} broken />
    <text x="150" y="10" fontSize="11" fontWeight="900" fill="#dc2626">fili rotti</text>
  </svg>
);
export const CaliperArt = () => (
  <svg viewBox="0 0 220 110" className="w-full max-w-[16rem]" aria-hidden="true">
    {[0, 1].map((k) => {
      const cx = 55 + k * 110;
      return (
        <g key={k} transform={k ? `rotate(90 ${cx} 55)` : undefined}>
          <circle cx={cx} cy="55" r="30" fill="#e2e8f0" />
          {Array.from({ length: 6 }).map((_, i) => (
            <circle key={i} cx={cx + 19 * Math.cos((i * Math.PI) / 3 + Math.PI / 6)} cy={55 + 19 * Math.sin((i * Math.PI) / 3 + Math.PI / 6)} r="11" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
          ))}
          <rect x={cx - 40} y="18" width="80" height="6" fill="#1d4ed8" />
          <rect x={cx - 40} y="86" width="80" height="6" fill="#1d4ed8" />
        </g>
      );
    })}
    <text x="55" y="108" textAnchor="middle" fontSize="10" fontWeight="900" fill="#1d4ed8">1ª misura</text>
    <text x="165" y="108" textAnchor="middle" fontSize="10" fontWeight="900" fill="#1d4ed8">2ª girata di 90°</text>
  </svg>
);
export const ChainArt = ({ where = "contatto" }) => (
  <svg viewBox="0 0 260 90" className="w-full max-w-xs" aria-hidden="true">
    <rect x="14" y="24" width="120" height="42" rx="21" fill="none" stroke="#64748b" strokeWidth="11" />
    <rect x="112" y="38" width="120" height="14" rx="7" fill="#64748b" />
    <rect x="112" y="38" width="120" height="14" rx="7" fill="none" stroke="#334155" strokeWidth="1.5" />
    {where === "contatto" ? (
      <g>
        <circle cx="128" cy="45" r="14" fill="none" stroke="#dc2626" strokeWidth="3" />
        <path d="M128 8 v16" stroke="#dc2626" strokeWidth="3" markerEnd="" />
        <text x="128" y="7" textAnchor="middle" fontSize="11" fontWeight="900" fill="#dc2626">misura qui</text>
      </g>
    ) : (
      <g>
        <path d="M60 4 v14 M60 72 v14" stroke="#1d4ed8" strokeWidth="3" />
        <text x="60" y="88" textAnchor="middle" fontSize="0" fill="#1d4ed8" />
        <text x="96" y="14" fontSize="11" fontWeight="900" fill="#1d4ed8">d = spessore del tondino</text>
      </g>
    )}
  </svg>
);
export const PassoArt = () => (
  <svg viewBox="0 0 260 70" className="w-full max-w-xs" aria-hidden="true">
    <rect x="14" y="14" width="120" height="42" rx="21" fill="none" stroke="#64748b" strokeWidth="11" />
    <path d="M26 35 h96" stroke="#1d4ed8" strokeWidth="2.5" />
    <path d="M26 29 v12 M122 29 v12" stroke="#1d4ed8" strokeWidth="2.5" />
    <text x="74" y="31" textAnchor="middle" fontSize="11" fontWeight="900" fill="#1d4ed8">t</text>
    <text x="150" y="40" fontSize="11" fontWeight="900" fill="#1d4ed8">passo = dentro la maglia</text>
  </svg>
);
// disegni dei difetti (indicativi, fatti apposta per l'app)
export const Strands = ({ x = 10, y = 10, w = 120, h = 22, pinch = null }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="#94a3b8" />
    {Array.from({ length: Math.round(w / 12) }).map((_, i) => (
      <path key={i} d={`M${x + 4 + i * 12} ${y + 1} l${h * 0.45} ${h - 2}`} stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
    ))}
    {pinch}
  </g>
);
export const Cap = ({ t }) => (
  <text x="0" y="0" fontSize="10" fontWeight="900" fill="#334155">
    {t}
  </text>
);
export const DefectArt = ({ k }) => {
  if (k === "valle")
    return (
      <svg viewBox="0 0 260 70" className="w-full max-w-xs" aria-hidden="true">
        <Strands x={10} y={14} w={240} h={30} />
        <g stroke="#dc2626" strokeWidth="3" strokeLinecap="round">
          <path d="M101 20 l5 -12" />
          <path d="M113 38 l6 12" />
        </g>
        <circle cx="108" cy="29" r="17" fill="none" stroke="#dc2626" strokeWidth="2" strokeDasharray="4 3" />
        <text x="130" y="64" fontSize="10" fontWeight="900" fill="#dc2626">fili rotti nella valle, tra due trefoli</text>
      </svg>
    );
  if (k === "terminale")
    return (
      <svg viewBox="0 0 260 70" className="w-full max-w-xs" aria-hidden="true">
        <Strands x={10} y={22} w={170} h={24} />
        <rect x="176" y="16" width="44" height="36" rx="6" fill="#64748b" />
        <path d="M220 34 h26" stroke="#64748b" strokeWidth="10" strokeLinecap="round" />
        <g stroke="#dc2626" strokeWidth="3" strokeLinecap="round">
          <path d="M160 24 l8 -12" />
          <path d="M150 44 l7 12" />
        </g>
        <text x="30" y="14" fontSize="10" fontWeight="900" fill="#dc2626">fili rotti vicino al capocorda</text>
      </svg>
    );
  if (k === "locale")
    return (
      <svg viewBox="0 0 260 64" className="w-full max-w-xs" aria-hidden="true">
        <path d="M10 18 h95 q25 10 50 0 h95 v28 h-95 q-25 -10 -50 0 h-95 z" fill="#94a3b8" />
        {Array.from({ length: 20 }).map((_, i) => (
          <path key={i} d={`M${14 + i * 12} 19 l12 26`} stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
        ))}
        <path d="M130 4 v10 M130 50 v10" stroke="#dc2626" strokeWidth="3" />
        <text x="140" y="12" fontSize="10" fontWeight="900" fill="#dc2626">si stringe in un punto</text>
      </svg>
    );
  if (k === "deforma")
    return (
      <svg viewBox="0 0 300 150" className="w-full max-w-sm" aria-hidden="true">
        {/* gabbia d'uccello */}
        <g transform="translate(0 0)">
          <path d="M6 26 h40 M104 26 h40" stroke="#94a3b8" strokeWidth="22" strokeLinecap="round" />
          {[-1, 1].map((sg) => [0, 1, 2].map((i) => <path key={sg + "" + i} d={`M46 ${26 + sg * (3 + i * 3)} C 62 ${26 + sg * (30 - i * 6)}, 88 ${26 + sg * (30 - i * 6)}, 104 ${26 + sg * (3 + i * 3)}`} fill="none" stroke="#475569" strokeWidth="3" />))}
          <g transform="translate(160 30)"><Cap t="«gabbia d'uccello»" /></g>
        </g>
        {/* nodo / asola */}
        <g transform="translate(0 60)">
          <path d="M6 30 h50 c 30 0 30 -26 10 -26 c -20 0 -16 26 14 26 h66" fill="none" stroke="#94a3b8" strokeWidth="12" strokeLinecap="round" />
          <g transform="translate(160 28)"><Cap t="nodo, asola, piega secca" /></g>
        </g>
        {/* schiacciata */}
        <g transform="translate(0 110)">
          <path d="M6 14 h50 q20 6 40 0 h50 v20 h-50 q-20 -16 -40 0 h-50 z" fill="#94a3b8" />
          <path d="M56 10 h40 M56 38 h40" stroke="#dc2626" strokeWidth="2.5" />
          <g transform="translate(160 28)"><Cap t="schiacciata (appiattita)" /></g>
        </g>
      </svg>
    );
  if (k === "cricche")
    return (
      <svg viewBox="0 0 260 80" className="w-full max-w-xs" aria-hidden="true">
        <rect x="40" y="16" width="170" height="48" rx="24" fill="none" stroke="#64748b" strokeWidth="13" />
        <path d="M120 10 l6 6 l-5 5 l6 5" fill="none" stroke="#dc2626" strokeWidth="2.5" />
        <text x="134" y="12" fontSize="10" fontWeight="900" fill="#dc2626">cricca / taglio</text>
      </svg>
    );
  if (k === "piegata")
    return (
      <svg viewBox="0 0 260 80" className="w-full max-w-xs" aria-hidden="true">
        <path d="M40 40 C 40 10, 120 6, 140 24 C 160 42, 220 20, 220 40 C 220 70, 140 74, 120 56 C 100 38, 40 70, 40 40 z" fill="none" stroke="#64748b" strokeWidth="12" />
        <text x="80" y="78" fontSize="10" fontWeight="900" fill="#dc2626">maglia storta o ritorta</text>
      </svg>
    );
  if (k === "calore")
    return (
      <svg viewBox="0 0 260 80" className="w-full max-w-xs" aria-hidden="true">
        <rect x="40" y="16" width="170" height="48" rx="24" fill="none" stroke="#7c5a3a" strokeWidth="13" />
        {[70, 110, 150, 185].map((x) => <circle key={x} cx={x} cy={x % 2 ? 16 : 64} r="5" fill="#b45309" />)}
        <text x="60" y="78" fontSize="10" fontWeight="900" fill="#b45309">colori da calore, ruggine profonda</text>
      </svg>
    );
  if (k === "gancio")
    return (
      <svg viewBox="0 0 200 110" className="w-full max-w-[14rem]" aria-hidden="true">
        <path d="M100 6 v30 c0 14 -34 10 -34 40 c0 20 30 26 42 10" fill="none" stroke="#64748b" strokeWidth="12" strokeLinecap="round" />
        <path d="M108 86 l22 -18" stroke="#dc2626" strokeWidth="3" strokeDasharray="4 3" />
        <text x="118" y="100" fontSize="10" fontWeight="900" fill="#dc2626">bocca aperta</text>
      </svg>
    );
  return null;
};
// disegnini dei modi di imbracare (fatti dall'app)
export const ModeArt = ({ id }) => {
  const st = { fill: "none", stroke: "currentColor", strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round" };
  const hook = <path d="M30 4 v8" {...st} strokeWidth={3} />;
  const p = {
    diritto: <path d="M30 12 V58" {...st} />,
    strozzo: (
      <>
        <path d="M30 12 V40" {...st} />
        <ellipse cx="30" cy="48" rx="12" ry="9" {...st} />
      </>
    ),
    u0: <path d="M24 12 V50 q6 8 12 0 V12" {...st} />,
    u45: <path d="M30 12 L12 50 H48 Z" {...st} />,
    u60: <path d="M30 12 L6 46 H54 Z" {...st} />,
    tri45: <path d="M30 12 L14 50 Q30 56 46 50 Z" {...st} />,
    tri60: <path d="M30 12 L8 46 Q30 52 52 46 Z" {...st} />,
    due45: <path d="M30 12 L14 52 M30 12 L46 52" {...st} />,
    due60: <path d="M30 12 L8 48 M30 12 L52 48" {...st} />,
    duestr45: (
      <>
        <path d="M30 12 L18 44 M30 12 L42 44" {...st} />
        <circle cx="16" cy="50" r="6" {...st} />
        <circle cx="44" cy="50" r="6" {...st} />
      </>
    ),
    duestr60: (
      <>
        <path d="M30 12 L12 40 M30 12 L48 40" {...st} />
        <circle cx="9" cy="46" r="6" {...st} />
        <circle cx="51" cy="46" r="6" {...st} />
      </>
    ),
  }[id];
  return (
    <svg viewBox="0 0 60 62" className="w-12 h-12" aria-hidden="true">
      {hook}
      {p}
    </svg>
  );
};
