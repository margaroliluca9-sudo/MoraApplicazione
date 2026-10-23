// "TECNICI ONLINE" (in alto nella Home): chi è collegato adesso e, se l'admin lo permette,
// messaggi veloci a un collega. Usa lo stesso sistema della chat (stessi messaggi privati),
// ma funziona anche quando la chat completa in «La mia area» è spenta.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, User, ArrowLeft, Send, MessageCircle } from "lucide-react";
import {
  dmId,
  key,
  otherOf,
  displayName,
  messagesOf,
  unreadIn,
  markConvRead,
  sendMessage,
  notifyChat,
  timeOf,
  dayLabel,
  msgTime,
  canSee,
} from "../chat";

const since = (u) => {
  if (!u || !u.lastActive) return "ora";
  const min = Math.round((Date.now() - u.lastActive.seconds * 1000) / 60000);
  return min < 2 ? "ora" : `${min} min fa`;
};

// messaggi privati da leggere (per il pallino sul "tecnici online")
export const onlineUnread = (msgs, reads, me) => {
  if (!me) return 0;
  const convs = new Set((msgs || []).map((m) => m.conv).filter((c) => String(c).startsWith("dm:") && canSee(c, me)));
  let n = 0;
  convs.forEach((c) => (n += unreadIn(msgs, reads, c, me)));
  return n;
};

