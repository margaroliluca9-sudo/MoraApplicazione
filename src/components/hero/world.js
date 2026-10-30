// IL MONDO DEL CIELO IN HOME (disegnato su <canvas>, vivo mentre lo guardi)
//  - cielo che segue l'ora vera minuto per minuto (alba, giorno, tramonto, notte), sole e luna
//    con la fase vera, stelle; sfumatura diversa a ogni apertura
//  - tempo che cambia da solo mentre l'app è aperta: sereno → nuvole → pioggia → temporale →
//    arcobaleno…; nebbia, vento con le foglie, neve d'inverno
//  - carroponte con la fisica: il carrello accelera e frena, il bozzello dondola come un pendolo
//    vero (più lunga la fune, più lento il dondolio). Lavora da solo: sposta casse, bobine, travi,
//    carica e scarica i camion che arrivano. Di notte luci di lavoro e lampeggiante.
//  - il tecnico può guidarlo: trascina il dito = sposta il carrello; tocco = il gancio scende,
//    aggancia (o sgancia) e risale
//  - sorprese a caso ogni pochi secondi: aerei, elicottero, stormi, un uccellino che si posa sulla
//    trave, palloncini, mongolfiere, stelle cadenti, fuochi d'artificio, aurora, un gatto, il
//    muletto, scintille di saldatura, folate di vento… e raramente un disco volante
//  - feste: lucine a Natale (e una slitta di notte), pipistrelli e zucca ad Halloween, lucciole
//    e farfalle d'estate; traguardi: coriandoli
// Coordinate del mondo: 400 x 150, terra a y = 146. Il disegno si allinea a destra (come
// preserveAspectRatio "xMaxYMax slice"), così la gru sta sempre a destra del testo.

export const VW = 400;
export const VH = 150;
const GROUND = 146;
const LMIN = 12;
const LMAX = 62;
const BLOCK = 18; // bozzello + gancio
const SLING = 5;

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const pickW = (w) => {
  const list = Object.entries(w).filter(([, v]) => v > 0);
  if (!list.length) return null;
  let x = Math.random() * list.reduce((a, [, v]) => a + v, 0);
  for (const [k, v] of list) if ((x -= v) < 0) return k;
  return list[list.length - 1][0];
};
const rr = (c, x, y, w, h, r) => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
};

