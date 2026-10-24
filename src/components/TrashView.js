// AREA ADMIN → Cestino: rapporti eliminati negli ultimi 30 giorni. «Recupera» li rimette com'erano.
// Si leggono solo quando apri questa pagina (al massimo 100).
import React, { useEffect, useState } from "react";
import { Trash2, RotateCcw, Loader2, CheckCircle2 } from "lucide-react";
import { listTrash, restoreLog, purgeLog, daysLeft, TRASH_DAYS } from "../trash";

const when = (r) => {
  const t = r.deletedAt && r.deletedAt.seconds ? r.deletedAt.seconds * 1000 : Number(r.deletedAtMs) || 0;
  return t ? new Date(t).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
};

export const TrashView = ({ color = "blue" }) => {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState("");
  const [ask, setAsk] = useState(null); // id da eliminare per sempre
  const [msg, setMsg] = useState("");

  const load = () =>
    listTrash()
      .then(setRows)
      .catch(() => {
        setRows([]);
        setMsg("Non riesco a leggere il cestino adesso (rete?).");
      });
  useEffect(() => {
    load();
  }, []);

  const restore = async (r) => {
    setBusy(r.id);
    try {
      await restoreLog(r);
      setRows((x) => x.filter((y) => y.id !== r.id));
      setMsg(`Recuperato: ${r.customer || ""} · gru ${r.machineId || ""} del ${r.dateString || ""}. È di nuovo nello Storico.`);
    } catch (e) {
      setMsg("Non sono riuscito a recuperarlo. Riprova.");
    }
    setBusy("");
  };
  const purge = async (id) => {
    setBusy(id);
    try {
      await purgeLog(id);
      setRows((x) => x.filter((y) => y.id !== id));
    } catch (e) {
      setMsg("Non sono riuscito a eliminarlo.");
    }
    setAsk(null);
    setBusy("");
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 md:p-6 space-y-3" data-section="trash">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
          <Trash2 className="w-5 h-5" />
        </span>
        <div>
          <h4 className="font-black text-slate-800">Cestino</h4>
          <p className="text-sm text-slate-500">I rapporti eliminati restano qui {TRASH_DAYS} giorni, con le foto. «Recupera» li rimette nello Storico com'erano; dopo {TRASH_DAYS} giorni si cancellano da soli.</p>
        </div>
      </div>
      {msg && <p className="text-sm font-bold text-emerald-700 bg-emerald-50 rounded-xl p-3" data-trash-msg>{msg}</p>}
      {rows == null ? (
        <p className="text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carico il cestino…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm font-bold text-slate-500 flex items-center gap-2" data-trash-empty><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Il cestino è vuoto.</p>
      ) : (
        <div className="space-y-2" data-trash-list>
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 p-3" data-trash-row={r.id}>
              <div className="flex justify-between gap-2">
                <p className="font-black text-slate-800 truncate">{r.customer || "—"}</p>
                <span className="text-xs font-bold text-slate-500 shrink-0">{r.dateString}</span>
              </div>
              <p className="text-sm text-slate-600">Gru {r.machineId}{r.ticketNumber ? ` · N. ${r.ticketNumber}` : ""}{r.technician ? ` · ${r.technician}` : ""}</p>
              {r.description && <p className="text-sm text-slate-500 line-clamp-2 mt-0.5">{r.description}</p>}
              <p className="text-xs text-slate-400 mt-1">
                Eliminato {when(r)}{r.deletedBy ? ` da ${r.deletedBy}` : ""} · si cancella tra {daysLeft(r)} {daysLeft(r) === 1 ? "giorno" : "giorni"}
              </p>
              <div className="flex gap-2 mt-2">
                <button type="button" disabled={!!busy} onClick={() => restore(r)} data-action="trash-restore" className={`flex-1 h-11 rounded-xl bg-${color}-600 text-white font-bold text-sm flex items-center justify-center gap-1.5 disabled:opacity-60`}>
                  {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Recupera
                </button>
                {ask === r.id ? (
                  <button type="button" disabled={!!busy} onClick={() => purge(r.id)} className="h-11 px-3 rounded-xl bg-red-600 text-white font-bold text-sm">
                    Sicuro? Per sempre
                  </button>
                ) : (
                  <button type="button" disabled={!!busy} onClick={() => setAsk(r.id)} aria-label="Elimina per sempre" className="h-11 px-3 rounded-xl border border-red-200 text-red-700 font-bold text-sm flex items-center gap-1">
                    <Trash2 className="w-4 h-4" /> Per sempre
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
