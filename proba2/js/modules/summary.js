// Summary Module v9.00
class SummaryManager {
    constructor() {
        this.init();
    }

    init() {
        // Listen for record updates
        window.appState.on('change:records', () => {
            if (window.appState.getCurrentTab() === 'summary') {
                this.renderSummary();
            }
        });

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            if (window.appState.getCurrentTab() === 'summary') {
                this.renderSummary();
            }
        });
    }

    renderSummary() {
        const container = domUtils.getElement('summaryContent');
        if (!container) return;

        const records = window.appState.getState('records') || [];
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const summaries = [
            { 
                titleKey: 'summaryToday', 
                data: dataUtils.calculateSummaryForDate(records, today)
            },
            { 
                titleKey: 'summaryYesterday', 
                data: dataUtils.calculateSummaryForDate(records, yesterday)
            },
            { 
                titleKey: 'summaryThisWeek', 
                data: dataUtils.calculateSummaryForDateRange(records, timeUtils.getWeekRange(today))
            },
            { 
                titleKey: 'summaryLastWeek', 
                data: dataUtils.calculateSummaryForDateRange(records, timeUtils.getWeekRange(today, -1))
            },
            { 
                titleKey: 'summaryThisMonth', 
                data: dataUtils.calculateSummaryForMonth(records, today)
            },
            { 
                titleKey: 'summaryLastMonth', 
                data: dataUtils.calculateSummaryForMonth(records, this.getLastMonth(today))
            }
        ];

        container.innerHTML = summaries.map(summary => this.renderSummaryCard(summary)).join('');
    }

    renderSummaryCard(summary) {
        const title = window.i18n.translate(summary.titleKey);
        const data = summary.data;
        const daysText = data.days > 0 ? `(${data.days} ${window.i18n.translate('summaryDays')})` : '';

        if (data.days === 0) {
            return `
                <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <h3 class="font-semibold mb-2 text-blue-800 dark:text-blue-200">${title}</h3>
                    <p class="text-center text-xs text-gray-500 dark:text-gray-400">
                        ${window.i18n.translate('summaryNoData')}
                    </p>
                </div>
            `;
        }

        return `
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <h3 class="font-semibold mb-2 text-blue-800 dark:text-blue-200">
                    ${title} ${daysText}
                </h3>
                <div class="grid grid-cols-2 gap-2 text-center text-sm">
                    <div>
                        <div class="font-bold text-green-600 dark:text-green-400">
                            ${timeUtils.formatDuration(data.workMinutes)}
                        </div>
                        <div class="text-xs text-gray-600 dark:text-gray-400">
                            ${window.i18n.translate('summaryWork')}
                        </div>
                    </div>
                    <div>
                        <div class="font-bold text-purple-600 dark:text-purple-400">
                            ${timeUtils.formatDuration(data.nightWorkMinutes)}
                        </div>
                        <div class="text-xs text-gray-600 dark:text-gray-400">
                            ${window.i18n.translate('summaryNight')}
                        </div>
                    </div>
                    <div>
                        <div class="font-bold text-blue-700 dark:text-blue-400">
                            ${timeUtils.formatDuration(data.driveMinutes)}
                        </div>
                        <div class="text-xs text-gray-600 dark:text-gray-400">
                            ${window.i18n.translate('summaryDrive')}
                        </div>
                    </div>
                    <div>
                        <div class="font-bold text-orange-600 dark:text-orange-400">
                            ${data.kmDriven} km
                        </div>
                        <div class="text-xs text-gray-600 dark:text-gray-400">
                            ${window.i18n.translate('summaryDistance')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getLastMonth(date) {
        const lastMonth = new Date(date);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return lastMonth;
    }
}

// Initialize summary module
window.summaryModule = new SummaryManager();
