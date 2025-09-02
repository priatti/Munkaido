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
export function loadLastValues() { // <-- ITT VAN A HIÁNYZÓ EXPORT
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
    // ... a függvény többi része változatlan
}

export function addCrossingRow(from = '', to = '', time = '') {
    // ... a függvény többi része változatlan
}

function resetEntryForm() {
    // ... a függvény többi része változatlan
}

export async function saveEntry() {
    // ... a függvény többi része változatlan
}

export function initializeFullDayView() {
    // Ide jönnek az eseménykezelők, pl. a "Mentés" gombhoz
}
