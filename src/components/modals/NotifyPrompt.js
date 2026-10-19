// Dopo l'aggiornamento: una volta sola per telefono chiedo se attivare le notifiche.
// Si possono sempre cambiare da La mia area → ⚙ Impostazioni.
import React, { useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { enablePush, getPushState } from "../../chat";
import { getSettings, markAsked, markInstallTip, syncNotifyKinds } from "../../settings";
import { describeError } from "../../utils";

export const NotifyPrompt = ({ me, state = "off", color = "blue", onDone }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const close = () => {
    markAsked();
    onDone();
  };
  const yes = async () => {
    setBusy(true);
    setErr("");
    try {
      await enablePush(me); // dentro il tocco: l'iPhone lo pretende
      await syncNotifyKinds(getSettings()).catch(() => {});
      close();
    } catch (e) {
      setErr(describeError(e));
      if ((await getPushState()) === "denied") markAsked();
    }
    setBusy(false);
  };
  const install = state === "install";
  return (
    <div className="fixed inset-0 z-[190] bg-slate-900/50 backdrop-blur-sm flex items-end md:items-center justify-center p-3" data-section="notify-prompt">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className={`w-12 h-12 rounded-2xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
            <BellRing className="w-6 h-6" />
          </span>
          <div>
            <h3 className="font-black text-slate-800 text-lg leading-tight">Vuoi le notifiche?</h3>
            <p className="text-sm text-slate-600 leading-snug mt-1">
              Ti avvisiamo sul telefono quando un collega ti scrive e all'ora dei tuoi promemoria e impegni.
            </p>
          </div>
        </div>
        {install ? (
          <p className="text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl p-3">
            Sull'iPhone serve prima installare l'app: in Safari tocca Condividi → «Aggiungi alla schermata Home», poi apri l'app da lì. Te lo richiederemo allora.
          </p>
        ) : (
          <p className="text-xs text-slate-500">Dopo «Attiva» il telefono ti chiede il permesso: tocca «Consenti».</p>
        )}
        {err && <p className="text-sm font-bold text-red-600">{err}</p>}
        <div className="flex gap-3">
          <button type="button" data-action="notify-later" onClick={install ? () => { markInstallTip(); onDone(); } : close} className="h-12 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold">
            {install ? "Ho capito" : "Non ora"}
          </button>
          {!install && (
            <button type="button" data-action="notify-yes" onClick={yes} disabled={busy}
              className={`flex-1 h-12 rounded-xl bg-${color}-600 text-white font-black flex items-center justify-center gap-2 disabled:opacity-60`}>
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <BellRing className="w-5 h-5" />} Attiva
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400 text-center">Puoi cambiarlo quando vuoi da La mia area → ⚙ Impostazioni.</p>
      </div>
    </div>
  );
};
