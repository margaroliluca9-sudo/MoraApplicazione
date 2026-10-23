import React, { useEffect, useRef, useState } from "react";
import {
  Download,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { isPhotoRef, resolvePhotos } from "../logPhotos";

// GALLERIA FOTO GLOBALE CON SCARICAMENTO
// gesti: scorri a destra/sinistra = foto dopo/prima, doppio tocco o due dita = ingrandisci, tira giù = chiudi
const Viewer = ({ photos, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [z, setZ] = useState({ s: 1, x: 0, y: 0 });
  const g = useRef(null);
  const lastTap = useRef(0);
  const n = photos ? photos.length : 0;
  const go = (d) => {
    setZ({ s: 1, x: 0, y: 0 });
    setCurrentIndex((p) => (p + d + n) % n);
  };
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const tStart = (e) => {
    const t = e.touches;
    if (t.length === 2) g.current = { pinch: dist(t), s0: z.s };
    else g.current = { x0: t[0].clientX, y0: t[0].clientY, zx: z.x, zy: z.y, dx: 0, dy: 0 };
  };
  const tMove = (e) => {
    const c = g.current;
    if (!c) return;
    const t = e.touches;
    if (c.pinch && t.length === 2) {
      setZ((o) => ({ ...o, s: Math.min(4, Math.max(1, (c.s0 * dist(t)) / c.pinch)) }));
      return;
    }
    if (t.length !== 1 || c.pinch) return;
    c.dx = t[0].clientX - c.x0;
    c.dy = t[0].clientY - c.y0;
    if (z.s > 1) setZ((o) => ({ ...o, x: c.zx + c.dx, y: c.zy + c.dy }));
  };
  const tEnd = () => {
    const c = g.current;
    g.current = null;
    if (!c || c.pinch) {
      if (z.s <= 1.05) setZ({ s: 1, x: 0, y: 0 });
      return;
    }
    if (z.s > 1) return;
    if (Math.abs(c.dx) > 60 && Math.abs(c.dx) > Math.abs(c.dy) && n > 1) go(c.dx < 0 ? 1 : -1);
    else if (c.dy > 110 && Math.abs(c.dy) > Math.abs(c.dx)) onClose();
    else if (Math.abs(c.dx) < 8 && Math.abs(c.dy) < 8) {
      const now = Date.now();
      if (now - lastTap.current < 300) setZ((o) => (o.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }));
      lastTap.current = now;
    }
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

  return (
    <div className="fixed inset-0 bg-black/95 z-[500] flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
      <div className="absolute top-4 right-4 flex gap-4 z-10 items-center">
        <div className="bg-black/50 text-white px-4 py-2 rounded-full font-bold text-xs flex items-center shadow-lg">
          {currentIndex + 1} / {photos.length}
        </div>
        <button
          onClick={handleDownload}
          className="p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all shadow-lg"
          title="Scarica questa foto"
        >
          <Download className="w-6 h-6" />
        </button>
        <button
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-all shadow-lg"
          title="Chiudi"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="relative w-full max-w-5xl flex items-center justify-center flex-1 min-h-0 overflow-hidden touch-none"
        onTouchStart={tStart} onTouchMove={tMove} onTouchEnd={tEnd} onTouchCancel={tEnd}
        onDoubleClick={() => setZ((o) => (o.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }))}
        data-section="photo-stage">
        <img
          key={currentIndex}
          src={photos[currentIndex]}
          alt={`Foto ${currentIndex + 1}`}
          draggable={false}
          className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-300 select-none"
          style={{ transform: `translate(${z.x}px, ${z.y}px) scale(${z.s})`, transition: g.current ? "none" : "transform .2s" }}
        />

        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              className="absolute left-2 md:left-8 p-3 md:p-4 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all shadow-lg"
            >
              <ArrowLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              className="absolute right-2 md:right-8 p-3 md:p-4 bg-black/40 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-all shadow-lg"
            >
              <ArrowRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="mt-6 flex gap-3 overflow-x-auto pb-4 max-w-full px-4">
          {photos.map((p, i) => (
            <img
              key={i}
              src={p}
              onClick={() => setCurrentIndex(i)}
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
