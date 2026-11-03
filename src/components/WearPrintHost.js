// STAMPA DEL VERBALE DI FUNE / CATENA: se non è stata scelta la gru, prima di stampare si scrive il numero.
// Se l'app lo riconosce propone gru e cliente; se no si scrivono a mano numero, cliente e portata.
// Il verbale si salva solo tra i «Verbali stampati» (wear_reports): negli interventi non si salva niente.
import React, { useEffect, useMemo, useState } from "react";
import { Printer, X } from "lucide-react";
import { getSafeMatricola, formatCapacity } from "../utils";
import { buildWearPdf, pdfFileName } from "../pdf";
import { openPdf } from "./PdfHost";
import { saveWearReport } from "../wearReports";

const INPUT = "w-full px-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400";
const norm = (v) => String(v || "").trim().toUpperCase().replace(/\s+/g, "");
const techName = () => {
  try {
    return localStorage.getItem("mora_tech_last_name") || "";
  } catch (e) {
    return "";
  }
};

// chiamata da Fune e catena e dalla misura rapida
export const printWear = (rep, crane = null) => window.dispatchEvent(new CustomEvent("mora-wear-print", { detail: { rep, crane } }));

// stampa vera (e salva tra i verbali stampati); again = ristampa di un verbale già salvato
export const doPrintWear = ({ rep, crane = null, day = "", tech = "", again = false }) => {
  const d = day || new Date().toLocaleDateString("it-IT");
  const t = tech || techName();
  const c = crane ? { customerName: crane.customerName || "", matricola: crane.matricola || getSafeMatricola(crane) || "", type: crane.type || "", capacity: crane.capacity || "" } : null;
  if (!again)
    saveWearReport({ rep, crane: c, tech: t, day: d })
      .then(() => window.dispatchEvent(new CustomEvent("mora-wear-saved")))
      .catch(() => {});
  openPdf(() => buildWearPdf({ rep, crane: c, tech: t, today: d }), pdfFileName(rep.type === "fune" ? "Controllo fune" : rep.type === "fascia" ? "Controllo braca" : "Controllo catena", c ? c.customerName : "", c ? c.matricola : "", d));
};

