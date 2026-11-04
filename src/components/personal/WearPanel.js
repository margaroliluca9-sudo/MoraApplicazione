// LA MIA AREA → «Fune e catena»: il tecnico scrive le misure e l'app dice cosa dice la norma.
// Funi: ISO 4309:2017 (fili rotti su 6d e 30d, diminuzione del diametro). Catene: usura della maglia e allungamento
// (EN 818-6 sottoganci / brache di catena, criteri dei costruttori per le catene da paranco). Le regole stanno in src/wearRules.js.
// I pezzi stanno in components/personal/wear/ (campi, disegni, schede «i», Fune, Catena, Sottoganci, verbali).
import React, { useMemo, useState } from "react";
import { History } from "lucide-react";
import { PanelHeader, INPUT } from "./PersonalUi";
import { lastRopeOf, formatRopeLong, knownRopes, ropeName } from "../../ropes";
import { fasFamily } from "../../fasRopes";
import { getSafeMatricola } from "../../utils";
import { DriveCraneInfo } from "../DriveCraneInfo";
import { teciFamily } from "../../teciRopes";
import { Strands } from "./wear/art";
import { PrintedReports } from "./wear/PrintedReports";
import { RopeCheck } from "./wear/RopeCheck";
import { ChainCheck } from "./wear/ChainCheck";
import { SottoganciCheck } from "./wear/Sottoganci";
import { printWear } from "../WearPrintHost";

// usati da altre parti dell'app
export { printWear };
export { InfoBtn, INFO, InfoSheet } from "./wear/info";
export { RopeSectionArt } from "./wear/art";

