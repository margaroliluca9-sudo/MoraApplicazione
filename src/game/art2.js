// GRAFICA DEL GIOCO (2): le altre gru e la gente che lavora.
//  - GRU A BANDIERA (livelli 1-3): colonna a sinistra, braccio a sbalzo con il tirante, paranco che corre sotto
//  - GRU DEL PORTO (dal livello 8): gambe del portale sulle rotaie, trave lunga, sala macchine, torre con gli
//    stralli e la luce rossa in cima, cabina del gruista appesa al carrello. Sfondo: il molo col mare e la nave.
//  - PERSONE: operai col casco e il gilet che camminano avanti e indietro, uno al telefono, uno che fuma.
// Stesse coordinate «virtuali» del resto (larghezza 360). Il carrello e il gancio sono quelli di art.js (paintHoist).
import { seeded, lin, rad, rr, bolt, TAU, FONT, shade, paintFloor, paintItem } from "./art";

// ---------------------------------------------------------------- GRU A BANDIERA
export const paintJib = (c, { by, floorY, VW, look, name }) => {
  const lk = look;
  const gy = by - 16; // braccio (più sottile della trave del carroponte)
  const gh = 16;
  const cx = -4; // colonna (un po' fuori a sinistra, per non coprire il magazzino)
  const cw = 15;
  const topY = gy - 46;
  // piastra di base con i tirafondi
  c.fillStyle = "#334155";
  rr(c, cx - 6, floorY - 6, cw + 12, 6, 1.5);
  c.fill();
  [cx - 3, cx + cw + 3].forEach((x) => bolt(c, x, floorY - 3, 1.2));
  // colonna tubolare con luce da sinistra
  c.fillStyle = lin(c, cx, 0, cx + cw, 0, [
    [0, shade(lk.bottom, -45)],
    [0.3, lk.top],
    [0.55, lk.bottom],
    [1, shade(lk.bottom, -55)],
  ]);
  c.fillRect(cx, topY, cw, floorY - topY - 6);
  c.fillStyle = "rgba(255,255,255,.35)";
  c.fillRect(cx + 4, topY, 1.2, floorY - topY - 6);
  // fascia di pericolo in basso sulla colonna
  c.save();
  c.beginPath();
  c.rect(cx, floorY - 40, cw, 30);
  c.clip();
  c.fillStyle = "#facc15";
  c.fillRect(cx, floorY - 40, cw, 30);
  c.fillStyle = "#111827";
  for (let y = floorY - 60; y < floorY; y += 8) {
    c.beginPath();
    c.moveTo(cx, y);
    c.lineTo(cx + cw, y + 10);
    c.lineTo(cx + cw, y + 14);
    c.lineTo(cx, y + 4);
    c.closePath();
    c.fill();
  }
  c.restore();
  // testa della colonna (ralla della rotazione)
  c.fillStyle = lin(c, 0, topY - 8, 0, topY + 4, [
    [0, "#94a3b8"],
    [1, "#334155"],
  ]);
  rr(c, cx - 3, topY - 8, cw + 6, 10, 2);
  c.fill();
  // tirante dalla testa al braccio (tondo d'acciaio con il tenditore)
  const tieX = Math.round(VW * 0.62);
  c.strokeStyle = "#1e293b";
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(cx + cw, topY - 3);
  c.lineTo(tieX, gy + 1);
  c.stroke();
  c.strokeStyle = "rgba(226,232,240,.6)";
  c.lineWidth = 0.7;
  c.beginPath();
  c.moveTo(cx + cw, topY - 4);
  c.lineTo(tieX, gy);
  c.stroke();
  const mx = cx + cw + (tieX - cx - cw) * 0.42;
  const my = topY - 3 + (gy + 1 - (topY - 3)) * 0.42;
  c.fillStyle = "#64748b";
  rr(c, mx - 5, my - 2, 10, 4, 1.5);
  c.fill();
  bolt(c, tieX, gy + 1, 1.6);
  // braccio a sbalzo (profilo a I colorato)
  c.fillStyle = lin(c, 0, gy, 0, gy + gh, [
    [0, shade(lk.top, 30)],
    [0.2, lk.top],
    [0.75, lk.bottom],
    [1, shade(lk.bottom, -40)],
  ]);
  c.fillRect(cx, gy, VW - cx - 2, gh);
  c.fillStyle = "rgba(255,255,255,.55)";
  c.fillRect(cx, gy, VW - cx - 2, 1.1);
  c.fillStyle = lk.edge;
  c.fillRect(cx, gy + gh - 2, VW - cx - 2, 2);
  for (let x = 40; x < VW - 20; x += 22) {
    c.fillStyle = "rgba(0,0,0,.12)";
    c.fillRect(x, gy + 3, 1.1, gh - 6);
  }
  if (lk.stripes) {
    c.save();
    c.beginPath();
    c.rect(cx + cw + 30, gy + 3, VW - cx - cw - 60, gh - 6);
    c.clip();
    c.fillStyle = "#111827";
    for (let i = 0; i < VW + 40; i += 14) {
      c.beginPath();
      c.moveTo(i, gy);
      c.lineTo(i + 7, gy);
      c.lineTo(i - 9, gy + gh);
      c.lineTo(i - 16, gy + gh);
      c.closePath();
      c.fill();
    }
    c.restore();
  }
  // mensola triangolare sotto il braccio, attaccata alla colonna
  c.fillStyle = lin(c, cx + cw, 0, cx + cw + 46, 0, [
    [0, shade(lk.bottom, -35)],
    [1, shade(lk.bottom, -10)],
  ]);
  c.beginPath();
  c.moveTo(cx + cw, gy + gh);
  c.lineTo(cx + cw + 48, gy + gh);
  c.lineTo(cx + cw, gy + gh + 44);
  c.closePath();
  c.fill();
  c.strokeStyle = "rgba(15,23,42,.35)";
  c.lineWidth = 0.8;
  c.stroke();
  // fermo di fine corsa con il tampone rosso
  c.fillStyle = "#0f172a";
  c.fillRect(VW - 6, gy - 4, 4, gh + 8);
  c.fillStyle = "#dc2626";
  rr(c, VW - 10, gy + gh, 6, 5, 1.5);
  c.fill();
  // targa
  const label = name ? `${name} · 2 t` : "BANDIERA 2 t";
  c.save();
  c.font = `900 8px ${FONT}`;
  const tw = Math.max(30, c.measureText(label).width + 10);
  const lx = 120;
  c.fillStyle = "rgba(255,255,255,.92)";
  rr(c, lx - tw / 2, gy + 3, tw, 10, 2);
  c.fill();
  c.fillStyle = "#0f172a";
  c.textAlign = "center";
  c.fillText(label, lx, gy + 10.6);
  c.restore();
  // cavo dei comandi a festoni sotto il braccio
  c.strokeStyle = "rgba(15,23,42,.55)";
  c.lineWidth = 0.8;
  for (let x = cx + cw + 6; x < 100; x += 14) {
    c.beginPath();
    c.moveTo(x, gy + gh);
    c.quadraticCurveTo(x + 7, gy + gh + 6, x + 14, gy + gh);
    c.stroke();
  }
};

