// FUNE E CATENA → scheda «Ganci paranchi»: paranchi elettrici a catena KITO (serie KQ e KF) e DONATI (serie DMK).
// Donati DMK: catena (d, passo, 11 maglie) e gancio (a2, h2) con i limiti del manuale Donati (src/donati.js).
// KQ: misure (catena, gancio con il disegno delle quote, occhiello, puleggia, molla, freno) con l'esito dai limiti
// del manuale e il verbale PDF; conta ore (U7-01/02/03); codici errore dell'inverter; guasti; procedure.
// KF: controllo del gancio con le misure (a, b, c, d, e, g): standard dal catalogo FAS, limite di scarto +10%
// sull'apertura dalla UNI EN 818-6 (il catalogo non dà limiti di usura), dimensioni standard della catena.
// Dati e testi del manuale in src/kito.js (parola per parola). Le figure sono quelle dei manuali (public/manuali),
// (public/manuali).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Copy, Check, Printer, Search, ZoomIn } from "lucide-react";
import { INPUT } from "./PersonalUi";
import { FigureViewerModal } from "../PhotoViewerModal";
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
import { DMK_MODELS, DMK_TEXT, DMK_SOURCE, DMK_FLAGS, DMK_MEASURES, checkDmk, dmkVerdict, dmkRegister, dmkReport, fmtD } from "../../donati";

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

// FIGURA DEL MANUALE (disegni originali del costruttore): immagine + legenda delle quote.
// marks = { quota: [x %, y %] } punto della quota sul disegno: lì compare la misura scritta nel campo (verde/arancio/rosso)
// e, quando tocchi il campo, il disegno si avvicina da solo a quella quota (la lettera si colora di blu).
const ZOOM_IN = 1.9;
// misure dei disegni (pixel), per la lente
const FIG_SIZE = {
  "/manuali/kito-kq-gancio-occhiello.png": [364, 492],
  "/manuali/kito-kq-catena-5maglie.png": [338, 137],
  "/manuali/kito-kq-catena-diametro.png": [222, 201],
  "/manuali/fas-kf-gancio.png": [310, 331],
  "/manuali/donati-dmk-gancio-fig77.png": [605, 334],
  "/manuali/donati-dmk-catena.png": [317, 192],
};
// disegni per il verbale PDF: il disegno con sopra le misure prese (src/pdf.js → buildWearPdf, rep.figures)
const PRINT_FIGS = {
  kqHook: { src: "/manuali/kito-kq-gancio-occhiello.png", title: "Gancio inferiore e occhiello di sospensione", marks: { a: [25, 32], b: [80, 57], c: [52, 45], od: [53, 80], oe: [74, 67] }, names: { od: "d", oe: "e" } },
  kqChain: { src: "/manuali/kito-kq-catena-5maglie.png", title: "Catena: somma dei passi di 5 maglie", marks: { passo5: [50, 50] }, names: { passo5: "5 maglie" } },
  kqDia: { src: "/manuali/kito-kq-catena-diametro.png", title: "Catena: diametro del tondino", marks: { d: [66, 55] } },
  kfHook: { src: "/manuali/fas-kf-gancio.png", title: "Gancio KF", marks: { a: [28, 66], b: [6, 50], c: [72, 74], d: [56, 93], e: [52, 48], g: [86, 15] } },
  dmkHook: { src: "/manuali/donati-dmk-gancio-fig77.png", title: "Gancio di sollevamento", marks: { a2: [45, 57], h2: [33, 80] } },
  dmkChain: { src: "/manuali/donati-dmk-catena.png", title: "Catena di sollevamento", marks: { d: [36, 20], p: [82, 57], p11: [45, 66] }, names: { p11: "11p" } },
};
const printFigs = (keys, vals, st) =>
  keys
    .map((k) => {
      const f = PRINT_FIGS[k];
      const v = {};
      Object.keys(f.marks).forEach((q) => vals[q] && (v[q] = vals[q]));
      return Object.keys(v).length ? { ...f, size: FIG_SIZE[f.src], vals: v, st: Object.fromEntries(Object.keys(v).map((q) => [q, st[q] || ""])) } : null;
    })
    .filter(Boolean);

