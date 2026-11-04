// === GuriGO natív iOS debug: beta újratöltés + WKWebView cache törlés ===
// Handler: webkit.messageHandlers.gurigo (Swift: GuriGOWebShellView.bridgeHandlerName)

(function () {
  'use strict';

  var HANDLER_NAME = 'gurigo';
  var MESSAGE_TYPE = 'nativeDebug';

  var Actions = {
    RELOAD_BETA: 'reloadBeta',
    CLEAR_AND_RELOAD_BETA: 'clearWebViewDataAndReloadBeta'
  };

  /** Natív iOS fejlesztői eszközök — csak ezek a bejelentkezett e-mailek látják a blokkot. */
  var IOS_DEBUG_ALLOWED_EMAILS = new Set([
    'info@gurigo.eu',
    'priatti11@gmail.com',
    'testro@gmail.hu',
    'trail@gmail.com',
    'trial2@gmail.com'
  ]);

  function isNativeIosShell() {
    try {
      if (typeof window.isNativeIosAppShell === 'function') {
        return window.isNativeIosAppShell();
      }
      if (window.GURIGO_NATIVE_SHELL === true && String(window.GURIGO_NATIVE_PLATFORM || '').toLowerCase() === 'ios') {
        return true;
      }
      if (window.GuriGONative && window.GuriGONative.appShell === true && String(window.GuriGONative.platform || '').toLowerCase() === 'ios') {
        return true;
      }
    } catch (_) { /* ignore */ }
    return false;
  }

  function isBridgeChannelReady() {
    try {
      return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers[HANDLER_NAME]);
    } catch (_) {
      return false;
    }
  }

  function getAuthUserForDebug() {
    try {
      if (window.currentUser && (window.currentUser.email || window.currentUser.uid)) {
        return window.currentUser;
      }
      if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        return firebase.auth().currentUser;
      }
    } catch (_) { /* ignore */ }
    return null;
  }

  function collectUserEmailCandidates(user) {
    var out = [];
    if (!user) return out;
    var seen = {};
    function add(raw) {
      var e = String(raw || '').trim().toLowerCase();
      if (!e || seen[e]) return;
      seen[e] = true;
      out.push(e);
    }
    add(user.email);
    try {
      (user.providerData || []).forEach(function (p) {
        add(p && p.email);
      });
    } catch (_) { /* ignore */ }
    return out;
  }

  function normalizeEmail(user) {
    var candidates = collectUserEmailCandidates(user);
    return candidates.length ? candidates[0] : '';
  }

  function isIosDebugAllowedUser(user) {
    var candidates = collectUserEmailCandidates(user);
    for (var i = 0; i < candidates.length; i++) {
      if (IOS_DEBUG_ALLOWED_EMAILS.has(candidates[i])) return true;
    }
    return false;
  }

  function canShowIosDebugTools() {
    return isNativeIosShell() && isIosDebugAllowedUser(getAuthUserForDebug());
  }

  function postToNative(envelope) {
    if (!isBridgeChannelReady()) {
      return { ok: false, reason: 'bridge_unavailable' };
    }
    try {
      window.webkit.messageHandlers[HANDLER_NAME].postMessage(envelope);
      return { ok: true };
    } catch (err) {
      console.warn('[DebugBridge] postMessage failed', err);
      return { ok: false, reason: 'post_failed', error: err };
    }
  }

  function sendAction(action) {
    if (!isNativeIosShell()) {
      return { ok: false, reason: 'not_native_shell' };
    }
    var user = getAuthUserForDebug();
    if (!isIosDebugAllowedUser(user)) {
      return { ok: false, reason: 'not_allowed' };
    }
    if (!isBridgeChannelReady()) {
      return { ok: false, reason: 'bridge_unavailable' };
    }
    return postToNative({
      type: MESSAGE_TYPE,
      action: action
    });
  }

  function showUserMessage(message, alertType) {
    if (!message) return;
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(message, alertType || 'info');
    } else {
      try { alert(message); } catch (_) { /* ignore */ }
    }
  }

  function handleDebugAction(action, options) {
    var opts = options || {};
    try {
      if (!isNativeIosShell()) {
        showUserMessage('Ez a funkció csak a natív iOS teszt appban érhető el.', 'info');
        return { ok: false, reason: 'not_native_shell' };
      }
      var user = getAuthUserForDebug();
      if (!isIosDebugAllowedUser(user)) {
        showUserMessage('Ehhez a fejlesztői művelethez nincs jogosultság.', 'warning');
        return { ok: false, reason: 'not_allowed' };
      }
      if (action === Actions.CLEAR_AND_RELOAD_BETA && opts.showProgress !== false) {
        showUserMessage('Cache törlése folyamatban…', 'info');
      }
      var result = sendAction(action);
      if (!result.ok) {
        if (result.reason === 'bridge_unavailable' || result.reason === 'post_failed') {
          showUserMessage('Ez a funkció csak a natív iOS teszt appban érhető el.', 'info');
        }
        return result;
      }
      if (action === Actions.RELOAD_BETA && opts.showSuccess !== false) {
        showUserMessage('Beta újratöltése…', 'info');
      }
      return result;
    } catch (err) {
      console.warn('[DebugBridge] handleDebugAction failed', err);
      return { ok: false, reason: 'error', error: err };
    }
  }

  var api = {
    MESSAGE_TYPE: MESSAGE_TYPE,
    Actions: Actions,
    IOS_DEBUG_ALLOWED_EMAILS: IOS_DEBUG_ALLOWED_EMAILS,
    isNativeIosShell: isNativeIosShell,
    isBridgeChannelReady: isBridgeChannelReady,
    isIosDebugAllowedUser: isIosDebugAllowedUser,
    canShowIosDebugTools: canShowIosDebugTools,
    reloadBeta: function (options) {
      return handleDebugAction(Actions.RELOAD_BETA, options);
    },
    clearWebViewDataAndReloadBeta: function (options) {
      return handleDebugAction(Actions.CLEAR_AND_RELOAD_BETA, options);
    }
  };

  window.GuriGONativeDebugBridge = api;
})();
