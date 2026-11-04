// === FELHASZNÁLÓI PROFIL KEZELÉS ===
// Tier típusok: free, pro, tester (max eltávolítva, régi adatnál pro-ként kezeljük)
window.currentUserSubscription = { __entitlementResolved: false };

var __gurigoEntitlementCallbacks = [];
var __gurigoEntitlementReadInFlight = null;
var __gurigoEntitlementReadInFlightUid = null;
var __gurigoEntitlementLoadInFlight = null;
var __gurigoEntitlementLoadInFlightUid = null;
var __gurigoLastNotifiedPresentation = 'unknown';

var ENTITLEMENT_CACHE_PREFIX = 'gurigo_entitlement_cache_v1:';

function entitlementCacheKey(userId) {
  return ENTITLEMENT_CACHE_PREFIX + userId;
}

function serializeEntitlementDates(value) {
  if (value instanceof Date) {
    return { __gurigoDate: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return value.map(serializeEntitlementDates);
  }
  if (value && typeof value === 'object') {
    var out = {};
    Object.keys(value).forEach(function (k) {
      if (k.indexOf('__') === 0) return;
      out[k] = serializeEntitlementDates(value[k]);
    });
    return out;
  }
  return value;
}

function deserializeEntitlementDates(value) {
  if (value && typeof value === 'object' && value.__gurigoDate) {
    var d = new Date(value.__gurigoDate);
    return isNaN(d.getTime()) ? null : d;
  }
  if (Array.isArray(value)) {
    return value.map(deserializeEntitlementDates);
  }
  if (value && typeof value === 'object') {
    var out = {};
    Object.keys(value).forEach(function (k) {
      out[k] = deserializeEntitlementDates(value[k]);
    });
    return out;
  }
  return value;
}

function writeEntitlementCache(userId, subscription) {
  if (!userId || !subscription || typeof subscription !== 'object') return;
  try {
    var payload = {
      cachedAt: Date.now(),
      uid: userId,
      data: serializeEntitlementDates(subscription)
    };
    localStorage.setItem(entitlementCacheKey(userId), JSON.stringify(payload));
  } catch (cacheErr) {
    console.warn('[UserProfile] entitlement cache write failed:', cacheErr && cacheErr.message);
  }
}

function readEntitlementCache(userId) {
  if (!userId) return null;
  try {
    var raw = localStorage.getItem(entitlementCacheKey(userId));
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    if (!parsed || parsed.uid !== userId || !parsed.data) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function applyEntitlementFromOfflineCache(userId) {
  var cached = readEntitlementCache(userId);
  if (!cached || !cached.data) return false;
  window.currentUserSubscription = deserializeEntitlementDates(cached.data);
  window.currentUserSubscription.__fromOfflineCache = true;
  window.currentUserSubscription.__offlineCacheTs = cached.cachedAt;
  console.log('[UserProfile] Using offline entitlement cache from', new Date(cached.cachedAt).toISOString());
  return true;
}

async function loadPaymentsGateForUser(userId) {
  const gate = {
    paymentsEnabled: false,
    canTestPayments: false,
    isAdmin: false,
    allowed: false,
    loadedAt: Date.now()
  };

  if (!userId) {
    window.paymentsGate = gate;
    return gate;
  }

  const readCache = (key, maxAgeMs) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.ts || (Date.now() - parsed.ts) > maxAgeMs) return null;
      return parsed.data || null;
    } catch (_) {
      return null;
    }
  };

  const writeCache = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data: data || {} }));
    } catch (_) {}
  };

  let appConfig = null;
  try {
    appConfig = readCache('appConfig_cache_v1', 10 * 60 * 1000);
  } catch (_) {
    appConfig = null;
  }

  if (!appConfig) {
    try {
      const cfgRef = firebase.firestore().collection('config').doc('app');
      const cfgSnap = await cfgRef.get();
      appConfig = cfgSnap.exists ? (cfgSnap.data() || {}) : {};
      writeCache('appConfig_cache_v1', appConfig);
    } catch (_) {
      appConfig = {};
    }
  }

  gate.paymentsEnabled = !!(appConfig && appConfig.paymentsEnabled);

  try {
    const adminUidsFromConfig = (appConfig && Array.isArray(appConfig.adminUids)) ? appConfig.adminUids : [];
    const adminUidsFromWindow = (typeof window !== 'undefined' && Array.isArray(window.ADMIN_UIDS)) ? window.ADMIN_UIDS : [];
    const adminUids = adminUidsFromConfig
      .concat(adminUidsFromWindow)
      .concat(['S1fFr9rXzXQH9ZkPkHRUul8Wg6w1'])
      .map(u => String(u));
    gate.isAdmin = adminUids.indexOf(String(userId)) !== -1;
  } catch (_) {
    gate.isAdmin = false;
  }

  try {
    const userSettingsRef = firebase.firestore().collection('users').doc(userId).collection('settings').doc('app');
    const userSettingsSnap = await userSettingsRef.get();
    const u = userSettingsSnap.exists ? (userSettingsSnap.data() || {}) : {};
    gate.canTestPayments = !!u.canTestPayments;
  } catch (_) {
    gate.canTestPayments = false;
  }

  // Előéles fizetés: bárki fizethet (tesztelő-feketelista opció kivezetve)
  gate.allowed = true;
  window.paymentsGate = gate;
  return gate;
}
window.loadPaymentsGateForUser = loadPaymentsGateForUser;

function captureUserSubscriptionLoadContext(userId) {
  return (window.GurigoAuthSession && window.GurigoAuthSession.captureAuthScopedLoad)
    ? window.GurigoAuthSession.captureAuthScopedLoad()
    : { uid: userId, gen: 0 };
}

function isUserSubscriptionLoadStale(userId, loadCtx) {
  if (!userId) return false;
  if (typeof window.shouldAbortSubscriptionAuth === 'function') {
    return window.shouldAbortSubscriptionAuth({ uid: userId, loadCtx: loadCtx }, userId);
  }
  if (loadCtx && window.GurigoAuthSession && window.GurigoAuthSession.shouldDiscardAuthScopedLoad(loadCtx)) return true;
  try {
    if (window.GurigoAuthSession && window.GurigoAuthSession.isSigningOut()) return true;
    const authUser = firebase.auth().currentUser;
    if (!authUser || authUser.uid !== userId) return true;
  } catch (_) {
    return true;
  }
  return false;
}

// === ENTITLEMENT RESOLUTION HELPERS ===
function resetEntitlementState() {
  window.currentUserSubscription = { __entitlementResolved: false };
  __gurigoLastNotifiedPresentation = 'unknown';
}
window.resetEntitlementState = resetEntitlementState;

function onEntitlementResolved(callback) {
  if (typeof callback !== 'function') return;
  if (__gurigoEntitlementCallbacks.indexOf(callback) === -1) {
    __gurigoEntitlementCallbacks.push(callback);
  }
  if (window.currentUserSubscription && window.currentUserSubscription.__entitlementResolved === true) {
    try {
      callback(window.getEntitlementPresentationState(), window.getEffectiveSubscriptionTier());
    } catch (_) {}
  }
}

function notifyEntitlementResolved(reason) {
  const sub = window.currentUserSubscription || { __entitlementResolved: false };
  if (sub.__entitlementResolved !== true) return;
  const presentation = (typeof window.getEntitlementPresentationState === 'function')
    ? window.getEntitlementPresentationState()
    : 'unknown';
  const effective = (typeof window.getEffectiveSubscriptionTier === 'function')
    ? window.getEffectiveSubscriptionTier()
    : 'free';
  if (presentation === __gurigoLastNotifiedPresentation) return;
  __gurigoLastNotifiedPresentation = presentation;

  if (typeof window.GurigoBootMarks !== 'undefined' && typeof window.GurigoBootMarks.mark === 'function') {
    try { window.GurigoBootMarks.mark('entitlement_changed'); } catch (_) {}
  }

  for (var i = 0; i < __gurigoEntitlementCallbacks.length; i++) {
    try { __gurigoEntitlementCallbacks[i](presentation, effective); } catch (_) {}
  }

  // Direct safe re-renders of known paid UI surfaces.
  if (typeof renderSubscriptionInfo === 'function') {
    try { renderSubscriptionInfo(); } catch (_) {}
  }
  if (typeof renderTachographStatusCard === 'function') {
    try { renderTachographStatusCard(); } catch (_) {}
  }
  if (typeof renderTachographAnalysis === 'function') {
    try { renderTachographAnalysis(); } catch (_) {}
  }
  if (typeof window.renderDocumentsManager === 'function') {
    try { window.renderDocumentsManager(); } catch (_) {}
  }
  if (typeof renderLiveTabView === 'function') {
    try { renderLiveTabView(); } catch (_) {}
  }
  if (typeof window.renderFuelingTab === 'function') {
    try { window.renderFuelingTab(false); } catch (_) {}
  }
  if (typeof window.renderVehiclesTab === 'function') {
    try { window.renderVehiclesTab(false); } catch (_) {}
  }

  if (reason) {
    console.log('[UserProfile] entitlement resolved / changed:', { reason: reason, presentation: presentation, effective: effective });
  }
}