export const OnlineMenu = ({
  users = [],
  me = "",
  isAdmin = false,
  canWrite = false,
  messages = [],
  reads = [],
  technicians = [],
  color = "blue",
  startConv = null,
  onClose,
}) => {
  const [conv, setConv] = useState(startConv && canWrite ? startConv : null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const meKey = key(me);

  const others = users.filter((u) => key(u.technician) !== meKey);
  const meOnline = users.some((u) => key(u.technician) === meKey);
  // conversazioni private recenti (anche con chi adesso non è online)
  const recent = useMemo(() => {
    if (!canWrite || !meKey) return [];
    const last = {};
    (messages || []).forEach((m) => {
      if (!String(m.conv).startsWith("dm:") || !canSee(m.conv, me)) return;
      if (!last[m.conv] || msgTime(m) > msgTime(last[m.conv])) last[m.conv] = m;
    });
    const onlineKeys = others.map((u) => key(u.technician));
    return Object.values(last)
      .filter((m) => !onlineKeys.includes(otherOf(m.conv, me)))
      .sort((a, b) => msgTime(b) - msgTime(a))
      .slice(0, 6);
  }, [messages, me, meKey, canWrite, others]);

  const thread = conv ? messagesOf(messages, conv).slice(-40) : [];
  // aperta una conversazione: segno come letta e scorro in fondo
  useEffect(() => {
    if (!conv) return;
    markConvRead(conv, me, reads, messages).catch(() => {});
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [conv, me, reads, messages, thread.length]);

  const send = async (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !conv || sending) return;
    setSending(true);
    try {
      const m = await sendMessage({ conv, text: t, author: me, via: "online" });
      setText("");
      notifyChat(m).catch(() => {});
    } finally {
      setSending(false);
    }
  };

  const unreadWith = (other) => unreadIn(messages, reads, dmId(me, other), me);
  const row = (name, sub, other, extra) => {
    const n = canWrite ? unreadWith(other) : 0;
    return (
      <div key={other} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50" data-online-user={other}>
        <div className="relative w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-700 shrink-0">
          <User className="w-4 h-4" />
          {extra}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-800 truncate leading-tight">{name}</div>
          <div className="text-xs text-slate-500 truncate">{sub}</div>
        </div>
        {canWrite && (
          <button
            type="button"
            data-action="online-write"
            onClick={() => setConv(dmId(me, other))}
            className={`relative h-9 px-3 rounded-xl bg-${color}-600 text-white text-xs font-black flex items-center gap-1.5 shrink-0`}
          >
            <MessageCircle className="w-4 h-4" /> Scrivi
            {n > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-black flex items-center justify-center">
                {n}
              </span>
            )}
          </button>
        )}
      </div>
    );
  };

  // sopra a tutto (fuori dall'intestazione): tocco fuori = chiudi
  return createPortal(
    <>
    <div className="fixed inset-0 z-[59] bg-slate-900/10" data-action="online-outside" onClick={onClose} />
    <div
      className="fixed left-3 right-3 top-[78px] md:left-auto md:right-6 md:w-96 max-h-[75vh] flex flex-col bg-white border border-slate-200 rounded-2xl shadow-2xl z-[60] overflow-hidden"
      data-section="online-menu"
      onClick={(e) => e.stopPropagation()}
    >
      {!conv ? (
        <>
          <div className="px-3 py-2.5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <span className="text-xs font-black text-slate-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" /> Online adesso ({users.length})
            </span>
            <button type="button" onClick={onClose} aria-label="Chiudi" className="p-1.5 hover:bg-slate-200 rounded-full">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="overflow-y-auto p-2 space-y-1">
            {meOnline && (
              <div className="flex items-center gap-3 p-2">
                <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-sm font-bold text-slate-500">Tu ({me})</div>
              </div>
            )}
            {others.map((u) =>
              row(u.technician, isAdmin ? `${u.device || ""} · ${since(u)}${u.hidden ? " · nascosto ai colleghi" : ""}` : `attivo ${since(u)}`, key(u.technician))
            )}
            {others.length === 0 && (
              <p className="text-sm text-slate-500 p-2">Nessun collega collegato in questo momento.</p>
            )}
            {recent.length > 0 && (
              <>
                <div className="px-2 pt-3 pb-1 text-[11px] font-black uppercase tracking-wide text-slate-400">Messaggi recenti</div>
                {recent.map((m) => {
                  const other = otherOf(m.conv, me);
                  return row(
                    displayName(other, technicians),
                    `${m.authorKey === meKey ? "Tu: " : ""}${m.text || "foto"}`,
                    other,
                    null
                  );
                })}
              </>
            )}
            {!canWrite && (
              <p className="text-xs text-slate-400 px-2 pt-2">I messaggi da qui sono spenti dall'admin.</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="px-2 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
            <button type="button" onClick={() => setConv(null)} aria-label="Indietro" data-action="online-back" className="p-2 hover:bg-slate-200 rounded-full">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-black text-slate-800 truncate">{displayName(otherOf(conv, me), technicians)}</div>
              <div className="text-[11px] text-slate-500">
                {users.some((u) => key(u.technician) === otherOf(conv, me)) ? "online adesso" : "non collegato: lo leggerà quando apre l'app"}
              </div>
            </div>
            <button type="button" onClick={onClose} aria-label="Chiudi" className="p-2 hover:bg-slate-200 rounded-full">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-slate-50 min-h-[180px]" data-section="online-thread">
            {thread.length === 0 && <p className="text-sm text-slate-400 text-center py-6">Scrivi il primo messaggio.</p>}
            {thread.map((m, i) => {
              const mine = m.authorKey === meKey;
              const day = dayLabel(m);
              const newDay = i === 0 || dayLabel(thread[i - 1]) !== day;
              return (
                <React.Fragment key={m.id}>
                  {newDay && <div className="text-center text-[11px] font-bold text-slate-400 py-1">{day}</div>}
                  <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      data-online-msg
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug whitespace-pre-wrap break-words ${
                        mine ? `bg-${color}-600 text-white rounded-br-md` : "bg-white border border-slate-200 text-slate-800 rounded-bl-md"
                      }`}
                    >
                      {m.text || "📷 foto"}
                      <span className={`block text-[10px] mt-0.5 text-right ${mine ? "text-white/70" : "text-slate-400"}`}>{timeOf(m)}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          <form onSubmit={send} className="p-2 border-t border-slate-200 flex gap-2 bg-white">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Scrivi un messaggio…"
              data-field="online-text"
              className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-300 bg-slate-50 text-sm"
            />
            <button
              type="submit"
              disabled={!text.trim() || sending}
              aria-label="Invia"
              data-action="online-send"
              className={`h-11 w-11 rounded-xl bg-${color}-600 text-white flex items-center justify-center disabled:opacity-40`}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </>
      )}
    </div>
    </>,
    document.body
  );
};
