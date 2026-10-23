// IN ALTO A DESTRA: chi è collegato su questo telefono e «Esci» (per tutti: tecnici, ufficio, admin).
// Uscendo si torna alla schermata d'accesso; i dati restano salvati.
import React, { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";

export const UserMenu = ({ name, role = "Tecnico", color = "blue", onLogout }) => {
  const [open, setOpen] = useState(false);
  const [ask, setAsk] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const out = (e) => {
      if (box.current && !box.current.contains(e.target)) {
        setOpen(false);
        setAsk(false);
      }
    };
    document.addEventListener("pointerdown", out);
    return () => document.removeEventListener("pointerdown", out);
  }, [open]);
  if (!name) return null;
  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        data-action="user-menu"
        aria-label={`${name}: menu utente`}
        onClick={() => setOpen(!open)}
        className={`w-9 h-9 min-[401px]:w-10 min-[401px]:h-10 rounded-full bg-${color}-600 text-white font-black flex items-center justify-center shadow-sm`}
      >
        {String(name).charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 z-[120] space-y-2" data-section="user-menu">
          <div className="px-1">
            <p className="font-black text-slate-800 leading-tight truncate">{name}</p>
            <p className="text-xs font-bold text-slate-500">{role} · collegato su questo dispositivo</p>
          </div>
          {!ask ? (
            <button type="button" data-action="logout" onClick={() => setAsk(true)}
              className="w-full h-11 rounded-xl border border-red-200 bg-red-50 text-red-700 font-black text-sm flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" /> Esci
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-700 px-1">Esci da questo dispositivo? Per rientrare servono di nuovo nome e password.</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { setAsk(false); setOpen(false); }} className="h-11 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm">Annulla</button>
                <button type="button" data-action="logout-confirm" onClick={() => { setOpen(false); setAsk(false); onLogout(); }} className="h-11 rounded-xl bg-red-600 text-white font-black text-sm">Esci</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
