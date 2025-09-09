const CACHE_NAME = 'munkaido-pro-cache-v2'; // Verziószámot növeltem, hogy biztosan frissüljön
const urlsToCache = [
  '/',
  'index.html',
  
  // FONTOSABB JS FÁJLOK
  'js/main.js',
  'js/config/translations.js',
  'js/utils/time.js',
  'js/ui/ui.js',
  'js/services/database.js',
  'js/features/workday.js',
  'js/features/recordsList.js',
  
  // CSS ÉS KÉPEK
  'assets/css/main.css',
  'assets/images/splash.jpg',
  'assets/images/icon-192x192.png',
  'assets/images/icon-512x512.png',
  
  // KÜLSŐ KÖNYVTÁRAK
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
    // A Response klónozási hiba javítása
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Ha a válasz a gyorsítótárban van, adjuk vissza azt
                if (response) {
                    return response;
                }
                
                // Különben kérjük le a hálózatról
                // Klónozzuk a kérést, mert a stream csak egyszer olvasható
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(
                    networkResponse => {
                        // Ellenőrizzük, hogy érvényes választ kaptunk-e
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // Klónozzuk a választ, mert ezt is csak egyszer lehet olvasni
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                );
            })
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
