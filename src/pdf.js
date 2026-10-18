// STAMPE IN PDF: l'app crea un vero file PDF (niente finestre o stampa del browser,
// che sul telefono spesso non funzionano). Il file si condivide, si stampa o si salva.
//  - buildInterventionPdf: rapporto del singolo intervento, uguale al modulo cartaceo
//    "SERVIZIO ASSISTENZA TECNICA" (+ pagina con le foto)
//  - buildCustomerMachinesPdf / buildLogsReportPdf / buildBackupPdf: elenchi con
//    l'intestazione Mora
// La libreria pdf-lib viene caricata solo al momento della stampa.
import { getTechsString, formatCapacity, getSafeMatricola } from "./utils";
import { formatRopeLong } from "./ropes";
import { MORA_LOGO_PNG, MORA_LOGO_RATIO } from "./pdfLogo";

export const COMPANY = {
  name: "ELETTROMECCANICA MORA s.r.l.",
  address: "Via Piola n. 16 - 28013 GATTICO-VERUNO (NO)",
  phone: "Tel. 0322 84.17.24 - Fax 0322 83.55.82",
  web: "www.emora.it  info@emora.it - contabile@emora.it",
  reg: "Reg. Impr. NO - Cod. Fisc. - Partita I.V.A.: 02236660037",
  rea: "REA Novara n. 0223760 - elettromeccanicamorasrl@pec.it",
};

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
  const logo = await doc.embedPng(MORA_LOGO_PNG);
  const col = (c) => rgb(c[0] / 255, c[1] / 255, c[2] / 255);
  return { lib, doc, font, bold, logo, col };
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

