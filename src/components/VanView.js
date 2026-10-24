// MAGAZZINO DEL FURGONE: elenco articoli, scheda articolo, movimenti.
// Lo usano i tecnici con un furgone assegnato (dalla "La mia area") e l'admin (pagina Furgoni).
import React, { useEffect, useMemo, useState } from "react";
import { Search, Minus, Plus, AlertTriangle, Pencil } from "lucide-react";
import { query, where } from "firebase/firestore";
import { onSnapshot } from "../metered";
import { chatRef } from "../chat";
import {
  VAN,
  CATEGORIES,
  UNITS,
  itemsOf,
  isLow,
  num,
  fmtQty,
  moveItem,
  countItem,
  saveItem,
  removeItem,
  moveLabel,
} from "../van";
import { describeError } from "../utils";
import { PanelHeader, Sheet, Field, INPUT, PrimaryBtn, GhostBtn, Empty } from "./personal/PersonalUi";

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
const blankItem = { name: "", code: "", cat: "Elettrico", unit: "pz", qty: "", min: "", where: "", words: "" };
const whenOf = (ms) => {
  const d = new Date(ms || 0);
  const t = new Date();
  const hm = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (d.toDateString() === t.toDateString()) return "oggi " + hm;
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

// scheda di un articolo
const ItemDetail = ({ item, me, onBack, onClose, onEdit, color }) => {
  const [moves, setMoves] = useState([]);
  const [ask, setAsk] = useState(null); // "refill" | "count"
  const [val, setVal] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const unsub = onSnapshot(
      query(chatRef(VAN.moves), where("itemId", "==", item.id)),
      (s) => setMoves(s.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 40)),
      () => setMoves([])
    );
    return () => unsub();
  }, [item.id]);
  const run = async (fn) => {
    try {
      await fn();
      setError("");
    } catch (e) {
      setError("Non salvato: " + describeError(e));
    }
  };
  const low = isLow(item);
  const confirm = async () => {
    const n = num(val);
    if (ask === "refill" && n <= 0) return setError("Scrivi quanti ne hai caricati.");
    if (ask === "count" && (val === "" || n < 0)) return setError("Scrivi quanti ne hai contati.");
    await run(() => (ask === "refill" ? moveItem(item, n, { kind: "carico", author: me, note: "Rifornito" }) : countItem(item, n, me)));
    setAsk(null);
  };

  return (
    <div className="flex flex-col h-full" data-section="van-item">
      <PanelHeader title={item.name} sub={[item.code, item.cat].filter(Boolean).join(" · ")} onBack={onBack} onClose={onClose} color={color} />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        <section className="bg-white rounded-3xl border border-slate-200 p-4 flex items-center gap-3">
          <button type="button" aria-label="Uno in meno" onClick={() => run(() => moveItem(item, -1, { kind: "manuale", author: me }))} className="w-14 h-14 rounded-full border border-slate-300 flex items-center justify-center text-slate-700">
            <Minus className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center">
            <div className={`text-5xl font-black leading-none ${low || num(item.qty) < 0 ? "text-red-700" : "text-slate-800"}`} data-qty>
              {fmtQty(item.qty)}
            </div>
            <div className={`text-sm font-bold mt-1 ${low ? "text-red-700" : "text-slate-500"}`}>
              {item.unit || "pz"} a bordo{num(item.min) > 0 ? ` · minimo ${fmtQty(item.min)}` : ""}
            </div>
          </div>
          <button type="button" aria-label="Uno in più" onClick={() => run(() => moveItem(item, 1, { kind: "carico", author: me }))} className="w-14 h-14 rounded-full border border-slate-300 flex items-center justify-center text-slate-700">
            <Plus className="w-6 h-6" />
          </button>
        </section>
        {num(item.qty) < 0 && (
          <p className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            Sotto zero: ne sono stati scalati più di quelli segnati. Contali e premi «Conta».
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <PrimaryBtn color={color} data-action="refill" onClick={() => { setVal(""); setError(""); setAsk("refill"); }}>Rifornito</PrimaryBtn>
          <GhostBtn data-action="count" onClick={() => { setVal(String(Math.max(0, num(item.qty)))); setError(""); setAsk("count"); }}>Conta (inventario)</GhostBtn>
        </div>
        {error && !ask && <p className="text-sm font-bold text-red-600">{error}</p>}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 text-sm">
          {[
            ["Scorta minima", num(item.min) > 0 ? `${fmtQty(item.min)} ${item.unit || "pz"}` : "nessuna"],
            ["Dove sta", item.where || "—"],
            ["Lo riconosco se scrivi", [item.name, item.words].filter(Boolean).join(", ")],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between gap-4">
              <span className="text-slate-500 font-semibold shrink-0">{l}</span>
              <span className="font-bold text-slate-800 text-right break-words min-w-0">{v}</span>
            </div>
          ))}
          <button type="button" onClick={onEdit} data-action="edit-item" className={`flex items-center gap-1.5 font-bold text-${color}-700 pt-1 min-h-[36px]`}>
            <Pencil className="w-4 h-4" /> Modifica articolo
          </button>
        </section>
        <h4 className="font-black text-slate-800 text-sm px-1">Movimenti</h4>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-section="moves">
          {!moves.length && <p className="text-sm text-slate-500 p-4">Ancora nessun movimento.</p>}
          {moves.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0">
              <span className={`w-14 h-8 rounded-lg font-black text-sm flex items-center justify-center shrink-0 ${m.delta < 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                {m.kind === "inventario" ? "=" + fmtQty(m.counted) : (m.delta > 0 ? "+" : "−") + fmtQty(Math.abs(m.delta))}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-slate-800 break-words">{moveLabel(m)}</span>
                <span className="block text-xs text-slate-500 font-semibold">{whenOf(m.at)}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
      {ask && (
        <Sheet
          title={ask === "refill" ? "Quanti ne hai caricati?" : "Quanti ne hai contati?"}
          section="qty-form"
          onClose={() => setAsk(null)}
          footer={<PrimaryBtn color={color} onClick={confirm}>{ask === "refill" ? "Aggiungi" : "Salva conteggio"}</PrimaryBtn>}
        >
          <Field label={`${item.name} (${item.unit || "pz"})`}>
            <input type="number" inputMode="decimal" min="0" className={INPUT} value={val} aria-label="Quantità" autoFocus onChange={(e) => setVal(e.target.value)} />
          </Field>
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
        </Sheet>
      )}
    </div>
  );
};

export const VanView = ({ van, items, me, onBack, onClose, color = "blue", subtitle }) => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tutti");
  const [openId, setOpenId] = useState(null);
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState("");
  const mine = useMemo(() => itemsOf(items, van.id), [items, van.id]);
  const low = mine.filter(isLow);
  const cats = ["Tutti", ...CATEGORIES.filter((c) => mine.some((i) => (i.cat || "Altro") === c)), ...(low.length ? ["Da riordinare"] : [])];
  const shown = mine.filter((i) => {
    if (cat === "Da riordinare" && !isLow(i)) return false;
    if (cat !== "Tutti" && cat !== "Da riordinare" && (i.cat || "Altro") !== cat) return false;
    const t = norm(q).trim();
    return !t || norm(`${i.name} ${i.code} ${i.words} ${i.where}`).includes(t);
  });
  const open = mine.find((i) => i.id === openId);

  const save = async () => {
    if (!edit.name.trim()) return setError("Scrivi il nome del pezzo.");
    const dup = mine.find((i) => i.id !== edit.id && norm(i.name).trim() === norm(edit.name).trim());
    if (dup) return setError("C'è già un articolo con questo nome.");
    try {
      await saveItem(van.id, edit, me);
      setEdit(null);
      setError("");
    } catch (e) {
      setError("Non salvato: " + describeError(e));
    }
  };
  const del = async () => {
    try {
      await removeItem(edit);
      setEdit(null);
      setOpenId(null);
    } catch (e) {
      setError("Non eliminato: " + describeError(e));
    }
  };

  const editSheet = edit && (
    <Sheet
      title={edit.id ? "Modifica articolo" : "Nuovo articolo"}
      section="item-form"
      onClose={() => setEdit(null)}
      footer={
        <>
          {edit.id && (<GhostBtn danger onClick={del}>Elimina</GhostBtn>)}
          <PrimaryBtn color={color} onClick={save}>Salva</PrimaryBtn>
        </>
      }
    >
      <Field label="Nome del pezzo">
        <input className={INPUT} value={edit.name} aria-label="Nome del pezzo" placeholder="Es. Fusibili 10A" onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Codice (facolt.)">
          <input className={INPUT} value={edit.code} aria-label="Codice" onChange={(e) => setEdit({ ...edit, code: e.target.value })} />
        </Field>
        <Field label="Categoria">
          <select className={INPUT} value={edit.cat} aria-label="Categoria" onChange={(e) => setEdit({ ...edit, cat: e.target.value })}>
            {CATEGORIES.map((c) => (<option key={c}>{c}</option>))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {!edit.id && (
          <Field label="A bordo">
            <input type="number" inputMode="decimal" min="0" className={INPUT} value={edit.qty} aria-label="Quantità a bordo" onChange={(e) => setEdit({ ...edit, qty: e.target.value })} />
          </Field>
        )}
        <Field label="Unità">
          <select className={INPUT} value={edit.unit} aria-label="Unità" onChange={(e) => setEdit({ ...edit, unit: e.target.value })}>
            {UNITS.map((u) => (<option key={u}>{u}</option>))}
          </select>
        </Field>
        <Field label="Minimo">
          <input type="number" inputMode="decimal" min="0" className={INPUT} value={edit.min} aria-label="Scorta minima" onChange={(e) => setEdit({ ...edit, min: e.target.value })} />
        </Field>
      </div>
      <Field label="Dove sta (facolt.)">
        <input className={INPUT} value={edit.where} aria-label="Dove sta" placeholder="Es. Cassetto 3" onChange={(e) => setEdit({ ...edit, where: e.target.value })} />
      </Field>
      <Field
        label="Altri modi in cui lo scrivete (facolt.)"
        hint="Separati da virgola. Es. «teleruttore, contattore». Servono per scalarlo da solo quando salvi il rapporto."
      >
        <input className={INPUT} value={edit.words} aria-label="Altri nomi" onChange={(e) => setEdit({ ...edit, words: e.target.value })} />
      </Field>
      {error && <p className="text-sm font-bold text-red-600">{error}</p>}
    </Sheet>
  );

  if (open)
    return (
      <>
        <ItemDetail
          item={open}
          me={me}
          color={color}
          onBack={() => setOpenId(null)}
          onClose={onClose}
          onEdit={() => { setError(""); setEdit({ ...blankItem, ...open, min: num(open.min) ? String(open.min) : "" }); }}
        />
        {editSheet}
      </>
    );

  return (
    <div className="flex flex-col h-full" data-section="van">
      <PanelHeader
        title={van.name}
        sub={subtitle || `${mine.length} articoli a bordo`}
        onBack={onBack}
        onClose={onClose}
        color={color}
        action={{ label: "Articolo", id: "new-item", onClick: () => { setError(""); setEdit({ ...blankItem }); } }}
      />
      <div className="px-4 pt-3 pb-2 bg-white border-b border-slate-200 space-y-2 shrink-0">
        <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-11">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca pezzo o codice" aria-label="Cerca pezzo o codice" className="flex-1 bg-transparent outline-none text-base text-slate-800" />
        </label>
        {cats.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {cats.map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={`px-3 h-9 rounded-full text-sm font-bold whitespace-nowrap ${cat === c ? "bg-slate-800 text-white" : c === "Da riordinare" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {low.length > 0 && cat !== "Da riordinare" && (
          <button type="button" onClick={() => setCat("Da riordinare")} className="w-full flex items-center gap-2 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-left" data-low>
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span className="flex-1 font-bold text-red-800 text-sm">
              {low.length === 1 ? "1 articolo sotto la scorta minima" : `${low.length} articoli sotto la scorta minima`}
            </span>
            <span className="text-sm font-black text-red-700">Vedi</span>
          </button>
        )}
        {!mine.length && (
          <Empty>
            Il furgone è vuoto. Tocca «Articolo» per inserire i pezzi che hai a bordo: nome, quantità e scorta minima.
          </Empty>
        )}
        {mine.length > 0 && !shown.length && <Empty>Nessun pezzo trovato.</Empty>}
        {shown.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {shown.map((i) => {
              const l = isLow(i) || num(i.qty) < 0;
              return (
                <button key={i.id} type="button" data-item={i.id} onClick={() => setOpenId(i.id)} className="w-full text-left flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-slate-800 truncate">{i.name}</span>
                    <span className="block text-xs text-slate-500 font-semibold truncate">{[i.code, i.cat, i.where].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className={`block text-lg font-black ${l ? "text-red-700" : "text-slate-800"}`}>
                      {fmtQty(i.qty)} {i.unit || "pz"}
                    </span>
                    {num(i.min) > 0 && <span className={`block text-xs font-bold ${l ? "text-red-700" : "text-slate-500"}`}>min {fmtQty(i.min)}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {editSheet}
    </div>
  );
};
