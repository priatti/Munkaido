// =======================================================
// ===== ÉLŐ MŰSZAK KEZELÉSE (WORKDAY.JS) ==============
// =======================================================
(function () {
  'use strict';

  // --- Helpers ---
  const now = () => new Date();
  const pad2 = n => String(n).padStart(2, '0');
  const fmtDateISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const fmtTimeHM  = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const safeStr = v => (v == null ? '' : String(v));

  // --- State ---
  const ACTIVE_SHIFT_KEY = 'activeShift';
  let activeShift = null;
  
  // --- Active shift persistence ---
  function persistActiveShift(s){
    try { 
      window.activeShift = s;
      activeShift = s;
      localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(s)); 
    } catch {}
  }

  function clearActiveShiftStorage(){
    try { 
      window.activeShift = null;
      activeShift = null;
      localStorage.removeItem(ACTIVE_SHIFT_KEY); 
    } catch {}
  }
  
  // --- Public API ---
  function startShift() {
    if (activeShift) {
        console.warn('[workday] Már van aktív műszak.');
        return;
    }
    const shift = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date: document.getElementById('liveStartDate')?.value || fmtDateISO(now()),
      startTime: document.getElementById('liveStartTime')?.value || fmtTimeHM(now()),
      startLocation: document.getElementById('liveStartLocation')?.value.trim() || '',
      weeklyDriveStartStr: document.getElementById('liveWeeklyDriveStart')?.value || '',
      kmStart: parseFloat(document.getElementById('liveStartKm')?.value) || 0,
      crossings: []
    };
    persistActiveShift(shift);
    if (typeof showCustomAlert === 'function') showCustomAlert('Munkanap sikeresen elindítva!', 'success');
    if (typeof renderStartTab === 'function') renderStartTab();
    console.log('[workday] Műszak indult:', shift);
  }

  async function finalizeShift(completedRecord) {
    // ESET 1: A gombra kattintva, adatok NÉLKÜL hívódik meg -> nyissuk meg a modalt.
    if (!completedRecord) {
        const currentShift = activeShift || window.activeShift;
        if (!currentShift) {
            console.warn('[workday] finalizeShift hívás aktív műszak nélkül');
            if (typeof showCustomAlert === 'function') showCustomAlert('Nincs aktív műszak a befejezéshez!', 'info');
            return;
        }

        if (typeof showFinalizationModal === 'function') {
            showFinalizationModal();
        } else {
            console.error('showFinalizationModal function is not defined!');
        }
        return; // Itt megállunk, a folyamat a modalban folytatódik.
    }

    // ESET 2: A modalból, a lezárt adatokkal hívódik meg -> mentsük el a bejegyzést.
    const i18n = translations[currentLang];
    if (!completedRecord.id) {
        console.warn('[workday] finalizeShift hívás érvénytelen adatokkal.');
        return;
    }

    try {
        if (typeof saveWorkRecord !== 'function') {
            throw new Error('saveWorkRecord function not found!');
        }
        
        await saveWorkRecord(completedRecord);
        
        clearActiveShiftStorage();
        if (typeof showCustomAlert === 'function') showCustomAlert(i18n.alertSaveSuccess || 'Munkanap sikeresen befejezve!', 'success');
        
        if (typeof renderStartTab === 'function') {
            renderStartTab();
        }
        if (typeof renderRecords === 'function') {
            renderRecords();
        }

    } catch (e) {
      console.error('[workday] finalizeShift hiba:', e);
      if (typeof showCustomAlert === 'function') showCustomAlert('Hiba történt a mentés során: ' + e.message, 'info');
    }
  }

  function cancelShift(){
    if (!activeShift && !window.activeShift) return;
    clearActiveShiftStorage();
    if (typeof showCustomAlert === 'function') showCustomAlert('Munkanap elvetve.', 'info');
    if (typeof renderStartTab === 'function') {
        renderStartTab();
    }
  }

  function addLiveCrossing() {
    const currentShift = activeShift || window.activeShift;
    if (!currentShift) {
        if (typeof showCustomAlert === 'function') showCustomAlert('Nincs aktív műszak!', 'info');
        return;
    }
    
    const from = document.getElementById('liveCrossFrom').value.trim().toUpperCase();
    const to = document.getElementById('liveCrossTo').value.trim().toUpperCase();
    const time = document.getElementById('liveCrossTime').value;

    if (!from || !to || !time) {
        if (typeof showCustomAlert === 'function') showCustomAlert('Kérlek tölts ki minden mezőt a határátlépéshez!', 'info');
        return;
    }

    if (!currentShift.crossings) {
        currentShift.crossings = [];
    }
    currentShift.crossings.push({ from, to, time });
    persistActiveShift(currentShift);
    if (typeof renderStartTab === 'function') renderStartTab();
  }

  // --- Initialization and Global Exposure ---
  (function restoreActiveShiftOnLoad(){
    try {
      const raw = localStorage.getItem(ACTIVE_SHIFT_KEY);
      const persisted = raw ? JSON.parse(raw) : null;
      if (persisted && persisted.date && persisted.startTime) {
        activeShift = persisted;
        window.activeShift = persisted;
      }
    } catch {}
  })();

  if (typeof window !== 'undefined') {
    window.startShift = startShift;
    window.finalizeShift = finalizeShift;
    window.cancelShift = cancelShift;
    window.addLiveCrossing = addLiveCrossing;
  }
})();