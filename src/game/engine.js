// IL GIOCO DEL CARROPONTE — motore (fisica, regole, disegno). Nessun React qui.
// Coordinate «virtuali»: larghezza 360, altezza variabile (dipende dallo schermo).
//  - il carrello corre sulla trave in alto; il gancio pende con un pendolo vero
//  - tieni premuto GIÙ: il gancio scende; lascia: risale
//  - il gancio vuoto aggancia da solo il pezzo che tocca; il pezzo appeso si sgancia da solo quando appoggia
//  - i camion chiedono pezzi precisi (icone sul cassone); appoggiare piano = «Perfetto!», sbattere = «Botta!»
//  - LIVELLI: si parte facilissimo (1 pezzo, niente vento, gancio che dondola poco, freccia che indica cosa fare)
//    e ogni livello aggiunge qualcosa: più pezzi, meno tempo, vento, gancio più ballerino, vetro fragile.

import { lookById } from "./looks";
import { paintBackground, paintVignette, paintItem, paintTruck, paintCrane, paintDust, softShadow } from "./art";

const VW = 360;
const G = 1500; // gravità (unità virtuali/s²)
const SLING = 9; // funi tra gancio e pezzo
const HOOK = 12; // altezza bozzello + gancio
const TROLLEY_MIN = 26;
const TROLLEY_MAX = 334;
const VMAX = 230;
const AMAX = 780;
const DOWN = 190;
const UP = 260;

export const KINDS = {
  cassa: { w: 42, h: 34, label: "Cassa", kg: "300 kg" },
  bobina: { w: 38, h: 38, label: "Bobina", kg: "2 t" },
  motore: { w: 44, h: 32, label: "Motore", kg: "450 kg" },
  fusto: { w: 30, h: 42, label: "Fusto", kg: "200 kg" },
  trave: { w: 58, h: 16, label: "Trave", kg: "800 kg" },
  vetro: { w: 46, h: 30, label: "Vetro", kg: "120 kg", fragile: true },
};
const KIND_LIST = Object.keys(KINDS).filter((k) => k !== "vetro");
// camion da caricare per passare al livello dopo
export const TRUCKS_PER_STAGE = 2;

// DIFFICOLTÀ di ogni livello (1 = facilissimo). Tutto cresce piano piano.
export const stageRules = (st) => {
  const k = Math.min(1, (st - 1) / 9); // 0 al livello 1 → 1 dal livello 10
  const x = Math.min(1, Math.max(0, (st - 10) / 6)); // dal livello 10 al 16: modalità esperto che stringe ancora
  return {
    pieces: st <= 1 ? [1, 1] : st <= 2 ? [1, 2] : st <= 3 ? [2, 2] : st <= 6 ? [2, 3] : [3, 3],
    trave: st >= 4, // la trave lunga solo dal livello 4
    vetro: st >= 6 ? Math.min(0.35, 0.15 + (st - 6) * 0.05) : 0, // vetro fragile dal livello 6
    patience: Math.round(70 - k * 46 - x * 6), // 70 s → 24 s → 18 s
    wind: st < 3 ? 0 : Math.min(1, 0.25 + (st - 3) * 0.12) + x * 0.3,
    damp: 2.6 - k * 1.55 - x * 0.2, // gancio calmo all'inizio, ballerino dopo
    bumpV: 120 - k * 40, // velocità oltre la quale è «Botta!»
    bumpSwing: 0.32 - k * 0.12,
    softV: 42 - k * 14, // sotto questa: «Perfetto!»
    softSwing: 0.11 - k * 0.045,
    help: st <= 2, // freccia che indica il pezzo da prendere e dove metterlo
  };
};
const NEWS = {
  1: "Carica il pezzo sul camion",
  2: "Ora i camion chiedono anche 2 pezzi",
  3: "Si alza un po' di vento",
  4: "Arriva la trave lunga",
  5: "Meno tempo per ogni camion",
  6: "Vetro fragile: se lo sbatti si rompe!",
  7: "3 pezzi per camion",
  8: "Il gancio dondola di più",
  10: "Livello esperto",
};
export const stageNews = (st) => NEWS[st] || (st > 16 ? "Sei un campione: tieni duro!" : "Più vento e meno tempo");
const TRUCK_COLORS = ["#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#0f766e", "#e11d48"];

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let uid = 0;
const item = (kind) => ({ id: ++uid, kind, ...KINDS[kind], x: 0, y: 0, dmg: 0, tone: Math.random() });

