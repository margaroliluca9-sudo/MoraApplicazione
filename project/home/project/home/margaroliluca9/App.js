import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Search,
  PlusCircle,
  Save,
  Download,
  HardHat,
  Factory,
  History,
  User,
  X,
  Trash2,
  Lock,
  Settings,
  ChevronRight,
  ChevronDown,
  Monitor,
  Smartphone,
  ShieldCheck,
  FileSpreadsheet,
  RefreshCw,
  Layers,
  Calendar as CalendarIcon,
  ClipboardList,
  Briefcase,
  Printer,
  Activity,
  AlertOctagon,
  Terminal,
  ShieldAlert,
  Power,
  UserX,
  DatabaseZap,
  Users,
  Palette,
  Bell,
  ArrowUp,
  ArrowDown,
  Plus,
  Folder,
  Wifi,
  WifiOff,
  ArrowLeft,
  Edit,
  Maximize2,
  AlertTriangle,
  Trophy,
  PieChart,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Layout,
  Move,
  Filter,
  CalendarDays,
  Database,
  Hammer,
  CheckCircle2,
  AlertCircle,
  Merge,
  LogOut,
  ListTree,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
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
  enableIndexedDbPersistence,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// --- CONFIGURAZIONE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCQ3VhCtvxIP2cxtdSgMzYXaTg4E1zPlZE",
  authDomain: "mora-app-36607.firebaseapp.com",
  projectId: "mora-app-36607",
  storageBucket: "mora-app-36607.firebasestorage.app",
  messagingSenderId: "1039836991600",
  appId: "1:1039836991600:web:dc33445a0cd54a9473e4b5",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Tentativo persistenza
try {
  enableIndexedDbPersistence(db).catch((err) =>
    console.log("Persistenza:", err.code)
  );
} catch (e) {
  console.log("Err Persistenza:", e);
}

const appId = "mora-maintenance-v1";
const ADMIN_PASSWORD = "Mora1932";

// --- CONFIGURAZIONI DEFAULT ---
const DEFAULT_LAYOUT = {
  themeColor: "blue",
  borderRadius: "xl",
  appTitle: "Assistenza Mora",
  dashboardOrder: ["new", "explore", "history", "database", "office", "admin"],
  formOrder: [
    "technician",
    "date",
    "customer",
    "machine",
    "capacity",
    "description",
    "custom",
  ],
  customFields: [],
  formSettings: {
    showMachineId: true,
    showMachineType: true,
    showCapacity: true,
  },
};

// --- STILI GLOBALI (Helpers) ---
const PRO_INPUT =
  "w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400";
const PRO_BUTTON_SECONDARY =
  "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-sm active:scale-95 transition-all font-bold";
const getButtonPrimaryClass = (color) =>
  `bg-${color}-700 text-white shadow-md hover:bg-${color}-800 active:scale-95 transition-all border border-transparent font-bold tracking-wide`;
const getProPanelClass = (color) =>
  `bg-white rounded-xl shadow-md border-t-4 border-t-${color}-600 border-x border-b border-slate-200`;

// ==========================================
// 1. COMPONENTI UI BASE
// ==========================================

