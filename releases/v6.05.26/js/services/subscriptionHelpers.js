// === ELŐFIZETÉSI HELPER FÜGGVÉNYEK ===
// Alap megőrzés: 6 hét (42 nap). Archiválási előfizetés alatt hosszabb megőrzés; lejárat után vissza az alap 6 hétre.
// +7 nap türelmi idő: csak a lejáratkor már 6 hétnél régebbi dokumentumokra (nem „minden dokumentum eddig”).

const DOCUMENT_GRACE_DAYS_AFTER_ARCHIVAL_END = 7;
const FREE_TIER_DEFAULT_RETENTION_DAYS = 42;
const BASE_DOCUMENT_RETENTION_WEEKS = 6;

function pickSubscriptionDate(v) {
  if (v == null) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  try {
    if (typeof v.toDate === 'function') {
      const d = v.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }
  } catch (_) { /* ignore */ }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function addCalendarDays(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Archiválási előfizetés / csomag aktív időszak vége — több mirror forrás (profile, settings/archival, settings/subscription).
 * @returns {Date|null}
 */
function resolveArchivalSubscriptionEndDate(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  const settingsArchival = sub.settingsArchival && typeof sub.settingsArchival === 'object' ? sub.settingsArchival : null;
  const candidates = [
    sub.archivalExpiry,
    sub.archivalCurrentPeriodEnd,
    settingsArchival && settingsArchival.archivalExpiry,
    settingsArchival && settingsArchival.currentPeriodEnd,
    settingsArchival && settingsArchival.activeUntil,
    sub.archivalPeriodEnd,
    sub.archivalActiveUntil,
  ];
  for (let i = 0; i < candidates.length; i++) {
    const d = pickSubscriptionDate(candidates[i]);
    if (d) return d;
  }
  return null;
}

function getArchivalSubscriptionEndDate(subOptional) {
  return resolveArchivalSubscriptionEndDate(subOptional);
}

/**
 * Apple IAP: auto-renew off only when renewal JWS supplied autoRenewStatus=0 (not stale willRenew alone).
 * @param {'pro'|'archival'} product
 */
function isAppleIapAutoRenewOffProven(subOptional, product) {
  const sub = subOptional || window.currentUserSubscription || {};
  const isPro = product === 'pro';
  const known = isPro ? sub.appleIapProAutoRenewKnown === true : sub.appleIapArchivalAutoRenewKnown === true;
  const autoSt = isPro ? sub.appleIapProAutoRenewStatus : sub.appleIapArchivalAutoRenewStatus;
  if (!known || autoSt !== 0) return false;
  const raw = isPro
    ? String(sub.appleIapProStatus || sub.appleProStatus || '').trim().toLowerCase()
    : String(sub.appleIapArchivalStatus || sub.archivalStatus || '').trim().toLowerCase();
  if (raw !== 'active' && raw !== 'billing_retry') return false;
  if (isPro) {
    const candidates = [sub.activeUntil, sub.currentPeriodEnd, sub.subscriptionExpiry, sub.expiry];
    for (let i = 0; i < candidates.length; i++) {
      const d = pickSubscriptionDate(candidates[i]);
      if (d) return d.getTime() > Date.now();
    }
    return true;
  }
  const end = getArchivalSubscriptionEndDate(sub);
  return !end || end.getTime() > Date.now();
}

function isArchivalCancelAtPeriodEndPending(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  const cancelFlag = sub.archivalCancelAtPeriodEnd === true;
  const archStatus = String(sub.archivalStatus || '').trim().toLowerCase();
  if (archStatus === 'cancel_at_period_end' || archStatus === 'active_until_period_end') {
    const end = getArchivalSubscriptionEndDate(sub);
    if (!end || end.getTime() > Date.now()) return true;
  }
  if (!cancelFlag && !isAppleIapAutoRenewOffProven(sub, 'archival')) return false;
  const status = String(sub.archivalStatus || '').trim().toLowerCase();
  if (status === 'payment_grace' || status === 'billing_retry') return false;
  if (status === 'grace_period' && isArchivalAppleBillingPaymentGrace(sub)) return false;
  if (status === 'grace_period' || status === 'expired' || status === 'canceled' || status === 'cancelled') {
    return false;
  }
  if (sub.archivalActive === false) return false;
  const end = getArchivalSubscriptionEndDate(sub);
  return !end || end.getTime() > Date.now();
}

function getArchivalGracePeriodUntilDate(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  const settingsArchival = sub.settingsArchival && typeof sub.settingsArchival === 'object' ? sub.settingsArchival : null;
  return (
    pickSubscriptionDate(sub.archivalGracePeriodUntil) ||
    pickSubscriptionDate(sub.gracePeriodUntil) ||
    pickSubscriptionDate(settingsArchival && settingsArchival.gracePeriodUntil) ||
    pickSubscriptionDate(settingsArchival && settingsArchival.archivalGracePeriodUntil)
  );
}

function getArchivalPaymentGraceUntilDate(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  const settingsArchival = sub.settingsArchival && typeof sub.settingsArchival === 'object' ? sub.settingsArchival : null;
  return (
    pickSubscriptionDate(sub.archivalPaymentGraceUntil) ||
    pickSubscriptionDate(settingsArchival && settingsArchival.paymentGraceUntil)
  );
}

const SUBSCRIPTION_PAYMENT_PROBLEM_STATUSES = ['past_due', 'payment_failed', 'billing_retry', 'unpaid'];

function normalizeSubscriptionStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function statusIsSubscriptionPaymentProblem(status) {
  const st = normalizeSubscriptionStatus(status);
  return SUBSCRIPTION_PAYMENT_PROBLEM_STATUSES.includes(st);
}

/** Provider felismerés entitlement nélkül (körkörös hívás elkerülése). */
function isArchivalStripeBilledLocally(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  const bp = normalizeSubscriptionStatus(sub.archivalBillingProvider);
  if (bp === 'apple') return false;
  if (bp === 'stripe') return true;
  const stripeSubId = sub.archivalStripeSubscriptionId && String(sub.archivalStripeSubscriptionId).trim();
  if (stripeSubId) return true;
  const settingsArchival = sub.settingsArchival && typeof sub.settingsArchival === 'object' ? sub.settingsArchival : null;
  if (settingsArchival && normalizeSubscriptionStatus(settingsArchival.billingProvider) === 'stripe') return true;
  return false;
}

function isArchivalAppleBilledLocally(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  if (isArchivalStripeBilledLocally(sub)) return false;
  const bp = normalizeSubscriptionStatus(sub.archivalBillingProvider);
  if (bp === 'apple' || bp === 'apple_iap') return true;
  const settingsArchival = sub.settingsArchival && typeof sub.settingsArchival === 'object' ? sub.settingsArchival : null;
  const settingsBp = normalizeSubscriptionStatus(settingsArchival && settingsArchival.billingProvider);
  if (settingsBp === 'apple' || settingsBp === 'apple_iap') return true;
  const mirrorSt = normalizeSubscriptionStatus(sub.archivalStatus);
  if (mirrorSt === 'payment_grace' || mirrorSt === 'billing_retry') return true;
  if (settingsArchival && normalizeSubscriptionStatus(settingsArchival.status) === 'payment_grace') {
    return true;
  }
  if (sub.appleArchivalProductId || sub.appleArchivalOriginalTransactionId) return true;
  const appleSt = normalizeSubscriptionStatus(sub.appleIapArchivalStatus);
  return (
    appleSt === 'active' ||
    appleSt === 'billing_retry' ||
    appleSt === 'past_due' ||
    appleSt === 'grace_period'
  );
}

function hasArchivalStripePaymentFailedSignals(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  if (sub.archivalPaymentFailed === true) return true;
  const settingsArchival = sub.settingsArchival && typeof sub.settingsArchival === 'object' ? sub.settingsArchival : null;
  if (settingsArchival && settingsArchival.paymentFailed === true) return true;
  const settingsSub = sub.settingsSubscription && typeof sub.settingsSubscription === 'object'
    ? sub.settingsSubscription
    : null;
  if (settingsSub && settingsSub.archivalPaymentFailed === true) return true;
  const st = normalizeSubscriptionStatus(
    sub.archivalStatus ||
    (settingsArchival && settingsArchival.status) ||
    (settingsSub && settingsSub.archivalStatus),
  );
  return st === 'past_due' || st === 'payment_failed' || st === 'unpaid';
}

/** Stripe Archiválás: sikertelen megújítás / past_due (nem Apple IAP). */
function isArchivalStripePaymentFailed(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  if (!isArchivalStripeBilledLocally(sub)) return false;
  return hasArchivalStripePaymentFailedSignals(sub);
}

function normalizeSubscriptionTierLocal(sub) {
  const raw = String(sub.tier || 'free').trim().toLowerCase();
  if (raw === 'max') return 'pro';
  if (raw === 'guest') return 'free';
  return raw;
}

/** Pro előfizetés ténylegesen érintett-e (Free + stale mezők nem elég). */
function isProSubscriptionActuallyAffected(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  const tier = normalizeSubscriptionTierLocal(sub);
  if (tier === 'pro') return true;

  if (sub.entitlementsIsPro === true) return true;
  const ent = window.currentUserEntitlements;
  if (ent && typeof ent === 'object' && ent.isPro === true) return true;

  if (typeof window.hasActiveStripeProSubscription === 'function' && window.hasActiveStripeProSubscription(sub)) {
    return true;
  }

  const appleSt = normalizeSubscriptionStatus(sub.appleIapProStatus || sub.appleProStatus);
  if (statusIsSubscriptionPaymentProblem(appleSt)) return true;

  return false;
}

/**
 * Stripe Pro aktív + jövőbeli periódus — felülírja a beragadt paymentFailed mirror mezőket.
 */
function isProStripeSubscriptionCurrentlyHealthy(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  if (normalizeSubscriptionTierLocal(sub) !== 'pro') return false;

  const settingsSub = sub.settingsSubscription && typeof sub.settingsSubscription === 'object'
    ? sub.settingsSubscription
    : null;
  const statusCandidates = [
    sub.subscriptionStatus,
    sub.status,
    settingsSub && settingsSub.status,
    settingsSub && settingsSub.subscriptionStatus,
  ].map(normalizeSubscriptionStatus);

  if (!statusCandidates.some((s) => s === 'active' || s === 'trialing')) {
    return false;
  }

  const periodEnd =
    pickSubscriptionDate(sub.expiry) ||
    pickSubscriptionDate(sub.currentPeriodEnd) ||
    pickSubscriptionDate(sub.activeUntil) ||
    (settingsSub && pickSubscriptionDate(settingsSub.currentPeriodEnd)) ||
    (settingsSub && pickSubscriptionDate(settingsSub.activeUntil));

  if (periodEnd && periodEnd.getTime() > Date.now()) return true;

  if (typeof window.hasActiveStripeProSubscription === 'function' && window.hasActiveStripeProSubscription(sub)) {
    return true;
  }

  return false;
}

function isProEntitlementsStripeCurrentlyHealthy(subOptional) {
  const ent = window.currentUserEntitlements;
  if (!ent || typeof ent !== 'object' || ent.isPro !== true) return false;
  if (normalizeSubscriptionStatus(ent.provider) !== 'stripe') return false;
  const st = normalizeSubscriptionStatus(ent.status);
  if (st !== 'active' && st !== 'trialing') return false;
  const exp = pickSubscriptionDate(ent.expiresAt);
  return !exp || exp.getTime() > Date.now();
}

/** Pro fizetési hiba jelei (nem Archiválás, nem puszta stripeCustomerId). */
function hasProPaymentFailureSignal(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  const settingsSub = sub.settingsSubscription && typeof sub.settingsSubscription === 'object'
    ? sub.settingsSubscription
    : null;

  if (sub.subscriptionPaymentFailed === true) return true;
  if (settingsSub && settingsSub.paymentFailed === true) return true;

  const appleSt = normalizeSubscriptionStatus(sub.appleIapProStatus || sub.appleProStatus);
  if (statusIsSubscriptionPaymentProblem(appleSt)) return true;

  // Apple IAP Pro: sikertelen megújítás után a billing grace period alatt is fizetési probléma
  // (mint a billing_retry), de a Pro hozzáférés a grace period végéig megmarad — nem esik
  // vissza azonnal free-be. Csak valódi Apple Pro jel mellett (a Stripe Pro-t nem érinti).
  const appleProGraceActive =
    appleSt === 'grace_period' ||
    normalizeSubscriptionStatus(sub.entitlementsAppleProviderStatus) === 'grace_period';
  if (
    appleProGraceActive &&
    typeof window.isAppleProSignalActive === 'function' &&
    window.isAppleProSignalActive(sub)
  ) {
    return true;
  }

  const tier = normalizeSubscriptionTierLocal(sub);
  const stripeProSubId = sub.stripeSubscriptionId && String(sub.stripeSubscriptionId).trim();
  const stripeProContext = tier === 'pro' || (
    typeof window.hasActiveStripeProSubscription === 'function' && window.hasActiveStripeProSubscription(sub)
  );
  if (stripeProSubId && stripeProContext) {
    const statusCandidates = [
      sub.subscriptionStatus,
      sub.status,
      settingsSub && settingsSub.status,
      settingsSub && settingsSub.subscriptionStatus,
    ];
    for (let i = 0; i < statusCandidates.length; i++) {
      if (statusIsSubscriptionPaymentProblem(statusCandidates[i])) return true;
    }
  }

  const ent = window.currentUserEntitlements;
  if (ent && typeof ent === 'object' && ent.isPro === true) {
    const entSt = normalizeSubscriptionStatus(ent.status);
    const entProvider = normalizeSubscriptionStatus(ent.provider);
    if (
      (entProvider === 'stripe' || entProvider === 'apple') &&
      (statusIsSubscriptionPaymentProblem(entSt) ||
        (entSt === 'grace_period' && entProvider === 'apple'))
    ) {
      return true;
    }
  }

  return false;
}

/** Pro: fizetési probléma — csak ha Pro érintett ÉS van Pro payment failed jel. */
function isProSubscriptionPaymentProblem(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  if (!isProSubscriptionActuallyAffected(sub)) return false;
  if (isProStripeSubscriptionCurrentlyHealthy(sub)) return false;
  if (isProEntitlementsStripeCurrentlyHealthy(sub)) return false;
  return hasProPaymentFailureSignal(sub);
}

const ARCHIVAL_TERMINAL_SUBSCRIPTION_STATUSES = [
  'canceled',
  'cancelled',
  'expired',
  'inactive',
  'incomplete_expired',
  'grace_period',
];

/**
 * Apple Billing Grace / billing retry mirror — not document-retention grace_period.
 * Uses profile, settings/archival, and optional admin summaries.
 */
function hasArchivalBillingPaymentGraceState(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  const settingsArchival = sub.settingsArchival && typeof sub.settingsArchival === 'object'
    ? sub.settingsArchival
    : null;
  const settingsSub = sub.settingsSubscription && typeof sub.settingsSubscription === 'object'
    ? sub.settingsSubscription
    : null;
  const now = Date.now();

  const statusCandidates = [
    sub.archivalStatus,
    settingsArchival && settingsArchival.status,
    settingsSub && settingsSub.archivalStatus,
  ];
  for (let i = 0; i < statusCandidates.length; i++) {
    const st = normalizeSubscriptionStatus(statusCandidates[i]);
    if (st === 'payment_grace' || st === 'billing_retry') return true;
  }

  if (sub.archivalPaymentFailed === true) return true;
  if (settingsArchival && settingsArchival.paymentFailed === true) return true;
  if (settingsSub && settingsSub.archivalPaymentFailed === true) return true;

  const payGrace = getArchivalPaymentGraceUntilDate(sub);
  if (payGrace && payGrace.getTime() > now) return true;

  const sumArch = sub.summaries && typeof sub.summaries === 'object' ? sub.summaries.archival : null;
  if (sumArch && typeof sumArch === 'object') {
    const sumSt = normalizeSubscriptionStatus(sumArch.status);
    if (sumSt === 'payment_grace' || sumSt === 'billing_retry') return true;
    if (sumArch.paymentFailed === true && sumArch.webActive === true) return true;
  }

  if (isArchivalAppleBilledLocally(sub) && isArchivalAppleBillingPaymentGrace(sub)) {
    return true;
  }

  return false;
}

/**
 * Apple Billing Grace Period / billing retry — subscription still active (not document retention grace).
 */
function isArchivalAppleBillingPaymentGrace(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  if (!isArchivalAppleBilledLocally(sub)) return false;

  const mirrorStatus = normalizeSubscriptionStatus(sub.archivalStatus);
  if (mirrorStatus === 'payment_grace' || mirrorStatus === 'billing_retry') return true;

  if (sub.archivalPaymentFailed === true && sub.archivalActive !== false) {
    const payGrace = getArchivalPaymentGraceUntilDate(sub);
    if (payGrace && payGrace.getTime() > Date.now()) return true;
    const end = resolveArchivalSubscriptionEndDate(sub);
    if (end && end.getTime() > Date.now()) return true;
  }

  const appleSt = normalizeSubscriptionStatus(sub.appleIapArchivalStatus);
  if (
    (appleSt === 'billing_retry' || appleSt === 'grace_period') &&
    sub.archivalActive !== false &&
    (sub.archivalPaymentFailed === true || mirrorStatus === 'payment_grace' || mirrorStatus === 'billing_retry')
  ) {
    return true;
  }

  return false;
}

function isArchivalTerminalSubscriptionStatus(status, subOptional) {
  const st = normalizeSubscriptionStatus(status);
  if (st === 'grace_period' && isArchivalAppleBillingPaymentGrace(subOptional)) {
    return false;
  }
  return ARCHIVAL_TERMINAL_SUBSCRIPTION_STATUSES.includes(st);
}

/** Archiválás: past_due / payment_failed jelek (mirror mezők — önmagában nem elég a bannerhez). */
function hasArchivalPaymentFailureSignals(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  if (sub.archivalPaymentFailed === true) return true;

  const settingsSub = sub.settingsSubscription && typeof sub.settingsSubscription === 'object'
    ? sub.settingsSubscription
    : null;
  if (settingsSub && settingsSub.archivalPaymentFailed === true) return true;
  if (statusIsSubscriptionPaymentProblem(settingsSub && settingsSub.archivalStatus)) return true;

  const settingsArchival = sub.settingsArchival && typeof sub.settingsArchival === 'object'
    ? sub.settingsArchival
    : null;
  if (settingsArchival && settingsArchival.paymentFailed === true) return true;
  if (statusIsSubscriptionPaymentProblem(settingsArchival && settingsArchival.status)) return true;
  if (statusIsSubscriptionPaymentProblem(sub.archivalStatus)) return true;
  const archMirrorSt = normalizeSubscriptionStatus(sub.archivalStatus);
  if (archMirrorSt === 'payment_grace' || archMirrorSt === 'billing_retry') return true;

  if (isArchivalAppleBilledLocally(sub)) {
    const appleSt = normalizeSubscriptionStatus(sub.appleIapArchivalStatus);
    return statusIsSubscriptionPaymentProblem(appleSt);
  }
  return isArchivalStripePaymentFailed(sub);
}

/**
 * Fizetési mód frissítése még értelmes — aktív / past_due előfizetés vagy jövőbeli payment grace.
 * Lejárt / canceled / dokumentum-türelmi idő nem számít.
 */
function isArchivalSubscriptionRecoverableForPaymentWarning(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  const settingsArchival = sub.settingsArchival && typeof sub.settingsArchival === 'object'
    ? sub.settingsArchival
    : null;
  const settingsSub = sub.settingsSubscription && typeof sub.settingsSubscription === 'object'
    ? sub.settingsSubscription
    : null;

  const statusList = [
    sub.archivalStatus,
    settingsArchival && settingsArchival.status,
    settingsSub && settingsSub.archivalStatus,
  ];
  for (let i = 0; i < statusList.length; i++) {
    if (statusList[i] && isArchivalTerminalSubscriptionStatus(statusList[i], sub)) {
      return false;
    }
  }

  if (sub.archivalActive === false) return false;
  if (settingsArchival && settingsArchival.active === false) return false;

  if (typeof window.isArchivalPostExpiryStaleGracePeriod === 'function' &&
    window.isArchivalPostExpiryStaleGracePeriod(sub)) {
    return false;
  }

  const now = Date.now();
  const payGrace = getArchivalPaymentGraceUntilDate(sub);
  const periodEnd = resolveArchivalSubscriptionEndDate(sub);

  if (typeof window.isArchivalSubscriptionBillingActive === 'function' &&
    window.isArchivalSubscriptionBillingActive(sub)) {
    if (payGrace && payGrace.getTime() > now) return true;
    if (periodEnd && periodEnd.getTime() > now) return true;
    return true;
  }

  if (payGrace && payGrace.getTime() > now && periodEnd && periodEnd.getTime() > now) {
    return true;
  }

  return false;
}

/** Archiválás: fizetési probléma banner — jel + még menthető előfizetés. */
function isArchivalSubscriptionPaymentProblem(subOptional) {
  if (!hasArchivalPaymentFailureSignals(subOptional)) return false;
  if (!isArchivalSubscriptionRecoverableForPaymentWarning(subOptional)) return false;
  return true;
}

function resolvePreferredPaymentProblemAction(subOptional, flags) {
  const sub = subOptional || window.currentUserSubscription || {};
  const native = typeof window.isNativeIosAppShell === 'function' && window.isNativeIosAppShell();
  const proMgmt = typeof window.getProManagementMode === 'function'
    ? window.getProManagementMode(sub)
    : { mode: 'none', provider: 'unknown' };
  const archMgmt = typeof window.getArchivalManagementMode === 'function'
    ? window.getArchivalManagementMode(sub)
    : { mode: 'none', provider: 'unknown' };

  const modes = [];
  if (flags.proProblem) modes.push(proMgmt.mode);
  if (flags.archivalProblem) modes.push(archMgmt.mode);

  if (native) {
    if (modes.includes('stripe_info_ios')) {
      return {
        type: 'stripe_info_ios',
        product: flags.proProblem ? 'pro' : 'archival',
        proMgmt: proMgmt,
        archMgmt: archMgmt,
      };
    }
    if (modes.includes('apple_manage')) {
      return {
        type: 'apple_manage',
        product: flags.proProblem ? 'pro' : 'archival',
        proMgmt: proMgmt,
        archMgmt: archMgmt,
      };
    }
    if (modes.includes('apple_info_web')) {
      return { type: 'apple_info_web', product: 'pro', proMgmt: proMgmt, archMgmt: archMgmt };
    }
  }
  if (modes.includes('stripe_manage')) {
    return { type: 'stripe_portal', product: 'any', proMgmt: proMgmt, archMgmt: archMgmt };
  }
  if (modes.includes('apple_info_web')) {
    return { type: 'apple_info_web', product: flags.proProblem ? 'pro' : 'archival', proMgmt: proMgmt, archMgmt: archMgmt };
  }
  if (modes.includes('apple_manage')) {
    return {
      type: 'apple_manage',
      product: flags.proProblem ? 'pro' : 'archival',
      proMgmt: proMgmt,
      archMgmt: archMgmt,
    };
  }
  return { type: 'subscription_page', product: 'any', proMgmt: proMgmt, archMgmt: archMgmt };
}

/**
 * Közös fizetési probléma összegzés (Áttekintés banner, Előfizetés oldal, diagnosztika).
 * @returns {{
 *   hasProblem: boolean,
 *   proProblem: boolean,
 *   archivalProblem: boolean,
 *   proGraceUntil: Date|null,
 *   archivalGraceUntil: Date|null,
 *   proAccessUntil: Date|null,
 *   archivalAccessUntil: Date|null,
 *   provider: string,
 *   preferredAction: object
 * }}
 */
function getSubscriptionPaymentProblemSummary(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  const proProblem = isProSubscriptionPaymentProblem(sub);
  const archivalProblem = isArchivalSubscriptionPaymentProblem(sub);
  const hasProblem = proProblem || archivalProblem;

  const settingsSub = sub.settingsSubscription && typeof sub.settingsSubscription === 'object'
    ? sub.settingsSubscription
    : null;

  const proGraceUntil =
    pickSubscriptionDate(sub.subscriptionPaymentGraceUntil) ||
    pickSubscriptionDate(settingsSub && settingsSub.paymentGraceUntil) ||
    null;
  const archivalGraceUntil = getArchivalPaymentGraceUntilDate(sub);

  const proAccessUntil =
    pickSubscriptionDate(sub.expiry) ||
    pickSubscriptionDate(sub.currentPeriodEnd) ||
    pickSubscriptionDate(sub.activeUntil) ||
    null;
  const archivalAccessUntil = resolveArchivalSubscriptionEndDate(sub);

  let provider = 'unknown';
  if (proProblem && archivalProblem) {
    provider = 'mixed';
  } else if (proProblem && typeof window.getProBillingProvider === 'function') {
    provider = window.getProBillingProvider(sub);
  } else if (archivalProblem) {
    if (isArchivalStripeBilledLocally(sub)) provider = 'stripe';
    else if (isArchivalAppleBilledLocally(sub)) provider = 'apple';
    else provider = 'unknown';
  }

  const preferredAction = resolvePreferredPaymentProblemAction(sub, { proProblem, archivalProblem });
  const proMgmt =
    typeof window.getProManagementMode === 'function' ? window.getProManagementMode(sub) : { provider: 'unknown' };
  const archMgmt =
    typeof window.getArchivalManagementMode === 'function'
      ? window.getArchivalManagementMode(sub)
      : { provider: 'unknown' };
  const usesApplePaymentUi =
    (proProblem &&
      (proMgmt.provider === 'apple' ||
        proMgmt.mode === 'apple_manage' ||
        proMgmt.mode === 'apple_info_web')) ||
    (archivalProblem &&
      (archMgmt.provider === 'apple' ||
        archMgmt.mode === 'apple_manage' ||
        archMgmt.mode === 'apple_info_web'));

  return {
    hasProblem,
    proProblem,
    archivalProblem,
    proGraceUntil,
    archivalGraceUntil,
    proAccessUntil,
    archivalAccessUntil,
    provider,
    preferredAction,
    usesApplePaymentUi,
  };
}

/**
 * Fizetett / aktív Archiválási előfizetés (nem grace_period, nem lejárat utáni törlési türelmi idő).
 * grace_period ≠ aktív előfizetés.
 */
function isArchivalSubscriptionBillingActive(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  if (isArchivalAppleBillingPaymentGrace(sub)) {
    return true;
  }

  const status = String(sub.archivalStatus || '').trim().toLowerCase();
  if (status === 'payment_grace' || status === 'billing_retry') {
    return true;
  }
  if (status === 'grace_period' || status === 'canceled' || status === 'cancelled' || status === 'expired') {
    return false;
  }
  if (status === 'cancel_at_period_end' || status === 'active_until_period_end') {
    if (sub.archivalActive === true) return true;
    const end = getArchivalSubscriptionEndDate(sub);
    if (end && end.getTime() > Date.now()) return true;
  }
  if (sub.archivalCancelAtPeriodEnd === true && sub.archivalActive !== false) {
    const end = getArchivalSubscriptionEndDate(sub);
    if (!end || end.getTime() > Date.now()) return true;
  }

  const appleIapStatus = String(sub.appleIapArchivalStatus || '').trim().toLowerCase();
  if (appleIapStatus === 'grace_period') {
    return false;
  }
  if (appleIapStatus === 'canceled' || appleIapStatus === 'cancelled') {
    return false;
  }

  if (typeof window.isArchivalPostExpiryStaleGracePeriod === 'function' &&
    window.isArchivalPostExpiryStaleGracePeriod(sub)) {
    return false;
  }

  if (status === 'past_due' || status === 'payment_failed' || status === 'unpaid') {
    const stripePastDue = isArchivalStripeBilledLocally(sub) && hasArchivalStripePaymentFailedSignals(sub);
    const applePastDue = isArchivalAppleBilledLocally(sub) &&
      statusIsSubscriptionPaymentProblem(sub.appleIapArchivalStatus);
    if (stripePastDue || applePastDue) {
      const payGrace = getArchivalPaymentGraceUntilDate(sub);
      const end = resolveArchivalSubscriptionEndDate(sub);
      if (payGrace && payGrace.getTime() > Date.now()) return true;
      if (end && end.getTime() > Date.now()) return true;
    }
    return false;
  }

  if (sub.archivalActive === true) return true;
  if (sub.archivalActive === false) return false;

  if (appleIapStatus === 'active' || appleIapStatus === 'billing_retry') return true;
  if (status === 'active' || status === 'billing_retry') return true;

  const stripeSubId = sub.archivalStripeSubscriptionId && String(sub.archivalStripeSubscriptionId).trim();
  if (stripeSubId) {
    const expiry = getArchivalSubscriptionEndDate(sub);
    if (expiry && expiry.getTime() > Date.now()) return true;
  }

  return false;
}

/** Aktív archiválási előfizetés – checkout guard / feature unlock. */
function hasActiveArchivalPackage(subOptional) {
  return isArchivalSubscriptionBillingActive(subOptional);
}

/**
 * Lejárat utáni türelmi idő: csomag már nem aktív, de a 6+ hetes dokumentumok még nem törlődnek.
 */
function isArchivalPostExpiryStaleGracePeriod(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  if (isArchivalAppleBillingPaymentGrace(sub)) return false;
  if (sub.archivalActive === true) return false;

  const status = String(sub.archivalStatus || '').trim().toLowerCase();
  if (status === 'active' || status === 'billing_retry' || status === 'payment_grace') return false;
  // Backend mirror source-of-truth for post-expiry document retention grace.
  // If mirror says grace_period + inactive + future graceUntil, show stale grace UI
  // even when appleIapArchivalStatus is stale/lagging (e.g. still "active").
  const graceUntil = getArchivalGracePeriodUntilDate(sub);
  const now = Date.now();
  if (
    status === 'grace_period' &&
    sub.archivalActive === false &&
    sub.archivalPaymentFailed !== true &&
    graceUntil &&
    graceUntil.getTime() > now
  ) {
    return true;
  }

  const appleIapStatus = String(sub.appleIapArchivalStatus || '').trim().toLowerCase();
  if (appleIapStatus === 'active' || appleIapStatus === 'billing_retry') return false;
  if (appleIapStatus === 'grace_period' && sub.archivalPaymentFailed === true) return false;

  if (graceUntil && graceUntil.getTime() > now) {
    return true;
  }
  if (status === 'grace_period' && graceUntil && graceUntil.getTime() > now) {
    return true;
  }
  return false;
}

/**
 * Lejáratkor már 6 hétnél régebbi dokumentumok +7 napos türelmi idejének vége (nem minden dokumentum garantált eddig).
 * Lemondás grace: archivalGracePeriodUntil / settings gracePeriodUntil; különben archivalExpiry + 7 nap.
 * @returns {Date|null}
 */
function getArchivalStaleDocumentGraceUntilDate(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  if (sub.archivalActive === true) return null;
  const archStatus = String(sub.archivalStatus || '').trim().toLowerCase();
  if (archStatus === 'active' || archStatus === 'billing_retry' || archStatus === 'payment_grace') return null;
  if (isArchivalAppleBillingPaymentGrace(sub)) return null;

  const explicitGrace = getArchivalGracePeriodUntilDate(sub);
  if (explicitGrace) {
    const now = Date.now();
    if (
      sub.archivalStatus === 'grace_period' ||
      explicitGrace.getTime() > now
    ) {
      return explicitGrace;
    }
  }

  const subscriptionEnd = getArchivalSubscriptionEndDate(sub);
  if (!subscriptionEnd) return null;
  const computed = addCalendarDays(subscriptionEnd, DOCUMENT_GRACE_DAYS_AFTER_ARCHIVAL_END);
  const now = Date.now();
  if (subscriptionEnd.getTime() < now && computed.getTime() > now) {
    return computed;
  }
  return null;
}

/** @deprecated UI: használd getArchivalStaleDocumentGraceUntilDate */
function getArchivalDocumentRetentionUntilDate(subOptional) {
  return getArchivalStaleDocumentGraceUntilDate(subOptional);
}

/**
 * Előfizetés oldal: aktív / lejárat utáni türelmi / inaktív.
 */
function resolveArchivalSubscriptionDisplayState(subOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  const hasActiveArchival = isArchivalSubscriptionBillingActive(sub);
  const subscriptionEnd = resolveArchivalSubscriptionEndDate(sub);
  const staleDocumentGraceUntil = getArchivalStaleDocumentGraceUntilDate(sub);
  const now = Date.now();

  // PRIORITY 1 — Apple Billing Grace / fizetési probléma (előbb mint billing-active / inactive).
  // DID_FAIL_TO_RENEW+GRACE_PERIOD: mirror payment_grace + appleIapArchivalStatus grace_period;
  // isArchivalSubscriptionBillingActive() önmagában nem elég — itt explicit jelek kellenek.
  const settingsArchival = sub.settingsArchival && typeof sub.settingsArchival === 'object'
    ? sub.settingsArchival
    : null;
  const archivalPaymentGraceUntil = getArchivalPaymentGraceUntilDate(sub);
  const archivalExplicitlyInactive =
    sub.archivalActive === false ||
    (settingsArchival && settingsArchival.active === false);
  if (
    hasArchivalBillingPaymentGraceState(sub) &&
    !archivalExplicitlyInactive &&
    !isArchivalPostExpiryStaleGracePeriod(sub)
  ) {
    return {
      uiState: 'payment_failed',
      subscriptionEnd,
      paymentGraceUntil: archivalPaymentGraceUntil,
      staleDocumentGraceUntil: null,
      baseRetentionWeeks: BASE_DOCUMENT_RETENTION_WEEKS,
    };
  }

  if (hasActiveArchival) {
    if (isArchivalSubscriptionPaymentProblem(sub)) {
      return {
        uiState: 'payment_failed',
        subscriptionEnd,
        paymentGraceUntil: getArchivalPaymentGraceUntilDate(sub),
        staleDocumentGraceUntil: null,
        baseRetentionWeeks: BASE_DOCUMENT_RETENTION_WEEKS,
      };
    }
    if (isArchivalCancelAtPeriodEndPending(sub)) {
      const explicitGraceEnd = getArchivalGracePeriodUntilDate(sub);
      const expectedGraceEnd =
        explicitGraceEnd ||
        (subscriptionEnd ? addCalendarDays(subscriptionEnd, DOCUMENT_GRACE_DAYS_AFTER_ARCHIVAL_END) : null);
      return {
        uiState: 'cancel_pending',
        subscriptionEnd,
        staleDocumentGraceUntil: expectedGraceEnd,
        baseRetentionWeeks: BASE_DOCUMENT_RETENTION_WEEKS,
      };
    }
    return {
      uiState: 'active',
      subscriptionEnd,
      staleDocumentGraceUntil: null,
      baseRetentionWeeks: BASE_DOCUMENT_RETENTION_WEEKS,
    };
  }

  const inStaleGraceWindow =
    !!staleDocumentGraceUntil &&
    staleDocumentGraceUntil.getTime() > now &&
    isArchivalPostExpiryStaleGracePeriod(sub);

  if (inStaleGraceWindow) {
    return {
      uiState: 'stale_grace',
      subscriptionEnd,
      staleDocumentGraceUntil,
      baseRetentionWeeks: BASE_DOCUMENT_RETENTION_WEEKS,
    };
  }

  return {
    uiState: 'inactive',
    subscriptionEnd: subscriptionEnd || null,
    staleDocumentGraceUntil: null,
    baseRetentionWeeks: BASE_DOCUMENT_RETENTION_WEEKS,
  };
}

/**
 * Provider-független Archiválás állapot dokumentum-megőrzéshez (UI + feltöltés).
 */
function resolveDocumentArchivalRetentionState(subOptional, nowOptional) {
  const sub = subOptional || window.currentUserSubscription || {};
  const now = nowOptional instanceof Date ? nowOptional : new Date();
  const isActive = isArchivalSubscriptionBillingActive(sub);
  const inPostExpiryGrace =
    !isActive && isArchivalPostExpiryStaleGracePeriod(sub);
  let graceUntil = null;
  if (inPostExpiryGrace) {
    graceUntil = getArchivalStaleDocumentGraceUntilDate(sub);
    if (graceUntil && graceUntil.getTime() <= now.getTime()) {
      graceUntil = null;
    }
  }
  return {
    isActive: isActive,
    inPostExpiryGrace: inPostExpiryGrace && !!graceUntil,
    graceUntil: graceUntil,
    archivalEndedAt: resolveArchivalSubscriptionEndDate(sub),
  };
}

function pickDocumentUploadedAtForRetention(doc) {
  const meta = doc && (doc.data || doc.meta || doc);
  if (!meta || typeof meta !== 'object') return null;
  return (
    pickSubscriptionDate(meta.uploadedAt) ||
    pickSubscriptionDate(meta.createdAt) ||
    null
  );
}

function calculateFreeRetentionExpiryDate(uploadedAt) {
  const uploadDate = pickSubscriptionDate(uploadedAt);
  if (!uploadDate) return null;
  return addCalendarDays(uploadDate, FREE_TIER_DEFAULT_RETENTION_DAYS);
}

/**
 * Dokumentumkártya retention UI — legacy expiresAt figyelmen kívül aktív archiválásnál.
 */
function getDocumentRetentionUi(doc, archivalStateOptional, nowOptional) {
  const i18n =
    typeof translations !== 'undefined' && typeof currentLang !== 'undefined'
      ? (translations[currentLang] || translations.hu || {})
      : {};
  const now = nowOptional instanceof Date ? nowOptional : new Date();
  const archivalState = archivalStateOptional || resolveDocumentArchivalRetentionState(undefined, now);

  if (archivalState.isActive) {
    return {
      type: 'protected',
      text: i18n.documentsRetentionProtected ||
        'Archiválva – aktív előfizetés alatt nem kerül automatikus törlésre',
      showDeleteCountdown: false,
    };
  }

  if (
    archivalState.inPostExpiryGrace &&
    archivalState.graceUntil &&
    archivalState.graceUntil.getTime() > now.getTime()
  ) {
    const locale =
      typeof getCurrentLocale === 'function'
        ? getCurrentLocale()
        : (typeof currentLang !== 'undefined' && currentLang === 'de'
          ? 'de-DE'
          : (currentLang === 'en' ? 'en-US' : 'hu-HU'));
    const graceStr = archivalState.graceUntil.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const tpl =
      i18n.documentsRetentionArchivalGrace ||
      'Archiválás türelmi idő alatt – automatikus törlés még nem történik (türelmi idő vége: {date})';
    return {
      type: 'grace',
      text: tpl.replace('{date}', graceStr),
      showDeleteCountdown: false,
      graceUntil: archivalState.graceUntil,
    };
  }

  const uploadedAt = pickDocumentUploadedAtForRetention(doc);
  if (!uploadedAt) {
    return { type: 'none', showDeleteCountdown: false };
  }

  const freeEnd = calculateFreeRetentionExpiryDate(uploadedAt);
  if (!freeEnd) {
    return { type: 'none', showDeleteCountdown: false };
  }

  const locale =
    typeof getCurrentLocale === 'function'
      ? getCurrentLocale()
      : (typeof currentLang !== 'undefined' && currentLang === 'de'
        ? 'de-DE'
        : (currentLang === 'en' ? 'en-US' : 'hu-HU'));
  const expiryStr = freeEnd.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const daysUntilExpiry = Math.ceil((freeEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let expiryClass = 'text-gray-500 dark:text-gray-400';
  let expiryIcon = '📅';
  if (daysUntilExpiry < 0) {
    expiryClass = 'text-red-600 dark:text-red-400';
    expiryIcon = '❌';
  } else if (daysUntilExpiry <= 7) {
    expiryClass = 'text-orange-600 dark:text-orange-400';
    expiryIcon = '⚠️';
  } else if (daysUntilExpiry <= 14) {
    expiryClass = 'text-yellow-600 dark:text-yellow-500';
    expiryIcon = '⏰';
  }

  const expiryLabelTemplate = i18n.documentsExpiresLabel || 'Törlődik: {date}';
  const expiryLabel = expiryLabelTemplate.replace('{date}', expiryStr);
  let expirySuffix = '';
  if (daysUntilExpiry > 0) {
    const daysTemplate = i18n.documentsExpiresInDays || '({days} nap)';
    expirySuffix = daysTemplate.replace('{days}', String(daysUntilExpiry));
  } else {
    expirySuffix = i18n.documentsExpiredLabel || '(lejárt)';
  }

  return {
    type: 'free',
    text: expiryLabel + (expirySuffix ? ' ' + expirySuffix : ''),
    showDeleteCountdown: true,
    expiresAt: freeEnd,
    expiryClass: expiryClass,
    expiryIcon: expiryIcon,
    daysUntilExpiry: daysUntilExpiry,
  };
}

/**
 * Dokumentum lejárat számításhoz (megtartott viselkedés — nem az Előfizetés oldal szövegei).
 * @returns {Date|null}
 */
function getDocumentsRetentionUntilDate() {
  const sub = window.currentUserSubscription || {};
  const hasActiveArchival =
    typeof window.isArchivalUnlocked === 'function'
      ? window.isArchivalUnlocked(sub)
      : !!(sub.archivalTier && sub.archivalActive !== false);
  const inGracePeriod = isArchivalPostExpiryStaleGracePeriod(sub);
  if (inGracePeriod) {
    return getArchivalStaleDocumentGraceUntilDate(sub);
  }
  if (!hasActiveArchival) return null;
  const expiry = getArchivalSubscriptionEndDate(sub);
  if (!expiry) return null;
  return addCalendarDays(expiry, DOCUMENT_GRACE_DAYS_AFTER_ARCHIVAL_END);
}

/**
 * Visszaadja a dokumentum megőrzési időtartamot napokban (megjelenítéshez).
 * Ha aktív Archiválási: napok ma és (archival lejárat + 7 nap) között; egyébként 42 nap.
 */
function getDocumentRetentionDays() {
  const until = getDocumentsRetentionUntilDate();
  if (until) {
    const now = new Date();
    const days = Math.ceil((until - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  }
  return FREE_TIER_DEFAULT_RETENTION_DAYS;
}

/**
 * Kiszámítja egy dokumentum lejárati idejét.
 * Ha aktív Archiválási: archival lejárat + 7 nap (ugyanaz minden dokumentumnak).
 * Egyébként: feltöltés + 42 nap.
 * @param {Date|string|Timestamp} uploadedAt - Feltöltés időpontja
 * @returns {Date} - Lejárati időpont
 */
function calculateDocumentExpiry(uploadedAt) {
  const archivalState = resolveDocumentArchivalRetentionState();
  if (archivalState.isActive || archivalState.inPostExpiryGrace) {
    return null;
  }

  let uploadDate;
  if (uploadedAt && typeof uploadedAt.toDate === 'function') {
    uploadDate = uploadedAt.toDate();
  } else if (uploadedAt instanceof Date) {
    uploadDate = uploadedAt;
  } else if (typeof uploadedAt === 'string') {
    uploadDate = new Date(uploadedAt);
  } else {
    uploadDate = new Date();
  }

  const freeEnd = calculateFreeRetentionExpiryDate(uploadDate);
  return freeEnd ? new Date(freeEnd.getTime()) : null;
}

/**
 * Formázza a lejárati időpontot emberileg olvasható formátumban.
 * @param {Date} expiresAt - Lejárati időpont
 * @returns {string} - Formázott szöveg
 */
function formatDocumentExpiry(expiresAt) {
  if (!expiresAt) return '';
  
  const now = new Date();
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  const diffMs = expiry - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return '❌ Lejárt';
  } else if (diffDays === 0) {
    return '⚠️ Ma jár le';
  } else if (diffDays === 1) {
    return '⚠️ Holnap jár le';
  } else if (diffDays <= 7) {
    return `⚠️ ${diffDays} nap múlva jár le`;
  } else if (diffDays <= 30) {
    return `${diffDays} nap múlva jár le`;
  } else {
    const locale = (typeof getCurrentLocale === 'function') ? getCurrentLocale() : 'hu-HU';
    const expiryStr = expiry.toLocaleDateString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return `Lejár: ${expiryStr}`;
  }
}

/**
 * Ellenőrzi, hogy a dokumentum még érvényes-e.
 * @param {Date} expiresAt - Lejárati időpont
 * @returns {boolean} - true ha még nem járt le
 */
function isDocumentValid(expiresAt) {
  if (!expiresAt) return true; // Ha nincs expiry, akkor mindig valid
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return expiry > new Date();
}

/**
 * Dokumentum megőrzés megjelenítési szövege (egyetlen modell: előfizetés + 7 nap).
 */
function getArchivalTierName(tier) {
  return 'Előfizetés alatt + 7 nap türelmi idő';
}

/**
 * Tier name display helper
 * Tier típusok: free, pro, tester (max eltávolítva, régi adatnál pro-ként jelenik meg)
 */
function getSubscriptionTierName(tier) {
  const names = {
    'free': 'Free',
    'pro': 'Pro',
    'tester': 'Tesztelő',
    'guest': 'Free'
  };
  return names[tier] || (tier === 'max' ? 'Pro' : tier);
}

// Globális exportok
window.getDocumentsRetentionUntilDate = getDocumentsRetentionUntilDate;
window.getArchivalSubscriptionEndDate = getArchivalSubscriptionEndDate;
window.resolveArchivalSubscriptionEndDate = resolveArchivalSubscriptionEndDate;
window.isArchivalCancelAtPeriodEndPending = isArchivalCancelAtPeriodEndPending;
window.isAppleIapAutoRenewOffProven = isAppleIapAutoRenewOffProven;
window.getArchivalGracePeriodUntilDate = getArchivalGracePeriodUntilDate;
window.getArchivalPaymentGraceUntilDate = getArchivalPaymentGraceUntilDate;
window.isArchivalStripeBilledLocally = isArchivalStripeBilledLocally;
window.isArchivalAppleBilledLocally = isArchivalAppleBilledLocally;
window.isArchivalStripePaymentFailed = isArchivalStripePaymentFailed;
window.isProSubscriptionPaymentProblem = isProSubscriptionPaymentProblem;
window.isProSubscriptionActuallyAffected = isProSubscriptionActuallyAffected;
window.isProStripeSubscriptionCurrentlyHealthy = isProStripeSubscriptionCurrentlyHealthy;
window.isArchivalSubscriptionPaymentProblem = isArchivalSubscriptionPaymentProblem;
window.hasArchivalBillingPaymentGraceState = hasArchivalBillingPaymentGraceState;
window.isArchivalAppleBillingPaymentGrace = isArchivalAppleBillingPaymentGrace;
window.hasArchivalPaymentFailureSignals = hasArchivalPaymentFailureSignals;
window.isArchivalSubscriptionRecoverableForPaymentWarning = isArchivalSubscriptionRecoverableForPaymentWarning;
window.getSubscriptionPaymentProblemSummary = getSubscriptionPaymentProblemSummary;
window.isArchivalSubscriptionBillingActive = isArchivalSubscriptionBillingActive;
window.hasActiveArchivalPackage = hasActiveArchivalPackage;
window.isArchivalPostExpiryStaleGracePeriod = isArchivalPostExpiryStaleGracePeriod;
window.getArchivalStaleDocumentGraceUntilDate = getArchivalStaleDocumentGraceUntilDate;
window.getArchivalDocumentRetentionUntilDate = getArchivalDocumentRetentionUntilDate;
window.resolveArchivalSubscriptionDisplayState = resolveArchivalSubscriptionDisplayState;
window.DOCUMENT_GRACE_DAYS_AFTER_ARCHIVAL_END = DOCUMENT_GRACE_DAYS_AFTER_ARCHIVAL_END;
window.BASE_DOCUMENT_RETENTION_WEEKS = BASE_DOCUMENT_RETENTION_WEEKS;
window.getDocumentRetentionDays = getDocumentRetentionDays;
window.calculateDocumentExpiry = calculateDocumentExpiry;
window.resolveDocumentArchivalRetentionState = resolveDocumentArchivalRetentionState;
window.getDocumentRetentionUi = getDocumentRetentionUi;
window.shouldDeleteDocumentByRetention = function (doc, archivalStateOptional, nowOptional) {
  const archivalState = archivalStateOptional || resolveDocumentArchivalRetentionState(undefined, nowOptional);
  const now = nowOptional instanceof Date ? nowOptional : new Date();
  if (archivalState.isActive) return false;
  if (archivalState.inPostExpiryGrace && archivalState.graceUntil && archivalState.graceUntil.getTime() > now.getTime()) {
    return false;
  }
  const uploadedAt = pickDocumentUploadedAtForRetention(doc);
  if (!uploadedAt) return false;
  const freeEnd = calculateFreeRetentionExpiryDate(uploadedAt);
  if (!freeEnd) return false;
  return now.getTime() > freeEnd.getTime();
};
window.formatDocumentExpiry = formatDocumentExpiry;
window.isDocumentValid = isDocumentValid;
window.getArchivalTierName = getArchivalTierName;
window.getSubscriptionTierName = getSubscriptionTierName;

function subscriptionPriceTrace(place, details) {
  try {
    if (typeof window.gurigoPriceTrace === 'function') {
      window.gurigoPriceTrace(place, details);
      return;
    }
    if (typeof window.GuriGONativeIapBridge !== 'undefined' && window.GuriGONativeIapBridge.priceTrace) {
      window.GuriGONativeIapBridge.priceTrace(place, details);
    }
  } catch (_) { /* ignore */ }
}

function subscriptionLooksLikeUsd(text) {
  try {
    if (typeof window.looksLikeUsdPriceText === 'function') return window.looksLikeUsdPriceText(text);
    if (window.GuriGONativeIapBridge && window.GuriGONativeIapBridge.looksLikeUsdPriceText) {
      return window.GuriGONativeIapBridge.looksLikeUsdPriceText(text);
    }
  } catch (_) { /* ignore */ }
  return false;
}

/** Natív iOS shell — Apple IAP ár csak StoreKit displayPrice (nem countryCode / Intl). */
function isNativeIosSubscriptionPricingContext() {
  try {
    if (typeof window.isNativeIosAppShell === 'function' && window.isNativeIosAppShell()) {
      return true;
    }
    if (window.GURIGO_NATIVE_SHELL === true && String(window.GURIGO_NATIVE_PLATFORM || '').toLowerCase() === 'ios') {
      return true;
    }
  } catch (_) { /* ignore */ }
  return false;
}

function storeKitSubscriptionFallbackLabel() {
  var bridge = window.GuriGONativeIapBridge;
  if (bridge && typeof bridge.getStoreKitPriceFallbackLabel === 'function') {
    return bridge.getStoreKitPriceFallbackLabel();
  }
  return 'Ár betöltése…';
}

/**
 * Pro ár megjelenítéshez — iOS natív: csak StoreKit displayPrice + suffix; web: countryCode.
 * @returns {{ source: 'storekit'|'country', formatted: string, displayPrice?: string, isFallback?: boolean }}
 */
function getSubscriptionProDisplayPrice(countryCode, perMonthSuffix) {
  var traceProductId = 'com.gurigo.pro.monthly';
  if (isNativeIosSubscriptionPricingContext()) {
    var bridge = window.GuriGONativeIapBridge;
    if (bridge && typeof bridge.resolveStoreKitDisplayPrice === 'function') {
      var resolved = bridge.resolveStoreKitDisplayPrice(bridge.Products.PRO, perMonthSuffix || '');
      var traceSource = resolved.traceSource || (resolved.kind === 'price' ? 'storekit_display_price' : 'storekit_fallback_sheet');
      if (resolved.kind === 'price') {
        var outPro = {
          source: 'storekit',
          formatted: resolved.text,
          displayPrice: resolved.displayPrice,
          isFallback: false,
          traceSource: traceSource
        };
        subscriptionPriceTrace('getSubscriptionProDisplayPrice', {
          productType: 'pro',
          productId: traceProductId,
          environment: 'native_ios_apple_iap',
          source: traceSource,
          inputCountryCode: countryCode || '',
          storeKitDisplayPrice: resolved.displayPrice,
          storeKitCurrencyCode: null,
          finalPriceText: outPro.formatted,
          functionName: 'getSubscriptionProDisplayPrice'
        });
        return outPro;
      }
      var outProFb = { source: 'storekit', formatted: resolved.text, isFallback: true, traceSource: traceSource };
      subscriptionPriceTrace('getSubscriptionProDisplayPrice', {
        productType: 'pro',
        productId: traceProductId,
        environment: 'native_ios_apple_iap',
        source: traceSource,
        inputCountryCode: countryCode || '',
        finalPriceText: outProFb.formatted,
        functionName: 'getSubscriptionProDisplayPrice'
      });
      return outProFb;
    }
    var fbNoBridge = storeKitSubscriptionFallbackLabel();
    subscriptionPriceTrace('getSubscriptionProDisplayPrice', {
      productType: 'pro',
      productId: traceProductId,
      environment: 'native_ios_apple_iap',
      source: 'storekit_fallback_loading',
      inputCountryCode: countryCode || '',
      finalPriceText: fbNoBridge,
      functionName: 'getSubscriptionProDisplayPrice'
    });
    return { source: 'storekit', formatted: fbNoBridge, isFallback: true, traceSource: 'storekit_fallback_loading' };
  }
  if (typeof window.getProPrice === 'function') {
    var info = window.getProPrice(countryCode);
    var suffix = perMonthSuffix || '';
    var countryFormatted = (info && info.formatted ? info.formatted : '') + suffix;
    subscriptionPriceTrace('getSubscriptionProDisplayPrice', {
      productType: 'pro',
      productId: traceProductId,
      environment: 'web_stripe',
      source: 'country_code_price',
      inputCountryCode: countryCode || '',
      finalPriceText: countryFormatted,
      functionName: 'getSubscriptionProDisplayPrice'
    });
    return { source: 'country', formatted: countryFormatted, isFallback: false, traceSource: 'country_code_price' };
  }
  return { source: 'country', formatted: '', isFallback: false };
}

/** Archiválás ár — iOS natív: csak StoreKit displayPrice; web: countryCode. */
function getSubscriptionArchivalDisplayPrice(countryCode, perMonthSuffix) {
  var traceArchivalId = 'com.gurigo.archive.monthly';
  if (isNativeIosSubscriptionPricingContext()) {
    var bridge = window.GuriGONativeIapBridge;
    if (bridge && typeof bridge.resolveStoreKitDisplayPrice === 'function') {
      var resolvedArch = bridge.resolveStoreKitDisplayPrice(bridge.Products.ARCHIVAL, perMonthSuffix || '');
      var traceSourceArch = resolvedArch.traceSource || (resolvedArch.kind === 'price' ? 'storekit_display_price' : 'storekit_fallback_sheet');
      if (resolvedArch.kind === 'price') {
        var outArch = {
          source: 'storekit',
          formatted: resolvedArch.text,
          displayPrice: resolvedArch.displayPrice,
          isFallback: false,
          traceSource: traceSourceArch
        };
        subscriptionPriceTrace('getSubscriptionArchivalDisplayPrice', {
          productType: 'archival',
          productId: traceArchivalId,
          environment: 'native_ios_apple_iap',
          source: traceSourceArch,
          inputCountryCode: countryCode || '',
          storeKitDisplayPrice: resolvedArch.displayPrice,
          finalPriceText: outArch.formatted,
          functionName: 'getSubscriptionArchivalDisplayPrice'
        });
        return outArch;
      }
      var outArchFb = { source: 'storekit', formatted: resolvedArch.text, isFallback: true, traceSource: traceSourceArch };
      subscriptionPriceTrace('getSubscriptionArchivalDisplayPrice', {
        productType: 'archival',
        productId: traceArchivalId,
        environment: 'native_ios_apple_iap',
        source: traceSourceArch,
        inputCountryCode: countryCode || '',
        finalPriceText: outArchFb.formatted,
        functionName: 'getSubscriptionArchivalDisplayPrice'
      });
      return outArchFb;
    }
    var fbArchBridge = storeKitSubscriptionFallbackLabel();
    subscriptionPriceTrace('getSubscriptionArchivalDisplayPrice', {
      productType: 'archival',
      productId: traceArchivalId,
      environment: 'native_ios_apple_iap',
      source: 'storekit_fallback_loading',
      inputCountryCode: countryCode || '',
      finalPriceText: fbArchBridge,
      functionName: 'getSubscriptionArchivalDisplayPrice'
    });
    return { source: 'storekit', formatted: fbArchBridge, isFallback: true, traceSource: 'storekit_fallback_loading' };
  }
  if (typeof window.getArchivalPrice === 'function') {
    var archInfo = window.getArchivalPrice('archival', countryCode);
    var perMonth = archInfo && archInfo.perMonth ? archInfo.perMonth : null;
    var lang = (typeof currentLang === 'string') ? currentLang : 'hu';
    if (lang === 'de' && perMonth && perMonth.de) {
      subscriptionPriceTrace('getSubscriptionArchivalDisplayPrice', {
        productType: 'archival',
        productId: traceArchivalId,
        environment: 'web_stripe',
        source: 'country_code_price',
        inputCountryCode: countryCode || '',
        finalPriceText: perMonth.de,
        functionName: 'getSubscriptionArchivalDisplayPrice'
      });
      return { source: 'country', formatted: perMonth.de, isFallback: false, traceSource: 'country_code_price' };
    }
    if (lang === 'en' && archInfo && archInfo.formatted) {
      var archEn = archInfo.formatted + (perMonthSuffix || '/month');
      subscriptionPriceTrace('getSubscriptionArchivalDisplayPrice', {
        productType: 'archival',
        productId: traceArchivalId,
        environment: 'web_stripe',
        source: 'country_code_price',
        inputCountryCode: countryCode || '',
        finalPriceText: archEn,
        functionName: 'getSubscriptionArchivalDisplayPrice'
      });
      return { source: 'country', formatted: archEn, isFallback: false, traceSource: 'country_code_price' };
    }
    if (perMonth && perMonth.hu) {
      subscriptionPriceTrace('getSubscriptionArchivalDisplayPrice', {
        productType: 'archival',
        productId: traceArchivalId,
        environment: 'web_stripe',
        source: 'country_code_price',
        inputCountryCode: countryCode || '',
        finalPriceText: perMonth.hu,
        functionName: 'getSubscriptionArchivalDisplayPrice'
      });
      return { source: 'country', formatted: perMonth.hu, isFallback: false, traceSource: 'country_code_price' };
    }
    if (archInfo && archInfo.formatted) {
      var archFmt = archInfo.formatted + (perMonthSuffix || '');
      subscriptionPriceTrace('getSubscriptionArchivalDisplayPrice', {
        productType: 'archival',
        productId: traceArchivalId,
        environment: 'web_stripe',
        source: 'country_code_price',
        inputCountryCode: countryCode || '',
        finalPriceText: archFmt,
        functionName: 'getSubscriptionArchivalDisplayPrice'
      });
      return { source: 'country', formatted: archFmt, isFallback: false, traceSource: 'country_code_price' };
    }
  }
  return { source: 'country', formatted: '', isFallback: false };
}

/**
 * Korai kedvezmény (Stripe early bird) — csak web/PWA-n.
 * Apple natív iOS shellben minden early bird UI rejtve marad.
 */
function canShowEarlyBirdOffer() {
  return !isNativeIosSubscriptionPricingContext();
}

var EARLY_BIRD_LEGACY_STORAGE_KEYS = [
  'promoReminderAt',
  'promoDeclined',
  'promoModalShown',
  'promoState',
  'gurigo_promo_state',
  'earlyBirdOffer',
  'early_bird_offer',
  'gurigo_early_bird',
];

var EARLY_BIRD_DEEP_LINK_QUERY_KEYS = [
  'promo',
  'earlybird',
  'earlyBird',
  'early_bird',
  'showPromo',
  'promoModal',
  'openPromo',
  'startPromoCheckout',
];

var EARLY_BIRD_DEEP_LINK_HASH_PATTERN = /(^#|\/)(promo|earlybird|early-bird|early_bird|startpromocheckout)([=/?&]|$)/i;

/** UI-hoz: Firestore promoState natív iOS-en soha nem látszik (cached state ellen). */
function getEarlyBirdPromoStateForUi(subOptional) {
  if (!canShowEarlyBirdOffer()) return null;
  var sub = subOptional || window.currentUserSubscription || {};
  return sub.promoState || null;
}

function clearEarlyBirdLegacyClientState() {
  EARLY_BIRD_LEGACY_STORAGE_KEYS.forEach(function (key) {
    try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
    try { sessionStorage.removeItem(key); } catch (_) { /* ignore */ }
  });
}

function purgeEarlyBirdUiArtifacts() {
  try {
    var modal = document.getElementById('promoModal');
    if (modal) modal.remove();
  } catch (_) { /* ignore */ }
  try {
    document.querySelectorAll('[data-gurigo-promo-banner="1"]').forEach(function (el) {
      el.remove();
    });
  } catch (_) { /* ignore */ }
}

function hasEarlyBirdDeepLinkTrigger() {
  try {
    var search = String(window.location.search || '');
    if (search) {
      var params = new URLSearchParams(search);
      for (var i = 0; i < EARLY_BIRD_DEEP_LINK_QUERY_KEYS.length; i++) {
        if (params.has(EARLY_BIRD_DEEP_LINK_QUERY_KEYS[i])) return true;
      }
    }
    var hash = String(window.location.hash || '');
    if (hash && EARLY_BIRD_DEEP_LINK_HASH_PATTERN.test(hash)) return true;
  } catch (_) { /* ignore */ }
  return false;
}

/** Natív iOS: promo deep link param/hash nem nyithat early bird UI-t. */
function consumeEarlyBirdDeepLinkTriggers() {
  if (canShowEarlyBirdOffer()) return false;
  var hadTrigger = hasEarlyBirdDeepLinkTrigger();
  if (!hadTrigger) return false;
  try {
    var url = new URL(window.location.href);
    EARLY_BIRD_DEEP_LINK_QUERY_KEYS.forEach(function (key) {
      url.searchParams.delete(key);
    });
    var hash = String(url.hash || '');
    if (hash && EARLY_BIRD_DEEP_LINK_HASH_PATTERN.test(hash)) {
      url.hash = hash.replace(/#?(promo|earlybird|early-bird|early_bird|startpromocheckout)[^&]*/gi, '') || '';
    }
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  } catch (_) { /* ignore */ }
  purgeEarlyBirdUiArtifacts();
  console.log('[EarlyBird] Deep link promo trigger suppressed on native iOS');
  return true;
}

function wrapEarlyBirdGlobalEntryPoint(name) {
  var current = window[name];
  if (typeof current !== 'function' || current.__earlyBirdGuardWrapped) return;
  var original = current;
  window[name] = function earlyBirdGuardedEntryPoint() {
    if (!canShowEarlyBirdOffer()) {
      purgeEarlyBirdUiArtifacts();
      console.log('[EarlyBird] Blocked window.' + name + ' on native iOS');
      return Promise.resolve(undefined);
    }
    return original.apply(this, arguments);
  };
  window[name].__earlyBirdGuardWrapped = true;
}

function wrapEarlyBirdGlobalEntryPoints() {
  wrapEarlyBirdGlobalEntryPoint('checkAndShowPromoModal');
  wrapEarlyBirdGlobalEntryPoint('startPromoCheckout');
}

function installEarlyBirdNativeIosGuards() {
  if (canShowEarlyBirdOffer()) return;
  clearEarlyBirdLegacyClientState();
  consumeEarlyBirdDeepLinkTriggers();
  purgeEarlyBirdUiArtifacts();
  wrapEarlyBirdGlobalEntryPoints();
}

/** Webes early bird fizetési figyelmeztetés (i18n). */
function getEarlyBirdPaymentWarningMessage() {
  var fallback =
    'A próbaidőszak alatt nem történik terhelés. A korai kedvezmény csak sikeres első fizetés esetén válik véglegessé. ' +
    'Ha a fizetés a Stripe automatikus újrapróbálkozásai után is sikertelen, a kedvezmény elveszik, és később már nem aktiválható újra.';
  try {
    if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
      var lang = translations[currentLang] || {};
      if (lang.promoEarlyBirdPaymentWarning) return lang.promoEarlyBirdPaymentWarning;
    }
  } catch (_) { /* ignore */ }
  return fallback;
}

window.isNativeIosSubscriptionPricingContext = isNativeIosSubscriptionPricingContext;
window.canShowEarlyBirdOffer = canShowEarlyBirdOffer;
window.getEarlyBirdPromoStateForUi = getEarlyBirdPromoStateForUi;
window.getEarlyBirdPaymentWarningMessage = getEarlyBirdPaymentWarningMessage;
window.installEarlyBirdNativeIosGuards = installEarlyBirdNativeIosGuards;
window.purgeEarlyBirdUiArtifacts = purgeEarlyBirdUiArtifacts;
window.getSubscriptionProDisplayPrice = getSubscriptionProDisplayPrice;
window.getSubscriptionArchivalDisplayPrice = getSubscriptionArchivalDisplayPrice;

installEarlyBirdNativeIosGuards();
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', installEarlyBirdNativeIosGuards);
  window.addEventListener('load', installEarlyBirdNativeIosGuards);
  setTimeout(installEarlyBirdNativeIosGuards, 1500);
  setTimeout(installEarlyBirdNativeIosGuards, 3000);
}
