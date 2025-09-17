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


// ===== BEGIN: main_js_additions (appended) =====
// ===== ADD EZEKET A main.js FÁJL VÉGÉHEZ =====

// Hiányzó alapértelmezett értékek betöltése
function loadLastValues(isLiveMode = false) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (isLiveMode) {
        // Live mód esetén
        if (!document.getElementById('liveStartDate').value) {
            document.getElementById('liveStartDate').value = today;
        }
        if (!document.getElementById('liveStartTime').value) {
            document.getElementById('liveStartTime').value = currentTime;
        }
        
        // Utolsó bejegyzés adatainak betöltése
        const lastRecord = getLatestRecord();
        if (lastRecord) {
            if (!document.getElementById('liveStartLocation').value && lastRecord.endLocation) {
                document.getElementById('liveStartLocation').value = lastRecord.endLocation;
            }
            if (!document.getElementById('liveWeeklyDriveStart').value && lastRecord.weeklyDriveEndStr) {
                document.getElementById('liveWeeklyDriveStart').value = lastRecord.weeklyDriveEndStr;
            }
            if (!document.getElementById('liveStartKm').value && lastRecord.kmEnd) {
                document.getElementById('liveStartKm').value = lastRecord.kmEnd;
            }
        }
    } else {
        // Teljes nap mód esetén
        if (!document.getElementById('date').value) {
            document.getElementById('date').value = today;
        }
        
        const lastRecord = getLatestRecord();
        if (lastRecord) {
            if (!document.getElementById('startLocation').value && lastRecord.endLocation) {
                document.getElementById('startLocation').value = lastRecord.endLocation;
            }
            if (!document.getElementById('weeklyDriveStart').value && lastRecord.weeklyDriveEndStr) {
                document.getElementById('weeklyDriveStart').value = lastRecord.weeklyDriveEndStr;
            }
            if (!document.getElementById('kmStart').value && lastRecord.kmEnd) {
                document.getElementById('kmStart').value = lastRecord.kmEnd;
            }
        }
    }
}

// Űrlap visszaállítása
function resetEntryForm() {
    editingId = null;
    
    // Alapértékek
    document.getElementById('date').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('startLocation').value = '';
    document.getElementById('endLocation').value = '';
    document.getElementById('weeklyDriveStart').value = '';
    document.getElementById('weeklyDriveEnd').value = '';
    document.getElementById('kmStart').value = '';
    document.getElementById('kmEnd').value = '';
    document.getElementById('compensationTime').value = '';
    
    // Határátlépések törlése
    document.getElementById('crossingsContainer').innerHTML = '';
    
    // Osztott pihenő checkbox
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        splitRestToggle.checked = false;
        updateEnhancedToggleVisuals(splitRestToggle);
    }
}

