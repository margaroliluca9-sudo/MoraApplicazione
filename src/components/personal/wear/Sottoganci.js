// FUNE E CATENA → scheda Sottoganci: fasce e anelli di poliestere, brache di catena (cataloghi FAS).
import React, { useMemo, useState } from "react";
import { INPUT } from "../PersonalUi";
import { printWear } from "../../WearPrintHost";
import { CHAIN_GRADES, CHAIN_MODES, CHAIN_TEXT, CHAIN_SOURCE, EDGE, SHOCK, chainGrade, chainSlingWll } from "../../../chainSlings";
import { SLING_COLORS, SLING_MODES, SLING_FLAGS, SLING_TEXT, SLING_SOURCE, checkSling, slingVerdict, slingRegister, slingReport } from "../../../slingRules";
import { fmt, Num, Choice, Flags, Verdict, useCopy, Txt } from "./ui";
import { ModeArt } from "./art";
import { InfoBtn } from "./info";

export const SlingCheck = () => {
  const [x, setX] = useState({ kind: "fascia", color: "", wll: "", mode: "diritto", code: "", mora: "", len: "", flags: {}, labelBad: false });
  const set = (k) => (v) => setX((o) => ({ ...o, [k]: v }));
  const r = useMemo(() => checkSling(x), [x]);
  const v = slingVerdict(r);
  const [copied, copy] = useCopy();
  const flags = SLING_FLAGS.filter(([, , only]) => !only || only === x.kind);
  const lines = [];
  if (r.cap != null) lines.push(`${r.mode.label}: ${fmt(r.wll, 2)} t × ${fmt(r.mode.factor, 2)} = ${fmt(r.cap, 2)} t`);
  r.flags.forEach((f) => lines.push(f.l + " → scarto"));
  const title = r.discard ? "Braca da scartare" : "Braca idonea";
  return (
    <div className="space-y-4" data-section="wear-sling">
      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">La braca</h4>
        <Choice id="slingkind" value={x.kind} onChange={set("kind")} options={[["fascia", "Fascia piatta"], ["anello", "Anello continuo"]]} />
        <div>
          <p className="text-xs font-black text-slate-500 mb-1.5">Colore = portata (EN 1492-1/2)</p>
          <div className="grid grid-cols-4 gap-1.5" data-sling-colors>
            {SLING_COLORS.map(([id, l, t, hex]) => (
              <button
                key={id}
                type="button"
                onClick={() => setX((o) => ({ ...o, color: l, wll: String(t) }))}
                data-sling-color={id}
                className={`rounded-xl border-2 p-1.5 flex flex-col items-center ${x.color === l ? "border-slate-900" : "border-slate-200"}`}
              >
                <span className="w-full h-3 rounded-full" style={{ background: hex }} />
                <span className="text-[11px] font-black text-slate-700 mt-1">{t} t</span>
                <span className="text-[10px] text-slate-500">{l}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Oltre 10 t le brache sono arancio: scrivi la portata dell'etichetta.</p>
        </div>
        <Num id="wll" label="Portata sull'etichetta" unit="t" value={x.wll} onChange={(val) => setX((o) => ({ ...o, wll: val, color: (SLING_COLORS.find((c) => String(c[2]) === val.replace(",", ".")) || [, ""])[1] }))} />
        <div className="grid grid-cols-2 gap-3">
          <Txt id="mora" label="Numero Mora (targhetta)" value={x.mora} onChange={set("mora")} />
          <Num id="len" label="Lunghezza" unit="m" value={x.len} onChange={set("len")} />
        </div>
        <div>
          <Txt id="code" label="Codice del fabbricante (facoltativo)" value={x.code} onChange={set("code")} />
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">Come viene usata</h4>
        <div className="grid grid-cols-3 gap-2" data-sling-modes>
          {SLING_MODES.map((m) => (
            <button key={m.id} type="button" onClick={() => set("mode")(m.id)} data-sling-mode={m.id} className={`rounded-2xl border-2 p-2 flex flex-col items-center gap-1 text-center ${x.mode === m.id ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}>
              <ModeArt id={m.id} />
              <span className="text-[10px] font-black leading-tight">{m.label}</span>
              <span className="text-[11px] font-black">× {fmt(m.factor, 2)}</span>
            </button>
          ))}
        </div>
        {r.cap != null && (
          <div className="rounded-2xl bg-slate-900 text-white p-4" data-sling-cap>
            <p className="text-xs font-black uppercase tracking-wider opacity-80">Portata in questo uso</p>
            <p className="font-black tabular-nums leading-none mt-1" style={{ fontSize: 48 }}>
              {fmt(r.cap, 2)} t
            </p>
            <p className="text-sm font-bold opacity-90 mt-1">
              {fmt(r.wll, 2)} t × {fmt(r.mode.factor, 2)} ({r.mode.label})
            </p>
          </div>
        )}
        <p className="text-[11px] text-slate-500 leading-snug">«{SLING_TEXT.angolo}» «{SLING_TEXT.simmetria}» (catalogo FAS)</p>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">Controllo a vista</h4>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1 w-4 h-4" checked={x.labelBad} onChange={(e) => set("labelBad")(e.target.checked)} data-sling-label />
          <span className="flex-1">Targhetta (etichetta) mancante o illeggibile → scarto</span>
          <InfoBtn id="s_marcatura" label="marcatura" />
        </label>
        <Flags list={flags.map(([k, l]) => [k, l])} value={x.flags} onChange={set("flags")} />
        <p className="text-[11px] text-slate-500 leading-snug">«{SLING_TEXT.scarto}» (catalogo FAS)</p>
      </section>

      <Verdict
        level={r.level}
        title={title}
        lines={lines.length ? lines : ["Nessuno dei casi di scarto indicati nel catalogo."]}
        onCopy={() => copy(slingRegister({ r, x }))}
        copied={copied}
        big={r.cap != null ? { label: "Portata in questo uso", value: fmt(r.cap, 2), unit: "t", sub: `${r.mode.label} · fattore ${fmt(r.mode.factor, 2)}` } : null}
        register={{ ...v, text: slingRegister({ r, x }) }}
        onPrint={() => printWear(slingReport({ r, x }))}
      />

      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-2 text-[12px] text-slate-600 leading-snug" data-sling-rules>
        <h4 className="font-black text-slate-800 text-sm">Dal catalogo FAS</h4>
        <p>
          <b>Asola nel gancio:</b> «{SLING_TEXT.asola}»
        </p>
        <p>
          <b>Spigoli:</b> «{SLING_TEXT.spigoli}»
        </p>
        <p>
          <b>Temperatura e prodotti chimici:</b> «{SLING_TEXT.temperatura}» «{SLING_TEXT.chimici}»
        </p>
        <p>
          <b>Nodi:</b> «{SLING_TEXT.nodi}»
        </p>
        <p>
          <b>Verifiche periodiche:</b> «{SLING_TEXT.verifiche}»
        </p>
        <p className="text-[11px] text-slate-400">{SLING_SOURCE}.</p>
      </section>
    </div>
  );
};
// ---------------------------------------------------------------- BRACHE DI CATENA (sottoganci): portata dal catalogo FAS / Pewag
export const ChainSlingCheck = ({ onWear }) => {
  const [x, setX] = useState({ grade: "G10", d: "", mode: "d1", temp: "t1", edge: "r2", shock: "s1", lug: false, asym: false });
  const set = (k) => (v) => setX((o) => ({ ...o, [k]: v }));
  const g = chainGrade(x.grade);
  const ds = Object.keys(g.rows).map(Number).sort((a, b) => a - b);
  const modes = g.cols.filter((c) => {
    const row = x.d ? g.rows[x.d] : null;
    return !row || row[g.cols.indexOf(c)] != null;
  });
  const r = x.d ? chainSlingWll({ ...x, d: Number(x.d) }) : null;
  const kg = (v) => `${Number(v).toLocaleString("it-IT")} kg`;
  return (
    <div className="space-y-4" data-section="wear-chainsling">
      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">La braca di catena</h4>
        <label className="block space-y-1">
          <span className="text-xs font-black text-slate-500">Catena (grado)</span>
          <select className={INPUT} value={x.grade} onChange={(e) => setX((o) => ({ ...o, grade: e.target.value, d: "", mode: "d1" }))} data-wear-input="grade">
            {CHAIN_GRADES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className="text-xs font-black text-slate-500 mb-1.5">Diametro (mm)</p>
          <div className="flex flex-wrap gap-1.5" data-chainsling-d>
            {ds.map((d) => (
              <button key={d} type="button" onClick={() => set("d")(String(d))} data-chainsling-dia={d} className={`h-10 min-w-[46px] px-3 rounded-xl text-base font-black border ${x.d === String(d) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">Come viene usata</h4>
        <div className="grid grid-cols-2 gap-2" data-chainsling-modes>
          {modes.map((c) => (
            <button key={c} type="button" onClick={() => set("mode")(c)} data-chainsling-mode={c} className={`rounded-2xl border-2 px-2 py-2 text-left ${x.mode === c ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}>
              <span className="block text-[12px] font-black leading-tight">{CHAIN_MODES[c].label}</span>
              <span className="block text-[11px] font-bold opacity-80">fattore {String(CHAIN_MODES[c].factor).replace(".", ",")}</span>
            </button>
          ))}
        </div>
        <h4 className="font-black text-slate-800 pt-1">Limitazioni all'uso (catalogo)</h4>
        <label className="block space-y-1">
          <span className="text-xs font-black text-slate-500">Temperatura</span>
          <select className={INPUT} value={x.temp} onChange={(e) => set("temp")(e.target.value)} data-wear-input="temp">
            <option value="t1">Normale (fino a 200 °C)</option>
            <option value="t2">Da 200 a 300 °C</option>
            <option value="t3">Oltre 300 °C</option>
          </select>
          <span className="block text-[11px] text-slate-400">Catalogo, {g.label}: {g.temp}</span>
        </label>
        <Choice id="edge" value={x.edge} onChange={set("edge")} options={EDGE.map(([k, l]) => [k, l])} />
        <Choice id="shock" value={x.shock} onChange={set("shock")} options={SHOCK.map(([k, l]) => [k, l])} />
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1 w-4 h-4" checked={x.lug} onChange={(e) => set("lug")(e.target.checked)} data-chainsling-lug />
          <span>Avvolta su un perno o un carico tondo più piccolo di 3 × passo{r && r.pitch ? ` (3 × ${String(r.pitch).replace(".", ",")} = ${String(Math.round(r.pitch * 3 * 10) / 10).replace(".", ",")} mm)` : ""}</span>
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mt-1 w-4 h-4" checked={x.asym} onChange={(e) => set("asym")(e.target.checked)} data-chainsling-asym />
          <span>Carico asimmetrico (bracci che non tirano uguale)</span>
        </label>
      </section>
      {r && r.table != null && (
        <div className={`rounded-3xl p-5 text-white ${r.notAllowed ? "bg-red-600" : "bg-slate-900"}`} data-chainsling-cap>
          <p className="text-xs font-black uppercase tracking-wider opacity-80">Portata in questo uso</p>
          <p className="font-black tabular-nums leading-none mt-1" style={{ fontSize: 44 }}>
            {r.notAllowed ? "NON AMMESSO" : kg(r.cap)}
          </p>
          <p className="text-sm font-bold opacity-90 mt-2">
            Tabella: {g.code} {x.d} · {CHAIN_MODES[x.mode].label} = {kg(r.table)}
            {r.asymNote ? ` · carico asimmetrico: si conta come ${r.asymNote} (${kg(r.base)})` : ""}
            {r.factors.map((f) => ` · ${f[0]} × ${String(f[1]).replace(".", ",")}`).join("")}
          </p>
          {r.pitch && <p className="text-xs font-bold opacity-80 mt-1">Passo della catena: {String(r.pitch).replace(".", ",")} mm</p>}
          {onWear && (
            <button type="button" onClick={() => onWear({ diametro: x.d, passo: r.pitch ? String(r.pitch).replace(".", ",") : "" })} data-action="chainsling-wear" className="mt-3 h-10 px-3 rounded-xl bg-white/15 text-sm font-bold">
              Controlla l'usura di questa catena ›
            </button>
          )}
        </div>
      )}
      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-2 text-[12px] text-slate-600 leading-snug" data-chainsling-rules>
        <h4 className="font-black text-slate-800 text-sm">Dal catalogo</h4>
        <p>
          <b>Carico asimmetrico:</b> «{x.grade === "G6" ? CHAIN_TEXT.asimmetricoG6 : CHAIN_TEXT.asimmetrico}»
        </p>
        <p>
          <b>Perno o carico tondo:</b> «{CHAIN_TEXT.perno}»
        </p>
        <p>
          <b>Spigoli:</b> R &gt; 2 × Ø catena: fattore 1 · R &gt; Ø catena: 0,7 · R &lt; Ø catena: 0,5. <b>Shock:</b> leggero 1 · medio 0,7 · pesante non ammissibile.
        </p>
        <p>
          <b>Usura:</b> «{CHAIN_TEXT.usura}»
        </p>
        <p className="text-[11px] text-slate-400">{CHAIN_SOURCE}. Coefficiente di sicurezza 4. Portate in kg come nella tabella «Portata delle imbragature».</p>
      </section>
    </div>
  );
};
// SOTTOGANCI: fasce e anelli di poliestere, brache di catena
export const SottoganciCheck = ({ onWear }) => {
  const [k, setK] = useState("fasce");
  return (
    <div className="space-y-4">
      <Choice id="sottoganci" value={k} onChange={setK} options={[["fasce", "Fasce e anelli"], ["catene", "Brache di catena"]]} />
      {k === "fasce" ? <SlingCheck /> : <ChainSlingCheck onWear={onWear} />}
    </div>
  );
};
