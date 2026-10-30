// VERSIONE NUOVA DELL'APP: l'iPhone (e a volte Android) tiene aperta la versione vecchia finché l'app non viene
// chiusa del tutto. Quando torni sull'app (e ogni 15 minuti) controllo se sul sito c'è una versione più nuova:
// se sì compare in basso «È uscita una versione nuova · Aggiorna». Non costa letture del database.
import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const RE = /\/static\/js\/main\.[a-z0-9]+\.js/;
export const currentBuild = () => {
  const s = [...document.querySelectorAll("script[src]")].map((x) => x.getAttribute("src")).find((u) => RE.test(u || ""));
  return s ? s.match(RE)[0] : "";
};
export const newBuildIn = (html, mine) => {
  const m = String(html || "").match(RE);
  return !!(m && mine && m[0] !== mine);
};

export const UpdateBanner = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const mine = currentBuild();
    if (!mine || typeof fetch !== "function" || !/^https?:$/.test(window.location.protocol)) return undefined;
    let last = 0;
    const check = () => {
      if (document.hidden || Date.now() - last < 60000) return;
      last = Date.now();
      fetch("/?__ver=" + Date.now(), { cache: "no-store" })
        .then((r) => (r.ok ? r.text() : ""))
        .then((html) => newBuildIn(html, mine) && setReady(true))
        .catch(() => {});
    };
    const t = setInterval(check, 15 * 60000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    check();
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);
  if (!ready) return null;
  return (
    <div className="fixed left-3 right-3 z-[700] flex justify-center pointer-events-none" style={{ bottom: "calc(84px + var(--mora-safe-bottom, 0px))" }} data-section="update-banner">
      <div className="pointer-events-auto max-w-md w-full bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3">
        <span className="flex-1 text-sm font-bold">È uscita una versione nuova dell'app</span>
        <button type="button" onClick={() => window.location.reload()} data-action="app-update" className="h-10 px-4 rounded-xl bg-white text-slate-900 font-black text-sm flex items-center gap-1.5 shrink-0">
          <RefreshCw className="w-4 h-4" /> Aggiorna
        </button>
      </div>
    </div>
  );
};