async function readCanonicalEntitlementsMain(userId, options) {
  if (!userId || typeof firebase === 'undefined' || !firebase.firestore) {
    return window.currentUserSubscription || { __entitlementResolved: false };
  }
  const opts = (options && typeof options === 'object') ? options : {};
  const loadCtx = opts.loadCtx || captureUserSubscriptionLoadContext(userId);
  const force = opts.force === true;

  if (!force && __gurigoEntitlementReadInFlight && __gurigoEntitlementReadInFlightUid === userId) {
    return __gurigoEntitlementReadInFlight;
  }

  __gurigoEntitlementReadInFlightUid = userId;
  __gurigoEntitlementReadInFlight = (async function () {
    if (typeof window.GurigoBootMarks !== 'undefined' && typeof window.GurigoBootMarks.mark === 'function') {
      try { window.GurigoBootMarks.mark('entitlement_read_start'); } catch (_) {}
    }
    const sub = window.currentUserSubscription || { __entitlementResolved: false };
    sub.__entitlementReadStarted = true;
    try {
      const entRef = firebase.firestore()
        .collection('users').doc(userId)
        .collection('entitlements').doc('main');
      const snap = await entRef.get();

      // Stale-load guard: do not mutate or notify if user switched or load was cancelled.
      if (isUserSubscriptionLoadStale(userId, loadCtx)) {
        console.warn('[UserProfile] canonical read stale after await for:', userId);
        return sub;
      }
      if (window.currentUserSubscription !== sub) {
        console.warn('[UserProfile] global subscription object changed during canonical read, discarding:', userId);
        return sub;
      }

      if (snap && snap.exists) {
        const e = snap.data() || {};
        if (typeof e.isPro === 'boolean') {
          sub.entitlementsIsPro = e.isPro;
        }
        if (typeof e.provider === 'string') {
          sub.entitlementsProvider = e.provider;
        }
        if (typeof e.isTester === 'boolean') {
          sub.entitlementsIsTester = e.isTester;
        }
        if (e.expiresAt) {
          sub.entitlementsExpiresAt =
            (typeof e.expiresAt.toDate === 'function') ? e.expiresAt.toDate() : new Date(e.expiresAt);
        }
        if (e.adminGift && typeof e.adminGift === 'object') {
          sub.entitlementsAdminGift = e.adminGift;
          sub.adminGiftGrantsPro = e.adminGift.contributesPro === true;
          sub.adminGiftLifetimeActive = e.adminGift.isLifetime === true && e.adminGift.contributesPro === true;
          sub.entitlementsAdminGiftContributes = e.adminGift.contributesPro === true;
          if (e.adminGift.endsAt && typeof e.adminGift.endsAt.toDate === 'function') {
            sub.adminGiftEndsAt = e.adminGift.endsAt.toDate();
          }
        }
        // Canonical doc read is a trusted resolution, even if it says nothing.
        sub.__entitlementResolved = true;
        sub.__entitlementResolvedFrom = 'canonical';
      } else if (sub.__entitlementResolved === true) {
        // Keep an already-resolved state (e.g. from createUserProfile on first login).
        sub.__entitlementResolvedFrom = sub.__entitlementResolvedFrom || 'pre_resolved';
      } else {
        // No canonical doc yet — resolve as "no entitlement".
        sub.__entitlementResolved = true;
        sub.__entitlementResolvedFrom = 'missing_canonical';
      }
      sub.__entitlementResolvedAt = Date.now();
      sub.__entitlementResolvedFor = userId;
      window.currentUserSubscription = sub;
      if (typeof window.GurigoBootMarks !== 'undefined' && typeof window.GurigoBootMarks.mark === 'function') {
        try { window.GurigoBootMarks.mark('entitlement_resolved'); } catch (_) {}
      }
    } catch (err) {
      console.warn('[UserProfile] canonical entitlements/main read failed:', err && err.message);
      // Do not mark resolved on failure; UI will remain in the unknown/loading state.
      if (sub.__entitlementResolved !== true) {
        sub.__entitlementResolved = false;
      }
    }
    if (typeof window.GurigoBootMarks !== 'undefined' && typeof window.GurigoBootMarks.mark === 'function') {
      try { window.GurigoBootMarks.mark('entitlement_read_end'); } catch (_) {}
    }
    return sub;
  })();

  return __gurigoEntitlementReadInFlight;
}

window.onEntitlementResolved = onEntitlementResolved;
window.notifyEntitlementResolved = notifyEntitlementResolved;

// === ELŐFIZETÉS BETÖLTÉSE (fast wrapper) ===
async function loadUserSubscription(userId, options) {
  const loadOpts = (options && typeof options === 'object') ? options : {};
  const refreshDocuments = loadOpts.refreshDocuments === true;
  const loadCtx = captureUserSubscriptionLoadContext(userId);

  if (!userId) {
    window.currentUserSubscription = { tier: 'free', __entitlementResolved: false };
    try {
      await loadPaymentsGateForUser(null);
    } catch (_) {}
    return;
  }

  const force = loadOpts.forceRefresh === true;
  const alreadyResolvedFor =
    window.currentUserSubscription &&
    window.currentUserSubscription.__entitlementResolvedFor === userId &&
    window.currentUserSubscription.__entitlementResolved === true;
  if (!force && alreadyResolvedFor) {
    // Already resolved for this same UID; skip unless this is an explicit refresh.
    return;
  }

  // Start from a clean unresolved state for this user (unless a load is already in flight for the same UID).
  if (!window.currentUserSubscription || window.currentUserSubscription.__entitlementResolvedFor !== userId) {
    resetEntitlementState();
    window.currentUserSubscription = { __entitlementResolved: false, __entitlementResolvedFor: userId };
  }

  // Return an existing in-flight load for this UID, unless force-refresh requested.
  if (!force && __gurigoEntitlementLoadInFlight && __gurigoEntitlementLoadInFlightUid === userId) {
    return __gurigoEntitlementLoadInFlight;
  }

  __gurigoEntitlementLoadInFlightUid = userId;
  __gurigoEntitlementLoadInFlight = (async function () {
  try {
    try {
      if (typeof window.ensureFirestorePersistence === 'function') {
        await window.ensureFirestorePersistence();
      }
    } catch (_) {}

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      applyEntitlementFromOfflineCache(userId);
      // Offline cache does not resolve entitlement for authorization, but the app should not block.
      return;
    }

    // === FIRST CORRECT ENTITLEMENT PAINT: canonical entitlements/main read ===
    if (typeof window.GurigoBootMarks !== 'undefined' && typeof window.GurigoBootMarks.mark === 'function') {
      try { window.GurigoBootMarks.mark('auth_ready'); } catch (_) {}
    }
    try {
      await readCanonicalEntitlementsMain(userId, { loadCtx: loadCtx, force: force });
    } catch (readErr) {
      console.warn('[UserProfile] first canonical read failed (continuing):', readErr && readErr.message);
    }

    if (isUserSubscriptionLoadStale(userId, loadCtx)) return;

    // Notify affected UI so the first paint can be correct immediately after one Firestore read.
    if (window.currentUserSubscription && window.currentUserSubscription.__entitlementResolved === true) {
      try { notifyEntitlementResolved('canonical_first_read'); } catch (_) {}
    }

    // === BACKGROUND RECONCILIATION AND FULL SUBSCRIPTION STATE ===
    // Recompute + profile/settings/archival read is now off the first-paint critical path.
    loadUserSubscriptionFull(userId, { refreshDocuments: refreshDocuments, loadCtx: loadCtx }).catch(function (bgErr) {
      console.warn('[UserProfile] background subscription reconciliation failed:', bgErr && bgErr.message);
    });
  } catch (error) {
    if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
    console.warn('Error loading subscription fast path:', error && (error.message || error));
    if (window.currentUserSubscription && window.currentUserSubscription.__entitlementResolved === true) {
      return;
    }
    if (!applyEntitlementFromOfflineCache(userId)) {
      window.currentUserSubscription = { __entitlementResolved: false, __entitlementResolvedFor: userId };
    }
  }
})();