// ---------------------------------------------------------------- GRU DEL PORTO
export const paintPortal = (c, { by, floorY, VW, look, name, t }) => {
  const lk = look;
  const gy = by - 26;
  const gh = 26;
  const legW = 16;
  // rotaie a terra sotto le gambe
  [[-6, legW + 12], [VW - legW - 6, legW + 12]].forEach(([x, w]) => {
    c.fillStyle = "#475569";
    c.fillRect(x, floorY - 3, w, 3);
  });
  // GAMBE del portale (cassoni rastremati) con i carrelli delle ruote
  [0, VW - legW].forEach((x, i) => {
    const inner = i === 0 ? x + legW : x;
    c.fillStyle = lin(c, x, 0, x + legW, 0, [
      [0, shade(lk.bottom, -50)],
      [0.35, shade(lk.bottom, -5)],
      [0.65, shade(lk.bottom, -25)],
      [1, shade(lk.bottom, -60)],
    ]);
    c.beginPath();
    c.moveTo(x + 2, floorY - 16);
    c.lineTo(x + legW - 2, floorY - 16);
    c.lineTo(x + legW, gy);
    c.lineTo(x, gy);
    c.closePath();
    c.fill();
    c.fillStyle = "rgba(255,255,255,.18)";
    c.fillRect(x + 4, gy, 1, floorY - gy - 16);
    for (let y = gy + 30; y < floorY - 30; y += 48) bolt(c, x + legW / 2, y, 1.2);
    // carrello delle ruote
    c.fillStyle = "#1e293b";
    rr(c, x - 6, floorY - 16, legW + 12, 10, 2);
    c.fill();
    [x - 2, x + legW / 2, x + legW + 2].forEach((wx) => {
      c.fillStyle = rad(c, wx, floorY - 6, 0, 3.5, [
        [0, "#cbd5e1"],
        [1, "#0f172a"],
      ]);
      c.beginPath();
      c.arc(wx, floorY - 5, 3.2, 0, TAU);
      c.fill();
    });
    // scaletta sulla gamba di sinistra
    if (i === 0) {
      c.strokeStyle = "rgba(226,232,240,.5)";
      c.lineWidth = 0.6;
      for (let y = gy + 6; y < floorY - 20; y += 5) {
        c.beginPath();
        c.moveTo(inner - 5, y);
        c.lineTo(inner - 1, y);
        c.stroke();
      }
    }
  });
  // TORRE (cavalletto) sopra la gamba di sinistra con gli stralli
  const apexX = 46;
  const apexY = gy - 96;
  c.strokeStyle = shade(lk.bottom, -45);
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(6, gy);
  c.lineTo(apexX, apexY);
  c.lineTo(apexX + 30, gy);
  c.stroke();
  c.strokeStyle = "rgba(255,255,255,.2)";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(7, gy);
  c.lineTo(apexX, apexY + 1);
  c.stroke();
  // stralli verso la punta della trave
  c.strokeStyle = "#1e293b";
  c.lineWidth = 1.3;
  [VW * 0.55, VW - 4].forEach((x) => {
    c.beginPath();
    c.moveTo(apexX, apexY + 3);
    c.lineTo(x, gy + 1);
    c.stroke();
  });
  // luce rossa d'ostacolo che lampeggia in cima
  const on = Math.sin(t * 3) > 0;
  c.fillStyle = "#0f172a";
  c.fillRect(apexX - 1.5, apexY - 6, 3, 6);
  if (on) {
    c.save();
    c.globalCompositeOperation = "lighter";
    c.fillStyle = rad(c, apexX, apexY - 8, 0, 12, [
      [0, "rgba(255,80,80,1)"],
      [1, "rgba(255,40,40,0)"],
    ]);
    c.beginPath();
    c.arc(apexX, apexY - 8, 12, 0, TAU);
    c.fill();
    c.restore();
  }
  c.fillStyle = on ? "#fecaca" : "#7f1d1d";
  c.beginPath();
  c.arc(apexX, apexY - 8, 2.4, 0, TAU);
  c.fill();
  // TRAVE lunga a cassone
  c.fillStyle = lin(c, 0, gy, 0, gy + gh, [
    [0, shade(lk.top, 30)],
    [0.18, lk.top],
    [0.75, lk.bottom],
    [1, shade(lk.bottom, -40)],
  ]);
  c.fillRect(-4, gy, VW + 8, gh);
  c.fillStyle = "rgba(255,255,255,.55)";
  c.fillRect(-4, gy, VW + 8, 1.2);
  c.fillStyle = lk.edge;
  c.fillRect(-4, gy + gh - 2, VW + 8, 2);
  // reticolo dipinto sul fianco della trave
  c.strokeStyle = "rgba(0,0,0,.16)";
  c.lineWidth = 1;
  for (let x = 20; x < VW - 10; x += 24) {
    c.beginPath();
    c.moveTo(x, gy + 4);
    c.lineTo(x + 12, gy + gh - 4);
    c.lineTo(x + 24, gy + 4);
    c.stroke();
  }
  // SALA MACCHINE sopra la trave a sinistra
  c.fillStyle = lin(c, 0, gy - 30, 0, gy, [
    [0, "#f8fafc"],
    [1, "#cbd5e1"],
  ]);
  rr(c, 60, gy - 28, 74, 28, 2);
  c.fill();
  c.fillStyle = "#334155";
  for (let x = 66; x < 128; x += 12) c.fillRect(x, gy - 22, 7, 6);
  c.fillStyle = "rgba(15,23,42,.25)";
  c.fillRect(60, gy - 4, 74, 4);
  // scritta sulla sala macchine
  c.save();
  c.font = `900 8px ${FONT}`;
  c.textAlign = "center";
  c.fillStyle = "#1d4ed8";
  c.fillText("MORA", 97, gy - 8);
  c.restore();
  // targa
  const label = name ? `${name} · 40 t` : "40 t";
  c.save();
  c.font = `900 9px ${FONT}`;
  const tw = Math.max(28, c.measureText(label).width + 12);
  c.fillStyle = "rgba(255,255,255,.92)";
  rr(c, 240 - tw / 2, gy + 7, tw, 12, 2);
  c.fill();
  c.fillStyle = "#0f172a";
  c.textAlign = "center";
  c.fillText(label, 240, gy + 16.2);
  c.restore();
};

