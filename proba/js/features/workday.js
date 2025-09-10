// =======================================================
// ===== MUNKANAP RÖGZÍTÉSE (FEATURE) ====================
// =======================================================

// Új munkanap indítása ("Indítás" fül)
function startLiveShift() {
    inProgressEntry = {
        date: document.getElementById('liveStartDate').value,
        startTime: document.getElementById('liveStartTime').value,
        startLocation: document.getElementById('liveStartLocation').value.trim(),
        weeklyDriveStartStr: document.getElementById('liveWeeklyDriveStart').value.trim(),
        kmStart: parseFloat(document.getElementById('liveStartKm').value) || 0,
        crossings: []
    };
    if (!inProgressEntry.date || !inProgressEntry.startTime) {
        showCustomAlert(translations[currentLang].alertMandatoryFields, "info");
        return;
    }
    localStorage.setItem('inProgressEntry', JSON.stringify(inProgressEntry));
    showTab('start');
    renderLiveTabView();
    updateAllTexts();
}

// Határátlépés hozzáadása a folyamatban lévő műszakhoz
function addLiveCrossing() {
    const from = document.getElementById('liveCrossFrom').value.trim().toUpperCase();
    const to = document.getElementById('liveCrossTo').value.trim().toUpperCase();
    const time = document.getElementById('liveCrossTime').value;
    if (!from || !to || !time) {
        showCustomAlert(translations[currentLang].alertFillAllFields, "info");
        return;
    }
    inProgressEntry.crossings.push({ from, to, time });
    localStorage.setItem('inProgressEntry', JSON.stringify(inProgressEntry));
    renderStartTab();
    updateAllTexts();
}

// A folyamatban lévő műszak befejezése (átirányít a "Teljes nap" fülre)
function finalizeShift() {
    showTab('full-day');
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    Object.keys(inProgressEntry).forEach(key => {
        const el = document.getElementById(key.replace('Str', ''));
        if (el) el.value = inProgressEntry[key];
    });
    (inProgressEntry.crossings || []).forEach(c => addCrossingRow(c.from, c.to, c.time));
    document.getElementById('endTime').focus();
}

// Folyamatban lévő műszak elvetése
function discardShift() {
    showCustomAlert(translations[currentLang].alertConfirmDelete, 'warning', () => {
        localStorage.removeItem('inProgressEntry');
        inProgressEntry = null;
        renderStartTab();
        renderLiveTabView();
        updateAllTexts();
    });
}