__gurigoEntitlementLoadInFlight = __gurigoEntitlementLoadInFlight.finally(function () {
  // Keep the promise around so callers can await it, but allow a new force-refresh later.
  if (__gurigoEntitlementLoadInFlightUid === userId) {
    __gurigoEntitlementLoadInFlightUid = null;
  }
});

return __gurigoEntitlementLoadInFlight;
}

// === FULL SUBSCRIPTION RECONCILIATION (background, after first canonical read) ===
async function loadUserSubscriptionFull(userId, options) {
  const loadOpts = (options && typeof options === 'object') ? options : {};
  const refreshDocuments = loadOpts.refreshDocuments === true;
  const loadCtx = loadOpts.loadCtx || captureUserSubscriptionLoadContext(userId);

  var draft;
  var commitTarget;
  var activeSub = window.currentUserSubscription;
  if (activeSub && activeSub.__entitlementResolvedFor === userId) {
    draft = Object.assign({}, activeSub);
    commitTarget = activeSub;
  } else {
    draft = { __entitlementResolvedFor: userId };
    commitTarget = activeSub;
  }

  if (!userId) return;
  try {
    if (typeof window.GurigoBootMarks !== 'undefined' && typeof window.GurigoBootMarks.mark === 'function') {
      try { window.GurigoBootMarks.mark('entitlement_recompute_start'); } catch (_) {}
    }
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.onLine &&
        typeof refreshSubscriptionEntitlementsOnLogin === 'function'
      ) {
        await refreshSubscriptionEntitlementsOnLogin(userId);
      }
    } catch (refreshErr) {
      if (typeof window.GurigoBootMarks !== 'undefined' && typeof window.GurigoBootMarks.mark === 'function') {
        try { window.GurigoBootMarks.mark('entitlement_recompute_end'); } catch (_) {}
      }
      console.warn(
        '[UserProfile] subscription entitlement refresh failed (continuing):',
        refreshErr && refreshErr.message ? refreshErr.message : refreshErr,
      );
    }

    if (typeof window.GurigoBootMarks !== 'undefined' && typeof window.GurigoBootMarks.mark === 'function') {
      try { window.GurigoBootMarks.mark('entitlement_recompute_end'); } catch (_) {}
    }

    if (isUserSubscriptionLoadStale(userId, loadCtx)) return;

    const ref = firebase.firestore().collection('users').doc(userId).collection('profile').doc('info');
    const snap = await ref.get();
    if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
    if (snap.exists) {
      let data = snap.data();
    // Regisztrációs ország: csak profilból, soha ne számlázásból (árkijelzéshez)
    data.registrationCountryCode = data.countryCode || null;
    // If countryCode not in profile/info, try to get from main profile document
    if (!data.countryCode) {
      try {
        const mainProfileRef = firebase.firestore().collection('users').doc(userId);
        const mainProfileSnap = await mainProfileRef.get();
        if (mainProfileSnap.exists) {
          const mainData = mainProfileSnap.data();
          if (mainData.countryCode) {
            data.countryCode = mainData.countryCode;
            data.registrationCountryCode = mainData.countryCode;
            console.log('[UserProfile] Loaded countryCode from main profile:', mainData.countryCode);
            if (draft) {
              draft.countryCode = mainData.countryCode;
            }
          }
        }
      } catch (err) {
        console.warn('[UserProfile] Failed to load countryCode from main profile:', err);
      }
    }
    // registrationCountryCode soha nem számlázásból; ha még nincs, marad null
    // If still no countryCode, try to load from billing-info (csak countryCode, nem registrationCountryCode – ár mindig regisztrációból)
    if (!data.countryCode) {
      try {
        const billingInfoSnap = await firebase.firestore()
          .collection('users')
          .doc(userId)
          .collection('settings')
          .doc('billing-info')
          .get();
        if (billingInfoSnap.exists) {
          const billingData = billingInfoSnap.data();
          if (billingData.country) {
            data.countryCode = billingData.country;
            console.log('[UserProfile] Loaded countryCode from billing-info:', billingData.country);
            if (draft) {
              draft.countryCode = billingData.country;
            }
          }
        }
      } catch (err) {
        console.warn('[UserProfile] Failed to load countryCode from billing-info:', err);
      }
    }
    
    const expiry = data.subscriptionExpiry && typeof data.subscriptionExpiry.toDate === 'function'
        ? data.subscriptionExpiry.toDate()
        : (data.subscriptionExpiry || null);
      const archivalExpiry = data.archivalExpiry && typeof data.archivalExpiry.toDate === 'function'
        ? data.archivalExpiry.toDate()
        : (data.archivalExpiry || null);
      const archivalGracePeriodUntil = data.archivalGracePeriodUntil && typeof data.archivalGracePeriodUntil.toDate === 'function'
        ? data.archivalGracePeriodUntil.toDate()
        : (data.archivalGracePeriodUntil || null);
      const archivalStatus = data.archivalStatus || null;
      let archivalActive = (typeof data.archivalActive === 'boolean') ? data.archivalActive : undefined;
      if (archivalStatus === 'grace_period') {
        archivalActive = false;
      } else if (
        archivalStatus === 'payment_grace' ||
        archivalStatus === 'billing_retry'
      ) {
        archivalActive = typeof data.archivalActive === 'boolean' ? data.archivalActive : true;
      } else if (!archivalStatus && archivalGracePeriodUntil) {
        archivalActive = false;
      }
      const subscriptionDowngradeGraceUntil = data.subscriptionDowngradeGraceUntil && typeof data.subscriptionDowngradeGraceUntil.toDate === 'function'
        ? data.subscriptionDowngradeGraceUntil.toDate()
        : (data.subscriptionDowngradeGraceUntil || null);
      const subscriptionPaymentGraceUntil = data.subscriptionPaymentGraceUntil && typeof data.subscriptionPaymentGraceUntil.toDate === 'function'
        ? data.subscriptionPaymentGraceUntil.toDate()
        : (data.subscriptionPaymentGraceUntil || null);
      const archivalPaymentGraceUntil = data.archivalPaymentGraceUntil && typeof data.archivalPaymentGraceUntil.toDate === 'function'
        ? data.archivalPaymentGraceUntil.toDate()
        : (data.archivalPaymentGraceUntil || null);

      if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
      if (!commitTarget || commitTarget.__entitlementResolvedFor !== userId) {
        console.warn('[UserProfile] full load target user mismatch, discarding profile hydration for:', userId);
        return;
      }

      Object.assign(
        draft,
        {
          tier: (data.subscriptionTier === 'max') ? 'pro' : ((data.subscriptionTier === 'guest') ? 'free' : (data.subscriptionTier || 'free')),
          expiry: expiry,
          stripeCustomerId: data.stripeCustomerId || null,
          countryCode: data.countryCode || null,
          registrationCountryCode: data.registrationCountryCode || null,
          archivalTier: data.archivalTier || null,
          archivalActive: archivalActive,
          archivalStatus: archivalStatus,
          archivalExpiry: archivalExpiry,
          archivalCancelAtPeriodEnd: data.archivalCancelAtPeriodEnd || false,
          archivalGracePeriodUntil: archivalGracePeriodUntil,
          subscriptionDowngradeGraceUntil: subscriptionDowngradeGraceUntil,
          subscriptionPaymentFailed: !!data.subscriptionPaymentFailed,
          subscriptionPaymentGraceUntil: subscriptionPaymentGraceUntil,
          archivalPaymentFailed: !!data.archivalPaymentFailed,
          archivalPaymentGraceUntil: archivalPaymentGraceUntil,
          isActive: data.isActive !== false, // Kényelmi mező, nem jogosultság alapja
          winbackEligible: typeof data.winbackEligible === 'boolean' ? data.winbackEligible : true,
          winbackRedeemedAt: data.winbackRedeemedAt || null,
          __entitlementResolvedFor: userId
        }
      );

      try {
        const settingsRef = firebase.firestore().collection('users').doc(userId).collection('settings').doc('subscription');
        const settingsSnap = await settingsRef.get();
        if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
        if (!commitTarget || commitTarget.__entitlementResolvedFor !== userId) return;
        if (settingsSnap.exists) {
          const s = settingsSnap.data() || {};
          const pickDate = (v) => {
            try {
              if (!v) return null;
              if (typeof v.toDate === 'function') return v.toDate();
              if (v instanceof Date) return v;
              return new Date(v);
            } catch (_) {
              return null;
            }
          };
          const periodEnd = (s.currentPeriodEnd && typeof s.currentPeriodEnd.toDate === 'function')
            ? s.currentPeriodEnd.toDate()
            : (s.currentPeriodEnd || null);
          if (typeof s.cancelAtPeriodEnd === 'boolean') {
            draft.cancelAtPeriodEnd = s.cancelAtPeriodEnd;
          }
          if (periodEnd) {
            draft.expiry = periodEnd;
          }

          if (s.downgradeGraceUntil) {
            draft.subscriptionDowngradeGraceUntil = pickDate(s.downgradeGraceUntil);
          }
          if (typeof s.status === 'string') {
            draft.subscriptionStatus = s.status;
            draft.status = s.status;
          } else if (typeof s.subscriptionStatus === 'string') {
            draft.subscriptionStatus = s.subscriptionStatus;
            draft.status = s.subscriptionStatus;
          }
          if (periodEnd) {
            draft.currentPeriodEnd = periodEnd;
          }
          const activeUntilDate = pickDate(s.activeUntil);
          if (activeUntilDate) {
            draft.activeUntil = activeUntilDate;
          }

          const trialStartedAt = pickDate(s.trialStartedAt);
          const trialEnd = pickDate(s.trialEnd);
          const trialUpsellSnoozeUntil = pickDate(s.trialUpsellSnoozeUntil);
          const trialUpsellLastShownAt = pickDate(s.trialUpsellLastShownAt);
          if (trialStartedAt) draft.trialStartedAt = trialStartedAt;
          if (trialEnd) draft.trialEnd = trialEnd;
          if (typeof s.trialUpsellOptOut === 'boolean') {
            draft.trialUpsellOptOut = s.trialUpsellOptOut;
          }
          if (trialUpsellSnoozeUntil) draft.trialUpsellSnoozeUntil = trialUpsellSnoozeUntil;
          if (trialUpsellLastShownAt) draft.trialUpsellLastShownAt = trialUpsellLastShownAt;
          if (typeof s.stripeSubscriptionId === 'string' && s.stripeSubscriptionId.trim()) {
            draft.stripeSubscriptionId = s.stripeSubscriptionId.trim();
          }
          if (typeof s.stripeCustomerId === 'string' && s.stripeCustomerId.trim()) {
            draft.stripeCustomerId = s.stripeCustomerId.trim();
          }
          if (s.billingCycleDay != null) {
            const bcd = Number(s.billingCycleDay);
            if (Number.isInteger(bcd) && bcd >= 1 && bcd <= 31) {
              draft.billingCycleDay = bcd;
            }
          }
          const billingCycleAnchorAt = pickDate(s.billingCycleAnchorAt);
          if (billingCycleAnchorAt) {
            draft.billingCycleAnchorAt = billingCycleAnchorAt;
          }
          if (s.billingCycleChange && typeof s.billingCycleChange === 'object') {
            draft.billingCycleChange = s.billingCycleChange;
          }
          if (typeof s.isTrial === 'boolean') {
            draft.isTrial = s.isTrial;
          } else if (trialStartedAt && trialEnd && !s.stripeSubscriptionId) {
            draft.isTrial = true;
          } else {
            draft.isTrial = false;
          }
          if (s.paymentFailed === true) {
            draft.subscriptionPaymentFailed = true;
          }
          const settingsPaymentGraceUntil = pickDate(s.paymentGraceUntil);
          if (settingsPaymentGraceUntil) {
            draft.subscriptionPaymentGraceUntil = settingsPaymentGraceUntil;
          }
          if (s.archivalPaymentFailed === true) {
            draft.archivalPaymentFailed = true;
          }
          const settingsArchivalPaymentGraceUntil = pickDate(s.archivalPaymentGraceUntil);
          if (settingsArchivalPaymentGraceUntil) {
            draft.archivalPaymentGraceUntil = settingsArchivalPaymentGraceUntil;
          }
          if (typeof s.archivalStatus === 'string' && s.archivalStatus.trim()) {
            draft.settingsSubscriptionArchivalStatus = s.archivalStatus.trim().toLowerCase();
          }
          draft.settingsSubscription = {
            paymentFailed: s.paymentFailed === true,
            status: typeof s.status === 'string' ? s.status.trim().toLowerCase() : null,
            subscriptionStatus: typeof s.subscriptionStatus === 'string' ? s.subscriptionStatus.trim().toLowerCase() : null,
            paymentGraceUntil: settingsPaymentGraceUntil || null,
            archivalPaymentFailed: s.archivalPaymentFailed === true,
            archivalStatus: typeof s.archivalStatus === 'string' ? s.archivalStatus.trim().toLowerCase() : null,
            archivalPaymentGraceUntil: settingsArchivalPaymentGraceUntil || null,
          };
          // Documents Manager trial
          if (s.documentsManagerTrialUntil) {
            draft.documentsManagerTrialUntil = pickDate(s.documentsManagerTrialUntil);
          }
          // Archival tier override from settings (Stripe webhook updates this)
          if (typeof s.archivalTier === 'string' && s.archivalTier.trim()) {
            draft.archivalTier = s.archivalTier.trim();
          }
          if (typeof s.archivalActive === 'boolean') {
            const profileArchSt = String(draft.archivalStatus || '').trim().toLowerCase();
            const isBillingPaymentGrace =
              profileArchSt === 'payment_grace' || profileArchSt === 'billing_retry';
            const isDocRetentionGraceOnly =
              profileArchSt === 'grace_period' ||
              (!!draft.archivalGracePeriodUntil && !isBillingPaymentGrace);
            if (!isDocRetentionGraceOnly) {
              draft.archivalActive = s.archivalActive;
            }
          }
          if (s.archivalExpiry) {
            draft.archivalExpiry = pickDate(s.archivalExpiry);
          }
          if (s.archivalCancelAtPeriodEnd !== undefined) {
            draft.archivalCancelAtPeriodEnd = s.archivalCancelAtPeriodEnd;
          }
          // Promo state
          if (s.promoState) {
            draft.promoState = s.promoState;
          }
        }
      } catch (_) {}

      try {
        const archivalSettingsSnap = await firebase.firestore()
          .collection('users')
          .doc(userId)
          .collection('settings')
          .doc('archival')
          .get();
        if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
        if (!commitTarget || commitTarget.__entitlementResolvedFor !== userId) return;
        if (archivalSettingsSnap.exists) {
          const a = archivalSettingsSnap.data() || {};
          const pickArchivalDate = (v) => {
            try {
              if (!v) return null;
              if (typeof v.toDate === 'function') return v.toDate();
              if (v instanceof Date) return v;
              return new Date(v);
            } catch (_) {
              return null;
            }
          };
          if (typeof a.stripeSubscriptionId === 'string' && a.stripeSubscriptionId.trim()) {
            draft.archivalStripeSubscriptionId = a.stripeSubscriptionId.trim();
          }
          const archivalSettingsStatus = typeof a.status === 'string' ? a.status.trim().toLowerCase() : '';
          const hasActiveStripeArchivalSettings =
            a.active === true &&
            (
              archivalSettingsStatus === 'active' ||
              archivalSettingsStatus === 'cancel_at_period_end' ||
              archivalSettingsStatus === 'past_due' ||
              archivalSettingsStatus === 'payment_failed'
            ) &&
            !!(draft.archivalStripeSubscriptionId);
          if (hasActiveStripeArchivalSettings) {
            draft.archivalBillingProvider = 'stripe';
          } else if (typeof a.billingProvider === 'string' && a.billingProvider.trim()) {
            draft.archivalBillingProvider = a.billingProvider.trim();
          }
          if (typeof a.status === 'string' && a.status.trim()) {
            draft.archivalStatus = a.status.trim().toLowerCase();
          }
          if (a.paymentFailed === true) {
            draft.archivalPaymentFailed = true;
          }
          const settingsPaymentGraceUntil = pickArchivalDate(a.paymentGraceUntil);
          if (settingsPaymentGraceUntil) {
            draft.archivalPaymentGraceUntil = settingsPaymentGraceUntil;
          }
          if (a.cancelAtPeriodEnd === true) {
            draft.archivalCancelAtPeriodEnd = true;
          }
          const settingsPeriodEnd =
            pickArchivalDate(a.currentPeriodEnd) ||
            pickArchivalDate(a.activeUntil);
          const settingsArchivalExpiry =
            pickArchivalDate(a.archivalExpiry) ||
            pickArchivalDate(a.expiry) ||
            settingsPeriodEnd;
          if (settingsPeriodEnd) {
            draft.archivalCurrentPeriodEnd = settingsPeriodEnd;
            if (!draft.archivalExpiry) {
              draft.archivalExpiry = settingsPeriodEnd;
            }
          }
          if (settingsArchivalExpiry && !draft.archivalExpiry) {
            draft.archivalExpiry = settingsArchivalExpiry;
          }
          const settingsGraceUntil = pickArchivalDate(a.gracePeriodUntil);
          if (settingsGraceUntil) {
            draft.archivalGracePeriodUntil = settingsGraceUntil;
          }
          draft.settingsArchival = {
            currentPeriodEnd: settingsPeriodEnd || null,
            activeUntil: pickArchivalDate(a.activeUntil) || settingsPeriodEnd || null,
            archivalExpiry: settingsArchivalExpiry || settingsPeriodEnd || null,
            gracePeriodUntil: settingsGraceUntil || null,
            status: archivalSettingsStatus || null,
            active: typeof a.active === 'boolean' ? a.active : null,
            billingProvider: typeof a.billingProvider === 'string' ? a.billingProvider.trim() : null,
            paymentFailed: a.paymentFailed === true,
            paymentGraceUntil: settingsPaymentGraceUntil || null,
          };
          if (typeof a.active === 'boolean') {
            const archivalSettingsStatus = typeof a.status === 'string' ? a.status.trim().toLowerCase() : '';
            const isDocumentRetentionGrace = archivalSettingsStatus === 'grace_period';
            const isBillingPaymentGrace =
              archivalSettingsStatus === 'payment_grace' || archivalSettingsStatus === 'billing_retry';
            if (
              isDocumentRetentionGrace ||
              (
                settingsGraceUntil &&
                archivalSettingsStatus !== 'cancel_at_period_end' &&
                !isBillingPaymentGrace
              )
            ) {
              draft.archivalActive = false;
            } else if (
              draft.archivalStatus !== 'grace_period' &&
              !draft.archivalGracePeriodUntil
            ) {
              draft.archivalActive = a.active;
            }
          }
        }
      } catch (_) {}

      // Entitlement adatok betöltése (admin ajándék / Lifetime Pro) – nem blokkoló
      try {
        if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
        if (!commitTarget || commitTarget.__entitlementResolvedFor !== userId) {
          console.warn('[UserProfile] full load target user mismatch before canonical re-read for:', userId);
          return;
        }
        const entRef = firebase.firestore()
          .collection('users').doc(userId)
          .collection('entitlements').doc('main');
        const entSnap = await entRef.get();

        // Stale guard after canonical re-read: do not write User A data into User B's object.
        if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
        if (!commitTarget || commitTarget.__entitlementResolvedFor !== userId) return;

        if (entSnap.exists) {
          const e = entSnap.data() || {};
          if (typeof e.isPro === 'boolean') {
            draft.entitlementsIsPro = e.isPro;
          }
          if (typeof e.provider === 'string') {
            draft.entitlementsProvider = e.provider;
          }
          if (typeof e.isTester === 'boolean') {
            draft.entitlementsIsTester = e.isTester;
          }
          if (e.expiresAt) {
            draft.entitlementsExpiresAt =
              (typeof e.expiresAt.toDate === 'function') ? e.expiresAt.toDate() : new Date(e.expiresAt);
          }
          if (e.adminGift && typeof e.adminGift === 'object') {
            draft.entitlementsAdminGift = e.adminGift;
            draft.adminGiftGrantsPro = e.adminGift.contributesPro === true;
            draft.adminGiftLifetimeActive =
              e.adminGift.isLifetime === true && e.adminGift.contributesPro === true;
            draft.entitlementsAdminGiftContributes =
              e.adminGift.contributesPro === true;
            if (e.adminGift.endsAt && typeof e.adminGift.endsAt.toDate === 'function') {
              draft.adminGiftEndsAt = e.adminGift.endsAt.toDate();
            }
          }
        }
        // Full background load is a trusted resolution, even if the very first read had failed.
        draft.__entitlementResolved = true;
        draft.__entitlementResolvedFor = userId;
        draft.__entitlementResolvedFrom = 'recompute';
        draft.__entitlementResolvedAt = Date.now();
      } catch (_) {}

      // If countryCode is not in profile, try to load from billing-info
      if (!draft.countryCode) {
        try {
          const billingInfoSnap = await firebase.firestore()
            .collection('users')
            .doc(userId)
            .collection('settings')
            .doc('billing-info')
            .get();
          if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
          if (!commitTarget || commitTarget.__entitlementResolvedFor !== userId) return;
          if (billingInfoSnap.exists) {
            const billingData = billingInfoSnap.data();
            if (billingData.country) {
              draft.countryCode = billingData.country;
              console.log('[UserProfile] Loaded countryCode from billing-info:', billingData.country);
            }
          }
        } catch (err) {
          console.warn('[UserProfile] Failed to load countryCode from billing-info:', err);
        }
      }

      // Tesztelő tier: örök érvényesség (soha nem jár le)
      if (draft.tier === 'tester') {
        draft.expiry = null;
        draft.isActive = true;
        draft.cancelAtPeriodEnd = false;
      }
      if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
      if (!commitTarget || commitTarget.__entitlementResolvedFor !== userId) {
        console.warn('[UserProfile] full load target user mismatch at final commit for:', userId);
        return;
      }
      Object.assign(commitTarget, draft);
      if (window.currentUserSubscription !== commitTarget) {
        window.currentUserSubscription = commitTarget;
      }

      // Lejárat ellenőrzés: csak akkor downgrade-olunk free-re, ha a lejárat lejárt
      // ÉS nincs érvényes Pro contributor (próbaidő, canonical entitlement, admin gift, tester, valódi Apple/Stripe Pro).
      // A régi stripeCustomerId (pl. Archiválás csak) NEM védi meg a felhasználót a Pro downgrade-től.
      const effectiveExpiry = draft.expiry;
      const effectiveTier = (typeof window.getEffectiveSubscriptionTier === 'function')
        ? window.getEffectiveSubscriptionTier()
        : draft.tier;
      const hasActiveProContributor = effectiveTier === 'pro' || effectiveTier === 'tester';
      if (
        effectiveExpiry &&
        effectiveExpiry < new Date() &&
        !hasActiveProContributor &&
        typeof navigator !== 'undefined' &&
        navigator.onLine
      ) {
        try {
          if (!isUserSubscriptionLoadStale(userId, loadCtx) && window.currentUserSubscription && window.currentUserSubscription.__entitlementResolvedFor === userId) {
            await downgradeToFree(userId);
          }
        } catch (downgradeError) {
          console.error('Error during downgrade:', downgradeError);
          // Folytatjuk a betöltést, még ha a downgrade sikertelen is
        }
      }
    } else {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
        if (applyEntitlementFromOfflineCache(userId)) {
          if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
          commitTarget = window.currentUserSubscription;
          draft = Object.assign({}, commitTarget);
        } else {
          if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
          commitTarget = { __entitlementResolved: false, __entitlementResolvedFor: userId, tier: 'free' };
          draft = commitTarget;
          window.currentUserSubscription = commitTarget;
        }
      } else {
        if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
        await createUserProfile(userId);
        if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
        if (window.currentUserSubscription && window.currentUserSubscription.__entitlementResolvedFor !== userId) {
          console.warn('[UserProfile] createUserProfile target user mismatch, discarding for:', userId);
          return;
        }
        commitTarget = window.currentUserSubscription;
        draft = Object.assign({}, commitTarget);
      }
    }

    try {
      await loadPaymentsGateForUser(userId);
    } catch (_) {}

    if (isUserSubscriptionLoadStale(userId, loadCtx)) return;

    if (!isUserSubscriptionLoadStale(userId, loadCtx) && window.currentUserSubscription && window.currentUserSubscription.__entitlementResolvedFor === userId && window.currentUserSubscription.tier) {
      writeEntitlementCache(userId, window.currentUserSubscription);
    }

    if (window.currentUserSubscription) {
      console.log('[UserProfile] Subscription loaded', {
        tier: window.currentUserSubscription.tier || null,
        status: window.currentUserSubscription.subscriptionStatus || null
      });
    }

    // Refresh documents reminder banner now that subscription is loaded
    if (typeof window.refreshDocumentsReminder === 'function') {
      try {
        window.refreshDocumentsReminder();
      } catch (_) {}
    }
    if (
      refreshDocuments &&
      typeof window.refreshDocumentsView === 'function' &&
      !window.__gurigoSuppressDocumentsViewRefresh
    ) {
      try {
        window.refreshDocumentsView();
      } catch (_) {}
    }
    if (typeof window.refreshOverviewPaymentProblemBanner === 'function') {
      try {
        window.refreshOverviewPaymentProblemBanner();
      } catch (_) {}
    }

    // Archiválás automatikus szinkron Stripe-ból, ha Firestore-ban nincs (v5 viselkedés: magától frissül)
    const sub = window.currentUserSubscription || {};
    if (
      userId &&
      !sub.archivalTier &&
      !window._archivalSyncAttempted &&
      typeof firebase !== 'undefined' &&
      firebase.app &&
      typeof navigator !== 'undefined' &&
      navigator.onLine
    ) {
      window._archivalSyncAttempted = true;
      // syncArchivalFromStripe is deployed to europe-west1 (window.functions = west3)
      var fnSvc = firebase.app().functions('europe-west1');
      fnSvc.httpsCallable('syncArchivalFromStripe')().then(function (result) {
        const data = result && result.data ? result.data : {};
        if (data.ok && typeof loadUserSubscription === 'function') {
          loadUserSubscription(userId, { refreshDocuments: false, forceRefresh: true });
        }
      }).catch(function (err) { console.warn('[UserProfile] syncArchivalFromStripe failed:', err && err.message); });
    }

    // UI frissítés: értesítsük az érintett felületeket a végleges entitásról.
    if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
    if (window.currentUserSubscription && window.currentUserSubscription.__entitlementResolvedFor === userId) {
      try { notifyEntitlementResolved('recompute'); } catch (_) {}
    }
  } catch (error) {
    if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
    console.warn('Error loading subscription:', error && (error.message || error));
    if (window.currentUserSubscription && window.currentUserSubscription.__entitlementResolved === true) {
      // First canonical read already succeeded; do not clobber its resolution.
      return;
    }
    if (window.currentUserSubscription && window.currentUserSubscription.__entitlementResolvedFor !== userId) {
      console.warn('[UserProfile] full load error target user mismatch, not resetting:', userId);
      return;
    }
    if (!applyEntitlementFromOfflineCache(userId)) {
      window.currentUserSubscription = { tier: 'free', __entitlementResolved: false, __entitlementResolvedFor: userId };
    }
  }
}

