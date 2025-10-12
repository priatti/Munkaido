// js/utils/dataHelpers.js

function getSortedRecords() {
    return [...(records || [])].sort((a, b) => new Date(`${b.date}T${b.startTime}`) - new Date(`${a.date}T${a.startTime}`));
}

function getLatestRecord() {
    if (!records || records.length === 0) return null;
    return getSortedRecords()[0];
}

function updateUniqueLocations() {
    const locations = new Set(records.map(r => r.startLocation).concat(records.map(r => r.endLocation)));
    uniqueLocations = Array.from(locations).filter(Boolean).sort();
}

function updateUniquePalletLocations() {
    const locations = new Set(palletRecords.map(r => r.location));
    uniquePalletLocations = Array.from(locations).filter(Boolean).sort();
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