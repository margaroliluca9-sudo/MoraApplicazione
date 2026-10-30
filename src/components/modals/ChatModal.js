import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  ArrowLeft,
  MessageSquare,
  Users,
  User,
  Camera,
  Send,
  Pin,
  PinOff,
  Trash2,
  Bell,
  BellOff,
  Loader2,
  Image as ImageIcon,
  Mic,
  Square,
  Play,
  Pause,
  Pencil,
} from "lucide-react";
import { updateDoc } from "../../tracked";
import { getDoc } from "../../metered";
import { compressImage, describeError } from "../../utils";
import {
  GROUP,
  key,
  dmId,
  canSee,
  convTitle,
  displayName,
  messagesOf,
  msgTime,
  unreadIn,
  readersOf,
  markConvRead,
  timeOf,
  dayLabel,
  shortWhen,
  sendMessage,
  notifyChat,
  chatDoc,
  getPushState,
  enablePush,
  disablePush,
  editMessage,
  removeMessage,
  previewOf,
  durLabel,
  voiceSupported,
  startVoice,
  VOICE_MAX,
} from "../../chat";
import { Avatar } from "../Avatar";
import { techOf } from "../../profile";

// vocale: scaricato solo quando lo ascolti (poi tenuto in memoria)
const audioCache = {};
export const VoicePlayer = ({ id, src: given, dur, mine, color = "blue" }) => {
  const [state, setState] = useState("idle"); // idle | loading | play | pause | error
  const [pos, setPos] = useState(0);
  const el = useRef(null);
  useEffect(
    () => () => {
      if (el.current) el.current.pause();
    },
    []
  );
  const toggle = async (e) => {
    e.stopPropagation();
    if (state === "play") {
      el.current.pause();
      return;
    }
    if (!el.current) {
      let src = given || audioCache[id];
      if (!src) {
        setState("loading");
        try {
          const s = await getDoc(chatDoc("chat_audio", id));
          src = s.exists() ? (s.data() || {}).data : null;
        } catch (err) {
          src = null;
        }
        if (!src) return setState("error");
        audioCache[id] = src;
      }
      const a = new Audio(src);
      a.ontimeupdate = () => setPos(a.currentTime);
      a.onplay = () => setState("play");
      a.onpause = () => setState("pause");
      a.onended = () => {
        setState("idle");
        setPos(0);
      };
      a.onerror = () => setState("error");
      el.current = a;
    }
    el.current.play().catch(() => setState("error"));
  };
  const total = Math.max(1, Number(dur) || 1);
  const pct = Math.min(100, (pos / total) * 100);
  if (state === "error") return <div className="text-[11px] italic opacity-80 py-1">Vocale non disponibile su questo telefono</div>;
  return (
    <div className="flex items-center gap-2 min-w-[170px] py-0.5" data-voice>
      <button
        type="button"
        onClick={toggle}
        aria-label={state === "play" ? "Pausa" : "Ascolta il vocale"}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${mine ? `bg-white text-${color}-700` : `bg-${color}-600 text-white`}`}
      >
        {state === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : state === "play" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1">
        <div className={`h-1.5 rounded-full ${mine ? "bg-white/40" : "bg-slate-200"}`}>
          <div className={`h-1.5 rounded-full ${mine ? "bg-white" : `bg-${color}-600`}`} style={{ width: `${pct}%` }} />
        </div>
        <div className={`text-[10px] mt-1 font-bold ${mine ? "text-white/80" : "text-slate-500"}`}>
          <Mic className="inline w-3 h-3 -mt-0.5" /> {durLabel(state === "idle" ? total : pos)}
        </div>
      </div>
    </div>
  );
};

// foto di un messaggio: caricata solo quando il fumetto compare (e poi tenuta in memoria)
const photoCache = {};
const ChatPhoto = ({ id, onOpen }) => {
  const [src, setSrc] = useState(photoCache[id] || null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!id || photoCache[id]) return;
    let alive = true;
    getDoc(chatDoc("chat_photos", id))
      .then((s) => {
        const data = s.exists() ? (s.data() || {}).data : null;
        if (!alive) return;
        if (data) {
          photoCache[id] = data;
          setSrc(data);
        } else setFailed(true);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [id]);
  if (failed)
    return <div className="text-[11px] italic opacity-70 py-2">Foto non disponibile</div>;
  if (!src)
    return (
      <div className="w-48 h-32 rounded-lg bg-black/10 flex items-center justify-center">
        <ImageIcon className="w-6 h-6 opacity-50" />
      </div>
    );
  return (
    <button type="button" onClick={() => onOpen && onOpen([src])} className="block">
      <img src={src} alt="Foto" className="max-h-56 max-w-full rounded-lg" />
    </button>
  );
};

// riquadro notifiche (attiva / attive / istruzioni iPhone)
export const PushBox = ({ techName, color }) => {
  const [push, setPush] = useState("checking");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    let alive = true;
    getPushState().then((s) => alive && setPush(s));
    return () => {
      alive = false;
    };
  }, []);
  const on = async () => {
    setBusy(true);
    setErr("");
    try {
      await enablePush(techName);
      setPush("on");
    } catch (e) {
      setErr(describeError(e));
      setPush(await getPushState());
    }
    setBusy(false);
  };
  const off = async () => {
    setBusy(true);
    try {
      await disablePush();
    } catch (e) {
      // niente
    }
    setPush(await getPushState());
    setBusy(false);
  };
  const box = {
    checking: null,
    on: (
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
        <span className="flex items-center gap-1.5">
          <Bell className="w-4 h-4" /> Notifiche attive su questo telefono
        </span>
        <button type="button" onClick={off} disabled={busy} className="underline text-slate-500 shrink-0">
          Disattiva
        </button>
      </div>
    ),
    off: (
      <button
        type="button"
        onClick={on}
        disabled={busy}
        data-action="enable-push"
        className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-${color}-600 text-white text-xs font-black active:scale-95 transition-transform disabled:opacity-60`}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
        Attiva notifiche
      </button>
    ),
    denied: (
      <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
        <BellOff className="w-4 h-4 shrink-0" /> Notifiche bloccate: riattivale dalle impostazioni del
        telefono.
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
    <div className="space-y-2">
      {box}
      {err && <p className="text-[11px] font-bold text-red-600">{err}</p>}
    </div>
  );
};

