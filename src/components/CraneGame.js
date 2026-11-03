// GIOCO SEGRETO DEL CARROPONTE: 5 tocchi veloci sul cielo della Home.
// Motore e disegno in game/engine.js, suoni in game/sound.js, classifica in game/scores.js.
// Comandi come un Game Boy: croce ◀ ▶ = sposti il carrello, A (o ▼) = cala il gancio finché tieni premuto,
// B = ferma il carrello, START = pausa, SELECT = suoni. Si può anche trascinare il dito sul capannone.
// Sul computer: frecce ← → e barra spaziatrice.
// PARTITA SALVATA: uscendo (X, «Esci», pausa, telefono in tasca) la partita si salva da sola — livello, punti,
// vite — sul telefono e online (game_scores → save): riaprendo il gioco c'è «Riprendi la partita», anche da un
// altro telefono. CLASSIFICA: della settimana e di sempre, con il podio; i punti contano anche se esci a metà.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, Trophy, RotateCcw, Heart, Volume2, VolumeX, Medal, Pause, Play, Lock, Paintbrush, ChevronDown, Crown } from "lucide-react";
import { CraneEngine, stageNews, TRUCKS_PER_STAGE } from "../game/engine";
import { play, soundOn, setSoundOn } from "../game/sound";
import { allScores, rank, saveScore, myData, saveGame, weekKey } from "../game/scores";
import { LOOKS, lookById, unlocked, readLook, saveLook, cleanName } from "../game/looks";
import { RowsSkeleton } from "./Skeleton";
import { key } from "../chat";

// partita lasciata a metà, su questo telefono (di chi: me)
const SAVE = "mora_crane_game_save_v1";
const readSave = () => {
  try {
    const j = JSON.parse(localStorage.getItem(SAVE) || "null");
    return j && Number(j.stage) >= 1 ? j : null;
  } catch (e) {
    return null;
  }
};
const writeSave = (snap) => {
  try {
    if (snap) localStorage.setItem(SAVE, JSON.stringify(snap));
    else localStorage.removeItem(SAVE);
  } catch (e) {
    // niente
  }
};
const mineSave = (snap, me) => (snap && (!snap.me || snap.me === key(me)) ? snap : null);

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