// === PROFIL LÉTREHOZÁSA (első bejelentkezés) ===
// === V6.03.21 BUG FIX (P2) ===
// KORÁBBAN: a batch.commit() hibája egy try/catch-ben elnyelődött, így a hívó
//   loadUserSubscription nem tudott róla, a handleAuthStateChange folytatta a flow-t,
//   és a trackLogin létrehozott egy csontváz docot. Race-bug → free tier áldozatok.
// MOSTANTÓL: 3x próba exponential backoff-fal (200ms, 600ms, 1500ms), és a végső
//   hiba TOVÁBB DOBÓDIK, hogy a hívó kezelhesse. Ezenkívül a settings/subscription
//   írást SZÉTVÁLASZTOTTUK a profile/info írástól, hogy a settings-rules permission-
//   denied ne dobja el az egész batch-et (a profil legalább létrejön → ensureUserProfile
//   self-healing pótolni tudja a settings-et a következő bejelentkezésnél).
function buildRegistrationInfoForProfile(user, countryCode) {
  var language = 'hu';
  try {
    language = String(localStorage.getItem('language') || 'hu').toLowerCase().slice(0, 2);
  } catch (_) { /* ignore */ }

  var platform = 'unknown';
  try {
    var ci = typeof detectClientInfo === 'function' ? detectClientInfo() : null;
    var src = ci && ci.appSource ? String(ci.appSource).toLowerCase() : '';
    if (src === 'web' || src === 'google_play' || src === 'app_store') {
      platform = src;
    } else if (ci && ci.platform === 'web_pwa') {
      platform = 'web';
    } else if (ci && ci.platform === 'android_native') {
      platform = 'google_play';
    } else if (ci && ci.platform === 'ios_native') {
      platform = 'app_store';
    }
  } catch (_) { /* ignore */ }

  var initialAuthProvider = 'unknown';
  try {
    var pid = user && typeof resolveAuthUserProviderId === 'function'
      ? resolveAuthUserProviderId(user)
      : null;
    if (pid === 'google.com') initialAuthProvider = 'google';
    else if (pid === 'apple.com') initialAuthProvider = 'apple';
    else if (pid === 'password') initialAuthProvider = 'password';
  } catch (_) { /* ignore */ }

  return {
    country: countryCode || 'HU',
    language: language,
    platform: platform,
    initialAuthProvider: initialAuthProvider,
    registeredAt: firebase.firestore.FieldValue.serverTimestamp()
  };
}