// CHAT TRA TECNICI: elenco conversazioni (gruppo + private) e conversazione a fumetti
export const ChatModal = ({
  messages = [],
  reads = [],
  technicians = [],
  techName,
  isAdmin = false,
  initialConv = null,
  onClose,
  onOpenPhotos,
  color = "blue",
}) => {
  const me = key(techName);
  const [conv, setConv] = useState(initialConv && canSee(initialConv, techName) ? initialConv : null);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null); // messaggio che sto modificando
  const [rec, setRec] = useState(null); // registrazione in corso
  const [recSecs, setRecSecs] = useState(0);
  const [voice, setVoice] = useState(null); // vocale registrato da mandare { data, mime, dur }
  const fileRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (initialConv && canSee(initialConv, techName)) setConv(initialConv);
  }, [initialConv, techName]);

  // elenco conversazioni: gruppo in cima, poi i colleghi (prima chi ha scritto di recente)
  const convList = useMemo(() => {
    const others = technicians
      .map((t) => t.name)
      .filter((n) => n && key(n) !== me)
      .filter((n, i, a) => a.findIndex((x) => key(x) === key(n)) === i);
    // anche chat private con persone non più in elenco tecnici
    messages.forEach((m) => {
      if (m.conv !== GROUP && canSee(m.conv, techName)) {
        const o = m.conv.slice(3).split("|").find((x) => x !== me);
        if (o && !others.some((n) => key(n) === o)) others.push(displayName(o, technicians));
      }
    });
    const row = (c) => {
      const list = messagesOf(messages, c);
      return { conv: c, last: list[list.length - 1] || null, unread: unreadIn(messages, reads, c, techName) };
    };
    const dms = others.map((n) => row(dmId(techName, n)));
    dms.sort(
      (a, b) =>
        (b.last ? msgTime(b.last) : 0) - (a.last ? msgTime(a.last) : 0) ||
        convTitle(a.conv, techName, technicians).localeCompare(convTitle(b.conv, techName, technicians), "it")
    );
    return [row(GROUP), ...dms];
  }, [messages, reads, technicians, techName, me]);

  const thread = useMemo(() => (conv ? messagesOf(messages, conv) : []), [messages, conv]);
  const pinned = useMemo(() => [...thread].reverse().find((m) => m.pinned) || null, [thread]);

  // conversazione aperta: segno come letto (solo se ci sono messaggi nuovi)
  useEffect(() => {
    if (conv) markConvRead(conv, techName, reads, messages).catch(() => {});
  }, [conv, techName, reads, messages]);
  // e scorro all'ultimo messaggio quando si apre o ne arriva uno nuovo
  const count = thread.length;
  useEffect(() => {
    if (conv && endRef.current && endRef.current.scrollIntoView)
      endRef.current.scrollIntoView({ block: "end" });
  }, [conv, count]);

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

  const send = async () => {
    if (!conv || busy) return;
    if (editing) {
      if (!text.trim() && !editing.photoId) return;
      setBusy(true);
      setError("");
      try {
        await editMessage(editing, text);
        setEditing(null);
        setText("");
      } catch (err) {
        setError("Non modificato: " + describeError(err));
      }
      setBusy(false);
      return;
    }
    if (!text.trim() && !photo && !voice) return;
    setBusy(true);
    setError("");
    try {
      const m = await sendMessage({ conv, text, photo, audio: voice, author: techName });
      setText("");
      setPhoto(null);
      setVoice(null);
      notifyChat(m).catch(() => {});
    } catch (err) {
      setError("Messaggio non inviato: " + describeError(err));
    }
    setBusy(false);
  };

  // VOCALI: tocchi il microfono, parli, tocchi ■ (si ferma da solo a 2 minuti), poi Invia
  const recStart = async () => {
    setError("");
    try {
      const r = await startVoice();
      setRec(r);
      setRecSecs(0);
    } catch (err) {
      setError(/denied|permission|NotAllowed/i.test(String(err && (err.name || err.message))) ? "Microfono non permesso: attivalo dalle impostazioni del telefono per questa app." : "Non riesco a registrare: " + describeError(err));
    }
  };
  const recStop = async () => {
    const r = rec;
    setRec(null);
    if (!r) return;
    try {
      const v = await r.stop();
      if (v.dur < 1) return setError("Vocale troppo corto.");
      setVoice(v);
    } catch (err) {
      setError(describeError(err));
    }
  };
  const recCancel = () => {
    if (rec) rec.cancel();
    setRec(null);
  };
  useEffect(() => {
    if (!rec) return undefined;
    const t = setInterval(() => setRecSecs(Math.floor((Date.now() - rec.startedAt) / 1000)), 250);
    return () => clearInterval(t);
  }, [rec]);
  useEffect(() => {
    if (rec && recSecs >= VOICE_MAX) recStop();
  });
  // chiudendo la chat la registrazione si ferma
  useEffect(
    () => () => {
      if (rec) rec.cancel();
    },
    [rec]
  );

  const startEdit = (m) => {
    setEditing(m);
    setText(m.text || "");
    setPhoto(null);
    setVoice(null);
    setSelected(null);
  };
  const cancelEdit = () => {
    setEditing(null);
    setText("");
  };

  const remove = async (m) => {
    if (!window.confirm("Eliminare questo messaggio per tutti?")) return;
    try {
      await removeMessage(m);
      setSelected(null);
      if (editing && editing.id === m.id) cancelEdit();
    } catch (err) {
      setError("Non eliminato: " + describeError(err));
    }
  };
  const togglePin = async (m) => {
    try {
      await updateDoc(chatDoc("chat_messages", m.id), { pinned: !m.pinned });
      setSelected(null);
    } catch (err) {
      setError("Non modificato: " + describeError(err));
    }
  };

  const title = conv ? convTitle(conv, techName, technicians) : "Chat";
  const groupNames = (users) => users.map((u) => displayName(u, technicians)).join(", ");

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[150] flex items-stretch md:items-center justify-center md:p-4 backdrop-blur-md">
      <div
        className="w-full md:max-w-2xl h-full md:h-[90vh] flex flex-col md:rounded-3xl overflow-hidden bg-white shadow-2xl"
        data-section="chat"
      >
        {/* intestazione */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 bg-white">
          {conv ? (
            <button
              type="button"
              onClick={() => {
                setConv(null);
                setSelected(null);
              }}
              aria-label="Indietro"
              className="p-2 -ml-2 rounded-full hover:bg-slate-100"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          ) : (
            <div className={`p-2 rounded-xl bg-${color}-50 text-${color}-600`}>
              <MessageSquare className="w-5 h-5" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-slate-800 text-base leading-tight truncate" data-chat-title>
              {title}
            </h3>
            {conv && (
              <p className="text-[10px] font-bold text-slate-500 uppercase truncate">
                {conv === GROUP ? `${technicians.length} tecnici` : "Chat privata"}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* ELENCO CONVERSAZIONI */}
        {!conv && (
          <div className="flex-1 overflow-y-auto custom-scrollbar" data-section="chat-list">
            <div className="p-4">
              <PushBox techName={techName} color={color} />
            </div>
            {convList.map(({ conv: c, last, unread }) => (
              <button
                key={c}
                type="button"
                data-conv={c}
                onClick={() => setConv(c)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 border-b border-slate-100 hover:bg-slate-50"
              >
                {c !== GROUP && techOf(technicians, convTitle(c, techName, technicians)) && techOf(technicians, convTitle(c, techName, technicians)).photoAt ? (
                  <Avatar tech={techOf(technicians, convTitle(c, techName, technicians))} className="w-11 h-11" color={color} />
                ) : (
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                    c === GROUP ? `bg-${color}-600 text-white` : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {c === GROUP ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-sm text-slate-800 truncate">
                      {convTitle(c, techName, technicians)}
                    </span>
                    {last && <span className="text-[10px] font-bold text-slate-400 shrink-0">{shortWhen(last)}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 truncate">
                      {last
                        ? `${last.authorKey === me ? "Tu" : last.author}: ${previewOf(last)}`
                        : c === GROUP
                        ? "Scrivi a tutti i tecnici"
                        : "Nessun messaggio"}
                    </span>
                    {unread > 0 && (
                      <span
                        data-conv-unread
                        className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shrink-0"
                      >
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* CONVERSAZIONE */}
        {conv && (
          <>
            {pinned && (
              <div
                data-section="chat-pinned"
                className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-start gap-2"
              >
                <Pin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 text-xs text-amber-900">
                  <span className="font-black">{pinned.author}: </span>
                  <span className="break-words">{previewOf(pinned)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => togglePin(pinned)}
                  aria-label="Togli il messaggio fissato"
                  className="p-1 rounded hover:bg-amber-100 text-amber-700 shrink-0"
                >
                  <PinOff className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100 px-3 py-3 space-y-1.5" data-section="chat-thread">
              {thread.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-10">
                  Nessun messaggio. Scrivi il primo!
                </p>
              ) : (
                <p className="text-[10px] font-bold text-slate-400 text-center pb-1" data-chat-hint>
                  Tocca un tuo messaggio per modificarlo o eliminarlo
                </p>
              )}
              {thread.map((m, i) => {
                const mine = m.authorKey === me;
                const newDay = i === 0 || dayLabel(thread[i - 1]) !== dayLabel(m);
                const sameAuthor = i > 0 && !newDay && thread[i - 1].authorKey === m.authorKey;
                const readers = mine ? readersOf(m, reads) : [];
                const canDelete = mine || isAdmin;
                return (
                  <React.Fragment key={m.id}>
                    {newDay && (
                      <div className="flex justify-center py-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-500 bg-white px-2.5 py-1 rounded-full shadow-sm">
                          {dayLabel(m)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${mine ? "justify-end" : "justify-start"}`} data-chat-msg={m.id} data-mine={mine ? "1" : "0"}>
                      <div className="max-w-[82%]">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelected(selected === m.id ? null : m.id)}
                          className={`px-3 py-2 rounded-2xl shadow-sm cursor-pointer ${
                            mine ? `bg-${color}-600 text-white rounded-br-md` : "bg-white text-slate-800 rounded-bl-md"
                          } ${m.pinned ? "ring-2 ring-amber-400" : ""}`}
                        >
                          {!mine && conv === GROUP && !sameAuthor && (
                            <div className={`text-[11px] font-black text-${color}-700 mb-0.5`}>{m.author}</div>
                          )}
                          {m.photoId && <ChatPhoto id={m.photoId} onOpen={onOpenPhotos} />}
                          {m.audioId && <VoicePlayer id={m.audioId} dur={m.audioDur} mine={mine} color={color} />}
                          {m.text && <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>}
                          <div className={`text-[10px] mt-0.5 text-right ${mine ? "text-white/80" : "text-slate-400"}`}>
                            {m.editedAt && <span data-edited>modificato · </span>}
                            {timeOf(m)}
                          </div>
                        </div>
                        {mine && (
                          <div className="text-[10px] font-bold text-slate-400 text-right mt-0.5 px-1" data-read>
                            {conv === GROUP
                              ? readers.length
                                ? `✓✓ Letto da ${groupNames(readers)}`
                                : "✓ Inviato"
                              : readers.length
                              ? "✓✓ Letto"
                              : "✓ Inviato"}
                          </div>
                        )}
                        {selected === m.id && (
                          <div className={`flex gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`} data-msg-actions>
                            <button
                              type="button"
                              onClick={() => togglePin(m)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-sm"
                            >
                              {m.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                              {m.pinned ? "Togli dall'alto" : "Fissa in alto"}
                            </button>
                            {mine && !m.audioId && (
                              <button
                                type="button"
                                onClick={() => startEdit(m)}
                                data-action="msg-edit"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 shadow-sm"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Modifica
                              </button>
                            )}
                            {canDelete && (
                              <button
                                data-action="msg-delete"
                                type="button"
                                onClick={() => remove(m)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-red-200 text-[11px] font-bold text-red-600 shadow-sm"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Elimina
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={endRef} />
            </div>

            {/* scrivi */}
            <div className="border-t border-slate-200 bg-white p-3 space-y-2" data-section="chat-compose">
              {error && (
                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl p-2">{error}</p>
              )}
              {editing && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" data-chat-editing>
                  <Pencil className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 truncate">Modifichi il messaggio: «{editing.text || "Foto"}»</span>
                  <button type="button" onClick={cancelEdit} className="underline text-slate-500 shrink-0" data-action="edit-cancel">
                    Annulla
                  </button>
                </div>
              )}
              {voice && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5" data-chat-voice-ready>
                  <div className="flex-1">
                    <VoicePlayer src={voice.data} dur={voice.dur} color={color} />
                  </div>
                  <button type="button" onClick={() => setVoice(null)} aria-label="Elimina il vocale" className="p-2 rounded-full text-red-600" data-action="voice-discard">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              )}
              {photo && (
                <div className="relative w-fit">
                  <img src={photo} alt="Foto da inviare" className="h-20 rounded-xl border border-slate-200" />
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
              {rec ? (
                <div className="flex items-center gap-2" data-chat-recording>
                  <button type="button" onClick={recCancel} className="px-3 py-2.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold shrink-0" data-action="voice-cancel">
                    Annulla
                  </button>
                  <div className="flex-1 flex items-center justify-center gap-2 text-sm font-black text-red-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" /> Sto registrando {durLabel(recSecs)}
                  </div>
                  <button type="button" onClick={recStop} aria-label="Ferma" className="p-2.5 rounded-full bg-red-600 text-white shrink-0" data-action="voice-stop">
                    <Square className="w-5 h-5" />
                  </button>
                </div>
              ) : (
              <div className="flex items-end gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} aria-label="Scegli foto" />
                <button
                  type="button"
                  onClick={() => fileRef.current && fileRef.current.click()}
                  aria-label="Allega foto"
                  className="p-2.5 rounded-full bg-slate-100 text-slate-600 shrink-0"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={Math.min(4, Math.max(1, text.split("\n").length))}
                  maxLength={2000}
                  placeholder="Scrivi un messaggio"
                  aria-label="Testo del messaggio"
                  className="flex-1 px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-800 outline-none resize-none"
                />
                {!text.trim() && !photo && !voice && !editing && voiceSupported() ? (
                  <button
                    type="button"
                    onClick={recStart}
                    aria-label="Registra un vocale"
                    data-action="voice-rec"
                    className={`p-2.5 rounded-full bg-${color}-600 text-white shrink-0 active:scale-95 transition-transform`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={send}
                    disabled={busy || (editing ? !text.trim() && !editing.photoId : !text.trim() && !photo && !voice)}
                    aria-label={editing ? "Salva la modifica" : "Invia"}
                    data-action="chat-send"
                    className={`p-2.5 rounded-full bg-${color}-600 text-white shrink-0 disabled:opacity-40 active:scale-95 transition-transform`}
                  >
                    {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                )}
              </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
