// =======================================================
// ===== VASÁRNAP-HÉTFŐ ÁTNYÚLÓ MŰSZAK HELPER ===========
// =======================================================
// Célja: Vasárnap-hétfő átnyúló műszakok vezetési idő
// számításának kezelése (heti, kétheti, napi módban)
// =======================================================

(function() {
  'use strict';

  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang]) ? translations[currentLang] : {};

  /**
   * Ellenőrzi, hogy egy műszak vasárnap-hétfő átnyúló-e
   * @param {string} startDate - Indítás dátuma (YYYY-MM-DD)
   * @param {string} endDate - Zárás dátuma (YYYY-MM-DD)
   * @returns {boolean} - true, ha vasárnap indul és hétfőn zárul
   */
  function isSundayMondayShift(startDate, endDate) {
    if (!startDate || !endDate) return false;
    
    // Ha elérhető a preferált időzóna kezelése, használjuk azt
    const createInTz = (typeof createDateInPreferredTimezone === 'function')
      ? createDateInPreferredTimezone
      : (dateStr) => new Date(dateStr + 'T00:00:00');

    const start = createInTz(startDate, '00:00');
    const end = createInTz(endDate, '00:00');
    
    // Vasárnap = 0, Hétfő = 1
    const startDay = start.getDay();
    const endDay = end.getDay();
    
    // Vasárnap indul ÉS hétfőn zárul
    return startDay === 0 && endDay === 1;
  }

  /**
   * Kiszámolja az előző hét (A hét) összes vezetési idejét
   * @param {string} sundayDate - Vasárnap dátuma (YYYY-MM-DD)
   * @param {Array} allRecords - Összes munkanap rekord
   * @returns {number} - A hét összes vezetési ideje percben
   */
  function getPreviousWeekDriveMinutes(sundayDate, allRecords) {
    if (!sundayDate || !Array.isArray(allRecords)) return 0;
    
    const createInTz = (typeof createDateInPreferredTimezone === 'function')
      ? createDateInPreferredTimezone
      : (dateStr) => new Date(dateStr + 'T00:00:00');

    const sunday = createInTz(sundayDate, '00:00');
    
    // A hét hétfője (6 nappal korábban)
    const weekStart = new Date(sunday);
    weekStart.setDate(weekStart.getDate() - 6);
    
    // A hét szombatja (1 nappal korábban)
    const weekEnd = new Date(sunday);
    weekEnd.setDate(weekEnd.getDate() - 1);
    
    const weekStartStr = toISODate(weekStart);
    const weekEndStr = toISODate(weekEnd);
    
    // Szűrjük ki az A hét rekordjait és összegezzük a vezetési időt
    let totalDriveMinutes = 0;
    allRecords.forEach(record => {
      if (record.date >= weekStartStr && record.date <= weekEndStr) {
        totalDriveMinutes += (record.driveMinutes || 0);
      }
    });
    
    return totalDriveMinutes;
  }

  /**
   * Dátum formázás ISO formátumra (YYYY-MM-DD)
   */
  function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Időformátum konvertálása percekre (óó:pp)
   */
  function parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    const hours = parseInt(parts[0], 10) || 0;
    const minutes = parseInt(parts[1], 10) || 0;
    return hours * 60 + minutes;
  }

  /**
   * Percek konvertálása időformátumra (óó:pp)
   */
  function formatMinutesToTime(minutes) {
    if (!minutes || minutes < 0) return '0:00';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Popup megjelenítése a teljes műszak vezetési idejének bekéréséhez
   * @param {Function} callback - Callback függvény, ami megkapja a beírt időt (percekben)
   */
  function showTotalDriveTimePopup(callback) {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') 
      ? translations[currentLang] 
      : {};
    
    const timePlaceholder = i18n.timePlaceholder || (typeof getTimePlaceholderValue === 'function' ? getTimePlaceholderValue() : 'hh:mm');
    const timePlaceholderExample = i18n.timePlaceholderExample || (typeof getTimePlaceholderExampleValue === 'function' ? getTimePlaceholderExampleValue() : 'hh:mm (e.g. 02:30)');

    const modalHTML = `
      <div id="total-drive-time-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto transform transition-transform duration-300 scale-95">
          
          <div class="modal-header">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                <svg class="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">${i18n.sundayMondayTotalTitle || '🚗 Műszak teljes vezetési ideje'}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">${i18n.sundayMondayTotalSubtitle || 'Vasárnap-hétfő átnyúló műszak'}</p>
              </div>
            </div>
          </div>

          <div class="space-y-4 modal-body">
            <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p class="text-sm text-yellow-800 dark:text-yellow-200">
                ${i18n.sundayMondayTotalWarning || '⚠️ Fontos: Add meg a teljes műszak alatt vezetett időt (vasárnap + hétfő együtt).'}
              </p>
            </div>
            
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">${i18n.sundayMondayTotalLabel || '⏱️ Teljes vezetési idő'}</label>
              <input type="text" id="totalDriveTimeInput" class="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="${timePlaceholder}" onblur="formatTimeInput(this, true)" required>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">${i18n.sundayMondayTotalExample || 'Példa: 9:00 (9 óra)'}</p>
            </div>
          </div>
          
          <div class="modal-footer">
            <div class="flex gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onclick="closeTotalDriveTimeModal()" class="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200">${i18n.cancel || 'Mégse'}</button>
              <button type="button" onclick="confirmTotalDriveTime()" class="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-800 transition-all duration-200">✅ ${i18n.ok || 'OK'}</button>
            </div>
          </div>

        </div>
      </div>
    `;
    
    // Távolítsuk el a korábbi modalt, ha létezik
    const existingModal = document.getElementById('total-drive-time-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Adjuk hozzá az új modalt
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Animáció
    setTimeout(() => {
      const modal = document.getElementById('total-drive-time-modal');
      if (modal) {
        modal.style.opacity = '1';
        const card = modal.querySelector('.transform');
        if (card) card.style.transform = 'scale(1)';
      }
    }, 10);
    
    // Callback tárolása
    window._totalDriveTimeCallback = callback;
    
    // Focus az input mezőre
    setTimeout(() => {
      const input = document.getElementById('totalDriveTimeInput');
      if (input) input.focus();
    }, 100);
  }

  /**
   * Modal bezárása
   */
  function closeTotalDriveTimeModal() {
    const modal = document.getElementById('total-drive-time-modal');
    if (modal) {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 300);
    }
    window._totalDriveTimeCallback = null;
  }

  /**
   * Megerősítés és callback hívása
   */
  function confirmTotalDriveTime() {
    const input = document.getElementById('totalDriveTimeInput');
    if (!input || !input.value) {
      if (typeof showCustomAlert === 'function') {
        const msg = i18n.sundayMondayEnterDriveTime || 'Kérlek add meg a vezetési időt!';
        showCustomAlert(msg, 'info');
      }
      return;
    }
    
    const totalMinutes = parseTimeToMinutes(input.value);
    if (totalMinutes <= 0) {
      if (typeof showCustomAlert === 'function') {
        const msg = i18n.sundayMondayInvalidDriveTime || 'Érvénytelen vezetési idő!';
        showCustomAlert(msg, 'info');
      }
      return;
    }
    
    // Callback hívása
    if (typeof window._totalDriveTimeCallback === 'function') {
      window._totalDriveTimeCallback(totalMinutes);
    }
    
    closeTotalDriveTimeModal();
  }

  /**
   * V-H (vasárnaphétfő) figyelmeztetés napi / kétheti módban.
   * Lehetőség: alapértelmezett (minden hétfőre) vagy kézi bontásra váltás.
   * @param {number} totalMinutes - Teljes műszak vezetési ideje percekben
   * @param {Function} callback - (result) => { mode: 'auto' | 'manual', sundayMinutes?, mondayMinutes? }
   */
  function showSundayMondayVHWarningModal(totalMinutes, callback) {
    const totalStr = (typeof formatMinutesToTime === 'function')
      ? formatMinutesToTime(totalMinutes)
      : totalMinutes + ' perc';

    const modalHTML = `
      <div id="vh-warning-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto transform transition-transform duration-300 scale-95">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
              <span class="text-2xl">⚠️</span>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">${i18n.sundayMondayWarningTitle || 'Vasárnap–hétfő átnyúló műszak'}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">${(i18n.sundayMondayManualSummaryPrefix || 'Teljes vezetési idő: ')}<strong>${totalStr}</strong></p>
            </div>
          </div>

          <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>${i18n.sundayMondayWarningP1 || 'Ez a műszak vasárnapról hétfőre nyúlik át.'}</p>
            <p>${i18n.sundayMondayWarningP2 || 'Napi és kétheti vezetési idő módban a tachográf adataiból <strong>nem lehet automatikusan pontosan</strong> megmondani, mennyi vezetés esett vasárnapra és mennyi hétfőre.'}</p>
            <p>${i18n.sundayMondayWarningP3 || 'Alapértelmezésben a <strong>teljes vezetési idő</strong> a hétfői naphoz számolódik. Ha pontosan tudod, mennyi volt a vasárnapi rész, megadhatod kézzel – ekkor a rendszer <strong>ezzel a kézi bontással</strong> fog számolni.'}</p>
          </div>

          <div class="flex gap-3 mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" id="vh-warning-auto" class="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">${i18n.sundayMondayWarningAutoButton || 'Számold hétfőre az egészet'}</button>
            <button type="button" id="vh-warning-manual" class="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-800 transition-all">${i18n.sundayMondayWarningManualButton || 'Kézi pontosítás'}</button>
          </div>
        </div>
      </div>
    `;

    const existing = document.getElementById('vh-warning-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('vh-warning-modal');
    if (!modal) {
      if (typeof callback === 'function') callback({ mode: 'auto' });
      return;
    }

    const close = (result) => {
      modal.style.opacity = '0';
      setTimeout(() => { try { modal.remove(); } catch(_) {} }, 250);
      if (typeof callback === 'function') callback(result || { mode: 'auto' });
    };

    const btnAuto = document.getElementById('vh-warning-auto');
    const btnManual = document.getElementById('vh-warning-manual');

    if (btnAuto) btnAuto.addEventListener('click', () => close({ mode: 'auto' }));
    if (btnManual) btnManual.addEventListener('click', () => {
      modal.style.opacity = '0';
      setTimeout(() => { try { modal.remove(); } catch(_) {} }, 250);
      showSundayMondayVHManualSplitModal(totalMinutes, callback);
    });
  }

  /**
   * Második V-H modal: kézi vasárnap/hétfő bontás megadása.
   * @param {number} totalMinutes
   * @param {Function} callback - ugyanaz a callback, mint az előző modalban
   */
  function showSundayMondayVHManualSplitModal(totalMinutes, callback) {
    const totalStr = (typeof formatMinutesToTime === 'function')
      ? formatMinutesToTime(totalMinutes)
      : totalMinutes + ' perc';

    const modalHTML = `
      <div id="vh-manual-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto transform transition-transform duration-300 scale-95">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
              <span class="text-2xl">🧮</span>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">${i18n.sundayMondayManualTitle || 'V-H műszak kézi bontása'}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">${(i18n.sundayMondayManualSummaryPrefix || 'Teljes vezetési idő: ')}<strong>${totalStr}</strong></p>
            </div>
          </div>

          <div class="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <p>${i18n.sundayMondayManualText || 'Add meg, hogy a vasárnapról hétfőre átnyúló műszakból <strong>mennyi vezetési idő jusson vasárnapra</strong>. A fennmaradó rész automatikusan hétfőre kerül.'}</p>
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">${i18n.sundayMondaySundayLabel || '⏱️ Vasárnapi vezetési idő'}</label>
              <input type="text" id="vh-sunday-input" class="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="${timePlaceholderExample}" onblur="formatTimeInput(this, true)">
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">${(i18n.sundayMondayMaxHintPrefix || 'A megadott idő nem lehet nagyobb, mint a teljes műszak: ')}${totalStr}.</p>
            </div>
          </div>

          <div class="flex gap-3 mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" id="vh-manual-cancel" class="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">${i18n.sundayMondayManualCancelButton || 'Mégse (minden hétfőre)'}</button>
            <button type="button" id="vh-manual-ok" class="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-800 transition-all">${i18n.sundayMondayManualSaveButton || 'Mentés'}</button>
          </div>
        </div>
      </div>
    `;

    const existing = document.getElementById('vh-manual-modal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('vh-manual-modal');
    if (!modal) {
      if (typeof callback === 'function') callback({ mode: 'auto' });
      return;
    }

    const close = (result) => {
      modal.style.opacity = '0';
      setTimeout(() => { try { modal.remove(); } catch(_) {} }, 250);
      if (typeof callback === 'function') callback(result || { mode: 'auto' });
    };

    const input = document.getElementById('vh-sunday-input');
    const btnCancel = document.getElementById('vh-manual-cancel');
    const btnOk = document.getElementById('vh-manual-ok');

    if (btnCancel) btnCancel.addEventListener('click', () => close({ mode: 'auto' }));
    if (btnOk) btnOk.addEventListener('click', () => {
      if (!input) { close({ mode: 'auto' }); return; }
      const val = (input.value || '').trim();
      const sundayMinutes = (typeof parseTimeToMinutes === 'function') ? parseTimeToMinutes(val) : 0;
      if (!val || sundayMinutes < 0 || sundayMinutes > totalMinutes) {
        if (typeof showCustomAlert === 'function') {
          const msg = i18n.sundayMondaySundayTooBig || 'A vasárnapi vezetési idő nem lehet nagyobb a teljes műszak vezetési idejénél.';
          showCustomAlert(msg, 'info');
        }
        return;
      }
      const mondayMinutes = totalMinutes - sundayMinutes;
      close({ mode: 'manual', sundayMinutes, mondayMinutes });
    });

    setTimeout(() => {
      if (input) input.focus();
    }, 100);
  }

  /**
   * Záráskori V-H bontás modal (új, kötelező).
   * 1. lépés: Kamion kijelzőjén látható heti vezetési idő bekérése.
   *   → mondayDriveMinutes = vehicleWeekly, sundayDriveMinutes = daily – vehicleWeekly
   * 2. lépés (ha „Nem tudom"): Hétfő 00:00 utáni kézi megadás.
   *   → mondayDriveMinutes = manualMonday, sundayDriveMinutes = daily – manualMonday
   * @param {number} dailyDriveMinutes - A műszak teljes napi vezetési ideje percben
   * @param {Function} callback - ({ mondayDriveMinutes, sundayDriveMinutes, source })
   *   source: 'vehicle_weekly_display' | 'manual_monday_after_midnight'
   */
  function showSundayMondayCloseModal(dailyDriveMinutes, callback) {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
      ? (translations[currentLang] || {})
      : {};

    const totalStr = typeof formatMinutesToTime === 'function'
      ? formatMinutesToTime(dailyDriveMinutes)
      : (Math.floor(dailyDriveMinutes / 60) + ':' + String(dailyDriveMinutes % 60).padStart(2, '0'));

    const timePlaceholder = i18n.timePlaceholder
      || (typeof getTimePlaceholderValue === 'function' ? getTimePlaceholderValue() : 'hh:mm');

    function validateMonday(mondayMins) {
      return Number.isFinite(mondayMins) && mondayMins >= 0 && mondayMins <= dailyDriveMinutes;
    }

    function showStep1() {
      const existing = document.getElementById('vh-close-modal-step1');
      if (existing) existing.remove();

      const html = `
        <div id="vh-close-modal-step1" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                <svg class="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">${i18n.vhCloseModalTitle || 'Vasárnap–hétfő átnyúló műszak'}</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">${i18n.vhCloseManualSummaryPrefix || 'Napi vezetési idő: '}<strong>${totalStr}</strong></p>
              </div>
            </div>
            <div class="space-y-4">
              <p class="text-sm text-gray-700 dark:text-gray-300">${i18n.vhCloseModalInfo || 'A pontos heti és kétheti vezetési idő számításhoz add meg a kamion kijelzőjén látható heti vezetési időt.'}</p>
              <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">${i18n.vhCloseVehicleLabel || '🚛 Heti vezetési idő a kamion kijelzőjén'}</label>
                <input type="text" id="vh-close-vehicle-input" class="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="${timePlaceholder}" onblur="formatTimeInput(this, true)">
              </div>
            </div>
            <div class="flex flex-col gap-3 mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button type="button" id="vh-close-ok" class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-800 transition-all">${i18n.vhCloseOk || 'Rendben'}</button>
              <button type="button" id="vh-close-dontknow" class="w-full py-3 px-4 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors text-sm">${i18n.vhCloseDontKnow || 'Nem tudom / a kamion nem jelzi'}</button>
            </div>
          </div>
        </div>`;

      document.body.insertAdjacentHTML('beforeend', html);
      const modal = document.getElementById('vh-close-modal-step1');
      const btnOk = document.getElementById('vh-close-ok');
      const btnDontKnow = document.getElementById('vh-close-dontknow');

      if (btnOk) btnOk.addEventListener('click', () => {
        const input = document.getElementById('vh-close-vehicle-input');
        const val = input ? (input.value || '').trim() : '';
        if (!val) {
          if (typeof showCustomAlert === 'function') showCustomAlert(i18n.vhCloseValidationError || 'A hétfőre eső vezetési idő nem lehet több, mint a napi vezetési idő. Ellenőrizd a megadott értékeket.', 'info');
          return;
        }
        const mondayMins = typeof parseTimeToMinutes === 'function' ? parseTimeToMinutes(val) : 0;
        if (!validateMonday(mondayMins)) {
          if (typeof showCustomAlert === 'function') showCustomAlert(i18n.vhCloseValidationError || 'A hétfőre eső vezetési idő nem lehet több, mint a napi vezetési idő. Ellenőrizd a megadott értékeket.', 'info');
          return;
        }
        try { modal.remove(); } catch (_) {}
        if (typeof callback === 'function') callback({ mondayDriveMinutes: mondayMins, sundayDriveMinutes: dailyDriveMinutes - mondayMins, source: 'vehicle_weekly_display' });
      });

      if (btnDontKnow) btnDontKnow.addEventListener('click', () => {
        try { modal.remove(); } catch (_) {}
        showStep2();
      });

      setTimeout(() => { const input = document.getElementById('vh-close-vehicle-input'); if (input) input.focus(); }, 100);
    }

    function showStep2() {
      const existing = document.getElementById('vh-close-modal-step2');
      if (existing) existing.remove();

      const html = `
        <div id="vh-close-modal-step2" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0">
                <svg class="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">${i18n.vhCloseStep2Title || 'Semmi gond.'}</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">${i18n.vhCloseManualSummaryPrefix || 'Napi vezetési idő: '}<strong>${totalStr}</strong></p>
              </div>
            </div>
            <div class="space-y-4">
              <p class="text-sm text-gray-700 dark:text-gray-300">${i18n.vhCloseStep2Info || 'Add meg, mennyit vezettél hétfő 00:00 után.'}</p>
              <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">${i18n.vhCloseMondayLabel || '⏱️ Hétfőre eső vezetési idő'}</label>
                <input type="text" id="vh-close-monday-input" class="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="${timePlaceholder}" onblur="formatTimeInput(this, true)">
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">${i18n.sundayMondayMaxHintPrefix || 'A megadott idő nem lehet nagyobb, mint a teljes műszak: '}${totalStr}</p>
              </div>
            </div>
            <div class="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button type="button" id="vh-close-step2-ok" class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-800 transition-all">${i18n.vhCloseStep2Ok || 'Rendben'}</button>
            </div>
          </div>
        </div>`;

      document.body.insertAdjacentHTML('beforeend', html);
      const modal = document.getElementById('vh-close-modal-step2');
      const btnOk = document.getElementById('vh-close-step2-ok');

      if (btnOk) btnOk.addEventListener('click', () => {
        const input = document.getElementById('vh-close-monday-input');
        const val = input ? (input.value || '').trim() : '';
        if (!val) {
          if (typeof showCustomAlert === 'function') showCustomAlert(i18n.vhCloseValidationError || 'A hétfőre eső vezetési idő nem lehet több, mint a napi vezetési idő. Ellenőrizd a megadott értékeket.', 'info');
          return;
        }
        const mondayMins = typeof parseTimeToMinutes === 'function' ? parseTimeToMinutes(val) : 0;
        if (!validateMonday(mondayMins)) {
          if (typeof showCustomAlert === 'function') showCustomAlert(i18n.vhCloseValidationError || 'A hétfőre eső vezetési idő nem lehet több, mint a napi vezetési idő. Ellenőrizd a megadott értékeket.', 'info');
          return;
        }
        try { modal.remove(); } catch (_) {}
        if (typeof callback === 'function') callback({ mondayDriveMinutes: mondayMins, sundayDriveMinutes: dailyDriveMinutes - mondayMins, source: 'manual_monday_after_midnight' });
      });

      setTimeout(() => { const input = document.getElementById('vh-close-monday-input'); if (input) input.focus(); }, 100);
    }

    showStep1();
  }

  /**
   * V-H záráskor a teljes napi VT bekérése (heti/kétheti módhoz előlépés).
   * A tachográf számláló különbsége hétváltásnál torzulhat, ezért a felhasználótól
   * kérjük be a tényleges napi VT-t (vasárnap + hétfő együtt).
   * @param {Function} callback - (totalDriveMinutes: number) => void
   */
  function showSundayMondayCloseTotalModal(callback) {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
      ? (translations[currentLang] || {})
      : {};

    const timePlaceholder = i18n.timePlaceholder
      || (typeof getTimePlaceholderValue === 'function' ? getTimePlaceholderValue() : 'hh:mm');

    const existing = document.getElementById('vh-close-total-modal');
    if (existing) existing.remove();

    const html = `
      <div id="vh-close-total-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <svg class="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">${i18n.vhCloseModalTitle || 'Vasárnap–hétfő átnyúló műszak'}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">${i18n.vhCloseTotalStep || '1/2 – Teljes napi VT'}</p>
            </div>
          </div>
          <div class="space-y-4">
            <p class="text-sm text-gray-700 dark:text-gray-300">${i18n.vhCloseTotalModalInfo || 'Heti/kétheti módban a tachográf számláló különbsége hétváltásnál torzulhat. Add meg közvetlenül a teljes napi vezetési időt (vasárnap + hétfő együtt).'}</p>
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">${i18n.vhCloseTotalLabel || '⏱️ Teljes napi vezetési idő (vasárnap + hétfő)'}</label>
              <input type="text" id="vh-close-total-input" class="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="${timePlaceholder}" onblur="formatTimeInput(this, true)">
            </div>
          </div>
          <div class="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" id="vh-close-total-ok" class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-800 transition-all">${i18n.vhCloseOk || 'Rendben'}</button>
          </div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('vh-close-total-modal');
    const btnOk = document.getElementById('vh-close-total-ok');

    if (btnOk) btnOk.addEventListener('click', () => {
      const input = document.getElementById('vh-close-total-input');
      const val = input ? (input.value || '').trim() : '';
      if (!val) {
        if (typeof showCustomAlert === 'function') showCustomAlert(i18n.sundayMondayEnterDriveTime || 'Kérlek add meg a vezetési időt!', 'info');
        return;
      }
      const totalMins = typeof parseTimeToMinutes === 'function' ? parseTimeToMinutes(val) : 0;
      if (!Number.isFinite(totalMins) || totalMins <= 0) {
        if (typeof showCustomAlert === 'function') showCustomAlert(i18n.vhCloseTotalValidationError || 'A teljes napi VT érvénytelen, 0-nál nagyobb érték szükséges.', 'info');
        return;
      }
      try { modal.remove(); } catch (_) {}
      if (typeof callback === 'function') callback(totalMins);
    });

    setTimeout(() => {
      const input = document.getElementById('vh-close-total-input');
      if (input) input.focus();
    }, 100);
  }

  /**
   * Heti/kétheti módban a záráskori V-H bontás modal.
   * A hétfői rész (weeklyDriveEnd → mondayMins) már ismert a tachográf számlálóból.
   * Csak a teljes napi VT-t kell megkérni → sundayDriveMinutes = total − mondayMins.
   * @param {number} mondayMins - weeklyDriveEnd percben (hétfői rész)
   * @param {Function} callback - ({ mondayDriveMinutes, sundayDriveMinutes, totalDriveMinutes, source })
   *   source: 'vehicle_weekly_display'
   */
  function showSundayMondayCloseModalWeekly(mondayMins, callback) {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
      ? (translations[currentLang] || {})
      : {};

    const mondayStr = typeof formatMinutesToTime === 'function'
      ? formatMinutesToTime(mondayMins)
      : (Math.floor(mondayMins / 60) + ':' + String(mondayMins % 60).padStart(2, '0'));

    const timePlaceholder = i18n.timePlaceholder
      || (typeof getTimePlaceholderValue === 'function' ? getTimePlaceholderValue() : 'hh:mm');

    const infoText = (i18n.vhCloseWeeklyModalInfo
      || 'A kamion kijelzőjén látható heti idő ({monday}) a hétfői résznek felel meg. Add meg a teljes műszak napi vezetési idejét (vasárnap + hétfő együtt).')
      .replace('{monday}', mondayStr);

    const existing = document.getElementById('vh-close-weekly-modal');
    if (existing) existing.remove();

    const html = `
      <div id="vh-close-weekly-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
              <svg class="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">${i18n.vhCloseModalTitle || 'Vasárnap–hétfő átnyúló műszak'}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">🚛 ${i18n.vhCloseVehicleLabel || 'Heti kijelző'}: <strong>${mondayStr}</strong></p>
            </div>
          </div>
          <div class="space-y-4">
            <p class="text-sm text-gray-700 dark:text-gray-300">${infoText}</p>
            <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">${i18n.vhCloseWeeklyTotalLabel || '⏱️ Teljes napi vezetési idő (vasárnap + hétfő)'}</label>
              <input type="text" id="vh-close-weekly-total-input" class="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="${timePlaceholder}" onblur="formatTimeInput(this, true)">
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">${i18n.vhCloseWeeklyTotalHint || 'Minimum: ' + mondayStr + ' (a hétfői rész nem lehet több az összesnél)'}</p>
            </div>
          </div>
          <div class="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button type="button" id="vh-close-weekly-ok" class="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-800 transition-all">${i18n.vhCloseOk || 'Rendben'}</button>
          </div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('vh-close-weekly-modal');
    const btnOk = document.getElementById('vh-close-weekly-ok');

    if (btnOk) btnOk.addEventListener('click', () => {
      const input = document.getElementById('vh-close-weekly-total-input');
      const val = input ? (input.value || '').trim() : '';
      if (!val) {
        if (typeof showCustomAlert === 'function') showCustomAlert(i18n.sundayMondayEnterDriveTime || 'Kérlek add meg a vezetési időt!', 'info');
        return;
      }
      const totalMins = typeof parseTimeToMinutes === 'function' ? parseTimeToMinutes(val) : 0;
      if (!Number.isFinite(totalMins) || totalMins < mondayMins) {
        const errMsg = i18n.vhMondayExceedsTotalDrive
          || (i18n.vhCloseWeeklyValidationError
            || 'A hétfői vezetési idő nem lehet több, mint a teljes műszak vezetési ideje.')
            .replace('{monday}', mondayStr);
        if (typeof showCustomAlert === 'function') showCustomAlert(errMsg, 'info');
        return;
      }
      try { modal.remove(); } catch (_) {}
      if (typeof callback === 'function') callback({
        mondayDriveMinutes: mondayMins,
        sundayDriveMinutes: totalMins - mondayMins,
        totalDriveMinutes: totalMins,
        source: 'vehicle_weekly_display'
      });
    });

    setTimeout(() => {
      const input = document.getElementById('vh-close-weekly-total-input');
      if (input) input.focus();
    }, 100);
  }

  /**
   * Popup megjelenítése napi módban vasárnap indításkor
   * @param {Function} yesCallback - Ha "Igen" választ ad
   * @param {Function} noCallback - Ha "Nem" választ ad
   */
  function showOvernightShiftConfirmation(yesCallback, noCallback) {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') 
      ? translations[currentLang] 
      : {};
    
    const modalHTML = `
      <div id="overnight-confirm-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300">
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto transform transition-transform duration-300 scale-95">
          
          <div class="modal-header">
            <div class="flex items-center gap-4 mb-4">
              <div class="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center flex-shrink-0">
                <svg class="w-7 h-7 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">${i18n.overnightShiftTitle || '⚠️ Átnyúló műszak?'}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400">${i18n.overnightShiftSubtitle || 'Vasárnap indítás'}</p>
              </div>
            </div>
          </div>

          <div class="space-y-4 modal-body">
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p class="text-sm text-blue-800 dark:text-blue-200">
                ${i18n.overnightShiftQuestion || '📅 Vasárnapot indítasz. Várhatóan <strong>hétfőn</strong> fog zárulni a műszak?'}
              </p>
            </div>
            
            <p class="text-sm text-gray-600 dark:text-gray-300">
              ${i18n.overnightShiftHelp || 'Ha igen, akkor kérlek add meg a kétheti vezetési idődet a pontos számításhoz.'}
            </p>
          </div>
          
          <div class="modal-footer">
            <div class="flex gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onclick="confirmOvernightShift(false)" class="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200">${i18n.overnightShiftNo || 'Nem'}</button>
              <button type="button" onclick="confirmOvernightShift(true)" class="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-800 transition-all duration-200">${i18n.overnightShiftYes || '✅ Igen'}</button>
            </div>
          </div>

        </div>
      </div>
    `;
    
    // Távolítsuk el a korábbi modalt, ha létezik
    const existingModal = document.getElementById('overnight-confirm-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Adjuk hozzá az új modalt
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Animáció
    setTimeout(() => {
      const modal = document.getElementById('overnight-confirm-modal');
      if (modal) {
        modal.style.opacity = '1';
        const card = modal.querySelector('.transform');
        if (card) card.style.transform = 'scale(1)';
      }
    }, 10);
    
    // Callbacks tárolása
    window._overnightYesCallback = yesCallback;
    window._overnightNoCallback = noCallback;
  }

  /**
   * Megerősítés kezelése
   */
  function confirmOvernightShift(isOvernight) {
    const modal = document.getElementById('overnight-confirm-modal');
    if (modal) {
      modal.style.opacity = '0';
      setTimeout(() => modal.remove(), 300);
    }
    
    if (isOvernight && typeof window._overnightYesCallback === 'function') {
      window._overnightYesCallback();
    } else if (!isOvernight && typeof window._overnightNoCallback === 'function') {
      window._overnightNoCallback();
    }
    
    window._overnightYesCallback = null;
    window._overnightNoCallback = null;
  }

  // Globális export
  window.isSundayMondayShift = isSundayMondayShift;
  window.getPreviousWeekDriveMinutes = getPreviousWeekDriveMinutes;
  window.showTotalDriveTimePopup = showTotalDriveTimePopup;
  window.closeTotalDriveTimeModal = closeTotalDriveTimeModal;
  window.confirmTotalDriveTime = confirmTotalDriveTime;
  window.showOvernightShiftConfirmation = showOvernightShiftConfirmation;
  window.confirmOvernightShift = confirmOvernightShift;
  window.showSundayMondayCloseModal = showSundayMondayCloseModal;
  window.showSundayMondayCloseTotalModal = showSundayMondayCloseTotalModal;
  window.showSundayMondayCloseModalWeekly = showSundayMondayCloseModalWeekly;
  window.parseTimeToMinutes = window.parseTimeToMinutes || parseTimeToMinutes;
  window.formatMinutesToTime = formatMinutesToTime;

})();
