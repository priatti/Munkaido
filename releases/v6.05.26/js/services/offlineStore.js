/**
 * GuriGO Offline Store – IndexedDB alapú lokális tároló
 * A Firestore-ba szánt bejegyzéseket gyűjti, amíg nincs internet.
 */
(function () {
  const DB_NAME = 'gurigo-offline';
  const DB_VERSION = 1;
  const STORE_NAME = 'pendingEntries';

  function openDB() {
    return new Promise(function (resolve, reject) {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onerror = function () { reject(req.error); };
        req.onsuccess = function () { resolve(req.result); };
        req.onupgradeneeded = function (e) {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          }
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  async function getAllOfflineEntries() {
    const db = await openDB();
    return new Promise(function (resolve, reject) {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = function () {
          db.close();
          resolve(req.result || []);
        };
        req.onerror = function () { db.close(); reject(req.error); };
      } catch (e) {
        db.close();
        reject(e);
      }
    });
  }

  async function saveOfflineEntry(entry) {
    const db = await openDB();
    return new Promise(function (resolve, reject) {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const data = Object.assign({}, entry, { _createdAt: Date.now(), _synced: false, _dead: false });
        const req = store.add(data);
        req.onsuccess = function () { db.close(); resolve(req.result); };
        req.onerror = function () { db.close(); reject(req.error); };
      } catch (e) {
        db.close();
        reject(e);
      }
    });
  }

  async function updateOfflineEntry(id, patch) {
    const db = await openDB();
    return new Promise(function (resolve, reject) {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = function () {
          const existing = getReq.result;
          if (!existing) {
            db.close();
            resolve(false);
            return;
          }
          const updated = Object.assign({}, existing, patch);
          const putReq = store.put(updated);
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

  async function markOfflineEntryDead(id, errorCode, errorMessage) {
    return updateOfflineEntry(id, {
      _dead: true,
      _lastErrorCode: errorCode || 'unknown',
      _lastErrorMessage: errorMessage || '',
      _deadAt: Date.now()
    });
  }

  async function getPendingEntries() {
    const list = await getAllOfflineEntries();
    return list.filter(function (e) { return e._synced !== true && e._dead !== true; });
  }

  async function getDeadPendingEntries() {
    const list = await getAllOfflineEntries();
    return list.filter(function (e) { return e._synced !== true && e._dead === true; });
  }

  async function removeEntry(id) {
    const db = await openDB();
    return new Promise(function (resolve, reject) {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = function () { db.close(); resolve(); };
        req.onerror = function () { db.close(); reject(req.error); };
      } catch (e) {
        db.close();
        reject(e);
      }
    });
  }

  async function getPendingCount() {
    const list = await getPendingEntries();
    return list.length;
  }

  async function logPendingSyncDiagnostics() {
    const all = await getAllOfflineEntries();
    const active = all.filter(function (e) { return e._synced !== true && e._dead !== true; });
    const dead = all.filter(function (e) { return e._synced !== true && e._dead === true; });
    console.log('[OfflineStore] pending diagnostics', {
      activeCount: active.length,
      deadCount: dead.length,
      totalCount: all.length
    });
    function summarize(entry) {
      const uid = entry.userId || '(missing)';
      const col = entry._collection || 'records';
      const docId = entry._docId != null ? String(entry._docId) : '(auto)';
      const keys = Object.keys(entry).filter(function (k) {
        return k.indexOf('_') !== 0 || k === '_collection' || k === '_docId';
      });
      return {
        queueKey: entry.id,
        collection: col,
        docId: docId,
        uid: uid,
        firestorePath: 'users/' + uid + '/' + col + (docId !== '(auto)' ? '/' + docId : ''),
        payloadKeys: keys,
        companyId: entry.companyId,
        dead: !!entry._dead,
        lastErrorCode: entry._lastErrorCode || null,
        createdAt: entry._createdAt || null
      };
    }
    active.forEach(function (e) { console.log('[OfflineStore] active entry', summarize(e)); });
    dead.forEach(function (e) { console.log('[OfflineStore] dead entry', summarize(e)); });
    return { active: active.map(summarize), dead: dead.map(summarize) };
  }

  window.saveOfflineEntry = saveOfflineEntry;
  window.getPendingEntries = getPendingEntries;
  window.getDeadPendingEntries = getDeadPendingEntries;
  window.removeEntry = removeEntry;
  window.removePendingEntryById = removeEntry;
  window.markOfflineEntryDead = markOfflineEntryDead;
  window.getPendingCount = getPendingCount;
  window.logPendingSyncDiagnostics = logPendingSyncDiagnostics;
})();
