const CACHE_NAME = "stayfit-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/static/js/bundle.js",
  "/static/js/main.chunk.js",
  "/static/js/0.chunk.js",
  "/manifest.json"
];

// Install — cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Push notifications — show scheduled reminders
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "StayFit", {
      body: data.body || "Time to log your progress!",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "stayfit-reminder",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});

// Message handler — schedule local reminders via setTimeout relay
const reminderTimers = {};
self.addEventListener("message", (event) => {
  const { type, reminders } = event.data || {};
  if (type !== "SCHEDULE_REMINDERS") return;
  Object.values(reminderTimers).forEach(clearTimeout);
  (reminders || []).forEach(r => {
    const now = new Date();
    const [h, m] = r.time.split(":").map(Number);
    const target = new Date(now); target.setHours(h, m, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target - now;
    reminderTimers[r.label] = setTimeout(() => {
      self.registration.showNotification("StayFit Reminder", {
        body: r.label, icon: "/icon-192.png", tag: `stayfit-${r.label}`,
      });
    }, delay);
  });
});

// Fetch — serve from cache if offline
self.addEventListener("fetch", (event) => {
  // Skip non-GET and external requests (Firebase, AI APIs)
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Offline fallback — return cached index.html for navigation
        if (event.request.mode === "navigate") return caches.match("/index.html");
      });
    })
  );
});
