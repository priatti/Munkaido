// =======================================================
// ===== MUNKAIDŐ NYILVÁNTARTÓ PRO - MAIN.JS (TELJES) ====
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
    // Alapfunkciók inicializálása
    initTheme();
    loadSettings();
    initializeFeatureToggles();
    initializePwaInstall();
    initializePalletSettings();
    initializeAuth();

    // Globális eseménykezelők beállítása
    document.addEventListener('click', (event) => {
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
    
    // Kezdeti állapot szinkronizálás
    setTimeout(() => {
        inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
        const storedActiveShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
        
        if (storedActiveShift && !window.activeShift) {
            window.activeShift = storedActiveShift;
        }
        
        // Ha van aktív műszak, frissítsük a UI-t
        if (inProgressEntry || window.activeShift) {
            console.log('Aktív műszak helyreállítva:', inProgressEntry || window.activeShift);
            renderApp();
        }
    }, 100);
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

// ====== NÉZETKEZELÉS (FÜLEK) - JAVÍTOTT ======
function showTab(tabName) {
    currentActiveTab = tabName;

    // Speciális logikák fülváltáskor
    if (tabName === 'full-day' && !editingId) {
        resetEntryForm();
        loadLastValues();
    }
    if (tabName === 'pallets') renderPalletRecords();
    if (tabName === 'report') { if (typeof initMonthlyReport === 'function') initMonthlyReport(); }
    if (tabName === 'list') renderRecords();
    if (tabName === 'summary') renderSummary();
    if (tabName === 'stats') {
        statsDate = new Date();
        renderStats();
    }
    if (tabName === 'tachograph') renderTachographAnalysis();
    if (tabName === 'help') renderHelp();

    // Tartalom cseréje
    document.querySelectorAll('[id^="content-"]').forEach(c => c.classList.add('hidden'));
    const targetContent = document.getElementById(`content-${tabName}`);
    if (targetContent) {
        targetContent.classList.remove('hidden');
    }

    // Beállítások menü bezárása, ha nyitva volt
    if (typeof closeSettingsMenu === 'function') {
        closeSettingsMenu();
    }

    // ÚJ: Alsó navigáció frissítése
    updateBottomNavigation(tabName);
    updateAllTexts();
}

// ÚJ: Alsó navigáció aktív gombjának frissítése
function updateBottomNavigation(activeTab) {
    const mainTabs = ['live', 'start', 'full-day', 'list'];

    // Ha a fül a fő navigációs sávon van
    if (mainTabs.includes(activeTab)) {
        const activeNavItem = document.querySelector(`.nav-item[data-tab="${activeTab}"]`);
        if (activeNavItem) {
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            activeNavItem.classList.add('active');
        }
    } else {
        // Ha a "Továbbiak" menüből lett kiválasztva, akkor egyik fő gomb sem aktív
        document.querySelectorAll('.nav-item:not(.more-button)').forEach(item => {
            item.classList.remove('active');
        });
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

// ====== ÉLŐ MUNKANAP FUNKCIÓK ======

// Élő munkanap indítása (JAVÍTOTT VERZIÓ)
async function startShift() {
    const i18n = translations[currentLang];
    const date = document.getElementById('liveStartDate').value;
    const startTime = document.getElementById('liveStartTime').value;
    const startLocation = document.getElementById('liveStartLocation').value.trim();
    const weeklyDriveStart = document.getElementById('liveWeeklyDriveStart').value;
    const startKm = parseFloat(document.getElementById('liveStartKm').value) || 0;

    if (!date || !startTime) {
        showCustomAlert('A dátum és az idő megadása kötelező!', 'info');
        return;
    }

    // Ellenőrizzük az előző munkanap végét a csökkentett pihenő figyelmeztetéshez
    const lastRecord = getLatestRecord();
    if (lastRecord && lastRecord.endTime) {
        const lastEnd = new Date(`${lastRecord.date}T${lastRecord.endTime}`);
        const currentStart = new Date(`${date}T${startTime}`);
        const restHours = (currentStart - lastEnd) / (1000 * 60 * 60);
        
        if (restHours < 11 && restHours >= 9) {
            const allowance = calculateWeeklyAllowance();
            if (allowance.remainingRests <= 0) {
                showCustomAlert('Nincs több csökkentett pihenőd! Legalább 11 óra pihenő szükséges.', 'info');
                return;
            }
            
            // Megerősítés kérése csökkentett pihenőhöz
            showCustomAlert(i18n.alertConfirmReducedRest, 'warning', () => {
                continueStartShift();
            });
            return;
        }
    }
    
    continueStartShift();
    
    function continueStartShift() {
        const newEntry = {
            id: String(Date.now()),
            date,
            startTime,
            endTime: '',
            startLocation,
            endLocation: '',
            crossings: [],
            weeklyDriveStartStr: weeklyDriveStart,
            weeklyDriveEndStr: '',
            kmStart: startKm,
            kmEnd: 0,
            workMinutes: 0,
            driveMinutes: 0,
            nightWorkMinutes: 0,
            kmDriven: 0
        };

        // Mentés a localStorage-ba "folyamatban" állapotként
        localStorage.setItem('inProgressEntry', JSON.stringify(newEntry));
        
        // Az új workday.js API használata
        if (typeof window.startShift === 'function') {
            window.startShift({
                startLocation,
                meta: {
                    weeklyDriveStart,
                    startKm,
                    originalEntry: newEntry
                }
            });
        }

        // UI frissítése
        inProgressEntry = newEntry;
        renderApp();
        showTab('start');
    }
}

// Határátlépés hozzáadása élő nap közben (TELJES ÚJRAÍRÁS)
function addLiveCrossing() {
    const i18n = translations[currentLang];
    const from = document.getElementById('liveCrossFrom').value.trim().toUpperCase();
    const to = document.getElementById('liveCrossTo').value.trim().toUpperCase();
    const time = document.getElementById('liveCrossTime').value;

    if (!from || !to || !time) {
        showCustomAlert(i18n.alertFillAllFields, 'info');
        return;
    }

    // Mindkét rendszerből megpróbáljuk betölteni az aktív műszakot
    let currentEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
    let activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');

    if (!currentEntry && !activeShift) {
        showCustomAlert('Nincs aktív munkanap!', 'info');
        return;
    }

    const newCrossing = { from, to, time };

    // Ha van inProgressEntry, azt frissítjük
    if (currentEntry) {
        if (!currentEntry.crossings) currentEntry.crossings = [];
        currentEntry.crossings.push(newCrossing);
        localStorage.setItem('inProgressEntry', JSON.stringify(currentEntry));
        inProgressEntry = currentEntry;
    }

    // Ha van activeShift, azt is frissítjük
    if (activeShift) {
        if (!activeShift.crossings) activeShift.crossings = [];
        activeShift.crossings.push(newCrossing);
        localStorage.setItem('activeShift', JSON.stringify(activeShift));
        if (window.activeShift) {
            window.activeShift.crossings = activeShift.crossings;
        }
    }

    // Broadcast frissítés más lapoknak
    if (typeof notify === 'function') {
        notify('crossing-added', newCrossing);
    }

    // UI frissítése
    renderStartTab();
    
    showCustomAlert('Határátlépés hozzáadva!', 'success');
}

// ====== EGYSÉGES MŰSZAK BEFEJEZŐ MODAL ======

// Műszak befejezése - most modal-lal
async function finalizeShift() {
    const i18n = translations[currentLang];
    
    // Ellenőrizzük a folyamatban lévő munkanapo(ka)t
    let currentEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
    let activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
    
    if (!currentEntry && !activeShift) {
        showCustomAlert('Nincs folyamatban lévő munkanap.', 'info');
        return;
    }

    // Modal megjelenítése az adatokkal
    showFinalizeModal(currentEntry || activeShift);
}

// Modal megjelenítő függvény
function showFinalizeModal(shift) {
    const modal = document.getElementById('finalize-shift-modal');
    const box = document.getElementById('finalize-shift-box');
    
    if (!modal || !box) {
        console.error('Finalize modal not found in HTML!');
        return;
    }

    // Adatok feltöltése
    populateFinalizeModal(shift);
    
    // Modal megjelenítése
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        box.classList.remove('scale-95');
    }, 10);

    // Automatikus számítás bekapcsolása
    setupFinalizeCalculations();
}

// Modal adatok feltöltése
function populateFinalizeModal(shift) {
    const now = new Date();
    const endTime = now.toTimeString().slice(0, 5);
    
    // Alapadatok
    document.getElementById('finalizeEndLocation').value = '';
    
    // Kezdő adatok megjelenítése
    document.getElementById('finalizeSummaryStart').textContent = 
        `${shift.startTime} (${shift.startLocation || 'N/A'})`;
    document.getElementById('finalizeSummaryEnd').textContent = 
        `${endTime} (--)`;

    // Heti vezetési idő szekció
    const weeklySection = document.getElementById('finalizeWeeklyDriveSection');
    const driveEnabled = localStorage.getItem('toggleDriveTime') === 'true';
    
    if (driveEnabled && shift.weeklyDriveStartStr) {
        weeklySection.classList.remove('hidden');
        document.getElementById('finalizeWeeklyStart').textContent = shift.weeklyDriveStartStr;
        document.getElementById('finalizeWeeklyEnd').value = shift.weeklyDriveStartStr;
        document.getElementById('finalizeSummaryDriveRow').style.display = 'flex';
    } else {
        weeklySection.classList.add('hidden');
        document.getElementById('finalizeSummaryDriveRow').style.display = 'none';
    }

    // Kilométer szekció
    const kmSection = document.getElementById('finalizeKmSection');
    const kmEnabled = localStorage.getItem('toggleKm') === 'true';
    
    if (kmEnabled && shift.kmStart > 0) {
        kmSection.classList.remove('hidden');
        document.getElementById('finalizeKmStart').textContent = shift.kmStart;
        document.getElementById('finalizeKmEnd').value = shift.kmStart;
        document.getElementById('finalizeSummaryKmRow').style.display = 'flex';
    } else {
        kmSection.classList.add('hidden');
        document.getElementById('finalizeSummaryKmRow').style.display = 'none';
    }

    // Kezdeti számítások
    updateFinalizeSummary();
}

// Valós idejű számítások beállítása
function setupFinalizeCalculations() {
    const endLocationInput = document.getElementById('finalizeEndLocation');
    const weeklyEndInput = document.getElementById('finalizeWeeklyEnd');
    const kmEndInput = document.getElementById('finalizeKmEnd');

    // Event listenerek hozzáadása
    [endLocationInput, weeklyEndInput, kmEndInput].forEach(input => {
        if (input) {
            input.addEventListener('input', updateFinalizeSummary);
            input.addEventListener('change', updateFinalizeSummary);
        }
    });
}

// Összefoglaló frissítése
function updateFinalizeSummary() {
    const shift = JSON.parse(localStorage.getItem('inProgressEntry') || 'null') || 
                  JSON.parse(localStorage.getItem('activeShift') || 'null');
    
    if (!shift) return;

    const now = new Date();
    const endTime = now.toTimeString().slice(0, 5);
    const endLocation = document.getElementById('finalizeEndLocation').value || '--';
    
    // Munkaidő számítás
    const workMinutes = calculateWorkMinutes(shift.startTime, endTime);
    const nightMinutes = calculateNightWorkMinutes(shift.startTime, endTime);
    
    // UI frissítése
    document.getElementById('finalizeSummaryEnd').textContent = `${endTime} (${endLocation})`;
    document.getElementById('finalizeSummaryWork').textContent = formatDuration(workMinutes);
    document.getElementById('finalizeSummaryNight').textContent = formatDuration(nightMinutes);

    // Vezetési idő számítás
    const weeklyEndInput = document.getElementById('finalizeWeeklyEnd');
    if (weeklyEndInput && !weeklyEndInput.classList.contains('hidden')) {
        const weeklyStart = parseTimeToMinutes(shift.weeklyDriveStartStr || '0:00');
        const weeklyEnd = parseTimeToMinutes(weeklyEndInput.value || '0:00');
        const driveMinutes = Math.max(0, weeklyEnd - weeklyStart);
        document.getElementById('finalizeSummaryDrive').textContent = formatDuration(driveMinutes);
    }

    // Kilométer számítás
    const kmEndInput = document.getElementById('finalizeKmEnd');
    if (kmEndInput && !kmEndInput.classList.contains('hidden')) {
        const kmStart = shift.kmStart || 0;
        const kmEnd = parseFloat(kmEndInput.value) || kmStart;
        const kmDriven = Math.max(0, kmEnd - kmStart);
        document.getElementById('finalizeSummaryKmDriven').textContent = `${kmDriven} km`;
    }
}

// GPS helymeghatározás a modal számára
async function fetchLocationForFinalize() {
    const locationInput = document.getElementById('finalizeEndLocation');
    
    if (!navigator.geolocation) {
        showCustomAlert(translations[currentLang].alertGeolocationNotSupported, 'info');
        return;
    }

    locationInput.value = "...";
    
    try {
        const position = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=${currentLang}`
        );
        
        if (!response.ok) throw new Error('API error');
        
        const data = await response.json();
        const location = data.address.city || data.address.town || data.address.village || 'Ismeretlen helység';
        
        locationInput.value = location;
        updateFinalizeSummary(); // Frissítjük az összefoglalót
        
    } catch (error) {
        locationInput.value = "";
        showCustomAlert(translations[currentLang].alertLocationFailed, 'info');
    }
}

// Modal bezárása
function hideFinalizeModal() {
    const modal = document.getElementById('finalize-shift-modal');
    const box = document.getElementById('finalize-shift-box');
    
    modal.classList.add('opacity-0');
    box.classList.add('scale-95');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }, 300);
}

// Végleges befejezés megerősítése
async function confirmFinalizeShift() {
    const i18n = translations[currentLang];
    
    try {
        // Adatok összegyűjtése
        const shift = JSON.parse(localStorage.getItem('inProgressEntry') || 'null') || 
                      JSON.parse(localStorage.getItem('activeShift') || 'null');
        
        if (!shift) {
            showCustomAlert('Hiba: Nincs aktív műszak!', 'info');
            return;
        }

        const now = new Date();
        const endTime = now.toTimeString().slice(0, 5);
        const endDate = now.toISOString().split('T')[0];
        const endLocation = document.getElementById('finalizeEndLocation').value.trim();

        // Validáció
        if (!endLocation) {
            showCustomAlert('Kérlek add meg a befejezés helyét!', 'info');
            return;
        }

        // Komplett rekord összeállítása
        const finalRecord = {
            id: shift.id || String(Date.now()),
            date: shift.date || endDate,
            startTime: shift.startTime,
            endTime: endTime,
            startLocation: shift.startLocation || '',
            endLocation: endLocation,
            crossings: shift.crossings || [],
            workMinutes: calculateWorkMinutes(shift.startTime, endTime),
            nightWorkMinutes: calculateNightWorkMinutes(shift.startTime, endTime),
            weeklyDriveStartStr: shift.weeklyDriveStartStr || '',
            weeklyDriveEndStr: '',
            driveMinutes: 0,
            kmStart: shift.kmStart || 0,
            kmEnd: 0,
            kmDriven: 0,
            isSplitRest: false
        };

        // Heti vezetési idő hozzáadása
        const weeklyEndInput = document.getElementById('finalizeWeeklyEnd');
        if (weeklyEndInput && !weeklyEndInput.closest('#finalizeWeeklyDriveSection').classList.contains('hidden')) {
            finalRecord.weeklyDriveEndStr = weeklyEndInput.value || finalRecord.weeklyDriveStartStr;
            finalRecord.driveMinutes = Math.max(0, 
                parseTimeToMinutes(finalRecord.weeklyDriveEndStr) - parseTimeToMinutes(finalRecord.weeklyDriveStartStr)
            );
        }

        // Kilométer hozzáadása
        const kmEndInput = document.getElementById('finalizeKmEnd');
        if (kmEndInput && !kmEndInput.closest('#finalizeKmSection').classList.contains('hidden')) {
            finalRecord.kmEnd = parseFloat(kmEndInput.value) || finalRecord.kmStart;
            finalRecord.kmDriven = Math.max(0, finalRecord.kmEnd - finalRecord.kmStart);
        }

        // Mentés
        await saveWorkRecord(finalRecord);

        // Cleanup
        localStorage.removeItem('inProgressEntry');
        localStorage.removeItem('activeShift');
        inProgressEntry = null;
        if (window.activeShift) delete window.activeShift;

        // workday.js cleanup
        if (typeof window.cancelShift === 'function') {
            window.cancelShift();
        }

        // Modal bezárása
        hideFinalizeModal();

        // UI frissítése
        renderApp();
        showTab('list');
        showCustomAlert(i18n.alertSaveSuccess, 'success');

    } catch (error) {
        console.error('Hiba a műszak befejezésekor:', error);
        showCustomAlert('Hiba történt a befejezéskor: ' + error.message, 'info');
    }
}

// Munkanap elvetése (JAVÍTOTT)
function cancelShift() {
    const i18n = translations[currentLang];
    
    showCustomAlert(i18n.discardWorkday + '?', 'warning', () => {
        // Minden állapot tisztítása
        localStorage.removeItem('inProgressEntry');
        localStorage.removeItem('activeShift');
        inProgressEntry = null;
        if (window.activeShift) delete window.activeShift;
        
        // workday.js tisztítása
        if (typeof window.cancelShift === 'function') {
            window.cancelShift();
        }
        
        // Broadcast
        if (typeof notify === 'function') {
            notify('shift-cancelled');
        }
        
        renderApp();
        showTab('live');
    });
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
    if (typeof renderWeeklyAllowance === 'function') {
        renderWeeklyAllowance();
    }
    if (typeof renderEnhancedTachoCards === 'function') {
        renderEnhancedTachoCards();
    } else if (typeof renderTachoHelperCards === 'function') {
        renderTachoHelperCards();
    }
    if (typeof renderEnhancedDashboard === 'function') {
        renderEnhancedDashboard();
    } else {
        renderDashboard();
    }
}

// Továbbfejlesztett áttekintés (Dashboard)
function renderEnhancedDashboard() {
    const i18n = translations[currentLang];
    const container = document.getElementById('dashboard-cards');
    if (!container) return;

    const now = new Date();
    const today = calculateSummaryForDate(now);
    const thisWeek = calculateSummaryForDateRange(getWeekRange(now));
    const lastWeek = calculateSummaryForDateRange(getWeekRange(now, -1));
    const thisMonth = calculateSummaryForMonth(now);

    // Ellenőrizzük, hogy van-e aktív műszak
    const hasActiveShift = inProgressEntry || JSON.parse(localStorage.getItem('activeShift') || 'null');
    
    let cards = [];

    if (hasActiveShift) {
        // Aktív műszak alatt más kártyákat mutatunk
        const shift = inProgressEntry || JSON.parse(localStorage.getItem('activeShift') || 'null');
        const startTime = new Date(`${shift.date}T${shift.startTime}`);
        const currentTime = new Date();
        const elapsedMinutes = Math.floor((currentTime - startTime) / 60000);
        
        cards = [
            { labelKey: 'currentShiftDuration', value: formatDuration(elapsedMinutes), color: 'green', icon: '⏱️' },
            { labelKey: 'shiftStartTime', value: `${shift.startTime} (${shift.startLocation || 'N/A'})`, color: 'blue', icon: '🚀' },
            { labelKey: 'crossingsToday', value: `${(shift.crossings || []).length} db`, color: 'indigo', icon: '🛂' },
            { labelKey: 'dashboardWorkThisWeek', value: formatDuration(thisWeek.workMinutes), color: 'purple', icon: '📊' }
        ];
    } else {
        // Normál áttekintő kártyák
        cards = [
            { labelKey: 'dashboardWorkToday', value: formatDuration(today.workMinutes), color: 'green', icon: '💼' },
            { labelKey: 'dashboardDriveThisWeek', value: formatDuration(thisWeek.driveMinutes), color: 'blue', icon: '🚗' },
            { labelKey: 'dashboardDistanceThisMonth', value: `${thisMonth.kmDriven} km`, color: 'orange', icon: '📏' },
            { labelKey: 'workDaysThisMonth', value: `${thisMonth.days} nap`, color: 'indigo', icon: '📅' }
        ];
    }

    container.innerHTML = cards.map(card => `
        <div class="bg-${card.color}-50 dark:bg-${card.color}-900/50 border border-${card.color}-200 dark:border-${card.color}-800 rounded-lg p-3 text-center hover:shadow-md transition-shadow">
            <div class="flex items-center justify-center mb-2">
                <span class="text-2xl mr-2">${card.icon}</span>
            </div>
            <p class="text-xs text-${card.color}-700 dark:text-${card.color}-200 font-semibold">${i18n[card.labelKey] || card.labelKey}</p>
            <p class="text-lg font-bold text-${card.color}-800 dark:text-${card.color}-100 mt-1">${card.value}</p>
        </div>
    `).join('');
}

// Tachográf segédkártyák frissítése
function renderEnhancedTachoCards() {
    const container = document.getElementById('tacho-helper-display');
    if (!container) return;
    
    const i18n = translations[currentLang];
    const hasActiveShift = inProgressEntry || JSON.parse(localStorage.getItem('activeShift') || 'null');

    if (hasActiveShift) {
        // Aktív műszak alatt
        const shift = inProgressEntry || JSON.parse(localStorage.getItem('activeShift') || 'null');
        const allowance = calculateWeeklyAllowance();
        const startDate = new Date(`${shift.date}T${shift.startTime}`);
        const currentTime = new Date();
        const elapsedHours = (currentTime - startDate) / (1000 * 60 * 60);
        
        const latestRestStart11h = new Date(startDate.getTime());
        latestRestStart11h.setHours(latestRestStart11h.getHours() + 13);
        
        let htmlContent = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <h4 class="font-semibold text-blue-800 dark:text-blue-200 text-sm mb-2">⏱️ Jelenlegi műszak</h4>
                <p class="text-lg font-bold">${formatDuration(Math.floor(elapsedHours * 60))}</p>
                <p class="text-xs text-gray-500">Kezdés: ${shift.startTime}</p>
            </div>
            <div class="bg-amber-50 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <h4 class="font-semibold text-amber-800 dark:text-amber-200 text-sm mb-2">⚠️ ${i18n.latestRestStartTitle}</h4>
                <p class="text-sm font-bold">${formatDateTime(latestRestStart11h)}</p>
                <p class="text-xs text-gray-500">(11 órás pihenőhöz)</p>
            </div>
        </div>`;
        
        if (allowance.remainingRests <= 0) {
            htmlContent += `<div class="mt-3 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p class="text-sm text-red-800 dark:text-red-200 font-semibold">🚨 ${i18n.noMoreReducedRestsWarning}</p>
            </div>`;
        }
        
        container.innerHTML = htmlContent;
    } else {
        // Nincs aktív műszak - korábbi logika
        if (typeof renderTachoHelperCards === 'function') {
            renderTachoHelperCards();
        }
    }
}

function renderStartTab() {
    const i18n = translations[currentLang];
    inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
    const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');

    const startForm = document.getElementById('start-new-day-form');
    const progressView = document.getElementById('live-progress-view');
    const summaryContainer = document.getElementById('live-start-summary');

    if (!startForm || !progressView) return;

    // Ha van aktív műszak (régi vagy új rendszerben)
    if (inProgressEntry || activeShift) {
        startForm.classList.add('hidden');
        progressView.classList.remove('hidden');

        const entry = inProgressEntry || activeShift;
        const liveStartTime = document.getElementById('live-start-time');
        if (liveStartTime) {
            liveStartTime.textContent = `${i18n.startedAt}: ${entry.date} ${entry.startTime}`;
        }

        // Műszak részleteinek megjelenítése
        let summaryHTML = '';
        const hasDriveData = localStorage.getItem('toggleDriveTime') === 'true' && entry.weeklyDriveStartStr;
        const hasKmData = localStorage.getItem('toggleKm') === 'true' && entry.kmStart > 0;
        const hasLocationData = entry.startLocation && entry.startLocation.trim() !== '';

        if (hasDriveData || hasKmData || hasLocationData) {
            summaryHTML += `<div class="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg space-y-2">
                                <h3 class="font-semibold text-gray-800 dark:text-gray-100">${i18n.liveShiftDetailsTitle}</h3>
                                <div class="space-y-1 text-sm">`;

            if (hasLocationData) {
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartLocationLabel}</span>
                                    <span class="font-semibold">${entry.startLocation}</span>
                                </div>`;
            }
            if (hasDriveData) {
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartDriveLabel}</span>
                                    <span class="font-semibold">${entry.weeklyDriveStartStr || entry.meta?.weeklyDriveStart || ''}</span>
                                </div>`;
            }
            if (hasKmData) {
                const kmValue = entry.kmStart || entry.meta?.startKm || 0;
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartKmLabel}</span>
                                    <span class="font-semibold">${kmValue} km</span>
                                </div>`;
            }

            summaryHTML += `</div></div>`;
        }

        if (summaryContainer) {
            summaryContainer.innerHTML = summaryHTML;
        }

        // Határátlépések megjelenítése
        const liveCrossList = document.getElementById('live-crossings-list');
        const liveCrossFrom = document.getElementById('liveCrossFrom');

        if (liveCrossList && liveCrossFrom) {
            const crossings = entry.crossings || [];
            if (crossings.length > 0) {
                const crossingsHTML = crossings.map(c =>
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
                liveCrossFrom.value = crossings.slice(-1)[0].to;
            } else {
                liveCrossList.innerHTML = '';
                const lastRecordWithCrossing = getSortedRecords().find(r => r.crossings && r.crossings.length > 0);
                liveCrossFrom.value = lastRecordWithCrossing ? lastRecordWithCrossing.crossings.slice(-1)[0].to : '';
            }
        }

        // Új határátlépés beviteli mezők alapértelmezett értékei
        const liveCrossTo = document.getElementById('liveCrossTo');
        const liveCrossTime = document.getElementById('liveCrossTime');
        if (liveCrossTo && liveCrossTime) {
            liveCrossTo.value = '';
            liveCrossTime.value = new Date().toTimeString().slice(0, 5);
        }

    } else {
        // Nincs aktív műszak - új munkanap indítható
        progressView.classList.add('hidden');
        startForm.classList.remove('hidden');
        if (summaryContainer) {
            summaryContainer.innerHTML = '';
        }

        // Alapértelmezett értékek betöltése
        if (records.length > 0) {
            loadLastValues(true);
        }

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
    ['startTime', 'endTime', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateDisplays);
    });

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

    // ÚJ: Aktív műszak automatikus frissítése
    setInterval(() => {
        const hasActiveShift = inProgressEntry || JSON.parse(localStorage.getItem('activeShift') || 'null');
        if (hasActiveShift && currentActiveTab === 'live') {
            renderLiveTabView();
        }
        if (hasActiveShift && currentActiveTab === 'start') {
            renderStartTab();
        }
    }, 30000); // 30 másodpercenként
    
    // ÚJ: Storage események figyelése más tabok/ablakok változásaihoz
    window.addEventListener('storage', (e) => {
        if (e.key === 'activeShift' || e.key === 'inProgressEntry') {
            // Frissítjük a globális változókat
            inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
            
            // UI frissítése, ha szükséges
            if (currentActiveTab === 'live' || currentActiveTab === 'start') {
                renderApp();
            }
        }
    });
}

function loadLastValues(isForLiveTab = false) {
    try {
        if (typeof getLatestRecord !== 'function') return;
        const last = getLatestRecord();
        if (!last) return;

        if (isForLiveTab) {
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

// Periodikus állapot ellenőrzés és szinkronizálás
setInterval(() => {
    // Szinkronizáljuk a globális változókat a localStorage-al
    const storedInProgress = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
    const storedActiveShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
    
    if (storedInProgress !== inProgressEntry) {
        inProgressEntry = storedInProgress;
    }
    
    if (storedActiveShift && !window.activeShift) {
        window.activeShift = storedActiveShift;
    } else if (!storedActiveShift && window.activeShift) {
        delete window.activeShift;
    }
}, 5000); // 5 másodpercenként

// ÚJ: Hibakezelés és debugging
function debugActiveShift() {
    console.log('=== AKTÍV MŰSZAK DEBUG INFO ===');
    console.log('inProgressEntry:', inProgressEntry);
    console.log('localStorage inProgressEntry:', localStorage.getItem('inProgressEntry'));
    console.log('window.activeShift:', window.activeShift);
    console.log('localStorage activeShift:', localStorage.getItem('activeShift'));
    console.log('currentActiveTab:', currentActiveTab);
    console.log('================================');
}

// ====== GLOBÁLIS HOZZÁFÉRHETŐSÉG BIZTOSÍTÁSA ======
window.renderApp = renderApp;
window.showTab = showTab;
window.toggleSettingsMenu = toggleSettingsMenu;
window.closeSettingsMenu = closeSettingsMenu;
window.updateDisplays = updateDisplays;
window.loadLastValues = loadLastValues;
window.getSortedRecords = getSortedRecords;
window.getLatestRecord = getLatestRecord;
window.startShift = startShift;
window.finalizeShift = finalizeShift;
window.cancelShift = cancelShift;
window.addLiveCrossing = addLiveCrossing;
window.renderEnhancedDashboard = renderEnhancedDashboard;
window.renderEnhancedTachoCards = renderEnhancedTachoCards;
window.debugActiveShift = debugActiveShift;
window.showFinalizeModal = showFinalizeModal;
window.hideFinalizeModal = hideFinalizeModal;
window.confirmFinalizeShift = confirmFinalizeShift;
window.fetchLocationForFinalize = fetchLocationForFinalize;
window.updateFinalizeSummary = updateFinalizeSummary;