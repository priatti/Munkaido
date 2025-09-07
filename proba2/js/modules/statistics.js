// Statistics Module v9.00
class StatisticsManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Stats view buttons
        const dailyBtn = domUtils.getElement('stats-view-daily');
        const monthlyBtn = domUtils.getElement('stats-view-monthly');
        const yearlyBtn = domUtils.getElement('stats-view-yearly');
        const prevBtn = domUtils.getElement('stats-prev');
        const nextBtn = domUtils.getElement('stats-next');

        if (dailyBtn) dailyBtn.onclick = () => this.setStatsView('daily');
        if (monthlyBtn) monthlyBtn.onclick = () => this.setStatsView('monthly');
        if (yearlyBtn) yearlyBtn.onclick = () => this.setStatsView('yearly');
        if (prevBtn) prevBtn.onclick = () => this.navigateStats(-1);
        if (nextBtn) nextBtn.onclick = () => this.navigateStats(1);

        // Listen for record updates
        window.appState.on('change:records', () => {
            if (window.appState.getCurrentTab() === 'stats') {
                this.renderStats();
            }
        });

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            if (window.appState.getCurrentTab() === 'stats') {
                this.renderStats();
            }
        });
    }

    setStatsView(view) {
        window.appState.setStatsView(view);
        this.renderStats();
        window.i18n.updateAllTexts();
    }

    navigateStats(direction) {
        const currentView = window.appState.getState('statsView');
        const currentDate = window.appState.getState('statsDate');
        
        if (currentView === 'daily') {
            currentDate.setMonth(currentDate.getMonth() + direction);
        } else if (currentView === 'monthly') {
            currentDate.setFullYear(currentDate.getFullYear() + direction);
        } else if (currentView === 'yearly') {
            return; // No navigation for yearly view
        }
        
        window.appState.setStatsDate(currentDate);
        this.renderStats();
    }

    renderStats() {
        const records = window.appState.getState('records') || [];
        const statsView = window.appState.getState('statsView');
        const statsDate = window.appState.getState('statsDate');
        const locale = window.i18n.getDateLocale();

        this.updateActiveButton(statsView);
        this.updatePeriodDisplay(statsView, statsDate, locale);

        let data;
        switch (statsView) {
            case 'daily':
                data = this.getDailyData(records, statsDate);
                break;
            case 'monthly':
                data = this.getMonthlyData(records, statsDate);
                break;
            case 'yearly':
                data = this.getYearlyData(records);
                break;
        }

        this.renderChartsOrNoData(data);
    }

    updateActiveButton(statsView) {
        document.querySelectorAll('.stats-view-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = domUtils.getElement(`stats-view-${statsView}`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    updatePeriodDisplay(statsView, statsDate, locale) {
        const periodDisplay = domUtils.getElement('stats-period-display');
        if (!periodDisplay) return;

        let displayText = '';
        switch (statsView) {
            case 'daily':
                displayText = `${statsDate.getFullYear()}. ${statsDate.toLocaleDateString(locale, { month: 'long' })}`;
                break;
            case 'monthly':
                displayText = `${statsDate.getFullYear()}`;
                break;
            case 'yearly':
                const records = window.appState.getState('records') || [];
                const yearlyData = this.getYearlyData(records);
                displayText = yearlyData.labels.length > 0 ? 
                    `${yearlyData.labels[0]} - ${yearlyData.labels[yearlyData.labels.length - 1]}` : 
                    window.i18n.translate('summaryNoData');
                break;
        }
        periodDisplay.textContent = displayText;
    }

    renderChartsOrNoData(data) {
        const noDataEl = domUtils.getElement('stats-no-data');
        const chartsContainer = domUtils.getElement('stats-charts-container');
        
        if (!noDataEl || !chartsContainer) return;

        const hasData = data.datasets.work.some(d => d > 0) || data.datasets.km.some(d => d > 0);

        if (!hasData) {
            noDataEl.classList.remove('hidden');
            chartsContainer.classList.add('hidden');
            this.clearTotals();
        } else {
            noDataEl.classList.add('hidden');
            chartsContainer.classList.remove('hidden');
            this.updateTotals(data);
            this.renderCharts(data);
        }
    }

    updateTotals(data) {
        const totals = {
            work: data.datasets.work.reduce((a, b) => a + b, 0) * 60,
            drive: data.datasets.drive.reduce((a, b) => a + b, 0) * 60,
            night: data.datasets.night.reduce((a, b) => a + b, 0) * 60,
            km: data.datasets.km.reduce((a, b) => a + b, 0)
        };

        const elements = {
            work: domUtils.getElement('workTimeTotal'),
            drive: domUtils.getElement('driveTimeTotal'),
            night: domUtils.getElement('nightTimeTotal'),
            km: domUtils.getElement('kmTotal')
        };

        if (elements.work) {
            elements.work.className = 'text-sm font-bold text-green-600';
            elements.work.textContent = timeUtils.formatDuration(totals.work);
        }

        if (elements.drive) {
            elements.drive.className = 'text-sm font-bold text-blue-600';
            elements.drive.textContent = timeUtils.formatDuration(totals.drive);
        }

        if (elements.night) {
            elements.night.className = 'text-sm font-bold text-purple-600';
            elements.night.textContent = timeUtils.formatDuration(totals.night);
        }

        if (elements.km) {
            elements.km.className = 'text-sm font-bold text-orange-600';
            elements.km.textContent = `${Math.round(totals.km)} km`;
        }
    }

    clearTotals() {
        ['workTimeTotal', 'driveTimeTotal', 'nightTimeTotal', 'kmTotal'].forEach(id => {
            const element = domUtils.getElement(id);
            if (element) element.textContent = '';
        });
    }

    renderCharts(data) {
        // Destroy existing charts
        window.appState.destroyAllCharts();

        const chartConfigs = [
            { type: 'workTime', canvasId: 'workTimeChart', dataset: data.datasets.work, 
              label: window.i18n.translate('statsWorkTime'), color: '#22c55e', unit: 'h' },
            { type: 'driveTime', canvasId: 'driveTimeChart', dataset: data.datasets.drive, 
              label: window.i18n.translate('statsDriveTime'), color: '#3b82f6', unit: 'h' },
            { type: 'nightTime', canvasId: 'nightTimeChart', dataset: data.datasets.night, 
              label: window.i18n.translate('statsNightTime'), color: '#8b5cf6', unit: 'h' },
            { type: 'km', canvasId: 'kmChart', dataset: data.datasets.km, 
              label: window.i18n.translate('statsKmDriven'), color: '#f97316', unit: 'km' }
        ];

        chartConfigs.forEach(config => {
            const chart = this.createBarChart(config, data.labels);
            window.appState.setChart(config.type, chart);
        });
    }

    createBarChart(config, labels) {
        const canvas = domUtils.getElement(config.canvasId);
        if (!canvas) return null;

        const ctx = canvas.getContext('2d');
        
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: config.label,
                    data: config.dataset,
                    backgroundColor: config.color,
                    borderRadius: 4
                }]
            },
            options: {
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y;
                                return config.unit === 'h' ? 
                                    `${value.toFixed(1)} h` : 
                                    `${Math.round(value)} km`;
                            }
                        }
                    }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    getDailyData(records, date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
        const datasets = {
            work: Array(daysInMonth).fill(0),
            drive: Array(daysInMonth).fill(0),
            night: Array(daysInMonth).fill(0),
            km: Array(daysInMonth).fill(0)
        };

        records.filter(r => r.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
               .forEach(r => {
                   const dayIndex = new Date(r.date + 'T00:00:00').getDate() - 1;
                   datasets.work[dayIndex] += r.workMinutes / 60;
                   datasets.drive[dayIndex] += r.driveMinutes / 60;
                   datasets.night[dayIndex] += r.nightWorkMinutes / 60;
                   datasets.km[dayIndex] += r.kmDriven;
               });

        return { labels, datasets };
    }

    getMonthlyData(records, date) {
        const year = date.getFullYear();
        const labels = window.i18n.getMonthNames();
        const datasets = {
            work: Array(12).fill(0),
            drive: Array(12).fill(0),
            night: Array(12).fill(0),
            km: Array(12).fill(0)
        };

        records.filter(r => r.date.startsWith(String(year)))
               .forEach(r => {
                   const monthIndex = new Date(r.date + 'T00:00:00').getMonth();
                   datasets.work[monthIndex] += r.workMinutes / 60;
                   datasets.drive[monthIndex] += r.driveMinutes / 60;
                   datasets.night[monthIndex] += r.nightWorkMinutes / 60;
                   datasets.km[monthIndex] += r.kmDriven;
               });

        return { labels, datasets };
    }

    getYearlyData(records) {
        if (records.length === 0) {
            return { labels: [], datasets: { work: [], drive: [], night: [], km: [] } };
        }

        const yearData = {};
        records.forEach(r => {
            const year = r.date.substring(0, 4);
            if (!yearData[year]) {
                yearData[year] = { work: 0, drive: 0, night: 0, km: 0 };
            }
            yearData[year].work += r.workMinutes / 60;
            yearData[year].drive += r.driveMinutes / 60;
            yearData[year].night += r.nightWorkMinutes / 60;
            yearData[year].km += r.kmDriven;
        });

        const labels = Object.keys(yearData).sort();
        const datasets = { work: [], drive: [], night: [], km: [] };
        
        labels.forEach(year => {
            datasets.work.push(yearData[year].work);
            datasets.drive.push(yearData[year].drive);
            datasets.night.push(yearData[year].night);
            datasets.km.push(yearData[year].km);
        });

        return { labels, datasets };
    }
}

// Initialize statistics module
window.statisticsModule = new StatisticsManager();
