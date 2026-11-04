// FUNE E CATENA: i verbali stampati (gli ultimi 20, di tutti): tocca per ristamparlo; l'admin li può cancellare.
import React, { useEffect, useState } from "react";
import { Printer, Trash2 } from "lucide-react";
import { doPrintWear } from "../../WearPrintHost";
import { listWearReports, deleteWearReport } from "../../../wearReports";

// VERBALI STAMPATI (gli ultimi 20, di tutti): tocca per ristamparlo
export const PrintedReports = ({ isAdmin = false }) => {
  const [list, setList] = useState(null);
  const [ask, setAsk] = useState(null);
  const del = (id) => {
    if (ask !== id) return setAsk(id);
    setAsk(null);
    setList((l) => (l || []).filter((x) => x.id !== id));
    deleteWearReport(id).catch(() => window.dispatchEvent(new CustomEvent("mora-wear-saved")));
  };
  useEffect(() => {
    let alive = true;
    const load = () =>
      listWearReports()
        .then((l) => alive && setList(l))
        .catch(() => alive && setList([]));
    load();
    window.addEventListener("mora-wear-saved", load);
    return () => {
      alive = false;
      window.removeEventListener("mora-wear-saved", load);
    };
  }, []);
  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-2" data-section="wear-printed">
      <h4 className="font-black text-slate-800 flex items-center gap-2">
        <Printer className="w-4 h-4 text-slate-500" /> Verbali stampati
      </h4>
      {list === null && <p className="text-xs text-slate-400">Carico…</p>}
      {list && !list.length && <p className="text-xs text-slate-400" data-wear-printed-none>Ancora nessuno: compaiono qui quando stampi un verbale.</p>}
      {(list || []).map((v) => (
        <div key={v.id} className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => doPrintWear({ rep: v.rep, crane: v.crane, day: v.day, tech: v.tech, again: true })}
          data-wear-printed={v.id}
          className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3"
        >
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${v.level === "scarto" ? "bg-red-500" : v.level === "attenzione" ? "bg-amber-500" : "bg-emerald-500"}`} />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-black text-slate-800 truncate">
              {v.type === "fune" ? "Fune" : v.type === "fascia" ? "Fascia" : "Catena"} · {v.crane ? `${v.crane.customerName} · ${v.crane.matricola}` : "senza gru"}
            </span>
            <span className="block text-xs text-slate-500 truncate">
              {v.day}
              {v.tech ? ` · ${v.tech}` : ""} · {v.esito}
            </span>
          </span>
          <Printer className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
        {isAdmin && (
          <button type="button" onClick={() => del(v.id)} data-action={`wear-printed-del-${v.id}`} aria-label="Cancella il verbale" className={`shrink-0 rounded-xl px-3 text-xs font-black border ${ask === v.id ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-200"}`}>
            {ask === v.id ? "Sicuro?" : <Trash2 className="w-4 h-4" />}
          </button>
        )}
        </div>
      ))}
    </section>
  );
};
