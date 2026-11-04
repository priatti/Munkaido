// =======================================================
// ===== ÉLŐ MŰSZAK KEZELÉSE (WORKDAY.JS) - JAVÍTOTT ====
// =======================================================
(function () {
  'use strict';
  console.log('[workday.js] loaded build production-offline-shift1');

  const now = () => new Date();
  const pad2 = n => String(n).padStart(2, '0');
  const fmtDateISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
  const fmtTimeHM  = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  
  const ACTIVE_SHIFT_KEY = 'activeShift';
  let activeShift = null;

  // === Prefill állapot nyilvántartás (stale records race condition fix) ===
  // Ha a records snapshot késve érkezik, az új rekordból is frissíthetjük a mezőket,
  // de csak ha a user maga nem módosította őket.
  let _prefillRecordId = null;        // melyik rekord ID-jából töltöttük ki utoljára a start formot
  let _prefillRecordSignature = '';    // id|date|endTime|endLocation|kmEnd|updatedAt – cache→server frissítés detektáláshoz
  let _prefillValues = {};             // az utoljára beállított prefill értékek { km, location, weekly }
  let _crossingFromPrefillVal = '';    // crossing "Honnan" mező utolsó prefill értéke

  function getPrefillSignature(r) {
    if (!r) return '';
    var updatedAtKey = '';
    if (r.updatedAt) {
      if (r.updatedAt && typeof r.updatedAt.seconds === 'number') {
        updatedAtKey = String(r.updatedAt.seconds);
      } else if (r.updatedAt instanceof Date) {
        updatedAtKey = String(r.updatedAt.getTime());
      } else {
        updatedAtKey = String(r.updatedAt);
      }
    }
    return [
      String(r.id || ''),
      String(r.date || ''),
      String(r.endTime || ''),
      String(r.endLocation || ''),
      (typeof r.kmEnd !== 'undefined' && r.kmEnd !== null) ? String(r.kmEnd) : '',
      updatedAtKey
    ].join('|');
  }
  const noop = () => {};
  const safeCapture = (error, extra) => {
    try {
      if (typeof safeCaptureException === 'function') {
        safeCaptureException(error, { module: 'workday', ...extra });
      }
    } catch (_) {}
  };
  const breadcrumb = (message, data = {}) => {
    try {
      if (typeof safeAddBreadcrumb === 'function') {
        safeAddBreadcrumb({ category: 'workday', message, data });
      }
    } catch (_) {}
  };
  const isActiveFormField = (el) => {
    if (!el) return false;
    const tag = String(el.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  };
  const shouldAvoidAutoFocus = () => {
    const active = document.activeElement;
    return !!(active && active !== document.body && isActiveFormField(active));
  };

  async function persistActiveShift(s){
    try {
      if (s && typeof window.ensureDrivingModeOnRecord === 'function') {
        s = window.ensureDrivingModeOnRecord(s);
      }
      window.activeShift = s;
      activeShift = s;
      try { if (typeof window.updateActiveShiftIndicator === 'function') window.updateActiveShiftIndicator(); } catch(_) {}
      breadcrumb('activeShift.persisted', { hasShift: !!s, crossings: Array.isArray(s?.crossings) ? s.crossings.length : 0 });
      var saveFn = typeof window.saveActiveShiftOfflineAware === 'function'
        ? window.saveActiveShiftOfflineAware
        : (typeof saveActiveShift === 'function' ? saveActiveShift : null);
      if (saveFn) {
        var result = await saveFn(s);
        if (result && result.status === 'failed' && typeof window.showSyncFailedAlert === 'function') {
          var i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
          window.showSyncFailedAlert(i18n, { localDataMayExist: true, context: 'shift' });
        }
        return result;
      }
      localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(s));
      return { status: 'savedOnline', shift: s };
    } catch(e) {
      console.error("Failed to persist active shift:", e);
      safeCapture(e, { context: 'persistActiveShift' });
      return { status: 'failed', error: e, shift: s };
    }
  }

  async function clearActiveShiftStorage(){
    try {
      window.activeShift = null;
      activeShift = null;
      try { if (typeof window.updateActiveShiftIndicator === 'function') window.updateActiveShiftIndicator(); } catch(_) {}
      breadcrumb('activeShift.cleared');
      var clearFn = typeof window.clearActiveShiftOfflineAware === 'function'
        ? window.clearActiveShiftOfflineAware
        : (typeof deleteActiveShift === 'function' ? deleteActiveShift : null);
      if (clearFn) {
        return clearFn();
      }
      localStorage.removeItem(ACTIVE_SHIFT_KEY);
      return { status: 'clearedOnline', shift: null };
    } catch(e) {
      console.error("Failed to clear active shift:", e);
      safeCapture(e, { context: 'clearActiveShiftStorage' });
      return { status: 'failed', error: e };
    }
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

      // Skip ha ugyanaz a rekord ÉS ugyanazok az adatok (ID + kulcsmezők signature).
      // Csak ID alapú skip nem elég: cache→server frissítésnél az ID azonos marad,
      // de endLocation / kmEnd / updatedAt változhat – ilyenkor frissíteni kell.
      const sig = getPrefillSignature(lastRecord);
      if (lastRecord.id != null && sig === _prefillRecordSignature) return;

      const weeklyDriveInput = document.getElementById('liveWeeklyDriveStart');
      const kmInput = document.getElementById('liveStartKm');
      const locationInput = document.getElementById('liveStartLocation');

      // Frissítjük a mezőt, ha: üres VAGY még az előző prefill értékét mutatja (a user nem módosította).
      // Ez kezeli azt az esetet is, amikor a records snapshot késve érkezik (stale cache prefill felülírása).
      if (weeklyDriveInput && (!weeklyDriveInput.value || weeklyDriveInput.value === _prefillValues.weekly) && lastRecord.weeklyDriveEndStr) {
        weeklyDriveInput.value = lastRecord.weeklyDriveEndStr;
        _prefillValues.weekly = weeklyDriveInput.value;
      }
      if (kmInput && (!kmInput.value || kmInput.value === _prefillValues.km) && typeof lastRecord.kmEnd !== 'undefined' && lastRecord.kmEnd !== null) {
        kmInput.value = String(lastRecord.kmEnd);
        _prefillValues.km = kmInput.value;
      }
      if (locationInput && (!locationInput.value || locationInput.value === _prefillValues.location) && lastRecord.endLocation) {
        locationInput.value = lastRecord.endLocation;
        _prefillValues.location = locationInput.value;
      }

      _prefillRecordId = lastRecord.id;
      _prefillRecordSignature = sig;
    } catch (e) {
      console.warn('[workday] Error loading last values:', e);
      safeCapture(e, { context: 'loadLastValuesForLiveTab' });
    }
  }

  function renderStartTab() {
    breadcrumb('workday.startShift.invoked');
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
      // Aktív műszak nézetbe lépéskor reseteljük a prefill állapotot,
      // hogy a legközelebbi műszakindítási formnál mindig friss adatot kapjunk.
      _prefillRecordId = null;
      _prefillRecordSignature = '';
      _prefillValues = {};
      _crossingFromPrefillVal = '';
      
      const startTimeElement = document.getElementById('live-start-time');
      if (startTimeElement) {
        const startDateTime = new Date(`${currentShift.date}T${currentShift.startTime}`);
        const locale = (typeof getCurrentLocale === 'function') ? getCurrentLocale() : 'hu-HU';
        startTimeElement.textContent = `${i18n.startedAt || 'Elkezdve'}: ${startDateTime.toLocaleDateString(locale)} ${currentShift.startTime}`;
      }
      
      const summaryContainer = document.getElementById('live-start-summary');
      if (summaryContainer) {
        var vehiclePlateHtml = '';
        var vehiclePlate = (typeof window.EntryVehicleField !== 'undefined' && window.EntryVehicleField.formatVehiclePlateForDisplay)
          ? window.EntryVehicleField.formatVehiclePlateForDisplay(currentShift)
          : (currentShift.vehiclePlateNumber || (currentShift.vehicleSnapshot && currentShift.vehicleSnapshot.plateNumber) || '');
        if (vehiclePlate) {
          var safePlate = String(vehiclePlate)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
          vehiclePlateHtml = '<p><strong>' + (i18n.entryVehicleLabel || 'Jármű') + ':</strong> ' + safePlate + '</p>';
        }
        var segmentsSummaryHtml = (typeof window.VehicleSegments !== 'undefined' && window.VehicleSegments.formatLiveSegmentsSummary)
          ? window.VehicleSegments.formatLiveSegmentsSummary(currentShift)
          : '';
        summaryContainer.innerHTML = `
          <div class="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
            <h3 class="font-semibold text-gray-800 dark:text-gray-100 mb-2">${i18n.liveShiftDetailsTitle || 'Műszak adatai'}</h3>
            <div class="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><strong>${i18n.liveStartLocationLabel || 'Kezdő hely:'}</strong> ${currentShift.startLocation || 'N/A'}</p>
              <p><strong>${i18n.liveStartDriveLabel || 'Kezdő vezetés:'}</strong> ${currentShift.weeklyDriveStartStr || '0:00'}</p>
              <p><strong>${i18n.liveStartKmLabel || 'Kezdő km:'}</strong> ${currentShift.kmStart || 0} km</p>
              ${vehiclePlateHtml}
              ${segmentsSummaryHtml}
            </div>
          </div>
        `;
      }

      var vehicleChangeBtn = document.getElementById('live-vehicle-change-btn');
      if (vehicleChangeBtn) {
        vehicleChangeBtn.classList.remove('hidden');
      }
      
      renderLiveCrossings(currentShift);
      
      // Pótkocsi / Konténer modul (csak ha a modul kapcsoló BE)
      renderLiveTrailerContainer(currentShift);
      
      // JAVÍTÁS: Határátlépés mezők előre kitöltése
      setupLiveCrossingInputs(currentShift);

      var holPb = document.getElementById('liveProgressIsHoliday');
      if (holPb) {
        holPb.checked = currentShift.isHoliday === true;
        if (typeof updateEnhancedToggleVisuals === 'function') {
          updateEnhancedToggleVisuals(holPb);
        }
      }
      
    } else {
      newDayForm.classList.remove('hidden');
      progressView.classList.add('hidden');
      
      // === UX FIX: Mindig aktuális dátum/idő (modal open-kor) ===
      const dateInput = document.getElementById('liveStartDate');
      const timeInput = document.getElementById('liveStartTime');
      
      if (dateInput && !dateInput.value) dateInput.value = getNowLocalDateInputValue();
      if (timeInput && !timeInput.value) timeInput.value = getNowLocalTimeInputValue();
      
      loadLastValuesForLiveTab();

      if (typeof window.EntryVehicleField !== 'undefined' && typeof window.EntryVehicleField.initStartVehicleField === 'function') {
        window.EntryVehicleField.initStartVehicleField({ record: null });
      }

      var holStart = document.getElementById('liveShiftIsHoliday');
      if (holStart) {
        holStart.checked = false;
        if (typeof updateEnhancedToggleVisuals === 'function') {
          updateEnhancedToggleVisuals(holStart);
        }
      }
    }
  }

  function resetStartForm() {
    try {
      // Prefill állapot törlése: az összes mező ürítésekor a következő
      // loadLastValuesForLiveTab hívás mindig friss rekordból tölt ki.
      _prefillRecordId = null;
      _prefillRecordSignature = '';
      _prefillValues = {};
      const dateInput = document.getElementById('liveStartDate');
      const timeInput = document.getElementById('liveStartTime');
      const locationInput = document.getElementById('liveStartLocation');
      const weeklyDriveInput = document.getElementById('liveWeeklyDriveStart');
      const kmInput = document.getElementById('liveStartKm');
      if (locationInput) locationInput.value = '';
      if (weeklyDriveInput) weeklyDriveInput.value = '';
      if (kmInput) kmInput.value = '';
      if (dateInput) dateInput.value = fmtDateISO(now());
      if (timeInput) timeInput.value = fmtTimeHM(now());
      var holReset = document.getElementById('liveShiftIsHoliday');
      if (holReset) {
        holReset.checked = false;
        if (typeof updateEnhancedToggleVisuals === 'function') {
          updateEnhancedToggleVisuals(holReset);
        }
      }
      const form = document.getElementById('start-new-day-form');
      const progress = document.getElementById('live-progress-view');
      if (form) form.classList.remove('hidden');
      if (progress) progress.classList.add('hidden');
      if (typeof window.EntryVehicleField !== 'undefined') {
        if (typeof window.EntryVehicleField.resetSession === 'function') {
          window.EntryVehicleField.resetSession();
        }
        if (typeof window.EntryVehicleField.initStartVehicleField === 'function') {
          window.EntryVehicleField.initStartVehicleField({ record: null });
        }
      }
    } catch(e) {
      console.warn('[workday] resetStartForm error', e);
      safeCapture(e, { context: 'resetStartForm' });
    }
  }

  function getActiveShiftFromStorage() {
    try {
      if (window.currentUser && typeof window.readActiveShiftLocalCacheQuick === 'function') {
        var entry = window.readActiveShiftLocalCacheQuick(window.currentUser.uid);
        if (entry && entry.data && entry.data.date && entry.data.startTime) return entry.data;
      }
      const raw = localStorage.getItem(ACTIVE_SHIFT_KEY);
      const persisted = raw ? JSON.parse(raw) : null;
      if (persisted && persisted.date && persisted.startTime) return persisted;
    } catch(e) {
      console.error("Failed to get active shift from storage:", e);
      safeCapture(e, { context: 'getActiveShiftFromStorage' });
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
    
    let activeCrossingState = null;
    try {
      const activeEl = document.activeElement;
      if (activeEl && container.contains(activeEl) && isActiveFormField(activeEl)) {
        const row = activeEl.closest('div[data-crossing-row-index]');
        const idx = row ? Number(row.getAttribute('data-crossing-row-index')) : -1;
        if (Number.isInteger(idx) && idx >= 0) {
          activeCrossingState = { idx, fieldType: activeEl.type || '', value: activeEl.value || '' };
        }
      }
    } catch (_) {}

    container.innerHTML = `
      <p class="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1">${i18n.recordedCrossings || 'Rögzített átlépések:'}</p>
      <div class="space-y-1">
        ${shift.crossings.map((crossing, index) => `
          <div data-crossing-row-index="${index}" class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs bg-white dark:bg-gray-700 rounded px-2 py-1 border border-indigo-200 dark:border-indigo-700">
            <input type="time" class="w-16 flex-shrink-0 text-xs font-mono bg-transparent border-0 p-0 focus:outline-none focus:ring-0" style="pointer-events:none; touch-action:none;" value="${crossing.time}" data-crossing-index="${index}" onblur="formatTimeInput(this)" onchange="updateLiveCrossingTime(${index}, this.value)">
            <span class="font-semibold">${crossing.from}</span>
            <span class="mx-1">→</span>
            <span class="font-semibold">${crossing.to}</span>
            <input type="number" min="0" max="9999999" step="1" inputmode="numeric" class="w-20 flex-shrink-0 text-xs border border-indigo-200 dark:border-indigo-600 rounded px-1 py-0.5 dark:bg-gray-600" value="${crossing.odometerKm != null ? crossing.odometerKm : ''}" onchange="updateLiveCrossingOdometer(${index}, this.value)" placeholder="${(i18n.crossingOdometerPlaceholder || '').replace(/"/g, '&quot;')}" title="${(i18n.crossingOdometerHint || '').replace(/"/g, '&quot;')}"/>
            <span class="text-[10px] text-gray-500 dark:text-gray-400">${i18n.crossingOdometerUnit || 'km'}</span>
            <button type="button" class="ml-auto text-blue-500 hover:text-blue-700" onclick="editLiveCrossing(${index})">✏️</button>
            <button type="button" class="text-red-500 hover:text-red-700 ml-1" onclick="deleteLiveCrossing(${index})">🗑️</button>
          </div>
        `).join('')}
      </div>
    `;
    
    if (activeCrossingState) {
      try {
        const row = container.querySelector(`div[data-crossing-row-index="${activeCrossingState.idx}"]`);
        if (row) {
          const targetSelector = activeCrossingState.fieldType === 'number' ? 'input[type="number"]' : `input[data-crossing-index="${activeCrossingState.idx}"]`;
          const targetInput = row.querySelector(targetSelector);
          if (targetInput) {
            targetInput.value = activeCrossingState.value;
            targetInput.focus();
          }
        }
      } catch (_) {}
    }
  }
  
  // JAVÍTÁS: Élő határátlépés mezők kezelése
  function setupLiveCrossingInputs(shift) {
    const fromInput = document.getElementById('liveCrossFrom');
    const toInput = document.getElementById('liveCrossTo');
    const timeInput = document.getElementById('liveCrossTime');
    
    if (!fromInput || !toInput || !timeInput) return;
    
    let lastCountryCode = '';
    
    // 1. Prioritás: Az aktuális műszak utolsó átlépésének "Hova" értéke
    if (shift.crossings && shift.crossings.length > 0) {
      const lastCrossing = shift.crossings[shift.crossings.length - 1];
      lastCountryCode = lastCrossing.to || '';
    }
    
    // 2. Prioritás: Ha az aktuális műszakban nincs még átlépés, 
    // akkor az utolsó MENTETT munkanap utolsó határátlépésének "Hova" értéke
    if (!lastCountryCode && typeof window.getLatestRecord === 'function') {
      const lastRecord = window.getLatestRecord();
      if (lastRecord && lastRecord.crossings && lastRecord.crossings.length > 0) {
        const lastRecordCrossing = lastRecord.crossings[lastRecord.crossings.length - 1];
        lastCountryCode = lastRecordCrossing.to || '';
      }
    }
    if (!lastCountryCode && Array.isArray(window.records) && window.records.length > 0) {
      try {
        const sorted = [...window.records]
          .filter(r => ((r && r.entryType) ? String(r.entryType) : 'workday') === 'workday')
          .sort((a, b) => {
            const bDate = `${b.endDate || b.date}T${b.endTime || b.startTime || '00:00'}`;
            const aDate = `${a.endDate || a.date}T${a.endTime || a.startTime || '00:00'}`;
            return new Date(bDate) - new Date(aDate);
          });
        const withCrossings = sorted.find(r => Array.isArray(r.crossings) && r.crossings.length > 0);
        if (withCrossings) {
          const lastRecCross = withCrossings.crossings[withCrossings.crossings.length - 1];
          lastCountryCode = (lastRecCross && lastRecCross.to) ? lastRecCross.to : '';
        }
      } catch(_) {}
    }
    
    // Frissítjük a "Honnan" mezőt, ha: üres VAGY még az általunk beállított prefill értéket mutatja
    // (a user nem módosította). Így a késve érkező friss records is felülírhatja a stale prefillet.
    if (lastCountryCode && (!fromInput.value || fromInput.value === _crossingFromPrefillVal)) {
      fromInput.value = lastCountryCode;
      _crossingFromPrefillVal = lastCountryCode;
    }
    
    // Aktuális idő kitöltése (csak ha üres, hogy ne írjuk felül a user bevitelét)
    if (!timeInput.value) {
      timeInput.value = fmtTimeHM(now());
    }
    
    // Focus: ha van előre kitöltött "Honnan" érték, akkor a "Hova" mezőre
    if (!shouldAvoidAutoFocus()) {
      const effectiveFrom = fromInput.value;
      if (effectiveFrom) {
        if (!toInput.value) { /* hagyjuk üresen a user inputjához */ }
        toInput.focus();
      } else {
        // Csak akkor a "Honnan" mezőre, ha nincs semmi adat
        fromInput.focus();
      }
    }
  }
  
  function startShift() {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
    const currentShift = getActiveShiftFromStorage();
    if (currentShift) {
        console.warn('[workday] Már van aktív műszak:', currentShift);
        if (typeof showCustomAlert === 'function') {
          const msg = i18n.alertActiveShiftExists || 'Már van aktív műszak!';
          showCustomAlert(msg, 'warning');
        }
        return;
    }

    if (typeof window.canStartNewShiftOffline === 'function' && !window.canStartNewShiftOffline()) {
        return;
    }
    
    const dateElement = document.getElementById('liveStartDate');
    const timeElement = document.getElementById('liveStartTime');
    const locationElement = document.getElementById('liveStartLocation');
    const weeklyDriveElement = document.getElementById('liveWeeklyDriveStart');
    const kmElement = document.getElementById('liveStartKm');
    
    if (!dateElement || !timeElement || !dateElement.value || !timeElement.value) {
        if (typeof showCustomAlert === 'function') {
          const msg = i18n.alertDateTimeRequired || 'Date and time are required!';
          showCustomAlert(msg, 'info');
        }
        return;
    }
    
    // ÚJ: Ellenőrizzük, hogy az előző nap óta mennyi idő telt el
    if (typeof getLatestRecord === 'function') {
        const lastRecord = getLatestRecord();
        if (lastRecord && lastRecord.endTime) {
            const lastEnd = new Date(`${lastRecord.date}T${lastRecord.endTime}`);
            const newStart = new Date(`${dateElement.value}T${timeElement.value}`);
            const restHours = (newStart - lastEnd) / (1000 * 60 * 60);
            
            // ÚJ: Ha heti pihenő (≥24h) volt, reseteljük a csökkentett napi pihenő pending jelzőt
            if (restHours >= 24) {
              try {
                localStorage.removeItem('pendingReducedRestUsage');
                if (typeof setPendingReducedRest === 'function') setPendingReducedRest(0);
                console.log('[workday] Weekly rest detected (', restHours, 'h ). Reset pending reduced rest.');
              } catch(_) {}
            }

            // ÚJ: Ha volt pending 13+ órás nap, most válik pirossá
            // (A getTachographStatus() már automatikusan érzékeli a lezárt rekordot)
            
            // Ha 9-11 óra között volt a pihenő ÉS az előző nap NEM volt 13+ órás
            if (restHours >= 9 && restHours < 11 && lastRecord.workMinutes <= 13 * 60) {
                // Itt már a rendszer automatikusan piros lesz, mert ez csökkentett pihenő
                console.log('[workday] Csökkentett pihenő észlelve:', restHours, 'óra');
            }
        }
    }
    
    // V-H átnyúlás felismerése és bontása záráskor történik – indításkor nincs kérdés.
    proceedWithShiftStart(dateElement, timeElement, locationElement, weeklyDriveElement, kmElement, false).catch(function (err) {
      console.error('[workday] proceedWithShiftStart failed:', err && err.message);
      safeCapture(err, { context: 'proceedWithShiftStart' });
    });
  }

  async function proceedWithShiftStart(dateElement, timeElement, locationElement, weeklyDriveElement, kmElement, isOvernightShift) {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};

    let shift = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        date: dateElement.value,
        startTime: timeElement.value,
        startLocation: locationElement ? locationElement.value.trim() : '',
        weeklyDriveStartStr: weeklyDriveElement ? weeklyDriveElement.value : '',
        kmStart: kmElement ? parseFloat(kmElement.value) || 0 : 0,
        crossings: [],
        // Napi mód vasárnap indítás - átnyúló műszak jelző
        isPlannedOvernightShift: isOvernightShift || false,
        // Szabálymotor forrás: rekord szintű mód (globális fourHandsEnabled csak alapértelmezés)
        drivingMode: (typeof window.getDefaultDrivingModeFromSettings === 'function')
          ? window.getDefaultDrivingModeFromSettings()
          : ((typeof localStorage !== 'undefined' && localStorage.getItem('fourHandsEnabled') === 'true') ? 'team' : 'single')
    };
    var holEl = document.getElementById('liveShiftIsHoliday');
    if (holEl && holEl.checked) {
      shift.isHoliday = true;
    }

    if (typeof window.EntryVehicleField !== 'undefined' && typeof window.EntryVehicleField.readSelectionForShiftStart === 'function') {
      shift = window.EntryVehicleField.readSelectionForShiftStart(shift);
    }

    if (typeof window.VehicleSegments !== 'undefined' && typeof window.VehicleSegments.initOnShiftStart === 'function') {
      shift = window.VehicleSegments.initOnShiftStart(shift);
    }
    
    var saveResult = await persistActiveShift(shift);
    if (!saveResult || saveResult.status === 'failed') {
      window.activeShift = null;
      activeShift = null;
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(i18n.saveFailedRetry || i18n.alertSaveErrorPrefix || 'A mentés nem sikerült.', 'warning');
      }
      return;
    }

    if (saveResult.status !== 'savedPendingSync' && saveResult.status !== 'savedOnline') {
      console.warn('[workday] unexpected persistActiveShift status:', saveResult.status);
    }

    if (shift.vehicleId && typeof window.EntryVehicleField !== 'undefined' && typeof window.EntryVehicleField.afterSaveSuccess === 'function') {
      window.EntryVehicleField.afterSaveSuccess(shift).catch(function (_) {});
    }
    
    if (typeof showCustomAlert === 'function') {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        showCustomAlert(i18n.savedOffline || 'Mentve offline módban – online állapotban szinkronizálódik.', 'info');
      } else {
        const msg = i18n.alertShiftStartSuccess || 'Munkanap sikeresen elindítva!';
        showCustomAlert(msg, 'success');
      }
    }
    
    // ÚJ DEBUG
    console.log('[workday] Shift started, calling renderApp');
    
    // Frissítsük az áttekintés oldalt is
    try { window.dispatchEvent(new Event('records:updated')); } catch (_) {}
    
    setTimeout(() => {
        if (typeof renderApp === 'function') {
            renderApp();
        }
    }, 0); 
    
    console.log('[workday] Műszak indult:', shift);
  }

  function resolveActiveShiftForFinalize() {
    if (window.activeShift && window.activeShift.date) {
      return { source: 'window', shift: window.activeShift };
    }
    var uid = window.currentUser && window.currentUser.uid;
    if (uid && typeof window.readActiveShiftLocalCacheQuick === 'function') {
      var entry = window.readActiveShiftLocalCacheQuick(uid);
      if (entry && entry.data && entry.data.date) {
        window.activeShift = entry.data;
        activeShift = entry.data;
        return { source: 'cache', shift: entry.data };
      }
    }
    var stored = getActiveShiftFromStorage();
    if (stored && stored.date) {
      window.activeShift = stored;
      activeShift = stored;
      return { source: 'cache', shift: stored };
    }
    return { source: 'none', shift: null };
  }

  async function finalizeShift(completedRecord) {
    console.log('[workday] finalizeShift start');
    if (completedRecord && typeof window.ensureDrivingModeOnRecord === 'function') {
      completedRecord = window.ensureDrivingModeOnRecord(completedRecord);
    }
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
    if (typeof window.canFinalizeActiveShiftOffline === 'function' && !window.canFinalizeActiveShiftOffline()) {
      return;
    }
    if (!completedRecord) {
        if (typeof showFinalizationModal === 'function') showFinalizationModal();
        return;
    }

    var shiftResolved = resolveActiveShiftForFinalize();
    console.log('[workday] finalizeShift activeShift source:', shiftResolved.source);
    if (shiftResolved.shift) {
      completedRecord = Object.assign({}, shiftResolved.shift, completedRecord);
      if (!completedRecord.id && shiftResolved.shift.id) {
        completedRecord.id = shiftResolved.shift.id;
      }
    }

    try {
        if (typeof saveWorkRecord !== 'function') throw new Error('saveWorkRecord function not found!');
        let realismApproved = true;
        var offlineFinalize = typeof navigator !== 'undefined' && !navigator.onLine;
        if (!offlineFinalize && typeof evaluateRecordRealism === 'function') {
            try {
                const realismIssues = evaluateRecordRealism(completedRecord) || [];
                if (Array.isArray(realismIssues) && realismIssues.length) {
                    if (typeof confirmRealismOverride === 'function') {
                        realismApproved = await confirmRealismOverride(realismIssues, i18n);
                    } else {
                        realismApproved = true; // nincs popup fallback
                    }
                }
            } catch (err) {
                console.warn('[RealismCheck] finalizeShift evaluation failed:', err);
            }
        }
        if (!realismApproved) {
            return;
        }

        var saveResult = await saveWorkRecord(completedRecord);
        console.log('[workday] finalizeShift saveWorkRecord result', saveResult && saveResult.status);

        if (!saveResult || saveResult.status === 'failed') {
          if (typeof window.showSyncFailedAlert === 'function') {
            window.showSyncFailedAlert(i18n, { localDataMayExist: saveResult && saveResult.status === 'failed', context: 'save' });
          }
          return;
        }

        if (typeof window.EntryVehicleField !== 'undefined' && typeof window.EntryVehicleField.afterSaveSuccess === 'function') {
          window.EntryVehicleField.afterSaveSuccess(completedRecord).catch(function (_) {});
        }

        var clearResult = await clearActiveShiftStorage();
        console.log('[workday] finalizeShift activeShift clear pending set', clearResult && clearResult.status);
        if (window.TrailerContainerActive && typeof window.TrailerContainerActive.reconcile === 'function') {
          try { await window.TrailerContainerActive.reconcile({ reason: 'shift-close', openShiftEvents: [] }); } catch (_) {}
        }
        if (clearResult && clearResult.status === 'failed' && typeof window.showSyncFailedAlert === 'function') {
          window.showSyncFailedAlert(i18n, { localDataMayExist: true, context: 'shiftClear' });
        }

        if (saveResult.status === 'savedPendingSync' && typeof window.showWorkdaySaveResultAlert === 'function') {
            window.showWorkdaySaveResultAlert(saveResult, i18n);
        } else if (clearResult && clearResult.status === 'clearedPendingSync') {
            if (typeof showCustomAlert === 'function') {
              showCustomAlert(i18n.savedOffline || 'Mentve offline módban – online állapotban szinkronizálódik.', 'info');
            }
        } else if (completedRecord.isSundayMondayShift && completedRecord.mondayDriveMinutes > 0) {
            console.log('[SundayMonday] Egy bejegyzés mentése teljes vezetési idővel...');
            console.log('[SundayMonday] Vasárnapi rész:', completedRecord.sundayDriveMinutes, 'perc');
            console.log('[SundayMonday] Hétfői rész:', completedRecord.mondayDriveMinutes, 'perc');
            console.log('[SundayMonday] Teljes vezetési idő:', completedRecord.sundayDriveMinutes + completedRecord.mondayDriveMinutes, 'perc');
            
            if (typeof showCustomAlert === 'function') {
                const msg = i18n.alertSundayMondayFinalizeSuccess || 'Vasárnap-hétfő átnyúló műszak sikeresen befejezve!';
                showCustomAlert(msg, 'success');
            }
        } else {
            if (typeof showCustomAlert === 'function') {
                const msg = i18n.alertShiftEndSuccess || 'Munkanap sikeresen befejezve!';
                showCustomAlert(msg, 'success');
            }
        }

        try { if (typeof renderRecords === 'function') renderRecords(); } catch (_) {}
        try { window.dispatchEvent(new Event('records:updated')); } catch (_) {}
        if (typeof renderApp === 'function') renderApp();
        console.log('[workday] finalizeShift done');

    } catch (e) {
      console.error('[workday] finalizeShift error:', e);
      safeCapture(e, { context: 'finalizeShift', hasRecord: !!completedRecord });
      if (typeof window.showSyncFailedAlert === 'function') {
        window.showSyncFailedAlert(i18n, { localDataMayExist: true, context: 'finalize' });
      } else if (typeof showCustomAlert === 'function') {
        const prefix = i18n.alertSaveErrorPrefix || 'Hiba történt a mentés során:';
        showCustomAlert(prefix + ' ' + (e.message || ''), 'info');
      }
    }
  }

  async function cancelShift(){
    breadcrumb('workday.shiftCancelled');
    await clearActiveShiftStorage();
    if (window.TrailerContainerActive && typeof window.TrailerContainerActive.reconcile === 'function') {
      try { await window.TrailerContainerActive.reconcile({ reason: 'shift-cancel', openShiftEvents: [] }); } catch (_) {}
    }
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
    if (typeof showCustomAlert === 'function') {
      const msg = i18n.alertShiftCancelled || 'Munkanap elvetve.';
      showCustomAlert(msg, 'info');
    }
    renderStartTab();
  }

  function editLiveCrossing(index) {
    const container = document.getElementById('live-crossings-list');
    if (!container) return;
    const input = container.querySelector(`input[data-crossing-index="${index}"]`);
    if (!input) return;
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.focus();
      }
    } catch (_) {
      input.focus();
    }
  }

  function addLiveCrossing() {
    const currentShift = getActiveShiftFromStorage();
    if (!currentShift) return;
    
    const fromEl = document.getElementById('liveCrossFrom');
    const toEl = document.getElementById('liveCrossTo');
    const timeEl = document.getElementById('liveCrossTime');
    const odomEl = document.getElementById('liveCrossOdometer');

    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};

    const from = fromEl.value.trim().toUpperCase();
    const to = toEl.value.trim().toUpperCase();
    const time = timeEl.value;

    if (!from || !to || !time) {
        if (typeof showCustomAlert === 'function') {
          const msg = i18n.alertFillAllFields || 'Kérlek tölts ki minden mezőt!';
          showCustomAlert(msg, 'info');
        }
        return;
    }

    const odomRaw = odomEl ? String(odomEl.value || '').trim() : '';
    let odometerKm = null;
    if (odomRaw !== '') {
      const km = typeof parseOdometerKmInput === 'function' ? parseOdometerKmInput(odomRaw) : null;
      if (km == null) {
        if (typeof showCustomAlert === 'function') {
          showCustomAlert(i18n.alertCrossingOdometerInvalid || 'Érvénytelen km óra érték.', 'info');
        }
        return;
      }
      odometerKm = km;
    }

    if (!currentShift.crossings) currentShift.crossings = [];
    const crossingObj = { from, to, time };
    if (odometerKm != null) crossingObj.odometerKm = odometerKm;
    if (window.GurigoCrossingMerge && typeof window.GurigoCrossingMerge.newCrossingId === 'function') {
      crossingObj.crossingId = window.GurigoCrossingMerge.newCrossingId();
    } else {
      crossingObj.crossingId = 'cx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }
    crossingObj.updatedAtMs = Date.now();
    currentShift.crossings.push(crossingObj);
    // Live append is not a full-list replace; clear authoritative so multi-device union works.
    delete currentShift.crossingsAuthoritative;
    persistActiveShift(currentShift);

    if (odomEl) odomEl.value = '';

    // JAVÍTÁS: Az új határátlépés után automatikusan előre tölti a következőt
    fromEl.value = to; // A "Honnan" mező megkapja az előző "Hova" értékét
    toEl.value = '';
    timeEl.value = fmtTimeHM(now()); // Frissíti az időt az aktuálisra
    toEl.focus(); // Focus a "Hova" mezőre
    
    renderStartTab();
  }

  function updateLiveCrossingTime(index, newTime) {
    const currentShift = getActiveShiftFromStorage();
    if (!currentShift || !Array.isArray(currentShift.crossings) || !currentShift.crossings[index]) return;
    if (window.GurigoCrossingMerge && typeof window.GurigoCrossingMerge.ensureCrossingId === 'function') {
      currentShift.crossings[index] = window.GurigoCrossingMerge.ensureCrossingId(currentShift.crossings[index]);
    }
    currentShift.crossings[index].time = newTime;
    currentShift.crossings[index].updatedAtMs = Date.now();
    // Field edit keeps id; mark authoritative so peers don't resurrect old content via fingerprint union.
    currentShift.crossingsAuthoritative = true;
    persistActiveShift(currentShift);
    renderStartTab();
  }

  function updateLiveCrossingOdometer(index, value) {
    const currentShift = getActiveShiftFromStorage();
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
    if (!currentShift || !Array.isArray(currentShift.crossings) || !currentShift.crossings[index]) return;
    if (window.GurigoCrossingMerge && typeof window.GurigoCrossingMerge.ensureCrossingId === 'function') {
      currentShift.crossings[index] = window.GurigoCrossingMerge.ensureCrossingId(currentShift.crossings[index]);
    }
    const raw = value != null ? String(value).trim() : '';
    if (raw === '') {
      delete currentShift.crossings[index].odometerKm;
      currentShift.crossings[index].updatedAtMs = Date.now();
      currentShift.crossingsAuthoritative = true;
      persistActiveShift(currentShift);
      renderStartTab();
      return;
    }
    const km = typeof parseOdometerKmInput === 'function' ? parseOdometerKmInput(raw) : null;
    if (km == null) {
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(i18n.alertCrossingOdometerInvalid || 'Érvénytelen km óra érték.', 'info');
      }
      renderStartTab();
      return;
    }
    currentShift.crossings[index].odometerKm = km;
    currentShift.crossings[index].updatedAtMs = Date.now();
    currentShift.crossingsAuthoritative = true;
    persistActiveShift(currentShift);
    renderStartTab();
  }

  function deleteLiveCrossing(index) {
    const currentShift = getActiveShiftFromStorage();
    if (!currentShift || !Array.isArray(currentShift.crossings) || !currentShift.crossings[index]) return;
    var removed = currentShift.crossings[index];
    if (window.GurigoCrossingMerge && typeof window.GurigoCrossingMerge.ensureCrossingId === 'function') {
      removed = window.GurigoCrossingMerge.ensureCrossingId(removed);
    }
    if (removed && removed.crossingId) {
      if (!Array.isArray(currentShift.crossingTombstones)) currentShift.crossingTombstones = [];
      var tomb = (window.GurigoCrossingMerge && typeof window.GurigoCrossingMerge.makeTombstone === 'function')
        ? window.GurigoCrossingMerge.makeTombstone(removed.crossingId)
        : { crossingId: String(removed.crossingId), deletedAtMs: Date.now() };
      currentShift.crossingTombstones.push(tomb);
    }
    currentShift.crossings.splice(index, 1);
    currentShift.crossingsAuthoritative = true;
    persistActiveShift(currentShift);
    renderStartTab();
  }

  // ===== Pótkocsi / Konténer nyilvántartás (live shift event log) =====
  function trailerContainerModuleOn() {
    try {
      if (typeof window.isTrailerContainerModuleEnabled === 'function') {
        return window.isTrailerContainerModuleEnabled();
      }
      return localStorage.getItem('toggleTrailerContainer') === 'true';
    } catch (_) {
      return false;
    }
  }

  function tcLib() {
    return (typeof window !== 'undefined' && window.TrailerContainerLog) ? window.TrailerContainerLog : null;
  }

  function renderLiveTrailerContainer(shift) {
    const section = document.getElementById('trailer-container-section');
    if (!section) return;
    const on = trailerContainerModuleOn();
    section.style.display = on ? '' : 'none';
    if (!on) return;

    const lib = tcLib();
    const container = document.getElementById('trailer-container-active-list');
    if (!container || !lib) return;
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
    const events = lib.normalizeEvents(shift && shift.trailerContainerEvents);
    const carried = (typeof window.TrailerContainerActive !== 'undefined' && typeof window.TrailerContainerActive.getItems === 'function')
      ? window.TrailerContainerActive.getItems()
      : [];
    const active = (typeof lib.overlayActiveItems === 'function')
      ? lib.overlayActiveItems(carried, events)
      : lib.getActiveItems(events);
    container.innerHTML = (typeof lib.renderActiveCardsHtml === 'function')
      ? lib.renderActiveCardsHtml(active, i18n)
      : '';
    const historyEl = document.getElementById('trailer-container-history');
    if (historyEl && typeof lib.renderHistoryHtml === 'function') {
      historyEl.innerHTML = lib.renderHistoryHtml(events, i18n);
    }
    if (window.TrailerContainerActive && typeof window.TrailerContainerActive.isLoaded === 'function' && !window.TrailerContainerActive.isLoaded()) {
      window.TrailerContainerActive.load().then(function () {
        renderLiveTrailerContainer(getActiveShiftFromStorage());
      }).catch(function () {});
      if (typeof window.TrailerContainerActive.subscribe === 'function') window.TrailerContainerActive.subscribe();
    }
  }

  function escapeHtmlTC(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function addTrailerContainerEvent() {
    const lib = tcLib();
    if (!lib) return;
    const currentShift = getActiveShiftFromStorage();
    if (!currentShift) return;
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};

    const typeEl = document.getElementById('trailerContainerType');
    const actionEl = document.getElementById('trailerContainerAction');
    const idEl = document.getElementById('trailerContainerIdentifier');
    const timeEl = document.getElementById('trailerContainerTime');
    const kmEl = document.getElementById('trailerContainerOdometer');
    const locEl = document.getElementById('trailerContainerLocation');
    const noteEl = document.getElementById('trailerContainerNote');

    const result = lib.createEvent({
      type: typeEl ? typeEl.value : '',
      action: actionEl ? actionEl.value : '',
      identifier: idEl ? idEl.value : '',
      time: timeEl ? timeEl.value : '',
      odometerKm: kmEl ? kmEl.value : '',
      location: locEl ? locEl.value : '',
      note: noteEl ? noteEl.value : ''
    });

    if (!result.ok) {
      if (typeof showCustomAlert === 'function') {
        let msg = '';
        if (result.error === 'identifierRequired') msg = i18n.trailerContainerIdentifierRequired || '';
        else if (result.error === 'odometerInvalid') msg = i18n.trailerContainerOdometerInvalid || '';
        else msg = i18n.trailerContainerIdentifierRequired || '';
        showCustomAlert(msg, 'info');
      }
      return;
    }

    // Guardrails: warn on duplicate pickup / drop of inactive. Never wipe history.
    if (typeof lib.validateTransition === 'function' && window.TrailerContainerActive) {
      var carriedNow = (typeof window.TrailerContainerActive.getItems === 'function') ? window.TrailerContainerActive.getItems() : [];
      var overlayNow = (typeof lib.overlayActiveItems === 'function')
        ? lib.overlayActiveItems(carriedNow, lib.normalizeEvents(currentShift.trailerContainerEvents))
        : carriedNow;
      var transition = lib.validateTransition(overlayNow, result.event);
      if (transition && transition.warning === 'alreadyActive' && typeof showCustomAlert === 'function') {
        showCustomAlert(i18n.trailerContainerAlreadyActive || '', 'info');
      }
      if (transition && transition.warning === 'dropInactive' && typeof showCustomAlert === 'function') {
        showCustomAlert(i18n.trailerContainerDropInactive || '', 'warning');
      }
    }

    currentShift.trailerContainerEvents = lib.appendEvent(currentShift.trailerContainerEvents, result.event);
    var persistPromise = persistActiveShift(currentShift);
    if (persistPromise && typeof persistPromise.then === 'function') {
      persistPromise.then(function (saveResult) {
        if (saveResult && saveResult.status === 'failed' && typeof window.showSyncFailedAlert === 'function') {
          window.showSyncFailedAlert(i18n, { localDataMayExist: true, context: 'shift' });
        }
      }).catch(function () {});
    }
    if (window.TrailerContainerActive && typeof window.TrailerContainerActive.commitEvent === 'function') {
      var tcSource = {
        recordId: currentShift.id != null ? String(currentShift.id) : null,
        date: currentShift.date || null,
        eventIndex: currentShift.trailerContainerEvents.length - 1,
        persisted: false
      };
      var tcCommit = window.TrailerContainerActive.commitEvent(result.event, tcSource);
      if (tcCommit && typeof tcCommit.then === 'function') {
        tcCommit.then(function (tcResult) {
          if (tcResult && tcResult.status === 'failed' && typeof window.showSyncFailedAlert === 'function') {
            window.showSyncFailedAlert(i18n, { localDataMayExist: true, context: 'save' });
          }
        }).catch(function () {});
      }
    }

    if (idEl) idEl.value = '';
    if (kmEl) kmEl.value = '';
    if (locEl) locEl.value = '';
    if (noteEl) noteEl.value = '';
    if (timeEl && typeof fmtTimeHM === 'function' && typeof now === 'function') timeEl.value = fmtTimeHM(now());

    renderStartTab();
  }

  function suggestTrailerContainerTime(timeEl) {
    if (timeEl && typeof fmtTimeHM === 'function' && typeof now === 'function') {
      timeEl.value = fmtTimeHM(now());
    }
  }

  /**
   * Active-card drop prepares the shared form. It does not append an event.
   * Type and identifier come from the active item, time gets the current
   * suggestion, and km / location / note stay empty until the user saves.
   */
  function prepareTrailerContainerDrop(type, encodedIdentifier) {
    let identifier = encodedIdentifier;
    try { identifier = decodeURIComponent(encodedIdentifier); } catch (_) {}
    const typeEl = document.getElementById('trailerContainerType');
    const actionEl = document.getElementById('trailerContainerAction');
    const idEl = document.getElementById('trailerContainerIdentifier');
    const timeEl = document.getElementById('trailerContainerTime');
    const kmEl = document.getElementById('trailerContainerOdometer');
    const locEl = document.getElementById('trailerContainerLocation');
    const noteEl = document.getElementById('trailerContainerNote');
    const form = document.getElementById('trailer-container-form');
    if (typeEl) typeEl.value = type === 'container' ? 'container' : 'trailer';
    if (actionEl) actionEl.value = 'drop';
    if (idEl) idEl.value = identifier || '';
    suggestTrailerContainerTime(timeEl);
    if (kmEl) kmEl.value = '';
    if (locEl) locEl.value = '';
    if (noteEl) noteEl.value = '';
    if (form && typeof form.scrollIntoView === 'function') {
      try { form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {}
    }
    if (idEl && typeof idEl.focus === 'function') {
      try { idEl.focus({ preventScroll: true }); } catch (_) { try { idEl.focus(); } catch (__) {} }
    }
  }

  function quickDropTrailerContainer(type, encodedIdentifier) {
    prepareTrailerContainerDrop(type, encodedIdentifier);
  }

  function syncLiveProgressHolidayFromDom() {
    var cb = document.getElementById('liveProgressIsHoliday');
    if (!cb) return;
    var s = window.activeShift || getActiveShiftFromStorage();
    if (!s) return;
    if (cb.checked) {
      s.isHoliday = true;
    } else {
      delete s.isHoliday;
    }
    persistActiveShift(s);
    if (typeof updateEnhancedToggleVisuals === 'function') {
      updateEnhancedToggleVisuals(cb);
    }
  }

  (function restoreActiveShiftOnLoad(){
    try {
      var persisted = null;
      var raw = localStorage.getItem(ACTIVE_SHIFT_KEY);
      if (raw) {
        var legacy = JSON.parse(raw);
        if (legacy && legacy.date && legacy.startTime) persisted = legacy;
      }
      if (!persisted) {
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (!key || key.indexOf('gurigo_active_shift_cache_v1:') !== 0) continue;
          var entry = JSON.parse(localStorage.getItem(key));
          if (entry && entry.data && entry.data.date && entry.data.startTime) {
            persisted = entry.data;
            break;
          }
        }
      }
      if (persisted) {
        activeShift = persisted;
        window.activeShift = persisted;
        try { if (typeof window.updateActiveShiftIndicator === 'function') window.updateActiveShiftIndicator(); } catch(_) {}
      }
    } catch (e) {
      console.warn('[workday] restoreActiveShiftOnLoad failed:', e && e.message);
    }
  })();

  if (typeof window !== 'undefined') {
    window.startShift = startShift;
    window.finalizeShift = finalizeShift;
    window.cancelShift = cancelShift;
    window.addLiveCrossing = addLiveCrossing;
    window.editLiveCrossing = editLiveCrossing;
    window.updateLiveCrossingTime = updateLiveCrossingTime;
    window.updateLiveCrossingOdometer = updateLiveCrossingOdometer;
    window.deleteLiveCrossing = deleteLiveCrossing;
    window.renderStartTab = renderStartTab;
    window.resetStartForm = resetStartForm;
    window.setupLiveCrossingInputs = setupLiveCrossingInputs;
    window.getActiveShiftFromStorage = getActiveShiftFromStorage;
    window.syncLiveProgressHolidayFromDom = syncLiveProgressHolidayFromDom;
    window.addTrailerContainerEvent = addTrailerContainerEvent;
    window.prepareTrailerContainerDrop = prepareTrailerContainerDrop;
    window.quickDropTrailerContainer = quickDropTrailerContainer;
    window.renderLiveTrailerContainer = renderLiveTrailerContainer;
  }
})();