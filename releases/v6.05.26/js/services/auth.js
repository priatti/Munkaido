// ===========================
//  AUTH MODULE – GuriGO
//  (Firebase v8 API-hoz)
// ===========================

// Segédfüggvény: jelszó láthatóság váltása
function togglePasswordVisibility(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
}

// Segédfüggvény: "expected" Firebase Auth user hibák kódjai
function isExpectedAuthUserErrorCode(code) {
  if (typeof code !== 'string') return false;
  switch (code) {
    case 'auth/email-already-in-use':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
    case 'auth/weak-password':
    case 'auth/missing-password':
    case 'auth/too-many-requests':
    case 'auth/network-request-failed':
      return true;
    default:
      return false;
  }
}

// === iOS Google Auth Fix (redirect) ===
function isIOSDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

// === iOS sessionStorage accessibility check ===
function isSessionStorageAccessible() {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    const testKey = '__sessionStorage_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn('[Auth] sessionStorage not accessible:', e);
    return false;
  }
}

// === iOS localStorage accessibility check ===
function isLocalStorageAccessible() {
  try {
    if (typeof localStorage === 'undefined') return false;
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.warn('[Auth] localStorage not accessible:', e);
    return false;
  }
}

// === OAuth popup hibák (Firebase + böngésző üzenetek) ===
function isNativeIosShell() {
  try {
    return window.GURIGO_NATIVE_SHELL === true
      && String(window.GURIGO_NATIVE_PLATFORM || '').toLowerCase() === 'ios';
  } catch (_) {
    return false;
  }
}

function getAuthErrorMessage(error) {
  if (!error) return '';
  const msg = error.message || (typeof error.toString === 'function' ? error.toString() : '');
  return typeof msg === 'string' ? msg : String(msg);
}

function isOAuthPopupConnectionError(error) {
  const msg = getAuthErrorMessage(error).toLowerCase();
  return (
    msg.indexOf('unable to establish a connection with the popup') !== -1
    || msg.indexOf('connection with the popup') !== -1
    || msg.indexOf('popup has been blocked') !== -1
    || msg.indexOf('blocked by the browser') !== -1
  );
}

function getOAuthPopupErrorKind(error) {
  const code = error && error.code;
  if (code === 'auth/popup-blocked') return 'blocked';
  if (code === 'auth/popup-closed-by-user') return 'closed';
  if (code === 'auth/cancelled-popup-request') return 'cancelled';
  if (isOAuthPopupConnectionError(error)) return 'connection';
  if (code === 'auth/operation-not-supported-in-this-environment') return 'unsupported';
  return null;
}

function isOAuthPopupBenignError(error) {
  const kind = getOAuthPopupErrorKind(error);
  return kind === 'blocked' || kind === 'closed' || kind === 'cancelled' || kind === 'connection';
}

function shouldOAuthPopupTryRedirectFallback(error) {
  const kind = getOAuthPopupErrorKind(error);
  if (kind === 'closed' || kind === 'cancelled') return false;
  return kind === 'blocked' || kind === 'connection' || kind === 'unsupported';
}

function showOAuthPopupInterruptedMessage(i18n) {
  const msg = (i18n && (i18n.authSignInInterrupted || i18n.authApplePopupClosedByUser || i18n.alertPopupClosed))
    || 'A bejelentkezés megszakadt.';
  if (typeof showCustomAlert === 'function') {
    showCustomAlert(msg, 'info');
  }
}

function showOAuthPopupBlockedMessage(i18n, redirectFallback) {
  const msg = redirectFallback
    ? ((i18n && i18n.authApplePopupBlockedFallback) || '')
    : ((i18n && i18n.accountAuthErrPopupBlocked)
      || 'A böngésző blokkolta a bejelentkezési ablakot. Próbáld újra, vagy engedélyezd a felugró ablakokat.');
  if (msg && typeof showCustomAlert === 'function') {
    showCustomAlert(msg, 'info');
  }
}

function handleOAuthPopupBenignError(error, i18n, options) {
  if (!isOAuthPopupBenignError(error)) return false;
  const kind = getOAuthPopupErrorKind(error);
  const channel = (options && options.channel) || 'oauth';
  try {
    console.debug(`[auth][${channel}] benign OAuth popup error:`, kind, error && error.code);
  } catch (_) {}
  if (kind === 'closed') {
    showOAuthPopupInterruptedMessage(i18n || {});
  } else if (kind === 'blocked' || kind === 'connection') {
    showOAuthPopupBlockedMessage(i18n || {}, !!(options && options.redirectFallback));
  }
  return true;
}

async function tryOAuthPopupThenRedirect(auth, provider, providerId, i18n) {
  try {
    return await auth.signInWithPopup(provider);
  } catch (popupErr) {
    const kind = getOAuthPopupErrorKind(popupErr);
    authDebugLog('[oauth-popup]', 'popup failed', { providerId, kind, code: popupErr && popupErr.code });
    if (kind === 'closed' || kind === 'cancelled') {
      handleOAuthPopupBenignError(popupErr, i18n, { channel: providerId, redirectFallback: false });
      return null;
    }
    if (shouldOAuthPopupTryRedirectFallback(popupErr)) {
      if (kind === 'blocked' || kind === 'connection') {
        showOAuthPopupBlockedMessage(i18n || {}, true);
      }
      markOAuthRedirectStarted(providerId);
      setAuthBootLoading(true);
      await auth.signInWithRedirect(provider);
      return { redirected: true };
    }
    throw popupErr;
  }
}

try {
  window.isGurigoOAuthPopupBenignError = isOAuthPopupBenignError;
  window.getGurigoOAuthPopupErrorKind = getOAuthPopupErrorKind;
  window.__gurigoApplyNativeOAuthSignIn = function (user, reason) {
    return completeAppleOAuthSignIn(user, reason || 'native-oauth');
  };
} catch (_) {}

// OAuth redirect boot – getRedirectResult korai feldolgozása (mobil Apple/Google redirect)
window.__gurigoAuthBoot = window.__gurigoAuthBoot || {
  redirectPromise: null,
  completed: false,
  redirectReturn: false
};

function authDebugLog(channel, message, data) {
  try {
    var diagnostic = typeof window.gurigoIsDiagnosticConsole === 'function' && window.gurigoIsDiagnosticConsole();
    if (diagnostic && data !== undefined) {
      console.log(`[auth]${channel} ${message}`, data);
    } else {
      console.log(`[auth]${channel} ${message}`);
    }
  } catch (_) {}
}

function isOAuthRedirectReturn() {
  try {
    if (sessionStorage.getItem('__gurigo_oauth_redirect_pending')) return true;
    const combined = (window.location.search || '') + (window.location.hash || '');
    return /(^|[?&#&])(code|state|apiKey|authType|authUser|mode)=/i.test(combined)
      || /signInViaRedirect/i.test(combined);
  } catch (_) {
    return false;
  }
}

function markOAuthRedirectStarted(providerId) {
  try {
    sessionStorage.setItem('__gurigo_oauth_redirect_pending', providerId || 'oauth');
  } catch (_) {}
  window.__oauthRedirectBootPending = true;
  window.__iosRedirectPending = true;
  authDebugLog('[redirect]', 'marked redirect pending', { providerId: providerId || 'oauth' });
}

function clearOAuthRedirectMarker() {
  try { sessionStorage.removeItem('__gurigo_oauth_redirect_pending'); } catch (_) {}
}

function resolveAuthUserProviderId(user) {
  if (!user || !user.providerData || !user.providerData.length) return null;
  const apple = user.providerData.find(function (p) { return p && p.providerId === 'apple.com'; });
  if (apple) return 'apple.com';
  const google = user.providerData.find(function (p) { return p && p.providerId === 'google.com'; });
  if (google) return 'google.com';
  return user.providerData[0].providerId || null;
}

function setAuthBootLoading(active) {
  try {
    const splash = document.getElementById('splash-screen');
    const authScreen = document.getElementById('auth-screen');
    let overlay = document.getElementById('auth-boot-loading');
    if (active) {
      if (typeof window.setGurigoAuthBootState === 'function') window.setGurigoAuthBootState(true);
      if (splash) splash.classList.remove('hidden');
      if (authScreen) authScreen.classList.add('hidden');
      var appScreenBoot = document.getElementById('app');
      if (appScreenBoot) appScreenBoot.classList.add('hidden');
      if (!overlay && document.body) {
        overlay = document.createElement('div');
        overlay.id = 'auth-boot-loading';
        overlay.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-gray-100 dark:bg-gray-900';
        const i18n = (typeof translations !== 'undefined' && translations[(window.currentLang || 'hu')]) ? translations[window.currentLang || 'hu'] : {};
        overlay.innerHTML = '<div class="text-center px-6"><div class="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div><p class="text-sm text-gray-600 dark:text-gray-300">' + (i18n.authBootLoading || 'Bejelentkezés folyamatban…') + '</p></div>';
        document.body.appendChild(overlay);
      }
      if (overlay) overlay.classList.remove('hidden');
      authDebugLog('[ui]', 'auth boot loading ON');
    } else {
      if (typeof window.setGurigoAuthBootState === 'function') window.setGurigoAuthBootState(false);
      finishAuthBootUI();
    }
  } catch (e) {
    console.warn('[auth][ui] setAuthBootLoading failed:', e);
  }
}

function finishAuthBootUI() {
  try {
    const overlay = document.getElementById('auth-boot-loading');
    if (overlay) {
      overlay.classList.add('hidden');
      try { overlay.remove(); } catch (_) {}
    }
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('hidden');
      splash.style.display = 'none';
      if (window.GurigoBootMarks && typeof window.GurigoBootMarks.mark === 'function') {
        try { window.GurigoBootMarks.mark('splash_hidden'); } catch (_) {}
      }
      if (window.GurigoBootMarks && typeof window.GurigoBootMarks.mark === 'function') {
        try { window.GurigoBootMarks.mark('login_ui_visible'); } catch (_) {}
      }
    }
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app');
    const user = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if (user) {
      if (authScreen) authScreen.classList.add('hidden');
      if (appScreen) appScreen.classList.remove('hidden');
      if (typeof window.setAppShellChromeVisible === 'function') window.setAppShellChromeVisible(true);
      authDebugLog('[ui]', 'finishAuthBootUI → app shell', { uid: user.uid });
    } else {
      // Auth boot timeout / sikertelen redirect: user nélkül SOHA nem renderelhetünk app shellt
      if (typeof window.renderLoggedOutState === 'function') {
        window.renderLoggedOutState();
      } else {
        if (authScreen) authScreen.classList.remove('hidden');
        if (appScreen) appScreen.classList.add('hidden');
      }
      authDebugLog('[ui]', 'finishAuthBootUI → login screen');
    }
  } catch (e) {
    console.warn('[auth][ui] finishAuthBootUI failed:', e);
  }
}

function scheduleAuthStateApply(user, reason) {
  if (typeof handleAuthStateChange !== 'function') return;
  authDebugLog('[state]', 'scheduleAuthStateApply', { uid: user ? user.uid : null, reason: reason || '' });
  void Promise.resolve(handleAuthStateChange(user)).catch(function (err) {
    console.warn('[auth][state] handleAuthStateChange failed:', err);
  });
}

function getRedirectResultWithTimeout(timeoutMs) {
  var ms = typeof timeoutMs === 'number' ? timeoutMs : 10000;
  var settled = false;
  var timer = null;
  var timeoutPromise = new Promise(function (resolve) {
    timer = setTimeout(function () {
      if (settled) return;
      settled = true;
      authDebugLog('[redirect]', 'getRedirectResult timeout', { ms: ms });
      resolve(null);
    }, ms);
  });
  return Promise.race([
    firebase.auth().getRedirectResult().then(
      function (result) {
        if (timer) clearTimeout(timer);
        if (settled) return result;
        settled = true;
        return result;
      },
      function (err) {
        if (timer) clearTimeout(timer);
        if (settled) throw err;
        settled = true;
        throw err;
      }
    ),
    timeoutPromise
  ]);
}

function cleanOAuthRedirectUrl() {
  setTimeout(function () {
    try {
      const currentUrl = new URL(window.location.href);
      ['payment', 'session_id', 'code', 'state', 'apiKey', 'authType', 'authUser', 'mode'].forEach(function (k) {
        currentUrl.searchParams.delete(k);
      });
      var hash = currentUrl.hash || '';
      if (hash && /(apiKey|authType|code|state)=/i.test(hash)) {
        currentUrl.hash = '';
      }
      window.history.replaceState({}, document.title, currentUrl.toString());
      authDebugLog('[redirect]', 'URL cleaned after OAuth redirect');
    } catch (historyErr) {
      console.warn('[auth][redirect] URL cleanup failed:', historyErr);
    }
  }, 10);
}

function waitForAuthUserAfterRedirect(timeoutMs) {
  var ms = typeof timeoutMs === 'number' ? timeoutMs : 4000;
  return new Promise(function (resolve) {
    if (firebase.auth().currentUser) {
      resolve(firebase.auth().currentUser);
      return;
    }
    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      done = true;
      try { unsub(); } catch (_) {}
      resolve(firebase.auth().currentUser || null);
    }, ms);
    var unsub = firebase.auth().onAuthStateChanged(function (u) {
      if (!u || done) return;
      done = true;
      clearTimeout(timer);
      try { unsub(); } catch (_) {}
      resolve(u);
    });
  });
}

