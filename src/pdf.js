// STAMPE IN PDF: l'app crea un vero file PDF (niente finestre o stampa del browser,
// che sul telefono spesso non funzionano). Il file si condivide, si stampa o si salva.
//  - buildInterventionPdf: rapporto del singolo intervento (dati, descrizione, foto)
//  - buildCustomerMachinesPdf / buildLogsReportPdf / buildBackupPdf: elenchi
// Tutti con l'intestazione Mora (logo, indirizzo, telefoni).
// La libreria pdf-lib viene caricata solo al momento della stampa.
import { getTechsString, formatCapacity, getSafeMatricola } from "./utils";
import { isRepair, officeCharts } from "./repairs";
import { formatRopeLong } from "./ropes";
import { fmtMin, fmtDelta, deltaOf, kindOf, shortDay, rangeSummary, periodLabel, isFreeDay } from "./hours";
import { COMPANY_DEFAULT, companyInfo } from "./company";

// intestazione: dati modificabili dall'admin (company.js)
export const COMPANY = COMPANY_DEFAULT;

const W = 595.28; // A4 in punti
const H = 841.89;

let libPromise = null;
const loadLib = () => {
  if (!libPromise)
    libPromise = import("pdf-lib").catch((e) => {
      libPromise = null;
      throw e;
    });
  return libPromise;
};

// colori (r, g, b 0-255)
const C = {
  ink: [15, 23, 42],
  text: [51, 65, 85],
  grey: [100, 116, 139],
  light: [148, 163, 184],
  line: [226, 232, 240],
  zebra: [248, 250, 252],
  fill: [23, 37, 84], // scritte "a penna" sul modulo
  blue: [37, 99, 235],
  green: [5, 150, 105],
  amber: [146, 64, 14],
  black: [0, 0, 0],
};

const createDoc = async (title) => {
  const lib = await loadLib();
  const { PDFDocument, StandardFonts, rgb } = lib;
  const doc = await PDFDocument.create();
  doc.setTitle(title || "Documento");
  doc.setCreator("Assistenza Mora");
  doc.setProducer("Assistenza Mora");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  // il logo (pesante) si carica solo quando serve un PDF, non all'apertura dell'app
  const { MORA_LOGO_PNG, MORA_LOGO_RATIO } = await import("./pdfLogo");
  const logo = await doc.embedPng(MORA_LOGO_PNG);
  const col = (c) => rgb(c[0] / 255, c[1] / 255, c[2] / 255);
  return { lib, doc, font, bold, logo, col, logoRatio: MORA_LOGO_RATIO };
};

// --- testo: solo caratteri stampabili con i font standard (WinAnsi) ---
const okChar = new Map();
const cleanText = (font, s) =>
  String(s === undefined || s === null ? "" : s)
    .replace(/\t/g, " ")
    .replace(/[\u0000-\u0008\u000b-\u001f]/g, "")
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/\r/g, "")
    .split(/(?:)/u)
    .map((ch) => {
      if (ch === "\n") return ch;
      if (!okChar.has(ch)) {
        let ok = true;
        try {
          font.widthOfTextAtSize(ch, 10);
        } catch (e) {
          ok = false;
        }
        okChar.set(ch, ok);
      }
      return okChar.get(ch) ? ch : "";
    })
    .join("");

const widthOf = (font, s, size) => font.widthOfTextAtSize(s, size);

// a capo automatico: restituisce le righe (rispetta gli "a capo" del testo)
export const wrapText = (font, text, size, maxWidth) => {
  const out = [];
  for (const para of cleanText(font, text).split("\n")) {
    const words = para.split(/ +/).filter((w) => w !== "");
    if (!words.length) {
      out.push("");
      continue;
    }
    let line = "";
    for (let word of words) {
      // parola più lunga della riga: la spezzo
      while (widthOf(font, word, size) > maxWidth) {
        let cut = word.length - 1;
        while (cut > 1 && widthOf(font, (line ? line + " " : "") + word.slice(0, cut), size) > maxWidth) cut--;
        if (cut <= 1 && line) {
          out.push(line);
          line = "";
          continue;
        }
        out.push((line ? line + " " : "") + word.slice(0, cut));
        line = "";
        word = word.slice(cut);
      }
      const test = line ? line + " " + word : word;
      if (widthOf(font, test, size) <= maxWidth) line = test;
      else {
        out.push(line);
        line = word;
      }
    }
    out.push(line);
  }
  return out;
};

