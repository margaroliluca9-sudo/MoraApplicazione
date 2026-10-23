// AREA ADMIN → System: copia di sicurezza completa del database.
// Si fa da sola ogni domenica notte; qui si vede com'è andata l'ultima e si può farne una subito
// (chiede la password admin). Le copie si scaricano da GitHub (Actions → Copia di sicurezza).
import React, { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2, ExternalLink, Play } from "lucide-react";

const PAGE = "https://github.com/margaroliluca9-sudo/MoraApplicazione/actions/workflows/backup.yml";
const when = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })} alle ${d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
};

export const BackupCard = ({ color = "blue" }) => {
  const [info, setInfo] = useState(null); // { ready, runs }
  const [ask, setAsk] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/backup");
      const j = await r.json();
      if (j && j.ok) setInfo(j);
      else setInfo({ runs: [], ready: false });
    } catch (e) {
      setInfo({ runs: [], ready: false, offline: true });
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  // copia in corso: ricontrollo ogni 15 secondi
  const running = info && info.runs && info.runs[0] && info.runs[0].status !== "completed";
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [running, load]);

  const start = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = await r.json();
      if (!j.ok) setMsg({ ok: false, text: j.error || "Non partita." });
      else {
        setMsg({ ok: true, text: j.already ? "C'è già una copia in corso: aspetta che finisca." : "Partita! Tra un paio di minuti la trovi qui sotto." });
        setAsk(false);
        setPw("");
        setTimeout(load, 4000);
      }
    } catch (e) {
      setMsg({ ok: false, text: "Serve la rete per farla partire." });
    } finally {
      setBusy(false);
    }
  };

  const last = info && info.runs && info.runs[0];
  const lastOk = info && info.runs && info.runs.find((x) => x.ok);
  return (
    <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 mb-6" data-section="backup-card">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${lastOk ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          {lastOk ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h5 className="font-black text-slate-800">Copia di sicurezza</h5>
          <p className="text-sm text-slate-500 leading-snug">Tutto il database, cifrato con la password di GitHub. Si fa da sola ogni domenica notte.</p>
        </div>
      </div>
      {!info ? (
        <p className="text-sm text-slate-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Controllo…
        </p>
      ) : (
        <div className="text-sm space-y-1" data-backup-status>
          {running && (
            <p className="font-bold text-blue-700 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Copia in corso…
            </p>
          )}
          <p className="text-slate-700">
            Ultima riuscita: <b>{lastOk ? when(lastOk.at) : "ancora nessuna"}</b>
          </p>
          {last && last.status === "completed" && !last.ok && (
            <p className="text-amber-700 font-semibold">L'ultima prova ({when(last.at)}) non è riuscita: si riprova da sola domenica, oppure falla partire qui.</p>
          )}
          {info.offline && <p className="text-slate-500">Senza rete non so dirti com'è andata.</p>}
        </div>
      )}
      {ask ? (
        <div className="space-y-2">
          <input
            type="password"
            autoComplete="current-password"
            className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold"
            placeholder="Password admin"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            data-backup-pw
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => { setAsk(false); setPw(""); }} className="flex-1 h-11 rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
              Annulla
            </button>
            <button type="button" disabled={busy || !pw} onClick={start} data-action="backup-go" className={`flex-1 h-11 rounded-full bg-${color}-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50`}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Fai la copia
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={running} onClick={() => { setMsg(null); setAsk(true); }} data-action="backup-now" className={`h-11 px-5 rounded-full bg-${color}-600 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50`}>
            <Play className="w-4 h-4" /> Fai una copia adesso
          </button>
          <a href={PAGE} target="_blank" rel="noopener noreferrer" className="h-11 px-4 rounded-full bg-slate-100 text-slate-700 font-bold text-sm flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Le copie su GitHub
          </a>
        </div>
      )}
      {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-emerald-700" : "text-red-600"}`} data-backup-msg>{msg.text}</p>}
    </div>
  );
};
