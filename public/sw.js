// SERVICE WORKER DELL'APP
//  1) SENZA RETE: tiene una copia dell'app sul telefono, così si apre anche in un capannone senza
//     internet e mostra i dati già salvati (La mia area, interventi, clienti: li tiene Firebase).
//     L'app si apre SUBITO dalla copia (veloce anche con poco campo) e intanto scarica la versione nuova:
//     la volta dopo è già quella (nessun avviso).
//  2) Notifiche della chat e dei promemoria.
const SHELL = "mora-offline-v2";
const CDN_HOSTS = ["cdn.tailwindcss.com", "fonts.googleapis.com", "fonts.gstatic.com"];

const putSafe = async (key, res) => {
  try {
    if (res && (res.ok || res.type === "opaque")) {
      const c = await caches.open(SHELL);
      await c.put(key, res);
    }
  } catch (e) {
    // spazio pieno o risposta non salvabile: pazienza
  }
};

// all'installazione salvo subito la pagina e i file che usa (grafica compresa)
const precache = async () => {
  const res = await fetch("/", { cache: "no-store" });
  const html = await res.clone().text();
  await putSafe("/", res);
  const urls = new Set(["/manifest.json", "/icons/icon-192.png", "https://cdn.tailwindcss.com", "/manuali/donati-dmk-gancio-fig77.png", "/manuali/donati-dmk-catena.png", "/manuali/fas-kf-gancio.png", "/manuali/fas-kf-catena.png", "/manuali/kito-kq-gancio-occhiello.png", "/manuali/kito-kq-catena-5maglie.png", "/manuali/kito-kq-catena-diametro.png"]);
  const re = /(?:src|href)="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const u = m[1];
    if (u.startsWith("/") && !u.startsWith("//")) urls.add(u);
    else if (CDN_HOSTS.some((h) => u.startsWith("https://" + h))) urls.add(u);
  }
  await Promise.all(
    [...urls].map(async (u) => {
      try {
        const own = u.startsWith("/");
        const r = await fetch(own ? u : new Request(u, { mode: "no-cors" }), own ? { cache: "no-store" } : undefined);
        await putSafe(u, r);
      } catch (e) {
        // senza rete o file mancante: lo salverò la prossima volta
      }
    })
  );
};

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(precache().catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // tolgo le memorie vecchie (tengo solo quella attuale)
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// la pagina: SUBITO la copia salvata sul telefono (l'app si apre all'istante, anche con poco campo) e intanto
// scarico dal sito la versione nuova per la volta dopo. Con ?aggiorna=… (vecchi collegamenti) prima la rete.
const fromNetwork = (request) =>
  fetch(request).then((res) => {
    if (res && res.ok) putSafe("/", res.clone());
    return res;
  });
const openPage = async (event) => {
  const request = event.request;
  const fresh = new URL(request.url).searchParams.has("aggiorna");
  const cached = await caches.match("/");
  if (cached && !fresh) {
    event.waitUntil(fromNetwork(request).catch(() => null));
    return cached;
  }
  try {
    const res = await fromNetwork(request);
    if (res) return res;
  } catch (e) {
    // senza rete
  }
  if (cached) return cached;
  return fetch(request); // mai aperta prima: errore normale del browser
};

// file (programma, grafica, caratteri, icone): la copia subito se c'è, e intanto la aggiorno
const fileFirst = async (request) => {
  const cached = await caches.match(request);
  const fresh = fetch(request)
    .then((res) => {
      putSafe(request, res.clone());
      return res;
    })
    .catch(() => null);
  if (cached) return cached;
  const res = await fresh;
  return res || Response.error();
};

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const own = url.origin === self.location.origin;
  if (own && url.pathname.startsWith("/api/")) return; // notifiche, promemoria: sempre in rete
  if (own && url.searchParams.has("__ver")) return; // vecchio controllo della versione: sempre in rete, mai salvato
  if (own && url.pathname.startsWith("/guida/")) return; // video della Guida: direttamente dal sito (pesano e vanno a pezzi)
  if (req.mode === "navigate" && own) {
    event.respondWith(openPage(event));
    return;
  }
  if (own || CDN_HOSTS.includes(url.hostname)) {
    // il programma cambia nome a ogni pubblicazione: i file vecchi non si confondono con i nuovi
    event.respondWith(fileFirst(req));
  }
  // tutto il resto (Firebase, ecc.) passa normale: i dati senza rete li gestisce Firebase
});

// arriva una notifica dal "postino" (/api/notify)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Chat Mora", {
      body: data.body || "",
      tag: data.tag || "chat",
      renotify: true,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/?chat=group" },
    })
  );
});

// tocco sulla notifica: apro l'app sulla conversazione
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/?chat=group";
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if ("focus" in w) {
          w.postMessage({ type: "open-chat", url });
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
