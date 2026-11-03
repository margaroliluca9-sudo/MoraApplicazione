// CONTROLLO FUNE E CATENA: cosa dice la norma, dai numeri che misura il tecnico (La mia area → «Fune e catena»).
// Tutto dentro l'app: funziona anche senza rete. Valori della norma; fa sempre fede il manuale del costruttore.
//
// FUNI — ISO 4309:2017 (Gru — Funi metalliche — Cura, manutenzione, ispezione e scarto)
//   Tabella 3: fili rotti visibili per funi a uno strato di trefoli («single-layer») e a trefoli paralleli
//   Tabella 4: fili rotti visibili per funi antigiro
//   Tabella 5: diminuzione uniforme del diametro (rispetto al diametro di riferimento)
//   I valori della Tab. 3 sono per meccanismi M1–M4 o classe non nota (la norma ammette il doppio per M5–M8:
//   qui teniamo i valori più prudenti). Gravità: 20/40/60/80/100% (100% = scarto). Valutazione combinata
//   (Allegato G): si sommano le gravità di fili rotti e diametro nello stesso tratto.
// CATENE — usura della maglia dm = (d1+d2)/2 misurata nel punto di contatto tra le maglie, perpendicolari:
//   scarto se dm < 0,9·d nominale (usura > 10%) — EN 818-6 (imbracature) e criteri dei costruttori delle catene
//   da paranco (EN 818-7). Passo di una maglia +5%; catena da paranco: su 11 maglie +2%.

// ---------------------------------------------------------------- FUNI
// n = fili portanti dei trefoli esterni (si contano solo i fili esterni portanti, non quelli di riempimento)
export const ROPES = [
  { id: "6x7", label: "6×7", n: 42, rr: false },
  { id: "6x19", label: "6×19 (Seale, Warrington, Filler)", n: 114, rr: false },
  { id: "6x26", label: "6×26 WS", n: 156, rr: false },
  { id: "6x31", label: "6×31 WS", n: 186, rr: false },
  { id: "6x36", label: "6×36 WS", n: 216, rr: false },
  { id: "6x41", label: "6×41 WS", n: 246, rr: false },
  { id: "8x19", label: "8×19 (Seale, Warrington, Filler)", n: 152, rr: false },
  { id: "8x26", label: "8×26 WS", n: 208, rr: false },
  { id: "8x31", label: "8×31 WS", n: 248, rr: false },
  { id: "8x36", label: "8×36 WS", n: 288, rr: false },
  { id: "18x7", label: "18×7 / 19×7 antigiro", n: 84, rr: true },
  { id: "35x7", label: "35×7 / 35(W)×7 antigiro", n: 112, rr: true },
  { id: "altra", label: "Altra fune (scrivo io n)", n: 0, rr: false },
  { id: "altra-rr", label: "Altra fune antigiro (scrivo io n)", n: 0, rr: true },
];

// Tab. 3 ISO 4309:2017 — [n massimo, RCN, crociata 6d, crociata 30d, parallela 6d, parallela 30d, più strati 6d, più strati 30d]
const T3 = [
  [50, "01", 2, 4, 1, 2, 4, 8],
  [75, "02", 3, 6, 2, 3, 6, 12],
  [100, "03", 4, 8, 2, 4, 8, 16],
  [120, "04", 5, 10, 2, 5, 10, 20],
  [140, "05", 6, 11, 3, 6, 12, 22],
  [160, "06", 6, 13, 3, 6, 12, 26],
  [180, "07", 7, 14, 4, 7, 14, 28],
  [200, "08", 8, 16, 4, 8, 16, 32],
  [220, "09", 9, 18, 4, 9, 18, 36],
  [240, "10", 10, 19, 5, 10, 20, 38],
  [260, "11", 10, 21, 5, 10, 20, 42],
  [280, "12", 11, 22, 6, 11, 22, 44],
  [300, "13", 12, 24, 6, 12, 24, 48],
];
// Tab. 4 ISO 4309:2017 (antigiro) — [n massimo, RCN, a caso 6d, a caso 30d, più strati 6d, più strati 30d]
const T4 = [
  [100, "23-1", 2, 4, 4, 8],
  [120, "23-2", 3, 5, 5, 10],
  [140, "23-3", 3, 5, 6, 11],
  [160, "24", 3, 6, 6, 13],
  [180, "25", 4, 7, 7, 14],
  [200, "26", 4, 8, 8, 16],
  [220, "27", 4, 9, 9, 18],
  [240, "28", 5, 10, 10, 19],
  [260, "29", 5, 10, 10, 21],
  [280, "30", 6, 11, 11, 22],
  [300, "31", 6, 12, 12, 24],
];

