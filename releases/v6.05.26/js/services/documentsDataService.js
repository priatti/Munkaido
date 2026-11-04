// Közös Firestore documents olvasás + cache (v6.05.03 read-csökkentés)
(function () {
  'use strict';

  var ACTIVE_DAYS = 35;
  var OLDER_PAGE_SIZE = 40;

  var state = {
    activeDocs: [],
    olderDocs: [],
    olderHasMore: true,
    olderLastDoc: null,
    olderLoading: false,
    expiryCacheDayKey: null,
    expiryCacheDocs: null,
    expiryCacheExpiring: null,
    metaCache: null,
    metaCacheUid: null
  };

  function getIsoDateDaysAgo(days) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - days);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function getTodayDayKey() {
    return getIsoDateDaysAgo(0);
  }

  function getDb() {
    if (typeof db !== 'undefined' && db) return db;
    if (typeof firebase !== 'undefined' && firebase.firestore) return firebase.firestore();
    return null;
  }

  function docsColRef(uid) {
    var database = getDb();
    if (!database || !uid) return null;
    return database.collection('users').doc(uid).collection('documents');
  }

  function mapDocSnap(d) {
    return { id: d.id, data: d.data() || {} };
  }

  function mapFlatDoc(d) {
    return Object.assign({ id: d.id }, d.data() || {});
  }

  function mergeDocsById(older, active) {
    var map = {};
    (older || []).forEach(function (item) {
      if (!item || !item.id) return;
      map[String(item.id)] = item;
    });
    (active || []).forEach(function (item) {
      if (!item || !item.id) return;
      map[String(item.id)] = item;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function sortDocsNewestFirst(docs) {
    return (docs || []).slice().sort(function (a, b) {
      var da = (a.data && a.data.date) ? a.data.date : (a.date || '');
      var dbd = (b.data && b.data.date) ? b.data.date : (b.date || '');
      var dateCompare = String(dbd).localeCompare(String(da));
      if (dateCompare !== 0) return dateCompare;
      var ta = (a.data && a.data.createdAt) ? a.data.createdAt : a.createdAt;
      var tb = (b.data && b.data.createdAt) ? b.data.createdAt : b.createdAt;
      var tsA = ta && ta.toMillis ? ta.toMillis() : (ta && ta.seconds ? ta.seconds * 1000 : new Date(ta || 0).getTime());
      var tsB = tb && tb.toMillis ? tb.toMillis() : (tb && tb.seconds ? tb.seconds * 1000 : new Date(tb || 0).getTime());
      return tsB - tsA;
    });
  }

  function resetState() {
    state.activeDocs = [];
    state.olderDocs = [];
    state.olderHasMore = true;
    state.olderLastDoc = null;
    state.olderLoading = false;
    state.expiryCacheDayKey = null;
    state.expiryCacheDocs = null;
    state.expiryCacheExpiring = null;
    state.metaCache = null;
    state.metaCacheUid = null;
  }

  function invalidateExpiryCache() {
    state.expiryCacheDayKey = null;
    state.expiryCacheDocs = null;
    state.expiryCacheExpiring = null;
  }

  function invalidateMetaCache() {
    state.metaCache = null;
    state.metaCacheUid = null;
  }

  function patchLocalDoc(docId, patch) {
    var id = String(docId);
    var found = false;
    state.activeDocs = state.activeDocs.map(function (item) {
      if (String(item.id) !== id) return item;
      found = true;
      return { id: item.id, data: Object.assign({}, item.data || {}, patch || {}) };
    });
    if (!found) {
      state.olderDocs = state.olderDocs.map(function (item) {
        if (String(item.id) !== id) return item;
        found = true;
        return { id: item.id, data: Object.assign({}, item.data || {}, patch || {}) };
      });
    }
    invalidateExpiryCache();
    invalidateMetaCache();
  }

  function removeLocalDoc(docId) {
    var id = String(docId);
    state.activeDocs = state.activeDocs.filter(function (item) { return String(item.id) !== id; });
    state.olderDocs = state.olderDocs.filter(function (item) { return String(item.id) !== id; });
    invalidateExpiryCache();
    invalidateMetaCache();
  }

  async function loadActiveDocumentsWindow(uid) {
    var colRef = docsColRef(uid);
    if (!colRef) return [];
    var cutoff = getIsoDateDaysAgo(ACTIVE_DAYS);
    try {
      var snap = await colRef
        .where('date', '>=', cutoff)
        .orderBy('date', 'desc')
        .orderBy('createdAt', 'desc')
        .get();
      state.activeDocs = snap.docs.map(mapDocSnap);
      return state.activeDocs;
    } catch (indexError) {
      console.warn('[DocumentsData] Active window fallback (no composite index):', indexError && indexError.message);
      var snapAll = await colRef.get();
      state.activeDocs = snapAll.docs
        .map(mapDocSnap)
        .filter(function (item) {
          var dt = item.data && item.data.date ? String(item.data.date) : '';
          return dt && dt >= cutoff;
        });
      state.activeDocs = sortDocsNewestFirst(state.activeDocs);
      return state.activeDocs;
    }
  }

  async function loadOlderDocumentsPage(uid) {
    if (!uid || state.olderLoading || !state.olderHasMore) {
      return { added: 0, hasMore: state.olderHasMore };
    }
    var colRef = docsColRef(uid);
    if (!colRef) return { added: 0, hasMore: false };

    state.olderLoading = true;
    var cutoff = getIsoDateDaysAgo(ACTIVE_DAYS);
    try {
      var query = colRef
        .where('date', '<', cutoff)
        .orderBy('date', 'desc')
        .orderBy('createdAt', 'desc')
        .limit(OLDER_PAGE_SIZE);
      if (state.olderLastDoc) query = query.startAfter(state.olderLastDoc);
      var snap = await query.get();
      var page = snap.docs.map(mapDocSnap);
      if (snap.docs.length) state.olderLastDoc = snap.docs[snap.docs.length - 1];
      state.olderHasMore = snap.docs.length >= OLDER_PAGE_SIZE;
      var existing = {};
      state.olderDocs.forEach(function (d) { existing[String(d.id)] = true; });
      page.forEach(function (d) {
        if (!existing[String(d.id)]) state.olderDocs.push(d);
      });
      return { added: page.length, hasMore: state.olderHasMore };
    } catch (e) {
      console.warn('[DocumentsData] Older page load failed:', e && e.message);
      state.olderHasMore = false;
      return { added: 0, hasMore: false, error: e };
    } finally {
      state.olderLoading = false;
    }
  }

  function getDocumentsForListDisplay() {
    return sortDocsNewestFirst(mergeDocsById(state.olderDocs, state.activeDocs));
  }

  async function loadAllDocumentsForExpiry(uid, options) {
    var force = options && options.force;
    var dayKey = getTodayDayKey();
    if (!force && state.expiryCacheDayKey === dayKey && Array.isArray(state.expiryCacheDocs)) {
      return state.expiryCacheDocs.slice();
    }

    var colRef = docsColRef(uid);
    if (!colRef) return [];

    var snap = await colRef.get();
    var docs = snap.docs.map(mapFlatDoc);
    state.expiryCacheDayKey = dayKey;
    state.expiryCacheDocs = docs;
    state.expiryCacheExpiring = null;
    return docs.slice();
  }

  function setExpiryCacheExpiring(list) {
    state.expiryCacheExpiring = Array.isArray(list) ? list.slice() : [];
  }

  function getCachedExpiryExpiring() {
    return Array.isArray(state.expiryCacheExpiring) ? state.expiryCacheExpiring.slice() : null;
  }

  async function loadMetaDocumentsCached(uid, options) {
    var force = options && options.force;
    if (!force && state.metaCacheUid === uid && Array.isArray(state.metaCache)) {
      return state.metaCache.slice();
    }
    var colRef = docsColRef(uid);
    if (!colRef) return [];
    var snap = await colRef.get();
    var docs = snap.docs.map(mapFlatDoc);
    state.metaCacheUid = uid;
    state.metaCache = docs;
    return docs.slice();
  }

  function hasOlderDocuments() {
    return state.olderHasMore;
  }

  function isOlderDocumentsLoading() {
    return state.olderLoading;
  }

  window.DocumentsDataService = {
    ACTIVE_DAYS: ACTIVE_DAYS,
    OLDER_PAGE_SIZE: OLDER_PAGE_SIZE,
    resetState: resetState,
    invalidateExpiryCache: invalidateExpiryCache,
    invalidateMetaCache: invalidateMetaCache,
    patchLocalDoc: patchLocalDoc,
    removeLocalDoc: removeLocalDoc,
    loadActiveDocumentsWindow: loadActiveDocumentsWindow,
    loadOlderDocumentsPage: loadOlderDocumentsPage,
    getDocumentsForListDisplay: getDocumentsForListDisplay,
    loadAllDocumentsForExpiry: loadAllDocumentsForExpiry,
    setExpiryCacheExpiring: setExpiryCacheExpiring,
    getCachedExpiryExpiring: getCachedExpiryExpiring,
    loadMetaDocumentsCached: loadMetaDocumentsCached,
    hasOlderDocuments: hasOlderDocuments,
    isOlderDocumentsLoading: isOlderDocumentsLoading,
    getTodayDayKey: getTodayDayKey
  };
})();
