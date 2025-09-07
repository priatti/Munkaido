// Live Tracking Module v9.00
class LiveTrackingManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for storage initialization
        window.addEventListener('storageInitialized', () => {
            this.renderLiveTabView();
        });

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            this.renderLiveTabView();
        });
    }

    renderLiveTabView() {
        const inProgressEntry = window.appState.getState('inProgressEntry');
        const startView = domUtils.getElement('live-start-view');
        const progressView = domUtils.getElement('live-progress-view');

        if (!startView || !progressView) return;

        if (inProgressEntry) {
            this.showProgressView(inProgressEntry);
        } else {
            this.showStartView();
        }
    }

    showStartView() {
        const startView = domUtils.getElement('live-start-view');
        const progressView = domUtils.getElement('live-progress-view');

        if (startView && progressView) {
            progressView.classList.add('hidden');
            startView.classList.remove('hidden');
            this.renderDashboard();
            this.loadLastValues(true);
        }
    }

    showProgressView(inProgressEntry) {
        const startView = domUtils.getElement('live-start-view');
        const progressView = domUtils.getElement('live-progress-view');

        if (startView && progressView) {
            startView.classList.add('hidden');
            progressView.classList.remove('hidden');
            
            this.updateProgressInfo(inProgressEntry);
            this.updateCrossingsList(inProgressEntry);
        }
    }

    updateProgressInfo(inProgressEntry) {
        const startTimeEl = domUtils.getElement('live-start-time');
        if (startTimeEl) {
            const i18n = window.i18n.translate('startedAt');
            startTimeEl.textContent = `${i18n}: ${inProgressEntry.date} ${inProgressEntry.startTime}`;
        }
    }

    updateCrossingsList(inProgressEntry) {
        const liveCrossList = domUtils.getElement('live-crossings-list');
        const liveCrossFrom = domUtils.getElement('liveCrossFrom');

        if (!liveCrossList || !liveCrossFrom) return;

        if (inProgressEntry.crossings && inProgressEntry.crossings.length > 0) {
            const crossingsHTML = inProgressEntry.crossings.map(c => 
                `<div class="flex items-center justify-between bg-white dark:bg-gray-700/50 p-2 rounded-md shadow-sm">
                    <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                        </svg>
                        <span class="font-mono font-bold text-indigo-800 dark:text-indigo-200">${c.from}</span>
                        <span class="text-gray-400">→</span>
                        <span class="font-mono font-bold text-indigo-800 dark:text-indigo-200">${c.to}</span>
                    </div>
                    <span class="text-sm font-mono text-gray-600 dark:text-gray-400">${c.time}</span>
                </div>`
            ).join('');

            liveCrossList.innerHTML = `
                <div class="bg-indigo-50 dark:bg-indigo-900/50 p-3 rounded-lg">
                    <h4 class="font-bold text-indigo-800 dark:text-indigo-200 text-sm mb-2">${window.i18n.translate('recordedCrossings')}</h4>
                    <div class="space-y-2">${crossingsHTML}</div>
                </div>
            `;

            liveCrossFrom.value = inProgressEntry.crossings.slice(-1)[0].to;
        } else {
            liveCrossList.innerHTML = '';
            
            // Get last crossing from previous records
            const records = window.appState.getState('records') || [];
            const lastRecordWithCrossing = dataUtils.getSortedRecords(records)
                .find(r => r.crossings && r.crossings.length > 0);
            
            liveCrossFrom.value = lastRecordWithCrossing ? 
                lastRecordWithCrossing.crossings.slice(-1)[0].to : '';
        }

        // Reset other crossing fields
        domUtils.setElementValue('liveCrossTo', '');
        domUtils.setElementValue('liveCrossTime', new Date().toTimeString().slice(0, 5));
    }

    renderDashboard() {
        const container = domUtils.getElement('dashboard-cards');
        if (!container) return;

        const now = new Date();
        const records = window.appState.getState('records') || [];
        
        const thisWeek = dataUtils.calculateSummaryForDateRange(records, timeUtils.getWeekRange(now));
        const lastWeek = dataUtils.calculateSummaryForDateRange(records, timeUtils.getWeekRange(now, -1));
        const thisMonth = dataUtils.calculateSummaryForMonth(records, now);

        const cards = [
            { 
                labelKey: 'dashboardDriveThisWeek', 
                value: timeUtils.formatDuration(thisWeek.driveMinutes), 
                color: 'blue' 
            },
            { 
                labelKey: 'dashboardWorkThisWeek', 
                value: timeUtils.formatDuration(thisWeek.workMinutes), 
                color: 'green' 
            },
            { 
                labelKey: 'dashboardDistanceThisMonth', 
                value: `${thisMonth.kmDriven} km`, 
                color: 'orange' 
            },
            { 
                labelKey: 'dashboardDistanceLastWeek', 
                value: `${lastWeek.kmDriven} km`, 
                color: 'indigo' 
            }
        ];

        container.innerHTML = cards.map(card => `
            <div class="bg-${card.color}-50 border border-${card.color}-200 rounded-lg p-3 text-center">
                <p class="text-xs text-${card.color}-700 font-semibold">${window.i18n.translate(card.labelKey)}</p>
                <p class="text-lg font-bold text-${card.color}-800 mt-1">${card.value}</p>
            </div>
        `).join('');
    }

    loadLastValues(forLiveForm = false) {
        const records = window.appState.getState('records') || [];
        const lastRecord = dataUtils.getLatestRecord(records);
        const now = new Date();

        if (forLiveForm) {
            domUtils.setElementValue('liveStartDate', now.toISOString().split('T')[0]);
            domUtils.setElementValue('liveStartTime', now.toTimeString().slice(0, 5));
            
            if (lastRecord) {
                domUtils.setElementValue('liveStartLocation', lastRecord.endLocation || '');
                domUtils.setElementValue('liveWeeklyDriveStart', lastRecord.weeklyDriveEndStr || '');
                domUtils.setElementValue('liveStartKm', lastRecord.kmEnd || '');
            }
        }
    }

    startLiveShift() {
        const date = domUtils.getElementValue('liveStartDate');
        const startTime = domUtils.getElementValue('liveStartTime');
        const startLocation = domUtils.getElementValue('liveStartLocation').trim();
        const weeklyDriveStart = domUtils.getElementValue('liveWeeklyDriveStart').trim();
        const kmStart = parseFloat(domUtils.getElementValue('liveStartKm')) || 0;

        if (!date || !startTime) {
            window.uiManager.showAlert(window.i18n.translate('alertMandatoryFields'), 'info');
            return;
        }

        const inProgressEntry = {
            date,
            startTime,
            startLocation,
            weeklyDriveStartStr: weeklyDriveStart,
            kmStart,
            crossings: []
        };

        window.appState.setState('inProgressEntry', inProgressEntry);
        this.renderLiveTabView();
        window.i18n.updateAllTexts();
    }

    addLiveCrossing() {
        const from = domUtils.getElementValue('liveCrossFrom').trim().toUpperCase();
        const to = domUtils.getElementValue('liveCrossTo').trim().toUpperCase();
        const time = domUtils.getElementValue('liveCrossTime');

        if (!from || !to || !time) {
            window.uiManager.showAlert(window.i18n.translate('alertFillAllFields'), 'info');
            return;
        }

        const inProgressEntry = window.appState.getState('inProgressEntry');
        if (!inProgressEntry) return;

        inProgressEntry.crossings.push({ from, to, time });
        window.appState.setState('inProgressEntry', inProgressEntry);
        this.renderLiveTabView();
        window.i18n.updateAllTexts();
    }

    finalizeShift() {
        const inProgressEntry = window.appState.getState('inProgressEntry');
        if (!inProgressEntry) return;

        // Switch to full-day tab
        window.uiManager.showTab('full-day');

        // Pre-fill form with in-progress data
        domUtils.setElementValue('date', new Date().toISOString().split('T')[0]);
        
        Object.keys(inProgressEntry).forEach(key => {
            const elementId = key.replace('Str', '');
            const element = domUtils.getElement(elementId);
            if (element) {
                element.value = inProgressEntry[key] || '';
            }
        });

        // Add crossings
        if (inProgressEntry.crossings) {
            inProgressEntry.crossings.forEach(crossing => {
                window.fullDayModule?.addCrossingRow(crossing.from, crossing.to, crossing.time);
            });
        }

        // Focus on end time
        const endTimeField = domUtils.getElement('endTime');
        if (endTimeField) endTimeField.focus();
    }

    discardShift() {
        const confirmDiscard = confirm(window.i18n.translate('alertConfirmDelete'));
        if (!confirmDiscard) return;

        window.appState.setState('inProgressEntry', null);
        this.renderLiveTabView();
        window.i18n.updateAllTexts();
    }
}

// Initialize live tracking module
window.liveTrackingModule = new LiveTrackingManager();

// Global functions for HTML onclick handlers
window.startLiveShift = () => window.liveTrackingModule.startLiveShift();
window.addLiveCrossing = () => window.liveTrackingModule.addLiveCrossing();
window.finalizeShift = () => window.liveTrackingModule.finalizeShift();
window.discardShift = () => window.liveTrackingModule.discardShift();
