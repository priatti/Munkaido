// =======================================================
// ===== ÉLŐ MŰSZAK KEZELÉSE (WORKDAY.JS) - JAVÍTOTT VERZIÓ =====
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

  function loadLastValuesForLiveTab() {
    try {
      let lastRecord = null;
      if (typeof window.getLatestRecord === 'function') {
        lastRecord = window.getLatestRecord();
      }
      
      if (!lastRecord) {
        return;
      }
      
      const weeklyDriveInput = document.getElementById('liveWeeklyDriveStart');
      if (weeklyDriveInput && lastRecord.weeklyDriveEndStr) {
        weeklyDriveInput.value = lastRecord.weeklyDriveEndStr;
      }

      const kmInput = document.getElementById('liveStartKm');
      if (kmInput && typeof lastRecord.kmEnd !== 'undefined' && lastRecord.kmEnd !== null) {
        kmInput.value = String(lastRecord.kmEnd);
      }
      
      const locationInput = document.getElementById('liveStartLocation');
      if (locationInput && lastRecord.endLocation) {
        locationInput.value = lastRecord.endLocation;
      }

    } catch (e) {
      console.warn('[workday] Error loading last values:', e);
    }
  }

  function renderStartTab() {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
    
    const currentShift = activeShift || window.activeShift || getActiveShiftFromStorage();
    
    const newDayForm = document.getElementById('start-new-day-form');
    const progressView = document.getElementById('live-progress-view');
    
    if (!newDayForm || !progressView) {
      console.error('[workday] Required DOM elements not found for start tab');
      return;
    }

    if (currentShift && currentShift.date && currentShift.startTime) {
      newDayForm.classList.add('hidden');
      progressView.classList.remove('hidden');
      
      const startTimeElement = document.getElementById('live-start-time');
      if (startTimeElement) {
        const startDateTime = new Date(`${currentShift.date}T${currentShift.startTime}`);
        const locale = 'hu-HU';
        startTimeElement.textContent = `${i18n.startedAt || 'Elkezdve'}: ${startDateTime.toLocaleDateString(locale)} ${currentShift.startTime}`;
      }
      
      const summaryContainer = document.getElementById('live-start-summary');
      if (summaryContainer) {
        summaryContainer.innerHTML = `
          <div class="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <h3 class="font-semibold text-gray-800 dark:text-gray-100 mb-2">${i18n.liveShiftDetailsTitle || 'Műszak adatai'}</h3>
            <div class="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><strong>${i18n.liveStartLocationLabel || 'Kezdő hely:'}</strong> ${currentShift.startLocation || 'N/A'}</p>
              <p><strong>${i18n.liveStartDriveLabel || 'Kezdő vezetés:'}</strong> ${currentShift.weeklyDriveStartStr || '0:00'}</p>
              <p><strong>${i18n.liveStartKmLabel || 'Kezdő km:'}</strong> ${currentShift.kmStart || 0} km</p>
            </div>
          </div>
        `;
      }
      
      renderLiveCrossings(currentShift);
      
    } else {
      newDayForm.classList.remove('hidden');
      progressView.classList.add('hidden');
      
      const dateInput = document.getElementById('liveStartDate');
      const timeInput = document.getElementById('liveStartTime');
      
      if (dateInput && !dateInput.value) dateInput.value = fmtDateISO(now());
      if (timeInput && !timeInput.value) timeInput.value = fmtTimeHM(now());
      
      loadLastValuesForLiveTab();
    }
  }

  function getActiveShiftFromStorage() {
    try {
      const raw = localStorage.getItem(ACTIVE_SHIFT_KEY);
      const persisted = raw ? JSON.parse(raw) : null;
      if (persisted && persisted.date && persisted.startTime) return persisted;
    } catch(e) {
      console.error("Failed to get active shift from storage:", e);
    }
    return null;
  }

  function renderLiveCrossings(shift) {
    const container = document.getElementById('live-crossings-list');
    if (!container) return;
    
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
    
    if (!shift.crossings || shift.crossings.length === 0) {
      container.innerHTML = `<p class="text-xs text-gray-500 italic">${i18n.summaryNoData || 'Nincs adat'}</p>`;
      return;
    }
    
    container.innerHTML = `
      <p class="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1">${i18n.recordedCrossings || 'Rögzített átlépések:'}</p>
      <div class="space-y-1">
        ${shift.crossings.map(crossing => `
          <div class="text-xs bg-white dark:bg-gray-700 rounded px-2 py-1 border border-indigo-200 dark:border-indigo-700">
            <span class="font-mono">${crossing.time}</span> - 
            <span class="font-semibold">${crossing.from}</span> → 
            <span class="font-semibold">${crossing.to}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  function startShift() {
    const currentShift = getActiveShiftFromStorage();
    if (currentShift) {
        console.warn('[workday] Már van aktív műszak:', currentShift);
        if (typeof showCustomAlert === 'function') showCustomAlert('Már van aktív műszak!', 'warning');
        return;
    }
    
    const dateElement = document.getElementById('liveStartDate');
    const timeElement = document.getElementById('liveStartTime');
    const locationElement = document.getElementById('liveStartLocation');
    const weeklyDriveElement = document.getElementById('liveWeeklyDriveStart');
    const kmElement = document.getElementById('liveStartKm');
    
    if (!dateElement || !timeElement || !dateElement.value || !timeElement.value) {
        if (typeof showCustomAlert === 'function') showCustomAlert('A dátum és idő megadása kötelező!', 'info');
        return;
    }
    
    proceedWithShiftStart(dateElement, timeElement, locationElement, weeklyDriveElement, kmElement);
  }

  function proceedWithShiftStart(dateElement, timeElement, locationElement, weeklyDriveElement, kmElement) {
    const shift = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        date: dateElement.value,
        startTime: timeElement.value,
        startLocation: locationElement ? locationElement.value.trim() : '',
        weeklyDriveStartStr: weeklyDriveElement ? weeklyDriveElement.value : '',
        kmStart: kmElement ? parseFloat(kmElement.value) || 0 : 0,
        crossings: []
    };
    
    persistActiveShift(shift);
    
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('Munkanap sikeresen elindítva!', 'success');
    }
    
    // =======================================================
    // ===== EZ A JAVÍTÁS LÉNYEGE ============================
    // =======================================================
    // A felület frissítését egy apró késleltetéssel indítjuk,
    // hogy kikerüljük a külső szkriptekkel való ütközést.
    setTimeout(() => {
        if (typeof renderApp === 'function') {
            renderApp();
        }
    }, 0); 
    
    console.log('[workday] Műszak indult:', shift);
  }

  async function finalizeShift(completedRecord) {
    if (!completedRecord) {
        if (typeof showFinalizationModal === 'function') showFinalizationModal();
        return;
    }

    try {
        if (typeof saveWorkRecord !== 'function') throw new Error('saveWorkRecord function not found!');
        
        await saveWorkRecord(completedRecord);
        clearActiveShiftStorage();
        if (typeof showCustomAlert === 'function') showCustomAlert('Munkanap sikeresen befejezve!', 'success');
        if (typeof renderApp === 'function') renderApp();

    } catch (e) {
      console.error('[workday] finalizeShift error:', e);
      if (typeof showCustomAlert === 'function') showCustomAlert('Hiba történt a mentés során: ' + e.message, 'info');
    }
  }

  function cancelShift(){
    clearActiveShiftStorage();
    if (typeof showCustomAlert === 'function') showCustomAlert('Munkanap elvetve.', 'info');
    renderStartTab();
  }

  function addLiveCrossing() {
    const currentShift = getActiveShiftFromStorage();
    if (!currentShift) return;
    
    const fromEl = document.getElementById('liveCrossFrom');
    const toEl = document.getElementById('liveCrossTo');
    const timeEl = document.getElementById('liveCrossTime');
    
    const from = fromEl.value.trim().toUpperCase();
    const to = toEl.value.trim().toUpperCase();
    const time = timeEl.value;

    if (!from || !to || !time) {
        if (typeof showCustomAlert === 'function') showCustomAlert('Kérlek tölts ki minden mezőt!', 'info');
        return;
    }

    if (!currentShift.crossings) currentShift.crossings = [];
    currentShift.crossings.push({ from, to, time });
    persistActiveShift(currentShift);
    
    fromEl.value = to; // A "Honnan" mező megkapja az előző "Hova" értékét
toEl.value = '';
timeEl.value = '';
fromEl.focus();

    
    renderStartTab();
  }

  (function restoreActiveShiftOnLoad(){
    const persisted = getActiveShiftFromStorage();
    if (persisted) {
      activeShift = persisted;
      window.activeShift = persisted;
    }
  })();

  if (typeof window !== 'undefined') {
    window.startShift = startShift;
    window.finalizeShift = finalizeShift;
    window.cancelShift = cancelShift;
    window.addLiveCrossing = addLiveCrossing;
    window.renderStartTab = renderStartTab;
  }
})();