async function createUserProfile(userId) {
  const user = firebase.auth().currentUser;
  const userRef = firebase.firestore().collection('users').doc(userId);
  const profileRef = userRef.collection('profile').doc('info');
  const settingsRef = userRef.collection('settings').doc('subscription');

  const now = new Date();
  const TRIAL_DURATION_MS = 42 * 24 * 60 * 60 * 1000;
  const trialEndDate = new Date(now.getTime() + TRIAL_DURATION_MS);

  const inferredCountry = inferCountryCode();
  const registrationInfo = buildRegistrationInfoForProfile(user, inferredCountry);
  const profileData = {
    displayName: (user && user.displayName) || '',
    email: (user && user.email) || '',
    countryCode: inferredCountry,
    registrationCountryCode: inferredCountry,
    countryConfirmed: false,
    language: registrationInfo.language || 'hu',
    subscriptionTier: 'pro',            // ← 6 hét PRO próbaidő
    subscriptionExpiry: firebase.firestore.Timestamp.fromDate(trialEndDate),
    stripeCustomerId: null,             // ← Később Stripe webhook tölti ki
    archivalTier: null,                 // ← Alapértelmezett: 6 hét (42 nap)
    archivalExpiry: null,
    isActive: true,                     // ← Kényelmi mező, nem jogosultság alapja
    isTrial: true,                      // ← Próbaidő jelző
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
    registrationInfo: registrationInfo
  };

  const settingsData = {
    tier: 'pro',                        // ← 6 hét PRO próbaidő
    isTrial: true,
    trialStartedAt: firebase.firestore.FieldValue.serverTimestamp(),
    trialEnd: firebase.firestore.Timestamp.fromDate(trialEndDate),
    trialUpsellOptOut: false,
    trialUpsellSnoozeUntil: null,
    trialUpsellLastShownAt: null,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: 'create_user_profile'
  };

  // Retry helper: exponential backoff (200ms, 600ms, 1500ms)
  async function writeWithRetry(label, writeFn) {
    const delays = [0, 200, 600, 1500];
    let lastErr = null;
    for (let i = 0; i < delays.length; i++) {
      if (delays[i] > 0) {
        await new Promise(r => setTimeout(r, delays[i]));
      }
      try {
        await writeFn();
        if (i > 0) {
          console.log('[createUserProfile] ' + label + ' succeeded on retry attempt ' + (i + 1));
        }
        return; // Siker
      } catch (err) {
        lastErr = err;
        const code = (err && err.code) || '';
        const transient = code === 'unavailable' || code === 'deadline-exceeded' ||
                          code === 'aborted' || code === 'internal' ||
                          code === 'resource-exhausted' || code === 'cancelled';
        // Ha permission-denied vagy nem tranziens hiba → ne próbálkozzunk újra
        if (!transient && i > 0) {
          console.warn('[createUserProfile] ' + label + ' non-transient error, stopping retry:', code);
          break;
        }
        console.warn('[createUserProfile] ' + label + ' attempt ' + (i + 1) + ' failed (' + code + '), retrying...');
      }
    }
    throw lastErr;
  }

  let profileWritten = false;
  let settingsWritten = false;

  try {
    // 1) Profil írás (ez a kritikus — ha sikerül, a tier garantáltan PRO)
    await writeWithRetry('profile/info write', () => profileRef.set(profileData, { merge: true }));
    profileWritten = true;

    // 2) Settings írás (ha elbukik, a self-healing pótolja a következő ensureUserProfile-nál
    //    — illetve a következő trial-flow check)
    try {
      await writeWithRetry('settings/subscription write', () => settingsRef.set(settingsData, { merge: true }));
      settingsWritten = true;
    } catch (settingsErr) {
      console.error('[createUserProfile] settings/subscription write failed permanently:', settingsErr);
      // NEM dobunk tovább: a profil már jó, settings a self-healing-re van bízva
    }

    // 3) UI nyelv mentése a transactional e-mailekhez (settings/config.language)
    try {
      const configRef = userRef.collection('settings').doc('config');
      const langToSave = registrationInfo.language || 'hu';
      await writeWithRetry('settings/config language', () => configRef.set({ language: langToSave }, { merge: true }));
    } catch (configErr) {
      console.warn('[createUserProfile] settings/config language write failed:', configErr && configErr.message);
    }

    // Frissítsük a kliens oldali állapotot is
    window.currentUserSubscription = {
      tier: 'pro',                        // ← 6 hét PRO próbaidő
      expiry: trialEndDate,
      isActive: true,
      isTrial: true,
      stripeCustomerId: null,
      archivalTier: null,
      archivalExpiry: null,
      trialStartedAt: now,
      trialEnd: trialEndDate,
      trialUpsellOptOut: false,
      trialUpsellSnoozeUntil: null,
      trialUpsellLastShownAt: null,
      __entitlementResolved: true,
      __entitlementResolvedFrom: 'createUserProfile',
      __entitlementResolvedFor: userId
    };
    console.log('User profile created with 6-week PRO trial' +
                (settingsWritten ? '' : ' (settings deferred to self-healing)'));

    // Értesítsük az érintett felületeket.
    try { notifyEntitlementResolved('createUserProfile'); } catch (_) {}
  } catch (error) {
    console.error('Error creating user profile (after retries):', error,
                  '| profileWritten=', profileWritten,
                  '| settingsWritten=', settingsWritten);
    // V6.03.21: TOVÁBB DOBJUK a hibát, hogy a hívó (loadUserSubscription/ensureUserProfile)
    // tudja, hogy nem sikerült a profil létrehozása.
    throw error;
  }
}


