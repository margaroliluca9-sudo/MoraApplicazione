// LA MIA AREA · Promemoria (con avviso sul telefono) + contatti rapidi.
import React, { useState } from "react";
import { Bell, Phone, Plus, Check, Pencil, Trash2, RotateCcw } from "lucide-react";
import {
  openReminders,
  doneReminders,
  relDay,
  todayIso,
  saveReminder,
  saveContact,
  removePersonal,
  telHref,
} from "../../personal";
import { describeError } from "../../utils";
import { PushBox } from "../modals/ChatModal";
import { PanelHeader, Sheet, Field, INPUT, PrimaryBtn, GhostBtn, Empty } from "./PersonalUi";
import { SwipeRow } from "../SwipeRow";

export const RemindersPanel = ({ me, reminders, contacts, onBack, onClose, color = "blue" }) => {
  const [edit, setEdit] = useState(null);
  const [contact, setContact] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [error, setError] = useState("");
  const open = openReminders(reminders);
  const done = doneReminders(reminders);
  const today = todayIso();
  const people = [...(contacts || [])].sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const run = async (fn, msg) => {
    try {
      await fn();
      setError("");
      return true;
    } catch (e) {
      setError(msg + describeError(e));
      return false;
    }
  };
  const toggle = (r) => run(() => saveReminder(me, { ...r, done: !r.done, doneAt: r.done ? null : Date.now() }), "Non salvato: ");
  const save = async () => {
    if (!edit.title.trim()) return setError("Scrivi cosa ricordare.");
    if (await run(() => saveReminder(me, edit), "Non salvato: ")) setEdit(null);
  };
  const saveC = async () => {
    if (!contact.name.trim()) return setError("Scrivi il nome.");
    if (await run(() => saveContact(me, contact), "Non salvato: ")) setContact(null);
  };

  const whenOf = (r) => {
    if (!r.date) return "Senza data";
    const d = relDay(r.date);
    return `${d}${r.time ? " · " + r.time : ""}${r.notify ? " · ti avviso col telefono" : ""}`;
  };

  return (
    <div className="flex flex-col h-full" data-section="area-reminders">
      <PanelHeader
        title="Promemoria"
        onBack={onBack}
        onClose={onClose}
        color={color}
        action={{ label: "Nuovo", onClick: () => { setError(""); setEdit({ title: "", date: today, time: "", notify: true }); } }}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {error && !edit && !contact && <p className="text-sm font-bold text-red-600">{error}</p>}
        <PushBox techName={me} color={color} />
        {!open.length && <Empty>Nessun promemoria aperto.</Empty>}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {open.map((r) => (
            <SwipeRow
              key={r.id}
              id={r.id}
              rounded="rounded-none"
              className="border-b border-slate-100 last:border-0"
              actions={[
                { id: "done", label: "Fatto", icon: Check, tone: "emerald", onClick: () => toggle(r) },
                { id: "edit", label: "Modifica", icon: Pencil, tone: "blue", onClick: () => { setError(""); setEdit({ ...r }); } },
                { id: "delete", label: "Elimina", icon: Trash2, tone: "red", confirm: true, onClick: () => run(() => removePersonal("reminders", r.id), "Non eliminato: ") },
              ]}
            >
            <div data-reminder={r.id} className="flex items-center gap-3 px-4 py-3 bg-white">
              <input type="checkbox" checked={false} onChange={() => toggle(r)} aria-label={"Fatto: " + r.title} className="w-6 h-6 accent-blue-600 shrink-0" />
              <button type="button" onClick={() => { setError(""); setEdit({ ...r }); }} className="flex-1 min-w-0 text-left">
                <span className="block font-bold text-slate-800 break-words">{r.title}</span>
                <span className={`block text-xs font-semibold ${r.date && r.date < today ? "text-red-600" : "text-slate-500"}`}>{whenOf(r)}</span>
              </button>
              {r.notify && <Bell className="w-5 h-5 text-orange-600 shrink-0" aria-label="Avviso attivo" />}
            </div>
            </SwipeRow>
          ))}
        </div>
        {done.length > 0 && (
          <button type="button" onClick={() => setShowDone(!showDone)} className="text-sm font-bold text-slate-500 px-1 min-h-[36px]">
            Fatti: {done.length} · {showDone ? "nascondi" : "mostra"}
          </button>
        )}
        {showDone && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {done.slice(0, 30).map((r) => (
              <SwipeRow
                key={r.id}
                id={r.id}
                rounded="rounded-none"
                className="border-b border-slate-100 last:border-0"
                actions={[
                  { id: "undo", label: "Da rifare", icon: RotateCcw, tone: "blue", onClick: () => toggle(r) },
                  { id: "delete", label: "Elimina", icon: Trash2, tone: "red", confirm: true, onClick: () => run(() => removePersonal("reminders", r.id), "Non eliminato: ") },
                ]}
              >
                <div className="flex items-center gap-3 px-4 py-3 bg-white">
                  <input type="checkbox" checked onChange={() => toggle(r)} aria-label={"Da rifare: " + r.title} className="w-6 h-6 accent-blue-600 shrink-0" />
                  <span className="flex-1 line-through text-slate-400 font-semibold break-words">{r.title}</span>
                </div>
              </SwipeRow>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 px-1">
          <h4 className="font-black text-slate-800 text-sm">Contatti rapidi</h4>
          <button type="button" data-action="add-contact" onClick={() => { setError(""); setContact({ name: "", role: "", phone: "" }); }} className={`text-sm font-bold text-${color}-700 flex items-center gap-1 min-h-[36px]`}>
            <Plus className="w-4 h-4" /> Contatto
          </button>
        </div>
        {!people.length && <p className="text-sm text-slate-500 px-1">Aggiungi i numeri che chiami spesso: clienti, fornitori, ufficio.</p>}
        {people.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-section="contacts">
            {people.map((c) => {
              const href = telHref(c.phone);
              return (
                <SwipeRow
                  key={c.id}
                  id={c.id}
                  rounded="rounded-none"
                  className="border-b border-slate-100 last:border-0"
                  actions={[
                    { id: "edit", label: "Modifica", icon: Pencil, tone: "blue", onClick: () => { setError(""); setContact({ ...c }); } },
                    { id: "delete", label: "Elimina", icon: Trash2, tone: "red", confirm: true, onClick: () => run(() => removePersonal("contacts", c.id), "Non eliminato: ") },
                  ]}
                >
                <div className="flex items-center gap-3 px-4 py-3 bg-white">
                  <span className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center shrink-0">
                    {String(c.name).charAt(0).toUpperCase()}
                  </span>
                  <button type="button" onClick={() => { setError(""); setContact({ ...c }); }} className="flex-1 min-w-0 text-left">
                    <span className="block font-bold text-slate-800 truncate">{c.name}</span>
                    <span className="block text-xs text-slate-500 truncate">{[c.role, c.phone].filter(Boolean).join(" · ")}</span>
                  </button>
                  {href && (
                    <a href={href} aria-label={"Chiama " + c.name} className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5" />
                    </a>
                  )}
                </div>
                </SwipeRow>
              );
            })}
          </div>
        )}
      </div>

      {edit && (
        <Sheet
          title={edit.id ? "Promemoria" : "Nuovo promemoria"}
          section="reminder-form"
          onClose={() => setEdit(null)}
          footer={
            <>
              {edit.id && (<GhostBtn danger onClick={async () => { if (await run(() => removePersonal("reminders", edit.id), "Non eliminato: ")) setEdit(null); }}>Elimina</GhostBtn>)}
              <PrimaryBtn color={color} onClick={save}>Salva</PrimaryBtn>
            </>
          }
        >
          <Field label="Cosa ricordare">
            <input className={INPUT} value={edit.title} aria-label="Cosa ricordare" placeholder="Es. Richiamare sig. Rossi (Mario Rossi Srl)" onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Giorno">
              <input type="date" className={INPUT} value={edit.date || ""} aria-label="Giorno" onChange={(e) => setEdit({ ...edit, date: e.target.value })} />
            </Field>
            <Field label="Ora">
              <input type="time" className={INPUT} value={edit.time || ""} aria-label="Ora" disabled={!edit.date} onChange={(e) => setEdit({ ...edit, time: e.target.value })} />
            </Field>
          </div>
          <label className="flex items-center gap-3 font-bold text-slate-700 min-h-[40px]">
            <input type="checkbox" checked={!!edit.notify && !!edit.date} disabled={!edit.date} onChange={() => setEdit({ ...edit, notify: !edit.notify })} className="w-5 h-5 accent-orange-500" />
            Avvisami col telefono{edit.date && !edit.time ? " (alle 8:00)" : ""}
          </label>
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        </Sheet>
      )}

      {contact && (
        <Sheet
          title={contact.id ? "Contatto" : "Nuovo contatto"}
          section="contact-form"
          onClose={() => setContact(null)}
          footer={
            <>
              {contact.id && (<GhostBtn danger onClick={async () => { if (await run(() => removePersonal("contacts", contact.id), "Non eliminato: ")) setContact(null); }}>Elimina</GhostBtn>)}
              <PrimaryBtn color={color} onClick={saveC}>Salva</PrimaryBtn>
            </>
          }
        >
          <Field label="Nome">
            <input className={INPUT} value={contact.name} aria-label="Nome" onChange={(e) => setContact({ ...contact, name: e.target.value })} />
          </Field>
          <Field label="Chi è (facoltativo)">
            <input className={INPUT} value={contact.role} aria-label="Chi è" placeholder="Es. Mario Rossi Srl – manutenzione" onChange={(e) => setContact({ ...contact, role: e.target.value })} />
          </Field>
          <Field label="Telefono">
            <input type="tel" className={INPUT} value={contact.phone} aria-label="Telefono" onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
          </Field>
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        </Sheet>
      )}
    </div>
  );
};
