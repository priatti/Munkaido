// =======================================================
// Járművek modul: hozzáférés bejelentkezett felhasználóknak
// Free/Pro aktív jármű limit: vehiclesService.js + vehicles.js
// =======================================================
(function () {
  'use strict';

  window.canAccessVehicles = function () {
    var u = window.currentUser;
    return !!(u && u.uid);
  };

  window.updateVehiclesMenuVisibility = function () {
    var el = document.getElementById('menu-item-vehicles');
    if (!el) return;
    var canSee = window.canAccessVehicles && window.canAccessVehicles();
    if (canSee) {
      el.style.display = '';
      el.classList.remove('hidden');
    } else {
      el.style.display = 'none';
      el.classList.add('hidden');
    }
  };

  window.updateFuelingMenuVisibility = function () {
    var el = document.getElementById('menu-item-fueling');
    if (!el) return;
    var canSee = window.canAccessVehicles && window.canAccessVehicles();
    if (canSee) {
      el.style.display = '';
      el.classList.remove('hidden');
    } else {
      el.style.display = 'none';
      el.classList.add('hidden');
    }
    if (typeof window.updateFuelingMenuLabels === 'function') {
      try { window.updateFuelingMenuLabels(); } catch (_) {}
    }
  };

  function fuelingMenuT(key, fallback) {
    try {
      var lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'hu';
      var i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
      var v = i18n[key];
      return (v != null && v !== '') ? v : (fallback || key);
    } catch (_) {
      return fallback || key;
    }
  }

  window.updateFuelingMenuLabels = function () {
    var menuEl = document.getElementById('menu-item-fueling');
    if (!menuEl) return;

    var titleEl = menuEl.querySelector('.more-menu-title');
    var descEl = menuEl.querySelector('.more-menu-desc');
    if (!titleEl || !descEl) return;

    var activeVehicles = [];
    if (window.VehiclesService && window.VehiclesService.getCachedVehicles) {
      var cached = window.VehiclesService.getCachedVehicles();
      if (Array.isArray(cached) && window.VehiclesService.getActiveVehiclesForPicker) {
        activeVehicles = window.VehiclesService.getActiveVehiclesForPicker(cached);
      }
    }

    var mode = window.VehiclesService && window.VehiclesService.resolveFuelingMenuLabelMode
      ? window.VehiclesService.resolveFuelingMenuLabelMode(activeVehicles)
      : 'default';
    var keys = window.VehiclesService && window.VehiclesService.getFuelingMenuLabelKeys
      ? window.VehiclesService.getFuelingMenuLabelKeys(mode)
      : { title: 'fuelingMenuTitleFueling', subtitle: 'fuelingMenuSubtitleFueling' };

    titleEl.textContent = fuelingMenuT(keys.title, fuelingMenuT('menuFueling', 'Tankolás'));
    descEl.textContent = fuelingMenuT(keys.subtitle, fuelingMenuT('menuFuelingDesc', 'Tankolások és fogyasztás'));
  };

  window.addEventListener('gurigo:vehiclesChanged', function () {
    if (typeof window.updateFuelingMenuLabels === 'function') {
      try { window.updateFuelingMenuLabels(); } catch (_) {}
    }
  });
})();
