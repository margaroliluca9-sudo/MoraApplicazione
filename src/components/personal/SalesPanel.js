// COMMERCIALE (La mia area, solo per i tecnici abilitati): le pratiche con i clienti, condivise.
// In cima il punto della situazione; poi l'elenco (da fare, in attesa, tutte, chiuse) con chi la segue
// e il prossimo passo; toccando una pratica: il diario di cosa è stato fatto e i pulsanti per aggiornarla.
import React, { useMemo, useState } from "react";
import { Phone, Search, AlertTriangle, CalendarClock, Check, Trash2, Bell, ChevronRight, Users } from "lucide-react";
import { PanelHeader, Sheet, Field, PrimaryBtn, GhostBtn, Empty, INPUT } from "./PersonalUi";
import { key } from "../../chat";
import { telHref, todayIso, relDay, isoFromLogDate } from "../../personal";
import {
  KINDS,
  STATUSES,
  ENTRY_KINDS,
  kindLabel,
  statusOf,
  entryLabel,
  isOpen,
  dueState,
  lastEntry,
  sortItems,
  summary,
  newsFor,
  euro,
  shortDate,
  isoShort,
  plusDays,
  nextMonday,
  nameOf,
  saveItem,
  withEntry,
  removeItem,
} from "../../sales";

const TONE = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  red: "bg-red-50 text-red-700 border-red-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
};
const Badge = ({ status }) => {
  const s = statusOf(status);
  return <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${TONE[s.tone]}`}>{s.short || s.label}</span>;
};
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
const DueLine = ({ it }) => {
  const d = dueState(it);
  if (!isOpen(it)) return null;
  if (!it.nextDate)
    return <span className="text-xs font-bold text-slate-400">Nessun prossimo passo</span>;
  const cls = d === "late" ? "text-red-700" : d === "today" ? "text-orange-700" : "text-slate-600";
  return (
    <span className={`text-xs font-bold ${cls} flex items-center gap-1`}>
      {d === "late" ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> : <CalendarClock className="w-3.5 h-3.5 shrink-0" />}
      <span className="truncate">
        {d === "late" ? `Scaduto ${isoShort(it.nextDate)}` : relDay(it.nextDate)}
        {it.nextWhat ? ` · ${it.nextWhat}` : ""}
      </span>
    </span>
  );
};

// riquadro di una pratica nell'elenco
const Card = ({ it, me, onOpen }) => {
  const le = lastEntry(it);
  return (
    <button type="button" onClick={onOpen} data-sales-item={it.id} className="w-full text-left bg-white rounded-2xl border border-slate-200 p-3.5 space-y-1.5 active:scale-[0.99] transition-transform">
      <span className="flex items-start gap-2">
        <span className="flex-1 min-w-0">
          <span className="block font-black text-slate-800 truncate">{it.customer || "Cliente da scrivere"}</span>
          <span className="block text-sm font-semibold text-slate-600 truncate">
            {kindLabel(it.kind)}
            {it.title ? ` · ${it.title}` : ""}
            {it.amount ? ` · ${euro(it.amount)}` : ""}
          </span>
        </span>
        <Badge status={it.status} />
      </span>
      <DueLine it={it} />
      <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
        <span className={`shrink-0 rounded-full px-2 py-0.5 font-black ${key(it.owner) === key(me) ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"}`}>{nameOf(it.owner) || "Nessuno"}</span>
        {le && (
          <span className="truncate">
            {shortDate(le.at)} {nameOf(le.who)}: {entryLabel(le.kind).toLowerCase()} · {le.text}
          </span>
        )}
      </span>
    </button>
  );
};

