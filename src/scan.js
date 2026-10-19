// FOTO E FOGLI NELLE NOTE (La mia area → Note)
//  - «Foto»: la foto così com'è (compressa come quelle dei rapporti)
//  - «Scansiona foglio»: la foto diventa come una scansione (bianco e nero pulito, più leggibile)
//    e poi l'intelligenza artificiale (/api/scan) trascrive quello che c'è scritto nel testo della nota
// Al massimo 3 foto per nota (il documento della nota ha un limite di grandezza).
import { compressImage } from "./utils";

export const MAX_NOTE_PHOTOS = 3;

const loadImg = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const toJpeg = (canvas, maxChars = 290000) => {
  for (const q of [0.85, 0.75, 0.65, 0.55, 0.45]) {
    const d = canvas.toDataURL("image/jpeg", q);
    if (d.length <= maxChars) return d;
  }
  return canvas.toDataURL("image/jpeg", 0.35);
};

// effetto "scansione": grigi, sfondo bianco, inchiostro scuro (livelli automatici + contrasto)
export const scanLook = async (dataUrl, maxSide = 1600) => {
  const img = await loadImg(dataUrl);
  const k = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.round(img.width * k);
  const h = Math.round(img.height * k);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const im = ctx.getImageData(0, 0, w, h);
  const px = im.data;
  const hist = new Array(256).fill(0);
  const g = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const v = (px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) | 0;
    g[j] = v;
    hist[v]++;
  }
  // nero = 2% più scuro, bianco = carta (60% più chiaro)
  const n = w * h;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc < n * 0.02) lo = v;
    if (acc < n * 0.6) hi = v;
  }
  hi = Math.max(hi, lo + 40);
  // luce non uniforme: confronto ogni punto con la media della sua zona (riquadri da 32)
  const B = 32;
  const bw = Math.ceil(w / B);
  const bh = Math.ceil(h / B);
  const bg = new Float32Array(bw * bh);
  for (let by = 0; by < bh; by++)
    for (let bx = 0; bx < bw; bx++) {
      const vals = [];
      for (let y = by * B; y < Math.min(h, by * B + B); y += 4) for (let x = bx * B; x < Math.min(w, bx * B + B); x += 4) vals.push(g[y * w + x]);
      vals.sort((a, b) => a - b);
      bg[by * bw + bx] = vals[Math.floor(vals.length * 0.8)] || hi;
    }
  for (let y = 0, j = 0; y < h; y++)
    for (let x = 0; x < w; x++, j++) {
      // zona molto più scura della carta (tavolo, ombra): non la schiarisco
      const local = bg[Math.min(bh - 1, (y / B) | 0) * bw + Math.min(bw - 1, (x / B) | 0)];
      const paper = Math.max(local < hi * 0.72 ? hi * 1.25 : local, lo + 30);
      let v = ((g[j] - lo) / (paper - lo)) * 255;
      v = v > 235 ? 255 : v < 0 ? 0 : v;
      v = 255 * Math.pow(v / 255, 1.6);
      const i = j * 4;
      px[i] = px[i + 1] = px[i + 2] = v;
    }
  ctx.putImageData(im, 0, 0);
  return toJpeg(c);
};

// ruota di 90° (in senso orario)
export const rotate90 = async (dataUrl) => {
  const img = await loadImg(dataUrl);
  const c = document.createElement("canvas");
  c.width = img.height;
  c.height = img.width;
  const ctx = c.getContext("2d");
  ctx.translate(c.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, 0, 0);
  return toJpeg(c);
};

export const photoFromFile = (file) => compressImage(file);
export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

// trascrizione con l'intelligenza artificiale
export class ScanError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
export const readSheet = async (dataUrl) => {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new ScanError("offline", "Senza rete non posso leggere il foglio: la foto resta nella nota, riprova con la rete.");
  let r;
  try {
    r = await fetch("/api/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: dataUrl }) });
  } catch (e) {
    throw new ScanError("offline", "Servizio non raggiungibile: la foto resta nella nota, riprova più tardi.");
  }
  const data = await r.json().catch(() => ({}));
  if (r.status === 503) throw new ScanError("off", "La lettura automatica non è ancora attiva: la foto è salvata nella nota.");
  if (!r.ok) throw new ScanError("err", "Non sono riuscito a leggere il foglio: " + (data.error || r.status));
  const text = String(data.text || "").trim();
  if (!text) throw new ScanError("empty", "Sul foglio non ho trovato niente da leggere.");
  return text;
};
