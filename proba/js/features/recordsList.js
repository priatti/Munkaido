// =======================================================
// ===== BEJEGYZÉSEK LISTÁZÁSA (FEATURE) ================
// =======================================================

/**
 * A "Teljes nap" fülön lévő adatok mentése vagy frissítése.
 */
// Split rest data kezelő függvények (ha nincs globálisan definiálva)
window.getSplitRestData = window.getSplitRestData || function() {
    return JSON.parse(localStorage.getItem('splitRestData') || '{}');
};

window.saveSplitRestData = window.saveSplitRestData || function(data) {
    localStorage.setItem('splitRestData', JSON.stringify(data));
};
async function saveEntry() {
    const i18n = translations[currentLang];

    // --- 1. Adatok begyűjtése az űrlapról ---
    const date = document.getElementById('date').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const startLocation = document.getElementById('startLocation').value.trim();
    const endLocation = document.getElementById('endLocation').value.trim();
    const kmStart = parseFloat(document.getElementById('kmStart').value) || 0;
    const kmEnd = parseFloat(document.getElementById('kmEnd').value) || 0;
    const weeklyDriveStart = document.getElementById('weeklyDriveStart').value;
    const weeklyDriveEnd = document.getElementById('weeklyDriveEnd').value;
    const compensationTime = document.getElementById('compensationTime').value;
    const isSplitRest = document.getElementById('toggleSplitRest').checked;

    // --- 2. Alapvető validáció ---
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

    // --- 3. Értékek kiszámítása ---
    const workMinutes = calculateWorkMinutes(startTime, endTime);
    const nightWorkMinutes = calculateNightWorkMinutes(startTime, endTime);
    const driveMinutes = Math.max(0, parseTimeToMinutes(weeklyDriveEnd) - parseTimeToMinutes(weeklyDriveStart));
    const kmDriven = Math.max(0, kmEnd - kmStart);
    const compensationMinutes = parseTimeToMinutes(compensationTime);

    // --- 4. Határátlépések összegyűjtése ---
    const crossings = [];
    document.querySelectorAll('#crossingsContainer .grid').forEach(row => {
        const from = row.querySelector('input[placeholder="Honnan"], input[placeholder="Von"]').value.trim().toUpperCase();
        const to = row.querySelector('input[placeholder="Hova"], input[placeholder="Nach"]').value.trim().toUpperCase();
        const time = row.querySelector('input[type="time"]').value;
        if (from && to && time) {
            crossings.push({ from, to, time });
        }
    });

    // --- 5. A 'record' objektum összeállítása ---
    const record = {
        id: editingId ? String(editingId) : String(Date.now()),
        date,
        startTime,
        endTime,
        startLocation,
        endLocation,
        kmStart,
        kmEnd,
        kmDriven,
        weeklyDriveStart,
        weeklyDriveEnd,
        driveMinutes,
        workMinutes: workMinutes - compensationMinutes, // Kompenzáció levonása
        compensationMinutes,
        nightWorkMinutes,
        crossings,
        isSplitRest
    };

    // --- 6. Mentés és visszajelzés ---
    try {
        await saveWorkRecord(record); // Ez a függvény a database.js-ben van
        showCustomAlert(i18n.alertSaveSuccess, 'success');
        
        // Sikeres mentés utáni teendők
        editingId = null; // Töröljük a szerkesztési ID-t
        renderApp();      // Frissítjük a teljes nézetet
        showTab('list');  // Átváltunk a lista fülre
    } catch (error) {
        console.error("Hiba a mentés során:", error);
        showCustomAlert('Hiba történt a mentés során.', 'info');
    }
}


// A mentett munkanapok listájának kirajzolása a HTML-be
function renderRecords() {
    const i18n = translations[currentLang];
    const container = document.getElementById('recordsContent');
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

// Bejegyzés szerkesztésének előkészítése (űrlap kitöltése)
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
        updateEnhancedToggleVisuals(splitRestToggle); // ENHANCED: Új vizuális kezelés
    }

    document.getElementById('crossingsContainer').innerHTML = '';
    (record.crossings || []).forEach(c => addCrossingRow(c.from, c.to, c.time));
    updateDisplays();
}

// Törlés megerősítése, majd törlés
function confirmDeleteRecord(id) {
    showCustomAlert(translations[currentLang].alertConfirmDelete, 'warning', async () => {
        const splitData = getSplitRestData();
        delete splitData[id];
        saveSplitRestData(splitData);
        await deleteWorkRecord(id);
        renderApp();
        showTab(currentActiveTab);
    });
}
