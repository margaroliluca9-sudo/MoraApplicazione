// GIOCO SEGRETO: 5 tocchi veloci sul cielo della Home.
// Guidi il carroponte: trascina il dito per spostare il carrello, tocca per far scendere il gancio
// (aggancia o sgancia il carico). Metti i pezzi sul camion prima che riparta: 10 punti a pezzo,
// +10 se lo riempi. 90 secondi; il vento aumenta piano piano. Record salvato sul telefono.
import React, { useEffect, useRef, useState } from "react";
import { X, Trophy, RotateCcw, Truck, ChevronLeft, ChevronRight, Anchor } from "lucide-react";
import { HeroWorld } from "./hero/world";

const TIME = 90;
const REC = "mora_crane_game_record";
const readRec = () => {
  try {
    return Number(localStorage.getItem(REC) || 0);
  } catch (e) {
    return 0;
  }
};
const saveRec = (n) => {
  try {
    localStorage.setItem(REC, String(n));
  } catch (e) {
    // niente
  }
};

export const CraneGame = ({ onClose }) => {
  const box = useRef(null);
  const canvas = useRef(null);
  const world = useRef(null);
  const [phase, setPhase] = useState("intro"); // intro | play | end
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(TIME);
  const [msg, setMsg] = useState("");
  const [patience, setPatience] = useState(null);
  const [record, setRecord] = useState(readRec);
  const [stats, setStats] = useState(null);
  const [round, setRound] = useState(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // mondo e disegno
  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    const ctx = cv && cv.getContext("2d");
    if (!el || !ctx) return undefined;
    let msgT = null;
    const say = (t) => {
      setMsg(t);
      clearTimeout(msgT);
      msgT = setTimeout(() => setMsg(""), 1800);
    };
    const w = new HeroWorld({
      game: {
        onEvent: (e) => {
          if (e.type === "arrive") say(`Arriva un camion: caricane ${e.cap}!`);
          if (e.type === "leave") {
            setScore(e.score);
            say(e.n ? `+${e.pts}${e.full ? " · camion pieno!" : ""}` : "Il camion è ripartito vuoto");
          }
        },
      },
    });
    world.current = w;
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
    let t0 = null;
    let lastP = -1;
    const frame = (ts) => {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts;
      if (phaseRef.current === "play") {
        if (t0 == null) t0 = ts;
        const el2 = (ts - t0) / 1000;
        w.setGameLevel(el2 / TIME);
        const l = Math.max(0, Math.ceil(TIME - el2));
        setLeft(l);
        if (l <= 0) {
          const g = w.game;
          setStats({ score: g.score, pieces: g.pieces, trucks: g.trucks, full: g.full });
          setPhase("end");
        }
      }
      w.update(phaseRef.current === "end" ? dt * 0.3 : dt);
      w.draw(ctx, W, H, dpr);
      const p = w.truckPatience();
      const pr = p == null ? -1 : Math.round(p * 40);
      if (pr !== lastP) {
        lastP = pr;
        setPatience(p);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", size);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(msgT);
      window.removeEventListener("resize", size);
    };
  }, [round]);

  // record
  useEffect(() => {
    if (phase === "end" && stats && stats.score > record) {
      saveRec(stats.score);
      setRecord(stats.score);
    }
  }, [phase, stats, record]);

  // dito / mouse (solo durante la partita)
  const toWorld = (e) => {
    const w = world.current;
    const el = box.current;
    if (!w || !w.view || !el) return null;
    const r = el.getBoundingClientRect();
    return [(e.clientX - r.left - w.view.ox) / w.view.s, (e.clientY - r.top - w.view.oy) / w.view.s];
  };
  const down = (e) => {
    if (phase !== "play") return;
    const p = toWorld(e);
    if (p) world.current.pointerDown(p[0], p[1]);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      // niente
    }
  };
  const move = (e) => {
    if (phase !== "play") return;
    const p = toWorld(e);
    if (p) world.current.pointerMove(p[0]);
  };
  const up = () => {
    if (phase === "play" && world.current) world.current.pointerUp();
  };

  // il gioco è dentro il cielo della Home (portale): i suoi tocchi non devono arrivare anche lì
  const stop = (e) => e.stopPropagation();
  const start = () => {
    setScore(0);
    setLeft(TIME);
    setStats(null);
    setMsg("");
    setRound((r) => r + 1); // mondo nuovo a ogni partita
    setPhase("play");
  };

  return (
    <div
      className="fixed inset-0 z-[600] bg-sky-300 select-none"
      data-section="crane-game"
      style={{ touchAction: "none" }}
      onPointerDown={stop}
      onPointerMove={stop}
      onPointerUp={stop}
      onPointerCancel={stop}
      onClick={stop}
    >
      <div ref={box} className="absolute inset-0" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <canvas ref={canvas} className="absolute inset-0 w-full h-full" />
      </div>

      {/* in alto: punti, tempo, chiudi */}
      <div className="absolute top-0 inset-x-0 p-3 flex items-start justify-between gap-2 pointer-events-none" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
        <div className="flex gap-2 pointer-events-auto">
          <div className="px-4 h-12 rounded-2xl bg-white/90 shadow flex flex-col justify-center" data-game-score>
            <span className="text-[10px] font-bold text-slate-500 leading-none">PUNTI</span>
            <span className="text-xl font-black text-slate-800 leading-tight tabular-nums">{score}</span>
          </div>
          <div className={`px-4 h-12 rounded-2xl shadow flex flex-col justify-center ${left <= 10 && phase === "play" ? "bg-red-600 text-white" : "bg-white/90 text-slate-800"}`} data-game-time>
            <span className={`text-[10px] font-bold leading-none ${left <= 10 && phase === "play" ? "text-white/80" : "text-slate-500"}`}>TEMPO</span>
            <span className="text-xl font-black leading-tight tabular-nums">{left}s</span>
          </div>
        </div>
        <button type="button" aria-label="Chiudi" onClick={onClose} className="pointer-events-auto w-12 h-12 rounded-full bg-white/90 shadow flex items-center justify-center">
          <X className="w-6 h-6 text-slate-700" />
        </button>
      </div>

      {/* pazienza del camion */}
      {phase === "play" && patience != null && (
        <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 60px)" }}>
          <div className="flex items-center gap-2 bg-white/90 rounded-full shadow px-3 py-1.5">
            <Truck className="w-4 h-4 text-slate-600" />
            <div className="w-32 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className={`h-full ${patience < 0.3 ? "bg-red-500" : patience < 0.6 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${patience * 100}%` }} />
            </div>
          </div>
        </div>
      )}
      {msg && phase === "play" && (
        <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 96px)" }}>
          <span className="px-4 py-2 rounded-full bg-slate-900/80 text-white font-bold text-sm" data-game-msg>
            {msg}
          </span>
        </div>
      )}

      {/* comandi sul piazzale: ◀ ▶ tenuti premuti, «Gancio» al centro */}
      {phase === "play" && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 p-5" style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }} data-game-pad>
          {[
            [-1, ChevronLeft, "Sinistra"],
            [0, Anchor, "Gancio"],
            [1, ChevronRight, "Destra"],
          ].map(([d, Icon, label]) =>
            d === 0 ? (
              <button
                key={label}
                type="button"
                aria-label="Aggancia o sgancia"
                data-game-btn="hook"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (world.current) world.current.gameHook();
                }}
                className="w-24 h-24 rounded-full bg-amber-500 active:bg-amber-600 text-white shadow-xl flex flex-col items-center justify-center font-black text-sm border-4 border-white/70"
              >
                <Icon className="w-8 h-8" />
                {label}
              </button>
            ) : (
              <button
                key={label}
                type="button"
                aria-label={label}
                data-game-btn={d < 0 ? "left" : "right"}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch (err) {
                    // niente
                  }
                  if (world.current) world.current.gameMove(d);
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  if (world.current) world.current.gameMove(0);
                }}
                onPointerCancel={() => world.current && world.current.gameMove(0)}
                className="w-20 h-20 rounded-full bg-white/90 active:bg-white text-slate-800 shadow-xl flex items-center justify-center"
              >
                <Icon className="w-10 h-10" />
              </button>
            )
          )}
        </div>
      )}

      {/* inizio */}
      {phase === "intro" && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-900/40" data-game-intro>
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <p className="text-3xl" aria-hidden="true">🏗️</p>
            <h2 className="text-2xl font-black text-slate-800">Il gioco del carroponte</h2>
            <ul className="text-left text-sm text-slate-600 space-y-1.5">
              <li>👉 <b>◀ ▶</b> (tienili premuti) o trascina il dito per spostare il carrello</li>
              <li>⚓ <b>Gancio</b> (o tocca il cielo) per scendere: aggancia o sgancia</li>
              <li>🚚 Metti i carichi <b>sul camion</b> prima che riparta</li>
              <li>⭐ 10 punti a pezzo, +10 se lo riempi. Hai 90 secondi</li>
              <li>💨 Occhio: il vento aumenta e il carico dondola!</li>
            </ul>
            {record > 0 && <p className="text-sm font-bold text-amber-700">Il tuo record: {record} punti</p>}
            <button type="button" onClick={start} data-action="game-start" className="w-full h-12 rounded-full bg-amber-500 text-white font-black text-lg">
              Gioca
            </button>
          </div>
        </div>
      )}

      {/* fine */}
      {phase === "end" && stats && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-900/50" data-game-end>
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full space-y-4 text-center">
            <Trophy className={`w-12 h-12 mx-auto ${stats.score >= record && stats.score > 0 ? "text-amber-500" : "text-slate-300"}`} />
            <h2 className="text-2xl font-black text-slate-800">{stats.score} punti</h2>
            {stats.score > 0 && stats.score >= record && <p className="font-bold text-amber-600">Nuovo record!</p>}
            <p className="text-sm text-slate-600">
              Pezzi caricati: <b>{stats.pieces}</b> · Camion partiti: <b>{stats.trucks}</b> · Pieni: <b>{stats.full}</b>
            </p>
            <p className="text-sm text-slate-500">Record: {Math.max(record, stats.score)} punti</p>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 h-12 rounded-full bg-slate-100 text-slate-700 font-bold">
                Esci
              </button>
              <button type="button" onClick={start} data-action="game-again" className="flex-1 h-12 rounded-full bg-amber-500 text-white font-black flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Rigioca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
