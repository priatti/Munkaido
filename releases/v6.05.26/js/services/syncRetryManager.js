/**
 * GuriGO – failed sync retry, konfliktusgyanú, 70+ napos pending jelzés.
 * Nem duplikálja a Firestore pending write queue-t – csak tényleges failed műveletek.
 */
(function () {
  var FAILED_WORKDAY_PREFIX = 'gurigo_failed_workday_sync_v1:';
  var FAILED_SHIFT_PREFIX = 'gurigo_failed_active_shift_sync_v1:';
  var PENDING_WORKDAY_PREFIX = 'gurigo_pending_workday_sync_v1:';
  var RECORDS_ACTIVE_DAYS = 70;
  var MAX_RETRY_COUNT = 10;

  window._syncConflictSuspects = window._syncConflictSuspects || {};

  function getUid() {
    return window.currentUser && window.currentUser.uid;
  }

  function getDeviceId() {
    return typeof window.getGurigoDeviceId === 'function' ? window.getGurigoDeviceId() : 'dev_unknown';
  }

  function i18nDict() {
    try {
      if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
        return translations[currentLang] || {};
      }
    } catch (_) {}
    return {};
  }

  function getIsoDateDaysAgo(days) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - days);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[SyncRetry] storage write failed:', e && e.message);
    }
  }

  function failedWorkdayKey(uid) { return FAILED_WORKDAY_PREFIX + uid; }
  function failedShiftKey(uid) { return FAILED_SHIFT_PREFIX + uid; }
  function pendingWorkdayKey(uid) { return PENDING_WORKDAY_PREFIX + uid; }

  function readFailedWorkdayList(uid) {
    var list = readJson(failedWorkdayKey(uid), []);
    return Array.isArray(list) ? list : [];
  }

  function writeFailedWorkdayList(uid, list) {
    writeJson(failedWorkdayKey(uid), list);
    updateSyncRetryBanner();
  }

  function readFailedActiveShiftList(uid) {
    var list = readJson(failedShiftKey(uid), []);
    return Array.isArray(list) ? list : [];
  }

  function writeFailedActiveShiftList(uid, list) {
    writeJson(failedShiftKey(uid), list);
    updateSyncRetryBanner();
  }

  function readExtendedPendingMap(uid) {
    var map = readJson(pendingWorkdayKey(uid), {});
    return map && typeof map === 'object' ? map : {};
  }

  function writeExtendedPendingMap(uid, map) {
    writeJson(pendingWorkdayKey(uid), map);
  }

  function isRecordOutsideActiveWindow(record) {
    if (!record || !record.date) return false;
    var cutoff = window._recordsActiveCutoffDate || getIsoDateDaysAgo(RECORDS_ACTIVE_DAYS);
    return String(record.date) < String(cutoff);
  }

  function makeFailedItemId(op, recordId) {
    return String(op) + ':' + String(recordId || 'activeShift') + ':' + getDeviceId();
  }

  function addFailedWorkdaySyncItem(item) {
    var uid = getUid();
    if (!uid || !item) return;
    var list = readFailedWorkdayList(uid);
    var id = item.id || makeFailedItemId(item.op, item.recordId);
    var existing = list.findIndex(function (x) { return x.id === id; });
    var entry = {
      id: id,
      op: item.op || 'save',
      recordId: String(item.recordId || ''),
      payload: item.payload || null,
      errorMessage: item.errorMessage || (item.error && item.error.message) || 'unknown',
      failedAt: Date.now(),
      retryCount: item.retryCount || 0,
      updatedByDeviceId: item.updatedByDeviceId || getDeviceId()
    };
    if (existing > -1) {
      entry.retryCount = (list[existing].retryCount || 0);
      list[existing] = entry;
    } else {
      list.push(entry);
    }
    writeFailedWorkdayList(uid, list);
    console.warn('[SyncRetry] workday failed item added:', entry.op, entry.recordId);
  }

  function addFailedActiveShiftSyncItem(item) {
    var uid = getUid();
    if (!uid || !item) return;
    var list = readFailedActiveShiftList(uid);
    var id = item.id || makeFailedItemId(item.op, 'activeShift');
    var existing = list.findIndex(function (x) { return x.id === id; });
    var entry = {
      id: id,
      op: item.op || 'saveActiveShift',
      recordId: 'activeShift',
      payload: item.payload || null,
      errorMessage: item.errorMessage || (item.error && item.error.message) || 'unknown',
      failedAt: Date.now(),
      retryCount: item.retryCount || 0,
      updatedByDeviceId: item.updatedByDeviceId || getDeviceId()
    };
    if (existing > -1) {
      entry.retryCount = (list[existing].retryCount || 0);
      list[existing] = entry;
    } else {
      list.push(entry);
    }
    writeFailedActiveShiftList(uid, list);
    console.warn('[SyncRetry] activeShift failed item added:', entry.op);
  }

  function removeFailedWorkdayItem(itemId) {
    var uid = getUid();
    if (!uid) return;
    var list = readFailedWorkdayList(uid).filter(function (x) { return x.id !== itemId; });
    writeFailedWorkdayList(uid, list);
  }

  function removeFailedActiveShiftItem(itemId) {
    var uid = getUid();
    if (!uid) return;
    var list = readFailedActiveShiftList(uid).filter(function (x) { return x.id !== itemId; });
    writeFailedActiveShiftList(uid, list);
  }

  function markExtendedPending(recordId, record, meta) {
    var uid = getUid();
    if (!uid || !recordId) return;
    var map = readExtendedPendingMap(uid);
    map[String(recordId)] = {
      pendingAt: Date.now(),
      isOldRecord: !!(meta && meta.isOldRecord) || isRecordOutsideActiveWindow(record),
      clientUpdatedAtMs: record && record.clientUpdatedAtMs ? record.clientUpdatedAtMs : Date.now(),
      updatedByDeviceId: record && record.updatedByDeviceId ? record.updatedByDeviceId : getDeviceId()
    };
    writeExtendedPendingMap(uid, map);
  }

  function clearExtendedPending(recordId) {
    var uid = getUid();
    if (!uid || !recordId) return;
    var map = readExtendedPendingMap(uid);
    if (map[String(recordId)]) {
      delete map[String(recordId)];
      writeExtendedPendingMap(uid, map);
    }
  }

  function isRecordExtendedPending(recordId) {
    var uid = getUid();
    if (!uid || !recordId) return false;
    var map = readExtendedPendingMap(uid);
    return !!map[String(recordId)];
  }

  function isRecordInSnapshotPending(recordId) {
    return !!(window._recordsPendingSyncIds && window._recordsPendingSyncIds[String(recordId)]);
  }

  function isRecordConflictSuspect(recordId) {
    return !!(window._syncConflictSuspects && window._syncConflictSuspects[String(recordId)]);
  }

  function isActiveShiftConflictSuspect() {
    return !!(window._syncConflictSuspects && window._syncConflictSuspects.activeShift);
  }

  function markRecordConflictSuspect(recordId, reason) {
    if (!recordId) return;
    window._syncConflictSuspects[String(recordId)] = reason || 'possible';
    console.warn('[SyncRetry] conflict suspect:', recordId, reason);
  }

  function markActiveShiftConflictSuspect(reason) {
    window._syncConflictSuspects.activeShift = reason || 'possible';
    console.warn('[SyncRetry] activeShift conflict suspect:', reason);
  }

  function clearRecordConflictSuspect(recordId) {
    if (window._syncConflictSuspects && recordId) delete window._syncConflictSuspects[String(recordId)];
  }

  function checkRecordConflictOnRemote(recordId, remoteData, localHint) {
    if (!recordId || !remoteData) return false;
    var deviceId = getDeviceId();
    var remoteMs = typeof remoteData.clientUpdatedAtMs === 'number' ? remoteData.clientUpdatedAtMs : 0;
    var localMs = localHint && typeof localHint.clientUpdatedAtMs === 'number' ? localHint.clientUpdatedAtMs : 0;
    var remoteDevice = remoteData.updatedByDeviceId || '';
    var hadLocalChange = isRecordInSnapshotPending(recordId) || isRecordExtendedPending(recordId) ||
      readFailedWorkdayList(getUid() || '').some(function (f) { return f.recordId === String(recordId); });

    if (remoteDevice && remoteDevice !== deviceId && hadLocalChange && remoteMs >= localMs) {
      markRecordConflictSuspect(recordId, 'remote_device_newer');
      return true;
    }
    if (hadLocalChange && remoteMs > localMs + 1000) {
      markRecordConflictSuspect(recordId, 'remote_timestamp_newer');
      return true;
    }
    return false;
  }

  function checkActiveShiftConflictOnRemote(remoteData, localEntry) {
    if (!remoteData) return false;
    var deviceId = getDeviceId();
    var remoteMs = typeof remoteData.clientUpdatedAtMs === 'number' ? remoteData.clientUpdatedAtMs : 0;
    var localMs = localEntry && typeof localEntry.clientUpdatedAtMs === 'number' ? localEntry.clientUpdatedAtMs : 0;
    var remoteDevice = remoteData.updatedByDeviceId || '';
    var hadLocal = !!(localEntry && localEntry.pendingSync) ||
      readFailedActiveShiftList(getUid() || '').length > 0;

    if (remoteDevice && remoteDevice !== deviceId && hadLocal && remoteMs >= localMs) {
      markActiveShiftConflictSuspect('remote_device_newer');
      return true;
    }
    if (hadLocal && remoteMs > localMs + 1000) {
      markActiveShiftConflictSuspect('remote_timestamp_newer');
      return true;
    }
    return false;
  }

  function getRecordSyncStatusBadgesHtml(recordId, i18n) {
    var dict = i18n || i18nDict();
    var html = '';
    if (isRecordConflictSuspect(recordId)) {
      var cLabel = dict.syncConflictPossible || 'Ez az adat másik eszközön is módosulhatott.';
      var cHint = dict.syncConflictCheckBeforeSave || 'Ellenőrizd mentés előtt.';
      html += '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-50 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-700" title="' + cLabel + ' ' + cHint + '">⚠️ ' + cLabel + '</span>';
    }
    if (isRecordExtendedPending(recordId) && !isRecordInSnapshotPending(recordId)) {
      var oLabel = dict.oldRecordPendingSync || 'Régebbi rekord szinkronizálásra vár';
      html += '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-50 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border border-violet-200 dark:border-violet-700" title="' + oLabel + '">📅 ' + oLabel + '</span>';
    } else if (typeof window.isRecordPendingSync === 'function' && window.isRecordPendingSync(recordId)) {
      if (typeof window.getRecordSyncPendingBadgeHtml === 'function') {
        html += window.getRecordSyncPendingBadgeHtml(dict);
      }
    }
    return html;
  }

  function hasAnyFailedSync() {
    var uid = getUid();
    if (!uid) return false;
    return readFailedWorkdayList(uid).length > 0 || readFailedActiveShiftList(uid).length > 0;
  }

  function updateSyncRetryBanner() {
    var banner = document.getElementById('sync-retry-banner');
    if (!banner) return;
    var dict = i18nDict();
    if (!hasAnyFailedSync()) {
      banner.classList.add('hidden');
      banner.innerHTML = '';
      return;
    }
    banner.classList.remove('hidden');
    var msg = dict.syncRetryAvailable || 'Van sikertelen mentés. Próbáld újra.';
    var btnLabel = dict.syncRetryButton || 'Újrapróbálás';
    banner.innerHTML = '<div class="flex flex-wrap items-center justify-center gap-2">' +
      '<span>' + msg + '</span>' +
      '<button type="button" id="sync-retry-button" class="px-2 py-0.5 rounded text-xs font-semibold bg-red-600 hover:bg-red-700 text-white">' + btnLabel + '</button>' +
      '</div>';
    var btn = document.getElementById('sync-retry-button');
    if (btn && !btn.__gurigoRetryBound) {
      btn.__gurigoRetryBound = true;
      btn.addEventListener('click', function () {
        retryAllFailedSync({ userInitiated: true });
      });
    }
  }

  async function retryFailedWorkdayItem(item) {
    if (!item || !navigator.onLine) return { ok: false, item: item };
    if ((item.retryCount || 0) >= MAX_RETRY_COUNT) return { ok: false, item: item, maxRetries: true };

    try {
      if (item.op === 'delete') {
        if (typeof window.deleteWorkdayRecordOfflineAware === 'function') {
          var delResult = await window.deleteWorkdayRecordOfflineAware(item.recordId);
          if (delResult && delResult.status !== 'failed') {
            removeFailedWorkdayItem(item.id);
            return { ok: true, item: item };
          }
          throw delResult && delResult.error ? delResult.error : new Error('delete failed');
        }
      } else if (item.payload && typeof window.saveWorkRecord === 'function') {
        var saveResult = await window.saveWorkRecord(item.payload);
        if (saveResult && saveResult.status !== 'failed') {
          removeFailedWorkdayItem(item.id);
          clearExtendedPending(item.recordId);
          clearRecordConflictSuspect(item.recordId);
          return { ok: true, item: item };
        }
        throw saveResult && saveResult.error ? saveResult.error : new Error('save failed');
      }
      return { ok: false, item: item };
    } catch (err) {
      item.retryCount = (item.retryCount || 0) + 1;
      item.errorMessage = err && err.message ? err.message : String(err);
      item.failedAt = Date.now();
      var uid = getUid();
      if (uid) {
        var list = readFailedWorkdayList(uid);
        var idx = list.findIndex(function (x) { return x.id === item.id; });
        if (idx > -1) list[idx] = item;
        writeFailedWorkdayList(uid, list);
      }
      return { ok: false, item: item, error: err };
    }
  }

  async function retryFailedActiveShiftItem(item) {
    if (!item || !navigator.onLine) return { ok: false, item: item };
    if ((item.retryCount || 0) >= MAX_RETRY_COUNT) return { ok: false, item: item, maxRetries: true };

    try {
      var result;
      if (item.op === 'clearActiveShift' && typeof window.clearActiveShiftOfflineAware === 'function') {
        result = await window.clearActiveShiftOfflineAware({
          isRetry: true,
          failedAt: item.failedAt || 0,
          closedShiftPayload: item.payload || null
        });
      } else if (item.payload && typeof window.saveActiveShiftOfflineAware === 'function') {
        // isRetry: do not mint a fake-newer watermark over fresher remote; merge or skip instead.
        result = await window.saveActiveShiftOfflineAware(item.payload, { isRetry: true });
      } else {
        return { ok: false, item: item };
      }
      if (result && (result.status === 'skipped_stale' || result.status === 'skipped_clear_pending')) {
        removeFailedActiveShiftItem(item.id);
        delete window._syncConflictSuspects.activeShift;
        return { ok: true, item: item, skipped: result.status };
      }
      if (result && result.status !== 'failed') {
        removeFailedActiveShiftItem(item.id);
        delete window._syncConflictSuspects.activeShift;
        return { ok: true, item: item };
      }
      throw result && result.error ? result.error : new Error('activeShift retry failed');
    } catch (err) {
      item.retryCount = (item.retryCount || 0) + 1;
      item.errorMessage = err && err.message ? err.message : String(err);
      item.failedAt = Date.now();
      var uid = getUid();
      if (uid) {
        var list = readFailedActiveShiftList(uid);
        var idx = list.findIndex(function (x) { return x.id === item.id; });
        if (idx > -1) list[idx] = item;
        writeFailedActiveShiftList(uid, list);
      }
      if (item.op === 'clearActiveShift') window._activeShiftClearPending = true;
      return { ok: false, item: item, error: err };
    }
  }

  async function retryAllFailedSync(options) {
    if (!navigator.onLine) return { ok: false, reason: 'offline' };
    var uid = getUid();
    if (!uid) return { ok: false, reason: 'no_user' };

    var workdayItems = readFailedWorkdayList(uid).slice();
    var shiftItems = readFailedActiveShiftList(uid).slice();
    var success = 0;
    var failed = 0;

    for (var i = 0; i < workdayItems.length; i++) {
      var wr = await retryFailedWorkdayItem(workdayItems[i]);
      if (wr.ok) success++; else failed++;
    }
    for (var j = 0; j < shiftItems.length; j++) {
      var sr = await retryFailedActiveShiftItem(shiftItems[j]);
      if (sr.ok) success++; else failed++;
    }

    if (typeof window.syncPendingActiveShiftIfNeeded === 'function') {
      await window.syncPendingActiveShiftIfNeeded().catch(function () {});
    }

    updateSyncRetryBanner();
    if (typeof window.refreshWorkdaySyncUi === 'function') window.refreshWorkdaySyncUi();
    if (typeof window.tryMarkOfflinePolicyAfterSync === 'function') {
      await window.tryMarkOfflinePolicyAfterSync().catch(function () {});
    }

    var dict = i18nDict();
    if (options && options.userInitiated && typeof showCustomAlert === 'function') {
      if (success > 0 && failed === 0) {
        showCustomAlert(dict.syncRetrySuccess || 'A mentés újrapróbálása sikerült.', 'success');
      } else if (failed > 0) {
        showCustomAlert(dict.syncRetryFailed || 'Az újrapróbálás nem sikerült.', 'warning');
      }
    }
    return { ok: failed === 0, success: success, failed: failed };
  }

  async function verifyExtendedPendingRecords() {
    var uid = getUid();
    if (!uid || !window.db || !navigator.onLine) return;
    var map = readExtendedPendingMap(uid);
    var ids = Object.keys(map);
    if (!ids.length) return;

    for (var i = 0; i < ids.length; i++) {
      var recordId = ids[i];
      try {
        var snap = await window.db.collection('users').doc(uid).collection('records').doc(recordId).get({ source: 'server' });
        if (snap.exists && snap.metadata && !snap.metadata.hasPendingWrites) {
          var remote = snap.data();
          var localMs = map[recordId].clientUpdatedAtMs || 0;
          var remoteMs = remote && typeof remote.clientUpdatedAtMs === 'number' ? remote.clientUpdatedAtMs : 0;
          checkRecordConflictOnRemote(recordId, remote, { clientUpdatedAtMs: localMs });
          if (remoteMs >= localMs - 2000) {
            clearExtendedPending(recordId);
          }
        }
      } catch (e) {
        console.warn('[SyncRetry] verify extended pending failed:', recordId, e && e.message);
      }
    }
    if (typeof window.refreshWorkdaySyncUi === 'function') window.refreshWorkdaySyncUi();
    if (typeof window.tryMarkOfflinePolicyAfterSync === 'function') {
      window.tryMarkOfflinePolicyAfterSync().catch(function () {});
    }
  }

  function onOnlineSyncChecks() {
    updateSyncRetryBanner();
    if (typeof window.syncPendingActiveShiftIfNeeded === 'function') {
      window.syncPendingActiveShiftIfNeeded().catch(function (err) {
        console.warn('[SyncRetry] activeShift sync failed:', err && err.message);
      });
    }
    verifyExtendedPendingRecords();
    if (typeof window.tryMarkOfflinePolicyAfterSync === 'function') {
      window.tryMarkOfflinePolicyAfterSync().catch(function () {});
    }
    if (hasAnyFailedSync() && navigator.onLine) {
      var dict = i18nDict();
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(dict.syncRetryAvailable || 'Van sikertelen mentés. Próbáld újra.', 'info');
      }
    }
  }

  function enhancePendingFromSave(record, status) {
    if (!record || !record.id) return;
    if (status === 'savedPendingSync' || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      if (isRecordOutsideActiveWindow(record)) {
        markExtendedPending(record.id, record, { isOldRecord: true });
      }
    }
    if (status === 'savedOnline') {
      clearExtendedPending(record.id);
    }
  }

  function wrapUpdateWorkdayPendingFromSnapshot() {
    if (window.__workdayPendingSnapshotWrapped) return;
    var orig = window.updateWorkdayPendingFromSnapshot;
    window.updateWorkdayPendingFromSnapshot = function (snapshot) {
      if (typeof orig === 'function') orig(snapshot);
      if (!snapshot || !snapshot.docs) return;
      var uid = getUid();
      snapshot.docs.forEach(function (doc) {
        var data = doc.data();
        var id = doc.id;
        if (doc.metadata && !doc.metadata.hasPendingWrites) {
          clearExtendedPending(id);
          if (typeof window.markRecordSyncedLocally === 'function') window.markRecordSyncedLocally(id);
          var localRec = (window.records || []).find(function (r) { return String(r.id) === String(id); });
          checkRecordConflictOnRemote(id, data, localRec);
        }
      });
    };
    window.__workdayPendingSnapshotWrapped = true;
  }

  window.addFailedWorkdaySyncItem = addFailedWorkdaySyncItem;
  window.addFailedActiveShiftSyncItem = addFailedActiveShiftSyncItem;
  window.markExtendedPending = markExtendedPending;
  window.clearExtendedPending = clearExtendedPending;
  window.isRecordExtendedPending = isRecordExtendedPending;
  window.isRecordConflictSuspect = isRecordConflictSuspect;
  window.isActiveShiftConflictSuspect = isActiveShiftConflictSuspect;
  window.getRecordSyncStatusBadgesHtml = getRecordSyncStatusBadgesHtml;
  window.hasAnyFailedSync = hasAnyFailedSync;
  window.updateSyncRetryBanner = updateSyncRetryBanner;
  window.retryAllFailedSync = retryAllFailedSync;
  window.verifyExtendedPendingRecords = verifyExtendedPendingRecords;
  window.onOnlineSyncChecks = onOnlineSyncChecks;
  window.enhancePendingFromSave = enhancePendingFromSave;
  window.checkRecordConflictOnRemote = checkRecordConflictOnRemote;
  window.checkActiveShiftConflictOnRemote = checkActiveShiftConflictOnRemote;

  wrapUpdateWorkdayPendingFromSnapshot();

  window.addEventListener('load', function () {
    setTimeout(updateSyncRetryBanner, 500);
  });
})();
