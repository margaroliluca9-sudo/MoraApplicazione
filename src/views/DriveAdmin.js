// AREA ADMIN → Drive: tutto quello che arriva dal Google Drive (cartella Clienti / Verifiche), in un posto solo.
//  - semaforo del programma del Drive (è andato bene? quando?)
//  - «Da controllare»: paragone Drive ↔ app per i clienti abbinati a una cartella con un nome diverso e per le gru
//    abbinate in modo dubbio (tipo o portata diversi, numero interno, numero quasi uguale…)
//  - elenco dei clienti: da quale cartella arrivano i dati; toccando un cliente si corregge tutto.
// I clienti «Solo interventi» non hanno cartella nel Drive (non facciamo le verifiche) e non sono un problema.
import React, { useEffect, useMemo, useState } from "react";
import { collection, doc } from "firebase/firestore";
import { updateDoc } from "../tracked";
import { Folder, Search, ChevronRight, MapPin, Wrench, HelpCircle, Check, X, Loader2 } from "lucide-react";
import { db, appId } from "../firebase";
import { loadDaily } from "../dailyCache";
import { getProPanelClass } from "../ui";
import { placeOf, normName } from "../places";
import { describeError } from "../utils";
import { reviewCustomer } from "../driveCranes";
import { DrivePlacesStatus } from "../components/DrivePlacesStatus";
import { loadFolders } from "../components/DriveFolderPicker";
import { CheckCard } from "../components/DriveCheck";
import { DriveCustomerModal } from "../components/modals/DriveCustomerModal";

export const placeSourceLabel = (c) => {
  if (!c || !placeOf(c)) return "";
  if (c.placeSource === "drive") return "dal Drive";
  if (c.placeSource === "manual") return "scritto a mano";
  if (c.placeSource === "file") return "da file";
  return "";
};

// tutte le gru lette dal Drive: dalla copia sul telefono, dal server al massimo una volta al giorno
let rowsCache = null;
const loadAllRows = () => {
  if (!rowsCache) {
    rowsCache = loadDaily("drive_cranes", collection(db, "artifacts", appId, "public", "data", "drive_cranes"))
      .catch((e) => {
        console.error(e);
        rowsCache = null;
        return [];
      });
  }
  return rowsCache;
};

const FolderCheck = ({ customer, folder, onOpen }) => {
  const [busy, setBusy] = useState("");
  const act = async (what, data) => {
    setBusy(what);
    try {
      await updateDoc(doc(db, "artifacts", appId, "public", "data", "customers", customer.id), data);
    } catch (e) {
      console.error(e);
      alert("Salvataggio non riuscito: " + describeError(e));
      setBusy("");
    }
  };
  const btn = "h-9 px-3 rounded-full text-xs font-bold flex items-center gap-1 disabled:opacity-50";
  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-3 space-y-2" data-check="folder" data-check-customer={customer.name}>
      <p className="text-sm font-bold text-slate-800 flex items-start gap-2">
        <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" /> Il cliente e la cartella hanno nomi diversi: è giusta?
      </p>
      <table className="w-full text-xs border border-slate-200 rounded-xl overflow-hidden table-fixed">
        <tbody className="divide-y divide-slate-100">
          <tr>
            <td className="px-2 py-1.5 text-slate-500 font-semibold w-[28%]">Nell'app</td>
            <td className="px-2 py-1.5 font-bold text-slate-800 break-words">{customer.name}</td>
          </tr>
          <tr>
            <td className="px-2 py-1.5 text-slate-500 font-semibold">Sul Drive</td>
            <td className="px-2 py-1.5 font-bold text-slate-800 break-words">{folder.n}</td>
          </tr>
        </tbody>
      </table>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!!busy} data-action="folder-yes" className={`${btn} bg-emerald-600 text-white`} onClick={() => act("yes", { driveFolderId: folder.id, driveFolderName: folder.n })}>
          {busy === "yes" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} È giusta
        </button>
        <button type="button" data-action="folder-no" className={`${btn} bg-slate-100 text-slate-700`} onClick={onOpen}>
          <X className="w-3.5 h-3.5" /> Non è giusta: scegli
        </button>
      </div>
      <p className="text-[11px] text-slate-500">«Non è giusta» apre il cliente: scegli la cartella giusta oppure segnalo come «Solo interventi».</p>
    </div>
  );
};