// cabina del gruista appesa al carrello (gru del porto)
export const paintCab = (c, { by, trolley }) => {
  const x = trolley.x - 30;
  const y = by + 4;
  c.fillStyle = "#1e293b";
  c.fillRect(x + 6, by - 2, 2, 7);
  c.fillStyle = lin(c, 0, y, 0, y + 18, [
    [0, "#e2e8f0"],
    [1, "#94a3b8"],
  ]);
  rr(c, x, y, 15, 18, 2);
  c.fill();
  c.fillStyle = lin(c, x, y, x + 15, y + 16, [
    [0, "rgba(125,211,252,.95)"],
    [0.6, "rgba(56,189,248,.75)"],
    [1, "rgba(14,116,144,.9)"],
  ]);
  rr(c, x + 2, y + 3, 11, 9, 1.5);
  c.fill();
  // il gruista dentro (casco giallo)
  c.fillStyle = "#facc15";
  c.beginPath();
  c.arc(x + 7.5, y + 8, 2.2, Math.PI, 0);
  c.fill();
  c.fillStyle = "rgba(255,255,255,.5)";
  c.fillRect(x + 3, y + 4, 2, 6);
};

// ---------------------------------------------------------------- MOLO DEL PORTO (sfondo fermo)
export const paintPortBackground = (c, { L, R, fy, by, vh }) => {
  const rnd = seeded(23);
  const top = -60;
  const sea = fy - 74; // orizzonte
  // cielo all'alba: blu in alto, arancio sull'orizzonte
  c.fillStyle = lin(c, 0, top, 0, sea, [
    [0, "#1e3a8a"],
    [0.45, "#3b82f6"],
    [0.8, "#fdba74"],
    [1, "#fde68a"],
  ]);
  c.fillRect(L, top, R - L, sea - top);
  // sole basso con alone
  c.fillStyle = rad(c, 250, sea - 8, 0, 70, [
    [0, "rgba(255,247,200,1)"],
    [0.2, "rgba(254,215,170,.9)"],
    [1, "rgba(254,215,170,0)"],
  ]);
  c.fillRect(L, sea - 80, R - L, 80);
  // nuvole
  for (let i = 0; i < 7; i++) {
    const x = L + rnd() * (R - L);
    const y = top + 40 + rnd() * (sea - top - 120);
    c.fillStyle = `rgba(255,255,255,${0.35 + rnd() * 0.3})`;
    for (let k = 0; k < 4; k++) {
      c.beginPath();
      c.ellipse(x + k * 12, y + (k % 2) * 3, 16, 6, 0, 0, TAU);
      c.fill();
    }
  }
  // gru lontane del porto (sagome)
  c.fillStyle = "rgba(30,41,59,.45)";
  [[L + 20, 0.8], [R - 70, 1], [L + (R - L) * 0.42, 0.65]].forEach(([x, k]) => {
    const h = 90 * k;
    c.fillRect(x, sea - h, 4 * k, h);
    c.fillRect(x + 26 * k, sea - h, 4 * k, h);
    c.fillRect(x - 30 * k, sea - h - 4, 110 * k, 5 * k);
    c.beginPath();
    c.moveTo(x, sea - h - 4);
    c.lineTo(x + 12 * k, sea - h - 40 * k);
    c.lineTo(x + 30 * k, sea - h - 4);
    c.fill();
  });
  // mare con i riflessi
  c.fillStyle = lin(c, 0, sea, 0, fy, [
    [0, "#1d4ed8"],
    [1, "#0c4a6e"],
  ]);
  c.fillRect(L, sea, R - L, fy - sea);
  for (let i = 0; i < 70; i++) {
    const y = sea + 2 + rnd() * (fy - sea - 26);
    const near = (y - sea) / (fy - sea);
    c.fillStyle = `rgba(255,237,213,${0.12 + rnd() * 0.25})`;
    c.fillRect(L + rnd() * (R - L), y, 4 + near * 12 + rnd() * 6, 0.9);
  }
  // NAVE portacontainer in fondo a destra
  const sx = 150;
  const sy = sea + 10;
  c.fillStyle = "#7f1d1d";
  c.beginPath();
  c.moveTo(sx, sy);
  c.lineTo(R + 40, sy);
  c.lineTo(R + 40, sy + 22);
  c.lineTo(sx + 14, sy + 22);
  c.closePath();
  c.fill();
  c.fillStyle = "#111827";
  c.fillRect(sx + 6, sy - 2, R + 40 - sx, 3);
  const cont = ["#dc2626", "#2563eb", "#16a34a", "#f59e0b", "#e2e8f0", "#0f766e", "#7c3aed"];
  for (let x = sx + 12; x < R + 30; x += 15) {
    const n = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      c.fillStyle = cont[Math.floor(rnd() * cont.length)];
      c.fillRect(x, sy - 9 - k * 8, 14, 7);
      c.fillStyle = "rgba(0,0,0,.2)";
      c.fillRect(x, sy - 3 - k * 8, 14, 1);
    }
  }
  // ponte di comando
  c.fillStyle = "#f1f5f9";
  c.fillRect(sx + 18, sy - 36, 20, 34);
  c.fillStyle = "#0f172a";
  c.fillRect(sx + 20, sy - 33, 16, 4);
  // banchina (muro del molo) con i parabordi
  c.fillStyle = lin(c, 0, fy - 22, 0, fy, [
    [0, "#9ca3af"],
    [1, "#6b7280"],
  ]);
  c.fillRect(L, fy - 22, R - L, 22);
  c.fillStyle = "rgba(255,255,255,.25)";
  c.fillRect(L, fy - 22, R - L, 1);
  for (let x = Math.floor(L / 60) * 60 + 20; x < R; x += 60) {
    c.fillStyle = "#111827";
    rr(c, x, fy - 18, 10, 14, 3);
    c.fill();
  }
  // container impilati sul molo (dietro il magazzino, a sinistra)
  for (let k = 0; k < 2; k++) {
    for (let x = L; x < 10; x += 34) {
      c.fillStyle = cont[Math.floor(rnd() * cont.length)];
      c.fillRect(x, fy - 22 - (k + 1) * 16, 32, 15);
      c.strokeStyle = "rgba(0,0,0,.2)";
      c.lineWidth = 0.6;
      for (let r2 = x + 3; r2 < x + 32; r2 += 3) {
        c.beginPath();
        c.moveTo(r2, fy - 22 - (k + 1) * 16);
        c.lineTo(r2, fy - 22 - k * 16 - 1);
        c.stroke();
      }
    }
  }
  // pavimento del molo: asfalto (con la zona magazzino e le scritte)
  paintFloor(c, { L, R, fy, vh, colors: ["#6b7280", "#4b5563", "#1f2937"] }, rnd);
  // bitte d'ormeggio sul bordo
  for (let x = Math.floor(L / 90) * 90 + 40; x < R; x += 90) {
    if (x > 0 && x < 360) continue;
    c.fillStyle = "#111827";
    rr(c, x - 4, fy - 8, 8, 8, 2);
    c.fill();
  }
};

