const CACHE_NAME = "suhas-remember-rocket-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./assets/header-suhas-remember-rocket-wide-960.png",
  "./assets/header-suhas-remember-rocket-wide-1600.png",
  "./assets/header-suhas-remember-rocket-wide.png",
  "./assets/memory-pad-icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener("push", (event) => {
  let payload = { title: "Suhas Remember Rocket", body: "Time to remember something!" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // keep default payload
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "./assets/memory-pad-icon.svg",
      badge: "./assets/memory-pad-icon.svg",
      vibrate: [200, 100, 200],
      tag: payload.tag || "memory-reminder",
      renotify: true,
      data: { url: "./" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((client) => client.url.includes(self.registration.scope));
      if (existing) return existing.focus();
      return clients.openWindow(targetUrl);
    })
  );
});
