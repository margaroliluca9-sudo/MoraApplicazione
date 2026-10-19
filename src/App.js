import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  PlusCircle,
  History,
  Settings,
  ChevronDown,
  RefreshCw,
  ArrowLeft,
  Sun,
  Moon,
  SunMoon,
  WifiOff,
  UploadCloud,
  Home,
  Folder,
} from "lucide-react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { auth, db, appId } from "./firebase";
import { DEFAULT_LAYOUT } from "./constants";
import { getSafeMatricola } from "./utils";
import { PRO_BUTTON_SECONDARY } from "./ui";
import { GlobalLoginScreen } from "./components/GlobalLoginScreen";
import { SplashScreen } from "./components/SplashScreen";
import { SEASONS, seasonOf } from "./season";
import { CraneMark } from "./components/CraneMark";
import {
  THEME_MODES,
  THEME_LABELS,
  getThemeMode,
  saveThemeMode,
  isDarkMode,
  applyTheme,
  onSystemThemeChange,
} from "./theme";
import { applyAppearance, getCachedLayout, cacheLayout } from "./appearance";
import { NavButton } from "./components/NavButton";
import { OnlineMenu, onlineUnread } from "./components/OnlineMenu";
import { AdminLoginModal } from "./components/AdminLoginModal";
import { PhotoViewerModal } from "./components/PhotoViewerModal";
import { PdfHost } from "./components/PdfHost";
import { refreshPush, key as techKey, chatDoc } from "./chat";
import { HOME_PREFS, cachedPrefs, cachePrefs, cleanLook } from "./home";
import { PERSONAL } from "./personal";
import { VAN } from "./van";
import { VanHost } from "./components/VanHost";
import { MachineHistoryModal } from "./components/modals/MachineHistoryModal";
import { CustomerDetailModal } from "./components/modals/CustomerDetailModal";
import { DashboardView } from "./views/DashboardView";
import { ExploreView } from "./views/ExploreView";
import { DatabaseView } from "./views/DatabaseView";
import { OfficeView } from "./views/OfficeView";
import { NewEntryForm } from "./views/NewEntryForm";
import { HistoryView } from "./views/HistoryView";
import { AdminPanel } from "./views/AdminPanel";

// SENZA RETE: "aggiornati oggi alle 8:42" / "ieri alle 17:10" / "il 16/10 alle 9:00"
const readLastSync = () => {
  try {
    return Number(localStorage.getItem("mora_last_sync")) || 0;
  } catch (e) {
    return 0;
  }
};
const syncWhen = (ms) => {
  const d = new Date(ms);
  const t = new Date();
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(t) - day(d)) / 86400000);
  if (diff === 0) return "oggi alle " + hm;
  if (diff === 1) return "ieri alle " + hm;
  return `il ${d.getDate()}/${d.getMonth() + 1} alle ${hm}`;
};

// animazione di avvio del periodo dell'anno (si può provare con "?stagione=natale")
const splashSeason = (cfg) => {
  try {
    const forced = new URLSearchParams(window.location.search).get("stagione");
    if (SEASONS.includes(forced)) return forced;
  } catch (e) {
    // niente
  }
  return cfg.seasonalSplash === false ? "normale" : seasonOf();
};

