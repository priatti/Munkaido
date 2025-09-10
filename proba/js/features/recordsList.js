// =======================================================
// ===== BEJEGYZÉSEK LISTÁZÁSA (FEATURE) ================
// =======================================================

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
