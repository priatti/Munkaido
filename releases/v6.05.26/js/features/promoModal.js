// ===========================
//  PROMO MODAL - GuriGO
//  Early Supporter Promo Popup UI
//  Vanilla JS modal implementation
// ===========================

import { 
  initializePromoState, 
  markPromoReminded, 
  markPromoDeclined, 
  getPromoDetails, 
  formatTimeLeft 
} from './promoManager.js';

let timerInterval = null;

/**
 * Show promo modal popup
 * @param {string} promoType - '40' or '20'
 * @param {number} timeLeft - Milliseconds until expiry (optional)
 * @param {boolean} initPromo - Whether to initialize promo state in Firestore
 */
export async function showPromoModal(promoType, timeLeft = null, initPromo = false) {
  if (typeof window.canShowEarlyBirdOffer === 'function' && !window.canShowEarlyBirdOffer()) {
    console.log('[PromoModal] Early bird modal suppressed (native iOS / Apple IAP context)');
    return;
  }

  // Close any existing modal first
  closePromoModal();

  // Wait a bit for translations to load if needed
  if (typeof translations === 'undefined' || typeof currentLang === 'undefined') {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const { discount, price, normalPrice, currency } = getPromoDetails(promoType);
  const user = window.currentUser;

  if (!user) {
    console.warn('[PromoModal] No user logged in');
    return;
  }

  // Initialize promo state in Firestore if first time
  const defaultPromoDuration = 48 * 60 * 60 * 1000;

  if (initPromo) {
    await initializePromoState(user.uid, promoType);
    // Set timeLeft to 48 hours
    timeLeft = defaultPromoDuration;
  }

  const effectiveTimeLeft = (typeof timeLeft === 'number' && timeLeft > 0) ? timeLeft : defaultPromoDuration;
  const timeLeftStr = formatTimeLeft(effectiveTimeLeft);

  // i18n support with direct fallback
  const lang = typeof currentLang !== 'undefined' ? currentLang : 'hu';
  
  const t = (key, fallback) => {
    // Try translations object first
    if (typeof translations !== 'undefined' && translations[lang] && translations[lang][key]) {
      return translations[lang][key];
    }
    
    // Direct fallback based on language
    const directTranslations = {
      de: {
        promoModalTitle: '🎉 Dein Spezialangebot!',
        promoModalIntro: 'Wir sehen, dass du GuriGO aktiv nutzt!<br>Als Dankeschön haben wir ein exklusives Angebot für dich:',
        promoModalAcceptButton: '✨ Jetzt abonnieren',
        promoModalRemindButton: '🔔 Später erinnern (in 24 Stunden)',
        promoModalDeclineButton: 'Kein Interesse',
        promoModalImportantInfo: 'Wichtige Informationen',
        promoModalInfo1: 'Jetzt nur Kartenprüfung, keine Belastung',
        promoModalInfo2: 'Zahlung erst nach Ablauf der Testphase',
        promoModalInfo3: 'Jederzeit kündbar, keine Verpflichtung',
        promoModalFreeLimitsTitle: 'Was ändert sich mit dem Free-Paket?',
        promoModalFreeLimit1: 'Tachograph-Analyse und Wochenstatus nicht verfügbar',
        promoModalFreeLimit2: 'Nur EUR-Palettenerfassung, max. 3 Einträge pro Tag',
        promoModalFreeLimit3: 'Maximal 2 Dokument-Uploads pro Tag'
      },
      en: {
        promoModalTitle: '🎉 Your special offer!',
        promoModalIntro: 'We see you\'re actively using GuriGO!<br>As a thank you, we have an exclusive offer for you:',
        promoModalAcceptButton: '✨ Subscribe now',
        promoModalRemindButton: '🔔 Remind me later (in 24 hours)',
        promoModalDeclineButton: 'Not interested',
        promoModalImportantInfo: 'Important information',
        promoModalInfo1: 'Card verification only, no charge now',
        promoModalInfo2: 'Payment only after trial period ends',
        promoModalInfo3: 'Cancel anytime, no obligation',
        promoModalFreeLimitsTitle: 'What changes with the Free plan?',
        promoModalFreeLimit1: 'Tachograph analysis and weekly status not available',
        promoModalFreeLimit2: 'Only EUR pallet recording, max 3 entries per day',
        promoModalFreeLimit3: 'Maximum 2 document uploads per day'
      },
      pl: {
        promoModalTitle: '🎉 Specjalna oferta dla Ciebie!',
        promoModalIntro: 'Widzimy, że aktywnie korzystasz z GuriGO!<br>W podziękowaniu oferujemy Ci ekskluzywną ofertę:',
        promoModalAcceptButton: '✨ Subskrybuj teraz',
        promoModalRemindButton: '🔔 Przypomnij później (za 24 godziny)',
        promoModalDeclineButton: 'Nie jestem zainteresowany',
        promoModalImportantInfo: 'Ważne informacje',
        promoModalInfo1: 'Tylko weryfikacja karty, bez opłat teraz',
        promoModalInfo2: 'Płatność dopiero po zakończeniu okresu próbnego',
        promoModalInfo3: 'Możesz anulować w każdej chwili, bez zobowiązań',
        promoModalFreeLimitsTitle: 'Co się zmienia w planie Bezpłatnym?',
        promoModalFreeLimit1: 'Analiza tachografu i status tygodniowy niedostępne',
        promoModalFreeLimit2: 'Tylko rejestracja palet EUR, maks. 3 wpisy dziennie',
        promoModalFreeLimit3: 'Maksymalnie 2 przesłane dokumenty dziennie'
      },
      ro: {
        promoModalTitle: '🎉 Ofertă specială pentru tine!',
        promoModalIntro: 'Vedem că folosești activ GuriGO!<br>Ca mulțumire, îți oferim o ofertă exclusivă:',
        promoModalAcceptButton: '✨ Abonează-te acum',
        promoModalRemindButton: '🔔 Amintește-mi mai târziu (peste 24 ore)',
        promoModalDeclineButton: 'Nu mă interesează',
        promoModalImportantInfo: 'Informații importante',
        promoModalInfo1: 'Doar verificarea cardului, fără taxare acum',
        promoModalInfo2: 'Plata doar după terminarea perioadei de probă',
        promoModalInfo3: 'Poți anula oricând, fără obligații',
        promoModalFreeLimitsTitle: 'Ce se schimbă cu planul Gratuit?',
        promoModalFreeLimit1: 'Analiza tahografului și statusul săptămânal nu sunt disponibile',
        promoModalFreeLimit2: 'Doar înregistrarea paleților EUR, max. 3 înregistrări pe zi',
        promoModalFreeLimit3: 'Maximum 2 documente încărcate pe zi'
      }
    };
    
    if (directTranslations[lang] && directTranslations[lang][key]) {
      return directTranslations[lang][key];
    }
    
    return fallback;
  };

  const modalTitle = t('promoModalTitle', '🎉 Speciális ajánlat számodra!');
  const modalIntro = t('promoModalIntro', 'Látjuk, hogy aktívan használod a GuriGO-t!<br>Köszönetképpen egyedi ajánlatot adunk:');
  const discountLabel = t('promoModalDiscountLabel', '🔥 %DISCOUNT%% kedvezmény az első hónapra').replace('%DISCOUNT%', discount);
  const discountHeading = t('promoOfferDiscountHeading', '🔥 %DISCOUNT%% kedvezmény').replace('%DISCOUNT%', discount);
  const priceLabel = t('promoModalPriceLabel', '💰 Csak %PRICE% Ft').replace('%PRICE%', price);
  const normalPriceLabel = t('promoModalNormalPrice', 'normál ár: %NORMAL_PRICE% Ft').replace('%NORMAL_PRICE%', normalPrice);
  const priceValue = t('promoOfferPriceValue', '%PRICE% %CURRENCY%').replace('%PRICE%', price).replace('%CURRENCY%', currency);
  const normalPriceValue = t('promoOfferNormalPriceValue', '%PRICE% %CURRENCY%').replace('%PRICE%', normalPrice).replace('%CURRENCY%', currency);
  const timerLabel = t('promoModalTimerLabel', '⏰ Ez az ajánlat <strong>%TIME_LEFT%</strong> érvényes,<br>és csak egyszer érhető el.').replace('%TIME_LEFT%', timeLeftStr);
  const timerBoxLabel = t('promoTimerBoxLabel', 'Az ajánlat érvényes még');
  const disclaimer = t('promoModalDisclaimer', '* A kedvezmény csak az első hónapra vonatkozik');
  const earlyBirdPaymentWarning = (typeof window.getEarlyBirdPaymentWarningMessage === 'function')
    ? window.getEarlyBirdPaymentWarningMessage()
    : t(
      'promoEarlyBirdPaymentWarning',
      'A próbaidőszak alatt nem történik terhelés. A korai kedvezmény csak sikeres első fizetés esetén válik véglegessé. Ha a fizetés a Stripe automatikus újrapróbálkozásai után is sikertelen, a kedvezmény elveszik, és később már nem aktiválható újra.',
    );
  const acceptButton = t('promoModalAcceptButton', '✨ Előfizetek most');
  const remindButton = t('promoModalRemindButton', '🔔 Emlékeztess később (24 óra múlva)');
  const declineButton = t('promoModalDeclineButton', 'Nem érdekel');
  
  // Important info texts
  const importantInfoTitle = t('promoModalImportantInfo', 'Fontos tudnivalók');
  const importantInfoPoint1 = t('promoModalInfo1', 'Most csak kártyaellenőrzés, nincs terhelés');
  const importantInfoPoint2 = t('promoModalInfo2', 'Fizetés csak a próbaidő lejárta után');
  const importantInfoPoint3 = t('promoModalInfo3', 'Bármikor lemondható, nincs kötelezettség');

  // Free plan limitations texts
  const freeLimitsTitle = t('promoModalFreeLimitsTitle', 'Mi változik a Free csomaggal?');
  const freeLimit1 = t('promoModalFreeLimit1', 'A tachográf elemzés és heti státusz nem elérhető');
  const freeLimit2 = t('promoModalFreeLimit2', 'Csak EUR raklap rögzítése lehetséges, napi max 3 bejegyzés');
  const freeLimit3 = t('promoModalFreeLimit3', 'Naponta legfeljebb 2 dokumentum feltöltés');

  const modalHTML = `
    <div id="promoModal" class="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      <!-- Backdrop/Overlay -->
      <div class="absolute inset-0 bg-black bg-opacity-70"></div>
      
      <!-- Modal Content -->
      <div class="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in relative z-10" style="max-height: 85vh; overflow-y: auto;">
        
        <!-- Drag handle for mobile -->
        <div class="sm:hidden flex justify-center pt-2 pb-1">
          <div class="w-10 h-1 bg-gray-300 rounded-full"></div>
        </div>
        
        <!-- Header with gradient -->
        <div class="bg-gradient-to-r from-blue-600 to-purple-600 p-3 sm:p-4 text-white text-center">
          <div class="text-3xl sm:text-4xl mb-1 sm:mb-2">🎉</div>
          <h2 class="text-lg sm:text-xl font-bold mb-1">
            ${modalTitle}
          </h2>
          <p class="text-blue-100 text-xs sm:text-sm">
            ${modalIntro}
          </p>
        </div>
        
        <!-- Offer box -->
        <div class="p-3 sm:p-4">
          <div class="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-400 rounded-xl p-3 sm:p-4 mb-3 text-center">
            <div class="text-orange-600 font-bold text-sm sm:text-base mb-1">
              ${discountHeading}
            </div>
            <div class="text-3xl sm:text-4xl font-black text-gray-900 mb-1">
              ${priceValue}
            </div>
            <div class="text-xs sm:text-sm text-gray-500 line-through">
              ${normalPriceValue}
            </div>
          </div>
          
          <!-- Timer box -->
          <div class="bg-gray-100 rounded-lg p-2 sm:p-3 mb-3 text-center">
            <div class="text-xs font-semibold text-gray-600 mb-1">
              ${timerBoxLabel}
            </div>
            <div id="promoTimer" class="text-base sm:text-lg font-bold text-gray-900">
              ${formatTimeLeft(timeLeft)}
            </div>
          </div>
          
          <!-- Timer label -->
          <div class="text-center mb-3">
            <p class="text-xs text-gray-600">
              ${timerLabel}
            </p>
          </div>
          
          <!-- Important info -->
          <div class="bg-blue-50 rounded-lg p-2 sm:p-3 mb-3">
            <h4 class="text-xs sm:text-sm font-semibold text-blue-900 mb-1 sm:mb-2">
              ${importantInfoTitle}
            </h4>
            <ul class="text-xs text-blue-800 space-y-0.5 sm:space-y-1">
              <li>• ${importantInfoPoint1}</li>
              <li>• ${importantInfoPoint2}</li>
              <li>• ${importantInfoPoint3}</li>
            </ul>
          </div>
          
          <!-- Free plan limitations -->
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-2 sm:p-3 mb-3">
            <h4 class="text-xs sm:text-sm font-semibold text-orange-900 mb-1 sm:mb-2">
              ⚠️ ${freeLimitsTitle}
            </h4>
            <ul class="text-xs text-orange-800 space-y-0.5 sm:space-y-1">
              <li>• ${freeLimit1}</li>
              <li>• ${freeLimit2}</li>
              <li>• ${freeLimit3}</li>
            </ul>
          </div>
          
          <!-- Early bird payment warning -->
          <div class="bg-amber-50 border border-amber-300 rounded-lg p-2 sm:p-3 mb-3">
            <p class="text-xs text-amber-900 leading-relaxed m-0">
              ⚠️ ${earlyBirdPaymentWarning}
            </p>
          </div>
          
          <!-- Disclaimer -->
          <div class="text-center mb-3">
            <p class="text-xs text-gray-500">
              ${disclaimer}
            </p>
          </div>
          
          <!-- Buttons -->
          <div class="space-y-2 pb-3 sm:pb-4" style="padding-bottom: 2rem;">
            <button id="promoAccept" class="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2.5 sm:py-3 px-4 rounded-xl transition-all transform hover:scale-105 shadow-lg text-sm">
              ⭐ ${acceptButton}
            </button>
            
            <button id="promoRemind" class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 sm:py-2.5 px-4 rounded-xl transition-all text-sm">
              🔔 ${remindButton}
            </button>
            
            <button id="promoDecline" class="w-full text-gray-400 hover:text-gray-600 text-xs py-1.5 sm:py-2 transition-all">
              ${declineButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Add swipe-down gesture for mobile
  const modalElement = document.getElementById('promoModal');
  if (modalElement) {
    const modalContent = modalElement.querySelector('.bg-white');
    let touchStartY = 0;
    let touchEndY = 0;
    let isDragging = false;
    
    if (modalContent) {
      modalContent.addEventListener('touchstart', (e) => {
        touchStartY = e.changedTouches[0].screenY;
        isDragging = true;
        modalContent.style.transition = 'none';
      }, { passive: true });
      
      modalContent.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        touchEndY = e.changedTouches[0].screenY;
        const diff = touchEndY - touchStartY;
        
        if (diff > 0) { // Only allow dragging down
          modalContent.style.transform = `translateY(${diff}px)`;
          modalContent.style.opacity = 1 - (diff / 300);
        }
      }, { passive: true });
      
      modalContent.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        const diff = touchEndY - touchStartY;
        modalContent.style.transition = 'all 0.3s ease';
        
        if (diff > 100) { // If dragged down more than 100px, close modal
          modalContent.style.transform = 'translateY(100%)';
          modalContent.style.opacity = '0';
          setTimeout(() => closePromoModal(), 300);
        } else {
          // Reset position
          modalContent.style.transform = 'translateY(0)';
          modalContent.style.opacity = '1';
        }
      }, { passive: true });
    }
  }

  // Apply mobile optimizations if needed
  if (modalElement) {
    const isMobile = window.innerWidth < 640; // sm breakpoint
    
    if (isMobile) {
      const modalContent = modalElement.querySelector('.bg-white');
      if (modalContent) {
        modalContent.style.maxHeight = '90vh';
        modalContent.style.overflowY = 'auto';
      }
      
      // Adjust padding for mobile
      const header = modalElement.querySelector('.bg-gradient-to-r');
      if (header) {
        header.style.padding = '1rem';
      }
      
      const content = modalElement.querySelector('.p-4, .p-6');
      if (content) {
        content.style.padding = '1rem';
      }
      
      // Adjust button sizes
      const acceptBtn = document.getElementById('promoAccept');
      if (acceptBtn) {
        acceptBtn.style.padding = '0.75rem 1rem';
        acceptBtn.style.fontSize = '0.875rem';
      }
      
      const remindBtn = document.getElementById('promoRemind');
      if (remindBtn) {
        remindBtn.style.padding = '0.5rem 1rem';
        remindBtn.style.fontSize = '0.875rem';
      }
      
      const declineBtn = document.getElementById('promoDecline');
      if (declineBtn) {
        declineBtn.style.fontSize = '0.75rem';
      }
      
      // Add bottom padding to buttons container
      const buttonContainer = modalElement.querySelector('.space-y-3, .space-y-2');
      if (buttonContainer) {
        buttonContainer.style.paddingBottom = '1rem';
        buttonContainer.style.gap = '0.5rem';
      }
    }
  }

  // Start timer update if timeLeft is provided
  if (timeLeft && timeLeft > 0) {
    let remainingTime = timeLeft;
    const timerEl = document.getElementById('promoTimer');

    // Dynamic refresh interval: 1s if < 1 hour, 1 minute otherwise
    const getRefreshInterval = (time) => time < (60 * 60 * 1000) ? 1000 : 60000;
    let refreshInterval = getRefreshInterval(remainingTime);

    const updateTimer = () => {
      const decrement = refreshInterval === 1000 ? 1000 : 60000;
      remainingTime -= decrement;
      
      if (remainingTime <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        if (timerEl) timerEl.textContent = formatTimeLeft(0);
        // Auto-close modal when expired
        setTimeout(() => closePromoModal(), 2000);
      } else {
        if (timerEl) timerEl.textContent = formatTimeLeft(remainingTime);
        
        // Switch to 1s refresh if we just crossed under 1 hour
        const newInterval = getRefreshInterval(remainingTime);
        if (newInterval !== refreshInterval) {
          clearInterval(timerInterval);
          refreshInterval = newInterval;
          timerInterval = setInterval(updateTimer, refreshInterval);
        }
      }
    };

    timerInterval = setInterval(updateTimer, refreshInterval);
  }

  // Event listeners
  const acceptBtn = document.getElementById('promoAccept');
  const remindBtn = document.getElementById('promoRemind');
  const declineBtn = document.getElementById('promoDecline');

  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => handlePromoAccept(promoType));
  }

  if (remindBtn) {
    remindBtn.addEventListener('click', () => handlePromoRemind(promoType));
  }

  if (declineBtn) {
    declineBtn.addEventListener('click', () => handlePromoDecline());
  }

  // Close on background click
  const modal = document.getElementById('promoModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closePromoModal();
      }
    });
  }

  // Close on ESC key
  const handleEscKey = (e) => {
    if (e.key === 'Escape') {
      closePromoModal();
      document.removeEventListener('keydown', handleEscKey);
    }
  };
  document.addEventListener('keydown', handleEscKey);

  if (user && window.db && document.getElementById('promoModal')) {
    const shownAtField = promoType === '40' ? 'popup40ShownAt' : 'popup20ShownAt';
    try {
      await window.db.collection('users').doc(user.uid)
        .collection('settings').doc('subscription')
        .update({
          [`promoState.${shownAtField}`]: new Date()
        });
      if (window.currentUserSubscription && window.currentUserSubscription.promoState) {
        window.currentUserSubscription.promoState[shownAtField] = new Date();
      }
      console.log(`[PromoModal] Updated ${shownAtField} timestamp`);
    } catch (error) {
      console.error('[PromoModal] Failed to update shownAt timestamp:', error);
    }
  }
}

/**
 * Handle "Subscribe now" button click
 */
function handlePromoAccept(promoType) {
  if (typeof window.canShowEarlyBirdOffer === 'function' && !window.canShowEarlyBirdOffer()) {
    closePromoModal();
    return;
  }

  console.log('[PromoModal] User accepted promo:', promoType);
  
  closePromoModal();
  
  // Start Stripe checkout directly with promo coupon
  if (typeof window.startPromoCheckout === 'function') {
    console.log('[PromoModal] Starting promo checkout...');
    window.startPromoCheckout();
  } else if (typeof window.handleSubscriptionAction === 'function') {
    console.log('[PromoModal] Using handleSubscriptionAction...');
    window.handleSubscriptionAction('upgrade', { tier: 'pro' });
  } else {
    // Fallback: navigate to subscription page
    console.log('[PromoModal] Fallback: navigating to subscription page');
    if (typeof window.showSection === 'function') {
      window.showSection('subscription');
    } else {
      window.location.hash = '#subscription';
    }
  }
}

/**
 * Handle "Remind me later" button click
 */
async function handlePromoRemind(promoType) {
  if (typeof window.canShowEarlyBirdOffer === 'function' && !window.canShowEarlyBirdOffer()) {
    closePromoModal();
    return;
  }

  console.log('[PromoModal] User requested reminder for promo:', promoType);
  
  const user = window.currentUser;
  if (!user) {
    console.warn('[PromoModal] No user logged in');
    closePromoModal();
    return;
  }

  try {
    await markPromoReminded(user.uid);
    
    // Show confirmation message
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
      ? (translations[currentLang] || {})
      : {};
    const confirmMsg = (i18n && i18n.promoReminderConfirm) 
      ? i18n.promoReminderConfirm 
      : '🔔 Rendben!\n\nEmlékeztetünk 24 óra múlva az ajánlatról.';
    
    if (typeof window.showCustomAlert === 'function') {
      window.showCustomAlert(confirmMsg, 'info');
    }
  } catch (error) {
    console.error('[PromoModal] Failed to mark reminder:', error);
  }
  
  closePromoModal();
}

/**
 * Handle "Not interested" button click
 */
async function handlePromoDecline() {
  if (typeof window.canShowEarlyBirdOffer === 'function' && !window.canShowEarlyBirdOffer()) {
    closePromoModal();
    return;
  }

  console.log('[PromoModal] User declined promo');
  
  const user = window.currentUser;
  if (!user) {
    console.warn('[PromoModal] No user logged in');
    closePromoModal();
    return;
  }

  try {
    await markPromoDeclined(user.uid);
    
    // Show confirmation message
    if (typeof window.showCustomAlert === 'function') {
      const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
        ? (translations[currentLang] || {})
        : {};
      const declineMsg = (i18n && i18n.promoDeclineConfirm)
        ? i18n.promoDeclineConfirm
        : 'Rendben, nem fogjuk többé megjeleníteni ezt az ajánlatot.';
      window.showCustomAlert(
        declineMsg,
        'info'
      );
    }
  } catch (error) {
    console.error('[PromoModal] Failed to mark declined:', error);
  }
  
  closePromoModal();
}

/**
 * Close and remove promo modal
 */
export function closePromoModal() {
  // Clear timer
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Remove modal from DOM
  const modal = document.getElementById('promoModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * Check and show promo modal if eligible
 * Called on app initialization and after user profile load
 */
export async function checkAndShowPromoModal() {
  if (typeof window.canShowEarlyBirdOffer === 'function' && !window.canShowEarlyBirdOffer()) {
    return;
  }

  if (window.__termsConsentModalOpen) {
    console.log('[PromoModal] Deferred — terms consent modal is open');
    return;
  }

  if (!window.currentUser) {
    return;
  }

  if (!window.currentUserSubscription) {
    if (typeof window.loadUserSubscription === 'function' && window.currentUser.uid) {
      try {
        await window.loadUserSubscription(window.currentUser.uid);
      } catch (_) { /* ignore */ }
    }
    if (!window.currentUserSubscription) {
      console.log('[PromoModal] Subscription not loaded yet');
      return;
    }
  }

  // Import dynamically to avoid circular dependencies
  const { checkPromoEligibility } = await import('./promoManager.js');
  
  const eligibility = await checkPromoEligibility(window.currentUserSubscription);
  
  if (eligibility && eligibility.type) {
    console.log('[PromoModal] User eligible for promo:', eligibility.type);
    showPromoModal(eligibility.type, eligibility.timeLeft, false);
  }
}
