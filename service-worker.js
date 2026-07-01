const CACHE_NAME = "talent-bible-school-v20260702-01";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./2026-06-29-auth.css",
  "./2026-06-29-app.js",
  "./2026-06-30-teacher-match-patch.js",
  "./2026-06-30-weekly-bible-patch.js",
  "./2026-06-30-home-announcements-patch.js",
  "./2026-06-30-role-access-patch.js",
  "./2026-07-02-stories-patch.js",
  "./manifest.json",
  "./assets/2026-06-30-deulsaram-header-logo.png",
  "./assets/icons/deulsaram-app-icon-192.png",
  "./assets/icons/deulsaram-app-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