// ---------------------------------------------------------------- PERSONE
const SKIN = ["#f1c7a3", "#e0ac83", "#c68642", "#8d5524"];
const HAT = ["#facc15", "#f8fafc", "#f97316", "#3b82f6"];
const VEST = ["#f97316", "#facc15", "#84cc16"];

// gente che lavora: x dove sta, dir 1/-1, walk = passo (0 = fermo), kind: "walk" | "phone" | "smoke"
export const makePeople = (L, R, fy, seed = 5) => {
  const r = seeded(seed);
  const list = [
    { kind: "walk", x: L + 40, speed: 22 },
    { kind: "walk", x: R - 60, speed: 17 },
    { kind: "phone", x: (L + R) / 2, speed: 9 },
    { kind: "smoke", x: R > 420 ? R - 26 : R - 34, speed: 0 },
  ];
  return list.map((p, i) => ({
    ...p,
    dir: i % 2 ? -1 : 1,
    skin: SKIN[Math.floor(r() * SKIN.length)],
    hat: HAT[i % HAT.length],
    vest: VEST[Math.floor(r() * VEST.length)],
    ph: r() * 6,
    stop: 0,
    min: L + 14,
    max: R - 14,
  }));
};

export const movePeople = (list, dt) => {
  list.forEach((p) => {
    if (!p.speed) return;
    if (p.stop > 0) {
      p.stop -= dt;
      return;
    }
    p.x += p.dir * p.speed * dt;
    if (p.x < p.min || p.x > p.max) {
      p.dir *= -1;
      p.x = Math.max(p.min, Math.min(p.max, p.x));
      p.stop = 1 + (p.ph % 2);
    }
    // ogni tanto si ferma a guardare
    if (Math.random() < dt * 0.06) p.stop = 1.5 + Math.random() * 2;
  });
};

