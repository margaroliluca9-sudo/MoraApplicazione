import React from "react";
import { EmptyState } from "../EmptyState";
import {
  X,
  ChevronRight,
  Users,
  Printer,
} from "lucide-react";
import { formatCapacity, getSafeMatricola } from "../../utils";
import { getProPanelClass } from "../../ui";
import { buildCustomerMachinesPdf, pdfFileName } from "../../pdf";
import { openPdf } from "../PdfHost";
import { placeOf, mapsUrl } from "../../places";

export const CustomerDetailModal = ({
  customerName,
  customers = [],
  machines,
  onClose,
  onOpenMachine,
  themeColor,
}) => {
  const color = themeColor || "blue";
  const customerMachines = machines.filter(
    (m) => m.customerName === customerName
  );
  const customer = customers.find((c) => c.name === customerName) || null;
  const place = placeOf(customer);
  const map = mapsUrl(customer);

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className={`w-full max-w-2xl h-[80vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl ${getProPanelClass(
          color
        )}`}
      >
        <div className="bg-slate-50 p-6 flex justify-between items-center gap-3 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-3 bg-${color}-100 rounded-xl text-${color}-600`}>
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-800 break-words">
                {customerName}
              </h2>
              {place && (
                <p className="text-sm text-slate-600 font-semibold" data-customer-place>
                  {place}
                  {map && (
                    <a href={map} target="_blank" rel="noopener noreferrer" className={`ml-2 text-${color}-700 font-bold underline`} data-action="customer-map">
                      Mappa
                    </a>
                  )}
                </p>
              )}
              <p className="text-xs text-slate-500 font-bold">
                {customerMachines.length} Gru Registrate
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() =>
                openPdf(
                  () =>
                    buildCustomerMachinesPdf({
                      customerName,
                      machines: customerMachines,
                      today: new Date().toLocaleDateString("it-IT"),
                    }),
                  pdfFileName("Elenco gru", customerName)
                )
              }
              className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-300 shadow-sm text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
              aria-label="Stampa elenco gru"
            >
              <Printer className="w-4 h-4" />
              <span className="font-bold text-[10px] uppercase tracking-wider hidden sm:inline">
                Stampa elenco gru
              </span>
            </button>
            <button
              onClick={onClose}
              aria-label="Chiudi"
              className="p-2 bg-white rounded-full border border-slate-300 hover:bg-slate-100 transition-all text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerMachines.length === 0 && (
              <div className="col-span-full">
                <EmptyState color={color} title="Nessuna gru per questo cliente" text="Le gru compaiono qui appena c'è il primo rapporto." />
              </div>
            )}
            {customerMachines.map((m) => (
              <div
                key={m.id}
                onClick={() => onOpenMachine(getSafeMatricola(m), customerName)}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-black text-sm text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
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
