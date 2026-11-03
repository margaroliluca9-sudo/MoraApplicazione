// MISURA RAPIDA di catena e fune: si apre con un tocco dal riquadro «Misura» della Home (o dal collegamento
// sull'icona dell'app: /?misura=catena, /?misura=fune). Il tecnico è sotto la gru col calibro: scrive il
// diametro nominale e la misura e in un attimo vede il risultato, grande, in cima (non lo copre la tastiera).
// Le regole sono quelle di src/wearRules.js (le stesse del controllo completo nella Mia area).
import React, { useMemo, useRef, useState } from "react";
import { X, Minus, Plus, Copy, Check, ChevronRight, Printer } from "lucide-react";
import { checkChain, checkRope, measureFixed } from "../wearRules";
import { InfoBtn, printWear } from "./personal/WearPanel";
import { ropeVerdict, chainVerdict, ropeRegister, chainRegister, ropeReport, chainReport } from "../wearRegister";

const KEY = "mora_quick_wear_v1";
const load = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
  } catch (e) {
    return {};
  }
};
const store = (v) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch (e) {
    // niente
  }
};
const num = (v) => Number(String(v || "").replace(",", ".")) || 0;
const fmt = (v, dec = 1) => (v == null || Number.isNaN(v) ? "—" : Number(v).toLocaleString("it-IT", { maximumFractionDigits: dec, minimumFractionDigits: 0 }));
const clean = (v) => String(v).replace(/[^0-9.,]/g, "").replace(".", ",");
// «950» con nominale 10 → «letto come 9,5 mm»
const readAs = (raw, ref) => {
  const f = measureFixed(raw, ref);
  return f != null ? `Letto come ${fmt(f, 2)} mm` : "";
};

// diametri più comuni (un tocco e il nominale è scritto)
const CHAIN_D = ["4", "5", "6", "7", "8", "9", "10", "11,3", "13", "16"];
const ROPE_D = ["6", "8", "10", "12", "14", "16", "18", "20"];

const QW_CSS = `
.qw-big { font-size: clamp(64px, 22vw, 108px); line-height: .9; font-weight: 900; letter-spacing: -2px; font-variant-numeric: tabular-nums; }
.qw-mid { font-size: clamp(40px, 13vw, 60px); line-height: .95; font-weight: 900; letter-spacing: -1px; font-variant-numeric: tabular-nums; }
.qw-in { font-size: 30px; font-weight: 900; font-variant-numeric: tabular-nums; }
.qw-ok { background: #059669; color: #fff; }
.qw-warn { background: #d97706; color: #fff; }
.qw-bad { background: #dc2626; color: #fff; }
.qw-idle { background: #334155; color: #e2e8f0; }
.qw-track { position: relative; height: 12px; border-radius: 999px; background: rgba(255,255,255,.28); overflow: visible; }
.qw-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; background: #fff; }
.qw-mark { position: absolute; top: -5px; bottom: -5px; width: 3px; border-radius: 2px; background: #0f172a; }
@keyframes qwPop { 0% { transform: scale(.97); } 100% { transform: scale(1); } }
.qw-pop { animation: qwPop .18s ease-out; }
@media (prefers-reduced-motion: reduce) { .qw-pop { animation: none; } }
`;

const TONE = { ok: "qw-ok", attenzione: "qw-warn", scarto: "qw-bad" };
const WORD = { ok: "IDONEA", attenzione: "VICINA AL LIMITE", scarto: "DA SCARTARE" };

// campo numerico grande (tastiera dei numeri)
const BigNum = ({ label, value, onChange, id, inputRef, hint, autoFocus = false, info = "" }) => (
  <label className="block">
    <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 min-h-7">
      <span>{label}</span>
      {info && <InfoBtn id={info} label={label} />}
    </span>
    <span className="relative block mt-1">
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        className="qw-in w-full h-16 pl-4 pr-14 bg-white border-2 border-slate-300 rounded-2xl text-slate-900 outline-none focus:border-blue-500"
        inputMode="decimal"
        enterKeyHint="next"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(clean(e.target.value))}
        onFocus={(e) => e.target.select()}
        data-quick-input={id}
        placeholder="0"
      />
      <span className="absolute right-4 text-lg font-black text-slate-400" style={{ top: "50%", transform: "translateY(-50%)" }}>mm</span>
    </span>
    {hint && <span className="block text-xs text-slate-500 mt-1 leading-snug">{hint}</span>}
  </label>
);

