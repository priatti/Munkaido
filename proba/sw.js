// Egyszerű app-shell cache PWA-hoz – v9.11
// A cache név bump-olva, hogy biztos frissüljön.
const CACHE_NAME = 'munkaido-v9.11.1';

const APP_SHELL = [
  './',
  './index.htm',                 // <- ha index.html a neve, ezt is írd át!
  './style.css',
  './script.js',
  './manifest.webmanifest',
  './splash.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];

// Telepítés – cache feltöltése
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Aktiválás – régi cache-ek törlése
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

// Hálózati stratégia: cache-first, majd hálózat, offline HTML fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((res) => {
        // Csak GET és saját origin
        const url = new URL(req.url);
        if (url.origin === self.location.origin && req.method === 'GET') {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return res;
      }).catch(() => {
        // Offline fallback HTML kérésekre
        if (req.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.htm');
        }
      });
    })
  );
});
