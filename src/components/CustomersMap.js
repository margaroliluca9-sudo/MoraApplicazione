// ESPLORA → MAPPA: dove sono i nostri clienti, su una cartina come Google Maps (OpenStreetMap, gratis, senza chiavi).
// Le coordinate (lat/lng) dei clienti le trova ogni mattina il programma del Drive (apps-script/paesi-dal-drive.gs)
// partendo da paese e indirizzo. La cartina è fatta a mano (niente librerie): quadratini di OpenStreetMap,
// trascini col dito per spostarti, + / − o due dita per lo zoom; i clienti vicini si raggruppano in un pallino
// col numero (toccalo per avvicinarti). Tocca un cliente: nome, paese, gru, «Vedi le gru» e «Portami qui».
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, Maximize2, Navigation, Factory, X, MapPin } from "lucide-react";
import { placeOf } from "../places";

const TILE = 256;
const MIN_Z = 5;
const MAX_Z = 18;
const ITALY = { lat: 45.6, lng: 8.6, z: 8 };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// coordinate → pixel del «mondo» allo zoom z (Web Mercator, come Google Maps)
export const project = (lat, lng, z) => {
  const s = TILE * 2 ** z;
  const sin = Math.sin((clamp(lat, -85, 85) * Math.PI) / 180);
  return { x: ((lng + 180) / 360) * s, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s };
};
export const unproject = (x, y, z) => {
  const s = TILE * 2 ** z;
  const lng = (x / s) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / s;
  return { lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), lng };
};

// lo zoom più vicino in cui stanno dentro tutti i punti
export const fitView = (pts, w, h) => {
  if (!pts.length || !w || !h) return ITALY;
  if (pts.length === 1) return { lat: pts[0].lat, lng: pts[0].lng, z: 13 };
  let lat0 = 90;
  let lat1 = -90;
  let lng0 = 180;
  let lng1 = -180;
  pts.forEach((p) => {
    lat0 = Math.min(lat0, p.lat);
    lat1 = Math.max(lat1, p.lat);
    lng0 = Math.min(lng0, p.lng);
    lng1 = Math.max(lng1, p.lng);
  });
  let z = MAX_Z;
  for (; z > MIN_Z; z--) {
    const a = project(lat1, lng0, z);
    const b = project(lat0, lng1, z);
    if (b.x - a.x < w - 60 && b.y - a.y < h - 80) break;
  }
  const a = project(lat1, lng0, z);
  const b = project(lat0, lng1, z);
  const c = unproject((a.x + b.x) / 2, (a.y + b.y) / 2, z);
  return { lat: c.lat, lng: c.lng, z: Math.min(z, 14) };
};

