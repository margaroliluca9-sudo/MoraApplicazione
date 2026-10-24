import { EmptyState } from "../components/EmptyState";
import { fuzzyFilter } from "../fuzzy";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Search,
  User,
  Trash2,
  RefreshCw,
  Edit,
  Clock,
  Camera,
  PenLine,
  Printer,
  Lock,
} from "lucide-react";
import { isAdminPassword } from "../passwords";
import { getTechsString, formatCapacity } from "../utils";
import { getProPanelClass } from "../ui";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { EditLogModal } from "../components/modals/EditLogModal";
import { formatRope, formatRopeLong, ROPE_ITEMS } from "../ropes";
import { printIntervention } from "../components/PrintLogButton";
import { trashLog } from "../trash";
import { editsOf } from "../logHistory";
import { EditsModal } from "../components/modals/EditsModal";
import { SwipeRow } from "../components/SwipeRow";
import { parseTicketQuery, matchTicket, ticketLabel } from "../ticket";

// gruppi dello Storico: Oggi, Ieri, Questa settimana, Settimana scorsa, poi mese per mese
const MESI = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
export const dayGroup = (dateString, now = new Date()) => {
  const [d, m, y] = String(dateString || "").split("/").map(Number);
  if (!d || !m || !y) return "Altri";
  const day = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((today - day) / 86400000);
  const dow = (today.getDay() + 6) % 7; // lunedì = 0
  if (diff === 0) return "Oggi";
  if (diff === 1) return "Ieri";
  if (diff > 1 && diff <= dow) return "Questa settimana";
  if (diff > dow && diff <= dow + 7) return "Settimana scorsa";
  return `${MESI[m - 1]} ${y}`;
};
const isRecent = (log) => !!(log && log.createdAt && Date.now() - log.createdAt.seconds * 1000 < 3 * 60 * 1000);

// chi ha fatto l'intervento: cerchietti con l'iniziale e i nomi accanto
const FACE_TONES = ["blue", "emerald", "amber", "purple", "rose", "teal"];
const faceTone = (n) => FACE_TONES[[...String(n)].reduce((a, c) => a + c.charCodeAt(0), 0) % FACE_TONES.length];
const TechFaces = ({ log }) => {
  const names = [log.technician, ...(log.additionalTechnicians || [])].filter(Boolean);
  return (
    <div className="flex items-center gap-2 min-w-0" data-tech-faces>
      <div className="flex -space-x-2 shrink-0">
        {names.slice(0, 3).map((n) => (
          <span key={n} className={`w-7 h-7 rounded-full ring-2 ring-white bg-${faceTone(n)}-100 text-${faceTone(n)}-700 text-xs font-black flex items-center justify-center`}>
            {String(n).trim().charAt(0).toUpperCase()}
          </span>
        ))}
        {!names.length && <User className="w-4 h-4 text-slate-400" />}
      </div>
      <span className="text-sm font-semibold text-slate-600 truncate">{getTechsString(log)}</span>
    </div>
  );
};