async function processOAuthRedirectOnLoad() {
  const wasOAuthReturn = isOAuthRedirectReturn();
  authDebugLog('[redirect]', 'getRedirectResult start', {
    href: window.location.href,
    hostname: window.location.hostname,
    authDomain: (firebase.app && firebase.app().options) ? firebase.app().options.authDomain : null,
    redirectReturn: wasOAuthReturn
  });
  try {
    const redirectResultTimeout = (wasOAuthReturn && isNativeIosShell()) ? 15000 : (wasOAuthReturn ? 12000 : 5000);
    const result = await getRedirectResultWithTimeout(redirectResultTimeout);
    const providerId = (result && result.credential && result.credential.providerId)
      || (result && result.user ? resolveAuthUserProviderId(result.user) : null);
    authDebugLog('[redirect]', 'getRedirectResult done', {
      hasUser: !!(result && result.user),
      hasCredential: !!(result && result.credential),
      providerId: providerId,
      currentUser: !!(firebase.auth().currentUser)
    });

    let user = (result && result.user) || firebase.auth().currentUser;
    const redirectWaitMs = isNativeIosShell() ? 10000 : 3000;
    if (!user && wasOAuthReturn) {
      authDebugLog('[redirect]', 'waiting for auth state after redirect', { waitMs: redirectWaitMs });
      user = await waitForAuthUserAfterRedirect(redirectWaitMs);
    }

    if (user) {
      await completeAppleOAuthSignIn(user, 'redirect-result');
      cleanOAuthRedirectUrl();
      return user;
    }

    authDebugLog('[redirect]', 'no user after redirect processing', {
      resultNull: !result || (!result.user && !result.credential),
      wasOAuthReturn: wasOAuthReturn
    });
    if (wasOAuthReturn && !firebase.auth().currentUser) {
      authDebugLog('[ui]', 'rendering login after failed OAuth redirect');
      scheduleAuthStateApply(null, 'redirect-no-user');
    }
    return null;
  } catch (err) {
    authDebugLog('[redirect]', 'getRedirectResult error', { code: err && err.code, message: err && err.message });
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
    if (err && (err.code === 'auth/web-storage-unsupported' || err.code === 'auth/operation-not-supported-in-this-environment')) {
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(i18n.authIosWebstorageWarningLogin || i18n.authAppleSignInFailed || 'Böngésző korlátozás. Engedélyezd a sütiket.', 'info');
      }
    } else if (err && err.code && err.code !== 'auth/cancelled-popup-request') {
      const appleMsg = mapAppleSignInErrorToMessage ? mapAppleSignInErrorToMessage(err, i18n || {}) : '';
      if (appleMsg && typeof showCustomAlert === 'function') {
        showCustomAlert(appleMsg, 'info');
      } else if (typeof showCustomAlert === 'function') {
        showCustomAlert(i18n.authAppleSignInFailed || i18n.authGoogleSignInFailed || 'A bejelentkezés nem sikerült.', 'info');
      }
    }
    const lateUser = firebase.auth().currentUser || await waitForAuthUserAfterRedirect(2000);
    if (lateUser) {
      scheduleAuthStateApply(lateUser, 'redirect-late-user');
      cleanOAuthRedirectUrl();
      return lateUser;
    }
    if (wasOAuthReturn && !firebase.auth().currentUser) {
      scheduleAuthStateApply(null, 'redirect-error-no-user');
    }
    return null;
  }
}

function startOAuthRedirectBootEarly() {
  if (typeof firebase === 'undefined' || !firebase.auth) return;
  const returning = isOAuthRedirectReturn();
  window.__gurigoAuthBoot.redirectReturn = returning;
  window.__oauthRedirectBootPending = returning;
  window.__iosRedirectPending = returning;
  if (returning) {
    authDebugLog('[redirect]', 'OAuth return detected at load');
    setAuthBootLoading(true);
  }
  var hardTimeoutTimer = null;
  var bootSettled = false;
  window.__gurigoAuthBoot.redirectPromise = Promise.race([
    processOAuthRedirectOnLoad(),
    new Promise(function (resolve) {
      hardTimeoutTimer = setTimeout(function () {
        if (bootSettled || (window.__gurigoAuthBoot && window.__gurigoAuthBoot.completed)) return;
        authDebugLog('[redirect]', 'auth boot hard timeout (12s)');
        resolve(null);
      }, 12000);
    })
  ]).finally(function () {
    bootSettled = true;
    if (hardTimeoutTimer) clearTimeout(hardTimeoutTimer);
    if (window.__gurigoAuthBoot.completed) return;
    window.__gurigoAuthBoot.completed = true;
    window.__oauthRedirectBootPending = false;
    window.__iosRedirectPending = false;
    clearOAuthRedirectMarker();
    setAuthBootLoading(false);
    authDebugLog('[redirect]', 'auth boot completed', {
      currentUser: !!(firebase.auth && firebase.auth().currentUser)
    });
  });
}

async function awaitAuthBootIfNeeded() {
  if (window.__gurigoAuthBoot && window.__gurigoAuthBoot.redirectPromise && !window.__gurigoAuthBoot.completed) {
    try {
      await Promise.race([
        window.__gurigoAuthBoot.redirectPromise,
        new Promise(function (r) { setTimeout(r, 13000); })
      ]);
    } catch (_) {}
  }
}

function isGuriGOIosNativeAppShellAuth() {
  try {
    if (isNativeIosShell()) return true;
    if (window.GuriGONative && window.GuriGONative.appShell === true && String(window.GuriGONative.platform || '').toLowerCase() === 'ios') {
      return true;
    }
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.gurigo) {
      return true;
    }
    return /GuriGO-iOS-App/i.test(String(navigator.userAgent || ''));
  } catch (_) {
    return false;
  }
}

async function notifyGuriGOIosNativeAuthBridge(user) {
  try {
    if (!isGuriGOIosNativeAppShellAuth()) return;
    if (!window.webkit || !window.webkit.messageHandlers || !window.webkit.messageHandlers.gurigo) return;
    if (!user) {
      window.webkit.messageHandlers.gurigo.postMessage({ type: 'authState', uid: null, idToken: null, email: null });
      return;
    }
    let idToken = null;
    try {
      idToken = await user.getIdToken(true);
    } catch (tokErr) {
      authDebugLog('[native-bridge]', 'getIdToken failed', { code: tokErr && tokErr.code });
    }
    window.webkit.messageHandlers.gurigo.postMessage({
      type: 'authState',
      uid: user.uid,
      email: user.email || null,
      idToken: idToken
    });
  } catch (err) {
    authDebugLog('[native-bridge]', 'notify failed', err);
  }
}

function isIosInAppBrowser() {
  if (!isIOSDevice()) return false;
  const ua = navigator.userAgent || '';
  const suspiciousTokens = [
    'FBAN', 'FBAV', 'FB_IAB', 'Instagram', 'Messenger', 'Line', 'GSA', 'Gmail',
    'YaBrowser', 'YaApp', 'VkIos', 'FxiOS', 'EdgiOS', 'Twitter', 'Snapchat', 'Pinterest'
  ];
  return suspiciousTokens.some(token => ua.includes(token));
}

