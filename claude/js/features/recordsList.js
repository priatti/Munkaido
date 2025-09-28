// =======================================================
// ===== BEJEGYZÉSEK LISTÁZÁSA ÉS KEZELÉSE (JAVÍTOTT) ====
// =======================================================

// A szerkesztő űrlap alaphelyzetbe állítása (JAVÍTOTT - ténylegesen törli az értékeket)
function resetEntryForm() {
    console.log('Resetting entry form...');
    // editingId = null; // EZ A SOR LETT TÖRÖLVE A HIBA JAVÍTÁSÁHOZ
    
    // Összes mező explicit törlése
    const fields = [
        'date', 'startTime', 'endTime', 'startLocation', 'endLocation', 
        'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime'
    ];
    
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
            console.log('Cleared field:', id);
        }
    });
    
    // Határátlépések törlése
    const crossingsContainer = document.getElementById('crossingsContainer');
    if (crossingsContainer) {
        crossingsContainer.innerHTML = '';
        console.log('Cleared crossings container');
    }

    // Osztott pihenő checkbox törlése
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        splitRestToggle.checked = false;
        if (typeof updateEnhancedToggleVisuals === 'function') {
            updateEnhancedToggleVisuals(splitRestToggle);
        }
        console.log('Cleared split rest toggle');
    }
    
    // Display mezők frissítése
    if (typeof updateDisplays === 'function') {
        setTimeout(updateDisplays, 50);
    }
    
    console.log('Entry form reset completed');
}

