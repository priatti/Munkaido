// ===== BEGIN: loadLastValues (JAVÍTOTT ÉS TELJES VERZIÓ) =====
(function(){
  function prefillFromLast(target) {
    try {
      if (typeof getLatestRecord !== 'function') return;
      const last = getLatestRecord();
      if (!last) return; // Nincs mi alapján kitölteni, ha nincs előző bejegyzés

      // Az "Indítás" fül mezőinek feltöltése
      if (target === 'live') {
        const weeklyDriveInput = document.getElementById('liveWeeklyDriveStart');
        if (weeklyDriveInput && last.weeklyDriveEndStr) {
          weeklyDriveInput.value = last.weeklyDriveEndStr;
        }

        const kmInput = document.getElementById('liveStartKm');
        if (kmInput && typeof last.kmEnd !== 'undefined' && last.kmEnd !== null) {
          kmInput.value = String(last.kmEnd);
        }
        
        const locationInput = document.getElementById('liveStartLocation');
        if (locationInput && last.endLocation) {
          locationInput.value = last.endLocation;
        }

      // A "Teljes nap" fül mezőinek feltöltése
      } else {
        const weeklyDriveInput = document.getElementById('weeklyDriveStart');
        if (weeklyDriveInput && last.weeklyDriveEndStr) {
          weeklyDriveInput.value = last.weeklyDriveEndStr;
        }

        const kmInput = document.getElementById('kmStart');
        if (kmInput && typeof last.kmEnd !== 'undefined' && last.kmEnd !== null) {
          kmInput.value = String(last.kmEnd);
        }
        
        const locationInput = document.getElementById('startLocation');
        if (locationInput && last.endLocation) {
          locationInput.value = last.endLocation;
        }
      }
    } catch (e) {
      console.warn('Hiba az utolsó értékek betöltésekor:', e);
    }
  }

  // Globális függvény definiálása
  window.loadLastValues = function(isForLiveTab = false) {
    prefillFromLast(isForLiveTab ? 'live' : 'full');
  };
})();
// ===== END: loadLastValues =====

// ===== HIÁNYZÓ FÜGGVÉNYEK JAVÍTÁSA =====
// Add ezt a main.js fájl ELEJÉRE (a DOMContentLoaded előtt):

// ===== ALAPVETŐ MUNKAIDŐ FÜGGVÉNYEK =====

// Űrlap visszaállítása - JAVÍTOTT
function resetEntryForm() {
    console.log('resetEntryForm called');
    editingId = null;
    
    // Ellenőrizzük, hogy léteznek-e az elemek
    const elements = [
        'date', 'startTime', 'endTime', 'startLocation', 'endLocation',
        'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });
    
    // Határátlépések törlése
    const crossingsContainer = document.getElementById('crossingsContainer');
    if (crossingsContainer) {
        crossingsContainer.innerHTML = '';
    }
    
    // Osztott pihenő checkbox
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        splitRestToggle.checked = false;
        updateEnhancedToggleVisuals(splitRestToggle);
    }
}

// Élő munkanap indítása - JAVÍTOTT
async function startLiveShift() {
    console.log('startLiveShift called');
    const i18n = translations[currentLang];
    
    const date = document.getElementById('liveStartDate')?.value;
    const time = document.getElementById('liveStartTime')?.value;
    const location = document.getElementById('liveStartLocation')?.value?.trim() || '';
    const weeklyDriveStart = document.getElementById('liveWeeklyDriveStart')?.value || '';
    const kmStart = parseFloat(document.getElementById('liveStartKm')?.value) || 0;
    
    if (!date || !time) {
        showCustomAlert(i18n.alertMandatoryFields || 'Dátum és idő megadása kötelező!', 'info');
        return;
    }
    
    // Új munkanap objektum létrehozása
    const newEntry = {
        id: String(Date.now()),
        date,
        startTime: time,
        endTime: '',
        startLocation: location,
        endLocation: '',
        weeklyDriveStartStr: weeklyDriveStart,
        kmStart: kmStart,
        crossings: []
    };
    
    // Helyi tárolásba mentés
    localStorage.setItem('inProgressEntry', JSON.stringify(newEntry));
    inProgressEntry = newEntry;
    
    // UI frissítése
    renderStartTab();
    showTab('start');
    
    showCustomAlert('Munkanap sikeresen elindítva!', 'success');
}

// Élő határátlépés hozzáadása - JAVÍTOTT
function addLiveCrossing() {
    console.log('addLiveCrossing called');
    
    const fromElement = document.getElementById('liveCrossFrom');
    const toElement = document.getElementById('liveCrossTo');
    const timeElement = document.getElementById('liveCrossTime');
    
    if (!fromElement || !toElement || !timeElement) {
        console.error('Live crossing elements not found');
        return;
    }
    
    const from = fromElement.value.trim().toUpperCase();
    const to = toElement.value.trim().toUpperCase();
    const time = timeElement.value;
    
    if (!from || !to || !time) {
        showCustomAlert('Kérlek töltsd ki az összes mezőt!', 'info');
        return;
    }
    
    if (!inProgressEntry) {
        showCustomAlert('Nincs aktív munkanap!', 'info');
        return;
    }
    
    // Crossing hozzáadása
    if (!inProgressEntry.crossings) {
        inProgressEntry.crossings = [];
    }
    inProgressEntry.crossings.push({ from, to, time });
    localStorage.setItem('inProgressEntry', JSON.stringify(inProgressEntry));
    
    // UI frissítése
    renderStartTab();
    
    showCustomAlert('Határátlépés hozzáadva!', 'success');
}

