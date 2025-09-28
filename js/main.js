// =======================================================
// ===== MUNKAIDŐ NYILVANTARTÓ PRO - MAIN.JS (JAVÍTOTT) ====
// =======================================================

// ====== GLOBÁLIS ÁLLAPOT (STATE) ======
let records = [];
let palletRecords = [];
let editingId = null;
let inProgressEntry = JSON.parse(localStorage.getItem('activeShift') || 'null');
let uniqueLocations = [];
let uniquePalletLocations = [];
let currentActiveTab = 'live';

// ====== ALKALMAZÁS INDÍTÁSA ======
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadSettings();
    initializeFeatureToggles();
    initializePwaInstall();
    initializePalletSettings();
    initializeAuth();

    document.addEventListener('click', (event) => {
        const settingsContainer = document.querySelector('#app-header .relative');
        if (settingsContainer && !settingsContainer.contains(event.target)) {
            closeSettingsMenu();
        }
        if (!event.target.closest('.autocomplete-list')) {
            hideAutocomplete();
        }
    });

    setupEventListeners();
});

// ====== FŐ RENDERELŐ FUNKCIÓ ======
function renderApp() {
    inProgressEntry = JSON.parse(localStorage.getItem('activeShift') || 'null');
    
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

    if (tabName === 'full-day' && !editingId) { resetEntryForm(); loadLastValues(); }
    if (tabName === 'pallets') renderPalletRecords();
    if (tabName === 'report') { if (typeof initMonthlyReport === 'function') initMonthlyReport(); }
    if (tabName === 'list') renderRecords();
    if (tabName === 'summary') renderSummary();
    if (tabName === 'stats') { statsDate = new Date(); renderStats(); }
    if (tabName === 'tachograph') renderTachographAnalysis();
    if (tabName === 'help') renderHelp();

    document.querySelectorAll('[id^="content-"]').forEach(c => c.classList.add('hidden'));
    const targetContent = document.getElementById(`content-${tabName}`);
    if (targetContent) targetContent.classList.remove('hidden');

    if (typeof closeSettingsMenu === 'function') closeSettingsMenu();
    updateBottomNavigation(tabName);
    updateAllTexts();
}

function updateBottomNavigation(activeTab) {
    const mainTabs = ['live', 'start', 'full-day', 'list'];
    if (mainTabs.includes(activeTab)) {
        const activeNavItem = document.querySelector(`.nav-item[data-tab="${activeTab}"]`);
        if (activeNavItem) {
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            activeNavItem.classList.add('active');
        }
    } else {
        document.querySelectorAll('.nav-item:not(.more-button)').forEach(item => item.classList.remove('active'));
    }
}

function toggleSettingsMenu() {
    document.getElementById('settings-dropdown')?.classList.toggle('hidden');
}

function closeSettingsMenu() {
    document.getElementById('settings-dropdown')?.classList.add('hidden');
}

// ====== SEGÉDFÜGGVÉNYEK ======
function getSortedRecords() { return [...(records || [])].sort((a, b) => new Date(`${b.date}T${b.startTime}`) - new Date(`${a.date}T${a.startTime}`)); }
function getLatestRecord() { if (!records || records.length === 0) return null; return getSortedRecords()[0]; }
function updateUniqueLocations() { const locations = new Set(records.flatMap(r => [r.startLocation, r.endLocation])); uniqueLocations = Array.from(locations).filter(Boolean).sort(); }
function updateUniquePalletLocations() { const locations = new Set(palletRecords.map(r => r.location)); uniquePalletLocations = Array.from(locations).filter(Boolean).sort(); }

function updateDisplays() {
    const i18n = translations[currentLang];
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const workMinutes = calculateWorkMinutes(startTime, endTime);
    const nightMinutes = calculateNightWorkMinutes(startTime, endTime);
    const driveStart = document.getElementById('weeklyDriveStart').value;
    const driveEnd = document.getElementById('weeklyDriveEnd').value;
    const driveMinutes = Math.max(0, parseTimeToMinutes(driveEnd) - parseTimeToMinutes(driveStart));
    const kmStart = parseFloat(document.getElementById('kmStart').value) || 0;
    const kmEnd = parseFloat(document.getElementById('kmEnd').value) || 0;
    const kmDriven = Math.max(0, kmEnd - kmStart);

    document.getElementById('workTimeDisplay').textContent = workMinutes > 0 ? `${i18n.workTimeDisplay}: ${formatDuration(workMinutes)}` : '';
    document.getElementById('nightWorkDisplay').textContent = nightMinutes > 0 ? `${i18n.nightWorkDisplay}: ${formatDuration(nightMinutes)}` : '';
    document.getElementById('driveTimeDisplay').textContent = driveMinutes > 0 ? `${i18n.driveTimeTodayDisplay}: ${formatDuration(driveMinutes)}` : '';
    document.getElementById('kmDisplay').textContent = kmDriven > 0 ? `${i18n.kmDrivenDisplay}: ${kmDriven} km` : '';
}

