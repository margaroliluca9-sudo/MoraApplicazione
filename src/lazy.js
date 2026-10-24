// PARTI CARICATE SOLO QUANDO SERVONO (gioco, Admin, Ufficio, Esplora database, Guida)
// L'app si apre più in fretta: queste parti si scaricano dopo, quando le apri
// (e comunque pochi secondi dopo l'apertura, in sottofondo, così ci sono anche senza rete).
import React, { Suspense } from "react";

const RELOADED = "mora_lazy_reload";

// se dopo un aggiornamento il pezzo vecchio non c'è più, ricarico la pagina una volta sola
const withRetry = (loader) => () =>
  loader()
    .then((m) => {
      lazyOk();
      return m;
    })
    .catch((err) => {
      try {
        if (sessionStorage.getItem(RELOADED) !== "1" && navigator.onLine !== false) {
          sessionStorage.setItem(RELOADED, "1");
          window.location.reload();
          return new Promise(() => {}); // la pagina si sta ricaricando
        }
      } catch (e) {
        // niente
      }
      throw err;
    });

const loaders = [];
// lazyNamed(() => import("./views/AdminPanel"), "AdminPanel") → componente pronto da usare
// fallback: cosa mostrare mentre arriva (di solito la ruota che gira)
export const lazyNamed = (loader, name, fallback = null) => {
  const load = withRetry(loader);
  loaders.push(loader); // in sottofondo: senza ricaricare la pagina se qualcosa va storto
  const Lazy = React.lazy(() => load().then((m) => ({ default: m[name] })));
  const Wrapped = (props) => (
    <Suspense fallback={fallback || <LazyWait />}>
      <Lazy {...props} />
    </Suspense>
  );
  Wrapped.displayName = name;
  return Wrapped;
};

// ruota che gira mentre arriva il pezzo (di solito una frazione di secondo)
export const LazyWait = () => (
  <div className="w-full py-16 flex items-center justify-center" data-lazy-wait>
    <span className="w-9 h-9 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
  </div>
);

// dopo l'apertura, con calma: scarico tutto in sottofondo (poi resta sul telefono)
export const preloadLazy = (delay = 4000) => {
  const run = () => loaders.forEach((l) => l().catch(() => {}));
  const t = setTimeout(() => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 5000 });
    else run();
  }, delay);
  return () => clearTimeout(t);
};

// pagina aperta bene: la prossima volta si può ricaricare di nuovo se serve
export const lazyOk = () => {
  try {
    sessionStorage.removeItem(RELOADED);
  } catch (e) {
    // niente
  }
};
