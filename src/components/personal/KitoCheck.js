// FUNE E CATENA → scheda «Kito»: paranchi elettrici a catena KITO serie KQ e KF.
// KQ: misure (catena, gancio con il disegno delle quote, occhiello, puleggia, molla, freno) con l'esito dai limiti
// del manuale e il verbale PDF; conta ore (U7-01/02/03); codici errore dell'inverter; guasti; procedure.
// KF: controllo del gancio con le misure (a, b, c, d, e, g): standard dal catalogo FAS, limite di scarto +10%
// sull'apertura dalla UNI EN 818-6 (il catalogo non dà limiti di usura), dimensioni standard della catena.
// Dati e testi del manuale in src/kito.js (parola per parola). I disegni sono fatti dall'app.
import React, { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Copy, Check, Printer, Search } from "lucide-react";
import { INPUT } from "./PersonalUi";
import { printWear } from "../WearPrintHost";
import {
  KQ_MODELS,
  KQ_FLAGS,
  KQ_TEXT,
  KQ_SOURCE,
  INV_SOURCE,
  KF_SOURCE,
  kqModel,
  checkKq,
  kqVerdict,
  kqRegister,
  kqReport,
  fmtK,
  LOADS,
  BODIES,
  U7,
  U7_STEPS,
  contaOre,
  INV_KINDS,
  INV_TEXT,
  findInvError,
  KQ_TROUBLE,
  KQ_3VEL,
  KF_CHAINS,
  KF_HOOKS,
  KF_TEXT,
  KF_HOOK_DIMS,
  KF_HOOK_MODELS,
  KF_HOOK_LIMIT,
  KF_HOOK_SOURCE,
  KF_FLAGS,
  checkKf,
  kfVerdict,
  kfRegister,
  kfReport,
} from "../../kito";

const useCopy = () => {
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

const Card = ({ title, children, id }) => (
  <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3" data-kito-card={id}>
    {title && <h4 className="font-black text-slate-800">{title}</h4>}
    {children}
  </section>
);
const Quote = ({ children }) => <p className="text-[12px] text-slate-500 leading-snug">«{children}»</p>;

// ---------------------------------------------------------------- disegni (fatti dall'app)
const tone = (st) => (st === "over" ? "#dc2626" : st === "ok" ? "#059669" : st === "near" ? "#d97706" : "#64748b");
const Dim = ({ x1, y1, x2, y2, label, lx, ly, st, on }) => {
  const c = on ? "#2563eb" : tone(st);
  const w = on ? 2.6 : 1.6;
  return (
    <g data-kito-dim={label} data-on={on ? "1" : "0"}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={w} markerStart={`url(#ka-${on ? "on" : st || "n"})`} markerEnd={`url(#ka-${on ? "on" : st || "n"})`} />
      <circle cx={lx} cy={ly} r={on ? 10 : 8.5} fill={on ? "#2563eb" : "#fff"} stroke={c} strokeWidth="1.5" />
      <text x={lx} y={Number(ly) + 4} textAnchor="middle" fontSize="12" fontWeight="900" fill={on ? "#fff" : c}>
        {label}
      </text>
    </g>
  );
};
const Markers = () => (
  <defs>
    {[
      ["n", "#64748b"],
      ["ok", "#059669"],
      ["over", "#dc2626"],
      ["near", "#d97706"],
      ["on", "#2563eb"],
    ].map(([k, c]) => (
      <marker key={k} id={`ka-${k}`} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M0,1 L9,5 L0,9 z" fill={c} />
      </marker>
    ))}
  </defs>
);
const METAL = { fill: "#e2e8f0", stroke: "#334155", strokeWidth: 2 };

// gancio inferiore KQ: di fronte (a, c), di lato (b); occhiello di sospensione (d, e)
export const KqHookArt = ({ active = "", st = {} }) => (
  <div className="grid grid-cols-[auto_auto] justify-center gap-4 items-end" data-kito-hook-art>
    <svg viewBox="0 0 170 192" className="w-48" aria-label="Gancio inferiore visto di fronte: dimensioni a e c">
      <Markers />
      <rect x="58" y="10" width="44" height="22" rx="6" {...METAL} />
      <path d="M65.8,32 L65.8,71.9 A55,55 0 1,0 127.6,97.5 L131,79 Q129,70 119,78 L103.4,111.5 A27,27 0 1,1 93.5,101.6 L93.5,32 Z" {...METAL} />
      <line x1="95" y1="50" x2="121" y2="80" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
      <line x1="95" y1="50" x2="121" y2="80" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="89" cy="92" r="2.6" fill="#334155" />
      <circle cx="118" cy="93" r="2.6" fill="#334155" />
      <Dim x1="92" y1="96" x2="115" y2="97" label="a" lx="104" ly="130" st={st.a} on={active === "a"} />
      <line x1="104" y1="99" x2="104" y2="120" stroke={active === "a" ? "#2563eb" : "#cbd5e1"} strokeWidth="1" strokeDasharray="3 2" />
      <Dim x1="80" y1="153" x2="80" y2="179" label="c" lx="58" ly="167" st={st.c} on={active === "c"} />
    </svg>
    <svg viewBox="0 0 70 222" className="w-14" aria-label="Gancio inferiore visto di lato: dimensione b">
      <Markers />
      <rect x="25" y="10" width="20" height="22" rx="5" {...METAL} />
      <rect x="29" y="32" width="12" height="38" {...METAL} />
      <rect x="22" y="66" width="26" height="114" rx="13" {...METAL} />
      <Dim x1="22" y1="192" x2="48" y2="192" label="b" lx="35" ly="210" st={st.b} on={active === "b"} />
    </svg>
    <svg viewBox="0 0 230 92" className="col-span-2 w-full max-w-xs mx-auto" aria-label="Occhiello di sospensione: dimensioni d ed e">
      <Markers />
      <path d="M30,74 L95,24 L160,74" fill="none" stroke="#334155" strokeWidth="18" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M30,74 L95,24 L160,74" fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="30" cy="74" r="3.5" fill="#fff" stroke="#334155" strokeWidth="1.5" />
      <circle cx="160" cy="74" r="3.5" fill="#fff" stroke="#334155" strokeWidth="1.5" />
      <Dim x1="95" y1="13" x2="95" y2="35" label="d" lx="118" ly="28" st={st.od} on={active === "od"} />
      <rect x="192" y="22" width="18" height="60" rx="4" {...METAL} />
      <Dim x1="192" y1="12" x2="210" y2="12" label="e" lx="221" ly="44" st={st.oe} on={active === "oe"} />
    </svg>
  </div>
);

// catena: 5 maglie, somma dei passi (dall'interno della 1ª all'interno della 5ª) e diametro del tondino
export const KqChainArt = ({ active = "", st = {} }) => {
  const p = 34;
  const d = 8;
  const x0 = 26;
  return (
    <svg viewBox="0 0 230 90" className="w-full" aria-label="Catena: somma dei passi di 5 maglie e diametro del tondino" data-kito-chain-art>
      <Markers />
      {[0, 1, 2, 3, 4].map((k) => {
        const x = x0 + k * p - d;
        const w = p + 2 * d;
        return k % 2 === 0 ? (
          <rect key={k} x={x} y={18} width={w} height={30} rx={15} fill="none" stroke="#334155" strokeWidth={d} />
        ) : (
          <rect key={k} x={x} y={29} width={w} height={d} rx={d / 2} fill="#cbd5e1" stroke="#334155" strokeWidth="1.5" />
        );
      })}
      <line x1={x0} y1="58" x2={x0} y2="70" stroke="#94a3b8" strokeWidth="1" />
      <line x1={x0 + 5 * p} y1="58" x2={x0 + 5 * p} y2="70" stroke="#94a3b8" strokeWidth="1" />
      <Dim x1={x0} y1="66" x2={x0 + 5 * p} y2="66" label="5p" lx={x0 + 2.5 * p} ly="80" st={st.passo5} on={active === "passo5"} />
      <Dim x1={x0 - d - 12} y1="33" x2={x0 - 1} y2="33" label="d" lx={x0 - d - 6} ly="12" st={st.d} on={active === "d"} />
    </svg>
  );
};

// ---------------------------------------------------------------- campo misura
const Field = ({ id, label, value, onChange, onFocus, unit = "mm", hint, st, std, lim, dir }) => (
  <label className={`block rounded-2xl border-2 p-2.5 ${st === "over" ? "border-red-300 bg-red-50" : st === "near" ? "border-amber-300 bg-amber-50" : st === "ok" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`} data-kito-field={id} data-state={st || ""}>
    <span className="text-xs font-black text-slate-600 block leading-snug">{label}</span>
    <span className="relative block mt-1">
      <input className={`${INPUT} pr-12`} inputMode="decimal" value={value} onFocus={onFocus} onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))} data-kito-input={id} placeholder={std != null ? fmtK(std, 2) : "0"} autoComplete="off" />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{unit}</span>
    </span>
    {(std != null || hint) && (
      <span className="block text-[11px] text-slate-500 mt-1 leading-snug">
        {std != null && (
          <>
            Standard {fmtK(std, 2)}
            {lim != null && ` · limite ${dir === "max" ? "massimo" : "minimo"} ${fmtK(lim, 2)}`}
          </>
        )}
        {hint && <> {hint}</>}
      </span>
    )}
  </label>
);

