// AREA ADMIN → System: «Schermo TV» (interventi di oggi e tecnici online a tutto schermo, per la TV dell'ufficio).
// Sul computer collegato alla TV si può aprire direttamente l'indirizzo con ?tv=1.
import React from "react";
import { Tv } from "lucide-react";

export const TvCard = ({ color = "blue", onOpen }) => {
  let link = "";
  try {
    link = window.location.origin + "/?tv=1";
  } catch (e) {
    link = "";
  }
  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 mb-6" data-section="tv-card">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-slate-100 text-slate-700">
          <Tv className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h5 className="font-black text-slate-800">Schermo TV</h5>
          <p className="text-sm text-slate-500 leading-snug">
            Interventi di oggi, tecnici online e numeri del mese a tutto schermo, per la TV dell'ufficio. Sul computer della TV puoi anche aprire direttamente{" "}
            <b className="text-slate-700 break-all">{link.replace(/^https?:\/\//, "")}</b>
          </p>
        </div>
      </div>
      <button type="button" onClick={onOpen} data-action="open-tv" className={`h-11 px-5 rounded-full bg-${color}-600 text-white font-bold text-sm flex items-center gap-2`}>
        <Tv className="w-4 h-4" /> Apri lo schermo TV
      </button>
    </div>
  );
};
