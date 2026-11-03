// MISURA RAPIDA di catena e fune: si apre con un tocco dal riquadro «Misura» della Home (o dal collegamento
// sull'icona dell'app: /?misura=catena, /?misura=fune). Il tecnico è sotto la gru col calibro: scrive il
// diametro nominale e la misura e in un attimo vede il risultato, grande, in cima (non lo copre la tastiera).
// Le regole sono quelle di src/wearRules.js (le stesse del controllo completo nella Mia area).
import React, { useMemo, useState } from "react";
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

// TASTIERINO DELL'APP (niente tastiera del telefono): tasti grandi, anche coi guanti.
// Si tocca un campo e si scrive; «Avanti» passa al campo dopo; «Fine» nasconde il tastierino.
const Keypad = ({ onKey, onNext, onCopy, onPrint, onDone, copied, chips = null }) => {
  const k = (label, act, cls = "bg-white text-slate-900", size = 28, key = label) => (
    <button
      key={key}
      type="button"
      onPointerDown={(e) => e.preventDefault()}
      onClick={act}
      data-key={key}
      className={`rounded-2xl font-black flex items-center justify-center active:scale-95 transition-transform shadow-sm ${cls}`}
      style={{ fontSize: size }}
    >
      {label}
    </button>
  );
  const g = "bg-slate-300 text-slate-900";
  return (
    <div className="shrink-0 bg-slate-200 border-t border-slate-300 px-2 pt-2" style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }} data-quick-keypad>
      {chips}
      <div className="grid grid-cols-4 gap-2" style={{ gridAutoRows: "58px" }}>
        {["7", "8", "9"].map((n) => k(n, () => onKey(n)))}
        {k("⌫", () => onKey("back"), g, 24, "back")}
        {["4", "5", "6"].map((n) => k(n, () => onKey(n)))}
        {k("Avanti", onNext, "bg-blue-600 text-white", 16, "next")}
        {["1", "2", "3"].map((n) => k(n, () => onKey(n)))}
        {k(copied ? "Copiato" : "Copia", onCopy, g, 15, "copy")}
        {k("0", () => onKey("0"))}
        {k(",", () => onKey(","), "bg-white text-slate-900", 30, "comma")}
        {k("Stampa", onPrint, g, 15, "print")}
        {k("Fine", onDone, g, 15, "done")}
      </div>
    </div>
  );
};

// un campo: si tocca per scriverci col tastierino
const Field = ({ id, label, value, active, onTap, hint, info = "", dim = false }) => (
  <div className="min-w-0">
    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 min-h-6 truncate">
      <span className="truncate">{label}</span>
      {info && <InfoBtn id={info} label={label} />}
    </span>
    <button
      type="button"
      onClick={onTap}
      data-quick-input={id}
      data-active={active ? "1" : "0"}
      className={`w-full h-14 px-3 rounded-2xl border-2 bg-white flex items-center justify-between font-black tabular-nums ${active ? "border-blue-500 ring-2 ring-blue-200" : "border-slate-300"}`}
      style={{ fontSize: 24 }}
    >
      <span className={value ? "text-slate-900" : dim ? "text-slate-300" : "text-slate-300"}>{value || "—"}</span>
      {active && <span className="w-0.5 h-6 bg-blue-500 animate-pulse" />}
    </button>
    {hint && <span className="block text-[11px] text-slate-500 mt-0.5 leading-tight">{hint}</span>}
  </div>
);

// scrittura col tastierino: il primo tasto dopo aver scelto il campo sostituisce il valore
const typeInto = (v, key, fresh) => {
  if (key === "back") return fresh ? "" : String(v || "").slice(0, -1);
  const base = fresh ? "" : String(v || "");
  if (key === ",") return base.includes(",") ? base : (base || "0") + ",";
  if (base.replace(",", "").length >= 6) return base;
  return base === "0" ? key : base + key;
};

// contatore (fili rotti) con − e +
const Counter = ({ label, value, onChange, id, limit, info = "" }) => (
  <div className="min-w-0">
    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 min-h-6 truncate">
      <span className="truncate">{label}</span>
      {info && <InfoBtn id={info} label={label} />}
    </span>
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label={`Meno ${label}`} onClick={() => onChange(Math.max(0, value - 1))} className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-300 flex items-center justify-center shrink-0">
        <Minus className="w-5 h-5 text-slate-700" />
      </button>
      <span className="flex-1 text-center text-slate-900 font-black tabular-nums" style={{ fontSize: 24 }} data-quick-count={id}>
        {value}
      </span>
      <button type="button" aria-label={`Più ${label}`} onClick={() => onChange(value + 1)} className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-300 flex items-center justify-center shrink-0">
        <Plus className="w-5 h-5 text-slate-700" />
      </button>
    </div>
    {limit != null && <span className="block text-[11px] text-slate-500 mt-0.5 text-center">scarto a {limit}</span>}
  </div>
);

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

