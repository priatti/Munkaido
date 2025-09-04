// Egyszerű app-shell cache PWA-hoz – v9.11
const CACHE_NAME = 'munkaido-v9.11';
const APP_SHELL = [
  './',
  './index.html',       // ha átnevezed index.htm-re, ezt is írd át!
  './style.css',
  './script.js',
  './manifest.webmanifest',
  './splash.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
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

// Hálózati stratégia: cache-first, hálózati visszaeséssel
self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const url = new URL(req.url);
        // csak saját eredetünket cache-eljük
        if (url.origin === self.location.origin && req.method === 'GET') {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        }
        return res;
      }).catch(() => {
        // Offline fallback (egyszerű): ha a kérés HTML, adjuk az app kezdőt
        if (req.headers.get('accept')?.includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});