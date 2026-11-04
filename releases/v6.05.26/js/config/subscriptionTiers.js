// === ELŐFIZETÉSI SZINTEK KONFIGURÁCIÓJA ===
window.SUBSCRIPTION_TIERS = {
  free: {
    id: 'free',
    name: { hu: 'Free', de: 'Free' },
    features: {
      maxRecords: -1,
      maxPallets: -1,
      tachograph: false,
      stats: true,
      report: true,
      cloudSync: true,
      exportData: true,
      multiDevice: true,
      advancedStats: true,
      customReports: true,
      prioritySupport: true,
      aiAssistant: true,
      whiteLabel: true,
      apiAccess: true
    },
    price: { monthly: 0, yearly: 0 },
    color: 'blue',
    badge: '🆓'
  },
  pro: {
    id: 'pro',
    name: { hu: 'Pro', de: 'Pro' },
    features: {
      maxRecords: -1, // unlimited
      maxPallets: -1,
      tachograph: true,
      stats: true,
      report: true,
      cloudSync: true,
      exportData: true,
      multiDevice: true,
      advancedStats: true,
      customReports: true,
      prioritySupport: true,
      aiAssistant: true,
      whiteLabel: true,
      apiAccess: true
    },
    price: { monthly: 2990, yearly: 29990 },
    color: 'indigo',
    badge: '⭐'
  },
  tester: {
    id: 'tester',
    name: { hu: 'Tesztelő', de: 'Tester' },
    features: {
      maxRecords: -1,
      maxPallets: -1,
      tachograph: true,
      stats: true,
      report: true,
      cloudSync: true,
      exportData: true,
      multiDevice: true,
      advancedStats: true,
      customReports: true,
      prioritySupport: true,
      aiAssistant: true,
      whiteLabel: true,
      apiAccess: true
    },
    price: { monthly: 0, yearly: 0 },
    color: 'green',
    badge: '🧪'
  }
};

// === JOGOSULTSÁG ELLENŐRZÉS ===
const MS_42_DAYS = 42 * 24 * 60 * 60 * 1000;

window.getEffectiveSubscriptionTier = function(subOptional) {
  const sub = (subOptional && typeof subOptional === 'object') ? subOptional : (window.currentUserSubscription || {});
  const now = new Date();

  function pickDate(v) {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v.toDate === 'function') {
      const d = v.toDate();
      return (d instanceof Date && !isNaN(d.getTime())) ? d : null;
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  // Offline/localStorage cache is not a trusted contributor; fail closed until online revalidation.
  if (sub.__fromOfflineCache === true) return 'free';

  // Canonical tester (entitlements/main.isTester or provider == 'tester')
  if (sub.entitlementsIsTester === true || sub.entitlementsProvider === 'tester') return 'tester';

  // Canonical Pro entitlement (entitlements/main.isPro) with expiry validation.
  // If the canonical doc has a past expiresAt, do not grant Pro from stale isPro.
  if (sub.entitlementsIsPro === true) {
    const entExp = pickDate(sub.entitlementsExpiresAt);
    if (!entExp || entExp > now) return 'pro';
  }

  // Admin / manual gift contributor (from canonical entitlements/main)
  const ag = sub.entitlementsAdminGift || sub.adminGift;
  if (ag && typeof ag === 'object' && ag.contributesPro === true) {
    if (ag.isLifetime === true || ag.giftType === 'lifetime') return 'pro';
    const endsAt = pickDate(sub.adminGiftEndsAt) || pickDate(ag.endsAt);
    if (!endsAt || endsAt > now) return 'pro';
  }

  // Transitional rule-bounded active 42-day trial.
  // Cannot be extended by client: trialEnd must be within 42 days of trialStartedAt
  // and trialStartedAt must not be in the future.
  const trialStartedAt = pickDate(sub.trialStartedAt);
  const trialEnd = pickDate(sub.trialEnd);
  if (
    sub.isTrial === true &&
    trialStartedAt &&
    trialStartedAt <= now &&
    trialEnd &&
    trialEnd > now &&
    (trialEnd.getTime() - trialStartedAt.getTime()) <= MS_42_DAYS
  ) {
    const stripeSubId = (sub.stripeSubscriptionId && String(sub.stripeSubscriptionId).trim()) || '';
    if (!stripeSubId) return 'pro';
  }

  // Legacy tier / client-writable subscription mirrors are NEVER authorization grantors.
  return 'free';
};

window.hasFeatureAccess = function(feature) {
  const userTier = (typeof window.getEffectiveSubscriptionTier === 'function')
    ? window.getEffectiveSubscriptionTier()
    : 'free';
  const tierConfig = window.SUBSCRIPTION_TIERS[userTier];
  if (!tierConfig) return false;
  if (!(feature in tierConfig.features)) return false;
  return tierConfig.features[feature] === true || tierConfig.features[feature] === -1;
};

// === LIMIT ELLENŐRZÉS ===
window.checkLimit = function(feature, currentCount) {
  const userTier = (typeof window.getEffectiveSubscriptionTier === 'function')
    ? window.getEffectiveSubscriptionTier()
    : 'free';
  const tierConfig = window.SUBSCRIPTION_TIERS[userTier];
  if (!tierConfig || !(feature in tierConfig.features)) return false;
  const limit = tierConfig.features[feature];
  if (limit === -1) return true; // unlimited
  return currentCount < limit;
};

// === UPGRADE PROMPT ===
window.showUpgradePrompt = function(feature) {
  const currentLang = window.currentLang || 'hu';
  const rawTier = (window.currentUserSubscription && window.currentUserSubscription.tier) || 'free';
  const userTier = (rawTier === 'max') ? 'pro' : ((rawTier === 'guest') ? 'free' : rawTier);
  const tierName = (window.SUBSCRIPTION_TIERS[userTier] && window.SUBSCRIPTION_TIERS[userTier].name[currentLang]) || userTier;
  if (typeof showCustomAlert === 'function') {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang]) ? translations[currentLang] : {};
    const fullMsg = (i18n.subscriptionTiersUpgradeFullMessage || '🔒 Ez a funkció a magasabb előfizetési csomagokban érhető el.\n\nJelenlegi csomag: {tierName}\n\nVálts Pro csomagra a teljes hozzáféréshez!').replace('{tierName}', tierName);
    const confirmText = i18n.subscriptionTiersUpgradeConfirmText || '⭐ Előfizetési csomagok';
    showCustomAlert(
      fullMsg,
      'warning',
      function(){ if (typeof window.showTab === 'function') window.showTab('subscription'); },
      { confirmText, confirmClass: 'bg-indigo-600 hover:bg-indigo-700' }
    );
  } else {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang]) ? translations[currentLang] : {};
    alert(i18n.subscriptionTiersUpgradeRequired || 'Ez a funkció a magasabb előfizetési csomagokban érhető el.');
  }
};

// === ENTITLEMENT RESOLUTION STATE (frontend presentation only) ===
function isEntitlementResolved() {
  return !!(window.currentUserSubscription && window.currentUserSubscription.__entitlementResolved === true);
}

function getEntitlementPresentationState() {
  if (!isEntitlementResolved()) {
    if (window.currentUserSubscription && window.currentUserSubscription.__fromOfflineCache === true) return 'offline';
    return 'unknown';
  }
  return window.getEffectiveSubscriptionTier();
}

window.isEntitlementResolved = isEntitlementResolved;
window.getEntitlementPresentationState = getEntitlementPresentationState;
