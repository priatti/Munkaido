const CACHE_NAME = 'munkaido-pro-cache-v6'; // Verziószám növelve a frissítéshez
const urlsToCache = [
  // Alapvető fájlok
  '/',
  'index.html',
  'manifest.json',
  'assets/css/main.css',

  // Képek
  'assets/images/splash.jpg',
  'assets/images/icon-192x192.png',
  'assets/images/icon-512x512.png',

  // JS segédfüggvények (utils)
  'js/utils/time.js',
  'js/utils/geolocation.js',

  // JS UI és szolgáltatások (services)
  'js/ui/ui.js',
  'js/services/database.js',
  'js/services/pwa.js',

  // JS funkciók (features)
  'js/features/workday.js',
  'js/features/recordsList.js',
  'js/features/pallets.js',
  'js/features/summary.js',
  'js/features/stats.js',
  'js/features/report.js',
  'js/features/tachograph.js',
  'js/features/settings.js',
  'js/features/help.js',

  // JS konfiguráció és fő vezérlő
  'js/config/translations.js',
  'js/main.js',

  // Külső források
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }

                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(
                    networkResponse => {
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

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