function isGoogleDisallowedUserAgentError(error) {
  const msg = getAuthErrorMessage(error).toLowerCase();
  return msg.indexOf('disallowed_useragent') !== -1 || msg.indexOf('403') !== -1 && msg.indexOf('google') !== -1;
}

function showIosInAppBrowserHint() {
  try {
    if (!isIosInAppBrowser()) return;
    if (document.getElementById('ios-iab-warning')) return;
    const authScreen = document.getElementById('auth-screen');
    if (!authScreen) return;
    const warning = document.createElement('div');
    warning.id = 'ios-iab-warning';
    warning.className = 'mb-4 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-900 text-sm px-4 py-3 dark:bg-yellow-900/40 dark:border-yellow-700 dark:text-yellow-100';
    const i18n = (typeof translations !== 'undefined' && translations[(window.currentLang || 'hu')]) ? translations[window.currentLang || 'hu'] : {};
    warning.innerHTML = i18n.authIosTip || '📱 <strong>iOS tipp:</strong> A Google-belépés Safariban működik a legstabilabban. Ha itt nem sikerül, nyisd meg a Gurit <u>Safari</u> böngészőben.';
    authScreen.insertBefore(warning, authScreen.firstChild);
  } catch (_) {}
}

// In-app browserben blokkolja a Google gombot és mutat egy modalt
function blockGoogleInInAppBrowser() {
  if (!isIosInAppBrowser()) return false;
  
  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
  const fallback = {
    title: '🚫 Böngésző korlátozás',
    body: 'Ebben az alkalmazáson belüli böngészőben nem fejeződik be a Google-belépés. Kövesd az alábbi lépéseket, hogy Safariban folytasd.',
    subtitle: 'Ez az alkalmazáson belüli böngésző blokkolja a Google belépést.',
    step1: 'Koppints a jobb felső sarokban a <strong>⋯</strong> menüre',
    step2: 'Válaszd a <strong>"Megnyitás Safariban"</strong> opciót',
    step3: 'A Safari ablakban indítsd el a Google-belépést',
    hint: '💡 Tipp: Safariban stabilabban működik a Google bejelentkezés.',
    confirm: 'Megnyitom Safariban',
    cancel: 'Bezárás'
  };

  const copy = {
    title: i18n.authBrowserBlockTitle || i18n.authInAppBrowserBlockedTitle || fallback.title,
    body: i18n.authBrowserBlockBody || i18n.authInAppBrowserBlockedBody || fallback.body,
    subtitle: i18n.authBrowserBlockSubtitle || i18n.authInAppBrowserBlockedSubtitle || fallback.subtitle,
    step1: i18n.authBrowserBlockStep1 || i18n.authInAppBrowserBlockedStep1 || fallback.step1,
    step2: i18n.authBrowserBlockStep2 || i18n.authInAppBrowserBlockedStep2 || fallback.step2,
    step3: i18n.authBrowserBlockStep3 || i18n.authInAppBrowserBlockedStep3 || fallback.step3,
    hint: i18n.authBrowserBlockHint || i18n.authInAppBrowserBlockedHint || fallback.hint,
    confirm: i18n.authBrowserBlockConfirm || i18n.authInAppBrowserBlockedConfirm || fallback.confirm,
    cancel: i18n.authInAppBrowserBlockedCancel || i18n.cancel || fallback.cancel
  };

  const modalHtml = `
    <div class="space-y-4 text-left text-gray-800 dark:text-gray-100">
      <div class="flex items-start gap-4">
        <div class="w-14 h-14 rounded-2xl bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-200 flex items-center justify-center text-2xl">⚠️</div>
        <div class="space-y-1">
          <p class="font-semibold text-base leading-relaxed">${copy.body}</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">${copy.subtitle}</p>
        </div>
      </div>
      <div class="rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
        <ol class="list-decimal list-inside space-y-2 text-sm leading-relaxed">
          <li>${copy.step1}</li>
          <li>${copy.step2}</li>
          <li>${copy.step3}</li>
        </ol>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400">${copy.hint}</p>
    </div>`;
  
  if (typeof showCustomAlert === 'function') {
    showCustomAlert(modalHtml, 'warning', null, {
      allowHTML: true,
      confirmText: copy.confirm,
      cancelText: copy.cancel,
      confirmClass: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md',
      cancelClass: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200'
    });
  } else {
    alert(copy.body.replace(/<[^>]+>/g, ' '));
  }
  return true; // blocked
}

// ---------------------------
//  Bejelentkezés (Email+Jelszó)
// ---------------------------
async function handleEmailLoginSubmit() {
  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
  const emailEl = document.getElementById('email');
  const passEl  = document.getElementById('password');
  const btn     = document.getElementById('login-button-email');

  if (typeof window.syncFirebaseAuthLanguageWithCurrentLang === 'function') {
    try { window.syncFirebaseAuthLanguageWithCurrentLang(); } catch (_) {}
  }

  // Sanitize email (trim + remove zero-width spaces & invisible chars)
  const sanitizeEmail = (v) => (v||'').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').trim();
  const email = sanitizeEmail(emailEl?.value);
  const password = passEl?.value || '';

  // Extra: revalidálás submit előtt
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email || '')) {
    // UI: jelöld hibásnak, jelezd felhasználónak és fókuszálj a mezőre
    try {
      if (emailEl) emailEl.value = email; // írd vissza a tisztított értéket
      emailEl?.classList?.add('border-red-500', 'border-2');
      const next = emailEl?.nextElementSibling;
      if (!(next && next.classList && next.classList.contains('email-error')) && emailEl && emailEl.insertAdjacentHTML) {
        emailEl.insertAdjacentHTML('afterend', `<p class="text-xs text-red-600 dark:text-red-400 mt-1 email-error">${i18n.authInvalidEmailFormat || '❌ Érvénytelen email formátum'}</p>`);
      }
    } catch(_) {}
    if (typeof showCustomAlert === 'function') showCustomAlert(i18n.authInvalidEmailFormat || '❌ Érvénytelen email formátum', 'info');
    try { emailEl?.focus(); } catch(_) {}
    return;
  } else {
    // Tisztítsd a korábban megmaradt hibát
    try {
      if (emailEl) emailEl.value = email;
      emailEl?.classList?.remove('border-red-500');
      emailEl?.classList?.add('border-green-500', 'border-2');
      const cont = emailEl?.parentElement || emailEl;
      const errs = cont && cont.querySelectorAll ? cont.querySelectorAll('.email-error') : [];
      if (errs && errs.length) errs.forEach((e)=>{ try{ e.remove(); }catch(_){} });
    } catch(_) {}
  }

  if (!email || !password) {
    if (typeof showCustomAlert === 'function') {
      const msg = i18n.alertFillAllFields || 'Kérlek töltsd ki az összes mezőt!';
      showCustomAlert(msg, 'info');
    }
    return;
  }

  // Remember me (ha van checkbox)
  const rememberMe = document.getElementById('remember-me')?.checked || false;

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = i18n.authLoginButtonLoading || 'Bejelentkezés…';
    }

    // iOS Private Browsing és Safari eset: web-storage-unsupported fallback NONE-ra
    try {
      const isiOS = isIOSDevice();
      const sessionAccessible = isSessionStorageAccessible();
      const localAccessible = isLocalStorageAccessible();
      
      console.log('[Auth] Storage accessibility check:', { isiOS, sessionAccessible, localAccessible });
      
      let persistence;
      if (localAccessible) {
        persistence = firebase.auth.Auth.Persistence.LOCAL;
      } else if (sessionAccessible) {
        persistence = firebase.auth.Auth.Persistence.SESSION;
      } else {
        persistence = firebase.auth.Auth.Persistence.NONE;
        console.log('[Auth] Using NONE persistence due to storage restrictions');
      }
      
      await firebase.auth().setPersistence(persistence);
      console.log('[Auth] Persistence set to:', persistence);
    } catch (perr) {
      console.warn('Persistence set failed, falling back:', perr);
      if (perr && (perr.code === 'auth/web-storage-unsupported' || perr.code === 'auth/operation-not-supported-in-this-environment')) {
        try { 
          await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE); 
          console.log('[Auth] Fallback to NONE persistence successful');
        } catch(_) {
          console.error('[Auth] All persistence attempts failed');
        }
      } else {
        // Re-throw unexpected errors
        throw perr;
      }
    }

    await firebase.auth().signInWithEmailAndPassword(email, password);

    // Siker: minden maradék UI hiba eltávolítása
    try {
      if (emailEl) {
        emailEl.classList.remove('border-red-500');
        const err = emailEl.nextElementSibling;
        if (err && err.classList && err.classList.contains('email-error')) err.remove();
      }
    } catch(_) {}

    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    // Siker esetén az onAuthStateChanged tovább visz
  } catch (error) {
    console.error('Login error:', error);
    let msg = i18n.authUnknownError || 'Ismeretlen hiba történt';
    const code = error && error.code;
    const isAuthError = code && typeof code === 'string' && code.indexOf('auth/') === 0;
    
    switch (code) {
      case 'auth/user-not-found':        msg = i18n.authUserNotFound || '❌ Nincs ilyen felhasználó. Regisztrálj!'; break;
      case 'auth/wrong-password':        msg = i18n.authWrongPassword || '❌ Helytelen jelszó'; break;
      case 'auth/invalid-email':         msg = i18n.authInvalidEmailFormat || '❌ Érvénytelen email formátum'; break;
      case 'auth/too-many-requests':     msg = i18n.authTooManyRequests || '⏳ Túl sok próbálkozás. Próbáld újra később.'; break;
      case 'auth/user-disabled':         msg = i18n.authUserDisabled || '🚫 Ez a fiók le lett tiltva'; break;
      case 'auth/network-request-failed':msg = i18n.authNoNetwork || '📡 Nincs internetkapcsolat'; break;
      case 'auth/web-storage-unsupported':
      case 'auth/operation-not-supported-in-this-environment':
        msg = i18n.authIosWebstorageWarningLogin || '🍏 iOS böngésző korlátozás. Kapcsold ki a Privát böngészést, és engedélyezd a sütiket, majd próbáld újra.'; break;
      default:
        // Ismeretlen, de továbbra is auth/* hiba → kezeld általános login hibaként
        if (isAuthError) {
          msg = i18n.authGenericBadCredentials || '❌ Hibás e-mail cím vagy jelszó';
        }
        break;
    }

    const isExpectedAuthError = isAuthError && isExpectedAuthUserErrorCode(code);

    if (isExpectedAuthError || typeof window.showDetailedError !== 'function') {
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(msg, 'info');
      }
    } else if (typeof window.showDetailedError === 'function') {
      // Nem várt / rendszer jellegű hiba → részletes hibajegy Firestore-ba
      window.showDetailedError(error, 'Bejelentkezés', { email: email, userFacing: true });
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = i18n.authLoginButton || 'Bejelentkezés';
    }
  }
}

