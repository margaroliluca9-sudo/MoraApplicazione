// GIOCO SEGRETO DEL CARROPONTE: 5 tocchi veloci sul cielo della Home.
// Motore e disegno in game/engine.js, suoni in game/sound.js, classifica in game/scores.js.
// Comandi: trascina il dito sul capannone = sposti il carrello; tieni premuto GIÙ = scende il gancio.
// Sul computer: frecce ← → e barra spaziatrice.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, Trophy, RotateCcw, Heart, Volume2, VolumeX, ArrowDown, Medal, Pause, Play, Lock, Paintbrush } from "lucide-react";
import { CraneEngine, stageNews, TRUCKS_PER_STAGE } from "../game/engine";
import { play, soundOn, setSoundOn } from "../game/sound";
import { topScores, saveScore } from "../game/scores";
import { LOOKS, lookById, unlocked, readLook, saveLook, cleanName } from "../game/looks";

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

const STAGE_REC = "mora_crane_game_stage";
const readStage = () => {
  try {
    return Number(localStorage.getItem(STAGE_REC) || 0);
  } catch (e) {
    return 0;
  }
};
const saveStage = (n) => {
  try {
    localStorage.setItem(STAGE_REC, String(n));
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
          <span className="w-3 h-3 rounded-full shrink-0 border border-black/10" style={{ background: lookById(r.look).bottom }} aria-hidden="true" />
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
  const [phase, setPhase] = useState("intro"); // intro | play | pause | end
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(0);
  const [stage, setStage] = useState(1);
  const [banner, setBanner] = useState(null); // { stage, news, life }
  const [bestStage, setBestStage] = useState(readStage);
  const [hold, setHold] = useState(false);
  const [sound, setSound] = useState(soundOn);
  const [record, setRecord] = useState(readRec);
  const [result, setResult] = useState(null);
  const [board, setBoard] = useState(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [round, setRound] = useState(0);
  const [tip, setTip] = useState(true);
  const [look, setLook] = useState(readLook); // il tuo carroponte (colore + nome)
  const [custom, setCustom] = useState(false);
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
        if (ev.type === "stage") {
          setStage(ev.stage);
          setLives(ev.lives);
          setBanner({ stage: ev.stage, news: ev.news, life: ev.life, id: Date.now() });
        }
        if (ev.type === "over") {
          setResult({ score: ev.score, stats: ev.stats, level: ev.level, stage: ev.stage });
          setPhase("end");
        }
      },
    });
    const lk = readLook();
    e.setLook(lk.id, lk.name);
    eng.current = e;
    if (window.__moraTest) window.__crane = e; // solo per le prove automatiche
    let raf = 0;
    let last = 0;
    const frame = (ts) => {
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts;
      if (phaseRef.current === "play" || phaseRef.current === "end") e.update(dt);
      else last = 0;
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
      if (document.hidden) {
        last = 0;
        if (phaseRef.current === "play") setPhase("pause");
      }
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

  // cartello «Livello N» per qualche secondo
  useEffect(() => {
    if (!banner) return undefined;
    const t = setTimeout(() => setBanner(null), 2800);
    return () => clearTimeout(t);
  }, [banner]);

  // fine partita: record e classifica
  const saved = useRef(null);
  useEffect(() => {
    if (phase !== "end" || !result || saved.current === result) return;
    saved.current = result; // una volta sola per partita
    if ((result.stage || 1) > readStage()) {
      saveStage(result.stage || 1);
      setBestStage(result.stage || 1);
    }
    if (result.score > readRec()) {
      saveRec(result.score);
      setRecord(result.score);
    }
    if (me && result.score > 0) {
      saveScore(me, result.score, readLook().id)
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

  // record per sbloccare i colori: quello del telefono o quello in classifica
  const mine = (board || []).find((r) => String(r.name).trim().toLowerCase() === String(me || "").trim().toLowerCase());
  const best = Math.max(record, mine ? Number(mine.best) || 0 : 0);
  const chooseLook = (id) => {
    const next = { ...look, id };
    setLook(next);
    saveLook(next);
    if (eng.current) eng.current.setLook(next.id, next.name);
  };
  const setBeamName = (v) => {
    const next = { ...look, name: cleanName(v) };
    setLook(next);
    saveLook(next);
    if (eng.current) eng.current.setLook(next.id, next.name);
  };

  const start = () => {
    setScore(0);
    setLives(3);
    setLevel(0);
    setStage(1);
    setResult(null);
    setHold(false);
    setTip(true);
    setRound((r) => r + 1);
    setPhase("play");
    setBanner({ stage: 1, news: stageNews(1), life: false, id: Date.now() });
    play("start");
  };
  const pause = () => {
    if (eng.current) eng.current.press(false);
    setHold(false);
    setPhase("pause");
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
        <div className="flex gap-1.5 pointer-events-auto min-w-0">
          <div className="px-3 h-12 rounded-2xl bg-slate-900/80 text-white shadow flex flex-col justify-center" data-game-score>
            <span className="text-[10px] font-bold text-white/60 leading-none">PUNTI</span>
            <span className="text-xl font-black leading-tight tabular-nums">{score}</span>
          </div>
          <div className="px-2.5 h-12 rounded-2xl bg-slate-900/80 shadow flex items-center gap-0.5" data-game-lives aria-label={`${lives} vite`}>
            {Array.from({ length: Math.max(3, lives) }, (_, i) => (
              <Heart key={i} className={`${lives > 3 ? "w-4 h-4" : "w-5 h-5"} ${i < lives ? "text-red-500 fill-red-500" : "text-white/30"}`} />
            ))}
          </div>
          <div className="px-3 h-12 rounded-2xl bg-slate-900/80 text-white shadow flex flex-col justify-center" data-game-stage>
            <span className="text-[10px] font-bold text-white/60 leading-none">LIVELLO</span>
            <span className="text-xl font-black leading-tight tabular-nums">{stage}</span>
          </div>
        </div>
        <div className="flex gap-1.5 pointer-events-auto shrink-0">
          {phase === "play" && (
            <button type="button" aria-label="Pausa" data-game-btn="pause" onClick={pause} className="w-12 h-12 rounded-full bg-slate-900/80 text-white shadow flex items-center justify-center">
              <Pause className="w-5 h-5" />
            </button>
          )}
          {phase !== "play" && (
            <button type="button" aria-label={sound ? "Spegni i suoni" : "Accendi i suoni"} onClick={toggleSound} className="w-12 h-12 rounded-full bg-slate-900/80 text-white shadow flex items-center justify-center">
              {sound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
          )}
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

      {/* cartello del livello */}
      {phase === "play" && banner && (
        <div key={banner.id} className="absolute inset-x-0 flex justify-center pointer-events-none animate-in zoom-in-95" style={{ top: "18%" }} data-game-banner>
          <div className="px-6 py-3 rounded-3xl bg-amber-400 text-slate-900 shadow-2xl text-center border-4 border-white">
            <p className="text-3xl font-black leading-none">Livello {banner.stage}</p>
            <p className="text-sm font-black mt-1">{banner.news}</p>
            {banner.life && <p className="text-sm font-black text-red-700 mt-0.5">+1 vita ❤️</p>}
          </div>
        </div>
      )}
      {phase === "play" && !banner && level > 0 && (
        <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ top: "calc(max(10px, env(safe-area-inset-top)) + 58px)" }}>
          <span className="px-3 py-1 rounded-full bg-slate-900/60 text-white text-xs font-bold tabular-nums" data-game-progress>
            Camion {level} · prossimo livello tra {TRUCKS_PER_STAGE - (level % TRUCKS_PER_STAGE)}
          </span>
        </div>
      )}

      {/* pausa */}
      {phase === "pause" && (
        <div className="absolute inset-0 flex items-center justify-center p-5 bg-slate-900/60" data-game-pause>
          <div className="bg-white rounded-3xl shadow-2xl p-5 max-w-xs w-full space-y-3 text-center">
            <h2 className="text-2xl font-black text-slate-800">In pausa</h2>
            <p className="text-sm text-slate-500">Livello {stage} · {score} punti</p>
            <button type="button" onClick={toggleSound} className="w-full h-11 rounded-full border border-slate-200 text-slate-700 font-bold flex items-center justify-center gap-2">
              {sound ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />} {sound ? "Suoni accesi" : "Suoni spenti"}
            </button>
            <button type="button" onClick={() => setPhase("play")} data-action="game-resume" className="w-full h-12 rounded-full bg-amber-500 text-white font-black text-lg flex items-center justify-center gap-2">
              <Play className="w-5 h-5" /> Riprendi
            </button>
            <button type="button" onClick={onClose} className="w-full h-12 rounded-full bg-slate-100 text-slate-700 font-bold">
              Esci dal gioco
            </button>
          </div>
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
              <li>📈 Si parte facile, con la freccia verde che ti guida. Ogni {TRUCKS_PER_STAGE} camion si passa di livello: più pezzi, meno tempo, vento e il vetro fragile. Ogni 3 livelli una vita in più</li>
            </ul>
            <div className="rounded-2xl border border-slate-200 p-3 text-left" data-game-look>
              <button type="button" onClick={() => setCustom(!custom)} className="w-full flex items-center gap-2" data-action="game-look">
                <span className="w-9 h-5 rounded border border-black/10" style={{ background: `linear-gradient(${lookById(look.id).top}, ${lookById(look.id).bottom})` }} />
                <span className="flex-1 text-sm font-black text-slate-700">Il tuo carroponte{look.name ? ` · ${look.name}` : ""}</span>
                <Paintbrush className="w-4 h-4 text-slate-400" />
              </button>
              {custom && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {LOOKS.map((l) => {
                      const ok = unlocked(l, best);
                      const on = look.id === l.id;
                      return (
                        <button
                          key={l.id}
                          type="button"
                          disabled={!ok}
                          onClick={() => chooseLook(l.id)}
                          data-look={l.id}
                          aria-label={ok ? l.label : `${l.label}: si sblocca a ${l.need} punti`}
                          className={`rounded-xl p-1.5 border-2 text-center ${on ? "border-amber-500 bg-amber-50" : "border-slate-200"} ${ok ? "" : "opacity-60"}`}
                        >
                          <span className="relative block h-6 rounded-md border border-black/10" style={{ background: l.stripes ? `repeating-linear-gradient(-45deg, ${l.top} 0 6px, #111827 6px 12px)` : `linear-gradient(${l.top}, ${l.bottom})` }}>
                            {!ok && <Lock className="w-3.5 h-3.5 text-slate-700 absolute inset-0 m-auto" />}
                          </span>
                          <span className="block text-[11px] font-bold text-slate-600 mt-1 leading-tight">{ok ? l.label : `${l.need} punti`}</span>
                        </button>
                      );
                    })}
                  </div>
                  <label className="block">
                    <span className="text-xs font-black text-slate-500">Nome sulla trave (max 10 lettere)</span>
                    <input
                      value={look.name}
                      onChange={(e) => setBeamName(e.target.value)}
                      placeholder="Es. LUCA 1"
                      maxLength={10}
                      className="mt-1 w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 font-black tracking-wide text-slate-800 uppercase outline-none"
                      data-look-name
                    />
                  </label>
                  <p className="text-xs text-slate-500">I colori si sbloccano col tuo record. Il tuo: {best} punti.</p>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-black text-slate-500 flex items-center justify-center gap-1"><Medal className="w-4 h-4" /> CLASSIFICA</p>
              <Board rows={board} me={me} loading={boardLoading} />
              {record > 0 && <p className="text-xs font-bold text-amber-700">Il tuo record su questo telefono: {record} punti{bestStage > 1 ? ` · livello ${bestStage}` : ""}</p>}
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
            <p className="font-black text-slate-600" data-game-end-stage>Sei arrivato al livello {result.stage || 1}</p>
            {result.score > 0 && result.score >= record && <p className="font-bold text-amber-600">Nuovo record!</p>}
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ["Livello", result.stage || 1],
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