// tipo di gru -> caselle del modulo
export const machineKind = (type) => {
  const t = String(type || "").toUpperCase();
  return {
    bandiera: /BANDIERA/.test(t),
    impianto: /SOSPES|MONOROTAIA/.test(t),
    carroponte: /PONTE|CARROPONTE|BITRAVE|MONOTRAVE|BI-TRAVE|MONO-TRAVE|PORTALE|CAVALLETTO/.test(t),
    bitrave: /BITRAVE|BI-TRAVE|BI TRAVE/.test(t),
    monotrave: /MONOTRAVE|MONO-TRAVE|MONO TRAVE/.test(t),
  };
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
// RAPPORTO DI INTERVENTO = modulo "SERVIZIO ASSISTENZA TECNICA"
// =====================================================================
export const buildInterventionPdf = async ({ log }) => {
  const ctx = await createDoc(
    `Assistenza ${log.ticketNumber ? "N. " + log.ticketNumber + " " : ""}${log.customer || ""}`
  );
  const { doc, font, bold, logo, col } = ctx;
  const page = doc.addPage([W, H]);
  const Y = (top) => H - top; // coordinate dall'alto
  const L = 28;
  const R = 567;
  const X0 = 40; // inizio testo
  const X1 = 555; // fine righe puntinate

  const text = (s, x, top, { size = 10, f = font, color = C.ink } = {}) =>
    page.drawText(cleanText(f, s), { x, y: Y(top), size, font: f, color: col(color) });
  const hline = (top, x1 = L, x2 = R, thickness = 1) =>
    page.drawLine({ start: { x: x1, y: Y(top) }, end: { x: x2, y: Y(top) }, thickness, color: col(C.black) });
  const vline = (x, t1, t2, thickness = 1) =>
    page.drawLine({ start: { x, y: Y(t1) }, end: { x, y: Y(t2) }, thickness, color: col(C.black) });
  const dots = (x1, x2, top) =>
    page.drawLine({
      start: { x: x1, y: Y(top) + 1 },
      end: { x: x2, y: Y(top) + 1 },
      thickness: 0.8,
      color: col(C.grey),
      dashArray: [0.6, 2.2],
      lineCap: ctx.lib.LineCapStyle.Round,
    });
  const box = (x, top, checked) => {
    page.drawRectangle({ x, y: Y(top) - 0.5, width: 7.5, height: 7.5, borderWidth: 0.9, borderColor: col(C.black) });
    if (checked) {
      page.drawLine({ start: { x: x + 1.2, y: Y(top) + 0.7 }, end: { x: x + 6.3, y: Y(top) + 5.8 }, thickness: 1.3, color: col(C.fill) });
      page.drawLine({ start: { x: x + 1.2, y: Y(top) + 5.8 }, end: { x: x + 6.3, y: Y(top) + 0.7 }, thickness: 1.3, color: col(C.fill) });
    }
  };
  // etichetta + righe puntinate (+ valore scritto "a penna"); restituisce la x di fine
  const field = (label, x, top, xEnd, value, { size = 10, valueSize = 10 } = {}) => {
    text(label, x, top, { size });
    const start = x + widthOf(font, cleanText(font, label), size) + 2;
    dots(start, xEnd, top);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      const v = fitLine(bold, value, valueSize, xEnd - start - 6);
      text(v, start + 4, top - 1.5, { size: valueSize, f: bold, color: C.fill });
    }
    return start;
  };

  // --- cornice e divisioni ---
  const T = 26;
  const B = 812;
  page.drawRectangle({ x: L, y: Y(B), width: R - L, height: B - T, borderWidth: 1.2, borderColor: col(C.black) });
  [139, 158, 223, 288, 420, 553, 714].forEach((t) => hline(t));
  vline(314, T, 139);

  // --- intestazione ---
  const logoW = 122;
  page.drawImage(logo, { x: 186, y: Y(32 + logoW / MORA_LOGO_RATIO), width: logoW, height: logoW / MORA_LOGO_RATIO });
  text("ELETTROMECCANICA", 44, 72, { size: 12.5, f: bold });
  const addr1 = "Via Piola n. 16 - 28013 ";
  text(addr1, 44, 90, { size: 8.6 });
  text("GATTICO-VERUNO", 44 + widthOf(font, addr1, 8.6), 90, { size: 8.6, f: bold });
  text(" (NO)", 44 + widthOf(font, addr1, 8.6) + widthOf(bold, "GATTICO-VERUNO", 8.6), 90, { size: 8.6 });
  text(COMPANY.phone, 44, 101.5, { size: 8.6 });
  text(COMPANY.web, 44, 113, { size: 8.6 });
  text(COMPANY.reg, 44, 123.5, { size: 6.4 });
  text(COMPANY.rea, 44, 131.5, { size: 6.4 });

  field("Nota N°", 330, 72, 445, log.ticketNumber || "");
  field("del", 449, 72, X1, log.dateString || "");
  field("Tecnico", 330, 108, X1, getTechsString(log) || "");

  // --- titolo (lettere spaziate) ---
  const title = "SERVIZIO ASSISTENZA TECNICA";
  const tSize = 13.5;
  const spacing = 2.2;
  const tWidth = title.split("").reduce((s, ch) => s + widthOf(bold, ch, tSize) + spacing, -spacing);
  let tx = (L + R) / 2 - tWidth / 2;
  for (const ch of title) {
    text(ch, tx, 153.5, { size: tSize, f: bold });
    tx += widthOf(bold, ch, tSize) + spacing;
  }

  // --- cliente ---
  field("Cliente", X0, 177, 430, log.customer || "");
  field("Tel.", 436, 177, X1);
  field("Località", X0, 196, 262);
  field("Via", 268, 196, 486);
  field("n°", 492, 196, X1);
  box(X0, 213, false);
  field("Rif. richiesta", X0 + 11, 213.5, 258, "", { size: 9.5 });
  field("del", 262, 213.5, 330, "", { size: 9.5 });
  box(336, 213, false);
  field("Rif. Vs. ordine N.", 347, 213.5, 488, "", { size: 9.5 });
  field("del", 492, 213.5, X1, "", { size: 9.5 });

  // --- tipo di lavoro (a penna) ---
  const wt = [
    ["Lavoro in economia", X0],
    ["Garanzia", 150],
    ["Verif. annuale ........ / ........", 226],
    ["Verif. trim.le ........ / ........", 352],
    ["Lavoro su prev.", 476],
  ];
  wt.forEach(([label, x]) => {
    box(x, 240, false);
    text(label, x + 11, 240.5, { size: 8.3 });
  });
  field("Ore lavorate comprensive del tempo di viaggio", X0, 257, X1);
  field("Km percorsi", X0, 274, 228);
  field("Trasferte n°", 232, 274, X1);

  // --- tre blocchi "Lavoro eseguito su" ---
  const kind = machineKind(log.machineType);
  const descLines = [...String(log.description || "").split(/\r?\n/), ...ropeLines(log)].join("\n");
  let overflow = "";
  const block = (t0, data) => {
    text("Lavoro eseguito su", X0, t0 + 18);
    const bx = X0 + widthOf(font, "Lavoro eseguito su", 10) + 8;
    box(bx, t0 + 17.5, data && kind.carroponte);
    text("Carroponte", bx + 11, t0 + 18);
    // frazione BITRAVE / MONOTRAVE
    const fx = bx + 11 + widthOf(font, "Carroponte", 10) + 8;
    text("BITRAVE", fx + 7, t0 + 12.5, { size: 6.4 });
    page.drawLine({ start: { x: fx, y: Y(t0 + 14.6) }, end: { x: fx + 44, y: Y(t0 + 14.6) }, thickness: 0.7, color: col(C.black) });
    text("MONOTRAVE", fx + 1, t0 + 20.5, { size: 6.4 });
    if (data && (kind.bitrave || kind.monotrave)) {
      const ty = kind.bitrave ? t0 + 10.3 : t0 + 18.3;
      page.drawEllipse({ x: fx + 22, y: Y(ty), xScale: 24, yScale: 5.4, borderWidth: 0.9, borderColor: col(C.fill) });
    }
    box(300, t0 + 17.5, data && kind.bandiera);
    text("Bandiera", 311, t0 + 18);
    box(392, t0 + 17.5, data && kind.impianto);
    text("Impianto sospeso / monorotaia", 403, t0 + 18);

    field("Portata", X0, t0 + 36, 250, data ? formatCapacity(data.capacity) || data.capacity || "" : "");
    field("N°", 256, t0 + 36, 360);
    field("Matricola", 366, t0 + 36, X1, data ? data.machineId || "" : "");
    const dStart = field("Descrizione dell'intervento con specifica dei ricambi impiegati", X0, t0 + 53, X1);
    const rows = [t0 + 71, t0 + 89, t0 + 107, t0 + 124];
    rows.forEach((r) => dots(X0, X1, r));
    if (!data) return;

    // descrizione: prima riga corta dopo l'etichetta, poi 4 righe intere
    const slots = [{ x: dStart + 4, w: X1 - dStart - 6, top: t0 + 53 }, ...rows.map((r) => ({ x: X0 + 2, w: X1 - X0 - 4, top: r }))];
    const widths = slots.map((sl) => sl.w);
    let size = 9.5;
    let res = flowIntoSlots(bold, descLines, size, widths);
    if (res.overflow) {
      size = 8.5;
      res = flowIntoSlots(bold, descLines, size, widths);
    }
    if (res.overflow) {
      overflow = descLines;
      size = 9.5;
      const note = " (segue nel foglio allegato)";
      const w2 = [...widths];
      w2[w2.length - 1] -= widthOf(bold, note, size) + 4;
      res = flowIntoSlots(bold, descLines, size, w2);
      res.lines[res.lines.length - 1] = (res.lines[res.lines.length - 1] || "") + note;
    }
    res.lines.forEach((ln, i) => {
      if (ln) text(ln, slots[i].x, slots[i].top - 1.8, { size, f: bold, color: C.fill });
    });
  };
  block(288, log);
  block(420, null);
  block(553, null);

  // --- firme e annotazioni ---
  const sig1 = "TIMBRO E FIRMA DEL CLIENTE PER ACCETTAZIONE";
  text(sig1, X1 - widthOf(font, sig1, 7.6), 553 + 140, { size: 7.6 });
  dots(345, X1, 553 + 156);
  text("ANNOTAZIONI", X0, 728, { size: 7.6 });
  text("TIMBRO E FIRMA DEL CLIENTE", 392, 766, { size: 7.6 });
  dots(345, X1, 792);

  // --- pagina 2: descrizione completa (se non stava) e foto ---
  const photos = photoSources(log);
  if (overflow || photos.length) await addAttachmentPage(ctx, log, overflow, photos);
  return doc.save();
};

