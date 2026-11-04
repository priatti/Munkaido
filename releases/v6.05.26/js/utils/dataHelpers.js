// js/utils/dataHelpers.js

/** Naptári nap (YYYY-MM-DD) – Lista és tachográf ugyanazt a mezőlogikát használja. */
function getRecordDateKey(r) {
    const d = (r && r.endDate) ? String(r.endDate) : ((r && r.date) ? String(r.date) : '');
    const m = d.match(/^\d{4}-\d{2}-\d{2}/);
    return m ? m[0] : '';
}

/** Rendezési időbélyeg: endDate/endTime, majd date/startTime, noteDay-nál 00:00. */
function getRecordSortTime(r) {
    const d = getRecordDateKey(r) || '1970-01-01';
    const t = (r && r.endTime && /^\d{2}:\d{2}/.test(String(r.endTime)))
        ? String(r.endTime)
        : ((r && r.startTime && /^\d{2}:\d{2}/.test(String(r.startTime))) ? String(r.startTime) : '00:00');
    return new Date(`${d}T${t}`).getTime();
}

function getSortedRecords() {
    const list = Array.isArray(window.records) ? window.records : [];
    return [...list].sort((a, b) => getRecordSortTime(b) - getRecordSortTime(a));
}

function getLatestRecord() {
    const sorted = getSortedRecords();
    if (!sorted.length) return null;
    // Note day / hiányos rekord helyett preferáljuk a lezárt workday rekordot.
    const latestWorkday = sorted.find(r => {
        const entryType = (r && r.entryType) ? String(r.entryType) : 'workday';
        return entryType === 'workday' && (!!(r && r.endTime) || typeof (r && r.kmEnd) !== 'undefined' || !!(r && r.endLocation));
    });
    return latestWorkday || sorted[0];
}

function updateUniqueLocations() {
    const list = Array.isArray(window.records) ? window.records : [];
    const locations = new Set(list.map(r => r.startLocation).concat(list.map(r => r.endLocation)));
    const next = Array.from(locations).filter(Boolean).sort();
    try { if (typeof uniqueLocations !== 'undefined') uniqueLocations = next; } catch (_) {}
    window.uniqueLocations = next;
}

function updateUniquePalletLocations() {
    const list = Array.isArray(window.palletRecords) ? window.palletRecords : [];
    const locations = new Set(list.map(r => r.location));
    const next = Array.from(locations).filter(Boolean).sort();
    try { if (typeof uniquePalletLocations !== 'undefined') uniquePalletLocations = next; } catch (_) {}
    window.uniquePalletLocations = next;
}

function resolveSummaryDriveSegments(record) {
    const mode = (typeof localStorage !== 'undefined' && localStorage.getItem('drivingTimeMode')) || 'weekly';
    if (typeof getDailyDriveSegmentsForRecord === 'function') {
        return getDailyDriveSegmentsForRecord(record, mode);
    }
    const total = Math.max(0, Number(record && record.driveMinutes) || 0);
    if (record && record.date) {
        return [{ date: String(record.date), minutes: total }];
    }
    return [];
}

function calculateSummary(filterFn) {
    const summary = { workMinutes: 0, nightWorkMinutes: 0, driveMinutes: 0, kmDriven: 0, days: 0 };
    const daysCounted = new Set();

    (Array.isArray(window.records) ? window.records : []).forEach(r => {
        const segs = resolveSummaryDriveSegments(r);

        segs.forEach(seg => {
            if (seg && seg.date && filterFn({ ...r, date: seg.date })) {
                summary.driveMinutes += Number(seg.minutes) || 0;
            }
        });

        // Legacy fallback: nincs szegmens – teljes driveMinutes a rekord date mezőjéhez
        if (!segs.length && filterFn(r)) {
            summary.driveMinutes += Number(r.driveMinutes) || 0;
        }

        const recordInRange = filterFn(r)
            || segs.some(seg => seg && seg.date && filterFn({ ...r, date: seg.date }));

        if (recordInRange) {
            const dayKey = r.id || r.date;
            if (!daysCounted.has(dayKey)) {
                daysCounted.add(dayKey);
                summary.workMinutes += r.workMinutes || 0;
                summary.nightWorkMinutes += r.nightWorkMinutes || 0;
                summary.kmDriven += r.kmDriven || 0;
                summary.days += 1;
            }
        }
    });

    return summary;
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