// un operaio alto ~30 (dietro i pezzi: un po' più piccolo e scuro per la distanza)
const paintPerson = (c, p, y, t, front = 0) => {
  const walking = p.speed && p.stop <= 0;
  const k = walking ? Math.sin(t * p.speed * 0.32 + p.ph) : 0;
  c.save();
  c.translate(p.x, y);
  const sc = front ? 0.95 : 0.86;
  c.scale(p.dir < 0 ? -sc : sc, sc);
  // ombra
  c.fillStyle = "rgba(2,6,23,.25)";
  c.beginPath();
  c.ellipse(0, 0, 8, 2, 0, 0, TAU);
  c.fill();
  // gambe (pantaloni da lavoro) e scarponi
  c.strokeStyle = "#1e293b";
  c.lineWidth = 3.4;
  c.lineCap = "round";
  [k, -k].forEach((s) => {
    c.beginPath();
    c.moveTo(0, -14);
    c.lineTo(s * 4.5, -1.5);
    c.stroke();
    c.fillStyle = "#0f172a";
    rr(c, s * 4.5 - 2, -2.6, 5, 2.6, 1);
    c.fill();
  });
  // busto con il gilet ad alta visibilità e le bande riflettenti
  c.fillStyle = "#334155";
  rr(c, -4.5, -27, 9, 14, 3);
  c.fill();
  c.fillStyle = p.vest;
  rr(c, -4.5, -26, 9, 12, 2.5);
  c.fill();
  c.fillStyle = "rgba(255,255,255,.85)";
  c.fillRect(-4.5, -21, 9, 1.2);
  c.fillRect(-4.5, -17.5, 9, 1.2);
  // braccia
  c.strokeStyle = p.vest;
  c.lineWidth = 2.6;
  if (p.kind === "phone") {
    c.beginPath();
    c.moveTo(1, -24);
    c.lineTo(4, -29);
    c.stroke();
    c.fillStyle = "#0f172a";
    c.fillRect(3, -33, 2, 4);
  } else if (p.kind === "smoke") {
    // porta la sigaretta alla bocca ogni tanto
    const up = (Math.sin(t * 0.9 + p.ph) + 1) / 2 > 0.7;
    c.beginPath();
    c.moveTo(1, -24);
    c.lineTo(up ? 4.5 : 6, up ? -30 : -19);
    c.stroke();
    const cx = up ? 5.5 : 7.5;
    const cy = up ? -31 : -19;
    c.strokeStyle = "#f8fafc";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx - 1.5, cy);
    c.lineTo(cx + 1.5, cy);
    c.stroke();
    c.fillStyle = (Math.sin(t * 5) + 1) / 2 > 0.4 ? "#fb923c" : "#ef4444";
    c.beginPath();
    c.arc(cx + 2, cy, 0.9, 0, TAU);
    c.fill();
  } else {
    c.beginPath();
    c.moveTo(0, -24);
    c.lineTo(-k * 4, -16);
    c.stroke();
  }
  c.strokeStyle = p.vest;
  c.lineWidth = 2.6;
  if (p.kind !== "walk") {
    c.beginPath();
    c.moveTo(-1, -24);
    c.lineTo(-3, -16);
    c.stroke();
  } else {
    c.beginPath();
    c.moveTo(0, -24);
    c.lineTo(k * 4, -16);
    c.stroke();
  }
  // testa e casco
  c.fillStyle = p.skin;
  c.beginPath();
  c.arc(0, -30.5, 3.6, 0, TAU);
  c.fill();
  c.fillStyle = p.hat;
  c.beginPath();
  c.arc(0, -31.5, 4.2, Math.PI, 0);
  c.fill();
  c.fillRect(-5, -31.8, 10, 1.4);
  c.restore();
  // fumo della sigaretta: sbuffi che salgono e si allargano
  if (p.kind === "smoke") {
    for (let i = 0; i < 5; i++) {
      const a = (t * 0.45 + i / 5) % 1;
      const sx = p.x + (p.dir < 0 ? -6 : 6) + Math.sin(a * 6 + i) * 3 + a * 6;
      const sy = y - 27 - a * 26;
      c.fillStyle = `rgba(148,163,184,${0.6 * (1 - a)})`;
      c.beginPath();
      c.arc(sx, sy, 1.2 + a * 3.4, 0, TAU);
      c.fill();
    }
  }
};

