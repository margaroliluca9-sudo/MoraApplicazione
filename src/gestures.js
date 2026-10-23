// GESTI COME SUGLI SMARTPHONE (Android e iPhone)
//  - scorri dal bordo sinistro verso destra = indietro (chiude la finestra aperta o torna alla Home)
//  - tasto / gesto «indietro» di Android = la stessa cosa (non esce dall'app finché c'è qualcosa da chiudere)
//  - tieni premuto un intervento nello Storico = menu con le sue azioni (stampa, modifica…)
//  - Home: tira giù dall'alto = ricarica
// (le finestre dal basso si chiudono tirandole giù: vedi Sheet in components/personal/PersonalUi.js;
//  le foto: scorri per cambiare, doppio tocco o due dita per ingrandire: PhotoViewerModal)

const visible = (el) => {
  if (!el || !el.getClientRects().length) return false;
  const s = getComputedStyle(el);
  return s.visibility !== "hidden" && s.display !== "none" && s.pointerEvents !== "none";
};
const BACK_SEL = '[aria-label="Indietro"], [data-gesture-back]';
const CLOSE_SEL = '[aria-label="Chiudi"], [title="Chiudi"], [aria-label="Chiudi foto"], [data-gesture-close]';

// indietro: la finestra più in alto (l'ultima aperta) → «Indietro» se c'è, altrimenti «Chiudi»;
// nessuna finestra → torna alla Home. Restituisce false se non c'è niente da fare (si è già in Home).
export const goBack = () => {
  const cands = [...document.querySelectorAll(`${BACK_SEL}, ${CLOSE_SEL}`)].filter(visible);
  if (cands.length) {
    // raggruppo per finestra (il contenitore "fixed" più vicino); vince l'ultima nella pagina
    const groups = new Map();
    cands.forEach((b) => {
      let p = b.parentElement;
      while (p && p !== document.body && getComputedStyle(p).position !== "fixed") p = p.parentElement;
      const g = p || document.body;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g).push(b);
    });
    const tops = [...groups.keys()].filter((g) => g !== document.body);
    if (tops.length) {
      tops.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      const list = groups.get(tops[tops.length - 1]);
      const btn = list.find((b) => b.matches(BACK_SEL)) || list[list.length - 1];
      btn.click();
      return true;
    }
  }
  const ev = new CustomEvent("mora-go-home", { cancelable: true });
  window.dispatchEvent(ev);
  return ev.defaultPrevented;
};

const buzz = (ms = 10) => {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {
    // niente
  }
};

// freccia che segue il dito (indietro) e rotellina (ricarica)
const makeHint = () => {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText =
    "position:fixed;z-index:9000;width:44px;height:44px;border-radius:22px;background:rgba(15,23,42,.82);color:#fff;display:flex;align-items:center;justify-content:center;font:900 26px/1 sans-serif;pointer-events:none;opacity:0;transition:opacity .15s;box-shadow:0 6px 18px rgba(0,0,0,.25)";
  document.body.appendChild(el);
  return el;
};

