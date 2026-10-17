import React from "react";
import { Wrench, Plus, Trash2 } from "lucide-react";
import { PRO_INPUT } from "../ui";
import { PART_TYPES, emptyPart } from "../parts";

// Sezione "Pezzi sostituiti" del rapporto: tipo, marca/modello, matricola, dati tecnici.
export const PartsEditor = ({ parts, onChange }) => {
  const list = Array.isArray(parts) ? parts : [];
  const update = (idx, field, value) =>
    onChange(list.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  const remove = (idx) => onChange(list.filter((_, i) => i !== idx));
  const add = () => onChange([...list, emptyPart()]);

  return (
    <div
      key="parts"
      className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200"
      data-section="parts"
    >
      <div className="flex justify-between items-center gap-2">
        <div>
          <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
            <Wrench className="w-4 h-4 text-slate-400" /> Pezzi sostituiti
            (Opzionale)
          </label>
          <p className="text-[9px] text-slate-400 mt-0.5">
            Fune, motori, freni... Compaiono nella scheda tecnica della gru.
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1.5 hover:bg-slate-100 transition-all shrink-0"
        >
          <Plus className="w-3 h-3" /> Aggiungi pezzo
        </button>
      </div>

      {list.map((p, idx) => (
        <div
          key={idx}
          className="bg-white border border-slate-200 rounded-xl p-3 space-y-2"
          data-part-row={idx}
        >
          <div className="flex gap-2">
            <select
              aria-label="Tipo pezzo"
              className={PRO_INPUT}
              value={p.type}
              onChange={(e) => update(idx, "type", e.target.value)}
            >
              <option value="">Tipo di pezzo...</option>
              {PART_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => remove(idx)}
              aria-label="Rimuovi pezzo"
              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              aria-label="Marca / Modello"
              className={PRO_INPUT}
              placeholder="Marca / Modello"
              value={p.brand}
              onChange={(e) => update(idx, "brand", e.target.value)}
            />
            <input
              type="text"
              aria-label="Matricola pezzo"
              className={PRO_INPUT}
              placeholder="Matricola pezzo"
              value={p.serial}
              onChange={(e) => update(idx, "serial", e.target.value.toUpperCase())}
            />
          </div>
          <input
            type="text"
            aria-label="Dati tecnici"
            className={PRO_INPUT}
            placeholder="Dati tecnici (es. Ø 10 mm, 30 m / 4 kW)"
            value={p.specs}
            onChange={(e) => update(idx, "specs", e.target.value)}
          />
        </div>
      ))}
    </div>
  );
};
