// DISEGNARE SULLA FOTO: frecce, cerchi e tratti a mano libera per indicare il punto rotto
// (il filo della fune, la crepa…). Si apre dalla matita sulla foto (Nuovo rapporto e Modifica rapporto).
// La foto con i segni prende il posto di quella di prima e finisce così nel rapporto stampato.
import React, { useEffect, useRef, useState } from "react";
import { X, Check, Undo2, MoveUpRight, Circle, Pencil, Trash2, Loader2 } from "lucide-react";
import { PHOTO_MAX_CHARS } from "../../utils";

const COLORS = [
  ["#ef4444", "Rosso"],
  ["#facc15", "Giallo"],
  ["#ffffff", "Bianco"],
];
const TOOLS = [
  ["arrow", "Freccia", MoveUpRight],
  ["circle", "Cerchio", Circle],
  ["pen", "Penna", Pencil],
];

// disegna un segno (coordinate in pixel della foto)
export const drawMark = (ctx, m, scale = 1) => {
  const w = m.w * scale;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = m.color;
  ctx.fillStyle = m.color;
  ctx.lineWidth = w;
  // bordo scuro sotto, così il segno si vede anche su sfondi chiari
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = w * 0.9;
  const P = m.pts.map(([x, y]) => [x * scale, y * scale]);
  if (m.tool === "pen" && P.length) {
    ctx.beginPath();
    ctx.moveTo(P[0][0], P[0][1]);
    P.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    if (P.length === 1) ctx.lineTo(P[0][0] + 0.1, P[0][1]);
    ctx.stroke();
  } else if (m.tool === "circle" && P.length >= 2) {
    const [[x0, y0], [x1, y1]] = [P[0], P[P.length - 1]];
    const rx = Math.max(Math.abs(x1 - x0) / 2, w);
    const ry = Math.max(Math.abs(y1 - y0) / 2, w);
    ctx.beginPath();
    ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (m.tool === "arrow" && P.length >= 2) {
    const [x0, y0] = P[0];
    const [x1, y1] = P[P.length - 1];
    const a = Math.atan2(y1 - y0, x1 - x0);
    const head = Math.max(w * 3.5, 24 * scale);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1 - Math.cos(a) * head * 0.6, y1 - Math.sin(a) * head * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45));
    ctx.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
};

const loadImg = (src) =>
  new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });

