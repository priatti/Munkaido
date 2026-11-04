// GuriGO Service Worker v6.05.26
// Purpose: Offline-first caching for PWA functionality
// Precache: teljes app shell (index.html + minden lokális script/asset)

const CACHE_NAME = 'gurigo-cache-v6.05.26-checkout1';
const RUNTIME_CACHE = 'gurigo-runtime-v6.05.26-checkout1';
const SW_BUILD = 'production-swiso1';
/** This SW may delete only v6.05.* release caches. Never root or v7. */
const OWNED_CACHE_PREFIXES = ['gurigo-cache-v6.05.', 'gurigo-runtime-v6.05.'];

function isOwnedCacheName(name) {
  if (!name || typeof name !== 'string') return false;
  for (var i = 0; i < OWNED_CACHE_PREFIXES.length; i++) {
    if (name.indexOf(OWNED_CACHE_PREFIXES[i]) === 0) return true;
  }
  return false;
}

function shouldDeleteOwnedCache(name) {
  if (name === CACHE_NAME || name === RUNTIME_CACHE) return false;
  return isOwnedCacheName(name);
}

const MINIMAL_PRECACHE_PATHS = [
  'index.html',
  'manifest.webmanifest?v=60526checkout1',
  'assets/css/main.css?v=60515boot1',
  'js/boot/bootMarks.js?v=60517console1',
  'js/boot/loadScript.js?v=60517script1',
  'js/boot/lazyLibs.js?v=60517absencespin1',
  'js/boot/earlyAuthWire.js?v=60515boot1',
  'js/boot/bootManifest.js?v=60526checkout1',
  'js/boot/bootPhases.js?v=60517script1',
  'js/services/auth.js?v=60517console1',
  'js/services/database.js?v=60526checkout1',
  'js/services/offlinePolicy.js?v=60508prodshift1',
  'js/ui/ui.js?v=60520tcl1',
  'js/ui/headerDateChip.js?v=60510headerdatechip2',
  'js/main.js?v=60517console1',
  'js/config/vatConfig.js?v=60517script1',
  'js/config/pricing.js?v=60517script1',
  // Phase 2 early shell: must be cached before skipWaiting (MUNKAIDO-8J)
  'js/config/subscriptionTiers.js?v=60508entgift1',
  'js/services/subscriptionEntitlements.js?v=60508status2',
  'js/config/i18n/hu.js?v=60526checkout1',
  'js/config/translations.js?v=60515boot1'
];

