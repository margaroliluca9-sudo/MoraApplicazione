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
