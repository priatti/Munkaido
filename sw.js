const CACHE_NAME = 'munkaido-pro-cache-v1';
const urlsToCache = [
  '/',
  'index.html',
  'script.js',
  'style.css',
  'splash.jpg',
  'icon-192x192.png',
  'icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Telepítés: a gyorsítótár megnyitása és a fájlok hozzáadása
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch esemény: válasz a gyorsítótárból vagy hálózatról
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Ha a válasz a gyorsítótárban van, adjuk vissza azt
        if (response) {
          return response;
        }
        // Különben kérjük le a hálózatról
        return fetch(event.request);
      }
    )
  );
});

// Aktiválás: régi gyorsítótárak törlése
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
