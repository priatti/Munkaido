/**
 * GuriGO – munkanap rekord offline-aware mentés (Firestore pending write queue).
 * Nem párhuzamos IndexedDB queue – a Firestore persistence kezeli a szinkront.
 */
(function () {
  console.log('[workdayRecordSync.js] loaded build production-crossings-tombstone-60524');
  var DEVICE_ID_KEY = 'gurigo_device_id_v1';

  window._recordsPendingSyncIds = window._recordsPendingSyncIds || {};

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
        if (item == null) return;
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

  /** Returns { crossings, crossingTombstones }. */
  function mergeRecordCrossingsFull(remoteData, localRecord) {
    var api = crossingApi();
    if (api && typeof api.mergeRecordCrossings === 'function') {
      return api.mergeRecordCrossings(remoteData, localRecord);
    }
    var remoteList = mergeCrossingLists(
      remoteData && remoteData.crossings,
      remoteData && remoteData.borderCrossings
    );
    var localList = mergeCrossingLists(
      localRecord && localRecord.crossings,
      localRecord && localRecord.borderCrossings
    );
    if (!localList.length && remoteList.length) {
      return { crossings: remoteList.slice(), crossingTombstones: (remoteData && remoteData.crossingTombstones) || [] };
    }
    if (localRecord && localRecord.crossingsAuthoritative) {
      return {
        crossings: localList.slice(),
        crossingTombstones: (localRecord && localRecord.crossingTombstones) || []
      };
    }
    return { crossings: mergeCrossingLists(remoteList, localList), crossingTombstones: [] };
  }

  function mergeRecordCrossings(remoteData, localRecord) {
    return mergeRecordCrossingsFull(remoteData, localRecord).crossings;
  }

  function getGurigoDeviceId() {
    try {
      var existing = localStorage.getItem(DEVICE_ID_KEY);
      if (existing && String(existing).trim()) return String(existing).trim();
      var id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(DEVICE_ID_KEY, id);
      return id;
    } catch (_) {
      return 'dev_unknown';
    }
  }

  function enrichWorkdayRecordClientFields(record, isUpdate) {
    if (!record || typeof record !== 'object') return record;
    var now = new Date();
    var ms = now.getTime();
    var out = Object.assign({}, record, {
      clientUpdatedAt: now.toISOString(),
      clientUpdatedAtMs: ms,
      updatedByDeviceId: getGurigoDeviceId()
    });
    var prevVersion = typeof record.syncVersion === 'number' ? record.syncVersion : (isUpdate ? 1 : 0);
    out.syncVersion = isUpdate ? (prevVersion + 1) : 1;
    return out;
  }

  function markWorkdayRecordPending(recordId, pending) {
    if (!recordId) return;
    var key = String(recordId);
    if (pending) {
      window._recordsPendingSyncIds[key] = true;
    } else {
      delete window._recordsPendingSyncIds[key];
    }
  }

  function isRecordPendingSync(recordId) {
    if (!recordId) return false;
    return !!(window._recordsPendingSyncIds && window._recordsPendingSyncIds[String(recordId)]);
  }

  function getRecordSyncPendingBadgeHtml(i18n) {
    var label = (i18n && i18n.syncPending) || 'Szinkronizálásra vár';
    return '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-700" title="' + label + '">☁️ ' + label + '</span>';
  }

  function resolveWorkdaySaveStatus(opts) {
    if (opts && opts.error) return 'failed';
    if (opts && (opts.offline || opts.hasPendingWrites)) return 'savedPendingSync';
    return 'savedOnline';
  }

  function showWorkdaySaveResultAlert(result, i18n) {
    if (!result || typeof showCustomAlert !== 'function') return;
    var dict = i18n || {};
    if (result.status === 'savedPendingSync') {
      showCustomAlert(dict.savedOffline || 'Mentve offline módban – online állapotban szinkronizálódik.', 'info');
    } else if (result.status === 'savedOnline') {
      showCustomAlert(dict.alertSaveSuccess || dict.alertShiftStartSuccess || 'Mentés sikeres.', 'success');
    } else if (result.status === 'failed') {
      showSyncFailedAlert(dict, { localDataMayExist: true, context: result.context || 'save' });
    }
  }

  function showSyncFailedAlert(i18n, options) {
    if (typeof showCustomAlert !== 'function') return;
    options = options || {};
    var dict = i18n || {};
    var msg;
    if (options.localDataMayExist) {
      msg = dict.syncFailedLocalMaybe || dict.syncFailed || 'A szinkronizálás nem sikerült. Az adat helyben még elérhető lehet.';
    } else {
      msg = dict.saveFailedRetry || dict.syncFailed || 'A mentés nem sikerült. Ellenőrizd a kapcsolatot, majd próbáld újra.';
    }
    showCustomAlert(msg, 'warning');
  }

  function updateWorkdayPendingFromSnapshot(snapshot) {
    if (!snapshot || !snapshot.docs) return;
    var pending = Object.assign({}, window._recordsPendingSyncIds || {});
    snapshot.docs.forEach(function (doc) {
      if (doc.metadata && doc.metadata.hasPendingWrites) {
        pending[doc.id] = true;
      } else {
        delete pending[doc.id];
      }
    });
    window._recordsPendingSyncIds = pending;
  }

  function refreshWorkdaySyncUi() {
    try { if (typeof renderRecords === 'function') renderRecords(); } catch (_) {}
    try { if (typeof window.renderStartTab === 'function') window.renderStartTab(); } catch (_) {}
    try { if (typeof window.renderTachographAnalysis === 'function') window.renderTachographAnalysis(); } catch (_) {}
    try { if (typeof window.renderTachographStatusCard === 'function') window.renderTachographStatusCard(); } catch (_) {}
  }

  /**
   * @param {object} record – normalizált rekord
   * @param {object} hooks – database.js helper függvények
   * @returns {Promise<{status:string, recordId:string, record:object, isUpdate:boolean}>}
   */
  async function saveWorkdayRecordOfflineAware(record, hooks) {
    hooks = hooks || {};
    var db = window.db;
    var uid = window.currentUser && window.currentUser.uid;
    if (!uid || !db) {
      return { status: 'failed', recordId: record && record.id, record: record, isUpdate: false, error: new Error('No user') };
    }

    var list = Array.isArray(window.records) ? window.records : [];
    var idx = list.findIndex(function (r) { return String(r.id) === String(record.id); });
    var isUpdate = idx > -1;
    var previousSnapshot = isUpdate ? JSON.parse(JSON.stringify(list[idx])) : null;

    record = enrichWorkdayRecordClientFields(record, isUpdate);
    if (typeof window.stampOfflineCreatedFields === 'function') {
      record = window.stampOfflineCreatedFields(record, isUpdate);
    }

    var offline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (offline) {
      if (isUpdate && previousSnapshot) {
        if (typeof window.canEditRecordOffline === 'function' && !window.canEditRecordOffline(previousSnapshot)) {
          if (typeof window.isRecordSynced === 'function' && window.isRecordSynced(previousSnapshot)) {
            if (typeof window.showSyncedRecordReadOnlyAlert === 'function') window.showSyncedRecordReadOnlyAlert();
          } else if (typeof window.showOfflineLimitExpiredAlert === 'function') {
            window.showOfflineLimitExpiredAlert();
          }
          return { status: 'failed', recordId: String(record.id), record: previousSnapshot, isUpdate: isUpdate, error: new Error('offline_readonly'), context: 'save' };
        }
      } else {
        var canSaveOffline = typeof window.canSaveWorkdayRecordOffline === 'function'
          ? window.canSaveWorkdayRecordOffline({ isUpdate: false })
          : (typeof window.gateOfflineCreate === 'function' ? window.gateOfflineCreate('workdaySave') : true);
        if (!canSaveOffline) {
          return { status: 'failed', recordId: String(record.id), record: record, isUpdate: isUpdate, error: new Error('offline_window_expired'), context: 'save' };
        }
      }
    }
    // Online: merge remote trailerContainerEvents + crossings so a stale retry /
    // concurrent device / empty local form cannot drop data already on the record.
    if (!offline) {
      try {
        var remoteSnap = await db.collection('users').doc(uid).collection('records').doc(String(record.id)).get();
        if (remoteSnap && remoteSnap.exists) {
          var remoteData = remoteSnap.data() || {};
          var tcl = window.TrailerContainerLog;
          var crossMerged = mergeRecordCrossingsFull(remoteData, record);
          var mergedFields = {
            crossings: crossMerged.crossings,
            crossingTombstones: crossMerged.crossingTombstones
          };
          if (tcl && typeof tcl.mergeEventLists === 'function') {
            mergedFields.trailerContainerEvents = tcl.mergeEventLists(
              remoteData.trailerContainerEvents,
              record.trailerContainerEvents
            );
          } else if (Array.isArray(remoteData.trailerContainerEvents) && remoteData.trailerContainerEvents.length) {
            var seenEv = {};
            var unionEv = [];
            [].concat(remoteData.trailerContainerEvents || [], record.trailerContainerEvents || []).forEach(function (ev) {
              if (!ev) return;
              var k = ev.eventId ? 'id:' + ev.eventId : JSON.stringify(ev);
              if (seenEv[k]) return;
              seenEv[k] = true;
              unionEv.push(ev);
            });
            mergedFields.trailerContainerEvents = unionEv;
          }
          // Preserve authority flag through merge; strip before Firestore write below.
          var _keptAuth = !!record.crossingsAuthoritative;
          record = Object.assign({}, record, mergedFields);
          if (_keptAuth) record.crossingsAuthoritative = true;
          if (Object.prototype.hasOwnProperty.call(record, 'borderCrossings')) {
            delete record.borderCrossings;
          }
        }
      } catch (_) {}
    }

    var _authFlag = !!record.crossingsAuthoritative;
    var writePayload = hooks.buildWritePayload ? hooks.buildWritePayload(record) : Object.assign({}, record);
    if (hooks.stripUndefined) writePayload = hooks.stripUndefined(writePayload);
    // Keep authority for the in-tx merge; strip ephemeral keys before set().
    if (_authFlag) writePayload.crossingsAuthoritative = true;
    else if (writePayload && Object.prototype.hasOwnProperty.call(writePayload, 'crossingsAuthoritative')) {
      delete writePayload.crossingsAuthoritative;
    }
    if (record && Object.prototype.hasOwnProperty.call(record, 'crossingsAuthoritative')) {
      delete record.crossingsAuthoritative;
    }

    var fv = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
      ? firebase.firestore.FieldValue
      : null;
    if (fv && fv.serverTimestamp) {
      writePayload.updatedAt = fv.serverTimestamp();
    }

    var cached = hooks.sanitizeForCache ? hooks.sanitizeForCache(record) : record;
    if (isUpdate) {
      window.records[idx] = cached;
    } else {
      window.records.push(cached);
    }
    window._recordsActiveList = window.records.slice();
    try { if (typeof records !== 'undefined') { records = window.records; } } catch (_) {}

    var offline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (offline) markWorkdayRecordPending(record.id, true);
    if (typeof window.enhancePendingFromSave === 'function') {
      window.enhancePendingFromSave(cached, offline ? 'savedPendingSync' : null);
    }

    try { if (typeof renderRecords === 'function') renderRecords(); } catch (_) {}
    try { window.dispatchEvent(new Event('records:updated')); } catch (_) {}

    if (offline) {
      // Do NOT enqueue a Firestore persistence .set() with a full trailerContainerEvents
      // array while offline — that LWW-replaces the field on reconnect and can drop
      // events another device appended. Keep local + explicit retry queue; online
      // retry path merges remote events before write.
      if (typeof window.addFailedWorkdaySyncItem === 'function') {
        window.addFailedWorkdaySyncItem({
          op: isUpdate ? 'update' : 'save',
          recordId: String(record.id),
          payload: JSON.parse(JSON.stringify(cached)),
          error: new Error('offline_pending_merge_required'),
          updatedByDeviceId: getGurigoDeviceId()
        });
      }
      if (typeof window.updateSyncRetryBanner === 'function') window.updateSyncRetryBanner();
      var pendingStatus = 'savedPendingSync';
      if (hooks.afterSave) {
        try { await hooks.afterSave({ record: cached, isUpdate: isUpdate, status: pendingStatus }); } catch (_) {}
      }
      console.log('[WorkdaySync] save', record.id, pendingStatus, '(no firestore queue; merge-on-retry)');
      if (typeof window.enhancePendingFromSave === 'function') {
        window.enhancePendingFromSave(cached, pendingStatus);
      }
      return { status: pendingStatus, recordId: String(record.id), record: cached, isUpdate: isUpdate };
    }

    try {
      // Prefer transaction when available so concurrent online writers also union events.
      var docRef = db.collection('users').doc(uid).collection('records').doc(String(record.id));
      if (typeof db.runTransaction === 'function') {
        var writtenPayload = writePayload;
        await db.runTransaction(function (tx) {
          return tx.get(docRef).then(function (snap) {
            var remoteData = snap && snap.exists ? (snap.data() || {}) : {};
            var tcl2 = window.TrailerContainerLog;
            var nextPayload = Object.assign({}, writtenPayload);
            if (tcl2 && typeof tcl2.mergeEventLists === 'function') {
              nextPayload.trailerContainerEvents = tcl2.mergeEventLists(
                remoteData.trailerContainerEvents,
                writtenPayload.trailerContainerEvents
              );
            }
            var mergeSource = Object.assign({}, writtenPayload);
            if (writtenPayload.crossingsAuthoritative) mergeSource.crossingsAuthoritative = true;
            var txCross = mergeRecordCrossingsFull(remoteData, mergeSource);
            nextPayload.crossings = txCross.crossings;
            nextPayload.crossingTombstones = txCross.crossingTombstones;
            if (Object.prototype.hasOwnProperty.call(nextPayload, 'borderCrossings')) {
              delete nextPayload.borderCrossings;
            }
            delete nextPayload.crossingsAuthoritative;
            delete nextPayload.__crossingsAuthoritative;
            // Never delete remote-only fields that this payload omitted.
            Object.keys(remoteData).forEach(function (k) {
              if (k === 'crossings' || k === 'borderCrossings' || k === 'crossingTombstones') return;
              if (nextPayload[k] === undefined && remoteData[k] !== undefined && k !== 'updatedAt') {
                nextPayload[k] = remoteData[k];
              }
            });
            writtenPayload = nextPayload;
            if (cached && Array.isArray(nextPayload.trailerContainerEvents)) {
              cached.trailerContainerEvents = nextPayload.trailerContainerEvents.slice();
            }
            if (cached && Array.isArray(nextPayload.crossings)) {
              cached.crossings = nextPayload.crossings.slice();
            }
            if (cached && Array.isArray(nextPayload.crossingTombstones)) {
              cached.crossingTombstones = nextPayload.crossingTombstones.slice();
            }
            var cmGuard = crossingApi();
            if (cmGuard && typeof cmGuard.isUnsafeEmptyCrossingsOverwrite === 'function' &&
                cmGuard.isUnsafeEmptyCrossingsOverwrite(remoteData, nextPayload)) {
              console.error('[WorkdaySync] crossings-guard refused empty overwrite of remote crossings', record && record.id);
              throw new Error('crossings-guard: refused empty crossings overwrite');
            }
            tx.set(docRef, nextPayload, { merge: true });
          });
        });
        writePayload = writtenPayload;
      } else {
        await docRef.set(writePayload, { merge: true });
      }

      var status = resolveWorkdaySaveStatus({ offline: false, hasPendingWrites: false });
      markWorkdayRecordPending(record.id, false);
      cached = Object.assign({}, cached, { syncStatus: 'synced' });
      if (isUpdate) window.records[idx] = cached;

      if (hooks.afterSave) {
        try { await hooks.afterSave({ record: cached, isUpdate: isUpdate, status: status }); } catch (_) {}
      }

      console.log('[WorkdaySync] save', record.id, status);
      if (typeof window.enhancePendingFromSave === 'function') {
        window.enhancePendingFromSave(cached, status);
      }
      return { status: status, recordId: String(record.id), record: cached, isUpdate: isUpdate };
    } catch (error) {
      console.error('[WorkdaySync] save failed:', error);
      if (typeof window.addFailedWorkdaySyncItem === 'function') {
        window.addFailedWorkdaySyncItem({
          op: isUpdate ? 'update' : 'save',
          recordId: String(record.id),
          payload: JSON.parse(JSON.stringify(cached)),
          error: error,
          updatedByDeviceId: getGurigoDeviceId()
        });
      }
      if (isUpdate && previousSnapshot) {
        window.records[idx] = previousSnapshot;
      } else if (!isUpdate) {
        window.records = window.records.filter(function (r) { return String(r.id) !== String(record.id); });
      }
      window._recordsActiveList = window.records.slice();
      try { if (typeof records !== 'undefined') { records = window.records; } } catch (_) {}
      markWorkdayRecordPending(record.id, false);
      if (typeof window.clearExtendedPending === 'function') window.clearExtendedPending(record.id);
      if (typeof window.updateSyncRetryBanner === 'function') window.updateSyncRetryBanner();
      try { if (typeof renderRecords === 'function') renderRecords(); } catch (_) {}
      return { status: 'failed', recordId: String(record.id), record: cached, isUpdate: isUpdate, error: error, context: 'save' };
    }
  }

  async function deleteWorkdayRecordOfflineAware(recordId) {
    var id = String(recordId || '');
    var uid = window.currentUser && window.currentUser.uid;
    if (!id || !uid || !window.db) {
      return { status: 'failed', recordId: id, error: new Error('Invalid delete') };
    }

    var offline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (offline) {
      var list = Array.isArray(window.records) ? window.records : [];
      var existing = list.find(function (r) { return String(r.id) === id; });
      if (existing && typeof window.canDeleteRecordOffline === 'function' && !window.canDeleteRecordOffline(existing)) {
        if (typeof window.showSyncedRecordReadOnlyAlert === 'function') window.showSyncedRecordReadOnlyAlert();
        return { status: 'failed', recordId: id, error: new Error('offline_readonly') };
      }
    }
    if (offline) markWorkdayRecordPending(id, true);

    try {
      await window.db.collection('users').doc(uid).collection('records').doc(id).delete();
      var status = resolveWorkdaySaveStatus({ offline: offline, hasPendingWrites: offline });
      if (!offline) markWorkdayRecordPending(id, false);
      console.log('[WorkdaySync] delete', id, status);
      if (status === 'savedOnline') {
        if (typeof window.clearExtendedPending === 'function') window.clearExtendedPending(id);
      }
      return { status: status, recordId: id };
    } catch (error) {
      markWorkdayRecordPending(id, false);
      if (typeof window.addFailedWorkdaySyncItem === 'function') {
        window.addFailedWorkdaySyncItem({
          op: 'delete',
          recordId: id,
          payload: null,
          error: error,
          updatedByDeviceId: getGurigoDeviceId()
        });
      }
      if (typeof window.updateSyncRetryBanner === 'function') window.updateSyncRetryBanner();
      console.error('[WorkdaySync] delete failed:', error);
      return { status: 'failed', recordId: id, error: error };
    }
  }

  window.getGurigoDeviceId = getGurigoDeviceId;
  window.enrichWorkdayRecordClientFields = enrichWorkdayRecordClientFields;
  window.markWorkdayRecordPending = markWorkdayRecordPending;
  window.isRecordPendingSync = isRecordPendingSync;
  window.getRecordSyncPendingBadgeHtml = getRecordSyncPendingBadgeHtml;
  window.resolveWorkdaySaveStatus = resolveWorkdaySaveStatus;
  window.showWorkdaySaveResultAlert = showWorkdaySaveResultAlert;
  window.showSyncFailedAlert = showSyncFailedAlert;
  window.updateWorkdayPendingFromSnapshot = updateWorkdayPendingFromSnapshot;
  window.refreshWorkdaySyncUi = refreshWorkdaySyncUi;
  window.saveWorkdayRecordOfflineAware = saveWorkdayRecordOfflineAware;
  window.updateWorkdayRecordOfflineAware = saveWorkdayRecordOfflineAware;
  window.deleteWorkdayRecordOfflineAware = deleteWorkdayRecordOfflineAware;
  window.mergeCrossingLists = mergeCrossingLists;
  window.mergeRecordCrossings = mergeRecordCrossings;
})();