// y = dove poggiano i piedi; front = sulla passerella davanti (un po' più grandi)
export const paintPeople = (c, list, y, t, front = 0) => {
  list.forEach((p) => paintPerson(c, p, y, t, front));
};

// ---------------------------------------------------------------- MULETTO
// x = punta delle forche (dove sta il pezzo), y = pavimento, dir 1 = va verso destra (porta), -1 = torna indietro
export const paintForklift = (c, { x, y, item, dir = 1, t = 0, moving = false }) => {
  c.save();
  // le forche sono sempre davanti, verso il magazzino (a destra): il corpo sta a sinistra della punta
  const bx = x - 40; // retro del muletto
  const wob = moving ? Math.sin(t * 30) * 0.4 : 0;
  c.translate(0, wob);
  // ombra
  c.fillStyle = "rgba(2,6,23,.3)";
  c.beginPath();
  c.ellipse(bx + 20, y, 26, 3, 0, 0, TAU);
  c.fill();
  // contrappeso e carrozzeria gialla
  c.fillStyle = lin(c, 0, y - 22, 0, y - 6, [
    [0, "#fde047"],
    [1, "#ca8a04"],
  ]);
  rr(c, bx, y - 22, 30, 16, 3);
  c.fill();
  c.fillStyle = "#111827";
  c.fillRect(bx, y - 10, 30, 3);
  // gabbia di protezione e guidatore
  c.strokeStyle = "#1f2937";
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(bx + 4, y - 22);
  c.lineTo(bx + 6, y - 44);
  c.lineTo(bx + 26, y - 44);
  c.lineTo(bx + 28, y - 22);
  c.stroke();
  c.fillStyle = "#f97316";
  rr(c, bx + 11, y - 34, 8, 11, 2);
  c.fill();
  c.fillStyle = "#e0ac83";
  c.beginPath();
  c.arc(bx + 15, y - 37, 3, 0, TAU);
  c.fill();
  c.fillStyle = "#facc15";
  c.beginPath();
  c.arc(bx + 15, y - 38, 3.4, Math.PI, 0);
  c.fill();
  // lampeggiante arancio sul tetto
  if (moving && Math.sin(t * 12) > 0) {
    c.fillStyle = "rgba(251,146,60,.9)";
    c.beginPath();
    c.arc(bx + 16, y - 46, 2.2, 0, TAU);
    c.fill();
  }
  // montante e forche
  c.fillStyle = "#334155";
  c.fillRect(bx + 31, y - 48, 3, 46);
  c.fillRect(bx + 35, y - 48, 2, 46);
  c.fillStyle = "#1e293b";
  c.fillRect(bx + 33, y - 5, 26, 2.5);
  // ruote
  [bx + 7, bx + 26].forEach((wx, i) => {
    c.fillStyle = "#0f172a";
    c.beginPath();
    c.arc(wx, y - 4, i ? 4.5 : 4, 0, TAU);
    c.fill();
    c.fillStyle = "#94a3b8";
    c.beginPath();
    c.arc(wx, y - 4, 1.6, 0, TAU);
    c.fill();
  });
  c.restore();
  // il pezzo sulle forche
  if (item) paintItem(c, item, x, y - 5 + wob);
  void dir;
};

