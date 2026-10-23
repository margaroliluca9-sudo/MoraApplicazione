import React, { useEffect, useState } from "react";
import {
  PlusCircle,
  X,
  RefreshCw,
  MinusCircle,
  Camera,
} from "lucide-react";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { isPhotoRef, putPhotos, resolvePhotos } from "../../logPhotos";
import { db, appId } from "../../firebase";
import { DEFAULT_LAYOUT } from "../../constants";
import { compressImage, describeError } from "../../utils";
import { PRO_INPUT, getButtonPrimaryClass, getProPanelClass } from "../../ui";

// --- MODALI DATI ---
import { RopeFields } from "../RopeFields";
import {
  ROPE_ITEMS,
  autoTick,
  validateRopes,
  toSavedRope,
  fromSavedRope,
} from "../../ropes";

export const EditLogModal = ({
  log,
  customers,
  technicians,
  machineTypes,
  onClose,
  color = "blue",
  layoutConfig,
}) => {
  const [data, setData] = useState({
    ...log,
    additionalTechnicians: log.additionalTechnicians || [],
    photos: log.photos || [],
    ropes: { fune: fromSavedRope(log.fune), catena: fromSavedRope(log.catena) },
  });
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  // foto tenute a parte: le scarico prima di poterle cambiare
  const hadRefs = (log.photos || []).some(isPhotoRef);
  const [photoState, setPhotoState] = useState(hadRefs ? "loading" : "ready");
  useEffect(() => {
    if (!hadRefs) return undefined;
    let alive = true;
    resolvePhotos(log.photos)
      .then((r) => {
        if (!alive) return;
        setData((p) => ({ ...p, photos: r }));
        setPhotoState("ready");
      })
      .catch(() => alive && setPhotoState("failed"));
    return () => {
      alive = false;
    };
  }, [hadRefs, log.photos]);
  const customFields = layoutConfig?.customFields || [];
  const formSettings =
    layoutConfig?.formSettings || DEFAULT_LAYOUT.formSettings;

  const sortedTechs = [...technicians].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const addTechnician = () =>
    setData((p) => ({
      ...p,
      additionalTechnicians: [...p.additionalTechnicians, ""],
    }));
  const updateAdditionalTech = (index, val) => {
    const newTechs = [...data.additionalTechnicians];
    newTechs[index] = val;
    setData((p) => ({ ...p, additionalTechnicians: newTechs }));
  };
  const removeAdditionalTech = (index) => {
    const newTechs = [...data.additionalTechnicians];
    newTechs.splice(index, 1);
    setData((p) => ({ ...p, additionalTechnicians: newTechs }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + data.photos.length > 3) {
      alert("Puoi caricare un massimo di 3 foto in totale per intervento.");
      return;
    }
    setUploadingPhotos(true);
    try {
      const newBase64Photos = [];
      for (let file of files) {
        if (!file.type.startsWith("image/")) continue;
        const base64 = await compressImage(file);
        newBase64Photos.push(base64);
      }
      setData((p) => ({ ...p, photos: [...p.photos, ...newBase64Photos] }));
    } catch (err) {
      console.error(err);
      alert("Errore durante l'elaborazione delle immagini.");
    } finally {
      setUploadingPhotos(false);
      e.target.value = null; // reset per ricaricare lo stesso file
    }
  };

  const removePhoto = (indexToRemove) => {
    setData((p) => ({
      ...p,
      photos: p.photos.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleSave = async () => {
    const ropeError = validateRopes(data.ropes);
    if (ropeError) return alert(ropeError);
    setLoading(true);
    try {
      // fune/catena: dati salvati, oppure null se tolti
      const { ropes, ...dataToSave } = data;
      for (const { id } of ROPE_ITEMS) dataToSave[id] = toSavedRope(ropes[id]);
      const cleanAdditionalTechs = data.additionalTechnicians.filter(
        (t) => t.trim() !== ""
      );
      const newMachineId = data.machineId
        .toUpperCase()
        .replace(/\//g, "-")
        .trim();

      const logRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "maintenance_logs",
        log.id
      );
      const { photos: _photos, id: _id, ...rest } = dataToSave;
      const upd = {
          ...rest,
          technician: data.technician,
          additionalTechnicians: cleanAdditionalTechs,
          customer: data.customer.toUpperCase(),
          machineId: newMachineId,
          machineType: data.machineType,
          capacity: data.capacity,
          description: data.description,
          dateString: data.dateString,
          ticketNumber: data.ticketNumber || "",
        };
      const hasSeparate = hadRefs || Number(log.photoCount) > 0;
      if (photoState === "ready" && !data.photos.length && !hasSeparate) {
        // nessuna foto, né prima né ora
        await updateDoc(logRef, { ...upd, photos: [] });
      } else if (photoState === "ready") {
        // foto a parte (logPhotos.js): rapporto e foto cambiano insieme
        const batch = writeBatch(db);
        batch.update(logRef, { ...upd, ...putPhotos(batch, log.id, data.photos) });
        await batch.commit();
      } else {
        // foto non scaricate (senza rete): restano come sono
        await updateDoc(logRef, upd);
      }
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
        className={`w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] ${getProPanelClass(
          color
        )}`}
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h3 className="font-black text-slate-800 tracking-tight text-lg">
              Modifica Intervento
            </h3>
            <p className="text-xs text-slate-400 font-bold">
              {log.id.substring(0, 8)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto bg-slate-50/50 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                Tecnico Principale
              </label>
              <select
                className={PRO_INPUT}
                value={data.technician}
                onChange={(e) =>
                  setData({ ...data, technician: e.target.value })
                }
              >
                {sortedTechs.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                Data (DD/MM/YYYY)
              </label>
              <input
                type="text"
                className={PRO_INPUT}
                value={data.dateString}
                onChange={(e) =>
                  setData({ ...data, dateString: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2 bg-slate-100 p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                Tecnici Aggiuntivi
              </label>
              <button
                type="button"
                onClick={addTechnician}
                className={`text-[10px] font-bold flex items-center gap-1 text-${color}-600 hover:text-${color}-800`}
              >
                <PlusCircle className="w-3 h-3" /> Aggiungi
              </button>
            </div>
            {data.additionalTechnicians.map((tech, idx) => (
              <div
                key={idx}
                className="flex gap-2 items-center animate-in fade-in"
              >
                <select
                  className={`${PRO_INPUT} py-2`}
                  value={tech}
                  onChange={(e) => updateAdditionalTech(idx, e.target.value)}
                >
                  <option value="">Seleziona...</option>
                  {sortedTechs.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeAdditionalTech(idx)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <MinusCircle className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Numero Assistenza (Opzionale)
            </label>
            <input
              type="text"
              className={PRO_INPUT}
              value={data.ticketNumber || ""}
              onChange={(e) =>
                setData({ ...data, ticketNumber: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Cliente
            </label>
            <select
              className={PRO_INPUT}
              value={data.customer}
              onChange={(e) =>
                setData({ ...data, customer: e.target.value.toUpperCase() })
              }
            >
              {customers.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {formSettings.showMachineId && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                  Matricola
                </label>
                <input
                  type="text"
                  className={PRO_INPUT}
                  value={data.machineId}
                  onChange={(e) =>
                    setData({
                      ...data,
                      machineId: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
            )}
            {formSettings.showMachineType && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                  Tipo
                </label>
                <select
                  className={PRO_INPUT}
                  value={data.machineType || ""}
                  onChange={(e) =>
                    setData({ ...data, machineType: e.target.value })
                  }
                >
                  <option value="">Seleziona...</option>
                  {machineTypes.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                  {data.machineType &&
                    !machineTypes.some((t) => t.name === data.machineType) && (
                      <option value={data.machineType}>
                        {data.machineType}
                      </option>
                    )}
                </select>
              </div>
            )}
            {formSettings.showCapacity && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                  Portata
                </label>
                <input
                  type="text"
                  className={PRO_INPUT}
                  value={data.capacity}
                  onChange={(e) =>
                    setData({ ...data, capacity: e.target.value })
                  }
                />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Descrizione
            </label>
            <textarea
              rows="4"
              className={PRO_INPUT}
              value={data.description}
              onChange={(e) =>
                setData({
                  ...data,
                  description: e.target.value,
                  ropes: autoTick(data.ropes, e.target.value),
                })
              }
            />
          </div>

          <RopeFields
            ropes={data.ropes}
            onChange={(ropes) => setData((p) => ({ ...p, ropes }))}
          />

          <div className="space-y-2 bg-slate-100 p-3 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-1">
                <Camera className="w-3 h-3" /> Foto Allegate
              </label>
              <label
                className={`text-[10px] font-bold flex items-center gap-1 text-${color}-600 hover:text-${color}-800 cursor-pointer ${
                  data.photos.length >= 3 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <PlusCircle className="w-3 h-3" /> Aggiungi
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={data.photos.length >= 3 || uploadingPhotos || photoState !== "ready"}
                />
              </label>
            </div>

            {uploadingPhotos && (
              <div className="text-[10px] text-blue-600 font-bold animate-pulse flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Elaborazione in
                corso...
              </div>
            )}

            {photoState === "loading" && (
              <div className="text-[10px] text-blue-600 font-bold animate-pulse flex items-center gap-1" data-photo-state="loading">
                <RefreshCw className="w-3 h-3 animate-spin" /> Carico le foto...
              </div>
            )}
            {photoState === "failed" && (
              <p className="text-[11px] text-slate-500" data-photo-state="failed">
                Senza rete non posso mostrare le foto: restano come sono.
              </p>
            )}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {photoState === "ready" && data.photos.map((photoStr, idx) => (
                <div key={idx} className="relative shrink-0 group">
                  <img
                    src={photoStr}
                    className="w-16 h-16 object-cover rounded-xl border-2 border-white shadow-sm"
                    alt="Anteprima"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photoState === "ready" && data.photos.length === 0 && !uploadingPhotos && (
                <p className="text-[10px] text-slate-400 italic">
                  Nessuna foto allegata.
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 bg-white">
          <button
            onClick={handleSave}
            disabled={loading || uploadingPhotos || photoState === "loading"}
            className={`w-full py-4 rounded-lg font-bold text-xs transition-all ${getButtonPrimaryClass(
              color
            )}`}
          >
            {loading ? "Salvataggio..." : "Salva Modifiche"}
          </button>
        </div>
      </div>
    </div>
  );
};
