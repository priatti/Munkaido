// GuriGO natív iOS ↔ WKWebView OAuth (Google / Apple) — WebView popup/iframe tiltott (AppSSO / disallowed_useragent)
(function () {
  'use strict';

  var HANDLER_NAME = 'gurigo';
  var GOOGLE_RESULT_EVENT = 'gurigo:nativeGoogleSignInResult';
  var GOOGLE_STARTED_EVENT = 'gurigo:nativeGoogleSignInStarted';
  var APPLE_RESULT_EVENT = 'gurigo:nativeAppleSignInResult';
  var NATIVE_AUTH_TIMEOUT_MS = 600000;

  function isNativeIosShell() {
    try {
      if (window.GURIGO_NATIVE_SHELL === true && String(window.GURIGO_NATIVE_PLATFORM || '').toLowerCase() === 'ios') {
        return true;
      }
      if (window.GuriGONative && window.GuriGONative.appShell === true && String(window.GuriGONative.platform || '').toLowerCase() === 'ios') {
        return true;
      }
      return /GuriGO-iOS-App/i.test(String(navigator.userAgent || ''));
    } catch (_) {
      return false;
    }
  }

  function isBridgeReady() {
    try {
      return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers[HANDLER_NAME]);
    } catch (_) {
      return false;
    }
  }

  function createRequestId(prefix) {
    return (prefix || 'auth') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function postNativeAuthMessage(payload) {
    window.webkit.messageHandlers[HANDLER_NAME].postMessage(payload);
  }

  function signInWithCredentialFromGoogleTokens(idToken, accessToken) {
    var credential = firebase.auth.GoogleAuthProvider.credential(idToken, accessToken || null);
    return firebase.auth().signInWithCredential(credential);
  }

  function notifyNativeGoogleSignInComplete() {
    try {
      if (typeof window.__gurigoApplyNativeOAuthSignIn === 'function' && firebase.auth().currentUser) {
        window.__gurigoApplyNativeOAuthSignIn(firebase.auth().currentUser, 'google-native-shell');
      }
    } catch (_) {}
  }

  function signInWithGoogleViaNative() {
    return new Promise(function (resolve, reject) {
      if (!isNativeIosShell()) {
        reject(new Error('not_native_shell'));
        return;
      }
      if (!isBridgeReady()) {
        reject(new Error('bridge_unavailable'));
        return;
      }
      if (typeof firebase === 'undefined' || !firebase.auth) {
        reject(new Error('firebase_unavailable'));
        return;
      }

      var requestId = createRequestId('google');
      var settled = false;
      var timer = null;

      function clearWaitTimer() {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }

      function armWaitTimer() {
        clearWaitTimer();
        timer = setTimeout(function () {
          finish(new Error('native_google_timeout'));
        }, NATIVE_AUTH_TIMEOUT_MS);
      }

      function finish(err, detail) {
        if (settled) return;
        settled = true;
        window.removeEventListener(GOOGLE_RESULT_EVENT, onResult);
        window.removeEventListener(GOOGLE_STARTED_EVENT, onStarted);
        clearWaitTimer();
        if (err) {
          err.nativeAuthCode = err.nativeAuthCode || (err.message && err.message.indexOf('google_config') !== -1 ? 'google_config_missing' : null);
          reject(err);
        } else {
          resolve(detail || {});
        }
      }

      function applyGoogleResult(d, isLate) {
        if (!d.ok) {
          var err = new Error(d.message || d.code || 'native_google_failed');
          err.nativeAuthCode = d.code || '';
          if (isLate) return;
          finish(err);
          return;
        }
        if (!d.idToken) {
          if (isLate) return;
          finish(new Error('native_google_missing_token'));
          return;
        }
        signInWithCredentialFromGoogleTokens(d.idToken, d.accessToken)
          .then(function (result) {
            notifyNativeGoogleSignInComplete();
            if (!settled) finish(null, result);
          })
          .catch(function (credErr) {
            try {
              console.error('[GuriGONativeAuthBridge] Google signInWithCredential failed:', credErr && credErr.code, credErr && credErr.message);
            } catch (_) {}
            credErr.nativeAuthCode = credErr && credErr.code;
            if (!settled) finish(credErr);
          });
      }

      function onStarted(ev) {
        var d = ev && ev.detail;
        if (!d || d.requestId !== requestId) return;
        armWaitTimer();
      }

      function onResult(ev) {
        var d = ev && ev.detail;
        if (!d || d.requestId !== requestId) return;
        if (settled) {
          if (d.ok && d.idToken) applyGoogleResult(d, true);
          return;
        }
        clearWaitTimer();
        applyGoogleResult(d, false);
      }

      armWaitTimer();
      window.addEventListener(GOOGLE_STARTED_EVENT, onStarted);
      window.addEventListener(GOOGLE_RESULT_EVENT, onResult);
      try {
        postNativeAuthMessage({ type: 'nativeGoogleSignIn', requestId: requestId });
      } catch (postErr) {
        finish(postErr);
      }
    });
  }

  function signInWithAppleViaNative() {
    return new Promise(function (resolve, reject) {
      if (!isNativeIosShell()) {
        reject(new Error('not_native_shell'));
        return;
      }
      if (!isBridgeReady()) {
        reject(new Error('bridge_unavailable'));
        return;
      }
      if (typeof firebase === 'undefined' || !firebase.auth) {
        reject(new Error('firebase_unavailable'));
        return;
      }

      var requestId = createRequestId('apple');
      var settled = false;
      var timer = null;

      function clearWaitTimer() {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }

      function finish(err, detail) {
        if (settled) return;
        settled = true;
        window.removeEventListener(APPLE_RESULT_EVENT, onResult);
        clearWaitTimer();
        if (err) reject(err);
        else resolve(detail || {});
      }

      function applyAppleResult(d, isLate) {
        if (!d.ok) {
          var err = new Error(d.message || d.code || 'native_apple_failed');
          err.nativeAuthCode = d.code || '';
          if (isLate) return;
          finish(err);
          return;
        }
        if (!d.idToken || !d.rawNonce) {
          if (isLate) return;
          finish(new Error('native_apple_missing_token'));
          return;
        }
        var provider = new firebase.auth.OAuthProvider('apple.com');
        var credential = provider.credential({ idToken: d.idToken, rawNonce: d.rawNonce });
        firebase.auth().signInWithCredential(credential)
          .then(function (result) {
            notifyNativeGoogleSignInComplete();
            if (!settled) finish(null, result);
          })
          .catch(function (credErr) {
            try {
              console.error('[GuriGONativeAuthBridge] Apple signInWithCredential failed:', credErr && credErr.code, credErr && credErr.message);
            } catch (_) {}
            if (!settled) finish(credErr);
          });
      }

      function onResult(ev) {
        var d = ev && ev.detail;
        if (!d || d.requestId !== requestId) return;
        if (settled) {
          if (d.ok && d.idToken && d.rawNonce) applyAppleResult(d, true);
          return;
        }
        clearWaitTimer();
        applyAppleResult(d, false);
      }

      timer = setTimeout(function () {
        finish(new Error('native_apple_timeout'));
      }, NATIVE_AUTH_TIMEOUT_MS);

      window.addEventListener(APPLE_RESULT_EVENT, onResult);
      try {
        postNativeAuthMessage({ type: 'nativeAppleSignIn', requestId: requestId });
      } catch (postErr) {
        finish(postErr);
      }
    });
  }

  window.GuriGONativeAuthBridge = {
    isNativeIosShell: isNativeIosShell,
    isBridgeReady: isBridgeReady,
    signInWithGoogleViaNative: signInWithGoogleViaNative,
    signInWithAppleViaNative: signInWithAppleViaNative
  };
})();
