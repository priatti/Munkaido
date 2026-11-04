// =============================================
// ===== Sentry Client (anonymized logging) =====
// =============================================
// Cél: minden hibát rögzítsünk (Sentry) ÚGY, hogy
// személyes adat ne kerüljön az eseményekbe.
// - sendDefaultPii: false
// - beforeSend & beforeBreadcrumb: minden mezőt tisztít
// - Publikus helper függvények: safeCaptureException, safeAddBreadcrumb
// =============================================

(function(){
  'use strict';

  const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig;
  const MAX_STRING_LENGTH = 500;
  const REDACTED_PLACEHOLDER = '[redacted]';

  function maskSensitiveString(value, forceRedact) {
    if (typeof value !== 'string') return value;
    if (forceRedact) return REDACTED_PLACEHOLDER;
    let sanitized = value.replace(EMAIL_REGEX, '[redacted-email]');
    if (sanitized.length > MAX_STRING_LENGTH) {
      sanitized = sanitized.slice(0, MAX_STRING_LENGTH) + '…';
    }
    return sanitized;
  }

  function shouldForceRedact(key) {
    if (!key) return false;
    const lowered = key.toLowerCase();
    const patterns = ['password', 'passwd', 'secret', 'token', 'auth', 'authorization', 'cookie', 'session', 'jwt'];
    return patterns.some(pattern => lowered.includes(pattern));
  }

  function scrubUrl(url) {
    if (!url || typeof url !== 'string') return url;
    try {
      const normalized = new URL(url, window.location.origin);
      normalized.search = '';
      normalized.hash = '';
      return normalized.toString();
    } catch (_) {
      return url.split('?')[0].split('#')[0];
    }
  }

  function sanitizeValue(value, key, depth = 0, visited = new WeakSet()) {
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      return maskSensitiveString(value, shouldForceRedact(key));
    }
    if (typeof value !== 'object') return value;

    if (visited.has(value) || depth > 3) {
      return REDACTED_PLACEHOLDER;
    }
    visited.add(value);

    if (Array.isArray(value)) {
      return value.slice(0, 20).map(item => sanitizeValue(item, key, depth + 1, visited));
    }

    const result = {};
    Object.keys(value).forEach((prop) => {
      if (prop === 'headers' || prop === 'cookies' || prop === 'data' || prop === 'body') {
        result[prop] = REDACTED_PLACEHOLDER;
        return;
      }
      result[prop] = sanitizeValue(value[prop], prop, depth + 1, visited);
    });
    return result;
  }

  function sanitizeBreadcrumb(breadcrumb) {
    if (!breadcrumb || typeof breadcrumb !== 'object') return breadcrumb;
    const sanitized = { ...breadcrumb };
    if (sanitized.message) {
      sanitized.message = maskSensitiveString(sanitized.message);
    }
    if (sanitized.data) {
      sanitized.data = sanitizeValue(sanitized.data);
      if (sanitized.data && sanitized.data.url) {
        sanitized.data.url = scrubUrl(sanitized.data.url);
      }
      if (sanitized.data && sanitized.data.href) {
        sanitized.data.href = scrubUrl(sanitized.data.href);
      }
    }
    return sanitized;
  }

  function sanitizeEvent(event) {
    if (!event) return event;
    if (event.request && event.request.url) {
      event.request.url = scrubUrl(event.request.url);
    }
    if (event.request && event.request.headers) {
      delete event.request.headers;
    }
    if (event.request && event.request.cookies) {
      delete event.request.cookies;
    }
    if (event.request && event.request.data) {
      event.request.data = REDACTED_PLACEHOLDER;
    }
    if (event.user) {
      delete event.user; // teljesen eltávolítjuk a user blokkot
    }
    if (event.server_name) {
      delete event.server_name;
    }
    if (event.extra) {
      event.extra = sanitizeValue(event.extra);
    }
    if (event.contexts) {
      event.contexts = sanitizeValue(event.contexts);
    }
    if (Array.isArray(event.breadcrumbs)) {
      event.breadcrumbs = event.breadcrumbs.map(sanitizeBreadcrumb);
    }
    return event;
  }

  function getEnvironmentTag() {
    const host = window.location.hostname;
    if (host.includes('localhost') || host.includes('127.0.0.1')) return 'local';
    if (host.includes('beta')) return 'beta';
    if (host.includes('test') || host.includes('staging')) return 'staging';
    return 'production';
  }

  function isBenignOAuthPopupSentryMessage(msg) {
    if (!msg || typeof msg !== 'string') return false;
    const lower = msg.toLowerCase();
    if (lower.indexOf('auth/popup-blocked') !== -1) return true;
    if (lower.indexOf('auth/popup-closed-by-user') !== -1) return true;
    if (lower.indexOf('auth/cancelled-popup-request') !== -1) return true;
    if (lower.indexOf('unable to establish a connection with the popup') !== -1) return true;
    if (lower.indexOf('connection with the popup') !== -1) return true;
    if (lower.indexOf('popup has been blocked') !== -1) return true;
    if (lower.indexOf('blocked by the browser') !== -1) return true;
    return false;
  }

  function isBenignOAuthPopupSentryEvent(event) {
    try {
      if (typeof window.isGurigoOAuthPopupBenignError === 'function' && event && event.originalException) {
        if (window.isGurigoOAuthPopupBenignError(event.originalException)) return true;
      }
      const values = event && event.exception && event.exception.values;
      if (!Array.isArray(values)) return false;
      for (let i = 0; i < values.length; i++) {
        if (isBenignOAuthPopupSentryMessage(values[i] && values[i].value)) return true;
      }
    } catch (_) {}
    return false;
  }

  function noOp() {}

  function safeCaptureException(error, context = {}) {
    try {
      if (!window.Sentry || !window.__SentryInitialized || !error) return;
      const sanitizedContext = sanitizeValue(context);
      window.Sentry.withScope((scope) => {
        scope.setTag('env', getEnvironmentTag());
        if (window.APP_INFO && window.APP_INFO.version) {
          scope.setTag('app_version', window.APP_INFO.version);
        }
        scope.setExtra('pwa', window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true);
        if (sanitizedContext && typeof sanitizedContext === 'object') {
          Object.keys(sanitizedContext).forEach((key) => {
            if (sanitizedContext[key] !== undefined) {
              scope.setExtra(key, sanitizedContext[key]);
            }
          });
        }
        window.Sentry.captureException(error);
      });
    } catch (err) {
      console.warn('[SentryWrapper] safeCaptureException failed:', err);
    }
  }

  function safeAddBreadcrumb(breadcrumb) {
    try {
      if (!window.Sentry || !window.__SentryInitialized || !breadcrumb) return;
      window.Sentry.addBreadcrumb(sanitizeBreadcrumb(breadcrumb));
    } catch (err) {
      console.warn('[SentryWrapper] safeAddBreadcrumb failed:', err);
    }
  }

  function exposeHelpers() {
    if (!window.safeCaptureException) {
      window.safeCaptureException = noOp;
    }
    if (!window.safeAddBreadcrumb) {
      window.safeAddBreadcrumb = noOp;
    }
  }

  function attachHelpers() {
    window.safeCaptureException = safeCaptureException;
    window.safeAddBreadcrumb = safeAddBreadcrumb;
  }

  function initSentry() {
    exposeHelpers();
    if (!window.Sentry || window.__SentryInitialized) {
      return;
    }
    try {
      const releaseFromOptions = window.SENTRY_OPTIONS && window.SENTRY_OPTIONS.release;
      const releaseFromAppInfo = (window.APP_INFO && window.APP_INFO.version) ? `v${window.APP_INFO.version}` : undefined;
      window.Sentry.init({
        release: releaseFromOptions || releaseFromAppInfo,
        environment: getEnvironmentTag(),
        sendDefaultPii: false,
        tracesSampleRate: 0, // Csak hibák kellenek
        beforeSend: (event) => {
          try {
            if (isBenignOAuthPopupSentryEvent(event)) return null;
            const msg = (event && event.exception && event.exception.values && event.exception.values[0] && event.exception.values[0].value) ? String(event.exception.values[0].value) : '';
            // indexedDB/backing store: böngésző specifikus, nem javítható
            if (msg.indexOf('indexedDB') !== -1 || msg.indexOf('backing store') !== -1) return null;
            // "Script error.": cross-origin hiba, böngésző elrejti a valódi üzenetet – nem hasznos, sokszor extension/3rd party
            if (msg === 'Script error.' || msg.trim() === 'Script error.') return null;
          } catch (_) {}
          return sanitizeEvent(event);
        },
        beforeBreadcrumb: (breadcrumb) => sanitizeBreadcrumb(breadcrumb)
      });
      window.__SentryInitialized = true;
      attachHelpers();
      console.log('[SentryWrapper] Initialized (PII-free mode)');
    } catch (err) {
      console.warn('[SentryWrapper] init failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSentry);
  } else {
    initSentry();
  }
})();
