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
  RotateCcw,
  FileText,
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

// --- STILI GLOBALI (DESIGN SYSTEM PRO 2.0) ---
const PRO_INPUT =
  "w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400 shadow-sm";
const PRO_BUTTON_SECONDARY =
  "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-sm active:scale-[0.98] transition-all font-bold";
const getButtonPrimaryClass = (color) =>
  `bg-gradient-to-r from-${color}-600 to-${color}-700 text-white shadow-lg shadow-${color}-600/20 hover:shadow-${color}-600/30 hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 transition-all border border-transparent font-bold tracking-wide`;
const getProPanelClass = (color) =>
  `bg-white rounded-2xl shadow-xl shadow-slate-200/50 border-t-4 border-t-${color}-600 border-x border-b border-slate-100 overflow-hidden`;

// ==========================================
// 1. COMPONENTI UI BASE E MODALI
// ==========================================

const NavButton = React.memo(
  ({ icon: Icon, label, active, onClick, desktop = false, color = "blue" }) => {
    if (desktop) {
      return (
        <button
          onClick={onClick}
          className={`px-5 py-2.5 rounded-xl flex items-center gap-2.5 font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
            active
              ? `bg-${color}-50 text-${color}-700 ring-1 ring-${color}-200`
              : `text-slate-500 hover:bg-slate-50 hover:text-slate-700`
          }`}
        >
          <Icon
            className={`w-4 h-4 ${
              active ? `text-${color}-600` : "text-slate-400"
            }`}
          />{" "}
          {label}
        </button>
      );
    }
    return (
      <button
        onClick={onClick}
        className="flex-1 flex flex-col items-center justify-center gap-1.5 group py-3 transition-all active:scale-95 relative"
      >
        {active && (
          <div
            className={`absolute -top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-${color}-600 rounded-b-full shadow-[0_2px_8px_rgba(37,99,235,0.4)] transition-all duration-300`}
          ></div>
        )}
        <div
          className={`p-2.5 rounded-2xl transition-all duration-300 ${
            active
              ? `bg-${color}-50 text-${color}-700`
              : "text-slate-400 group-hover:bg-slate-50 group-hover:text-slate-500"
          }`}
        >
          <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
        </div>
        <span
          className={`text-[10px] font-bold tracking-tight transition-colors ${
            active ? `text-${color}-700` : "text-slate-400"
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
      className={`flex-1 min-w-[100px] flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border ${
        active
          ? `bg-${color}-50 border-${color}-200 text-${color}-700 shadow-sm`
          : "bg-white text-slate-500 border-transparent hover:bg-slate-50 hover:border-slate-200"
      }`}
    >
      <Icon
        className={`w-5 h-5 ${active ? `text-${color}-600` : "text-slate-400"}`}
      />{" "}
      {label}
    </button>
  )
);

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div
        className={`shadow-2xl shadow-slate-900/20 max-w-xs w-full p-8 space-y-6 animate-in zoom-in-95 bg-white rounded-3xl border border-slate-100`}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            {title}
          </h3>
          <p className="text-slate-400 text-xs mt-1">Area Riservata</p>
        </div>
        <input
          type="password"
          autoFocus
          className={`w-full p-4 rounded-xl text-center text-3xl font-black outline-none transition-all tracking-widest ${PRO_INPUT} ${
            error ? "border-red-500 ring-2 ring-red-100 text-red-500" : ""
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
            className={`w-full py-4 rounded-xl font-bold text-xs uppercase transition-transform active:scale-[0.98] ${getButtonPrimaryClass(
              "slate"
            )}`}
          >
            Accedi
          </button>
          <button
            onClick={onCancel}
            className={`w-full py-4 rounded-xl font-bold text-xs uppercase active:scale-[0.98] ${PRO_BUTTON_SECONDARY}`}
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
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
    <div
      className={`p-8 max-w-xs w-full text-center space-y-5 bg-white rounded-3xl shadow-2xl border border-slate-100`}
    >
      <div
        className={`p-4 rounded-2xl mx-auto w-fit shadow-inner ${
          isFree ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
        }`}
      >
        <AlertTriangle className="w-8 h-8" />
      </div>
      <div>
        <h4 className="font-bold text-slate-800 uppercase text-sm tracking-widest mb-1">
          {title}
        </h4>
        <p className="text-slate-400 text-xs">Azione irreversibile</p>
      </div>

      {isFree ? (
        <p className="text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl">
          Eliminazione consentita senza PIN (recente).
        </p>
      ) : (
        <input
          type="password"
          placeholder="••••"
          className={`w-full p-4 rounded-xl text-center text-2xl font-black outline-none tracking-widest ${PRO_INPUT}`}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onConfirm()}
          autoFocus
        />
      )}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <button
          onClick={onConfirm}
          className="py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all"
        >
          Elimina
        </button>
        <button
          onClick={onCancel}
          className={`py-3 rounded-xl font-bold text-xs uppercase active:scale-95 ${PRO_BUTTON_SECONDARY}`}
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
    if (!data.machineType) return alert("Devi selezionare un tipo di gru.");
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div
        className={`w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] ${getProPanelClass(
          color
        )}`}
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">
              Modifica Intervento
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
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
        <div className="p-6 space-y-5 overflow-y-auto bg-slate-50/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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
                setData({ ...data, description: e.target.value })
              }
            />
          </div>
          {customFields.map((field) => (
            <div key={field.id} className="space-y-1.5">
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
        <div className="p-5 border-t border-slate-100 bg-white">
          <button
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-xs uppercase transition-all ${getButtonPrimaryClass(
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 backdrop-blur-md">
      <div
        className={`rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 ${getProPanelClass(
          color
        )}`}
      >
        <h3 className="font-black text-slate-800 uppercase text-sm tracking-wider text-center">
          Modifica Gru
        </h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
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
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
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
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
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
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
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
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase shadow-md transition-all ${getButtonPrimaryClass(
              color
            )}`}
          >
            Salva
          </button>
          <button
            onClick={onClose}
            className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase ${PRO_BUTTON_SECONDARY}`}
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 backdrop-blur-md">
      <div
        className={`rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 ${getProPanelClass(
          color
        )}`}
      >
        <h3 className="font-black text-slate-800 uppercase text-sm tracking-wider text-center">
          Modifica Cliente
        </h3>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
            Ragione Sociale
          </label>
          <input
            type="text"
            className={PRO_INPUT}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase shadow-md transition-all ${getButtonPrimaryClass(
              color
            )}`}
          >
            Salva
          </button>
          <button
            onClick={onClose}
            className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase ${PRO_BUTTON_SECONDARY}`}
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[220] flex items-center justify-center p-4 backdrop-blur-md">
      <div
        className={`rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 ${getProPanelClass(
          color
        )} border-t-purple-600`}
      >
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Merge className="w-6 h-6" />
          </div>
          <h3 className="font-black text-slate-800 uppercase text-sm tracking-wider">
            Unisci {type === "customer" ? "Cliente" : "Gru"}
          </h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Stai per unire <b>{sourceItem.name || sourceItem.id}</b>. <br />
            Tutti i dati verranno spostati sulla destinazione.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
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

        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleConfirm}
            disabled={loading || !targetId}
            className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase shadow-md transition-all ${getButtonPrimaryClass(
              "purple"
            )}`}
          >
            {loading ? "Unione in corso..." : "Conferma Unione"}
          </button>
          <button
            onClick={onClose}
            className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase ${PRO_BUTTON_SECONDARY}`}
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[210] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div
        className={`w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl ${getProPanelClass(
          color
        )}`}
      >
        <div
          className={`bg-white p-6 flex flex-col gap-4 border-b border-slate-100 relative overflow-hidden`}
        >
          <div className="flex justify-between items-start relative z-10">
            <button
              onClick={onClose}
              className={`flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition-all active:scale-95 group text-slate-600 hover:bg-slate-100 hover:border-slate-300`}
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
              <span className="font-bold text-[11px] uppercase tracking-wider">
                Indietro
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-50 rounded-full border border-slate-200 hover:bg-slate-100 transition-all text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4 relative z-10 mt-2">
            <div
              className={`p-4 bg-${color}-50 rounded-2xl border border-${color}-100 text-${color}-600`}
            >
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight leading-tight text-slate-800">
                {customerName.toUpperCase()}
              </h2>
              <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                Parco Macchine: {customerMachines.length}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customerMachines.map((m) => (
              <div
                key={m.id}
                onClick={() => onOpenMachine(m.id)}
                className={`p-5 rounded-2xl cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-white border border-slate-100 shadow-sm`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span
                    className={`text-xs font-black text-${color}-600 bg-${color}-50 px-2.5 py-1.5 rounded-lg uppercase tracking-wider border border-${color}-100`}
                  >
                    {m.id}
                  </span>
                  <div
                    className={`p-1.5 bg-slate-50 rounded-full text-slate-300 group-hover:text-${color}-500 transition-colors`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700 uppercase">
                    {m.type}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Factory className="w-3 h-3" /> {m.capacity || "N.D."}
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div
        className={`w-full max-w-4xl h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl ${getProPanelClass(
          color
        )}`}
      >
        <div
          className={`bg-white p-6 flex flex-col gap-4 border-b border-slate-100 relative overflow-hidden`}
        >
          <div className="flex justify-between items-start relative z-10">
            <button
              onClick={onClose}
              className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 shadow-sm transition-all active:scale-95 group text-slate-600 hover:bg-slate-100 hover:border-slate-300"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />{" "}
              <span className="font-bold text-[11px] uppercase tracking-wider">
                Indietro
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-50 rounded-full border border-slate-200 hover:bg-slate-100 transition-all text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4 relative z-10 mt-2">
            <div
              className={`p-4 bg-${color}-50 rounded-2xl border border-${color}-100 text-${color}-600`}
            >
              <Factory className="w-8 h-8" />
            </div>
            <div>
              <button
                onClick={() => onOpenCustomer(liveMachine.customerName)}
                className="text-left group/title"
              >
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-tight text-slate-800 hover:text-blue-700 transition-colors">
                  {liveMachine.customerName.toUpperCase()}{" "}
                  <span className="text-slate-300 text-lg font-medium ml-2">
                    ↗
                  </span>
                </h2>
              </button>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 mt-2">
                <span className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 text-slate-700 uppercase">
                  MAT: {liveMachine.id}
                </span>
                <span className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 uppercase">
                  {liveMachine.type}
                </span>
                {liveMachine.capacity && (
                  <span className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 uppercase">
                    {liveMachine.capacity} kg
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/50">
          <div className="space-y-6">
            {machineLogs.map((log, idx) => (
              <div key={log.id} className="flex gap-4 group">
                <div className="flex flex-col items-center pt-2">
                  <div
                    className={`w-4 h-4 bg-${color}-500 rounded-full ring-4 ring-white shadow-sm shrink-0`}
                  ></div>
                  {idx !== machineLogs.length - 1 && (
                    <div className="w-0.5 bg-slate-200 flex-1 my-2 rounded-full"></div>
                  )}
                </div>
                <div
                  className={`p-5 rounded-2xl flex-1 relative overflow-hidden group/card transition-all bg-white shadow-sm border border-slate-100 hover:shadow-md hover:border-${color}-200`}
                >
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div
                      className={`flex items-center gap-2 bg-${color}-50 px-2.5 py-1 rounded-lg border border-${color}-100/50`}
                    >
                      <CalendarIcon
                        className={`w-3.5 h-3.5 text-${color}-600`}
                      />
                      <span
                        className={`text-${color}-800 font-bold text-[10px] uppercase tracking-wider`}
                      >
                        {log.dateString}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg text-slate-500 border border-slate-100">
                      <User className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-bold uppercase tracking-tight">
                        {log.technician}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed font-medium relative z-10">
                    "{log.description}"
                  </p>
                </div>
              </div>
            ))}
            {machineLogs.length === 0 && (
              <div className="text-center py-20 opacity-30">
                <ClipboardList className="w-16 h-16 mx-auto mb-2 text-slate-400" />
                <p className="font-bold uppercase text-xs tracking-widest text-slate-500">
                  Nessun dato storico
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
        return machines.filter(
          (m) => m.customerName.toUpperCase() === customerName.toUpperCase()
        );
      },
      [machines]
    );

    const getMachineLogs = useCallback(
      (machineId) => {
        return logs.filter(
          (l) => l.machineId.toUpperCase() === machineId.toUpperCase()
        );
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
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pb-20 p-1">
          {filteredCustomers.map((c) => {
            const isCustExpanded = expandedCustomer === c.name;
            const myMachines = isCustExpanded
              ? getCustomerMachines(c.name)
              : [];

            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 overflow-hidden ${
                  isCustExpanded
                    ? `border-${color}-200 shadow-md ring-1 ring-${color}-100`
                    : "border-slate-100"
                }`}
              >
                <div
                  onClick={() => toggleCustomer(c.name)}
                  className={`p-5 flex justify-between items-center cursor-pointer transition-colors ${
                    isCustExpanded ? "bg-slate-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-xl ${
                        isCustExpanded
                          ? `bg-${color}-100 text-${color}-600`
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Users className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-sm text-slate-700 uppercase tracking-wide">
                      {c.name.toUpperCase()}
                    </span>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
                      isCustExpanded ? "rotate-90" : ""
                    }`}
                  />
                </div>

                {isCustExpanded && (
                  <div className="bg-slate-50/50 border-t border-slate-100 p-2 space-y-2">
                    {myMachines.length === 0 && (
                      <div className="p-6 text-xs text-slate-400 italic text-center">
                        Nessuna gru registrata.
                      </div>
                    )}
                    {myMachines.map((m) => {
                      const isMachExpanded = expandedMachine === m.id;
                      const myLogs = isMachExpanded ? getMachineLogs(m.id) : [];

                      return (
                        <div
                          key={m.id}
                          className="bg-white rounded-xl border border-slate-100 overflow-hidden"
                        >
                          <div
                            onClick={(e) => toggleMachine(e, m.id)}
                            className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
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
                                <span className="text-xs font-black text-slate-700 block uppercase">
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
                            <div className="bg-slate-50 p-3 space-y-3 border-t border-slate-100">
                              {myLogs.length === 0 && (
                                <div className="text-[10px] text-slate-400 italic text-center py-2">
                                  Nessun intervento registrato.
                                </div>
                              )}
                              {myLogs.map((l) => (
                                <div
                                  key={l.id}
                                  className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm relative"
                                >
                                  <div className="flex justify-between mb-2">
                                    <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">
                                      {l.dateString}
                                    </span>
                                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">
                                      {l.technician}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
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
        <div className="flex gap-2 mb-4 p-1 bg-slate-200/50 rounded-xl">
          {["customers", "machines", "logs"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                tab === t
                  ? `bg-white text-${color}-600 shadow-sm`
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t === "customers"
                ? "Clienti"
                : t === "machines"
                ? "Gru"
                : "Interventi"}
            </button>
          ))}
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Cerca nel database..."
            className={PRO_INPUT}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 custom-scrollbar space-y-3">
        {filteredData.length === 0 && (
          <div className="text-center py-20 opacity-30 font-bold text-slate-400 uppercase text-xs">
            Nessun dato trovato
          </div>
        )}

        {tab === "customers" &&
          filteredData.map((c) => (
            <div
              key={c.id}
              onClick={() => onOpenCustomer(c.name)}
              className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Users className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm text-slate-700 uppercase tracking-wide">
                  {c.name.toUpperCase()}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
            </div>
          ))}

        {tab === "machines" &&
          filteredData.map((m) => (
            <div
              key={m.id}
              onClick={() => onOpenMachine(m.id)}
              className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer hover:border-orange-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-orange-50 p-3 rounded-xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <Factory className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-black text-xs text-slate-800 block uppercase">
                    {m.id}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 mt-0.5 block uppercase">
                    {m.customerName.toUpperCase()}
                  </span>
                </div>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                {m.type}
              </span>
            </div>
          ))}

        {tab === "logs" &&
          filteredData.map((l) => (
            <div
              key={l.id}
              className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 transition-all"
            >
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  {l.dateString}
                </span>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  {l.technician}
                </span>
              </div>
              <div className="font-bold text-xs text-slate-800 mb-1 flex items-center gap-2">
                <span className="uppercase">{l.customer.toUpperCase()}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 uppercase">{l.machineId}</span>
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
    <div className={`p-6 rounded-3xl relative ${getProPanelClass("blue")}`}>
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() =>
            setCurrentMonth((prev) => (prev === 0 ? 11 : prev - 1))
          }
          className="p-2 hover:bg-slate-50 rounded-full transition-colors"
        >
          <ChevronDown className="w-5 h-5 rotate-90 text-slate-400" />
        </button>
        <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">
          {monthNames[currentMonth]} {currentYear}
        </h3>
        <button
          onClick={() =>
            setCurrentMonth((prev) => (prev === 11 ? 0 : prev + 1))
          }
          className="p-2 hover:bg-slate-50 rounded-full transition-colors"
        >
          <ChevronDown className="w-5 h-5 -rotate-90 text-slate-400" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-300 mb-2 uppercase tracking-widest">
        <div>Lun</div>
        <div>Mar</div>
        <div>Mer</div>
        <div>Gio</div>
        <div>Ven</div>
        <div>Sab</div>
        <div>Dom</div>
      </div>
      <div className="grid grid-cols-7 gap-2">
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
              className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer border ${
                count > 0
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200"
                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
              }`}
            >
              <span className="text-xs font-bold">{day}</span>
              {count > 0 && (
                <div className="mt-1 flex gap-0.5">
                  <div className="w-1 h-1 bg-white rounded-full opacity-50"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- OFFICE VIEW (CON STAMPA PDF IN-APP) ---
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

  // Classifiche: "anno" o "mese"
  const [timeframe, setTimeframe] = useState("mese");
  const color = layoutConfig?.themeColor || "blue";

  // Filtro Log per le Classifiche in base al Timeframe
  const filteredForStats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    return logs.filter((l) => {
      if (!l.dateString) return false;
      const parts = l.dateString.split("/");
      if (parts.length < 3) return false;
      const logMonth = parseInt(parts[1], 10);
      const logYear = parseInt(parts[2], 10);

      if (timeframe === "anno") {
        return logYear === currentYear;
      } else if (timeframe === "mese") {
        return logYear === currentYear && logMonth === currentMonth;
      }
      return true;
    });
  }, [logs, timeframe]);

  // Statistiche Avanzate ripristinate (usando i log filtrati per periodo)
  const advancedStats = useMemo(() => {
    const techCounts = {};
    const machineTypeCounts = {};
    const customerCounts = {};

    filteredForStats.forEach((l) => {
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
  }, [filteredForStats]);

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
        !log.customer.toUpperCase().includes(selectedCustomer.toUpperCase())
      )
        matches = false;
      if (
        matches &&
        selectedMachine &&
        !log.machineId.toUpperCase().includes(selectedMachine.toUpperCase())
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

  const resetFilters = () => {
    setSelectedCustomer("");
    setSelectedMachine("");
    setSelectedTech("");
    setStartDate("");
    setEndDate("");
  };

  const generatePDF = () => {
    if (filteredLogs.length === 0)
      return alert("Nessun intervento trovato per i filtri selezionati.");

    const today = new Date().toLocaleDateString("it-IT");
    const companyName = layoutConfig?.appTitle || "Assistenze Mora";

    // CSS inline altamente ottimizzato per la stampa (nasconde link/browser headers)
    const css = `
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
          @page { size: A4; margin: 12mm; }
          body { font-family: 'Inter', sans-serif; color: #1e293b; margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
          .company h1 { font-size: 24px; font-weight: 800; color: #1e40af; margin: 0; text-transform: uppercase; letter-spacing: -0.5px; }
          .company p { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 4px 0 0 0; }
          .doc-info { text-align: right; }
          .doc-info h2 { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; }
          .doc-info p { font-size: 10px; color: #64748b; margin: 4px 0 0 0; }
          .meta-box { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 15px; margin-bottom: 25px; }
          .meta-item { display: flex; flex-direction: column; gap: 3px; }
          .meta-label { font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta-value { font-size: 12px; font-weight: 600; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 30px; }
          th { background: #f1f5f9; color: #334155; text-align: left; padding: 10px 12px; font-weight: 800; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; border-bottom: 2px solid #cbd5e1; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
          tr:last-child td { border-bottom: 2px solid #cbd5e1; }
          tr:nth-child(even) td { background-color: #fcfcfd; }
          .t-date { font-weight: 800; color: #0f172a; font-size: 11px; }
          .t-tech { display: inline-block; margin-top: 4px; font-size: 8px; font-weight: 600; color: #3b82f6; text-transform: uppercase; background: #eff6ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #bfdbfe; }
          .t-client { font-weight: 800; color: #0f172a; font-size: 11px; text-transform: uppercase; }
          .t-machine { display: block; margin-top: 4px; font-size: 9px; font-weight: 600; color: #475569; }
          .t-specs { display: inline-block; margin-top: 3px; font-size: 8px; color: #64748b; border: 1px solid #e2e8f0; background: white; padding: 2px 5px; border-radius: 4px; text-transform: uppercase; }
          .t-desc { color: #334155; line-height: 1.5; white-space: pre-wrap; }
          .footer { text-align: center; font-size: 8px; color: #94a3b8; text-transform: uppercase; font-weight: 600; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      `;

    const html = `
          <!DOCTYPE html>
          <html lang="it">
          <head>
              <meta charset="UTF-8">
              <title>Rapporto Interventi</title>
              <style>${css}</style>
          </head>
          <body>
              <div class="header">
                  <div class="company">
                      <h1>${companyName}</h1>
                      <p>Rapporto Ufficiale di Manutenzione</p>
                  </div>
                  <div class="doc-info">
                      <h2>Interventi Tecnici</h2>
                      <p>Generato il: <strong>${today}</strong></p>
                  </div>
              </div>

              <div class="meta-box">
                  <div class="meta-item">
                      <span class="meta-label">Cliente Selezionato</span>
                      <span class="meta-value" style="text-transform: uppercase;">${
                        selectedCustomer || "TUTTI I CLIENTI"
                      }</span>
                  </div>
                  <div class="meta-item">
                      <span class="meta-label">Periodo</span>
                      <span class="meta-value">${
                        startDate
                          ? new Date(startDate).toLocaleDateString("it-IT")
                          : "Inizio"
                      } - ${
      endDate ? new Date(endDate).toLocaleDateString("it-IT") : "Oggi"
    }</span>
                  </div>
                  <div class="meta-item" style="text-align: right;">
                      <span class="meta-label">Totale Interventi</span>
                      <span class="meta-value" style="color: #2563eb; font-size: 16px;">${
                        filteredLogs.length
                      }</span>
                  </div>
              </div>

              <table>
                  <thead>
                      <tr>
                          <th style="width: 18%">Data / Tecnico</th>
                          <th style="width: 28%">Cliente / Impianto</th>
                          <th style="width: 54%">Descrizione Attività</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${filteredLogs
                        .map(
                          (l) => `
                          <tr>
                              <td>
                                  <div class="t-date">${l.dateString}</div>
                                  <span class="t-tech">${l.technician}</span>
                              </td>
                              <td>
                                  <div class="t-client">${l.customer}</div>
                                  <div class="t-machine">Matricola: ${
                                    l.machineId
                                  }</div>
                                  ${
                                    l.machineType || l.capacity
                                      ? `<div class="t-specs">${
                                          l.machineType || "N.D."
                                        } ${
                                          l.capacity ? `- ${l.capacity} kg` : ""
                                        }</div>`
                                      : ""
                                  }
                              </td>
                              <td>
                                  <div class="t-desc">${l.description.replace(
                                    /\n/g,
                                    "<br>"
                                  )}</div>
                              </td>
                          </tr>
                      `
                        )
                        .join("")}
                  </tbody>
              </table>

              <div class="footer">
                  Documento generato digitalmente dal sistema ${
                    layoutConfig?.appTitle || "Assistenze Mora"
                  }
              </div>
          </body>
          </html>
      `;

    // Approccio Iframe Nascosto: 100% Affidabile su Mobile e PC per bypassare i blocchi popup
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const docIframe = iframe.contentWindow.document;
    docIframe.open();
    docIframe.write(html);
    docIframe.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 3000);
    }, 500);
  };

  const handleDownloadExcel = () => {
    if (filteredLogs.length === 0) return alert("Nessun dato.");
    const headers = ["Data", "Tecnico", "Cliente", "Matricola", "Descrizione"];
    const rows = filteredLogs.map((l) => [
      l.dateString,
      l.technician,
      l.customer.toUpperCase(),
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
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 print:hidden">
      {/* STATS CARDS */}
      <div className={`p-6 ${getProPanelClass(color)} bg-white`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 bg-${color}-50 text-${color}-700 rounded-xl`}>
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Panoramica
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
              Statistiche Generali
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Totali
            </span>
            <div className="text-3xl font-black text-slate-800">
              {stats.total}
            </div>
          </div>
          <div className="text-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Anno
            </span>
            <div className="text-3xl font-black text-blue-600">
              {stats.year}
            </div>
          </div>
          <div className="text-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Mese
            </span>
            <div className="text-3xl font-black text-emerald-600">
              {stats.month}
            </div>
          </div>
        </div>
      </div>

      {/* ADVANCED STATS CON TOGGLE TEMPORALE */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">
            Classifiche
          </h3>
          <div className="flex gap-1 bg-slate-200/50 p-1 rounded-xl">
            <button
              onClick={() => setTimeframe("mese")}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                timeframe === "mese"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Mese
            </button>
            <button
              onClick={() => setTimeframe("anno")}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                timeframe === "anno"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Anno
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-6 ${getProPanelClass(color)}`}>
            <div className="flex items-center gap-2 mb-6">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Top Tecnici
              </h4>
            </div>
            <div className="space-y-4">
              {advancedStats.topTechs.map(([tech, count], i) => (
                <div
                  key={tech}
                  className="flex justify-between text-xs items-center"
                >
                  <div className="flex gap-3 items-center">
                    <span
                      className={`font-black w-6 h-6 flex items-center justify-center rounded-full text-[10px] ${
                        i === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-bold text-slate-700 uppercase">
                      {tech}
                    </span>
                  </div>
                  <span className="font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                    {count}
                  </span>
                </div>
              ))}
              {advancedStats.topTechs.length === 0 && (
                <p className="text-xs text-slate-400 italic">
                  Nessun dato nel periodo.
                </p>
              )}
            </div>
          </div>
          <div className={`p-6 ${getProPanelClass(color)}`}>
            <div className="flex items-center gap-2 mb-6">
              <PieChart className="w-5 h-5 text-purple-500" />
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Tipi Macchina
              </h4>
            </div>
            <div className="space-y-4">
              {advancedStats.topMachineTypes
                .slice(0, 5)
                .map(([type, count]) => {
                  const timeTotal = filteredForStats.length || 1;
                  const pct = Math.round((count / timeTotal) * 100) || 0;
                  return (
                    <div key={type}>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1.5 uppercase">
                        <span>{type}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              {advancedStats.topMachineTypes.length === 0 && (
                <p className="text-xs text-slate-400 italic">
                  Nessun dato nel periodo.
                </p>
              )}
            </div>
          </div>
          <div className={`p-6 ${getProPanelClass(color)}`}>
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-orange-500" />
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Top Clienti
              </h4>
            </div>
            <div className="space-y-4">
              {advancedStats.topCustomers.map(([cust, count]) => (
                <div
                  key={cust}
                  className="flex justify-between items-start text-xs border-b border-slate-50 pb-3 last:border-0"
                >
                  <span className="font-bold text-slate-700 uppercase leading-tight pr-3 flex-1">
                    {cust}
                  </span>
                  <span className="font-black text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg whitespace-nowrap">
                    {count}
                  </span>
                </div>
              ))}
              {advancedStats.topCustomers.length === 0 && (
                <p className="text-xs text-slate-400 italic">
                  Nessun dato nel periodo.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EXPORT SECTION REDESIGNED */}
      <div className={`p-8 ${getProPanelClass(color)} border-t-indigo-600`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl`}>
              <Printer className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                Reportistica
              </h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Genera Documenti Ufficiali
              </p>
            </div>
          </div>
          <button
            onClick={resetFilters}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reset Filtri
          </button>
        </div>

        <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-200 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div className="space-y-2 relative group">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                Filtra Cliente
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tutti i clienti..."
                  className={PRO_INPUT}
                  value={selectedCustomer}
                  onChange={(e) => {
                    setSelectedCustomer(e.target.value);
                    setShowCustomerSuggestions(true);
                  }}
                  onBlur={() =>
                    setTimeout(() => setShowCustomerSuggestions(false), 200)
                  }
                />
                {selectedCustomer && (
                  <button
                    onClick={() => setSelectedCustomer("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                {showCustomerSuggestions && selectedCustomer && (
                  <ul className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {customers
                      .filter((c) =>
                        c.name
                          .toUpperCase()
                          .includes(selectedCustomer.toUpperCase())
                      )
                      .map((c) => (
                        <li
                          key={c.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedCustomer(c.name.toUpperCase());
                            setShowCustomerSuggestions(false);
                          }}
                          className="p-4 hover:bg-slate-50 cursor-pointer font-bold text-xs uppercase text-slate-700 border-b border-slate-50"
                        >
                          {c.name}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="space-y-2 relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                Filtra Gru
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tutte le gru..."
                  className={PRO_INPUT}
                  value={selectedMachine}
                  onChange={(e) => {
                    setSelectedMachine(e.target.value);
                    setShowMachineSuggestions(true);
                  }}
                  onBlur={() =>
                    setTimeout(() => setShowMachineSuggestions(false), 200)
                  }
                />
                {selectedMachine && (
                  <button
                    onClick={() => setSelectedMachine("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                {showMachineSuggestions && selectedMachine && (
                  <ul className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {machines
                      .filter((m) =>
                        m.id
                          .toUpperCase()
                          .includes(selectedMachine.toUpperCase())
                      )
                      .map((m) => (
                        <li
                          key={m.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setSelectedMachine(m.id.toUpperCase());
                            setShowMachineSuggestions(false);
                          }}
                          className="p-4 hover:bg-slate-50 cursor-pointer font-bold text-xs uppercase text-slate-700 border-b border-slate-50"
                        >
                          {m.id}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                Filtra Tecnico
              </label>
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
          </div>

          <div className="pt-5 border-t border-slate-200 grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                Data Inizio
              </label>
              <input
                type="date"
                className={PRO_INPUT}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
                Data Fine
              </label>
              <input
                type="date"
                className={PRO_INPUT}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <button
            onClick={generatePDF}
            className={`py-4 rounded-xl font-black uppercase text-sm text-white bg-slate-800 hover:bg-slate-900 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3`}
          >
            <FileText className="w-5 h-5" /> Stampa PDF
          </button>
          <button
            onClick={handleDownloadExcel}
            className={`py-4 rounded-xl font-black uppercase text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3`}
          >
            <FileSpreadsheet className="w-5 h-5" /> Export Excel
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
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in"
          onClick={() => setPopoverData(null)}
        >
          <div
            className={`p-8 shadow-2xl w-full max-w-sm animate-in zoom-in-95 bg-white rounded-3xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
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
                  className="bg-slate-50 p-4 rounded-xl border border-slate-100"
                >
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {l.technician}
                    </span>
                    <span className="text-[10px] font-black text-blue-600 uppercase">
                      {l.machineId}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 uppercase">
                    {l.customer.toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 italic">
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

// --- NEW ENTRY FORM ---
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

  const handleMachineIdChange = (e) => {
    const val = e.target.value.toUpperCase().replace(/\//g, "-");
    if (val === "") {
      setFormData((p) => ({
        ...p,
        machineId: "",
        customer: p.customer,
        machineType: "",
        capacity: "",
      }));
      setLastIntervention(null);
      return;
    }
    const found = machines.find((m) => m.id === val);
    if (found) {
      setFormData((p) => ({
        ...p,
        machineId: val,
        customer: found.customerName,
        machineType: found.type || "",
        capacity: found.capacity || "",
      }));
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
    setRelatedMachines(
      machines.filter(
        (m) => m.customerName && m.customerName.toUpperCase().includes(val)
      )
    );
    setShowCustomerSuggestions(true);
  };

  const selectMachine = (m) => {
    setFormData((p) => ({
      ...p,
      machineId: m.id,
      customer: m.customerName,
      machineType: m.type || "",
      capacity: m.capacity || "",
    }));
    setShowMachineSuggestions(false);
    if (allLogs) {
      const logs = allLogs.filter((l) => l.machineId === m.id);
      setLastIntervention(logs.length > 0 ? logs[0] : null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.technician ||
      !formData.customer ||
      !formData.description ||
      !formData.machineType
    ) {
      return alert(
        "Compila tutti i campi obbligatori (Tecnico, Cliente, Tipo Gru e Descrizione)."
      );
    }
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
          <div key="tech" className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Tecnico
            </label>
            <div className="relative">
              {isLocked ? (
                <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex justify-between items-center">
                  <span className="uppercase">{formData.technician}</span>
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
                    <option value="">Seleziona Tecnico...</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.name}>
                        {topTechs.includes(t.name) ? "⭐ " : ""}
                        {t.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                </>
              )}
            </div>
          </div>
        );
      case "machine":
        return (
          <div key="mach" className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 relative">
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
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
              {showMachineSuggestions && (
                <ul className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                  {machines
                    .filter((m) => {
                      const matchCustomer =
                        !formData.customer ||
                        (m.customerName &&
                          m.customerName.toUpperCase() ===
                            formData.customer.toUpperCase());
                      const matchId =
                        !formData.machineId ||
                        (m.id &&
                          m.id
                            .toUpperCase()
                            .includes(formData.machineId.toUpperCase()));
                      return matchCustomer && matchId;
                    })
                    .slice(0, 50)
                    .map((m) => (
                      <li
                        key={m.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectMachine(m);
                        }}
                        className="p-4 hover:bg-slate-50 cursor-pointer font-bold text-xs uppercase text-slate-700 border-b border-slate-50 flex justify-between items-center"
                      >
                        <span>{m.id}</span>
                        <span className="text-[9px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {m.type}
                        </span>
                      </li>
                    ))}
                  {machines.filter((m) => {
                    const matchCustomer =
                      !formData.customer ||
                      (m.customerName &&
                        m.customerName.toUpperCase() ===
                          formData.customer.toUpperCase());
                    const matchId =
                      !formData.machineId ||
                      (m.id &&
                        m.id
                          .toUpperCase()
                          .includes(formData.machineId.toUpperCase()));
                    return matchCustomer && matchId;
                  }).length === 0 && (
                    <li className="p-4 text-xs text-slate-400 italic">
                      Nessuna gru trovata
                    </li>
                  )}
                </ul>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                Tipo Gru *
              </label>
              <div className="relative">
                <select
                  className={PRO_INPUT}
                  value={formData.machineType || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, machineType: e.target.value })
                  }
                >
                  <option value="">Seleziona Tipo...</option>
                  {machineTypes.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                  {formData.machineType &&
                    !machineTypes.some(
                      (t) => t.name === formData.machineType
                    ) && (
                      <option value={formData.machineType}>
                        {formData.machineType}
                      </option>
                    )}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        );
      case "customer":
        return (
          <div key="cust" className="space-y-1.5 relative">
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
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
            </div>
            {showCustomerSuggestions && (
              <ul className="absolute z-50 left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                {customers
                  .filter(
                    (c) =>
                      !formData.customer ||
                      c.name
                        .toUpperCase()
                        .includes(formData.customer.toUpperCase())
                  )
                  .map((c) => (
                    <li
                      key={c.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFormData((p) => ({
                          ...p,
                          customer: c.name.toUpperCase(),
                        }));
                        setRelatedMachines(
                          machines.filter(
                            (m) =>
                              m.customerName &&
                              m.customerName.toUpperCase() ===
                                c.name.toUpperCase()
                          )
                        );
                        setShowCustomerSuggestions(false);
                      }}
                      className="p-4 hover:bg-slate-50 cursor-pointer font-bold text-xs uppercase text-slate-700 border-b border-slate-50"
                    >
                      {c.name}
                    </li>
                  ))}
                {customers.filter(
                  (c) =>
                    !formData.customer ||
                    c.name
                      .toUpperCase()
                      .includes(formData.customer.toUpperCase())
                ).length === 0 && (
                  <li className="p-4 text-xs text-slate-400 italic">
                    Nessun cliente trovato
                  </li>
                )}
              </ul>
            )}
            {relatedMachines.length > 0 && !formData.machineId && (
              <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-2 block tracking-wider">
                  Seleziona Gru di {formData.customer.toUpperCase()}:
                </span>
                <div className="flex gap-3 overflow-x-auto pb-2 pt-1 snap-x">
                  {relatedMachines.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => selectMachine(m)}
                      className="snap-start flex flex-col items-start p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-500 hover:shadow-md transition-all group min-w-[140px] text-left"
                    >
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <Factory className="w-5 h-5" />
                      </div>
                      <span className="font-black text-slate-800 text-sm block mb-1 uppercase">
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
          <div key="desc" className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Descrizione Lavoro
            </label>
            <textarea
              rows="4"
              className={PRO_INPUT}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Dettagli dell'intervento svolto..."
            />
          </div>
        );
      case "capacity":
        return layoutConfig.formSettings.showCapacity ? (
          <div key="cap" className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Portata
            </label>
            <input
              type="text"
              className={PRO_INPUT}
              value={formData.capacity || ""}
              onChange={(e) =>
                setFormData({ ...formData, capacity: e.target.value })
              }
            />
          </div>
        ) : null;
      case "date":
        return (
          <div key="date" className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Data (Opzionale)
            </label>
            <div className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 font-bold flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-slate-400" />
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
              <div key={i} className="space-y-1.5">
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
      <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
        <h2 className="font-black text-slate-800 text-xl uppercase tracking-tight">
          Nuovo Rapporto
        </h2>
        <div className={`bg-${color}-50 text-${color}-600 p-3 rounded-2xl`}>
          <HardHat className="w-6 h-6" />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-slate-50/30">
        {formOrder.map((key) => renderField(key))}

        {/* LAST INTERVENTION ALERT - REINTEGRATED */}
        {lastIntervention && (
          <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 animate-in fade-in slide-in-from-top-2 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide">
                Ultimo Intervento ({lastIntervention.dateString})
              </h4>
            </div>
            <p className="text-sm text-amber-900 italic leading-relaxed">
              "{lastIntervention.description}"
            </p>
            <div className="text-[10px] text-amber-700 mt-3 font-bold text-right uppercase tracking-wider flex items-center justify-end gap-1">
              <User className="w-3 h-3" /> {lastIntervention.technician}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all mt-4 ${getButtonPrimaryClass(
            color
          )}`}
        >
          {isSubmitting ? (
            <RefreshCw className="animate-spin w-5 h-5" />
          ) : (
            <Save className="w-5 h-5" />
          )}{" "}
          Registra Intervento
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
        <RefreshCw className="animate-spin mx-auto text-slate-400 w-8 h-8" />
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
          placeholder="Cerca storico..."
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
                      {log.customer.toUpperCase()}
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
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase whitespace-nowrap">
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
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase w-[220px]">
                  Cliente / Impianto
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                  Descrizione
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase w-[120px]">
                  Tecnico
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center w-[100px]">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginated.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-50 group transition-colors"
                >
                  <td className="px-6 py-4 text-xs font-bold text-slate-500">
                    {log.dateString}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span
                        className="font-black text-slate-800 uppercase text-xs cursor-pointer hover:text-blue-600 hover:underline truncate"
                        title={log.customer.toUpperCase()}
                      >
                        {log.customer.toUpperCase()}
                      </span>
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        <span
                          className={`text-[9px] text-${color}-700 font-bold bg-${color}-50 px-1.5 rounded cursor-pointer hover:underline uppercase border border-${color}-100`}
                          onClick={() => onOpenMachine(log.machineId)}
                        >
                          {log.machineId}
                        </span>
                        <span className="text-[9px] text-slate-500 border border-slate-200 bg-slate-100 px-1.5 rounded uppercase">
                          {log.machineType}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 italic break-words whitespace-pre-wrap leading-relaxed pr-8">
                    "{log.description}"
                  </td>
                  <td className="px-6 py-4 text-[10px] font-bold uppercase text-slate-600">
                    {log.technician}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(log)}
                        className={`p-2 bg-slate-100 rounded-lg text-${color}-500 hover:bg-${color}-50 transition-colors`}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(log)}
                        className="p-2 bg-slate-100 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
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
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold shadow-sm active:scale-95 disabled:opacity-50 text-slate-600 hover:bg-slate-50"
            >
              Precedente
            </button>
            <span className="text-xs font-bold text-slate-400">
              Pagina {page} di {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-white rounded-lg border border-slate-200 text-xs font-bold shadow-sm active:scale-95 disabled:opacity-50 text-slate-600 hover:bg-slate-50"
            >
              Successiva
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
          title="Elimina Intervento"
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

  // Diagnostica State
  const [health, setHealth] = useState({
    db: "unknown",
    latency: 0,
    network: true,
  });

  const runDiagnostics = async () => {
    setHealth((prev) => ({ ...prev, db: "checking" }));
    const start = performance.now();
    try {
      await getDocs(
        query(
          collection(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "maintenance_logs"
          ),
          limit(1)
        )
      );
      const end = performance.now();
      setHealth({
        db: "online",
        latency: Math.round(end - start),
        network: navigator.onLine,
      });
    } catch (e) {
      setHealth({ db: "offline", latency: 0, network: navigator.onLine });
    }
  };

  useEffect(() => {
    if (view === "diagnostics") {
      runDiagnostics();
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
      <div className="flex p-2 rounded-2xl border border-slate-200 overflow-x-auto gap-2 bg-white no-scrollbar shadow-sm">
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
          className={`p-8 shadow-xl ${getProPanelClass(
            layoutConfig.themeColor
          )}`}
        >
          <h3 className="font-black text-slate-800 mb-6 uppercase tracking-tight text-lg">
            Personalizzazione
          </h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Colore Principale
          </p>
          <div className="flex gap-3 mb-8">
            {["blue", "slate", "emerald", "indigo", "orange", "red"].map(
              (c) => (
                <button
                  key={c}
                  onClick={() =>
                    onUpdateLayout({ ...layoutConfig, themeColor: c })
                  }
                  className={`w-10 h-10 rounded-full bg-${c}-600 border-4 shadow-sm transition-all hover:scale-110 ${
                    layoutConfig.themeColor === c
                      ? "border-white ring-2 ring-slate-300 scale-110"
                      : "border-transparent"
                  }`}
                ></button>
              )
            )}
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
            className={`w-full py-4 bg-slate-800 text-white rounded-xl font-bold uppercase text-xs shadow-md hover:bg-slate-900 transition-colors`}
          >
            Cambia Nome App
          </button>
        </div>
      )}

      {(view === "techs" || view === "types") && (
        <div
          className={`p-6 shadow-xl max-w-xl mx-auto ${getProPanelClass(
            layoutConfig.themeColor
          )}`}
        >
          <div className="flex gap-3 mb-6">
            <input
              type="text"
              className={PRO_INPUT}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Aggiungi nuovo..."
            />
            <button
              onClick={addItem}
              className={`px-6 rounded-xl font-bold uppercase text-xs ${getButtonPrimaryClass(
                layoutConfig.themeColor
              )}`}
            >
              Salva
            </button>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
            {(view === "techs" ? technicians : machineTypes).map((i) => (
              <div
                key={i.id}
                className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <span className="font-bold text-sm uppercase text-slate-700">
                  {String(i.name)}
                </span>
                <button
                  onClick={() =>
                    deleteItem(
                      view === "techs" ? "technicians" : "machine_types",
                      i.id
                    )
                  }
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
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
          <h4 className="font-black text-slate-800 uppercase mb-6 text-lg tracking-tight">
            Archivio Clienti ({customers.length})
          </h4>
          <div className="max-h-[500px] overflow-y-auto space-y-2 custom-scrollbar">
            {customers.map((c) => (
              <div
                key={c.id}
                className="flex justify-between p-4 bg-white border border-slate-200 rounded-xl items-center group shadow-sm hover:border-blue-300 hover:shadow-md transition-all"
              >
                <span className="font-bold text-sm text-slate-700 uppercase">
                  {String(c.name)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setMergingItem({ item: c, type: "customer" })
                    }
                    className="p-2 bg-slate-50 rounded-lg text-purple-500 hover:bg-purple-100 transition-colors"
                    title="Unisci duplicato"
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
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-black text-slate-800 uppercase text-lg tracking-tight">
              Archivio Gru ({machines.length})
            </h4>
            <input
              type="text"
              placeholder="Filtra rapido..."
              className={`w-48 ${PRO_INPUT}`}
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
          <div className="max-h-[500px] overflow-y-auto space-y-2 custom-scrollbar pr-1">
            {machines.map((m) => (
              <div
                key={m.id}
                className="machine-item flex justify-between p-4 bg-white border border-slate-200 rounded-xl items-center shadow-sm hover:border-orange-300 hover:shadow-md transition-all group"
              >
                <div>
                  <span className="font-black text-sm text-orange-600 uppercase">
                    {m.id}
                  </span>
                  <span className="font-bold text-xs text-slate-500 block uppercase mt-0.5">
                    {m.customerName}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMergingItem({ item: m, type: "machine" })}
                    className="p-2 bg-slate-50 rounded-lg text-purple-500 hover:bg-purple-100 transition-colors"
                    title="Unisci duplicato"
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
          className={`p-8 shadow-xl ${getProPanelClass(
            layoutConfig.themeColor
          )}`}
        >
          <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
            <div>
              <h4 className="font-black text-slate-800 uppercase text-lg tracking-tight">
                Status di Sistema
              </h4>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                Centro Diagnostico App
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className="w-4 h-4" /> Riavvio App
            </button>
          </div>

          <div className="grid grid-cols-3 gap-5 mb-8">
            <div
              className={`p-5 rounded-2xl border ${
                health.network
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-red-50 border-red-200"
              } flex flex-col items-center justify-center gap-3 shadow-sm`}
            >
              {health.network ? (
                <Wifi className="w-8 h-8 text-emerald-500" />
              ) : (
                <WifiOff className="w-8 h-8 text-red-500" />
              )}
              <span
                className={`text-xs font-black uppercase tracking-wider ${
                  health.network ? "text-emerald-700" : "text-red-700"
                }`}
              >
                {health.network ? "Rete Attiva" : "Offline"}
              </span>
            </div>
            <div
              className={`p-5 rounded-2xl border ${
                health.db === "online"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-orange-50 border-orange-200"
              } flex flex-col items-center justify-center gap-3 shadow-sm`}
            >
              <Database
                className={`w-8 h-8 ${
                  health.db === "online" ? "text-blue-500" : "text-orange-500"
                }`}
              />
              <span
                className={`text-xs font-black uppercase tracking-wider ${
                  health.db === "online" ? "text-blue-700" : "text-orange-700"
                }`}
              >
                {health.db === "online"
                  ? `${health.latency}ms Ping`
                  : "Connessione..."}
              </span>
            </div>
            <div className="p-5 rounded-2xl border bg-slate-50 border-slate-200 flex flex-col items-center justify-center gap-3 shadow-sm">
              <ShieldCheck className="w-8 h-8 text-slate-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                Admin Auth
              </span>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <button
              onClick={() => {
                localStorage.removeItem("mora_tech_last_name");
                window.location.reload();
              }}
              className="w-full p-4 bg-white border border-red-200 hover:border-red-400 rounded-xl flex items-center justify-between text-red-600 hover:bg-red-50 font-bold uppercase text-xs tracking-wider transition-all shadow-sm group"
            >
              <span className="flex items-center gap-3">
                <LogOut className="w-5 h-5" /> Scollega Tecnico Locale
              </span>
              <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full p-4 bg-white border border-orange-200 hover:border-orange-400 rounded-xl flex items-center justify-between text-orange-600 hover:bg-orange-50 font-bold uppercase text-xs tracking-wider transition-all shadow-sm group"
            >
              <span className="flex items-center gap-3">
                <Trash2 className="w-5 h-5" /> Svuota Cache Dispositivo
              </span>
              <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          </div>

          <div className="bg-[#0f172a] rounded-2xl p-5 overflow-hidden font-mono text-[11px] text-green-400 max-h-[250px] overflow-y-auto border-t-4 border-slate-600 shadow-inner custom-scrollbar">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-700/50 text-slate-400 font-bold uppercase tracking-widest">
              <Terminal className="w-4 h-4" /> System Terminal
            </div>
            {logs.length === 0 ? (
              <div className="text-slate-500 italic flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>{" "}
                waiting for system events...
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="mb-1.5 flex gap-3 hover:bg-white/5 p-1 rounded"
                >
                  <span className="text-slate-500 shrink-0">
                    [
                    {log.timestamp?.seconds
                      ? new Date(
                          log.timestamp.seconds * 1000
                        ).toLocaleTimeString()
                      : "now"}
                    ]
                  </span>
                  <span>
                    <span className="text-blue-400 font-bold">INFO</span>{" "}
                    {log.technician || "SYS"}: {log.device || "Action"}
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
    new: {
      icon: PlusCircle,
      label: "Nuovo Rapporto",
      sub: "Inserisci intervento",
      color: color,
    },
    explore: {
      icon: ListTree,
      label: "Esplora",
      sub: "Naviga archivio",
      color: "orange",
    },
    history: {
      icon: History,
      label: "Storico",
      sub: "Visualizza passati",
      color: "emerald",
    },
    database: {
      icon: Database,
      label: "Database",
      sub: "Gestione dati",
      color: "blue",
    },
    office: {
      icon: Briefcase,
      label: "Ufficio",
      sub: "Report e statistiche",
      color: "purple",
    },
    admin: {
      icon: Settings,
      label: "Admin",
      sub: "Impostazioni",
      color: "slate",
      action: onAdminAccess,
    },
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 animate-in fade-in zoom-in-95 duration-500">
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
              className={`p-6 md:p-8 flex flex-col items-center gap-5 transition-all group active:scale-95 bg-white rounded-3xl shadow-lg shadow-slate-200/50 border-t-4 border-t-${btn.color}-500 hover:border-${btn.color}-600 hover:shadow-xl`}
            >
              <div
                className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 bg-${btn.color}-50 text-${btn.color}-600 border border-${btn.color}-100`}
              >
                <btn.icon
                  className="w-8 h-8 md:w-10 md:h-10"
                  strokeWidth={1.5}
                />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">
                  {btn.label}
                </h3>
                <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-wider">
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
      setTimeout(() => setIsAppLoading(false), 1200); // Leggermente aumentato per far vedere l'animazione bella
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
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="relative flex flex-col items-center animate-in zoom-in duration-1000">
          <div className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/50 mb-6 relative z-10 border border-blue-400/30">
            <HardHat className="w-12 h-12 text-white" strokeWidth={1.5} />
          </div>
          <h2 className="font-black text-white uppercase tracking-tighter text-3xl relative z-10">
            Assistenze <span className="text-blue-400">Mora</span>
          </h2>
          <div className="flex items-center gap-2 mt-4 opacity-50">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
          </div>
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
        className={`sticky top-0 z-50 p-4 transition-colors duration-300 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm rounded-none border-t-4 border-t-${color}-600`}
      >
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div
            className="flex items-center gap-4 cursor-pointer"
            onClick={() => setActiveTab("dashboard")}
          >
            <div
              className={`p-2.5 rounded-2xl bg-gradient-to-br from-${color}-500 to-${color}-700 text-white shadow-lg shadow-${color}-500/30`}
            >
              <HardHat className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter leading-none text-slate-800">
                {layoutConfig.appTitle}
              </h1>
              <span
                className={`text-[10px] font-bold text-${color}-600 uppercase tracking-widest block mt-1`}
              >
                {currentTechName
                  ? `Connesso: ${currentTechName}`
                  : "Portal Tecnico"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileView(!isMobileView)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-slate-400 hover:text-blue-600 shadow-sm"
            >
              {isMobileView ? (
                <Smartphone className="w-5 h-5" />
              ) : (
                <Monitor className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {activeTab !== "dashboard" && (
        <div className="sticky top-[84px] z-40 w-full py-3 px-4 pointer-events-none">
          <div className="max-w-6xl mx-auto pointer-events-auto">
            <button
              onClick={() => {
                setActiveTab("dashboard");
                window.scrollTo(0, 0);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest bg-white text-slate-600 border border-slate-200 shadow-lg shadow-slate-200/50 hover:bg-slate-50 hover:-translate-x-1 transition-all`}
            >
              <ArrowLeft className="w-4 h-4" /> Dashboard
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
        <nav className="fixed bottom-0 left-0 right-0 p-2 flex justify-around z-50 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] pb-safe">
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
