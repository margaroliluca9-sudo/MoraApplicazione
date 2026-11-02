// LA MIA AREA → «Compila verifica» (PROVA): compilare in cantiere il foglio della trimestrale/annuale.
// 1. «Verifiche da eseguire»: il programma del Drive mette qui da solo le verifiche appena caricate (periodo di
//    questo mese o del mese prima nel nome, es. «T10.26»). Se non c'è, «Non la trovi?» → cerca il cliente.
// 2. per ogni gru un tocco sull'esito e la gru è salvata (Fune/Catena e note facoltative)
// 3. il programma lo scrive nel foglio sul Drive (colonna «Note»): subito se in Admin c'è l'indirizzo «App web»,
//    altrimenti entro 5 minuti.
import React, { useEffect, useMemo, useState } from "react";
import { onSnapshot } from "../../metered";
import { FileText, Search, Check, Loader2, CloudOff, AlertTriangle, ExternalLink, ChevronRight, UploadCloud, RefreshCw } from "lucide-react";
import { PanelHeader, INPUT, Empty } from "./PersonalUi";
import { openChecksQuery, entriesQuery, prepRef, requestPrep, saveEntry, rowsOf, ESITI, ELEMENTI, guessElement, composeText, closeCheck, periodLabel, altFilesOf, checkVisible } from "../../fieldChecks";
import { describeError } from "../../utils";

const when = (iso) => {
  const d = new Date(iso);
  return iso && !Number.isNaN(d.getTime()) ? d.toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
};

const ESITO_ON = { Idonea: "bg-emerald-600 text-white", "Idonea da tenere sotto controllo": "bg-amber-500 text-white" };

