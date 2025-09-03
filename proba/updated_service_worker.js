// A gyorsítótár neve. Verziószámmal érdemes ellátni,
// hogy az alkalmazás frissítésekor a régi cache automatikusan cserélődjön.
const CACHE_NAME = 'munkaido-pro-cache-v9.01';

// Azok a fájlok, amiket mindenképp el akarunk érni internet nélkül is.
// Ez az alkalmazás "burka" (app shell).
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/js/main.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 1. Telepítési esemény: A fájlok letöltése és a gyorsítótárba helyezése
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Gyorsítótár megnyitva és fájlok hozzáadása.');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Aktiválási esemény: A régi, felesleges cache-ek törlése
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Régi gyorsítótár törlése:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Fetch esemény: A hálózati kérések elfogása
self.addEventListener('fetch', event => {
  event.respondWith(
    // Próbáljuk megkeresni a kérést a cache-ben
    caches.match(event.request)
      .then(response => {
        // Ha a kért erőforrás a cache-ben van, adjuk vissza onnan
        if (response) {
          return response;
        }
        // Ha nincs, akkor továbbítjuk a kérést a hálózat felé
        return fetch(event.request);
      }
    )
  );
});