// Teljes nap munkanap mentése - JAVÍTOTT
async function saveEntry() {
    const i18n = translations[currentLang];
    
    try {
        const date = document.getElementById('date').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        const startLocation = document.getElementById('startLocation').value.trim();
        const endLocation = document.getElementById('endLocation').value.trim();
        const weeklyDriveStart = document.getElementById('weeklyDriveStart').value;
        const weeklyDriveEnd = document.getElementById('weeklyDriveEnd').value;
        const kmStart = parseFloat(document.getElementById('kmStart').value) || 0;
        const kmEnd = parseFloat(document.getElementById('kmEnd').value) || 0;
        const compensationTime = document.getElementById('compensationTime').value;
        const splitRestToggle = document.getElementById('toggleSplitRest');
        const isSplitRest = splitRestToggle ? splitRestToggle.checked : false;

        // Validáció
        if (!date || !startTime || !endTime) {
            showCustomAlert(i18n.alertMandatoryFields, 'info');
            return;
        }

        if (localStorage.getItem('toggleKm') === 'true' && kmEnd < kmStart) {
            showCustomAlert(i18n.alertKmEndLower, 'info');
            return;
        }

        if (localStorage.getItem('toggleDriveTime') === 'true' && weeklyDriveStart && weeklyDriveEnd) {
            const startMinutes = parseTimeToMinutes(weeklyDriveStart);
            const endMinutes = parseTimeToMinutes(weeklyDriveEnd);
            if (endMinutes < startMinutes) {
                showCustomAlert(i18n.alertWeeklyDriveEndLower, 'info');
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

        // Nulla értékek ellenőrzése
        if ((driveMinutes === 0 || kmDriven === 0) && !editingId) {
            const confirmed = await new Promise(resolve => {
                showCustomAlert(i18n.alertConfirmZeroValues, 'warning', () => resolve(true));
            });
            if (!confirmed) return;
        }

        // Határátlépések összegyűjtése
        const crossings = [];
        document.querySelectorAll('#crossingsContainer .crossing-row').forEach(row => {
            const from = row.querySelector('.crossing-from').value.trim().toUpperCase();
            const to = row.querySelector('.crossing-to').value.trim().toUpperCase();
            const time = row.querySelector('.crossing-time').value;
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
        
        const isRollover = startDate.getDay() === 0 && endTimeDate.getDay() === 1; // Vasárnap -> Hétfő
        
        if (isRollover && driveMinutes > 0) {
            // Rollover esetén kérjük be a teljes vezetési időt
            const totalDriveTime = await new Promise(resolve => {
                const icon = `<svg class="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                showCustomPrompt(
                    i18n.alertRolloverTitle,
                    i18n.alertRolloverPrompt,
                    i18n.alertRolloverPlaceholder,
                    icon,
                    (input) => {
                        const minutes = parseTimeToMinutes(input);
                        resolve(minutes > 0 ? minutes : driveMinutes);
                    }
                );
            });
            driveMinutes = totalDriveTime;
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
            driveMinutes,
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
        
        showCustomAlert(i18n.alertSaveSuccess, 'success');

    } catch (error) {
        console.error('Save error:', error);
        showCustomAlert('Hiba történt a mentés során: ' + error.message, 'info');
    }
}

// Határátlépés sor hozzáadása
function addCrossingRow(from = '', to = '', time = '') {
    const container = document.getElementById('crossingsContainer');
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

// Határátlépés sor törlése
function removeCrossingRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
}

// Globális funkcióvá tétel
window.startLiveShift = startLiveShift;
window.addLiveCrossing = addLiveCrossing;
window.finalizeShift = finalizeShift;
window.discardShift = discardShift;
window.saveEntry = saveEntry;
window.addCrossingRow = addCrossingRow;
window.removeCrossingRow = removeCrossingRow;
window.generateMonthlyReport = generateMonthlyReport;
window.exportToPDF = exportToPDF;
window.sharePDF = sharePDF;
window.initMonthlyReport = initMonthlyReport;
// ===== END: main_js_additions =====

// ===== BEGIN: fixed_workday_integration (appended) =====
// ===== MUNKANAP BEFEJEZÉSI LOGIKA JAVÍTÁSA =====
// Ezt add hozzá a js/main.js fájl végéhez vagy a workday.js után:

// Élő munkanap indítása
async function startLiveShift() {
    const i18n = translations[currentLang];
    
    const date = document.getElementById('liveStartDate').value;
    const time = document.getElementById('liveStartTime').value;
    const location = document.getElementById('liveStartLocation').value.trim();
    const weeklyDriveStart = document.getElementById('liveWeeklyDriveStart').value;
    const kmStart = parseFloat(document.getElementById('liveStartKm').value) || 0;
    
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

// Élő határátlépés hozzáadása
function addLiveCrossing() {
    const from = document.getElementById('liveCrossFrom').value.trim().toUpperCase();
    const to = document.getElementById('liveCrossTo').value.trim().toUpperCase();
    const time = document.getElementById('liveCrossTime').value;
    
    if (!from || !to || !time) {
        showCustomAlert('Kérlek töltsd ki az összes mezőt!', 'info');
        return;
    }
    
    if (!inProgressEntry) {
        showCustomAlert('Nincs aktív munkanap!', 'info');
        return;
    }
    
    // Crossing hozzáadása
    inProgressEntry.crossings.push({ from, to, time });
    localStorage.setItem('inProgressEntry', JSON.stringify(inProgressEntry));
    
    // UI frissítése
    renderStartTab();
    
    showCustomAlert('Határátlépés hozzáadva!', 'success');
}

// Műszak befejezése - JAVÍTOTT
async function finalizeShift() {
    const i18n = translations[currentLang];
    
    if (!inProgressEntry) {
        showCustomAlert('Nincs aktív munkanap a befejezéshez!', 'info');
        return;
    }
    
    // Modal megnyitása a befejezési adatok bekéréséhez
    showFinalizationModal();
}

function showFinalizationModal() {
    const i18n = translations[currentLang];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Modal HTML létrehozása
    const modalHTML = `
        <div id="finalize-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto">
                <h3 class="text-xl font-bold mb-4 text-center">Műszak befejezése</h3>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium mb-1">Befejezés ideje</label>
                        <input type="time" id="finalizeEndTime" class="w-full p-2 border rounded-lg" value="${currentTime}">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-1">Befejezés helye</label>
                        <input type="text" id="finalizeEndLocation" class="w-full p-2 border rounded-lg" placeholder="Város">
                    </div>
                    
                    ${localStorage.getItem('toggleDriveTime') === 'true' ? `
                    <div>
                        <label class="block text-sm font-medium mb-1">Heti vezetés vége</label>
                        <input type="text" id="finalizeWeeklyDriveEnd" class="w-full p-2 border rounded-lg" placeholder="óó:pp">
                    </div>
                    ` : ''}
                    
                    ${localStorage.getItem('toggleKm') === 'true' ? `
                    <div>
                        <label class="block text-sm font-medium mb-1">Záró km</label>
                        <input type="number" id="finalizeKmEnd" class="w-full p-2 border rounded-lg" placeholder="0">
                    </div>
                    ` : ''}
                </div>
                
                <div class="flex gap-4 mt-6">
                    <button onclick="closeFinalizeModal()" class="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
                        Mégse
                    </button>
                    <button onclick="completeFinalizeShift()" class="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">
                        Befejezés
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Értékek előtöltése
    setTimeout(() => {
        const endLocationInput = document.getElementById('finalizeEndLocation');
        if (endLocationInput && inProgressEntry.crossings && inProgressEntry.crossings.length > 0) {
            // Ha van határátlépés, az utolsó "to" értékét használjuk
            endLocationInput.value = inProgressEntry.crossings[inProgressEntry.crossings.length - 1].to;
        }
    }, 100);
}

function closeFinalizeModal() {
    const modal = document.getElementById('finalize-modal');
    if (modal) modal.remove();
}

async function completeFinalizeShift() {
    const i18n = translations[currentLang];
    
    try {
        const endTime = document.getElementById('finalizeEndTime').value;
        const endLocation = document.getElementById('finalizeEndLocation').value.trim();
        const weeklyDriveEnd = document.getElementById('finalizeWeeklyDriveEnd')?.value || '';
        const kmEnd = parseFloat(document.getElementById('finalizeKmEnd')?.value) || 0;
        
        if (!endTime) {
            showCustomAlert('Befejezés ideje kötelező!', 'info');
            return;
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
        await saveWorkRecord(completedRecord);
        
        // Helyi tárolás törlése
        localStorage.removeItem('inProgressEntry');
        inProgressEntry = null;
        
        // Modal bezárása
        closeFinalizeModal();
        
        // UI frissítése
        renderApp();
        showTab('live');
        
        showCustomAlert(i18n.alertSaveSuccess || 'Munkanap sikeresen befejezve!', 'success');
        
    } catch (error) {
        console.error('Finalize error:', error);
        showCustomAlert('Hiba történt a befejezés során: ' + error.message, 'info');
    }
}

// Műszak elvetése
function discardShift() {
    showCustomAlert('Biztosan eldobod a folyamatban lévő munkanapot?', 'warning', () => {
        localStorage.removeItem('inProgressEntry');
        inProgressEntry = null;
        renderStartTab();
        showCustomAlert('Munkanap elvetve.', 'info');
    });
}

// 1:1 raklap gomb kezelése
function setupPallet11Button() {
    const btn = document.getElementById('pallet-1to1-btn');
    if (btn) {
        btn.onclick = () => {
            const givenInput = document.getElementById('palletGiven');
            const takenInput = document.getElementById('palletTaken');
            
            if (givenInput.value && !takenInput.value) {
                takenInput.value = givenInput.value;
            } else if (takenInput.value && !givenInput.value) {
                givenInput.value = takenInput.value;
            }
        };
    }
}

// Event listener hozzáadás amikor a DOM betöltődik
document.addEventListener('DOMContentLoaded', () => {
    setupPallet11Button();
});
// ===== END: fixed_workday_integration =====
