// AREA ADMIN → System: accesso con impronta / Face ID su QUESTO telefono (attiva o disattiva).
import React, { useEffect, useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { bioAvailable, bioEnabled, enableBio, disableBio } from "../biometric";

export const BioCard = ({ color = "blue" }) => {
  const [can, setCan] = useState(null);
  const [on, setOn] = useState(bioEnabled);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    bioAvailable().then(setCan);
  }, []);
  if (can === null) return null;
  const turnOn = async () => {
    setBusy(true);
    setMsg("");
    try {
      await enableBio();
      setOn(true);
    } catch (e) {
      setMsg("Non attivata (annullata o non disponibile).");
    }
    setBusy(false);
  };
  return (
    <div className="mb-6 p-4 rounded-2xl border border-slate-200 bg-white flex items-start gap-3" data-section="bio-card">
      <span className={`w-10 h-10 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
        <Fingerprint className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-black text-slate-800">Entra con l'impronta / Face ID</p>
        <p className="text-xs text-slate-500">
          {!can
            ? "Questo telefono (o browser) non ha l'impronta o Face ID utilizzabili: si entra con la password."
            : on
            ? "Attivo su questo telefono: per entrare in Admin basta l'impronta. La password resta valida."
            : "Su questo telefono puoi entrare in Admin con l'impronta invece della password."}
        </p>
        {msg && <p className="text-xs font-bold text-amber-700 mt-1">{msg}</p>}
        {can && (
          <button
            type="button"
            disabled={busy}
            onClick={() => (on ? (disableBio(), setOn(false)) : turnOn())}
            data-action={on ? "bio-off" : "bio-on"}
            className={`mt-2 h-10 px-4 rounded-xl text-sm font-bold flex items-center gap-2 ${on ? "border border-slate-200 text-slate-700" : `bg-${color}-600 text-white`}`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} {on ? "Disattiva su questo telefono" : "Attiva su questo telefono"}
          </button>
        )}
      </div>
    </div>
  );
};
