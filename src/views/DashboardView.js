import React, { useEffect, useMemo, useState } from "react";
import {
  PlusCircle,
  Search,
  X,
  Users,
  Factory,
  ClipboardList,
  ChevronRight,
  History,
  Settings,
  Briefcase,
  Database,
  Folder,
  UserCircle,
  CalendarDays,
  BarChart3,
  Truck,
  BookOpen,
} from "lucide-react";

import { getSafeMatricola } from "../utils";
import { formatRope } from "../ropes";
import {
  MyLogsModal,
  isMyLog,
  isThisMonth,
} from "../components/modals/MyLogsModal";
import { ChatModal } from "../components/modals/ChatModal";
import { unreadTotal } from "../chat";
import { PersonalAreaModal } from "../components/modals/PersonalAreaModal";
import { HomeHero } from "../components/HomeHero";
import { todayItems, monthNumbers, relDay, isoFromLogDate } from "../personal";
import { HomeGrid } from "../components/HomeGrid";
import { GuideModal } from "../components/modals/GuideModal";
import { PracticeModal } from "../components/modals/PracticeModal";
import { WIDGETS, resolveHome } from "../home";
import { vanOf, itemsOf, lowItems, fmtQty } from "../van";
import { PrintLogButton } from "../components/PrintLogButton";

// --- VIEWS PRINCIPALI ---

// testo semplificato per la ricerca: minuscole, senza accenti, punti e trattini
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
const dateKey = (ds) => {
  const p = String(ds || "")
    .split("/")
    .map(Number);
  return p.length === 3 && p.every((n) => !isNaN(n))
    ? p[2] * 10000 + p[1] * 100 + p[0]
    : 0;
};
const MAX = { customers: 5, machines: 5, logs: 8 };

// ora per il cielo in cima alla Home (per provarlo: "?ora=21")
const heroNow = () => {
  const d = new Date();
  try {
    const q = new URLSearchParams(window.location.search);
    const g = q.get("giorno"); // solo per le prove: aaaa-mm-gg
    if (/^\d{4}-\d{2}-\d{2}$/.test(g || "")) d.setFullYear(Number(g.slice(0, 4)), Number(g.slice(5, 7)) - 1, Number(g.slice(8, 10)));
    const h = q.get("ora");
    if (h !== null && h !== "") d.setHours(Number(h), 0, 0, 0);
  } catch (e) {
    // niente
  }
  return d;
};
// solo per le prove: ?meteo=pioggia,camion,neve,aereo
const heroForce = () => {
  try {
    return (new URLSearchParams(window.location.search).get("meteo") || "").split(",").filter(Boolean);
  } catch (e) {
    return [];
  }
};