// taglia una riga perché stia nello spazio (con "…" finale)
const fitLine = (font, text, size, maxWidth) => {
  let t = cleanText(font, text).replace(/\s*\n\s*/g, " ").trim();
  if (widthOf(font, t, size) <= maxWidth) return t;
  while (t.length > 1 && widthOf(font, t + "...", size) > maxWidth) t = t.slice(0, -1);
  return t.trimEnd() + "...";
};

const ropeLines = (log) =>
  [
    ["fune", "Fune sostituita"],
    ["catena", "Catena sostituita"],
  ]
    .filter(([k]) => log && log[k])
    .map(([k, label]) => `${label}: ${formatRopeLong(log[k])}`);

const photoSources = (log) =>
  (log.photos || []).filter(
    (p) => typeof p === "string" && /^data:image\/(png|jpe?g);base64,/i.test(p)
  );

// =====================================================================
// ELENCHI (tabelle) con intestazione Mora
// =====================================================================
// cella = stringa oppure lista di pezzi { t: testo, b: grassetto, c: colore, s: dimensione }
const createFlow = async ({ title, subtitle, docTitle }) => {
  const ctx = await createDoc(docTitle || title);
  const { doc, font, bold, logo, col, logoRatio } = ctx;
  const M = 36;
  const flow = { ctx, page: null, y: 0, M };

  const header = () => {
    const page = doc.addPage([W, H]);
    flow.page = page;
    const lh = 38;
    const lw = lh * logoRatio;
    page.drawImage(logo, { x: M, y: H - M - lh, width: lw, height: lh });
    const cx = M + lw + 12;
    const co = companyInfo();
    page.drawText(co.name, { x: cx, y: H - M - 9, size: 9.5, font: bold, color: col(C.ink) });
    [co.address, co.phone, co.web].forEach((s, i) =>
      page.drawText(s, { x: cx, y: H - M - 20 - i * 9, size: 7.2, font, color: col(C.grey) })
    );
    const tt = fitLine(bold, title, 12, 200);
    page.drawText(tt, { x: W - M - widthOf(bold, tt, 12), y: H - M - 10, size: 12, font: bold, color: col(C.ink) });
    if (subtitle) {
      const st = fitLine(font, subtitle, 8, 200);
      page.drawText(st, { x: W - M - widthOf(font, st, 8), y: H - M - 23, size: 8, font, color: col(C.grey) });
    }
    page.drawLine({ start: { x: M, y: H - M - 48 }, end: { x: W - M, y: H - M - 48 }, thickness: 1.2, color: col(C.ink) });
    flow.y = H - M - 64;
  };
  header();

  const bottom = M + 22;
  flow.ensure = (h) => {
    if (flow.y - h < bottom) header();
  };
  flow.heading = (t) => {
    flow.ensure(40);
    flow.y -= 6;
    flow.page.drawText(cleanText(bold, t).toUpperCase(), { x: M, y: flow.y, size: 9.5, font: bold, color: col(C.ink) });
    flow.page.drawLine({ start: { x: M, y: flow.y - 5 }, end: { x: W - M, y: flow.y - 5 }, thickness: 0.6, color: col(C.line) });
    flow.y -= 20;
  };
  flow.paragraph = (t, { size = 9, color = C.text } = {}) => {
    for (const ln of wrapText(font, t, size, W - 2 * M)) {
      flow.ensure(size + 4);
      flow.page.drawText(ln, { x: M, y: flow.y, size, font, color: col(color) });
      flow.y -= size + 4;
    }
    flow.y -= 6;
  };
  flow.tiles = (items) => {
    const n = items.length;
    const gap = 8;
    const w = (W - 2 * M - gap * (n - 1)) / n;
    const h = 40;
    flow.ensure(h + 10);
    items.forEach(([label, value], i) => {
      const x = M + i * (w + gap);
      flow.page.drawRectangle({ x, y: flow.y - h + 8, width: w, height: h, borderWidth: 0.8, borderColor: col(C.line) });
      const v = fitLine(bold, String(value), 13, w - 8);
      flow.page.drawText(v, { x: x + (w - widthOf(bold, v, 13)) / 2, y: flow.y - 12, size: 13, font: bold, color: col(C.ink) });
      const l = fitLine(bold, String(label).toUpperCase(), 6.8, w - 8);
      flow.page.drawText(l, { x: x + (w - widthOf(bold, l, 6.8)) / 2, y: flow.y - 25, size: 6.8, font: bold, color: col(C.grey) });
    });
    flow.y -= h + 10;
  };
  flow.meta = (items) => {
    flow.ensure(24);
    const h = 20;
    flow.page.drawRectangle({ x: M, y: flow.y - h + 12, width: W - 2 * M, height: h, color: col(C.zebra), borderWidth: 0.6, borderColor: col(C.line) });
    const w = (W - 2 * M) / items.length;
    items.forEach((t, i) => {
      const s = fitLine(bold, t, 8, w - 12);
      flow.page.drawText(s, { x: M + i * w + 8, y: flow.y - 2, size: 8, font: bold, color: col(C.grey) });
    });
    flow.y -= h + 10;
  };

  // tabella con righe che vanno a capo e continuano nella pagina dopo
  flow.table = ({ columns, rows, minRowH = 0, light = false }) => {
    const total = W - 2 * M;
    const widths = columns.map((c) => c.w * total);
    const pad = 5;
    const drawHead = () => {
      const h = 18;
      flow.ensure(h + 16);
      flow.page.drawRectangle({ x: M, y: flow.y - h + 12, width: total, height: h, color: col(light ? [241, 245, 249] : C.ink) });
      let x = M;
      columns.forEach((c, i) => {
        const t = fitLine(bold, c.label.toUpperCase(), 7.2, widths[i] - 2 * pad);
        const tx = c.align === "right" ? x + widths[i] - pad - widthOf(bold, t, 7.2) : x + pad;
        flow.page.drawText(t, { x: tx, y: flow.y - 1, size: 7.2, font: bold, color: col(light ? C.ink : [255, 255, 255]) });
        x += widths[i];
      });
      flow.y -= h - 12;
    };
    drawHead();
    rows.forEach((row, ri) => {
      // righe di testo di ogni cella
      const cells = row.map((cell, ci) => {
        const parts = Array.isArray(cell) ? cell : cell && typeof cell === "object" ? [cell] : [{ t: cell }];
        const lines = [];
        parts.forEach((p) => {
          if (p.t === undefined || p.t === null || p.t === "") return;
          const f = p.b ? bold : font;
          const s = p.s || 8.5;
          wrapText(f, p.t, s, widths[ci] - 2 * pad).forEach((ln) => lines.push({ ln, f, s, c: p.c || C.text, gap: p.gap || 0 }));
        });
        return lines;
      });
      const lineH = (l) => l.s + 3.2 + l.gap;
      let first = true;
      while (first || cells.some((ls) => ls.length)) {
        const space = flow.y - bottom - 2 * pad;
        const need = Math.max(minRowH, ...cells.map((ls) => ls.reduce((s, l) => s + lineH(l), 0))) + 2 * pad;
        if (need > flow.y - bottom && (need <= H - 2 * M - 120 || space < 40)) {
          header();
          drawHead();
          continue;
        }
        // quante righe per cella stanno in questo pezzo
        const chunk = cells.map((ls) => {
          let h = 0;
          let n = 0;
          while (n < ls.length && h + lineH(ls[n]) <= space) {
            h += lineH(ls[n]);
            n++;
          }
          return ls.splice(0, n);
        });
        const rowH = Math.max(first ? minRowH : 0, ...chunk.map((ls) => ls.reduce((s, l) => s + lineH(l), 0))) + 2 * pad;
        if (ri % 2 === 1) flow.page.drawRectangle({ x: M, y: flow.y - rowH, width: total, height: rowH, color: col(C.zebra) });
        flow.page.drawLine({ start: { x: M, y: flow.y - rowH }, end: { x: M + total, y: flow.y - rowH }, thickness: 0.6, color: col(C.line) });
        let x = M;
        chunk.forEach((ls, ci) => {
          let yy = flow.y - pad;
          ls.forEach((l) => {
            yy -= l.gap;
            const tx = columns[ci].align === "right" ? x + widths[ci] - pad - widthOf(l.f, l.ln, l.s) : x + pad;
            flow.page.drawText(l.ln, { x: tx, y: yy - l.s, size: l.s, font: l.f, color: col(l.c) });
            yy -= l.s + 3.2;
          });
          x += widths[ci];
        });
        flow.y -= rowH;
        first = false;
        if (cells.some((ls) => ls.length)) {
          header();
          drawHead();
        }
      }
    });
    flow.y -= 12;
  };

  // tabella "etichetta | valore" (dati dell'intervento)
  flow.details = (rows) => {
    const total = W - 2 * M;
    const lw = total * 0.3;
    const pad = 7;
    const list = rows.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "");
    flow.ensure(30);
    const top = flow.y + 12;
    list.forEach(([label, value]) => {
      const lines = wrapText(font, value, 10, total - lw - 2 * pad);
      const h = Math.max(1, lines.length) * 13.5 + 2 * pad - 3.5;
      if (flow.y + 12 - h < bottom) header();
      const y0 = flow.y + 12;
      flow.page.drawRectangle({ x: M, y: y0 - h, width: lw, height: h, color: col([241, 245, 249]) });
      flow.page.drawLine({ start: { x: M, y: y0 - h }, end: { x: M + total, y: y0 - h }, thickness: 0.6, color: col(C.line) });
      flow.page.drawText(fitLine(bold, label.toUpperCase(), 8.5, lw - 2 * pad), { x: M + pad, y: y0 - pad - 8.5, size: 8.5, font: bold, color: col(C.ink) });
      lines.forEach((ln, i) => flow.page.drawText(ln, { x: M + lw + pad, y: y0 - pad - 9.5 - i * 13.5, size: 10, font, color: col(C.text) }));
      flow.y -= h;
    });
    if (list.length) flow.page.drawLine({ start: { x: M, y: top }, end: { x: M + total, y: top }, thickness: 0.6, color: col(C.line) });
    flow.y -= 14;
  };
  // riquadro con bordo per la descrizione (continua nella pagina dopo se serve)
  flow.textBox = (t, { minH = 80, size = 10.5 } = {}) => {
    const total = W - 2 * M;
    const pad = 10;
    const lh = size + 6;
    let lines = wrapText(font, t || "", size, total - 2 * pad);
    if (!lines.length) lines = [""];
    let first = true;
    while (lines.length) {
      const room = Math.floor((flow.y + 12 - bottom - 2 * pad) / lh);
      if (room < 2) {
        header();
        continue;
      }
      const chunk = lines.splice(0, room);
      const h = Math.max(first ? minH : 0, chunk.length * lh + 2 * pad - 4);
      const y0 = flow.y + 12;
      flow.page.drawRectangle({ x: M, y: y0 - h, width: total, height: h, borderWidth: 0.8, borderColor: col(C.line) });
      chunk.forEach((ln, i) => flow.page.drawText(ln, { x: M + pad, y: y0 - pad - size - i * lh + 1, size, font, color: col(C.text) }));
      flow.y -= h;
      first = false;
      if (lines.length) header();
    }
    flow.y -= 16;
  };
  // foto: 3 per riga
  flow.photos = (images) => {
    const total = W - 2 * M;
    const gap = 10;
    const cw = (total - 2 * gap) / 3;
    const ch = 165;
    for (let i = 0; i < images.length; i += 3) {
      flow.ensure(ch + 10);
      images.slice(i, i + 3).forEach((img, j) => {
        const sc = Math.min(cw / img.width, ch / img.height);
        const w = img.width * sc;
        const h = img.height * sc;
        const x = M + j * (cw + gap) + (cw - w) / 2;
        flow.page.drawImage(img, { x, y: flow.y + 12 - h, width: w, height: h });
        flow.page.drawRectangle({ x, y: flow.y + 12 - h, width: w, height: h, borderWidth: 0.6, borderColor: col(C.line) });
      });
      flow.y -= ch + gap;
    }
    flow.y -= 6;
  };
  // spazi per le firme
  flow.signatures = (labels) => {
    const total = W - 2 * M;
    const gap = 30;
    const w = (total - gap * (labels.length - 1)) / labels.length;
    flow.ensure(80);
    flow.y -= 20;
    labels.forEach((l, i) => {
      const x = M + i * (w + gap);
      flow.page.drawText(l.toUpperCase(), { x, y: flow.y, size: 8.5, font: bold, color: col(C.grey) });
      flow.page.drawLine({ start: { x, y: flow.y - 42 }, end: { x: x + w, y: flow.y - 42 }, thickness: 0.9, color: col(C.ink) });
    });
    flow.y -= 60;
  };

  flow.finish = (footerText) => {
    const pages = doc.getPages();
    pages.forEach((p, i) => {
      const t = `Pagina ${i + 1} di ${pages.length}`;
      p.drawText(t, { x: W - M - widthOf(font, t, 7.5), y: M - 6, size: 7.5, font, color: col(C.light) });
      if (footerText) p.drawText(fitLine(font, footerText, 7.5, W - 2 * M - 80), { x: M, y: M - 6, size: 7.5, font, color: col(C.light) });
    });
    return doc.save();
  };
  return flow;
};

