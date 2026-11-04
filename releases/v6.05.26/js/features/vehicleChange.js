// Járműcsere aktív munkanap közben – modal és mentés
(function () {
  'use strict';

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

  function getActiveShift() {
    if (typeof getActiveShiftFromStorage === 'function') {
      return getActiveShiftFromStorage();
    }
    return window.activeShift || null;
  }

  function persistShift(shift) {
    if (typeof saveActiveShift === 'function') {
      saveActiveShift(shift);
    } else {
      try { localStorage.setItem('activeShift', JSON.stringify(shift)); } catch (_) {}
      window.activeShift = shift;
    }
  }

  function getCurrentVehicleLabel(shift) {
    if (!shift) return t('vehicleChangeNoVehicle', 'Nincs jármű megadva');
    var plate = (typeof window.EntryVehicleField !== 'undefined' && window.EntryVehicleField.formatVehiclePlateForDisplay)
      ? window.EntryVehicleField.formatVehiclePlateForDisplay(shift)
      : (shift.vehiclePlateNumber || '');
    return plate || t('vehicleChangeNoVehicle', 'Nincs jármű megadva');
  }

  function needsPreviousEndKm(shift) {
    if (!window.VehicleSegments) return false;
    var segments = window.VehicleSegments.ensureSegmentsOnShift(shift);
    var open = window.VehicleSegments.getOpenSegment(segments);
    return !!(open && open.startKm != null && Number(open.startKm) > 0);
  }

  async function loadVehicleOptionsHtml(selectedId) {
    var html = '<option value="">' + escapeHtml(t('entryVehicleNone', 'Nincs jármű kiválasztva')) + '</option>';
    html += '<option value="' + escapeHtml(window.VehicleSegments.MANUAL_VEHICLE_VALUE) + '">' + escapeHtml(t('vehicleChangeManualPlate', 'Nincs jármű / kézi rendszám')) + '</option>';

    if (!window.VehiclesService) return html;

    try {
      await Promise.all([
        window.VehiclesService.loadVehicles(false),
        window.VehiclesService.loadLastSelectedVehicle(false),
      ]);
    } catch (_) {}

    var allVehicles = window.VehiclesService.getCachedVehicles ? window.VehiclesService.getCachedVehicles() : [];
    var activeVehicles = window.VehiclesService.getActiveVehiclesForPicker
      ? window.VehiclesService.getActiveVehiclesForPicker(allVehicles)
      : (allVehicles || []).filter(function (v) { return v.active !== false && v.deleted !== true; });

    activeVehicles.sort(function (a, b) {
      return String(a.plateNumber || '').localeCompare(String(b.plateNumber || ''), undefined, { sensitivity: 'base' });
    });

    activeVehicles.forEach(function (vehicle) {
      var id = String(vehicle.id);
      var sel = selectedId === id ? ' selected' : '';
      html += '<option value="' + escapeHtml(id) + '"' + sel + '>' + escapeHtml(vehicle.plateNumber || id) + '</option>';
    });

    return html;
  }

  function toggleManualPlateField() {
    var select = document.getElementById('vehicle-change-new-vehicle');
    var wrap = document.getElementById('vehicle-change-manual-plate-wrap');
    var kmWrap = document.getElementById('vehicle-change-new-start-km-wrap');
    if (!select || !wrap) return;
    var isManual = select.value === window.VehicleSegments.MANUAL_VEHICLE_VALUE;
    wrap.classList.toggle('hidden', !isManual);
    if (kmWrap) {
      var showKm = select.value && select.value !== '';
      kmWrap.classList.toggle('hidden', !showKm);
    }
    updateNewStartKmRequired();
  }

  function updateNewStartKmRequired() {
    var select = document.getElementById('vehicle-change-new-vehicle');
    var kmInput = document.getElementById('vehicle-change-new-start-km');
    var label = document.getElementById('vehicle-change-new-start-km-label');
    if (!select || !kmInput) return;
    var hasSelection = !!select.value;
    kmInput.required = hasSelection;
    if (label) {
      label.textContent = hasSelection
        ? (t('vehicleChangeNewStartKm', 'Új jármű induló km óra állása') + ' *')
        : t('vehicleChangeNewStartKm', 'Új jármű induló km óra állása');
    }
  }

  function updatePreviousEndKmRequired(shift) {
    var wrap = document.getElementById('vehicle-change-previous-end-km-wrap');
    var input = document.getElementById('vehicle-change-previous-end-km');
    var label = document.getElementById('vehicle-change-previous-end-km-label');
    if (!wrap || !input) return;
    var required = needsPreviousEndKm(shift);
    wrap.classList.toggle('hidden', !required);
    input.required = required;
    if (label) {
      label.textContent = required
        ? (t('vehicleChangePreviousEndKm', 'Előző jármű záró km óra állása') + ' *')
        : t('vehicleChangePreviousEndKm', 'Előző jármű záró km óra állása');
    }
  }

  async function showVehicleChangeModal() {
    var shift = getActiveShift();
    if (!shift || !shift.date || !shift.startTime) {
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(t('alertNoActiveShiftFinalize', 'Nincs aktív munkanap!'), 'info');
      }
      return;
    }

    if (!window.VehicleSegments) return;

    var existing = document.getElementById('vehicle-change-modal');
    if (existing) existing.remove();

    var currentLabel = getCurrentVehicleLabel(shift);
    var optionsHtml = await loadVehicleOptionsHtml('');

    var modalHtml = ''
      + '<div id="vehicle-change-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300" onclick="handleVehicleChangeBackdropClick(event)">'
      + '<div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto transform transition-transform duration-300 scale-95 modal-card">'
      + '<div class="modal-header mb-4">'
      + '<h3 class="text-xl font-bold text-gray-800 dark:text-gray-100">' + escapeHtml(t('vehicleChangeTitle', 'Járműcsere')) + '</h3>'
      + '</div>'
      + '<div class="space-y-4 modal-body">'
      + '<div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">'
      + '<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">' + escapeHtml(t('vehicleChangeCurrentVehicle', 'Aktuális jármű')) + '</label>'
      + '<p class="text-sm font-semibold text-gray-900 dark:text-gray-100" id="vehicle-change-current-label">' + escapeHtml(currentLabel) + '</p>'
      + '</div>'
      + '<div class="bg-orange-50 dark:bg-orange-900/50 rounded-lg p-3" id="vehicle-change-previous-end-km-wrap">'
      + '<label class="block text-sm font-medium text-orange-700 dark:text-orange-300 mb-2" id="vehicle-change-previous-end-km-label">' + escapeHtml(t('vehicleChangePreviousEndKm', 'Előző jármű záró km óra állása')) + '</label>'
      + '<input type="number" id="vehicle-change-previous-end-km" class="w-full p-3 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-orange-800/50" min="0" step="1" inputmode="numeric" />'
      + '</div>'
      + '<div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">'
      + '<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">' + escapeHtml(t('vehicleChangeNewVehicle', 'Új jármű')) + '</label>'
      + '<select id="vehicle-change-new-vehicle" class="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" onchange="toggleVehicleChangeManualField()">' + optionsHtml + '</select>'
      + '</div>'
      + '<div class="hidden bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3" id="vehicle-change-manual-plate-wrap">'
      + '<label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">' + escapeHtml(t('vehicleChangeManualPlateField', 'Kézi rendszám')) + '</label>'
      + '<input type="text" id="vehicle-change-manual-plate" class="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 uppercase" />'
      + '</div>'
      + '<div class="hidden bg-orange-50 dark:bg-orange-900/50 rounded-lg p-3" id="vehicle-change-new-start-km-wrap">'
      + '<label class="block text-sm font-medium text-orange-700 dark:text-orange-300 mb-2" id="vehicle-change-new-start-km-label">' + escapeHtml(t('vehicleChangeNewStartKm', 'Új jármű induló km óra állása')) + '</label>'
      + '<input type="number" id="vehicle-change-new-start-km" class="w-full p-3 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-orange-800/50" min="0" step="1" inputmode="numeric" />'
      + '</div>'
      + '</div>'
      + '<div class="modal-footer">'
      + '<div class="flex gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">'
      + '<button type="button" class="vehicle-change-cancel-btn flex-1 py-3 px-4 bg-gray-200 text-gray-800 rounded-lg font-semibold" onclick="closeVehicleChangeModal()">' + escapeHtml(t('vehicleChangeCancel', 'Mégse')) + '</button>'
      + '<button type="button" class="vehicle-change-save-btn flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold" onclick="saveVehicleChange()">' + escapeHtml(t('vehicleChangeSave', 'Járműcsere mentése')) + '</button>'
      + '</div></div>'
      + '</div></div>';

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    updatePreviousEndKmRequired(shift);
    toggleManualPlateField();

    requestAnimationFrame(function () {
      var modal = document.getElementById('vehicle-change-modal');
      if (modal) modal.classList.remove('opacity-0');
    });
  }

  function closeVehicleChangeModal() {
    var modal = document.getElementById('vehicle-change-modal');
    if (!modal) return;
    modal.classList.add('opacity-0');
    setTimeout(function () { modal.remove(); }, 250);
  }

  function handleVehicleChangeBackdropClick(event) {
    if (event.target && event.target.id === 'vehicle-change-modal') {
      closeVehicleChangeModal();
    }
  }

  function resolveNewVehicleFields(selectEl, manualPlateEl) {
    var selectedId = selectEl ? String(selectEl.value || '').trim() : '';
    if (!selectedId) {
      return { error: t('vehicleChangeNewVehicleRequired', 'Válassz új járművet vagy adj meg kézi rendszámot.') };
    }

    if (selectedId === window.VehicleSegments.MANUAL_VEHICLE_VALUE) {
      var plate = manualPlateEl ? String(manualPlateEl.value || '').trim().toUpperCase() : '';
      if (!plate) {
        return { error: t('vehicleChangeManualPlateRequired', 'Add meg a kézi rendszámot.') };
      }
      var normalized = window.VehicleSegments.normalizePlate(plate);
      return {
        vehicleId: null,
        vehiclePlateNumber: plate,
        vehiclePlateNumberNormalized: normalized,
        vehicleSnapshot: window.VehicleSegments.buildSnapshotFromFields(null, plate, normalized),
      };
    }

    var allVehicles = window.VehiclesService && window.VehiclesService.getCachedVehicles
      ? window.VehiclesService.getCachedVehicles()
      : [];
    var found = (allVehicles || []).find(function (v) { return String(v.id) === selectedId; });
    if (!found) {
      return { error: t('entryVehicleLoadFailed', 'A járművek betöltése nem sikerült.') };
    }
    return {
      vehicleId: String(found.id),
      vehiclePlateNumber: found.plateNumber || null,
      vehiclePlateNumberNormalized: found.plateNumberNormalized || window.VehicleSegments.normalizePlate(found.plateNumber),
      vehicleSnapshot: (typeof window.EntryVehicleField !== 'undefined' && found)
        ? {
          vehicleId: String(found.id),
          plateNumber: found.plateNumber || '',
          plateNumberNormalized: found.plateNumberNormalized || window.VehicleSegments.normalizePlate(found.plateNumber),
          vehicleScope: found.vehicleScope || 'personal',
          companyId: found.companyId != null ? found.companyId : null,
          officeManaged: found.officeManaged === true,
        }
        : window.VehicleSegments.buildSnapshotFromFields(found.id, found.plateNumber, found.plateNumberNormalized),
    };
  }

  function saveVehicleChange() {
    var shift = getActiveShift();
    if (!shift || !window.VehicleSegments) return;

    var prevKmEl = document.getElementById('vehicle-change-previous-end-km');
    var selectEl = document.getElementById('vehicle-change-new-vehicle');
    var manualPlateEl = document.getElementById('vehicle-change-manual-plate');
    var newStartKmEl = document.getElementById('vehicle-change-new-start-km');

    var segments = window.VehicleSegments.ensureSegmentsOnShift(shift);
    var open = window.VehicleSegments.getOpenSegment(segments);
    var previousEndKm = prevKmEl && prevKmEl.value !== '' ? parseFloat(prevKmEl.value) : null;

    if (open && open.startKm != null && Number(open.startKm) > 0) {
      if (previousEndKm == null || !Number.isFinite(previousEndKm)) {
        if (typeof showCustomAlert === 'function') {
          showCustomAlert(t('vehicleChangePreviousEndKmRequired', 'Add meg az előző jármű záró km állását.'), 'info');
        }
        return;
      }
      if (previousEndKm < Number(open.startKm)) {
        if (typeof showCustomAlert === 'function') {
          showCustomAlert(t('vehicleChangeEndKmTooLow', 'A záró km nem lehet kisebb az induló km-nél.'), 'warning');
        }
        return;
      }
    }

    var newVehicle = resolveNewVehicleFields(selectEl, manualPlateEl);
    if (newVehicle.error) {
      if (typeof showCustomAlert === 'function') showCustomAlert(newVehicle.error, 'info');
      return;
    }

    var newStartKm = newStartKmEl && newStartKmEl.value !== '' ? parseFloat(newStartKmEl.value) : null;
    if (newStartKm == null || !Number.isFinite(newStartKm)) {
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(t('vehicleChangeNewStartKmRequired', 'Add meg az új jármű induló km állását.'), 'info');
      }
      return;
    }

    var changeTimeIso = new Date().toISOString();
    var updated = window.VehicleSegments.applyVehicleChange(shift, {
      previousEndKm: previousEndKm,
      changeTimeIso: changeTimeIso,
      vehicleId: newVehicle.vehicleId,
      vehiclePlateNumber: newVehicle.vehiclePlateNumber,
      vehiclePlateNumberNormalized: newVehicle.vehiclePlateNumberNormalized,
      vehicleSnapshot: newVehicle.vehicleSnapshot,
      newStartKm: newStartKm,
    });

    persistShift(updated);
    closeVehicleChangeModal();

    if (updated.vehicleId && typeof window.EntryVehicleField !== 'undefined' && window.EntryVehicleField.afterSaveSuccess) {
      window.EntryVehicleField.afterSaveSuccess(updated).catch(function () {});
    }

    if (typeof showCustomAlert === 'function') {
      showCustomAlert(t('vehicleChangeSuccess', 'Járműcsere mentve.'), 'success');
    }

    if (typeof renderStartTab === 'function') renderStartTab();
    try { window.dispatchEvent(new Event('records:updated')); } catch (_) {}
  }

  window.showVehicleChangeModal = showVehicleChangeModal;
  window.closeVehicleChangeModal = closeVehicleChangeModal;
  window.saveVehicleChange = saveVehicleChange;
  window.handleVehicleChangeBackdropClick = handleVehicleChangeBackdropClick;
  window.toggleVehicleChangeManualField = toggleManualPlateField;
})();
