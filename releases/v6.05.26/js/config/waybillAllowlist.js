// =======================================================
// Digitális menetlevél: csak meghatározott e-mail címek látják
// Szerkeszd a WAYBILL_ALLOWED_EMAILS tömböt (kisbetűvel kerülnek összehasonlításra).
// =======================================================
(function() {
  'use strict';

  /** Engedélyezett e-mail címek (kisbetű). Csak ezek látják a Menetlevél menüpontot és funkciót. */
  window.WAYBILL_ALLOWED_EMAILS = [
    'info@gurigo.eu',
    'priatti11@gmail.com',  // uid: bKWpW0rP4VYQqqyR2n5NNxD5KLh2 (sofőr – Office: members/{uid} role=driver)
  ];

  /**
   * Igaz, ha a bejelentkezett felhasználó e-mailje szerepel az allowlistben.
   * @returns {boolean}
   */
  window.canAccessWaybill = function() {
    var u = window.currentUser;
    if (!u || !u.email) return false;
    var list = window.WAYBILL_ALLOWED_EMAILS;
    if (!Array.isArray(list)) return false;
    var email = String(u.email).toLowerCase().trim();
    return list.some(function(allowed) { return String(allowed).toLowerCase().trim() === email; });
  };

  /**
   * A Menetlevél menüpont megjelenítése/elrejtése a bejelentkezett felhasználó e-mailje alapján.
   * Meghívandó: bejelentkezés/kijelentkezés után (handleAuthStateChange).
   */
  window.updateWaybillMenuVisibility = function() {
    var items = [
      document.getElementById('menu-item-waybill')
    ];
    var canSee = window.canAccessWaybill && window.canAccessWaybill();
    items.forEach(function(el) {
      if (!el) return;
      if (canSee) {
        el.style.display = '';
        el.classList.remove('hidden');
      } else {
        el.style.display = 'none';
        el.classList.add('hidden');
      }
    });
  };
})();