// CDN precache: net nélküli induláshoz (install során online kell legyen egyszer)
const CDN_PRECACHE = [
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-storage.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-functions.js',
  'https://js-de.sentry-cdn.com/fbd6c74b8f2150cffb3f052ed6e84740.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

// Relative to SW scope (release root) – synced with index.html
const PRECACHE_PATHS = [
  '',
  'index.html',
  'manifest.webmanifest?v=60526checkout1',
  'assets/css/main.css?v=60521pallet2',
  'assets/css/documents-type-ui.css?v=60330doctype3',
  'assets/css/settings_modern_styles.css?v=60508flags1',
  'assets/css/cancel-reason-modal.css?v=60520tcl1',
  'assets/nav-fix.css?v=60203',
  'assets/images/icon-192x192.png',
  'assets/images/icon-512x512.png',
  'assets/images/gurigo.jpg',
  'assets/images/splash.jpg',
  'assets/images/splash.png',
  'assets/images/splash-de.png',
  'assets/images/splash-en.png',
  'assets/images/splash-ro.png',
  'assets/images/splash-pl.png',
  'assets/images/splash-dk.png',
  'assets/images/splash-no.png',
  'js/services/sentryClient.js',
  'js/config/vatConfig.js?v=60517script1',
  'js/config/pricing.js?v=60517script1',
  'js/config/subscriptionTiers.js?v=60508entgift1',
  'js/services/subscriptionEntitlements.js?v=60508status2',
  'js/services/gurigoNativeIapBridge.js?v=60508storekit-price8',
  'js/services/gurigoNativeAuthBridge.js?v=60330nativeauth4',
  'js/services/gurigoNativeDebugBridge.js?v=60508debug1',
  'js/config/billingEnv.js?v=60203',
  'js/services/trialResetHandler.js?v=60517console1',
  'js/tracking/utmTracker.js?v=60517console1',
  'js/tracking/analytics.js?v=60514ga1',
  'js/config/i18n/hu.js?v=60526checkout1',
  'js/config/i18n/de.js?v=60526checkout1',
  'js/config/i18n/en.js?v=60526checkout1',
  'js/config/i18n/ro.js?v=60526checkout1',
  'js/config/i18n/pl.js?v=60526checkout1',
  'js/config/i18n/da.js?v=60526checkout1',
  'js/config/i18n/no.js?v=60526checkout1',
  'js/config/translations.js?v=60510headerdatechip2',
  'js/utils/countryFlag.js?v=60508flags1',
  'js/config/appInfo.js',
  'js/config/waybillAllowlist.js',
  'js/config/vehiclesAllowlist.js',
  'js/utils/time.js?v=60513drivingmode4',
  'js/utils/sundayMondayHelper.js?v=60508vhsplit1',
  'js/utils/dailyDriveSegments.js?v=60508tacho10h1',
  'js/utils/geolocation.js',
  'js/utils/dataHelpers.js?v=60514records1',
  'js/utils/crossingFormat.js?v=60330cross',
  'js/utils/crossingMerge.js?v=60526checkout1',
  'js/utils/holidayDates.js?v=60330holidayui',
  'js/utils/realismValidator.js?v=60513drivingmode1',
  'js/ui/ui.js?v=60520tcl1',
  'js/ui/headerDateChip.js?v=60510headerdatechip2',
  'js/services/documentsDataService.js?v=60508read1',
  'js/services/workdayRecordSync.js?v=60526checkout1',
  'js/services/activeShiftSync.js?v=60526checkout1',
  'js/services/syncRetryManager.js?v=60526checkout1',
  'js/services/offlinePolicy.js?v=60508prodshift1',
  'js/services/pendingDocumentsStore.js?v=60508policy2',
  'js/services/database.js?v=60526checkout1',
  'js/utils/vehicleSegments.js?v=60508rptveh1',
  'js/services/vehiclesService.js?v=60508veh4',
  'js/features/entryVehicleField.js?v=60508rptveh1',
  'js/features/fullDayVehicleSegments.js?v=60513drivingmode3',
  'js/features/vehicleChange.js?v=60508vehchg3',
  'js/services/errorLogger.js?v=60508errfilt1',
  'js/utils/activityTracker.js?v=60517console1',
  'js/fixes/delete-shim.js?v=40119',
  'js/services/auth.js?v=60517console1',
  'js/services/pwa.js',
  'js/services/offlineStore.js?v=60508sync1',
  'js/services/syncManager.js?v=60508sync2',
  'js/services/offlineSync.js?v=60508prodshift1',
  'js/features/trailerContainerLog.js?v=60526checkout1',
  'js/services/trailerContainerActiveSync.js?v=60526checkout1',
  'js/features/workday.js?v=60526checkout1',
  'js/utils/listPagination.js?v=60508listpag4',
  'js/features/recordsList.js?v=60526checkout1',
  'js/features/pallets.js?v=60521pallet1',
  'js/features/waybill.js',
  'js/features/vehicles.js?v=60508veh3',
  'js/services/fuelingService.js?v=60508fuelfull1',
  'js/features/fueling.js?v=60508fuelpro2',
  'js/features/summary.js',
  'js/features/tachographWarnings.js',
  'js/services/statisticsDataService.js?v=60508stats1',
  'js/features/stats.js?v=60508stats1',
  'js/utils/reportRowNormalizer.js?v=60330holiday',
  'js/utils/pdfViewer.js?v=60508pdfback6',
  'js/features/report.js?v=60526checkout1',
  'js/features/tachograph.js?v=60513drivingmode4',
  'js/features/documents.js?v=60508errfilt1',
  'js/utils/documentExpiryDate.js',
  'js/features/documentsReminder.js?v=60508errfilt1',
  'js/services/documentsStats.js',
  'js/features/documentsManager.js',
  'js/utils/environmentDetector.js',
  'js/services/announcementTargeting.js?v=60517rate3',
  'js/services/announcementsService.js?v=60526checkout1',
  'js/features/announcements.js?v=60517rate3',
  'js/features/settings.js?v=60526checkout1',
  'js/rules/twoReducedWeeklyRest.js',
  'js/rules/ninetyHourWeekendRest.js',
  'js/rules/mobilityPackageWeeklyRest.js?v=60508mp-overview1',
  'js/rules/weeklyRestCompensation.js?v=60508errfilt1',
  'js/debug/mobilityCompensationCase.js?v=60520tcl1',
  'js/services/subscriptionHelpers.js?v=60508earlybird6',
  'js/services/subscriptionCancellationFeedback.js?v=60508cancel4',
  'js/services/subscriptionProcessingOverlay.js?v=60508resume1',
  'js/features/subscription.js?v=60526checkout1',
  'js/features/overviewPaymentProblemBanner.js?v=60508iap-payment-grace-ui1',
  'js/features/paymentFailedAlert.js?v=60324',
  'js/features/billing-info.js?v=60517console1',
  'js/features/invoices.js?v=60517console1',
  'js/features/accountDelete.js?v=60508logout1',
  'js/features/promoModal.js?v=60508earlybird6',
  'js/features/help.js',
  'js/features/overview-live-refresh.js',
  'js/ui/navigation.js?v=60508moremenu1',
  'js/utils/countryModal.js?v=60508logoutnav1',
  'js/services/subscriptionEntitlementsRefresh.js?v=60508',
  'js/services/userProfile.js?v=60517console1',
  'js/services/clientInfo.js?v=60508',
  'js/features/yearlySummary2025.js',
  'js/main.js?v=60517console1',
  'js/fixes/nav-fix.js',
  'js/open-in-app.v3.js?v=40112',
  'js/services/offlineColdStartDiag.js?v=60526checkout1'
];

self.addEventListener('install', (event) => {
  const scopeBase = self.registration.scope.endsWith('/') ? self.registration.scope : self.registration.scope + '/';
  const minimalUrls = MINIMAL_PRECACHE_PATHS.map(p => scopeBase + p);
  const fullUrls = PRECACHE_PATHS.map(p => scopeBase + p);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Phase 1 minimal precache at scope:', scopeBase, 'build:', SW_BUILD);
        return Promise.allSettled(minimalUrls.map(function (url) {
          return cache.add(url).catch(function (e) {
            console.warn('[SW] Minimal precache skip:', url, e && e.message);
          });
        }));
      })
      .then(() => caches.open(RUNTIME_CACHE).then(cache =>
        Promise.allSettled(CDN_PRECACHE.map(url =>
          fetch(url, { mode: 'cors' })
            .then(resp => resp && resp.ok ? cache.put(url, resp) : Promise.resolve())
            .catch(e => console.warn('[SW] CDN precache skip:', url, e.message || e))
        ))
      ))
      .then(() => self.skipWaiting())
      .then(() => caches.open(CACHE_NAME).then(cache => {
        console.log('[SW] Phase 2 background shell precache');
        return Promise.allSettled(fullUrls.map(function (url) {
          return cache.add(url).catch(function (e) {
            console.warn('[SW] Shell precache skip:', url, e && e.message);
          });
        }));
      }))
      .catch(err => {
        console.error('[SW] Precache failed:', err);
        self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Ownership-scoped cleanup only (never v7 / root / foreign channels).
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter(shouldDeleteOwnedCache)
        .map(name => {
          console.log('[SW] Deleting owned obsolete cache:', name);
          return caches.delete(name);
        })
    );
    await self.clients.claim();
    console.log('[SW] Activated build:', SW_BUILD, 'cache:', CACHE_NAME);
  })());
});

