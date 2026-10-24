// FILE EXCEL (.xlsx) fatto in casa, senza librerie: un .xlsx è uno zip di pochi file XML.
// buildXlsx([{ name: "Interventi", cols: [{ title, width }], rows: [[...], ...] }]) → Uint8Array
// Prima riga in grassetto e bloccata, filtri già attivi, numeri come numeri, date vere (gg/mm/aaaa).

// ---- zip senza compressione (metodo "store") ----
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export const crc32 = (bytes) => {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const enc = (s) => new TextEncoder().encode(s);

export const zipStore = (files) => {
  const parts = [];
  const central = [];
  let offset = 0;
  // data/ora fissa (1/1/2020): Excel non la guarda
  const DOS_TIME = 0;
  const DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1;
  files.forEach(({ name, data }) => {
    const nameB = enc(name);
    const body = typeof data === "string" ? enc(data) : data;
    const crc = crc32(body);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // nomi in UTF-8
    local.setUint16(8, 0, true);
    local.setUint16(10, DOS_TIME, true);
    local.setUint16(12, DOS_DATE, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, body.length, true);
    local.setUint32(22, body.length, true);
    local.setUint16(26, nameB.length, true);
    local.setUint16(28, 0, true);
    parts.push(new Uint8Array(local.buffer), nameB, body);

    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint16(10, 0, true);
    cen.setUint16(12, DOS_TIME, true);
    cen.setUint16(14, DOS_DATE, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, body.length, true);
    cen.setUint32(24, body.length, true);
    cen.setUint16(28, nameB.length, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), nameB);
    offset += 30 + nameB.length + body.length;
  });
  const cenSize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
  let p = 0;
  all.forEach((b) => {
    out.set(b, p);
    p += b.length;
  });
  return out;
};

// ---- fogli ----
// caratteri che Excel non accetta nell'XML (controllo): li tolgo guardando il codice del carattere
const okChar = (ch) => {
  const c = ch.charCodeAt(0);
  return c === 9 || c === 10 || c === 13 || (c >= 32 && c !== 0xfffe && c !== 0xffff);
};
const stripBad = (s) => {
  for (let i = 0; i < s.length; i++) if (!okChar(s[i])) return Array.from(s).filter(okChar).join("");
  return s;
};
export const xmlText = (v) =>
  stripBad(String(v == null ? "" : v))
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const colName = (i) => {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

// date vere (Excel le ordina e le filtra bene): { date: Date } solo giorno, { time: Date } giorno e ora
const EPOCH = Date.UTC(1899, 11, 30);
export const excelSerial = (d) =>
  (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()) - EPOCH) / 86400000;

const cell = (v, ref, head) => {
  const st = head ? ' s="1"' : ' s="2"';
  if (v && typeof v === "object" && (v.date || v.time)) {
    const d = v.date || v.time;
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
    const n = v.date ? Math.floor(excelSerial(d)) : Math.round(excelSerial(d) * 1440) / 1440;
    return `<c r="${ref}" s="${v.date ? 3 : 4}"><v>${n}</v></c>`;
  }
  if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}"${st}><v>${v}</v></c>`;
  const t = xmlText(v);
  if (!t) return "";
  return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${t.slice(0, 32000)}</t></is></c>`;
};

const sheetXml = ({ cols, rows }) => {
  const last = colName(Math.max(0, cols.length - 1)) + (rows.length + 1);
  const colsXml = cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width || 14}" customWidth="1"/>`).join("");
  const head = `<row r="1">${cols.map((c, i) => cell(c.title, colName(i) + "1", true)).join("")}</row>`;
  const body = rows
    .map((r, ri) => `<row r="${ri + 2}">${r.map((v, ci) => cell(v, colName(ci) + (ri + 2), false)).join("")}</row>`)
    .join("");
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${colsXml}</cols><sheetData>${head}${body}</sheetData>` +
    `<autoFilter ref="A1:${last}"/></worksheet>`
  );
};

const safeSheetName = (n, i) => (String(n || "Foglio" + (i + 1)).replace(/[[\]:*?/\\]/g, " ").slice(0, 31) || "Foglio" + (i + 1));

export const buildXlsx = (sheets) => {
  const names = sheets.map((s, i) => safeSheetName(s.name, i));
  const files = [
    {
      name: "[Content_Types].xml",
      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
        "</Types>",
    },
    {
      name: "_rels/.rels",
      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        "</Relationships>",
    },
    {
      name: "xl/workbook.xml",
      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
        names.map((n, i) => `<sheet name="${xmlText(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
        "</sheets>" +
        "<definedNames>" +
        sheets
          .map((s, i) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xmlText(names[i]).replace(/'/g, "''")}'!$A$1:$${colName(Math.max(0, s.cols.length - 1))}$${s.rows.length + 1}</definedName>`)
          .join("") +
        "</definedNames></workbook>",
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
        `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        "</Relationships>",
    },
    {
      // 0 = normale, 1 = intestazione (grassetto bianco su blu), 2 = testo a capo in alto, 3 = data, 4 = data e ora
      name: "xl/styles.xml",
      data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy hh:mm"/></numFmts>' +
        '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
        '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1E40AF"/><bgColor indexed="64"/></patternFill></fill></fills>' +
        '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
        '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' +
        '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf>' +
        '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top"/></xf></cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        "</styleSheet>",
    },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) })),
  ];
  return zipStore(files);
};

export const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
