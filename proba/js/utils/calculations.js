/**
 * Kiszámolja a percek számát két időpont (óó:pp) között.
 * Kezeli az éjfélen átnyúló időszakot.
 * @param {string} start - A kezdő időpont (pl. "22:00").
 * @param {string} end - A befejező időpont (pl. "06:00").
 * @returns {number} Az eltelt percek száma.
 */
export function calculateWorkMinutes(start, end) {
    if (!start || !end) return 0;
    const s = new Date(`2000-01-01T${start}`);
    let e = new Date(`2000-01-01T${end}`);
    if (e < s) e.setDate(e.getDate() + 1);
    return Math.floor((e - s) / 60000);
}

/**
 * Kiszámolja az éjszakai (20:00 - 05:00) percek számát két időpont között.
 * @param {string} startTime - A kezdő időpont (pl. "18:00").
 * @param {string} endTime - A befejező időpont (pl. "07:00").
 * @returns {number} Az éjszakai percek száma.
 */
export function calculateNightWorkMinutes(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const start = new Date(`1970-01-01T${startTime}`);
    let end = new Date(`1970-01-01T${endTime}`);
    if (end <= start) end.setDate(end.getDate() + 1);

    let nightMinutes = 0;
    let current = new Date(start);

    while (current < end) {
        const hour = current.getHours();
        if (hour >= 20 || hour < 5) {
            nightMinutes++;
        }
        current.setMinutes(current.getMinutes() + 1);
    }
    return nightMinutes;
}

/**
 * Átalakít egy "óó:pp" vagy "óóó:pp" formátumú stringet percekké.
 * @param {string} timeStr - Az idő string.
 * @returns {number} Az idő percekben.
 */
export function parseTimeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const p = timeStr.split(':');
    if (p.length !== 2) return 0;
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}

/**
 * Általános összesítő függvény, ami egy szűrő alapján összegez.
 * @param {Array} records - A bejegyzések listája.
 * @param {Function} filterFn - A szűrőfüggvény, ami eldönti, mely rekordokat kell összegezni.
 * @returns {object} Egy objektum az összesített adatokkal.
 */
function calculateSummary(records, filterFn) {
    return (records || []).filter(filterFn).reduce((acc, r) => ({
        workMinutes: acc.workMinutes + (r.workMinutes || 0),
        nightWorkMinutes: acc.nightWorkMinutes + (r.nightWorkMinutes || 0),
        driveMinutes: acc.driveMinutes + (r.driveMinutes || 0),
        kmDriven: acc.kmDriven + (r.kmDriven || 0),
        days: acc.days + 1
    }), { workMinutes: 0, nightWorkMinutes: 0, driveMinutes: 0, kmDriven: 0, days: 0 });
}

/**
 * Összesítés egy adott napra.
 */
export function calculateSummaryForDate(records, date, toISODate) {
    const dateStr = toISODate(date);
    return calculateSummary(records, r => r.date === dateStr);
}

/**
 * Összesítés egy adott dátumtartományra.
 */
export function calculateSummaryForDateRange(records, { start, end }, toISODate) {
    const startStr = toISODate(start);
    const endStr = toISODate(end);
    return calculateSummary(records, r => r.date >= startStr && r.date <= endStr);
}

/**
 * Összesítés egy adott hónapra.
 */
export function calculateSummaryForMonth(records, date) {
    const monthStr = date.toISOString().slice(0, 7);
    return calculateSummary(records, r => r.date.startsWith(monthStr));
}