// ADMIN · Furgoni e permessi: crea i furgoni, decide chi li usa, vede tutti i magazzini.
// Un tecnico senza furgone ("Nessuno") non vede il magazzino e il suo rapporto resta come prima.
import React, { useState } from "react";
import { Truck, Plus, Printer, Info } from "lucide-react";
import { key } from "../chat";
import { itemsOf, lowItems, saveVan, removeVan, assignTech, fmtQty, toOrder } from "../van";
import { buildVanOrderPdf, pdfFileName } from "../pdf";
import { openPdf } from "../components/PdfHost";
import { describeError } from "../utils";
import { getProPanelClass } from "../ui";
import { VanView } from "../components/VanView";
import { Sheet, Field, INPUT, PrimaryBtn, GhostBtn } from "../components/personal/PersonalUi";

const nameOf = (k, technicians) => {
  const t = (technicians || []).find((x) => key(x.name) === k);
  return t ? t.name : k.charAt(0).toUpperCase() + k.slice(1);
};

export const VanAdmin = ({ vans = [], vanItems = [], technicians = [], color = "blue", me = "" }) => {
  const [edit, setEdit] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [openVan, setOpenVan] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const sortedVans = [...vans].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const techs = [...technicians].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  const vanOfTech = (name) => vans.find((v) => (v.users || []).includes(key(name)));
  const usersOf = (v) => (v.users || []).map((u) => nameOf(u, technicians)).join(", ");
  const groups = sortedVans.map((v) => ({
    name: v.name,
    users: usersOf(v),
    rows: lowItems(itemsOf(vanItems, v.id)).map((i) => ({
      name: i.name,
      code: i.code,
      qty: `${fmtQty(i.qty)} ${i.unit || "pz"}`,
      min: `${fmtQty(i.min)} ${i.unit || "pz"}`,
      order: `${fmtQty(toOrder(i))} ${i.unit || "pz"}`,
    })),
  }));
  const totalLow = groups.reduce((n, g) => n + g.rows.length, 0);

  const run = async (id, fn) => {
    setBusy(id);
    try {
      await fn();
      setError("");
      return true;
    } catch (e) {
      setError("Non salvato: " + describeError(e));
      return false;
    } finally {
      setBusy("");
    }
  };
  const save = async () => {
    if (!edit.name.trim()) return setError("Scrivi il nome del furgone.");
    if (await run("van", () => saveVan(edit))) setEdit(null);
  };
  const del = async () => {
    if (await run("van", () => removeVan(edit, vanItems))) {
      setEdit(null);
      setConfirmDel(false);
    }
  };
  const live = openVan && vans.find((v) => v.id === openVan);
  const today = new Date().toLocaleDateString("it-IT");

  return (
    <div className="space-y-6" data-section="van-admin">
      <div className={`p-5 space-y-4 ${getProPanelClass(color)}`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-black text-slate-800 uppercase flex items-center gap-2">
            <Truck className={`w-5 h-5 text-${color}-600`} /> Furgoni della ditta
          </h3>
          <button
            type="button"
            data-action="new-van"
            onClick={() => { setError(""); setEdit({ name: "", plate: "", users: [] }); }}
            className={`h-10 px-3.5 rounded-full bg-${color}-600 text-white font-bold text-sm flex items-center gap-1.5 whitespace-nowrap shrink-0`}
          >
            <Plus className="w-4 h-4" /> Nuovo furgone
          </button>
        </div>
        {!vans.length && (
          <p className="text-sm text-slate-500">
            Nessun furgone. Creane uno (es. «Furgone di Luca») e poi scegli qui sotto chi lo usa.
          </p>
        )}
        <div className="space-y-2">
          {sortedVans.map((v) => {
            const list = itemsOf(vanItems, v.id);
            const low = lowItems(list).length;
            return (
              <div key={v.id} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50" data-van={v.id}>
                <button type="button" onClick={() => setOpenVan(v.id)} className="flex-1 min-w-0 text-left flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-black text-slate-800 break-words">{v.name}</span>
                    <span className="block text-xs text-slate-500 font-semibold break-words">
                      {[v.plate, usersOf(v) ? "usato da " + usersOf(v) : "nessun tecnico", `${list.length} articoli`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
                <span className={`min-w-[28px] h-7 px-2 rounded-full text-xs font-black flex items-center justify-center shrink-0 ${low ? "bg-red-600 text-white" : "bg-emerald-50 text-emerald-700"}`}>
                  {low ? low : "ok"}
                </span>
                <button type="button" onClick={() => { setError(""); setConfirmDel(false); setEdit({ ...v }); }} className={`text-sm font-bold text-${color}-700 px-1 min-h-[40px]`}>
                  Modifica
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`p-5 space-y-3 ${getProPanelClass(color)}`} data-section="van-permissions">
        <h3 className="font-black text-slate-800 uppercase">Chi usa quale furgone</h3>
        <p className="text-sm text-slate-600 flex gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          Chi ha un furgone vede il Magazzino e, quando salva il rapporto, i pezzi montati vengono tolti in automatico. Chi ha «Nessuno» non vede niente di nuovo.
        </p>
        {error && !edit && <p className="text-sm font-bold text-red-600">{error}</p>}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
          {techs.map((t) => {
            const v = vanOfTech(t.name);
            return (
              <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 bg-white" data-tech={t.name}>
                <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-black flex items-center justify-center shrink-0">
                  {String(t.name).charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 font-bold text-slate-800 truncate">{t.name}</span>
                <select
                  aria-label={"Furgone di " + t.name}
                  value={v ? v.id : ""}
                  disabled={busy === t.name || !vans.length}
                  onChange={(e) => run(t.name, () => assignTech(vans, t.name, e.target.value || null))}
                  className={`h-10 max-w-[190px] rounded-xl px-2 text-sm font-bold border ${v ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-300 bg-white text-slate-500"}`}
                >
                  <option value="">Nessuno</option>
                  {sortedVans.map((x) => (<option key={x.id} value={x.id}>{x.name}</option>))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`p-5 space-y-3 ${getProPanelClass(color)}`} data-section="van-order">
        <h3 className="font-black text-slate-800 uppercase">Da riordinare (tutti i furgoni)</h3>
        {!totalLow && <p className="text-sm text-slate-500">Nessun pezzo sotto la scorta minima.</p>}
        {groups.filter((g) => g.rows.length).map((g) => (
          <div key={g.name} className="space-y-1">
            <p className="text-xs font-black text-slate-500 uppercase">{g.name}</p>
            {g.rows.map((r) => (
              <div key={r.name} className="flex justify-between gap-3 text-sm border-b border-slate-100 py-1.5">
                <span className="font-bold text-slate-800 min-w-0 break-words">{r.name}</span>
                <span className="font-black text-slate-800 shrink-0">{r.order}</span>
              </div>
            ))}
          </div>
        ))}
        <button
          type="button"
          data-action="order-pdf"
          disabled={!vans.length}
          onClick={() => openPdf(() => buildVanOrderPdf({ groups, today }), pdfFileName("Lista ordine furgoni", today.replace(/\//g, "-")))}
          className={`w-full h-12 rounded-xl bg-${color}-600 text-white font-black text-sm uppercase flex items-center justify-center gap-2 disabled:opacity-50`}
        >
          <Printer className="w-4 h-4" /> Lista d'ordine (PDF)
        </button>
      </div>

      {edit && (
        <Sheet
          title={edit.id ? "Modifica furgone" : "Nuovo furgone"}
          section="van-form"
          onClose={() => setEdit(null)}
          footer={
            confirmDel ? (
              <>
                <GhostBtn onClick={() => setConfirmDel(false)}>Annulla</GhostBtn>
                <PrimaryBtn color="red" disabled={busy === "van"} onClick={del}>Elimina furgone e articoli</PrimaryBtn>
              </>
            ) : (
              <>
                {edit.id && (<GhostBtn danger onClick={() => setConfirmDel(true)}>Elimina</GhostBtn>)}
                <PrimaryBtn color={color} disabled={busy === "van"} onClick={save}>Salva</PrimaryBtn>
              </>
            )
          }
        >
          <Field label="Nome">
            <input className={INPUT} value={edit.name} aria-label="Nome del furgone" placeholder="Es. Furgone di Luca" onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          </Field>
          <Field label="Targa (facoltativa)">
            <input className={INPUT} value={edit.plate} aria-label="Targa" onChange={(e) => setEdit({ ...edit, plate: e.target.value })} />
          </Field>
          {confirmDel && (
            <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              Elimino il furgone e tutti i suoi {itemsOf(vanItems, edit.id).length} articoli. I rapporti non vengono toccati.
            </p>
          )}
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        </Sheet>
      )}

      {live && (
        <div className="fixed inset-0 bg-slate-900/50 z-[150] flex items-stretch md:items-center justify-center md:p-4 backdrop-blur-md">
          <div className="w-full md:max-w-xl h-full md:h-[90vh] flex flex-col md:rounded-3xl overflow-hidden bg-white shadow-2xl">
            <VanView
              van={live}
              items={vanItems}
              me={me || "Admin"}
              color={color}
              subtitle={usersOf(live) ? "Usato da " + usersOf(live) : "Nessun tecnico assegnato"}
              onBack={() => setOpenVan(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