// =====================================================================
// RAPPORTO DI UN SINGOLO INTERVENTO: dati, descrizione, foto (senza spazi per le firme)
// =====================================================================
export const buildInterventionPdf = async ({ log, today }) => {
  const printed = today || new Date().toLocaleDateString("it-IT");
  const flow = await createFlow({
    title: "RAPPORTO DI INTERVENTO",
    subtitle: log.ticketNumber ? `N. Assistenza ${log.ticketNumber}` : "",
    docTitle: `Rapporto intervento ${log.ticketNumber || log.dateString || ""}`,
  });
  flow.meta([`Data: ${log.dateString || "-"}`, `N. Assistenza: ${log.ticketNumber || "-"}`, `Stampato il: ${printed}`]);
  flow.details([
    ["Tecnico/i", getTechsString(log)],
    ["Cliente", log.customer],
    ["Matricola gru", log.machineId],
    ["Tipo", log.machineType],
    ["Portata", log.capacity ? formatCapacity(log.capacity) : ""],
    ["Fune sostituita", formatRopeLong(log.fune)],
    ["Catena sostituita", formatRopeLong(log.catena)],
  ]);
  flow.heading("Descrizione del lavoro");
  flow.textBox(log.description || "");
  const images = [];
  for (const src of photoSources(log)) {
    try {
      images.push(/^data:image\/png/i.test(src) ? await flow.ctx.doc.embedPng(src) : await flow.ctx.doc.embedJpg(src));
    } catch (e) {
      // foto non leggibile: la salto
    }
  }
  if (images.length) {
    flow.heading("Foto allegate");
    flow.photos(images);
  }
  return flow.finish("Documento generato dall'app Assistenza Mora.");
};

