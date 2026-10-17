import React, { useState, useEffect, useMemo } from "react";
import {
  PlusCircle,
  Save,
  HardHat,
  Factory,
  User,
  X,
  Trash2,
  Lock,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  MinusCircle,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db, appId } from "../firebase";
import { DEFAULT_LAYOUT } from "../constants";
import {
  getTodayString,
  compressImage,
  describeError,
  getTechsString,
  getSafeMatricola,
  getSuggestedCapacities,
} from "../utils";
import { PRO_INPUT, getButtonPrimaryClass, getProPanelClass } from "../ui";
import { RopeFields } from "../components/RopeFields";
import {
  ROPE_ITEMS,
  emptyRope,
  autoTick,
  validateRopes,
  toSavedRope,
} from "../ropes";

export const NewEntryForm = ({
  user,
  customers,
  technicians,
  machineTypes,
  machines,
  onSuccess,
  isMobile,
  onTechUpdate,
  layoutConfig,
  allLogs,
}) => {
  const [formData, setFormData] = useState({
    technician: "",
    additionalTechnicians: [],
    customer: "",
    machineType: "",
    machineId: "",
    capacity: "",
    description: "",
    ticketNumber: "",
    photos: [],
    ropes: { fune: emptyRope(), catena: emptyRope() },
    dateString: getTodayString(), // Formato YYYY-MM-DD per l'input date
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [showMachineSuggestions, setShowMachineSuggestions] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [lastIntervention, setLastIntervention] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [formError, setFormError] = useState("");

  const color = layoutConfig?.themeColor || "blue";

  let formOrder = layoutConfig?.formOrder || DEFAULT_LAYOUT.formOrder;
  if (!formOrder.includes("ropes")) {
    // fune / catena sostituita: subito dopo la descrizione
    formOrder = [...formOrder];
    const dIdx = formOrder.indexOf("description");
    formOrder.splice(dIdx === -1 ? formOrder.length : dIdx + 1, 0, "ropes");
  }
  if (!formOrder.includes("photos")) {
    formOrder = [...formOrder];
    const descIdx = formOrder.indexOf("description");
    if (descIdx !== -1) formOrder.splice(descIdx + 1, 0, "photos");
    else formOrder.push("photos");
  }

  const topTechs = useMemo(() => {
    if (!allLogs) return [];
    const counts = {};
    allLogs.forEach((l) => {
      if (l.technician) counts[l.technician] = (counts[l.technician] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([name]) => name);
  }, [allLogs]);

  // Portate suggerite: le 7 più inserite negli interventi (completate con quelle standard)
  const suggestedCapacities = useMemo(
    () => getSuggestedCapacities(allLogs),
    [allLogs]
  );

  const sortedTechs = [...technicians].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const relatedMachines = useMemo(() => {
    if (!formData.customer) return [];
    const upperInput = formData.customer.toUpperCase();
    const exactCustomer = customers.find(
      (c) => c.name.toUpperCase() === upperInput
    );
    if (exactCustomer) {
      return machines.filter(
        (m) => m.customerName.toUpperCase() === upperInput
      );
    }
    return machines.filter((m) =>
      m.customerName.toUpperCase().includes(upperInput)
    );
  }, [formData.customer, customers, machines]);

  useEffect(() => {
    const saved = localStorage.getItem("mora_tech_last_name");
    if (saved) {
      setFormData((prev) => ({ ...prev, technician: saved }));
      setIsLocked(true);
    }
  }, []);

  const addTechnician = () =>
    setFormData((p) => ({
      ...p,
      additionalTechnicians: [...p.additionalTechnicians, ""],
    }));
  const updateAdditionalTech = (index, val) => {
    const newTechs = [...formData.additionalTechnicians];
    newTechs[index] = val;
    setFormData((p) => ({ ...p, additionalTechnicians: newTechs }));
  };
  const removeAdditionalTech = (index) => {
    const newTechs = [...formData.additionalTechnicians];
    newTechs.splice(index, 1);
    setFormData((p) => ({ ...p, additionalTechnicians: newTechs }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + formData.photos.length > 3) {
      alert("Puoi caricare un massimo di 3 foto in totale.");
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
      setFormData((p) => ({ ...p, photos: [...p.photos, ...newBase64Photos] }));
    } catch (err) {
      console.error(err);
      alert("Errore durante l'elaborazione delle immagini.");
    } finally {
      setUploadingPhotos(false);
      e.target.value = null; // Resetta l'input file per permettere di ricaricare lo stesso file
    }
  };

  const removePhoto = (indexToRemove) => {
    setFormData((p) => ({
      ...p,
      photos: p.photos.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleMachineIdChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/\//g, "-");

    if (val === "") {
      setFormData((p) => ({
        ...p,
        machineId: "",
        customer: "",
        machineType: "",
        capacity: "",
      }));
      setLastIntervention(null);
      setShowMachineSuggestions(false);
    } else {
      setFormData((p) => ({ ...p, machineId: val }));
      setShowMachineSuggestions(true);
    }
  };

  const handleCustomerChange = (e) => {
    const val = e.target.value.toUpperCase();

    if (val === "") {
      setFormData((p) => ({
        ...p,
        customer: "",
        machineId: "",
        machineType: "",
        capacity: "",
      }));
      setLastIntervention(null);
      setShowCustomerSuggestions(false);
    } else {
      setFormData((p) => ({ ...p, customer: val }));
      setShowCustomerSuggestions(true);
    }
  };

  useEffect(() => {
    if (formData.machineId && formData.customer && allLogs) {
      const mLogs = allLogs.filter(
        (l) =>
          l.machineId === formData.machineId && l.customer === formData.customer
      );
      setLastIntervention(mLogs.length > 0 ? mLogs[0] : null);

      const existingMachine = machines.find(
        (m) =>
          (m.matricola || m.id) === formData.machineId &&
          m.customerName === formData.customer
      );
      if (existingMachine && !formData.machineType) {
        setFormData((prev) => ({
          ...prev,
          machineType: existingMachine.type,
          capacity: existingMachine.capacity || "",
        }));
      }
    } else {
      setLastIntervention(null);
    }
  }, [formData.machineId, formData.customer, allLogs, machines]);

  const selectMachine = (m) => {
    const mat = getSafeMatricola(m);
    setFormData((p) => ({
      ...p,
      machineId: mat,
      customer: m.customerName,
      machineType: m.type,
      capacity: m.capacity,
    }));
    setShowMachineSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.technician ||
      !formData.customer ||
      !formData.description ||
      !formData.machineType ||
      (layoutConfig.formSettings.showCapacity && !formData.capacity)
    ) {
      setFormError(
        "Attenzione: Compila tutti i campi obbligatori (segnalati con l'asterisco rosso)."
      );
      setTimeout(() => setFormError(""), 5000);
      return;
    }
    // fune / catena sostituita: dati obbligatori (o "non disponibile" con motivo)
    const ropeError = validateRopes(formData.ropes);
    if (ropeError) {
      setFormError(ropeError);
      setTimeout(() => setFormError(""), 9000);
      return;
    }
    setFormError("");
    setIsSubmitting(true);
    try {
      if (onTechUpdate) onTechUpdate(formData.technician);
      localStorage.setItem("mora_tech_last_name", formData.technician);

      const cleanAdditionalTechs = formData.additionalTechnicians.filter(
        (t) => t.trim() !== ""
      );
      const cleanCustomer = formData.customer.toUpperCase().trim();
      const cleanMachineId = formData.machineId.toUpperCase().trim();

      // dati da salvare: niente stato interno del modulo, fune/catena solo se sostituite
      const { ropes, ...formDataToSave } = formData;
      for (const { id } of ROPE_ITEMS) {
        const saved = toSavedRope(ropes && ropes[id]);
        if (saved) formDataToSave[id] = saved;
      }

      // Formatta la data (da YYYY-MM-DD a DD/MM/YYYY)
      let finalDateString = new Date().toLocaleDateString("it-IT");
      if (formData.dateString) {
        const [y, m, d] = formData.dateString.split("-");
        finalDateString = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
      }

      await addDoc(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "maintenance_logs"
        ),
        {
          ...formDataToSave,
          additionalTechnicians: cleanAdditionalTechs,
          machineId: cleanMachineId,
          customer: cleanCustomer,
          dateString: finalDateString,
          userId: user.uid,
          createdAt: serverTimestamp(),
        }
      );

      const existingCustomer = customers.find((c) => c.name === cleanCustomer);
      if (!existingCustomer) {
        await addDoc(
          collection(db, "artifacts", appId, "public", "data", "customers"),
          { name: cleanCustomer }
        );
      }

      const existingMachine = machines.find(
        (m) =>
          getSafeMatricola(m) === cleanMachineId &&
          m.customerName === cleanCustomer
      );
      if (existingMachine) {
        await updateDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "machines",
            existingMachine.id
          ),
          {
            type: formData.machineType,
            capacity: formData.capacity,
          }
        );
      } else {
        await addDoc(
          collection(db, "artifacts", appId, "public", "data", "machines"),
          {
            matricola: cleanMachineId,
            customerName: cleanCustomer,
            type: formData.machineType,
            capacity: formData.capacity,
          }
        );
      }

      onSuccess();
      setIsLocked(true);
    } catch (e) {
      console.error(e);
      alert("Errore salvataggio: " + describeError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (key) => {
    switch (key) {
      case "technician":
        return (
          <div key="tech" className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                Tecnico Principale <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                {isLocked ? (
                  <div className="w-full p-3 bg-slate-100 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 flex justify-between items-center">
                    <span>{formData.technician}</span>
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                ) : (
                  <>
                    <select
                      className={PRO_INPUT}
                      value={formData.technician}
                      onChange={(e) =>
                        setFormData({ ...formData, technician: e.target.value })
                      }
                    >
                      <option value="">Seleziona...</option>
                      {sortedTechs.map((t) => (
                        <option key={t.id} value={t.name}>
                          {topTechs.includes(t.name) ? "⭐ " : ""}
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                  Hanno Lavorato Con Te?
                </label>
                <button
                  type="button"
                  onClick={addTechnician}
                  className={`text-[10px] font-bold flex items-center gap-1 text-${color}-600 hover:text-${color}-800 transition-colors`}
                >
                  <PlusCircle className="w-3 h-3" /> Aggiungi Tecnico
                </button>
              </div>
              <div className="space-y-2">
                {formData.additionalTechnicians.map((tech, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1"
                  >
                    <select
                      className={`${PRO_INPUT} py-2`}
                      value={tech}
                      onChange={(e) =>
                        updateAdditionalTech(idx, e.target.value)
                      }
                    >
                      <option value="">Seleziona un collega...</option>
                      {sortedTechs.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeAdditionalTech(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <MinusCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                {formData.additionalTechnicians.length === 0 && (
                  <p className="text-[10px] text-slate-400 italic">
                    Clicca "Aggiungi" se eravate in più di uno.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      case "machine":
        return (
          <div key="mach" className="grid grid-cols-2 gap-4">
            <div className="space-y-1 relative">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                Matricola/Campata
              </label>
              <div className="relative">
                <input
                  type="text"
                  className={PRO_INPUT}
                  value={formData.machineId}
                  onChange={handleMachineIdChange}
                  onFocus={() => setShowMachineSuggestions(true)}
                  onBlur={() =>
                    setTimeout(() => setShowMachineSuggestions(false), 200)
                  }
                  placeholder="Es. 01"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              {showMachineSuggestions && (
                <ul className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                  {machines
                    .filter((m) => {
                      const mat = getSafeMatricola(m);
                      const matchMat =
                        !formData.machineId ||
                        mat.includes(formData.machineId.toUpperCase());
                      const matchCust =
                        !formData.customer ||
                        m.customerName.toUpperCase() ===
                          formData.customer.toUpperCase();
                      return matchMat && matchCust;
                    })
                    .slice(0, 50)
                    .map((m) => (
                      <li
                        key={m.id}
                        onMouseDown={() => selectMachine(m)}
                        className="p-3 hover:bg-slate-50 cursor-pointer font-bold text-xs text-slate-700 border-b border-slate-50 flex justify-between items-center"
                      >
                        <span className="uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          {getSafeMatricola(m)}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate ml-2 text-right">
                          {m.customerName}
                        </span>
                      </li>
                    ))}
                  {formData.machineId && (
                    <li className="p-3 text-[10px] font-bold text-slate-500 bg-slate-50 text-center italic">
                      Scrivi "{formData.machineId}" e assicurati di aver
                      inserito il Cliente per salvarla.
                    </li>
                  )}
                </ul>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                className={PRO_INPUT}
                value={formData.machineType}
                onChange={(e) =>
                  setFormData({ ...formData, machineType: e.target.value })
                }
              >
                <option value="">Seleziona...</option>
                {machineTypes.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      case "customer":
        return (
          <div key="cust" className="space-y-1 relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Cliente <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                className={PRO_INPUT}
                value={formData.customer}
                onChange={handleCustomerChange}
                onFocus={() => setShowCustomerSuggestions(true)}
                onBlur={() =>
                  setTimeout(() => setShowCustomerSuggestions(false), 200)
                }
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            {showCustomerSuggestions && (
              <ul className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                {customers
                  .filter(
                    (c) =>
                      !formData.customer ||
                      c.name.includes(formData.customer.toUpperCase())
                  )
                  .map((c) => (
                    <li
                      key={c.id}
                      onMouseDown={() => {
                        setFormData({ ...formData, customer: c.name });
                        setShowCustomerSuggestions(false);
                      }}
                      className="p-3 hover:bg-slate-50 cursor-pointer font-bold text-xs uppercase text-slate-700 border-b border-slate-50"
                    >
                      {c.name}
                    </li>
                  ))}
                {customers.length === 0 && (
                  <li className="p-3 text-xs text-slate-400">
                    Nessun cliente trovato
                  </li>
                )}
              </ul>
            )}
            {relatedMachines.length > 0 && !formData.machineId && (
              <div className="mt-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase ml-1 mb-2 block">
                  Gru di {formData.customer}:
                </span>
                <div className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x">
                  {relatedMachines.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => selectMachine(m)}
                      className="snap-start flex flex-col items-start p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-500 hover:shadow-md transition-all group min-w-[120px] text-left"
                    >
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mb-2 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Factory className="w-4 h-4" />
                      </div>
                      <span className="font-black text-slate-700 text-xs block mb-0.5">
                        {getSafeMatricola(m)}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase truncate w-full block">
                        {m.type}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case "description":
        return (
          <div key="desc" className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Descrizione <span className="text-red-500">*</span>
            </label>
            <textarea
              rows="4"
              className={PRO_INPUT}
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                  ropes: autoTick(formData.ropes, e.target.value),
                })
              }
            />
          </div>
        );
      case "ropes":
        return (
          <RopeFields
            key="ropes"
            ropes={formData.ropes}
            onChange={(ropes) => setFormData((p) => ({ ...p, ropes }))}
          />
        );
      case "photos":
        return (
          <div
            key="photos"
            className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200"
          >
            <div className="flex justify-between items-center">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-slate-400" /> Allega Foto
                  (Opzionale)
                </label>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Max 3 foto. Verranno ottimizzate automaticamente.
                </p>
              </div>
              <label
                className={`cursor-pointer px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-2 hover:bg-slate-100 transition-all ${
                  formData.photos.length >= 3
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                <ImageIcon className="w-3 h-3" /> Scegli
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={formData.photos.length >= 3 || uploadingPhotos}
                />
              </label>
            </div>

            {uploadingPhotos && (
              <div className="flex items-center gap-2 text-[10px] text-blue-600 font-bold animate-pulse mt-2">
                <RefreshCw className="w-3 h-3 animate-spin" /> Elaborazione
                immagini in corso...
              </div>
            )}

            {formData.photos.length > 0 && (
              <div className="flex gap-3 overflow-x-auto pt-2 pb-1 snap-x">
                {formData.photos.map((photoStr, idx) => (
                  <div
                    key={idx}
                    className="relative shrink-0 snap-center group"
                  >
                    <img
                      src={photoStr}
                      className="w-20 h-20 object-cover rounded-xl border-2 border-white shadow-md"
                      alt="Anteprima"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 hover:scale-110 transition-all"
                      title="Rimuovi foto"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case "capacity":
        const commonCapacities = suggestedCapacities;
        return layoutConfig.formSettings.showCapacity ? (
          <div key="cap" className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Portata in Kilogrammi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={PRO_INPUT}
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: e.target.value })
              }
              placeholder="Es. 2000 kg"
            />
            <div className="flex flex-wrap gap-1.5 mt-1">
              {commonCapacities.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setFormData({ ...formData, capacity: cap })}
                  className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all active:scale-95 ${
                    formData.capacity === cap
                      ? "bg-" +
                        color +
                        "-100 border-" +
                        color +
                        "-400 text-" +
                        color +
                        "-700 shadow-sm"
                      : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {cap}
                </button>
              ))}
            </div>
          </div>
        ) : null;
      case "date":
        return (
          <div key="date" className="space-y-1 relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Data Intervento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className={PRO_INPUT}
              value={formData.dateString}
              max={getTodayString()}
              onChange={(e) =>
                setFormData({ ...formData, dateString: e.target.value })
              }
            />
          </div>
        );
      case "ticketNumber":
        return (
          <div key="ticketNumber" className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Numero Assistenza (Opzionale)
            </label>
            <input
              type="text"
              className={PRO_INPUT}
              value={formData.ticketNumber}
              onChange={(e) =>
                setFormData({ ...formData, ticketNumber: e.target.value })
              }
              placeholder="Es. #12345"
            />
          </div>
        );
      case "custom":
        return layoutConfig.customFields?.length > 0 ? (
          <div
            key="custom"
            className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 mt-2"
          >
            {layoutConfig.customFields.map((f, i) => (
              <div key={i} className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                  {f.label}
                </label>
                <input
                  type={f.type || "text"}
                  className={PRO_INPUT}
                  placeholder={f.label}
                />
              </div>
            ))}
          </div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div
      className={`overflow-hidden animate-in slide-in-from-bottom-6 duration-500 ${getProPanelClass(
        color
      )}`}
    >
      <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h2 className="font-black text-slate-800 text-lg uppercase tracking-tight">
          Nuovo Rapporto
        </h2>
        <div
          className={`bg-${color}-600 text-white p-2.5 rounded-xl shadow-md`}
        >
          <HardHat className="w-5 h-5" />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {formOrder.map((key) => renderField(key))}
        {lastIntervention && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-in fade-in slide-in-from-top-2 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide">
                Ultimo Intervento ({lastIntervention.dateString})
              </h4>
            </div>
            <p className="text-sm text-amber-900 italic leading-relaxed whitespace-pre-wrap break-words">
              "{lastIntervention.description}"
            </p>
            <div className="text-[10px] text-amber-700 mt-2 font-bold text-right uppercase tracking-wider">
              - {getTechsString(lastIntervention)}
            </div>
          </div>
        )}

        {formError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-200 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <AlertTriangle className="w-5 h-5 shrink-0" /> {formError}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            title="Svuota Modulo"
            className="p-4 rounded-xl text-slate-400 bg-slate-100 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            type="submit"
            disabled={isSubmitting || uploadingPhotos}
            className={`flex-1 py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${getButtonPrimaryClass(
              color
            )}`}
          >
            {isSubmitting ? (
              <RefreshCw className="animate-spin w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}{" "}
            Salva
          </button>
        </div>
      </form>

      {showClearConfirm && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="p-6 max-w-xs w-full text-center space-y-5 bg-white rounded-xl shadow-xl border-t-4 border-t-red-500 animate-in zoom-in-95">
            <div className="p-3 bg-red-100 text-red-600 rounded-full w-fit mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-black text-slate-800 uppercase text-sm">
                Svuotare il modulo?
              </h4>
              <p className="text-xs text-slate-500 mt-2">
                I dati inseriti non sono stati salvati e andranno persi.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormData((p) => ({
                    ...p,
                    customer: "",
                    machineId: "",
                    machineType: "",
                    capacity: "",
                    description: "",
                    ticketNumber: "",
                    photos: [],
                    ropes: { fune: emptyRope(), catena: emptyRope() },
                    dateString: getTodayString(),
                  }));
                  setLastIntervention(null);
                  setShowClearConfirm(false);
                }}
                className="py-3 bg-red-600 text-white rounded-lg font-bold text-xs uppercase shadow-md hover:bg-red-700 active:scale-95 transition-all"
              >
                Svuota
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-3 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs uppercase hover:bg-slate-200 active:scale-95 transition-all"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
