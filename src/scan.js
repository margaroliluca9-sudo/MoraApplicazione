// FOTO NELLE NOTE (La mia area → Note): la foto così com'è (compressa come quelle dei rapporti), si può ruotare.
// («Scansiona foglio» con l'intelligenza artificiale è stato tolto: l'app deve restare tutta gratuita.)
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