// A teljes munkanap bejegyzés mentése
async function saveEntry() {
    const i18n = translations[currentLang];
    const recordData = {
        date: document.getElementById('date').value,
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        startLocation: document.getElementById('startLocation').value.trim(),
        endLocation: document.getElementById('endLocation').value.trim(),
        weeklyDriveStartStr: document.getElementById('weeklyDriveStart').value.trim(),
        weeklyDriveEndStr: document.getElementById('weeklyDriveEnd').value.trim(),
        kmStart: parseFloat(document.getElementById('kmStart').value) || 0,
        kmEnd: parseFloat(document.getElementById('kmEnd').value) || 0,
        compensationTime: document.getElementById('compensationTime').value.trim(),
        isSplitRest: document.getElementById('toggleSplitRest').checked,
        crossings: Array.from(document.querySelectorAll('#crossingsContainer .border-t')).map(row => ({
            from: row.querySelector(`input[id^="crossFrom-"]`).value.trim().toUpperCase(),
            to: row.querySelector(`input[id^="crossTo-"]`).value.trim().toUpperCase(),
            time: row.querySelector(`input[id^="crossTime-"]`).value
        })).filter(c => c.from && c.to && c.time)
    };

    if (!recordData.date || !recordData.startTime || !recordData.endTime) {
        showCustomAlert(i18n.alertMandatoryFields, 'info');
        return;
    }

    const endDateTime = new Date(`${recordData.date}T${recordData.endTime}`);
    let startDateTime = new Date(`${recordData.date}T${recordData.startTime}`);
    if (endDateTime < startDateTime) {
        startDateTime.setDate(startDateTime.getDate() - 1);
    }
    const isDateRollover = startDateTime.getDay() === 0 && endDateTime.getDay() === 1;

    const finalizeSave = async (driveMinutes) => {
        const compensationMinutes = parseTimeToMinutes(recordData.compensationTime) || 0;
        const grossWorkMinutes = calculateWorkMinutes(recordData.startTime, recordData.endTime);

        const newRecord = {
            ...recordData,
            id: editingId || String(Date.now()),
            workMinutes: Math.max(0, grossWorkMinutes - compensationMinutes),
            compensationMinutes: compensationMinutes,
            nightWorkMinutes: calculateNightWorkMinutes(recordData.startTime, recordData.endTime),
            driveMinutes: driveMinutes,
            kmDriven: Math.max(0, recordData.kmEnd - recordData.kmStart)
        };
        
        const splitData = getSplitRestData();
        if (newRecord.isSplitRest) {
            splitData[newRecord.id] = true;
        } else {
            delete splitData[newRecord.id];
        }
        saveSplitRestData(splitData);

        await saveWorkRecord(newRecord);
        showCustomAlert(i18n.alertSaveSuccess, 'success', () => {
            if (inProgressEntry && editingId === null) {
                localStorage.removeItem('inProgressEntry');
                inProgressEntry = null;
            }
            editingId = null;
            showTab('list');
        });
    };

    if (isDateRollover) {
        const tachoIcon = `<svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        showCustomPrompt(i18n.alertRolloverTitle, i18n.alertRolloverPrompt, i18n.alertRolloverPlaceholder, tachoIcon, async (driveTimeInput) => {
            if (driveTimeInput) {
                const manualMinutes = parseTimeToMinutes(driveTimeInput);
                if (manualMinutes >= 0) {
                    await finalizeSave(manualMinutes);
                }
            }
        });
    } else {
        if (recordData.kmEnd > 0 && recordData.kmEnd < recordData.kmStart) {
            showCustomAlert(i18n.alertKmEndLower, 'info');
            return;
        }
        if (parseTimeToMinutes(recordData.weeklyDriveEndStr) > 0 && parseTimeToMinutes(recordData.weeklyDriveEndStr) < parseTimeToMinutes(recordData.weeklyDriveStartStr)) {
            showCustomAlert(i18n.alertWeeklyDriveEndLower, 'info');
            return;
        }

        const calculatedDriveMinutes = Math.max(0, parseTimeToMinutes(recordData.weeklyDriveEndStr) - parseTimeToMinutes(recordData.weeklyDriveStartStr));
        
        if (calculatedDriveMinutes === 0 || (recordData.kmEnd > 0 && recordData.kmEnd - recordData.kmStart === 0)) {
            showCustomAlert(i18n.alertConfirmZeroValues, 'warning', async () => {
                await finalizeSave(calculatedDriveMinutes);
            });
        } else {
            await finalizeSave(calculatedDriveMinutes);
        }
    }
}

// Új határátlépés sor hozzáadása a "Teljes nap" űrlaphoz
function addCrossingRow(from = '', to = '', time = '') {
    const i18n = translations[currentLang];
    const container = document.getElementById('crossingsContainer');
    const lastToInput = container.querySelector('input[id^="crossTo-"]:last-of-type');
    const newFrom = from || (lastToInput ? lastToInput.value.toUpperCase() : '');
    const index = Date.now();
    const newRow = document.createElement('div');
    newRow.className = 'border-t pt-3 mt-2 space-y-2';
    newRow.innerHTML = `<div class="grid grid-cols-2 gap-2"><div><input type="text" id="crossFrom-${index}" value="${newFrom}" placeholder="${i18n.fromPlaceholder}" class="w-full p-2 border rounded text-sm uppercase"></div><div><div class="flex"><input type="text" id="crossTo-${index}" value="${to}" placeholder="${i18n.toPlaceholder}" class="w-full p-2 border rounded-l text-sm uppercase"><button type="button" onclick="fetchCountryCodeFor('crossTo-${index}')" class="bg-blue-500 text-white p-2 rounded-r text-xs" title="${i18n.getCountryCodeGPS}">📍</button></div></div></div><div class="grid grid-cols-2 gap-2"><input type="time" id="crossTime-${index}" value="${time}" onblur="formatTimeInput(this)" class="w-full p-2 border rounded text-sm"><button onclick="this.closest('.border-t').remove()" class="bg-red-500 text-white p-2 rounded text-sm hover:bg-red-600">${i18n.delete}</button></div>`;
    container.appendChild(newRow);
}

// "Teljes nap" űrlap alaphelyzetbe állítása
function resetEntryForm() {
    ['date', 'startTime', 'endTime', 'startLocation', 'endLocation', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if(splitRestToggle) {
        splitRestToggle.checked = false;
        updateEnhancedToggleVisuals(splitRestToggle); // ENHANCED: Új vizuális kezelés
    }
    document.getElementById('crossingsContainer').innerHTML = '';
    editingId = null;
    updateDisplays();
}

// Utolsó mentett értékek betöltése az űrlapba
function loadLastValues(forLiveForm = false) {
    const lastRecord = getLatestRecord();
    const now = new Date();
    if (forLiveForm) {
        document.getElementById('liveStartDate').value = now.toISOString().split('T')[0];
        document.getElementById('liveStartTime').value = now.toTimeString().slice(0, 5);
        if (lastRecord) {
            document.getElementById('liveStartLocation').value = lastRecord.endLocation || '';
            document.getElementById('liveWeeklyDriveStart').value = lastRecord.weeklyDriveEndStr || '';
            document.getElementById('liveStartKm').value = lastRecord.kmEnd || '';
        } else {
             document.getElementById('liveStartLocation').value = '';
             document.getElementById('liveWeeklyDriveStart').value = '';
             document.getElementById('liveStartKm').value = '';
        }
    } else {
        document.getElementById('date').value = now.toISOString().split('T')[0];
        if (lastRecord) {
            document.getElementById('weeklyDriveStart').value = lastRecord.weeklyDriveEndStr || '';
            document.getElementById('kmStart').value = lastRecord.kmEnd || '';
            document.getElementById('startLocation').value = lastRecord.endLocation || '';
        }
    }
}
