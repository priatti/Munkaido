// === KÖZPONTI ELŐFIZETÉSI JOGOSULTSÁG ÉRTELMEZŐ (frontend) ===
// Forrás: window.currentUserSubscription (userProfile.loadUserSubscription).
// Nem ír Firestore-ba, nem változtat backend/Stripe logikát.
// getEffectiveSubscriptionTier / hasFeatureAccess változatlanul subscriptionTiers.js-ben marad.

(function () {
  'use strict';

  function getSub(subOptional) {
    if (subOptional && typeof subOptional === 'object') return subOptional;
    return window.currentUserSubscription || {};
  }

  function normalizeStoredTier(rawTier) {
    const raw = rawTier || 'free';
    if (raw === 'max') return 'pro';
    if (raw === 'guest') return 'free';
    return raw;
  }

  function pickDate(v) {
    try {
      if (!v) return null;
      if (v instanceof Date) return v;
      if (typeof v.toDate === 'function') return v.toDate();
      return new Date(v);
    } catch (_) {
      return null;
    }
  }

  function isTrialActive(sub) {
    const trialEnd = pickDate(sub.trialEnd);
    return !!(trialEnd && trialEnd > new Date());
  }

  /** Csak tényleges próba: isTrial flag, vagy trialEnd a jövőben fizetős Stripe sub nélkül. */
  function isGenuineTrialPro(sub) {
    const stripeSubId = sub.stripeSubscriptionId && String(sub.stripeSubscriptionId).trim();
    if (stripeSubId) return false;
    if (sub.isTrial === true) {
      const trialEnd = pickDate(sub.trialEnd);
      return !trialEnd || trialEnd > new Date();
    }
    return isTrialActive(sub);
  }

  /**
   * Natív iOS WKWebView shell (Swift: GuriGOWebShellView, document start injection).
   * Nem UA-alapú — csak a natív app által beállított flag-ek.
   */
  function isNativeIosAppShell() {
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

  function isAppleIapBridgeLive() {
    try {
      return !!(
        window.GuriGONativeIapBridge &&
        typeof window.GuriGONativeIapBridge.isAvailable === 'function' &&
        window.GuriGONativeIapBridge.isAvailable()
      );
    } catch (_) {
      return false;
    }
  }

  /**
   * Fizetési útvonal (csak frontend): web/Android/PWA → Stripe; natív iOS → StoreKit 2 (live bridge).
   */
  function getPaymentRouteForProduct(product) {
    const productKey = product === 'archival' ? 'archival' : 'pro';
    if (isNativeIosAppShell()) {
      return {
        product: productKey,
        route: 'apple_iap',
        checkoutProvider: 'apple_iap',
        canStartStripeCheckout: false,
        shouldShowAppleIapPlaceholder: false,
        appleIapBridgeLive: isAppleIapBridgeLive()
      };
    }
    return {
      product: productKey,
      route: 'stripe',
      checkoutProvider: 'stripe',
      canStartStripeCheckout: true,
      shouldShowAppleIapPlaceholder: false,
      appleIapBridgeLive: false
    };
  }

  function shouldBlockStripeCheckoutOnNativeIos(product) {
    return getPaymentRouteForProduct(product).route === 'apple_iap';
  }

  function normalizeBillingProvider(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (s === 'apple_iap' || s === 'apple') return 'apple';
    if (s === 'stripe') return 'stripe';
    return '';
  }

  function hasFutureSubscriptionExpiry(sub) {
    try {
      const exp = pickDate(sub.expiry) || pickDate(sub.activeUntil);
      return !!(exp && exp > new Date());
    } catch (_) {
      return false;
    }
  }

  function isAppleProProductId(productId) {
    const id = String(productId || '').trim().toLowerCase();
    if (!id || id.indexOf('com.gurigo.archive') >= 0) return false;
    return id.indexOf('com.gurigo.pro') >= 0;
  }

  function isAppleArchivalProductId(productId) {
    const id = String(productId || '').trim().toLowerCase();
    return id.indexOf('com.gurigo.archive') >= 0;
  }

  function isAdminGiftProActive(sub) {
    if (sub.adminGiftLifetimeActive === true) return true;
    if (sub.adminGiftGrantsPro === true) return true;
    if (sub.entitlementsAdminGiftContributes === true) return true;
    const ag = sub.entitlementsAdminGift;
    if (ag && ag.contributesPro === true) return true;
    return false;
  }

  function isAdminGiftLifetimeActive(sub) {
    if (sub.adminGiftLifetimeActive === true) return true;
    const ag = sub.entitlementsAdminGift;
    return !!(ag && (ag.isLifetime === true || ag.giftType === 'lifetime') && ag.contributesPro === true);
  }

  function isAppleIapStatusActive(rawStatus) {
    const s = String(rawStatus || '').trim().toLowerCase();
    return s === 'active' || s === 'grace_period' || s === 'billing_retry';
  }

  /** subscription/state Apple provider – csak Pro termékre (ne örökölje az archiválást). */
  function isSubscriptionStateApplePro(sub) {
    if (normalizeBillingProvider(sub.subscriptionStateProvider) !== 'apple') return false;
    const productType = String(sub.subscriptionStateProductType || '').trim().toLowerCase();
    if (productType === 'archival') return false;
    if (productType === 'pro') return true;
    const productId = String(sub.subscriptionStateProductId || '').trim();
    if (isAppleArchivalProductId(productId)) return false;
    if (isAppleProProductId(productId)) return true;
    return false;
  }

  /**
   * Apple Pro signal: must be backed by canonical entitlements/main.
   * Client-writable subscription/state or provider mirrors are NOT independent grantors.
   */
  function isAppleProSignalActive(subOptional) {
    const sub = getSub(subOptional);
    if (sub.entitlementsIsPro === true && normalizeBillingProvider(sub.entitlementsProvider) === 'apple') {
      return true;
    }
    return false;
  }

  function isAppleArchivalSignalActive(sub) {
    const archStatus = String(sub.appleIapArchivalStatus || '').trim().toLowerCase();
    const hasActiveAppleIap = archStatus === 'active' || archStatus === 'billing_retry';

    if (hasActiveAppleIap) return true;

    if (normalizeBillingProvider(sub.subscriptionStateProvider) === 'apple') {
      const productType = String(sub.subscriptionStateProductType || '').trim().toLowerCase();
      if (productType === 'archival' && hasActiveAppleIap) return true;
      if (isAppleArchivalProductId(sub.subscriptionStateProductId) && hasActiveAppleIap) return true;
    }

    const bp = normalizeBillingProvider(sub.archivalBillingProvider);
    if (bp === 'apple' && hasActiveAppleIap) return true;

    return false;
  }

  /**
   * Aktív Stripe Archiválás: stripe subscription id + billing-active, stale Apple mezők nem számítanak.
   */
  function hasActiveStripeArchivalSubscription(subOptional) {
    const sub = getSub(subOptional);
    const stripeSubId = sub.archivalStripeSubscriptionId && String(sub.archivalStripeSubscriptionId).trim();
    if (!stripeSubId) return false;

    const archActive =
      typeof window.isArchivalSubscriptionBillingActive === 'function'
        ? window.isArchivalSubscriptionBillingActive(sub)
        : sub.archivalActive === true;
    if (!archActive) return false;

    const status = String(sub.archivalStatus || '').trim().toLowerCase();
    if (status === 'incomplete') return false;
    if (status === 'canceled' || status === 'cancelled' || status === 'expired' || status === 'incomplete_expired') {
      return false;
    }
    if (status === 'cancel_at_period_end' || status === 'active_until_period_end') {
      return sub.archivalActive === true;
    }
    if (sub.archivalCancelAtPeriodEnd === true && sub.archivalActive !== false) {
      return true;
    }

    if (isAppleArchivalSignalActive(sub) && !stripeSubId) return false;

    return true;
  }

  /**
   * Valódi aktív Stripe Pro: only canonical entitlements/main.isPro with provider == 'stripe'.
   * Client-writable stripeSubscriptionId/status/currentPeriodEnd are NOT independent grantors.
   */
  function hasActiveStripeProSubscription(subOptional) {
    const sub = getSub(subOptional);
    if (sub.entitlementsIsPro !== true) return false;
    if (normalizeBillingProvider(sub.entitlementsProvider) !== 'stripe') return false;

    const periodEnd =
      pickDate(sub.entitlementsExpiresAt) ||
      pickDate(sub.currentPeriodEnd) ||
      pickDate(sub.activeUntil) ||
      pickDate(sub.expiry);
    if (periodEnd && periodEnd <= new Date()) return false;

    return true;
  }

  /**
   * Pro számlázási provider: apple | stripe | trial | tester | free | unknown
   */
  function getProBillingProvider(subOptional) {
    const sub = getSub(subOptional);
    const pro = buildProEntitlement(sub);

    if (pro.isTester) return 'tester';
    if (isAdminGiftLifetimeActive(sub)) return 'admin_gift_lifetime';
    if (isAdminGiftProActive(sub)) return 'admin_gift';
    if (pro.tier !== 'pro') return 'free';

    if (hasActiveStripeProSubscription(sub)) return 'stripe';

    if (pro.isTrialPro) return 'trial';

    if (sub.entitlementsIsPro === true && normalizeBillingProvider(sub.entitlementsProvider) === 'stripe') {
      return 'stripe';
    }

    if (isAppleProSignalActive(sub)) return 'apple';

    const explicitPro = normalizeBillingProvider(sub.proBillingProvider || sub.subscriptionBillingProvider);
    if (explicitPro === 'apple' && isAppleProSignalActive(sub)) return 'apple';
    if (explicitPro === 'stripe') return 'stripe';

    return 'unknown';
  }

  /**
   * Firestore canonical mirror → currentUserSubscription (egyszeri, előfizetés oldal).
   */
  function hydrateSubscriptionBillingMirror(uid) {
    const userId = uid || (window.currentUser && window.currentUser.uid);
    if (!userId || typeof firebase === 'undefined' || !firebase.firestore) {
      return Promise.resolve();
    }
    const sub = window.currentUserSubscription || {};
    if (sub.__billingMirrorHydrated) return Promise.resolve();

    const db = firebase.firestore();
    const entRef = db.collection('users').doc(userId).collection('entitlements').doc('main');
    const stateRef = db.doc('users/' + userId + '/subscription/state');
    const appleRef = db.doc('users/' + userId + '/subscription/providers/apple/main');

    return Promise.all([
      entRef.get().catch(function () { return null; }),
      stateRef.get().catch(function () { return null; }),
      appleRef.get().catch(function () { return null; }),
    ]).then(function (snaps) {
      const entSnap = snaps[0];
      const stateSnap = snaps[1];
      const appleSnap = snaps[2];
      const target = window.currentUserSubscription || {};

      if (entSnap && entSnap.exists) {
        const e = entSnap.data() || {};
        if (typeof e.provider === 'string') target.entitlementsProvider = e.provider;
        if (typeof e.isPro === 'boolean') target.entitlementsIsPro = e.isPro;
        if (e.adminGift && typeof e.adminGift === 'object') {
          target.entitlementsAdminGift = e.adminGift;
          target.adminGiftGrantsPro = e.adminGift.contributesPro === true;
          target.adminGiftLifetimeActive = e.adminGift.isLifetime === true && e.adminGift.contributesPro === true;
          target.entitlementsAdminGiftContributes = e.adminGift.contributesPro === true;
          if (e.adminGift.endsAt && typeof e.adminGift.endsAt.toDate === 'function') {
            target.adminGiftEndsAt = e.adminGift.endsAt.toDate();
          }
        }
        const appleSlice = e.providers && e.providers.apple;
        if (appleSlice && typeof appleSlice === 'object') {
          if (typeof appleSlice.status === 'string') {
            target.entitlementsAppleProviderStatus = appleSlice.status;
          }
          if (typeof appleSlice.productId === 'string') {
            target.entitlementsAppleProductId = appleSlice.productId;
          }
        }
      }
      if (stateSnap && stateSnap.exists) {
        const st = stateSnap.data() || {};
        if (typeof st.provider === 'string') target.subscriptionStateProvider = st.provider;
        if (typeof st.productType === 'string') target.subscriptionStateProductType = st.productType;
        if (typeof st.productId === 'string') target.subscriptionStateProductId = st.productId;
      }
      if (appleSnap && appleSnap.exists) {
        const a = appleSnap.data() || {};
        const iapPro = a.iapPro;
        const iapArchival = a.iapArchival;
        if (typeof a.latestSignedRenewalInfo === 'string' && a.latestSignedRenewalInfo.trim()) {
          target.appleIapLatestSignedRenewalInfoPresent = true;
        }
        if (iapPro && typeof iapPro === 'object') {
          if (typeof iapPro.status === 'string') target.appleIapProStatus = iapPro.status;
          if (typeof iapPro.rawStatus === 'string' && !target.appleIapProStatus) {
            target.appleIapProStatus = iapPro.rawStatus;
          }
          if (typeof iapPro.productId === 'string') target.appleProProductId = iapPro.productId;
          if (iapPro.autoRenewStatusKnown === true) {
            target.appleIapProAutoRenewKnown = true;
            if (typeof iapPro.autoRenewStatus === 'number') {
              target.appleIapProAutoRenewStatus = iapPro.autoRenewStatus;
            }
          }
          if (iapPro.willRenew === false) target.appleIapProWillRenew = false;
          else if (iapPro.willRenew === true) target.appleIapProWillRenew = true;
        }
        if (iapArchival && typeof iapArchival === 'object') {
          if (typeof iapArchival.status === 'string') target.appleIapArchivalStatus = iapArchival.status;
          if (typeof iapArchival.rawStatus === 'string' && !target.appleIapArchivalStatus) {
            target.appleIapArchivalStatus = iapArchival.rawStatus;
          }
          if (typeof iapArchival.productId === 'string') target.appleArchivalProductId = iapArchival.productId;
          if (iapArchival.autoRenewStatusKnown === true) {
            target.appleIapArchivalAutoRenewKnown = true;
            if (typeof iapArchival.autoRenewStatus === 'number') {
              target.appleIapArchivalAutoRenewStatus = iapArchival.autoRenewStatus;
            }
          }
          if (iapArchival.willRenew === false) target.appleIapArchivalWillRenew = false;
          else if (iapArchival.willRenew === true) target.appleIapArchivalWillRenew = true;
        }
        if (typeof a.productId === 'string') {
          if (isAppleProProductId(a.productId)) target.appleProProductId = target.appleProProductId || a.productId;
          else if (isAppleArchivalProductId(a.productId)) {
            target.appleArchivalProductId = target.appleArchivalProductId || a.productId;
          }
        }
      }

      if (hasActiveStripeProSubscription(target)) {
        target.proBillingProvider = 'stripe';
      } else if (hasActiveStripeArchivalSubscription(target)) {
        target.archivalBillingProvider = 'stripe';
      } else if (target.entitlementsIsPro === true && normalizeBillingProvider(target.entitlementsProvider) === 'apple') {
        target.proBillingProvider = 'apple';
      } else if (target.entitlementsIsPro === true && normalizeBillingProvider(target.entitlementsProvider) === 'stripe') {
        target.proBillingProvider = 'stripe';
      } else if (isSubscriptionStateApplePro(target)) {
        target.proBillingProvider = 'apple';
      }

      target.__billingMirrorHydrated = true;
      window.currentUserSubscription = target;
    }).catch(function (err) {
      console.warn('[subscriptionEntitlements] hydrateSubscriptionBillingMirror failed:', err);
      sub.__billingMirrorHydrated = true;
    });
  }

  /**
   * Archiválás számlázási provider: apple | stripe | none
   */
  function getArchivalBillingProvider(subOptional) {
    const sub = getSub(subOptional);
    const arch = buildArchivalEntitlement(sub);
    if (!arch.hasActiveArchival && !arch.inGracePeriod) return 'none';

    if (hasActiveStripeArchivalSubscription(sub)) return 'stripe';

    if (isAppleArchivalSignalActive(sub)) return 'apple';

    const bp = normalizeBillingProvider(sub.archivalBillingProvider);
    if (bp === 'stripe') return 'stripe';
    if (bp === 'apple') return 'apple';

    if (sub.archivalStripeSubscriptionId && String(sub.archivalStripeSubscriptionId).trim()) {
      return 'stripe';
    }
    if (arch.hasActiveArchival && !sub.archivalStripeSubscriptionId) {
      return 'apple';
    }
    return 'unknown';
  }

  /**
   * Pro kezelés UI mód: apple_manage | apple_info_web | stripe_manage | stripe_info_ios | trial_info | none
   */
  function getProManagementMode(subOptional) {
    const sub = getSub(subOptional);
    const provider = getProBillingProvider(sub);
    const pro = buildProEntitlement(sub);
    const native = isNativeIosAppShell();

    if (provider === 'tester' || provider === 'free') return { mode: 'none', provider: provider };
    if (provider === 'trial') return { mode: 'trial_info', provider: provider };

    if (provider === 'apple') {
      if (native) return { mode: 'apple_manage', provider: provider };
      return { mode: 'apple_info_web', provider: provider };
    }
    if (provider === 'stripe') {
      if (native) return { mode: 'stripe_info_ios', provider: provider };
      if (pro.isTrialPro) return { mode: 'trial_info', provider: provider };
      return { mode: 'stripe_manage', provider: provider };
    }
    return { mode: 'none', provider: provider };
  }

  /**
   * Archiválás kezelés UI mód
   */
  function getArchivalManagementMode(subOptional) {
    const sub = getSub(subOptional);
    const provider = getArchivalBillingProvider(sub);
    const arch = buildArchivalEntitlement(sub);
    const native = isNativeIosAppShell();

    if (provider === 'none' || !arch.hasActiveArchival) {
      if (arch.inGracePeriod && provider === 'apple') {
        return native ? { mode: 'apple_manage', provider: provider } : { mode: 'apple_info_web', provider: provider };
      }
      return { mode: 'none', provider: provider };
    }

    if (provider === 'apple') {
      if (native) return { mode: 'apple_manage', provider: provider };
      return { mode: 'apple_info_web', provider: provider };
    }
    if (provider === 'stripe') {
      if (native) return { mode: 'stripe_info_ios', provider: provider };
      return { mode: 'stripe_manage', provider: provider };
    }
    return { mode: 'none', provider: provider };
  }

  /** Apple IAP számlázás (bármely platform). */
  function isProBilledViaApple(subOptional) {
    return getProBillingProvider(subOptional) === 'apple';
  }

  function isArchivalBilledViaApple(subOptional) {
    return getArchivalBillingProvider(subOptional) === 'apple';
  }

  function isProBilledViaStripe(subOptional) {
    return getProBillingProvider(subOptional) === 'stripe';
  }

  function isArchivalBilledViaStripe(subOptional) {
    return getArchivalBillingProvider(subOptional) === 'stripe';
  }

  /**
   * Archiválás Apple IAP – App Store manage csak iOS natív shellben.
   */
  function isArchivalBilledViaAppleIap(subOptional) {
    return isArchivalBilledViaApple(subOptional) && isNativeIosAppShell();
  }

  /**
   * Pro Apple IAP – App Store manage csak iOS natív shellben.
   */
  function isProBilledViaAppleIap(subOptional) {
    return isProBilledViaApple(subOptional) && isNativeIosAppShell();
  }

  /**
   * Pro csomag értelmezése (stored tier display only; authorization uses canonical effective tier).
   */
  function buildProEntitlement(subOptional) {
    const sub = getSub(subOptional);
    const rawTier = normalizeStoredTier(sub.tier);
    const subscriptionStatus = sub.subscriptionStatus;
    const cancelAtPeriodEnd = !!sub.cancelAtPeriodEnd;
    const hasRealSubscription = hasActiveStripeProSubscription(sub);
    const trialActive = isTrialActive(sub);
    const effectiveTier = (typeof window.getEffectiveSubscriptionTier === 'function')
      ? window.getEffectiveSubscriptionTier()
      : 'free';
    const isTrialPro = effectiveTier === 'pro' && !hasRealSubscription && isGenuineTrialPro(sub);
    const isPaymentFailed =
      typeof window.isProSubscriptionPaymentProblem === 'function'
        ? window.isProSubscriptionPaymentProblem(sub)
        : (sub.subscriptionPaymentFailed === true || subscriptionStatus === 'past_due');
    const hasStripeCustomer = hasRealSubscription;

    let subscriptionPageUiState = 'other';
    if (effectiveTier === 'tester') {
      subscriptionPageUiState = 'tester';
    } else if (effectiveTier === 'free') {
      subscriptionPageUiState = 'free';
    } else if (effectiveTier === 'pro') {
      if (isPaymentFailed) {
        subscriptionPageUiState = 'payment_failed';
      } else if (cancelAtPeriodEnd) {
        subscriptionPageUiState = 'cancel_pending';
      } else if (isTrialPro) {
        subscriptionPageUiState = subscriptionStatus === 'trialing_canceled' ? 'trial_canceled' : 'trial';
      } else {
        subscriptionPageUiState = 'active_paid';
      }
    }

    return {
      sub: sub,
      tier: rawTier,
      effectiveTier: effectiveTier,
      isTester: effectiveTier === 'tester',
      isAdminGiftPro: isAdminGiftProActive(sub),
      isAdminGiftLifetime: isAdminGiftLifetimeActive(sub),
      isFreeTier: effectiveTier === 'free',
      isProTier: effectiveTier === 'pro',
      hasProFeatureAccess: effectiveTier === 'pro' || effectiveTier === 'tester',
      hasRealSubscription: hasRealSubscription,
      isTrialPro: isTrialPro,
      isPaidPro: effectiveTier === 'pro' && hasRealSubscription,
      isCancelAtPeriodEnd: cancelAtPeriodEnd,
      isDowngradePending: cancelAtPeriodEnd,
      isPaymentFailed: isPaymentFailed,
      hasStripeCustomer: hasStripeCustomer,
      trialActive: trialActive,
      subscriptionPageUiState: subscriptionPageUiState
    };
  }

  /**
   * Archiválási csomag értelmezése.
   */
  function buildArchivalEntitlement(subOptional) {
    const sub = getSub(subOptional);
    const hasActiveArchival =
      typeof window.isArchivalSubscriptionBillingActive === 'function'
        ? window.isArchivalSubscriptionBillingActive(sub)
        : sub.archivalActive === true;
    const inPostExpiryStaleGrace =
      typeof window.isArchivalPostExpiryStaleGracePeriod === 'function'
        ? window.isArchivalPostExpiryStaleGracePeriod(sub)
        : (
          !hasActiveArchival &&
          sub.archivalActive !== true &&
          (function () {
            if (sub.archivalStatus === 'grace_period') {
              const until = sub.archivalGracePeriodUntil || sub.gracePeriodUntil;
              if (!until) return true;
              const d = until instanceof Date ? until : new Date(until);
              return !isNaN(d.getTime()) && d.getTime() > Date.now();
            }
            const until = sub.archivalGracePeriodUntil || sub.gracePeriodUntil;
            if (!until) return false;
            const d = until instanceof Date ? until : new Date(until);
            return !isNaN(d.getTime()) && d.getTime() > Date.now();
          })()
        );
    const isPaymentFailed =
      typeof window.isArchivalSubscriptionPaymentProblem === 'function'
        ? window.isArchivalSubscriptionPaymentProblem(sub)
        : !!sub.archivalPaymentFailed;

    let subscriptionPageUiState = 'none';
    if (hasActiveArchival) {
      if (isPaymentFailed) {
        subscriptionPageUiState = 'payment_failed';
      } else if (
        typeof window.isArchivalCancelAtPeriodEndPending === 'function' &&
        window.isArchivalCancelAtPeriodEndPending(sub)
      ) {
        subscriptionPageUiState = 'cancel_pending';
      } else {
        subscriptionPageUiState = 'active';
      }
    } else if (inPostExpiryStaleGrace) {
      subscriptionPageUiState = 'grace';
    }

    return {
      sub: sub,
      archivalTier: sub.archivalTier || null,
      hasActiveArchival: hasActiveArchival,
      inGracePeriod: inPostExpiryStaleGrace,
      inPostExpiryStaleGrace: inPostExpiryStaleGrace,
      isPaymentFailed: isPaymentFailed,
      subscriptionPageUiState: subscriptionPageUiState
    };
  }

  /**
   * Checkout guard-ok (Stripe útvonal változatlan).
   */
  function buildCheckoutGuards(subOptional) {
    const sub = getSub(subOptional);
    const pro = buildProEntitlement(sub);
    const arch = buildArchivalEntitlement(sub);
    const proRoute = getPaymentRouteForProduct('pro');
    const archRoute = getPaymentRouteForProduct('archival');
    // handleSubscriptionAction('upgrade_pro'): aktív Pro (Stripe vagy Apple / lejárat) — ne legyen dupla checkout
    const hasFutureExpiry = (function () {
      try {
        const exp = sub.expiry || sub.activeUntil;
        if (!exp) return false;
        const d = exp instanceof Date ? exp : new Date(exp);
        return !isNaN(d.getTime()) && d > new Date();
      } catch (_) {
        return false;
      }
    })();
    const proProvider = getProBillingProvider(sub);
    const adminGiftLifetime = isAdminGiftLifetimeActive(sub);
    const adminGiftActive = isAdminGiftProActive(sub);
    const blockDuplicateProCheckout =
      pro.tier === 'pro' &&
      !pro.isTrialPro &&
      (
        (proProvider === 'stripe' && hasActiveStripeProSubscription(sub) && !pro.isCancelAtPeriodEnd) ||
        (proProvider === 'apple' && (hasFutureExpiry || pro.isCancelAtPeriodEnd)) ||
        (proProvider === 'unknown' && hasActiveStripeProSubscription(sub) && !pro.isCancelAtPeriodEnd) ||
        (proProvider === 'unknown' && !hasActiveStripeProSubscription(sub) && hasFutureExpiry)
      );

    const archProvider = getArchivalBillingProvider(sub);
    const blockDuplicateArchivalCheckout = arch.hasActiveArchival;

    return {
      blockDuplicateProCheckout: blockDuplicateProCheckout,
      blockDuplicateArchivalCheckout: blockDuplicateArchivalCheckout,
      blockStripeProCheckoutLifetimeGift: adminGiftLifetime,
      blockAppleIapProPurchase: adminGiftActive,
      adminGiftActive: adminGiftActive,
      adminGiftLifetime: adminGiftLifetime,
      adminGiftEndsAt: sub.adminGiftEndsAt || null,
      canStartProCheckout: !blockDuplicateProCheckout && !adminGiftLifetime && proRoute.canStartStripeCheckout,
      canStartArchivalCheckout: !blockDuplicateArchivalCheckout && archRoute.canStartStripeCheckout,
      checkoutProvider: proRoute.checkoutProvider,
      paymentRoutePro: proRoute.route,
      paymentRouteArchival: archRoute.route,
      isNativeIosAppShell: isNativeIosAppShell(),
      shouldShowAppleIapPlaceholder: false,
      appleIapBridgeLive: proRoute.appleIapBridgeLive
    };
  }

  window.getProEntitlement = buildProEntitlement;
  window.getArchivalEntitlement = buildArchivalEntitlement;
  window.getSubscriptionCheckoutGuards = buildCheckoutGuards;
  window.isNativeIosAppShell = isNativeIosAppShell;
  window.getPaymentRouteForProduct = getPaymentRouteForProduct;
  window.shouldBlockStripeCheckoutOnNativeIos = shouldBlockStripeCheckoutOnNativeIos;
  window.getProBillingProvider = getProBillingProvider;
  window.hasActiveStripeProSubscription = hasActiveStripeProSubscription;
  window.hasActiveStripeArchivalSubscription = hasActiveStripeArchivalSubscription;
  window.isAppleArchivalSignalActive = isAppleArchivalSignalActive;
  window.isAppleProSignalActive = isAppleProSignalActive;
  window.hydrateSubscriptionBillingMirror = hydrateSubscriptionBillingMirror;
  window.getArchivalBillingProvider = getArchivalBillingProvider;
  window.getProManagementMode = getProManagementMode;
  window.getArchivalManagementMode = getArchivalManagementMode;
  window.isProBilledViaApple = isProBilledViaApple;
  window.isArchivalBilledViaApple = isArchivalBilledViaApple;
  window.isProBilledViaStripe = isProBilledViaStripe;
  window.isArchivalBilledViaStripe = isArchivalBilledViaStripe;
  window.isArchivalBilledViaAppleIap = isArchivalBilledViaAppleIap;
  window.isProBilledViaAppleIap = isProBilledViaAppleIap;

  window.isArchivalUnlocked = function (subOptional) {
    const sub = getSub(subOptional);
    return typeof window.isArchivalSubscriptionBillingActive === 'function'
      ? window.isArchivalSubscriptionBillingActive(sub)
      : sub.archivalActive === true;
  };
})();
