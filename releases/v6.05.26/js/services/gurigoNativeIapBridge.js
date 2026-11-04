// === GuriGO natív iOS ↔ WKWebView Apple IAP bridge (StoreKit 2, phase: live) ===
// Handler: webkit.messageHandlers.gurigo (Swift: GuriGOWebShellView.bridgeHandlerName)

(function () {
  'use strict';

  var BRIDGE_VERSION = 1;
  var HANDLER_NAME = 'gurigo';
  var WEB_BUILD_TAG = '60508storekit-price8';
  var MESSAGE_TYPE = 'iapBridge';

  var Actions = {
    PURCHASE: 'purchase',
    RESTORE: 'restore',
    MANAGE: 'manage',
    REQUEST_STOREKIT_PRICES: 'requestStoreKitPrices'
  };

  var Products = {
    PRO: 'pro',
    ARCHIVAL: 'archival'
  };

  var Phase = {
    LIVE: 'live',
    IAP_PREPARING: 'iapPreparing',
    NOT_IMPLEMENTED: 'notImplemented'
  };

  var AckStatus = {
    STARTED: 'started',
    PENDING: 'pending',
    SUCCESS: 'success',
    CANCELLED: 'cancelled',
    FAILED: 'failed',
    RESTORED: 'restored',
    MANAGE_OPENED: 'manage_opened',
    SYNC_STARTED: 'sync_started',
    SYNC_SUCCESS: 'sync_success',
    SYNC_FAILED: 'sync_failed'
  };

  var IapButtonRoles = {
    PRO: 'pro-purchase',
    ARCHIVAL: 'archival-purchase',
    RESTORE: 'restore'
  };

  var STOREKIT_PRODUCT_IDS = {
    pro: 'com.gurigo.pro.monthly',
    archival: 'com.gurigo.archive.monthly'
  };

  var StoreKitPriceStatus = {
    IDLE: 'idle',
    LOADING: 'loading',
    LOADED: 'loaded',
    ERROR: 'error'
  };

  var storeKitPriceState = {
    status: StoreKitPriceStatus.IDLE,
    products: {},
    error: null
  };

  function iapUiLabel(key, fallback) {
    var lang = (typeof currentLang === 'string') ? currentLang : 'hu';
    var i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
    var v = i18n[key];
    return (v != null && v !== '') ? v : fallback;
  }

  function findIapButtons(role) {
    if (typeof document === 'undefined' || !role) return [];
    try {
      return Array.prototype.slice.call(document.querySelectorAll('[data-gurigo-iap-role="' + role + '"]'));
    } catch (_) {
      return [];
    }
  }

  function setIapButtonLoading(role, loading) {
    var buttons = findIapButtons(role);
    if (!buttons.length) return;
    var loadingText = role === IapButtonRoles.RESTORE
      ? iapUiLabel('subscriptionIapRestoreLoading', 'Vásárlások visszaállítása…')
      : iapUiLabel('subscriptionIapPurchaseLoading', 'Vásárlás folyamatban…');
    var spinnerHtml =
      '<span class="loading-spinner" style="width:14px;height:14px;border-width:2px;border-color:rgba(107,114,128,0.35);border-top-color:currentColor;vertical-align:middle;"></span>';

    buttons.forEach(function (btn) {
      if (!btn) return;
      var preserveContent = btn.dataset.gurigoIapPreserveContent === '1';
      if (preserveContent) {
        if (loading) {
          btn.setAttribute('aria-busy', 'true');
          btn.classList.add('opacity-70', 'pointer-events-none');
          if (!btn.querySelector('.gurigo-iap-loading-overlay')) {
            try {
              if (window.getComputedStyle(btn).position === 'static') {
                btn.style.position = 'relative';
              }
            } catch (_) { /* ignore */ }
            var overlay = document.createElement('div');
            overlay.className = 'gurigo-iap-loading-overlay';
            overlay.setAttribute('aria-hidden', 'true');
            overlay.style.cssText =
              'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
              'gap:0.5rem;background:rgba(255,255,255,0.82);border-radius:inherit;z-index:10;' +
              'font-size:0.8125rem;font-weight:600;color:#4338ca;padding:0.5rem;text-align:center;';
            overlay.innerHTML =
              '<span class="inline-flex items-center justify-center gap-2">' +
              spinnerHtml +
              '<span>' + loadingText + '</span></span>';
            btn.appendChild(overlay);
          }
        } else {
          btn.removeAttribute('aria-busy');
          btn.classList.remove('opacity-70', 'pointer-events-none');
          var existingOverlay = btn.querySelector('.gurigo-iap-loading-overlay');
          if (existingOverlay && existingOverlay.parentNode) {
            existingOverlay.parentNode.removeChild(existingOverlay);
          }
        }
        return;
      }
      if (loading) {
        if (!btn.dataset.gurigoIapOriginalHtml) {
          btn.dataset.gurigoIapOriginalHtml = btn.innerHTML;
          btn.dataset.gurigoIapOriginalDisabled = btn.disabled ? '1' : '0';
        }
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        btn.classList.add('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
        btn.innerHTML =
          '<span class="inline-flex items-center justify-center gap-2 w-full">' +
          spinnerHtml +
          '<span>' + loadingText + '</span></span>';
      } else {
        if (btn.dataset.gurigoIapOriginalHtml) {
          btn.innerHTML = btn.dataset.gurigoIapOriginalHtml;
          delete btn.dataset.gurigoIapOriginalHtml;
          btn.disabled = btn.dataset.gurigoIapOriginalDisabled === '1';
          delete btn.dataset.gurigoIapOriginalDisabled;
        } else {
          btn.disabled = false;
        }
        btn.removeAttribute('aria-busy');
        btn.classList.remove('opacity-70', 'cursor-not-allowed', 'pointer-events-none');
      }
    });
  }

  function roleForProduct(product) {
    return product === Products.ARCHIVAL ? IapButtonRoles.ARCHIVAL : IapButtonRoles.PRO;
  }

  function setPurchaseLoading(product, loading) {
    setIapButtonLoading(roleForProduct(product), !!loading);
  }

  function setRestoreLoading(loading) {
    setIapButtonLoading(IapButtonRoles.RESTORE, !!loading);
  }

  function shouldClearPurchaseLoadingFromAck(detail) {
    if (!detail || detail.action !== Actions.PURCHASE) return false;
    var status = detail.status || '';
    if (
      status === AckStatus.CANCELLED ||
      status === AckStatus.FAILED ||
      status === AckStatus.SYNC_FAILED ||
      status === AckStatus.PENDING
    ) {
      return true;
    }
    if (status === AckStatus.SUCCESS || status === AckStatus.RESTORED) {
      return true;
    }
    return false;
  }

  function shouldClearRestoreLoadingFromAck(detail) {
    if (!detail || detail.action !== Actions.RESTORE) return false;
    var status = detail.status || '';
    if (status === AckStatus.STARTED || status === AckStatus.SYNC_STARTED) return false;
    if (status === AckStatus.SYNC_SUCCESS) return false;
    return true;
  }

  function isBetaTestWebMode() {
    try {
      var path = window.location.pathname || '';
      var search = window.location.search || '';
      if (path.indexOf('/beta') === 0) return true;
      if (search.indexOf('beta=1') >= 0) return true;
    } catch (_) { /* ignore */ }
    return false;
  }

  function iapDebugLog() {
    if (!isBetaTestWebMode() && !(window.GURIGO_IAP_BRIDGE_DEBUG === true)) return;
    try {
      console.log.apply(console, arguments);
    } catch (_) { /* ignore */ }
  }

  function isNativeShell() {
    if (typeof window.isNativeIosAppShell === 'function') {
      return window.isNativeIosAppShell();
    }
    try {
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

  function createRequestId() {
    return 'iap-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function postToNative(envelope) {
    if (!isBridgeChannelReady()) {
      return { ok: false, reason: 'bridge_unavailable' };
    }
    try {
      window.webkit.messageHandlers[HANDLER_NAME].postMessage(envelope);
      return { ok: true };
    } catch (err) {
      console.warn('[IAPBridge] postMessage failed', err);
      return { ok: false, reason: 'post_failed', error: err };
    }
  }

  function buildEnvelope(action, product, source, phase) {
    return {
      type: MESSAGE_TYPE,
      version: BRIDGE_VERSION,
      action: action,
      product: product || null,
      source: source || 'unknown',
      requestId: createRequestId(),
      phase: phase || Phase.LIVE
    };
  }

  function logBridgeState(context) {
    var route = isNativeShell() ? 'apple_iap' : 'stripe';
    var phase = Phase.LIVE;
    var available = isNativeShell() && isBridgeChannelReady();
    iapDebugLog('[IAPBridge] available', available, '| route', route, '| phase', phase, context ? '| ' + context : '');
    return { route: route, phase: phase, available: available };
  }

  function send(action, product, source, options) {
    if (!isNativeShell()) {
      iapDebugLog('[IAPBridge] send blocked: not_native_shell', action, product);
      return { ok: false, reason: 'not_native_shell' };
    }
    var opts = options || {};
    var envelope = buildEnvelope(action, product, source, opts.phase || Phase.LIVE);
    if (action === Actions.PURCHASE && product === Products.PRO) {
      iapDebugLog('[IAPBridge] sending purchase pro', envelope);
    } else if (action === Actions.PURCHASE && product === Products.ARCHIVAL) {
      iapDebugLog('[IAPBridge] sending purchase archival', envelope);
    } else {
      iapDebugLog('[IAPBridge] sending', action, product || '-', envelope);
    }
    var postResult = postToNative(envelope);
    if (!postResult.ok) {
      iapDebugLog('[IAPBridge] post failed', postResult.reason);
    }
    return {
      ok: !!postResult.ok,
      reason: postResult.reason,
      envelope: envelope
    };
  }

  function resolveIapCancelledMessage(nativeMessage) {
    var lang = (typeof currentLang === 'string') ? currentLang : 'hu';
    var i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
    var key = 'subscriptionNativeIosIapCancelled';
    var fallback =
      'A vásárlás nem fejeződött be.\n\n' +
      '• Erősítsd meg az előfizetést az App Store ablakban.\n' +
      '• Teszteléshez sandbox fiók kell (ne a @privaterelay e-mail).\n' +
      '• Szimulátoron: Beállítások → Fejlesztő → Sandbox Apple-fiók.';
    var fromI18n = i18n[key];
    if (fromI18n != null && fromI18n !== '') return fromI18n;
    var raw = nativeMessage || '';
    if (
      raw.indexOf('Megszakítva') >= 0 ||
      raw.indexOf('nem fejeződött be') >= 0 ||
      raw.indexOf('privaterelay') >= 0
    ) {
      return fallback;
    }
    return raw || fallback;
  }

  function restoreI18n(key, fallback) {
    var lang = (typeof currentLang === 'string') ? currentLang : 'hu';
    var i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
    var v = i18n[key];
    return (v != null && v !== '') ? v : fallback;
  }

  function showRestoreResultAlert(title, body, alertType) {
    var okText = restoreI18n('commonOk', restoreI18n('ok', 'Rendben'));
    if (typeof window.showSubscriptionTitleBodyAlert === 'function') {
      window.showSubscriptionTitleBodyAlert(title, body, alertType || 'info', null, { okText: okText });
    } else if (typeof showCustomAlert === 'function') {
      showCustomAlert(body, alertType || 'info', null, { title: title, okText: okText });
    } else {
      alert(title + (body ? ('\n\n' + body) : ''));
    }
  }

  /** Aktív Apple IAP Pro vagy Archiválás (Stripe Pro-tól független). */
  function hasActiveAppleGurigoEntitlement(subOptional) {
    var sub = subOptional || window.currentUserSubscription || {};
    try {
      if (typeof window.isAppleProSignalActive === 'function' && window.isAppleProSignalActive(sub)) {
        return true;
      }
      if (typeof window.getArchivalBillingProvider === 'function' && window.getArchivalBillingProvider(sub) === 'apple') {
        if (typeof window.hasActiveArchivalPackage === 'function' && window.hasActiveArchivalPackage(sub)) {
          return true;
        }
      }
      var archStatus = String(sub.appleIapArchivalStatus || '').trim().toLowerCase();
      if (archStatus === 'active' || archStatus === 'billing_retry') {
        return true;
      }
    } catch (_) { /* ignore */ }
    return false;
  }

  function refreshWebSubscriptionState(includeBillingMirror) {
    iapDebugLog('[IAPBridge] refresh subscription started');
    try {
      if (typeof loadUserSubscription === 'function' && window.currentUser && window.currentUser.uid) {
        var uid = window.currentUser.uid;
        return loadUserSubscription(uid, { forceRefresh: true }).then(function () {
          var chain = Promise.resolve();
          if (includeBillingMirror && typeof window.hydrateSubscriptionBillingMirror === 'function') {
            try {
              if (window.currentUserSubscription) {
                window.currentUserSubscription.__billingMirrorHydrated = false;
              }
            } catch (_) { /* ignore */ }
            chain = window.hydrateSubscriptionBillingMirror(uid);
          }
          return chain.then(function () {
            if (typeof renderSubscriptionInfo === 'function') renderSubscriptionInfo();
            iapDebugLog('[IAPBridge] refresh subscription completed');
          });
        }).catch(function (e) {
          console.warn('[IAPBridge] refresh subscription failed', e);
        });
      }
    } catch (e) {
      console.warn('[IAPBridge] refreshWebSubscriptionState', e);
    }
    iapDebugLog('[IAPBridge] refresh subscription completed (no-op)');
    return Promise.resolve();
  }

  function handleRestoreBridgeAck(detail) {
    if (!detail || detail.action !== Actions.RESTORE) return false;
    var status = detail.status || '';

    if (status === AckStatus.STARTED || status === AckStatus.SYNC_STARTED || status === AckStatus.PENDING) {
      return true;
    }

    if (shouldClearRestoreLoadingFromAck(detail)) {
      setRestoreLoading(false);
    }

    if (status === AckStatus.CANCELLED) {
      showRestoreResultAlert(
        restoreI18n('subscriptionRestoreCancelledTitle', 'Visszaállítás megszakítva'),
        restoreI18n(
          'subscriptionRestoreCancelledBody',
          'A visszaállítás nem fejeződött be. Ha korábban App Store-on fizettél elő, próbáld újra később.'
        ),
        'info'
      );
      return true;
    }

    if (status === AckStatus.FAILED || status === AckStatus.SYNC_FAILED) {
      var errBody = detail.message || restoreI18n(
        'subscriptionRestoreErrorBody',
        'Nem sikerült szinkronizálni az App Store vásárlásokat. Kérlek, próbáld újra később, vagy írj nekünk: info@gurigo.eu'
      );
      showRestoreResultAlert(
        restoreI18n('subscriptionRestoreErrorTitle', 'Hiba a visszaállítás során'),
        errBody,
        'error'
      );
      if (status === AckStatus.SYNC_FAILED) {
        refreshWebSubscriptionState(true);
      }
      return true;
    }

    if (status === AckStatus.SYNC_SUCCESS) {
      return true;
    }

    if (status === AckStatus.RESTORED || status === AckStatus.SUCCESS) {
      refreshWebSubscriptionState(true).then(function () {
        if (hasActiveAppleGurigoEntitlement()) {
          showRestoreResultAlert(
            restoreI18n('subscriptionRestoreSuccessTitle', 'Vásárlások visszaállítva'),
            restoreI18n(
              'subscriptionRestoreSuccessBody',
              'Az App Store előfizetésedet sikeresen szinkronizáltuk.'
            ),
            'success'
          );
        } else {
          showRestoreResultAlert(
            restoreI18n('subscriptionRestoreNoneTitle', 'Nincs aktív App Store előfizetés'),
            restoreI18n(
              'subscriptionRestoreNoneBody',
              'Nem találtunk aktív App Store-on keresztüli GuriGO előfizetést. Ha weben/Stripe-on fizettél elő, azt a gurigo.eu oldalon tudod kezelni.'
            ),
            'info'
          );
        }
      });
      return true;
    }

    return false;
  }

  function showBridgeUserMessage(detail) {
    if (!detail) return;
    if (detail.action === Actions.RESTORE) return;
    var status = detail.status || '';
    if (status === AckStatus.STARTED || status === AckStatus.SYNC_STARTED) return;
    if (status === AckStatus.SYNC_SUCCESS) return;
    if (status === AckStatus.MANAGE_OPENED) return;
    var message = detail.message || '';
    if (status === AckStatus.CANCELLED) {
      message = resolveIapCancelledMessage(message);
    }
    if (!message) return;
    var alertType = 'info';
    if (status === AckStatus.FAILED || status === AckStatus.SYNC_FAILED) alertType = 'error';
    if (status === AckStatus.CANCELLED) alertType = 'warning';
    if (status === AckStatus.SUCCESS || status === AckStatus.RESTORED) alertType = 'success';
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(message, alertType);
    } else {
      alert(message);
    }
  }

  function onIapBridgeAck(ev) {
    var detail = ev && ev.detail;
    iapDebugLog('[IAPBridge] ack received', detail);
    if (!detail) return;
    if (handleRestoreBridgeAck(detail)) {
      return;
    }
    if (shouldClearPurchaseLoadingFromAck(detail)) {
      var ackProduct = detail.product === Products.ARCHIVAL ? Products.ARCHIVAL : Products.PRO;
      setPurchaseLoading(ackProduct, false);
    }
    var terminal = [
      AckStatus.SUCCESS,
      AckStatus.RESTORED,
      AckStatus.SYNC_SUCCESS,
      AckStatus.SYNC_FAILED,
      AckStatus.FAILED,
      AckStatus.CANCELLED,
      AckStatus.PENDING,
      AckStatus.MANAGE_OPENED
    ];
    if (terminal.indexOf(detail.status) >= 0) {
      showBridgeUserMessage(detail);
    }
    if (detail.status === AckStatus.SUCCESS || detail.status === AckStatus.RESTORED) {
      refreshWebSubscriptionState(false);
    }
  }

  function onIapStatusChanged(ev) {
    iapDebugLog('[IAPBridge] iapStatusChanged', ev && ev.detail);
    refreshWebSubscriptionState();
  }

  function storeKitPriceI18n(key, fallback) {
    return restoreI18n(key, fallback);
  }

  function storeKitPriceLog() {
    try {
      console.log.apply(console, arguments);
    } catch (_) { /* ignore */ }
  }

  function priceTraceEnabled() {
    try {
      if (isNativeShell()) return true;
      if (window.GURIGO_PRICE_TRACE_ENABLED === true) return true;
      var path = window.location.pathname || '';
      if (path.indexOf('/beta') === 0) return true;
    } catch (_) { /* ignore */ }
    return false;
  }

  /** USD-szöveg detektor (segédfüggvény). A StoreKit árat NEM tiltja — lásd isUnsafeUsdStoreKitPrice. */
  function looksLikeUsdPriceText(text) {
    var s = String(text == null ? '' : text).trim();
    if (!s) return false;
    if (/\bUSD\b/i.test(s)) return true;
    if (/(?:US\$)/i.test(s)) return true;
    if (/^\$[\d\s,.]+/.test(s)) return true;
    return false;
  }

  // A StoreKit displayPrice / currencyCode a hiteles forrás: az Apple mindig az előfizető
  // App Store storefrontjának pénznemében lokalizálja (a jogos USD storefrontot is beleértve).
  // Ezt minden esetben megjelenítjük, nem írjuk felül „sheet” fallback szöveggel.
  function isUnsafeUsdStoreKitPrice(displayPrice, currencyCode) {
    return false;
  }

  function priceTrace(place, details) {
    if (!priceTraceEnabled()) return;
    var payload = { place: place, at: new Date().toISOString() };
    if (details && typeof details === 'object') {
      Object.keys(details).forEach(function (k) {
        payload[k] = details[k];
      });
    }
    try {
      console.warn('[PRICE_TRACE]', payload);
    } catch (_) { /* ignore */ }
  }

  function logIapEnvTrace(place) {
    if (!priceTraceEnabled()) return;
    var appleIap = false;
    try {
      if (typeof window.getPaymentRouteForProduct === 'function') {
        appleIap = window.getPaymentRouteForProduct('pro').route === 'apple_iap';
      }
    } catch (_) { /* ignore */ }
    try {
      console.warn('[IAP_ENV_TRACE]', {
        place: place || 'unknown',
        GURIGO_NATIVE_SHELL: window.GURIGO_NATIVE_SHELL,
        GURIGO_NATIVE_PLATFORM: window.GURIGO_NATIVE_PLATFORM,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        isNativeIos: isNativeShell(),
        isAppleIapFlow: appleIap,
        hasStoreKitBridge: !!window.GuriGONativeIapBridge,
        storeKitStatus: typeof getStoreKitPriceStatus === 'function' ? getStoreKitPriceStatus() : 'n/a'
      });
    } catch (_) { /* ignore */ }
  }

  function appendPerMonthSuffix(displayPrice, perMonthSuffix) {
    var base = String(displayPrice == null ? '' : displayPrice).trim();
    if (!base) return '';
    var suffix = String(perMonthSuffix == null ? '' : perMonthSuffix).trim();
    if (!suffix) return base;
    return base + ' ' + suffix;
  }

  function hasStoredStoreKitDisplayPrices() {
    var keys = Object.keys(storeKitPriceState.products || {});
    for (var i = 0; i < keys.length; i++) {
      var rec = storeKitPriceState.products[keys[i]];
      if (rec && rec.displayPrice) return true;
    }
    return false;
  }

  /** StoreKit displayPrice — nem üres string (source of truth, nincs újraformázás). */
  function isValidStoreKitDisplayPrice(displayPrice, productId) {
    if (!displayPrice) {
      if (productId) {
        storeKitPriceLog('[IAPBridge] StoreKit price missing productId=' + productId);
      }
      return false;
    }
    return true;
  }

  function markStoreKitPricesLoading() {
    storeKitPriceState.status = StoreKitPriceStatus.LOADING;
    storeKitPriceState.error = null;
  }

  function onStoreKitPrices(ev) {
    var detail = ev && ev.detail;
    if (!detail) return;
    var status = detail.status || StoreKitPriceStatus.ERROR;
    var list = detail.products;
    if (!Array.isArray(list)) list = [];
    var incomingStatus = String(status || '').toLowerCase();

    if (incomingStatus === 'loading' && list.length === 0) {
      if (storeKitPriceState.status === StoreKitPriceStatus.LOADED && hasStoredStoreKitDisplayPrices()) {
        storeKitPriceLog('[IAPBridge] StoreKit ignore stale loading (keeping loaded prices)');
        return;
      }
      storeKitPriceState.status = StoreKitPriceStatus.LOADING;
      storeKitPriceLog('[IAPBridge] StoreKit prices received status=loading count=0');
      return;
    }

    if (incomingStatus === 'error' && list.length === 0) {
      if (storeKitPriceState.status === StoreKitPriceStatus.LOADED && hasStoredStoreKitDisplayPrices()) {
        storeKitPriceLog('[IAPBridge] StoreKit ignore stale error (keeping loaded prices)');
        return;
      }
    }

    if (list.length > 0) {
      list.forEach(function (item) {
        if (!item || !item.productId) return;
        var rawDisplayPrice = item.displayPrice;
        var displayPrice =
          rawDisplayPrice != null && String(rawDisplayPrice).trim() !== ''
            ? String(rawDisplayPrice).trim()
            : '';
        var currencyCode =
          item.currencyCode != null && String(item.currencyCode).trim() !== ''
            ? String(item.currencyCode).trim()
            : '';
        var rejectUsd = isNativeShell() && isUnsafeUsdStoreKitPrice(displayPrice, currencyCode);
        if (rejectUsd) {
          priceTrace('onStoreKitPrices', {
            productType: item.productId === STOREKIT_PRODUCT_IDS.archival ? 'archival' : 'pro',
            productId: item.productId,
            environment: 'native_ios_apple_iap',
            source: 'storekit_display_price_rejected_usd',
            storeKitDisplayPrice: displayPrice,
            storeKitCurrencyCode: currencyCode || null,
            finalPriceText: null,
            functionName: 'onStoreKitPrices'
          });
          displayPrice = '';
        }
        storeKitPriceState.products[item.productId] = {
          productId: item.productId,
          displayName: item.displayName || '',
          displayPrice: displayPrice,
          currencyCode: currencyCode || null
        };
        storeKitPriceLog(
          '[IAPBridge] StoreKit product productId=' +
            item.productId +
            ' displayPrice=' +
            (displayPrice || '(empty)') +
            (currencyCode ? ' currencyCode=' + currencyCode : '')
        );
        if (!rejectUsd && displayPrice) {
          priceTrace('onStoreKitPrices', {
            productType: item.productId === STOREKIT_PRODUCT_IDS.archival ? 'archival' : 'pro',
            productId: item.productId,
            environment: 'native_ios_apple_iap',
            source: 'storekit_display_price',
            storeKitDisplayPrice: displayPrice,
            storeKitCurrencyCode: currencyCode || null,
            finalPriceText: displayPrice,
            functionName: 'onStoreKitPrices'
          });
        }
      });
    }

    if (incomingStatus === 'loading') {
      storeKitPriceState.status = StoreKitPriceStatus.LOADING;
    } else if (incomingStatus === 'loaded') {
      var hasAnyValid = false;
      Object.keys(storeKitPriceState.products).forEach(function (pid) {
        var rec = storeKitPriceState.products[pid];
        if (rec && isValidStoreKitDisplayPrice(rec.displayPrice, rec.productId)) {
          hasAnyValid = true;
        }
      });
      storeKitPriceState.status =
        list.length > 0 && hasAnyValid ? StoreKitPriceStatus.LOADED : StoreKitPriceStatus.ERROR;
    } else if (incomingStatus === 'error') {
      if (!(storeKitPriceState.status === StoreKitPriceStatus.LOADED && hasStoredStoreKitDisplayPrices())) {
        storeKitPriceState.status = StoreKitPriceStatus.ERROR;
      }
    } else {
      storeKitPriceState.status = StoreKitPriceStatus.ERROR;
    }
    storeKitPriceState.error = detail.error || null;
    storeKitPriceLog('[IAPBridge] StoreKit prices received status=' +
        storeKitPriceState.status +
        ' count=' +
        list.length +
        ' keys=' +
        Object.keys(storeKitPriceState.products).join(',')
    );
    var shouldRender =
      incomingStatus === 'loaded' ||
      (incomingStatus === 'error' && storeKitPriceState.status === StoreKitPriceStatus.ERROR);
    if (shouldRender) {
      try {
        if (typeof window.renderSubscriptionInfo === 'function') {
          window.__gurigoStoreKitPricesRenderScheduled = true;
          window.renderSubscriptionInfo();
          window.__gurigoStoreKitPricesRenderScheduled = false;
        }
      } catch (_) { /* ignore */ }
    }
  }

  function shouldUseStoreKitPricing() {
    return isNativeShell();
  }

  function productIdForBridgeProduct(bridgeProduct) {
    return bridgeProduct === Products.ARCHIVAL
      ? STOREKIT_PRODUCT_IDS.archival
      : STOREKIT_PRODUCT_IDS.pro;
  }

  function getStoreKitProductRecord(bridgeProduct) {
    var pid = productIdForBridgeProduct(bridgeProduct);
    return storeKitPriceState.products[pid] || null;
  }

  function getStoreKitPriceStatus() {
    if (!isNativeShell()) return StoreKitPriceStatus.IDLE;
    if (storeKitPriceState.status === StoreKitPriceStatus.IDLE) {
      return StoreKitPriceStatus.LOADING;
    }
    return storeKitPriceState.status;
  }

  function getStoreKitPriceFallbackLabel() {
    var st = getStoreKitPriceStatus();
    if (st === StoreKitPriceStatus.LOADING || st === StoreKitPriceStatus.IDLE) {
      return storeKitPriceI18n('subscriptionStoreKitPriceLoading', 'Ár betöltése…');
    }
    return storeKitPriceI18n(
      'subscriptionStoreKitPriceInSheet',
      'Az ár az App Store fizetési ablakban jelenik meg'
    );
  }

  /**
   * @returns {{ kind: 'price', text: string, displayPrice: string, productId: string }|{ kind: 'fallback', text: string }}
   */
  function resolveStoreKitDisplayPrice(bridgeProduct, perMonthSuffix) {
    var productType = bridgeProduct === Products.ARCHIVAL ? 'archival' : 'pro';
    var expectedProductId = productIdForBridgeProduct(bridgeProduct);
    if (storeKitPriceState.status !== StoreKitPriceStatus.LOADED) {
      var loadingSource =
        storeKitPriceState.status === StoreKitPriceStatus.LOADING ||
        storeKitPriceState.status === StoreKitPriceStatus.IDLE
          ? 'storekit_fallback_loading'
          : 'storekit_fallback_sheet';
      var fbEarly = getStoreKitPriceFallbackLabel();
      priceTrace('resolveStoreKitDisplayPrice', {
        productType: productType,
        productId: expectedProductId,
        environment: 'native_ios_apple_iap',
        source: loadingSource,
        storeKitDisplayPrice: null,
        storeKitCurrencyCode: null,
        finalPriceText: fbEarly,
        functionName: 'resolveStoreKitDisplayPrice'
      });
      return { kind: 'fallback', text: fbEarly, traceSource: loadingSource };
    }
    var record = getStoreKitProductRecord(bridgeProduct);
    if (record && isValidStoreKitDisplayPrice(record.displayPrice, record.productId)) {
      if (isUnsafeUsdStoreKitPrice(record.displayPrice, record.currencyCode)) {
        var fbUsd = getStoreKitPriceFallbackLabel();
        priceTrace('resolveStoreKitDisplayPrice', {
          productType: productType,
          productId: record.productId,
          environment: 'native_ios_apple_iap',
          source: 'storekit_display_price_rejected_usd',
          storeKitDisplayPrice: record.displayPrice,
          storeKitCurrencyCode: record.currencyCode || null,
          finalPriceText: fbUsd,
          functionName: 'resolveStoreKitDisplayPrice'
        });
        return { kind: 'fallback', text: fbUsd, traceSource: 'storekit_display_price_rejected_usd' };
      }
      var finalText = appendPerMonthSuffix(record.displayPrice, perMonthSuffix);
      priceTrace('resolveStoreKitDisplayPrice', {
        productType: productType,
        productId: record.productId,
        environment: 'native_ios_apple_iap',
        source: 'storekit_display_price',
        storeKitDisplayPrice: record.displayPrice,
        storeKitCurrencyCode: record.currencyCode || null,
        finalPriceText: finalText,
        functionName: 'resolveStoreKitDisplayPrice'
      });
      return {
        kind: 'price',
        text: finalText,
        displayPrice: record.displayPrice,
        productId: record.productId,
        traceSource: 'storekit_display_price'
      };
    }
    if (storeKitPriceState.status === StoreKitPriceStatus.ERROR || !record || !record.displayPrice) {
      storeKitPriceLog('[IAPBridge] iOS price fallback: app_store_sheet', bridgeProduct);
    }
    var fbLate = getStoreKitPriceFallbackLabel();
    priceTrace('resolveStoreKitDisplayPrice', {
      productType: productType,
      productId: expectedProductId,
      environment: 'native_ios_apple_iap',
      source: 'storekit_fallback_sheet',
      storeKitDisplayPrice: record && record.displayPrice ? record.displayPrice : null,
      storeKitCurrencyCode: record && record.currencyCode ? record.currencyCode : null,
      finalPriceText: fbLate,
      functionName: 'resolveStoreKitDisplayPrice'
    });
    return { kind: 'fallback', text: fbLate, traceSource: 'storekit_fallback_sheet' };
  }

  /** Natív cache újraküldése — nem indít új StoreKit fetch-et (guard a Swift oldalon). */
  function requestStoreKitPrices(source) {
    if (!isNativeShell()) {
      return { ok: false, reason: 'not_native_shell' };
    }
    storeKitPriceLog('[IAPBridge] web → native requestStoreKitPrices (send cache)', source || 'unknown');
    if (
      storeKitPriceState.status === StoreKitPriceStatus.IDLE ||
      storeKitPriceState.status === StoreKitPriceStatus.LOADING
    ) {
      markStoreKitPricesLoading();
    }
    return send(Actions.REQUEST_STOREKIT_PRICES, null, source || 'subscription_page', { phase: Phase.LIVE });
  }

  function waitForBridgeChannel(maxMs, intervalMs) {
    maxMs = maxMs == null ? 2500 : maxMs;
    intervalMs = intervalMs == null ? 150 : intervalMs;
    return new Promise(function (resolve) {
      if (isBridgeChannelReady()) {
        resolve(true);
        return;
      }
      var elapsed = 0;
      var timer = setInterval(function () {
        if (isBridgeChannelReady()) {
          clearInterval(timer);
          resolve(true);
          return;
        }
        elapsed += intervalMs;
        if (elapsed >= maxMs) {
          clearInterval(timer);
          resolve(false);
        }
      }, intervalMs);
    });
  }

  function tryPreparePurchaseFlow(product, source, onComplete) {
    var prod = product === Products.ARCHIVAL ? Products.ARCHIVAL : Products.PRO;
    var src = source || 'subscription_page';
    logBridgeState('tryPreparePurchaseFlow');

    function finish(result) {
      if (!result || !result.ok) {
        setPurchaseLoading(prod, false);
      }
      if (typeof onComplete === 'function') {
        try { onComplete(result); } catch (_) { /* ignore */ }
      }
      return result;
    }

    if (!isNativeShell()) {
      return finish({ ok: false, reason: 'not_native_shell' });
    }

    setPurchaseLoading(prod, true);

    var attempt = function () {
      if (prod === Products.ARCHIVAL) {
        priceTrace('tryPreparePurchaseFlow', {
          productType: 'archival',
          productId: STOREKIT_PRODUCT_IDS.archival,
          environment: 'native_ios_apple_iap',
          source: 'purchase',
          functionName: 'tryPreparePurchaseFlow'
        });
        iapDebugLog('[IAPBridge] web → native purchase ARCHIVAL package=archival productId=com.gurigo.archive.monthly');
        return send(Actions.PURCHASE, Products.ARCHIVAL, src, { phase: Phase.LIVE });
      }
      priceTrace('tryPreparePurchaseFlow', {
        productType: 'pro',
        productId: STOREKIT_PRODUCT_IDS.pro,
        environment: 'native_ios_apple_iap',
        source: 'purchase',
        functionName: 'tryPreparePurchaseFlow'
      });
      iapDebugLog('[IAPBridge] web → native purchase PRO package=pro productId=com.gurigo.pro.monthly');
      return send(Actions.PURCHASE, Products.PRO, src, { phase: Phase.LIVE });
    };

    var immediate = attempt();
    if (immediate.ok) {
      return finish(immediate);
    }

    return waitForBridgeChannel(2500, 150).then(function (ready) {
      if (!ready) {
        iapDebugLog('[IAPBridge] bridge channel timeout', immediate.reason);
        return finish({ ok: false, reason: immediate.reason || 'bridge_unavailable' });
      }
      var retried = attempt();
      return finish(retried);
    });
  }

  var api = {
    version: BRIDGE_VERSION,
    messageType: MESSAGE_TYPE,
    handlerName: HANDLER_NAME,
    Actions: Actions,
    Products: Products,
    Phase: Phase,
    AckStatus: AckStatus,
    isNativeShell: isNativeShell,
    isBridgeChannelReady: isBridgeChannelReady,
    isAvailable: function () {
      return isNativeShell() && isBridgeChannelReady();
    },
    logBridgeState: logBridgeState,
    send: send,
    requestPurchasePro: function (source) {
      return send(Actions.PURCHASE, Products.PRO, source, { phase: Phase.LIVE });
    },
    requestPurchaseArchival: function (source) {
      return send(Actions.PURCHASE, Products.ARCHIVAL, source, { phase: Phase.LIVE });
    },
    requestRestorePurchases: function (source) {
      setRestoreLoading(true);
      var result = send(Actions.RESTORE, null, source, { phase: Phase.LIVE });
      if (!result.ok) {
        setRestoreLoading(false);
      }
      return result;
    },
    requestManageSubscriptions: function (source, product) {
      var prod = product === Products.ARCHIVAL ? Products.ARCHIVAL : (product === Products.PRO ? Products.PRO : null);
      if (prod === Products.ARCHIVAL) {
        iapDebugLog('[IAPBridge] sending manage archival', source);
      } else if (prod === Products.PRO) {
        iapDebugLog('[IAPBridge] sending manage pro', source);
      } else {
        iapDebugLog('[IAPBridge] sending manage (all)', source);
      }
      return send(Actions.MANAGE, prod, source, { phase: Phase.LIVE });
    },
    tryPreparePurchaseFlow: tryPreparePurchaseFlow,
    refreshWebSubscriptionState: refreshWebSubscriptionState,
    IapButtonRoles: IapButtonRoles,
    setPurchaseLoading: setPurchaseLoading,
    setRestoreLoading: setRestoreLoading,
    STOREKIT_PRODUCT_IDS: STOREKIT_PRODUCT_IDS,
    StoreKitPriceStatus: StoreKitPriceStatus,
    shouldUseStoreKitPricing: shouldUseStoreKitPricing,
    getStoreKitPriceStatus: getStoreKitPriceStatus,
    getStoreKitProductRecord: getStoreKitProductRecord,
    resolveStoreKitDisplayPrice: resolveStoreKitDisplayPrice,
    getStoreKitPriceFallbackLabel: getStoreKitPriceFallbackLabel,
    requestStoreKitPrices: requestStoreKitPrices,
    appendPerMonthSuffix: appendPerMonthSuffix,
    looksLikeUsdPriceText: looksLikeUsdPriceText,
    isUnsafeUsdStoreKitPrice: isUnsafeUsdStoreKitPrice,
    priceTrace: priceTrace,
    logIapEnvTrace: logIapEnvTrace
  };

  window.GuriGONativeIapBridge = api;
  window.gurigoPriceTrace = priceTrace;
  window.logIapEnvTrace = logIapEnvTrace;
  window.looksLikeUsdPriceText = looksLikeUsdPriceText;

  window.openAppleSubscription = function () {
    var r = api.requestPurchasePro('legacy_openAppleSubscription');
    return !!r.ok;
  };

  if (!window.__gurigoIapBridgeListenersInstalled) {
    window.__gurigoIapBridgeListenersInstalled = true;
    window.addEventListener('gurigo:iapBridgeAck', onIapBridgeAck);
    window.addEventListener('gurigo:iapStatusChanged', onIapStatusChanged);
    window.addEventListener('gurigo:storeKitPrices', onStoreKitPrices);
  }

  if (isNativeShell()) {
    markStoreKitPricesLoading();
    logBridgeState('init');
    try {
      console.warn('[GuriGO] NativeIapBridge build=' + WEB_BUILD_TAG);
    } catch (_) { /* ignore */ }
    logIapEnvTrace('iap_bridge_init');
    priceTrace('iap_bridge_init', {
      productType: 'pro',
      productId: STOREKIT_PRODUCT_IDS.pro,
      environment: 'native_ios_apple_iap',
      source: 'unknown',
      functionName: 'iap_bridge_init'
    });
    priceTrace('iap_bridge_init', {
      productType: 'archival',
      productId: STOREKIT_PRODUCT_IDS.archival,
      environment: 'native_ios_apple_iap',
      source: 'unknown',
      functionName: 'iap_bridge_init'
    });
  }
})();