const Tabs = ({ value, onChange, list, id }) => (
  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" data-kito-tabs={id}>
    {list.map(([v, l]) => (
      <button key={v} type="button" onClick={() => onChange(v)} data-kito-tab={v} className={`shrink-0 h-10 px-3.5 rounded-full text-sm font-black border ${value === v ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>
        {l}
      </button>
    ))}
  </div>
);

// ---------------------------------------------------------------- MISURE KQ
const KqMeasure = () => {
  const [x, setX] = useState({ model: "KQ3SD", passo5: "", d: "", a: "", a0: "", b: "", c: "", od: "", oe: "", puleggia: "", molla: "", frenoB: "", serie: "", ore: "", flags: {} });
  const [active, setActive] = useState("");
  const set = (k) => (v) => setX((o) => ({ ...o, [k]: v }));
  const r = useMemo(() => checkKq(x), [x]);
  const m = r.m;
  const st = {};
  r.items.forEach((i) => {
    st[i.id] = i.over ? "over" : i.state && i.state.level === "attenzione" ? "near" : "ok";
  });
  const [copied, copy] = useCopy();
  const [regCopied, copyReg] = useCopy();
  const v = kqVerdict(r);
  const F = (id, label, extra = {}) => {
    const lim = m[id];
    return <Field id={id} label={label} value={x[id]} onChange={set(id)} onFocus={() => setActive(id)} st={st[id]} std={lim ? lim[0] : null} lim={lim ? lim[1] : null} dir={id === "passo5" ? "max" : "min"} {...extra} />;
  };
  const Tone = r.level === "scarto" ? ["bg-red-600", XCircle] : r.level === "attenzione" ? ["bg-amber-600", AlertTriangle] : ["bg-emerald-600", CheckCircle2];
  const Icon = Tone[1];
  return (
    <div className="space-y-4" data-kito="kq-measure">
      <Card title="Paranco" id="model">
        <div className="grid grid-cols-4 gap-1.5" data-kito-models>
          {KQ_MODELS.map((q) => (
            <button key={q.id} type="button" onClick={() => set("model")(q.id)} data-kito-model={q.id} className={`rounded-2xl border-2 py-2 flex flex-col items-center ${x.model === q.id ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}>
              <span className="text-xs font-black">{q.id}</span>
              <span className="text-[11px] font-bold">{q.wll}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">Catena di carico {m.chain} mm · il modello è sulla targhetta del paranco.</p>
        <div className="grid grid-cols-2 gap-2 items-end">
          <label className="block">
            <span className="text-xs font-black text-slate-500">N. di serie</span>
            <input className={INPUT} value={x.serie} onChange={(e) => set("serie")(e.target.value.toUpperCase())} data-kito-input="serie" autoComplete="off" />
          </label>
          <label className="block">
            <span className="text-xs font-black text-slate-500">Conta ore U7-03</span>
            <input className={INPUT} inputMode="numeric" value={x.ore} onChange={(e) => set("ore")(e.target.value.replace(/\D/g, ""))} data-kito-input="ore" autoComplete="off" />
          </label>
        </div>
        <p className="text-[11px] text-slate-400 -mt-1">Tutti e due facoltativi: vanno sul verbale.</p>
      </Card>

      <Card title="Catena di carico" id="chain">
        <KqChainArt active={active} st={st} />
        <div className="grid grid-cols-2 gap-2">
          {F("passo5", "Somma dei passi di 5 maglie")}
          {F("d", "Diametro del tondino (d)")}
        </div>
        <Quote>{KQ_TEXT.catena}</Quote>
        <p className="text-[12px] text-slate-500 leading-snug">
          Somma di 5 maglie: non superare il limite massimo · diametro: non superare il limite minimo (tabella del manuale). «{KQ_TEXT.catenaNota}»
        </p>
      </Card>

      <Card title="Gancio inferiore e occhiello di sospensione" id="hook">
        <KqHookArt active={active} st={st} />
        <p className="text-[11px] text-slate-500 -mt-1">I due puntini sono i segni in rilievo sul gancio: la «a» si misura tra quelli. Tocca un campo e la quota da misurare si colora di blu nel disegno.</p>
        <div className="grid grid-cols-2 gap-2">
          <Field id="a" label="a · apertura del gancio" value={x.a} onChange={set("a")} onFocus={() => setActive("a")} std={m.a} st={r.aInfo && r.aInfo.ref ? (r.aInfo.diff > 0 ? "near" : "ok") : ""} hint="(misurata tra i segni in rilievo)" />
          <Field id="a0" label="a · registrata all'acquisto" value={x.a0} onChange={set("a0")} onFocus={() => setActive("a")} hint="se ce l'hai" />
          {F("b", "b · larghezza del gancio")}
          {F("c", "c · spessore del gancio")}
          {F("od", "d · spessore dell'occhiello")}
          {F("oe", "e · larghezza dell'occhiello")}
        </div>
        {r.aInfo && (
          <p className="text-sm font-bold text-slate-700" data-kito-a>
            Apertura a: {fmtK(r.aInfo.v, 2)} mm
            {r.aInfo.ref ? ` · all'acquisto ${fmtK(r.aInfo.ref, 2)} mm → ${r.aInfo.diff >= 0 ? "+" : ""}${fmtK(r.aInfo.diff, 2)} mm` : ` · standard ${fmtK(r.aInfo.std, 2)} mm`}
          </p>
        )}
        <Quote>{KQ_TEXT.gancio}</Quote>
        <p className="text-[12px] text-slate-500 leading-snug">
          Valore limite di a: «{KQ_TEXT.gancioLimiteA}» · di b, c, d, e: «{KQ_TEXT.usura5}» «{KQ_TEXT.gancioRischio}»
        </p>
      </Card>

      <Card title="Puleggia, molla e freno" id="other">
        <div className="grid grid-cols-2 gap-2">
          {F("puleggia", "Puleggia di carico · spessore", { hint: "(punto usurato, calibro a corsoio)" })}
          {m.molla ? F("molla", "Molla della catena · lunghezza") : <p className="text-[11px] text-slate-400 self-center">Molla della catena: il manuale dà i limiti solo per KQ5SD e KQ10SD.</p>}
          {F("frenoB", "Freno · dimensione B", { hint: "(se il freno è smontato)" })}
        </div>
        {r.items
          .filter((i) => i.id === "frenoB" && i.state)
          .map((i) => (
            <p key="fb" className={`text-sm font-bold ${i.state.level === "scarto" ? "text-red-700" : i.state.level === "attenzione" ? "text-amber-700" : "text-emerald-700"}`} data-kito-frenob={i.state.level}>
              {i.state.cond} → {i.state.azione}
            </p>
          ))}
        <Quote>{KQ_TEXT.freno}</Quote>
        <Quote>{KQ_TEXT.frenoB1}</Quote>
      </Card>

      <Card title="Controllo a vista" id="flags">
        <div className="space-y-2">
          {KQ_FLAGS.map((f) => (
            <label key={f.id} className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" className="mt-1 w-4 h-4" checked={!!x.flags[f.id]} onChange={(e) => set("flags")({ ...x.flags, [f.id]: e.target.checked })} data-kito-flag={f.id} />
              <span className="flex-1">
                {f.label}
                {x.flags[f.id] && <span className="block text-xs font-bold text-red-700">Rimedio: {f.rimedio}</span>}
              </span>
            </label>
          ))}
        </div>
      </Card>

      {r.any && (
        <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-lg" data-kito-verdict={r.level}>
          <div className={`${Tone[0]} text-white p-5`}>
            <p className="text-sm font-black uppercase tracking-wider opacity-90">KITO {m.id} · {m.wll}</p>
            <p className="font-black text-2xl flex items-center gap-2 mt-1">
              <Icon className="w-7 h-7 shrink-0" /> {r.level === "scarto" ? "Da sistemare" : r.level === "attenzione" ? "Entro i limiti, vicino" : "Entro i limiti"}
            </p>
          </div>
          <div className="p-4 space-y-2">
            <ul className="space-y-1 text-sm font-semibold text-slate-700">
              {r.items.map((i) => (
                <li key={i.id} data-kito-line={i.id}>
                  <span className={i.over ? "text-red-700" : ""}>
                    {i.label}: {fmtK(i.v, 2)} mm ({i.dir === "max" ? "max" : "min"} {fmtK(i.limit, 2)}) → {i.over ? `OLTRE IL LIMITE · ${i.rimedio}` : "entro il limite"}
                  </span>
                </li>
              ))}
              {r.flags.map((f) => (
                <li key={f.id} className="text-red-700">
                  {f.label} → {f.rimedio}
                </li>
              ))}
            </ul>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3" data-kito-register>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Sul registro di controllo</p>
              <p className="font-black text-slate-800 mt-0.5" data-kito-esito>
                Esito: {v.esito}
              </p>
              <p className="text-sm font-semibold text-slate-700">{v.azione}</p>
              <button type="button" onClick={() => copyReg(kqRegister({ r }))} className="mt-2 h-10 px-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-700 flex items-center gap-1.5" data-action="kito-copy-register">
                {regCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {regCopied ? "Copiato: incollalo sul registro" : "Copia per il registro"}
              </button>
            </div>
            <button type="button" onClick={() => copy(kqRegister({ r }))} className="h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700 flex items-center gap-1.5" data-action="kito-copy">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copiato: incollalo nel rapporto" : "Copia per il rapporto"}
            </button>
            <button type="button" onClick={() => printWear(kqReport({ r, x }))} className="w-full h-11 px-3 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-1.5" data-action="kito-print">
              <Printer className="w-4 h-4" /> Stampa il verbale (PDF)
            </button>
          </div>
        </div>
      )}
      <p className="text-[11px] text-slate-400 text-center">{KQ_SOURCE}.</p>
    </div>
  );
};

// ---------------------------------------------------------------- CONTA ORE
const KqHours = () => {
  const [x, setX] = useState({ u1: "", u2: "", ore: "", load: "", body: "" });
  const set = (k) => (v) => setX((o) => ({ ...o, [k]: v }));
  const r = contaOre(x);
  const NumIn = ({ id, label }) => (
    <label className="block">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <input className={INPUT} inputMode="numeric" value={x[id]} onChange={(e) => set(id)(e.target.value.replace(/\D/g, ""))} data-kito-input={id} autoComplete="off" placeholder="0" />
    </label>
  );
  return (
    <div className="space-y-4" data-kito="kq-hours">
      <Card title="Leggi il conta ore sul display dell'inverter" id="u7">
        <ol className="space-y-1.5 text-sm text-slate-700 list-decimal pl-5">
          {U7_STEPS.map((s, i) => (
            <li key={i}>
              {s.map((t, j) =>
                /^\[.*\]$/.test(t) ? (
                  <kbd key={j} className="inline-block px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-800 text-white text-[11px] font-black align-middle">
                    {t.slice(1, -1)}
                  </kbd>
                ) : (
                  <span key={j}>{t}</span>
                ),
              )}
            </li>
          ))}
        </ol>
        <div className="space-y-1">
          {U7.map(([c, n, t]) => (
            <p key={c} className="text-[12px] text-slate-600 leading-snug">
              <b>{c}</b> {n}: {t}
            </p>
          ))}
        </div>
      </Card>
      <Card title="Scrivi i valori" id="values">
        <div className="grid grid-cols-3 gap-2">
          {NumIn({ id: "u1", label: "U7-01" })}
          {NumIn({ id: "u2", label: "U7-02" })}
          {NumIn({ id: "ore", label: "U7-03 (ore)" })}
        </div>
        {r.avv > 0 && (
          <p className="text-sm font-black text-slate-800" data-kito-avv>
            Avviamenti: {x.u1 || 0} x 1000 + {x.u2 || 0} = {fmtK(r.avv, 0)}
          </p>
        )}
        <p className="text-xs font-black text-slate-500">Condizione di carico</p>
        <div className="grid grid-cols-2 gap-1.5">
          {LOADS.map((l) => (
            <button key={l.id} type="button" onClick={() => set("load")(l.id)} data-kito-load={l.id} className={`rounded-2xl border-2 p-2 text-left ${x.load === l.id ? "border-blue-500 bg-blue-50" : "border-slate-200"}`}>
              <span className="block text-sm font-black text-slate-800">{l.label}</span>
              <span className="block text-[11px] text-slate-500 leading-snug">{l.text}</span>
            </button>
          ))}
        </div>
        <p className="text-xs font-black text-slate-500">Dimensione corpo paranco</p>
        <div className="flex gap-1.5">
          {BODIES.map((b) => (
            <button key={b.id} type="button" onClick={() => set("body")(b.id)} data-kito-body={b.id} className={`flex-1 h-10 rounded-xl border-2 text-sm font-black ${x.body === b.id ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}>
              {b.label}
            </button>
          ))}
        </div>
      </Card>
      <Card title="Linee guida del manuale" id="guide">
        <ul className="space-y-2">
          {r.rows.map((row) => (
            <li key={row.id} className={`rounded-2xl border p-2.5 ${row.has && row.reached ? "border-red-300 bg-red-50" : "border-slate-200"}`} data-kito-hours={row.id} data-reached={row.has && row.reached ? "1" : "0"}>
              <p className="text-sm font-black text-slate-800">{row.label}</p>
              <p className="text-[12px] text-slate-600">{row.when}</p>
              {row.has && (
                <p className={`text-[12px] font-black ${row.reached ? "text-red-700" : "text-emerald-700"}`}>
                  {row.value}: {row.reached ? "raggiunto" : "non ancora raggiunto"}
                </p>
              )}
              {row.note && <p className="text-[11px] text-slate-500 mt-0.5">«{row.note}»</p>}
            </li>
          ))}
        </ul>
        {!x.load && !x.body && <p className="text-[11px] text-slate-400">Scegli la condizione di carico e la dimensione del corpo per vedere olio, ingranaggi, albero, cuscinetti e gancio.</p>}
        <p className="text-[12px] text-slate-500 leading-snug">«{KQ_TEXT.contaOre}» «{KQ_TEXT.contaOreNota}»</p>
        <p className="text-[12px] text-slate-500 leading-snug">
          Olio: KQ1SD, KQ3SD, KQ5SD 510 ml · KQ10SD 840 ml · Olio originale KITO. «{KQ_TEXT.olio}»
        </p>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------- CODICI ERRORE
const InvErrors = () => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState("");
  const list = findInvError(q);
  return (
    <div className="space-y-4" data-kito="errors">
      <Card id="search">
        <label className="relative block">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${INPUT} pl-10 uppercase`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Scrivi la sigla del display (es. oL1, Uv, GF)" data-kito-input="err" autoComplete="off" autoCapitalize="characters" />
        </label>
        <p className="text-[12px] text-slate-500 leading-snug">
          Caratteri <b>accesi</b> = errore (il motore si ferma). Caratteri che <b>lampeggiano</b> = errore/avvertimento di entità minore (il motore non si arresta).
        </p>
      </Card>
      {list.length === 0 && <p className="text-sm text-slate-500 text-center" data-kito-err-none>Nessuna sigla così nel manuale dell'inverter.</p>}
      <div className="space-y-2">
        {list.map((e) => {
          const k = `${e.code}|${e.kind}`;
          const isOpen = open === k || list.length <= 2;
          const K = INV_KINDS[e.kind];
          return (
            <div key={k} className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-kito-err={e.code} data-kind={e.kind}>
              <button type="button" onClick={() => setOpen(isOpen && list.length > 2 ? "" : k)} className="w-full text-left p-3 flex items-center gap-3">
                <span className={`min-w-16 px-2 h-10 rounded-xl font-mono font-black text-lg flex items-center justify-center ${e.kind === "minore" ? "bg-amber-100 text-amber-800" : e.kind === "funz" ? "bg-slate-200 text-slate-800" : "bg-red-100 text-red-800"}`}>{e.code}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-black text-slate-800 leading-snug">{e.name}</span>
                  <span className="block text-[11px] text-slate-500">{K.label}</span>
                </span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2 text-sm text-slate-700">
                  {e.desc && <p className="text-[13px]">{e.desc}</p>}
                  <div>
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Causa</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {e.cause.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Provvedimento</p>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {e.fix.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                  {e.note && <p className="text-[12px] text-slate-500">{e.note}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Card title="Dopo l'errore" id="reset">
        <Quote>{INV_TEXT.reset}</Quote>
        <Quote>{INV_TEXT.primaDiRidare}</Quote>
        <Quote>{INV_TEXT.storico}</Quote>
        <Quote>{INV_TEXT.cause}</Quote>
        <p className="text-[12px] font-bold text-red-700 leading-snug">«{KQ_TEXT.parametri}»</p>
        <p className="text-[11px] text-slate-400">{INV_SOURCE}, pag. 13-24.</p>
      </Card>
    </div>
  );
};

// ---------------------------------------------------------------- GUASTI
const KqTrouble = ({ onCodes }) => {
  const [open, setOpen] = useState(-1);
  const groups = [];
  KQ_TROUBLE.forEach((t, i) => {
    const g = groups.find((x) => x.p === t.p);
    if (g) g.items.push({ ...t, i });
    else groups.push({ p: t.p, items: [{ ...t, i }] });
  });
  return (
    <div className="space-y-3" data-kito="trouble">
      <p className="text-[12px] text-slate-500 px-1">Guida alla risoluzione dei problemi del manuale KQ: tocca il problema per vedere cause ed elementi da verificare (con la pagina del manuale).</p>
      {groups.map((g) => (
        <div key={g.p} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <p className="px-3 pt-3 pb-1 text-[11px] font-black text-slate-500 uppercase tracking-wider">{g.p}</p>
          {g.items.map((t) => (
            <div key={t.i} className="border-t border-slate-100 first:border-t-0" data-kito-trouble={t.i}>
              <button type="button" onClick={() => setOpen(open === t.i ? -1 : t.i)} className="w-full text-left px-3 py-2.5 text-sm font-black text-slate-800">
                {t.s || t.p}
              </button>
              {open === t.i && (
                <div className="px-3 pb-3 space-y-2 text-sm text-slate-700">
                  <div>
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Causa</p>
                    <ul className="list-disc pl-5">
                      {t.c.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                  {t.e.length > 0 && (
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Elemento da verificare</p>
                      <ul className="list-disc pl-5">
                        {t.e.map(([e, pg]) => (
                          <li key={e}>
                            {e}
                            {pg && <span className="text-slate-400"> · pag. {pg}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {t.codes && (
                    <button type="button" onClick={onCodes} className="h-10 px-3 rounded-xl bg-slate-900 text-white text-sm font-bold" data-action="kito-to-codes">
                      Apri i codici errore
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
      <p className="text-[11px] text-slate-400 text-center">{KQ_SOURCE}, pag. 78-79.</p>
    </div>
  );
};

// ---------------------------------------------------------------- PROCEDURE E LUBRIFICAZIONE
const KqInfo = () => (
  <div className="space-y-4" data-kito="info">
    <Card title="3 velocità" id="3vel">
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
        <p className="text-xs font-black text-slate-500">Togliere la 3 velocità</p>
        <p className="text-sm font-bold text-slate-800">{KQ_3VEL.togliere}</p>
      </div>
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
        <p className="text-xs font-black text-slate-500">Per mettere la 3 velocità</p>
        <p className="text-sm font-bold text-slate-800">{KQ_3VEL.mettere}</p>
      </div>
      <p className="text-[11px] text-slate-400">{KQ_3VEL.source}.</p>
    </Card>
    <Card title="Lubrificazione della catena" id="lube">
      <Quote>{KQ_TEXT.lubrificazione}</Quote>
      <Quote>{KQ_TEXT.lubrificazione2}</Quote>
      <Quote>{KQ_TEXT.lubrificazione3}</Quote>
      <p className="text-sm font-bold text-slate-700">{KQ_TEXT.grasso}</p>
    </Card>
    <Card title="Olio per ingranaggi" id="oil">
      <p className="text-sm text-slate-700">KQ1SD, KQ3SD, KQ5SD: 510 ml · KQ10SD: 840 ml · Olio originale KITO (per il rabbocco sono disponibili bottiglie da 0,8 l).</p>
      <Quote>{KQ_TEXT.olio}</Quote>
      <Quote>{KQ_TEXT.olio5}</Quote>
    </Card>
    <Card title="Prima di mettere le mani" id="safety">
      <Quote>{KQ_TEXT.cinqueMinuti}</Quote>
      <Quote>{KQ_TEXT.ventola}</Quote>
      <Quote>{KQ_TEXT.ricambi}</Quote>
    </Card>
  </div>
);

// ---------------------------------------------------------------- KF
// gancio KF visto di fronte con le 6 quote del catalogo (disegno fatto dall'app)
export const KfHookArt = ({ active = "", st = {} }) => (
  <div className="flex justify-center" data-kito-kf-art>
    <svg viewBox="0 0 230 250" className="w-64" aria-label="Gancio KF: quote a, b, c, d, e, g">
      <Markers />
      {/* gambo */}
      <rect x="100" y="8" width="30" height="60" rx="4" {...METAL} />
      {/* corpo del gancio: gambo → curva → punta */}
      <path d="M104,68 L104,120 A52,52 0 1,0 176,150 L190,122 Q188,112 178,118 L160,150 A26,26 0 1,1 126,112 L126,68 Z" {...METAL} />
      {/* sicurezza antisgancio */}
      <line x1="128" y1="80" x2="182" y2="122" stroke="#334155" strokeWidth="5" strokeLinecap="round" />
      <line x1="128" y1="80" x2="182" y2="122" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
      {/* d: gambo */}
      <Dim x1="100" y1="40" x2="130" y2="40" label="d" lx="150" ly="38" st={st.d} on={active === "d"} />
      {/* a: apertura (dal gambo alla punta) */}
      <Dim x1="128" y1="138" x2="176" y2="138" label="a" lx="152" ly="162" st={st.a} on={active === "a"} />
      <line x1="152" y1="141" x2="152" y2="152" stroke={active === "a" ? "#2563eb" : "#cbd5e1"} strokeWidth="1" strokeDasharray="3 2" />
      {/* e: profondità della gola (dal fondo alla punta) */}
      <Dim x1="60" y1="182" x2="60" y2="118" label="e" lx="40" ly="150" st={st.e} on={active === "e"} />
      <line x1="62" y1="182" x2="126" y2="182" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 2" />
      <line x1="62" y1="118" x2="190" y2="118" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 2" />
      {/* c: spessore nel fondo della gola */}
      <Dim x1="74" y1="212" x2="74" y2="240" label="c" lx="52" ly="228" st={st.c} on={active === "c"} />
      <line x1="76" y1="212" x2="126" y2="212" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 2" />
      <line x1="76" y1="240" x2="126" y2="240" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 2" />
      {/* g: larghezza della punta */}
      <Dim x1="178" y1="112" x2="192" y2="122" label="g" lx="212" ly="108" st={st.g} on={active === "g"} />
    </svg>
    <svg viewBox="0 0 60 250" className="w-16" aria-label="Gancio KF di lato: quota b">
      <Markers />
      <rect x="20" y="8" width="20" height="60" rx="4" {...METAL} />
      <rect x="16" y="66" width="28" height="140" rx="14" {...METAL} />
      <Dim x1="16" y1="222" x2="44" y2="222" label="b" lx="30" ly="242" st={st.b} on={active === "b"} />
    </svg>
  </div>
);

const KfHook = () => {
  const [x, setX] = useState({ model: KF_HOOK_MODELS[4], kind: "SV", a: "", b: "", c: "", d: "", e: "", g: "", serie: "", flags: {} });
  const [active, setActive] = useState("");
  const set = (k) => (v) => setX((o) => ({ ...o, [k]: v }));
  const r = useMemo(() => checkKf(x), [x]);
  const [copied, copy] = useCopy();
  const [regCopied, copyReg] = useCopy();
  const st = {};
  r.items.forEach((i) => {
    st[i.id] = i.over ? "over" : i.near ? "near" : "ok";
  });
  const v = kfVerdict(r);
  const Tone = r.level === "scarto" ? ["bg-red-600", XCircle] : r.level === "attenzione" ? ["bg-amber-500", AlertTriangle] : ["bg-emerald-600", CheckCircle2];
  const Icon = Tone[1];
  return (
    <div className="space-y-4" data-kito="kf-hook">
      <div className="rounded-2xl bg-sky-50 border border-sky-200 p-3 text-[12px] text-sky-900 leading-snug" data-kito-kf-source>
        <b>Da dove vengono i numeri.</b> Le misure standard (da nuovo) sono quelle del catalogo FAS/KITO serie KF. Il catalogo <b>non dà limiti di usura</b>: il limite di scarto dell'apertura (+{KF_HOOK_LIMIT}%) è della <b>UNI EN 818-6</b>, non del costruttore. Per le altre quote l'app ti dice solo di quanto ti scosti dallo standard. Fa sempre fede il manuale del costruttore.
      </div>
      <Card title="Quale paranco e quale gancio" id="kfmodel">
        <label className="block">
          <span className="text-xs font-black text-slate-500">Paranco</span>
          <select className={INPUT} value={x.model} onChange={(e) => set("model")(e.target.value)} data-kito-select="kfmodel">
            {KF_HOOK_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-1.5" data-kito-kind>
          {[
            ["SV", "Gancio di carico", "SV · quello in basso, col bozzello"],
            ["SP", "Gancio di sospensione", "SP · quello in alto, che regge il paranco"],
          ].map(([id, l, sub]) => (
            <button key={id} type="button" onClick={() => set("kind")(id)} data-kito-kind-btn={id} className={`rounded-2xl border-2 px-2 py-2 text-left ${x.kind === id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}>
              <span className={`block text-sm font-black ${x.kind === id ? "text-blue-800" : "text-slate-700"}`}>{l}</span>
              <span className="block text-[11px] text-slate-500 leading-tight">{sub}</span>
            </button>
          ))}
        </div>
        <label className="block">
          <span className="text-xs font-black text-slate-500">Numero di serie del paranco (per il verbale, facoltativo)</span>
          <input className={INPUT} value={x.serie} onChange={(e) => set("serie")(e.target.value)} data-kito-input="kfserie" autoComplete="off" />
        </label>
      </Card>
      <Card title="Misura il gancio" id="kfmeasure">
        <KfHookArt active={active} st={st} />
        <p className="text-[11px] text-slate-500 -mt-1">Tocca un campo e la quota da misurare si colora di blu nel disegno. Verde: come da nuovo. Arancio: si scosta. Rosso: apertura oltre il limite della EN 818-6.</p>
        <div className="grid grid-cols-2 gap-2">
          {KF_HOOK_DIMS.map(([id, label, where]) => (
            <Field key={id} id={id} label={label} value={x[id]} onChange={set(id)} onFocus={() => setActive(id)} st={st[id]} std={r.std ? r.std[id] : null} lim={id === "a" && r.std ? Math.round(r.std.a * (1 + KF_HOOK_LIMIT / 100) * 100) / 100 : null} dir="max" hint={where} />
          ))}
        </div>
      </Card>
      <Card title="Controllo a vista" id="kfflags">
        <div className="space-y-2">
          {KF_FLAGS.map((f) => (
            <label key={f.id} className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" className="mt-1 w-4 h-4" checked={!!x.flags[f.id]} onChange={(e) => set("flags")({ ...x.flags, [f.id]: e.target.checked })} data-kito-flag={"kf-" + f.id} />
              <span className="flex-1">
                {f.label}
                {x.flags[f.id] && <span className="block text-xs font-bold text-red-700">Rimedio: {f.rimedio}</span>}
              </span>
            </label>
          ))}
        </div>
      </Card>
      {r.any && (
        <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-lg" data-kito-verdict={r.level}>
          <div className={`${Tone[0]} text-white p-5`}>
            <p className="text-sm font-black uppercase tracking-wider opacity-90">Gancio KITO KF {r.kind} · {r.wll}</p>
            <p className="font-black text-2xl flex items-center gap-2 mt-1">
              <Icon className="w-7 h-7 shrink-0" /> {r.level === "scarto" ? "Da sostituire" : r.level === "attenzione" ? "Si scosta dallo standard" : "Come da nuovo"}
            </p>
          </div>
          <div className="p-4 space-y-2">
            <ul className="space-y-1 text-sm font-semibold text-slate-700">
              {r.items.map((i) => (
                <li key={i.id} data-kito-line={"kf-" + i.id}>
                  <span className={i.over ? "text-red-700" : i.near ? "text-amber-700" : ""}>
                    {i.label}: {fmtK(i.v, 2)} mm · standard {fmtK(i.std, 2)} · {i.diff > 0 ? "+" : ""}
                    {fmtK(i.diff, 2)} mm ({i.pct > 0 ? "+" : ""}
                    {fmtK(i.pct, 1)}%){i.limit != null ? ` · limite EN 818-6 ${fmtK(i.limit, 2)} → ${i.over ? "OLTRE IL LIMITE" : "entro il limite"}` : ""}
                  </span>
                </li>
              ))}
              {r.flags.map((f) => (
                <li key={f.id} className="text-red-700">
                  {f.label} → {f.rimedio}
                </li>
              ))}
            </ul>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3" data-kito-register>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Sul registro di controllo</p>
              <p className="font-black text-slate-800 mt-0.5" data-kito-esito>
                Esito: {v.esito}
              </p>
              <p className="text-sm font-semibold text-slate-700">{v.azione}</p>
              <button type="button" onClick={() => copyReg(kfRegister({ r }))} className="mt-2 h-10 px-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-700 flex items-center gap-1.5" data-action="kito-kf-copy-register">
                {regCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {regCopied ? "Copiato: incollalo sul registro" : "Copia per il registro"}
              </button>
            </div>
            <button type="button" onClick={() => copy(kfRegister({ r }))} className="h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700 flex items-center gap-1.5" data-action="kito-kf-copy">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copiato: incollalo nel rapporto" : "Copia per il rapporto"}
            </button>
            <button type="button" onClick={() => printWear(kfReport({ r, x }))} className="w-full h-11 px-3 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-1.5" data-action="kito-kf-print">
              <Printer className="w-4 h-4" /> Stampa il verbale (PDF)
            </button>
          </div>
        </div>
      )}
      <p className="text-[11px] text-slate-400 text-center">{KF_HOOK_SOURCE}.</p>
    </div>
  );
};

const KfTables = () => (
  <div className="space-y-4" data-kito="kf">
    <Card title="KF · dimensioni standard della catena" id="kfchain">
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-[12px] text-slate-700" data-kito-kf-chain>
          <thead>
            <tr className="text-[10px] text-slate-500 uppercase">
              <th className="text-left p-1">Tipo</th>
              <th className="p-1">Portata</th>
              <th className="p-1">d</th>
              <th className="p-1">a int.</th>
              <th className="p-1">b est.</th>
              <th className="p-1">Passo p</th>
              <th className="p-1">kg/m</th>
            </tr>
          </thead>
          <tbody>
            {KF_CHAINS.map((c) => (
              <tr key={c[0]} className="border-t border-slate-100 text-center">
                <td className="text-left p-1 font-black whitespace-nowrap">{c[0]}</td>
                <td className="p-1">{c[1]}</td>
                {c.slice(2).map((v, i) => (
                  <td key={i} className="p-1 tabular-nums">
                    {fmtK(v, 2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-500">d = diametro · a = larghezza interna · b = larghezza esterna · p = passo (mm) · peso per 1 m di corsa del gancio. Per l'usura della catena usa la scheda «Catena» (del paranco).</p>
    </Card>
    <Card title="KF · dimensioni standard del gancio" id="kfhook">
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-[12px] text-slate-700" data-kito-kf-hook>
          <thead>
            <tr className="text-[10px] text-slate-500 uppercase">
              <th className="text-left p-1">Tipo</th>
              <th className="p-1">Portata</th>
              {["a", "b", "c", "d", "e", "g"].map((k) => (
                <th key={k} className="p-1">
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {KF_HOOKS.map((h, i) => (
              <tr key={i} className="border-t border-slate-100 text-center">
                <td className="text-left p-1 font-black">{h[0]}</td>
                <td className="p-1">{h[1]}</td>
                {h.slice(2).map((v, j) => (
                  <td key={j} className="p-1 tabular-nums">
                    {fmtK(v, 1)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-500">{KF_TEXT.tipi}. Misure in mm.</p>
      <p className="text-[12px] font-bold text-amber-700">Il catalogo KF riporta solo le dimensioni standard: non indica limiti di usura.</p>
      <p className="text-[11px] text-slate-400">{KF_SOURCE}.</p>
    </Card>
  </div>
);

const KfView = () => {
  const [sec, setSec] = useState("gancio");
  return (
    <>
      <Tabs
        id="kf"
        value={sec}
        onChange={setSec}
        list={[
          ["gancio", "Gancio"],
          ["tabelle", "Tabelle catalogo"],
        ]}
      />
      {sec === "gancio" ? <KfHook /> : <KfTables />}
    </>
  );
};

export const KitoCheck = () => {
  const [serie, setSerie] = useState("kq");
  const [sec, setSec] = useState("misure");
  return (
    <div className="space-y-4" data-section="wear-kito">
      <div className="px-1">
        <h3 className="font-black text-slate-800 text-lg leading-tight">Ganci Kito</h3>
        <p className="text-xs text-slate-500">Paranchi elettrici a catena KITO: gancio, catena e controlli</p>
      </div>
      <div className="flex bg-slate-200/70 p-1 rounded-2xl" data-kito-serie>
        {[
          ["kq", "Kito KQ", "limiti dal manuale FAS/KITO"],
          ["kf", "Kito KF", "limite dalla UNI EN 818-6"],
        ].map(([id, l, sub]) => (
          <button key={id} type="button" onClick={() => setSerie(id)} data-kito-serie-btn={id} className={`flex-1 min-h-12 py-1 rounded-xl leading-tight ${serie === id ? "bg-white text-slate-800 shadow" : "text-slate-500"}`}>
            <span className="block text-sm font-black">{l}</span>
            <span className={`block text-[10px] font-bold ${serie === id ? "text-slate-500" : "text-slate-400"}`}>{sub}</span>
          </button>
        ))}
      </div>
      {serie === "kf" ? (
        <KfView />
      ) : (
        <>
          <Tabs
            id="kq"
            value={sec}
            onChange={setSec}
            list={[
              ["misure", "Misure"],
              ["errori", "Codici errore"],
              ["guasti", "Guasti"],
              ["ore", "Conta ore"],
              ["info", "Procedure"],
            ]}
          />
          {sec === "misure" && <KqMeasure />}
          {sec === "errori" && <InvErrors />}
          {sec === "guasti" && <KqTrouble onCodes={() => setSec("errori")} />}
          {sec === "ore" && <KqHours />}
          {sec === "info" && <KqInfo />}
        </>
      )}
    </div>
  );
};

// per il modello scelto (usato dalle prove)
export { kqModel };