export const WearPrintHost = ({ machines = [], color = "blue" }) => {
  const [job, setJob] = useState(null);
  const [f, setF] = useState({ matricola: "", customerName: "", capacity: "", type: "" });
  const [picked, setPicked] = useState(null);
  useEffect(() => {
    const on = (e) => {
      const d = (e && e.detail) || {};
      if (!d.rep) return;
      if (d.crane) return doPrintWear({ rep: d.rep, crane: d.crane });
      setF({ matricola: "", customerName: "", capacity: "", type: "" });
      setPicked(null);
      setJob(d);
    };
    window.addEventListener("mora-wear-print", on);
    return () => window.removeEventListener("mora-wear-print", on);
  }, []);
  const sling = job && job.rep && job.rep.type === "fascia";
  const q = norm(f.matricola);
  const found = useMemo(() => {
    if (!q || sling) return [];
    const all = machines.filter((m) => norm(getSafeMatricola(m)).includes(q));
    return all.sort((a, b) => (norm(getSafeMatricola(b)) === q) - (norm(getSafeMatricola(a)) === q)).slice(0, 5);
  }, [machines, q]);
  if (!job) return null;
  const pick = (m) => {
    setPicked(m);
    setF({ matricola: getSafeMatricola(m), customerName: m.customerName || "", capacity: m.capacity || "", type: m.type || "" });
  };
  const set = (k) => (e) => {
    setPicked(null);
    setF((o) => ({ ...o, [k]: e.target.value }));
  };
  const go = (withCrane) => {
    const crane = withCrane && (sling ? f.customerName.trim() : f.matricola.trim()) ? { ...f, matricola: f.matricola.trim(), customerName: f.customerName.trim(), type: sling ? "" : f.type } : null;
    doPrintWear({ rep: job.rep, crane });
    setJob(null);
  };
  const canPrint = sling ? !!f.customerName.trim() : !!f.matricola.trim() && !!f.customerName.trim();
  const custs = sling && f.customerName.trim().length >= 2 ? [...new Set(machines.map((m) => m.customerName).filter(Boolean))].filter((c) => c.toUpperCase().includes(f.customerName.trim().toUpperCase()) && c !== f.customerName).slice(0, 5) : [];
  return (
    <div className="fixed inset-0 z-[320] bg-slate-900/50 flex items-end md:items-center justify-center md:p-4" data-section="wear-print">
      <div className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-800 text-lg">{sling ? "Di quale cliente?" : "Su quale gru?"}</h3>
            <p className="text-xs text-slate-500">Va scritta sul verbale. Non si salva negli interventi.</p>
          </div>
          <button type="button" onClick={() => setJob(null)} aria-label="Chiudi" className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        {sling ? (
          <div className="p-4 space-y-3 overflow-y-auto">
            <label className="block space-y-1">
              <span className="text-xs font-black text-slate-500">Cliente</span>
              <input className={INPUT} value={f.customerName} onChange={set("customerName")} autoFocus autoComplete="off" data-print-input="cliente" />
            </label>
            {custs.map((c) => (
              <button key={c} type="button" onClick={() => setF((o) => ({ ...o, customerName: c }))} data-print-cust={c} className="w-full text-left px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-sm font-black text-slate-800">
                {c}
              </button>
            ))}
            <label className="block space-y-1">
              <span className="text-xs font-black text-slate-500">Codice o numero della braca (facoltativo)</span>
              <input className={INPUT} value={f.matricola} onChange={set("matricola")} autoComplete="off" data-print-input="codice" />
            </label>
          </div>
        ) : (
        <div className="p-4 space-y-3 overflow-y-auto">
          <label className="block space-y-1">
            <span className="text-xs font-black text-slate-500">Numero della gru (matricola)</span>
            <input className={INPUT} value={f.matricola} onChange={set("matricola")} autoFocus autoComplete="off" data-print-input="matricola" placeholder="Es. 4100" />
          </label>
          {!picked && found.length > 0 && (
            <div className="space-y-1.5" data-print-suggest>
              <p className="text-[11px] font-black text-slate-500">È una di queste?</p>
              {found.map((m) => (
                <button key={m.id} type="button" onClick={() => pick(m)} data-print-option={getSafeMatricola(m)} className="w-full text-left px-3 py-2 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="block text-sm font-black text-slate-800">
                    {getSafeMatricola(m)} · {m.customerName}
                  </span>
                  <span className="block text-xs text-slate-500">{[m.type, m.capacity ? formatCapacity(m.capacity) : ""].filter(Boolean).join(" · ")}</span>
                </button>
              ))}
            </div>
          )}
          {picked ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-sm" data-print-picked>
              <p className="font-black text-slate-800">
                {getSafeMatricola(picked)} · {picked.customerName}
              </p>
              <p className="text-slate-600">{[picked.type, picked.capacity ? formatCapacity(picked.capacity) : ""].filter(Boolean).join(" · ")}</p>
            </div>
          ) : (
            f.matricola.trim() && (
              <>
                {!found.length && <p className="text-xs font-bold text-amber-700">Gru non trovata nell'app: scrivi cliente e portata.</p>}
                <label className="block space-y-1">
                  <span className="text-xs font-black text-slate-500">Cliente</span>
                  <input className={INPUT} value={f.customerName} onChange={set("customerName")} data-print-input="cliente" />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className="text-xs font-black text-slate-500">Portata (kg)</span>
                    <input className={INPUT} inputMode="numeric" value={f.capacity} onChange={set("capacity")} data-print-input="portata" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-black text-slate-500">Tipo (facoltativo)</span>
                    <input className={INPUT} value={f.type} onChange={set("type")} data-print-input="tipo" placeholder="Monotrave…" />
                  </label>
                </div>
              </>
            )
          )}
        </div>
        )}
        <div className="p-4 border-t border-slate-200 space-y-2">
          <button type="button" disabled={!canPrint} onClick={() => go(true)} data-action="print-with-crane" className={`w-full h-12 rounded-xl bg-${color}-600 text-white font-black flex items-center justify-center gap-2 disabled:opacity-40`}>
            <Printer className="w-5 h-5" /> Stampa il verbale
          </button>
          <button type="button" onClick={() => go(false)} data-action="print-no-crane" className="w-full h-11 rounded-xl border border-slate-300 text-sm font-bold text-slate-600">
            {sling ? "Stampa senza cliente" : "Stampa senza gru"}
          </button>
        </div>
      </div>
    </div>
  );
};
