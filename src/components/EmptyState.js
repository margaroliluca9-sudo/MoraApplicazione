// Pagina vuota: disegnino (gancio della gru che scende su un foglio) e una frase gentile.
import React from "react";

const Art = ({ color }) => (
  <svg viewBox="0 0 160 120" className="w-40 h-28" aria-hidden="true">
    <ellipse cx="80" cy="108" rx="54" ry="7" className="fill-slate-200" />
    <path d="M20 14h120" className={`stroke-${color}-200`} strokeWidth="6" strokeLinecap="round" />
    <rect x="68" y="10" width="24" height="12" rx="3" className={`fill-${color}-300`} />
    <path d="M80 22v36" className="stroke-slate-300" strokeWidth="2" strokeDasharray="3 3" />
    <path d="M80 58v6a7 7 0 1 0 7 7" fill="none" className={`stroke-${color}-400`} strokeWidth="3.5" strokeLinecap="round" />
    <rect x="52" y="78" width="56" height="30" rx="5" className="fill-white stroke-slate-200" strokeWidth="2" />
    <path d="M62 88h36M62 96h24" className="stroke-slate-200" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const EmptyState = ({ title = "Ancora niente qui", text = "", color = "blue", children = null }) => (
  <div className="flex flex-col items-center text-center py-12 px-6" data-empty-state>
    <Art color={color} />
    <p className="mt-4 text-base font-extrabold text-slate-700">{title}</p>
    {text && <p className="mt-1 text-sm text-slate-500 max-w-xs leading-snug">{text}</p>}
    {children && <div className="mt-4">{children}</div>}
  </div>
);
