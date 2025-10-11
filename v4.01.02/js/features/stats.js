// =======================================================
// ===== STATISZTIKÁK (FEATURE) - VÉGLEGES VERZIÓ ========
// =======================================================

let statsView = 'daily';
let statsDate = new Date();
let workTimeChart, driveTimeChart, nightTimeChart, kmChart;

function setStatsView(view) {
    statsView = view;
    statsDate = new Date();
    renderStats();
    if (typeof updateAllTexts === 'function') {
        updateAllTexts();
    }
}

function navigateStats(direction) {
    if (statsView === 'daily') {
        statsDate.setMonth(statsDate.getMonth() + direction);
    } else if (statsView === 'monthly') {
        statsDate.setFullYear(statsDate.getFullYear() + direction);
    } else {
        return;
    }
    renderStats();
}

function renderStats() {
    const i18n = translations[currentLang];
    const locale = currentLang === 'de' ? 'de-DE' : 'hu-HU';
    const periodDisplay = document.getElementById('stats-period-display');
    if (!periodDisplay) { return; }

    document.querySelectorAll('.stats-view-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`stats-view-${statsView}`);
    if (activeBtn) activeBtn.classList.add('active');

    let data;
    if (statsView === 'daily') {
        periodDisplay.textContent = `${statsDate.getFullYear()}. ${statsDate.toLocaleString(locale, { month: 'long' })}`;
        data = getDailyData(statsDate);
    } else if (statsView === 'monthly') {
        periodDisplay.textContent = `${statsDate.getFullYear()}`;
        data = getMonthlyData(statsDate);
    } else { // yearly
        data = getYearlyData();
        periodDisplay.textContent = data.labels.length > 0 ? `${data.labels[0]} - ${data.labels[data.labels.length - 1]}` : i18n.summaryNoData;
    }

    const noDataEl = document.getElementById('stats-no-data');
    const chartsContainer = document.getElementById('stats-charts-container');
    if (!noDataEl || !chartsContainer) return;

    const totals = {
        work: data.datasets.work.reduce((a, b) => a + b, 0),
        drive: data.datasets.drive.reduce((a, b) => a + b, 0),
        night: data.datasets.night.reduce((a, b) => a + b, 0),
        km: data.datasets.km.reduce((a, b) => a + b, 0)
    };

    const hasData = totals.work > 0 || totals.km > 0;

    safeSetTextContent('workTimeTotal', formatDuration(totals.work * 60));
    safeSetTextContent('driveTimeTotal', formatDuration(totals.drive * 60));
    safeSetTextContent('nightTimeTotal', formatDuration(totals.night * 60));
    safeSetTextContent('kmTotal', `${Math.round(totals.km)} km`);

    if (!hasData) {
        noDataEl.classList.remove('hidden');
        chartsContainer.classList.add('hidden');
    } else {
        noDataEl.classList.add('hidden');
        chartsContainer.classList.remove('hidden');

        workTimeChart = createOrUpdateBarChart(workTimeChart, 'workTimeChart', data.labels, data.datasets.work, i18n.statsWorkTime, '#22c55e', (value) => `${value.toFixed(1)} h`);
        driveTimeChart = createOrUpdateBarChart(driveTimeChart, 'driveTimeChart', data.labels, data.datasets.drive, i18n.statsDriveTime, '#3b82f6', (value) => `${value.toFixed(1)} h`);
        nightTimeChart = createOrUpdateBarChart(nightTimeChart, 'nightTimeChart', data.labels, data.datasets.night, i18n.statsNightTime, '#8b5cf6', (value) => `${value.toFixed(1)} h`);
        kmChart = createOrUpdateBarChart(kmChart, 'kmChart', data.labels, data.datasets.km, i18n.statsKmDriven, '#f97316', (value) => `${Math.round(value)} km`);
    }
}

function getDailyData(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
    const datasets = { work: Array(daysInMonth).fill(0), drive: Array(daysInMonth).fill(0), night: Array(daysInMonth).fill(0), km: Array(daysInMonth).fill(0) };

    const monthString = `${year}-${String(month + 1).padStart(2, '0')}`;
    const relevantRecords = (records || []).filter(r => r.date && r.date.startsWith(monthString));

    relevantRecords.forEach(r => {
        const dayIndex = parseInt(r.date.substring(8, 10), 10) - 1;
        if (dayIndex >= 0 && dayIndex < daysInMonth) {
            datasets.work[dayIndex] += (r.workMinutes || 0) / 60;
            datasets.drive[dayIndex] += (r.driveMinutes || 0) / 60;
            datasets.night[dayIndex] += (r.nightWorkMinutes || 0) / 60;
            datasets.km[dayIndex] += r.kmDriven || 0;
        }
    });
    return { labels, datasets };
}

function getMonthlyData(date) {
    const year = date.getFullYear();
    const labels = translations[currentLang].chartMonths;
    const datasets = { work: Array(12).fill(0), drive: Array(12).fill(0), night: Array(12).fill(0), km: Array(12).fill(0) };

    (records || []).filter(r => r.date && r.date.startsWith(String(year)))
        .forEach(r => {
            const monthIndex = parseInt(r.date.substring(5, 7), 10) - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
                datasets.work[monthIndex] += (r.workMinutes || 0) / 60;
                datasets.drive[monthIndex] += (r.driveMinutes || 0) / 60;
                datasets.night[monthIndex] += (r.nightWorkMinutes || 0) / 60;
                datasets.km[monthIndex] += r.kmDriven || 0;
            }
        });
    return { labels, datasets };
}

function getYearlyData() {
    if (!records || records.length === 0) return { labels: [], datasets: { work: [], drive: [], night: [], km: [] } };

    const yearData = {};
    records.forEach(r => {
        if (!r.date) return;
        const year = r.date.substring(0, 4);
        if (!yearData[year]) yearData[year] = { work: 0, drive: 0, night: 0, km: 0 };
        yearData[year].work += (r.workMinutes || 0) / 60;
        yearData[year].drive += (r.driveMinutes || 0) / 60;
        yearData[year].night += (r.nightWorkMinutes || 0) / 60;
        yearData[year].km += r.kmDriven || 0;
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

function createOrUpdateBarChart(chartInstance, canvasId, labels, data, labelText, color, tooltipCallback) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }
    const isDarkMode = document.documentElement.classList.contains('dark');
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: labelText,
                data: data,
                backgroundColor: color,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: function(context) { return tooltipCallback(context.parsed.y); } } }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280' },
                    grid: { color: isDarkMode ? '#374151' : '#e5e7eb' }
                },
                x: {
                    ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280' },
                    grid: { display: false }
                }
            }
        }
    });
}