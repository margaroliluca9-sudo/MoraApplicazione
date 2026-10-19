// LA MIA AREA: Oggi, Calendario, Note, Chat, Promemoria e contatti, Magazzino (solo con furgone), numeri del mese.
// Ogni tecnico vede solo le sue cose.
import React, { useMemo, useState } from "react";
import { X, CalendarDays, StickyNote, MessageSquare, Bell, Truck, ClipboardList, Printer } from "lucide-react";
import { todayItems, monthNumbers, longDay, todayIso } from "../../personal";
import { vanOf, itemsOf, lowItems } from "../../van";
import { CalendarPanel } from "../personal/CalendarPanel";
import { NotesPanel } from "../personal/NotesPanel";
import { RemindersPanel } from "../personal/RemindersPanel";
import { VanView } from "../VanView";
import { PrintPanel } from "../personal/PrintPanel";

const Tile = ({ id, icon: Icon, label, sub, tone, onClick, badge, alert, wide }) => (
  <button
    type="button"
    data-area-tile={id}
    onClick={onClick}
    className={`relative text-left bg-white rounded-3xl border border-slate-200 p-4 flex flex-col gap-2 active:scale-[0.98] transition-transform ${wide ? "col-span-2" : ""}`}
  >
    {badge > 0 && (
      <span className="absolute top-3 right-3 min-w-[24px] h-6 px-1.5 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center">
        {badge > 99 ? "99+" : badge}
      </span>
    )}
    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>
      <Icon className="w-5 h-5" />
    </span>
    <span className="font-black text-slate-800 text-base">{label}</span>
    <span className={`text-sm font-semibold ${alert ? "text-red-700" : "text-slate-500"}`}>{sub}</span>
  </button>
);

