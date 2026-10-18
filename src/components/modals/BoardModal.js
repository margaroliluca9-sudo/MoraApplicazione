import React, { useEffect, useRef, useState } from "react";
import {
  X,
  MessageSquare,
  Camera,
  Pin,
  PinOff,
  Trash2,
  Send,
  Bell,
  BellOff,
  Loader2,
} from "lucide-react";
import { addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getProPanelClass } from "../../ui";
import { compressImage, describeError } from "../../utils";
import {
  boardRef,
  boardDoc,
  sortBoard,
  isExpired,
  formatWhen,
  markRead,
  msgTime,
  getPushState,
  enablePush,
  disablePush,
  notifyBoard,
  BOARD_DAYS,
} from "../../board";

// BACHECA TRA TECNICI: messaggi brevi, foto, messaggio importante fissato in alto.
// Tutti possono cancellare; i messaggi spariscono dopo 30 giorni (tranne i fissati).
export const BoardModal = ({ messages = [], techName, onClose, onOpenPhotos, color = "blue" }) => {
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(null);
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [push, setPush] = useState("checking");
  const [pushBusy, setPushBusy] = useState(false);
  const fileRef = useRef(null);

  const list = sortBoard(messages.filter((m) => !isExpired(m)));

  // aprendo la bacheca i messaggi diventano "letti"
  const newest = list.reduce((t, m) => Math.max(t, msgTime(m)), 0);
  useEffect(() => {
    markRead(Math.max(Date.now(), newest));
  }, [newest]);

  useEffect(() => {
    let alive = true;
    getPushState().then((s) => alive && setPush(s));
    return () => {
      alive = false;
    };
  }, []);

  const pickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPhoto(await compressImage(file));
    } catch (err) {
      setError("Foto non caricata: " + describeError(err));
    }
  };

  const publish = async () => {
    const t = text.trim();
    if (!t && !photo) return;
    setBusy(true);
    setError("");
    try {
      const data = {
        text: t,
        photo: photo || null,
        pinned,
        author: techName || "Tecnico",
        createdAt: serverTimestamp(),
      };
      const ref = await addDoc(boardRef("board_messages"), data);
      setText("");
      setPhoto(null);
      setPinned(false);
      // notifica agli altri (se qualcosa va storto il messaggio resta comunque)
      notifyBoard({ ...data, id: ref.id }).catch(() => {});
    } catch (err) {
      setError("Messaggio non pubblicato: " + describeError(err));
    }
    setBusy(false);
  };

  const remove = async (m) => {
    if (!window.confirm("Eliminare questo messaggio?")) return;
    try {
      await deleteDoc(boardDoc("board_messages", m.id));
    } catch (err) {
      setError("Non eliminato: " + describeError(err));
    }
  };
  const togglePin = async (m) => {
    try {
      await updateDoc(boardDoc("board_messages", m.id), { pinned: !m.pinned });
    } catch (err) {
      setError("Non modificato: " + describeError(err));
    }
  };

  const turnOn = async () => {
    setPushBusy(true);
    setError("");
    try {
      await enablePush(techName);
      setPush("on");
    } catch (err) {
      setError(describeError(err));
      setPush(await getPushState());
    }
    setPushBusy(false);
  };
  const turnOff = async () => {
    setPushBusy(true);
    try {
      await disablePush();
    } catch (err) {
      // niente
    }
    setPush(await getPushState());
    setPushBusy(false);
  };

  const pushBox = {
    checking: null,
    on: (
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
        <span className="flex items-center gap-1.5">
          <Bell className="w-4 h-4" /> Notifiche attive su questo telefono
        </span>
        <button type="button" onClick={turnOff} disabled={pushBusy} className="underline text-slate-500 shrink-0">
          Disattiva
        </button>
      </div>
    ),
    off: (
      <button
        type="button"
        onClick={turnOn}
        disabled={pushBusy}
        data-action="enable-push"
        className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-${color}-600 text-white text-xs font-black uppercase tracking-wide active:scale-95 transition-transform disabled:opacity-60`}
      >
        {pushBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
        Attiva notifiche
      </button>
    ),
    denied: (
      <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
        <BellOff className="w-4 h-4 shrink-0" /> Notifiche bloccate: riattivale dalle impostazioni del
        telefono (Notifiche → Mora App).
      </p>
    ),
    install: (
      <p className="flex items-start gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
        <BellOff className="w-4 h-4 shrink-0" /> Per le notifiche sull'iPhone installa l'app: tocca
        Condividi → "Aggiungi alla schermata Home", poi apri l'app da lì.
      </p>
    ),
    unsupported: (
      <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
        <BellOff className="w-4 h-4 shrink-0" /> Questo telefono o browser non supporta le notifiche.
      </p>
    ),
  }[push];

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[150] flex items-center justify-center p-4 backdrop-blur-md">
      <div
        className={`w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden ${getProPanelClass(color)}`}
        data-section="board"
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl bg-${color}-50 text-${color}-600 shrink-0`}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-slate-800 uppercase text-lg leading-tight">Bacheca</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase truncate">
                Messaggi tra tecnici · spariscono dopo {BOARD_DAYS} giorni
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Chiudi" className="p-2 hover:bg-slate-100 rounded-full shrink-0">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* scrivi un messaggio */}
          <div className="p-5 space-y-3 border-b border-slate-100" data-section="board-compose">
            {pushBox}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Scrivi un messaggio per gli altri tecnici…"
              aria-label="Testo del messaggio"
              className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 outline-none resize-none"
            />
            {photo && (
              <div className="relative w-fit">
                <img src={photo} alt="Foto da allegare" className="h-24 rounded-xl border border-slate-200" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  aria-label="Togli la foto"
                  className="absolute -top-2 -right-2 p-1 bg-white rounded-full border border-slate-300 shadow"
                >
                  <X className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} aria-label="Scegli foto" />
              <button
                type="button"
                onClick={() => fileRef.current && fileRef.current.click()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700"
              >
                <Camera className="w-4 h-4" /> Foto
              </button>
              <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-xs font-bold text-amber-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="w-4 h-4 accent-amber-600"
                  aria-label="Importante, fissa in alto"
                />
                Importante (fissa in alto)
              </label>
              <button
                type="button"
                onClick={publish}
                disabled={busy || (!text.trim() && !photo)}
                className={`ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-${color}-600 text-white text-xs font-black uppercase tracking-wide disabled:opacity-50 active:scale-95 transition-transform`}
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Pubblica
              </button>
            </div>
            {error && (
              <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl p-2.5">{error}</p>
            )}
          </div>

          {/* messaggi */}
          <div className="p-5 space-y-3" data-section="board-list">
            {list.length === 0 && (
              <p className="text-sm text-slate-400 italic text-center py-8">Nessun messaggio. Scrivi il primo!</p>
            )}
            {list.map((m) => (
              <div
                key={m.id}
                data-board-msg={m.id}
                className={`p-3 rounded-xl border ${m.pinned ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-800 uppercase">{m.author || "Tecnico"}</span>
                      <span className="text-[10px] font-bold text-slate-400">{formatWhen(m)}</span>
                      {m.pinned && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded uppercase">
                          <Pin className="w-3 h-3" /> Importante
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => togglePin(m)}
                      aria-label={m.pinned ? "Togli dall'alto" : "Fissa in alto"}
                      title={m.pinned ? "Togli dall'alto" : "Fissa in alto"}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                    >
                      {m.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(m)}
                      aria-label="Elimina messaggio"
                      title="Elimina"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {m.text && (
                  <p className="mt-1.5 text-sm text-slate-700 whitespace-pre-wrap break-words">{m.text}</p>
                )}
                {m.photo && (
                  <button type="button" onClick={() => onOpenPhotos && onOpenPhotos([m.photo])} className="mt-2 block">
                    <img src={m.photo} alt="Foto del messaggio" className="max-h-48 rounded-xl border border-slate-200" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
