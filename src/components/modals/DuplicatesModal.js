import React, { useState } from "react";
import {
  X,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { getSafeMatricola } from "../../utils";

export const DuplicatesModal = ({
  analysis,
  onClose,
  onDirectMerge,
  onIgnore,
  color = "blue",
}) => {
  const [loadingIdx, setLoadingIdx] = useState(null);
  const pairs = analysis.pairs;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[230] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border-t-4 border-yellow-500`}
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 text-yellow-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 tracking-tight text-lg">
                Potenziali Conflitti
              </h3>
              <p className="text-xs font-bold text-slate-500">
                {pairs.length}{" "}
                {pairs.length === 1 ? "Elemento simile" : "Elementi simili"}{" "}
                trovati
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-100 space-y-4">
          {pairs.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8" />
              </div>
              <p className="text-slate-500 font-bold text-xs">
                Nessun conflitto rilevato! 🎉
              </p>
            </div>
          ) : (
            pairs.map((pair, idx) => {
              const [a, b] = pair;
              const nameA =
                analysis.type === "customer"
                  ? a.name
                  : `${getSafeMatricola(a)} (${a.customerName})`;
              const nameB =
                analysis.type === "customer"
                  ? b.name
                  : `${getSafeMatricola(b)} (${b.customerName})`;

              return (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-yellow-300 transition-colors"
                >
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex-1 text-center md:text-left bg-red-50 p-3 rounded-xl border border-red-100 w-full md:w-auto">
                      <span className="font-black text-sm text-red-700 block break-words">
                        {nameA}
                      </span>
                      <span className="text-[10px] text-red-400 font-bold mt-1 block">
                        ID: {a.id.substring(0, 8)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                      <button
                        onClick={async () => {
                          setLoadingIdx(idx);
                          await onDirectMerge(a, b, analysis.type);
                          setLoadingIdx(null);
                        }}
                        disabled={loadingIdx !== null}
                        className={`text-xs font-black bg-purple-100 text-purple-700 px-4 py-2 rounded-xl hover:bg-purple-200 transition-colors shadow-sm flex items-center justify-center gap-2 ${
                          loadingIdx !== null
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        title="Elimina quello di Sinistra e unisci i suoi dati in quello di Destra"
                      >
                        {loadingIdx === idx ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <ArrowRight className="w-4 h-4 hidden md:block" />
                            <ArrowDown className="w-4 h-4 md:hidden" />
                          </>
                        )}{" "}
                        Unisci a Destra
                      </button>
                      <button
                        onClick={async () => {
                          setLoadingIdx(idx);
                          await onDirectMerge(b, a, analysis.type);
                          setLoadingIdx(null);
                        }}
                        disabled={loadingIdx !== null}
                        className={`text-xs font-black bg-blue-100 text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-200 transition-colors shadow-sm flex items-center justify-center gap-2 flex-row-reverse md:flex-row ${
                          loadingIdx !== null
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        title="Elimina quello di Destra e unisci i suoi dati in quello di Sinistra"
                      >
                        {loadingIdx === idx ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <ArrowLeft className="w-4 h-4 hidden md:block" />
                            <ArrowUp className="w-4 h-4 md:hidden" />
                          </>
                        )}{" "}
                        Unisci a Sinistra
                      </button>
                    </div>

                    <div className="flex-1 text-center md:text-right bg-blue-50 p-3 rounded-xl border border-blue-100 w-full md:w-auto">
                      <span className="font-black text-sm text-blue-700 block break-words">
                        {nameB}
                      </span>
                      <span className="text-[10px] text-blue-400 font-bold mt-1 block">
                        ID: {b.id.substring(0, 8)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-50 text-center">
                    <button
                      onClick={async () => {
                        setLoadingIdx(idx);
                        await onIgnore(a, b);
                        setLoadingIdx(null);
                      }}
                      disabled={loadingIdx !== null}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest bg-slate-100 px-4 py-1.5 rounded-lg transition-colors"
                      title="Questi due elementi sono diversi, non propormeli più."
                    >
                      Ignora (Ricorda Scelta)
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
