// === ELŐFIZETÉS INFORMÁCIÓ RENDERELÉS (Beállítások nézet) ===
// Tier típusok: free, pro, tester

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const SUBSCRIPTION_DOWNGRADE_GRACE_DAYS_CLIENT = window.SUBSCRIPTION_DOWNGRADE_GRACE_DAYS || 14;

const STRIPE_CHECKOUT_CLIENT_STORAGE_KEYS = [
  'gurigo_stripe_checkout_lock',
  'stripe_checkout_in_progress',
  'stripeCheckoutLock',
  'pendingCheckoutSessionId',
  'checkoutStartedAt',
];

function createCheckoutAttemptId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (_) {}
  return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 12);
}

/**
 * Firebase ID token for createCheckoutSession.
 * The live function answers HTTP 401 MISSING_AUTH when Authorization is missing.
 * A missing, empty, or failed token throws before any POST. The existing checkout
 * catch shows the generic alert and does not expose the raw backend message.
 */
async function getCheckoutFirebaseIdToken() {
  const fallbackT = function (_key, fallback) { return fallback; };
  let user = null;
  try {
    if (window.currentUser && typeof window.currentUser.getIdToken === 'function') {
      user = window.currentUser;
    } else if (
      typeof firebase !== 'undefined' &&
      firebase.auth &&
      typeof firebase.auth === 'function' &&
      firebase.auth().currentUser &&
      typeof firebase.auth().currentUser.getIdToken === 'function'
    ) {
      user = firebase.auth().currentUser;
    }
  } catch (_) {
    user = null;
  }
  if (!user) {
    throw createCheckoutSessionError({ error: 'MISSING_AUTH' }, fallbackT);
  }
  let token = '';
  try {
    token = await user.getIdToken();
  } catch (_) {
    throw createCheckoutSessionError({ error: 'INVALID_AUTH' }, fallbackT);
  }
  if (typeof token !== 'string' || !token.trim()) {
    throw createCheckoutSessionError({ error: 'MISSING_AUTH' }, fallbackT);
  }
  return token.trim();
}

function clearStripeCheckoutClientState() {
  STRIPE_CHECKOUT_CLIENT_STORAGE_KEYS.forEach(function (key) {
    try { localStorage.removeItem(key); } catch (_) {}
    try { sessionStorage.removeItem(key); } catch (_) {}
  });
}

async function releaseStripeCheckoutPendingOnServer(tier) {
  if (!window.currentUser || !window.currentUser.uid) return;
  const url = window.BILLING_CONFIG && window.BILLING_CONFIG.cloudFunctions
    ? window.BILLING_CONFIG.cloudFunctions.releaseStripeCheckoutPending
    : null;
  if (!url) return;
  try {
    const token = await firebase.auth().currentUser.getIdToken();
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        uid: window.currentUser.uid,
        testMode: !!(window.BILLING_CONFIG && window.BILLING_CONFIG.testMode),
        tier: tier || null,
      }),
    });
  } catch (e) {
    console.warn('[Subscription] releaseStripeCheckoutPending', e);
  }
}

async function handleStripeCheckoutReturnOnLoad() {
  try {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment !== 'cancel' && payment !== 'success') return;

    clearStripeCheckoutClientState();
    if (typeof hideStripeCheckoutLoading === 'function') hideStripeCheckoutLoading();

    const cleanUrl = function () {
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('payment');
        u.searchParams.delete('session_id');
        window.history.replaceState({}, document.title, u.toString());
      } catch (_) {}
    };

    const runAfterAuth = async function () {
      if (payment === 'cancel') {
        await releaseStripeCheckoutPendingOnServer(null);
      }
      if (typeof loadUserSubscription === 'function' && window.currentUser && window.currentUser.uid) {
        await loadUserSubscription(window.currentUser.uid, { forceRefresh: true });
      }
      if (typeof renderSubscriptionInfo === 'function') renderSubscriptionInfo();
    };

    cleanUrl();

    if (window.currentUser && window.currentUser.uid) {
      await runAfterAuth();
    } else if (typeof firebase !== 'undefined' && firebase.auth) {
      const unsub = firebase.auth().onAuthStateChanged(function (user) {
        if (!user) return;
        try { unsub(); } catch (_) {}
        void runAfterAuth();
      });
    }
  } catch (e) {
    console.warn('[Subscription] handleStripeCheckoutReturnOnLoad', e);
  }
}

function formatTemplate(template, replacements) {
  if (!template || typeof template !== 'string') return '';
  return template.replace(/%([A-Z_]+)%/g, (_, key) => {
    if (!replacements) return '';
    return Object.prototype.hasOwnProperty.call(replacements, key) ? replacements[key] : '';
  });
}

/** Stripe checkout API hibakód → felhasználói üzenet (soha ne a backend nyers message mezője). */
function resolveCheckoutSessionErrorMessage(errorData, t) {
  const translate = typeof t === 'function' ? t : (_, fb) => fb;
  const code = errorData && errorData.error ? String(errorData.error) : '';
  if (code === 'ALREADY_HAS_ACTIVE_PRO_STRIPE') {
    return translate(
      'subscriptionAlreadyActiveProStripe',
      'You already have an active Pro subscription in Stripe; there is no need to open a new Stripe Checkout.'
    );
  }
  if (code === 'ALREADY_HAS_ACTIVE_PRO') {
    return translate(
      'subscriptionAlreadyActiveProBackend',
      'You already have an active Pro subscription; no new payment is needed.'
    );
  }
  if (code === 'LIFETIME_ADMIN_GIFT_ACTIVE') {
    return translate(
      'subscriptionAdminGiftLifetimeCheckoutBlock',
      'You have Lifetime Pro access, so a Pro subscription cannot be started.'
    );
  }
  if (code === 'BUSINESS_TAX_REQUIRED') {
    return translate(
      'subscriptionCheckoutBusinessTaxRequired',
      'Business subscribers must provide a tax number. Please complete your billing details.'
    );
  }
  if (code === 'INVALID_TIER' || code === 'PRICE_NOT_CONFIGURED') {
    return translate('subscriptionCheckoutInvalidTier', 'Invalid subscription plan.');
  }
  return translate('subscriptionCheckoutCreateError', 'Failed to create checkout session');
}

function createCheckoutSessionError(errorData, t) {
  const err = new Error(resolveCheckoutSessionErrorMessage(errorData, t));
  err.checkoutErrorData = errorData || {};
  return err;
}

function showCheckoutSessionErrorAlert(error, t, i18n) {
  const translate = typeof t === 'function' ? t : (_, fb) => fb;
  const langPack = i18n || {};
  const title = translate('subscriptionCheckoutErrorTitle', langPack.subscriptionCheckoutErrorTitle || '❌ An error occurred');
  const footer = translate('subscriptionCheckoutErrorFooter', langPack.subscriptionCheckoutErrorFooter || 'Please try again later or email us: info@gurigo.eu');
  const message = (error && error.checkoutErrorData)
    ? resolveCheckoutSessionErrorMessage(error.checkoutErrorData, t)
    : translate('subscriptionCheckoutCreateError', 'Failed to create checkout session');
  const full = `${title}\n\n${message}\n\n${footer}`;
  if (typeof showCustomAlert === 'function') {
    showCustomAlert(full, 'error');
  } else {
    const prefix = translate('subscriptionCheckoutErrorAlertPrefix', langPack.subscriptionCheckoutErrorAlertPrefix || 'Error:');
    alert(`${prefix} ${message}`);
  }
}

function resolveCheckoutCountryCode(sub) {
  if (!sub) return undefined;
  const code = sub.registrationCountryCode || sub.countryCode;
  return code ? String(code).trim().toUpperCase() : undefined;
}

function resolveStripeCheckoutLocale(lang) {
  const map = { hu: 'hu', de: 'de', en: 'en', da: 'da', no: 'nb', pl: 'pl', ro: 'ro' };
  return (typeof lang === 'string' && map[lang]) ? map[lang] : 'auto';
}

function getActiveLocale() {
  if (typeof getCurrentLocale === 'function') {
    return getCurrentLocale();
  }
  if (typeof currentLang !== 'undefined' && currentLang === 'de') {
    return 'de-DE';
  }
  if (typeof currentLang !== 'undefined' && currentLang === 'en') {
    return 'en-US';
  }
  if (typeof currentLang !== 'undefined' && currentLang === 'ro') {
    return 'ro-RO';
  }
  if (typeof currentLang !== 'undefined' && currentLang === 'pl') {
    return 'pl-PL';
  }
  if (typeof currentLang !== 'undefined' && currentLang === 'da') {
    return 'da-DK';
  }
  if (typeof currentLang !== 'undefined' && currentLang === 'no') {
    return 'nb-NO';
  }
  return 'hu-HU';
}

function isStripeCheckoutBlockedOnNativeIos(product) {
  if (typeof window.shouldBlockStripeCheckoutOnNativeIos === 'function') {
    return window.shouldBlockStripeCheckoutOnNativeIos(product);
  }
  try {
    return window.GURIGO_NATIVE_SHELL === true && String(window.GURIGO_NATIVE_PLATFORM || '').toLowerCase() === 'ios';
  } catch (_) {
    return false;
  }
}

function isNativeIosAppShellForSubscription() {
  if (typeof window.isNativeIosAppShell === 'function') {
    return window.isNativeIosAppShell();
  }
  try {
    return window.GURIGO_NATIVE_SHELL === true && String(window.GURIGO_NATIVE_PLATFORM || '').toLowerCase() === 'ios';
  } catch (_) {
    return false;
  }
}

function canShowEarlyBirdOfferForUi() {
  if (typeof window.canShowEarlyBirdOffer === 'function') {
    return window.canShowEarlyBirdOffer();
  }
  return !isNativeIosAppShellForSubscription();
}

function getEarlyBirdPaymentWarningHtml(getTranslation) {
  const tFn = typeof getTranslation === 'function' ? getTranslation : (_, fb) => fb;
  const text = (typeof window.getEarlyBirdPaymentWarningMessage === 'function')
    ? window.getEarlyBirdPaymentWarningMessage()
    : tFn(
      'promoEarlyBirdPaymentWarning',
      'A próbaidőszak alatt nem történik terhelés. A korai kedvezmény csak sikeres első fizetés esetén válik véglegessé. Ha a fizetés a Stripe automatikus újrapróbálkozásai után is sikertelen, a kedvezmény elveszik, és később már nem aktiválható újra.',
    );
  const safe = String(text).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return (
    '<div class="border-t border-white/30 pt-3 mt-3">' +
    '<p class="text-xs opacity-95 text-white leading-relaxed m-0">⚠️ ' + safe + '</p>' +
    '</div>'
  );
}