async function runNightWorkRecalculation() {
    if (localStorage.getItem('nightWorkRecalculated_v20_05')) return;
    console.log(translations[currentLang].logRecalculatingNightWork);
    records.forEach(r => r.nightWorkMinutes = calculateNightWorkMinutes(r.startTime, r.endTime));
    if (currentUser) {
        const batch = db.batch();
        records.forEach(r => batch.update(db.collection('users').doc(currentUser.uid).collection('records').doc(String(r.id)), { nightWorkMinutes: r.nightWorkMinutes }));
        await batch.commit();
    } else {
        localStorage.setItem('workRecords', JSON.stringify(records));
    }
    localStorage.setItem('nightWorkRecalculated_v20_05', 'true');
}

function renderLiveTabView() {
    if (typeof renderTachoHelperCards === 'function') renderTachoHelperCards();
    renderDashboard();
}

function renderStartTab() {
    inProgressEntry = JSON.parse(localStorage.getItem('activeShift') || 'null');
    const startForm = document.getElementById('start-new-day-form');
    const progressView = document.getElementById('live-progress-view');

    if (inProgressEntry) {
        startForm.classList.add('hidden');
        progressView.classList.remove('hidden');
        // Részletesebb UI frissítés... (a korábbi kódból)
    } else {
        progressView.classList.add('hidden');
        startForm.classList.remove('hidden');
        loadLastValues(true);
        // Dátum és idő beállítása... (a korábbi kódból)
    }
}

function renderDashboard() { /* ... a korábbi kódból ... */ }
function setupEventListeners() { /* ... a korábbi kódból ... */ }
function loadLastValues(isForLiveTab = false) { /* ... a korábbi kódból ... */ }


// =======================================================
// ===== ÉLŐ MUNKANAP KEZELÉS (JAVÍTOTT VERZIÓ) =========
// =======================================================

async function showCustomPromptAsync(title, message, placeholder, iconHTML) {
    return new Promise(resolve => {
        const existingCallback = (value) => resolve(value);
        showCustomPrompt(title, message, placeholder, iconHTML, existingCallback);
        
        // A `hideCustomPrompt` módosítása, hogy a "Mégse" gomb is kezelve legyen
        const cancelButton = document.querySelector('#custom-prompt-buttons button:first-child');
        if (cancelButton) {
            cancelButton.onclick = () => {
                hideCustomPrompt(false);
                resolve(null); // Resolve with null when cancelled
            };
        }
        const confirmButton = document.querySelector('#custom-prompt-buttons button:last-child');
         if (confirmButton) {
            confirmButton.onclick = () => {
                const val = document.getElementById('custom-prompt-input').value;
                hideCustomPrompt(true);
                resolve(val); // a callback-et a hideCustomPrompt már nem hívja meg, ezért itt kell
            };
        }
    });
}

// Élő munkanap indítása - ÁTNEVEZETT FÜGGVÉNY
async function startLiveShift() {
    if (window.activeShift || JSON.parse(localStorage.getItem('activeShift') || 'null')) {
        showCustomAlert('Már van aktív műszak folyamatban!', 'info');
        return;
    }
    
    const date = document.getElementById('liveStartDate').value;
    const startTime = document.getElementById('liveStartTime').value;
    if (!date || !startTime) {
        showCustomAlert('A dátum és idő megadása kötelező!', 'info');
        return;
    }

    const location = document.getElementById('liveStartLocation').value.trim();
    const weeklyDriveStart = document.getElementById('liveWeeklyDriveStart').value;
    const kmStart = parseFloat(document.getElementById('liveStartKm').value) || 0;

    try {
        const shiftData = {
            date, startTime, startLocation: location, weeklyDriveStartStr: weeklyDriveStart, kmStart, crossings: [], id: String(Date.now())
        };
        
        localStorage.setItem('activeShift', JSON.stringify(shiftData));
        window.activeShift = shiftData;

        renderApp();
        showCustomAlert('Munkanap sikeresen elindítva!', 'success');
        
    } catch (error) {
        console.error('Hiba a munkanap indításakor:', error);
        showCustomAlert('Hiba történt a munkanap indításakor: ' + error.message, 'info');
    }
}

