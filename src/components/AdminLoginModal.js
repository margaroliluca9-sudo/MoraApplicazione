import React, { useEffect, useRef, useState } from "react";
import { Lock, Fingerprint, Loader2 } from "lucide-react";
import { isAdminPassword } from "../passwords";
import { bioAvailable, bioEnabled, bioDeclined, declineBio, enableBio, checkBio } from "../biometric";
import {
  PRO_INPUT,
  PRO_BUTTON_SECONDARY,
  getButtonPrimaryClass,
  getProPanelClass,
} from "../ui";

export const AdminLoginModal = ({
  onSuccess,
  onCancel,
  title = "Admin",
  color = "blue",
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [canBio, setCanBio] = useState(false); // il telefono ha impronta / Face ID
  const [offer, setOffer] = useState(false); // dopo la password: «attivo l'impronta?»
  const [bioBusy, setBioBusy] = useState(false);
  const [bioMsg, setBioMsg] = useState("");
  const asked = useRef(false);
  const enabled = bioEnabled();

  const tryBio = async () => {
    setBioBusy(true);
    setBioMsg("");
    const ok = await checkBio();
    setBioBusy(false);
    if (ok) onSuccess();
    else setBioMsg("Impronta non riconosciuta: scrivi la password.");
  };
  const tryRef = useRef(tryBio);
  tryRef.current = tryBio;
  useEffect(() => {
    bioAvailable().then((ok) => {
      setCanBio(ok);
      // impronta già attiva: la chiedo subito (come le app della banca)
      if (ok && enabled && !asked.current) {
        asked.current = true;
        tryRef.current();
      }
    });
  }, [enabled]);

  const handleLogin = () => {
    if (isAdminPassword(pin)) {
      // password giusta: se il telefono ha l'impronta e non è attiva, propongo di attivarla
      if (canBio && !enabled && !bioDeclined()) setOffer(true);
      else onSuccess();
    } else {
      setError(true);
      setPin("");
    }
  };
  const activate = async () => {
    setBioBusy(true);
    try {
      await enableBio();
      onSuccess();
    } catch (e) {
      setBioBusy(false);
      setBioMsg("Non attivata (annullata o non disponibile). Puoi riprovare la prossima volta.");
      setTimeout(onSuccess, 1500);
    }
  };

  if (offer)
    return (
      <div className="fixed inset-0 bg-slate-900/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm" data-section="bio-offer">
        <div className={`shadow-2xl max-w-xs w-full p-6 space-y-4 text-center ${getProPanelClass(color)}`}>
          <div className={`w-16 h-16 rounded-2xl bg-${color}-50 text-${color}-600 flex items-center justify-center mx-auto`}>
            <Fingerprint className="w-9 h-9" />
          </div>
          <h3 className="text-lg font-black text-slate-800">Entrare con l'impronta?</h3>
          <p className="text-sm text-slate-600">Su questo telefono, la prossima volta basta l'impronta o Face ID invece della password. La password resta valida.</p>
          {bioMsg && <p className="text-sm font-bold text-amber-700">{bioMsg}</p>}
          <button type="button" onClick={activate} disabled={bioBusy} data-action="bio-enable" className={`w-full h-12 rounded-full bg-${color}-600 text-white font-black flex items-center justify-center gap-2 disabled:opacity-60`}>
            {bioBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />} Sì, attiva
          </button>
          <button
            type="button"
            onClick={() => {
              declineBio();
              onSuccess();
            }}
            data-action="bio-no"
            className={`w-full h-11 rounded-full font-bold text-sm ${PRO_BUTTON_SECONDARY}`}
          >
            No grazie
          </button>
        </div>
      </div>
    );
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className={`shadow-2xl max-w-xs w-full p-8 space-y-6 animate-in zoom-in-95 ${getProPanelClass(
          color
        )} border-t-slate-800`}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-300">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-800 tracking-tight">
            {title}
          </h3>
        </div>
        <input
          type="password"
          autoFocus
          className={`w-full p-4 rounded-xl text-center text-2xl font-black outline-none transition-all ${PRO_INPUT} ${
            error
              ? "border-red-500 animate-bounce ring-2 ring-red-100"
              : `focus:border-${color}-500 focus:ring-2 focus:ring-${color}-100`
          }`}
          placeholder="••••"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        {bioMsg && <p className="text-sm font-bold text-amber-700 text-center" data-bio-msg>{bioMsg}</p>}
        <div className="flex flex-col gap-3">
          {canBio && enabled && (
            <button type="button" onClick={tryBio} disabled={bioBusy} data-action="bio-login" className={`w-full h-12 rounded-lg bg-${color}-600 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60`}>
              {bioBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />} Usa l'impronta / Face ID
            </button>
          )}
          <button
            onClick={handleLogin}
            className={`w-full py-3 rounded-lg font-bold text-xs transition-transform active:scale-95 ${getButtonPrimaryClass(
              "slate"
            )}`}
          >
            Accedi
          </button>
          <button
            onClick={onCancel}
            className={`w-full py-3 rounded-lg font-bold text-xs active:scale-95 ${PRO_BUTTON_SECONDARY}`}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