/** App Store Review 3.1.2 — jogi linkek + auto-renew tájékoztató (csak natív iOS shell). */
function buildNativeIosSubscriptionLegalFooterHtml(t) {
  if (!isNativeIosAppShellForSubscription()) return '';

  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const termsPath = '/legal/terms-' + lang + '.html';
  const privacyPath = '/legal/privacy-' + lang + '.html';
  const termsLabel = t('subscriptionIosLegalTermsLink', 'Felhasználási feltételek');
  const privacyLabel = t('subscriptionIosLegalPrivacyLink', 'Adatvédelmi tájékoztató');
  const disclosure = t(
    'subscriptionIosAutoRenewDisclosure',
    'A Pro és az Archiválási csomag havi, automatikusan megújuló előfizetés az App Store-on keresztül. A díjat az Apple számlázza. Lemondás: Apple ID → Előfizetések, vagy az appban az Előfizetés kezelése gomb.',
  );

  function legalLink(path, label) {
    const safePath = path.replace(/"/g, '&quot;');
    const safeLabel = String(label).replace(/</g, '&lt;').replace(/"/g, '&quot;');
    const docType = path.indexOf('terms') >= 0 ? 'terms' : 'privacy';
    const icon = docType === 'terms' ? '📄' : '🔒';
    return (
      '<button type="button" ' +
      'class="subscription-legal-doc-link inline-flex items-center gap-1.5 text-sm font-semibold ' +
      'text-blue-600 dark:text-blue-400 underline decoration-2 underline-offset-2 ' +
      'hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/25 ' +
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-md px-2 py-1 -ml-2 cursor-pointer transition-colors" ' +
      'onclick="event.preventDefault(); if(typeof openLegalDoc===\'function\'){openLegalDoc(\'' +
      docType +
      '\');}else{window.open(\'' +
      safePath +
      '\',\'_blank\');}"' +
      ' aria-label="' +
      safeLabel +
      '">' +
      '<span class="text-base leading-none" aria-hidden="true">' +
      icon +
      '</span>' +
      '<span>' +
      safeLabel +
      '</span>' +
      '<span class="text-xs opacity-80" aria-hidden="true">↗</span>' +
      '</button>'
    );
  }

  return (
    '<div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">' +
    '<p class="m-0 font-medium text-gray-700 dark:text-gray-300">' +
    t('subscriptionIosLegalHeading', 'Előfizetés – App Store') +
    '</p>' +
    '<p class="m-0">' +
    disclosure +
    '</p>' +
    '<p class="m-0 text-gray-600 dark:text-gray-400">' +
    t('subscriptionIosLegalLinksIntro', 'Jogi dokumentumok (koppints a megnyitáshoz):') +
    '</p>' +
    '<div class="m-0 flex flex-wrap items-center gap-2">' +
    legalLink(termsPath, termsLabel) +
    legalLink(privacyPath, privacyLabel) +
    '</div>' +
    '</div>'
  );
}

/** App Store storefront árak — csak natív iOS IAP (StoreKit displayPrice). */
function buildNativeIosStoreKitPriceDisclaimerHtml(t) {
  if (!isNativeIosAppShellForSubscription()) return '';
  const text = t(
    'subscriptionIosStoreKitPriceDisclaimer',
    'Az App Store-on keresztüli vásárlások árát és pénznemét az Apple a felhasználó App Store-fiókja alapján jeleníti meg és számlázza.',
  );
  return (
    '<p class="text-xs text-gray-500 dark:text-gray-400 m-0 leading-relaxed">' +
    text +
    '</p>'
  );
}

function resolveProPriceForUi(countryCode, perMonthSuffix) {
  if (isNativeIosAppShellForSubscription()) {
    if (typeof window.getSubscriptionProDisplayPrice === 'function') {
      // A StoreKit displayPrice mindig az előfizető pénznemében érkezik — minden esetben ezt mutatjuk.
      return window.getSubscriptionProDisplayPrice(countryCode, perMonthSuffix || '');
    }
    return { source: 'storekit', formatted: 'Ár betöltése…', isFallback: true };
  }
  if (typeof window.getSubscriptionProDisplayPrice === 'function') {
    return window.getSubscriptionProDisplayPrice(countryCode, perMonthSuffix || '');
  }
  var info = getProPriceInfo(countryCode);
  return {
    source: 'country',
    formatted: (info && info.formatted ? info.formatted : '') + (perMonthSuffix || ''),
    isFallback: false,
  };
}

function resolveArchivalPriceForUi(countryCode, perMonthSuffix) {
  if (isNativeIosAppShellForSubscription()) {
    if (typeof window.getSubscriptionArchivalDisplayPrice === 'function') {
      // A StoreKit displayPrice mindig az előfizető pénznemében érkezik — minden esetben ezt mutatjuk.
      return window.getSubscriptionArchivalDisplayPrice(countryCode, perMonthSuffix || '');
    }
    return { source: 'storekit', formatted: 'Ár betöltése…', isFallback: true };
  }
  if (typeof window.getSubscriptionArchivalDisplayPrice === 'function') {
    return window.getSubscriptionArchivalDisplayPrice(countryCode, perMonthSuffix || '');
  }
  var archivalPriceInfo =
    typeof window.getArchivalPrice === 'function'
      ? window.getArchivalPrice('archival', countryCode)
      : null;
  var perMonth = archivalPriceInfo && archivalPriceInfo.perMonth ? archivalPriceInfo.perMonth : null;
  var isHu = (countryCode || '').toUpperCase() === 'HU';
  if (typeof currentLang !== 'undefined' && currentLang === 'de' && perMonth && perMonth.de) {
    return { source: 'country', formatted: perMonth.de, isFallback: false };
  }
  if (typeof currentLang !== 'undefined' && currentLang === 'en' && archivalPriceInfo) {
    return {
      source: 'country',
      formatted: archivalPriceInfo.formatted + '/month',
      isFallback: false,
    };
  }
  if (perMonth && perMonth.hu) {
    return { source: 'country', formatted: perMonth.hu, isFallback: false };
  }
  if (archivalPriceInfo) {
    return {
      source: 'country',
      formatted: archivalPriceInfo.formatted + (isHu ? '/hó' : '/Monat'),
      isFallback: false,
    };
  }
  return {
    source: 'country',
    formatted: isHu ? '499 Ft/hó' : '1,49 €/Monat',
    isFallback: false,
  };
}

function showNativeIosIapBridgeUnavailable(t, reason) {
  const key = 'subscriptionNativeIosIapBridgeUnavailable';
  const fallback =
    'Az App Store vásárlás most nem indítható el.\n\n' +
    'Indítsd újra az alkalmazást, és próbáld újra. Ha továbbra is fennáll, frissítsd a TestFlight buildet.';
  let msg = t(key, fallback);
  if (reason === 'bridge_unavailable' || reason === 'post_failed') {
    msg = t(key, fallback);
  }
  if (typeof showCustomAlert === 'function') {
    showCustomAlert(msg, 'warning');
  } else {
    alert(msg);
  }
}

function shouldManageArchivalViaAppleIap(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  if (typeof window.isArchivalBilledViaAppleIap === 'function') {
    return window.isArchivalBilledViaAppleIap(sub);
  }
  if (typeof window.getArchivalManagementMode === 'function') {
    return window.getArchivalManagementMode(sub).mode === 'apple_manage';
  }
  return false;
}

function shouldManageProViaAppleIap(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  if (typeof window.isProBilledViaAppleIap === 'function') {
    return window.isProBilledViaAppleIap(sub);
  }
  if (typeof window.getProManagementMode === 'function') {
    return window.getProManagementMode(sub).mode === 'apple_manage';
  }
  return false;
}

function getProManagementModeForUi(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  if (typeof window.getProManagementMode === 'function') {
    return window.getProManagementMode(sub);
  }
  return { mode: 'none', provider: 'unknown' };
}

function pickSubDate(v) {
  try {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v.toDate === 'function') return v.toDate();
    return new Date(v);
  } catch (_) {
    return null;
  }
}

/** Tényleges próba (lemondás): isTrial + még nem járt le, vagy trialEnd a jövőben fizetős Stripe sub nélkül. */
function isGenuineTrialActiveForDowngrade(sub) {
  const stripeSubId = sub.stripeSubscriptionId && String(sub.stripeSubscriptionId).trim();
  if (stripeSubId) return false;
  if (sub.isTrial === true) {
    const end = pickSubDate(sub.trialEnd);
    return !end || end > new Date();
  }
  const end = pickSubDate(sub.trialEnd);
  return !!(end && end > new Date());
}

/** Aktív Stripe Pro – cancel flow (nem függ proMgmt.mode / stale subscriptionStatus=canceled mezőktől). */
function hasActiveStripeProForDowngrade(sub) {
  const stripeSubId = sub.stripeSubscriptionId && String(sub.stripeSubscriptionId).trim();
  if (!stripeSubId) return false;

  const tier = String(sub.tier || sub.subscriptionTier || '').trim().toLowerCase();
  if (tier !== 'pro') return false;

  if (typeof window.isProBilledViaAppleIap === 'function' && window.isProBilledViaAppleIap(sub)) {
    return false;
  }
  if (typeof window.isAppleProSignalActive === 'function' && window.isAppleProSignalActive(sub)) {
    const ep = String(sub.entitlementsProvider || '').trim().toLowerCase();
    if (ep === 'apple') return false;
  }

  if (sub.entitlementsIsPro === true) {
    const ep = String(sub.entitlementsProvider || '').trim().toLowerCase();
    if (ep === 'stripe') return true;
    if (ep === 'apple') return false;
  }

  if (typeof window.hasActiveStripeProSubscription === 'function') {
    return window.hasActiveStripeProSubscription(sub);
  }

  const st = String(sub.status || sub.subscriptionStatus || '').trim().toLowerCase();
  if (st === 'incomplete') return false;
  if (st === 'canceled' || st === 'cancelled' || st === 'incomplete_expired') {
    const periodEnd =
      pickSubDate(sub.currentPeriodEnd) || pickSubDate(sub.activeUntil) || pickSubDate(sub.expiry);
    if (!(periodEnd && periodEnd > new Date())) return false;
  }
  const activeish = ['active', 'trialing', 'past_due', 'downgrade_grace', 'trialing_canceled'].includes(st);
  if (activeish) return true;
  const periodEnd =
    pickSubDate(sub.currentPeriodEnd) || pickSubDate(sub.activeUntil) || pickSubDate(sub.expiry);
  return !!(periodEnd && periodEnd > new Date());
}

function hasActiveAppleProForDowngrade(sub) {
  if (typeof window.isProBilledViaAppleIap === 'function' && window.isProBilledViaAppleIap(sub)) {
    return true;
  }
  if (typeof window.isAppleProSignalActive === 'function' && window.isAppleProSignalActive(sub)) {
    return true;
  }
  const proMgmt = getProManagementModeForUi(sub);
  return proMgmt.provider === 'apple' && proMgmt.mode !== 'none';
}

function getArchivalManagementModeForUi(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  if (typeof window.getArchivalManagementMode === 'function') {
    return window.getArchivalManagementMode(sub);
  }
  return { mode: 'none', provider: 'unknown' };
}

function escapeSubscriptionModalHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Cím + szöveg külön – GuriGO custom alert (#custom-alert-title + message). */
function showSubscriptionTitleBodyAlert(title, body, alertType, callback, options) {
  const opts = options || {};
  const bodyHtml =
    '<p class="text-sm text-gray-700 dark:text-gray-300 m-0 leading-relaxed">' +
    escapeSubscriptionModalHtml(body) +
    '</p>';
  if (typeof showCustomAlert === 'function') {
    showCustomAlert(bodyHtml, alertType || 'info', callback || null, Object.assign({
      allowHTML: true,
      title: title,
    }, opts));
  } else {
    alert(title + '\n\n' + body);
  }
}

function showSubscriptionProviderInfo(product, mode, i18n) {
  const t = (key, fallback) => {
    const v = getI18nValue(i18n, key);
    return (v != null && v !== '') ? v : fallback;
  };
  const isArchival = product === 'archival';
  let titleKey;
  let bodyKey;
  let titleFallback;
  let bodyFallback;

  if (mode === 'apple_info_web') {
    titleKey = 'subscriptionManageAppleOnWebTitle';
    bodyKey = isArchival ? 'subscriptionManageAppleOnWebArchivalBody' : 'subscriptionManageAppleOnWebProBody';
    titleFallback = 'Apple előfizetés kezelése';
    bodyFallback = isArchival
      ? 'Ez az Archiválási csomag az Apple App Store-on keresztül jött létre. Lemondani vagy kezelni az Apple ID / App Store előfizetések között tudod.'
      : 'Ez a Pro előfizetés az Apple App Store-on keresztül jött létre. Lemondani vagy kezelni az Apple ID / App Store előfizetések között tudod.';
  } else if (mode === 'stripe_info_ios') {
    titleKey = 'subscriptionManageStripeOnIosTitle';
    bodyKey = isArchival ? 'subscriptionManageStripeOnIosArchivalBody' : 'subscriptionManageStripeOnIosProBody';
    titleFallback = 'Webes előfizetés kezelése';
    bodyFallback = isArchival
      ? 'Ez az Archiválási előfizetés weben/Stripe-on keresztül jött létre. Kezelni vagy lemondani böngészőből, a gurigo.eu oldalon tudod.'
      : 'Ez a Pro előfizetés weben/Stripe-on keresztül jött létre. Kezelni vagy lemondani böngészőből, a gurigo.eu oldalon tudod.';
  } else {
    titleKey = 'subscriptionCannotManageHereTitle';
    bodyKey = 'subscriptionCannotManageHereBody';
    titleFallback = 'Előfizetés kezelése';
    bodyFallback = 'Ezt az előfizetést nem ezen a felületen tudod kezelni. Használd az eredeti vásárlási csatornát (App Store vagy gurigo.eu).';
  }

  const title = t(titleKey, titleFallback);
  const body = t(bodyKey, bodyFallback);
  showSubscriptionTitleBodyAlert(title, body, 'info', null, {
    okText: t('commonOk', t('ok', 'Rendben')),
  });
}

function resolveCancelPendingNoNewPurchaseInfoKey(subOptional, product) {
  const sub = subOptional || window.currentUserSubscription || {};
  const isIos =
    typeof window.isNativeIosAppShell === 'function' && window.isNativeIosAppShell();
  const productKey = product === 'archival' ? 'archival' : 'pro';
  let provider = 'unknown';
  if (productKey === 'archival' && typeof window.getArchivalBillingProvider === 'function') {
    provider = window.getArchivalBillingProvider(sub);
  } else if (typeof window.getProBillingProvider === 'function') {
    provider = window.getProBillingProvider(sub);
  }
  if (isIos && provider === 'stripe') {
    return productKey === 'archival'
      ? 'subscriptionStripeArchivalCancelPendingIosInfo'
      : 'subscriptionStripeCancelPendingIosNoIapInfo';
  }
  if (isIos && provider === 'apple') {
    return 'subscriptionAppleCancelPendingIosNoIapInfo';
  }
  return 'subscriptionCancelPendingNoNewPurchaseInfo';
}

function buildCancelPendingNoNewPurchaseInfoHtml(t, options) {
  const sub = (options && options.sub) || window.currentUserSubscription || {};
  const product = options && options.product === 'archival' ? 'archival' : 'pro';
  const infoKey = resolveCancelPendingNoNewPurchaseInfoKey(sub, product);
  const fallbacks = {
    subscriptionStripeArchivalCancelPendingIosInfo:
      'Ez még aktív webes/Stripe előfizetés. Kezelni böngészőből tudod; Apple App Store-os előfizetés csak a jelenlegi időszak lejárta után indítható.',
    subscriptionStripeCancelPendingIosNoIapInfo:
      'Ez még aktív webes/Stripe előfizetés. Apple App Store-os előfizetést csak a kifizetett időszak lejárta után indíthatsz.',
    subscriptionAppleCancelPendingIosNoIapInfo:
      'Ez az App Store-os előfizetés még aktív a kifizetett időszak végéig. Új előfizetés indítására most nincs szükség.',
    subscriptionCancelPendingNoNewPurchaseInfo:
      'Ez a csomag még aktív a kifizetett időszak végéig. Új előfizetést csak a jelenlegi időszak lejárta után indíthatsz.',
  };
  const text = t(infoKey, fallbacks[infoKey] || fallbacks.subscriptionCancelPendingNoNewPurchaseInfo);
  return (
    '<div class="mt-2 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">' +
    '<p class="m-0 text-xs text-gray-600 dark:text-gray-400 flex items-start gap-1.5">' +
    '<span class="shrink-0" aria-hidden="true">ℹ️</span>' +
    '<span>' + text + '</span>' +
    '</p></div>'
  );
}

function getStripeBillingRequestTestMode() {
  const sub = window.currentUserSubscription || {};
  if (sub.stripeBillingEnv === 'test') return true;
  if (sub.stripeBillingEnv === 'prod') return false;
  return !!(window.BILLING_CONFIG && window.BILLING_CONFIG.testMode);
}

const getPortalRequestTestMode = getStripeBillingRequestTestMode;

function getResumeErrorKind(errorData) {
  const code = String((errorData && errorData.code) || (errorData && errorData.error) || '').toUpperCase();
  if (code === 'STRIPE_RESUME_SUBSCRIPTION_NOT_FOUND' || code === 'CUSTOMER_NOT_FOUND' || code === 'NO_STRIPE_CUSTOMER') {
    return 'not_found';
  }
  if (code === 'STRIPE_RESUME_ENV_MISMATCH') {
    return 'env_mismatch';
  }
  if (code === 'STRIPE_RESUME_NOT_RESUMABLE' || code === 'NO_RESUMABLE_SUBSCRIPTION') {
    return 'not_resumable';
  }
  return 'generic';
}

function showSubscriptionResumeError(kind) {
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  const t = (key, fallback) => {
    const v = getI18nValue(i18n, key);
    return (v != null && v !== '') ? v : fallback;
  };
  const okLabel = t('commonOk', t('ok', 'Rendben'));
  let title = t('subscriptionResumeErrorTitle', 'Nem sikerült újraaktiválni az előfizetést');
  let body;
  if (kind === 'not_found') {
    body = t(
      'subscriptionResumeNotFoundBody',
      'Nem találtuk a lemondás alatt álló Stripe előfizetést. Az előfizetésed állapotát nem módosítottuk. Kérlek próbáld újra később, vagy írj nekünk: info@gurigo.eu',
    );
  } else if (kind === 'env_mismatch') {
    body = t(
      'subscriptionResumeEnvMismatchBody',
      'Nem sikerült újraaktiválni a Stripe előfizetést a teszt/éles környezet eltérése miatt. Az előfizetésed állapotát nem módosítottuk.',
    );
  } else if (kind === 'not_resumable') {
    body = t(
      'subscriptionResumeNotResumableBody',
      'Jelenleg nincs lemondás alatt álló, újraaktiválható előfizetés. Indíthatsz új Pro előfizetést a csomagváltás gombbal.',
    );
  } else {
    body = t(
      'subscriptionResumeGenericBody',
      'Nem sikerült újraaktiválni az előfizetést. Kérlek próbáld újra később.',
    );
  }
  showSubscriptionTitleBodyAlert(title, body, 'error', null, { okText: okLabel });
}

const RESUME_PRO_SUBSCRIPTION_BTN_ID = 'resumeProSubscriptionBtn';

function getResumeProSubscriptionButton() {
  return document.getElementById(RESUME_PRO_SUBSCRIPTION_BTN_ID);
}

function setResumeSubscriptionButtonLoading(isLoading, t) {
  const btn = getResumeProSubscriptionButton();
  if (!btn) return;
  if (isLoading) {
    if (!btn.dataset.resumeOriginalHtml) {
      btn.dataset.resumeOriginalHtml = btn.innerHTML;
    }
    const loadingText = t('subscriptionResumeLoading', 'Újraaktiválás folyamatban…');
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('opacity-90', 'cursor-wait', 'pointer-events-none');
    btn.innerHTML =
      '<span class="inline-flex items-center justify-center gap-2 w-full">' +
      '<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true"></span>' +
      '<span class="resume-btn-label">' + loadingText + '</span>' +
      '</span>';
    return;
  }
  btn.disabled = false;
  btn.removeAttribute('aria-busy');
  btn.classList.remove('opacity-90', 'cursor-wait', 'pointer-events-none');
  if (btn.dataset.resumeOriginalHtml) {
    btn.innerHTML = btn.dataset.resumeOriginalHtml;
    delete btn.dataset.resumeOriginalHtml;
  }
}

const CANCEL_PRO_SUBSCRIPTION_BTN_ID = 'cancelProSubscriptionBtn';

function getCancelProSubscriptionButton() {
  return document.getElementById(CANCEL_PRO_SUBSCRIPTION_BTN_ID);
}

const CANCEL_ARCHIVAL_SUBSCRIPTION_BTN_ID = 'cancelArchivalSubscriptionBtn';
const RESUME_ARCHIVAL_SUBSCRIPTION_BTN_ID = 'resumeArchivalSubscriptionBtn';

function getResumeArchivalSubscriptionButton() {
  return document.getElementById(RESUME_ARCHIVAL_SUBSCRIPTION_BTN_ID);
}

function setResumeArchivalSubscriptionButtonLoading(isLoading, t) {
  const btn = getResumeArchivalSubscriptionButton();
  if (!btn) return;
  if (isLoading) {
    if (!btn.dataset.archivalResumeOriginalHtml) {
      btn.dataset.archivalResumeOriginalHtml = btn.innerHTML;
    }
    const loadingText = t('subscriptionArchivalResumeLoading', 'Újraaktiválás folyamatban…');
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('opacity-90', 'cursor-wait', 'pointer-events-none');
    btn.innerHTML =
      '<span class="inline-flex items-center justify-center gap-2 w-full">' +
      '<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true"></span>' +
      '<span class="archival-resume-btn-label">' + loadingText + '</span>' +
      '</span>';
    return;
  }
  btn.disabled = false;
  btn.removeAttribute('aria-busy');
  btn.classList.remove('opacity-90', 'cursor-wait', 'pointer-events-none');
  if (btn.dataset.archivalResumeOriginalHtml) {
    btn.innerHTML = btn.dataset.archivalResumeOriginalHtml;
    delete btn.dataset.archivalResumeOriginalHtml;
  }
}

function showSubscriptionArchivalResumeSuccess() {
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  const t = (key, fallback) => {
    const v = getI18nValue(i18n, key);
    return (v != null && v !== '') ? v : fallback;
  };
  const title = t('subscriptionArchivalResumeSuccessTitle', 'Archiválási csomag újraaktiválva');
  const body = t(
    'subscriptionArchivalResumeSuccessBody',
    'Az Archiválási csomag ismét aktív, és a következő időszakban automatikusan megújul.',
  );
  showSubscriptionTitleBodyAlert(title, body, 'success', null, {
    okText: t('commonOk', t('ok', 'Rendben')),
  });
}

function showSubscriptionArchivalResumeError(kind) {
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  const t = (key, fallback) => {
    const v = getI18nValue(i18n, key);
    return (v != null && v !== '') ? v : fallback;
  };
  const okLabel = t('commonOk', t('ok', 'Rendben'));
  const title = t('subscriptionArchivalResumeErrorTitle', 'Nem sikerült újraaktiválni');
  let body;
  if (kind === 'not_found') {
    body = t(
      'subscriptionArchivalResumeNotFoundBody',
      'Nem találtunk lemondás alatt álló Stripe Archiválási előfizetést ehhez a fiókhoz.',
    );
  } else if (kind === 'env_mismatch') {
    body = t(
      'subscriptionArchivalResumeEnvMismatchBody',
      'Nem sikerült újraaktiválni a teszt/éles környezet eltérése miatt.',
    );
  } else {
    body = t(
      'subscriptionArchivalResumeGenericBody',
      'Nem sikerült visszavonni a lemondást. Kérlek próbáld újra később.',
    );
  }
  showSubscriptionTitleBodyAlert(title, body, 'error', null, { okText: okLabel });
}

function getCancelArchivalSubscriptionButton() {
  return document.getElementById(CANCEL_ARCHIVAL_SUBSCRIPTION_BTN_ID);
}

function setCancelArchivalSubscriptionButtonLoading(isLoading, t) {
  const btn = getCancelArchivalSubscriptionButton();
  if (!btn) return;
  if (isLoading) {
    if (!btn.dataset.archivalCancelOriginalHtml) {
      btn.dataset.archivalCancelOriginalHtml = btn.innerHTML;
    }
    const loadingText = t('subscriptionArchivalCancelLoading', 'Lemondás folyamatban…');
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('opacity-90', 'cursor-wait', 'pointer-events-none');
    btn.innerHTML =
      '<span class="inline-flex items-center justify-center gap-2 w-full">' +
      '<span class="inline-block w-4 h-4 border-2 border-red-800 border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true"></span>' +
      '<span class="archival-cancel-btn-label">' + loadingText + '</span>' +
      '</span>';
    return;
  }
  btn.disabled = false;
  btn.removeAttribute('aria-busy');
  btn.classList.remove('opacity-90', 'cursor-wait', 'pointer-events-none');
  if (btn.dataset.archivalCancelOriginalHtml) {
    btn.innerHTML = btn.dataset.archivalCancelOriginalHtml;
    delete btn.dataset.archivalCancelOriginalHtml;
  }
}

function setCancelSubscriptionButtonLoading(isLoading, t) {
  const btn = getCancelProSubscriptionButton();
  if (!btn) return;
  if (isLoading) {
    if (!btn.dataset.cancelOriginalHtml) {
      btn.dataset.cancelOriginalHtml = btn.innerHTML;
    }
    const loadingText = t('subscriptionCancelLoading', 'Lemondás folyamatban…');
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('opacity-90', 'cursor-wait', 'pointer-events-none');
    btn.innerHTML =
      '<span class="inline-flex items-center justify-center gap-2 w-full">' +
      '<span class="inline-block w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true"></span>' +
      '<span class="cancel-btn-label">' + loadingText + '</span>' +
      '</span>';
    return;
  }
  btn.disabled = false;
  btn.removeAttribute('aria-busy');
  btn.classList.remove('opacity-90', 'cursor-wait', 'pointer-events-none');
  if (btn.dataset.cancelOriginalHtml) {
    btn.innerHTML = btn.dataset.cancelOriginalHtml;
    delete btn.dataset.cancelOriginalHtml;
  }
}

const MANAGE_STRIPE_SUBSCRIPTION_BTN_ID = 'manageStripeSubscriptionBtn';

function getManageStripeSubscriptionButton() {
  return document.getElementById(MANAGE_STRIPE_SUBSCRIPTION_BTN_ID);
}

function setManageSubscriptionButtonLoading(isLoading, t) {
  const btn = getManageStripeSubscriptionButton();
  if (!btn) return;
  if (isLoading) {
    if (!btn.dataset.manageOriginalHtml) {
      btn.dataset.manageOriginalHtml = btn.innerHTML;
    }
    const loadingText = t('subscriptionManageLoading', 'Előfizetés-kezelő megnyitása…');
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    btn.classList.add('opacity-90', 'cursor-wait', 'pointer-events-none');
    btn.innerHTML =
      '<span class="inline-flex items-center justify-center gap-2 w-full">' +
      '<span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true"></span>' +
      '<span class="manage-subscription-btn-label">' + loadingText + '</span>' +
      '</span>';
    return;
  }
  btn.disabled = false;
  btn.removeAttribute('aria-busy');
  btn.classList.remove('opacity-90', 'cursor-wait', 'pointer-events-none');
  if (btn.dataset.manageOriginalHtml) {
    btn.innerHTML = btn.dataset.manageOriginalHtml;
    delete btn.dataset.manageOriginalHtml;
  }
}

function showSubscriptionResumeSuccess() {
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  const t = (key, fallback) => {
    const v = getI18nValue(i18n, key);
    return (v != null && v !== '') ? v : fallback;
  };
  const title = t('subscriptionResumeSuccessTitle', 'Az előfizetés újraaktiválva');
  const body = t(
    'subscriptionResumeSuccessBody',
    'A Pro előfizetésed újra aktív, és a következő időszakban automatikusan megújul.',
  );
  showSubscriptionTitleBodyAlert(title, body, 'success', null, {
    okText: t('commonOk', t('ok', 'Rendben')),
  });
}

function getPortalErrorKind(errorData) {
  const code = String((errorData && errorData.code) || (errorData && errorData.error) || '').toUpperCase();
  if (code === 'PORTAL_NO_STRIPE_CUSTOMER' || code === 'NO_STRIPE_CUSTOMER' || code === 'PORTAL_NO_ACTIVE_STRIPE_SUBSCRIPTION') {
    return 'no_customer';
  }
  if (code === 'STRIPE_PORTAL_NOT_CONFIGURED') {
    return 'not_configured';
  }
  if (code === 'STRIPE_PORTAL_ENV_MISMATCH') {
    return 'env_mismatch';
  }
  if (code === 'STRIPE_PORTAL_SESSION_FAILED' || code === 'PORTAL_SESSION_FAILED') {
    return 'generic';
  }
  return 'generic';
}

function isStripePortalNoCustomerError(error) {
  if (error && typeof error === 'object' && error.portalErrorKind === 'no_customer') {
    return true;
  }
  const code = String((error && error.code) || '').toUpperCase();
  return code === 'PORTAL_NO_STRIPE_CUSTOMER'
    || code === 'NO_STRIPE_CUSTOMER'
    || code === 'PORTAL_NO_ACTIVE_STRIPE_SUBSCRIPTION';
}

function showSubscriptionPortalError(kind, errorOptional) {
  if (typeof hideStripeCheckoutLoading === 'function') {
    hideStripeCheckoutLoading();
  }
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  const t = (key, fallback) => {
    const v = getI18nValue(i18n, key);
    return (v != null && v !== '') ? v : fallback;
  };
  const okLabel = t('commonOk', t('ok', 'Rendben'));
  let resolvedKind = kind;
  if (errorOptional && typeof errorOptional === 'object' && errorOptional.portalErrorKind) {
    resolvedKind = errorOptional.portalErrorKind;
  } else if (isStripePortalNoCustomerError(errorOptional)) {
    resolvedKind = 'no_customer';
  }

  let title;
  let body;
  if (resolvedKind === 'no_customer') {
    title = t('subscriptionPortalNoCustomerTitle', 'Előfizetés-kezelés nem elérhető');
    body = t(
      'subscriptionPortalNoCustomerBody',
      'Ehhez a fiókhoz nem találtunk webes Stripe-előfizetést. Ha Apple App Store-on keresztül fizettél elő, az előfizetést az Apple ID / App Store előfizetések között tudod kezelni.',
    );
  } else if (resolvedKind === 'not_configured') {
    title = t('subscriptionPortalNotConfiguredTitle', 'Előfizetés-kezelés átmenetileg nem elérhető');
    body = t(
      'subscriptionPortalNotConfiguredBody',
      'A Stripe előfizetés-kezelő jelenleg nincs beállítva ebben a környezetben. Az előfizetésed aktív, de a kezelőfelület most nem nyitható meg.',
    );
  } else if (resolvedKind === 'env_mismatch') {
    title = t('subscriptionPortalEnvMismatchTitle', 'Előfizetés-kezelés nem nyitható meg');
    body = t(
      'subscriptionPortalEnvMismatchBody',
      'Nem sikerült megnyitni a Stripe előfizetés-kezelőt a teszt/éles környezet eltérése miatt.',
    );
  } else {
    title = t('subscriptionPortalErrorTitle', 'Nem sikerült megnyitni az előfizetés-kezelést');
    body = t(
      'subscriptionPortalErrorBody',
      'Nem sikerült megnyitni az előfizetés-kezelést. Kérlek próbáld újra később.',
    );
  }
  showSubscriptionTitleBodyAlert(title, body, 'info', null, { okText: okLabel });
}

function handleProProviderManage() {
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  const sub = window.currentUserSubscription || {};
  const mgmt = getProManagementModeForUi(sub);

  if (mgmt.mode === 'apple_manage') {
    openNativeIosManageSubscriptions('pro', 'subscription_pro_manage', i18n);
    return;
  }
  if (mgmt.mode === 'apple_info_web' || mgmt.mode === 'stripe_info_ios') {
    showSubscriptionProviderInfo('pro', mgmt.mode, i18n);
    return;
  }
  if (mgmt.mode === 'stripe_manage') {
    handleSubscriptionAction('downgrade_free');
    return;
  }
  if (mgmt.mode === 'trial_info') {
    handleSubscriptionAction('downgrade_free');
  }
}

function handleArchivalProviderManage() {
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  const sub = window.currentUserSubscription || {};
  const mgmt = getArchivalManagementModeForUi(sub);

  if (mgmt.mode === 'apple_manage') {
    openNativeIosManageSubscriptions('archival', 'subscription_archival_manage', i18n);
    return;
  }
  if (mgmt.mode === 'apple_info_web' || mgmt.mode === 'stripe_info_ios') {
    showSubscriptionProviderInfo('archival', mgmt.mode, i18n);
    return;
  }
  if (mgmt.mode === 'stripe_manage') {
    handleArchivalCancel();
  }
}

function handleNativeIosRestorePurchases() {
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  const t = (key, fallback) => {
    const v = getI18nValue(i18n, key);
    return (v != null && v !== '') ? v : fallback;
  };
  const bridge = window.GuriGONativeIapBridge;
  if (!bridge || typeof bridge.requestRestorePurchases !== 'function') {
    showNativeIosIapBridgeUnavailable(t, 'bridge_missing');
    return;
  }
  const result = bridge.requestRestorePurchases('subscription_restore');
  if (!result || !result.ok) {
    showNativeIosIapBridgeUnavailable(t, result && result.reason);
  }
}

function openNativeIosManageSubscriptions(product, source, i18n) {
  const bridge = window.GuriGONativeIapBridge;
  const t = (key, fallback) => {
    const v = getI18nValue(i18n, key);
    return (v != null && v !== '') ? v : fallback;
  };
  const isArchival = product === 'archival';
  const confirmTitle = isArchival
    ? t('subscriptionArchivalManageAppStoreConfirmTitle', 'App Store előfizetéskezelés')
    : t('subscriptionProManageAppStoreConfirmTitle', 'App Store előfizetéskezelés');
  const confirmMsg = isArchival
    ? t(
        'subscriptionArchivalManageAppStoreConfirmBody',
        'Az Apple App Store-ban vásárolt előfizetést az App Store előfizetéskezelő felületén tudod módosítani vagy lemondani.',
      )
    : t(
        'subscriptionProManageAppStoreConfirmBody',
        'Az Apple App Store-ban vásárolt Pro előfizetést az App Store előfizetéskezelő felületén tudod módosítani vagy lemondani.',
      );

  function launchManage() {
    if (!bridge || typeof bridge.requestManageSubscriptions !== 'function') {
      showNativeIosIapBridgeUnavailable(t, 'bridge_missing');
      return;
    }
    const bridgeProduct = isArchival ? 'archival' : 'pro';
    const result = bridge.requestManageSubscriptions(source, bridgeProduct);
    if (!result.ok) {
      showNativeIosIapBridgeUnavailable(t, result.reason);
    }
  }

  showSubscriptionTitleBodyAlert(confirmTitle, confirmMsg, 'warning', launchManage, {
    confirmText: t('subscriptionManageAppStoreOpenButton', 'App Store megnyitása'),
    confirmVariant: 'primary',
    cancelText: t('subscriptionArchivalCancelCancelButton', 'Mégsem'),
  });
}

async function handleNativeIosIapPreparationFlow(product, t) {
  if (product === 'pro') {
    const sub = window.currentUserSubscription || {};
    const guards = (typeof window.getSubscriptionCheckoutGuards === 'function')
      ? window.getSubscriptionCheckoutGuards(sub)
      : null;
    if (guards && guards.blockAppleIapProPurchase) {
      const msg = guards.adminGiftLifetime
        ? t('subscriptionAdminGiftLifetimeIapBlock', 'You have Lifetime Pro access, so a Pro subscription cannot be started.')
        : t('subscriptionAdminGiftDurationIapBlock', 'Gift Pro is currently active. Starting an Apple subscription is not needed now. After your gift Pro expires, you can subscribe again if you wish.');
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(msg, 'info');
      } else {
        alert(msg);
      }
      return true;
    }
  }
  const bridge = window.GuriGONativeIapBridge;
  const sourceKey = product === 'archival' ? 'subscription_archival_checkout' : 'subscription_pro_checkout';
  if (bridge && typeof bridge.logBridgeState === 'function') {
    bridge.logBridgeState('handleNativeIosIapPreparationFlow');
  }
  if (bridge && typeof bridge.tryPreparePurchaseFlow === 'function') {
    const result = await bridge.tryPreparePurchaseFlow(product, sourceKey, function (postResult) {
      if (!postResult || !postResult.ok) {
        showNativeIosIapBridgeUnavailable(t, postResult && postResult.reason);
      }
    });
    if (result && result.ok) return true;
    if (isStripeCheckoutBlockedOnNativeIos(product)) {
      showNativeIosIapBridgeUnavailable(t, result && result.reason);
      return true;
    }
    return false;
  }
  if (isStripeCheckoutBlockedOnNativeIos(product)) {
    showNativeIosIapBridgeUnavailable(t, 'bridge_missing');
    return true;
  }
  return false;
}

/** Resolve i18n key (flat or dot-notation nested) so HU/DE/EN all work. */
function getI18nValue(i18n, key) {
  if (!i18n) return undefined;
  if (key.includes('.')) {
    let v = i18n;
    for (const p of key.split('.')) {
      v = v?.[p];
      if (v === undefined) return undefined;
    }
    return v;
  }
  return i18n[key];
}

// Egységes, globális loading overlay (Pro, Archiválás vásárlás/lemondás/upgrade)
// message: ha tartalmaz \n\n, első sor=cím, többi=alcím; különben default cím
function showStripeCheckoutLoading(message) {
  if (typeof document === 'undefined') return;
  if (document.getElementById('stripe-checkout-loading')) return;

  const parts = (message || '').split(/\n\n+/);
  const title = parts[0] && parts[0].trim() ? parts[0].trim() : 'Betöltés…';
  const subtitle = parts.length > 1 ? parts.slice(1).join('\n\n').trim() : (parts[0] ? '' : 'Kérlek várj…');
  const subtitleHtml = subtitle ? `<div style="white-space:pre-line;">${subtitle}</div>` : '';

  const overlay = document.createElement('div');
  overlay.id = 'stripe-checkout-loading';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = 'rgba(15,23,42,0.40)'; // slate-900/40
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  const box = document.createElement('div');
  box.style.background = 'white';
  box.style.borderRadius = '0.75rem';
  box.style.padding = '1rem 1.25rem';
  box.style.maxWidth = '320px';
  box.style.boxShadow = '0 20px 40px rgba(15,23,42,0.4)';
  box.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  box.style.fontSize = '0.875rem';
  box.style.color = '#111827';
  box.style.textAlign = 'left';

  box.innerHTML = `
    <div style="display:flex;align-items:flex-start;gap:0.75rem;">
      <div style="width:1.75rem;height:1.75rem;border-radius:9999px;border:3px solid #e5e7eb;border-top-color:#4f46e5;animation:stripe-spin 0.8s linear infinite;flex-shrink:0;"></div>
      <div>
        <div style="font-weight:600;margin-bottom:0.25rem;">${title}</div>
        ${subtitleHtml}
      </div>
    </div>
  `;

  overlay.appendChild(box);

  // Egyszerű spinner animáció
  const styleTag = document.createElement('style');
  styleTag.textContent = `
@keyframes stripe-spin { 
  to { transform: rotate(360deg); } 
}
`;
  document.head.appendChild(styleTag);

  document.body.appendChild(overlay);
}

function hideStripeCheckoutLoading() {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('stripe-checkout-loading');
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

function pickArchivalDisplayDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  try {
    if (typeof value.toDate === 'function') {
      const d = value.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }
  } catch (_) { /* ignore */ }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string' && value.trim()) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatDateForLocale(value, options) {
  const date = pickArchivalDisplayDate(value);
  if (!date) return '';
  const locale = getActiveLocale();
  const formatOptions = options || { year: 'numeric', month: '2-digit', day: '2-digit' };
  try {
    return date.toLocaleDateString(locale, formatOptions);
  } catch (_) {
    return '';
  }
}

/**
 * Selects the authoritative subscription period for the progress circle.
 * Returns { start: Date|null, end: Date|null, authoritative: boolean }.
 */
function getSubscriptionProgressPeriod(subscription) {
  const sub = subscription || window.currentUserSubscription || {};

  if (sub.currentPeriodStart && sub.currentPeriodEnd) {
    return {
      start: new Date(sub.currentPeriodStart),
      end: new Date(sub.currentPeriodEnd),
      authoritative: true,
    };
  }

  if (sub.currentPeriodEnd) {
    return {
      start: null,
      end: new Date(sub.currentPeriodEnd),
      authoritative: false,
    };
  }

  const isTrialFlag = sub.isTrial === true;
  const hasTrialDates = sub.trialStartedAt && sub.trialEnd;
  const isTrialFallback = hasTrialDates && !sub.currentPeriodStart && !sub.stripeSubscriptionId;
  if ((isTrialFlag || isTrialFallback) && sub.trialStartedAt && sub.trialEnd) {
    return {
      start: new Date(sub.trialStartedAt),
      end: new Date(sub.trialEnd),
      authoritative: true,
    };
  }

  if (sub.expiry) {
    return {
      start: null,
      end: new Date(sub.expiry),
      authoritative: false,
    };
  }

  return { start: null, end: null, authoritative: false };
}

/** Cancel pending archiválás: előfizetés vége + türelmi idő (több Firestore mirror forrásból). */
function resolveArchivalCancelPendingDates(sub, display) {
  const settingsArchival = sub && sub.settingsArchival && typeof sub.settingsArchival === 'object' ? sub.settingsArchival : null;
  const endCandidates = [
    display && display.subscriptionEnd,
    display && display.archivalExpiry,
    sub && sub.archivalExpiry,
    sub && sub.archivalCurrentPeriodEnd,
    settingsArchival && settingsArchival.currentPeriodEnd,
    settingsArchival && settingsArchival.archivalExpiry,
  ];
  let computedEndDate = null;
  for (let i = 0; i < endCandidates.length; i++) {
    computedEndDate = pickArchivalDisplayDate(endCandidates[i]);
    if (computedEndDate) break;
  }
  if (!computedEndDate && typeof window.resolveArchivalSubscriptionEndDate === 'function') {
    computedEndDate = pickArchivalDisplayDate(window.resolveArchivalSubscriptionEndDate(sub));
  }
  if (!computedEndDate && typeof window.getArchivalSubscriptionEndDate === 'function') {
    computedEndDate = pickArchivalDisplayDate(window.getArchivalSubscriptionEndDate(sub));
  }

  const graceCandidates = [
    display && display.staleDocumentGraceUntil,
    sub && sub.archivalGracePeriodUntil,
    sub && sub.gracePeriodUntil,
    settingsArchival && settingsArchival.gracePeriodUntil,
    settingsArchival && settingsArchival.archivalGracePeriodUntil,
  ];
  let computedGraceDate = null;
  for (let j = 0; j < graceCandidates.length; j++) {
    computedGraceDate = pickArchivalDisplayDate(graceCandidates[j]);
    if (computedGraceDate) break;
  }
  if (!computedGraceDate && typeof window.getArchivalGracePeriodUntilDate === 'function') {
    computedGraceDate = pickArchivalDisplayDate(window.getArchivalGracePeriodUntilDate(sub));
  }
  if (!computedGraceDate && computedEndDate) {
    computedGraceDate = new Date(computedEndDate.getTime());
    const graceDays = typeof window.DOCUMENT_GRACE_DAYS_AFTER_ARCHIVAL_END === 'number'
      ? window.DOCUMENT_GRACE_DAYS_AFTER_ARCHIVAL_END
      : 7;
    computedGraceDate.setDate(computedGraceDate.getDate() + graceDays);
  }

  return {
    archivalExpiry: sub && sub.archivalExpiry,
    currentPeriodEnd: sub && (sub.archivalCurrentPeriodEnd || (settingsArchival && settingsArchival.currentPeriodEnd)),
    computedEndDate,
    gracePeriodUntil: sub && (sub.archivalGracePeriodUntil || (settingsArchival && settingsArchival.gracePeriodUntil)),
    computedGraceDate,
  };
}

const SUBSCRIPTION_STATUS_CARD_VARIANTS = {
  green: {
    box: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
    title: 'text-green-700 dark:text-green-300',
    body: 'text-green-700 dark:text-green-400',
  },
  yellow: {
    box: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700',
    title: 'text-yellow-800 dark:text-yellow-300',
    body: 'text-yellow-700 dark:text-yellow-400',
  },
  neutral: {
    box: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    title: 'text-gray-700 dark:text-gray-200',
    body: 'text-gray-600 dark:text-gray-400',
  },
  purple: {
    box: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    title: 'text-purple-700 dark:text-purple-300',
    body: 'text-purple-700 dark:text-purple-400',
  },
};

function buildSubscriptionInfinityCircleHtml(subscription, t) {
  function escapeAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  const sub = subscription || {};
  const title = sub.tier === 'tester'
    ? (t ? t('subscriptionTesterStatusTitle', '🧪 Tesztelő hozzáférés') : 'Tesztelő hozzáférés')
    : (t ? t('subscriptionAdminGiftLifetimeStatusTitle', '🎁 Lifetime Pro access') : 'Lifetime Pro access');

  const size = 112;
  const center = size / 2;
  const radius = 48;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;

  return (
    '<div style="width:' + size + 'px;height:' + size + 'px;position:relative;flex:0 0 ' + size + 'px;" title="' + escapeAttr(title) + '" aria-label="' + escapeAttr(title) + '">' +
    '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="display:block;transform:rotate(-90deg);transform-origin:center;">' +
    '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" stroke="#dfe5e8" stroke-width="' + strokeWidth + '"></circle>' +
    '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" stroke-width="' + strokeWidth + '" class="stroke-purple-400" stroke-dasharray="' + circumference + ' ' + circumference + '" stroke-dashoffset="0" stroke-linecap="round"></circle>' +
    '</svg>' +
    '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;line-height:1;">' +
    '<div class="text-3xl font-bold text-purple-700 dark:text-purple-300">∞</div>' +
    '</div>' +
    '</div>'
  );
}

function buildSubscriptionProgressCircleHtml(subscription, t) {
  function escapeAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function calendarDaysUntil(endMs, nowMs) {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const endDay = new Date(endMs);
    endDay.setHours(0, 0, 0, 0);
    const nowDay = new Date(nowMs);
    nowDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round((endDay.getTime() - nowDay.getTime()) / DAY_MS);
    if (diffDays > 0) return diffDays;
    if (diffDays === 0 && endMs >= nowMs) return 1;
    return 0;
  }

  const sub = subscription || {};
  const period = (typeof getSubscriptionProgressPeriod === 'function')
    ? getSubscriptionProgressPeriod(sub)
    : { start: null, end: null, authoritative: false };
  const endDate = period.end ? new Date(period.end) : null;
  if (!endDate || isNaN(endDate.getTime())) return '';

  const now = Date.now();
  const endMs = endDate.getTime();
  const startDate = period.start ? new Date(period.start) : null;
  const startMs = (startDate && !isNaN(startDate.getTime())) ? startDate.getTime() : null;

  const daysLeft = calendarDaysUntil(endMs, now);

  let progress = 0;
  let hasProgress = false;
  if (startMs) {
    const total = endMs - startMs;
    if (total > 0) {
      progress = Math.max(0, Math.min(1, (now - startMs) / total));
      hasProgress = true;
    }
  }

  const percent = hasProgress ? Math.round(progress * 100) : 0;

  const size = 112;
  const center = size / 2;
  const radius = 48;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = hasProgress ? circumference * (1 - progress) : circumference;

  const state = sub.subscriptionPaymentFailed
    ? 'red'
    : sub.cancelAtPeriodEnd
      ? 'amber'
      : sub.isTrial
        ? 'purple'
        : 'green';
  const colorMap = {
    green: { progress: 'stroke-green-500', text: 'text-green-700 dark:text-green-300' },
    amber: { progress: 'stroke-amber-500', text: 'text-amber-700 dark:text-amber-300' },
    red: { progress: 'stroke-red-500', text: 'text-red-700 dark:text-red-300' },
    purple: { progress: 'stroke-purple-500', text: 'text-purple-700 dark:text-purple-300' },
  };
  const colors = colorMap[state] || colorMap.green;

  const dayWord = t ? t('subscriptionProgressCircleLabel', 'nap hátra') : 'nap hátra';
  const title = t
    ? formatTemplate(
        t('subscriptionProgressCircleTitle', '%DAYS% nap van hátra a jelenlegi időszakból'),
        { DAYS: daysLeft },
      )
    : String(daysLeft) + ' nap van hátra';
  const aria = t
    ? formatTemplate(
        t('subscriptionProgressCircleAria', '%PERCENT% of subscription period elapsed, %DAYS% days left'),
        { PERCENT: percent + '%', DAYS: daysLeft },
      )
    : String(percent) + '% elapsed, ' + daysLeft + ' days left';

  return (
    '<div style="width:' + size + 'px;height:' + size + 'px;position:relative;flex:0 0 ' + size + 'px;" title="' + escapeAttr(title) + '" aria-label="' + escapeAttr(aria) + '">' +
    '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="display:block;transform:rotate(-90deg);transform-origin:center;">' +
    '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" stroke="#dfe5e8" stroke-width="' + strokeWidth + '"></circle>' +
    '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" stroke-width="' + strokeWidth + '" class="' + colors.progress + '" stroke-dasharray="' + circumference + ' ' + circumference + '" stroke-dashoffset="' + dashOffset + '" stroke-linecap="round"></circle>' +
    '</svg>' +
    '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;line-height:1;">' +
    '<div class="text-2xl font-bold ' + colors.text + '">' + daysLeft + '</div>' +
    '<div class="text-xs font-medium ' + colors.text + '" style="margin-top:2px;">' + escapeAttr(dayWord) + '</div>' +
    '</div>' +
    '</div>'
  );
}

function buildSubscriptionStatusCardHtml(variant, title, bodyLines, headerAsideHtml, bodyCircleHtml) {
  const v = SUBSCRIPTION_STATUS_CARD_VARIANTS[variant] || SUBSCRIPTION_STATUS_CARD_VARIANTS.neutral;
  const lines = (bodyLines || []).filter(function (line) {
    return line != null && String(line).trim() !== '';
  });
  const bodyHtml = lines
    .map(function (line) {
      return '<p class="m-0">' + line + '</p>';
    })
    .join('');
  return (
    '<div class="p-3 ' +
    v.box +
    ' border rounded-lg">' +
    '<div class="flex items-start justify-between gap-3">' +
    '<div class="font-semibold ' +
    v.title +
    '">' +
    title +
    '</div>' +
    (headerAsideHtml || '') +
    '</div>' +
    (bodyHtml ? '<div class="mt-2 text-xs ' + v.body + ' space-y-1">' + bodyHtml + '</div>' : '') +
    (bodyCircleHtml ? '<div class="mt-3 flex justify-center">' + bodyCircleHtml + '</div>' : '') +
    '</div>'
  );
}

function pickProSubscriptionEndForDisplay(sub) {
  const candidates = [sub.activeUntil, sub.currentPeriodEnd, sub.subscriptionExpiry, sub.expiry];
  for (let i = 0; i < candidates.length; i++) {
    const d = pickArchivalDisplayDate(candidates[i]);
    if (d) return d;
  }
  return null;
}

function isLifetimeProGiftContext(sub, proEnt) {
  if (proEnt && proEnt.isAdminGiftLifetime) return true;
  if (sub && sub.adminGiftLifetimeActive === true) return true;
  const ag = sub && sub.entitlementsAdminGift;
  if (ag && ag.isLifetime === true) return true;
  if (ag && String(ag.giftType || '').toLowerCase() === 'lifetime') return true;
  if (ag && String(ag.status || '').toLowerCase() === 'lifetime_active') return true;
  return false;
}

function isProCancelPendingForDisplay(sub, proEnt) {
  if (proEnt && proEnt.isCancelAtPeriodEnd) return true;
  if (sub && sub.cancelAtPeriodEnd === true) return true;
  if (typeof window.isAppleIapAutoRenewOffProven === 'function' && window.isAppleIapAutoRenewOffProven(sub, 'pro')) {
    return true;
  }
  return false;
}

function resolveProSubscriptionUiStateKey(sub, proEnt) {
  if (!sub || (proEnt && proEnt.isFreeTier) || sub.tier === 'free') return 'inactive';
  if (proEnt && proEnt.isPaymentFailed) return 'payment_failed';
  if (isProCancelPendingForDisplay(sub, proEnt)) return 'canceling';
  if (proEnt && (proEnt.isTrialPro || proEnt.subscriptionPageUiState === 'trial')) return 'trial';
  if (sub.tier === 'pro') return 'active';
  return 'other';
}

function resolveArchivalSubscriptionUiStateKey(sub, archEnt, archivalDisplay) {
  const display = archivalDisplay || {};
  if (display.uiState === 'payment_failed') return 'payment_failed';
  if (display.uiState === 'cancel_pending') return 'canceling';
  if (display.uiState === 'stale_grace') return 'grace_period';
  if (display.uiState === 'active') return 'active';
  if (archEnt && archEnt.inGracePeriod) return 'grace_period';
  if (archEnt && archEnt.hasActiveArchival) return 'active';
  return 'inactive';
}

function logSubscriptionUiStatusDiagnostics(sub, proEnt, archEnt, archivalDisplay) {
  try {
    var beta =
      (window.location.pathname || '').indexOf('/beta') === 0 ||
      (window.location.search || '').indexOf('beta=1') >= 0 ||
      window.GURIGO_SUBSCRIPTION_STATUS_DEBUG === true;
    if (!beta) return;
    var proUi = resolveProSubscriptionUiStateKey(sub, proEnt);
    var archUi = resolveArchivalSubscriptionUiStateKey(sub, archEnt, archivalDisplay);
    console.log('[SubscriptionUI] Pro status', {
      productId: sub.appleProProductId || null,
      rawStatus: sub.appleIapProStatus || null,
      expiresAt: sub.activeUntil || sub.currentPeriodEnd || sub.subscriptionExpiry || null,
      willRenew: sub.appleIapProWillRenew,
      autoRenewStatus: sub.appleIapProAutoRenewStatus,
      autoRenewKnown: sub.appleIapProAutoRenewKnown === true,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd === true,
      latestSignedRenewalInfo: sub.appleIapLatestSignedRenewalInfoPresent === true,
      uiState: proUi,
    });
    console.log('[SubscriptionUI] Archival status', {
      productId: sub.appleArchivalProductId || null,
      rawStatus: sub.appleIapArchivalStatus || sub.archivalStatus || null,
      expiresAt: sub.archivalExpiry || null,
      willRenew: sub.appleIapArchivalWillRenew,
      autoRenewStatus: sub.appleIapArchivalAutoRenewStatus,
      autoRenewKnown: sub.appleIapArchivalAutoRenewKnown === true,
      archivalCancelAtPeriodEnd: sub.archivalCancelAtPeriodEnd === true,
      latestSignedRenewalInfo: sub.appleIapLatestSignedRenewalInfoPresent === true,
      uiState: archUi,
    });
  } catch (_) { /* ignore */ }
}

/** Archiválási csomag – „Dokumentumok megőrzése” szekció (Pro státuszkártya mintájára). */
function buildArchivalRetentionSectionHtml(params) {
  const {
    t,
    retentionLabel,
    hasActiveArchival,
    inArchivalGracePeriod,
    archivalDisplay,
    formatDateForLocaleFn,
    paymentsAllowed,
    archivalPriceDisplay,
    archivalPriceDisplayClass,
    useAppleIapManage
  } = params;

  const display = archivalDisplay || {
    uiState: hasActiveArchival ? 'active' : 'inactive',
    subscriptionEnd: null,
    staleDocumentGraceUntil: null,
  };

  function dateLine(i18nKey, fallback, date) {
    const normalized = pickArchivalDisplayDate(date);
    if (!normalized) return '';
    const formatFn = typeof formatDateForLocaleFn === 'function' ? formatDateForLocaleFn : formatDateForLocale;
    const formatted = formatFn(normalized);
    if (!formatted) return '';
    return formatTemplate(t(i18nKey, fallback), { DATE: formatted });
  }

  function headerDateBadge(date) {
    if (!date || !formatDateForLocaleFn) return '';
    const formatted = formatDateForLocaleFn(date);
    return formatTemplate(
      t('subscriptionArchivalStatusActiveUntilTemplate', '%DATE%-ig'),
      { DATE: formatted },
    );
  }

  const activeTitle = t('subscriptionArchivalStatusActiveTitle', '✅ Archiválási csomag aktív');
  const inactiveTitle = t('subscriptionArchivalStatusInactiveTitle', 'ℹ️ Archiválási csomag nem aktív');
  const inactiveRetention = t(
    'subscriptionArchivalStatusInactiveRetention',
    'A dokumentumok az alap 6 hetes megőrzési szabály szerint érhetők el.',
  );
  const cancelPendingTitleRaw = t('subscriptionArchivalCancelPendingTitle', 'Archiválási csomag lemondás alatt');
  const cancelPendingTitle = cancelPendingTitleRaw.indexOf('⚠') >= 0
    ? cancelPendingTitleRaw
    : `⚠️ ${cancelPendingTitleRaw}`;
  const cancelPendingStorageRuleBack = t(
    'subscriptionArchivalCancelPendingStorageRuleBack',
    'Ezután a 6 hétnél régebbi dokumentumokra újra az alapmegőrzés érvényes.',
  );
  const expiredTitle = t('subscriptionArchivalExpiredTitle', 'Archiválási csomag lejárt');
  const graceIntro = t(
    'subscriptionArchivalExpiredGraceIntro',
    'Az Archiválási csomagod lejárt, ezért mostantól újra az alap 6 hetes megőrzési szabály érvényes.',
  );
  const graceKeepDocs = t(
    'subscriptionArchivalExpiredGraceKeepDocs',
    'A régebbi dokumentumaidat még nem töröljük azonnal.',
  );
  const graceReactivate = t(
    'subscriptionArchivalExpiredGraceReactivate',
    'Ha tovább szeretnéd megőrizni a régi dokumentumokat, aktiváld újra az Archiválási csomagot.',
  );
  const explainNotPro = t('subscriptionArchivalActiveBulletNotPro', 'Nem helyettesíti a Pro csomagot');
  const explainFreePro = t('subscriptionArchivalActiveBulletFreePro', 'Free és Pro mellett is használható');
  const explainLimited = t('subscriptionArchivalInactiveBulletLimited', 'A dokumentumok alapból korlátozott ideig maradnak meg');
  const explainExtended = t('subscriptionArchivalInactiveBulletExtended', 'Archiválási csomaggal hosszabb megőrzés jár');
  const explainActiveLonger = t(
    'subscriptionArchivalActiveExplainLonger',
    'Aktív előfizetés alatt a dokumentumok hosszabb ideig megmaradnak.',
  );
  const explainActiveRevert = t(
    'subscriptionArchivalActiveExplainRevert6Week',
    'Lejárat után visszaáll a 6 hetes alap megőrzés.',
  );
  const explainActiveStaleGrace = t(
    'subscriptionArchivalActiveExplainStaleGrace',
    'A lejáratkor már 6 hétnél régebbi dokumentumokra +1 hét türelmi idő jár.',
  );
  const subValidLine = dateLine(
    'subscriptionArchivalSubscriptionValidUntil',
    'Előfizetés érvényes: %DATE%-ig',
    display.subscriptionEnd,
  );
  const graceUntilLine = dateLine(
    'subscriptionArchivalExpiredGraceUntilLine',
    'Türelmi idő vége: %DATE%',
    display.staleDocumentGraceUntil,
  );
  const headerDate = headerDateBadge(display.subscriptionEnd);

  const subForArchPay = window.currentUserSubscription || {};
  const archMgmtForPay =
    typeof window.getArchivalManagementMode === 'function'
      ? window.getArchivalManagementMode(subForArchPay)
      : { provider: 'unknown', mode: 'none' };
  const archivalApplePaymentUi =
    archMgmtForPay.provider === 'apple' ||
    archMgmtForPay.mode === 'apple_manage' ||
    archMgmtForPay.mode === 'apple_info_web';

  const paymentFailedTitle = archivalApplePaymentUi
    ? t('subscriptionAppleArchivalPaymentProblemTitle', '⚠️ Fizetési probléma')
    : t(
        'subscriptionArchivalPaymentFailedTitle',
        '⚠️ Fizetési probléma az Archiválási csomagnál',
      );
  const paymentFailedBody = archivalApplePaymentUi
    ? t(
        'subscriptionAppleArchivalPaymentProblemBody',
        'Az Archiválási csomag legutóbbi megújítása sikertelen volt. A dokumentumok hosszabb megőrzése a türelmi idő alatt még aktív. Kérjük, ellenőrizd az Apple ID fizetési módodat.',
      )
    : t(
        'subscriptionArchivalPaymentFailedBody',
        'A legutóbbi bankkártyás levonás sikertelen volt. Az Archiválási csomag türelmi idő alatt még aktív, de a fizetési módot frissíteni kell, hogy a dokumentumok hosszabb megőrzése ne szűnjön meg.',
      );
  const paymentFailedActiveUntil = archivalApplePaymentUi
    ? ''
    : dateLine(
        'subscriptionArchivalPaymentFailedActiveUntil',
        'Előfizetés aktív eddig: %DATE%',
        display.subscriptionEnd,
      );
  const paymentGraceDate = display.paymentGraceUntil;
  const paymentFailedRetentionUntil = archivalApplePaymentUi
    ? dateLine(
        'subscriptionAppleArchivalRetentionActiveUntil',
        'Dokumentumok hosszabb megőrzése aktív eddig: %DATE%',
        display.subscriptionEnd || paymentGraceDate,
      )
    : '';
  const paymentFailedGraceUntil = archivalApplePaymentUi
    ? dateLine(
        'subscriptionAppleArchivalPaymentMethodGraceUntil',
        'Fizetési mód frissíthető eddig: %DATE%',
        paymentGraceDate,
      )
    : dateLine(
        'subscriptionArchivalPaymentFailedGraceUntil',
        'Fizetési mód frissíthető eddig: %DATE%',
        display.paymentGraceUntil,
      );

  let statusBlock = '';
  if (display.uiState === 'payment_failed') {
    const paymentFailedLines = [paymentFailedBody];
    if (paymentFailedRetentionUntil) paymentFailedLines.push(paymentFailedRetentionUntil);
    if (paymentFailedGraceUntil) paymentFailedLines.push(paymentFailedGraceUntil);
    if (archivalApplePaymentUi) {
      statusBlock = buildSubscriptionStatusCardHtml('yellow', paymentFailedTitle, paymentFailedLines);
    } else {
      const paymentFailedBodyParts = [`<p class="m-0">${paymentFailedBody}</p>`];
      if (paymentFailedActiveUntil) {
        paymentFailedBodyParts.push(`<p class="m-0 font-medium">${paymentFailedActiveUntil}</p>`);
      }
      if (paymentFailedGraceUntil) {
        paymentFailedBodyParts.push(`<p class="m-0 font-medium">${paymentFailedGraceUntil}</p>`);
      }
      statusBlock = `
      <div class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
        <div class="font-semibold text-red-800 dark:text-red-200 mb-2">${paymentFailedTitle}</div>
        <div class="mt-1 text-xs text-red-700 dark:text-red-300 space-y-1">
          ${paymentFailedBodyParts.join('')}
        </div>
      </div>`;
    }
  } else if (display.uiState === 'cancel_pending') {
    const subForCancelDates = window.currentUserSubscription || {};
    const cancelDates = resolveArchivalCancelPendingDates(subForCancelDates, display);
    const cancelSubEnd = cancelDates.computedEndDate;
    const cancelEndFmt = cancelSubEnd ? formatDateForLocale(cancelSubEnd) : '';
    const archCancelValidLine = cancelEndFmt
      ? formatTemplate(
          t('subscriptionStatusCancelValidUntil', 'Érvényes: <strong>%DATE%</strong>-ig.'),
          { DATE: cancelEndFmt },
        )
      : '';
    statusBlock = buildSubscriptionStatusCardHtml(
      'yellow',
      t('subscriptionStatusCancelTitle', '⚠️ Lemondás alatt'),
      [
        t(
          'subscriptionArchivalCancelLine1',
          'Az Archiválási csomag még aktív, de már nem újul meg automatikusan.',
        ),
        archCancelValidLine,
        t('subscriptionStatusCancelNoMoreCharge', 'A díjat már nem vonjuk le újra.'),
      ],
    );
  } else if (display.uiState === 'active') {
    const archActiveAside = headerDate
      ? '<span class="text-xs font-medium text-green-700 dark:text-green-400 whitespace-nowrap shrink-0">' +
        headerDate +
        '</span>'
      : '';
    statusBlock = buildSubscriptionStatusCardHtml(
      'green',
      activeTitle,
      [t(
        'subscriptionArchivalStatusActiveBody',
        'Az Archiválási csomag aktív, a Dokumentumok fülön feltöltött dokumentumok megőrzése biztosított. A díjat a fenti dátum környékén vonjuk le.',
      )],
      archActiveAside,
    );
  } else if (display.uiState === 'stale_grace') {
    const graceTitle = t('subscriptionArchivalGraceTitle', '⚠️ Türelmi időben');
    const graceUntilFormatted = display.staleDocumentGraceUntil
      ? formatDateForLocale(display.staleDocumentGraceUntil)
      : '';
    const graceUntilText = graceUntilFormatted
      ? formatTemplate(
          t('subscriptionArchivalGraceUntilLine', 'Türelmi idő vége: <strong>%DATE%</strong>.'),
          { DATE: graceUntilFormatted },
        )
      : '';
    statusBlock = buildSubscriptionStatusCardHtml('yellow', graceTitle, [
      t(
        'subscriptionArchivalGraceLine1',
        'Az Archiválási csomag lejárt, de a dokumentumok még türelmi időben elérhetők.',
      ),
      graceUntilText,
      t(
        'subscriptionArchivalGraceLine3',
        'Ezután a 6 hétnél régebbi dokumentumok automatikusan törlődhetnek.',
      ),
    ]);
  } else {
    statusBlock = buildSubscriptionStatusCardHtml(
      'neutral',
      inactiveTitle,
      [t('subscriptionArchivalStatusInactiveSimple', 'Nincs aktív Archiválási csomag.')],
    );
  }

  let explainBlock = '';
  if (hasActiveArchival && display.uiState !== 'cancel_pending' && display.uiState !== 'payment_failed') {
    explainBlock = `
      <div class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
        <p class="m-0">${explainNotPro}</p>
        <p class="m-0">${explainFreePro}</p>
      </div>`;
  } else if (!inArchivalGracePeriod && display.uiState !== 'stale_grace' && display.uiState !== 'cancel_pending' && display.uiState !== 'payment_failed') {
    explainBlock = `
      <div class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
        <p class="m-0">${explainLimited}</p>
        <p class="m-0">${explainExtended}</p>
        <p class="m-0">${explainNotPro}</p>
        <p class="m-0">${explainFreePro}</p>
      </div>`;
  }

  let ctaBlock = '';
  const archivalCancelPending = display.uiState === 'cancel_pending';
  const archivalPaymentFailedUi = display.uiState === 'payment_failed';
  if (archivalPaymentFailedUi && paymentsAllowed) {
    const subForPayFail = window.currentUserSubscription || {};
    const archMgmtPayFail = (typeof window.getArchivalManagementMode === 'function')
      ? window.getArchivalManagementMode(subForPayFail)
      : { mode: useAppleIapManage ? 'apple_manage' : 'stripe_manage', provider: 'unknown' };
    const showStripePortal = archMgmtPayFail.mode === 'stripe_manage';
    const applePayCta = archMgmtPayFail.provider === 'apple' ||
      archMgmtPayFail.mode === 'apple_manage' ||
      archMgmtPayFail.mode === 'apple_info_web';
    const updateCardLabel = t('subscriptionUpdateCardLabel', '💳 Előfizetések és bankkártya kezelése');
    const manageAppleLabel = t('subscriptionAppleManageSubscriptionButton', 'Előfizetés kezelése');
    const appleBtnClass =
      'w-full py-2 border border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100 rounded-lg font-semibold transition text-sm';
    if (showStripePortal) {
      ctaBlock = `<button id="${MANAGE_STRIPE_SUBSCRIPTION_BTN_ID}" onclick="handleUpdatePaymentMethod()" class="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition text-sm">${updateCardLabel}</button>`;
    } else if (archMgmtPayFail.mode === 'stripe_info_ios' || archMgmtPayFail.mode === 'apple_info_web' || archMgmtPayFail.mode === 'apple_manage') {
      ctaBlock = `<button type="button" onclick="handleArchivalProviderManage()" class="${applePayCta ? appleBtnClass : 'w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition text-sm'}">${manageAppleLabel}</button>`;
    }
  } else if (hasActiveArchival && paymentsAllowed && !archivalCancelPending && !archivalPaymentFailedUi) {
    const archMgmt = (typeof window.getArchivalManagementMode === 'function')
      ? window.getArchivalManagementMode(window.currentUserSubscription || {})
      : { mode: useAppleIapManage ? 'apple_manage' : 'stripe_manage', provider: 'unknown' };
    const isAppleManage = archMgmt.mode === 'apple_manage';
    const isInfoOnly = archMgmt.mode === 'apple_info_web' || archMgmt.mode === 'stripe_info_ios';
    let cancelBtnLabel;
    if (isAppleManage) {
      cancelBtnLabel = t('subscriptionArchivalManageAppStoreButton', 'Előfizetés kezelése az App Store-ban');
    } else if (archMgmt.mode === 'apple_info_web') {
      cancelBtnLabel = t('subscriptionManageAppleOnWebTitle', 'Apple előfizetés kezelése');
    } else if (archMgmt.mode === 'stripe_info_ios') {
      cancelBtnLabel = t('subscriptionManageStripeOnIosTitle', 'Webes előfizetés kezelése');
    } else if (archMgmt.mode === 'stripe_manage') {
      cancelBtnLabel = t('subscriptionArchivalCancelButtonLabel', '🗑️ Archiválási csomag lemondása');
    } else if (isInfoOnly) {
      cancelBtnLabel = t('subscriptionArchivalManageInfoButton', 'Előfizetés kezelése');
    } else {
      cancelBtnLabel = t('subscriptionArchivalCancelButtonLabel', '🗑️ Archiválási csomag lemondása');
    }
    const manageHint = isAppleManage
      ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-0">${t('subscriptionArchivalManageAppStoreHint', 'Az Apple App Store-ban vásárolt előfizetést az App Store előfizetéskezelő felületén tudod módosítani vagy lemondani.')}</p>`
      : isInfoOnly
        ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-0">${t('subscriptionArchivalManageInfoHint', 'Az előfizetés kezelése az eredeti vásárlási csatornán történik (App Store vagy gurigo.eu).')}</p>`
        : '';
    const btnClass = isAppleManage || isInfoOnly
      ? 'w-full py-2 border border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-200 rounded-lg text-sm font-medium transition'
      : 'w-full py-2 border border-red-300 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200 rounded-lg text-sm font-medium transition';
    const cancelBtnIdAttr = archMgmt.mode === 'stripe_manage'
      ? ` id="${CANCEL_ARCHIVAL_SUBSCRIPTION_BTN_ID}"`
      : '';
    const cancelBtnLabelHtml = archMgmt.mode === 'stripe_manage'
      ? `<span class="archival-cancel-btn-label">${cancelBtnLabel}</span>`
      : cancelBtnLabel;
    ctaBlock = `<button type="button"${cancelBtnIdAttr} onclick="handleArchivalProviderManage()" class="${btnClass}">${cancelBtnLabelHtml}</button>${manageHint}`;
  } else if (archivalCancelPending && hasActiveArchival) {
    const subForArch = window.currentUserSubscription || {};
    const archMgmtPending = (typeof window.getArchivalManagementMode === 'function')
      ? window.getArchivalManagementMode(subForArch)
      : { mode: 'none', provider: 'unknown' };
    const isIosShell = typeof window.isNativeIosAppShell === 'function' && window.isNativeIosAppShell();
    const isStripeArchivalPending =
      archMgmtPending.provider === 'stripe' ||
      (typeof window.isArchivalBilledViaStripe === 'function' && window.isArchivalBilledViaStripe(subForArch));

    if (!isIosShell && isStripeArchivalPending && archMgmtPending.mode === 'stripe_manage') {
      const resumeArchivalLabel = t('subscriptionArchivalResumeButton', 'Lemondás visszavonása');
      ctaBlock =
        `<button type="button" id="${RESUME_ARCHIVAL_SUBSCRIPTION_BTN_ID}" onclick="handleResumeArchivalSubscription()" class="w-full py-2 btn-primary font-semibold transition text-sm">` +
        `<span class="archival-resume-btn-label">${resumeArchivalLabel}</span></button>`;
    } else if (isIosShell && isStripeArchivalPending) {
      ctaBlock = buildCancelPendingNoNewPurchaseInfoHtml(t, {
        product: 'archival',
        sub: subForArch,
      });
    } else {
      ctaBlock = buildCancelPendingNoNewPurchaseInfoHtml(t, {
        product: 'archival',
        sub: subForArch,
      });
    }
  } else if (!hasActiveArchival && paymentsAllowed) {
    const priceCss =
      archivalPriceDisplayClass ||
      'text-indigo-600 dark:text-indigo-400';
    const priceLine = archivalPriceDisplay
      ? `<p class="text-center text-sm font-semibold ${priceCss} mb-2">${archivalPriceDisplay}</p>`
      : '';
    ctaBlock = `${priceLine}<button type="button" data-gurigo-iap-role="archival-purchase" onclick="handleArchivalPurchase('archival')" class="archival-buy-btn w-full py-2 px-4 border border-indigo-400 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg text-sm font-medium transition">${t('subscriptionArchivalBuyButton', 'Archiválási csomag vásárlása')}</button>`;
  }

  return `
    <div class="archival-retention-section space-y-3">
      <div class="text-base font-semibold text-gray-800 dark:text-gray-100">📁 ${retentionLabel}</div>
      ${statusBlock}
      ${explainBlock}
      ${ctaBlock}
    </div>`;
}

// Használjuk a központi pricing config-ot (országkód alapján: HU, PL, RO, stb.)
function getProPriceInfo(countryCode) {
  if (typeof window.getProPrice === 'function') {
    return window.getProPrice(countryCode);
  }
  // Fallback ha a pricing.js nem töltődött be
  const cc = (countryCode || '').toUpperCase();
  const key = cc === 'HU' ? 'HUF' : cc === 'PL' ? 'PLN' : cc === 'RO' ? 'RON' : cc === 'DK' ? 'DKK' : cc === 'NO' ? 'NOK' : 'EUR';
  const fallback = {
    HUF: { amount: 1490, currency: 'HUF', fractionDigits: 0, formatted: '1490 Ft' },
    EUR: { amount: 4.90, currency: 'EUR', fractionDigits: 2, formatted: '€4.90' },
    PLN: { amount: 19.90, currency: 'PLN', fractionDigits: 2, formatted: '19,90 zł' },
    RON: { amount: 19.90, currency: 'RON', fractionDigits: 2, formatted: '19,90 lei' },
    DKK: { amount: 49, currency: 'DKK', fractionDigits: 0, formatted: '49 kr' },
    NOK: { amount: 69, currency: 'NOK', fractionDigits: 0, formatted: '69 kr' }
  };
  return fallback[key] || fallback.EUR;
}

function renderPromoBanner() {
  if (!canShowEarlyBirdOfferForUi()) {
    return '';
  }
  const userSubscription = window.currentUserSubscription;
  const promoState = (typeof window.getEarlyBirdPromoStateForUi === 'function')
    ? window.getEarlyBirdPromoStateForUi(userSubscription)
    : (userSubscription?.promoState || {});
  if (!promoState) {
    return '';
  }
  const now = Date.now();
  
  // Helper function a Firestore timestamp konvertáláshoz
  function toMillis(timestamp) {
    if (!timestamp) return null;
    if (timestamp.toMillis) return timestamp.toMillis();
    if (timestamp instanceof Date) return timestamp.getTime();
    if (timestamp.seconds) return timestamp.seconds * 1000;
    if (typeof timestamp === 'number') return timestamp;
    return null;
  }
  
  const expiresAt = toMillis(promoState.promoExpiresAt);
  
  // Ha nincs aktív promó, ne mutass semmit
  if (!promoState.currentPromoType || !expiresAt || expiresAt <= now || promoState.promoUsed) {
    return '';
  }
  
  // Ár: mindig a regisztrációkor megadott országkód (billing info másra való)
  const sub = window.currentUserSubscription || {};
  const countryForPricing = (sub.registrationCountryCode || sub.countryCode || 'HU').toUpperCase();
  const proPriceInfo = getProPriceInfo(countryForPricing);
  
  const discount = promoState.currentPromoType === '40' ? 40 : 20;
  const price = promoState.currentPromoType === '40' ? 
    (proPriceInfo.amount * 0.6).toFixed(2) : 
    (proPriceInfo.amount * 0.8).toFixed(2);
  const normalPrice = proPriceInfo.amount;
  const currency = proPriceInfo.currency;
  const timeLeft = expiresAt - now;
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  
  // Helper function for translations
  const getTranslation = (key, fallback) => {
    if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
      const lang = translations[currentLang] || {};
      return lang[key] || fallback;
    }
    return fallback;
  };
  
  // Check if dark mode is active
  const isDarkMode = document.documentElement.classList.contains('dark') || 
                    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  return `
    <div data-gurigo-promo-banner="1" class="rounded-2xl p-6 mb-6 shadow-2xl" style="background: linear-gradient(to right, rgb(251 146 60), rgb(239 68 68), rgb(236 72 153)); animation: pulse 2s ease-in-out infinite;">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1 pr-4">
          <div class="text-xl font-black mb-2 leading-tight text-white">
            🎉 ${getTranslation('promoBannerTitle', '🎉 Speciális ajánlatod: %DISCOUNT%% kedvezmény!').replace('%DISCOUNT%', discount)}
          </div>
          <div class="text-white/90 font-semibold text-sm">
            ⏰ ${getTranslation('promoBannerTimeLeft', '⏰ %TIME_LEFT%').replace('%TIME_LEFT%', `${hoursLeft} ${getTranslation('promo.timer.hours', 'óra')} ${minutesLeft} ${getTranslation('promo.timer.minutes', 'perc')}`)}
          </div>
        </div>
        <div class="text-right flex-shrink-0">
          <div class="text-sm opacity-90 mb-1 text-white">${getTranslation('promoBannerFirstMonth', 'Első hónap')}</div>
          <div class="text-3xl font-black text-white">${price} ${currency}</div>
        </div>
      </div>
      <div class="text-xs opacity-90 border-t border-white/30 pt-2 mt-2 text-white">
        ${getTranslation('promoBannerAfterFirst', 'Ezután: %NORMAL_PRICE% %CURRENCY%/hó').replace('%NORMAL_PRICE%', normalPrice).replace('%CURRENCY%', currency)}
      </div>
      
      <!-- Important Info -->
      <div class="border-t border-white/30 pt-3 mt-3 space-y-1">
        <div class="text-xs opacity-90 text-white">
          • ${getTranslation('promoBannerInfo1', 'Most csak kártyaellenőrzés, nincs terhelés')}
        </div>
        <div class="text-xs opacity-90 text-white">
          • ${getTranslation('promoBannerInfo2', 'Fizetés csak a próbaidő lejárta után')}
        </div>
        <div class="text-xs opacity-90 text-white">
          • ${getTranslation('promoBannerInfo3', 'Teljes próbaidőt használhatsz')}
        </div>
      </div>
      
      <!-- Free plan limitations -->
      <div class="border-t border-white/30 pt-3 mt-3">
        <div class="text-xs font-semibold text-white/95 mb-1">⚠️ ${getTranslation('promoModalFreeLimitsTitle', 'Mi változik a Free csomaggal?')}</div>
        <div class="space-y-0.5">
          <div class="text-xs opacity-90 text-white">• ${getTranslation('promoModalFreeLimit1', 'A tachográf elemzés és heti státusz nem elérhető')}</div>
          <div class="text-xs opacity-90 text-white">• ${getTranslation('promoModalFreeLimit2', 'Csak EUR raklap rögzítése lehetséges, napi max 3 bejegyzés')}</div>
          <div class="text-xs opacity-90 text-white">• ${getTranslation('promoModalFreeLimit3', 'Naponta legfeljebb 2 dokumentum feltöltés')}</div>
        </div>
      </div>
      
      <button onclick="if(window.startPromoCheckout){window.startPromoCheckout();}" class="w-full bg-white text-orange-600 hover:bg-orange-50 px-6 py-3 rounded-lg font-bold transition-colors shadow-md mt-4">
        ${getTranslation('promoModalAcceptButton', '✨ Előfizetek most')}
      </button>
      
      ${getEarlyBirdPaymentWarningHtml(getTranslation)}
      
      <div class="text-xs opacity-90 text-center mt-2 text-white">
        ${getTranslation('promoBannerDisclaimer', '* A kedvezmény csak az első hónapra vonatkozik')}
      </div>
    </div>
  `;
}

