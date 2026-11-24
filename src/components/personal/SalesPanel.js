// COMMERCIALE (La mia area, solo per i tecnici abilitati): una LISTA condivisa delle cose da fare con i clienti.
// In cima si scrive una riga («Rossi: richiamare per il preventivo della fune»), si sceglie chi la segue e quando;
// ogni riga ha la spunta «fatto». Toccando la riga: le note di chi l'ha seguita, con data e nome.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Trash2, Plus, Bell, FileSpreadsheet, Search, Mic } from "lucide-react";
import { XLSX_TYPE } from "../../xlsx";
import { PanelHeader, Sheet, PrimaryBtn, GhostBtn, Empty, INPUT } from "./PersonalUi";
import { key } from "../../chat";
import { todayIso, relDay } from "../../personal";
import { isOpen, dueState, lastEntry, sortItems, shortDate, isoShort, plusDays, nextMonday, nameOf, saveItem, withEntry, removeItem, salesXlsx, salesFileName, QUICK } from "../../sales";

const WHEN = () => [
  ["Oggi", todayIso()],
  ["Domani", plusDays(1)],
  ["Lunedì", nextMonday()],
  ["Tra una settimana", plusDays(7)],
];
const Chip = ({ on, onClick, children, data }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    data-chip={data}
    className={`min-h-10 px-3 rounded-full border text-sm font-bold ${on ? "bg-slate-800 border-slate-800 text-white" : "bg-white border-slate-300 text-slate-700"}`}
  >
    {children}
  </button>
);
// il testo della riga (le pratiche vecchie avevano cliente e titolo separati)
const textOf = (it) => [it.customer, it.title].filter(Boolean).join(": ");
const whenText = (it) => {
  if (!it.nextDate) return "";
  return dueState(it) === "late" ? `in ritardo, era per il ${isoShort(it.nextDate)}` : relDay(it.nextDate).toLowerCase();
};

