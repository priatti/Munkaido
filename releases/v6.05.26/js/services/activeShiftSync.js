/**
 * GuriGO – aktív műszak offline-aware szinkron (Firestore state/activeShift + localStorage cache).
 */
(function () {
  console.log('[activeShiftSync.js] loaded build production-swiso-60526');
  var CACHE_PREFIX = 'gurigo_active_shift_cache_v1:';
  var CLEAR_PENDING_PREFIX = 'gurigo_active_shift_clear_pending_v1:';
  var LEGACY_KEY = 'activeShift';

  window._activeShiftClearPending = false;

  function activeShiftCacheKey(uid) {
    return CACHE_PREFIX + String(uid || '');
  }

  function clearPendingKey(uid) {
    return CLEAR_PENDING_PREFIX + String(uid || '');
  }

  function hasActiveShiftData(obj) {
    return !!(obj && obj.date && obj.startTime);
  }

  function crossingApi() {
    return window.GurigoCrossingMerge || null;
  }

  function mergeCrossingLists(a, b) {
    var api = crossingApi();
    if (api && typeof api.mergeCrossingLists === 'function') return api.mergeCrossingLists(a, b);
    var out = [];
    var seen = {};
    function add(list) {
      (Array.isArray(list) ? list : []).forEach(function (item) {
        if (!item) return;
        var k;
        try { k = typeof item === 'object' ? JSON.stringify(item) : String(item); }
        catch (_) { k = String(item && item.from) + '|' + String(item && item.to) + '|' + String(item && item.time); }
        if (seen[k]) return;
        seen[k] = true;
        out.push(item);
      });
    }
    add(a);
    add(b);
    return out;
  }

  function normalizeShiftCrossings(shift) {
    var api = crossingApi();
    if (api && typeof api.normalizeShiftCrossings === 'function') {
      return api.normalizeShiftCrossings(shift);
    }
    if (!shift || typeof shift !== 'object') return shift;
    shift.crossings = mergeCrossingLists(shift.crossings, shift.borderCrossings);
    if (Object.prototype.hasOwnProperty.call(shift, 'borderCrossings')) delete shift.borderCrossings;
    return shift;
  }

  function applyMergedCrossings(target, merged) {
    if (!target || !merged) return;
    target.crossings = Array.isArray(merged.crossings) ? merged.crossings : [];
    target.crossingTombstones = Array.isArray(merged.crossingTombstones) ? merged.crossingTombstones : [];
    if (Object.prototype.hasOwnProperty.call(target, 'borderCrossings')) delete target.borderCrossings;
  }

  function getDeviceId() {
    return typeof window.getGurigoDeviceId === 'function' ? window.getGurigoDeviceId() : 'dev_unknown';
  }

  function enrichActiveShiftClientFields(shift, options) {
    if (!shift || typeof shift !== 'object') return shift;
    options = options || {};
    var now = new Date();
    var ms = now.getTime();
    var deviceId = getDeviceId();
    var out = Object.assign({}, shift);
    // Stale retries must not mint a newer watermark than the remote they might overwrite.
    // Callers that already merged to a fresh document pass bumpTimestamp:true (default).
    if (options.bumpTimestamp !== false) {
      out.clientUpdatedAt = now.toISOString();
      out.clientUpdatedAtMs = ms;
      out.updatedByDeviceId = deviceId;
      var prev = typeof shift.syncVersion === 'number' ? shift.syncVersion : 0;
      out.syncVersion = prev + 1;
    } else {
      if (out.clientUpdatedAtMs == null) out.clientUpdatedAtMs = ms;
      if (!out.clientUpdatedAt) out.clientUpdatedAt = now.toISOString();
      if (!out.updatedByDeviceId) out.updatedByDeviceId = deviceId;
    }
    return out;
  }

  function trailerLib() {
    return window.TrailerContainerLog || null;
  }

  function mergeEventListsSafe(a, b) {
    var lib = trailerLib();
    if (lib && typeof lib.mergeEventLists === 'function') {
      return lib.mergeEventLists(a, b);
    }
    var out = [];
    var seen = {};
    function add(list) {
      (Array.isArray(list) ? list : []).forEach(function (ev) {
        if (!ev) return;
        var key = (ev.eventId ? 'id:' + ev.eventId : 'fp:' + JSON.stringify(ev));
        if (seen[key]) return;
        seen[key] = true;
        out.push(ev);
      });
    }
    add(a);
    add(b);
    return out;
  }

  /**
   * Merge two activeShift documents for the same logical shift.
   * Protects trailerContainerEvents and never drops fields that exist only on one side.
   * @returns {{ ok: true, shift: object } | { ok: false, reason: string, shift?: object }}
   */
  function mergeActiveShiftDocuments(localShift, remoteShift, options) {
    options = options || {};
    var localOk = hasActiveShiftData(localShift);
    var remoteOk = hasActiveShiftData(remoteShift);

    if (options.rejectIfRemoteCleared && options.isRetry && !remoteOk) {
      return { ok: false, reason: 'remote_cleared', shift: null };
    }
    if (!localOk && !remoteOk) return { ok: true, shift: null };
    if (!localOk) return { ok: true, shift: remoteShift };
    if (!remoteOk) return { ok: true, shift: localShift };

    var sameId = localShift.id != null && remoteShift.id != null &&
      String(localShift.id) === String(remoteShift.id);
    var sameStart = String(localShift.date || '') === String(remoteShift.date || '') &&
      String(localShift.startTime || '') === String(remoteShift.startTime || '');
    var sameShift = sameId || sameStart;

    var localMs = typeof localShift.clientUpdatedAtMs === 'number' ? localShift.clientUpdatedAtMs : 0;
    var remoteMs = typeof remoteShift.clientUpdatedAtMs === 'number' ? remoteShift.clientUpdatedAtMs : 0;

    if (!sameShift) {
      // Retries must never overwrite a different remote shift (even if local watermark looks newer).
      if (options.isRetry) {
        return { ok: false, reason: 'stale_different_shift', shift: remoteShift };
      }
      return { ok: true, shift: localMs >= remoteMs ? localShift : remoteShift };
    }

    var newer = remoteMs >= localMs ? remoteShift : localShift;
    var older = remoteMs >= localMs ? localShift : remoteShift;
    var merged = Object.assign({}, older, newer);

    // Never lose fields that exist only on the older side.
    Object.keys(older).forEach(function (key) {
      if (merged[key] === undefined && older[key] !== undefined) {
        merged[key] = older[key];
      }
    });

    merged.trailerContainerEvents = mergeEventListsSafe(
      older.trailerContainerEvents,
      newer.trailerContainerEvents
    );

    // Crossings: id-union + tombstones (GurigoCrossingMerge). Never LWW-wipe, never
    // resurrect intentionally deleted ids; empty incomplete snapshots keep older data.
    var api = crossingApi();
    if (api && typeof api.mergeActiveShiftCrossings === 'function') {
      applyMergedCrossings(merged, api.mergeActiveShiftCrossings(older, newer));
    } else {
      merged.crossings = mergeCrossingLists(
        mergeCrossingLists(older.crossings, older.borderCrossings),
        mergeCrossingLists(newer.crossings, newer.borderCrossings)
      );
      if (Object.prototype.hasOwnProperty.call(merged, 'borderCrossings')) delete merged.borderCrossings;
    }

    // Array fields that are append-ish: keep union when both present (best-effort).
    ['breaks', 'notes'].forEach(function (arrKey) {
      if (Array.isArray(older[arrKey]) || Array.isArray(newer[arrKey])) {
        var a = Array.isArray(older[arrKey]) ? older[arrKey] : [];
        var b = Array.isArray(newer[arrKey]) ? newer[arrKey] : [];
        if (a.length || b.length) {
          var seen = {};
          var union = [];
          a.concat(b).forEach(function (item) {
            var k = typeof item === 'object' ? JSON.stringify(item) : String(item);
            if (seen[k]) return;
            seen[k] = true;
            union.push(item);
          });
          merged[arrKey] = union;
        }
      }
    });

    merged.clientUpdatedAtMs = Math.max(localMs, remoteMs);
    if (!merged.clientUpdatedAt) {
      merged.clientUpdatedAt = newer.clientUpdatedAt || older.clientUpdatedAt || new Date(merged.clientUpdatedAtMs).toISOString();
    }
    return { ok: true, shift: merged };
  }

  function activeShiftRef(uid) {
    return window.db.collection('users').doc(uid).collection('state').doc('activeShift');
  }

  async function readRemoteActiveShift(uid) {
    if (!uid || !window.db) return null;
    try {
      var snap = await activeShiftRef(uid).get();
      if (!snap || !snap.exists) return null;
      var data = snap.data();
      return hasActiveShiftData(data) ? data : null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Write local shift merged with remote. Uses a transaction when available.
   */
  async function writeMergedActiveShiftToFirestore(uid, shift, options) {
    options = options || {};
    var ref = activeShiftRef(uid);

    if (typeof window.db.runTransaction === 'function') {
      var written = null;
      await window.db.runTransaction(function (tx) {
        return tx.get(ref).then(function (snap) {
          var remote = snap && snap.exists && hasActiveShiftData(snap.data()) ? snap.data() : null;
          if (options.isRetry && readClearPendingFlag(uid) && !remote) {
            var err = new Error('clear_pending_no_resurrect');
            err.code = 'clear_pending_no_resurrect';
            throw err;
          }
          if (options.isRetry && options.rejectIfRemoteCleared && !remote) {
            var err2 = new Error('remote_cleared');
            err2.code = 'remote_cleared';
            throw err2;
          }
          var merged = mergeActiveShiftDocuments(shift, remote, options);
          if (!merged.ok) {
            var err3 = new Error(merged.reason || 'merge_rejected');
            err3.code = merged.reason || 'merge_rejected';
            throw err3;
          }
          var enriched = enrichActiveShiftClientFields(merged.shift, { bumpTimestamp: true });
          // Ensure watermark advances past both parents.
          var maxParent = Math.max(
            typeof shift.clientUpdatedAtMs === 'number' ? shift.clientUpdatedAtMs : 0,
            remote && typeof remote.clientUpdatedAtMs === 'number' ? remote.clientUpdatedAtMs : 0
          );
          if (enriched.clientUpdatedAtMs <= maxParent) {
            enriched.clientUpdatedAtMs = maxParent + 1;
            enriched.clientUpdatedAt = new Date(enriched.clientUpdatedAtMs).toISOString();
          }
          written = enriched;
          var payload = buildFirestoreActiveShiftPayload(enriched);
          var cmGuard = crossingApi();
          if (remote && cmGuard && typeof cmGuard.isUnsafeEmptyCrossingsOverwrite === 'function' &&
              cmGuard.isUnsafeEmptyCrossingsOverwrite(remote, payload)) {
            console.error('[activeShiftSync] crossings-guard refused empty overwrite');
            var errGuard = new Error('crossings_guard_empty_overwrite');
            errGuard.code = 'crossings_guard_empty_overwrite';
            throw errGuard;
          }
          tx.set(ref, payload);
        });
      });
      return written;
    }

    var remote = await readRemoteActiveShift(uid);
    if (options.isRetry && readClearPendingFlag(uid) && !remote) {
      var e = new Error('clear_pending_no_resurrect');
      e.code = 'clear_pending_no_resurrect';
      throw e;
    }
    if (options.isRetry && options.rejectIfRemoteCleared && !remote) {
      var e2 = new Error('remote_cleared');
      e2.code = 'remote_cleared';
      throw e2;
    }
    var merged2 = mergeActiveShiftDocuments(shift, remote, options);
    if (!merged2.ok) {
      var e3 = new Error(merged2.reason || 'merge_rejected');
      e3.code = merged2.reason || 'merge_rejected';
      throw e3;
    }
    var enriched2 = enrichActiveShiftClientFields(merged2.shift, { bumpTimestamp: true });
    await ref.set(buildFirestoreActiveShiftPayload(enriched2));
    return enriched2;
  }

  function syncLegacyActiveShiftKey(shift) {
    try {
      if (hasActiveShiftData(shift)) {
        localStorage.setItem(LEGACY_KEY, JSON.stringify(shift));
      } else {
        localStorage.removeItem(LEGACY_KEY);
      }
    } catch (_) {}
  }

  function setClearPendingFlag(uid, value, closedShift) {
    window._activeShiftClearPending = !!value;
    if (!uid) return;
    try {
      if (value) {
        var meta = { pending: true, atMs: Date.now() };
        if (closedShift && typeof closedShift === 'object') {
          try {
            meta.closedShift = JSON.parse(JSON.stringify(closedShift));
          } catch (_) {}
        }
        localStorage.setItem(clearPendingKey(uid), JSON.stringify(meta));
      } else {
        localStorage.removeItem(clearPendingKey(uid));
      }
    } catch (_) {}
  }

  function readClearPendingFlag(uid) {
    if (window._activeShiftClearPending) return true;
    if (!uid) return false;
    try {
      return !!localStorage.getItem(clearPendingKey(uid));
    } catch (_) {
      return false;
    }
  }

  function restoreClearPendingFromStorage(uid) {
    if (!uid) return;
    window._activeShiftClearPending = readClearPendingFlag(uid);
  }

  function writeActiveShiftLocalCache(uid, shift, meta) {
    meta = meta || {};
    try {
      if (!uid) {
        syncLegacyActiveShiftKey(shift);
        return;
      }
      var key = activeShiftCacheKey(uid);
      if (!hasActiveShiftData(shift)) {
        localStorage.removeItem(key);
        syncLegacyActiveShiftKey(null);
        return;
      }
      var prev = readActiveShiftLocalCache(uid);
      var now = new Date();
      var nowMs = now.getTime();
      var deviceId = shift.updatedByDeviceId || getDeviceId();
      var pendingSync = meta.pendingSync !== undefined ? !!meta.pendingSync : !!(prev && prev.pendingSync);
      var shiftData = Object.assign({}, shift);
      if (meta.pendingSync !== undefined) shiftData.pendingSync = !!meta.pendingSync;
      if (meta.syncStatus) shiftData.syncStatus = meta.syncStatus;
      if (meta.createdOffline !== undefined) shiftData.createdOffline = !!meta.createdOffline;
      if (meta.createdOfflineAtMs != null) shiftData.createdOfflineAtMs = meta.createdOfflineAtMs;
      if (meta.offlineOriginDeviceId) shiftData.offlineOriginDeviceId = meta.offlineOriginDeviceId;
      if (meta.lastAttemptAtMs != null) shiftData.lastAttemptAtMs = meta.lastAttemptAtMs;
      if (meta.lastSuccessfulSyncAtMs != null) shiftData.lastSuccessfulSyncAtMs = meta.lastSuccessfulSyncAtMs;
      if (meta.lastError != null) shiftData.lastError = meta.lastError;
      var entry = {
        cachedAt: nowMs,
        uid: uid,
        id: shift.id || (prev && prev.id) || null,
        data: shiftData,
        clientUpdatedAt: shift.clientUpdatedAt || now.toISOString(),
        clientUpdatedAtMs: shift.clientUpdatedAtMs || nowMs,
        updatedByDeviceId: deviceId,
        pendingSync: pendingSync,
        syncStatus: meta.syncStatus || (pendingSync ? 'pending' : 'synced'),
        createdOffline: meta.createdOffline !== undefined ? !!meta.createdOffline : !!(prev && prev.createdOffline),
        createdOfflineAtMs: meta.createdOfflineAtMs || (prev && prev.createdOfflineAtMs) || null,
        offlineOriginDeviceId: meta.offlineOriginDeviceId || (prev && prev.offlineOriginDeviceId) || deviceId,
        lastAttemptAtMs: meta.lastAttemptAtMs || nowMs,
        lastSuccessfulSyncAtMs: meta.lastSuccessfulSyncAtMs !== undefined
          ? meta.lastSuccessfulSyncAtMs
          : (prev && prev.lastSuccessfulSyncAtMs) || null,
        lastError: meta.lastError !== undefined ? meta.lastError : (prev && prev.lastError) || null
      };
      localStorage.setItem(key, JSON.stringify(entry));
      syncLegacyActiveShiftKey(shift);
    } catch (e) {
      console.warn('[ActiveShiftSync] cache write failed:', e && e.message);
    }
  }

  function readActiveShiftLocalCache(uid) {
    if (!uid) return null;
    try {
      var raw = localStorage.getItem(activeShiftCacheKey(uid));
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || parsed.uid !== uid || !hasActiveShiftData(parsed.data)) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function readActiveShiftLocalCacheQuick(uid) {
    return readActiveShiftLocalCache(uid);
  }

  function clearActiveShiftLocalCache(uid) {
    try {
      if (uid) localStorage.removeItem(activeShiftCacheKey(uid));
      localStorage.removeItem(LEGACY_KEY);
    } catch (_) {}
  }

  function applyActiveShiftToWindow(shift) {
    window.activeShift = hasActiveShiftData(shift) ? shift : null;
    syncLegacyActiveShiftKey(window.activeShift);
    try { if (typeof window.updateActiveShiftIndicator === 'function') window.updateActiveShiftIndicator(); } catch (_) {}
    try { if (typeof renderStartTab === 'function') renderStartTab(); } catch (_) {}
    try { if (typeof renderTachographStatusCard === 'function') renderTachographStatusCard(); } catch (_) {}
    try { if (typeof render90hWeekendRestCard === 'function') render90hWeekendRestCard(); } catch (_) {}
  }

  function resolveActiveShiftSaveStatus(opts) {
    if (opts && opts.error) return 'failed';
    if (opts && (opts.offline || opts.hasPendingWrites)) return 'savedPendingSync';
    return 'savedOnline';
  }

  function resolveActiveShiftClearStatus(opts) {
    if (opts && opts.error) return 'failed';
    if (opts && (opts.offline || opts.hasPendingWrites)) return 'clearedPendingSync';
    return 'clearedOnline';
  }

  function buildFirestoreActiveShiftPayload(shift) {
    var payload = Object.assign({}, shift);
    normalizeShiftCrossings(payload);
    var fv = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
      ? firebase.firestore.FieldValue
      : null;
    if (fv && fv.serverTimestamp) payload.updatedAt = fv.serverTimestamp();
    return payload;
  }

  function firestoreDeleteActiveShift(uid) {
    return window.db.collection('users').doc(uid).collection('state').doc('activeShift').delete().catch(function () {
      return window.db.collection('users').doc(uid).collection('state').doc('activeShift').set({}, { merge: true });
    });
  }

  async function saveActiveShiftOfflineAware(shift, saveOptions) {
    saveOptions = saveOptions || {};
    var isRetry = !!saveOptions.isRetry;
    var uid = window.currentUser && window.currentUser.uid;
    if (!hasActiveShiftData(shift)) {
      return clearActiveShiftOfflineAware();
    }

    // A stale retry must never clear the shift-close pending flag or resurrect a closed shift.
    if (isRetry && uid && readClearPendingFlag(uid)) {
      console.log('[ActiveShiftSync] save result: skipped_clear_pending');
      return { status: 'skipped_clear_pending', shift: null };
    }

    // Merge with fresher local cache before enrich (covers offline multi-append on one device).
    if (uid) {
      var localEntry0 = readActiveShiftLocalCache(uid);
      if (localEntry0 && localEntry0.data && hasActiveShiftData(localEntry0.data)) {
        var localMerge = mergeActiveShiftDocuments(shift, localEntry0.data, { isRetry: isRetry });
        if (localMerge.ok && localMerge.shift) shift = localMerge.shift;
      }
    }

    shift = enrichActiveShiftClientFields(shift, { bumpTimestamp: !isRetry });
    if (!isRetry) {
      setClearPendingFlag(uid, false);
    }

    var offline = typeof navigator !== 'undefined' && !navigator.onLine;
    var prevEntry = uid ? readActiveShiftLocalCache(uid) : null;
    var isNewOffline = offline && !prevEntry;
    var deviceId = getDeviceId();
    var cacheMeta = {
      pendingSync: offline,
      syncStatus: offline ? 'pending' : 'synced',
      createdOffline: isNewOffline || !!(prevEntry && prevEntry.createdOffline),
      createdOfflineAtMs: isNewOffline ? Date.now() : (prevEntry && prevEntry.createdOfflineAtMs) || null,
      offlineOriginDeviceId: (prevEntry && prevEntry.offlineOriginDeviceId) || deviceId,
      lastAttemptAtMs: Date.now()
    };

    writeActiveShiftLocalCache(uid, shift, cacheMeta);
    applyActiveShiftToWindow(shift);
    if (offline) {
      var verifyEntry = uid ? readActiveShiftLocalCache(uid) : null;
      if (uid && (!verifyEntry || !verifyEntry.pendingSync || !verifyEntry.data)) {
        console.log('[ActiveShiftSync] save result: failed');
        applyActiveShiftToWindow(null);
        return { status: 'failed', shift: shift, error: new Error('local_cache_write_failed') };
      }
      console.log('[ActiveShiftSync] saved to local pending');
    }

    if (!uid || !window.db) {
      var localOnlyStatus = offline ? 'savedPendingSync' : 'savedOnline';
      console.log('[ActiveShiftSync] save result:', localOnlyStatus);
      return { status: localOnlyStatus, shift: shift };
    }

    var writeOpts = {
      isRetry: isRetry,
      rejectIfRemoteCleared: isRetry
    };

    if (offline) {
      // Best-effort queued write; merge happens on reconnect via syncPending / retry.
      writeMergedActiveShiftToFirestore(uid, shift, writeOpts).catch(function (error) {
        console.warn('[ActiveShiftSync] Firestore write queued/attempted, error:', error && error.message);
        if (error && (error.code === 'clear_pending_no_resurrect' || error.code === 'remote_cleared')) {
          return;
        }
        writeActiveShiftLocalCache(uid, shift, {
          pendingSync: true,
          syncStatus: 'failed',
          lastError: error && error.message ? error.message : String(error),
          lastAttemptAtMs: Date.now()
        });
        if (typeof window.addFailedActiveShiftSyncItem === 'function') {
          window.addFailedActiveShiftSyncItem({
            op: 'saveActiveShift',
            payload: JSON.parse(JSON.stringify(shift)),
            error: error,
            updatedByDeviceId: deviceId
          });
        }
        if (typeof window.updateSyncRetryBanner === 'function') window.updateSyncRetryBanner();
      });
      console.log('[ActiveShiftSync] Firestore write queued/attempted');
      if (typeof window.updateConnectionStatus === 'function') window.updateConnectionStatus();
      console.log('[ActiveShiftSync] save result: savedPendingSync');
      return { status: 'savedPendingSync', shift: shift };
    }

    try {
      var written = await writeMergedActiveShiftToFirestore(uid, shift, writeOpts);
      var status = resolveActiveShiftSaveStatus({ offline: false });
      writeActiveShiftLocalCache(uid, written || shift, {
        pendingSync: false,
        syncStatus: 'synced',
        lastSuccessfulSyncAtMs: Date.now(),
        lastError: null
      });
      applyActiveShiftToWindow(written || shift);
      if (typeof window.updateSyncRetryBanner === 'function') window.updateSyncRetryBanner();
      console.log('[ActiveShiftSync] save result: savedOnline');
      return { status: status, shift: written || shift };
    } catch (error) {
      if (error && (error.code === 'clear_pending_no_resurrect' || error.code === 'remote_cleared' || error.code === 'stale_different_shift')) {
        console.log('[ActiveShiftSync] save result: skipped_stale', error.code);
        return { status: 'skipped_stale', shift: null, error: error };
      }
      console.error('[ActiveShiftSync] save failed:', error);
      writeActiveShiftLocalCache(uid, shift, {
        pendingSync: true,
        syncStatus: 'failed',
        lastError: error && error.message ? error.message : String(error),
        lastAttemptAtMs: Date.now()
      });
      if (typeof window.addFailedActiveShiftSyncItem === 'function') {
        window.addFailedActiveShiftSyncItem({
          op: 'saveActiveShift',
          payload: JSON.parse(JSON.stringify(shift)),
          error: error,
          updatedByDeviceId: deviceId
        });
      }
      if (typeof window.updateSyncRetryBanner === 'function') window.updateSyncRetryBanner();
      console.log('[ActiveShiftSync] save result: failed');
      return { status: 'failed', shift: shift, error: error };
    }
  }

  async function loadActiveShiftOfflineAware() {
    var uid = window.currentUser && window.currentUser.uid;
    if (!uid) {
      applyActiveShiftToWindow(null);
      return { status: 'empty', shift: null };
    }

    restoreClearPendingFromStorage(uid);

    if (readClearPendingFlag(uid)) {
      applyActiveShiftToWindow(null);
      return { status: 'clearedPendingSync', shift: null };
    }

    var localEntry = readActiveShiftLocalCache(uid);
    var offline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (offline) {
      var cachedShift = localEntry && localEntry.data ? localEntry.data : null;
      applyActiveShiftToWindow(cachedShift);
      return { status: cachedShift ? 'loadedFromLocalCache' : 'empty', shift: cachedShift };
    }

    try {
      var snap = await window.db.collection('users').doc(uid).collection('state').doc('activeShift').get();
      var fsData = snap.exists && hasActiveShiftData(snap.data()) ? snap.data() : null;

      if (fsData) {
        writeActiveShiftLocalCache(uid, fsData, { pendingSync: false, syncStatus: 'synced' });
        applyActiveShiftToWindow(fsData);
        return { status: 'loadedFromFirestore', shift: fsData };
      }

      if (localEntry && localEntry.pendingSync && localEntry.data) {
        applyActiveShiftToWindow(localEntry.data);
        return { status: 'loadedFromLocalCache', shift: localEntry.data };
      }

      applyActiveShiftToWindow(null);
      writeActiveShiftLocalCache(uid, null);
      return { status: 'empty', shift: null };
    } catch (error) {
      console.warn('[ActiveShiftSync] Firestore load failed, using cache:', error && error.message);
      var fallback = localEntry && localEntry.data ? localEntry.data : null;
      applyActiveShiftToWindow(fallback);
      return { status: fallback ? 'loadedFromLocalCache' : 'empty', shift: fallback, error: error };
    }
  }

  async function clearActiveShiftOfflineAware(clearOptions) {
    clearOptions = clearOptions || {};
    var isRetry = !!clearOptions.isRetry;
    var uid = window.currentUser && window.currentUser.uid;
    var offline = typeof navigator !== 'undefined' && !navigator.onLine;
    var previousShift = window.activeShift;
    if (!previousShift && uid) {
      var prevEntry = readActiveShiftLocalCache(uid);
      if (prevEntry && prevEntry.data) previousShift = prevEntry.data;
    }
    if (isRetry && clearOptions.closedShiftPayload && hasActiveShiftData(clearOptions.closedShiftPayload)) {
      previousShift = clearOptions.closedShiftPayload;
    }

    // Stale clear retry must not wipe a newer shift created by another device.
    if (isRetry && uid && window.db && !offline) {
      try {
        var remoteNow = await readRemoteActiveShift(uid);
        if (remoteNow) {
          var closed = previousShift && hasActiveShiftData(previousShift) ? previousShift : null;
          var sameId = closed && closed.id != null && remoteNow.id != null &&
            String(closed.id) === String(remoteNow.id);
          var sameStart = closed &&
            String(closed.date || '') === String(remoteNow.date || '') &&
            String(closed.startTime || '') === String(remoteNow.startTime || '');
          var remoteMs = typeof remoteNow.clientUpdatedAtMs === 'number' ? remoteNow.clientUpdatedAtMs : 0;
          var closedMs = closed && typeof closed.clientUpdatedAtMs === 'number' ? closed.clientUpdatedAtMs : 0;
          var failedAt = typeof clearOptions.failedAt === 'number' ? clearOptions.failedAt : 0;
          if (!closed || (!sameId && !sameStart) || remoteMs > closedMs || (failedAt && remoteMs > failedAt)) {
            setClearPendingFlag(uid, false);
            console.log('[ActiveShiftSync] clear result: skipped_stale newer_remote');
            return { status: 'skipped_stale', shift: remoteNow };
          }
        }
      } catch (probeErr) {
        // Fail closed: do not delete when we cannot verify the remote is still the closed shift.
        console.warn('[ActiveShiftSync] clear retry probe failed (skip delete):', probeErr && probeErr.message);
        setClearPendingFlag(uid, false);
        return { status: 'skipped_stale', shift: null, error: probeErr };
      }
    }

    setClearPendingFlag(uid, true, previousShift);
    applyActiveShiftToWindow(null);
    clearActiveShiftLocalCache(uid);

    if (!uid || !window.db) {
      if (typeof window.updateSyncRetryBanner === 'function') window.updateSyncRetryBanner();
      if (typeof window.updateConnectionStatus === 'function') window.updateConnectionStatus();
      return { status: offline ? 'clearedPendingSync' : 'clearedOnline', shift: null };
    }

    // Offline: do NOT enqueue an unprobed Firestore delete (SDK LWW could wipe a newer
    // remote shift on reconnect). Rely on clearPending + syncPendingActiveShiftClearIfNeeded
    // which probes before delete.
    if (offline) {
      if (typeof window.addFailedActiveShiftSyncItem === 'function') {
        window.addFailedActiveShiftSyncItem({
          op: 'clearActiveShift',
          payload: previousShift ? JSON.parse(JSON.stringify(previousShift)) : null,
          error: new Error('offline_clear_pending_probe_required'),
          updatedByDeviceId: getDeviceId()
        });
      }
      console.log('[ActiveShiftSync] clear', 'clearedPendingSync');
      if (typeof window.updateSyncRetryBanner === 'function') window.updateSyncRetryBanner();
      if (typeof window.updateConnectionStatus === 'function') window.updateConnectionStatus();
      return { status: 'clearedPendingSync', shift: null };
    }

    var deleteOp = firestoreDeleteActiveShift(uid);

    try {
      await deleteOp;
      setClearPendingFlag(uid, false);
      var status = resolveActiveShiftClearStatus({ offline: false });
      console.log('[ActiveShiftSync] clear', status);
      if (typeof window.updateSyncRetryBanner === 'function') window.updateSyncRetryBanner();
      return { status: status, shift: null };
    } catch (error) {
      console.error('[ActiveShiftSync] clear failed:', error);
      setClearPendingFlag(uid, true, previousShift);
      if (typeof window.addFailedActiveShiftSyncItem === 'function') {
        window.addFailedActiveShiftSyncItem({
          op: 'clearActiveShift',
          payload: previousShift ? JSON.parse(JSON.stringify(previousShift)) : null,
          error: error,
          updatedByDeviceId: getDeviceId()
        });
      }
      if (typeof window.updateSyncRetryBanner === 'function') window.updateSyncRetryBanner();
      return { status: 'failed', shift: previousShift || null, error: error };
    }
  }

  async function syncPendingActiveShiftClearIfNeeded(uid) {
    if (!uid || !readClearPendingFlag(uid) || !window.db) {
      return { cleared: false };
    }
    try {
      // Same guard as clear retry: never wipe a newer/different remote shift on reconnect.
      var remoteNow = null;
      try {
        remoteNow = await readRemoteActiveShift(uid);
      } catch (probeErr) {
        console.warn('[ActiveShiftSync] clear pending probe failed:', probeErr && probeErr.message);
        return { cleared: false, error: probeErr, skipped: 'probe_failed' };
      }
      if (remoteNow) {
        // A remote active shift while clear is pending usually means another device started
        // a new shift (or resurrected). Prefer keeping the remote; drop local clear intent.
        var remoteMs = typeof remoteNow.clientUpdatedAtMs === 'number' ? remoteNow.clientUpdatedAtMs : 0;
        var clearMeta = null;
        try {
          clearMeta = JSON.parse(localStorage.getItem(clearPendingKey(uid)) || 'null');
        } catch (_) {}
        var clearAt = clearMeta && typeof clearMeta.atMs === 'number' ? clearMeta.atMs : 0;
        var closed = clearMeta && clearMeta.closedShift && hasActiveShiftData(clearMeta.closedShift)
          ? clearMeta.closedShift
          : null;
        var sameId = closed && closed.id != null && remoteNow.id != null &&
          String(closed.id) === String(remoteNow.id);
        var sameStart = closed &&
          String(closed.date || '') === String(remoteNow.date || '') &&
          String(closed.startTime || '') === String(remoteNow.startTime || '');
        var sameShift = !!(sameId || sameStart);
        // Fail closed: without identity proof, or when remote is newer/different, do not delete.
        if (!closed || !sameShift || !clearAt || remoteMs >= clearAt) {
          setClearPendingFlag(uid, false);
          writeActiveShiftLocalCache(uid, remoteNow, { pendingSync: false, syncStatus: 'synced' });
          applyActiveShiftToWindow(remoteNow);
          console.log('[ActiveShiftSync] clear pending skipped — newer/different remote present');
          return { cleared: false, skipped: sameShift ? 'newer_remote' : 'different_or_unverified' };
        }
      }
      await firestoreDeleteActiveShift(uid);
      setClearPendingFlag(uid, false);
      clearActiveShiftLocalCache(uid);
      applyActiveShiftToWindow(null);
      console.log('[ActiveShiftSync] clear pending synced');
      return { cleared: true };
    } catch (error) {
      console.warn('[ActiveShiftSync] clear pending sync failed:', error && error.message);
      if (typeof window.addFailedActiveShiftSyncItem === 'function') {
        window.addFailedActiveShiftSyncItem({
          op: 'clearActiveShift',
          payload: null,
          error: error,
          updatedByDeviceId: getDeviceId()
        });
      }
      return { cleared: false, error: error };
    }
  }

  async function syncPendingActiveShiftIfNeeded() {
    console.log('[ActiveShiftSync] syncPendingActiveShiftIfNeeded start');
    var uid = window.currentUser && window.currentUser.uid;
    if (!uid || !navigator.onLine || !window.db) {
      return { synced: false, reason: 'not_ready' };
    }

    restoreClearPendingFromStorage(uid);

    var clearResult = await syncPendingActiveShiftClearIfNeeded(uid);
    if (clearResult.error) {
      if (typeof window.updateConnectionStatus === 'function') window.updateConnectionStatus();
      return { synced: false, clearFailed: true, error: clearResult.error };
    }

    if (readClearPendingFlag(uid)) {
      return { synced: false, clearPending: true };
    }

    var entry = readActiveShiftLocalCache(uid);
    if (!entry || !entry.pendingSync || !entry.data) {
      console.log('[ActiveShiftSync] no pending activeShift');
      return { synced: true };
    }

    try {
      var writtenPending = await writeMergedActiveShiftToFirestore(uid, entry.data, {
        isRetry: true,
        rejectIfRemoteCleared: true
      });
      writeActiveShiftLocalCache(uid, writtenPending || entry.data, {
        pendingSync: false,
        syncStatus: 'synced',
        lastSuccessfulSyncAtMs: Date.now(),
        lastError: null
      });
      applyActiveShiftToWindow(writtenPending || entry.data);
      console.log('[ActiveShiftSync] pending activeShift uploaded');
      if (typeof window.updateConnectionStatus === 'function') window.updateConnectionStatus();
      if (typeof window.updateSyncRetryBanner === 'function') window.updateSyncRetryBanner();
      return { synced: true };
    } catch (error) {
      if (error && (error.code === 'clear_pending_no_resurrect' || error.code === 'remote_cleared' || error.code === 'stale_different_shift')) {
        writeActiveShiftLocalCache(uid, null);
        console.log('[ActiveShiftSync] pending activeShift skipped stale:', error.code);
        return { synced: true, skipped: error.code };
      }
      console.warn('[ActiveShiftSync] pending activeShift upload failed:', error && error.message);
      writeActiveShiftLocalCache(uid, entry.data, {
        pendingSync: true,
        syncStatus: 'failed',
        lastAttemptAtMs: Date.now(),
        lastError: error && error.message ? error.message : String(error)
      });
      if (typeof window.addFailedActiveShiftSyncItem === 'function') {
        window.addFailedActiveShiftSyncItem({
          op: 'saveActiveShift',
          payload: JSON.parse(JSON.stringify(entry.data)),
          error: error,
          updatedByDeviceId: getDeviceId()
        });
      }
      if (typeof window.updateConnectionStatus === 'function') window.updateConnectionStatus();
      if (typeof window.updateSyncRetryBanner === 'function') window.updateSyncRetryBanner();
      return { synced: false, error: error };
    }
  }

  function handleActiveShiftSnapshot(snap) {
    if (!window.currentUser) return;
    var uid = window.currentUser.uid;
    restoreClearPendingFromStorage(uid);

    if (readClearPendingFlag(uid)) {
      if (!snap.exists || !hasActiveShiftData(snap.data())) {
        setClearPendingFlag(uid, false);
        applyActiveShiftToWindow(null);
        clearActiveShiftLocalCache(uid);
      }
      return;
    }

    var data = snap.exists && hasActiveShiftData(snap.data()) ? snap.data() : null;
    var fromCache = snap.metadata && snap.metadata.fromCache;
    var pending = snap.metadata && snap.metadata.hasPendingWrites;
    var offline = typeof navigator !== 'undefined' && !navigator.onLine;

    if (!data && fromCache && offline) return;

    if (data) {
      var localEntry = readActiveShiftLocalCache(uid);
      if (typeof window.checkActiveShiftConflictOnRemote === 'function') {
        window.checkActiveShiftConflictOnRemote(data, localEntry);
      }
      
    // Merge same-shift local+remote so multi-device trailer events are not dropped on snapshot apply.
    if (localEntry && localEntry.data && hasActiveShiftData(localEntry.data)) {
      var snapMerge = mergeActiveShiftDocuments(localEntry.data, data, {});
      if (snapMerge.ok && snapMerge.shift) {
        // GUARD: if local watermark is strictly newer and merge kept local events, prefer merged result.
        data = snapMerge.shift;
      }
    }
    // GUARD_NEWER_LOCAL_ANY_SOURCE: never apply an older remote snapshot over a newer local shift
    if (
      localEntry &&
      localEntry.data &&
      typeof localEntry.clientUpdatedAtMs === 'number' &&
      typeof data.clientUpdatedAtMs === 'number' &&
      localEntry.clientUpdatedAtMs > data.clientUpdatedAtMs
    ) {
      var guardMerge = mergeActiveShiftDocuments(localEntry.data, data, {});
      applyActiveShiftToWindow(guardMerge.ok && guardMerge.shift ? guardMerge.shift : localEntry.data);
      return;
    }
      if (
        fromCache &&
        !offline &&
        localEntry &&
        localEntry.data &&
        localEntry.pendingSync &&
        typeof localEntry.clientUpdatedAtMs === 'number' &&
        typeof data.clientUpdatedAtMs === 'number' &&
        localEntry.clientUpdatedAtMs > data.clientUpdatedAtMs
      ) {
        var pendingMerge = mergeActiveShiftDocuments(localEntry.data, data, {});
        applyActiveShiftToWindow(pendingMerge.ok && pendingMerge.shift ? pendingMerge.shift : localEntry.data);
        return;
      }
      if (
        fromCache &&
        !offline &&
        localEntry &&
        localEntry.data &&
        !localEntry.pendingSync &&
        typeof localEntry.clientUpdatedAtMs === 'number' &&
        typeof data.clientUpdatedAtMs === 'number' &&
        localEntry.clientUpdatedAtMs > data.clientUpdatedAtMs
      ) {
        var syncedMerge = mergeActiveShiftDocuments(localEntry.data, data, {});
        applyActiveShiftToWindow(syncedMerge.ok && syncedMerge.shift ? syncedMerge.shift : localEntry.data);
        return;
      }
      writeActiveShiftLocalCache(uid, data, { pendingSync: pending, syncStatus: pending ? 'pending' : 'synced' });
      applyActiveShiftToWindow(data);
    } else if (!pending) {
      var pendingLocal = readActiveShiftLocalCache(uid);
      if (pendingLocal && pendingLocal.pendingSync && pendingLocal.data) {
        applyActiveShiftToWindow(pendingLocal.data);
        return;
      }
      writeActiveShiftLocalCache(uid, null);
      applyActiveShiftToWindow(null);
    }
  }

  window.readActiveShiftLocalCacheQuick = readActiveShiftLocalCacheQuick;
  window.writeActiveShiftLocalCache = writeActiveShiftLocalCache;
  window.clearActiveShiftLocalCache = clearActiveShiftLocalCache;
  window.readClearPendingFlag = readClearPendingFlag;
  window.saveActiveShiftOfflineAware = saveActiveShiftOfflineAware;
  window.loadActiveShiftOfflineAware = loadActiveShiftOfflineAware;
  window.clearActiveShiftOfflineAware = clearActiveShiftOfflineAware;
  window.syncPendingActiveShiftIfNeeded = syncPendingActiveShiftIfNeeded;
  window.handleActiveShiftSnapshot = handleActiveShiftSnapshot;
  window.mergeActiveShiftDocuments = mergeActiveShiftDocuments;
  window.mergeActiveShiftEventLists = mergeEventListsSafe;
  window.mergeActiveShiftCrossingLists = mergeCrossingLists;
  window.normalizeShiftCrossings = normalizeShiftCrossings;
})();