export const PersonalAreaModal = ({
  me,
  logs = [],
  events = [],
  notes = [],
  reminders = [],
  contacts = [],
  vans = [],
  vanItems = [],
  chatUnread = 0,
  chatEnabled = false,
  onOpenChat = () => {},
  myMonthCount = 0,
  technicians = [],
  onOpenMine = () => {},
  onOpenMachine,
  onClose,
  color = "blue",
  initialPanel = null,
}) => {
  const [panel, setPanel] = useState(initialPanel);
  const today = todayIso();
  const van = vanOf(vans, me);
  const vanList = van ? itemsOf(vanItems, van.id) : [];
  const low = lowItems(vanList).length;
  const items = useMemo(() => todayItems(events, reminders), [events, reminders]);
  const nums = useMemo(() => monthNumbers(logs, me), [logs, me]);
  const todayEvents = events.filter((e) => e.date === today).length;
  const openRem = reminders.filter((r) => !r.done).length;
  const back = () => setPanel(null);
  // numero dispari di riquadri: l'ultimo diventa largo
  const oddTiles = (5 + (chatEnabled ? 1 : 0) + (van ? 1 : 0)) % 2 === 1;

  let body;
  if (panel === "calendar")
    body = <CalendarPanel me={me} events={events} logs={logs} color={color} onBack={back} onClose={onClose} onOpenMachine={onOpenMachine} />;
  else if (panel === "print")
    body = <PrintPanel me={me} logs={logs} technicians={technicians} color={color} onBack={back} onClose={onClose} />;
  else if (panel === "notes") body = <NotesPanel me={me} notes={notes} color={color} onBack={back} onClose={onClose} />;
  else if (panel === "reminders")
    body = <RemindersPanel me={me} reminders={reminders} contacts={contacts} color={color} onBack={back} onClose={onClose} />;
  else if (panel === "van" && van) {
    const others = (van.users || []).filter((u) => u !== String(me).trim().toLowerCase());
    body = (
      <VanView
        van={van}
        items={vanItems}
        me={me}
        color={color}
        onBack={back}
        onClose={onClose}
        subtitle={`${vanList.length} articoli${others.length ? " · lo usi con " + others.map((u) => u.charAt(0).toUpperCase() + u.slice(1)).join(", ") : ""}`}
      />
    );
  } else
    body = (
      <div className="flex flex-col h-full" data-section="area-home">
        <div className={`px-4 py-4 bg-white border-b border-slate-200 border-t-4 border-t-${color}-600 flex items-center gap-3 shrink-0`}>
          <span className={`w-11 h-11 rounded-2xl bg-${color}-600 text-white font-black text-lg flex items-center justify-center`}>
            {String(me || "?").charAt(0).toUpperCase()}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-800 text-xl leading-tight">La mia area</h3>
            <p className="text-sm font-semibold text-slate-500 truncate">
              {longDay(today)} · {me}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          <section className="bg-white rounded-3xl border border-slate-200 p-4 space-y-3" data-section="area-today">
            <div className="flex justify-between items-baseline">
              <h4 className="font-black text-slate-800 uppercase text-sm tracking-wide">Oggi</h4>
              <button type="button" onClick={() => setPanel("calendar")} className={`text-sm font-bold text-${color}-700`}>
                Calendario
              </button>
            </div>
            {!items.length && <p className="text-sm text-slate-500">Niente in programma per oggi.</p>}
            {items.map((it) => (
              <button
                key={it.kind + it.id}
                type="button"
                onClick={() => setPanel(it.kind === "event" ? "calendar" : "reminders")}
                className="w-full text-left flex gap-3 items-center"
              >
                <span className={`w-14 text-center font-black text-sm ${it.kind === "event" ? "text-orange-700" : it.late ? "text-red-700" : `text-${color}-700`}`}>
                  {it.late ? "scaduto" : it.time || "—"}
                </span>
                <span className={`flex-1 min-w-0 border-l-[3px] pl-3 ${it.kind === "event" ? "border-orange-500" : it.late ? "border-red-500" : `border-${color}-500`}`}>
                  <span className="block font-bold text-slate-800 truncate">{it.title}</span>
                  <span className="block text-xs text-slate-500 font-semibold truncate">
                    {it.kind === "event" ? "Impegno" + (it.sub ? " · " + it.sub : "") : "Promemoria"}
                  </span>
                </span>
              </button>
            ))}
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Tile id="mine" icon={ClipboardList} label="I miei interventi" tone="bg-slate-100 text-slate-700" onClick={onOpenMine}
              sub={myMonthCount === 1 ? "1 questo mese" : `${myMonthCount} questo mese`} />
            <Tile id="print" icon={Printer} label="Stampa interventi" tone="bg-green-50 text-green-700" onClick={() => setPanel("print")}
              sub="Tuoi e dei colleghi" />
            <Tile id="calendar" icon={CalendarDays} label="Calendario" tone="bg-blue-50 text-blue-700" onClick={() => setPanel("calendar")}
              sub={todayEvents === 0 ? "Nessun impegno oggi" : todayEvents === 1 ? "1 impegno oggi" : `${todayEvents} impegni oggi`} />
            <Tile id="notes" icon={StickyNote} label="Note" tone="bg-amber-50 text-amber-700" onClick={() => setPanel("notes")}
              sub={notes.length === 1 ? "1 nota · solo tu" : `${notes.length} note · solo tu`} />
            {chatEnabled && (
              <Tile id="chat" icon={MessageSquare} label="Chat" tone="bg-emerald-50 text-emerald-700" onClick={onOpenChat} badge={chatUnread}
                sub={chatUnread === 0 ? "Gruppo e privati" : chatUnread === 1 ? "1 messaggio nuovo" : `${chatUnread} messaggi nuovi`} />
            )}
            <Tile id="reminders" icon={Bell} label="Promemoria" tone="bg-orange-50 text-orange-700" onClick={() => setPanel("reminders")} wide={oddTiles && !van}
              sub={openRem === 1 ? "1 attivo · contatti" : `${openRem} attivi · contatti`} />
            {van && (
              <Tile id="van" icon={Truck} label="Magazzino" tone="bg-purple-50 text-purple-700" onClick={() => setPanel("van")} alert={low > 0} wide={oddTiles}
                sub={low > 0 ? `${van.name} · ${low} da riordinare` : `${van.name} · ${vanList.length} articoli`} />
            )}
          </section>

          <section className="flex gap-3" data-section="area-numbers">
            <div className={`flex-1 rounded-3xl bg-${color}-600 text-white p-4`}>
              <div className="text-3xl font-black leading-none">{nums.jobs}</div>
              <div className="text-sm font-semibold mt-1">{nums.jobs === 1 ? "intervento questo mese" : "interventi questo mese"}</div>
            </div>
            <div className="flex-1 rounded-3xl bg-slate-800 text-white p-4">
              <div className="text-3xl font-black leading-none">{nums.customers}</div>
              <div className="text-sm font-semibold mt-1">{nums.customers === 1 ? "cliente visitato" : "clienti visitati"}</div>
            </div>
          </section>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[150] flex items-stretch md:items-center justify-center md:p-4 backdrop-blur-md">
      <div className="w-full md:max-w-xl h-full md:h-[90vh] flex flex-col md:rounded-3xl overflow-hidden bg-white shadow-2xl" data-section="personal-area">
        {body}
      </div>
    </div>
  );
};
