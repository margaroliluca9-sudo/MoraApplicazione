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
  Map as MapIcon,
} from "lucide-react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { collection, serverTimestamp, Timestamp, orderBy, limit, documentId, getDocsFromCache, doc, query, where } from "firebase/firestore";
import { addDoc, setDoc, deleteDoc } from "./tracked";
import { onSnapshot, getDocsFromServer, startReadsMeter, setReadsOwner, readsToday, FREE_READS } from "./metered";
import { loadReadsDay } from "./components/ReadsCard";
import { auth, db, appId } from "./firebase";
import { DEFAULT_LAYOUT } from "./constants";
import { getSafeMatricola } from "./utils";
import { PRO_BUTTON_SECONDARY } from "./ui";
import { GlobalLoginScreen } from "./components/GlobalLoginScreen";
import { SplashScreen } from "./components/SplashScreen";
import { SEASONS } from "./season";
import { seasonNow } from "./components/DesignExtras";
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
import { NotifyPrompt } from "./components/modals/NotifyPrompt";
import { getSettings, wasAsked, markAsked, installTipShown, setSettingsOwner, settingsDocId, SETTINGS_COLL, applyRemoteSettings, pushSettings } from "./settings";
import { AdminLoginModal } from "./components/AdminLoginModal";
import { PhotoViewerModal } from "./components/PhotoViewerModal";
import { withPhotoRefs, movePhotosOut, prefetchRecent } from "./logPhotos";
import { applyCompany, activeNotices } from "./company";
import { startSync, recentLogsQuery } from "./sync";
import { PdfHost } from "./components/PdfHost";
import { UserMenu } from "./components/UserMenu";
import { techOf } from "./profile";
import { installGestures } from "./gestures";
import { Sidebar, TabStrip, TAB_INFO } from "./components/DesktopShell";
import { refreshPush, getPushState, key as techKey, chatDoc } from "./chat";
import { HOME_PREFS, cachedPrefs, cachePrefs, cleanLook } from "./home";
import { PERSONAL } from "./personal";
import { VAN } from "./van";
import { VanHost } from "./components/VanHost";
import { MachineHistoryModal } from "./components/modals/MachineHistoryModal";
import { CustomerDetailModal } from "./components/modals/CustomerDetailModal";
import { DashboardView } from "./views/DashboardView";
import { ExploreView } from "./views/ExploreView";
import { MapView } from "./views/MapView";
// Esplora database, Ufficio e Admin si scaricano solo quando servono (vedi lazy.js)
import { lazyNamed, preloadLazy } from "./lazy";
import { installErrorLog, setErrorContext } from "./errorLog";
import { NewEntryForm } from "./views/NewEntryForm";
import { HistoryView } from "./views/HistoryView";
const DatabaseView = lazyNamed(() => import("./views/DatabaseView"), "DatabaseView");
const OfficeView = lazyNamed(() => import("./views/OfficeView"), "OfficeView");
const AdminPanel = lazyNamed(() => import("./views/AdminPanel"), "AdminPanel");
const TvScreen = lazyNamed(() => import("./components/TvScreen"), "TvScreen", <div className="fixed inset-0 z-[500] bg-slate-950" />);

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
  return seasonNow(cfg); // automatica, fissa (Admin → Design) o spenta
};

// ASCOLTO DEL DATABASE CON RIPRESA DA SOLA: se un collegamento si interrompe per un errore
// (es. letture del giorno finite, permessi), l'app riprova da sola più tardi (2, 4, 8… fino a 10 minuti,
// e subito quando torna la rete) senza doverla chiudere e riaprire.
const SYNC = { fail: 0, tries: 0 };
const watch = (ref, a, b, c) => {
  const opts = typeof a === "function" ? null : a;
  const next = opts ? b : a;
  const err = opts ? c : b;
  const onErr = (e) => {
    if (!SYNC.fail) SYNC.fail = Date.now();
    if (err) err(e);
  };
  return opts ? onSnapshot(ref, opts, next, onErr) : onSnapshot(ref, next, onErr);
};