// risultato in cima, compatto: numero grande, parola, scarto sotto…, e l'esito per il registro
const Result = ({ level, label, big, unit, sub, idle, reg = null, extra = null }) => (
  <div key={level + big} className={`qw-pop rounded-2xl px-4 py-3 shadow ${idle ? "qw-idle" : TONE[level]}`} data-quick-result={idle ? "vuoto" : level}>
    {idle ? (
      <>
        <p className="text-[11px] font-black uppercase tracking-wider opacity-80">{label}</p>
        <p className="text-lg font-black leading-snug">{idle}</p>
      </>
    ) : (
      <div className="flex items-center gap-3">
        <p className="flex items-end gap-0.5 shrink-0">
          <span className="font-black tabular-nums leading-none" style={{ fontSize: 56, letterSpacing: "-2px" }} data-quick-value>
            {big}
          </span>
          <span className="text-2xl font-black pb-1">{unit}</span>
        </p>
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-wider opacity-80 truncate">{label}</p>
          <p className="text-lg font-black leading-tight" data-quick-word>
            {WORD[level]}
          </p>
          {sub && <p className="text-xs font-bold opacity-95 leading-snug">{sub}</p>}
        </div>
      </div>
    )}
    {!idle && reg && (
      <p className="text-xs font-bold mt-2 pt-2 border-t border-white/30 leading-snug" data-quick-register>
        Sul registro: <b>{reg.esito}</b> · {reg.azione}
      </p>
    )}
    {extra}
  </div>
);

const Chips = ({ list, value, onPick }) => (
  <div className="flex gap-1.5 overflow-x-auto pb-2" data-quick-presets>
    {list.map((d) => (
      <button
        key={d}
        type="button"
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => onPick(d)}
        data-quick-preset={d}
        className={`h-10 min-w-[46px] px-3 rounded-xl text-base font-black shrink-0 border ${value === d ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-300"}`}
      >
        {d}
      </button>
    ))}
  </div>
);

