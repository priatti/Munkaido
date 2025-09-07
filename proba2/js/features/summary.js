// js/features/summary.js

import { translations, currentLang, records } from '../main.js';

//======================================================================
// ===== SEGÉDFÜGGVÉNYEK (csak ehhez a modulhoz) =======================
//======================================================================

function formatDuration(minutes) {
    const i18n = translations[currentLang];
    if (!i18n) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    const h_unit = currentLang === 'de' ? 'Std' : 'ó';
    const m_unit = currentLang === 'de' ? 'Min' : 'p';
    return `${h}${h_unit} ${m}${m_unit}`;
}

const toISODate = d => d.toISOString().split('T')[0];

function getWeekRange(date, offset = 0) {
    const d = new Date(date);
    d.setDate(d.getDate() + (offset * 7));
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
}

function calculateSummary(filterFn) { 
    return (records || []).filter(filterFn).reduce((acc, r) => ({ 
        workMinutes: acc.workMinutes + (r.workMinutes || 0), 
        nightWorkMinutes: acc.nightWorkMinutes + (r.nightWorkMinutes || 0), 
        driveMinutes: acc.driveMinutes + (r.driveMinutes || 0), 
        kmDriven: acc.kmDriven + (r.kmDriven || 0), 
        days: acc.days + 1 
    }), { workMinutes: 0, nightWorkMinutes: 0, driveMinutes: 0, kmDriven: 0, days: 0 }); 
}

function calculateSummaryForDate(date) { 
    const dateStr = toISODate(date); 
    return calculateSummary(r => r.date === dateStr); 
}

function calculateSummaryForDateRange({ start, end }) { 
    const startStr = toISODate(start); 
    const endStr = toISODate(end); 
    return calculateSummary(r => r.date >= startStr && r.date <= endStr); 
}

function calculateSummaryForMonth(date) { 
    const monthStr = date.toISOString().slice(0, 7); 
    return calculateSummary(r => r.date.startsWith(monthStr)); 
}

//======================================================================
// ===== FŐ MEGJELENÍTŐ FUNKCIÓ ========================================
//======================================================================

export function renderSummary() {
    const i18n = translations[currentLang];
    const container = document.getElementById('summaryContent');
    if (!container) return;
    const today = new Date();
    
    const summaries = [
        { title: i18n.summaryToday, data: calculateSummaryForDate(new Date()) }, 
        { title: i18n.summaryYesterday, data: calculateSummaryForDate(new Date(new Date().setDate(today.getDate() - 1))) }, 
        { title: i18n.summaryThisWeek, data: calculateSummaryForDateRange(getWeekRange(new Date())) }, 
        { title: i18n.summaryLastWeek, data: calculateSummaryForDateRange(getWeekRange(new Date(), -1)) }, 
        { title: i18n.summaryThisMonth, data: calculateSummaryForMonth(new Date()) }, 
        { title: i18n.summaryLastMonth, data: calculateSummaryForMonth(new Date(new Date().setMonth(today.getMonth() - 1))) }
    ];

    container.innerHTML = summaries.map(s => `
        <div class="bg-blue-50 rounded-lg p-3">
            <h3 class="font-semibold mb-2">${s.title} ${s.data.days > 0 ? `(${s.data.days} ${i18n.summaryDays})` : ""}</h3>
            ${s.data.days > 0 ? `
            <div class="grid grid-cols-2 gap-2 text-center text-sm">
                <div>
                    <div class="font-bold text-green-600">${formatDuration(s.data.workMinutes)}</div>
                    <div class="text-xs">${i18n.summaryWork}</div>
                </div>
                <div>
                    <div class="font-bold text-purple-600">${formatDuration(s.data.nightWorkMinutes)}</div>
                    <div class="text-xs">${i18n.summaryNight}</div>
                </div>
                <div>
                    <div class="font-bold text-blue-700">${formatDuration(s.data.driveMinutes)}</div>
                    <div class="text-xs">${i18n.summaryDrive}</div>
                </div>
                <div>
                    <div class="font-bold text-orange-600">${s.data.kmDriven} km</div>
                    <div class="text-xs">${i18n.summaryDistance}</div>
                </div>
            </div>` : `
            <p class="text-center text-xs text-gray-500">${i18n.summaryNoData}</p>`}
        </div>
    `).join('');
};