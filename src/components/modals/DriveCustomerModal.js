// AREA ADMIN → Drive → un cliente: cartella nel Drive, paese e indirizzo (con da dove arrivano) e le gru
// lette dall'ultimo foglio di verifica. Le gru si possono correggere, abbinare a mano a una gru dell'app o
// nascondere: il programma del Drive non tocca mai le correzioni (scrive solo i suoi campi).
import React, { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { X, Folder, MapPin, ExternalLink, Pencil, EyeOff, Eye, RotateCcw, Check, Loader2, Factory, Wrench } from "lucide-react";
import { db, appId } from "../../firebase";
import { describeError, getSafeMatricola } from "../../utils";
import { DriveFolderPicker } from "../DriveFolderPicker";
import { clearDriveCache } from "../DriveCraneInfo";
import { FIX_FIELDS, withFix, isFixed, matchOfRow, statoTone, reviewCustomer } from "../../driveCranes";
import { CheckCard } from "../DriveCheck";

const ref = (coll, id) => doc(db, "artifacts", appId, "public", "data", coll, id);
const TONE = { red: "text-red-700", amber: "text-amber-700", emerald: "text-emerald-700", slate: "text-slate-700" };
const box = "rounded-2xl border border-slate-200 p-4 space-y-3";
const input = "w-full p-2.5 rounded-lg border border-slate-200 text-sm bg-white";

const CraneRow = ({ row, machines, color, onSaved }) => {
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fix, setFix] = useState(row.fix || {});
  const [linkTo, setLinkTo] = useState(row.linkTo || "");
  const shown = withFix(row);
  const x = matchOfRow(row, machines);
  const m = x ? x.m : null;

  const save = async (data) => {
    setBusy(true);
    try {
      await updateDoc(ref("drive_cranes", row.id), data);
      clearDriveCache();
      if (data.fix) setFix(data.fix);
      if (typeof data.linkTo === "string") setLinkTo(data.linkTo);
      onSaved({ ...row, ...data });
      setEdit(false);
    } catch (e) {
      console.error(e);
      alert("Salvataggio non riuscito: " + describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className={`p-3 space-y-1.5 ${row.hidden ? "opacity-60" : ""}`} data-drive-crane={row.fab || row.id}>
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block font-extrabold text-sm text-slate-800">
            N. fabbrica {row.fab || "—"}
            {isFixed(row) && <span className="ml-2 text-[11px] font-bold text-blue-700">corretta a mano</span>}
            {row.hidden && <span className="ml-2 text-[11px] font-bold text-slate-500">nascosta</span>}
          </span>
          {shown.stato && <span className={`block text-sm font-bold ${TONE[statoTone(shown.stato)]}`}>{shown.stato}</span>}
          <span className="block text-xs text-slate-600">
            {[shown.tipo, shown.portata && `${shown.portata} kg`, shown.paranco && `paranco ${shown.paranco}`, shown.matricola && `INAIL ${shown.matricola}`, shown.anno && `anno ${shown.anno}`].filter(Boolean).join(" · ")}
          </span>
          <span className={`block text-xs font-semibold ${m ? "text-emerald-700" : "text-amber-700"}`} data-drive-crane-machine>
            <Factory className="inline w-3.5 h-3.5 -mt-0.5 mr-1" />
            {m
              ? `Sulla scheda della gru ${getSafeMatricola(m)}${row.linkTo ? " (abbinata da te)" : row.okFor === m.id ? " (controllata)" : ""}`
              : row.linkTo === "-" || row.noApp
              ? "Non è una gru dell'app (deciso da te)"
              : "Nessuna gru nell'app con questo numero: «Correggi» per abbinarla"}
          </span>
          <span className="block text-[11px] text-slate-400">
            {[row.foglio || row.foglioNome, row.cartella && `cartella ${row.cartella}`].filter(Boolean).join(" · ")}
            {row.foglioUrl && (
              <a href={row.foglioUrl} target="_blank" rel="noopener noreferrer" className={`ml-2 font-bold text-${color}-700`}>
                Apri il foglio <ExternalLink className="inline w-3 h-3 -mt-0.5" />
              </a>
            )}
          </span>
        </span>
      </div>
      {!edit ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setEdit(true)} className="h-8 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1" data-action="crane-fix">
            <Pencil className="w-3.5 h-3.5" /> Correggi
          </button>
          <button type="button" disabled={busy} onClick={() => save({ hidden: !row.hidden })} className="h-8 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1" data-action="crane-hide">
            {row.hidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} {row.hidden ? "Mostra" : "Nascondi"}
          </button>
          {isFixed(row) && (
            <button type="button" disabled={busy} onClick={() => save({ fix: {}, linkTo: "", okFor: "", noApp: false, noSugg: "" })} className="h-8 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1" data-action="crane-reset">
              <RotateCcw className="w-3.5 h-3.5" /> Torna ai dati del Drive
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3" data-section="crane-fix-form">
          <label className="block text-[11px] font-bold text-slate-500">
            Gru dell'app
            <select className={input} value={linkTo} onChange={(e) => setLinkTo(e.target.value)} data-crane-link>
              <option value="">In automatico (numero di fabbrica)</option>
              <option value="-">Nessuna: non è una gru dell'app</option>
              {machines.map((mm) => (
                <option key={mm.id} value={getSafeMatricola(mm)}>
                  {getSafeMatricola(mm)}
                  {mm.type ? ` · ${mm.type}` : ""}
                </option>
              ))}
            </select>
          </label>
          {FIX_FIELDS.map(([k, l]) => (
            <label key={k} className="block text-[11px] font-bold text-slate-500">
              {l}
              <input className={input} value={fix[k] || ""} placeholder={row[k] ? `Dal foglio: ${row[k]}` : "vuoto nel foglio"} onChange={(e) => setFix((p) => ({ ...p, [k]: e.target.value }))} data-crane-fix={k} />
            </label>
          ))}
          <p className="text-[11px] text-slate-500">Scrivi solo quello che è sbagliato: i campi vuoti restano come nel foglio.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEdit(false)} className="flex-1 h-10 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold">
              Annulla
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                const clean = {};
                FIX_FIELDS.forEach(([k]) => {
                  if (String(fix[k] || "").trim()) clean[k] = String(fix[k]).trim();
                });
                save({ fix: clean, linkTo, okFor: "" });
              }}
              className={`flex-1 h-10 rounded-full bg-${color}-600 text-white text-xs font-bold flex items-center justify-center gap-1`}
              data-action="crane-fix-save"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Salva
            </button>
          </div>
        </div>
      )}
    </li>
  );
};