// PIÙ INTERVENTI IN UN SOLO PDF: ogni rapporto come quello singolo, uno dopo l'altro
export const buildInterventionsPdf = async ({ logs = [], today }) => {
  const { PDFDocument } = await loadLib();
  const out = await PDFDocument.create();
  out.setTitle(`Rapporti di intervento (${logs.length})`);
  out.setAuthor(companyInfo().name);
  for (const log of logs) {
    const one = await PDFDocument.load(await buildInterventionPdf({ log, today }));
    const pages = await out.copyPages(one, one.getPageIndices());
    pages.forEach((pg) => out.addPage(pg));
  }
  return out.save();
};

// colonne "Data / Tecnico", "Cliente / Impianto", "Descrizione" (Ufficio e Backup)
const LOG_COLUMNS = [
  { label: "Data / Tecnico", w: 0.17 },
  { label: "Cliente / Impianto", w: 0.25 },
  { label: "Descrizione lavoro", w: 0.58 },
];
const logRow = (l) => [
  [
    { t: l.dateString || "-", b: true, c: C.ink },
    l.ticketNumber ? { t: `N. Assistenza ${l.ticketNumber}`, c: C.blue, s: 7.5, gap: 1 } : null,
    { t: getTechsString(l), c: C.grey, s: 8, gap: 2 },
    l.photos && l.photos.length ? { t: `[${l.photos.length} foto]`, c: C.green, s: 7.5, gap: 1 } : null,
  ].filter(Boolean),
  [
    { t: l.customer || "-", b: true, c: C.ink },
    { t: `Mat: ${l.machineId || "-"}`, c: C.grey, s: 8, gap: 2 },
    { t: `${l.machineType || ""}${l.capacity ? " - " + formatCapacity(l.capacity) : ""}`, c: C.light, s: 7.5 },
  ],
  [
    { t: l.description || "" },
    ...ropeLines(l).map((t) => ({ t, b: true, c: C.amber, s: 8, gap: 3 })),
  ],
];

