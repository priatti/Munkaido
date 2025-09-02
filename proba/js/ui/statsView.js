import { state } from '../state.js';

// --- Adatfeldolgozó Függvények ---

function getDailyData(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
    const datasets = { work: Array(daysInMonth).fill(0), drive: Array(daysInMonth).fill(0), night: Array(daysInMonth).fill(0), km: Array(daysInMonth).fill(0) };

    state.records.filter(r => r.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
        .forEach(r => {
            const dayIndex = new Date(r.date + 'T00:00:00').getUTCDate() - 1;
            datasets.work[dayIndex] += r.workMinutes / 60;
            datasets.drive[dayIndex] += r.driveMinutes / 60;
            datasets.night[dayIndex] += r.nightWorkMinutes / 60;
            datasets.km[dayIndex] += r.kmDriven;
        });
    return { labels, datasets };
}

function getMonthlyData(date) {
    const year = date.getFullYear();
    const i18n = window.translations[state.currentLang];
    const labels = i18n.summaryTitle === 'Summaries' 
        ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        : ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'];
    
    const datasets = { work: Array(12).fill(0), drive: Array(12).fill(0), night: Array(12).fill(0), km: Array(12).fill(0) };
    
    state.records.filter(r => r.date.startsWith(year))
        .forEach(r => {
            const monthIndex = new Date(r.date + 'T00:00:00').getUTCMonth();
            datasets.work[monthIndex] += r.workMinutes / 60;
            datasets.drive[monthIndex] += r.driveMinutes / 60;
            datasets.night[monthIndex] += r.nightWorkMinutes / 60;
            datasets.km[monthIndex] += r.kmDriven;
        });
    return { labels, datasets };
}

function getYearlyData() {
    if (state.records.length === 0) return { labels: [], datasets: { work: [], drive: [], night: [], km: [] } };
    const yearData = {};
    state.records.forEach(r => {
        const year = r.date.substring(0, 4);
        if (!yearData[year]) yearData[year] = { work: 0, drive: 0, night: 0, km: 0 };
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

// --- Diagram Kezelő Függvény ---

function createOrUpdateBarChart(chartInstance, canvasId, labels, data, labelText, color, tooltipCallback) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (chartInstance) {
        chartInstance.destroy();
    }
    return new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: labelText, data: data, backgroundColor: color, borderRadius: 4 }] },
        options: {
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => tooltipCallback(context.parsed.y) } } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// --- Fő Renderelő és Vezérlő Függvények ---

export function renderStats() {
    const i18n = window.translations[state.currentLang];
    const periodDisplay = document.getElementById('stats-period-display');
    
    document.querySelectorAll('.stats-view-btn').forEach(btn => btn.classList.remove('bg-blue-500', 'text-white'));
    document.getElementById(`stats-view-${state.stats.view}`).classList.add('bg-blue-500', 'text-white');

    let data;
    if (state.stats.view === 'daily') {
        periodDisplay.textContent = `${state.stats.date.getFullYear()}. ${state.stats.date.toLocaleString(state.currentLang, { month: 'long' })}`;
        data = getDailyData(state.stats.date);
    } else if (state.stats.view === 'monthly') {
        periodDisplay.textContent = `${state.stats.date.getFullYear()}`;
        data = getMonthlyData(state.stats.date);
    } else { // yearly
        data = getYearlyData();
        periodDisplay.textContent = data.labels.length > 0 ? `${data.labels[0]} - ${data.labels[data.labels.length - 1]}` : i18n.summaryNoData;
    }
    
    const noDataEl = document.getElementById('stats-no-data');
    const chartsContainer = document.getElementById('stats-charts-container');
    const hasData = data.datasets.work.some(d => d > 0) || data.datasets.km.some(d => d > 0);

    if (!hasData) {
        noDataEl.classList.remove('hidden');
        chartsContainer.classList.add('hidden');
    } else {
        noDataEl.classList.add('hidden');
        chartsContainer.classList.remove('hidden');

        state.stats.charts.work = createOrUpdateBarChart(state.stats.charts.work, 'workTimeChart', data.labels, data.datasets.work, i18n.statsWorkTime, '#22c55e', (value) => `${value.toFixed(1)} h`);
        state.stats.charts.drive = createOrUpdateBarChart(state.stats.charts.drive, 'driveTimeChart', data.labels, data.datasets.drive, i18n.statsDriveTime, '#3b82f6', (value) => `${value.toFixed(1)} h`);
        state.stats.charts.night = createOrUpdateBarChart(state.stats.charts.night, 'nightTimeChart', data.labels, data.datasets.night, i18n.statsNightTime, '#8b5cf6', (value) => `${value.toFixed(1)} h`);
        state.stats.charts.km = createOrUpdateBarChart(state.stats.charts.km, 'kmChart', data.labels, data.datasets.km, i18n.statsKmDriven, '#f97316', (value) => `${Math.round(value)} km`);
    }
}

function navigateStats(direction) {
    if (state.stats.view === 'daily') state.stats.date.setMonth(state.stats.date.getMonth() + direction);
    else if (state.stats.view === 'monthly') state.stats.date.setFullYear(state.stats.date.getFullYear() + direction);
    renderStats();
}

export function initializeStatsView() {
    document.getElementById('stats-view-daily').addEventListener('click', () => { state.stats.view = 'daily'; renderStats(); });
    document.getElementById('stats-view-monthly').addEventListener('click', () => { state.stats.view = 'monthly'; renderStats(); });
    document.getElementById('stats-view-yearly').addEventListener('click', () => { state.stats.view = 'yearly'; renderStats(); });
    document.getElementById('stats-prev').addEventListener('click', () => navigateStats(-1));
    document.getElementById('stats-next').addEventListener('click', () => navigateStats(1));
}