// Tankolás Firestore szolgáltatás
// Adatstruktúra: users/{uid}/fuelLogs/{fuelLogId}
(function () {
  'use strict';

  var cache = {
    uid: null,
    logs: null,
    loaded: false,
    loadPromise: null,
  };

  var SUPPORTED_CURRENCIES = ['HUF', 'EUR', 'RON', 'PLN', 'DKK', 'NOK', 'CZK', 'SEK', 'CHF', 'GBP', 'USD', 'OTHER'];

  function normalizeCurrency(code, fallback) {
    var fb = fallback || 'HUF';
    var c = String(code || '').trim().toUpperCase();
    if (SUPPORTED_CURRENCIES.indexOf(c) >= 0) return c;
    return SUPPORTED_CURRENCIES.indexOf(fb) >= 0 ? fb : 'HUF';
  }

  function isSupportedCurrency(code) {
    return SUPPORTED_CURRENCIES.indexOf(String(code || '').trim().toUpperCase()) >= 0;
  }

  function getUserDefaultCurrency() {
    var sub = window.currentUserSubscription || {};
    var cc = String(sub.registrationCountryCode || sub.countryCode || '').trim().toUpperCase();
    if (cc === 'HU') return 'HUF';
    if (cc === 'PL') return 'PLN';
    if (cc === 'RO') return 'RON';
    if (cc === 'DK') return 'DKK';
    if (cc === 'NO') return 'NOK';
    if (cc === 'SE') return 'SEK';
    if (cc === 'CZ') return 'CZK';
    if (cc === 'CH') return 'CHF';
    if (cc === 'GB') return 'GBP';
    if (cc === 'US') return 'USD';
    if (cc) return 'EUR';
    return 'HUF';
  }

  function resolveLogCurrency(log) {
    if (log && log.currency) return normalizeCurrency(log.currency, 'HUF');
    return getUserDefaultCurrency();
  }

  function suggestDefaultCurrency(vehicleId, logs) {
    var list = logs || [];
    if (vehicleId) {
      var vehicleLogs = list.filter(function (l) { return l.vehicleId === vehicleId && l.currency; });
      if (vehicleLogs.length > 0) {
        return normalizeCurrency(vehicleLogs[0].currency, 'HUF');
      }
    }
    for (var i = 0; i < list.length; i++) {
      if (list[i].currency) return normalizeCurrency(list[i].currency, 'HUF');
    }
    return getUserDefaultCurrency();
  }

  function calcMonthlyCostByCurrency(monthLogs) {
    var byCurrency = {};
    (monthLogs || []).forEach(function (l) {
      if (l.totalAmount == null || !isFinite(l.totalAmount)) return;
      var cur = resolveLogCurrency(l);
      if (!byCurrency[cur]) byCurrency[cur] = 0;
      byCurrency[cur] += l.totalAmount;
    });
    Object.keys(byCurrency).forEach(function (cur) {
      byCurrency[cur] = Math.round(byCurrency[cur] * 100) / 100;
    });
    return byCurrency;
  }

  function calcAverageUnitPriceByCurrency(monthLogs) {
    var sums = {};
    var counts = {};
    (monthLogs || []).forEach(function (l) {
      if (l.unitPrice == null || !isFinite(l.unitPrice)) return;
      var cur = resolveLogCurrency(l);
      if (!sums[cur]) { sums[cur] = 0; counts[cur] = 0; }
      sums[cur] += l.unitPrice;
      counts[cur]++;
    });
    var result = {};
    Object.keys(sums).forEach(function (cur) {
      if (counts[cur] > 0) {
        result[cur] = Math.round((sums[cur] / counts[cur]) * 1000) / 1000;
      }
    });
    return result;
  }

  function getDb() {
    if (typeof db !== 'undefined' && db) return db;
    if (typeof firebase !== 'undefined' && firebase.firestore) return firebase.firestore();
    return null;
  }

  function fuelLogsRef(uid) {
    var database = getDb();
    if (!database || !uid) return null;
    return database.collection('users').doc(uid).collection('fuelLogs');
  }

  function normalizeEnergyType(value) {
    var v = String(value || '').toLowerCase().trim();
    if (v === 'adblue') return 'adblue';
    return null;
  }

  function isAdBlueLog(log) {
    return normalizeEnergyType(log && log.energyType) === 'adblue';
  }

  function isPrimaryFuelLog(log) {
    return !isAdBlueLog(log);
  }

  function filterPrimaryFuelLogs(logs) {
    return (logs || []).filter(isPrimaryFuelLog);
  }

  function filterAdBlueLogs(logs) {
    return (logs || []).filter(isAdBlueLog);
  }

  function mapFuelLogDoc(doc) {
    var data = doc.data() || {};
    return {
      id: doc.id,
      uid: data.uid || null,
      vehicleId: data.vehicleId || null,
      vehiclePlate: data.vehiclePlate || '',
      date: data.date || null,
      time: data.time || null,
      timestamp: data.timestamp || null,
      odometerKm: data.odometerKm != null ? data.odometerKm : null,
      liters: data.liters != null ? data.liters : null,
      quantityUnit: data.quantityUnit ? String(data.quantityUnit).toLowerCase() : null,
      energyType: normalizeEnergyType(data.energyType),
      unitPrice: data.unitPrice != null ? data.unitPrice : null,
      totalAmount: data.totalAmount != null ? data.totalAmount : null,
      currency: data.currency ? normalizeCurrency(data.currency, null) : null,
      fullTank: data.fullTank !== false,
      note: data.note || '',
      deleted: data.deleted === true,
      deletedAt: data.deletedAt || null,
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null,
    };
  }

  // timestamp-alapú rendezési kulcs: timestamp > date+time > date > ''
  function getSortKey(log) {
    if (log.timestamp) return log.timestamp;
    if (log.date && log.time) return log.date + 'T' + log.time + ':00';
    if (log.date) return log.date;
    return '';
  }

  function sortLogs(list) {
    return (list || []).slice().sort(function (a, b) {
      var ta = getSortKey(a);
      var tb = getSortKey(b);
      if (tb > ta) return 1;
      if (tb < ta) return -1;
      return 0;
    });
  }

  function setCache(uid, logs) {
    cache.uid = uid;
    cache.logs = sortLogs(logs);
    cache.loaded = true;
    cache.loadPromise = null;
  }

  function resetCache() {
    resetHistoryCache();
    cache.uid = null;
    cache.logs = null;
    cache.loaded = false;
    cache.loadPromise = null;
  }

  function getCachedLogs() {
    if (!cache.loaded || !Array.isArray(cache.logs)) return null;
    return cache.logs.slice();
  }

  // Utolsó 50 tankolás betöltése (max 90 nap visszamenőleg)
  async function loadFuelLogs(forceRefresh) {
    var user = window.currentUser;
    if (!user || !user.uid) return [];
    var uid = user.uid;

    if (!forceRefresh && cache.loaded && cache.uid === uid && Array.isArray(cache.logs)) {
      return cache.logs.slice();
    }
    if (!forceRefresh && cache.loadPromise && cache.uid === uid) {
      return cache.loadPromise;
    }

    var ref = fuelLogsRef(uid);
    if (!ref) return [];

    cache.uid = uid;
    cache.loadPromise = ref
      .orderBy('date', 'desc')
      .limit(50)
      .get()
      .then(function (snap) {
        var list = [];
        snap.forEach(function (doc) {
          var item = mapFuelLogDoc(doc);
          if (!item.deleted) list.push(item);
        });
        setCache(uid, list);
        return cache.logs.slice();
      })
      .catch(function (err) {
        cache.loadPromise = null;
        throw err;
      });

    return cache.loadPromise;
  }

  function upsertLocalLog(log) {
    var uid = window.currentUser && window.currentUser.uid;
    if (!uid || !log) return;
    if (!Array.isArray(cache.logs)) cache.logs = [];
    cache.loaded = true;
    if (!cache.uid) cache.uid = uid;
    var idx = cache.logs.findIndex(function (l) { return l.id === log.id; });
    if (idx >= 0) {
      cache.logs[idx] = log;
    } else {
      cache.logs.push(log);
    }
    cache.logs = sortLogs(cache.logs);
  }

  function removeLocalLog(id) {
    if (!Array.isArray(cache.logs)) return;
    cache.logs = cache.logs.filter(function (l) { return l.id !== id; });
  }

  function parseDecimalInput(value) {
    if (value === null || value === undefined) return null;
    var str = String(value).trim().replace(',', '.');
    if (str === '') return null;
    var n = parseFloat(str);
    if (!isFinite(n) || isNaN(n) || n <= 0) return null;
    return n;
  }

  function parseDecimalInputAllowZero(value) {
    if (value === null || value === undefined) return null;
    var str = String(value).trim().replace(',', '.');
    if (str === '') return null;
    var n = parseFloat(str);
    if (!isFinite(n) || isNaN(n) || n < 0) return null;
    return n;
  }

  function buildTimestamp(date, time) {
    if (!date) return null;
    try {
      var dt = time ? (date + 'T' + time + ':00') : (date + 'T00:00:00');
      return new Date(dt).toISOString();
    } catch (_) {
      return null;
    }
  }

  async function createFuelLog(input) {
    var user = window.currentUser;
    if (!user || !user.uid) throw new Error('not_authenticated');
    var uid = user.uid;
    var ref = fuelLogsRef(uid);
    if (!ref) throw new Error('no_db');

    var docRef = ref.doc();
    var logId = docRef.id;
    var ts = buildTimestamp(input.date, input.time);

    var offline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (offline && typeof window.saveSyncedEntry === 'function') {
      if (typeof window.gateOfflineCreate === 'function' && !window.gateOfflineCreate('fuel')) {
        throw new Error('offline_window_expired');
      }
      var offlinePayload = {
        uid: uid,
        vehicleId: input.vehicleId || null,
        vehiclePlate: String(input.vehiclePlate || ''),
        date: input.date || null,
        time: input.time || null,
        timestamp: ts,
        odometerKm: input.odometerKm,
        liters: input.liters,
        quantityUnit: input.quantityUnit ? String(input.quantityUnit).toLowerCase() : null,
        energyType: normalizeEnergyType(input.energyType),
        unitPrice: input.unitPrice != null ? input.unitPrice : null,
        totalAmount: input.totalAmount != null ? input.totalAmount : null,
        currency: normalizeCurrency(input.currency, getUserDefaultCurrency()),
        fullTank: input.fullTank !== false,
        note: String(input.note || '').trim(),
        deleted: false,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (typeof window.stampQueuedEntryFields === 'function') {
        offlinePayload = window.stampQueuedEntryFields(offlinePayload);
      }
      var syncResult = await window.saveSyncedEntry(Object.assign({}, offlinePayload, { _collection: 'fuelLogs', _docId: logId }), getDb(), uid);
      if (!syncResult || syncResult.status === 'failed') {
        throw new Error((syncResult && syncResult.errorMessage) || 'fuel_offline_save_failed');
      }
      var savedOffline = Object.assign({}, offlinePayload, {
        id: logId,
        syncStatus: 'pending',
        createdOffline: true,
      });
      upsertLocalLog(savedOffline);
      notifyFuelingChanged({ action: 'create', logId: logId });
      if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge();
      if (typeof window.updateConnectionStatus === 'function') window.updateConnectionStatus();
      return savedOffline;
    }

    var payload = {
      uid: uid,
      vehicleId: input.vehicleId || null,
      vehiclePlate: String(input.vehiclePlate || ''),
      date: input.date || null,
      time: input.time || null,
      timestamp: ts,
      odometerKm: input.odometerKm,
      liters: input.liters,
      quantityUnit: input.quantityUnit ? String(input.quantityUnit).toLowerCase() : null,
      energyType: normalizeEnergyType(input.energyType),
      unitPrice: input.unitPrice != null ? input.unitPrice : null,
      totalAmount: input.totalAmount != null ? input.totalAmount : null,
      currency: normalizeCurrency(input.currency, getUserDefaultCurrency()),
      fullTank: input.fullTank !== false,
      note: String(input.note || '').trim(),
      deleted: false,
      deletedAt: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(payload);

    var saved = {
      id: docRef.id,
      uid: uid,
      vehicleId: payload.vehicleId,
      vehiclePlate: payload.vehiclePlate,
      date: payload.date,
      time: payload.time,
      timestamp: ts,
      odometerKm: payload.odometerKm,
      liters: payload.liters,
      quantityUnit: payload.quantityUnit,
      energyType: payload.energyType,
      unitPrice: payload.unitPrice,
      totalAmount: payload.totalAmount,
      currency: payload.currency,
      fullTank: payload.fullTank,
      note: payload.note,
      deleted: false,
      deletedAt: null,
      createdAt: null,
      updatedAt: null,
    };

    upsertLocalLog(saved);
    notifyFuelingChanged({ action: 'create', logId: saved.id });
    return saved;
  }

  async function updateFuelLog(logId, input) {
    var user = window.currentUser;
    if (!user || !user.uid) throw new Error('not_authenticated');
    var uid = user.uid;
    var ref = fuelLogsRef(uid);
    if (!ref) throw new Error('no_db');

    var existing = (cache.logs || []).find(function (l) { return l.id === logId; }) || {};
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (typeof window.canEditQueuedEntryOffline === 'function' && !window.canEditQueuedEntryOffline(existing)) {
        throw new Error('offline_readonly');
      }
    }

    var ts = buildTimestamp(input.date, input.time);

    var payload = {
      vehicleId: input.vehicleId || null,
      vehiclePlate: String(input.vehiclePlate || ''),
      date: input.date || null,
      time: input.time || null,
      timestamp: ts,
      odometerKm: input.odometerKm,
      liters: input.liters,
      quantityUnit: input.quantityUnit ? String(input.quantityUnit).toLowerCase() : null,
      energyType: normalizeEnergyType(input.energyType),
      unitPrice: input.unitPrice != null ? input.unitPrice : null,
      totalAmount: input.totalAmount != null ? input.totalAmount : null,
      currency: normalizeCurrency(input.currency, getUserDefaultCurrency()),
      fullTank: input.fullTank !== false,
      note: String(input.note || '').trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await ref.doc(logId).update(payload);

    var existing = (cache.logs || []).find(function (l) { return l.id === logId; }) || {};
    var saved = Object.assign({}, existing, {
      id: logId,
      uid: uid,
      vehicleId: payload.vehicleId,
      vehiclePlate: payload.vehiclePlate,
      date: payload.date,
      time: payload.time,
      timestamp: ts,
      odometerKm: payload.odometerKm,
      liters: payload.liters,
      quantityUnit: payload.quantityUnit,
      energyType: payload.energyType,
      unitPrice: payload.unitPrice,
      totalAmount: payload.totalAmount,
      currency: payload.currency,
      fullTank: payload.fullTank,
      note: payload.note,
      deleted: false,
    });

    upsertLocalLog(saved);
    notifyFuelingChanged({ action: 'update', logId: logId });
    return saved;
  }

  async function softDeleteFuelLog(logId) {
    var user = window.currentUser;
    if (!user || !user.uid) throw new Error('not_authenticated');
    var uid = user.uid;
    var ref = fuelLogsRef(uid);
    if (!ref) throw new Error('no_db');

    var existing = (cache.logs || []).find(function (l) { return l.id === logId; }) || {};
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (typeof window.canEditQueuedEntryOffline === 'function' && !window.canEditQueuedEntryOffline(existing)) {
        throw new Error('offline_readonly');
      }
    }

    await ref.doc(logId).update({
      deleted: true,
      deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    removeLocalLog(logId);
    notifyFuelingChanged({ action: 'delete', logId: logId });
  }

  function notifyFuelingChanged(detail) {
    try {
      window.dispatchEvent(new CustomEvent('gurigo:fuelingChanged', { detail: detail || {} }));
    } catch (_) {}
  }

  // --- Statisztika számítók ---

  function getLogsForVehicle(logs, vehicleId) {
    if (!vehicleId || vehicleId === 'all') return logs || [];
    return (logs || []).filter(function (l) { return l.vehicleId === vehicleId; });
  }

  function getThisMonthLogs(logs) {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var prefix = year + '-' + month;
    return getLogsForMonth(logs, prefix);
  }

  function getLogsForMonth(logs, yearMonth) {
    if (!yearMonth) return [];
    var prefix = String(yearMonth);
    return (logs || []).filter(function (l) {
      return l.date && l.date.indexOf(prefix) === 0;
    });
  }

  function getCurrentYearMonth() {
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  }

  function getPreviousMonthKeys(maxCount) {
    var count = maxCount || 12;
    var keys = [];
    var now = new Date();
    for (var i = 1; i <= count; i++) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }
    return keys;
  }

  function sumMonthlyQuantity(monthLogs) {
    var total = 0;
    (monthLogs || []).forEach(function (l) {
      if (l.liters != null && isFinite(l.liters)) total += l.liters;
    });
    return total;
  }

  function calcAverageConsumptionElectric(logsForVehicle) {
    return calcAverageConsumption(logsForVehicle);
  }

  function calcAverageConsumptionForVehicle(logsForVehicle, isElectric) {
    if (isElectric) return calcAverageConsumptionElectric(logsForVehicle);
    return calcAverageConsumption(logsForVehicle);
  }

  function buildMonthSummary(monthLogs, isElectric) {
    var primaryLogs = filterPrimaryFuelLogs(monthLogs);
    var adblueLogs = filterAdBlueLogs(monthLogs);
    var quantity = sumMonthlyQuantity(primaryLogs);
    return {
      logCount: primaryLogs.length,
      quantity: quantity,
      costByCurrency: calcMonthlyCostByCurrency(primaryLogs),
      avgUnitByCurrency: calcAverageUnitPriceByCurrency(primaryLogs),
      avgConsumption: calcAverageConsumptionForVehicle(primaryLogs, isElectric === true),
      avgFuelCost: calcAverageFuelCost(primaryLogs),
      adblueLogCount: adblueLogs.length,
      adblueQuantity: sumMonthlyQuantity(adblueLogs),
      adblueCostByCurrency: calcMonthlyCostByCurrency(adblueLogs),
      adblueAvgUnitByCurrency: calcAverageUnitPriceByCurrency(adblueLogs),
      adblueAvgConsumption: calcAverageConsumption(adblueLogs),
    };
  }

  function buildPreviousMonthsSummaries(allVehicleLogs, isElectric, maxMonths) {
    var keys = getPreviousMonthKeys(maxMonths || 12);
    var results = [];
    keys.forEach(function (key) {
      var monthLogs = getLogsForMonth(allVehicleLogs, key);
      if (!monthLogs.length) return;
      results.push({
        monthKey: key,
        summary: buildMonthSummary(monthLogs, isElectric),
        monthLogs: monthLogs,
      });
    });
    return results;
  }

  var historyCache = {
    uid: null,
    vehicleId: null,
    logs: null,
    loadPromise: null,
  };

  function getHistoryCutoffDate(monthsBack) {
    var months = monthsBack || 13;
    var d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - months);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
  }

  function resetHistoryCache() {
    historyCache.uid = null;
    historyCache.vehicleId = null;
    historyCache.logs = null;
    historyCache.loadPromise = null;
  }

  async function loadVehicleFuelLogsHistory(vehicleId, forceRefresh) {
    var user = window.currentUser;
    if (!user || !user.uid || !vehicleId) return [];
    var uid = user.uid;

    if (!forceRefresh && historyCache.uid === uid && historyCache.vehicleId === vehicleId && Array.isArray(historyCache.logs)) {
      return historyCache.logs.slice();
    }
    if (!forceRefresh && historyCache.loadPromise && historyCache.uid === uid && historyCache.vehicleId === vehicleId) {
      return historyCache.loadPromise;
    }

    var ref = fuelLogsRef(uid);
    if (!ref) return [];

    var cutoff = getHistoryCutoffDate(13);
    historyCache.uid = uid;
    historyCache.vehicleId = vehicleId;
    historyCache.loadPromise = ref
      .where('date', '>=', cutoff)
      .orderBy('date', 'desc')
      .get()
      .then(function (snap) {
        var list = [];
        snap.forEach(function (doc) {
          var item = mapFuelLogDoc(doc);
          if (item.deleted) return;
          if (item.vehicleId !== vehicleId) return;
          list.push(item);
        });
        historyCache.logs = sortLogs(list);
        historyCache.loadPromise = null;
        return historyCache.logs.slice();
      })
      .catch(function () {
        historyCache.loadPromise = null;
        var fallback = sortLogs(getLogsForVehicle(getCachedLogs() || [], vehicleId));
        historyCache.logs = fallback;
        return fallback.slice();
      });

    return historyCache.loadPromise;
  }

  function sortLogsChronological(logsForVehicle) {
    return (logsForVehicle || [])
      .filter(function (l) { return l.odometerKm != null && l.liters != null; })
      .slice()
      .sort(function (a, b) {
        var ta = getSortKey(a);
        var tb = getSortKey(b);
        return ta > tb ? 1 : ta < tb ? -1 : 0;
      });
  }

  function findLogIndex(sortedAscending, log) {
    if (!log) return -1;
    for (var i = 0; i < sortedAscending.length; i++) {
      if (log.id && sortedAscending[i].id === log.id) return i;
      if (sortedAscending[i] === log) return i;
    }
    return -1;
  }

  function resolveEntryFuelCost(entry) {
    if (!entry) return null;
    if (entry.totalAmount != null && isFinite(entry.totalAmount) && entry.totalAmount > 0) {
      return { amount: entry.totalAmount, currency: resolveLogCurrency(entry) };
    }
    if (entry.unitPrice != null && isFinite(entry.unitPrice) && entry.unitPrice > 0
        && entry.liters != null && isFinite(entry.liters) && entry.liters > 0) {
      return { amount: entry.unitPrice * entry.liters, currency: resolveLogCurrency(entry) };
    }
    return null;
  }

  function roundFuelCost(value, currency) {
    if (value == null || !isFinite(value)) return null;
    var cur = normalizeCurrency(currency, 'HUF');
    if (cur === 'HUF') return Math.round(value);
    return Math.round(value * 100) / 100;
  }

  function buildCostPerDistanceFromTotals(costByCurrency, kmDiff) {
    if (!costByCurrency || kmDiff == null || kmDiff <= 0) return null;
    var per100 = {};
    var perKm = {};
    Object.keys(costByCurrency).forEach(function (cur) {
      var total = costByCurrency[cur];
      if (total == null || !isFinite(total) || total <= 0) return;
      var p100 = roundFuelCost((total / kmDiff) * 100, cur);
      var pKm = roundFuelCost(total / kmDiff, cur);
      if (p100 != null && p100 > 0) per100[cur] = p100;
      if (pKm != null && pKm > 0) perKm[cur] = pKm;
    });
    if (!Object.keys(per100).length) return null;
    return {
      costByCurrency: costByCurrency,
      costPer100KmByCurrency: per100,
      costPerKmByCurrency: perKm,
    };
  }

  function sumCycleFuelCost(sorted, previousFullIdx, currentIdx) {
    var costByCurrency = {};
    for (var k = previousFullIdx + 1; k <= currentIdx; k++) {
      var costInfo = resolveEntryFuelCost(sorted[k]);
      if (!costInfo) return null;
      if (!costByCurrency[costInfo.currency]) costByCurrency[costInfo.currency] = 0;
      costByCurrency[costInfo.currency] += costInfo.amount;
    }
    Object.keys(costByCurrency).forEach(function (cur) {
      costByCurrency[cur] = Math.round(costByCurrency[cur] * 100) / 100;
    });
    return costByCurrency;
  }

  // Full-to-full ciklus: előző tele tankolás óta összes liter (köztes rész-tankolásokkal)
  function calcFullToFullConsumption(log, logsForVehicle) {
    if (!log || log.fullTank !== true) {
      return { liters: log && log.liters != null ? log.liters : null, kmDiff: null, consumption: null, notAccurate: true, notCalculable: false };
    }
    if (log.odometerKm == null || log.liters == null) {
      return { liters: null, kmDiff: null, consumption: null, notAccurate: true, notCalculable: false };
    }

    var sorted = sortLogsChronological(logsForVehicle);
    var currentIdx = findLogIndex(sorted, log);
    if (currentIdx < 0) {
      return { liters: log.liters, kmDiff: null, consumption: null, notAccurate: true, notCalculable: false };
    }

    var previousFullIdx = -1;
    var previousFull = null;
    for (var j = currentIdx - 1; j >= 0; j--) {
      if (sorted[j].fullTank) {
        previousFull = sorted[j];
        previousFullIdx = j;
        break;
      }
    }

    if (!previousFull) {
      return { liters: log.liters, kmDiff: null, consumption: null, notAccurate: true, notCalculable: false };
    }

    var kmDiff = log.odometerKm - previousFull.odometerKm;
    if (kmDiff <= 0) {
      return { liters: log.liters, kmDiff: null, consumption: null, notAccurate: false, notCalculable: true };
    }

    var litersSum = 0;
    for (var k = previousFullIdx + 1; k <= currentIdx; k++) {
      var entry = sorted[k];
      if (entry.liters != null && isFinite(entry.liters)) litersSum += entry.liters;
    }

    if (litersSum <= 0) {
      return { liters: 0, kmDiff: kmDiff, consumption: null, notAccurate: true, notCalculable: false };
    }

    var consumption = (litersSum / kmDiff) * 100;
    var cycleCostByCurrency = sumCycleFuelCost(sorted, previousFullIdx, currentIdx);
    var costMetrics = cycleCostByCurrency
      ? buildCostPerDistanceFromTotals(cycleCostByCurrency, kmDiff)
      : null;
    return {
      liters: litersSum,
      kmDiff: kmDiff,
      consumption: Math.round(consumption * 100) / 100,
      costByCurrency: costMetrics ? costMetrics.costByCurrency : null,
      costPer100KmByCurrency: costMetrics ? costMetrics.costPer100KmByCurrency : null,
      costPerKmByCurrency: costMetrics ? costMetrics.costPerKmByCurrency : null,
      notAccurate: false,
      notCalculable: false,
    };
  }

  // Utolsó fogyasztás számítás (full-to-full ciklus, köztes rész-tankolásokkal)
  function calcLastConsumption(logsForVehicle) {
    var scoped = logsForVehicle || [];
    var sorted = scoped
      .filter(function (l) { return l.odometerKm != null && l.liters != null; })
      .slice()
      .sort(function (a, b) {
        var ta = getSortKey(a);
        var tb = getSortKey(b);
        return tb > ta ? 1 : tb < ta ? -1 : 0;
      });

    if (sorted.length < 1) return null;
    return calcFullToFullConsumption(sorted[0], scoped);
  }

  // Átlagfogyasztás (full-to-full ciklusokból, köztes rész-tankolásokkal)
  function calcAverageConsumption(logsForVehicle) {
    var scoped = logsForVehicle || [];
    var sorted = sortLogsChronological(scoped);
    if (sorted.length < 2) return null;

    var totalLiters = 0;
    var totalKm = 0;
    var validCycles = 0;

    for (var i = 0; i < sorted.length; i++) {
      if (!sorted[i].fullTank) continue;
      var cycle = calcFullToFullConsumption(sorted[i], scoped);
      if (cycle.consumption == null || cycle.kmDiff == null || cycle.kmDiff <= 0) continue;
      totalLiters += cycle.liters;
      totalKm += cycle.kmDiff;
      validCycles++;
    }

    if (validCycles < 1 || totalKm <= 0) return null;
    return Math.round((totalLiters / totalKm) * 100 * 100) / 100;
  }

  // Átlagos üzemanyagköltség / 100 km (ugyanazokból a full-to-full ciklusokból, mint az átlagfogyasztás)
  function calcAverageFuelCost(logsForVehicle) {
    var scoped = logsForVehicle || [];
    var sorted = sortLogsChronological(scoped);
    if (sorted.length < 2) return null;

    var costByCurrency = {};
    var kmByCurrency = {};

    for (var i = 0; i < sorted.length; i++) {
      if (!sorted[i].fullTank) continue;
      var cycle = calcFullToFullConsumption(sorted[i], scoped);
      if (cycle.consumption == null || !cycle.costByCurrency || cycle.kmDiff == null || cycle.kmDiff <= 0) continue;
      Object.keys(cycle.costByCurrency).forEach(function (cur) {
        if (!costByCurrency[cur]) {
          costByCurrency[cur] = 0;
          kmByCurrency[cur] = 0;
        }
        costByCurrency[cur] += cycle.costByCurrency[cur];
        kmByCurrency[cur] += cycle.kmDiff;
      });
    }

    var per100 = {};
    var perKm = {};
    Object.keys(costByCurrency).forEach(function (cur) {
      var km = kmByCurrency[cur];
      if (km == null || km <= 0) return;
      var p100 = roundFuelCost((costByCurrency[cur] / km) * 100, cur);
      var pKm = roundFuelCost(costByCurrency[cur] / km, cur);
      if (p100 != null && p100 > 0) per100[cur] = p100;
      if (pKm != null && pKm > 0) perKm[cur] = pKm;
    });

    if (!Object.keys(per100).length) return null;
    return {
      costByCurrency: costByCurrency,
      costPer100KmByCurrency: per100,
      costPerKmByCurrency: perKm,
      kmByCurrency: kmByCurrency,
    };
  }

  window.FuelingService = {
    SUPPORTED_CURRENCIES: SUPPORTED_CURRENCIES,
    normalizeCurrency: normalizeCurrency,
    isSupportedCurrency: isSupportedCurrency,
    getUserDefaultCurrency: getUserDefaultCurrency,
    resolveLogCurrency: resolveLogCurrency,
    suggestDefaultCurrency: suggestDefaultCurrency,
    normalizeEnergyType: normalizeEnergyType,
    isAdBlueLog: isAdBlueLog,
    isPrimaryFuelLog: isPrimaryFuelLog,
    filterPrimaryFuelLogs: filterPrimaryFuelLogs,
    filterAdBlueLogs: filterAdBlueLogs,
    calcMonthlyCostByCurrency: calcMonthlyCostByCurrency,
    calcAverageUnitPriceByCurrency: calcAverageUnitPriceByCurrency,
    loadFuelLogs: loadFuelLogs,
    createFuelLog: createFuelLog,
    updateFuelLog: updateFuelLog,
    softDeleteFuelLog: softDeleteFuelLog,
    resetCache: resetCache,
    getCachedLogs: getCachedLogs,
    parseDecimalInput: parseDecimalInput,
    parseDecimalInputAllowZero: parseDecimalInputAllowZero,
    getLogsForVehicle: getLogsForVehicle,
    getThisMonthLogs: getThisMonthLogs,
    getLogsForMonth: getLogsForMonth,
    getCurrentYearMonth: getCurrentYearMonth,
    getPreviousMonthKeys: getPreviousMonthKeys,
    buildMonthSummary: buildMonthSummary,
    buildPreviousMonthsSummaries: buildPreviousMonthsSummaries,
    calcAverageConsumptionForVehicle: calcAverageConsumptionForVehicle,
    loadVehicleFuelLogsHistory: loadVehicleFuelLogsHistory,
    resetHistoryCache: resetHistoryCache,
    calcFullToFullConsumption: calcFullToFullConsumption,
    calcLastConsumption: calcLastConsumption,
    calcAverageConsumption: calcAverageConsumption,
    calcAverageFuelCost: calcAverageFuelCost,
    roundFuelCost: roundFuelCost,
    notifyFuelingChanged: notifyFuelingChanged,
  };
})();
