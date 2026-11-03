// LA MIA AREA → «Fune e catena»: il tecnico scrive le misure e l'app dice cosa dice la norma.
// Funi: ISO 4309:2017 (fili rotti su 6d e 30d, diminuzione del diametro). Catene: usura della maglia e allungamento
// (EN 818-6 imbracature, criteri dei costruttori per le catene da paranco). Le regole stanno in src/wearRules.js.
import React, { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Copy, Check, Info, X, ExternalLink, Search, FilePlus2, History } from "lucide-react";
import { PanelHeader, INPUT } from "./PersonalUi";
import { ROPES, ROPE_FLAGS, CHAIN_FLAGS, checkRope, checkChain } from "../../wearRules";
import { lastRopeOf, formatRopeLong } from "../../ropes";
import { getSafeMatricola } from "../../utils";
import { DriveCraneInfo } from "../DriveCraneInfo";
import { FAS_ROPES, FAS_GROUPS, fasCode } from "../../fasRopes";

// catalogo FAS delle funi (si apre sul loro sito)
const FAS_CATALOG = "https://www.fasitaly.com/sottofamiglia/0107.pdf";

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

const Verdict = ({ level, title, lines, onCopy, copied, onReport }) => {
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
      {onReport && (
        <button type="button" onClick={onReport} className="mt-2 w-full h-11 px-3 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-1.5" data-action="wear-report">
          <FilePlus2 className="w-4 h-4" /> Nuovo rapporto con questo controllo
        </button>
      )}
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

// disegnini per riconoscere la fune a occhio
const Section = ({ n, big = false }) => {
  const outer = n === "tanti" ? 14 : Number(n);
  const R = 15;
  const r = n === "tanti" ? 3.6 : n === "8" ? 5 : 6.2;
  return (
    <svg viewBox="0 0 44 44" className={big ? "w-28 h-28" : "w-11 h-11"} aria-hidden="true">
      <circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" strokeOpacity=".25" />
      {n === "tanti" && [0, 1, 2, 3, 4, 5].map((i) => <circle key={"i" + i} cx={22 + 7 * Math.cos((i * Math.PI) / 3)} cy={22 + 7 * Math.sin((i * Math.PI) / 3)} r="3" fill="currentColor" opacity=".45" />)}
      {Array.from({ length: outer }, (_, i) => (
        <circle key={i} cx={22 + (n === "tanti" ? 16 : R) * Math.cos((i * 2 * Math.PI) / outer)} cy={22 + (n === "tanti" ? 16 : R) * Math.sin((i * 2 * Math.PI) / outer)} r={r} fill="currentColor" opacity=".8" />
      ))}
      {n !== "tanti" && <circle cx="22" cy="22" r={n === "8" ? 8 : 7} fill="currentColor" opacity=".3" />}
    </svg>
  );
};
const Lay = ({ kind }) => (
  <svg viewBox="0 0 80 28" className="w-20 h-7" aria-hidden="true">
    <rect x="1" y="3" width="78" height="22" rx="11" fill="currentColor" opacity=".12" />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <path key={i} d={`M${i * 14 - 4} 25 L${i * 14 + 10} 3`} stroke="currentColor" strokeOpacity=".55" strokeWidth="1.6" />
    ))}
    {Array.from({ length: 16 }, (_, i) =>
      kind === "crociata" ? (
        <path key={"w" + i} d={`M${i * 5 + 2} ${8 + (i % 3) * 5} h4`} stroke="currentColor" strokeWidth="1.2" />
      ) : (
        <path key={"w" + i} d={`M${i * 5} ${18 - (i % 3) * 4} l3 -5`} stroke="currentColor" strokeWidth="1.2" />
      )
    )}
  </svg>
);
// fune vista di lato: trefoli in diagonale (più sono, più sono sottili)
const Side = ({ strands = 6, kind = "crociata" }) => {
  const k = strands === "tanti" ? 16 : Number(strands);
  const step = 120 / k;
  return (
    <svg viewBox="0 0 200 60" className="w-full h-16" aria-hidden="true">
      <defs>
        <clipPath id={`rope-${strands}-${kind}`}>
          <rect x="2" y="8" width="196" height="44" rx="22" />
        </clipPath>
      </defs>
      <g clipPath={`url(#rope-${strands}-${kind})`}>
        <rect x="0" y="0" width="200" height="60" fill="#94a3b8" />
        {Array.from({ length: Math.ceil(260 / step) }, (_, i) => (
          <g key={i}>
            <path d={`M${i * step - 40} 60 L${i * step + 10} 0`} stroke="#334155" strokeWidth="1.4" />
            {kind === "crociata"
              ? [0, 1, 2].map((j) => <path key={j} d={`M${i * step - 30 + j * 9} ${46 - j * 12} h${Math.max(3, step * 0.5)}`} stroke="#e2e8f0" strokeWidth="1" />)
              : [0, 1, 2].map((j) => <path key={j} d={`M${i * step - 34 + j * 13} ${54 - j * 16} l${step * 0.22} -${step * 0.26 + 3}`} stroke="#e2e8f0" strokeWidth="1" />)}
          </g>
        ))}
      </g>
      <rect x="2" y="8" width="196" height="44" rx="22" fill="none" stroke="#0f172a" strokeOpacity=".5" />
    </svg>
  );
};