// ---------------------------
//  Regisztráció (Email+Jelszó)
// ---------------------------
async function handleEmailRegistrationSubmit() {
  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
  const emailEl   = document.getElementById('register-email');
  const passEl    = document.getElementById('register-password');
  const pass2El   = document.getElementById('register-password-confirm');
  const btn       = document.getElementById('register-button');

  if (typeof window.syncFirebaseAuthLanguageWithCurrentLang === 'function') {
    try { window.syncFirebaseAuthLanguageWithCurrentLang(); } catch (_) {}
  }

  const email = emailEl?.value?.trim();
  const pass  = passEl?.value || '';
  const pass2 = pass2El?.value || '';
  const termsCheckbox = document.getElementById('register-terms-checkbox');

  if (!email || !pass || !pass2) {
    if (typeof showCustomAlert === 'function') {
      const msg = i18n.alertFillAllFields || 'Kérlek töltsd ki az összes mezőt!';
      showCustomAlert(msg, 'info');
    }
    return;
  }
  if (termsCheckbox && !termsCheckbox.checked) {
    if (typeof showCustomAlert === 'function') {
      const msg = i18n.authTermsNotAccepted || 'El kell fogadnod a Felhasználási feltételeket és az Adatvédelmi szabályzatot!';
      showCustomAlert(msg, 'info');
    }
    return;
  }
  if (pass.length < 6) {
    if (typeof showCustomAlert === 'function') {
      const msg = i18n.authPasswordTooShort || 'A jelszónak legalább 6 karakter hosszúnak kell lennie.';
      showCustomAlert(msg, 'info');
    }
    return;
  }
  if (pass !== pass2) {
    if (typeof showCustomAlert === 'function') {
      const msg = i18n.authPasswordsDontMatch || 'A két jelszó nem egyezik.';
      showCustomAlert(msg, 'info');
    }
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = i18n.authRegisterButtonLoading || 'Regisztráció…';
    }

    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, pass);
    // Regisztráció sikeres - azonnal naplózzuk a legal acceptance-t
    if (userCredential && userCredential.user) {
      try {
        // Várjuk meg, hogy az ensureUserProfile lefusson
        if (typeof ensureUserProfile === 'function') {
          await ensureUserProfile(userCredential.user.uid);
        }
        // Naplózzuk a terms elfogadást (a checkbox már be van pipálva)
        if (typeof window.logTermsAcceptanceForUser === 'function') {
          await window.logTermsAcceptanceForUser(userCredential.user.uid, {});
        }
        // Tracking adatok mentése (UTM paraméterek - first-touch & last-touch)
        if (typeof window.utmTracker !== 'undefined' && typeof window.utmTracker.saveTrackingToFirestore === 'function') {
          await window.utmTracker.saveTrackingToFirestore(userCredential.user.uid);
          console.log('[Auth] UTM tracking data saved for new user');
        }
      } catch(logErr) {
        console.warn('Legal acceptance logging after registration failed:', logErr);
      }
    }

  } catch (error) {
    console.error('Registration error:', error);
    let msg = i18n.authUnknownError || 'Ismeretlen hiba történt';
    const code = error && error.code;
    const isAuthError = code && typeof code === 'string' && code.indexOf('auth/') === 0;
    
    switch (code) {
      case 'auth/email-already-in-use':
        // Speciális flow: már létező email – ne logoljuk hibajegyként
        if (typeof window.showEmailAlreadyInUseRegistrationModal === 'function') {
          window.showEmailAlreadyInUseRegistrationModal(email, { source: 'auth' });
        } else if (typeof showCustomAlert === 'function') {
          const m = i18n.authEmailInUse || 'Ez az e-mail már használatban van.';
          showCustomAlert(m, 'info');
        }
        return;
      case 'auth/invalid-email':         msg = 'Érvénytelen e-mail cím.'; break;
      case 'auth/weak-password':         msg = i18n.authWeakPassword || 'Gyenge jelszó. (Min. 6 karakter)'; break;
      case 'auth/network-request-failed':msg = i18n.authNoNetwork || '📡 Nincs internetkapcsolat'; break;
      case 'auth/web-storage-unsupported':
      case 'auth/operation-not-supported-in-this-environment':
        msg = i18n.authIosWebstorageWarningRegister || '🍏 iOS böngésző korlátozás. Kapcsold ki a Privát böngészést, és engedélyezd a sütiket.'; break;
      default:
        // Ismeretlen hiba - részletes hibaüzenet
        break;
    }

    const isExpectedAuthError = isAuthError && isExpectedAuthUserErrorCode(code);

    if (isExpectedAuthError || typeof window.showDetailedError !== 'function') {
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(msg, 'info');
      }
    } else if (typeof window.showDetailedError === 'function') {
      window.showDetailedError(error, 'Regisztráció', { email: email, userFacing: true });
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = i18n.authRegisterButton || 'Regisztráció';
    }
  }
}

// ---------------------------
//  Google belépés – HIÁNYZÓ FUNKCIÓ PÓTLÁSA
// ---------------------------
async function signInWithGoogle() {
  const btn = document.getElementById('login-button-google');
  const isiOS = isIOSDevice();
  const isStandalone = (window.navigator.standalone === true) || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  const i18nEarly = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
  if (typeof window.syncFirebaseAuthLanguageWithCurrentLang === 'function') {
    try { window.syncFirebaseAuthLanguageWithCurrentLang(); } catch (_) {}
  }

  // iOS natív app shell (WKWebView): Google OAuth tiltott → natív Google Sign-In bridge
  if (isGuriGOIosNativeAppShellAuth()) {
    authDebugLog('[google]', 'native iOS shell → nativeGoogleSignIn bridge');
    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = i18nEarly.authGoogleButtonLoading || 'Csatlakozás Google-lel…';
      }
      if (window.GuriGONativeAuthBridge && typeof window.GuriGONativeAuthBridge.signInWithGoogleViaNative === 'function') {
        await window.GuriGONativeAuthBridge.signInWithGoogleViaNative();
        const user = firebase.auth().currentUser;
        if (user) await completeAppleOAuthSignIn(user, 'google-native-shell');
        return;
      }
      const msg = i18nEarly.authNativeGoogleUnavailable
        || 'A Google bejelentkezés az alkalmazásban nem érhető el. Használd az e-mail bejelentkezést, vagy frissítsd az appot.';
      if (typeof showCustomAlert === 'function') showCustomAlert(msg, 'info');
      else alert(msg);
    } catch (nativeErr) {
      authDebugLog('[google]', 'native sign-in failed', nativeErr);
      const code = nativeErr && (nativeErr.nativeAuthCode || nativeErr.message || '');
      const cancelled = code === 'cancelled' || String(nativeErr && nativeErr.message || '').indexOf('megszak') !== -1;
      if (!cancelled) {
        let msg = i18nEarly.authGoogleSignInFailed || 'A Google bejelentkezés nem sikerült.';
        if (code === 'google_config_missing' || String(code).indexOf('google_config') !== -1) {
          msg = i18nEarly.authNativeGoogleConfigMissing
            || 'A Google bejelentkezés nincs beállítva az appban. Töltsd le a valódi GoogleService-Info.plist fájlt a Firebase Console-ból, és építsd újra az appot.';
        } else if (nativeErr.message === 'native_google_timeout') {
          msg = i18nEarly.authNativeGoogleTimeout
            || 'A Google megerősítés túl sokáig tartott. Próbáld újra, és a telefonon megjelenő kérdésre válaszolj hamarabb.';
        } else if (code === 'bridge_unavailable') {
          msg = i18nEarly.authNativeGoogleUnavailable
            || 'A Google bejelentkezéshez frissítsd az appot. Addig használd az e-mail bejelentkezést.';
        } else if (nativeErr.code && String(nativeErr.code).indexOf('auth/') === 0 && nativeErr.message) {
          msg = nativeErr.message;
        }
        if (typeof showCustomAlert === 'function') showCustomAlert(msg, 'info');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        const label = i18nEarly.authGoogleButtonLabel || 'Folytatás Google fiókkal';
        btn.innerHTML = getGoogleButtonMarkup(label);
      }
    }
    return;
  }
  
  // === iOS IN-APP BROWSER BLOCK ===
  // Messenger/FB/Instagram in-app browserben a Google OAuth 403 disallowed_useragent hibát ad
  if (blockGoogleInInAppBrowser()) {
    console.log('[Auth] Google login blocked: iOS in-app browser detected');
    return; // Ne folytassuk - modal megjelent a megoldással
  }
  
  if (isiOS) {
    showIosInAppBrowserHint();
  }
  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = i18n.authGoogleButtonLoading || 'Csatlakozás Google-lel…';
    }
    
    const provider = new firebase.auth.GoogleAuthProvider();

    // iOS: popup-first stratégia redirect fallback-kel
    if (isiOS) {
      console.log('[Auth] iOS detected → trying popup first, fallback to redirect');
      try {
        // KRITIKUS FIX: Intelligens persistence választás
        const sessionAccessible = isSessionStorageAccessible();
        const localAccessible = isLocalStorageAccessible();
        
        let persistence;
        if (localAccessible) {
          persistence = firebase.auth.Auth.Persistence.LOCAL;
          console.log('[Auth] iOS: Using LOCAL persistence');
        } else if (sessionAccessible) {
          persistence = firebase.auth.Auth.Persistence.SESSION;
          console.log('[Auth] iOS: Using SESSION persistence');
        } else {
          persistence = firebase.auth.Auth.Persistence.NONE;
          console.log('[Auth] iOS: Using NONE persistence (no storage available)');
        }
        
        await firebase.auth().setPersistence(persistence);
        console.log('[Auth] iOS: Persistence set successfully');
      } catch (persistErr) {
        console.warn('[Auth] iOS persistence setting failed, trying fallback:', persistErr);
        // Fallback: NONE (memory only)
        try {
          await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
          console.log('[Auth] iOS: Fallback to NONE persistence');
        } catch (fallbackErr) {
          console.warn('[Auth] iOS: All persistence failed, continuing anyway:', fallbackErr);
        }
      }
      
      // Először popup próba
      try {
        const result = await firebase.auth().signInWithPopup(provider);
        console.log('[Auth] iOS popup login OK');
        // localStorage fallback: mentjük a user uid-et
        if (result?.user?.uid && localAccessible) {
          try {
            localStorage.setItem('__gurigo_last_auth_uid', result.user.uid);
            console.log('[Auth] iOS: Saved user UID to localStorage fallback');
          } catch (_) {}
        }
        return;
      } catch (popupErr) {
        authDebugLog('[google]', 'iOS popup failed', { kind: getOAuthPopupErrorKind(popupErr) });
        if (getOAuthPopupErrorKind(popupErr) === 'closed' || getOAuthPopupErrorKind(popupErr) === 'cancelled') {
          handleOAuthPopupBenignError(popupErr, i18n, { channel: 'google', redirectFallback: false });
          return;
        }
        markOAuthRedirectStarted('google.com');
        setAuthBootLoading(true);
        await firebase.auth().signInWithRedirect(provider);
        return;
      }
    }
    
    // PWA/Standalone: Először próbáljuk POPUP-ot (működhet modern eszközökön!)
    if (isStandalone) {
      console.log('[Auth] PWA mode: Trying popup first...');
      try {
        await firebase.auth().signInWithPopup(provider);
        console.log('[Auth] PWA popup success!');
        return;
      } catch (popupErr) {
        authDebugLog('[google]', 'PWA popup failed', { kind: getOAuthPopupErrorKind(popupErr) });
        if (getOAuthPopupErrorKind(popupErr) === 'closed' || getOAuthPopupErrorKind(popupErr) === 'cancelled') {
          handleOAuthPopupBenignError(popupErr, i18n, { channel: 'google', redirectFallback: false });
          return;
        }
        markOAuthRedirectStarted('google.com');
        setAuthBootLoading(true);
        await firebase.auth().signInWithRedirect(provider);
        return;
      }
    }

    const popupResult = await tryOAuthPopupThenRedirect(firebase.auth(), provider, 'google.com', i18n);
    if (popupResult && popupResult.redirected) {
      return;
    }
  } catch (error) {
    if (handleOAuthPopupBenignError(error, i18n, { channel: 'google', redirectFallback: false })) {
      return;
    }
    if (isGoogleDisallowedUserAgentError(error) && isGuriGOIosNativeAppShellAuth()
        && window.GuriGONativeAuthBridge && typeof window.GuriGONativeAuthBridge.signInWithGoogleViaNative === 'function') {
      authDebugLog('[google]', 'disallowed_useragent → retry native bridge');
      try {
        await window.GuriGONativeAuthBridge.signInWithGoogleViaNative();
        return;
      } catch (nativeRetryErr) {
        authDebugLog('[google]', 'native retry failed', nativeRetryErr);
      }
    }
    console.error('Google sign-in error:', error);
    if (typeof showCustomAlert === 'function') {
      let msg;
      if (isGoogleDisallowedUserAgentError(error)) {
        msg = i18n.authNativeGoogleWebViewBlocked
          || 'A Google nem engedi a bejelentkezést az app beépített böngészőjében. Próbáld újra, vagy jelentkezz be e-maillel.';
      } else if (error && error.code === 'auth/web-storage-unsupported') {
        msg = i18n.authGoogleIosWarning || '🍏 iOS korlátozás. Kapcsold ki a Privát böngészést és engedélyezd a sütiket, majd próbáld újra.';
      } else {
        msg = i18n.authGoogleSignInFailed || 'A Google bejelentkezés nem sikerült.';
      }
      showCustomAlert(msg, 'info');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      const label = i18n.authGoogleButtonLabel || 'Folytatás Google fiókkal';
      btn.innerHTML = getGoogleButtonMarkup(label);
    }
  }
}

