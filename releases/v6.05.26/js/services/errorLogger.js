// =======================================================
// ===== ERROR LOGGER SERVICE ============================
// =======================================================
// Célja: Hibák automatikus naplózása Firestore-ba
// GDPR-barát: Csak technikai adatok, nincs személyes adat
// =======================================================

(function() {
  'use strict';

  /**
   * Eszköz és böngésző információk gyűjtése (GDPR-barát)
   * NEM tartalmaz: IP cím, GPS koordináták, felhasználói adatok
   * CSAK technikai információk a hibakereséshez
   */
  function getDeviceInfo() {
    const nav = navigator;
    const screen = window.screen;
    const appInfo = (typeof window !== 'undefined' && window.APP_INFO) ? window.APP_INFO : null;
    
    return {
      // Böngésző alapadatok
      userAgent: nav.userAgent || 'Unknown',
      platform: nav.platform || 'Unknown',
      language: nav.language || 'Unknown',
      
      // Képernyő felbontás
      screenWidth: screen.width || 0,
      screenHeight: screen.height || 0,
      screenColorDepth: screen.colorDepth || 0,
      
      // Viewport méret
      viewportWidth: window.innerWidth || 0,
      viewportHeight: window.innerHeight || 0,
      
      // Böngésző képességek
      cookiesEnabled: nav.cookieEnabled || false,
      onlineStatus: nav.onLine || false,
      
      // Időzóna (GDPR OK - nem azonosítja a felhasználót)
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
      timezoneOffset: new Date().getTimezoneOffset(),
      
      // App verzió (mindig window.APP_INFO-ból olvasva)
      appVersion: (appInfo && appInfo.version) ? appInfo.version : 'Unknown',
      
      // Böngésző típus detektálás
      browserType: detectBrowserType(),
      
      // PWA mód
      isPWA: window.matchMedia('(display-mode: standalone)').matches || 
             window.navigator.standalone === true,
      
      // Service Worker státusz
      hasServiceWorker: 'serviceWorker' in navigator,
      
      // Memória info (ha elérhető)
      memory: (performance && performance.memory) ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : null
    };
  }

  /**
   * Böngésző típus detektálása
   */
  function detectBrowserType() {
    const ua = navigator.userAgent;
    
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('SamsungBrowser') > -1) return 'Samsung Internet';
    if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
    if (ua.indexOf('Trident') > -1) return 'Internet Explorer';
    if (ua.indexOf('Edge') > -1) return 'Edge (Legacy)';
    if (ua.indexOf('Edg') > -1) return 'Edge (Chromium)';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    
    return 'Unknown';
  }

  /**
   * Hiba objektum normalizálása
   */
  function normalizeError(error) {
    if (!error) return { message: 'Unknown error', stack: null };
    
    if (typeof error === 'string') {
      return { message: error, stack: null };
    }
    
    if (error instanceof Error) {
      return {
        message: error.message || 'Unknown error',
        stack: error.stack || null,
        name: error.name || 'Error'
      };
    }
    
    // Ha objektum
    return {
      message: error.message || error.toString() || 'Unknown error',
      stack: error.stack || null,
      name: error.name || 'Error',
      ...error
    };
  }

  function getErrorCode(error) {
    if (!error || typeof error !== 'object') return '';
    return String(error.code || error.errorCode || (error.error && error.error.code) || '');
  }

  function getErrorMessage(error) {
    if (!error) return '';
    if (typeof error === 'string') return error;
    return String(error.message || error.error || error);
  }

  function collectErrorSourceText(error, additionalData) {
    const parts = [];
    if (error && error.stack) parts.push(String(error.stack));
    if (additionalData && additionalData.filename) parts.push(String(additionalData.filename));
    if (additionalData && additionalData.rejectionStack) parts.push(String(additionalData.rejectionStack));
    if (additionalData && additionalData.errorEventStack) parts.push(String(additionalData.errorEventStack));
    return parts.join('\n');
  }

  function isSigningOutContext() {
    try {
      if (window.GurigoAuthSession && window.GurigoAuthSession.isSigningOut && window.GurigoAuthSession.isSigningOut()) return true;
      if (window._gurigoSignOutInProgress) return true;
    } catch (_) {}
    return false;
  }

  function isUserSignedOut() {
    try {
      if (typeof firebase !== 'undefined' && firebase.auth && !firebase.auth().currentUser) return true;
      if (!window.currentUser) return true;
    } catch (_) {}
    return false;
  }

  function isBrowserExtensionNoise(error, additionalData) {
    const combined = (collectErrorSourceText(error, additionalData) + '\n' + getErrorMessage(error)).toLowerCase();
    return (
      combined.indexOf('chrome-extension://') !== -1
      || combined.indexOf('moz-extension://') !== -1
      || combined.indexOf('content-script') !== -1
      || combined.indexOf('showonechild') !== -1
      || combined.indexOf('actionablecoachmark') !== -1
      || combined.indexOf('launchdarkly') !== -1
      || combined.indexOf('jasper') !== -1
    );
  }

  function isFirebasePermissionDenied(error) {
    const code = getErrorCode(error);
    const msg = getErrorMessage(error).toLowerCase();
    return (
      code === 'permission-denied'
      || msg.indexOf('missing or insufficient permissions') !== -1
      || msg.indexOf('permission_denied') !== -1
    );
  }

  function isNetworkOrOfflineNoise(error) {
    const msg = getErrorMessage(error).toLowerCase();
    const code = getErrorCode(error);
    return (
      msg.indexOf('failed to fetch') !== -1
      || msg.indexOf('network error') !== -1
      || msg.indexOf('network-request-failed') !== -1
      || msg.indexOf('load failed') !== -1
      || code === 'unavailable'
    );
  }

  function isErrorLoggerInternalFailure(error, additionalData) {
    if (additionalData && additionalData.isErrorLoggerFailure) return true;
    const ctx = String((additionalData && additionalData.context) || '');
    return ctx.indexOf('ErrorLogger') !== -1;
  }

  /**
   * Dönti el, megjelenjen-e a sárga hibamodál. Alapértelmezés: false (globális zaj kiszűrése).
   * Csak explicit userFacing: true vagy szándékos, kezelhető app-hiba esetén true.
   */
  function shouldShowUserError(error, context, additionalData) {
    additionalData = additionalData || {};
    if (additionalData.isGlobalHandler === true) return false;

    if (isBrowserExtensionNoise(error, additionalData)) return false;
    if (isErrorLoggerInternalFailure(error, additionalData)) return false;
    if (isSigningOutContext()) return false;

    if (additionalData.userFacing === true) return true;

    if (isFirebasePermissionDenied(error) && (isUserSignedOut() || isSigningOutContext())) return false;

    if (isNetworkOrOfflineNoise(error) && !additionalData.userFacing) return false;

    return false;
  }

  function shouldReportToSentry(error, additionalData) {
    additionalData = additionalData || {};
    if (isBrowserExtensionNoise(error, additionalData)) return false;
    if (isSigningOutContext() && isFirebasePermissionDenied(error)) return false;
    if (isUserSignedOut() && isFirebasePermissionDenied(error)) return false;
    if (isErrorLoggerInternalFailure(error, additionalData)) return false;
    return true;
  }

  function reportErrorToSentry(error, context, additionalData) {
    if (!shouldReportToSentry(error, additionalData)) return;
    try {
      if (typeof window.safeCaptureException === 'function') {
        window.safeCaptureException(error, Object.assign({ context: context || 'unknown' }, additionalData || {}));
      }
    } catch (_) {}
  }

  /**
   * Hiba mentése Firestore-ba
   * @param {Object} errorData - Hiba adatok
   * @returns {Promise<string>} - Hiba ID
   */
  async function logErrorToFirestore(errorData) {
    try {
      // Ellenőrizzük, hogy van-e Firestore
      if (typeof db === 'undefined' || !db) {
        console.warn('[ErrorLogger] Firestore nem elérhető, hiba nem került mentésre');
        return null;
      }

      if (typeof firebase !== 'undefined' && firebase.auth && !firebase.auth().currentUser && !window.currentUser) {
        console.warn('[ErrorLogger] Skip Firestore log — user signed out');
        return null;
      }
      const userId = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser)
        ? firebase.auth().currentUser.uid
        : ((typeof window.currentUser !== 'undefined' && window.currentUser)
          ? window.currentUser.uid
          : 'anonymous');
      const errorLog = {
        ...errorData,
        userId: userId,
        timestamp: new Date().toISOString(),
        deviceInfo: getDeviceInfo(),
        url: window.location.href,
        referrer: document.referrer || 'direct'
      };

      const add = errorData.additionalData || {};
      if (add.isScriptError) {
        errorLog.scriptErrorFilename = add.filename || null;
        errorLog.scriptErrorLineno = add.lineno != null ? add.lineno : null;
        errorLog.scriptErrorColno = add.colno != null ? add.colno : null;
        errorLog.scriptErrorCandidates = [
          'https://www.gstatic.com/firebasejs/',
          'https://js-de.sentry-cdn.com/',
          'https://cdnjs.cloudflare.com/ajax/libs/jspdf',
          'https://cdn.jsdelivr.net/npm/chart.js'
        ];
      }

      // Mentés Firestore-ba
      const docRef = await db.collection('errorLogs').add(errorLog);
      console.log('[ErrorLogger] Hiba mentve Firestore-ba:', docRef.id);
      
      return docRef.id;
    } catch (err) {
      console.warn('[ErrorLogger] Nem sikerült menteni a hibát Firestore-ba:', err && (err.message || err));
      return null;
    }
  }

  /**
   * Finomított hibaüzenet megjelenítése
   * @param {Error|string} error - Hiba objektum vagy üzenet
   * @param {string} context - Hiba kontextusa (pl. "Műszak indítás")
   * @param {Object} additionalData - További adatok
   * Megjegyzés: A tipikus Firebase Auth felhasználói hibákat (rossz jelszó,
   * már létező email stb.) nem logoljuk hibajegybe, csak UI üzenetet kap a user.
   */
  async function showDetailedError(error, context = 'Ismeretlen művelet', additionalData = {}) {
    const normalizedError = normalizeError(error);
    additionalData = additionalData || {};

    // Nem kezelt async/rejection gyakran "Unknown error" + null stack – ilyenkor ne ijesztő modál, csak konzol
    if (normalizedError.message === 'Unknown error' && !normalizedError.stack) {
      console.warn('[ErrorLogger] Uninformative error (no stack) – not showing modal. Original:', error);
      return;
    }

    // IndexedDB "backing store" hiba (privát mód, tárhely tele, Safari korlátozás) – nem jegy, nem ijesztő modál
    try {
      const msg = (normalizedError && normalizedError.message) ? String(normalizedError.message) : '';
      if (msg.indexOf('indexedDB') !== -1 || msg.indexOf('backing store') !== -1 || (msg.indexOf('UnknownError') !== -1 && msg.indexOf('open') !== -1)) {
        console.warn('[ErrorLogger] IndexedDB tárolás nem elérhető (pl. privát mód / tárhely):', msg);
        if (typeof showCustomAlert === 'function') {
          const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
          showCustomAlert(i18n.errorIndexedDBStorageUnavailable || 'A böngésző tárolása nem elérhető (pl. privát böngészés vagy tárhely). Próbáld normál módban, vagy töröld a böngésző adatait.', 'info');
        }
        return;
      }
    } catch (_) {}

    // Expected Firebase Auth user hibák kiszűrése (nem mennek Firestore-ba)
    let isExpectedAuthError = false;
    let expectedAuthUserMessageKey = null;
    try {
      const code = error && error.code;
      if (additionalData && additionalData.isExpectedAuthError) {
        isExpectedAuthError = true;
      } else if (typeof code === 'string' && code.indexOf('auth/') === 0) {
        const expectedAuthCodes = [
          'auth/email-already-in-use',
          'auth/wrong-password',
          'auth/user-not-found',
          'auth/invalid-email',
          'auth/weak-password',
          'auth/missing-password',
          'auth/too-many-requests',
          'auth/network-request-failed'
        ];
        if (expectedAuthCodes.indexOf(code) !== -1) {
          isExpectedAuthError = true;
          if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-email') {
            expectedAuthUserMessageKey = 'login-invalid-credentials';
          }
        }
      }

      // Firebase Identity Toolkit REST: INVALID_LOGIN_CREDENTIALS (pl. admin / REST login)
      if (!isExpectedAuthError && error && typeof error === 'object') {
        const restErrContainer = error.error || (error.response && error.response.data && error.response.data.error);
        const restMessage = restErrContainer && restErrContainer.message;
        if (restMessage === 'INVALID_LOGIN_CREDENTIALS') {
          isExpectedAuthError = true;
          expectedAuthUserMessageKey = 'login-invalid-credentials';
        }
      }

      if (!isExpectedAuthError && normalizedError && typeof normalizedError.message === 'string') {
        if (normalizedError.message.indexOf('INVALID_LOGIN_CREDENTIALS') !== -1) {
          isExpectedAuthError = true;
          expectedAuthUserMessageKey = 'login-invalid-credentials';
        }
      }
    } catch (_) {}

    // OAuth popup: felhasználói / böngésző viselkedés – ne modál, ne Firestore, ne Sentry zaj
    try {
      if (typeof window.isGurigoOAuthPopupBenignError === 'function' && window.isGurigoOAuthPopupBenignError(error)) {
        console.debug('[ErrorLogger] OAuth popup benign error skipped:', context);
        return;
      }
      const oauthMsg = normalizedError && normalizedError.message ? String(normalizedError.message).toLowerCase() : '';
      if (oauthMsg.indexOf('unable to establish a connection with the popup') !== -1) {
        console.debug('[ErrorLogger] OAuth popup connection error skipped:', context);
        return;
      }
    } catch (_) {}

    // Expected auth user hibák esetén: nincs Firestore log, nincs nagy hibamodál
    if (isExpectedAuthError) {
      try {
        let lang = 'hu';
        try {
          if (typeof window !== 'undefined') {
            if (window.currentLang === 'de') {
              lang = 'de';
            } else if (window.currentLang === 'hu') {
              lang = 'hu';
            } else if (typeof document !== 'undefined' && document.documentElement && document.documentElement.lang === 'de') {
              lang = 'de';
            }
          }
        } catch (_) {}

        let i18n = {};
        try {
          if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
            i18n = translations[currentLang] || {};
          }
        } catch (_) {}

        let msgText;
        if (expectedAuthUserMessageKey === 'login-invalid-credentials') {
          msgText = i18n.authGenericBadCredentials || (lang === 'de'
            ? 'E-Mail-Adresse oder Passwort ist falsch.'
            : 'Hibás email cím vagy jelszó.');
        } else {
          msgText = i18n.authUnknownError || (lang === 'de'
            ? 'Es ist ein Anmeldefehler aufgetreten.'
            : 'Hiba történt a bejelentkezéskor.');
        }

        if (typeof showCustomAlert === 'function') {
          showCustomAlert(msgText, 'info');
        } else if (typeof alert === 'function') {
          alert(msgText);
        }
      } catch (_) {}

      try {
        console.warn('[ErrorLogger] Expected auth user error  no ticket created.', {
          context: context,
          error: normalizedError
        });
      } catch (_) {}

      return;
    }

    // Safari/WebKit ismert hibája: cross-origin script hibákat "Script error."-ként jelzi, még CORS helyes beállítás mellett is.
    // Nem javítható – gyakori forrás: extension, Firebase/CDN script. Ne mutassunk modalt, ne logoljunk Firestore-ba.
    const isScriptError = (additionalData && additionalData.isScriptError) ||
      (normalizedError && (normalizedError.message === 'Script error.' || normalizedError.message === 'Script error'));

    if (isScriptError) {
      console.warn('[ErrorLogger] Script error (CORS-masked, Safari/extension), skipped:', additionalData && additionalData.filename);
      return;
    }

    if (!shouldShowUserError(error, context, additionalData)) {
      reportErrorToSentry(normalizedError, context, additionalData);
      console.warn('[ErrorLogger] User popup suppressed:', context, normalizedError.message || normalizedError);
      return;
    }

    reportErrorToSentry(normalizedError, context, additionalData);

    let errorId = null;
    if (!isExpectedAuthError) {
      errorId = await logErrorToFirestore({
        error: normalizedError,
        context: context,
        additionalData: { ...additionalData, isScriptError: false }
      });
    }
    const simpleErrorId = errorId || 'N/A';

    const existingBox = document.getElementById('errorBox');
    if (existingBox) {
      existingBox.remove();
    }

    let i18nBox = {};
    try {
      if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
        i18nBox = translations[currentLang] || {};
      }
    } catch (_) {}

    const errorBoxHtml = `
      <div id="errorBox" class="error-box">
        <button id="errorCloseX" class="close-x">✕</button>

        <h3>${i18nBox.errorBoxTitle || 'Valami nincs rendben, de semmi gond! 😊'}</h3>

        <p>
          ${i18nBox.errorBoxBody || 'Kérlek készíts egy képernyőképet, és küldd el nekem ide:<br>📧 <a href="mailto:info@gurigo.eu">info@gurigo.eu</a><br>Ezzel nagyon meg tudod könnyíteni a munkámat. Köszönöm!'}
        </p>

        <p><strong>Hibaazonosító:</strong> <span id="errorId"></span></p>

        <button id="errorCloseBtn" class="ok-btn">${i18nBox.errorBoxOkButton || 'Rendben'}</button>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', errorBoxHtml);

    const errorIdSpan = document.getElementById('errorId');
    if (errorIdSpan) {
      errorIdSpan.textContent = simpleErrorId;
    }

    const closeBtn = document.getElementById('errorCloseBtn');
    const closeX = document.getElementById('errorCloseX');
    if (closeBtn) closeBtn.addEventListener('click', closeErrorBox);
    if (closeX) closeX.addEventListener('click', closeErrorBox);

    console.error('[ErrorLogger] Hiba történt:', {
      errorId: simpleErrorId,
      context: context,
      error: normalizedError
    });

    return;

    // Hibaüzenet generálása (régi, részletes modal logika - jelenleg nem kerül meghívásra)
    const errorMessage = normalizedError.message || 'Ismeretlen hiba történt';
    const errorStack = normalizedError.stack || 'Nincs stack trace';
    const errorIdDisplay = errorId || 'N/A';

    // Modal HTML
    const modalHTML = ``;
  }

  /**
   * Modal bezárása
   */
  function closeErrorBox() {
    const box = document.getElementById('errorBox');
    if (box) {
      box.style.display = 'none';
    }
  }

  function closeDetailedErrorModal() {
    const modal = document.getElementById('detailed-error-modal');
    if (modal) {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 300);
    }
    closeErrorBox();
  }

  /**
   * Hiba ID másolása vágólapra
   */
  function copyErrorId(errorId) {
    let i18n = {};
    try {
      if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
        i18n = translations[currentLang] || {};
      }
    } catch (_) {}

    const copiedMsg = i18n.errorIdCopied || 'Hibaazonosító másolva! 📋';
    const copiedSimple = i18n.errorIdCopiedSimple || 'Hibaazonosító másolva:';
    const copyPrompt = i18n.errorIdCopyPrompt || 'Másold ki a hibaazonosítót:';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(errorId)
        .then(() => {
          if (typeof showCustomAlert === 'function') {
            showCustomAlert(copiedMsg, 'success');
          } else if (typeof alert === 'function') {
            alert(copiedSimple + ' ' + errorId);
          }
        })
        .catch(err => {
          console.error('Másolás sikertelen:', err);
          // Fallback: prompt
          if (typeof prompt === 'function') {
            prompt(copyPrompt, errorId);
          }
        });
    } else {
      // Fallback régi böngészőkhöz
      if (typeof prompt === 'function') {
        prompt(copyPrompt, errorId);
      }
    }
  }

  /**
   * ErrorEvent-ből kinyeri az összes elérhető infót (iOS/Safari: event.error gyakran null vagy "Script error" CORS miatt).
   * Az ErrorEvent.message, .filename, .lineno, .colno sokszor megmarad még cross-origin esetén is.
   */
  function extractFromErrorEvent(event) {
    const err = event.error;
    const message = (err && err.message) ? err.message : (event.message || 'Unknown error');
    const stack = (err && err.stack) ? err.stack : null;
    const name = (err && err.name) ? err.name : 'Error';
    const filename = event.filename || null;
    const lineno = event.lineno != null ? event.lineno : null;
    const colno = event.colno != null ? event.colno : null;
    return {
      message: message,
      stack: stack,
      name: name,
      filename: filename,
      lineno: lineno,
      colno: colno,
      // Safari / CORS: ha csak "Script error" van, jelezzük és tároljuk a helyet
      isScriptError: message === 'Script error.' || message === 'Script error' || !message
    };
  }

  /**
   * UnhandledRejection event.reason-ból kinyeri message, stack, name (Promise reject sokszor Error objektum).
   */
  function extractFromRejection(reason) {
    if (reason instanceof Error) {
      return {
        message: reason.message || 'Unknown error',
        stack: reason.stack || null,
        name: reason.name || 'Error'
      };
    }
    if (typeof reason === 'string') {
      return { message: reason, stack: null, name: 'Error' };
    }
    if (reason && typeof reason === 'object') {
      return {
        message: reason.message || String(reason),
        stack: reason.stack || null,
        name: reason.name || 'Error'
      };
    }
    return { message: String(reason), stack: null, name: 'Error' };
  }

  /**
   * Globális hibakezelő beállítása.
   * iOS/Safari: window.addEventListener('error') mellett unhandledrejection is; ErrorEvent-ből és
   * rejection reason-ból minél több adat (stack, message, filename, lineno, colno) kinyerése.
   */
  function shouldIgnoreOAuthPopupGlobalError(reason) {
    try {
      if (typeof window.isGurigoOAuthPopupBenignError === 'function' && window.isGurigoOAuthPopupBenignError(reason)) {
        return true;
      }
    } catch (_) {}
    const msg = (reason && reason.message) ? String(reason.message) : (typeof reason === 'string' ? reason : '');
    const lower = msg.toLowerCase();
    return (
      lower.indexOf('unable to establish a connection with the popup') !== -1
      || lower.indexOf('auth/popup-blocked') !== -1
      || lower.indexOf('auth/popup-closed-by-user') !== -1
      || lower.indexOf('auth/cancelled-popup-request') !== -1
    );
  }

  function handleGlobalError(error, context, additionalData) {
    const normalized = normalizeError(error);
    additionalData = Object.assign({ isGlobalHandler: true }, additionalData || {});
    reportErrorToSentry(normalized, context, additionalData);
    if (shouldShowUserError(normalized, context, additionalData)) {
      showDetailedError(normalized, context, Object.assign({}, additionalData, { userFacing: true }));
    } else {
      console.warn('[ErrorLogger] Global error (popup suppressed):', context, normalized.message || normalized);
    }
  }

  function setupGlobalErrorHandler() {
    // Uncaught errors – ErrorEvent részletei Safari-nál sokszor többet adnak mint a sima onerror paraméterek
    window.addEventListener('error', (event) => {
      if (shouldIgnoreOAuthPopupGlobalError(event.error || { message: event.message })) {
        console.debug('[ErrorLogger] OAuth popup error ignored (global error)');
        return;
      }
      const extracted = extractFromErrorEvent(event);
      const errorToShow = event.error || { message: extracted.message, stack: extracted.stack, name: extracted.name };
      console.error('[ErrorLogger] Uncaught error:', errorToShow, extracted);
      handleGlobalError(errorToShow, 'Nem kezelt JavaScript hiba', {
        filename: extracted.filename,
        lineno: extracted.lineno,
        colno: extracted.colno,
        errorEventMessage: extracted.message,
        errorEventStack: extracted.stack,
        isScriptError: extracted.isScriptError
      });
    }, true);

    // Unhandled promise rejections – reason lehet Error, ekkor stack/message fontos
    window.addEventListener('unhandledrejection', (event) => {
      if (shouldIgnoreOAuthPopupGlobalError(event.reason)) {
        event.preventDefault();
        console.debug('[ErrorLogger] OAuth popup rejection ignored');
        return;
      }
      const extracted = extractFromRejection(event.reason);
      console.error('[ErrorLogger] Unhandled promise rejection:', event.reason, extracted);
      const errorToShow = event.reason instanceof Error ? event.reason : { message: extracted.message, stack: extracted.stack, name: extracted.name };
      handleGlobalError(errorToShow, 'Nem kezelt Promise elutasítás', {
        promise: event.promise,
        rejectionMessage: extracted.message,
        rejectionStack: extracted.stack,
        rejectionName: extracted.name
      });
    });

    console.log('[ErrorLogger] Globális hibakezelő aktiválva (Sentry igen, user popup alapból nem)');
  }

  // Globális export
  window.showDetailedError = showDetailedError;
  window.shouldShowUserError = shouldShowUserError;
  window.closeErrorBox = closeErrorBox;
  window.closeDetailedErrorModal = closeDetailedErrorModal;
  window.copyErrorId = copyErrorId;
  window.logErrorToFirestore = logErrorToFirestore;
  window.setupGlobalErrorHandler = setupGlobalErrorHandler;

  // Automatikus inicializálás
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGlobalErrorHandler);
  } else {
    setupGlobalErrorHandler();
  }

})();
