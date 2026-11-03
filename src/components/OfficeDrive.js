// UFFICIO → scheda «Drive»: quello che il programma del Drive legge ogni mattina dai fogli di verifica
// (apps-script/paesi-dal-drive.gs → drive_cranes), messo a disposizione dell'ufficio. L'app legge e basta:
// nel Drive non cambia niente.
//  - «Ultime verifiche»: per ogni cliente l'ultimo foglio di verifica, con «Apri» (si apre nel Drive)
//  - «Funi e catene»: le gru che all'ultima verifica avevano fune o catena da sostituire (rosso) o da tenere d'occhio (giallo)
import React, { useEffect, useMemo, useState } from "react";
import { collection } from "firebase/firestore";
import { FileText, ExternalLink, Search, X, Loader2, Link2 } from "lucide-react";
import { db, appId } from "../firebase";
import { loadDaily } from "../dailyCache";
import { withFix, statoTone, machineOfRow } from "../driveCranes";
import { getSafeMatricola } from "../utils";

// tutte le gru lette dal Drive (stessa copia di Admin → Drive: dal server al massimo una volta al giorno)
let rowsCache = null;
const loadAll = () => {
  if (!rowsCache)
    rowsCache = loadDaily("drive_cranes", collection(db, "artifacts", appId, "public", "data", "drive_cranes")).catch((e) => {
      console.error(e);
      rowsCache = null;
      return null;
    });
  return rowsCache;
};

const norm = (s) => String(s || "").trim().toLowerCase();
const day = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
};

// un foglio per cartella (il più recente), con il cliente; più i clienti che hanno solo paese/indirizzo dal Drive
export const lastSheets = (rows = [], customers = []) => {
  const by = new Map();
  rows.forEach((r) => {
    if (!r.foglioUrl) return;
    const k = r.cartellaId || r.cartella || r.customerId || r.customerName;
    const old = by.get(k);
    if (!old || String(r.foglioData || "") > String(old.date || ""))
      by.set(k, {
        key: k,
        customer: r.customerName || "",
        folder: String(r.cartella || "").split(" › ").slice(1).join(" › "),
        label: r.foglio || "",
        name: r.foglioNome || "",
        url: r.foglioUrl,
        date: r.foglioData || "",
      });
  });
  const have = new Set([...by.values()].map((x) => norm(x.customer)));
  customers.forEach((c) => {
    if (!c.placeSheetUrl || have.has(norm(c.name))) return;
    by.set("c:" + c.id, { key: "c:" + c.id, customer: c.name, folder: "", label: "", name: c.placeSheet || "", url: c.placeSheetUrl, date: "" });
  });
  return [...by.values()].sort((a, b) => a.customer.localeCompare(b.customer) || a.folder.localeCompare(b.folder));
};

// gru con fune o catena da sostituire (red) o da tenere d'occhio (amber): prima le rosse
export const ropeList = (rows = [], machines = []) =>
  rows
    .map((r) => ({ r, tone: statoTone(r.stato) }))
    .filter((x) => x.tone === "red" || x.tone === "amber")
    .map(({ r, tone }) => {
      const m = machineOfRow(r, machines);
      return {
        key: r.id,
        tone,
        customer: r.customerName || "",
        crane: m ? getSafeMatricola(m) : r.fab || r.interno || "",
        inApp: !!m,
        tipo: [r.tipo, r.portata ? `${r.portata} kg` : ""].filter(Boolean).join(" · "),
        stato: r.stato,
        label: r.foglio || "",
        url: r.foglioUrl || "",
      };
    })
    .sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "red" ? -1 : 1) || a.customer.localeCompare(b.customer));

const TONE = {
  red: { chip: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", label: "Da sostituire" },
  amber: { chip: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500", label: "Da tenere d'occhio" },
};
const FIRST = 15;

const OpenLink = ({ url, color, label = "Apri" }) =>
  url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`shrink-0 h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-${color}-700 flex items-center gap-1.5`}
      data-open-sheet
    >
      <ExternalLink className="w-4 h-4" /> {label}
    </a>
  ) : null;