// limiti di fili rotti: { rcn, six, thirty }
export const wireLimits = ({ n, rr, lay = "crociata", layers = "uno" }) => {
  const N = Math.max(1, Math.round(Number(n) || 0));
  if (rr) {
    const row = T4.find((r) => N <= r[0]);
    if (!row) return layers === "piu" ? { rcn: "31+", six: 12, thirty: 24 } : { rcn: "31+", six: 6, thirty: 12 };
    return layers === "piu" ? { rcn: row[1], six: row[4], thirty: row[5] } : { rcn: row[1], six: row[2], thirty: row[3] };
  }
  const row = T3.find((r) => N <= r[0]);
  if (!row) {
    // oltre 300 fili: in proporzione (arrotondato per difetto: più prudente)
    const k = layers === "piu" ? [0.08, 0.16] : lay === "parallela" ? [0.02, 0.04] : [0.04, 0.08];
    return { rcn: "oltre 13", six: Math.floor(k[0] * N), thirty: Math.floor(k[1] * N) };
  }
  if (layers === "piu") return { rcn: row[1], six: row[6], thirty: row[7] };
  return lay === "parallela" ? { rcn: row[1], six: row[4], thirty: row[5] } : { rcn: row[1], six: row[2], thirty: row[3] };
};

// Tab. 5 ISO 4309:2017 — diminuzione uniforme del diametro: soglie per 20/40/60/80/100%
const T5 = {
  tessile: [6, 7, 8, 9, 10], // un trefolo di strati, anima tessile
  metallica: [3.5, 4.5, 5.5, 6.5, 7.5], // anima metallica o trefoli paralleli
  antigiro: [1, 2, 3, 4, 5],
};
export const diamSeverity = (pct, kind) => {
  const t = T5[kind] || T5.metallica;
  let sev = 0;
  t.forEach((lim, i) => {
    if (pct >= lim) sev = (i + 1) * 20;
  });
  return { sev, limit: t[4] };
};

// gravità dei fili rotti (percentuale del limite, a scatti di 20 come la norma)
const wireSeverity = (count, limit) => {
  if (!(count > 0) || !(limit > 0)) return 0;
  const r = count / limit;
  if (r >= 1) return 100;
  return Math.floor(r * 5) * 20;
};

// «NON SO COM'È FATTA»: il tecnico guarda solo quanti trefoli vede fuori (6, 8 o tanti = antigiro) e, se riesce,
// come stanno i fili sulla superficie. Si prende la fune più delicata di quel tipo (meno fili esterni =
// limiti più bassi), cordatura parallela se non si sa, anima metallica (calo del diametro più stretto):
// così il verdetto è sempre dalla parte della sicurezza.
export const GUESS = {
  6: { n: 114, rr: false, label: "6 trefoli (si conta come 6×19)" },
  8: { n: 152, rr: false, label: "8 trefoli (si conta come 8×19)" },
  tanti: { n: 84, rr: true, label: "tanti trefoli: antigiro (si conta come 18×7)" },
};
export const guessRope = (x) => {
  const g = GUESS[x.strands] || GUESS[6];
  return { n: g.n, rr: g.rr, lay: x.lay === "crociata" ? "crociata" : "parallela", core: "metallica", layers: x.layers === "piu" ? "piu" : "uno", label: g.label };
};

