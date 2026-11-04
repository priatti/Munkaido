// Teljes nap – több járműszakasz ugyanahhoz a napi rekordhoz
(function () {
  'use strict';

  var vehiclesLoaded = false;
  var cachedVehicles = [];

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

  function isActive() {
    return typeof window.canAccessVehicles === 'function' && window.canAccessVehicles();
  }

  function getWrap() {
    return document.getElementById('full-day-vehicle-segments-wrap');
  }

  function getContainer() {
    return document.getElementById('full-day-vehicle-segments-container');
  }

  function setLegacyKmVisible(show) {
    var kmSection = document.getElementById('km-section');
    var vehicleWrap = document.getElementById('entry-vehicle-field-wrap');
    if (kmSection) kmSection.classList.toggle('hidden', !show);
    if (vehicleWrap) vehicleWrap.classList.toggle('hidden', true);
  }

  function syncVisibility() {
    var wrap = getWrap();
    var active = isActive();
    if (wrap) wrap.classList.toggle('hidden', !active);
    setLegacyKmVisible(!active);
  }

  async function ensureVehiclesLoaded() {
    if (!window.VehiclesService) return [];
    if (vehiclesLoaded && cachedVehicles.length) return cachedVehicles;
    try {
      var list = await window.VehiclesService.loadVehicles(false);
      cachedVehicles = Array.isArray(list) ? list : [];
      vehiclesLoaded = true;
      return cachedVehicles;
    } catch (_) {
      return [];
    }
  }

  function buildVehicleOptionsHtml(selectedId, manualPlate) {
    var manualVal = window.VehicleSegments ? window.VehicleSegments.MANUAL_VEHICLE_VALUE : '__manual__';
    var html = '<option value="">' + escapeHtml(t('vehicleSegmentsSelectVehicle', t('entryVehicleNone', 'Nincs jármű kiválasztva'))) + '</option>';
    html += '<option value="' + escapeHtml(manualVal) + '">' + escapeHtml(t('vehicleSegmentsManualPlate', t('vehicleChangeManualPlate', 'Nincs jármű / kézi rendszám'))) + '</option>';

    var activeVehicles = window.VehiclesService && window.VehiclesService.getActiveVehiclesForPicker
      ? window.VehiclesService.getActiveVehiclesForPicker(cachedVehicles)
      : (cachedVehicles || []).filter(function (v) { return v.active !== false && v.deleted !== true; });

    activeVehicles.sort(function (a, b) {
      return String(a.plateNumber || '').localeCompare(String(b.plateNumber || ''), undefined, { sensitivity: 'base' });
    });

    activeVehicles.forEach(function (vehicle) {
      var id = String(vehicle.id);
      var sel = selectedId === id ? ' selected' : '';
      html += '<option value="' + escapeHtml(id) + '"' + sel + '>' + escapeHtml(vehicle.plateNumber || id) + '</option>';
    });

    if (selectedId && selectedId !== manualVal && !activeVehicles.some(function (v) { return String(v.id) === String(selectedId); })) {
      var plate = manualPlate || selectedId;
      html += '<option value="' + escapeHtml(String(selectedId)) + '" selected>' + escapeHtml(plate) + '</option>';
    }

    return html;
  }

  function parseKmInput(el) {
    if (!el || el.value === '' || el.value == null) return null;
    var n = parseFloat(el.value);
    return Number.isFinite(n) ? n : null;
  }

  function updateCardDistance(card) {
    if (!card) return;
    var startKm = parseKmInput(card.querySelector('.segment-start-km'));
    var endKm = parseKmInput(card.querySelector('.segment-end-km'));
    var distEl = card.querySelector('.segment-distance-value');
    if (!distEl) return;
    var dist = window.VehicleSegments && window.VehicleSegments.computeSegmentDistance
      ? window.VehicleSegments.computeSegmentDistance({ startKm: startKm, endKm: endKm })
      : null;
    distEl.textContent = dist != null ? (dist + ' km') : '—';
  }

  function updateTotalDisplay() {
    var cards = document.querySelectorAll('#full-day-vehicle-segments-container .full-day-segment-card');
    var total = 0;
    var anyKnown = false;
    var incomplete = false;

    cards.forEach(function (card) {
      updateCardDistance(card);
      var startKm = parseKmInput(card.querySelector('.segment-start-km'));
      var endKm = parseKmInput(card.querySelector('.segment-end-km'));
      var dist = window.VehicleSegments && window.VehicleSegments.computeSegmentDistance
        ? window.VehicleSegments.computeSegmentDistance({ startKm: startKm, endKm: endKm })
        : null;
      if (dist != null) {
        total += dist;
        anyKnown = true;
      } else if (startKm != null || endKm != null) {
        incomplete = true;
      }
    });

    var totalEl = document.getElementById('full-day-vehicle-segments-total');
    var incompleteEl = document.getElementById('full-day-vehicle-segments-incomplete');
    var kmDisplay = document.getElementById('kmDisplay');

    if (totalEl) {
      totalEl.textContent = anyKnown
        ? (t('vehicleSegmentsTotalDistance', 'Összes távolság') + ': ' + total + ' km')
        : '';
    }
    if (incompleteEl) {
      incompleteEl.textContent = incomplete ? t('vehicleSegmentsMissingKm', 'Hiányos km adat') : '';
      incompleteEl.classList.toggle('hidden', !incomplete);
    }
    if (kmDisplay && isActive()) {
      kmDisplay.textContent = anyKnown
        ? ((t('kmDrivenDisplay', 'Megtett távolság') || 'Megtett távolság') + ': ' + total + ' km')
        : '';
    }
  }

  function onSegmentFieldChange() {
    updateTotalDisplay();
  }

  function onVehicleSelectChange(selectEl) {
    if (!selectEl) return;
    var card = selectEl.closest('.full-day-segment-card');
    if (!card) return;
    var manualWrap = card.querySelector('.segment-manual-plate-wrap');
    var manualVal = window.VehicleSegments ? window.VehicleSegments.MANUAL_VEHICLE_VALUE : '__manual__';
    if (manualWrap) {
      manualWrap.classList.toggle('hidden', selectEl.value !== manualVal);
    }
  }

  function renumberSegmentCards() {
    var cards = document.querySelectorAll('#full-day-vehicle-segments-container .full-day-segment-card');
    cards.forEach(function (card, idx) {
      var title = card.querySelector('.segment-card-title');
      if (title) {
        title.textContent = (idx + 1) + '. ' + t('vehicleSegmentsSegment', 'szakasz');
      }
      var removeBtn = card.querySelector('.segment-remove-btn');
      if (removeBtn) removeBtn.classList.toggle('hidden', cards.length <= 1);
    });
  }

  function appendSegmentCard(data) {
    data = data || {};
    var container = getContainer();
    if (!container) return;

    var manualVal = window.VehicleSegments ? window.VehicleSegments.MANUAL_VEHICLE_VALUE : '__manual__';
    var selectedId = data.vehicleId ? String(data.vehicleId) : '';
    var manualPlate = data.vehiclePlateNumber || '';
    var isManual = !selectedId && manualPlate;
    if (isManual) selectedId = manualVal;

    var cardId = 'fd-seg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    var cardHtml = ''
      + '<div class="full-day-segment-card bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-800 rounded-lg p-3 space-y-2" id="' + cardId + '">'
      + '<div class="flex items-center justify-between gap-2">'
      + '<h4 class="text-sm font-semibold text-orange-800 dark:text-orange-200 segment-card-title"></h4>'
      + '<button type="button" class="segment-remove-btn text-red-600 dark:text-red-400 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30" onclick="removeFullDayVehicleSegment(this)" title="' + escapeHtml(t('vehicleSegmentsRemove', 'Törlés')) + '">✕ ' + escapeHtml(t('vehicleSegmentsRemove', 'Törlés')) + '</button>'
      + '</div>'
      + '<div><label class="block text-xs mb-1 text-gray-600 dark:text-gray-400">' + escapeHtml(t('vehicleSegmentsSelectVehicle', 'Jármű')) + '</label>'
      + '<select class="segment-vehicle-select w-full p-2 border rounded text-sm bg-white dark:bg-gray-700">' + buildVehicleOptionsHtml(selectedId, manualPlate) + '</select></div>'
      + '<div class="segment-manual-plate-wrap' + (selectedId === manualVal ? '' : ' hidden') + '">'
      + '<label class="block text-xs mb-1 text-gray-600 dark:text-gray-400">' + escapeHtml(t('vehicleSegmentsManualPlate', 'Kézi rendszám')) + '</label>'
      + '<input type="text" class="segment-manual-plate w-full p-2 border rounded text-sm uppercase" value="' + escapeHtml(isManual ? manualPlate : '') + '" />'
      + '</div>'
      + '<div class="grid grid-cols-2 gap-2">'
      + '<div><label class="block text-xs mb-1 text-gray-600 dark:text-gray-400">' + escapeHtml(t('vehicleSegmentsStartKm', t('startKm', 'Induló km'))) + '</label>'
      + '<input type="number" class="segment-start-km w-full p-2 border rounded text-sm" min="0" step="1" inputmode="numeric" value="' + (data.startKm != null && data.startKm !== '' ? escapeHtml(String(data.startKm)) : '') + '" /></div>'
      + '<div><label class="block text-xs mb-1 text-gray-600 dark:text-gray-400">' + escapeHtml(t('vehicleSegmentsEndKm', t('endKm', 'Záró km'))) + '</label>'
      + '<input type="number" class="segment-end-km w-full p-2 border rounded text-sm" min="0" step="1" inputmode="numeric" value="' + (data.endKm != null && data.endKm !== '' ? escapeHtml(String(data.endKm)) : '') + '" /></div>'
      + '</div>'
      + '<div class="text-sm text-orange-700 dark:text-orange-300"><span class="text-xs text-gray-500 dark:text-gray-400">' + escapeHtml(t('vehicleSegmentsDistance', 'Távolság')) + ':</span> <span class="segment-distance-value font-medium">—</span></div>'
      + '</div>';

    container.insertAdjacentHTML('beforeend', cardHtml);
    var card = document.getElementById(cardId);
    if (!card) return;

    var select = card.querySelector('.segment-vehicle-select');
    if (select) {
      select.value = selectedId;
      select.addEventListener('change', function () { onVehicleSelectChange(select); });
    }
    card.querySelectorAll('.segment-start-km, .segment-end-km, .segment-manual-plate').forEach(function (el) {
      el.addEventListener('input', onSegmentFieldChange);
    });

    renumberSegmentCards();
    updateCardDistance(card);
    updateTotalDisplay();
  }

  function resolveCardVehicleFields(card) {
    var select = card.querySelector('.segment-vehicle-select');
    var manualInput = card.querySelector('.segment-manual-plate');
    var selectedId = select ? String(select.value || '').trim() : '';
    var manualVal = window.VehicleSegments ? window.VehicleSegments.MANUAL_VEHICLE_VALUE : '__manual__';

    if (!selectedId) {
      return {
        vehicleId: null,
        vehiclePlateNumber: null,
        vehiclePlateNumberNormalized: null,
        vehicleSnapshot: null,
      };
    }

    if (selectedId === manualVal) {
      var plate = manualInput ? String(manualInput.value || '').trim().toUpperCase() : '';
      if (!plate) {
        return {
          vehicleId: null,
          vehiclePlateNumber: null,
          vehiclePlateNumberNormalized: null,
          vehicleSnapshot: null,
        };
      }
      var normalized = window.VehicleSegments ? window.VehicleSegments.normalizePlate(plate) : plate;
      return {
        vehicleId: null,
        vehiclePlateNumber: plate,
        vehiclePlateNumberNormalized: normalized,
        vehicleSnapshot: window.VehicleSegments ? window.VehicleSegments.buildSnapshotFromFields(null, plate, normalized) : null,
      };
    }

    var found = (cachedVehicles || []).find(function (v) { return String(v.id) === selectedId; });
    if (!found && window.VehiclesService && window.VehiclesService.getCachedVehicles) {
      var liveCache = window.VehiclesService.getCachedVehicles() || [];
      found = liveCache.find(function (v) { return String(v.id) === selectedId; });
      if (found && !(cachedVehicles || []).length) {
        cachedVehicles = liveCache.slice();
        vehiclesLoaded = true;
      }
    }
    if (!found) {
      // Cache üres/elavult, de a select-ben van jármű: ne blokkoljuk a mentést
      var selectEl = card.querySelector('.segment-vehicle-select');
      var opt = (selectEl && selectEl.selectedIndex >= 0) ? selectEl.options[selectEl.selectedIndex] : null;
      var plateFromOpt = opt ? String(opt.textContent || '').trim() : '';
      var normalized = window.VehicleSegments
        ? window.VehicleSegments.normalizePlate(plateFromOpt)
        : plateFromOpt;
      return {
        vehicleId: String(selectedId),
        vehiclePlateNumber: plateFromOpt || null,
        vehiclePlateNumberNormalized: normalized || null,
        vehicleSnapshot: window.VehicleSegments
          ? window.VehicleSegments.buildSnapshotFromFields(String(selectedId), plateFromOpt, normalized)
          : {
              vehicleId: String(selectedId),
              plateNumber: plateFromOpt || '',
              plateNumberNormalized: normalized || '',
            },
      };
    }
    return {
      vehicleId: String(found.id),
      vehiclePlateNumber: found.plateNumber || null,
      vehiclePlateNumberNormalized: found.plateNumberNormalized || (window.VehicleSegments ? window.VehicleSegments.normalizePlate(found.plateNumber) : null),
      vehicleSnapshot: {
        vehicleId: String(found.id),
        plateNumber: found.plateNumber || '',
        plateNumberNormalized: found.plateNumberNormalized || '',
        vehicleScope: found.vehicleScope || 'personal',
        companyId: found.companyId != null ? found.companyId : null,
        officeManaged: found.officeManaged === true,
      },
    };
  }

  function readSegmentsForSave() {
    var cards = document.querySelectorAll('#full-day-vehicle-segments-container .full-day-segment-card');
    if (!cards.length) {
      return { error: t('vehicleSegmentsAtLeastOne', 'Legalább egy járműszakasz szükséges.') };
    }

    var segments = [];
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var vehicleFields = resolveCardVehicleFields(card);
      if (vehicleFields.error) return { error: vehicleFields.error };

      var startKm = parseKmInput(card.querySelector('.segment-start-km'));
      var endKm = parseKmInput(card.querySelector('.segment-end-km'));

      if (startKm != null && endKm != null && endKm < startKm) {
        return { error: t('vehicleChangeEndKmTooLow', 'A záró km nem lehet kisebb az induló km-nél.') };
      }

      var distanceKm = window.VehicleSegments && window.VehicleSegments.computeSegmentDistance
        ? window.VehicleSegments.computeSegmentDistance({ startKm: startKm, endKm: endKm })
        : null;

      segments.push({
        vehicleId: vehicleFields.vehicleId,
        vehiclePlateNumber: vehicleFields.vehiclePlateNumber,
        vehiclePlateNumberNormalized: vehicleFields.vehiclePlateNumberNormalized,
        vehicleSnapshot: vehicleFields.vehicleSnapshot,
        startKm: startKm,
        endKm: endKm,
        distanceKm: distanceKm,
        startTime: null,
        endTime: null,
        source: 'full_day_manual',
        note: null,
      });
    }

    return { segments: segments };
  }

  function prefillFromLastRecord() {
    if (!isActive()) return;
    try {
      if (typeof getLatestRecord !== 'function') return;
      var last = getLatestRecord();
      if (!last || !window.VehicleSegments) return;
      var segs = window.VehicleSegments.getDisplaySegments(last);
      if (!segs.length) return;
      var lastSeg = segs[segs.length - 1];
      var container = getContainer();
      if (!container) return;
      var card = container.querySelector('.full-day-segment-card');
      if (!card) return;

      if (lastSeg.endKm != null) {
        var startInput = card.querySelector('.segment-start-km');
        if (startInput && !startInput.value) startInput.value = String(lastSeg.endKm);
      }

      var select = card.querySelector('.segment-vehicle-select');
      if (select && !select.value && lastSeg.vehicleId) {
        select.value = String(lastSeg.vehicleId);
        onVehicleSelectChange(select);
      } else if (select && !select.value && lastSeg.vehiclePlateNumber && !lastSeg.vehicleId) {
        var manualVal = window.VehicleSegments.MANUAL_VEHICLE_VALUE || '__manual__';
        select.value = manualVal;
        onVehicleSelectChange(select);
        var manualInput = card.querySelector('.segment-manual-plate');
        if (manualInput) manualInput.value = lastSeg.vehiclePlateNumber;
      }

      updateTotalDisplay();
    } catch (_) {}
  }

  async function init(record) {
    syncVisibility();
    if (!isActive()) return;

    await ensureVehiclesLoaded();
    var container = getContainer();
    if (!container) return;
    container.innerHTML = '';

    var segments = [];
    if (record && window.VehicleSegments && window.VehicleSegments.getDisplaySegments) {
      segments = window.VehicleSegments.getDisplaySegments(record);
    }
    if (!segments.length) {
      segments = [{}];
    }

    segments.forEach(function (seg) {
      appendSegmentCard({
        vehicleId: seg.vehicleId,
        vehiclePlateNumber: seg.vehiclePlateNumber,
        startKm: seg.startKm,
        endKm: seg.endKm,
      });
    });

    if (!record) prefillFromLastRecord();
  }

  function reset() {
    vehiclesLoaded = false;
    cachedVehicles = [];
    init(null);
  }

  window.FullDayVehicleSegments = {
    init: init,
    reset: reset,
    isActive: isActive,
    syncVisibility: syncVisibility,
    readSegmentsForSave: readSegmentsForSave,
    updateTotalDisplay: updateTotalDisplay,
  };

  window.addFullDayVehicleSegment = function () {
    if (!isActive()) return;
    appendSegmentCard({});
  };

  window.removeFullDayVehicleSegment = function (btn) {
    var container = getContainer();
    if (!container) return;
    var cards = container.querySelectorAll('.full-day-segment-card');
    if (cards.length <= 1) {
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(t('vehicleSegmentsAtLeastOne', 'Legalább egy járműszakasz szükséges.'), 'info');
      }
      return;
    }
    var card = btn && btn.closest ? btn.closest('.full-day-segment-card') : null;
    if (card) card.remove();
    renumberSegmentCards();
    updateTotalDisplay();
  };

  window.addEventListener('gurigo:vehiclesChanged', function () {
    vehiclesLoaded = false;
    if (isActive() && getContainer() && getContainer().children.length) {
      // Előbb töltsük újra a cache-t; readSegmentsForSave üres cache-nél hibázott.
      ensureVehiclesLoaded().then(function () {
        var current = readSegmentsForSave();
        if (current && current.segments) {
          init({ vehicleSegments: current.segments });
        }
      }).catch(function (_) {});
    }
  });
})();
