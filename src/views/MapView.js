// SCHEDA MAPPA: tutti i clienti con paese o indirizzo su una cartina come Google Maps (vedi CustomersMap.js).
// In alto la ricerca (nome o paese); toccando un cliente: «Vedi le gru» (apre Esplora su quel cliente) e «Portami qui».
import React, { useMemo, useState } from "react";
import { Search, Map as MapIcon } from "lucide-react";
import { fuzzyFilter } from "../fuzzy";
import { PRO_INPUT, getProPanelClass } from "../ui";
import { CustomersMap } from "../components/CustomersMap";

export const MapView = ({ customers = [], machines = [], color = "blue", onShowMachines }) => {
  const [q, setQ] = useState("");
  const list = useMemo(() => (q.trim() ? fuzzyFilter(customers, q, (c) => `${c.name} ${c.city || ""}`) : customers), [customers, q]);
  return (
    <div className="space-y-3 animate-in fade-in duration-500 flex flex-col" data-section="map-view">
      <div className={`${getProPanelClass(color)} p-4`}>
        <h2 className="font-black text-slate-800 text-lg flex items-center gap-2 mb-3">
          <MapIcon className={`w-5 h-5 text-${color}-600`} /> Mappa dei clienti
        </h2>
        <div className="relative">
          <input type="text" placeholder="Cerca cliente o paese…" className={PRO_INPUT} value={q} onChange={(e) => setQ(e.target.value)} data-map-search />
          <Search className="absolute right-3 top-3.5 text-slate-400 w-5 h-5" />
        </div>
      </div>
      <div className="pb-20">
        <CustomersMap customers={list} machines={machines} color={color} onShowMachines={onShowMachines} />
      </div>
    </div>
  );
};