const Card = ({ icon: Icon, title, sub, color, children, section }) => (
  <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm" data-section={section}>
    <div className="flex items-start gap-3 mb-3">
      <span className={`w-11 h-11 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-black text-slate-800">{title}</p>
        <p className="text-sm text-slate-500">{sub}</p>
      </div>
    </div>
    {children}
  </div>
);

export const OfficeDrive = ({ customers = [], machines = [], color = "blue" }) => {
  const [rows, setRows] = useState(undefined);
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const [tone, setTone] = useState("all");
  const [allRopes, setAllRopes] = useState(false);
  useEffect(() => {
    let alive = true;
    loadAll().then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, []);
  const clean = useMemo(() => (rows || []).filter((r) => r && !r.hidden).map(withFix), [rows]);
  const sheets = useMemo(() => lastSheets(clean, customers), [clean, customers]);
  const ropes = useMemo(() => ropeList(clean, machines), [clean, machines]);
  const updated = useMemo(() => day(clean.map((r) => r.updatedAt || "").sort().pop() || ""), [clean]);

  if (rows === undefined)
    return (
      <p className="p-6 text-sm text-slate-500 flex items-center gap-2" data-section="office-drive">
        <Loader2 className="w-4 h-4 animate-spin" /> Carico i dati del Drive…
      </p>
    );
  if (rows === null)
    return (
      <p className="p-6 text-sm text-slate-600" data-section="office-drive">
        Non riesco a leggere i dati del Drive adesso: controlla la rete e riprova.
      </p>
    );

  const words = norm(q).split(/\s+/).filter(Boolean);
  const found = sheets.filter((s) => words.every((w) => norm(`${s.customer} ${s.folder} ${s.name}`).includes(w)));
  const shownSheets = all || q ? found : found.slice(0, FIRST);
  const ropesF = tone === "all" ? ropes : ropes.filter((r) => r.tone === tone);
  const shownRopes = allRopes ? ropesF : ropesF.slice(0, FIRST);
  const count = (t) => ropes.filter((r) => r.tone === t).length;

  return (
    <div className="space-y-6" data-section="office-drive">
      <p className="text-sm text-slate-500">
        Dai fogli di verifica nel Drive, letti ogni mattina dal programma del Drive{updated ? ` (ultimo giro: ${updated})` : ""}. Qui si guarda e basta: nel Drive non cambia niente.
      </p>

      <Card icon={FileText} title="Ultime verifiche" sub="L'ultimo foglio di verifica di ogni cliente: «Apri» lo apre nel Drive." color={color} section="drive-sheets">
        <div className="relative mb-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca cliente…"
            className="w-full h-11 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm outline-none"
            data-drive-search
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Cancella" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {!sheets.length && <p className="text-sm text-slate-500 py-2">Nessun foglio letto dal Drive per ora.</p>}
        {sheets.length > 0 && !found.length && <p className="text-sm text-slate-500 py-2">Nessun cliente con questo nome.</p>}
        <ul>
          {shownSheets.map((s) => (
            <li key={s.key} className="flex items-center gap-3 py-2.5 border-t border-slate-100 first:border-t-0" data-sheet-row={s.customer}>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">
                  {s.customer}
                  {s.folder && <span className="font-medium text-slate-400"> › {s.folder}</span>}
                </p>
                <p className="text-xs text-slate-500 truncate" title={s.name}>
                  {s.label || s.name || "Foglio di verifica"}
                  {s.date ? ` · modificato il ${day(s.date)}` : ""}
                </p>
              </div>
              <OpenLink url={s.url} color={color} />
            </li>
          ))}
        </ul>
        {!all && !q && found.length > FIRST && (
          <button type="button" onClick={() => setAll(true)} className={`mt-1 text-sm font-bold text-${color}-700`} data-sheets-more>
            Mostra tutti ({found.length})
          </button>
        )}
      </Card>

      <Card
        icon={Link2}
        title="Funi e catene"
        sub="Le gru che all'ultima verifica avevano la fune o la catena da sostituire o da tenere d'occhio."
        color={color}
        section="drive-ropes"
      >
        {!ropes.length ? (
          <p className="text-sm text-emerald-700 font-bold py-1" data-ropes-none>
            All'ultima verifica nessuna fune o catena era da sostituire o da tenere d'occhio.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-2" data-ropes-filter>
              {[
                ["all", `Tutte (${ropes.length})`, "bg-slate-50 text-slate-700 border-slate-200"],
                ["red", `${TONE.red.label} (${count("red")})`, TONE.red.chip],
                ["amber", `${TONE.amber.label} (${count("amber")})`, TONE.amber.chip],
              ].map(([id, label, cls]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTone(id)}
                  className={`h-9 px-3 rounded-full border text-xs font-bold ${cls} ${tone === id ? "ring-2 ring-offset-1 ring-slate-400" : "opacity-80"}`}
                  data-ropes-tab={id}
                >
                  {label}
                </button>
              ))}
            </div>
            <ul>
              {shownRopes.map((r) => (
                <li key={r.key} className="flex items-start gap-3 py-2.5 border-t border-slate-100 first:border-t-0" data-rope-row={r.tone}>
                  <span className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${TONE[r.tone].dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm">
                      {r.customer}
                      {r.crane && <span className="font-semibold text-slate-500"> · gru {r.crane}</span>}
                    </p>
                    <p className={`text-sm font-bold ${r.tone === "red" ? "text-red-700" : "text-amber-800"}`} data-rope-stato>
                      {r.stato}
                    </p>
                    <p className="text-xs text-slate-500">
                      {[r.tipo, r.label, r.inApp ? "" : "non abbinata a una gru dell'app"].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <OpenLink url={r.url} color={color} label="Foglio" />
                </li>
              ))}
            </ul>
            {!allRopes && ropesF.length > FIRST && (
              <button type="button" onClick={() => setAllRopes(true)} className={`mt-1 text-sm font-bold text-${color}-700`} data-ropes-more>
                Mostra tutte ({ropesF.length})
              </button>
            )}
          </>
        )}
      </Card>
    </div>
  );
};