const Presets = ({ list, value, onPick }) => (
  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1" data-quick-presets>
    {list.map((d) => (
      <button
        key={d}
        type="button"
        onClick={() => onPick(d)}
        data-quick-preset={d}
        className={`h-10 min-w-[48px] px-3 rounded-xl text-base font-black shrink-0 border ${value === d ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"}`}
      >
        {d}
      </button>
    ))}
  </div>
);

// contatore grande (fili rotti) con − e +
const Counter = ({ label, value, onChange, id, limit, info = "", note = "" }) => (
  <div>
    <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 min-h-7">
      <span>{label}</span>
      {info && <InfoBtn id={info} label={label} />}
    </span>
    <div className="mt-1 flex items-center gap-2">
      <button type="button" aria-label={`Meno ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-300 flex items-center justify-center shrink-0">
        <Minus className="w-6 h-6 text-slate-700" />
      </button>
      <span className="qw-in flex-1 text-center text-slate-900" data-quick-count={id}>
        {value}
      </span>
      <button type="button" aria-label={`Più ${label}`} onClick={() => onChange(value + 1)} className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-300 flex items-center justify-center shrink-0">
        <Plus className="w-6 h-6 text-slate-700" />
      </button>
    </div>
    {limit != null && <span className="block text-xs text-slate-500 mt-1 text-center">ammessi fino a {limit - 1} (scarto a {limit})</span>}
    {note && <span className="block text-[11px] text-slate-500 mt-0.5 text-center leading-snug">{note}</span>}
  </div>
);

// barra: dove sei rispetto al limite (segno nero = scarto)
const Gauge = ({ value, limit }) => {
  const max = limit * 1.5;
  return (
    <div className="qw-track mt-3" aria-hidden="true">
      <span className="qw-fill" style={{ width: `${Math.min(100, (Math.max(0, value) / max) * 100)}%` }} />
      <span className="qw-mark" style={{ left: `${(limit / max) * 100}%` }} />
    </div>
  );
};

const useCopy = () => {
  const [copied, setCopied] = useState(false);
  const copy = (text) => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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

// risultato in cima, grande: il numero, la parola (IDONEA / DA SCARTARE) e la misura minima
const Result = ({ level, label, big, unit, sub, gauge, extra, idle, onCopy, copied, reg = null, onPrint = null }) => (
  <div key={level + big} className={`qw-pop rounded-3xl p-5 shadow-lg ${idle ? "qw-idle" : TONE[level]}`} data-quick-result={idle ? "vuoto" : level}>
    <p className="text-sm font-black uppercase tracking-wider opacity-90">{label}</p>
    {idle ? (
      <p className="text-lg font-bold mt-2 leading-snug">{idle}</p>
    ) : (
      <>
        <p className="mt-1 flex items-end gap-1">
          <span className="qw-big" data-quick-value>
            {big}
          </span>
          <span className="text-3xl font-black pb-2">{unit}</span>
        </p>
        {gauge}
        <p className="text-2xl font-black mt-3 tracking-tight" data-quick-word>
          {WORD[level]}
        </p>
      </>
    )}
    {sub && <p className="text-base font-bold mt-1 opacity-95">{sub}</p>}
    {!idle && reg && (
      <div className="mt-3 rounded-2xl bg-black/20 p-3" data-quick-register>
        <p className="text-[11px] font-black uppercase tracking-wider opacity-90">Sul registro di controllo</p>
        <p className="font-black">Esito: {reg.esito}</p>
        <p className="text-sm font-bold opacity-95">{reg.azione}</p>
      </div>
    )}
    {extra}
    {!idle && onCopy && (
      <button type="button" onClick={onCopy} data-action="quick-copy" className="mt-3 h-10 px-3 rounded-xl bg-black/20 text-sm font-bold flex items-center gap-1.5">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copiato: incollalo sul registro o nel rapporto" : "Copia per il registro"}
      </button>
    )}
    {!idle && onPrint && (
      <button type="button" onClick={onPrint} data-action="quick-print" className="mt-2 h-10 px-3 rounded-xl bg-black/20 text-sm font-bold flex items-center gap-1.5">
        <Printer className="w-4 h-4" /> Stampa il verbale (PDF)
      </button>
    )}
  </div>
);

// ------------------------------------------------------------------ CATENA
const QuickChain = ({ saved, onSave }) => {
  const [d, setD] = useState(saved.cd || "");
  const [m1, setM1] = useState("");
  const [m2, setM2] = useState("");
  const [two, setTwo] = useState(false);
  const mRef = useRef(null);
  // all'apertura: se il nominale c'è già (l'ultimo usato) si parte dalla misura
  const [startOnM] = useState(() => !!saved.cd);
  const r = useMemo(() => checkChain({ kind: "paranco", d, d1: m1, d2: two ? m2 : "", flags: {} }), [d, m1, m2, two]);
  const [copied, copy] = useCopy();
  const pickD = (v) => {
    setD(v);
    onSave({ cd: v });
    setTimeout(() => mRef.current && mRef.current.focus(), 30);
  };
  const minDm = num(d) ? 0.9 * num(d) : null;
  const ready = r.wear != null;
  const text = ready ? chainRegister({ r, x: { kind: "paranco", d } }) : "";
  const reg = ready ? chainVerdict(r) : null;
  const print = () => printWear(chainReport({ r, x: { kind: "paranco", d, d1: m1, d2: two ? m2 : "" } }));
  return (
    <div className="space-y-4" data-section="quick-chain">
      <Result
        label="Usura della maglia"
        level={r.level}
        big={ready ? fmt(r.wear) : ""}
        unit="%"
        idle={!ready ? (minDm ? `Scarto sotto ${fmt(minDm, 2)} mm` : "Scrivi il diametro nominale e la misura") : ""}
        gauge={ready ? <Gauge value={r.wear} limit={10} /> : null}
        sub={ready ? `Misura ${fmt(r.dm, 2)} mm · scarto sotto ${fmt(r.minDm, 2)} mm (usura oltre il 10%)` : minDm ? "Usura ammessa fino al 10% del diametro nominale" : ""}
        onCopy={() => copy(text)}
        copied={copied}
        reg={reg}
        onPrint={print}
      />
      <div className="space-y-2">
        <BigNum id="d" info="catnominale" label="Diametro nominale" value={d} autoFocus={!startOnM} onChange={(v) => { setD(v); onSave({ cd: v }); }} />
        <Presets list={CHAIN_D} value={d} onPick={pickD} />
      </div>
      <BigNum id="m1" info="catmisura" label={two ? "Misura 1" : "Misura (dove le maglie si toccano)"} value={m1} inputRef={mRef} autoFocus={startOnM} onChange={setM1} hint={readAs(m1, num(d))} />
      {two ? (
        <BigNum id="m2" info="catmisura" label="Misura 2 (girata di 90°)" value={m2} onChange={setM2} hint={[readAs(m2, num(d)), "Si guarda la media delle due misure."].filter(Boolean).join(" · ")} />
      ) : (
        <button type="button" onClick={() => setTwo(true)} data-action="quick-two" className="w-full h-12 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-black text-slate-600">
          + Seconda misura a 90° (più preciso)
        </button>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ FUNE
const STRANDS = [
  ["6", "6 trefoli"],
  ["8", "8 trefoli"],
  ["tanti", "Antigiro"],
];
const QuickRope = ({ saved, onSave }) => {
  const [d, setD] = useState(saved.rd || "");
  const [mis, setMis] = useState("");
  const [strands, setStrands] = useState(saved.rs || "6");
  const [b6, setB6] = useState(0);
  const [b30, setB30] = useState(0);
  const mRef = useRef(null);
  const [startOnM] = useState(() => !!saved.rd);
  const r = useMemo(() => checkRope({ mode: "auto", strands, lay: "", layers: "uno", d, dRef: d, dMis: mis, b6, b30, flags: {} }), [d, mis, strands, b6, b30]);
  const [copied, copy] = useCopy();
  const pickD = (v) => {
    setD(v);
    onSave({ rd: v });
    setTimeout(() => mRef.current && mRef.current.focus(), 30);
  };
  const dn = num(d);
  const limD = r.dia ? r.dia.limit : r.rr ? 5 : 7.5;
  const minD = dn ? dn * (1 - limD / 100) : null;
  const hasDia = r.dec != null;
  const hasWire = b6 > 0 || b30 > 0;
  const ready = hasDia || (dn > 0 && hasWire);
  // il numero grande: quello messo peggio (calo del diametro o fili rotti)
  const wireBig = r.s6 >= r.s30 ? [b6, r.lim.six, "su 6d"] : [b30, r.lim.thirty, "su 30d"];
  const showWireBig = hasWire && (!hasDia || Math.max(r.s6, r.s30) > (r.dia ? r.dia.sev : 0));
  const text = ready ? ropeRegister({ r, x: { d }, label: `${(STRANDS.find((s) => s[0] === strands) || STRANDS[0])[1]}, non nota (valori prudenti)` }) : "";
  const reg = ready ? ropeVerdict(r) : null;
  const print = () => printWear(ropeReport({ r, x: { d, lay: "", layers: "uno" }, label: `${(STRANDS.find((s) => s[0] === strands) || STRANDS[0])[1]}, non nota (valori prudenti)` }));
  return (
    <div className="space-y-4" data-section="quick-rope">
      <Result
        label={showWireBig ? `Fili rotti ${wireBig[2]}` : "Calo del diametro"}
        level={r.level}
        big={showWireBig ? String(wireBig[0]) : hasDia ? fmt(r.dec) : ""}
        unit={showWireBig ? (wireBig[0] === 1 ? "filo" : "fili") : "%"}
        idle={!ready ? (minD ? `Scarto sotto ${fmt(minD, 2)} mm` : "Scrivi il diametro nominale, poi la misura o i fili rotti") : ""}
        gauge={ready ? (showWireBig ? <Gauge value={wireBig[0]} limit={wireBig[1]} /> : <Gauge value={r.dec} limit={limD} />) : null}
        sub={
          ready
            ? [hasDia && !showWireBig ? `Misura ${fmt(r.dMis, 2)} mm · scarto sotto ${fmt(minD, 2)} mm` : "", showWireBig ? `Scarto a ${wireBig[1]} fili ${wireBig[2]}` : "", showWireBig && hasDia ? `Calo del diametro ${fmt(r.dec)}% (scarto oltre il ${fmt(limD)}%)` : "", !showWireBig && hasWire ? `Fili rotti ${b6}/${r.lim.six} su 6d · ${b30}/${r.lim.thirty} su 30d` : ""]
                .filter(Boolean)
                .join(" · ")
            : minD
              ? `Calo ammesso fino al ${fmt(limD)}% · fili rotti: scarto a ${r.lim.six} su 6d, ${r.lim.thirty} su 30d`
              : ""
        }
        extra={
          <>
            {r.limCross && (
              <p className="text-sm font-bold mt-2 opacity-95 flex items-start gap-2" data-quick-cross>
                <span className="flex-1">Se i fili sono quasi dritti lungo la fune (cordatura crociata): scarto a {r.limCross.six} su 6d e {r.limCross.thirty} su 30d.</span>
                <InfoBtn id="crociata" label="cordatura crociata" />
              </p>
            )}
            {ready && r.combined >= 100 && Math.max(r.s6, r.s30) < 100 && r.dia && r.dia.sev < 100 ? <p className="text-sm font-bold mt-1">Fili rotti e calo del diametro insieme arrivano al limite.</p> : null}
          </>
        }
        onCopy={() => copy(text)}
        copied={copied}
        reg={reg}
        onPrint={print}
      />
      <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-wider">
        <span className="flex-1">Quanti trefoli vedi fuori?</span>
        <span className="flex items-center gap-1 normal-case">6 <InfoBtn id="6" label="6 trefoli" /></span>
        <span className="flex items-center gap-1 normal-case">8 <InfoBtn id="8" label="8 trefoli" /></span>
        <span className="flex items-center gap-1 normal-case">antigiro <InfoBtn id="tanti" label="antigiro" /></span>
      </div>
      <div className="flex bg-slate-200 p-1 rounded-2xl" data-quick-strands>
        {STRANDS.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => {
              setStrands(v);
              onSave({ rs: v });
            }}
            data-choice={v}
            className={`flex-1 h-11 rounded-xl text-sm font-black ${strands === v ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        <BigNum id="d" info="nomfune" label="Diametro nominale" value={d} autoFocus={!startOnM} onChange={(v) => { setD(v); onSave({ rd: v }); }} hint={dn ? `Tratto da guardare: 6d = ${Math.round(6 * dn)} mm · 30d = ${Math.round(30 * dn)} mm (tocca la «i» di «Fili rotti su 30d»)` : ""} />
        <Presets list={ROPE_D} value={d} onPick={pickD} />
      </div>
      <BigNum id="mis" info="diamfune" label="Diametro misurato" value={mis} inputRef={mRef} autoFocus={startOnM} onChange={setMis} hint={readAs(mis, num(d))} />
      <div className="grid grid-cols-2 gap-3">
        <Counter id="b6" info="fili" label="Fili rotti su 6d" value={b6} onChange={(v) => { setB30((o) => Math.max(v, o + (v - b6))); setB6(v); }} limit={r.lim.six} />
        <Counter id="b30" info="tratto" label="Fili rotti su 30d" value={b30} onChange={(v) => setB30(Math.max(v, b6))} limit={r.lim.thirty} note="Comprende i fili del 6d: aumenta da solo" />
      </div>
      <p className="text-xs text-slate-500 leading-snug">Fune non nota: l'app conta nel modo più prudente (ISO 4309). Per una fune FAS o una costruzione precisa usa il controllo completo.</p>
    </div>
  );
};

export const QuickWear = ({ initial = "catena", onClose, onFull }) => {
  const [saved, setSaved] = useState(load);
  const [tab, setTab] = useState(() => (initial === "fune" || initial === "catena" ? initial : saved.tab || "catena"));
  const save = (v) =>
    setSaved((o) => {
      const n = { ...o, ...v };
      store(n);
      return n;
    });
  const go = (t) => {
    setTab(t);
    save({ tab: t });
  };
  return (
    <div className="fixed inset-0 z-[300] bg-slate-100 flex flex-col" data-section="quick-wear">
      <style>{QW_CSS}</style>
      <div className="bg-white border-b border-slate-200 px-3 pb-2 shrink-0" style={{ paddingTop: "calc(10px + env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex bg-slate-200 p-1 rounded-2xl" role="tablist">
            {[
              ["catena", "Catena"],
              ["fune", "Fune"],
            ].map(([id, l]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => go(id)} data-quick-tab={id} className={`flex-1 h-12 rounded-xl text-lg font-black ${tab === id ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}>
                {l}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" data-action="quick-close" className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}>
        {tab === "catena" ? <QuickChain key="c" saved={saved} onSave={save} /> : <QuickRope key="f" saved={saved} onSave={save} />}
        {onFull && (
          <button type="button" onClick={() => onFull(tab)} data-action="quick-full" className="w-full h-12 rounded-2xl bg-white border border-slate-200 text-sm font-black text-slate-700 flex items-center justify-center gap-1">
            Controllo completo ({tab === "catena" ? "allungamento, gru, rapporto" : "tipo di fune, FAS, gru, rapporto"}) <ChevronRight className="w-4 h-4" />
          </button>
        )}
        <p className="text-[11px] text-slate-400 leading-snug">
          {tab === "catena" ? "Catena: scarto se il diametro medio nel punto di contatto tra le maglie è sotto il 90% del nominale (EN 818-6 / criteri dei costruttori). " : "Fune: ISO 4309:2017, meccanismi M1–M4 o classe non nota. "}
          Fa sempre fede il manuale del costruttore.
        </p>
      </div>
    </div>
  );
};

// IN HOME, scorrendo la scheda del carroponte: la misura veloce dentro la Home (catena o fune, nominale e misura).
// Per i fili rotti, la seconda misura e le spiegazioni si apre la misura grande («Apri»).
const MiniField = ({ label, value, onChange, id }) => (
  <label className="block min-w-0">
    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider truncate">{label}</span>
    <input
      className="qw-in w-full h-14 px-3 mt-0.5 bg-white border-2 border-slate-300 rounded-2xl text-slate-900 outline-none focus:border-blue-500"
      style={{ fontSize: 24 }}
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(clean(e.target.value))}
      onFocus={(e) => e.target.select()}
      data-mini-input={id}
      placeholder="mm"
    />
  </label>
);
export const MiniWear = ({ onOpen }) => {
  const [saved, setSaved] = useState(load);
  const [tab, setTab] = useState(() => (saved.tab === "fune" ? "fune" : "catena"));
  const [m, setM] = useState({ catena: "", fune: "" });
  const save = (v) =>
    setSaved((o) => {
      const n = { ...o, ...v };
      store(n);
      return n;
    });
  const dk = tab === "catena" ? "cd" : "rd";
  const d = saved[dk] || "";
  const mis = m[tab];
  let level = null;
  let big = "";
  let sub = "";
  if (tab === "catena") {
    const r = checkChain({ kind: "paranco", d, d1: mis, flags: {} });
    if (r.wear != null) {
      level = r.level;
      big = fmt(r.wear);
    }
    sub = num(d) ? `Scarto sotto ${fmt(0.9 * num(d), 2)} mm` : "Scrivi il diametro nominale";
  } else {
    const r = checkRope({ mode: "auto", strands: saved.rs || "6", lay: "", layers: "uno", d, dRef: d, dMis: mis, b6: 0, b30: 0, flags: {} });
    const lim = r.dia ? r.dia.limit : r.rr ? 5 : 7.5;
    if (r.dec != null) {
      level = r.level;
      big = fmt(r.dec);
    }
    sub = num(d) ? `Scarto sotto ${fmt(num(d) * (1 - lim / 100), 2)} mm · fili rotti: «Apri»` : "Scrivi il diametro nominale";
  }
  return (
    <div className="h-full rounded-3xl bg-slate-100 border border-slate-200 p-3 flex flex-col justify-between gap-2" data-section="mini-wear">
      <style>{QW_CSS}</style>
      <div className="flex items-center gap-2">
        <div className="flex-1 flex bg-slate-200 p-1 rounded-2xl">
          {[
            ["catena", "Catena"],
            ["fune", "Fune"],
          ].map(([id, l]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                save({ tab: id });
              }}
              data-mini-tab={id}
              className={`flex-1 h-10 rounded-xl text-sm font-black ${tab === id ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => onOpen(tab)} data-action="mini-open" className="h-11 px-3 rounded-2xl bg-white border border-slate-300 text-sm font-black text-slate-700 shrink-0">
          Apri
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 items-end">
        <MiniField id="d" label="Nominale" value={d} onChange={(v) => save({ [dk]: v })} />
        <MiniField id="m" label={tab === "catena" ? "Misura" : "Misurato"} value={mis} onChange={(v) => setM((o) => ({ ...o, [tab]: v }))} />
        <div className={`h-14 rounded-2xl flex flex-col items-center justify-center px-1 ${level ? TONE[level] : "qw-idle"}`} data-mini-result={level || "vuoto"}>
          {level ? (
            <>
              <span className="font-black tabular-nums leading-none" style={{ fontSize: 26 }} data-mini-value>
                {big}%
              </span>
              <span className="text-[10px] font-black leading-tight text-center">{WORD[level]}</span>
            </>
          ) : (
            <span className="text-[11px] font-bold text-center leading-tight">{tab === "catena" ? "usura" : "calo"} %</span>
          )}
        </div>
      </div>
      <p className="text-xs font-bold text-slate-500 truncate" data-mini-sub>
        {[readAs(mis, num(d)), sub].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
};