export const CustomersMap = ({ customers = [], machines = [], color = "blue", onShowMachines }) => {
  const box = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState(null); // { lat, lng, z }
  const [sel, setSel] = useState(null);
  const drag = useRef(null);
  const pointers = useRef(new Map());

  const pts = useMemo(
    () =>
      customers
        .filter((c) => Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lng)) && c.lat !== "" && c.lng !== "")
        .map((c) => ({ id: c.id, c, lat: Number(c.lat), lng: Number(c.lng), approx: !!c.geoApprox })),
    [customers]
  );
  const missing = customers.length - pts.length;
  const gruOf = useMemo(() => {
    const n = {};
    machines.forEach((m) => {
      n[m.customerName] = (n[m.customerName] || 0) + 1;
    });
    return n;
  }, [machines]);

  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const upd = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    upd();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(upd) : null;
    if (ro) ro.observe(el);
    window.addEventListener("resize", upd);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", upd);
    };
  }, []);

  const fit = useCallback(() => setView(fitView(pts, size.w, size.h)), [pts, size.w, size.h]);
  // prima volta (e quando cambia la ricerca): inquadra tutti i clienti
  const ptsKey = pts.map((p) => p.id).join(",") + (size.w && size.h ? "|ok" : "");
  const lastKey = useRef("");
  useEffect(() => {
    if (!size.w || !size.h || lastKey.current === ptsKey) return;
    lastKey.current = ptsKey;
    setView(fitView(pts, size.w, size.h));
    setSel(null);
  }, [ptsKey, pts, size.w, size.h]);

  const v = view || ITALY;
  const z = v.z;
  const cpx = project(v.lat, v.lng, z);
  const left = cpx.x - size.w / 2;
  const top = cpx.y - size.h / 2;

  const zoomAt = (dz, sx = size.w / 2, sy = size.h / 2) => {
    const nz = clamp(z + dz, MIN_Z, MAX_Z);
    if (nz === z) return;
    // il punto sotto al dito resta fermo
    const wx = left + sx;
    const wy = top + sy;
    const k = 2 ** (nz - z);
    const c = unproject(wx * k - sx + size.w / 2, wy * k - sy + size.h / 2, nz);
    setView({ lat: c.lat, lng: c.lng, z: nz });
  };

  // ---- dito / mouse ----
  const onDown = (e) => {
    if (e.target.closest && e.target.closest("[data-map-ui]")) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (er) {
      // non importa
    }
    if (pointers.current.size === 1) drag.current = { x: e.clientX, y: e.clientY, moved: 0 };
    else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current = { pinch: Math.hypot(a.x - b.x, a.y - b.y), moved: 99 };
    }
  };
  const onMove = (e) => {
    if (!pointers.current.has(e.pointerId) || !drag.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = drag.current;
    if (pointers.current.size >= 2 && d.pinch) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const r = dist / d.pinch;
      if (r > 1.5 || r < 0.66) {
        const rect = box.current.getBoundingClientRect();
        zoomAt(r > 1 ? 1 : -1, (a.x + b.x) / 2 - rect.left, (a.y + b.y) / 2 - rect.top);
        d.pinch = dist;
      }
      return;
    }
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!dx && !dy) return;
    d.moved += Math.abs(dx) + Math.abs(dy);
    d.x = e.clientX;
    d.y = e.clientY;
    const c = unproject(cpx.x - dx, cpx.y - dy, z);
    setView({ lat: c.lat, lng: c.lng, z });
  };
  const onUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (!pointers.current.size) {
      const d = drag.current;
      drag.current = null;
      // tocco senza trascinare sul vuoto: chiudo la scheda
      if (d && d.moved < 6 && !(e.target.closest && e.target.closest("[data-map-pin]"))) setSel(null);
    }
  };
  const onWheel = (e) => {
    const rect = box.current.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1 : -1, e.clientX - rect.left, e.clientY - rect.top);
  };

  // ---- quadratini della cartina ----
  const tiles = [];
  if (size.w && size.h) {
    const n = 2 ** z;
    const x0 = Math.floor(left / TILE);
    const y0 = Math.floor(top / TILE);
    const x1 = Math.floor((left + size.w) / TILE);
    const y1 = Math.floor((top + size.h) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = x0; tx <= x1; tx++) {
        const wx = ((tx % n) + n) % n;
        tiles.push({ key: `${z}/${tx}/${ty}`, src: `https://tile.openstreetmap.org/${z}/${wx}/${ty}.png`, x: tx * TILE - left, y: ty * TILE - top });
      }
    }
  }

  // ---- clienti: quelli vicini diventano un pallino col numero ----
  const groups = useMemo(() => {
    const cell = 46;
    const g = {};
    pts.forEach((p) => {
      const q = project(p.lat, p.lng, z);
      const k = `${Math.floor(q.x / cell)}_${Math.floor(q.y / cell)}`;
      (g[k] = g[k] || []).push({ ...p, wx: q.x, wy: q.y });
    });
    return Object.values(g).map((list) => ({
      list,
      wx: list.reduce((s, p) => s + p.wx, 0) / list.length,
      wy: list.reduce((s, p) => s + p.wy, 0) / list.length,
    }));
  }, [pts, z]);

  const openGroup = (g) => {
    if (g.list.length === 1 || z >= MAX_Z - 1) {
      setSel(g.list[0].c);
      return;
    }
    // avvicinati al gruppo
    const sub = fitView(g.list, size.w, size.h);
    setView({ ...sub, z: clamp(Math.max(sub.z, z + 2), MIN_Z, MAX_Z) });
  };

  const directions = (c) => {
    const q = Number.isFinite(Number(c.lat)) ? `${c.lat},${c.lng}` : [c.address, c.city].filter(Boolean).join(", ");
    return "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(q);
  };

  return (
    <div className="h-full flex flex-col gap-2" data-section="customers-map">
      <div
        ref={box}
        className="relative flex-1 min-h-[320px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-200 select-none"
        style={{ touchAction: "none" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onWheel={onWheel}
        onDoubleClick={(e) => {
          const rect = box.current.getBoundingClientRect();
          zoomAt(1, e.clientX - rect.left, e.clientY - rect.top);
        }}
      >
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.src}
            alt=""
            draggable={false}
            className="absolute max-w-none pointer-events-none"
            style={{ left: t.x, top: t.y, width: TILE, height: TILE }}
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        ))}
        {groups.map((g) => {
          const x = g.wx - left;
          const y = g.wy - top;
          if (x < -40 || y < -40 || x > size.w + 40 || y > size.h + 40) return null;
          const one = g.list.length === 1 ? g.list[0] : null;
          const on = one && sel && sel.id === one.id;
          return one ? (
            <button
              key={one.id}
              type="button"
              data-map-pin={one.c.name}
              aria-label={one.c.name}
              onClick={() => openGroup(g)}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left: x, top: y, zIndex: on ? 20 : 10 }}
            >
              <MapPin
                className={`w-8 h-8 drop-shadow ${on ? "text-red-600" : one.approx ? `text-${color}-400` : `text-${color}-700`}`}
                fill="white"
                strokeWidth={2.2}
              />
            </button>
          ) : (
            <button
              key={g.list.map((p) => p.id).join(",")}
              type="button"
              data-map-group={g.list.length}
              aria-label={`${g.list.length} clienti`}
              onClick={() => openGroup(g)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 min-w-[34px] h-[34px] px-2 rounded-full bg-${color}-600 text-white text-sm font-black border-2 border-white shadow-md`}
              style={{ left: x, top: y, zIndex: 15 }}
            >
              {g.list.length}
            </button>
          );
        })}

        <div className="absolute right-2 top-2 flex flex-col gap-1.5" data-map-ui style={{ zIndex: 30 }}>
          {[
            [Plus, "Avvicina", () => zoomAt(1), "zoom-in"],
            [Minus, "Allontana", () => zoomAt(-1), "zoom-out"],
            [Maximize2, "Tutti i clienti", fit, "fit"],
          ].map(([Ic, label, fn, id]) => (
            <button key={id} type="button" aria-label={label} title={label} onClick={fn} data-map-btn={id} className="w-10 h-10 rounded-xl bg-white/95 shadow border border-slate-200 text-slate-700 flex items-center justify-center">
              <Ic className="w-5 h-5" />
            </button>
          ))}
        </div>
        <div className="absolute right-1 bottom-1 text-[10px] bg-white/80 px-1.5 rounded" data-map-ui style={{ zIndex: 30 }}>
          ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
            OpenStreetMap
          </a>
        </div>

        {sel && (
          <div className="absolute left-2 right-2 bottom-6 rounded-2xl bg-white shadow-xl border border-slate-200 p-3" data-map-ui data-map-card style={{ zIndex: 40 }}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-800 leading-tight break-words">{sel.name}</p>
                {placeOf(sel) && <p className="text-xs text-slate-600 mt-0.5">{placeOf(sel)}</p>}
                <p className="text-xs text-slate-500 mt-0.5">
                  {gruOf[sel.name] || 0} gru
                  {sel.geoApprox ? " · posizione del paese (senza via)" : ""}
                </p>
              </div>
              <button type="button" aria-label="Chiudi" onClick={() => setSel(null)} className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              {onShowMachines && (
                <button type="button" onClick={() => onShowMachines(sel.name)} data-action="map-show-machines" className="flex-1 h-10 rounded-full bg-slate-100 text-slate-800 text-sm font-bold flex items-center justify-center gap-1.5">
                  <Factory className="w-4 h-4" /> Vedi le gru
                </button>
              )}
              <a
                href={directions(sel)}
                target="_blank"
                rel="noopener noreferrer"
                data-action="map-directions"
                className={`flex-1 h-10 rounded-full bg-${color}-600 text-white text-sm font-bold flex items-center justify-center gap-1.5`}
              >
                <Navigation className="w-4 h-4" /> Portami qui
              </a>
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500 px-1" data-map-count>
        {pts.length} {pts.length === 1 ? "cliente" : "clienti"} sulla mappa
        {missing > 0 ? ` · ${missing} senza posizione (manca paese o indirizzo, oppure il programma del Drive non l'ha ancora cercata)` : ""}
      </p>
    </div>
  );
};