// chat: quanti messaggi recenti tengo (più quelli fissati)
const CHAT_KEEP = 500;

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
  const [exploreFocus, setExploreFocus] = useState(null); // dalla Mappa: «Vedi le gru» di un cliente
  // schermo per la TV dell'ufficio (Ufficio → «Schermo TV», oppure indirizzo con ?tv=1)
  const [tvOpen, setTvOpen] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get("tv") === "1";
    } catch (e) {
      return false;
    }
  });
  useEffect(() => {
    if (activeTab !== "new") setNewPrefill(null);
  }, [activeTab]);
  const [logs, setLogs] = useState([]);
  // ripresa da sola dopo un errore del database (vedi watch qui sopra): cambiando syncEpoch
  // si riaprono tutti i collegamenti
  const [syncEpoch, setSyncEpoch] = useState(0);
  useEffect(() => {
    const retry = () => {
      if (!SYNC.fail || (typeof navigator !== "undefined" && navigator.onLine === false)) return;
      const wait = Math.min(10, 2 ** SYNC.tries) * 60000; // 1, 2, 4, 8, 10 minuti
      if (Date.now() - SYNC.fail < wait) return;
      SYNC.fail = 0;
      SYNC.tries += 1;
      setSyncEpoch((n) => n + 1);
    };
    const t = setInterval(retry, 30000);
    const onOnline = () => {
      if (SYNC.fail) SYNC.fail = 1; // torna la rete: riprovo subito
      retry();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onOnline);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onOnline);
    };
  }, []);
  // dati arrivati di nuovo: azzero i tentativi
  useEffect(() => {
    if (!SYNC.fail) SYNC.tries = 0;
  }, [logs]);
  const rawLogsRef = useRef({ list: [], server: false });
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [machines, setMachines] = useState([]);
  const [machineTypes, setMachineTypes] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatReads, setChatReads] = useState([]);
  // magazzino furgoni (tutti) e "La mia area" (solo le cose del tecnico collegato)
  const [vans, setVans] = useState([]);
  const [vanItems, setVanItems] = useState([]);
  const [personal, setPersonal] = useState({ events: [], notes: [], reminders: [], contacts: [], hours: [] });
  const [loading, setLoading] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [winW, setWinW] = useState(window.innerWidth);
  // TABLET E PC: schede aperte in alto (come un programma)
  const [openTabs, setOpenTabs] = useState(["dashboard"]);
  // tablet/computer: «La mia area» in una scheda (con la parte da aprire: calendario, note…)
  const [areaPanel, setAreaPanel] = useState({ panel: "home", n: 0 });
  const openAreaTab = (panel) => {
    setAreaPanel((a) => ({ panel: panel || "home", n: a.n + 1 }));
    setActiveTab("area");
  };
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
    const unsub = watch(
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
  }, [user, currentTechName, syncEpoch]);
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
    if (isOffice && !["dashboard", "history", "explore", "map"].includes(activeTab)) setActiveTab("dashboard");
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
      // sotto i 768 px: telefono (barra in basso); da 768 in su: menu a sinistra e schede (tablet e PC)
      setIsMobileView(window.innerWidth < 768);
      setWinW(window.innerWidth);
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
  const [, setOnlineUsersCount] = useState(0);
  const [activeUsersList, setActiveUsersList] = useState([]);
  // IMPOSTAZIONI PERSONALI (La mia area → Impostazioni): animazione, farsi vedere online
  const [mySettings, setMySettings] = useState(getSettings);
  useEffect(() => {
    const on = (e) => setMySettings((e && e.detail) || getSettings());
    window.addEventListener("mora-settings", on);
    return () => window.removeEventListener("mora-settings", on);
  }, []);
  // dopo l'aggiornamento: "Vuoi le notifiche?" (una volta per telefono)
  const [notifyAsk, setNotifyAsk] = useState(null);
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
      const splashOn = getCachedLayout().showSplash !== false && getSettings().splash !== false;
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
            hidden: getSettings().showOnline === false, // non farmi vedere tra i "Tecnici online"
          },
          { merge: true }
        );
      } catch (e) {}
    };

    updatePresence();
    // ogni 2 minuti basta: si resta "online" per 5 minuti dall'ultimo segnale
    // (ogni segnale costa una lettura a tutti i telefoni aperti)
    const interval = setInterval(updatePresence, 120000);

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
  }, [user, currentTechName, mySettings.showOnline]);

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
    const unsub = watch(presenceRef, (snap) => {
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
  }, [user, syncEpoch]);

  useEffect(() => {
    if (!user) return;

    // solo chi si è fatto vivo di recente (i vecchi accessi restano nel database e non servono)
    const unsubActiveUsers = watch(
      query(
        collection(db, "artifacts", appId, "public", "data", "active_users"),
        where("lastActive", ">=", Timestamp.fromMillis(Date.now() - 10 * 60 * 1000))
      ),
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

    const unsubLayout = watch(
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
          // scheda Mappa: subito dopo Esplora
          if (!order.includes("map")) {
            order = [...order];
            order.splice(order.indexOf("explore") + 1, 0, "map");
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

    const unsubTech = watch(
      collection(db, "artifacts", appId, "public", "data", "technicians"),
      (s) => setTechnicians(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubTypes = watch(
      collection(db, "artifacts", appId, "public", "data", "machine_types"),
      (s) => setMachineTypes(s.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubVans = watch(
      collection(db, "artifacts", appId, "public", "data", VAN.vans),
      (s) => setVans(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setVans([])
    );
    const unsubVanItems = watch(
      collection(db, "artifacts", appId, "public", "data", VAN.items),
      (s) => setVanItems(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setVanItems([])
    );

    return () => {
      unsubVans();
      unsubVanItems();
      unsubLayout();
      unsubTech();
      unsubTypes();
      unsubActiveUsers();
    };
  }, [user, syncEpoch]);

  // DATI DELL'AZIENDA decisi dall'admin (company.js): password, intestazione dei fogli,
  // avvisi in Home, chiusure aziendali. Copia sul telefono per quando non c'è rete.
  useEffect(() => {
    if (!user) return undefined;
    return watch(
      doc(db, "artifacts", appId, "public", "data", "settings", "azienda"),
      (s) => {
        if (!s.exists() && s.metadata && s.metadata.fromCache) return; // non ancora arrivato dal server
        applyCompany(s.exists() ? s.data() : {});
      },
      () => {}
    );
  }, [user, syncEpoch]);

  // INTERVENTI, CLIENTI E GRU (sync.js): si parte dalla copia sul telefono e dal server arriva solo quello
  // che è cambiato (prima ogni apertura rileggeva tutto: ~1.400 letture). Gli interventi degli ultimi
  // 3 giorni sono anche in diretta: rapporti nuovi subito e quelli non ancora inviati senza rete.
  const recentRef = useRef([]);
  const olderRef = useRef([]);
  useEffect(() => {
    if (!user) return undefined;
    const parseDate = (ds) => {
      if (!ds) return 0;
      const parts = ds.split("/");
      if (parts.length !== 3) return 0;
      const [d, m, y] = parts.map(Number);
      return new Date(y, m - 1, d).getTime() || 0;
    };
    const publish = () => {
      const recent = recentRef.current;
      const ids = new Set(recent.map((l) => l.id));
      const raw = [...recent, ...olderRef.current.filter((l) => !ids.has(l.id))];
      rawLogsRef.current = { ...rawLogsRef.current, list: raw };
      setLogs(
        raw
          .map(withPhotoRefs)
          .sort((a, b) => {
            const dateA = parseDate(a.dateString);
            const dateB = parseDate(b.dateString);
            if (dateA !== dateB) return dateB - dateA;
            return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
          })
      );
    };
    olderRef.current = [];
    recentRef.current = [];
    let gotAll = false;
    let gotRecent = false;
    const unsubRecent = watch(recentLogsQuery(3), { includeMetadataChanges: true }, (s) => {
      const server = !!(s.metadata && s.metadata.fromCache === false);
      if (server) markSynced();
      // interventi salvati sul telefono ma non ancora arrivati al server
      setPendingCount(s.docs.filter((d) => d.metadata && d.metadata.hasPendingWrites).length);
      recentRef.current = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      rawLogsRef.current = { list: rawLogsRef.current.list, server: rawLogsRef.current.server || server, pending: 0, windowed: true };
      gotRecent = true;
      publish();
      if (gotAll) setLoading(false);
    });
    const stopSync = startSync(
      {
        customers: (rows) => setCustomers(rows.slice().sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))),
        machines: (rows) => setMachines(rows),
        maintenance_logs: (rows, meta) => {
          olderRef.current = rows;
          if (meta && meta.server) rawLogsRef.current = { ...rawLogsRef.current, server: true };
          gotAll = true;
          publish();
          if (gotRecent || rows.length) setLoading(false);
        },
      },
      {
        onServer: markSynced,
        onError: () => {
          if (!SYNC.fail) SYNC.fail = Date.now();
        },
      }
    );
    return () => {
      unsubRecent();
      stopSync();
    };
  }, [user, syncEpoch]);

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
    // negli anni i messaggi diventano tanti: tengo gli ultimi 500 più quelli fissati in alto
    const chatColl = collection(db, "artifacts", appId, "public", "data", "chat_messages");
    let lastMsgs = [];
    let pinnedMsgs = [];
    const pubChat = () => {
      const ids = new Set(lastMsgs.map((m) => m.id));
      setChatMessages([...lastMsgs, ...pinnedMsgs.filter((m) => !ids.has(m.id))]);
    };
    const unsubChat = watch(
      query(chatColl, orderBy("at", "desc"), limit(CHAT_KEEP)),
      (s) => {
        lastMsgs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        pubChat();
      },
      () => setChatMessages([])
    );
    const unsubPinned = watch(
      query(chatColl, where("pinned", "==", true)),
      (s) => {
        pinnedMsgs = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        pubChat();
      },
      () => {}
    );
    const unsubReads = watch(
      collection(db, "artifacts", appId, "public", "data", "chat_reads"),
      (s) => setChatReads(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setChatReads([])
    );
    return () => {
      unsubChat();
      unsubPinned();
      unsubReads();
    };
  }, [user, needChat, syncEpoch]);
  // FOTO DEI RAPPORTI A PARTE (logPhotos.js):
  // - l'admin, quando entra, sposta piano piano le foto dei rapporti vecchi fuori dal rapporto
  // - in sottofondo tengo sul telefono le foto dei rapporti recenti (si vedono anche senza rete)
  const photoJobs = useRef({ moving: false, prefetched: false });
  useEffect(() => {
    const { list, server } = rawLogsRef.current;
    if (!user || !server || !list.length) return undefined;
    const jobs = photoJobs.current;
    if (isAdminAuthenticated && !jobs.moving) {
      jobs.moving = true;
      movePhotosOut(list, 5)
        .catch(() => 0)
        .then(() => {
          jobs.moving = false;
        });
    }
    if (jobs.prefetched) return undefined;
    const t = setTimeout(() => {
      jobs.prefetched = true;
      prefetchRecent(logs).catch(() => {});
    }, 4000);
    return () => clearTimeout(t);
  }, [user, logs, isAdminAuthenticated]);

  // chi si è nascosto non compare tra i "Tecnici online" (l'admin vede tutti)
  const visibleUsers = useMemo(
    () => activeUsersList.filter((u) => !u.hidden || isAdminAuthenticated || techKey(u.technician) === techKey(currentTechName)),
    [activeUsersList, isAdminAuthenticated, currentTechName]
  );
  const onlineBadge = useMemo(
    () => (onlineMessages ? onlineUnread(chatMessages, chatReads, currentTechName) : 0),
    [onlineMessages, chatMessages, chatReads, currentTechName]
  );

  useEffect(() => {
    if (TAB_INFO[activeTab]) setOpenTabs((t) => (t.includes(activeTab) ? t : [...t, activeTab]));
  }, [activeTab]);
  const closeTab = (id) => {
    setOpenTabs((t) => {
      const next = t.filter((x) => x !== id);
      if (id === activeTab) setActiveTab(next[next.length - 1] || "dashboard");
      return next.length ? next : ["dashboard"];
    });
  };
  const sideW = isMobileView ? 0 : winW < 1100 ? 80 : 240;

  // GESTI (indietro dal bordo, tasto indietro di Android, tieni premuto, tira giù per ricaricare)
  useEffect(() => installGestures(), []);
  // dopo l'apertura, in sottofondo: scarico le parti caricate «quando servono» (così ci sono anche senza rete)
  useEffect(() => preloadLazy(), []);
  // errori sui telefoni: chi e in che schermata (vedi errorLog.js)
  useEffect(() => installErrorLog(), []);
  useEffect(() => setErrorContext(currentTechName, activeTab), [currentTechName, activeTab]);
  // contatore delle letture del database (Area admin → System)
  useEffect(() => startReadsMeter(), []);
  useEffect(() => setReadsOwner(currentTechName), [currentTechName]);
  // all'admin: avviso in Home se oggi le letture sono oltre l'80% del limite gratuito (controllo una volta all'ora)
  const [readsPct, setReadsPct] = useState(0);
  useEffect(() => {
    if (!user || !isAdminAuthenticated) return undefined;
    const check = () =>
      loadReadsDay(readsToday().date)
        .then((d) => setReadsPct(Math.round((d.total / FREE_READS) * 100)))
        .catch(() => {});
    const t0 = setTimeout(check, 15000);
    const t = setInterval(check, 60 * 60 * 1000);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
    };
  }, [user, isAdminAuthenticated]);
  useEffect(() => {
    const home = (e) => {
      if (activeTab !== "dashboard") {
        setActiveTab("dashboard");
        e.preventDefault();
      }
    };
    window.addEventListener("mora-go-home", home);
    return () => window.removeEventListener("mora-go-home", home);
  }, [activeTab]);

  // IMPOSTAZIONI UGUALI SU TUTTI I TELEFONI: le leggo dal tecnico collegato e le tengo aggiornate
  useEffect(() => {
    setSettingsOwner(currentTechName);
    if (!user || !currentTechName) return undefined;
    let first = true;
    const unsub = watch(
      chatDoc(SETTINGS_COLL, settingsDocId(currentTechName)),
      (snap) => {
        if (snap.exists()) applyRemoteSettings(snap.data());
        else if (first) pushSettings();
        first = false;
      },
      () => {}
    );
    return () => unsub();
  }, [user, currentTechName, syncEpoch]);

  // LA MIA AREA: carico solo i documenti del tecnico collegato
  useEffect(() => {
    const me = techKey(currentTechName);
    setPersonal({ events: [], notes: [], reminders: [], contacts: [], hours: [] });
    if (!user || !me) return undefined;
    // Le mie ore: un giorno = un documento, negli anni diventano tanti. In diretta solo
    // dal 1° gennaio dell'anno scorso; i giorni più vecchi dalla copia sul telefono
    // (dal server al massimo una volta al giorno). Il nome del documento è "tecnico_data".
    const hoursColl = collection(db, "artifacts", appId, "public", "data", PERSONAL.hours);
    const prefix = `${me}_`.replace(/[^a-z0-9_-]/gi, "_");
    const cut = `${prefix}${new Date().getFullYear() - 1}-01-01`;
    let recentH = [];
    let olderH = [];
    const pubHours = () =>
      setPersonal((p) => ({ ...p, hours: [...recentH, ...olderH].filter((h) => h.owner === me) }));
    const hoursRows = (s) => s.docs.map((d) => ({ id: d.id, ...d.data() }));
    const olderQ = query(hoursColl, where(documentId(), ">=", prefix), where(documentId(), "<", cut));
    const HKEY = "mora_old_hours_sync";
    (async () => {
      try {
        olderH = hoursRows(await getDocsFromCache(olderQ));
        pubHours();
      } catch (e) {
        // nessuna copia
      }
      let last = 0;
      try {
        last = Number(localStorage.getItem(HKEY) || 0);
      } catch (e) {
        last = 0;
      }
      if (Date.now() - last < 864e5 && olderH.length) return;
      try {
        olderH = hoursRows(await getDocsFromServer(olderQ));
        pubHours();
        localStorage.setItem(HKEY, String(Date.now()));
      } catch (e) {
        // senza rete
      }
    })();
    const onHours = () =>
      setTimeout(async () => {
        try {
          olderH = hoursRows(await getDocsFromCache(olderQ));
          pubHours();
        } catch (e) {
          // niente
        }
      }, 50);
    window.addEventListener("mora-hours-changed", onHours);
    const unsubHours = watch(
      query(hoursColl, where(documentId(), ">=", cut), where(documentId(), "<", `${prefix}\uf8ff`)),
      (s) => {
        recentH = hoursRows(s);
        pubHours();
      },
      () => {}
    );
    const unsubs = Object.entries(PERSONAL).filter(([kind]) => kind !== "hours").map(([kind, name]) =>
      watch(
        query(collection(db, "artifacts", appId, "public", "data", name), where("owner", "==", me)),
        (s) =>
          setPersonal((p) => ({ ...p, [kind]: s.docs.map((d) => ({ id: d.id, ...d.data() })) })),
        () => setPersonal((p) => ({ ...p, [kind]: [] }))
      )
    );
    return () => {
      window.removeEventListener("mora-hours-changed", onHours);
      unsubHours();
      unsubs.forEach((u) => u());
    };
  }, [user, currentTechName, syncEpoch]);

  // notifiche: tengo aggiornata l'iscrizione di questo telefono (se già permesse)
  useEffect(() => {
    if (user && currentTechName) refreshPush(currentTechName);
  }, [user, currentTechName]);
  useEffect(() => {
    if (!user || !currentTechName || isAppLoading || !isAppUnlocked) return undefined;
    if (wasAsked() && installTipShown()) return undefined;
    const t = setTimeout(async () => {
      const st = await getPushState();
      if (st === "off" && !wasAsked()) setNotifyAsk("off");
      else if (st === "install" && !installTipShown()) setNotifyAsk("install");
      else if (st === "on" || st === "denied") markAsked();
    }, 2500);
    return () => clearTimeout(t);
  }, [user, currentTechName, isAppLoading, isAppUnlocked]);
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
        if (panel && window.innerWidth >= 768) {
          openAreaTab(panel);
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
      setShowAdminLogin("admin"); // dopo l'accesso si va direttamente nell'Area admin
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

  if (isAppLoading && (layoutConfig.showSplash === false || mySettings.splash === false))
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
      style={isMobileView ? { paddingBottom: "calc(96px + var(--mora-safe-bottom))" } : { paddingLeft: sideW }}
    >
      {!isMobileView && (
        <Sidebar
          active={activeTab}
          onGo={setActiveTab}
          onArea={() => openAreaTab("home")}
          onAdmin={handleAdminAccess}
          isOffice={isOffice}
          title={layoutConfig.appTitle}
          color={color}
          compact={sideW < 200}
        />
      )}
      <PdfHost />
      <VanHost vanItems={vanItems} color={color} />
      <header
        className="sticky top-0 z-50 px-4 py-3 transition-colors duration-300 bg-white/90 backdrop-blur-md border-b border-slate-200"
        data-section="app-header"
      >
        <div className="max-w-6xl mx-auto flex justify-between items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 text-left"
            onClick={() => setActiveTab("dashboard")}
          >
            <span
              className={`w-9 h-9 rounded-2xl bg-${color}-600 text-white flex items-center justify-center shadow-md shadow-${color}-600/25 shrink-0 ${isMobileView ? "" : "hidden"}`}
            >
              <CraneMark className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              {/* su una riga sola: se il nome è troppo lungo finisce con «…» (intero tenendo il dito sopra) */}
              <h1 className="text-[15px] min-[401px]:text-base sm:text-[17px] font-black tracking-tight leading-tight text-slate-800 truncate" title={layoutConfig.appTitle}>{layoutConfig.appTitle}</h1>
              <span className="text-xs font-semibold text-slate-500 block truncate">
                {currentTechName ? `Ciao, ${currentTechName}` : "Tecnico"}
              </span>
            </span>
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {visibleUsers.length > 0 && (
              <button
                type="button"
                data-action="online-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setOnlineConv(null);
                  setShowOnlineDropdown(!showOnlineDropdown);
                }}
                className="relative h-9 sm:h-10 flex items-center gap-1 sm:gap-1.5 pl-2 sm:pl-2.5 pr-1.5 sm:pr-2 bg-emerald-50 border border-emerald-200 rounded-full hover:bg-emerald-100 transition-colors"
                title="Tocca per vedere chi è online"
                aria-label={`${visibleUsers.length} ${visibleUsers.length === 1 ? "tecnico online" : "tecnici online"}`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-800 tabular-nums">
                  {visibleUsers.length}
                  <span className={isMobileView ? "sr-only" : ""}> online</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-emerald-600 transition-transform ${
                    showOnlineDropdown ? "rotate-180" : ""
                  }`}
                />
                {onlineBadge > 0 && (
                  <span data-online-badge className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">
                    {onlineBadge}
                  </span>
                )}
              </button>
            )}
            {showOnlineDropdown && (
              <OnlineMenu
                users={visibleUsers}
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
            <UserMenu name={currentTechName} tech={techOf(technicians, currentTechName)} role={isOffice ? "Ufficio" : isAdminAuthenticated ? "Tecnico · admin" : "Tecnico"} color={color} onLogout={handleLogout} />
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
        </div>
      </header>
      {!isMobileView && <TabStrip tabs={openTabs} active={activeTab} onGo={setActiveTab} onClose={closeTab} color={color} />}
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

      {activeTab !== "dashboard" && isMobileView && (
        <div className="w-full pt-3 px-4">
          <div className="max-w-6xl mx-auto">
            <button
              onClick={() => {
                setActiveTab("dashboard");
                window.scrollTo(0, 0);
              }}
              className={`flex items-center gap-1.5 h-9 pl-3 pr-4 rounded-full text-sm ${PRO_BUTTON_SECONDARY}`}
            >
              <ArrowLeft className="w-4 h-4" /> Home
            </button>
          </div>
        </div>
      )}

      <main className={`${isMobileView ? "max-w-6xl" : "max-w-7xl"} mx-auto p-4 md:p-8 animate-in slide-in-from-bottom-4 duration-500`}>
        {isAdminAuthenticated && readsPct >= 80 && activeTab === "dashboard" && (
          <button type="button" onClick={handleAdminAccess} data-section="reads-warning" className="w-full mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-bold text-left">
            ⚠️ Database: oggi siamo al {readsPct}% delle letture gratuite. Tocca per vedere da dove arrivano (System).
          </button>
        )}
        {!user ? (
          <div className="py-40 text-center">
            <RefreshCw
              className={`animate-spin mx-auto text-${color}-600 w-10 h-10`}
            />
          </div>
        ) : (
          <div key={activeTab} className="animate-in fade-in duration-300">
            {(activeTab === "dashboard" || activeTab === "area") && (
              <DashboardView
                key={activeTab === "area" ? `area${areaPanel.n}` : "home"}
                areaTab={activeTab === "area"}
                areaPanel={areaPanel.panel}
                onOpenAreaTab={isMobileView ? null : openAreaTab}
                onCloseArea={() => closeTab("area")}
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
                focus={exploreFocus}
              />
            )}
            {activeTab === "map" && (
              <MapView
                customers={customers}
                machines={machines}
                color={color}
                onShowMachines={(name) => {
                  setExploreFocus({ name, at: Date.now() });
                  setActiveTab("explore");
                }}
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
                me={isOffice ? "" : currentTechName}
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
              <div className={isMobileView ? "" : "max-w-3xl mx-auto"}>
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
              </div>
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
                onOpenTv={() => setTvOpen(true)}
              />
            )}
          </div>
        )}
      </main>
      {tvOpen && user && <TvScreen logs={logs} users={visibleUsers} notices={activeNotices()} color={color} onClose={() => setTvOpen(false)} />}

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
          customers={customers}
          machines={machines}
          logs={logs}
          onClose={() => setViewingCustomerDetail(null)}
          onOpenMachine={openMachineDetail}
          themeColor={color}
          appTitle={layoutConfig.appTitle}
        />
      )}

      {isMobileView && (
        <nav className="fixed bottom-0 left-0 right-0 px-3 pt-2 flex justify-around z-50 bg-white/90 backdrop-blur-md border-t border-slate-200" style={{ paddingBottom: "calc(8px + var(--mora-safe-bottom))" }} data-section="bottom-nav">
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
              <NavButton
                icon={MapIcon}
                label="Mappa"
                active={activeTab === "map"}
                onClick={() => setActiveTab("map")}
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

      {notifyAsk && (
        <NotifyPrompt me={currentTechName} state={notifyAsk} color={color} onDone={() => setNotifyAsk(null)} />
      )}
      {showAdminLogin && (
        <AdminLoginModal
          onSuccess={() => {
            setIsAdminAuthenticated(true);
            if (showAdminLogin === "admin" || activeTab === "admin") setActiveTab("admin");
            setShowAdminLogin(false);
          }}
          onCancel={() => setShowAdminLogin(false)}
          color={color}
        />
      )}
    </div>
  );
}
