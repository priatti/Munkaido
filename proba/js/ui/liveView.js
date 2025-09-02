import { state, setInProgressEntry } from '../state.js';
import { showTab } from './navigation.js';
import { showAlert } from '../utils/domHelpers.js';
import { formatDuration, getWeekRange, toISODate } from '../utils/helpers.js';
import { calculateSummaryForDateRange, calculateSummaryForMonth } from '../utils/calculations.js';
import { renderTachographAnalysis } from './tachographView.js'; // A keret frissítéséhez

/**
 * Megjeleníti az áttekintő statisztikai kártyákat.
 */
function renderDashboard() {
    const i18n = window.translations[state.currentLang];
    const container = document.getElementById('dashboard-cards');
    if (!container) return;

    const now = new Date();
    const thisWeek = calculateSummaryForDateRange(state.records, getWeekRange(now), toISODate);
    const lastWeek = calculateSummaryForDateRange(state.records, getWeekRange(now, -1), toISODate);
    const thisMonth = calculateSummaryForMonth(state.records, now);

    const cards = [
        { labelKey: 'dashboardDriveThisWeek', value: formatDuration(thisWeek.driveMinutes), color: 'blue' },
        { labelKey: 'dashboardWorkThisWeek', value: formatDuration(thisWeek.workMinutes), color: 'green' },
        { labelKey: 'dashboardDistanceThisMonth', value: `${thisMonth.kmDriven} km`, color: 'orange' },
        { labelKey: 'dashboardDistanceLastWeek', value: `${lastWeek.kmDriven} km`, color: 'indigo' }
    ];

    container.innerHTML = cards.map(card => `
        <div class="bg-${card.color}-50 dark:bg-${card.color}-900/50 border border-${card.color}-200 dark:border-${card.color}-800 rounded-lg p-3 text-center">
            <p class="text-xs text-${card.color}-700 dark:text-${card.color}-200 font-semibold">${i18n[card.labelKey]}</p>
            <p class="text-lg font-bold text-${card.color}-800 dark:text-${card.color}-100 mt-1">${card.value}</p>
        </div>
    `).join('');
}

/**
 * A teljes "Élő" fül nézetének frissítése az aktuális állapot alapján.
 */
export function renderLiveTabView() {
    const i18n = window.translations[state.currentLang];
    const startView = document.getElementById('live-start-view');
    const progressView = document.getElementById('live-progress-view');

    // Tachográf keret frissítése (mindkét nézetben látható)
    renderTachographAnalysis(); 

    if (state.inProgressEntry) {
        startView.classList.add('hidden');
        progressView.classList.remove('hidden');
        document.getElementById('live-start-time').textContent = `${i18n.startedAt}: ${state.inProgressEntry.date} ${state.inProgressEntry.startTime}`;
        
        const liveCrossList = document.getElementById('live-crossings-list');
        const liveCrossFrom = document.getElementById('liveCrossFrom');
        if (state.inProgressEntry.crossings && state.inProgressEntry.crossings.length > 0) {
            const crossingsHTML = state.inProgressEntry.crossings.map(c => 
                `<div class="flex items-center justify-between bg-white dark:bg-gray-700/50 p-2 rounded-md shadow-sm">
                    <span class="font-mono font-bold text-indigo-800 dark:text-indigo-200">${c.from} → ${c.to}</span>
                    <span class="text-sm font-mono text-gray-600 dark:text-gray-400">${c.time}</span>
                </div>`
            ).join('');
            liveCrossList.innerHTML = `<h4 class="font-bold text-indigo-800 text-sm mb-2">${i18n.recordedCrossings}</h4><div class="space-y-2">${crossingsHTML}</div>`;
            liveCrossFrom.value = state.inProgressEntry.crossings.slice(-1)[0].to;
        } else {
            liveCrossList.innerHTML = '';
        }
    } else {
        progressView.classList.add('hidden');
        startView.classList.remove('hidden');
        renderDashboard();
    }
}

/**
 * Új munkanap indítása és mentése az állapotba.
 */
export function startLiveShift() {
    const newEntry = {
        date: document.getElementById('liveStartDate').value,
        startTime: document.getElementById('liveStartTime').value,
        startLocation: document.getElementById('liveStartLocation').value.trim(),
        weeklyDriveStartStr: document.getElementById('liveWeeklyDriveStart').value.trim(),
        kmStart: parseFloat(document.getElementById('liveStartKm').value) || 0,
        crossings: []
    };

    if (!newEntry.date || !newEntry.startTime) {
        showAlert(window.translations[state.currentLang].alertMandatoryFields, "info");
        return;
    }
    setInProgressEntry(newEntry);
    renderLiveTabView();
}

/**
 * Határátlépés hozzáadása a folyamatban lévő műszakhoz.
 */
export function addLiveCrossing() {
    const from = document.getElementById('liveCrossFrom').value.trim().toUpperCase();
    const to = document.getElementById('liveCrossTo').value.trim().toUpperCase();
    const time = document.getElementById('liveCrossTime').value;

    if (!from || !to || !time) {
        showAlert(window.translations[state.currentLang].alertFillAllFields, "info");
        return;
    }
    state.inProgressEntry.crossings.push({ from, to, time });
    setInProgressEntry(state.inProgressEntry); // frissíti a localStorage-t is
    renderLiveTabView();
    document.getElementById('liveCrossTo').value = '';
    document.getElementById('liveCrossTime').value = new Date().toTimeString().slice(0, 5);
}

/**
 * Átvált a "Teljes nap" nézetre a műszak véglegesítéséhez.
 */
export function finalizeShift() {
    showTab('full-day');
}

/**
 * Törli a folyamatban lévő műszakot.
 */
export function discardShift() {
    showAlert(window.translations[state.currentLang].alertConfirmDelete, 'warning', () => {
        setInProgressEntry(null);
        renderLiveTabView();
    });
}