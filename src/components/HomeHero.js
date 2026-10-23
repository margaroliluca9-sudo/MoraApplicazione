// IN CIMA ALLA HOME: il cielo vivo con il carroponte (disegnato in components/hero/world.js).
// Qui: il saluto, il giorno, le cose da fare e la scritta che cambia (curiosità sui propri
// interventi o quello che succede nel cielo). Si può spegnere da ⚙ Impostazioni («Cielo animato»):
// allora resta un'immagine ferma che si aggiorna ogni minuto. Rispetta "riduci movimento".
import React, { useEffect, useMemo, useRef, useState } from "react";
import { MONTHS } from "../personal";
import { seasonOf } from "../season";
import { getSettings } from "../settings";
import { HeroWorld } from "./hero/world";
import { heroLines } from "./hero/facts";
import { activeNotices } from "../company";
import { createPortal } from "react-dom";
import { CraneGame } from "./CraneGame";

export const skyOf = (hour) =>
  hour >= 5 && hour < 9 ? "alba" : hour >= 9 && hour < 17 ? "giorno" : hour >= 17 && hour < 20 ? "tramonto" : "notte";

const isMe = (l, k) =>
  String(l.technician || "").trim().toLowerCase() === k ||
  (l.additionalTechnicians || []).some((t) => String(t).trim().toLowerCase() === k);

// interventi dell'anno del tecnico
export const myYearCount = (logs = [], me = "", now = new Date()) => {
  const k = String(me || "").trim().toLowerCase();
  return logs.filter((l) => String(l.dateString || "").endsWith("/" + now.getFullYear()) && isMe(l, k)).length;
};
// traguardo: 50, 100, 150… interventi nell'anno
export const isMilestone = (n) => n > 0 && n % 50 === 0;

// curiosità (dai propri interventi)
export const factsOf = (logs = [], me = "", now = new Date()) => {
  const k = String(me || "").trim().toLowerCase();
  const mine = logs.filter((l) => isMe(l, k));
  const y = now.getFullYear();
  const ofYear = mine.filter((l) => String(l.dateString || "").endsWith("/" + y));
  const ofMonth = ofYear.filter((l) => Number(String(l.dateString).split("/")[1]) === now.getMonth() + 1);
  const top = (arr, f) => {
    const c = {};
    arr.forEach((l) => {
      const v = f(l);
      if (v) c[v] = (c[v] || 0) + 1;
    });
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  };
  const out = [];
  if (ofYear.length) out.push(`Nel ${y} hai fatto ${ofYear.length} ${ofYear.length === 1 ? "intervento" : "interventi"}`);
  if (ofMonth.length) out.push(`A ${MONTHS[now.getMonth()].toLowerCase()} sei a quota ${ofMonth.length}`);
  const c = top(ofYear, (l) => l.customer);
  if (c && c[1] > 1) out.push(`Il cliente dove vai di più: ${c[0]} (${c[1]} volte)`);
  const ropes = ofYear.filter((l) => l.fune || l.catena).length;
  if (ropes) out.push(`Funi e catene cambiate quest'anno: ${ropes}`);
  const mate = top(ofYear, (l) => [l.technician, ...(l.additionalTechnicians || [])].find((t) => t && String(t).trim().toLowerCase() !== k));
  if (mate && mate[1] > 1) out.push(`Il collega con cui lavori di più: ${mate[0]}`);
  const g = top(ofYear, (l) => (l.customer && l.machineId ? `${l.customer}, gru ${l.machineId}` : ""));
  if (g && g[1] > 2) out.push(`La gru che vedi più spesso: ${g[0]}`);
  const nextGoal = Math.ceil((ofYear.length + 1) / 50) * 50;
  if (ofYear.length && nextGoal - ofYear.length <= 5) out.push(`Ancora ${nextGoal - ofYear.length} e arrivi a ${nextGoal} interventi`);
  // negli anni: confronti con l'anno scorso (si aggiornano da soli, ogni anno)
  const ofPrev = mine.filter((l) => String(l.dateString || "").endsWith("/" + (y - 1)));
  if (ofPrev.length && now.getMonth() <= 1) out.push(`Nel ${y - 1} hai fatto ${ofPrev.length} ${ofPrev.length === 1 ? "intervento" : "interventi"}`);
  const prevMonth = ofPrev.filter((l) => Number(String(l.dateString).split("/")[1]) === now.getMonth() + 1).length;
  if (prevMonth && ofMonth.length) out.push(`A ${MONTHS[now.getMonth()].toLowerCase()} dell'anno scorso eri a quota ${prevMonth}, quest'anno ${ofMonth.length}`);
  const ago = `${now.getDate()}/${now.getMonth() + 1}/${y - 1}`;
  const yearAgo = mine.find((l) => l.dateString === ago && l.customer);
  if (yearAgo) out.push(`Un anno fa, proprio oggi, eri da ${yearAgo.customer}`);
  const dow = now.getDay();
  if (dow === 1) out.push("Lunedì: buon inizio settimana");
  if (dow === 5) out.push("Venerdì: ancora uno sforzo e c'è il weekend");
  if (!out.length) out.push("Buon lavoro!");
  return out;
};