// ---------------------------
//  Apple belépés (Firebase OAuthProvider)
// ---------------------------
async function ensureOAuthPersistenceForRedirect() {
  try {
    // Intelligent persistence detection: LOCAL → SESSION → NONE
    const sessionAccessible = isSessionStorageAccessible();
    const localAccessible = isLocalStorageAccessible();
    
    authDebugLog('[apple]', 'storage check', { localAccessible, sessionAccessible });
    
    let persistence;
    if (localAccessible) {
      persistence = firebase.auth.Auth.Persistence.LOCAL;
      authDebugLog('[apple]', 'using LOCAL persistence');
    } else if (sessionAccessible) {
      persistence = firebase.auth.Auth.Persistence.SESSION;
      authDebugLog('[apple]', 'using SESSION persistence');
    } else {
      persistence = firebase.auth.Auth.Persistence.NONE;
      authDebugLog('[apple]', 'using NONE persistence (no storage available)');
    }
    
    await firebase.auth().setPersistence(persistence);
    authDebugLog('[apple]', 'persistence set successfully', { persistence });
  } catch (perr) {
    authDebugLog('[apple]', 'persistence set failed, fallback to NONE', { code: perr && perr.code });
    if (perr && (perr.code === 'auth/web-storage-unsupported' || perr.code === 'auth/operation-not-supported-in-this-environment')) {
      try {
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
        authDebugLog('[apple]', 'fallback to NONE successful');
      } catch (fallbackErr) {
        authDebugLog('[apple]', 'all persistence attempts failed', { error: fallbackErr });
      }
    } else {
      throw perr;
    }
  }
}

function createAppleAuthProvider() {
  const provider = new firebase.auth.OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  const locale = (typeof currentLang === 'string' && currentLang) ? currentLang : 'hu';
  provider.setCustomParameters({ locale: locale || 'hu' });
  return provider;
}

function shouldPreferRedirectOAuth() {
  const isStandalone = (window.navigator.standalone === true) || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const isWebView = /\bwv\b|WebView|FBAN|FBAV|Instagram|Line|GSA/i.test(ua);
  return isIOSDevice() || isStandalone || isWebView || isMobileUA;
}

function getAppleButtonMarkup(i18n) {
  const label = i18n.authContinueWithApple || 'Folytatás Apple-lel';
  return `<svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.37 12.56c.02 2.17 1.9 2.9 1.92 2.91-.02.05-.3 1.02-.98 2.02-.59.86-1.2 1.72-2.17 1.74-.95.02-1.25-.56-2.33-.56-1.08 0-1.42.54-2.31.58-.93.03-1.63-.92-2.23-1.78-1.22-1.76-2.16-4.97-.91-7.13.62-1.07 1.73-1.75 2.93-1.77.91-.02 1.78.61 2.33.61.55 0 1.58-.75 2.66-.64.45.02 1.72.18 2.54 1.38-.07.04-1.51.88-1.49 2.64zM14.62 5.39c.5-.61.84-1.45.75-2.29-.72.03-1.59.48-2.1 1.08-.46.53-.86 1.38-.75 2.2.81.06 1.61-.41 2.1-.99z"/></svg><span>${label}</span>`;
}

function getGoogleButtonMarkup(label) {
  return `<svg class="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107"></path><path d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00"></path><path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" fill="#4CAF50"></path><path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.215,44,30.035,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2"></path></svg><span>${label}</span>`;
}

async function completeAppleOAuthSignIn(user, reason) {
  if (!user) return;
  if (isLocalStorageAccessible()) {
    try { localStorage.setItem('__gurigo_last_auth_uid', user.uid); } catch (_) {}
  }
  clearOAuthRedirectMarker();
  window.__oauthRedirectBootPending = false;
  window.__iosRedirectPending = false;
  scheduleAuthStateApply(user, reason || 'apple-sign-in');
  await notifyGuriGOIosNativeAuthBridge(user);
}

async function signInWithAppleViaPopup(provider, i18n, options) {
  const opts = options || {};
  const allowRedirectFallback = opts.allowRedirectFallback !== false;
  const channel = opts.channel || 'apple.com';
  try {
    const result = await firebase.auth().signInWithPopup(provider);
    if (result && result.user) {
      await completeAppleOAuthSignIn(result.user, opts.successReason || 'apple-popup');
    }
    return { ok: true, result: result };
  } catch (popupErr) {
    authDebugLog('[apple]', 'popup failed', {
      code: popupErr && popupErr.code,
      nativeShell: isNativeIosShell(),
      allowRedirectFallback: allowRedirectFallback
    });
    if (popupErr && popupErr.code === 'auth/cancelled-popup-request') {
      return { ok: false, cancelled: true };
    }
    if (popupErr && popupErr.code === 'auth/popup-closed-by-user') {
      handleOAuthPopupBenignError(popupErr, i18n, { channel: 'apple', redirectFallback: false });
      return { ok: false, cancelled: true };
    }
    if (!allowRedirectFallback) {
      throw popupErr;
    }
    if (shouldOAuthPopupTryRedirectFallback(popupErr)) {
      markOAuthRedirectStarted(channel);
      setAuthBootLoading(true);
      await firebase.auth().signInWithRedirect(provider);
      return { ok: true, redirected: true };
    }
    throw popupErr;
  }
}

function mapAppleSignInErrorToMessage(error, i18n) {
  if (isOAuthPopupBenignError(error)) {
    return '';
  }
  const code = error && error.code;
  switch (code) {
    case 'auth/account-exists-with-different-credential':
      return i18n.authAppleAccountExistsDifferentCredential || i18n.authAppleSignInFailed || i18n.authUnknownError || '';
    case 'auth/popup-closed-by-user':
      return i18n.authApplePopupClosedByUser || i18n.authSignInInterrupted || i18n.authUnknownError || '';
    case 'auth/popup-blocked':
      return i18n.accountAuthErrPopupBlocked || i18n.authApplePopupBlockedFallback || '';
    case 'auth/credential-already-in-use':
      return i18n.authAppleCredentialAlreadyInUse || i18n.authAppleSignInFailed || i18n.authUnknownError || '';
    case 'auth/web-storage-unsupported':
    case 'auth/operation-not-supported-in-this-environment':
      return i18n.authGoogleIosWarning || i18n.authAppleSignInFailed || i18n.authUnknownError || '';
    default:
      return i18n.authAppleSignInFailed || i18n.authUnknownError || '';
  }
}

