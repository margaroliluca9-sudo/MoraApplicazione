// AREA ADMIN → System: letture del database di oggi (il limite gratuito è 50.000 al giorno,
// riparte alle 9 del mattino). Somma di tutti i telefoni, divisa per parte dell'app e per persona.
// Ogni telefono aggiorna il suo conteggio ogni 10 minuti (vedi metered.js).
import React, { useCallback, useEffect, useState } from "react";
import { collection, query, where } from "firebase/firestore";
import { Database, Loader2, AlertTriangle } from "lucide-react";
import { db, appId } from "../firebase";
import { getDocs, READS_COLL, FREE_READS, flushReads, readsToday } from "../metered";

export const COLL_LABELS = {
  maintenance_logs: "Interventi",
  log_photos: "Foto degli interventi",
  customers: "Clienti",
  machines: "Gru",
  machine_types: "Tipi di gru",
  technicians: "Tecnici",
  settings: "Impostazioni",
  active_users: "Tecnici online",
  access_logs: "Registro accessi",
  chat_messages: "Messaggi",
  chat_reads: "Messaggi letti",
  chat_photos: "Foto dei messaggi",
  personal_notes: "Note",
  personal_reminders: "Promemoria",
  personal_events: "Calendario",
  personal_contacts: "Contatti",
  personal_hours: "Le mie ore",
  personal_settings: "Impostazioni personali",
  vans: "Furgoni",
  van_items: "Magazzino furgone",
  van_moves: "Movimenti furgone",
  game_scores: "Gioco",
  deleted_logs: "Cestino",
  app_errors: "Errori",
  read_stats: "Questo conteggio",
  push_subscriptions: "Notifiche",
  home_prefs: "Home personalizzata",
  hours_reminders: "Promemoria ore",
};
const label = (k) => COLL_LABELS[k] || k;

// somma dei telefoni di un giorno
export const sumReads = (rows) => {
  const by = {};
  const who = {};
  let total = 0;
  rows.forEach((r) => {
    total += Number(r.total) || 0;
    Object.entries(r.by || {}).forEach(([k, v]) => (by[k] = (by[k] || 0) + (Number(v) || 0)));
    const w = r.who || "Senza nome";
    who[w] = (who[w] || 0) + (Number(r.total) || 0);
  });
  return { total, by: Object.entries(by).sort((a, b) => b[1] - a[1]), who: Object.entries(who).sort((a, b) => b[1] - a[1]), phones: rows.length };
};
export const loadReadsDay = async (date) => {
  const snap = await getDocs(query(collection(db, "artifacts", appId, "public", "data", READS_COLL), where("date", "==", date)));
  return sumReads(snap.docs.map((d) => d.data()));
};

const fmt = (n) => Number(n || 0).toLocaleString("it-IT");

export const ReadsCard = ({ color = "blue" }) => {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    setErr("");
    try {
      await flushReads(); // prima mando il mio conteggio, così è aggiornato
      setData(await loadReadsDay(readsToday().date));
    } catch (e) {
      setErr("Non riesco a leggere il conteggio adesso (rete?).");
    }
    setBusy(false);
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const pct = data ? Math.min(100, Math.round((data.total / FREE_READS) * 100)) : 0;
  const tone = pct >= 90 ? "bg-red-600" : pct >= 70 ? "bg-amber-500" : "bg-emerald-600";
  const top = data && data.by.length ? data.by[0][1] : 1;
  return (
    <div className="mb-6 p-4 rounded-2xl border border-slate-200 bg-white" data-section="reads-card">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
          <Database className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-800">Letture del database oggi</p>
          <p className="text-xs text-slate-500">Gratis fino a {fmt(FREE_READS)} al giorno; il conteggio riparte alle 9. I telefoni lo aggiornano ogni 10 minuti.</p>
        </div>
      </div>
      {busy && !data && <p className="mt-3 text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carico…</p>}
      {err && <p className="mt-3 text-sm font-bold text-red-600">{err}</p>}
      {data && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-black text-slate-800 tabular-nums" data-reads-total>{fmt(data.total)}</p>
              <p className="text-sm font-bold text-slate-500 tabular-nums">{pct}% del limite</p>
            </div>
            <div className="mt-1 h-3 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(2, pct)}%` }} />
            </div>
            {pct >= 70 && (
              <p className="mt-2 text-sm font-bold text-amber-700 flex items-center gap-1.5" data-reads-warn>
                <AlertTriangle className="w-4 h-4" /> Vicino al limite: se si supera, fino alle 9 di domani l'app non riceve dati nuovi.
              </p>
            )}
          </div>
          {data.by.length > 0 && (
            <div>
              <p className="text-xs font-black text-slate-500 mb-1.5">Da dove arrivano</p>
              <div className="space-y-1.5">
                {data.by.slice(0, 8).map(([k, v]) => (
                  <div key={k} className="text-sm" title={`${label(k)}: ${fmt(v)} letture`}>
                    <div className="flex justify-between gap-2">
                      <span className="font-bold text-slate-700 truncate">{label(k)}</span>
                      <span className="text-slate-600 tabular-nums">{fmt(v)}</span>
                    </div>
                    <div className="mt-0.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full rounded-full bg-${color}-600`} style={{ width: `${(v / top) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.who.length > 0 && (
            <p className="text-xs text-slate-500">
              <b className="text-slate-700">Per persona:</b> {data.who.map(([w, v]) => `${w} ${fmt(v)}`).join(" · ")} ({data.phones} {data.phones === 1 ? "telefono" : "telefoni"})
            </p>
          )}
          <button type="button" onClick={load} disabled={busy} className="h-10 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm">
            {busy ? "Aggiorno…" : "Aggiorna"}
          </button>
        </div>
      )}
    </div>
  );
};
