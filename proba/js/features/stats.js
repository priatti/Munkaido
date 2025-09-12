// =======================================================
// ===== STATISZTIKÁK (FEATURE) ==========================
// =======================================================

let statsView = 'daily';
let statsDate = new Date();
let workTimeChart, driveTimeChart, nightTimeChart, kmChart;

// Statisztikai nézet váltása (napi, havi, éves)
function setStatsView(view) {
    statsView = view;
    statsDate = new Date(); // Reset date on view change
    renderStats();
    updateAllTexts();
}

// Navigálás az időszakok között (előző/következő)
function navigateStats(direction) {
    if (statsView === 'daily') {
        statsDate.setMonth(statsDate.getMonth() + direction);
    } else if (statsView === 'monthly') {
        statsDate.setFullYear(statsDate.getFullYear() + direction);
    } else if (statsView === 'yearly') {
        return; // No navigation for yearly view in this setup
    }
    renderStats();
}

// A statisztika fül teljes újrarajzolása
function renderStats() {
    const i18n = translations[currentLang];
    const locale = currentLang === 'de' ? 'de-DE' : 'hu-HU';
    const periodDisplay = document.getElementById('stats-period-display');
    
    document.querySelectorAll('.stats-view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`stats-view-${statsView}`).classList.add('active');

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
    const hasData = data.datasets.work.some(d => d > 0) || data.datasets.km.some(d => d > 0);
    
    const totals = {
        work: data.datasets.work.reduce((a, b) => a + b, 0) * 60,
        drive: data.datasets.drive.reduce((a, b) => a + b, 0) * 60,
        night: data.datasets.night.reduce((a, b) => a + b, 0) * 60,
        km: data.datasets.km.reduce((a, b) => a + b, 0)
    };

    document.getElementById('workTimeTotal').textContent = formatDuration(totals.work);
    document.getElementById('driveTimeTotal').textContent = formatDuration(totals.drive);
    document.getElementById('nightTimeTotal').textContent = formatDuration(totals.night);
    document.getElementById('kmTotal').textContent = `${Math.round(totals.km)} km`;

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

// Napi adatok kinyerése diagramhoz
function getDailyData(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
    const datasets = { work: Array(daysInMonth).fill(0), drive: Array(daysInMonth).fill(0), night: Array(daysInMonth).fill(0), km: Array(daysInMonth).fill(0) };
    
    records.filter(r => r.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
           .forEach(r => {
                const dayIndex = new Date(r.date + 'T00:00:00').getUTCDate() - 1;
                datasets.work[dayIndex] += r.workMinutes / 60;
                datasets.drive[dayIndex] += r.driveMinutes / 60;
                datasets.night[dayIndex] += (r.nightWorkMinutes || 0) / 60;
                datasets.km[dayIndex] += r.kmDriven;
           });
    return { labels, datasets };
}

// Havi adatok kinyerése diagramhoz
function getMonthlyData(date) {
    const year = date.getFullYear();
    const labels = translations[currentLang].chartMonths;
    const datasets = { work: Array(12).fill(0), drive: Array(12).fill(0), night: Array(12).fill(0), km: Array(12).fill(0) };
    
    records.filter(r => r.date.startsWith(year))
           .forEach(r => {
                const monthIndex = new Date(r.date + 'T00:00:00').getUTCMonth();
                datasets.work[monthIndex] += r.workMinutes / 60;
                datasets.drive[monthIndex] += r.driveMinutes / 60;
                datasets.night[monthIndex] += (r.nightWorkMinutes || 0) / 60;
                datasets.km[monthIndex] += r.kmDriven;
           });
    return { labels, datasets };
}

// Éves adatok kinyerése diagramhoz
function getYearlyData() {
    if (records.length === 0) return { labels: [], datasets: { work: [], drive: [], night: [], km: [] } };
    
    const yearData = {};
    records.forEach(r => {
        const year = r.date.substring(0, 4);
        if (!yearData[year]) yearData[year] = { work: 0, drive: 0, night: 0, km: 0 };
        yearData[year].work += r.workMinutes / 60;
        yearData[year].drive += r.driveMinutes / 60;
        yearData[year].night += (r.nightWorkMinutes || 0) / 60;
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

// Segédfüggvény diagram létrehozásához vagy frissítéséhez
function createOrUpdateBarChart(chartInstance, canvasId, labels, data, labelText, color, tooltipCallback) {
    const ctx = document.getElementById(canvasId).getContext('2d');
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
