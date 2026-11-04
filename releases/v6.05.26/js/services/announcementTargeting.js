// =======================================================
// ===== ANNOUNCEMENT TARGETING (rating_request) ==========
// =======================================================
// Pure helpers for rating/review popup eligibility.
// Browser: window.announcementTargeting
// Node tests: module.exports

(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (root) root.announcementTargeting = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  var DAY_MS = 24 * 60 * 60 * 1000;
  var DEFAULT_MIN_REGISTRATION_AGE_DAYS = 60;
  var DEFAULT_PLATFORMS = ['android', 'ios'];
  var PLAY_STORE_PACKAGE = 'eu.gurigo.app';
  var APP_STORE_ID = '6764344205';
  var PLAY_STORE_HL_BY_LANG = {
    hu: 'hu',
    de: 'de',
    en: 'en',
    pl: 'pl',
    ro: 'ro',
    da: 'da',
    no: 'no'
  };

  function normalizeAppLang(lang) {
    var key = String(lang || '').toLowerCase().trim();
    if (key.indexOf('-') >= 0) key = key.split('-')[0];
    if (key.indexOf('_') >= 0) key = key.split('_')[0];
    if (key === 'nb' || key === 'nn') return 'no';
    return key;
  }

  function getAppLanguage(ctx) {
    if (ctx && ctx.lang) return normalizeAppLang(ctx.lang) || 'hu';
    try {
      if (typeof currentLang === 'string' && currentLang) return normalizeAppLang(currentLang) || 'hu';
      if (typeof localStorage !== 'undefined') {
        var stored = localStorage.getItem('language');
        if (stored) return normalizeAppLang(stored) || 'hu';
      }
    } catch (_) {}
    return 'hu';
  }

  function getPlayStoreHl(lang) {
    var key = normalizeAppLang(lang);
    return PLAY_STORE_HL_BY_LANG[key] || 'en';
  }

  /** Localized Play Store listing, e.g. .../details?id=eu.gurigo.app&hl=hu */
  function getPlayStoreListingUrl(lang) {
    return 'https://play.google.com/store/apps/details?id=' + PLAY_STORE_PACKAGE + '&hl=' + getPlayStoreHl(lang);
  }

  /** Android Intent URL — TWA does not navigate to play.google.com via location.href. */
  function getPlayStoreIntentUrl(lang) {
    var https = getPlayStoreListingUrl(lang);
    var hl = getPlayStoreHl(lang);
    return 'intent://details?id=' + PLAY_STORE_PACKAGE + '&hl=' + hl +
      '#Intent;scheme=market;package=com.android.vending;S.browser_fallback_url=' +
      encodeURIComponent(https) + ';end';
  }

  function getPlayStoreMarketUrl(lang) {
    return 'market://details?id=' + PLAY_STORE_PACKAGE + '&hl=' + getPlayStoreHl(lang);
  }

  function getAppStoreReviewUrl() {
    return 'https://apps.apple.com/app/id' + APP_STORE_ID + '?action=write-review';
  }

  function getRatingStoreUrl(ctx) {
    ctx = ctx || detectRatingContext();
    var platform = String(ctx.platform || 'unknown').toLowerCase();
    if (platform === 'ios' || ctx.isNativeIos) return getAppStoreReviewUrl();
    return getPlayStoreListingUrl(getAppLanguage(ctx));
  }

  function openExternalUrl(url) {
    if (!url) return false;
    if (typeof window === 'undefined') return false;
    try {
      var opened = window.open(url, '_blank');
      if (opened) return true;
    } catch (_) {}
    try {
      if (typeof document !== 'undefined' && document.body) {
        var a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('style', 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0.01;');
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 1500);
      }
    } catch (_) {}
    try {
      window.location.href = url;
      return true;
    } catch (_) {}
    return false;
  }

  function isRatingRequest(ann) {
    if (!ann) return false;
    var sub = String(ann.subtype || '').trim();
    var typ = String(ann.type || '').trim();
    var act = String(ann.ctaAction || '').trim();
    return sub === 'rating_request' || typ === 'rating_request' || act === 'rate_app';
  }

  function timestampToMs(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value.toDate === 'function') {
      try {
        var d = value.toDate();
        return d && Number.isFinite(d.getTime()) ? d.getTime() : null;
      } catch (_) { return null; }
    }
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    var parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function isWithinDateRange(ann, nowMs) {
    if (!ann) return false;
    var now = Number.isFinite(nowMs) ? nowMs : Date.now();
    var start = timestampToMs(ann.startAt);
    var end = timestampToMs(ann.endAt);
    if (start != null && now < start) return false;
    if (end != null && now > end) return false;
    return true;
  }

  function getMinRegistrationAgeDays(ann) {
    var raw = ann && ann.targeting ? ann.targeting.minRegistrationAgeDays : null;
    if (raw == null || raw === '') return DEFAULT_MIN_REGISTRATION_AGE_DAYS;
    var n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return DEFAULT_MIN_REGISTRATION_AGE_DAYS;
    return Math.floor(n);
  }

  function getTargetingPlatforms(ann) {
    var raw = ann && ann.targeting ? ann.targeting.platforms : null;
    if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_PLATFORMS.slice();
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var p = String(raw[i] || '').toLowerCase().trim();
      if (p && out.indexOf(p) === -1) out.push(p);
    }
    return out.length ? out : DEFAULT_PLATFORMS.slice();
  }

  function isOncePerUser(ann) {
    if (!ann || !ann.display || ann.display.oncePerUser == null) return true;
    return ann.display.oncePerUser !== false;
  }

  function hasUserSeenAnnouncement(state) {
    if (!state) return false;
    if (state.seen === true) return true;
    if (state.status) return true;
    var action = String(state.action || '').trim();
    return action === 'shown' || action === 'rated' || action === 'dismissed';
  }

  function getAccountCreatedMs(user) {
    try {
      if (!user || !user.metadata) return null;
      var raw = user.metadata.creationTime;
      if (!raw) return null;
      var created = new Date(raw).getTime();
      return Number.isFinite(created) ? created : null;
    } catch (_) {
      return null;
    }
  }

  function meetsMinRegistrationAge(user, minDays, nowMs) {
    var n = Number(minDays);
    if (!Number.isFinite(n) || n <= 0) return true;
    var created = getAccountCreatedMs(user);
    if (created == null) return false;
    var now = Number.isFinite(nowMs) ? nowMs : Date.now();
    return (now - created) >= (n * DAY_MS);
  }

  function isInstalledAppSurface(ctx) {
    ctx = ctx || {};
    if (ctx.isNativeIos || ctx.isNativeAppShell) return true;
    var env = String(ctx.environment || 'web').toLowerCase();
    return env === 'twa' || env === 'pwa';
  }

  function matchesPlatform(ann, ctx) {
    ctx = ctx || {};
    var platforms = getTargetingPlatforms(ann);
    var platform = String(ctx.platform || 'unknown').toLowerCase();
    if (platforms.indexOf(platform) === -1) return false;
    // Store review is not meaningful in a desktop/mobile browser unless 'web' is explicit.
    if (!isInstalledAppSurface(ctx) && platforms.indexOf('web') === -1) return false;
    return true;
  }

  function isModalAnnouncement(ann) {
    if (!ann) return false;
    if (isRatingRequest(ann)) return true;
    return ann.type === 'announcement' && (ann.showAsModal === true || ann.loginModal === true);
  }

  /**
   * Rating request popup eligibility. Old news/announcement docs are not gated here.
   */
  function shouldShowRatingRequest(ann, ctx) {
    ctx = ctx || {};
    if (!isRatingRequest(ann)) return false;
    if (ann.active === false) return false;
    if (!ctx.user) return false;
    if (!isWithinDateRange(ann, ctx.nowMs)) return false;
    if (!meetsMinRegistrationAge(ctx.user, getMinRegistrationAgeDays(ann), ctx.nowMs)) return false;
    if (!matchesPlatform(ann, ctx)) return false;
    if (isOncePerUser(ann) && hasUserSeenAnnouncement(ctx.state)) return false;
    return true;
  }

  function detectRatingContext() {
    var platform = 'unknown';
    var environment = 'web';
    var isNativeIos = false;
    var isNativeAppShell = false;
    var lang = 'hu';
    try {
      if (typeof window !== 'undefined') {
        if (typeof window.detectPlatform === 'function') platform = window.detectPlatform();
        if (typeof window.detectAppEnvironment === 'function') environment = window.detectAppEnvironment();
        if (typeof window.isNativeIosAppShell === 'function') isNativeIos = !!window.isNativeIosAppShell();
        if (window.GuriGONative && window.GuriGONative.appShell === true) isNativeAppShell = true;
      }
      lang = getAppLanguage();
    } catch (_) {}
    return { platform: platform, environment: environment, isNativeIos: isNativeIos, isNativeAppShell: isNativeAppShell, lang: lang };
  }

  /**
   * Open store review. Native in-app review is not wired yet; falls back to store URLs.
   *
   * TODO(rating_request native review):
   * - Android TWA / native shell: Play In-App Review API (com.google.android.play.core.review)
   *   hook here if window.GuriGONative.requestReview or a dedicated bridge action exists.
   * - iOS WKWebView: SKStoreReviewController.requestReview() via
   *   webkit.messageHandlers.gurigo (same shell as IAP). Add a 'requestReview' action
   *   in gurigoNativeIapBridge.js / GuriGOWebShellView and call it from this function
   *   before the App Store URL fallback.
   */
  function requestAppRating(ctx) {
    ctx = ctx || detectRatingContext();
    try {
      if (typeof window !== 'undefined' && window.GuriGONative && typeof window.GuriGONative.requestReview === 'function') {
        window.GuriGONative.requestReview();
        return { method: 'native' };
      }
    } catch (_) {}

    var platform = String(ctx.platform || 'unknown').toLowerCase();
    var env = String(ctx.environment || '').toLowerCase();
    var lang = getAppLanguage(ctx);
    var playHttps = getPlayStoreListingUrl(lang);
    var playIntent = getPlayStoreIntentUrl(lang);
    var playMarket = getPlayStoreMarketUrl(lang);
    var iosHttps = getAppStoreReviewUrl();
    var isAndroid = platform === 'android' || env === 'twa';
    var isIos = platform === 'ios' || !!ctx.isNativeIos;

    try {
      if (isIos) {
        openExternalUrl(iosHttps);
        return { method: 'app_store', url: iosHttps };
      }
      // Android TWA: HTTPS + target=_blank opens Chrome Custom Tabs / Play Store.
      // Do not lead with intent:// — a synthetic click reports success but opens nothing.
      openExternalUrl(playHttps);
      return { method: 'play_store', url: playHttps, marketUrl: playMarket, intentUrl: playIntent };
    } catch (_) {
      openExternalUrl(playHttps);
      return { method: 'play_store', url: playHttps };
    }
  }

  function validateRatingRequestFields(data, opts) {
    opts = opts || {};
    var isRating = isRatingRequest(data) || opts.forceRating === true;
    if (!isRating) return { ok: true };
    var rawDays = data && data.targeting ? data.targeting.minRegistrationAgeDays : null;
    if (rawDays == null || rawDays === '') {
      if (opts.requireComplete === false) return { ok: true };
    } else {
      var n = Number(rawDays);
      if (!Number.isInteger(n) || n <= 0) {
        return { ok: false, error: 'minRegistrationAgeDays must be a positive integer' };
      }
    }
    var platforms = data && data.targeting ? data.targeting.platforms : null;
    if (Array.isArray(platforms) && platforms.length === 0) {
      return { ok: false, error: 'at least one platform is required' };
    }
    if ((!platforms || !platforms.length) && opts.requireComplete !== false) {
      return { ok: false, error: 'at least one platform is required' };
    }
    return { ok: true };
  }

  return {
    DAY_MS: DAY_MS,
    DEFAULT_MIN_REGISTRATION_AGE_DAYS: DEFAULT_MIN_REGISTRATION_AGE_DAYS,
    DEFAULT_PLATFORMS: DEFAULT_PLATFORMS,
    PLAY_STORE_PACKAGE: PLAY_STORE_PACKAGE,
    APP_STORE_ID: APP_STORE_ID,
    PLAY_STORE_HL_BY_LANG: PLAY_STORE_HL_BY_LANG,
    getAppLanguage: getAppLanguage,
    getPlayStoreHl: getPlayStoreHl,
    getPlayStoreListingUrl: getPlayStoreListingUrl,
    getPlayStoreIntentUrl: getPlayStoreIntentUrl,
    getPlayStoreMarketUrl: getPlayStoreMarketUrl,
    getAppStoreReviewUrl: getAppStoreReviewUrl,
    getRatingStoreUrl: getRatingStoreUrl,
    openExternalUrl: openExternalUrl,
    isRatingRequest: isRatingRequest,
    timestampToMs: timestampToMs,
    isWithinDateRange: isWithinDateRange,
    getMinRegistrationAgeDays: getMinRegistrationAgeDays,
    getTargetingPlatforms: getTargetingPlatforms,
    isOncePerUser: isOncePerUser,
    hasUserSeenAnnouncement: hasUserSeenAnnouncement,
    getAccountCreatedMs: getAccountCreatedMs,
    meetsMinRegistrationAge: meetsMinRegistrationAge,
    isInstalledAppSurface: isInstalledAppSurface,
    matchesPlatform: matchesPlatform,
    isModalAnnouncement: isModalAnnouncement,
    shouldShowRatingRequest: shouldShowRatingRequest,
    detectRatingContext: detectRatingContext,
    requestAppRating: requestAppRating,
    validateRatingRequestFields: validateRatingRequestFields
  };
});
