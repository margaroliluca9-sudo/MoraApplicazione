// STORICO → «Completa i dati della fune / catena»: quando al momento del rapporto mancavano i dati
// (certificato non ancora arrivato) o il tipo di fune, si possono aggiungere dopo da chiunque,
// anche senza password admin e dopo i 3 minuti. Si salvano solo i dati della fune/catena del rapporto.
import React, { useState } from "react";
import { doc } from "firebase/firestore";
import { X, Check, Loader2 } from "lucide-react";
import { db, appId } from "../../firebase";
import { updateDoc } from "../../tracked";
import { RopeFields } from "../RopeFields";
import { fromSavedRope, toSavedRope, validateRopes, ROPE_ITEMS } from "../../ropes";
import { describeError } from "../../utils";

// mancano dati? (non disponibili al momento, o fune senza tipo, o campi vuoti)
export const ropeIncomplete = (saved, id) =>
  !!saved && (!!saved.nonDisponibile || !saved.certificato || !saved.diametro || !saved.lunghezza || (id === "fune" && !saved.fas && !saved.costruzione));

export const CompleteRopeModal = ({ log, id, onClose, color = "blue" }) => {
  const item = ROPE_ITEMS.find((r) => r.id === id) || ROPE_ITEMS[0];
  const [ropes, setRopes] = useState(() => ({ [id]: { ...fromSavedRope(log[id]), nonDisponibile: false, motivo: "" } }));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const r = ropes[id];
    if (!r || !r.on) return onClose();
    const e = validateRopes({ [id]: r });
    if (e) return setErr(e);
    setBusy(true);
    setErr("");
    try {
      await updateDoc(doc(db, "artifacts", appId, "public", "data", "maintenance_logs", log.id), { [id]: toSavedRope(r) });
      onClose(true);
    } catch (x) {
      setErr("Non salvato: " + describeError(x));
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/50 flex items-end md:items-center justify-center md:p-4" data-section="complete-rope">
      <div className="w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-800 text-lg">Dati della {item.label}</h3>
            <p className="text-xs text-slate-500 truncate">
              {log.customer} · {log.machineId} · {log.dateString}
            </p>
          </div>
          <button type="button" onClick={() => onClose()} aria-label="Chiudi" className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-3">
          <RopeFields ropes={ropes} onChange={setRopes} />
          {err && <p className="text-sm font-bold text-red-700">{err}</p>}
        </div>
        <div className="p-4 border-t border-slate-200">
          <button type="button" onClick={save} disabled={busy} data-action="complete-rope-save" className={`w-full h-12 rounded-xl bg-${color}-600 text-white font-black flex items-center justify-center gap-2 disabled:opacity-50`}>
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} Salva i dati
          </button>
        </div>
      </div>
    </div>
  );
};