function captureSubscriptionAuthContext(fallbackUid) {
  const uid = fallbackUid
    || (window.currentUser && window.currentUser.uid)
    || ((typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser)
      ? firebase.auth().currentUser.uid
      : null);
  const loadCtx = (window.GurigoAuthSession && window.GurigoAuthSession.captureAuthScopedLoad)
    ? window.GurigoAuthSession.captureAuthScopedLoad()
    : { uid: uid, gen: 0 };
  return { uid: uid, loadCtx: loadCtx };
}

function shouldAbortSubscriptionAuth(ctx, expectedUid) {
  const uid = expectedUid || (ctx && ctx.uid);
  if (!uid) return true;
  if (ctx && ctx.loadCtx && window.GurigoAuthSession && window.GurigoAuthSession.shouldDiscardAuthScopedLoad(ctx.loadCtx)) {
    return true;
  }
  try {
    if (window.GurigoAuthSession && window.GurigoAuthSession.isSigningOut()) return true;
    const authUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if (!authUser || authUser.uid !== uid) return true;
  } catch (_) {
    return true;
  }
  return false;
}

function renderSubscriptionInfo() {
  const container = document.getElementById('subscription-info');
  const section = document.getElementById('subscription-section');
  const billingInfoSection = document.getElementById('billing-info-section');
  const invoicesSection = document.getElementById('invoices-section');
  
  if (!container) return;

  // Do not present a false Free plan while the canonical entitlement is unresolved.
  const subCheck = window.currentUserSubscription || {};
  if (subCheck.__entitlementResolved !== true) {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
      ? (translations[currentLang] || {})
      : {};
    container.innerHTML = `<div class="p-6 text-center text-gray-500 dark:text-gray-400">⏳ ${i18n.subscriptionStatusLoading || 'Előfizetési státusz betöltése…'}</div>`;
    if (section) section.classList.remove('hidden');
    return;
  }

  const renderAuth = captureSubscriptionAuthContext();
  const renderUid = renderAuth.uid;

  if (
    renderUid &&
    typeof window.refreshSubscriptionEntitlementsOnLogin === 'function'
  ) {
    const subRe = window.currentUserSubscription || {};
    if (!subRe.__entitlementRecomputeOnPage && !subRe.__entitlementRecomputeOnPagePending) {
      subRe.__entitlementRecomputeOnPagePending = true;
      window.refreshSubscriptionEntitlementsOnLogin(renderUid).finally(function () {
        if (shouldAbortSubscriptionAuth(renderAuth, renderUid)) {
          subRe.__entitlementRecomputeOnPagePending = false;
          return;
        }
        subRe.__entitlementRecomputeOnPage = true;
        subRe.__entitlementRecomputeOnPagePending = false;
        if (typeof window.hydrateSubscriptionBillingMirror === 'function') {
          return window.hydrateSubscriptionBillingMirror(renderUid);
        }
      }).finally(function () {
        if (shouldAbortSubscriptionAuth(renderAuth, renderUid)) return;
        renderSubscriptionInfo();
      });
      return;
    }
  }

  if (renderUid && typeof window.hydrateSubscriptionBillingMirror === 'function') {
    const subPre = window.currentUserSubscription || {};
    if (!subPre.__billingMirrorHydrated && !subPre.__billingMirrorHydrating) {
      subPre.__billingMirrorHydrating = true;
      window.hydrateSubscriptionBillingMirror(renderUid).finally(function () {
        subPre.__billingMirrorHydrating = false;
        if (shouldAbortSubscriptionAuth(renderAuth, renderUid)) return;
        renderSubscriptionInfo();
      });
      return;
    }
  }

  // Ha nincs bejelentkezve, ne mutassuk
  if (!renderUid || shouldAbortSubscriptionAuth(renderAuth, renderUid)) {
    if (section) section.classList.add('hidden');
    if (billingInfoSection) billingInfoSection.classList.add('hidden');
    if (invoicesSection) invoicesSection.classList.add('hidden');
    return;
  }

  // Render promo banner first
  const promoBanner = renderPromoBanner();
  // Mutassuk a szekciót
  if (section) section.classList.remove('hidden');
  
  const nativeIosShell = isNativeIosAppShellForSubscription();

  if (nativeIosShell && typeof window.purgeEarlyBirdUiArtifacts === 'function') {
    window.purgeEarlyBirdUiArtifacts();
  }

  if (nativeIosShell && typeof window.logIapEnvTrace === 'function') {
    try {
      window.logIapEnvTrace('renderSubscriptionInfo');
    } catch (_) { /* ignore */ }
  }

  if (
    nativeIosShell &&
    !window.__gurigoStoreKitPricesRenderScheduled &&
    !window.__gurigoStoreKitPriceRequestSent &&
    window.GuriGONativeIapBridge &&
    typeof window.GuriGONativeIapBridge.requestStoreKitPrices === 'function'
  ) {
    try {
      window.__gurigoStoreKitPriceRequestSent = true;
      if (typeof window.gurigoPriceTrace === 'function' && window.GuriGONativeIapBridge.STOREKIT_PRODUCT_IDS) {
        var skIds = window.GuriGONativeIapBridge.STOREKIT_PRODUCT_IDS;
        window.gurigoPriceTrace('requestStoreKitPrices', {
          productType: 'pro',
          productId: skIds.pro,
          environment: 'native_ios_apple_iap',
          source: 'storekit_price_request',
          functionName: 'renderSubscriptionInfo'
        });
        window.gurigoPriceTrace('requestStoreKitPrices', {
          productType: 'archival',
          productId: skIds.archival,
          environment: 'native_ios_apple_iap',
          source: 'storekit_price_request',
          functionName: 'renderSubscriptionInfo'
        });
      }
      window.GuriGONativeIapBridge.requestStoreKitPrices('subscription_page');
    } catch (_) { /* ignore */ }
  }

  // iOS natív shell: nincs Stripe checkout / számlázási űrlap — csak Apple IAP
  if (billingInfoSection) {
    if (nativeIosShell) {
      billingInfoSection.classList.add('hidden');
    } else {
      billingInfoSection.classList.remove('hidden');
      if (typeof window.renderBillingInfoForm === 'function') {
        setTimeout(() => window.renderBillingInfoForm(), 100);
      }
    }
  }

  if (invoicesSection) {
    if (nativeIosShell) {
      invoicesSection.classList.add('hidden');
    } else {
      invoicesSection.classList.remove('hidden');
      if (typeof window.renderInvoicesList === 'function') {
        setTimeout(() => window.renderInvoicesList(), 100);
      } else {
        const invoicesContent = document.getElementById('invoices-content');
        if (invoicesContent) {
          console.error('[Subscription] invoices.js not loaded — renderInvoicesList missing');
          const i18nInv = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
            ? (translations[currentLang] || {})
            : {};
          const emptyMsg = i18nInv.invoicesEmpty || '📄 Még nincs számlád.';
          invoicesContent.innerHTML = `<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">${emptyMsg}</p>`;
        }
      }
    }
  }

  const sub = window.currentUserSubscription || { tier: 'free' };
  const subData = sub;  // ← subData alias a sub-hoz
  const proEnt = (typeof window.getProEntitlement === 'function') ? window.getProEntitlement(sub) : null;
  const archEnt = (typeof window.getArchivalEntitlement === 'function') ? window.getArchivalEntitlement(sub) : null;
  const isLifetimeProValidity = isLifetimeProGiftContext(sub, proEnt);
  const tier = sub.tier || 'free';
  const subStatus = sub.subscriptionStatus;  // ← EZ HIÁNYZIK!
  
  // Ár: mindig a regisztrációkor megadott országkód (billing info másra való)
  const countryCodeForPricing = (sub.registrationCountryCode || sub.countryCode || 'HU').toUpperCase();
  if (typeof window.gurigoIsDiagnosticConsole === 'function' && window.gurigoIsDiagnosticConsole()) {
    console.log('[Subscription] Country for pricing (registration):', countryCodeForPricing, 'registrationCountryCode:', sub.registrationCountryCode, 'countryCode:', sub.countryCode);
  }
  
  // NEW: Use activeUntil if available, fallback to previous logic
  // activeUntil should always contain the relevant expiry date
  const expiry = sub.activeUntil || 
    (sub.stripeSubscriptionId && sub.stripeCustomerId && sub.currentPeriodEnd ? sub.currentPeriodEnd : 
     sub.expiry);
  
  // DEBUG: Log expiry values (diagnostic env only — dates + ids are sensitive)
  if (typeof window.gurigoIsDiagnosticConsole === 'function' && window.gurigoIsDiagnosticConsole()) {
    console.log('[Subscription] Expiry debug:', {
      activeUntil: sub.activeUntil,
      currentPeriodEnd: sub.currentPeriodEnd,
      expiry: sub.expiry,
      finalExpiry: expiry
    });
  }
  const cancelAtPeriodEnd = proEnt ? proEnt.isCancelAtPeriodEnd : !!sub.cancelAtPeriodEnd;
  const archivalTier = sub.archivalTier;
  const archivalExpiry = sub.archivalExpiry;

  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
    ? (translations[currentLang] || {})
    : {};
  const t = (key, fallback) => {
    const v = getI18nValue(i18n, key);
    return (v != null && v !== '') ? v : fallback;
  };
  const locale = getActiveLocale();

  const paymentsGate = (typeof window !== 'undefined' && window.paymentsGate) ? window.paymentsGate : null;
  const paymentsAllowed = !!(paymentsGate && paymentsGate.allowed);
  const proPriceInfo = nativeIosShell ? null : getProPriceInfo(countryCodeForPricing);
  const paymentsInfoHtml = '';

  const upgradeCta = t('subscriptionUpgradeCta', '⭐ Pro csomagra váltok');
  const currentPlanLabel = t('subscriptionCurrentPlanLabel', 'Jelenlegi csomag:');
  const validityLabel = t('subscriptionValidityLabel', 'Érvényesség:');
  const archivalLabel = t('subscriptionArchivalLabel', 'Archiválási csomag:');
  const validityFreeText = t('subscriptionValidityFreeText', 'Korlátlan (ingyenes csomag)');
  const validityUnlimitedText = t('subscriptionValidityUnlimitedText', 'Korlátlan érvényesség');
  const validityPendingRefreshText = t(
    'subscriptionValidityPendingRefresh',
    'Dátum frissítése folyamatban',
  );
  const validityLifetimeText = t('subscriptionValidityLifetime', 'Örökös');
  const validityUntilTemplate = t('subscriptionValidityUntilTemplate', 'Érvényes: <strong>%DATE%</strong>-ig');

  const archivalPlansTitle = t('subscriptionArchivalPlansTitle', 'Archiválási csomagok');
  const archivalPlansHeading = t('subscriptionArchivalPlansHeading', 'Hosszú távú archiválás');
  const archivalPlansDescription = t(
    'subscriptionArchivalPlansDescription',
    'Alap csomag: dokumentumok <strong>6 hétig</strong> tárolva. Hosszabb megőrzéshez válassz archiválási csomagot <strong>(havidíjas)</strong>:'
  );
  const archivalPlansHint = t(
    'subscriptionArchivalPlansHint',
    '💡 Az archiválási csomag aktív havidíjas előfizetés. Amíg fizeted, az <strong>összes dokumentumod</strong> automatikusan meghosszabbított megőrzési időt kap. Lemondáskor a dokumentumok visszaállnak az alap 6 hetes megőrzési időre.'
  );
  const archivalExplanation = t(
    'subscriptionArchivalExplanation',
    '📦 <strong>Mi az Archiválási csomag?</strong><br>Kiegészítő előfizetés, ami <strong>csak</strong> a dokumentumok megőrzési idejét növeli: addig, amíg az előfizetés aktív, plusz <strong>1 hét</strong> türelmi idő a lejárat után. <strong>Nem helyettesíti</strong> a Pro csomagot – Free és Pro mellett <strong>egyaránt használható</strong>.'
  );
  const perMonthSuffix = t('subscriptionPerMonthSuffix', '/hó');

  const archivalShortName = (typeof currentLang !== 'undefined' && currentLang === 'de') ? 'Archivierungs' : ((typeof currentLang !== 'undefined' && currentLang === 'en') ? 'Archival' : ((typeof currentLang !== 'undefined' && currentLang === 'ro') ? 'Arhivare' : ((typeof currentLang !== 'undefined' && currentLang === 'pl') ? 'Archiwizacja' : ((typeof currentLang !== 'undefined' && (currentLang === 'da' || currentLang === 'no')) ? 'Arkiverings' : 'Archiválási'))));
  const archivalNameMap = {
    archival: archivalShortName,
    '6month': t('subscriptionArchivalName6month', '6 hónap'),
    '1year': t('subscriptionArchivalName1year', '1 év'),
    '2year': t('subscriptionArchivalName2year', '2 év'),
    '5year': t('subscriptionArchivalName5year', '5 év')
  };
  const archivalRetentionTextMap = {
    '6month': t('subscriptionArchivalRetention6month', '180 nap (~6 hónap)'),
    '1year': t('subscriptionArchivalRetention1year', '365 nap (1 év)'),
    '2year': t('subscriptionArchivalRetention2year', '730 nap (2 év)'),
    '5year': t('subscriptionArchivalRetention5year', '1825 nap (5 év)')
  };
  const archivalInfoCardHtml = (() => {
    const uploadLimitHint = t('subscriptionArchivalUploadLimitHint', 'Free csomagban, archiválási csomag nélkül a dokumentum feltöltési limit 2 db/nap. Archiválási csomaggal <strong>vagy</strong> Pro előfizetéssel korlátlan.');
    return `<div class="p-3 mb-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-sm text-gray-700 dark:text-gray-300">${archivalExplanation}<p class="text-sm text-gray-700 dark:text-gray-300 mt-2 mb-0">${t('subscriptionRetentionFreeHint', 'Archiválási csomag nélkül a feltöltött dokumentumok 6 hét után automatikusan törlődnek.')}</p><p class="text-sm text-gray-700 dark:text-gray-300 mt-2 mb-0">${uploadLimitHint}</p></div>`;
  })();

  const trialStartedAt = sub.trialStartedAt;
  const trialEnd = sub.trialEnd;
  const trialUpsellOptOut = !!sub.trialUpsellOptOut;
  const trialUpsellSnoozeUntil = sub.trialUpsellSnoozeUntil;
  const subscriptionDowngradeGraceUntilRaw = sub.subscriptionDowngradeGraceUntil || null;
  
  // FONTOS: isDowngradePending csak akkor true, ha a user LEMONDTA az előfizetést (cancelAtPeriodEnd = true)
  // subscriptionDowngradeGraceUntil egy másik scenario (grace period), azt ne keverjük össze

  // Tier nevek
  const tierNames = {
    free: t('subscriptionTierNameFree', 'Free'),
    pro: t('subscriptionTierNamePro', 'Pro'),
    tester: t('subscriptionTierNameTester', 'Tesztelő (Pro jogosultság)')
  };
  const tierName = tierNames[tier] || tier.toUpperCase();
  const effectiveTierName = isLifetimeProValidity
    ? t('subscriptionTierNamePro', 'Pro')
    : tierName;

  const pickDate = (v) => {
    try {
      if (!v) return null;
      if (v instanceof Date) return v;
      return new Date(v);
    } catch (_) {
      return null;
    }
  };
  const formatDateLocalized = (value, options) => {
    const date = pickDate(value);
    if (!date || isNaN(date.getTime())) return '';
    const formatOptions = Object.assign(
      {},
      options || { year: 'numeric', month: '2-digit', day: '2-digit' }
    );
    // Stripe számlázási nap: UTC naptári nap = billingCycleDay (ne tolja CE helyi idő a +1 napra)
    if (sub && sub.billingCycleDay != null && formatOptions.timeZone == null) {
      formatOptions.timeZone = 'UTC';
    }
    try {
      return date.toLocaleDateString(locale, formatOptions);
    } catch (_) {
      return '';
    }
  };

  const expiryStrShort = formatDateLocalized(expiry);

  let statusHtml = '';
  let trialStatusHtml = '';
  let trialUpsellHtml = '';
  const formatCountdown = (target) => {
    const dayLabel = t('subscriptionCountdownDaysLabel', 'nap');
    const hourLabel = t('subscriptionCountdownHoursLabel', 'óra');
    const lessThanHour = t('subscriptionCountdownLessThanHour', 'kevesebb mint 1 óra');
    if (!target) return { label: '0 nap', days: 0 };
    const nowTs = Date.now();
    const diff = target.getTime() - nowTs;
    
    // DEBUG: Log countdown calculation
    if (typeof window.gurigoIsDiagnosticConsole === 'function' && window.gurigoIsDiagnosticConsole()) {
      console.log('[Subscription] Countdown debug:', {
        target: target,
        targetTime: target.getTime(),
        now: nowTs,
        diff: diff,
        diffDays: diff / (1000 * 60 * 60 * 24)
      });
    }
    
    if (diff <= 0) return { label: '0 nap', days: 0 };
    const dayMs = 1000 * 60 * 60 * 24;
    const hourMs = 1000 * 60 * 60;
    const days = Math.floor(diff / dayMs);
    const hours = Math.floor((diff % dayMs) / hourMs);
    let label = '';
    if (days > 0) label += `${days} ${dayLabel}`;
    if (hours > 0) label += `${label ? ' ' : ''}${hours} ${hourLabel}`;
    if (!label) label = lessThanHour;
    return { label, days };
  };

  const formatDateLabel = (key, fallback, dateStr) => {
    const template = t(key, fallback);
    if (!dateStr) return template.replace('%DATE%', '');
    return template.replace('%DATE%', dateStr);
  };

  const trialEndDate = pickDate(trialEnd);
  const trialStartDate = pickDate(trialStartedAt);
  const snoozeUntilDate = pickDate(trialUpsellSnoozeUntil);
  const subscriptionDowngradeGraceUntil = pickDate(subscriptionDowngradeGraceUntilRaw);
  
  // JAVÍTÁS: isDowngradePending csak akkor true, ha cancelAtPeriodEnd = true (user lemondta)
  // subscriptionDowngradeGraceUntil egy másik scenario, azt ne keverjük össze
  const isDowngradePending = proEnt ? proEnt.isDowngradePending : cancelAtPeriodEnd;
  const downgradeDeadline = cancelAtPeriodEnd ? pickDate(expiry) : null;
  const now = new Date();
  const trialActive = !!(trialEndDate && trialEndDate > now);
  const trialDaysLeft = trialActive ? Math.max(0, Math.ceil((trialEndDate - now) / (1000 * 60 * 60 * 24))) : 0;
  const trialWeek = trialStartDate
    ? Math.floor((now - trialStartDate) / (1000 * 60 * 60 * 24 * 7)) + 1
    : null;
  const trialEndStr = formatDateLocalized(trialEndDate);
  const trialWeekLabel = trialWeek
    ? formatTemplate(t('subscriptionTrialWeekLabel', '%WEEK%. hét'), { WEEK: trialWeek })
    : '';
  const trialShowUpsell = trialActive && trialStartDate && (now >= new Date(trialStartDate.getTime() + 21 * 24 * 60 * 60 * 1000));
  const trialSnoozed = !!(snoozeUntilDate && snoozeUntilDate > now);
  let downgradePromoHtml = '';

  // === PROMO BANNER ===
  let promoBannerHtml = '';
  const promoState = (typeof window.getEarlyBirdPromoStateForUi === 'function')
    ? window.getEarlyBirdPromoStateForUi(sub)
    : (canShowEarlyBirdOfferForUi() ? (sub.promoState || null) : null);
  // Only show promo banner for trial users, not for active Pro subscribers
  const hasRealProSubscription = proEnt
    ? proEnt.isPaidPro
    : (tier === 'pro' && (typeof window.hasActiveStripeProSubscription === 'function'
      ? window.hasActiveStripeProSubscription(sub)
      : !!(sub.stripeSubscriptionId && sub.stripeCustomerId)));
  if (canShowEarlyBirdOfferForUi() && promoState && !promoState.promoUsed && !promoState.promoDeclined && !hasRealProSubscription) {
    const promoExpiresAt = promoState.promoExpiresAt;
    if (promoExpiresAt) {
      // Handle Firestore Timestamp, JS Date, or raw milliseconds
      const expiresAtTime = promoExpiresAt.toMillis ? promoExpiresAt.toMillis() :
                            (promoExpiresAt instanceof Date ? promoExpiresAt.getTime() : 
                            (promoExpiresAt.seconds ? promoExpiresAt.seconds * 1000 : promoExpiresAt));
      const timeLeft = expiresAtTime - now;
      
      if (timeLeft > 0 && (promoState.currentPromoType || promoState.promo40Eligible || promoState.promo20Eligible)) {
        // Prioritize currentPromoType, then fallback to eligibility flags
        const discount = promoState.currentPromoType === '40' ? 40 : 
                        promoState.currentPromoType === '20' ? 20 :
                        promoState.promo40Eligible ? 40 : 20;
        const promoProPrice = getProPriceInfo(countryCodeForPricing);
        const normalPrice = promoProPrice.amount;
        const promoPrice = discount === 40 ? (normalPrice * 0.6).toFixed(promoProPrice.fractionDigits || 2) : (normalPrice * 0.8).toFixed(promoProPrice.fractionDigits || 2);
        const currencySuffix = promoProPrice.currency === 'HUF' ? ' Ft' : promoProPrice.currency === 'PLN' ? ' zł' : promoProPrice.currency === 'RON' ? ' lei' : promoProPrice.currency === 'DKK' || promoProPrice.currency === 'NOK' ? ' kr' : ' €';
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const timeLeftStr = hoursLeft > 0 ? `${hoursLeft} óra ${minutesLeft} perc` : `${minutesLeft} perc`;
        
        // i18n for promo banner
        const bannerTitle = t('promoBannerTitle', '🎉 Speciális ajánlatod: %DISCOUNT%% kedvezmény!').replace('%DISCOUNT%', discount);
        const bannerTimeLeft = t('promoBannerTimeLeft', '⏰ %TIME_LEFT%').replace('%TIME_LEFT%', timeLeftStr);
        const bannerFirstMonth = t('promoBannerFirstMonth', 'Első hónap: %PROMO_PRICE%%CURRENCY%').replace('%PROMO_PRICE%', promoPrice).replace('%CURRENCY%', currencySuffix);
        const bannerNormalPrice = t('promoBannerNormalPrice', '%NORMAL_PRICE%%CURRENCY%').replace('%NORMAL_PRICE%', normalPrice).replace('%CURRENCY%', currencySuffix);
        const bannerAfterFirst = t('promoBannerAfterFirst', 'Ezután: %NORMAL_PRICE%%CURRENCY%/hó').replace('%NORMAL_PRICE%', normalPrice).replace('%CURRENCY%', currencySuffix);
        const bannerDisclaimer = t('promoBannerDisclaimer', '* A kedvezmény csak az első hónapra vonatkozik');
        
        const promoCtaButton = t('promoModalAcceptButton', '✨ Előfizetek most');
        
        promoBannerHtml = `
          <div data-gurigo-promo-banner="1" class="mb-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-5 rounded-xl shadow-lg relative z-10">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xl font-bold">${bannerTitle}</p>
              <span class="text-sm bg-white/20 px-3 py-1 rounded-full">${bannerTimeLeft}</span>
            </div>
            <div class="mt-3">
              <p class="text-2xl font-bold">${bannerFirstMonth} <span class="text-sm line-through opacity-75">${bannerNormalPrice}</span></p>
              <p class="text-sm opacity-90 mt-1">${bannerAfterFirst}</p>
            </div>
            <p class="text-xs mt-3 opacity-80 mb-3">${bannerDisclaimer}</p>
            <div class="border-t border-white/30 pt-3 mt-1 mb-3">
              <p class="text-xs opacity-90 text-white leading-relaxed m-0">⚠️ ${(typeof window.getEarlyBirdPaymentWarningMessage === 'function' ? window.getEarlyBirdPaymentWarningMessage() : t('promoEarlyBirdPaymentWarning', 'A próbaidőszak alatt nem történik terhelés. A korai kedvezmény csak sikeres első fizetés esetén válik véglegessé. Ha a fizetés a Stripe automatikus újrapróbálkozásai után is sikertelen, a kedvezmény elveszik, és később már nem aktiválható újra.'))}</p>
            </div>
            <div class="border-t border-white/30 pt-3 mt-1 mb-3">
              <div class="text-xs font-semibold text-white/95 mb-1">⚠️ ${t('promoModalFreeLimitsTitle', 'Mi változik a Free csomaggal?')}</div>
              <div class="space-y-0.5">
                <div class="text-xs opacity-90 text-white">• ${t('promoModalFreeLimit1', 'A tachográf elemzés és heti státusz nem elérhető')}</div>
                <div class="text-xs opacity-90 text-white">• ${t('promoModalFreeLimit2', 'Csak EUR raklap rögzítése lehetséges, napi max 3 bejegyzés')}</div>
                <div class="text-xs opacity-90 text-white">• ${t('promoModalFreeLimit3', 'Naponta legfeljebb 2 dokumentum feltöltés')}</div>
              </div>
            </div>
            <button onclick="if(window.startPromoCheckout){window.startPromoCheckout();}" class="w-full bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg font-bold transition-colors shadow-md">
              ${promoCtaButton}
            </button>
          </div>
        `;
      }
    }
  }

  if (tier === 'pro') {
    // Valós Pro előfizetés: van Stripe subscription ID ÉS customer ID
    // Próbaidő: nincs Stripe subscription, VAGY explicit isTrial flag van
    const hasRealSubscription = proEnt
      ? proEnt.hasRealSubscription
      : (typeof window.hasActiveStripeProSubscription === 'function'
        ? window.hasActiveStripeProSubscription(sub)
        : !!(sub.stripeSubscriptionId && sub.stripeCustomerId));
    const isTrialUser = proEnt ? proEnt.isTrialPro : (!hasRealSubscription && (sub.isTrial || trialActive));
    const isPaymentFailed = proEnt ? proEnt.isPaymentFailed : (sub.subscriptionPaymentFailed === true || subStatus === 'past_due');
    const isAdminGiftLifetimePro = isLifetimeProValidity && !hasRealSubscription;
    const isAdminGiftDurationPro = !!(proEnt && proEnt.isAdminGiftPro && !proEnt.isAdminGiftLifetime && !hasRealSubscription);

    if (isAdminGiftLifetimePro) {
      const lifetimeCircle = buildSubscriptionInfinityCircleHtml(sub, t);
      statusHtml = buildSubscriptionStatusCardHtml(
        'purple',
        t('subscriptionAdminGiftLifetimeStatusTitle', '🎁 Lifetime Pro access'),
        [t('subscriptionAdminGiftLifetimeStatusBody', 'You have unlimited Pro access. No subscription is needed.')],
        null,
        lifetimeCircle,
      );
    } else if (isAdminGiftDurationPro) {
      const giftEndsAt = sub.adminGiftEndsAt || pickDate(expiry);
      const giftEndStr = formatDateLocalized(giftEndsAt);
      const giftBody = giftEndStr
        ? formatTemplate(
            t('subscriptionAdminGiftDurationStatusBody', 'Gift Pro is active until <strong>%DATE%</strong>.'),
            { DATE: giftEndStr },
          )
        : t('subscriptionAdminGiftDurationStatusBodyFallback', 'Gift Pro is currently active.');
      const giftCircle = buildSubscriptionProgressCircleHtml(sub, t);
      statusHtml = buildSubscriptionStatusCardHtml(
        'purple',
        t('subscriptionAdminGiftDurationStatusTitle', '🎁 Gift Pro access'),
        [giftBody],
        null,
        giftCircle,
      );
    } else if (isPaymentFailed) {
      const graceUntilDate = sub.subscriptionPaymentGraceUntil ? new Date(sub.subscriptionPaymentGraceUntil) : null;
      const graceDaysLeft = graceUntilDate ? Math.max(0, Math.ceil((graceUntilDate - now) / (1000 * 60 * 60 * 24))) : null;
      const graceDeadlineStr = graceUntilDate ? formatDateLocalized(graceUntilDate) : null;
      const proMgmtPayFail = getProManagementModeForUi(sub);
      const showStripeCardUpdate = proMgmtPayFail.mode === 'stripe_manage';
      const paySummary =
        typeof window.getSubscriptionPaymentProblemSummary === 'function'
          ? window.getSubscriptionPaymentProblemSummary(sub)
          : null;
      const appleProPaymentUi =
        (paySummary && paySummary.usesApplePaymentUi) ||
        proMgmtPayFail.provider === 'apple' ||
        proMgmtPayFail.mode === 'apple_manage' ||
        proMgmtPayFail.mode === 'apple_info_web';

      const paymentFailedTitle = t('subscriptionPaymentFailedTitle', '⚠️ Fizetési probléma');
      const updateCardLabel = t('subscriptionUpdateCardLabel', '💳 Bankkártya frissítése');
      const manageAppleLabel = t('subscriptionAppleManageSubscriptionButton', 'Előfizetés kezelése');

      if (appleProPaymentUi) {
        const appleBody = t(
          'subscriptionAppleProPaymentProblemBody',
          'A Pro csomag továbbra is aktív, de az automatikus megújulás fizetési hiba miatt nem sikerült. Kérjük, ellenőrizd az Apple ID fizetési módodat.',
        );
        const graceLine = graceDeadlineStr
          ? formatTemplate(
              t('subscriptionApplePaymentGraceUntilLine', 'Türelmi idő vége: %DATE%.'),
              { DATE: graceDeadlineStr },
            )
          : '';
        const cardLines = [appleBody];
        if (graceLine) cardLines.push(graceLine);
        const paymentFailedCircle = buildSubscriptionProgressCircleHtml(sub, t);
        statusHtml =
          buildSubscriptionStatusCardHtml('yellow', paymentFailedTitle, cardLines, null, paymentFailedCircle) +
          `<div class="mt-2"><button type="button" onclick="handleProProviderManage()" class="w-full py-2 border border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-100 rounded-lg font-semibold transition text-sm">${manageAppleLabel}</button></div>`;
      } else {
        const paymentFailedBody = t('subscriptionPaymentFailedBody', 'A legutóbbi bankkártyás levonás sikertelen volt. Kérlek frissítsd a fizetési módodat, hogy az előfizetésed ne szűnjön meg.');
        const paymentFailedGrace = graceDaysLeft !== null
          ? formatTemplate(
              t('subscriptionPaymentFailedGrace', '⏰ <strong>%DAYS% napod van</strong> a fizetési mód frissítésére%DEADLINE%.'),
              { DAYS: graceDaysLeft, DEADLINE: graceDeadlineStr ? (' (' + graceDeadlineStr + '-ig)') : '' },
            )
          : t('subscriptionPaymentFailedGraceDefault', '⏰ Kérlek mielőbb frissítsd a fizetési módodat.');

        const stripePaymentFailedCircle = buildSubscriptionProgressCircleHtml(sub, t);
        statusHtml = `
        <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
          <div class="font-semibold text-red-800 dark:text-red-200 mb-2">${paymentFailedTitle}</div>
          <div class="text-sm text-red-700 dark:text-red-300 mb-2">${paymentFailedBody}</div>
          <div class="text-sm text-red-700 dark:text-red-300 mb-3">${paymentFailedGrace}</div>
          ${stripePaymentFailedCircle ? '<div class="flex justify-center my-3">' + stripePaymentFailedCircle + '</div>' : ''}
          ${showStripeCardUpdate
            ? `<button id="${MANAGE_STRIPE_SUBSCRIPTION_BTN_ID}" onclick="handleUpdatePaymentMethod()" class="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition">${updateCardLabel}</button>`
            : (proMgmtPayFail.mode === 'stripe_info_ios' || proMgmtPayFail.mode === 'apple_info_web')
              ? `<button type="button" onclick="handleProProviderManage()" class="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition">${manageAppleLabel}</button>`
              : `<button disabled class="w-full py-2 bg-red-300 text-white rounded-lg font-semibold cursor-not-allowed">${updateCardLabel}</button>`
          }
        </div>
      `;
      }
    } else if (isProCancelPendingForDisplay(sub, proEnt)) {
      const proCancelValidLine = expiryStrShort
        ? formatTemplate(
            t('subscriptionStatusCancelValidUntil', 'Érvényes: <strong>%DATE%</strong>-ig.'),
            { DATE: expiryStrShort },
          )
        : '';
      const cancelPendingCircle = buildSubscriptionProgressCircleHtml(sub, t);
      statusHtml = buildSubscriptionStatusCardHtml(
        'yellow',
        t('subscriptionStatusCancelTitle', '⚠️ Lemondás alatt'),
        [
          t(
            'subscriptionStatusCancelProLine1',
            'A Pro csomag még aktív, de már nem újul meg automatikusan.',
          ),
          proCancelValidLine,
          t('subscriptionStatusCancelNoMoreCharge', 'A díjat már nem vonjuk le újra.'),
        ],
        null,
        cancelPendingCircle,
      );
    } else if (isTrialUser) {
      const isDark = document.documentElement.classList.contains('dark');
      const bgColor = isDark ? 'rgba(88, 28, 135, 0.2)' : 'rgb(250, 245, 255)';
      const borderColor = isDark ? 'rgb(168, 85, 247)' : 'rgb(233, 213, 255)';
      const textColor = isDark ? 'rgb(243, 232, 255)' : 'rgb(109, 40, 217)';
      const subtextColor = isDark ? 'rgb(233, 213, 255)' : 'rgb(109, 40, 217)';
      const trialTitle = t('subscriptionStatusTrialTitle', '🎁 Pro próbaidő aktív');
      const trialSubtitle = expiryStrShort
        ? formatTemplate(t('subscriptionStatusTrialSubtitleWithDate', 'Érvényes: <strong>%DATE%</strong>-ig'), { DATE: expiryStrShort })
        : t('subscriptionStatusTrialSubtitleFallback', 'Próbaidő aktív');
      const trialBody = t('subscriptionStatusTrialBody', 'Próbáld ki a Pro funkciókat ingyen! A próbaidő lejárta után Free csomagra váltasz, hacsak nem fizetsz elő.');
      
      // Check if trial is canceled
      const isTrialCanceled = subStatus === 'trialing_canceled';
      const willCancelAt = subData?.willCancelAt;
      
      if (isTrialCanceled && willCancelAt) {
        const willCancelMs = willCancelAt.toMillis ? willCancelAt.toMillis() : (willCancelAt.seconds ? willCancelAt.seconds * 1000 : null);
        const daysLeft = willCancelMs ? Math.ceil((willCancelMs - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
        
        statusHtml = `
          <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
            <div class="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
              ⚠️ ${t('subscriptionTrial.canceledTitle', 'Előfizetés lemondva')}
            </div>
            <div class="text-sm text-yellow-700 dark:text-yellow-400 mb-1">
              ${formatTemplate(t('subscriptionTrial.canceledMessage', 'A Pro funkciókat még {days} napig használhatod. Ezután automatikusan Free tier-re kerülsz.'), { days: daysLeft })}
            </div>
            <div class="text-xs text-yellow-600 dark:text-yellow-500">
              ${t('subscriptionTrial.noCharge', 'Nem lesz terhelés.')}
            </div>
          </div>
        `;
      } else {
        const trialEndMs = subData?.trialEnd?.toMillis ? subData.trialEnd.toMillis() : (subData?.trialEnd?.seconds ? subData.trialEnd.seconds * 1000 : null);
        const expiryMs = (expiry && (expiry instanceof Date)) ? expiry.getTime() : (expiry && typeof expiry.toMillis === 'function' ? expiry.toMillis() : null);
        const effectiveTrialEndMs = trialEndMs || expiryMs;
        const trialEndDate = effectiveTrialEndMs ? new Date(effectiveTrialEndMs).toLocaleDateString(typeof getActiveLocale === 'function' ? getActiveLocale() : 'hu-HU') : '';
        const trialCircle = buildSubscriptionProgressCircleHtml(sub, t);

        statusHtml = `
          <div class="p-3 rounded-lg" style="background-color: ${bgColor}; border: 1px solid ${borderColor};">
            <div class="font-semibold" style="color: ${textColor};">${trialTitle}</div>
            <div class="mt-1 text-xs" style="color: ${subtextColor};">
              ${trialBody}
            </div>
            ${trialCircle ? '<div class="flex justify-center mt-3">' + trialCircle + '</div>' : ''}
            <div class="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
              <div class="text-xs mb-3" style="color: ${subtextColor};">
                ${t('subscriptionTrial.firstPayment', 'Első terhelés')}: ${trialEndDate}
              </div>
            </div>
          </div>
        `;
      }
    } else {
      const proProgressCircle = buildSubscriptionProgressCircleHtml(sub, t);
      const proActiveAside = proProgressCircle
        ? ''
        : (expiryStrShort
          ? '<div class="text-xs text-green-700 dark:text-green-300 whitespace-nowrap shrink-0">' +
            formatTemplate(
              t('subscriptionStatusValidThrough', 'Érvényes: <strong>%DATE%</strong>-ig'),
              { DATE: expiryStrShort },
            ) +
            '</div>'
          : '');
      statusHtml = buildSubscriptionStatusCardHtml(
        'green',
        t('subscriptionStatusActiveTitle', '✅ Előfizetés aktív'),
        [
          t(
            'subscriptionStatusActiveProBody',
            'A Pro csomag aktív, a díjat a fenti dátum környékén vonjuk le.',
          ),
        ],
        proActiveAside,
        proProgressCircle,
      );
    }
  } else if (tier === 'free') {
    const freeTitle = t('subscriptionStatusFreeTitle', 'ℹ️ Free csomag');
    statusHtml = buildSubscriptionStatusCardHtml(
      'neutral',
      freeTitle,
      [i18n.subscriptionNoActivePayment || t('subscriptionNoActivePayment', 'Jelenleg nincs aktív fizetés')],
    );

    if (trialActive) {
      const trialCircle = buildSubscriptionProgressCircleHtml(sub, t);
      const trialDurationText = trialEndStr
        ? formatTemplate(t('subscriptionTrialDurationWithDate', 'A próbaidőszak <strong>%DATE%</strong>-ig tart. Ez idő alatt Pro funkciók elérhetők.'), { DATE: trialEndStr })
        : t('subscriptionTrialDurationFallback', 'A próbaidőszak 6 hétig tart. Ez idő alatt Pro funkciók elérhetők.');
      trialStatusHtml = `
        <div class="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <div class="font-semibold text-indigo-700 dark:text-indigo-300">${t('subscriptionTrialCardTitle', '✨ Pro próba aktív')}</div>
          <div class="mt-1 text-xs text-indigo-700 dark:text-indigo-400">
            ${trialDurationText}
          </div>
          ${trialCircle ? '<div class="flex justify-center mt-3">' + trialCircle + '</div>' : ''}
        </div>
      `;

      if (trialShowUpsell && !nativeIosShell) {
        if (trialUpsellOptOut) {
          trialUpsellHtml = `
            <div class="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div class="text-sm font-semibold text-gray-700 dark:text-gray-200">${t('subscriptionTrialOptOutTitle', 'ℹ️ Próba emlékeztetők kikapcsolva')}</div>
              <div class="mt-1 text-xs text-gray-600 dark:text-gray-400">${t('subscriptionTrialOptOutBody', 'A próba végéig nem zavarunk felugróval.')}</div>
            </div>
          `;
        } else if (trialSnoozed) {
          const snoozeStr = formatDateLocalized(snoozeUntilDate);
          trialUpsellHtml = `
            <div class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div class="flex items-center justify-between gap-3">
                <div class="text-sm font-semibold text-yellow-800 dark:text-yellow-300">${t('subscriptionTrialSnoozedTitle', '⏸ Emlékeztető elnapolva')}</div>
                <div class="text-xs text-yellow-800 dark:text-yellow-300">${snoozeStr}</div>
              </div>
              <div class="mt-1 text-xs text-yellow-700 dark:text-yellow-400">${t('subscriptionTrialSnoozedBody', 'Pár napig nem kérdezünk rá. A próba közben bármikor válthatsz Pro-ra.')}</div>
            </div>
          `;
        } else {
          trialUpsellHtml = `
            <div id="archival-plans" class="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
              <div class="flex items-center justify-between gap-3">
                <div class="font-semibold text-gray-900 dark:text-gray-100">${t('subscriptionTrialUpsellTitle', '⭐ Tetszik a Pro?')}</div>
                <div class="text-xs text-gray-600 dark:text-gray-400">${trialWeekLabel}</div>
              </div>
              <div class="mt-2 text-xs text-gray-700 dark:text-gray-300">
                ${t('subscriptionTrialUpsellBody', 'Ha szeretnéd, már a próba közben beállíthatod az előfizetést. A próbaidőd <strong>nem rövidül</strong>.')}
              </div>
              <div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                ${paymentsAllowed
                  ? `<button type="button" data-gurigo-iap-role="pro-purchase" onclick="handleSubscriptionAction('upgrade_pro')" class="py-2 btn-primary font-semibold">${upgradeCta}</button>`
                  : `<button disabled class="py-2 btn-primary font-semibold opacity-60 cursor-not-allowed">${upgradeCta}</button>`
                }
                <button onclick="handleTrialUpsellSnooze()" class="py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold">${t('subscriptionTrialSnoozeButton', '⏰ 3 nap múlva')}</button>
                <button onclick="handleTrialUpsellOptOut()" class="py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold">${t('subscriptionTrialOptOutButton', 'Ne kérdezd többet')}</button>
              </div>
              ${paymentsInfoHtml}
            </div>
          `;
        }
      }
    }
  } else if (tier === 'tester') {
    const testerTitle = t('subscriptionTesterStatusTitle', '🧪 Tesztelő hozzáférés');
    const testerBody = i18n.subscriptionUnlimitedNoActivePayment || t('subscriptionTesterStatusBody', 'Korlátlan, jelenleg nincs aktív fizetés');
    const testerCircle = buildSubscriptionInfinityCircleHtml(sub, t);
    statusHtml = buildSubscriptionStatusCardHtml(
      'purple',
      testerTitle,
      [testerBody],
      null,
      testerCircle,
    );
  }

  let plansHtml = '';
  try {
    // Tesztelőknek és Lifetime Pro-nak ne mutassuk a Free/Pro csomagok leírását.
    if (tier === 'tester') {
      plansHtml = '';
    } else if (isLifetimeProValidity) {
      const lifetimePlansTitle = formatTemplate(
        t('subscriptionAdminGiftLifetimeAllAccessTitle', '🎁 %PLAN% – Lifetime Pro'),
        { PLAN: tierName },
      );
      const lifetimePlansBody = t(
        'subscriptionAdminGiftLifetimePlansBlockBody',
        'Korlátlan Pro hozzáférésed van. Pro előfizetés indítása nem szükséges.',
      );
      plansHtml =
        '<div class="p-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg">' +
        '<p class="text-purple-700 dark:text-purple-300 font-semibold mb-2">' + lifetimePlansTitle + '</p>' +
        '<p class="text-sm text-gray-600 dark:text-gray-400 m-0">' + lifetimePlansBody + '</p>' +
        '</div>';
    } else {
    const tiers = (typeof window !== 'undefined' && window.SUBSCRIPTION_TIERS) ? window.SUBSCRIPTION_TIERS : null;
    // Ár: regisztrációs ország (profil), nem számlázási cím
    const countryCodeForPlans = (sub.registrationCountryCode || sub.countryCode || 'HU').toUpperCase();
    const proPriceResolved = resolveProPriceForUi(countryCodeForPlans, perMonthSuffix);
    const proPriceText = proPriceResolved.formatted || '';
    if (typeof window.gurigoPriceTrace === 'function') {
      window.gurigoPriceTrace('renderSubscriptionInfo_dom_pro', {
        productType: 'pro',
        productId: 'com.gurigo.pro.monthly',
        environment: nativeIosShell ? 'native_ios_apple_iap' : 'web_stripe',
        source: proPriceResolved.traceSource || proPriceResolved.source || 'unknown',
        inputCountryCode: countryCodeForPlans,
        storeKitDisplayPrice: proPriceResolved.displayPrice || null,
        finalPriceText: proPriceText,
        isFallback: !!proPriceResolved.isFallback,
        functionName: 'renderSubscriptionInfo'
      });
    }
    const proPriceFallbackStyle = proPriceResolved.isFallback
      ? 'text-gray-500 dark:text-gray-400 italic font-medium'
      : 'text-gray-900 dark:text-gray-100';

    const isFree = tier === 'free';
    const isPro = tier === 'pro';
    const isTester = tier === 'tester';

    const plansTitle = t('subscriptionPlansTitle', 'Csomagok');
    const plansCancelable = t('subscriptionPlansCancelable', 'Bármikor lemondható');
    const freeTitle = t('subscriptionPlanFreeTitle', '🆓 Free');
    const freePrice = t('subscriptionPlanFreePrice', 'Ingyenes');
    const freeLine1 = i18n.subscriptionPlanFreeLine1 || 'Alap funkciók elérhetők';
    const freeLine2 = i18n.subscriptionFreeFeatureDocumentUploadWithArchival
      || i18n.subscriptionPlanFreeLine2
      || 'Dokumentum feltöltés: 2/nap (Archiválási csomaggal korlátlan)';
    const freeLine3 = i18n.subscriptionPlanFreeLine3 || 'Raklap tranzakció: 3/nap (csak EUR)';
    const freeLine4 = i18n.subscriptionPlanFreeLine4 || 'Tachográf: korlátozott (mintanézet)';
    const freeLine5 = i18n.subscriptionFreeFeatureOneActiveVehicle || 'Egyszerre 1 aktív jármű';

    const proTitle = i18n.subscriptionPlanProTitle || '⭐ Pro';
    const proLine1 = i18n.subscriptionPlanProLine1 || 'A Free korlátozások feloldása';
    const proLine2 = i18n.subscriptionPlanProLine2 || 'Dokumentum feltöltés: korlátlan';
    const proLine3 = i18n.subscriptionPlanProLine3 || 'Raklap: több típus + napi limit nélkül';
    const proLine4 = i18n.subscriptionPlanProLine4 || 'Tachográf: teljes elemzés + heti státusz';
    const proLine5 = i18n.subscriptionPlanProLine5 || 'Iratok/Engedélyek: lejárati emlékeztetők';
    const proLine6 = i18n.subscriptionProFeatureUnlimitedVehicles || 'Korlátlan aktív jármű kezelése';

    const trialNote = i18n.subscriptionPlansTrialNote || 'Új regisztráció esetén a fiók 6 hétig Pro hozzáférést kap (próbaidőszak).';
    const plansFooter = i18n.subscriptionPlansFooter || 'Az archiválási csomag külön előfizetés: a dokumentumok megőrzési idejét növeli.';
    const recommendedBadge = i18n.subscriptionRecommendedBadge || '⭐ Ajánlott';

    const freeLines = [
      freeLine1,
      freeLine2,
      freeLine3,
      freeLine4,
      freeLine5
    ].filter(Boolean);

    const proLines = [
      proLine1,
      proLine2,
      proLine3,
      proLine4,
      proLine5,
      proLine6
    ].filter(Boolean);

    plansHtml = `
      <div class="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div class="flex items-center justify-between gap-3 mb-3">
          <div class="font-semibold text-gray-900 dark:text-gray-100">${plansTitle}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400">${plansCancelable}</div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="p-3 rounded-lg border ${isFree ? 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/10'}">
            <div class="flex items-center justify-between">
              <div class="font-semibold text-gray-900 dark:text-gray-100">${freeTitle}</div>
              <div class="text-sm font-bold text-gray-900 dark:text-gray-100 text-right">${freePrice}</div>
            </div>
            <div class="mt-2 text-xs text-gray-700 dark:text-gray-300 space-y-1">
              ${freeLines.map(l => `<div>${l}</div>`).join('')}
            </div>
          </div>

          <div
            class="p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 transition ${(!isPro && !isTester && paymentsAllowed) ? 'cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 active:shadow-sm' : ''} ${(!isPro && !isTester && !paymentsAllowed) ? 'opacity-75 cursor-not-allowed' : ''}"
            ${(!isPro && !isTester && paymentsAllowed) ? "role=\"button\" tabindex=\"0\" data-gurigo-iap-role=\"pro-purchase\" data-gurigo-iap-preserve-content=\"1\" onclick=\"handleSubscriptionAction('upgrade_pro')\" onkeydown=\"if(event.key==='Enter'||event.key===' '){event.preventDefault();handleSubscriptionAction('upgrade_pro');}\"" : ''}
          >
            <div class="flex items-center justify-between">
              <div class="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>${proTitle}</span>
                <span class="text-[11px] px-2 py-0.5 rounded-full bg-white/70 dark:bg-gray-900/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">${recommendedBadge}</span>
              </div>
              <div class="text-sm font-bold text-right ${proPriceFallbackStyle}">${proPriceText}</div>
            </div>
            <div class="mt-2 text-xs text-gray-700 dark:text-gray-300 space-y-1">
              ${proLines.map(l => `<div>${l}</div>`).join('')}
            </div>
            ${(!isPro && !isTester && !paymentsAllowed) ? paymentsInfoHtml : ''}
          </div>
        </div>

        <div class="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
          <div>${trialNote}</div>
          <div>${plansFooter}</div>
        </div>
      </div>
    `;
    }
  } catch (_) {
    plansHtml = '';
  }

  // Érvényesség szöveg
  const isPaidStripePro =
    tier === 'pro' &&
    !!(sub.stripeSubscriptionId || sub.stripeCustomerId || (proEnt && proEnt.billingProvider === 'stripe'));
  let validityText = '';
  if (isLifetimeProValidity) {
    validityText = `<span class="text-green-600 dark:text-green-400">${validityLifetimeText}</span>`;
  } else if (tier === 'free') {
    validityText = `<span class="text-gray-600 dark:text-gray-400">${validityFreeText}</span>`;
  } else if (tier === 'tester') {
    validityText = `<span class="text-green-600 dark:text-green-400">${validityUnlimitedText}</span>`;
  } else if (!expiryStrShort && isPaidStripePro) {
    validityText = `<span class="text-amber-700 dark:text-amber-300">${validityPendingRefreshText}</span>`;
  } else if (!expiryStrShort) {
    validityText = `<span class="text-green-600 dark:text-green-400">${validityUnlimitedText}</span>`;
  } else {
    const validityLine = formatTemplate(validityUntilTemplate, { DATE: expiryStrShort });
    validityText = validityLine || `<strong>${expiryStrShort}</strong>`;
  }

  // Dokumentum megőrzés (Archiválási csomag – Pro státuszkártya stílusban)
  const retentionLabel = t('subscriptionRetentionLabel', 'Dokumentumok megőrzése');
  const hasActiveArchival = archEnt
    ? archEnt.hasActiveArchival
    : (typeof window.isArchivalSubscriptionBillingActive === 'function'
      ? window.isArchivalSubscriptionBillingActive(sub)
      : sub.archivalActive === true);
  const inArchivalGracePeriod = archEnt
    ? (archEnt.inPostExpiryStaleGrace || archEnt.inGracePeriod)
    : (typeof window.isArchivalPostExpiryStaleGracePeriod === 'function'
      ? window.isArchivalPostExpiryStaleGracePeriod(sub)
      : false);
  const archivalDisplay =
    typeof resolveArchivalSubscriptionDisplayState === 'function'
      ? resolveArchivalSubscriptionDisplayState(sub)
      : {
          uiState: hasActiveArchival ? 'active' : 'inactive',
          subscriptionEnd: null,
          staleDocumentGraceUntil: null,
        };
  logSubscriptionUiStatusDiagnostics(sub, proEnt, archEnt, archivalDisplay);
  let archivalPriceDisplay = '';
  let archivalPriceResolved = { isFallback: false };
  if (!hasActiveArchival) {
    archivalPriceResolved = resolveArchivalPriceForUi(countryCodeForPricing, perMonthSuffix);
    archivalPriceDisplay = archivalPriceResolved.formatted || '';
    if (typeof window.gurigoPriceTrace === 'function') {
      window.gurigoPriceTrace('renderSubscriptionInfo_dom_archival', {
        productType: 'archival',
        productId: 'com.gurigo.archive.monthly',
        environment: nativeIosShell ? 'native_ios_apple_iap' : 'web_stripe',
        source: archivalPriceResolved.traceSource || archivalPriceResolved.source || 'unknown',
        inputCountryCode: countryCodeForPricing,
        storeKitDisplayPrice: archivalPriceResolved.displayPrice || null,
        finalPriceText: archivalPriceDisplay,
        isFallback: !!archivalPriceResolved.isFallback,
        functionName: 'renderSubscriptionInfo'
      });
    }
  }
  const archivalPriceFallbackClass = archivalPriceResolved.isFallback
    ? 'text-gray-500 dark:text-gray-400 italic'
    : 'text-indigo-600 dark:text-indigo-400';
  const archivalRetentionSectionHtml = buildArchivalRetentionSectionHtml({
    t,
    retentionLabel,
    hasActiveArchival,
    inArchivalGracePeriod,
    archivalDisplay,
    formatDateForLocaleFn: formatDateForLocale,
    paymentsAllowed,
    archivalPriceDisplay,
    archivalPriceDisplayClass: archivalPriceFallbackClass,
    useAppleIapManage: shouldManageArchivalViaAppleIap(sub),
  });

  // Gombok tier alapján
  let buttonsHtml = '';
  if (tier === 'free') {
    buttonsHtml = `
      ${paymentsAllowed
        ? `<button type="button" data-gurigo-iap-role="pro-purchase" onclick="handleSubscriptionAction('upgrade_pro')" class="w-full py-3 btn-primary font-semibold transition text-base">${upgradeCta}</button>`
        : `<button disabled class="w-full py-3 btn-primary font-semibold transition text-base opacity-60 cursor-not-allowed">${upgradeCta}</button>`
      }
    `;
  } else if (tier === 'pro' && isLifetimeProValidity) {
    buttonsHtml = '';
  } else if (tier === 'pro' && proEnt && proEnt.isAdminGiftPro && !proEnt.hasRealSubscription) {
    const giftAllAccessTitle = formatTemplate(
      t('subscriptionAdminGiftAllAccessTitle', '🎁 %PLAN% – gift Pro access'),
      { PLAN: tierName },
    );
    const giftAllAccessBody = t(
      'subscriptionAdminGiftAllAccessBody',
      'Pro features are available. A new subscription is not needed right now.',
    );
    buttonsHtml = `
      <div class="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center">
        <p class="text-purple-700 dark:text-purple-300 font-semibold mb-2">
          ${giftAllAccessTitle}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${giftAllAccessBody}
        </p>
      </div>
    `;
  } else if (tier === 'pro') {
    const proMgmt = getProManagementModeForUi(sub);
    const updateCardLabel = t('subscriptionUpdateCardLabel', '💳 Előfizetések és bankkártya kezelése');
    const updateCardDisabledLabel = t('subscriptionUpdateCardDisabledLabel', 'Előfizetések és kártya kezelése a Stripe vásárlás után érhető el.');
    const showStripePortal = proMgmt.mode === 'stripe_manage';
    const hasStripePortalAccess = showStripePortal && (
      typeof window.hasActiveStripeProSubscription === 'function'
        ? window.hasActiveStripeProSubscription(sub)
        : !!(sub.stripeSubscriptionId && sub.stripeCustomerId)
    );

    let updateCardButton = '';
    if (showStripePortal) {
      updateCardButton = `
      <button id="${MANAGE_STRIPE_SUBSCRIPTION_BTN_ID}" ${hasStripePortalAccess ? '' : 'disabled'} onclick="handleUpdatePaymentMethod()" class="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition ${hasStripePortalAccess ? '' : 'opacity-60 cursor-not-allowed'}">
        ${updateCardLabel}
      </button>
      ${hasStripePortalAccess ? '' : `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${updateCardDisabledLabel}</p>`}
    `;
    }

    let manageButtonLabel;
    let manageOnClick = 'handleProProviderManage()';
    if (proMgmt.mode === 'apple_manage') {
      manageButtonLabel = t('subscriptionArchivalManageAppStoreButton', 'Előfizetés kezelése az App Store-ban');
    } else if (proMgmt.mode === 'apple_info_web') {
      manageButtonLabel = t('subscriptionManageAppleOnWebTitle', 'Apple előfizetés kezelése');
    } else if (proMgmt.mode === 'stripe_info_ios') {
      manageButtonLabel = t('subscriptionManageStripeOnIosTitle', 'Webes előfizetés kezelése');
    } else if (proMgmt.mode === 'stripe_manage') {
      manageButtonLabel = t('subscriptionDowngradeButtonLabel', 'Visszaváltás Free csomagra');
      manageOnClick = "handleSubscriptionAction('downgrade_free')";
    } else {
      manageButtonLabel = t('subscriptionArchivalManageInfoButton', 'Előfizetés kezelése');
      manageOnClick = 'handleProProviderManage()';
    }

    const manageBtnClass =
      proMgmt.mode === 'apple_manage' || proMgmt.mode === 'apple_info_web' || proMgmt.mode === 'stripe_info_ios'
        ? 'w-full py-2 border border-indigo-300 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-200 rounded-lg font-medium transition'
        : 'w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg font-medium transition';

    if (isDowngradePending && proMgmt.mode === 'stripe_manage') {
      const resumeLabel = t('subscriptionResumeButtonLabel', '⭐ Újra előfizetek Pro-ra');
      buttonsHtml = `
        <div class="mb-2">
          ${updateCardButton}
        </div>
        <button type="button" id="${RESUME_PRO_SUBSCRIPTION_BTN_ID}" onclick="handleResumeSubscription()" class="w-full py-3 btn-primary font-semibold transition text-base">
          <span class="resume-btn-label">${resumeLabel}</span>
        </button>
      `;
    } else if (proMgmt.mode === 'trial_info') {
      const downgradeButtonLabel = t('subscriptionDowngradeButtonLabel', 'Visszaváltás Free csomagra');
      buttonsHtml = `
        <button type="button" id="${CANCEL_PRO_SUBSCRIPTION_BTN_ID}" onclick="handleSubscriptionAction('downgrade_free')" class="w-full py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg font-medium transition">
          <span class="cancel-btn-label">${downgradeButtonLabel}</span>
        </button>
      `;
    } else if (proMgmt.mode !== 'none') {
      const isCancelDowngradeBtn = manageOnClick === "handleSubscriptionAction('downgrade_free')";
      buttonsHtml = `
        ${updateCardButton ? `<div class="mb-2">${updateCardButton}</div>` : ''}
        <button type="button"${isCancelDowngradeBtn ? ` id="${CANCEL_PRO_SUBSCRIPTION_BTN_ID}"` : ''} onclick="${manageOnClick}" class="${manageBtnClass}">
          ${isCancelDowngradeBtn ? `<span class="cancel-btn-label">${manageButtonLabel}</span>` : manageButtonLabel}
        </button>
      `;
    }

    const proCancelPendingNoNewPurchase =
      (cancelAtPeriodEnd || isDowngradePending) &&
      !(isDowngradePending && proMgmt.mode === 'stripe_manage');
    if (proCancelPendingNoNewPurchase) {
      buttonsHtml = (buttonsHtml || '') + buildCancelPendingNoNewPurchaseInfoHtml(t, { product: 'pro', sub: sub });
    }
  } else if (tier === 'tester') {
    const testerAllAccessTitle = formatTemplate(
      t('subscriptionTesterAllAccessTitle', '🧪 %PLAN% – minden funkció elérhető'),
      { PLAN: tierName }
    );
    const testerAllAccessBody = t('subscriptionTesterAllAccessBody', 'Tesztelői hozzáférésed korlátlan érvényű.');
    buttonsHtml = `
      <div class="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center">
        <p class="text-purple-700 dark:text-purple-300 font-semibold mb-2">
          ${testerAllAccessTitle}
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          ${testerAllAccessBody}
        </p>
      </div>
    `;
  }

  // HTML összeállítás
  container.innerHTML = `
    <div class="space-y-3">
      ${promoBanner}
      ${statusHtml}
      ${trialStatusHtml}
      ${downgradePromoHtml}
      <!-- Csomag info -->
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <span class="text-sm text-gray-600 dark:text-gray-400">${currentPlanLabel}</span>
        <span class="font-bold text-lg">${effectiveTierName}</span>
      </div>

      <!-- Érvényesség -->
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <span class="text-sm text-gray-600 dark:text-gray-400">${validityLabel}</span>
        <span class="text-sm">${validityText}</span>
      </div>

      ${typeof window.buildBillingCycleDayCardHtml === 'function' ? window.buildBillingCycleDayCardHtml(sub, t) : ''}

      <!-- Előfizetés gombok -->
      <div class="space-y-2 pt-2">
        ${plansHtml}
        ${trialUpsellHtml}
        ${buttonsHtml}
        ${nativeIosShell
          ? `<div class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
              <button type="button" data-gurigo-iap-role="restore" onclick="handleNativeIosRestorePurchases()" class="w-full py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg text-sm font-medium transition">${t('subscriptionRestorePurchasesButton', 'App Store vásárlások visszaállítása')}</button>
              <p class="text-xs text-gray-500 dark:text-gray-400 m-0 leading-relaxed">${t('subscriptionRestorePurchasesHint', 'Ha korábban az App Store-on keresztül fizettél elő, itt tudod újraszinkronizálni a vásárlást.')}</p>
              ${buildNativeIosStoreKitPriceDisclaimerHtml(t)}
              ${buildNativeIosSubscriptionLegalFooterHtml(t)}
            </div>`
          : ''}
        ${tier === 'free' && !nativeIosShell ? paymentsInfoHtml : ''}
      </div>

      <!-- Dokumentumok megőrzése -->
      ${archivalRetentionSectionHtml}
    </div>
  `;
}

async function handleTrialUpsellSnooze() {
  try {
    if (!window.currentUser || !window.currentUser.uid) return;
    const until = new Date();
    until.setDate(until.getDate() + 3);
    const ref = firebase.firestore().collection('users').doc(window.currentUser.uid).collection('settings').doc('subscription');
    await ref.set({
      trialUpsellSnoozeUntil: firebase.firestore.Timestamp.fromDate(until),
      trialUpsellLastShownAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'trial_upsell_snooze'
    }, { merge: true });
    if (window.currentUserSubscription) {
      window.currentUserSubscription.trialUpsellSnoozeUntil = until;
      window.currentUserSubscription.trialUpsellLastShownAt = new Date();
    }
    if (typeof renderSubscriptionInfo === 'function') renderSubscriptionInfo();
  } catch (e) {
    console.warn('Trial snooze failed:', e);
  }
}

function navigateToBillingInfoSection() {
  try {
    if (typeof window.showTab === 'function') {
      window.showTab('subscription');
    }
    setTimeout(() => {
      const billingSection = document.getElementById('billing-info-section');
      if (billingSection) {
        billingSection.classList.remove('hidden');
        try { billingSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {}
        const firstEditableField = billingSection.querySelector('input:not([disabled]), select, textarea');
        if (firstEditableField) {
          try { firstEditableField.focus({ preventScroll: true }); } catch (_) { try { firstEditableField.focus(); } catch (_) {} }
        }
      }
    }, 200);
  } catch (error) {
    try { console.warn('[Subscription] Failed to navigate to billing section:', error); } catch (_) {}
  }
}

async function handleTrialUpsellOptOut() {
  try {
    if (!window.currentUser || !window.currentUser.uid) return;
    const ref = firebase.firestore().collection('users').doc(window.currentUser.uid).collection('settings').doc('subscription');
    await ref.set({
      trialUpsellOptOut: true,
      trialUpsellLastShownAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'trial_upsell_opt_out'
    }, { merge: true });
    if (window.currentUserSubscription) {
      window.currentUserSubscription.trialUpsellOptOut = true;
      window.currentUserSubscription.trialUpsellLastShownAt = new Date();
    }
    if (typeof renderSubscriptionInfo === 'function') renderSubscriptionInfo();
  } catch (e) {
    console.warn('Trial opt-out failed:', e);
  }
}

async function checkAndShowTrialUpsellPrompt() {
  try {
    if (isNativeIosAppShellForSubscription()) return;
    if (!window.currentUser || !window.currentUser.uid) return;
    const sub = window.currentUserSubscription || {};
    const tier = sub.tier || 'free';
    if (tier !== 'free') return;

    const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
    const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
    const t = (key, fallback) => { const v = getI18nValue(i18n, key); return (v != null && v !== '') ? v : fallback; };
    const upgradeCta = t('subscriptionUpgradeCta', '⭐ Pro csomagra váltok');
    const snoozeButtonLabel = t('subscriptionTrialSnoozeButton', '⏰ 3 nap múlva');
    const optOutButtonLabel = t('subscriptionTrialOptOutButton', 'Ne kérdezd többet');
    const stayButtonLabel = t('subscriptionTrialStayButton', 'Maradjon így');

    const toDate = (v) => {
      try {
        if (!v) return null;
        if (v instanceof Date) return v;
        return new Date(v);
      } catch (_) {
        return null;
      }
    };

    const now = new Date();
    const trialStartedAt = toDate(sub.trialStartedAt);
    const trialEnd = toDate(sub.trialEnd);
    if (!trialStartedAt || !trialEnd) return;
    if (trialEnd <= now) return;

    if (now < new Date(trialStartedAt.getTime() + 21 * 24 * 60 * 60 * 1000)) return;

    if (sub.trialUpsellOptOut === true) return;

    const snoozeUntil = toDate(sub.trialUpsellSnoozeUntil);
    if (snoozeUntil && snoozeUntil > now) return;

    const lastShownAt = toDate(sub.trialUpsellLastShownAt);
    if (lastShownAt && (now - lastShownAt) < (3 * 24 * 60 * 60 * 1000)) return;

    const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
    const endStr = formatDateForLocale(trialEnd);

    const ref = firebase.firestore().collection('users').doc(window.currentUser.uid).collection('settings').doc('subscription');
    await ref.set({
      trialUpsellLastShownAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: 'trial_upsell_prompt'
    }, { merge: true });
    if (window.currentUserSubscription) {
      window.currentUserSubscription.trialUpsellLastShownAt = now;
    }

    const trialPromptMessage = formatTemplate(
      t('subscriptionTrialPromptMessage', '⭐ Tetszik a Pro?\n\nA Pro próbád még %DAYS% napig tart (eddig: %DATE%).\n\nHa szeretnéd, már most beállíthatod az előfizetést. A próbaidőd nem rövidül.'),
      { DAYS: daysLeft, DATE: endStr || '-' }
    );
    const trialPromptOptOutQuestion = t('subscriptionTrialPromptOptOutQuestion', 'Szeretnéd, hogy ne kérdezzük többet a próba alatt?');

    if (typeof showCustomAlert === 'function') {
      showCustomAlert(trialPromptMessage, 'warning', async function () {
        await handleSubscriptionAction('upgrade_pro');
      }, {
        confirmText: upgradeCta,
        confirmClass: 'bg-indigo-600 hover:bg-indigo-700',
        cancelText: snoozeButtonLabel,
        cancelClass: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        cancelCallback: async function () {
          await handleTrialUpsellSnooze();
          try {
            if (typeof showCustomAlert === 'function') {
              showCustomAlert(trialPromptOptOutQuestion, 'warning', async function () {
                await handleTrialUpsellOptOut();
              }, {
                confirmText: optOutButtonLabel,
                confirmClass: 'bg-gray-700 hover:bg-gray-800',
                cancelText: stayButtonLabel,
                cancelClass: 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              });
            }
          } catch (_) {}
        }
      });
    } else {
      alert(trialPromptMessage);
    }
  } catch (e) {
    console.warn('Trial upsell prompt failed:', e);
  }
}

// === ELŐFIZETÉS FOLYTATÁSA (RESUME) - külön endpoint ===
// Ha a user lemondta az előfizetést, de még aktív a periódus, ezzel visszavonhatja
async function handleResumeSubscription() {
  console.log('[Subscription] Resume subscription requested');

  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  const t = (key, fallback) => { const v = getI18nValue(i18n, key); return (v != null && v !== '') ? v : fallback; };

  if (!window.currentUser || !window.currentUser.uid) {
    if (typeof showCustomAlert === 'function') {
      const msg = i18n.subscriptionLoginRequired || 'Előfizetéshez be kell jelentkezned.';
      showCustomAlert(msg, 'info');
    }
    return;
  }

  if (window.AccountDeletionGuards && typeof window.AccountDeletionGuards.assertCanPurchaseOrResumeSubscription === 'function') {
    try {
      const guard = await window.AccountDeletionGuards.assertCanPurchaseOrResumeSubscription();
      if (!guard.ok) {
        window.AccountDeletionGuards.showPendingDeletionBlocksPurchaseModal();
        return;
      }
    } catch (gErr) {
      console.warn('[Subscription] AccountDeletionGuards resume', gErr);
    }
  }

  const resumeBtn = getResumeProSubscriptionButton();
  if (resumeBtn && resumeBtn.disabled && resumeBtn.getAttribute('aria-busy') === 'true') {
    return;
  }

  setResumeSubscriptionButtonLoading(true, t);
  if (typeof showSubscriptionProcessingOverlay === 'function') {
    showSubscriptionProcessingOverlay(t('subscriptionResumeLoading', 'Újraaktiválás folyamatban…'));
  }
  try {
    // Firebase ID token lekérése
    const idToken = await window.currentUser.getIdToken();
    
    const RESUME_URL = (window.BILLING_CONFIG && window.BILLING_CONFIG.cloudFunctions)
      ? window.BILLING_CONFIG.cloudFunctions.resumeSubscription
      : 'https://europe-west3-munkaido-3cc44.cloudfunctions.net/resumeSubscription';

    console.log('[Subscription] Calling resumeSubscription endpoint');

    const response = await fetch(RESUME_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        uid: window.currentUser.uid,
        testMode: getStripeBillingRequestTestMode(),
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[Subscription] Resume failed:', data);

      if (response.status === 403 && data && (data.code === 'ACCOUNT_DELETION_PENDING' || data.error === 'ACCOUNT_DELETION_PENDING') && window.AccountDeletionGuards) {
        window.AccountDeletionGuards.showPendingDeletionBlocksPurchaseModal();
        return;
      }

      const resumeKind = getResumeErrorKind(data);
      if (resumeKind === 'not_resumable') {
        console.log('[Subscription] No resumable subscription, falling back to checkout');
        setResumeSubscriptionButtonLoading(false, t);
        return handleSubscriptionAction('upgrade_pro');
      }
      showSubscriptionResumeError(resumeKind);
      return;
    }

    console.log('[Subscription] Resume successful:', data);

    try {
      if (typeof loadUserSubscription === 'function') {
        await loadUserSubscription(window.currentUser.uid, { forceRefresh: true });
      }
    } catch (_) {}

    try {
      if (typeof renderSubscriptionInfo === 'function') renderSubscriptionInfo();
    } catch (_) {}

    showSubscriptionResumeSuccess();

  } catch (error) {
    console.error('[Subscription] Resume error:', error);
    showSubscriptionResumeError('generic');
  } finally {
    if (typeof hideSubscriptionProcessingOverlay === 'function') {
      hideSubscriptionProcessingOverlay();
    }
    setResumeSubscriptionButtonLoading(false, t);
  }
}
window.handleResumeSubscription = handleResumeSubscription;

async function handleResumeArchivalSubscription() {
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  const t = (key, fallback) => {
    const v = getI18nValue(i18n, key);
    return (v != null && v !== '') ? v : fallback;
  };

  if (!window.currentUser || !window.currentUser.uid) {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(t('subscriptionArchivalLoginRequired', 'Kérjük, jelentkezz be!'), 'info');
    }
    return;
  }

  if (window.AccountDeletionGuards && typeof window.AccountDeletionGuards.assertCanPurchaseOrResumeSubscription === 'function') {
    try {
      const guard = await window.AccountDeletionGuards.assertCanPurchaseOrResumeSubscription();
      if (!guard.ok) {
        window.AccountDeletionGuards.showPendingDeletionBlocksPurchaseModal();
        return;
      }
    } catch (gErr) {
      console.warn('[Subscription] AccountDeletionGuards archival resume', gErr);
    }
  }

  const resumeBtn = getResumeArchivalSubscriptionButton();
  if (resumeBtn && resumeBtn.disabled && resumeBtn.getAttribute('aria-busy') === 'true') {
    return;
  }

  setResumeArchivalSubscriptionButtonLoading(true, t);
  if (typeof showSubscriptionProcessingOverlay === 'function') {
    showSubscriptionProcessingOverlay(t('subscriptionArchivalResumeLoading', 'Újraaktiválás folyamatban…'));
  }
  try {
    const idToken = await window.currentUser.getIdToken();
    const RESUME_URL = (window.BILLING_CONFIG && window.BILLING_CONFIG.cloudFunctions)
      ? window.BILLING_CONFIG.cloudFunctions.resumeArchivalSubscription
      : (console.warn('[Subscription] BILLING_CONFIG missing, using fallback URL'), 'https://europe-west1-munkaido-3cc44.cloudfunctions.net/resumeArchivalSubscription');

    const response = await fetch(RESUME_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + idToken,
      },
      body: JSON.stringify({
        uid: window.currentUser.uid,
        testMode: getStripeBillingRequestTestMode(),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 403 && data && (data.code === 'ACCOUNT_DELETION_PENDING' || data.error === 'ACCOUNT_DELETION_PENDING') && window.AccountDeletionGuards) {
        window.AccountDeletionGuards.showPendingDeletionBlocksPurchaseModal();
        return;
      }
      const resumeKind = getResumeErrorKind(data);
      showSubscriptionArchivalResumeError(resumeKind);
      return;
    }

    try {
      if (typeof loadUserSubscription === 'function') {
        await loadUserSubscription(window.currentUser.uid, { forceRefresh: true });
      }
    } catch (_) {}
    try {
      if (typeof renderSubscriptionInfo === 'function') renderSubscriptionInfo();
    } catch (_) {}

    showSubscriptionArchivalResumeSuccess();
  } catch (error) {
    console.error('[Subscription] Archival resume error:', error);
    showSubscriptionArchivalResumeError('generic');
  } finally {
    if (typeof hideSubscriptionProcessingOverlay === 'function') {
      hideSubscriptionProcessingOverlay();
    }
    setResumeArchivalSubscriptionButtonLoading(false, t);
  }
}
window.handleResumeArchivalSubscription = handleResumeArchivalSubscription;

// === PROMO CHECKOUT STARTER ===
window.startPromoCheckout = async function() {
  if (!canShowEarlyBirdOfferForUi()) {
    console.log('[Promo] Early bird checkout blocked (native iOS / Apple IAP context)');
    if (typeof window.purgeEarlyBirdUiArtifacts === 'function') {
      window.purgeEarlyBirdUiArtifacts();
    }
    return;
  }

  console.log('[Promo] Starting promo checkout...');
  
  // Trigger the same subscription action as the upgrade button
  if (typeof handleSubscriptionAction === 'function') {
    await handleSubscriptionAction('upgrade', { tier: 'pro' });
  } else {
    console.error('[Promo] handleSubscriptionAction not available');
  }
};

// === ELŐFIZETÉS AKCIÓ KEZELŐ (3. fázis: Stripe Checkout integráció) ===
async function handleSubscriptionAction(action, options = {}) {
  console.log('[Subscription] Action:', action);

  if (action === 'upgrade' && !canShowEarlyBirdOfferForUi()) {
    console.log('[Subscription] Stripe early bird upgrade alias blocked on native iOS');
    if (typeof window.purgeEarlyBirdUiArtifacts === 'function') {
      window.purgeEarlyBirdUiArtifacts();
    }
    return;
  }

  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  const t = (key, fallback) => { const v = getI18nValue(i18n, key); return (v != null && v !== '') ? v : fallback; };

  // Tier mapping
  const tierMap = {
    upgrade_pro: 'pro',
    upgrade: 'pro', // Alias for promo checkout
    downgrade_free: null // Lemondás (később implementálva)
  };

  const tier = options.tier || tierMap[action];

  // Lemondás kezelése
  if (action === 'downgrade_free') {
    try {
      if (!window.currentUser || !window.currentUser.uid) {
        if (typeof showCustomAlert === 'function') {
          const msg = t('subscriptionLoginRequired', 'Előfizetéshez be kell jelentkezned.');
          showCustomAlert(msg, 'info');
        }
        return;
      }

      const sub = window.currentUserSubscription || {};
      const proMgmt = getProManagementModeForUi(sub);

      if (hasActiveStripeProForDowngrade(sub)) {
        // Stripe cancel flow (alább)
      } else if (proMgmt.mode === 'apple_manage' || hasActiveAppleProForDowngrade(sub)) {
        openNativeIosManageSubscriptions('pro', 'subscription_pro_cancel', i18n);
        return;
      } else if (proMgmt.mode === 'apple_info_web' || proMgmt.mode === 'stripe_info_ios') {
        showSubscriptionProviderInfo('pro', proMgmt.mode, i18n);
        return;
      } else if (isGenuineTrialActiveForDowngrade(sub)) {
        const trialInfoMsg = i18n.subscriptionTrialCancelInfo ||
          'ℹ️ Próbaidő alatt vagy<br/><br/>' +
          'A próbaidő automatikusan lejár, nincs szükség lemondásra. Nem történik terhelés, és a próbaidő végén automatikusan Free csomagra váltasz.<br/><br/>' +
          'Ha mégis azonnal Free csomagra szeretnél váltani, kérlek írj nekünk: <a href="mailto:info@gurigo.eu" class="text-blue-600 hover:text-blue-800 underline">info@gurigo.eu</a>';

        if (typeof showCustomAlert === 'function') {
          showCustomAlert(trialInfoMsg, 'info', null, { allowHTML: true });
        } else {
          alert(trialInfoMsg.replace(/<br\/>/g, '\n').replace(/<[^>]*>/g, ''));
        }
        return;
      } else {
        const noPaidMsg = t(
          'subscriptionDowngradeNoPaidBody',
          'Nincs aktív fizetős előfizetés, amit le lehetne mondani. Ha kérdésed van, írj: info@gurigo.eu',
        );
        if (typeof showCustomAlert === 'function') {
          showCustomAlert(noPaidMsg, 'info');
        } else {
          alert(noPaidMsg);
        }
        return;
      }

      // Valós Stripe előfizetés lemondása – lemondási ok modal ad megerősítést,
      // nincs külön második "Biztosan?" ablak.
      if (typeof showSubscriptionCancelReasonModal === 'function') {
        const feedback = await showSubscriptionCancelReasonModal();
        if (!feedback) return;

        try {
          if (typeof saveSubscriptionCancellationFeedback === 'function') {
            const saved = await saveSubscriptionCancellationFeedback({
              reasonKey: feedback.reasonKey,
              reasonLabel: feedback.reasonLabel,
              comment: feedback.comment,
              subscriptionType: 'pro',
              platform: 'stripe',
            });
            if (!saved) {
              console.warn('[Subscription] Cancellation feedback could not be saved');
            }
          }

          await performCancelTierSubscription();
        } finally {
          if (typeof closeSubscriptionCancelReasonModal === 'function') {
            closeSubscriptionCancelReasonModal();
          }
        }
      } else {
        // Fallback (ok modal nem elérhető): régi megerősítő ablak
        const confirmText = i18n.subscriptionCancelConfirm || 'Biztosan lemondod az előfizetést?\n\nA már kifizetett időszak végéig használhatod a Pro csomagot, utána automatikusan Free-re vált.';
        if (typeof showCustomAlert === 'function') {
          showCustomAlert(confirmText, 'warning', async function () {
            await performCancelTierSubscription();
          }, {
            confirmText: i18n.subscriptionCancelConfirmButton || 'Lemondás',
            confirmClass: 'bg-red-500 hover:bg-red-600'
          });
        } else {
          const ok = window.confirm(confirmText);
          if (!ok) return;
          await performCancelTierSubscription();
        }
      }

      async function performCancelTierSubscription() {
        const cancelBtn = getCancelProSubscriptionButton();
        if (cancelBtn && cancelBtn.disabled && cancelBtn.getAttribute('aria-busy') === 'true') {
          return;
        }

        setCancelSubscriptionButtonLoading(true, t);
        try {
          const CLOUD_FUNCTION_URL = (window.BILLING_CONFIG && window.BILLING_CONFIG.cloudFunctions)
            ? window.BILLING_CONFIG.cloudFunctions.cancelSubscription
            : (console.warn('[Subscription] BILLING_CONFIG missing, using fallback URL'), 'https://europe-west3-munkaido-3cc44.cloudfunctions.net/cancelSubscription');
          const token = await firebase.auth().currentUser.getIdToken();

          const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
              uid: window.currentUser.uid,
              testMode: !!(window.BILLING_CONFIG && window.BILLING_CONFIG.testMode),
            })
          });

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            const errCode = data.error || '';
            const errMsg = data.message || data.error || 'Lemondás sikertelen';
            if (errCode === 'STRIPE_SUBSCRIPTION_NOT_FOUND' || response.status === 404) {
              throw new Error(
                t(
                  'subscriptionCancelFailedBody',
                  'Nem sikerült lemondani az előfizetést. Kérlek próbáld újra később, vagy írj nekünk: info@gurigo.eu'
                )
              );
            }
            throw new Error(errMsg);
          }

          if (data.immediateDowngrade === true) {
            throw new Error(
              t(
                'subscriptionCancelFailedBody',
                'Nem sikerült lemondani az előfizetést. Kérlek próbáld újra később, vagy írj nekünk: info@gurigo.eu'
              )
            );
          }
          let periodEndText = '';
          try {
            if (data && data.currentPeriodEnd) {
              const dt = new Date(Number(data.currentPeriodEnd) * 1000);
              if (!isNaN(dt.getTime())) {
                periodEndText = dt.toLocaleDateString((typeof getActiveLocale === 'function') ? getActiveLocale() : 'hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' });
              }
            }
          } catch (_) {}

          try {
            if (typeof loadUserSubscription === 'function') {
              await loadUserSubscription(window.currentUser.uid, { forceRefresh: true });
            }
          } catch (_) {}
          try {
            if (typeof renderSubscriptionInfo === 'function') renderSubscriptionInfo();
          } catch (_) {}

          if (typeof showCustomAlert === 'function') {
            const msg = periodEndText
              ? ((i18n.subscriptionCancelSuccessWithDateTemplate || '✅ Előfizetés lemondva. A Pro csomag eddig aktív: %DATE%').replace('%DATE%', periodEndText))
              : (i18n.subscriptionCancelSuccess || '✅ Előfizetés lemondva. A Pro csomag a kifizetett időszak végéig aktív marad.');
            showCustomAlert(msg, 'success');
          } else {
            alert(periodEndText
              ? ('Előfizetés lemondva. A Pro csomag eddig aktív: ' + periodEndText)
              : 'Előfizetés lemondva. A Pro csomag a kifizetett időszak végéig aktív marad.'
            );
          }
        } catch (err) {
          console.error('[Subscription] Cancel error:', err);
          const title = t(
            'subscriptionCancelErrorTitle',
            i18n.subscriptionCancelErrorTitle || 'Nem sikerült lemondani az előfizetést'
          );
          const message = (err && err.message)
            ? err.message
            : t(
              'subscriptionCancelFailedBody',
              'Nem sikerült lemondani az előfizetést. Kérlek próbáld újra később, vagy írj nekünk: info@gurigo.eu'
            );
          if (typeof showSubscriptionTitleBodyAlert === 'function') {
            showSubscriptionTitleBodyAlert(title, message, 'error', null, {
              okText: t('commonOk', t('ok', 'Rendben')),
            });
          } else if (typeof showCustomAlert === 'function') {
            showCustomAlert(message, 'error');
          } else {
            alert((i18n.subscriptionCheckoutErrorAlertPrefix || 'Hiba: ') + message);
          }
        } finally {
          setCancelSubscriptionButtonLoading(false, t);
        }
      }
    } catch (err) {
      console.error('[Subscription] Cancel flow error:', err);
    }
    return;
  }

  // Upgrade/checkout folyamat
  if (!tier) {
    console.warn('[Subscription] Unknown action:', action);
    return;
  }

  // Bejelentkezés ellenőrzése
  if (!window.currentUser || !window.currentUser.uid) {
    if (typeof showCustomAlert === 'function') {
      const msg = t('subscriptionLoginRequired', 'Előfizetéshez be kell jelentkezned.');
      showCustomAlert(msg, 'info');
    }
    return;
  }

  if (window.AccountDeletionGuards && typeof window.AccountDeletionGuards.assertCanPurchaseOrResumeSubscription === 'function') {
    try {
      const guard = await window.AccountDeletionGuards.assertCanPurchaseOrResumeSubscription();
      if (!guard.ok) {
        window.AccountDeletionGuards.showPendingDeletionBlocksPurchaseModal();
        return;
      }
    } catch (gErr) {
      console.warn('[Subscription] AccountDeletionGuards checkout', gErr);
    }
  }

  // Aktív előfizetés ellenőrzése - ne lehessen dupla előfizetést indítani
  if (action === 'upgrade_pro') {
    const sub = window.currentUserSubscription || {};
    const checkoutGuards = (typeof window.getSubscriptionCheckoutGuards === 'function')
      ? window.getSubscriptionCheckoutGuards(sub)
      : null;

    if (checkoutGuards && checkoutGuards.blockAppleIapProPurchase) {
      const msg = checkoutGuards.adminGiftLifetime
        ? t('subscriptionAdminGiftLifetimeIapBlock', 'You have Lifetime Pro access, so a Pro subscription cannot be started.')
        : t('subscriptionAdminGiftDurationIapBlock', 'Gift Pro is currently active. Starting an Apple subscription is not needed now. After your gift Pro expires, you can subscribe again if you wish.');
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(msg, 'info');
      } else {
        alert(msg);
      }
      return;
    }

    if (checkoutGuards && checkoutGuards.blockStripeProCheckoutLifetimeGift) {
      const msg = t('subscriptionAdminGiftLifetimeStripeBlock', 'You have Lifetime Pro access, so a Pro subscription cannot be started.');
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(msg, 'info');
      } else {
        alert(msg);
      }
      return;
    }

    const currentTier = sub.tier || 'free';
    const hasActiveSubscription = checkoutGuards
      ? checkoutGuards.blockDuplicateProCheckout
      : (sub.stripeSubscriptionId && !sub.cancelAtPeriodEnd);
    
    if (currentTier === 'pro' && hasActiveSubscription) {
      const msg = t(
        'subscriptionAlreadyActive',
        '✅ You already have an active Pro subscription!\n\nNo need to start a new subscription.'
      );
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(msg, 'info');
      } else {
        alert(msg);
      }
      console.log('[Subscription] Blocked duplicate Pro subscription attempt');
      return;
    }
  }

  if (tier === 'pro' && isStripeCheckoutBlockedOnNativeIos('pro')) {
    handleNativeIosIapPreparationFlow('pro', t);
    return;
  }

  // BILLINGO CHECK: Számlázási adatok ellenőrzése
  if (typeof window.checkBillingInfoBeforePurchase === 'function') {
    const billingCheck = await window.checkBillingInfoBeforePurchase();
    
    if (!billingCheck.hasInfo) {
      const details = (billingCheck && billingCheck.message) ? billingCheck.message : '';
      const template = i18n.subscriptionBillingMissingTemplate || '⚠️ Számlázási adatok hiányoznak\n\n{details}\n\nKérjük töltsd ki a Beállítások > Számlázási adatok menüpontban!';
      const fallbackTemplate = i18n.subscriptionBillingMissingAlertTemplate || '⚠️ Számlázási adatok hiányoznak!\n\n{details}\n\nKérjük töltsd ki a Beállítások menüben!';
      const msg = (template || fallbackTemplate).replace('{details}', details);
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(msg, 'warning', navigateToBillingInfoSection);
      } else {
        alert(msg);
        navigateToBillingInfoSection();
      }
      
      // NE folytassa a vásárlást - MEGÁLLÍTÁS!
      return;
    }
  }

  try {
    // Cloud Function URL - környezet alapján (BILLING_CONFIG)
    const CLOUD_FUNCTION_URL = (window.BILLING_CONFIG && window.BILLING_CONFIG.cloudFunctions)
      ? window.BILLING_CONFIG.cloudFunctions.createCheckoutSession
      : (console.warn('[Subscription] BILLING_CONFIG missing, using fallback URL'), 'https://europe-west3-munkaido-3cc44.cloudfunctions.net/createCheckoutSession');

    // UTM tracking metadata
    let trackingMetadata = {};
    if (typeof window.utmTracker !== 'undefined' && typeof window.utmTracker.flattenTrackingForStripe === 'function') {
      trackingMetadata = window.utmTracker.flattenTrackingForStripe();
      console.log('[Subscription] Adding UTM tracking metadata to checkout:', trackingMetadata);
    }

    // Checkout Session létrehozása (testMode = backend TEST Stripe kulcsok, /beta vagy ?beta=1)
    // Locale: a frontend aktuális nyelve alapján (hu / de / en → Stripe Checkout nyelve)
    const stripeLocale = resolveStripeCheckoutLocale(currentLang);

    clearStripeCheckoutClientState();

    const subscriptionPayload = {
      tier: tier,
      uid: window.currentUser.uid,
      userEmail: window.currentUser.email || '',
      countryCode: resolveCheckoutCountryCode(window.currentUserSubscription),
      testMode: !!(window.BILLING_CONFIG && window.BILLING_CONFIG.testMode),
      trackingMetadata: trackingMetadata,
      locale: stripeLocale,
      attemptId: createCheckoutAttemptId(),
    };

    // Globális loading jelzés, amíg a Stripe Checkout session létrejön / oldal betölt
    const loadingMsg = i18n.subscriptionCheckoutLoading || 'Stripe fizetési oldal betöltése…\n\nKérlek várj, ez néhány másodpercet igénybe vehet.';
    showStripeCheckoutLoading(loadingMsg);

    const idToken = await getCheckoutFirebaseIdToken();
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + idToken
      },
      body: JSON.stringify(subscriptionPayload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 403 && errorData.error === 'ACCOUNT_DELETION_PENDING' && window.AccountDeletionGuards) {
        hideStripeCheckoutLoading();
        window.AccountDeletionGuards.showPendingDeletionBlocksPurchaseModal();
        return;
      }
      throw createCheckoutSessionError(errorData, t);
    }

    const data = await response.json();

    // === SUBSCRIPTION RESUME HANDLING ===
    if (data.action === 'resume') {
      console.log('[Subscription] Subscription resumed instead of creating new:', data.subscriptionId);
      
      // Frissítjük a subscription adatokat
      try {
        if (typeof loadUserSubscription === 'function') {
          await loadUserSubscription(window.currentUser.uid, { forceRefresh: true });
        }
      } catch (_) {}

      // UI frissítése
      try {
        if (typeof renderSubscriptionInfo === 'function') renderSubscriptionInfo();
      } catch (_) {}

      // Sikeres resume üzenet
      if (typeof showCustomAlert === 'function') {
        const msg = i18n.subscriptionResumeSuccess || 
          '✅ Előfizetés folytatva!\n\n' +
          'A Pro előfizetésed megszakítás nélkül aktív marad a jelenlegi számlázási időszak végéig.\n\n' +
          'Nem indult új előfizetés, a meglévő folytatódik.';
        showCustomAlert(msg, 'success');
      }
      // Nem irányítunk Stripe-ra, ezért a loading eltüntethető
      hideStripeCheckoutLoading();
      return;
    }

    // === NORMAL CHECKOUT FLOW ===
    if (!data.url) {
      throw new Error(t('subscriptionCheckoutMissingUrl', 'Checkout URL hiányzik a válaszból'));
    }

    console.log('[Subscription] Redirecting to Stripe Checkout:', data.sessionId);

    // Átirányítás Stripe Checkout-ra
    // A redirect átveszi a vezérlést – a loading overlay maradhat, az oldal elhagyása miatt eltűnik
    window.location.href = data.url;

  } catch (error) {
    console.error('[Subscription] Checkout error:', error);
    // Hiba esetén biztosan tüntessük el a loading overlayt
    hideStripeCheckoutLoading();

    showCheckoutSessionErrorAlert(error, t, i18n);
  }
}

