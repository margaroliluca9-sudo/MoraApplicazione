// LA MIA AREA → «Fune e catena»: il tecnico scrive le misure e l'app dice cosa dice la norma.
// Funi: ISO 4309:2017 (fili rotti su 6d e 30d, diminuzione del diametro). Catene: usura della maglia e allungamento
// (EN 818-6 imbracature, criteri dei costruttori per le catene da paranco). Le regole stanno in src/wearRules.js.
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, XCircle, Copy, Check, Info, X, ExternalLink, Search, FilePlus2, History } from "lucide-react";
import { PanelHeader, INPUT } from "./PersonalUi";
import { ROPES, ROPE_FLAGS, CHAIN_FLAGS, checkRope, checkChain, measureFixed } from "../../wearRules";
import { lastRopeOf, formatRopeLong, knownRopes, ropeName } from "../../ropes";
import { fasFamily } from "../../fasRopes";
import { getSafeMatricola } from "../../utils";
import { DriveCraneInfo } from "../DriveCraneInfo";
import { FAS_ROPES, FAS_GROUPS, fasCode } from "../../fasRopes";

// catalogo FAS delle funi (si apre sul loro sito)
const FAS_CATALOG = "https://www.fasitaly.com/sottofamiglia/0107.pdf";

// «950» con nominale 10 → «Letto come 9,5 mm» (misura scritta senza virgola)
const readAs = (raw, ref) => {
  const f = measureFixed(raw, ref);
  return f != null ? `Letto come ${fmt(f, 2)} mm` : "";
};
const nOf = (v) => Number(String(v || "").replace(",", ".")) || 0;
const fmt = (v, dec = 1) => (v == null || Number.isNaN(v) ? "—" : Number(v).toLocaleString("it-IT", { maximumFractionDigits: dec, minimumFractionDigits: 0 }));