// una riga della lista
const Row = ({ it, me, onToggle, onOpen }) => {
  const done = !isOpen(it);
  const d = dueState(it);
  const le = lastEntry(it);
  return (
    <div className="flex items-start gap-3 bg-white rounded-2xl border border-slate-200 px-3 py-2.5" data-sales-item={it.id} data-done={done ? "1" : "0"}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? "Segna da fare" : "Segna fatto"}
        data-action="sales-toggle"
        className={`mt-0.5 w-8 h-8 rounded-full border-2 shrink-0 flex items-center justify-center ${done ? "bg-emerald-600 border-emerald-600" : "bg-white border-slate-300"}`}
      >
        {done && <Check className="w-5 h-5 text-white" />}
      </button>
      <button type="button" onClick={onOpen} className="flex-1 min-w-0 text-left" data-action="sales-open">
        <span className={`block font-bold leading-snug break-words ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>{textOf(it)}</span>
        <span className="flex flex-wrap items-center gap-x-2 mt-0.5 text-xs font-semibold">
          <span className={key(it.owner) === key(me) ? "text-blue-700 font-black" : "text-slate-500 font-black"}>{nameOf(it.owner)}</span>
          {!done && it.nextDate && <span className={d === "late" ? "text-red-600 font-black" : d === "today" ? "text-orange-600 font-black" : "text-slate-500"}>{whenText(it)}</span>}
          {le && <span className="text-slate-400 truncate">{le.text}</span>}
        </span>
      </button>
    </div>
  );
};

// una riga aperta: testo, chi, quando, note; fatto ed elimina
const RowSheet = ({ me, users, item, onClose, color }) => {
  const [text, setText] = useState(textOf(item));
  const [note, setNote] = useState("");
  const [owner, setOwner] = useState(key(item.owner));
  const [nextDate, setNextDate] = useState(item.nextDate || "");
  const [remind, setRemind] = useState(false);
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = async (extra = {}) => {
    if (busy || !text.trim()) return;
    setBusy(true);
    let it = { ...item, customer: "", title: text.trim(), owner, nextDate, ...extra };
    if (note.trim()) it = withEntry(it, me, "note", note);
    try {
      await saveItem(me, it, { remind });
      onClose();
    } catch (e) {
      setBusy(false);
    }
  };
  const entries = [...(item.entries || [])].reverse();
  const open = isOpen(item);
  return (
    <Sheet
      title="Da fare"
      onClose={onClose}
      section="sales-item"
      footer={
        <>
          <GhostBtn onClick={() => save({ status: open ? "done" : "todo" })} data-action="sales-done">
            {open ? "Fatto" : "Da rifare"}
          </GhostBtn>
          <PrimaryBtn color={color} disabled={busy || !text.trim()} onClick={() => save()} data-action="sales-update">
            {busy ? "Salvo…" : "Salva"}
          </PrimaryBtn>
        </>
      }
    >
      <textarea className={INPUT} rows={2} value={text} onChange={(e) => setText(e.target.value)} aria-label="Cosa c'è da fare" data-sales-input="text" />
      <div className="space-y-1.5">
        <p className="text-xs font-black text-slate-500">Chi</p>
        <div className="flex flex-wrap gap-1.5">
          {users.map((u) => (
            <Chip key={u} on={owner === u} onClick={() => setOwner(u)} data={"owner-" + u}>
              {nameOf(u)}
            </Chip>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-black text-slate-500">Quando</p>
        <div className="flex flex-wrap gap-1.5">
          {WHEN().map(([l, d]) => (
            <Chip key={l} on={nextDate === d} onClick={() => setNextDate(d)} data={"date-" + l}>
              {l}
            </Chip>
          ))}
          <Chip on={!nextDate} onClick={() => setNextDate("")} data="date-none">
            Senza data
          </Chip>
        </div>
        <input type="date" className={INPUT} value={nextDate} onChange={(e) => setNextDate(e.target.value)} aria-label="Giorno" />
        {nextDate && (
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} className="w-5 h-5" data-sales-input="remind" />
            <Bell className="w-4 h-4 text-orange-600" /> Avvisa {nameOf(owner)} sul telefono quel giorno alle 9
          </label>
        )}
      </div>
      <div className="space-y-1.5">
        <p className="text-xs font-black text-slate-500">Aggiungi una nota</p>
        <input className={INPUT} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. chiamato, mi richiama lunedì" aria-label="Nota" data-sales-input="note" />
      </div>
      {entries.length > 0 && (
        <div className="space-y-2" data-section="sales-diary">
          <p className="text-xs font-black text-slate-500">Note</p>
          {entries.map((e, i) => (
            <p key={i} className="text-sm text-slate-700" data-sales-entry>
              <b className="text-slate-500 text-xs">
                {shortDate(e.at)} · {nameOf(e.who)}
              </b>{" "}
              {e.text}
            </p>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={async () => {
          if (!ask) return setAsk(true);
          await removeItem(item.id);
          onClose();
        }}
        className={`w-full h-11 rounded-xl text-sm font-bold border flex items-center justify-center gap-2 ${ask ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-500 border-slate-200"}`}
        data-action="sales-delete"
      >
        <Trash2 className="w-4 h-4" /> {ask ? "Sicuro? Tocca di nuovo per eliminarla" : "Elimina"}
      </button>
    </Sheet>
  );
};

// CHI VEDE IL COMMERCIALE: i tecnici accesi vedono la sezione e la lista; si tocca per mettere o togliere
const PeopleSheet = ({ me, users, allTechs, onUsers, onClose, color }) => {
  const all = [...new Set([...users, ...allTechs.map((t) => key(t.name)).filter(Boolean)])];
  const [sel, setSel] = useState(users);
  const [busy, setBusy] = useState(false);
  const meOut = !sel.includes(key(me));
  return (
    <Sheet
      title="Chi vede il Commerciale"
      onClose={onClose}
      section="sales-people"
      footer={
        <>
          <GhostBtn onClick={onClose}>Annulla</GhostBtn>
          <PrimaryBtn
            color={color}
            disabled={busy || !sel.length}
            data-action="sales-people-save"
            onClick={async () => {
              setBusy(true);
              try {
                await onUsers(sel);
                onClose();
              } catch (e) {
                setBusy(false);
              }
            }}
          >
            {busy ? "Salvo…" : "Salva"}
          </PrimaryBtn>
        </>
      }
    >
      <p className="text-sm text-slate-600">Tocca i nomi: chi è acceso vede la sezione Commerciale e tutta la lista. Gli altri non la vedono.</p>
      <div className="flex flex-wrap gap-1.5">
        {all.map((u) => (
          <Chip key={u} on={sel.includes(u)} onClick={() => setSel((s) => (s.includes(u) ? s.filter((x) => x !== u) : [...s, u]))} data={"people-" + u}>
            {sel.includes(u) ? "✓ " : ""}
            {nameOf(u)}
          </Chip>
        ))}
      </div>
      {meOut && sel.length > 0 && <p className="text-sm font-bold text-red-700">Hai tolto te stesso: dopo il salvataggio non vedrai più il Commerciale.</p>}
      {!sel.length && <p className="text-sm font-bold text-red-700">Lascia almeno una persona.</p>}
    </Sheet>
  );
};

// DETTATURA: il microfono del telefono (riconoscimento vocale del browser, gratis). Se il telefono non lo
// supporta il pulsante non compare. Il testo dettato si aggiunge a quello già scritto.
const SpeechRec = () => (typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)) || null;
const MicButton = ({ onText }) => {
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");
  const rec = useRef(null);
  useEffect(() => () => { try { rec.current && rec.current.abort(); } catch (e) { /* già fermo */ } }, []);
  const Rec = SpeechRec();
  if (!Rec) return null;
  const start = () => {
    if (on) { try { rec.current && rec.current.stop(); } catch (e) { /* già fermo */ } return; }
    setErr("");
    const r = new Rec();
    r.lang = "it-IT";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (ev) => {
      const t = [...ev.results].map((x) => x[0].transcript).join(" ").trim();
      if (t) onText(t.charAt(0).toUpperCase() + t.slice(1));
    };
    r.onerror = (ev) => setErr(ev.error === "not-allowed" || ev.error === "service-not-allowed" ? "Il microfono non è permesso: attivalo nelle impostazioni del telefono." : ev.error === "no-speech" ? "Non ho sentito niente, riprova." : "Dettatura non riuscita, riprova.");
    r.onend = () => setOn(false);
    rec.current = r;
    try { r.start(); setOn(true); } catch (e) { setErr("Dettatura non riuscita, riprova."); }
  };
  return (
    <>
      <button type="button" onClick={start} aria-label={on ? "Ferma la dettatura" : "Detta con il microfono"} className={`w-full h-11 rounded-xl text-sm font-black flex items-center justify-center gap-2 border-2 ${on ? "bg-blue-50 border-blue-400 text-blue-800 animate-pulse" : "bg-white border-slate-200 text-slate-700"}`} data-action="sales-mic">
        <Mic className="w-5 h-5" /> {on ? "Sto ascoltando… tocca per fermare" : "Detta a voce"}
      </button>
      {err && <p className="text-xs font-semibold text-slate-600">{err}</p>}
    </>
  );
};

