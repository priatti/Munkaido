(function(){
  if (typeof window.deleteWorkRecord === 'function') { return; }
  async function deleteWorkRecord(recordId) {
    const id = String(recordId || '');
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
    if (!id) return Promise.reject('Érvénytelen azonosító.');
    try {
      if (window.currentUser && typeof navigator !== 'undefined' && !navigator.onLine) {
        const msg = i18n.errorOfflineDelete || 'Törléshez internetkapcsolat szükséges.';
        try { if (typeof showCustomAlert === 'function') showCustomAlert(msg, 'info'); } catch(_) {}
        return Promise.reject(msg);
      }
      if (!window.currentUser) {
        try {
          window.records = Array.isArray(window.records) ? window.records : [];
          window.records = window.records.filter(r => String(r.id) !== id);
          try { localStorage.setItem('workRecords', JSON.stringify(window.records)); } catch(_) {}
        } catch (e) {
          console.error('Local delete failed (shim):', e);
          throw new Error(i18n.deleteErrorGeneric || 'A törlés nem sikerült.');
        }
        return;
      }
      await db.collection('users')
        .doc(window.currentUser.uid)
        .collection('records')
        .doc(id)
        .delete();
      try {
        window.records = Array.isArray(window.records) ? window.records : [];
        window.records = window.records.filter(r => String(r.id) !== id);
        try { localStorage.setItem('workRecords', JSON.stringify(window.records)); } catch(_) {}
      } catch (e) {
        console.warn('Local cache update failed after delete (shim):', e);
      }
    } catch (e) {
      console.error('Record delete failed (shim):', e);
      safeCaptureException(e, { module: 'deleteWorkRecordShim' });
      return Promise.reject(i18n.deleteErrorTryLater || 'A törlés nem sikerült. Próbáld újra később.');
    }
  }
  window.deleteWorkRecord = deleteWorkRecord;
})();
