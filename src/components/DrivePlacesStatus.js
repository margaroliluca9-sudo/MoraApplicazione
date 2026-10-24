// AREA ADMIN → Clienti: com'è andato l'aggiornamento automatico di paesi e indirizzi dal Drive
// (lo fa ogni lunedì il programmino in apps-script/paesi-dal-drive.gs, che scrive l'esito in settings/drive_places).
import React, { useEffect, useState } from "react";
import { doc } from "firebase/firestore";
import { RefreshCw } from "lucide-react";
import { db, appId } from "../firebase";
import { getDoc } from "../metered";

export const driveWhen = (iso) => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
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
  return (
    <p className="mb-3 text-xs text-slate-500 flex items-center gap-1.5" data-section="drive-places">
      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
      {info && info.lastRun ? (
        <span>
          Paesi dal Drive: ultimo aggiornamento <b className="text-slate-700">{driveWhen(info.lastRun)}</b>
          {typeof info.aggiornati === "number" ? ` · ${info.aggiornati} ${info.aggiornati === 1 ? "cliente aggiornato" : "clienti aggiornati"}` : ""}
          {" · "}ogni lunedì da solo
        </span>
      ) : (
        <span>Aggiornamento automatico dei paesi dal Drive non ancora attivo (vedi Guida → Area admin).</span>
      )}
    </p>
  );
};
