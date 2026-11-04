// Offline cold start diagnosztika (dev / ?coldstartdiag=1)
(function () {
  'use strict';

  function detectPlatformLabel() {
    try {
      if (window.GURIGO_NATIVE_SHELL === true) {
        var p = String(window.GURIGO_NATIVE_PLATFORM || '').toLowerCase();
        if (p === 'ios') return 'app_store';
      }
      if (typeof document !== 'undefined' && document.referrer &&
          String(document.referrer).indexOf('android-app://eu.gurigo.app') === 0) {
        return 'google_play';
      }
      if (typeof window.detectAppEnvironment === 'function') {
        var env = window.detectAppEnvironment();
        if (env === 'twa') return 'google_play';
        if (env === 'pwa') return 'pwa';
      }
      if (window.navigator && window.navigator.standalone === true) return 'pwa';
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return 'pwa';
    } catch (_) {}
    return 'web';
  }

  function cacheProbe(url) {
    if (!('caches' in window)) return Promise.resolve({ url: url, hit: false });
    return caches.match(url, { ignoreSearch: true }).then(function (resp) {
      return { url: url, hit: !!resp };
    }).catch(function () {
      return { url: url, hit: false };
    });
  }

  async function runOfflineColdStartDiagnostics() {
    var scopeBase = '/releases/v6.05.26/';
    var critical = [
      scopeBase + 'index.html',
      scopeBase + 'js/main.js',
      scopeBase + 'js/services/auth.js',
      scopeBase + 'js/services/database.js',
      scopeBase + 'js/config/i18n/hu.js',
      scopeBase + 'assets/css/main.css',
      'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
      'https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js'
    ];
    var cacheNames = [];
    try {
      cacheNames = await caches.keys();
    } catch (_) {}
    var probes = await Promise.all(critical.map(cacheProbe));
    var report = {
      platform: detectPlatformLabel(),
      online: typeof navigator !== 'undefined' ? navigator.onLine : null,
      swSupported: 'serviceWorker' in navigator,
      swController: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
      swReadyHint: (function () {
        try { return localStorage.getItem('__gurigo_sw_ready') === '1'; } catch (_) { return false; }
      })(),
      releaseVersion: (document.querySelector('meta[name="version"]') || {}).content || null,
      location: typeof location !== 'undefined' ? location.href : null,
      cacheNames: cacheNames,
      shellProbes: probes,
      authUidHint: (function () {
        try { return localStorage.getItem('__gurigo_last_auth_uid') || null; } catch (_) { return null; }
      })(),
      ts: new Date().toISOString()
    };
    try { console.log('[ColdStartDiag]', report); } catch (_) {}
    window.__gurigoOfflineColdStartReport = report;
    return report;
  }

  window.runOfflineColdStartDiagnostics = runOfflineColdStartDiagnostics;

  try {
    var params = new URLSearchParams(window.location.search || '');
    if (params.get('coldstartdiag') === '1') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
          runOfflineColdStartDiagnostics();
        });
      } else {
        runOfflineColdStartDiagnostics();
      }
    }
  } catch (_) {}
})();