export const DriveAdmin = ({ customers = [], machines = [], color = "blue" }) => {
  const [folders, setFolders] = useState([]);
  const [rows, setRows] = useState(null);
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
  useEffect(() => {
    let alive = true;
    loadAllRows().then((l) => alive && setRows(l));
    return () => {
      alive = false;
    };
  }, []);

  const onRowSaved = (nr) => {
    setRows((p) => {
      const next = (p || []).map((x) => (x.id === nr.id ? nr : x));
      rowsCache = Promise.resolve(next);
      return next;
    });
  };

  // cartella di ogni cliente: quella scelta a mano, altrimenti quella che il programma ha trovato dal nome
  const folderOf = useMemo(() => {
    const byCust = {};
    folders.forEach((f) => {
      if (f.c) byCust[f.c] = f;
    });
    return (c) => {
      if (c.driveNone) return null;
      if (c.driveFolderId) return { id: c.driveFolderId, name: c.driveFolderName || "", how: "scelta da te" };
      const f = byCust[c.id];
      return f ? { id: f.id, name: f.n, how: "dal nome" } : null;
    };
  }, [folders]);

  // ---- da controllare ----
  const checks = useMemo(() => {
    const out = [];
    const byCust = {};
    folders.forEach((f) => {
      if (f.c) byCust[f.c] = f;
    });
    customers.forEach((c) => {
      if (c.driveNone || c.driveFolderId) return;
      const f = byCust[c.id];
      if (f && normName(f.n) !== normName(c.name)) out.push({ kind: "folder", c, f });
    });
    if (rows) {
      const perCust = {};
      rows.forEach((r) => {
        (perCust[r.customerId] = perCust[r.customerId] || []).push(r);
      });
      customers.forEach((c) => {
        const mine = perCust[c.id];
        if (!mine || c.driveNone) return;
        const ms = machines.filter((m) => String(m.customerName || "").toUpperCase() === String(c.name || "").toUpperCase());
        const rv = reviewCustomer(mine, ms);
        rv.doubts.forEach((d) => out.push({ kind: "doubt", c, d }));
        rv.suggestions.forEach((d) => out.push({ kind: "suggestion", c, d }));
      });
    }
    return out;
  }, [customers, machines, folders, rows]);

  const counts = useMemo(() => {
    const n = { folder: 0, nofolder: 0, none: 0 };
    customers.forEach((c) => {
      if (c.driveNone) n.none++;
      else if (folderOf(c)) n.folder++;
      else n.nofolder++;
    });
    return n;
  }, [customers, folderOf]);

  const list = useMemo(() => {
    const t = q.trim().toUpperCase();
    return customers
      .filter((c) => !t || String(c.name || "").toUpperCase().includes(t) || String(c.city || "").toUpperCase().includes(t))
      .filter((c) => filter === "all" || (filter === "none" ? c.driveNone : filter === "nofolder" ? !c.driveNone && !folderOf(c) : !!folderOf(c)))
      .slice()
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [customers, q, filter, folderOf]);

  const open = customers.find((c) => c.id === openId) || null;

  return (
    <div className={`p-5 shadow-xl space-y-4 ${getProPanelClass(color)}`} data-section="drive-admin">
      <div>
        <h4 className="font-black text-slate-800">Dati dal Drive</h4>
        <p className="text-xs text-slate-500 leading-snug mt-1">
          Ogni mattina il programma legge l'ultimo foglio di verifica di ogni cliente in Clienti / Verifiche. Qui vedi se è andato bene, cosa c'è da controllare e da quale cartella arrivano i dati di ogni cliente.
        </p>
      </div>
      <DrivePlacesStatus />

      <section className="space-y-2" data-section="drive-checks">
        <h5 className="font-black text-sm text-slate-800 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600" /> Da controllare {rows === null ? "" : `(${checks.length})`}
        </h5>
        {rows === null ? (
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Controllo le gru…
          </p>
        ) : !checks.length ? (
          <p className="text-xs text-emerald-700 font-semibold" data-checks-empty>
            Niente da controllare: clienti e gru sono abbinati bene.
          </p>
        ) : (
          <div className="space-y-2 max-h-[640px] overflow-y-auto">
            {checks.slice(0, 40).map((x) =>
              x.kind === "folder" ? (
                <FolderCheck key={"f" + x.c.id} customer={x.c} folder={x.f} onOpen={() => setOpenId(x.c.id)} />
              ) : (
                <CheckCard key={x.kind + x.d.row.id} kind={x.kind} item={x.d} customerName={x.c.name} onSaved={onRowSaved} onOpenCustomer={() => setOpenId(x.c.id)} color={color} />
              )
            )}
            {checks.length > 40 && <p className="text-xs text-slate-500">…e altri {checks.length - 40}: man mano che rispondi compaiono.</p>}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[180px] flex items-center gap-2 border border-slate-200 rounded-lg px-3 bg-white">
          <Search className="w-4 h-4 text-slate-400" />
          <input className="flex-1 py-2 text-sm outline-none bg-transparent" placeholder="Cerca cliente o paese…" value={q} onChange={(e) => setQ(e.target.value)} data-drive-search />
        </div>
        {[
          ["all", `Tutti (${customers.length})`],
          ["folder", `Con cartella (${counts.folder})`],
          ["nofolder", `Senza cartella (${counts.nofolder})`],
          ["none", `Solo interventi (${counts.none})`],
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
                  {c.driveNone ? (
                    <span className="block text-xs text-slate-500 truncate">
                      <Wrench className="inline w-3.5 h-3.5 -mt-0.5 mr-1" />
                      solo interventi, niente verifiche
                    </span>
                  ) : (
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
                  )}
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
          rows={rows}
          onRowSaved={onRowSaved}
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
