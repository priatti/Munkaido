import { state, setInProgressEntry } from '../state.js';
import { saveRecord } from '../services/database.js';
import { showAlert } from '../utils/domHelpers.js';
import { formatDuration, formatTimeInput, fetchCountryCodeFor } from '../utils/helpers.js';
import { calculateWorkMinutes, calculateNightWorkMinutes, parseTimeToMinutes } from '../utils/calculations.js';
import { showTab } from './navigation.js';

let isFormPopulatedFromLive = false;

/**
 * Betölti az utolsó mentett bejegyzés adatait vagy a folyamatban lévő műszakot az űrlapba.
 */
export function loadLastValues() {
    if (state.inProgressEntry) {
        populateFormFromLiveEntry();
        isFormPopulatedFromLive = true;
        return;
    }
    isFormPopulatedFromLive = false;
    resetEntryForm();

    const lastRecord = state.records.length > 0 ? [...state.records].sort((a, b) => new Date(`${b.date}T${b.startTime}`) - new Date(`${a.date}T${a.startTime}`))[0] : null;

    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    if (lastRecord) {
        document.getElementById('weeklyDriveStart').value = lastRecord.weeklyDriveEndStr || '';
        document.getElementById('kmStart').value = lastRecord.kmEnd || '';
        document.getElementById('startLocation').value = lastRecord.endLocation || '';
    }
}

function populateFormFromLiveEntry() {
    resetEntryForm();
    const entry = state.inProgressEntry;
    Object.keys(entry).forEach(key => {
        const el = document.getElementById(key.replace('Str', ''));
        if (el) el.value = entry[key] || '';
    });
    
    document.getElementById('endTime').value = new Date().toTimeString().slice(0, 5);
    (entry.crossings || []).forEach(c => addCrossingRow(c.from, c.to, c.time));
    updateDisplays();
    document.getElementById('endTime').focus();
}

function updateDisplays() {
    if (!window.translations) return;
    const i18n = window.translations;
    
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const weeklyStart = document.getElementById('weeklyDriveStart').value;
    const weeklyEnd = document.getElementById('weeklyDriveEnd').value;
    const kmStart = parseInt(document.getElementById('kmStart').value) || 0;
    const kmEnd = parseInt(document.getElementById('kmEnd').value) || 0;
    
    // Munkaidő számítás és megjelenítés
    if (startTime && endTime) {
        const workMinutes = calculateWorkMinutes(startTime, endTime);
        const nightMinutes = calculateNightWorkMinutes(startTime, endTime);
        
        const workDisplay = document.getElementById('workTimeDisplay');
        const nightDisplay = document.getElementById('nightWorkDisplay');
        
        if (workDisplay) {
            workDisplay.textContent = `${i18n.workTimeDisplay}: ${formatDuration(workMinutes)}`;
        }
        if (nightDisplay) {
            nightDisplay.textContent = `${i18n.nightWorkDisplay}: ${formatDuration(nightMinutes)}`;
        }
    }
    
    // Vezetési idő számítás és megjelenítés
    if (weeklyStart && weeklyEnd) {
        const driveMinutes = parseTimeToMinutes(weeklyEnd) - parseTimeToMinutes(weeklyStart);
        const driveDisplay = document.getElementById('driveTimeDisplay');
        if (driveDisplay) {
            driveDisplay.textContent = `${i18n.driveTimeTodayDisplay || 'Mai vezetési idő'}: ${formatDuration(Math.max(0, driveMinutes))}`;
        }
    }
    
    // Kilométer számítás és megjelenítés
    if (kmStart && kmEnd) {
        const kmDriven = Math.max(0, kmEnd - kmStart);
        const kmDisplay = document.getElementById('kmDisplay');
        if (kmDisplay) {
            kmDisplay.textContent = `${i18n.kmDrivenDisplay || 'Megtett km'}: ${kmDriven} km`;
        }
    }
}

export function addCrossingRow(from = '', to = '', time = '') {
    const container = document.getElementById('crossingsContainer');
    if (!container) return;
    
    const crossingDiv = document.createElement('div');
    crossingDiv.className = 'crossing-row grid grid-cols-[1fr_1fr_auto] gap-2 items-center mb-2';
    crossingDiv.innerHTML = `
        <input type="text" placeholder="Honnan" value="${from}" class="crossing-from w-full p-2 border rounded text-sm uppercase">
        <input type="text" placeholder="Hova" value="${to}" class="crossing-to w-full p-2 border rounded text-sm uppercase">
        <button type="button" class="remove-crossing bg-red-500 text-white p-2 rounded text-sm hover:bg-red-600">🗑️</button>
        <input type="time" value="${time}" class="crossing-time w-full p-2 border rounded text-sm col-span-2">
    `;
    
    container.appendChild(crossingDiv);
    
    // Eseménykezelő a törléshez
    crossingDiv.querySelector('.remove-crossing').addEventListener('click', () => {
        crossingDiv.remove();
    });
}

function resetEntryForm() {
    const fields = ['date', 'startTime', 'endTime', 'startLocation', 'endLocation', 
                   'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime'];
    
    fields.forEach(field => {
        const el = document.getElementById(field);
        if (el) el.value = '';
    });
    
    const container = document.getElementById('crossingsContainer');
    if (container) container.innerHTML = '';
    
    const splitRestCheckbox = document.getElementById('toggleSplitRest');
    if (splitRestCheckbox) splitRestCheckbox.checked = false;
    
    updateDisplays();
}

