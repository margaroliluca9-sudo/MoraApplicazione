// DISEGNO DELLA SEZIONE DI UNA FUNE dalla sua costruzione («6x36WS+IWRC», «8xK26WS+EPIWRC», «35xK7», «6(9+9+1)S+FC»).
// È un disegno INDICATIVO fatto dall'app (non è il disegno del catalogo FAS): trefoli, fili per strato e anima.
// Restituisce cerchi in coordinate da -1 a 1: { x, y, r, t } con t = "strand" (il trefolo) | "wire" | "fiber" | "plastic".
// Lo usano la pagina Fune e catena (SVG) e il verbale PDF (src/pdf.js).

// strati di fili dentro un trefolo (dal centro verso fuori)
const ringsOf = (w, kind, paren) => {
  if (paren) return paren;
  const W = Number(w) || 7;
  const k = String(kind || "").toUpperCase();
  if (W === 7) return [1, 6];
  if (W === 17) return [1, 8, 8];
  if (W === 19) return k === "S" ? [1, 9, 9] : [1, 6, 12];
  if (W === 25) return [1, 6, 6, 12];
  if (W === 26) return [1, 5, 10, 10]; // Warrington-Seale: 1 + 5 + (5+5) + 10
  if (W === 31) return [1, 6, 12, 12];
  if (W === 36) return [1, 7, 14, 14];
  if (W === 41) return [1, 8, 16, 16];
  // altro: strati da 6, 12, 18… finché bastano
  const out = [1];
  let left = W - 1;
  for (let i = 1; left > 0; i++) {
    const n = Math.min(left, 6 * i);
    out.push(n);
    left -= n;
  }
  return out;
};

export const parseCons = (cons) => {
  const s = String(cons || "").toUpperCase().replace(/\s+/g, "").replace("×", "X");
  const m = s.match(/^(\d+)(?:\(([\d+]+)\))?X?(K)?(\d+)?([A-Z]*?)(?:\+(.+))?$/);
  if (!m) return null;
  const N = Number(m[1]);
  const paren = m[2] ? m[2].split("+").map(Number).reverse() : null;
  const W = paren ? paren.reduce((a, b) => a + b, 0) : Number(m[4]) || 7;
  const kind = m[5] || "";
  const core = m[6] || "";
  return { N, W, kind, compact: !!m[3], core, paren };
};

// descrizione a parole della costruzione
export const describeCons = (cons) => {
  const p = parseCons(cons);
  if (!p) return "";
  const kindName = { S: "Seale", W: "Warrington", WS: "Warrington-Seale", F: "Filler", KKWS: "Warrington-Seale" }[p.kind] || "";
  const coreName = /EPIWRC/.test(p.core) ? "anima metallica rivestita di plastica" : /PWRC|IWRC/.test(p.core) ? "anima metallica" : /FC|PP/.test(p.core) ? "anima tessile (fibra o polipropilene)" : "";
  if (p.N >= 12 && !p.core) return `Fune antigiro: ${p.N} trefoli da ${p.W} fili${p.compact ? " compattati" : ""} su più strati, girati in senso opposto`;
  if (p.N === 7 && !p.core) return `7 trefoli da ${p.W} fili: 6 intorno a uno centrale (anima metallica)`;
  return `${p.N} trefoli da ${p.W} fili${kindName ? ` (${kindName})` : ""}${p.compact ? ", trefoli compattati" : ""}${coreName ? `, ${coreName}` : ""}`;
};

// i fili di un trefolo di centro (cx, cy) e raggio s: ogni strato tocca quello sotto e i fili si toccano tra loro
const strand = (out, cx, cy, s, rings) => {
  out.push({ x: cx, y: cy, r: s, t: "strand" });
  const layer = [{ R: 0, r: 1, n: 1 }];
  for (let j = 1; j < rings.length; j++) {
    const n = rings[j];
    const sin = Math.sin(Math.PI / n);
    const prev = layer[j - 1];
    const R = (prev.R + prev.r) / (1 - sin);
    layer.push({ R, r: R * sin, n });
  }
  const last = layer[layer.length - 1];
  const k = (s * 0.97) / (last.R + last.r);
  layer.forEach((L, j) => {
    if (j === 0) return out.push({ x: cx, y: cy, r: L.r * k * 0.95, t: "wire" });
    const off = j % 2 ? 0 : Math.PI / L.n;
    for (let i = 0; i < L.n; i++) {
      const a = off + (i * 2 * Math.PI) / L.n;
      out.push({ x: cx + L.R * k * Math.cos(a), y: cy + L.R * k * Math.sin(a), r: L.r * k * 0.95, t: "wire" });
    }
  });
};

export const ropeSection = (cons) => {
  const p = parseCons(cons);
  if (!p || !(p.N > 0)) return [];
  const out = [];
  const rings = ringsOf(p.W, p.kind, p.paren);
  // antigiro: più strati di trefoli tutti uguali (1 + 6 + …)
  if (p.N >= 12 && !p.core) {
    const R = p.N - 7;
    const layers = R <= 12 ? [1, 6, R] : [1, 6, R - Math.ceil(R * 0.57), Math.ceil(R * 0.57)];
    const L = layers.length;
    const s = 1 / (2 * L - 1);
    layers.forEach((n, k) => {
      if (k === 0) return strand(out, 0, 0, s * 0.97, rings);
      const rad = 2 * k * s;
      for (let i = 0; i < n; i++) {
        const a = (k % 2 ? 0 : Math.PI / n) + (i * 2 * Math.PI) / n;
        const ss = Math.min(s, rad * Math.sin(Math.PI / n)) * 0.97;
        strand(out, rad * Math.cos(a), rad * Math.sin(a), ss, rings);
      }
    });
    return out;
  }
  // trefoli intorno all'anima
  const N = p.N === 7 && !p.core ? 6 : p.N;
  const s = 1 / (1 + 1 / Math.sin(Math.PI / N)); // raggio del trefolo (tocca il bordo e i vicini)
  const Rc = 1 - s; // centro dei trefoli
  const core = Rc - s; // raggio dell'anima
  if (p.N === 7 && !p.core) strand(out, 0, 0, core * 0.97, rings);
  else if (/IWRC|PWRC/.test(p.core)) {
    if (/EPIWRC|PWRC/.test(p.core)) out.push({ x: 0, y: 0, r: core * 0.98, t: "plastic" });
    const cs = core * 0.8;
    const ss = cs / 3;
    strand(out, 0, 0, ss * 0.97, [1, 6]);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      strand(out, 2 * ss * Math.cos(a), 2 * ss * Math.sin(a), ss * 0.97, [1, 6]);
    }
  } else out.push({ x: 0, y: 0, r: core * 0.96, t: "fiber" });
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
    strand(out, Rc * Math.cos(a), Rc * Math.sin(a), s * 0.98, rings);
  }
  return out;
};

// la costruzione di una fune nota (catalogo FAS o costruzione scritta) → stringa per il disegno
export const consOf = ({ fam = null, rope = null } = {}) => {
  if (fam && fam.cons && fam.cons[0]) return fam.cons[0];
  if (rope && rope.id) {
    const id = String(rope.id);
    if (/^6x36$|^6x26$|^6x41$|^8x26$|^8x36$/.test(id)) return id + "WS+IWRC";
    if (/^6x19$|^8x19$/.test(id)) return id + "S+IWRC";
    if (/^6x19wf$|^8x19wf$/.test(id)) return id.slice(0, 4) + "W+IWRC";
    return id;
  }
  return "";
};
