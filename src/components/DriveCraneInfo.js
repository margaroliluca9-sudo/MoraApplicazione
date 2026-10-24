// SCHEDA GRU: «Dall'ultima verifica» — stato di fune o catena, tipo, portata, paranco, matricola INAIL e anno,
// letti ogni mattina dai fogli di verifica nel Drive (vedi src/driveCranes.js). Se la gru non c'è, non mostra niente.
import React, { useEffect, useState } from "react";
import { collection, query, where } from "firebase/firestore";
import { FileText } from "lucide-react";
import { db, appId } from "../firebase";
import { getDocs } from "../metered";
import { findDriveCrane, statoTone } from "../driveCranes";

// una sola lettura per cliente finché l'app resta aperta
const cache = {};
const loadRows = (customerName) => {
  const k = String(customerName || "");
  if (!cache[k]) {
    cache[k] = getDocs(query(collection(db, "artifacts", appId, "public", "data", "drive_cranes"), where("customerName", "==", k)))
      .then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })))
      .catch((e) => {
        console.error(e);
        delete cache[k];
        return [];
      });
  }
  return cache[k];
};

const TONES = {
  red: "bg-red-50 border-red-200 text-red-800",
  amber: "bg-amber-50 border-amber-200 text-amber-900",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
  slate: "bg-slate-50 border-slate-200 text-slate-700",
};

export const DriveCraneInfo = ({ matricola, customerName }) => {
  const [row, setRow] = useState(null);
  useEffect(() => {
    let alive = true;
    setRow(null);
    loadRows(customerName).then((rows) => alive && setRow(findDriveCrane(rows, matricola, customerName)));
    return () => {
      alive = false;
    };
  }, [matricola, customerName]);
  if (!row) return null;
  const facts = [
    ["N. fabbrica", row.fab],
    ["Tipo", row.tipo],
    ["Portata", row.portata ? `${row.portata} kg` : ""],
    ["Paranco", row.paranco],
    ["Matricola INAIL", row.matricola],
    ["Anno", row.anno],
  ].filter(([, v]) => String(v || "").trim());
  return (
    <div className={`rounded-xl border px-3 py-2 ${TONES[statoTone(row.stato)]}`} data-section="drive-crane">
      <p className="text-[11px] font-bold flex items-center gap-1.5 opacity-80">
        <FileText className="w-3.5 h-3.5" /> Dall'ultima verifica{row.foglio ? ` (${row.foglio})` : ""}
      </p>
      {row.stato && (
        <p className="text-sm font-extrabold leading-snug mt-0.5" data-drive-stato>
          {row.stato}
        </p>
      )}
      {facts.length > 0 && (
        <p className="text-xs font-semibold mt-1 flex flex-wrap gap-x-3 gap-y-0.5 opacity-90">
          {facts.map(([l, v]) => (
            <span key={l}>
              {l}: <b>{v}</b>
            </span>
          ))}
        </p>
      )}
    </div>
  );
};