// modulo: nuova pratica o modifica dei dati
const ItemForm = ({ me, users, customers, item, onClose, color }) => {
  const [f, setF] = useState(() => ({
    customer: "",
    title: "",
    kind: "quote",
    status: "todo",
    owner: key(me),
    amount: "",
    contact: "",
    phone: "",
    nextDate: plusDays(1),
    nextWhat: "",
    entries: [],
    ...(item || {}),
    amount: item && item.amount ? String(item.amount).replace(".", ",") : "",
  }));
  const [note, setNote] = useState("");
  const [remind, setRemind] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e && e.target ? e.target.value : e }));
  const ok = String(f.customer).trim().length > 1;
  const save = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      const it = note.trim() ? withEntry(f, me, "note", note) : f;
      await saveItem(me, it, { remind });
      onClose(true);
    } catch (e) {
      setBusy(false);
    }
  };
  return (
    <Sheet
      title={item ? "Modifica pratica" : "Nuova pratica"}
      onClose={() => onClose(false)}
      section="sales-form"
      footer={
        <>
          <GhostBtn onClick={() => onClose(false)}>Annulla</GhostBtn>
          <PrimaryBtn color={color} disabled={!ok || busy} onClick={save} data-action="sales-save">
            {busy ? "Salvo…" : "Salva"}
          </PrimaryBtn>
        </>
      }
    >
      <Field label="Cliente">
        <input className={INPUT} list="sales-customers" value={f.customer} onChange={set("customer")} placeholder="Nome del cliente" aria-label="Cliente" data-sales-input="customer" />
        <datalist id="sales-customers">
          {customers.map((c) => (
            <option key={c.id || c.name} value={c.name} />
          ))}
        </datalist>
      </Field>
      <Field label="Tipo">
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <Chip key={k.id} on={f.kind === k.id} onClick={() => setF((x) => ({ ...x, kind: k.id }))} data={"kind-" + k.id}>
              {k.label}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Di cosa si tratta">
        <input className={INPUT} value={f.title} onChange={set("title")} placeholder="Es. sostituzione fune gru 7, nuovo paranco" aria-label="Di cosa si tratta" data-sales-input="title" />
      </Field>
      {f.kind === "quote" && (
        <Field label="Importo del preventivo (facoltativo)">
          <input className={INPUT} inputMode="decimal" value={f.amount} onChange={set("amount")} placeholder="Es. 3.500" aria-label="Importo" data-sales-input="amount" />
        </Field>
      )}
      <Field label="Chi la segue">
        <div className="flex flex-wrap gap-1.5">
          {users.map((u) => (
            <Chip key={u} on={key(f.owner) === u} onClick={() => setF((x) => ({ ...x, owner: u }))} data={"owner-" + u}>
              {nameOf(u)}
            </Chip>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Referente">
          <input className={INPUT} value={f.contact} onChange={set("contact")} placeholder="Nome" aria-label="Referente" />
        </Field>
        <Field label="Telefono">
          <input className={INPUT} type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} placeholder="Numero" aria-label="Telefono" />
        </Field>
      </div>
      <NextStep f={f} setF={setF} remind={remind} setRemind={setRemind} />
      {!item && (
        <Field label="Nota (facoltativa)">
          <textarea className={INPUT} rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Es. ha chiesto il prezzo per la fune e i ganci" aria-label="Nota" />
        </Field>
      )}
    </Sheet>
  );
};

// prossimo passo: cosa e quando (con le date rapide) + avviso sul telefono
const NextStep = ({ f, setF, remind, setRemind }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2.5" data-section="sales-next">
    <p className="text-xs font-black text-slate-500">Prossimo passo</p>
    <input className={INPUT} value={f.nextWhat} onChange={(e) => setF((x) => ({ ...x, nextWhat: e.target.value }))} placeholder="Es. richiamare per conferma, mandare il preventivo" aria-label="Prossimo passo" data-sales-input="nextWhat" />
    <div className="flex flex-wrap gap-1.5">
      {[
        ["Oggi", todayIso()],
        ["Domani", plusDays(1)],
        ["Lunedì", nextMonday()],
        ["Tra 1 settimana", plusDays(7)],
        ["Tra 2 settimane", plusDays(14)],
      ].map(([l, d]) => (
        <Chip key={l} on={f.nextDate === d} onClick={() => setF((x) => ({ ...x, nextDate: d }))} data={"date-" + l}>
          {l}
        </Chip>
      ))}
    </div>
    <div className="flex gap-2 items-center">
      <input type="date" className={INPUT} value={f.nextDate || ""} onChange={(e) => setF((x) => ({ ...x, nextDate: e.target.value }))} aria-label="Data del prossimo passo" />
      {f.nextDate && (
        <button type="button" onClick={() => setF((x) => ({ ...x, nextDate: "" }))} className="shrink-0 h-12 px-3 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-600">
          Nessuna data
        </button>
      )}
    </div>
    {f.nextDate && (
      <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <input type="checkbox" checked={remind} onChange={(e) => setRemind(e.target.checked)} className="w-5 h-5" data-sales-input="remind" />
        <Bell className="w-4 h-4 text-orange-600" /> Avvisa sul telefono di {nameOf(f.owner) || "chi la segue"} quel giorno alle 9
      </label>
    )}
  </div>
);

// una pratica: dati, diario e aggiornamenti veloci
const ItemSheet = ({ me, users, customers, logs, item, onClose, onEdit, color }) => {
  const [kind, setKind] = useState("call");
  const [text, setText] = useState("");
  const [f, setF] = useState(item);
  const [remind, setRemind] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState(false);
  // ultimo intervento in officina per questo cliente
  const last = useMemo(
    () =>
      (logs || [])
        .filter((l) => String(l.customer || "").trim().toUpperCase() === item.customer)
        .reduce((best, l) => (!best || isoFromLogDate(l.dateString) > isoFromLogDate(best.dateString) ? l : best), null),
    [logs, item.customer]
  );
  const changed = f.status !== item.status || f.nextDate !== item.nextDate || f.nextWhat !== item.nextWhat || key(f.owner) !== key(item.owner);
  const canSave = text.trim() || changed || remind;
  const save = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    let it = f;
    if (text.trim()) it = withEntry(it, me, kind, text);
    if (f.status !== item.status) it = withEntry(it, me, "note", `Stato: ${statusOf(f.status).label}`);
    if (key(f.owner) !== key(item.owner)) it = withEntry(it, me, "note", `Ora la segue ${nameOf(f.owner)}`);
    try {
      await saveItem(me, it, { remind });
      onClose(true);
    } catch (e) {
      setBusy(false);
    }
  };
  const entries = [...(item.entries || [])].reverse();
  const tel = telHref(item.phone);
  return (
    <Sheet
      title={item.customer}
      onClose={() => onClose(false)}
      section="sales-item"
      footer={
        <>
          <GhostBtn onClick={() => onEdit(item)} data-action="sales-edit">
            Modifica
          </GhostBtn>
          <PrimaryBtn color={color} disabled={!canSave || busy} onClick={save} data-action="sales-update">
            {busy ? "Salvo…" : "Salva"}
          </PrimaryBtn>
        </>
      }
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge status={item.status} />
          <span className="text-sm font-black text-slate-700">{kindLabel(item.kind)}</span>
          {item.amount ? <span className="text-sm font-black text-emerald-700">{euro(item.amount)}</span> : null}
        </div>
        {item.title && <p className="text-base font-bold text-slate-800">{item.title}</p>}
        <p className="text-xs font-semibold text-slate-500">
          La segue {nameOf(item.owner) || "nessuno"} · aperta da {nameOf(item.createdBy) || "-"}
          {last ? ` · ultimo intervento in officina ${last.dateString}` : ""}
        </p>
        {(item.contact || item.phone) && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700 flex-1 min-w-0 truncate">
              {item.contact}
              {item.contact && item.phone ? " · " : ""}
              {item.phone}
            </span>
            {tel && (
              <a href={tel} className="shrink-0 h-10 px-3 rounded-xl bg-emerald-600 text-white text-sm font-black flex items-center gap-1.5" data-action="sales-call">
                <Phone className="w-4 h-4" /> Chiama
              </a>
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-3 space-y-2.5" data-section="sales-add">
        <p className="text-xs font-black text-blue-800">Cosa hai fatto</p>
        <div className="flex flex-wrap gap-1.5">
          {ENTRY_KINDS.map((k) => (
            <Chip key={k.id} on={kind === k.id} onClick={() => setKind(k.id)} data={"entry-" + k.id}>
              {k.label}
            </Chip>
          ))}
        </div>
        <textarea className={INPUT} rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Es. chiamato, ci pensa e mi richiama lunedì" aria-label="Cosa hai fatto" data-sales-input="entry" />
        <p className="text-xs font-black text-blue-800 pt-1">Stato</p>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <Chip key={s.id} on={f.status === s.id} onClick={() => setF((x) => ({ ...x, status: s.id }))} data={"status-" + s.id}>
              {s.label}
            </Chip>
          ))}
        </div>
        <p className="text-xs font-black text-blue-800 pt-1">Chi la segue</p>
        <div className="flex flex-wrap gap-1.5">
          {users.map((u) => (
            <Chip key={u} on={key(f.owner) === u} onClick={() => setF((x) => ({ ...x, owner: u }))} data={"owner-" + u}>
              {nameOf(u)}
            </Chip>
          ))}
        </div>
      </div>
      {isOpen(f) && <NextStep f={f} setF={setF} remind={remind} setRemind={setRemind} />}

      <div className="space-y-2" data-section="sales-diary">
        <p className="text-xs font-black text-slate-500">Diario ({entries.length})</p>
        {!entries.length && <p className="text-sm text-slate-500">Ancora niente: scrivi qui sopra cosa hai fatto.</p>}
        {entries.map((e, i) => (
          <div key={i} className="flex gap-3" data-sales-entry>
            <span className="w-12 shrink-0 text-xs font-black text-slate-500 mt-0.5">{shortDate(e.at)}</span>
            <span className="flex-1 min-w-0 border-l-[3px] border-slate-300 pl-3">
              <span className="block text-xs font-black text-slate-700">
                {nameOf(e.who)} · {entryLabel(e.kind)}
              </span>
              <span className="block text-sm text-slate-700 whitespace-pre-wrap break-words">{e.text}</span>
            </span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={async () => {
          if (!ask) return setAsk(true);
          await removeItem(item.id);
          onClose(true);
        }}
        className={`w-full h-11 rounded-xl text-sm font-bold border flex items-center justify-center gap-2 ${ask ? "bg-red-600 text-white border-red-600" : "bg-white text-slate-500 border-slate-200"}`}
        data-action="sales-delete"
      >
        <Trash2 className="w-4 h-4" /> {ask ? "Sicuro? Tocca di nuovo per eliminarla" : "Elimina la pratica"}
      </button>
    </Sheet>
  );
};

// «Da fare»: le pratiche da fare e quelle (anche in attesa) con il prossimo passo oggi o in ritardo
const isTodo = (it) => isOpen(it) && (it.status === "todo" || ["late", "today"].includes(dueState(it)));

export const SalesPanel = ({ me, items = [], users = [], customers = [], logs = [], color = "blue", onBack, onClose }) => {
  const [tab, setTab] = useState("todo");
  const [who, setWho] = useState("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(null); // { item } | { item: null }
  const others = users.filter((u) => u !== key(me));
  const sum = useMemo(() => summary(items), [items]);
  const news = useMemo(() => newsFor(items, me, 4), [items, me]);
  const list = useMemo(() => {
    const t = q.trim().toUpperCase();
    return sortItems(
      items.filter((it) => {
        if (who !== "all" && key(it.owner) !== who) return false;
        if (t && !`${it.customer} ${it.title} ${it.contact}`.toUpperCase().includes(t)) return false;
        if (tab === "todo") return isTodo(it);
        if (tab === "wait") return it.status === "wait";
        if (tab === "open") return isOpen(it);
        return !isOpen(it);
      })
    );
  }, [items, who, q, tab]);
  const opened = openId && items.find((i) => i.id === openId);
  const count = (fn) => items.filter((it) => (who === "all" || key(it.owner) === who) && fn(it)).length;
  return (
    <div className="flex flex-col h-full bg-slate-50" data-section="sales">
      <PanelHeader
        title="Commerciale"
        sub={others.length ? `Condiviso con ${others.map(nameOf).join(", ")}` : "Pratiche con i clienti"}
        onBack={onBack}
        onClose={onClose}
        color={color}
        action={{ id: "sales-new", label: "Nuova", onClick: () => setForm({ item: null }) }}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <section className="space-y-2" data-section="sales-summary">
          <h4 className="font-black text-slate-800 text-sm">Il punto della situazione</h4>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setTab("todo")} data-sales-sum="due" className={`text-left rounded-2xl p-3 text-white ${sum.late ? "bg-red-600" : "bg-blue-600"}`}>
              <span className="block text-2xl font-black leading-none">{sum.due}</span>
              <span className="block text-xs font-bold mt-1">{sum.late ? `da fare oggi · ${sum.late} in ritardo` : "da fare oggi"}</span>
            </button>
            <button type="button" onClick={() => setTab("wait")} data-sales-sum="wait" className="text-left rounded-2xl p-3 bg-amber-500 text-white">
              <span className="block text-2xl font-black leading-none">{sum.wait}</span>
              <span className="block text-xs font-bold mt-1">in attesa del cliente</span>
            </button>
            <button type="button" onClick={() => setTab("open")} data-sales-sum="quotes" className="text-left rounded-2xl p-3 bg-white border border-slate-200">
              <span className="block text-2xl font-black leading-none text-slate-800">{sum.quotes}</span>
              <span className="block text-xs font-bold mt-1 text-slate-500">preventivi aperti{sum.quotesAmount ? ` · ${euro(sum.quotesAmount)}` : ""}</span>
            </button>
            <button type="button" onClick={() => setTab("closed")} data-sales-sum="won" className="text-left rounded-2xl p-3 bg-white border border-slate-200">
              <span className="block text-2xl font-black leading-none text-emerald-700">{sum.won}</span>
              <span className="block text-xs font-bold mt-1 text-slate-500">
                acquisiti questo mese{sum.wonAmount ? ` · ${euro(sum.wonAmount)}` : ""}
                {sum.lost ? ` · ${sum.lost} persi` : ""}
              </span>
            </button>
          </div>
        </section>

        {news.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2" data-section="sales-news">
            <h4 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" /> Ultime cose fatte dai colleghi
            </h4>
            {news.map(({ it, e }, i) => (
              <button key={i} type="button" onClick={() => setOpenId(it.id)} className="w-full text-left flex gap-2 items-start" data-sales-news>
                <span className="w-11 shrink-0 text-[11px] font-black text-slate-500 mt-0.5">{shortDate(e.at)}</span>
                <span className="flex-1 min-w-0 text-sm">
                  <b className="text-slate-800">{nameOf(e.who)}</b> <span className="text-slate-500">· {it.customer}</span>
                  <span className="block text-slate-600 truncate">
                    {entryLabel(e.kind)}: {e.text}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
              </button>
            ))}
          </section>
        )}

        <div className="space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className={`${INPUT} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca cliente, pratica o referente" aria-label="Cerca nelle pratiche" data-sales-input="search" />
          </div>
          <div className="flex flex-wrap gap-1.5" data-section="sales-who">
            <Chip on={who === "all"} onClick={() => setWho("all")} data="who-all">
              Tutti
            </Chip>
            {users.map((u) => (
              <Chip key={u} on={who === u} onClick={() => setWho(u)} data={"who-" + u}>
                {u === key(me) ? "Le mie" : `Di ${nameOf(u)}`}
              </Chip>
            ))}
          </div>
          <div className="flex gap-1 p-1 bg-slate-200/70 rounded-xl" data-section="sales-tabs">
            {[
              ["todo", "Da fare", count(isTodo)],
              ["wait", "In attesa", count((i) => i.status === "wait")],
              ["open", "Aperte", count(isOpen)],
              ["closed", "Chiuse", count((i) => !isOpen(i))],
            ].map(([t, l, n]) => (
              <button key={t} type="button" data-sales-tab={t} onClick={() => setTab(t)} className={`flex-1 h-10 rounded-lg text-xs font-black ${tab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
                {l} {n > 0 ? `(${n})` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2" data-section="sales-list">
          {!list.length && (
            <Empty>
              {items.length ? "Nessuna pratica qui." : "Ancora nessuna pratica. Tocca «Nuova» per segnare un preventivo, una richiesta o una chiamata da fare: la vedrete tutti e due."}
            </Empty>
          )}
          {list.map((it) => (
            <Card key={it.id} it={it} me={me} onOpen={() => setOpenId(it.id)} />
          ))}
        </div>
        <p className="text-[11px] text-slate-400 text-center leading-snug px-4">
          <Check className="inline w-3 h-3 -mt-0.5" /> Le pratiche si vedono solo qui, a {users.map(nameOf).join(" e ")}. Gli altri tecnici non hanno questa sezione.
        </p>
      </div>
      {opened && !form && <ItemSheet me={me} users={users} customers={customers} logs={logs} item={opened} color={color} onClose={() => setOpenId(null)} onEdit={(item) => setForm({ item })} />}
      {form && (
        <ItemForm
          me={me}
          users={users}
          customers={customers}
          item={form.item}
          color={color}
          onClose={() => {
            setForm(null);
          }}
        />
      )}
    </div>
  );
};
