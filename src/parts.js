// Pezzi sostituiti sulle gru (fune, motori, freni...) e scheda tecnica della gru.
//
// Due fonti di dati:
//  1. "parts" salvati dal tecnico nel rapporto (sezione "Pezzi sostituiti")  -> affidabili
//  2. per gli interventi senza "parts", lettura automatica della descrizione  -> da verificare
import { escapeHtml, getSafeMatricola, formatCapacity } from "./utils";
import { REPORT_CSS } from "./reports";

export const PART_TYPES = [
  { id: "fune", label: "Fune" },
  { id: "motore_sollevamento", label: "Motore sollevamento" },
  { id: "motore_traslazione", label: "Motore traslazione" },
  { id: "motore_direzione", label: "Motore direzione / carrello" },
  { id: "motore", label: "Motore (altro)" },
  { id: "freno", label: "Freno" },
  { id: "riduttore", label: "Riduttore" },
  { id: "gancio", label: "Gancio" },
  { id: "finecorsa", label: "Finecorsa" },
  { id: "pulsantiera", label: "Pulsantiera" },
  { id: "altro", label: "Altro" },
];

export const partLabel = (type) =>
  (PART_TYPES.find((t) => t.id === type) || { label: type || "?" }).label;

export const emptyPart = () => ({ type: "", brand: "", serial: "", specs: "" });

// Toglie le righe vuote e gli spazi superflui (Firebase non accetta "undefined")
export const cleanParts = (parts) =>
  (Array.isArray(parts) ? parts : [])
    .map((p) => ({
      type: String((p && p.type) || "").trim(),
      brand: String((p && p.brand) || "").trim(),
      serial: String((p && p.serial) || "").trim(),
      specs: String((p && p.specs) || "").trim(),
    }))
    .filter((p) => p.type && (p.type !== "altro" || p.brand || p.serial || p.specs));

// ---------------------------------------------------------------------------
// LETTURA AUTOMATICA DELLE DESCRIZIONI
// ---------------------------------------------------------------------------

// parole che indicano che il pezzo è stato effettivamente cambiato
const REPLACED =
  /\b(sostituit[aoie]|sostituzione|sostituzioni|cambiat[aoie]|cambio|montat[aoie]|installat[aoie]|installazione|rimpiazzat[aoie])\b/i;
// frasi che parlano di lavori da fare, non fatti
const NOT_DONE =
  /\b(da\s+(sostituire|cambiare|montare|installare)|sostituire|cambiare|consiglia\w*|preventiv\w*|necessit\w*|occorre|bisogna|ordinat[aoie]|in\s+attesa|da\s+ordinare|da\s+fare)\b/i;

const MOTOR = /\bmotor[ei]\b|\bmotoridutt\w*/i;
const DETECTORS = [
  { type: "fune", re: /\bfun[ei]\b/i },
  { type: "freno", re: /\bfren[oi]\b|\bferod\w*|\bganasce\b/i },
  { type: "riduttore", re: /\bridutt\w*/i },
  { type: "gancio", re: /\bganc(io|i)\b/i },
  { type: "finecorsa", re: /\bfine\s?-?\s?cors[ae]\b/i },
  { type: "pulsantiera", re: /\bpulsantier[ae]\b/i },
];

const motorType = (sentence) => {
  if (/sollev|salita|discesa|argano/i.test(sentence)) return "motore_sollevamento";
  if (/traslaz|\bponte\b|scorriment/i.test(sentence)) return "motore_traslazione";
  if (/direz|carrell/i.test(sentence)) return "motore_direzione";
  return "motore";
};

const pick = (re, text) => {
  const m = text.match(re);
  return m ? m[1] : "";
};

