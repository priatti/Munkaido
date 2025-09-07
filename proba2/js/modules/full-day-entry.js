// Full Day Entry Module v9.00
class FullDayEntryManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupFormValidation();
    }

    setupEventListeners() {
        // Auto-update displays when form values change
        const watchFields = ['startTime', 'endTime', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd'];
        watchFields.forEach(fieldId => {
            const element = domUtils.getElement(fieldId);
            if (element) {
                element.addEventListener('input', () => this.updateDisplays());
            }
        });

        // Listen for storage initialization
        window.addEventListener('storageInitialized', () => {
            this.loadLastValues();
        });
    }

    setupFormValidation() {
        // Add blur event listeners for time formatting
        const timeFields = [
            { id: 'startTime', allowOver24: false },
            { id: 'endTime', allowOver24: false },
            { id: 'weeklyDriveStart', allowOver24: true },
            { id: 'weeklyDriveEnd', allowOver24: true },
            { id: 'compensationTime', allowOver24: true },
            { id: 'liveCrossTime', allowOver24: false }
        ];

        timeFields.forEach(field => {
            const element = domUtils.getElement(field.id);
            if (element) {
                element.addEventListener('blur', () => {
                    timeUtils.formatTimeInput(element, field.allowOver24);
                });
            }
        });
    }

    updateDisplays() {
        const startTime = domUtils.getElementValue('startTime');
        const endTime = domUtils.getElementValue('endTime');
        const weeklyDriveStart = domUtils.getElementValue('weeklyDriveStart');
        const weeklyDriveEnd = domUtils.getElementValue('weeklyDriveEnd');
        const kmStart = parseFloat(domUtils.getElementValue('kmStart')) || 0;
        const kmEnd = parseFloat(domUtils.getElementValue('kmEnd')) || 0;

        // Work time display
        const workMinutes = timeUtils.calculateWorkMinutes(startTime, endTime);
        const workTimeDisplay = domUtils.getElement('workTimeDisplay');
        if (workTimeDisplay) {
            workTimeDisplay.textContent = workMinutes > 0 ? 
                `${window.i18n.translate('workTimeDisplay')}: ${timeUtils.formatDuration(workMinutes)}` : '';
        }

        // Night work display
        const nightMinutes = timeUtils.calculateNightWorkMinutes(startTime, endTime);
        const nightWorkDisplay = domUtils.getElement('nightWorkDisplay');
        if (nightWorkDisplay) {
            nightWorkDisplay.textContent = nightMinutes > 0 ? 
                `${window.i18n.translate('nightWorkDisplay')}: ${timeUtils.formatDuration(nightMinutes)}` : '';
        }

        // Drive time display
        const driveMinutes = Math.max(0, 
            timeUtils.parseTimeToMinutes(weeklyDriveEnd) - timeUtils.parseTimeToMinutes(weeklyDriveStart)
        );
        const driveTimeDisplay = domUtils.getElement('driveTimeDisplay');
        if (driveTimeDisplay) {
            driveTimeDisplay.textContent = driveMinutes > 0 ? 
                `${window.i18n.translate('driveTimeTodayDisplay')}: ${timeUtils.formatDuration(driveMinutes)}` : '';
        }

        // KM display
        const kmDriven = Math.max(0, kmEnd - kmStart);
        const kmDisplay = domUtils.getElement('kmDisplay');
        if (kmDisplay) {
            kmDisplay.textContent = kmDriven > 0 ? 
                `${window.i18n.translate('kmDrivenDisplay')}: ${kmDriven} km` : '';
        }
    }

    loadLastValues() {
        const records = window.appState.getState('records') || [];
        const lastRecord = dataUtils.getLatestRecord(records);
        const now = new Date();

        domUtils.setElementValue('date', now.toISOString().split('T')[0]);

        if (lastRecord) {
            domUtils.setElementValue('weeklyDriveStart', lastRecord.weeklyDriveEndStr || '');
            domUtils.setElementValue('kmStart', lastRecord.kmEnd || '');
            domUtils.setElementValue('startLocation', lastRecord.endLocation || '');
        }
    }

    resetEntryForm() {
        const fieldIds = [
            'date', 'startTime', 'endTime', 'startLocation', 'endLocation',
            'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime'
        ];

        fieldIds.forEach(id => domUtils.setElementValue(id, ''));

        const splitRestToggle = domUtils.getElement('toggleSplitRest');
        if (splitRestToggle) {
            splitRestToggle.checked = false;
            window.uiManager.updateToggleVisuals(splitRestToggle);
        }

        const crossingsContainer = domUtils.getElement('crossingsContainer');
        if (crossingsContainer) {
            crossingsContainer.innerHTML = '';
        }

        window.appState.setEditingId(null);
        this.updateDisplays();
    }

    addCrossingRow(from = '', to = '', time = '') {
        const container = domUtils.getElement('crossingsContainer');
        if (!container) return;

        const lastToInput = container.querySelector('input[id^="crossTo-"]:last-of-type');
        const newFrom = from || (lastToInput ? lastToInput.value.toUpperCase() : '');
        const index = Date.now();

        const newRow = document.createElement('div');
        newRow.className = 'border-t pt-3 mt-2 space-y-2';
        newRow.innerHTML = `
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <input type="text" id="crossFrom-${index}" value="${newFrom}" 
                           placeholder="${window.i18n.translate('fromPlaceholder')}" 
                           class="w-full p-2 border rounded text-sm uppercase">
                </div>
                <div>
                    <div class="flex">
                        <input type="text" id="crossTo-${index}" value="${to}" 
                               placeholder="${window.i18n.translate('toPlaceholder')}" 
                               class="w-full p-2 border rounded-l text-sm uppercase">
                        <button type="button" onclick="geoUtils.fetchCountryCodeFor('crossTo-${index}')" 
                                class="bg-blue-500 text-white p-2 rounded-r text-xs" 
                                title="${window.i18n.translate('getCountryCodeGPS')}">📍</button>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <input type="time" id="crossTime-${index}" value="${time}" 
                       onblur="timeUtils.formatTimeInput(this)" 
                       class="w-full p-2 border rounded text-sm">
                <button onclick="this.closest('.border-t').remove()" 
                        class="bg-red-500 text-white p-2 rounded text-sm hover:bg-red-600">
                    ${window.i18n.translate('delete')}
                </button>
            </div>
        `;

        container.appendChild(newRow);
