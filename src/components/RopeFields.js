import React from "react";
import { AlertTriangle } from "lucide-react";
import { PRO_INPUT } from "../ui";
import { ROPE_ITEMS, emptyRope, ROPE_TYPES } from "../ropes";
import { FAS_ROPES, FAS_GROUPS, fasFamily, fasItem, fasSearch } from "../fasRopes";

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
            <p className="text-[11px] font-bold text-amber-800/80 pt-1">{id === "fune" ? "Dal certificato: così la prossima volta l'app sa che fune c'è montata e quanti fili rotti sono ammessi" : "Dal certificato (se ce l'hai)"}</p>
            {id === "fune" ? (
              <>
                <p className="text-[11px] font-black text-amber-900">Tipo di fune (obbligatorio)</p>
                <input
                  type="text"
                  className={PRO_INPUT}
                  placeholder="Codice FAS dal certificato (es. FZ636A12)"
                  aria-label="Codice della fune dal certificato"
                  data-rope-field="codice"
                  value={r.codice || ""}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();
                    const hit = fasSearch(v).find((h) => h.item);
                    if (hit)
                      set(id, {
                        codice: v,
                        fas: hit.fam.id,
                        costruzione: "",
                        diametro: r.diametro || String(hit.item.d).replace(".", ","),
                      });
                    else set(id, { codice: v });
                  }}
                />
                <select
                  className={PRO_INPUT}
                  aria-label="Tipo di fune"
                  data-rope-field="tipo"
                  value={r.fas ? "fas:" + r.fas : r.costruzione || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v.startsWith("fas:")) set(id, { fas: v.slice(4), costruzione: "" });
                    else set(id, { fas: "", costruzione: v });
                  }}
                >
                  <option value="">…oppure scegli dall'elenco</option>
                  {FAS_GROUPS.map(([g, gl]) => (
                    <optgroup key={g} label={gl}>
                      {FAS_ROPES.filter((f) => f.grp === g).map((f) => (
                        <option key={f.id} value={"fas:" + f.id}>
                          {f.id} · {f.cons.join(" / ")}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="Altre marche (per costruzione)">
                    {ROPE_TYPES.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </optgroup>
                </select>
                {r.fas && (
                  <p className="text-[11px] font-bold text-slate-600" data-rope-fas>
                    FAS {r.fas}
                    {fasFamily(r.fas) ? " · " + fasFamily(r.fas).cons.join(" / ") : ""}
                    {fasItem(fasFamily(r.fas), r.diametro) ? ` · carico di rottura ${String(fasItem(fasFamily(r.fas), r.diametro).kN).replace(".", ",")} kN (dal catalogo)` : r.diametro ? " · diametro non presente nel catalogo: controlla" : ""}
                  </p>
                )}
                {!r.fas && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      list="rope-brands"
                      className={PRO_INPUT}
                      placeholder="Marca (Teci…)"
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
                )}
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
