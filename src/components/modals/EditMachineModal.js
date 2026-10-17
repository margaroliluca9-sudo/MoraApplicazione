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
import { describeError, getSafeMatricola } from "../../utils";
import {
  PRO_INPUT,
  PRO_BUTTON_SECONDARY,
  getButtonPrimaryClass,
  getProPanelClass,
} from "../../ui";

export const EditMachineModal = ({
  machine,
  customers,
  machineTypes,
  onClose,
  themeColor,
  allMachines,
}) => {
  const [data, setData] = useState({
    ...machine,
    matricola: getSafeMatricola(machine),
  });
  const [loading, setLoading] = useState(false);
  const color = themeColor || "blue";

  const handleSave = async () => {
    const newMatricola = data.matricola
      .toUpperCase()
      .replace(/\//g, "-")
      .trim();
    const newCustomer = data.customerName.toUpperCase().trim();

    if (
      allMachines.some(
        (m) =>
          m.id !== machine.id &&
          getSafeMatricola(m) === newMatricola &&
          m.customerName === newCustomer
      )
    ) {
      alert("Esiste già questa macchina per questo cliente!");
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);

      const machineRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "machines",
        machine.id
      );
      batch.update(machineRef, {
        matricola: newMatricola,
        customerName: newCustomer,
        type: data.type,
        capacity: data.capacity,
      });

      const oldMatricola = getSafeMatricola(machine);
      const qLogs = query(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "maintenance_logs"
        ),
        where("machineId", "==", oldMatricola),
        where("customer", "==", machine.customerName)
      );
      const logsSnap = await getDocs(qLogs);

      logsSnap.forEach((d) => {
        batch.update(d.ref, {
          machineId: newMatricola,
          customer: newCustomer,
          machineType: data.type,
          capacity: data.capacity,
        });
      });

      await batch.commit();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Errore durante il salvataggio: " + describeError(e));
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
          Modifica Gru
        </h3>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">
              Matricola
            </label>
            <input
              type="text"
              className={PRO_INPUT}
              value={data.matricola}
              onChange={(e) =>
                setData({ ...data, matricola: e.target.value.toUpperCase() })
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">
              Cliente
            </label>
            <select
              className={PRO_INPUT}
              value={data.customerName}
              onChange={(e) =>
                setData({ ...data, customerName: e.target.value.toUpperCase() })
              }
            >
              {customers.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">
              Tipo
            </label>
            <select
              className={PRO_INPUT}
              value={data.type || ""}
              onChange={(e) => setData({ ...data, type: e.target.value })}
            >
              <option value="">Seleziona...</option>
              {machineTypes.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
              {data.type && !machineTypes.some((t) => t.name === data.type) && (
                <option value={data.type}>{data.type}</option>
              )}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">
              Portata
            </label>
            <input
              type="text"
              className={PRO_INPUT}
              value={data.capacity || ""}
              onChange={(e) => setData({ ...data, capacity: e.target.value })}
            />
          </div>
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