// === ARCHIVÁLÁSI DOWNGRADE VISSZAVONÁS (kivezetve) ===
async function handleArchivalDowngradeResume() {
  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
  if (typeof showCustomAlert === 'function') {
    showCustomAlert(i18n.subscriptionArchivalEndedMessage || 'Az archiválási csomagok megszűntek. A dokumentumok az előfizetés ideje alatt + 7 nap türelmi időig megmaradnak.', 'info');
  }
}

// === ARCHIVÁLÁSI ELŐFIZETÉS LEMONDÁS ===
async function handleArchivalCancel() {
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  if (!window.currentUser || !window.currentUser.uid) {
    if (typeof showCustomAlert === 'function') showCustomAlert(i18n.subscriptionArchivalLoginRequired || 'Kérjük, jelentkezz be!', 'info');
    return;
  }
  const sub = window.currentUserSubscription || {};
  const archMgmt = getArchivalManagementModeForUi(sub);
  if (archMgmt.mode === 'apple_manage') {
    openNativeIosManageSubscriptions('archival', 'subscription_archival_cancel', i18n);
    return;
  }
  if (archMgmt.mode === 'apple_info_web' || archMgmt.mode === 'stripe_info_ios') {
    showSubscriptionProviderInfo('archival', archMgmt.mode, i18n);
    return;
  }
  if (archMgmt.mode !== 'stripe_manage') {
    return;
  }

  // A lemondási ok modal adja a megerősítést – nincs külön második "Biztosan?" ablak.
  if (typeof showSubscriptionCancelReasonModal === 'function') {
    const feedback = await showSubscriptionCancelReasonModal();
    if (!feedback) return;

    try {
      if (typeof saveSubscriptionCancellationFeedback === 'function') {
        const saved = await saveSubscriptionCancellationFeedback({
          reasonKey: feedback.reasonKey,
          reasonLabel: feedback.reasonLabel,
          comment: feedback.comment,
          subscriptionType: 'archive',
          platform: 'stripe',
        });
        if (!saved) {
          console.warn('[Subscription] Archival cancellation feedback could not be saved');
        }
      }

      await performArchivalCancel(i18n);
    } finally {
      if (typeof closeSubscriptionCancelReasonModal === 'function') {
        closeSubscriptionCancelReasonModal();
      }
    }
    return;
  }

  // Fallback (ok modal nem elérhető): régi megerősítő ablak
  const confirmTitle = i18n.subscriptionArchivalCancelConfirmTitle || '⚠️ Archiválási csomag lemondása';
  const confirmMsg = i18n.subscriptionArchivalCancelConfirmBody || 'Biztosan lemondod az Archiválási csomagot?\n\nA lemondás után 7 nap türelmi időd lesz, a dokumentumok addig megmaradnak.';
  if (typeof showCustomAlert === 'function') {
    showCustomAlert(confirmTitle + '\n\n' + confirmMsg, 'warning', async () => { await performArchivalCancel(i18n); }, {
      confirmText: i18n.subscriptionArchivalCancelConfirmButton || '🗑️ Lemondás',
      confirmClass: 'bg-red-600 hover:bg-red-700',
      cancelText: i18n.subscriptionArchivalCancelCancelButton || '❌ Mégsem',
      cancelClass: 'bg-gray-500 hover:bg-gray-600 text-white'
    });
  } else {
    if (confirm(confirmTitle + '\n\n' + confirmMsg)) await performArchivalCancel(i18n);
  }
}

