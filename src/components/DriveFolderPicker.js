// ADMIN → Clienti → matita → «Cartella nel Drive»: scegli a mano quale cartella di Clienti/Verifiche è di questo
// cliente, quando il nome nel Drive è diverso da quello nell'app. L'elenco delle cartelle lo scrive ogni mattina
// il programmino del Drive in settings/drive_folders; lui poi usa la cartella scelta qui (dal giorno dopo).
import React, { useEffect, useMemo, useState } from "react";
import { doc } from "firebase/firestore";
import { Folder, Search, X } from "lucide-react";
import { db, appId } from "../firebase";
import { getDoc } from "../metered";

let cache = null;
const loadFolders = () => {
  if (!cache) {
    cache = getDoc(doc(db, "artifacts", appId, "public", "data", "settings", "drive_folders"))
      .then((s) => {
        try {
          const l = s.exists() ? JSON.parse(s.data().list || "[]") : [];
          return Array.isArray(l) ? l : [];
        } catch (e) {
          return [];
        }
      })
      .catch((e) => {
        console.error(e);
        cache = null;
        return [];
      });
  }
  return cache;
};

// value = { id, name } scelto a mano, oppure null (decide l'app dal nome)
export const DriveFolderPicker = ({ customerId, value, onChange }) => {
  const [folders, setFolders] = useState(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  useEffect(() => {
    let alive = true;
    loadFolders().then((l) => alive && setFolders(l));
    return () => {
      alive = false;
    };
  }, []);
  const auto = useMemo(() => (folders || []).find((f) => f.c === customerId), [folders, customerId]);
  const list = useMemo(() => {
    const t = q.trim().toUpperCase();
    return (folders || []).filter((f) => !t || String(f.n).toUpperCase().includes(t)).slice(0, 60);
  }, [folders, q]);
  if (folders === null) return null;

  const shown = value ? value.name : auto ? auto.n : "";
  return (
    <div className="space-y-1" data-section="drive-folder">
      <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Cartella nel Drive</label>
      {!folders.length ? (
        <p className="text-xs text-slate-500 ml-1">L'elenco arriva dopo il primo giro del programma del Drive (vedi Guida).</p>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Folder className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="flex-1 min-w-0 text-sm" data-drive-folder-current>
              {shown ? <b className="text-slate-800">{shown}</b> : <span className="text-slate-400">nessuna trovata</span>}
              <span className="block text-[11px] text-slate-500">{value ? "scelta da te" : auto ? "trovata dal nome" : "il nome non corrisponde"}</span>
            </span>
            <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs font-bold text-blue-700 shrink-0" data-action="drive-folder-change">
              {open ? "Chiudi" : "Cambia"}
            </button>
          </div>
          {open && (
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  className="flex-1 text-sm outline-none bg-transparent"
                  placeholder="Cerca la cartella…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  data-drive-folder-search
                />
              </div>
              <ul className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                {value && (
                  <li>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs font-bold text-slate-500 flex items-center gap-1.5"
                      onClick={() => {
                        onChange(null);
                        setOpen(false);
                      }}
                    >
                      <X className="w-3.5 h-3.5" /> Togli la scelta (decide l'app dal nome)
                    </button>
                  </li>
                )}
                {list.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      data-drive-folder-row
                      className={`w-full text-left px-3 py-2 text-sm ${value && value.id === f.id ? "bg-blue-50 font-bold" : ""}`}
                      onClick={() => {
                        onChange({ id: f.id, name: f.n });
                        setOpen(false);
                      }}
                    >
                      {f.n}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};
