function resetEntryForm() {
    editingId = null;
    
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
    
    const crossingsContainer = document.getElementById('crossingsContainer');
    if (crossingsContainer) {
        crossingsContainer.innerHTML = '';
    }
    
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        splitRestToggle.checked = false;
        if (typeof updateEnhancedToggleVisuals === 'function') {
            updateEnhancedToggleVisuals(splitRestToggle);
        }
    }
}

function addCrossingRow(from = '', to = '', time = '') {
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

function removeCrossingRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.remove();
    }
}

// =======================================================
// ===== BEJEGYZÉSEK LISTÁZÁSA (FEATURE) ================
// =======================================================

window.getSplitRestData = window.getSplitRestData || function() {
    return JSON.parse(localStorage.getItem('splitRestData') || '{}');
};

window.saveSplitRestData = window.saveSplitRestData || function(data) {
    localStorage.setItem('splitRestData', JSON.stringify(data));
};

async function saveEntry() {
    const i18n = translations[currentLang];

    const date = document.getElementById('date')?.value;
    const startTime = document.getElementById('startTime')?.value;
    const endTime = document.getElementById('endTime')?.value;
    const startLocation = document.getElementById('startLocation')?.value.trim();
    const endLocation = document.getElementById('endLocation')?.value.trim();
    const kmStart = parseFloat(document.getElementById('kmStart')?.value) || 0;
    const kmEnd = parseFloat(document.getElementById('kmEnd')?.value) || 0;
    const weeklyDriveStart = document.getElementById('weeklyDriveStart')?.value;
    const weeklyDriveEnd = document.getElementById('weeklyDriveEnd')?.value;
    const compensationTime = document.getElementById('compensationTime')?.value;
    const isSplitRest = document.getElementById('toggleSplitRest')?.checked;

    if (!date || !startTime || !endTime) {
        showCustomAlert(i18n.alertMandatoryFields, 'info');
        return;
    }
    if (kmEnd > 0 && kmStart > kmEnd) {
        showCustomAlert(i18n.alertKmEndLower, 'info');
        return;
    }
    if (parseTimeToMinutes(weeklyDriveEnd) > 0 && parseTimeToMinutes(weeklyDriveStart) > parseTimeToMinutes(weeklyDriveEnd)) {
        showCustomAlert(i18n.alertWeeklyDriveEndLower, 'info');
        return;
    }

    const workMinutes = calculateWorkMinutes(startTime, endTime);
    const nightWorkMinutes = calculateNightWorkMinutes(startTime, endTime);
    const driveMinutes = Math.max(0, parseTimeToMinutes(weeklyDriveEnd) - parseTimeToMinutes(weeklyDriveStart));
    const kmDriven = Math.max(0, kmEnd - kmStart);
    const compensationMinutes = parseTimeToMinutes(compensationTime);

    const crossings = [];
    document.querySelectorAll('#crossingsContainer .grid, #crossingsContainer .crossing-row').forEach(row => {
        const fromInput = row.querySelector('input.crossing-from, input[placeholder="Honnan"], input[placeholder="Von"]');
        const toInput = row.querySelector('input.crossing-to, input[placeholder="Hova"], input[placeholder="Nach"]');
        const timeInput = row.querySelector('input.crossing-time, input[type="time"]');
        
        const from = fromInput ? fromInput.value.trim().toUpperCase() : '';
        const to = toInput ? toInput.value.trim().toUpperCase() : '';
        const time = timeInput ? timeInput.value : '';

        if (from && to && time) {
            crossings.push({ from, to, time });
        }
    });

    const record = {
        id: editingId ? String(editingId) : String(Date.now()),
        date, startTime, endTime, startLocation, endLocation, kmStart, kmEnd,
        kmDriven,
        weeklyDriveStartStr: weeklyDriveStart,
        weeklyDriveEndStr: weeklyDriveEnd,
        driveMinutes,
        workMinutes: workMinutes - compensationMinutes,
        compensationMinutes,
        nightWorkMinutes,
        crossings,
        isSplitRest
    };

    try {
        await saveWorkRecord(record);
        showCustomAlert(i18n.alertSaveSuccess, 'success');
        
        editingId = null;
        renderApp();
        showTab('list');
    } catch (error) {
        console.error("Hiba a mentés során:", error);
        showCustomAlert('Hiba történt a mentés során.', 'info');
    }
}

function renderRecords() {
    const i18n = translations[currentLang];
    const container = safeGetElement('recordsContent');
    if (!container) return;
    
    const locale = currentLang === 'de' ? 'de-DE' : 'hu-HU';
    const sorted = getSortedRecords();

    container.innerHTML = sorted.length === 0
        ? `<p class="text-center text-gray-500 py-8">${i18n.noEntries}</p>`
        : sorted.map(r => {
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
                        <button onclick="editRecord('${r.id}')" class="text-blue-500 p-1">✏️</button>
                        <button onclick="confirmDeleteRecord('${r.id}')" class="text-red-500 p-1">🗑️</button>
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

function editRecord(id) {
    const record = records.find(r => r.id === String(id));
    if (!record) return;

    editingId = String(id);
    showTab('full-day');
    
    Object.keys(record).forEach(key => {
        const el = document.getElementById(key.replace('Str', ''));
        if (el) el.value = record[key] || '';
    });
    
    const compensationEl = document.getElementById('compensationTime');
    if (compensationEl) {
        compensationEl.value = record.compensationMinutes ? formatAsHoursAndMinutes(record.compensationMinutes) : '';
    }

    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        splitRestToggle.checked = record.isSplitRest || false;
        updateEnhancedToggleVisuals(splitRestToggle);
    }

    const crossingsContainer = document.getElementById('crossingsContainer');
    if(crossingsContainer) {
        crossingsContainer.innerHTML = '';
        (record.crossings || []).forEach(c => addCrossingRow(c.from, c.to, c.time));
    }
    updateDisplays();
}

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