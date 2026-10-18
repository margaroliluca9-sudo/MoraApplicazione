// SERVICE WORKER DELL'APP: serve SOLO per le notifiche della chat.
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
