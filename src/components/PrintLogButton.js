// Pulsante "Stampa" del singolo intervento: c'è in ogni pagina dove compare un intervento.
import React from "react";
import { Printer } from "lucide-react";
import { buildInterventionPdf, pdfFileName } from "../pdf";
import { openPdf } from "./PdfHost";
import { withPhotosOr } from "../logPhotos";

export const printIntervention = (log) =>
  openPdf(
    async () => buildInterventionPdf({ log: await withPhotosOr(log) }),
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
        : "text-xs font-bold text-slate-600 bg-white border border-slate-200 h-8 px-3 rounded-full flex items-center gap-1.5 w-fit hover:bg-slate-50 transition-colors"
    }
  >
    <Printer className={variant === "square" ? "w-5 h-5" : "w-3.5 h-3.5"} />
    {variant === "square" ? null : "Stampa"}
  </button>
);
