import { state, setInProgressEntry } from '../state.js';
import { showTab } from './navigation.js';
import { showAlert } from '../utils/domHelpers.js';
import { formatDuration, getWeekRange, toISODate } from '../utils/helpers.js';
import { calculateSummaryForDateRange, calculateSummaryForMonth } from '../utils/calculations.js';
import { renderTachographAnalysis } from './tachographView.js';

function renderDashboard() {
    if (!window.translations) return;
    const i18n = window.translations;
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

export function renderLiveTabView() {
    if (!window.translations) return;
    const i18n = window.translations;
    const startView = document.getElementById('live-start-view');
    const progressView = document.getElementById('live-progress-view');

    renderTachographAnalysis(); 

    if (state.inProgressEntry) {
        startView.classList.add('hidden');
        progressView.classList.remove('hidden');
        document.getElementById('live-start-time').textContent = `${i18n.startedAt}: ${state.inProgressEntry.date} ${state.inProgressEntry.startTime}`;
    } else {
        progressView.classList.add('hidden');
        startView.classList.remove('hidden');
        renderDashboard();
    }
}

// ... a startLiveShift, addLiveCrossing, stb. függvények változatlanok

export function initializeLiveView() {
    // Itt jönnek majd az eseménykezelők, ha szükségesek lennének
}
