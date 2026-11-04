/**
 * GuriGO Offline Sync – Online/offline event listeners és automatikus szinkronizáció
 */
(function () {
  console.log('[offlineSync.js] loaded build production-offline-shift1');
  var retrySyncInterval = null;
  var onlineFlashTimer = null;

  function i18nText(key, fallback) {
    try {
      if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
        var dict = translations[currentLang] || {};
        if (dict[key]) return dict[key];
      }
    } catch (_) {}
    return fallback;
  }

  function showToast(msg, type) {
    try {
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(msg, type || 'info');
      }
    } catch (_) {}
  }

  function startBackgroundSync() {
    if (retrySyncInterval) return;
    retrySyncInterval = setInterval(function () {
      if (!navigator.onLine) return;
      if (typeof window.getPendingCount !== 'function') return;
      window.getPendingCount().then(function (count) {
        if (count === 0) {
          stopBackgroundSync();
          return;
        }
        if (!window.db || typeof window.syncPendingEntries !== 'function') return;
        console.log('[OfflineSync] Background sync: ' + count + ' pending entries, attempting sync...');
        return window.syncPendingEntries(window.db).then(function (result) {
          if (result.synced > 0) {
            var successTpl = i18nText('backgroundSyncSuccess', '{synced} bejegyzés szinkronizálva!');
            var msg = String(successTpl).replace('{synced}', result.synced);
            showToast(msg, 'success');
            updatePendingBadge();
          }
          if (result.remaining === 0) {
            stopBackgroundSync();
          }
        });
      }).catch(function () {});
    }, 60000);
  }

  function stopBackgroundSync() {
    if (retrySyncInterval) {
      clearInterval(retrySyncInterval);
      retrySyncInterval = null;
    }
  }

  function setOfflineBannerMode(mode) {
    var banner = document.getElementById('offline-mode-banner');
    if (!banner) return;
    banner.classList.remove(
      'bg-amber-50', 'dark:bg-amber-900/30', 'text-amber-900', 'dark:text-amber-200',
      'border-amber-200', 'dark:border-amber-800',
      'bg-green-50', 'dark:bg-green-900/30', 'text-green-900', 'dark:text-green-200',
      'border-green-200', 'dark:border-green-800'
    );
    if (mode === 'online-flash') {
      banner.classList.add(
        'bg-green-50', 'dark:bg-green-900/30', 'text-green-900', 'dark:text-green-200',
        'border-green-200', 'dark:border-green-800'
      );
      banner.textContent = i18nText('connectionBackOnline', 'Újra online');
      banner.classList.remove('hidden');
      return;
    }
    if (mode === 'offline') {
      banner.classList.add(
        'bg-amber-50', 'dark:bg-amber-900/30', 'text-amber-900', 'dark:text-amber-200',
        'border-amber-200', 'dark:border-amber-800'
      );
      banner.textContent = i18nText('offlineModeBanner', 'Offline mód – az adatok később szinkronizálódhatnak');
      banner.classList.remove('hidden');
      return;
    }
    banner.classList.add('hidden');
    banner.textContent = '';
  }

  function updateOfflineModeBanner() {
    if (!navigator.onLine) {
      setOfflineBannerMode('offline');
    } else {
      setOfflineBannerMode('hidden');
    }
  }

  function flashBackOnline() {
    setOfflineBannerMode('online-flash');
    clearTimeout(onlineFlashTimer);
    onlineFlashTimer = setTimeout(function () {
      updateOfflineModeBanner();
    }, 3000);
  }

  function updateConnectionStatus() {
    var indicator = document.getElementById('connection-status');
    if (!indicator) return;

    function applyIndicator(mode, title) {
      if (mode === 'offline') {
        indicator.textContent = '🔴';
        indicator.title = title || i18nText('statusOffline', 'Offline');
        indicator.className = 'text-xs font-medium px-2 py-0.5 rounded status-offline text-red-600 dark:text-red-400';
      } else if (mode === 'pending') {
        indicator.textContent = '🟠';
        indicator.title = title || i18nText('statusPendingSync', 'Online – szinkronizálás folyamatban');
        indicator.className = 'text-xs font-medium px-2 py-0.5 rounded status-pending text-orange-600 dark:text-orange-400';
      } else {
        indicator.textContent = '🟢';
        indicator.title = title || i18nText('statusOnline', 'Online');
        indicator.className = 'text-xs font-medium px-2 py-0.5 rounded status-online';
      }
      updateOfflineModeBanner();
    }

    if (!navigator.onLine) {
      applyIndicator('offline');
      return;
    }

    Promise.all([
      typeof window.getPendingCount === 'function' ? window.getPendingCount() : Promise.resolve(0),
      typeof window.hasAnyUnsyncedData === 'function' ? window.hasAnyUnsyncedData() : Promise.resolve(false),
      typeof window.hasAnyFailedSync === 'function' ? Promise.resolve(window.hasAnyFailedSync()) : Promise.resolve(false)
    ]).then(function (results) {
      var queueCount = results[0] || 0;
      var anyUnsynced = !!results[1];
      var anyFailed = !!results[2];
      if (queueCount > 0 || anyUnsynced || anyFailed) {
        applyIndicator('pending');
      } else {
        applyIndicator('online');
      }
    }).catch(function () {
      applyIndicator('online');
    });
  }

  function updatePendingBadge() {
    if (typeof window.getPendingCount !== 'function') return;
    window.getPendingCount().then(function (count) {
      var badge = document.getElementById('pending-badge');
      if (!badge) return;
      if (count > 0) {
        badge.textContent = i18nText('pendingCount', count + ' várakozik').replace('{count}', String(count));
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }).catch(function () {});
  }

  window.updateConnectionStatus = updateConnectionStatus;
  window.updatePendingBadge = updatePendingBadge;
  window.updateOfflineModeBanner = updateOfflineModeBanner;

  window.addEventListener('online', function () {
    updateConnectionStatus();
    flashBackOnline();
    showToast(i18nText('connectionRestored', 'Kapcsolat visszaállt, szinkronizálás...'), 'info');
    if (typeof window.syncPendingActiveShiftIfNeeded === 'function') {
      window.syncPendingActiveShiftIfNeeded().then(function () {
        if (typeof window.updateConnectionStatus === 'function') window.updateConnectionStatus();
      }).catch(function (err) { console.warn('[OfflineSync] activeShift sync failed:', err); });
    }
    if (typeof window.refreshWorkdaySyncUi === 'function') {
      setTimeout(function () { window.refreshWorkdaySyncUi(); }, 1500);
    }
    if (typeof window.onOnlineSyncChecks === 'function') {
      setTimeout(function () { window.onOnlineSyncChecks(); }, 800);
    }
    if (typeof window.updateSyncRetryBanner === 'function') {
      window.updateSyncRetryBanner();
    }
    if (typeof window.syncPendingDocuments === 'function' && typeof window.uploadPendingDocumentItem === 'function') {
      window.syncPendingDocuments(window.uploadPendingDocumentItem).catch(function () {});
    }
    if (typeof window.refreshOfflinePolicyUi === 'function') {
      setTimeout(function () { window.refreshOfflinePolicyUi(); }, 400);
    }
    var db = window.db;
    if (typeof window.syncPendingEntries === 'function' && db) {
      window.syncPendingEntries(db).then(function (result) {
        if (result.synced > 0) {
          showToast(i18nText('syncSuccess', result.synced + ' bejegyzés szinkronizálva!').replace('{synced}', String(result.synced)), 'success');
        }
        if (result.failed > 0) {
          var retryTpl = i18nText('offlineSyncRetry', '{failed} bejegyzés sikertelen, újrapróbálás 1 percen belül.');
          var retryMsg = String(retryTpl).replace('{failed}', result.failed);
          showToast(retryMsg, 'warning');
          startBackgroundSync();
        }
        updatePendingBadge();
        if (typeof window.tryMarkOfflinePolicyAfterSync === 'function') {
          window.tryMarkOfflinePolicyAfterSync().catch(function () {});
        }
        if (typeof window.updateConnectionStatus === 'function') window.updateConnectionStatus();
      }).catch(function (err) { console.warn('[OfflineSync] Sync failed:', err); updatePendingBadge(); });
    } else {
      updatePendingBadge();
    }
  });

  window.addEventListener('offline', function () {
    updateConnectionStatus();
    showToast(i18nText('connectionLost', 'Nincs internetkapcsolat. A bejegyzések helyileg mentődnek.'), 'warning');
    stopBackgroundSync();
  });

  window.addEventListener('load', function () {
    updateConnectionStatus();
    updatePendingBadge();
    if (typeof window.updateSyncRetryBanner === 'function') {
      window.updateSyncRetryBanner();
    }
    if (navigator.onLine && typeof window.syncPendingActiveShiftIfNeeded === 'function') {
      window.syncPendingActiveShiftIfNeeded().then(function () {
        if (typeof window.updateConnectionStatus === 'function') window.updateConnectionStatus();
      }).catch(function () {});
    }
    if (navigator.onLine && typeof window.getPendingCount === 'function' && typeof window.syncPendingEntries === 'function' && window.db) {
      window.getPendingCount().then(function (count) {
        if (count > 0) {
          window.syncPendingEntries(window.db).then(function (result) {
            if (result.synced > 0) {
              showToast(i18nText('syncOldEntries', result.synced + ' korábbi bejegyzés szinkronizálva!').replace('{synced}', String(result.synced)), 'success');
            }
            if (result.remaining > 0) {
              startBackgroundSync();
            }
            updatePendingBadge();
          }).catch(function (err) { console.warn('[OfflineSync] Load sync failed:', err); updatePendingBadge(); });
        }
      }).catch(function () {});
    }
  });

  window.addEventListener('beforeunload', function (e) {
    if (typeof window.getPendingCount !== 'function') return;
    window.getPendingCount().then(function (count) {
      if (count > 0 && !navigator.onLine) {
        e.preventDefault();
        e.returnValue = i18nText('pendingDataWarning', 'Vannak még nem szinkronizált bejegyzéseid. Biztosan kilépsz?');
      }
    }).catch(function () {});
  });
})();
