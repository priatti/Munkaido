/**
 * GuriGO Sync Manager – Online/offline mentés és szinkronizáció
 */
(function () {
  function stripMeta(obj) {
    var o = {};
    var skip = { userId: 1, _collection: 1, _docId: 1, _createdAt: 1, _synced: 1 };
    for (var k in obj) {
      if (obj.hasOwnProperty(k) && !skip[k] && k.indexOf('_') !== 0) o[k] = obj[k];
    }
    return o;
  }

  function getErrorCode(err) {
    if (!err) return 'unknown';
    if (err.code) return String(err.code);
    var msg = String(err.message || '').toLowerCase();
    if (msg.indexOf('permission') >= 0 || msg.indexOf('insufficient permissions') >= 0) return 'permission-denied';
    if (msg.indexOf('unauthenticated') >= 0) return 'unauthenticated';
    return 'unknown';
  }

  function isNonRetryableSyncError(err) {
    var code = getErrorCode(err);
    return [
      'permission-denied',
      'unauthenticated',
      'invalid-argument',
      'failed-precondition',
      'not-found',
      'already-exists',
      'cancelled',
      'out-of-range',
      'data-loss'
    ].indexOf(code) >= 0;
  }

  function isRetryableSyncError(err) {
    if (isNonRetryableSyncError(err)) return false;
    var code = getErrorCode(err);
    if (['unavailable', 'deadline-exceeded', 'resource-exhausted', 'aborted', 'internal', 'unknown', 'network-request-failed'].indexOf(code) >= 0) {
      return true;
    }
    var msg = String((err && err.message) || '').toLowerCase();
    return msg.indexOf('network') >= 0 || msg.indexOf('fetch') >= 0 || msg.indexOf('connection') >= 0;
  }

  function buildFirestorePath(userId, collection, docId) {
    return 'users/' + userId + '/' + collection + (docId ? '/' + docId : '');
  }

  async function saveSyncedEntry(payload, db, userId) {
    var collection = payload._collection || 'records';
    var docId = payload._docId != null ? String(payload._docId) : null;
    var data = stripMeta(payload);
    var path = buildFirestorePath(userId, collection, docId);

    console.log('[SyncManager] saveSyncedEntry', {
      collection: collection,
      docId: docId || null,
      path: path
    });

    try {
      if (navigator.onLine && db && userId) {
        try {
          var ref = db.collection('users').doc(userId).collection(collection);
          if (docId) {
            ref = ref.doc(docId);
            console.log('[SyncManager] firestore write payload', {
              path: path,
              op: 'set-merge',
              dataCompanyId: data.companyId,
              dataKeys: Object.keys(data)
            });
            await ref.set(data, { merge: true });
          } else {
            console.log('[SyncManager] firestore write payload', {
              path: path + '/(auto)',
              op: 'add',
              dataCompanyId: data.companyId,
              dataKeys: Object.keys(data)
            });
            await ref.add(data);
          }
          return { status: 'synced' };
        } catch (e) {
          var code = getErrorCode(e);
          var retryable = isRetryableSyncError(e);
          console.warn('[SyncManager] saveSyncedEntry failed', {
            collection: collection,
            docId: docId,
            path: path,
            retryable: retryable,
            errorCode: code
          });
          if (!retryable) {
            return {
              status: 'failed',
              errorCode: code,
              errorMessage: (e && e.message) ? String(e.message) : 'Sync failed'
            };
          }
          var entry = Object.assign({}, payload, { userId: userId, _collection: collection, _docId: docId });
          if (typeof window.stampQueuedEntryFields === 'function') {
            entry = window.stampQueuedEntryFields(entry);
          }
          if (typeof window.saveOfflineEntry === 'function') {
            await window.saveOfflineEntry(entry);
          }
          return { status: 'queued' };
        }
      }

      var offlineEntry = Object.assign({}, payload, { userId: userId, _collection: collection, _docId: docId });
      if (typeof window.stampQueuedEntryFields === 'function') {
        offlineEntry = window.stampQueuedEntryFields(offlineEntry);
      }
      if (typeof window.saveOfflineEntry === 'function') {
        await window.saveOfflineEntry(offlineEntry);
      }
      return { status: 'queued' };
    } catch (e) {
      var outerCode = getErrorCode(e);
      console.error('[SyncManager] saveSyncedEntry outer failed', {
        collection: collection,
        docId: docId,
        path: path,
        errorCode: outerCode
      });
      return {
        status: 'failed',
        errorCode: outerCode,
        errorMessage: (e && e.message) ? String(e.message) : 'Sync failed'
      };
    }
  }

  function markEntryDeadIfPossible(entry, errorCode, errorMessage) {
    if (!entry || entry.id == null || typeof window.markOfflineEntryDead !== 'function') {
      return Promise.resolve();
    }
    return window.markOfflineEntryDead(entry.id, errorCode, errorMessage);
  }

  function syncSingleEntry(entry, db) {
    if (entry && entry._dead === true) {
      return Promise.resolve({ success: false, skipped: true, dead: true, error: entry._lastErrorCode || 'dead' });
    }

    var RETRY_DELAYS = [5000, 15000, 30000];
    var MAX_ATTEMPTS = RETRY_DELAYS.length + 1;

    return (function attempt(n) {
      var uid = entry.userId;
      var col = entry._collection || 'records';
      var docId = entry._docId;
      var path = buildFirestorePath(uid, col, docId);
      var data = stripMeta(entry);
      data._offlineCreatedAt = entry._createdAt;
      data._syncedAt = Date.now();

      var ref = db.collection('users').doc(uid).collection(col);
      if (docId) ref = ref.doc(String(docId));

      var op = docId ? ref.set(data, { merge: true }) : ref.add(data);
      return op
        .then(function () {
          return window.removeEntry(entry.id).then(function () {
            return { success: true, attempts: n };
          });
        })
        .catch(function (err) {
          var code = getErrorCode(err);
          var retryable = isRetryableSyncError(err);
          console.warn('[SyncManager] Sync attempt ' + n + '/' + MAX_ATTEMPTS + ' failed for entry ' + entry.id + ':', {
            path: path,
            collection: col,
            docId: docId,
            retryable: retryable,
            errorCode: code,
            message: err && err.message
          });

          if (!retryable) {
            console.error('[SyncManager] Non-retryable sync error, marking dead entry ' + entry.id, code);
            return markEntryDeadIfPossible(entry, code, err && err.message).then(function () {
              return { success: false, attempts: n, error: code, dead: true };
            });
          }

          if (n >= MAX_ATTEMPTS) {
            console.error('[SyncManager] Sync permanently failed for entry ' + entry.id + ' after ' + MAX_ATTEMPTS + ' attempts');
            return markEntryDeadIfPossible(entry, code, err && err.message).then(function () {
              return { success: false, attempts: MAX_ATTEMPTS, error: err && err.message, dead: true };
            });
          }
          if (!navigator.onLine) {
            console.warn('[SyncManager] Device went offline during sync, stopping retry for entry ' + entry.id);
            return { success: false, attempts: n, error: 'offline' };
          }

          return new Promise(function (resolve) {
            setTimeout(resolve, RETRY_DELAYS[n - 1]);
          }).then(function () {
            if (!navigator.onLine) {
              console.warn('[SyncManager] Device offline after wait, stopping retry for entry ' + entry.id);
              return { success: false, attempts: n, error: 'offline' };
            }
            return attempt(n + 1);
          });
        });
    })(1);
  }

  async function syncPendingEntries(db) {
    var list = await window.getPendingEntries();
    if (!db || !list.length) return { synced: 0, failed: 0, dead: 0, remaining: 0 };

    var synced = 0;
    var failed = 0;
    var dead = 0;

    for (var i = 0; i < list.length; i++) {
      if (!navigator.onLine) {
        console.warn('[SyncManager] Device went offline, pausing sync.');
        break;
      }

      var entry = list[i];
      var result = await syncSingleEntry(entry, db);

      if (result.success) {
        synced++;
      } else if (result.dead || result.skipped) {
        dead++;
      } else {
        failed++;
        if (result.error === 'offline') break;
      }
    }

    var remaining = await window.getPendingCount();
    return { synced: synced, failed: failed, dead: dead, remaining: remaining };
  }

  window.saveSyncedEntry = saveSyncedEntry;
  window.syncPendingEntries = syncPendingEntries;
})();
