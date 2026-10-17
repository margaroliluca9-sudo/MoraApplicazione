import React, { useState, useEffect, useRef } from "react";
import {
  PlusCircle,
  History,
  User,
  X,
  Settings,
  ChevronDown,
  RefreshCw,
  ArrowLeft,
  Sun,
  Moon,
  Smartphone,
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
} from "firebase/firestore";
import { auth, db, appId } from "./firebase";
import { DEFAULT_LAYOUT } from "./constants";
import { getSafeMatricola } from "./utils";
import { PRO_BUTTON_SECONDARY } from "./ui";
import { GlobalLoginScreen } from "./components/GlobalLoginScreen";
import { SplashScreen } from "./components/SplashScreen";
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
import { NavButton } from "./components/NavButton";
import { AdminLoginModal } from "./components/AdminLoginModal";
import { PhotoViewerModal } from "./components/PhotoViewerModal";
import { MachineHistoryModal } from "./components/modals/MachineHistoryModal";
import { CustomerDetailModal } from "./components/modals/CustomerDetailModal";
import { DashboardView } from "./views/DashboardView";
import { ExploreView } from "./views/ExploreView";
import { DatabaseView } from "./views/DatabaseView";
import { OfficeView } from "./views/OfficeView";
import { NewEntryForm } from "./views/NewEntryForm";
import { HistoryView } from "./views/HistoryView";
import { AdminPanel } from "./views/AdminPanel";

export default function App() {
  // TEMA chiaro / scuro (scelto su ogni dispositivo)
  const [themeMode, setThemeMode] = useState(getThemeMode);
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
    themeMode === "dark" ? Moon : themeMode === "light" ? Sun : Smartphone;

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
      setTimeout(() => setIsAppLoading(false), 2500);
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
      (s) => {
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

  const color = layoutConfig.themeColor || "blue";

  if (isAppLoading)
    return (
      <SplashScreen
        dark={isDark}
        title={layoutConfig.appTitle || "Assistenza Mora"}
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
                onOpenPhotos={setGlobalPhotoView}
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
                onOpenPhotos={setGlobalPhotoView}
              />
            )}
            {activeTab === "office" && (
              <OfficeView
                logs={logs}
                machines={machines}
                customers={customers}
                layoutConfig={layoutConfig}
                technicians={technicians}
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
                onLogout={handleLogout}
                allLogs={logs}
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