// === ARCHIVÁLÁSI LEMONDÁS VÉGREHAJTÁSA (régi előfizetőknek, UI már nem hívja) ===
async function performArchivalCancel(i18n) {
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const t = (key, fallback) => {
    const v = getI18nValue(i18n, key);
    return (v != null && v !== '') ? v : fallback;
  };

  const cancelBtn = getCancelArchivalSubscriptionButton();
  if (cancelBtn && cancelBtn.disabled && cancelBtn.getAttribute('aria-busy') === 'true') {
    return;
  }

  setCancelArchivalSubscriptionButtonLoading(true, t);
  try {
    const CLOUD_FUNCTION_URL = (window.BILLING_CONFIG && window.BILLING_CONFIG.cloudFunctions)
      ? window.BILLING_CONFIG.cloudFunctions.cancelArchivalSubscription
      : (console.warn('[Subscription] BILLING_CONFIG missing, using fallback URL'), 'https://europe-west1-munkaido-3cc44.cloudfunctions.net/cancelArchivalSubscription');
    const token = await firebase.auth().currentUser.getIdToken();

    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        uid: window.currentUser.uid,
        testMode: !!(window.BILLING_CONFIG && window.BILLING_CONFIG.testMode)
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Archiválási előfizetés lemondása sikertelen');
    }

    const data = await response.json();
    console.log('[Archival] Cancel response:', data);

    try {
      if (typeof loadUserSubscription === 'function') {
        await loadUserSubscription(window.currentUser.uid, { forceRefresh: true });
      }
    } catch (_) {}

    if (data && data.currentPeriodEnd && window.currentUserSubscription) {
      try {
        const periodEndDate = new Date(Number(data.currentPeriodEnd) * 1000);
        if (!isNaN(periodEndDate.getTime())) {
          window.currentUserSubscription.archivalExpiry = periodEndDate;
          window.currentUserSubscription.archivalCancelAtPeriodEnd = true;
          window.currentUserSubscription.archivalActive = true;
          window.currentUserSubscription.archivalStatus = 'cancel_at_period_end';
        }
      } catch (_) {}
    }

    try {
      if (typeof renderSubscriptionInfo === 'function') renderSubscriptionInfo();
    } catch (_) {}

    if (typeof showSubscriptionTitleBodyAlert === 'function') {
      const title = t('subscriptionArchivalCancelSuccessTitle', 'Archiválás lemondva');
      let body = t(
        'subscriptionArchivalCancelSuccessBody',
        'A következő időszakra már nem vonunk le díjat. Az Archiválási csomag a kifizetett időszak végéig aktív marad, utána 1 hét türelmi idő következik.',
      );
      if (data && data.currentPeriodEnd) {
        try {
          const dt = new Date(Number(data.currentPeriodEnd) * 1000);
          if (!isNaN(dt.getTime())) {
            const dateStr = (typeof formatDateForLocale === 'function')
              ? formatDateForLocale(dt)
              : dt.toLocaleDateString(lang === 'hu' ? 'hu-HU' : 'en-GB');
            body = formatTemplate(
              t(
                'subscriptionArchivalCancelSuccessBodyWithDate',
                'A következő időszakra már nem vonunk le díjat.\n\nAz Archiválási csomag eddig aktív: %DATE%.\nEzután még 1 hét türelmi időt adunk a régebbi dokumentumok törlése előtt.',
              ),
              { DATE: dateStr },
            );
          }
        } catch (_) {}
      }
      showSubscriptionTitleBodyAlert(title, body, 'success', null, {
        okText: t('commonOk', t('ok', 'Rendben')),
      });
    } else if (typeof showCustomAlert === 'function') {
      showCustomAlert(
        t('subscriptionArchivalCancelSuccess', 'Archiválási előfizetés lemondva. A csomag a kifizetett időszak végéig aktív marad.'),
        'success',
      );
    }

  } catch (error) {
    console.error('[Archival] Cancel error:', error);
    const title = t('subscriptionArchivalCancelErrorTitle', 'Nem sikerült lemondani');
    const message = (error && error.message)
      ? error.message
      : t('subscriptionArchivalCancelErrorBody', 'Kérlek próbáld újra később.');
    if (typeof showSubscriptionTitleBodyAlert === 'function') {
      showSubscriptionTitleBodyAlert(title, message, 'error', null, {
        okText: t('commonOk', t('ok', 'Rendben')),
      });
    } else if (typeof showCustomAlert === 'function') {
      showCustomAlert(title + '\n\n' + message, 'error');
    }
  } finally {
    setCancelArchivalSubscriptionButtonLoading(false, t);
  }
}