const NavButton = React.memo(
  ({ icon: Icon, label, active, onClick, desktop = false, color = "blue" }) => {
    if (desktop) {
      return (
        <button
          onClick={onClick}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
            active
              ? `bg-${color}-700 text-white shadow-md`
              : `text-slate-600 hover:bg-white`
          }`}
        >
          <Icon className="w-4 h-4" /> {label}
        </button>
      );
    }
    return (
      <button
        onClick={onClick}
        className="flex-1 flex flex-col items-center justify-center gap-1 group py-2 transition-all active:scale-95"
      >
        <div
          className={`p-2 rounded-xl transition-all duration-300 ${
            active
              ? `bg-${color}-700 text-white shadow-lg scale-110`
              : "text-slate-400 hover:bg-slate-200"
          }`}
        >
          <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
        </div>
        <span
          className={`text-[9px] font-bold uppercase tracking-tight mt-1 transition-colors ${
            active ? `text-${color}-800` : "text-slate-400"
          }`}
        >
          {label}
        </span>
      </button>
    );
  }
);

const AdminTab = React.memo(
  ({ active, onClick, icon: Icon, label, color = "blue" }) => (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[90px] flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all ${
        active
          ? `bg-${color}-700 text-white shadow-md border-b-4 border-${color}-900`
          : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-300 shadow-sm"
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  )
);

// ==========================================
// 2. MODALI
// ==========================================

const AdminLoginModal = ({
  onSuccess,
  onCancel,
  title = "Admin",
  color = "blue",
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const handleLogin = () => {
    if (pin === ADMIN_PASSWORD) onSuccess();
    else {
      setError(true);
      setPin("");
    }
  };
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className={`shadow-2xl max-w-xs w-full p-8 space-y-6 animate-in zoom-in-95 ${getProPanelClass(
          color
        )} border-t-slate-800`}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-300">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
            {title}
          </h3>
        </div>
        <input
          type="password"
          autoFocus
          className={`w-full p-4 rounded-xl text-center text-2xl font-black outline-none transition-all ${PRO_INPUT} ${
            error
              ? "border-red-500 animate-bounce ring-2 ring-red-100"
              : `focus:border-${color}-500 focus:ring-2 focus:ring-${color}-100`
          }`}
          placeholder="••••"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />
        <div className="flex flex-col gap-3">
          <button
            onClick={handleLogin}
            className={`w-full py-3 rounded-lg font-bold text-xs uppercase transition-transform active:scale-95 ${getButtonPrimaryClass(
              "slate"
            )}`}
          >
            Accedi
          </button>
          <button
            onClick={onCancel}
            className={`w-full py-3 rounded-lg font-bold text-xs uppercase active:scale-95 ${PRO_BUTTON_SECONDARY}`}
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmDialog = ({
  onConfirm,
  onCancel,
  pin,
  setPin,
  error,
  title,
  isFree,
}) => (
  <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
    <div
      className={`p-8 max-w-xs w-full text-center space-y-5 bg-white rounded-xl shadow-md border-t-4 border-t-red-600 border-x border-b border-slate-200`}
    >
      <div
        className={`p-4 rounded-full mx-auto w-fit ${
          isFree ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
        }`}
      >
        <Lock className="w-8 h-8" />
      </div>
      <h4 className="font-bold text-slate-800 uppercase text-sm tracking-widest">
        {title}
      </h4>
      {isFree ? (
        <p className="text-sm text-slate-600 font-medium leading-relaxed">
          Modifica recente: eliminazione consentita senza PIN.
        </p>
      ) : (
        <input
          type="password"
          placeholder="••••"
          className={`w-full p-3 rounded-xl text-center text-xl font-black outline-none transition-all ${PRO_INPUT}`}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onConfirm()}
          autoFocus
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onConfirm}
          className="py-3 bg-red-600 text-white rounded-lg font-bold text-xs uppercase shadow-md hover:bg-red-700 active:scale-95 transition-all"
        >
          Elimina
        </button>
        <button
          onClick={onCancel}
          className={`py-3 rounded-lg font-bold text-xs uppercase active:scale-95 transition-all ${PRO_BUTTON_SECONDARY}`}
        >
          Annulla
        </button>
      </div>
    </div>
  </div>
);

const EditLogModal = ({
  log,
  customers,
  technicians,
  machineTypes,
  onClose,
  color = "blue",
  layoutConfig,
}) => {
  const [data, setData] = useState({ ...log });
  const [loading, setLoading] = useState(false);
  const customFields = layoutConfig?.customFields || [];
  const formSettings =
    layoutConfig?.formSettings || DEFAULT_LAYOUT.formSettings;

  const handleSave = async () => {
    setLoading(true);
    try {
      const newMachineId = data.machineId
        .toUpperCase()
        .replace(/\//g, "-")
        .trim();
      await updateDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "maintenance_logs",
          log.id
        ),
        {
          ...data,
          technician: data.technician,
          customer: data.customer.toUpperCase(),
          machineId: newMachineId,
          machineType: data.machineType,
          capacity: data.capacity,
          description: data.description,
          dateString: data.dateString,
        }
      );
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] ${getProPanelClass(
          color
        )}`}
      >
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">
            Modifica Intervento
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                Tecnico
              </label>
              <select
                className={PRO_INPUT}
                value={data.technician}
                onChange={(e) =>
                  setData({ ...data, technician: e.target.value })
                }
              >
                {technicians.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                Data
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
          <div className="space-y-1">
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
              <div className="space-y-1">
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
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                  Tipo
                </label>
                <select
                  className={PRO_INPUT}
                  value={data.machineType}
                  onChange={(e) =>
                    setData({ ...data, machineType: e.target.value })
                  }
                >
                  {machineTypes.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {formSettings.showCapacity && (
              <div className="space-y-1">
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
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Descrizione
            </label>
            <textarea
              rows="4"
              className={PRO_INPUT}
              value={data.description}
              onChange={(e) =>
                setData({ ...data, description: e.target.value })
              }
            />
          </div>
          {customFields.map((field) => (
            <div key={field.id} className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                {field.label}
              </label>
              <input
                type={field.type || "text"}
                className={PRO_INPUT}
                value={data[field.id] || ""}
                onChange={(e) =>
                  setData((prev) => ({ ...prev, [field.id]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        <div className="p-5 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-3 rounded-lg font-bold text-xs uppercase transition-all active:scale-95 ${getButtonPrimaryClass(
              color
            )}`}
          >
            {loading ? "..." : "Salva Modifiche"}
          </button>
        </div>
      </div>
    </div>
  );
};

const EditMachineModal = ({
  machine,
  customers,
  machineTypes,
  onClose,
  themeColor,
  allMachines,
}) => {
  const [data, setData] = useState({ ...machine });
  const [loading, setLoading] = useState(false);
  const color = themeColor || "blue";

  const handleSave = async () => {
    const newId = data.id.toUpperCase().replace(/\//g, "-").trim();
    const oldId = machine.id;

    if (newId !== oldId && allMachines.some((m) => m.id === newId)) {
      alert("Esiste già una macchina con questa matricola!");
      return;
    }

    setLoading(true);
    try {
      const promises = [];

      // 1. Aggiorna Storico Interventi (Maintenance Logs)
      const qLogs = query(
        collection(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "maintenance_logs"
        ),
        where("machineId", "==", oldId)
      );
      const logsSnap = await getDocs(qLogs);

      logsSnap.forEach((d) => {
        promises.push(
          updateDoc(d.ref, {
            machineId: newId,
            customer: data.customerName.toUpperCase(),
            machineType: data.type,
            capacity: data.capacity,
          })
        );
      });

      // 2. Aggiorna Documento Macchina
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "machines",
        oldId.toLowerCase()
      );

      if (newId !== oldId) {
        promises.push(deleteDoc(docRef));
        promises.push(
          setDoc(
            doc(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              "machines",
              newId.toLowerCase()
            ),
            {
              id: newId,
              customerName: data.customerName.toUpperCase(),
              type: data.type,
              capacity: data.capacity,
            }
          )
        );
      } else {
        promises.push(
          setDoc(
            docRef,
            {
              id: newId,
              customerName: data.customerName.toUpperCase(),
              type: data.type,
              capacity: data.capacity,
            },
            { merge: true }
          )
        );
      }

      await Promise.all(promises);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Errore durante il salvataggio.");
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
              value={data.id}
              onChange={(e) =>
                setData({ ...data, id: e.target.value.toUpperCase() })
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
              value={data.type}
              onChange={(e) => setData({ ...data, type: e.target.value })}
            >
              {machineTypes.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
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

const EditCustomerModal = ({
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
      const promises = [];
      promises.push(
        updateDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "customers",
            customer.id
          ),
          { name: cleanName }
        )
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
      logsSnap.forEach((d) =>
        promises.push(updateDoc(d.ref, { customer: cleanName }))
      );
      const qMachines = query(
        collection(db, "artifacts", appId, "public", "data", "machines"),
        where("customerName", "==", customer.name)
      );
      const machinesSnap = await getDocs(qMachines);
      machinesSnap.forEach((d) =>
        promises.push(updateDoc(d.ref, { customerName: cleanName }))
      );
      await Promise.all(promises);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Errore salvataggio cliente");
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

const MergeModal = ({
  sourceItem,
  allItems,
  onConfirm,
  onClose,
  type,
  color = "blue",
}) => {
  const [targetId, setTargetId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!targetId) return;
    const targetItem = allItems.find((i) => i.id === targetId);
    if (!targetItem) return;
    if (
      !window.confirm(
        `Sei sicuro di voler unire "${
          sourceItem.name || sourceItem.id
        }" dentro "${
          targetItem.name || targetItem.id
        }"? Questa azione è irreversibile.`
      )
    )
      return;
    setLoading(true);
    await onConfirm(sourceItem, targetItem);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[220] flex items-center justify-center p-4 backdrop-blur-md">
      <div
        className={`rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 ${getProPanelClass(
          color
        )} border-t-purple-600`}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
            <Merge className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wider">
            Unisci {type === "customer" ? "Cliente" : "Gru"}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Stai per unire <b>{sourceItem.name || sourceItem.id}</b>. Seleziona
            la destinazione (quello che rimarrà).
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">
            Unisci In (Destinazione)
          </label>
          <select
            className={PRO_INPUT}
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="">Seleziona...</option>
            {allItems
              .filter((i) => i.id !== sourceItem.id)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {type === "customer" ? i.name : `${i.id} (${i.customerName})`}
                </option>
              ))}
          </select>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleConfirm}
            disabled={loading || !targetId}
            className={`w-full py-3 rounded-lg font-bold text-xs uppercase shadow-md transition-all ${getButtonPrimaryClass(
              "purple"
            )}`}
          >
            {loading ? "Unione in corso..." : "Conferma Unione"}
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

// --- MODALI DETTAGLIO ---
const CustomerDetailModal = ({
  customerName,
  machines,
  onClose,
  onOpenMachine,
  color = "blue",
}) => {
  const customerMachines = useMemo(
    () =>
      machines.filter(
        (m) => m.customerName.toUpperCase() === customerName.toUpperCase()
      ),
    [machines, customerName]
  );
  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[210] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className={`w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl ${getProPanelClass(
          color
        )}`}
      >
        <div
          className={`bg-slate-50 p-6 flex flex-col gap-4 border-b border-slate-200 relative overflow-hidden`}
        >
          <div className="flex justify-between items-start relative z-10">
            <button
              onClick={onClose}
              className={`flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm transition-all active:scale-95 group text-slate-600`}
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
              <span className="font-bold text-[10px] uppercase tracking-wider">
                Indietro
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white rounded-full border border-slate-300 hover:bg-slate-100 transition-all text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4 relative z-10 mt-2">
            <div
              className={`p-3 bg-${color}-100 rounded-xl border border-${color}-200 text-${color}-700`}
            >
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight text-slate-800">
                {customerName}
              </h2>
              <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-wider">
                Parco Macchine: {customerMachines.length}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerMachines.map((m) => (
              <div
                key={m.id}
                onClick={() => onOpenMachine(m.id)}
                className={`p-5 rounded-2xl cursor-pointer group transition-all hover:border-${color}-400 hover:shadow-md ${getProPanelClass(
                  color
                )}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`text-xs font-black text-${color}-600 bg-${color}-50 px-2 py-1 rounded-lg uppercase tracking-wider`}
                  >
                    {m.id}
                  </span>
                  <div
                    className={`p-1.5 bg-slate-100 rounded-full text-slate-400 group-hover:text-${color}-500 transition-colors`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700 uppercase">
                    {m.type}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    {m.capacity || "N.D."}
                  </p>
                </div>
              </div>
            ))}
            {customerMachines.length === 0 && (
              <div className="col-span-full text-center py-20 opacity-30">
                <p className="font-bold uppercase text-xs tracking-widest text-slate-500">
                  Nessuna macchina registrata
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MachineHistoryModal = ({
  machineId,
  machines,
  allLogs,
  onClose,
  onOpenCustomer,
  themeColor,
}) => {
  const liveMachine = useMemo(
    () =>
      machines.find((m) => m.id.toLowerCase() === machineId.toLowerCase()) || {
        id: machineId,
        customerName: "N.D.",
        type: "N.D.",
        capacity: "N.D.",
      },
    [machines, machineId]
  );
  const machineLogs = useMemo(
    () =>
      allLogs.filter(
        (l) => l.machineId.toLowerCase() === machineId.toLowerCase()
      ),
    [allLogs, machineId]
  );
  const color = themeColor || "blue";

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className={`w-full max-w-4xl h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl ${getProPanelClass(
          color
        )}`}
      >
        <div
          className={`bg-slate-50 p-6 flex flex-col gap-4 border-b border-slate-200 relative overflow-hidden`}
        >
          <div className="flex justify-between items-start relative z-10">
            <button
              onClick={onClose}
              className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm transition-all active:scale-95 group text-slate-600"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
              <span className="font-bold text-[10px] uppercase tracking-wider">
                Indietro
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white rounded-full border border-slate-300 hover:bg-slate-100 transition-all text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div
              className={`p-3 bg-${color}-100 rounded-xl border border-${color}-200 text-${color}-700`}
            >
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <button
                onClick={() => onOpenCustomer(liveMachine.customerName)}
                className="text-left group/title"
              >
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-tight text-slate-800 hover:text-blue-700 transition-colors underline decoration-slate-300 underline-offset-4 decoration-2">
                  {liveMachine.customerName}
                </h2>
              </button>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 mt-2">
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  MAT: {liveMachine.id}
                </span>
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  {liveMachine.type}
                </span>
                {liveMachine.capacity && (
                  <span className="bg-white px-2 py-1 rounded border border-slate-200">
                    {liveMachine.capacity} kg
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-100">
          <div className="space-y-4">
            {machineLogs.map((log, idx) => (
              <div key={log.id} className="flex gap-4 group">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 bg-${color}-600 rounded-full ring-4 ring-slate-200 mt-1.5 shrink-0`}
                  ></div>
                  {idx !== machineLogs.length - 1 && (
                    <div className="w-0.5 bg-slate-300 flex-1 my-1 rounded-full"></div>
                  )}
                </div>
                <div
                  className={`p-5 rounded-2xl flex-1 relative overflow-hidden group/card transition-all ${getProPanelClass(
                    color
                  )} hover:shadow-md`}
                >
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div
                      className={`flex items-center gap-2 bg-${color}-50 px-2 py-1 rounded-lg border border-${color}-100`}
                    >
                      <CalendarIcon className={`w-3 h-3 text-${color}-600`} />
                      <span
                        className={`text-${color}-800 font-bold text-[10px] uppercase tracking-wider`}
                      >
                        {log.dateString}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg text-slate-500 border border-slate-100">
                      <User className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase tracking-tight">
                        {log.technician}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-700 text-xs md:text-sm leading-relaxed font-medium relative z-10 italic">
                    "{log.description}"
                  </p>
                </div>
              </div>
            ))}
            {machineLogs.length === 0 && (
              <div className="text-center py-20 opacity-30">
                <ClipboardList className="w-16 h-16 mx-auto mb-2 text-slate-400" />
                <p className="font-bold uppercase text-xs tracking-widest text-slate-500">
                  Nessun dato
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. VISTE PRINCIPALI
// ==========================================

// --- NUOVA VISTA ESPLORA (GERARCHIA) ---
const ExploreView = React.memo(
  ({ customers, machines, logs, color = "blue" }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedCustomer, setExpandedCustomer] = useState(null);
    const [expandedMachine, setExpandedMachine] = useState(null);

    const filteredCustomers = useMemo(() => {
      if (!searchTerm) return customers;
      return customers.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [customers, searchTerm]);

    const getCustomerMachines = useCallback(
      (customerName) => {
        return machines.filter((m) => m.customerName === customerName);
      },
      [machines]
    );

    const getMachineLogs = useCallback(
      (machineId) => {
        return logs.filter((l) => l.machineId === machineId);
      },
      [logs]
    );

    const toggleCustomer = (cName) => {
      setExpandedCustomer((prev) => (prev === cName ? null : cName));
      setExpandedMachine(null);
    };

    const toggleMachine = (e, mId) => {
      e.stopPropagation();
      setExpandedMachine((prev) => (prev === mId ? null : mId));
    };

    return (
      <div className="h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-500">
        <div className={`p-4 ${getProPanelClass(color)} mb-4`}>
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca Cliente..."
              className={PRO_INPUT}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-3 top-3.5 text-slate-400 w-5 h-5" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pb-20">
          {filteredCustomers.map((c) => {
            const isCustExpanded = expandedCustomer === c.name;
            const myMachines = isCustExpanded
              ? getCustomerMachines(c.name)
              : [];

            return (
              <div
                key={c.id}
                className={`bg-white rounded-xl shadow-sm border transition-all duration-300 overflow-hidden ${
                  isCustExpanded
                    ? `border-${color}-500 ring-1 ring-${color}-200`
                    : "border-slate-200"
                }`}
              >
                <div
                  onClick={() => toggleCustomer(c.name)}
                  className="p-4 flex justify-between items-center cursor-pointer bg-slate-50 hover:bg-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <Users
                      className={`w-5 h-5 ${
                        isCustExpanded ? `text-${color}-600` : "text-slate-400"
                      }`}
                    />
                    <span className="font-bold text-sm text-slate-700">
                      {c.name}
                    </span>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
                      isCustExpanded ? "rotate-90" : ""
                    }`}
                  />
                </div>

                {isCustExpanded && (
                  <div className="bg-white border-t border-slate-100">
                    {myMachines.length === 0 && (
                      <div className="p-4 text-xs text-slate-400 italic text-center">
                        Nessuna gru registrata.
                      </div>
                    )}
                    {myMachines.map((m) => {
                      const isMachExpanded = expandedMachine === m.id;
                      const myLogs = isMachExpanded ? getMachineLogs(m.id) : [];

                      return (
                        <div
                          key={m.id}
                          className="border-b border-slate-50 last:border-0"
                        >
                          <div
                            onClick={(e) => toggleMachine(e, m.id)}
                            className="p-3 pl-8 flex justify-between items-center cursor-pointer hover:bg-blue-50/50"
                          >
                            <div className="flex items-center gap-3">
                              <Factory
                                className={`w-4 h-4 ${
                                  isMachExpanded
                                    ? "text-orange-500"
                                    : "text-slate-300"
                                }`}
                              />
                              <div>
                                <span className="text-xs font-black text-slate-700 block">
                                  {m.id}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 rounded border border-slate-200 uppercase">
                                    {m.type}
                                  </span>
                                  {m.capacity && (
                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 rounded border border-slate-200 uppercase">
                                      {m.capacity} kg
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ChevronRight
                              className={`w-3 h-3 text-slate-300 transition-transform duration-300 ${
                                isMachExpanded ? "rotate-90" : ""
                              }`}
                            />
                          </div>

                          {isMachExpanded && (
                            <div className="bg-slate-50/50 p-2 pl-12 space-y-2">
                              {myLogs.length === 0 && (
                                <div className="text-[10px] text-slate-400 italic">
                                  Nessun intervento.
                                </div>
                              )}
                              {myLogs.map((l) => (
                                <div
                                  key={l.id}
                                  className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative"
                                >
                                  <div className="flex justify-between mb-1">
                                    <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                                      {l.dateString}
                                    </span>
                                    <span className="text-[9px] font-bold text-blue-600">
                                      {l.technician}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 leading-relaxed">
                                    "{l.description}"
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

const DatabaseView = ({
  customers,
  machines,
  logs,
  themeColor,
  onOpenCustomer,
  onOpenMachine,
}) => {
  const [tab, setTab] = useState("customers");
  const [searchTerm, setSearchTerm] = useState("");
  const color = themeColor || "blue";

  const filteredData = useMemo(() => {
    const s = searchTerm.toLowerCase();
    if (tab === "customers")
      return customers.filter(
        (c) => c.name && c.name.toLowerCase().includes(s)
      );
    if (tab === "machines")
      return machines.filter(
        (m) =>
          (m.id && m.id.toLowerCase().includes(s)) ||
          (m.customerName && m.customerName.toLowerCase().includes(s))
      );
    if (tab === "logs")
      return logs.filter(
        (l) =>
          (l.description && l.description.toLowerCase().includes(s)) ||
          (l.machineId && l.machineId.toLowerCase().includes(s)) ||
          (l.customer && l.customer.toLowerCase().includes(s))
      );
    return [];
  }, [tab, searchTerm, customers, machines, logs]);

  return (
    <div
      className={`h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-500 ${getProPanelClass(
        color
      )} overflow-hidden`}
    >
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTab("customers")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
              tab === "customers"
                ? `bg-${color}-600 text-white shadow-md`
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Clienti
          </button>
          <button
            onClick={() => setTab("machines")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
              tab === "machines"
                ? `bg-${color}-600 text-white shadow-md`
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Gru
          </button>
          <button
            onClick={() => setTab("logs")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
              tab === "logs"
                ? `bg-${color}-600 text-white shadow-md`
                : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Interventi
          </button>
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Cerca nel database..."
            className={PRO_INPUT}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute right-3 top-3 text-slate-400 w-5 h-5" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 bg-slate-100 custom-scrollbar">
        {filteredData.length === 0 && (
          <div className="text-center py-10 opacity-40 font-bold text-slate-500 uppercase text-xs">
            Nessun dato trovato
          </div>
        )}
        {tab === "customers" &&
          filteredData.map((c) => (
            <div
              key={c.id}
              onClick={() => onOpenCustomer(c.name)}
              className="p-4 mb-2 bg-white rounded-xl shadow-sm border border-slate-200 flex justify-between items-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                  <Users className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-slate-700">
                  {c.name}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          ))}
        {tab === "machines" &&
          filteredData.map((m) => (
            <div
              key={m.id}
              onClick={() => onOpenMachine(m.id)}
              className="p-4 mb-2 bg-white rounded-xl shadow-sm border border-slate-200 flex justify-between items-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div>
                <span className="font-black text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                  {m.id}
                </span>
                <p className="text-[10px] font-bold text-slate-500 mt-1">
                  {m.customerName}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block">
                  {m.type}
                </span>
              </div>
            </div>
          ))}
        {tab === "logs" &&
          filteredData.map((l) => (
            <div
              key={l.id}
              className="p-4 mb-2 bg-white rounded-xl shadow-sm border border-slate-200 transition-all"
            >
              <div className="flex justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {l.dateString}
                </span>
                <span className="text-[10px] font-bold text-blue-600">
                  {l.technician}
                </span>
              </div>
              <div className="font-bold text-xs text-slate-800 mb-1">
                {l.customer} - {l.machineId}
              </div>
              <p className="text-[11px] text-slate-500 italic line-clamp-2">
                "{l.description}"
              </p>
            </div>
          ))}
      </div>
    </div>
  );
};

const SimpleCalendar = ({ logs, onDayClick }) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const startDay = firstDay === 0 ? 6 : firstDay - 1;
  const monthNames = [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre",
  ];

  const getInterventionsForDay = (day) =>
    logs.filter((l) => {
      const parts = l.dateString.split("/");
      return (
        parseInt(parts[0]) === day &&
        parseInt(parts[1]) === currentMonth + 1 &&
        parseInt(parts[2]) === currentYear
      );
    });

  return (
    <div className={`p-5 rounded-3xl relative ${getProPanelClass("blue")}`}>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() =>
            setCurrentMonth((prev) => (prev === 0 ? 11 : prev - 1))
          }
          className="p-2 hover:bg-slate-100 rounded-full"
        >
          <ChevronDown className="w-5 h-5 rotate-90" />
        </button>
        <h3 className="font-black text-slate-800 uppercase">
          {monthNames[currentMonth]} {currentYear}
        </h3>
        <button
          onClick={() =>
            setCurrentMonth((prev) => (prev === 11 ? 0 : prev + 1))
          }
          className="p-2 hover:bg-slate-100 rounded-full"
        >
          <ChevronDown className="w-5 h-5 -rotate-90" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
        <div>LU</div>
        <div>MA</div>
        <div>ME</div>
        <div>GI</div>
        <div>VE</div>
        <div>SA</div>
        <div>DO</div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dailyLogs = getInterventionsForDay(day);
          const count = dailyLogs.length;
          return (
            <div
              key={day}
              onClick={() =>
                count > 0 &&
                onDayClick(
                  dailyLogs,
                  `${day} ${monthNames[currentMonth]} ${currentYear}`
                )
              }
              className={`h-9 flex flex-col items-center justify-center rounded-lg border transition-all cursor-pointer ${
                count > 0
                  ? "bg-blue-50 border-blue-200 hover:bg-blue-100"
                  : "border-transparent hover:bg-slate-50"
              }`}
            >
              <span
                className={`text-xs ${
                  count > 0 ? "font-black text-blue-600" : "text-slate-400"
                }`}
              >
                {day}
              </span>
              {count > 0 && (
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-0.5"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- OFFICE VIEW (CON STATISTICHE AVANZATE RIPRISTINATE) ---
const OfficeView = ({
  logs,
  machines,
  customers,
  layoutConfig,
  technicians,
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedTech, setSelectedTech] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showMachineSuggestions, setShowMachineSuggestions] = useState(false);
  const [popoverData, setPopoverData] = useState(null);
  const color = layoutConfig?.themeColor || "blue";

  // Statistiche Avanzate ripristinate
  const advancedStats = useMemo(() => {
    const techCounts = {};
    const machineTypeCounts = {};
    const customerCounts = {};

    logs.forEach((l) => {
      if (l.technician)
        techCounts[l.technician] = (techCounts[l.technician] || 0) + 1;
      if (l.machineType)
        machineTypeCounts[l.machineType] =
          (machineTypeCounts[l.machineType] || 0) + 1;
      if (l.customer)
        customerCounts[l.customer] = (customerCounts[l.customer] || 0) + 1;
    });

    return {
      topTechs: Object.entries(techCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
      topMachineTypes: Object.entries(machineTypeCounts).sort(
        ([, a], [, b]) => b - a
      ),
      topCustomers: Object.entries(customerCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5),
    };
  }, [logs]);

  const stats = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    let year = 0,
      month = 0;
    logs.forEach((l) => {
      if (!l.dateString) return;
      const [d, m, y] = l.dateString.split("/").map(Number);
      if (y === curYear) {
        year++;
        if (m === curMonth) month++;
      }
    });
    return { total: logs.length, year, month };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      let matches = true;
      if (startDate || endDate) {
        const [d, m, y] = log.dateString.split("/").map(Number);
        const logDate = new Date(y, m - 1, d);
        if (startDate && logDate < new Date(startDate)) matches = false;
        if (endDate && logDate > new Date(endDate)) matches = false;
      }
      if (
        matches &&
        selectedCustomer &&
        !log.customer.includes(selectedCustomer.toUpperCase())
      )
        matches = false;
      if (
        matches &&
        selectedMachine &&
        !log.machineId.includes(selectedMachine.toUpperCase())
      )
        matches = false;
      if (matches && selectedTech && log.technician !== selectedTech)
        matches = false;
      return matches;
    });
  }, [
    logs,
    startDate,
    endDate,
    selectedCustomer,
    selectedMachine,
    selectedTech,
  ]);

  const generatePDF = () => {
    if (filteredLogs.length === 0) return alert("Nessun intervento trovato.");

    // Su mobile apre un nuovo tab pulito
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Impossibile aprire il report. Verifica il blocco popup.");
      return;
    }

    const today = new Date().toLocaleDateString("it-IT");

    const css = `
        @page { size: A4; margin: 2cm; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.5; margin: 0; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; color: #0f172a; text-transform: uppercase; font-size: 24px; letter-spacing: 1px; }
        .header p { margin: 5px 0 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #64748b; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .meta div { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
        th { background: #0f172a; color: white; text-transform: uppercase; font-weight: bold; padding: 12px 10px; text-align: left; }
        td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        .description { font-style: italic; color: #475569; }
        
        /* Toolbar visibile solo a schermo */
        .no-print { 
            position: sticky; top: 0; background: #f1f5f9; padding: 15px; text-align: right; 
            border-bottom: 1px solid #cbd5e1; margin: -20px -20px 20px -20px; 
            display: flex; justify-content: flex-end; gap: 10px;
        }
        .btn { padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 12px; border: none; }
        .btn-print { background-color: #0f172a; color: white; }
        .btn-close { background-color: #e2e8f0; color: #475569; }

        @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 0; }
        }
    `;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Report Interventi</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${css}</style>
        </head>
        <body>
            <div class="no-print">
                <button class="btn btn-close" onclick="window.close()">Chiudi</button>
                <button class="btn btn-print" onclick="window.print()">Stampa / Salva PDF</button>
            </div>
            <div class="header">
                <h1>${layoutConfig?.appTitle || "Assistenza Tecnica"}</h1>
                <p>Report Interventi Tecnici</p>
            </div>
            <div class="meta">
                <div>Generato il: ${today}</div>
                <div>Totale Interventi: ${filteredLogs.length}</div>
                <div>Periodo: ${
                  startDate
                    ? new Date(startDate).toLocaleDateString()
                    : "Inizio"
                } - ${
      endDate ? new Date(endDate).toLocaleDateString() : "Oggi"
    }</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 15%">Data / Tecnico</th>
                        <th style="width: 25%">Cliente / Impianto</th>
                        <th style="width: 60%">Descrizione Lavoro</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredLogs
                      .map(
                        (l) => `
                        <tr>
                            <td>
                                <div style="font-weight: bold;">${
                                  l.dateString
                                }</div>
                                <div style="color: #64748b; font-size: 11px; margin-top: 4px;">${
                                  l.technician
                                }</div>
                            </td>
                            <td>
                                <div style="font-weight: bold; color: #0f172a;">${
                                  l.customer
                                }</div>
                                <div style="color: #64748b; font-size: 11px; margin-top: 4px;">Mat: ${
                                  l.machineId
                                }</div>
                                <div style="color: #94a3b8; font-size: 10px;">
                                    ${l.machineType} ${
                          l.capacity ? `- ${l.capacity} kg` : ""
                        }
                                </div>
                            </td>
                            <td style="color: #334155; line-height: 1.6;">
                                ${l.description.replace(/\n/g, "<br>")}
                            </td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
            <div class="footer">
                Documento generato automaticamente dal sistema di gestione.
            </div>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDownloadExcel = () => {
    if (filteredLogs.length === 0) return alert("Nessun dato.");
    const headers = ["Data", "Tecnico", "Cliente", "Matricola", "Descrizione"];
    const rows = filteredLogs.map((l) => [
      l.dateString,
      l.technician,
      l.customer,
      l.machineId,
      `"${l.description.replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", "report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* STATS CARDS */}
      <div className={`p-6 ${getProPanelClass(color)} bg-white`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 bg-${color}-50 text-${color}-700 rounded-lg`}>
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Panoramica
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Statistiche
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Totali
            </span>
            <div className="text-2xl font-black text-slate-800">
              {stats.total}
            </div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Anno
            </span>
            <div className="text-2xl font-black text-blue-600">
              {stats.year}
            </div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Mese
            </span>
            <div className="text-2xl font-black text-emerald-600">
              {stats.month}
            </div>
          </div>
        </div>
      </div>

      {/* ADVANCED STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-5 ${getProPanelClass(color)}`}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h4 className="text-xs font-black uppercase text-slate-600">
              Top Tecnici
            </h4>
          </div>
          <div className="space-y-3">
            {advancedStats.topTechs.map(([tech, count], i) => (
              <div
                key={tech}
                className="flex justify-between text-xs items-center"
              >
                <div className="flex gap-2">
                  <span
                    className={`font-bold w-5 h-5 flex items-center justify-center rounded-full text-[9px] ${
                      i === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-bold text-slate-700">{tech}</span>
                </div>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className={`p-5 ${getProPanelClass(color)}`}>
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-purple-500" />
            <h4 className="text-xs font-black uppercase text-slate-600">
              Tipi Macchina
            </h4>
          </div>
          <div className="space-y-3">
            {advancedStats.topMachineTypes.slice(0, 5).map(([type, count]) => {
              const pct = Math.round((count / stats.total) * 100) || 0;
              return (
                <div key={type}>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>{type}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className={`p-5 ${getProPanelClass(color)}`}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            <h4 className="text-xs font-black uppercase text-slate-600">
              Top Clienti
            </h4>
          </div>
          <div className="space-y-3">
            {advancedStats.topCustomers.map(([cust, count]) => (
              <div
                key={cust}
                className="flex justify-between text-xs items-center border-b border-slate-50 pb-2 last:border-0"
              >
                <span className="font-bold text-slate-700 truncate max-w-[120px]">
                  {cust}
                </span>
                <span className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* EXPORT SECTION */}
      <div className={`p-6 ${getProPanelClass(color)} border-t-indigo-600`}>
        <div className="flex items-center gap-3 mb-4">
          <Printer className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-black text-slate-800 uppercase">
            Esporta Report
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Filtra Cliente..."
              className={PRO_INPUT}
              value={selectedCustomer}
              onChange={(e) => {
                setSelectedCustomer(e.target.value);
                setShowCustomerSuggestions(true);
              }}
            />
            {showCustomerSuggestions && selectedCustomer && (
              <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {customers
                  .filter((c) =>
                    c.name.includes(selectedCustomer.toUpperCase())
                  )
                  .map((c) => (
                    <li
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c.name);
                        setShowCustomerSuggestions(false);
                      }}
                      className="p-3 hover:bg-slate-50 cursor-pointer font-bold text-xs uppercase text-slate-700 border-b border-slate-50"
                    >
                      {c.name}
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Filtra Gru..."
              className={PRO_INPUT}
              value={selectedMachine}
              onChange={(e) => {
                setSelectedMachine(e.target.value);
                setShowMachineSuggestions(true);
              }}
            />
            {showMachineSuggestions && selectedMachine && (
              <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {machines
                  .filter((m) => m.id.includes(selectedMachine.toUpperCase()))
                  .map((m) => (
                    <li
                      key={m.id}
                      onClick={() => {
                        setSelectedMachine(m.id);
                        setShowMachineSuggestions(false);
                      }}
                      className="p-3 hover:bg-slate-50 cursor-pointer font-bold text-xs uppercase text-slate-700 border-b border-slate-50"
                    >
                      {m.id}
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <select
            className={PRO_INPUT}
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
          >
            <option value="">Tutti i Tecnici</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            className={PRO_INPUT}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className={PRO_INPUT}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="mt-4 flex gap-4">
          <button
            onClick={generatePDF}
            className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs text-white bg-slate-800 hover:bg-slate-900 shadow-md`}
          >
            PDF
          </button>
          <button
            onClick={handleDownloadExcel}
            className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-md`}
          >
            Excel
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 ml-1">
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Calendario
          </h4>
        </div>
        <SimpleCalendar
          logs={logs}
          onDayClick={(dayLogs, dateLabel) =>
            setPopoverData({ logs: dayLogs, date: dateLabel })
          }
        />
      </div>

      {popoverData && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPopoverData(null)}
        >
          <div
            className={`p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95 ${getProPanelClass(
              color
            )}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 uppercase tracking-tight">
                {popoverData.date}
              </h3>
              <button onClick={() => setPopoverData(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-3 custom-scrollbar">
              {popoverData.logs.map((l, i) => (
                <div
                  key={i}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-100"
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {l.technician}
                    </span>
                    <span className="text-[10px] font-black text-blue-600">
                      {l.machineId}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {l.customer}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    "{l.description}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- NEW ENTRY FORM (LOGICA RESET RIPRISTINATA) ---
const NewEntryForm = ({
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
    customer: "",
    machineType: "",
    machineId: "",
    capacity: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMachineSuggestions, setShowMachineSuggestions] = useState(false);
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [relatedMachines, setRelatedMachines] = useState([]);
  const [lastIntervention, setLastIntervention] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const color = layoutConfig?.themeColor || "blue";
  const formOrder = layoutConfig?.formOrder || DEFAULT_LAYOUT.formOrder;

  // TOP 3 TECHS CALCULATION
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

  useEffect(() => {
    const saved = localStorage.getItem("mora_tech_last_name");
    if (saved) {
      setFormData((prev) => ({ ...prev, technician: saved }));
      setIsLocked(true);
    }
  }, []);

  // RIPRISTINATA LOGICA ORIGINALE DI RESET E LAST INTERVENTION
  const handleMachineIdChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/\//g, "-");

    // Se l'input è vuoto, resetta tutto
    if (val === "") {
      setFormData((p) => ({
        ...p,
        machineId: "",
        customer: "",
        machineType: "",
        capacity: "",
      }));
      setRelatedMachines([]);
      setShowMachineSuggestions(false);
      setLastIntervention(null);
      return;
    }

    const found = machines.find((m) => m.id === val);
    if (found) {
      setFormData((p) => ({
        ...p,
        machineId: val,
        customer: found.customerName,
        machineType: found.type,
        capacity: found.capacity,
      }));
      setRelatedMachines([]);

      // Find last log
      if (allLogs) {
        const logs = allLogs.filter((l) => l.machineId === val);
        setLastIntervention(logs.length > 0 ? logs[0] : null);
      }
    } else {
      setFormData((p) => ({ ...p, machineId: val }));
      setLastIntervention(null);
    }
    setShowMachineSuggestions(true);
  };

  const handleCustomerChange = (e) => {
    const val = e.target.value.toUpperCase();
    // Se cancello il cliente, resetta tutto
    if (val === "") {
      setFormData((p) => ({
        ...p,
        customer: "",
        machineId: "",
        machineType: "",
        capacity: "",
      }));
      setRelatedMachines([]);
      setLastIntervention(null);
      return;
    }
    setFormData((p) => ({ ...p, customer: val }));
    setRelatedMachines(machines.filter((m) => m.customerName.includes(val)));
    setShowCustomerSuggestions(true);
  };

  const selectMachine = (m) => {
    setFormData((p) => ({
      ...p,
      machineId: m.id,
      customer: m.customerName,
      machineType: m.type,
      capacity: m.capacity,
    }));
    setShowMachineSuggestions(false);
    setRelatedMachines([]);
    if (allLogs) {
      const logs = allLogs.filter((l) => l.machineId === m.id);
      setLastIntervention(logs.length > 0 ? logs[0] : null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.technician || !formData.customer || !formData.description)
      return alert("Compila i campi obbligatori");
    setIsSubmitting(true);
    try {
      if (onTechUpdate) onTechUpdate(formData.technician);
      localStorage.setItem("mora_tech_last_name", formData.technician);

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
          ...formData,
          machineId: formData.machineId.toUpperCase(),
          customer: formData.customer.toUpperCase(),
          dateString: new Date().toLocaleDateString("it-IT"),
          userId: user.uid,
          createdAt: serverTimestamp(),
        }
      );

      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "machines",
          formData.machineId.toLowerCase()
        ),
        {
          id: formData.machineId,
          customerName: formData.customer.toUpperCase(),
          type: formData.machineType,
          capacity: formData.capacity,
        },
        { merge: true }
      );

      const custId = formData.customer.toLowerCase().replace(/\s+/g, "_");
      await setDoc(
        doc(db, "artifacts", appId, "public", "data", "customers", custId),
        { name: formData.customer.toUpperCase() },
        { merge: true }
      );

      onSuccess();
      // Lock after successful submission
      setIsLocked(true);
    } catch (e) {
      console.error(e);
      alert("Errore salvataggio");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (key) => {
    switch (key) {
      case "technician":
        return (
          <div key="tech" className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Tecnico
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
                    {technicians.map((t) => (
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
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              {showMachineSuggestions && (
                <ul className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                  {machines
                    .filter(
                      (m) =>
                        (!formData.customer ||
                          m.customerName === formData.customer) &&
                        (!formData.machineId ||
                          m.id.includes(formData.machineId.toUpperCase()))
                    )
                    .slice(0, 50)
                    .map((m) => (
                      <li
                        key={m.id}
                        onClick={() => selectMachine(m)}
                        className="p-3 hover:bg-slate-50 cursor-pointer font-bold text-xs uppercase text-slate-700 border-b border-slate-50 flex justify-between items-center"
                      >
                        <span>{m.id}</span>
                        <span className="text-[9px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {m.type}
                        </span>
                      </li>
                    ))}
                  {machines.length === 0 && (
                    <li className="p-3 text-xs text-slate-400">
                      Nessuna gru trovata
                    </li>
                  )}
                </ul>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                Tipo
              </label>
              <select
                className={PRO_INPUT}
                value={formData.machineType}
                onChange={(e) =>
                  setFormData({ ...formData, machineType: e.target.value })
                }
              >
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
              Cliente
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
                      onClick={() => {
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
                        {m.id}
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
              Descrizione
            </label>
            <textarea
              rows="4"
              className={PRO_INPUT}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
        );
      case "capacity":
        return layoutConfig.formSettings.showCapacity ? (
          <div key="cap" className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Portata
            </label>
            <input
              type="text"
              className={PRO_INPUT}
              value={formData.capacity}
              onChange={(e) =>
                setFormData({ ...formData, capacity: e.target.value })
              }
            />
          </div>
        ) : null;
      case "date":
        return (
          <div key="date" className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Data (Opzionale)
            </label>
            <div className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 font-bold flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {new Date().toLocaleDateString("it-IT")}
            </div>
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

        {/* LAST INTERVENTION ALERT - REINTEGRATED */}
        {lastIntervention && (
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 animate-in fade-in slide-in-from-top-2 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide">
                Ultimo Intervento ({lastIntervention.dateString})
              </h4>
            </div>
            <p className="text-sm text-amber-900 italic leading-relaxed">
              "{lastIntervention.description}"
            </p>
            <div className="text-[10px] text-amber-700 mt-2 font-bold text-right uppercase tracking-wider">
              - {lastIntervention.technician}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 ${getButtonPrimaryClass(
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
      </form>
    </div>
  );
};

// --- HISTORY VIEW (CLICCABILE) ---
const HistoryView = ({
  logs,
  machines,
  customers,
  technicians,
  machineTypes,
  loading,
  isMobile,
  onAuthAdmin,
  isAdmin,
  layoutConfig,
  onOpenCustomer,
  onOpenMachine,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(null);
  const [isEditing, setIsEditing] = useState(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [isFreeAction, setIsFreeAction] = useState(false);
  const color = layoutConfig?.themeColor || "blue";

  const filtered = logs.filter((l) => {
    const s = searchTerm.toLowerCase();
    return (
      (l.customer && l.customer.toLowerCase().includes(s)) ||
      (l.machineId && l.machineId.toLowerCase().includes(s)) ||
      (l.description && l.description.toLowerCase().includes(s))
    );
  });

  const ITEMS_PER_PAGE = 50;
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  const handleDelete = (log) => {
    const isRecent =
      log.createdAt &&
      Date.now() - log.createdAt.seconds * 1000 < 3 * 60 * 1000;
    if (isAdmin || isRecent) {
      setIsFreeAction(isRecent && !isAdmin);
      setIsDeleting(log.id);
    } else onAuthAdmin();
  };

  const handleEdit = (log) => {
    const isRecent =
      log.createdAt &&
      Date.now() - log.createdAt.seconds * 1000 < 3 * 60 * 1000;
    if (isAdmin || isRecent) setIsEditing(log.id);
    else onAuthAdmin();
  };

  const confirmDelete = async () => {
    if (!isFreeAction && pin !== ADMIN_PASSWORD) return setErr(true);
    await deleteDoc(
      doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "maintenance_logs",
        isDeleting
      )
    );
    setIsDeleting(null);
    setPin("");
  };

  if (loading)
    return (
      <div className="py-20 text-center">
        <RefreshCw className="animate-spin mx-auto text-slate-400" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div
        className={`relative group max-w-xl mx-auto shadow-lg rounded-2xl ${getProPanelClass(
          color
        )}`}
      >
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          placeholder="Cerca..."
          className="w-full pl-14 pr-6 py-4 bg-transparent font-bold outline-none text-sm placeholder-slate-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div
        className={`rounded-3xl overflow-hidden shadow-xl ${getProPanelClass(
          color
        )}`}
      >
        {isMobile ? (
          <div className="divide-y divide-slate-100">
            {paginated.map((log) => (
              <div
                key={log.id}
                className="p-5 space-y-3 hover:bg-slate-50 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4
                      className="font-black text-slate-800 uppercase text-sm hover:text-blue-600 hover:underline cursor-pointer"
                      onClick={() => onOpenCustomer(log.customer)}
                    >
                      {log.customer}
                    </h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span
                        className={`text-[10px] font-bold text-${color}-700 bg-${color}-50 px-2 py-0.5 rounded uppercase cursor-pointer hover:bg-${color}-100`}
                        onClick={() => onOpenMachine(log.machineId)}
                      >
                        MAT: {log.machineId}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                        {log.machineType}
                      </span>
                      {log.capacity && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                          {log.capacity} kg
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase">
                    {log.dateString}
                  </span>
                </div>
                <p className="text-slate-600 text-xs italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                  "{log.description}"
                </p>
                <div className="flex justify-between items-center pt-1">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-bold uppercase text-slate-600">
                      {log.technician}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(log)}
                      className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:text-blue-500"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(log)}
                      className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-left table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase w-[100px]">
                  Data
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase w-[180px]">
                  Cliente
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                  Descrizione
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase w-[140px]">
                  Tecnico
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center w-[100px]">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 group">
                  <td className="px-6 py-4 text-xs font-bold text-slate-500">
                    {log.dateString}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span
                        className="font-bold text-slate-800 uppercase text-xs cursor-pointer hover:text-blue-600 hover:underline"
                        onClick={() => onOpenCustomer(log.customer)}
                      >
                        {log.customer}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span
                          className={`text-[10px] text-${color}-600 font-bold cursor-pointer hover:underline`}
                          onClick={() => onOpenMachine(log.machineId)}
                        >
                          {log.machineId}
                        </span>
                        <span className="text-[10px] text-slate-500 border-l border-slate-300 pl-1 ml-1">
                          {log.machineType}
                        </span>
                        {log.capacity && (
                          <span className="text-[10px] text-slate-500 border-l border-slate-300 pl-1 ml-1">
                            {log.capacity} kg
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 italic break-words whitespace-pre-wrap">
                    "{log.description}"
                  </td>
                  <td className="px-6 py-4 text-[10px] font-bold uppercase text-slate-600">
                    {log.technician}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(log)}
                        className={`text-${color}-500 hover:scale-110`}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(log)}
                        className="text-red-500 hover:scale-110"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="p-4 flex justify-between">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-xs font-bold"
            >
              Prec
            </button>
            <span className="text-xs">
              {page}/{totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs font-bold"
            >
              Succ
            </button>
          </div>
        )}
      </div>
      {isDeleting && (
        <DeleteConfirmDialog
          onConfirm={confirmDelete}
          onCancel={() => setIsDeleting(null)}
          pin={pin}
          setPin={setPin}
          error={err}
          title="Elimina"
          isFree={isFreeAction}
        />
      )}
      {isEditing && (
        <EditLogModal
          log={logs.find((l) => l.id === isEditing)}
          customers={customers}
          technicians={technicians}
          machineTypes={machineTypes}
          onClose={() => setIsEditing(null)}
          color={color}
          layoutConfig={layoutConfig}
        />
      )}
    </div>
  );
};

// --- ADMIN PANEL ---
const AdminPanel = ({
  customers,
  technicians,
  machines,
  machineTypes,
  isMobile,
  layoutConfig,
  onUpdateLayout,
}) => {
  const [view, setView] = useState("design");
  const [inputValue, setInputValue] = useState("");
  const [logs, setLogs] = useState([]); // Per diagnostica
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingMachine, setEditingMachine] = useState(null);
  const [mergingItem, setMergingItem] = useState(null);

  useEffect(() => {
    if (view === "diagnostics") {
      const unsub = onSnapshot(
        query(
          collection(db, "artifacts", appId, "public", "data", "access_logs"),
          orderBy("timestamp", "desc"),
          limit(20)
        ),
        (s) => {
          setLogs(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      );
      return () => unsub();
    }
  }, [view]);

  const addItem = async () => {
    if (!inputValue) return;
    const coll = view === "techs" ? "technicians" : "machine_types";
    const id = inputValue.toLowerCase().replace(/\s+/g, "_");
    await setDoc(doc(db, "artifacts", appId, "public", "data", coll, id), {
      name: inputValue,
    });
    setInputValue("");
  };

  const deleteItem = async (coll, id) => {
    if (window.confirm("Eliminare definitivamente?"))
      await deleteDoc(doc(db, "artifacts", appId, "public", "data", coll, id));
  };

  const handleMergeCustomers = async (source, target) => {
    const qLogs = query(
      collection(db, "artifacts", appId, "public", "data", "maintenance_logs"),
      where("customer", "==", source.name)
    );
    const logsSnap = await getDocs(qLogs);
    const qMachines = query(
      collection(db, "artifacts", appId, "public", "data", "machines"),
      where("customerName", "==", source.name)
    );
    const machinesSnap = await getDocs(qMachines);
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
    const qLogs = query(
      collection(db, "artifacts", appId, "public", "data", "maintenance_logs"),
      where("machineId", "==", source.id)
    );
    const logsSnap = await getDocs(qLogs);
    const promises = [];
    logsSnap.forEach((d) =>
      promises.push(
        updateDoc(d.ref, {
          machineId: target.id,
          machineType: target.type,
          capacity: target.capacity,
        })
      )
    );
    await Promise.all(promises);
    await deleteDoc(
      doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "machines",
        source.id.toLowerCase()
      )
    );
    setMergingItem(null);
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
          <h4 className="font-black text-slate-800 uppercase mb-4">
            Lista Clienti ({customers.length})
          </h4>
          <div className="max-h-[400px] overflow-y-auto space-y-2 custom-scrollbar">
            {customers.map((c) => (
              <div
                key={c.id}
                className="flex justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl items-center group"
              >
                <span className="font-bold text-xs text-slate-700">
                  {String(c.name)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setMergingItem({ item: c, type: "customer" })
                    }
                    className="text-purple-400 hover:text-purple-600"
                    title="Unisci"
                  >
                    <Merge className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingCustomer(c)}
                    className="text-blue-400 hover:text-blue-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteItem("customers", c.id)}
                    className="text-red-400 hover:text-red-600"
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
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-black text-slate-800 uppercase">
              Archivio Gru ({machines.length})
            </h4>
            <input
              type="text"
              placeholder="Filtra..."
              className="p-2 border border-slate-200 rounded-lg text-xs"
              onChange={(e) => {
                const items = document.querySelectorAll(".machine-item");
                items.forEach((el) => {
                  if (
                    el.textContent
                      .toLowerCase()
                      .includes(e.target.value.toLowerCase())
                  )
                    el.style.display = "flex";
                  else el.style.display = "none";
                });
              }}
            />
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2 custom-scrollbar">
            {machines.map((m) => (
              <div
                key={m.id}
                className="machine-item flex justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl items-center"
              >
                <div>
                  <span className="font-black text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mr-2">
                    {m.id}
                  </span>
                  <span className="font-bold text-xs text-slate-700">
                    {m.customerName}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMergingItem({ item: m, type: "machine" })}
                    className="text-purple-400 hover:text-purple-600"
                    title="Unisci"
                  >
                    <Merge className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingMachine(m)}
                    className="text-blue-400 hover:text-blue-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteItem("machines", m.id.toLowerCase())}
                    className="text-red-400 hover:text-red-600"
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
            <AlertCircle className="w-5 h-5 text-orange-500" /> Log di Sistema
          </h4>
          <div className="mb-6">
            <button
              onClick={() => {
                localStorage.removeItem("mora_tech_last_name");
                window.location.reload();
              }}
              className="w-full p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center gap-3 text-red-600 hover:bg-red-100 font-bold uppercase tracking-wider transition-all"
            >
              <LogOut className="w-5 h-5" /> Scollega Tecnico (Reset Locale)
            </button>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 overflow-hidden font-mono text-xs text-green-400 max-h-[200px] overflow-y-auto border-t-4 border-slate-700">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
              <Terminal className="w-3 h-3" /> System Logs
            </div>
            {logs.length === 0 ? (
              <div className="text-slate-600 italic">
                ... waiting for events ...
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="mb-1 flex gap-2">
                  <span className="text-slate-500">
                    [
                    {log.timestamp?.seconds
                      ? new Date(
                          log.timestamp.seconds * 1000
                        ).toLocaleTimeString()
                      : "now"}
                    ]
                  </span>
                  <span>
                    <span className="text-yellow-500 font-bold">INFO</span>{" "}
                    {log.technician || "System"}: {log.device || "Action"}
                  </span>
                </div>
              ))
            )}
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
    </div>
  );
};

// --- DASHBOARD VIEW ---
const DashboardView = ({
  onNavigate,
  isMobile,
  layoutConfig,
  onAdminAccess,
}) => {
  const color = layoutConfig?.themeColor || "blue";
  const order = layoutConfig?.dashboardOrder || DEFAULT_LAYOUT.dashboardOrder;
  const buttonsMap = {
    new: { icon: PlusCircle, label: "Nuovo", sub: "Rapporto", color: color },
    explore: {
      icon: ListTree,
      label: "Esplora",
      sub: "Archivio",
      color: "orange",
    },
    history: {
      icon: History,
      label: "Storico",
      sub: "Cerca",
      color: "emerald",
    },
    database: {
      icon: Database,
      label: "Database",
      sub: "Liste",
      color: "blue",
    },
    office: {
      icon: Briefcase,
      label: "Ufficio",
      sub: "Gestionale",
      color: "purple",
    },
    admin: {
      icon: Settings,
      label: "Admin",
      sub: "Dati",
      color: "slate",
      action: onAdminAccess,
    },
  };

  return (
    <div className="max-w-5xl mx-auto py-4 px-4 animate-in fade-in zoom-in-95 duration-500">
      <div
        className={`grid ${
          isMobile ? "grid-cols-2" : "grid-cols-3"
        } gap-4 md:gap-6`}
      >
        {order.map((key) => {
          const btn = buttonsMap[key];
          if (!btn) return null;
          return (
            <button
              key={key}
              onClick={btn.action || (() => onNavigate(key))}
              className={`p-6 flex flex-col items-center gap-4 transition-all group active:scale-95 bg-white rounded-xl shadow-md border-t-4 border-t-${btn.color}-200 hover:border-${btn.color}-500 hover:shadow-lg`}
            >
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 bg-${btn.color}-600 text-white`}
              >
                <btn.icon className="w-8 h-8" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  {btn.label}
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  {btn.sub}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// 4. MAIN APP COMPONENT
// ==========================================

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [logs, setLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [machines, setMachines] = useState([]);
  const [machineTypes, setMachineTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [currentTechName, setCurrentTechName] = useState(
    localStorage.getItem("mora_tech_last_name") || ""
  );
  const [layoutConfig, setLayoutConfig] = useState(DEFAULT_LAYOUT);
  const [isAppLoading, setIsAppLoading] = useState(true);

  const [viewingMachineHistory, setViewingMachineHistory] = useState(null);
  const [viewingCustomerDetail, setViewingCustomerDetail] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error(e);
      }
    };
    initAuth();
    onAuthStateChanged(auth, (u) => {
      setUser(u);
      setTimeout(() => setIsAppLoading(false), 800);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubLayout = onSnapshot(
      doc(db, "artifacts", appId, "public", "data", "settings", "layout"),
      (s) => {
        if (s.exists()) {
          const data = s.data();
          let order = data.dashboardOrder || DEFAULT_LAYOUT.dashboardOrder;
          if (!order.includes("explore")) {
            order = [...order];
            const idx = order.indexOf("new");
            if (idx !== -1) order.splice(idx + 1, 0, "explore");
            else order.unshift("explore");
          }
          setLayoutConfig((prev) => ({
            ...DEFAULT_LAYOUT,
            ...data,
            dashboardOrder: order,
          }));
        }
      }
    );
    const unsubLogs = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "maintenance_logs"),
      (s) => {
        setLogs(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort(
              (a, b) =>
                (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
            )
        );
        setLoading(false);
      }
    );
    const unsubCust = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "customers"),
      (s) =>
        setCustomers(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
    );
    const unsubTech = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "technicians"),
      (s) => setTechnicians(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubMach = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "machines"),
      (s) => setMachines(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubTypes = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "machine_types"),
      (s) => setMachineTypes(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      unsubLayout();
      unsubLogs();
      unsubCust();
      unsubTech();
      unsubMach();
      unsubTypes();
    };
  }, [user]);

  const handleAdminAccess = () => {
    if (!isAdminAuthenticated) setShowAdminLogin(true);
    else setActiveTab("admin");
  };
  const handleUpdateLayout = async (cfg) => {
    setLayoutConfig(cfg);
    await setDoc(
      doc(db, "artifacts", appId, "public", "data", "settings", "layout"),
      cfg
    );
  };

  const openMachineDetail = (mId) => {
    const machine = machines.find(
      (m) => m.id.toLowerCase() === mId.toLowerCase()
    );
    setViewingMachineHistory(
      machine || {
        id: mId,
        customerName: "N.D.",
        type: "N.D.",
        capacity: "N.D.",
      }
    );
    setViewingCustomerDetail(null);
  };
  const openCustomerDetail = (customerName) => {
    setViewingCustomerDetail(customerName);
    setViewingMachineHistory(null);
  };

  const color = layoutConfig.themeColor || "blue";

  if (isAppLoading)
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <HardHat className={`w-12 h-12 text-${color}-600 mx-auto mb-4`} />
          <h2 className="font-black text-slate-800 uppercase tracking-tighter text-xl">
            Mora App
          </h2>
        </div>
      </div>
    );

  return (
    <div
      className={`min-h-screen font-sans ${
        isMobileView ? "pb-24" : ""
      } relative bg-slate-100 text-slate-900 animate-in fade-in duration-700`}
    >
      <header
        className={`sticky top-0 z-50 p-4 transition-colors duration-300 bg-white border-b border-slate-200 shadow-sm rounded-none border-t-4 border-t-${color}-600`}
      >
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setActiveTab("dashboard")}
          >
            <div
              className={`p-2 rounded-xl bg-${color}-600 text-white shadow-lg`}
            >
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tighter leading-none text-slate-800">
                {layoutConfig.appTitle}
              </h1>
              <span
                className={`text-[10px] font-bold text-${color}-600 uppercase tracking-wider block mt-0.5`}
              >
                {currentTechName ? `Ciao, ${currentTechName}` : "Tecnico"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileView(!isMobileView)}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
            >
              {isMobileView ? (
                <Smartphone className="w-4 h-4 text-green-600" />
              ) : (
                <Monitor className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {activeTab !== "dashboard" && (
        <div className="sticky top-[76px] z-40 w-full py-3 px-4">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => {
                setActiveTab("dashboard");
                window.scrollTo(0, 0);
              }}
              className={`flex items-center gap-2 px-5 py-2 rounded-full font-black text-xs uppercase tracking-widest ${PRO_BUTTON_SECONDARY}`}
            >
              <ArrowLeft className="w-4 h-4" /> Home
            </button>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4 md:p-8 animate-in slide-in-from-bottom-4 duration-500">
        {!user ? (
          <div className="py-40 text-center">
            <RefreshCw
              className={`animate-spin mx-auto text-${color}-600 w-10 h-10`}
            />
          </div>
        ) : (
          <div key={activeTab} className="animate-in fade-in duration-300">
            {activeTab === "dashboard" && (
              <DashboardView
                onNavigate={setActiveTab}
                isMobile={isMobileView}
                layoutConfig={layoutConfig}
                onAdminAccess={handleAdminAccess}
              />
            )}
            {activeTab === "explore" && (
              <ExploreView
                customers={customers}
                machines={machines}
                logs={logs}
                color={color}
              />
            )}
            {activeTab === "history" && (
              <HistoryView
                logs={logs}
                machines={machines}
                customers={customers}
                technicians={technicians}
                machineTypes={machineTypes}
                loading={loading}
                isMobile={isMobileView}
                onAuthAdmin={() => setShowAdminLogin(true)}
                isAdmin={isAdminAuthenticated}
                layoutConfig={layoutConfig}
                onOpenCustomer={openCustomerDetail}
                onOpenMachine={openMachineDetail}
              />
            )}
            {activeTab === "office" && (
              <OfficeView
                logs={logs}
                machines={machines}
                customers={customers}
                layoutConfig={layoutConfig}
                technicians={technicians}
              />
            )}
            {activeTab === "database" && (
              <DatabaseView
                logs={logs}
                machines={machines}
                customers={customers}
                themeColor={color}
                onOpenCustomer={openCustomerDetail}
                onOpenMachine={openMachineDetail}
              />
            )}
            {activeTab === "new" && (
              <NewEntryForm
                user={user}
                customers={customers}
                technicians={technicians}
                machineTypes={machineTypes}
                machines={machines}
                onSuccess={() => setActiveTab("history")}
                isMobile={isMobileView}
                onTechUpdate={setCurrentTechName}
                layoutConfig={layoutConfig}
                allLogs={logs}
              />
            )}
            {activeTab === "admin" && isAdminAuthenticated && (
              <AdminPanel
                customers={customers}
                technicians={technicians}
                machines={machines}
                machineTypes={machineTypes}
                isMobile={isMobileView}
                layoutConfig={layoutConfig}
                onUpdateLayout={handleUpdateLayout}
              />
            )}
          </div>
        )}
      </main>

      {viewingMachineHistory && (
        <MachineHistoryModal
          machineId={viewingMachineHistory.id}
          machines={machines}
          allLogs={logs}
          onClose={() => setViewingMachineHistory(null)}
          onOpenCustomer={openCustomerDetail}
          themeColor={color}
        />
      )}
      {viewingCustomerDetail && (
        <CustomerDetailModal
          customerName={viewingCustomerDetail}
          machines={machines}
          onClose={() => setViewingCustomerDetail(null)}
          onOpenMachine={openMachineDetail}
          themeColor={color}
        />
      )}

      {isMobileView && (
        <nav className="fixed bottom-0 left-0 right-0 p-3 flex justify-around z-50 bg-white border-t border-slate-200 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
          <NavButton
            icon={PlusCircle}
            label="Nuovo"
            active={activeTab === "new"}
            onClick={() => setActiveTab("new")}
            color={color}
          />
          <NavButton
            icon={History}
            label="Storico"
            active={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            color={color}
          />
          <NavButton
            icon={Settings}
            label="Admin"
            active={activeTab === "admin"}
            onClick={handleAdminAccess}
            color={color}
          />
        </nav>
      )}

      {showAdminLogin && (
        <AdminLoginModal
          onSuccess={() => {
            setIsAdminAuthenticated(true);
            setShowAdminLogin(false);
            if (activeTab === "admin") setActiveTab("admin");
          }}
          onCancel={() => setShowAdminLogin(false)}
          color={color}
        />
      )}
    </div>
  );
}
