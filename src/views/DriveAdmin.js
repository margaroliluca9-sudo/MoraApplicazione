// AREA ADMIN → Drive: tutto quello che arriva dal Google Drive (cartella Clienti / Verifiche), in un posto solo.
// Per ogni cliente: da quale cartella e da quale foglio ha preso paese, indirizzo e gru. Toccando un cliente
// puoi scegliere la cartella giusta, correggere paese e indirizzo e correggere o nascondere le gru.
import React, { useEffect, useMemo, useState } from "react";
import { Folder, Search, ChevronRight, MapPin } from "lucide-react";
import { getProPanelClass } from "../ui";
import { placeOf } from "../places";
import { DrivePlacesStatus } from "../components/DrivePlacesStatus";
import { loadFolders } from "../components/DriveFolderPicker";
import { DriveCustomerModal } from "../components/modals/DriveCustomerModal";

export const placeSourceLabel = (c) => {
  if (!c || !placeOf(c)) return "";
  if (c.placeSource === "drive") return "dal Drive";
  if (c.placeSource === "manual") return "scritto a mano";
  if (c.placeSource === "file") return "da file";
  return "";
};

export const DriveAdmin = ({ customers = [], machines = [], color = "blue" }) => {
  const [folders, setFolders] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    loadFolders().then((l) => alive && setFolders(l));
    return () => {
      alive = false;
    };
  }, [reload]);

  // cartella di ogni cliente: quella scelta a mano, altrimenti quella che il programma ha trovato dal nome
  const folderOf = useMemo(() => {
    const byCust = {};
    folders.forEach((f) => {
      if (f.c) byCust[f.c] = f.n;
    });
    return (c) => (c.driveFolderId ? { name: c.driveFolderName || "", how: "scelta da te" } : byCust[c.id] ? { name: byCust[c.id], how: "dal nome" } : null);
  }, [folders]);

  const list = useMemo(() => {
    const t = q.trim().toUpperCase();
    return customers
      .filter((c) => !t || String(c.name || "").toUpperCase().includes(t) || String(c.city || "").toUpperCase().includes(t))
      .filter((c) => filter === "all" || (filter === "nofolder" ? !folderOf(c) : !!folderOf(c)))
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [customers, q, filter, folderOf]);

  const withFolder = customers.filter((c) => folderOf(c)).length;
  const open = customers.find((c) => c.id === openId) || null;

  return (
    <div className={`p-5 shadow-xl space-y-4 ${getProPanelClass(color)}`} data-section="drive-admin">
      <div>
        <h4 className="font-black text-slate-800">Dati dal Drive</h4>
        <p className="text-xs text-slate-500 leading-snug mt-1">
          Ogni mattina il programma legge l'ultimo foglio di verifica di ogni cliente in Clienti / Verifiche. Qui vedi da quale cartella ha preso i dati di ogni cliente; tocca un cliente per scegliere la cartella giusta o correggere paese e gru.
        </p>
      </div>
      <DrivePlacesStatus />
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[180px] flex items-center gap-2 border border-slate-200 rounded-lg px-3 bg-white">
          <Search className="w-4 h-4 text-slate-400" />
          <input className="flex-1 py-2 text-sm outline-none bg-transparent" placeholder="Cerca cliente o paese…" value={q} onChange={(e) => setQ(e.target.value)} data-drive-search />
        </div>
        {[
          ["all", `Tutti (${customers.length})`],
          ["folder", `Con cartella (${withFolder})`],
          ["nofolder", `Senza cartella (${customers.length - withFolder})`],
        ].map(([id, l]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            data-drive-filter={id}
            className={`h-9 px-3 rounded-full text-xs font-bold ${filter === id ? `bg-${color}-600 text-white` : "bg-slate-100 text-slate-700"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <ul className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white max-h-[560px] overflow-y-auto">
        {list.map((c) => {
          const f = folderOf(c);
          const src = placeSourceLabel(c);
          return (
            <li key={c.id}>
              <button type="button" className="w-full text-left p-3 flex items-center gap-3" onClick={() => setOpenId(c.id)} data-drive-customer={c.name}>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-sm text-slate-800 truncate">{c.name}</span>
                  <span className={`block text-xs truncate ${f ? "text-slate-600" : "text-amber-700"}`}>
                    <Folder className="inline w-3.5 h-3.5 -mt-0.5 mr-1" />
                    {f ? (
                      <>
                        {f.name} <span className="text-slate-400">· {f.how}</span>
                      </>
                    ) : (
                      "nessuna cartella trovata"
                    )}
                  </span>
                  {placeOf(c) && (
                    <span className="block text-xs text-slate-500 truncate">
                      <MapPin className="inline w-3.5 h-3.5 -mt-0.5 mr-1" />
                      {placeOf(c)}
                      {src && <span className="text-slate-400"> · {src}</span>}
                    </span>
                  )}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </li>
          );
        })}
        {!list.length && <li className="p-4 text-sm text-slate-500">Nessun cliente.</li>}
      </ul>
      {open && (
        <DriveCustomerModal
          customer={open}
          machines={machines}
          color={color}
          onClose={() => {
            setOpenId(null);
            setReload((r) => r + 1);
          }}
        />
      )}
    </div>
  );
};
