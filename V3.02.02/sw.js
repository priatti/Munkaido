// Javított Service Worker a stabil működéshez
const CACHE_NAME = 'munkaido-pro-cache-v15'; // Verziószámot növeltük a frissítés érdekében
const SCOPE = (self.registration && self.registration.scope) || '/';
const BASE = SCOPE.endsWith('/') ? SCOPE : (SCOPE + '/');

const urlsToCache = [
  // Core
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'assets/css/main.css',
  // Images
  BASE + 'assets/images/gurigo.jpg',
  BASE + 'assets/images/splash.jpg',
  BASE + 'assets/images/icon-192x192.png',
  BASE + 'assets/images/icon-512x512.png',
  // JS
  BASE + 'js/config/translations.js',
  BASE + 'js/config/appInfo.js',
  BASE + 'js/utils/time.js',
  BASE + 'js/utils/geolocation.js',
  BASE + 'js/utils/dataHelpers.js',
  BASE + 'js/ui/ui.js',
  BASE + 'js/ui/appInfoFooter.js',
  BASE + 'js/services/database.js',
  BASE + 'js/services/pwa.js',
  BASE + 'js/features/workday.js',
  BASE + 'js/features/recordsList.js',
  BASE + 'js/features/pallets.js',
  BASE + 'js/features/summary.js',
  BASE + 'js/features/stats.js',
  BASE + 'js/features/report.js',
  BASE + 'js/features/tachograph.js',
  BASE + 'js/features/settings.js',
  BASE + 'js/features/help.js',
  BASE + 'js/features/overview-live-refresh.js',
  BASE + 'js/main.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => {
        console.warn('[SW] Precache failed:', err);
        return Promise.resolve();
      })
  );
  // A hibát okozó "skipWaiting()" parancsot eltávolítottuk innen.
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => Promise.all(
      names.map(n => {
        if (n !== CACHE_NAME) {
          return caches.delete(n);
        }
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const isNavigation = req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));

  if (isNavigation) {
    event.respondWith(
      fetch(req).catch(() => caches.match(BASE + 'index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});