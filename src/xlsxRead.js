// LEGGERE UN FILE EXCEL (.xlsx) o CSV nel telefono, senza librerie.
// readSpreadsheet(file) → righe del primo foglio: [["CLIENTE", "PAESE", ...], ["BIANCHI", "Novara", ...], ...]
// Un .xlsx è uno zip: leggo l'indice, apro i file che servono (testi condivisi + primo foglio).

const td = new TextDecoder("utf-8");

// ---- zip ----
const inflateRaw = async (bytes) => {
  if (typeof DecompressionStream === "undefined") throw new Error("Questo telefono non sa aprire i file Excel: salva il file come CSV e riprova.");
  const ds = new DecompressionStream("deflate-raw");
  const out = new Response(new Blob([bytes]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
};

export const unzip = async (buf) => {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  // fine dell'indice centrale (cerco dalla fine)
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Il file non è un Excel valido.");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = td.decode(u8.subarray(p + 46, p + 46 + nameLen));
    const lNameLen = dv.getUint16(local + 26, true);
    const lExtraLen = dv.getUint16(local + 28, true);
    const start = local + 30 + lNameLen + lExtraLen;
    files[name] = { method, data: u8.subarray(start, start + csize) };
    p += 46 + nameLen + extraLen + commentLen;
  }
  return {
    names: Object.keys(files),
    read: async (name) => {
      const f = files[name];
      if (!f) return null;
      const raw = f.method === 0 ? f.data : await inflateRaw(f.data);
      return td.decode(raw);
    },
  };
};

// ---- xml ----
const unescapeXml = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
const textOf = (xml) => {
  const parts = [];
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let m;
  while ((m = re.exec(xml))) parts.push(unescapeXml(m[1]));
  return parts.join("");
};

// "B12" → 1 (colonna)
const colIndex = (ref) => {
  const letters = String(ref || "").replace(/[0-9]/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

export const parseSheet = (sheetXml, shared = []) => {
  const rows = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let r;
  while ((r = rowRe.exec(sheetXml))) {
    const row = [];
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let c;
    let next = 0;
    while ((c = cellRe.exec(r[1]))) {
      const attrs = c[1] || "";
      const body = c[2] || "";
      const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
      const idx = ref ? colIndex(ref) : next;
      next = idx + 1;
      const t = (attrs.match(/\bt="(\w+)"/) || [])[1];
      const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      let val = "";
      if (t === "s") val = shared[Number(v)] || "";
      else if (t === "inlineStr") val = textOf(body);
      else if (v != null) val = unescapeXml(v);
      row[idx] = val;
    }
    rows.push(Array.from(row, (x) => (x == null ? "" : String(x))));
  }
  return rows;
};

export const readXlsx = async (buf) => {
  const z = await unzip(buf);
  const sharedXml = (await z.read("xl/sharedStrings.xml")) || "";
  const shared = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(sharedXml))) shared.push(textOf(m[1]));
  // primo foglio (in ordine di nome: sheet1.xml)
  const sheetName = z.names.filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10))[0];
  if (!sheetName) throw new Error("Nel file non c'è nessun foglio.");
  return parseSheet(await z.read(sheetName), shared);
};

// CSV con ; o , (quello che salva Excel in italiano usa ;)
export const parseCsv = (text) => {
  const t = String(text || "").replace(/^﻿/, "");
  const first = t.split(/\r?\n/)[0] || "";
  const sep = (first.match(/;/g) || []).length >= (first.match(/,/g) || []).length ? ";" : ",";
  const rows = [];
  let row = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) {
      if (ch === '"' && t[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
};

export const readSpreadsheet = async (file) => {
  const name = String((file && file.name) || "").toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) return parseCsv(await file.text());
  return readXlsx(await file.arrayBuffer());
};
