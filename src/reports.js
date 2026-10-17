// Report stampabili (stesso aspetto in Ufficio, Storico e Scheda gru).
import { escapeHtml, getTechsString, formatCapacity } from "./utils";

export const REPORT_CSS = `
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

// Report elenco interventi (usato da Ufficio e Storico)
export const buildLogsReportHtml = ({
  appTitle,
  logs,
  periodLabel,
  today,
  subtitle = "Report Interventi Tecnici",
}) => {
  const css = REPORT_CSS;
  return `
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
                <h1>${escapeHtml(appTitle || "Assistenza Tecnica")}</h1>
                <p>${escapeHtml(subtitle)}</p>
            </div>
            <div class="meta">
                <div>Generato il: ${today}</div>
                <div>Totale Interventi: ${logs.length}</div>
                <div>Periodo: ${periodLabel}</div>
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
                    ${logs
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
};

// Apre una finestra con il report (l'utente poi stampa o salva in PDF)
export const openPrintWindow = (html) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Impossibile aprire il report. Verifica il blocco popup.");
    return false;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
};

// Solo immagini incorporate o https (niente altro dentro la pagina di stampa)
const safeImageSrc = (src) =>
  typeof src === "string" && (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src) || /^https:\/\//i.test(src))
    ? src
    : null;

// Rapporto di un singolo intervento (Storico): dati, descrizione, foto, firme
export const buildSingleLogReportHtml = ({ appTitle, log, today }) => {
  const photos = (log.photos || []).map(safeImageSrc).filter(Boolean);
  const row = (label, value) =>
    value
      ? `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
      : "";
  return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Rapporto Intervento ${escapeHtml(log.ticketNumber || log.dateString || "")}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${REPORT_CSS}
        .details th { width: 30%; background: #f1f5f9; color: #0f172a; }
        .details td, .details th { border-bottom: 1px solid #e2e8f0; }
        .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; color: #0f172a; margin: 25px 0 8px; letter-spacing: 1px; }
        .description { white-space: normal; font-size: 12px; line-height: 1.7; color: #334155; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; min-height: 80px; }
        .photos { display: flex; flex-wrap: wrap; gap: 10px; }
        .photos img { width: 31%; max-height: 220px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; }
        .signatures { display: flex; gap: 30px; margin-top: 40px; page-break-inside: avoid; }
        .signature { flex: 1; }
        .signature .label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 50px; }
        .signature .line { border-bottom: 1px solid #0f172a; }
            </style>
        </head>
        <body>
            <div class="no-print">
                <button class="btn btn-close" onclick="window.close()">Chiudi</button>
                <button class="btn btn-print" onclick="window.print()">Stampa / Salva PDF</button>
            </div>
            <div class="header">
                <h1>${escapeHtml(appTitle || "Assistenza Tecnica")}</h1>
                <p>Rapporto di Intervento</p>
            </div>
            <div class="meta">
                <div>Data: ${escapeHtml(log.dateString || "-")}</div>
                <div>N. Assistenza: ${escapeHtml(log.ticketNumber || "-")}</div>
                <div>Stampato il: ${escapeHtml(today)}</div>
            </div>
            <table class="details">
                <tbody>
                    ${row("Tecnico/i", getTechsString(log))}
                    ${row("Cliente", log.customer)}
                    ${row("Matricola gru", log.machineId)}
                    ${row("Tipo", log.machineType)}
                    ${row("Portata", log.capacity ? formatCapacity(log.capacity) : "")}
                </tbody>
            </table>
            <div class="section-title">Descrizione del lavoro</div>
            <div class="description">${escapeHtml(log.description).replace(/\r?\n/g, "<br>")}</div>
            ${
              photos.length
                ? `<div class="section-title">Foto allegate</div>
            <div class="photos">${photos
              .map((src) => `<img src="${escapeHtml(src)}" alt="Foto intervento">`)
              .join("")}</div>`
                : ""
            }
            <div class="signatures">
                <div class="signature"><div class="label">Firma tecnico</div><div class="line"></div></div>
                <div class="signature"><div class="label">Firma cliente</div><div class="line"></div></div>
            </div>
            <div class="footer">
                Documento generato automaticamente dal sistema di gestione.
            </div>
        </body>
        </html>
    `;
};