// Új határátlépés sor hozzáadása az űrlaphoz
function addCrossingRow(from = '', to = '', time = '') {
    const container = document.getElementById('crossingsContainer');
    if (!container) return;
    const i18n = translations[currentLang];
    const rowId = 'crossing-' + Date.now();
    const currentTime = time || new Date().toTimeString().slice(0, 5);
    
    const rowHTML = `
        <div class="crossing-row bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-3" id="${rowId}">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">${i18n.fromPlaceholder}</label>
                    <input type="text" class="crossing-from w-full p-2 border rounded text-sm uppercase" placeholder="${i18n.fromPlaceholder}" value="${from}">
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">${i18n.toPlaceholder}</label>
                    <div class="flex">
                        <input type="text" class="crossing-to flex-1 p-2 border rounded-l text-sm uppercase" placeholder="${i18n.toPlaceholder}" value="${to}">
                        <button type="button" class="bg-blue-500 text-white p-2 rounded-r text-xs hover:bg-blue-600 transition-colors" onclick="fetchCountryCodeFor('${rowId}')" title="${i18n.getCountryCodeGPS}">📍</button>
                    </div>
                </div>
            </div>
            
            <div class="flex items-end gap-2">
                <div class="flex-1">
                    <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">${i18n.time}</label>
                    <input type="time" class="crossing-time w-full p-2 border rounded text-sm" value="${currentTime}" onblur="formatTimeInput(this)">
                </div>
                <button type="button" class="bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm font-medium transition-colors h-10 px-4" onclick="removeCrossingRow('${rowId}')" title="${i18n.delete}">
                    🗑️ ${i18n.delete}
                </button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHTML);
}


// Határátlépés sor eltávolítása
function removeCrossingRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
}

// Szerkesztés megszakítása
function cancelEdit() {
    const i18n = translations[currentLang];
    
    if (editingId) {
        showCustomAlert(
            i18n.confirmCancelEdit || 'Biztosan megszakítod a szerkesztést? A nem mentett változások elvesznek!',
            'warning',
            () => {
                console.log('Edit cancelled for record:', editingId);
                editingId = null;
                resetEntryForm();
                hideCancelButton();
                showTab('list');
            }
        );
    } else {
        // Ha nincs szerkesztés, csak egy sima reset
        resetEntryForm();
        hideCancelButton();
        showTab('list');
    }
}

// Mégse gomb megjelenítése/elrejtése
function showCancelButton() {
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
        cancelBtn.style.display = 'block';
        // Gomb stílusának javítása
        cancelBtn.className = 'w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-base shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]';
        cancelBtn.innerHTML = '❌ <span data-translate-key="cancelEdit">Mégse / Szerkesztés megszakítása</span>';
    }
}

function hideCancelButton() {
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
}

// Új bejegyzés mentése vagy meglévő módosítása
async function saveEntry() {
    const i18n = translations[currentLang];
    const date = document.getElementById('date').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    if (!date || !startTime || !endTime) {
        showCustomAlert(i18n.alertMandatoryFields, 'info');
        return;
    }

    const kmStart = parseFloat(document.getElementById('kmStart').value) || 0;
    const kmEnd = parseFloat(document.getElementById('kmEnd').value) || 0;
    if (kmEnd > 0 && kmStart > kmEnd) {
        showCustomAlert(i18n.alertKmEndLower, 'info');
        return;
    }

    const weeklyDriveStart = document.getElementById('weeklyDriveStart').value;
    const weeklyDriveEnd = document.getElementById('weeklyDriveEnd').value;
    if (parseTimeToMinutes(weeklyDriveEnd) > 0 && parseTimeToMinutes(weeklyDriveStart) > parseTimeToMinutes(weeklyDriveEnd)) {
        showCustomAlert(i18n.alertWeeklyDriveEndLower, 'info');
        return;
    }

    const compensationMinutes = parseTimeToMinutes(document.getElementById('compensationTime').value);
    const workMinutes = calculateWorkMinutes(startTime, endTime) - compensationMinutes;
    
    const crossings = [];
    document.querySelectorAll('#crossingsContainer .crossing-row').forEach(row => {
        const from = row.querySelector('.crossing-from').value.trim().toUpperCase();
        const to = row.querySelector('.crossing-to').value.trim().toUpperCase();
        const time = row.querySelector('.crossing-time').value;
        if (from && to && time) {
            crossings.push({ from, to, time });
        }
    });

    const record = {
        id: editingId ? String(editingId) : String(Date.now()),
        date,
        startTime,
        endTime,
        startLocation: document.getElementById('startLocation').value.trim(),
        endLocation: document.getElementById('endLocation').value.trim(),
        kmStart,
        kmEnd,
        kmDriven: Math.max(0, kmEnd - kmStart),
        weeklyDriveStartStr: weeklyDriveStart,
        weeklyDriveEndStr: weeklyDriveEnd,
        driveMinutes: Math.max(0, parseTimeToMinutes(weeklyDriveEnd) - parseTimeToMinutes(weeklyDriveStart)),
        workMinutes,
        compensationMinutes,
        nightWorkMinutes: calculateNightWorkMinutes(startTime, endTime),
        crossings,
        isSplitRest: document.getElementById('toggleSplitRest').checked
    };

    await saveWorkRecord(record);
    showCustomAlert(i18n.alertSaveSuccess, 'success');
    
    editingId = null;
    hideCancelButton(); // MÉGSE GOMB ELREJTÉSE
    renderApp();
    showTab('list');
}

// A mentett bejegyzések listájának megjelenítése
function renderRecords() {
    const i18n = translations[currentLang];
    const container = document.getElementById('recordsContent');
    if (!container) return;
    
    const locale = currentLang === 'de' ? 'de-DE' : 'hu-HU';
    const sorted = getSortedRecords();

    if (sorted.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-8">${i18n.noEntries}</p>`;
        return;
    }

    container.innerHTML = sorted.map(r => {
        const d = new Date(r.date);
        const day = d.getUTCDay();
        const weekendClass = (day === 6 || day === 0) ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/50';
        const isOvernight = new Date(`1970-01-01T${r.endTime}`) < new Date(`1970-01-01T${r.startTime}`);
        const endDate = new Date(r.date + 'T00:00:00');
        let startDate = new Date(r.date + 'T00:00:00');
        if (isOvernight) {
            startDate.setDate(startDate.getDate() - 1);
        }
        const formatShortDate = (dt) => dt.toLocaleDateString(locale, { month: '2-digit', day: '2-digit' });

        return `
        <div class="${weekendClass} rounded-lg p-3 mb-3 text-sm shadow-sm">
            <div class="flex items-center justify-between mb-2">
                <div class="font-semibold text-gray-800 dark:text-gray-100">${isOvernight ? `${startDate.toLocaleDateString(locale)} - ${endDate.toLocaleDateString(locale)}` : endDate.toLocaleDateString(locale)}</div>
                <div>
                    <button onclick="editRecord('${r.id}')" class="text-blue-500 p-1" title="Szerkesztés">✏️</button>
                    <button onclick="confirmDeleteRecord('${r.id}')" class="text-red-500 p-1" title="Törlés">🗑️</button>
                </div>
            </div>
            <div class="space-y-1 text-gray-600 dark:text-gray-300">
                <div class="flex justify-between"><span>${i18n.entryDeparture}:</span><span>${isOvernight ? formatShortDate(startDate) : ""} ${r.startTime} (${r.startLocation || "N/A"})</span></div>
                <div class="flex justify-between"><span>${i18n.entryArrival}:</span><span>${formatShortDate(endDate)} ${r.endTime} (${r.endLocation || "N/A"})</span></div>
                <div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1 mt-1"><span>${i18n.entryWorkTime}:</span><span class="font-bold text-gray-800 dark:text-gray-100">${formatDuration(r.workMinutes)}</span></div>
                ${r.compensationMinutes > 0 ? `<div class="flex justify-between text-yellow-700 dark:text-yellow-400 text-xs"><span>&nbsp;&nbsp;└ ${i18n.entryCompensation}:</span><span>-${formatDuration(r.compensationMinutes)}</span></div>` : ''}
                <div class="flex justify-between"><span>${i18n.entryNightTime}:</span><span class="text-purple-600 dark:text-purple-400">${formatDuration(r.nightWorkMinutes || 0)}</span></div>
                <div class="flex justify-between"><span>${i18n.entryDriveTime}:</span><span class="text-blue-700 dark:text-blue-300">${formatDuration(r.driveMinutes)}</span></div>
                <div class="flex justify-between"><span>${i18n.entryDistance}:</span><span class="text-orange-600 dark:text-orange-400">${r.kmDriven} km</span></div>
                ${(r.crossings && r.crossings.length > 0) ? `<div class="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2"><p class="font-semibold text-xs text-indigo-700 dark:text-indigo-300">${i18n.entryCrossingsLabel}:</p><div class="text-xs pl-2">${r.crossings.map(c => `<span>${c.from} - ${c.to} (${c.time})</span>`).join("<br>")}</div></div>` : ""}
            </div>
        </div>`;
    }).join('');
}

