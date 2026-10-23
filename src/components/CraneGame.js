// GIOCO SEGRETO DEL CARROPONTE: 5 tocchi veloci sul cielo della Home.
// Motore e disegno in game/engine.js, suoni in game/sound.js, classifica in game/scores.js.
// Comandi: trascina il dito sul capannone = sposti il carrello; tieni premuto GIÙ = scende il gancio.
// Sul computer: frecce ← → e barra spaziatrice.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, Trophy, RotateCcw, Heart, Volume2, VolumeX, ArrowDown, Medal } from "lucide-react";
import { CraneEngine } from "../game/engine";
import { play, soundOn, setSoundOn } from "../game/sound";
import { topScores, saveScore } from "../game/scores";

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

const Board = ({ rows, me, loading }) => {
  if (loading) return <p className="text-sm text-slate-400">Carico la classifica…</p>;
  if (!rows || !rows.length) return <p className="text-sm text-slate-400">Ancora nessuno in classifica: comincia tu!</p>;
  const mine = String(me || "").trim().toLowerCase();
  return (
    <ol className="space-y-1 text-left" data-game-board>
      {rows.slice(0, 5).map((r, i) => (
        <li key={r.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${String(r.name).trim().toLowerCase() === mine ? "bg-amber-50 border border-amber-200" : "bg-slate-50"}`}>
          <span className="w-6 text-center font-black text-slate-500">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}</span>
          <span className="flex-1 font-bold text-slate-700 truncate">{r.name}</span>
          <span className="font-black text-slate-800 tabular-nums">{r.best}</span>
        </li>
      ))}
    </ol>
  );
};

export const CraneGame = ({ onClose, me = "" }) => {
  const box = useRef(null);
  const canvas = useRef(null);
  const eng = useRef(null);
  const [phase, setPhase] = useState("intro"); // intro | play | end
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(0);
  const [hold, setHold] = useState(false);
  const [sound, setSound] = useState(soundOn);
  const [record, setRecord] = useState(readRec);
  const [result, setResult] = useState(null);
  const [board, setBoard] = useState(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [round, setRound] = useState(0);
  const [tip, setTip] = useState(true);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const loadBoard = useCallback(() => {
    setBoardLoading(true);
    topScores()
      .then((r) => setBoard(r))
      .catch(() => setBoard(null))
      .then(() => setBoardLoading(false));
  }, []);
  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // motore + disegno
  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    const ctx = cv && cv.getContext("2d");
    if (!el || !ctx) return undefined;
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
    const e = new CraneEngine({
      vh: 720,
      sound: (n) => phaseRef.current === "play" && play(n),
      onEvent: (ev) => {
        if (ev.type === "score") setScore(ev.score);
        if (ev.type === "miss") setLives(ev.lives);
        if (ev.type === "done") setLevel(ev.level);
        if (ev.type === "over") {
          setResult({ score: ev.score, stats: ev.stats, level: ev.level });
          setPhase("end");
        }
      },
    });
    eng.current = e;
    if (window.__moraTest) window.__crane = e; // solo per le prove automatiche
    let raf = 0;
    let last = 0;
    const frame = (ts) => {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts;
      if (phaseRef.current === "play" || phaseRef.current === "end") e.update(dt);
      e.draw(ctx, W, H, dpr);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onResize = () => size();
    window.addEventListener("resize", onResize);
    // tastiera (computer)
    const keys = new Set();
    const onKey = (ev) => {
      if (phaseRef.current !== "play") return;
      const down = ev.type === "keydown";
      if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
        if (down) keys.add(ev.key);
        else keys.delete(ev.key);
        const dir = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
        e.setTarget(dir ? (dir > 0 ? 400 : -40) : e.trolley.x + e.trolley.v * 0.2);
        ev.preventDefault();
      }
      if (ev.key === " " || ev.key === "ArrowDown") {
        e.press(down);
        setHold(down);
        ev.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    // fuori dall'app: pausa (niente camion che ripartono mentre rispondi al telefono)
    const onVis = () => {
      if (document.hidden) last = 0;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [round]);

  // fine partita: record e classifica
  const saved = useRef(null);
  useEffect(() => {
    if (phase !== "end" || !result || saved.current === result) return;
    saved.current = result; // una volta sola per partita
    if (result.score > readRec()) {
      saveRec(result.score);
      setRecord(result.score);
    }
    if (me && result.score > 0) {
      saveScore(me, result.score)
        .catch(() => false)
        .then(loadBoard);
    } else loadBoard();
  }, [phase, result, me, loadBoard]);

  // dito sul capannone: sposta il carrello
  const drag = useRef(null);
  const toX = (ev) => {
    const r = box.current.getBoundingClientRect();
    return eng.current.toWorld(ev.clientX - r.left);
  };
  const onDown = (ev) => {
    ev.stopPropagation();
    if (phase !== "play" || !eng.current) return;
    drag.current = ev.pointerId;
    try {
      ev.currentTarget.setPointerCapture(ev.pointerId);
    } catch (err) {
      // niente
    }
    const x = toX(ev);
    if (x != null) eng.current.setTarget(x);
    setTip(false);
  };
  const onMove = (ev) => {
    ev.stopPropagation();
    if (drag.current !== ev.pointerId || !eng.current) return;
    const x = toX(ev);
    if (x != null) eng.current.setTarget(x);
  };
  const onUp = (ev) => {
    ev.stopPropagation();
    if (drag.current === ev.pointerId) drag.current = null;
  };
  const press = (on) => (ev) => {
    ev.stopPropagation();
    if (phase !== "play" || !eng.current) return;
    if (on) {
      try {
        ev.currentTarget.setPointerCapture(ev.pointerId);
      } catch (err) {
        // niente
      }
    }
    eng.current.press(on);
    setHold(on);
    if (on) setTip(false);
  };

  const start = () => {
    setScore(0);
    setLives(3);
    setLevel(0);
    setResult(null);
    setHold(false);
    setTip(true);
    setRound((r) => r + 1);
    setPhase("play");
    play("start");
  };
  const stop = (ev) => ev.stopPropagation();
  const toggleSound = () => {
    setSoundOn(!sound);
    setSound(!sound);
  };

  return (
    <div
      className="fixed inset-0 z-[600] bg-slate-400 select-none overflow-hidden"
      data-section="crane-game"
      style={{ touchAction: "none" }}
      onPointerDown={stop}
      onPointerMove={stop}
      onPointerUp={stop}
      onClick={stop}
    >
      <div ref={box} className="absolute inset-0" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <canvas ref={canvas} className="absolute inset-0 w-full h-full" />
      </div>

      {/* in alto: punti, vite, livello, suono, chiudi */}
      <div className="absolute top-0 inset-x-0 p-3 flex items-start justify-between gap-2 pointer-events-none" style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}>
        <div className="flex gap-2 pointer-events-auto">
          <div className="px-3.5 h-12 rounded-2xl bg-slate-900/80 text-white shadow flex flex-col justify-center" data-game-score>
            <span className="text-[10px] font-bold text-white/60 leading-none">PUNTI</span>
            <span className="text-xl font-black leading-tight tabular-nums">{score}</span>
          </div>
          <div className="px-3 h-12 rounded-2xl bg-slate-900/80 shadow flex items-center gap-1" data-game-lives aria-label={`${lives} vite`}>
            {[0, 1, 2].map((i) => (
              <Heart key={i} className={`w-5 h-5 ${i < lives ? "text-red-500 fill-red-500" : "text-white/30"}`} />
            ))}
          </div>
          <div className="px-3 h-12 rounded-2xl bg-slate-900/80 text-white shadow flex flex-col justify-center">
            <span className="text-[10px] font-bold text-white/60 leading-none">CAMION</span>
            <span className="text-xl font-black leading-tight tabular-nums">{level}</span>
          </div>
        </div>
        <div className="flex gap-2 pointer-events-auto">
          <button type="button" aria-label={sound ? "Spegni i suoni" : "Accendi i suoni"} onClick={toggleSound} className="w-12 h-12 rounded-full bg-slate-900/80 text-white shadow flex items-center justify-center">
            {sound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button type="button" aria-label="Chiudi" onClick={onClose} className="w-12 h-12 rounded-full bg-slate-900/80 text-white shadow flex items-center justify-center">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* suggerimento all'inizio */}
      {phase === "play" && tip && (
        <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ top: "38%" }}>
          <span className="px-4 py-2 rounded-2xl bg-slate-900/80 text-white font-bold text-sm text-center leading-snug">
            Trascina il dito per spostare il carrello
            <br />
            Tieni premuto GIÙ per calare il gancio
          </span>
        </div>
      )}

      {/* GIÙ */}
      {phase === "play" && (
        <div className="absolute right-0 bottom-0 p-5 flex flex-col items-end gap-2" style={{ paddingBottom: "max(22px, env(safe-area-inset-bottom))" }}>
          <button
            type="button"
            aria-label="Giù: tieni premuto per calare il gancio"
            data-game-btn="down"
            onPointerDown={press(true)}
            onPointerUp={press(false)}
            onPointerCancel={press(false)}
            onContextMenu={(e) => e.preventDefault()}
            className={`w-28 h-28 rounded-full text-white shadow-2xl flex flex-col items-center justify-center font-black text-lg border-4 transition-transform ${hold ? "bg-amber-600 border-amber-200 scale-95" : "bg-amber-500 border-white/80"}`}
          >
            <ArrowDown className="w-10 h-10" />
            GIÙ
          </button>
        </div>
      )}

      {/* inizio */}
      {phase === "intro" && (
        <div className="absolute inset-0 flex items-center justify-center p-5 bg-slate-900/50 overflow-y-auto" data-game-intro>
          <div className="bg-white rounded-3xl shadow-2xl p-5 max-w-sm w-full space-y-3 text-center my-auto">
            <h2 className="text-2xl font-black text-slate-800">Carroponte Mora</h2>
            <ul className="text-left text-sm text-slate-600 space-y-1.5">
              <li>👉 <b>Trascina il dito</b> sul capannone: il carrello lo segue</li>
              <li>⬇️ <b>Tieni premuto GIÙ</b>: il gancio scende e aggancia da solo il pezzo che tocca. Lascia: risale</li>
              <li>🚚 Ogni camion vuole <b>pezzi precisi</b>: li vedi disegnati sul cassone</li>
              <li>✨ Appoggia <b>piano e senza dondolare</b>: «Perfetto!» vale di più (e di fila moltiplica)</li>
              <li>💥 Se sbatti è una «Botta!», se sbagli pezzo perdi punti</li>
              <li>❤️ 3 vite: ne perdi una se un camion riparte senza tutto</li>
            </ul>
            <div className="space-y-1.5">
              <p className="text-xs font-black text-slate-500 flex items-center justify-center gap-1"><Medal className="w-4 h-4" /> CLASSIFICA</p>
              <Board rows={board} me={me} loading={boardLoading} />
              {record > 0 && <p className="text-xs font-bold text-amber-700">Il tuo record su questo telefono: {record}</p>}
            </div>
            <button type="button" onClick={start} data-action="game-start" className="w-full h-12 rounded-full bg-amber-500 text-white font-black text-lg">
              Gioca
            </button>
          </div>
        </div>
      )}

      {/* fine */}
      {phase === "end" && result && (
        <div className="absolute inset-0 flex items-center justify-center p-5 bg-slate-900/60 overflow-y-auto" data-game-end>
          <div className="bg-white rounded-3xl shadow-2xl p-5 max-w-sm w-full space-y-3 text-center my-auto">
            <Trophy className={`w-12 h-12 mx-auto ${result.score > 0 && result.score >= record ? "text-amber-500" : "text-slate-300"}`} />
            <h2 className="text-3xl font-black text-slate-800 tabular-nums">{result.score} punti</h2>
            {result.score > 0 && result.score >= record && <p className="font-bold text-amber-600">Nuovo record!</p>}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["Camion", result.stats.trucks],
                ["Pezzi", result.stats.pieces],
                ["Perfetti", result.stats.perfect],
              ].map(([l, v]) => (
                <div key={l} className="rounded-2xl bg-slate-50 py-2">
                  <p className="text-xl font-black text-slate-800 tabular-nums">{v}</p>
                  <p className="text-[11px] font-bold text-slate-500">{l}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-black text-slate-500 flex items-center justify-center gap-1"><Medal className="w-4 h-4" /> CLASSIFICA</p>
              <Board rows={board} me={me} loading={boardLoading} />
            </div>
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
