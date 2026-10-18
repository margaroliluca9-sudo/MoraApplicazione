import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  User,
  Trash2,
  RefreshCw,
  Edit,
  Clock,
  Camera,
  Printer,
} from "lucide-react";
import { doc, deleteDoc } from "firebase/firestore";
import { db, appId } from "../firebase";
import { isAdminPassword } from "../passwords";
import { getTechsString, formatCapacity } from "../utils";
import { getProPanelClass } from "../ui";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { EditLogModal } from "../components/modals/EditLogModal";
import { buildInterventionPdf, pdfFileName } from "../pdf";
import { openPdf } from "../components/PdfHost";
import { formatRope, formatRopeLong, ROPE_ITEMS } from "../ropes";

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
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(null);
  const [isEditing, setIsEditing] = useState(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [isFreeAction, setIsFreeAction] = useState(false);
  const color = layoutConfig?.themeColor || "blue";

  // --- STATO E LOGICA PER IL RIDIMENSIONAMENTO COLONNE ---
  const [colWidths, setColWidths] = useState({
    date: 140,
    customer: 240,
    description: 350,
    techs: 160,
    actions: 100,
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

  const filtered = logs.filter((l) => {
    const s = searchTerm.toLowerCase();
    return (
      (l.customer && l.customer.toLowerCase().includes(s)) ||
      (l.machineId && l.machineId.toLowerCase().includes(s)) ||
      (l.description && l.description.toLowerCase().includes(s)) ||
      (l.fune && formatRope(l.fune).toLowerCase().includes(s)) ||
      (l.catena && formatRope(l.catena).toLowerCase().includes(s))
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

  // Stampa il rapporto del singolo intervento (modulo "Servizio Assistenza Tecnica")
  const printLog = (log) =>
    openPdf(
      () => buildInterventionPdf({ log }),
      pdfFileName("Assistenza", log.ticketNumber, log.customer, (log.dateString || "").replace(/\//g, "-"))
    );

  const handleEdit = (log) => {
    const isRecent =
      log.createdAt &&
      Date.now() - log.createdAt.seconds * 1000 < 3 * 60 * 1000;
    if (isAdmin || isRecent) setIsEditing(log.id);
    else onAuthAdmin();
  };

  const confirmDelete = async () => {
    if (!isFreeAction && !isAdminPassword(pin)) return setErr(true);
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
                  <div className="flex-1 pr-2">
                    <h4
                      className="font-black text-slate-800 uppercase text-sm hover:text-blue-600 hover:underline cursor-pointer leading-tight break-words"
                      onClick={() => onOpenCustomer(log.customer)}
                    >
                      {log.customer}
                    </h4>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span
                        className={`text-[10px] font-bold text-${color}-700 bg-${color}-50 px-2 py-0.5 rounded uppercase cursor-pointer hover:bg-${color}-100`}
                        onClick={() =>
                          onOpenMachine(log.machineId, log.customer)
                        }
                      >
                        MAT: {log.machineId}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                        {log.machineType}
                      </span>
                      {log.capacity && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase">
                          {formatCapacity(log.capacity)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase whitespace-nowrap">
                        {log.dateString}
                      </span>
                      {isAdmin && log.createdAt && (
                        <span
                          className="text-[8px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded flex items-center gap-1"
                          title="Inserito il (Visibile solo Admin)"
                        >
                          <Clock className="w-2.5 h-2.5" />{" "}
                          {new Date(
                            log.createdAt.seconds * 1000
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    {log.ticketNumber && (
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg uppercase whitespace-nowrap">
                        N. Assistenza {log.ticketNumber}
                      </span>
                    )}
                    {/* BOTTONE FOTO STORICO MOBILE */}
                    {log.photos && log.photos.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPhotos(log.photos);
                        }}
                        className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg uppercase whitespace-nowrap flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                      >
                        <Camera className="w-3 h-3" /> {log.photos.length} FOTO
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-slate-600 text-xs italic bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap break-words">
                  "{log.description}"
                </p>
                <RopeInfo log={log} />
                <div className="flex justify-between items-center pt-1">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-bold uppercase text-slate-600 truncate max-w-[120px]">
                      {getTechsString(log)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => printLog(log)}
                      className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:text-slate-700"
                      title="Stampa"
                      aria-label="Stampa intervento"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(log)}
                      className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:text-blue-500"
                      title="Modifica"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(log)}
                      className="p-2 bg-slate-100 text-slate-400 rounded-lg hover:text-red-500"
                      title="Elimina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
                            N. Assistenza {log.ticketNumber}
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
                          className="font-bold text-slate-800 uppercase text-xs cursor-pointer hover:text-blue-600 hover:underline break-words whitespace-normal leading-tight"
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
                    </td>
                    <td className="px-4 py-4 text-[10px] font-bold uppercase text-slate-600 align-top border-r border-slate-100 overflow-hidden">
                      {getTechsString(log)}
                    </td>
                    <td className="px-4 py-4 text-center align-top">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => printLog(log)}
                          className="text-slate-500 hover:scale-110"
                          title="Stampa"
                          aria-label="Stampa intervento"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
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