// Munkanap befejezése - ÁTNEVEZETT FÜGGVÉNY
async function finalizeLiveShift() {
    let activeShift = window.activeShift || JSON.parse(localStorage.getItem('activeShift') || 'null');
    if (!activeShift) {
        showCustomAlert('Nincs aktív műszak a befejezéshez!', 'info');
        return;
    }

    try {
        const weeklyDriveEnd = await showCustomPromptAsync('Műszak befejezése', 'Add meg a végső heti vezetési időt:', 'óó:pp', '🚛');
        if (weeklyDriveEnd === null) return; // Felhasználó megszakította

        const kmEndStr = await showCustomPromptAsync('Műszak befejezése', 'Add meg a záró kilométert:', '0', '📏');
        if (kmEndStr === null) return; // Felhasználó megszakította
        const kmEnd = parseFloat(kmEndStr) || 0;

        const now = new Date();
        const endTime = now.toTimeString().slice(0, 5);
        const endLocation = document.getElementById('liveCrossTo')?.value?.trim() || activeShift.startLocation || '';

        const finalRecord = {
            ...activeShift,
            endTime,
            endLocation,
            weeklyDriveEndStr: weeklyDriveEnd,
            kmEnd,
            kmDriven: Math.max(0, kmEnd - (activeShift.kmStart || 0)),
            workMinutes: calculateWorkMinutes(activeShift.startTime, endTime),
            driveMinutes: Math.max(0, parseTimeToMinutes(weeklyDriveEnd) - parseTimeToMinutes(activeShift.weeklyDriveStartStr || '00:00')),
            nightWorkMinutes: calculateNightWorkMinutes(activeShift.startTime, endTime),
            compensationMinutes: 0,
            isSplitRest: false
        };

        await saveWorkRecord(finalRecord);
        localStorage.removeItem('activeShift');
        window.activeShift = null;

        renderApp();
        showTab('list');
        showCustomAlert('Műszak sikeresen befejezve!', 'success');
        
    } catch (error) {
        console.error('Hiba a műszak befejezésekor:', error);
        showCustomAlert('Hiba történt a műszak befejezésekor: ' + error.message, 'info');
    }
}

// Munkanap megszakítása - ÁTNEVEZETT FÜGGVÉNY
function cancelLiveShift() {
    showCustomAlert(
        'Biztosan megszakítod a folyamatban lévő munkanapot? Az összes adat elvész!',
        'warning',
        () => {
            try {
                localStorage.removeItem('activeShift');
                window.activeShift = null;
                renderApp();
                showCustomAlert('Munkanap megszakítva!', 'info');
            } catch (error) {
                console.error('Hiba a munkanap megszakításakor:', error);
            }
        }
    );
}

// Élő határátlépés hozzáadása
function addLiveCrossing() {
    const from = document.getElementById('liveCrossFrom')?.value?.trim()?.toUpperCase() || '';
    const to = document.getElementById('liveCrossTo')?.value?.trim()?.toUpperCase() || '';
    const time = document.getElementById('liveCrossTime')?.value || '';

    if (!from || !to || !time) {
        showCustomAlert('Minden mező kitöltése kötelező!', 'info');
        return;
    }
    
    let activeShift = window.activeShift || JSON.parse(localStorage.getItem('activeShift') || 'null');
    if (activeShift) {
        if (!activeShift.crossings) activeShift.crossings = [];
        activeShift.crossings.push({ from, to, time });
        
        localStorage.setItem('activeShift', JSON.stringify(activeShift));
        if (window.activeShift) window.activeShift = activeShift;
        
        renderApp();
        
        document.getElementById('liveCrossFrom').value = to;
        document.getElementById('liveCrossTo').value = '';
        document.getElementById('liveCrossTime').value = new Date().toTimeString().slice(0, 5);
        
        showCustomAlert('Határátlépés hozzáadva!', 'success');
    } else {
        showCustomAlert('Nincs aktív műszak!', 'info');
    }
}

// =======================================================
// ===== GLOBÁLIS HOZZÁFÉRHETŐSÉG (JAVÍTOTT) ===========
// =======================================================
window.startLiveShift = startLiveShift;
window.finalizeLiveShift = finalizeLiveShift;
window.cancelLiveShift = cancelLiveShift;
window.addLiveCrossing = addLiveCrossing;