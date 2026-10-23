import React from "react";
import { Lock } from "lucide-react";
import { PRO_INPUT, PRO_BUTTON_SECONDARY } from "../ui";

export const DeleteConfirmDialog = ({
  onConfirm,
  onCancel,
  pin,
  setPin,
  error,
  title,
  isFree,
}) => (
  <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
    <div
      className={`p-8 max-w-xs w-full text-center space-y-5 bg-white rounded-xl shadow-md border-t-4 border-t-red-600 border-x border-b border-slate-200`}
    >
      <div
        className={`p-4 rounded-full mx-auto w-fit ${
          isFree ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
        }`}
      >
        <Lock className="w-8 h-8" />
      </div>
      <h4 className="font-bold text-slate-800 text-sm">
        {title}
      </h4>
      {isFree ? (
        <p className="text-sm text-slate-600 font-medium leading-relaxed">
          Modifica recente: eliminazione consentita senza PIN.
        </p>
      ) : (
        <input
          type="password"
          placeholder="••••"
          className={`w-full p-3 rounded-xl text-center text-xl font-black outline-none transition-all ${PRO_INPUT}`}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onConfirm()}
          autoFocus
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onConfirm}
          className="py-3 bg-red-600 text-white rounded-lg font-bold text-xs shadow-md hover:bg-red-700 active:scale-95 transition-all"
        >
          Elimina
        </button>
        <button
          onClick={onCancel}
          className={`py-3 rounded-lg font-bold text-xs active:scale-95 transition-all ${PRO_BUTTON_SECONDARY}`}
        >
          Annulla
        </button>
      </div>
    </div>
  </div>
);
