/**
 * Login / app-start: backend unified entitlement recompute (Apple Pro expiry, mirror sync).
 * Callable: `refreshSubscriptionEntitlements` in **europe-west3**.
 *
 * Compat SDK: `firebase.app().functions('europe-west3')` (= modular `getFunctions(app, 'europe-west3')`).
 */
function getEuropeWest3Functions() {
  if (typeof window !== 'undefined' && window.functions) {
    return window.functions;
  }
  if (typeof firebase === 'undefined' || !firebase.app) {
    return null;
  }
  try {
    return firebase.app().functions('europe-west3');
  } catch (_) {
    return null;
  }
}

/**
 * Never throws — failures are logged; login must continue.
 */
async function refreshSubscriptionEntitlementsOnLogin(userId) {
  if (!userId || typeof firebase === 'undefined' || !firebase.auth) {
    return { ok: false, skipped: true, reason: 'no_auth_sdk' };
  }
  const user = firebase.auth().currentUser;
  if (!user || user.uid !== userId) {
    return { ok: false, skipped: true, reason: 'uid_mismatch' };
  }
  if (typeof window.ensureFirebaseFunctions === 'function' && !window.functions) {
    try { await window.ensureFirebaseFunctions(); } catch (e) {
      console.warn('[SubscriptionRefresh] Functions lazy load failed:', e);
    }
  }
  const fnSvc = getEuropeWest3Functions();
  if (!fnSvc) {
    console.warn('[SubscriptionRefresh] europe-west3 Functions not initialized');
    return { ok: false, skipped: true, reason: 'no_functions' };
  }
  try {
    const callable = fnSvc.httpsCallable('refreshSubscriptionEntitlements');
    const result = await callable({});
    const data = result && result.data ? result.data : {};
    console.log('[SubscriptionRefresh] recompute ok', {
      isPro: data.isPro,
      status: data.status,
      provider: data.provider,
    });
    return data;
  } catch (e) {
    console.warn(
      '[SubscriptionRefresh] refreshSubscriptionEntitlements failed (login continues):',
      e && e.message ? e.message : e,
    );
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
}

window.refreshSubscriptionEntitlementsOnLogin = refreshSubscriptionEntitlementsOnLogin;
window.getEuropeWest3Functions = getEuropeWest3Functions;