// LENTE: mentre scrivi una misura il disegno resta in alto sullo schermo (sotto l'intestazione), ingrandito sulla
// quota, con la misura scritta sopra: così la vedi anche quando il disegno è uscito dallo schermo.
const Lens = ({ src, k, mark, val, tone, label }) => {
  // popup accanto al campo che stai scrivendo, dal lato opposto (campo a sinistra → lente a destra e viceversa),
  // sempre dentro la parte di schermo che si vede sopra la tastiera
  const W = Math.min(200, Math.round((typeof window !== "undefined" ? window.innerWidth : 390) * 0.44));
  const H = Math.round(W * 0.78);
  const [pos, setPos] = useState(null);
  useEffect(() => {
    const place = () => {
      const el = document.querySelector(`[data-kito-field="${k}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vv = window.visualViewport;
      const vTop = vv ? vv.offsetTop : 0;
      const vH = vv ? vv.height : window.innerHeight;
      const hb = document.querySelector(".sticky.top-0.z-50");
      const minTop = Math.max(vTop + 8, hb ? hb.getBoundingClientRect().bottom + 6 : 8);
      const maxTop = vTop + vH - (H + 26) - 8;
      const left = r.left + r.width / 2 < vw / 2 ? Math.min(vw - W - 8, r.right + 10) : Math.max(8, r.left - W - 10);
      const top = Math.max(minTop, Math.min(maxTop, r.top));
      setPos({ left, top, side: left > r.left ? "right" : "left" });
    };
    place();
    const t = setTimeout(place, 350);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", place);
      vv.addEventListener("scroll", place);
    }
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      if (vv) {
        vv.removeEventListener("resize", place);
        vv.removeEventListener("scroll", place);
      }
    };
  }, [k, W, H]);
  const [iw, ih] = FIG_SIZE[src] || [300, 300];
  const Z = 2.2;
  const bw = W * Z;
  const bh = (bw * ih) / iw;
  const left = Math.min(0, Math.max(W - bw, W / 2 - (mark[0] / 100) * bw));
  const tp = Math.min(0, Math.max(H - bh, H / 2 - (mark[1] / 100) * bh));
  return (
    <div className="fixed z-[60] rounded-2xl bg-white border-2 border-blue-500 shadow-2xl overflow-hidden pointer-events-none animate-in fade-in" style={{ left: pos ? pos.left : -9999, top: pos ? pos.top : 0, width: W, height: H + 26, transition: "top .2s ease, left .2s ease" }} data-fig-lens={k} data-fig-lens-side={pos ? pos.side : ""}>
      <div className="relative overflow-hidden" style={{ width: W, height: H }}>
        <div className="absolute" style={{ left, top: tp, width: bw, height: bh, transition: "left .35s ease, top .35s ease" }}>
          <img src={src} alt="" className="w-full h-full" />
          {val && (
            <span className="absolute rounded-full text-white font-black whitespace-nowrap shadow-lg" style={{ left: `${mark[0]}%`, top: `${mark[1]}%`, transform: "translate(-50%, -50%)", background: tone, fontSize: 15, lineHeight: "20px", padding: "1px 8px" }} data-fig-lens-val>
              {val}
            </span>
          )}
        </div>
      </div>
      <div className="h-[26px] px-2 flex items-center bg-blue-600 text-white text-[11px] font-black truncate">{label}</div>
    </div>
  );
};
const toneOf = (t, on) => (on ? "#2563eb" : t === "over" ? "#dc2626" : t === "near" ? "#d97706" : t === "ok" ? "#059669" : "#475569");
const ManualFig = ({ src, alt, legend = [], active = "", st = {}, wide = false, marks = null, vals = {} }) => {
  const [open, setOpen] = useState(false);
  const focus = marks && marks[active] ? marks[active] : null;
  const z = focus ? ZOOM_IN : 1;
  // a zoom attivo: il punto della quota va al centro del riquadro (senza uscire dal disegno)
  const tx = focus ? Math.max(-(z - 1) * 50, Math.min((z - 1) * 50, (50 - focus[0]) * z)) : 0;
  const ty = focus ? Math.max(-(z - 1) * 50, Math.min((z - 1) * 50, (50 - focus[1]) * z)) : 0;
  const lg = legend.find((l) => l[0] === active);
  const focusLabel = !lg ? active : lg[0].length <= 3 && !lg[1].includes("·") ? `${lg[0]} · ${lg[1]}` : lg[1];
  const shown = marks ? Object.keys(marks).filter((k) => vals[k] !== undefined && String(vals[k]).trim() !== "") : [];
  return (
    <div className="space-y-2" data-manual-fig={src} data-fig-zoom={focus ? active : ""}>
      <button type="button" onClick={() => setOpen(true)} data-action="open-figure" className={`relative w-full bg-white rounded-2xl border border-slate-200 p-2 flex justify-center overflow-hidden active:bg-slate-50 ${wide ? "" : "max-w-xs mx-auto"}`} aria-label={`Apri e ingrandisci: ${alt}`}>
        <span className="relative inline-block overflow-hidden rounded-xl" style={{ lineHeight: 0 }}>
          <span className="block relative" style={{ transform: `translate(${tx}%, ${ty}%) scale(${z})`, transformOrigin: "50% 50%", transition: "transform .45s cubic-bezier(.2,.8,.2,1)" }}>
            <img src={src} alt={alt} className={`${wide ? "w-full" : "max-h-56"} object-contain`} loading="lazy" />
            {shown.map((k) => {
              const [mx, my] = marks[k];
              const on = active === k;
              return (
                <span
                  key={k}
                  data-fig-val={k}
                  className="absolute rounded-full text-white font-black whitespace-nowrap shadow-md"
                  style={{ left: `${mx}%`, top: `${my}%`, transform: `translate(-50%, -50%) scale(${1 / z})`, background: toneOf(st[k], on), fontSize: 13, lineHeight: "18px", padding: "1px 7px", boxShadow: on ? "0 0 0 3px rgba(37,99,235,.35)" : undefined, transition: "transform .45s cubic-bezier(.2,.8,.2,1)" }}
                >
                  {vals[k]}
                </span>
              );
            })}
          </span>
        </span>
        {focus && (
          <span className="absolute left-2 top-2 rounded-full bg-blue-600 text-white px-2 py-1 text-[10px] font-black" data-fig-focus>
            {focusLabel}
          </span>
        )}
        <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-slate-900/80 text-white px-2 py-1 text-[10px] font-bold">
          <ZoomIn className="w-3 h-3" /> Ingrandisci
        </span>
      </button>
      {legend.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center" data-manual-legend>
          {legend.map(([k, l]) => {
            const on = active === k;
            const t = st[k];
            const cls = on ? "bg-blue-600 text-white border-blue-600" : t === "over" ? "bg-red-50 text-red-700 border-red-300" : t === "near" ? "bg-amber-50 text-amber-700 border-amber-300" : t === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-white text-slate-600 border-slate-200";
            return (
              <span key={k} data-legend={k} data-on={on ? "1" : "0"} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold ${cls}`}>
                <b className="text-xs">{k}</b> {l}
              </span>
            );
          })}
        </div>
      )}
      {focus && <Lens src={src} k={active} mark={focus} val={vals[active]} tone={toneOf(st[active], !st[active])} label={focusLabel} />}
      {open && <FigureViewerModal src={src} figure={{ title: alt, legend, marks, vals, st }} onClose={() => setOpen(false)} />}
    </div>
  );
};
// valore come lo scrive il tecnico, pronto per il disegno («45,2»)
const valsOf = (x, keys) => {
  const o = {};
  keys.forEach((k) => {
    const v = String(x[k] == null ? "" : x[k]).trim();
    if (v) o[k] = v.replace(".", ",");
  });
  return o;
};
// quando lasci un campo, la figura torna intera (se non ne tocchi subito un altro)
const useActive = () => {
  const [active, setActive] = useState("");
  const t = useRef(null);
  useEffect(() => () => clearTimeout(t.current), []);
  const focus = (id) => () => {
    clearTimeout(t.current);
    setActive(id);
  };
  const blur = (id) => () => {
    clearTimeout(t.current);
    t.current = setTimeout(() => setActive((a) => (a === id ? "" : a)), 250);
  };
  return [active, focus, blur];
};