// Support receiving SKIP_WAITING message from page
self.addEventListener('message', (event) => {
  if (event && event.data === 'SKIP_WAITING') {
    try { self.skipWaiting(); } catch (_) {}
  }
});

// Fetch strategy: Cache-first for app shell, Network-first for API calls
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) {
    // FONTOS: csak CDN host-ok! firebase/googleapis.com API hívásokat NEM szabad elkapni,
    // mert offline a 503 fallback megzavarja a Firebase SDK cache-fallback mechanizmusát.
    if (url.hostname.includes('gstatic.com') || url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('sentry-cdn.com')) {
      event.respondWith(
        caches.match(request, { ignoreVary: true }).then(cached => {
          if (cached) {
            // Stale-while-revalidate: háttérben frissítjük a CDN cache-t
            event.waitUntil(
              fetch(request).then(response => {
                if (response && response.ok) {
                  return caches.open(RUNTIME_CACHE).then(c => c.put(request, response));
                }
              }).catch(() => {})
            );
            return cached;
          }
          return fetch(request).then(response => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(RUNTIME_CACHE).then(c => c.put(request, clone)).catch(() => {});
            }
            return response;
          }).catch(() =>
            // Utolsó esély: ignoreVary + ignoreSearch is próbáljuk
            caches.match(request, { ignoreVary: true, ignoreSearch: true }).then(fallback =>
              fallback || new Response('/* offline: CDN resource unavailable */', {
                status: 503, statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'application/javascript' }
              })
            )
          );
        })
      );
    }
    return;
  }

  // HTML navigate: cache-first app shell (offline cold start)
  if (request.method === 'GET' && request.mode === 'navigate') {
    const scopeBase = self.registration.scope.endsWith('/') ? self.registration.scope : self.registration.scope + '/';
    event.respondWith(
      caches.match(scopeBase + 'index.html', { ignoreSearch: true }).then(function (cachedShell) {
        var networkFetch = fetch(request).then(function (response) {
          if (response && response.ok) {
            var clone = response.clone();
            caches.open(RUNTIME_CACHE).then(function (c) { return c.put(request, clone); }).catch(function () {});
          }
          return response;
        }).catch(function () { return null; });
        if (cachedShell) {
          event.waitUntil(networkFetch);
          return cachedShell;
        }
        return networkFetch.then(function (response) {
          if (response) return response;
          return caches.match(scopeBase + 'index.html')
            .then(function (idx) { return idx || caches.match(scopeBase); });
        });
      })
    );
    return;
  }

  // Sync-critical JS: network-first so stale merge/sync code cannot stick online.
  // Offline falls back to cache (exact key, then ignoreSearch).
  if (
    request.method === 'GET' &&
    (url.pathname.includes('/utils/crossingMerge') ||
      url.pathname.includes('/services/activeShiftSync') ||
      url.pathname.includes('/services/workdayRecordSync') ||
      url.pathname.includes('/services/database.js') ||
      url.pathname.includes('/boot/bootManifest') ||
      url.pathname.includes('/features/recordsList') ||
      url.pathname.includes('/features/workday.js'))
  ) {
    event.respondWith(
      fetch(request).then(function (response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function (c) { return c.put(request, clone); }).catch(function () {});
          caches.open(RUNTIME_CACHE).then(function (c) { return c.put(request, response.clone()); }).catch(function () {});
        }
        return response;
      }).catch(function () {
        return caches.match(request).then(function (cached) {
          if (cached) return cached;
          return caches.match(request, { ignoreSearch: true }).then(function (fallback) {
            return fallback || new Response('/* offline: script unavailable */', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
            });
          });
        });
      })
    );
    return;
  }

  // Kritikus JS: cache-first offline, háttérben frissítés online
  if (
    request.method === 'GET' &&
    (url.pathname.includes('gurigoNativeIapBridge') ||
      url.pathname.includes('subscriptionEntitlements') ||
      url.pathname.includes('features/subscription.js') ||
      url.pathname.includes('services/userProfile.js') ||
      url.pathname.includes('subscriptionHelpers.js') ||
      url.pathname.includes('features/settings.js') ||
      url.pathname.includes('weeklyRestCompensation.js') ||
      url.pathname.includes('services/errorLogger.js') ||
      url.pathname.includes('services/auth.js') ||
      url.pathname.includes('features/billing-info.js') ||
      url.pathname.includes('features/invoices.js') ||
      url.pathname.includes('features/documents.js') ||
      url.pathname.includes('features/documentsReminder.js') ||
      url.pathname.includes('main.js') ||
      url.pathname.includes('config/i18n/') ||
      url.pathname.includes('config/translations.js'))
  ) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then(function (cached) {
        var networkFetch = fetch(request).then(function (response) {
          if (response && response.status === 200) {
            var clone = response.clone();
            caches.open(RUNTIME_CACHE).then(function (c) { return c.put(request, clone); }).catch(function () {});
          }
          return response;
        }).catch(function () { return null; });
        if (cached) {
          event.waitUntil(networkFetch);
          return cached;
        }
        return networkFetch.then(function (response) {
          if (response) return response;
          return caches.match(request, { ignoreSearch: true }).then(function (fallback) {
            // Never resolve respondWith(undefined) — that surfaces as script.onerror.
            return fallback || new Response('/* offline: script unavailable */', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
            });
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    (async () => {
      const scopeBase = self.registration.scope.endsWith('/') ? self.registration.scope : self.registration.scope + '/';
      let cachedResponse = await caches.match(request);

      if (cachedResponse) {
        event.waitUntil(
          fetch(request)
            .then(response => {
              if (response && response.status === 200) {
                return caches.open(RUNTIME_CACHE).then(cache => cache.put(request, response.clone()));
              }
            })
            .catch(() => {})
        );
        return cachedResponse;
      }

      try {
        const response = await fetch(request);
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone)).catch(() => {});
        }
        return response;
      } catch (error) {
        console.error('[SW] Fetch failed:', error);
        if (request.mode === 'navigate') {
          const fallbackUrl = scopeBase + 'index.html';
          return (await caches.match(fallbackUrl)) || (await caches.match(scopeBase));
        }
        // ignoreSearch: cache-buster query may differ from precache key
        const fallback =
          (await caches.match(request)) ||
          (await caches.match(request, { ignoreSearch: true }));
        if (fallback) return fallback;
        if (url.pathname.endsWith('.js')) {
          // Avoid empty 503 (triggers script.onerror); still fail explicitly.
          return new Response('/* offline: script unavailable */', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
          });
        }
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      }
    })()
  );
});