export default function App() {
  // TEMA chiaro / scuro (scelto su ogni dispositivo)
  const [themeMode, setThemeMode] = useState(getThemeMode);
  // "Nuovo rapporto su questa gru": dati già scritti nel modulo
  const [newPrefill, setNewPrefill] = useState(null);
  const [isDark, setIsDark] = useState(() => isDarkMode(getThemeMode()));
  useEffect(() => {
    setIsDark(applyTheme(themeMode));
    saveThemeMode(themeMode);
    if (themeMode !== "auto") return;
    return onSystemThemeChange(() => setIsDark(applyTheme("auto")));
  }, [themeMode]);
  const cycleTheme = () =>
    setThemeMode(
      (m) => THEME_MODES[(THEME_MODES.indexOf(m) + 1) % THEME_MODES.length]
    );
  const ThemeIcon =
    themeMode === "dark" ? Moon : themeMode === "light" ? Sun : SunMoon;

  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  useEffect(() => {
    if (activeTab !== "new") setNewPrefill(null);
  }, [activeTab]);
  const [logs, setLogs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [machines, setMachines] = useState([]);
  const [machineTypes, setMachineTypes] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatReads, setChatReads] = useState([]);
  // magazzino furgoni (tutti) e "La mia area" (solo le cose del tecnico collegato)
  const [vans, setVans] = useState([]);
  const [vanItems, setVanItems] = useState([]);
  const [personal, setPersonal] = useState({ events: [], notes: [], reminders: [], contacts: [] });
  const [loading, setLoading] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [currentTechName, setCurrentTechName] = useState(
    localStorage.getItem("mora_tech_last_name") || ""
  );
  // impostazioni grafiche: parte dalla copia salvata sul telefono, poi arriva quella del database
  const [layoutConfig, setLayoutConfig] = useState(() => ({
    ...DEFAULT_LAYOUT,
    ...getCachedLayout(),
  }));
  // ASPETTO PERSONALE ("Modifica aspetto"): preferenze del tecnico, sopra quelle dell'admin
  const [homePrefs, setHomePrefs] = useState(() => cachedPrefs(currentTechName));
  const [previewLook, setPreviewLook] = useState(undefined); // anteprima mentre modifica
  const modeBeforePreview = useRef(null);
  useEffect(() => {
    const me = techKey(currentTechName);
    setHomePrefs(cachedPrefs(currentTechName));
    if (!user || !me) return undefined;
    const unsub = onSnapshot(
      chatDoc(HOME_PREFS, me),
      (snap) => {
        const d = snap.exists() ? snap.data() : null;
        const p = d && !d.reset ? d : null;
        cachePrefs(currentTechName, p);
        setHomePrefs(p);
      },
      () => {}
    );
    return () => unsub();
  }, [user, currentTechName]);
  const look = previewLook !== undefined ? previewLook : cleanLook(homePrefs && homePrefs.look);
  const viewConfig = useMemo(() => {
    if (!look) return layoutConfig;
    const { mode, preset, ...rest } = look;
    return { ...layoutConfig, ...rest };
  }, [layoutConfig, look]);
  useEffect(() => {
    applyAppearance(viewConfig);
  }, [viewConfig]);
  useEffect(() => {
    cacheLayout(layoutConfig);
  }, [layoutConfig]);
  // tema chiaro/scuro scelto nell'aspetto: lo applico anche al pulsante in alto
  const lookMode = look ? look.mode : undefined;
  useEffect(() => {
    if (lookMode) setThemeMode(lookMode);
  }, [lookMode]);
  // RUOLI: "tecnico" (tutta l'app) o "ufficio" (solo interventi ed Esplora). Lo decide l'admin in Staff.
  const meTech = technicians.find((t) => techKey(t.name) === techKey(currentTechName));
  const isOffice = !!meTech && meTech.role === "ufficio";
  // chi fa i rapporti: solo i tecnici (quelli dell'ufficio non compaiono negli elenchi)
  const fieldTechs = useMemo(() => technicians.filter((t) => t.role !== "ufficio"), [technicians]);
  useEffect(() => {
    if (isOffice && !["dashboard", "history", "explore"].includes(activeTab)) setActiveTab("dashboard");
  }, [isOffice, activeTab]);
  const handlePreviewLook = (next, phase) => {
    if (phase === "start") modeBeforePreview.current = themeMode;
    if (phase === "cancel" && modeBeforePreview.current) setThemeMode(modeBeforePreview.current);
    setPreviewLook(phase === "cancel" || phase === "save" ? undefined : next);
  };
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [globalPhotoView, setGlobalPhotoView] = useState(null);

  useEffect(() => {
    if (currentTechName && currentTechName.trim().toLowerCase() === "luca") {
      setIsAdminAuthenticated(true);
    }
  }, [currentTechName]);

  useEffect(() => {
    let timeoutId;

    const updateLayout = () => {
      // Usiamo solo la larghezza dello schermo per determinare la vista mobile,
      // permettendo all'app di ruotare correttamente senza passare al layout desktop.
      const isSmallScreen = window.innerWidth < 1024;
      setIsMobileView(isSmallScreen);
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
  // "Tecnici online": si apre anche dalla notifica di un messaggio ("?online=dm:...")
  const [onlineConv, setOnlineConv] = useState(() => {
    try {
      const c = new URLSearchParams(window.location.search).get("online");
      if (c) window.history.replaceState(null, "", window.location.pathname);
      return c || null;
    } catch (e) {
      return null;
    }
  });
  const [showOnlineDropdown, setShowOnlineDropdown] = useState(() => onlineConv !== null);

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
      // con l'animazione di avvio attiva si aspetta che finisca (~2,4 s)
      const splashOn = getCachedLayout().showSplash !== false;
      setTimeout(() => setIsAppLoading(false), splashOn ? 2500 : 300);
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

  // RETE: avviso quando il telefono è offline e rapporti non ancora inviati
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine !== false
  );
  const [pendingCount, setPendingCount] = useState(0);
  // ultima volta che i dati sono arrivati dal server (per dire "aggiornati alle...")
  const [lastSync, setLastSync] = useState(readLastSync);
  const markSynced = () => {
    const now = Date.now();
    setLastSync((prev) => {
      if (now - prev < 60000) return prev;
      try {
        localStorage.setItem("mora_last_sync", String(now));
      } catch (e) {
        // niente
      }
      return now;
    });
  };
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // DISCONNESSIONE FORZATA dall'amministratore (Admin > System)
  const logoutRef = useRef(null);
  useEffect(() => {
    if (!user) return;
    const sessionId =
      sessionStorage.getItem("mora_session_id") || crypto.randomUUID();
    sessionStorage.setItem("mora_session_id", sessionId);
    const presenceRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "active_users",
      sessionId
    );
    const unsub = onSnapshot(presenceRef, (snap) => {
      const data = snap && snap.exists() ? snap.data() : null;
      const kickedAt = data && data.kickedAt && data.kickedAt.seconds;
      if (!kickedAt) return;
      // ogni richiesta viene applicata una sola volta (niente loop)
      if (sessionStorage.getItem("mora_kick_handled") === String(kickedAt))
        return;
      sessionStorage.setItem("mora_kick_handled", String(kickedAt));
      deleteDoc(presenceRef).catch(() => {});
      if (logoutRef.current) logoutRef.current();
      alert("Sei stato disconnesso dall'amministratore.");
    });
    return () => unsub();
  }, [user]);

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

          if (!fOrder.includes("photos")) {
            fOrder = [...fOrder];
            const descIdx = fOrder.indexOf("description");
            if (descIdx !== -1) fOrder.splice(descIdx + 1, 0, "photos");
            else fOrder.push("photos");
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

    const unsubLogs = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "maintenance_logs"),
      { includeMetadataChanges: true },
      (s) => {
        // dati arrivati dal server (non dalla copia sul telefono): segno l'ora
        if (s.metadata && s.metadata.fromCache === false) markSynced();
        // interventi salvati sul telefono ma non ancora arrivati al server
        setPendingCount(
          s.docs.filter((d) => d.metadata && d.metadata.hasPendingWrites).length
        );
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
    const unsubVans = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", VAN.vans),
      (s) => setVans(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setVans([])
    );
    const unsubVanItems = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", VAN.items),
      (s) => setVanItems(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setVanItems([])
    );

    return () => {
      unsubVans();
      unsubVanItems();
      unsubLayout();
      unsubLogs();
      unsubCust();
      unsubTech();
      unsubMach();
      unsubTypes();
      unsubActiveUsers();
    };
  }, [user]);

  // CHAT: messaggi (le foto sono a parte) e fin dove ha letto ognuno.
  // Solo se l'admin l'ha attivata (Impostazioni > Design > Chat tra tecnici).
  const chatEnabled = layoutConfig.chatEnabled === true;
  // messaggi veloci dal menu "Tecnici online" (stessi messaggi della chat, si spengono a parte)
  const onlineMessages = layoutConfig.onlineMessages !== false;
  const needChat = chatEnabled || onlineMessages;
  useEffect(() => {
    if (!user || !needChat) {
      setChatMessages([]);
      setChatReads([]);
      return undefined;
    }
    const unsubChat = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "chat_messages"),
      (s) => setChatMessages(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setChatMessages([])
    );
    const unsubReads = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "chat_reads"),
      (s) => setChatReads(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setChatReads([])
    );
    return () => {
      unsubChat();
      unsubReads();
    };
  }, [user, needChat]);
  const onlineBadge = useMemo(
    () => (onlineMessages ? onlineUnread(chatMessages, chatReads, currentTechName) : 0),
    [onlineMessages, chatMessages, chatReads, currentTechName]
  );

  // LA MIA AREA: carico solo i documenti del tecnico collegato
  useEffect(() => {
    const me = techKey(currentTechName);
    setPersonal({ events: [], notes: [], reminders: [], contacts: [] });
    if (!user || !me) return undefined;
    const unsubs = Object.entries(PERSONAL).map(([kind, name]) =>
      onSnapshot(
        query(collection(db, "artifacts", appId, "public", "data", name), where("owner", "==", me)),
        (s) =>
          setPersonal((p) => ({ ...p, [kind]: s.docs.map((d) => ({ id: d.id, ...d.data() })) })),
        () => setPersonal((p) => ({ ...p, [kind]: [] }))
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [user, currentTechName]);

  // notifiche: tengo aggiornata l'iscrizione di questo telefono (se già permesse)
  useEffect(() => {
    if (user && currentTechName) refreshPush(currentTechName);
  }, [user, currentTechName]);
  // tocco su una notifica con l'app già aperta: vado a quella conversazione
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;
    const onMsg = (e) => {
      if (e.data && e.data.type === "open-chat") {
        let conv = "group";
        let panel = null;
        try {
          const q = new URL(e.data.url, window.location.origin).searchParams;
          conv = q.get("chat") || "group";
          if (q.has("area")) panel = q.get("area") || "home";
          if (q.has("online")) panel = "online:" + q.get("online");
        } catch (err) {
          // niente
        }
        setActiveTab("dashboard");
        if (panel && panel.startsWith("online:")) {
          setOnlineConv(panel.slice(7));
          setShowOnlineDropdown(true);
          return;
        }
        if (panel) {
          setTimeout(
            () => window.dispatchEvent(new CustomEvent("mora-open-area", { detail: { panel } })),
            50
          );
          return;
        }
        setTimeout(
          () => window.dispatchEvent(new CustomEvent("mora-open-chat", { detail: { conv } })),
          50
        );
      }
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, []);

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

  const handleLogout = () => {
    localStorage.removeItem("mora_tech_last_name");
    localStorage.removeItem("mora_app_unlocked");
    sessionStorage.removeItem("mora_access_tech");
    setCurrentTechName("");
    setIsAppUnlocked(false);
    setIsAdminAuthenticated(false);
    setActiveTab("dashboard");
  };
  logoutRef.current = handleLogout;

  const color = viewConfig.themeColor || "blue";

  if (isAppLoading && layoutConfig.showSplash === false)
    return <div className="mora-app min-h-screen bg-slate-100" />;

  if (isAppLoading)
    return (
      <SplashScreen
        dark={isDark}
        title={layoutConfig.appTitle || "Assistenza Mora"}
        season={splashSeason(layoutConfig)}
      />
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
      <div className="mora-app min-h-screen bg-slate-100 flex items-center justify-center">
        <RefreshCw className={`animate-spin text-${color}-600 w-10 h-10`} />
      </div>
    );
  }

  return (
    <div
      className={`mora-app min-h-screen font-sans ${
        isMobileView ? "pb-24" : ""
      } relative bg-slate-100 text-slate-900 animate-in fade-in duration-700`}
    >
      <PdfHost />
      <VanHost vanItems={vanItems} color={color} />
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
              <CraneMark className="w-5 h-5" />
            </div>
            <div>
              <div className="relative">
                <h1 className="text-lg font-black uppercase tracking-tighter leading-none text-slate-800 flex items-center gap-2">
                  {layoutConfig.appTitle}
                  {onlineUsersCount > 0 && (
                    <div
                      data-action="online-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOnlineConv(null);
                        setShowOnlineDropdown(!showOnlineDropdown);
                      }}
                      className="relative flex items-center gap-1.5 px-2 py-0.5 bg-green-50 border border-green-200 rounded-full cursor-pointer hover:bg-green-100 shadow-sm transition-all"
                      title="Tocca per vedere chi è online"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-[9px] font-black text-green-700 uppercase mt-0.5">
                        {onlineUsersCount}{" "}
                        {onlineUsersCount === 1
                          ? "tecnico online"
                          : "tecnici online"}
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 text-green-600 transition-transform ${
                          showOnlineDropdown ? "rotate-180" : ""
                        }`}
                      />
                      {onlineBadge > 0 && (
                        <span data-online-badge className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
                          {onlineBadge}
                        </span>
                      )}
                    </div>
                  )}
                </h1>

                {showOnlineDropdown && (
                  <OnlineMenu
                    users={activeUsersList}
                    me={currentTechName}
                    isAdmin={isAdminAuthenticated}
                    canWrite={onlineMessages && !!currentTechName}
                    messages={chatMessages}
                    reads={chatReads}
                    technicians={technicians}
                    color={color}
                    startConv={onlineConv}
                    onClose={() => {
                      setShowOnlineDropdown(false);
                      setOnlineConv(null);
                    }}
                  />
                )}
              </div>
              <span
                className={`text-[10px] font-bold text-${color}-600 uppercase tracking-wider block mt-0.5`}
              >
                {currentTechName ? `Ciao, ${currentTechName}` : "Tecnico"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={cycleTheme}
            className="mora-theme-btn"
            title={`${THEME_LABELS[themeMode]} (tocca per cambiare)`}
            aria-label={`${THEME_LABELS[themeMode]}. Tocca per cambiare tema`}
          >
            <ThemeIcon className="w-5 h-5" />
          </button>
        </div>
      </header>
      {(!isOnline || pendingCount > 0) && (
        <div
          role="status"
          data-section="network-status"
          className={`px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2.5 border-b ${
            !isOnline
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-blue-50 text-blue-800 border-blue-200"
          }`}
        >
          {!isOnline ? (
            <WifiOff className="w-4 h-4 shrink-0" />
          ) : (
            <UploadCloud className="w-4 h-4 shrink-0 animate-pulse" />
          )}
          {!isOnline ? (
            <span className="text-left leading-snug">
              <span className="block font-black">
                Sei senza rete: vedi i dati salvati sul telefono
                {lastSync ? ` (aggiornati ${syncWhen(lastSync)})` : ""}
              </span>
              <span className="block font-semibold">
                {pendingCount > 0
                  ? `${pendingCount} ${pendingCount === 1 ? "rapporto salvato" : "rapporti salvati"} sul telefono: ${
                      pendingCount === 1 ? "parte" : "partono"
                    } appena torna la connessione. `
                  : ""}
                La mia area, interventi e clienti si aprono; quello che scrivi parte quando torna la rete. Le novità dei colleghi arrivano dopo.
              </span>
            </span>
          ) : (
            <span>
              {`Invio di ${pendingCount} ${pendingCount === 1 ? "rapporto" : "rapporti"} in corso...`}
            </span>
          )}
        </div>
      )}

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
                layoutConfig={viewConfig}
                onAdminAccess={handleAdminAccess}
                logs={logs}
                customers={customers}
                machines={machines}
                currentTechName={currentTechName}
                onOpenCustomer={openCustomerDetail}
                onOpenMachine={openMachineDetail}
                chatMessages={chatMessages}
                chatReads={chatReads}
                technicians={fieldTechs}
                isAdmin={isAdminAuthenticated}
                onOpenPhotos={setGlobalPhotoView}
                personal={personal}
                vans={vans}
                vanItems={vanItems}
                chatEnabled={chatEnabled}
                homePrefs={homePrefs}
                machineTypes={machineTypes}
                onHomePrefs={setHomePrefs}
                onPreviewLook={handlePreviewLook}
                isOffice={isOffice}
              />
            )}
            {!isOffice && (activeTab === "explore" || activeTab === "database") && (
              <div className="flex gap-1 p-1 mb-3 bg-slate-200/70 rounded-xl max-w-md" data-section="explore-switch">
                {[
                  ["explore", "Per cliente"],
                  ["database", "Elenco gru e interventi"],
                ].map(([t, l]) => (
                  <button
                    key={t}
                    type="button"
                    data-explore-tab={t}
                    onClick={() => setActiveTab(t)}
                    className={`flex-1 h-10 rounded-lg text-sm font-black ${activeTab === t ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
            {activeTab === "explore" && (
              <ExploreView
                customers={customers}
                machines={machines}
                logs={logs}
                color={color}
                onOpenPhotos={setGlobalPhotoView}
              />
            )}
            {activeTab === "history" && (
              <HistoryView
                logs={logs}
                machines={machines}
                customers={customers}
                technicians={fieldTechs}
                machineTypes={machineTypes}
                loading={loading}
                isMobile={isMobileView}
                onAuthAdmin={() => setShowAdminLogin(true)}
                isAdmin={isAdminAuthenticated}
                layoutConfig={viewConfig}
                onOpenCustomer={openCustomerDetail}
                onOpenMachine={openMachineDetail}
                onOpenPhotos={setGlobalPhotoView}
                readOnly={isOffice}
              />
            )}
            {activeTab === "office" && (
              <OfficeView
                logs={logs}
                machines={machines}
                customers={customers}
                layoutConfig={viewConfig}
                technicians={fieldTechs}
                onOpenPhotos={setGlobalPhotoView}
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
                technicians={fieldTechs}
                machineTypes={machineTypes}
                machines={machines}
                key={newPrefill ? newPrefill.key : "new"}
                prefill={newPrefill && newPrefill.data}
                onSuccess={() => setActiveTab("history")}
                isMobile={isMobileView}
                onTechUpdate={setCurrentTechName}
                layoutConfig={viewConfig}
                allLogs={logs}
                vans={vans}
                vanItems={vanItems}
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
                onLogout={handleLogout}
                allLogs={logs}
                vans={vans}
                vanItems={vanItems}
                currentTechName={currentTechName}
              />
            )}
          </div>
        )}
      </main>

      {/* Visualizzatore Foto Globale */}
      {globalPhotoView && (
        <PhotoViewerModal
          photos={globalPhotoView}
          onClose={() => setGlobalPhotoView(null)}
        />
      )}

      {viewingMachineHistory && (
        <MachineHistoryModal
          machine={viewingMachineHistory}
          allLogs={logs}
          onClose={() => setViewingMachineHistory(null)}
          onOpenCustomer={openCustomerDetail}
          onOpenPhotos={setGlobalPhotoView}
          themeColor={color}
          onNewReport={
            isOffice
              ? null
              : (m) => {
                  setNewPrefill({ key: Date.now(), data: m });
                  setViewingMachineHistory(null);
                  setActiveTab("new");
                }
          }
        />
      )}
      {viewingCustomerDetail && (
        <CustomerDetailModal
          customerName={viewingCustomerDetail}
          machines={machines}
          onClose={() => setViewingCustomerDetail(null)}
          onOpenMachine={openMachineDetail}
          themeColor={color}
          appTitle={layoutConfig.appTitle}
        />
      )}

      {isMobileView && (
        <nav className="fixed bottom-0 left-0 right-0 p-3 flex justify-around z-50 bg-white border-t border-slate-200 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
          {isOffice ? (
            <>
              <NavButton
                icon={Home}
                label="Home"
                active={activeTab === "dashboard"}
                onClick={() => setActiveTab("dashboard")}
                color={color}
              />
              <NavButton
                icon={History}
                label="Interventi"
                active={activeTab === "history"}
                onClick={() => setActiveTab("history")}
                color={color}
              />
              <NavButton
                icon={Folder}
                label="Esplora"
                active={activeTab === "explore"}
                onClick={() => setActiveTab("explore")}
                color={color}
              />
            </>
          ) : (
            <>
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
            </>
          )}
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