async function signInWithApple() {
  const btn = document.getElementById('login-button-apple');
  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
  const preferRedirect = shouldPreferRedirectOAuth();

  authDebugLog('[apple]', 'signInWithApple start', { preferRedirect: preferRedirect });

  if (typeof window.syncFirebaseAuthLanguageWithCurrentLang === 'function') {
    try { window.syncFirebaseAuthLanguageWithCurrentLang(); } catch (_) {}
  }

  const provider = createAppleAuthProvider();

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = i18n.authAppleButtonLoading || 'Csatlakozás Apple-lel…';
    }

    await ensureOAuthPersistenceForRedirect();

    // Natív iOS app: WKWebView popup/iframe → AppSSO subframe hiba. Csak natív Sign in with Apple.
    if (isNativeIosShell() || isGuriGOIosNativeAppShellAuth()) {
      authDebugLog('[apple]', 'native iOS shell → nativeAppleSignIn bridge');
      if (window.GuriGONativeAuthBridge && typeof window.GuriGONativeAuthBridge.signInWithAppleViaNative === 'function') {
        await window.GuriGONativeAuthBridge.signInWithAppleViaNative();
        const user = firebase.auth().currentUser;
        if (user) await completeAppleOAuthSignIn(user, 'apple-native-shell');
        return;
      }
      const msg = i18n.authNativeAppleUnavailable
        || 'Az Apple bejelentkezéshez frissítsd az appot. Addig használd az e-mail bejelentkezést.';
      if (typeof showCustomAlert === 'function') showCustomAlert(msg, 'info');
      return;
    }

    // Mobil Safari / PWA: popup-first, redirect csak fallback
    if (preferRedirect) {
      authDebugLog('[apple]', 'mobile/PWA → popup first, redirect fallback');
      const mobilePopup = await signInWithAppleViaPopup(provider, i18n, {
        allowRedirectFallback: true,
        successReason: 'apple-popup-mobile'
      });
      if (mobilePopup && (mobilePopup.cancelled || mobilePopup.redirected)) return;
      return;
    }

    authDebugLog('[apple]', 'desktop popup');
    const popupResult = await tryOAuthPopupThenRedirect(firebase.auth(), provider, 'apple.com', i18n);
    if (popupResult && popupResult.redirected) {
      return;
    }
    if (popupResult && firebase.auth().currentUser) {
      await completeAppleOAuthSignIn(firebase.auth().currentUser, 'apple-popup-desktop');
    }
  } catch (error) {
    if (error && error.code === 'auth/cancelled-popup-request') {
      return;
    }
    const nativeCode = error && (error.nativeAuthCode || '');
    if (nativeCode === 'cancelled') {
      return;
    }
    if (handleOAuthPopupBenignError(error, i18n, { channel: 'apple', redirectFallback: false })) {
      return;
    }
    console.error('[auth][apple] sign-in error:', error);
    let msg = '';
    if ((isNativeIosShell() || isGuriGOIosNativeAppShellAuth()) && error && error.message) {
      const code = error.code || error.nativeAuthCode || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-disabled') {
        msg = mapAppleSignInErrorToMessage(error, i18n || {});
      } else if (String(error.message).indexOf('native_') === 0 || String(error.message).length > 3) {
        msg = error.message;
      }
    }
    if (!msg) {
      msg = mapAppleSignInErrorToMessage(error, i18n || {});
    }
    if (!msg && (isNativeIosShell() || isGuriGOIosNativeAppShellAuth())) {
      msg = i18n.authNativeAppleUnavailable || i18n.authAppleSignInFailed || '';
    }
    if (msg && typeof showCustomAlert === 'function') {
      showCustomAlert(msg, 'info');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = getAppleButtonMarkup(i18n || {});
    }
  }
}

// ---------------------------
//  Email validáció (valós idő)
// ---------------------------
function initEmailValidation() {
  const emailInputs = ['email', 'register-email'];
  emailInputs.forEach((inputId) => {
    const input = document.getElementById(inputId);
    if (!input) return;

    const removeError = (el) => {
      try {
        const cont = el.parentElement || el;
        const err = cont.querySelector && cont.querySelector('.email-error');
        if (err) err.remove();
      } catch(_) {}
    };

    input.addEventListener('blur', function () {
      const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const val = (this.value || '').trim();
      // Csak akkor jelezz hibát, ha a felhasználó szerkesztette (touched)
      const touched = this && this.dataset && this.dataset.touched === '1';
      if (touched && val && !emailRegex.test(val)) {
        this.classList.add('border-red-500', 'border-2');
        this.classList.remove('border-gray-200', 'focus:border-blue-500');
        const cont = this.parentElement || this;
        const exists = cont.querySelector && cont.querySelector('.email-error');
        if (!exists && this.insertAdjacentHTML) {
          this.insertAdjacentHTML('afterend', `<p class="text-xs text-red-600 dark:text-red-400 mt-1 email-error">${i18n.authInvalidEmailFormat || '❌ Érvénytelen email formátum'}</p>`);
        }
      } else if (val) {
        this.classList.remove('border-red-500');
        this.classList.add('border-green-500', 'border-2');
        removeError(this);
      } else {
        this.classList.remove('border-red-500', 'border-green-500', 'border-2');
        this.classList.add('border-gray-200');
        removeError(this);
      }
    });

    const clearOnChange = function () {
      removeError(this);
      this.classList.remove('border-red-500', 'border-green-500', 'border-2');
      this.classList.add('border-gray-200');
      // Jelöld, hogy a felhasználó szerkesztette
      try { this.dataset.touched = '1'; } catch(_) {}
    };
    input.addEventListener('input', clearOnChange);
    input.addEventListener('change', clearOnChange);
    input.addEventListener('keydown', function(){ try { this.dataset.touched = '1'; } catch(_) {} });
    input.addEventListener('focus', function(){ removeError(this); });
  });
}
window.initEmailValidation = initEmailValidation;

// ---------------------------
//  Caps Lock figyelmeztetés
// ---------------------------
function initCapsLockWarning() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach((input) => {
    let warningElement = null;

    input.addEventListener('keyup', (e) => {
      const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
      const isCapsLockOn = e.getModifierState && e.getModifierState('CapsLock');
      if (isCapsLockOn && !warningElement) {
        warningElement = document.createElement('p');
        warningElement.className =
          'text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1 caps-warning';
        warningElement.innerHTML = i18n.authCapsLockWarning || '⚠️ <span>Caps Lock be van kapcsolva</span>';
        input.parentElement.insertAdjacentElement('afterend', warningElement);
      } else if (!isCapsLockOn && warningElement) {
        warningElement.remove();
        warningElement = null;
      }
    });

    input.addEventListener('blur', () => {
      if (warningElement) {
        warningElement.remove();
        warningElement = null;
      }
    });
  });
}
window.initCapsLockWarning = initCapsLockWarning;

// ---------------------------
//  Forgot password
// ---------------------------
async function handleForgotPassword() {
  const emailInput = document.getElementById('email');
  const initialEmail = emailInput && emailInput.value ? emailInput.value.trim() : '';
  showForgotPasswordModal(initialEmail);
}

function getForgotPasswordTexts() {
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  if (lang === 'de') {
    return {
      link: i18n.authForgotPassword || 'Passwort vergessen?',
      title: i18n.authForgotPasswordTitle || 'Passwort zurücksetzen',
      message: i18n.authForgotPasswordMessage || 'Gib die E-Mail-Adresse ein, mit der du dich registriert hast. Wenn ein Konto mit dieser Adresse existiert, senden wir dir eine E-Mail zum Zurücksetzen des Passworts.',
      cancel: i18n.authForgotPasswordCancel || 'Abbrechen',
      submit: i18n.authForgotPasswordSubmit || 'Passwort zurücksetzen',
      success: i18n.authForgotPasswordSuccess || 'Wenn es ein Konto mit dieser E-Mail-Adresse gibt, haben wir dir eine E-Mail zum Zurücksetzen des Passworts gesendet. Bitte prüfe auch deinen Spam-Ordner.',
      invalidEmail: i18n.authForgotPasswordInvalidEmail || 'Bitte gib eine gültige E-Mail-Adresse ein.',
      genericError: i18n.authForgotPasswordGenericError || 'Das Zurücksetzen des Passworts ist fehlgeschlagen.'
    };
  }
  return {
    link: i18n.authForgotPassword || 'Elfelejtetted a jelszavad?',
    title: i18n.authForgotPasswordTitle || 'Jelszó visszaállítása',
    message: i18n.authForgotPasswordMessage || 'Add meg az email címedet, amellyel regisztráltál. Ha létezik fiók ezzel az emaillel, elküldjük a jelszó-visszaállító levelet.',
    cancel: i18n.authForgotPasswordCancel || 'Mégse',
    submit: i18n.authForgotPasswordSubmit || 'Jelszó visszaállítása',
    success: i18n.authForgotPasswordSuccess || 'Ha létezik fiók ezzel az email címmel, elküldtük a jelszó-visszaállító levelet. Kérlek, ellenőrizd a bejövő és spam mappádat is.',
    invalidEmail: i18n.authForgotPasswordInvalidEmail || 'Kérlek, adj meg egy érvényes email címet.',
    genericError: i18n.authForgotPasswordGenericError || 'Nem sikerült a jelszó visszaállítása.'
  };
}

