// === ELŐFIZETÉSI SZINTEK KONFIGURÁCIÓJA ===
window.SUBSCRIPTION_TIERS = {
  guest: {
    id: 'guest',
    name: { hu: 'Vendég', de: 'Gast' },
    features: {
      maxRecords: 10,
      maxPallets: 5,
      tachograph: false,
      stats: false,
      report: false,
      cloudSync: false,
      exportData: false,
      multiDevice: false
    },
    price: { monthly: 0, yearly: 0 },
    color: 'gray'
  },
  free: {
    id: 'free',
    name: { hu: 'Ingyenes', de: 'Kostenlos' },
    features: {
      maxRecords: 50,
      maxPallets: 20,
      tachograph: true,
      stats: true,
      report: true,
      cloudSync: true,
      exportData: true,
      multiDevice: true
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
      prioritySupport: true
    },
    price: { monthly: 2990, yearly: 29990 },
    color: 'indigo',
    badge: '⭐'
  },
  max: {
    id: 'max',
    name: { hu: 'Max', de: 'Max' },
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
    price: { monthly: 4990, yearly: 49990 },
    color: 'purple',
    badge: '👑'
  }
};

// === JOGOSULTSÁG ELLENŐRZÉS ===
window.hasFeatureAccess = function(feature) {
  const userTier = (window.currentUserSubscription && window.currentUserSubscription.tier) || 'guest';
  const tierConfig = window.SUBSCRIPTION_TIERS[userTier];
  if (!tierConfig) return false;
  if (!(feature in tierConfig.features)) return false;
  return tierConfig.features[feature] === true || tierConfig.features[feature] === -1;
};

// === LIMIT ELLENŐRZÉS ===
window.checkLimit = function(feature, currentCount) {
  const userTier = (window.currentUserSubscription && window.currentUserSubscription.tier) || 'guest';
  const tierConfig = window.SUBSCRIPTION_TIERS[userTier];
  if (!tierConfig || !(feature in tierConfig.features)) return false;
  const limit = tierConfig.features[feature];
  if (limit === -1) return true; // unlimited
  return currentCount < limit;
};

// === UPGRADE PROMPT ===
window.showUpgradePrompt = function(feature) {
  const currentLang = window.currentLang || 'hu';
  const userTier = (window.currentUserSubscription && window.currentUserSubscription.tier) || 'guest';
  const tierName = (window.SUBSCRIPTION_TIERS[userTier] && window.SUBSCRIPTION_TIERS[userTier].name[currentLang]) || userTier;
  if (typeof showCustomAlert === 'function') {
    showCustomAlert(
      '🔒 Ez a funkció a magasabb előfizetési csomagokban érhető el.\n\n' +
      'Jelenlegi csomag: ' + tierName + '\n\n' +
      'Válts Pro csomagra a teljes hozzáféréshez!',
      'warning',
      function(){ if (typeof showTab === 'function') showTab('subscription'); },
      { confirmText: '⭐ Előfizetési csomagok', confirmClass: 'bg-indigo-600 hover:bg-indigo-700' }
    );
  } else {
    alert('Ez a funkció a magasabb előfizetési csomagokban érhető el.');
  }
};