const dateKey = (ds) => {
  const p = String(ds || "").split("/").map(Number);
  return p.length === 3 && p.every((n) => !isNaN(n)) ? p[2] * 10000 + p[1] * 100 + p[0] : 0;
};
const byName = (a, b) => String(a).localeCompare(String(b), "it", { numeric: true, sensitivity: "base" });

// Report interventi (Ufficio)
export const buildLogsReportPdf = async ({ logs, periodLabel, today, subtitle = "Report interventi tecnici" }) => {
  const flow = await createFlow({ title: "REPORT INTERVENTI", subtitle, docTitle: "Report interventi" });
  flow.meta([`Generato il: ${today}`, `Totale interventi: ${logs.length}`, `Periodo: ${periodLabel}`]);
  flow.table({ columns: LOG_COLUMNS, rows: logs.map(logRow) });
  return flow.finish("Documento generato dall'app Assistenza Mora.");
};

// RIEPILOGO DEL MESE (Ufficio): numeri, tecnici, clienti, gru con più guasti e tutti gli interventi del mese
export const buildMonthSummaryPdf = async ({ logs, monthLabel, today }) => {
  const printed = today || new Date().toLocaleDateString("it-IT");
  const flow = await createFlow({ title: "RIEPILOGO DEL MESE", subtitle: monthLabel, docTitle: `Riepilogo ${monthLabel}` });
  const fix = logs.filter(isRepair).length;
  const clientsN = new Set(logs.map((l) => String(l.customer || "").trim()).filter(Boolean)).size;
  const cranesN = new Set(logs.map((l) => `${l.customer}|${l.machineId}`)).size;
  flow.meta([`Mese: ${monthLabel}`, `Generato il: ${printed}`, `Interventi: ${logs.length}`]);
  flow.tiles([
    ["Interventi", logs.length],
    ["Verifiche", logs.length - fix],
    ["Riparazioni", fix],
    ["Clienti", clientsN],
    ["Gru", cranesN],
  ]);
  // tecnici (un intervento conta per tutti quelli che c'erano)
  const techs = new Map();
  logs.forEach((l) =>
    [l.technician, ...(l.additionalTechnicians || [])]
      .map((t) => String(t || "").trim())
      .filter(Boolean)
      .forEach((t) => {
        const x = techs.get(t) || { n: 0, fix: 0 };
        x.n += 1;
        if (isRepair(l)) x.fix += 1;
        techs.set(t, x);
      })
  );
  if (techs.size) {
    flow.heading("Tecnici");
    flow.table({
      columns: [{ label: "Tecnico", w: 0.55 }, { label: "Interventi", w: 0.15, align: "right" }, { label: "Verifiche", w: 0.15, align: "right" }, { label: "Riparazioni", w: 0.15, align: "right" }],
      rows: [...techs.entries()].sort((a, b) => b[1].n - a[1].n).map(([t, x]) => [[{ t, b: true, c: C.ink }], String(x.n), String(x.n - x.fix), String(x.fix)]),
      light: true,
    });
  }
  const { cranes, clients } = officeCharts(logs, 10);
  if (clients.length) {
    flow.heading("Clienti con più interventi");
    flow.table({
      columns: [{ label: "Cliente", w: 0.55 }, { label: "Interventi", w: 0.15, align: "right" }, { label: "Verifiche", w: 0.15, align: "right" }, { label: "Riparazioni", w: 0.15, align: "right" }],
      rows: clients.map((x) => [[{ t: x.customer, b: true, c: C.ink }], String(x.check + x.fix), String(x.check), String(x.fix)]),
      light: true,
    });
  }
  if (cranes.length) {
    flow.heading("Gru con più guasti");
    flow.table({
      columns: [{ label: "Cliente", w: 0.45 }, { label: "Gru", w: 0.15 }, { label: "Tipo", w: 0.25 }, { label: "Riparazioni", w: 0.15, align: "right" }],
      rows: cranes.map((x) => [[{ t: x.customer, b: true, c: C.ink }], String(x.machineId), x.type || "-", String(x.n)]),
      light: true,
    });
  }
  flow.heading("Tutti gli interventi del mese");
  const sorted = logs.slice().sort((a, b) => dateKey(a.dateString) - dateKey(b.dateString));
  flow.table({ columns: LOG_COLUMNS, rows: sorted.map(logRow) });
  return flow.finish("Riepilogo generato dall'app Assistenza Mora.");
};