export const checkRope = (x0) => {
  const auto = x0.mode !== "so";
  const g = auto ? guessRope(x0) : null;
  const x = auto ? { ...x0, lay: g.lay, core: g.core, layers: g.layers } : x0;
  const rope = auto ? { n: g.n, rr: g.rr, label: g.label } : ROPES.find((r) => r.id === x.rope) || ROPES[0];
  const n = rope.n || Number(x.n) || 0;
  const rr = rope.rr;
  const d = Number(String(x.d || "").replace(",", ".")) || 0;
  const dRef = Number(String(x.dRef || "").replace(",", ".")) || d;
  const dMis = Number(String(x.dMis || "").replace(",", ".")) || 0;
  const lim = wireLimits({ n, rr, lay: x.lay, layers: x.layers });
  const b6 = Math.max(0, Number(x.b6) || 0);
  const b30 = Math.max(0, Number(x.b30) || 0);
  const s6 = wireSeverity(b6, lim.six);
  const s30 = wireSeverity(b30, lim.thirty);
  const wire = Math.max(s6, s30);
  const kind = rr ? "antigiro" : x.core === "tessile" ? "tessile" : "metallica";
  // arrotondato al centesimo (12 → 11,4 mm deve fare 5%, non 4,9999%)
  const dec = dRef > 0 && dMis > 0 ? Math.max(0, Math.round(((dRef - dMis) / dRef) * 10000) / 100) : null;
  const dia = dec == null ? null : diamSeverity(dec, kind);
  const flags = Object.keys(x.flags || {}).filter((k) => x.flags[k]);
  const combined = Math.min(100, wire + (dia ? dia.sev : 0));
  const discard = wire >= 100 || (dia && dia.sev >= 100) || combined >= 100 || flags.length > 0;
  const worst = Math.max(wire, dia ? dia.sev : 0, combined);
  // se non si sa la cordatura: anche il limite che varrebbe con la crociata (più comune), per informazione
  const limCross = auto && !rr && x0.lay !== "crociata" ? wireLimits({ n, rr, lay: "crociata", layers: x.layers }) : null;
  return {
    auto,
    guess: g,
    limCross,
    n,
    rr,
    lim,
    len6: d ? Math.round(6 * d) : null,
    len30: d ? Math.round(30 * d) : null,
    b6,
    b30,
    s6,
    s30,
    dec,
    dia,
    kind,
    combined,
    flags,
    discard,
    level: discard ? "scarto" : worst >= 60 ? "attenzione" : "ok",
  };
};

export const ROPE_FLAGS = [
  ["valle", "2 o più fili rotti nella «valle» tra i trefoli in un passo di cordatura (circa 6d)"],
  ["terminale", "2 o più fili rotti vicino alla terminazione (capocorda, morsetto, redancia)"],
  ["locale", "Diametro che cala in un punto solo (anima rotta o schiacciata)"],
  ["deforma", "Deformazioni gravi: gabbia d'uccello, nodo, asola, schiacciamento"],
];

// ---------------------------------------------------------------- CATENE
export const checkChain = (x) => {
  const num = (v) => Number(String(v || "").replace(",", ".")) || 0;
  const d = num(x.d);
  const d1 = num(x.d1);
  const d2 = num(x.d2) || d1;
  const dm = d1 ? (d1 + d2) / 2 : 0;
  const wear = d && dm ? Math.max(0, Math.round(((d - dm) / d) * 10000) / 100) : null;
  const t = num(x.t);
  const t1 = num(x.t1);
  const t11 = num(x.t11);
  const p1 = t && t1 ? Math.round(((t1 - t) / t) * 10000) / 100 : null;
  const p11 = t && t11 ? Math.round(((t11 - 11 * t) / (11 * t)) * 10000) / 100 : null;
  const hoist = x.kind !== "imbracatura";
  const flags = Object.keys(x.flags || {}).filter((k) => x.flags[k]);
  const out = [];
  if (wear != null) out.push({ id: "usura", label: "Usura della maglia", value: wear, limit: 10, bad: wear > 10 });
  if (p1 != null) out.push({ id: "passo", label: "Allungamento di una maglia", value: p1, limit: 5, bad: p1 > 5 });
  if (hoist && p11 != null) out.push({ id: "passo11", label: "Allungamento su 11 maglie", value: p11, limit: 2, bad: p11 > 2 });
  const discard = out.some((o) => o.bad) || flags.length > 0;
  const near = out.some((o) => o.value >= o.limit * 0.7);
  return { d, dm, wear, minDm: d ? 0.9 * d : null, p1, p11, hoist, checks: out, flags, discard, level: discard ? "scarto" : near ? "attenzione" : "ok" };
};

export const CHAIN_FLAGS = [
  ["cricche", "Cricche, tagli, intagli o segni di saldatura"],
  ["piegata", "Maglie piegate, ritorte, schiacciate o allungate a vista"],
  ["calore", "Segni di surriscaldamento o corrosione profonda"],
  ["gancio", "Gancio aperto, deformato o sicura che non chiude"],
];
