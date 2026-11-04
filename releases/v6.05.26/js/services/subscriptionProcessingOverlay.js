// Előfizetés feldolgozás overlay (újraaktiválás stb.) – GuriGO koral spinner
(function () {
  'use strict';

  function showSubscriptionProcessingOverlay(message) {
    const overlay = document.getElementById('subscription-processing-overlay');
    const box = document.getElementById('subscription-processing-box');
    const textEl = document.getElementById('subscription-processing-text');
    if (!overlay || !box) return;

    if (textEl) {
      textEl.textContent = message || '';
    }

    overlay.setAttribute('aria-busy', 'true');
    overlay.classList.remove('hidden');
    requestAnimationFrame(function () {
      overlay.classList.remove('opacity-0');
      box.classList.remove('scale-95');
    });
  }

  function hideSubscriptionProcessingOverlay() {
    const overlay = document.getElementById('subscription-processing-overlay');
    const box = document.getElementById('subscription-processing-box');
    if (!overlay || !box) return;

    overlay.setAttribute('aria-busy', 'false');
    overlay.classList.add('opacity-0');
    box.classList.add('scale-95');
    setTimeout(function () {
      overlay.classList.add('hidden');
    }, 280);
  }

  window.showSubscriptionProcessingOverlay = showSubscriptionProcessingOverlay;
  window.hideSubscriptionProcessingOverlay = hideSubscriptionProcessingOverlay;
})();
