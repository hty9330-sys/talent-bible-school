const CACHE_NAME = "talent-bible-school-v20260706-08";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./2026-06-29-auth.css",
  "./2026-07-02-ux-safety.css",
  "./2026-07-05-award-scroll-patch.css",
  "./2026-06-29-app.js",
  "./2026-07-05-bible-glossary-patch.js",
  "./2026-07-05-award-scroll-patch.js",
  "./2026-06-30-teacher-match-patch.js",
  "./2026-06-30-weekly-bible-patch.js",
  "./2026-06-30-home-announcements-patch.js",
  "./2026-06-30-role-access-patch.js",
  "./2026-07-02-stories-patch.js",
  "./2026-07-02-ux-safety-patch-v2.js",
  "./2026-07-06-admin-stats-patch.js",
  "./2026-07-06-student-stats-patch.js",
  "./2026-07-06-push-patch.js",
  "./manifest.json",
  "./assets/2026-06-30-deulsaram-header-logo.png",
  "./assets/icons/deulsaram-app-icon-192-v2.png",
  "./assets/icons/deulsaram-app-icon-512-v2.png"
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


self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (error) { data = {}; }
  const title = data.title || "달란트 성경학교";
  const options = {
    body: data.body || "",
    icon: "./assets/icons/deulsaram-app-icon-192-v2.png",
    badge: "./assets/icons/deulsaram-app-icon-192-v2.png",
    data: { url: data.url || "./" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes("talent-bible-school") && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