export const KqHookArt = ({ active = "", st = {}, vals = {} }) => (
  <ManualFig
    src="/manuali/kito-kq-gancio-occhiello.png"
    alt="Gancio inferiore KQ (a tra i segni in rilievo, c, b) e occhiello di sospensione (d, e): manuale KITO"
    legend={[
      ["a", "apertura tra i segni in rilievo"],
      ["b", "larghezza del gancio (di lato)"],
      ["c", "spessore del gancio"],
      ["od", "d · spessore dell'occhiello"],
      ["oe", "e · larghezza dell'occhiello"],
    ]}
    marks={{ a: [25, 32], b: [80, 57], c: [52, 45], od: [53, 80], oe: [74, 67] }}
    vals={vals}
    active={active}
    st={st}
  />
);

// catena KQ: figure del manuale (somma dei passi di 5 maglie, diametro del tondino)
export const KqChainArt = ({ active = "", st = {}, vals = {} }) => (
  <div className="grid grid-cols-[3fr_2fr] gap-2 items-start" data-kito-chain-art>
    <ManualFig src="/manuali/kito-kq-catena-5maglie.png" alt="Somma dei passi di 5 maglie (manuale KITO KQ)" legend={[["passo5", "somma dei passi di 5 maglie"]]} marks={{ passo5: [50, 50] }} vals={vals} active={active} st={st} wide />
    <ManualFig src="/manuali/kito-kq-catena-diametro.png" alt="Diametro del tondino d (manuale KITO KQ)" legend={[["d", "diametro del tondino"]]} marks={{ d: [66, 55] }} vals={vals} active={active} st={st} wide />
  </div>
);

