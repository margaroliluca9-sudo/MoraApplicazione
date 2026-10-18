// LA MIA AREA · Note personali: testo, elenco da spuntare, nota fissata in cima.
import React, { useState } from "react";
import { Pin, Plus, X } from "lucide-react";
import { sortNotes, saveNote, removePersonal } from "../../personal";
import { describeError } from "../../utils";
import { PanelHeader, Sheet, Field, INPUT, PrimaryBtn, GhostBtn, Empty } from "./PersonalUi";

const when = (ms) => {
  if (!ms) return "";
  const d = new Date(ms);
  const t = new Date();
  if (d.toDateString() === t.toDateString()) return "oggi";
  const y = new Date(t);
  y.setDate(t.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "ieri";
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

export const NotesPanel = ({ me, notes, onBack, onClose, color = "blue" }) => {
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState("");
  const list = sortNotes(notes);

  const toggleItem = async (n, idx) => {
    const items = (n.items || []).map((it, i) => (i === idx ? { ...it, done: !it.done } : it));
    try {
      await saveNote(me, { ...n, items });
    } catch (e) {
      setError("Non salvato: " + describeError(e));
    }
  };
  const save = async () => {
    const empty = !edit.title.trim() && !edit.text.trim() && !edit.items.some((i) => i.t.trim());
    if (empty) return setError("La nota è vuota.");
    try {
      await saveNote(me, edit);
      setEdit(null);
      setError("");
    } catch (e) {
      setError("Non salvata: " + describeError(e));
    }
  };
  const del = async () => {
    try {
      await removePersonal("notes", edit.id);
      setEdit(null);
    } catch (e) {
      setError("Non eliminata: " + describeError(e));
    }
  };
  const setItem = (i, v) => setEdit({ ...edit, items: edit.items.map((it, j) => (j === i ? { ...it, ...v } : it)) });

  return (
    <div className="flex flex-col h-full" data-section="area-notes">
      <PanelHeader
        title="Note"
        sub="Le vedi solo tu"
        onBack={onBack}
        onClose={onClose}
        color={color}
        action={{ label: "Nota", onClick: () => { setError(""); setEdit({ title: "", text: "", items: [], pinned: false }); } }}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {error && !edit && <p className="text-sm font-bold text-red-600">{error}</p>}
        {!list.length && <Empty>Nessuna nota. Scrivi qui codici utili, misure, accessi ai clienti o cose da ricordare.</Empty>}
        {list.map((n) => (
          <article
            key={n.id}
            data-note={n.id}
            className={`bg-white rounded-2xl border p-4 space-y-2 ${n.pinned ? "border-amber-300" : "border-slate-200"}`}
          >
            <button
              type="button"
              onClick={() => { setError(""); setEdit({ title: "", text: "", pinned: false, ...n, items: [...(n.items || [])] }); }}
              className="w-full text-left space-y-1"
            >
              {n.pinned && (
                <span className="flex items-center gap-1 text-[11px] font-black text-amber-700 uppercase">
                  <Pin className="w-3.5 h-3.5" /> Fissata
                </span>
              )}
              <span className="flex justify-between gap-3">
                <span className="font-black text-slate-800 break-words">{n.title || "Senza titolo"}</span>
                <span className="text-xs font-bold text-slate-400 shrink-0">{when(n.updatedAt)}</span>
              </span>
              {n.text && <span className="block text-sm text-slate-600 whitespace-pre-wrap break-words line-clamp-4">{n.text}</span>}
            </button>
            {(n.items || []).map((it, i) => (
              <label key={i} className="flex items-center gap-3 text-sm font-semibold text-slate-700 min-h-[32px]">
                <input type="checkbox" checked={!!it.done} onChange={() => toggleItem(n, i)} className="w-5 h-5 accent-blue-600" />
                <span className={it.done ? "line-through text-slate-400" : ""}>{it.t}</span>
              </label>
            ))}
          </article>
        ))}
      </div>

      {edit && (
        <Sheet
          title={edit.id ? "Nota" : "Nuova nota"}
          section="note-form"
          onClose={() => setEdit(null)}
          footer={
            <>
              {edit.id && (<GhostBtn danger onClick={del}>Elimina</GhostBtn>)}
              <PrimaryBtn color={color} onClick={save}>Salva</PrimaryBtn>
            </>
          }
        >
          <Field label="Titolo">
            <input className={INPUT} value={edit.title} aria-label="Titolo" onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
          </Field>
          <Field label="Testo">
            <textarea rows={5} className={INPUT} value={edit.text} aria-label="Testo" onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
          </Field>
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Elenco da spuntare</span>
            {edit.items.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="checkbox" checked={!!it.done} aria-label="Fatto" onChange={() => setItem(i, { done: !it.done })} className="w-5 h-5 accent-blue-600 shrink-0" />
                <input className={INPUT} value={it.t} aria-label={"Voce " + (i + 1)} onChange={(e) => setItem(i, { t: e.target.value })} />
                <button type="button" aria-label="Togli voce" onClick={() => setEdit({ ...edit, items: edit.items.filter((_, j) => j !== i) })} className="p-2 rounded-full hover:bg-slate-100 shrink-0">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            ))}
            <button type="button" data-action="add-item" onClick={() => setEdit({ ...edit, items: [...edit.items, { t: "", done: false }] })} className="h-11 w-full rounded-xl border border-dashed border-slate-400 text-slate-600 font-bold text-sm flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" /> Aggiungi voce
            </button>
          </div>
          <label className="flex items-center gap-3 font-bold text-slate-700 min-h-[40px]">
            <input type="checkbox" checked={!!edit.pinned} onChange={() => setEdit({ ...edit, pinned: !edit.pinned })} className="w-5 h-5 accent-amber-500" />
            Fissa in cima
          </label>
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        </Sheet>
      )}
    </div>
  );
};
