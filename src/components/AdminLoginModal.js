import React, { useState } from "react";
import { Lock } from "lucide-react";
import { isAdminPassword } from "../passwords";
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
  const handleLogin = () => {
    if (isAdminPassword(pin)) onSuccess();
    else {
      setError(true);
      setPin("");
    }
  };
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
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
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
        <div className="flex flex-col gap-3">
          <button
            onClick={handleLogin}
            className={`w-full py-3 rounded-lg font-bold text-xs uppercase transition-transform active:scale-95 ${getButtonPrimaryClass(
              "slate"
            )}`}
          >
            Accedi
          </button>
          <button
            onClick={onCancel}
            className={`w-full py-3 rounded-lg font-bold text-xs uppercase active:scale-95 ${PRO_BUTTON_SECONDARY}`}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