export const PhotoMarkup = ({ src, onSave, onClose }) => {
  const [img, setImg] = useState(null);
  const [marks, setMarks] = useState([]);
  const [tool, setTool] = useState("arrow");
  const [color, setColor] = useState(COLORS[0][0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const wrap = useRef(null);
  const canvas = useRef(null);
  const cur = useRef(null);
  const [view, setView] = useState({ w: 0, h: 0, k: 1 });

  useEffect(() => {
    let alive = true;
    loadImg(src)
      .then((im) => alive && setImg(im))
      .catch(() => alive && setErr("Non riesco ad aprire la foto."));
    return () => {
      alive = false;
    };
  }, [src]);

  // misura: la foto sta tutta nello schermo
  useEffect(() => {
    if (!img || !wrap.current) return undefined;
    const fit = () => {
      const W = wrap.current.clientWidth;
      const H = wrap.current.clientHeight;
      const k = Math.min(W / img.naturalWidth, H / img.naturalHeight);
      setView({ w: Math.round(img.naturalWidth * k), h: Math.round(img.naturalHeight * k), k });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [img]);

  // ridisegna
  useEffect(() => {
    const c = canvas.current;
    if (!c || !img || !view.w) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(view.w * dpr);
    c.height = Math.round(view.h * dpr);
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(img, 0, 0, view.w, view.h);
    [...marks, cur.current].filter(Boolean).forEach((m) => drawMark(ctx, m, view.k));
  });
  const [, force] = useState(0);
  const redraw = () => force((n) => n + 1);

  const at = (e) => {
    const r = canvas.current.getBoundingClientRect();
    return [(e.clientX - r.left) / view.k, (e.clientY - r.top) / view.k];
  };
  const lineW = img ? Math.max(6, Math.round(Math.max(img.naturalWidth, img.naturalHeight) / 90)) : 8;
  const down = (e) => {
    if (!img) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (er) {
      // non importa
    }
    cur.current = { tool, color, w: lineW, pts: [at(e)] };
    redraw();
  };
  const move = (e) => {
    if (!cur.current) return;
    const p = at(e);
    if (cur.current.tool === "pen") cur.current.pts.push(p);
    else cur.current.pts = [cur.current.pts[0], p];
    redraw();
  };
  const up = () => {
    const m = cur.current;
    cur.current = null;
    if (!m) return;
    // un tocco senza trascinare: per freccia e cerchio non vale
    const [a, b] = [m.pts[0], m.pts[m.pts.length - 1]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (m.tool !== "pen" && len < lineW * 2) {
      redraw();
      return;
    }
    setMarks((p) => [...p, m]);
  };

  const save = async () => {
    if (!img) return;
    if (!marks.length) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      marks.forEach((m) => drawMark(ctx, m, 1));
      let out = "";
      for (const q of [0.85, 0.75, 0.65, 0.55, 0.45]) {
        out = c.toDataURL("image/jpeg", q);
        if (out.length <= PHOTO_MAX_CHARS) break;
      }
      onSave(out);
    } catch (e) {
      console.error(e);
      setErr("Non riesco a salvare la foto.");
      setBusy(false);
    }
  };

  const btn = "h-10 px-3 rounded-full text-sm font-bold flex items-center gap-1.5";
  return (
    <div className="fixed inset-0 z-[700] bg-slate-950 flex flex-col" data-section="photo-markup">
      <div className="flex items-center gap-2 p-3" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <button type="button" onClick={onClose} aria-label="Chiudi senza salvare" className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>
        <p className="flex-1 text-white font-bold text-sm">Disegna sulla foto</p>
        <button type="button" disabled={!marks.length} onClick={() => setMarks((p) => p.slice(0, -1))} aria-label="Annulla l'ultimo segno" data-action="markup-undo" className={`${btn} bg-white/10 text-white disabled:opacity-40`}>
          <Undo2 className="w-4 h-4" />
        </button>
        <button type="button" disabled={!marks.length} onClick={() => setMarks([])} aria-label="Cancella tutti i segni" data-action="markup-clear" className={`${btn} bg-white/10 text-white disabled:opacity-40`}>
          <Trash2 className="w-4 h-4" />
        </button>
        <button type="button" disabled={busy || !img} onClick={save} data-action="markup-save" className={`${btn} bg-emerald-500 text-white`}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Fatto
        </button>
      </div>

      <div ref={wrap} className="flex-1 min-h-0 flex items-center justify-center px-2">
        {err ? (
          <p className="text-white text-sm">{err}</p>
        ) : !img ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : (
          <canvas
            ref={canvas}
            data-markup-canvas
            style={{ width: view.w, height: view.h, touchAction: "none" }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          />
        )}
      </div>

      <div className="p-3 space-y-2" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <div className="grid grid-cols-3 gap-2">
          {TOOLS.map(([id, label, Ic]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              aria-pressed={tool === id}
              data-markup-tool={id}
              className={`h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 ${tool === id ? "bg-white text-slate-900" : "bg-white/10 text-white"}`}
            >
              <Ic className="w-5 h-5" /> {label}
            </button>
          ))}
        </div>
        <div className="flex justify-center gap-3">
          {COLORS.map(([c, label]) => (
            <button
              key={c}
              type="button"
              aria-label={label}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              data-markup-color={label}
              className={`w-9 h-9 rounded-full border-2 ${color === c ? "border-white scale-110" : "border-white/20"}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