// ---------------------------------------------------------------- campo misura
const Field = ({ id, label, value, onChange, onFocus, onBlur, unit = "mm", hint, st, std, lim, dir }) => (
  <label className={`block rounded-2xl border-2 p-2.5 ${st === "over" ? "border-red-300 bg-red-50" : st === "near" ? "border-amber-300 bg-amber-50" : st === "ok" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`} data-kito-field={id} data-state={st || ""}>
    <span className="text-xs font-black text-slate-600 block leading-snug">{label}</span>
    <span className="relative block mt-1">
      <input className={`${INPUT} pr-12`} inputMode="decimal" value={value} onFocus={onFocus} onBlur={onBlur} onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))} data-kito-input={id} placeholder="" autoComplete="off" />
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
  <div className="flex flex-wrap gap-1.5" data-kito-tabs={id}>
    {list.map(([v, l]) => (
      <button key={v} type="button" onClick={() => onChange(v)} data-kito-tab={v} className={`shrink-0 h-10 px-3.5 rounded-full text-sm font-black border ${value === v ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"}`}>
        {l}
      </button>
    ))}
  </div>
);

// ---------------------------------------------------------------- MISURE KQ
const KqMeasure = ({ parts = "tutto" }) => {
  const showChain = parts !== "gancio";
  const showHook = parts !== "catena";
  const [x, setX] = useState({ model: "KQ3SD", passo5: "", d: "", a: "", b: "", c: "", od: "", oe: "", puleggia: "", molla: "", frenoB: "", serie: "", ore: "", flags: {} });
  const [active, onF, onB] = useActive();
  const vals = valsOf(x, ["passo5", "d", "a", "b", "c", "od", "oe"]);
  const set = (k) => (v) => setX((o) => ({ ...o, [k]: v }));
  const r = useMemo(() => checkKq(x), [x]);
  const m = r.m;
  const st = {};
  r.items.forEach((i) => {
    st[i.id] = i.over ? "over" : i.state && i.state.level === "attenzione" ? "near" : "ok";
  });
  if (r.aInfo) st.a = r.aInfo.over ? "over" : r.aInfo.near ? "near" : "ok";
  const [copied, copy] = useCopy();
  const [regCopied, copyReg] = useCopy();
  const v = kqVerdict(r);
  const F = (id, label, extra = {}) => {
    const lim = m[id];
    return <Field id={id} label={label} value={x[id]} onChange={set(id)} onFocus={onF(id)} onBlur={onB(id)} st={st[id]} std={lim ? lim[0] : null} lim={lim ? lim[1] : null} dir={id === "passo5" ? "max" : "min"} {...extra} />;
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

      {showChain && (
      <Card title="Catena di carico" id="chain">
        <KqChainArt active={active} st={st} vals={vals} />
        <div className="grid grid-cols-2 gap-2">
          {F("passo5", "Somma dei passi di 5 maglie")}
          {F("d", "Diametro del tondino (d)")}
        </div>
        <Quote>{KQ_TEXT.catena}</Quote>
        <p className="text-[12px] text-slate-500 leading-snug">
          Somma di 5 maglie: non superare il limite massimo · diametro: non superare il limite minimo (tabella del manuale). «{KQ_TEXT.catenaNota}»
        </p>
      </Card>
      )}

      {showHook && (
      <Card title="Gancio inferiore e occhiello di sospensione" id="hook">
        <KqHookArt active={active} st={st} vals={vals} />
        <p className="text-[11px] text-slate-500 -mt-1">La «a» si misura tra i segni in rilievo del gancio: per lei il manuale dà solo lo standard, il limite +10% è della UNI EN 818-6; b, c, d, e hanno i limiti del manuale. Tocca un campo: il disegno si avvicina a quella quota e le misure che scrivi compaiono sul gancio.</p>
        <div className="grid grid-cols-2 gap-2">
          <Field id="a" label="a · apertura del gancio" value={x.a} onChange={set("a")} onFocus={onF("a")} onBlur={onB("a")} std={m.a} lim={r.aInfo ? r.aInfo.limit : Math.round(m.a * 1.1 * 100) / 100} dir="max" st={r.aInfo ? (r.aInfo.over ? "over" : r.aInfo.near ? "near" : "ok") : ""} hint="(tra i segni in rilievo · limite +10% sullo standard, UNI EN 818-6)" />
          {F("b", "b · larghezza del gancio")}
          {F("c", "c · spessore del gancio")}
          {F("od", "d · spessore dell'occhiello")}
          {F("oe", "e · larghezza dell'occhiello")}
        </div>
        {r.aInfo && (
          <p className={`text-sm font-bold ${r.aInfo.over ? "text-red-700" : r.aInfo.near ? "text-amber-700" : "text-emerald-700"}`} data-kito-a data-kito-a-state={r.aInfo.over ? "over" : r.aInfo.near ? "near" : "ok"}>
            Apertura a: {fmtK(r.aInfo.v, 2)} mm · limite {fmtK(r.aInfo.limit, 2)} mm ({r.aInfo.rule}) → {r.aInfo.over ? "OLTRE IL LIMITE: sostituire il gancio" : r.aInfo.near ? "entro il limite, ma si è aperto" : "entro il limite"}
          </p>
        )}
        <Quote>{KQ_TEXT.gancio}</Quote>
        <p className="text-[12px] text-slate-500 leading-snug">
          Valore limite di a: «{KQ_TEXT.gancioLimiteA}» · di b, c, d, e: «{KQ_TEXT.usura5}» «{KQ_TEXT.gancioRischio}»
        </p>
      </Card>
      )}

      {showChain && (
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
      )}

      <Card title="Controllo a vista" id="flags">
        <div className="space-y-2">
          {KQ_FLAGS.filter((f) => parts === "tutto" || (parts === "gancio" ? ["antisgancio", "gancioDanni", "rotazione"].includes(f.id) : !["antisgancio", "gancioDanni", "rotazione"].includes(f.id))).map((f) => (
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
              {r.aInfo && (
                <li data-kito-line="a">
                  <span className={r.aInfo.over ? "text-red-700" : r.aInfo.near ? "text-amber-700" : ""}>
                    Gancio · dimensione a (apertura): {fmtK(r.aInfo.v, 2)} mm (max {fmtK(r.aInfo.limit, 2)}) → {r.aInfo.over ? "OLTRE IL LIMITE · Sostituire il gancio e l'occhiello di sospensione." : r.aInfo.near ? "entro il limite, ma si è aperto" : "entro il limite"}
                  </span>
                </li>
              )}
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
            <button type="button" onClick={() => printWear({ ...kqReport({ r, x }), figures: printFigs([...(showHook ? ["kqHook"] : []), ...(showChain ? ["kqChain", "kqDia"] : [])], vals, st) })} className="w-full h-11 px-3 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-1.5" data-action="kito-print">
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
export const KfHookArt = ({ active = "", st = {}, vals = {} }) => (
  <ManualFig
    src="/manuali/fas-kf-gancio.png"
    alt="Gancio KF: quote a, b, c, d, e, g (catalogo FAS)"
    legend={[
      ["a", "larghezza in basso"],
      ["b", "altezza in basso"],
      ["c", "altezza punta"],
      ["d", "larghezza punta"],
      ["e", "diametro gola"],
      ["g", "apertura bocca"],
    ]}
    marks={{ a: [28, 66], b: [6, 50], c: [72, 74], d: [56, 93], e: [52, 48], g: [86, 15] }}
    vals={vals}
    active={active}
    st={st}
  />
);

const KfHook = () => {
  const [x, setX] = useState({ model: KF_HOOK_MODELS[4], kind: "SV", a: "", b: "", c: "", d: "", e: "", g: "", serie: "", flags: {} });
  const [active, onF, onB] = useActive();
  const vals = valsOf(x, ["a", "b", "c", "d", "e", "g"]);
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
        <KfHookArt active={active} st={st} vals={vals} />
        <p className="text-[11px] text-slate-500 -mt-1">Tocca un campo: il disegno si avvicina alla quota da misurare e la misura compare sul gancio. Verde: come da nuovo. Arancio: si scosta. Rosso: apertura g oltre il +10% della EN 818-6 o quota oltre il 10% dallo standard.</p>
        <div className="grid grid-cols-2 gap-2">
          {KF_HOOK_DIMS.map(([id, label, where]) => (
            <Field key={id} id={id} label={label} value={x[id]} onChange={set(id)} onFocus={onF(id)} onBlur={onB(id)} st={st[id]} std={r.std ? r.std[id] : null} lim={id === "g" && r.std ? Math.round(r.std.g * (1 + KF_HOOK_LIMIT / 100) * 100) / 100 : null} dir="max" hint={where} />
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
            <button type="button" onClick={() => printWear({ ...kfReport({ r, x }), figures: printFigs(["kfHook"], vals, st) })} className="w-full h-11 px-3 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-1.5" data-action="kito-kf-print">
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
      <ManualFig src="/manuali/fas-kf-catena.png" alt="Maglia della catena KF: d, a, b, p (catalogo FAS)" legend={[["d", "diametro"], ["a", "larghezza interna"], ["b", "larghezza esterna"], ["p", "passo"]]} />
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

// ---------------------------------------------------------------- DONATI DMK
// gancio DMK con le quote del manuale (fig. 77): a2 = apertura all'imbocco, h2 = altezza della sezione (disegno fatto dall'app)
export const DmkHookArt = ({ active = "", st = {}, vals = {} }) => (
  <ManualFig
    src="/manuali/donati-dmk-gancio-fig77.png"
    alt="Gancio Donati DMK: quote a2 e h2 (fig. 77 del manuale)"
    legend={[
      ["a2", "apertura all'imbocco, col calibro"],
      ["h2", "altezza della sezione in basso"],
    ]}
    marks={{ a2: [45, 57], h2: [33, 80] }}
    vals={vals}
    active={active}
    st={st}
    wide
  />
);

const DmkMeasure = ({ parts = "tutto" }) => {
  const showChain = parts !== "gancio";
  const showHook = parts !== "catena";
  const [x, setX] = useState({ model: DMK_MODELS[1].id, d: "", p: "", p11: "", a2: "", h2: "", serie: "", flags: {} });
  const [active, onF, onB] = useActive();
  const vals = valsOf(x, ["d", "p", "p11", "a2", "h2"]);
  const set = (k) => (v) => setX((o) => ({ ...o, [k]: v }));
  const r = useMemo(() => checkDmk(x), [x]);
  const m = r.m;
  const [copied, copy] = useCopy();
  const [regCopied, copyReg] = useCopy();
  const st = {};
  r.items.forEach((i) => {
    st[i.id] = i.over ? "over" : i.near ? "near" : "ok";
  });
  const v = dmkVerdict(r);
  const Tone = r.level === "scarto" ? ["bg-red-600", XCircle] : r.level === "attenzione" ? ["bg-amber-500", AlertTriangle] : ["bg-emerald-600", CheckCircle2];
  const Icon = Tone[1];
  const F = (id, hint) => {
    const q = DMK_MEASURES.find((z) => z.id === id);
    const std = m[q.std];
    const lim = q.lim ? m[q.lim] : Math.round(std * (1 + (q.dir === "max" ? q.pct : -q.pct) / 100) * 100) / 100;
    return <Field id={id} label={q.label} value={x[id]} onChange={set(id)} onFocus={onF(id)} onBlur={onB(id)} st={st[id]} std={std} lim={lim} dir={q.dir} hint={hint} />;
  };
  return (
    <div className="space-y-4" data-kito="dmk">
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-[12px] text-emerald-900 leading-snug" data-dmk-source>
        <b>Da dove vengono i numeri.</b> Tutti i limiti sono del <b>costruttore</b>: manuale Donati serie DMK (rev. luglio 2026), tabella della catena (FEM 9.671 paragrafo 4) e fig. 77 per il gancio. Nessun valore è inventato.
      </div>
      <Card title="Paranco" id="dmkmodel">
        <div className="grid grid-cols-2 gap-1.5" data-dmk-models>
          {DMK_MODELS.map((q) => (
            <button key={q.id} type="button" onClick={() => set("model")(q.id)} data-dmk-model={q.id} className={`rounded-2xl border-2 px-2 py-2 text-left ${x.model === q.id ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"}`}>
              <span className={`block text-sm font-black ${x.model === q.id ? "text-blue-800" : "text-slate-700"}`}>{q.id}</span>
              <span className="block text-[11px] text-slate-500 leading-tight">
                FEM 2m {q.fem2m}
                {q.fem1am !== "—" ? ` · 1Am ${q.fem1am}` : ""}
                {q.fem1b !== "—" ? ` · 1B ${q.fem1b}` : ""}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">
          Catena {m.chain} (d {fmtD(m.d)} mm, passo {fmtD(m.p)} mm) · carico di rottura minimo {fmtD(m.kN, 1)} kN · la grandezza e il gruppo FEM sono sulla targhetta.
        </p>
        <label className="block">
          <span className="text-xs font-black text-slate-500">Numero di serie (facoltativo, va sul verbale)</span>
          <input className={INPUT} value={x.serie} onChange={(e) => set("serie")(e.target.value.toUpperCase())} data-kito-input="dmkserie" autoComplete="off" />
        </label>
      </Card>
      {showChain && (
      <Card title="Catena di sollevamento" id="dmkchain">
        <ManualFig src="/manuali/donati-dmk-catena.png" alt="Catena Donati: d, p, 11p (manuale)" legend={[["d", "diametro tondino"], ["p", "passo di una maglia"], ["p11", "11 maglie"]]} marks={{ d: [36, 20], p: [82, 57], p11: [45, 66] }} vals={vals} active={active} st={st} />
        <div className="grid grid-cols-2 gap-2">
          {F("d", "(tondino, nel punto più consumato)")}
          {F("p", "(una maglia, da interno a interno)")}
        </div>
        {F("p11", "(11 maglie di fila, nel tratto che lavora sulla noce)")}
        <Quote>{DMK_TEXT.catenaTab}</Quote>
        <Quote>{DMK_TEXT.catenaDove}</Quote>
        <Quote>{DMK_TEXT.spina}</Quote>
      </Card>
      )}
      {showHook && (
      <Card title="Gancio di sollevamento" id="dmkhook">
        <DmkHookArt active={active} st={st} vals={vals} />
        <p className="text-[11px] text-slate-500 -mt-1">Tocca un campo: il disegno si avvicina alla quota e la misura compare sul gancio. Verde entro il limite, arancio vicino, rosso oltre.</p>
        <div className="grid grid-cols-2 gap-2">
          {F("a2", "(all'imbocco)")}
          {F("h2", "(la sezione nel fondo della gola)")}
        </div>
        <Quote>{DMK_TEXT.gancioSost}</Quote>
        <p className="text-[11px] text-slate-500">
          «{DMK_TEXT.gancioA2}» · «{DMK_TEXT.gancioH2}» · «{DMK_TEXT.gancioAssistenza}»
        </p>
      </Card>
      )}
      <Card title="Controllo a vista (verifica trimestrale)" id="dmkflags">
        <div className="space-y-2">
          {DMK_FLAGS.filter((f) => parts === "tutto" || (parts === "catena" ? ["catenaDanni", "asciutta"].includes(f.id) : !["catenaDanni", "asciutta"].includes(f.id))).map((f) => (
            <label key={f.id} className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" className="mt-1 w-4 h-4" checked={!!x.flags[f.id]} onChange={(e) => set("flags")({ ...x.flags, [f.id]: e.target.checked })} data-kito-flag={"dmk-" + f.id} />
              <span className="flex-1">
                {f.label}
                {x.flags[f.id] && <span className="block text-xs font-bold text-red-700">Rimedio: {f.rimedio}</span>}
              </span>
            </label>
          ))}
        </div>
        {showHook && <Quote>{DMK_TEXT.gancioTrim}</Quote>}
      </Card>
      {r.any && (
        <div className="rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-lg" data-kito-verdict={r.level}>
          <div className={`${Tone[0]} text-white p-5`}>
            <p className="text-sm font-black uppercase tracking-wider opacity-90">DONATI {m.id}</p>
            <p className="font-black text-2xl flex items-center gap-2 mt-1">
              <Icon className="w-7 h-7 shrink-0" /> {r.level === "scarto" ? "Da sistemare" : r.level === "attenzione" ? "Entro i limiti, vicino" : "Entro i limiti"}
            </p>
          </div>
          <div className="p-4 space-y-2">
            <ul className="space-y-1 text-sm font-semibold text-slate-700">
              {r.items.map((i) => (
                <li key={i.id} data-kito-line={"dmk-" + i.id}>
                  <span className={i.over ? "text-red-700" : i.near ? "text-amber-700" : ""}>
                    {i.label}: {fmtD(i.v)} mm ({i.dir === "max" ? "max" : "min"} {fmtD(i.limit)}) → {i.over ? `OLTRE IL LIMITE · ${i.rimedio}` : "entro il limite"}
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
              <button type="button" onClick={() => copyReg(dmkRegister({ r }))} className="mt-2 h-10 px-3 rounded-xl bg-white border border-slate-300 text-sm font-bold text-slate-700 flex items-center gap-1.5" data-action="dmk-copy-register">
                {regCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {regCopied ? "Copiato: incollalo sul registro" : "Copia per il registro"}
              </button>
            </div>
            <button type="button" onClick={() => copy(dmkRegister({ r }))} className="h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700 flex items-center gap-1.5" data-action="dmk-copy">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copiato: incollalo nel rapporto" : "Copia per il rapporto"}
            </button>
            <button type="button" onClick={() => printWear({ ...dmkReport({ r, x }), figures: printFigs([...(showHook ? ["dmkHook"] : []), ...(showChain ? ["dmkChain"] : [])], vals, st) })} className="w-full h-11 px-3 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-1.5" data-action="dmk-print">
              <Printer className="w-4 h-4" /> Stampa il verbale (PDF)
            </button>
          </div>
        </div>
      )}
      <p className="text-[11px] text-slate-400 text-center">{DMK_SOURCE}. {DMK_TEXT.periodicita}</p>
    </div>
  );
};

// pagina a sé: tutto il paranco Kito KQ (misure complete, codici errore, guasti, conta ore, procedure)
export const KqPage = () => {
  const [sec, setSec] = useState("misure");
  return (
    <div className="space-y-4" data-section="wear-kq">
      <div className="rounded-3xl bg-slate-900 text-white p-4" data-kq-head>
        <p className="text-[11px] font-black uppercase tracking-wider text-blue-300">Paranco elettrico a catena</p>
        <h3 className="font-black text-xl leading-tight">Kito KQ</h3>
        <p className="text-xs text-slate-300 mt-1">Tutto dal manuale FAS/KITO: misure e limiti, codici errore dell'inverter, guasti, conta ore, procedure.</p>
      </div>
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
      {sec === "misure" && <KqMeasure parts="tutto" />}
      {sec === "errori" && <InvErrors />}
      {sec === "guasti" && <KqTrouble onCodes={() => setSec("errori")} />}
      {sec === "ore" && <KqHours />}
      {sec === "info" && <KqInfo />}
    </div>
  );
};

// scheda «Catena» → Del paranco: catena con i limiti del costruttore (Kito KQ, Donati DMK)
export const HoistChain = ({ maker }) => (maker === "dmk" ? <DmkMeasure parts="catena" /> : <KqMeasure parts="catena" />);

// scheda «Ganci»: solo ganci
export const KitoCheck = ({ onOpenKq = null }) => {
  const [serie, setSerie] = useState("kq");
  return (
    <div className="space-y-4" data-section="wear-kito">
      <div className="px-1">
        <h3 className="font-black text-slate-800 text-lg leading-tight">Ganci paranchi</h3>
        <p className="text-xs text-slate-500">Il gancio dei paranchi elettrici a catena, con i limiti del costruttore o della norma. La catena è nella scheda «Catena».</p>
      </div>
      <div className="flex bg-slate-200/70 p-1 rounded-2xl" data-kito-serie>
        {[
          ["kq", "Kito KQ", "manuale FAS/KITO"],
          ["kf", "Kito KF", "UNI EN 818-6"],
          ["dmk", "Donati DMK", "manuale Donati"],
        ].map(([id, l, sub]) => (
          <button key={id} type="button" onClick={() => setSerie(id)} data-kito-serie-btn={id} className={`flex-1 min-h-12 py-1 px-0.5 rounded-xl leading-tight ${serie === id ? "bg-white text-slate-800 shadow" : "text-slate-500"}`}>
            <span className="block text-sm font-black">{l}</span>
            <span className={`block text-[10px] font-bold ${serie === id ? "text-slate-500" : "text-slate-400"}`}>{sub}</span>
          </button>
        ))}
      </div>
      {serie === "dmk" ? (
        <DmkMeasure parts="gancio" />
      ) : serie === "kf" ? (
        <KfView />
      ) : (
        <>
          {onOpenKq && (
            <button type="button" onClick={onOpenKq} data-action="open-kq" className="w-full rounded-3xl bg-gradient-to-br from-blue-700 to-slate-900 text-white p-4 text-left flex items-center gap-3 shadow-lg">
              <span className="p-2.5 rounded-2xl bg-white/15 shrink-0">
                <Search className="w-6 h-6" />
              </span>
              <span className="flex-1">
                <span className="block font-black">Paranco Kito KQ: tutto il resto</span>
                <span className="block text-xs text-blue-100 leading-snug">Codici errore dell'inverter, guasti, conta ore, procedure e il controllo completo (catena, puleggia, molla, freno).</span>
              </span>
              <span className="text-2xl font-black text-white">›</span>
            </button>
          )}
          <KqMeasure parts="gancio" />
        </>
      )}
    </div>
  );
};

// per il modello scelto (usato dalle prove)
export { kqModel };
