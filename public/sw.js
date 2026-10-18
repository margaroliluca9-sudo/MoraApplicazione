// SERVICE WORKER DELL'APP: serve SOLO per le notifiche della bacheca.
// Non memorizza pagine (così l'app è sempre l'ultima versione pubblicata).
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // tolgo eventuali memorie vecchie
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
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
    self.registration.showNotification(data.title || "Bacheca Mora", {
      body: data.body || "",
      tag: data.tag || "bacheca",
      renotify: true,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/?bacheca=1" },
    })
  );
});

// tocco sulla notifica: apro l'app sulla bacheca
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/?bacheca=1";
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        if ("focus" in w) {
          w.postMessage({ type: "open-board" });
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    })()
  );
});