// distribuisce il testo su righe di larghezza diversa (le righe puntinate del modulo)
export const flowIntoSlots = (font, text, size, widths) => {
  const lines = [];
  let line = "";
  const room = () => widths[Math.min(lines.length, widths.length - 1)];
  const push = () => {
    lines.push(line);
    line = "";
  };
  const paras = cleanText(font, text).replace(/\s+$/, "").split("\n");
  paras.forEach((para, pi) => {
    for (let word of para.split(/ +/).filter(Boolean)) {
      const test = line ? line + " " + word : word;
      if (widthOf(font, test, size) <= room()) {
        line = test;
        continue;
      }
      if (line) push();
      // parola troppo lunga per una riga intera: la spezzo
      while (widthOf(font, word, size) > room()) {
        let cut = word.length - 1;
        while (cut > 1 && widthOf(font, word.slice(0, cut), size) > room()) cut--;
        line = word.slice(0, cut);
        push();
        word = word.slice(cut);
      }
      line = word;
    }
    if (line || pi < paras.length - 1) push();
  });
  if (line) push();
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return { lines: lines.slice(0, widths.length), overflow: lines.length > widths.length };
};

const addAttachmentPage = async (ctx, log, fullText, photos) => {
  const { doc, font, bold, logo, col } = ctx;
  let page = doc.addPage([W, H]);
  const M = 36;
  const header = () => {
    const lh = 30;
    page.drawImage(logo, { x: M, y: H - M - lh, width: lh * MORA_LOGO_RATIO, height: lh });
    const t = `Allegato alla Nota N° ${log.ticketNumber || "-"} del ${log.dateString || "-"}`;
    page.drawText(cleanText(bold, t), { x: M + lh * MORA_LOGO_RATIO + 14, y: H - M - 12, size: 11, font: bold, color: col(C.ink) });
    const sub = `${log.customer || ""}  ·  Matricola ${log.machineId || "-"}`;
    page.drawText(fitLine(font, sub, 9, W - 2 * M - lh * MORA_LOGO_RATIO - 14), { x: M + lh * MORA_LOGO_RATIO + 14, y: H - M - 26, size: 9, font, color: col(C.grey) });
    page.drawLine({ start: { x: M, y: H - M - 38 }, end: { x: W - M, y: H - M - 38 }, thickness: 1, color: col(C.ink) });
    return H - M - 56;
  };
  let y = header();
  if (fullText) {
    page.drawText("DESCRIZIONE COMPLETA DELL'INTERVENTO", { x: M, y, size: 9, font: bold, color: col(C.ink) });
    y -= 16;
    for (const ln of wrapText(font, fullText, 10, W - 2 * M)) {
      if (y < M + 20) {
        page = doc.addPage([W, H]);
        y = header();
      }
      page.drawText(ln, { x: M, y, size: 10, font, color: col(C.text) });
      y -= 14;
    }
    y -= 10;
  }
  if (!photos.length) return;
  const images = [];
  for (const src of photos) {
    try {
      images.push(/^data:image\/png/i.test(src) ? await doc.embedPng(src) : await doc.embedJpg(src));
    } catch (e) {
      // foto non leggibile: la salto
    }
  }
  if (!images.length) return;
  const title = `FOTO ALLEGATE (${images.length})`;
  const gap = 10;
  const maxW = W - 2 * M;
  for (const img of images) {
    const avail = () => y - M - 6;
    // altezza massima per foto: tutte e tre in una pagina se possibile
    const maxH = Math.min(avail() - (title && img === images[0] ? 16 : 0), (H - 2 * M - 70 - gap * 2) / Math.min(images.length, 3));
    let scale = Math.min(maxW / img.width, Math.max(maxH, 120) / img.height);
    let w = img.width * scale;
    let h = img.height * scale;
    if (img === images[0]) {
      if (avail() < h + 16) {
        page = doc.addPage([W, H]);
        y = header();
      }
      page.drawText(title, { x: M, y, size: 9, font: bold, color: col(C.ink) });
      y -= 14;
    }
    if (y - h < M) {
      page = doc.addPage([W, H]);
      y = header();
      scale = Math.min(maxW / img.width, (y - M) / img.height);
      w = img.width * scale;
      h = img.height * scale;
    }
    page.drawImage(img, { x: M + (maxW - w) / 2, y: y - h, width: w, height: h });
    y -= h + gap;
  }
};

// =====================================================================
// ELENCHI (tabelle) con intestazione Mora
// =====================================================================
// cella = stringa oppure lista di pezzi { t: testo, b: grassetto, c: colore, s: dimensione }
const createFlow = async ({ title, subtitle, docTitle }) => {
  const ctx = await createDoc(docTitle || title);
  const { doc, font, bold, logo, col } = ctx;
  const M = 36;
  const flow = { ctx, page: null, y: 0, M };

  const header = () => {
    const page = doc.addPage([W, H]);
    flow.page = page;
    const lh = 38;
    const lw = lh * MORA_LOGO_RATIO;
    page.drawImage(logo, { x: M, y: H - M - lh, width: lw, height: lh });
    const cx = M + lw + 12;
    page.drawText(COMPANY.name, { x: cx, y: H - M - 9, size: 9.5, font: bold, color: col(C.ink) });
    [COMPANY.address, COMPANY.phone, COMPANY.web].forEach((s, i) =>
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
