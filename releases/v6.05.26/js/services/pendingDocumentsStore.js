/**
 * GuriGO – pending dokumentum feltöltések (blob IndexedDB, meta).
 * Státuszok: pendingUpload → uploadedPendingMeta → (törlés) | failed
 */
(function () {
  'use strict';

  var DB_NAME = 'gurigo-pending-docs';
  var DB_VERSION = 1;
  var STORE_NAME = 'pendingDocuments';

  var STATUS_PENDING_UPLOAD = 'pendingUpload';
  var STATUS_UPLOADED_PENDING_META = 'uploadedPendingMeta';
  var STATUS_FAILED = 'failed';

  function isRetryableStatus(status) {
    return status === STATUS_PENDING_UPLOAD ||
      status === STATUS_UPLOADED_PENDING_META ||
      status === STATUS_FAILED ||
      status === 'pending';
  }

  function openDB() {
    return new Promise(function (resolve, reject) {
      try {
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = function () { reject(req.error); };
        req.onsuccess = function () { resolve(req.result); };
        req.onupgradeneeded = function (e) {
          var db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  function makeId() {
    return 'pdoc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function getDeviceId() {
    return typeof window.getGurigoDeviceId === 'function' ? window.getGurigoDeviceId() : 'dev_unknown';
  }

  async function savePendingDocument(entry) {
    var db = await openDB();
    return new Promise(function (resolve, reject) {
      try {
        var id = entry.id || makeId();
        var record = Object.assign({}, entry, {
          id: id,
          createdOfflineAtMs: entry.createdOfflineAtMs || Date.now(),
          offlineOriginDeviceId: entry.offlineOriginDeviceId || getDeviceId(),
          syncStatus: entry.syncStatus || STATUS_PENDING_UPLOAD
        });
        if (record.syncStatus === 'pending') record.syncStatus = STATUS_PENDING_UPLOAD;
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var req = store.put(record);
        req.onsuccess = function () { db.close(); resolve(record); };
        req.onerror = function () { db.close(); reject(req.error); };
      } catch (e) {
        db.close();
        reject(e);
      }
    });
  }

  async function updatePendingDocument(id, patch) {
    var db = await openDB();
    return new Promise(function (resolve, reject) {
      try {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var getReq = store.get(id);
        getReq.onsuccess = function () {
          var existing = getReq.result;
          if (!existing) { db.close(); resolve(false); return; }
          var updated = Object.assign({}, existing, patch || {}, { id: id });
          var putReq = store.put(updated);
          putReq.onsuccess = function () { db.close(); resolve(updated); };
          putReq.onerror = function () { db.close(); reject(putReq.error); };
        };
        getReq.onerror = function () { db.close(); reject(getReq.error); };
      } catch (e) {
        db.close();
        reject(e);
      }
    });
  }

  async function getAllPendingDocuments(uid) {
    var db = await openDB();
    return new Promise(function (resolve, reject) {
      try {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var req = store.getAll();
        req.onsuccess = function () {
          db.close();
          var list = (req.result || []).filter(function (x) {
            return !uid || String(x.uid) === String(uid);
          });
          resolve(list);
        };
        req.onerror = function () { db.close(); reject(req.error); };
      } catch (e) {
        db.close();
        reject(e);
      }
    });
  }

  async function getPendingDocumentsCount(uid) {
    var list = await getAllPendingDocuments(uid);
    return list.filter(function (x) { return isRetryableStatus(x.syncStatus); }).length;
  }

  async function removePendingDocument(id) {
    var db = await openDB();
    return new Promise(function (resolve, reject) {
      try {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var req = store.delete(id);
        req.onsuccess = function () { db.close(); resolve(); };
        req.onerror = function () { db.close(); reject(req.error); };
      } catch (e) {
        db.close();
        reject(e);
      }
    });
  }

  async function markPendingDocumentFailed(id, errorMessage, options) {
    options = options || {};
    var db = await openDB();
    return new Promise(function (resolve, reject) {
      try {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        var getReq = store.get(id);
        getReq.onsuccess = function () {
          var existing = getReq.result;
          if (!existing) { db.close(); resolve(false); return; }
          existing.errorMessage = errorMessage || 'upload failed';
          existing.failedAt = Date.now();
          if (existing.syncStatus === STATUS_UPLOADED_PENDING_META && !options.forceFailed) {
            existing.lastMetaError = existing.errorMessage;
          } else {
            existing.syncStatus = STATUS_FAILED;
          }
          var putReq = store.put(existing);
          putReq.onsuccess = function () { db.close(); resolve(true); };
          putReq.onerror = function () { db.close(); reject(putReq.error); };
        };
        getReq.onerror = function () { db.close(); reject(getReq.error); };
      } catch (e) {
        db.close();
        reject(e);
      }
    });
  }

  async function syncPendingDocuments(uploadFn) {
    var uid = window.currentUser && window.currentUser.uid;
    if (!uid || !navigator.onLine || typeof uploadFn !== 'function') return { synced: 0, failed: 0 };
    var list = await getAllPendingDocuments(uid);
    var pending = list.filter(function (x) { return isRetryableStatus(x.syncStatus); });
    var synced = 0;
    var failed = 0;
    for (var i = 0; i < pending.length; i++) {
      var item = pending[i];
      try {
        var ok = await uploadFn(item);
        if (ok === true) {
          await removePendingDocument(item.id);
          synced++;
        } else {
          await markPendingDocumentFailed(item.id, 'upload returned false', {
            forceFailed: item.syncStatus !== STATUS_UPLOADED_PENDING_META
          });
          failed++;
        }
      } catch (e) {
        await markPendingDocumentFailed(item.id, e && e.message ? e.message : String(e), {
          forceFailed: item.syncStatus !== STATUS_UPLOADED_PENDING_META
        });
        failed++;
      }
    }
    if (typeof window.updateConnectionStatus === 'function') window.updateConnectionStatus();
    if (typeof window.tryMarkOfflinePolicyAfterSync === 'function') {
      await window.tryMarkOfflinePolicyAfterSync().catch(function () {});
    }
    return { synced: synced, failed: failed };
  }

  window.PENDING_DOC_STATUS = {
    pendingUpload: STATUS_PENDING_UPLOAD,
    uploadedPendingMeta: STATUS_UPLOADED_PENDING_META,
    failed: STATUS_FAILED
  };
  window.savePendingDocument = savePendingDocument;
  window.updatePendingDocument = updatePendingDocument;
  window.getAllPendingDocuments = getAllPendingDocuments;
  window.getPendingDocumentsCount = getPendingDocumentsCount;
  window.removePendingDocument = removePendingDocument;
  window.markPendingDocumentFailed = markPendingDocumentFailed;
  window.syncPendingDocuments = syncPendingDocuments;
})();
