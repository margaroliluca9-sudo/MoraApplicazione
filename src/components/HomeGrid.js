// Riquadri della Home: normali e in "Modifica aspetto" (modelli di grafica, sposta, grandezza, colore, nascondi, aggiungi).
import React, { useEffect, useRef, useState } from "react";
import { GripVertical, X, Plus, Pencil, ChevronLeft, ChevronRight, EyeOff, RotateCcw, Check } from "lucide-react";
import {
  SIZES,
  COLORS,
  COLOR_NAMES,
  sizesFor,
  defaultSize,
  isWidget,
  moveTo,
  moveBy,
  savePrefs,
  resetPrefs,
} from "../home";
import { describeError } from "../utils";
import { Sheet, PrimaryBtn, GhostBtn } from "./personal/PersonalUi";
import { LookEditor } from "./LookEditor";

const tone = (c, theme) => (c === "auto" ? theme : c);
// riquadri che "ballano" in modifica, come sull'iPhone (niente animazione se il telefono la riduce)
const WIGGLE_CSS = `
@keyframes moraWiggle { 0% { transform: rotate(-0.7deg); } 50% { transform: rotate(0.7deg); } 100% { transform: rotate(-0.7deg); } }
.mora-wiggle { animation: moraWiggle 0.3s ease-in-out infinite; }
.mora-wiggle:nth-child(2n) { animation-delay: -0.15s; }
.mora-press { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
@media (prefers-reduced-motion: reduce) { .mora-wiggle { animation: none; } }
`;

