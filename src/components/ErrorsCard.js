// AREA ADMIN → System: errori arrivati dai telefoni (vedi errorLog.js).
// Si leggono solo quando tocchi «Mostra» (al massimo 40, così il database non si consuma).
import React, { useState } from "react";
import { collection, getDocs, limit, orderBy, query, writeBatch, doc } from "firebase/firestore";
import { Bug, Loader2, ChevronDown, Trash2, CheckCircle2 } from "lucide-react";
import { db, appId } from "../firebase";
import { ERRORS_COLL } from "../errorLog";

const SCREENS = { dashboard: "Home", new: "Nuovo rapporto", history: "Storico", office: "Ufficio", database: "Database", explore: "Esplora", admin: "Admin" };
const KINDS = { schermata: "Schermata bloccata", promessa: "Operazione non riuscita", errore: "Errore" };
const ref = () => collection(db, "artifacts", appId, "public", "data", ERRORS_COLL);
const ms = (r) => (r.when && r.when.seconds ? r.when.seconds * 1000 : Number(r.at) || 0);
const fmt = (t) => (t ? new Date(t).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");

// errori uguali (stesso messaggio) raggruppati: quante volte, quando l'ultima, su quali telefoni
export const groupErrors = (rows) => {
  const g = new Map();
  rows.forEach((r) => {
    const k = (r.msg || "").trim();
    const x = g.get(k) || { msg: k, kind: r.kind, n: 0, last: 0, who: new Set(), devices: new Set(), screens: new Set(), stack: r.stack || "", ids: [] };
    x.n += 1;
    x.ids.push(r.id);
    const t = ms(r);
    if (t >= x.last) {
      x.last = t;
      x.stack = r.stack || x.stack;
    }
    if (r.who) x.who.add(r.who);
    if (r.device) x.devices.add(r.device);
    if (r.screen) x.screens.add(SCREENS[r.screen] || r.screen);
    g.set(k, x);
  });
  return [...g.values()].sort((a, b) => b.last - a.last);
};

export const ErrorsCard = ({ color = "blue" }) => {
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);
  const [err, setErr] = useState("");

  const load = async () => {
    setBusy(true);
    setErr("");
    try {
      const snap = await getDocs(query(ref(), orderBy("when", "desc"), limit(40)));
      setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setErr("Non riesco a leggere gli errori adesso (rete?).");
    }
    setBusy(false);
  };
  const clear = async () => {
    if (!rows || !rows.length) return;
    setBusy(true);
    try {
      const b = writeBatch(db);
      rows.forEach((r) => b.delete(doc(ref(), r.id)));
      await b.commit();
      setRows([]);
    } catch (e) {
      setErr("Non sono riuscito a svuotare l'elenco.");
    }
    setBusy(false);
  };

  const groups = rows ? groupErrors(rows) : [];
  return (
    <div className="mb-6 p-4 rounded-2xl border border-slate-200 bg-white" data-section="errors-card">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
          <Bug className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-800">Errori sui telefoni</p>
          <p className="text-xs text-slate-500">Se l'app va in errore sul telefono di qualcuno, qui vedi cosa è successo, a chi e su che telefono. Si cancellano da soli dopo 60 giorni.</p>
        </div>
      </div>
      {rows == null ? (
        <button type="button" onClick={load} disabled={busy} data-action="errors-load" className={`mt-3 h-11 px-4 rounded-xl bg-${color}-600 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-60`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Mostra gli errori
        </button>
      ) : groups.length === 0 ? (
        <p className="mt-3 text-sm font-bold text-emerald-700 flex items-center gap-2" data-errors-empty>
          <CheckCircle2 className="w-5 h-5" /> Nessun errore: tutto a posto.
        </p>
      ) : (
        <div className="mt-3 space-y-2" data-errors-list>
          {groups.map((g, i) => (
            <div key={g.msg + i} className="rounded-xl border border-slate-200 bg-slate-50">
              <button type="button" onClick={() => setOpen(open === i ? null : i)} className="w-full text-left p-3 flex gap-2 items-start">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-black text-slate-800 break-words">{g.msg || "Errore senza descrizione"}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    {KINDS[g.kind] || "Errore"} · {g.n} {g.n === 1 ? "volta" : "volte"} · ultima {fmt(g.last)}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {[...g.who].join(", ") || "—"}
                    {g.screens.size ? ` · in ${[...g.screens].join(", ")}` : ""}
                  </span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && (
                <div className="px-3 pb-3 space-y-1">
                  <p className="text-xs text-slate-600">
                    <b>Telefoni:</b> {[...g.devices].join(" — ") || "—"}
                  </p>
                  {g.stack && <pre className="text-[11px] leading-snug text-slate-500 bg-white border border-slate-200 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-40">{g.stack}</pre>}
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={load} disabled={busy} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm">
              Aggiorna
            </button>
            <button type="button" onClick={clear} disabled={busy} data-action="errors-clear" className="h-10 px-4 rounded-xl border border-red-200 text-red-700 font-bold text-sm flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" /> Svuota l'elenco
            </button>
          </div>
        </div>
      )}
      {err && <p className="mt-2 text-sm font-bold text-red-600">{err}</p>}
    </div>
  );
};