// una gru: un tocco sull'esito = salvata. Fune/Catena e note si possono cambiare anche dopo.
const RowCard = ({ check, row, entry, me, color, hook, onSaved }) => {
  const [elemento, setElemento] = useState(entry ? entry.elemento : guessElement(row));
  const [esito, setEsito] = useState(entry ? entry.esito : "");
  const [note, setNote] = useState(entry ? entry.note : "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const save = async (el, es, nt) => {
    if (!es && !String(nt || "").trim()) return;
    setBusy(true);
    setErr("");
    try {
      await saveEntry({ check, row, elemento: el, esito: es, note: nt, me, hook });
      onSaved(row.k);
    } catch (e) {
      setErr("Non salvato: " + describeError(e));
    } finally {
      setBusy(false);
    }
  };
  const noteChanged = (entry ? entry.note || "" : "") !== note.trim();
  const title = row.interno && row.fab ? `${row.interno} · fabbr. ${row.fab}` : row.fab || row.interno || row.k;
  const state = !entry ? null : entry.errore ? "err" : entry.written ? "ok" : "wait";
  return (
    <li className={`bg-white rounded-2xl border p-3 space-y-2 ${entry ? "border-emerald-200" : "border-slate-200"}`} data-field-row={row.k}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-800 break-words">{title}</p>
          <p className="text-xs text-slate-500">{[row.tipo, row.portata && `${row.portata} kg`, row.zona].filter(Boolean).join(" · ")}</p>
          {row.prima && <p className="text-xs text-slate-400 mt-0.5 break-words">Prima: {row.prima}</p>}
        </div>
        {busy && <Loader2 className="w-4 h-4 animate-spin text-slate-400 shrink-0" />}
        {!busy && state === "ok" && (
          <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 shrink-0" data-field-state="ok">
            <Check className="w-3.5 h-3.5" /> sul Drive
          </span>
        )}
        {!busy && state === "wait" && (
          <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1 shrink-0" data-field-state="wait">
            <UploadCloud className="w-3.5 h-3.5" /> in invio
          </span>
        )}
        {!busy && state === "err" && (
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
            disabled={busy}
            onClick={() => {
              setElemento(x);
              if (entry) save(x, esito, note);
            }}
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
            disabled={busy}
            onClick={() => {
              setEsito(x);
              save(elemento, x, note);
            }}
            data-field-esito={x}
            className={`min-h-[48px] px-2 rounded-xl text-sm font-bold leading-tight ${esito === x ? ESITO_ON[x] || "bg-red-600 text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {x}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          className={`${INPUT} flex-1`}
          value={note}
          placeholder="Note (facoltative: 1 filo rotto, distorta…)"
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && noteChanged) save(elemento, esito, note);
          }}
          data-field-note
        />
        {noteChanged && (esito || note.trim()) && (
          <button type="button" disabled={busy} onClick={() => save(elemento, esito, note)} data-action="field-save" className={`h-11 px-3 rounded-xl bg-${color}-600 text-white text-sm font-bold shrink-0`}>
            Salva
          </button>
        )}
      </div>
      {(esito || note.trim()) && <p className="text-xs text-slate-500">Nel foglio: «{composeText({ elemento, esito, note })}»</p>}
      {entry && entry.errore && <p className="text-xs font-bold text-red-700">{entry.errore}</p>}
      {err && <p className="text-xs font-bold text-red-700">{err}</p>}
    </li>
  );
};

// quale file ha scelto il programma e perché; «Non è questo?» → elenco degli altri fogli della cartella
const WhichFile = ({ check, color, onRepick }) => {
  const [show, setShow] = useState(false);
  const per = periodLabel(check.fileName);
  const others = altFilesOf(check).filter((a) => a.id !== check.fileId && a.id !== check.originale);
  const office = check.tipoFile === "word" || check.tipoFile === "excel";
  return (
    <div className="rounded-2xl bg-white border-2 border-slate-300 p-3 space-y-2" data-field-which>
      <p className="text-xs text-slate-500">Stai compilando</p>
      <p className="font-black text-slate-800 break-words" data-field-file>
        {check.fileName}
      </p>
      <p className="text-xs text-slate-600">
        {check.scelto === "tecnico"
          ? "L'hai scelto tu dall'elenco."
          : check.scelto === "auto"
            ? `Caricato da poco nel Drive${per ? `: è la ${per}` : ""}.`
            : per
              ? `Scelto dal nome: è la ${per}, la più recente nella cartella.`
              : "Nella cartella non c'è nessun foglio con il periodo nel nome (es. «T10.26»): ho preso l'ultimo caricato. Controlla che sia quello giusto."}
      </p>
      {office && (
        <p className="text-xs text-blue-900 bg-blue-50 rounded-xl p-2" data-field-converted>
          {check.scrittoNome
            ? `È un ${check.tipoFile === "word" ? "Word" : "Excel"}: le note sono nella copia Google «${check.scrittoNome}», nella stessa cartella. L'originale resta com'era.`
            : `È un ${check.tipoFile === "word" ? "Word" : "Excel"}: alla prima nota il programma ne fa da solo una copia Google nella stessa cartella («… (Google)») e scrive lì. L'originale resta com'era.`}
        </p>
      )}
      {others.length > 0 && onRepick && (
        <button type="button" onClick={() => setShow(!show)} data-action="field-other" className={`text-xs font-bold text-${color}-700 flex items-center gap-1`}>
          <RefreshCw className="w-3.5 h-3.5" /> Non è questo? Scegli un altro foglio
        </button>
      )}
      {show && (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl" data-field-others>
          {others.map((a) => (
            <li key={a.id}>
              <button type="button" onClick={() => onRepick(check, a)} className="w-full text-left p-2.5" data-field-alt={a.n}>
                <span className="block text-sm font-bold text-slate-800 break-words">{a.n}</span>
                <span className="block text-xs text-slate-500">{[periodLabel(a.n), `caricato ${when(a.d)}`].filter(Boolean).join(" · ")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const CheckView = ({ check, me, color, hook, onBack, onClose, onRepick }) => {
  const [entries, setEntries] = useState({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("todo");
  const [justDone, setJustDone] = useState({}); // fatte adesso: restano in «Da fare» finché non esci (per aggiungere la nota)
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
      (filter === "all" || (filter === "todo" ? !entries[r.k] || justDone[r.k] : !!entries[r.k])) &&
      (!t || `${r.fab}${r.interno}${r.zona}${r.tipo}`.toUpperCase().replace(/\s/g, "").includes(t))
  );
  const url = check.scrittoUrl || check.fileUrl;
  return (
    <div className="flex flex-col h-full" data-section="field-check">
      <PanelHeader title={check.customerName || "Verifica"} sub={`${done}/${rows.length} gru fatte`} onBack={onBack} onClose={onClose} color={color} />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        <WhichFile check={check} color={color} onRepick={onRepick} />
        {!check.scrivibile && (
          <p className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900" data-field-word>
            <AlertTriangle className="inline w-4 h-4 -mt-0.5 mr-1" />
            Preparato con la versione vecchia del programma del Drive: torna indietro, cerca il cliente e preparalo di nuovo.
          </p>
        )}
        <p className="text-xs text-slate-500">
          Tocca l'esito e la gru è salvata. Va nel foglio sul Drive {hook ? "in pochi secondi" : "entro 5 minuti"} (colonna «Note»; se non c'è la aggiunge).{" "}
          <a href={url} target="_blank" rel="noopener noreferrer" className={`font-bold text-${color}-700`}>
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
            <RowCard key={r.k} check={check} row={r} entry={entries[r.k]} me={me} color={color} hook={hook} onSaved={(k) => setJustDone((p) => ({ ...p, [k]: true }))} />
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

export const FieldChecksPanel = ({ me, customers = [], color = "blue", hook = "", onBack, onClose }) => {
  const [checks, setChecks] = useState(null);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState(null); // { id, name, at }
  const [prep, setPrep] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  useEffect(
    () =>
      onSnapshot(
        openChecksQuery(),
        (s) =>
          setChecks(
            s.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((c) => checkVisible(c))
              .sort((a, b) => (Number(b.periodo) || 0) - (Number(a.periodo) || 0) || String(a.customerName || "").localeCompare(String(b.customerName || "")))
          ),
        () => setChecks([])
      ),
    []
  );
  useEffect(() => {
    if (!asked) return undefined;
    return onSnapshot(prepRef(asked.id), (s) => setPrep(s.exists() ? s.data() : null), () => {});
  }, [asked]);
  // il tecnico sceglie un altro foglio: tolgo questo dall'elenco e chiedo di preparare quello
  const repick = async (check, alt) => {
    setOpen(null);
    setShowSearch(true);
    setAsked({ id: check.customerId, name: check.customerName, at: new Date().toISOString() });
    setPrep(null);
    try {
      await closeCheck(check);
      await requestPrep(check.customerId, alt.id, hook);
    } catch (e) {
      setPrep({ errore: "Richiesta non riuscita: " + describeError(e), at: new Date().toISOString() });
    }
  };
  const current = open && checks ? checks.find((c) => c.id === open) : null;
  if (current) return <CheckView check={current} me={me} color={color} hook={hook} onBack={() => setOpen(null)} onClose={onClose} onRepick={repick} />;

  const t = q.trim().toUpperCase();
  const found = t.length >= 2 ? customers.filter((c) => String(c.name || "").toUpperCase().includes(t)).slice(0, 8) : [];
  const ask = async (c) => {
    setAsked({ id: c.id, name: c.name, at: new Date().toISOString() });
    setPrep(null);
    setQ("");
    try {
      await requestPrep(c.id, "", hook);
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
          <h4 className="text-xs font-black text-slate-500">Verifiche da eseguire</h4>
          {checks === null ? (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carico…
            </p>
          ) : !checks.length ? (
            <Empty>Nessuna verifica pronta. Appena l'ufficio carica nel Drive la trimestrale o l'annuale del mese, compare qui da sola.</Empty>
          ) : (
            <ul className="space-y-2">
              {checks.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setOpen(c.id)} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3" data-field-check={c.customerName}>
                    <FileText className={`w-5 h-5 shrink-0 text-${color}-600`} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-black text-slate-800 truncate">{c.customerName}</span>
                      <span className="block text-xs text-slate-500 truncate">{[periodLabel(c.fileName) || c.fileName, `${rowsOf(c).length} gru`].join(" · ")}</span>
                      {!c.scrivibile && (
                        <span className="block text-xs font-bold text-amber-700">
                          <CloudOff className="inline w-3.5 h-3.5 -mt-0.5 mr-1" />
                          da preparare di nuovo
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

        <section className="space-y-2">
          {!showSearch && !asked ? (
            <button type="button" onClick={() => setShowSearch(true)} data-action="field-search-open" className={`text-sm font-bold text-${color}-700 flex items-center gap-1`}>
              <Search className="w-4 h-4" /> Non la trovi? Cerca il cliente
            </button>
          ) : (
            <>
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
            </>
          )}
          {asked && (
            <p className={`text-sm rounded-2xl p-3 ${ready && prep.errore ? "bg-red-50 text-red-800" : "bg-white border border-slate-200 text-slate-700"}`} data-field-asked>
              {!ready ? (
                <>
                  <Loader2 className="inline w-4 h-4 -mt-0.5 mr-1 animate-spin" /> Preparo il foglio di <b>{asked.name}</b>: {hook ? "qualche secondo" : "entro 5 minuti"} e compare qui sopra.
                </>
              ) : prep.errore ? (
                <>Non riesco a preparare il foglio di {asked.name}: {prep.errore}</>
              ) : (
                <>Pronto: il foglio di {asked.name} è qui sopra.</>
              )}
            </p>
          )}
        </section>
      </div>
    </div>
  );
};