// catalogo FAS delle funi (si apre sul loro sito)
const FAS_CATALOG = "https://www.fasitaly.com/sottofamiglia/0107.pdf";
// cataloghi FAS dei sottoganci: catene (Pewag) e fasce di poliestere
const FAS_CHAINS = "https://www.fasitaly.com/sottofamiglia/0222009.pdf";
const FAS_SLINGS = "https://www.fasitaly.com/sottofamiglia/0224007.pdf";
// funi Teci sul loro sito (lì si scaricano il catalogo e le schede)
const TECI_CATALOG = "https://www.teci.it/en/all-products/wire-ropes/";
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
  // menu a tendina (le gru sono tante): raggruppate per cliente
  const groups = {};
  [...machines]
    .sort((a, b) => String(a.customerName).localeCompare(String(b.customerName), "it") || String(getSafeMatricola(a)).localeCompare(String(getSafeMatricola(b)), "it", { numeric: true }))
    .forEach((m) => {
      (groups[m.customerName || "—"] = groups[m.customerName || "—"] || []).push(m);
    });
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-3 space-y-2" data-wear-picker>
      <p className="text-xs font-black text-slate-500">Su quale gru? (facoltativo) — qui ci sono solo le gru di cui l'app sa {type === "catena" ? "la catena montata" : "che fune c'è montata"}</p>
      {!machines.length ? (
        <p className="text-xs text-slate-400" data-wear-none>
          Per ora nessuna: compaiono quando {type === "catena" ? "la catena viene sostituita" : "la fune viene sostituita"} con un rapporto dell'app (con il tipo di fune).
        </p>
      ) : (
        <select
          className={INPUT}
          value=""
          data-wear-input="crane"
          aria-label="Scegli la gru"
          onChange={(e) => {
            const m = machines.find((x) => String(x.id) === e.target.value);
            if (m) onPick(m);
          }}
        >
          <option value="">Scegli la gru ({machines.length})…</option>
          {Object.keys(groups).map((c) => (
            <optgroup key={c} label={c}>
              {groups[c].map((m) => (
                <option key={m.id} value={m.id} data-wear-crane-option={getSafeMatricola(m)}>
                  {getSafeMatricola(m)}
                  {m.type ? ` · ${m.type}` : ""}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      )}
    </div>
  );
};
export const WearPanel = ({ color = "blue", onBack, onClose, machines = [], logs = [], onNewReport = null, initialTab = "rope", isAdmin = false }) => {
  const [tab, setTab] = useState(initialTab === "chain" ? "chain" : "rope");
  // dalla Home: prima «Cosa controlli?» (fune, catena o braca), poi la scheda giusta
  const [choosing, setChoosing] = useState(initialTab === "choose");
  // da «Brache di catena» → «Controlla l'usura»: catena dei sottoganci con diametro e passo già scritti
  const [chainPreset, setChainPreset] = useState(null);
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
  const knownType = kr ? { ...(mounted.fune || {}), fas: kr.type.fas || "", teci: kr.type.teci || "", costruzione: kr.type.costruzione || "", diametro: kr.type.diametro || (mounted.fune || {}).diametro } : null;
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
  if (choosing)
    return (
      <div className="flex flex-col h-full" data-section="wear">
        <PanelHeader title="Fune e catena" sub="Cosa dice la norma" onBack={onBack} onClose={onClose} color={color} />
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50" data-wear-choose>
          <h3 className="text-2xl font-black text-slate-800 px-1">Cosa controlli?</h3>
          {[
            ["rope", "La fune", "Gru e paranchi a fune: fili rotti, diametro", <svg key="r" viewBox="0 0 120 60" className="w-24 h-12"><Strands x={4} y={19} w={112} h={22} /></svg>],
            ["chain", "La catena", "Paranco a catena o catena dei sottoganci: usura, allungamento", <svg key="c" viewBox="0 0 120 60" className="w-24 h-12">{[0, 1, 2, 3].map((k) => (k % 2 === 0 ? <rect key={k} x={8 + k * 24} y={18} width={32} height={24} rx={12} fill="none" stroke="#334155" strokeWidth={6} /> : <rect key={k} x={8 + k * 24} y={27} width={32} height={6} rx={3} fill="#cbd5e1" stroke="#334155" strokeWidth={1.5} />))}</svg>],
            ["sling", "La braca", "Sottoganci: fasce, anelli, brache di catena", <svg key="s" viewBox="0 0 120 60" className="w-24 h-12"><path d="M60,6 L22,52 M60,6 L98,52" stroke="#7c3aed" strokeWidth="8" strokeLinecap="round" /><circle cx="60" cy="8" r="6" fill="none" stroke="#334155" strokeWidth="3" /><rect x="14" y="48" width="92" height="8" rx="2" fill="#94a3b8" /></svg>],
          ].map(([id, title, sub, art]) => (
            <button key={id} type="button" onClick={() => { setTab(id); setChoosing(false); }} data-wear-pick={id} className="w-full rounded-3xl bg-white border border-slate-200 shadow-sm p-4 flex items-center gap-4 text-left active:scale-[0.99]">
              <span className="w-28 h-16 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">{art}</span>
              <span className="min-w-0">
                <span className="block text-xl font-black text-slate-800">{title}</span>
                <span className="block text-sm text-slate-500 leading-snug">{sub}</span>
              </span>
            </button>
          ))}
          <PrintedReports isAdmin={isAdmin} />
        </div>
      </div>
    );
  return (
    <div className="flex flex-col h-full" data-section="wear">
      <PanelHeader title="Fune e catena" sub="Cosa dice la norma" onBack={onBack} onClose={onClose} color={color} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {tab !== "sling" && <CranePicker machines={pickable} crane={crane} onPick={setCrane} color={color} type={type} />}
        <div className="flex bg-slate-200/70 p-1 rounded-2xl" role="tablist">
          {[
            ["rope", "Fune"],
            ["chain", "Catena"],
            ["sling", "Sottoganci"],
          ].map(([id, l]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} data-wear-tab={id} className={`flex-1 h-11 rounded-xl text-sm font-black ${tab === id ? `bg-white text-${color}-700 shadow` : "text-slate-500"}`}>
              {l}
            </button>
          ))}
        </div>
        {crane && tab !== "sling" && (
          <div className="space-y-2" data-wear-history>
            {mounted ? (
              <div className="rounded-2xl bg-white border border-slate-200 p-3 text-sm" data-wear-mounted>
                <p className="text-[11px] font-black text-slate-400">{type === "fune" ? "FUNE MONTATA" : "CATENA MONTATA"} · {mounted.dateString}{mounted.technician ? ` · ${mounted.technician}` : ""}</p>
                <p className="font-bold text-slate-700">{formatRopeLong(mounted[type])}</p>
                {kr && kr.type.from === "testo" && (
                  <p className="text-xs text-slate-500 mt-0.5" data-wear-inferred>
                    Tipo di fune trovato nel rapporto: {kr.type.fas ? `FAS ${kr.type.fas}${fasFamily(kr.type.fas) ? " · " + fasFamily(kr.type.fas).cons.join(" / ") : ""}` : kr.type.teci ? `Teci ${teciFamily(kr.type.teci) ? teciFamily(kr.type.teci).name : kr.type.teci}` : ropeName(kr.type.costruzione)} — controlla che sia giusto.
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
        {tab === "sling" ? (
          <SottoganciCheck
            onWear={(preset) => {
              setChainPreset({ ...preset, kind: "imbracatura", n: Date.now() });
              setTab("chain");
            }}
          />
        ) : tab === "rope" ? (
          <RopeCheck key={`r${crane ? crane.id : ""}`} known={knownType} onReport={report} crane={crane} />
        ) : (
          <ChainCheck key={`c${crane ? crane.id : ""}${chainPreset ? chainPreset.n : ""}`} known={chainPreset || (mounted && mounted.catena)} onReport={report} crane={crane} />
        )}
        <PrintedReports isAdmin={isAdmin} />
        {tab === "sling" ? (
          <div className="flex justify-center gap-6">
            <a href={FAS_CHAINS} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-700 underline" data-chains-catalog>
              Catalogo catene FAS
            </a>
            <a href={FAS_SLINGS} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-700 underline" data-slings-catalog>
              Catalogo fasce FAS
            </a>
          </div>
        ) : (
        <div className="flex justify-center gap-6">
            <a href={FAS_CATALOG} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-700 underline" data-fas-catalog>
              Catalogo funi FAS
            </a>
            <a href={TECI_CATALOG} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-blue-700 underline" data-teci-catalog>
              Catalogo funi Teci
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
