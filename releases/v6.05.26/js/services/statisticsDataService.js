// Dedicated statistics data loader — decoupled from List pagination / active window records.
(function () {
  'use strict';

  var STATS_PAGE_SIZE = 300;
  var _inflight = {};

  function getUid() {
    return (window.currentUser && window.currentUser.uid) ? window.currentUser.uid : null;
  }

  function getDb() {
    if (window.db) return window.db;
    try {
      if (typeof firebase !== 'undefined' && firebase.firestore) return firebase.firestore();
    } catch (_) {}
    return null;
  }

  function ensureCache() {
    if (!window._statisticsDataCache) window._statisticsDataCache = {};
    return window._statisticsDataCache;
  }

  function buildCacheKey(uid, view, periodKey) {
    return uid + '|' + view + '|' + periodKey;
  }

  function getPeriodKey(view, statsDate) {
    var d = (statsDate instanceof Date) ? statsDate : new Date(statsDate || Date.now());
    if (view === 'daily') {
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      return y + '-' + m;
    }
    if (view === 'monthly') {
      return String(d.getFullYear());
    }
    return 'all';
  }

  function filterStatsRecords(records) {
    return (records || []).filter(function (r) {
      return r && r.date && r.entryType !== 'noteDay';
    });
  }

  async function loadRecordsForDateRange(start, end) {
    var uid = getUid();
    var db = getDb();
    if (!uid || !db || !start || !end) return [];
    try {
      var snap = await db.collection('users').doc(uid).collection('records')
        .where('date', '>=', start)
        .where('date', '<=', end)
        .get();
      return snap.docs.map(function (doc) { return Object.assign({ id: doc.id }, doc.data()); });
    } catch (e) {
      console.warn('[StatisticsData] range load failed:', e && e.message);
      return [];
    }
  }

  async function loadRecordsForMonth(monthStr) {
    if (!monthStr) return [];
    var parts = String(monthStr).split('-');
    if (parts.length < 2) return [];
    var year = parts[0];
    var month = parts[1];
    var start = year + '-' + month + '-01';
    var endDate = new Date(parseInt(year, 10), parseInt(month, 10), 0);
    var end = year + '-' + month + '-' + String(endDate.getDate()).padStart(2, '0');
    return loadRecordsForDateRange(start, end);
  }

  async function loadAllRecordsPaginated() {
    var uid = getUid();
    var db = getDb();
    if (!uid || !db) return [];

    var all = [];
    var lastDoc = null;
    var hasMore = true;

    while (hasMore) {
      var ref = db.collection('users').doc(uid).collection('records').orderBy('date', 'desc');
      var query = ref.limit(STATS_PAGE_SIZE);
      if (lastDoc) query = query.startAfter(lastDoc);
      var snap = await query.get();
      if (!snap.docs.length) break;
      snap.docs.forEach(function (doc) {
        all.push(Object.assign({ id: doc.id }, doc.data()));
      });
      lastDoc = snap.docs[snap.docs.length - 1];
      hasMore = snap.docs.length >= STATS_PAGE_SIZE;
    }
    return all;
  }

  async function loadStatisticsRecords(view, statsDate, options) {
    var uid = getUid();
    if (!uid) return [];

    var periodKey = getPeriodKey(view, statsDate);
    var cacheKey = buildCacheKey(uid, view, periodKey);
    var cache = ensureCache();
    var force = !!(options && options.force);

    if (!force && cache[cacheKey] && Array.isArray(cache[cacheKey].records)) {
      return cache[cacheKey].records.slice();
    }

    if (_inflight[cacheKey]) {
      return _inflight[cacheKey];
    }

    _inflight[cacheKey] = (async function () {
      try {
        var loaded = [];
        if (view === 'daily') {
          loaded = await loadRecordsForMonth(periodKey);
        } else if (view === 'monthly') {
          loaded = await loadRecordsForDateRange(periodKey + '-01-01', periodKey + '-12-31');
        } else {
          loaded = await loadAllRecordsPaginated();
        }
        loaded = filterStatsRecords(loaded);
        cache[cacheKey] = { records: loaded, loadedAt: Date.now() };
        return loaded.slice();
      } finally {
        delete _inflight[cacheKey];
      }
    })();

    return _inflight[cacheKey];
  }

  function invalidateStatisticsCache(recordDate) {
    var uid = getUid();
    var cache = ensureCache();
    if (!uid) {
      window._statisticsDataCache = {};
      return;
    }

    if (!recordDate) {
      Object.keys(cache).forEach(function (k) {
        if (k.indexOf(uid + '|') === 0) delete cache[k];
      });
      return;
    }

    var parts = String(recordDate).split('-');
    var year = parts[0] || '';
    var monthKey = (parts.length >= 2) ? (year + '-' + parts[1]) : null;
    Object.keys(cache).forEach(function (k) {
      if (k.indexOf(uid + '|') !== 0) return;
      if (k.indexOf('|yearly|') >= 0) {
        delete cache[k];
        return;
      }
      if (year && k === buildCacheKey(uid, 'monthly', year)) {
        delete cache[k];
        return;
      }
      if (monthKey && k === buildCacheKey(uid, 'daily', monthKey)) {
        delete cache[k];
      }
    });
  }

  window.StatisticsDataService = {
    loadStatisticsRecords: loadStatisticsRecords,
    invalidateStatisticsCache: invalidateStatisticsCache,
    getPeriodKey: getPeriodKey
  };
})();
