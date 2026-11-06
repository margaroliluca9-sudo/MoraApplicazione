// FUNE E CATENA → scheda «Carico rottura fune»: quanto deve reggere come minimo la fune (o la catena) di una gru.
// Carico di rottura minimo = coefficiente × sforzo su un tiro; coefficiente da Allegato V (non CE), Direttiva Macchine (CE)
// o dal costruttore. Conti e testi in src/breakLoad.js. Non salva niente.
import React, { useMemo, useState } from "react";
import { Copy, Check, CheckCircle2, XCircle } from "lucide-react";
import { INPUT } from "./PersonalUi";
import { BREAK_KINDS, BREAK_TEXT, breakCalc, breakText, fmtB } from "../../breakLoad";

const Btns = ({ id, value, onChange, options, cols = "grid-cols-2" }) => (
  <div className={`grid ${cols} gap-1.5`} data-break-choice={id}>
    {options.map(([v, l, sub]) => (
      <button key={v} type="button" onClick={() => onChange(v)} data-choice={v} className={`rounded-2xl border-2 px-2 py-2 text-left ${value === v ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}>
        <span className={`block text-sm font-black ${value === v ? "text-blue-800" : "text-slate-700"}`}>{l}</span>
        {sub && <span className="block text-[11px] text-slate-500 leading-tight">{sub}</span>}
      </button>
    ))}
  </div>
);

const Field = ({ id, label, value, onChange, unit, hint }) => (
  <label className="block space-y-1">
    <span className="text-xs font-black text-slate-500">{label}</span>
    <span className="relative block">
      <input className={`${INPUT} pr-12`} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))} data-break-input={id} placeholder="0" autoComplete="off" />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{unit}</span>
    </span>
    {hint && <span className="block text-[11px] text-slate-500 leading-snug">{hint}</span>}
  </label>
);

// disegno: trave in alto, N tiri, bozzello col gancio
const Rami = ({ n }) => {
  const k = Math.max(1, Math.min(8, n || 1));
  const w = 120;
  const xs = Array.from({ length: k }, (_, i) => (k === 1 ? w / 2 : 30 + (i * (w - 60)) / (k - 1)));
  return (
    <svg viewBox={`0 0 ${w} 100`} className="w-28 h-24 shrink-0" aria-hidden="true">
      <rect x="10" y="4" width={w - 20} height="8" rx="2" fill="#475569" />
      {xs.map((x, i) => (
        <line key={i} x1={x} y1="12" x2={x} y2="62" stroke="#2563eb" strokeWidth="2.5" />
      ))}
      <rect x="22" y="60" width={w - 44} height="14" rx="5" fill="#94a3b8" stroke="#334155" strokeWidth="1.5" />
      <path d={`M${w / 2},74 v6 q-7,0 -7,7 q0,7 7,7 q6,0 7,-5`} fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

export const BreakCalc = () => {
  const [x, setX] = useState({ machine: "ce", kind: "fune", coeff: "", portata: "", bozzello: "", rami: "4", mbl: "" });
  const set = (k) => (v) => setX((o) => ({ ...o, [k]: v }));
  const r = useMemo(() => breakCalc(x), [x]);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const t = breakText(r, x);
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, done);
      else done();
    } catch (e) {
      done();
    }
  };
  const k = BREAK_KINDS.find((q) => q[0] === x.kind) || BREAK_KINDS[0];
  return (
    <div className="space-y-4" data-section="wear-break">
      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">La gru è marcata CE?</h4>
        <Btns
          id="machine"
          value={x.machine}
          onChange={set("machine")}
          options={[
            ["ce", "Sì, CE", `coefficiente ${k[2]}`],
            ["noce", "No, non CE", `coefficiente ${k[3]}`],
            ["argano", "Argano a motore", "cantiere · coefficiente 8"],
            ["costr", "Lo dice il costruttore", "scrivo io il coefficiente"],
          ]}
        />
        {x.machine === "costr" && <Field id="coeff" label="Coefficiente del costruttore" value={x.coeff} onChange={set("coeff")} unit="×" hint="Dal manuale o dalla targa della gru: se c'è, vale quello." />}
        <h4 className="font-black text-slate-800 pt-1">Cosa calcoli?</h4>
        <Btns id="kind" value={x.kind} onChange={set("kind")} cols="grid-cols-3" options={BREAK_KINDS.map(([id, l]) => [id, l])} />
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">La gru</h4>
        <div className="grid grid-cols-2 gap-3">
          <Field id="portata" label="Portata" value={x.portata} onChange={set("portata")} unit="kg" hint="es. 5 t = 5000" />
          <Field id="bozzello" label="Peso bozzello e gancio" value={x.bozzello} onChange={set("bozzello")} unit="kg" hint="Se lo sai (facoltativo)." />
        </div>
        <div className="flex items-center gap-3">
          <Rami n={r.rami} />
          <div className="flex-1 space-y-1">
            <span className="text-xs font-black text-slate-500">Numero dei tiri</span>
            <div className="flex flex-wrap gap-1.5" data-break-choice="rami">
              {["1", "2", "3", "4", "6", "8"].map((v) => (
                <button key={v} type="button" onClick={() => set("rami")(v)} data-choice={v} className={`w-11 h-11 rounded-xl border-2 text-base font-black ${String(r.rami) === v ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}>
                  {v}
                </button>
              ))}
            </div>
            <span className="block text-[11px] text-slate-500 leading-snug">Conta i tiri di fune che reggono il bozzello.</span>
          </div>
        </div>
      </section>

      {r.min > 0 && (
        <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-lg" data-break-result>
          <div className="bg-slate-900 text-white p-5">
            <p className="text-xs font-black uppercase tracking-wider text-blue-300">Carico di rottura minimo</p>
            <p className="font-black tabular-nums leading-none mt-1" style={{ fontSize: 44 }} data-break-min>
              {fmtB(r.min)} kN
            </p>
            <p className="text-sm font-bold text-slate-300 mt-1">circa {fmtB(r.minKg, 0)} kg · coefficiente {fmtB(r.coeff)}</p>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-slate-700 leading-snug">
              Sforzo su un tiro: ({fmtB(r.portata, 0)} kg{r.bozzello ? ` + ${fmtB(r.bozzello, 0)} kg` : ""}) ÷ {r.rami} = <b>{fmtB(r.tiro, 2)} kN</b>
              <br />
              Minimo: {fmtB(r.coeff)} × {fmtB(r.tiro, 2)} kN = <b>{fmtB(r.min)} kN</b>
            </p>
            <Field id="mbl" label={`Carico di rottura ${x.kind === "catena" ? "della catena" : "della fune"} montata (se lo sai)`} value={x.mbl} onChange={set("mbl")} unit="kN" hint="Dal certificato, o dalla scheda Fune (cataloghi FAS e Teci)." />
            {r.ok != null && (
              <div className={`rounded-2xl p-3 flex items-center gap-2 ${r.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`} data-break-ok={r.ok ? "1" : "0"}>
                {r.ok ? <CheckCircle2 className="w-6 h-6 shrink-0" /> : <XCircle className="w-6 h-6 shrink-0" />}
                <span className="text-sm font-black">
                  {r.ok ? "Va bene" : "Non basta"}: {fmtB(r.mbl)} kN {r.ok ? "≥" : "<"} {fmtB(r.min)} kN · coefficiente reale {fmtB(r.ratio, 2)}
                </span>
              </div>
            )}
            <button type="button" onClick={copy} className="h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700 flex items-center gap-1.5" data-action="break-copy">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copiato" : "Copia il calcolo"}
            </button>
            <p className="text-[11px] text-slate-400 leading-snug">Calcolo semplice: non tiene conto del rendimento delle pulegge (che fa salire un po' il tiro) né della classe del meccanismo, che usa chi progetta la gru. Se il manuale o la targa dicono che fune montare, vale quello.</p>
          </div>
        </div>
      )}

      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-2 text-[12px] text-slate-600 leading-snug" data-break-norms>
        <h4 className="font-black text-slate-800 text-sm">Da dove vengono i coefficienti</h4>
        <p>
          <b>Non CE</b> · {BREAK_TEXT.noceSrc}: «{BREAK_TEXT.noce}»
        </p>
        <p>
          <b>Argani a motore</b> · {BREAK_TEXT.arganiSrc}: «{BREAK_TEXT.argani}»
        </p>
        <p>
          <b>CE</b> · {BREAK_TEXT.ceSrc}: fune metallica «{BREAK_TEXT.ceFune}» · catene «{BREAK_TEXT.ceCatena}» · tessili «{BREAK_TEXT.ceTessile}».
        </p>
        <p>
          {BREAK_TEXT.coeffSrc}: {BREAK_TEXT.coeff}
        </p>
      </section>
    </div>
  );
};
