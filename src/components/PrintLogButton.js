// Pulsante "Stampa" del singolo intervento: c'è in ogni pagina dove compare un intervento.
import React from "react";
import { Printer } from "lucide-react";
import { buildInterventionPdf, pdfFileName } from "../pdf";
import { openPdf } from "./PdfHost";

export const printIntervention = (log) =>
  openPdf(
    () => buildInterventionPdf({ log }),
    pdfFileName("Assistenza", log.ticketNumber, log.customer, (log.dateString || "").replace(/\//g, "-"))
  );

// variant "pill": etichetta piccola accanto a "FOTO"; "square": pulsante a fianco di una riga
export const PrintLogButton = ({ log, variant = "pill" }) => (
  <button
    type="button"
    data-print-log={log.id}
    aria-label="Stampa intervento"
    title="Stampa"
    onClick={(e) => {
      e.stopPropagation();
      printIntervention(log);
    }}
    className={
      variant === "square"
        ? "w-11 shrink-0 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center"
        : "text-[9px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg uppercase flex items-center gap-1 w-fit hover:bg-slate-100 transition-colors"
    }
  >
    <Printer className={variant === "square" ? "w-5 h-5" : "w-3 h-3"} />
    {variant === "square" ? null : "Stampa"}
  </button>
);
