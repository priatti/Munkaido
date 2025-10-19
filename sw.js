// Root-scope Service Worker for GuriGO
// Minimal controller to avoid version-scoped caching issues

const ROOT_SW_VERSION = 'v3';

self.addEventListener('install', (event) => {
  try { self.skipWaiting(); } catch(_) {}
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean only root-sw caches if we ever add some later
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('gurigo-root-') && !k.endsWith(ROOT_SW_VERSION)).map(k => caches.delete(k)));
    // Migrate open clients to current (4.01.06)
    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of clients) {
        if (c && c.url && c.url.indexOf('/releases/v4.01.05/') !== -1) {
          const next = c.url.replace('/releases/v4.01.05/', '/releases/v4.01.06/');
          try { c.navigate(next); } catch(_) {}
        }
      }
    } catch(_) {}
  })());
  try { self.clients.claim(); } catch(_) {}
});

self.addEventListener('message', (event) => {
  if (!event) return;
  if (event.data === 'SKIP_WAITING') {
    try { self.skipWaiting(); } catch(_) {}
  }
});

// Rewrite any same-origin GETs from 4.01.05 → 4.01.06 (handles stubborn Android PWAs)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isGET = req.method === 'GET';
  const isNavigation = req.mode === 'navigate' || (isGET && req.headers.get('accept')?.includes('text/html'));

  // Navigations: redirect to current (06)
  if (isNavigation) {
    try {
      const href = url.href.replace('/releases/v4.01.05/', '/releases/v4.01.06/');
      if (href !== url.href) {
        event.respondWith(fetch(href, { cache: 'reload', credentials: 'include' }));
        return;
      }
    } catch (_) {}
  }

  // Other GETs under the 05 path: fetch from 06 instead
  if (isSameOrigin && isGET && url.pathname.indexOf('/releases/v4.01.05/') === 0) {
    const redirected = url.href.replace('/releases/v4.01.05/', '/releases/v4.01.06/');
    event.respondWith(fetch(redirected, { cache: 'reload', credentials: 'include' }));
    return;
  }
});
