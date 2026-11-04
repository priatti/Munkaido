// === KLIENS / PLATFORM KÖVETÉS (Admin diagnosztika) ===
// Rögzíti, hogy a felhasználó MILYEN kliensről használja a GuriGO-t:
//   - Apple natív app (App Store)
//   - Android natív app (Google Play)
//   - Web / PWA
//
// FONTOS: a natív appokat SOHA nem user-agent alapján azonosítjuk, hanem a
// natív wrapper által beállított explicit flagek alapján
// (window.GURIGO_NATIVE_SHELL + window.GURIGO_NATIVE_PLATFORM). A web csak fallback.
//
// Írás: users/{uid}/profile/info -> clientInfo (merge), max 24 óránként (+ bejelentkezéskor force).
(function () {
  'use strict';

  var THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 óra
  var WRITE_KEY_PREFIX = 'gurigo_clientinfo_lastwrite_';

  function str(v) {
    if (v == null) return '';
    try { return String(v).trim(); } catch (_) { return ''; }
  }

  // Natívan beinjektált flag kiolvasása (pl. GURIGO_NATIVE_APP_VERSION).
  function nativeFlag(name) {
    try {
      if (typeof window[name] !== 'undefined' && window[name] != null) return str(window[name]);
    } catch (_) { /* ignore */ }
    return '';
  }

  // Csak explicit natív flagek alapján – soha nem user-agent alapján.
  function nativePlatform() {
    try {
      if (window.GURIGO_NATIVE_SHELL === true) {
        var p = str(window.GURIGO_NATIVE_PLATFORM).toLowerCase();
        if (p) return p;
      }
      if (window.GuriGONative && window.GuriGONative.appShell === true) {
        var p2 = str(window.GuriGONative.platform).toLowerCase();
        if (p2) return p2;
      }
    } catch (_) { /* ignore */ }
    return '';
  }

  function appVersionFallback() {
    try {
      if (window.APP_INFO && window.APP_INFO.version) return str(window.APP_INFO.version);
    } catch (_) { /* ignore */ }
    return '';
  }

  // TWA / Bubblewrap fallback: a Play Áruházas GuriGO app (eu.gurigo.app) TWA-ként
  // nem tud window flageket injektálni, de a megnyitott oldal referrer-je
  // "android-app://eu.gurigo.app" lesz. Ez app-origin jel (NEM user-agent), így
  // biztonságos: Android Chrome / sima böngésző nem kapja meg, mert ott a referrer
  // nem ezzel az android-app:// origin-nal kezdődik.
  function isAndroidTwaReferrer() {
    try {
      var ref = str(typeof document !== 'undefined' ? document.referrer : '');
      return ref === 'android-app://eu.gurigo.app' || ref.indexOf('android-app://eu.gurigo.app') === 0;
    } catch (_) {
      return false;
    }
  }

  // Web fallback: OS / OS-verzió legjobb tudásunk szerinti kinyerése (csak web esetén).
  function parseWebOs(ua) {
    ua = ua || '';
    var os = 'Web';
    var osVersion = '';
    var m;
    if (/Windows NT/i.test(ua)) {
      os = 'Windows';
      m = ua.match(/Windows NT ([0-9._]+)/i);
      if (m) osVersion = m[1];
    } else if (/Android/i.test(ua)) {
      os = 'Android';
      m = ua.match(/Android ([0-9._]+)/i);
      if (m) osVersion = m[1];
    } else if (/(iPhone|iPad|iPod)/i.test(ua)) {
      os = 'iOS';
      m = ua.match(/OS ([0-9_]+)/i);
      if (m) osVersion = m[1].replace(/_/g, '.');
    } else if (/Mac OS X/i.test(ua)) {
      os = 'macOS';
      m = ua.match(/Mac OS X ([0-9_]+)/i);
      if (m) osVersion = m[1].replace(/_/g, '.');
    } else if (/Linux/i.test(ua)) {
      os = 'Linux';
    }
    return { os: os, osVersion: osVersion };
  }

  function detectClientInfo() {
    var platform = nativePlatform();
    var appVersion = appVersionFallback();
    var ua = str(typeof navigator !== 'undefined' ? navigator.userAgent : '');

    if (platform === 'ios') {
      return {
        platform: 'ios_native',
        appSource: nativeFlag('GURIGO_NATIVE_APP_SOURCE') || 'app_store',
        appVersion: nativeFlag('GURIGO_NATIVE_APP_VERSION') || appVersion,
        buildNumber: nativeFlag('GURIGO_NATIVE_BUILD_NUMBER'),
        os: 'iOS',
        osVersion: nativeFlag('GURIGO_NATIVE_OS_VERSION'),
        userAgent: ua
      };
    }

    if (platform === 'android') {
      return {
        platform: 'android_native',
        appSource: nativeFlag('GURIGO_NATIVE_APP_SOURCE') || 'google_play',
        appVersion: nativeFlag('GURIGO_NATIVE_APP_VERSION') || appVersion,
        buildNumber: nativeFlag('GURIGO_NATIVE_BUILD_NUMBER'),
        os: 'Android',
        osVersion: nativeFlag('GURIGO_NATIVE_OS_VERSION'),
        userAgent: ua
      };
    }

    // Android TWA / Bubblewrap fallback (csak akkor, ha NINCS explicit natív flag).
    // App-origin (referrer) alapú jel, nem user-agent. appVersion/buildNumber
    // TWA-ból nem elérhető → maradhat üres (a write null-ra normalizálja).
    if (isAndroidTwaReferrer()) {
      var twaOs = parseWebOs(ua);
      return {
        platform: 'android_native',
        appSource: 'google_play',
        appVersion: '',
        buildNumber: '',
        os: 'Android',
        osVersion: twaOs.os === 'Android' ? twaOs.osVersion : '',
        userAgent: ua
      };
    }

    // Web / PWA fallback
    var webOs = parseWebOs(ua);
    return {
      platform: 'web_pwa',
      appSource: 'web',
      appVersion: appVersion,
      buildNumber: '',
      os: webOs.os,
      osVersion: webOs.osVersion,
      userAgent: ua
    };
  }

  // Üres értékeket null-ra alakítjuk, hogy a (rekurzív) merge ne hagyjon
  // ott elavult értéket (pl. natívról webre váltáskor a buildNumber törlődjön).
  function normalizeForWrite(info) {
    var out = {};
    Object.keys(info).forEach(function (k) {
      var v = info[k];
      out[k] = (v === '' || v == null) ? null : v;
    });
    return out;
  }

  function shouldWrite(uid, force) {
    if (force) return true;
    try {
      var raw = localStorage.getItem(WRITE_KEY_PREFIX + uid);
      if (!raw) return true;
      var ts = parseInt(raw, 10);
      if (!ts || isNaN(ts)) return true;
      return (Date.now() - ts) > THROTTLE_MS;
    } catch (_) {
      return true;
    }
  }

  function markWritten(uid) {
    try { localStorage.setItem(WRITE_KEY_PREFIX + uid, String(Date.now())); } catch (_) { /* ignore */ }
  }

  // uid: opcionális; ha nincs, a bejelentkezett user-t használjuk.
  // options.force: true esetén a 24 órás throttle-t átugorja (bejelentkezéskor).
  async function updateClientInfo(uid, options) {
    var opts = options || {};
    try {
      if (!uid) {
        uid = (window.currentUser && window.currentUser.uid) ||
          (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser
            ? firebase.auth().currentUser.uid
            : null);
      }
    } catch (_) { /* ignore */ }

    if (!uid) return;
    if (typeof firebase === 'undefined' || !firebase.firestore) return;
    if (!shouldWrite(uid, opts.force === true)) return;

    var info = normalizeForWrite(detectClientInfo());
    info.lastSeenAt = firebase.firestore.FieldValue.serverTimestamp();

    try {
      await firebase.firestore()
        .collection('users').doc(uid)
        .collection('profile').doc('info')
        .set({ clientInfo: info }, { merge: true });
      markWritten(uid);
      console.log(
        '[ClientInfo] updated:',
        info.platform,
        info.appVersion || '',
        info.buildNumber ? '(' + info.buildNumber + ')' : ''
      );
    } catch (e) {
      // Diagnosztika soha ne törje meg az appot.
      console.warn('[ClientInfo] update failed (non-fatal):', e && e.message ? e.message : e);
    }
  }

  window.GuriGOClientInfo = {
    detect: detectClientInfo,
    update: updateClientInfo
  };
  window.detectClientInfo = detectClientInfo;
  window.updateClientInfo = updateClientInfo;
})();
