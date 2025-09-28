// =======================================================
// ===== STATISZTIKÁK (FEATURE) - JAVÍTOTT NaN KEZELÉS ===
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
    
    // JAVÍTOTT: NaN kezelés az összesítésnél
    const totals = {
        work: safeSum(data.datasets.work) * 60,
        drive: safeSum(data.datasets.drive) * 60,
        night: safeSum(data.datasets.night) * 60,
        km: safeSum(data.datasets.km)
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

// JAVÍTOTT: Biztonságos összegzés NaN értékek kezelésével
function safeSum(array) {
    if (!Array.isArray(array)) return 0;
    return array.reduce((sum, value) => {
        const num = parseFloat(value);
        return sum + (isNaN(num) ? 0 : num);
    }, 0);
}

// JAVÍTOTT: Biztonságos szám konverzió
function safeNumber(value, defaultValue = 0) {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
}

// Napi adatok kinyerése diagramhoz - JAVÍTOTT
function getDailyData(date) {
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
    
    if (!records || !Array.isArray(records)) {
        return { labels, datasets };
    }
    
    records.filter(r => r && r.date && r.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
           .forEach(r => {
                try {
                    const dayIndex = new Date(r.date + 'T00:00:00').getUTCDate() - 1;
                    if (dayIndex >= 0 && dayIndex < daysInMonth) {
                        datasets.work[dayIndex] += safeNumber(r.workMinutes) / 60;
                        datasets.drive[dayIndex] += safeNumber(r.driveMinutes) / 60;
                        datasets.night[dayIndex] += safeNumber(r.nightWorkMinutes) / 60;
                        datasets.km[dayIndex] += safeNumber(r.kmDriven);
                    }
                } catch (e) {
                    console.warn('Error processing record:', r, e);
                }
           });
    return { labels, datasets };
}

// Havi adatok kinyerése diagramhoz - JAVÍTOTT
function getMonthlyData(date) {
    const year = date.getFullYear();
    const labels = translations[currentLang].chartMonths;
    const datasets = { 
        work: Array(12).fill(0), 
        drive: Array(12).fill(0), 
        night: Array(12).fill(0), 
        km: Array(12).fill(0) 
    };
    
    if (!records || !Array.isArray(records)) {
        return { labels, datasets };
    }
    
    records.filter(r => r && r.date && r.date.startsWith(year))
           .forEach(r => {
                try {
                    const monthIndex = new Date(r.date + 'T00:00:00').getUTCMonth();
                    if (monthIndex >= 0 && monthIndex < 12) {
                        datasets.work[monthIndex] += safeNumber(r.workMinutes) / 60;
                        datasets.drive[monthIndex] += safeNumber(r.driveMinutes) / 60;
                        datasets.night[monthIndex] += safeNumber(r.nightWorkMinutes) / 60;
                        datasets.km[monthIndex] += safeNumber(r.kmDriven);
                    }
                } catch (e) {
                    console.warn('Error processing record:', r, e);
                }
           });
    return { labels, datasets };
}

// Éves adatok kinyerése diagramhoz - JAVÍTOTT
function getYearlyData() {
    if (!records || !Array.isArray(records) || records.length === 0) {
        return { labels: [], datasets: { work: [], drive: [], night: [], km: [] } };
    }
    
    const yearData = {};
    records.forEach(r => {
        if (!r || !r.date) return;
        try {
            const year = r.date.substring(0, 4);
            if (!yearData[year]) {
                yearData[year] = { work: 0, drive: 0, night: 0, km: 0 };
            }
            yearData[year].work += safeNumber(r.workMinutes) / 60;
            yearData[year].drive += safeNumber(r.driveMinutes) / 60;
            yearData[year].night += safeNumber(r.nightWorkMinutes) / 60;
            yearData[year].km += safeNumber(r.kmDriven);
        } catch (e) {
            console.warn('Error processing record for yearly data:', r, e);
        }
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
    
    // JAVÍTOTT: NaN értékek szűrése a diagram adatokból
    const cleanData = data.map(value => {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    });
    
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: labelText,
                data: cleanData,
                backgroundColor: color,
                borderRadius: 4
            }]
        },
        options: {
            plugins: {
                legend: { display: false },
                tooltip: { 
                    callbacks: { 
                        label: function(context) { 
                            const value = parseFloat(context.parsed.y);
                            return tooltipCallback(isNaN(value) ? 0 : value);
                        } 
                    } 
                }
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