// CIELO: colori (alto, metà, basso) lungo la giornata
const SKY_KEYS = [
  [0, "#020617", "#0f172a", "#1e293b"],
  [4.6, "#0b1026", "#1e1b4b", "#312e81"],
  [5.6, "#1e1b4b", "#6d28d9", "#f472b6"],
  [6.6, "#3b82f6", "#f9a8d4", "#fde68a"],
  [8, "#38bdf8", "#bae6fd", "#fef3c7"],
  [12, "#0ea5e9", "#7dd3fc", "#e0f2fe"],
  [16, "#3b82f6", "#93c5fd", "#fde68a"],
  [17.8, "#6d28d9", "#f97316", "#fcd34d"],
  [19, "#312e81", "#be185d", "#fb923c"],
  [20.3, "#0f172a", "#312e81", "#7c3aed"],
  [21.4, "#020617", "#0f172a", "#1e293b"],
  [24, "#020617", "#0f172a", "#1e293b"],
].map(([h, a, b, c]) => [h, hex(a), hex(b), hex(c)]);
const skyAt = (h) => {
  let i = 0;
  while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1][0] <= h) i++;
  const [h0, a0, b0, c0] = SKY_KEYS[i];
  const [h1, a1, b1, c1] = SKY_KEYS[i + 1];
  const t = clamp((h - h0) / (h1 - h0), 0, 1);
  const s = t * t * (3 - 2 * t);
  return [mix(a0, a1, s), mix(b0, b1, s), mix(c0, c1, s)];
};
// 0 di giorno, 1 di notte
export const nightAt = (h) => (h < 4.6 || h >= 21.4 ? 1 : h < 7 ? 1 - (h - 4.6) / 2.4 : h < 17.6 ? 0 : (h - 17.6) / 3.8);
// fase della luna vera: 0 nuova, 0.5 piena
export const moonPhase = (d) => {
  const days = (d.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  return (((days / 29.530588853) % 1) + 1) % 1;
};

const TINTS = [null, null, "#f472b6", "#a78bfa", "#2dd4bf", "#fbbf24", "#60a5fa", "#fb7185"];
const GIRDERS = ["#f2b705", "#ef4444", "#f97316", "#22c55e", "#3b82f6", "#a855f7", "#14b8a6", "#e11d48", "#eab308"];
const TRUCKS = ["#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#f8fafc", "#7c3aed", "#0f766e"];
const PARTY = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#fde047"];

export const WEATHERS = ["sereno", "nuvoloso", "pioggia", "temporale", "nebbia", "vento", "neve", "arcobaleno"];
export const BACKS = ["capannone", "citta", "colline", "montagne"];
const WX = {
  sereno: { cloud: 0.15, rain: 0, storm: 0, fog: 0, snow: 0, wind: 0.1 },
  nuvoloso: { cloud: 0.8, rain: 0, storm: 0, fog: 0, snow: 0, wind: 0.25 },
  pioggia: { cloud: 0.95, rain: 0.7, storm: 0, fog: 0, snow: 0, wind: 0.3 },
  temporale: { cloud: 1, rain: 1, storm: 1, fog: 0, snow: 0, wind: 0.6 },
  nebbia: { cloud: 0.35, rain: 0, storm: 0, fog: 1, snow: 0, wind: 0 },
  vento: { cloud: 0.45, rain: 0, storm: 0, fog: 0, snow: 0, wind: 1 },
  neve: { cloud: 0.85, rain: 0, storm: 0, fog: 0, snow: 0.9, wind: 0.15 },
  arcobaleno: { cloud: 0.4, rain: 0, storm: 0, fog: 0, snow: 0, wind: 0.15 },
};

// OGGETTI DA SOLLEVARE
const KINDS = {
  cassa: { w: 14, h: 10 },
  bobina: { w: 16, h: 10 },
  trave: { w: 30, h: 5 },
  sacco: { w: 12, h: 11 },
  motore: { w: 13, h: 9 },
  cisterna: { w: 18, h: 10 },
};
const KIND_LIST = Object.keys(KINDS);
const newObj = (kind = pick(KIND_LIST)) => ({ kind, ...KINDS[kind], tone: Math.random() });
const drawObj = (c, o, x, y, night) => {
  const { w, h } = o;
  const l = x - w / 2;
  const t = y - h;
  const sh = night ? 0.55 : 1;
  c.lineWidth = 0.7;
  if (o.kind === "cassa") {
    c.fillStyle = rgba(mix([180, 83, 9], [146, 64, 14], o.tone), sh);
    c.fillRect(l, t, w, h);
    c.strokeStyle = rgba([120, 53, 15], 1);
    c.strokeRect(l, t, w, h);
    c.beginPath();
    c.moveTo(l, t + h / 3);
    c.lineTo(l + w, t + h / 3);
    c.moveTo(l, t + (2 * h) / 3);
    c.lineTo(l + w, t + (2 * h) / 3);
    c.moveTo(l + 3, t);
    c.lineTo(l + 3, t + h);
    c.moveTo(l + w - 3, t);
    c.lineTo(l + w - 3, t + h);
    c.stroke();
  } else if (o.kind === "bobina") {
    c.fillStyle = rgba([148, 163, 184], sh);
    rr(c, l, t, w, h, 3);
    c.fill();
    c.strokeStyle = "#475569";
    c.stroke();
    c.fillStyle = rgba([203, 213, 225], sh);
    c.beginPath();
    c.ellipse(l + w, t + h / 2, 2.6, h / 2, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.strokeStyle = "rgba(71,85,105,.6)";
    for (let i = 1; i < 4; i++) {
      c.beginPath();
      c.moveTo(l + 2, t + (i * h) / 4);
      c.lineTo(l + w - 2, t + (i * h) / 4);
      c.stroke();
    }
  } else if (o.kind === "trave") {
    c.fillStyle = rgba([71, 85, 105], sh);
    c.fillRect(l, t, w, 1.4);
    c.fillRect(l, t + h - 1.4, w, 1.4);
    c.fillStyle = rgba([100, 116, 139], sh);
    c.fillRect(l, t + 1.4, w, h - 2.8);
  } else if (o.kind === "sacco") {
    c.fillStyle = rgba([248, 250, 252], sh);
    c.beginPath();
    c.moveTo(l, t + 1);
    c.lineTo(l + w, t + 1);
    c.lineTo(l + w + 1, t + h - 1);
    c.quadraticCurveTo(x, t + h + 1.5, l - 1, t + h - 1);
    c.closePath();
    c.fill();
    c.strokeStyle = "#94a3b8";
    c.stroke();
  } else if (o.kind === "motore") {
    c.fillStyle = rgba([37, 99, 235], sh);
    rr(c, l, t, w, h, 1.5);
    c.fill();
    c.fillStyle = rgba([30, 64, 175], sh);
    for (let i = 0; i < 4; i++) c.fillRect(l + 2 + i * 2.6, t + 1.5, 1.2, h - 3);
    c.fillStyle = "#94a3b8";
    c.fillRect(l + w, t + h / 2 - 1, 2.5, 2);
  } else {
    c.fillStyle = rgba(mix([22, 163, 74], [234, 88, 12], o.tone), sh);
    rr(c, l, t, w, h, 4);
    c.fill();
    c.strokeStyle = "rgba(0,0,0,.35)";
    c.stroke();
    c.fillStyle = "rgba(255,255,255,.35)";
    c.fillRect(l + 3, t + 2, w - 6, 1.2);
  }
};

// PIAZZOLE (sinistra, destra) e baia del camion in mezzo
export const CRANES = ["portale", "carroponte", "monotrave", "semiportale", "bandiera"];
// geometria di ogni tipo: corsa del carrello, da dove scendono le funi, piazzole
const GEO = {
  portale: { xmin: 276, xmax: 372, py: 80, pads: [282, 364], top: 78, gx: [252, 392] },
  carroponte: { xmin: 274, xmax: 372, py: 80, pads: [282, 364], top: 77, gx: [256, 384] },
  semiportale: { xmin: 276, xmax: 372, py: 80, pads: [282, 364], top: 78, gx: [252, 392] },
  monotrave: { xmin: 272, xmax: 372, py: 92, pads: [282, 364], top: 78, gx: [256, 384] },
  bandiera: { xmin: 306, xmax: 372, py: 88, pads: [314, 362], noTruck: true, top: 74, gx: [296, 386] },
};
const BAY_STOP = 296; // posizione del camion fermo (inizio del cassone)
const BED_LEN = 44;

export class HeroWorld {
  constructor({ now = new Date(), force = [], season = "normale", weekend = false, party = false, onSay = () => {}, onTone = () => {} } = {}) {
    this.t = 0;
    this.clock0 = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    this.month = now.getMonth();
    this.season = season;
    this.weekend = weekend;
    this.party = party;
    this.say = onSay;
    this.onTone = onTone;
    this.force = force;
    const f = (k) => force.includes(k);
    this.back = BACKS.find(f) || pickW({ capannone: 35, citta: 25, colline: 20, montagne: 20 });
    this.girder = pick(GIRDERS);
    this.tint = pick(TINTS);
    this.tintK = rnd(0.08, 0.18);
    this.phase = moonPhase(now);
    this.capodanno = (this.month === 11 && now.getDate() === 31) || (this.month === 0 && now.getDate() === 1);
    this.ferragosto = this.month === 7 && now.getDate() === 15;
    const h = this.clock0;
    const night = nightAt(h);
    const winter = this.month === 11 || this.month <= 1;
    const summer = this.month >= 5 && this.month <= 7;
    this.w0 =
      WEATHERS.find(f) ||
      pickW({
        sereno: 30,
        nuvoloso: 20,
        pioggia: summer ? 5 : 10,
        temporale: winter ? 0 : summer ? 8 : 4,
        nebbia: night > 0.5 || summer ? 0 : winter ? 12 : 7,
        vento: 10,
        neve: winter ? 22 : this.month === 10 || this.month === 2 ? 3 : 0,
        arcobaleno: night < 0.3 ? 5 : 0,
      });
    this.wName = this.w0;
    this.wx = { ...WX[this.w0] };
    this.wT = { ...WX[this.w0] };
    this.wLock = WEATHERS.some(f) || f("fermo");
    this.nextWx = rnd(30, 60);
    this.rainbow = this.w0 === "arcobaleno" ? 1 : 0;
    this.rainbowT = this.rainbow;
    this.rainbowLeft = this.rainbow ? 40 : 0;
    this.stars = Array.from({ length: 80 }, () => ({ x: rnd(0, VW), y: rnd(0, 105), r: chance(0.15) ? 1.3 : 0.7, p: rnd(0, 6) }));
    this.clouds = [];
    const cn = this.cloudTarget();
    for (let i = 0; i < cn; i++) this.clouds.push(this.newCloud(rnd(-60, VW)));
    this.drops = [];
    this.flakes = [];
    this.leaves = [];
    this.parts = [];
    this.flash = 0;
    this.bolt = null;
    this.nextBolt = rnd(1.5, 5);
    this.gust = 0;
    this.city = [];
    for (let x = 228; x < VW + 20; ) {
      const w = rnd(14, 26);
      this.city.push({ x, w, h: rnd(22, 58), win: Array.from({ length: 24 }, () => chance(0.55)) });
      x += w + rnd(1, 4);
    }
    this.hills = [rnd(0, 6), rnd(0, 6)];
    // carroponte: tipo diverso a ogni apertura
    this.kind = CRANES.find(f) || pickW({ portale: 26, carroponte: 26, monotrave: 18, semiportale: 15, bandiera: 15 });
    const geo = GEO[this.kind];
    this.xmin = geo.xmin;
    this.xmax = geo.xmax;
    this.py = geo.py;
    this.pads = geo.pads;
    this.noTruck = !!geo.noTruck;
    this.gtop = geo.top;
    this.gx = geo.gx;
    this.cap = pick(["1 t", "2 t", "3,2 t", "5 t", "6,3 t", "10 t", "16 t"]);
    const x0 = rnd(this.xmin, this.xmax);
    this.cr = { x: x0, v: 0, a: 0, tx: x0, L: LMIN + rnd(0, 10), tL: LMIN, th: rnd(-0.2, 0.2), om: 0, load: null, moving: 0, contact: false };
    this.objs = [];
    const n = 1 + Math.floor(rnd(0, 3));
    for (let i = 0; i < n; i++) this.placeOnPad(newObj(), this.pads[i % 2]);
    if (chance(0.35) || f("carico")) this.cr.load = newObj(pick(["cassa", "bobina", "motore", "sacco"]));
    this.truck = null;
    this.nextTruck = this.noTruck ? 1e9 : f("camion") ? 0.5 : rnd(4, 14);
    this.jobs = [];
    this.wait = rnd(0.6, 1.6);
    this.userUntil = 0;
    this.ptr = null;
    this.ripples = [];
    this.events = [];
    this.nextEvent = 1.2;
    this.queue = force.filter((k) => EVENTS[k]);
    this.ambient = [];
    if (season === "halloween") this.ambient.push(bats());
    if (season === "autunno") this.ambient.push(fallingLeaves());
    if (season === "sanvalentino") this.ambient.push(risingHearts());
    if (season === "repubblica") this.ambient.push(frecceTricolori());
    if (summer) this.ambient.push(fireflies());
    this.confetti = party || season === "carnevale" ? 0.1 : -1; // traguardi e Carnevale: coriandoli
    this.tone = null;
    this.toneT = 0;
  }

  get hour() {
    return (this.clock0 + this.t / 3600) % 24;
  }
  describe() {
    return [this.w0, this.back, "gru-" + this.kind, this.cr.load ? "carico-" + this.cr.load.kind : "carico-niente", ...this.queue, this.season !== "normale" && this.season, this.weekend && "weekend", this.party && "traguardo"].filter(Boolean);
  }
  cloudTarget() {
    return Math.round(1 + this.wT.cloud * 8);
  }
  newCloud(x) {
    const depth = Math.random();
    const s = 0.5 + depth * 0.9;
    return { x, y: rnd(2, 52) + (1 - depth) * 4, s, depth, puffs: Array.from({ length: 3 + Math.floor(rnd(0, 3)) }, (_, i) => ({ dx: i * 14 + rnd(-4, 4), dy: rnd(-5, 3), r: rnd(8, 14) })), fade: 0 };
  }

  // ---- PIAZZOLE E OGGETTI ----
  stackOn(x) {
    return this.objs.filter((o) => Math.abs(o.x - x) < 6);
  }
  placeOnPad(o, pad) {
    const st = this.stackOn(pad);
    const y = st.length ? Math.min(...st.map((s) => s.y - s.h)) : GROUND;
    this.objs.push({ ...o, x: pad, y });
  }
  truckObjs() {
    if (!this.truck) return [];
    return this.truck.load.map((o) => ({ ...o, x: this.truck.x + o.ox, y: GROUND - 9 - (o.oy || 0), ref: o }));
  }
  // cosa c'è sotto il gancio: { top, obj }
  under(x) {
    let top = GROUND;
    let obj = null;
    for (const o of this.objs) if (Math.abs(o.x - x) < o.w / 2 + 1 && o.y - o.h < top) {
      top = o.y - o.h;
      obj = { o, from: "terra" };
    }
    if (this.truck) {
      const tx = this.truck.x;
      if (x > tx && x < tx + BED_LEN && GROUND - 9 < top) {
        top = GROUND - 9;
        obj = null;
      }
      for (const o of this.truckObjs()) if (Math.abs(o.x - x) < o.w / 2 + 1 && o.y - o.h < top) {
        top = o.y - o.h;
        obj = { o: o.ref, from: "camion" };
      }
    }
    return { top, obj };
  }
  lengthTo(bottomY) {
    const extra = this.cr.load ? SLING + this.cr.load.h : 0;
    return clamp(bottomY - this.py - BLOCK - extra, LMIN, LMAX);
  }
  hookX() {
    return this.cr.x + Math.sin(this.cr.th) * (this.cr.L + BLOCK);
  }
  attach() {
    const { obj } = this.under(this.cr.x);
    if (!obj || this.cr.load) return false;
    if (obj.from === "terra") this.objs = this.objs.filter((o) => o !== obj.o);
    else this.truck.load = this.truck.load.filter((o) => o !== obj.o);
    const { x, y, ox, oy, ...rest } = obj.o;
    this.cr.load = rest;
    this.dust(this.cr.x, y || GROUND - 9, 4);
    return true;
  }
  detach() {
    const o = this.cr.load;
    if (!o) return false;
    const x = this.cr.x;
    const { top } = this.under(x);
    const t = this.truck;
    if (t && x > t.x && x < t.x + BED_LEN && top <= GROUND - 9 + 0.5) t.load.push({ ...o, ox: x - t.x, oy: GROUND - 9 - top });
    else this.objs.push({ ...o, x, y: top });
    this.cr.load = null;
    this.dust(x, top, 6);
    return true;
  }
  dust(x, y, n) {
    for (let i = 0; i < n; i++) this.parts.push({ x: x + rnd(-6, 6), y, vx: rnd(-10, 10), vy: rnd(-8, -2), g: 4, life: 0.9, max: 0.9, c: [203, 213, 225], r: rnd(1, 2), layer: "front" });
  }
  freePad() {
    const ok = this.pads.filter((p) => this.stackOn(p).length < 2);
    return ok.length ? pick(ok) : null;
  }

  // ---- PILOTA AUTOMATICO ----
  plan() {
    const cr = this.cr;
    const t = this.truck;
    const J = [];
    const carry = (fromX, toX) => J.push({ k: "raise" }, { k: "move", x: fromX }, { k: "settle" }, { k: "lower" }, { k: "attach" }, { k: "raise" }, { k: "move", x: toX }, { k: "settle" }, { k: "lower" }, { k: "detach" }, { k: "raise" });
    const bedX = () => (t ? t.x + (t.load.length ? 31 : 13) : this.pads[0]);
    if (cr.load) {
      const to = t && t.state === "wait" && t.mode === "carico" && t.load.length < 2 ? bedX() : this.freePad();
      if (to != null) J.push({ k: "move", x: to }, { k: "settle" }, { k: "lower" }, { k: "detach" }, { k: "raise" });
      else J.push({ k: "move", x: 320 }, { k: "settle" }, { k: "lower" }, { k: "wait", s: 1 }, { k: "raise" });
    } else if (t && t.state === "wait" && t.mode === "carico" && t.load.length < t.cap && this.objs.length) {
      const top = this.objs.reduce((a, o) => (o.y - o.h < a.y - a.h ? o : a));
      carry(top.x, bedX());
    } else if (t && t.state === "wait" && t.mode === "scarico" && t.load.length && this.freePad() != null) {
      const o = t.load[t.load.length - 1];
      carry(t.x + o.ox, this.freePad());
    } else if (this.objs.length && chance(0.55)) {
      const o = this.objs.reduce((a, b) => (b.y - b.h < a.y - a.h && chance(0.5) ? b : a));
      const others = this.pads.filter((p) => Math.abs(p - o.x) > 6 && this.stackOn(p).length < 2);
      if (others.length) carry(o.x, pick(others));
    }
    if (!J.length) J.push({ k: "move", x: rnd(this.xmin, this.xmax) }, { k: "settle" }, ...(chance(0.6) ? [{ k: "lowerTo", L: rnd(26, 46) }, { k: "wait", s: rnd(0.4, 1.2) }, { k: "raise" }] : []));
    J.push({ k: "wait", s: rnd(1.2, 3.5) });
    this.jobs = J;
  }
  runJob(dt) {
    const cr = this.cr;
    const j = this.jobs[0];
    if (!j) return;
    j.t = (j.t || 0) + dt;
    let done = false;
    if (j.k === "move") {
      cr.tx = clamp(j.x, this.xmin, this.xmax);
      done = Math.abs(cr.x - cr.tx) < 0.5 && Math.abs(cr.v) < 1.2;
    } else if (j.k === "settle") done = (Math.abs(cr.th) < 0.035 && Math.abs(cr.om) < 0.12) || j.t > 2.2;
    else if (j.k === "lower") {
      const { top, obj } = this.under(cr.x);
      const bottom = cr.load ? top : obj ? top - SLING : top - 0.5;
      cr.tL = this.lengthTo(bottom);
      done = Math.abs(cr.L - cr.tL) < 0.35 || j.t > 6;
    } else if (j.k === "lowerTo") {
      cr.tL = clamp(j.L, LMIN, this.lengthTo(this.under(cr.x).top - 2));
      done = Math.abs(cr.L - cr.tL) < 0.4 || j.t > 5;
    } else if (j.k === "raise") {
      cr.tL = LMIN;
      done = cr.L - LMIN < 0.6 || j.t > 6;
    } else if (j.k === "attach") {
      const ok = this.attach();
      if (ok && j.user) this.buzz();
      done = true;
    } else if (j.k === "detach") {
      const ok = this.detach();
      if (ok && j.user) this.buzz();
      done = true;
    } else if (j.k === "toggle") {
      const ok = cr.load ? this.detach() : this.attach();
      if (ok) this.buzz();
      done = true;
    } else if (j.k === "wait") done = j.t >= j.s;
    if (done) this.jobs.shift();
  }
  buzz() {
    try {
      if (navigator.vibrate) navigator.vibrate(12);
    } catch (e) {
      // niente
    }
  }

  // ---- DITO ----
  pointerDown(wx, wy) {
    this.ptr = { x0: wx, moved: false };
    if (wy != null) this.ripples.push({ x: wx, y: wy, t: 0 });
    this.userUntil = this.t + 9;
  }
  pointerMove(wx) {
    if (!this.ptr) return;
    if (Math.abs(wx - this.ptr.x0) > 4) this.ptr.moved = true;
    if (this.ptr.moved) {
      this.jobs = this.jobs.filter((j) => j.user && j.k !== "move");
      this.cr.tx = clamp(wx, this.xmin, this.xmax);
      this.userUntil = this.t + 9;
    }
  }
  pointerUp() {
    const p = this.ptr;
    this.ptr = null;
    if (!p) return;
    this.userUntil = this.t + 9;
    if (p.moved) return;
    if (this.jobs.some((j) => j.user)) return;
    this.jobs = [{ k: "settle", user: true }, { k: "lower", user: true }, { k: "toggle", user: true }, { k: "wait", s: 0.35, user: true }, { k: "raise", user: true }];
  }

  // ---- AGGIORNA ----
  update(dt) {
    dt = Math.min(dt, 0.05);
    this.t += dt;
    const h = this.hour;
    const night = nightAt(h);
    this.night = night;
    this.updateWeather(dt, night);
    this.updateCrane(dt);
    this.updateTruck(dt);
    if (!this.jobs.length) {
      if (this.t > this.userUntil) {
        this.wait -= dt;
        if (this.wait <= 0) this.plan();
      }
    } else this.runJob(dt);
    // sorprese
    this.nextEvent -= dt;
    if (this.queue.length && this.nextEvent > 2.5) this.nextEvent = 0.3;
    if (this.nextEvent <= 0) {
      const k = this.queue.length ? this.queue.shift() : this.events.length < 3 ? pickW(Object.fromEntries(Object.entries(EVENTS).map(([n, e]) => [n, e.w(this)]))) : null;
      if (k && EVENTS[k]) {
        const ev = EVENTS[k].make(this);
        if (ev) {
          ev.name = k;
          this.events.push(ev);
        }
      }
      this.nextEvent = this.queue.length ? 2.5 : rnd(4, 10);
    }
    this.events = this.events.filter((e) => e.update(dt, this) !== false);
    this.ambient.forEach((e) => e.update(dt, this));
    this.ripples.forEach((r) => (r.t += dt));
    this.ripples = this.ripples.filter((r) => r.t < 0.6);
    // particelle
    for (const p of this.parts) {
      if (p.grow) p.r += p.grow * dt;
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    if (this.confetti >= 0) {
      this.confetti -= dt;
      if (this.confetti <= 0) {
        for (let i = 0; i < 70; i++) this.parts.push({ x: rnd(80, VW), y: rnd(-30, -2), vx: rnd(-8, 8), vy: rnd(14, 30), g: 3, life: 6, max: 6, c: hex(pick(PARTY)), r: rnd(1.2, 2.4), rect: true, spin: rnd(0, 6), layer: "top" });
        this.confetti = 22;
      }
    }
    // colore del testo (chiaro o scuro)
    this.toneT -= dt;
    if (this.toneT <= 0) {
      this.toneT = 1;
      const dark = lum(this.skyColors()[1]) < 0.55;
      if (dark !== this.tone) {
        this.tone = dark;
        this.onTone(dark);
      }
    }
  }

  updateWeather(dt, night) {
    if (!this.wLock) {
      this.nextWx -= dt;
      if (this.nextWx <= 0) {
        const winter = this.month === 11 || this.month <= 1;
        const NEXT = {
          sereno: { nuvoloso: 3, vento: 2, nebbia: night < 0.3 && this.hour < 11 ? 1 : 0 },
          nuvoloso: { sereno: 2, pioggia: winter ? 1 : 3, neve: winter ? 3 : 0, vento: 1 },
          pioggia: { temporale: winter ? 0 : 2, nuvoloso: 2, sereno: 1 },
          temporale: { pioggia: 3, nuvoloso: 1 },
          nebbia: { sereno: 2, nuvoloso: 1 },
          vento: { sereno: 2, nuvoloso: 2 },
          neve: { nuvoloso: 2, sereno: 1 },
          arcobaleno: { sereno: 2, nuvoloso: 1 },
        }[this.wName];
        const prev = this.wName;
        const next = pickW(NEXT) || "sereno";
        this.wName = next;
        this.wT = { ...WX[next] };
        if ((prev === "pioggia" || prev === "temporale") && !this.wT.rain && night < 0.4) {
          this.rainbowT = 1;
          this.rainbowLeft = 35;
          this.say("È uscito l'arcobaleno");
        }
        if (next === "temporale") this.say("Arriva il temporale");
        if (next === "neve") this.say("Nevica!");
        if (next === "pioggia" && prev !== "temporale") this.say("Inizia a piovere: occhio alle scale bagnate");
        if (next === "nebbia") this.say("Sale la nebbia: guida piano");
        this.nextWx = rnd(35, 75);
      }
    }
    for (const k of Object.keys(this.wx)) {
      const d = this.wT[k] - this.wx[k];
      this.wx[k] += clamp(d, -0.07 * dt, 0.07 * dt);
    }
    if (this.rainbowLeft > 0) {
      this.rainbowLeft -= dt;
      if (this.rainbowLeft <= 0) this.rainbowT = 0;
    }
    this.rainbow += clamp(this.rainbowT - this.rainbow, -0.08 * dt, 0.12 * dt);
    this.gust = Math.max(0, this.gust - dt * 0.25);
    const wind = this.wx.wind + this.gust;
    this.windNow = wind;
    // nuvole
    const target = this.cloudTarget();
    for (const c of this.clouds) {
      c.x += (3 + c.depth * 6) * (1 + wind * 4) * dt;
      c.fade = Math.min(1, c.fade + dt * 0.3);
      if (c.x > VW + 60) {
        if (this.clouds.length > target) c.dead = true;
        else Object.assign(c, this.newCloud(Math.min(0, this.left || 0) - 90 - rnd(0, 40)), { fade: 1 });
      }
    }
    this.clouds = this.clouds.filter((c) => !c.dead);
    if (this.clouds.length < target && chance(dt * 0.6)) this.clouds.push(this.newCloud(Math.min(0, this.left || 0) - 90));
    this.clouds.sort((a, b) => a.depth - b.depth);
    // pioggia
    const rain = this.wx.rain;
    const nRain = rain * (110 + this.wx.storm * 90) * dt;
    for (let i = 0; i < nRain + (chance(nRain % 1) ? 1 : 0) - (nRain % 1); i++) this.drops.push({ x: rnd(-40, VW + 20), y: rnd(-20, -2), v: rnd(200, 260) });
    for (const d of this.drops) {
      d.y += d.v * dt;
      d.x += wind * 70 * dt;
      if (d.y > GROUND) {
        d.dead = true;
        if (chance(0.3)) this.parts.push({ x: d.x, y: GROUND - 0.5, vx: rnd(-12, 12), vy: rnd(-22, -10), g: 120, life: 0.25, max: 0.25, c: [186, 230, 253], r: 0.6, layer: "front" });
      }
    }
    this.drops = this.drops.filter((d) => !d.dead);
    // neve
    if (this.wx.snow > 0.02 && chance(this.wx.snow * 60 * dt)) this.flakes.push({ x: rnd(-20, VW), y: -4, v: rnd(12, 24), r: rnd(0.8, 1.9), p: rnd(0, 6) });
    for (const f of this.flakes) {
      f.y += f.v * dt;
      f.x += (Math.sin(this.t * 1.5 + f.p) * 8 + wind * 30) * dt;
      if (f.y > GROUND) f.dead = true;
    }
    this.flakes = this.flakes.filter((f) => !f.dead);
    // foglie (autunno o vento)
    const autumn = this.month >= 8 && this.month <= 10;
    const leafRate = (autumn ? 0.6 : 0) + wind * 3;
    if (chance(leafRate * dt)) this.leaves.push({ x: -8, y: rnd(30, 140), vx: rnd(30, 60) * (0.4 + wind), vy: rnd(-6, 8), r: rnd(0, 6), vr: rnd(-6, 6), c: pick([[245, 158, 11], [234, 88, 12], [132, 204, 22], [180, 83, 9]]) });
    for (const l of this.leaves) {
      l.x += l.vx * dt;
      l.y += (l.vy + Math.sin(this.t * 3 + l.r) * 10) * dt;
      l.r += l.vr * dt;
      if (l.x > VW + 10 || l.y > GROUND) l.dead = true;
    }
    this.leaves = this.leaves.filter((l) => !l.dead);
    // lampi
    this.flash = Math.max(0, this.flash - dt * 3.5);
    if (this.bolt) {
      this.bolt.life -= dt;
      if (this.bolt.life <= 0) this.bolt = null;
    }
    if (this.wx.storm > 0.5) {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) {
        this.flash = 0.85;
        const pts = [[rnd(150, 390), 0]];
        while (pts[pts.length - 1][1] < rnd(70, 120)) {
          const [x, y] = pts[pts.length - 1];
          pts.push([x + rnd(-10, 10), y + rnd(8, 16)]);
        }
        this.bolt = { pts, life: 0.35 };
        if (chance(0.5)) setTimeout(() => (this.flash = Math.max(this.flash, 0.5)), 140);
        this.nextBolt = rnd(2.5, 8);
      }
    }
  }

  updateCrane(dt) {
    const cr = this.cr;
    const g = 260;
    const steps = 2;
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      const desired = clamp((cr.tx - cr.x) * 1.5, -34, 34);
      const a = clamp((desired - cr.v) / h, -30, 30);
      cr.v += a * h;
      cr.x = clamp(cr.x + cr.v * h, this.xmin - 2, this.xmax + 2);
      cr.a = a;
      const hv = clamp((cr.tL - cr.L) * 2.4, -18, 18);
      cr.hv = hv;
      cr.L = clamp(cr.L + hv * h, LMIN, LMAX + 2);
      const l = cr.L + 12 + (cr.load ? SLING + cr.load.h / 2 + 2 : 0);
      const wind = (this.windNow || 0) * (0.25 + 0.2 * Math.sin(this.t * 0.9));
      cr.om += (-(g / l) * Math.sin(cr.th) - (a / l) * Math.cos(cr.th) + wind / l * 6 - 0.3 * cr.om) * h;
      cr.th = clamp(cr.th + cr.om * h, -0.9, 0.9);
    }
    cr.moving = Math.abs(cr.v) > 1 || Math.abs(cr.hv) > 1.5 ? 1 : Math.max(0, cr.moving - dt * 2);
  }

  updateTruck(dt) {
    const f = (k) => this.force.includes(k);
    if (!this.truck) {
      this.nextTruck -= dt;
      if (this.nextTruck <= 0) {
        const p = this.night > 0.7 ? 0.25 : this.weekend ? 0.35 : 0.85;
        if (chance(p) || f("camion")) {
          const mode = this.objs.length >= 3 || (this.objs.length && chance(0.5)) ? "carico" : "scarico";
          const load = mode === "scarico" ? (chance(0.5) ? [{ ...newObj(), ox: 13 }, { ...newObj(), ox: 31 }] : [{ ...newObj(), ox: 22 }]) : [];
          this.truck = { x: -70, v: 46, state: "arrive", mode, load, cap: 1 + (chance(0.5) ? 1 : 0), color: pick(TRUCKS), t: 0 };
          this.say(mode === "carico" ? "Arriva un camion: si carica!" : "Consegna in arrivo: si scarica");
        }
        this.nextTruck = rnd(14, 30);
      }
      return;
    }
    const t = this.truck;
    t.t += dt;
    if (t.state === "arrive") {
      t.v = clamp((BAY_STOP - t.x) * 1.1, 3, 46);
      t.x += t.v * dt;
      if (BAY_STOP - t.x < 0.4) {
        t.x = BAY_STOP;
        t.v = 0;
        t.state = "wait";
        t.t = 0;
      }
    } else if (t.state === "wait") {
      const done = t.mode === "carico" ? t.load.length >= t.cap || (!this.objs.length && !this.cr.load) : !t.load.length || this.freePad() == null;
      const busy = this.jobs.length && this.cr.x > t.x - 4 && this.cr.x < t.x + BED_LEN + 4 && this.cr.L > LMIN + 3;
      if ((done && t.t > 2 && !busy) || (t.t > 45 && !busy)) {
        t.state = "leave";
        if (t.mode === "carico" && t.load.length) this.say("Camion carico: buon viaggio!");
      } else if (done && !t.doneAt) t.doneAt = t.t;
    } else {
      t.v = Math.min(60, t.v + 22 * dt);
      t.x += t.v * dt;
      if (t.x > VW + 30) {
        this.truck = null;
        this.nextTruck = this.noTruck ? 1e9 : rnd(10, 26);
      }
    }
  }

  skyColors() {
    let [a, b, c] = skyAt(this.hour);
    if (this.tint) {
      const tc = hex(this.tint);
      a = mix(a, tc, this.tintK * 0.6);
      b = mix(b, tc, this.tintK);
      c = mix(c, tc, this.tintK * 0.8);
    }
    const grey = mix([100, 116, 139], [30, 41, 59], this.night || 0);
    const k = this.wx.cloud * 0.35 + this.wx.rain * 0.35 + this.wx.fog * 0.3 + this.wx.snow * 0.2;
    a = mix(a, grey, clamp(k, 0, 0.85));
    b = mix(b, grey, clamp(k * 0.9, 0, 0.8));
    c = mix(c, mix(grey, [226, 232, 240], this.wx.fog * 0.8), clamp(k * 0.8, 0, 0.8));
    const dk = this.wx.storm * 0.45;
    a = mix(a, [15, 23, 42], dk);
    b = mix(b, [30, 41, 59], dk);
    c = mix(c, [51, 65, 85], dk * 0.8);
    return [a, b, c];
  }

  // ---- DISEGNA ----
  draw(c, W, H, dpr) {
    // telefono: la scena riempie il riquadro; tablet e computer (riquadro molto largo): la scena resta
    // intera in altezza, appoggiata a destra, e a sinistra continuano cielo, colline e prato
    const s = Math.min(Math.max(W / VW, H / VH) * 1.1, (H / VH) * 1.25);
    const ox = W - VW * s;
    const oy = H - VH * s;
    this.view = { s, ox, oy };
    this.left = Math.min(0, -ox / s);
    if (!this.wideSeeded && this.left < -40) {
      // riquadro largo: un po' di nuvole e stelle anche nella parte in più
      this.wideSeeded = true;
      const extra = Math.round((this.cloudTarget() * -this.left) / VW);
      for (let i = 0; i < extra; i++) this.clouds.push(this.newCloud(rnd(this.left - 40, 0)));
      for (let i = 0; i < Math.round((80 * -this.left) / VW); i++) this.stars.push({ x: rnd(this.left, 0), y: rnd(0, 105), r: chance(0.15) ? 1.3 : 0.7, p: rnd(0, 6) });
    }
    const [sa, sb, sc] = this.skyColors();
    this.sky = [sa, sb, sc];
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, rgba(sa));
    gr.addColorStop(0.6, rgba(sb));
    gr.addColorStop(1, rgba(sc));
    c.fillStyle = gr;
    c.fillRect(0, 0, W, H);
    c.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
    const night = this.night;
    const clearSky = 1 - clamp(this.wx.cloud * 0.9 + this.wx.fog + this.wx.rain, 0, 1);
    // stelle
    if (night > 0.2) {
      for (const st of this.stars) {
        const a = night * clearSky * (0.45 + 0.55 * Math.sin(this.t * 2 + st.p) ** 2);
        if (a < 0.03) continue;
        c.fillStyle = `rgba(255,255,255,${a})`;
        c.fillRect(st.x, st.y, st.r, st.r);
      }
    }
    this.drawLayer(c, "far");
    this.drawSunMoon(c, clearSky);
    // arcobaleno
    if (this.rainbow > 0.01) {
      c.save();
      c.globalAlpha = this.rainbow * 0.5;
      c.lineWidth = 3.2;
      ["#ef4444", "#f97316", "#facc15", "#22c55e", "#3b82f6", "#6366f1", "#a855f7"].forEach((col, i) => {
        c.strokeStyle = col;
        c.beginPath();
        c.arc(320, 175, 125 - i * 3.2, Math.PI * 1.02, Math.PI * 1.98);
        c.stroke();
      });
      c.restore();
    }
    this.drawLayer(c, "sky");
    this.drawParts(c, (p) => p.layer === "sky");
    // nuvole lontane
    this.drawClouds(c, (cl) => cl.depth < 0.5);
    this.drawBack(c);
    // lampo
    if (this.bolt) {
      c.save();
      c.strokeStyle = `rgba(254,249,195,${Math.min(1, this.bolt.life * 4)})`;
      c.lineWidth = 1.6;
      c.shadowColor = "#fef08a";
      c.shadowBlur = 8;
      c.beginPath();
      this.bolt.pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
      c.restore();
    }
    this.drawClouds(c, (cl) => cl.depth >= 0.5);
    // terra
    c.fillStyle = rgba(mix(sc, [15, 23, 42], 0.55 + night * 0.3));
    c.fillRect((this.left || 0) - 10, GROUND, VW + 20 - (this.left || 0), 10);
    c.strokeStyle = `rgba(250,204,21,${0.55 - night * 0.25})`;
    c.lineWidth = 0.8;
    c.setLineDash([4, 3]);
    c.beginPath();
    c.moveTo(BAY_STOP - 3, GROUND + 1.5);
    c.lineTo(BAY_STOP + BED_LEN + 16, GROUND + 1.5);
    c.stroke();
    c.setLineDash([]);
    this.drawLayer(c, "ground");
    this.drawTruck(c);
    for (const o of this.objs) drawObj(c, o, o.x, o.y, night > 0.7);
    // luce di lavoro di notte
    const cr = this.cr;
    if (night > 0.3) {
      c.save();
      c.globalCompositeOperation = "lighter";
      const lg = c.createLinearGradient(0, this.py, 0, GROUND);
      lg.addColorStop(0, `rgba(254,243,199,${0.32 * night})`);
      lg.addColorStop(1, `rgba(254,243,199,${0.06 * night})`);
      c.fillStyle = lg;
      c.beginPath();
      c.moveTo(cr.x - 4, this.py - 1);
      c.lineTo(cr.x + 4, this.py - 1);
      c.lineTo(cr.x + 26, GROUND);
      c.lineTo(cr.x - 26, GROUND);
      c.closePath();
      c.fill();
      c.restore();
    }
    this.drawCrane(c);
    this.drawLayer(c, "front");
    // pioggia, neve, foglie
    if (this.drops.length) {
      c.strokeStyle = night > 0.5 ? "rgba(148,163,184,.55)" : "rgba(71,85,105,.45)";
      c.lineWidth = 0.7;
      c.beginPath();
      const sl = (this.windNow || 0) * 3;
      for (const d of this.drops) {
        c.moveTo(d.x, d.y);
        c.lineTo(d.x - sl, d.y + 7);
      }
      c.stroke();
    }
    c.fillStyle = "rgba(255,255,255,.92)";
    for (const f of this.flakes) {
      c.beginPath();
      c.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      c.fill();
    }
    for (const l of this.leaves) {
      c.save();
      c.translate(l.x, l.y);
      c.rotate(l.r);
      c.fillStyle = rgba(l.c);
      c.beginPath();
      c.ellipse(0, 0, 3.6, 1.8, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    // nebbia
    if (this.wx.fog > 0.02) {
      for (let i = 0; i < 4; i++) {
        const y = 50 + i * 26;
        const x = Math.sin(this.t * 0.15 + i) * 30 - 40;
        const fg = c.createLinearGradient(0, y - 14, 0, y + 14);
        fg.addColorStop(0, "rgba(241,245,249,0)");
        fg.addColorStop(0.5, `rgba(241,245,249,${this.wx.fog * (0.55 - i * 0.06)})`);
        fg.addColorStop(1, "rgba(241,245,249,0)");
        c.fillStyle = fg;
        c.fillRect(x, y - 14, VW + 80, 28);
      }
    }
    // particelle
    this.drawParts(c, (p) => p.layer !== "sky");
    this.drawLayer(c, "top");
    for (const r of this.ripples) {
      c.strokeStyle = `rgba(255,255,255,${0.7 * (1 - r.t / 0.6)})`;
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(r.x, r.y, 3 + r.t * 30, 0, Math.PI * 2);
      c.stroke();
    }
    // lampo: tutto bianco per un attimo
    if (this.flash > 0.01) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.fillStyle = `rgba(255,255,255,${this.flash * 0.6})`;
      c.fillRect(0, 0, W, H);
    }
  }
  drawParts(c, filter) {
    for (const p of this.parts) {
      if (!filter(p)) continue;
      const a = clamp(p.life / p.max, 0, 1);
      c.fillStyle = rgba(p.c, p.layer === "top" ? 1 : p.grow ? a * 0.45 : a);
      if (p.rect) {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.spin + this.t * 4);
        c.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        c.restore();
      } else {
        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
  drawLayer(c, layer) {
    for (const e of this.ambient) if (e.layer === layer) e.draw(c, this);
    for (const e of this.events) if ((e.layer || "sky") === layer) e.draw(c, this);
  }
  drawSunMoon(c, clearSky) {
    const h = this.hour;
    const show = clamp(1 - this.wx.cloud * 0.6 - this.wx.rain * 0.6 - this.wx.fog * 0.5, 0, 1);
    if (h > 5.6 && h < 20.2) {
      const p = (h - 5.6) / 14.6;
      const x = 286 + p * 108;
      const y = 112 - Math.sin(Math.PI * p) * 90;
      const warm = 1 - Math.sin(Math.PI * p);
      const col = mix([253, 224, 71], [251, 146, 60], warm);
      c.save();
      const rg = c.createRadialGradient(x, y, 2, x, y, 40);
      rg.addColorStop(0, rgba(col, 0.55 * show));
      rg.addColorStop(1, rgba(col, 0));
      c.fillStyle = rg;
      c.fillRect(x - 40, y - 40, 80, 80);
      c.fillStyle = rgba(mix(col, [255, 255, 255], 0.3), 0.35 + 0.65 * show);
      c.beginPath();
      c.arc(x, y, this.season === "estate" ? 15 : 12, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
    const hm = h < 12 ? h + 24 : h;
    if (hm > 19 && hm < 31) {
      const p = (hm - 19) / 12;
      const x = 292 + p * 100;
      const y = 96 - Math.sin(Math.PI * p) * 72;
      const r = 10;
      const a = (0.35 + 0.65 * show) * clamp(this.night * 1.3, 0, 1);
      if (a > 0.02) {
        c.save();
        const rg = c.createRadialGradient(x, y, 4, x, y, 30);
        rg.addColorStop(0, `rgba(226,232,240,${0.35 * a})`);
        rg.addColorStop(1, "rgba(226,232,240,0)");
        c.fillStyle = rg;
        c.fillRect(x - 30, y - 30, 60, 60);
        c.globalAlpha = a;
        c.fillStyle = "#f1f5f9";
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "rgba(203,213,225,.7)";
        [[-3, -3, 2.2], [3, 2, 1.6], [-1, 4, 1.2]].forEach(([dx, dy, rr2]) => {
          c.beginPath();
          c.arc(x + dx, y + dy, rr2, 0, Math.PI * 2);
          c.fill();
        });
        // ombra della fase
        let ph = this.phase;
        c.translate(x, y);
        if (ph > 0.5) {
          c.scale(-1, 1);
          ph = 1 - ph;
        }
        const k = Math.cos(2 * Math.PI * ph) * r;
        c.fillStyle = rgba(this.sky ? this.sky[0] : [2, 6, 23], 0.88);
        c.beginPath();
        c.moveTo(0, -r);
        c.arc(0, 0, r + 0.3, -Math.PI / 2, Math.PI / 2, true);
        c.ellipse(0, 0, Math.abs(k) + 0.01, r + 0.3, 0, Math.PI / 2, -Math.PI / 2, k > 0);
        c.fill();
        c.restore();
      }
    }
  }
  drawClouds(c, filter) {
    const night = this.night;
    const [, , sc] = this.sky;
    const wet = this.wx.rain;
    for (const cl of this.clouds) {
      if (!filter(cl)) continue;
      const base = mix([255, 255, 255], sc, 0.25 + night * 0.15);
      let col = mix(base, [100, 116, 139], wet * 0.55 + this.wx.storm * 0.25);
      col = mix(col, [30, 41, 59], night * 0.75);
      const a = (0.55 + cl.depth * 0.4) * cl.fade;
      c.fillStyle = rgba(col, a);
      c.beginPath();
      for (const p of cl.puffs) {
        c.moveTo(cl.x + p.dx * cl.s + p.r * cl.s, cl.y + p.dy * cl.s);
        c.arc(cl.x + p.dx * cl.s, cl.y + p.dy * cl.s, p.r * cl.s, 0, Math.PI * 2);
      }
      c.fill();
      // bordo illuminato al tramonto
      if (this.hour > 16.8 && this.hour < 20 && night < 0.8) {
        c.fillStyle = `rgba(253,186,116,${0.25 * a})`;
        c.beginPath();
        for (const p of cl.puffs) {
          c.moveTo(cl.x + p.dx * cl.s + p.r * cl.s, cl.y + p.dy * cl.s + p.r * cl.s * 0.35);
          c.arc(cl.x + p.dx * cl.s, cl.y + p.dy * cl.s + p.r * cl.s * 0.35, p.r * cl.s * 0.75, 0, Math.PI);
        }
        c.fill();
      }
    }
  }
  drawBack(c) {
    const night = this.night;
    const [, sb, sc] = this.sky;
    const far = rgba(mix(sc, [15, 23, 42], 0.3 + night * 0.45));
    const near = rgba(mix(sb, [15, 23, 42], 0.5 + night * 0.4));
    const win = (on, i) => (night > 0.4 && on ? `rgba(253,224,71,${0.55 + 0.4 * Math.sin(this.t * 0.3 + i) ** 2})` : rgba(mix(sc, [255, 255, 255], 0.2), 0.35));
    // riquadro largo (tablet/computer): colline basse lontane anche nella parte a sinistra
    const L = this.left || 0;
    if (L < -20 && this.back !== "colline") {
      c.fillStyle = rgba(mix(sc, [15, 23, 42], 0.22 + night * 0.45), 0.8);
      c.beginPath();
      c.moveTo(L - 10, GROUND);
      for (let x = Math.floor((L - 10) / 10) * 10; x <= VW + 10; x += 10) c.lineTo(x, 124 - Math.sin(x * 0.012 + this.hills[0]) * 8 - Math.sin(x * 0.041) * 2.5);
      c.lineTo(VW + 10, GROUND);
      c.fill();
      if (this.back === "montagne") {
        for (let x = 120; x > L - 120; x -= 130) {
          c.fillStyle = far;
          c.beginPath();
          c.moveTo(x - 80, GROUND);
          c.lineTo(x, GROUND - 70 - (Math.abs(x) % 3) * 8);
          c.lineTo(x + 80, GROUND);
          c.fill();
        }
      }
    }
    if (this.back === "colline") {
      c.fillStyle = far;
      c.beginPath();
      c.moveTo((this.left || 0) - 10, GROUND);
      for (let x = Math.floor(((this.left || 0) - 10) / 10) * 10; x <= VW + 10; x += 10) c.lineTo(x, 112 - Math.sin(x * 0.018 + this.hills[0]) * 12 - Math.sin(x * 0.05) * 3);
      c.lineTo(VW + 10, GROUND);
      c.fill();
      c.fillStyle = near;
      c.beginPath();
      c.moveTo((this.left || 0) - 10, GROUND);
      for (let x = Math.floor(((this.left || 0) - 10) / 10) * 10; x <= VW + 10; x += 10) c.lineTo(x, 128 - Math.sin(x * 0.025 + this.hills[1]) * 9);
      c.lineTo(VW + 10, GROUND);
      c.fill();
      // alberelli
      c.fillStyle = rgba(mix(sb, [20, 83, 45], 0.6 + night * 0.3));
      for (let i = 0; i < 9; i++) {
        const x = 150 + i * 29 + this.hills[0] * 3;
        const y = 128 - Math.sin(x * 0.025 + this.hills[1]) * 9;
        c.beginPath();
        c.moveTo(x, y - 9);
        c.lineTo(x + 3.5, y + 1);
        c.lineTo(x - 3.5, y + 1);
        c.fill();
      }
    } else if (this.back === "montagne") {
      const peak = (x0, w, h, col, snow) => {
        c.fillStyle = col;
        c.beginPath();
        c.moveTo(x0 - w / 2, GROUND);
        c.lineTo(x0, GROUND - h);
        c.lineTo(x0 + w / 2, GROUND);
        c.fill();
        if (snow) {
          c.fillStyle = `rgba(248,250,252,${0.9 - night * 0.4})`;
          c.beginPath();
          c.moveTo(x0, GROUND - h);
          c.lineTo(x0 - w * 0.12, GROUND - h * 0.78);
          c.lineTo(x0 - w * 0.04, GROUND - h * 0.82);
          c.lineTo(x0 + w * 0.03, GROUND - h * 0.76);
          c.lineTo(x0 + w * 0.12, GROUND - h * 0.79);
          c.fill();
        }
      };
      peak(200, 150, 82, far, true);
      peak(330, 170, 92, far, true);
      peak(270, 120, 52, near, false);
      peak(395, 110, 60, near, false);
    } else if (this.back === "citta") {
      this.city.forEach((b, i) => {
        c.fillStyle = i % 2 ? far : near;
        c.fillRect(b.x, GROUND - b.h, b.w, b.h);
        let k = 0;
        for (let y = GROUND - b.h + 4; y < GROUND - 6; y += 7)
          for (let x = b.x + 3; x < b.x + b.w - 4; x += 6) {
            c.fillStyle = win(b.win[k % b.win.length], i * 7 + k);
            c.fillRect(x, y, 3, 3.5);
            k++;
          }
      });
    } else {
      // capannone con il tetto a shed
      c.fillStyle = near;
      c.beginPath();
      c.moveTo(214, GROUND);
      c.lineTo(214, 112);
      for (let i = 0; i < 5; i++) {
        c.lineTo(214 + i * 22 + 22, 96);
        c.lineTo(214 + i * 22 + 22, 112);
      }
      c.lineTo(324, GROUND);
      c.fill();
      for (let i = 0; i < 5; i++) {
        c.fillStyle = win(i !== 3, i);
        c.fillRect(219 + i * 22, 118, 12, 7);
      }
      c.fillStyle = rgba(mix(sb, [15, 23, 42], 0.65 + night * 0.3));
      c.fillRect(206, 84, 4, GROUND - 84);
      c.fillRect(205, 83, 6, 2);
      if (chance(0.04)) this.parts.push({ x: 208, y: 82, vx: 4 + (this.windNow || 0) * 14, vy: -6, g: 0.6, life: 5, max: 5, c: night > 0.5 ? [71, 85, 105] : [226, 232, 240], r: 1.6, grow: 0.9, layer: "sky" });
      c.fillStyle = far;
      c.fillRect(160, 120, 40, GROUND - 120);
    }
  }
  drawTruck(c) {
    const t = this.truck;
    if (!t) return;
    const x = t.x;
    const y = GROUND;
    const night = this.night > 0.6;
    const col = hex(t.color);
    const body = rgba(night ? mix(col, [15, 23, 42], 0.45) : col);
    // cassone
    c.fillStyle = "#374151";
    c.fillRect(x - 2, y - 9, BED_LEN + 2, 3);
    c.fillStyle = body;
    c.fillRect(x - 2, y - 12, 2, 6);
    // cabina
    c.fillStyle = body;
    rr(c, x + BED_LEN, y - 17, 15, 12, 2);
    c.fill();
    c.fillStyle = night ? "rgba(253,224,71,.5)" : "#bae6fd";
    c.fillRect(x + BED_LEN + 7, y - 15, 6, 5);
    c.fillStyle = "#1f2937";
    c.fillRect(x - 2, y - 6, BED_LEN + 17, 2.5);
    // fari
    if (this.night > 0.4 || this.wx.rain > 0.3 || this.wx.fog > 0.3) {
      c.save();
      c.globalCompositeOperation = "lighter";
      const g = c.createLinearGradient(x + BED_LEN + 15, 0, x + BED_LEN + 55, 0);
      g.addColorStop(0, "rgba(254,240,138,.5)");
      g.addColorStop(1, "rgba(254,240,138,0)");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x + BED_LEN + 15, y - 8);
      c.lineTo(x + BED_LEN + 55, y - 14);
      c.lineTo(x + BED_LEN + 55, y);
      c.closePath();
      c.fill();
      c.restore();
      c.fillStyle = "#ef4444";
      c.fillRect(x - 3, y - 8, 1.5, 2);
    }
    // ruote
    const rot = (x / 3.2) % (Math.PI * 2);
    [x + 6, x + 18, x + BED_LEN + 9].forEach((wx) => {
      c.fillStyle = "#111827";
      c.beginPath();
      c.arc(wx, y - 2.5, 3, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#9ca3af";
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(wx + Math.cos(rot) * 1.8, y - 2.5 + Math.sin(rot) * 1.8);
      c.lineTo(wx - Math.cos(rot) * 1.8, y - 2.5 - Math.sin(rot) * 1.8);
      c.stroke();
    });
    for (const o of t.load) drawObj(c, o, x + o.ox, y - 9 - (o.oy || 0), night);
  }
  drawCrane(c) {
    const cr = this.cr;
    const night = this.night;
    const steel = rgba(mix([71, 85, 105], [15, 23, 42], night * 0.8));
    const steel2 = rgba(mix([100, 116, 139], [30, 41, 59], night * 0.8));
    const gcol = hex(this.girder);
    const gfill = rgba(mix(gcol, [15, 23, 42], night * 0.45));
    const concrete = rgba(mix([148, 163, 184], [30, 41, 59], night * 0.75));
    const concrete2 = rgba(mix([100, 116, 139], [15, 23, 42], night * 0.8));
    const kind = this.kind;
    const truss = (lx) => {
      c.fillStyle = steel;
      c.fillRect(lx, 84, 1.8, GROUND - 84);
      c.fillRect(lx + 5, 84, 1.8, GROUND - 84);
      c.strokeStyle = steel2;
      c.lineWidth = 0.8;
      c.beginPath();
      for (let y = 84; y < GROUND - 6; y += 9) {
        c.moveTo(lx + 1, y);
        c.lineTo(lx + 6, y + 9);
        c.moveTo(lx + 1, y + 9);
        c.lineTo(lx + 6, y + 9);
      }
      c.stroke();
      c.fillStyle = steel;
      c.fillRect(lx - 3, GROUND - 3, 13, 3);
      // ruote sulle rotaie a terra
      c.fillStyle = "#111827";
      c.beginPath();
      c.arc(lx - 1, GROUND - 1, 1.6, 0, Math.PI * 2);
      c.arc(lx + 8, GROUND - 1, 1.6, 0, Math.PI * 2);
      c.fill();
    };
    // pilastro di cemento con la mensola che regge la via di corsa
    const column = (x, top, side) => {
      c.fillStyle = concrete;
      c.fillRect(x, top, 8, GROUND - top);
      c.fillStyle = concrete2;
      c.fillRect(x + (side > 0 ? 6 : 0), top, 2, GROUND - top);
      c.fillStyle = concrete;
      c.beginPath();
      c.moveTo(x + (side > 0 ? 0 : 8), 86);
      c.lineTo(x + (side > 0 ? -5 : 13), 86);
      c.lineTo(x + (side > 0 ? 0 : 8), 94);
      c.fill();
      c.fillStyle = steel;
      c.fillRect(x + (side > 0 ? -6 : 0), 84, 14, 2.4);
    };
    // trave a cassone (bitrave) con strisce di pericolo
    const boxGirder = (x0, x1, y) => {
      c.fillStyle = gfill;
      c.fillRect(x0, y, x1 - x0, 7);
      c.fillStyle = "rgba(0,0,0,.22)";
      c.fillRect(x0, y + 5, x1 - x0, 2);
      c.fillStyle = "rgba(255,255,255,.25)";
      c.fillRect(x0, y, x1 - x0, 1);
      c.save();
      c.beginPath();
      c.rect(x0, y, 8, 7);
      c.rect(x1 - 8, y, 8, 7);
      c.clip();
      c.fillStyle = "#111827";
      for (let x = x0 - 6; x < x1 + 4; x += 4) {
        c.beginPath();
        c.moveTo(x, y + 7);
        c.lineTo(x + 2, y + 7);
        c.lineTo(x + 9, y);
        c.lineTo(x + 7, y);
        c.fill();
      }
      c.restore();
    };
    // trave a I (monotrave, bandiera): il paranco corre sotto, sull'ala inferiore
    const iBeam = (x0, x1, y) => {
      c.fillStyle = gfill;
      c.fillRect(x0, y, x1 - x0, 1.6);
      c.fillRect(x0, y + 5.4, x1 - x0, 1.6);
      c.fillStyle = rgba(mix(gcol, [15, 23, 42], 0.25 + night * 0.45));
      c.fillRect(x0, y + 1.6, x1 - x0, 3.8);
    };
    let plateY = 79.4;
    if (kind === "portale") {
      truss(258);
      truss(382);
      boxGirder(252, 392, 78);
    } else if (kind === "semiportale") {
      truss(258);
      column(386, 66, 1);
      boxGirder(252, 392, 78);
    } else if (kind === "carroponte") {
      // capannone: pilastri, vie di corsa e la trave del tetto
      c.fillStyle = concrete2;
      c.fillRect(240, 60, 160, 2.5);
      column(246, 60, -1);
      column(388, 60, 1);
      c.fillStyle = steel;
      c.fillRect(250, 84, 140, 1.4);
      // testate con le ruote sulle vie di corsa
      c.fillStyle = "#334155";
      c.fillRect(252, 80, 10, 5);
      c.fillRect(378, 80, 10, 5);
      boxGirder(256, 384, 77);
      plateY = 78.4;
    } else if (kind === "monotrave") {
      c.fillStyle = concrete2;
      c.fillRect(240, 60, 160, 2.5);
      column(246, 60, -1);
      column(388, 60, 1);
      c.fillStyle = "#334155";
      c.fillRect(252, 80, 10, 5);
      c.fillRect(378, 80, 10, 5);
      iBeam(256, 384, 78);
      plateY = 79.2;
    } else {
      // gru a bandiera: colonna, braccio girevole e tirante
      c.fillStyle = steel;
      c.fillRect(386, 60, 6, GROUND - 60);
      c.fillStyle = steel2;
      c.fillRect(390, 60, 2, GROUND - 60);
      c.fillStyle = steel;
      c.fillRect(380, GROUND - 3, 18, 3);
      c.fillRect(384, 70, 10, 10);
      iBeam(296, 392, 74);
      c.strokeStyle = steel;
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(389, 60);
      c.lineTo(326, 74);
      c.stroke();
      c.fillStyle = "#ef4444";
      c.fillRect(296, 73, 3, 9);
      plateY = 75.4;
    }
    // targa della portata
    const px = kind === "bandiera" ? 350 : 318;
    c.fillStyle = "rgba(255,255,255,.85)";
    c.fillRect(px, plateY, 12, 4.2);
    c.fillStyle = "#111827";
    c.font = "bold 3.2px sans-serif";
    c.textAlign = "center";
    c.fillText(this.cap, px + 6, plateY + 3.4);
    // lucine di Natale
    if (this.season === "natale")
      for (let i = 0; i < 18; i++) {
        const on = Math.sin(this.t * 3 + i * 1.7) > -0.2;
        c.fillStyle = on ? PARTY[i % PARTY.length] : "rgba(0,0,0,.3)";
        c.beginPath();
        c.arc((kind === "bandiera" ? 300 : 255) + i * (kind === "bandiera" ? 5 : 7.8), 87 + (i % 2) * 0.8, 1.2, 0, Math.PI * 2);
        c.fill();
      }
    // lampeggiante (gira quando la gru si muove; di notte resta acceso piano)
    const bx = kind === "bandiera" ? 389 : 256;
    const by = kind === "bandiera" ? 59 : 75;
    const on = cr.moving > 0.1 ? 0.5 + 0.5 * Math.sin(this.t * 12) : night > 0.5 ? 0.25 : 0;
    c.fillStyle = "#334155";
    c.fillRect(bx - 1.5, by + 0.5, 3, 2.5);
    c.fillStyle = `rgba(251,146,60,${0.45 + on * 0.55})`;
    c.beginPath();
    c.arc(bx, by, 1.6, Math.PI, 0);
    c.fill();
    if (on > 0.05) {
      c.save();
      c.globalCompositeOperation = "lighter";
      const g = c.createRadialGradient(bx, by, 0, bx, by, 14);
      g.addColorStop(0, `rgba(251,146,60,${0.6 * on})`);
      g.addColorStop(1, "rgba(251,146,60,0)");
      c.fillStyle = g;
      c.fillRect(bx - 14, by - 14, 28, 28);
      c.restore();
    }
    this.drawLayer(c, "girder");
    const x = cr.x;
    if (kind === "monotrave" || kind === "bandiera") {
      // paranco sotto la trave: carrellino sull'ala, motore e tamburo
      const ty = kind === "bandiera" ? 81 : 85;
      c.fillStyle = "#64748b";
      [x - 5, x + 5].forEach((wx) => {
        c.beginPath();
        c.arc(wx, ty - 1, 1.6, 0, Math.PI * 2);
        c.fill();
      });
      c.fillStyle = "#1f2937";
      rr(c, x - 10, ty, 20, this.py - ty - 1, 2);
      c.fill();
      c.fillStyle = "#94a3b8";
      rr(c, x - 7, ty + 1.5, 10, this.py - ty - 4, 2);
      c.fill();
      c.fillStyle = "#475569";
      c.fillRect(x + 4, ty + 1.5, 5, this.py - ty - 4);
    } else {
      // carrello sopra la trave
      const ty = kind === "carroponte" ? 69 : 70;
      c.fillStyle = "#1f2937";
      rr(c, x - 12, ty, 24, 8, 1.5);
      c.fill();
      c.fillStyle = "#475569";
      c.fillRect(x + 5, ty + 1.5, 6, 5);
      c.fillStyle = "#94a3b8";
      rr(c, x - 8, ty + 2, 12, 4.5, 2);
      c.fill();
      c.strokeStyle = "rgba(51,65,85,.8)";
      c.lineWidth = 0.4;
      const turns = (cr.L * 0.5) % 2;
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        c.moveTo(x - 7 + i * 2 + turns, ty + 2);
        c.lineTo(x - 7 + i * 2 + turns, ty + 6.5);
        c.stroke();
      }
      c.fillStyle = "#64748b";
      [x - 9, x + 9].forEach((wx) => {
        c.beginPath();
        c.arc(wx, ty + 8, 1.8, 0, Math.PI * 2);
        c.fill();
      });
    }
    if (night > 0.3) {
      c.fillStyle = "#fef3c7";
      c.fillRect(x - 2, this.py - 2, 4, 1.2);
    }
    // funi, bozzello, gancio, carico: un pendolo
    c.save();
    c.translate(x, this.py);
    c.rotate(-cr.th);
    const L = cr.L;
    c.strokeStyle = night > 0.5 ? "#cbd5e1" : "#334155";
    c.lineWidth = 0.6;
    c.beginPath();
    c.moveTo(-2, 0);
    c.lineTo(-3.2, L);
    c.moveTo(2, 0);
    c.lineTo(3.2, L);
    c.moveTo(-0.6, 0);
    c.lineTo(-1, L);
    c.moveTo(0.6, 0);
    c.lineTo(1, L);
    c.stroke();
    // bozzello
    c.fillStyle = rgba(mix(gcol, [15, 23, 42], night * 0.35));
    rr(c, -6, L, 12, 9, 2);
    c.fill();
    c.strokeStyle = "#111827";
    c.lineWidth = 0.6;
    c.stroke();
    c.fillStyle = "rgba(17,24,39,.55)";
    c.beginPath();
    c.arc(0, L + 4.5, 3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#e5e7eb";
    c.beginPath();
    c.arc(0, L + 4.5, 1, 0, Math.PI * 2);
    c.fill();
    // gancio
    const hy = L + 9;
    c.fillStyle = "#374151";
    c.fillRect(-1, hy, 2, 3);
    c.strokeStyle = night > 0.6 ? "#94a3b8" : "#374151";
    c.lineWidth = 2;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(0, hy + 3);
    c.lineTo(0, hy + 5);
    c.bezierCurveTo(0, hy + 9, -1.5, hy + 10, -3.5, hy + 10);
    c.bezierCurveTo(-5.5, hy + 10, -6.5, hy + 8.5, -6.5, hy + 7);
    c.stroke();
    c.lineCap = "butt";
    c.strokeStyle = "#f59e0b";
    c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(0.2, hy + 5.5);
    c.lineTo(-6, hy + 6.6);
    c.stroke();
    if (cr.load) {
      const o = cr.load;
      const top = hy + 9 + SLING;
      c.strokeStyle = "#111827";
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(-3, hy + 9);
      c.lineTo(-o.w / 2 + 2, top);
      c.moveTo(-3, hy + 9);
      c.lineTo(o.w / 2 - 2, top);
      c.stroke();
      drawObj(c, o, -3, top + o.h, night > 0.7);
    }
    c.restore();
  }
}

// ---------------- SORPRESE ----------------
const bird = (c, x, y, s, flap, col) => {
  c.strokeStyle = col;
  c.lineWidth = 0.9;
  c.beginPath();
  const f = Math.sin(flap) * 2.6;
  c.moveTo(x - 4 * s, y - f * s);
  c.quadraticCurveTo(x - 2 * s, y - 1.5 * s, x, y);
  c.quadraticCurveTo(x + 2 * s, y - 1.5 * s, x + 4 * s, y - f * s);
  c.stroke();
};
const darkInk = (w) => (w.night > 0.5 ? "#e2e8f0" : lum(w.sky ? w.sky[1] : [200, 200, 200]) < 0.5 ? "#fde68a" : "#1f2937");

const EVENTS = {
  aereo: {
    w: (w) => (w.night < 0.85 && w.wx.storm < 0.3 && w.wx.fog < 0.5 ? 12 : 3),
    make: () => {
      const dir = chance(0.5) ? 1 : -1;
      const y = rnd(18, 34);
      let x = dir > 0 ? -30 : VW + 30;
      const sp = rnd(26, 38);
      const trail = [];
      let t = 0;
      return {
        layer: "sky",
        update(dt) {
          t += dt;
          x += dir * sp * dt;
          trail.push([x - dir * 11, y + 0.6, 0]);
          trail.forEach((p) => (p[2] += dt));
          while (trail.length && trail[0][2] > 5) trail.shift();
          return dir > 0 ? x < VW + 200 : x > -200;
        },
        draw(c, w) {
          if (w.night < 0.7)
            for (let i = 1; i < trail.length; i++) {
              const a = (1 - trail[i][2] / 5) * 0.55;
              c.strokeStyle = `rgba(255,255,255,${a})`;
              c.lineWidth = 1.2 + trail[i][2] * 0.5;
              c.beginPath();
              c.moveTo(trail[i - 1][0], trail[i - 1][1]);
              c.lineTo(trail[i][0], trail[i][1]);
              c.stroke();
            }
          c.save();
          c.translate(x, y);
          c.scale(dir, 1);
          c.fillStyle = w.night > 0.6 ? "#64748b" : "#f8fafc";
          rr(c, -10, -1.3, 20, 2.6, 1.3);
          c.fill();
          c.beginPath();
          c.moveTo(-1, 0);
          c.lineTo(4, 0);
          c.lineTo(-3, 5);
          c.lineTo(-6, 5);
          c.closePath();
          c.moveTo(-9, -1);
          c.lineTo(-6.5, -1);
          c.lineTo(-10, -5.5);
          c.lineTo(-11, -5.5);
          c.closePath();
          c.fill();
          if (w.night > 0.4) {
            c.fillStyle = Math.sin(t * 9) > 0.6 ? "#ef4444" : "rgba(239,68,68,.25)";
            c.fillRect(-4.5, 4.5, 1.4, 1.4);
            c.fillStyle = Math.sin(t * 9 + 2) > 0.6 ? "#f8fafc" : "rgba(248,250,252,.2)";
            c.fillRect(-11, -1, 1.2, 1.2);
          }
          c.restore();
        },
      };
    },
  },
  elicottero: {
    w: (w) => (w.wx.storm < 0.5 ? 6 : 0),
    make: () => {
      const dir = chance(0.5) ? 1 : -1;
      let x = dir > 0 ? -30 : VW + 30;
      let t = 0;
      const y0 = rnd(22, 42);
      return {
        layer: "sky",
        update(dt) {
          t += dt;
          x += dir * 30 * dt;
          return dir > 0 ? x < VW + 40 : x > -40;
        },
        draw(c, w) {
          const y = y0 + Math.sin(t * 1.3) * 2;
          const n = w.night > 0.5;
          if (n) {
            c.save();
            c.globalCompositeOperation = "lighter";
            const sx = x + Math.sin(t * 0.8) * 30;
            const g = c.createLinearGradient(0, y, 0, GROUND);
            g.addColorStop(0, "rgba(254,249,195,.35)");
            g.addColorStop(1, "rgba(254,249,195,0)");
            c.fillStyle = g;
            c.beginPath();
            c.moveTo(x - 1, y + 4);
            c.lineTo(x + 1, y + 4);
            c.lineTo(sx + 14, GROUND);
            c.lineTo(sx - 14, GROUND);
            c.fill();
            c.restore();
          }
          c.save();
          c.translate(x, y);
          c.scale(dir, 1);
          const body = n ? "#94a3b8" : "#dc2626";
          c.fillStyle = body;
          c.beginPath();
          c.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
          c.fill();
          c.fillRect(-16, -1, 11, 1.8);
          c.fillRect(-17, -4, 1.8, 5);
          c.fillStyle = "#bae6fd";
          c.beginPath();
          c.ellipse(3.5, -0.8, 2.8, 2.2, 0, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = "#1f2937";
          c.lineWidth = 0.8;
          c.beginPath();
          c.moveTo(-5, 5.5);
          c.lineTo(6, 5.5);
          c.moveTo(-3, 4);
          c.lineTo(-3, 5.5);
          c.moveTo(4, 4);
          c.lineTo(4, 5.5);
          c.stroke();
          const r = Math.abs(Math.sin(t * 38)) * 12 + 2;
          c.fillStyle = "rgba(31,41,55,.7)";
          c.fillRect(-r, -5.5, r * 2, 0.9);
          c.fillRect(-1, -5.5, 2, 1.5);
          if (Math.sin(t * 7) > 0.5) {
            c.fillStyle = "#ef4444";
            c.fillRect(-1, 3.5, 1.5, 1.5);
          }
          c.restore();
        },
      };
    },
  },
  stormo: {
    w: (w) => (w.night < 0.5 && w.wx.rain < 0.3 ? 10 : 0),
    make: () => {
      const dir = chance(0.5) ? 1 : -1;
      const n = 5 + Math.floor(rnd(0, 5));
      let x = dir > 0 ? -40 : VW + 40;
      const y = rnd(14, 46);
      let t = 0;
      return {
        layer: "sky",
        update(dt) {
          t += dt;
          x += dir * 24 * dt;
          return dir > 0 ? x < VW + 80 : x > -80;
        },
        draw(c, w) {
          const col = darkInk(w);
          for (let i = 0; i < n; i++) {
            const row = Math.ceil(i / 2);
            const side = i % 2 ? 1 : -1;
            bird(c, x - dir * row * 8, y + side * row * 4 + Math.sin(t * 2 + i) * 1.2, 0.8, t * 9 + i, col);
          }
        },
      };
    },
  },
  uccellino: {
    w: (w) => (w.night < 0.4 && w.wx.rain < 0.3 ? 8 : 0),
    make: (w) => {
      let x = -10;
      let y = rnd(20, 40);
      let tx = 0;
      for (let k = 0; k < 6; k++) {
        tx = rnd(w.gx[0] + 8, w.gx[1] - 4);
        if (Math.abs(tx - w.cr.x) > 30) break;
      }
      const sitY = w.gtop - 0.5;
      let state = "in";
      let t = 0;
      let hop = 0;
      return {
        layer: "girder",
        update(dt, wd) {
          t += dt;
          if (state === "in") {
            const dx = tx - x;
            const dy = sitY - y;
            const d = Math.hypot(dx, dy);
            const sp = Math.min(55, d * 2 + 8);
            x += (dx / d) * sp * dt;
            y += (dy / d) * sp * dt;
            if (d < 0.8) {
              state = "sit";
              t = 0;
            }
          } else if (state === "sit") {
            hop = Math.max(0, hop - dt * 6);
            if (chance(dt * 0.6)) hop = 1;
            if (Math.abs(wd.cr.x - x) < 18 || t > 16) state = "out";
          } else {
            x += 45 * dt;
            y -= 32 * dt;
            if (y < -10) return false;
          }
          return true;
        },
        draw(c, wd) {
          const col = wd.night > 0.5 ? "#94a3b8" : "#334155";
          if (state === "sit") {
            const yy = sitY - Math.sin(hop * Math.PI) * 1.5;
            c.fillStyle = col;
            c.beginPath();
            c.ellipse(x, yy - 2, 2.2, 1.6, 0, 0, Math.PI * 2);
            c.arc(x + 1.8, yy - 3.4, 1.1, 0, Math.PI * 2);
            c.fill();
            c.beginPath();
            c.moveTo(x - 2, yy - 2);
            c.lineTo(x - 4, yy - 3);
            c.lineTo(x - 3.6, yy - 1.4);
            c.fill();
            c.fillStyle = "#f59e0b";
            c.beginPath();
            c.moveTo(x + 2.8, yy - 3.6);
            c.lineTo(x + 4, yy - 3.3);
            c.lineTo(x + 2.8, yy - 3);
            c.fill();
          } else bird(c, x, y, 0.75, t * 12, col);
        },
      };
    },
  },
  palloncino: {
    w: (w) => (w.night < 0.6 && w.wx.rain < 0.3 ? 6 : 0),
    make: () => {
      const x0 = rnd(290, 395);
      let y = 150;
      let t = 0;
      const col = pick(["#ef4444", "#f59e0b", "#3b82f6", "#ec4899", "#22c55e"]);
      return {
        layer: "sky",
        update(dt) {
          t += dt;
          y -= 13 * dt;
          return y > -30;
        },
        draw(c) {
          const x = x0 + Math.sin(t * 0.9) * 8 - t * 1.5;
          c.strokeStyle = "rgba(71,85,105,.8)";
          c.lineWidth = 0.4;
          c.beginPath();
          c.moveTo(x, y + 7);
          c.quadraticCurveTo(x - 3, y + 12, x + 1, y + 18);
          c.stroke();
          c.fillStyle = col;
          c.beginPath();
          c.ellipse(x, y, 4.5, 5.6, 0, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = "rgba(255,255,255,.45)";
          c.beginPath();
          c.ellipse(x - 1.6, y - 2, 1.1, 1.8, 0, 0, Math.PI * 2);
          c.fill();
        },
      };
    },
  },
  mongolfiera: {
    w: (w) => (w.night < 0.2 && w.wx.wind < 0.6 && w.wx.rain < 0.1 && w.wx.cloud < 0.7 ? 6 : 0),
    make: () => {
      const dir = chance(0.5) ? 1 : -1;
      let x = dir > 0 ? 150 : VW + 20;
      let t = 0;
      const y0 = rnd(18, 34);
      const cols = pick([["#f43f5e", "#facc15"], ["#3b82f6", "#f8fafc"], ["#22c55e", "#f97316"], ["#a855f7", "#fde047"]]);
      return {
        layer: "sky",
        update(dt) {
          t += dt;
          x += dir * 5 * dt;
          return t < 45 && x > 100 && x < VW + 30;
        },
        draw(c) {
          const y = y0 + Math.sin(t * 0.4) * 3;
          const a = Math.min(1, t / 2, (45 - t) / 3);
          c.save();
          c.globalAlpha = a;
          c.translate(x, y);
          c.fillStyle = cols[0];
          c.beginPath();
          c.moveTo(0, -12);
          c.bezierCurveTo(10, -12, 11, 2, 3.5, 9);
          c.lineTo(-3.5, 9);
          c.bezierCurveTo(-11, 2, -10, -12, 0, -12);
          c.fill();
          c.fillStyle = cols[1];
          c.beginPath();
          c.moveTo(0, -12);
          c.bezierCurveTo(4, -12, 4, 2, 1.4, 9);
          c.lineTo(-1.4, 9);
          c.bezierCurveTo(-4, 2, -4, -12, 0, -12);
          c.fill();
          c.strokeStyle = "#78350f";
          c.lineWidth = 0.5;
          c.beginPath();
          c.moveTo(-3, 9);
          c.lineTo(-2, 13);
          c.moveTo(3, 9);
          c.lineTo(2, 13);
          c.stroke();
          c.fillStyle = "#92400e";
          c.fillRect(-2.5, 13, 5, 3.5);
          if (Math.sin(t * 1.7) > 0.7) {
            c.fillStyle = "#fb923c";
            c.beginPath();
            c.moveTo(-1, 11.5);
            c.lineTo(0, 7.5);
            c.lineTo(1, 11.5);
            c.fill();
          }
          c.restore();
        },
      };
    },
  },
  stella: {
    w: (w) => (w.night > 0.7 && w.wx.cloud < 0.5 ? 14 : 0),
    make: (w) => {
      w.say("Una stella cadente: esprimi un desiderio");
      return shooting();
    },
  },
  sciame: {
    w: (w) => (w.night > 0.75 && w.wx.cloud < 0.4 ? 2 : 0),
    make: (w) => {
      w.say("Pioggia di stelle cadenti!");
      const list = [];
      let t = 0;
      let next = 0;
      return {
        layer: "sky",
        update(dt) {
          t += dt;
          next -= dt;
          if (t < 5 && next <= 0) {
            list.push(shooting());
            next = rnd(0.2, 0.7);
          }
          list.forEach((s) => (s.alive = s.update(dt)));
          return t < 7;
        },
        draw(c, wd) {
          list.forEach((s) => s.alive && s.draw(c, wd));
        },
      };
    },
  },
  fuochi: {
    w: (w) => (w.night > 0.6 && w.wx.rain < 0.2 ? (w.capodanno || w.ferragosto ? 40 : w.weekend ? 5 : 1.5) : 0),
    make: (w) => {
      w.say("Fuochi d'artificio!");
      const rockets = [];
      let t = 0;
      let next = 0;
      return {
        layer: "sky",
        update(dt, wd) {
          t += dt;
          next -= dt;
          if (t < 7 && next <= 0) {
            rockets.push({ x: rnd(270, 395), y: GROUND, vy: rnd(-110, -90), top: rnd(24, 52), c: hex(pick(PARTY)) });
            next = rnd(0.4, 1.1);
          }
          for (const r of rockets) {
            if (r.done) continue;
            r.y += r.vy * dt;
            if (r.y <= r.top) {
              r.done = true;
              const n = 48;
              wd.flash = Math.max(wd.flash, 0.12);
              for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2;
                const sp = rnd(30, 48);
                wd.parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 26, life: rnd(1.3, 2), max: 2, c: chance(0.2) ? [255, 255, 255] : r.c, r: 1.25, layer: "sky" });
              }
            }
          }
          return t < 10;
        },
        draw(c) {
          c.fillStyle = "rgba(254,240,138,.9)";
          for (const r of rockets)
            if (!r.done) {
              c.fillRect(r.x - 0.5, r.y, 1, 3);
            }
        },
      };
    },
  },
  aurora: {
    w: (w) => (w.night > 0.85 && w.wx.cloud < 0.4 ? 1.2 : 0),
    make: (w) => {
      w.say("Un'aurora boreale… qui?!");
      let t = 0;
      return {
        layer: "far",
        update(dt) {
          t += dt;
          return t < 22;
        },
        draw(c) {
          const a = Math.min(1, t / 3, (22 - t) / 3);
          c.save();
          c.globalCompositeOperation = "lighter";
          [[34, 211, 153], [45, 212, 191], [167, 139, 250]].forEach((col, k) => {
            for (let x = 60; x < VW; x += 6) {
              const y = 14 + k * 9 + Math.sin(x * 0.025 + t * 0.6 + k * 2) * 8 + Math.sin(x * 0.07 + t) * 3;
              const g = c.createLinearGradient(0, y, 0, y + 30);
              g.addColorStop(0, rgba(col, 0));
              g.addColorStop(0.3, rgba(col, 0.22 * a));
              g.addColorStop(1, rgba(col, 0));
              c.fillStyle = g;
              c.fillRect(x, y, 6.5, 30);
            }
          });
          c.restore();
        },
      };
    },
  },
  ufo: {
    w: (w) => (w.night > 0.7 ? 1.2 : 0.15),
    make: (w) => {
      w.say("Hai visto anche tu quella luce?");
      let t = 0;
      let x = VW + 30;
      let y = 6;
      const hx = rnd(300, 360);
      return {
        layer: "sky",
        update(dt) {
          t += dt;
          if (t < 3) {
            x += (hx - x) * dt * 2;
            y += (34 - y) * dt * 2;
          } else if (t > 8) {
            x -= 160 * dt;
            y -= 60 * dt;
          }
          return t < 11;
        },
        draw(c) {
          const yy = y + Math.sin(t * 2.4) * 1.5;
          if (t > 2.5 && t < 8) {
            const a = Math.min(1, (t - 2.5) * 2, (8 - t) * 2) * (0.25 + 0.1 * Math.sin(t * 9));
            const g = c.createLinearGradient(0, yy, 0, GROUND);
            g.addColorStop(0, `rgba(167,243,208,${a * 1.6})`);
            g.addColorStop(1, `rgba(167,243,208,${a * 0.4})`);
            c.fillStyle = g;
            c.beginPath();
            c.moveTo(x - 4, yy + 2);
            c.lineTo(x + 4, yy + 2);
            c.lineTo(x + 22, GROUND);
            c.lineTo(x - 22, GROUND);
            c.fill();
          }
          c.fillStyle = "#94a3b8";
          c.beginPath();
          c.ellipse(x, yy, 13, 3.8, 0, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = "rgba(167,243,208,.9)";
          c.beginPath();
          c.ellipse(x, yy - 2.5, 5.5, 4, 0, Math.PI, 0);
          c.fill();
          for (let i = -2; i <= 2; i++) {
            c.fillStyle = Math.sin(t * 8 + i) > 0 ? "#fde047" : "#f472b6";
            c.beginPath();
            c.arc(x + i * 4.5, yy + 0.8, 0.9, 0, Math.PI * 2);
            c.fill();
          }
        },
      };
    },
  },
  slitta: {
    w: (w) => (w.season === "natale" && w.night > 0.6 ? 8 : 0),
    make: (w) => {
      w.say("Ho visto passare una slitta…");
      let x = VW + 40;
      let t = 0;
      return {
        layer: "sky",
        update(dt) {
          t += dt;
          x -= 30 * dt;
          return x > -80;
        },
        draw(c, wd) {
          const y = 26 + Math.sin(t * 1.4) * 4;
          c.fillStyle = wd.night > 0.6 ? "#e2e8f0" : "#1f2937";
          for (let i = 0; i < 4; i++) {
            const rx = x - 8 - i * 9;
            const ry = y + Math.sin(t * 6 + i) * 1;
            c.beginPath();
            c.ellipse(rx, ry, 3, 1.5, 0, 0, Math.PI * 2);
            c.fill();
            c.fillRect(rx - 3, ry, 0.8, 3);
            c.fillRect(rx + 2, ry, 0.8, 3);
            c.fillRect(rx - 4, ry - 3, 1.2, 2.5);
          }
          c.beginPath();
          c.moveTo(x, y - 3);
          c.lineTo(x + 10, y - 3);
          c.lineTo(x + 9, y + 2);
          c.lineTo(x + 1, y + 2);
          c.fill();
          c.fillRect(x - 1, y + 3, 12, 0.8);
          c.strokeStyle = c.fillStyle;
          c.lineWidth = 0.4;
          c.beginPath();
          c.moveTo(x, y - 1);
          c.lineTo(x - 8, y);
          c.stroke();
        },
      };
    },
  },
  raggi: {
    w: (w) => (w.night < 0.2 && w.wx.cloud > 0.4 && w.wx.rain < 0.2 ? 6 : 0),
    make: () => {
      let t = 0;
      const x0 = rnd(300, 380);
      return {
        layer: "sky",
        update(dt) {
          t += dt;
          return t < 14;
        },
        draw(c) {
          const a = Math.min(1, t / 3, (14 - t) / 3) * 0.16;
          c.save();
          c.globalCompositeOperation = "lighter";
          for (let i = 0; i < 5; i++) {
            const x = x0 + (i - 2) * 9 + Math.sin(t * 0.3 + i) * 2;
            const g = c.createLinearGradient(0, 20, 0, GROUND);
            g.addColorStop(0, `rgba(254,243,199,${a})`);
            g.addColorStop(1, "rgba(254,243,199,0)");
            c.fillStyle = g;
            c.beginPath();
            c.moveTo(x - 2, 22);
            c.lineTo(x + 2, 22);
            c.lineTo(x - 18 + i * 3, GROUND);
            c.lineTo(x - 30 + i * 3, GROUND);
            c.fill();
          }
          c.restore();
        },
      };
    },
  },
  gatto: {
    w: () => 6,
    make: (w) => {
      w.say("C'è un gatto sulla trave…");
      let t = 0;
      return {
        layer: "girder",
        update(dt) {
          t += dt;
          return t < 16;
        },
        draw(c, wd) {
          const walkIn = Math.min(1, t / 2);
          const walkOut = t > 14 ? (t - 14) / 2 : 0;
          const x = wd.gx[0] - 6 + walkIn * 18 - walkOut * 18;
          c.save();
          c.translate(0, wd.gtop - 78);
          const col = wd.night > 0.5 ? "#475569" : "#111827";
          c.fillStyle = col;
          c.beginPath();
          c.ellipse(x, 74.5, 3.2, 3.2, 0, 0, Math.PI * 2);
          c.arc(x + 2.6, 70, 2.1, 0, Math.PI * 2);
          c.fill();
          c.beginPath();
          c.moveTo(x + 1.2, 68.8);
          c.lineTo(x + 1.4, 66.4);
          c.lineTo(x + 2.6, 68);
          c.moveTo(x + 3, 68);
          c.lineTo(x + 4.2, 66.2);
          c.lineTo(x + 4.4, 68.8);
          c.fill();
          c.strokeStyle = col;
          c.lineWidth = 1;
          c.lineCap = "round";
          c.beginPath();
          const sw = Math.sin(t * 2.4) * 3;
          c.moveTo(x - 3, 76);
          c.quadraticCurveTo(x - 7, 74, x - 6 + sw * 0.4, 69 + Math.abs(sw) * 0.3);
          c.stroke();
          c.lineCap = "butt";
          c.fillStyle = wd.night > 0.5 ? "#fde047" : "#a3e635";
          c.fillRect(x + 1.8, 69.6, 0.6, 0.6);
          c.fillRect(x + 3.2, 69.6, 0.6, 0.6);
          c.restore();
        },
      };
    },
  },
  muletto: {
    w: (w) => (w.night < 0.9 ? 9 : 2),
    make: () => {
      const dir = chance(0.5) ? 1 : -1;
      let x = dir > 0 ? 150 : VW + 30;
      let t = 0;
      const box = pick(["#b45309", "#2563eb", "#16a34a"]);
      return {
        layer: "front",
        update(dt) {
          t += dt;
          x += dir * 26 * dt;
          return dir > 0 ? x < VW + 30 : x > 120;
        },
        draw(c, w) {
          c.save();
          c.translate(x, GROUND);
          c.scale(dir, 1);
          c.fillStyle = "#f59e0b";
          rr(c, -9, -10, 12, 7, 1.5);
          c.fill();
          c.strokeStyle = "#1f2937";
          c.lineWidth = 0.9;
          c.beginPath();
          c.moveTo(-7, -10);
          c.lineTo(-7, -16);
          c.lineTo(1, -16);
          c.lineTo(1, -10);
          c.stroke();
          c.fillStyle = "#374151";
          c.fillRect(3, -19, 1.4, 17);
          c.fillRect(4.4, -3.5, 7, 1.2);
          c.fillStyle = box;
          c.fillRect(4.6, -10.5, 6.5, 7);
          c.fillStyle = "#111827";
          c.beginPath();
          c.arc(-6, -2, 2.2, 0, Math.PI * 2);
          c.arc(1, -2, 2.2, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = Math.sin(t * 10) > 0 ? "#fb923c" : "rgba(251,146,60,.3)";
          c.fillRect(-4, -18, 2, 1.6);
          if (w.night > 0.4) {
            c.fillStyle = "rgba(254,240,138,.35)";
            c.beginPath();
            c.moveTo(11, -6);
            c.lineTo(30, -10);
            c.lineTo(30, 0);
            c.fill();
          }
          c.restore();
        },
      };
    },
  },
  scintille: {
    w: (w) => (w.back === "capannone" ? 8 : 0),
    make: () => {
      let t = 0;
      const x = pick([225, 247, 291]);
      const y = 121;
      return {
        layer: "ground",
        update(dt, w) {
          t += dt;
          if (t < 5 && chance(dt * 18))
            for (let i = 0; i < 3; i++) w.parts.push({ x: x + rnd(-2, 2), y: y + 2, vx: rnd(-14, 14), vy: rnd(-16, -4), g: 70, life: rnd(0.4, 0.8), max: 0.8, c: [251, 146, 60], r: 0.5, layer: "front" });
          return t < 6;
        },
        draw(c) {
          if (t > 5) return;
          const a = Math.random() * 0.8;
          c.save();
          c.globalCompositeOperation = "lighter";
          const g = c.createRadialGradient(x, y + 2, 0, x, y + 2, 12);
          g.addColorStop(0, `rgba(191,219,254,${a})`);
          g.addColorStop(1, "rgba(191,219,254,0)");
          c.fillStyle = g;
          c.fillRect(x - 12, y - 10, 24, 24);
          c.restore();
        },
      };
    },
  },
  raffica: {
    w: (w) => (w.wx.rain < 0.5 ? 5 : 0),
    make: (w) => {
      w.gust = 1;
      for (let i = 0; i < 18; i++) w.leaves.push({ x: rnd(-60, 0), y: rnd(30, 140), vx: rnd(60, 110), vy: rnd(-10, 6), r: rnd(0, 6), vr: rnd(-8, 8), c: pick([[245, 158, 11], [234, 88, 12], [132, 204, 22]]) });
      return { update: () => false, draw() {} };
    },
  },
  farfalle: {
    w: (w) => ((w.month >= 3 && w.month <= 8) && w.night < 0.3 && w.wx.rain < 0.1 ? 6 : 0),
    make: () => {
      let t = 0;
      const fl = [0, 1].map(() => ({ x: rnd(260, 380), y: rnd(110, 135), p: rnd(0, 6), c: pick(["#f472b6", "#facc15", "#60a5fa", "#fb923c"]) }));
      return {
        layer: "front",
        update(dt) {
          t += dt;
          fl.forEach((f) => {
            f.x += Math.sin(t * 0.9 + f.p) * 14 * dt;
            f.y += Math.cos(t * 1.3 + f.p) * 10 * dt;
          });
          return t < 20;
        },
        draw(c) {
          const a = Math.min(1, t, 20 - t);
          fl.forEach((f) => {
            const o = Math.abs(Math.sin(t * 14 + f.p));
            c.fillStyle = f.c;
            c.globalAlpha = a;
            c.beginPath();
            c.ellipse(f.x - 1.4 * o, f.y, 1.6 * o + 0.2, 1.4, 0, 0, Math.PI * 2);
            c.ellipse(f.x + 1.4 * o, f.y, 1.6 * o + 0.2, 1.4, 0, 0, Math.PI * 2);
            c.fill();
            c.globalAlpha = 1;
          });
        },
      };
    },
  },
};
export const EVENT_NAMES = Object.keys(EVENTS);

function shooting() {
  let x = rnd(180, 400);
  let y = rnd(2, 30);
  const vx = -rnd(120, 170);
  const vy = rnd(45, 70);
  let life = 0.9;
  const tail = [];
  return {
    layer: "sky",
    update(dt) {
      life -= dt;
      x += vx * dt;
      y += vy * dt;
      tail.push([x, y]);
      if (tail.length > 10) tail.shift();
      return life > -0.3;
    },
    draw(c) {
      for (let i = 1; i < tail.length; i++) {
        c.strokeStyle = `rgba(255,255,255,${(i / tail.length) * Math.max(0, life + 0.2)})`;
        c.lineWidth = (i / tail.length) * 1.4;
        c.beginPath();
        c.moveTo(tail[i - 1][0], tail[i - 1][1]);
        c.lineTo(tail[i][0], tail[i][1]);
        c.stroke();
      }
    },
  };
}
// pipistrelli (Halloween) e zucca
function bats() {
  const b = [0, 1, 2, 3].map((i) => ({ p: i * 1.6, r: rnd(14, 26), cx: rnd(250, 370), cy: rnd(20, 45) }));
  let t = 0;
  return {
    layer: "sky",
    update(dt) {
      t += dt;
    },
    draw(c, w) {
      c.fillStyle = w.night > 0.5 ? "#94a3b8" : "#111827";
      for (const k of b) {
        const x = k.cx + Math.cos(t * 0.8 + k.p) * k.r;
        const y = k.cy + Math.sin(t * 1.3 + k.p) * k.r * 0.4;
        const f = Math.sin(t * 14 + k.p) * 2.4;
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(x - 3, y - 2 - f, x - 6, y - f);
        c.quadraticCurveTo(x - 3, y + 0.5, x, y + 1);
        c.quadraticCurveTo(x + 3, y + 0.5, x + 6, y - f);
        c.quadraticCurveTo(x + 3, y - 2 - f, x, y);
        c.fill();
      }
      // zucca vicino alla gamba destra
      const zx = 394;
      c.fillStyle = "#ea580c";
      c.beginPath();
      c.ellipse(zx, GROUND - 3.5, 4.5, 3.5, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#166534";
      c.fillRect(zx - 0.5, GROUND - 8, 1.2, 2);
      c.fillStyle = w.night > 0.4 ? `rgba(253,224,71,${0.7 + 0.3 * Math.sin(t * 5)})` : "#7c2d12";
      c.beginPath();
      c.moveTo(zx - 2.5, GROUND - 4.5);
      c.lineTo(zx - 1.2, GROUND - 5.8);
      c.lineTo(zx - 0.6, GROUND - 4.5);
      c.moveTo(zx + 0.6, GROUND - 4.5);
      c.lineTo(zx + 1.2, GROUND - 5.8);
      c.lineTo(zx + 2.5, GROUND - 4.5);
      c.moveTo(zx - 2.2, GROUND - 2.6);
      c.lineTo(zx + 2.2, GROUND - 2.6);
      c.lineTo(zx, GROUND - 1.4);
      c.fill();
    },
  };
}
// foglie che cadono (autunno)
function fallingLeaves() {
  const COL = ["#ea580c", "#d97706", "#b91c1c", "#ca8a04"];
  const f = Array.from({ length: 12 }, (_, i) => ({ x: rnd(0, VW), y: rnd(-30, GROUND), v: rnd(9, 16), p: rnd(0, 6), c: COL[i % 4] }));
  let t = 0;
  return {
    layer: "front",
    update(dt) {
      t += dt;
      f.forEach((k) => {
        k.y += k.v * dt;
        k.x += Math.sin(t * 1.2 + k.p) * 12 * dt;
        if (k.y > GROUND - 1) {
          k.y = rnd(-30, -6);
          k.x = rnd(0, VW);
        }
      });
    },
    draw(c) {
      for (const k of f) {
        c.save();
        c.translate(k.x, k.y);
        c.rotate(Math.sin(t * 2 + k.p) * 1.2);
        c.fillStyle = k.c;
        c.beginPath();
        c.ellipse(0, 0, 3.6, 1.8, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    },
  };
}
// cuori che salgono (San Valentino)
function risingHearts() {
  const f = Array.from({ length: 9 }, () => ({ x: rnd(10, VW - 10), y: rnd(20, GROUND), v: rnd(6, 11), p: rnd(0, 6), s: rnd(2.2, 3.4) }));
  let t = 0;
  return {
    layer: "front",
    update(dt) {
      t += dt;
      f.forEach((k) => {
        k.y -= k.v * dt;
        k.x += Math.sin(t + k.p) * 5 * dt;
        if (k.y < -6) {
          k.y = GROUND - 2;
          k.x = rnd(10, VW - 10);
        }
      });
    },
    draw(c) {
      for (const k of f) {
        const a = Math.min(1, (GROUND - k.y) / 30) * Math.min(1, (k.y + 6) / 30);
        c.fillStyle = `rgba(244,63,94,${0.85 * a})`;
        const s = k.s;
        c.beginPath();
        c.moveTo(k.x, k.y + s * 1.6);
        c.bezierCurveTo(k.x - s * 2.2, k.y + s * 0.2, k.x - s, k.y - s * 1.3, k.x, k.y - s * 0.3);
        c.bezierCurveTo(k.x + s, k.y - s * 1.3, k.x + s * 2.2, k.y + s * 0.2, k.x, k.y + s * 1.6);
        c.fill();
      }
    },
  };
}
// Frecce Tricolori (Festa della Repubblica): ogni tanto passano lasciando le scie verde, bianca e rossa
function frecceTricolori() {
  let t = -1.5;
  const DUR = 7;
  return {
    layer: "sky",
    update(dt) {
      t += dt;
      if (t > DUR + 6) t = -1;
    },
    draw(c) {
      if (t < 0) return;
      const head = Math.min(1, t / DUR) * (VW + 80) - 40;
      const fade = t > DUR ? Math.max(0, 1 - (t - DUR) / 5) : 1;
      [["22,163,74", 30], ["248,250,252", 35], ["220,38,38", 40]].forEach(([rgb, y]) => {
        c.strokeStyle = `rgba(${rgb},${0.8 * fade})`;
        c.lineWidth = 3;
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(-40, y + 8);
        c.quadraticCurveTo(head / 2, y - 6, head, y);
        c.stroke();
        if (t <= DUR) {
          c.fillStyle = "#1e3a8a";
          c.beginPath();
          c.moveTo(head + 5, y);
          c.lineTo(head - 3, y - 2);
          c.lineTo(head - 1.5, y);
          c.lineTo(head - 3, y + 2);
          c.fill();
        }
      });
    },
  };
}
// lucciole d'estate (di notte)
function fireflies() {
  const f = Array.from({ length: 14 }, () => ({ x: rnd(200, 400), y: rnd(100, 142), p: rnd(0, 6) }));
  let t = 0;
  return {
    layer: "front",
    update(dt) {
      t += dt;
      f.forEach((k) => {
        k.x += Math.sin(t * 0.7 + k.p) * 6 * dt;
        k.y += Math.cos(t * 0.9 + k.p) * 4 * dt;
      });
    },
    draw(c, w) {
      if (w.night < 0.5) return;
      for (const k of f) {
        const a = Math.max(0, Math.sin(t * 1.8 + k.p * 3)) * w.night;
        if (a < 0.05) continue;
        c.fillStyle = `rgba(253,224,71,${a})`;
        c.beginPath();
        c.arc(k.x, k.y, 0.9, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = `rgba(253,224,71,${a * 0.25})`;
        c.beginPath();
        c.arc(k.x, k.y, 2.6, 0, Math.PI * 2);
        c.fill();
      }
    },
  };
}
