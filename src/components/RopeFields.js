import React from "react";
import { AlertTriangle } from "lucide-react";
import { PRO_INPUT } from "../ui";
import { ROPE_ITEMS, emptyRope, ROPE_TYPES } from "../ropes";

// Dati FUNE / CATENA sostituita.
// Non c'è nessuna casella da spuntare: la sezione compare da sola quando la
// descrizione parla di sostituzione (vedi autoTick in ropes.js).
export const RopeFields = ({ ropes, onChange }) => {
  const value = ropes || {};
  const set = (id, patch) =>
    onChange({ ...value, [id]: { ...(value[id] || emptyRope()), ...patch } });
  const active = ROPE_ITEMS.filter(({ id }) => value[id] && value[id].on);
  if (!active.length) return null;

  return (
    <div key="ropes" data-section="ropes" className="space-y-3">
      {active.map(({ id, label }) => {
        const r = value[id];
        return (
          <div
            key={id}
            data-rope={id}
            className="space-y-2 bg-amber-50 border border-amber-200 rounded-xl p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-bold text-amber-800 flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Dalla descrizione risulta sostituita la {label}: inserisci i
                  dati della {label} nuova.
                </span>
              </p>
              <button
                type="button"
                onClick={() => set(id, { on: false, touched: true })}
                className="text-[10px] font-bold text-slate-500 underline shrink-0"
              >
                Non è stata sostituita
              </button>
            </div>
            <input
              type="text"
              className={PRO_INPUT}
              placeholder={`N. certificato ${label}`}
              aria-label={`Certificato ${label}`}
              value={r.certificato}
              onChange={(e) => set(id, { certificato: e.target.value.toUpperCase() })}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                inputMode="decimal"
                className={PRO_INPUT}
                placeholder="Diametro (mm)"
                aria-label={`Diametro ${label} in millimetri`}
                value={r.diametro}
                onChange={(e) => set(id, { diametro: e.target.value })}
              />
              <input
                type="text"
                inputMode="decimal"
                className={PRO_INPUT}
                placeholder="Lunghezza (m)"
                aria-label={`Lunghezza ${label} in metri`}
                value={r.lunghezza}
                onChange={(e) => set(id, { lunghezza: e.target.value })}
              />
            </div>
            {/* dal certificato (facoltativi): servono al controllo «Fune e catena» della prossima volta */}
            <p className="text-[11px] font-bold text-amber-800/80 pt-1">Dal certificato (se ce l'hai): così la prossima volta l'app sa che {label} c'è montata</p>
            {id === "fune" ? (
              <>
                <select
                  className={PRO_INPUT}
                  aria-label="Costruzione della fune"
                  data-rope-field="costruzione"
                  value={r.costruzione || ""}
                  onChange={(e) => set(id, { costruzione: e.target.value })}
                >
                  <option value="">Costruzione (es. 6×36 WS)…</option>
                  {ROPE_TYPES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    list="rope-brands"
                    className={PRO_INPUT}
                    placeholder="Marca (FAS, Teci…)"
                    aria-label="Marca della fune"
                    data-rope-field="marca"
                    value={r.marca || ""}
                    onChange={(e) => set(id, { marca: e.target.value })}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className={PRO_INPUT}
                    placeholder="Carico rottura (kN)"
                    aria-label="Carico di rottura minimo in kN"
                    data-rope-field="rottura"
                    value={r.rottura || ""}
                    onChange={(e) => set(id, { rottura: e.target.value })}
                  />
                </div>
                <datalist id="rope-brands">
                  <option value="FAS" />
                  <option value="Teci" />
                </datalist>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <select className={PRO_INPUT} aria-label="Grado della catena" data-rope-field="grado" value={r.grado || ""} onChange={(e) => set(id, { grado: e.target.value })}>
                  <option value="">Grado…</option>
                  <option value="80">Grado 80</option>
                  <option value="100">Grado 100</option>
                  <option value="altro">Altro</option>
                </select>
                <input
                  type="text"
                  inputMode="decimal"
                  className={PRO_INPUT}
                  placeholder="Passo (mm)"
                  aria-label="Passo della catena in mm"
                  data-rope-field="passo"
                  value={r.passo || ""}
                  onChange={(e) => set(id, { passo: e.target.value })}
                />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 accent-amber-600"
                checked={r.nonDisponibile}
                onChange={(e) => set(id, { nonDisponibile: e.target.checked })}
                aria-label={`Dati ${label} non disponibili ora`}
              />
              <span className="text-[11px] font-bold text-slate-600">
                Dati non disponibili ora
              </span>
            </label>
            {r.nonDisponibile && (
              <input
                type="text"
                className={PRO_INPUT}
                placeholder="Motivo (es. certificato non ancora arrivato)"
                aria-label={`Motivo dati ${label} non disponibili`}
                value={r.motivo}
                onChange={(e) => set(id, { motivo: e.target.value })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