export const installGestures = () => {
  if (typeof window === "undefined" || window.__moraGestures) return () => {};
  window.__moraGestures = true;
  const hint = makeHint();
  let t = null; // tocco in corso

  const onStart = (e) => {
    if (e.touches.length !== 1) {
      t = null;
      return;
    }
    const p = e.touches[0];
    const edge = p.clientX <= 26;
    const atTop = window.scrollY <= 0 && !!document.querySelector('[data-section="home-grid"]') && ![...document.querySelectorAll(".fixed.inset-0")].some(visible);
    t = { x0: p.clientX, y0: p.clientY, edge, pull: atTop && !edge, dx: 0, dy: 0, mode: null };
  };
  const onMove = (e) => {
    if (!t) return;
    const p = e.touches[0];
    t.dx = p.clientX - t.x0;
    t.dy = p.clientY - t.y0;
    if (!t.mode) {
      if (t.edge && t.dx > 12 && Math.abs(t.dx) > Math.abs(t.dy) * 1.3) t.mode = "back";
      else if (t.pull && t.dy > 14 && Math.abs(t.dy) > Math.abs(t.dx) * 1.5 && window.scrollY <= 0) t.mode = "pull";
      else if (Math.abs(t.dx) > 14 || Math.abs(t.dy) > 14) {
        t = null;
        return;
      }
    }
    if (t.mode === "back") {
      const k = Math.min(1, t.dx / 90);
      hint.textContent = "‹";
      hint.style.left = `${Math.min(80, t.dx * 0.6) - 10}px`;
      hint.style.top = `${p.clientY - 22}px`;
      hint.style.opacity = String(k);
      hint.style.background = k >= 1 ? "rgba(37,99,235,.95)" : "rgba(15,23,42,.82)";
      if (e.cancelable) e.preventDefault();
    } else if (t.mode === "pull") {
      const k = Math.min(1, t.dy / 110);
      hint.textContent = "↻";
      hint.style.left = "calc(50% - 22px)";
      hint.style.top = `${Math.min(120, t.dy * 0.6) + 10}px`;
      hint.style.opacity = String(k);
      hint.style.transform = `rotate(${t.dy * 2}deg)`;
      hint.style.background = k >= 1 ? "rgba(37,99,235,.95)" : "rgba(15,23,42,.82)";
    }
  };
  const onEnd = () => {
    if (!t) return;
    const { mode, dx, dy } = t;
    t = null;
    hint.style.opacity = "0";
    hint.style.transform = "";
    if (mode === "back" && dx >= 90) {
      buzz();
      goBack();
    } else if (mode === "pull" && dy >= 110) {
      buzz();
      hint.style.opacity = "1";
      setTimeout(() => window.location.reload(), 150);
    }
  };
  document.addEventListener("touchstart", onStart, { passive: true });
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onEnd, { passive: true });
  document.addEventListener("touchcancel", onEnd, { passive: true });

  // INDIETRO DI ANDROID (e del browser): una "pagina" finta che riprendo ogni volta
  const arm = () => {
    try {
      window.history.pushState({ mora: 1 }, "");
    } catch (e) {
      // niente
    }
  };
  arm();
  const onPop = () => {
    if (goBack()) arm();
  };
  window.addEventListener("popstate", onPop);

  // TIENI PREMUTO un intervento: menu con i suoi pulsanti
  let lp = null;
  const cancelLp = () => {
    if (lp) clearTimeout(lp.timer);
    lp = null;
  };
  const onLpStart = (e) => {
    const card = e.target.closest && e.target.closest("[data-log-card]");
    if (!card || e.target.closest("button, a, input, textarea, select")) return;
    const p = e.touches ? e.touches[0] : e;
    lp = {
      x: p.clientX,
      y: p.clientY,
      timer: setTimeout(() => {
        const btns = [...card.querySelectorAll("button")].filter((b) => visible(b) && (b.getAttribute("aria-label") || b.title || b.textContent.trim()));
        lp = null;
        if (!btns.length) return;
        buzz(15);
        showMenu(card, btns, p.clientY);
      }, 550),
    };
  };
  const onLpMove = (e) => {
    if (!lp) return;
    const p = e.touches ? e.touches[0] : e;
    if (Math.abs(p.clientX - lp.x) > 10 || Math.abs(p.clientY - lp.y) > 10) cancelLp();
  };
  document.addEventListener("touchstart", onLpStart, { passive: true });
  document.addEventListener("touchmove", onLpMove, { passive: true });
  document.addEventListener("touchend", cancelLp, { passive: true });

  return () => {
    document.removeEventListener("touchstart", onStart);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
    document.removeEventListener("touchcancel", onEnd);
    window.removeEventListener("popstate", onPop);
    document.removeEventListener("touchstart", onLpStart);
    document.removeEventListener("touchmove", onLpMove);
    document.removeEventListener("touchend", cancelLp);
    hint.remove();
    window.__moraGestures = false;
  };
};

// menu del «tieni premuto»: elenco dei pulsanti della scheda
const label = (b) => (b.getAttribute("aria-label") || b.title || b.textContent || "").trim().replace(/\s+/g, " ");
export const showMenu = (card, btns, y) => {
  const old = document.getElementById("mora-lp-menu");
  if (old) old.remove();
  const wrap = document.createElement("div");
  wrap.id = "mora-lp-menu";
  wrap.setAttribute("data-section", "longpress-menu");
  wrap.style.cssText = "position:fixed;inset:0;z-index:9500;background:rgba(15,23,42,.35);backdrop-filter:blur(2px)";
  const box = document.createElement("div");
  const dark = document.documentElement.classList.contains("dark");
  box.style.cssText = `position:absolute;left:16px;right:16px;max-width:360px;margin:0 auto;top:${Math.max(70, Math.min(y, window.innerHeight - 60 - btns.length * 52))}px;background:${dark ? "#121b2c" : "#fff"};border-radius:18px;box-shadow:0 18px 40px rgba(0,0,0,.25);overflow:hidden`;
  btns.forEach((b, i) => {
    const it = document.createElement("button");
    it.type = "button";
    it.textContent = label(b);
    it.style.cssText = `display:block;width:100%;text-align:left;padding:15px 18px;font:700 16px/1.2 inherit;color:${dark ? "#e2e8f2" : "#1e293b"};background:none;border:0;${i ? `border-top:1px solid ${dark ? "#223049" : "#e2e8f0"};` : ""}`;
    it.onclick = (ev) => {
      ev.stopPropagation();
      wrap.remove();
      b.click();
    };
    box.appendChild(it);
  });
  wrap.appendChild(box);
  wrap.onclick = () => wrap.remove();
  document.body.appendChild(wrap);
};
