// AREA ADMIN → Drive: com'è andato il programma del Google Drive (apps-script/paesi-dal-drive.gs).
// Lui a ogni giro scrive l'esito in settings/drive_places; qui lo traduco in un semaforo:
//   verde = tutto a posto · giallo = ha finito solo una parte o ha saltato qualche cartella ·
//   rosso = si è fermato con un errore o non gira da più di un giorno · grigio = mai partito.
import React, { useEffect, useState } from "react";
import { doc } from "firebase/firestore";
import { CheckCircle2, AlertTriangle, XCircle, Clock } from "lucide-react";
import { db, appId } from "../firebase";
import { getDoc } from "../metered";

export const driveWhen = (iso) => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }) + " alle " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
};

const hoursSince = (iso, now) => {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? Infinity : (now - t) / 3600000;
};

// dall'esito salvato → { tone, title, text, problems }
export const driveHealth = (info, now = Date.now()) => {
  if (!info || !info.lastRun) {
    if (info && info.lastError)
      return { tone: "red", title: "Il programma del Drive si è fermato", text: `Errore: ${info.lastError}`, problems: [] };
    return { tone: "slate", title: "Il programma del Drive non è ancora partito", text: "Installalo su Google Script (vedi Guida → Area admin).", problems: [] };
  }
  let problems = [];
  try {
    problems = JSON.parse(info.erroriLista || "[]");
  } catch (e) {
    problems = [];
  }
  const errAfter = info.lastError && info.lastErrorAt && new Date(info.lastErrorAt) > new Date(info.lastRun);
  if (errAfter && /429|quota|RESOURCE_EXHAUSTED/i.test(info.lastError))
    return {
      tone: "amber",
      title: "Si è fermato: letture del database finite",
      text: `${driveWhen(info.lastErrorAt)}: Firebase non ha risposto perché le letture gratuite del giorno erano già finite. Riprova da solo domattina alle 10; se vuoi subito, in Google Script premi Esegui su «aggiorna».`,
      problems,
    };
  if (errAfter) return { tone: "red", title: "L'ultimo giro si è fermato con un errore", text: `${driveWhen(info.lastErrorAt)}: ${info.lastError}`, problems };
  const h = hoursSince(info.lastRun, now);
  if (h > 30)
    return {
      tone: "red",
      title: `Non gira da ${h > 48 ? Math.floor(h / 24) + " giorni" : "più di un giorno"}`,
      text: "Dovrebbe girare ogni mattina alle 10. Apri Google Script e premi Esegui su «installa».",
      problems,
    };
  if (info.finito === "no") return { tone: "amber", title: "Ha letto solo una parte delle cartelle", text: "Il resto lo legge da solo domattina alle 10: non devi fare niente.", problems };
  const n = Number(info.errori) || problems.length;
  if (n > 0) return { tone: "amber", title: `Fatto, ma ${n === 1 ? "una cartella non l'ha letta" : n + " cartelle non le ha lette"}`, text: "Guarda qui sotto quali: di solito è un foglio rovinato o scritto in modo diverso.", problems };
  return { tone: "emerald", title: "Tutto a posto", text: "Il programma del Drive gira ogni mattina alle 10.", problems };
};

const TONES = {
  emerald: ["bg-emerald-50 border-emerald-200 text-emerald-900", CheckCircle2, "text-emerald-600"],
  amber: ["bg-amber-50 border-amber-200 text-amber-900", AlertTriangle, "text-amber-600"],
  red: ["bg-red-50 border-red-200 text-red-900", XCircle, "text-red-600"],
  slate: ["bg-slate-50 border-slate-200 text-slate-700", Clock, "text-slate-500"],
};

export const DrivePlacesStatus = () => {
  const [info, setInfo] = useState(undefined); // undefined = sto guardando, null = mai partito
  useEffect(() => {
    let alive = true;
    getDoc(doc(db, "artifacts", appId, "public", "data", "settings", "drive_places"))
      .then((s) => alive && setInfo(s.exists() ? s.data() : null))
      .catch(() => alive && setInfo(null));
    return () => {
      alive = false;
    };
  }, []);
  if (info === undefined) return null;
  const hs = driveHealth(info);
  const [cls, Icon, iconCls] = TONES[hs.tone];
  const num = (v) => typeof v === "number" || (typeof v === "string" && v !== "" && !Number.isNaN(Number(v)));
  const totals = [
    num(info && info.cartelleTotali) && ["Cartelle nel Drive", info.cartelleTotali],
    num(info && info.cartelleAbbinate) && ["Abbinate a un cliente", info.cartelleAbbinate],
    num(info && info.gruTotali) && ["Gru lette", info.gruTotali],
  ].filter(Boolean);
  const today = info && info.lastRun
    ? [
        num(info.lette) && `${info.lette} fogli letti (solo nuovi o cambiati)`,
        num(info.aggiornati) && `${info.aggiornati} paesi aggiornati`,
        num(info.gru) && `${info.gru} gru aggiornate`,
        num(info.durata) && `in ${Math.max(1, Math.round(Number(info.durata) / 60))} min`,
      ].filter(Boolean)
    : [];
  return (
    <div className={`rounded-2xl border p-4 space-y-2 ${cls}`} data-section="drive-places" data-drive-health={hs.tone}>
      <p className="font-black text-sm flex items-center gap-2">
        <Icon className={`w-5 h-5 shrink-0 ${iconCls}`} /> {hs.title}
      </p>
      <p className="text-xs leading-snug">{hs.text}</p>
      {info && info.lastRun && (
        <p className="text-xs">
          Ultimo giro: <b>{driveWhen(info.lastRun)}</b>
          {today.length > 0 && ` · ${today.join(" · ")}`}
        </p>
      )}
      {totals.length > 0 && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {totals.map(([l, v]) => (
            <div key={l} className="rounded-xl bg-white/70 px-2 py-1.5 min-w-0">
              <p className="text-[10px] font-bold opacity-70 leading-tight">{l}</p>
              <p className="text-base font-black">{v}</p>
            </div>
          ))}
        </div>
      )}
      {hs.problems.length > 0 && (
        <details className="text-xs" data-drive-problems>
          <summary className="cursor-pointer font-bold">Cosa non è andato ({hs.problems.length})</summary>
          <ul className="mt-1 space-y-0.5 list-disc pl-4">
            {hs.problems.map((p, i) => (
              <li key={i} className="break-words">
                {p}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};
