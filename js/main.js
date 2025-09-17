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


// ===== BEGIN: proper_finalize_modal (appended) =====
// ===== JAVÍTOTT BEFEJEZÉSI MODAL - PROGRAM ARCULATÁHOZ ILLESZKEDŐ =====

function showFinalizationModal() {
    const i18n = translations[currentLang];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // A program arculatához illeszkedő modal HTML
    const modalHTML = `
        <div id="finalize-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300" onclick="handleModalBackdropClick(event)">
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto transform transition-transform duration-300 scale-95">
                
                <!-- Fejléc ikon és cím -->
                <div class="text-center mb-6">
                    <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        <svg class="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100">Műszak befejezése</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">Add meg a befejezési adatokat</p>
                </div>
                
                <!-- Űrlap -->
                <div class="space-y-4">
                    
                    <!-- Befejezés ideje -->
                    <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            ⏰ Befejezés ideje
                        </label>
                        <input type="time" id="finalizeEndTime" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value="${currentTime}">
                    </div>
                    
                    <!-- Befejezés helye GPS-szel -->
                    <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            📍 Befejezés helye
                        </label>
                        <div class="flex">
                            <input type="text" id="finalizeEndLocation" class="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Város" data-translate-key="cityPlaceholder">
                            <button type="button" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-r-lg border border-blue-500 transition-colors" onclick="fetchLocation('finalizeEndLocation')" title="Helyszín lekérése GPS alapján">
                                📍
                            </button>
                        </div>
                    </div>
                    
                    ${localStorage.getItem('toggleDriveTime') === 'true' ? `
                    <!-- Heti vezetés vége -->
                    <div class="bg-indigo-50 dark:bg-indigo-900/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">
                            🚗 Heti vezetés vége
                        </label>
                        <input type="text" id="finalizeWeeklyDriveEnd" class="w-full p-3 border border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-indigo-800/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="óó:pp" onblur="formatTimeInput(this, true)">
                    </div>
                    ` : ''}
                    
                    ${localStorage.getItem('toggleKm') === 'true' ? `
                    <!-- Záró km -->
                    <div class="bg-orange-50 dark:bg-orange-900/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">
                            📏 Záró km
                        </label>
                        <input type="number" id="finalizeKmEnd" class="w-full p-3 border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-orange-800/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="0">
                    </div>
                    ` : ''}
                    
                </div>
                
                <!-- Gombok -->
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
        modal.classList.remove('opacity-0');
        box.classList.remove('scale-95');
        box.classList.add('scale-100');
    }, 10);
    
    // Értékek előtöltése
    setTimeout(() => {
        const endLocationInput = document.getElementById('finalizeEndLocation');
        const weeklyDriveInput = document.getElementById('finalizeWeeklyDriveEnd');
        const kmEndInput = document.getElementById('finalizeKmEnd');
        
        // GPS hely előtöltése utolsó határátlépésből
        if (endLocationInput && inProgressEntry.crossings && inProgressEntry.crossings.length > 0) {
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
        initAutocomplete(endLocationInput, uniqueLocations);
        
    }, 100);
}

function handleModalBackdropClick(event) {
    // Modal csak akkor záródjon be, ha pontosan a háttérre kattintunk
    if (event.target.id === 'finalize-modal') {
        closeFinalizeModal();
    }
}

function closeFinalizeModal() {
    const modal = document.getElementById('finalize-modal');
    if (modal) {
        const box = modal.querySelector('div > div');
        
        // Animáció
        modal.classList.add('opacity-0');
        box.classList.remove('scale-100');
        box.classList.add('scale-95');
        
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
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
        await saveWorkRecord(completedRecord);
        
        // Helyi tárolás törlése
        localStorage.removeItem('inProgressEntry');
        inProgressEntry = null;
        
        // UI frissítése
        renderApp();
        showTab('live');
        
        showCustomAlert(i18n.alertSaveSuccess || 'Munkanap sikeresen befejezve!', 'success');
        
    } catch (error) {
        console.error('Finalize error:', error);
        showCustomAlert('Hiba történt a befejezés során: ' + error.message, 'info');
    }
}
// ===== END: proper_finalize_modal =====

// ===== BEGIN: modal_integration_fix (appended) =====
// ===== MODAL INTEGRÁCIÓ JAVÍTÁSA - Add a main.js végéhez =====

// Globális funkciók exportálása
window.showFinalizationModal = showFinalizationModal;
window.handleModalBackdropClick = handleModalBackdropClick;
window.closeFinalizeModal = closeFinalizeModal;
window.completeFinalizeShift = completeFinalizeShift;

// Enhanced toggle kezelés javítása minden toggle-ra - PATCH
function updateEnhancedToggleVisuals(checkbox) {
    if (!checkbox) return;
    
    const container = checkbox.closest('.enhanced-toggle-container');
    if (!container) return;
    
    const checkmark = container.querySelector('.enhanced-toggle-checkmark');
    
    if (checkbox.checked) {
        // Aktív állapot
        container.classList.add('active');
        if (checkmark) {
            checkmark.classList.remove('hidden');
        }
    } else {
        // Inaktív állapot
        container.classList.remove('active');
        if (checkmark) {
            checkmark.classList.add('hidden');
        }
    }
}

// Javított formatDuration függvény HH:MM formátumhoz
function formatDurationHHMM(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Javított formatDuration - PDF-hez is használható
function formatDuration(minutes) {
    if (typeof minutes !== 'number' || minutes < 0) return '0ó 0p';
    
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    
    // Ha HH:MM formátumra van szükség (pl. PDF esetén)
    if (window.isPDFGeneration) {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    }
    
    const h_unit = currentLang === 'de' ? 'Std' : 'ó';
    const m_unit = currentLang === 'de' ? 'Min' : 'p';
    return `${h}${h_unit} ${m}${m_unit}`;
}

// PDF specifikus formatDuration
function formatDurationForPDF(minutes) {
    if (typeof minutes !== 'number' || minutes < 0) return '00:00';
    
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Frissített loadLastValues függvény
function loadLastValues(isLiveMode = false) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (isLiveMode) {
        // Live mód esetén
        const dateInput = document.getElementById('liveStartDate');
        const timeInput = document.getElementById('liveStartTime');
        const locationInput = document.getElementById('liveStartLocation');
        const driveInput = document.getElementById('liveWeeklyDriveStart');
        const kmInput = document.getElementById('liveStartKm');
        
        if (dateInput && !dateInput.value) {
            dateInput.value = today;
        }
        if (timeInput && !timeInput.value) {
            timeInput.value = currentTime;
        }
        
        // Utolsó bejegyzés adatainak betöltése
        const lastRecord = getLatestRecord();
        if (lastRecord) {
            if (locationInput && !locationInput.value && lastRecord.endLocation) {
                locationInput.value = lastRecord.endLocation;
            }
            if (driveInput && !driveInput.value && lastRecord.weeklyDriveEndStr) {
                driveInput.value = lastRecord.weeklyDriveEndStr;
            }
            if (kmInput && !kmInput.value && lastRecord.kmEnd) {
                kmInput.value = lastRecord.kmEnd;
            }
        }
    } else {
        // Teljes nap mód esetén
        const dateInput = document.getElementById('date');
        if (dateInput && !dateInput.value) {
            dateInput.value = today;
        }
        
        const lastRecord = getLatestRecord();
        if (lastRecord) {
            const startLocationInput = document.getElementById('startLocation');
            const driveStartInput = document.getElementById('weeklyDriveStart');
            const kmStartInput = document.getElementById('kmStart');
            
            if (startLocationInput && !startLocationInput.value && lastRecord.endLocation) {
                startLocationInput.value = lastRecord.endLocation;
            }
            if (driveStartInput && !driveStartInput.value && lastRecord.weeklyDriveEndStr) {
                driveStartInput.value = lastRecord.weeklyDriveEndStr;
            }
            if (kmStartInput && !kmStartInput.value && lastRecord.kmEnd) {
                kmStartInput.value = lastRecord.kmEnd;
            }
        }
    }
}

// Keyboard event handlers a modalhoz
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

// Input validáció javítása
function validateFinalizationInputs() {
    const endTime = document.getElementById('finalizeEndTime');
    const endLocation = document.getElementById('finalizeEndLocation');
    
    let isValid = true;
    
    // Idő ellenőrzése
    if (endTime && !endTime.value) {
        endTime.classList.add('border-red-500');
        isValid = false;
    } else if (endTime) {
        endTime.classList.remove('border-red-500');
    }
    
    // Hely ellenőrzése (opcionális, de ha van, ne legyen túl rövid)
    if (endLocation && endLocation.value.length > 0 && endLocation.value.length < 2) {
        endLocation.classList.add('border-yellow-500');
    } else if (endLocation) {
        endLocation.classList.remove('border-yellow-500');
    }
    
    return isValid;
}

// Real-time validáció hozzáadása
document.addEventListener('input', function(e) {
    if (e.target.id === 'finalizeEndTime' || e.target.id === 'finalizeEndLocation') {
        validateFinalizationInputs();
    }
});

// Hibakezelés javítása
window.addEventListener('error', function(e) {
    console.error('Global error:', e.error);
    
    // Ha modal nyitva van és hiba történik, zárjuk be
    const modal = document.getElementById('finalize-modal');
    if (modal) {
        closeFinalizeModal();
        showCustomAlert('Váratlan hiba történt. Próbáld újra!', 'info');
    }
});

// Enhanced toggle inicializálás minden esetben
document.addEventListener('DOMContentLoaded', function() {
    // Minden enhanced toggle inicializálása
    document.querySelectorAll('.enhanced-toggle-container').forEach(container => {
        const checkbox = container.querySelector('input[type="checkbox"]');
        if (checkbox) {
            updateEnhancedToggleVisuals(checkbox);
            
            // Event listener hozzáadása ha még nincs
            if (!checkbox.hasEnhancedListener) {
                checkbox.addEventListener('change', function() {
                    updateEnhancedToggleVisuals(this);
                });
                checkbox.hasEnhancedListener = true;
            }
        }
    });
});

// Export functions
window.formatDurationForPDF = formatDurationForPDF;
window.formatDurationHHMM = formatDurationHHMM;
window.validateFinalizationInputs = validateFinalizationInputs;
// ===== END: modal_integration_fix =====

// ===== BEGIN: finalizeShift glue override =====
(function(){
  try {
    const originalFinalize = window.finalizeShift;
    window.finalizeShift = function() {
      if (typeof showFinalizationModal === 'function') {
        try { showFinalizationModal(); return; } catch(e) { console.warn('showFinalizationModal failed, falling back:', e); }
      }
      if (typeof originalFinalize === 'function') {
        return originalFinalize.apply(this, arguments);
      }
    };
    document.addEventListener('DOMContentLoaded', function(){
      var btn = document.getElementById('finishShiftBtn');
      if (btn && !btn.__modalBound) {
        btn.onclick = function(){ window.finalizeShift(); };
        btn.__modalBound = true;
      }
    });
  } catch(e){ console.warn('finalize glue error', e); }
})();
// ===== END: finalizeShift glue override =====

// ===== BEGIN: hide settings version in settings menu =====
document.addEventListener('DOMContentLoaded', function(){
  try {
    document.querySelectorAll('[data-translate-key="settingsVersion"]').forEach(function(el){
      var blk = el.closest('.bg-gray-50, .bg-blue-50, .bg-white, .rounded-lg');
      if (blk) { blk.remove(); } else { el.remove(); }
    });
  } catch(e){ /* noop */ }
});
// ===== END: hide settings version in settings menu =====