// ---------------------------------------------------------------- METEO (porto)
export const paintWeather = (c, { L, R, by, fy, t, kind, wind = 0 }) => {
  if (kind === "pioggia") {
    const lean = Math.max(-0.6, Math.min(0.6, wind / 500));
    c.save();
    c.strokeStyle = "rgba(219,234,254,.8)";
    c.lineWidth = 1.2;
    const W = R - L;
    for (let i = 0; i < 150; i++) {
      const sp = 380 + (i % 7) * 40;
      const x0 = L + ((i * 97.13) % W);
      const y = by - 120 + ((t * sp + i * 53) % (fy - by + 140));
      const x = x0 + (y - by) * lean * 0.3;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + lean * 8, y + 9);
      c.stroke();
    }
    // schizzi a terra
    c.fillStyle = "rgba(191,219,254,.5)";
    for (let i = 0; i < 18; i++) {
      const a = (t * 2 + i * 0.37) % 1;
      const x = L + ((i * 61.7) % (R - L));
      c.beginPath();
      c.ellipse(x, fy + 1, 1 + a * 4, 0.6 + a, 0, 0, TAU);
      c.globalAlpha = 1 - a;
      c.fill();
    }
    c.restore();
  } else if (kind === "nebbia") {
    c.save();
    for (let i = 0; i < 5; i++) {
      const y = by + 30 + i * ((fy - by) / 5);
      const x = L + (((t * (8 + i * 3) + i * 90) % (R - L + 200)) - 100);
      const g = c.createRadialGradient(x, y, 10, x, y, 170);
      g.addColorStop(0, "rgba(226,232,240,.42)");
      g.addColorStop(1, "rgba(226,232,240,0)");
      c.fillStyle = g;
      c.fillRect(x - 170, y - 170, 340, 340);
    }
    c.fillStyle = "rgba(226,232,240,.16)";
    c.fillRect(L, by - 120, R - L, fy - by + 160);
    c.restore();
  }
};

