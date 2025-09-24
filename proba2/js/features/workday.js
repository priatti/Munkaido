// =======================================================
// ===== ÉLŐ MŰSZAK KEZELÉSE (WORKDAY.JS) ==============
// =======================================================
(function () {
  'use strict';

  const now = () => new Date();
  const pad2 = n => String(n).padStart(2, '0');
  const fmtDateISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const fmtTimeHM  = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  
  const ACTIVE_SHIFT_KEY = 'activeShift';
  let activeShift = null;
  
  function persistActiveShift(s){
    try { 
      window.activeShift = s;
      activeShift = s;
      localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(s)); 
    } catch(e) { console.error("Failed to persist active shift:", e); }
  }

  function clearActiveShiftStorage(){
    try { 
      window.activeShift = null;
      activeShift = null;
      localStorage.removeItem(ACTIVE_SHIFT_KEY); 
    } catch(e) { console.error("Failed to clear active shift:", e); }
  }
  
  function startShift() {
    if (activeShift) {
        console.warn('[workday] Már van aktív műszak.');
        return;
    }
    
    const dateElement = document.getElementById('liveStartDate');
    const timeElement = document.getElementById('liveStartTime');
    const locationElement = document.getElementById('liveStartLocation');
    const weeklyDriveElement = document.getElementById('liveWeeklyDriveStart');
    const kmElement = document.getElementById('liveStartKm');
    
    if (!dateElement || !timeElement) {
        console.error('[workday] Required form elements not found');
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Hiányzó űrlap elemek!', 'info');
        }
        return;
    }
    
    const shift = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        date: dateElement.value || fmtDateISO(now()),
        startTime: timeElement.value || fmtTimeHM(now()),
        startLocation: locationElement ? locationElement.value.trim() : '',
        weeklyDriveStartStr: weeklyDriveElement ? weeklyDriveElement.value : '',
        kmStart: kmElement ? parseFloat(kmElement.value) || 0 : 0,
        crossings: []
    };
    
    persistActiveShift(shift);
    if (typeof showCustomAlert === 'function') showCustomAlert(translations[currentLang].startWorkday, 'success');
    if (typeof renderStartTab === 'function') renderStartTab();
    console.log('[workday] Műszak indult:', shift);
  }

  async function finalizeShift(completedRecord) {
    if (!completedRecord) {
        const currentShift = activeShift || window.activeShift;
        if (!currentShift) {
            console.warn('[workday] finalizeShift called without an active shift');
            if (typeof showCustomAlert === 'function') showCustomAlert('Nincs aktív műszak a befejezéshez!', 'info');
            return;
        }

        if (typeof showFinalizationModal === 'function') {
            showFinalizationModal();
        } else {
            console.error('showFinalizationModal function is not defined!');
        }
        return;
    }

    const i18n = translations[currentLang];
    if (!completedRecord.id) {
        console.warn('[workday] finalizeShift called with invalid data.');
        return;
    }

    try {
        if (typeof saveWorkRecord !== 'function') {
            throw new Error('saveWorkRecord function not found!');
        }
        
        await saveWorkRecord(completedRecord);
        
        clearActiveShiftStorage();
        if (typeof showCustomAlert === 'function') showCustomAlert(i18n.alertSaveSuccess || 'Munkanap sikeresen befejezve!', 'success');
        
        if (typeof renderApp === 'function') {
            renderApp(); // renderApp frissít mindent, beleértve a listát és a start fület is.
        }

    } catch (e) {
      console.error('[workday] finalizeShift error:', e);
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
    
    const fromEl = document.getElementById('liveCrossFrom');
    const toEl = document.getElementById('liveCrossTo');
    const timeEl = document.getElementById('liveCrossTime');
    
    if(!fromEl || !toEl || !timeEl) {
      console.error("Crossing form elements are missing.");
      return;
    }
    
    const from = fromEl.value.trim().toUpperCase();
    const to = toEl.value.trim().toUpperCase();
    const time = timeEl.value;

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

  (function restoreActiveShiftOnLoad(){
    try {
      const raw = localStorage.getItem(ACTIVE_SHIFT_KEY);
      const persisted = raw ? JSON.parse(raw) : null;
      if (persisted && persisted.date && persisted.startTime) {
        activeShift = persisted;
        window.activeShift = persisted;
      }
    } catch(e) { console.error("Failed to restore active shift:", e); }
  })();

  if (typeof window !== 'undefined') {
    window.startShift = startShift;
    window.finalizeShift = finalizeShift;
    window.cancelShift = cancelShift;
    window.addLiveCrossing = addLiveCrossing;
  }
})();