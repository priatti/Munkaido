// =======================================================
// ===== TANKOLÁS (FUELING) modul ========================
// =======================================================
// Adatstruktúra: users/{uid}/fuelLogs/{fuelLogId}
// Jármű adatok: VehiclesService.getActiveVehiclesForPicker()

(function () {
  'use strict';

  var uiState = {
    mode: 'list',        // 'list' | 'form'
    editingId: null,
    saving: false,
    loading: false,
    vehicleFilter: null, // aktív jármű id; ensureVehicleFilter() állítja be
    formEnergyType: null, // null | 'adblue' — AdBlue tankolás űrlap
    // Árszámítás: melyik mezőt módosították utoljára
    lastPriceField: null,  // 'liters' | 'unitPrice' | 'totalAmount'
    currencyManuallyChanged: false,
    previousMonthsCache: null,
    previousMonthsLoading: false,
  };

  // --- i18n helper ---
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

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getRootEl() {
    return document.getElementById('content-fueling');
  }

  // --- Dátum/idő segédek ---
  function getTodayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function getNowTimeStr() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function formatDisplayDate(dateStr) {
    if (typeof window.formatLocalizedDate === 'function') {
      return window.formatLocalizedDate(dateStr);
    }
    if (!dateStr) return '';
    return String(dateStr);
  }

  function formatNum(value, decimals) {
    if (value == null || !isFinite(value)) return '';
    return Number(value).toFixed(decimals);
  }

  function resolveCurrency(logOrCode) {
    if (window.FuelingService && window.FuelingService.resolveLogCurrency) {
      if (typeof logOrCode === 'string') return window.FuelingService.normalizeCurrency(logOrCode, 'HUF');
      return window.FuelingService.resolveLogCurrency(logOrCode || {});
    }
    var c = typeof logOrCode === 'string' ? logOrCode : (logOrCode && logOrCode.currency);
    return String(c || 'HUF').toUpperCase();
  }

  function formatAmountDisplay(value, currency) {
    if (value == null || !isFinite(value)) return '';
    var cur = resolveCurrency(currency);
    if (cur === 'HUF') {
      if (Math.abs(value - Math.round(value)) < 0.001) {
        return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      }
      return formatNum(value, 2);
    }
    return formatNum(value, 2);
  }

  function formatUnitPriceDisplay(value, currency) {
    if (value == null || !isFinite(value)) return '';
    return formatNum(value, 3);
  }

  function getCurrencyLabel(code) {
    return t('fuelingCurrency' + String(code || '').toUpperCase(), String(code || '').toUpperCase());
  }

  function buildCurrencyOptions(selectedCurrency) {
    var codes = (window.FuelingService && window.FuelingService.SUPPORTED_CURRENCIES) || ['HUF', 'EUR'];
    var sel = resolveCurrency(selectedCurrency);
    return codes.map(function (code) {
      return '<option value="' + escHtml(code) + '"' + (code === sel ? ' selected' : '') + '>'
        + escHtml(getCurrencyLabel(code))
        + '</option>';
    }).join('');
  }

  function suggestFormCurrency(vehicleId, log, isEdit) {
    if (isEdit && log) {
      return log.currency ? resolveCurrency(log) : 'HUF';
    }
    var logs = window.FuelingService && window.FuelingService.getCachedLogs
      ? window.FuelingService.getCachedLogs()
      : [];
    if (window.FuelingService && window.FuelingService.suggestDefaultCurrency) {
      return window.FuelingService.suggestDefaultCurrency(vehicleId, logs);
    }
    return 'HUF';
  }

  function buildMultiCurrencyValueHtml(byCurrency, suffix) {
    var keys = Object.keys(byCurrency || {});
    if (!keys.length) return '';
    keys.sort();
    var isUnitPrice = !!(suffix && String(suffix).charAt(0) === '/');
    var lines = keys.map(function (cur) {
      var val = byCurrency[cur];
      var formatted = isUnitPrice ? formatUnitPriceDisplay(val, cur) : formatAmountDisplay(val, cur);
      return escHtml(formatted + ' ' + cur + (suffix || ''));
    });
    return lines.length === 1 ? lines[0] : lines.join('<br>');
  }

  // --- Aktív járművek ---
  function getActiveVehicles() {
    var cached = window.VehiclesService && window.VehiclesService.getCachedVehicles
      ? window.VehiclesService.getCachedVehicles()
      : null;
    if (!Array.isArray(cached)) return [];
    return window.VehiclesService.getActiveVehiclesForPicker
      ? window.VehiclesService.getActiveVehiclesForPicker(cached)
      : cached.filter(function (v) { return v && !v.deleted && v.active !== false; });
  }

  function getFuelingPageLabels(activeVehicles) {
    var mode = window.VehiclesService && window.VehiclesService.resolveFuelingMenuLabelMode
      ? window.VehiclesService.resolveFuelingMenuLabelMode(activeVehicles || [])
      : 'default';
    var isCharging = mode === 'charging';
    var keys = window.VehiclesService && window.VehiclesService.getFuelingMenuLabelKeys
      ? window.VehiclesService.getFuelingMenuLabelKeys(mode)
      : { title: 'fuelingMenuTitleFueling', subtitle: 'fuelingMenuSubtitleFueling' };
    return {
      isCharging: isCharging,
      title: t(keys.title, t('fuelingTitle', 'Tankolás')),
      subtitle: t(keys.subtitle, t('menuFuelingDesc', 'Tankolások és fogyasztás')),
      newEntry: t(isCharging ? 'fuelingNewEntryCharging' : 'fuelingNewEntry', isCharging ? 'Töltés rögzítése' : 'Tankolás rögzítése'),
      editEntry: t(isCharging ? 'fuelingEditEntryCharging' : 'fuelingEditEntry', isCharging ? 'Töltés szerkesztése' : 'Tankolás szerkesztése'),
      addFirst: t(isCharging ? 'fuelingAddFirstCharging' : 'fuelingAddFirst', isCharging ? 'Első töltés rögzítése' : 'Első tankolás rögzítése'),
      emptyTitle: t(isCharging ? 'fuelingEmptyForVehicleTitleCharging' : 'fuelingEmptyForVehicleTitle', isCharging ? 'Ehhez a járműhöz még nincs töltés' : 'Ehhez a járműhöz még nincs tankolás'),
      emptyText: t(isCharging ? 'fuelingEmptyForVehicleTextCharging' : 'fuelingEmptyForVehicleText', isCharging ? 'Rögzítsd az első töltést ehhez a járműhöz!' : 'Rögzítsd az első tankolást ehhez a járműhöz!'),
      lastEntry: t(isCharging ? 'fuelingLastCharging' : 'fuelingLastFueling', isCharging ? 'Utolsó töltés' : 'Utolsó tankolás'),
    };
  }

  function getVehicleById(activeVehicles, vehicleId) {
    if (!vehicleId) return null;
    return (activeVehicles || []).find(function (v) { return v.id === vehicleId; }) || null;
  }

  function isVehicleChargingForm(vehicle) {
    return !!(window.VehiclesService && window.VehiclesService.isElectricOnlyVehicle
      && window.VehiclesService.isElectricOnlyVehicle(vehicle));
  }

  function isAdBlueFormMode() {
    return uiState.formEnergyType === 'adblue';
  }

  function isAdBlueLog(log) {
    return !!(window.FuelingService && window.FuelingService.isAdBlueLog
      && window.FuelingService.isAdBlueLog(log));
  }

  function vehicleHasAdBlue(vehicle) {
    if (!vehicle) return false;
    if (window.VehiclesService && window.VehiclesService.hasEnergyType) {
      return window.VehiclesService.hasEnergyType(vehicle, 'adblue');
    }
    var types = window.VehiclesService && window.VehiclesService.getVehicleEnergyTypes
      ? window.VehiclesService.getVehicleEnergyTypes(vehicle)
      : [];
    return (types || []).indexOf('adblue') >= 0;
  }

  function filterAdBlueCapableVehicles(activeVehicles) {
    return (activeVehicles || []).filter(vehicleHasAdBlue);
  }

  function getFuelingFormLabels(vehicle) {
    if (isAdBlueFormMode()) {
      return {
        isCharging: false,
        isAdBlue: true,
        priceSection: t('fuelingPriceSectionAdblue', 'AdBlue mennyiség és ár'),
        quantityLabel: t('fuelingQuantityAdblue', 'AdBlue mennyiség (l)'),
        unitPriceLabel: t('fuelingUnitPriceAdblue', 'Egységár (/l)'),
        quantityPlaceholder: t('fuelingLitersPlaceholder', 'pl. 45,50'),
        unitPricePlaceholder: t('fuelingUnitPricePlaceholder', 'pl. 619,9'),
        notePlaceholder: t('fuelingNotePlaceholderAdblue', 'pl. AdBlue kút'),
        quantityRequiredError: t('fuelingErrorAdblueRequired', 'Add meg az AdBlue mennyiséget!'),
        showFullToggle: true,
        fullToggleLabel: t('fuelingFullAdblue', 'Tele AdBlue'),
        fullOnlyInfo: t('fuelingFullAdblueOnlyInfo', 'Csak tele AdBlue tankolásoknál pontos'),
        partialNotExact: t('fuelingEstimated', 'Nem pontos'),
      };
    }
    var meta = getVehicleQuantityMeta(vehicle);
    return {
      isCharging: meta.isCharging,
      isAdBlue: false,
      priceSection: t(meta.isCharging ? 'fuelingPriceSectionCharging' : 'fuelingPriceSection', meta.isCharging ? 'Töltött energia és költség' : 'Mennyiség és ár'),
      quantityLabel: meta.quantityLabel,
      unitPriceLabel: meta.unitPriceLabel,
      quantityPlaceholder: meta.quantityPlaceholder,
      unitPricePlaceholder: meta.unitPricePlaceholder,
      notePlaceholder: t(meta.isCharging ? 'fuelingNotePlaceholderCharging' : 'fuelingNotePlaceholder', meta.isCharging ? 'pl. AC töltő, otthoni wallbox' : 'pl. céges kút, külföldi tankolás'),
      quantityRequiredError: meta.quantityRequiredError,
      showFullToggle: meta.showFullToggle !== false,
      fullToggleLabel: t(meta.fullToggleLabelKey, meta.isCharging ? 'Tele töltés' : 'Tele tankolás'),
      fullOnlyInfo: t(meta.fullOnlyInfoKey, meta.isCharging ? 'Csak tele töltéseknél pontos' : 'Csak tele tankolásoknál pontos'),
      partialNotExact: t(meta.partialNotExactKey, 'Nem pontos'),
    };
  }

  function updateFormLabelsForVehicle(activeVehicles) {
    var vehicleSel = document.getElementById('fueling-vehicle');
    if (!vehicleSel) return;
    var vehicle = getVehicleById(activeVehicles, vehicleSel.value);
    var labels = getFuelingFormLabels(vehicle);

    var sectionEl = document.getElementById('fueling-price-section-label');
    if (sectionEl) sectionEl.textContent = labels.priceSection;

    var quantityLabelEl = document.getElementById('fueling-liters-label');
    if (quantityLabelEl) {
      quantityLabelEl.innerHTML = escHtml(labels.quantityLabel) + ' <span class="text-red-500">*</span>';
    }

    var unitPriceLabelEl = document.getElementById('fueling-unit-price-label');
    if (unitPriceLabelEl) {
      unitPriceLabelEl.innerHTML = escHtml(labels.unitPriceLabel)
        + ' <span class="text-gray-400 font-normal"> ' + escHtml(t('fuelingOptional', '(opcionális)')) + '</span>';
    }

    var litersEl = document.getElementById('fueling-liters');
    if (litersEl) litersEl.placeholder = labels.quantityPlaceholder;

    var unitPriceEl = document.getElementById('fueling-unit-price');
    if (unitPriceEl) unitPriceEl.placeholder = labels.unitPricePlaceholder;

    var noteEl = document.getElementById('fueling-note');
    if (noteEl) noteEl.placeholder = labels.notePlaceholder;

    var fullTankWrap = document.getElementById('fueling-full-tank-wrap');
    var fullTankLabel = document.querySelector('label[for="fueling-full-tank"]');
    if (fullTankWrap) fullTankWrap.style.display = labels.showFullToggle ? '' : 'none';
    if (fullTankLabel) fullTankLabel.textContent = labels.fullToggleLabel;
  }

  function isActiveVehicleId(vehicleId, activeVehicles) {
    if (!vehicleId) return false;
    return (activeVehicles || []).some(function (v) { return v.id === vehicleId; });
  }

  /** Legfrissebb tankolás járműve, ha még aktív (logs: legújabb elöl). */
  function getLastFueledActiveVehicleId(logs, activeVehicles) {
    if (!Array.isArray(logs) || !logs.length) return null;
    var activeIds = {};
    (activeVehicles || []).forEach(function (v) { if (v && v.id) activeIds[v.id] = true; });
    for (var i = 0; i < logs.length; i++) {
      var vid = logs[i].vehicleId;
      if (vid && activeIds[vid]) return vid;
    }
    return null;
  }

  function resolveDefaultVehicleFilter(activeVehicles, logs, currentFilter) {
    var vehicles = activeVehicles || [];
    if (!vehicles.length) return '';

    if (vehicles.length === 1) return vehicles[0].id;

    if (currentFilter && isActiveVehicleId(currentFilter, vehicles)) {
      return currentFilter;
    }

    var lastFueled = getLastFueledActiveVehicleId(logs, vehicles);
    if (lastFueled) return lastFueled;

    return vehicles[0].id;
  }

  function ensureVehicleFilter(activeVehicles, logs) {
    uiState.vehicleFilter = resolveDefaultVehicleFilter(
      activeVehicles,
      logs || [],
      uiState.vehicleFilter
    );
    return uiState.vehicleFilter;
  }

  function getFormDefaultVehicleId(activeVehicles, log, isEdit) {
    if (isEdit && log && log.vehicleId) return log.vehicleId;
    var logs = window.FuelingService && window.FuelingService.getCachedLogs
      ? window.FuelingService.getCachedLogs()
      : [];
    return ensureVehicleFilter(activeVehicles, logs);
  }

  function buildVehicleFilterHtml(activeVehicles, filterId) {
    if (!activeVehicles || !activeVehicles.length) return '';

    if (activeVehicles.length === 1) {
      var only = activeVehicles[0];
      return '<div class="fueling-vehicle-filter">'
        + '<label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">' + escHtml(t('fuelingFilter', 'Jármű')) + '</label>'
        + '<div class="w-full p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 text-sm font-medium">'
        + escHtml(only.plateNumber)
        + '</div>'
        + '<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">' + escHtml(t('fuelingSingleVehicleAuto', 'Egy aktív jármű – automatikusan kiválasztva')) + '</p>'
        + '</div>';
    }

    var options = '';
    activeVehicles.forEach(function (v) {
      options += '<option value="' + escHtml(v.id) + '"' + (filterId === v.id ? ' selected' : '') + '>' + escHtml(v.plateNumber) + '</option>';
    });
    return '<div class="fueling-vehicle-filter">'
      + '<label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1" for="fueling-vehicle-filter">' + escHtml(t('fuelingFilter', 'Jármű')) + '</label>'
      + '<select id="fueling-vehicle-filter" class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm">'
      + options
      + '</select>'
      + '</div>';
  }

  // --- Árszámítás logika ---
  function calcPriceFields(liters, unitPrice, totalAmount, lastChanged) {
    // A 0-t is érvényes átmeneti értéknek tekintjük, a nullával való osztást kivédjük
    var l = liters != null && isFinite(liters) && liters >= 0 ? liters : null;
    var u = unitPrice != null && isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : null;
    var s = totalAmount != null && isFinite(totalAmount) && totalAmount >= 0 ? totalAmount : null;

    var result = { liters: l, unitPrice: u, totalAmount: s, computed: null };

    var filled = (l != null ? 1 : 0) + (u != null ? 1 : 0) + (s != null ? 1 : 0);
    if (filled < 2) return result;

    if (l != null && u != null && s == null) {
      result.totalAmount = Math.round(l * u * 100) / 100;
      result.computed = 'totalAmount';
    } else if (l != null && s != null && u == null && l > 0) {
      result.unitPrice = Math.round((s / l) * 1000) / 1000;
      result.computed = 'unitPrice';
    } else if (u != null && s != null && l == null && u > 0) {
      result.liters = Math.round((s / u) * 100) / 100;
      result.computed = 'liters';
    } else if (filled === 3) {
      // Mindhárom ki van töltve – az utoljára módosított alapján számol
      if (lastChanged === 'liters' || lastChanged === 'unitPrice') {
        result.totalAmount = Math.round(result.liters * result.unitPrice * 100) / 100;
        result.computed = 'totalAmount';
      } else if (lastChanged === 'totalAmount' && result.liters != null && result.liters > 0) {
        result.unitPrice = Math.round((result.totalAmount / result.liters) * 1000) / 1000;
        result.computed = 'unitPrice';
      }
    }

    return result;
  }

  // --- Km figyelmeztetés (csak azonos energia típus: AdBlue ↔ AdBlue, üzemanyag ↔ üzemanyag) ---
  function getPreviousOdometerForVehicle(vehicleId, excludeLogId) {
    var logs = window.FuelingService && window.FuelingService.getCachedLogs
      ? window.FuelingService.getCachedLogs()
      : null;
    if (!Array.isArray(logs) || !vehicleId) return null;

    var wantAdBlue = isAdBlueFormMode();
    var vehicleLogs = logs
      .filter(function (l) {
        if (l.vehicleId !== vehicleId || l.odometerKm == null) return false;
        if (excludeLogId && l.id === excludeLogId) return false;
        return wantAdBlue ? isAdBlueLog(l) : !isAdBlueLog(l);
      })
      .sort(function (a, b) {
        var ta = a.timestamp || a.date || '';
        var tb = b.timestamp || b.date || '';
        return tb > ta ? 1 : tb < ta ? -1 : 0;
      });

    return vehicleLogs.length > 0 ? vehicleLogs[0].odometerKm : null;
  }

  // =====================================================
  // === STATISZTIKA KÁRTYÁK =============================
  // =====================================================

  function buildStatsHtml(logs, filterVehicleId, pageLabels, activeVehicles) {
    if (!filterVehicleId) {
      return '<div class="text-sm text-gray-400 p-2">' + escHtml(t('fuelingNoActiveVehiclesText', 'Nincs aktív jármű.')) + '</div>';
    }

    var filterVehicle = getVehicleById(activeVehicles, filterVehicleId);
    var meta = getVehicleQuantityMeta(filterVehicle);
    var quantityUnit = meta.quantityUnit;
    var monthlyQuantityTitle = meta.monthlyQuantityTitle;

    var filteredLogs = window.FuelingService.getLogsForVehicle(logs, filterVehicleId);
    var primaryLogs = window.FuelingService.filterPrimaryFuelLogs
      ? window.FuelingService.filterPrimaryFuelLogs(filteredLogs)
      : filteredLogs;
    var adblueLogs = window.FuelingService.filterAdBlueLogs
      ? window.FuelingService.filterAdBlueLogs(filteredLogs)
      : [];
    var monthLogs = window.FuelingService.getThisMonthLogs(primaryLogs);
    var adblueMonthLogs = window.FuelingService.getThisMonthLogs(adblueLogs);
    var lastLog = filteredLogs.length > 0 ? filteredLogs[0] : null;
    var showAdBlueStats = vehicleHasAdBlue(filterVehicle);

    var lastConsumption = window.FuelingService.calcLastConsumption(primaryLogs);
    var avgConsumption = window.FuelingService.calcAverageConsumption(primaryLogs);
    var avgFuelCost = window.FuelingService.calcAverageFuelCost
      ? window.FuelingService.calcAverageFuelCost(primaryLogs)
      : null;
    var adblueLastConsumption = showAdBlueStats
      ? window.FuelingService.calcLastConsumption(adblueLogs)
      : null;
    var adblueAvgConsumption = showAdBlueStats
      ? window.FuelingService.calcAverageConsumption(adblueLogs)
      : null;

    // Havi összeg és átlag egységár – pénznemenként (üzemanyag)
    var costByCurrency = window.FuelingService.calcMonthlyCostByCurrency
      ? window.FuelingService.calcMonthlyCostByCurrency(monthLogs)
      : {};
    var avgUnitByCurrency = window.FuelingService.calcAverageUnitPriceByCurrency
      ? window.FuelingService.calcAverageUnitPriceByCurrency(monthLogs)
      : {};
    var adblueCostByCurrency = showAdBlueStats && window.FuelingService.calcMonthlyCostByCurrency
      ? window.FuelingService.calcMonthlyCostByCurrency(adblueMonthLogs)
      : {};
    var adblueAvgUnitByCurrency = showAdBlueStats && window.FuelingService.calcAverageUnitPriceByCurrency
      ? window.FuelingService.calcAverageUnitPriceByCurrency(adblueMonthLogs)
      : {};

    var costKeys = Object.keys(costByCurrency);
    var avgKeys = Object.keys(avgUnitByCurrency);

    var monthlyCostVal = costKeys.length > 0
      ? buildMultiCurrencyValueHtml(costByCurrency, '')
      : '<span class="text-sm text-gray-400">' + escHtml(t('fuelingNoPriceData', t('fuelingNoPrice', 'Nincs ár adat'))) + '</span>';
    var monthlyCostSub = costKeys.length > 1
      ? escHtml(t('fuelingMultipleCurrenciesInfo', 'Több pénznem – nincs összevonva'))
      : escHtml(t('fuelingThisMonth', 'Ebben a hónapban'));

    var avgUnitPriceVal = avgKeys.length > 0
      ? buildMultiCurrencyValueHtml(avgUnitByCurrency, meta.unitPriceSuffix)
      : '<span class="text-sm text-gray-400">' + escHtml(t('fuelingNoPriceData', t('fuelingNoPrice', 'Nincs ár adat'))) + '</span>';
    var avgUnitPriceSub = avgKeys.length > 1
      ? escHtml(t('fuelingAverageUnitPriceByCurrency', 'Pénznemenként külön'))
      : escHtml(t('fuelingThisMonth', 'Ebben a hónapban'));

    function card(icon, title, valueHtml, subHtml) {
      return '<div class="fueling-stat-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm">'
        + '<div class="fueling-stat-card__header">'
        + '<span class="fueling-stat-card__icon" aria-hidden="true">' + icon + '</span>'
        + '<span class="fueling-stat-card__title">' + escHtml(title) + '</span>'
        + '</div>'
        + '<div class="fueling-stat-card__value">' + valueHtml + '</div>'
        + (subHtml ? '<div class="fueling-stat-card__sub">' + subHtml + '</div>' : '')
        + '</div>';
    }

    function buildLastEntryDetailsHtml(entryLog, vehicle) {
      if (!entryLog) return '';
      var logMeta = getLogQuantityMeta(entryLog, vehicle);
      var rows = [];

      if (isAdBlueLog(entryLog)) {
        rows.push(buildStatDetailRow(
          t('fuelingEnergyTypeLabel', 'Típus'),
          escHtml(t('fuelingEnergyTypeAdblue', 'AdBlue'))
        ));
      }
      if (entryLog.vehiclePlate) {
        rows.push(buildStatDetailRow(
          t('fuelingVehicleLabel', t('fuelingVehicle', 'Jármű')),
          escHtml(entryLog.vehiclePlate)
        ));
      }
      if (entryLog.liters != null) {
        rows.push(buildStatDetailRow(
          t('fuelingQuantityLabel', 'Mennyiség'),
          escHtml(formatNum(entryLog.liters, 2) + ' ' + logMeta.quantityUnit)
        ));
      }
      if (entryLog.totalAmount != null) {
        rows.push(buildStatDetailRow(
          t('fuelingAmountLabel', t('fuelingTotalAmount', 'Összeg')),
          escHtml(formatAmountDisplay(entryLog.totalAmount, entryLog) + ' ' + resolveCurrency(entryLog))
        ));
      }
      if (entryLog.odometerKm != null) {
        rows.push(buildStatDetailRow(
          t('fuelingOdometerLabel', 'Km'),
          escHtml(String(Math.round(entryLog.odometerKm)) + ' km')
        ));
      }

      if (!rows.length) return '';
      return '<div class="fueling-stat-details">' + rows.join('') + '</div>';
    }

    function formatAdBlueConsumptionValue(cons) {
      if (!cons) return escHtml(t('fuelingNotEnoughData', 'Nincs elég adat'));
      if (cons.notCalculable) {
        return escHtml(t('fuelingNotCalculable', 'Nem számolható'));
      }
      if (cons.notAccurate) {
        return escHtml(t('fuelingEstimated', 'Nem pontos'));
      }
      if (cons.consumption != null) {
        return escHtml(formatNum(cons.consumption, 2) + ' ' + t('fuelingConsumptionLiterPer100', 'l/100km'));
      }
      return escHtml(t('fuelingNotEnoughData', 'Nincs elég adat'));
    }

    // 1. Utolsó tankolás
    var lastFuelingVal = t('fuelingNotEnoughData', 'Nincs elég adat');
    var lastFuelingSub = '';
    if (lastLog) {
      lastFuelingVal = escHtml(formatDisplayDate(lastLog.date));
      lastFuelingSub = buildLastEntryDetailsHtml(lastLog, filterVehicle);
    }

    // 2. Utolsó fogyasztás
    var lastConsVal = t('fuelingNotEnoughData', 'Nincs elég adat');
    var lastConsSub = '';
    if (lastConsumption) {
      if (lastConsumption.notCalculable) {
        lastConsVal = '<span class="text-sm text-amber-600 dark:text-amber-400">' + escHtml(t('fuelingNotCalculable', 'Nem számolható')) + '</span>';
      } else if (lastConsumption.notAccurate) {
        lastConsVal = '<span class="text-sm text-amber-600 dark:text-amber-400">' + escHtml(meta.isCharging ? t(meta.partialNotExactKey, 'Nem pontos részleges töltés miatt') : t('fuelingEstimated', 'Nem pontos')) + '</span>';
        lastConsSub = escHtml(t(meta.fullOnlyInfoKey, meta.isCharging ? 'Csak tele töltéseknél pontos' : 'Csak tele tankolásoknál pontos'));
      } else if (lastConsumption.consumption != null) {
        lastConsVal = formatNum(lastConsumption.consumption, 2) + ' ' + escHtml(meta.consumptionUnit);
        lastConsSub = lastConsumption.kmDiff != null
          ? escHtml(t('fuelingKm', 'Megtett km')) + ': ' + Math.round(lastConsumption.kmDiff) + ' km'
          : '';
        lastConsSub = appendFuelCostSubHtml(
          lastConsSub,
          lastConsumption.costPer100KmByCurrency,
          lastConsumption.costPerKmByCurrency
        );
      }
    }
    if (showAdBlueStats) {
      lastConsSub = appendAdBlueStatDetails(lastConsSub, [
        buildStatDetailRow(
          t('fuelingAdblueStatLabel', 'AdBlue'),
          formatAdBlueConsumptionValue(adblueLastConsumption)
        ),
      ]);
    }

    // 3. Átlagfogyasztás
    var avgConsVal = t('fuelingNotEnoughData', 'Nincs elég adat');
    var avgConsSub = '';
    if (avgConsumption != null) {
      avgConsVal = formatNum(avgConsumption, 2) + ' ' + escHtml(meta.consumptionUnit);
      avgConsSub = escHtml(t(meta.fullOnlyInfoKey, meta.isCharging ? 'Csak tele töltéseknél pontos' : 'Csak tele tankolásoknál pontos'));
      if (avgFuelCost) {
        avgConsSub = appendFuelCostSubHtml(
          avgConsSub,
          avgFuelCost.costPer100KmByCurrency,
          avgFuelCost.costPerKmByCurrency
        );
      }
    }
    if (showAdBlueStats) {
      var adblueAvgConsVal = (adblueAvgConsumption != null)
        ? escHtml(formatNum(adblueAvgConsumption, 2) + ' ' + t('fuelingConsumptionLiterPer100', 'l/100km'))
        : escHtml(t('fuelingNotEnoughData', 'Nincs elég adat'));
      avgConsSub = appendAdBlueStatDetails(avgConsSub, [
        buildStatDetailRow(t('fuelingAdblueStatLabel', 'AdBlue'), adblueAvgConsVal),
      ]);
    }

    // 4. Havi mennyiség (l vagy kWh) – üzemanyag; AdBlue külön sorban
    var monthlyLiters = 0;
    monthLogs.forEach(function (l) {
      if (l.liters != null) monthlyLiters += l.liters;
    });
    var monthLitersVal = monthlyLiters > 0
      ? formatNum(monthlyLiters, 2) + ' ' + escHtml(quantityUnit)
      : '<span class="text-gray-400">0 ' + escHtml(quantityUnit) + '</span>';
    var monthLitersSub = escHtml(t('fuelingThisMonth', 'Ebben a hónapban'));
    if (showAdBlueStats) {
      var monthlyAdblue = 0;
      adblueMonthLogs.forEach(function (l) {
        if (l.liters != null) monthlyAdblue += l.liters;
      });
      monthLitersSub = appendAdBlueStatDetails(monthLitersSub, [
        buildStatDetailRow(
          t('fuelingAdblueStatLabel', 'AdBlue'),
          escHtml(formatNum(monthlyAdblue, 2) + ' ' + t('fuelingLUnit', 'l'))
        ),
      ]);
    }

    if (showAdBlueStats) {
      var adblueCostKeys = Object.keys(adblueCostByCurrency || {});
      var adblueCostVal = adblueCostKeys.length > 0
        ? buildMultiCurrencyValueHtml(adblueCostByCurrency, '')
        : escHtml(t('fuelingNoPriceData', t('fuelingNoPrice', 'Nincs ár adat')));
      monthlyCostSub = appendAdBlueStatDetails(monthlyCostSub, [
        buildStatDetailRow(t('fuelingAdblueStatLabel', 'AdBlue'), adblueCostVal),
      ]);

      var adblueAvgKeys = Object.keys(adblueAvgUnitByCurrency || {});
      var adblueAvgUnitVal = adblueAvgKeys.length > 0
        ? buildMultiCurrencyValueHtml(adblueAvgUnitByCurrency, '/l')
        : escHtml(t('fuelingNoPriceData', t('fuelingNoPrice', 'Nincs ár adat')));
      avgUnitPriceSub = appendAdBlueStatDetails(avgUnitPriceSub, [
        buildStatDetailRow(t('fuelingAdblueStatLabel', 'AdBlue'), adblueAvgUnitVal),
      ]);
    }

    var lastEntryLabel = (pageLabels && pageLabels.lastEntry)
      ? pageLabels.lastEntry
      : t('fuelingLastFueling', 'Utolsó tankolás');

    return '<div class="fueling-stat-grid">'
      + card('⛽', lastEntryLabel, lastFuelingVal, lastFuelingSub)
      + card('📊', t('fuelingLastConsumption', 'Utolsó fogyasztás'), lastConsVal, lastConsSub)
      + card('📈', t('fuelingAverageConsumption', 'Átlagfogyasztás'), avgConsVal, avgConsSub)
      + card('🗓️', monthlyQuantityTitle, monthLitersVal, monthLitersSub)
      + card('💰', t('fuelMonthlyCost', 'Havi összeg'), monthlyCostVal, monthlyCostSub)
      + card('🏷️', t('fuelingAverageUnitPrice', 'Átlagos egységár'), avgUnitPriceVal, avgUnitPriceSub)
      + '</div>';
  }

  function formatLocalizedMonthYear(yearMonth) {
    if (typeof window.formatLocalizedMonthYear === 'function') {
      return window.formatLocalizedMonthYear(yearMonth);
    }
    return String(yearMonth || '');
  }

  function getPrimaryQuantityUnitKey(vehicle) {
    var types = [];
    if (window.VehiclesService && window.VehiclesService.getVehicleEnergyTypes) {
      types = window.VehiclesService.getVehicleEnergyTypes(vehicle) || [];
    }
    if (!types.length) return 'liter';

    if (isVehicleChargingForm(vehicle)) return 'kwh';

    var hasCng = types.indexOf('cng') >= 0;
    var hasLng = types.indexOf('lng') >= 0;
    var hasDiesel = types.indexOf('diesel') >= 0;
    var hasHvo = types.indexOf('hvo') >= 0;
    var hasElectric = types.indexOf('electric') >= 0;

    var primaryFuelTypes = types.filter(function (type) {
      return type !== 'hybrid' && type !== 'adblue';
    });

    if (primaryFuelTypes.length === 1 && (primaryFuelTypes[0] === 'cng' || primaryFuelTypes[0] === 'lng')) {
      return 'kg';
    }

    if (hasDiesel || hasHvo) return 'liter';

    if (hasCng || hasLng) return 'kg';

    if (hasElectric) return 'kwh';

    return 'liter';
  }

  function buildQuantityMetaFromUnitKey(unitKey) {
    var key = String(unitKey || 'liter').toLowerCase();

    if (key === 'kwh') {
      return {
        unitKey: 'kwh',
        isCharging: true,
        quantityUnit: t('fuelingKwhUnit', 'kWh'),
        monthlyQuantityTitle: t('fuelingMonthlyKwh', t('fuelingMonthlyEnergy', 'Havi energia')),
        consumptionUnit: t('fuelingConsumptionKwhPer100', t('fuelingKwhPerHundredKm', 'kWh/100km')),
        unitPriceSuffix: '/kWh',
        quantityLabel: t('fuelingQuantityKwh', 'Töltött mennyiség (kWh)'),
        unitPriceLabel: t('fuelingUnitPricePerKwh', t('fuelingUnitPriceKwh', 'Egységár (/kWh)')),
        quantityPlaceholder: t('fuelingQuantityKwhPlaceholder', 'pl. 85,5'),
        unitPricePlaceholder: t('fuelingUnitPriceKwhPlaceholder', 'pl. 89,9'),
        quantityRequiredError: t('fuelingErrorQuantityKwhRequired', 'Add meg a töltött mennyiséget!'),
        showFullToggle: true,
        fullToggleLabelKey: 'fuelingFullCharge',
        fullOnlyInfoKey: 'fuelingFullChargeOnlyInfo',
        partialNotExactKey: 'fuelingPartialChargeNotExact',
      };
    }

    if (key === 'kg') {
      return {
        unitKey: 'kg',
        isCharging: false,
        quantityUnit: t('fuelingKgUnit', t('vehiclesUnitKg', 'kg')),
        monthlyQuantityTitle: t('fuelingMonthlyKg', 'Havi kg'),
        consumptionUnit: t('fuelingConsumptionKgPer100', 'kg/100km'),
        unitPriceSuffix: '/kg',
        quantityLabel: t('fuelingQuantityKg', 'Tankolt mennyiség (kg)'),
        unitPriceLabel: t('fuelingUnitPricePerKg', 'Egységár (/kg)'),
        quantityPlaceholder: t('fuelingQuantityKgPlaceholder', 'pl. 45,5'),
        unitPricePlaceholder: t('fuelingUnitPriceKgPlaceholder', t('fuelingUnitPricePlaceholder', 'pl. 619,9')),
        quantityRequiredError: t('fuelingErrorQuantityKgRequired', 'Add meg a tankolt mennyiséget!'),
        showFullToggle: true,
        fullToggleLabelKey: 'fuelingFullTank',
        fullOnlyInfoKey: 'fuelingFullTankOnlyInfo',
        partialNotExactKey: 'fuelingEstimated',
      };
    }

    return {
      unitKey: 'liter',
      isCharging: false,
      quantityUnit: t('fuelingLUnit', 'l'),
      monthlyQuantityTitle: t('fuelingMonthlyLiters', 'Havi liter'),
      consumptionUnit: t('fuelingConsumptionLiterPer100', t('fuelingLPerHundredKm', 'l/100km')),
      unitPriceSuffix: '/l',
      quantityLabel: t('fuelingQuantityLiter', t('fuelingLiters', 'Tankolt mennyiség (l)')),
      unitPriceLabel: t('fuelingUnitPricePerLiter', t('fuelingUnitPrice', 'Egységár (/l)')),
      quantityPlaceholder: t('fuelingLitersPlaceholder', 'pl. 45,50'),
      unitPricePlaceholder: t('fuelingUnitPricePlaceholder', 'pl. 619,9'),
      quantityRequiredError: t('fuelingErrorLitersRequired', 'Add meg a tankolt mennyiséget!'),
      showFullToggle: true,
      fullToggleLabelKey: 'fuelingFullTank',
      fullOnlyInfoKey: 'fuelingFullTankOnlyInfo',
      partialNotExactKey: 'fuelingEstimated',
    };
  }

  function getVehicleQuantityMeta(vehicle) {
    return buildQuantityMetaFromUnitKey(getPrimaryQuantityUnitKey(vehicle));
  }

  function getLogQuantityMeta(log, vehicle) {
    if (isAdBlueLog(log)) {
      var adblueMeta = buildQuantityMetaFromUnitKey('liter');
      adblueMeta.isAdBlue = true;
      adblueMeta.fullToggleLabelKey = 'fuelingFullAdblue';
      adblueMeta.fullOnlyInfoKey = 'fuelingFullAdblueOnlyInfo';
      return adblueMeta;
    }
    if (log && log.quantityUnit) {
      var stored = String(log.quantityUnit).toLowerCase();
      if (stored === 'liter' || stored === 'kg' || stored === 'kwh') {
        return buildQuantityMetaFromUnitKey(stored);
      }
    }
    return getVehicleQuantityMeta(vehicle);
  }

  function buildStatDetailRow(label, valueHtml) {
    return '<div class="fueling-stat-detail-row">'
      + '<span class="fueling-stat-detail-row__label">' + escHtml(label) + ':</span> '
      + '<span class="fueling-stat-detail-row__value">' + valueHtml + '</span>'
      + '</div>';
  }

  function appendAdBlueStatDetails(subHtml, rows) {
    if (!rows || !rows.length) return subHtml || '';
    var details = '<div class="fueling-stat-details mt-2">' + rows.join('') + '</div>';
    return (subHtml || '') + details;
  }

  function formatQuantityDisplay(quantity, unit, decimals) {
    var dec = decimals != null ? decimals : (quantity >= 100 ? 0 : quantity > 0 ? 1 : 0);
    if (!quantity || quantity <= 0) return '0 ' + unit;
    return formatNum(quantity, dec) + ' ' + unit;
  }

  function formatCostSummaryHtml(costByCurrency) {
    var keys = Object.keys(costByCurrency || {});
    if (!keys.length) {
      return escHtml(t('fuelingNoPriceData', 'Nincs ár adat'));
    }
    keys.sort();
    return keys.map(function (cur) {
      return escHtml(formatAmountDisplay(costByCurrency[cur], cur) + ' ' + cur);
    }).join('<br>');
  }

  function formatConsumptionSummaryText(avgConsumption, meta) {
    if (avgConsumption == null || !isFinite(avgConsumption)) {
      return escHtml(t('fuelingNotEnoughData', 'Nincs elég adat'));
    }
    return escHtml(formatNum(avgConsumption, 1) + ' ' + meta.consumptionUnit);
  }

  function formatSingleFuelCostLine(cur, per100, perKm, includeLabel) {
    if (per100 == null || !isFinite(per100) || per100 <= 0) return '';
    var prefix = includeLabel !== false
      ? escHtml(t('fuelingCostLabel', 'Költség')) + ': '
      : '';
    var line = prefix
      + escHtml(formatAmountDisplay(per100, cur) + ' ' + cur + ' ' + t('fuelingPer100Km', '/ 100 km'));
    if (perKm != null && isFinite(perKm) && perKm > 0) {
      line += ' <span class="text-xs opacity-80">('
        + escHtml(formatAmountDisplay(perKm, cur) + ' ' + cur + ' ' + t('fuelingPerKm', '/ km'))
        + ')</span>';
    }
    return line;
  }

  function formatFuelCostPerDistanceHtml(costPer100KmByCurrency, costPerKmByCurrency) {
    if (!costPer100KmByCurrency || typeof costPer100KmByCurrency !== 'object') return '';
    var keys = Object.keys(costPer100KmByCurrency);
    if (!keys.length) return '';

    keys.sort();
    return keys.map(function (cur) {
      return formatSingleFuelCostLine(cur, costPer100KmByCurrency[cur], costPerKmByCurrency && costPerKmByCurrency[cur], true);
    }).filter(Boolean).join('<br>');
  }

  function formatFuelCostBadgesHtml(costPer100KmByCurrency, costPerKmByCurrency) {
    if (!costPer100KmByCurrency || typeof costPer100KmByCurrency !== 'object') return '';
    var keys = Object.keys(costPer100KmByCurrency);
    if (!keys.length) return '';

    keys.sort();
    var lines = keys.map(function (cur) {
      var line = formatSingleFuelCostLine(cur, costPer100KmByCurrency[cur], costPerKmByCurrency && costPerKmByCurrency[cur], true);
      if (!line) return '';
      return '<div class="fueling-log-cost-line">💰 ' + line + '</div>';
    }).filter(Boolean);
    if (!lines.length) return '';
    return '<div class="fueling-log-cost">' + lines.join('') + '</div>';
  }

  function appendFuelCostSubHtml(subHtml, costPer100KmByCurrency, costPerKmByCurrency) {
    var costHtml = formatFuelCostPerDistanceHtml(costPer100KmByCurrency, costPerKmByCurrency);
    if (!costHtml) return subHtml || '';
    if (!subHtml) return costHtml;
    return subHtml + '<br>' + costHtml;
  }

  function hasFuelingPreviousMonthsProAccess() {
    if (typeof window.getProEntitlement === 'function') {
      var sub = typeof window.currentUserSubscription !== 'undefined' ? window.currentUserSubscription : {};
      return window.getProEntitlement(sub).hasProFeatureAccess === true;
    }
    if (typeof window.getEffectiveSubscriptionTier === 'function') {
      var tier = window.getEffectiveSubscriptionTier();
      return tier === 'pro' || tier === 'tester';
    }
    return false;
  }

  function buildPreviousMonthsProUpsellHtml() {
    return ''
      + '<div class="fueling-prev-months-pro">'
      + '  <div class="fueling-prev-months-pro__header">'
      + '    <span class="fueling-prev-months-pro__lock" aria-hidden="true">🔒</span>'
      + '    <span class="fueling-prev-months-pro__badge">' + escHtml(t('fuelingPreviousMonthsProBadge', 'Pro')) + '</span>'
      + '  </div>'
      + '  <h3 class="fueling-prev-months-pro__title">' + escHtml(t('fuelingPreviousMonthsProTitle', 'Korábbi hónapok statisztikái')) + '</h3>'
      + '  <p class="fueling-prev-months-pro__text">' + escHtml(t('fuelingPreviousMonthsProText', 'A korábbi havi tankolási és töltési összesítések Pro csomaggal érhetők el. Az aktuális hónap adatait továbbra is használhatod Free csomagban is.')) + '</p>'
      + '  <button type="button" id="fueling-prev-months-pro-btn" class="fueling-prev-months-pro__btn">'
      + escHtml(t('fuelingPreviousMonthsProButton', 'Pro csomag megtekintése'))
      + '  </button>'
      + '</div>';
  }

  /** Előfizetés oldal megnyitása – kizárólag navigáció, fizetés/checkout/IAP nélkül. */
  function navigateToSubscriptionPage() {
    if (typeof window.showTab === 'function') {
      window.showTab('subscription');
    }
  }

  function bindPreviousMonthsProButton() {
    var btn = document.getElementById('fueling-prev-months-pro-btn');
    if (!btn || btn.getAttribute('data-bound') === '1') return;
    btn.setAttribute('data-bound', '1');
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      navigateToSubscriptionPage();
    });
  }

  function buildPreviousMonthsPanelShell(hasProAccess) {
    var pres = (typeof window.getEntitlementPresentationState === 'function')
      ? window.getEntitlementPresentationState()
      : 'free';
    var bodyContent;
    if (pres === 'unknown' || pres === 'offline') {
      bodyContent = '<p class="text-sm text-gray-500 dark:text-gray-400">' + escHtml(t('proFeatureStatusLoading', 'Betöltés...')) + '</p>';
    } else if (hasProAccess) {
      bodyContent = '<p class="text-sm text-gray-500 dark:text-gray-400">' + escHtml(t('fuelingShowPreviousMonths', 'Nyisd ki a korábbi hónapok megtekintéséhez.')) + '</p>';
    } else {
      bodyContent = buildPreviousMonthsProUpsellHtml();
    }

    return ''
      + '<details id="fueling-previous-months" class="fueling-prev-months border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden">'
      + '  <summary class="px-3 py-2.5 cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-200 select-none">'
      + escHtml(t('fuelingPreviousMonths', 'Korábbi hónapok'))
      + '  </summary>'
      + '  <div id="fueling-previous-months-body" class="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700">'
      + bodyContent
      + '  </div>'
      + '</details>';
  }

  function buildCompactMonthStatsHtml(item, meta, showAdBlue) {
    var s = item.summary;
    var qtyVal = s.quantity > 0
      ? escHtml(formatQuantityDisplay(s.quantity, meta.quantityUnit, 2))
      : '<span class="text-gray-400">' + escHtml('0 ' + meta.quantityUnit) + '</span>';
    var costVal = formatCostSummaryHtml(s.costByCurrency);
    var avgUnitVal = Object.keys(s.avgUnitByCurrency || {}).length
      ? buildMultiCurrencyValueHtml(s.avgUnitByCurrency, meta.unitPriceSuffix)
      : escHtml(t('fuelingNoPriceData', 'Nincs ár adat'));
    var consVal = formatConsumptionSummaryText(s.avgConsumption, meta);
    var fuelCostVal = s.avgFuelCost
      ? formatFuelCostPerDistanceHtml(s.avgFuelCost.costPer100KmByCurrency, s.avgFuelCost.costPerKmByCurrency)
      : '';

    function row(label, valueHtml) {
      return ''
        + '<div class="fueling-stat-row">'
        + '  <span class="fueling-stat-row__label">' + escHtml(label) + '</span>'
        + '  <span class="fueling-stat-row__value">' + valueHtml + '</span>'
        + '</div>';
    }

    var adblueRows = '';
    if (showAdBlue) {
      var adblueQty = s.adblueQuantity > 0
        ? escHtml(formatQuantityDisplay(s.adblueQuantity, t('fuelingLUnit', 'l'), 2))
        : '<span class="text-gray-400">0 ' + escHtml(t('fuelingLUnit', 'l')) + '</span>';
      var adblueCost = formatCostSummaryHtml(s.adblueCostByCurrency || {});
      var adblueAvgUnit = Object.keys(s.adblueAvgUnitByCurrency || {}).length
        ? buildMultiCurrencyValueHtml(s.adblueAvgUnitByCurrency, '/l')
        : escHtml(t('fuelingNoPriceData', 'Nincs ár adat'));
      var adblueCons = (s.adblueAvgConsumption != null)
        ? escHtml(formatNum(s.adblueAvgConsumption, 1) + ' ' + t('fuelingConsumptionLiterPer100', 'l/100km'))
        : escHtml(t('fuelingNotEnoughData', 'Nincs elég adat'));
      adblueRows = ''
        + row(t('fuelingAdblueMonthlyLiters', 'AdBlue havi liter'), adblueQty)
        + row(t('fuelingAdblueMonthlyCost', 'AdBlue havi összeg'), adblueCost)
        + row(t('fuelingAdblueAverageUnitPrice', 'AdBlue átlagos egységár'), adblueAvgUnit)
        + row(t('fuelingAdblueAverageConsumption', 'AdBlue átlagfogyasztás'), adblueCons);
    }

    return ''
      + '<div class="fueling-stat-compact mt-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/30">'
      + '  <p class="fueling-stat-compact__heading">' + escHtml(t('fuelingMonthSummary', 'Havi összesítés')) + '</p>'
      + row(meta.monthlyQuantityTitle, qtyVal)
      + row(t('fuelMonthlyCost', 'Havi összeg'), costVal)
      + row(t('fuelingAverageUnitPrice', 'Átlagos egységár'), avgUnitVal)
      + row(t('fuelingAverageConsumption', 'Átlagfogyasztás'), consVal)
      + (fuelCostVal ? row(t('fuelingCostLabel', 'Költség'), fuelCostVal) : '')
      + adblueRows
      + '</div>';
  }

  function buildPreviousMonthItemHtml(item, meta, showAdBlue) {
    var s = item.summary;
    var monthLabel = formatLocalizedMonthYear(item.monthKey);
    var qtyLine = escHtml(formatQuantityDisplay(s.quantity, meta.quantityUnit, s.quantity >= 100 ? 0 : 1));
    var costLine = formatCostSummaryHtml(s.costByCurrency);
    var consLine = formatConsumptionSummaryText(s.avgConsumption, meta);
    var fuelCostLine = s.avgFuelCost
      ? formatFuelCostPerDistanceHtml(s.avgFuelCost.costPer100KmByCurrency, s.avgFuelCost.costPerKmByCurrency)
      : '';
    var adblueSummaryLine = '';
    if (showAdBlue && s.adblueQuantity > 0) {
      adblueSummaryLine = '      <div>' + escHtml(t('fuelingAdblueStatLabel', 'AdBlue') + ': '
        + formatQuantityDisplay(s.adblueQuantity, t('fuelingLUnit', 'l'), s.adblueQuantity >= 100 ? 0 : 1)) + '</div>';
    }

    return ''
      + '<details class="fueling-prev-month-item mb-2 last:mb-0 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-900/20">'
      + '  <summary class="px-3 py-2.5 cursor-pointer select-none">'
      + '    <div class="text-sm font-medium text-gray-900 dark:text-gray-100">' + escHtml(monthLabel) + '</div>'
      + '    <div class="mt-1.5 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">'
      + '      <div>' + qtyLine + '</div>'
      + '      <div>' + costLine + '</div>'
      + '      <div>' + consLine + '</div>'
      + (fuelCostLine ? '      <div>' + fuelCostLine + '</div>' : '')
      + adblueSummaryLine
      + '    </div>'
      + '  </summary>'
      + '  <div class="px-3 pb-3">' + buildCompactMonthStatsHtml(item, meta, showAdBlue) + '</div>'
      + '</details>';
  }

  function renderPreviousMonthsBodyHtml(items, vehicle) {
    if (!items || !items.length) {
      return '<p class="text-sm text-gray-500 dark:text-gray-400">' + escHtml(t('fuelingNoPreviousMonths', 'Nincs korábbi havi adat.')) + '</p>';
    }
    var meta = getVehicleQuantityMeta(vehicle);
    var showAdBlue = vehicleHasAdBlue(vehicle);
    return '<div class="space-y-2">' + items.map(function (item) {
      return buildPreviousMonthItemHtml(item, meta, showAdBlue);
    }).join('') + '</div>';
  }

  function resetPreviousMonthsCache() {
    uiState.previousMonthsCache = null;
    uiState.previousMonthsLoading = false;
    if (window.FuelingService && window.FuelingService.resetHistoryCache) {
      window.FuelingService.resetHistoryCache();
    }
  }

  async function loadPreviousMonthsPanel(vehicleId, activeVehicles) {
    if (!hasFuelingPreviousMonthsProAccess()) return;

    var body = document.getElementById('fueling-previous-months-body');
    if (!body || !vehicleId) return;

    if (uiState.previousMonthsCache && uiState.previousMonthsCache.vehicleId === vehicleId) {
      body.innerHTML = renderPreviousMonthsBodyHtml(
        uiState.previousMonthsCache.items,
        getVehicleById(activeVehicles, vehicleId)
      );
      return;
    }

    if (uiState.previousMonthsLoading) return;
    uiState.previousMonthsLoading = true;
    body.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">' + escHtml(t('fuelingLoadingPreviousMonths', 'Korábbi hónapok betöltése...')) + '</p>';

    try {
      var logs = window.FuelingService.loadVehicleFuelLogsHistory
        ? await window.FuelingService.loadVehicleFuelLogsHistory(vehicleId, false)
        : [];
      var vehicle = getVehicleById(activeVehicles, vehicleId);
      var isElectric = isVehicleChargingForm(vehicle);
      var items = window.FuelingService.buildPreviousMonthsSummaries
        ? window.FuelingService.buildPreviousMonthsSummaries(logs, isElectric, 12)
        : [];
      uiState.previousMonthsCache = { vehicleId: vehicleId, items: items };
      body.innerHTML = renderPreviousMonthsBodyHtml(items, vehicle);
    } catch (_) {
      body.innerHTML = '<p class="text-sm text-red-600 dark:text-red-400">' + escHtml(t('fuelingErrorLoadFailed', 'Nem sikerült betölteni a tankolási adatokat.')) + '</p>';
    } finally {
      uiState.previousMonthsLoading = false;
    }
  }

  function bindPreviousMonthsPanel(activeVehicles, filterVehicleId, hasProAccess) {
    var details = document.getElementById('fueling-previous-months');
    if (!details || !filterVehicleId) return;

    if (!hasProAccess) {
      bindPreviousMonthsProButton();
      return;
    }

    details.addEventListener('toggle', function () {
      if (details.open) {
        loadPreviousMonthsPanel(filterVehicleId, activeVehicles);
      }
    });
  }

  // =====================================================
  // === LISTA NÉZET =====================================
  // =====================================================

  function buildLogCardHtml(log, vehicleLogs, vehicle) {
    var meta = getLogQuantityMeta(log, vehicle);
    var scopedLogs = isAdBlueLog(log)
      ? (window.FuelingService.filterAdBlueLogs ? window.FuelingService.filterAdBlueLogs(vehicleLogs) : vehicleLogs)
      : (window.FuelingService.filterPrimaryFuelLogs ? window.FuelingService.filterPrimaryFuelLogs(vehicleLogs) : vehicleLogs);
    var consumptionHtml = '';
    var costHtml = '';
    if (window.FuelingService && window.FuelingService.calcFullToFullConsumption) {
      if (!log.fullTank) {
        consumptionHtml = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">'
          + escHtml(meta.isCharging ? t(meta.partialNotExactKey, 'Nem pontos részleges töltés miatt') : t('fuelingEstimated', 'Nem pontos'))
          + '</span>';
      } else {
        var cycle = window.FuelingService.calcFullToFullConsumption(log, scopedLogs);
        if (cycle.notCalculable) {
          consumptionHtml = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">'
            + escHtml(t('fuelingNotCalculable', 'Nem számolható'))
            + '</span>';
        } else if (cycle.notAccurate || cycle.consumption == null) {
          consumptionHtml = '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">'
            + escHtml(meta.isCharging ? t(meta.partialNotExactKey, 'Nem pontos részleges töltés miatt') : t('fuelingEstimated', 'Nem pontos'))
            + '</span>';
        } else {
          consumptionHtml = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700">'
            + '📊 ' + formatNum(cycle.consumption, 2) + ' ' + meta.consumptionUnit
            + '</span>';
          costHtml = formatFuelCostBadgesHtml(
            cycle.costPer100KmByCurrency,
            cycle.costPerKmByCurrency
          );
        }
      }
    }

    var fullTankBadge = log.fullTank
      ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">' + (meta.isCharging ? '⚡ ' : '⛽ ') + escHtml(t(meta.fullToggleLabelKey, meta.isCharging ? 'Tele töltés' : 'Tele tankolás')) + '</span>'
      : '';
    var adblueBadge = isAdBlueLog(log)
      ? '<span class="fueling-adblue-badge">'
        + escHtml(t('fuelingEnergyTypeAdblue', 'AdBlue'))
        + '</span>'
      : '';

    var cur = resolveCurrency(log);
    var priceLine = '';
    if (log.liters != null || log.totalAmount != null) {
      var priceParts = [];
      if (log.liters != null) priceParts.push(formatNum(log.liters, 2) + ' ' + meta.quantityUnit);
      if (log.totalAmount != null) priceParts.push(formatAmountDisplay(log.totalAmount, cur) + ' ' + cur);
      priceLine = priceParts.join(' · ');
    }
    var unitPriceLine = '';
    if (log.unitPrice != null) {
      unitPriceLine = formatUnitPriceDisplay(log.unitPrice, cur) + ' ' + cur + meta.unitPriceSuffix;
    }

    var cardClass = isAdBlueLog(log)
      ? 'fueling-log-card fueling-log-card--adblue rounded-xl shadow-sm'
      : 'fueling-log-card fueling-log-card--fuel rounded-xl shadow-sm';
    return '<div class="' + cardClass + '" data-fuel-log-id="' + escHtml(log.id) + '">'
      + '<div class="fueling-log-card__head flex items-start justify-between gap-2">'
      + '  <div class="min-w-0">'
      + '    <div class="text-base font-bold text-gray-900 dark:text-gray-100">' + escHtml(log.vehiclePlate || '—') + '</div>'
      + '    <div class="text-sm text-gray-500 dark:text-gray-400">' + escHtml(formatDisplayDate(log.date)) + (log.time ? ' ' + escHtml(log.time) : '') + '</div>'
      + '  </div>'
      + '  <div class="text-right shrink-0">'
      + '    <div class="text-lg font-bold text-blue-700 dark:text-blue-300">' + (log.liters != null ? formatNum(log.liters, 2) + ' ' + meta.quantityUnit : '—') + '</div>'
      + (log.odometerKm != null ? '    <div class="text-xs text-gray-500 dark:text-gray-400">' + Math.round(log.odometerKm) + ' km</div>' : '')
      + '  </div>'
      + '</div>'
      + (priceLine ? '<div class="fueling-log-card__price text-sm text-gray-700 dark:text-gray-300">' + escHtml(priceLine) + '</div>' : '')
      + (unitPriceLine ? '<div class="fueling-log-card__unit text-xs text-gray-500 dark:text-gray-400">' + escHtml(unitPriceLine) + '</div>' : '')
      + (log.note ? '<div class="fueling-log-card__note text-xs text-gray-500 dark:text-gray-400 italic">' + escHtml(log.note) + '</div>' : '')
      + '<div class="fueling-log-badges flex flex-wrap items-center gap-1.5">' + adblueBadge + fullTankBadge + consumptionHtml + '</div>'
      + (costHtml ? costHtml : '')
      + '<div class="fueling-log-card__actions grid grid-cols-2 gap-2">'
      + '  <button type="button" class="fueling-action-edit w-full py-2 px-3 rounded-lg border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 text-sm font-semibold" data-id="' + escHtml(log.id) + '">' + escHtml(t('fuelingEdit', 'Szerkesztés')) + '</button>'
      + '  <button type="button" class="fueling-action-delete w-full py-2 px-3 rounded-lg border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 text-sm font-semibold" data-id="' + escHtml(log.id) + '">' + escHtml(t('fuelingDelete', 'Törlés')) + '</button>'
      + '</div>'
      + '</div>';
  }

  function renderListView(logs, activeVehicles) {
    var root = getRootEl();
    if (!root) return;

    var hasActiveVehicles = activeVehicles && activeVehicles.length > 0;
    var filterId = hasActiveVehicles ? ensureVehicleFilter(activeVehicles, logs) : '';
    var filteredLogs = filterId
      ? window.FuelingService.getLogsForVehicle(logs, filterId)
      : [];

    var filterHtml = buildVehicleFilterHtml(activeVehicles, filterId);
    var pageLabels = getFuelingPageLabels(activeVehicles);

    var statsHtml = hasActiveVehicles && filterId
      ? '<div class="fueling-stats-wrap">' + buildStatsHtml(logs, filterId, pageLabels, activeVehicles) + '</div>'
      : '';

    var hasProAccess = hasFuelingPreviousMonthsProAccess();

    var previousMonthsHtml = hasActiveVehicles && filterId
      ? buildPreviousMonthsPanelShell(hasProAccess)
      : '';

    // Lista
    var listHtml = '';
    if (!hasActiveVehicles && logs.length === 0) {
      listHtml = '<div class="p-6 text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">'
        + '<div class="text-4xl mb-3">🚛</div>'
        + '<p class="text-gray-700 dark:text-gray-200 font-medium mb-1">' + escHtml(t('fuelingNoActiveVehiclesTitle', 'Nincs aktív jármű')) + '</p>'
        + '<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">' + escHtml(t('fuelingNoActiveVehiclesText', 'Tankolás rögzítéséhez először adj hozzá egy aktív járművet.')) + '</p>'
        + '<button type="button" id="fueling-open-vehicles-btn" class="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">' + escHtml(t('fuelingOpenVehicles', 'Járművek megnyitása')) + '</button>'
        + '</div>';
    } else if (filteredLogs.length === 0) {
      listHtml = '<div class="p-6 text-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">'
        + '<div class="text-4xl mb-3">⛽</div>'
        + '<p class="text-gray-700 dark:text-gray-200 font-medium mb-1">' + escHtml(pageLabels.emptyTitle) + '</p>'
        + '<p class="text-sm text-gray-500 dark:text-gray-400 mb-4">' + escHtml(pageLabels.emptyText) + '</p>'
        + '<button type="button" id="fueling-add-first-btn" class="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">' + escHtml(pageLabels.addFirst) + '</button>'
        + '</div>';
    } else {
      var cards = [];
      for (var i = 0; i < filteredLogs.length; i++) {
        var log = filteredLogs[i];
        cards.push(buildLogCardHtml(log, filteredLogs, getVehicleById(activeVehicles, log.vehicleId)));
      }
      listHtml = '<div class="fueling-list space-y-2" id="fueling-list">' + cards.join('') + '</div>';
    }

    var pendingFuelHint = '';
    if (typeof navigator !== 'undefined' && !navigator.onLine && logs.some(function (l) { return l.syncStatus === 'pending' || l.createdOffline === true; })) {
      pendingFuelHint = '<p class="fueling-pending-hint text-xs text-amber-700 dark:text-amber-300">' + escHtml(t('fuelCalculationIncludesPending', 'A számítás még nem szinkronizált tankolási adatot is tartalmazhat.')) + '</p>';
    }
    var offlineNotice = (typeof window.buildModuleNoticeHtml === 'function') ? window.buildModuleNoticeHtml('fueling') : '';
    var filterVehicle = getVehicleById(activeVehicles, filterId);
    var showAdBlueBtn = hasActiveVehicles && vehicleHasAdBlue(filterVehicle);

    root.innerHTML = ''
      + '<div class="fueling-page">'
      + offlineNotice
      + pendingFuelHint
      + '  <div class="fueling-page__title">'
      + '    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">' + escHtml(pageLabels.title) + '</h2>'
      + '    <p class="text-sm text-gray-600 dark:text-gray-400">' + escHtml(pageLabels.subtitle) + '</p>'
      + '  </div>'
      + (hasActiveVehicles ? '  <div class="fueling-page__actions space-y-2">'
      + '  <button type="button" id="fueling-new-btn" class="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm">'
      + '    + ' + escHtml(pageLabels.newEntry)
      + '  </button>'
      + (showAdBlueBtn
        ? '  <button type="button" id="fueling-new-adblue-btn" class="fueling-adblue-btn w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-sm">'
          + '    + ' + escHtml(t('fuelingNewEntryAdblue', 'AdBlue tankolás'))
          + '  </button>'
        : '')
      + '  </div>' : '')
      + filterHtml
      + statsHtml
      + previousMonthsHtml
      + listHtml
      + '</div>';

    bindListEvents(activeVehicles, filterId);
  }

  function bindListEvents(activeVehicles, filterVehicleId) {
    var newBtn = document.getElementById('fueling-new-btn');
    if (newBtn) {
      newBtn.addEventListener('click', function () {
        uiState.mode = 'form';
        uiState.editingId = null;
        uiState.formEnergyType = null;
        uiState.currencyManuallyChanged = false;
        renderFormView(null, activeVehicles);
      });
    }

    var newAdblueBtn = document.getElementById('fueling-new-adblue-btn');
    if (newAdblueBtn) {
      newAdblueBtn.addEventListener('click', function () {
        uiState.mode = 'form';
        uiState.editingId = null;
        uiState.formEnergyType = 'adblue';
        uiState.currencyManuallyChanged = false;
        renderFormView(null, activeVehicles);
      });
    }

    var addFirstBtn = document.getElementById('fueling-add-first-btn');
    if (addFirstBtn) {
      addFirstBtn.addEventListener('click', function () {
        uiState.mode = 'form';
        uiState.editingId = null;
        uiState.formEnergyType = null;
        uiState.currencyManuallyChanged = false;
        renderFormView(null, activeVehicles);
      });
    }

    var openVehiclesBtn = document.getElementById('fueling-open-vehicles-btn');
    if (openVehiclesBtn) {
      openVehiclesBtn.addEventListener('click', function () {
        if (typeof window.showTab === 'function') window.showTab('vehicles');
      });
    }

    var filterSel = document.getElementById('fueling-vehicle-filter');
    if (filterSel) {
      filterSel.addEventListener('change', function () {
        resetPreviousMonthsCache();
        uiState.vehicleFilter = filterSel.value;
        renderFuelingTab(false);
      });
    }

    bindPreviousMonthsPanel(activeVehicles, filterVehicleId, hasFuelingPreviousMonthsProAccess());

    document.querySelectorAll('.fueling-action-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var cached = window.FuelingService.getCachedLogs();
        var log = (cached || []).find(function (l) { return l.id === id; });
        if (log) {
          uiState.mode = 'form';
          uiState.editingId = id;
          uiState.formEnergyType = isAdBlueLog(log) ? 'adblue' : null;
          renderFormView(log, activeVehicles);
        }
      });
    });

    document.querySelectorAll('.fueling-action-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        handleDelete(id);
      });
    });
  }

  // =====================================================
  // === FORM NÉZET ======================================
  // =====================================================

  function buildVehicleOptions(activeVehicles, selectedId) {
    var opts = '<option value="">' + escHtml(t('fuelingSelectVehicle', 'Válassz járművet...')) + '</option>';
    (activeVehicles || []).forEach(function (v) {
      opts += '<option value="' + escHtml(v.id) + '" data-plate="' + escHtml(v.plateNumber) + '"'
        + (v.id === selectedId ? ' selected' : '')
        + '>' + escHtml(v.plateNumber) + '</option>';
    });
    return opts;
  }

  function renderFormView(log, activeVehicles) {
    var root = getRootEl();
    if (!root) return;

    var isEdit = !!(log && log.id);
    if (isEdit) {
      uiState.formEnergyType = isAdBlueLog(log) ? 'adblue' : null;
    }
    var today = getTodayStr();
    var nowTime = getNowTimeStr();
    var formVehicles = isAdBlueFormMode()
      ? filterAdBlueCapableVehicles(activeVehicles)
      : (activeVehicles || []);

    var selVehicleId = getFormDefaultVehicleId(formVehicles.length ? formVehicles : activeVehicles, log, isEdit);
    if (isAdBlueFormMode() && selVehicleId && !getVehicleById(formVehicles, selVehicleId)) {
      selVehicleId = formVehicles.length ? formVehicles[0].id : '';
    }
    var selDate = isEdit ? (log.date || today) : today;
    var selTime = isEdit ? (log.time || nowTime) : nowTime;
    var selOdometer = isEdit && log.odometerKm != null ? String(log.odometerKm) : '';
    var selLiters = isEdit && log.liters != null ? formatNum(log.liters, 2) : '';
    var selUnitPrice = isEdit && log.unitPrice != null ? formatNum(log.unitPrice, 3) : '';
    var selTotalAmount = isEdit && log.totalAmount != null ? formatNum(log.totalAmount, 2) : '';
    var selFullTank = isEdit ? log.fullTank !== false : true;
    var selNote = isEdit ? (log.note || '') : '';
    var selCurrency = suggestFormCurrency(selVehicleId, log, isEdit);

    uiState.lastPriceField = null;
    uiState.currencyManuallyChanged = isEdit;

    var hasVehicles = formVehicles && formVehicles.length > 0;

    var pageLabels = getFuelingPageLabels(activeVehicles);
    var selVehicle = getVehicleById(activeVehicles, selVehicleId);
    var formLabels = getFuelingFormLabels(selVehicle);
    var formTitle = isAdBlueFormMode()
      ? (isEdit
        ? t('fuelingEditEntryAdblue', 'AdBlue tankolás szerkesztése')
        : t('fuelingNewEntryAdblue', 'AdBlue tankolás'))
      : (isEdit ? pageLabels.editEntry : pageLabels.newEntry);

    var noVehicleHtml = !hasVehicles
      ? '<div class="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-200 mb-4">'
        + escHtml(isAdBlueFormMode()
          ? t('fuelingNoAdblueVehiclesText', 'Nincs AdBlue-val rendelkező aktív jármű. Jelöld be az AdBlue-t a Járművek modulban.')
          : t('fuelingNoActiveVehiclesText', 'Nincs aktív jármű. Először adj hozzá egyet a Járművek modulban.'))
        + ' <button type="button" class="underline font-semibold" onclick="typeof window.showTab===\'function\'&&window.showTab(\'vehicles\')">'
        + escHtml(t('fuelingOpenVehicles', 'Járművek megnyitása')) + '</button></div>'
      : '';

    root.innerHTML = ''
      + '<div class="space-y-4">'
      + '  <div>'
      + '    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">'
      + escHtml(formTitle)
      + '    </h2>'
      + '  </div>'
      + noVehicleHtml
      + '  <form id="fueling-form" class="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">'

      // Jármű
      + '    <div>'
      + '      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="fueling-vehicle">' + escHtml(t('fuelingVehicle', 'Jármű')) + ' <span class="text-red-500">*</span></label>'
      + '      <select id="fueling-vehicle" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">'
      + buildVehicleOptions(formVehicles, selVehicleId)
      + '      </select>'
      + '    </div>'

      // Dátum + Idő
      + '    <div class="grid grid-cols-2 gap-3">'
      + '      <div>'
      + '        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="fueling-date">' + escHtml(t('fuelingDate', 'Dátum')) + ' <span class="text-red-500">*</span></label>'
      + '        <input id="fueling-date" type="date" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value="' + escHtml(selDate) + '" />'
      + '      </div>'
      + '      <div>'
      + '        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="fueling-time">' + escHtml(t('fuelingTime', 'Idő')) + ' <span class="text-red-500">*</span></label>'
      + '        <input id="fueling-time" type="time" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value="' + escHtml(selTime) + '" />'
      + '      </div>'
      + '    </div>'

      // Km óra állás
      + '    <div>'
      + '      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="fueling-odometer">' + escHtml(t('fuelingOdometerKm', 'Km óra állás')) + ' <span class="text-red-500">*</span></label>'
      + '      <input id="fueling-odometer" type="number" min="0" step="1" inputmode="numeric" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="pl. 125000" value="' + escHtml(selOdometer) + '" />'
      + '      <div id="fueling-odometer-warning" class="hidden mt-1 text-sm text-amber-600 dark:text-amber-400"></div>'
      + '    </div>'

      // Áradat rész
      + '    <div class="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">'
      + '      <p id="fueling-price-section-label" class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">' + escHtml(formLabels.priceSection) + '</p>'

      // Mennyiség (l vagy kWh – UI szerint)
      + '      <div>'
      + '        <label id="fueling-liters-label" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="fueling-liters">' + escHtml(formLabels.quantityLabel) + ' <span class="text-red-500">*</span></label>'
      + '        <input id="fueling-liters" type="text" inputmode="decimal" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="' + escHtml(formLabels.quantityPlaceholder) + '" value="' + escHtml(selLiters) + '" />'
      + '        <div id="fueling-liters-hint" class="hidden mt-1 text-xs text-indigo-600 dark:text-indigo-400"></div>'
      + '      </div>'

      // Egységár
      + '      <div>'
      + '        <label id="fueling-unit-price-label" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="fueling-unit-price">'
      + escHtml(formLabels.unitPriceLabel)
      + '        <span class="text-gray-400 font-normal"> ' + escHtml(t('fuelingOptional', '(opcionális)')) + '</span></label>'
      + '        <input id="fueling-unit-price" type="text" inputmode="decimal" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="' + escHtml(formLabels.unitPricePlaceholder) + '" value="' + escHtml(selUnitPrice) + '" />'
      + '        <div id="fueling-unit-price-hint" class="hidden mt-1 text-xs text-indigo-600 dark:text-indigo-400"></div>'
      + '      </div>'

      // Teljes összeg
      + '      <div>'
      + '        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="fueling-total">'
      + escHtml(t('fuelingTotalAmount', 'Teljes összeg'))
      + '        <span class="text-gray-400 font-normal"> ' + escHtml(t('fuelingOptional', '(opcionális)')) + '</span></label>'
      + '        <input id="fueling-total" type="text" inputmode="decimal" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="pl. 28200" value="' + escHtml(selTotalAmount) + '" />'
      + '        <div id="fueling-total-hint" class="hidden mt-1 text-xs text-indigo-600 dark:text-indigo-400"></div>'
      + '      </div>'

      // Pénznem
      + '      <div>'
      + '        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="fueling-currency">' + escHtml(t('fuelingCurrency', 'Pénznem')) + '</label>'
      + '        <select id="fueling-currency" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm">'
      + buildCurrencyOptions(selCurrency)
      + '        </select>'
      + '      </div>'
      + '    </div>'

      // Tele tankolás / töltés
      + '    <div id="fueling-full-tank-wrap"' + (formLabels.showFullToggle ? '' : ' style="display:none;"') + ' class="flex items-center gap-3">'
      + '      <input id="fueling-full-tank" type="checkbox" class="w-5 h-5 accent-blue-600" ' + (selFullTank ? 'checked' : '') + ' />'
      + '      <label class="text-sm font-medium text-gray-700 dark:text-gray-300" for="fueling-full-tank">' + escHtml(formLabels.fullToggleLabel) + '</label>'
      + '    </div>'

      // Megjegyzés
      + '    <div>'
      + '      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" for="fueling-note">'
      + escHtml(t('fuelingNote', 'Megjegyzés'))
      + '      <span class="text-gray-400 font-normal"> ' + escHtml(t('fuelingOptional', '(opcionális)')) + '</span></label>'
      + '      <input id="fueling-note" type="text" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="' + escHtml(formLabels.notePlaceholder) + '" value="' + escHtml(selNote) + '" maxlength="200" />'
      + '    </div>'

      // Gombok
      + '    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">'
      + '      <button type="submit" id="fueling-save-btn" class="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">' + escHtml(t('fuelingSave', 'Mentés')) + '</button>'
      + '      <button type="button" id="fueling-cancel-btn" class="w-full py-3 px-4 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-semibold">' + escHtml(t('fuelingCancel', 'Mégse')) + '</button>'
      + '    </div>'
      + '  </form>'
      + '</div>';

    bindFormEvents(log, activeVehicles);
  }

  function bindFormEvents(log, activeVehicles) {
    var form = document.getElementById('fueling-form');
    var cancelBtn = document.getElementById('fueling-cancel-btn');
    var litersEl = document.getElementById('fueling-liters');
    var unitPriceEl = document.getElementById('fueling-unit-price');
    var totalEl = document.getElementById('fueling-total');
    var vehicleSel = document.getElementById('fueling-vehicle');
    var odometerEl = document.getElementById('fueling-odometer');
    var currencySel = document.getElementById('fueling-currency');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', function () {
        uiState.mode = 'list';
        uiState.editingId = null;
        uiState.formEnergyType = null;
        renderFuelingTab(false);
      });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        handleSave(log, activeVehicles);
      });
    }

    // Km figyelmeztetés
    if (odometerEl && vehicleSel) {
      function checkOdometer() {
        var vehicleId = vehicleSel.value;
        var odomVal = parseFloat(String(odometerEl.value).replace(',', '.'));
        if (!vehicleId || !isFinite(odomVal)) return;
        var prev = getPreviousOdometerForVehicle(vehicleId, uiState.editingId);
        var warnEl = document.getElementById('fueling-odometer-warning');
        if (!warnEl) return;
        if (prev != null && odomVal <= prev) {
          warnEl.textContent = t('fuelingOdometerWarning', 'Az km óra állás kisebb az előző tankolásnál. Ellenőrizd az adatot!');
          warnEl.classList.remove('hidden');
        } else {
          warnEl.textContent = '';
          warnEl.classList.add('hidden');
        }
      }
      odometerEl.addEventListener('input', checkOdometer);
      vehicleSel.addEventListener('change', function () {
        checkOdometer();
        updateFormLabelsForVehicle(activeVehicles);
      });
    }

    if (currencySel) {
      currencySel.addEventListener('change', function () {
        uiState.currencyManuallyChanged = true;
      });
    }

    if (vehicleSel && currencySel && !log) {
      vehicleSel.addEventListener('change', function () {
        if (uiState.currencyManuallyChanged) return;
        currencySel.value = suggestFormCurrency(vehicleSel.value, null, false);
      });
    }

    // Árszámítás
    function recalcPriceFields(changedField) {
      // Átmeneti értékekhez (üres, 0, tizedesjel) a nullát engedő parse-t használjuk
      var l = window.FuelingService.parseDecimalInputAllowZero(litersEl ? litersEl.value : '');
      var u = window.FuelingService.parseDecimalInputAllowZero(unitPriceEl ? unitPriceEl.value : '');
      var s = window.FuelingService.parseDecimalInputAllowZero(totalEl ? totalEl.value : '');
      var result = calcPriceFields(l, u, s, uiState.lastPriceField);

      function updateField(field, el, hintEl, decimals, labelKey) {
        // Az épp input eseményt kiváltó mezőt soha nem írjuk felül – nem függ a fókusztól
        if (result.computed === field && result[field] != null && changedField !== field) {
          el.value = formatNum(result[field], decimals);
          hintEl.textContent = t(labelKey, '(automatikusan számolva)');
          hintEl.classList.remove('hidden');
        } else if (hintEl) {
          hintEl.classList.add('hidden');
        }
      }

      var litersHint = document.getElementById('fueling-liters-hint');
      if (litersEl && litersHint) {
        updateField('liters', litersEl, litersHint, 2, 'fuelingLitersAutoCalculated');
      }

      var unitPriceHint = document.getElementById('fueling-unit-price-hint');
      if (unitPriceEl && unitPriceHint) {
        updateField('unitPrice', unitPriceEl, unitPriceHint, 3, 'fuelingUnitPriceAutoCalculated');
      }

      var totalHint = document.getElementById('fueling-total-hint');
      if (totalEl && totalHint) {
        updateField('totalAmount', totalEl, totalHint, 2, 'fuelingTotalAutoCalculated');
      }
    }

    if (litersEl) {
      litersEl.addEventListener('input', function () {
        uiState.lastPriceField = 'liters';
        var h = document.getElementById('fueling-liters-hint');
        if (h) h.classList.add('hidden');
        recalcPriceFields('liters');
      });
    }
    if (unitPriceEl) {
      unitPriceEl.addEventListener('input', function () {
        uiState.lastPriceField = 'unitPrice';
        var h = document.getElementById('fueling-unit-price-hint');
        if (h) h.classList.add('hidden');
        recalcPriceFields('unitPrice');
      });
    }
    if (totalEl) {
      totalEl.addEventListener('input', function () {
        uiState.lastPriceField = 'totalAmount';
        var h = document.getElementById('fueling-total-hint');
        if (h) h.classList.add('hidden');
        recalcPriceFields('totalAmount');
      });
    }
  }

  // =====================================================
  // === MENTÉS / TÖRLÉS =================================
  // =====================================================

  function readFormValues(activeVehicles) {
    var vehicleId = (document.getElementById('fueling-vehicle') || {}).value || '';
    var vehicle = getVehicleById(activeVehicles, vehicleId);
    var formLabels = getFuelingFormLabels(vehicle);
    var fullTankEl = document.getElementById('fueling-full-tank');
    return {
      vehicleId: vehicleId,
      date: (document.getElementById('fueling-date') || {}).value || '',
      time: (document.getElementById('fueling-time') || {}).value || '',
      odometer: (document.getElementById('fueling-odometer') || {}).value || '',
      liters: (document.getElementById('fueling-liters') || {}).value || '',
      unitPrice: (document.getElementById('fueling-unit-price') || {}).value || '',
      totalAmount: (document.getElementById('fueling-total') || {}).value || '',
      currency: (document.getElementById('fueling-currency') || {}).value || '',
      fullTank: formLabels.showFullToggle ? !!(fullTankEl && fullTankEl.checked) : false,
      note: (document.getElementById('fueling-note') || {}).value || '',
    };
  }

  function getVehiclePlateById(vehicleId, activeVehicles) {
    var v = (activeVehicles || []).find(function (x) { return x.id === vehicleId; });
    return v ? v.plateNumber : '';
  }

  async function handleSave(existingLog, activeVehicles) {
    if (uiState.saving) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (uiState.editingId && existingLog) {
        if (typeof window.canEditQueuedEntryOffline === 'function' && !window.canEditQueuedEntryOffline(existingLog)) {
          if (typeof window.showSyncedRecordReadOnlyAlert === 'function') window.showSyncedRecordReadOnlyAlert();
          return;
        }
      } else if (typeof window.gateOfflineCreate === 'function' && !window.gateOfflineCreate('fuel')) {
        return;
      }
    }
    var values = readFormValues(activeVehicles);
    var vehicle = getVehicleById(activeVehicles, values.vehicleId);
    var formLabels = getFuelingFormLabels(vehicle);

    // Validáció
    if (!values.vehicleId) {
      if (typeof showCustomAlert === 'function') showCustomAlert(t('fuelingErrorVehicleRequired', 'Válassz járművet!'), 'info');
      return;
    }
    if (!values.date) {
      if (typeof showCustomAlert === 'function') showCustomAlert(t('fuelingErrorDateRequired', 'Add meg a dátumot!'), 'info');
      return;
    }
    if (!values.time) {
      if (typeof showCustomAlert === 'function') showCustomAlert(t('fuelingErrorTimeRequired', 'Add meg az időt!'), 'info');
      return;
    }
    var odometerVal = window.FuelingService.parseDecimalInputAllowZero(values.odometer);
    if (odometerVal === null) {
      if (typeof showCustomAlert === 'function') showCustomAlert(t('fuelingErrorOdometerRequired', 'Add meg a km óra állást!'), 'info');
      return;
    }
    var litersVal = window.FuelingService.parseDecimalInput(values.liters);
    if (litersVal === null) {
      if (typeof showCustomAlert === 'function') showCustomAlert(formLabels.quantityRequiredError, 'info');
      return;
    }

    var unitPriceVal = window.FuelingService.parseDecimalInput(values.unitPrice);
    var totalAmountVal = window.FuelingService.parseDecimalInput(values.totalAmount);
    var hasPriceData = unitPriceVal != null || totalAmountVal != null;
    var currencyVal = String(values.currency || '').trim().toUpperCase();

    if (hasPriceData) {
      if (!currencyVal || !window.FuelingService.isSupportedCurrency(currencyVal)) {
        if (typeof showCustomAlert === 'function') showCustomAlert(t('fuelingErrorCurrencyRequired', 'Válassz érvényes pénznemet!'), 'info');
        return;
      }
    }

    var resolvedCurrency = window.FuelingService.normalizeCurrency(
      currencyVal || window.FuelingService.suggestDefaultCurrency(values.vehicleId, window.FuelingService.getCachedLogs() || []),
      window.FuelingService.getUserDefaultCurrency()
    );

    // Km figyelmeztetés – megerősítés kell ha km kisebb mint előző
    var prevOdometer = getPreviousOdometerForVehicle(values.vehicleId, uiState.editingId);
    var proceed = async function () {
      await doSave(values, litersVal, unitPriceVal, totalAmountVal, odometerVal, resolvedCurrency, activeVehicles);
    };

    if (prevOdometer != null && odometerVal <= prevOdometer) {
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(
          t('fuelingOdometerWarning', 'Az km óra állás kisebb az előző tankolásnál. Biztosan mentesz?'),
          'warning',
          function () { proceed(); },
          { confirmText: t('fuelingSave', 'Mentés'), cancelText: t('fuelingCancel', 'Mégse') }
        );
      } else {
        await proceed();
      }
      return;
    }

    await proceed();
  }

  async function doSave(values, litersVal, unitPriceVal, totalAmountVal, odometerVal, resolvedCurrency, activeVehicles) {
    if (uiState.saving) return;
    uiState.saving = true;

    var saveBtn = document.getElementById('fueling-save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = t('fuelingLoading', 'Mentés...'); }

    try {
      var plate = getVehiclePlateById(values.vehicleId, activeVehicles);
      var vehicle = getVehicleById(activeVehicles, values.vehicleId);
      var isAdBlue = isAdBlueFormMode();
      if (isAdBlue && !vehicleHasAdBlue(vehicle)) {
        if (typeof showCustomAlert === 'function') {
          showCustomAlert(t('fuelingErrorAdblueVehicleRequired', 'Ehhez a járműhöz nincs AdBlue bejelölve.'), 'info');
        }
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = t('fuelingSave', 'Mentés'); }
        return;
      }
      var quantityMeta = isAdBlue
        ? buildQuantityMetaFromUnitKey('liter')
        : getVehicleQuantityMeta(vehicle);
      var payload = {
        vehicleId: values.vehicleId,
        vehiclePlate: plate,
        date: values.date,
        time: values.time,
        odometerKm: odometerVal,
        liters: litersVal,
        quantityUnit: quantityMeta.unitKey,
        energyType: isAdBlue ? 'adblue' : null,
        unitPrice: unitPriceVal,
        totalAmount: totalAmountVal,
        currency: resolvedCurrency,
        fullTank: values.fullTank,
        note: values.note,
      };

      if (uiState.editingId) {
        await window.FuelingService.updateFuelLog(uiState.editingId, payload);
      } else {
        await window.FuelingService.createFuelLog(payload);
      }

      uiState.vehicleFilter = values.vehicleId;
      uiState.mode = 'list';
      uiState.editingId = null;
      uiState.formEnergyType = null;
      resetPreviousMonthsCache();
      renderFuelingTab(false);
    } catch (err) {
      if (typeof showCustomAlert === 'function') {
        if (err && err.message === 'offline_readonly' && typeof window.showSyncedRecordReadOnlyAlert === 'function') {
          window.showSyncedRecordReadOnlyAlert();
        } else {
          showCustomAlert(t('fuelingErrorSaveFailed', 'Nem sikerült menteni. Próbáld újra!'), 'info');
        }
      }
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = t('fuelingSave', 'Mentés'); }
    } finally {
      uiState.saving = false;
    }
  }

  function handleDelete(id) {
    if (!id) return;
    var existing = (window.FuelingService.getCachedLogs() || []).find(function (l) { return l.id === id; });
    if (typeof navigator !== 'undefined' && !navigator.onLine && existing) {
      if (typeof window.canEditQueuedEntryOffline === 'function' && !window.canEditQueuedEntryOffline(existing)) {
        if (typeof window.showSyncedRecordReadOnlyAlert === 'function') window.showSyncedRecordReadOnlyAlert();
        return;
      }
    }
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(
        t('fuelingConfirmDelete', 'Biztosan törlöd ezt a tankolási bejegyzést?'),
        'warning',
        async function () {
          try {
            await window.FuelingService.softDeleteFuelLog(id);
            resetPreviousMonthsCache();
            renderFuelingTab(false);
          } catch (_) {
            showCustomAlert(t('fuelingErrorDeleteFailed', 'Nem sikerült törölni.'), 'info');
          }
        },
        { confirmText: t('fuelingDelete', 'Törlés'), cancelText: t('fuelingCancel', 'Mégse'), confirmVariant: 'danger' }
      );
    }
  }

  // =====================================================
  // === FŐ BELÉPŐPONT ===================================
  // =====================================================

  function renderLoading() {
    var root = getRootEl();
    if (!root) return;
    root.innerHTML = '<div class="p-4 text-center text-gray-500 dark:text-gray-400">'
      + escHtml(t('fuelingLoading', 'Betöltés...'))
      + '</div>';
  }

  async function renderFuelingTab(forceReload) {
    if (!window.currentUser) {
      renderLoading();
      return;
    }

    // Ha form módban vagyunk és nem erőltetünk újratöltést, az aktív járművek listáját mindig frissítjük
    if (uiState.mode === 'form') {
      var activeVehicles = getActiveVehicles();
      if (!activeVehicles.length) {
        // Próbáljuk betölteni
        try {
          await window.VehiclesService.loadVehicles(false);
          activeVehicles = getActiveVehicles();
        } catch (_) {}
      }
      renderFormView(uiState.editingId ? ((window.FuelingService.getCachedLogs() || []).find(function (l) { return l.id === uiState.editingId; }) || null) : null, activeVehicles);
      return;
    }

    // Lista mód
    var cachedLogs = window.FuelingService && window.FuelingService.getCachedLogs
      ? window.FuelingService.getCachedLogs()
      : null;

    var activeVehicles = getActiveVehicles();

    if (!forceReload && Array.isArray(cachedLogs) && activeVehicles.length >= 0) {
      renderListView(cachedLogs, activeVehicles);
      return;
    }

    renderLoading();

    try {
      var results = await Promise.all([
        window.FuelingService.loadFuelLogs(!!forceReload),
        (window.VehiclesService && window.VehiclesService.loadVehicles)
          ? window.VehiclesService.loadVehicles(false)
          : Promise.resolve([]),
      ]);
      var logs = results[0];
      activeVehicles = getActiveVehicles();
      if (typeof window.updateFuelingMenuLabels === 'function') {
        try { window.updateFuelingMenuLabels(); } catch (_) {}
      }
      renderListView(logs, activeVehicles);
      if (typeof window.refreshOfflinePolicyUi === 'function') {
        try { window.refreshOfflinePolicyUi(); } catch (_) {}
      }
    } catch (err) {
      var root = getRootEl();
      if (root) {
        root.innerHTML = '<p class="p-4 text-red-600 dark:text-red-400">'
          + escHtml(t('fuelingErrorLoadFailed', 'Nem sikerült betölteni a tankolási adatokat.'))
          + '</p>';
      }
    }
  }

  window.renderFuelingTab = renderFuelingTab;
  window.initFuelingTab = renderFuelingTab;
})();
