/**
 * GuriGO – canonical cross-day trailer/container active state.
 *
 * CANONICAL_FIRESTORE_PATH = users/{uid}/state/trailerContainerActive
 * Same owner-only `state` collection as users/{uid}/state/activeShift.
 * The activeShift document is cleared on shift close, so this is a sibling
 * document. It is not a workday and it is not settings/subscription.
 *
 * localStorage is a cache and a pending-event queue. It is not canonical.
 * A normal open reads this one document. A full records query runs only for
 * reconcile (workday save/delete, shift cancel/close, historical repair).
 * That query is one ordered read of the user's records and is the read cost
 * of rebuilding state after history changes.
 *
 * Offline writes are queued as events and applied with a transaction on
 * reconnect so a stale full-document set does not last-write-wins. A write
 * that has not reached the server is marked pending, never synced.
 */
(function (global) {
  'use strict';

  var DOC_ID = 'trailerContainerActive';
  var CACHE_PREFIX = 'gurigo_trailer_container_active_v1:';
  var cache = { items: [], syncVersion: 0, syncStatus: 'empty', pendingEvents: [], loaded: false };
  var loadPromise = null;
  var historyRecords = null;
  /** True only after a successful full remote records fetch for trailer history. */
  var historyComplete = false;
  var historyPromise = null;
  var unsubscribe = null;

  function lib() {
    return global.TrailerContainerLog || null;
  }

  function uid() {
    return global.currentUser && global.currentUser.uid ? String(global.currentUser.uid) : '';
  }

  function db() {
    return global.db || null;
  }

  function offline() {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  }

  function cacheKey() {
    var id = uid();
    return id ? (CACHE_PREFIX + id) : '';
  }

  function readCache() {
    var key = cacheKey();
    if (!key || !global.localStorage) return null;
    try {
      var raw = global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeCache() {
    var key = cacheKey();
    if (!key || !global.localStorage) return;
    try {
      global.localStorage.setItem(key, JSON.stringify({
        items: cache.items,
        syncVersion: cache.syncVersion,
        syncStatus: cache.syncStatus,
        pendingEvents: cache.pendingEvents
      }));
    } catch (_) {}
  }

  function applyCache(entry) {
    cache.items = entry && Array.isArray(entry.items) ? entry.items : [];
    cache.syncVersion = entry && typeof entry.syncVersion === 'number' ? entry.syncVersion : 0;
    cache.syncStatus = entry && entry.syncStatus ? entry.syncStatus : 'empty';
    cache.pendingEvents = entry && Array.isArray(entry.pendingEvents) ? entry.pendingEvents : [];
  }

  function docRef() {
    var id = uid();
    var database = db();
    if (!id || !database) return null;
    return database.collection('users').doc(id).collection('state').doc(DOC_ID);
  }

  function deviceId() {
    return typeof global.getGurigoDeviceId === 'function' ? global.getGurigoDeviceId() : 'dev_unknown';
  }

  function buildPayload(items, syncVersion) {
    var logic = lib();
    var doc = logic
      ? logic.projectActiveDocument(items, { syncVersion: syncVersion })
      : { schemaVersion: 1, syncVersion: syncVersion, items: items || [] };
    doc.clientUpdatedAt = new Date().toISOString();
    doc.updatedByDeviceId = deviceId();
    var fv = (typeof global.firebase !== 'undefined' && global.firebase.firestore && global.firebase.firestore.FieldValue)
      ? global.firebase.firestore.FieldValue
      : null;
    if (fv && fv.serverTimestamp) doc.updatedAt = fv.serverTimestamp();
    return doc;
  }

  function rememberRemote(data, pendingWrites) {
    var items = data && Array.isArray(data.items) ? data.items : [];
    cache.items = items;
    cache.syncVersion = data && typeof data.syncVersion === 'number' ? data.syncVersion : 0;
    cache.syncStatus = pendingWrites ? 'pending' : 'synced';
    cache.pendingEvents = [];
    cache.loaded = true;
    writeCache();
  }

  function localRecords() {
    var lists = []
      .concat(Array.isArray(global.records) ? global.records : [])
      .concat(Array.isArray(global._recordsOlderArchive) ? global._recordsOlderArchive : [])
      .concat(Array.isArray(historyRecords) ? historyRecords : []);
    var map = {};
    lists.forEach(function (r) {
      if (r && r.id != null) map[String(r.id)] = r;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function openShiftEvents() {
    var shift = global.activeShift;
    if (!shift || !Array.isArray(shift.trailerContainerEvents)) return [];
    var records = localRecords();
    var saved = false;
    for (var i = 0; i < records.length; i++) {
      if (String(records[i].id) === String(shift.id)) saved = true;
    }
    return saved ? [] : shift.trailerContainerEvents;
  }

  async function fetchAllRecords() {
    var id = uid();
    var database = db();
    if (!id || !database) {
      historyComplete = false;
      return localRecords();
    }
    var snap = await database.collection('users').doc(id).collection('records').orderBy('date').get();
    var remote = snap && snap.docs ? snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }) : [];
    var map = {};
    remote.forEach(function (r) { if (r && r.id != null) map[String(r.id)] = r; });
    localRecords().forEach(function (r) { if (r && r.id != null) map[String(r.id)] = r; });
    historyRecords = Object.keys(map).map(function (k) { return map[k]; });
    historyComplete = true;
    return historyRecords;
  }

  async function transactionApply(event, source) {
    var ref = docRef();
    var logic = lib();
    var database = db();
    if (!ref || !logic || !database || typeof database.runTransaction !== 'function') {
      return { status: 'failed', error: new Error('transaction_unavailable') };
    }
    var written = null;
    await database.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        var prev = snap && snap.exists && snap.data() ? snap.data() : {};
        var version = typeof prev.syncVersion === 'number' ? prev.syncVersion : 0;
        var items = logic.applyEventToItems(prev.items || [], event, source);
        written = buildPayload(items, version + 1);
        tx.set(ref, written);
      });
    });
    rememberRemote(written, false);
    return { status: 'savedOnline', items: cache.items };
  }

  async function flushPending() {
    if (offline() || !cache.pendingEvents.length) return { status: cache.syncStatus };
    var queue = cache.pendingEvents.slice();
    cache.pendingEvents = [];
    try {
      var last = null;
      for (var i = 0; i < queue.length; i++) {
        last = await transactionApply(queue[i].event, queue[i].source);
        if (!last || last.status === 'failed') throw last && last.error ? last.error : new Error('flush_failed');
      }
      return last || { status: 'savedOnline' };
    } catch (error) {
      cache.pendingEvents = queue;
      cache.syncStatus = 'pending';
      writeCache();
      return { status: 'failed', error: error };
    }
  }

  function rerender() {
    try { if (typeof global.renderStartTab === 'function') global.renderStartTab(); } catch (_) {}
    try { if (typeof global.renderFullDayTrailerContainer === 'function') global.renderFullDayTrailerContainer(); } catch (_) {}
  }

  async function load() {
    if (loadPromise) return loadPromise;
    loadPromise = loadInner().finally(function () { loadPromise = null; });
    return loadPromise;
  }

  
  function softReconcileDisplay(remoteItems) {
    var logic = lib();
    if (!logic || typeof logic.reconcileActiveItems !== 'function') {
      return { items: remoteItems || [], wrote: false, staleRemote: [] };
    }
    var locals = localRecords();
    // No local history yet: keep remote items (do not treat them as stale).
    if (!locals.length) {
      return { items: remoteItems || [], wrote: false, staleRemote: [], historyItems: [] };
    }
    var histItems = logic.reconcileActiveItems(locals, openShiftEvents());
    if (typeof logic.trustActiveItems === 'function') {
      var trusted = logic.trustActiveItems(remoteItems || [], histItems);
      return { items: trusted.items, wrote: false, staleRemote: trusted.staleRemote || [], historyItems: histItems };
    }
    return { items: histItems, wrote: false, staleRemote: [], historyItems: histItems };
  }

  /**
   * Only persist a reconcile when history rebuild is unambiguous relative to
   * the remote doc: every remote firm item is explained by history, and we are
   * online. Never invent events. Stale remote-only items may be dropped by
   * writing the history-derived set.
   */
  function shouldAutoRepairStale(remoteItems, historyItems) {
    var logic = lib();
    if (!logic || typeof logic.trustActiveItems !== 'function') return false;
    // Without loaded workday history there is no evidence the remote doc is stale.
    // An empty local list must not wipe a healthy canonical active document.
    if (!Array.isArray(historyItems) || !localRecords().length) return false;
    var trusted = logic.trustActiveItems(remoteItems || [], historyItems || []);
    return Array.isArray(trusted.staleRemote) && trusted.staleRemote.length > 0;
  }

  async function loadInner() {
    applyCache(readCache());
    if (offline()) {
      cache.loaded = true;
      return { status: cache.items.length ? 'loadedFromLocalCache' : 'empty', items: cache.items, syncStatus: cache.syncStatus };
    }
    if (cache.pendingEvents.length) {
      var flushed = await flushPending();
      cache.loaded = true;
      return { status: flushed.status === 'savedOnline' ? 'loadedFromFirestore' : 'loadedPending', items: cache.items, syncStatus: cache.syncStatus };
    }
    var ref = docRef();
    if (!ref) {
      cache.loaded = true;
      return { status: 'empty', items: cache.items, syncStatus: cache.syncStatus };
    }
    try {
      var snap = await ref.get();
      var pendingWrites = !!(snap && snap.metadata && snap.metadata.hasPendingWrites);
      var data = snap && snap.exists ? snap.data() : { items: [], syncVersion: 0 };
      if (pendingWrites) {
        cache.syncStatus = 'pending';
        cache.loaded = true;
        writeCache();
        return { status: 'loadedPending', items: cache.items, syncStatus: 'pending' };
      }
      var soft = softReconcileDisplay(data && data.items ? data.items : []);
      cache.items = soft.items;
      cache.loaded = true;
      writeCache();
      // Auto-repair only clear stale remote rows (present remotely, absent in history).
      if (!offline() && shouldAutoRepairStale(data && data.items, soft.historyItems)) {
        try { reconcile({ reason: 'stale-remote-repair', records: localRecords() }); } catch (_) {}
      }
      return { status: 'loadedFromFirestore', items: cache.items, syncStatus: 'synced', staleRemote: soft.staleRemote };
    } catch (error) {
      cache.loaded = true;
      return { status: cache.items.length ? 'loadedFromLocalCache' : 'empty', items: cache.items, syncStatus: cache.syncStatus, error: error };
    }
  }

  function subscribe() {
    var ref = docRef();
    if (!ref || typeof ref.onSnapshot !== 'function' || unsubscribe) return;
    unsubscribe = ref.onSnapshot(function (snap) {
      if (cache.pendingEvents.length) return;
      var pendingWrites = !!(snap && snap.metadata && snap.metadata.hasPendingWrites);
      var data = snap && snap.exists ? snap.data() : { items: [], syncVersion: 0 };
      rememberRemote(data, pendingWrites);
      rerender();
    });
  }

  async function commitEvent(event, source) {
    var logic = lib();
    if (!logic || !event) return { status: 'failed', error: new Error('no_event') };
    source = Object.assign({ persisted: false }, source || {});
    cache.items = logic.applyEventToItems(cache.items, event, source);
    if (offline() || !docRef()) {
      cache.pendingEvents.push({ event: event, source: source || null });
      cache.syncStatus = 'pending';
      cache.loaded = true;
      writeCache();
      rerender();
      return { status: 'savedPendingSync', items: cache.items, syncStatus: 'pending' };
    }
    try {
      var result = await transactionApply(event, source);
      if (!result || result.status !== 'savedOnline') {
        cache.pendingEvents.push({ event: event, source: source });
        cache.syncStatus = 'pending';
        writeCache();
      }
      rerender();
      return result && result.status ? result : { status: 'failed', items: cache.items, syncStatus: cache.syncStatus };
    } catch (error) {
      cache.pendingEvents.push({ event: event, source: source || null });
      cache.syncStatus = 'pending';
      writeCache();
      return { status: 'failed', items: cache.items, syncStatus: 'pending', error: error };
    }
  }

  async function reconcile(options) {
    options = options || {};
    var logic = lib();
    if (!logic) return { status: 'failed', error: new Error('no_lib') };
    var records;
    try {
      records = options.records || await fetchAllRecords();
    } catch (error) {
      records = localRecords();
    }
    var open = options.openShiftEvents != null ? options.openShiftEvents : openShiftEvents();
    var items = logic.reconcileActiveItems(records, open);
    cache.pendingEvents = [];
    cache.items = items;
    if (offline() || !docRef()) {
      cache.syncStatus = 'pending';
      cache.loaded = true;
      writeCache();
      rerender();
      return { status: 'savedPendingSync', items: items, syncStatus: 'pending' };
    }
    var ref = docRef();
    var database = db();
    try {
      var written = null;
      await database.runTransaction(function (tx) {
        return tx.get(ref).then(function (snap) {
          var prev = snap && snap.exists && snap.data() ? snap.data() : {};
          var version = typeof prev.syncVersion === 'number' ? prev.syncVersion : 0;
          var open = options.openShiftEvents != null ? options.openShiftEvents : openShiftEvents();
          var merged = logic.mergeInProgressItems(items, prev.items || [], open);
          written = buildPayload(merged, version + 1);
          tx.set(ref, written);
        });
      });
      rememberRemote(written, false);
      rerender();
      return { status: 'savedOnline', items: cache.items, syncStatus: 'synced' };
    } catch (error) {
      cache.syncStatus = 'pending';
      writeCache();
      return { status: 'failed', items: items, syncStatus: 'pending', error: error };
    }
  }

  async function ensureHistory() {
    if (historyRecords && historyPromise == null) return historyRecords;
    if (historyPromise) return historyPromise;
    historyPromise = fetchAllRecords().catch(function () {
      historyComplete = false;
      return localRecords();
    }).finally(function () { historyPromise = null; });
    return historyPromise;
  }

  function getItems() {
    return cache.items.slice();
  }

  function getHistoryRecords() {
    return historyRecords || localRecords();
  }

  function isHistoryComplete() {
    return !!historyComplete;
  }

  function isLoaded() {
    return cache.loaded;
  }

  function getSyncStatus() {
    return cache.syncStatus;
  }

  var api = {
    DOC_ID: DOC_ID,
    PATH: 'users/{uid}/state/' + DOC_ID,
    load: load,
    subscribe: subscribe,
    commitEvent: commitEvent,
    reconcile: reconcile,
    flushPending: flushPending,
    ensureHistory: ensureHistory,
    getItems: getItems,
    getHistoryRecords: getHistoryRecords,
    isHistoryComplete: isHistoryComplete,
    isLoaded: isLoaded,
    getSyncStatus: getSyncStatus
  };

  global.TrailerContainerActive = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
