// Sagome grigie al posto di «Carico…»: mostrano la forma di quello che sta arrivando (come le app moderne).
import React from "react";

const Bar = ({ w = "100%", h = 12, className = "" }) => <span className={`block rounded-full bg-slate-200 ${className}`} style={{ width: w, height: h }} />;

// schede tipo Storico: titolo, data, due righe di testo, tecnico
export const CardsSkeleton = ({ count = 3 }) => (
  <div className="space-y-3 animate-pulse" data-skeleton aria-label="Caricamento" role="status">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <div className="flex justify-between gap-3">
          <Bar w="55%" h={16} />
          <Bar w="22%" h={16} />
        </div>
        <Bar w="30%" />
        <Bar w="90%" />
        <Bar w="70%" />
        <div className="flex items-center gap-2 pt-1">
          <span className="w-7 h-7 rounded-full bg-slate-200" />
          <Bar w="35%" />
        </div>
      </div>
    ))}
  </div>
);

// righe semplici (classifiche, elenchi corti)
export const RowsSkeleton = ({ count = 4 }) => (
  <div className="space-y-2 animate-pulse" data-skeleton role="status" aria-label="Caricamento">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50">
        <span className="w-6 h-6 rounded-full bg-slate-200 shrink-0" />
        <Bar w={`${60 - i * 8}%`} />
      </div>
    ))}
  </div>
);