export const HistoryView = ({
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
  onOpenPhotos,
  readOnly = false, // ufficio: solo consultazione e stampa
  me = "", // tecnico collegato: filtro «I miei»
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [show, setShow] = useState("all"); // all | mine | photos
  const [page, setPage] = useState(1);
  // telefono: i primi 20, poi altri 20 man mano che scorri (si apre subito anche con migliaia di interventi)
  const [shown, setShown] = useState(20);
  const moreRef = useRef(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [isEditing, setIsEditing] = useState(null);
  const [showEdits, setShowEdits] = useState(null); // rapporto di cui vedere la storia delle modifiche
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [isFreeAction, setIsFreeAction] = useState(false);
  const color = layoutConfig?.themeColor || "blue";

  // --- STATO E LOGICA PER IL RIDIMENSIONAMENTO COLONNE ---
  const [colWidths, setColWidths] = useState({
    date: 140,
    customer: 240,
    description: 310,
    techs: 160,
    actions: 120,
  });
  const resizingRef = useRef(null);

  const startResize = (e, col) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
      col,
      startX: e.clientX,
      startWidth: colWidths[col],
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = useCallback((e) => {
    if (!resizingRef.current) return;
    const { col, startX, startWidth } = resizingRef.current;
    const delta = e.clientX - startX;
    const newWidth = Math.max(60, startWidth + delta); // Larghezza minima
    setColWidths((prev) => ({ ...prev, [col]: newWidth }));
  }, []);

  const handleMouseUp = useCallback(() => {
    resizingRef.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  // ---------------------------------------------------------

  const meKey = String(me || "").trim().toLowerCase();
  // N. assistenza (riparte ogni anno): «5» = i n. 5 di tutti gli anni, «5/2027» solo quello del 2027
  // ricerca che perdona gli errori di battitura («biachi» trova Bianchi): vedi fuzzy.js
  const filtered = useMemo(() => {
    const q = parseTicketQuery(searchTerm);
    const ticket = q && logs.some((l) => matchTicket(l, q));
    const mine = (l) =>
      String(l.technician || "").trim().toLowerCase() === meKey ||
      (l.additionalTechnicians || []).some((t) => String(t).trim().toLowerCase() === meKey);
    const base = logs.filter((l) => {
      if (show === "mine" && !mine(l)) return false;
      if (show === "photos" && !(l.photos && l.photos.length)) return false;
      return !ticket || matchTicket(l, q);
    });
    if (ticket) return base;
    return fuzzyFilter(base, searchTerm, (l) => `${l.ticketNumber || ""} ${l.customer || ""} ${l.machineId || ""} ${l.description || ""} ${l.fune ? formatRope(l.fune) : ""} ${l.catena ? formatRope(l.catena) : ""}`);
  }, [logs, show, searchTerm, meKey]);

  const ITEMS_PER_PAGE = 50;
  const paginated = isMobile
    ? filtered.slice(0, shown)
    : filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const totalPages = isMobile ? 1 : Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const hasMore = isMobile && filtered.length > shown;
  useEffect(() => {
    setShown(20);
  }, [searchTerm, show]);
  useEffect(() => {
    const el = moreRef.current;
    if (!hasMore || !el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((en) => {
      if (en[0] && en[0].isIntersecting) setShown((n) => n + 20);
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, shown]);

  const handleDelete = (log) => {
    const isRecent =
      log.createdAt &&
      Date.now() - log.createdAt.seconds * 1000 < 3 * 60 * 1000;
    if (isAdmin || isRecent) {
      setIsFreeAction(isRecent && !isAdmin);
      setIsDeleting(log.id);
    } else onAuthAdmin();
  };

  // Stampa il rapporto del singolo intervento
  const printLog = printIntervention;

  const handleEdit = (log) => {
    const isRecent =
      log.createdAt &&
      Date.now() - log.createdAt.seconds * 1000 < 3 * 60 * 1000;
    if (isAdmin || isRecent) setIsEditing(log.id);
    else onAuthAdmin();
  };

  const confirmDelete = async () => {
    if (!isFreeAction && !isAdminPassword(pin)) return setErr(true);
    // non si perde: va nel cestino per 30 giorni (Area admin → Cestino)
    await trashLog(isDeleting, me || (isAdmin ? "admin" : ""), logs.find((l) => l.id === isDeleting));
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
      <div className="flex gap-2 max-w-xl mx-auto -mt-3" data-section="history-filter">
        {[
          ["all", "Tutti"],
          ...(meKey ? [["mine", "I miei"]] : []),
          ["photos", "Con foto"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-history-filter={id}
            aria-pressed={show === id}
            onClick={() => {
              setShow(id);
              setPage(1);
            }}
            className={`h-9 px-4 rounded-full text-sm font-bold border ${
              show === id ? `bg-${color}-600 border-${color}-600 text-white` : "bg-white border-slate-200 text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
        {(show !== "all" || searchTerm) && (
          <span className="self-center ml-auto text-xs font-bold text-slate-400">{filtered.length} interventi</span>
        )}
      </div>
      <div
        className={isMobile ? "" : `rounded-3xl overflow-hidden shadow-xl ${getProPanelClass(color)}`}
      >
        {isMobile ? (
          <div className="space-y-3" data-section="history-cards">
            {filtered.length === 0 && (
              <EmptyState
                color={color}
                title="Nessun intervento"
                text={searchTerm ? "Prova a cambiare quello che hai scritto nella ricerca." : show === "photos" ? "Nessun intervento con foto, per ora." : "Qui compariranno gli interventi."}
              />
            )}
            {paginated.map((log, i) => {
              const group = dayGroup(log.dateString);
              const showGroup = i === 0 || dayGroup(paginated[i - 1].dateString) !== group;
              const canChange = isAdmin || isRecent(log);
              return (
                <React.Fragment key={log.id}>
                  {showGroup && (
                    <div data-day-group={group} className="px-1 pt-3 pb-0.5 text-sm font-bold text-slate-500">
                      {group}
                    </div>
                  )}
                  <SwipeRow
                    id={log.id}
                    rounded="rounded-3xl"
                    actions={[
                      { id: "print", label: "Stampa", icon: Printer, tone: "slate", onClick: () => printLog(log) },
                      !readOnly && canChange && { id: "edit", label: "Modifica", icon: Edit, tone: "blue", onClick: () => handleEdit(log) },
                      !readOnly && canChange && { id: "delete", label: "Elimina", icon: Trash2, tone: "red", onClick: () => handleDelete(log) },
                      !readOnly && !canChange && { id: "unlock", label: "Modifica", icon: Lock, tone: "amber", onClick: onAuthAdmin },
                    ]}
                  >
                  <div className="p-4 space-y-2.5 bg-white rounded-3xl border border-slate-200 shadow-sm" data-log-card>
                    <div className="flex justify-between items-start gap-3">
                      <h4
                        className="font-extrabold text-slate-800 text-[17px] leading-tight break-words cursor-pointer"
                        onClick={() => onOpenCustomer(log.customer)}
                      >
                        {log.customer}
                      </h4>
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap bg-slate-100 rounded-full px-2.5 py-1 tabular-nums">{log.dateString}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenMachine(log.machineId, log.customer)}
                      aria-label={`Scheda della gru ${log.machineId}`}
                      className={`block text-left text-sm font-bold text-${color}-700 py-1.5 -my-1.5`}
                    >
                      Gru {log.machineId}
                      <span className="font-semibold text-slate-500">
                        {log.machineType ? ` · ${log.machineType}` : ""}
                        {log.capacity ? ` · ${formatCapacity(log.capacity)}` : ""}
                      </span>
                    </button>
                    {(log.ticketNumber || (log.photos && log.photos.length > 0) || editsOf(log).length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {log.ticketNumber && (
                          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            N. assistenza {ticketLabel(log)}
                          </span>
                        )}
                        {log.photos && log.photos.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPhotos(log.photos);
                            }}
                            className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1" aria-label={`Vedi le ${log.photos.length} foto`}
                          >
                            <Camera className="w-3.5 h-3.5" /> {log.photos.length} foto
                          </button>
                        )}
                        {editsOf(log).length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowEdits(log);
                            }}
                            data-action="log-edits"
                            className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1"
                          >
                            <PenLine className="w-3.5 h-3.5" /> Modificato {editsOf(log).length === 1 ? "1 volta" : `${editsOf(log).length} volte`}
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-slate-700 text-sm leading-snug whitespace-pre-wrap break-words">{log.description}</p>
                    <RopeInfo log={log} />
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <TechFaces log={log} color={color} />
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => printLog(log)}
                          className="w-10 h-10 flex items-center justify-center text-slate-500 rounded-full hover:bg-slate-100"
                          title="Stampa"
                          aria-label="Stampa intervento"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {!readOnly &&
                          (canChange ? (
                            <>
                              <button
                                onClick={() => handleEdit(log)}
                                className="w-10 h-10 flex items-center justify-center text-slate-500 rounded-full hover:bg-slate-100"
                                title="Modifica"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(log)}
                                className="w-10 h-10 flex items-center justify-center text-red-500 rounded-full hover:bg-red-50"
                                title="Elimina"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={onAuthAdmin}
                              className="w-10 h-10 flex items-center justify-center text-slate-300 rounded-full"
                              title="Modifica o elimina (serve la password admin)"
                              aria-label="Modifica o elimina con la password admin"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                  </SwipeRow>
                </React.Fragment>
              );
            })}
            {hasMore && (
              <button
                ref={moreRef}
                type="button"
                onClick={() => setShown((n) => n + 20)}
                data-action="history-more"
                className="w-full h-12 rounded-full bg-white border border-slate-200 text-slate-600 font-bold text-sm"
              >
                Altri interventi ({filtered.length - shown})
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar w-full">
            <table
              className="text-left table-fixed border-collapse"
              style={{ width: "max-content", minWidth: "100%" }}
            >
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th
                    className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase relative group select-none border-r border-slate-200"
                    style={{ width: colWidths.date }}
                  >
                    Data
                    <div
                      onMouseDown={(e) => startResize(e, "date")}
                      onTouchStart={(e) => startResize(e.touches[0], "date")}
                      className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 z-10 translate-x-1/2"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase relative group select-none border-r border-slate-200"
                    style={{ width: colWidths.customer }}
                  >
                    Cliente
                    <div
                      onMouseDown={(e) => startResize(e, "customer")}
                      onTouchStart={(e) =>
                        startResize(e.touches[0], "customer")
                      }
                      className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 z-10 translate-x-1/2"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase relative group select-none border-r border-slate-200"
                    style={{ width: colWidths.description }}
                  >
                    Descrizione
                    <div
                      onMouseDown={(e) => startResize(e, "description")}
                      onTouchStart={(e) =>
                        startResize(e.touches[0], "description")
                      }
                      className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 z-10 translate-x-1/2"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase relative group select-none border-r border-slate-200"
                    style={{ width: colWidths.techs }}
                  >
                    Tecnici
                    <div
                      onMouseDown={(e) => startResize(e, "techs")}
                      onTouchStart={(e) => startResize(e.touches[0], "techs")}
                      className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 z-10 translate-x-1/2"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase text-center relative group select-none"
                    style={{ width: colWidths.actions }}
                  >
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 group">
                    <td className="px-4 py-4 text-xs font-bold text-slate-500 align-top border-r border-slate-100 overflow-hidden">
                      <div className="whitespace-nowrap">{log.dateString}</div>
                      {isAdmin && log.createdAt && (
                        <div
                          className="text-[9px] text-purple-600 font-bold mt-1 flex items-center gap-1"
                          title="Orario di inserimento (Admin)"
                        >
                          <Clock className="w-3 h-3" />{" "}
                          {new Date(
                            log.createdAt.seconds * 1000
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                      <div className="flex flex-col gap-1 mt-1.5 items-start">
                        {log.ticketNumber && (
                          <div className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded inline-block uppercase tracking-wider whitespace-nowrap">
                            N. Assistenza {ticketLabel(log)}
                          </div>
                        )}
                        {log.photos && log.photos.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenPhotos(log.photos);
                            }}
                            className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                          >
                            <Camera className="w-3 h-3" /> {log.photos.length}{" "}
                            FOTO
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top border-r border-slate-100 overflow-hidden">
                      <div className="flex flex-col">
                        <span
                          className="font-bold text-slate-800 text-xs cursor-pointer hover:text-blue-600 hover:underline break-words whitespace-normal leading-tight"
                          onClick={() => onOpenCustomer(log.customer)}
                        >
                          {log.customer}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span
                            className={`text-[10px] text-${color}-600 font-bold cursor-pointer hover:underline`}
                            onClick={() =>
                              onOpenMachine(log.machineId, log.customer)
                            }
                          >
                            {log.machineId}
                          </span>
                          <span className="text-[10px] text-slate-500 border-l border-slate-300 pl-1 ml-1">
                            {log.machineType}
                          </span>
                          {log.capacity && (
                            <span className="text-[10px] text-slate-500 border-l border-slate-300 pl-1 ml-1">
                              {formatCapacity(log.capacity)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600 italic break-words whitespace-pre-wrap align-top border-r border-slate-100 overflow-hidden">
                      "{log.description}"
                      <RopeInfo log={log} />
                      {editsOf(log).length > 0 && (
                        <button type="button" onClick={() => setShowEdits(log)} data-action="log-edits" className="mt-1 not-italic text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <PenLine className="w-3 h-3" /> Modificato {editsOf(log).length === 1 ? "1 volta" : `${editsOf(log).length} volte`}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4 text-[10px] font-bold uppercase text-slate-600 align-top border-r border-slate-100 overflow-hidden">
                      {getTechsString(log)}
                    </td>
                    <td className="px-4 py-4 text-center align-top">
                      <div className="flex justify-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => printLog(log)}
                          className="text-slate-500 hover:scale-110"
                          title="Stampa"
                          aria-label="Stampa intervento"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {!readOnly && (
                          <>
                            <button
                              onClick={() => handleEdit(log)}
                              className={`text-${color}-500 hover:scale-110`}
                              title="Modifica"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(log)}
                              className="text-red-500 hover:scale-110"
                              title="Elimina"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          note="Va nel cestino: l'admin lo può recuperare per 30 giorni."
        />
      )}
      {showEdits && <EditsModal log={logs.find((l) => l.id === showEdits.id) || showEdits} onClose={() => setShowEdits(null)} color={color} />}
      {isEditing && (
        <EditLogModal
          log={logs.find((l) => l.id === isEditing)}
          customers={customers}
          technicians={technicians}
          machineTypes={machineTypes}
          onClose={() => setIsEditing(null)}
          color={color}
          layoutConfig={layoutConfig}
          allLogs={logs}
          me={me || (isAdmin ? "admin" : "")}
        />
      )}
    </div>
  );
};

// Dati della fune / catena sostituita (Storico)
const RopeInfo = ({ log }) => {
  const items = ROPE_ITEMS.filter(({ id }) => log && log[id]);
  if (!items.length) return null;
  return (
    <div className="mt-2 space-y-1 not-italic">
      {items.map(({ id, title }) => (
        <div
          key={id}
          data-rope-info={id}
          className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 whitespace-normal"
        >
          {title} sostituita: {formatRopeLong(log[id])}
        </div>
      ))}
    </div>
  );
};