export class CraneEngine {
  constructor({ vh = 720, onEvent = () => {}, sound = () => {} } = {}) {
    this.onEvent = onEvent;
    this.sound = sound;
    this.layout(vh);
    this.t = 0;
    this.trolley = { x: 120, v: 0, a: 0, tx: 120 };
    this.L = this.Lmin;
    this.th = 0;
    this.om = 0;
    this.hold = false;
    this.load = null; // pezzo appeso
    this.items = []; // pezzi a terra / impilati (y = base)
    this.spots = [26, 72, 116]; // piazzole del magazzino
    this.truck = null;
    this.nextTruck = 1.2;
    this.level = 0; // camion caricati
    this.stage = 1; // livello
    this.stageTrucks = 0;
    this.rules = stageRules(1);
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.stats = { pieces: 0, perfect: 0, trucks: 0, bumps: 0, wrong: 0, broken: 0 };
    this.over = false;
    this.parts = [];
    this.texts = [];
    this.shake = 0;
    this.wind = 0;
    this.windT = 0;
    this.lockL = null; // dopo un appoggio il gancio resta lì finché non si lascia il tasto
    this.look = lookById("giallo"); // colori della trave (vedi looks.js)
    this.beamName = "";
    // magazzino iniziale
    [["cassa", 0], ["bobina", 1], ["motore", 2]].forEach(([k, s]) => this.putOnSpot(item(k), s));
  }

  layout(vh) {
    const old = this.floorY;
    this.vh = vh;
    this.floorY = Math.max(430, vh - 175);
    // schermo cambiato (o prima misura): i pezzi seguono il pavimento
    if (old != null && this.items) this.items.forEach((o) => (o.y += this.floorY - old));
    // trave non troppo alta: fune più corta = gru più docile (sopra: tetto, finestroni, lampade)
    this.beamY = Math.max(150, this.floorY - 330);
    this.bedY = this.floorY - 30; // piano del cassone
    this.Lmin = 34;
    this.Lmax = this.floorY - this.beamY - HOOK - 2;
  }

  // il tuo carroponte: colore della trave e nome scritto sopra
  setLook(id, name) {
    this.look = lookById(id);
    this.beamName = String(name || "");
  }

  // ---------- pezzi ----------
  stackAt(x) {
    return this.items.filter((o) => !o.onTruck && Math.abs(o.x - x) < 6);
  }
  putOnSpot(o, s) {
    const x = this.spots[s];
    const st = this.stackAt(x);
    if (st.length >= 2) return false;
    o.x = x;
    o.y = st.length ? Math.min(...st.map((p) => p.y - p.h)) : this.floorY;
    o.onTruck = false;
    this.items.push(o);
    return true;
  }
  freeSpot() {
    const free = this.spots.map((x, i) => ({ i, n: this.stackAt(x).length })).filter((s) => s.n < 2);
    if (!free.length) return -1;
    free.sort((a, b) => a.n - b.n);
    return free[0].i;
  }
  // superficie più alta sotto un tratto [x-hw, x+hw]: { y, top: pezzo su cui si appoggia | null, bed: true se cassone }
  surface(x, hw) {
    let y = this.floorY;
    let top = null;
    let bed = false;
    const t = this.truck;
    const here = t && (t.state === "wait" || t.state === "full");
    if (here && x > t.bedL - 2 && x < t.bedR + 2) {
      y = this.bedY;
      bed = true;
    }
    for (const o of this.items) {
      if (o.onTruck && !here) continue;
      if (Math.abs(o.x - x) < o.w / 2 + hw * 0.7 && o.y - o.h < y) {
        y = o.y - o.h;
        top = o;
      }
    }
    return { y, top, bed };
  }

  // ---------- comandi ----------
  setTarget(x) {
    this.trolley.tx = clamp(x, TROLLEY_MIN, TROLLEY_MAX);
  }
  press(on) {
    this.hold = on;
    if (!on) this.lockL = null;
  }
  hookPos() {
    const hx = this.trolley.x + Math.sin(this.th) * this.L;
    const hy = this.beamY + Math.cos(this.th) * this.L;
    return { hx, hy };
  }
  // velocità orizzontale del gancio (per capire se si sbatte)
  hookVx() {
    return this.trolley.v + Math.cos(this.th) * this.L * this.om;
  }