// FOGLIO ORE (La mia area → Le mie ore → Manda → PDF): riepilogo e un giorno per riga, con le note
const KIND_COLOR = { ferie: [29, 78, 216], permesso: [126, 34, 206], malattia: [185, 28, 28], festa: [100, 116, 139] };
export const buildHoursPdf = async ({ me, from, to, days = [], std = 480, today }) => {
  const printed = today || new Date().toLocaleDateString("it-IT");
  const s = rangeSummary(days, std);
  const flow = await createFlow({ title: "FOGLIO ORE", subtitle: `${me} · ${periodLabel(from, to)}`, docTitle: `Ore ${me}` });
  flow.meta([`Tecnico: ${me}`, `Periodo: ${periodLabel(from, to)}`, `Orario normale: ${fmtMin(std)} (lun-ven)`]);
  flow.tiles([
    ["Ore lavorate", fmtMin(s.worked)],
    ["Giorni lavorati", String(s.workDays)],
    ["Straordinari", s.extra ? "+" + fmtMin(s.extra) : "0"],
    ["Ore in meno", s.less ? "-" + fmtMin(s.less) : "0"],
    ["Ferie", s.ferie ? `${s.ferie} g` : "0"],
    ["Permessi", s.permesso ? fmtMin(s.permesso) : "0"],
  ]);
  if (s.malattia) flow.paragraph(`Malattia: ${s.malattia} ${s.malattia === 1 ? "giorno" : "giorni"}.`, { size: 9 });
  const rows = days.map((h) => {
    const free = isFreeDay(h.date);
    const d = deltaOf(h, std);
    const kind = kindOf(h.kind);
    const typeTxt = h.kind === "lavoro" ? (free ? "Lavoro (festivo)" : "Lavoro") : kind.label;
    const ore = h.kind === "lavoro" || h.kind === "permesso" ? fmtMin(h.minutes) : "-";
    return [
      { t: shortDay(h.date), b: true, c: free ? C.amber : C.text },
      { t: typeTxt + (h.auto ? " (normale)" : ""), c: KIND_COLOR[h.kind] || C.text, b: h.kind !== "lavoro" },
      { t: ore, b: true },
      d ? { t: fmtDelta(d), b: true, c: d > 0 ? C.green : C.amber } : "",
      h.note || "",
    ];
  });
  flow.table({
    columns: [
      { label: "Giorno", w: 0.14 },
      { label: "Tipo", w: 0.2 },
      { label: "Ore", w: 0.11, align: "right" },
      { label: "+ / -", w: 0.11, align: "right" },
      { label: "Note", w: 0.44 },
    ],
    rows,
  });
  return flow.finish(`Stampato il ${printed} dall'app Assistenza Mora.`);
};

