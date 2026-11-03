import React from "react";
import { AlertTriangle } from "lucide-react";
import { PRO_INPUT } from "../ui";
import { ROPE_ITEMS, emptyRope, ROPE_TYPES, consInText, ropeName } from "../ropes";
import { fasFamily, fasItem, fasSearch } from "../fasRopes";
import { teciFamily, teciItem, teciSearch } from "../teciRopes";

// Dati FUNE / CATENA sostituita.
// Non c'è nessuna casella da spuntare: la sezione compare da sola quando la
// descrizione parla di sostituzione (vedi autoTick in ropes.js).
export const RopeFields = ({ ropes, onChange, completing = false }) => {
  const value = ropes || {};
  const set = (id, patch) =>
    onChange({ ...value, [id]: { ...(value[id] || emptyRope()), ...patch } });
  // sostituite, oppure indicate «non l'ho sostituita» (resta la casella per tornare indietro)
  const active = ROPE_ITEMS.filter(({ id }) => value[id] && (value[id].on || value[id].declined));
  if (!active.length) return null;

  return (
    <div key="ropes" data-section="ropes" className="space-y-3">
      {active.map(({ id, label }) => {
        const r = value[id];
        if (!r.on)
          return (
            <label key={id} data-rope={id} data-rope-declined className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 accent-amber-600"
                checked
                onChange={() => set(id, { on: true, declined: false, touched: true })}
                aria-label={`Non ho sostituito la ${label}`}
              />
              <span className="text-[11px] font-bold text-slate-600">Non ho sostituito la {label} (togli la spunta se invece l'hai sostituita)</span>
            </label>
          );
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
                  {completing
                    ? `Aggiungi i dati che mancano della ${label} montata con questo intervento.`
                    : `Dalla descrizione risulta sostituita la ${label}: inserisci i dati della ${label} nuova.`}
                </span>
              </p>

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
                  placeholder="Tipo fune (es. FZ636A12, Teci S10 ZN, o 6x36)"
                  aria-label="Tipo fune"
                  data-rope-field="codice"
                  value={r.codice ? r.codice : r.fas || (r.teci && teciFamily(r.teci) ? teciFamily(r.teci).name : "") || r.costruzione || ""}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();
                    const t = v.trim();
                    // codice FAS dell'articolo (FZ636A12): fune e diametro dal catalogo
                    const hit = t ? fasSearch(t).find((h) => h.item) : null;
                    if (hit) return set(id, { codice: v, fas: hit.fam.id, teci: "", costruzione: "", diametro: r.diametro || String(hit.item.d).replace(".", ",") });
                    // famiglia FAS (FZ636AC)
                    const fam = t ? fasFamily(t) : null;
                    if (fam) return set(id, { codice: v, fas: fam.id, teci: "", costruzione: "" });
                    // fune del catalogo Teci (nome: «S10 ZN», «Teci A7 ALC», «TK17»)
                    const tf = t ? teciSearch(t) : null;
                    if (tf) return set(id, { codice: v, fas: "", teci: tf.id, costruzione: "" });
                    // altre marche: la costruzione (6x36, 8x19…) o quello che c'è scritto
                    const c = consInText(t);
                    return set(id, { codice: v, fas: "", teci: "", costruzione: c ? c.costruzione : t });
                  }}
                />
                {!r.fas && r.teci && teciFamily(r.teci) && (
                  <p className="text-[11px] font-bold text-slate-600" data-rope-teci>
                    Teci {teciFamily(r.teci).name} · {(teciItem(teciFamily(r.teci), Number(String(r.diametro).replace(",", "."))) || {}).cons || teciFamily(r.teci).cons.join(" / ")}
                    {teciItem(teciFamily(r.teci), Number(String(r.diametro).replace(",", "."))) && teciItem(teciFamily(r.teci), Number(String(r.diametro).replace(",", "."))).exact
                      ? ` · carico di rottura ${String(teciItem(teciFamily(r.teci), Number(String(r.diametro).replace(",", "."))).kN).replace(".", ",")} kN (dal catalogo)`
                      : r.diametro
                        ? " · diametro non presente nel catalogo: controlla"
                        : ""}
                  </p>
                )}
                {!r.fas && r.costruzione && ROPE_TYPES.some(([v]) => v === r.costruzione) && (
                  <p className="text-[11px] font-bold text-slate-600" data-rope-cons>
                    Costruzione {ropeName(r.costruzione)} (altra marca)
                  </p>
                )}
                {r.fas && (
                  <p className="text-[11px] font-bold text-slate-600" data-rope-fas>
                    FAS {r.fas}
                    {fasFamily(r.fas) ? " · " + fasFamily(r.fas).cons.join(" / ") : ""}
                    {fasItem(fasFamily(r.fas), r.diametro) ? ` · carico di rottura ${String(fasItem(fasFamily(r.fas), r.diametro).kN).replace(".", ",")} kN (dal catalogo)` : r.diametro ? " · diametro non presente nel catalogo: controlla" : ""}
                  </p>
                )}
              </>
            ) : null}
            {/* due cose diverse: non l'ho sostituita / l'ho sostituita ma non ho i dati adesso */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 accent-amber-600"
                checked={false}
                onChange={() => set(id, { on: false, declined: true, touched: true })}
                aria-label={`Non ho sostituito la ${label}`}
                data-rope-decline={id}
              />
              <span className="text-[11px] font-bold text-slate-600">Non ho sostituito la {label}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 accent-amber-600"
                checked={r.nonDisponibile}
                onChange={(e) => set(id, { nonDisponibile: e.target.checked })}
                aria-label={`Dati ${label} non disponibili ora`}
              />
              <span className="text-[11px] font-bold text-slate-600">
                L'ho sostituita ma non ho i dati adesso
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
