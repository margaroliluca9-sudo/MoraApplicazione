// LA MIA AREA → «Fune e catena»: il tecnico scrive le misure e l'app dice cosa dice la norma.
// Funi: ISO 4309:2017 (fili rotti su 6d e 30d, diminuzione del diametro). Catene: usura della maglia e allungamento
// (EN 818-6 imbracature, criteri dei costruttori per le catene da paranco). Le regole stanno in src/wearRules.js.
import React, { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Copy, Check } from "lucide-react";
import { PanelHeader, INPUT } from "./PersonalUi";
import { ROPES, ROPE_FLAGS, CHAIN_FLAGS, checkRope, checkChain } from "../../wearRules";

const fmt = (v, dec = 1) => (v == null || Number.isNaN(v) ? "—" : Number(v).toLocaleString("it-IT", { maximumFractionDigits: dec, minimumFractionDigits: 0 }));

const Num = ({ label, value, onChange, unit = "mm", hint, id }) => (
  <label className="block space-y-1">
    <span className="text-xs font-black text-slate-500">{label}</span>
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

const Choice = ({ value, onChange, options, id }) => (
  <div className="flex bg-slate-100 p-1 rounded-xl" data-wear-choice={id}>
    {options.map(([v, l]) => (
      <button key={v} type="button" onClick={() => onChange(v)} data-choice={v} className={`flex-1 min-h-10 px-2 py-1.5 rounded-lg text-xs font-black ${value === v ? "bg-white text-slate-800 shadow" : "text-slate-500"}`}>
        {l}
      </button>
    ))}
  </div>
);

const Flags = ({ list, value, onChange }) => (
  <div className="space-y-1.5">
    {list.map(([k, l]) => (
      <label key={k} className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" className="mt-1 w-4 h-4" checked={!!value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.checked })} data-wear-flag={k} />
        <span>{l}</span>
      </label>
    ))}
  </div>
);

const Bar = ({ sev }) => (
  <span className="block h-2 rounded-full bg-slate-200 overflow-hidden mt-1">
    <span className={`block h-full ${sev >= 100 ? "bg-red-500" : sev >= 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, Math.max(4, sev))}%` }} />
  </span>
);

const Verdict = ({ level, title, lines, onCopy, copied }) => {
  const tone = level === "scarto" ? ["bg-red-50 border-red-300 text-red-800", XCircle] : level === "attenzione" ? ["bg-amber-50 border-amber-300 text-amber-900", AlertTriangle] : ["bg-emerald-50 border-emerald-300 text-emerald-800", CheckCircle2];
  const Icon = tone[1];
  return (
    <div className={`rounded-2xl border-2 p-4 ${tone[0]}`} data-wear-verdict={level}>
      <p className="font-black text-lg flex items-center gap-2">
        <Icon className="w-6 h-6 shrink-0" /> {title}
      </p>
      <ul className="mt-2 space-y-1 text-sm font-semibold">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      <button type="button" onClick={onCopy} className="mt-3 h-10 px-3 rounded-xl bg-white/80 border border-black/10 text-sm font-bold text-slate-700 flex items-center gap-1.5" data-action="wear-copy">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copiato: incollalo nel rapporto" : "Copia per il rapporto"}
      </button>
    </div>
  );
};

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

