// =======================================================
// ===== ALKALMAZÁS FŐ VEZÉRLŐJE (main.js) ================
// =======================================================

// ====== GLOBÁLIS ÁLLAPOT (STATE) ======
let records = [];
let palletRecords = [];
let editingId = null;
let activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
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
        const dropdownContainer = document.getElementById('dropdown-container');
        if (dropdownContainer && !dropdownContainer.contains(event.target)) {
            closeDropdown();
        }
        if (!event.target.closest('.autocomplete-list')) {
            hideAutocomplete();
        }
    });

    setupEventListeners();
});

// ====== "ÉLŐ" MŰSZAK KEZELÉSE ======

/**
 * Elindít egy új munkanapot az "Indítás" fülről.
 */
function startLiveShift() {
    const date = document.getElementById('liveStartDate').value;
    const startTime = document.getElementById('liveStartTime').value;
    const startLocation = document.getElementById('liveStartLocation').value.trim();
    const weeklyDriveStartStr = document.getElementById('liveWeeklyDriveStart').value;
    const kmStart = parseFloat(document.getElementById('liveStartKm').value) || 0;

    if (!date || !startTime) {
        showCustomAlert('A dátum és az idő megadása kötelező!', 'info');
        return;
    }

    const newEntry = {
        date,
        startTime,
        startLocation,
        weeklyDriveStartStr,
        kmStart,
        crossings: []
    };

    activeShift = newEntry;
    localStorage.setItem('activeShift', JSON.stringify(activeShift));

    renderStartTab();
    renderLiveTabView();
}

/**
 * Hozzáad egy határátlépést a folyamatban lévő műszakhoz.
 */
function addLiveCrossing() {
    const from = document.getElementById('liveCrossFrom').value.trim().toUpperCase();
    const to = document.getElementById('liveCrossTo').value.trim().toUpperCase();
    const time = document.getElementById('liveCrossTime').value;

    if (!from || !to || !time) {
        showCustomAlert('Kérlek tölts ki minden mezőt a határátlépéshez!', 'info');
        return;
    }

    if (!activeShift) {
        showCustomAlert('Nincs aktív műszak, amihez hozzá lehetne adni a határátlépést.', 'info');
        return;
    }

    activeShift.crossings.push({ from, to, time });
    localStorage.setItem('activeShift', JSON.stringify(activeShift));
    renderStartTab();
}

/**
 * Előkészíti a műszak befejezését: átvált a "Teljes nap" fülre
 * és kitölti az űrlapot az aktív műszak adataival.
 */
function prepareFinalizeShift() {
    if (!activeShift) {
        showCustomAlert('Nincs aktív műszak a befejezéshez.', 'info');
        return;
    }

    showTab('full-day');

    document.getElementById('date').value = activeShift.date;
    document.getElementById('startTime').value = activeShift.startTime;
    document.getElementById('startLocation').value = activeShift.startLocation;
    document.getElementById('kmStart').value = activeShift.kmStart || '';
    document.getElementById('weeklyDriveStart').value = activeShift.weeklyDriveStartStr || '';

    const crossingsContainer = document.getElementById('crossingsContainer');
    crossingsContainer.innerHTML = '';
    if (activeShift.crossings && activeShift.crossings.length > 0) {
        activeShift.crossings.forEach(c => addCrossingRow(c.from, c.to, c.time));
    }

    activeShift = null;
    localStorage.removeItem('activeShift');

    const endTimeInput = document.getElementById('endTime');
    endTimeInput.value = new Date().toTimeString().slice(0, 5);
    endTimeInput.focus();
}

/**
 * Megszakítja és törli a folyamatban lévő munkanapot.
 */
function discardShift() {
    if (!activeShift) return;

    const i18n = translations[currentLang];
    showCustomAlert(`${i18n.discardWorkday}?`, 'warning', () => {
        activeShift = null;
        localStorage.removeItem('activeShift');
        renderStartTab();
        renderLiveTabView();
    });
}


/**
 * Alaphelyzetbe állítja a "Teljes nap" fülön található űrlapot egy új bejegyzéshez.
 */
function resetEntryForm() {
    editingId = null;
    
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('compensationTime').value = '';
    document.getElementById('startLocation').value = '';
    document.getElementById('endLocation').value = '';
    document.getElementById('weeklyDriveStart').value = '';
    document.getElementById('weeklyDriveEnd').value = '';
    document.getElementById('kmStart').value = '';
    document.getElementById('kmEnd').value = '';
    document.getElementById('crossingsContainer').innerHTML = '';

    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        splitRestToggle.checked = false;
        if (typeof updateEnhancedToggleVisuals === 'function') {
            updateEnhancedToggleVisuals(splitRestToggle);
        }
    }
    updateDisplays();
}

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
        renderPalletRecords();
    }
    if (tabName === 'report') { if (typeof initMonthlyReport === 'function') { initMonthlyReport(); } }
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
        renderWeeklyAllowance(); // Ez az új sor a frissítéshez
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
    updateAllTexts();
}

