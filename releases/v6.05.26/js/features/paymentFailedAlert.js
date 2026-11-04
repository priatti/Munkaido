// Napi egyszeri figyelmeztetés fizetési problémáról
// v6.04.01: popup letiltva — a fizetési hiba az Előfizetés oldalon jelenik meg státusz kártyaként
window.maybeShowPaymentFailedAlert = function() {
  return; // popup disabled
  try {
    const sub = window.currentUserSubscription;
    if (!sub) return;

    const now = new Date();
    const proEnt = (typeof window.getProEntitlement === 'function') ? window.getProEntitlement(sub) : null;
    const archEnt = (typeof window.getArchivalEntitlement === 'function') ? window.getArchivalEntitlement(sub) : null;
    const tierPaymentFailed = proEnt ? proEnt.isPaymentFailed : (sub.subscriptionPaymentFailed || sub.subscriptionStatus === 'past_due');
    const archivalPaymentFailed = archEnt ? archEnt.isPaymentFailed : sub.archivalPaymentFailed;

    // Ha nincs fizetési probléma, nem kell popup
    if (!tierPaymentFailed && !archivalPaymentFailed) return;

    // Ellenőrizzük, hogy ma már megjelent-e
    const lastShownDate = localStorage.getItem('paymentFailedAlertLastShown');
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD formátum

    if (lastShownDate === today) {
      // Ma már megjelent, ne mutassuk újra
      return;
    }

    // Grace period számítás
    let graceDaysLeft = 7;
    let graceDeadlineStr = '';
    let problemType = '';

    const locale = (typeof getCurrentLocale === 'function') ? getCurrentLocale() : 'hu-HU';
    
    if (tierPaymentFailed && sub.subscriptionPaymentGraceUntil) {
      graceDaysLeft = Math.max(0, Math.ceil((sub.subscriptionPaymentGraceUntil - now) / (1000 * 60 * 60 * 24)));
      graceDeadlineStr = sub.subscriptionPaymentGraceUntil.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
      problemType = 'Pro előfizetés';
    } else if (archivalPaymentFailed && sub.archivalPaymentGraceUntil) {
      graceDaysLeft = Math.max(0, Math.ceil((sub.archivalPaymentGraceUntil - now) / (1000 * 60 * 60 * 24)));
      graceDeadlineStr = sub.archivalPaymentGraceUntil.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
      problemType = 'Archiválási előfizetés';
    }

    // Popup megjelenítése
    const message = `
      <div class="text-center">
        <div class="text-5xl mb-4">⚠️</div>
        <h2 class="text-xl font-bold text-red-800 dark:text-red-200 mb-3">Fizetési probléma</h2>
        <p class="text-base mb-2">A <strong>${problemType}</strong> fizetése sikertelen volt.</p>
        <p class="text-base mb-4"><strong>⏰ ${graceDaysLeft} napod van</strong> a bankkártya frissítésére${graceDeadlineStr ? (' (' + graceDeadlineStr + '-ig)') : ''}.</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">Kérlek, frissítsd a fizetési módodat az Előfizetések menüben.</p>
      </div>
    `;

    if (typeof showCustomModal === 'function') {
      showCustomModal(
        message,
        [
          {
            text: 'Előfizetések megtekintése',
            className: 'bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition',
            onClick: () => {
              if (typeof showView === 'function') {
                showView('subscription');
              }
            }
          },
          {
            text: 'Később',
            className: 'bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-bold transition',
            onClick: () => {}
          }
        ],
        false // closeOnBackdrop
      );

      // Mentjük el, hogy ma már megjelent
      localStorage.setItem('paymentFailedAlertLastShown', today);
    }
  } catch (error) {
    console.error('Error showing payment failed alert:', error);
  }
};