// === ELŐFIZETÉS FRISSÍTÉSE ===
async function updateSubscription(userId, newTier, expiryDate) {
  try {
    await firebase.firestore().collection('users').doc(userId).collection('profile').doc('info').update({
      subscriptionTier: newTier,
      subscriptionExpiry: expiryDate || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    window.currentUserSubscription = { 
      tier: newTier, 
      expiry: expiryDate || null,
      stripeCustomerId: window.currentUserSubscription?.stripeCustomerId || null,
      archivalTier: window.currentUserSubscription?.archivalTier || null,
      archivalExpiry: window.currentUserSubscription?.archivalExpiry || null,
      isActive: true,  // Kényelmi mező, nem jogosultság alapja
      __entitlementResolved: true,
      __entitlementResolvedFor: userId,
      __entitlementResolvedFrom: 'updateSubscription'
    };
    console.log('Subscription updated:', newTier);
    if (typeof renderApp === 'function') renderApp();
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

// === LEMONDÁS / LEJÁRAT KEZELÉS ===
async function downgradeToFree(userId, options) {
  // P0: a Pro leminősítés csak akkor fut le, ha nincs érvényes Pro contributor.
  const loadCtx = captureUserSubscriptionLoadContext(userId);
  if (typeof window.getEffectiveSubscriptionTier === 'function') {
    const eff = window.getEffectiveSubscriptionTier();
    if (eff === 'pro' || eff === 'tester') {
      console.warn('[downgradeToFree] Skip: active contributor present', eff);
      return;
    }
  }
  if (isUserSubscriptionLoadStale(userId, loadCtx)) {
    console.warn('[downgradeToFree] stale before profile update for:', userId);
    return;
  }
  try {
    await firebase.firestore().collection('users').doc(userId).collection('profile').doc('info').update({
      subscriptionTier: 'free',
      subscriptionExpiry: null,
      isTrial: false,
      downgradedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (isUserSubscriptionLoadStale(userId, loadCtx)) {
      console.warn('[downgradeToFree] stale after profile update for:', userId);
      return;
    }
    if (window.currentUserSubscription && window.currentUserSubscription.__entitlementResolvedFor !== userId) {
      console.warn('[downgradeToFree] target user mismatch after profile update, discarding for:', userId);
      return;
    }

    window.currentUserSubscription = {
      tier: 'free',
      __entitlementResolved: true,
      __entitlementResolvedFor: userId,
      __entitlementResolvedFrom: 'downgradeToFree'
    };

    if (isUserSubscriptionLoadStale(userId, loadCtx)) return;

    // Egyszeri értesítés megjelenítésének kezelése
    try {
      const settingsRef = firebase.firestore().collection('users').doc(userId).collection('settings').doc('subscription');
      const settingsSnap = await settingsRef.get();

      if (isUserSubscriptionLoadStale(userId, loadCtx)) return;

      const settings = settingsSnap.exists ? (settingsSnap.data() || {}) : {};

      if (!settings.expiredNotificationShown) {
        if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
        await settingsRef.update({ expiredNotificationShown: true });

        if (typeof showCustomAlert === 'function') {
          const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
            ? (translations[currentLang] || {})
            : {};
          const msg = i18n.subscriptionExpiredDowngradeInfo || 'ℹ️ Előfizetésed lejárt, visszaváltottunk Free csomagra.';
          showCustomAlert(msg, 'info');
        }
      }
    } catch (settingsError) {
      if (isUserSubscriptionLoadStale(userId, loadCtx)) return;
      console.warn('Could not persist expired notification flag:', settingsError);
      if (typeof showCustomAlert === 'function') {
        const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
          ? (translations[currentLang] || {})
          : {};
        const msg = i18n.subscriptionExpiredDowngradeInfo || 'ℹ️ Előfizetésed lejárt, visszaváltottunk Free csomagra.';
        showCustomAlert(msg, 'info');
      }
    }
  } catch (error) {
    console.error('Error downgrading:', error);
  }
}

// Globális export
window.loadUserSubscription = loadUserSubscription;
window.createUserProfile = createUserProfile;
window.updateSubscription = updateSubscription;
window.downgradeToFree = downgradeToFree;


// ===== Country inference =====
function inferCountryCode(){
  var lang = (navigator.language || '').toUpperCase();
  var m = lang.match(/-([A-Z]{2})$/);
  if (m && m[1]) return m[1];
  return 'HU';
}


// ===== Ensure user profile (create/patch) =====
async function ensureUserProfile(uid){
  var ref = db.collection('users').doc(uid).collection('profile').doc('info');
  var snap = await ref.get();
  if (!snap.exists){
    var u = firebase.auth().currentUser || {};
    var now = new Date();
    var TRIAL_DURATION_MS = 42 * 24 * 60 * 60 * 1000;
    var trialEndDate = new Date(now.getTime() + TRIAL_DURATION_MS);
    
    var cc = inferCountryCode();
    var registrationInfo = buildRegistrationInfoForProfile(u, cc);
    var data = {
      userId: uid,
      displayName: u.displayName || '',
      email: u.email || '',
      subscriptionTier: 'pro',            // ← 6 hét PRO próbaidő
      subscriptionExpiry: firebase.firestore.Timestamp.fromDate(trialEndDate),
      isTrial: true,                      // ← Próbaidő jelző
      countryCode: cc,
      registrationCountryCode: cc,
      countryConfirmed: false,
      language: registrationInfo.language || 'hu',
      companyId: null,                    // ← Céges kezelés (GuriGO Office)
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      registrationInfo: registrationInfo
    };
    try {
      if (typeof detectClientInfo === 'function') {
        data.clientInfo = detectClientInfo();
      }
    } catch (_) { /* ignore */ }
    await ref.set(data, {merge:true});
    window.userCompanyId = null;

    try {
      await db.collection('users')
        .doc(uid)
        .collection('settings')
        .doc('subscription')
        .set({
          tier: 'pro',                    // ← 6 hét PRO próbaidő
          isTrial: true,
          trialStartedAt: firebase.firestore.FieldValue.serverTimestamp(),
          trialEnd: firebase.firestore.Timestamp.fromDate(trialEndDate),
          trialUpsellOptOut: false,
          trialUpsellSnoozeUntil: null,
          trialUpsellLastShownAt: null,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'ensure_user_profile'
        }, { merge: true });
    } catch (_) {}
    try {
      await db.collection('users').doc(uid).collection('settings').doc('config')
        .set({ language: registrationInfo.language || 'hu' }, { merge: true });
    } catch (_) {}
    return data;
  } else {
    var d = snap.data() || {};
    window.userCompanyId = (d.companyId != null && d.companyId !== '') ? String(d.companyId) : null;
    // === V6.03.21 BUG FIX ===
    // P1: Eltávolítva a 'subscriptionTier = free' legacy backfill (régi line 548).
    //   Korábban: ha egy doc nem tartalmazott tier/isTrial/stripeCustomerId mezőt,
    //   ez 'free'-re patch-elte. Veszélyes: a trackLogin/countryModal által
    //   létrehozott csontváz-docokat is "legacy free user"-nek azonosította.
    //   Mostantól: csak az alapvető identity-mezőket (email/displayName/createdAt)
    //   töltjük be, és NEM döntünk tier-ről. A tier kezelése kizárólag a
    //   createUserProfile / Stripe webhook / downgradeToFree felelőssége.
    // P4: Self-healing — ha a doc létezik DE hiányos (nincs subscriptionTier
    //   sem isTrial sem stripeCustomerId), akkor sérült regisztráció áldozata.
    //   Ilyenkor meghívjuk a createUserProfile-t az áldozat helyrehozására.
    var patch = {};
    var u2 = firebase.auth().currentUser || {};
    if (!d.email && u2.email) patch.email = u2.email;
    if (!d.displayName && u2.displayName) patch.displayName = u2.displayName;
    if (!d.createdAt) patch.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    if (!d.registrationInfo) {
      patch.registrationInfo = buildRegistrationInfoForProfile(u2, d.countryCode || d.registrationCountryCode || inferCountryCode());
    }
    if (!d.language) {
      var langFromRi = d.registrationInfo && d.registrationInfo.language;
      var langFromPatch = patch.registrationInfo && patch.registrationInfo.language;
      var langLocal = null;
      try { langLocal = localStorage.getItem('language'); } catch (_) { /* ignore */ }
      patch.language = langFromRi || langFromPatch || langLocal || 'hu';
    }
    if (Object.keys(patch).length) {
      patch.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await ref.set(patch, { merge: true });
      Object.assign(d, patch);
    }

    // Self-healing: sérült regisztráció kijavítása.
    // Triggerek: nincs tier ÉS nincs isTrial ÉS nincs stripeCustomerId
    //   → ez vagy egy soha nem inicializált új user (nincs settings/subscription),
    //     vagy egy v6.03.20 race-bug áldozat. Mindkét esetben createUserProfile
    //     helyrehozza ({merge:true}, idempotens).
    var needsHealing = !d.subscriptionTier && !d.isTrial && !d.stripeCustomerId;
    if (needsHealing) {
      try {
        console.warn('[UserProfile] Self-healing triggered for incomplete profile:', uid);
        if (typeof createUserProfile === 'function') {
          await createUserProfile(uid);
          // Olvassuk újra a frissen kreált adatokat
          var healedSnap = await ref.get();
          if (healedSnap.exists) {
            d = healedSnap.data() || d;
          }
        }
      } catch (healErr) {
        console.error('[UserProfile] Self-heal failed (non-fatal):', healErr);
      }
    }

    if (!d.countryCode){
      var cc = inferCountryCode();
      await ref.set({
        countryCode: cc,
        registrationCountryCode: d.registrationCountryCode || cc,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, {merge:true});
      d.countryCode = cc;
      if (!d.registrationCountryCode) d.registrationCountryCode = cc;
    }
    return d;
  }
}
window.ensureUserProfile = ensureUserProfile;


// ===== Jogi verzió összehasonlítás (cross-platform, cache-safe) =====
function parseLegalVersionId(version) {
  if (!version || typeof version !== 'string') return null;
  var m = version.match(/^legal-(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { raw: version, time: Date.UTC(+m[1], +m[2] - 1, +m[3]) };
}

function compareLegalVersionIds(a, b) {
  var pa = parseLegalVersionId(a);
  var pb = parseLegalVersionId(b);
  if (pa && pb) {
    if (pa.time === pb.time) return 0;
    return pa.time > pb.time ? 1 : -1;
  }
  if (a === b) return 0;
  return null;
}

function isLegalVersionSatisfied(acceptedVersion, requiredVersion) {
  if (!requiredVersion) return true;
  if (!acceptedVersion) return false;
  if (acceptedVersion === requiredVersion) return true;
  var cmp = compareLegalVersionIds(acceptedVersion, requiredVersion);
  if (cmp === null) return acceptedVersion === requiredVersion;
  return cmp >= 0;
}

function rememberTermsAcceptedForSession(uid, version) {
  if (!uid || !version) return;
  try {
    window.__termsAcceptedSession = window.__termsAcceptedSession || {};
    window.__termsAcceptedSession[uid] = version;
  } catch (_) {}
}

function hasTermsAcceptedInSession(uid, requiredVersion) {
  if (!uid || !requiredVersion) return false;
  try {
    var v = window.__termsAcceptedSession && window.__termsAcceptedSession[uid];
    return isLegalVersionSatisfied(v, requiredVersion);
  } catch (_) {
    return false;
  }
}

async function hasUserAcceptedRequiredLegalVersion(uid, requiredVersion, profileHint) {
  if (!requiredVersion) return true;
  if (!uid) return false;

  if (hasTermsAcceptedInSession(uid, requiredVersion)) return true;

  var accepted = profileHint && profileHint.termsLegalVersionAccepted;
  if (isLegalVersionSatisfied(accepted, requiredVersion)) return true;

  var profileRef = db.collection('users').doc(uid).collection('profile').doc('info');
  try {
    var serverSnap = await profileRef.get({ source: 'server' });
    if (serverSnap.exists) {
      accepted = (serverSnap.data() || {}).termsLegalVersionAccepted;
      if (isLegalVersionSatisfied(accepted, requiredVersion)) {
        rememberTermsAcceptedForSession(uid, accepted);
        return true;
      }
    }
  } catch (serverErr) {
    console.warn('[Legal] server profile read failed, using cache:', serverErr && serverErr.message);
    try {
      var cacheSnap = await profileRef.get();
      if (cacheSnap.exists) {
        accepted = (cacheSnap.data() || {}).termsLegalVersionAccepted;
        if (isLegalVersionSatisfied(accepted, requiredVersion)) {
          rememberTermsAcceptedForSession(uid, accepted);
          return true;
        }
      }
    } catch (_) {}
  }

  try {
    var historyRef = db.collection('users').doc(uid).collection('termsAcceptances');
    var exactSnap = await historyRef.where('legalVersion', '==', requiredVersion).limit(1).get();
    if (!exactSnap.empty) {
      rememberTermsAcceptedForSession(uid, requiredVersion);
      return true;
    }
    var recentSnap;
    try {
      recentSnap = await historyRef.orderBy('acceptedAt', 'desc').limit(20).get();
    } catch (orderErr) {
      recentSnap = await historyRef.limit(20).get();
    }
    for (var i = 0; i < recentSnap.docs.length; i++) {
      var lv = (recentSnap.docs[i].data() || {}).legalVersion;
      if (isLegalVersionSatisfied(lv, requiredVersion)) {
        rememberTermsAcceptedForSession(uid, lv);
        return true;
      }
    }
  } catch (histErr) {
    console.warn('[Legal] termsAcceptances lookup failed:', histErr && histErr.message);
  }

  return false;
}

window.parseLegalVersionId = parseLegalVersionId;
window.compareLegalVersionIds = compareLegalVersionIds;
window.isLegalVersionSatisfied = isLegalVersionSatisfied;
window.rememberTermsAcceptedForSession = rememberTermsAcceptedForSession;
window.hasTermsAcceptedInSession = hasTermsAcceptedInSession;
window.hasUserAcceptedRequiredLegalVersion = hasUserAcceptedRequiredLegalVersion;


// ===== Jogi feltételek elfogadásának naplózása =====
async function logTermsAcceptanceForUser(uid, profile){
  if (!uid) throw new Error('logTermsAcceptanceForUser: missing uid');
  var user = firebase.auth().currentUser || {};
  var legalInfo = (window.LEGAL_INFO) || {};
  var appInfo = (window.APP_INFO) || {};

  var legalVersion = legalInfo.currentVersion || appInfo.legalVersion || 'unknown';
  var termsDocVersion = legalInfo.termsDocVersion || appInfo.termsDocVersion || null;
  var privacyDocVersion = legalInfo.privacyDocVersion || appInfo.privacyDocVersion || null;
  var appVersion = appInfo.version || null;

  var userRef = db.collection('users').doc(uid);
  var profileRef = userRef.collection('profile').doc('info');
  var historyRef = userRef.collection('termsAcceptances');

  var nowServer = firebase.firestore.FieldValue.serverTimestamp();

  var baseProfile = profile || {};
  var email = baseProfile.email || user.email || '';
  var displayName = baseProfile.displayName || user.displayName || '';

  // History bejegyzés
  await historyRef.add({
    userId: uid,
    email: email,
    displayName: displayName,
    acceptedAt: nowServer,
    legalVersion: legalVersion,
    termsDocVersion: termsDocVersion,
    privacyDocVersion: privacyDocVersion,
    appVersion: appVersion
  });

  // Profil gyors ellenőrzéshez
  await profileRef.set({
    termsLegalVersionAccepted: legalVersion,
    termsDocVersion: termsDocVersion,
    privacyDocVersion: privacyDocVersion,
    termsAcceptedAt: nowServer,
    termsAcceptedAppVersion: appVersion
  }, { merge: true });

  rememberTermsAcceptedForSession(uid, legalVersion);
  if (profile && typeof profile === 'object') {
    profile.termsLegalVersionAccepted = legalVersion;
    profile.termsDocVersion = termsDocVersion;
    profile.privacyDocVersion = privacyDocVersion;
  }
}
window.logTermsAcceptanceForUser = logTermsAcceptanceForUser;
