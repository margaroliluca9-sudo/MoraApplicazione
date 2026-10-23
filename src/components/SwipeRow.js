// SCORRI VERSO SINISTRA su una riga (come WhatsApp, Mail, Note del telefono): escono i pulsanti
// delle azioni (Modifica, Elimina…). Scorri indietro o tocca la riga per richiuderla.
// - funziona col dito e col mouse (trascinando); lo scorrimento in su e in giù resta normale
// - una sola riga aperta alla volta
// - le azioni con «confirm» chiedono un secondo tocco («Sicuro?») prima di farlo davvero
// - chi non scorre ha sempre gli stessi pulsanti dentro la riga o nella finestra (niente cambia)
import React, { useEffect, useRef, useState } from "react";

const BTN = 76; // larghezza di ogni pulsante
const OPEN_EVENT = "mora-swipe-open";
let seq = 0;

const TONES = {
  red: "bg-red-600 text-white",
  blue: "bg-blue-600 text-white",
  amber: "bg-amber-500 text-white",
  emerald: "bg-emerald-600 text-white",
  slate: "bg-slate-500 text-white",
  purple: "bg-purple-600 text-white",
};

export const SwipeRow = ({ actions = [], children, className = "", rounded = "rounded-2xl", disabled = false, id }) => {
  const acts = actions.filter(Boolean);
  const width = acts.length * BTN;
  const [x, setX] = useState(0);
  const [drag, setDrag] = useState(false);
  const [ask, setAsk] = useState(null); // indice dell'azione che chiede conferma
  const g = useRef(null);
  const me = useRef(++seq);
  const xRef = useRef(0);
  xRef.current = x;

  // un'altra riga si apre → questa si chiude
  useEffect(() => {
    const onOther = (e) => {
      if (e.detail !== me.current && xRef.current !== 0) {
        setX(0);
        setAsk(null);
      }
    };
    window.addEventListener(OPEN_EVENT, onOther);
    return () => window.removeEventListener(OPEN_EVENT, onOther);
  }, []);
  // la riga aperta si chiude toccando fuori
  useEffect(() => {
    if (x === 0) return undefined;
    const away = (e) => {
      if (g.current && g.current.el && !g.current.el.contains(e.target)) {
        setX(0);
        setAsk(null);
      }
    };
    document.addEventListener("pointerdown", away, true);
    return () => document.removeEventListener("pointerdown", away, true);
  }, [x]);

  if (disabled || !acts.length) return <div className={className}>{children}</div>;

  const close = () => {
    setX(0);
    setAsk(null);
  };
  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    g.current = { ...(g.current || {}), x0: e.clientX, y0: e.clientY, start: xRef.current, dir: null, moved: false, id: e.pointerId };
  };
  const onMove = (e) => {
    const s = g.current;
    if (!s || s.x0 == null || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x0;
    const dy = e.clientY - s.y0;
    if (!s.dir) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      // vicino al bordo sinistro dello schermo verso destra = gesto «indietro» dell'app: non lo rubo
      s.dir = Math.abs(dx) > Math.abs(dy) * 1.2 && !(s.x0 < 30 && dx > 0 && s.start === 0) ? "h" : "v";
      if (s.dir === "h") {
        setDrag(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {
          // niente
        }
      }
    }
    if (s.dir !== "h") return;
    s.moved = true;
    let nx = s.start + dx;
    if (nx > 0) nx = nx / 4; // oltre il bordo: si oppone
    if (nx < -width) nx = -width + (nx + width) / 3;
    setX(nx);
  };
  const onUp = (e) => {
    const s = g.current;
    if (!s || s.x0 == null) return;
    const wasH = s.dir === "h";
    s.x0 = null;
    setDrag(false);
    if (!wasH) return;
    const open = xRef.current < -width * 0.4;
    setX(open ? -width : 0);
    setAsk(null);
    if (open) window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: me.current }));
    s.justSwiped = Date.now();
    if (e && e.cancelable) e.preventDefault();
  };
  // dopo uno scorrimento il tocco non deve aprire la riga; a riga aperta il tocco la richiude
  const onClickCapture = (e) => {
    const s = g.current;
    if ((s && s.justSwiped && Date.now() - s.justSwiped < 350) || xRef.current !== 0) {
      e.stopPropagation();
      e.preventDefault();
      if (xRef.current !== 0 && !(s && s.justSwiped && Date.now() - s.justSwiped < 350)) close();
    }
  };
  const run = (a, i) => {
    if (a.confirm && ask !== i) return setAsk(i);
    close();
    a.onClick();
  };

  return (
    <div
      ref={(el) => {
        g.current = { ...(g.current || {}), el };
      }}
      className={`relative overflow-hidden ${rounded} ${className}`}
      data-swipe-row={id || ""}
      data-swipe-open={x !== 0 ? "1" : "0"}
    >
      {/* pulsanti sotto la riga, a destra */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width, visibility: x === 0 && !drag ? "hidden" : "visible" }} aria-hidden={x === 0}>
        {acts.map((a, i) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              type="button"
              tabIndex={x === 0 ? -1 : 0}
              data-swipe-action={a.id || a.label}
              onClick={() => run(a, i)}
              className={`h-full flex flex-col items-center justify-center gap-1 text-xs font-bold ${TONES[a.tone] || TONES.slate}`}
              style={{ width: BTN }}
            >
              {Icon && <Icon className="w-5 h-5" />}
              {ask === i ? "Sicuro?" : a.label}
            </button>
          );
        })}
      </div>
      {/* la riga vera, che scorre */}
      <div
        className="relative"
        style={{
          transform: `translateX(${x}px)`,
          transition: drag ? "none" : "transform 220ms cubic-bezier(.2,.8,.2,1)",
          touchAction: "pan-y",
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClickCapture={onClickCapture}
      >
        {children}
      </div>
    </div>
  );
};