export const DriveCustomerModal = ({ customer, machines = [], rows: allRows = null, onRowSaved = () => {}, color = "blue", onClose }) => {
  const [folder, setFolder] = useState(customer.driveFolderId ? { id: customer.driveFolderId, name: customer.driveFolderName || "" } : null);
  const [city, setCity] = useState(customer.city || "");
  const [address, setAddress] = useState(customer.address || "");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const myMachines = useMemo(
    () => machines.filter((m) => String(m.customerName || "").toUpperCase() === String(customer.name || "").toUpperCase()),
    [machines, customer.name]
  );

  const rows = useMemo(
    () => (allRows ? allRows.filter((r) => r.customerId === customer.id).sort((a, b) => String(a.fab || "").localeCompare(String(b.fab || ""), "it", { numeric: true })) : null),
    [allRows, customer.id]
  );
  const review = useMemo(() => reviewCustomer(rows || [], myMachines), [rows, myMachines]);

  const folderChanged = (folder ? folder.id : "") !== (customer.driveFolderId || "");
  const placeChanged = city.trim() !== (customer.city || "") || address.trim() !== (customer.address || "");

  const saveCustomer = async (what, data, done) => {
    setBusy(what);
    setMsg("");
    try {
      await updateDoc(ref("customers", customer.id), data);
      setMsg(done);
    } catch (e) {
      console.error(e);
      alert("Salvataggio non riuscito: " + describeError(e));
    } finally {
      setBusy("");
    }
  };

  const src =
    customer.placeSource === "drive"
      ? "Preso dal Drive"
      : customer.placeSource === "manual"
      ? "Scritto a mano: il Drive non lo cambia più"
      : customer.placeSource === "file"
      ? "Importato da un file: il Drive non lo cambia"
      : "";

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-[200] flex items-stretch md:items-center justify-center md:p-4 backdrop-blur-md" data-section="drive-customer">
      <div className="w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] md:rounded-3xl overflow-hidden flex flex-col shadow-2xl bg-white">
        <div className="p-4 border-b border-slate-200 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500">Dati dal Drive</p>
            <h3 className="font-black text-slate-800 text-lg leading-tight break-words">{customer.name}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-4">
          {msg && (
            <p className="text-sm font-bold text-emerald-700 flex items-center gap-2" data-drive-msg>
              <Check className="w-4 h-4" /> {msg}
            </p>
          )}

          <label className={`${box} flex items-start gap-3 cursor-pointer`} data-section="drive-none">
            <input
              type="checkbox"
              className="mt-0.5 w-5 h-5 shrink-0"
              checked={!!customer.driveNone}
              disabled={!!busy}
              data-drive-none
              onChange={(e) =>
                saveCustomer(
                  "none",
                  { driveNone: e.target.checked },
                  e.target.checked ? "Segnato: solo interventi, niente verifiche nel Drive." : "Tolto «solo interventi»: il programma cerca di nuovo la sua cartella."
                )
              }
            />
            <span className="min-w-0">
              <span className="font-black text-sm text-slate-800 flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Solo interventi, niente verifiche
              </span>
              <span className="block text-xs text-slate-500">Per i clienti che non hanno una cartella nel Drive perché facciamo solo lavori e non le verifiche trimestrali. Il programma non gli abbina nessuna cartella.</span>
            </span>
          </label>

          {!customer.driveNone && (
          <section className={box}>
            <h4 className="font-black text-sm text-slate-800 flex items-center gap-2">
              <Folder className="w-4 h-4" /> Cartella nel Drive
            </h4>
            <DriveFolderPicker customerId={customer.id} value={folder} onChange={setFolder} label={false} />
            {folderChanged && (
              <button
                type="button"
                disabled={!!busy}
                onClick={() =>
                  saveCustomer("folder", { driveFolderId: folder ? folder.id : "", driveFolderName: folder ? folder.name : "" }, "Cartella salvata: il programma la usa dal giro di domattina.")
                }
                className={`w-full h-11 rounded-full bg-${color}-600 text-white font-bold text-sm flex items-center justify-center gap-2`}
                data-action="drive-folder-save"
              >
                {busy === "folder" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salva la cartella
              </button>
            )}
          </section>
          )}

          <section className={box}>
            <h4 className="font-black text-sm text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Paese e indirizzo
            </h4>
            {src && (
              <p className="text-xs text-slate-600" data-place-source>
                {src}
                {customer.placeSource === "drive" && customer.placeFolder ? `: cartella ${customer.placeFolder}` : ""}
                {customer.placeSource === "drive" && customer.placeSheet ? ` · foglio ${customer.placeSheet}` : ""}
                {customer.placeSource === "drive" && customer.placeSheetUrl && (
                  <a href={customer.placeSheetUrl} target="_blank" rel="noopener noreferrer" className={`ml-2 font-bold text-${color}-700`}>
                    Apri il foglio <ExternalLink className="inline w-3 h-3 -mt-0.5" />
                  </a>
                )}
              </p>
            )}
            <input className={input} value={city} placeholder="Paese, es. Borgomanero (NO)" onChange={(e) => setCity(e.target.value)} data-drive-city />
            <input className={input} value={address} placeholder="Indirizzo, es. Via Roma, 10" onChange={(e) => setAddress(e.target.value)} data-drive-address />
            {placeChanged && (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => saveCustomer("place", { city: city.trim(), address: address.trim(), placeSource: "manual" }, "Paese e indirizzo salvati: il Drive non li cambia più.")}
                className={`w-full h-11 rounded-full bg-${color}-600 text-white font-bold text-sm flex items-center justify-center gap-2`}
                data-action="drive-place-save"
              >
                {busy === "place" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salva paese e indirizzo
              </button>
            )}
          </section>

          <section className={box}>
            <h4 className="font-black text-sm text-slate-800 flex items-center gap-2">
              <Factory className="w-4 h-4" /> Gru dall'ultima verifica {rows ? `(${rows.length})` : ""}
            </h4>
            {rows === null ? (
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Carico…
              </p>
            ) : !rows.length ? (
              <p className="text-sm text-slate-500">Nessuna gru letta dal Drive per questo cliente.</p>
            ) : (
              <>
              {[...review.doubts.map((d) => ["doubt", d]), ...review.suggestions.map((d) => ["suggestion", d])].map(([k, d]) => (
                <CheckCard key={d.row.id + k} kind={k} item={d} onSaved={onRowSaved} color={color} />
              ))}
              <ul className="divide-y divide-slate-100 -mx-1">
                {rows.map((r) => (
                  <CraneRow key={r.id} row={r} machines={myMachines} color={color} onSaved={onRowSaved} />
                ))}
              </ul>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
