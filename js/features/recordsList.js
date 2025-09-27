// =======================================================
// ===== BEJEGYZÉSEK LISTÁZÁSA ÉS KEZELÉSE (JAVÍTOTT) ====
// =======================================================

// A szerkesztő űrlap alaphelyzetbe állítása
function resetEntryForm() {
    editingId = null;
    const fields = ['date', 'startTime', 'endTime', 'startLocation', 'endLocation', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const crossingsContainer = document.getElementById('crossingsContainer');
    if (crossingsContainer) crossingsContainer.innerHTML = '';

    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) splitRestToggle.checked = false;
}

// Új határátlépés sor hozzáadása az űrlaphoz
function addCrossingRow(from = '', to = '', time = '') {
    const container = document.getElementById('crossingsContainer');
    if (!container) return;

    const rowId = 'crossing-' + Date.now();
    const currentTime = time || new Date().toTimeString().slice(0, 5);
    
    const rowHTML = `
        <div class="crossing-row flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg" id="${rowId}">
            <input type="text" class="crossing-from flex-1 p-2 border rounded text-sm uppercase" placeholder="Honnan" value="${from}">
            <span class="text-gray-400">→</span>
            <div class="flex flex-1">
                <input type="text" class="crossing-to flex-1 p-2 border rounded-l text-sm uppercase" placeholder="Hova" value="${to}">
                <button type="button" class="bg-blue-500 text-white p-2 rounded-r text-xs" onclick="fetchCountryCodeFor('${rowId}')" title="Országkód lekérése GPS alapján">📍</button>
            </div>
            <input type="time" class="crossing-time p-2 border rounded text-sm" value="${currentTime}" onblur="formatTimeInput(this)">
            <button type="button" class="text-red-500 hover:text-red-700 p-1" onclick="removeCrossingRow('${rowId}')" title="Törlés">🗑️</button>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', rowHTML);
}

// Határátlépés sor eltávolítása
function removeCrossingRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) row.remove();
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

// Bejegyzés szerkesztése (MINDEN JAVÍTÁST TARTALMAZ)
function editRecord(id) {
    const record = records.find(r => r.id === String(id));
    if (!record) return;

    editingId = String(id);
    showTab('full-day');
    
    // Alap adatok betöltése
    document.getElementById('date').value = record.date || '';
    document.getElementById('startTime').value = record.startTime || '';
    document.getElementById('endTime').value = record.endTime || '';
    document.getElementById('startLocation').value = record.startLocation || '';
    document.getElementById('endLocation').value = record.endLocation || '';
    
    // JAVÍTÁS: Heti vezetési idők betöltése
    document.getElementById('weeklyDriveStart').value = record.weeklyDriveStartStr || '';
    document.getElementById('weeklyDriveEnd').value = record.weeklyDriveEndStr || '';
    
    document.getElementById('kmStart').value = record.kmStart || '';
    document.getElementById('kmEnd').value = record.kmEnd || '';
    document.getElementById('compensationTime').value = record.compensationMinutes ? formatAsHoursAndMinutes(record.compensationMinutes) : '';
    
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        splitRestToggle.checked = record.isSplitRest || false;
    }

    // JAVÍTÁS: Határátlépések betöltése
    const crossingsContainer = document.getElementById('crossingsContainer');
    if (crossingsContainer) {
        crossingsContainer.innerHTML = '';
        if (record.crossings && Array.isArray(record.crossings)) {
            record.crossings.forEach(crossing => {
                addCrossingRow(crossing.from, crossing.to, crossing.time);
            });
        }
    }

    // Számított mezők frissítése
    updateDisplays();
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