import React, { useEffect, useState } from "react";
import { FileText, Share2, ExternalLink, Download, X, Loader2 } from "lucide-react";
import { describeError } from "../utils";

// Per stampare da qualunque punto dell'app:
//   openPdf(() => buildInterventionPdf({ log }), "Assistenza-123.pdf")
// Il PDF viene creato e compare una finestra con: Condividi / Stampa, Apri, Scarica.
// (Due tocchi separati: il telefono accetta "Condividi" solo subito dopo un tocco.)
export const openPdf = (build, filename) =>
  window.dispatchEvent(new CustomEvent("mora-pdf", { detail: { build, filename } }));

export const PdfHost = () => {
  const [state, setState] = useState(null); // { status, filename, file, url, error }

  useEffect(() => {
    let job = 0;
    const onPdf = async (e) => {
      const { build, filename } = e.detail || {};
      const id = ++job;
      setState((prev) => {
        if (prev && prev.url) URL.revokeObjectURL(prev.url);
        return { status: "loading", filename };
      });
      try {
        const bytes = await build();
        if (id !== job) return;
        const blob = new Blob([bytes], { type: "application/pdf" });
        let file = null;
        try {
          file = new File([blob], filename, { type: "application/pdf" });
        } catch (err) {
          file = null;
        }
        setState({ status: "ready", filename, file, url: URL.createObjectURL(blob) });
      } catch (err) {
        if (id !== job) return;
        setState({ status: "error", filename, error: describeError(err) });
      }
    };
    window.addEventListener("mora-pdf", onPdf);
    return () => window.removeEventListener("mora-pdf", onPdf);
  }, []);

  if (!state) return null;

  const close = () => {
    if (state.url) URL.revokeObjectURL(state.url);
    setState(null);
  };
  const canShare =
    state.file &&
    typeof navigator !== "undefined" &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [state.file] });
  const share = async () => {
    try {
      await navigator.share({ files: [state.file], title: state.filename });
    } catch (err) {
      if (err && err.name === "AbortError") return;
      setState((s) => ({ ...s, note: "Condivisione non riuscita: usa \"Apri PDF\" o \"Scarica\"." }));
    }
  };

  const btn =
    "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-sm active:scale-95 transition-transform";

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 z-[400] flex items-center justify-center p-4 backdrop-blur-sm"
      data-section="pdf-ready"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200 shrink-0">
              {state.status === "loading" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-slate-800 text-sm">
                {state.status === "loading"
                  ? "Preparo il PDF…"
                  : state.status === "error"
                  ? "PDF non creato"
                  : "PDF pronto"}
              </h3>
              <p className="text-[11px] text-slate-500 font-bold break-all">{state.filename}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Chiudi"
            className="p-1.5 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {state.status === "error" && (
          <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
            {state.error}
          </p>
        )}

        {state.status === "ready" && (
          <div className="space-y-2">
            {canShare && (
              <button type="button" onClick={share} className={`${btn} bg-blue-600 text-white`}>
                <Share2 className="w-4 h-4" /> Condividi o stampa
              </button>
            )}
            <a
              href={state.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btn} ${canShare ? "bg-slate-100 text-slate-700 border border-slate-200" : "bg-blue-600 text-white"}`}
            >
              <ExternalLink className="w-4 h-4" /> Apri PDF
            </a>
            <a
              href={state.url}
              download={state.filename}
              className={`${btn} bg-slate-100 text-slate-700 border border-slate-200`}
            >
              <Download className="w-4 h-4" /> Scarica
            </a>
            {state.note && <p className="text-[11px] font-bold text-amber-700">{state.note}</p>}
            <p className="text-[10px] text-slate-400 font-bold text-center">
              Da "Condividi" puoi stampare, salvare in File o inviare il PDF.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
