// Service Worker MBOA BIO 237 - cache offline-first
const CACHE_NAME = "mboa-bio-v12";
const ASSETS = [
  "/",
  "/connexion",
  "/consommateur",
  "/rejoindre",
  "/manifest.json",
  "/logo-mboa.jpeg",
  "/icon-192.png",
  "/icon-512.png",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Navigation : network-first, fallback cache
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("/offline.html")),
      ),
    );
    return;
  }
  // Static assets : cache-first — uniquement les ressources same-origin.
  // Les appels API (Supabase, etc.) ne doivent JAMAIS être mis en cache :
  // sinon le SW sert des données périmées et les écritures semblent perdues.
  if (event.request.method === "GET") {
    const memeOrigine = new URL(event.request.url).origin === self.location.origin;
    if (!memeOrigine) return; // laisse le navigateur gérer les requêtes externes
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        }).catch(() => cached);
      }),
    );
  }
});
