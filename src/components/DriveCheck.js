// AREA ADMIN → Drive → «Da controllare»: paragone tra quello che c'è sul Drive e quello che c'è nell'app,
// per le gru abbinate in modo dubbio (e per i clienti abbinati a una cartella con un nome diverso).
// «È giusta» non lo chiede più · «Non è giusta» la stacca · «Modifica» apre il cliente.
import React, { useState } from "react";
import { doc } from "firebase/firestore";
import { updateDoc } from "../tracked";
import { Check, X, Pencil, Loader2, HelpCircle } from "lucide-react";
import { db, appId } from "../firebase";
import { describeError, getSafeMatricola, formatCapacity } from "../utils";
import { withFix, kgOf, tipoCat, fabKey } from "../driveCranes";
import { clearDriveCache } from "./DriveCraneInfo";

export const saveCrane = async (row, data) => {
  await updateDoc(doc(db, "artifacts", appId, "public", "data", "drive_cranes", row.id), data);
  clearDriveCache();
  return { ...row, ...data };
};

const Cell = ({ v, bad }) => <td className={`px-2 py-1.5 align-top break-words ${bad ? "bg-amber-100 text-amber-900 font-bold" : "text-slate-700"}`}>{v || "—"}</td>;

// tabella «Sul Drive | Nell'app»
export const CompareTable = ({ row, m }) => {
  const r = withFix(row);
  const ka = kgOf(m && m.capacity);
  const kd = kgOf(r.portata);
  const ta = tipoCat(m && m.type);
  const td = tipoCat(r.tipo);
  const numBad = !!m && !!fabKey(getSafeMatricola(m)) && !!r.fabKey && fabKey(getSafeMatricola(m)) !== r.fabKey;
  return (
    <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden table-fixed" data-compare>
      <thead>
        <tr className="bg-slate-50 text-[11px] text-slate-500">
          <th className="px-2 py-1 text-left w-[28%]"></th>
          <th className="px-2 py-1 text-left">Sul Drive</th>
          <th className="px-2 py-1 text-left">Nell'app</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        <tr>
          <td className="px-2 py-1.5 text-slate-500 font-semibold">Numero</td>
          <Cell v={[r.fab, r.interno && `int. ${r.interno}`].filter(Boolean).join(" · ")} bad={numBad} />
          <Cell v={m ? getSafeMatricola(m) : ""} bad={numBad} />
        </tr>
        <tr>
          <td className="px-2 py-1.5 text-slate-500 font-semibold">Tipo</td>
          <Cell v={r.tipo} bad={!!td && !!ta && td !== ta} />
          <Cell v={m && m.type} bad={!!td && !!ta && td !== ta} />
        </tr>
        <tr>
          <td className="px-2 py-1.5 text-slate-500 font-semibold">Portata</td>
          <Cell v={kd ? `${kd} kg` : r.portata} bad={!!kd && !!ka && kd !== ka} />
          <Cell v={m && m.capacity && m.capacity !== "N.D." ? formatCapacity(m.capacity) : ""} bad={!!kd && !!ka && kd !== ka} />
        </tr>
      </tbody>
    </table>
  );
};

// un dubbio («doubt») o un suggerimento («suggestion»)
export const CheckCard = ({ kind, item, customerName, onSaved, onOpenCustomer, color = "blue" }) => {
  const { row, m } = item;
  const [busy, setBusy] = useState("");
  const act = async (what, data) => {
    setBusy(what);
    try {
      onSaved(await saveCrane(row, data));
    } catch (e) {
      console.error(e);
      alert("Salvataggio non riuscito: " + describeError(e));
      setBusy("");
    }
  };
  const btn = "h-9 px-3 rounded-full text-xs font-bold flex items-center gap-1 disabled:opacity-50";
  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-3 space-y-2" data-check={kind} data-check-row={row.id}>
      <div className="flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          {customerName && <p className="text-[11px] font-bold text-slate-500">{customerName}</p>}
          <p className="text-sm font-bold text-slate-800">
            {kind === "suggestion" ? `Sul Drive c'è la gru ${row.fab || "?"}, nell'app non trovo lo stesso numero. Forse è la ${getSafeMatricola(m)}?` : `La gru ${row.fab || "?"} del Drive è finita sulla ${getSafeMatricola(m)} dell'app: è giusto?`}
          </p>
          <p className="text-xs text-amber-800" data-check-why>
            {kind === "suggestion" ? item.why : item.reasons.join(" · ")}
          </p>
        </div>
      </div>
      <CompareTable row={row} m={m} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          data-action="check-yes"
          className={`${btn} bg-emerald-600 text-white`}
          onClick={() => act("yes", kind === "suggestion" ? { linkTo: getSafeMatricola(m), okFor: m.id } : { okFor: m.id })}
        >
          {busy === "yes" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {kind === "suggestion" ? "Sì, è questa" : "È giusta"}
        </button>
        <button
          type="button"
          disabled={!!busy}
          data-action="check-no"
          className={`${btn} bg-slate-100 text-slate-700`}
          onClick={() => act("no", kind === "suggestion" ? { noSugg: m.id } : { linkTo: "-", okFor: "" })}
        >
          {busy === "no" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />} {kind === "suggestion" ? "No" : "Non è giusta"}
        </button>
        {onOpenCustomer && (
          <button type="button" data-action="check-edit" className={`${btn} bg-slate-100 text-${color}-700`} onClick={onOpenCustomer}>
            <Pencil className="w-3.5 h-3.5" /> Modifica
          </button>
        )}
      </div>
    </div>
  );
};
