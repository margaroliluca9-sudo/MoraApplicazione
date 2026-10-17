import React, { useState } from "react";
import {
  User,
  Lock,
  AlertTriangle,
} from "lucide-react";

import { CraneMark } from "./CraneMark";
import { isAdminPassword, isStaffPassword } from "../passwords";

// --- SCHERMATA LOGIN GLOBALE ---
export const GlobalLoginScreen = ({ technicians, onUnlock, color = "blue" }) => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    const cleanName = name.trim();

    if (!cleanName || !password) {
      setError("Inserisci il tuo Nome e la Password aziendale.");
      return;
    }

    if (isAdminPassword(password)) {
      onUnlock(cleanName);
      return;
    }

    if (isStaffPassword(password)) {
      const matchedTech = technicians.find(
        (t) => t.name.toLowerCase() === cleanName.toLowerCase()
      );

      if (matchedTech) {
        onUnlock(matchedTech.name);
      } else {
        setError(
          "Nome non autorizzato. Chiedi all'amministratore di aggiungerti all'elenco dello Staff."
        );
      }
      return;
    }

    setError("Password errata.");
  };

  return (
    <div className="mora-app min-h-screen bg-slate-100 flex items-center justify-center p-4 animate-in fade-in duration-700">
      <div
        className={`max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl border-t-4 border-${color}-600`}
      >
        <div className="text-center mb-8">
          <div
            className={`w-20 h-20 bg-${color}-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-${color}-500/30`}
          >
            <CraneMark className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
            Accesso Privato
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-2">
            Area riservata al personale autorizzato.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Il tuo Nome (o Nome Tecnico)
            </label>
            <div className="relative">
              <input
                type="text"
                className={`w-full p-4 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-${color}-500 transition-all`}
                placeholder="Es. Mario Rossi"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
              />
              <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Password Aziendale
            </label>
            <div className="relative">
              <input
                type="password"
                className={`w-full p-4 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-${color}-500 transition-all`}
                placeholder="••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
              />
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-200 text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-4 bg-${color}-700 text-white rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-${color}-800 active:scale-95 transition-all mt-4`}
          >
            Entra
          </button>
        </form>
      </div>
    </div>
  );
};