export const DashboardView = ({
  onNavigate,
  layoutConfig,
  onAdminAccess,
  logs = [],
  customers = [],
  machines = [],
  currentTechName = "",
  onOpenCustomer = () => {},
  onOpenMachine = () => {},
  chatMessages = [],
  chatReads = [],
  technicians = [],
  isAdmin = false,
  onOpenPhotos = () => {},
  personal = {},
  vans = [],
  vanItems = [],
  chatEnabled = false,
  machineTypes = [],
  homePrefs = null,
  onHomePrefs = () => {},
  onPreviewLook = () => {},
  isOffice = false, // ufficio: solo interventi ed Esplora
}) => {
  const color = layoutConfig?.themeColor || "blue";
  const [query, setQuery] = useState("");
  const [showMine, setShowMine] = useState(false);
  // GUIDA ALL'APP (pulsante in fondo alla Home, accanto a "Modifica aspetto")
  const [showGuide, setShowGuide] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const openGuide = () => setShowGuide(true);
  const guideGo = (to) => {
    setShowGuide(false);
    if (to === "new") onNavigate("new");
    else if (to === "area") setArea("home");
    else if (to === "van") setArea("van");
    else if (to === "print") setArea("print");
    else if (to === "practice") setShowPractice(true);
    else if (to === "history") onNavigate("history");
    else if (to === "explore") onNavigate("explore");
    else if (to === "chat") {
      setChatConv(null);
      setShowChat(true);
    } else if (to === "home-edit") setTimeout(() => window.dispatchEvent(new CustomEvent("mora-edit-home")), 50);
  };
  // HOME PERSONALIZZATA: preferenze del tecnico (le carica App, valgono anche per l'aspetto)
  const prefs = homePrefs;
  const setPrefs = onHomePrefs;
  // CHAT: si apre anche dalla notifica (indirizzo "?chat=..." o messaggio dell'app)
  const convFromUrl = () => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.has("chat")) return q.get("chat") || "group";
      if (q.has("bacheca")) return "group";
    } catch (e) {
      // niente
    }
    return null;
  };
  // LA MIA AREA: si apre anche dalla notifica di un promemoria ("?area=promemoria")
  const areaFromUrl = () => {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.has("area")) return q.get("area") || "home";
    } catch (e) {
      // niente
    }
    return null;
  };
  const [area, setArea] = useState(areaFromUrl);
  const [chatConv, setChatConv] = useState(convFromUrl);
  const [showChatRaw, setShowChat] = useState(() => convFromUrl() !== null);
  // chat spenta dall'admin: non si apre nemmeno dalle notifiche vecchie
  const showChat = chatEnabled && showChatRaw;
  useEffect(() => {
    const onOpen = (e) => {
      setChatConv((e && e.detail && e.detail.conv) || "group");
      setShowChat(true);
    };
    const onArea = (e) => setArea((e && e.detail && e.detail.panel) || "home");
    window.addEventListener("mora-open-chat", onOpen);
    window.addEventListener("mora-open-area", onArea);
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.has("chat") || q.has("bacheca") || q.has("area"))
        window.history.replaceState(null, "", window.location.pathname);
    } catch (e) {
      // niente
    }
    return () => {
      window.removeEventListener("mora-open-chat", onOpen);
      window.removeEventListener("mora-open-area", onArea);
    };
  }, []);
  const unread = useMemo(
    () => (chatEnabled ? unreadTotal(chatMessages, chatReads, currentTechName) : 0),
    [chatEnabled, chatMessages, chatReads, currentTechName],
  );
  let order = layoutConfig?.dashboardOrder || [
    "new",
    "explore",
    "history",
    "database",
    "office",
    "admin",
  ];
  // "I miei interventi" e "Chat" stanno dentro "La mia area" (non più in Home)
  order = order.filter((k) => k !== "mine" && k !== "chat" && k !== "database"); // Database è dentro Esplora
  // riquadro "La mia area" subito dopo "Nuovo Rapporto"
  if (currentTechName && !order.includes("area")) {
    const k = order.indexOf("new");
    order.splice(k === -1 ? 0 : k + 1, 0, "area");
  }

  const todayCount = useMemo(
    () => todayItems(personal.events || [], personal.reminders || []).length,
    [personal.events, personal.reminders],
  );
  const myMonthCount = useMemo(
    () =>
      logs.filter((l) => isMyLog(l, currentTechName) && isThisMonth(l)).length,
    [logs, currentTechName],
  );

  // RICERCA UNICA: clienti, gru, interventi (anche per N. assistenza)
  const tokens = query.trim().split(/\s+/).map(norm).filter(Boolean);
  const searching = query.trim().length >= 2 && tokens.length > 0;
  const results = useMemo(() => {
    if (!searching) return null;
    const hit = (text) => {
      const h = norm(text);
      return tokens.every((t) => h.includes(t));
    };
    const cs = customers.filter((c) => hit(c.name));
    const ms = machines.filter((m) =>
      hit(`${getSafeMatricola(m)} ${m.customerName} ${m.type || ""}`),
    );
    const ls = logs
      .filter((l) =>
        hit(
          `${l.ticketNumber || ""} ${l.customer} ${l.machineId} ${l.description} ${l.technician} ${(l.additionalTechnicians || []).join(" ")} ${l.dateString} ${formatRope(l.fune)} ${formatRope(l.catena)}`,
        ),
      )
      .sort((a, b) => dateKey(b.dateString) - dateKey(a.dateString));
    return { cs, ms, ls };
  }, [query, customers, machines, logs]);

  const items = {
    new: {
      id: "new",
      label: "Nuovo Rapporto",
      icon: PlusCircle,
      desc: "Registra nuovo intervento",
      action: () => onNavigate("new"),
      primary: true,
    },
    explore: {
      id: "explore",
      label: "Esplora",
      icon: Folder,
      desc: "Clienti, gru e interventi",
      action: () => onNavigate("explore"),
    },
    history: {
      id: "history",
      label: "Storico",
      icon: History,
      desc: "Cronologia interventi",
      action: () => onNavigate("history"),
    },
    database: {
      id: "database",
      label: "Database",
      icon: Database,
      desc: "Gestione anagrafiche",
      action: () => onNavigate("database"),
    },
    office: {
      id: "office",
      label: "Ufficio",
      icon: Briefcase,
      desc: "Statistiche e stampe",
      action: () => onNavigate("office"),
    },
    admin: {
      id: "admin",
      label: "Impostazioni",
      icon: Settings,
      desc: "Configurazione app",
      action: onAdminAccess,
    },
    area: {
      id: "area",
      label: "La mia area",
      icon: UserCircle,
      desc: [
        unread === 1 ? "1 messaggio nuovo" : unread > 1 ? `${unread} messaggi nuovi` : "",
        todayCount === 1 ? "1 cosa da fare oggi" : todayCount > 1 ? `${todayCount} cose da fare oggi` : "",
      ]
        .filter(Boolean)
        .join(" · ") || (chatEnabled ? "Interventi, chat, calendario, note" : "Interventi, calendario, note"),
      action: () => setArea("home"),
      badge: unread + todayCount,
    },
  };

  // --- riquadri informativi (il tecnico li aggiunge se vuole) ---
  const today = todayItems(personal.events || [], personal.reminders || []);
  const myLogs = logs.filter((l) => isMyLog(l, currentTechName));
  const nums = monthNumbers(logs, currentTechName);
  const myVan = vanOf(vans, currentTechName);
  const myLow = myVan ? lowItems(itemsOf(vanItems, myVan.id)) : [];
  const line = (a, b, key) => (
    <span key={key} className="flex gap-2 text-sm min-w-0">
      <span className="font-black text-slate-500 shrink-0 w-12">{a}</span>
      <span className="font-semibold text-slate-700 truncate">{b}</span>
    </span>
  );
  const widgets = {
    w_today: {
      id: "w_today",
      label: "Oggi",
      icon: CalendarDays,
      about: "Impegni e promemoria di oggi",
      action: () => setArea("calendar"),
      widget: (size) => (
        <span className="flex flex-col gap-1">
          {!today.length && <span className="text-sm text-slate-500">Niente in programma</span>}
          {today.slice(0, size === "l" ? 4 : 2).map((t) => line(t.late ? "scad." : t.time || "—", t.title, t.kind + t.id))}
        </span>
      ),
    },
    w_recent: {
      id: "w_recent",
      label: "Ultimi interventi",
      icon: ClipboardList,
      about: "I tuoi ultimi interventi",
      action: () => setShowMine(true),
      widget: (size) => (
        <span className="flex flex-col gap-1">
          {!myLogs.length && <span className="text-sm text-slate-500">Nessun intervento</span>}
          {myLogs.slice(0, size === "l" ? 4 : 2).map((l) =>
            line(relDay(isoFromLogDate(l.dateString)).replace(/^\S+ /, "") || l.dateString, `${l.customer} · ${l.machineId}`, l.id),
          )}
        </span>
      ),
    },
    w_month: {
      id: "w_month",
      label: "Il mio mese",
      icon: BarChart3,
      about: "Interventi fatti e clienti visitati questo mese",
      action: () => setShowMine(true),
      widget: () => (
        <span className="flex gap-4">
          <span><span className="block text-3xl font-black text-slate-800 leading-none">{nums.jobs}</span><span className="text-xs font-bold text-slate-500">interventi</span></span>
          <span><span className="block text-3xl font-black text-slate-800 leading-none">{nums.customers}</span><span className="text-xs font-bold text-slate-500">clienti</span></span>
        </span>
      ),
    },
    w_van: {
      id: "w_van",
      label: "Furgone",
      icon: Truck,
      about: "Pezzi del tuo furgone da riordinare",
      action: () => setArea("van"),
      badge: myLow.length,
      widget: (size) => (
        <span className="flex flex-col gap-1">
          {!myLow.length && <span className="text-sm text-slate-500">Tutto sopra la scorta minima</span>}
          {myLow.slice(0, size === "l" ? 4 : 2).map((i) => line(`${fmtQty(i.qty)} ${i.unit || "pz"}`, i.name, i.id))}
        </span>
      ),
    },
  };
  WIDGETS.forEach((id) => {
    if (id === "w_van" && !myVan) return;
    items[id] = widgets[id];
  });
  const available = isOffice
    ? ["history", "explore"]
    : Object.keys(items).filter((id) => id !== "mine" && id !== "chat" && (id !== "area" || currentTechName));
  const home = isOffice
    ? resolveHome(["history", "explore"], { order: ["history", "explore"], sizes: { history: "l", explore: "l" } }, available)
    : resolveHome(order, prefs, available);
  if (isOffice) items.history = { ...items.history, label: "Interventi", desc: "Tutti gli interventi, con la stampa" };

  const Section = ({ title, icon: Icon, total, max, children }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider ml-1">
        <Icon className="w-3.5 h-3.5" /> {title} ({total})
      </div>
      {children}
      {total > max && (
        <p className="text-[10px] text-slate-400 ml-1">
          Altri {total - max}: scrivi di più per restringere
        </p>
      )}
    </div>
  );
  const rowClass =
    "w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-3";

  const searchBox = (
    <div className="relative" data-section="home-search">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
      <input
        type="text"
        aria-label="Cerca clienti, gru, interventi"
        placeholder="Cerca cliente, gru, N. assistenza..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm font-semibold text-sm text-slate-800 outline-none placeholder:text-slate-400"
      />
      {query && (
        <button
          type="button"
          aria-label="Cancella ricerca"
          onClick={() => setQuery("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      )}
    </div>
  );

  if (searching) {
    const { cs, ms, ls } = results;
    const none = !cs.length && !ms.length && !ls.length;
    return (
      <div className="space-y-5" data-section="search-results">
        {searchBox}
        {none && (
          <p className="text-sm text-slate-400 italic text-center py-8">
            Nessun risultato per "{query.trim()}".
          </p>
        )}
        {cs.length > 0 && (
          <Section
            title="Clienti"
            icon={Users}
            total={cs.length}
            max={MAX.customers}
          >
            {cs.slice(0, MAX.customers).map((c) => (
              <button
                key={c.id}
                type="button"
                className={rowClass}
                onClick={() => onOpenCustomer(c.name)}
              >
                <span className="flex-1 min-w-0 font-bold text-sm text-slate-800 truncate">
                  {c.name}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </Section>
        )}
        {ms.length > 0 && (
          <Section
            title="Gru"
            icon={Factory}
            total={ms.length}
            max={MAX.machines}
          >
            {ms.slice(0, MAX.machines).map((m) => (
              <button
                key={m.id}
                type="button"
                className={rowClass}
                onClick={() =>
                  onOpenMachine(getSafeMatricola(m), m.customerName)
                }
              >
                <span className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-slate-800 block truncate">
                    {getSafeMatricola(m)}
                  </span>
                  <span className="text-xs text-slate-500 block truncate">
                    {m.customerName}
                    {m.type ? ` · ${m.type}` : ""}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </Section>
        )}
        {ls.length > 0 && (
          <Section
            title="Interventi"
            icon={ClipboardList}
            total={ls.length}
            max={MAX.logs}
          >
            {ls.slice(0, MAX.logs).map((l) => (
              <div key={l.id} className="flex items-stretch gap-2">
              <button
                type="button"
                className={rowClass + " flex-1 min-w-0"}
                onClick={() => onOpenMachine(l.machineId, l.customer)}
              >
                <span className="flex-1 min-w-0">
                  <span className="text-[10px] font-black text-slate-500 uppercase block">
                    {l.dateString}
                    {l.ticketNumber ? ` · N. ${l.ticketNumber}` : ""}
                  </span>
                  <span className="font-bold text-sm text-slate-800 block truncate">
                    {l.customer} · {l.machineId}
                  </span>
                  <span className="text-xs text-slate-500 block truncate">
                    {l.description}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
              <PrintLogButton log={l} variant="square" />
              </div>
            ))}
          </Section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showChat && (
        <ChatModal
          messages={chatMessages}
          reads={chatReads}
          technicians={technicians}
          techName={currentTechName}
          isAdmin={isAdmin}
          initialConv={chatConv}
          color={color}
          onClose={() => setShowChat(false)}
          onOpenPhotos={onOpenPhotos}
        />
      )}
      {area && currentTechName && (
        <PersonalAreaModal
          key={area}
          me={currentTechName}
          logs={logs}
          events={personal.events || []}
          notes={personal.notes || []}
          reminders={personal.reminders || []}
          contacts={personal.contacts || []}
          hours={personal.hours || []}
          hoursReminder={(personal.hoursReminder || [])[0] || null}
          vans={vans}
          vanItems={vanItems}
          chatUnread={unread}
          technicians={technicians}
          chatEnabled={chatEnabled}
          myMonthCount={myMonthCount}
          onOpenMine={() => setShowMine(true)}
          color={color}
          initialPanel={area === "home" ? null : area}
          onClose={() => setArea(null)}
          onOpenMachine={(m, c) => {
            setArea(null);
            onOpenMachine(m, c);
          }}
          onOpenChat={() => {
            setArea(null);
            setChatConv(null);
            setShowChat(true);
          }}
        />
      )}
      {showMine && (
        <MyLogsModal
          logs={logs}
          techName={currentTechName}
          color={color}
          onClose={() => setShowMine(false)}
          onOpenMachine={onOpenMachine}
        />
      )}
      <HomeGrid
        editable={!isOffice}
        items={items}
        home={home}
        me={currentTechName}
        color={color}
        searchBox={
          <div className="space-y-4">
            <HomeHero me={currentTechName} logs={logs} todayCount={isOffice ? 0 : todayCount} now={heroNow()} force={heroForce()} />
            {searchBox}
          </div>
        }
        onSaved={setPrefs}
        onPreviewLook={onPreviewLook}
        baseLook={layoutConfig}
        footer={
          <button
            type="button"
            data-action="open-guide"
            onClick={openGuide}
            className="flex items-center gap-2 px-4 h-11 rounded-full text-sm font-bold text-slate-500 hover:bg-white"
          >
            <BookOpen className="w-4 h-4" /> Guida all'app
          </button>
        }
      />
      {showPractice && (
        <PracticeModal
          onClose={() => setShowPractice(false)}
          technicians={technicians}
          machineTypes={machineTypes}
          layoutConfig={layoutConfig}
          vans={vans}
          vanItems={vanItems}
          color={color}
        />
      )}
      {showGuide && (
        <GuideModal
          role={isOffice ? "ufficio" : "tecnico"}
          color={color}
          hasVan={!!myVan}
          chatEnabled={chatEnabled}
          isAdmin={isAdmin}
          onGo={guideGo}
          onClose={() => setShowGuide(false)}
        />
      )}
    </div>
  );
};