// SCHEDE «i»: come riconoscerla, con i disegni e il link al catalogo FAS (le foto sono di FAS: si aprono sul loro sito)
const INFO = {
  6: {
    title: "Fune a 6 trefoli",
    text: "Girando intorno alla fune conti 6 trefoli (i «cordoni» attorcigliati), belli grossi. In mezzo c'è l'anima, tessile o metallica. È la più comune sui paranchi e sui carriponte piccoli e medi.",
    ex: "6×19 Seale, 6×19 Warrington, 6×25 Filler, 6×36 WS",
    fas: "http://www.fasitaly.com/Tipo/0101000011.pdf",
    art: (
      <>
        <Section n="6" big />
        <Side strands={6} />
      </>
    ),
  },
  8: {
    title: "Fune a 8 trefoli",
    text: "Conti 8 trefoli, più sottili di quelli della 6: la fune è più tonda e più morbida. Molto usata sui carriponte e sulle gru moderne, quasi sempre con anima metallica.",
    ex: "8×19 Seale, 8×25 Filler, 8×36 WS",
    fas: "http://www.fasitaly.com/Tipo/0102000001.pdf",
    art: (
      <>
        <Section n="8" big />
        <Side strands={8} />
      </>
    ),
  },
  tanti: {
    title: "Fune antigiro",
    text: "Fuori vedi tanti trefoli piccoli (più di 10, di solito da 12 a 18) e sotto c'è un altro strato di trefoli girato al contrario: col carico appeso la fune non gira su sé stessa. Si usa con il tiro singolo e le grandi altezze (gru a torre, autogru, paranchi alti). Attenzione: la norma ammette pochissimi fili rotti.",
    ex: "18×7, 19×7, 35×7, 35×K7",
    fas: "https://www.fasitaly.com/Serie/0110005.pdf",
    art: (
      <>
        <Section n="tanti" big />
        <Side strands="tanti" />
      </>
    ),
  },
  crociata: {
    title: "Cordatura crociata",
    text: "I trefoli vanno in un verso e i fili dentro ogni trefolo nel verso opposto: guardando la fune da vicino i fili sembrano quasi dritti, paralleli alla fune. È la cordatura più comune.",
    art: <Side strands={6} kind="crociata" />,
  },
  parallela: {
    title: "Cordatura parallela (Lang)",
    text: "Trefoli e fili vanno nello stesso verso: i fili si vedono inclinati in diagonale, come i trefoli. Si consuma più piano, ma la norma ammette circa la metà dei fili rotti.",
    art: <Side strands={6} kind="parallela" />,
  },
};
const InfoSheet = ({ id, onClose }) => {
  const it = INFO[id];
  if (!it) return null;
  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose} data-wear-info={id}>
      <div className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl p-5 space-y-3 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-2">
          <h4 className="flex-1 font-black text-lg text-slate-800">{it.title}</h4>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 flex flex-col items-center gap-3 text-slate-700">{it.art}</div>
        <p className="text-sm text-slate-700 leading-relaxed">{it.text}</p>
        {it.ex && (
          <p className="text-sm text-slate-600">
            <b>Costruzioni di questo tipo:</b> {it.ex}
          </p>
        )}
        {it.fas && (
          <a href={it.fas} target="_blank" rel="noopener noreferrer" data-fas-link className="h-11 px-4 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2">
            <ExternalLink className="w-4 h-4" /> Vedi le foto nel catalogo FAS
          </a>
        )}
        {it.fas && <p className="text-[11px] text-slate-400">Il catalogo si apre sul sito di FAS (serve la rete). I disegni qui sopra sono indicativi.</p>}
      </div>
    </div>
  );
};

