// =======================================================
// ===== JÁRMŰVEK (VEHICLES) MVP ==========================
// =======================================================
// Láthatóság: bejelentkezett felhasználók (js/config/vehiclesAllowlist.js)
// TODO: alvázszám, műszaki lejárat, Office/flotta kezelés

(function () {
  'use strict';

  var uiState = {
    mode: 'list',
    editingId: null,
    saving: false,
  };

  function t(key, fallback) {
    try {
      var i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
        ? (translations[currentLang] || {})
        : {};
      var v = i18n[key];
      return (v != null && v !== '') ? v : (fallback || key);
    } catch (_) {
      return fallback || key;
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getRootEl() {
    return document.getElementById('content-vehicles');
  }

  function ensureAccessOrRedirect() {
    if (typeof window.canAccessVehicles === 'function' && window.canAccessVehicles()) {
      return true;
    }
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(t('vehiclesNotAvailable', 'A Járművek modul jelenleg nem elérhető a fiókodhoz.'), 'info', function () {
        if (typeof window.showTab === 'function') window.showTab('live');
      });
    } else if (typeof window.showTab === 'function') {
      window.showTab('live');
    }
    return false;
  }

  function formatCapacity(value) {
    if (value === null || value === undefined || value === '') return null;
    var n = Number(value);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  var ENERGY_TYPE_DEFS = [
    { id: 'diesel', labelKey: 'vehiclesEnergyTypeDiesel' },
    { id: 'adblue', labelKey: 'vehiclesEnergyTypeAdblue' },
    { id: 'hvo', labelKey: 'vehiclesEnergyTypeHvo' },
    { id: 'lng', labelKey: 'vehiclesEnergyTypeLng' },
    { id: 'cng', labelKey: 'vehiclesEnergyTypeCng' },
    { id: 'electric', labelKey: 'vehiclesEnergyTypeElectric' },
    { id: 'hybrid', labelKey: 'vehiclesEnergyTypeHybrid' },
    { id: 'other', labelKey: 'vehiclesEnergyTypeOther' },
  ];

  function getDefaultEnergyTypes() {
    return window.VehiclesService && window.VehiclesService.DEFAULT_ENERGY_TYPES
      ? window.VehiclesService.DEFAULT_ENERGY_TYPES.slice()
      : ['diesel', 'adblue'];
  }

  function getVehicleEnergyTypesForForm(vehicle) {
    if (window.VehiclesService && window.VehiclesService.getVehicleEnergyTypes) {
      return window.VehiclesService.getVehicleEnergyTypes(vehicle);
    }
    if (vehicle && Array.isArray(vehicle.energyTypes) && vehicle.energyTypes.length) {
      return vehicle.energyTypes.slice();
    }
    return getDefaultEnergyTypes();
  }

  function getCapacityTypesForEnergyTypes(energyTypes) {
    if (window.VehiclesService && window.VehiclesService.getCapacityTypesForEnergyTypes) {
      return window.VehiclesService.getCapacityTypesForEnergyTypes(energyTypes);
    }
    return (energyTypes || []).filter(function (type) {
      return type !== 'hybrid';
    });
  }

  function getVehicleEnergyCapacity(vehicle, type) {
    if (window.VehiclesService && window.VehiclesService.getVehicleEnergyCapacity) {
      return window.VehiclesService.getVehicleEnergyCapacity(vehicle, type);
    }
    return null;
  }

  function getEnergyCapacityLabelKey(type) {
    if (window.VehiclesService && window.VehiclesService.getEnergyCapacityLabelKey) {
      return window.VehiclesService.getEnergyCapacityLabelKey(type);
    }
    return 'vehiclesCapacityOther';
  }

  function getEnergyCapacityListLabelKey(type) {
    if (window.VehiclesService && window.VehiclesService.getEnergyCapacityListLabelKey) {
      return window.VehiclesService.getEnergyCapacityListLabelKey(type);
    }
    return 'vehiclesCapacityOther';
  }

  function formatCapacityUnitLabel(unit) {
    var key = 'vehiclesUnitLiter';
    if (unit === 'kg') key = 'vehiclesUnitKg';
    else if (unit === 'kwh') key = 'vehiclesUnitKwh';
    else if (unit === 'other') key = 'vehiclesCapacityOther';
    return t(key, unit || '');
  }

  function getCapacityFieldId(type) {
    return 'vehicles-capacity-' + type;
  }

  function buildCapacityFieldsHtml(vehicle, selectedTypes) {
    var visibleTypes = {};
    getCapacityTypesForEnergyTypes(selectedTypes).forEach(function (type) {
      visibleTypes[type] = true;
    });

    var capacityTypeList = window.VehiclesService && window.VehiclesService.ENERGY_TYPES_WITH_CAPACITY
      ? window.VehiclesService.ENERGY_TYPES_WITH_CAPACITY
      : ['diesel', 'hvo', 'adblue', 'lng', 'cng', 'electric', 'other'];

    var fieldsHtml = capacityTypeList.map(function (type) {
      var cap = getVehicleEnergyCapacity(vehicle, type);
      var val = cap && cap.value != null ? String(cap.value) : '';
      var labelKey = getEnergyCapacityLabelKey(type);
      var hiddenStyle = visibleTypes[type] ? '' : ' style="display:none;"';
      return ''
        + '<div class="vehicles-capacity-wrap" data-energy-type="' + escapeHtml(type) + '"' + hiddenStyle + '>'
        + '  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="' + escapeHtml(getCapacityFieldId(type)) + '">'
        + escapeHtml(t(labelKey, type))
        + ' <span class="text-gray-400">' + escapeHtml(t('vehiclesOptional', '(opcionális)')) + '</span></label>'
        + '  <input id="' + escapeHtml(getCapacityFieldId(type)) + '" type="text" inputmode="decimal" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="0" value="' + escapeHtml(val) + '" data-energy-type="' + escapeHtml(type) + '" />'
        + '</div>';
    }).join('');

    if (!fieldsHtml) return '';

    return ''
      + '<div id="vehicles-capacities-section" class="space-y-3">'
      + '  <div>'
      + '    <div class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">' + escapeHtml(t('vehiclesEnergyCapacities', 'Kapacitások')) + '</div>'
      + '    <p class="text-xs text-gray-500 dark:text-gray-400">' + escapeHtml(t('vehiclesEnergyCapacitiesHelp', 'Add meg az egyes energia/üzemanyag típusok tartály- vagy akkumulátor-kapacitását. Minden mező opcionális.')) + '</p>'
      + '  </div>'
      + fieldsHtml
      + '</div>';
  }

  function buildEnergyTypesFieldHtml(selectedTypes) {
    var selected = {};
    (selectedTypes || []).forEach(function (type) { selected[type] = true; });
    var items = ENERGY_TYPE_DEFS.map(function (def) {
      var checked = selected[def.id] ? ' checked' : '';
      return ''
        + '<label class="flex items-center gap-2 py-1.5 cursor-pointer">'
        + '  <input type="checkbox" class="vehicles-energy-type-cb shrink-0" name="vehicles-energy-type" value="' + escapeHtml(def.id) + '"' + checked + ' />'
        + '  <span class="text-sm text-gray-800 dark:text-gray-200">' + escapeHtml(t(def.labelKey, def.id)) + '</span>'
        + '</label>';
    }).join('');
    return ''
      + '<div>'
      + '  <div class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">' + escapeHtml(t('vehiclesEnergyTypes', 'Üzemanyag / energia típusa')) + ' <span class="text-red-500">*</span></div>'
      + '  <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">' + escapeHtml(t('vehiclesEnergyTypesHelp', 'Válaszd ki, milyen üzemanyaggal vagy energiával működik a jármű. Legalább egy típus kötelező.')) + '</p>'
      + '  <div id="vehicles-energy-types" class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50/50 dark:bg-gray-900/20">' + items + '</div>'
      + '</div>';
  }

  function readSelectedEnergyTypes() {
    var checked = document.querySelectorAll('.vehicles-energy-type-cb:checked');
    var types = [];
    checked.forEach(function (el) {
      if (el.value) types.push(el.value);
    });
    return types;
  }

  function updateCapacityFieldsVisibility() {
    var energyTypes = readSelectedEnergyTypes();
    var visibleTypes = {};
    getCapacityTypesForEnergyTypes(energyTypes).forEach(function (type) {
      visibleTypes[type] = true;
    });
    document.querySelectorAll('.vehicles-capacity-wrap').forEach(function (wrap) {
      var type = wrap.getAttribute('data-energy-type');
      wrap.style.display = visibleTypes[type] ? '' : 'none';
    });
    var section = document.getElementById('vehicles-capacities-section');
    if (section) {
      section.style.display = getCapacityTypesForEnergyTypes(energyTypes).length ? '' : 'none';
    }
  }

  function buildVehicleCapacityMetaHtml(vehicle) {
    var lines = window.VehiclesService && window.VehiclesService.getVehicleCapacityDisplayLines
      ? window.VehiclesService.getVehicleCapacityDisplayLines(vehicle)
      : [];
    if (!lines.length) return '';
    var parts = lines.map(function (line) {
      var labelKey = getEnergyCapacityListLabelKey(line.type);
      return escapeHtml(t(labelKey, line.type)) + ': ' + formatCapacity(line.value) + ' ' + escapeHtml(formatCapacityUnitLabel(line.unit));
    });
    return '<div class="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">' + parts.map(function (p) {
      return '<div>' + p + '</div>';
    }).join('') + '</div>';
  }

  function hasUnlimitedActiveVehiclesAccess() {
    return window.VehiclesService && window.VehiclesService.hasUnlimitedActiveVehicles
      ? window.VehiclesService.hasUnlimitedActiveVehicles()
      : false;
  }

  function countActiveVehiclesInList(vehicles) {
    if (window.VehiclesService && window.VehiclesService.countActiveVehicles) {
      return window.VehiclesService.countActiveVehicles(vehicles);
    }
    return (vehicles || []).filter(function (v) {
      return v && v.deleted !== true && v.active !== false;
    }).length;
  }

  function buildPlanLimitBannerHtml(vehicles) {
    var pres = (typeof window.getEntitlementPresentationState === 'function')
      ? window.getEntitlementPresentationState()
      : 'free';
    if (pres === 'unknown' || pres === 'offline') {
      return ''
        + '<div class="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/20 text-sm text-gray-700 dark:text-gray-300">'
        + escapeHtml(t('proFeatureStatusLoading', 'Betöltés...'))
        + '</div>';
    }
    var unlimited = hasUnlimitedActiveVehiclesAccess();
    if (unlimited) {
      return ''
        + '<div class="p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-900/20 text-sm text-indigo-900 dark:text-indigo-100">'
        + escapeHtml(t('vehiclesProUnlimitedInfo', 'Pro csomaggal korlátlan számú aktív járművet kezelhetsz.'))
        + '</div>';
    }

    var html = ''
      + '<div class="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20 text-sm text-amber-900 dark:text-amber-100">'
      + escapeHtml(t('vehiclesFreeLimitInfo', 'Free csomagban egyszerre 1 aktív jármű használható. Inaktív járműből többet is létrehozhatsz.'))
      + '</div>';

    if (countActiveVehiclesInList(vehicles) > 1) {
      html += ''
        + '<div class="p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/80 dark:bg-orange-900/20 text-sm text-orange-900 dark:text-orange-100">'
        + escapeHtml(t('vehiclesFreeLimitExistingMultipleWarning', 'Free csomagban egyszerre csak 1 aktív jármű engedélyezett. Jelenleg több aktív járműved van; újabb aktiváláshoz inaktiválj egyet, vagy válts Pro csomagra.'))
        + '</div>';
    }

    return html;
  }

  function renderLoading() {
    var root = getRootEl();
    if (!root) return;
    root.innerHTML = ''
      + '<div class="p-4 text-center text-gray-500 dark:text-gray-400">'
      + escapeHtml(t('vehiclesLoading', 'Betöltés...'))
      + '</div>';
  }

  function renderListView(vehicles) {
    var root = getRootEl();
    if (!root) return;

    var list = Array.isArray(vehicles) ? vehicles : [];
    var planBannerHtml = buildPlanLimitBannerHtml(list);
    var cardsHtml = '';

    if (!list.length) {
      cardsHtml = ''
        + '<div class="p-6 text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">'
        + '<p class="text-gray-700 dark:text-gray-200 font-medium mb-1">' + escapeHtml(t('vehiclesEmptyTitle', 'Még nincs rögzített járműved.')) + '</p>'
        + '<p class="text-sm text-gray-500 dark:text-gray-400">' + escapeHtml(t('vehiclesEmptyHint', 'Add meg az első járművet.')) + '</p>'
        + '</div>';
    } else {
      cardsHtml = list.map(function (vehicle) {
        var activeBadge = vehicle.active
          ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">' + escapeHtml(t('vehiclesActiveBadge', 'Aktív')) + '</span>'
          : '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">' + escapeHtml(t('vehiclesInactiveBadge', 'Inaktív')) + '</span>';

        var metaHtml = buildVehicleCapacityMetaHtml(vehicle);

        var toggleLabel = vehicle.active
          ? t('vehiclesDeactivate', 'Inaktiválás')
          : t('vehiclesActivate', 'Aktiválás');

        return ''
          + '<div class="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm" data-vehicle-id="' + escapeHtml(vehicle.id) + '">'
          + '  <div class="flex items-start justify-between gap-3">'
          + '    <div class="min-w-0 flex-1">'
          + '      <div class="text-2xl font-bold tracking-wide text-gray-900 dark:text-gray-100 break-words">' + escapeHtml(vehicle.plateNumber) + '</div>'
          + '      <div class="mt-2">' + activeBadge + '</div>'
          +        metaHtml
          + '    </div>'
          + '  </div>'
          + '  <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">'
          + '    <button type="button" class="vehicles-action-edit w-full py-2 px-3 rounded-lg border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 text-sm font-semibold" data-id="' + escapeHtml(vehicle.id) + '">' + escapeHtml(t('vehiclesEdit', 'Szerkesztés')) + '</button>'
          + '    <button type="button" class="vehicles-action-toggle w-full py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 text-sm font-semibold" data-id="' + escapeHtml(vehicle.id) + '" data-active="' + (vehicle.active ? '1' : '0') + '">' + escapeHtml(toggleLabel) + '</button>'
          + '    <button type="button" class="vehicles-action-delete w-full py-2 px-3 rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 text-sm font-semibold" data-id="' + escapeHtml(vehicle.id) + '">' + escapeHtml(t('vehiclesDelete', 'Törlés')) + '</button>'
          + '  </div>'
          + '</div>';
      }).join('');
    }

    root.innerHTML = ''
      + '<div class="space-y-4">'
      + '  <div>'
      + '    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100" data-translate-key="vehiclesTitle">' + escapeHtml(t('vehiclesTitle', 'Járművek')) + '</h2>'
      + '    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1" data-translate-key="vehiclesSubtitle">' + escapeHtml(t('vehiclesSubtitle', 'Itt kezelheted a járműveidet.')) + '</p>'
      + '  </div>'
      + planBannerHtml
      + '  <button type="button" id="vehicles-add-btn" class="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">'
      + '    + ' + escapeHtml(t('vehiclesAddNew', 'Új jármű hozzáadása'))
      + '  </button>'
      + '  <div id="vehicles-list" class="space-y-3">' + cardsHtml + '</div>'
      + '</div>';

    bindListEvents();
  }

  function renderFormView(vehicle) {
    var root = getRootEl();
    if (!root) return;

    var isEdit = !!(vehicle && vehicle.id);
    uiState.mode = isEdit ? 'edit' : 'add';
    uiState.editingId = isEdit ? vehicle.id : null;

    var plate = isEdit ? (vehicle.plateNumber || '') : '';
    var selectedEnergyTypes = getVehicleEnergyTypesForForm(vehicle);

    root.innerHTML = ''
      + '<div class="space-y-4">'
      + '  <div>'
      + '    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">' + escapeHtml(isEdit ? t('vehiclesEditTitle', 'Jármű szerkesztése') : t('vehiclesAddTitle', 'Új jármű')) + '</h2>'
      + '  </div>'
      + '  <form id="vehicles-form" class="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">'
      + '    <div>'
      + '      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="vehicles-plate">' + escapeHtml(t('vehiclesPlateLabel', 'Rendszám')) + ' <span class="text-red-500">*</span></label>'
      + '      <input id="vehicles-plate" type="text" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 uppercase" placeholder="' + escapeHtml(t('vehiclesPlatePlaceholder', 'Pl. ABC-123')) + '" value="' + escapeHtml(plate) + '" autocomplete="off" />'
      + '    </div>'
      +      buildEnergyTypesFieldHtml(selectedEnergyTypes)
      +      buildCapacityFieldsHtml(vehicle, selectedEnergyTypes)
      + '    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">'
      + '      <button type="submit" id="vehicles-save-btn" class="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">' + escapeHtml(t('save', 'Mentés')) + '</button>'
      + '      <button type="button" id="vehicles-cancel-btn" class="w-full py-3 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold">' + escapeHtml(t('cancel', 'Mégse')) + '</button>'
      + '    </div>'
      + '  </form>'
      + '</div>';

    var form = document.getElementById('vehicles-form');
    var cancelBtn = document.getElementById('vehicles-cancel-btn');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        handleSaveForm();
      });
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        uiState.mode = 'list';
        uiState.editingId = null;
        renderVehiclesTab(false);
      });
    }

    document.querySelectorAll('.vehicles-energy-type-cb').forEach(function (cb) {
      cb.addEventListener('change', function () {
        updateCapacityFieldsVisibility();
      });
    });
    updateCapacityFieldsVisibility();
  }

  function bindListEvents() {
    var addBtn = document.getElementById('vehicles-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        renderFormView(null);
      });
    }

    document.querySelectorAll('.vehicles-action-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var cached = window.VehiclesService && window.VehiclesService.getCachedVehicles
          ? window.VehiclesService.getCachedVehicles()
          : [];
        var vehicle = (cached || []).find(function (v) { return v.id === id; });
        if (vehicle) renderFormView(vehicle);
      });
    });

    document.querySelectorAll('.vehicles-action-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var isActive = btn.getAttribute('data-active') === '1';
        handleToggleActive(id, !isActive);
      });
    });

    document.querySelectorAll('.vehicles-action-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        handleDelete(id);
      });
    });
  }

  function readFormValues(editingVehicle) {
    var plateEl = document.getElementById('vehicles-plate');
    var energyTypes = readSelectedEnergyTypes();
    var capacityTypes = getCapacityTypesForEnergyTypes(energyTypes);
    var capacityTypeList = window.VehiclesService && window.VehiclesService.ENERGY_TYPES_WITH_CAPACITY
      ? window.VehiclesService.ENERGY_TYPES_WITH_CAPACITY
      : ['diesel', 'hvo', 'adblue', 'lng', 'cng', 'electric', 'other'];
    var energyCapacities = {};

    capacityTypeList.forEach(function (type) {
      var el = document.getElementById(getCapacityFieldId(type));
      var visible = capacityTypes.indexOf(type) >= 0;
      if (visible && el) {
        energyCapacities[type] = el.value;
      }
    });

    return {
      plateNumber: plateEl ? plateEl.value : '',
      energyTypes: energyTypes,
      energyCapacities: energyCapacities,
    };
  }

  function validateFormValues(values, editingVehicle) {
    var plate = window.VehiclesService && window.VehiclesService.normalizePlateNumber
      ? window.VehiclesService.normalizePlateNumber(values.plateNumber)
      : String(values.plateNumber || '').trim().toUpperCase();
    if (!plate) {
      return { ok: false, message: t('vehiclesErrorPlateRequired', 'A rendszám megadása kötelező.') };
    }

    var normalizedEnergyTypes;
    try {
      if (window.VehiclesService && window.VehiclesService.normalizeEnergyTypes) {
        normalizedEnergyTypes = window.VehiclesService.normalizeEnergyTypes(values.energyTypes, { allowDefault: false });
      } else if (!Array.isArray(values.energyTypes) || !values.energyTypes.length) {
        return { ok: false, message: t('vehiclesEnergyTypesRequired', 'Legalább egy üzemanyag / energia típus kiválasztása kötelező.') };
      } else {
        normalizedEnergyTypes = values.energyTypes;
      }
    } catch (err) {
      if (err && err.message === 'energy_types_required') {
        return { ok: false, message: t('vehiclesEnergyTypesRequired', 'Legalább egy üzemanyag / energia típus kiválasztása kötelező.') };
      }
      return { ok: false, message: t('vehiclesEnergyTypesRequired', 'Legalább egy üzemanyag / energia típus kiválasztása kötelező.') };
    }

    var capacityTypes = getCapacityTypesForEnergyTypes(normalizedEnergyTypes);
    try {
      if (window.VehiclesService && window.VehiclesService.parseOptionalCapacity) {
        capacityTypes.forEach(function (type) {
          var rawVal = values.energyCapacities && values.energyCapacities[type];
          if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
            window.VehiclesService.parseOptionalCapacity(rawVal);
          }
        });
      }
    } catch (_) {
      return { ok: false, message: t('vehiclesErrorCapacityPositive', 'A kapacitás pozitív szám legyen.') };
    }
    return { ok: true, plateNumber: plate, energyTypes: normalizedEnergyTypes };
  }

  async function persistForm(values) {
    if (uiState.saving) return;
    uiState.saving = true;
    try {
      var saved;
      if (uiState.mode === 'edit' && uiState.editingId) {
        saved = await window.VehiclesService.updateVehicle(uiState.editingId, values);
      } else {
        saved = await window.VehiclesService.createVehicle(values);
      }
      uiState.mode = 'list';
      uiState.editingId = null;
      renderVehiclesTab(false);
      if (saved && saved.createdInactiveDueToFreeLimit && typeof showCustomAlert === 'function') {
        showCustomAlert(
          t('vehiclesFreeLimitCreateInactive', 'Free csomagban egyszerre csak 1 aktív jármű lehet. Az új jármű inaktívként kerül mentésre.'),
          'info'
        );
      }
    } catch (err) {
      var msg = t('vehiclesErrorSaveFailed', 'Nem sikerült menteni.');
      if (err && err.message === 'plate_required') {
        msg = t('vehiclesErrorPlateRequired', 'A rendszám megadása kötelező.');
      } else if (err && err.message === 'invalid_capacity') {
        msg = t('vehiclesErrorCapacityPositive', 'A kapacitás pozitív szám legyen.');
      } else if (err && (err.message === 'energy_types_required' || err.message === 'invalid_energy_type')) {
        msg = t('vehiclesEnergyTypesRequired', 'Legalább egy üzemanyag / energia típus kiválasztása kötelező.');
      }
      if (typeof showCustomAlert === 'function') showCustomAlert(msg, 'info');
    } finally {
      uiState.saving = false;
    }
  }

  function handleSaveForm() {
    var editingVehicle = null;
    if (uiState.mode === 'edit' && uiState.editingId && window.VehiclesService && window.VehiclesService.getCachedVehicles) {
      var cachedForEdit = window.VehiclesService.getCachedVehicles() || [];
      editingVehicle = cachedForEdit.find(function (v) { return v.id === uiState.editingId; }) || null;
    }
    var values = readFormValues(editingVehicle);
    var validation = validateFormValues(values, editingVehicle);
    if (!validation.ok) {
      if (typeof showCustomAlert === 'function') showCustomAlert(validation.message, 'info');
      return;
    }
    values.plateNumber = validation.plateNumber;
    values.energyTypes = validation.energyTypes;

    var duplicate = window.VehiclesService && window.VehiclesService.findDuplicatePlate
      ? window.VehiclesService.findDuplicatePlate(values.plateNumber, uiState.editingId)
      : null;

    if (duplicate) {
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(
          t('vehiclesDuplicatePlateWarning', 'Már van ilyen rendszámú járműved. Mentheted így is.'),
          'warning',
          function () { persistForm(values); },
          { confirmText: t('save', 'Mentés'), cancelText: t('cancel', 'Mégse') }
        );
        return;
      }
    }

    persistForm(values);
  }

  async function handleToggleActive(id, nextActive) {
    if (!id || uiState.saving) return;
    uiState.saving = true;
    try {
      await window.VehiclesService.setVehicleActive(id, nextActive);
      renderVehiclesTab(false);
    } catch (err) {
      if (err && (err.message === 'free_active_limit' || err.code === 'free_active_limit')) {
        if (typeof showCustomAlert === 'function') {
          showCustomAlert(
            t('vehiclesFreeLimitActivationBlocked', 'Free csomagban egyszerre csak 1 aktív jármű lehet. Inaktiváld a jelenlegi aktív járművet, vagy válts Pro csomagra.'),
            'info'
          );
        }
      } else if (typeof showCustomAlert === 'function') {
        showCustomAlert(t('vehiclesErrorSaveFailed', 'Nem sikerült menteni.'), 'info');
      }
    } finally {
      uiState.saving = false;
    }
  }

  function handleDelete(id) {
    if (!id) return;
    var confirmMsg = t('vehiclesDeleteConfirm', 'Biztosan törlöd ezt a járművet?');
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(confirmMsg, 'warning', async function () {
        uiState.saving = true;
        try {
          await window.VehiclesService.softDeleteVehicle(id);
          renderVehiclesTab(false);
        } catch (_) {
          showCustomAlert(t('vehiclesErrorDeleteFailed', 'Nem sikerült törölni.'), 'info');
        } finally {
          uiState.saving = false;
        }
      }, {
        confirmText: t('vehiclesDelete', 'Törlés'),
        cancelText: t('cancel', 'Mégse'),
        confirmVariant: 'danger',
      });
    }
  }

  async function renderVehiclesTab(forceReload) {
    if (!ensureAccessOrRedirect()) return;

    var root = getRootEl();
    if (!root) return;

    if (!window.currentUser) {
      root.innerHTML = '<p class="p-4 text-gray-500">' + escapeHtml(t('vehiclesLoading', 'Betöltés...')) + '</p>';
      return;
    }

    var cached = window.VehiclesService && window.VehiclesService.getCachedVehicles
      ? window.VehiclesService.getCachedVehicles()
      : null;

    if (uiState.mode === 'list') {
      if (!forceReload && cached) {
        renderListView(cached);
        return;
      }
      renderLoading();
      try {
        var vehicles = await window.VehiclesService.loadVehicles(!!forceReload);
        renderListView(vehicles);
      } catch (_) {
        root.innerHTML = '<p class="p-4 text-red-600 dark:text-red-400">' + escapeHtml(t('vehiclesErrorLoadFailed', 'Nem sikerült betölteni a járműveket.')) + '</p>';
      }
      return;
    }

    if (uiState.mode === 'add') {
      renderFormView(null);
      return;
    }

    if (uiState.mode === 'edit' && uiState.editingId && cached) {
      var vehicle = cached.find(function (v) { return v.id === uiState.editingId; });
      if (vehicle) renderFormView(vehicle);
    }
  }

  window.renderVehiclesTab = renderVehiclesTab;
  window.initVehiclesTab = renderVehiclesTab;
})();