// un riquadro (in base alla grandezza)
const Tile = ({ item, size, color, compact, editing, dragging, onClick, onHide, handleProps, pressProps }) => {
  const Icon = item.icon;
  const span = size === "l" ? "col-span-2" : "col-span-1";
  const pad = compact ? "p-3" : size === "s" ? "p-3" : "p-5";
  const ring = editing ? "outline outline-2 outline-dashed outline-offset-2 outline-slate-300" : "";
  const drag = dragging ? "scale-105 shadow-2xl z-20 opacity-90" : "";
  const tp = { "data-home-tile": item.id, "data-tile": item.id, "data-size": size, onClick, ...pressProps };
  const iconBox = `bg-${color}-50 text-${color}-600`;
  const badge = !editing && item.badge > 0 && (
    <span data-badge className="absolute top-2.5 right-2.5 min-w-[24px] h-6 px-1.5 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center shadow">
      {item.badge > 99 ? "99+" : item.badge}
    </span>
  );
  const editBits = editing && (
    <>
      <span
        {...handleProps}
        aria-label={"Sposta " + item.label}
        role="button"
        className="absolute top-1.5 left-1.5 w-9 h-9 rounded-full bg-white/90 border border-slate-200 text-slate-500 flex items-center justify-center shadow-sm cursor-grab"
        style={{ touchAction: "none" }}
      >
        <GripVertical className="w-4 h-4" />
      </span>
      {item.id !== "new" && (
        <span
          role="button"
          aria-label={"Nascondi " + item.label}
          onClick={(e) => {
            e.stopPropagation();
            onHide();
          }}
          className="absolute top-1.5 right-1.5 w-9 h-9 rounded-full bg-white/90 border border-slate-200 text-slate-500 flex items-center justify-center shadow-sm"
        >
          <X className="w-4 h-4" />
        </span>
      )}
    </>
  );
  const common = `relative ${span} rounded-3xl transition-all mora-press ${editing && !dragging ? "mora-wiggle" : "active:scale-[0.98]"} ${ring} ${drag}`;

  // NUOVO RAPPORTO: colorato pieno
  if (item.primary)
    return (
      <button type="button" {...tp}
        className={`${common} ${pad} bg-${color}-600 hover:bg-${color}-700 text-white shadow-lg flex ${size === "l" ? "flex-col md:flex-row py-7" : "flex-col"} items-center justify-center gap-3`}>
        {editBits}
        <span className="p-3 bg-white/20 rounded-full"><Icon className={size === "l" ? "w-9 h-9" : "w-7 h-7"} /></span>
        <span className="text-center">
          <span className={`block font-black uppercase tracking-tight ${size === "l" ? "text-2xl" : "text-base"}`}>{item.label}</span>
          {size === "l" && <span className={`block text-${color}-100 font-medium mt-1 text-sm`}>{item.desc}</span>}
        </span>
      </button>
    );

  // riquadri informativi
  if (item.widget)
    return (
      <button type="button" {...tp}
        className={`${common} ${pad} text-left bg-white border border-slate-200 shadow-sm flex flex-col gap-2 min-h-[120px]`}>
        {editBits}
        <span className={`flex items-center gap-2 ${editing ? "pl-9" : ""}`}>
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBox}`}><Icon className="w-4 h-4" /></span>
          <span className="font-black text-slate-800 uppercase text-sm tracking-tight">{item.label}</span>
        </span>
        <span className="block w-full">{item.widget(size)}</span>
      </button>
    );

  if (size === "s")
    return (
      <button type="button" {...tp}
        className={`${common} ${pad} bg-white border border-slate-200 shadow-sm flex items-center gap-2.5 text-left min-h-[64px] ${editing || item.badge > 0 ? "pr-10" : ""}`}>
        {editBits}
        {badge}
        <span className={`p-2 rounded-xl shrink-0 ${iconBox} ${editing ? "ml-8" : ""}`}><Icon className="w-5 h-5" /></span>
        <span className="font-black text-slate-800 text-[15px] leading-tight min-w-0">{item.label}</span>
      </button>
    );

  if (size === "l")
    return (
      <button type="button" {...tp}
        className={`${common} ${pad} bg-white border border-slate-200 shadow-sm flex items-center gap-4 text-left`}>
        {editBits}
        {badge}
        <span className={`p-4 rounded-2xl shrink-0 ${iconBox} ${editing ? "ml-8" : ""}`}><Icon className="w-8 h-8" /></span>
        <span className="min-w-0">
          <span className="block text-lg font-black text-slate-800 uppercase tracking-tight">{item.label}</span>
          <span className="block text-sm text-slate-500 mt-0.5">{item.desc}</span>
        </span>
      </button>
    );

  return (
    <button type="button" {...tp}
      className={`${common} ${pad} bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3 text-center`}>
      {editBits}
      {badge}
      <span className={`p-4 rounded-2xl ${iconBox}`}><Icon className="w-8 h-8" /></span>
      <span>
        <span className="block text-base font-black text-slate-800 uppercase tracking-tight">{item.label}</span>
        <span className="block text-xs text-slate-500 mt-1">{item.desc}</span>
      </span>
    </button>
  );
};

const Toggle = ({ label, sub, on, onChange, id }) => (
  <button type="button" data-option={id} onClick={() => onChange(!on)} aria-pressed={on} className="w-full flex items-center gap-3 text-left py-2 min-h-[48px]">
    <span className="flex-1">
      <span className="block font-bold text-slate-800">{label}</span>
      {sub && <span className="block text-xs text-slate-500">{sub}</span>}
    </span>
    <span className={`w-12 h-7 rounded-full p-1 transition-colors ${on ? "bg-blue-600" : "bg-slate-300"}`}>
      <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
    </span>
  </button>
);

export const HomeGrid = ({ items, home, me, color = "blue", searchBox, onEditingChange = () => {}, onSaved = () => {}, footer = null, onPreviewLook = () => {}, baseLook = {}, editable = true }) => {
  const [draft, setDraft] = useState(null); // copia in modifica
  const [sel, setSel] = useState(null); // riquadro scelto (foglio opzioni)
  const [adding, setAdding] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const editing = !!draft;
  const h = draft || home;
  // dalla Guida: "Modifica la Home" (startRef = ultima versione di start)
  const startRef = useRef(null);
  useEffect(() => {
    const on = () => {
      if (startRef.current) startRef.current();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("mora-edit-home", on);
    return () => window.removeEventListener("mora-edit-home", on);
  }, []);

  const start = () => {
    setDraft({ ...home, order: [...home.order], hidden: [...home.hidden], sizes: { ...home.sizes }, colors: { ...home.colors } });
    setError("");
    onEditingChange(true);
    onPreviewLook(home.look, "start");
  };
  // aspetto: si vede subito su tutta l'app
  const setLook = (look) => {
    setDraft((d) => ({ ...d, look }));
    onPreviewLook(look, "change");
  };
  startRef.current = start;
  const stop = (phase = "cancel") => {
    onPreviewLook(undefined, phase);
    setDraft(null);
    setSel(null);
    setAdding(false);
    onEditingChange(false);
  };
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const hide = (id) => setDraft((d) => ({ ...d, order: d.order.filter((x) => x !== id), hidden: [...d.hidden, id] }));
  const add = (id) =>
    setDraft((d) => ({
      ...d,
      order: [...d.order, id],
      hidden: d.hidden.filter((x) => x !== id),
      sizes: { ...d.sizes, [id]: d.sizes[id] || defaultSize(id) },
      colors: { ...d.colors, [id]: d.colors[id] || "auto" },
    }));
  const save = async () => {
    setBusy(true);
    try {
      onSaved(await savePrefs(me, draft));
      stop("save");
    } catch (e) {
      setError("Non salvata: " + describeError(e));
    }
    setBusy(false);
  };
  const reset = async () => {
    setBusy(true);
    try {
      await resetPrefs(me);
      onSaved(null);
      stop("save");
    } catch (e) {
      setError("Non ripristinata: " + describeError(e));
    }
    setBusy(false);
  };

  // TIENI PREMUTO (come sull'iPhone): dopo mezzo secondo la Home entra in modifica
  // e, senza staccare il dito, il riquadro si trascina. In modifica si trascina subito.
  const press = useRef(null); // { id, x, y, timer }
  const dragRef = useRef(null);
  const suppressClick = useRef(false);
  const gridRef = useRef(null);
  const lastSwap = useRef({ target: null, at: 0 }); // contro i "rimbalzi" tra due riquadri
  const capture = (el, pointerId) => {
    try {
      if (el && pointerId != null) el.setPointerCapture(pointerId);
    } catch (err) {
      // niente
    }
  };
  const beginDrag = (id, el, pointerId) => {
    lastSwap.current = { target: null, at: 0 };
    dragRef.current = id;
    setDragId(id);
    suppressClick.current = true;
    capture(el, pointerId);
  };
  const endPress = () => {
    if (press.current && press.current.timer) clearTimeout(press.current.timer);
    press.current = null;
    dragRef.current = null;
    setDragId(null);
  };
  const dragOver = (id, e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const t = el && el.closest("[data-home-tile]");
    const target = t && t.getAttribute("data-home-tile");
    if (!target || target === id) return;
    // appena scambiato con questo riquadro: aspetto che il dito si sposti davvero
    const now = Date.now();
    if (lastSwap.current.target === target && now - lastSwap.current.at < 400) return;
    lastSwap.current = { target, at: now };
    setDraft((d) => (d ? { ...d, order: moveTo(d.order, id, target) } : d));
  };
  // durante il trascinamento la pagina non deve scorrere
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return undefined;
    const stopScroll = (e) => {
      if (dragRef.current) e.preventDefault();
    };
    el.addEventListener("touchmove", stopScroll, { passive: false });
    return () => el.removeEventListener("touchmove", stopScroll);
  }, []);
  const pressProps = (id) => ({
    onPointerDown: (e) => {
      if (e.button) return;
      suppressClick.current = false;
      const el = e.currentTarget;
      const pointerId = e.pointerId;
      press.current = { id, x: e.clientX, y: e.clientY, timer: null };
      if (!editing && editable)
        press.current.timer = setTimeout(() => {
          if (!press.current || press.current.id !== id) return;
          start();
          if (navigator.vibrate) navigator.vibrate(15);
          beginDrag(id, el, pointerId);
        }, 500);
    },
    onPointerMove: (e) => {
      const pr = press.current;
      if (!pr || pr.id !== id) return;
      const moved = Math.hypot(e.clientX - pr.x, e.clientY - pr.y);
      if (!dragRef.current) {
        if (!editing && moved > 10 && pr.timer) {
          clearTimeout(pr.timer); // sta scorrendo la pagina: niente modifica e niente apertura
          press.current = null;
          suppressClick.current = true;
        } else if (editing && moved > 8) beginDrag(id, e.currentTarget, e.pointerId);
        return;
      }
      if (dragRef.current === id) dragOver(id, e);
    },
    onPointerUp: endPress,
    onPointerCancel: endPress,
    onContextMenu: (e) => e.preventDefault(),
    onClickCapture: (e) => {
      if (suppressClick.current) {
        suppressClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      }
    },
  });
  // maniglia ⠿ (in modifica): trascina subito
  const handleProps = (id) => ({
    onPointerDown: (e) => {
      e.preventDefault();
      e.stopPropagation();
      press.current = { id, x: e.clientX, y: e.clientY, timer: null };
      beginDrag(id, e.currentTarget, e.pointerId);
    },
    onPointerMove: (e) => {
      if (dragRef.current === id) dragOver(id, e);
    },
    onPointerUp: endPress,
    onPointerCancel: endPress,
    onClick: (e) => e.stopPropagation(),
  });

  const it = sel && items[sel];
  const gap = h.compact ? "gap-2.5" : "gap-4";

  return (
    <div className="space-y-4" data-section="home-grid">
      {/* la ricerca resta al suo posto: entrando in modifica i riquadri non si spostano sotto il dito */}
      {h.search && searchBox}
      {editing && (
        <div className="fixed top-0 inset-x-0 z-[60] px-3 pt-3 pb-3 bg-white border-b border-slate-200 shadow-lg space-y-2" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }} data-section="home-edit-bar">
          <div className="max-w-3xl mx-auto space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-slate-800 text-lg leading-tight">Modifica aspetto</h3>
              <p className="text-xs font-bold text-slate-500">Vale solo per te</p>
            </div>
            <button type="button" onClick={() => stop("cancel")} className="h-10 px-3 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm">Annulla</button>
            <button type="button" data-action="home-done" onClick={save} disabled={busy} className={`h-10 px-4 rounded-xl bg-${color}-600 text-white font-black text-sm flex items-center gap-1.5 disabled:opacity-50`}>
              <Check className="w-4 h-4" /> Fatto
            </button>
          </div>
          <p className="text-xs text-slate-600 font-semibold">Trascina i riquadri per spostarli, toccali per grandezza e colore, × per nasconderli. Più sotto: modelli di grafica e opzioni.</p>
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
          </div>
        </div>
      )}

      <style>{WIGGLE_CSS}</style>
      <div ref={gridRef} className={`grid grid-cols-2 md:grid-cols-4 ${gap}`} data-section="home-tiles">
        {h.order.map((id) => {
          const item = items[id];
          if (!item) return null;
          return (
            <Tile
              key={id}
              item={item}
              size={h.sizes[id] || defaultSize(id)}
              color={tone(h.colors[id] || "auto", color)}
              compact={h.compact}
              editing={editing}
              dragging={dragId === id}
              onClick={editing ? () => setSel(id) : item.action}
              onHide={() => hide(id)}
              handleProps={handleProps(id)}
              pressProps={pressProps(id)}
            />
          );
        })}
        {editing && (
          <button type="button" data-action="home-add" onClick={() => setAdding(true)}
            className="col-span-2 md:col-span-1 min-h-[72px] rounded-3xl border-2 border-dashed border-slate-300 text-slate-600 font-black flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" /> Aggiungi riquadro{h.hidden.length ? ` (${h.hidden.length})` : ""}
          </button>
        )}
      </div>

      {editing && <LookEditor look={draft.look} base={baseLook} onChange={setLook} />}

      {editing ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-4 space-y-1" data-section="home-options">
          <h4 className="font-black text-slate-800 uppercase text-sm tracking-wide pb-1">Opzioni</h4>
          <Toggle id="search" label="Barra di ricerca" sub="In alto nella Home" on={draft.search} onChange={(v) => set({ search: v })} />
          <Toggle id="compact" label="Riquadri compatti" sub="Più riquadri nello schermo" on={draft.compact} onChange={(v) => set({ compact: v })} />
          <button type="button" data-action="home-reset" onClick={reset} disabled={busy} className="w-full flex items-center gap-2 py-3 text-slate-600 font-bold">
            <RotateCcw className="w-4 h-4" /> Ripristina tutto come prima
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-2" data-section="home-footer">
          {editable && (
            <button type="button" data-action="home-edit" onClick={start} className="flex items-center gap-2 px-4 h-11 rounded-full text-sm font-bold text-slate-500 hover:bg-white">
              <Pencil className="w-4 h-4" /> Modifica aspetto
            </button>
          )}
          {footer}
        </div>
      )}

      {editing && it && (
        <Sheet title={it.label} section="tile-options" onClose={() => setSel(null)}
          footer={
            <>
              {sel !== "new" && (
                <GhostBtn danger onClick={() => { hide(sel); setSel(null); }}>
                  <span className="flex items-center gap-1.5"><EyeOff className="w-4 h-4" /> Nascondi</span>
                </GhostBtn>
              )}
              <PrimaryBtn color={color} onClick={() => setSel(null)}>Ok</PrimaryBtn>
            </>
          }>
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Grandezza</span>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Grandezza">
              {SIZES.map((s) => {
                const allowed = sizesFor(sel).includes(s.v);
                const on = draft.sizes[sel] === s.v;
                return (
                  <button key={s.v} type="button" data-size-option={s.v} disabled={!allowed} aria-pressed={on}
                    onClick={() => set({ sizes: { ...draft.sizes, [sel]: s.v } })}
                    className={`h-16 rounded-xl border-2 font-bold text-sm flex flex-col items-center justify-center gap-1 disabled:opacity-30 ${on ? `border-${color}-600 bg-${color}-50 text-${color}-700` : "border-slate-200 text-slate-600"}`}>
                    <span className={`block rounded bg-current opacity-40 ${s.v === "s" ? "w-5 h-2.5" : s.v === "m" ? "w-5 h-5" : "w-10 h-5"}`} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Colore</span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Colore">
              {COLORS.map((c) => {
                const on = (draft.colors[sel] || "auto") === c;
                const real = tone(c, color);
                return (
                  <button key={c} type="button" data-color-option={c} aria-pressed={on} aria-label={COLOR_NAMES[c]}
                    onClick={() => set({ colors: { ...draft.colors, [sel]: c } })}
                    className={`h-11 px-3 rounded-full border-2 flex items-center gap-2 text-sm font-bold ${on ? "border-slate-800 text-slate-800" : "border-slate-200 text-slate-600"}`}>
                    <span className={`w-5 h-5 rounded-full bg-${real}-500`} />
                    {COLOR_NAMES[c]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wide">Posizione</span>
            <div className="grid grid-cols-2 gap-2">
              <GhostBtn onClick={() => set({ order: moveBy(draft.order, sel, -1) })} disabled={draft.order.indexOf(sel) <= 0}>
                <span className="flex items-center justify-center gap-1"><ChevronLeft className="w-4 h-4" /> Prima</span>
              </GhostBtn>
              <GhostBtn onClick={() => set({ order: moveBy(draft.order, sel, 1) })} disabled={draft.order.indexOf(sel) >= draft.order.length - 1}>
                <span className="flex items-center justify-center gap-1">Dopo <ChevronRight className="w-4 h-4" /></span>
              </GhostBtn>
            </div>
          </div>
        </Sheet>
      )}

      {editing && adding && (
        <Sheet title="Aggiungi riquadro" section="tile-add" onClose={() => setAdding(false)}>
          {!draft.hidden.length && <p className="text-sm text-slate-500">Hai già tutti i riquadri in Home.</p>}
          {draft.hidden.map((id) => {
            const x = items[id];
            if (!x) return null;
            const Icon = x.icon;
            return (
              <div key={id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0" data-add={id}>
                <span className={`p-2.5 rounded-xl bg-${color}-50 text-${color}-600`}><Icon className="w-5 h-5" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-slate-800">{x.label}{isWidget(id) ? " · informativo" : ""}</span>
                  <span className="block text-xs text-slate-500">{x.about || x.desc}</span>
                </span>
                <button type="button" onClick={() => add(id)} className={`h-10 px-3 rounded-xl bg-${color}-600 text-white font-bold text-sm shrink-0`}>Aggiungi</button>
              </div>
            );
          })}
        </Sheet>
      )}
    </div>
  );
};