// estrae matricola e dati tecnici da una frase
const readDetails = (sentence) => {
  const serial = pick(
    /(?:matr(?:icola)?\.?|mat\.|s\/n|\bsn\b|n\.?\s*serie|serial[e]?)\s*[:#°.]?\s*([A-Z0-9][A-Z0-9\-/.]*[A-Z0-9])/i,
    sentence
  );
  const specs = [];
  const diam =
    pick(/(?:ø|Ø|diam(?:etro)?\.?)\s*(\d+(?:[.,]\d+)?)/i, sentence) ||
    pick(/\b(\d+(?:[.,]\d+)?)\s*mm\b/i, sentence);
  if (diam) specs.push(`Ø ${diam} mm`);
  const len = pick(/\b(\d+(?:[.,]\d+)?)\s*(?:m|mt|mtl|metri)\b/i, sentence);
  if (len) specs.push(`${len} m`);
  const kw = pick(/\b(\d+(?:[.,]\d+)?)\s*kw\b/i, sentence);
  if (kw) specs.push(`${kw} kW`);
  return { serial, specs: specs.join(", ") };
};

// cambi d'olio, grasso, ecc.: non sono sostituzioni del pezzo
const OIL =
  /\b(cambio|cambiat[aoie]|sostituit[aoie]|sostituzione|rabbocc\w*)\s+(dell'|del\s+|dello\s+|di\s+)?(olio|grasso|lubrificante)\b|\b(olio|grasso|lubrificante)\s+(sostituit[aoie]|cambiat[aoie])\b/gi;

// Divide in frasi senza spezzare matricole tipo "AB.123"
// (niente "lookbehind" nelle regex: non funziona sugli iPhone con iOS < 16.4)
// abbreviazioni dopo cui il punto NON chiude la frase ("matr. 123")
const ABBREVIATIONS = ["matr", "mat", "n", "nr", "num", "diam", "rif", "art", "pos", "s/n", "sn", "mod", "tipo", "es", "ecc"];
const sentencesOf = (text) =>
  String(text || "")
    .replace(/([.;!?])\s+/g, (match, punct, offset, whole) => {
      const before = whole.slice(0, offset).match(/(\S+)$/);
      const word = before ? before[1].toLowerCase() : "";
      return punct === "." && ABBREVIATIONS.includes(word) ? match : punct + "\n";
    })
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

// Restituisce i pezzi che la descrizione dice sostituiti
export const extractPartsFromText = (description) => {
  const found = [];
  for (const sentence of sentencesOf(description)) {
    const test = sentence.replace(OIL, " ");
    if (!REPLACED.test(test) || NOT_DONE.test(test)) continue;
    const types = [];
    if (MOTOR.test(test)) types.push(motorType(test));
    for (const d of DETECTORS) if (d.re.test(test)) types.push(d.type);
    if (!types.length) continue;
    const details = readDetails(sentence);
    for (const type of types) {
      if (found.some((f) => f.type === type)) continue;
      // matricola e dati solo se la frase parla di un pezzo solo (altrimenti ambigui)
      found.push({
        type,
        brand: "",
        serial: types.length === 1 ? details.serial : "",
        specs: types.length === 1 ? details.specs : "",
        excerpt: sentence.length > 220 ? sentence.slice(0, 217) + "..." : sentence,
      });
    }
  }
  return found;
};

// ---------------------------------------------------------------------------
// SCHEDA TECNICA DELLA GRU
// ---------------------------------------------------------------------------

// Data dell'intervento come numero ordinabile (dateString "g/m/aaaa")
export const logSortKey = (log) => {
  const parts = String(log.dateString || "").split("/").map(Number);
  const dayKey =
    parts.length === 3 && parts.every((n) => !isNaN(n))
      ? parts[2] * 10000 + parts[1] * 100 + parts[0]
      : 0;
  const t = (log.createdAt && log.createdAt.seconds) || (log.timestamp && log.timestamp.seconds) || 0;
  return dayKey * 1e10 + t;
};

// Interventi della gru (stessa regola della scheda esistente: matricola + cliente)
export const logsOfMachine = (machine, allLogs) => {
  const mat = getSafeMatricola(machine).toLowerCase();
  const cust = String(machine.customerName || "").toUpperCase();
  return (allLogs || []).filter(
    (l) =>
      String(l.machineId || "").toLowerCase() === mat &&
      String(l.customer || "").toUpperCase() === cust
  );
};

// { current: [evento più recente per ogni tipo], history: [tutti, dal più recente] }
export const buildMachineSheet = (machineLogs) => {
  const events = [];
  for (const log of machineLogs) {
    const manual = cleanParts(log.parts);
    const list = manual.length
      ? manual.map((p) => ({ ...p, source: "manual" }))
      : extractPartsFromText(log.description).map((p) => ({ ...p, source: "auto" }));
    for (const p of list) {
      events.push({
        ...p,
        logId: log.id,
        dateString: log.dateString || "",
        technician: log.technician || "",
        additionalTechnicians: log.additionalTechnicians || [],
        ticketNumber: log.ticketNumber || "",
        sortKey: logSortKey(log),
      });
    }
  }
  events.sort((a, b) => b.sortKey - a.sortKey);
  const order = PART_TYPES.map((t) => t.id);
  const current = [];
  for (const e of events) if (!current.some((c) => c.type === e.type)) current.push(e);
  current.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  return { current, history: events };
};

// ---------------------------------------------------------------------------
// STAMPA DELLA SCHEDA
// ---------------------------------------------------------------------------
const SHEET_CSS = `
        .section-title { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #0f172a; margin: 25px 0 10px; letter-spacing: 1px; }
        .badge { display: inline-block; font-size: 9px; font-weight: bold; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
        .badge-manual { background: #dcfce7; color: #166534; }
        .badge-auto { background: #fef3c7; color: #92400e; }
        .excerpt { color: #64748b; font-style: italic; font-size: 10px; margin-top: 4px; }
        .note { font-size: 10px; color: #64748b; margin-top: 8px; }
`;

const partRow = (e, withDate = true) => `
                        <tr>
                            <td style="font-weight: bold; color: #0f172a;">${escapeHtml(partLabel(e.type))}</td>
                            <td>${escapeHtml(e.brand) || "-"}</td>
                            <td>${escapeHtml(e.serial) || "-"}</td>
                            <td>${escapeHtml(e.specs) || "-"}${
  e.source === "auto" && e.excerpt
    ? `<div class="excerpt">"${escapeHtml(e.excerpt)}"</div>`
    : ""
}</td>
                            ${
                              withDate
                                ? `<td>${escapeHtml(e.dateString)}${
                                    e.ticketNumber
                                      ? `<div style="color: #2563eb; font-size: 10px;">N. ${escapeHtml(e.ticketNumber)}</div>`
                                      : ""
                                  }<div style="color: #64748b; font-size: 10px;">${escapeHtml(e.technician)}</div></td>`
                                : ""
                            }
                            <td><span class="badge ${e.source === "manual" ? "badge-manual" : "badge-auto"}">${
  e.source === "manual" ? "Inserito" : "Da descrizione"
}</span></td>
                        </tr>`;

export const buildMachineSheetHtml = ({ appTitle, machine, sheet, logsCount, today }) => {
  const head = `
                    <tr>
                        <th style="width: 18%">Componente</th>
                        <th style="width: 14%">Marca / Modello</th>
                        <th style="width: 14%">Matricola</th>
                        <th>Dati tecnici</th>
                        <th style="width: 14%">Montato il</th>
                        <th style="width: 10%">Fonte</th>
                    </tr>`;
  return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Scheda Tecnica ${escapeHtml(getSafeMatricola(machine))}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${REPORT_CSS}${SHEET_CSS}</style>
        </head>
        <body>
            <div class="no-print">
                <button class="btn btn-close" onclick="window.close()">Chiudi</button>
                <button class="btn btn-print" onclick="window.print()">Stampa / Salva PDF</button>
            </div>
            <div class="header">
                <h1>${escapeHtml(appTitle || "Assistenza Tecnica")}</h1>
                <p>Scheda Tecnica Gru</p>
            </div>
            <div class="meta">
                <div>Cliente: ${escapeHtml(machine.customerName)}</div>
                <div>Matricola: ${escapeHtml(getSafeMatricola(machine))}</div>
                <div>${escapeHtml(machine.type || "")}${
    machine.capacity ? " - " + escapeHtml(formatCapacity(machine.capacity)) : ""
  }</div>
                <div>Generata il: ${escapeHtml(today)}</div>
            </div>
            <div class="section-title">Componenti montati (ultima sostituzione nota)</div>
            ${
              sheet.current.length
                ? `<table><thead>${head}</thead><tbody>${sheet.current
                    .map((e) => partRow(e))
                    .join("")}</tbody></table>`
                : `<p class="note">Nessuna sostituzione registrata o rilevata negli interventi (${logsCount}).</p>`
            }
            ${
              sheet.history.length > sheet.current.length
                ? `<div class="section-title">Storico sostituzioni</div>
            <table><thead>${head}</thead><tbody>${sheet.history
                    .map((e) => partRow(e))
                    .join("")}</tbody></table>`
                : ""
            }
            <p class="note">"Inserito" = dati compilati dal tecnico nel rapporto. "Da descrizione" = rilevato automaticamente dal testo dell'intervento: verificare.</p>
            <div class="footer">
                Documento generato automaticamente dal sistema di gestione.
            </div>
        </body>
        </html>
    `;
};
