import React, { useState, useMemo } from "react";
import { GitMerge } from "lucide-react";
import { describeError, getSafeMatricola, getLevenshteinDistance } from "../../utils";
import {
  PRO_INPUT,
  PRO_BUTTON_SECONDARY,
  getButtonPrimaryClass,
  getProPanelClass,
} from "../../ui";

export const MergeModal = ({
  sourceItem,
  allItems,
  onConfirm,
  onClose,
  type,
  defaultTargetId,
  color = "blue",
}) => {
  const [targetId, setTargetId] = useState(defaultTargetId || "");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const handleConfirm = async () => {
    if (!targetId) return;
    const targetItem = allItems.find((i) => i.id === targetId);
    if (!targetItem) return;
    setLoading(true);
    try {
      await onConfirm(sourceItem, targetItem);
    } catch (e) {
      console.error(e);
      alert(
        "Unione non completata: " +
          describeError(e) +
          " Alcuni interventi potrebbero essere già stati spostati: riprova l'unione."
      );
    } finally {
      setLoading(false);
    }
  };

  const MAX_RESULTS = 50;
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const words = (s) =>
    String(s || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3);
  const itemLabel = (i) =>
    type === "customer"
      ? String(i.name || "")
      : `${getSafeMatricola(i)} (${i.customerName || ""})`;
  const itemSearchText = (i) =>
    type === "customer"
      ? String(i.name || "")
      : `${getSafeMatricola(i)} ${i.customerName || ""} ${i.type || ""}`;

  const candidates = useMemo(
    () => allItems.filter((i) => i.id !== sourceItem.id),
    [allItems, sourceItem]
  );

  // Gli elementi più simili a quello da unire (nomi scritti in modo diverso)
  const suggestions = useMemo(() => {
    const srcKey = norm(
      type === "customer" ? sourceItem.name : getSafeMatricola(sourceItem)
    );
    const srcCust = norm(sourceItem.customerName);
    const srcWords = words(sourceItem.name);
    const scored = [];
    candidates.forEach((i) => {
      const key = norm(type === "customer" ? i.name : getSafeMatricola(i));
      const dist = getLevenshteinDistance(srcKey, key);
      const contains =
        srcKey && key && (srcKey.includes(key) || key.includes(srcKey));
      let close = false;
      let score = dist;
      if (type === "customer") {
        const shared = words(i.name).filter((w) => srcWords.includes(w)).length;
        close =
          contains ||
          shared > 0 ||
          dist <= Math.max(2, Math.floor(Math.max(srcKey.length, key.length) / 4));
        score = dist - shared * 3;
      } else {
        const sameCust = norm(i.customerName) === srcCust;
        close = sameCust ? contains || dist <= 3 : dist <= 1;
        score = dist + (sameCust ? 0 : 100);
      }
      if (close) scored.push({ item: i, score });
    });
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 5).map((s) => s.item);
  }, [candidates, sourceItem, type]);

  const searchTokens = search.trim().split(/\s+/).map(norm).filter(Boolean);
  const isSearching = searchTokens.length > 0;
  const suggestionIds = new Set(suggestions.map((s) => s.id));

  const listItems = candidates
    .filter((i) => {
      if (isSearching) {
        const hay = norm(itemSearchText(i));
        return searchTokens.every((t) => hay.includes(t));
      }
      return !suggestionIds.has(i.id);
    })
    .sort((a, b) => itemLabel(a).localeCompare(itemLabel(b)));
  const shownItems = listItems.slice(0, MAX_RESULTS);
  const selectedItem = candidates.find((i) => i.id === targetId);

  const renderOption = (i) => (
    <button
      type="button"
      key={i.id}
      onClick={() => setTargetId(i.id)}
      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
        targetId === i.id
          ? "bg-purple-600 text-white border-purple-600"
          : "bg-white text-slate-700 border-slate-200 hover:border-purple-300 hover:bg-purple-50"
      }`}
    >
      {itemLabel(i)}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[220] flex items-center justify-center p-4 backdrop-blur-md">
      <div
        className={`rounded-3xl shadow-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto p-6 space-y-4 ${getProPanelClass(
          color
        )} border-t-purple-600`}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <GitMerge className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">
            Unisci {type === "customer" ? "Cliente" : "Gru"}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Stai per unire{" "}
            <b className="text-red-500">
              {sourceItem.name || sourceItem.matricola || sourceItem.id}
            </b>
            . Seleziona la destinazione (quello che rimarrà).
          </p>
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">
            Unisci In (Destinazione)
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              type === "customer"
                ? "Cerca cliente..."
                : "Cerca matricola, cliente o tipo..."
            }
            className={PRO_INPUT}
          />
          <div className="max-h-52 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
            {!isSearching && suggestions.length > 0 && (
              <>
                <p className="text-[9px] font-bold text-purple-500 uppercase ml-1 pt-1">
                  Suggeriti (più simili)
                </p>
                {suggestions.map(renderOption)}
                <p className="text-[9px] font-bold text-slate-400 uppercase ml-1 pt-2">
                  Tutti
                </p>
              </>
            )}
            {shownItems.map(renderOption)}
            {shownItems.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-3">
                {isSearching ? "Nessun risultato" : "Nessun altro elemento"}
              </p>
            )}
            {listItems.length > MAX_RESULTS && (
              <p className="text-[10px] text-slate-400 text-center py-1">
                Altri {listItems.length - MAX_RESULTS} risultati: scrivi di più
                per restringere la ricerca
              </p>
            )}
          </div>
          {selectedItem && (
            <div className="text-xs bg-purple-50 border border-purple-200 rounded-lg p-3 text-slate-600">
              <b className="text-red-500">{itemLabel(sourceItem)}</b> verrà{" "}
              {type === "customer"
                ? "eliminato e i suoi interventi e le sue gru passeranno a"
                : "eliminata e i suoi interventi passeranno a"}{" "}
              <b className="text-purple-700">{itemLabel(selectedItem)}</b>.
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleConfirm}
            disabled={loading || !targetId}
            className={`w-full py-3 rounded-lg font-bold text-xs shadow-md transition-all ${getButtonPrimaryClass(
              "purple"
            )}`}
          >
            {loading ? "Unione in corso..." : "Conferma Unione"}
          </button>
          <button
            onClick={onClose}
            className={`w-full py-3 rounded-lg font-bold text-xs ${PRO_BUTTON_SECONDARY}`}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
