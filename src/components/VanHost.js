// Riquadro dopo "Salva" del rapporto: pezzi tolti in automatico dal furgone, con "Correggi".
// Compare solo a chi ha un furgone e solo se nella descrizione ha trovato dei pezzi.
import React, { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, Info } from "lucide-react";
import { itemsOf, num, fmtQty, applyCorrections } from "../van";
import { describeError } from "../utils";
import { PrimaryBtn, GhostBtn, INPUT } from "./personal/PersonalUi";

export const showVanUsage = (detail) => window.dispatchEvent(new CustomEvent("mora-van-used", { detail }));

const SECONDS = 6;

export const VanHost = ({ vanItems = [], color = "blue" }) => {
  const [data, setData] = useState(null);
  const [fix, setFix] = useState(null); // righe in correzione
  const [left, setLeft] = useState(SECONDS);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    const on = (e) => {
      setData(e.detail);
      setFix(null);
      setError("");
      setLeft(SECONDS);
    };
    window.addEventListener("mora-van-used", on);
    return () => window.removeEventListener("mora-van-used", on);
  }, []);
  // si chiude da solo (se non sto correggendo)
  useEffect(() => {
    clearTimeout(timer.current);
    if (!data || fix) return undefined;
    if (left <= 0) {
      setData(null);
      return undefined;
    }
    timer.current = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(timer.current);
  }, [data, fix, left]);

  if (!data) return null;
  const live = (id) => vanItems.find((i) => i.id === id);
  const close = () => setData(null);
  const startFix = () =>
    setFix(data.used.map((u) => ({ item: u.item, before: u.qty, after: u.qty, unknown: u.unknown })));
  const setAfter = (i, v) => setFix(fix.map((r, j) => (j === i ? { ...r, after: Math.max(0, v) } : r)));
  const candidates = itemsOf(vanItems, data.van.id).filter((i) => !(fix || []).some((r) => r.item.id === i.id));
  const saveFix = async () => {
    setBusy(true);
    try {
      await applyCorrections(fix, { author: data.author, logId: data.logId, note: data.note });
      setData(null);
    } catch (e) {
      setError("Correzione non salvata: " + describeError(e));
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[400] bg-slate-900/40 flex items-end md:items-center justify-center" data-section="van-used">
      <div className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl shadow-2xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Check className="w-5 h-5" />
          </span>
          <h4 className="font-black text-slate-800 text-lg">Rapporto salvato</h4>
        </div>
        <p className="text-xs font-black text-slate-500 uppercase tracking-wide">
          {fix ? "Correggi i pezzi usati" : "Tolti in automatico dal " + data.van.name}
        </p>

        {!fix && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            {data.used.map((u) => {
              const it = live(u.item.id) || u.item;
              return (
                <div key={u.item.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-100 last:border-0" data-used={u.item.id}>
                  <span className={`w-12 h-8 rounded-lg font-black text-sm flex items-center justify-center shrink-0 ${u.unknown ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                    {u.unknown ? "?" : "−" + fmtQty(u.qty)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-slate-800 truncate">{u.item.name}</span>
                    <span className={`block text-xs font-bold ${u.unknown ? "text-amber-700" : num(it.min) > 0 && num(it.qty) < num(it.min) ? "text-red-700" : "text-slate-500"}`}>
                      {u.unknown
                        ? `Quanti ${u.item.unit === "m" ? "metri" : "pezzi"}? Non scritto: tocca Correggi`
                        : `Rimasti ${fmtQty(it.qty)} ${it.unit || "pz"}${num(it.min) > 0 && num(it.qty) < num(it.min) ? " · da riordinare" : ""}`}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {fix && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            {fix.map((r, i) => (
              <div key={r.item.id} className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 last:border-0">
                <span className="flex-1 min-w-0 font-bold text-slate-800 text-sm break-words">
                  {r.item.name} <span className="text-slate-500 font-semibold">({r.item.unit || "pz"})</span>
                </span>
                <button type="button" aria-label={"Uno in meno: " + r.item.name} onClick={() => setAfter(i, num(r.after) - 1)} className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center shrink-0">
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  aria-label={"Usati: " + r.item.name}
                  value={r.after}
                  onChange={(e) => setFix(fix.map((x, j) => (j === i ? { ...x, after: e.target.value } : x)))}
                  className="w-14 h-10 text-center font-black text-lg border border-slate-200 rounded-lg bg-slate-50"
                />
                <button type="button" aria-label={"Uno in più: " + r.item.name} onClick={() => setAfter(i, num(r.after) + 1)} className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ))}
            {candidates.length > 0 && (
              <div className="flex gap-2 p-3 bg-slate-50">
                <select className={INPUT} value={pick} aria-label="Aggiungi un altro pezzo" onChange={(e) => setPick(e.target.value)}>
                  <option value="">Aggiungi un altro pezzo…</option>
                  {candidates.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
                <button
                  type="button"
                  disabled={!pick}
                  onClick={() => {
                    const it = candidates.find((c) => c.id === pick);
                    if (it) setFix([...fix, { item: it, before: 0, after: 1 }]);
                    setPick("");
                  }}
                  className="px-4 rounded-xl bg-slate-800 text-white font-bold text-sm disabled:opacity-40"
                >
                  Aggiungi
                </button>
              </div>
            )}
          </div>
        )}

        {!fix && data.ditta && (
          <p className="flex gap-2 text-sm text-slate-600 font-semibold">
            <Info className="w-4 h-4 shrink-0 mt-0.5" /> {data.ditta}: presa in ditta, non scalata dal furgone.
          </p>
        )}
        {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        <div className="flex gap-3 pt-1">
          {fix ? (
            <>
              <GhostBtn onClick={() => setFix(null)}>Annulla</GhostBtn>
              <PrimaryBtn color={color} disabled={busy} onClick={saveFix} data-action="save-fix">Salva correzione</PrimaryBtn>
            </>
          ) : (
            <>
              <GhostBtn className="flex-1" onClick={startFix} data-action="fix">Correggi</GhostBtn>
              <PrimaryBtn color={color} onClick={close} data-action="ok">Ok</PrimaryBtn>
            </>
          )}
        </div>
        {!fix && <p className="text-xs text-slate-500 text-center font-semibold">Si chiude da solo tra {left} secondi</p>}
      </div>
    </div>
  );
};
