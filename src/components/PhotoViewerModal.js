import React, { useEffect, useRef, useState } from "react";
import {
  Download,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { isPhotoRef, resolvePhotos } from "../logPhotos";

// GALLERIA FOTO A SCHERMO INTERO (come la galleria del telefono)
//  - scorri a destra/sinistra: la foto segue il dito e arriva quella dopo/prima
//  - due dita: ingrandisci proprio dove hai le dita · doppio tocco: ingrandisci lì (di nuovo: torna normale)
//  - ingrandita: la sposti col dito · tira giù (non ingrandita): lo sfondo si schiarisce e si chiude
//  - computer: frecce ← → della tastiera, Esc chiude, doppio clic ingrandisce
// figure dei manuali (disegni con le quote): sfondo chiaro, zoom fino a 6×, didascalia, niente «scarica»
const MAX = 4;
const ZOOM = 2.5;
const Viewer = ({ photos, onClose, figure = null }) => {
  const maxZoom = figure ? 6 : MAX;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [z, setZ] = useState({ s: 1, x: 0, y: 0 });
  const [drag, setDrag] = useState({ dx: 0, dy: 0, live: false });
  const [still, setStill] = useState(false); // cambio foto senza movimento (dopo lo scorrimento)
  const g = useRef(null);
  const stage = useRef(null);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const busy = useRef(false);
  const n = photos ? photos.length : 0;

  const box = () => {
    const r = stage.current ? stage.current.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
  };
  // ingrandita non deve uscire dallo schermo più del necessario
  const clamp = (o) => {
    if (o.s <= 1.02) return { s: 1, x: 0, y: 0 };
    const b = box();
    const mx = (b.w * (o.s - 1)) / 2;
    const my = (b.h * (o.s - 1)) / 2;
    return { s: o.s, x: Math.max(-mx, Math.min(mx, o.x)), y: Math.max(-my, Math.min(my, o.y)) };
  };
  const zoomAt = (px, py, s) => {
    const b = box();
    return clamp({ s, x: (px - b.cx) * (1 - s), y: (py - b.cy) * (1 - s) });
  };

  const go = (d) => {
    if (n < 2 || busy.current) return;
    busy.current = true;
    const w = box().w;
    setZ({ s: 1, x: 0, y: 0 });
    setDrag({ dx: d > 0 ? -w : w, dy: 0, live: false });
    setTimeout(() => {
      setStill(true);
      setCurrentIndex((p) => (p + d + n) % n);
      setDrag({ dx: 0, dy: 0, live: false });
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setStill(false);
          busy.current = false;
        })
      );
    }, 230);
  };

  useEffect(() => {
    const k = (e) => {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const mid = (t) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const tStart = (e) => {
    if (busy.current) return;
    const t = e.touches;
    if (t.length === 2) {
      const b = box();
      const m = mid(t);
      // punto della foto sotto le dita: resta sotto le dita mentre ingrandisci
      g.current = { pinch: dist(t), s0: z.s, px: (m.x - b.cx - z.x) / z.s, py: (m.y - b.cy - z.y) / z.s };
      setDrag({ dx: 0, dy: 0, live: false });
    } else g.current = { x0: t[0].clientX, y0: t[0].clientY, zx: z.x, zy: z.y, dx: 0, dy: 0, t0: Date.now(), axis: "" };
  };
  const tMove = (e) => {
    const c = g.current;
    if (!c) return;
    const t = e.touches;
    if (c.pinch && t.length === 2) {
      const b = box();
      const m = mid(t);
      const s = Math.min(maxZoom, Math.max(0.8, (c.s0 * dist(t)) / c.pinch));
      setZ({ s, x: m.x - b.cx - c.px * s, y: m.y - b.cy - c.py * s });
      return;
    }
    if (t.length !== 1 || c.pinch) return;
    c.dx = t[0].clientX - c.x0;
    c.dy = t[0].clientY - c.y0;
    if (z.s > 1) {
      setZ((o) => ({ ...o, x: c.zx + c.dx, y: c.zy + c.dy }));
      return;
    }
    if (!c.axis && Math.hypot(c.dx, c.dy) > 8) c.axis = Math.abs(c.dx) > Math.abs(c.dy) ? "x" : "y";
    if (c.axis === "x") setDrag({ dx: n > 1 ? c.dx : c.dx / 4, dy: 0, live: true });
    else if (c.axis === "y") setDrag({ dx: 0, dy: Math.max(0, c.dy), live: true });
  };
  const tEnd = (e) => {
    const c = g.current;
    if (e && e.touches && e.touches.length) {
      // tolto un dito su due: continuo a spostare con quello rimasto
      if (c && c.pinch) g.current = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, zx: z.x, zy: z.y, dx: 0, dy: 0, t0: Date.now(), axis: "", after: true };
      return;
    }
    g.current = null;
    if (!c) return;
    if (c.pinch || c.after) {
      setZ((o) => clamp(o));
      return;
    }
    // tocco (senza spostare): doppio tocco = ingrandisci lì, oppure torna normale
    if (Math.hypot(c.dx, c.dy) < 10) {
      setDrag({ dx: 0, dy: 0, live: false });
      const now = Date.now();
      const l = lastTap.current;
      if (now - l.t < 300 && Math.hypot(c.x0 - l.x, c.y0 - l.y) < 40) {
        setZ((o) => (o.s > 1 ? { s: 1, x: 0, y: 0 } : zoomAt(c.x0, c.y0, ZOOM)));
        lastTap.current = { t: 0, x: 0, y: 0 };
      } else lastTap.current = { t: now, x: c.x0, y: c.y0 };
      return;
    }
    if (z.s > 1) {
      setZ((o) => clamp(o));
      return;
    }
    const w = box().w;
    const fast = Date.now() - c.t0 < 250;
    if (c.axis === "x" && n > 1 && (Math.abs(c.dx) > w * 0.25 || (fast && Math.abs(c.dx) > 40))) return go(c.dx < 0 ? 1 : -1);
    if (c.axis === "y" && (c.dy > 120 || (fast && c.dy > 60))) return onClose();
    setDrag({ dx: 0, dy: 0, live: false });
  };

  if (!photos || photos.length === 0) return null;

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = photos[currentIndex];
    link.download = `foto_intervento_${currentIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const moving = drag.live || !!g.current;
  const ease = still || moving ? "none" : "transform .23s cubic-bezier(.2,.8,.2,1)";
  const fade = Math.max(0.35, 1 - drag.dy / 420);
  const slides = n > 1 ? [-1, 0, 1] : [0];

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in"
      style={{ backgroundColor: figure ? `rgba(248,250,252,${0.98 * fade})` : `rgba(0,0,0,${0.95 * fade})` }}
      data-section="photo-viewer"
      data-figure={figure ? "1" : undefined}
    >
      <div className="absolute top-4 right-4 flex gap-4 z-10 items-center" style={{ opacity: fade }}>
        {n > 1 && (
        <div className="bg-black/50 text-white px-4 py-2 rounded-full font-bold text-xs flex items-center shadow-lg" data-photo-count>
          {currentIndex + 1} / {photos.length}
        </div>
        )}
        {!figure && (
        <button
          onClick={handleDownload}
          className="p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all shadow-lg"
          title="Scarica questa foto"
        >
          <Download className="w-6 h-6" />
        </button>
        )}
        <button
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all shadow-lg"
          title="Chiudi"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div
        ref={stage}
        className="relative w-full max-w-5xl flex-1 min-h-0 overflow-hidden touch-none select-none"
        onTouchStart={tStart}
        onTouchMove={tMove}
        onTouchEnd={tEnd}
        onTouchCancel={tEnd}
        onDoubleClick={(e) => setZ((o) => (o.s > 1 ? { s: 1, x: 0, y: 0 } : zoomAt(e.clientX, e.clientY, ZOOM)))}
        data-section="photo-stage"
        data-zoom={z.s.toFixed(2)}
      >
        <div className="absolute inset-0" style={{ transform: `translate(${drag.dx}px, ${drag.dy}px) scale(${1 - drag.dy / 1600})`, transition: ease }} data-photo-track>
          {slides.map((off) => {
            const i = (currentIndex + off + n) % n;
            const cur = off === 0;
            return (
              <div key={off === 0 ? `c${i}` : off} className="absolute inset-0 flex items-center justify-center" style={{ transform: `translateX(${off * 100}%)` }} aria-hidden={!cur}>
                <img
                  src={photos[i]}
                  alt={`Foto ${i + 1}`}
                  draggable={false}
                  data-photo-current={cur ? "" : undefined}
                  className={`max-w-full max-h-full object-contain select-none ${figure ? "rounded-2xl border border-slate-200 bg-white" : "rounded-xl shadow-2xl"}`}
                  style={cur ? { transform: `translate(${z.x}px, ${z.y}px) scale(${z.s})`, transition: g.current ? "none" : "transform .22s cubic-bezier(.2,.8,.2,1)" } : undefined}
                />
              </div>
            );
          })}
        </div>

        {photos.length > 1 && z.s <= 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Foto prima"
              className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all shadow-lg"
              style={{ opacity: fade }}
            >
              <ArrowLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Foto dopo"
              className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 p-3 md:p-4 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all shadow-lg"
              style={{ opacity: fade }}
            >
              <ArrowRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="mt-6 flex gap-3 overflow-x-auto pb-4 max-w-full px-4" style={{ opacity: fade }}>
          {photos.map((p, i) => (
            <img
              key={i}
              src={p}
              onClick={() => {
                setZ({ s: 1, x: 0, y: 0 });
                setCurrentIndex(i);
              }}
              data-photo-thumb={i}
              className={`w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl cursor-pointer transition-all shadow-md ${
                currentIndex === i
                  ? "ring-4 ring-blue-500 scale-105 opacity-100"
                  : "opacity-50 hover:opacity-100 ring-1 ring-white/20"
              }`}
              alt={`Miniatura ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// le foto dei rapporti nuovi stanno a parte: le scarico quando le apri (poi restano sul telefono)
// figure dei manuali: photos = [src], figure = { title, legend: [[k, testo]], source }
export const FigureViewerModal = ({ src, figure, onClose }) => (
  <div data-figure-viewer>
    <Viewer photos={[src]} onClose={onClose} figure={figure} />
    <div className="fixed left-0 right-0 bottom-0 z-[501] p-3 pb-6 pointer-events-none" data-figure-caption>
      <div className="mx-auto max-w-md rounded-2xl bg-white/95 border border-slate-200 shadow-lg p-3 space-y-1.5 pointer-events-auto">
        <p className="font-black text-slate-800 text-sm leading-tight">{figure.title}</p>
        {figure.legend && figure.legend.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {figure.legend.map(([k, l]) => {
              const v = figure.vals && figure.vals[k];
              const t = figure.st && figure.st[k];
              const tone = t === "over" ? "bg-red-600" : t === "near" ? "bg-amber-600" : t === "ok" ? "bg-emerald-600" : "bg-slate-600";
              return (
                <span key={k} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600" data-figure-legend={k}>
                  <b className="text-xs text-blue-700">{k}</b> {l}
                  {v && <span className={`ml-0.5 rounded-full ${tone} text-white px-1.5 font-black`} data-figure-val={k}>{v} mm</span>}
                </span>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-slate-400 leading-snug">{figure.source} · Due dita o doppio tocco per ingrandire, trascina per spostare, tira giù per chiudere.</p>
      </div>
    </div>
  </div>
);

export const PhotoViewerModal = ({ photos, onClose }) => {
  const needs = Array.isArray(photos) && photos.some(isPhotoRef);
  const [real, setReal] = useState(needs ? null : photos);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!needs) {
      setReal(photos);
      return undefined;
    }
    setReal(null);
    setFailed(false);
    resolvePhotos(photos)
      .then((r) => alive && (r.length ? setReal(r) : setFailed(true)))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [photos, needs]);
  if (real) return <Viewer photos={real} onClose={onClose} />;
  return (
    <div className="fixed inset-0 z-[500] bg-black/90 flex flex-col items-center justify-center gap-4 text-white p-6 text-center" data-photo-loading onClick={onClose}>
      {failed ? (
        <>
          <p className="font-bold">Foto non disponibili adesso</p>
          <p className="text-sm text-white/70 max-w-xs">Servono un po' di rete per scaricarle la prima volta. Riprova quando c'è segnale.</p>
        </>
      ) : (
        <>
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm text-white/80">Carico le foto…</p>
        </>
      )}
      <button type="button" className="mt-2 px-5 py-2 rounded-full bg-white/15 font-bold text-sm" onClick={onClose}>Chiudi</button>
    </div>
  );
};
