// LA MIA AREA · Note personali: testo, elenco da spuntare, nota fissata in cima,
// foto e fogli scansionati (l'intelligenza artificiale trascrive il foglio nel testo).
import React, { useRef, useState } from "react";
import { Pin, Plus, X, Camera, ScanLine, Loader2, RotateCw, Trash2, Sparkles } from "lucide-react";
import { MAX_NOTE_PHOTOS, scanLook, rotate90, photoFromFile, readSheet } from "../../scan";
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

export const NotesPanel = ({ me, notes, onBack, onClose, color = "blue", scanOn = true }) => {
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(""); // "foto" | "scan" | "leggo"
  const [info, setInfo] = useState("");
  const [view, setView] = useState(null);
  const fileRef = useRef(null);
  const modeRef = useRef("foto");
  const list = sortNotes(notes);

  // foto scattata: «Foto» la tiene così, «Scansiona foglio» la pulisce e la fa leggere
  const pickPhoto = (mode) => {
    setError("");
    setInfo("");
    if ((edit.photos || []).length >= MAX_NOTE_PHOTOS) return setError(`Al massimo ${MAX_NOTE_PHOTOS} foto per nota.`);
    modeRef.current = mode;
    if (fileRef.current) fileRef.current.click();
  };
  const appendText = (cur, add) => (String(cur || "").trim() ? String(cur).replace(/\s+$/, "") + "\n\n" + add : add);
  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const mode = modeRef.current;
    setBusy(mode);
    try {
      const photo = await photoFromFile(file);
      const shown = mode === "scan" ? await scanLook(photo) : photo;
      setEdit((ed) => ({ ...ed, photos: [...(ed.photos || []), shown].slice(0, MAX_NOTE_PHOTOS) }));
      if (mode === "scan") await readInto(photo);
    } catch (err) {
      setError("Foto non caricata: " + describeError(err));
    }
    setBusy("");
  };
  const readInto = async (photo) => {
    setBusy("leggo");
    setInfo("");
    try {
      const text = await readSheet(photo);
      setEdit((ed) => ({ ...ed, text: appendText(ed.text, text) }));
      setInfo("Fatto: ho scritto nel testo quello che c'è sul foglio. Controlla le misure.");
    } catch (err) {
      setError(err.message || describeError(err));
    }
    setBusy("");
  };
  const rotatePhoto = async (i) => {
    const r = await rotate90(edit.photos[i]);
    setEdit((ed) => ({ ...ed, photos: ed.photos.map((x, j) => (j === i ? r : x)) }));
  };

  const toggleItem = async (n, idx) => {
    const items = (n.items || []).map((it, i) => (i === idx ? { ...it, done: !it.done } : it));
    try {
      await saveNote(me, { ...n, items });
    } catch (e) {
      setError("Non salvato: " + describeError(e));
    }
  };
  const save = async () => {
    const empty = !edit.title.trim() && !edit.text.trim() && !edit.items.some((i) => i.t.trim()) && !(edit.photos || []).length;
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
        action={{ label: "Nota", onClick: () => { setError(""); setInfo(""); setEdit({ title: "", text: "", items: [], pinned: false, photos: [] }); } }}
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
              onClick={() => { setError(""); setInfo(""); setEdit({ title: "", text: "", pinned: false, ...n, items: [...(n.items || [])], photos: [...(n.photos || [])] }); }}
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
            {(n.photos || []).length > 0 && (
              <div className="flex gap-2" data-note-photos>
                {n.photos.map((ph, i) => (
                  <button key={i} type="button" onClick={() => setView(ph)} aria-label="Apri foto" className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                    <img src={ph} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
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
          <div className={`grid ${scanOn ? "grid-cols-2" : "grid-cols-1"} gap-2`} data-section="note-photo-buttons">
            {scanOn && (
            <button type="button" data-action="note-scan" disabled={!!busy} onClick={() => pickPhoto("scan")}
              className={`h-12 rounded-xl bg-${color}-600 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50`}>
              {busy === "scan" || busy === "leggo" ? <Loader2 className="w-5 h-5 animate-spin" /> : <ScanLine className="w-5 h-5" />} Scansiona foglio
            </button>
            )}
            <button type="button" data-action="note-photo" disabled={!!busy} onClick={() => pickPhoto("foto")}
              className="h-12 rounded-xl border-2 border-slate-300 text-slate-700 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {busy === "foto" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />} Foto
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" data-note-file onChange={onFile} />
          {busy === "leggo" && (
            <p className="text-sm font-bold text-slate-600 flex items-center gap-2" data-note-reading>
              <Sparkles className="w-4 h-4 text-amber-500" /> Sto leggendo il foglio…
            </p>
          )}
          {(edit.photos || []).length > 0 && (
            <div className="flex gap-2 flex-wrap" data-edit-photos>
              {edit.photos.map((ph, i) => (
                <div key={i} className="w-24 space-y-1">
                  <button type="button" onClick={() => setView(ph)} aria-label="Apri foto" className="block w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img src={ph} alt="" className="w-full h-full object-cover" />
                  </button>
                  <div className="flex justify-between">
                    {scanOn ? (
                    <button type="button" aria-label="Leggi il testo del foglio" title="Leggi il testo" disabled={!!busy} onClick={() => readInto(ph)} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </button>
                    ) : <span />}
                    <button type="button" aria-label="Ruota foto" onClick={() => rotatePhoto(i)} className="p-1.5 rounded-lg hover:bg-slate-100">
                      <RotateCw className="w-4 h-4 text-slate-500" />
                    </button>
                    <button type="button" aria-label="Togli foto" onClick={() => setEdit({ ...edit, photos: edit.photos.filter((_, j) => j !== i) })} className="p-1.5 rounded-lg hover:bg-slate-100">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {info && <p className="text-sm font-bold text-emerald-700" data-note-info>{info}</p>}
          <Field label="Testo">
            <textarea rows={6} className={INPUT} value={edit.text} aria-label="Testo" onChange={(e) => setEdit({ ...edit, text: e.target.value })} />
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
      {view && (
        <div className="fixed inset-0 z-[400] bg-black/90 flex items-center justify-center p-3" onClick={() => setView(null)} data-note-viewer>
          <img src={view} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          <button type="button" aria-label="Chiudi foto" className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center">
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
