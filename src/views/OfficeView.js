import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  Calendar as CalendarIcon,
  Printer,
  Activity,
  Trophy,
  PieChart,
  BarChart,
  Camera,
} from "lucide-react";
import {
  escapeHtml,
  csvCell,
  getTechsString,
  formatCapacity,
} from "../utils";
import { PRO_INPUT, getProPanelClass } from "../ui";
import { SimpleCalendar } from "../components/SimpleCalendar";

export const OfficeView = ({
  logs,
  machines,
  customers,
  layoutConfig,
  technicians,
  onOpenPhotos,
}) => {
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());

  const [viewMode, setViewMode] = useState("month");
  const [ticketSearch, setTicketSearch] = useState("");
  const [ticketSearchYear, setTicketSearchYear] = useState(
    today.getFullYear().toString()
  );

  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedTech, setSelectedTech] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [showMachineSuggestions, setShowMachineSuggestions] = useState(false);
  const [popoverData, setPopoverData] = useState(null);
  const color = layoutConfig?.themeColor || "blue";

  const availableYears = useMemo(() => {
    const years = new Set();
    logs.forEach((l) => {
      if (l.dateString) {
        const parts = l.dateString.split("/");
        if (parts.length === 3) years.add(parts[2]);
      }
    });
    // Assicuriamoci che l'anno corrente sia sempre presente
    years.add(today.getFullYear().toString());
    // Ordine decrescente
    return Array.from(years).sort((a, b) => b - a);
  }, [logs]);

  // Anni selezionabili nella Panoramica (include sempre l'anno mostrato dal calendario)
  const yearOptions = useMemo(() => {
    const years = new Set(availableYears);
    years.add(String(calYear));
    return Array.from(years).sort((a, b) => b - a);
  }, [availableYears, calYear]);

  const ticketSearchResults = useMemo(() => {
    if (!ticketSearch.trim()) return [];
    const term = ticketSearch.toLowerCase().trim();
    return logs.filter((l) => {
      const matchNumber =
        l.ticketNumber && l.ticketNumber.toLowerCase().includes(term);
      if (!matchNumber) return false;

      // Se è selezionato "tutti", non filtriamo per anno
      if (ticketSearchYear === "tutti") return true;

      // Controllo esatto sull'anno selezionato (formato DD/MM/YYYY)
      if (l.dateString) {
        const parts = l.dateString.split("/");
        if (parts.length === 3 && parts[2] === ticketSearchYear) {
          return true;
        }
      }
      return false;
    });
  }, [logs, ticketSearch, ticketSearchYear]);

  const monthNames = [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre",
  ];

  const dynamicMonthLabel =
    viewMode === "year"
      ? `(${calYear})`
      : `(${monthNames[calMonth]} ${calYear})`;

  const calendarFilteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (!log.dateString) return false;
      const [d, m, y] = log.dateString.split("/").map(Number);
      if (viewMode === "year") return y === calYear;
      return m - 1 === calMonth && y === calYear;
    });
  }, [logs, calMonth, calYear, viewMode]);

  const advancedStats = useMemo(() => {
    const techCounts = {};
    const machineTypeCounts = {};
    const customerCounts = {};

    calendarFilteredLogs.forEach((l) => {
      if (l.technician)
        techCounts[l.technician] = (techCounts[l.technician] || 0) + 1;
      if (l.additionalTechnicians) {
        l.additionalTechnicians.forEach((t) => {
          if (t.trim()) techCounts[t] = (techCounts[t] || 0) + 1;
        });
      }
      if (l.machineType)
        machineTypeCounts[l.machineType] =
          (machineTypeCounts[l.machineType] || 0) + 1;
      if (l.customer)
        customerCounts[l.customer] = (customerCounts[l.customer] || 0) + 1;
    });

    return {
      topTechs: Object.entries(techCounts).sort(([, a], [, b]) => b - a),
      topMachineTypes: Object.entries(machineTypeCounts).sort(
        ([, a], [, b]) => b - a
      ),
      topCustomers: Object.entries(customerCounts).sort(
        ([, a], [, b]) => b - a
      ),
    };
  }, [calendarFilteredLogs]);

  const stats = useMemo(() => {
    let yearCount = 0;
    logs.forEach((l) => {
      if (!l.dateString) return;
      const [d, m, y] = l.dateString.split("/").map(Number);
      if (y === calYear) yearCount++;
    });
    return {
      total: logs.length,
      year: yearCount,
      currentPeriod: calendarFilteredLogs.length,
    };
  }, [logs, calYear, calendarFilteredLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      let matches = true;
      if (startDate || endDate) {
        const [d, m, y] = log.dateString.split("/").map(Number);
        const logDate = new Date(y, m - 1, d);
        if (startDate && logDate < new Date(startDate)) matches = false;
        if (endDate && logDate > new Date(endDate)) matches = false;
      }
      if (
        matches &&
        selectedCustomer &&
        !log.customer.includes(selectedCustomer.toUpperCase())
      )
        matches = false;
      if (
        matches &&
        selectedMachine &&
        !log.machineId.includes(selectedMachine.toUpperCase())
      )
        matches = false;
      if (matches && selectedTech) {
        const techs = [log.technician, ...(log.additionalTechnicians || [])];
        if (!techs.includes(selectedTech)) matches = false;
      }
      return matches;
    });
  }, [
    logs,
    startDate,
    endDate,
    selectedCustomer,
    selectedMachine,
    selectedTech,
  ]);

  const generatePDF = () => {
    if (filteredLogs.length === 0) return alert("Nessun intervento trovato.");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Impossibile aprire il report. Verifica il blocco popup.");
      return;
    }

    const today = new Date().toLocaleDateString("it-IT");

    const css = `
        @page { size: A4; margin: 0 !important; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.5; margin: 0; padding: 20px; box-sizing: border-box; }
        .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
        .header h1 { margin: 0; color: #0f172a; text-transform: uppercase; font-size: 24px; letter-spacing: 1px; }
        .header p { margin: 5px 0 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #64748b; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
        .meta div { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
        th { background: #0f172a; color: white; text-transform: uppercase; font-weight: bold; padding: 12px 10px; text-align: left; }
        td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .footer { text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 40px; }
        
        .no-print { 
            position: sticky; top: 0; background: #f1f5f9; padding: 15px; text-align: right; 
            border-bottom: 1px solid #cbd5e1; margin: -20px -20px 20px -20px; 
            display: flex; justify-content: flex-end; gap: 10px;
        }
        .btn { padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; text-transform: uppercase; font-size: 12px; border: none; }
        .btn-print { background-color: #0f172a; color: white; }
        .btn-close { background-color: #e2e8f0; color: #475569; }

        @media print {
            .no-print { display: none !important; }
            body { padding: 15mm; margin: 0; }
        }
    `;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Report Interventi</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${css}</style>
        </head>
        <body>
            <div class="no-print">
                <button class="btn btn-close" onclick="window.close()">Chiudi</button>
                <button class="btn btn-print" onclick="window.print()">Stampa / Salva PDF</button>
            </div>
            <div class="header">
                <h1>${escapeHtml(
                  layoutConfig?.appTitle || "Assistenza Tecnica"
                )}</h1>
                <p>Report Interventi Tecnici</p>
            </div>
            <div class="meta">
                <div>Generato il: ${today}</div>
                <div>Totale Interventi: ${filteredLogs.length}</div>
                <div>Periodo: ${
                  startDate
                    ? new Date(startDate).toLocaleDateString()
                    : "Inizio"
                } - ${
      endDate ? new Date(endDate).toLocaleDateString() : "Oggi"
    }</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 15%">Data / Tecnico</th>
                        <th style="width: 25%">Cliente / Impianto</th>
                        <th style="width: 60%">Descrizione Lavoro</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredLogs
                      .map(
                        (l) => `
                        <tr>
                            <td>
                                <div style="font-weight: bold;">${escapeHtml(
                                  l.dateString
                                )}</div>
                                ${
                                  l.ticketNumber
                                    ? `<div style="color: #2563eb; font-size: 10px; margin-top: 2px;">N. Assistenza ${escapeHtml(
                                        l.ticketNumber
                                      )}</div>`
                                    : ""
                                }
                                <div style="color: #64748b; font-size: 11px; margin-top: 4px;">${escapeHtml(
                                  getTechsString(l)
                                )}</div>
                                ${
                                  l.photos && l.photos.length > 0
                                    ? `<div style="color: #059669; font-size: 10px; margin-top: 4px;">[Allegati: ${l.photos.length} Foto]</div>`
                                    : ""
                                }
                            </td>
                            <td>
                                <div style="font-weight: bold; color: #0f172a;">${escapeHtml(
                                  l.customer
                                )}</div>
                                <div style="color: #64748b; font-size: 11px; margin-top: 4px;">Mat: ${escapeHtml(
                                  l.machineId
                                )}</div>
                                <div style="color: #94a3b8; font-size: 10px;">
                                    ${escapeHtml(l.machineType)} ${
                          l.capacity
                            ? `- ${escapeHtml(formatCapacity(l.capacity))}`
                            : ""
                        }
                                </div>
                            </td>
                            <td style="color: #334155; line-height: 1.6;">
                                ${escapeHtml(l.description).replace(
                                  /\r?\n/g,
                                  "<br>"
                                )}
                            </td>
                        </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
            <div class="footer">
                Documento generato automaticamente dal sistema di gestione.
            </div>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDownloadExcel = () => {
    if (filteredLogs.length === 0) return alert("Nessun dato.");
    const headers = [
      "Data",
      "N. Assistenza",
      "Tecnico/i",
      "Cliente",
      "Matricola",
      "Descrizione",
    ];
    const rows = filteredLogs.map((l) => [
      l.dateString,
      l.ticketNumber || "",
      getTechsString(l),
      l.customer,
      l.machineId,
      l.description,
    ]);
    // Ogni cella tra virgolette: virgole, virgolette, "#" e a capo non rompono il file.
    // "﻿" fa leggere correttamente le lettere accentate a Excel.
    const csvContent =
      "﻿" +
      [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className={`p-6 ${getProPanelClass(color)} bg-white`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-3 bg-${color}-50 text-${color}-700 rounded-lg`}>
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                Panoramica
              </h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Statistiche
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
              <button
                onClick={() => setViewMode("month")}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                  viewMode === "month"
                    ? "bg-white shadow text-slate-800"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Mensile
              </button>
              <button
                onClick={() => setViewMode("year")}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${
                  viewMode === "year"
                    ? "bg-white shadow text-slate-800"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Annuale
              </button>
            </div>
            <select
              aria-label="Anno"
              value={String(calYear)}
              onChange={(e) => setCalYear(Number(e.target.value))}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer shadow-sm"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Globale
            </span>
            <div className="text-2xl font-black text-slate-800">
              {stats.total}
            </div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Anno {calYear}
            </span>
            <div className="text-2xl font-black text-blue-600">
              {stats.year}
            </div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {viewMode === "year" ? "Totale Periodo" : "Mese Sel."}
            </span>
            <div className="text-2xl font-black text-emerald-600">
              {stats.currentPeriod}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-5 ${getProPanelClass(color)}`}>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h4 className="text-xs font-black uppercase text-slate-600">
              Tecnici{" "}
              <span className="text-slate-400">{dynamicMonthLabel}</span>
            </h4>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {advancedStats.topTechs.length === 0 && (
              <p className="text-xs text-slate-400 italic">Nessun dato</p>
            )}
            {advancedStats.topTechs.map(([tech, count], i) => (
              <div
                key={tech}
                onClick={() => {
                  const techLogs = calendarFilteredLogs.filter(
                    (l) =>
                      l.technician === tech ||
                      (l.additionalTechnicians &&
                        l.additionalTechnicians.includes(tech))
                  );
                  setPopoverData({
                    date: `Interventi: ${tech}`,
                    logs: techLogs,
                  });
                }}
                className="flex justify-between text-xs items-center cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-slate-100"
              >
                <div className="flex gap-2 items-center">
                  <span
                    className={`font-bold w-5 h-5 flex items-center justify-center rounded-full text-[9px] shadow-sm ${
                      i === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-bold text-slate-700 hover:text-blue-600 transition-colors">
                    {tech}
                  </span>
                </div>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded shadow-sm">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className={`p-5 ${getProPanelClass(color)}`}>
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-purple-500" />
            <h4 className="text-xs font-black uppercase text-slate-600">
              Tipi <span className="text-slate-400">{dynamicMonthLabel}</span>
            </h4>
          </div>
          <div className="space-y-3">
            {advancedStats.topMachineTypes.slice(0, 5).map(([type, count]) => {
              const pct = Math.round((count / stats.currentPeriod) * 100) || 0;
              return (
                <div key={type}>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>{type}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full shadow-inner overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all duration-1000"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className={`p-5 ${getProPanelClass(color)}`}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart className="w-5 h-5 text-orange-500" />
            <h4 className="text-xs font-black uppercase text-slate-600">
              Clienti{" "}
              <span className="text-slate-400">{dynamicMonthLabel}</span>
            </h4>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {advancedStats.topCustomers.length === 0 && (
              <p className="text-xs text-slate-400 italic">Nessun dato</p>
            )}
            {advancedStats.topCustomers.map(([cust, count], i) => (
              <div
                key={cust}
                onClick={() => {
                  const custLogs = calendarFilteredLogs.filter(
                    (l) => l.customer === cust
                  );
                  setPopoverData({
                    date: `Interventi: ${cust}`,
                    logs: custLogs,
                  });
                }}
                className="flex justify-between text-xs items-center cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors border border-transparent hover:border-slate-100"
              >
                <div className="flex gap-2 items-center">
                  <span
                    className={`font-bold w-5 h-5 flex items-center justify-center rounded-full text-[9px] shadow-sm shrink-0 ${
                      i === 0
                        ? "bg-orange-100 text-orange-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-bold text-slate-700 hover:text-orange-600 transition-colors truncate max-w-[150px]">
                    {cust}
                  </span>
                </div>
                <span className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded shadow-sm">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-4">
        <div className="flex items-center gap-2 ml-1">
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
            Calendario Interventi
          </h4>
        </div>
        <SimpleCalendar
          logs={logs}
          month={calMonth}
          year={calYear}
          onMonthChange={(m, y) => {
            setCalMonth(m);
            setCalYear(y);
          }}
          onDayClick={(dayLogs, dateLabel) =>
            setPopoverData({ logs: dayLogs, date: dateLabel })
          }
        />
      </div>

      <div
        className={`p-6 ${getProPanelClass(color)} border-t-${color}-500 mt-6`}
      >
        <div className="flex items-center gap-3 mb-4">
          <Search className={`w-5 h-5 text-${color}-600`} />
          <h2 className="text-lg font-black text-slate-800 uppercase">
            Cerca N. Assistenza
          </h2>
        </div>
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Inserisci numero (es. 12345)..."
              className={PRO_INPUT}
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
            />
            <Search className="absolute right-3 top-3.5 text-slate-400 w-5 h-5" />
          </div>
          <select
            className={`${PRO_INPUT} !w-32 md:!w-40 shrink-0 font-bold`}
            value={ticketSearchYear}
            onChange={(e) => setTicketSearchYear(e.target.value)}
          >
            <option value="tutti">Tutti gli anni</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                Anno {y}
              </option>
            ))}
          </select>
        </div>
        {ticketSearch.trim() !== "" && (
          <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
            {ticketSearchResults.length === 0 ? (
              <div className="text-center p-4 bg-slate-50 rounded-xl text-slate-500 text-xs italic">
                Nessun intervento trovato con questo numero.
              </div>
            ) : (
              ticketSearchResults.map((log) => (
                <div
                  key={log.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col gap-1.5 items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg uppercase">
                          {log.dateString}
                        </span>
                        <span
                          className={`text-[10px] font-black text-${color}-700 bg-${color}-50 border border-${color}-200 px-2 py-1 rounded-lg uppercase`}
                        >
                          N. {log.ticketNumber}
                        </span>
                      </div>
                      {/* BOTTONE FOTO IN UFFICIO */}
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
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 uppercase">
                      {getTechsString(log)}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-800 text-sm uppercase mt-1">
                    {log.customer}
                  </h4>
                  <div className="flex flex-wrap gap-1 mt-1 mb-2">
                    <span
                      className={`text-[10px] font-bold text-${color}-600 bg-${color}-50 px-1.5 py-0.5 rounded uppercase`}
                    >
                      MAT: {log.machineId}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 border-l border-slate-300 pl-1 ml-1">
                      {log.machineType}
                    </span>
                    {log.capacity && (
                      <span className="text-[10px] font-bold text-slate-500 border-l border-slate-300 pl-1 ml-1">
                        {formatCapacity(log.capacity)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 italic whitespace-pre-wrap break-words bg-slate-50 p-3 rounded-lg border border-slate-100">
                    "{log.description}"
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div
        className={`p-6 ${getProPanelClass(color)} border-t-indigo-600 mt-6`}
      >
        <div className="flex items-center gap-3 mb-4">
          <Printer className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-black text-slate-800 uppercase">
            Esporta Report
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Filtra Cliente..."
              className={PRO_INPUT}
              value={selectedCustomer}
              onChange={(e) => {
                setSelectedCustomer(e.target.value);
                setShowCustomerSuggestions(true);
              }}
            />
            {showCustomerSuggestions && selectedCustomer && (
              <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {customers
                  .filter((c) =>
                    c.name.includes(selectedCustomer.toUpperCase())
                  )
                  .map((c) => (
                    <li
                      key={c.id}
                      onClick={() => {
                        setSelectedCustomer(c.name);
                        setShowCustomerSuggestions(false);
                      }}
                      className="p-3 hover:bg-slate-50 cursor-pointer font-bold text-xs uppercase text-slate-700 border-b border-slate-50"
                    >
                      {c.name}
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Filtra Gru..."
              className={PRO_INPUT}
              value={selectedMachine}
              onChange={(e) => {
                setSelectedMachine(e.target.value);
                setShowMachineSuggestions(true);
              }}
            />
            {showMachineSuggestions && selectedMachine && (
              <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {machines
                  .filter((m) =>
                    (m.matricola || m.id).includes(
                      selectedMachine.toUpperCase()
                    )
                  )
                  .map((m) => (
                    <li
                      key={m.id}
                      onClick={() => {
                        setSelectedMachine(m.matricola || m.id);
                        setShowMachineSuggestions(false);
                      }}
                      className="p-3 hover:bg-slate-50 cursor-pointer font-bold text-xs uppercase text-slate-700 border-b border-slate-50"
                    >
                      {m.matricola || m.id} -{" "}
                      <span className="text-[9px] text-slate-400 normal-case">
                        {m.customerName}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
          <select
            className={PRO_INPUT}
            value={selectedTech}
            onChange={(e) => setSelectedTech(e.target.value)}
          >
            <option value="">Tutti i Tecnici</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            className={PRO_INPUT}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className={PRO_INPUT}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="mt-4 flex gap-4">
          <button
            onClick={generatePDF}
            className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs text-white bg-slate-800 hover:bg-slate-900 shadow-md`}
          >
            PDF
          </button>
          <button
            onClick={handleDownloadExcel}
            className={`flex-1 py-3 rounded-xl font-bold uppercase text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-md`}
          >
            Excel
          </button>
        </div>
      </div>

      {popoverData && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in"
          onClick={() => setPopoverData(null)}
        >
          <div
            className={`p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95 ${getProPanelClass(
              color
            )}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 uppercase tracking-tight">
                {popoverData.date}
              </h3>
              <button onClick={() => setPopoverData(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-3 custom-scrollbar">
              {popoverData.logs.map((l, i) => (
                <div
                  key={i}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-100"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      {l.dateString} - {getTechsString(l)}
                    </span>
                    <span className="text-[10px] font-black text-blue-600">
                      {l.machineId}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {l.customer}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 italic whitespace-pre-wrap break-words mb-2">
                    "{l.description}"
                  </p>
                  {/* BOTTONE FOTO POPOVER */}
                  {l.photos && l.photos.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPhotos(l.photos);
                      }}
                      className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg uppercase flex items-center gap-1 w-fit hover:bg-emerald-100 transition-colors"
                    >
                      <Camera className="w-3 h-3" /> {l.photos.length} FOTO
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
