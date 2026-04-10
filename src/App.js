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
  Database,
  Users,
  Palette,
  Bell,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  Plus,
  Folder,
  Wifi,
  WifiOff,
  Edit,
  Maximize2,
  AlertTriangle,
  Trophy,
  PieChart,
  BarChart,
  ToggleLeft,
  ToggleRight,
  Eye,
  EyeOff,
  Layout,
  Move,
  Filter,
  CalendarDays,
  Hammer,
  CheckCircle,
  AlertCircle,
  GitMerge,
  LogOut,
  Mail,
  Send,
  Clock,
  MinusCircle,
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

try {
  enableIndexedDbPersistence(db).catch((err) =>
    console.log("Persistenza:", err.code)
  );
} catch (e) {
  console.log("Err Persistenza:", e);
}

const appId = "mora-maintenance-v1";
const ADMIN_PASSWORD = "Mora1932";

const DEFAULT_LAYOUT = {
  themeColor: "blue",
  borderRadius: "xl",
  appTitle: "Assistenza Mora",
  dashboardOrder: ["new", "explore", "history", "database", "office", "admin"],
  formOrder: [
    "technician",
    "date",
    "ticketNumber",
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

// HELPER GLOBALE PER TECNICI MULTIPLI
const getTechsString = (log) => {
  if (!log.additionalTechnicians || log.additionalTechnicians.length === 0)
    return log.technician;
  return `${log.technician}, ${log.additionalTechnicians.join(", ")}`;
};

// HELPER GLOBALE PER LA PORTATA
const formatCapacity = (val) => {
  if (!val) return "";
  const s = String(val).trim();
  if (s.toLowerCase().endsWith("kg")) return s;
  return `${s} kg`;
};

// ESTRAE SOLO LA MATRICOLA (Nascodendo l'ID composto del DB)
const getSafeMatricola = (m) => {
  if (m.matricola) return m.matricola;
  if (m.id && m.id.includes("_")) {
    return m.id.substring(m.id.indexOf("_") + 1).toUpperCase();
  }
  return m.id ? m.id.toUpperCase() : "N.D.";
};

// DISTANZA DI LEVENSHTEIN (Ricerca duplicati)
const getLevenshteinDistance = (a, b) => {
  if (!a || !b) return (a || b).length;
  if (a === b) return 0;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// --- SCHERMATA LOGIN GLOBALE ---
const GlobalLoginScreen = ({ technicians, onUnlock, color = "blue" }) => {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    const cleanName = name.trim();

    if (!cleanName || !password) {
      setError("Inserisci il tuo Nome e la Password aziendale.");
      return;
    }

    if (password === "Mora1932") {
      onUnlock(cleanName);
      return;
    }

    if (password === "1932") {
      const matchedTech = technicians.find(
        (t) => t.name.toLowerCase() === cleanName.toLowerCase()
      );

      if (matchedTech) {
        onUnlock(matchedTech.name);
      } else {
        setError(
          "Nome non autorizzato. Chiedi all'amministratore di aggiungerti all'elenco dello Staff."
        );
      }
      return;
    }

    setError("Password errata.");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 animate-in fade-in duration-700">
      <div
        className={`max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl border-t-4 border-${color}-600`}
      >
        <div className="text-center mb-8">
          <div
            className={`w-20 h-20 bg-${color}-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-${color}-500/30`}
          >
            <HardHat className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
            Accesso Privato
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-2">
            Area riservata al personale autorizzato.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Il tuo Nome (o Nome Tecnico)
            </label>
            <div className="relative">
              <input
                type="text"
                className={`w-full p-4 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-${color}-500 transition-all`}
                placeholder="Es. Mario Rossi"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
              />
              <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
              Password Aziendale
            </label>
            <div className="relative">
              <input
                type="password"
                className={`w-full p-4 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-${color}-500 transition-all`}
                placeholder="••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
              />
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-200 text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-4 bg-${color}-700 text-white rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-${color}-800 active:scale-95 transition-all mt-4`}
          >
            Entra
          </button>
        </form>
      </div>
    </div>
  );
};

// --- STILI GLOBALI ---
const PRO_INPUT =
  "w-full p-3 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400";
const PRO_BUTTON_SECONDARY =
  "bg-white text-slate-600 border border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-sm active:scale-95 transition-all font-bold";
const getButtonPrimaryClass = (color) =>
  `bg-${color}-700 text-white shadow-md hover:bg-${color}-800 active:scale-95 transition-all border border-transparent font-bold tracking-wide`;
const getProPanelClass = (color) =>
  `bg-white rounded-xl shadow-md border-t-4 border-t-${color}-600 border-x border-b border-slate-200`;

// --- COMPONENTI UI MINORI ---
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

// --- MODALI DATI ---
const EditLogModal = ({
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
  });
  const [loading, setLoading] = useState(false);
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

  const handleSave = async () => {
    setLoading(true);
    try {
      const cleanAdditionalTechs = data.additionalTechnicians.filter(
        (t) => t.trim() !== ""
      );
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
          additionalTechnicians: cleanAdditionalTechs,
          customer: data.customer.toUpperCase(),
          machineId: newMachineId,
          machineType: data.machineType,
          capacity: data.capacity,
          description: data.description,
          dateString: data.dateString,
          ticketNumber: data.ticketNumber || "",
        }
      );
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
                setData({ ...data, description: e.target.value })
              }
            />
          </div>
        </div>
        <div className="p-6 border-t border-slate-100 bg-white">
          <button
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-4 rounded-lg font-bold text-xs uppercase transition-all ${getButtonPrimaryClass(
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

const EditMachineModal = ({
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
  defaultTargetId,
  color = "blue",
}) => {
  const [targetId, setTargetId] = useState(defaultTargetId || "");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!targetId) return;
    const targetItem = allItems.find((i) => i.id === targetId);
    if (!targetItem) return;
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
            <GitMerge className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wider">
            Unisci {type === "customer" ? "Cliente" : "Gru"}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Stai per unire{" "}
            <b className="text-red-500">
              {sourceItem.name || sourceItem.matricola || sourceItem.id}
            </b>
            . Seleziona la destinazione (quello che rimarrà).
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
                  {type === "customer"
                    ? i.name
                    : `${getSafeMatricola(i)} (${i.customerName})`}
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

const DuplicatesModal = ({
  analysis,
  onClose,
  onDirectMerge,
  onIgnore,
  color = "blue",
}) => {
  const [loadingIdx, setLoadingIdx] = useState(null);
  const pairs = analysis.pairs;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[230] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div
        className={`w-full max-w-3xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border-t-4 border-yellow-500`}
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 text-yellow-600 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">
                Potenziali Conflitti
              </h3>
              <p className="text-xs font-bold text-slate-500 uppercase">
                {pairs.length}{" "}
                {pairs.length === 1 ? "Elemento simile" : "Elementi simili"}{" "}
                trovati
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-100 space-y-4">
          {pairs.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8" />
              </div>
              <p className="text-slate-500 font-bold uppercase text-xs">
                Nessun conflitto rilevato! 🎉
              </p>
            </div>
          ) : (
            pairs.map((pair, idx) => {
              const [a, b] = pair;
              const nameA =
                analysis.type === "customer"
                  ? a.name
                  : `${getSafeMatricola(a)} (${a.customerName})`;
              const nameB =
                analysis.type === "customer"
                  ? b.name
                  : `${getSafeMatricola(b)} (${b.customerName})`;

              return (
                <div
                  key={idx}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-yellow-300 transition-colors"
                >
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Sinistra */}
                    <div className="flex-1 text-center md:text-left bg-red-50 p-3 rounded-xl border border-red-100 w-full md:w-auto">
                      <span className="font-black text-sm text-red-700 block uppercase break-words">
                        {nameA}
                      </span>
                      <span className="text-[10px] text-red-400 font-bold mt-1 block">
                        ID: {a.id.substring(0, 8)}
                      </span>
                    </div>

                    {/* Bottoni Azione Veloci */}
                    <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                      <button
                        onClick={async () => {
                          setLoadingIdx(idx);
                          await onDirectMerge(a, b, analysis.type);
                          setLoadingIdx(null);
                        }}
                        disabled={loadingIdx !== null}
                        className={`text-xs font-black bg-purple-100 text-purple-700 px-4 py-2 rounded-xl hover:bg-purple-200 transition-colors shadow-sm uppercase flex items-center justify-center gap-2 ${
                          loadingIdx !== null
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        title="Elimina quello di Sinistra e unisci i suoi dati in quello di Destra"
                      >
                        {loadingIdx === idx ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <ArrowRight className="w-4 h-4 hidden md:block" />
                            <ArrowDown className="w-4 h-4 md:hidden" />
                          </>
                        )}{" "}
                        Unisci a Destra
                      </button>
                      <button
                        onClick={async () => {
                          setLoadingIdx(idx);
                          await onDirectMerge(b, a, analysis.type);
                          setLoadingIdx(null);
                        }}
                        disabled={loadingIdx !== null}
                        className={`text-xs font-black bg-blue-100 text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-200 transition-colors shadow-sm uppercase flex items-center justify-center gap-2 flex-row-reverse md:flex-row ${
                          loadingIdx !== null
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                        title="Elimina quello di Destra e unisci i suoi dati in quello di Sinistra"
                      >
                        {loadingIdx === idx ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <ArrowLeft className="w-4 h-4 hidden md:block" />
                            <ArrowUp className="w-4 h-4 md:hidden" />
                          </>
                        )}{" "}
                        Unisci a Sinistra
                      </button>
                    </div>

                    {/* Destra */}
                    <div className="flex-1 text-center md:text-right bg-blue-50 p-3 rounded-xl border border-blue-100 w-full md:w-auto">
                      <span className="font-black text-sm text-blue-700 block uppercase break-words">
                        {nameB}
                      </span>
                      <span className="text-[10px] text-blue-400 font-bold mt-1 block">
                        ID: {b.id.substring(0, 8)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-50 text-center">
                    <button
                      onClick={async () => {
                        setLoadingIdx(idx);
                        await onIgnore(a, b);
                        setLoadingIdx(null);
                      }}
                      disabled={loadingIdx !== null}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest bg-slate-100 px-4 py-1.5 rounded-lg transition-colors"
                      title="Questi due elementi sono diversi, non propormeli più."
                    >
                      Ignora (Ricorda Scelta)
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

const MachineHistoryModal = ({
  machine,
  allLogs,
  onClose,
  onOpenCustomer,
  themeColor,
}) => {
  const machineLogs = useMemo(() => {
    const mat = getSafeMatricola(machine).toLowerCase();
    const cust = machine.customerName.toUpperCase();
    return allLogs.filter(
      (l) =>
        l.machineId.toLowerCase() === mat && l.customer.toUpperCase() === cust
    );
  }, [allLogs, machine]);

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
                onClick={() => onOpenCustomer(machine.customerName)}
                className="text-left group/title"
              >
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-tight text-slate-800 hover:text-blue-700 transition-colors underline decoration-slate-300 underline-offset-4 decoration-2">
                  {machine.customerName}
                </h2>
              </button>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold text-slate-500 mt-2">
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  MAT: {getSafeMatricola(machine)}
                </span>
                <span className="bg-white px-2 py-1 rounded border border-slate-200">
                  {machine.type}
                </span>
                {machine.capacity && (
                  <span className="bg-white px-2 py-1 rounded border border-slate-200">
                    {formatCapacity(machine.capacity)}
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
                        {getTechsString(log)}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-700 text-xs md:text-sm leading-relaxed font-medium relative z-10 italic whitespace-pre-wrap break-words">
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

const CustomerDetailModal = ({
  customerName,
  machines,
  onClose,
  onOpenMachine,
  themeColor,
}) => {
  const color = themeColor || "blue";
  const customerMachines = machines.filter(
    (m) => m.customerName === customerName
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className={`w-full max-w-2xl h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl ${getProPanelClass(
          color
        )}`}
      >
        <div className="bg-slate-50 p-6 flex justify-between items-center border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`p-3 bg-${color}-100 rounded-xl text-${color}-600`}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">
                {customerName}
              </h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                {customerMachines.length} Gru Registrate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white rounded-full border border-slate-300 hover:bg-slate-100 transition-all text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerMachines.length === 0 && (
              <div className="col-span-full text-center py-10 opacity-50">
                <Factory className="w-12 h-12 mx-auto mb-2 text-slate-400" />
                <p className="font-bold text-slate-500 uppercase text-xs">
                  Nessuna gru trovata
                </p>
              </div>
            )}
            {customerMachines.map((m) => (
              <div
                key={m.id}
                onClick={() => onOpenMachine(getSafeMatricola(m), customerName)}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-black text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase">
                    MAT: {getSafeMatricola(m)}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg uppercase">
                    {m.type}
                  </span>
                  {m.capacity && (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg uppercase">
                      {formatCapacity(m.capacity)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- VIEWS ---
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
      (machineMatricola, customerName) => {
        return logs.filter(
          (l) => l.machineId === machineMatricola && l.customer === customerName
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
      <div className="h-[calc(100vh-160px)] md:h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-500">
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
                      const myLogs = isMachExpanded
                        ? getMachineLogs(getSafeMatricola(m), m.customerName)
                        : [];

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
                                  {getSafeMatricola(m)}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 rounded border border-slate-200 uppercase">
                                    {m.type}
                                  </span>
                                  {m.capacity && (
                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 rounded border border-slate-200 uppercase">
                                      {formatCapacity(m.capacity)}
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
                                      {getTechsString(l)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
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
          (m.matricola || m.id).toLowerCase().includes(s) ||
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
      className={`h-[calc(100vh-160px)] md:h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-500 ${getProPanelClass(
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
              onClick={() => onOpenMachine(getSafeMatricola(m), m.customerName)}
              className="p-4 mb-2 bg-white rounded-xl shadow-sm border border-slate-200 flex justify-between items-center cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div>
                <span className="font-black text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                  {getSafeMatricola(m)}
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
                  {getTechsString(l)}
                </span>
              </div>
              <div className="font-bold text-xs text-slate-800 mb-1">
                {l.customer} - {l.machineId}
              </div>
              <p className="text-[11px] text-slate-500 italic whitespace-pre-wrap break-words">
                "{l.description}"
              </p>
            </div>
          ))}
      </div>
    </div>
  );
};

const SimpleCalendar = ({ logs, onDayClick, month, year, onMonthChange }) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
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
      if (!l.dateString) return false;
      const parts = l.dateString.split("/");
      return (
        parseInt(parts[0]) === day &&
        parseInt(parts[1]) === month + 1 &&
        parseInt(parts[2]) === year
      );
    });

  return (
    <div className={`p-5 rounded-3xl relative ${getProPanelClass("blue")}`}>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() =>
            onMonthChange(
              month === 0 ? 11 : month - 1,
              month === 0 ? year - 1 : year
            )
          }
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ChevronDown className="w-5 h-5 rotate-90" />
        </button>
        <h3 className="font-black text-slate-800 uppercase">
          {monthNames[month]} {year}
        </h3>
        <button
          onClick={() =>
            onMonthChange(
              month === 11 ? 0 : month + 1,
              month === 11 ? year + 1 : year
            )
          }
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
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
                onDayClick(dailyLogs, `${day} ${monthNames[month]} ${year}`)
              }
              className={`h-9 flex flex-col items-center justify-center rounded-lg border transition-all cursor-pointer ${
                count > 0
                  ? "bg-blue-50 border-blue-200 hover:bg-blue-100 shadow-sm"
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

const OfficeView = ({
  logs,
  machines,
  customers,
  layoutConfig,
  technicians,
}) => {
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const [viewMode, setViewMode] = useState("month");
  const [ticketSearch, setTicketSearch] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedTech, setSelectedTech] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showMachineSuggestions, setShowMachineSuggestions] = useState(false);
  const [popoverData, setPopoverData] = useState(null);
  const color = layoutConfig?.themeColor || "blue";

  const ticketSearchResults = useMemo(() => {
    if (!ticketSearch.trim()) return [];
    const term = ticketSearch.toLowerCase().trim();
    return logs.filter(
      (l) => l.ticketNumber && l.ticketNumber.toLowerCase().includes(term)
    );
  }, [logs, ticketSearch]);

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

  const dynamicMonthLabel =
    viewMode === "year"
      ? `(${calYear})`
      : `(${monthNames[calMonth]} ${calYear})`;

  const calendarFilteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!log.dateString) return false;
      const [d, m, y] = log.dateString.split("/").map(Number);
      if (viewMode === "year") return y === calYear;
      return m - 1 === calMonth && y === calYear;
    });
  }, [logs, calMonth, calYear, viewMode]);

  const advancedStats = useMemo(() => {
    const techCounts = {};
    const machineTypeCounts = {};
    const customerCounts = {};

    calendarFilteredLogs.forEach((l) => {
      if (l.technician)
        techCounts[l.technician] = (techCounts[l.technician] || 0) + 1;
      if (l.additionalTechnicians) {
        l.additionalTechnicians.forEach((t) => {
          if (t.trim()) techCounts[t] = (techCounts[t] || 0) + 1;
        });
      }
      if (l.machineType)
        machineTypeCounts[l.machineType] =
          (machineTypeCounts[l.machineType] || 0) + 1;
      if (l.customer)
        customerCounts[l.customer] = (customerCounts[l.customer] || 0) + 1;
    });

    return {
      topTechs: Object.entries(techCounts).sort(([, a], [, b]) => b - a),
      topMachineTypes: Object.entries(machineTypeCounts).sort(
        ([, a], [, b]) => b - a
      ),
      topCustomers: Object.entries(customerCounts).sort(
        ([, a], [, b]) => b - a
      ),
    };
  }, [calendarFilteredLogs]);

  const stats = useMemo(() => {
    let yearCount = 0;
    logs.forEach((l) => {
      if (!l.dateString) return;
      const [d, m, y] = l.dateString.split("/").map(Number);
      if (y === calYear) yearCount++;
    });
    return {
      total: logs.length,
      year: yearCount,
      currentPeriod: calendarFilteredLogs.length,
    };
  }, [logs, calYear, calendarFilteredLogs]);

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
      if (matches && selectedTech) {
        const techs = [log.technician, ...(log.additionalTechnicians || [])];
        if (!techs.includes(selectedTech)) matches = false;
      }
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

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Impossibile aprire il report. Verifica il blocco popup.");
      return;
    }

    const today = new Date().toLocaleDateString("it-IT");

    const css = `
        @page { size: A4; margin: 0; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.5; margin: 0; padding: 20px; box-sizing: border-box; }
        .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; color: #0f172a; text-transform: uppercase; font-size: 24px; letter-spacing: 1px; }
        .header p { margin: 5px 0 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #64748b; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .meta div { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
        th { background: #0f172a; color: white; text-transform: uppercase; font-weight: bold; padding: 12px 10px; text-align: left; }
        td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 40px; }
        
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
            body { padding: 1.5cm; }
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
                                ${
                                  l.ticketNumber
                                    ? `<div style="color: #2563eb; font-size: 10px; margin-top: 2px;">N. Assistenza ${l.ticketNumber}</div>`
                                    : ""
                                }
                                <div style="color: #64748b; font-size: 11px; margin-top: 4px;">${getTechsString(
                                  l
                                )}</div>
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
                          l.capacity ? `- ${formatCapacity(l.capacity)}` : ""
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
    const headers = [
      "Data",
      "N. Assistenza",
      "Tecnico/i",
      "Cliente",
      "Matricola",
      "Descrizione",
    ];
    const rows = filteredLogs.map((l) => [
      l.dateString,
      l.ticketNumber || "",
      `"${getTechsString(l)}"`,
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
      <div className={`p-6 ${getProPanelClass(color)} bg-white`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
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
          <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setViewMode("month")}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                viewMode === "month"
                  ? "bg-white shadow text-slate-800"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Mensile
            </button>
            <button
              onClick={() => setViewMode("year")}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                viewMode === "year"
                  ? "bg-white shadow text-slate-800"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Annuale
            </button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Globale
            </span>
            <div className="text-2xl font-black text-slate-800">
              {stats.total}
            </div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Anno {calYear}
            </span>
            <div className="text-2xl font-black text-blue-600">
              {stats.year}
            </div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {viewMode === "year" ? "Totale Periodo" : "Mese Sel."}
            </span>
            <div className="text-2xl font-black text-emerald-600">
              {stats.currentPeriod}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-5 ${getProPanelClass(color)}`}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h4 className="text-xs font-black uppercase text-slate-600">
              Tecnici{" "}
              <span className="text-slate-400">{dynamicMonthLabel}</span>
            </h4>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {advancedStats.topTechs.length === 0 && (
              <p className="text-xs text-slate-400 italic">Nessun dato</p>
            )}
            {advancedStats.topTechs.map(([tech, count], i) => (
              <div
                key={tech}
                onClick={() => {
                  const techLogs = calendarFilteredLogs.filter(
                    (l) =>
                      l.technician === tech ||
                      (l.additionalTechnicians &&
                        l.additionalTechnicians.includes(tech))
                  );
                  setPopoverData({
                    date: `Interventi: ${tech}`,
                    logs: techLogs,
                  });
                }}
                className="flex justify-between text-xs items-center cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-slate-100"
              >
                <div className="flex gap-2 items-center">
                  <span
                    className={`font-bold w-5 h-5 flex items-center justify-center rounded-full text-[9px] shadow-sm ${
                      i === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-bold text-slate-700 hover:text-blue-600 transition-colors">
                    {tech}
                  </span>
                </div>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded shadow-sm">
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
              Tipi <span className="text-slate-400">{dynamicMonthLabel}</span>
            </h4>
          </div>
          <div className="space-y-3">
            {advancedStats.topMachineTypes.slice(0, 5).map(([type, count]) => {
              const pct = Math.round((count / stats.currentPeriod) * 100) || 0;
              return (
                <div key={type}>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>{type}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full shadow-inner overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-1000"
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
            <BarChart className="w-5 h-5 text-orange-500" />
            <h4 className="text-xs font-black uppercase text-slate-600">
              Clienti{" "}
              <span className="text-slate-400">{dynamicMonthLabel}</span>
            </h4>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {advancedStats.topCustomers.length === 0 && (
              <p className="text-xs text-slate-400 italic">Nessun dato</p>
            )}
            {advancedStats.topCustomers.map(([cust, count], i) => (
              <div
                key={cust}
                onClick={() => {
                  const custLogs = calendarFilteredLogs.filter(
                    (l) => l.customer === cust
                  );
                  setPopoverData({
                    date: `Interventi: ${cust}`,
                    logs: custLogs,
                  });
                }}
                className="flex justify-between text-xs items-center cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-slate-100"
              >
                <div className="flex gap-2 items-center">
                  <span
                    className={`font-bold w-5 h-5 flex items-center justify-center rounded-full text-[9px] shadow-sm shrink-0 ${
                      i === 0
                        ? "bg-orange-100 text-orange-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-bold text-slate-700 hover:text-orange-600 transition-colors truncate max-w-[150px]">
                    {cust}
                  </span>
                </div>
                <span className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded shadow-sm">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <div className="flex items-center gap-2 ml-1">
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Calendario Interventi
          </h4>
        </div>
        <SimpleCalendar
          logs={logs}
          month={calMonth}
          year={calYear}
          onMonthChange={(m, y) => {
            setCalMonth(m);
            setCalYear(y);
          }}
          onDayClick={(dayLogs, dateLabel) =>
            setPopoverData({ logs: dayLogs, date: dateLabel })
          }
        />
      </div>

      <div
        className={`p-6 ${getProPanelClass(color)} border-t-${color}-500 mt-6`}
      >
        <div className="flex items-center gap-3 mb-4">
          <Search className={`w-5 h-5 text-${color}-600`} />
          <h2 className="text-lg font-black text-slate-800 uppercase">
            Cerca N. Assistenza
          </h2>
        </div>
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Inserisci il numero assistenza (es. 12345)..."
            className={PRO_INPUT}
            value={ticketSearch}
            onChange={(e) => setTicketSearch(e.target.value)}
          />
          <Search className="absolute right-3 top-3.5 text-slate-400 w-5 h-5" />
        </div>
        {ticketSearch.trim() !== "" && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {ticketSearchResults.length === 0 ? (
              <div className="text-center p-4 bg-slate-50 rounded-xl text-slate-500 text-xs italic">
                Nessun intervento trovato con questo numero.
              </div>
            ) : (
              ticketSearchResults.map((log) => (
                <div
                  key={log.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg uppercase">
                        {log.dateString}
                      </span>
                      <span
                        className={`text-[10px] font-black text-${color}-700 bg-${color}-50 border border-${color}-200 px-2 py-1 rounded-lg uppercase`}
                      >
                        N. {log.ticketNumber}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 uppercase">
                      {getTechsString(log)}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-800 text-sm uppercase">
                    {log.customer}
                  </h4>
                  <div className="flex flex-wrap gap-1 mt-1 mb-2">
                    <span
                      className={`text-[10px] font-bold text-${color}-600 bg-${color}-50 px-1.5 py-0.5 rounded uppercase`}
                    >
                      MAT: {log.machineId}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 border-l border-slate-300 pl-1 ml-1">
                      {log.machineType}
                    </span>
                    {log.capacity && (
                      <span className="text-[10px] font-bold text-slate-500 border-l border-slate-300 pl-1 ml-1">
                        {formatCapacity(log.capacity)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 italic whitespace-pre-wrap break-words bg-slate-50 p-3 rounded-lg border border-slate-100">
                    "{log.description}"
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div
        className={`p-6 ${getProPanelClass(color)} border-t-indigo-600 mt-6`}
      >
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
                  .filter((m) =>
                    (m.matricola || m.id).includes(
                      selectedMachine.toUpperCase()
                    )
                  )
                  .map((m) => (
                    <li
                      key={m.id}
                      onClick={() => {
                        setSelectedMachine(m.matricola || m.id);
                        setShowMachineSuggestions(false);
                      }}
                      className="p-3 hover:bg-slate-50 cursor-pointer font-bold text-xs uppercase text-slate-700 border-b border-slate-50"
                    >
                      {m.matricola || m.id} -{" "}
                      <span className="text-[9px] text-slate-400 normal-case">
                        {m.customerName}
                      </span>
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
                      {l.dateString} - {getTechsString(l)}
                    </span>
                    <span className="text-[10px] font-black text-blue-600">
                      {l.machineId}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {l.customer}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 italic whitespace-pre-wrap break-words">
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

const AdminPanel = ({
  customers,
  technicians,
  machines,
  machineTypes,
  isMobile,
  layoutConfig,
  onUpdateLayout,
  notificationsEnabled,
  setNotificationsEnabled,
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
        (s) => {
          setLogs(s.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
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
            if (!grouped[u.technician]) {
              grouped[u.technician] = { ...u, allDevices: new Set([u.device]) };
            } else {
              grouped[u.technician].allDevices.add(u.device);
              if (
                u.lastActive.seconds > grouped[u.technician].lastActive.seconds
              ) {
                grouped[u.technician].lastActive = u.lastActive;
              }
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
    if (clientSearch) {
      res = res.filter((c) =>
        c.name.toLowerCase().includes(clientSearch.toLowerCase())
      );
    }
    if (clientSort === "az") {
      res.sort((a, b) => a.name.localeCompare(b.name));
    } else if (clientSort === "za") {
      res.sort((a, b) => b.name.localeCompare(a.name));
    }
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
    if (machineSort === "mat-az") {
      res.sort((a, b) =>
        (a.matricola || a.id).localeCompare(b.matricola || b.id)
      );
    } else if (machineSort === "mat-za") {
      res.sort((a, b) =>
        (b.matricola || b.id).localeCompare(a.matricola || a.id)
      );
    } else if (machineSort === "cust-az") {
      res.sort((a, b) => a.customerName.localeCompare(b.customerName));
    }
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
          if (normA === normB && normA !== "") {
            isDup = true;
          } else if (normA.length > 4 && normB.length > 4) {
            const dist = getLevenshteinDistance(normA, normB);
            if (
              dist <= 2 ||
              (normA.includes(normB) && normA.length - normB.length < 5) ||
              (normB.includes(normA) && normB.length - normA.length < 5)
            ) {
              isDup = true;
            }
          }
        } else if (type === "machine") {
          const normA = normalize(getSafeMatricola(items[i]));
          const normB = normalize(getSafeMatricola(items[j]));
          const custA = normalize(items[i].customerName);
          const custB = normalize(items[j].customerName);

          if (custA === custB) {
            if (normA === normB && normA !== "") {
              isDup = true;
            } else if (normA.length > 2 && normB.length > 2) {
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
        {
          idA: itemA.id,
          idB: itemB.id,
          timestamp: serverTimestamp(),
        }
      );
      setDuplicateAnalysis((prev) => {
        if (!prev) return null;
        const newPairs = prev.pairs.filter((p) => {
          const currentPairId = [p[0].id, p[1].id].sort().join("_");
          return currentPairId !== pairId;
        });
        return { ...prev, pairs: newPairs };
      });
    } catch (e) {
      console.error(e);
      alert("Errore durante il salvataggio della preferenza.");
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

  const deleteItem = (coll, id) => {
    setItemToDelete({ coll, id });
  };

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

    const matSource = getSafeMatricola(source);
    const matTarget = getSafeMatricola(target);
    const qLogsMat = query(
      collection(db, "artifacts", appId, "public", "data", "maintenance_logs"),
      where("machineId", "==", matSource),
      where("customer", "==", source.customerName)
    );
    const logsSnapMat = await getDocs(qLogsMat);

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
      if (type === "customer") {
        await handleMergeCustomers(source, target);
      } else {
        await handleMergeMachines(source, target);
      }
      setDuplicateAnalysis((prev) => {
        if (!prev) return null;
        const newPairs = prev.pairs.filter(
          (p) => p[0].id !== source.id && p[1].id !== source.id
        );
        return { ...prev, pairs: newPairs };
      });
    } catch (e) {
      console.error(e);
      alert("Errore durante l'unione.");
    }
  };

  const toggleNotifications = async () => {
    if (!("Notification" in window)) {
      alert("Il tuo browser non supporta le notifiche.");
      return;
    }
    if (!notificationsEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        localStorage.setItem("mora_notifications", "true");
        new Notification("Assistenza Mora", {
          body: "Notifiche per i nuovi interventi attivate con successo!",
        });
      } else {
        alert(
          "Devi autorizzare le notifiche nelle impostazioni del tuo browser."
        );
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem("mora_notifications", "false");
    }
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
                className="p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-50"
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
                className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors shrink-0"
                title="Cambia Vista"
              >
                <Layout className="w-4 h-4" />
              </button>
              <button
                onClick={() => analyzeDuplicates("customer", customers)}
                className="p-2 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors shrink-0 flex items-center gap-1.5"
                title="Trova Conflitti o Duplicati"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden md:block">
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
                className="flex justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl items-center group hover:border-blue-300 hover:shadow-sm transition-all"
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
                    className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                    title="Unisci"
                  >
                    <GitMerge className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingCustomer(c)}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    title="Modifica"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteItem("customers", c.id)}
                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="Elimina"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {processedCustomers.length === 0 && (
              <div className="col-span-full text-center py-10 text-xs font-bold text-slate-400 uppercase tracking-widest">
                Nessun cliente trovato
              </div>
            )}
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
                placeholder="Cerca gru, tipo..."
                className="p-2 border border-slate-200 rounded-lg text-xs flex-1 md:w-40"
                value={machineSearch}
                onChange={(e) => setMachineSearch(e.target.value)}
              />
              <select
                className="p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 outline-none cursor-pointer hover:bg-slate-50"
                value={machineSort}
                onChange={(e) => setMachineSort(e.target.value)}
              >
                <option value="cust-az">Per Cliente</option>
                <option value="mat-az">Matricola (A-Z)</option>
                <option value="mat-za">Matricola (Z-A)</option>
              </select>
              <button
                onClick={() =>
                  setListViewMode((p) => (p === "grid" ? "list" : "grid"))
                }
                className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition-colors shrink-0"
                title="Cambia Vista"
              >
                <Layout className="w-4 h-4" />
              </button>
              <button
                onClick={() => analyzeDuplicates("machine", machines)}
                className="p-2 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors shrink-0 flex items-center gap-1.5"
                title="Trova Conflitti o Duplicati"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden md:block">
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
                className="flex justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl items-center group hover:border-blue-300 hover:shadow-sm transition-all"
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
                    className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                    title="Unisci"
                  >
                    <GitMerge className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingMachine(m)}
                    className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    title="Modifica"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteItem("machines", m.id)}
                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="Elimina"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {processedMachines.length === 0 && (
              <div className="col-span-full text-center py-10 text-xs font-bold text-slate-400 uppercase tracking-widest">
                Nessuna gru trovata
              </div>
            )}
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
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between shadow-sm mb-8">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${
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
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {notificationsEnabled
                    ? "Attive su questo dispositivo"
                    : "Disattivate"}
                </p>
              </div>
            </div>
            <button
              onClick={toggleNotifications}
              className={`px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all shadow-sm ${
                notificationsEnabled
                  ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                  : "bg-slate-800 text-white hover:bg-slate-900"
              }`}
            >
              {notificationsEnabled ? "Disattiva" : "Attiva"}
            </button>
          </div>

          <h4 className="font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" /> Stato Sistema e
            Database
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${
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
                    {isOnline
                      ? "Online - Sincronizzato"
                      : "Offline - Rete Assente"}
                  </p>
                </div>
              </div>
              <div className="text-right flex items-center justify-center">
                <Database
                  className={`w-6 h-6 ${
                    isOnline ? "text-green-500 animate-pulse" : "text-red-500"
                  }`}
                />
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center justify-start gap-4 group shadow-sm active:scale-95"
            >
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:rotate-180 transition-transform duration-500 shadow-inner">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h5 className="font-bold text-sm text-slate-800 uppercase">
                  Riavvia App
                </h5>
                <p className="text-[10px] text-slate-500 font-bold uppercase">
                  Forza aggiornamento dati
                </p>
              </div>
            </button>
          </div>

          <h4 className="font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
            <Wifi className="w-5 h-5 text-green-500" /> Utenti Attivi Ora (
            {activeUsers.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
            {activeUsers.length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs italic">
                Nessun utente attivo rilevato negli ultimi 5 minuti.
              </div>
            ) : (
              activeUsers.map((u) => (
                <div
                  key={u.id || u.technician}
                  className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-slate-800">
                        {u.technician}
                      </h5>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {u.device}
                      </p>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">
                    Ultimo segnale:
                    <br />
                    <span className="font-bold text-slate-600">
                      {u.lastActive
                        ? new Date(
                            u.lastActive.seconds * 1000
                          ).toLocaleTimeString()
                        : "Ora"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <h4 className="font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-slate-800" /> Log Accessi e
            Sistema
          </h4>
          <div className="bg-slate-900 rounded-xl p-4 overflow-hidden font-mono text-xs text-green-400 h-[300px] overflow-y-auto border-t-4 border-slate-700 custom-scrollbar shadow-inner">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic">Nessun log recente...</div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="mb-2 pb-2 border-b border-slate-800/50 flex flex-col sm:flex-row gap-1 sm:gap-3"
                >
                  <span className="text-slate-500 shrink-0">
                    [
                    {log.timestamp?.seconds
                      ? new Date(log.timestamp.seconds * 1000).toLocaleString(
                          "it-IT"
                        )
                      : "now"}
                    ]
                  </span>
                  <span>
                    <span
                      className={
                        log.action === "LOGIN"
                          ? "text-blue-400 font-bold"
                          : "text-yellow-500 font-bold"
                      }
                    >
                      {log.action || "INFO"}
                    </span>
                    <span className="text-slate-300 ml-2">
                      {log.technician || "Sconosciuto"}
                    </span>
                    <span className="text-slate-500 ml-2">
                      ({log.device || "Unknown"})
                    </span>
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <button
              onClick={() => {
                localStorage.removeItem("mora_tech_last_name");
                localStorage.removeItem("mora_app_unlocked");
                sessionStorage.removeItem("mora_access_tech");
                window.location.reload();
              }}
              className="w-full p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center gap-3 text-red-600 hover:bg-red-100 font-bold uppercase tracking-wider transition-all shadow-sm"
            >
              <LogOut className="w-5 h-5" /> Scollega Il Mio Dispositivo
            </button>
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
        <div className="fixed inset-0 z-[300] bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="p-6 max-w-xs w-full text-center space-y-5 bg-white rounded-xl shadow-xl border-t-4 border-t-red-500 animate-in zoom-in-95">
            <div className="p-3 bg-red-100 text-red-600 rounded-full w-fit mx-auto">
              <Trash2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-black text-slate-800 uppercase text-sm">
                Eliminare?
              </h4>
              <p className="text-xs text-slate-500 mt-2">
                Questa azione è irreversibile e rimuoverà il dato dal database.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={confirmDeleteAdmin}
                className="py-3 bg-red-600 text-white rounded-lg font-bold text-xs uppercase shadow-md hover:bg-red-700 active:scale-95 transition-all"
              >
                Elimina
              </button>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
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
      icon: Folder,
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

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    localStorage.getItem("mora_notifications") === "true"
  );
  const notifRef = useRef(notificationsEnabled);

  useEffect(() => {
    notifRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  useEffect(() => {
    if (currentTechName && currentTechName.trim().toLowerCase() === "luca") {
      setIsAdminAuthenticated(true);
    }
  }, [currentTechName]);

  useEffect(() => {
    let timeoutId;

    const updateLayout = () => {
      let isPortrait = true;
      if (
        window.screen &&
        window.screen.orientation &&
        window.screen.orientation.type
      ) {
        isPortrait = window.screen.orientation.type.startsWith("portrait");
      } else if (window.matchMedia) {
        isPortrait = window.matchMedia("(orientation: portrait)").matches;
      } else {
        isPortrait = window.innerHeight >= window.innerWidth;
      }

      const isSmallScreen = window.innerWidth < 1024;
      setIsMobileView(isSmallScreen && isPortrait);
    };

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateLayout, 150);
    };

    const handleOrientationChange = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateLayout, 300);
    };

    updateLayout();

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  const [activeUsersList, setActiveUsersList] = useState([]);
  const [showOnlineDropdown, setShowOnlineDropdown] = useState(false);

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

    const savedTechName = localStorage.getItem("mora_tech_last_name");
    const hasUnlockToken = localStorage.getItem("mora_app_unlocked") === "true";

    if (savedTechName || hasUnlockToken) {
      setIsAppUnlocked(true);
    }

    onAuthStateChanged(auth, (u) => {
      setUser(u);
      setTimeout(() => setIsAppLoading(false), 2000);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    const sessionId =
      sessionStorage.getItem("mora_session_id") || crypto.randomUUID();
    sessionStorage.setItem("mora_session_id", sessionId);

    const techName = currentTechName || "Anonimo";
    const device = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
      ? "Mobile"
      : "Desktop";

    const updatePresence = async () => {
      try {
        await setDoc(
          doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "active_users",
            sessionId
          ),
          {
            userId: user.uid,
            technician: techName,
            device: device,
            userAgent: navigator.userAgent.substring(0, 50),
            lastActive: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (e) {}
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000);

    const loggedTech = sessionStorage.getItem("mora_access_tech");
    if (loggedTech !== techName && techName !== "Anonimo") {
      try {
        addDoc(
          collection(db, "artifacts", appId, "public", "data", "access_logs"),
          {
            userId: user.uid,
            technician: techName,
            action: "LOGIN",
            device: device,
            timestamp: serverTimestamp(),
          }
        );
        sessionStorage.setItem("mora_access_tech", techName);
      } catch (e) {}
    }

    return () => clearInterval(interval);
  }, [user, currentTechName]);

  useEffect(() => {
    if (!user) return;

    const unsubActiveUsers = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "active_users"),
      (s) => {
        const now = Date.now();
        const activeDocs = s.docs
          .map((d) => d.data())
          .filter(
            (u) =>
              u.lastActive && now - u.lastActive.seconds * 1000 < 5 * 60 * 1000
          );

        const grouped = {};
        activeDocs.forEach((u) => {
          if (!grouped[u.technician]) {
            grouped[u.technician] = { ...u, allDevices: new Set([u.device]) };
          } else {
            grouped[u.technician].allDevices.add(u.device);
            if (
              u.lastActive.seconds > grouped[u.technician].lastActive.seconds
            ) {
              grouped[u.technician].lastActive = u.lastActive;
            }
          }
        });

        const users = Object.values(grouped)
          .map((u) => ({
            ...u,
            device: Array.from(u.allDevices).join(" + "),
          }))
          .sort((a, b) => b.lastActive.seconds - a.lastActive.seconds);

        setActiveUsersList(users);
        setOnlineUsersCount(users.length);
      }
    );

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
          let fOrder = data.formOrder || DEFAULT_LAYOUT.formOrder;
          if (!fOrder.includes("ticketNumber")) {
            fOrder = [...fOrder];
            const dateIdx = fOrder.indexOf("date");
            if (dateIdx !== -1) fOrder.splice(dateIdx + 1, 0, "ticketNumber");
            else fOrder.unshift("ticketNumber");
          }
          setLayoutConfig((prev) => ({
            ...DEFAULT_LAYOUT,
            ...data,
            dashboardOrder: order,
            formOrder: fOrder,
          }));
        }
      }
    );

    let isInitialLogsLoad = true;

    const unsubLogs = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "maintenance_logs"),
      (s) => {
        if (
          !isInitialLogsLoad &&
          notifRef.current &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          s.docChanges().forEach((change) => {
            if (change.type === "added") {
              const newLog = change.doc.data();
              if (
                newLog.userId !== user.uid &&
                newLog.createdAt &&
                Date.now() - newLog.createdAt.seconds * 1000 < 300000
              ) {
                new Notification(`Nuovo Intervento: ${newLog.customer}`, {
                  body: `Tecnico: ${getTechsString(newLog)}\nGru: ${
                    newLog.machineId
                  }`,
                  icon: "/favicon.ico",
                });
              }
            }
          });
        }
        isInitialLogsLoad = false;

        setLogs(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
              const parseDate = (ds) => {
                if (!ds) return 0;
                const parts = ds.split("/");
                if (parts.length !== 3) return 0;
                const [d, m, y] = parts.map(Number);
                return new Date(y, m - 1, d).getTime() || 0;
              };
              const dateA = parseDate(a.dateString);
              const dateB = parseDate(b.dateString);
              if (dateA !== dateB) return dateB - dateA;
              return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
            })
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
      unsubActiveUsers();
    };
  }, [user]);

  const handleAdminAccess = () => {
    if (currentTechName && currentTechName.trim().toLowerCase() === "luca") {
      setIsAdminAuthenticated(true);
      setActiveTab("admin");
    } else if (!isAdminAuthenticated) {
      setShowAdminLogin(true);
    } else {
      setActiveTab("admin");
    }
  };

  const handleUpdateLayout = async (cfg) => {
    setLayoutConfig(cfg);
    await setDoc(
      doc(db, "artifacts", appId, "public", "data", "settings", "layout"),
      cfg
    );
  };

  const openMachineDetail = (mId, mCustomer) => {
    let machine;
    if (mCustomer) {
      machine = machines.find(
        (m) => getSafeMatricola(m) === mId && m.customerName === mCustomer
      );
    } else {
      machine = machines.find((m) => getSafeMatricola(m) === mId);
    }

    setViewingMachineHistory(
      machine || {
        id: mId,
        matricola: mId,
        customerName: mCustomer || "N.D.",
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

  const handleGlobalUnlock = (techName) => {
    localStorage.setItem("mora_tech_last_name", techName);
    localStorage.setItem("mora_app_unlocked", "true");
    setCurrentTechName(techName);
    setIsAppUnlocked(true);
  };

  const color = layoutConfig.themeColor || "blue";

  if (isAppLoading)
    return (
      <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-[100] animate-out fade-out duration-1000 fill-mode-forwards">
        <div className="relative flex flex-col items-center animate-in zoom-in duration-700">
          <div
            className={`p-6 rounded-3xl bg-${color}-600 shadow-2xl mb-6 shadow-${color}-500/50`}
          >
            <HardHat className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-widest mb-2 shadow-sm">
            ASSISTENZA MORA
          </h1>
          <p
            className={`text-${color}-400 text-xs font-bold uppercase tracking-widest animate-pulse`}
          >
            Caricamento sistema...
          </p>
          <div className="mt-8 flex gap-2">
            <div
              className={`w-2 h-2 rounded-full bg-${color}-500 animate-bounce`}
            ></div>
            <div
              className={`w-2 h-2 rounded-full bg-${color}-500 animate-bounce`}
              style={{ animationDelay: "-0.2s" }}
            ></div>
            <div
              className={`w-2 h-2 rounded-full bg-${color}-500 animate-bounce`}
              style={{ animationDelay: "-0.4s" }}
            ></div>
          </div>
        </div>
      </div>
    );

  if (!isAppUnlocked && !loading) {
    return (
      <GlobalLoginScreen
        technicians={technicians}
        onUnlock={handleGlobalUnlock}
        color={color}
      />
    );
  }

  if (!isAppUnlocked && loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <RefreshCw className={`animate-spin text-${color}-600 w-10 h-10`} />
      </div>
    );
  }

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
              <div className="relative">
                <h1 className="text-lg font-black uppercase tracking-tighter leading-none text-slate-800 flex items-center gap-2">
                  {layoutConfig.appTitle}
                  {onlineUsersCount > 0 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isAdminAuthenticated)
                          setShowOnlineDropdown(!showOnlineDropdown);
                      }}
                      className={`flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full ${
                        isAdminAuthenticated
                          ? "cursor-pointer hover:bg-green-100 shadow-sm transition-all"
                          : ""
                      }`}
                      title={
                        isAdminAuthenticated
                          ? "Clicca per vedere i tecnici"
                          : `${onlineUsersCount} Tecnici Online`
                      }
                    >
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-[9px] font-black text-green-700 uppercase mt-0.5">
                        {onlineUsersCount}{" "}
                        {onlineUsersCount === 1
                          ? "tecnico online"
                          : "tecnici online"}
                      </span>
                      {isAdminAuthenticated && (
                        <ChevronDown
                          className={`w-3 h-3 text-green-600 transition-transform ${
                            showOnlineDropdown ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </div>
                  )}
                </h1>

                {showOnlineDropdown && isAdminAuthenticated && (
                  <div
                    className="absolute top-full left-0 mt-3 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <span className="text-[10px] font-black uppercase text-slate-700">
                        In Diretta ({onlineUsersCount})
                      </span>
                      <button
                        onClick={() => setShowOnlineDropdown(false)}
                        className="p-1 hover:bg-slate-200 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-slate-500" />
                      </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      {activeUsersList.map((u) => (
                        <div
                          key={u.id || u.technician}
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors"
                        >
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 shrink-0 shadow-inner">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate leading-tight">
                              {u.technician}
                            </div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                              {u.device}
                            </div>
                          </div>
                          <div className="text-[9px] font-bold text-slate-400 shrink-0">
                            {u.lastActive
                              ? new Date(
                                  u.lastActive.seconds * 1000
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Ora"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <span
                className={`text-[10px] font-bold text-${color}-600 uppercase tracking-wider block mt-0.5`}
              >
                {currentTechName ? `Ciao, ${currentTechName}` : "Tecnico"}
              </span>
            </div>
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
                notificationsEnabled={notificationsEnabled}
                setNotificationsEnabled={setNotificationsEnabled}
              />
            )}
          </div>
        )}
      </main>

      {viewingMachineHistory && (
        <MachineHistoryModal
          machine={viewingMachineHistory}
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
