// Átalakítja az "óó:pp" formátumú stringet perccé
function parseTimeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const p = timeStr.split(':');
    if (p.length !== 2) return 0;
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}

// A perceket "Xó Yp" formátumra alakítja
function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    const h_unit = currentLang === 'de' ? 'Std' : 'ó';
    const m_unit = currentLang === 'de' ? 'Min' : 'p';
    return `${h}${h_unit} ${m}${m_unit}`;
}

// A perceket "óó:pp" formátumra alakítja
function formatAsHoursAndMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

// Az idő beviteli mezőket automatikusan formázza (pl. 830 -> 08:30)
function formatTimeInput(inputElement, allowHoursOver24 = false) {
    let value = inputElement.value.replace(/[^0-9]/g, '');
    if (value.length < 3) return;
    if (value.length === 3 && !allowHoursOver24) value = '0' + value;
    const hours = parseInt(value.substring(0, value.length - 2), 10);
    const minutes = parseInt(value.substring(value.length - 2), 10);
    if (minutes >= 0 && minutes <= 59 && hours >= 0 && (allowHoursOver24 || hours <= 23)) {
        inputElement.value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    } else {
        inputElement.value = '';
    }
    updateDisplays();
}

// Kiszámolja a munkaidőt két időpont között, figyelembe véve a napváltást
function calculateWorkMinutes(start, end) {
    if (!start || !end) return 0;
    const s = new Date(`2000-01-01T${start}`);
    let e = new Date(`2000-01-01T${end}`);
    if (e < s) e.setDate(e.getDate() + 1);
    return Math.floor((e - s) / 60000);
}

// Kiszámolja az éjszakai (20:00-05:00) munkavégzés perceit
function calculateNightWorkMinutes(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const start = new Date(`1970-01-01T${startTime}`);
    let end = new Date(`1970-01-01T${endTime}`);
    if (end <= start) end.setDate(end.getDate() + 1);
    let nightMinutes = 0;
    let current = new Date(start);
    while (current < end) {
        const hour = current.getHours();
        // JAVÍTVA: 20:00-05:00 időszak (22:00-06:00 helyett)
        if (hour >= 20 || hour < 5) {
            nightMinutes++;
        }
        current.setMinutes(current.getMinutes() + 1);
    }
    return nightMinutes;
}

// Visszaadja egy dátum ISO formátumú stringjét (éééé-hh-nn)
const toISODate = d => d.toISOString().split('T')[0];

// Visszaadja egy adott hét kezdő és végdátumát
function getWeekRange(date, offset = 0) {
    const d = new Date(date);
    d.setDate(d.getDate() + (offset * 7));
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // hétfővel kezdődjön a hét
    const start = new Date(d.setDate(diff));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
}

// Formáz egy dátumot olvashatóbb, hosszabb formátumra
function formatDateTime(date) {
    if (!date) return '';
    const locale = currentLang === 'de' ? 'de-DE' : 'hu-HU';
    const options = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleString(locale, options);
}

// Visszaadja egy dátumhoz tartozó hét azonosítóját (pl. "2024-36")
function getWeekIdentifier(d) {
    const date = new Date(d.valueOf());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return date.getFullYear() + '-' + (1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7));
}

