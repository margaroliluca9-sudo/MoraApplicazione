// LA MIA AREA · Stampa interventi: scegli i rapporti (tuoi e dei colleghi) e stampali insieme.
import React, { useMemo, useState } from "react";
import { Search, Printer, List, Check } from "lucide-react";
import { buildInterventionsPdf, buildLogsReportPdf, pdfFileName } from "../../pdf";
import { openPdf } from "../PdfHost";
import { getTechsString } from "../../utils";
import { isoFromLogDate, isoOf, todayIso, relDay, isMine } from "../../personal";
import { key } from "../../chat";
import { PanelHeader, Empty } from "./PersonalUi";

const shift = (iso, days) => {
  const p = iso.split("-").map(Number);
  return isoOf(new Date(p[0], p[1] - 1, p[2] + days));
};
const itDate = (iso) => {
  const p = String(iso || "").split("-");
  return p.length === 3 ? `${Number(p[2])}/${Number(p[1])}/${p[0]}` : "";
};
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const PrintPanel = ({ me, logs = [], technicians = [], onBack, onClose, color = "blue" }) => {
  const today = todayIso();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [who, setWho] = useState("all"); // "all" | "me" | nome tecnico
  const [q, setQ] = useState("");
  const [sel, setSel] = useState([]);

  const quick = [
    ["Oggi", today, today],
    ["Ieri", shift(today, -1), shift(today, -1)],
    ["Ultimi 7 giorni", shift(today, -6), today],
  ];
  const list = useMemo(() => {
    const t = norm(q.trim());
    return logs
      .filter((l) => {
        const iso = isoFromLogDate(l.dateString);
        if (!iso || iso < from || iso > to) return false;
        if (who === "me" && !isMine(l, me)) return false;
        if (who !== "all" && who !== "me" && !isMine(l, who)) return false;
        return !t || norm(`${l.customer} ${l.machineId} ${l.ticketNumber || ""} ${l.description} ${getTechsString(l)}`).includes(t);
      })
      .sort((a, b) => isoFromLogDate(b.dateString).localeCompare(isoFromLogDate(a.dateString)) || (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [logs, from, to, who, q, me]);
  const chosen = list.filter((l) => sel.includes(l.id));
  const allOn = list.length > 0 && list.every((l) => sel.includes(l.id));
  const toggle = (id) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSel(allOn ? sel.filter((id) => !list.some((l) => l.id === id)) : [...new Set([...sel, ...list.map((l) => l.id)])]);
  const period = from === to ? itDate(from) : `${itDate(from)} - ${itDate(to)}`;
  const printed = new Date().toLocaleDateString("it-IT");
  const printReports = () =>
    openPdf(() => buildInterventionsPdf({ logs: chosen }), pdfFileName("Rapporti", period.replace(/\//g, "-").replace(/ /g, "")));
  const printTable = () =>
    openPdf(
      () => buildLogsReportPdf({ logs: chosen, periodLabel: period, today: printed, subtitle: "Interventi scelti" }),
      pdfFileName("Elenco interventi", period.replace(/\//g, "-").replace(/ /g, ""))
    );
  const others = [...technicians].map((t) => t.name).filter((n) => key(n) !== key(me)).sort((a, b) => a.localeCompare(b));

  // raggruppati per giorno
  const days = [];
  list.forEach((l) => {
    const iso = isoFromLogDate(l.dateString);
    const d = days.find((x) => x.iso === iso);
    if (d) d.items.push(l);
    else days.push({ iso, items: [l] });
  });

  return (
    <div className="flex flex-col h-full" data-section="area-print">
      <PanelHeader title="Stampa interventi" sub="Tuoi e dei colleghi" onBack={onBack} onClose={onClose} color={color} />
      <div className="px-4 pt-3 pb-3 bg-white border-b border-slate-200 space-y-2.5 shrink-0">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {quick.map(([label, f, t]) => (
            <button key={label} type="button" data-quick={label} onClick={() => { setFrom(f); setTo(t); }}
              className={`px-3 h-9 rounded-full text-sm font-bold whitespace-nowrap ${from === f && to === t ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-black text-slate-500 uppercase">
            Dal
            <input type="date" value={from} aria-label="Dal" onChange={(e) => setFrom(e.target.value || today)} className="mt-1 w-full h-10 px-2 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-800 normal-case" />
          </label>
          <label className="text-xs font-black text-slate-500 uppercase">
            Al
            <input type="date" value={to} aria-label="Al" onChange={(e) => setTo(e.target.value || today)} className="mt-1 w-full h-10 px-2 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-800 normal-case" />
          </label>
        </div>
        <div className="flex gap-2">
          <select value={who} aria-label="Tecnico" onChange={(e) => setWho(e.target.value)} className="h-10 px-2 rounded-xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-800 max-w-[48%]">
            <option value="all">Tutti i tecnici</option>
            <option value="me">Solo i miei</option>
            {others.map((n) => (<option key={n} value={n}>{n}</option>))}
          </select>
          <label className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-xl px-2 h-10 min-w-0">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, gru, N." aria-label="Cerca" className="flex-1 min-w-0 bg-transparent outline-none text-sm text-slate-800" />
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {!list.length && <Empty>Nessun intervento in questo periodo. Cambia le date o il tecnico.</Empty>}
        {list.length > 0 && (
          <button type="button" data-action="select-all" onClick={toggleAll} className={`text-sm font-bold text-${color}-700 min-h-[36px]`}>
            {allOn ? "Togli tutti" : `Seleziona tutti (${list.length})`}
          </button>
        )}
        {days.map((d) => (
          <div key={d.iso} className="space-y-2">
            <p className="text-xs font-black text-slate-500 uppercase tracking-wide px-1">
              {relDay(d.iso)} · {itDate(d.iso)}
            </p>
            {d.items.map((l) => {
              const on = sel.includes(l.id);
              const mine = isMine(l, me);
              return (
                <button key={l.id} type="button" data-pick={l.id} aria-pressed={on} onClick={() => toggle(l.id)}
                  className={`w-full text-left rounded-2xl border-2 p-3 flex gap-3 items-start bg-white ${on ? `border-${color}-500` : "border-slate-200"}`}>
                  <span className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${on ? `bg-${color}-600 border-${color}-600 text-white` : "border-slate-300"}`}>
                    {on && <Check className="w-4 h-4" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex flex-wrap items-center gap-x-2 text-xs font-bold">
                      <span className={mine ? `text-${color}-700` : "text-slate-500"}>{getTechsString(l)}{mine ? " (tu)" : ""}</span>
                      {l.ticketNumber && <span className="text-slate-500">N. {l.ticketNumber}</span>}
                    </span>
                    <span className="block font-black text-slate-800 truncate">{l.customer} · {l.machineId}</span>
                    <span className="block text-sm text-slate-500 truncate">{l.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="p-3 bg-white border-t border-slate-200 space-y-2 shrink-0" data-section="print-bar">
        <p className="text-xs font-bold text-slate-500 text-center">
          {chosen.length === 0 ? "Tocca gli interventi da stampare" : chosen.length === 1 ? "1 intervento scelto" : `${chosen.length} interventi scelti`}
        </p>
        <div className="flex gap-2">
          <button type="button" data-action="print-table" disabled={!chosen.length} onClick={printTable}
            className="h-12 px-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm flex items-center gap-1.5 disabled:opacity-40">
            <List className="w-4 h-4" /> Elenco
          </button>
          <button type="button" data-action="print-reports" disabled={!chosen.length} onClick={printReports}
            className={`flex-1 h-12 rounded-xl bg-${color}-600 text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40`}>
            <Printer className="w-5 h-5" /> Stampa rapporti{chosen.length ? ` (${chosen.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
};
