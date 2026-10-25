// AREA ADMIN → Clienti → «Importa paesi»: carichi un file Excel (.xlsx) o CSV con le colonne
// CLIENTE (o RAGIONE SOCIALE), PAESE e/o INDIRIZZO. L'app abbina i nomi ai clienti che ci sono già
// e mostra l'elenco: spunti quelli da salvare e tocchi «Salva». Niente viene scritto prima.
import React, { useMemo, useState } from "react";
import { doc } from "firebase/firestore";
import { writeBatch } from "../../tracked";
import { X, Upload, Loader2, MapPin, Check } from "lucide-react";
import { db, appId } from "../../firebase";
import { readSpreadsheet } from "../../xlsxRead";
import { rowsToPlaces, matchPlaces } from "../../places";
import { describeError } from "../../utils";

export const ImportPlacesModal = ({ customers = [], onClose, color = "blue" }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null); // { found, missing }
  const [checks, setChecks] = useState({});
  const [done, setDone] = useState(0);

  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr("");
    setRes(null);
    setDone(0);
    try {
      const rows = await readSpreadsheet(file);
      const places = rowsToPlaces(rows);
      if (!places) throw new Error("Nel file mancano le colonne: serve CLIENTE (o RAGIONE SOCIALE) e PAESE o INDIRIZZO nella prima riga.");
      const r = matchPlaces(places, customers);
      setRes(r);
      const c = {};
      r.found.forEach((f) => {
        c[f.customer.id] = f.checked;
      });
      setChecks(c);
    } catch (ex) {
      console.error(ex);
      setErr(ex && ex.message ? ex.message : "Non riesco a leggere il file.");
    } finally {
      setBusy(false);
    }
  };

  const chosen = useMemo(() => (res ? res.found.filter((f) => checks[f.customer.id]) : []), [res, checks]);

  const save = async () => {
    if (!chosen.length) return;
    setBusy(true);
    setErr("");
    try {
      for (let i = 0; i < chosen.length; i += 400) {
        const batch = writeBatch(db);
        chosen.slice(i, i + 400).forEach((f) => {
          batch.update(doc(db, "artifacts", appId, "public", "data", "customers", f.customer.id), { city: f.city, address: f.address, placeSource: "file" });
        });
        await batch.commit();
      }
      setDone(chosen.length);
      setRes(null);
    } catch (ex) {
      console.error(ex);
      setErr("Salvataggio non riuscito: " + describeError(ex));
    } finally {
      setBusy(false);
    }
  };

  const all = (v) => {
    const c = {};
    (res ? res.found : []).forEach((f) => {
      c[f.customer.id] = v && !f.same;
    });
    setChecks(c);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[200] flex items-center justify-center p-4 backdrop-blur-md" data-section="import-places">
      <div className="w-full max-w-2xl max-h-[88vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl bg-white">
        <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
              <MapPin className={`w-5 h-5 text-${color}-600`} /> Importa paesi e indirizzi
            </h3>
            <p className="text-sm text-slate-500 leading-snug">
              Un file Excel o CSV con le colonne <b>CLIENTE</b> (o RAGIONE SOCIALE), <b>PAESE</b> e <b>INDIRIZZO</b>. Prima di salvare vedi l'elenco e scegli tu.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="p-2 rounded-full hover:bg-slate-100 text-slate-500 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <label className={`inline-flex h-11 px-5 rounded-full bg-${color}-600 text-white font-bold text-sm items-center gap-2 cursor-pointer`}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Scegli il file
            <input type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={pick} data-import-file disabled={busy} />
          </label>
          {err && <p className="text-sm font-semibold text-red-600" data-import-error>{err}</p>}
          {done > 0 && (
            <p className="text-sm font-bold text-emerald-700 flex items-center gap-2" data-import-done>
              <Check className="w-4 h-4" /> Salvati {done} {done === 1 ? "cliente" : "clienti"}.
            </p>
          )}

          {res && (
            <div className="space-y-3" data-import-result>
              <p className="text-sm text-slate-700">
                Trovati <b>{res.found.length}</b> clienti dell'app nel file · <b>{res.missing.length}</b> righe senza un cliente corrispondente (non toccate).
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => all(true)} className="h-9 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">Seleziona tutti</button>
                <button type="button" onClick={() => all(false)} className="h-9 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">Nessuno</button>
              </div>
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-2xl">
                {res.found.map((f) => (
                  <li key={f.customer.id} className="p-3 flex items-start gap-3" data-import-row>
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 shrink-0"
                      checked={!!checks[f.customer.id]}
                      disabled={f.same}
                      onChange={(e) => setChecks((p) => ({ ...p, [f.customer.id]: e.target.checked }))}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-sm text-slate-800">
                        {f.customer.name}
                        {f.how === "simile" && <span className="ml-2 text-[11px] font-bold text-amber-700">nel file: {f.fileName}</span>}
                      </span>
                      <span className="block text-sm text-slate-600">{[f.city, f.address].filter(Boolean).join(" · ")}</span>
                      {f.same ? (
                        <span className="block text-xs text-slate-400">già così</span>
                      ) : (f.customer.city || f.customer.address) ? (
                        <span className="block text-xs text-amber-700">ora: {[f.customer.city, f.customer.address].filter(Boolean).join(" · ")}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              {res.missing.length > 0 && (
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer font-bold">Righe del file senza cliente nell'app ({res.missing.length})</summary>
                  <p className="mt-2 leading-relaxed">{res.missing.map((m) => m.names[0]).join(", ")}</p>
                </details>
              )}
            </div>
          )}
        </div>

        {res && (
          <div className="p-4 border-t border-slate-200 flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 h-12 rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
              Annulla
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy || !chosen.length}
              data-action="import-save"
              className={`flex-1 h-12 rounded-full bg-${color}-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salva {chosen.length} {chosen.length === 1 ? "cliente" : "clienti"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