// === ARCHIVÁLÁSI CSOMAG UPGRADE VÉGREHAJTÁSA ===
async function executeArchivalUpgrade(newTier, i18n) {
  console.log('[Archival] Executing upgrade to:', newTier);

  const loadingMsg = i18n.subscriptionArchivalUpgradeProcessing || 'Csomag váltás folyamatban…\n\nKérlek várj, feldolgozzuk a kérést.';
  showStripeCheckoutLoading(loadingMsg);

  const t = (key, fallback) => { const v = getI18nValue(i18n, key); return (v != null && v !== '') ? v : fallback; };

  try {
    const UPGRADE_URL = (window.BILLING_CONFIG && window.BILLING_CONFIG.cloudFunctions)
      ? window.BILLING_CONFIG.cloudFunctions.upgradeArchivalSubscription
      : (console.warn('[Subscription] BILLING_CONFIG missing, using fallback URL'), 'https://europe-west3-munkaido-3cc44.cloudfunctions.net/upgradeArchivalSubscription');
    const countryCode = (window.currentUserSubscription && window.currentUserSubscription.countryCode)
      ? String(window.currentUserSubscription.countryCode).toUpperCase()
      : 'HU';
    
    const upgradeToken = await (window.currentUser.getIdToken
      ? window.currentUser.getIdToken()
      : firebase.auth().currentUser.getIdToken());
    const upgradeResponse = await fetch(UPGRADE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + upgradeToken
      },
      body: JSON.stringify({
        uid: window.currentUser.uid,
        newTier: newTier,
        countryCode: countryCode
      })
    });
    
    if (!upgradeResponse.ok) {
      const errorData = await upgradeResponse.json().catch(() => ({}));
      throw new Error(errorData.message || 'Upgrade failed');
    }
    
    const result = await upgradeResponse.json();
    console.log('[Archival] Upgrade successful:', result);

    hideStripeCheckoutLoading();
    
    // Sikeres üzenet
    const successMsg = i18n.subscriptionArchivalUpgradeSuccess || '✅ Csomag sikeresen frissítve!\n\nAz új csomag azonnal érvénybe lépett.';
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(successMsg, 'success');
    }
    
    // Subscription adatok frissítése - archivalTier lokálisan is frissítjük
    if (window.currentUserSubscription) {
      window.currentUserSubscription.archivalTier = newTier;
    }
    
    // Firestore-ból újratöltés
    if (typeof loadUserSubscription === 'function' && window.currentUser && window.currentUser.uid) {
      await loadUserSubscription(window.currentUser.uid, { forceRefresh: true });
    }
    if (typeof renderSubscriptionInfo === 'function') {
      renderSubscriptionInfo();
    }
    
  } catch (error) {
    console.error('[Archival] Upgrade error:', error);
    hideStripeCheckoutLoading();
    const errorMsg = t('subscriptionArchivalUpgradeFailed', '❌ Hiba történt a csomag váltás során.\n\nKérlek próbáld újra később, vagy írj nekünk: info@gurigo.eu');
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(errorMsg + '\n\n' + (error.message || ''), 'error');
    }
  }
}

