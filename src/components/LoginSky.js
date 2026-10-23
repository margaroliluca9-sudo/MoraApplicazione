// Cielo vivo dietro la schermata di accesso (lo stesso della Home, senza scritte).
// Fermo se il telefono chiede "riduci movimento".
import React, { useEffect, useRef } from "react";
import { HeroWorld } from "./hero/world";
import { seasonOf } from "../season";

const reduced = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
};

export const LoginSky = ({ className = "" }) => {
  const box = useRef(null);
  const canvas = useRef(null);
  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    const ctx = cv && cv.getContext("2d");
    if (!el || !ctx) return undefined;
    const now = new Date();
    const w = new HeroWorld({ now, season: seasonOf(now), weekend: now.getDay() === 0 || now.getDay() === 6 });
    let W = 1;
    let H = 1;
    let dpr = 1;
    const size = () => {
      const r = el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    };
    size();
    let raf = 0;
    let last = 0;
    const still = reduced();
    const frame = (ts) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts;
      w.update(dt);
      w.draw(ctx, W, H, dpr);
      if (!still && !document.hidden) raf = requestAnimationFrame(frame);
    };
    if (still) {
      for (let i = 0; i < 40; i++) w.update(0.05);
      w.draw(ctx, W, H, dpr);
    } else raf = requestAnimationFrame(frame);
    const onResize = () => {
      size();
      w.draw(ctx, W, H, dpr);
    };
    window.addEventListener("resize", onResize);
    const onVis = () => {
      if (!document.hidden && !still && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return (
    <div ref={box} className={`relative overflow-hidden bg-sky-300 ${className}`} aria-hidden="true" data-section="login-sky">
      <canvas ref={canvas} className="absolute inset-0 w-full h-full" />
    </div>
  );
};