// Műszak befejezése - JAVÍTOTT
async function finalizeShift() {
    console.log('finalizeShift called');
    const i18n = translations[currentLang];
    
    if (!inProgressEntry) {
        showCustomAlert('Nincs aktív munkanap a befejezéshez!', 'info');
        return;
    }
    
    // Modal megnyitása a befejezési adatok bekéréséhez
    showFinalizationModal();
}

// Műszak elvetése - JAVÍTOTT
function discardShift() {
    console.log('discardShift called');
    showCustomAlert('Biztosan eldobod a folyamatban lévő munkanapot?', 'warning', () => {
        localStorage.removeItem('inProgressEntry');
        inProgressEntry = null;
        renderStartTab();
        showCustomAlert('Munkanap elvetve.', 'info');
    });
}

// Teljes nap munkanap mentése - JAVÍTOTT
async function saveEntry() {
    console.log('saveEntry called');
    const i18n = translations[currentLang];
    
    try {
        // Elemek ellenőrzése
        const dateElement = document.getElementById('date');
        const startTimeElement = document.getElementById('startTime');
        const endTimeElement = document.getElementById('endTime');
        
        if (!dateElement || !startTimeElement || !endTimeElement) {
            console.error('Required form elements not found');
            showCustomAlert('Űrlap elemek hiányoznak!', 'info');
            return;
        }
        
        const date = dateElement.value;
        const startTime = startTimeElement.value;
        const endTime = endTimeElement.value;
        const startLocation = document.getElementById('startLocation')?.value?.trim() || '';
        const endLocation = document.getElementById('endLocation')?.value?.trim() || '';
        const weeklyDriveStart = document.getElementById('weeklyDriveStart')?.value || '';
        const weeklyDriveEnd = document.getElementById('weeklyDriveEnd')?.value || '';
        const kmStart = parseFloat(document.getElementById('kmStart')?.value) || 0;
        const kmEnd = parseFloat(document.getElementById('kmEnd')?.value) || 0;
        const compensationTime = document.getElementById('compensationTime')?.value || '';
        const splitRestToggle = document.getElementById('toggleSplitRest');
        const isSplitRest = splitRestToggle ? splitRestToggle.checked : false;

        // Validáció
        if (!date || !startTime || !endTime) {
            showCustomAlert(i18n.alertMandatoryFields || 'A dátum és munkaidő megadása kötelező!', 'info');
            return;
        }

        if (localStorage.getItem('toggleKm') === 'true' && kmEnd < kmStart) {
            showCustomAlert(i18n.alertKmEndLower || 'A záró kilométer nem lehet kevesebb, mint a kezdő!', 'info');
            return;
        }

        if (localStorage.getItem('toggleDriveTime') === 'true' && weeklyDriveStart && weeklyDriveEnd) {
            const startMinutes = parseTimeToMinutes(weeklyDriveStart);
            const endMinutes = parseTimeToMinutes(weeklyDriveEnd);
            if (endMinutes < startMinutes) {
                showCustomAlert(i18n.alertWeeklyDriveEndLower || 'A heti vezetési idő a nap végén nem lehet kevesebb!', 'info');
                return;
            }
        }

        // Számítások
        const workMinutes = calculateWorkMinutes(startTime, endTime);
        const compensationMinutes = compensationTime ? parseTimeToMinutes(compensationTime) : 0;
        const netWorkMinutes = Math.max(0, workMinutes - compensationMinutes);
        const nightWorkMinutes = calculateNightWorkMinutes(startTime, endTime);
        const driveMinutes = (weeklyDriveStart && weeklyDriveEnd) ? 
            Math.max(0, parseTimeToMinutes(weeklyDriveEnd) - parseTimeToMinutes(weeklyDriveStart)) : 0;
        const kmDriven = Math.max(0, kmEnd - kmStart);

        // Határátlépések összegyűjtése
        const crossings = [];
        const crossingRows = document.querySelectorAll('#crossingsContainer .crossing-row');
        crossingRows.forEach(row => {
            const from = row.querySelector('.crossing-from')?.value?.trim()?.toUpperCase();
            const to = row.querySelector('.crossing-to')?.value?.trim()?.toUpperCase();
            const time = row.querySelector('.crossing-time')?.value;
            if (from && to && time) {
                crossings.push({ from, to, time });
            }
        });

        // Vasárnap-hétfő átfordulás ellenőrzése
        const startDate = new Date(date + 'T' + startTime);
        const endTimeDate = new Date(date + 'T' + endTime);
        if (endTimeDate < startDate) {
            endTimeDate.setDate(endTimeDate.getDate() + 1);
        }
        
        let finalDriveMinutes = driveMinutes;
        const isRollover = startDate.getDay() === 0 && endTimeDate.getDay() === 1;
        
        if (isRollover && driveMinutes > 0) {
            // Rollover esetén kérjük be a teljes vezetési időt
            const totalDriveTime = await new Promise(resolve => {
                const icon = `<svg class="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                showCustomPrompt(
                    i18n.alertRolloverTitle || 'Áthúzódó műszak',
                    i18n.alertRolloverPrompt || 'Add meg a teljes vezetési időt:',
                    i18n.alertRolloverPlaceholder || 'óó:pp',
                    icon,
                    (input) => {
                        const minutes = parseTimeToMinutes(input);
                        resolve(minutes > 0 ? minutes : driveMinutes);
                    }
                );
            });
            finalDriveMinutes = totalDriveTime;
        }

        // Rekord objektum létrehozása
        const record = {
            id: editingId || String(Date.now()),
            date,
            startTime,
            endTime,
            startLocation,
            endLocation,
            workMinutes: netWorkMinutes,
            compensationMinutes,
            nightWorkMinutes,
            driveMinutes: finalDriveMinutes,
            kmDriven,
            crossings,
            weeklyDriveStartStr: weeklyDriveStart,
            weeklyDriveEndStr: weeklyDriveEnd,
            kmStart,
            kmEnd,
            isSplitRest
        };

        // Mentés
        await saveWorkRecord(record);

        // Osztott pihenő adat mentése
        if (isSplitRest) {
            const splitData = getSplitRestData();
            splitData[record.id] = true;
            saveSplitRestData(splitData);
        }

        // UI visszaállítás
        resetEntryForm();
        renderApp();
        showTab('list');
        
        showCustomAlert(i18n.alertSaveSuccess || 'Bejegyzés sikeresen mentve!', 'success');

    } catch (error) {
        console.error('Save error:', error);
        showCustomAlert('Hiba történt a mentés során: ' + error.message, 'info');
    }
}

// Határátlépés sor hozzáadása - JAVÍTOTT
function addCrossingRow(from = '', to = '', time = '') {
    console.log('addCrossingRow called');
    const container = document.getElementById('crossingsContainer');
    if (!container) {
        console.error('crossingsContainer not found');
        return;
    }
    
    const rowId = 'crossing-' + Date.now();
    const currentTime = time || new Date().toTimeString().slice(0, 5);
    
    const rowHTML = `
        <div class="crossing-row flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg" id="${rowId}">
            <input type="text" class="crossing-from flex-1 p-2 border rounded text-sm uppercase" placeholder="Honnan" value="${from}">
            <span class="text-gray-400">→</span>
            <div class="flex flex-1">
                <input type="text" class="crossing-to flex-1 p-2 border rounded-l text-sm uppercase" placeholder="Hova" value="${to}">
                <button type="button" class="bg-blue-500 text-white p-2 rounded-r text-xs" onclick="fetchCountryCodeFor('${rowId}')">📍</button>
            </div>
            <input type="time" class="crossing-time p-2 border rounded text-sm" value="${currentTime}" onblur="formatTimeInput(this)">
            <button type="button" class="text-red-500 hover:text-red-700 p-1" onclick="removeCrossingRow('${rowId}')">🗑️</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', rowHTML);
}

// Határátlépés sor törlése - JAVÍTOTT
function removeCrossingRow(rowId) {
    console.log('removeCrossingRow called:', rowId);
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
    }
}

// ===== GLOBÁLIS HOZZÁFÉRÉS BIZTOSÍTÁSA =====
// Minden funkció globálisan elérhető legyen

window.resetEntryForm = resetEntryForm;
window.startLiveShift = startLiveShift;
window.addLiveCrossing = addLiveCrossing;
window.finalizeShift = finalizeShift;
window.discardShift = discardShift;
window.saveEntry = saveEntry;
window.addCrossingRow = addCrossingRow;
window.removeCrossingRow = removeCrossingRow;

// Enhanced toggle visual frissítés
window.updateEnhancedToggleVisuals = function(checkbox) {
    if (!checkbox) return;
    
    const container = checkbox.closest('.enhanced-toggle-container');
    if (!container) return;
    
    const checkmark = container.querySelector('.enhanced-toggle-checkmark');
    
    if (checkbox.checked) {
        container.classList.add('active');
        if (checkmark) {
            checkmark.classList.remove('hidden');
        }
    } else {
        container.classList.remove('active');
        if (checkmark) {
            checkmark.classList.add('hidden');
        }
    }
};

// Split rest data kezelő függvények
window.getSplitRestData = function() {
    return JSON.parse(localStorage.getItem('splitRestData') || '{}');
};

window.saveSplitRestData = function(data) {
    localStorage.setItem('splitRestData', JSON.stringify(data));
};

console.log('All missing functions have been defined and exported to window object');

// =======================================================
// ===== ALKALMAZÁS FŐ VEZÉRLŐJE (main.js) ================
// =======================================================

// ====== GLOBÁLIS ÁLLAPOT (STATE) ======
let records = [];
let palletRecords = [];
let editingId = null; 
let inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
let uniqueLocations = [];
let uniquePalletLocations = [];
let currentActiveTab = 'live';

// ====== ALKALMAZÁS INDÍTÁSA ======
document.addEventListener('DOMContentLoaded', () => {
    // Alapfunkciók inicializálása
    initTheme();
    loadSettings();
    initializeFeatureToggles();
    initializePwaInstall();
    initializePalletSettings();
    initializeAuth(); 
    
    // Globális eseménykezelők beállítása
    document.addEventListener('click', (event) => {
        // Főmenü bezárása
        const dropdownContainer = document.getElementById('dropdown-container');
        if (dropdownContainer && !dropdownContainer.contains(event.target)) {
            closeDropdown();
        }
        // Beállítások menü bezárása
        const settingsContainer = document.querySelector('#app-header .relative');
        if (settingsContainer && !settingsContainer.contains(event.target)) {
            closeSettingsMenu();
        }
        // Autocomplete bezárása
        if (!event.target.closest('.autocomplete-list')) {
            hideAutocomplete();
        }
    });

    setupEventListeners();
});

// ====== FŐ RENDERELŐ FUNKCIÓ ======
function renderApp() {
    applyFeatureToggles();
    updateUniqueLocations();
    updateUniquePalletLocations();
    initAllAutocomplete();
    
    renderLiveTabView();
    renderStartTab();
    renderRecords();
    renderSummary();
    if (document.getElementById('content-stats').offsetParent !== null) renderStats();
    if (document.getElementById('content-tachograph').offsetParent !== null) renderTachographAnalysis();
    if (document.getElementById('content-pallets').offsetParent !== null) renderPalletRecords();
    
    updateAllTexts(); 
}


// ====== NÉZETKEZELÉS (FÜLEK) ======
function showTab(tabName) {
    currentActiveTab = tabName;

    if (tabName === 'full-day' && !editingId) {
        resetEntryForm();
        loadLastValues();
    }
    if (tabName === 'pallets') {
        renderPalletRecords(); // Most már ez a funkció tölti ki az alapértelmezett értékeket is
    }
    if (tabName === 'report') { if (typeof initMonthlyReport==='function') { initMonthlyReport(); } }
    if (tabName === 'list') {
        renderRecords();
    }
    if (tabName === 'summary') {
        renderSummary();
    }
    if (tabName === 'stats') {
        statsDate = new Date();
        renderStats();
    }
     if (tabName === 'tachograph') {
        renderTachographAnalysis();
    }
    if (tabName === 'help') {
        renderHelp();
    }

    const allTabs = document.querySelectorAll('.tab');
    const mainTabs = ['live', 'start', 'full-day'];
    const dropdownButton = document.getElementById('dropdown-button');
    const dropdownMenu = document.getElementById('dropdown-menu');
    
    allTabs.forEach(t => t.classList.remove('tab-active'));
    dropdownButton.classList.remove('tab-active');

    if (mainTabs.includes(tabName)) {
        const tabButton = document.getElementById(`tab-${tabName}`);
        if (tabButton) tabButton.classList.add('tab-active');
        dropdownButton.innerHTML = `<span data-translate-key="menuMore">${translations[currentLang].menuMore}</span> ▼`;
    } else {
        dropdownButton.classList.add('tab-active');
        const selectedTitleEl = dropdownMenu.querySelector(`button[onclick="showTab('${tabName}')"] .dropdown-item-title`);
        if (selectedTitleEl) {
            const selectedTitle = selectedTitleEl.getAttribute('data-translate-key') ? translations[currentLang][selectedTitleEl.getAttribute('data-translate-key')] : selectedTitleEl.textContent;
            dropdownButton.innerHTML = `${selectedTitle} ▼`;
        }
    }

    document.querySelectorAll('[id^="content-"]').forEach(c => c.classList.add('hidden'));
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    
    closeDropdown();
    if (typeof closeSettingsMenu === 'function') {
        closeSettingsMenu();
    }

    updateAllTexts();
}

function toggleDropdown() { document.getElementById('dropdown-menu').classList.toggle('hidden'); }
function closeDropdown() { document.getElementById('dropdown-menu').classList.add('hidden'); }

function toggleSettingsMenu() {
    document.getElementById('settings-dropdown').classList.toggle('hidden');
}

function closeSettingsMenu() {
    document.getElementById('settings-dropdown').classList.add('hidden');
}


// ====== SEGÉDFÜGGVÉNYEK ======
function getSortedRecords() {
    return [...(records || [])].sort((a, b) => new Date(`${b.date}T${b.startTime}`) - new Date(`${a.date}T${a.startTime}`));
}

function getLatestRecord() {
    if (!records || records.length === 0) return null;
    return getSortedRecords()[0];
}

function updateUniqueLocations() {
    const locations = new Set(records.map(r => r.startLocation).concat(records.map(r => r.endLocation)));
    uniqueLocations = Array.from(locations).filter(Boolean).sort();
}

function updateUniquePalletLocations() {
    const locations = new Set(palletRecords.map(r => r.location));
    uniquePalletLocations = Array.from(locations).filter(Boolean).sort();
}

function updateDisplays() {
    const i18n = translations[currentLang];
    const workMinutes = calculateWorkMinutes(document.getElementById('startTime').value, document.getElementById('endTime').value);
    document.getElementById('workTimeDisplay').textContent = workMinutes > 0 ? `${i18n.workTimeDisplay}: ${formatDuration(workMinutes)}` : '';
    const nightMinutes = calculateNightWorkMinutes(document.getElementById('startTime').value, document.getElementById('endTime').value);
    document.getElementById('nightWorkDisplay').textContent = nightMinutes > 0 ? `${i18n.nightWorkDisplay}: ${formatDuration(nightMinutes)}` : '';
    const driveMinutes = Math.max(0, parseTimeToMinutes(document.getElementById('weeklyDriveEnd').value) - parseTimeToMinutes(document.getElementById('weeklyDriveStart').value));
    document.getElementById('driveTimeDisplay').textContent = driveMinutes > 0 ? `${i18n.driveTimeTodayDisplay}: ${formatDuration(driveMinutes)}` : '';
    const kmDriven = Math.max(0, (parseFloat(document.getElementById('kmEnd').value) || 0) - (parseFloat(document.getElementById('kmStart').value) || 0));
    document.getElementById('kmDisplay').textContent = kmDriven > 0 ? `${i18n.kmDrivenDisplay}: ${kmDriven} km` : '';
}

async function runNightWorkRecalculation() {
    if (localStorage.getItem('nightWorkRecalculated_v20_05')) { return; }
    const i18n = translations[currentLang];
    console.log(i18n.logRecalculatingNightWork);
    let updatedCount = 0;
    const updatedRecords = records.map(record => {
        const newNightWorkMinutes = calculateNightWorkMinutes(record.startTime, record.endTime);
        if (record.nightWorkMinutes !== newNightWorkMinutes) {
            record.nightWorkMinutes = newNightWorkMinutes;
            updatedCount++;
        }
        return record;
    });
    records = updatedRecords;
    if (currentUser) {
        const batch = db.batch();
        records.forEach(record => {
            const docRef = db.collection('users').doc(currentUser.uid).collection('records').doc(String(record.id));
            batch.update(docRef, { nightWorkMinutes: record.nightWorkMinutes });
        });
        await batch.commit();
    } else {
        localStorage.setItem('workRecords', JSON.stringify(records));
    }
    localStorage.setItem('nightWorkRecalculated_v20_05', 'true');
    console.log(`${updatedCount} ${i18n.logEntriesUpdated}`);
}

function renderLiveTabView() {
    renderTachographStatusCard();
    renderTachoHelperCards();
    renderDashboard();
}

function renderStartTab() {
    const i18n = translations[currentLang];
    inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
    
    const startForm = document.getElementById('start-new-day-form');
    const progressView = document.getElementById('live-progress-view');
    const summaryContainer = document.getElementById('live-start-summary');

    if (inProgressEntry) {
        startForm.classList.add('hidden');
        progressView.classList.remove('hidden');

        document.getElementById('live-start-time').textContent = `${i18n.startedAt}: ${inProgressEntry.date} ${inProgressEntry.startTime}`;
        
        let summaryHTML = '';
        const hasDriveData = localStorage.getItem('toggleDriveTime') === 'true' && inProgressEntry.weeklyDriveStartStr;
        const hasKmData = localStorage.getItem('toggleKm') === 'true' && inProgressEntry.kmStart > 0;
        const hasLocationData = inProgressEntry.startLocation && inProgressEntry.startLocation.trim() !== '';

        if (hasDriveData || hasKmData || hasLocationData) {
            summaryHTML += `<div class="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg space-y-2">
                                <h3 class="font-semibold text-gray-800 dark:text-gray-100">${i18n.liveShiftDetailsTitle}</h3>
                                <div class="space-y-1 text-sm">`;

            if (hasLocationData) {
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartLocationLabel}</span>
                                    <span class="font-semibold">${inProgressEntry.startLocation}</span>
                                </div>`;
            }
            if (hasDriveData) {
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartDriveLabel}</span>
                                    <span class="font-semibold">${inProgressEntry.weeklyDriveStartStr}</span>
                                </div>`;
            }
            if (hasKmData) {
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartKmLabel}</span>
                                    <span class="font-semibold">${inProgressEntry.kmStart} km</span>
                                </div>`;
            }

            summaryHTML += `</div></div>`;
        }
        summaryContainer.innerHTML = summaryHTML;
        
        const liveCrossList = document.getElementById('live-crossings-list');
        const liveCrossFrom = document.getElementById('liveCrossFrom');
        if (inProgressEntry.crossings && inProgressEntry.crossings.length > 0) {
            const crossingsHTML = inProgressEntry.crossings.map(c => 
                `<div class="flex items-center justify-between bg-white dark:bg-gray-700/50 p-2 rounded-md shadow-sm">
                    <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        <span class="font-mono font-bold text-indigo-800 dark:text-indigo-200">${c.from}</span>
                        <span class="text-gray-400">→</span>
                        <span class="font-mono font-bold text-indigo-800 dark:text-indigo-200">${c.to}</span>
                    </div>
                    <span class="text-sm font-mono text-gray-600 dark:text-gray-400">${c.time}</span>
                </div>`
            ).join('');
            liveCrossList.innerHTML = `<div class="bg-indigo-50 dark:bg-indigo-900/50 p-3 rounded-lg">
                                        <h4 class="font-bold text-indigo-800 dark:text-indigo-200 text-sm mb-2">${i18n.recordedCrossings}</h4>
                                        <div class="space-y-2">${crossingsHTML}</div>
                                    </div>`;
            liveCrossFrom.value = inProgressEntry.crossings.slice(-1)[0].to;
        } else {
            liveCrossList.innerHTML = '';
            const lastRecordWithCrossing = getSortedRecords().find(r => r.crossings && r.crossings.length > 0);
            liveCrossFrom.value = lastRecordWithCrossing ? lastRecordWithCrossing.crossings.slice(-1)[0].to : '';
        }
        document.getElementById('liveCrossTo').value = '';
        document.getElementById('liveCrossTime').value = new Date().toTimeString().slice(0, 5);

    } else {
        progressView.classList.add('hidden');
        startForm.classList.remove('hidden');
        summaryContainer.innerHTML = ''; 
        loadLastValues(true);
        
        // AKTUÁLIS DÁTUM ÉS IDŐ BEÁLLÍTÁSA
        const now = new Date();
        const dateInput = document.getElementById('liveStartDate');
        const timeInput = document.getElementById('liveStartTime');
        
        if (dateInput && !dateInput.value) {
            dateInput.value = now.toISOString().split('T')[0];
        }
        if (timeInput && !timeInput.value) {
            timeInput.value = now.toTimeString().slice(0, 5);
        }
    }
}

function renderDashboard() {
    const i18n = translations[currentLang];
    const container = document.getElementById('dashboard-cards');
    if (!container) return;
    const now = new Date();
    const thisWeek = calculateSummaryForDateRange(getWeekRange(now));
    const lastWeek = calculateSummaryForDateRange(getWeekRange(now, -1));
    const thisMonth = calculateSummaryForMonth(new Date());
    
    const cards = [
        { labelKey: 'dashboardDriveThisWeek', value: formatDuration(thisWeek.driveMinutes), color: 'blue' },
        { labelKey: 'dashboardWorkThisWeek', value: formatDuration(thisWeek.workMinutes), color: 'green' },
        { labelKey: 'dashboardDistanceThisMonth', value: `${thisMonth.kmDriven} km`, color: 'orange' },
        { labelKey: 'dashboardDistanceLastWeek', value: `${lastWeek.kmDriven} km`, color: 'indigo' }
    ];

    container.innerHTML = cards.map(card => `
        <div class="bg-${card.color}-50 dark:bg-${card.color}-900/50 border border-${card.color}-200 dark:border-${card.color}-800 rounded-lg p-3 text-center">
            <p class="text-xs text-${card.color}-700 dark:text-${card.color}-200 font-semibold">${i18n[card.labelKey]}</p>
            <p class="text-lg font-bold text-${card.color}-800 dark:text-${card.color}-100 mt-1">${card.value}</p>
        </div>
    `).join('');
}

function setupEventListeners() {
    // Általános űrlap mezők figyelése
    ['startTime', 'endTime', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateDisplays);
    });

    // Statisztika gombjainak figyelése
    document.getElementById('stats-view-daily').onclick = () => setStatsView('daily');
    document.getElementById('stats-view-monthly').onclick = () => setStatsView('monthly');
    document.getElementById('stats-view-yearly').onclick = () => setStatsView('yearly');
    document.getElementById('stats-prev').onclick = () => navigateStats(-1);
    document.getElementById('stats-next').onclick = () => navigateStats(1);

    // Beállítások figyelése
    document.getElementById('autoExportSelector').addEventListener('change', (e) => {
        const i18n = translations[currentLang];
        localStorage.setItem('autoExportFrequency', e.target.value);
        if (e.target.value !== 'never') {
            localStorage.setItem('lastAutoExportDate', new Date().toISOString());
            showCustomAlert(i18n.autoBackupOn, 'success');
        } else {
            showCustomAlert(i18n.autoBackupOff, 'info');
        }
    });
}


// ===== BEGIN: finalize_modal_complete (appended) =====
// ===== TELJES BEFEJEZÉSI MODAL INTEGRÁCIÓ =====
// Add ezt a main.js fájlba a hiányzó függvények után:

// Modal megjelenítése - JAVÍTOTT
function showFinalizationModal() {
    console.log('showFinalizationModal called');
    const i18n = translations[currentLang];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Ellenőrizzük, hogy van-e már modal
    const existingModal = document.getElementById('finalize-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // A program arculatához illeszkedő modal HTML
    const modalHTML = `
        <div id="finalize-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300" onclick="handleModalBackdropClick(event)">
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto transform transition-transform duration-300 scale-95">
                
                <div class="text-center mb-6">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        <svg class="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100">Műszak befejezése</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Add meg a befejezési adatokat</p>
                </div>
                
                <div class="space-y-4">
                    
                    <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            ⏰ Befejezés ideje
                        </label>
                        <input type="time" id="finalizeEndTime" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value="${currentTime}">
                    </div>
                    
                    <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            📍 Befejezés helye
                        </label>
                        <div class="flex">
                            <input type="text" id="finalizeEndLocation" class="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Város">
                            <button type="button" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-r-lg border border-blue-500 transition-colors" onclick="fetchLocation('finalizeEndLocation')" title="Helyszín lekérése GPS alapján">
                                📍
                            </button>
                        </div>
                    </div>
                    
                    ${localStorage.getItem('toggleDriveTime') === 'true' ? `
                    <div class="bg-indigo-50 dark:bg-indigo-900/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">
                            🚗 Heti vezetés vége
                        </label>
                        <input type="text" id="finalizeWeeklyDriveEnd" class="w-full p-3 border border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-indigo-800/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="óó:pp" onblur="formatTimeInput(this, true)">
                    </div>
                    ` : ''}
                    
                    ${localStorage.getItem('toggleKm') === 'true' ? `
                    <div class="bg-orange-50 dark:bg-orange-900/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">
                            📏 Záró km
                        </label>
                        <input type="number" id="finalizeKmEnd" class="w-full p-3 border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-orange-800/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="0">
                    </div>
                    ` : ''}
                    
                </div>
                
                <div class="flex gap-3 mt-8">
                    <button type="button" onclick="closeFinalizeModal()" class="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                        Mégse
                    </button>
                    <button type="button" onclick="completeFinalizeShift()" class="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg">
                        ✅ Befejezés
                    </button>
                </div>
                
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Modal animáció
    setTimeout(() => {
        const modal = document.getElementById('finalize-modal');
        const box = modal.querySelector('div > div');
        if (modal && box) {
            modal.classList.remove('opacity-0');
            box.classList.remove('scale-95');
            box.classList.add('scale-100');
        }
    }, 10);
    
    // Értékek előtöltése
    setTimeout(() => {
        const endLocationInput = document.getElementById('finalizeEndLocation');
        const weeklyDriveInput = document.getElementById('finalizeWeeklyDriveEnd');
        const kmEndInput = document.getElementById('finalizeKmEnd');
        
        // GPS hely előtöltése utolsó határátlépésből
        if (endLocationInput && inProgressEntry && inProgressEntry.crossings && inProgressEntry.crossings.length > 0) {
            endLocationInput.value = inProgressEntry.crossings[inProgressEntry.crossings.length - 1].to;
        }
        
        // Utolsó bejegyzés adatainak használata
        const lastRecord = getLatestRecord();
        if (lastRecord) {
            if (weeklyDriveInput && !weeklyDriveInput.value && lastRecord.weeklyDriveEndStr) {
                // Alapértékként az utolsó heti vezetési idő + jelenlegi műszak becsült vezetési ideje
                const lastDriveMinutes = parseTimeToMinutes(lastRecord.weeklyDriveEndStr);
                const estimatedDriveTime = Math.min(600, 480); // Max 10 óra, de általában 8
                const newDriveMinutes = lastDriveMinutes + estimatedDriveTime;
                const hours = Math.floor(newDriveMinutes / 60);
                const minutes = newDriveMinutes % 60;
                weeklyDriveInput.value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }
            
            if (kmEndInput && !kmEndInput.value && lastRecord.kmEnd) {
                // Alapértékként az utolsó km + becsült 400-800 km
                kmEndInput.value = (lastRecord.kmEnd + 600);
            }
        }
        
        // Autocomplete inicializálás
        if (endLocationInput && typeof initAutocomplete === 'function') {
            initAutocomplete(endLocationInput, uniqueLocations || []);
        }
        
    }, 100);
}

// Modal háttérre kattintás kezelése
function handleModalBackdropClick(event) {
    console.log('handleModalBackdropClick called');
    // Modal csak akkor záródjon be, ha pontosan a háttérre kattintunk
    if (event.target.id === 'finalize-modal') {
        closeFinalizeModal();
    }
}

// Modal bezárása
function closeFinalizeModal() {
    console.log('closeFinalizeModal called');
    const modal = document.getElementById('finalize-modal');
    if (modal) {
        const box = modal.querySelector('div > div');
        
        // Animáció
        modal.classList.add('opacity-0');
        if (box) {
            box.classList.remove('scale-100');
            box.classList.add('scale-95');
        }
        
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Befejezés teljesítése
async function completeFinalizeShift() {
    console.log('completeFinalizeShift called');
    const i18n = translations[currentLang];
    
    try {
        const endTimeElement = document.getElementById('finalizeEndTime');
        const endLocationElement = document.getElementById('finalizeEndLocation');
        const weeklyDriveElement = document.getElementById('finalizeWeeklyDriveEnd');
        const kmEndElement = document.getElementById('finalizeKmEnd');
        
        if (!endTimeElement) {
            throw new Error('Befejezési idő mező nem található');
        }
        
        const endTime = endTimeElement.value;
        const endLocation = endLocationElement?.value?.trim() || '';
        const weeklyDriveEnd = weeklyDriveElement?.value || '';
        const kmEnd = parseFloat(kmEndElement?.value) || 0;
        
        if (!endTime) {
            showCustomAlert('Befejezés ideje kötelező!', 'info');
            return;
        }
        
        if (!inProgressEntry) {
            throw new Error('Nincs aktív munkanap');
        }
        
        // Munkaidő számítása
        const workMinutes = calculateWorkMinutes(inProgressEntry.startTime, endTime);
        const nightWorkMinutes = calculateNightWorkMinutes(inProgressEntry.startTime, endTime);
        
        // Vezetési idő számítása
        let driveMinutes = 0;
        if (inProgressEntry.weeklyDriveStartStr && weeklyDriveEnd) {
            const startMinutes = parseTimeToMinutes(inProgressEntry.weeklyDriveStartStr);
            const endMinutes = parseTimeToMinutes(weeklyDriveEnd);
            driveMinutes = Math.max(0, endMinutes - startMinutes);
        }
        
        // Megtett kilométer számítása
        const kmDriven = Math.max(0, kmEnd - (inProgressEntry.kmStart || 0));
        
        // Vasárnap-hétfő átfordulás ellenőrzése
        const startDate = new Date(inProgressEntry.date + 'T' + inProgressEntry.startTime);
        const endTimeDate = new Date(inProgressEntry.date + 'T' + endTime);
        if (endTimeDate < startDate) {
            endTimeDate.setDate(endTimeDate.getDate() + 1);
        }
        
        const isRollover = startDate.getDay() === 0 && endTimeDate.getDay() === 1;
        
        if (isRollover && driveMinutes > 0) {
            // Modal bezárása először
            closeFinalizeModal();
            
            // Rollover esetén kérjük be a teljes vezetési időt
            const totalDriveTime = await new Promise(resolve => {
                const icon = `<svg class="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                showCustomPrompt(
                    i18n.alertRolloverTitle || 'Áthúzódó műszak',
                    i18n.alertRolloverPrompt || 'Add meg a teljes vezetési időt:',
                    i18n.alertRolloverPlaceholder || 'óó:pp',
                    icon,
                    (input) => {
                        const minutes = parseTimeToMinutes(input);
                        resolve(minutes > 0 ? minutes : driveMinutes);
                    }
                );
            });
            driveMinutes = totalDriveTime;
        } else {
            closeFinalizeModal();
        }
        
        // Befejezett bejegyzés létrehozása
        const completedRecord = {
            id: inProgressEntry.id,
            date: inProgressEntry.date,
            startTime: inProgressEntry.startTime,
            endTime: endTime,
            startLocation: inProgressEntry.startLocation || '',
            endLocation: endLocation,
            workMinutes: workMinutes,
            nightWorkMinutes: nightWorkMinutes,
            driveMinutes: driveMinutes,
            kmDriven: kmDriven,
            crossings: inProgressEntry.crossings || [],
            weeklyDriveStartStr: inProgressEntry.weeklyDriveStartStr || '',
            weeklyDriveEndStr: weeklyDriveEnd,
            kmStart: inProgressEntry.kmStart || 0,
            kmEnd: kmEnd
        };
        
        // Mentés
        if (typeof saveWorkRecord === 'function') {
            await saveWorkRecord(completedRecord);
        } else {
            console.error('saveWorkRecord function not available');
            throw new Error('Mentési funkció nem elérhető');
        }
        
        // Helyi tárolás törlése
        localStorage.removeItem('inProgressEntry');
        inProgressEntry = null;
        
        // UI frissítése
        if (typeof renderApp === 'function') {
            renderApp();
        }
        if (typeof showTab === 'function') {
            showTab('live');
        }
        
        showCustomAlert(i18n.alertSaveSuccess || 'Munkanap sikeresen befejezve!', 'success');
        
    } catch (error) {
        console.error('Finalize error:', error);
        showCustomAlert('Hiba történt a befejezés során: ' + error.message, 'info');
        
        // Modal bezárása hiba esetén is
        closeFinalizeModal();
    }
}

// ===== GLOBÁLIS HOZZÁFÉRÉS BIZTOSÍTÁSA =====
window.showFinalizationModal = showFinalizationModal;
window.handleModalBackdropClick = handleModalBackdropClick;
window.closeFinalizeModal = closeFinalizeModal;
window.completeFinalizeShift = completeFinalizeShift;

// ===== KEYBOARD EVENTS =====
document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('finalize-modal');
    if (modal && !modal.classList.contains('hidden')) {
        if (e.key === 'Escape') {
            closeFinalizeModal();
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            completeFinalizeShift();
        }
    }
});

console.log('Finalization modal functions loaded and exported to window'); 
// ===== END: finalize_modal_complete =====