// === ARCHIVÁLÁSI CSOMAG VÁSÁRLÁS (egyetlen csomag) ===
async function handleArchivalPurchase(archivalTier) {
  const tier = 'archival';
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  const t = (key, fallback) => { const v = getI18nValue(i18n, key); return (v != null && v !== '') ? v : fallback; };

  if (!window.currentUser || !window.currentUser.uid) {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(t('subscriptionArchivalLoginRequired', 'Kérjük, jelentkezz be az Archiválási csomag vásárlásához!'), 'info');
    }
    return;
  }

  if (window.AccountDeletionGuards && typeof window.AccountDeletionGuards.assertCanPurchaseOrResumeSubscription === 'function') {
    try {
      const guard = await window.AccountDeletionGuards.assertCanPurchaseOrResumeSubscription();
      if (!guard.ok) {
        window.AccountDeletionGuards.showPendingDeletionBlocksPurchaseModal();
        return;
      }
    } catch (gErr) {
      console.warn('[Subscription] AccountDeletionGuards archival', gErr);
    }
  }

  const sub = window.currentUserSubscription || {};
  const archCheckout = (typeof window.getArchivalEntitlement === 'function')
    ? window.getArchivalEntitlement(sub)
    : null;
  const archDup = (typeof window.getSubscriptionCheckoutGuards === 'function')
    ? window.getSubscriptionCheckoutGuards(sub)
    : null;
  const blockDuplicateArchival = archDup
    ? archDup.blockDuplicateArchivalCheckout
    : (typeof window.isArchivalSubscriptionBillingActive === 'function'
      ? window.isArchivalSubscriptionBillingActive(sub)
      : sub.archivalActive === true);
  if (blockDuplicateArchival) {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(
        t(
          'subscriptionArchivalAlreadyActive',
          'Már van aktív Archiválási csomagod. Nincs szükség új előfizetés indítására.',
        ),
        'info',
      );
    }
    return;
  }

  if (isStripeCheckoutBlockedOnNativeIos('archival')) {
    handleNativeIosIapPreparationFlow('archival', t);
    return;
  }

  if (typeof window.checkBillingInfoBeforePurchase === 'function') {
    const billingCheck = await window.checkBillingInfoBeforePurchase();
    if (!billingCheck.hasInfo) {
      const msg = (billingCheck && billingCheck.message) ? billingCheck.message : t('subscriptionBillingMissingAlertTemplate', '⚠️ Számlázási adatok hiányoznak. Töltsd ki a Beállítások menüben!');
      if (typeof showCustomAlert === 'function') showCustomAlert(msg, 'warning');
      return;
    }
  }

  try {
    const loadingMsg = i18n.subscriptionCheckoutLoading || 'Stripe fizetési oldal betöltése…\n\nKérlek várj, ez néhány másodpercet igénybe vehet.';
    showStripeCheckoutLoading(loadingMsg);

    const CLOUD_FUNCTION_URL = (window.BILLING_CONFIG && window.BILLING_CONFIG.cloudFunctions)
      ? window.BILLING_CONFIG.cloudFunctions.createCheckoutSession
      : 'https://europe-west1-munkaido-3cc44.cloudfunctions.net/createCheckoutSession';
    let trackingMetadata = {};
    if (typeof window.utmTracker !== 'undefined' && typeof window.utmTracker.flattenTrackingForStripe === 'function') {
      trackingMetadata = window.utmTracker.flattenTrackingForStripe();
    }
    clearStripeCheckoutClientState();

    const archivalIdToken = await getCheckoutFirebaseIdToken();
    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + archivalIdToken
      },
      body: JSON.stringify({
        tier: 'archival',
        uid: window.currentUser.uid,
        userEmail: window.currentUser.email || '',
        countryCode: resolveCheckoutCountryCode(window.currentUserSubscription),
        testMode: window.BILLING_CONFIG && window.BILLING_CONFIG.testMode,
        trackingMetadata: trackingMetadata,
        attemptId: createCheckoutAttemptId(),
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 403 && errorData.error === 'ACCOUNT_DELETION_PENDING' && window.AccountDeletionGuards) {
        hideStripeCheckoutLoading();
        window.AccountDeletionGuards.showPendingDeletionBlocksPurchaseModal();
        return;
      }
      throw createCheckoutSessionError(errorData, t);
    }
    const data = await response.json();
    if (!data.url) throw new Error(t('subscriptionCheckoutMissingUrl', 'Checkout URL hiányzik'));
    window.location.href = data.url;
  } catch (error) {
    console.error('[Archival] Checkout error:', error);
    hideStripeCheckoutLoading();
    showCheckoutSessionErrorAlert(error, t, i18n);
  }
}

