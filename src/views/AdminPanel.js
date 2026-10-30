import React, { useState, useEffect, useMemo } from "react";
import { AREA_TILES, areaOn } from "../areaTiles";
import { AppNameField, ThemeColors, SeasonGallery } from "../components/DesignExtras";
import {
  User,
  Trash2,
  RefreshCw,
  Activity,
  Terminal,
  Users,
  Wifi,
  WifiOff,
  Edit,
  AlertTriangle,
  Layout,
  GitMerge,
  LogOut,
  Check,
  X,
  UserX,
  Database,
  HardDrive,
  Download,
  MapPin,
} from "lucide-react";
import { collection, deleteField, serverTimestamp, Timestamp, doc, query, orderBy, limit, where } from "firebase/firestore";
import { setDoc, deleteDoc, updateDoc, writeBatch } from "../tracked";
import { onSnapshot, getDocs } from "../metered";
import { trashLog } from "../trash";
import { TrashView } from "../components/TrashView";
import { logsChanged } from "../logsWindow";
import { db, appId } from "../firebase";
import { describeError, getSafeMatricola, getLevenshteinDistance } from "../utils";
import { PRO_INPUT, getButtonPrimaryClass, getProPanelClass } from "../ui";
import { AdminNav, savedAdminView } from "../components/AdminNav";
import { CompanyAdmin } from "../components/CompanyAdmin";
import { BackupCard } from "../components/BackupCard";
import { ExportCard } from "../components/ExportCard";
import { TvCard } from "../components/TvCard";
import { ImportPlacesModal } from "../components/modals/ImportPlacesModal";
import { placeOf } from "../places";
import { DriveAdmin } from "./DriveAdmin";
import { EditsRegister } from "../components/EditsRegister";
import { ErrorsCard } from "../components/ErrorsCard";
import { ReadsCard } from "../components/ReadsCard";
import { BioCard } from "../components/BioCard";
import { buildBackupPdf, pdfFileName } from "../pdf";
import { openPdf } from "../components/PdfHost";
import {
  FONT_OPTIONS,
  FONT_SCALE_OPTIONS,
  RADIUS_OPTIONS,
  DENSITY_OPTIONS,
  APPEARANCE_DEFAULTS,
} from "../appearance";
import { EditMachineModal } from "../components/modals/EditMachineModal";
import { EditCustomerModal } from "../components/modals/EditCustomerModal";
import { MergeModal } from "../components/modals/MergeModal";
import { DuplicatesModal } from "../components/modals/DuplicatesModal";
import { VanAdmin } from "./VanAdmin";