// Elenco gru di un cliente (colonna Note vuota da compilare a penna)
export const buildCustomerMachinesPdf = async ({ customerName, machines = [], today }) => {
  const flow = await createFlow({ title: "ELENCO GRU", subtitle: `Stampato il ${today}`, docTitle: `Elenco gru ${customerName}` });
  const sorted = [...machines].sort((a, b) => byName(getSafeMatricola(a), getSafeMatricola(b)));
  flow.meta([`Cliente: ${customerName}`, `Gru: ${sorted.length}`]);
  if (!sorted.length) flow.paragraph("Nessuna gru registrata per questo cliente.", { color: C.light });
  else
    flow.table({
      columns: [
        { label: "#", w: 0.06 },
        { label: "Matricola", w: 0.22 },
        { label: "Tipo", w: 0.22 },
        { label: "Portata", w: 0.14 },
        { label: "Note", w: 0.36 },
      ],
      minRowH: 16,
      rows: sorted.map((m, i) => [
        { t: String(i + 1) },
        [{ t: getSafeMatricola(m) || "-", b: true, c: C.ink }],
        { t: m.type || "-" },
        { t: m.capacity ? formatCapacity(m.capacity) : "-" },
        "",
      ]),
    });
  return flow.finish("Documento generato dall'app Assistenza Mora.");
};

