// GRAFICA DEL GIOCO IN ALTA DEFINIZIONE: capannone, carroponte, camion e pezzi disegnati con luci,
// ombre, riflessi e materiali (acciaio, legno, vetro, vernice). Coordinate «virtuali» (larghezza 360).
// Lo sfondo fermo si disegna una volta sola su una tela a parte (vedi engine.draw): così resta veloce.

const TAU = Math.PI * 2;
const FONT = '"Barlow", "Barlow Condensed", system-ui, sans-serif';

// numeri «a caso» ma sempre uguali (lo sfondo non deve cambiare a ogni disegno)
const seeded = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const lin = (c, x0, y0, x1, y1, stops) => {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([p, col]) => g.addColorStop(p, col));
  return g;
};
const rad = (c, x, y, r0, r1, stops) => {
  const g = c.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([p, col]) => g.addColorStop(p, col));
  return g;
};
const rr = (c, x, y, w, h, r) => {
  c.beginPath();
  if (c.roundRect) c.roundRect(x, y, w, h, r);
  else c.rect(x, y, w, h);
};
// ombra morbida a terra (ellisse sfumata: molto più leggera di shadowBlur)
export const softShadow = (c, x, y, w, alpha = 0.35, hgt = 5) => {
  c.save();
  c.translate(x, y);
  c.scale(1, hgt / w);
  c.fillStyle = rad(c, 0, 0, 0, w, [
    [0, `rgba(2,6,23,${alpha})`],
    [0.6, `rgba(2,6,23,${alpha * 0.45})`],
    [1, "rgba(2,6,23,0)"],
  ]);
  c.beginPath();
  c.arc(0, 0, w, 0, TAU);
  c.fill();
  c.restore();
};
const bolt = (c, x, y, r = 1.1) => {
  c.fillStyle = rad(c, x - r * 0.3, y - r * 0.3, 0, r * 1.4, [
    [0, "rgba(255,255,255,.9)"],
    [0.4, "rgba(148,163,184,.9)"],
    [1, "rgba(30,41,59,.9)"],
  ]);
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
};

