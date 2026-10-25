// LA MIA AREA → «Compila verifica» (PROVA): compilare in cantiere il foglio della trimestrale/annuale.
// 1. scegli il cliente: il programma del Drive prepara il suo ultimo foglio di verifica (entro 5 minuti)
// 2. per ogni gru: Fune/Catena, esito e note → «Salva»
// 3. entro 5 minuti il programma lo scrive nel foglio sul Drive (colonna «Note»), dove lo vede l'ufficio.
import React, { useEffect, useMemo, useState } from "react";
import { onSnapshot } from "../../metered";
import { FileText, Search, Check, Loader2, CloudOff, AlertTriangle, ExternalLink, ChevronRight, CloudUpload } from "lucide-react";
import { PanelHeader, INPUT, Empty } from "./PersonalUi";
import { openChecksQuery, entriesQuery, prepRef, requestPrep, saveEntry, rowsOf, ESITI, ELEMENTI, guessElement, composeText, closeCheck } from "../../fieldChecks";
import { describeError } from "../../utils";

const when = (iso) => {
  const d = new Date(iso);
  return iso && !Number.isNaN(d.getTime()) ? d.toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
};

const RowCard = ({ check, row, entry, me, color }) => {
  const [elemento, setElemento] = useState(entry ? entry.elemento : guessElement(row));
  const [esito, setEsito] = useState(entry ? entry.esito : "");
  const [note, setNote] = useState(entry ? entry.note : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const changed = !entry || entry.elemento !== elemento || entry.esito !== esito || entry.note !== note.trim();
  const save = async () => {
    setBusy(true);
    setErr("");
    try {
      await saveEntry({ check, row, elemento, esito, note, me });
    } catch (e) {
      setErr("Non salvato: " + describeError(e));
    } finally {
      setBusy(false);
    }
  };
  const title = row.interno && row.fab ? `${row.interno} · fabbr. ${row.fab}` : row.fab || row.interno || row.k;
  const state = !entry ? null : entry.errore ? "err" : entry.written ? "ok" : "wait";
  return (
    <li className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2" data-field-row={row.k}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-800 break-words">{title}</p>
          <p className="text-xs text-slate-500">{[row.tipo, row.portata && `${row.portata} kg`, row.zona].filter(Boolean).join(" · ")}</p>
          {row.prima && <p className="text-xs text-slate-400 mt-0.5 break-words">Prima: {row.prima}</p>}
        </div>
        {state === "ok" && (
          <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 shrink-0" data-field-state="ok">
            <Check className="w-3.5 h-3.5" /> sul Drive
          </span>
        )}
        {state === "wait" && (
          <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1 shrink-0" data-field-state="wait">
            <CloudUpload className="w-3.5 h-3.5" /> in invio
          </span>
        )}
        {state === "err" && (
          <span className="text-[11px] font-bold text-red-700 flex items-center gap-1 shrink-0" data-field-state="err">
            <AlertTriangle className="w-3.5 h-3.5" /> non scritto
          </span>
        )}
      </div>
      <div className="flex gap-1.5">
        {ELEMENTI.map((x) => (
          <button
            key={x || "nessuno"}
            type="button"
            onClick={() => setElemento(x)}
            data-field-el={x || "-"}
            className={`h-9 px-3 rounded-full text-xs font-bold ${elemento === x ? `bg-${color}-600 text-white` : "bg-slate-100 text-slate-700"}`}
          >
            {x || "—"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {ESITI.map((x) => (
          <button
            key={x}
            type="button"
            onClick={() => setEsito(esito === x ? "" : x)}
            data-field-esito={x}
            className={`min-h-[44px] px-2 rounded-xl text-sm font-bold leading-tight ${
              esito === x ? (x === "Idonea" ? "bg-emerald-600 text-white" : x === "Idonea da tenere sotto controllo" ? "bg-amber-500 text-white" : "bg-red-600 text-white") : "bg-slate-100 text-slate-700"
            }`}
          >
            {x}
          </button>
        ))}
      </div>
      <input className={INPUT} value={note} placeholder="Note (es. 1 filo rotto, distorta…)" onChange={(e) => setNote(e.target.value)} data-field-note />
      {(esito || note.trim()) && <p className="text-xs text-slate-500">Nel foglio: «{composeText({ elemento, esito, note })}»</p>}
      {entry && entry.errore && <p className="text-xs font-bold text-red-700">{entry.errore}</p>}
      {err && <p className="text-xs font-bold text-red-700">{err}</p>}
      <button
        type="button"
        disabled={busy || !changed || (!esito && !note.trim())}
        onClick={save}
        data-action="field-save"
        className={`w-full h-11 rounded-xl bg-${color}-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40`}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {entry && !changed ? "Salvata" : "Salva"}
      </button>
    </li>
  );
};

const CheckView = ({ check, me, color, onBack, onClose }) => {
  const [entries, setEntries] = useState({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("todo");
  useEffect(
    () =>
      onSnapshot(
        entriesQuery(check.fileId),
        (s) => {
          const m = {};
          s.docs.forEach((d) => {
            const x = d.data();
            m[x.k] = x;
          });
          setEntries(m);
        },
        () => {}
      ),
    [check.fileId]
  );
  const rows = useMemo(() => rowsOf(check), [check]);
  const done = rows.filter((r) => entries[r.k]).length;
  const t = q.trim().toUpperCase().replace(/\s/g, "");
  const shown = rows.filter(
    (r) =>
      (filter === "all" || (filter === "todo" ? !entries[r.k] : !!entries[r.k])) &&
      (!t || `${r.fab}${r.interno}${r.zona}${r.tipo}`.toUpperCase().replace(/\s/g, "").includes(t))
  );
  return (
    <div className="flex flex-col h-full" data-section="field-check">
      <PanelHeader title={check.customerName || "Verifica"} sub={`${check.fileName} · ${done}/${rows.length} gru`} onBack={onBack} onClose={onClose} color={color} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {!check.scrivibile && (
          <p className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900" data-field-word>
            <AlertTriangle className="inline w-4 h-4 -mt-0.5 mr-1" />
            Questo foglio è un Word o un Excel preparato con la versione vecchia del programma del Drive: così non ci può scrivere. Torna indietro e premi di nuovo «Prepara il foglio»: il programma ne fa da solo una copia Google e la compili quella.
          </p>
        )}
        {check.scrivibile && /\(Google\)$/.test(check.fileName || "") && (
          <p className="rounded-2xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900" data-field-converted>
            Il foglio originale era un Word o un Excel: il programma ne ha fatto una copia Google nella stessa cartella («{check.fileName}») e scrive lì. L'originale resta com'era.
          </p>
        )}
        <p className="text-xs text-slate-500">
          Quello che salvi va nel foglio sul Drive entro 5 minuti (colonna «Note»; se non c'è la aggiunge).{" "}
          <a href={check.fileUrl} target="_blank" rel="noopener noreferrer" className={`font-bold text-${color}-700`}>
            Apri il foglio <ExternalLink className="inline w-3 h-3 -mt-0.5" />
          </a>
        </p>
        <div className="flex items-center gap-2 border border-slate-300 rounded-xl px-3 bg-white">
          <Search className="w-4 h-4 text-slate-400" />
          <input className="flex-1 py-2.5 text-base outline-none bg-transparent" placeholder="Cerca numero o zona…" value={q} onChange={(e) => setQ(e.target.value)} data-field-search />
        </div>
        <div className="flex gap-1.5">
          {[
            ["todo", `Da fare (${rows.length - done})`],
            ["done", `Fatte (${done})`],
            ["all", "Tutte"],
          ].map(([id, l]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} data-field-filter={id} className={`h-9 px-3 rounded-full text-xs font-bold ${filter === id ? `bg-${color}-600 text-white` : "bg-white border border-slate-200 text-slate-700"}`}>
              {l}
            </button>
          ))}
        </div>
        {!rows.length && <Empty>Nel foglio non ho trovato la tabella delle gru.</Empty>}
        <ul className="space-y-2">
          {shown.slice(0, 80).map((r) => (
            <RowCard key={r.k + (entries[r.k] ? entries[r.k].at : "")} check={check} row={r} entry={entries[r.k]} me={me} color={color} />
          ))}
        </ul>
        {shown.length > 80 && <p className="text-xs text-slate-500">…e altre {shown.length - 80}: usa la ricerca.</p>}
        {rows.length > 0 && done === rows.length && (
          <button type="button" onClick={() => closeCheck(check).then(onBack)} data-action="field-close" className="w-full h-11 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-sm">
            Verifica finita: toglila dall'elenco
          </button>
        )}
      </div>
    </div>
  );
};

export const FieldChecksPanel = ({ me, customers = [], color = "blue", onBack, onClose }) => {
  const [checks, setChecks] = useState(null);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState(null); // { id, name, at }
  const [prep, setPrep] = useState(null);
  useEffect(
    () =>
      onSnapshot(
        openChecksQuery(),
        (s) => setChecks(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.preparedAt || "").localeCompare(String(a.preparedAt || "")))),
        () => setChecks([])
      ),
    []
  );
  useEffect(() => {
    if (!asked) return undefined;
    return onSnapshot(prepRef(asked.id), (s) => setPrep(s.exists() ? s.data() : null), () => {});
  }, [asked]);
  const current = open && checks ? checks.find((c) => c.id === open) : null;
  if (current) return <CheckView check={current} me={me} color={color} onBack={() => setOpen(null)} onClose={onClose} />;

  const t = q.trim().toUpperCase();
  const found = t.length >= 2 ? customers.filter((c) => String(c.name || "").toUpperCase().includes(t)).slice(0, 8) : [];
  const ask = async (c) => {
    setAsked({ id: c.id, name: c.name, at: new Date().toISOString() });
    setPrep(null);
    setQ("");
    try {
      await requestPrep(c.id);
    } catch (e) {
      setPrep({ errore: "Richiesta non riuscita: " + describeError(e) });
    }
  };
  const ready = asked && prep && prep.at >= asked.at;
  return (
    <div className="flex flex-col h-full" data-section="field-checks">
      <PanelHeader title="Compila verifica" sub="Prova · quello che scrivi va nel foglio sul Drive" onBack={onBack} onClose={onClose} color={color} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        <section className="space-y-2">
          <h4 className="text-xs font-black text-slate-500">Prepara il foglio di un cliente</h4>
          <input className={INPUT} placeholder="Scrivi il nome del cliente…" value={q} onChange={(e) => setQ(e.target.value)} data-field-customer />
          {found.length > 0 && (
            <ul className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {found.map((c) => (
                <li key={c.id}>
                  <button type="button" className="w-full text-left p-3 font-bold text-slate-800" onClick={() => ask(c)} data-field-pick={c.name}>
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {asked && (
            <p className={`text-sm rounded-2xl p-3 ${ready && prep.errore ? "bg-red-50 text-red-800" : "bg-white border border-slate-200 text-slate-700"}`} data-field-asked>
              {!ready ? (
                <>
                  <Loader2 className="inline w-4 h-4 -mt-0.5 mr-1 animate-spin" /> Preparo il foglio di <b>{asked.name}</b>: entro 5 minuti compare qui sotto.
                </>
              ) : prep.errore ? (
                <>Non riesco a preparare il foglio di {asked.name}: {prep.errore}</>
              ) : (
                <>Pronto: il foglio di {asked.name} è qui sotto.</>
              )}
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h4 className="text-xs font-black text-slate-500">Verifiche da compilare</h4>
          {checks === null ? (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carico…
            </p>
          ) : !checks.length ? (
            <Empty>Nessuna verifica pronta. Cerca il cliente qui sopra: il programma prepara il suo ultimo foglio di verifica.</Empty>
          ) : (
            <ul className="space-y-2">
              {checks.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setOpen(c.id)} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3" data-field-check={c.customerName}>
                    <FileText className={`w-5 h-5 shrink-0 text-${color}-600`} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-black text-slate-800 truncate">{c.customerName}</span>
                      <span className="block text-xs text-slate-500 truncate">
                        {c.fileName} · {rowsOf(c).length} gru · preparato {when(c.preparedAt)}
                      </span>
                      {!c.scrivibile && (
                        <span className="block text-xs font-bold text-amber-700">
                          <CloudOff className="inline w-3.5 h-3.5 -mt-0.5 mr-1" />
                          da preparare di nuovo (Word/Excel)
                        </span>
                      )}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};