// corpo della misura: contenuto che scorre + in basso il tastierino (o, chiuso, copia / stampa / controllo completo)
const Body = ({ children, kb, tab, onFull, onKey, onNext, onCopy, onPrint, copied, chips }) => (
  <>
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {children}
      {!kb.open && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onCopy} data-action="quick-copy" className="h-12 rounded-2xl bg-white border border-slate-200 text-sm font-black text-slate-700 flex items-center justify-center gap-1.5">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copiato" : "Copia per il registro"}
            </button>
            <button type="button" onClick={onPrint} data-action="quick-print" className="h-12 rounded-2xl bg-white border border-slate-200 text-sm font-black text-slate-700 flex items-center justify-center gap-1.5">
              <Printer className="w-4 h-4" /> Stampa il verbale
            </button>
          </div>
          {onFull && (
            <button type="button" onClick={() => onFull(tab)} data-action="quick-full" className="w-full h-12 rounded-2xl bg-white border border-slate-200 text-sm font-black text-slate-700 flex items-center justify-center gap-1">
              Controllo completo ({tab === "catena" ? "allungamento, gru, rapporto" : "tipo di fune, FAS, gru, rapporto"}) <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <p className="text-[11px] text-slate-400 leading-snug">
            {tab === "catena" ? "Catena: scarto se il diametro medio nel punto di contatto tra le maglie è sotto il 90% del nominale (limite della EN 818-6, usato anche per la catena del paranco). " : "Fune: ISO 4309:2017, meccanismi M1–M4 o classe non nota; fune non nota contata nel modo più prudente. "}
            Fa sempre fede il manuale del costruttore.
          </p>
        </>
      )}
    </div>
    {kb.open ? (
      <Keypad onKey={onKey} onNext={onNext} onCopy={onCopy} onPrint={onPrint} onDone={kb.hide} copied={copied} chips={chips} />
    ) : (
      <div className="shrink-0 p-3 bg-white border-t border-slate-200" style={{ paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <button type="button" onClick={kb.show} data-action="quick-keypad" className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black">
          Tastierino
        </button>
      </div>
    )}
  </>
);

// ------------------------------------------------------------------ CATENA
const QuickChain = ({ saved, onSave, kb, onFull }) => {
  const [v, setV] = useState({ d: saved.cd || "", m1: "", m2: "" });
  const [active, setActive] = useState(saved.cd ? "m1" : "d");
  const [fresh, setFresh] = useState(true);
  const r = useMemo(() => checkChain({ kind: "paranco", d: v.d, d1: v.m1, d2: v.m2, flags: {} }), [v]);
  const [copied, copy] = useCopy();
  const ready = r.wear != null;
  const minDm = num(v.d) ? 0.9 * num(v.d) : null;
  const tap = (f) => {
    setActive(f);
    setFresh(true);
    kb.show();
  };
  const put = (f, val) => {
    setV((o) => ({ ...o, [f]: val }));
    if (f === "d") onSave({ cd: val });
  };
  const onKey = (key) => {
    put(active, typeInto(v[active], key, fresh));
    setFresh(false);
  };
  const order = ["d", "m1", "m2"];
  const next = () => tap(order[(order.indexOf(active) + 1) % order.length]);
  const text = ready ? chainRegister({ r, x: { kind: "paranco", d: v.d } }) : "";
  const print = () => ready && printWear(chainReport({ r, x: { kind: "paranco", d: v.d, d1: v.m1, d2: v.m2 } }));
  const chips =
    active === "d" ? (
      <Chips
        list={CHAIN_D}
        value={v.d}
        onPick={(d) => {
          put("d", d);
          tap("m1");
        }}
      />
    ) : null;
  return (
    <Body kb={kb} tab="catena" onFull={onFull} onKey={onKey} onNext={next} onCopy={() => ready && copy(text)} onPrint={print} copied={copied} chips={chips}>
    <div className="space-y-3" data-section="quick-chain">
      <Result
        label="Usura della maglia"
        level={r.level}
        big={ready ? fmt(r.wear) : ""}
        unit="%"
        idle={!ready ? (minDm ? `Scarto sotto ${fmt(minDm, 2)} mm` : "Tocca il diametro nominale") : ""}
        sub={ready ? `Scarto sotto ${fmt(r.minDm, 2)} mm · misura più bassa ${fmt(r.dm, 2)} mm` : ""}
        reg={ready ? chainVerdict(r) : null}
      />
      <div className="grid grid-cols-3 gap-2">
        <Field id="d" label="Nominale" info="catnominale" value={v.d} active={kb.open && active === "d"} onTap={() => tap("d")} />
        <Field id="m1" label="Misura 1" info="catmisura" value={v.m1} active={kb.open && active === "m1"} onTap={() => tap("m1")} hint={readAs(v.m1, num(v.d))} />
        <Field id="m2" label="Misura 2" value={v.m2} active={kb.open && active === "m2"} onTap={() => tap("m2")} hint={readAs(v.m2, num(v.d)) || "a 90°, facoltativa"} />
      </div>
    </div>
    </Body>
  );
};

// ------------------------------------------------------------------ FUNE
const STRANDS = [
  ["6", "6 trefoli"],
  ["8", "8 trefoli"],
  ["tanti", "Antigiro"],
];
const QuickRope = ({ saved, onSave, kb, onFull }) => {
  const [v, setV] = useState({ d: saved.rd || "", mis: "" });
  const [active, setActive] = useState(saved.rd ? "mis" : "d");
  const [fresh, setFresh] = useState(true);
  const [strands, setStrands] = useState(saved.rs || "6");
  const [b6, setB6] = useState(0);
  const [b30, setB30] = useState(0);
  const r = useMemo(() => checkRope({ mode: "auto", strands, lay: "", layers: "uno", d: v.d, dRef: v.d, dMis: v.mis, b6, b30, flags: {} }), [v, strands, b6, b30]);
  const [copied, copy] = useCopy();
  const dn = num(v.d);
  const limD = r.dia ? r.dia.limit : r.rr ? 5 : 7.5;
  const minD = dn ? dn * (1 - limD / 100) : null;
  const hasDia = r.dec != null;
  const hasWire = b6 > 0 || b30 > 0;
  const ready = hasDia || (dn > 0 && hasWire);
  const wireBig = r.s6 >= r.s30 ? [b6, r.lim.six, "su 6d"] : [b30, r.lim.thirty, "su 30d"];
  const showWireBig = hasWire && (!hasDia || Math.max(r.s6, r.s30) > (r.dia ? r.dia.sev : 0));
  const label = `${(STRANDS.find((s) => s[0] === strands) || STRANDS[0])[1]}, non nota (valori prudenti)`;
  const tap = (f) => {
    setActive(f);
    setFresh(true);
    kb.show();
  };
  const put = (f, val) => {
    setV((o) => ({ ...o, [f]: val }));
    if (f === "d") onSave({ rd: val });
  };
  const onKey = (key) => {
    put(active, typeInto(v[active], key, fresh));
    setFresh(false);
  };
  const text = ready ? ropeRegister({ r, x: { d: v.d }, label }) : "";
  const print = () => ready && printWear(ropeReport({ r, x: { d: v.d, lay: "", layers: "uno" }, label }));
  const chips =
    active === "d" ? (
      <Chips
        list={ROPE_D}
        value={v.d}
        onPick={(d) => {
          put("d", d);
          tap("mis");
        }}
      />
    ) : null;
  return (
    <Body kb={kb} tab="fune" onFull={onFull} onKey={onKey} onNext={() => tap(active === "d" ? "mis" : "d")} onCopy={() => ready && copy(text)} onPrint={print} copied={copied} chips={chips}>
    <div className="space-y-3" data-section="quick-rope">
      <Result
        label={showWireBig ? `Fili rotti ${wireBig[2]}` : "Calo del diametro"}
        level={r.level}
        big={showWireBig ? String(wireBig[0]) : hasDia ? fmt(r.dec) : ""}
        unit={showWireBig ? (wireBig[0] === 1 ? "filo" : "fili") : "%"}
        idle={!ready ? (minD ? `Scarto sotto ${fmt(minD, 2)} mm` : "Tocca il diametro nominale") : ""}
        sub={ready ? (showWireBig ? `scarto a ${wireBig[1]} fili ${wireBig[2]}` : `scarto sotto ${fmt(minD, 2)} mm (calo ${fmt(limD)}%)`) : ""}
        reg={ready ? ropeVerdict(r) : null}
        extra={
          r.limCross ? (
            <p className="text-[11px] font-bold mt-1 opacity-90 flex items-center gap-1.5" data-quick-cross>
              <span className="flex-1">Con cordatura crociata: scarto a {r.limCross.six} su 6d, {r.limCross.thirty} su 30d.</span>
              <InfoBtn id="crociata" label="cordatura crociata" />
            </p>
          ) : null
        }
      />
      <div className="flex bg-slate-200 p-1 rounded-2xl" data-quick-strands>
        {STRANDS.map(([s, l]) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStrands(s);
              onSave({ rs: s });
            }}
            data-choice={s}
            className={`flex-1 h-10 rounded-xl text-sm font-black ${strands === s ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}
          >
            {l}
          </button>
        ))}
        <span className="flex items-center px-1">
          <InfoBtn id={strands === "tanti" ? "tanti" : strands} label="trefoli" />
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field id="d" label="Nominale" info="nomfune" value={v.d} active={kb.open && active === "d"} onTap={() => tap("d")} hint={dn ? `6d = ${Math.round(6 * dn)} mm · 30d = ${Math.round(30 * dn)} mm` : ""} />
        <Field id="mis" label="Misurato" info="diamfune" value={v.mis} active={kb.open && active === "mis"} onTap={() => tap("mis")} hint={readAs(v.mis, dn)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Counter id="b6" info="fili" label="Fili rotti 6d" value={b6} onChange={(n) => { setB30((o) => Math.max(n, o + (n - b6))); setB6(n); }} limit={r.lim.six} />
        <Counter id="b30" info="tratto" label="Fili rotti 30d" value={b30} onChange={(n) => setB30(Math.max(n, b6))} limit={r.lim.thirty} />
      </div>
    </div>
    </Body>
  );
};

export const QuickWear = ({ initial = "catena", onClose, onFull }) => {
  const [saved, setSaved] = useState(load);
  const [tab, setTab] = useState(() => (initial === "fune" || initial === "catena" ? initial : saved.tab || "catena"));
  const [open, setOpen] = useState(true);
  const kb = { open, show: () => setOpen(true), hide: () => setOpen(false) };
  const save = (val) =>
    setSaved((o) => {
      const n = { ...o, ...val };
      store(n);
      return n;
    });
  const go = (t) => {
    setTab(t);
    save({ tab: t });
    setOpen(true);
  };
  return (
    <div className="fixed inset-0 z-[300] bg-slate-100 flex flex-col" data-section="quick-wear">
      <style>{QW_CSS}</style>
      <div className="bg-white border-b border-slate-200 px-3 pb-2 shrink-0" style={{ paddingTop: "calc(8px + env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex bg-slate-200 p-1 rounded-2xl" role="tablist">
            {[
              ["catena", "Catena"],
              ["fune", "Fune"],
            ].map(([id, l]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => go(id)} data-quick-tab={id} className={`flex-1 h-11 rounded-xl text-base font-black ${tab === id ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}>
                {l}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" data-action="quick-close" className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>
      </div>
      {tab === "catena" ? <QuickChain key="c" saved={saved} onSave={save} kb={kb} onFull={onFull} /> : <QuickRope key="f" saved={saved} onSave={save} kb={kb} onFull={onFull} />}
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
