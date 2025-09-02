import { state, setInProgressEntry } from '../state.js';
import { saveRecord } from '../services/database.js';
import { showAlert } from '../utils/domHelpers.js';
import { formatDuration, formatTimeInput, fetchCountryCodeFor } from '../utils/helpers.js';
import { calculateWorkMinutes, calculateNightWorkMinutes, parseTimeToMinutes } from '../utils/calculations.js';
import { showTab } from './navigation.js';

let isFormPopulatedFromLive = false;

/**
 * Betölti az utolsó mentett bejegyzés releváns adatait az űrlapba
 * (pl. záró km -> kezdő km, záró hely -> kezdő hely).
 */
export function loadLastValues() {
    // Ha a felhasználó a "Műszak befejezése" gombbal jött ide,
    // akkor a folyamatban lévő műszak adataival töltjük fel az űrlapot.
    if (state.inProgressEntry) {
        populateFormFromLiveEntry();
        isFormPopulatedFromLive = true;
        return;
    }
    isFormPopulatedFromLive = false;
    resetEntryForm();

    const lastRecord = state.records.length > 0 ? state.records.sort((a, b) => new Date(`${b.date}T${b.startTime}`) - new Date(`${a.date}T${a.startTime}`))[0] : null;

    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    if (lastRecord) {
        document.getElementById('weeklyDriveStart').value = lastRecord.weeklyDriveEndStr || '';
        document.getElementById('kmStart').value = lastRecord.kmEnd || '';
        document.getElementById('startLocation').value = lastRecord.endLocation || '';
    }
}

/**
 * Feltölti az űrlapot a folyamatban lévő műszak adataival.
 */
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

/**
 * Frissíti a számított értékeket (munkaidő, vezetési idő, km) az űrlapon.
 */
function updateDisplays() {
    const i18n = window.translations[state.currentLang];
    const workMinutes = calculateWorkMinutes(document.getElementById('startTime').value, document.getElementById('endTime').value);
    document.getElementById('workTimeDisplay').textContent = workMinutes > 0 ? `${i18n.workTimeDisplay}: ${formatDuration(workMinutes)}` : '';

    const nightMinutes = calculateNightWorkMinutes(document.getElementById('startTime').value, document.getElementById('endTime').value);
    document.getElementById('nightWorkDisplay').textContent = nightMinutes > 0 ? `${i18n.nightWorkDisplay}: ${formatDuration(nightMinutes)}` : '';

    const driveMinutes = Math.max(0, parseTimeToMinutes(document.getElementById('weeklyDriveEnd').value) - parseTimeToMinutes(document.getElementById('weeklyDriveStart').value));
    document.getElementById('driveTimeDisplay').textContent = driveMinutes > 0 ? `${i18n.driveTimeTodayDisplay}: ${formatDuration(driveMinutes)}` : '';

    const kmDriven = Math.max(0, (parseFloat(document.getElementById('kmEnd').value) || 0) - (parseFloat(document.getElementById('kmStart').value) || 0));
    document.getElementById('kmDisplay').textContent = kmDriven > 0 ? `${i18n.kmDrivenDisplay}: ${kmDriven} km` : '';
}

/**
 * Hozzáad egy új sort a határátlépésekhez.
 * @param {string} from - Honnan (opcionális).
 * @param {string} to - Hova (opcionális).
 * @param {string} time - Idő (opcionális).
 */
export function addCrossingRow(from = '', to = '', time = '') {
    const i18n = window.translations[state.currentLang];
    const container = document.getElementById('crossingsContainer');
    const index = Date.now();
    const newRow = document.createElement('div');
    newRow.className = 'border-t pt-3 mt-2 space-y-2';
    newRow.innerHTML = `<div class="grid grid-cols-2 gap-2"><div><input type="text" value="${from}" placeholder="${i18n.fromPlaceholder}" class="w-full p-2 border rounded text-sm uppercase"></div><div><div class="flex"><input type="text" value="${to}" placeholder="${i18n.toPlaceholder}" class="w-full p-2 border rounded-l text-sm uppercase"><button type="button" class="bg-blue-500 text-white p-2 rounded-r text-xs" title="${i18n.getCountryCodeGPS}">📍</button></div></div></div><div class="grid grid-cols-2 gap-2"><input type="time" value="${time}" class="w-full p-2 border rounded text-sm"><button class="bg-red-500 text-white p-2 rounded text-sm hover:bg-red-600">${i18n.delete}</button></div>`;
    
    newRow.querySelector('button.bg-red-500').onclick = () => newRow.remove();
    newRow.querySelector('button.bg-blue-500').onclick = (e) => {
        const toInput = e.target.previousElementSibling;
        fetchCountryCodeFor(toInput.id = `crossTo-${index}`);
    };
    container.appendChild(newRow);
}

/**
 * Kiüríti a teljes űrlapot.
 */
function resetEntryForm() {
    ['date', 'startTime', 'endTime', 'startLocation', 'endLocation', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    document.getElementById('toggleSplitRest').checked = false;
    document.getElementById('crossingsContainer').innerHTML = '';
    state.editingId = null;
    updateDisplays();
}

/**
 * Elmenti a bejegyzést az űrlap adatai alapján.
 */
export async function saveEntry() {
    const i18n = window.translations[state.currentLang];
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
        crossings: Array.from(document.querySelectorAll('#crossingsContainer > div')).map(row => ({
            from: row.querySelector('input[placeholder="' + i18n.fromPlaceholder + '"]').value.trim().toUpperCase(),
            to: row.querySelector('input[placeholder="' + i18n.toPlaceholder + '"]').value.trim().toUpperCase(),
            time: row.querySelector('input[type="time"]').value
        })).filter(c => c.from && c.to && c.time)
    };

    if (!recordData.date || !recordData.startTime || !recordData.endTime) { showAlert(i18n.alertMandatoryFields, 'info'); return; }
    if (recordData.kmEnd > 0 && recordData.kmEnd < recordData.kmStart) { showAlert(i18n.alertKmEndLower, 'info'); return; }

    const compensationMinutes = parseTimeToMinutes(recordData.compensationTime) || 0;
    const newRecord = {
        ...recordData,
        id: state.editingId || String(Date.now()),
        workMinutes: Math.max(0, calculateWorkMinutes(recordData.startTime, recordData.endTime) - compensationMinutes),
        compensationMinutes: compensationMinutes,
        nightWorkMinutes: calculateNightWorkMinutes(recordData.startTime, recordData.endTime),
        driveMinutes: Math.max(0, parseTimeToMinutes(recordData.weeklyDriveEndStr) - parseTimeToMinutes(recordData.weeklyDriveStartStr)),
        kmDriven: Math.max(0, recordData.kmEnd - recordData.kmStart)
    };

    const proceedWithSave = async () => {
        if (state.editingId) {
            state.records = state.records.map(r => r.id === state.editingId ? newRecord : r);
        } else {
            state.records.push(newRecord);
        }
        await saveRecord(newRecord);

        showAlert(i18n.alertSaveSuccess, 'success', () => {
            if (isFormPopulatedFromLive) {
                setInProgressEntry(null);
            }
            resetEntryForm();
            showTab('list');
        });
    };

    if (newRecord.driveMinutes === 0 || newRecord.kmDriven === 0) {
        showAlert(i18n.alertConfirmZeroValues, 'warning', proceedWithSave);
    } else {
        proceedWithSave();
    }
}