  // ---------- camion ----------
  newTruck() {
    const R = this.rules;
    const n = R.pieces[0] + (R.pieces[1] > R.pieces[0] && Math.random() < 0.5 ? 1 : 0);
    const pool = KIND_LIST.filter((k) => k !== "trave" || (R.trave && n < 3));
    const want = Array.from({ length: n }, () => (R.vetro && Math.random() < R.vetro ? "vetro" : pick(pool)));
    const bedL = 144;
    const bedR = 304;
    const slotW = (bedR - bedL) / n;
    const slots = want.map((k, i) => ({ kind: k, x: bedL + slotW * (i + 0.5), w: slotW, item: null }));
    this.truck = { off: 260, state: "arrive", t: 0, bedL, bedR, slots, color: pick(TRUCK_COLORS), patience: R.patience + (n - 1) * 6, honk: 0 };
    // il magazzino deve avere i pezzi chiesti (li porta il muletto)
    const have = this.items.filter((o) => !o.onTruck).map((o) => o.kind).concat(this.load ? [this.load.kind] : []);
    want.forEach((k) => {
      const i = have.indexOf(k);
      if (i >= 0) have.splice(i, 1);
      else {
        const s = this.freeSpot();
        if (s >= 0) {
          const o = item(k);
          if (this.putOnSpot(o, s)) {
            o.drop = 0.5;
            this.dust(o.x, this.floorY, 6);
          }
        }
      }
    });
    this.sound("horn");
    this.onEvent({ type: "arrive", want });
  }
  // un pezzo che il camion aspetta ma che non c'è né in magazzino né sul gancio
  missingKind() {
    const t = this.truck;
    if (!t || t.state !== "wait") return null;
    const have = this.items.filter((o) => !o.onTruck).map((o) => o.kind).concat(this.load ? [this.load.kind] : []);
    for (const sl of t.slots) {
      if (sl.item) continue;
      const i = have.indexOf(sl.kind);
      if (i >= 0) have.splice(i, 1);
      else return sl.kind;
    }
    return null;
  }
  // magazzino pieno ma manca un pezzo: il muletto porta via un pezzo che non serve (quello in cima)
  makeRoom() {
    const t = this.truck;
    const need = t ? t.slots.filter((sl) => !sl.item).map((sl) => sl.kind) : [];
    for (const x of this.spots) {
      const st = this.stackAt(x).sort((a, b) => a.y - b.y);
      const top = st[0];
      if (top && !need.includes(top.kind)) {
        this.items = this.items.filter((o) => o !== top);
        this.dust(x, top.y, 8);
        return true;
      }
    }
    return false;
  }
  truckDone() {
    const t = this.truck;
    return t && t.slots.every((s) => s.item && s.item.kind === s.kind);
  }

  // ---------- aggiorna ----------
  update(dt) {
    dt = Math.min(dt, 0.033);
    this.t += dt;
    if (this.over) {
      this.updateFx(dt);
      return;
    }
    // vento: raffiche che crescono col livello
    this.windT -= dt;
    if (this.windT <= 0) {
      this.windT = rnd(2.5, 5);
      this.windTarget = this.rules.wind * rnd(-1, 1) * 380;
    }
    this.wind += ((this.windTarget || 0) - this.wind) * Math.min(1, dt * 0.8);

    // carrello
    const tr = this.trolley;
    const want = clamp((tr.tx - tr.x) * 5, -VMAX, VMAX);
    const a = clamp((want - tr.v) / dt, -AMAX, AMAX);
    tr.v += a * dt;
    tr.x = clamp(tr.x + tr.v * dt, TROLLEY_MIN, TROLLEY_MAX);
    if ((tr.x === TROLLEY_MIN && tr.v < 0) || (tr.x === TROLLEY_MAX && tr.v > 0)) tr.v = 0;
    tr.a = a;

    // fune
    const extra = this.load ? SLING + this.load.h : 0;
    const { hx } = this.hookPos();
    const hw = this.load ? this.load.w / 2 : 5;
    const sf = this.surface(hx, hw);
    const maxL = clamp(sf.y - this.beamY - HOOK - extra, this.Lmin, this.Lmax);
    if (this.hold && this.lockL == null) this.L = Math.min(this.L + DOWN * dt, maxL);
    else if (!this.hold) this.L = Math.max(this.Lmin, this.L - UP * dt);
    if (this.lockL != null) this.L = Math.min(this.L, maxL);
    if (this.L > maxL) this.L = maxL;

    // tocca qualcosa?
    if (this.hold && this.lockL == null && this.L >= maxL - 0.5 && Math.cos(this.th) > 0.85) {
      if (!this.load && sf.top && Math.abs(sf.top.x - hx) < sf.top.w / 2 + 4) this.grab(sf.top);
      else if (this.load) this.place(sf);
      // gancio vuoto a terra: resta lì finché tieni premuto (se ci passa sopra un pezzo lo prende)
    }

    // pendolo (carrello che accelera + vento)
    const l = this.L + HOOK + (this.load ? SLING + this.load.h / 2 : 0);
    const steps = 3;
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const acc = -(G / l) * Math.sin(this.th) - ((tr.a * 0.7) / l) * Math.cos(this.th) + (this.wind / l) * (this.load ? 0.8 : 0.5) - this.rules.damp * this.om;
      this.om += acc * h;
      this.th = clamp(this.th + this.om * h, -1.1, 1.1);
    }

