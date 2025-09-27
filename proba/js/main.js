// =======================================================
// ===== MUNKAIDŐ NYILVÁNTARTÓ PRO - MAIN.JS ============
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
        renderPalletRecords();
    }
    if (tabName === 'report') { 
        if (typeof initMonthlyReport === 'function') { 
            initMonthlyReport(); 
        } 
    }
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
    const targetContent = document.getElementById(`content-${tabName}`);
    if (targetContent) {
        targetContent.classList.remove('hidden');
    }
    
    closeDropdown();
    if (typeof closeSettingsMenu === 'function') {
        closeSettingsMenu();
    }

    updateAllTexts();
}

function toggleDropdown() { 
    const dropdownMenu = document.getElementById('dropdown-menu');
    if (dropdownMenu) {
        dropdownMenu.classList.toggle('hidden'); 
    }
}

function closeDropdown() { 
    const dropdownMenu = document.getElementById('dropdown-menu');
    if (dropdownMenu) {
        dropdownMenu.classList.add('hidden'); 
    }
}

function toggleSettingsMenu() {
    const settingsDropdown = document.getElementById('settings-dropdown');
    if (settingsDropdown) {
        settingsDropdown.classList.toggle('hidden');
    }
}

function closeSettingsMenu() {
    const settingsDropdown = document.getElementById('settings-dropdown');
    if (settingsDropdown) {
        settingsDropdown.classList.add('hidden');
    }
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
    const startTimeEl = document.getElementById('startTime');
    const endTimeEl = document.getElementById('endTime');
    const weeklyDriveStartEl = document.getElementById('weeklyDriveStart');
    const weeklyDriveEndEl = document.getElementById('weeklyDriveEnd');
    const kmStartEl = document.getElementById('kmStart');
    const kmEndEl = document.getElementById('kmEnd');
    
    if (!startTimeEl || !endTimeEl) return;
    
    const workMinutes = calculateWorkMinutes(startTimeEl.value, endTimeEl.value);
    const workTimeDisplay = document.getElementById('workTimeDisplay');
    if (workTimeDisplay) {
        workTimeDisplay.textContent = workMinutes > 0 ? `${i18n.workTimeDisplay}: ${formatDuration(workMinutes)}` : '';
    }
    
    const nightMinutes = calculateNightWorkMinutes(startTimeEl.value, endTimeEl.value);
    const nightWorkDisplay = document.getElementById('nightWorkDisplay');
    if (nightWorkDisplay) {
        nightWorkDisplay.textContent = nightMinutes > 0 ? `${i18n.nightWorkDisplay}: ${formatDuration(nightMinutes)}` : '';
    }
    
    if (weeklyDriveStartEl && weeklyDriveEndEl) {
        const driveMinutes = Math.max(0, parseTimeToMinutes(weeklyDriveEndEl.value) - parseTimeToMinutes(weeklyDriveStartEl.value));
        const driveTimeDisplay = document.getElementById('driveTimeDisplay');
        if (driveTimeDisplay) {
            driveTimeDisplay.textContent = driveMinutes > 0 ? `${i18n.driveTimeTodayDisplay}: ${formatDuration(driveMinutes)}` : '';
        }
    }
    
    if (kmStartEl && kmEndEl) {
        const kmDriven = Math.max(0, (parseFloat(kmEndEl.value) || 0) - (parseFloat(kmStartEl.value) || 0));
        const kmDisplay = document.getElementById('kmDisplay');
        if (kmDisplay) {
            kmDisplay.textContent = kmDriven > 0 ? `${i18n.kmDrivenDisplay}: ${kmDriven} km` : '';
        }
    }
}

async function runNightWorkRecalculation() {
    if (localStorage.getItem('nightWorkRecalculated_v20_05')) { 
        return; 
    }
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

    if (!startForm || !progressView) return;

    if (inProgressEntry) {
        startForm.classList.add('hidden');
        progressView.classList.remove('hidden');

        const liveStartTime = document.getElementById('live-start-time');
        if (liveStartTime) {
            liveStartTime.textContent = `${i18n.startedAt}: ${inProgressEntry.date} ${inProgressEntry.startTime}`;
        }
        
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
        
        if (summaryContainer) {
            summaryContainer.innerHTML = summaryHTML;
        }
        
        const liveCrossList = document.getElementById('live-crossings-list');
        const liveCrossFrom = document.getElementById('liveCrossFrom');
        
        if (liveCrossList && liveCrossFrom) {
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
        }
        
        const liveCrossTo = document.getElementById('liveCrossTo');
        const liveCrossTime = document.getElementById('liveCrossTime');
        if (liveCrossTo && liveCrossTime) {
            liveCrossTo.value = '';
            liveCrossTime.value = new Date().toTimeString().slice(0, 5);
        }

    } else {
        progressView.classList.add('hidden');
        startForm.classList.remove('hidden');
        if (summaryContainer) {
            summaryContainer.innerHTML = ''; 
        }
        
        // Csak akkor töltsd be az utolsó értékeket, ha már van korábbi bejegyzés
        if (records.length > 0) {
            loadLastValues(true);
        }
        
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
    const statsViewDaily = document.getElementById('stats-view-daily');
    const statsViewMonthly = document.getElementById('stats-view-monthly');
    const statsViewYearly = document.getElementById('stats-view-yearly');
    const statsPrev = document.getElementById('stats-prev');
    const statsNext = document.getElementById('stats-next');
    
    if (statsViewDaily) statsViewDaily.onclick = () => setStatsView('daily');
    if (statsViewMonthly) statsViewMonthly.onclick = () => setStatsView('monthly');
    if (statsViewYearly) statsViewYearly.onclick = () => setStatsView('yearly');
    if (statsPrev) statsPrev.onclick = () => navigateStats(-1);
    if (statsNext) statsNext.onclick = () => navigateStats(1);

    // Beállítások figyelése
    const autoExportSelector = document.getElementById('autoExportSelector');
    if (autoExportSelector) {
        autoExportSelector.addEventListener('change', (e) => {
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
}

// ====== LOADLASTVALUES FUNKCIÓ (EGYSZER DEFINIÁLVA) ======
function loadLastValues(isForLiveTab = false) {
    try {
        if (typeof getLatestRecord !== 'function') return;
        const last = getLatestRecord();
        if (!last) return;

        if (isForLiveTab) {
            // Az "Indítás" fül mezőinek feltöltése
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
        } else {
            // A "Teljes nap" fül mezőinek feltöltése
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

// ====== GLOBÁLIS HOZZÁFÉRHETŐSÉG BIZTOSÍTÁSA ======
window.renderApp = renderApp;
window.showTab = showTab;
window.toggleDropdown = toggleDropdown;
window.closeDropdown = closeDropdown;
window.toggleSettingsMenu = toggleSettingsMenu;
window.closeSettingsMenu = closeSettingsMenu;
window.updateDisplays = updateDisplays;
window.loadLastValues = loadLastValues;
window.getSortedRecords = getSortedRecords;
window.getLatestRecord = getLatestRecord;