function showForgotPasswordModal(initialEmail) {
  if (typeof window.syncFirebaseAuthLanguageWithCurrentLang === 'function') {
    try { window.syncFirebaseAuthLanguageWithCurrentLang(); } catch (_) {}
  }
  const texts = getForgotPasswordTexts();
  try {
    const existing = document.getElementById('forgot-password-modal');
    if (existing) existing.remove();
  } catch (_) {}

  const modalHtml = `
    <div id="forgot-password-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto">
        <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">${texts.title}</h3>
        <p class="text-sm text-gray-700 dark:text-gray-300 mb-4">${texts.message}</p>
        <input id="forgot-password-email-input" type="email" class="w-full px-3 py-2 border rounded-lg mb-4" autocomplete="email" spellcheck="false" autocapitalize="none" />
        <div class="flex justify-end gap-2 mt-2">
          <button id="forgot-password-cancel" class="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-100 text-sm font-semibold">${texts.cancel}</button>
          <button id="forgot-password-submit" class="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold">${texts.submit}</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('forgot-password-modal');
  if (!modal) return;

  const emailInput = document.getElementById('forgot-password-email-input');
  if (emailInput && initialEmail) {
    emailInput.value = initialEmail;
    try { emailInput.focus(); emailInput.select(); } catch (_) {}
  } else if (emailInput) {
    try { emailInput.focus(); } catch (_) {}
  }

  const closeModal = () => {
    try {
      modal.style.opacity = '0';
      setTimeout(() => { try { modal.remove(); } catch (_) {} }, 200);
    } catch (_) {}
  };

  const cancelBtn = document.getElementById('forgot-password-cancel');
  const submitBtn = document.getElementById('forgot-password-submit');

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      closeModal();
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      // Prevent double-click
      if (submitBtn.disabled) return;
      submitBtn.disabled = true;
      
      const email = emailInput && emailInput.value ? emailInput.value.trim() : '';
      if (!email) {
        const t = getForgotPasswordTexts();
        if (typeof showCustomAlert === 'function') {
          showCustomAlert(t.invalidEmail, 'info');
        }
        submitBtn.disabled = false;
        return;
      }
      try {
        if (typeof window.syncFirebaseAuthLanguageWithCurrentLang === 'function') {
          try { window.syncFirebaseAuthLanguageWithCurrentLang(); } catch (_) {}
        }
        await firebase.auth().sendPasswordResetEmail(email);
        if (typeof showCustomAlert === 'function') {
          showCustomAlert(texts.success, 'info');
        }
      } catch (e) {
        console.error('Reset error (forgot password modal):', e);
        const code = e && e.code;
        if (code === 'auth/user-not-found') {
          if (typeof showCustomAlert === 'function') {
            showCustomAlert(texts.success, 'info');
          }
        } else if (code === 'auth/invalid-email') {
          if (typeof showCustomAlert === 'function') {
            showCustomAlert(texts.invalidEmail, 'info');
          }
        } else {
          if (typeof showCustomAlert === 'function') {
            showCustomAlert(texts.genericError, 'info');
          }
        }
      } finally {
        closeModal();
        submitBtn.disabled = false;
      }
    });
  }
}

// ---------------------------
//  "Email already in use" – regisztrációs segédmodal
// ---------------------------
function getEmailAlreadyInUseTexts() {
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  if (lang === 'de') {
    return {
      title: i18n.authEmailInUseTitle || 'Unter dieser E-Mail-Adresse gibt es bereits ein GuriGO-Konto',
      message: i18n.authEmailInUseMessage || 'Du hast dich wahrscheinlich früher schon registriert. Bitte melde dich an oder setze dein Passwort zurück.',
      loginButton: i18n.authEmailInUseLoginButton || 'Mit dieser E-Mail-Adresse anmelden',
      resetButton: i18n.authEmailInUseResetButton || 'Passwort zurücksetzen',
      otherEmailButton: i18n.authEmailInUseOtherEmailButton || 'Andere E-Mail-Adresse eingeben',
      resetSuccess: i18n.authEmailInUseResetSuccess || '📧 Passwort-Zurücksetzungs-E-Mail wurde gesendet.',
      resetError: i18n.authEmailInUseResetError || 'Das Zurücksetzen des Passworts ist fehlgeschlagen.'
    };
  }
  return {
    title: i18n.authEmailInUseTitle || 'Ezzel az email címmel már létezik GuriGO fiók',
    message: i18n.authEmailInUseMessage || 'Valószínűleg korábban már regisztráltál. Jelentkezz be, vagy állítsd vissza a jelszavad.',
    loginButton: i18n.authEmailInUseLoginButton || 'Bejelentkezés ezzel az email címmel',
    resetButton: i18n.authEmailInUseResetButton || 'Jelszó visszaállítása',
    otherEmailButton: i18n.authEmailInUseOtherEmailButton || 'Másik email megadása',
    resetSuccess: i18n.authEmailInUseResetSuccess || '📧 Jelszó-visszaállító e-mail elküldve.',
    resetError: i18n.authEmailInUseResetError || 'Nem sikerült a jelszó visszaállítása.'
  };
}

function showEmailAlreadyInUseRegistrationModal(email, options) {
  const ctx = options || {};
  const texts = getEmailAlreadyInUseTexts();

  try {
    const existing = document.getElementById('email-in-use-modal');
    if (existing) existing.remove();
  } catch (_) {}

  const safeEmail = email || '';
  const modalHtml = `
    <div id="email-in-use-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto">
        <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">${texts.title}</h3>
        <p class="text-sm text-gray-700 dark:text-gray-300 mb-4">${texts.message}</p>
        ${safeEmail ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-4">${safeEmail}</p>` : ''}
        <div class="space-y-2">
          <button id="email-in-use-login" class="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold">${texts.loginButton}</button>
          <button id="email-in-use-reset" class="w-full py-2 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold">${texts.resetButton}</button>
          <button id="email-in-use-other" class="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold dark:bg-gray-700 dark:text-gray-100">${texts.otherEmailButton}</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const modal = document.getElementById('email-in-use-modal');
  if (!modal) return;

  const closeModal = () => {
    try {
      modal.style.opacity = '0';
      setTimeout(() => { try { modal.remove(); } catch (_) {} }, 200);
    } catch (_) {}
  };

  const loginBtn = document.getElementById('email-in-use-login');
  const resetBtn = document.getElementById('email-in-use-reset');
  const otherBtn = document.getElementById('email-in-use-other');

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      try {
        if (ctx && ctx.source === 'settings') {
          const loginView = document.getElementById('settings-email-login-form');
          const registerView = document.getElementById('settings-email-register-form');
          if (loginView && loginView.classList) loginView.classList.remove('hidden');
          if (registerView && registerView.classList) registerView.classList.add('hidden');
          const loginInput = document.getElementById('settings-email-login');
          if (loginInput) { loginInput.value = safeEmail; try { loginInput.focus(); } catch (_) {} }
        } else {
          const loginView = document.getElementById('login-view');
          const registerView = document.getElementById('register-view');
          if (loginView && loginView.classList) loginView.classList.remove('hidden');
          if (registerView && registerView.classList) registerView.classList.add('hidden');
          const loginInput = document.getElementById('email');
          if (loginInput) { loginInput.value = safeEmail; try { loginInput.focus(); } catch (_) {} }
        }
      } catch (_) {}
      closeModal();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      // Prevent double-click
      if (resetBtn.disabled) return;
      resetBtn.disabled = true;
      
      try {
        if (safeEmail && typeof firebase !== 'undefined' && firebase.auth) {
          if (typeof window.syncFirebaseAuthLanguageWithCurrentLang === 'function') {
            try { window.syncFirebaseAuthLanguageWithCurrentLang(); } catch (_) {}
          }
          await firebase.auth().sendPasswordResetEmail(safeEmail);
          if (typeof showCustomAlert === 'function') {
            showCustomAlert(texts.resetSuccess, 'info');
          }
        }
      } catch (e) {
        console.error('Password reset error (email-already-in-use flow):', e);
        if (typeof showCustomAlert === 'function') {
          showCustomAlert(texts.resetError, 'info');
        }
      } finally {
        closeModal();
        resetBtn.disabled = false;
      }
    });
  }

  if (otherBtn) {
    otherBtn.addEventListener('click', () => {
      try {
        if (ctx && ctx.source === 'settings') {
          const input = document.getElementById('settings-email-register');
          if (input) { input.value = ''; try { input.focus(); } catch (_) {} }
        } else {
          const input = document.getElementById('register-email');
          if (input) { input.value = ''; try { input.focus(); } catch (_) {} }
        }
      } catch (_) {}
      closeModal();
    });
  }
}

window.showEmailAlreadyInUseRegistrationModal = showEmailAlreadyInUseRegistrationModal;