// Bejegyzés szerkesztése (JAVÍTOTT VERZIÓ - minden adat helyes betöltése)
function editRecord(id) {
    const record = records.find(r => r.id === String(id));
    if (!record) {
        console.error('Record not found:', id);
        return;
    }

    console.log('Editing record:', record);
    editingId = String(id);
    
    // MÉGSE GOMB MEGJELENÍTÉSE
    showCancelButton();
    
    showTab('full-day');
    
    // Várunk egy kicsit, hogy a tab váltás megtörténjen
    setTimeout(() => {
        // Reset előtt
        resetEntryForm();
        
        // Alap adatok betöltése
        const dateEl = document.getElementById('date');
        const startTimeEl = document.getElementById('startTime');
        const endTimeEl = document.getElementById('endTime');
        const startLocationEl = document.getElementById('startLocation');
        const endLocationEl = document.getElementById('endLocation');
        
        if (dateEl) dateEl.value = record.date || '';
        if (startTimeEl) startTimeEl.value = record.startTime || '';
        if (endTimeEl) endTimeEl.value = record.endTime || '';
        if (startLocationEl) startLocationEl.value = record.startLocation || '';
        if (endLocationEl) endLocationEl.value = record.endLocation || '';
        
        // Heti vezetési idők betöltése
        const weeklyStartElement = document.getElementById('weeklyDriveStart');
        const weeklyEndElement = document.getElementById('weeklyDriveEnd');
        
        if (weeklyStartElement && record.weeklyDriveStartStr) {
            weeklyStartElement.value = record.weeklyDriveStartStr;
            console.log('Weekly drive start loaded for record', id, ':', record.weeklyDriveStartStr);
        }
        if (weeklyEndElement && record.weeklyDriveEndStr) {
            weeklyEndElement.value = record.weeklyDriveEndStr;
            console.log('Weekly drive end loaded for record', id, ':', record.weeklyDriveEndStr);
        }
        
        // Kilométer adatok betöltése
        const kmStartEl = document.getElementById('kmStart');
        const kmEndEl = document.getElementById('kmEnd');
        if (kmStartEl) kmStartEl.value = record.kmStart || '';
        if (kmEndEl) kmEndEl.value = record.kmEnd || '';
        
        // Kompenzáció betöltése
        const compensationElement = document.getElementById('compensationTime');
        if (compensationElement) {
            if (record.compensationMinutes && record.compensationMinutes > 0) {
                const hours = Math.floor(record.compensationMinutes / 60);
                const minutes = record.compensationMinutes % 60;
                compensationElement.value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            } else {
                compensationElement.value = '';
            }
        }
        
        // Osztott pihenő toggle beállítása
        const splitRestToggle = document.getElementById('toggleSplitRest');
        if (splitRestToggle) {
            splitRestToggle.checked = record.isSplitRest || false;
            if (typeof updateEnhancedToggleVisuals === 'function') {
                updateEnhancedToggleVisuals(splitRestToggle);
            }
        }

        // Határátlépések betöltése
        const crossingsContainer = document.getElementById('crossingsContainer');
        if (crossingsContainer) {
            crossingsContainer.innerHTML = '';
            if (record.crossings && Array.isArray(record.crossings)) {
                record.crossings.forEach(crossing => {
                    if (typeof addCrossingRow === 'function') {
                        addCrossingRow(crossing.from, crossing.to, crossing.time);
                    }
                });
            }
        }

        // Számított mezők frissítése
        if (typeof updateDisplays === 'function') {
            updateDisplays();
        }
        
        console.log('Edit form populated for record:', id);
    }, 100);
}

// Törlés megerősítése
function confirmDeleteRecord(id) {
    const i18n = translations[currentLang];
    showCustomAlert(
        i18n.alertConfirmDelete, 
        'warning', 
        async () => {
            await deleteWorkRecord(id);
            renderApp();
            showTab(currentActiveTab);
        },
        { confirmText: i18n.delete, confirmClass: 'bg-red-500 hover:bg-red-600' }
    );
}