// ---------------------------------------------------------------- SFONDO (fermo)
export const paintBackground = (c, { L, R, fy, by, vh }) => {
  const rnd = seeded(7);
  const top = -60;
  // 1) cielo fuori dai finestroni (si vede solo dentro le finestre, ma serve il colore)
  // 2) parete in lamiera grecata: pannelli verticali con luce che arriva dall'alto a sinistra
  c.fillStyle = lin(c, 0, top, 0, fy, [
    [0, "#5b6b82"],
    [0.45, "#8a9ab0"],
    [1, "#a9b6c7"],
  ]);
  c.fillRect(L, top, R - L, fy - top);
  for (let x = Math.floor(L / 12) * 12; x < R; x += 12) {
    c.fillStyle = lin(c, x, 0, x + 12, 0, [
      [0, "rgba(255,255,255,.10)"],
      [0.35, "rgba(255,255,255,.02)"],
      [0.5, "rgba(15,23,42,.10)"],
      [1, "rgba(255,255,255,.06)"],
    ]);
    c.fillRect(x, by - 120, 12, fy - by + 120);
  }
  // giunte orizzontali dei pannelli
  c.fillStyle = "rgba(15,23,42,.12)";
  for (let y = by - 40; y < fy - 60; y += 70) c.fillRect(L, y, R - L, 1.2);
  // fascia bassa in cemento (zoccolo) con macchie
  c.fillStyle = lin(c, 0, fy - 48, 0, fy, [
    [0, "#8b95a3"],
    [1, "#6f7a88"],
  ]);
  c.fillRect(L, fy - 48, R - L, 48);
  c.fillStyle = "rgba(255,255,255,.18)";
  c.fillRect(L, fy - 48, R - L, 1);
  for (let i = 0; i < 90; i++) {
    c.fillStyle = `rgba(30,41,59,${0.04 + rnd() * 0.06})`;
    c.beginPath();
    c.arc(L + rnd() * (R - L), fy - 46 + rnd() * 44, 0.6 + rnd() * 2.2, 0, TAU);
    c.fill();
  }

  // tetto: travature reticolari in acciaio
  c.fillStyle = lin(c, 0, top, 0, by - 118, [
    [0, "#1b2433"],
    [1, "#2c3a4f"],
  ]);
  c.fillRect(L, top, R - L, by - 118 - top);
  // copertura vista da sotto: arcarecci e lucernari che fanno entrare la luce
  for (let y = top + 8; y < by - 168; y += 16) {
    c.fillStyle = lin(c, 0, y, 0, y + 5, [
      [0, "rgba(148,163,184,.35)"],
      [1, "rgba(15,23,42,.5)"],
    ]);
    c.fillRect(L, y, R - L, 5);
  }
  for (let x = Math.floor(L / 120) * 120 + 20; x < R; x += 120) {
    const sy = Math.max(top + 4, by - 230);
    const sh = Math.max(20, by - 175 - sy);
    c.fillStyle = lin(c, 0, sy, 0, sy + sh, [
      [0, "rgba(224,242,254,.55)"],
      [1, "rgba(186,230,253,.15)"],
    ]);
    c.fillRect(x, sy, 80, sh);
    c.strokeStyle = "rgba(15,23,42,.45)";
    c.lineWidth = 1;
    for (let k = 1; k < 4; k++) {
      c.beginPath();
      c.moveTo(x + k * 20, sy);
      c.lineTo(x + k * 20, sy + sh);
      c.stroke();
    }
    c.fillStyle = lin(c, x, sy + sh, x, by - 120, [
      [0, "rgba(224,242,254,.10)"],
      [1, "rgba(224,242,254,0)"],
    ]);
    c.fillRect(x - 10, sy + sh, 100, Math.max(0, by - 120 - sy - sh));
  }
  const chordY = by - 122;
  c.fillStyle = lin(c, 0, chordY - 3, 0, chordY + 4, [
    [0, "#64748b"],
    [0.5, "#334155"],
    [1, "#0f172a"],
  ]);
  c.fillRect(L, chordY - 3, R - L, 7);
  c.strokeStyle = "#475569";
  c.lineWidth = 2.2;
  for (let x = Math.floor(L / 40) * 40; x < R; x += 40) {
    c.beginPath();
    c.moveTo(x, chordY);
    c.lineTo(x + 20, chordY - 38);
    c.lineTo(x + 40, chordY);
    c.stroke();
  }
  c.strokeStyle = "rgba(148,163,184,.35)";
  c.lineWidth = 0.8;
  for (let x = Math.floor(L / 40) * 40; x < R; x += 40) {
    c.beginPath();
    c.moveTo(x + 1, chordY - 1);
    c.lineTo(x + 20, chordY - 37);
    c.stroke();
  }
  c.fillStyle = lin(c, 0, chordY - 42, 0, chordY - 36, [
    [0, "#475569"],
    [1, "#1e293b"],
  ]);
  c.fillRect(L, chordY - 42, R - L, 5);

  // finestroni: cielo, nuvole, telaio, riflesso e raggi di sole che entrano
  for (let x = Math.floor(L / 90) * 90 + 15; x < R; x += 90) {
    const wy = by - 112;
    c.fillStyle = lin(c, 0, wy, 0, wy + 42, [
      [0, "#9fd3ff"],
      [1, "#e8f6ff"],
    ]);
    c.fillRect(x, wy, 60, 42);
    // nuvolette
    c.fillStyle = "rgba(255,255,255,.85)";
    [
      [x + 14, wy + 14, 6],
      [x + 21, wy + 12, 8],
      [x + 29, wy + 15, 5],
      [x + 44, wy + 26, 5],
      [x + 50, wy + 24, 6],
    ].forEach(([cx, cy, r]) => {
      c.beginPath();
      c.arc(cx, cy, r, 0, TAU);
      c.fill();
    });
    // riflesso del vetro
    c.fillStyle = "rgba(255,255,255,.28)";
    c.beginPath();
    c.moveTo(x + 6, wy + 42);
    c.lineTo(x + 22, wy);
    c.lineTo(x + 30, wy);
    c.lineTo(x + 14, wy + 42);
    c.closePath();
    c.fill();
    // telaio
    c.strokeStyle = "#334155";
    c.lineWidth = 2.4;
    c.strokeRect(x, wy, 60, 42);
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x + 30, wy);
    c.lineTo(x + 30, wy + 42);
    c.moveTo(x, wy + 21);
    c.lineTo(x + 60, wy + 21);
    c.stroke();
    c.fillStyle = "rgba(255,255,255,.25)";
    c.fillRect(x - 1, wy + 43, 62, 1.5);
    // raggio di sole che entra in diagonale
    c.fillStyle = lin(c, x, wy, x + 120, fy, [
      [0, "rgba(255,244,214,.22)"],
      [1, "rgba(255,244,214,0)"],
    ]);
    c.beginPath();
    c.moveTo(x, wy + 42);
    c.lineTo(x + 60, wy + 42);
    c.lineTo(x + 150, fy);
    c.lineTo(x + 80, fy);
    c.closePath();
    c.fill();
  }

  // scritta dipinta sul muro
  c.save();
  c.font = `900 15px ${FONT}`;
  c.textAlign = "center";
  c.fillStyle = "rgba(15,23,42,.30)";
  c.fillText("ELETTROMECCANICA MORA", 180.6, by - 29.4);
  c.fillStyle = "rgba(255,255,255,.18)";
  c.fillText("ELETTROMECCANICA MORA", 180, by - 30);
  c.restore();

  // ombra della trave del carroponte sul muro
  c.fillStyle = lin(c, 0, by, 0, by + 26, [
    [0, "rgba(2,6,23,.28)"],
    [1, "rgba(2,6,23,0)"],
  ]);
  c.fillRect(L, by, R - L, 26);
  // portone sezionale del carico (a destra)
  const dx = 140;
  const dw = 220;
  const dTop = fy - 152;
  c.fillStyle = lin(c, 0, dTop, 0, fy, [
    [0, "#7c8a9e"],
    [1, "#5d6b80"],
  ]);
  c.fillRect(dx, dTop, dw, fy - dTop);
  for (let y = dTop + 4; y < fy; y += 12) {
    c.fillStyle = "rgba(255,255,255,.18)";
    c.fillRect(dx + 2, y, dw - 4, 1);
    c.fillStyle = "rgba(15,23,42,.28)";
    c.fillRect(dx + 2, y + 9, dw - 4, 2);
  }
  // cornice gialla e nera
  c.fillStyle = "#eab308";
  c.fillRect(dx - 3, dTop - 6, dw + 6, 6);
  c.fillRect(dx - 3, dTop - 6, 5, fy - dTop + 6);
  c.save();
  c.beginPath();
  c.rect(dx - 3, dTop - 6, dw + 6, 6);
  c.clip();
  c.fillStyle = "#111827";
  for (let i = dx - 10; i < dx + dw + 10; i += 12) {
    c.beginPath();
    c.moveTo(i, dTop - 6);
    c.lineTo(i + 6, dTop - 6);
    c.lineTo(i + 1, dTop);
    c.lineTo(i - 5, dTop);
    c.closePath();
    c.fill();
  }
  c.restore();
  // ombra del portone sul pavimento (occlusione)
  c.fillStyle = lin(c, 0, fy - 14, 0, fy, [
    [0, "rgba(15,23,42,0)"],
    [1, "rgba(15,23,42,.25)"],
  ]);
  c.fillRect(L, fy - 14, R - L, 14);

  // lampade industriali con il cono di luce
  for (let x = Math.floor(L / 120) * 120 + 60; x < R; x += 120) {
    c.strokeStyle = "#0f172a";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, chordY);
    c.lineTo(x, by - 62);
    c.stroke();
    // cono di luce (sfumato)
    c.fillStyle = lin(c, 0, by - 52, 0, fy, [
      [0, "rgba(255,247,214,.42)"],
      [0.5, "rgba(255,247,214,.14)"],
      [1, "rgba(255,247,214,0)"],
    ]);
    c.beginPath();
    c.moveTo(x - 9, by - 52);
    c.lineTo(x + 9, by - 52);
    c.lineTo(x + 70, fy);
    c.lineTo(x - 70, fy);
    c.closePath();
    c.fill();
    // pozza di luce sul pavimento
    c.save();
    c.translate(x, fy + 6);
    c.scale(1, 0.18);
    c.fillStyle = rad(c, 0, 0, 0, 80, [
      [0, "rgba(255,247,214,.40)"],
      [1, "rgba(255,247,214,0)"],
    ]);
    c.beginPath();
    c.arc(0, 0, 80, 0, TAU);
    c.fill();
    c.restore();
    // corpo della lampada (campana metallica)
    c.fillStyle = lin(c, x - 11, 0, x + 11, 0, [
      [0, "#1e293b"],
      [0.4, "#64748b"],
      [1, "#0f172a"],
    ]);
    c.beginPath();
    c.moveTo(x - 4, by - 63);
    c.lineTo(x + 4, by - 63);
    c.lineTo(x + 11, by - 52);
    c.lineTo(x - 11, by - 52);
    c.closePath();
    c.fill();
    // bagliore
    c.fillStyle = rad(c, x, by - 51, 0, 18, [
      [0, "rgba(255,255,240,1)"],
      [0.25, "rgba(255,244,200,.7)"],
      [1, "rgba(255,244,200,0)"],
    ]);
    c.beginPath();
    c.arc(x, by - 51, 18, 0, TAU);
    c.fill();
  }

  // PAVIMENTO in cemento lucidato (con granelli e lucido)
  c.fillStyle = lin(c, 0, fy, 0, vh + 40, [
    [0, "#aab3bf"],
    [0.25, "#8d97a5"],
    [1, "#5d6775"],
  ]);
  c.fillRect(L, fy, R - L, vh - fy + 40);
  for (let i = 0; i < 260; i++) {
    const a = rnd();
    c.fillStyle = a > 0.5 ? `rgba(255,255,255,${0.05 + rnd() * 0.08})` : `rgba(15,23,42,${0.05 + rnd() * 0.08})`;
    c.fillRect(L + rnd() * (R - L), fy + 2 + rnd() * (vh - fy), 0.8 + rnd() * 1.4, 0.8);
  }
  // giunti del pavimento
  c.strokeStyle = "rgba(15,23,42,.18)";
  c.lineWidth = 1;
  for (let x = Math.floor(L / 120) * 120; x < R; x += 120) {
    c.beginPath();
    c.moveTo(x, fy);
    c.lineTo(x - 40, vh + 40);
    c.stroke();
  }
  // bordo del pavimento: linea gialla di sicurezza con lucido
  c.fillStyle = lin(c, 0, fy, 0, fy + 3, [
    [0, "#fde047"],
    [1, "#ca8a04"],
  ]);
  c.fillRect(L, fy, R - L, 3);
  // zona magazzino: strisce gialle e nere dipinte (un po' consumate)
  c.save();
  c.beginPath();
  c.rect(8, fy + 6, 132, 14);
  c.clip();
  c.fillStyle = "#111827";
  c.fillRect(8, fy + 6, 132, 14);
  c.fillStyle = "#facc15";
  for (let x = 0; x < 200; x += 12) {
    c.beginPath();
    c.moveTo(x, fy + 6);
    c.lineTo(x + 6, fy + 6);
    c.lineTo(x - 2, fy + 20);
    c.lineTo(x - 8, fy + 20);
    c.closePath();
    c.fill();
  }
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(148,163,184,${0.15 + rnd() * 0.25})`;
    c.fillRect(8 + rnd() * 132, fy + 6 + rnd() * 14, 1 + rnd() * 3, 1);
  }
  c.restore();
  c.save();
  c.font = `800 9px ${FONT}`;
  c.textAlign = "center";
  c.fillStyle = "rgba(255,255,255,.85)";
  c.fillText("MAGAZZINO", 72, fy + 34);
  c.fillText("CARICO", 224, fy + 34);
  c.restore();
};

// tela della «vignettatura» (bordi un po' più scuri: effetto foto)
export const paintVignette = (c, w, h) => {
  const g = c.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h * 0.45, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(2,6,23,0)");
  g.addColorStop(1, "rgba(2,6,23,.38)");
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
};

// ---------------------------------------------------------------- PEZZI
export const paintItem = (c, o, x, base) => {
  const w = o.w;
  const h = o.h;
  const l = x - w / 2;
  const t = base - h;
  c.save();
  if (o.kind === "cassa") {
    // cassa di legno: assi con venature, cornice, croce di rinforzo e chiodi
    const tone = o.tone || 0.5;
    const wood = tone > 0.5 ? ["#d79b4a", "#b97a2c", "#8a5518"] : ["#cf9142", "#ac6e24", "#7d4b14"];
    const ph = (h - 4) / 3;
    for (let i = 0; i < 3; i++) {
      const py = t + 2 + i * ph;
      c.fillStyle = lin(c, 0, py, 0, py + ph, [
        [0, wood[0]],
        [1, wood[1]],
      ]);
      c.fillRect(l + 2, py, w - 4, ph - 0.8);
      c.strokeStyle = "rgba(90,50,10,.25)";
      c.lineWidth = 0.5;
      c.beginPath();
      c.moveTo(l + 4, py + ph * 0.35);
      c.bezierCurveTo(l + w * 0.3, py + ph * 0.2, l + w * 0.6, py + ph * 0.55, l + w - 4, py + ph * 0.4);
      c.stroke();
    }
    c.strokeStyle = wood[2];
    c.lineWidth = 3;
    c.strokeRect(l + 1.5, t + 1.5, w - 3, h - 3);
    c.lineWidth = 3.2;
    c.beginPath();
    c.moveTo(l + 3, base - 3);
    c.lineTo(l + w - 3, t + 3);
    c.stroke();
    c.strokeStyle = "rgba(255,230,180,.35)";
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(l + 3, base - 4.5);
    c.lineTo(l + w - 4.5, t + 3);
    c.stroke();
    [
      [l + 3, t + 3],
      [l + w - 3, t + 3],
      [l + 3, base - 3],
      [l + w - 3, base - 3],
    ].forEach(([bx, byy]) => bolt(c, bx, byy, 0.9));
    // luce dall'alto e ombra a destra
    c.fillStyle = lin(c, l, 0, l + w, 0, [
      [0, "rgba(255,255,255,.08)"],
      [0.7, "rgba(0,0,0,0)"],
      [1, "rgba(0,0,0,.22)"],
    ]);
    c.fillRect(l, t, w, h);
  } else if (o.kind === "bobina") {
    // bobina di lamiera d'acciaio: metallo lucido, spire, foro centrale, reggetta blu
    const r = h / 2;
    const cy = t + r;
    c.fillStyle = rad(c, x - r * 0.35, cy - r * 0.4, r * 0.1, r * 1.1, [
      [0, "#f8fafc"],
      [0.35, "#cbd5e1"],
      [0.8, "#64748b"],
      [1, "#334155"],
    ]);
    c.beginPath();
    c.arc(x, cy, r, 0, TAU);
    c.fill();
    c.strokeStyle = "rgba(51,65,85,.35)";
    c.lineWidth = 0.6;
    for (let i = 1; i < 7; i++) {
      c.beginPath();
      c.arc(x, cy, r - i * 2.1, 0, TAU);
      c.stroke();
    }
    c.fillStyle = rad(c, x, cy, 0, 6, [
      [0, "#020617"],
      [0.7, "#1e293b"],
      [1, "#64748b"],
    ]);
    c.beginPath();
    c.arc(x, cy, 6, 0, TAU);
    c.fill();
    c.strokeStyle = "rgba(255,255,255,.7)";
    c.lineWidth = 1.4;
    c.beginPath();
    c.arc(x, cy, r - 2, Math.PI * 1.08, Math.PI * 1.45);
    c.stroke();
    c.fillStyle = "#1d4ed8";
    c.fillRect(x - 2, t, 4, h);
    c.fillStyle = "rgba(255,255,255,.35)";
    c.fillRect(x - 2, t, 1, h);
  } else if (o.kind === "motore") {
    // motore elettrico: carcassa blu con alette, scatola morsetti, albero e piedi
    const bw = w - 7;
    c.fillStyle = "#0f172a";
    c.fillRect(l + 3, base - 4, bw - 6, 4);
    c.fillStyle = lin(c, 0, t + 4, 0, base - 3, [
      [0, "#60a5fa"],
      [0.25, "#2563eb"],
      [0.7, "#1d4ed8"],
      [1, "#172554"],
    ]);
    rr(c, l, t + 5, bw, h - 9, 5);
    c.fill();
    for (let i = 0; i < 6; i++) {
      const fx = l + 5 + i * ((bw - 10) / 5);
      c.fillStyle = "rgba(15,23,42,.35)";
      c.fillRect(fx, t + 7, 1.6, h - 13);
      c.fillStyle = "rgba(255,255,255,.25)";
      c.fillRect(fx + 1.6, t + 7, 0.8, h - 13);
    }
    c.fillStyle = lin(c, 0, t, 0, t + 6, [
      [0, "#93c5fd"],
      [1, "#1e40af"],
    ]);
    rr(c, l + bw * 0.35, t, 12, 7, 1.5);
    c.fill();
    c.fillStyle = lin(c, l + bw, 0, l + bw + 7, 0, [
      [0, "#94a3b8"],
      [0.5, "#e2e8f0"],
      [1, "#64748b"],
    ]);
    rr(c, l + bw - 1, t + h / 2 - 3, 8, 6, 1.5);
    c.fill();
    c.fillStyle = "rgba(255,255,255,.35)";
    rr(c, l + 3, t + 7, bw - 6, 2.2, 1);
    c.fill();
  } else if (o.kind === "fusto") {
    // fusto in metallo verniciato: cilindro con riflesso, nervature e etichetta
    c.fillStyle = lin(c, l, 0, l + w, 0, [
      [0, "#7f1d1d"],
      [0.25, "#ef4444"],
      [0.45, "#f87171"],
      [0.7, "#dc2626"],
      [1, "#7f1d1d"],
    ]);
    rr(c, l, t + 1, w, h - 1, 3);
    c.fill();
    [0.12, 0.42, 0.72, 0.95].forEach((k) => {
      const ry = t + h * k;
      c.fillStyle = "rgba(69,10,10,.55)";
      c.fillRect(l, ry, w, 1.6);
      c.fillStyle = "rgba(255,255,255,.25)";
      c.fillRect(l, ry - 0.8, w, 0.8);
    });
    c.fillStyle = "#f8fafc";
    c.fillRect(l + 6, t + h * 0.5, w - 12, h * 0.18);
    c.fillStyle = "#f97316";
    c.save();
    c.translate(x, t + h * 0.59);
    c.rotate(Math.PI / 4);
    c.fillRect(-2.4, -2.4, 4.8, 4.8);
    c.restore();
    c.fillStyle = lin(c, l, 0, l + w, 0, [
      [0, "#991b1b"],
      [0.5, "#fca5a5"],
      [1, "#991b1b"],
    ]);
    c.save();
    c.translate(x, t + 1.5);
    c.scale(1, 0.18);
    c.beginPath();
    c.arc(0, 0, w / 2, 0, TAU);
    c.fill();
    c.restore();
  } else if (o.kind === "vetro") {
    // lastra di vetro in cassa a giorno: riflessi, bordo verdino, scritta FRAGILE
    c.fillStyle = lin(c, 0, t, 0, base, [
      [0, "#b5893f"],
      [1, "#8a6224"],
    ]);
    c.fillRect(l, t, 3.5, h);
    c.fillRect(l + w - 3.5, t, 3.5, h);
    c.fillRect(l, base - 3.5, w, 3.5);
    c.fillStyle = lin(c, l, t, l + w, base, [
      [0, "rgba(186,230,253,.95)"],
      [0.5, "rgba(125,211,252,.75)"],
      [1, "rgba(14,165,233,.7)"],
    ]);
    c.fillRect(l + 3.5, t + 2, w - 7, h - 5.5);
    c.fillStyle = "rgba(167,243,208,.6)";
    c.fillRect(l + 3.5, t + 2, w - 7, 1.2);
    c.fillStyle = "rgba(255,255,255,.75)";
    c.beginPath();
    c.moveTo(l + 8, base - 6);
    c.lineTo(l + 17, t + 3);
    c.lineTo(l + 21, t + 3);
    c.lineTo(l + 12, base - 6);
    c.closePath();
    c.fill();
    c.fillStyle = "rgba(255,255,255,.4)";
    c.beginPath();
    c.moveTo(l + 22, base - 6);
    c.lineTo(l + 28, t + 3);
    c.lineTo(l + 30, t + 3);
    c.lineTo(l + 24, base - 6);
    c.closePath();
    c.fill();
    c.fillStyle = "#b91c1c";
    rr(c, x - 15, base - 13, 30, 8, 1.5);
    c.fill();
    c.fillStyle = "#fff";
    c.font = `900 6.4px ${FONT}`;
    c.textAlign = "center";
    c.fillText("FRAGILE", x, base - 7);
  } else {
    // trave a doppia T in acciaio
    c.fillStyle = lin(c, 0, t, 0, t + 4, [
      [0, "#cbd5e1"],
      [1, "#64748b"],
    ]);
    c.fillRect(l, t, w, 4);
    c.fillStyle = lin(c, 0, base - 4, 0, base, [
      [0, "#94a3b8"],
      [1, "#334155"],
    ]);
    c.fillRect(l, base - 4, w, 4);
    c.fillStyle = lin(c, 0, t + 4, 0, base - 4, [
      [0, "#475569"],
      [1, "#334155"],
    ]);
    c.fillRect(l + 1, t + 4, w - 2, h - 8);
    c.fillStyle = "rgba(255,255,255,.55)";
    c.fillRect(l, t, w, 0.8);
    c.fillStyle = "rgba(180,83,9,.25)";
    c.fillRect(l + w * 0.62, t + 5, w * 0.2, h - 10);
    c.fillStyle = "#e2e8f0";
    c.font = `800 5px ${FONT}`;
    c.textAlign = "left";
    c.fillText("HEB 160", l + 4, base - 5.5);
  }
  if (o.dmg) {
    // ammaccatura e crepa
    c.strokeStyle = "rgba(2,6,23,.85)";
    c.lineWidth = 1.1;
    c.beginPath();
    c.moveTo(l + w * 0.3, t);
    c.lineTo(l + w * 0.42, t + h * 0.4);
    c.lineTo(l + w * 0.33, t + h * 0.62);
    c.lineTo(l + w * 0.45, t + h * 0.8);
    c.stroke();
    c.fillStyle = "rgba(2,6,23,.18)";
    c.beginPath();
    c.arc(l + w * 0.38, t + h * 0.45, h * 0.22, 0, TAU);
    c.fill();
  }
  c.restore();
};

// ---------------------------------------------------------------- CAMION
export const paintTruck = (c, { x0, x1, bedY, floorY, color, t }) => {
  const wy = floorY - 8;
  softShadow(c, (x0 + x1 + 46) / 2, floorY + 1, (x1 - x0 + 60) / 2, 0.5, 6);
  // telaio
  c.fillStyle = lin(c, 0, bedY + 7, 0, bedY + 16, [
    [0, "#334155"],
    [1, "#0b1220"],
  ]);
  c.fillRect(x0, bedY + 7, x1 - x0 + 48, 9);
  // pianale in legno con sponde
  c.fillStyle = lin(c, 0, bedY, 0, bedY + 7, [
    [0, "#9a6b33"],
    [1, "#6b4520"],
  ]);
  c.fillRect(x0, bedY, x1 - x0, 7);
  c.fillStyle = "rgba(0,0,0,.25)";
  for (let x = x0 + 14; x < x1; x += 14) c.fillRect(x, bedY, 0.8, 7);
  c.fillStyle = lin(c, 0, bedY - 2, 0, bedY + 1, [
    [0, "#e2e8f0"],
    [1, "#64748b"],
  ]);
  c.fillRect(x0, bedY - 1.5, x1 - x0, 2);
  c.fillStyle = "#475569";
  c.fillRect(x0 - 1, bedY - 10, 3, 17);
  // cabina: vernice con riflesso
  const cx = x1 + 2;
  const top = bedY - 30;
  c.fillStyle = lin(c, 0, top, 0, bedY + 15, [
    [0, shade(color, 40)],
    [0.35, color],
    [1, shade(color, -45)],
  ]);
  c.beginPath();
  c.moveTo(cx, top + 6);
  c.quadraticCurveTo(cx, top, cx + 6, top);
  c.lineTo(cx + 30, top);
  c.quadraticCurveTo(cx + 40, top + 2, cx + 44, top + 14);
  c.lineTo(cx + 46, top + 28);
  c.lineTo(cx + 46, bedY + 15);
  c.lineTo(cx, bedY + 15);
  c.closePath();
  c.fill();
  // parabrezza con riflesso del cielo
  c.fillStyle = lin(c, cx + 22, top + 4, cx + 44, top + 22, [
    [0, "#e0f2fe"],
    [0.5, "#7dd3fc"],
    [1, "#0c4a6e"],
  ]);
  c.beginPath();
  c.moveTo(cx + 24, top + 4);
  c.lineTo(cx + 31, top + 4);
  c.quadraticCurveTo(cx + 39, top + 6, cx + 42, top + 17);
  c.lineTo(cx + 42, top + 21);
  c.lineTo(cx + 24, top + 21);
  c.closePath();
  c.fill();
  c.fillStyle = "rgba(255,255,255,.55)";
  c.beginPath();
  c.moveTo(cx + 27, top + 21);
  c.lineTo(cx + 33, top + 5);
  c.lineTo(cx + 35, top + 5);
  c.lineTo(cx + 29, top + 21);
  c.closePath();
  c.fill();
  // finestrino laterale
  c.fillStyle = lin(c, 0, top + 5, 0, top + 20, [
    [0, "#bae6fd"],
    [1, "#0369a1"],
  ]);
  rr(c, cx + 5, top + 5, 15, 15, 2);
  c.fill();
  // maniglia, specchietto, faro, paraurti
  c.fillStyle = "rgba(15,23,42,.6)";
  c.fillRect(cx + 7, top + 25, 7, 1.5);
  c.fillStyle = "#0f172a";
  c.fillRect(cx + 44, top + 6, 3, 9);
  c.fillStyle = rad(c, cx + 45, bedY + 6, 0, 10, [
    [0, "rgba(255,255,230,1)"],
    [0.3, "rgba(254,240,138,.7)"],
    [1, "rgba(254,240,138,0)"],
  ]);
  c.beginPath();
  c.arc(cx + 45, bedY + 6, 10, 0, TAU);
  c.fill();
  c.fillStyle = lin(c, 0, bedY + 12, 0, bedY + 17, [
    [0, "#f1f5f9"],
    [1, "#475569"],
  ]);
  c.fillRect(cx + 30, bedY + 12, 18, 5);
  // linea di luce sulla vernice
  c.fillStyle = "rgba(255,255,255,.25)";
  c.fillRect(cx + 1, top + 23, 22, 1.2);
  // ruote: gomma, cerchio cromato, bulloni
  [x0 + 18, x0 + 52, x1 + 26].forEach((wx) => {
    c.fillStyle = "#020617";
    c.beginPath();
    c.arc(wx, wy, 9, Math.PI, 0);
    c.lineTo(wx + 10, wy - 4);
    c.lineTo(wx - 10, wy - 4);
    c.fill();
    c.fillStyle = rad(c, wx - 2, wy - 2, 1, 9, [
      [0, "#334155"],
      [0.7, "#0f172a"],
      [1, "#020617"],
    ]);
    c.beginPath();
    c.arc(wx, wy, 8.5, 0, TAU);
    c.fill();
    c.fillStyle = rad(c, wx - 1, wy - 1, 0, 4.5, [
      [0, "#f8fafc"],
      [0.6, "#94a3b8"],
      [1, "#475569"],
    ]);
    c.beginPath();
    c.arc(wx, wy, 4.2, 0, TAU);
    c.fill();
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU + (t || 0);
      bolt(c, wx + Math.cos(a) * 2.6, wy + Math.sin(a) * 2.6, 0.55);
    }
  });
};
// colore più chiaro (+) o più scuro (-)
export const shade = (hex, amt) => {
  const h = String(hex).replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  const f = (v) => Math.max(0, Math.min(255, v + amt));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `rgb(${r},${g},${b})`;
};

// ---------------------------------------------------------------- CARROPONTE
export const paintCrane = (c, { by, floorY, VW, look, name, trolley, hook, th, t, moving }) => {
  const lk = look;
  // colonne (profilati HEA) con mensole delle vie di corsa
  [2, VW - 12].forEach((cx) => {
    c.fillStyle = lin(c, cx, 0, cx + 10, 0, [
      [0, "#1e293b"],
      [0.35, "#64748b"],
      [0.6, "#475569"],
      [1, "#0f172a"],
    ]);
    c.fillRect(cx, by - 26, 10, floorY - by + 26);
    c.fillStyle = "rgba(255,255,255,.15)";
    c.fillRect(cx + 3, by - 26, 1, floorY - by + 26);
    for (let y = by + 10; y < floorY - 10; y += 46) bolt(c, cx + 5, y, 1);
    c.fillStyle = "#334155";
    c.fillRect(cx - 2, floorY - 4, 14, 4);
  });
  // trave a cassone: ala superiore, anima colorata, ala inferiore, nervature
  const gy = by - 22;
  const gh = 22;
  c.fillStyle = lin(c, 0, gy, 0, gy + gh, [
    [0, shade(lk.top, 30)],
    [0.18, lk.top],
    [0.75, lk.bottom],
    [1, shade(lk.bottom, -40)],
  ]);
  c.fillRect(0, gy, VW, gh);
  c.fillStyle = "rgba(255,255,255,.55)";
  c.fillRect(0, gy, VW, 1.2);
  c.fillStyle = "rgba(0,0,0,.25)";
  c.fillRect(0, gy + 3.5, VW, 0.8);
  c.fillRect(0, gy + gh - 4, VW, 0.8);
  c.fillStyle = lk.edge;
  c.fillRect(0, gy + gh - 2, VW, 2);
  // nervature verticali
  for (let x = 34; x < VW - 30; x += 18) {
    c.fillStyle = "rgba(0,0,0,.12)";
    c.fillRect(x, gy + 4, 1.2, gh - 8);
    c.fillStyle = "rgba(255,255,255,.18)";
    c.fillRect(x + 1.2, gy + 4, 0.6, gh - 8);
  }
  if (lk.stripes) {
    c.save();
    c.beginPath();
    c.rect(26, gy + 4, 100, gh - 8);
    c.rect(234, gy + 4, 100, gh - 8);
    c.clip();
    c.fillStyle = "#111827";
    for (let i = 0; i < VW + 40; i += 14) {
      c.beginPath();
      c.moveTo(i, gy);
      c.lineTo(i + 7, gy);
      c.lineTo(i - 13, gy + gh);
      c.lineTo(i - 20, gy + gh);
      c.closePath();
      c.fill();
    }
    c.restore();
  }
  // testate con strisce di pericolo e ruote
  [0, VW - 26].forEach((x) => {
    c.save();
    c.beginPath();
    c.rect(x, gy, 26, gh);
    c.clip();
    c.fillStyle = "#facc15";
    c.fillRect(x, gy, 26, gh);
    c.fillStyle = "#111827";
    for (let i = -24; i < 44; i += 10) {
      c.beginPath();
      c.moveTo(x + i, gy);
      c.lineTo(x + i + 5, gy);
      c.lineTo(x + i + 27, gy + gh);
      c.lineTo(x + i + 22, gy + gh);
      c.closePath();
      c.fill();
    }
    c.fillStyle = lin(c, 0, gy, 0, gy + gh, [
      [0, "rgba(255,255,255,.25)"],
      [1, "rgba(0,0,0,.3)"],
    ]);
    c.fillRect(x, gy, 26, gh);
    c.restore();
  });
  // targa al centro con la portata (e il tuo nome)
  const label = name ? `${name} · 5 t` : "5 t";
  c.save();
  c.font = `900 9px ${FONT}`;
  const tw = Math.max(26, c.measureText(label).width + 12);
  c.fillStyle = "rgba(255,255,255,.92)";
  rr(c, 180 - tw / 2, gy + 5, tw, 12, 2);
  c.fill();
  c.strokeStyle = "rgba(15,23,42,.6)";
  c.lineWidth = 0.6;
  rr(c, 180 - tw / 2, gy + 5, tw, 12, 2);
  c.stroke();
  bolt(c, 180 - tw / 2 + 2.5, gy + 11, 0.7);
  bolt(c, 180 + tw / 2 - 2.5, gy + 11, 0.7);
  c.fillStyle = "#0f172a";
  c.textAlign = "center";
  c.fillText(label, 180, gy + 14.2);
  c.restore();

  // CARRELLO: telaio, ruote sulla trave, motore e tamburo della fune
  const tx = trolley.x;
  c.fillStyle = lin(c, 0, by - 6, 0, by + 12, [
    [0, "#64748b"],
    [0.4, "#334155"],
    [1, "#0f172a"],
  ]);
  rr(c, tx - 22, by - 5, 44, 16, 2.5);
  c.fill();
  [tx - 14, tx + 14].forEach((wx) => {
    c.fillStyle = rad(c, wx - 1, by - 6, 0, 4.5, [
      [0, "#cbd5e1"],
      [0.6, "#334155"],
      [1, "#020617"],
    ]);
    c.beginPath();
    c.arc(wx, by - 5, 4.2, 0, TAU);
    c.fill();
  });
  // tamburo con le spire della fune
  c.fillStyle = lin(c, 0, by - 1, 0, by + 8, [
    [0, "#e2e8f0"],
    [0.5, "#94a3b8"],
    [1, "#334155"],
  ]);
  c.fillRect(tx - 9, by - 1, 18, 8);
  c.strokeStyle = "rgba(15,23,42,.45)";
  c.lineWidth = 0.5;
  for (let i = -8; i < 9; i += 2) {
    c.beginPath();
    c.moveTo(tx + i, by - 1);
    c.lineTo(tx + i + 1, by + 7);
    c.stroke();
  }
  // motore del sollevamento (colore della trave)
  c.fillStyle = lin(c, 0, by - 2, 0, by + 8, [
    [0, shade(lk.top, 20)],
    [1, shade(lk.bottom, -30)],
  ]);
  rr(c, tx + 11, by - 2, 9, 10, 2);
  c.fill();
  // lampeggiante quando si muove (con bagliore)
  if (moving && Math.sin(t * 14) > 0) {
    c.save();
    c.globalCompositeOperation = "lighter";
    c.fillStyle = rad(c, tx - 17, by - 8, 0, 9, [
      [0, "rgba(255,200,80,1)"],
      [0.3, "rgba(251,146,60,.8)"],
      [1, "rgba(251,146,60,0)"],
    ]);
    c.beginPath();
    c.arc(tx - 17, by - 8, 9, 0, TAU);
    c.fill();
    c.restore();
  }
  c.fillStyle = "#f97316";
  c.beginPath();
  c.arc(tx - 17, by - 8, 2.2, Math.PI, 0);
  c.fill();

  // FUNI d'acciaio (due tratti, con riflesso e trefoli)
  const { hx, hy } = hook;
  [-4, 4].forEach((d) => {
    c.strokeStyle = "#111827";
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(tx + d, by + 8);
    c.lineTo(hx + d, hy + 1);
    c.stroke();
    c.strokeStyle = "rgba(226,232,240,.75)";
    c.lineWidth = 0.6;
    c.setLineDash([1.6, 1.4]);
    c.beginPath();
    c.moveTo(tx + d - 0.4, by + 8);
    c.lineTo(hx + d - 0.4, hy + 1);
    c.stroke();
    c.setLineDash([]);
  });

  // BOZZELLO e GANCIO forgiato
  c.save();
  c.translate(hx, hy);
  c.rotate(-th);
  c.fillStyle = lin(c, -10, 0, 10, 0, [
    [0, "#b45309"],
    [0.35, "#fbbf24"],
    [0.6, "#f59e0b"],
    [1, "#92400e"],
  ]);
  rr(c, -10, 0, 20, 11, 3);
  c.fill();
  c.save();
  c.beginPath();
  rr(c, -10, 0, 20, 11, 3);
  c.clip();
  c.fillStyle = "#111827";
  for (let i = -14; i < 14; i += 6) {
    c.beginPath();
    c.moveTo(i, 11);
    c.lineTo(i + 3, 11);
    c.lineTo(i + 8, 0);
    c.lineTo(i + 5, 0);
    c.closePath();
    c.fill();
  }
  c.restore();
  c.fillStyle = rad(c, -0.6, 4.4, 0, 3.4, [
    [0, "#f1f5f9"],
    [0.6, "#64748b"],
    [1, "#1e293b"],
  ]);
  c.beginPath();
  c.arc(0, 5, 3, 0, TAU);
  c.fill();
  // gancio
  c.strokeStyle = lin(c, -4, 0, 4, 0, [
    [0, "#1e293b"],
    [0.4, "#94a3b8"],
    [1, "#0f172a"],
  ]);
  c.lineWidth = 2.6;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(0, 11);
  c.lineTo(0, 14);
  c.arc(-2.6, 14.5, 2.7, 0, Math.PI, false);
  c.stroke();
  c.strokeStyle = "#ef4444";
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(-5.2, 14.2);
  c.lineTo(-0.6, 12.4);
  c.stroke();
  c.restore();
};

// granelli di polvere che galleggiano nei coni di luce
export const paintDust = (c, motes, t) => {
  c.save();
  c.globalCompositeOperation = "lighter";
  motes.forEach((m) => {
    const y = m.y + Math.sin(t * m.sp + m.ph) * 6;
    const x = m.x + Math.cos(t * m.sp * 0.7 + m.ph) * 4;
    c.fillStyle = `rgba(255,248,220,${m.a * (0.6 + 0.4 * Math.sin(t * 2 + m.ph))})`;
    c.beginPath();
    c.arc(x, y, m.r, 0, TAU);
    c.fill();
  });
  c.restore();
};
