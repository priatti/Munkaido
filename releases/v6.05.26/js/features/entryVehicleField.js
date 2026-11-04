// Bejegyzés / Indítás-Zárás – opcionális járműválasztó (bejelentkezett felhasználók)
(function () {
  'use strict';

  var initPromise = null;
  var contextRecords = {
    fullDay: null,
    start: null,
  };

  var CONTEXTS = {
    fullDay: {
      wrapId: 'entry-vehicle-field-wrap',
      selectId: 'entry-vehicle-select',
      hintId: 'entry-vehicle-hint',
    },
    start: {
      wrapId: 'start-vehicle-field-wrap',
      selectId: 'start-vehicle-select',
      hintId: 'start-vehicle-hint',
    },
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

  function isVisible() {
    return typeof window.canAccessVehicles === 'function' && window.canAccessVehicles();
  }

  function getContextElements(contextKey) {
    var ctx = CONTEXTS[contextKey] || CONTEXTS.fullDay;
    return {
      wrap: document.getElementById(ctx.wrapId),
      select: document.getElementById(ctx.selectId),
      hint: document.getElementById(ctx.hintId),
    };
  }

  function setWrapVisible(contextKey, show) {
    var wrap = getContextElements(contextKey).wrap;
    if (!wrap) return;
    wrap.classList.toggle('hidden', !show);
  }

  function resetSession() {
    initPromise = null;
  }

  function preserveSelectValue(select, previousValue) {
    if (!select || !previousValue) return;
    var stillExists = Array.prototype.some.call(select.options, function (opt) {
      return opt.value === previousValue;
    });
    if (stillExists) {
      select.value = previousValue;
    }
  }

  function updateContextHint(contextKey, activeVehicles, record) {
    var hint = getContextElements(contextKey).hint;
    if (!hint) return;
    if (!activeVehicles.length && !(record && record.vehicleId)) {
      hint.textContent = t('entryVehicleHintNoVehicles', 'Járművet a Továbbiak > Járművek menüben adhatsz hozzá.');
      hint.classList.remove('hidden');
    } else {
      hint.classList.add('hidden');
      hint.textContent = '';
    }
  }

  async function refreshVisibleVehicleFields() {
    if (!isVisible() || !window.VehiclesService) return;

    initPromise = null;

    var allVehicles = window.VehiclesService.getCachedVehicles
      ? window.VehiclesService.getCachedVehicles()
      : null;
    var lastSelected = window.VehiclesService.getCachedLastSelectedVehicle
      ? window.VehiclesService.getCachedLastSelectedVehicle()
      : null;

    if (!allVehicles) {
      try {
        var data = await ensureDataLoaded();
        allVehicles = data.vehicles || [];
        lastSelected = data.lastSelected || null;
      } catch (_) {
        return;
      }
    }

    Object.keys(CONTEXTS).forEach(function (contextKey) {
      var els = getContextElements(contextKey);
      if (!els.select || !els.wrap || els.wrap.classList.contains('hidden')) return;

      var previousValue = String(els.select.value || '');
      var record = contextRecords[contextKey] || null;
      var activeVehicles = window.VehiclesService.getActiveVehiclesForPicker
        ? window.VehiclesService.getActiveVehiclesForPicker(allVehicles)
        : (allVehicles || []).filter(function (v) { return v.active !== false && v.deleted !== true; });

      renderSelectOptions(els.select, record, allVehicles || [], lastSelected);
      preserveSelectValue(els.select, previousValue);
      updateContextHint(contextKey, activeVehicles, record);
    });
  }

  function handleVehiclesChanged() {
    void refreshVisibleVehicleFields();
  }

  function buildVehicleSnapshot(vehicle) {
    if (!vehicle || !vehicle.id) return null;
    return {
      vehicleId: String(vehicle.id),
      plateNumber: vehicle.plateNumber || '',
      plateNumberNormalized: vehicle.plateNumberNormalized
        || (window.VehiclesService && window.VehiclesService.normalizePlateKey
          ? window.VehiclesService.normalizePlateKey(vehicle.plateNumber)
          : String(vehicle.plateNumber || '').toUpperCase()),
      vehicleScope: vehicle.vehicleScope || 'personal',
      companyId: vehicle.companyId != null ? vehicle.companyId : null,
      officeManaged: vehicle.officeManaged === true,
    };
  }

  function buildVehicleFieldsFromRecord(record) {
    if (!record || !record.vehicleId) return null;
    var snap = record.vehicleSnapshot && typeof record.vehicleSnapshot === 'object'
      ? record.vehicleSnapshot
      : null;
    return {
      vehicleId: String(record.vehicleId),
      vehiclePlateNumber: record.vehiclePlateNumber || (snap && snap.plateNumber) || null,
      vehiclePlateNumberNormalized: record.vehiclePlateNumberNormalized || (snap && snap.plateNumberNormalized) || null,
      vehicleSnapshot: snap || buildVehicleSnapshot({
        id: record.vehicleId,
        plateNumber: record.vehiclePlateNumber,
        plateNumberNormalized: record.vehiclePlateNumberNormalized,
        vehicleScope: 'personal',
        companyId: null,
        officeManaged: false,
      }),
    };
  }

  function resolveFormerVehicleLabel(record, allVehicles) {
    var plate = record.vehiclePlateNumber
      || (record.vehicleSnapshot && record.vehicleSnapshot.plateNumber)
      || String(record.vehicleId || '');
    var found = (allVehicles || []).find(function (v) {
      return String(v.id) === String(record.vehicleId);
    });
    var suffix = found && found.active === false
      ? t('entryVehicleInactiveSuffix', 'inaktív')
      : t('entryVehicleFormerSuffix', 'korábbi jármű');
    return plate + ' (' + suffix + ')';
  }

  function resolveDefaultSelection(record, lastSelected, allVehicles) {
    if (record && record.vehicleId) {
      return String(record.vehicleId);
    }
    if (!lastSelected || !lastSelected.lastSelectedVehicleId) {
      return '';
    }
    var lastId = String(lastSelected.lastSelectedVehicleId);
    var lastVehicle = (allVehicles || []).find(function (v) {
      return String(v.id) === lastId;
    });
    if (lastVehicle && lastVehicle.active !== false && lastVehicle.deleted !== true) {
      return lastId;
    }
    return '';
  }

  async function ensureDataLoaded() {
    if (!window.VehiclesService) return { vehicles: [], lastSelected: null };
    if (initPromise) return initPromise;

    initPromise = Promise.all([
      window.VehiclesService.loadVehicles(false),
      window.VehiclesService.loadLastSelectedVehicle(false),
    ]).then(function (results) {
      return {
        vehicles: Array.isArray(results[0]) ? results[0] : [],
        lastSelected: results[1] || null,
      };
    }).catch(function (err) {
      initPromise = null;
      throw err;
    });

    return initPromise;
  }

  function renderSelectOptions(select, record, allVehicles, lastSelected) {
    if (!select) return;

    var activeVehicles = window.VehiclesService.getActiveVehiclesForPicker
      ? window.VehiclesService.getActiveVehiclesForPicker(allVehicles)
      : (allVehicles || []).filter(function (v) { return v.active !== false && v.deleted !== true; });

    activeVehicles.sort(function (a, b) {
      return String(a.plateNumber || '').localeCompare(String(b.plateNumber || ''), undefined, { sensitivity: 'base' });
    });

    var html = '<option value="">' + escapeHtml(t('entryVehicleNone', 'Nincs jármű kiválasztva')) + '</option>';

    if (record && record.vehicleId) {
      var recordId = String(record.vehicleId);
      var inActive = activeVehicles.some(function (v) { return String(v.id) === recordId; });
      if (!inActive) {
        html += '<option value="' + escapeHtml(recordId) + '">' + escapeHtml(resolveFormerVehicleLabel(record, allVehicles)) + '</option>';
      }
    }

    activeVehicles.forEach(function (vehicle) {
      html += '<option value="' + escapeHtml(String(vehicle.id)) + '">' + escapeHtml(vehicle.plateNumber || vehicle.id) + '</option>';
    });

    select.innerHTML = html;
    select.value = resolveDefaultSelection(record, lastSelected, allVehicles);
  }

  async function initVehicleField(contextKey, options) {
    options = options || {};
    var record = options.record || null;
    contextRecords[contextKey] = record;
    var els = getContextElements(contextKey);
    var wrap = els.wrap;
    var select = els.select;
    var hint = els.hint;

    if (!wrap || !select) return;

    if (!isVisible() || !window.currentUser) {
      setWrapVisible(contextKey, false);
      return;
    }

    setWrapVisible(contextKey, true);
    if (hint) {
      hint.classList.add('hidden');
      hint.textContent = '';
    }

    try {
      var data = await ensureDataLoaded();
      var allVehicles = data.vehicles || [];
      var activeVehicles = window.VehiclesService.getActiveVehiclesForPicker
        ? window.VehiclesService.getActiveVehiclesForPicker(allVehicles)
        : [];

      renderSelectOptions(select, record, allVehicles, data.lastSelected);

      if (hint) {
        if (!activeVehicles.length && !(record && record.vehicleId)) {
          hint.textContent = t('entryVehicleHintNoVehicles', 'Járművet a Továbbiak > Járművek menüben adhatsz hozzá.');
          hint.classList.remove('hidden');
        }
      }
    } catch (_) {
      if (select) {
        select.innerHTML = '<option value="">' + escapeHtml(t('entryVehicleNone', 'Nincs jármű kiválasztva')) + '</option>';
      }
      if (hint) {
        hint.textContent = t('entryVehicleLoadFailed', 'A járművek betöltése nem sikerült.');
        hint.classList.remove('hidden');
      }
    }
  }

  function resolveVehicleForSave(selectedId, sourceRecord) {
    if (!selectedId) return null;

    var allVehicles = window.VehiclesService && window.VehiclesService.getCachedVehicles
      ? window.VehiclesService.getCachedVehicles()
      : [];

    var found = (allVehicles || []).find(function (v) {
      return String(v.id) === String(selectedId);
    });

    if (found) {
      return {
        vehicleId: String(found.id),
        vehiclePlateNumber: found.plateNumber || null,
        vehiclePlateNumberNormalized: found.plateNumberNormalized || null,
        vehicleSnapshot: buildVehicleSnapshot(found),
      };
    }

    if (sourceRecord && String(sourceRecord.vehicleId) === String(selectedId)) {
      return buildVehicleFieldsFromRecord(sourceRecord);
    }

    return null;
  }

  function readSelectionForContext(contextKey, target, sourceRecord) {
    if (!isVisible()) return target;

    var select = getContextElements(contextKey).select;
    if (!select) return target;

    var out = Object.assign({}, target);
    var selectedId = String(select.value || '').trim();

    if (!selectedId) {
      out.vehicleId = null;
      out.vehiclePlateNumber = null;
      out.vehiclePlateNumberNormalized = null;
      out.vehicleSnapshot = null;
      return out;
    }

    var resolved = resolveVehicleForSave(selectedId, sourceRecord);
    if (!resolved) {
      out.vehicleId = null;
      out.vehiclePlateNumber = null;
      out.vehiclePlateNumberNormalized = null;
      out.vehicleSnapshot = null;
      return out;
    }

    return Object.assign(out, resolved);
  }

  async function afterSaveSuccess(record) {
    if (!isVisible() || !record || !record.vehicleId || !window.VehiclesService) return;
    try {
      await window.VehiclesService.saveLastSelectedVehicle({
        id: record.vehicleId,
        plateNumber: record.vehiclePlateNumber,
        plateNumberNormalized: record.vehiclePlateNumberNormalized,
      });
    } catch (err) {
      console.warn('[EntryVehicleField] last selected vehicle save failed:', err && err.message);
    }
  }

  function formatVehiclePlateForDisplay(obj) {
    if (!obj) return '';
    return obj.vehiclePlateNumber
      || (obj.vehicleSnapshot && obj.vehicleSnapshot.plateNumber)
      || '';
  }

  function getRecordVehiclePlate(record) {
    return formatVehiclePlateForDisplay(record);
  }

  function collectUniqueVehiclePlatesFromReportRows(monthReportRows) {
    if (window.VehicleSegments && typeof window.VehicleSegments.getUniqueReportVehicles === 'function') {
      return window.VehicleSegments.getUniqueReportVehicles(monthReportRows).vehicles.map(function (v) {
        return v.displayPlate;
      });
    }
    var seen = {};
    var plates = [];
    (monthReportRows || []).forEach(function (row) {
      if (!row || row.isEmpty) return;
      var plate = getRecordVehiclePlate(row.sourceRecord);
      if (!plate || seen[plate]) return;
      seen[plate] = true;
      plates.push(plate);
    });
    return plates.sort(function (a, b) {
      return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
    });
  }

  function computeReportVehicleDisplay(monthReportRows, reportSettings) {
    if (!reportSettings || !reportSettings.showVehicle) {
      return { uniquePlates: [], headerPlate: null, perRow: false, count: 0, vehicles: [] };
    }
    var unique = (window.VehicleSegments && typeof window.VehicleSegments.getUniqueReportVehicles === 'function')
      ? window.VehicleSegments.getUniqueReportVehicles(monthReportRows)
      : { count: 0, vehicles: [] };
    var uniquePlates = unique.vehicles.map(function (v) { return v.displayPlate; });
    return {
      uniquePlates: uniquePlates,
      headerPlate: unique.count === 1 ? unique.vehicles[0].displayPlate : null,
      perRow: unique.count > 1,
      count: unique.count,
      vehicles: unique.vehicles,
    };
  }

  window.EntryVehicleField = {
    initEntryVehicleField: function (options) {
      return initVehicleField('fullDay', options || {});
    },
    initStartVehicleField: function (options) {
      return initVehicleField('start', options || {});
    },
    readSelectionForSave: function (record) {
      return readSelectionForContext('fullDay', record, record);
    },
    readSelectionForShiftStart: function (shift) {
      return readSelectionForContext('start', shift, shift);
    },
    afterSaveSuccess: afterSaveSuccess,
    resetSession: resetSession,
    formatVehiclePlateForDisplay: formatVehiclePlateForDisplay,
    getRecordVehiclePlate: getRecordVehiclePlate,
    collectUniqueVehiclePlatesFromReportRows: collectUniqueVehiclePlatesFromReportRows,
    computeReportVehicleDisplay: computeReportVehicleDisplay,
  };

  window.addEventListener('gurigo:vehiclesChanged', handleVehiclesChanged);
})();
