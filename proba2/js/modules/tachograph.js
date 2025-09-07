// Tachograph Module v9.00
class TachographManager {
    constructor() {
        this.init();
    }

    init() {
        // Listen for record updates
        window.appState.on('change:records', () => {
            if (window.appState.getCurrentTab() === 'tachograph') {
                this.renderTachographAnalysis();
                this.renderWeeklyAllowance();
            }
        });

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            if (window.appState.getCurrentTab() === 'tachograph') {
                this.renderTachographAnalysis();
                this.renderWeeklyAllowance();
            }
        });

        // Listen for storage initialization
        window.addEventListener('storageInitialized', () => {
            this.renderWeeklyAllowance();
        });
    }

    renderWeeklyAllowance() {
        const liveContainer = domUtils.getElement('live-allowance-display');
        const tachoContainer = domUtils.getElement('tacho-allowance-display');
        
        if (!liveContainer && !tachoContainer) return;

        const allowance = this.calculateWeeklyAllowance();
        const debtMinutes = this.calculateRestDebt();
        
        const debtHTML = debtMinutes > 0 ? `
            <div class="p-2 bg-red-50 dark:bg-red-600/20 rounded-lg border border-red-200 dark:border-red-800">
                <p class="text-sm font-medium text-red-800 dark:text-red-200">${window.i18n.translate('tachoCompensation')}</p>
                <p class="text-2xl font-bold text-red-600 dark:text-red-400">${timeUtils.formatDuration(debtMinutes)}</p>
            </div>
        ` : '';

        const html = `
            <div class="grid ${debtMinutes > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-center">
                <div class="p-2 bg-blue-50 dark:bg-blue-600/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p class="text-sm font-medium text-blue-800 dark:text-blue-200">${window.i18n.translate('tachoAllowanceDrive10h')}</p>
                    <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">${allowance.remainingDrives}</p>
                </div>
                <div class="p-2 bg-orange-50 dark:bg-orange-600/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p class="text-sm font-medium text-orange-800 dark:text-orange-200">${window.i18n.translate('tachoAllowanceReducedRest')}</p>
                    <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">${allowance.remainingRests}</p>
                </div>
                ${debtHTML}
            </div>
        `;

        if (liveContainer) {
            liveContainer.innerHTML = html.replace(/text-2xl/g, 'text-xl').replace(/<p class="text-sm/g, '<p class="text-xs');
        }
        
        if (tachoContainer) {
            tachoContainer.innerHTML = html;
        }
    }

    calculateWeeklyAllowance() {
        const now = new Date();
        const { start, end } = timeUtils.getWeekRange(now);
        const startStr = timeUtils.toISODate(start);
        const endStr = timeUtils.toISODate(end);
        
        const records = window.appState.getState('records') || [];
        const recordsInWeek = records.filter(r => r.date >= startStr && r.date <= endStr);
        
        // Extended drives this week (> 9 hours)
        const extendedDrivesThisWeek = recordsInWeek.filter(r => r.driveMinutes > 540).length;
        const remainingDrives = Math.max(0, 2 - extendedDrivesThisWeek);

        // Reduced rests in current cycle
        let reducedRestsInCycle = 0;
        const sortedRecords = dataUtils.getSortedRecords(records);
        const splitData = storageUtils.getSplitRestData();

        for (let i = sortedRecords.length - 1; i > 0; i--) {
            const currentRecord = sortedRecords[i];
            const previousRecord = sortedRecords[i - 1];
            
            const prevEnd = new Date(`${previousRecord.date}T${previousRecord.endTime}`);
            const currentStart = new Date(`${currentRecord.date}T${currentRecord.startTime}`);
            const restDurationHours = Math.round((currentStart - prevEnd) / 60000) / 60;
            
            // Break if we find a weekly rest
            if (restDurationHours >= 24) break;
            
            const isSplitRest = splitData[previousRecord.id] === true || previousRecord.isSplitRest;
            if (isSplitRest) continue;
            
            const prevWorkDurationHours = previousRecord.workMinutes / 60;
            const isForcedReduced = prevWorkDurationHours > 13;
            
            if ((restDurationHours >= 9 && restDurationHours < 11) || isForcedReduced) {
                reducedRestsInCycle++;
            }
        }
        
        const remainingRests = Math.max(0, 3 - reducedRestsInCycle);
        
        return { remainingDrives, remainingRests };
    }

    calculateRestDebt() {
        let totalDebtMinutes = 0;
        const records = window.appState.getState('records') || [];
        const sortedRecords = dataUtils.getSortedRecords(records).reverse(); // Chronological order
        
        if (sortedRecords.length < 2) return 0;

        const weeklyRestData = storageUtils.getWeeklyRestData();

        for (let i = 1; i < sortedRecords.length; i++) {
            const currentRecord = sortedRecords[i];
            const prevEnd = new Date(`${sortedRecords[i - 1].date}T${sortedRecords[i - 1].endTime}`);
            const currentStart = new Date(`${currentRecord.date}T${currentRecord.startTime}`);
            const restDurationMinutes = Math.round((currentStart - prevEnd) / 60000);

            if (weeklyRestData[currentRecord.id] && restDurationMinutes >= (24 * 60) && restDurationMinutes < (45 * 60)) {
                totalDebtMinutes += (45 * 60) - restDurationMinutes;
            }
        }
        
        return totalDebtMinutes;
    }

    renderTachographAnalysis() {
        const container = domUtils.getElement('tachograph-list');
        if (!container) return;

        const records = window.appState.getState('records') || [];
        const sortedRecords = dataUtils.getSortedRecords(records).reverse(); // Chronological order
        
        if (sortedRecords.length < 1) {
            container.innerHTML = `
                <p class="text-center text-gray-500 py-8">
                    ${window.i18n.translate('noEntries')}
                </p>
            `;
            return;
        }

        const splitRestData = storageUtils.getSplitRestData();
        const weeklyRestData = storageUtils.getWeeklyRestData();
        let analysisResults = [];
        let reducedDailyRestCounter = 0;
        let extendedDrivingInWeekCounter = {};

        for (let i = 0; i < sortedRecords.length; i++) {
            const currentRecord = sortedRecords[i];
            const previousRecord = i > 0 ? sortedRecords[i - 1] : null;
            
            let restAnalysis = { 
                text: 'First recorded day', 
                colorClass: 'bg-gray-200 text-gray-800', 
                duration: 0 
            };

            if (previousRecord) {
                const prevEnd = new Date(`${previousRecord.date}T${previousRecord.endTime}`);
                const currentStart = new Date(`${currentRecord.date}T${currentRecord.startTime}`);
                const restDurationMinutes = Math.round((currentStart - prevEnd) / 60000);
                const restDurationHours = restDurationMinutes / 60;
                
                restAnalysis.duration = restDurationMinutes;
                
                const isSplitRest = splitRestData[previousRecord.id] === true || previousRecord.isSplitRest;
                const isMarkedAsWeekly = weeklyRestData[currentRecord.id] === true;
                const prevWorkDurationHours = previousRecord.workMinutes / 60;

                if (restDurationHours >= 24) {
                    reducedDailyRestCounter = 0;
                    if (isMarkedAsWeekly) {
                        if (restDurationHours >= 45) {
                            restAnalysis = {
                                text: `${window.i18n.translate('tachoRegularWeeklyRest')} (${timeUtils.formatDuration(restDurationMinutes)})`,
                                colorClass: 'bg-green-700 text-white'
                            };
                        } else {
                            restAnalysis = {
                                text: `${window.i18n.translate('tachoReducedWeeklyRest')} (${timeUtils.formatDuration(restDurationMinutes)})`,
                                colorClass: 'bg-green-700 text-white'
                            };
                        }
                    } else {
                        restAnalysis = {
                            text: `${window.i18n.translate('tachoLongRest')} (${timeUtils.formatDuration(restDurationMinutes)})`,
                            colorClass: 'bg-gray-300 text-gray-800'
                        };
                    }
                } else if (restDurationHours < 9) {
                    restAnalysis = {
                        text: `${window.i18n.translate('tachoIrregularRest')} (${timeUtils.formatDuration(restDurationMinutes)})`,
                        colorClass: 'bg-red-500 text-white'
                    };
                } else if (isSplitRest) {
                    restAnalysis = {
                        text: `${window.i18n.translate('tachoSplitRest')} (${timeUtils.formatDuration(restDurationMinutes)})`,
                        colorClass: 'bg-green-200 text-green-800'
                    };
                } else if (restDurationHours >= 11 && prevWorkDurationHours <= 13) {
                    restAnalysis = {
                        text: `${window.i18n.translate('tachoRegularDailyRest')} (${timeUtils.formatDuration(restDurationMinutes)})`,
                        colorClass: 'bg-green-500 text-white'
                    };
                } else {
                    reducedDailyRestCounter++;
                    const isForcedReduced = prevWorkDurationHours > 13;
                    const reason = isForcedReduced ? ` ${window.i18n.translate('tachoReason13h')}` : '';
                    
                    let colorClass, countText;
                    switch (reducedDailyRestCounter) {
                        case 1: colorClass = 'bg-yellow-200 text-yellow-800'; countText = '1.'; break;
                        case 2: colorClass = 'bg-yellow-400 text-black'; countText = '2.'; break;
                        case 3: colorClass = 'bg-orange-400 text-black'; countText = '3.'; break;
                        default: colorClass = 'bg-red-500 text-white'; countText = `${reducedDailyRestCounter}.`; break;
                    }
                    
                    restAnalysis = {
                        text: `${countText} ${window.i18n.translate('tachoReducedDailyRest')}${reason} (${timeUtils.formatDuration(restDurationMinutes)})`,
                        colorClass: colorClass
                    };
                }
            }

            // Drive time analysis
            let driveAnalysis;
            const driveHours = currentRecord.driveMinutes / 60;
            
            if (driveHours > 10) {
                driveAnalysis = {
                    text: `${window.i18n.translate('tachoIrregularDrive')} (${timeUtils.formatDuration(currentRecord.driveMinutes)})`,
                    colorClass: 'bg-red-500 text-white'
                };
            } else if (driveHours > 9) {
                const weekId = timeUtils.getWeekIdentifier(new Date(currentRecord.date));
                extendedDrivingInWeekCounter[weekId] = (extendedDrivingInWeekCounter[weekId] || 0) + 1;
                const countInWeek = extendedDrivingInWeekCounter[weekId];
                
                driveAnalysis = {
                    text: `${countInWeek}. ${countInWeek > 2 ? '(irregular) ' : ''}${window.i18n.translate('tachoIncreasedDrive')} (${timeUtils.formatDuration(currentRecord.driveMinutes)})`,
                    colorClass: countInWeek > 2 ? 'bg-red-500 text-white' : 'bg-blue-400 text-white'
                };
            } else {
                driveAnalysis = {
                    text: `${window.i18n.translate('tachoNormalDrive')} (${timeUtils.formatDuration(currentRecord.driveMinutes)})`,
                    colorClass: 'bg-gray-300 text-gray-800'
                };
            }

            analysisResults.push({
                record: currentRecord,
                rest: restAnalysis,
                drive: driveAnalysis,
                isSplit: splitRestData[currentRecord.id] === true || currentRecord.isSplitRest,
                isWeekly: weeklyRestData[currentRecord.id] === true
            });
        }

        container.innerHTML = analysisResults.reverse().map(res => this.renderAnalysisRow(res)).join('');
    }

    renderAnalysisRow(res) {
        const date = new Date(res.record.date + 'T00:00:00');
        const locale = window.i18n.getDateLocale();
        const dateString = date.toLocaleDateString(locale, { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });

        const isSplitActiveClass = res.isSplit ? 
            'bg-green-200 dark:bg-green-800 font-semibold' : 
            'hover:bg-gray-200 dark:hover:bg-gray-700';
        const checkmark = res.isSplit ? '<span class="font-bold text-lg">✓</span>' : '';

        let weeklyRestCheckboxHTML = '';
        if (res.rest.duration >= (24 * 60)) {
            weeklyRestCheckboxHTML = `
                <label for="weekly-${res.record.id}" class="flex items-center gap-2 cursor-pointer text-xs p-1 rounded-md ${res.isWeekly ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-600'}">
                    <input type="checkbox" id="weekly-${res.record.id}" 
                           onchange="window.tachographModule.handleTachographToggle(this, '${res.record.id}', 'weekly')" 
                           ${res.isWeekly ? 'checked' : ''} 
                           class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                    <span class="text-gray-700 dark:text-gray-200">${window.i18n.translate('tachoWasWeeklyRest')}</span>
                </label>
            `;
        }

        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border-l-4 ${res.rest.colorClass.replace('bg-', 'border-').replace(/ text-\w+-?\d*/g, '')}">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <p class="font-bold text-base text-gray-800 dark:text-gray-100">${dateString}</p>
                        ${weeklyRestCheckboxHTML}
                    </div>
                    <label for="split-${res.record.id}" class="flex items-center gap-2 cursor-pointer p-2 rounded-lg transition-colors ${isSplitActiveClass}">
                        <input type="checkbox" id="split-${res.record.id}" 
                               onchange="window.tachographModule.handleTachographToggle(this, '${res.record.id}', 'split')" 
                               ${res.isSplit ? 'checked' : ''} 
                               class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                        <span class="text-sm text-gray-700 dark:text-gray-200">${window.i18n.translate('tachoSplitRest')} ${checkmark}</span>
                    </label>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div class="p-2 rounded ${res.rest.colorClass}">
                        <p class="font-semibold">${window.i18n.translate('tachoRestBeforeShift')}</p>
                        <p>${res.rest.text}</p>
                    </div>
                    <div class="p-2 rounded ${res.drive.colorClass}">
                        <p class="font-semibold">${window.i18n.translate('tachoDailyDriveTime')}</p>
                        <p>${res.drive.text}</p>
                    </div>
                </div>
            </div>
        `;
    }

    handleTachographToggle(checkbox, recordId, type) {
        const data = type === 'split' ? storageUtils.getSplitRestData() : storageUtils.getWeeklyRestData();
        
        if (checkbox.checked) {
            data[recordId] = true;
        } else {
            delete data[recordId];
        }

        if (type === 'split') {
            storageUtils.saveSplitRestData(data);
        } else {
            storageUtils.saveWeeklyRestData(data);
        }

        this.renderTachographAnalysis();
        this.renderWeeklyAllowance();
    }
}

// Initialize tachograph module
window.tachographModule = new TachographManager();
