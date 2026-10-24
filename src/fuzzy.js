// RICERCA CHE PERDONA GLI ERRORI DI BATTITURA
// «rosi» trova Rossi, «biachi» Bianchi, «colomo» Colombo, «perche» trova «perché».
//  - minuscole e accenti non contano
//  - ogni parola scritta deve esserci (anche solo l'inizio: «bian» trova Bianchi)
//  - dalle 4 lettere in su si perdona 1 errore (lettera sbagliata, mancante, in più o due scambiate);
//    dalle 7 lettere in su 2 errori
//  - i numeri (N. assistenza, matricole) devono essere giusti: niente «quasi uguale»

export const simplify = (s) =>
  String(s == null ? "" : s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

// parole cercate: «Mario  Rossi» → ["mario", "rossi"]
export const queryWords = (q) => simplify(q).split(/[^a-z0-9]+/).filter(Boolean);

// distanza tra due parole (quante correzioni servono), con un tetto per fare in fretta
export const editDistance = (a, b, max = 2) => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = a.length;
  const m = b.length;
  let prev2 = null;
  let prev = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      // due lettere scambiate («rsosi»)
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[m];
};

const cache = new Map();
const prep = (text) => {
  let x = cache.get(text);
  if (!x) {
    const s = simplify(text);
    x = { joined: s.replace(/[^a-z0-9]/g, ""), words: s.split(/[^a-z0-9]+/).filter(Boolean) };
    if (cache.size > 6000) cache.clear();
    cache.set(text, x);
  }
  return x;
};

const allowed = (t) => (/^\d+$/.test(t) ? 0 : t.length >= 7 ? 2 : t.length >= 4 ? 1 : 0);

// 2 = trovata giusta, 1 = trovata «quasi» (errore di battitura), 0 = non c'è
const wordScore = (t, p) => {
  if (p.joined.includes(t)) return 2;
  const max = allowed(t);
  if (!max) return 0;
  for (const w of p.words) {
    if (w.length + max < t.length) continue;
    // di solito la prima lettera è giusta (o scambiata con la seconda): salta le altre parole, è molto più veloce
    if (w[0] !== t[0] && !(w[0] === t[1] && w[1] === t[0])) continue;
    // la parola intera o il suo inizio (si cerca mentre si scrive)
    for (let L = Math.max(1, t.length - max); L <= Math.min(w.length, t.length + max); L++) {
      if (editDistance(t, w.slice(0, L), max) <= max) return 1;
    }
  }
  return 0;
};

// punteggio di un testo per le parole cercate: 0 = non va bene; più alto = più giusto
export const fuzzyScore = (words, text) => {
  if (!words.length) return 2;
  const p = prep(String(text == null ? "" : text));
  let score = 0;
  for (const t of words) {
    const s = wordScore(t, p);
    if (!s) return 0;
    score += s;
  }
  return score / words.length;
};

export const fuzzyMatch = (words, text) => fuzzyScore(words, text) > 0;

// filtra una lista: prima quelli scritti giusti, poi quelli «quasi»; a parità resta l'ordine di prima
export const fuzzyFilter = (list, q, textOf) => {
  const words = Array.isArray(q) ? q : queryWords(q);
  if (!words.length) return list;
  const out = [];
  list.forEach((x, i) => {
    const s = fuzzyScore(words, textOf(x));
    if (s) out.push([s, i, x]);
  });
  out.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  return out.map((o) => o[2]);
};
