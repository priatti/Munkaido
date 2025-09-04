// Egyszerű app-shell cache PWA-hoz – v9.11
// Cache bump, hogy biztos frissüljön SW-csere után
const CACHE_NAME = 'munkaido-v9.11.6';

// A SW a /Munkaido/proba/ alól fut; relatív hivatkozásokkal vegyük fel.
// Csak a biztosan meglévő fájlokat listázzuk.
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.webmanifest',
  './splash.png'
  // Ikonok opcionálisak a cache-ben; felveheted később is:
  // './icons/icon-192.png',
  // './icons/icon-512.png',
  // './icons/maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Cache-first; HTML kéréseknél offline fallback az indexre
self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((res) => {
        const url = new URL(req.url);
        if (url.origin === self.location.origin && req.method === 'GET') {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
        }
        return res;
      }).catch(() => {
        if (req.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});
