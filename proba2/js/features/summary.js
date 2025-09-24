// =======================================================
// ===== ÖSSZESÍTÉSEK (FEATURE) ==========================
// =======================================================

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

function renderSummary() {
    const i18n = translations[currentLang];
    const container = safeGetElement('summaryContent');
    if (!container) return;

    const today = new Date();
    const summaries = [
        { titleKey: 'summaryToday', data: calculateSummaryForDate(new Date()) },
        { titleKey: 'summaryYesterday', data: calculateSummaryForDate(new Date(new Date().setDate(today.getDate() - 1))) },
        { titleKey: 'summaryThisWeek', data: calculateSummaryForDateRange(getWeekRange(new Date())) },
        { titleKey: 'summaryLastWeek', data: calculateSummaryForDateRange(getWeekRange(new Date(), -1)) },
        { titleKey: 'summaryThisMonth', data: calculateSummaryForMonth(new Date()) },
        { titleKey: 'summaryLastMonth', data: calculateSummaryForMonth(new Date(new Date().setMonth(today.getMonth() - 1))) }
    ];

    container.innerHTML = summaries.map(s => {
        const title = i18n[s.titleKey];
        return `
        <div class="bg-blue-50 dark:bg-blue-900/50 rounded-lg p-3">
            <h3 class="font-semibold mb-2 text-gray-800 dark:text-gray-100">${title} ${s.data.days > 0 ? `(${s.data.days} ${i18n.summaryDays})` : ""}</h3>
            ${s.data.days > 0 ? `
                <div class="grid grid-cols-2 gap-2 text-center text-sm">
                    <div><div class="font-bold text-green-600 dark:text-green-400">${formatDuration(s.data.workMinutes)}</div><div class="text-xs text-gray-500 dark:text-gray-400">${i18n.summaryWork}</div></div>
                    <div><div class="font-bold text-purple-600 dark:text-purple-400">${formatDuration(s.data.nightWorkMinutes)}</div><div class="text-xs text-gray-500 dark:text-gray-400">${i18n.summaryNight}</div></div>
                    <div><div class="font-bold text-blue-700 dark:text-blue-300">${formatDuration(s.data.driveMinutes)}</div><div class="text-xs text-gray-500 dark:text-gray-400">${i18n.summaryDrive}</div></div>
                    <div><div class="font-bold text-orange-600 dark:text-orange-400">${s.data.kmDriven} km</div><div class="text-xs text-gray-500 dark:text-gray-400">${i18n.summaryDistance}</div></div>
                </div>
            ` : `<p class="text-center text-xs text-gray-500">${i18n.summaryNoData}</p>`}
        </div>`;
    }).join('');
};