    // camion
    this.updateTruck(dt);
    // il muletto porta i pezzi: prima quelli che il camion aspetta e mancano (es. dopo un vetro rotto),
    // poi qualcuno a caso se il magazzino è quasi vuoto
    this.restockT = (this.restockT || 0) - dt;
    const missing = this.missingKind();
    if (this.restockT <= 0 && (missing || (this.items.filter((o) => !o.onTruck).length + (this.load ? 1 : 0) < 3 && Math.random() < dt * 0.5))) {
      this.restockT = 1.2;
      if (missing && this.freeSpot() < 0) this.makeRoom();
      const s = this.freeSpot();
      if (s >= 0) {
        const o = item(missing || pick(KIND_LIST));
        if (this.putOnSpot(o, s)) {
          o.drop = 0.5;
          this.dust(o.x, this.floorY, 6);
        }
      }
    }
    this.items.forEach((o) => {
      if (o.drop > 0) o.drop = Math.max(0, o.drop - dt * 1.6);
    });
    this.updateFx(dt);
  }

  grab(o) {
    // si prende solo il pezzo in cima alla pila
    this.items = this.items.filter((p) => p !== o);
    if (o.onTruck && this.truck) this.truck.slots.forEach((s) => s.item === o && (s.item = null));
    o.onTruck = false;
    this.load = o;
    this.lockL = this.L;
    this.sound("clack");
    this.buzz(15);
    this.dust(o.x, o.y, 4);
  }

  place(sf) {
    const o = this.load;
    const piecesBefore = this.stats.pieces;
    const { hx } = this.hookPos();
    const vx = Math.abs(this.hookVx());
    const swing = Math.abs(this.th);
    o.x = hx;
    o.y = sf.y; // base del pezzo
    this.load = null;
    this.lockL = this.L;
    const R = this.rules;
    const bump = vx > R.bumpV || swing > R.bumpSwing;
    const soft = vx < R.softV && swing < R.softSwing;
    let pts = 0;
    let txt = "";
    let col = "#ffffff";
    const t = this.truck;
    if (sf.bed && t) {
      // sul cassone: nel posto più vicino libero
      const slot = t.slots.filter((s) => !s.item).sort((a, b) => Math.abs(a.x - hx) - Math.abs(b.x - hx))[0];
      if (slot && Math.abs(slot.x - hx) < slot.w / 2 + 10 && !sf.top) {
        o.x = slot.x;
        o.onTruck = true;
        slot.item = o;
        if (slot.kind === o.kind) {
          pts = 10;
          this.stats.pieces += 1;
          if (bump) {
            pts = 5;
            o.dmg = 1;
          } else if (soft) {
            this.combo += 1;
            this.stats.perfect += 1;
            const mult = this.combo >= 6 ? 3 : this.combo >= 3 ? 2 : 1;
            pts = (10 + 5) * mult;
            txt = mult > 1 ? `Perfetto! ×${mult}` : "Perfetto!";
            col = "#fde047";
            this.sound("perfect");
            this.confetti(o.x, o.y - o.h, 14);
          }
        } else {
          pts = -5;
          txt = `Sbagliato: serve ${KINDS[slot.kind].label.toLowerCase()}`;
          col = "#fca5a5";
          this.stats.wrong += 1;
          this.combo = 0;
          this.sound("error");
          this.buzz([30, 40, 30]);
        }
      } else {
        // sul cassone ma fuori posto: si ferma lì, va rimesso
        o.onTruck = true;
        txt = "Mettilo in un posto libero";
        col = "#fed7aa";
      }
    } else {
      o.onTruck = false;
    }
    if (bump && o.fragile) {
      // il vetro sbattuto si rompe: sparisce (e libera il posto sul camion)
      if (this.truck) this.truck.slots.forEach((sl) => sl.item === o && (sl.item = null));
      this.combo = 0;
      this.stats.pieces = piecesBefore;
      this.stats.broken += 1;
      this.stats.bumps += 1;
      this.shake = 0.45;
      this.sound("bump");
      this.buzz([60, 40, 60]);
      this.glass(o.x, o.y - o.h / 2, 26);
      this.addScore(-15, o.x, o.y - o.h - 6, "Vetro rotto!", "#fca5a5");
      return;
    }
    if (bump) {
      pts -= 5;
      o.dmg = 1;
      this.combo = 0;
      this.stats.bumps += 1;
      txt = "Botta!";
      col = "#f87171";
      this.shake = 0.35;
      this.sound("bump");
      this.buzz(60);
      this.sparks(o.x, o.y, 12);
    } else {
      if (!soft && pts > 0) this.combo = 0;
      this.sound("thud");
      this.buzz(12);
    }
    this.dust(o.x, o.y, bump ? 12 : 6);
    this.items.push(o);
    if (pts) this.addScore(pts, o.x, o.y - o.h - 6, txt, col);
    else if (txt) this.float(txt, o.x, o.y - o.h - 6, col);
    if (this.truckDone() && t.state === "wait") {
      t.state = "full";
      t.t = 0;
    }
  }

  addScore(pts, x, y, txt, col) {
    this.score = Math.max(0, this.score + pts);
    this.float(txt ? `${txt} ${pts > 0 ? "+" : ""}${pts}` : `${pts > 0 ? "+" : ""}${pts}`, x, y, col || (pts > 0 ? "#bbf7d0" : "#fca5a5"));
    this.onEvent({ type: "score", score: this.score });
  }

  updateTruck(dt) {
    if (!this.truck) {
      this.nextTruck -= dt;
      if (this.nextTruck <= 0) this.newTruck();
      return;
    }
    const t = this.truck;
    t.t += dt;
    if (t.state === "arrive") {
      t.off = Math.max(0, t.off - Math.max(40, t.off * 2.4) * dt);
      if (t.off <= 0) {
        t.state = "wait";
        t.t = 0;
      }
    } else if (t.state === "wait") {
      const busy = this.load && this.load.onTruck;
      if (t.t >= t.patience && !busy) {
        // riparte senza tutto: perdi una vita
        t.state = "leave";
        t.ok = false;
        this.lives -= 1;
        this.combo = 0;
        this.sound("fail");
        this.buzz([80, 60, 80]);
        this.float("Il camion è ripartito!", 240, this.bedY - 70, "#fca5a5");
        this.onEvent({ type: "miss", lives: this.lives });
        if (this.lives <= 0) this.end();
      }
    } else if (t.state === "full") {
      // pieno: appena il gancio è via, suona e parte
      const near = this.hookPos().hx > t.bedL - 20 && this.L > this.Lmin + 30;
      if (t.t > 0.5 && !near) {
        t.state = "leave";
        t.ok = true;
        this.level += 1;
        this.stats.trucks += 1;
        this.stageTrucks += 1;
        this.sound("horn");
        this.confetti(224, this.bedY - 40, 30);
        // 20 punti (+5 per livello) + metà dei secondi di pazienza rimasti
        this.addScore(15 + this.stage * 5 + Math.ceil(Math.max(0, (t.patience - (t.waitT || 0)) / 2)), 224, this.bedY - 60, "Camion pieno!", "#86efac");
        this.onEvent({ type: "done", level: this.level });
        if (this.stageTrucks >= TRUCKS_PER_STAGE) this.nextStage();
      }
    } else if (t.state === "leave") {
      t.off -= Math.max(30, -t.off * 2 + 30) * dt;
      // i pezzi caricati partono col camion
      if (t.off < -260) {
        this.items = this.items.filter((o) => !o.onTruck);
        this.truck = null;
        this.nextTruck = this.over ? 1e9 : Math.max(this.nextTruck, 1.4);
      }
    }
    if (t.state === "wait") t.waitT = t.t;
  }

  // partire da un livello già raggiunto («Continua dal livello N»)
  startAt(n) {
    const st = Math.max(1, Math.min(99, Math.floor(Number(n) || 1)));
    this.stage = st;
    this.stageTrucks = 0;
    this.rules = stageRules(st);
  }

  nextStage() {
    this.stage += 1;
    this.stageTrucks = 0;
    this.rules = stageRules(this.stage);
    this.nextTruck = 3.2; // un attimo di respiro per leggere la novità
    let life = false;
    // ogni 3 livelli una vita in più (massimo 5)
    if (this.stage % 3 === 1 && this.lives < 5) {
      this.lives += 1;
      life = true;
    }
    this.sound("start");
    this.confetti(180, 200, 40);
    this.onEvent({ type: "stage", stage: this.stage, news: stageNews(this.stage), life, lives: this.lives });
  }

  end() {
    this.over = true;
    this.hold = false;
    this.onEvent({ type: "over", score: this.score, stats: this.stats, level: this.level, stage: this.stage });
  }

  // ---------- effetti ----------
  buzz(p) {
    try {
      if (navigator.vibrate) navigator.vibrate(p);
    } catch (e) {
      // niente
    }
  }
  float(text, x, y, color) {
    this.texts.push({ text, x: clamp(x, 60, 300), y, color, life: 1.3 });
  }
  dust(x, y, n) {
    for (let i = 0; i < n; i++) this.parts.push({ x: x + rnd(-12, 12), y, vx: rnd(-30, 30), vy: rnd(-40, -10), g: 60, life: 0.7, max: 0.7, c: "rgba(203,213,225,", r: rnd(2, 4) });
  }
  sparks(x, y, n) {
    for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: rnd(-120, 120), vy: rnd(-160, -40), g: 400, life: 0.5, max: 0.5, c: "rgba(253,224,71,", r: rnd(1, 2.2) });
  }
  glass(x, y, n) {
    for (let i = 0; i < n; i++) this.parts.push({ x: x + rnd(-14, 14), y, vx: rnd(-140, 140), vy: rnd(-220, -40), g: 520, life: 0.9, max: 0.9, rect: pick(["#e0f2fe", "#bae6fd", "#7dd3fc", "#f8fafc"]), r: rnd(1.5, 3.5), spin: rnd(0, 6) });
  }
  confetti(x, y, n) {
    const cols = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
    for (let i = 0; i < n; i++) this.parts.push({ x, y, vx: rnd(-90, 90), vy: rnd(-200, -60), g: 320, life: 1.2, max: 1.2, rect: pick(cols), r: rnd(2, 3.5), spin: rnd(0, 6) });
  }
  updateFx(dt) {
    for (const p of this.parts) {
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.spin != null) p.spin += dt * 8;
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.y -= 26 * dt;
      t.life -= dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    this.shake = Math.max(0, this.shake - dt);
  }

  // ---------- disegno ----------
  draw(c, W, H, dpr) {
    const s = Math.min(W / VW, H / 560);
    const vw = W / s;
    const ox = (vw - VW) / 2;
    if (Math.abs(H / s - this.vh) > 1) this.layout(H / s);
    this.view = { s, ox };
    const L = -ox - 20;
    const R = VW + ox + 20;
    const fy = this.floorY;
    const by = this.beamY;
    // SFONDO FERMO: disegnato una volta sola (in alta risoluzione) e poi solo copiato
    const key = `${W}x${H}@${dpr}|${fy}|${by}`;
    if (this.bgKey !== key && typeof document !== "undefined") {
      const mk = () => {
        const cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.round(W * dpr));
        cv.height = Math.max(1, Math.round(H * dpr));
        return cv;
      };
      this.bg = mk();
      const b = this.bg.getContext("2d");
      b.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox * s, 0);
      paintBackground(b, { L, R, fy, by, vh: this.vh });
      // piazzole del magazzino dipinte a terra
      this.spots.forEach((x) => {
        b.fillStyle = "rgba(255,255,255,.22)";
        b.fillRect(x - 23, fy + 1, 46, 2);
      });
      this.vig = mk();
      paintVignette(this.vig.getContext("2d"), this.vig.width, this.vig.height);
      this.bgKey = key;
      // granelli di polvere nella luce
      const rr = (a, z) => a + Math.random() * (z - a);
      this.motes = Array.from({ length: 34 }, () => ({ x: rr(0, VW), y: rr(by - 30, fy - 10), r: rr(0.4, 1.1), a: rr(0.12, 0.35), sp: rr(0.2, 0.6), ph: rr(0, 6.28) }));
    }
    const sh = this.shake > 0 ? this.shake * 10 : 0;
    const jx = rnd(-sh, sh);
    const jy = rnd(-sh, sh) * 0.6;
    c.setTransform(1, 0, 0, 1, 0, 0);
    if (this.bg) c.drawImage(this.bg, dpr * jx * s, dpr * jy * s);
    c.setTransform(dpr * s, 0, 0, dpr * s, dpr * (ox * s + jx * s), dpr * jy * s);

    // camion (dietro ai pezzi) e il suo riflesso sul pavimento lucido
    const t = this.truck;
    if (t) {
      this.reflect(c, () => this.drawTruck(c, true));
      this.drawTruck(c);
    }
    // ombra del gancio/pezzo sul punto dove scende
    const { hx, hy } = this.hookPos();
    const hw = this.load ? this.load.w / 2 : 6;
    const sf = this.surface(hx, hw);
    const dist = sf.y - (hy + HOOK + (this.load ? SLING + this.load.h : 0));
    softShadow(c, hx, sf.y, hw * (1.1 + dist / 300), clamp(0.5 - dist / 700, 0.12, 0.5), 3.5 + dist / 120);
    // pezzi: riflesso, ombra, pezzo
    const ground = this.items.filter((o) => !o.onTruck);
    this.reflect(c, () => ground.forEach((o) => paintItem(c, o, o.x, o.y - (o.drop || 0) * 60)));
    ground.forEach((o) => {
      if (Math.abs(o.y - fy) < 1) softShadow(c, o.x, fy, o.w * 0.62, 0.45, 4);
      paintItem(c, o, o.x, o.y - (o.drop || 0) * 60);
    });
    for (const o of this.items) if (o.onTruck && t) paintItem(c, o, o.x + t.off, o.y);

    // primi livelli: freccia che dice cosa fare
    if (this.rules.help && !this.over) this.drawHelp(c);
    // carroponte: colonne, trave, carrello, funi, gancio (e pezzo appeso)
    this.drawCrane(c);
    // polvere nella luce
    if (this.motes) paintDust(c, this.motes, this.t);

    // particelle
    for (const p of this.parts) {
      const a = Math.max(0, p.life / p.max);
      if (p.rect) {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.spin || 0);
        c.globalAlpha = a;
        c.fillStyle = p.rect;
        c.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        c.restore();
      } else {
        c.fillStyle = p.c + a * 0.9 + ")";
        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c.fill();
      }
    }
    // scritte dei punti
    c.textAlign = "center";
    for (const tx of this.texts) {
      c.globalAlpha = Math.min(1, tx.life * 2);
      c.font = '900 16px "Barlow", system-ui, sans-serif';
      c.lineWidth = 4.5;
      c.lineJoin = "round";
      c.strokeStyle = "rgba(2,6,23,.75)";
      c.strokeText(tx.text, tx.x, tx.y);
      c.fillStyle = tx.color;
      c.fillText(tx.text, tx.x, tx.y);
      c.globalAlpha = 1;
    }
    // vento: folate d'aria
    if (Math.abs(this.wind) > 40) {
      const k = Math.min(1, Math.abs(this.wind) / 420);
      c.lineCap = "round";
      for (let i = 0; i < 7; i++) {
        const y = 140 + i * 42 + Math.sin(this.t * 2 + i) * 8;
        const x = ((this.t * 170 * Math.sign(this.wind) + i * 77) % 420 + 420) % 420 - 30;
        c.strokeStyle = `rgba(255,255,255,${0.18 + k * 0.4})`;
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(x + 14 * Math.sign(this.wind), y - 3, x + 30 * Math.sign(this.wind), y);
        c.stroke();
      }
    }
    // bordi un po' più scuri (effetto foto)
    if (this.vig) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(this.vig, 0, 0);
    }
  }

  // riflesso sul pavimento lucido (sotto la linea del pavimento, capovolto e trasparente)
  reflect(c, fn) {
    const fy = this.floorY;
    c.save();
    c.beginPath();
    c.rect(-400, fy + 3, 1200, 60);
    c.clip();
    c.translate(0, 2 * fy + 3);
    c.scale(1, -1);
    c.globalAlpha = 0.13;
    fn();
    c.restore();
  }

  drawCrane(c) {
    const by = this.beamY;
    const tr = this.trolley;
    const hook = this.hookPos();
    paintCrane(c, {
      by,
      floorY: this.floorY,
      VW,
      look: this.look || lookById("giallo"),
      name: this.beamName,
      trolley: tr,
      hook,
      th: this.th,
      t: this.t,
      moving: Math.abs(tr.v) > 8,
    });
    // pezzo appeso: sulla stessa linea della fune, con le brache
    const o = this.load;
    if (o) {
      c.save();
      c.translate(hook.hx, hook.hy);
      c.rotate(-this.th);
      const base = HOOK + SLING + o.h;
      c.strokeStyle = "#1e293b";
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(0, HOOK);
      c.lineTo(-o.w / 2 + 3, base - o.h);
      c.moveTo(0, HOOK);
      c.lineTo(o.w / 2 - 3, base - o.h);
      c.stroke();
      c.strokeStyle = "rgba(250,204,21,.9)";
      c.lineWidth = 0.6;
      c.beginPath();
      c.moveTo(0, HOOK);
      c.lineTo(-o.w / 2 + 3, base - o.h);
      c.stroke();
      paintItem(c, o, 0, base);
      c.restore();
    }
  }

  // indica il pezzo giusto da prendere oppure il posto sul camion dove appoggiarlo
  helpTarget() {
    const t = this.truck;
    if (!t || t.state !== "wait") return null;
    const need = t.slots.filter((s) => !s.item);
    if (!need.length) return null;
    if (this.load) {
      const s = need.find((x) => x.kind === this.load.kind);
      return s ? { x: s.x + t.off, y: this.bedY - KINDS[s.kind].h - 14, txt: "Qui" } : null;
    }
    const kinds = need.map((s) => s.kind);
    const tops = this.items.filter((o) => !o.onTruck && kinds.includes(o.kind) && !this.items.some((p) => p !== o && !p.onTruck && Math.abs(p.x - o.x) < 6 && p.y <= o.y - o.h + 1));
    const o = tops[0];
    return o ? { x: o.x, y: o.y - o.h - 14, txt: "Prendi" } : null;
  }
  drawHelp(c) {
    const h = this.helpTarget();
    if (!h) return;
    const b = Math.sin(this.t * 6) * 4;
    c.save();
    c.translate(h.x, h.y + b);
    const lx = clamp(h.x, 26, VW - 26) - h.x; // scritta sempre dentro lo schermo
    c.fillStyle = "#22c55e";
    c.strokeStyle = "#ffffff";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-9, -11);
    c.lineTo(-4, -11);
    c.lineTo(-4, -22);
    c.lineTo(4, -22);
    c.lineTo(4, -11);
    c.lineTo(9, -11);
    c.closePath();
    c.fill();
    c.stroke();
    c.font = "900 11px system-ui, sans-serif";
    c.textAlign = "center";
    c.lineWidth = 3;
    c.strokeStyle = "rgba(15,23,42,.75)";
    c.strokeText(h.txt, lx, -27);
    c.fillStyle = "#ffffff";
    c.fillText(h.txt, lx, -27);
    c.restore();
  }

  drawTruck(c, onlyBody = false) {
    const t = this.truck;
    if (!t) return;
    const off = t.off;
    const by = this.bedY;
    const x0 = t.bedL + off - 6;
    const x1 = t.bedR + off;
    paintTruck(c, { x0, x1, bedY: by, floorY: this.floorY, color: t.color, t: -off / 9 });
    if (onlyBody) return;
    // posti (con l'icona del pezzo che serve)
    t.slots.forEach((s) => {
      const sx = s.x + off;
      if (!s.item) {
        const k = KINDS[s.kind];
        c.fillStyle = "rgba(255,255,255,.10)";
        c.fillRect(sx - k.w / 2, by - k.h, k.w, k.h);
        c.setLineDash([4, 3]);
        c.strokeStyle = "rgba(255,255,255,.95)";
        c.lineWidth = 1.5;
        c.strokeRect(sx - k.w / 2, by - k.h, k.w, k.h);
        c.setLineDash([]);
        c.globalAlpha = 0.4 + 0.15 * Math.sin(this.t * 4);
        paintItem(c, { ...k, kind: s.kind, tone: 0.5 }, sx, by);
        c.globalAlpha = 1;
      } else {
        const ok = s.item.kind === s.kind;
        const cy = by - s.item.h - 10;
        c.fillStyle = ok ? "#16a34a" : "#dc2626";
        c.beginPath();
        c.arc(sx, cy, 7, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "rgba(255,255,255,.9)";
        c.lineWidth = 1.2;
        c.stroke();
        c.strokeStyle = "#fff";
        c.lineWidth = 2;
        c.lineCap = "round";
        c.beginPath();
        if (ok) {
          c.moveTo(sx - 3, cy);
          c.lineTo(sx - 1, cy + 2.5);
          c.lineTo(sx + 3.5, cy - 3);
        } else {
          c.moveTo(sx - 3, cy - 3);
          c.lineTo(sx + 3, cy + 3);
          c.moveTo(sx + 3, cy - 3);
          c.lineTo(sx - 3, cy + 3);
        }
        c.stroke();
      }
    });
    // pazienza del camionista (barra arrotondata)
    if (t.state === "wait") {
      const k = clamp(1 - t.t / t.patience, 0, 1);
      const bx = t.bedL + off;
      const w = t.bedR - t.bedL;
      const y = by - 66;
      c.fillStyle = "rgba(2,6,23,.6)";
      c.beginPath();
      if (c.roundRect) c.roundRect(bx, y, w, 8, 4);
      else c.rect(bx, y, w, 8);
      c.fill();
      const col = k < 0.25 ? ["#f87171", "#dc2626"] : k < 0.5 ? ["#fcd34d", "#f59e0b"] : ["#86efac", "#16a34a"];
      const g = c.createLinearGradient(0, y, 0, y + 8);
      g.addColorStop(0, col[0]);
      g.addColorStop(1, col[1]);
      c.fillStyle = g;
      c.beginPath();
      if (c.roundRect) c.roundRect(bx + 1.5, y + 1.5, Math.max(0, (w - 3) * k), 5, 2.5);
      else c.rect(bx + 1.5, y + 1.5, Math.max(0, (w - 3) * k), 5);
      c.fill();
    }
  }

  drawItem(c, o, x, base) {
    paintItem(c, o, x, base);
  }

  // dallo schermo alle coordinate del gioco
  toWorld(px) {
    if (!this.view) return null;
    return px / this.view.s - this.view.ox;
  }
}