// ---------------------------------------------------------------- FUNE
const RopeCheck = () => {
  const [x, setX] = useState({ rope: "6x36", n: "", core: "metallica", lay: "crociata", layers: "uno", d: "", dRef: "", dMis: "", b6: "", b30: "", flags: {} });
  const set = (k) => (v) => setX((o) => ({ ...o, [k]: v }));
  const rope = ROPES.find((r) => r.id === x.rope) || ROPES[0];
  const r = useMemo(() => checkRope(x), [x]);
  const [copied, copy] = useCopy();
  const ready = Number(r.n) > 0 && (x.b6 !== "" || x.b30 !== "" || x.dMis !== "" || r.flags.length > 0);
  const lines = [];
  if (x.b6 !== "" || x.b30 !== "") lines.push(`Fili rotti: ${r.b6} su 6d (limite ${r.lim.six}) · ${r.b30} su 30d (limite ${r.lim.thirty}) → gravità ${Math.max(r.s6, r.s30)}%`);
  if (r.dec != null) lines.push(`Diametro: calato del ${fmt(r.dec)}% (scarto al ${fmt(r.dia.limit)}%) → gravità ${r.dia.sev}%`);
  if ((x.b6 !== "" || x.b30 !== "") && r.dec != null) lines.push(`Insieme (fili + diametro): ${r.combined}%`);
  r.flags.forEach((k) => lines.push((ROPE_FLAGS.find((f) => f[0] === k) || [k, k])[1] + " → scarto"));
  const title = r.level === "scarto" ? "Fune da scartare" : r.level === "attenzione" ? "Fune ancora idonea, da tenere d'occhio" : "Fune idonea";
  const report = `Controllo fune ${rope.label}${x.d ? " Ø" + x.d + " mm" : ""} (ISO 4309): ${title.toLowerCase()}. ${lines.join(". ")}.`;
  return (
    <div className="space-y-4" data-section="wear-rope">
      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">La fune</h4>
        <label className="block space-y-1">
          <span className="text-xs font-black text-slate-500">Costruzione</span>
          <select className={INPUT} value={x.rope} onChange={(e) => set("rope")(e.target.value)} data-wear-input="rope">
            {ROPES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {!rope.n && <Num id="n" label="Fili portanti dei trefoli esterni (n)" unit="fili" value={x.n} onChange={set("n")} hint="Fili esterni portanti × numero dei trefoli esterni (quelli di riempimento non contano)." />}
        {!rope.rr && (
          <>
            <span className="block text-xs font-black text-slate-500">Anima</span>
            <Choice id="core" value={x.core} onChange={set("core")} options={[["metallica", "Metallica"], ["tessile", "Tessile"]]} />
            <span className="block text-xs font-black text-slate-500">Cordatura</span>
            <Choice id="lay" value={x.lay} onChange={set("lay")} options={[["crociata", "Crociata"], ["parallela", "Parallela (Lang)"]]} />
          </>
        )}
        <span className="block text-xs font-black text-slate-500">Avvolgimento sul tamburo</span>
        <Choice id="layers" value={x.layers} onChange={set("layers")} options={[["uno", "Uno strato"], ["piu", "Più strati"]]} />
        <p className="text-[11px] text-slate-400">
          Categoria della fune (RCN) {r.lim.rcn} · {r.n} fili portanti esterni
        </p>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">Fili rotti</h4>
        <Num id="d" label="Diametro nominale" value={x.d} onChange={set("d")} hint={x.d ? `6d = ${r.len6} mm (${fmt(r.len6 / 10)} cm) · 30d = ${r.len30} mm (${fmt(r.len30 / 10)} cm): conta i fili rotti nel tratto peggiore.` : "Serve per sapere quanto è lungo il tratto da guardare (6d e 30d)."} />
        <div className="grid grid-cols-2 gap-3">
          <Num id="b6" label={`Fili rotti su 6d${r.len6 ? ` (${fmt(r.len6 / 10)} cm)` : ""}`} unit="fili" value={x.b6} onChange={set("b6")} />
          <Num id="b30" label={`Fili rotti su 30d${r.len30 ? ` (${fmt(r.len30 / 10)} cm)` : ""}`} unit="fili" value={x.b30} onChange={set("b30")} />
        </div>
        {(x.b6 !== "" || x.b30 !== "") && (
          <div className="text-xs font-bold text-slate-500">
            Gravità dei fili rotti: {Math.max(r.s6, r.s30)}%
            <Bar sev={Math.max(r.s6, r.s30)} />
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">Diametro</h4>
        <div className="grid grid-cols-2 gap-3">
          <Num id="dRef" label="Di riferimento" value={x.dRef} onChange={set("dRef")} hint="Misurato a fune nuova (dopo il rodaggio). Se non c'è vale il nominale." />
          <Num id="dMis" label="Misurato adesso" value={x.dMis} onChange={set("dMis")} hint="Nel punto più consumato, media di due misure a 90°." />
        </div>
        {r.dec != null && (
          <div className="text-xs font-bold text-slate-500">
            Calo del {fmt(r.dec)}% · gravità {r.dia.sev}% (scarto al {fmt(r.dia.limit)}% per fune {r.kind === "antigiro" ? "antigiro" : r.kind === "tessile" ? "con anima tessile" : "con anima metallica"})
            <Bar sev={r.dia.sev} />
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">Si vede anche…</h4>
        <Flags list={ROPE_FLAGS} value={x.flags} onChange={set("flags")} />
      </section>

      {ready && <Verdict level={r.level} title={title} lines={lines} onCopy={() => copy(report)} copied={copied} />}
      <p className="text-[11px] text-slate-400 leading-snug">
        Norma ISO 4309:2017 (Tab. 3, 4 e 5; valutazione combinata Allegato G). Valori per meccanismi M1–M4 o di classe non nota, i più prudenti. Fa sempre fede il
        manuale del costruttore della gru e della fune (es. FAS, Teci).
      </p>
    </div>
  );
};

// ---------------------------------------------------------------- CATENA
const ChainCheck = () => {
  const [x, setX] = useState({ kind: "paranco", d: "", d1: "", d2: "", t: "", t1: "", t11: "", flags: {} });
  const set = (k) => (v) => setX((o) => ({ ...o, [k]: v }));
  const r = useMemo(() => checkChain(x), [x]);
  const [copied, copy] = useCopy();
  const lines = r.checks.map((c) => `${c.label}: ${fmt(c.value)}% (scarto oltre il ${c.limit}%)${c.bad ? " → scarto" : ""}`);
  if (r.wear != null) lines.unshift(`Diametro medio ${fmt(r.dm, 2)} mm su ${fmt(r.d, 2)} mm nominale (minimo ammesso ${fmt(r.minDm, 2)} mm)`);
  r.flags.forEach((k) => lines.push((CHAIN_FLAGS.find((f) => f[0] === k) || [k, k])[1] + " → scarto"));
  const title = r.level === "scarto" ? "Catena da scartare" : r.level === "attenzione" ? "Catena ancora idonea, vicina al limite" : "Catena idonea";
  const report = `Controllo catena ${x.kind === "imbracatura" ? "di imbracatura" : "del paranco"}${x.d ? " Ø" + x.d + " mm" : ""}: ${title.toLowerCase()}. ${lines.join(". ")}.`;
  const ready = r.checks.length > 0 || r.flags.length > 0;
  return (
    <div className="space-y-4" data-section="wear-chain">
      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">La catena</h4>
        <Choice id="kind" value={x.kind} onChange={set("kind")} options={[["paranco", "Del paranco"], ["imbracatura", "Di imbracatura"]]} />
        <Num id="d" label="Diametro nominale (d)" value={x.d} onChange={set("d")} />
        <div className="grid grid-cols-2 gap-3">
          <Num id="d1" label="Misura d1" value={x.d1} onChange={set("d1")} />
          <Num id="d2" label="Misura d2 (a 90°)" value={x.d2} onChange={set("d2")} />
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">Misura nel punto dove le maglie si toccano (dove si consuma), con la catena allentata: due misure a 90° tra loro. Si guarda la media.</p>
        {r.wear != null && (
          <div className="text-xs font-bold text-slate-500">
            Usura {fmt(r.wear)}% (scarto oltre il 10%)
            <Bar sev={(r.wear / 10) * 100} />
          </div>
        )}
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">Allungamento (se lo misuri)</h4>
        <Num id="t" label="Passo nominale (t)" value={x.t} onChange={set("t")} hint="Lunghezza interna di una maglia, dalla scheda della catena." />
        <div className="grid grid-cols-2 gap-3">
          <Num id="t1" label="Una maglia misurata" value={x.t1} onChange={set("t1")} />
          {x.kind !== "imbracatura" && <Num id="t11" label="11 maglie misurate" value={x.t11} onChange={set("t11")} hint={Number(String(x.t).replace(",", ".")) ? `Nuova: ${fmt(Number(String(x.t).replace(",", ".")) * 11)} mm` : ""} />}
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">Si vede anche…</h4>
        <Flags list={CHAIN_FLAGS} value={x.flags} onChange={set("flags")} />
      </section>

      {ready && <Verdict level={r.level} title={title} lines={lines} onCopy={() => copy(report)} copied={copied} />}
      <p className="text-[11px] text-slate-400 leading-snug">
        Usura: diametro medio dm = (d1+d2)/2 non sotto 0,9·d (EN 818-6 per le imbracature; stesso criterio dei costruttori per le catene da paranco, EN 818-7). Allungamento: una maglia +5%;
        catena da paranco su 11 maglie +2%. Fa sempre fede il manuale del costruttore del paranco.
      </p>
    </div>
  );
};

export const WearPanel = ({ color = "blue", onBack, onClose }) => {
  const [tab, setTab] = useState("rope");
  return (
    <div className="flex flex-col h-full" data-section="wear">
      <PanelHeader title="Fune e catena" sub="Cosa dice la norma" onBack={onBack} onClose={onClose} color={color} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        <div className="flex bg-slate-200/70 p-1 rounded-2xl" role="tablist">
          {[
            ["rope", "Fune"],
            ["chain", "Catena"],
          ].map(([id, l]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} data-wear-tab={id} className={`flex-1 h-11 rounded-xl text-sm font-black ${tab === id ? `bg-white text-${color}-700 shadow` : "text-slate-500"}`}>
              {l}
            </button>
          ))}
        </div>
        {tab === "rope" ? <RopeCheck /> : <ChainCheck />}
      </div>
    </div>
  );
};
