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
  CheckCircle2,
  Printer,
  History as HistoryIcon,
  RotateCcw,
  Users,
  MapPin,
  Wrench,
  ClipboardList,
  Check,
  Hand,
} from "lucide-react";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { newLogId, putPhotos } from "../logPhotos";
import { TicketTwins } from "../components/TicketTwins";
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
import { getButtonPrimaryClass, getProPanelClass } from "../ui";
import { RopeFields } from "../components/RopeFields";

// stile del Nuovo rapporto: campi alti (dita e guanti), angoli morbidi
const F_INPUT =
  "w-full min-w-0 min-h-[48px] px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400";
const F_LABEL = "text-[13px] font-bold text-slate-600 ml-1";
// i campi raggruppati in schede numerate
const GROUP_OF = { technician: "chi", date: "chi", ticketNumber: "chi", customer: "dove", machine: "dove", capacity: "dove", description: "cosa", ropes: "cosa", photos: "foto", custom: "altro" };
const GROUPS = {
  chi: { title: "Chi e quando", icon: Users },
  dove: { title: "Cliente e gru", icon: MapPin },
  cosa: { title: "Cosa hai fatto", icon: Wrench },
  foto: { title: "Foto", icon: Camera, optional: true },
  altro: { title: "Altri dati", icon: ClipboardList, optional: true },
};
import { AssistantPanel } from "../components/AssistantPanel";
import { logsOfMachine, findSameMatricola, normalizeMatricola } from "../assistant";
import {
  ROPE_ITEMS,
  emptyRope,
  autoTick,
  validateRopes,
  toSavedRope,
  detectReplacements,
} from "../ropes";
import { vanOf, applyReport, findUsedParts, itemsOf } from "../van";
import { showVanUsage } from "../components/VanHost";
import { loadDraft, saveDraft, clearDraft, draftWhen } from "../reportHelpers";
import { printIntervention } from "../components/PrintLogButton";
import { buzzSaved, buzzError, getSettings, setSetting } from "../settings";

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
  vans = [],
  vanItems = [],
  // PROVA (dalla Guida): si compila tutto ma non si salva niente
  practice = false,
  onPractice = () => {},
  // dalla scheda della gru: cliente e gru già scritti
  prefill = null,
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
    ...(prefill || {}),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const [showMachineSuggestions, setShowMachineSuggestions] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [lastIntervention, setLastIntervention] = useState(null);
  const [isLocked, setIsLocked] = useState(false);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  // BOZZA: il rapporto si salva da solo sul telefono finché non lo invii
  const [pendingDraft, setPendingDraft] = useState(() => (practice || prefill ? null : loadDraft()));
  // dopo "Salva": riepilogo con "Altra gru, stesso cliente", "Stampa", "Vai allo Storico"
  const [savedLog, setSavedLog] = useState(null);
  // dopo il salvataggio: il riepilogo resta 3 secondi, poi si va da soli allo Storico
  // (toccando un pulsante del riepilogo si resta qui)
  const [autoGo, setAutoGo] = useState(false);
  useEffect(() => {
    if (!savedLog || practice) return undefined;
    setAutoGo(true);
    const t = setTimeout(() => onSuccess && onSuccess(), 3000);
    const stop = () => {
      clearTimeout(t);
      setAutoGo(false);
    };
    window.addEventListener("mora-stay", stop);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mora-stay", stop);
    };
  }, [savedLog, practice, onSuccess]);
  const stay = () => window.dispatchEvent(new Event("mora-stay"));
  useEffect(() => {
    if (practice || pendingDraft || savedLog) return undefined;
    if (!formData.customer && !formData.description) return undefined;
    const t = setTimeout(() => saveDraft(formData), 600);
    return () => clearTimeout(t);
  }, [formData, practice, pendingDraft, savedLog]);
  const [formError, setFormError] = useState("");
  // TASTI GRANDI «con i guanti»: campi e pulsanti più grandi (La mia area → ⚙ Impostazioni, o il tasto 🖐 qui in alto)
  const [gloves, setGloves] = useState(() => getSettings().gloves === true);
  useEffect(() => {
    const on = (ev) => setGloves(!!(ev.detail && ev.detail.gloves === true));
    window.addEventListener("mora-settings", on);
    return () => window.removeEventListener("mora-settings", on);
  }, []);

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

  // assistente: interventi della gru scelta e matricola scritta in modo diverso
  const assistantLogs = useMemo(
    () => logsOfMachine(allLogs, formData.machineId, formData.customer),
    [allLogs, formData.machineId, formData.customer]
  );
  const sameMatricola = useMemo(() => {
    const typed = String(formData.machineId || "").trim().toUpperCase();
    const cust = String(formData.customer || "").trim().toUpperCase();
    const exact = (machines || []).some(
      (m) =>
        getSafeMatricola(m) === typed &&
        String(m.customerName || "").trim().toUpperCase() === cust
    );
    return exact ? null : findSameMatricola(machines, typed, cust);
  }, [machines, formData.machineId, formData.customer]);

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
    if (practice) {
      const { ropes } = formData;
      const van = vanOf(vans, formData.technician);
      onPractice({
        technician: formData.technician,
        others: formData.additionalTechnicians.filter((t) => t.trim() !== ""),
        customer: formData.customer.toUpperCase().trim(),
        machineId: formData.machineId.toUpperCase().trim(),
        machineType: formData.machineType,
        description: formData.description,
        photos: formData.photos.length,
        fune: toSavedRope(ropes && ropes.fune),
        catena: toSavedRope(ropes && ropes.catena),
        newCustomer: !customers.find((c) => c.name === formData.customer.toUpperCase().trim()),
        van: van ? van.name : "",
        parts: van ? findUsedParts(formData.description, itemsOf(vanItems, van.id)).map((u) => ({ name: u.item.name, qty: u.qty, unit: u.item.unit || "pz", unknown: u.unknown })) : [],
      });
      return;
    }
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

      const logData = {
        ...formDataToSave,
        additionalTechnicians: cleanAdditionalTechs,
        machineId: cleanMachineId,
        customer: cleanCustomer,
        dateString: finalDateString,
        userId: user.uid,
      };
      // le foto vanno a parte (logPhotos.js): rapporto e foto si salvano insieme
      let logRef;
      if (logData.photos && logData.photos.length) {
        const id = newLogId();
        const batch = writeBatch(db);
        const photoFields = putPhotos(batch, id, logData.photos);
        logRef = doc(db, "artifacts", appId, "public", "data", "maintenance_logs", id);
        batch.set(logRef, { ...logData, ...photoFields, createdAt: Timestamp.now() });
        await batch.commit();
      } else {
        logRef = await addDoc(
          collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "maintenance_logs"
          ),
          // ora del telefono (non del server): così si vede subito anche senza rete
          { ...logData, createdAt: Timestamp.now() }
        );
      }
      clearDraft();

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

      // MAGAZZINO FURGONE: solo chi ha un furgone assegnato; gli altri non vedono niente
      const van = vanOf(vans, formData.technician);
      if (van) {
        const ropes = detectReplacements(formData.description);
        const ditta = [ropes.fune && "Fune", ropes.catena && "Catena"].filter(Boolean).join(" e ");
        const note = `${cleanCustomer} · ${cleanMachineId}${formData.ticketNumber ? ` (N. ${formData.ticketNumber})` : ""}`;
        applyReport({
          van,
          items: vanItems,
          description: formData.description,
          logId: logRef && logRef.id,
          author: formData.technician,
          note,
        })
          .then((used) => {
            if (used.length) showVanUsage({ van, used, logId: logRef && logRef.id, author: formData.technician, note, ditta });
          })
          .catch((err) => console.error("Magazzino furgone:", err));
      }

      // riepilogo invece di andare subito allo Storico
      setSavedLog({ ...logData, id: logRef && logRef.id });
      buzzSaved();
      setIsLocked(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      console.error(e);
      buzzError();
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
              <label className={F_LABEL}>
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
                      className={F_INPUT}
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
              <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
                <label className="whitespace-nowrap text-sm font-black text-slate-700 ml-1">
                  Hanno lavorato con te?
                </label>
                <button
                  type="button"
                  onClick={addTechnician}
                  className={`shrink-0 whitespace-nowrap min-h-[36px] px-2.5 rounded-xl bg-white border border-${color}-200 text-xs font-bold flex items-center gap-1 text-${color}-700 hover:bg-${color}-50 transition-colors`}
                >
                  <PlusCircle className="w-4 h-4" /> Aggiungi Tecnico
                </button>
              </div>
              <div className="space-y-2">
                {formData.additionalTechnicians.map((tech, idx) => (
                  <div
                    key={idx}
                    className="flex gap-2 items-center animate-in fade-in slide-in-from-top-1"
                  >
                    <select
                      className={`${F_INPUT} h-11`}
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
              <label className={F_LABEL}>
                Matricola/Campata
              </label>
              <div className="relative">
                <input
                  type="text"
                  className={F_INPUT}
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
                      // trova anche le matricole scritte in modo diverso ("m 100" -> M-100)
                      const matchMat =
                        !formData.machineId ||
                        mat.includes(formData.machineId.toUpperCase()) ||
                        (normalizeMatricola(formData.machineId) !== "" &&
                          normalizeMatricola(mat).includes(
                            normalizeMatricola(formData.machineId)
                          ));
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
              <label className={F_LABEL}>
                Tipo <span className="text-red-500">*</span>
              </label>
              <select
                className={F_INPUT}
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
            <label className={F_LABEL}>
              Cliente <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                className={F_INPUT}
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
                      className="p-3 hover:bg-slate-50 cursor-pointer font-bold text-xs text-slate-700 border-b border-slate-50"
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
            <label className={F_LABEL}>
              Descrizione <span className="text-red-500">*</span>
            </label>
            <textarea
              rows="4"
              className={F_INPUT}
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
          <div key="photos" className="space-y-2">
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <p className="text-xs text-slate-500 font-semibold">Fino a 3 foto, dalla fotocamera o dalla galleria.</p>
              <div className="flex gap-2">
                {[
                  ["camera", Camera, "Scatta", { capture: "environment" }],
                  ["gallery", ImageIcon, "Galleria", { multiple: true }],
                ].map(([id, Icon, label, extra]) => (
                  <label
                    key={id}
                    data-action={"photo-" + id}
                    className={`cursor-pointer h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-100 transition-all ${
                      formData.photos.length >= 3 ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {label}
                    <input
                      type="file"
                      accept="image/*"
                      {...extra}
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={formData.photos.length >= 3 || uploadingPhotos}
                    />
                  </label>
                ))}
              </div>
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
                      className="w-24 h-24 object-cover rounded-2xl border-2 border-white shadow-md"
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
        // in ordine di utilizzo (le più usate prima), si aggiornano con ogni rapporto
        const commonCapacities = suggestedCapacities;
        return layoutConfig.formSettings.showCapacity ? (
          <div key="cap" className="space-y-2">
            <label className={F_LABEL}>
              Portata in Kilogrammi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={F_INPUT}
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: e.target.value })
              }
              placeholder="Es. 2000 kg"
            />
            <div className="flex flex-wrap gap-2 mt-1" data-section="capacity-chips">
              {commonCapacities.map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => setFormData({ ...formData, capacity: cap })}
                  className={`h-10 px-3.5 text-sm font-bold rounded-full border transition-all active:scale-95 ${
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
            <label className={F_LABEL}>
              Data Intervento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className={`${F_INPUT} mora-date`}
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
            <label className={F_LABEL}>
              Numero Assistenza (Opzionale)
            </label>
            <input
              type="text"
              className={F_INPUT}
              value={formData.ticketNumber}
              onChange={(e) =>
                setFormData({ ...formData, ticketNumber: e.target.value })
              }
              placeholder="Es. #12345"
            />
            <TicketTwins logs={allLogs} ticketNumber={formData.ticketNumber} year={String(formData.dateString || "").slice(0, 4)} />
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
                <label className={F_LABEL}>
                  {f.label}
                </label>
                <input
                  type={f.type || "text"}
                  className={F_INPUT}
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

  // schede: campi consecutivi dello stesso gruppo (l'ordine lo decide l'admin)
  const groupsInOrder = [];
  formOrder.forEach((k) => {
    const g = GROUP_OF[k] || "altro";
    if (k === "custom" && !(layoutConfig.customFields || []).length) return;
    if (k === "capacity" && !layoutConfig.formSettings.showCapacity) return;
    const last = groupsInOrder[groupsInOrder.length - 1];
    if (last && last.g === g) last.keys.push(k);
    else groupsInOrder.push({ g, keys: [k] });
  });
  const done = {
    chi: !!formData.technician && !!formData.dateString,
    dove: !!formData.customer && !!formData.machineType && (!layoutConfig.formSettings.showCapacity || !!String(formData.capacity || "").trim()),
    cosa: !!String(formData.description || "").trim(),
    foto: formData.photos.length > 0,
    altro: false,
  };
  const stepKeys = [...new Set(groupsInOrder.map((x) => x.g))].filter((g) => g !== "altro");

  return (
    <div
      className={`overflow-clip animate-in slide-in-from-bottom-6 duration-500 ${getProPanelClass(
        color
      )}${gloves ? " mora-gloves" : ""}`}
      data-gloves={gloves ? "1" : "0"}
    >
      <div className={`px-6 pt-5 pb-4 bg-gradient-to-br from-${color}-600 to-${color}-800 text-white`} data-section="report-head">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h2 className="font-black text-2xl leading-tight">Nuovo rapporto</h2>
            <p className="text-sm font-semibold text-white/80 truncate">
              {[formData.technician, formData.customer, formData.machineId && "gru " + formData.machineId].filter(Boolean).join(" · ") || "Compila le schede qui sotto"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              data-action="gloves"
              aria-pressed={gloves}
              title={gloves ? "Tasti grandi accesi: tocca per tornare normale" : "Tasti grandi (con i guanti)"}
              onClick={() => setSetting("gloves", !gloves)}
              className={`h-11 px-3 rounded-2xl flex items-center gap-1.5 text-sm font-black transition-colors ${gloves ? "bg-white text-slate-800" : "bg-white/15 text-white"}`}
            >
              <Hand className="w-5 h-5" /> {gloves ? "Grandi" : "Guanti"}
            </button>
            <div className="bg-white/15 p-2.5 rounded-2xl">
              <HardHat className="w-6 h-6" />
            </div>
          </div>
        </div>
        {!savedLog && (
          <div className="flex gap-1.5 mt-4" data-section="report-progress">
            {stepKeys.map((g) => (
              <div key={g} className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full" style={{ backgroundColor: done[g] ? "#ffffff" : "rgba(255,255,255,.25)" }} />
                <p className={`text-[10px] mora-keep-size font-bold mt-1 truncate ${done[g] ? "text-white" : "text-white/60"}`}>{GROUPS[g].title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      {pendingDraft && (
        <div className="mx-6 mt-5 p-4 rounded-2xl border-2 border-amber-300 bg-amber-50 space-y-3" data-section="draft-banner">
          <p className="text-sm font-black text-amber-900">Hai un rapporto non finito</p>
          <p className="text-xs font-semibold text-amber-800">
            {[pendingDraft.data.customer, pendingDraft.data.machineId].filter(Boolean).join(" · ") || "Senza cliente"} · {draftWhen(pendingDraft.savedAt)}
            {pendingDraft.data.description ? ` · «${String(pendingDraft.data.description).slice(0, 60)}${pendingDraft.data.description.length > 60 ? "…" : ""}»` : ""}
          </p>
          <div className="flex gap-2">
            <button type="button" data-action="draft-resume" onClick={() => { setFormData((p) => ({ ...p, ...pendingDraft.data })); setPendingDraft(null); }}
              className={`flex-1 h-11 rounded-xl bg-${color}-600 text-white font-black text-sm`}>
              Riprendi
            </button>
            <button type="button" data-action="draft-discard" onClick={() => { clearDraft(); setPendingDraft(null); }}
              className="h-11 px-4 rounded-xl border border-amber-300 bg-white text-amber-900 font-bold text-sm">
              Scarta
            </button>
          </div>
        </div>
      )}
      {savedLog ? (
        <div className="p-6 space-y-4" data-section="report-saved">
          {autoGo && (
            <div className="space-y-1.5" data-section="auto-history">
              <p className="text-xs font-bold text-slate-500">Tra 3 secondi vai allo Storico… (tocca un pulsante per restare)</p>
              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className={`h-full bg-${color}-600 rounded-full`} style={{ animation: "moraCountdown 3s linear forwards" }} />
              </div>
              <style>{"@keyframes moraCountdown { from { width: 0%; } to { width: 100%; } }"}</style>
            </div>
          )}
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-black text-slate-800 text-xl">Rapporto salvato</h3>
              <p className="text-sm font-semibold text-slate-500 truncate">
                {savedLog.customer} · gru {savedLog.machineId || "-"} · {savedLog.dateString}
              </p>
            </div>
          </div>
          <button type="button" data-action="same-customer" onClick={() => {
              stay();
              setFormData((p) => ({ ...p, machineId: "", machineType: "", capacity: "", description: "", ticketNumber: "", photos: [], ropes: { fune: emptyRope(), catena: emptyRope() } }));
              setLastIntervention(null);
              setSavedLog(null);
            }}
            className={`w-full h-14 rounded-2xl bg-${color}-600 text-white font-black flex items-center justify-center gap-2`}>
            <RotateCcw className="w-5 h-5" /> Altra gru, stesso cliente
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" data-action="print-saved" onClick={() => { stay(); printIntervention(savedLog); }}
              className="h-12 rounded-xl border border-slate-300 text-slate-700 font-bold flex items-center justify-center gap-2">
              <Printer className="w-5 h-5" /> Stampa
            </button>
            <button type="button" data-action="go-history" onClick={onSuccess}
              className="h-12 rounded-xl border border-slate-300 text-slate-700 font-bold flex items-center justify-center gap-2">
              <HistoryIcon className="w-5 h-5" /> Vai allo Storico
            </button>
          </div>
          <p className="text-xs text-slate-500 text-center font-semibold">«Altra gru» tiene tecnici, data e cliente: scegli solo la gru e scrivi la descrizione.</p>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 bg-slate-50">
        {groupsInOrder.map(({ g, keys }, gi) => {
          const G = GROUPS[g];
          const Icon = G.icon;
          return (
          <section key={g + gi} data-form-group={g} className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${done[g] ? "bg-emerald-500 text-white" : `bg-${color}-50 text-${color}-700`}`}>
                {done[g] ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </span>
              <h3 className="font-black text-slate-800 text-lg leading-tight flex-1">
                <span className="text-slate-400 mr-1.5">{gi + 1}</span>
                {G.title}
              </h3>
              {G.optional && <span className="text-[11px] font-bold text-slate-400">facoltativo</span>}
            </div>
        {keys.map((key) => (
          <React.Fragment key={key}>
            {renderField(key)}
            {key === "machine" && sameMatricola && (
              <div
                data-section="same-matricola"
                className="flex flex-wrap items-center justify-between gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs font-bold text-blue-800"
              >
                <span>
                  Questo cliente ha già la gru{" "}
                  <span className="font-black">{getSafeMatricola(sameMatricola)}</span>
                  {sameMatricola.type ? ` (${sameMatricola.type})` : ""}: è la stessa?
                </span>
                <button
                  type="button"
                  onClick={() => selectMachine(sameMatricola)}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide active:scale-95 transition-transform"
                >
                  Usa {getSafeMatricola(sameMatricola)}
                </button>
              </div>
            )}
            {key === "machine" && <AssistantPanel machineLogs={assistantLogs} />}
          </React.Fragment>
        ))}
          </section>
          );
        })}
        {lastIntervention && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-in fade-in slide-in-from-top-2 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-black text-amber-800">
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

        <div data-section="save-bar" className={`flex gap-3 sticky z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-white/95 backdrop-blur border-t border-slate-200 ${isMobile ? "" : "bottom-0"}`} style={isMobile ? { bottom: "calc(86px + var(--mora-safe-bottom))" } : undefined}>
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            title="Svuota Modulo"
            className="w-14 rounded-2xl text-slate-500 bg-slate-100 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 flex items-center justify-center"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            type="submit"
            disabled={isSubmitting || uploadingPhotos}
            className={`flex-1 h-14 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 ${getButtonPrimaryClass(
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
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="p-6 max-w-xs w-full text-center space-y-5 bg-white rounded-xl shadow-xl border-t-4 border-t-red-500 animate-in zoom-in-95">
            <div className="p-3 bg-red-100 text-red-600 rounded-full w-fit mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-black text-slate-800 text-sm">
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
                  clearDraft();
                  setShowClearConfirm(false);
                }}
                className="py-3 bg-red-600 text-white rounded-lg font-bold text-xs shadow-md hover:bg-red-700 active:scale-95 transition-all"
              >
                Svuota
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-3 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200 active:scale-95 transition-all"
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