// === ARCHIVÁLÁS SZINKRONIZÁLÁS STRIPE-BÓL (ha a webhook nem futott le) ===
async function handleArchivalSync() {
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  const t = (key, fallback) => { const v = getI18nValue(i18n, key); return (v != null && v !== '') ? v : fallback; };

  if (!window.currentUser || !window.currentUser.uid) {
    if (typeof showCustomAlert === 'function') showCustomAlert(t('subscriptionLoginRequired', 'Előfizetéshez be kell jelentkezned.'), 'info');
    return;
  }

  try {
    // syncArchivalFromStripe is deployed to europe-west1 (window.functions = west3)
    const functionsInstance = (typeof firebase !== 'undefined' && firebase.app)
      ? firebase.app().functions('europe-west1')
      : null;
    if (!functionsInstance || typeof functionsInstance.httpsCallable !== 'function') {
      if (typeof showCustomAlert === 'function') showCustomAlert(t('subscriptionArchivalSyncError', 'A szinkronizálás nem érhető el (Firebase Functions hiányzik).'), 'error');
      return;
    }
    const syncArchival = functionsInstance.httpsCallable('syncArchivalFromStripe');
    const result = await syncArchival();
    const data = result && result.data ? result.data : {};
    if (data.ok) {
      if (typeof showCustomAlert === 'function') showCustomAlert(t('subscriptionArchivalSyncSuccess', 'Archiválási előfizetés szinkronizálva. Frissítsd az oldalt.') || data.message, 'success');
      if (typeof window.loadUserSubscription === 'function' && window.currentUser && window.currentUser.uid) {
        window.loadUserSubscription(window.currentUser.uid, { forceRefresh: true });
      }
      if (typeof renderSubscriptionContent === 'function') setTimeout(renderSubscriptionContent, 500);
    } else {
      if (typeof showCustomAlert === 'function') showCustomAlert((data.message || t('subscriptionArchivalSyncNoSubscription', 'Nincs aktív Archiválási előfizetés a Stripe-ban.')), 'info');
    }
  } catch (err) {
    console.error('[Archival] Sync error:', err);
    const msg = (err && err.message) ? err.message : t('subscriptionArchivalSyncError', 'Szinkronizálás sikertelen. Próbáld később vagy írj: info@gurigo.eu');
    if (typeof showCustomAlert === 'function') showCustomAlert(msg, 'error');
  }
}

// === BANKKÁRTYA FRISSÍTÉS (STRIPE CUSTOMER PORTAL) ===
async function handleUpdatePaymentMethod() {
  if (!window.currentUser) {
    console.warn('[UpdatePaymentMethod] No user logged in');
    return;
  }

  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
    ? (translations[currentLang] || {})
    : {};
  const t = (key, fallback) => { const v = getI18nValue(i18n, key); return (v != null && v !== '') ? v : fallback; };

  const manageBtn = getManageStripeSubscriptionButton();
  if (manageBtn && manageBtn.getAttribute('aria-busy') === 'true') {
    return;
  }

  const sub = window.currentUserSubscription || {};
  const proMgmt = getProManagementModeForUi(sub);
  const archMgmt = getArchivalManagementModeForUi(sub);
  if (proMgmt.mode === 'stripe_info_ios' || proMgmt.mode === 'apple_info_web') {
    showSubscriptionProviderInfo('pro', proMgmt.mode, i18n);
    return;
  }
  if (archMgmt.mode === 'stripe_info_ios' || archMgmt.mode === 'apple_info_web') {
    showSubscriptionProviderInfo('archival', archMgmt.mode, i18n);
    return;
  }
  if (proMgmt.mode !== 'stripe_manage' && archMgmt.mode !== 'stripe_manage') {
    return;
  }

  const hasPortalCustomer =
    (typeof window.hasActiveStripeProSubscription === 'function' && window.hasActiveStripeProSubscription(sub)) ||
    !!(sub.archivalStripeSubscriptionId && String(sub.archivalStripeSubscriptionId).trim()) ||
    !!(sub.stripeCustomerId && String(sub.stripeCustomerId).trim());
  if (!hasPortalCustomer) {
    showSubscriptionPortalError('no_customer');
    return;
  }

  setManageSubscriptionButtonLoading(true, t);
  let redirectingToPortal = false;
  try {
    console.log('[UpdatePaymentMethod] Opening Stripe Customer Portal...');

    const token = await firebase.auth().currentUser.getIdToken();

    const CLOUD_FUNCTION_URL = (window.BILLING_CONFIG && window.BILLING_CONFIG.cloudFunctions)
      ? window.BILLING_CONFIG.cloudFunctions.createCustomerPortalSession
      : (console.warn('[Subscription] BILLING_CONFIG missing, using fallback URL'), 'https://europe-west3-munkaido-3cc44.cloudfunctions.net/createCustomerPortalSession');

    const response = await fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        uid: window.currentUser.uid,
        testMode: getPortalRequestTestMode(),
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const portalErrorKind = getPortalErrorKind(errorData);
      const err = new Error(errorData.message || t('subscriptionPortalCreateError', 'Customer Portal session létrehozása sikertelen'));
      err.code = errorData.code || errorData.error || null;
      err.portalErrorKind = portalErrorKind;
      if (portalErrorKind === 'no_customer') {
        showSubscriptionPortalError('no_customer', err);
        return;
      }
      if (portalErrorKind === 'not_configured' || portalErrorKind === 'env_mismatch' || portalErrorKind === 'generic') {
        showSubscriptionPortalError(portalErrorKind, err);
        return;
      }
      throw err;
    }

    const data = await response.json();

    const i18nPortal = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
    if (!data.url) {
      throw new Error(i18nPortal.subscriptionPortalUrlMissing || 'Portal URL hiányzik a válaszból');
    }

    console.log('[UpdatePaymentMethod] Redirecting to Stripe Customer Portal');
    redirectingToPortal = true;
    window.location.href = data.url;

  } catch (error) {
    console.error('[UpdatePaymentMethod] Error:', error);
    if (error && error.portalErrorKind) {
      showSubscriptionPortalError(error.portalErrorKind, error);
      return;
    }
    if (isStripePortalNoCustomerError(error)) {
      showSubscriptionPortalError('no_customer', error);
      return;
    }
    showSubscriptionPortalError('generic', error);
  } finally {
    if (!redirectingToPortal) {
      setManageSubscriptionButtonLoading(false, t);
    }
  }
}

// Event listener for cancel trial button
document.addEventListener('click', async (e) => {
  if (e.target.id === 'cancelTrialBtn') {
    
    // Megerősítő popup
    const confirmed = confirm(t('subscriptionTrial.cancelConfirm', 'Biztosan visszavonod az előfizetést?\n\n✓ Nem leszek terhelve\n✓ A próbaidő végéig még használom a Pro funkciókat\n✓ A próbaidő lejárta után Free tier-re kerülök'));
    if (!confirmed) return;
    
    try {
      // Loading state
      e.target.disabled = true;
      e.target.textContent = t('subscriptionTrial.canceling', 'Lemondás...');
      
      // Cloud Function hívása
      const fnSvc = (typeof window !== 'undefined' && window.functions) ? window.functions : firebase.app().functions('europe-west3');
      const cancelTrial = fnSvc.httpsCallable('cancelTrialSubscription');
      const result = await cancelTrial();
      
      if (result.data.success) {
        // Sikeres lemondás
        alert(t('subscriptionTrial.cancelSuccess', 'Előfizetés sikeresen visszavonva.\n\nA próbaidő végéig még használhatod a Pro funkciókat, utána automatikusan Free tier-re kerülsz.'));
        
        // Frissítsd a user subscription adatokat
        const cancelUid = (window.currentUser && window.currentUser.uid) || (firebase.auth().currentUser && firebase.auth().currentUser.uid);
        if (typeof loadUserSubscription === 'function' && cancelUid) {
          try {
            await loadUserSubscription(cancelUid, { forceRefresh: true });
          } catch (_) {}
        }
        
        // Rendereld újra az oldalt
        showSubscriptionPage();
        
      } else {
        throw new Error(result.data.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('[Subscription] Cancel trial error:', error);
      alert(t('subscriptionTrial.cancelError', 'Hiba történt a lemondás során. Kérlek, próbáld újra később!'));
      
      // Restore button
      e.target.disabled = false;
      e.target.textContent = t('subscriptionTrial.cancelButton', 'Előfizetés visszavonása');
    }
  }
});

// === Fióktörlés ↔ előfizetés védelmek (aktív sub nélkül törlés; törlés alatt nincs új sub / resume) ===
(function accountDeletionSubscriptionGuards() {
  const guardT = function (key, fallback) {
    const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
    const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
    const v = getI18nValue(i18n, key);
    return (v != null && v !== '') ? v : fallback;
  };

  async function getAccountDeletionPendingCallable() {
    try {
      if (typeof firebase === 'undefined' || !firebase.auth || !firebase.auth().currentUser) return false;
      const fn = firebase.app().functions('europe-west3').httpsCallable('getAccountDeletionStatus');
      const res = await fn({});
      const d = res && res.data ? res.data : {};
      return !!(d && d.pending);
    } catch (e) {
      console.warn('[AccountDeletionGuards] getAccountDeletionPendingCallable', e);
      return false;
    }
  }

  /** Pro / Stripe: aktív vagy próba, és nincs „időszak végén lemondva” – törlés tiltva. */
  function isProBlockingAccountDeletion(sub) {
    const pro = (typeof window.getProEntitlement === 'function') ? window.getProEntitlement(sub) : null;
    if (!sub || !sub.stripeSubscriptionId) return false;
    const status = String(sub.subscriptionStatus || '').toLowerCase();
    if (!['active', 'trialing', 'past_due'].includes(status)) return false;
    if (pro ? pro.isCancelAtPeriodEnd : sub.cancelAtPeriodEnd === true) return false;
    return true;
  }

  /** Archívum: külön Stripe sub a settings/archival dokumentumban. */
  async function isArchivalBlockingAccountDeletion(uid) {
    try {
      const snap = await firebase.firestore().collection('users').doc(uid).collection('settings').doc('archival').get();
      if (!snap.exists) return false;
      const a = snap.data() || {};
      if (!a.stripeSubscriptionId) return false;
      const status = String(a.status || '').toLowerCase();
      if (!['active', 'trialing', 'past_due'].includes(status)) return false;
      if (a.cancelAtPeriodEnd === true) return false;
      return true;
    } catch (e) {
      console.warn('[AccountDeletionGuards] archival read', e);
      return false;
    }
  }

  function showActiveSubscriptionBlocksDeletionModal() {
    const title = guardT('accountDeletionBlockedActiveSubscriptionTitle', 'Előbb mondd le az előfizetést');
    const body = guardT(
      'accountDeletionBlockedActiveSubscriptionBody',
      'Aktív előfizetésed van, amely nincs lemondás alatt (a számlázási időszak végéig még nem mondtad le). A fiók törlése előtt előbb mondd le az előfizetést a Beállításokban vagy a Stripe ügyfélportálon. Ha az előfizetés már „lemondás alatt” áll, de a kifizetett időszak végéig még aktív, akkor kérheted a fiók törlését a szokásos módon. Ha a lemondás nem sikerül vagy kérdésed van, írj: <a href="mailto:info@gurigo.eu" class="text-indigo-600 dark:text-indigo-400 underline font-medium">info@gurigo.eu</a>'
    );
    const icon = '<svg class="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    if (typeof showCustomModal === 'function') {
      showCustomModal(
        '<div class="text-base text-gray-700 dark:text-gray-300">' + body + '</div>',
        [{ text: guardT('ok', 'OK'), className: 'bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold', onClick: function () {} }],
        false,
        {
          icon: icon,
          iconBg: 'bg-amber-100 dark:bg-amber-900/30',
          title: title,
          subtitle: guardT('accountDeletionBlockedActiveSubscriptionSubtitle', 'Előfizetés / számlázás')
        }
      );
    } else {
      alert(title + '\n\n' + body.replace(/<[^>]+>/g, ''));
    }
  }

  function showPendingDeletionBlocksPurchaseModal() {
    const title = guardT('accountDeletionBlockedPurchaseTitle', 'Fiók törlés alatt');
    const body = guardT(
      'accountDeletionBlockedPurchaseBody',
      'A fiókod törlése jelenleg folyamatban van (14 napos visszavonási idő). Új előfizetést indítani vagy a lemondott előfizetést visszaállítani csak akkor lehet, ha előbb visszavonod a törlést a Beállításokban. Ha mégis előfizetnél, először vond vissza a törlési kérelmet. Kérdés esetén: <a href="mailto:info@gurigo.eu" class="text-indigo-600 dark:text-indigo-400 underline font-medium">info@gurigo.eu</a>'
    );
    const icon = '<svg class="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    if (typeof showCustomModal === 'function') {
      showCustomModal(
        '<div class="text-base text-gray-700 dark:text-gray-300">' + body + '</div>',
        [{ text: guardT('ok', 'OK'), className: 'bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold', onClick: function () {} }],
        false,
        {
          icon: icon,
          iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
          title: title,
          subtitle: guardT('accountDeletionBlockedPurchaseSubtitle', 'Törlési kérelem')
        }
      );
    } else {
      alert(title + '\n\n' + body.replace(/<[^>]+>/g, ''));
    }
  }

  async function assertCanStartAccountDeletion() {
    const user = firebase.auth().currentUser;
    if (!user) return { ok: true };
    if (typeof loadUserSubscription === 'function') {
      try {
        await loadUserSubscription(user.uid);
      } catch (_) {}
    }
    const sub = window.currentUserSubscription || {};
    if (isProBlockingAccountDeletion(sub)) {
      return { ok: false, reason: 'active_pro' };
    }
    if (await isArchivalBlockingAccountDeletion(user.uid)) {
      return { ok: false, reason: 'active_archival' };
    }
    return { ok: true };
  }

  async function assertCanPurchaseOrResumeSubscription() {
    if (await getAccountDeletionPendingCallable()) {
      return { ok: false, reason: 'pending_deletion' };
    }
    return { ok: true };
  }

  window.AccountDeletionGuards = {
    getAccountDeletionPendingCallable: getAccountDeletionPendingCallable,
    isProBlockingAccountDeletion: isProBlockingAccountDeletion,
    isArchivalBlockingAccountDeletion: isArchivalBlockingAccountDeletion,
    assertCanStartAccountDeletion: assertCanStartAccountDeletion,
    assertCanPurchaseOrResumeSubscription: assertCanPurchaseOrResumeSubscription,
    showActiveSubscriptionBlocksDeletionModal: showActiveSubscriptionBlocksDeletionModal,
    showPendingDeletionBlocksPurchaseModal: showPendingDeletionBlocksPurchaseModal
  };
})();

// === GLOBÁLIS EXPORTOK ===
window.captureSubscriptionAuthContext = captureSubscriptionAuthContext;
window.shouldAbortSubscriptionAuth = shouldAbortSubscriptionAuth;
window.renderSubscriptionInfo = renderSubscriptionInfo;
window.handleSubscriptionAction = handleSubscriptionAction;
window.handleArchivalPurchase = handleArchivalPurchase;
window.handleArchivalSync = handleArchivalSync;
window.handleTrialUpsellSnooze = handleTrialUpsellSnooze;
window.handleTrialUpsellOptOut = handleTrialUpsellOptOut;
window.checkAndShowTrialUpsellPrompt = checkAndShowTrialUpsellPrompt;
window.handleUpdatePaymentMethod = handleUpdatePaymentMethod;
window.handleProProviderManage = handleProProviderManage;
window.handleArchivalProviderManage = handleArchivalProviderManage;
window.handleArchivalCancel = handleArchivalCancel;
window.handleNativeIosRestorePurchases = handleNativeIosRestorePurchases;
window.showSubscriptionTitleBodyAlert = showSubscriptionTitleBodyAlert;
window.handleStripeCheckoutReturnOnLoad = handleStripeCheckoutReturnOnLoad;
window.clearStripeCheckoutClientState = clearStripeCheckoutClientState;
window.getSubscriptionProgressPeriod = getSubscriptionProgressPeriod;
window.buildSubscriptionProgressCircleHtml = buildSubscriptionProgressCircleHtml;
window.buildSubscriptionInfinityCircleHtml = buildSubscriptionInfinityCircleHtml;

if (typeof window.installEarlyBirdNativeIosGuards === 'function') {
  window.installEarlyBirdNativeIosGuards();
}
