import { state, setInProgressEntry } from '../state.js';
import { showTab } from './navigation.js';
import { showAlert } from '../utils/domHelpers.js';
import { formatDuration, getWeekRange, toISODate, fetchCountryCodeFor } from '../utils/helpers.js';
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
        updateLiveCrossings();
    } else {
        progressView.classList.add('hidden');
        startView.classList.remove('hidden');
        renderDashboard();
        
        // Alapértelmezett értékek beállítása
        const now = new Date();
        document.getElementById('liveStartDate').value = now.toISOString().split('T')[0];
        document.getElementById('liveStartTime').value = now.toTimeString().slice(0, 5);
    }
}

export function startLiveShift() {
    if (!window.translations) return;
    const i18n = window.translations;
    
    const entry = {
        date: document.getElementById('liveStartDate').value,
        startTime: document.getElementById('liveStartTime').value,
        startLocation: document.getElementById('liveStartLocation').value.trim(),
        weeklyDriveStartStr: document.getElementById('liveWeeklyDriveStart').value.trim(),
        kmStart: parseInt(document.getElementById('liveStartKm').value) || 0,
        crossings: []
    };
    
    if (!entry.date || !entry.startTime) {
        showAlert(i18n.alertMandatoryFields, 'info');
        return;
    }
    
    setInProgressEntry(entry);
    renderLiveTabView();
    showAlert('Munkanap sikeresen elindítva!', 'success');
}

export function addLiveCrossing() {
    if (!window.translations) return;
    const i18n = window.translations;
    
    const from = document.getElementById('liveCrossFrom').value.trim().toUpperCase();
    const to = document.getElementById('liveCrossTo').value.trim().toUpperCase();
    const time = document.getElementById('liveCrossTime').value;
    
    if (!from || !to || !time) {
        showAlert(i18n.alertFillAllFields, 'info');
        return;
    }
    
    if (!state.inProgressEntry) {
        showAlert('Nincs aktív munkanap!', 'info');
        return;
    }
    
    state.inProgressEntry.crossings.push({ from, to, time });
    setInProgressEntry(state.inProgressEntry);
    
    // Mezők tisztítása
    document.getElementById('liveCrossFrom').value = '';
    document.getElementById('liveCrossTo').value = '';
    document.getElementById('liveCrossTime').value = '';
    
    updateLiveCrossings();
    showAlert('Határátlépés hozzáadva!', 'success');
}

function updateLiveCrossings() {
    const container = document.getElementById('live-crossings-list');
    if (!container || !state.inProgressEntry) return;
    
    const crossings = state.inProgressEntry.crossings || [];
    if (crossings.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500">Még nincsenek rögzített átlépések</p>';
        return;
    }
    
    container.innerHTML = crossings.map((c, index) => `
        <div class="flex justify-between items-center text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded">
            <span>${c.from} → ${c.to} (${c.time})</span>
            <button onclick="removeLiveCrossing(${index})" class="text-red-500 hover:text-red-700 ml-2">🗑️</button>
        </div>
    `).join('');
}

function removeLiveCrossing(index) {
    if (!state.inProgressEntry || !state.inProgressEntry.crossings) return;
    
    state.inProgressEntry.crossings.splice(index, 1);
    setInProgressEntry(state.inProgressEntry);
    updateLiveCrossings();
}

// Globális függvény a HTML onclick számára
window.removeLiveCrossing = removeLiveCrossing;

export function finalizeLiveShift() {
    if (!state.inProgressEntry) {
        showAlert('Nincs aktív munkanap a befejezéshez!', 'info');
        return;
    }
    showTab('full-day');
}

export function discardLiveShift() {
    if (!window.translations) return;
    const i18n = window.translations;
    
    if (!state.inProgressEntry) {
        showAlert('Nincs aktív munkanap az elvetéshez!', 'info');
        return;
    }
    
    showAlert(i18n.alertConfirmDelete, 'warning', () => {
        setInProgressEntry(null);
        renderLiveTabView();
        showAlert('Munkanap elvetve.', 'info');
    });
}

export function initializeLiveView() {
    // Munkanap indítása gomb
    const startBtn = document.getElementById('startLiveShiftBtn');
    if (startBtn) {
        startBtn.addEventListener('click', startLiveShift);
    }
    
    // Határátlépés hozzáadása gomb
    const addCrossingBtn = document.getElementById('addLiveCrossingBtn');
    if (addCrossingBtn) {
        addCrossingBtn.addEventListener('click', addLiveCrossing);
    }
    
    // Műszak befejezése gomb
    const finalizeBtn = document.getElementById('finalizeShiftBtn');
    if (finalizeBtn) {
        finalizeBtn.addEventListener('click', finalizeLiveShift);
    }
    
    // Munkanap elvetése gomb
    const discardBtn = document.getElementById('discardShiftBtn');
    if (discardBtn) {
        discardBtn.addEventListener('click', discardLiveShift);
    }
    
    // GPS országkód lekérése gomb
    const fetchCountryBtn = document.getElementById('fetchLiveCountryCodeBtn');
    if (fetchCountryBtn) {
        fetchCountryBtn.addEventListener('click', () => {
            fetchCountryCodeFor('liveCrossTo');
        });
    }
    
    // Automatikus időbeállítás a határátlépésnél
    const crossTimeInput = document.getElementById('liveCrossTime');
    if (crossTimeInput) {
        crossTimeInput.addEventListener('focus', () => {
            if (!crossTimeInput.value) {
                crossTimeInput.value = new Date().toTimeString().slice(0, 5);
            }
        });
    }
}
