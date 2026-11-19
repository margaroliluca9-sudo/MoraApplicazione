// COMMERCIALE (La mia area, solo per i tecnici abilitati): una LISTA condivisa delle cose da fare con i clienti.
// In cima si scrive una riga («Rossi: richiamare per il preventivo della fune»), si sceglie chi la segue e quando;
// ogni riga ha la spunta «fatto». Toccando la riga: le note di chi l'ha seguita, con data e nome.
import React, { useMemo, useState } from "react";
import { Check, Trash2, Plus, Bell } from "lucide-react";
import { PanelHeader, Sheet, PrimaryBtn, GhostBtn, Empty, INPUT } from "./PersonalUi";
import { key } from "../../chat";
import { todayIso, relDay } from "../../personal";
import { isOpen, dueState, lastEntry, sortItems, shortDate, isoShort, plusDays, nextMonday, nameOf, saveItem, withEntry, removeItem } from "../../sales";

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

export const SalesPanel = ({ me, items = [], users = [], color = "blue", onBack, onClose }) => {
  const [text, setText] = useState("");
  const [owner, setOwner] = useState(key(me));
  const [nextDate, setNextDate] = useState("");
  const [who, setWho] = useState("all");
  const [showDone, setShowDone] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);
  const others = users.filter((u) => u !== key(me));
  const todo = useMemo(() => sortItems(items.filter((it) => isOpen(it) && (who === "all" || key(it.owner) === who))), [items, who]);
  const done = useMemo(() => sortItems(items.filter((it) => !isOpen(it) && (who === "all" || key(it.owner) === who))).slice(0, 30), [items, who]);
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
  const opened = openId && items.find((i) => i.id === openId);
  return (
    <div className="flex flex-col h-full bg-slate-50" data-section="sales">
      <PanelHeader title="Commerciale" sub={others.length ? `Lista condivisa con ${others.map(nameOf).join(", ")}` : "Lista delle cose da fare"} onBack={onBack} onClose={onClose} color={color} />
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
          {!todo.length && <Empty>{items.length ? "Niente da fare qui." : "La lista è vuota. Scrivi qui sopra la prima cosa da fare: la vedrete tutti e due."}</Empty>}
          {todo.map((it) => (
            <Row key={it.id} it={it} me={me} onToggle={() => toggle(it)} onOpen={() => setOpenId(it.id)} />
          ))}
        </div>

        {done.length > 0 && (
          <div className="space-y-2">
            <button type="button" onClick={() => setShowDone((v) => !v)} className="text-sm font-black text-slate-500 min-h-10" data-action="sales-show-done">
              {showDone ? "Nascondi le fatte" : `Fatte (${done.length})`}
            </button>
            {showDone && done.map((it) => <Row key={it.id} it={it} me={me} onToggle={() => toggle(it)} onOpen={() => setOpenId(it.id)} />)}
          </div>
        )}
      </div>
      {opened && <RowSheet me={me} users={users} item={opened} color={color} onClose={() => setOpenId(null)} />}
    </div>
  );
};