// ---------------------------------------------------------------- GIORNO, SERA, NOTTE (ora vera)
export const dayPhase = (d = new Date()) => {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 7 && h < 17) return "giorno";
  if ((h >= 17 && h < 20) || (h >= 6 && h < 7)) return "sera";
  return "notte";
};
// si dipinge sopra lo sfondo fermo (una volta sola): luce più calda la sera, buio e lampade accese di notte
export const paintTimeOfDay = (c, { L, R, fy, by, vh, phase, port }) => {
  if (phase === "giorno") return;
  const top = -60;
  const night = phase === "notte";
  c.save();
  c.fillStyle = night ? "rgba(2,6,23,.5)" : "rgba(124,45,18,.16)";
  c.fillRect(L, top, R - L, vh + 100);
  if (!night) {
    c.fillStyle = "rgba(30,27,75,.12)";
    c.fillRect(L, top, R - L, vh + 100);
  }
  if (port && night) {
    // stelle e luna sopra il mare
    const r = seeded(91);
    const sea = fy - 74;
    c.fillStyle = "rgba(255,255,255,.85)";
    for (let i = 0; i < 70; i++) {
      c.globalAlpha = 0.4 + r() * 0.6;
      c.fillRect(L + r() * (R - L), top + r() * (sea - top - 40), 1, 1);
    }
    c.globalAlpha = 1;
    c.fillStyle = rad(c, 70, top + 110, 0, 40, [
      [0, "rgba(254,249,195,.5)"],
      [1, "rgba(254,249,195,0)"],
    ]);
    c.fillRect(30, top + 70, 80, 80);
    c.fillStyle = "#fef9c3";
    c.beginPath();
    c.arc(70, top + 110, 11, 0, TAU);
    c.fill();
    c.fillStyle = "rgba(2,6,23,.55)";
    c.beginPath();
    c.arc(75, top + 106, 10, 0, TAU);
    c.fill();
    // luci della nave e dei lampioni del molo
    c.globalCompositeOperation = "lighter";
    for (let x = 160; x < R; x += 17) {
      c.fillStyle = "rgba(253,224,71,.8)";
      c.fillRect(x, sea + 14, 1.5, 1.5);
    }
    for (let x = Math.floor(L / 120) * 120 + 60; x < R; x += 120) {
      c.fillStyle = lin(c, 0, by - 40, 0, fy, [
        [0, "rgba(255,237,180,.28)"],
        [1, "rgba(255,237,180,0)"],
      ]);
      c.beginPath();
      c.moveTo(x - 4, by - 40);
      c.lineTo(x + 4, by - 40);
      c.lineTo(x + 60, fy);
      c.lineTo(x - 60, fy);
      c.closePath();
      c.fill();
    }
  } else {
    // capannone: le lampade accese (più forti col buio)
    c.globalCompositeOperation = "lighter";
    const k = night ? 1 : 0.5;
    for (let x = Math.floor(L / 120) * 120 + 60; x < R; x += 120) {
      c.fillStyle = lin(c, 0, by - 52, 0, fy, [
        [0, `rgba(255,236,179,${0.38 * k})`],
        [0.6, `rgba(255,236,179,${0.12 * k})`],
        [1, "rgba(255,236,179,0)"],
      ]);
      c.beginPath();
      c.moveTo(x - 9, by - 52);
      c.lineTo(x + 9, by - 52);
      c.lineTo(x + 76, fy);
      c.lineTo(x - 76, fy);
      c.closePath();
      c.fill();
      c.fillStyle = rad(c, x, by - 51, 0, 26, [
        [0, `rgba(255,250,220,${0.9 * k})`],
        [1, "rgba(255,250,220,0)"],
      ]);
      c.beginPath();
      c.arc(x, by - 51, 26, 0, TAU);
      c.fill();
    }
  }
  c.restore();
};
