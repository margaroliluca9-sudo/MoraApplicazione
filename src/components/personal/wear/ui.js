// FUNE E CATENA: pezzi comuni dei controlli (campi, scelte, verdetto, numeri).
import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Copy, Check, Info, FilePlus2, Printer } from "lucide-react";
import { INPUT } from "../PersonalUi";
import { measureFixed } from "../../../wearRules";
import { InfoBtn, INFO, InfoSheet } from "./info";

// «950» con nominale 10 → «Letto come 9,5 mm» (misura scritta senza virgola)
export const readAs = (raw, ref) => {
  const f = measureFixed(raw, ref);
  return f != null ? `Letto come ${fmt(f, 2)} mm` : "";
};
export const nOf = (v) => Number(String(v || "").replace(",", ".")) || 0;
export const fmt = (v, dec = 1) => (v == null || Number.isNaN(v) ? "—" : Number(v).toLocaleString("it-IT", { maximumFractionDigits: dec, minimumFractionDigits: 0 }));
export const Num = ({ label, value, onChange, unit = "mm", hint, id, info = "" }) => (
  <label className="block space-y-1">
    <span className="text-xs font-black text-slate-500 flex items-center gap-1.5 min-h-7">
      <span>{label}</span>
      {info && <InfoBtn id={info} label={label} />}
    </span>
    <span className="relative block">
      <input
        className={`${INPUT} pr-12`}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
        data-wear-input={id}
        placeholder="0"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{unit}</span>
    </span>
    {hint && <span className="block text-[11px] text-slate-400 leading-snug">{hint}</span>}
  </label>
);
export const Choice = ({ value, onChange, options, id }) => (
  <div className="flex bg-slate-100 p-1 rounded-xl" data-wear-choice={id}>
    {options.map(([v, l]) => (
      <button key={v} type="button" onClick={() => onChange(v)} data-choice={v} className={`flex-1 min-h-10 px-2 py-1.5 rounded-lg text-xs font-black ${value === v ? "bg-white text-slate-800 shadow" : "text-slate-500"}`}>
        {l}
      </button>
    ))}
  </div>
);
export const Flags = ({ list, value, onChange }) => (
  <div className="space-y-1.5">
    {list.map(([k, l]) => (
      <label key={k} className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" className="mt-1 w-4 h-4" checked={!!value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.checked })} data-wear-flag={k} />
        <span className="flex-1">{l}</span>
        {INFO["f_" + k] && <InfoBtn id={"f_" + k} label={l} />}
      </label>
    ))}
  </div>
);
export const Bar = ({ sev }) => (
  <span className="block h-2 rounded-full bg-slate-200 overflow-hidden mt-1">
    <span className={`block h-full ${sev >= 100 ? "bg-red-500" : sev >= 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, Math.max(4, sev))}%` }} />
  </span>
);
// verdetto: in cima, grande e colorato, il numero che conta (usura, calo del diametro, fili rotti)
export const Verdict = ({ level, title, lines, onCopy, copied, onReport, big = null, register = null, onPrint = null }) => {
  const [regCopied, copyReg] = useCopy();
  const tone = level === "scarto" ? ["bg-red-600", XCircle] : level === "attenzione" ? ["bg-amber-600", AlertTriangle] : ["bg-emerald-600", CheckCircle2];
  const Icon = tone[1];
  return (
    <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-lg" data-wear-verdict={level}>
      <div className={`${tone[0]} text-white p-5`}>
        {big && (
          <>
            <p className="text-sm font-black uppercase tracking-wider opacity-90">{big.label}</p>
            <p className="flex items-end gap-1 mt-1" data-wear-big>
              <span className="font-black tabular-nums leading-none" style={{ fontSize: "clamp(56px, 18vw, 88px)", letterSpacing: "-2px" }}>
                {big.value}
              </span>
              {big.unit && <span className="text-3xl font-black pb-1">{big.unit}</span>}
            </p>
            {big.sub && <p className="text-sm font-bold opacity-95 mt-1">{big.sub}</p>}
          </>
        )}
        <p className={`font-black flex items-center gap-2 ${big ? "text-xl mt-3" : "text-2xl"}`}>
          <Icon className="w-7 h-7 shrink-0" /> {title}
        </p>
      </div>
      <div className="p-4">
        <ul className="space-y-1 text-sm font-semibold text-slate-700">
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
        {register && (
          <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-200 p-3" data-wear-register>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Sul registro di controllo</p>
            <p className="font-black text-slate-800 mt-0.5" data-wear-esito>
              Esito: {register.esito}
            </p>
            <p className="text-sm font-semibold text-slate-700">{register.azione}</p>
            <button type="button" onClick={() => copyReg(register.text)} className="mt-2 h-10 px-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-700 flex items-center gap-1.5" data-action="wear-copy-register">
              {regCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {regCopied ? "Copiato: incollalo sul registro" : "Copia per il registro"}
            </button>
          </div>
        )}
        <button type="button" onClick={onCopy} className="mt-3 h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700 flex items-center gap-1.5" data-action="wear-copy">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copiato: incollalo nel rapporto" : "Copia per il rapporto"}
        </button>
        {onPrint && (
          <button type="button" onClick={onPrint} className="mt-2 w-full h-11 px-3 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-1.5" data-action="wear-print">
            <Printer className="w-4 h-4" /> Stampa il verbale (PDF)
          </button>
        )}
        {onReport && (
          <button type="button" onClick={onReport} className="mt-2 w-full h-11 px-3 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-1.5" data-action="wear-report">
            <FilePlus2 className="w-4 h-4" /> Nuovo rapporto con questo controllo
          </button>
        )}
      </div>
    </div>
  );
};
// il numero grande del verdetto
export const chainBig = (r) => {
  if (r.wear != null) return { label: "Usura della maglia", value: fmt(r.wear), unit: "%", sub: `Scarto oltre il 10% · minimo ${fmt(r.minDm, 2)} mm` };
  const c = r.checks[0];
  return c ? { label: c.label, value: fmt(c.value), unit: "%", sub: `Scarto oltre il ${c.limit}%` } : null;
};
export const ropeBig = (r) => {
  const wireWorse = Math.max(r.s6, r.s30) > (r.dia ? r.dia.sev : -1);
  if (r.dec != null && !wireWorse) return { label: "Calo del diametro", value: fmt(r.dec), unit: "%", sub: `Scarto al ${fmt(r.dia.limit)}%` };
  if (r.b6 > 0 || r.b30 > 0) {
    const six = r.s6 >= r.s30;
    return { label: `Fili rotti su ${six ? "6d" : "30d"}`, value: String(six ? r.b6 : r.b30), unit: (six ? r.b6 : r.b30) === 1 ? "filo" : "fili", sub: `Scarto a ${six ? r.lim.six : r.lim.thirty} fili` };
  }
  return null;
};
export const useCopy = () => {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
      else done();
    } catch (e) {
      done();
    }
  };
  return [copied, copy];
};
// ---------------------------------------------------------------- FASCE E ANELLI (sottoganci di poliestere)
// campo di testo libero (numero Mora, codice)
export const Txt = ({ label, value, onChange, id, hint }) => (
  <label className="block space-y-1">
    <span className="text-xs font-black text-slate-500">{label}</span>
    <input className={INPUT} value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} data-wear-input={id} autoComplete="off" />
    {hint && <span className="block text-[11px] text-slate-400 leading-snug">{hint}</span>}
  </label>
);
export const Pick = ({ value, onChange, options, id }) => {
  const [info, setInfo] = useState(null);
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} data-wear-choice={id}>
      {options.map(([v, l, art]) => (
        <div key={v} className="relative">
          <button
            type="button"
            onClick={() => onChange(v)}
            data-choice={v}
            className={`w-full h-full rounded-2xl border-2 p-2 pt-3 flex flex-col items-center gap-1 text-center ${value === v ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}
          >
            {art}
            <span className="text-[11px] font-black leading-tight">{l}</span>
          </button>
          {INFO[v] && (
            <button type="button" onClick={() => setInfo(v)} aria-label={`Com'è fatta: ${INFO[v].title}`} data-wear-i={v} className="absolute -top-2 -right-1.5 w-7 h-7 rounded-full bg-white border border-slate-300 shadow text-blue-700 flex items-center justify-center">
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
      {info && <InfoSheet id={info} onClose={() => setInfo(null)} />}
    </div>
  );
};
