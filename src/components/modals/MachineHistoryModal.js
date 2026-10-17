import React, { useMemo, useState } from "react";
import {
  Factory,
  User,
  X,
  Calendar as CalendarIcon,
  ClipboardList,
  ArrowLeft,
  Camera,
  Wrench,
  Printer,
  ChevronDown,
} from "lucide-react";
import { getTechsString, formatCapacity, getSafeMatricola } from "../../utils";
import { getProPanelClass } from "../../ui";
import {
  buildMachineSheet,
  buildMachineSheetHtml,
  partLabel,
  cleanParts,
} from "../../parts";
import { openPrintWindow } from "../../reports";

export const MachineHistoryModal = ({
  machine,
  allLogs,
  onClose,
  onOpenCustomer,
  onOpenPhotos,
  themeColor,
  appTitle,
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
  const sheet = useMemo(() => buildMachineSheet(machineLogs), [machineLogs]);
  const [openType, setOpenType] = useState(null);

  const printSheet = () =>
    openPrintWindow(
      buildMachineSheetHtml({
        appTitle,
        machine,
        sheet,
        logsCount: machineLogs.length,
        today: new Date().toLocaleDateString("it-IT"),
      })
    );

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
            <div className="flex items-center gap-2">
              <button
                onClick={printSheet}
                className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm transition-all active:scale-95 text-slate-600 hover:bg-slate-100"
              >
                <Printer className="w-4 h-4" />
                <span className="font-bold text-[10px] uppercase tracking-wider">
                  Stampa scheda
                </span>
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-white rounded-full border border-slate-300 hover:bg-slate-100 transition-all text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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
          <div
            className={`p-4 rounded-2xl mb-6 ${getProPanelClass(color)}`}
            data-section="technical-sheet"
          >
            <div className="flex items-center gap-2 mb-3">
              <Wrench className={`w-5 h-5 text-${color}-600`} />
              <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider">
                Scheda tecnica
              </h3>
            </div>
            {sheet.current.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Nessun pezzo sostituito registrato. La scheda si aggiorna da sola
                quando i tecnici compilano "Pezzi sostituiti" o scrivono nella
                descrizione, ad esempio, "sostituita fune Ø 10 mm".
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {sheet.current.map((e) => {
                  const all = sheet.history.filter((h) => h.type === e.type);
                  const isOpen = openType === e.type;
                  return (
                    <div
                      key={e.type}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3"
                      data-part={e.type}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-black text-xs uppercase text-slate-800">
                          {partLabel(e.type)}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                            e.source === "manual"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                          title={
                            e.source === "manual"
                              ? "Dati inseriti dal tecnico"
                              : "Rilevato automaticamente dalla descrizione: da verificare"
                          }
                        >
                          {e.source === "manual" ? "Inserito" : "Da descrizione"}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                        {e.brand && <div>{e.brand}</div>}
                        {e.serial && (
                          <div>
                            Matr. <b>{e.serial}</b>
                          </div>
                        )}
                        {e.specs && <div>{e.specs}</div>}
                        {e.source === "auto" && e.excerpt && (
                          <div className="italic text-slate-400">
                            "{e.excerpt}"
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 mt-2">
                        Montato il {e.dateString}
                        {e.technician ? ` · ${e.technician}` : ""}
                      </div>
                      {all.length > 1 && (
                        <>
                          <button
                            onClick={() => setOpenType(isOpen ? null : e.type)}
                            className={`mt-2 text-[10px] font-bold uppercase flex items-center gap-1 text-${color}-600`}
                          >
                            <ChevronDown
                              className={`w-3 h-3 transition-transform ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                            {all.length} sostituzioni
                          </button>
                          {isOpen && (
                            <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
                              {all.map((h, i) => (
                                <div
                                  key={i}
                                  className="text-[10px] text-slate-500"
                                >
                                  <b>{h.dateString}</b>
                                  {h.serial ? ` · Matr. ${h.serial}` : ""}
                                  {h.specs ? ` · ${h.specs}` : ""}
                                  {h.brand ? ` · ${h.brand}` : ""}
                                  {h.source === "auto" ? " (da descrizione)" : ""}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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

                    {/* INFO TECNICO E FOTO */}
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg text-slate-500 border border-slate-100">
                        <User className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-tight">
                          {getTechsString(log)}
                        </span>
                      </div>
                      {log.photos && log.photos.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPhotos(log.photos);
                          }}
                          className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg uppercase flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                        >
                          <Camera className="w-3 h-3" /> {log.photos.length}{" "}
                          FOTO
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-700 text-xs md:text-sm leading-relaxed font-medium relative z-10 italic whitespace-pre-wrap break-words">
                    "{log.description}"
                  </p>
                  {cleanParts(log.parts).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 relative z-10">
                      {cleanParts(log.parts).map((p, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-bold uppercase bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-lg flex items-center gap-1"
                        >
                          <Wrench className="w-3 h-3" /> {partLabel(p.type)}
                          {p.serial ? ` · ${p.serial}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
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
