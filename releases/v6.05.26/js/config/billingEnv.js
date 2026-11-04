// ===========================
//  BILLING ENV CONFIG – GuriGO
//  Környezet-alapú billing konfiguráció
//  /beta → TEST, minden más → PROD
// ===========================

(function() {
  'use strict';

  /**
   * Környezet detektálása URL alapján
   * @returns {'test' | 'prod'}
   */
  function detectEnv() {
    const pathname = window.location.pathname;
    const search = window.location.search;
    
    // /beta kezdetű útvonalak → TEST
    if (pathname.startsWith('/beta')) {
      return 'test';
    }
    
    // ?beta=1 paraméter → TEST
    if (search.includes('beta=1')) {
      return 'test';
    }
    
    // Minden más → PROD
    return 'prod';
  }

  /**
   * FIGYELEM:
   * - Billingo SECRET kulcsok SOHA ne kerüljenek a frontendbe
   * - Billingo csak backend (Cloud Functions)
   * - Stripe publishable key lehet frontendben
   * 
   * KÉSŐBB: prod ágba kerülnek a LIVE kulcsok/ID-k
   * Most mindkét ENV ugyanazt a TEST beállítást használja
   */
  window.BILLING_CONFIG = (() => {
  const env = detectEnv();
  
  console.log('[BillingEnv] Frontend config loading for env:', env);

  const CONFIG = {
    // PRODUCTION környezet (LIVE kulcsok)
    prod: {
      env: "prod",
      // LIVE Stripe publishable key
      stripePublishableKey: "pk_live_51SNURKApqJc5EmffZgSD76F3ujKZBK8J5N7D3oOmFCH3N6JDs1ZM3Ss0y4JzkC9JGJhx7i4qh07RQeITFPPXxc0x00QLTgmcEe",
      
      stripePriceIds: {
        pro_huf: "price_1SrO2BApqJc5EmffwiiGyeZB",
        pro_eur: "price_1SrO2BApqJc5EmfftOJU2MmC",
        pro_pln: "price_1SyVTZApqJc5EmffmRoEcNze",
        pro_ron: "price_1SyVTOApqJc5EmffKyPPxCgJ",
        pro_dkk: "price_1ThCiwApqJc5EmffD7lsHETv",
        pro_nok: "price_1ThCldApqJc5Emffyf8CNeOk",
        archival_huf: "price_1SwTsvApqJc5EmffJw9XOirG",
        archival_eur: "price_1SwTsvApqJc5EmffVMlEKHA2",
        archival_pln: "price_1SyVh9ApqJc5EmffVZfdw9nb",
        archival_ron: "price_1SyVgyApqJc5EmffKaZEqYbQ",
        archival_dkk: "price_1ThCprApqJc5Emffq1IuUi9l",
        archival_nok: "price_1ThCqJApqJc5EmffIOIl9nD4",
      },
      
      // Cloud Functions URL-ek
      cloudFunctions: {
        createCheckoutSession: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/createCheckoutSession",
        resumeSubscription: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/resumeSubscription",
        resumeArchivalSubscription: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/resumeArchivalSubscription",
        upgradeArchivalSubscription: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/upgradeArchivalSubscription",
        previewArchivalUpgrade: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/previewArchivalUpgrade",
        cancelSubscription: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/cancelSubscription",
        cancelArchivalSubscription: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/cancelArchivalSubscription",
        createCustomerPortalSession: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/createCustomerPortalSession",
        releaseStripeCheckoutPending: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/releaseStripeCheckoutPending",
        previewBillingCycleChange: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/previewBillingCycleChange",
        updateBillingCycleDay: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/updateBillingCycleDay",
        completeBillingCycleDayChange: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/completeBillingCycleDayChange",
      }
    },

    // TEST környezet (/beta)
    test: {
      env: "test",
      stripePublishableKey: "pk_test_51SNURcA9d0NltB9RhLaoMNN3fyPzrIElRtnAbvvTALF4xBlWhGoXnUjezdbwKb3ZtdenreqzmwGPkHI1nkV61tNI00wmHl5He6",
      
      stripePriceIds: {
        pro_huf: "price_1SeiGrA9d0NltB9RnrPyHcIt",
        pro_eur: "price_1SeiGrA9d0NltB9RF7tIWTqn",
        pro_pln: "price_1SyVRrA9d0NltB9RvxrMz8jt",
        pro_ron: "price_1SyVRrA9d0NltB9RNYEpk38T",
        pro_dkk: "price_1ThCrqA9d0NltB9RTPLQbdBl",
        pro_nok: "price_1ThCsFA9d0NltB9RqAefoBWw",
        archival_huf: "price_1SyZLmA9d0NltB9RV09Wt5O2",
        archival_eur: "price_1SyZLyA9d0NltB9RBG2GIKSk",
        archival_pln: "price_1SyVkBA9d0NltB9RzeuqeOtx",
        archival_ron: "price_1SyVk3A9d0NltB9Ryw5kURCP",
        archival_dkk: "price_1ThCszA9d0NltB9RPabQ177Y",
        archival_nok: "price_1ThCtIA9d0NltB9RnQD2xXMl",
      },
      
      cloudFunctions: {
        createCheckoutSession: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/createCheckoutSession",
        resumeSubscription: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/resumeSubscription",
        resumeArchivalSubscription: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/resumeArchivalSubscription",
        upgradeArchivalSubscription: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/upgradeArchivalSubscription",
        previewArchivalUpgrade: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/previewArchivalUpgrade",
        cancelSubscription: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/cancelSubscription",
        cancelArchivalSubscription: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/cancelArchivalSubscription",
        createCustomerPortalSession: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/createCustomerPortalSession",
        releaseStripeCheckoutPending: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/releaseStripeCheckoutPending",
        previewBillingCycleChange: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/previewBillingCycleChange",
        updateBillingCycleDay: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/updateBillingCycleDay",
        completeBillingCycleDayChange: "https://europe-west1-munkaido-3cc44.cloudfunctions.net/completeBillingCycleDayChange",
      }
    },
  };

  return CONFIG[env];
})();

  // Exportáljuk a testModeot, hogy a backend hívásokhoz átadhassuk
  window.BILLING_CONFIG.testMode = (window.BILLING_CONFIG.env === 'test');

  // Console.log a fejlesztéshez
  const mode = window.BILLING_CONFIG.testMode ? '🧪 TEST' : '💳 LIVE';
  console.log(`%c[BillingEnv] Mode: ${mode} | Host: ${window.location.hostname} | Path: ${window.location.pathname} | Search: ${window.location.search}`, 
    window.BILLING_CONFIG.testMode ? 'color: #FF9800' : 'color: #4CAF50');
  console.log('[BillingEnv] DEBUG - testMode:', window.BILLING_CONFIG.testMode, 'env:', window.BILLING_CONFIG.env);

  /**
   * Stripe Price ID lekérése tier és regisztrációs országkód alapján
   * @param {string} tier - 'pro', 'archival'
   * @param {string} countryCode - Regisztrációs ország (HU, PL, RO, ...)
   * @returns {string} Stripe Price ID
   */
  window.getStripePriceId = function(tier, countryCode) {
    const cc = (countryCode || '').toUpperCase();
    // Pro: HU→HUF, PL→PLN, RO→RON, DK→DKK, NO→NOK, egyéb→EUR
    const proSuffix = cc === 'HU' ? 'huf' : cc === 'PL' ? 'pln' : cc === 'RO' ? 'ron' : cc === 'DK' ? 'dkk' : cc === 'NO' ? 'nok' : 'eur';
    // Archiválás: HU→HUF, PL→PLN, RO→RON, DK→DKK, NO→NOK, egyéb→EUR
    const archivalSuffix = cc === 'HU' ? 'huf' : cc === 'PL' ? 'pln' : cc === 'RO' ? 'ron' : cc === 'DK' ? 'dkk' : cc === 'NO' ? 'nok' : 'eur';

    if (tier === 'pro') {
      return window.BILLING_CONFIG.stripePriceIds[`pro_${proSuffix}`];
    }
    if (tier === 'archival') {
      return window.BILLING_CONFIG.stripePriceIds[`archival_${archivalSuffix}`] || null;
    }
    console.warn('[BillingEnv] Unknown tier:', tier);
    return null;
  };

  // Debug log (később eltávolítható)
  console.log('[BillingEnv] Environment:', window.BILLING_CONFIG.env, '| Path:', window.location.pathname);
})();
