import { state } from '../state.js';
import { calculateSummaryForDate, calculateSummaryForDateRange, calculateSummaryForMonth } from '../utils/calculations.js';
import { formatDuration, getWeekRange, toISODate } from '../utils/helpers.js';

/**
 * Legenerálja és megjeleníti az összesítő nézetet a különböző időszakokra.
 */
export function renderSummary() {
    const i18n = window.translations[state.currentLang];
    const container = document.getElementById('summaryContent');
    if (!container) return;

    const today = new Date();
    const summaries = [
        { title: i18n.summaryToday, data: calculateSummaryForDate(state.records, today, toISODate) },
        { title: i18n.summaryYesterday, data: calculateSummaryForDate(state.records, new Date(new Date().setDate(today.getDate() - 1)), toISODate) },
        { title: i18n.summaryThisWeek, data: calculateSummaryForDateRange(state.records, getWeekRange(today), toISODate) },
        { title: i18n.summaryLastWeek, data: calculateSummaryForDateRange(state.records, getWeekRange(today, -1), toISODate) },
        { title: i18n.summaryThisMonth, data: calculateSummaryForMonth(state.records, today) },
        { title: i18n.summaryLastMonth, data: calculateSummaryForMonth(state.records, new Date(new Date().setMonth(today.getMonth() - 1))) }
    ];

    container.innerHTML = summaries.map(s => {
        const hasData = s.data.days > 0;
        const daysText = s.data.days > 0 ? `(${s.data.days} ${i18n.summaryDays})` : "";
        
        const contentHTML = hasData
            ? `<div class="grid grid-cols-2 gap-2 text-center text-sm">
                   <div><div class="font-bold text-green-600 dark:text-green-400">${formatDuration(s.data.workMinutes)}</div><div class="text-xs">${i18n.summaryWork}</div></div>
                   <div><div class="font-bold text-purple-600 dark:text-purple-400">${formatDuration(s.data.nightWorkMinutes)}</div><div class="text-xs">${i18n.summaryNight}</div></div>
                   <div><div class="font-bold text-blue-700 dark:text-blue-300">${formatDuration(s.data.driveMinutes)}</div><div class="text-xs">${i18n.summaryDrive}</div></div>
                   <div><div class="font-bold text-orange-600 dark:text-orange-400">${s.data.kmDriven} km</div><div class="text-xs">${i18n.summaryDistance}</div></div>
               </div>`
            : `<p class="text-center text-xs text-gray-500">${i18n.summaryNoData}</p>`;

        return `
            <div class="bg-blue-50 dark:bg-blue-900/50 rounded-lg p-3">
                <h3 class="font-semibold mb-2 text-gray-800 dark:text-gray-100">${s.title} ${daysText}</h3>
                ${contentHTML}
            </div>`;
    }).join('');
}