/**
 * GuriGO – 72 órás offline adatfelvételi policy (nem teljes offline-first).
 */
(function () {
  'use strict';
  console.log('[offlinePolicy.js] loaded build production-offline-shift1');

  var POLICY_PREFIX = 'gurigo_offline_policy_v1:';
  var OFFLINE_WINDOW_MS = 72 * 60 * 60 * 1000;
  var NOTICE_SLOT_CLASS = 'gurigo-offline-module-notice';

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

  function t(key, fallback) {
    var dict = i18nDict();
    return dict[key] || fallback;
  }

  function policyKey(uid) {
    return POLICY_PREFIX + String(uid || '');
  }

  function readPolicy(uid) {
    uid = uid || getUid();
    if (!uid) return null;
    try {
      var raw = localStorage.getItem(policyKey(uid));
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function writePolicy(uid, policy) {
    if (!uid || !policy) return;
    try {
      localStorage.setItem(policyKey(uid), JSON.stringify(policy));
    } catch (e) {
      console.warn('[OfflinePolicy] write failed:', e && e.message);
    }
  }

  function markSuccessfulOnlineSync(uid) {
    uid = uid || getUid();
    if (!uid) return false;
    var now = Date.now();
    writePolicy(uid, {
      lastSuccessfulOnlineSyncAtMs: now,
      offlineWriteAllowedUntilMs: now + OFFLINE_WINDOW_MS,
      updatedAtMs: now,
      lastPolicySource: 'internal'
    });
    console.log('[OfflinePolicy] policy window extended until', new Date(now + OFFLINE_WINDOW_MS).toISOString());
    if (typeof window.refreshOfflinePolicyUi === 'function') window.refreshOfflinePolicyUi();
    return true;
  }

  /** Csak sikeres Firestore server read után – nem login/navigator.onLine alapján. */
  function markOfflinePolicyFromServerRead(uid) {
    uid = uid || getUid();
    if (!uid || isOffline()) return false;
    var now = Date.now();
    writePolicy(uid, {
      lastSuccessfulOnlineSyncAtMs: now,
      offlineWriteAllowedUntilMs: now + OFFLINE_WINDOW_MS,
      updatedAtMs: now,
      lastPolicySource: 'server_read'
    });
    console.log('[OfflinePolicy] policy extended from confirmed Firestore server read');
    if (typeof window.refreshOfflinePolicyUi === 'function') window.refreshOfflinePolicyUi();
    return true;
  }

  /** Csak ha minden pending/failed tétel ténylegesen elkészült. */
  async function tryMarkOfflinePolicyAfterSync() {
    if (isOffline()) return false;
    var uid = getUid();
    if (!uid) return false;
    var unsynced = await hasAnyUnsyncedData();
    if (unsynced) {
      console.log('[OfflinePolicy] sync incomplete, policy window not extended');
      return false;
    }
    var now = Date.now();
    writePolicy(uid, {
      lastSuccessfulOnlineSyncAtMs: now,
      offlineWriteAllowedUntilMs: now + OFFLINE_WINDOW_MS,
      updatedAtMs: now,
      lastPolicySource: 'full_sync'
    });
    console.log('[OfflinePolicy] policy extended after full sync clear');
    if (typeof window.refreshOfflinePolicyUi === 'function') window.refreshOfflinePolicyUi();
    return true;
  }

  function isOffline() {
    return typeof navigator !== 'undefined' && !navigator.onLine;
  }

  function hasValidOfflineWindow(uid) {
    var p = readPolicy(uid);
    if (!p || typeof p.lastSuccessfulOnlineSyncAtMs !== 'number') return false;
    if (typeof p.offlineWriteAllowedUntilMs !== 'number') return false;
    return Date.now() <= p.offlineWriteAllowedUntilMs;
  }

  function isOfflineWriteWindowExpired(uid) {
    if (!isOffline()) return false;
    var p = readPolicy(uid);
    if (!p || typeof p.offlineWriteAllowedUntilMs !== 'number') return true;
    return Date.now() > p.offlineWriteAllowedUntilMs;
  }

  function showOfflineLimitExpiredAlert() {
    if (typeof showCustomAlert === 'function') {
      var title = t('offlineLimitExpiredTitle', 'Offline időkorlát lejárt');
      var text = t('offlineLimitExpiredText', 'Túl rég voltál online. Csatlakozz internethez a folytatáshoz.');
      showCustomAlert(title + '\n\n' + text, 'warning');
    }
  }

  function showSyncedRecordReadOnlyAlert() {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(
        t('offlineSyncedRecordReadOnly', 'Ez az adat már szinkronizált bejegyzés. Offline módban nem módosítható. Csatlakozz internethez a szerkesztéshez.'),
        'info'
      );
    }
  }

  function canCreateOfflineData(options) {
    options = options || {};
    if (!isOffline()) return { ok: true };
    if (options.allowAfterExpiry === true) return { ok: true, reason: 'expiry_exception' };
    if (!hasValidOfflineWindow()) {
      return { ok: false, reason: 'no_valid_window' };
    }
    if (isOfflineWriteWindowExpired()) {
      return { ok: false, reason: 'window_expired' };
    }
    return { ok: true };
  }

  function gateOfflineCreate(actionLabel, options) {
    var check = canCreateOfflineData(options);
    if (check.ok) return true;
    showOfflineLimitExpiredAlert();
    return false;
  }

  function inferRecordSyncStatus(record) {
    if (!record) return 'synced';
    if (record.syncStatus === 'pending' || record.syncStatus === 'failed' || record.syncStatus === 'synced') {
      return record.syncStatus;
    }
    if (record.createdOffline === true) {
      var rid = record.id != null ? String(record.id) : '';
      if (typeof window.isRecordPendingSync === 'function' && window.isRecordPendingSync(rid)) return 'pending';
      if (typeof window.isRecordExtendedPending === 'function' && window.isRecordExtendedPending(rid)) return 'pending';
      return 'pending';
    }
    return 'synced';
  }

  function isRecordSynced(record) {
    return inferRecordSyncStatus(record) === 'synced';
  }

  function canEditRecordOffline(record) {
    if (!isOffline()) return true;
    if (isOfflineWriteWindowExpired()) return false;
    if (!record) return false;
    var deviceId = getDeviceId();
    var status = inferRecordSyncStatus(record);
    return record.createdOffline === true &&
      status !== 'synced' &&
      String(record.offlineOriginDeviceId || '') === String(deviceId);
  }

  function canDeleteRecordOffline(record) {
    return canEditRecordOffline(record);
  }

  function canStartNewShiftOffline() {
    if (!isOffline()) return true;
    return gateOfflineCreate('startShift');
  }

  function canFinalizeActiveShiftOffline() {
    if (!isOffline()) return true;
    var hasActive = !!(window.activeShift && window.activeShift.date);
    if (!hasActive && typeof window.readActiveShiftLocalCacheQuick === 'function') {
      var uid = getUid();
      var entry = uid ? window.readActiveShiftLocalCacheQuick(uid) : null;
      hasActive = !!(entry && entry.data && entry.data.date);
    }
    if (hasActive) return true;
    return gateOfflineCreate('finalizeShift');
  }

  function canSaveWorkdayRecordOffline(options) {
    options = options || {};
    if (!isOffline()) return true;
    if (options.isUpdate && options.previousSnapshot) {
      if (typeof canEditRecordOffline === 'function' && !canEditRecordOffline(options.previousSnapshot)) {
        if (typeof isRecordSynced === 'function' && isRecordSynced(options.previousSnapshot)) {
          if (typeof showSyncedRecordReadOnlyAlert === 'function') showSyncedRecordReadOnlyAlert();
        } else if (typeof showOfflineLimitExpiredAlert === 'function') {
          showOfflineLimitExpiredAlert();
        }
        return false;
      }
      return true;
    }
    if (canFinalizeActiveShiftOffline()) return true;
    return gateOfflineCreate('workdaySave');
  }

  function stampOfflineCreatedFields(record, isUpdate) {
    if (!record || typeof record !== 'object') return record;
    if (!isOffline()) {
      if (!isUpdate) {
        record.syncStatus = record.syncStatus || 'synced';
      }
      return record;
    }
    var now = Date.now();
    var deviceId = getDeviceId();
    var out = Object.assign({}, record);
    if (!isUpdate) {
      out.createdOffline = true;
      out.createdOfflineAtMs = now;
      out.offlineOriginDeviceId = deviceId;
      out.syncStatus = 'pending';
    } else if (out.createdOffline === true && out.syncStatus !== 'synced') {
      out.syncStatus = out.syncStatus === 'failed' ? 'failed' : 'pending';
    }
    out.clientUpdatedAtMs = now;
    out.updatedByDeviceId = deviceId;
    var p = readPolicy(getUid());
    if (p && p.lastSuccessfulOnlineSyncAtMs) {
      out.lastSuccessfulSyncAtMs = p.lastSuccessfulOnlineSyncAtMs;
    }
    return out;
  }

  function markRecordSyncedLocally(recordId) {
    if (!recordId || !Array.isArray(window.records)) return;
    var id = String(recordId);
    window.records.forEach(function (r, idx) {
      if (String(r.id) === id) {
        window.records[idx] = Object.assign({}, r, { syncStatus: 'synced', createdOffline: r.createdOffline === true });
      }
    });
    window._recordsActiveList = window.records.slice();
  }

  function stampQueuedEntryFields(entry) {
    if (!entry || typeof entry !== 'object') return entry;
    if (!isOffline()) return entry;
    var now = Date.now();
    var deviceId = getDeviceId();
    var p = readPolicy(getUid());
    return Object.assign({}, entry, {
      createdOffline: true,
      createdOfflineAtMs: entry.createdOfflineAtMs || now,
      offlineOriginDeviceId: entry.offlineOriginDeviceId || deviceId,
      syncStatus: 'pending',
      clientUpdatedAtMs: now,
      updatedByDeviceId: deviceId,
      lastSuccessfulSyncAtMs: p && p.lastSuccessfulOnlineSyncAtMs ? p.lastSuccessfulOnlineSyncAtMs : null
    });
  }

  function canEditQueuedEntryOffline(entry) {
    if (!isOffline()) return true;
    if (isOfflineWriteWindowExpired()) return false;
    if (!entry) return false;
    return entry.createdOffline === true &&
      entry.syncStatus !== 'synced' &&
      String(entry.offlineOriginDeviceId || '') === String(getDeviceId());
  }

  function isPalletRecordOfflineEditable(record) {
    if (!record) return false;
    if (record.createdOffline === true && record.syncStatus !== 'synced') {
      return canEditQueuedEntryOffline(record);
    }
    if (typeof window.getPendingEntries === 'function') {
      return false;
    }
    return false;
  }

  async function countIndexedDbPending() {
    try {
      if (typeof window.getPendingCount === 'function') {
        return await window.getPendingCount();
      }
    } catch (_) {}
    return 0;
  }

  async function hasAnyUnsyncedData() {
    var uid = getUid();
    if (!uid) return false;

    var workdayPending = window._recordsPendingSyncIds && Object.keys(window._recordsPendingSyncIds).length > 0;
    if (workdayPending) return true;

    if (typeof window.hasAnyFailedSync === 'function' && window.hasAnyFailedSync()) return true;

    try {
      var pendingKey = 'gurigo_pending_workday_sync_v1:' + uid;
      var extRaw = localStorage.getItem(pendingKey);
      if (extRaw && Object.keys(JSON.parse(extRaw) || {}).length > 0) return true;
    } catch (_) {}

    if (window._activeShiftClearPending) return true;
    try {
      if (localStorage.getItem('gurigo_active_shift_clear_pending_v1:' + uid)) return true;
    } catch (_) {}
    try {
      var shiftCache = localStorage.getItem('gurigo_active_shift_cache_v1:' + uid);
      if (shiftCache) {
        var parsed = JSON.parse(shiftCache);
        if (parsed && parsed.pendingSync) return true;
      }
    } catch (_) {}

    var idbCount = await countIndexedDbPending();
    if (idbCount > 0) return true;

    if (typeof window.getPendingDocumentsCount === 'function') {
      var docCount = await window.getPendingDocumentsCount(uid);
      if (docCount > 0) return true;
    }

    return false;
  }

  async function getUnsyncedDataSummary() {
    var uid = getUid();
    var parts = [];
    if (!uid) return parts;

    var pendingIds = window._recordsPendingSyncIds ? Object.keys(window._recordsPendingSyncIds) : [];
    if (pendingIds.length > 0) {
      parts.push(t('logoutPendingWorkday', 'Munkanap rekordok szinkronizálásra várnak') + ' (' + pendingIds.length + ')');
    }
    if (typeof window.hasAnyFailedSync === 'function' && window.hasAnyFailedSync()) {
      parts.push(t('logoutPendingFailed', 'Sikertelen mentések vannak – próbáld újra'));
    }
    try {
      var extRaw = localStorage.getItem('gurigo_pending_workday_sync_v1:' + uid);
      var extCount = extRaw ? Object.keys(JSON.parse(extRaw) || {}).length : 0;
      if (extCount > 0) parts.push(t('oldRecordPendingSync', 'Régebbi rekord szinkronizálásra vár') + ' (' + extCount + ')');
    } catch (_) {}
    if (window._activeShiftClearPending) {
      parts.push(t('logoutPendingActiveShift', 'Aktív műszak zárása függőben'));
    } else {
      try {
        if (localStorage.getItem('gurigo_active_shift_clear_pending_v1:' + uid)) {
          parts.push(t('logoutPendingActiveShift', 'Aktív műszak zárása függőben'));
        }
      } catch (_) {}
    }
    var idbCount = await countIndexedDbPending();
    if (idbCount > 0) {
      parts.push(t('logoutPendingQueue', 'Várakozó offline sor') + ' (' + idbCount + ')');
    }
    if (typeof window.getPendingDocumentsCount === 'function') {
      var docCount = await window.getPendingDocumentsCount(uid);
      if (docCount > 0) parts.push(t('logoutPendingDocuments', 'Dokumentum feltöltésre vár') + ' (' + docCount + ')');
    }
    return parts;
  }

  async function canLogoutNow() {
    var unsynced = await hasAnyUnsyncedData();
    if (!unsynced) return { ok: true };
    var summary = await getUnsyncedDataSummary();
    var base = t('logoutBlockedPendingSync', 'Vannak még nem szinkronizált adataid. Kijelentkezés előtt csatlakozz internethez, és várd meg a szinkronizálást.');
    var detail = summary.length ? '\n\n• ' + summary.join('\n• ') : '';
    if (isOffline()) {
      return { ok: false, reason: 'offline_pending', message: base + detail, summary: summary };
    }
    return { ok: false, reason: 'online_pending', message: base + detail, summary: summary, suggestRetry: true };
  }

  function getModuleNoticeState() {
    if (!isOffline()) return { mode: 'hidden' };
    if (isOfflineWriteWindowExpired()) {
      return { mode: 'expired' };
    }
    return { mode: 'active' };
  }

  function buildModuleNoticeHtml(module) {
    var state = getModuleNoticeState();
    if (state.mode === 'hidden') return '';

    var isDocs = module === 'documents';
    var title = t('offlineModeNoticeTitle', 'Offline mód');
    var text;
    var extraClass = 'bg-amber-50 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-700';

    if (state.mode === 'expired') {
      title = t('offlineLimitExpiredTitle', 'Offline időkorlát lejárt');
      text = t('offlineLimitExpiredText', 'Túl rég voltál online. Csatlakozz internethez a folytatáshoz.');
      extraClass = 'bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-200 border-red-200 dark:border-red-700';
    } else if (isDocs) {
      text = t('offlineDocumentPendingNoticeText', 'Offline módban használod az alkalmazást. A kiválasztott dokumentum feltöltésre vár.');
    } else {
      text = t('offlineModeNoticeText', 'Offline módban használod az alkalmazást. Az új bejegyzések ezen az eszközön tárolódnak, és internetkapcsolat esetén automatikusan szinkronizálódnak.');
    }

    return '<div class="' + NOTICE_SLOT_CLASS + ' text-xs rounded-lg border px-3 py-2 mb-3 ' + extraClass + '" role="status">' +
      '<p class="font-semibold mb-0.5">' + title + '</p>' +
      '<p class="opacity-90">' + text + '</p>' +
      '</div>';
  }

  function injectModuleNotice(containerId, module) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var existing = el.querySelector('.' + NOTICE_SLOT_CLASS);
    var html = buildModuleNoticeHtml(module);
    if (!html) {
      if (existing) existing.remove();
      return;
    }
    if (existing) {
      existing.outerHTML = html;
    } else {
      el.insertAdjacentHTML('afterbegin', html);
    }
  }

  function refreshOfflinePolicyUi() {
    injectModuleNotice('content-live', 'workday');
    injectModuleNotice('content-start', 'workday');
    injectModuleNotice('content-full-day', 'workday');
    injectModuleNotice('content-pallets', 'pallets');
    injectModuleNotice('content-fueling', 'fueling');
    injectModuleNotice('content-documents', 'documents');
    if (typeof window.updateConnectionStatus === 'function') window.updateConnectionStatus();
    if (typeof window.applyOfflinePolicyButtonStates === 'function') window.applyOfflinePolicyButtonStates();
  }

  function clearPolicyForUid(uid) {
    if (!uid) return;
    try { localStorage.removeItem(policyKey(uid)); } catch (_) {}
  }

  window.OFFLINE_WRITE_WINDOW_MS = OFFLINE_WINDOW_MS;
  window.markSuccessfulOnlineSync = markSuccessfulOnlineSync;
  window.markOfflinePolicyFromServerRead = markOfflinePolicyFromServerRead;
  window.tryMarkOfflinePolicyAfterSync = tryMarkOfflinePolicyAfterSync;
  window.getUnsyncedDataSummary = getUnsyncedDataSummary;
  window.readOfflinePolicy = readPolicy;
  window.hasValidOfflineWindow = hasValidOfflineWindow;
  window.isOfflineWriteWindowExpired = isOfflineWriteWindowExpired;
  window.canCreateOfflineData = canCreateOfflineData;
  window.gateOfflineCreate = gateOfflineCreate;
  window.inferRecordSyncStatus = inferRecordSyncStatus;
  window.isRecordSynced = isRecordSynced;
  window.canEditRecordOffline = canEditRecordOffline;
  window.canDeleteRecordOffline = canDeleteRecordOffline;
  window.canStartNewShiftOffline = canStartNewShiftOffline;
  window.canFinalizeActiveShiftOffline = canFinalizeActiveShiftOffline;
  window.canSaveWorkdayRecordOffline = canSaveWorkdayRecordOffline;
  window.stampOfflineCreatedFields = stampOfflineCreatedFields;
  window.markRecordSyncedLocally = markRecordSyncedLocally;
  window.stampQueuedEntryFields = stampQueuedEntryFields;
  window.canEditQueuedEntryOffline = canEditQueuedEntryOffline;
  window.isPalletRecordOfflineEditable = isPalletRecordOfflineEditable;
  window.hasAnyUnsyncedData = hasAnyUnsyncedData;
  window.canLogoutNow = canLogoutNow;
  window.buildModuleNoticeHtml = buildModuleNoticeHtml;
  window.injectModuleNotice = injectModuleNotice;
  window.refreshOfflinePolicyUi = refreshOfflinePolicyUi;
  window.showOfflineLimitExpiredAlert = showOfflineLimitExpiredAlert;
  window.showSyncedRecordReadOnlyAlert = showSyncedRecordReadOnlyAlert;
  function applyOfflinePolicyButtonStates() {
    var offline = isOffline();
    var expired = isOfflineWriteWindowExpired();
    var hasActive = !!(window.activeShift && window.activeShift.date);
    if (!hasActive && typeof window.readActiveShiftLocalCacheQuick === 'function') {
      var uid = getUid();
      var entry = uid ? window.readActiveShiftLocalCacheQuick(uid) : null;
      hasActive = !!(entry && entry.data && entry.data.date);
    }

    function setBtnState(el, disabled) {
      if (!el) return;
      el.disabled = !!disabled;
      if (disabled) {
        el.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
      } else {
        el.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
      }
    }

    document.querySelectorAll('[onclick="startShift()"]').forEach(function (el) {
      setBtnState(el, offline && expired);
    });
    document.querySelectorAll('[onclick="finalizeShift()"]').forEach(function (el) {
      setBtnState(el, offline && expired && !hasActive);
    });
    document.querySelectorAll('[onclick="saveWorkdayEntry()"]').forEach(function (el) {
      var editing = typeof window.editingId !== 'undefined' && window.editingId;
      setBtnState(el, offline && expired && !editing);
    });
    setBtnState(document.getElementById('pallet-save-btn'), offline && expired);
    setBtnState(document.getElementById('fueling-save-btn'), offline && expired);
    setBtnState(document.getElementById('documents-save-btn'), offline && expired);
  }

  window.applyOfflinePolicyButtonStates = applyOfflinePolicyButtonStates;

  window.addEventListener('online', function () {
    setTimeout(refreshOfflinePolicyUi, 300);
  });
  window.addEventListener('offline', function () {
    refreshOfflinePolicyUi();
  });
})();