const HINT = "mora_hero_hint";
const hintCount = () => {
  try {
    return Number(localStorage.getItem(HINT) || 0);
  } catch (e) {
    return 9;
  }
};
const bumpHint = () => {
  try {
    localStorage.setItem(HINT, String(hintCount() + 1));
  } catch (e) {
    // niente
  }
};
const reducedMotion = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {
    return false;
  }
};

export const HomeHero = ({ me = "", logs = [], todayCount = 0, now = new Date(), force = [] }) => {
  const box = useRef(null);
  const canvas = useRef(null);
  const world = useRef(null);
  const [dark, setDark] = useState(() => {
    const h = now.getHours();
    return h < 7 || h >= 18;
  });

  const [anim, setAnim] = useState(() => getSettings().heroAnim !== false);
  const [extra, setExtra] = useState("");
  const forced = force.join(",");
  const [seed, setSeed] = useState(0);
  const nowRef = useRef(now);
  nowRef.current = now;
  const hour = now.getHours();
  const month = now.getMonth();
  const weekend = now.getDay() === 0 || now.getDay() === 6;
  const season = seasonOf(now);
  const yearCount = useMemo(() => myYearCount(logs, me, now), [logs, me, now]);
  const party = isMilestone(yearCount) || force.includes("traguardo");
  const facts = useMemo(() => factsOf(logs, me, now), [logs, me, now]);
  const [hello] = useState(() => {
    const list = hour < 13 ? ["Buongiorno", "Buongiorno", "Ciao", "Buona giornata"] : hour < 18 ? ["Buon pomeriggio", "Ciao", "Buon pomeriggio"] : ["Buonasera", "Buonasera", "Ciao"];
    return list[Math.floor(Math.random() * list.length)];
  });

  // impostazione «Cielo animato»
  useEffect(() => {
    const on = () => setAnim(getSettings().heroAnim !== false);
    window.addEventListener("mora-settings", on);
    return () => window.removeEventListener("mora-settings", on);
  }, []);


  // IL MONDO
  useEffect(() => {
    const cv = canvas.current;
    const el = box.current;
    if (!cv || !el) return undefined;
    const ctx = cv.getContext("2d");
    if (!ctx) return undefined;
    const still = !anim || reducedMotion();
    const w = new HeroWorld({
      now: new Date(nowRef.current.getTime()),
      force: forced ? forced.split(",") : [],
      season,
      weekend,
      party,
      onSay: () => {}, // la scritta resta ferma: cambia solo aprendo la Home o ricaricando
      onTone: (d) => setDark(d),
    });
    world.current = w;
    setExtra(w.describe().join(" "));
    let W = 0;
    let H = 0;
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
    let visible = true;
    const frame = (ts) => {
      raf = 0;
      const dt = last ? (ts - last) / 1000 : 0.016;
      last = ts;
      w.update(dt);
      w.draw(ctx, W, H, dpr);
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const go = () => {
      if (!raf && !still) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    let timer = 0;
    if (still) {
      for (let i = 0; i < 60; i++) w.update(0.05);
      w.draw(ctx, W, H, dpr);
      timer = setInterval(() => {
        w.update(0.05);
        w.draw(ctx, W, H, dpr);
      }, 60000);
    } else go();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      size();
      if (still) w.draw(ctx, W, H, dpr);
    }) : null;
    if (ro) ro.observe(el);
    const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((en) => {
      visible = en[0] ? en[0].isIntersecting : true;
      if (visible) go();
    }) : null;
    if (io) io.observe(el);
    // tornando nell'app dopo un po': si riparte da una scena nuova
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else {
        if (hiddenAt && Date.now() - hiddenAt > 60000) setSeed((n) => n + 1);
        go();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearInterval(timer);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [anim, forced, seed, season, weekend, party, hour, month]);

  const toWorld = (e) => {
    const w = world.current;
    const el = box.current;
    if (!w || !w.view || !el) return null;
    const r = el.getBoundingClientRect();
    return [(e.clientX - r.left - w.view.ox) / w.view.s, (e.clientY - r.top - w.view.oy) / w.view.s];
  };
  // GIOCO SEGRETO: 5 tocchi veloci sul cielo (entro 2 secondi e mezzo)
  const taps = useRef([]);
  const [game, setGame] = useState(false);
  const down = (e) => {
    const now2 = Date.now();
    taps.current = [...taps.current.filter((t) => now2 - t < 2500), now2];
    if (taps.current.length >= 5) {
      taps.current = [];
      setGame(true);
      return;
    }
    const p = toWorld(e);
    if (p) world.current.pointerDown(p[0], p[1]);
  };
  const move = (e) => {
    if (!world.current || !world.current.ptr) return;
    const p = toWorld(e);
    if (p) world.current.pointerMove(p[0]);
  };
  const up = () => world.current && world.current.pointerUp();

  // LA SCRITTA: scelta una volta quando si apre la Home (o si ricarica), poi resta ferma.
  // Le prime 3 volte spiega come guidare la gru; poi i tuoi numeri, il periodo dell'anno o una curiosità.
  const [line] = useState(() => {
    if (hintCount() < 3) {
      bumpHint();
      return "Trascina il dito sul cielo: guidi tu la gru. Tocca: il gancio scende";
    }
    // avvisi dell'azienda (area admin → Avvisi in Home): nei loro giorni escono più spesso
    const news = activeNotices(new Date());
    if (news.length && Math.random() < 0.6) return "📢 " + news[Math.floor(Math.random() * news.length)];
    const all = heroLines(facts, new Date());
    return all[Math.floor(Math.random() * all.length)];
  });
  const chip = party ? `🎉 Traguardo: ${yearCount} interventi nel ${now.getFullYear()}!` : line;

  return (
    <div
      ref={box}
      className="relative overflow-hidden rounded-3xl shadow-sm select-none cursor-pointer bg-sky-300"
      style={{ touchAction: "pan-y" }}
      data-section="home-hero"
      data-sky={skyOf(hour)}
      data-extra={extra}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={up}
    >
      <canvas ref={canvas} className="absolute inset-0 w-full h-full" aria-hidden="true" data-hero-canvas />
      <div className="relative px-5 pt-4 pb-5 min-h-[184px] md:min-h-[220px] lg:min-h-[240px] flex flex-col justify-between pointer-events-none" style={{ paddingRight: "36%" }}>
        <div>
          <p className="text-[22px] font-black leading-tight transition-colors duration-700" style={{ color: dark ? "#ffffff" : "#0f172a", textShadow: dark ? "0 1px 8px rgba(0,0,0,.35)" : "0 1px 8px rgba(255,255,255,.35)" }}>
            {hello}
            {me ? "," : ""}
            <br />
            {me}
          </p>
          <p className="text-sm font-bold mt-1 transition-colors duration-700" style={{ color: dark ? "rgba(255,255,255,.85)" : "#334155" }}>
            {["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"][now.getDay()]} {now.getDate()} {MONTHS[month].toLowerCase()}
            {todayCount > 0 ? ` · ${todayCount === 1 ? "1 cosa" : todayCount + " cose"} da fare` : ""}
          </p>
        </div>
        <p
          key={chip}
          className="mt-3 text-xs font-bold rounded-xl px-2.5 py-1.5 w-fit max-w-full backdrop-blur-sm"
          style={{ animation: "moraChip .5s ease-out", background: dark ? "rgba(0,0,0,.25)" : "rgba(255,255,255,.75)", color: dark ? "#ffffff" : "#334155" }}
          data-hero-fact
        >
          {chip}
        </p>
      </div>
      <style>{"@keyframes moraChip { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }"}</style>
      {game && createPortal(<CraneGame onClose={() => setGame(false)} />, document.body)}
    </div>
  );
};
