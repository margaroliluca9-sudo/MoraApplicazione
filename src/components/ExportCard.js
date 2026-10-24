// AREA ADMIN → System: «Esporta tutto in Excel». Un tocco prepara il file (interventi, clienti, gru),
// poi «Scarica» o «Condividi» (WhatsApp, mail…). Il file si apre con Excel, Numbers o Google Fogli.
import React, { useEffect, useState } from "react";
import { FileSpreadsheet, Loader2, Download, Share2 } from "lucide-react";
import { buildExport, exportFileName } from "../exportAll";
import { XLSX_TYPE } from "../xlsx";

export const ExportCard = ({ color = "blue", customers = [], machines = [] }) => {
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(null); // { url, file, name, counts }
  const [err, setErr] = useState("");

  useEffect(() => () => ready && URL.revokeObjectURL(ready.url), [ready]);

  const make = async () => {
    setBusy(true);
    setErr("");
    try {
      const { bytes, counts } = await buildExport({ customers, machines });
      const name = exportFileName();
      const blob = new Blob([bytes], { type: XLSX_TYPE });
      let file = null;
      try {
        file = new File([blob], name, { type: XLSX_TYPE });
      } catch (e) {
        file = null;
      }
      setReady({ url: URL.createObjectURL(blob), file, name, counts });
    } catch (e) {
      console.error(e);
      setErr("Non sono riuscito a preparare il file. Riprova con la rete.");
    } finally {
      setBusy(false);
    }
  };

  const canShare = !!(ready && ready.file && navigator.canShare && navigator.canShare({ files: [ready.file] }));
  const share = async () => {
    try {
      await navigator.share({ files: [ready.file], title: ready.name });
    } catch (e) {
      // annullato
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 mb-6" data-section="export-card">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-700">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h5 className="font-black text-slate-800">Esporta tutto in Excel</h5>
          <p className="text-sm text-slate-500 leading-snug">
            Un file con tre fogli: tutti gli interventi, i clienti e le gru (con interventi, riparazioni e ultimo intervento). Si apre con Excel, Numbers o Google Fogli.
          </p>
        </div>
      </div>
      {ready ? (
        <div className="space-y-2" data-export-ready>
          <p className="text-sm text-slate-700" data-export-counts>
            Pronto: <b>{ready.counts.logs}</b> interventi · <b>{ready.counts.customers}</b> clienti · <b>{ready.counts.cranes}</b> gru
          </p>
          <div className="flex flex-wrap gap-2">
            <a href={ready.url} download={ready.name} data-action="export-download" className={`h-11 px-5 rounded-full bg-${color}-600 text-white font-bold text-sm flex items-center gap-2`}>
              <Download className="w-4 h-4" /> Scarica
            </a>
            {canShare && (
              <button type="button" onClick={share} data-action="export-share" className="h-11 px-4 rounded-full bg-slate-100 text-slate-700 font-bold text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4" /> Condividi
              </button>
            )}
            <button type="button" onClick={make} disabled={busy} className="h-11 px-4 rounded-full bg-slate-100 text-slate-700 font-bold text-sm flex items-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Rifai
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={make} disabled={busy} data-action="export-make" className={`h-11 px-5 rounded-full bg-${color}-600 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} {busy ? "Preparo il file…" : "Prepara il file Excel"}
        </button>
      )}
      {err && <p className="text-sm font-semibold text-red-600">{err}</p>}
    </div>
  );
};