function toggleDropdown() { document.getElementById('dropdown-menu').classList.toggle('hidden'); }
function closeDropdown() { document.getElementById('dropdown-menu').classList.add('hidden'); }


// ====== SEGÉDFÜGGVÉNYEK ======
function getSortedRecords() {
    return [...(records || [])].sort((a, b) => new Date(`${b.date}T${b.startTime}`) - new Date(`${a.date}T${a.startTime}`));
}

function getLatestRecord() {
    if (!records || records.length === 0) return null;
    return getSortedRecords()[0];
}

/**
 * Betölti az utolsó bejegyzés záró adatait az új bejegyzés űrlapjába.
 * @param {boolean} isLive - Ha true, az 'Indítás' fül mezőit tölti ki.
 */
function loadLastValues(isLive = false) {
    const latestRecord = getLatestRecord();
    if (!latestRecord) return;

    if (isLive) {
        const now = new Date();
        document.getElementById('liveStartDate').value = now.toISOString().split('T')[0];
        document.getElementById('liveStartTime').value = now.toTimeString().slice(0, 5);
        if (latestRecord.endLocation) {
            document.getElementById('liveStartLocation').value = latestRecord.endLocation;
        }
        if (latestRecord.kmEnd) {
            document.getElementById('liveStartKm').value = latestRecord.kmEnd;
        }
        if (latestRecord.weeklyDriveEnd) {
            document.getElementById('liveWeeklyDriveStart').value = latestRecord.weeklyDriveEnd;
        }
    } else {
        if (latestRecord.endLocation) {
            document.getElementById('startLocation').value = latestRecord.endLocation;
        }
        if (latestRecord.kmEnd) {
            document.getElementById('kmStart').value = latestRecord.kmEnd;
        }
        if (latestRecord.weeklyDriveEnd) {
            document.getElementById('weeklyDriveStart').value = latestRecord.weeklyDriveEnd;
        }
    }
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
    renderWeeklyAllowance();
    renderTachoHelperCards();
    renderDashboard();
}

function renderStartTab() {
    const i18n = translations[currentLang];
    activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');

    const startForm = document.getElementById('start-new-day-form');
    const progressView = document.getElementById('live-progress-view');
    const summaryContainer = document.getElementById('live-start-summary');

    if (activeShift) {
        startForm.classList.add('hidden');
        progressView.classList.remove('hidden');

        document.getElementById('live-start-time').textContent = `${i18n.startedAt}: ${activeShift.date} ${activeShift.startTime}`;
        let summaryHTML = '';
        const hasDriveData = localStorage.getItem('toggleDriveTime') === 'true' && activeShift.weeklyDriveStartStr;
        const hasKmData = localStorage.getItem('toggleKm') === 'true' && activeShift.kmStart > 0;
        const hasLocationData = activeShift.startLocation && activeShift.startLocation.trim() !== '';

        if (hasDriveData || hasKmData || hasLocationData) {
            summaryHTML += `<div class="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg space-y-2">
                                <h3 class="font-semibold text-gray-800 dark:text-gray-100">${i18n.liveShiftDetailsTitle}</h3>
                                <div class="space-y-1 text-sm">`;

            if (hasLocationData) {
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartLocationLabel}</span>
                                    <span class="font-semibold">${activeShift.startLocation}</span>
                                </div>`;
            }
            if (hasDriveData) {
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartDriveLabel}</span>
                                    <span class="font-semibold">${activeShift.weeklyDriveStartStr}</span>
                                </div>`;
            }
            if (hasKmData) {
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartKmLabel}</span>
                                    <span class="font-semibold">${activeShift.kmStart} km</span>
                                </div>`;
            }
            summaryHTML += `</div></div>`;
        }
        summaryContainer.innerHTML = summaryHTML;

        const liveCrossList = document.getElementById('live-crossings-list');
        const liveCrossFrom = document.getElementById('liveCrossFrom');
        if (activeShift.crossings && activeShift.crossings.length > 0) {
            const crossingsHTML = activeShift.crossings.map(c =>
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
            liveCrossFrom.value = activeShift.crossings.slice(-1)[0].to;
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

// JAVÍTOTT FUNKCIÓ
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
