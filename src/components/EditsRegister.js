// AREA ADMIN → Persone → «Modifiche»: chi ha modificato o eliminato un intervento, quando e cosa.
// Dice anche se l'ha fatto nei primi 3 minuti (quando il tecnico può farlo da solo) o dopo (serve la
// password admin). Le modifiche sono già scritte dentro ogni rapporto (logHistory.js), le eliminazioni
// sono nel Cestino (trash.js): qui le metto in un elenco solo, dal più recente.
import React, { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Clock, Loader2, ArrowRight } from "lucide-react";
import { listTrash } from "../trash";
import { editsOf } from "../logHistory";

const FREE_MS = 3 * 60 * 1000;

export const msOf = (v) => {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.seconds === "number") return v.seconds * 1000;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
};

// «dopo 2 min», «dopo 5 ore», «dopo 3 giorni»
export const afterLabel = (ms) => {
  if (!(ms >= 0)) return "";
  const m = Math.round(ms / 60000);
  if (m < 1) return "subito";
  if (m < 60) return `dopo ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `dopo ${h} ${h === 1 ? "ora" : "ore"}`;
  return `dopo ${Math.round(h / 24)} giorni`;
};

const when = (ms) =>
  ms
    ? new Date(ms).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) +
      " " +
      new Date(ms).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
    : "";

// tutte le modifiche e le eliminazioni in un elenco
export const buildRegister = (logs = [], trash = []) => {
  const out = [];
  logs.forEach((l) => {
    const created = msOf(l.createdAt);
    editsOf(l).forEach((e, i) => {
      const at = msOf(e.at);
      const since = created && at ? at - created : null;
      out.push({ key: `e_${l.id}_${i}`, kind: "edit", at, who: e.who || "", log: l, changes: e.changes || [], since, free: since !== null && since <= FREE_MS });
    });
  });
  trash.forEach((t) => {
    const at = msOf(t.deletedAtMs || t.deletedAt);
    const created = msOf(t.createdAt);
    const since = created && at ? at - created : null;
    out.push({ key: `d_${t.id}`, kind: "delete", at, who: t.deletedBy || "", log: t, changes: [], since, free: since !== null && since <= FREE_MS });
  });
  return out.sort((a, b) => b.at - a.at);
};

export const EditsRegister = ({ logs = [], technicians = [], color = "blue", onOpenTrash }) => {
  const [trash, setTrash] = useState(null);
  const [who, setWho] = useState("");
  const [kind, setKind] = useState("all");
  const [time, setTime] = useState("all");

  useEffect(() => {
    let alive = true;
    listTrash()
      .then((l) => alive && setTrash(l))
      .catch((e) => {
        console.error(e);
        if (alive) setTrash([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const all = useMemo(() => buildRegister(logs, trash || []), [logs, trash]);
  const people = useMemo(() => {
    const s = new Set(technicians.map((t) => t.name).filter(Boolean));
    all.forEach((r) => r.who && s.add(r.who));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [all, technicians]);
  const list = all.filter(
    (r) =>
      (!who || r.who === who) &&
      (kind === "all" || r.kind === kind) &&
      (time === "all" || (time === "free" ? r.free : r.since !== null && !r.free))
  );

  const chip = (on) => `h-9 px-3 rounded-full text-xs font-bold ${on ? `bg-${color}-600 text-white` : "bg-slate-100 text-slate-700"}`;
  const sel = "h-9 px-3 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700";
  return (
    <div className="space-y-3" data-section="edits-register">
      <div>
        <h4 className="font-black text-slate-800">Modifiche ed eliminazioni</h4>
        <p className="text-xs text-slate-500 leading-snug mt-1">
          Chi ha modificato o eliminato un intervento, quando e cosa ha cambiato. «Nei primi 3 minuti» lo può fare il tecnico da solo; «dopo» serve la password admin. Gli interventi eliminati si recuperano dal Cestino per 30 giorni.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className={sel} value={who} onChange={(e) => setWho(e.target.value)} data-register-who aria-label="Tecnico">
          <option value="">Tutti i tecnici</option>
          {people.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {[
          ["all", "Tutto"],
          ["edit", "Modifiche"],
          ["delete", "Eliminazioni"],
        ].map(([id, l]) => (
          <button key={id} type="button" className={chip(kind === id)} onClick={() => setKind(id)} data-register-kind={id}>
            {l}
          </button>
        ))}
        {[
          ["all", "Sempre"],
          ["free", "Nei primi 3 min"],
          ["late", "Dopo 3 min"],
        ].map(([id, l]) => (
          <button key={id} type="button" className={chip(time === id)} onClick={() => setTime(id)} data-register-time={id}>
            {l}
          </button>
        ))}
      </div>
      {trash === null && (
        <p className="text-xs text-slate-500 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardo anche il Cestino…
        </p>
      )}
      <p className="text-xs text-slate-500" data-register-count>
        {list.length} {list.length === 1 ? "voce" : "voci"}
      </p>
      <ul className="space-y-2">
        {list.slice(0, 150).map((r) => {
          const l = r.log || {};
          const Ic = r.kind === "edit" ? Pencil : Trash2;
          return (
            <li key={r.key} className="rounded-2xl border border-slate-200 bg-white p-3 space-y-1.5" data-register-row={r.kind}>
              <div className="flex items-start gap-2">
                <span className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${r.kind === "edit" ? `bg-${color}-50 text-${color}-700` : "bg-rose-50 text-rose-700"}`}>
                  <Ic className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-slate-800">
                    <b>{r.who || "Qualcuno"}</b> {r.kind === "edit" ? "ha modificato" : "ha eliminato"} l'intervento
                  </span>
                  <span className="block text-xs text-slate-600 break-words">
                    {[l.customer, l.machineId && `gru ${l.machineId}`, l.dateString, l.ticketNumber && `N. ${l.ticketNumber}`].filter(Boolean).join(" · ")}
                    {l.technician && l.technician !== r.who ? ` · fatto da ${l.technician}` : ""}
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    <Clock className="inline w-3 h-3 -mt-0.5 mr-1" />
                    {when(r.at)}
                    {r.since !== null && (
                      <span className={`ml-1.5 font-bold ${r.free ? "text-slate-500" : "text-amber-700"}`} data-register-since>
                        · {afterLabel(r.since)} dal salvataggio {r.free ? "(nei primi 3 minuti)" : "(con la password admin)"}
                      </span>
                    )}
                  </span>
                </span>
              </div>
              {r.changes.length > 0 && (
                <ul className="pl-10 space-y-0.5">
                  {r.changes.map((c, i) => (
                    <li key={i} className="text-xs text-slate-700 break-words">
                      <b>{c.f}:</b> <span className="line-through text-slate-400">{c.a || "vuoto"}</span> <ArrowRight className="inline w-3 h-3 -mt-0.5" /> {c.b || "vuoto"}
                    </li>
                  ))}
                </ul>
              )}
              {r.kind === "delete" && onOpenTrash && (
                <button type="button" onClick={onOpenTrash} className={`ml-10 text-xs font-bold text-${color}-700`} data-action="register-trash">
                  Recupera dal Cestino
                </button>
              )}
            </li>
          );
        })}
        {!list.length && trash !== null && <li className="text-sm text-slate-500">Nessuna modifica o eliminazione.</li>}
      </ul>
    </div>
  );
};