export const SalesPanel = ({ me, items = [], users = [], allTechs = [], onUsers = null, color = "blue", onBack, onClose }) => {
  const [q, setQ] = useState("");
  const [people, setPeople] = useState(false);
  const [text, setText] = useState("");
  const [owner, setOwner] = useState(key(me));
  const [nextDate, setNextDate] = useState("");
  const [who, setWho] = useState("all");
  const [showDone, setShowDone] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);
  const others = users.filter((u) => u !== key(me));
  // ricerca: cerca nel testo, nelle note e nel nome di chi la segue; trova anche le righe già fatte
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const match = (it) => {
    if (!words.length) return true;
    const t = [it.customer, it.title, nameOf(it.owner), ...(it.entries || []).map((e) => e.text)].join(" ").toLowerCase();
    return words.every((w) => t.includes(w));
  };
  const todo = useMemo(() => sortItems(items.filter((it) => isOpen(it) && (who === "all" || key(it.owner) === who) && match(it))), [items, who, q]);
  const done = useMemo(() => sortItems(items.filter((it) => !isOpen(it) && (who === "all" || key(it.owner) === who) && match(it))).slice(0, 30), [items, who, q]);
  const add = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await saveItem(me, { title: text.trim(), owner, nextDate, status: "todo", kind: "other", entries: [] });
      setText("");
      setNextDate("");
    } finally {
      setBusy(false);
    }
  };
  const toggle = (it) => saveItem(me, { ...it, status: isOpen(it) ? "done" : "todo" });
  // tabella Excel di tutta la lista: sul telefono si condivide (WhatsApp, mail, Drive…), altrimenti si scarica
  const excel = async () => {
    const name = salesFileName();
    const blob = new Blob([salesXlsx(items)], { type: XLSX_TYPE });
    let file = null;
    try {
      file = new File([blob], name, { type: XLSX_TYPE });
    } catch (e) {
      file = null;
    }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const opened = openId && items.find((i) => i.id === openId);
  return (
    <div className="flex flex-col h-full bg-slate-50" data-section="sales">
      <PanelHeader
        title="Commerciale"
        sub={others.length ? `Lista condivisa con ${others.map(nameOf).join(", ")}` : "Lista delle cose da fare"}
        onBack={onBack}
        onClose={onClose}
        color={color}
        action={onUsers ? { id: "sales-people", label: "Persone", onClick: () => setPeople(true) } : null}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <section className="bg-white rounded-2xl border-2 border-blue-200 p-3 space-y-2" data-section="sales-add">
          <textarea
            className={INPUT}
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cosa c'è da fare? Es. Rossi: richiamare per il preventivo della fune"
            aria-label="Cosa c'è da fare"
            data-sales-input="new"
          />
          <MicButton onText={(t) => setText((v) => (v.trim() ? `${v.trim()} ${t}` : t))} />
          <div className="flex flex-wrap gap-1.5" data-section="sales-quick">
            {QUICK.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setText((v) => (v.trim() ? `${v.trim().replace(/[.:]$/, "")}: ${t.toLowerCase()}` : `${t}`))}
                className="py-1.5 px-2.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold"
                data-sales-quick={t}
              >
                + {t}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {users.map((u) => (
              <Chip key={u} on={owner === u} onClick={() => setOwner(u)} data={"new-owner-" + u}>
                {nameOf(u)}
              </Chip>
            ))}
            {WHEN()
              .slice(0, 3)
              .map(([l, d]) => (
                <Chip key={l} on={nextDate === d} onClick={() => setNextDate(nextDate === d ? "" : d)} data={"new-date-" + l}>
                  {l}
                </Chip>
              ))}
          </div>
          <PrimaryBtn color={color} disabled={!text.trim() || busy} onClick={add} data-action="sales-add" className="w-full">
            <Plus className="w-4 h-4 inline -mt-0.5 mr-1" /> Aggiungi
          </PrimaryBtn>
        </section>

        <div className="relative" data-section="sales-search">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${INPUT} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca un cliente, una parola, una nota…" aria-label="Cerca nella lista" data-sales-input="search" />
        </div>

        <div className="flex flex-wrap gap-1.5" data-section="sales-who">
          <Chip on={who === "all"} onClick={() => setWho("all")} data="who-all">
            Tutte ({items.filter(isOpen).length})
          </Chip>
          {users.map((u) => (
            <Chip key={u} on={who === u} onClick={() => setWho(u)} data={"who-" + u}>
              {u === key(me) ? "Le mie" : `Di ${nameOf(u)}`} ({items.filter((it) => isOpen(it) && key(it.owner) === u).length})
            </Chip>
          ))}
        </div>

        <div className="space-y-2" data-section="sales-list">
          {!todo.length && <Empty>{words.length ? "Nessuna cosa da fare trovata con queste parole." : items.length ? "Niente da fare qui." : "La lista è vuota. Scrivi qui sopra la prima cosa da fare: la vedrete tutti e due."}</Empty>}
          {todo.map((it) => (
            <Row key={it.id} it={it} me={me} onToggle={() => toggle(it)} onOpen={() => setOpenId(it.id)} />
          ))}
        </div>

        {done.length > 0 && (
          <div className="space-y-2">
            <button type="button" onClick={() => setShowDone((v) => !v)} className="text-sm font-black text-slate-500 min-h-10" data-action="sales-show-done">
              {showDone && !words.length ? "Nascondi le fatte" : `Fatte (${done.length})`}
            </button>
            {(showDone || words.length > 0) && done.map((it) => <Row key={it.id} it={it} me={me} onToggle={() => toggle(it)} onOpen={() => setOpenId(it.id)} />)}
          </div>
        )}
        {items.length > 0 && (
          <button type="button" onClick={excel} data-action="sales-excel" className="w-full h-12 rounded-xl border-2 border-emerald-600 bg-white text-emerald-700 font-black text-sm flex items-center justify-center gap-2">
            <FileSpreadsheet className="w-5 h-5" /> Scarica la lista in Excel
          </button>
        )}
      </div>
      {opened && <RowSheet me={me} users={users} item={opened} color={color} onClose={() => setOpenId(null)} />}
      {people && <PeopleSheet me={me} users={users} allTechs={allTechs} onUsers={onUsers} color={color} onClose={() => setPeople(false)} />}
    </div>
  );
};
