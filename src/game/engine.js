// IL GIOCO DEL CARROPONTE — motore (fisica, regole, disegno). Nessun React qui.
// Coordinate «virtuali»: larghezza 360, altezza variabile (dipende dallo schermo).
//  - il carrello corre sulla trave in alto; il gancio pende con un pendolo vero
//  - tieni premuto GIÙ: il gancio scende; lascia: risale
//  - il gancio vuoto aggancia da solo il pezzo che tocca; il pezzo appeso si sgancia da solo quando appoggia
//  - i camion chiedono pezzi precisi (icone sul cassone); appoggiare piano = «Perfetto!», sbattere = «Botta!»
//  - LIVELLI: si parte facilissimo (1 pezzo, niente vento, gancio che dondola poco, freccia che indica cosa fare)
//    e ogni livello aggiunge qualcosa: più pezzi, meno tempo, vento, gancio più ballerino, vetro fragile.

import { lookById } from "./looks";

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
    const sh = this.shake > 0 ? this.shake * 10 : 0;
    c.setTransform(dpr * s, 0, 0, dpr * s, dpr * (ox * s + rnd(-sh, sh)), dpr * rnd(-sh, sh) * 0.6);
    const L = -ox - 20;
    const R = VW + ox + 20;
    const fy = this.floorY;
    // parete del capannone
    let g = c.createLinearGradient(0, 0, 0, fy);
    g.addColorStop(0, "#94a3b8");
    g.addColorStop(1, "#cbd5e1");
    c.fillStyle = g;
    c.fillRect(L, -40, R - L, fy + 40);
    // lamiera ondulata
    c.strokeStyle = "rgba(100,116,139,.18)";
    c.lineWidth = 1;
    for (let x = Math.floor(L / 9) * 9; x < R; x += 9) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, fy);
      c.stroke();
    }
    const by = this.beamY;
    // tetto con le capriate
    g = c.createLinearGradient(0, -40, 0, by - 120);
    g.addColorStop(0, "#334155");
    g.addColorStop(1, "#475569");
    c.fillStyle = g;
    c.fillRect(L, -40, R - L, by - 80);
    c.strokeStyle = "#1e293b";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(L, by - 122);
    c.lineTo(R, by - 122);
    c.stroke();
    c.lineWidth = 1.5;
    for (let x = Math.floor(L / 40) * 40; x < R; x += 40) {
      c.beginPath();
      c.moveTo(x, by - 122);
      c.lineTo(x + 20, by - 160);
      c.lineTo(x + 40, by - 122);
      c.stroke();
    }
    // finestroni con luce
    for (let x = Math.floor(L / 90) * 90 + 15; x < R; x += 90) {
      g = c.createLinearGradient(0, by - 112, 0, by - 70);
      g.addColorStop(0, "#e0f2fe");
      g.addColorStop(1, "#7dd3fc");
      c.fillStyle = g;
      c.fillRect(x, by - 112, 60, 40);
      c.strokeStyle = "#475569";
      c.lineWidth = 2;
      c.strokeRect(x, by - 112, 60, 40);
      c.beginPath();
      c.moveTo(x + 30, by - 112);
      c.lineTo(x + 30, by - 72);
      c.moveTo(x, by - 92);
      c.lineTo(x + 60, by - 92);
      c.stroke();
    }
    // lampade con la luce che scende
    for (let x = Math.floor(L / 120) * 120 + 60; x < R; x += 120) {
      c.strokeStyle = "#1e293b";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(x, by - 122);
      c.lineTo(x, by - 60);
      c.stroke();
      c.fillStyle = "#334155";
      c.beginPath();
      c.moveTo(x - 9, by - 52);
      c.lineTo(x + 9, by - 52);
      c.lineTo(x + 5, by - 60);
      c.lineTo(x - 5, by - 60);
      c.closePath();
      c.fill();
      g = c.createLinearGradient(0, by - 52, 0, fy);
      g.addColorStop(0, "rgba(254,249,195,.35)");
      g.addColorStop(1, "rgba(254,249,195,0)");
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(x - 8, by - 52);
      c.lineTo(x + 8, by - 52);
      c.lineTo(x + 60, fy);
      c.lineTo(x - 60, fy);
      c.closePath();
      c.fill();
      c.fillStyle = "#fef9c3";
      c.fillRect(x - 7, by - 53, 14, 2);
    }
    // scritta sul muro
    c.fillStyle = "rgba(51,65,85,.35)";
    c.font = "900 14px system-ui, sans-serif";
    c.textAlign = "center";
    c.fillText("ELETTROMECCANICA MORA", 180, by - 30);
    // portone del carico (a destra)
    c.fillStyle = "#64748b";
    c.fillRect(140, fy - 150, 220, 150);
    c.fillStyle = "#475569";
    for (let y = fy - 146; y < fy; y += 10) c.fillRect(142, y, 216, 2);
    c.fillStyle = "#facc15";
    c.fillRect(140, fy - 154, 220, 4);
    // pavimento
    g = c.createLinearGradient(0, fy, 0, this.vh);
    g.addColorStop(0, "#9ca3af");
    g.addColorStop(1, "#6b7280");
    c.fillStyle = g;
    c.fillRect(L, fy, R - L, this.vh - fy + 40);
    c.fillStyle = "#facc15";
    c.fillRect(L, fy, R - L, 2);
    // zona magazzino (strisce)
    c.save();
    c.beginPath();
    c.rect(8, fy + 4, 132, 14);
    c.clip();
    c.fillStyle = "rgba(250,204,21,.85)";
    for (let x = 0; x < 200; x += 12) {
      c.beginPath();
      c.moveTo(x, fy + 4);
      c.lineTo(x + 6, fy + 4);
      c.lineTo(x - 2, fy + 18);
      c.lineTo(x - 8, fy + 18);
      c.closePath();
      c.fill();
    }
    c.restore();
    c.fillStyle = "rgba(255,255,255,.8)";
    c.font = "800 9px system-ui, sans-serif";
    c.fillText("MAGAZZINO", 72, fy + 32);
    c.fillText("CARICO", 224, fy + 32);
    // piazzole
    this.spots.forEach((x) => {
      c.fillStyle = "rgba(255,255,255,.25)";
      c.fillRect(x - 22, fy - 2, 44, 3);
    });

    // camion (dietro ai pezzi)
    this.drawTruck(c);
    // ombra del gancio/pezzo sul punto dove scende
    const { hx, hy } = this.hookPos();
    const hw = this.load ? this.load.w / 2 : 6;
    const sf = this.surface(hx, hw);
    const dist = sf.y - (hy + HOOK + (this.load ? SLING + this.load.h : 0));
    c.fillStyle = `rgba(15,23,42,${clamp(0.35 - dist / 900, 0.08, 0.35)})`;
    c.beginPath();
    c.ellipse(hx, sf.y, hw * (1 + dist / 400), 3.5, 0, 0, Math.PI * 2);
    c.fill();
    // pezzi
    for (const o of this.items) if (!o.onTruck) this.drawItem(c, o, o.x, o.y - (o.drop || 0) * 60);
    for (const o of this.items) if (o.onTruck && this.truck) this.drawItem(c, o, o.x + this.truck.off, o.y);

    // primi livelli: freccia che dice cosa fare
    if (this.rules.help && !this.over) this.drawHelp(c);
    // carroponte: vie di corsa, trave, carrello
    this.drawCrane(c);

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
    for (const t of this.texts) {
      c.globalAlpha = Math.min(1, t.life * 2);
      c.font = "900 15px system-ui, sans-serif";
      c.lineWidth = 4;
      c.strokeStyle = "rgba(15,23,42,.7)";
      c.strokeText(t.text, t.x, t.y);
      c.fillStyle = t.color;
      c.fillText(t.text, t.x, t.y);
      c.globalAlpha = 1;
    }
    // vento
    if (Math.abs(this.wind) > 40) {
      const k = Math.min(1, Math.abs(this.wind) / 420);
      c.strokeStyle = `rgba(255,255,255,${0.25 + k * 0.4})`;
      c.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const y = 140 + i * 45 + Math.sin(this.t * 2 + i) * 8;
        const x = ((this.t * 160 * Math.sign(this.wind) + i * 77) % 420 + 420) % 420 - 30;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + 26 * Math.sign(this.wind), y);
        c.stroke();
      }
    }
  }

  drawCrane(c) {
    const by = this.beamY;
    const tr = this.trolley;
    // colonne e vie di corsa
    c.fillStyle = "#475569";
    c.fillRect(2, by - 24, 10, this.floorY - by + 24);
    c.fillRect(348, by - 24, 10, this.floorY - by + 24);
    // trave (gialla, o del colore che hai scelto)
    const lk = this.look || lookById("giallo");
    const gy = by - 20;
    const g = c.createLinearGradient(0, gy, 0, gy + 20);
    g.addColorStop(0, lk.top);
    g.addColorStop(1, lk.bottom);
    c.fillStyle = g;
    c.fillRect(0, gy, VW, 20);
    if (lk.stripes) {
      // strisce gialle e nere lungo tutta la trave (tranne il centro, per il nome)
      c.save();
      c.beginPath();
      c.rect(26, gy, 104, 20);
      c.rect(230, gy, 104, 20);
      c.clip();
      c.fillStyle = "#111827";
      for (let i = 0; i < VW + 40; i += 16) {
        c.beginPath();
        c.moveTo(i, gy);
        c.lineTo(i + 8, gy);
        c.lineTo(i - 12, gy + 20);
        c.lineTo(i - 20, gy + 20);
        c.closePath();
        c.fill();
      }
      c.restore();
    }
    c.fillStyle = lk.edge;
    c.fillRect(0, gy + 18, VW, 2);
    // strisce di pericolo alle testate
    [0, VW - 26].forEach((x) => {
      c.save();
      c.beginPath();
      c.rect(x, gy, 26, 20);
      c.clip();
      c.fillStyle = "#111827";
      for (let i = -20; i < 40; i += 10) {
        c.beginPath();
        c.moveTo(x + i, gy);
        c.lineTo(x + i + 5, gy);
        c.lineTo(x + i + 25, gy + 20);
        c.lineTo(x + i + 20, gy + 20);
        c.closePath();
        c.fill();
      }
      c.restore();
    });
    c.fillStyle = lk.ink;
    c.font = "900 9px system-ui, sans-serif";
    c.textAlign = "center";
    c.fillText(this.beamName ? `${this.beamName} · 5 t` : "5 t", 180, gy + 13);
    // carrello
    const tx = tr.x;
    c.fillStyle = "#334155";
    c.fillRect(tx - 20, by - 4, 40, 14);
    c.fillStyle = "#1e293b";
    c.fillRect(tx - 20, by + 8, 40, 3);
    c.fillStyle = "#0f172a";
    [tx - 13, tx + 13].forEach((wx) => {
      c.beginPath();
      c.arc(wx, by - 4, 3.5, 0, Math.PI * 2);
      c.fill();
    });
    c.fillStyle = "#f59e0b";
    c.fillRect(tx - 6, by - 1, 12, 7);
    // lampeggiante quando si muove
    if (Math.abs(tr.v) > 8 && Math.sin(this.t * 14) > 0) {
      c.fillStyle = "#fb923c";
      c.beginPath();
      c.arc(tx + 16, by - 6, 2.5, 0, Math.PI * 2);
      c.fill();
    }
    // funi e gancio
    const { hx, hy } = this.hookPos();
    c.strokeStyle = "#1f2937";
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(tx - 4, by + 10);
    c.lineTo(hx - 4, hy);
    c.moveTo(tx + 4, by + 10);
    c.lineTo(hx + 4, hy);
    c.stroke();
    c.save();
    c.translate(hx, hy);
    c.rotate(-this.th);
    c.fillStyle = "#f59e0b";
    c.beginPath();
    c.roundRect ? c.roundRect(-9, 0, 18, 10, 3) : c.rect(-9, 0, 18, 10);
    c.fill();
    c.fillStyle = "#78350f";
    c.beginPath();
    c.arc(0, 5, 2.5, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#111827";
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(0, 10);
    c.lineTo(0, 14);
    c.arc(-2.5, 14, 2.5, 0, Math.PI, false);
    c.stroke();
    c.restore();
    // pezzo appeso: sulla stessa linea della fune
    const o = this.load;
    if (o) {
      c.save();
      c.translate(hx, hy);
      c.rotate(-this.th);
      const base = HOOK + SLING + o.h;
      c.strokeStyle = "#334155";
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, HOOK);
      c.lineTo(-o.w / 2 + 3, base - o.h);
      c.moveTo(0, HOOK);
      c.lineTo(o.w / 2 - 3, base - o.h);
      c.stroke();
      this.drawItem(c, o, 0, base);
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

  drawTruck(c) {
    const t = this.truck;
    if (!t) return;
    const off = t.off;
    const by = this.bedY;
    const x0 = t.bedL + off - 6;
    const x1 = t.bedR + off;
    // cassone
    c.fillStyle = "#374151";
    c.fillRect(x0, by, x1 - x0, 7);
    c.fillStyle = "#1f2937";
    c.fillRect(x0, by + 7, x1 - x0 + 46, 8);
    // cabina
    c.fillStyle = t.color;
    c.beginPath();
    c.roundRect ? c.roundRect(x1 + 2, by - 26, 44, 41, 5) : c.rect(x1 + 2, by - 26, 44, 41);
    c.fill();
    c.fillStyle = "#bae6fd";
    c.fillRect(x1 + 24, by - 21, 17, 13);
    c.fillStyle = "rgba(0,0,0,.2)";
    c.fillRect(x1 + 2, by + 4, 44, 3);
    // ruote
    [x0 + 18, x0 + 52, x1 + 26].forEach((wx) => {
      c.fillStyle = "#0f172a";
      c.beginPath();
      c.arc(wx, this.floorY - 7, 8, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#9ca3af";
      c.beginPath();
      c.arc(wx, this.floorY - 7, 3, 0, Math.PI * 2);
      c.fill();
    });
    // posti (con l'icona del pezzo che serve)
    t.slots.forEach((s) => {
      const sx = s.x + off;
      if (!s.item) {
        c.setLineDash([4, 3]);
        c.strokeStyle = "rgba(255,255,255,.9)";
        c.lineWidth = 1.5;
        const k = KINDS[s.kind];
        c.strokeRect(sx - k.w / 2, by - k.h, k.w, k.h);
        c.setLineDash([]);
        c.globalAlpha = 0.35;
        this.drawItem(c, { ...k, kind: s.kind, tone: 0.5 }, sx, by);
        c.globalAlpha = 1;
      } else if (s.item.kind === s.kind) {
        c.fillStyle = "#22c55e";
        c.beginPath();
        c.arc(sx, by - s.item.h - 9, 6, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#fff";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(sx - 3, by - s.item.h - 9);
        c.lineTo(sx - 1, by - s.item.h - 7);
        c.lineTo(sx + 3, by - s.item.h - 12);
        c.stroke();
      } else {
        c.fillStyle = "#ef4444";
        c.beginPath();
        c.arc(sx, by - s.item.h - 9, 6, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#fff";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(sx - 3, by - s.item.h - 12);
        c.lineTo(sx + 3, by - s.item.h - 6);
        c.moveTo(sx + 3, by - s.item.h - 12);
        c.lineTo(sx - 3, by - s.item.h - 6);
        c.stroke();
      }
    });
    // pazienza
    if (t.state === "wait") {
      const k = clamp(1 - t.t / t.patience, 0, 1);
      const bx = t.bedL + off;
      const w = t.bedR - t.bedL;
      c.fillStyle = "rgba(15,23,42,.55)";
      c.fillRect(bx, by - 62, w, 7);
      c.fillStyle = k < 0.25 ? "#ef4444" : k < 0.5 ? "#f59e0b" : "#22c55e";
      c.fillRect(bx + 1, by - 61, (w - 2) * k, 5);
    }
  }

  drawItem(c, o, x, base) {
    const w = o.w;
    const h = o.h;
    const l = x - w / 2;
    const t = base - h;
    c.save();
    if (o.kind === "cassa") {
      c.fillStyle = "#b45309";
      c.fillRect(l, t, w, h);
      c.fillStyle = "#d97706";
      for (let i = 0; i < 3; i++) c.fillRect(l + 2, t + 2 + i * (h / 3), w - 4, h / 3 - 3);
      c.strokeStyle = "#78350f";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(l + 2, t + 2);
      c.lineTo(l + w - 2, t + h - 2);
      c.stroke();
      c.strokeRect(l, t, w, h);
    } else if (o.kind === "bobina") {
      const r = h / 2;
      c.fillStyle = "#94a3b8";
      c.beginPath();
      c.arc(x, t + r, r, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#64748b";
      c.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        c.beginPath();
        c.arc(x, t + r, r - i * 3.5, 0, Math.PI * 2);
        c.stroke();
      }
      c.fillStyle = "#334155";
      c.beginPath();
      c.arc(x, t + r, 5, 0, Math.PI * 2);
      c.fill();
    } else if (o.kind === "motore") {
      c.fillStyle = "#2563eb";
      c.beginPath();
      c.roundRect ? c.roundRect(l, t + 2, w - 6, h - 2, 4) : c.rect(l, t + 2, w - 6, h - 2);
      c.fill();
      c.fillStyle = "#1e40af";
      for (let i = 0; i < 5; i++) c.fillRect(l + 4 + i * 6, t + 4, 2, h - 6);
      c.fillStyle = "#9ca3af";
      c.fillRect(l + w - 6, t + h / 2 - 2, 6, 4);
      c.fillStyle = "#1e3a8a";
      c.fillRect(l + 2, base - 3, w - 8, 3);
    } else if (o.kind === "fusto") {
      c.fillStyle = "#dc2626";
      c.beginPath();
      c.roundRect ? c.roundRect(l, t, w, h, 3) : c.rect(l, t, w, h);
      c.fill();
      c.fillStyle = "#991b1b";
      c.fillRect(l, t + h * 0.3, w, 2);
      c.fillRect(l, t + h * 0.65, w, 2);
      c.fillStyle = "rgba(255,255,255,.25)";
      c.fillRect(l + 3, t + 2, 3, h - 4);
    } else if (o.kind === "vetro") {
      // cassa a giorno con lastra di vetro e scritta FRAGILE
      c.fillStyle = "#a16207";
      c.fillRect(l, t, 3, h);
      c.fillRect(l + w - 3, t, 3, h);
      c.fillRect(l, base - 3, w, 3);
      c.fillStyle = "rgba(186,230,253,.85)";
      c.fillRect(l + 3, t + 2, w - 6, h - 5);
      c.strokeStyle = "rgba(255,255,255,.9)";
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(l + 8, t + 6);
      c.lineTo(l + 16, t + h - 8);
      c.moveTo(l + 14, t + 5);
      c.lineTo(l + 19, t + 12);
      c.stroke();
      c.fillStyle = "#dc2626";
      c.font = "900 7px system-ui, sans-serif";
      c.textAlign = "center";
      c.fillText("FRAGILE", x, t + h - 6);
    } else {
      c.fillStyle = "#475569";
      c.fillRect(l, t, w, 3);
      c.fillRect(l, base - 3, w, 3);
      c.fillStyle = "#64748b";
      c.fillRect(l + 2, t + 3, w - 4, h - 6);
      c.fillStyle = "#334155";
      c.fillRect(x - 1, t + 3, 2, h - 6);
    }
    if (o.dmg) {
      c.strokeStyle = "rgba(15,23,42,.8)";
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(l + w * 0.3, t);
      c.lineTo(l + w * 0.42, t + h * 0.4);
      c.lineTo(l + w * 0.32, t + h * 0.6);
      c.stroke();
    }
    c.restore();
  }

  // dallo schermo alle coordinate del gioco
  toWorld(px) {
    if (!this.view) return null;
    return px / this.view.s - this.view.ox;
  }
}