// Data "g/m/aaaa" -> numero ordinabile (0 se mancante)
const dateKey = (ds) => {
  const p = String(ds || "").split("/").map(Number);
  return p.length === 3 && p.every((n) => !isNaN(n)) ? p[2] * 10000 + p[1] * 100 + p[0] : 0;
};

// BACKUP DELL'ARCHIVIO in un unico documento da salvare in PDF
export const buildBackupHtml = ({
  appTitle,
  logs = [],
  customers = [],
  machines = [],
  technicians = [],
  machineTypes = [],
  generatedAt,
}) => {
  const byName = (a, b) => String(a).localeCompare(String(b), "it");
  const sortedLogs = [...logs].sort((a, b) => dateKey(b.dateString) - dateKey(a.dateString));
  const logsPerMachine = {};
  logs.forEach((l) => {
    const k = `${String(l.customer || "").toUpperCase()}|${String(l.machineId || "").toUpperCase()}`;
    logsPerMachine[k] = (logsPerMachine[k] || 0) + 1;
  });
  const machinesOf = {};
  machines.forEach((m) => {
    const c = String(m.customerName || "-");
    (machinesOf[c] = machinesOf[c] || []).push(m);
  });
  const customerNames = Array.from(
    new Set([...customers.map((c) => c.name), ...Object.keys(machinesOf)].filter(Boolean))
  ).sort(byName);
  const withPhotos = logs.filter((l) => l.photos && l.photos.length).length;
  const datedKeys = logs.map((l) => dateKey(l.dateString)).filter(Boolean);
  const fmtKey = (k) => (k ? `${k % 100}/${Math.floor(k / 100) % 100}/${Math.floor(k / 10000)}` : "-");

  const customerBlocks = customerNames
    .map((name) => {
      const ms = (machinesOf[name] || []).slice().sort((a, b) => byName(a.matricola || a.id, b.matricola || b.id));
      const rows = ms
        .map((m) => {
          const mat = m.matricola || (m.id && m.id.includes("_") ? m.id.slice(m.id.indexOf("_") + 1).toUpperCase() : m.id);
          const n = logsPerMachine[`${String(name).toUpperCase()}|${String(mat).toUpperCase()}`] || 0;
          return `<tr><td>${escapeHtml(mat)}</td><td>${escapeHtml(m.type || "-")}</td><td>${escapeHtml(
            m.capacity ? formatCapacity(m.capacity) : "-"
          )}</td><td style="text-align:right">${n}</td></tr>`;
        })
        .join("");
      return `<div class="cust"><div class="cust-name">${escapeHtml(name)}</div>${
        rows
          ? `<table class="mini"><thead><tr><th>Matricola</th><th>Tipo</th><th>Portata</th><th style="text-align:right">Interventi</th></tr></thead><tbody>${rows}</tbody></table>`
          : `<div class="empty">Nessuna gru registrata</div>`
      }</div>`;
    })
    .join("");

  const logRows = sortedLogs
    .map(
      (l) => `
                        <tr>
                            <td>
                                <div style="font-weight: bold;">${escapeHtml(l.dateString || "-")}</div>
                                ${l.ticketNumber ? `<div style="color: #2563eb; font-size: 10px; margin-top: 2px;">N. Assistenza ${escapeHtml(l.ticketNumber)}</div>` : ""}
                                <div style="color: #64748b; font-size: 11px; margin-top: 4px;">${escapeHtml(getTechsString(l))}</div>
                                ${l.photos && l.photos.length ? `<div style="color: #059669; font-size: 10px; margin-top: 4px;">[${l.photos.length} Foto]</div>` : ""}
                            </td>
                            <td>
                                <div style="font-weight: bold; color: #0f172a;">${escapeHtml(l.customer)}</div>
                                <div style="color: #64748b; font-size: 11px; margin-top: 4px;">Mat: ${escapeHtml(l.machineId)}</div>
                                <div style="color: #94a3b8; font-size: 10px;">${escapeHtml(l.machineType)} ${l.capacity ? `- ${escapeHtml(formatCapacity(l.capacity))}` : ""}</div>
                            </td>
                            <td style="color: #334155; line-height: 1.6;">${escapeHtml(l.description).replace(/\r?\n/g, "<br>")}</td>
                        </tr>`
    )
    .join("");

  return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Backup ${escapeHtml(appTitle || "Archivio")} ${escapeHtml(generatedAt)}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${REPORT_CSS}
        .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #0f172a; margin: 30px 0 10px; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .tile { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; text-align: center; }
        .tile b { display: block; font-size: 18px; color: #0f172a; }
        .tile span { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
        .chips { font-size: 12px; color: #334155; line-height: 1.8; }
        .cust { page-break-inside: avoid; margin-bottom: 14px; }
        .cust-name { font-weight: bold; font-size: 12px; color: #0f172a; margin-bottom: 4px; }
        table.mini { font-size: 10px; margin-bottom: 0; }
        table.mini th { background: #f1f5f9; color: #0f172a; padding: 6px 8px; }
        table.mini td { padding: 5px 8px; }
        .empty { font-size: 10px; color: #94a3b8; font-style: italic; }
        tr { page-break-inside: avoid; }
            </style>
        </head>
        <body>
            <div class="no-print">
                <button class="btn btn-close" onclick="window.close()">Chiudi</button>
                <button class="btn btn-print" onclick="window.print()">Stampa / Salva PDF</button>
            </div>
            <div class="header">
                <h1>${escapeHtml(appTitle || "Assistenza Tecnica")}</h1>
                <p>Backup completo dell'archivio</p>
            </div>
            <div class="meta">
                <div>Generato il: ${escapeHtml(generatedAt)}</div>
                <div>Periodo: ${fmtKey(datedKeys.length ? Math.min(...datedKeys) : 0)} - ${fmtKey(datedKeys.length ? Math.max(...datedKeys) : 0)}</div>
            </div>

            <div class="section-title">Riepilogo</div>
            <div class="grid">
                <div class="tile"><b>${logs.length}</b><span>Interventi</span></div>
                <div class="tile"><b>${customerNames.length}</b><span>Clienti</span></div>
                <div class="tile"><b>${machines.length}</b><span>Gru</span></div>
                <div class="tile"><b>${withPhotos}</b><span>Con foto</span></div>
            </div>

            <div class="section-title">Tecnici (${technicians.length})</div>
            <div class="chips">${technicians.map((t) => escapeHtml(t.name)).sort(byName).join(" · ") || "-"}</div>

            <div class="section-title">Tipi di gru (${machineTypes.length})</div>
            <div class="chips">${machineTypes.map((t) => escapeHtml(t.name)).sort(byName).join(" · ") || "-"}</div>

            <div class="section-title">Clienti e gru</div>
            ${customerBlocks || '<div class="empty">Nessun cliente</div>'}

            <div class="section-title">Interventi (${logs.length}, dal più recente)</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 15%">Data / Tecnico</th>
                        <th style="width: 25%">Cliente / Impianto</th>
                        <th style="width: 60%">Descrizione Lavoro</th>
                    </tr>
                </thead>
                <tbody>${logRows}</tbody>
            </table>
            <div class="footer">
                Backup generato automaticamente dal sistema di gestione. Le foto non sono incluse (è indicato solo il loro numero).
            </div>
        </body>
        </html>
    `;
};