const Pick = ({ value, onChange, options, id }) => {
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

// ---------------------------------------------------------------- FUNE
const RopeCheck = ({ known = null, onReport = null }) => {
  // fune montata con un rapporto dell'app (con la costruzione dal certificato): si parte già da quella
  // fune montata: dal catalogo FAS (fas) o con la costruzione scritta a mano
  const kf = known && known.fas && FAS_ROPES.some((f) => f.id === known.fas) ? "fas:" + known.fas : "";
  const kc = known && ROPES.find((r) => r.id === known.costruzione);
  const kd = known && known.diametro ? String(known.diametro).replace(".", ",") : "";
  const [x, setX] = useState({ mode: kf || kc ? "so" : "auto", strands: "6", rope: kf || (kc ? kc.id : "6x36"), n: "", core: "metallica", lay: "nonso", layers: "nonso", d: kd, dRef: kd, dMis: "", b6: "", b30: "", flags: {} });
  const set = (k) => (v) => setX((o) => ({ ...o, [k]: v }));
  const r = useMemo(() => checkRope(x), [x]);
  const isFas = !!r.fam;
  const rope = isFas ? { n: r.n, rr: r.rr, label: r.lim.rcn } : ROPES.find((o) => o.id === x.rope) || ROPES[0];
  const [copied, copy] = useCopy();
  const ready = Number(r.n) > 0 && (x.b6 !== "" || x.b30 !== "" || x.dMis !== "" || r.flags.length > 0);
  const lines = [];
  if (x.b6 !== "" || x.b30 !== "") lines.push(`Fili rotti: ${r.b6} su 6d (limite ${r.lim.six}) · ${r.b30} su 30d (limite ${r.lim.thirty}) → gravità ${Math.max(r.s6, r.s30)}%`);
  if (r.limCross && (x.b6 !== "" || x.b30 !== "")) lines.push(`Contato come cordatura parallela (la più severa). Se sei sicuro che è crociata il limite sale a ${r.limCross.six} su 6d e ${r.limCross.thirty} su 30d.`);
  if (r.dec != null) lines.push(`Diametro: calato del ${fmt(r.dec)}% (scarto al ${fmt(r.dia.limit)}%) → gravità ${r.dia.sev}%`);
  if ((x.b6 !== "" || x.b30 !== "") && r.dec != null) lines.push(`Insieme (fili + diametro): ${r.combined}%`);
  r.flags.forEach((k) => lines.push((ROPE_FLAGS.find((f) => f[0] === k) || [k, k])[1] + " → scarto"));
  const title = r.level === "scarto" ? "Fune da scartare" : r.level === "attenzione" ? "Fune ancora idonea, da tenere d'occhio" : "Fune idonea";
  const report = `Controllo fune ${r.auto ? r.guess.label.split(" (")[0] : isFas ? `FAS ${r.fam.id} (${r.fam.cons.join("/")})` : rope.label}${x.d ? " Ø" + x.d + " mm" : ""} (ISO 4309${r.auto ? ", valori prudenti" : ""}): ${title.toLowerCase()}. ${lines.join(". ")}.`;
  return (
    <div className="space-y-4" data-section="wear-rope">
      {x.mode !== "so" ? (
      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3" data-wear-auto>
        <h4 className="font-black text-slate-800">La fune</h4>
        <Choice id="mode" value={x.mode} onChange={set("mode")} options={[["auto", "Non so com'è fatta"], ["so", "So la costruzione"]]} />
        <span className="block text-xs font-black text-slate-500">Quanti trefoli vedi fuori? (contali girando intorno alla fune)</span>
        <Pick
          id="strands"
          value={x.strands}
          onChange={set("strands")}
          options={[
            ["6", "6 trefoli", <Section key="a" n="6" />],
            ["8", "8 trefoli", <Section key="b" n="8" />],
            ["tanti", "Più di 10 (antigiro)", <Section key="c" n="tanti" />],
          ]}
        />
        {x.strands !== "tanti" && (
          <>
            <span className="block text-xs font-black text-slate-500">Come stanno i fili sulla superficie?</span>
            <Pick
              id="lay"
              value={x.lay}
              onChange={set("lay")}
              options={[
                ["crociata", "Quasi dritti lungo la fune (crociata)", <Lay key="a" kind="crociata" />],
                ["parallela", "Inclinati come i trefoli (parallela)", <Lay key="b" kind="parallela" />],
                ["nonso", "Non lo so", <span key="c" className="h-7 flex items-center text-xl">🤷</span>],
              ]}
            />
          </>
        )}
        <span className="block text-xs font-black text-slate-500">Sul tamburo si avvolge…</span>
        <Choice id="layers" value={x.layers} onChange={set("layers")} options={[["uno", "Uno strato"], ["piu", "Più strati"], ["nonso", "Non so"]]} />
        <p className="text-[11px] text-slate-500 leading-snug bg-slate-50 rounded-xl p-2">
          Quello che non sai lo conto nel modo più prudente: la fune più delicata di quel tipo, cordatura parallela, anima metallica. Così il verdetto è sempre dalla parte della sicurezza.
        </p>
      </section>
      ) : (
      <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3">
        <h4 className="font-black text-slate-800">La fune</h4>
        <Choice id="mode" value={x.mode} onChange={set("mode")} options={[["auto", "Non so com'è fatta"], ["so", "So la costruzione"]]} />
        <label className="block space-y-1">
          <span className="text-xs font-black text-slate-500">Costruzione</span>
          <select className={INPUT} value={x.rope} onChange={(e) => set("rope")(e.target.value)} data-wear-input="rope">
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
              {ROPES.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        {isFas && (
          <p className="text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded-xl p-2 leading-snug" data-wear-fas>
            <b>Dal catalogo FAS:</b> {r.fam.cons.join(" / ")} · {r.fam.rr ? "antigiro" : `cordatura ${r.fam.lay}`} · anima {r.fam.core}
            {r.fam.comp ? " · trefoli compattati" : ""}
            {r.fasItem ? ` · articolo ${fasCode(r.fam, r.fasItem)}, carico di rottura ${fmt(r.fasItem.kN)} kN` : ""}
            {r.lim.noDiam ? " · scrivi il diametro per i limiti giusti" : ` · limiti: ${r.lim.six} fili su 6d, ${r.lim.thirty} su 30d`}
          </p>
        )}
        {!isFas && !rope.n && <Num id="n" label="Fili portanti dei trefoli esterni (n)" unit="fili" value={x.n} onChange={set("n")} hint="Fili esterni portanti × numero dei trefoli esterni (quelli di riempimento non contano)." />}
        {!isFas && !rope.rr && (
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

      )}
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

      {ready && (
        <Verdict
          level={r.level}
          title={title}
          lines={lines}
          onCopy={() => copy(report)}
          copied={copied}
          onReport={onReport ? () => onReport({ type: "fune", level: r.level, title, text: report, d: x.d, b6: x.b6, b30: x.b30, dMis: x.dMis, rope: r.auto ? "" : x.rope }) : null}
        />
      )}
      <p className="text-[11px] text-slate-400 leading-snug">
        Norma ISO 4309:2017 (Tab. 3, 4 e 5; valutazione combinata Allegato G). Valori per meccanismi M1–M4 o di classe non nota, i più prudenti. Fa sempre fede il
        manuale del costruttore della gru e della fune (es. FAS, Teci).
      </p>
    </div>
  );
};

// ---------------------------------------------------------------- CATENA
const ChainCheck = ({ known = null, onReport = null }) => {
  const kd = known && known.diametro ? String(known.diametro).replace(".", ",") : "";
  const kp = known && known.passo ? String(known.passo).replace(".", ",") : "";
  const [x, setX] = useState({ kind: "paranco", d: kd, d1: "", d2: "", t: kp, t1: "", t11: "", flags: {} });
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

      {ready && (
        <Verdict
          level={r.level}
          title={title}
          lines={lines}
          onCopy={() => copy(report)}
          copied={copied}
          onReport={onReport ? () => onReport({ type: "catena", level: r.level, title, text: report, d: x.d, d1: x.d1, d2: x.d2 }) : null}
        />
      )}
      <p className="text-[11px] text-slate-400 leading-snug">
        Usura: diametro medio dm = (d1+d2)/2 non sotto 0,9·d (EN 818-6 per le imbracature; stesso criterio dei costruttori per le catene da paranco, EN 818-7). Allungamento: una maglia +5%;
        catena da paranco su 11 maglie +2%. Fa sempre fede il manuale del costruttore del paranco.
      </p>
    </div>
  );
};

// controllo salvato in un rapporto (ropeCheck) — il più recente di quel tipo
const lastCheckOf = (logs, type) => {
  const key = (ds) => {
    const p = String(ds || "").split("/").map(Number);
    return p.length === 3 ? p[2] * 10000 + p[1] * 100 + p[0] : 0;
  };
  return [...logs].filter((l) => l.ropeCheck && l.ropeCheck.type === type).sort((a, b) => key(b.dateString) - key(a.dateString) || (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0] || null;
};
const norm = (v) => String(v || "").trim().toUpperCase();

// SU QUALE GRU? cerca per cliente o matricola
const CranePicker = ({ machines, crane, onPick, color }) => {
  const [q, setQ] = useState("");
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const found = words.length
    ? machines.filter((m) => words.every((w) => `${getSafeMatricola(m)} ${m.customerName} ${m.type || ""}`.toLowerCase().includes(w))).slice(0, 6)
    : [];
  if (crane)
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-3 flex items-center gap-3" data-wear-crane>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-black text-slate-400">GRU</p>
          <p className="font-black text-slate-800 truncate">
            {crane.customerName} · {getSafeMatricola(crane)}
          </p>
          {crane.type && <p className="text-xs text-slate-500 truncate">{crane.type}</p>}
        </div>
        <button type="button" onClick={() => onPick(null)} className={`h-9 px-3 rounded-full border border-slate-200 text-sm font-bold text-${color}-700`} data-action="wear-crane-change">
          Cambia
        </button>
      </div>
    );
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-3 space-y-2" data-wear-picker>
      <p className="text-xs font-black text-slate-500">Su quale gru? (facoltativo: così vedi la fune montata e il controllo precedente)</p>
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className={`${INPUT} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente o matricola…" data-wear-input="crane" />
      </div>
      {found.map((m) => (
        <button key={m.id} type="button" onClick={() => onPick(m)} className="w-full text-left px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100" data-wear-crane-option={getSafeMatricola(m)}>
          <span className="block text-sm font-black text-slate-800">{getSafeMatricola(m)}</span>
          <span className="block text-xs text-slate-500">
            {m.customerName}
            {m.type ? ` · ${m.type}` : ""}
          </span>
        </button>
      ))}
      {words.length > 0 && !found.length && <p className="text-xs text-slate-400">Nessuna gru trovata.</p>}
    </div>
  );
};

export const WearPanel = ({ color = "blue", onBack, onClose, machines = [], logs = [], onNewReport = null }) => {
  const [tab, setTab] = useState("rope");
  const [crane, setCrane] = useState(null);
  const craneLogs = useMemo(() => {
    if (!crane) return [];
    const mat = norm(getSafeMatricola(crane));
    const cust = norm(crane.customerName);
    return logs.filter((l) => norm(l.machineId) === mat && norm(l.customer) === cust);
  }, [crane, logs]);
  const type = tab === "rope" ? "fune" : "catena";
  const mounted = crane ? lastRopeOf(craneLogs, type) : null;
  const prev = crane ? lastCheckOf(craneLogs, type) : null;
  const report =
    crane && onNewReport
      ? (rc) =>
          onNewReport({
            customer: crane.customerName,
            machineId: getSafeMatricola(crane),
            machineType: crane.type || "",
            capacity: crane.capacity || "",
            description: rc.text,
            ropeCheck: { ...rc, at: Date.now() },
          })
      : null;
  return (
    <div className="flex flex-col h-full" data-section="wear">
      <PanelHeader title="Fune e catena" sub="Cosa dice la norma" onBack={onBack} onClose={onClose} color={color} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        <CranePicker machines={machines} crane={crane} onPick={setCrane} color={color} />
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
        {crane && (
          <div className="space-y-2" data-wear-history>
            {mounted ? (
              <div className="rounded-2xl bg-white border border-slate-200 p-3 text-sm" data-wear-mounted>
                <p className="text-[11px] font-black text-slate-400">{type === "fune" ? "FUNE MONTATA" : "CATENA MONTATA"} · {mounted.dateString}{mounted.technician ? ` · ${mounted.technician}` : ""}</p>
                <p className="font-bold text-slate-700">{formatRopeLong(mounted[type])}</p>
                {type === "fune" && !(mounted[type] && mounted[type].costruzione) && <p className="text-xs text-slate-400 mt-0.5">La costruzione non è stata scritta nel rapporto: rispondi alle domande qui sotto.</p>}
              </div>
            ) : (
              <p className="text-xs text-slate-400 px-1" data-wear-mounted-none>Nessuna {type} sostituita con l'app su questa gru.</p>
            )}
            {prev && (
              <div className="rounded-2xl bg-white border border-slate-200 p-3 text-sm" data-wear-prev>
                <p className="text-[11px] font-black text-slate-400 flex items-center gap-1">
                  <History className="w-3.5 h-3.5" /> CONTROLLO PRECEDENTE · {prev.dateString}
                  {prev.technician ? ` · ${prev.technician}` : ""}
                </p>
                <p className={`font-black ${prev.ropeCheck.level === "scarto" ? "text-red-700" : prev.ropeCheck.level === "attenzione" ? "text-amber-700" : "text-emerald-700"}`}>{prev.ropeCheck.title}</p>
                <p className="text-xs text-slate-500 leading-snug">{String(prev.ropeCheck.text || "").replace(/^[^:]*:\s*[^.]*\.\s*/, "")}</p>
              </div>
            )}
            {type === "fune" && <DriveCraneInfo matricola={getSafeMatricola(crane)} customerName={crane.customerName} />}
          </div>
        )}
        {tab === "rope" ? (
          <RopeCheck key={`r${crane ? crane.id : ""}`} known={mounted && mounted.fune} onReport={report} />
        ) : (
          <ChainCheck key={`c${crane ? crane.id : ""}`} known={mounted && mounted.catena} onReport={report} />
        )}
        <a href={FAS_CATALOG} target="_blank" rel="noopener noreferrer" className="block text-center text-sm font-bold text-blue-700 underline" data-fas-catalog>
          Catalogo delle funi FAS
        </a>
      </div>
    </div>
  );
};
