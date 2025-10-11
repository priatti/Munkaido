// === ELŐFIZETÉSI OLDAL RENDERELÉS ===
function renderSubscriptionPage() {
  const container = document.getElementById('subscription-tiers-container');
  if (!container || !window.SUBSCRIPTION_TIERS) return;

  const currentTier = (window.currentUserSubscription && window.currentUserSubscription.tier) || 'guest';
  const currentLang = window.currentLang || 'hu';

  const currentTierName = document.getElementById('current-tier-name');
  const currentTierBadge = document.getElementById('current-tier-badge');
  if (currentTierName && currentTierBadge) {
    currentTierName.textContent = window.SUBSCRIPTION_TIERS[currentTier].name[currentLang];
    currentTierBadge.textContent = window.SUBSCRIPTION_TIERS[currentTier].badge || '📦';
  }

  container.innerHTML = Object.values(window.SUBSCRIPTION_TIERS).map(function(tier){
    const isCurrent = tier.id === currentTier;
    const isUpgrade = getTierLevel(tier.id) > getTierLevel(currentTier);
    const priceHtml = tier.price.monthly === 0
      ? '<span class="text-green-600">Ingyenes</span>'
      : (tier.price.monthly.toLocaleString() + ' Ft<span class="text-sm">/hó</span>');

    const features = Object.keys(tier.features).map(function(key){
      const value = tier.features[key];
      const icon = (value === true || value === -1) ? '✅' : '❌';
      return '<li class="flex items-start gap-2"><span>'+icon+'</span><span>'+getFeatureText(key, value)+'</span></li>';
    }).join('');

    const button =
      isCurrent
        ? '<button class="w-full py-3 bg-gray-200 dark:bg-gray-700 rounded-lg font-semibold cursor-default">Jelenlegi csomag</button>'
        : (isUpgrade
            ? '<button onclick="handleSubscriptionUpgrade(\''+tier.id+'\')" class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold">Váltás erre</button>'
            : '<button class="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-lg font-semibold cursor-not-allowed">Alacsonyabb szint</button>'
          );

    return [
      '<div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-2 ',
      (isCurrent ? 'border-indigo-500' : 'border-gray-200 dark:border-gray-700'),
      '">',
        '<div class="text-center">',
          '<div class="text-4xl mb-3">', (tier.badge || '📦'), '</div>',
          '<h3 class="text-xl font-bold mb-2">', tier.name[currentLang], '</h3>',
          '<div class="text-3xl font-bold mb-4">', priceHtml, '</div>',
        '</div>',
        '<ul class="space-y-2 mb-6 text-sm">', features, '</ul>',
        button,
      '</div>'
    ].join('');
  }).join('');
}

function getTierLevel(tierId) {
  var levels = { guest: 0, free: 1, pro: 2, max: 3 };
  return levels[tierId] || 0;
}

function getFeatureText(key, value) {
  var texts = {
    maxRecords: value === -1 ? 'Korlátlan rekord' : ('Max '+value+' rekord'),
    maxPallets: value === -1 ? 'Korlátlan raklap' : ('Max '+value+' raklap'),
    tachograph: 'Tachográf elemzés',
    stats: 'Statisztikák',
    report: 'PDF riportok',
    cloudSync: 'Felhő szinkronizáció',
    exportData: 'Adatok exportálása',
    multiDevice: 'Több eszköz',
    advancedStats: 'Haladó statisztikák',
    customReports: 'Egyedi riportok',
    prioritySupport: 'Prioritás támogatás',
    aiAssistant: 'AI asszisztens',
    whiteLabel: 'Saját márka',
    apiAccess: 'API hozzáférés'
  };
  return texts[key] || key;
}

function handleSubscriptionUpgrade(tierId) {
  var currentLang = window.currentLang || 'hu';
  if (typeof showCustomAlert === 'function') {
    showCustomAlert(
      '🚧 Fizetési rendszer még fejlesztés alatt.\n\n' +
      'Hamarosan elérhető lesz a(z) ' + window.SUBSCRIPTION_TIERS[tierId].name[currentLang] + ' csomag megvásárlása!',
      'info'
    );
  } else {
    alert('Fizetési rendszer még fejlesztés alatt.');
  }
}

window.renderSubscriptionPage = renderSubscriptionPage;