// ---------------------------
//  Auth képernyő inicializálása
// ---------------------------
function initAuthScreen() {
  if (window.__authScreenInited) return;
  window.__authScreenInited = true;
  if (window.GurigoBootMarks && typeof window.GurigoBootMarks.mark === 'function') {
    try { window.GurigoBootMarks.mark('init_auth_screen'); } catch (_) {}
  }
  // Email login form (submit)
  const loginForm = document.querySelector('#login-view form');
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleEmailLoginSubmit();
  });

  // Google gomb
  const googleBtn = document.getElementById('login-button-google');
  googleBtn?.addEventListener('click', signInWithGoogle);

  // Apple gomb
  const appleBtn = document.getElementById('login-button-apple');
  appleBtn?.addEventListener('click', signInWithApple);

  // Register nézet megjelenítése
  const showReg = document.getElementById('show-register-view');
  const showLog = document.getElementById('show-login-view');
  const loginView = document.getElementById('login-view');
  const registerView = document.getElementById('register-view');

  showReg?.addEventListener('click', (e) => {
    e.preventDefault();
    loginView?.classList.add('hidden');
    registerView?.classList.remove('hidden');
  });

  showLog?.addEventListener('click', (e) => {
    e.preventDefault();
    registerView?.classList.add('hidden');
    loginView?.classList.remove('hidden');
  });

  // Regisztráció form
  const regForm = document.querySelector('#register-view form');
  regForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleEmailRegistrationSubmit();
  });

  // Forgot password
  const forgot = document.getElementById('forgot-password-link');
  if (forgot) {
    try {
      const texts = getForgotPasswordTexts();
      forgot.textContent = texts.link;
    } catch (_) {}
    forgot.addEventListener('click', (e) => {
      e.preventDefault();
      handleForgotPassword();
    });
  }

  // Kijelentkezés gomb (Beállítások nézet)
  const logoutBtn = document.getElementById('logout-button');
  logoutBtn?.addEventListener('click', async () => {
    await signOutUser();
  });

  // Delegált kattintás figyelő: ha a gomb később kerül a DOM-ba,
  // akkor is működjön a kijelentkezés
  document.addEventListener('click', async (e) => {
    const btn = e.target && (e.target.closest ? e.target.closest('#logout-button') : null);
    if (!btn) return;
    await signOutUser();
  });

  // Mentett email visszatöltése (ha van)
  const rememberedEmail = localStorage.getItem('rememberedEmail');
  if (rememberedEmail) {
    const emailInput = document.getElementById('email');
    const rememberCheckbox = document.getElementById('remember-me');
    if (emailInput) emailInput.value = rememberedEmail;
    if (rememberCheckbox) rememberCheckbox.checked = true;
    // Clear esetleges régi hiba a betöltött emailre
    try {
      const ev = new Event('input', { bubbles: true });
      emailInput?.dispatchEvent(ev);
    } catch(_) {}
  }

  // Realtime kiegészítők
  if (typeof initEmailValidation === 'function') initEmailValidation();
  // Autofill után előfordulhat, hogy a blur-kori hiba bent marad. Tisztítsuk meg késleltetve is.
  try {
    const emailInput = document.getElementById('email');
    const sanitizeEmail = (v) => (v||'').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').trim();
    const clearIfValid = () => {
      if (!emailInput) return;
      const val = sanitizeEmail(emailInput.value);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (val && emailRegex.test(val)) {
        emailInput.classList.remove('border-red-500');
        const cont = emailInput.parentElement || emailInput;
        const errs = cont && cont.querySelectorAll ? cont.querySelectorAll('.email-error') : [];
        if (errs && errs.length) errs.forEach(e=>{ try{ e.remove(); }catch(_){} });
      }
    };
    // Többször, hogy az autofill késleltetést is lefedjük
    setTimeout(clearIfValid, 200);
    setTimeout(clearIfValid, 800);
    setTimeout(clearIfValid, 1600);
  } catch(_) {}
  if (typeof initCapsLockWarning === 'function') initCapsLockWarning();

  // Adatvédelmi és felhasználási feltételek linkek
  const termsLink = document.getElementById('terms-link');
  const privacyLink = document.getElementById('privacy-link');
  
  if (termsLink) {
    termsLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.openLegalDoc === 'function') {
        window.openLegalDoc('terms');
      }
    });
  }
  
  if (privacyLink) {
    privacyLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.openLegalDoc === 'function') {
        window.openLegalDoc('privacy');
      }
    });
  }

  // OAuth redirect: getRedirectResult már startOAuthRedirectBootEarly()-ban fut (auth.js betöltéskor)
  if (firebase?.auth) {
    firebase.auth().onAuthStateChanged(async function (user) {
      await awaitAuthBootIfNeeded();
      const effectiveUser = user || firebase.auth().currentUser;
      authDebugLog('[state]', 'onAuthStateChanged', {
        uid: effectiveUser ? effectiveUser.uid : null,
        providerId: effectiveUser ? resolveAuthUserProviderId(effectiveUser) : null,
        bootCompleted: !!(window.__gurigoAuthBoot && window.__gurigoAuthBoot.completed)
      });
      if (!effectiveUser) {
        if (window.GurigoAuthSession && typeof window.GurigoAuthSession.finishSignOut === 'function') {
          window.GurigoAuthSession.finishSignOut();
        }
      } else if (window.GurigoAuthSession && typeof window.GurigoAuthSession.clearSignOutState === 'function') {
        window.GurigoAuthSession.clearSignOutState();
      }
      // Post-login shell needs Phase 2 (database / userProfile / renderApp stack)
      if (effectiveUser && window.GurigoBoot && typeof window.GurigoBoot.whenReady === 'function') {
        try {
          await window.GurigoBoot.whenReady('phase2');
        } catch (bootErr) {
          console.warn('[auth] Phase 2 wait failed:', bootErr);
        }
      }
      if (typeof handleAuthStateChange === 'function') {
        handleAuthStateChange(effectiveUser);
      }
      notifyGuriGOIosNativeAuthBridge(effectiveUser);
    });
  }
}

// ---------------------------
//  Auth session – sign-out zaj / stale async load szűrés
// ---------------------------
(function initGurigoAuthSession() {
  var authGeneration = 0;
  var signingOut = false;
  var signOutGraceTimer = null;

  function getCurrentUid() {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        return firebase.auth().currentUser.uid;
      }
      if (window.currentUser && window.currentUser.uid) return window.currentUser.uid;
    } catch (_) {}
    return null;
  }

  function cancelAuthScopedModuleLoads() {
    try {
      if (typeof window.stopReferralListeners === 'function') window.stopReferralListeners();
    } catch (_) {}
    try {
      if (typeof window.weeklyRestCompensationCancelPending === 'function') window.weeklyRestCompensationCancelPending();
    } catch (_) {}
    try {
      if (typeof window.documentsReminderCancelPending === 'function') window.documentsReminderCancelPending();
    } catch (_) {}
  }

  window.GurigoAuthSession = {
    getGeneration: function () { return authGeneration; },
    isSigningOut: function () { return signingOut; },
    isStale: function (gen) { return gen !== authGeneration; },
    captureAuthScopedLoad: function () {
      return { uid: getCurrentUid(), gen: authGeneration };
    },
    shouldDiscardAuthScopedLoad: function (ctx) {
      if (!ctx || !ctx.uid) return true;
      if (ctx.gen !== authGeneration) return true;
      if (signingOut) return true;
      var uid = getCurrentUid();
      if (!uid || uid !== ctx.uid) return true;
      return false;
    },
    beginSignOut: function () {
      signingOut = true;
      authGeneration += 1;
      window._gurigoSignOutInProgress = true;
      if (signOutGraceTimer) {
        clearTimeout(signOutGraceTimer);
        signOutGraceTimer = null;
      }
      cancelAuthScopedModuleLoads();
    },
    finishSignOut: function () {
      if (signOutGraceTimer) clearTimeout(signOutGraceTimer);
      signOutGraceTimer = setTimeout(function () {
        signingOut = false;
        window._gurigoSignOutInProgress = false;
        signOutGraceTimer = null;
      }, 4000);
    },
    clearSignOutState: function () {
      signingOut = false;
      window._gurigoSignOutInProgress = false;
      if (signOutGraceTimer) {
        clearTimeout(signOutGraceTimer);
        signOutGraceTimer = null;
      }
    }
  };
  window.cancelAuthScopedModuleLoads = cancelAuthScopedModuleLoads;
})();

// ---------------------------
//  Kijelentkezés (centralizált)
// ---------------------------
async function signOutUser(options) {
  options = options || {};
  try {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
    
    console.log('[Auth] signOutUser called');

    if (!options.skipPendingCheck && typeof window.canLogoutNow === 'function') {
      const logoutCheck = await window.canLogoutNow();
      if (logoutCheck && logoutCheck.ok === false) {
        const msg = logoutCheck.message || i18n.logoutBlockedPendingSync || 'Vannak még nem szinkronizált adataid. Kijelentkezés előtt csatlakozz internethez, és várd meg a szinkronizálást.';
        if (logoutCheck.suggestRetry && typeof showCustomAlert === 'function') {
          showCustomAlert(
            msg,
            'warning',
            async function () {
              try {
                if (typeof window.retryAllFailedSync === 'function') {
                  await window.retryAllFailedSync({ userInitiated: false });
                }
                if (typeof window.syncPendingEntries === 'function' && window.db) {
                  await window.syncPendingEntries(window.db);
                }
                if (typeof window.syncPendingDocuments === 'function' && typeof window.uploadPendingDocumentItem === 'function') {
                  await window.syncPendingDocuments(window.uploadPendingDocumentItem);
                }
              } catch (retryErr) {
                console.warn('[Auth] Logout retry sync failed:', retryErr);
              }
              const recheck = await window.canLogoutNow();
              if (recheck && recheck.ok) {
                await signOutUser({ skipPendingCheck: true });
              } else if (typeof showCustomAlert === 'function') {
                const failMsg = (recheck && recheck.message) || msg;
                const extra = i18n.syncRetryFailed || 'Az újrapróbálás nem sikerült.';
                showCustomAlert(failMsg + '\n\n' + extra, 'warning');
              }
            },
            {
              confirmText: i18n.syncRetryButton || 'Újrapróbálás',
              cancelText: i18n.fuelingCancel || i18n.cancel || 'Mégse'
            }
          );
        } else if (typeof showCustomAlert === 'function') {
          showCustomAlert(msg, 'warning');
        }
        return;
      }
    }

    if (window.GurigoAuthSession && typeof window.GurigoAuthSession.beginSignOut === 'function') {
      window.GurigoAuthSession.beginSignOut();
    }
    
    // Vendég mód és egyéb lokális adatok törlése
    localStorage.removeItem('isGuestMode');
    localStorage.removeItem('rememberedEmail');
    localStorage.removeItem('__gurigo_auth_cached');
    
    // Firebase kijelentkezés
    await firebase.auth().signOut();
    notifyGuriGOIosNativeAuthBridge(null);

    if (window.GurigoAuthSession && typeof window.GurigoAuthSession.finishSignOut === 'function') {
      window.GurigoAuthSession.finishSignOut();
    }

    // Azonnali, determinisztikus UI reset: login képernyő + app shell (alsó nav, more menü) elrejtése.
    // Az onAuthStateChanged(null) is lefut majd, de ha bármelyik korai return elnyelné,
    // itt garantáltan teljes logged-out állapotba kerül a UI.
    if (typeof window.renderLoggedOutState === 'function') {
      window.renderLoggedOutState();
    }

    console.log('[Auth] User signed out successfully');
    
    // Opcionális: értesítés
    if (typeof showCustomAlert === 'function') {
      const msg = i18n.authSignOutSuccess || 'Sikeresen kijelentkeztél';
      showCustomAlert(msg, 'success');
    }
    
  } catch (error) {
    console.warn('[Auth] Logout error:', error);
    if (window.GurigoAuthSession && typeof window.GurigoAuthSession.finishSignOut === 'function') {
      window.GurigoAuthSession.finishSignOut();
    }
  }
}

// Korai OAuth redirect boot (main.js onAuthStateChanged előtt)
startOAuthRedirectBootEarly();

// Globális exportok
window.handleEmailLoginSubmit = handleEmailLoginSubmit;
window.awaitAuthBootIfNeeded = awaitAuthBootIfNeeded;
window.handleEmailRegistrationSubmit = handleEmailRegistrationSubmit;
window.signInWithGoogle = signInWithGoogle;
window.getGoogleButtonMarkup = getGoogleButtonMarkup;
window.signInWithApple = signInWithApple;
window.togglePasswordVisibility = togglePasswordVisibility;
window.initAuthScreen = initAuthScreen;
window.signOutUser = signOutUser;
