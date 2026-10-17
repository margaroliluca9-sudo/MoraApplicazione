import React, { useState, useEffect, useMemo } from "react";
import {
  Factory,
  User,
  Trash2,
  RefreshCw,
  Layers,
  Activity,
  AlertOctagon,
  Terminal,
  Users,
  Palette,
  Bell,
  Wifi,
  WifiOff,
  Edit,
  AlertTriangle,
  Layout,
  GitMerge,
  LogOut,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  writeBatch,
  where,
  getDocs,
} from "firebase/firestore";
import { db, appId } from "../firebase";
import { describeError, getSafeMatricola, getLevenshteinDistance } from "../utils";
import { PRO_INPUT, getButtonPrimaryClass, getProPanelClass } from "../ui";
import { AdminTab } from "../components/AdminTab";
import { EditMachineModal } from "../components/modals/EditMachineModal";
import { EditCustomerModal } from "../components/modals/EditCustomerModal";
import { MergeModal } from "../components/modals/MergeModal";
import { DuplicatesModal } from "../components/modals/DuplicatesModal";

export const AdminPanel = ({
  customers,
  technicians,
  machines,
  machineTypes,
  isMobile,
  layoutConfig,
  onUpdateLayout,
  notificationsEnabled,
  setNotificationsEnabled,
  onLogout,
}) => {
  const [view, setView] = useState("design");
  const [inputValue, setInputValue] = useState("");
  const [logs, setLogs] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
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

  useEffect(() => {
    const unsubIgnored = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "ignored_conflicts"),
      (snap) => {
        setIgnoredConflicts(snap.docs.map((d) => d.id));
      }
    );
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
        collection(db, "artifacts", appId, "public", "data", "active_users"),
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
              grouped[u.technician] = { ...u, allDevices: new Set([u.device]) };
            else {
              grouped[u.technician].allDevices.add(u.device);
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
        unsubIgnored();
      };
    }
    return () => unsubIgnored();
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
    } catch (e) {
      console.error(e);
      alert("Impossibile ignorare il conflitto: " + describeError(e));
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

  const deleteItem = (coll, id) => setItemToDelete({ coll, id });
  const confirmDeleteAdmin = async () => {
    if (!itemToDelete) return;
    try {
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
    } catch (e) {
      console.error(e);
      alert(
        "Unione non completata: " +
          describeError(e) +
          " Alcuni interventi potrebbero essere già stati spostati: riprova l'unione."
      );
    }
  };

  const toggleNotifications = async () => {
    if (!("Notification" in window)) return;
    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        localStorage.setItem("mora_notifications", "true");
        new Notification("Assistenza Mora", { body: "Notifiche attivate!" });
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem("mora_notifications", "false");
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
    } catch (e) {
      console.error(e);
    }
    setShowClearLogsConfirm(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex p-2 rounded-2xl border border-slate-200 overflow-x-auto gap-2 bg-white no-scrollbar">
        <AdminTab
          active={view === "design"}
          onClick={() => setView("design")}
          icon={Palette}
          label="Design"
        />
        <AdminTab
          active={view === "techs"}
          onClick={() => setView("techs")}
          icon={User}
          label="Staff"
        />
        <AdminTab
          active={view === "types"}
          onClick={() => setView("types")}
          icon={Layers}
          label="Tipi"
        />
        <AdminTab
          active={view === "clients"}
          onClick={() => setView("clients")}
          icon={Users}
          label="Clienti"
        />
        <AdminTab
          active={view === "machines"}
          onClick={() => setView("machines")}
          icon={Factory}
          label="Gru"
        />
        <AdminTab
          active={view === "diagnostics"}
          onClick={() => setView("diagnostics")}
          icon={AlertOctagon}
          label="System"
        />
      </div>

      {view === "design" && (
        <div
          className={`p-6 shadow-xl ${getProPanelClass(
            layoutConfig.themeColor
          )}`}
        >
          <h3 className="font-black text-slate-800 mb-4 uppercase">Tema</h3>
          <div className="flex gap-2 mb-6">
            {["blue", "red", "green", "purple", "orange", "slate"].map((c) => (
              <button
                key={c}
                onClick={() =>
                  onUpdateLayout({ ...layoutConfig, themeColor: c })
                }
                className={`w-8 h-8 rounded-full bg-${c}-500 border-2 ${
                  layoutConfig.themeColor === c
                    ? "border-black scale-110"
                    : "border-transparent"
                }`}
              ></button>
            ))}
          </div>
          <button
            onClick={() =>
              onUpdateLayout({
                ...layoutConfig,
                appTitle:
                  prompt("Nuovo Titolo:", layoutConfig.appTitle) ||
                  layoutConfig.appTitle,
              })
            }
            className={`w-full py-3 bg-slate-800 text-white rounded-xl font-bold uppercase text-xs`}
          >
            Cambia Titolo App
          </button>
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
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
            {(view === "techs" ? technicians : machineTypes).map((i) => (
              <div
                key={i.id}
                className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
              >
                <span className="font-bold text-xs uppercase text-slate-700">
                  {String(i.name)}
                </span>
                <button
                  onClick={() =>
                    deleteItem(
                      view === "techs" ? "technicians" : "machine_types",
                      i.id
                    )
                  }
                  className="text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
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
            <h4 className="font-black text-slate-800 uppercase shrink-0">
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
                className="p-2 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-lg hover:bg-yellow-100 flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase hidden md:block">
                  Conflitti
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
                  <span className="font-bold text-xs text-slate-700 truncate">
                    {String(c.name)}
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
            <h4 className="font-black text-slate-800 uppercase shrink-0">
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
                className="p-2 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-lg hover:bg-yellow-100 flex items-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase hidden md:block">
                  Conflitti
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
          <h4 className="font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-yellow-500" /> Notifiche Dispositivo
          </h4>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  notificationsEnabled
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-sm text-slate-800">
                  Avvisi Nuovi Interventi
                </h5>
                <p className="text-[10px] text-slate-500 font-bold uppercase">
                  {notificationsEnabled ? "Attive" : "Disattivate"}
                </p>
              </div>
            </div>
            <button
              onClick={toggleNotifications}
              className={`px-4 py-2 rounded-lg font-bold text-xs uppercase ${
                notificationsEnabled
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-slate-800 text-white"
              }`}
            >
              {notificationsEnabled ? "Disattiva" : "Attiva"}
            </button>
          </div>
          <h4 className="font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" /> Stato Sistema
          </h4>
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
                <h5 className="font-bold text-sm text-slate-800 uppercase">
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
                <h5 className="font-bold text-sm text-red-800 uppercase">
                  Scollega
                </h5>
                <p className="text-[10px] text-red-600 font-bold uppercase">
                  Torna al Login
                </p>
              </div>
            </button>
          </div>
          <div className="flex justify-between items-center mb-4 mt-8">
            <h4 className="font-black text-slate-800 uppercase flex items-center gap-2">
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
            <h4 className="font-black text-slate-800 uppercase text-sm mb-4">
              Svuotare tutti i log di accesso?
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={executeClearLogs}
                className="py-3 bg-red-600 text-white rounded-lg font-bold text-xs uppercase"
              >
                Svuota
              </button>
              <button
                onClick={() => setShowClearLogsConfirm(false)}
                className="py-3 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs uppercase"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
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
          color={layoutConfig.themeColor}
        />
      )}
      {itemToDelete && (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 flex items-center justify-center p-4">
          <div className="p-6 max-w-xs w-full text-center bg-white rounded-xl shadow-xl border-t-4 border-t-red-500">
            <h4 className="font-black text-slate-800 uppercase text-sm mb-4">
              Eliminare definitivamente?
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={confirmDeleteAdmin}
                className="py-3 bg-red-600 text-white rounded-lg font-bold text-xs uppercase"
              >
                Elimina
              </button>
              <button
                onClick={() => setItemToDelete(null)}
                className="py-3 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs uppercase"
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