export const AdminPanel = ({
  customers,
  technicians,
  machines,
  machineTypes,
  isMobile,
  layoutConfig,
  onUpdateLayout,
  onLogout,
  allLogs = [],
  vans = [],
  vanItems = [],
  currentTechName = "",
  onOpenTv,
}) => {
  const [view, setView] = useState(savedAdminView);
  const [renaming, setRenaming] = useState(null); // { id, value }
  const [renameBusy, setRenameBusy] = useState(false);
  const [kickBusy, setKickBusy] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [logs, setLogs] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [importPlaces, setImportPlaces] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [mergingItem, setMergingItem] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [duplicateAnalysis, setDuplicateAnalysis] = useState(null);
  const [ignoredConflicts, setIgnoredConflicts] = useState([]);
  const [showClearLogsConfirm, setShowClearLogsConfirm] = useState(false);

  const [clientSearch, setClientSearch] = useState("");
  const [clientSort, setClientSort] = useState("az");
  const [machineSearch, setMachineSearch] = useState("");
  const [machineSort, setMachineSort] = useState("cust-az");
  const [listViewMode, setListViewMode] = useState("list");

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // doppioni da non riproporre: una volta sola quando apri Admin (prima si rileggevano a ogni cambio di scheda)
  useEffect(() => {
    const unsubIgnored = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "ignored_conflicts"),
      (snap) => {
        setIgnoredConflicts(snap.docs.map((d) => d.id));
      }
    );
    return () => unsubIgnored();
  }, []);

  useEffect(() => {
    if (view === "diagnostics") {
      const unsubLogs = onSnapshot(
        query(
          collection(db, "artifacts", appId, "public", "data", "access_logs"),
          orderBy("timestamp", "desc"),
          limit(50)
        ),
        (s) => setLogs(s.docs.map((d) => ({ id: d.id, ...d.data() })))
      );
      const unsubActive = onSnapshot(
        query(
          collection(db, "artifacts", appId, "public", "data", "active_users"),
          where("lastActive", ">=", Timestamp.fromMillis(Date.now() - 10 * 60 * 1000))
        ),
        (s) => {
          const now = Date.now();
          const rawUsers = s.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter(
              (u) =>
                u.lastActive &&
                now - u.lastActive.seconds * 1000 < 5 * 60 * 1000
            );
          const grouped = {};
          rawUsers.forEach((u) => {
            if (!grouped[u.technician])
              grouped[u.technician] = {
                ...u,
                allDevices: new Set([u.device]),
                sessionIds: [u.id],
                pendingKick: !!u.kickedAt,
              };
            else {
              grouped[u.technician].allDevices.add(u.device);
              grouped[u.technician].sessionIds.push(u.id);
              if (u.kickedAt) grouped[u.technician].pendingKick = true;
              if (
                u.lastActive.seconds > grouped[u.technician].lastActive.seconds
              )
                grouped[u.technician].lastActive = u.lastActive;
            }
          });
          const users = Object.values(grouped)
            .map((u) => ({
              ...u,
              device: Array.from(u.allDevices).join(" + "),
            }))
            .sort((a, b) => b.lastActive.seconds - a.lastActive.seconds);
          setActiveUsers(users);
        }
      );
      return () => {
        unsubLogs();
        unsubActive();
      };
    }
    return undefined;
  }, [view]);

  const processedCustomers = useMemo(() => {
    let res = [...customers];
    if (clientSearch)
      res = res.filter((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase())
      );
    if (clientSort === "az") res.sort((a, b) => a.name.localeCompare(b.name));
    else if (clientSort === "za")
      res.sort((a, b) => b.name.localeCompare(a.name));
    return res;
  }, [customers, clientSearch, clientSort]);

  const processedMachines = useMemo(() => {
    let res = [...machines];
    if (machineSearch) {
      const s = machineSearch.toLowerCase();
      res = res.filter(
        (m) =>
          (m.matricola || m.id).toLowerCase().includes(s) ||
          m.customerName.toLowerCase().includes(s) ||
          (m.type && m.type.toLowerCase().includes(s))
      );
    }
    if (machineSort === "mat-az")
      res.sort((a, b) =>
        (a.matricola || a.id).localeCompare(b.matricola || b.id)
      );
    else if (machineSort === "mat-za")
      res.sort((a, b) =>
        (b.matricola || b.id).localeCompare(a.matricola || a.id)
      );
    else if (machineSort === "cust-az")
      res.sort((a, b) =>
        (a.customerName || "").localeCompare(b.customerName || "")
      );
    return res;
  }, [machines, machineSearch, machineSort]);

  const analyzeDuplicates = (type, items) => {
    const pairs = [];
    const normalize = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const pairId = [items[i].id, items[j].id].sort().join("_");
        if (ignoredConflicts.includes(pairId)) continue;
        let isDup = false;
        if (type === "customer") {
          const normA = normalize(items[i].name);
          const normB = normalize(items[j].name);
          if (normA === normB && normA !== "") isDup = true;
          else if (normA.length > 4 && normB.length > 4) {
            const dist = getLevenshteinDistance(normA, normB);
            if (
              dist <= 2 ||
              (normA.includes(normB) && normA.length - normB.length < 5) ||
              (normB.includes(normA) && normB.length - normA.length < 5)
            )
              isDup = true;
          }
        } else if (type === "machine") {
          const normA = normalize(getSafeMatricola(items[i]));
          const normB = normalize(getSafeMatricola(items[j]));
          const custA = normalize(items[i].customerName);
          const custB = normalize(items[j].customerName);
          if (custA === custB) {
            if (normA === normB && normA !== "") isDup = true;
            else if (normA.length > 2 && normB.length > 2) {
              const dist = getLevenshteinDistance(normA, normB);
              if (dist <= 1) isDup = true;
            }
          }
        }
        if (isDup) pairs.push([items[i], items[j]]);
      }
    }
    setDuplicateAnalysis({ type, pairs });
  };

  const handleIgnoreConflict = async (itemA, itemB) => {
    const pairId = [itemA.id, itemB.id].sort().join("_");
    try {
      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "ignored_conflicts",
          pairId
        ),
        { idA: itemA.id, idB: itemB.id, timestamp: serverTimestamp() }
      );
      setDuplicateAnalysis((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pairs: prev.pairs.filter(
            (p) => [p[0].id, p[1].id].sort().join("_") !== pairId
          ),
        };
      });
      return true;
    } catch (e) {
      console.error(e);
      alert("Impossibile ignorare il conflitto: " + describeError(e));
      return false;
    }
  };

  const addItem = async () => {
    if (!inputValue) return;
    const coll = view === "techs" ? "technicians" : "machine_types";
    const id = inputValue.toLowerCase().replace(/\s+/g, "_");
    await setDoc(doc(db, "artifacts", appId, "public", "data", coll, id), {
      name: inputValue,
    });
    setInputValue("");
  };

  // Spazio usato dall'app sul dispositivo (dati offline)
  useEffect(() => {
    if (view !== "diagnostics") return;
    try {
      if (navigator.storage && navigator.storage.estimate)
        navigator.storage
          .estimate()
          .then((e) => setStorageInfo(e))
          .catch(() => {});
    } catch (e) {}
  }, [view]);

  // Backup completo dell'archivio in un file PDF
  const downloadBackup = () => {
    const generatedAt = new Date().toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    openPdf(
      () =>
        buildBackupPdf({
          logs: allLogs,
          customers,
          machines,
          technicians,
          machineTypes,
          generatedAt,
        }),
      pdfFileName("Backup archivio", new Date().toISOString().slice(0, 10))
    );
  };

  // Statistiche dell'archivio (sezione System)
  const dbStats = useMemo(() => {
    let withPhotos = 0;
    let lastKey = 0;
    let last = null;
    allLogs.forEach((l) => {
      if (l.photos && l.photos.length) withPhotos++;
      const parts = String(l.dateString || "").split("/").map(Number);
      if (parts.length === 3) {
        const k = parts[2] * 10000 + parts[1] * 100 + parts[0];
        if (k > lastKey) {
          lastKey = k;
          last = l.dateString;
        }
      }
    });
    return { withPhotos, last };
  }, [allLogs]);

  // Disconnette tutti i dispositivi di un tecnico
  const kickUser = async (u) => {
    if (
      !window.confirm(
        `Disconnettere ${u.technician}? Il suo dispositivo tornerà alla schermata di accesso.`
      )
    )
      return;
    setKickBusy(u.technician);
    try {
      await Promise.all(
        (u.sessionIds || []).map((sid) =>
          setDoc(
            doc(db, "artifacts", appId, "public", "data", "active_users", sid),
            { kickedAt: serverTimestamp() },
            { merge: true }
          )
        )
      );
    } catch (e) {
      console.error(e);
      alert("Impossibile disconnettere: " + describeError(e));
    } finally {
      setKickBusy(null);
    }
  };

  // Esegue gli aggiornamenti a blocchi (Firebase accetta max 500 operazioni per volta)
  const commitInChunks = async (ops) => {
    for (let i = 0; i < ops.length; i += 400) {
      const batch = writeBatch(db);
      ops.slice(i, i + 400).forEach(([ref, data]) => batch.update(ref, data));
      await batch.commit();
      logsChanged();
    }
  };

  // Rinomina un tecnico o un tipo di gru e aggiorna tutto ciò che lo usa
  const renameItem = async (item, rawName) => {
    const isTech = view === "techs";
    const newName = String(rawName || "").trim();
    const oldName = item.name;
    if (!newName || newName === oldName) return setRenaming(null);
    const list = isTech ? technicians : machineTypes;
    if (
      list.some(
        (x) =>
          x.id !== item.id &&
          String(x.name).trim().toLowerCase() === newName.toLowerCase()
      )
    )
      return alert(`Esiste già "${newName}".`);
    setRenameBusy(true);
    try {
      const base = ["artifacts", appId, "public", "data"];
      const logsColl = collection(db, ...base, "maintenance_logs");
      const ops = [];
      let logsUpdated = 0;
      let machinesUpdated = 0;
      if (isTech) {
        ops.push([doc(db, ...base, "technicians", item.id), { name: newName }]);
        const touched = {};
        const main = await getDocs(
          query(logsColl, where("technician", "==", oldName))
        );
        main.forEach((d) => {
          touched[d.id] = { ref: d.ref, data: d.data(), upd: { technician: newName } };
        });
        const extra = await getDocs(
          query(logsColl, where("additionalTechnicians", "array-contains", oldName))
        );
        extra.forEach((d) => {
          const data = d.data();
          const upd = touched[d.id] ? touched[d.id].upd : {};
          upd.additionalTechnicians = (data.additionalTechnicians || []).map((t) =>
            t === oldName ? newName : t
          );
          touched[d.id] = { ref: d.ref, data, upd };
        });
        Object.values(touched).forEach((t) => ops.push([t.ref, t.upd]));
        logsUpdated = Object.keys(touched).length;
        if (localStorage.getItem("mora_tech_last_name") === oldName)
          localStorage.setItem("mora_tech_last_name", newName);
      } else {
        ops.push([doc(db, ...base, "machine_types", item.id), { name: newName }]);
        const ms = await getDocs(
          query(collection(db, ...base, "machines"), where("type", "==", oldName))
        );
        ms.forEach((d) => ops.push([d.ref, { type: newName }]));
        machinesUpdated = ms.size;
        const ls = await getDocs(
          query(logsColl, where("machineType", "==", oldName))
        );
        ls.forEach((d) => ops.push([d.ref, { machineType: newName }]));
        logsUpdated = ls.size;
      }
      await commitInChunks(ops);
      logsChanged();
      setRenaming(null);
      alert(
        `"${oldName}" rinominato in "${newName}". Aggiornati ${logsUpdated} interventi` +
          (isTech
            ? ". Chi è collegato con il vecchio nome deve rientrare."
            : ` e ${machinesUpdated} gru.`)
      );
    } catch (e) {
      console.error(e);
      alert(
        "Rinomina non completata: " +
          describeError(e) +
          " Riprova: le modifiche già fatte restano valide."
      );
    } finally {
      setRenameBusy(false);
    }
  };

  const deleteItem = (coll, id) => setItemToDelete({ coll, id });
  const confirmDeleteAdmin = async () => {
    if (!itemToDelete) return;
    try {
      // i rapporti vanno nel cestino (si recuperano per 30 giorni); il resto si elimina
      if (itemToDelete.coll === "maintenance_logs") await trashLog(itemToDelete.id, "admin");
      else
        await deleteDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            itemToDelete.coll,
            itemToDelete.id
          )
        );
    } catch (e) {
      console.error(e);
    }
    logsChanged();
    setItemToDelete(null);
  };

  const handleMergeCustomers = async (source, target) => {
    const logsSnap = await getDocs(
      query(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "maintenance_logs"
        ),
        where("customer", "==", source.name)
      )
    );
    const machinesSnap = await getDocs(
      query(
        collection(db, "artifacts", appId, "public", "data", "machines"),
        where("customerName", "==", source.name)
      )
    );
    const promises = [];
    logsSnap.forEach((d) =>
      promises.push(updateDoc(d.ref, { customer: target.name }))
    );
    machinesSnap.forEach((d) =>
      promises.push(updateDoc(d.ref, { customerName: target.name }))
    );
    await Promise.all(promises);
    await deleteDoc(
      doc(db, "artifacts", appId, "public", "data", "customers", source.id)
    );
    logsChanged();
    setMergingItem(null);
  };

  const handleMergeMachines = async (source, target) => {
    const matSource = getSafeMatricola(source);
    const matTarget = getSafeMatricola(target);
    const logsSnap = await getDocs(
      query(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "maintenance_logs"
        ),
        where("machineId", "==", source.id)
      )
    );
    const logsSnapMat = await getDocs(
      query(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "maintenance_logs"
        ),
        where("machineId", "==", matSource),
        where("customer", "==", source.customerName)
      )
    );
    const promises = [];
    const updateLogs = (snap) => {
      snap.forEach((d) =>
        promises.push(
          updateDoc(d.ref, {
            machineId: matTarget,
            machineType: target.type || "N.D.",
            capacity: target.capacity || "",
          })
        )
      );
    };
    updateLogs(logsSnap);
    updateLogs(logsSnapMat);
    await Promise.all(promises);
    await deleteDoc(
      doc(db, "artifacts", appId, "public", "data", "machines", source.id)
    );
    logsChanged();
    setMergingItem(null);
  };

  const handleDirectMerge = async (source, target, type) => {
    try {
      if (type === "customer") await handleMergeCustomers(source, target);
      else await handleMergeMachines(source, target);
      setDuplicateAnalysis((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          pairs: prev.pairs.filter(
            (p) => p[0].id !== source.id && p[1].id !== source.id
          ),
        };
      });
      return true;
    } catch (e) {
      console.error(e);
      alert(
        "Unione non completata: " +
          describeError(e) +
          " Alcuni interventi potrebbero essere già stati spostati: riprova l'unione."
      );
      return false;
    }
  };

  const executeClearLogs = async () => {
    try {
      const q = collection(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "access_logs"
      );
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      logsChanged();
    } catch (e) {
      console.error(e);
    }
    setShowClearLogsConfirm(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AdminNav view={view} onChange={setView} color={layoutConfig.themeColor} />

      {view === "edits" && (
        <div className={`p-5 shadow-xl ${getProPanelClass(layoutConfig.themeColor)}`}>
          <EditsRegister logs={allLogs} technicians={technicians} color={layoutConfig.themeColor} onOpenTrash={() => setView("trash")} />
        </div>
      )}
      {view === "company" && <CompanyAdmin color={layoutConfig.themeColor} />}
      {view === "drive" && <DriveAdmin customers={customers} machines={machines} color={layoutConfig.themeColor} />}
      {view === "trash" && <TrashView color={layoutConfig.themeColor} />}
      {view === "vans" && (
        <VanAdmin
          vans={vans}
          vanItems={vanItems}
          technicians={technicians.filter((t) => t.role !== "ufficio")}
          color={layoutConfig.themeColor}
          me={currentTechName}
        />
      )}

      {view === "design" && (
        <div
          className={`p-6 shadow-xl ${getProPanelClass(
            layoutConfig.themeColor
          )}`}
        >
          <h3 className="font-black text-slate-800 mb-4">Aspetto dell'app</h3>
          <div className="space-y-5 mb-6">
            <AppNameField layoutConfig={layoutConfig} onUpdateLayout={onUpdateLayout} color={layoutConfig.themeColor} />
            <ThemeColors layoutConfig={layoutConfig} onUpdateLayout={onUpdateLayout} />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">
            Le scelte di questa pagina valgono per tutti i telefoni.
          </p>

          <div className="space-y-5 mb-6" data-section="appearance">
            <div className="space-y-1.5">
              <label
                htmlFor="design-font"
                className="text-[10px] font-bold text-slate-500 uppercase ml-1"
              >
                Carattere
              </label>
              <select
                id="design-font"
                className={PRO_INPUT}
                value={layoutConfig.fontFamily || APPEARANCE_DEFAULTS.fontFamily}
                onChange={(e) =>
                  onUpdateLayout({ ...layoutConfig, fontFamily: e.target.value })
                }
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {[
              {
                key: "fontScale",
                title: "Grandezza lettere",
                options: FONT_SCALE_OPTIONS,
              },
              { key: "radiusStyle", title: "Angoli", options: RADIUS_OPTIONS },
              { key: "density", title: "Spaziatura", options: DENSITY_OPTIONS },
            ].map((group) => {
              const current =
                layoutConfig[group.key] || APPEARANCE_DEFAULTS[group.key];
              return (
                <div key={group.key} className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase ml-1 block">
                    {group.title}
                  </span>
                  <div
                    className="grid gap-2"
                    style={{
                      gridTemplateColumns: `repeat(${group.options.length}, minmax(0, 1fr))`,
                    }}
                    role="group"
                    aria-label={group.title}
                  >
                    {group.options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        aria-pressed={current === o.id}
                        onClick={() =>
                          onUpdateLayout({ ...layoutConfig, [group.key]: o.id })
                        }
                        className={`py-2.5 px-1 rounded-lg border text-xs font-bold transition-all ${
                          current === o.id
                            ? `bg-${layoutConfig.themeColor}-600 border-${layoutConfig.themeColor}-600 text-white`
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                        style={
                          group.key === "fontScale"
                            ? { fontSize: `${12 * o.value}px` }
                            : undefined
                        }
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50"
              data-section="chat-toggle"
            >
              <div>
                <span className="text-xs font-bold text-slate-700 block">
                  Chat tra tecnici
                </span>
                <span className="text-[10px] text-slate-500">
                  {layoutConfig.chatEnabled === true
                    ? "Attiva: c'è nella «La mia area» di ogni tecnico"
                    : "Spenta: nessuno la vede (i messaggi restano salvati)"}
                </span>
              </div>
              <button
                type="button"
                aria-pressed={layoutConfig.chatEnabled === true}
                onClick={() =>
                  onUpdateLayout({
                    ...layoutConfig,
                    chatEnabled: layoutConfig.chatEnabled !== true,
                  })
                }
                className={`px-4 py-2 rounded-full font-bold text-sm shrink-0 ${
                  layoutConfig.chatEnabled === true
                    ? `bg-${layoutConfig.themeColor}-600 text-white`
                    : "bg-white border border-slate-300 text-slate-600"
                }`}
              >
                {layoutConfig.chatEnabled === true ? "Disattiva" : "Attiva"}
              </button>
            </div>

            <div
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50"
              data-section="online-toggle"
            >
              <div>
                <span className="text-xs font-bold text-slate-700 block">
                  Messaggi da «Tecnici online»
                </span>
                <span className="text-[10px] text-slate-500">
                  {layoutConfig.onlineMessages !== false
                    ? "Attivi: toccando «tecnici online» in alto si vede chi è collegato e gli si scrive"
                    : "Spenti: si vede solo chi è online, senza messaggi"}
                </span>
              </div>
              <button
                type="button"
                aria-pressed={layoutConfig.onlineMessages !== false}
                onClick={() =>
                  onUpdateLayout({
                    ...layoutConfig,
                    onlineMessages: layoutConfig.onlineMessages === false,
                  })
                }
                className={`px-4 py-2 rounded-full font-bold text-sm shrink-0 ${
                  layoutConfig.onlineMessages !== false
                    ? `bg-${layoutConfig.themeColor}-600 text-white`
                    : "bg-white border border-slate-300 text-slate-600"
                }`}
              >
                {layoutConfig.onlineMessages !== false ? "Disattiva" : "Attiva"}
              </button>
            </div>

            <SeasonGallery layoutConfig={layoutConfig} onUpdateLayout={onUpdateLayout} color={layoutConfig.themeColor} />

            <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div>
                <span className="text-xs font-bold text-slate-700 block">
                  Animazione di avvio
                </span>
                <span className="text-[10px] text-slate-500">
                  {layoutConfig.showSplash === false
                    ? "Disattivata: l'app si apre subito"
                    : "Carroponte e gru all'apertura (circa 2 secondi)"}
                </span>
              </div>
              <button
                type="button"
                aria-pressed={layoutConfig.showSplash !== false}
                onClick={() =>
                  onUpdateLayout({
                    ...layoutConfig,
                    showSplash: layoutConfig.showSplash === false,
                  })
                }
                className={`px-4 py-2 rounded-full font-bold text-sm shrink-0 ${
                  layoutConfig.showSplash === false
                    ? "bg-white border border-slate-300 text-slate-600"
                    : `bg-${layoutConfig.themeColor}-600 text-white`
                }`}
              >
                {layoutConfig.showSplash === false ? "Attiva" : "Disattiva"}
              </button>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2" data-section="area-tiles-admin">
              <div>
                <span className="text-xs font-bold text-slate-700 block">«La mia area»: cosa vedono i tecnici</span>
                <span className="text-[10px] text-slate-500">Spegni una parte e sparisce per tutti. I dati restano salvati: riaccendendola torna tutto com'era.</span>
              </div>
              {AREA_TILES.map((t) => {
                const isOn = areaOn(layoutConfig, t.id);
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 bg-white rounded-lg border border-slate-200 px-3 py-2" data-area-admin={t.id}>
                    <div className="min-w-0">
                      <span className={`text-xs font-bold block ${isOn ? "text-slate-700" : "text-slate-400 line-through"}`}>{t.label}</span>
                      <span className="text-[10px] text-slate-500">{t.sub}</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isOn}
                      aria-label={t.label}
                      onClick={() =>
                        onUpdateLayout({
                          ...layoutConfig,
                          areaTiles: { ...(layoutConfig.areaTiles || {}), [t.id]: !isOn },
                        })
                      }
                      className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${isOn ? "bg-emerald-500" : "bg-slate-300"}`}
                    >
                      <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${isOn ? "left-6" : "left-1"}`} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() =>
                onUpdateLayout({ ...layoutConfig, ...APPEARANCE_DEFAULTS })
              }
              className="w-full py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 font-bold text-xs hover:bg-slate-50"
            >
              Ripristina grafica predefinita
            </button>
          </div>

        </div>
      )}

      {(view === "techs" || view === "types") && (
        <div
          className={`p-6 shadow-xl max-w-xl mx-auto ${getProPanelClass(
            layoutConfig.themeColor
          )}`}
        >
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              className={PRO_INPUT}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Nuovo..."
            />
            <button
              onClick={addItem}
              className={`px-6 rounded-xl font-bold uppercase text-[10px] ${getButtonPrimaryClass(
                layoutConfig.themeColor
              )}`}
            >
              Aggiungi
            </button>
          </div>
          {view === "techs" && (
            <p className="text-[11px] text-slate-500 font-semibold mb-3" data-section="staff-roles-hint">
              <b>Tecnico</b>: tutta l'app. <b>Ufficio</b>: vede solo gli interventi (Storico, con la stampa) ed
              Esplora, con la sua guida; non compare tra i tecnici dei rapporti.
            </p>
          )}
          <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar">
            {(view === "techs" ? technicians : machineTypes).map((i) =>
              renaming && renaming.id === i.id ? (
                <div
                  key={i.id}
                  className="flex gap-2 p-2 bg-blue-50 rounded-xl border border-blue-200 items-center"
                >
                  <input
                    type="text"
                    aria-label="Nuovo nome"
                    autoFocus
                    className={PRO_INPUT}
                    value={renaming.value}
                    disabled={renameBusy}
                    onChange={(e) =>
                      setRenaming({ id: i.id, value: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") renameItem(i, renaming.value);
                      if (e.key === "Escape") setRenaming(null);
                    }}
                  />
                  <button
                    onClick={() => renameItem(i, renaming.value)}
                    disabled={renameBusy}
                    aria-label="Salva nome"
                    className="p-2 bg-green-600 text-white rounded-lg shrink-0 disabled:opacity-50"
                  >
                    {renameBusy ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setRenaming(null)}
                    disabled={renameBusy}
                    aria-label="Annulla"
                    className="p-2 bg-white text-slate-500 border border-slate-200 rounded-lg shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  key={i.id}
                  className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 items-center"
                >
                  <span className="font-bold text-xs text-slate-700 min-w-0 truncate">
                    {String(i.name)}
                  </span>
                  <div className="flex gap-3 items-center">
                    {view === "techs" && (
                      <div className="flex rounded-lg border border-slate-200 overflow-hidden shrink-0" role="group" aria-label={"Ruolo di " + i.name} data-role-of={i.name}>
                        {[
                          ["tecnico", "Tecnico"],
                          ["ufficio", "Ufficio"],
                        ].map(([r, label]) => {
                          const on = (i.role === "ufficio" ? "ufficio" : "tecnico") === r;
                          return (
                            <button
                              key={r}
                              type="button"
                              data-role={r}
                              aria-pressed={on}
                              onClick={() =>
                                !on &&
                                updateDoc(doc(db, "artifacts", appId, "public", "data", "technicians", i.id), { role: r }).catch((e) =>
                                  alert("Ruolo non salvato: " + describeError(e))
                                )
                              }
                              className={`px-2.5 py-1.5 text-[10px] font-black uppercase ${
                                on ? `bg-${layoutConfig.themeColor}-600 text-white` : "bg-white text-slate-500"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {view === "techs" && i.passHash && (
                      <button
                        type="button"
                        data-action="clear-pass"
                        title="Ha una password personale: toccalo per toglierla (torna a valere la password aziendale)"
                        onClick={() =>
                          window.confirm(`${i.name} ha una password personale. Toglierla? Tornerà a entrare con la password aziendale dei tecnici.`) &&
                          updateDoc(doc(db, "artifacts", appId, "public", "data", "technicians", i.id), { passHash: deleteField() }).catch((e) => alert("Non tolta: " + describeError(e)))
                        }
                        className="px-2 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-[10px] font-black uppercase shrink-0"
                      >
                        Pass. sua ✕
                      </button>
                    )}
                    <button
                      onClick={() =>
                        setRenaming({ id: i.id, value: String(i.name) })
                      }
                      aria-label="Rinomina"
                      className="text-blue-500"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        deleteItem(
                          view === "techs" ? "technicians" : "machine_types",
                          i.id
                        )
                      }
                      aria-label="Elimina"
                      className="text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {view === "clients" && (
        <div
          className={`p-6 shadow-xl ${getProPanelClass(
            layoutConfig.themeColor
          )}`}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
            <h4 className="font-black text-slate-800 shrink-0">
              Lista Clienti ({processedCustomers.length})
            </h4>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <input
                type="text"
                placeholder="Cerca cliente..."
                className="p-2 border border-slate-200 rounded-lg text-xs flex-1 md:w-40"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
              <select
                className="p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none cursor-pointer"
                value={clientSort}
                onChange={(e) => setClientSort(e.target.value)}
              >
                <option value="az">A-Z</option>
                <option value="za">Z-A</option>
              </select>
              <button
                onClick={() =>
                  setListViewMode((p) => (p === "grid" ? "list" : "grid"))
                }
                className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600"
              >
                <Layout className="w-4 h-4" />
              </button>
              <button
                onClick={() => analyzeDuplicates("customer", customers)}
                aria-label="Controlla i doppioni"
                title="Controlla i doppioni"
                data-action="duplicates"
                className="p-2 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-lg hover:bg-yellow-100 flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="text-[10px] font-bold hidden md:block">
                  Doppioni
                </span>
              </button>
              <button
                type="button"
                onClick={() => setImportPlaces(true)}
                title="Importa paesi e indirizzi da un file Excel"
                data-action="import-places"
                className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex items-center gap-1.5 shrink-0"
              >
                <MapPin className="w-4 h-4" />
                <span className="text-[10px] font-bold">Importa paesi</span>
              </button>
            </div>
          </div>
          <div
            className={`max-h-[500px] overflow-y-auto custom-scrollbar p-1 ${
              listViewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 gap-3"
                : "space-y-2"
            }`}
          >
            {processedCustomers.map((c) => (
              <div
                key={c.id}
                className="flex justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl items-center group hover:border-blue-300 hover:shadow-sm"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {listViewMode === "grid" && (
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                  )}
                  <span className="min-w-0">
                    <span className="block font-bold text-xs text-slate-700 truncate">
                      {String(c.name)}
                    </span>
                    {placeOf(c) && (
                      <span className="block text-[11px] text-slate-500 truncate" data-customer-place>
                        {placeOf(c)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() =>
                      setMergingItem({ item: c, type: "customer" })
                    }
                    className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
                  >
                    <GitMerge className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingCustomer(c)}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteItem("customers", c.id)}
                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "machines" && (
        <div
          className={`p-6 shadow-xl ${getProPanelClass(
            layoutConfig.themeColor
          )}`}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
            <h4 className="font-black text-slate-800 shrink-0">
              Archivio Gru ({processedMachines.length})
            </h4>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <input
                type="text"
                placeholder="Cerca gru..."
                className="p-2 border border-slate-200 rounded-lg text-xs flex-1 md:w-40"
                value={machineSearch}
                onChange={(e) => setMachineSearch(e.target.value)}
              />
              <select
                className="p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none cursor-pointer"
                value={machineSort}
                onChange={(e) => setMachineSort(e.target.value)}
              >
                <option value="cust-az">Per Cliente</option>
                <option value="mat-az">Mat (A-Z)</option>
              </select>
              <button
                onClick={() =>
                  setListViewMode((p) => (p === "grid" ? "list" : "grid"))
                }
                className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600"
              >
                <Layout className="w-4 h-4" />
              </button>
              <button
                onClick={() => analyzeDuplicates("machine", machines)}
                aria-label="Controlla i doppioni"
                title="Controlla i doppioni"
                data-action="duplicates"
                className="p-2 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-lg hover:bg-yellow-100 flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="text-[10px] font-bold hidden md:block">
                  Doppioni
                </span>
              </button>
            </div>
          </div>
          <div
            className={`max-h-[500px] overflow-y-auto custom-scrollbar p-1 ${
              listViewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 gap-3"
                : "space-y-2"
            }`}
          >
            {processedMachines.map((m) => (
              <div
                key={m.id}
                className="flex justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl items-center group hover:border-blue-300 hover:shadow-sm"
              >
                <div className="overflow-hidden pr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded border border-blue-200">
                      {m.matricola || m.id}
                    </span>
                    {listViewMode === "grid" && m.type && (
                      <span className="text-[9px] font-bold text-slate-500 uppercase truncate">
                        {m.type}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-xs text-slate-600 truncate block">
                    {m.customerName}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setMergingItem({ item: m, type: "machine" })}
                    className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
                  >
                    <GitMerge className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingMachine(m)}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteItem("machines", m.id)}
                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "diagnostics" && (
        <div
          className={`p-6 shadow-xl ${getProPanelClass(
            layoutConfig.themeColor
          )}`}
        >
          <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" /> Stato Sistema
          </h4>
          <BackupCard color={layoutConfig.themeColor} />
          <ExportCard color={layoutConfig.themeColor} customers={customers} machines={machines} />
          {onOpenTv && <TvCard color={layoutConfig.themeColor} onOpen={onOpenTv} />}
          <ReadsCard color={layoutConfig.themeColor} />
          <ErrorsCard color={layoutConfig.themeColor} />
          <BioCard color={layoutConfig.themeColor} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isOnline
                      ? "bg-green-100 text-green-600"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {isOnline ? (
                    <Wifi className="w-5 h-5" />
                  ) : (
                    <WifiOff className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h5 className="font-bold text-sm text-slate-800">
                    Connessione DB
                  </h5>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">
                    {isOnline ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-start gap-4"
            >
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h5 className="font-bold text-sm text-slate-800">
                  Riavvia App
                </h5>
              </div>
            </button>
            <button
              onClick={onLogout}
              className="p-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 flex items-center justify-start gap-4 transition-all"
            >
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h5 className="font-bold text-sm text-red-800">
                  Scollega
                </h5>
                <p className="text-[10px] text-red-600 font-bold uppercase">
                  Torna al Login
                </p>
              </div>
            </button>
          </div>
          <h4 className="font-black text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-600" /> Tecnici connessi (
            {activeUsers.length})
          </h4>
          <div className="space-y-2 mb-8" data-section="active-users">
            {activeUsers.length === 0 && (
              <p className="text-xs text-slate-400 italic">
                Nessun tecnico attivo negli ultimi 5 minuti.
              </p>
            )}
            {activeUsers.map((u) => (
              <div
                key={u.technician}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-green-100 text-green-700 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-sm text-slate-800 truncate">
                      {u.technician}
                    </h5>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                      {u.device} · attivo{" "}
                      {u.lastActive && u.lastActive.seconds
                        ? new Date(u.lastActive.seconds * 1000).toLocaleTimeString(
                            "it-IT",
                            { hour: "2-digit", minute: "2-digit" }
                          )
                        : "ora"}
                      {u.pendingKick ? " · disconnessione in corso..." : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => kickUser(u)}
                  disabled={kickBusy === u.technician}
                  className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold text-[10px] uppercase hover:bg-red-100 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <UserX className="w-4 h-4" /> Disconnetti
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h4 className="font-black text-slate-800 flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-600" /> Archivio
            </h4>
            <button
              onClick={downloadBackup}
              className="px-3 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg font-bold text-[10px] uppercase hover:bg-purple-100 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Backup PDF
            </button>
          </div>
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4"
            data-section="db-stats"
          >
            {[
              ["Interventi", allLogs.length],
              ["Clienti", customers.length],
              ["Gru", machines.length],
              ["Tecnici", technicians.length],
              ["Tipi gru", machineTypes.length],
              ["Con foto", dbStats.withPhotos],
              ["Ultimo intervento", dbStats.last || "-"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center"
              >
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  {label}
                </div>
                <div className="text-lg font-black text-slate-800">{value}</div>
              </div>
            ))}
          </div>
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3 mb-8 text-xs text-slate-600">
            <HardDrive className="w-5 h-5 text-slate-400 shrink-0" />
            <span>
              Questo dispositivo:{" "}
              <b>{/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? "Mobile" : "Desktop"}</b>
              {storageInfo && storageInfo.usage !== undefined
                ? ` · dati offline ${(storageInfo.usage / 1048576).toFixed(1)} MB`
                : ""}
              {" · "}schermo {window.innerWidth}×{window.innerHeight}
            </span>
          </div>

          <div className="flex justify-between items-center mb-4 mt-8">
            <h4 className="font-black text-slate-800 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-slate-800" /> Log Accessi
            </h4>
            <button
              onClick={() => setShowClearLogsConfirm(true)}
              className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-bold text-[10px] uppercase hover:bg-red-100 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Svuota Log
            </button>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 overflow-hidden font-mono text-xs text-green-400 h-[200px] overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="mb-1">
                <span className="text-slate-500">
                  [
                  {log.timestamp?.seconds
                    ? new Date(log.timestamp.seconds * 1000).toLocaleString(
                        "it-IT"
                      )
                    : "now"}
                  ]
                </span>{" "}
                {log.action || "INFO"} {log.technician} ({log.device})
              </div>
            ))}
            {logs.length === 0 && (
              <span className="text-slate-500 italic">Nessun log recente.</span>
            )}
          </div>
        </div>
      )}

      {showClearLogsConfirm && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 flex items-center justify-center p-4">
          <div className="p-6 max-w-xs w-full text-center bg-white rounded-xl shadow-xl border-t-4 border-t-red-500">
            <h4 className="font-black text-slate-800 text-sm mb-4">
              Svuotare tutti i log di accesso?
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={executeClearLogs}
                className="py-3 bg-red-600 text-white rounded-lg font-bold text-xs"
              >
                Svuota
              </button>
              <button
                onClick={() => setShowClearLogsConfirm(false)}
                className="py-3 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {importPlaces && (
        <ImportPlacesModal customers={customers} onClose={() => setImportPlaces(false)} color={layoutConfig.themeColor} />
      )}
      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          allCustomers={customers}
          onClose={() => setEditingCustomer(null)}
          color={layoutConfig.themeColor}
        />
      )}
      {editingMachine && (
        <EditMachineModal
          machine={editingMachine}
          customers={customers}
          machineTypes={machineTypes}
          allMachines={machines}
          onClose={() => setEditingMachine(null)}
          themeColor={layoutConfig.themeColor}
        />
      )}
      {mergingItem && (
        <MergeModal
          sourceItem={mergingItem.item}
          type={mergingItem.type}
          defaultTargetId={mergingItem.defaultTargetId}
          allItems={mergingItem.type === "customer" ? customers : machines}
          onClose={() => setMergingItem(null)}
          onConfirm={
            mergingItem.type === "customer"
              ? handleMergeCustomers
              : handleMergeMachines
          }
          color={layoutConfig.themeColor}
        />
      )}
      {duplicateAnalysis && (
        <DuplicatesModal
          analysis={duplicateAnalysis}
          onClose={() => setDuplicateAnalysis(null)}
          onDirectMerge={handleDirectMerge}
          onIgnore={handleIgnoreConflict}
          logs={allLogs}
          machines={machines}
          color={layoutConfig.themeColor}
        />
      )}
      {itemToDelete && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 flex items-center justify-center p-4">
          <div className="p-6 max-w-xs w-full text-center bg-white rounded-xl shadow-xl border-t-4 border-t-red-500">
            <h4 className="font-black text-slate-800 text-sm mb-4">
              Eliminare definitivamente?
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={confirmDeleteAdmin}
                className="py-3 bg-red-600 text-white rounded-lg font-bold text-xs"
              >
                Elimina
              </button>
              <button
                onClick={() => setItemToDelete(null)}
                className="py-3 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs"
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