const initials = (n) =>
  String(n || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
const isMe = (r, me) => String(r.name).trim().toLowerCase() === String(me || "").trim().toLowerCase();
const Face = ({ r, size = "w-11 h-11 text-base" }) => {
  const lk = lookById(r.look);
  return (
    <span
      className={`${size} rounded-full flex items-center justify-center font-black shrink-0 border-2 border-white shadow`}
      style={{ background: lk.stripes ? `repeating-linear-gradient(-45deg, ${lk.top} 0 5px, #111827 5px 10px)` : `linear-gradient(${lk.top}, ${lk.bottom})`, color: lk.ink }}
      aria-hidden="true"
    >
      {initials(r.name)}
    </span>
  );
};

// CLASSIFICA: schede «Questa settimana» / «Di sempre», podio dei primi tre e poi gli altri
const Leaderboard = ({ rows, me, loading, mode, setMode, compact = false }) => {
  const list = useMemo(() => rank(rows || [], mode), [rows, mode]);
  const pos = list.findIndex((r) => isMe(r, me));
  const podium = [list[1], list[0], list[2]];
  const rest = list.slice(3, compact ? 5 : 20);
  return (
    <div className="space-y-3" data-game-board data-board-mode={mode}>
      <div className="flex bg-slate-100 p-1 rounded-full" role="tablist">
        {[
          ["week", "Questa settimana"],
          ["all", "Di sempre"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            onClick={() => setMode(id)}
            data-board-tab={id}
            className={`flex-1 h-9 rounded-full text-xs font-black ${mode === id ? "bg-white text-slate-800 shadow" : "text-slate-500"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <RowsSkeleton count={3} />
      ) : !list.length ? (
        <p className="text-sm text-slate-400 py-3">{mode === "week" ? "Questa settimana ancora nessuno: fatti avanti tu!" : "Ancora nessuno in classifica: comincia tu!"}</p>
      ) : (
        <>
          <div className="flex items-end justify-center gap-2 pt-2" data-board-podium>
            {podium.map((r, i) => {
              if (!r) return <div key={i} className="w-[30%]" />;
              const place = i === 1 ? 1 : i === 0 ? 2 : 3;
              const h = place === 1 ? "h-20" : place === 2 ? "h-14" : "h-10";
              const bar = place === 1 ? "from-amber-300 to-amber-500" : place === 2 ? "from-slate-200 to-slate-400" : "from-orange-200 to-orange-400";
              return (
                <div key={r.id} className="w-[30%] flex flex-col items-center min-w-0" data-podium={place} data-podium-name={r.name}>
                  {place === 1 && <Crown className="w-6 h-6 text-amber-500 fill-amber-300 -mb-1" />}
                  <Face r={r} size={place === 1 ? "w-14 h-14 text-lg" : "w-11 h-11 text-sm"} />
                  <p className={`mt-1 text-xs font-black truncate max-w-full ${isMe(r, me) ? "text-amber-700" : "text-slate-700"}`}>{r.name}</p>
                  <p className="text-sm font-black text-slate-900 tabular-nums leading-none">{r.pts}</p>
                  <p className="text-[10px] font-bold text-slate-400">liv. {Number(r.stage) || 1}</p>
                  <div className={`mt-1 w-full ${h} rounded-t-xl bg-gradient-to-b ${bar} flex items-start justify-center pt-1 text-white font-black text-lg shadow-inner`}>{place}</div>
                </div>
              );
            })}
          </div>
          {rest.length > 0 && (
            <ol className="space-y-1 text-left">
              {rest.map((r, i) => (
                <li key={r.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${isMe(r, me) ? "bg-amber-50 border border-amber-200" : "bg-slate-50"}`} data-board-row={r.name}>
                  <span className="w-6 text-center font-black text-slate-400 tabular-nums">{i + 4}</span>
                  <Face r={r} size="w-7 h-7 text-[10px]" />
                  <span className="flex-1 font-bold text-slate-700 truncate">{r.name}</span>
                  <span className="text-[11px] font-bold text-slate-400">liv. {Number(r.stage) || 1}</span>
                  <span className="w-12 text-right font-black text-slate-800 tabular-nums">{r.pts}</span>
                </li>
              ))}
            </ol>
          )}
          {me && (
            <p className="text-xs font-bold text-slate-500" data-board-me>
              {pos >= 0 ? `Sei ${pos + 1}° su ${list.length}${mode === "week" ? " questa settimana" : ""}` : mode === "week" ? "Questa settimana non hai ancora giocato" : "Non sei ancora in classifica"}
            </p>
          )}
        </>
      )}
    </div>
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
  const [saved, setSaved] = useState(() => mineSave(readSave(), me)); // partita lasciata a metà
  const [view, setView] = useState("play"); // schermata iniziale: «play» | «board»
  const [boardMode, setBoardMode] = useState("week");
  const [howTo, setHowTo] = useState(() => readRec() === 0);
  const [board, setBoard] = useState(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [round, setRound] = useState(0);
  const [tip, setTip] = useState(true);
  const [look, setLook] = useState(readLook); // il tuo carroponte (colore + nome)
  const [custom, setCustom] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const fromStage = useRef(1); // livello da cui parte la partita
  const fromSnap = useRef(null); // partita da riprendere (punti, vite…)
  const live = useRef(false); // c'è una partita in corso da salvare

  // livello raggiunto e partita salvata anche online: valgono su tutti i telefoni del tecnico
  useEffect(() => {
    if (!me) return;
    myData(me)
      .then((d) => {
        if (!d) return;
        if (d.stage > readStage()) {
          saveStage(d.stage);
          setBestStage(d.stage);
        }
        const local = mineSave(readSave(), me);
        if (d.save && Number(d.save.stage) >= 1 && (!local || (d.saveAt || 0) > (local.at || 0)) && !live.current) {
          writeSave(d.save);
          setSaved(d.save);
        }
      })
      .catch(() => {});
  }, [me]);

  // SALVA LA PARTITA (uscendo, in pausa, a ogni camion): sul telefono subito, online e in classifica
  const saveProgress = useCallback(
    (online = true) => {
      const e = eng.current;
      if (!e || e.over || !live.current) return;
      const snap = { ...e.snapshot(), me: key(me), at: Date.now() };
      if (snap.score <= 0 && snap.stage <= 1 && snap.level <= 0) return;
      writeSave(snap);
      setSaved(snap);
      if (snap.stage > readStage()) {
        saveStage(snap.stage);
        setBestStage(snap.stage);
      }
      if (snap.score > readRec()) {
        saveRec(snap.score);
        setRecord(snap.score);
      }
      if (me && online) {
        saveGame(me, snap).catch(() => false);
        saveScore(me, snap.score, readLook().id, snap.stage, false).catch(() => false);
      }
    },
    [me]
  );
  const saveRef = useRef(saveProgress);
  saveRef.current = saveProgress;
  const clearSave = useCallback(() => {
    writeSave(null);
    setSaved(null);
    if (me) saveGame(me, null).catch(() => false);
  }, [me]);
  // chiudendo l'app o cambiando pagina (anche senza toccare X): almeno sul telefono resta salvata
  useEffect(() => {
    const onHide = () => saveRef.current(false);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      saveRef.current(false);
    };
  }, []);
  const close = () => {
    if (phaseRef.current === "play" || phaseRef.current === "pause") saveProgress();
    onClose();
  };

  // i miei punti appena fatti valgono subito in classifica (anche se la rete è lenta o il salvataggio è in ritardo)
  const myBest = useRef(null);
  const withMine = useCallback(
    (rows) => {
      const m = myBest.current;
      if (!me || !m) return rows;
      const k = key(me);
      const wk = weekKey();
      const list = [...(rows || [])];
      const i = list.findIndex((r) => key(r.name) === k);
      const old = i >= 0 ? list[i] : { id: k, name: String(me).trim(), owner: k };
      const oldWeek = old.week === wk ? Number(old.weekBest) || 0 : 0;
      const row = { ...old, best: Math.max(Number(old.best) || 0, m.score), stage: Math.max(Number(old.stage) || 0, m.stage), week: wk, weekBest: Math.max(oldWeek, m.score), look: old.look || readLook().id };
      if (i >= 0) list[i] = row;
      else list.push(row);
      return list;
    },
    [me]
  );
  const loadBoard = useCallback(() => {
    setBoardLoading(true);
    allScores()
      .then((r) => setBoard(withMine(r)))
      .catch(() => setBoard((b) => (b ? withMine(b) : null)))
      .then(() => setBoardLoading(false));
  }, [withMine]);
  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // iPhone: tenendo premuto un tasto compariva il menu «Copia / Cerca info / Traduci» sopra il gioco.
  // Sul capannone e sui tasti blocco il «tieni premuto» del telefono (i tasti funzionano lo stesso) e
  // se una selezione parte comunque la tolgo subito.
  const root = useRef(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const onTouch = (ev) => {
      const t = ev.target;
      if (!t || !t.closest || t.closest("input,textarea")) return;
      const onPad = t.closest("[data-game-pad]") && !t.closest('[data-game-btn="select"],[data-game-btn="start"]');
      if ((onPad || (box.current && box.current.contains(t))) && ev.cancelable) ev.preventDefault();
    };
    const noSelect = (ev) => {
      const t = ev.target;
      if (t && t.closest && t.closest("input,textarea")) return;
      ev.preventDefault();
    };
    const clearSel = () => {
      const a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName)) return;
      const s = window.getSelection && window.getSelection();
      if (s && s.rangeCount && !s.isCollapsed) s.removeAllRanges();
    };
    el.addEventListener("touchstart", onTouch, { passive: false });
    el.addEventListener("selectstart", noSelect);
    document.addEventListener("selectionchange", clearSel);
    return () => {
      el.removeEventListener("touchstart", onTouch);
      el.removeEventListener("selectstart", noSelect);
      document.removeEventListener("selectionchange", clearSel);
    };
  }, []);

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
      dpr = Math.min(3, window.devicePixelRatio || 1); // fino a 3: nitido anche sugli schermi più fini
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
        if (ev.type === "done") {
          setLevel(ev.level);
          setTimeout(() => saveRef.current(), 0); // a ogni camion la partita è salvata
        }
        if (ev.type === "stage") {
          setStage(ev.stage);
          setLives(ev.lives);
          setBanner({ stage: ev.stage, news: ev.news, life: ev.life, id: Date.now() });
        }
        if (ev.type === "over") {
          live.current = false;
          setResult({ score: ev.score, stats: ev.stats, level: ev.level, stage: ev.stage });
          setPhase("end");
        }
      },
    });
    const lk = readLook();
    e.setLook(lk.id, lk.name);
    if (fromStage.current > 1) e.startAt(fromStage.current);
    if (fromSnap.current) e.restore(fromSnap.current);
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
        if (phaseRef.current === "play" || phaseRef.current === "pause") saveRef.current();
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
  const endSaved = useRef(null);
  useEffect(() => {
    if (phase !== "end" || !result || endSaved.current === result) return;
    endSaved.current = result; // una volta sola per partita
    if ((result.stage || 1) > readStage()) {
      saveStage(result.stage || 1);
      setBestStage(result.stage || 1);
    }
    if (result.score > readRec()) {
      saveRec(result.score);
      setRecord(result.score);
    }
    clearSave(); // partita finita: niente più da riprendere
    if (result.score > 0) {
      myBest.current = { score: Math.max(result.score, (myBest.current || {}).score || 0), stage: Math.max(result.stage || 1, (myBest.current || {}).stage || 1) };
      setBoard((b) => withMine(b || []));
    }
    if (me && (result.score > 0 || (result.stage || 1) > 1)) {
      saveScore(me, result.score, readLook().id, result.stage || 1, true)
        .catch(() => false)
        .then(loadBoard);
    } else loadBoard();
  }, [phase, result, me, loadBoard, clearSave, withMine]);

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
  // TASTIERA DA GAME BOY: croce per il carrello, A per il gancio, B per fermarsi
  const tick = () => {
    try {
      if (navigator.vibrate) navigator.vibrate(8);
    } catch (e) {
      // niente
    }
  };
  const moving = useRef(0);
  const move = (dir) => (ev) => {
    ev.stopPropagation();
    if (phase !== "play" || !eng.current) return;
    const e = eng.current;
    if (dir) {
      try {
        ev.currentTarget.setPointerCapture(ev.pointerId);
      } catch (err) {
        // niente
      }
      moving.current = dir;
      e.setTarget(dir > 0 ? 400 : -40);
      setTip(false);
      tick();
    } else if (moving.current) {
      moving.current = 0;
      // lascio il tasto: il carrello frena dolce dove si trova
      e.setTarget(e.trolley.x + e.trolley.v * 0.2);
    }
  };
  const brake = (ev) => {
    ev.stopPropagation();
    if (phase !== "play" || !eng.current) return;
    moving.current = 0;
    eng.current.setTarget(eng.current.trolley.x);
    tick();
  };
  const [padDown, setPadDown] = useState("");
  const padBtn = (id, onDown, onUpFn) => ({
    onPointerDown: (ev) => {
      setPadDown(id);
      onDown(ev);
    },
    onPointerUp: (ev) => {
      setPadDown("");
      if (onUpFn) onUpFn(ev);
    },
    onPointerCancel: (ev) => {
      setPadDown("");
      if (onUpFn) onUpFn(ev);
    },
    onContextMenu: (e) => e.preventDefault(),
  });

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

  // il mio posto in classifica (settimana, altrimenti di sempre)
  const myLine = useMemo(() => {
    if (!me || !board) return "";
    const w = rank(board, "week").findIndex((r) => isMe(r, me));
    if (w >= 0) return `Sei ${w + 1}° questa settimana`;
    const a = rank(board, "all").findIndex((r) => isMe(r, me));
    return a >= 0 ? `Sei ${a + 1}° nella classifica di sempre` : "";
  }, [board, me]);
  // fine partita: i punti salgono da 0 al risultato
  const [shown, setShown] = useState(0);
  const recordBefore = useRef(0);
  const newRecord = !!result && result.score > 0 && result.score > recordBefore.current;
  useEffect(() => {
    if (phase !== "end" || !result) return undefined;
    let raf = 0;
    const t0 = performance.now();
    const go = (ts) => {
      const k = Math.min(1, (ts - t0) / 900);
      setShown(Math.round(result.score * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(go);
    };
    raf = requestAnimationFrame(go);
    if (newRecord) play("start");
    return () => cancelAnimationFrame(raf);
  }, [phase, result, newRecord]);

  const start = (from = 1, snap = null) => {
    const st = Math.max(1, Number((snap && snap.stage) || from) || 1);
    fromStage.current = st;
    fromSnap.current = snap;
    live.current = true;
    recordBefore.current = Math.max(readRec(), best);
    if (!snap) clearSave(); // partita nuova: quella vecchia non serve più
    // iPhone: se il campo del nome era ancora attivo, tenendo premuto comparivano «Copia / Incolla»
    try {
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      const sel = window.getSelection && window.getSelection();
      if (sel && sel.removeAllRanges) sel.removeAllRanges();
    } catch (e) {
      // niente
    }
    setScore(snap ? Number(snap.score) || 0 : 0);
    setLives(snap ? Math.max(1, Math.min(5, Number(snap.lives) || 3)) : 3);
    setLevel(snap ? Number(snap.level) || 0 : 0);
    setStage(st);
    setResult(null);
    setHold(false);
    setTip(true);
    setRound((r) => r + 1);
    setPhase("play");
    setBanner({ stage: st, news: stageNews(st), life: false, id: Date.now() });
    play("start");
  };
  const pause = () => {
    if (eng.current) eng.current.press(false);
    setHold(false);
    setPhase("pause");
    saveProgress();
  };
  const stop = (ev) => ev.stopPropagation();
  const toggleSound = () => {
    setSoundOn(!sound);
    setSound(!sound);
  };

  return (
    <div
      ref={root}
      className="mora-game fixed inset-0 z-[600] bg-slate-400 select-none overflow-hidden"
      data-section="crane-game"
      style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}
      onContextMenu={(e) => e.preventDefault()}
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
          <button type="button" aria-label="Chiudi" onClick={close} data-game-btn="close" className="w-12 h-12 rounded-full bg-slate-900/80 text-white shadow flex items-center justify-center">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* suggerimento all'inizio */}
      {phase === "play" && tip && (
        <div className="absolute inset-x-0 flex justify-center pointer-events-none" style={{ top: "38%" }}>
          <span className="px-4 py-2 rounded-2xl bg-slate-900/80 text-white font-bold text-sm text-center leading-snug">
            ◀ ▶ muovi il carrello · B lo fermi
            <br />
            Tieni premuto A per calare il gancio
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
            <button type="button" onClick={close} data-action="game-exit" className="w-full h-12 rounded-full bg-slate-100 text-slate-700 font-bold">
              Esci dal gioco
            </button>
            <p className="text-xs text-slate-400">Uscendo la partita resta salvata: la riprendi quando vuoi.</p>
          </div>
        </div>
      )}

      {/* TASTI DA GAME BOY */}
      {phase === "play" && (
        <div className="absolute inset-x-0 bottom-0 px-3 flex items-end justify-between gap-1 pointer-events-none" style={{ paddingBottom: "max(18px, env(safe-area-inset-bottom))" }} data-game-pad>
          {/* croce */}
          <div className="relative w-[120px] h-[120px] shrink-0 pointer-events-auto" aria-label="Croce direzionale">
            <span className="absolute left-[40px] top-[40px] w-[40px] h-[40px] bg-slate-800" />
            {[
              ["up", "left-[40px] top-0 rounded-t-lg", "▲", "Su: il gancio risale", (ev) => press(false)(ev), null],
              ["down", "left-[40px] bottom-0 rounded-b-lg", "▼", "Giù: tieni premuto per calare il gancio", press(true), press(false)],
              ["left", "left-0 top-[40px] rounded-l-lg", "◀", "Sinistra: tieni premuto per spostare il carrello", move(-1), move(0)],
              ["right", "right-0 top-[40px] rounded-r-lg", "▶", "Destra: tieni premuto per spostare il carrello", move(1), move(0)],
            ].map(([id, pos, sym, label, down, up]) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                data-game-btn={id === "down" ? "pad-down" : id}
                {...padBtn(id, down, up)}
                className={`absolute ${pos} w-[40px] h-[40px] bg-slate-800 text-slate-300 text-lg flex items-center justify-center shadow-[0_4px_0_#0f172a] ${padDown === id ? "translate-y-[3px] shadow-none bg-slate-700" : ""}`}
              >
                {sym}
              </button>
            ))}
          </div>
          {/* SELECT / START */}
          <div className="flex gap-2 mb-1 pointer-events-auto">
            {[
              ["select", "SELECT", toggleSound, sound ? "Spegni i suoni" : "Accendi i suoni"],
              ["start", "START", pause, "Pausa"],
            ].map(([id, lab, fn, aria]) => (
              <button key={id} type="button" onClick={fn} aria-label={aria} data-game-btn={id} className="flex flex-col items-center gap-1">
                <span className="block w-10 h-3.5 rounded-full bg-slate-700 shadow-[0_2px_0_#0f172a] -rotate-[20deg]" />
                <span className="text-[9px] font-black tracking-wider text-slate-800/70">{lab}</span>
              </button>
            ))}
          </div>
          {/* B e A */}
          <div className="relative w-[124px] h-[104px] shrink-0 pointer-events-auto">
            <button
              type="button"
              aria-label="B: ferma il carrello"
              data-game-btn="b"
              {...padBtn("b", brake, null)}
              className={`absolute left-0 bottom-0 w-[56px] h-[56px] rounded-full bg-rose-800 text-white/90 font-black text-xl flex items-center justify-center shadow-[0_5px_0_#4c0519] ${padDown === "b" ? "translate-y-[4px] shadow-none" : ""}`}
            >
              B
            </button>
            <button
              type="button"
              aria-label="A: tieni premuto per calare il gancio"
              data-game-btn="down"
              {...padBtn("a", press(true), press(false))}
              className={`absolute right-0 top-0 w-[62px] h-[62px] rounded-full text-white font-black text-2xl flex items-center justify-center ${hold || padDown === "a" ? "bg-rose-700 translate-y-[4px] shadow-none" : "bg-rose-600 shadow-[0_5px_0_#4c0519]"}`}
            >
              A
            </button>
          </div>
        </div>
      )}

      {/* inizio: titolo, «Gioca» / «Classifica» */}
      {phase === "intro" && (
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-900/55 overflow-y-auto" data-game-intro>
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden my-auto animate-in zoom-in-95">
            <div className="relative px-5 pt-5 pb-4 text-center text-slate-900 bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500">
              <div className="absolute inset-x-0 bottom-0 h-2 opacity-80" style={{ background: "repeating-linear-gradient(-45deg, #111827 0 10px, #facc15 10px 20px)" }} />
              <p className="text-[11px] font-black tracking-[0.3em] opacity-70">IL GIOCO DEL</p>
              <h2 className="text-[34px] font-black leading-[0.95] tracking-tight drop-shadow-sm">
                CARROPONTE
                <br />
                MORA
              </h2>
              {(record > 0 || bestStage > 1) && (
                <p className="mt-2 inline-flex items-center gap-1.5 bg-white/75 rounded-full px-3 py-1 text-xs font-black" data-game-record>
                  <Trophy className="w-3.5 h-3.5 text-amber-600" /> Record {best} punti · livello {Math.max(1, bestStage)}
                </p>
              )}
            </div>
            <div className="flex px-3 pt-3 gap-2" role="tablist">
              {[
                ["play", "Gioca", Play],
                ["board", "Classifica", Medal],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={view === id}
                  onClick={() => setView(id)}
                  data-game-view={id}
                  className={`flex-1 h-11 rounded-2xl text-sm font-black flex items-center justify-center gap-1.5 ${view === id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
            <div className="p-5 pt-4 space-y-3 text-center">
              {view === "board" ? (
                <Leaderboard rows={board} me={me} loading={boardLoading} mode={boardMode} setMode={setBoardMode} />
              ) : (
                <>
                  {saved ? (
                    <div className="space-y-2">
                      <button type="button" onClick={() => start(1, saved)} data-action="game-resume-saved" className="w-full rounded-2xl bg-amber-500 text-white px-4 py-3 shadow-[0_5px_0_#b45309] active:translate-y-[3px] active:shadow-none">
                        <span className="block text-lg font-black leading-tight">▶ Riprendi la partita</span>
                        <span className="block text-sm font-bold text-white/90" data-saved-info>
                          Livello {saved.stage} · {saved.score} punti · {"❤️".repeat(Math.max(1, Math.min(5, Number(saved.lives) || 1)))}
                        </span>
                      </button>
                      <button type="button" onClick={() => start(1)} data-action="game-start" className="w-full h-11 rounded-full bg-slate-100 text-slate-700 font-bold">
                        Nuova partita dal livello 1
                      </button>
                    </div>
                  ) : bestStage > 1 ? (
                    <div className="space-y-2">
                      <button type="button" onClick={() => start(bestStage)} data-action="game-continue" className="w-full h-12 rounded-full bg-amber-500 text-white font-black text-lg shadow-[0_5px_0_#b45309] active:translate-y-[3px] active:shadow-none">
                        Continua dal livello {bestStage}
                      </button>
                      <button type="button" onClick={() => start(1)} data-action="game-start" className="w-full h-11 rounded-full bg-slate-100 text-slate-700 font-bold">
                        Ricomincia dal livello 1
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => start(1)} data-action="game-start" className="w-full h-12 rounded-full bg-amber-500 text-white font-black text-lg shadow-[0_5px_0_#b45309] active:translate-y-[3px] active:shadow-none">
                      Gioca
                    </button>
                  )}
                  <button type="button" onClick={() => setView("board")} className="w-full flex items-center justify-center gap-2 text-sm font-bold text-slate-600" data-action="game-board">
                    <Medal className="w-4 h-4 text-amber-500" /> {myLine || "Guarda la classifica"}
                  </button>
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
                  <div className="rounded-2xl border border-slate-200 p-3 text-left">
                    <button type="button" onClick={() => setHowTo(!howTo)} className="w-full flex items-center gap-2" data-action="game-howto">
                      <span className="flex-1 text-sm font-black text-slate-700">Come si gioca</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${howTo ? "rotate-180" : ""}`} />
                    </button>
                    {howTo && (
                  <ul className="text-left text-sm text-slate-600 space-y-1.5 mt-2" data-game-howto>
                    <li>🎮 Tasti come un <b>Game Boy</b>: <b>◀ ▶</b> muovi il carrello, <b>B</b> lo fermi</li>
                    <li>🅰️ <b>Tieni premuto A</b> (o ▼): il gancio scende e aggancia da solo il pezzo che tocca. Lascia: risale</li>
                    <li>⏸️ <b>START</b> = pausa · <b>SELECT</b> = suoni. Puoi anche trascinare il dito sul capannone</li>
                    <li>🚚 Ogni camion vuole <b>pezzi precisi</b>: li vedi disegnati sul cassone</li>
                    <li>✨ Appoggia <b>piano e senza dondolare</b>: «Perfetto!» vale di più (e di fila moltiplica)</li>
                    <li>💥 Se sbatti è una «Botta!», se sbagli pezzo perdi punti</li>
                    <li>❤️ 3 vite: ne perdi una se un camion riparte senza tutto</li>
                    <li>📈 Si parte facile, con la freccia verde che ti guida. Ogni {TRUCKS_PER_STAGE} camion si passa di livello: più pezzi, meno tempo, vento e il vetro fragile. Ogni 3 livelli una vita in più</li>
                  </ul>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* fine: punti che salgono, posto in classifica */}
      {phase === "end" && result && (
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-slate-900/60 overflow-y-auto" data-game-end>
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden my-auto animate-in zoom-in-95">
            <div className={`px-5 pt-5 pb-4 text-center ${newRecord ? "bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500" : "bg-gradient-to-br from-slate-700 to-slate-900 text-white"}`}>
              <Trophy className={`w-12 h-12 mx-auto ${newRecord ? "text-white drop-shadow" : "text-amber-400"}`} />
              <p className="text-xs font-black tracking-[0.25em] opacity-70 mt-1">PARTITA FINITA</p>
              <h2 className="text-5xl font-black tabular-nums leading-none mt-1" data-game-end-score>
                {shown}
              </h2>
              <p className="text-sm font-black opacity-80">punti</p>
              {newRecord && <p className="mt-2 inline-block bg-white/80 text-amber-700 rounded-full px-3 py-1 text-sm font-black">🎉 Nuovo record!</p>}
            </div>
            <div className="p-5 space-y-3 text-center">
              <p className="font-black text-slate-600" data-game-end-stage>
                Sei arrivato al livello {result.stage || 1}
              </p>
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
              {myLine && (
                <p className="text-sm font-black text-amber-700" data-game-end-rank>
                  🏅 {myLine}
                </p>
              )}
              <Leaderboard rows={board} me={me} loading={boardLoading} mode={boardMode} setMode={setBoardMode} compact />
              {Math.max(bestStage, result.stage || 1) > 1 && (
                <button type="button" onClick={() => start(Math.max(bestStage, result.stage || 1))} data-action="game-continue" className="w-full h-12 rounded-full bg-amber-500 text-white font-black shadow-[0_5px_0_#b45309] active:translate-y-[3px] active:shadow-none">
                  Continua dal livello {Math.max(bestStage, result.stage || 1)}
                </button>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 h-12 rounded-full bg-slate-100 text-slate-700 font-bold">
                  Esci
                </button>
                <button type="button" onClick={() => start(1)} data-action="game-again" className={`flex-1 h-12 rounded-full font-black flex items-center justify-center gap-2 ${Math.max(bestStage, result.stage || 1) > 1 ? "bg-slate-100 text-slate-700" : "bg-amber-500 text-white"}`}>
                  <RotateCcw className="w-4 h-4" /> {Math.max(bestStage, result.stage || 1) > 1 ? "Dal livello 1" : "Rigioca"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
