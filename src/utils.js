// Funzioni di supporto (date, foto, testi, matricole...).
// HELPER: DATA LOCALE YYYY-MM-DD
export const getTodayString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// HELPER: COMPRESSIONE FOTO (Sicura per Firestore 1MB limit)
export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800; // Ridimensionamento intelligente
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.5)); // Qualità bilanciata
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
