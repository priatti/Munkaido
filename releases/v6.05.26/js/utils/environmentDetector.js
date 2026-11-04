// =======================================================
// ===== ENVIRONMENT DETECTION (TWA / PWA / WEB) =========
// =======================================================
// Detects whether the app runs as TWA, PWA (standalone), or web browser.

(function () {
  'use strict';

  /**
   * Detects the app environment.
   * @returns {'twa'|'pwa'|'web'}
   */
  function detectAppEnvironment() {
    try {
      const isTwa = typeof document !== 'undefined' && document.referrer
        ? String(document.referrer || '').startsWith('android-app://')
        : false;
      const isStandalone = typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(display-mode: standalone)').matches
        : false;
      if (isTwa) return 'twa';
      if (isStandalone) return 'pwa';
      return 'web';
    } catch (_) {
      return 'web';
    }
  }

  /**
   * Detects platform (android, ios, or unknown).
   * @returns {'android'|'ios'|'unknown'}
   */
  function detectPlatform() {
    try {
      const ua = typeof navigator !== 'undefined' ? (navigator.userAgent || '').toLowerCase() : '';
      if (/android/.test(ua)) return 'android';
      if (/iphone|ipad|ipod/.test(ua)) return 'ios';
      return 'unknown';
    } catch (_) {
      return 'unknown';
    }
  }

  window.detectAppEnvironment = detectAppEnvironment;
  window.detectPlatform = detectPlatform;
})();