export async function saveEntry() {
    if (!window.translations) return;
    const i18n = window.translations;
    
    // Alapvető mezők ellenőrzése
    const date = document.getElementById('date').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    if (!date || !startTime || !endTime) {
        showAlert(i18n.alertMandatoryFields, 'info');
        return;
    }
    
    // Adatok összegyűjtése
    const record = {
        id: state.editingId || String(Date.now()),
        date,
        startTime,
        endTime,
        startLocation: document.getElementById('startLocation').value || '',
        endLocation: document.getElementById('endLocation').value || '',
        weeklyDriveStartStr: document.getElementById('weeklyDriveStart').value || '',
        weeklyDriveEndStr: document.getElementById('weeklyDriveEnd').value || '',
        kmStart: parseInt(document.getElementById('kmStart').value) || 0,
        kmEnd: parseInt(document.getElementById('kmEnd').value) || 0,
        compensationTimeStr: document.getElementById('compensationTime').value || '',
        isSplitRest: document.getElementById('toggleSplitRest').checked,
        crossings: []
    };
    
    // Validációk
    if (record.kmEnd > 0 && record.kmEnd < record.kmStart) {
        showAlert(i18n.alertKmEndLower, 'info');
        return;
    }
    
    const weeklyStartMinutes = parseTimeToMinutes(record.weeklyDriveStartStr);
    const weeklyEndMinutes = parseTimeToMinutes(record.weeklyDriveEndStr);
    if (weeklyEndMinutes > 0 && weeklyEndMinutes < weeklyStartMinutes) {
        showAlert(i18n.alertWeeklyDriveEndLower, 'info');
        return;
    }
    
    // Határátlépések összegyűjtése
    document.querySelectorAll('.crossing-row').forEach(row => {
        const from = row.querySelector('.crossing-from').value.trim().toUpperCase();
        const to = row.querySelector('.crossing-to').value.trim().toUpperCase();
        const time = row.querySelector('.crossing-time').value;
        if (from && to && time) {
            record.crossings.push({ from, to, time });
        }
    });
    
    // Számítások
    record.workMinutes = calculateWorkMinutes(startTime, endTime);
    record.nightWorkMinutes = calculateNightWorkMinutes(startTime, endTime);
    record.driveMinutes = Math.max(0, weeklyEndMinutes - weeklyStartMinutes);
    record.kmDriven = Math.max(0, record.kmEnd - record.kmStart);
    
    // Kompenzáció levonása, ha van
    if (record.compensationTimeStr) {
        const compensationMinutes = parseTimeToMinutes(record.compensationTimeStr);
        record.workMinutes = Math.max(0, record.workMinutes - compensationMinutes);
    }
    
    // Figyelmeztetés nulla értékekre
    if ((record.driveMinutes === 0 || record.kmDriven === 0) && (record.weeklyDriveEndStr || record.kmEnd > 0)) {
        const confirmed = await new Promise(resolve => {
            showAlert(i18n.alertConfirmZeroValues, 'warning', () => resolve(true));
            // Ha nem erősítik meg, akkor false
            setTimeout(() => resolve(false), 100);
        });
        if (!confirmed) return;
    }
    
    // Mentés
    if (state.editingId) {
        const index = state.records.findIndex(r => r.id === state.editingId);
        if (index >= 0) state.records[index] = record;
        state.editingId = null;
    } else {
        state.records.push(record);
    }
    
    await saveRecord(record);
    
    // Folyamatban lévő bejegyzés törlése, ha ez az volt
    if (state.inProgressEntry && state.inProgressEntry.date === record.date) {
        setInProgressEntry(null);
    }
    
    showAlert(i18n.alertSaveSuccess, 'success');
    showTab('list');
}

export function initializeFullDayView() {
    // Mentés gomb eseménykezelő
    const saveBtn = document.getElementById('saveEntryBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveEntry);
    }
    
    // Határátlépés hozzáadása gomb
    const addCrossingBtn = document.getElementById('addCrossingBtn');
    if (addCrossingBtn) {
        addCrossingBtn.addEventListener('click', () => addCrossingRow());
    }
    
    // GPS helyszín lekérése gomb
    const fetchLocationBtn = document.getElementById('fetchLocationBtn');
    if (fetchLocationBtn) {
        fetchLocationBtn.addEventListener('click', () => fetchCountryCodeFor('endLocation'));
    }
    
    // Idő mezők változásának figyelése
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const weeklyStartInput = document.getElementById('weeklyDriveStart');
    const weeklyEndInput = document.getElementById('weeklyDriveEnd');
    const kmStartInput = document.getElementById('kmStart');
    const kmEndInput = document.getElementById('kmEnd');
    
    if (startTimeInput) startTimeInput.addEventListener('change', updateDisplays);
    if (endTimeInput) endTimeInput.addEventListener('change', updateDisplays);
    if (weeklyStartInput) {
        weeklyStartInput.addEventListener('blur', (e) => {
            formatTimeInput(e.target, true);
            updateDisplays();
        });
    }
    if (weeklyEndInput) {
        weeklyEndInput.addEventListener('blur', (e) => {
            formatTimeInput(e.target, true);
            updateDisplays();
        });
    }
    if (kmStartInput) kmStartInput.addEventListener('input', updateDisplays);
    if (kmEndInput) kmEndInput.addEventListener('input', updateDisplays);
    
    // Kompenzáció idő formázás
    const compensationInput = document.getElementById('compensationTime');
    if (compensationInput) {
        compensationInput.addEventListener('blur', (e) => {
            formatTimeInput(e.target, false);
            updateDisplays();
        });
    }
}
