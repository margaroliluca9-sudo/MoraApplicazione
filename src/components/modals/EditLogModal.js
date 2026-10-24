import React, { useEffect, useState } from "react";
import {
  PlusCircle,
  X,
  RefreshCw,
  MinusCircle,
  Camera,
  Users,
  MapPin,
  Wrench,
  Pencil,
} from "lucide-react";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { diffLog, withEdit } from "../../logHistory";
import { isPhotoRef, putPhotos, resolvePhotos } from "../../logPhotos";
import { PhotoMarkup } from "./PhotoMarkup";
import { logsChanged } from "../../logsWindow";
import { TicketTwins } from "../TicketTwins";
import { ticketYear } from "../../ticket";
import { db, appId } from "../../firebase";
import { DEFAULT_LAYOUT } from "../../constants";
import { compressImage, describeError } from "../../utils";
// stesso aspetto del modulo «Nuovo rapporto»
const F_INPUT =
  "w-full min-w-0 min-h-[48px] px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400";
const F_LABEL = "text-[13px] font-bold text-slate-600 ml-1";
const Section = ({ icon: Icon, title, color, children }) => (
  <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
    <h4 className="font-black text-slate-800 flex items-center gap-2">
      <span className={`w-8 h-8 rounded-full bg-${color}-100 text-${color}-700 flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </span>
      {title}
    </h4>
    {children}
  </section>
);

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
  allLogs = [],
  me = "",
}) => {
  const [data, setData] = useState({
    ...log,
    additionalTechnicians: log.additionalTechnicians || [],
    photos: log.photos || [],
    ropes: { fune: fromSavedRope(log.fune), catena: fromSavedRope(log.catena) },
  });
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [markIdx, setMarkIdx] = useState(null); // foto su cui si disegna
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
      // createdAt non si tocca (se l'intervento è appena nato senza rete sarebbe ancora vuoto)
      const { photos: _photos, id: _id, createdAt: _created, ...rest } = dataToSave;
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
      // storia delle modifiche (chi, quando, cosa): vedi logHistory.js
      const photosBefore = Number(log.photoCount) || (Array.isArray(log.photos) ? log.photos.length : 0);
      const edits = withEdit(log, diffLog(log, upd, photosBefore, photoState === "ready" ? data.photos.length : photosBefore), me);
      if (edits) upd.edits = edits;
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
      logsChanged();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Errore durante il salvataggio: " + describeError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[200] flex items-end md:items-center justify-center md:p-4 backdrop-blur-sm" data-section="edit-log">
      <div className="w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] bg-slate-50 rounded-t-3xl md:rounded-3xl shadow-2xl">
        <div className="p-5 border-b border-slate-100 flex justify-between items-start gap-3 bg-white">
          <div className="min-w-0">
            <h3 className="font-black text-slate-800 tracking-tight text-lg">
              Modifica intervento
            </h3>
            <p className="text-sm text-slate-500 font-semibold break-words">
              {[log.customer, log.machineId ? `gru ${log.machineId}` : "", log.dateString].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="w-10 h-10 shrink-0 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
          <Section icon={Users} title="Chi e quando" color={color}>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={F_LABEL}>
                Tecnico principale
              </label>
              <select
                className={F_INPUT}
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
              <label className={F_LABEL}>
                Data (gg/mm/aaaa)
              </label>
              <input
                type="text"
                className={F_INPUT}
                value={data.dateString}
                onChange={(e) =>
                  setData({ ...data, dateString: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className={F_LABEL}>
                Hanno lavorato con te
              </label>
              <button
                type="button"
                onClick={addTechnician}
                className={`text-sm font-bold flex items-center gap-1 min-h-[36px] text-${color}-700`}
              >
                <PlusCircle className="w-4 h-4" /> Aggiungi
              </button>
            </div>
            {data.additionalTechnicians.map((tech, idx) => (
              <div
                key={idx}
                className="flex gap-2 items-center animate-in fade-in"
              >
                <select
                  className={F_INPUT}
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
                  aria-label="Togli tecnico"
                  className="w-11 h-11 shrink-0 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full"
                >
                  <MinusCircle className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className={F_LABEL}>
              N. assistenza (se c'è)
            </label>
            <input
              type="text"
              className={F_INPUT}
              value={data.ticketNumber || ""}
              onChange={(e) =>
                setData({ ...data, ticketNumber: e.target.value })
              }
            />
            <TicketTwins logs={allLogs} ticketNumber={data.ticketNumber} year={ticketYear(data)} selfId={log.id} />
          </div>
          </Section>

          <Section icon={MapPin} title="Cliente e gru" color={color}>
          <div className="space-y-1.5">
            <label className={F_LABEL}>
              Cliente
            </label>
            <select
              className={F_INPUT}
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {formSettings.showMachineId && (
              <div className="space-y-1.5">
                <label className={F_LABEL}>
                  Matricola
                </label>
                <input
                  type="text"
                  className={F_INPUT}
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
                <label className={F_LABEL}>
                  Tipo
                </label>
                <select
                  className={F_INPUT}
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
                <label className={F_LABEL}>
                  Portata
                </label>
                <input
                  type="text"
                  className={F_INPUT}
                  value={data.capacity}
                  onChange={(e) =>
                    setData({ ...data, capacity: e.target.value })
                  }
                />
              </div>
            )}
          </div>
          </Section>

          <Section icon={Wrench} title="Cosa hai fatto" color={color}>
          <div className="space-y-1.5">
            <label className={F_LABEL}>
              Descrizione
            </label>
            <textarea
              rows="4"
              className={F_INPUT}
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

          </Section>

          <Section icon={Camera} title="Foto" color={color}>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className={F_LABEL}>Fino a 3 foto</span>
              <label
                className={`text-sm font-bold flex items-center gap-1 min-h-[36px] text-${color}-700 cursor-pointer ${
                  data.photos.length >= 3 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <PlusCircle className="w-4 h-4" /> Aggiungi
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
              <div className="text-sm text-blue-600 font-bold animate-pulse flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Elaborazione in
                corso...
              </div>
            )}

            {photoState === "loading" && (
              <div className="text-sm text-blue-600 font-bold animate-pulse flex items-center gap-1" data-photo-state="loading">
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
                    className="w-20 h-20 object-cover rounded-xl border-2 border-white shadow-sm"
                    alt="Anteprima"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    aria-label="Togli foto"
                    className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full shadow-md flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarkIdx(idx)}
                    data-action="markup-photo"
                    aria-label="Disegna sulla foto"
                    className="absolute -bottom-2 -left-2 bg-white text-slate-700 w-8 h-8 rounded-full shadow-md border border-slate-200 flex items-center justify-center"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {markIdx !== null && data.photos[markIdx] && (
                <PhotoMarkup
                  src={data.photos[markIdx]}
                  onClose={() => setMarkIdx(null)}
                  onSave={(img) => {
                    const i = markIdx;
                    setData((p) => ({ ...p, photos: p.photos.map((x, j) => (j === i ? img : x)) }));
                    setMarkIdx(null);
                  }}
                />
              )}
              {photoState === "ready" && data.photos.length === 0 && !uploadingPhotos && (
                <p className="text-sm text-slate-400">
                  Nessuna foto.
                </p>
              )}
            </div>
          </div>
          </Section>
        </div>
        <div className="p-4 border-t border-slate-200 bg-white" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || uploadingPhotos || photoState === "loading"}
            className={`w-full h-12 rounded-full font-bold text-base text-white bg-${color}-600 hover:bg-${color}-700 disabled:opacity-60 transition-colors`}
          >
            {loading ? "Salvataggio..." : "Salva modifiche"}
          </button>
        </div>
      </div>
    </div>
  );
};
