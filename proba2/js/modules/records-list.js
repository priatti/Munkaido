// Records List Module v9.00
class RecordsListManager {
    constructor() {
        this.init();
    }

    init() {
        // Listen for record updates
        window.appState.on('change:records', () => {
            if (window.appState.getCurrentTab() === 'list') {
                this.renderRecords();
            }
        });

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            if (window.appState.getCurrentTab() === 'list') {
                this.renderRecords();
            }
        });
    }

    renderRecords() {
        const container = domUtils.getElement('recordsContent');
        if (!container) return;

        const records = window.appState.getState('records') || [];
        const locale = window.i18n.getDateLocale();

        if (records.length === 0) {
            container.innerHTML = `
                <p class="text-center text-gray-500 py-8">
                    ${window.i18n.translate('noEntries')}
                </p>
            `;
            return;
        }

        const sortedRecords = dataUtils.getSortedRecords(records);
        container.innerHTML = sortedRecords.map(record => this.renderRecord(record, locale)).join('');
    }

    renderRecord(record, locale) {
        const date = new Date(record.date);
        const dayOfWeek = date.getUTCDay();
        const weekendClass = (dayOfWeek === 6 || dayOfWeek === 0) ? 'bg-red-50 dark:bg-red-900/20' : '';
        
        const isOvernight = new Date(`1970-01-01T${record.endTime}`) < new Date(`1970-01-01T${record.startTime}`);
        
        const endDate = new Date(record.date + 'T00:00:00');
        let startDate = new Date(record.date + 'T00:00:00');
        
        if (isOvernight) {
            startDate.setDate(startDate.getDate() - 1);
        }

        const formatShortDate = (dt) => dt.toLocaleDateString(locale, { month: '2-digit', day: '2-digit' });

        const dateDisplay = isOvernight ? 
            `${startDate.toLocaleDateString(locale)} - ${endDate.toLocaleDateString(locale)}` :
            endDate.toLocaleDateString(locale);

        const departureDisplay = isOvernight ? 
            `${formatShortDate(startDate)} ${record.startTime} (${record.startLocation || "N/A"})` :
            `${record.startTime} (${record.startLocation || "N/A"})`;

        const arrivalDisplay = `${formatShortDate(endDate)} ${record.endTime} (${record.endLocation || "N/A"})`;

        const compensationHTML = record.compensationMinutes > 0 ? `
            <div class="flex justify-between text-yellow-700 dark:text-yellow-300 text-xs">
                <span>&nbsp;&nbsp;└ ${window.i18n.translate('entryCompensation')}:</span>
                <span>-${timeUtils.formatDuration(record.compensationMinutes)}</span>
            </div>
        ` : '';

        const crossingsHTML = (record.crossings && record.crossings.length > 0) ? `
            <div class="border-t pt-2 mt-2">
                <p class="font-semibold text-xs text-indigo-700 dark:text-indigo-300">
                    ${window.i18n.translate('entryCrossingsLabel')}:
                </p>
                <div class="text-xs text-gray-600 dark:text-gray-400 pl-2">
                    ${record.crossings.map(c => `<span>${c.from} - ${c.to} (${c.time})</span>`).join("<br>")}
                </div>
            </div>
        ` : '';

        return `
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3 text-sm ${weekendClass}">
                <div class="flex items-center justify-between mb-2">
                    <div class="font-semibold text-gray-800 dark:text-gray-200">${dateDisplay}</div>
                    <div>
                        <button onclick="editRecord('${record.id}')" 
                                class="text-blue-500 hover:text-blue-700 p-1" 
                                title="${window.i18n.translate('edit')}">✏️</button>
                        <button onclick="deleteRecord('${record.id}')" 
                                class="text-red-500 hover:text-red-700 p-1" 
                                title="${window.i18n.translate('delete')}">🗑️</button>
                    </div>
                </div>
                <div class="space-y-1">
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">${window.i18n.translate('entryDeparture')}:</span>
                        <span class="text-gray-800 dark:text-gray-200">${departureDisplay}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">${window.i18n.translate('entryArrival')}:</span>
                        <span class="text-gray-800 dark:text-gray-200">${arrivalDisplay}</span>
                    </div>
                    <div class="flex justify-between border-t pt-1 mt-1">
                        <span class="text-gray-600 dark:text-gray-400">${window.i18n.translate('entryWorkTime')}:</span>
                        <span class="font-bold text-green-600 dark:text-green-400">${timeUtils.formatDuration(record.workMinutes)}</span>
                    </div>
                    ${compensationHTML}
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">${window.i18n.translate('entryNightTime')}:</span>
                        <span class="text-purple-600 dark:text-purple-400">${timeUtils.formatDuration(record.nightWorkMinutes || 0)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">${window.i18n.translate('entryDriveTime')}:</span>
                        <span class="text-blue-700 dark:text-blue-400">${timeUtils.formatDuration(record.driveMinutes)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">${window.i18n.translate('entryDistance')}:</span>
                        <span class="text-orange-600 dark:text-orange-400">${record.kmDriven} km</span>
                    </div>
                    ${crossingsHTML}
                </div>
            </div>
        `;
    }

    async deleteRecord(id) {
        const confirmDelete = confirm(window.i18n.translate('alertConfirmDelete'));
        if (!confirmDelete) return;

        try {
            // Clean up related data
            const splitData = storageUtils.getSplitRestData();
            delete splitData[id];
            storageUtils.saveSplitRestData(splitData);

            const weeklyData = storageUtils.getWeeklyRestData();
            delete weeklyData[id];
            storageUtils.saveWeeklyRestData(weeklyData);

            // Delete the record
            await window.storageManager.deleteRecord(id);

            // Show success message and refresh list
            window.uiManager.showAlert(window.i18n.translate('deleteSuccess'), 'success');
            this.renderRecords();
        } catch (error) {
            console.error('Error deleting record:', error);
            window.uiManager.showAlert(window.i18n.translate('alertSaveToCloudError'), 'info');
        }
    }
}

// Initialize records list module
window.recordsModule = new RecordsListManager();

// Global functions for HTML onclick handlers
window.deleteRecord = (id) => window.recordsModule.deleteRecord(id);
