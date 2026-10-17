// Funzioni di supporto (date, foto, testi, matricole...).
// HELPER: DATA LOCALE YYYY-MM-DD
export const getTodayString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// HELPER: COMPRESSIONE FOTO
// Le foto vengono salvate dentro il rapporto (Firebase: max ~1 MB per rapporto, max 3 foto).
// Ogni foto parte da 1600 pixel sul lato lungo e qualità alta; la qualità scende solo quanto
// serve per stare nel suo spazio (PHOTO_MAX_CHARS). Se non basta, la foto viene rimpicciolita
// a passi fino a 800 pixel (la risoluzione di prima). 3 foto + testo restano sotto il limite.
export const PHOTO_MAX_CHARS = 290000; // ~210 KB di JPEG per foto
const PHOTO_SIDES = [1600, 1400, 1200, 1000, 800];
const PHOTO_QUALITIES = [0.85, 0.78, 0.7, 0.62, 0.55];

const encodeAt = (img, maxSide, quality) => {
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
};

export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        try {
          const largest = Math.max(img.width, img.height);
          // niente ingrandimenti: le foto piccole restano della loro misura
          const sides = PHOTO_SIDES.filter((sd, i) => i === 0 || sd < largest);
          for (const side of sides) {
            for (const q of PHOTO_QUALITIES) {
              const data = encodeAt(img, side, q);
              if (data.length <= PHOTO_MAX_CHARS) return resolve(data);
            }
          }
          // ultima risorsa (foto estremamente dettagliate): 800 px, qualità più bassa
          resolve(encodeAt(img, 800, 0.4));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// HELPER: SPIEGA UN ERRORE (Firebase o generico) IN ITALIANO
export const describeError = (e) => {
  const code = (e && e.code) || "";
  if (code.includes("permission-denied"))
    return "permesso negato dal database.";
  if (code.includes("unavailable") || !navigator.onLine)
    return "nessuna connessione a internet. Riprova quando sei online.";
  if (code.includes("deadline-exceeded"))
    return "il server non ha risposto in tempo. Riprova.";
  if (code.includes("unauthenticated"))
    return "accesso scaduto. Ricarica l'app e riprova.";
  if (code.includes("not-found"))
    return "elemento non trovato (forse è già stato eliminato).";
  if (code.includes("invalid-argument") || code.includes("resource-exhausted"))
    return "dati troppo grandi (prova con meno foto).";
  return (e && e.message) || "errore sconosciuto.";
};

// HELPER: TESTO SICURO DA INSERIRE IN UNA PAGINA HTML (report PDF)
export const escapeHtml = (value) =>
  String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// HELPER: CELLA CSV (gestisce virgole, virgolette e a capo)
export const csvCell = (value) =>
  `"${String(value === undefined || value === null ? "" : value).replace(
    /"/g,
    '""'
  )}"`;

// HELPER GLOBALE PER TECNICI MULTIPLI
export const getTechsString = (log) => {
  if (!log.additionalTechnicians || log.additionalTechnicians.length === 0)
    return log.technician;
  return `${log.technician}, ${log.additionalTechnicians.join(", ")}`;
};

// HELPER GLOBALE PER LA PORTATA
export const formatCapacity = (val) => {
  if (!val) return "";
  const s = String(val).trim();
  if (s.toLowerCase().endsWith("kg")) return s;
  return `${s} kg`;
};

// ESTRAE SOLO LA MATRICOLA (Nascodendo l'ID composto del DB)
export const getSafeMatricola = (m) => {
  if (m.matricola) return m.matricola;
  if (m.id && m.id.includes("_")) {
    return m.id.substring(m.id.indexOf("_") + 1).toUpperCase();
  }
  return m.id ? m.id.toUpperCase() : "N.D.";
};

// DISTANZA DI LEVENSHTEIN (Ricerca duplicati)
export const getLevenshteinDistance = (a, b) => {
  if (!a || !b) return (a || b).length;
  if (a === b) return 0;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// PORTATE SUGGERITE: le più inserite negli interventi, in ordine di utilizzo.
// "2000", "2000 kg", "2.000 kg" contano come la stessa portata.
export const DEFAULT_CAPACITIES = [
  "250 kg",
  "500 kg",
  "1000 kg",
  "2000 kg",
  "3200 kg",
  "5000 kg",
  "10000 kg",
];
export const normalizeCapacity = (value) => {
  const s = String(value === undefined || value === null ? "" : value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const m = s.match(/^(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(?:kg)?$/);
  if (!m) return null;
  const n = parseInt(m[1].replace(/[.,]/g, ""), 10);
  return n > 0 ? `${n} kg` : null;
};
export const getSuggestedCapacities = (logs, max = 7) => {
  const counts = {};
  (logs || []).forEach((l) => {
    const c = normalizeCapacity(l && l.capacity);
    if (c) counts[c] = (counts[c] || 0) + 1;
  });
  const used = Object.entries(counts)
    .sort(([a, x], [b, y]) => y - x || parseInt(a, 10) - parseInt(b, 10))
    .map(([c]) => c)
    .slice(0, max);
  const fill = DEFAULT_CAPACITIES.filter((c) => !used.includes(c));
  return [...used, ...fill].slice(0, max);
};