// tasto «i» accanto a un campo: apre la spiegazione (come misurare, dove guardare)
export const InfoBtn = ({ id, label = "" }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`Spiegazione${label ? ": " + label : ""}`}
        data-wear-i={id}
        className="w-7 h-7 rounded-full bg-white border border-slate-300 shadow-sm text-blue-700 inline-flex items-center justify-center shrink-0"
      >
        <Info className="w-4 h-4" />
      </button>
      {open && createPortal(<InfoSheet id={id} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
};

const Num = ({ label, value, onChange, unit = "mm", hint, id, info = "" }) => (
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

// verdetto: in cima, grande e colorato, il numero che conta (usura, calo del diametro, fili rotti)
const Verdict = ({ level, title, lines, onCopy, copied, onReport, big = null }) => {
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
        <button type="button" onClick={onCopy} className="mt-3 h-10 px-3 rounded-xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-700 flex items-center gap-1.5" data-action="wear-copy">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? "Copiato: incollalo nel rapporto" : "Copia per il rapporto"}
        </button>
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
const chainBig = (r) => {
  if (r.wear != null) return { label: "Usura della maglia", value: fmt(r.wear), unit: "%", sub: `Scarto oltre il 10% · minimo ${fmt(r.minDm, 2)} mm` };
  const c = r.checks[0];
  return c ? { label: c.label, value: fmt(c.value), unit: "%", sub: `Scarto oltre il ${c.limit}%` } : null;
};
const ropeBig = (r) => {
  const wireWorse = Math.max(r.s6, r.s30) > (r.dia ? r.dia.sev : -1);
  if (r.dec != null && !wireWorse) return { label: "Calo del diametro", value: fmt(r.dec), unit: "%", sub: `Scarto al ${fmt(r.dia.limit)}%` };
  if (r.b6 > 0 || r.b30 > 0) {
    const six = r.s6 >= r.s30;
    return { label: `Fili rotti su ${six ? "6d" : "30d"}`, value: String(six ? r.b6 : r.b30), unit: (six ? r.b6 : r.b30) === 1 ? "filo" : "fili", sub: `Scarto a ${six ? r.lim.six : r.lim.thirty} fili` };
  }
  return null;
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

// disegni delle schede «i» sulle misure
const RopeBand = ({ y = 10, w = 260, broken = false }) => (
  <g>
    <rect x="10" y={y} width={w} height="22" rx="11" fill="#94a3b8" />
    {Array.from({ length: Math.round(w / 14) }).map((_, i) => (
      <path key={i} d={`M${14 + i * 14} ${y + 1} l10 20`} stroke="#475569" strokeWidth="3" strokeLinecap="round" />
    ))}
    {broken && (
      <g stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round">
        <path d={`M120 ${y + 4} l10 -9`} />
        <path d={`M126 ${y + 6} l14 -6`} />
        <path d={`M190 ${y + 18} l9 9`} />
      </g>
    )}
  </g>
);
const TrattoArt = () => (
  <svg viewBox="0 0 280 92" className="w-full max-w-xs" aria-hidden="true">
    <RopeBand />
    <g stroke="#1d4ed8" strokeWidth="2.5" fill="none">
      <path d="M20 42 v8 h44 v-8" />
      <path d="M20 62 v8 h240 v-8" />
    </g>
    <text x="42" y="60" textAnchor="middle" fontSize="11" fontWeight="900" fill="#1d4ed8">6d</text>
    <text x="140" y="86" textAnchor="middle" fontSize="11" fontWeight="900" fill="#1d4ed8">30d (5 volte più lungo)</text>
  </svg>
);
const FiliArt = () => (
  <svg viewBox="0 0 280 50" className="w-full max-w-xs" aria-hidden="true">
    <RopeBand y={14} broken />
    <text x="150" y="10" fontSize="11" fontWeight="900" fill="#dc2626">fili rotti</text>
  </svg>
);
const CaliperArt = () => (
  <svg viewBox="0 0 220 110" className="w-full max-w-[16rem]" aria-hidden="true">
    {[0, 1].map((k) => {
      const cx = 55 + k * 110;
      return (
        <g key={k} transform={k ? `rotate(90 ${cx} 55)` : undefined}>
          <circle cx={cx} cy="55" r="30" fill="#e2e8f0" />
          {Array.from({ length: 6 }).map((_, i) => (
            <circle key={i} cx={cx + 19 * Math.cos((i * Math.PI) / 3 + Math.PI / 6)} cy={55 + 19 * Math.sin((i * Math.PI) / 3 + Math.PI / 6)} r="11" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
          ))}
          <rect x={cx - 40} y="18" width="80" height="6" fill="#1d4ed8" />
          <rect x={cx - 40} y="86" width="80" height="6" fill="#1d4ed8" />
        </g>
      );
    })}
    <text x="55" y="108" textAnchor="middle" fontSize="10" fontWeight="900" fill="#1d4ed8">1ª misura</text>
    <text x="165" y="108" textAnchor="middle" fontSize="10" fontWeight="900" fill="#1d4ed8">2ª girata di 90°</text>
  </svg>
);
const ChainArt = ({ where = "contatto" }) => (
  <svg viewBox="0 0 260 90" className="w-full max-w-xs" aria-hidden="true">
    <rect x="14" y="24" width="120" height="42" rx="21" fill="none" stroke="#64748b" strokeWidth="11" />
    <rect x="112" y="38" width="120" height="14" rx="7" fill="#64748b" />
    <rect x="112" y="38" width="120" height="14" rx="7" fill="none" stroke="#334155" strokeWidth="1.5" />
    {where === "contatto" ? (
      <g>
        <circle cx="128" cy="45" r="14" fill="none" stroke="#dc2626" strokeWidth="3" />
        <path d="M128 8 v16" stroke="#dc2626" strokeWidth="3" markerEnd="" />
        <text x="128" y="7" textAnchor="middle" fontSize="11" fontWeight="900" fill="#dc2626">misura qui</text>
      </g>
    ) : (
      <g>
        <path d="M60 4 v14 M60 72 v14" stroke="#1d4ed8" strokeWidth="3" />
        <text x="60" y="88" textAnchor="middle" fontSize="0" fill="#1d4ed8" />
        <text x="96" y="14" fontSize="11" fontWeight="900" fill="#1d4ed8">d = spessore del tondino</text>
      </g>
    )}
  </svg>
);
const PassoArt = () => (
  <svg viewBox="0 0 260 70" className="w-full max-w-xs" aria-hidden="true">
    <rect x="14" y="14" width="120" height="42" rx="21" fill="none" stroke="#64748b" strokeWidth="11" />
    <path d="M26 35 h96" stroke="#1d4ed8" strokeWidth="2.5" />
    <path d="M26 29 v12 M122 29 v12" stroke="#1d4ed8" strokeWidth="2.5" />
    <text x="74" y="31" textAnchor="middle" fontSize="11" fontWeight="900" fill="#1d4ed8">t</text>
    <text x="150" y="40" fontSize="11" fontWeight="900" fill="#1d4ed8">passo = dentro la maglia</text>
  </svg>
);

export const INFO = {
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
  tratto: {
    title: "Cosa sono 6d e 30d",
    text: "d è il diametro nominale della fune. 6d è un tratto lungo 6 volte il diametro, 30d un tratto lungo 30 volte: con una fune da 12 mm sono 72 mm (7 cm) e 360 mm (36 cm); l'app te li calcola appena scrivi il diametro. Scorri tutta la fune e cerca il tratto messo peggio (di solito dove passa sulle pulegge, dove si avvolge sul tamburo o vicino agli attacchi): lì conti i fili rotti dentro 6d e dentro 30d.",
    art: <TrattoArt />,
  },
  fili: {
    title: "Come contare i fili rotti",
    text: "Conta i fili spezzati che vedi sulla superficie della fune (le punte che escono o i fili interrotti) dentro il tratto di 6d e di 30d. Fai scorrere la fune piano con uno straccio in mano: i fili rotti lo agganciano. Sono più gravi i fili rotti nella valle, cioè tra due trefoli dove i trefoli si toccano: per la ISO 4309 già 2 fili rotti nella valle in un passo di cordatura (circa 6d) portano allo scarto, anche se il numero totale è sotto il limite. Scarta sempre anche con un trefolo rotto, schiacciamenti, «gabbia» (trefoli che si aprono) o nodi.",
    art: <FiliArt />,
  },
  diamfune: {
    title: "Come misurare il diametro della fune",
    text: "Usa il calibro con i becchi larghi, che appoggino su almeno due trefoli: si misura sulle creste dei trefoli, mai nella valle. Fai due misure nello stesso punto, la seconda girata di 90°, e prendi la media. Misura nel tratto più consumato (dove passa sulle pulegge). Il confronto giusto è col diametro di riferimento, misurato a fune nuova dopo il rodaggio; se non ce l'hai usi il nominale, ma la fune nuova di solito è un po' più grossa del nominale (fino al 4-5%) e quindi il calo vero può essere un po' più alto di quello che vedi.",
    art: <CaliperArt />,
  },
  nomfune: {
    title: "Diametro nominale della fune",
    text: "È il diametro scritto sul certificato o sul cartellino della fune (es. Ø12; nel codice FAS è il numero finale: FZ636A12 = 12 mm). Se non lo trovi, misura la fune in un tratto che non lavora (vicino all'attacco fisso, dove non passa sulle pulegge) e prendi il diametro standard più vicino.",
    art: <CaliperArt />,
  },
  catmisura: {
    title: "Dove misurare la catena",
    text: "La catena si consuma dove una maglia tocca l'altra, all'interno della curva. Allenta la catena, apri un po' le maglie e misura lo spessore del tondino proprio in quel punto; poi gira il calibro di 90° e misura di nuovo: si guarda la media delle due misure. Controlla le maglie che lavorano di più: quelle che passano sulla noce del paranco e quelle vicino al gancio con il carico che solleva di solito. Scarto se l'usura supera il 10% del diametro nominale.",
    art: <ChainArt />,
  },
  catnominale: {
    title: "Diametro nominale della catena",
    text: "È lo spessore del tondino della maglia nuova: una catena «10×30» ha diametro 10 mm e passo 30 mm. Lo trovi sul certificato, sulla targhetta o sul manuale del paranco, a volte stampato sulle maglie. Se non c'è, misuralo sul tratto dritto di una maglia che non lavora (verso il capo libero della catena), lontano dai punti di contatto.",
    art: <ChainArt where="nominale" />,
  },
  passo: {
    title: "Passo e allungamento",
    text: "Il passo t è la lunghezza interna di una maglia (catena 10×30: passo 30 mm). Misura una maglia all'interno: scarto se è più lunga del 5%. Per la catena del paranco misura anche 11 maglie di fila con la catena tesa e confrontale con 11 volte il passo: scarto oltre il 2%. Una catena allungata non ingrana più bene nella noce e può saltare.",
    art: <PassoArt />,
  },
  parallela: {
    title: "Cordatura parallela (Lang)",
    text: "Trefoli e fili vanno nello stesso verso: i fili si vedono inclinati in diagonale, come i trefoli. Si consuma più piano, ma la norma ammette circa la metà dei fili rotti.",
    art: <Side strands={6} kind="parallela" />,
  },
};
export const InfoSheet = ({ id, onClose }) => {
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
        <Num id="d" info="nomfune" label="Diametro nominale" value={x.d} onChange={set("d")} hint={x.d ? `6d = ${r.len6} mm (${fmt(r.len6 / 10)} cm) · 30d = ${r.len30} mm (${fmt(r.len30 / 10)} cm): conta i fili rotti nel tratto peggiore.` : "Serve per sapere quanto è lungo il tratto da guardare (6d e 30d)."} />
        <div className="grid grid-cols-2 gap-3">
          <Num id="b6" info="fili" label={`Fili rotti su 6d${r.len6 ? ` (${fmt(r.len6 / 10)} cm)` : ""}`} unit="fili" value={x.b6} onChange={set("b6")} />
          <Num id="b30" info="tratto" label={`Fili rotti su 30d${r.len30 ? ` (${fmt(r.len30 / 10)} cm)` : ""}`} unit="fili" value={x.b30} onChange={set("b30")} />
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
          <Num id="dRef" info="diamfune" label="Di riferimento" value={x.dRef} onChange={set("dRef")} hint={readAs(x.dRef, nOf(x.d)) || "Misurato a fune nuova (dopo il rodaggio). Se non c'è vale il nominale."} />
          <Num id="dMis" info="diamfune" label="Misurato adesso" value={x.dMis} onChange={set("dMis")} hint={readAs(x.dMis, r.dRef) || "Nel punto più consumato, media di due misure a 90°."} />
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
          onReport={onReport ? () => onReport({ type: "fune", level: r.level, title, text: report, d: x.d, b6: x.b6, b30: x.b30, dMis: r.dMis || x.dMis, rope: r.auto ? "" : x.rope }) : null}
          big={ropeBig(r)}
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
        <Num id="d" info="catnominale" label="Diametro nominale (d)" value={x.d} onChange={set("d")} />
        <div className="grid grid-cols-2 gap-3">
          <Num id="d1" info="catmisura" label="Misura d1" value={x.d1} onChange={set("d1")} hint={readAs(x.d1, nOf(x.d))} />
          <Num id="d2" label="Misura d2 (a 90°)" value={x.d2} onChange={set("d2")} hint={readAs(x.d2, nOf(x.d))} />
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
        <Num id="t" info="passo" label="Passo nominale (t)" value={x.t} onChange={set("t")} hint="Lunghezza interna di una maglia, dalla scheda della catena." />
        <div className="grid grid-cols-2 gap-3">
          <Num id="t1" label="Una maglia misurata" value={x.t1} onChange={set("t1")} hint={readAs(x.t1, nOf(x.t))} />
          {x.kind !== "imbracatura" && <Num id="t11" info="passo" label="11 maglie misurate" value={x.t11} onChange={set("t11")} hint={[readAs(x.t11, nOf(x.t) * 11), nOf(x.t) ? `Nuova: ${fmt(nOf(x.t) * 11)} mm` : ""].filter(Boolean).join(" · ")} />}
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
          big={chainBig(r)}
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

// SU QUALE GRU? solo le gru di cui l'app sa la fune (o la catena): sostituita con un rapporto, col tipo
const CranePicker = ({ machines, crane, onPick, color, type }) => {
  const [q, setQ] = useState("");
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const found = machines.filter((m) => !words.length || words.every((w) => `${getSafeMatricola(m)} ${m.customerName} ${m.type || ""}`.toLowerCase().includes(w))).slice(0, 8);
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
      <p className="text-xs font-black text-slate-500">Su quale gru? (facoltativo) — qui ci sono solo le gru di cui l'app sa {type === "catena" ? "la catena montata" : "che fune c'è montata"}</p>
      {!machines.length && (
        <p className="text-xs text-slate-400" data-wear-none>
          Per ora nessuna: compaiono quando {type === "catena" ? "la catena viene sostituita" : "la fune viene sostituita"} con un rapporto dell'app (con il tipo di fune).
        </p>
      )}
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
      {machines.length > 0 && words.length > 0 && !found.length && <p className="text-xs text-slate-400">Nessuna gru trovata.</p>}
    </div>
  );
};

export const WearPanel = ({ color = "blue", onBack, onClose, machines = [], logs = [], onNewReport = null, initialTab = "rope" }) => {
  const [tab, setTab] = useState(initialTab === "chain" ? "chain" : "rope");
  const [crane, setCrane] = useState(null);
  const craneLogs = useMemo(() => {
    if (!crane) return [];
    const mat = norm(getSafeMatricola(crane));
    const cust = norm(crane.customerName);
    return logs.filter((l) => norm(l.machineId) === mat && norm(l.customer) === cust);
  }, [crane, logs]);
  const type = tab === "rope" ? "fune" : "catena";
  const mkey = (m) => `${norm(m.customerName)}|${norm(getSafeMatricola(m))}`;
  // gru di cui si sa la fune montata (tutti gli interventi, anche quelli di prima: tipo dal certificato o dalla descrizione)
  const known = useMemo(() => knownRopes(logs), [logs]);
  const chainKeys = useMemo(() => new Set(logs.filter((l) => l && l.catena && l.catena.diametro).map((l) => `${norm(l.customer)}|${norm(l.machineId)}`)), [logs]);
  const pickable = useMemo(() => machines.filter((m) => (type === "fune" ? !!known[mkey(m)] : chainKeys.has(mkey(m)))), [machines, known, chainKeys, type]);
  const kr = crane && type === "fune" ? known[mkey(crane)] : null;
  const mounted = crane ? (kr ? kr.log : lastRopeOf(craneLogs, type)) : null;
  const knownType = kr ? { ...(mounted.fune || {}), fas: kr.type.fas || "", costruzione: kr.type.costruzione || "", diametro: kr.type.diametro || (mounted.fune || {}).diametro } : null;
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
        <CranePicker machines={pickable} crane={crane} onPick={setCrane} color={color} type={type} />
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
                {kr && kr.type.from === "testo" && (
                  <p className="text-xs text-slate-500 mt-0.5" data-wear-inferred>
                    Tipo di fune trovato nel rapporto: {kr.type.fas ? `FAS ${kr.type.fas}${fasFamily(kr.type.fas) ? " · " + fasFamily(kr.type.fas).cons.join(" / ") : ""}` : ropeName(kr.type.costruzione)} — controlla che sia giusto.
                  </p>
                )}
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
          <RopeCheck key={`r${crane ? crane.id : ""}`} known={knownType} onReport={report} />
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
