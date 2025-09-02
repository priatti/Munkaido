import { state } from '../state.js';
import { deleteRecord } from '../services/database.js';
import { showAlert } from '../utils/domHelpers.js';
import { formatDuration } from '../utils/helpers.js';
import { showTab } from './navigation.js';

/**
 * Megjeleníti a mentett bejegyzések listáját a "Lista" fülön.
 */
export function renderRecords() {
    const i18n = window.translations[state.currentLang];
    const container = document.getElementById('recordsContent');
    if (!container) return;

    const sortedRecords = [...state.records].sort((a, b) => new Date(`${b.date}T${b.startTime}`) - new Date(`${a.date}T${a.startTime}`));

    if (sortedRecords.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-8">${i18n.noEntries}</p>`;
        return;
    }

    container.innerHTML = sortedRecords.map(r => {
        const d = new Date(r.date);
        const day = d.getUTCDay(); // vasárnap = 0, szombat = 6
        const weekendClass = (day === 6 || day === 0) ? 'bg-red-50 dark:bg-red-900/30' : 'bg-gray-50 dark:bg-gray-800';
        
        const crossingsHTML = (r.crossings && r.crossings.length > 0)
            ? `<div class="border-t pt-2 mt-2"><p class="font-semibold text-xs text-indigo-700 dark:text-indigo-300">${i18n.entryCrossingsLabel}:</p><div class="text-xs text-gray-600 dark:text-gray-400 pl-2">${r.crossings.map(c => `<span>${c.from} → ${c.to} (${c.time})</span>`).join("<br>")}</div></div>`
            : "";

        return `
        <div class="rounded-lg p-3 mb-3 text-sm shadow-sm ${weekendClass}">
            <div class="flex items-center justify-between mb-2">
                <div class="font-semibold text-gray-800 dark:text-gray-100">${d.toLocaleDateString(state.currentLang === 'de' ? 'de-DE' : 'hu-HU')}</div>
                <div>
                    <button data-edit-id="${r.id}" class="text-blue-500 p-1">✏️</button>
                    <button data-delete-id="${r.id}" class="text-red-500 p-1">🗑️</button>
                </div>
            </div>
            <div class="space-y-1">
                <div class="flex justify-between"><span>${i18n.entryDeparture}:</span><span>${r.startTime} (${r.startLocation || "N/A"})</span></div>
                <div class="flex justify-between"><span>${i18n.entryArrival}:</span><span>${r.endTime} (${r.endLocation || "N/A"})</span></div>
                <div class="flex justify-between border-t pt-1 mt-1"><span>${i18n.entryWorkTime}:</span><span class="font-bold">${formatDuration(r.workMinutes)}</span></div>
                ${r.nightWorkMinutes > 0 ? `<div class="flex justify-between"><span>${i18n.entryNightTime}:</span><span class="text-purple-600 dark:text-purple-400">${formatDuration(r.nightWorkMinutes)}</span></div>` : ''}
                ${r.driveMinutes > 0 ? `<div class="flex justify-between"><span>${i18n.entryDriveTime}:</span><span class="text-blue-700 dark:text-blue-300">${formatDuration(r.driveMinutes)}</span></div>` : ''}
                ${r.kmDriven > 0 ? `<div class="flex justify-between"><span>${i18n.entryDistance}:</span><span>${r.kmDriven} km</span></div>` : ''}
                ${crossingsHTML}
            </div>
        </div>`;
    }).join('');
}

/**
 * Kezeli egy bejegyzés szerkesztését.
 * @param {string} id - A szerkesztendő bejegyzés azonosítója.
 */
export function editRecord(id) {
    const record = state.records.find(r => r.id === String(id));
    if (!record) return;

    state.editingId = String(id);
    showTab('full-day'); // Átváltunk a szerkesztő nézetre

    // Feltöltjük az űrlapot a rekord adataival
    Object.keys(record).forEach(key => {
        const el = document.getElementById(key.replace('Str', ''));
        if (el) el.value = record[key] || '';
    });
}

/**
 * Kezeli egy bejegyzés törlését megerősítéssel.
 * @param {string} id - A törlendő bejegyzés azonosítója.
 */
export function deleteRecord_UI(id) {
    const i18n = window.translations[state.currentLang];
    showAlert(i18n.alertConfirmDelete, 'warning', async () => {
        state.records = state.records.filter(r => r.id !== String(id));
        await deleteRecord(id);
        renderRecords(); // Lista újrarajzolása
    });
}