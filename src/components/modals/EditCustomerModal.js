import React, { useState } from "react";
import {
  collection,
  doc,
  query,
  writeBatch,
  where,
  getDocs,
} from "firebase/firestore";
import { db, appId } from "../../firebase";
import { describeError } from "../../utils";
import {
  PRO_INPUT,
  PRO_BUTTON_SECONDARY,
  getButtonPrimaryClass,
  getProPanelClass,
} from "../../ui";

export const EditCustomerModal = ({
  customer,
  allCustomers,
  onClose,
  color = "blue",
}) => {
  const [name, setName] = useState(customer.name || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const cleanName = name.toUpperCase().trim();
    if (!cleanName) return;
    if (
      cleanName !== customer.name &&
      allCustomers.some((c) => c.name === cleanName)
    ) {
      alert("Esiste già un cliente con questo nome!");
      return;
    }
    setLoading(true);
    try {
      const batch = writeBatch(db);

      batch.update(
        doc(db, "artifacts", appId, "public", "data", "customers", customer.id),
        { name: cleanName }
      );

      const qLogs = query(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "maintenance_logs"
        ),
        where("customer", "==", customer.name)
      );
      const logsSnap = await getDocs(qLogs);
      logsSnap.forEach((d) => batch.update(d.ref, { customer: cleanName }));

      const qMachines = query(
        collection(db, "artifacts", appId, "public", "data", "machines"),
        where("customerName", "==", customer.name)
      );
      const machinesSnap = await getDocs(qMachines);
      machinesSnap.forEach((d) =>
        batch.update(d.ref, { customerName: cleanName })
      );

      await batch.commit();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Errore salvataggio cliente: " + describeError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
      <div
        className={`rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 ${getProPanelClass(
          color
        )}`}
      >
        <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider text-center">
          Modifica Cliente
        </h3>
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">
            Ragione Sociale
          </label>
          <input
            type="text"
            className={PRO_INPUT}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-xs uppercase shadow-md transition-all ${getButtonPrimaryClass(
              color
            )}`}
          >
            Salva
          </button>
          <button
            onClick={onClose}
            className={`w-full py-3 rounded-lg font-bold text-xs uppercase ${PRO_BUTTON_SECONDARY}`}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