// Backup completo dell'archivio
// LISTA D'ORDINE: pezzi sotto la scorta minima, furgone per furgone
export const buildVanOrderPdf = async ({ groups = [], today }) => {
  const flow = await createFlow({ title: "LISTA D'ORDINE FURGONI", subtitle: `Stampato il ${today}`, docTitle: "Lista d'ordine furgoni" });
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  flow.meta([`Furgoni: ${groups.length}`, `Articoli da riordinare: ${total}`]);
  if (!total) flow.paragraph("Tutti i furgoni sono sopra la scorta minima.", { color: C.light });
  groups
    .filter((g) => g.rows.length)
    .forEach((g) => {
      flow.heading(`${g.name}${g.users ? " - " + g.users : ""}`);
      flow.table({
        columns: [
          { label: "Articolo", w: 0.4 },
          { label: "Codice", w: 0.18 },
          { label: "A bordo", w: 0.14 },
          { label: "Minimo", w: 0.14 },
          { label: "Da ordinare", w: 0.14 },
        ],
        minRowH: 16,
        rows: g.rows.map((r) => [
          [{ t: r.name, b: true, c: C.ink }],
          { t: r.code || "-" },
          { t: r.qty },
          { t: r.min },
          [{ t: r.order, b: true, c: C.ink }],
        ]),
      });
    });
  return flow.finish("Documento generato dall'app Assistenza Mora.");
};

export const buildBackupPdf = async ({ logs = [], customers = [], machines = [], technicians = [], machineTypes = [], generatedAt }) => {
  const flow = await createFlow({ title: "BACKUP ARCHIVIO", subtitle: `Generato il ${generatedAt}`, docTitle: `Backup archivio ${generatedAt}` });
  const sortedLogs = [...logs].sort((a, b) => dateKey(b.dateString) - dateKey(a.dateString));
  const perMachine = {};
  logs.forEach((l) => {
    const k = `${String(l.customer || "").toUpperCase()}|${String(l.machineId || "").toUpperCase()}`;
    perMachine[k] = (perMachine[k] || 0) + 1;
  });
  const machinesOf = {};
  machines.forEach((m) => {
    const c = String(m.customerName || "-");
    (machinesOf[c] = machinesOf[c] || []).push(m);
  });
  const customerNames = Array.from(new Set([...customers.map((c) => c.name), ...Object.keys(machinesOf)].filter(Boolean))).sort(byName);
  const keys = logs.map((l) => dateKey(l.dateString)).filter(Boolean);
  const fmtKey = (k) => (k ? `${k % 100}/${Math.floor(k / 100) % 100}/${Math.floor(k / 10000)}` : "-");

  flow.tiles([
    ["Interventi", logs.length],
    ["Clienti", customerNames.length],
    ["Gru", machines.length],
    ["Con foto", logs.filter((l) => l.photos && l.photos.length).length],
  ]);
  flow.meta([`Periodo: ${fmtKey(keys.length ? Math.min(...keys) : 0)} - ${fmtKey(keys.length ? Math.max(...keys) : 0)}`]);
  flow.heading(`Tecnici (${technicians.length})`);
  flow.paragraph(technicians.map((t) => t.name).sort(byName).join(" · ") || "-");
  flow.heading(`Tipi di gru (${machineTypes.length})`);
  flow.paragraph(machineTypes.map((t) => t.name).sort(byName).join(" · ") || "-");
  flow.heading("Clienti e gru");
  flow.table({
    light: true,
    columns: [
      { label: "Cliente", w: 0.3 },
      { label: "Matricola", w: 0.2 },
      { label: "Tipo", w: 0.22 },
      { label: "Portata", w: 0.16 },
      { label: "Interventi", w: 0.12, align: "right" },
    ],
    rows: customerNames.flatMap((name) => {
      const ms = (machinesOf[name] || []).slice().sort((a, b) => byName(getSafeMatricola(a), getSafeMatricola(b)));
      if (!ms.length) return [[[{ t: name, b: true, c: C.ink }], [{ t: "Nessuna gru registrata", c: C.light }], "", "", ""]];
      return ms.map((m, i) => {
        const mat = getSafeMatricola(m);
        return [
          i === 0 ? [{ t: name, b: true, c: C.ink }] : "",
          [{ t: mat || "-", b: true, c: C.ink }],
          { t: m.type || "-" },
          { t: m.capacity ? formatCapacity(m.capacity) : "-" },
          { t: String(perMachine[`${String(name).toUpperCase()}|${String(mat).toUpperCase()}`] || 0) },
        ];
      });
    }),
  });
  flow.heading(`Interventi (${logs.length}, dal più recente)`);
  flow.table({ columns: LOG_COLUMNS, rows: sortedLogs.map(logRow) });
  return flow.finish("Backup generato dall'app. Le foto non sono incluse (è indicato solo il loro numero).");
};

// nome del file: lettere, numeri e trattini
export const pdfFileName = (...parts) =>
  parts
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) + ".pdf";
