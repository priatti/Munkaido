// =======================================================
// ===== IDŐ KEZELÉS ÉS SZÁMÍTÁSOK ======================
// =======================================================

const DEFAULT_NIGHT_SHIFT_START = '20:00';
const DEFAULT_NIGHT_SHIFT_END = '05:00';
const DEFAULT_LOCALE = 'hu-HU';
const LOCALE_MAP = { hu: 'hu-HU', de: 'de-DE', en: 'en-US', ro: 'ro-RO', pl: 'pl-PL', da: 'da-DK', no: 'nb-NO' };

const DEFAULT_TIME_PLACEHOLDERS = {
    hu: 'óó:pp',
    de: 'hh:mm',
    en: 'hh:mm',
    ro: 'oo:mm',
    pl: 'gg:mm',
    da: 'tt:mm',
    no: 'tt:mm',
    default: 'hh:mm'
};

const DEFAULT_DURATION_UNITS = {
    hu: { hours: 'ó', minutes: 'p' },
    de: { hours: 'Std', minutes: 'Min' },
    en: { hours: 'h', minutes: 'min' },
    ro: { hours: 'o', minutes: 'min' },
    pl: { hours: 'g', minutes: 'min' },
    da: { hours: 't', minutes: 'min' },
    no: { hours: 't', minutes: 'min' },
    default: { hours: 'h', minutes: 'min' }
};

// ===== Munkaidő és pihenő határok (központi konstansok) =====
// workMinutes = tárolt, kompenzációval korrigált munkaidő. A 13+ logika erre épül.
// shiftLength = nyers indulás→érkezés (calculateWorkMinutes start,end,date); a 16h figyelmeztetés erre vonatkozik.
const LONG_WORKDAY_THRESHOLD_MINUTES = 13 * 60;       // 13+ óra: csökkentett napi pihenő logika (workMinutes alapján)
const REGULAR_DAILY_REST_MINUTES = 11 * 60;           // 11h+: rendes napi pihenő
const REDUCED_DAILY_REST_MINUTES = 9 * 60;           // 9–11h: csökkentett napi pihenő
const REDUCED_WEEKLY_REST_MINUTES = 24 * 60;         // 24h+: csökkentett heti / 24h pihenő
const REGULAR_WEEKLY_REST_MINUTES = 45 * 60;         // 45h+: rendes heti pihenő
const MAX_TACHOGRAPH_SHIFT_MINUTES = 15 * 60;        // 15h: tachográf logika (pl. aktív műszak skála)
const REALISM_SHIFT_WARNING_MINUTES = 16 * 60;       // 16h: csak életszerűségi figyelmeztetés (nyers műszakhossz)
const MAX_TEAM_SHIFT_HOURS = 21;                     // multi-manning: 30h − 9h napi pihenő
const DAILY_REST_CYCLE_HOURS_SINGLE = 24;
const DAILY_REST_CYCLE_HOURS_TEAM = 30;
const DRIVING_MODE_SINGLE = 'single';
const DRIVING_MODE_TEAM = 'team';
/** Egyszeri legacy migráció: a feature bevezetésekor rögzített default (nem élő toggle). */
const DRIVING_MODE_MIGRATION_DONE_KEY = 'drivingModeMigrationDone_v1';
const DRIVING_MODE_MIGRATION_DEFAULT_KEY = 'drivingModeMigrationDefault_v1';
/** Régi kulcsnevek – olvasáskor átmásoljuk az újra. */
const DRIVING_MODE_MIGRATION_DONE_KEY_LEGACY = 'drivingModeBackfill_v1';
const DRIVING_MODE_MIGRATION_DEFAULT_KEY_LEGACY = 'drivingModeBackfillMode_v1';

if (typeof window !== 'undefined') {
  window.LONG_WORKDAY_THRESHOLD_MINUTES = LONG_WORKDAY_THRESHOLD_MINUTES;
  window.REGULAR_DAILY_REST_MINUTES = REGULAR_DAILY_REST_MINUTES;
  window.REDUCED_DAILY_REST_MINUTES = REDUCED_DAILY_REST_MINUTES;
  window.REDUCED_WEEKLY_REST_MINUTES = REDUCED_WEEKLY_REST_MINUTES;
  window.REGULAR_WEEKLY_REST_MINUTES = REGULAR_WEEKLY_REST_MINUTES;
  window.MAX_TACHOGRAPH_SHIFT_MINUTES = MAX_TACHOGRAPH_SHIFT_MINUTES;
  window.REALISM_SHIFT_WARNING_MINUTES = REALISM_SHIFT_WARNING_MINUTES;
  window.MAX_TEAM_SHIFT_HOURS = MAX_TEAM_SHIFT_HOURS;
  window.DAILY_REST_CYCLE_HOURS_SINGLE = DAILY_REST_CYCLE_HOURS_SINGLE;
  window.DAILY_REST_CYCLE_HOURS_TEAM = DAILY_REST_CYCLE_HOURS_TEAM;
  window.DRIVING_MODE_SINGLE = DRIVING_MODE_SINGLE;
  window.DRIVING_MODE_TEAM = DRIVING_MODE_TEAM;
}

/** @returns {'single'|'team'|null} */
function normalizeDrivingMode(value) {
  if (value === DRIVING_MODE_TEAM || value === 'team') return DRIVING_MODE_TEAM;
  if (value === DRIVING_MODE_SINGLE || value === 'single') return DRIVING_MODE_SINGLE;
  return null;
}

/** Új műszak alapértelmezése a globális beállításból (nem szabálymotor-forrás). */
function getDefaultDrivingModeFromSettings() {
  try {
    return (typeof localStorage !== 'undefined' && localStorage.getItem('fourHandsEnabled') === 'true')
      ? DRIVING_MODE_TEAM
      : DRIVING_MODE_SINGLE;
  } catch (_) {
    return DRIVING_MODE_SINGLE;
  }
}

/**
 * Egyszer rögzített legacy fallback: a migráció pillanatában érvényes beállítás.
 * A profil toggle később NEM változtatja (sticky localStorage).
 */
function getLegacyDrivingModeFallback() {
  try {
    if (typeof localStorage !== 'undefined') {
      let stored = normalizeDrivingMode(localStorage.getItem(DRIVING_MODE_MIGRATION_DEFAULT_KEY));
      if (!stored) {
        stored = normalizeDrivingMode(localStorage.getItem(DRIVING_MODE_MIGRATION_DEFAULT_KEY_LEGACY));
        if (stored) {
          localStorage.setItem(DRIVING_MODE_MIGRATION_DEFAULT_KEY, stored);
          if (localStorage.getItem(DRIVING_MODE_MIGRATION_DONE_KEY_LEGACY)) {
            localStorage.setItem(DRIVING_MODE_MIGRATION_DONE_KEY, '1');
          }
        }
      }
      if (stored) return stored;
    }
  } catch (_) {}

  const mode = getDefaultDrivingModeFromSettings();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DRIVING_MODE_MIGRATION_DEFAULT_KEY, mode);
      localStorage.setItem(DRIVING_MODE_MIGRATION_DONE_KEY, '1');
    }
  } catch (_) {}
  return mode;
}

/**
 * Szabálymotor / UI olvasás: rekordon tárolt mód, hiány esetén sticky migration default
 * (soha nem az aktuális profil toggle).
 */
function resolveDrivingMode(record) {
  const normalized = normalizeDrivingMode(record && record.drivingMode);
  return normalized || getLegacyDrivingModeFallback();
}

function isTeamDrivingMode(modeOrRecord) {
  if (modeOrRecord && typeof modeOrRecord === 'object') {
    return resolveDrivingMode(modeOrRecord) === DRIVING_MODE_TEAM;
  }
  return normalizeDrivingMode(modeOrRecord) === DRIVING_MODE_TEAM;
}

function getDailyRestCycleHours(drivingMode) {
  const mode = (drivingMode && typeof drivingMode === 'object')
    ? resolveDrivingMode(drivingMode)
    : (normalizeDrivingMode(drivingMode) || DRIVING_MODE_SINGLE);
  return mode === DRIVING_MODE_TEAM ? DAILY_REST_CYCLE_HOURS_TEAM : DAILY_REST_CYCLE_HOURS_SINGLE;
}

/**
 * Mentés / persist: hiányzó drivingMode kitöltése sticky migration defaulttal.
 * Új műszak létrehozásakor a friss profil defaultot külön kell állítani
 * (getDefaultDrivingModeFromSettings) — ez a függvény NEM az élő toggle-t olvassa.
 */
function ensureDrivingModeOnRecord(record) {
  if (!record || typeof record !== 'object') return record;
  const entryType = record.entryType || 'workday';
  if (entryType === 'noteDay') return record;
  const existing = normalizeDrivingMode(record.drivingMode);
  record.drivingMode = existing || getLegacyDrivingModeFallback();
  return record;
}

/**
 * In-memory backfill: hiányzó drivingMode → sticky legacy fallback.
 * @returns {object[]} a kitöltött rekordok (persisthez)
 */
function backfillMissingDrivingModes(list) {
  const records = Array.isArray(list) ? list : [];
  const stamped = [];
  const fallbackMode = getLegacyDrivingModeFallback();

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (!r || typeof r !== 'object') continue;
    const entryType = r.entryType || 'workday';
    if (entryType === 'noteDay') continue;
    if (!r.startTime || !r.endTime) continue;
    if (normalizeDrivingMode(r.drivingMode)) continue;
    r.drivingMode = fallbackMode;
    stamped.push(r);
  }
  return stamped;
}

if (typeof window !== 'undefined') {
  window.normalizeDrivingMode = normalizeDrivingMode;
  window.getDefaultDrivingModeFromSettings = getDefaultDrivingModeFromSettings;
  window.resolveDrivingMode = resolveDrivingMode;
  window.isTeamDrivingMode = isTeamDrivingMode;
  window.getDailyRestCycleHours = getDailyRestCycleHours;
  window.ensureDrivingModeOnRecord = ensureDrivingModeOnRecord;
  window.backfillMissingDrivingModes = backfillMissingDrivingModes;
}

function getActiveTranslations() {
    if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
        return translations[currentLang] || {};
    }
    return {};
}

function getLocaleForLanguage(lang) {
    if (!lang) return DEFAULT_LOCALE;
    return LOCALE_MAP[lang] || DEFAULT_LOCALE;
}

function getCurrentLocale() {
    if (typeof currentLang === 'string') {
        return getLocaleForLanguage(currentLang);
    }
    return DEFAULT_LOCALE;
}

/**
 * Biztonságos YYYY-MM-DD parse – lokális naptári dátum, időzóna-csúszás nélkül.
 * @param {string} dateStr
 * @returns {Date|null}
 */
function parseDateOnlyString(dateStr) {
    if (dateStr == null || dateStr === '') return null;
    var s = String(dateStr).trim();
    if (!s) return null;
    var parts = s.split('-');
    if (parts.length !== 3) return null;
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    var day = parseInt(parts[2], 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    var date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
}

/**
 * YYYY-MM-DD megjelenítése az aktuális app nyelv locale-ja szerint.
 * @param {string} dateString
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
function formatLocalizedDate(dateString, options) {
    if (dateString == null || dateString === '') return '';
    var date = parseDateOnlyString(dateString);
    if (!date) return String(dateString);
    var locale = getCurrentLocale();
    var formatOptions = options || { year: 'numeric', month: '2-digit', day: '2-digit' };
    try {
        return new Intl.DateTimeFormat(locale, formatOptions).format(date);
    } catch (_) {
        return String(dateString);
    }
}

/**
 * YYYY-MM hónap megjelenítése az aktuális app nyelv locale-ja szerint.
 * @param {string} yearMonth
 * @returns {string}
 */
function formatLocalizedMonthYear(yearMonth) {
    if (yearMonth == null || yearMonth === '') return '';
    var parts = String(yearMonth).trim().split('-');
    if (parts.length !== 2) return String(yearMonth);
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return String(yearMonth);
    var date = new Date(year, month - 1, 1);
    try {
        return new Intl.DateTimeFormat(getCurrentLocale(), { year: 'numeric', month: 'long' }).format(date);
    } catch (_) {
        return String(yearMonth);
    }
}

function getTimePlaceholderValue() {
    const i18n = getActiveTranslations();
    if (i18n.timePlaceholder) return i18n.timePlaceholder;
    const key = typeof currentLang === 'string' ? currentLang : 'default';
    return DEFAULT_TIME_PLACEHOLDERS[key] || DEFAULT_TIME_PLACEHOLDERS.default;
}

function getTimePlaceholderExampleValue() {
    const i18n = getActiveTranslations();
    if (i18n.timePlaceholderExample) return i18n.timePlaceholderExample;
    const pattern = getTimePlaceholderValue();
    const lang = typeof currentLang === 'string' ? currentLang : '';
    const ex = (lang === 'de' ? 'z. B.' : (lang === 'ro' ? 'ex.' : (lang === 'pl' ? 'np.' : ((lang === 'da' || lang === 'no') ? 'f.eks.' : (lang === 'hu' ? 'pl.' : 'e.g.')))));
    return `${pattern} (${ex} 02:30)`;
}

function getDurationUnitTokens() {
    const i18n = getActiveTranslations();
    const key = typeof currentLang === 'string' ? currentLang : 'default';
    const fallback = DEFAULT_DURATION_UNITS[key] || DEFAULT_DURATION_UNITS.default;
    return {
        hours: i18n.durationHourUnitShort || fallback.hours,
        minutes: i18n.durationMinuteUnitShort || fallback.minutes
    };
}

// === HELPER: Aktuális helyi dátum/idő input mezőkhöz ===
function getNowLocalDateInputValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getNowLocalTimeInputValue() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Átalakítja az "óó:pp" formátumú stringet perccé
function parseTimeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const p = timeStr.split(':');
    if (p.length !== 2) return 0;
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
}

// A perceket lokalizált formátumra alakítja
function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.max(0, Math.round(minutes % 60));
    const units = getDurationUnitTokens();
    return `${h}${units.hours} ${m}${units.minutes}`;
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

// =======================================================
// ===== ÉJSZAKAI IDŐSÁV =================================
// =======================================================

function normalizeTimeString(value) {
    if (!value) return null;
    const match = String(value).trim().match(/^(\d{1,2}):?(\d{2})$/);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59 || hours < 0 || hours > 23) {
        return null;
    }
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getNightShiftConfig() {
    const defaults = { start: DEFAULT_NIGHT_SHIFT_START, end: DEFAULT_NIGHT_SHIFT_END };
    let start = defaults.start;
    let end = defaults.end;

    try {
        if (typeof localStorage !== 'undefined') {
            start = localStorage.getItem('nightShiftStart') || start;
            end = localStorage.getItem('nightShiftEnd') || end;
        }
    } catch (_) {}

    if (typeof window !== 'undefined' && window.userSettings) {
        start = window.userSettings.nightShiftStart || start;
        end = window.userSettings.nightShiftEnd || end;
    }

    start = normalizeTimeString(start) || defaults.start;
    end = normalizeTimeString(end) || defaults.end;

    return {
        start,
        end,
        startMinutes: parseTimeToMinutes(start),
        endMinutes: parseTimeToMinutes(end)
    };
}

function isWithinNightShift(minuteOfDay, startMinutes, endMinutes) {
    if (startMinutes === endMinutes) {
        return false;
    }
    if (startMinutes < endMinutes) {
        return minuteOfDay >= startMinutes && minuteOfDay < endMinutes;
    }
    return minuteOfDay >= startMinutes || minuteOfDay < endMinutes;
}

function getNightShiftLabel(baseLabel) {
    const { start, end } = getNightShiftConfig();
    const safeBase = baseLabel || 'Éjszakai idő';
    if (!start || !end) return safeBase;
    return `${safeBase} (${start}-${end})`;
}

function getNightShiftRecalcKey() {
    const { start, end } = getNightShiftConfig();
    const safeStart = start || DEFAULT_NIGHT_SHIFT_START;
    const safeEnd = end || DEFAULT_NIGHT_SHIFT_END;
    return `nightWorkRecalculated_${safeStart}_${safeEnd}`;
}

// =======================================================
// ===== IDŐZÓNA KEZELÉS =================================
// =======================================================

/**
 * Visszaadja a preferált időzónát (Firestore-ból vagy localStorage-ból)
 * Ha nincs beállítva, akkor a böngésző aktuális időzónáját
 */
function getPreferredTimezone() {
    // Először Firestore-ból próbálunk
    if (typeof window.userSettings !== 'undefined' && window.userSettings && window.userSettings.preferredTimezone) {
        return window.userSettings.preferredTimezone;
    }
    
    // Ha nincs, akkor a böngésző időzónája
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Létrehoz egy Date objektumot a preferált időzónában
 * @param {string} dateStr - Dátumstring (YYYY-MM-DD)
 * @param {string} timeStr - Idő string (HH:MM)
 * @returns {Date}
 */
function createDateInPreferredTimezone(dateStr, timeStr) {
    const preferredTz = getPreferredTimezone();
    const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Ha megegyezik az időzóna, egyszerű Date objektum
    if (preferredTz === currentTz) {
        return new Date(`${dateStr}T${timeStr}`);
    }
    
    // Különböző időzóna esetén: konvertálás szükséges
    // Ez komplex művelet, de a JavaScript automatikusan kezeli a DST-t
    const dateTimeStr = `${dateStr}T${timeStr}:00`;
    
    try {
        // Megpróbáljuk a preferált időzónában értelmezni
        const date = new Date(dateTimeStr);
        
        // Offset számítás (egyszerűsített, de működik a legtöbb esetben)
        const preferredOffset = getTimezoneOffset(preferredTz, date);
        const currentOffset = date.getTimezoneOffset();
        
        const offsetDiff = preferredOffset - currentOffset;
        date.setMinutes(date.getMinutes() + offsetDiff);
        
        return date;
    } catch (e) {
        console.warn('Timezone conversion failed, using local time:', e);
        return new Date(`${dateStr}T${timeStr}`);
    }
}

/**
 * Visszaadja egy időzóna offset-jét egy adott dátumra (percekben)
 */
function getTimezoneOffset(timezone, date) {
    try {
        const str = date.toLocaleString('en-US', { timeZone: timezone, timeStyle: 'long' });
        const match = str.match(/GMT([+-]\d+)/);
        if (match) {
            const hours = parseInt(match[1], 10);
            return -hours * 60; // JavaScript offset fordított előjelű
        }
    } catch (e) {
        console.warn('Failed to get timezone offset:', e);
    }
    return 0;
}

// =======================================================
// ===== MUNKAIDŐ SZÁMÍTÁSOK (DST-AWARE) ================
// =======================================================

/**
 * Kiszámolja a munkaidőt két időpont között, figyelembe véve a napváltást ÉS az óraátállítást
 * @param {string} start - Kezdési idő (HH:MM)
 * @param {string} end - Befejezési idő (HH:MM)
 * @param {string} date - Dátum (YYYY-MM-DD) - a befejezés dátuma
 * @returns {number} - Munkaidő percekben
 */
function calculateWorkMinutes(start, end, date) {
    if (!start || !end || !date) {
        if ((start || end) && !date) {
            try { console.warn('[time.js] calculateWorkMinutes: date paraméter hiányzik, 0 perc visszaadva.'); } catch (_) {}
        }
        return 0;
    }
    
    // Valós dátumokkal dolgozunk a preferált időzónában
    let startDate = createDateInPreferredTimezone(date, start);
    let endDate = createDateInPreferredTimezone(date, end);
    
    // Ha éjszakai műszak (átlépés következő napra)
    if (endDate <= startDate) {
        // A kezdés egy nappal korábban volt
        startDate = new Date(startDate);
        startDate.setDate(startDate.getDate() - 1);
    }
    
    // A JavaScript automatikusan kezeli a DST-t!
    // Tavaszi átállítás: 23 órás nap
    // Őszi átállítás: 25 órás nap
    const diffMs = endDate - startDate;
    return Math.floor(diffMs / 60000);
}

/**
 * Kiszámolja az éjszakai (20:00-05:00) munkavégzés perceit
 * FONTOS: Ez is figyelembe veszi az óraátállítást!
 * @param {string} startTime - Kezdési idő (HH:MM)
 * @param {string} endTime - Befejezési idő (HH:MM)
 * @param {string} date - Dátum (YYYY-MM-DD) - a befejezés dátuma
 * @returns {number} - Éjszakai munkaidő percekben
 */
function calculateNightWorkMinutes(startTime, endTime, date) {
    if (!startTime || !endTime || !date) {
        if ((startTime || endTime) && !date) {
            try { console.warn('[time.js] calculateNightWorkMinutes: date paraméter hiányzik, 0 perc visszaadva.'); } catch (_) {}
        }
        return 0;
    }
    const nightConfig = getNightShiftConfig();
    
    let start = createDateInPreferredTimezone(date, startTime);
    let end = createDateInPreferredTimezone(date, endTime);
    
    // Ha éjszakai műszak
    if (end <= start) {
        start = new Date(start);
        start.setDate(start.getDate() - 1);
    }
    
    let nightMinutes = 0;
    let current = new Date(start);
    
    // Percről percre lépkedés (ez automatikusan kezeli a DST-t!)
    while (current < end) {
        const minuteOfDay = (current.getHours() * 60) + current.getMinutes();
        if (isWithinNightShift(minuteOfDay, nightConfig.startMinutes, nightConfig.endMinutes)) {
            nightMinutes++;
        }
        current.setMinutes(current.getMinutes() + 1);
    }
    
    return nightMinutes;
}

// =======================================================
// ===== DÁTUM SEGÉDFÜGGVÉNYEK ===========================
// =======================================================

// Visszaadja egy dátum ISO formátumú stringjét (éééé-hh-nn)
function toISODate(d) {
    if (!(d instanceof Date)) {
        d = new Date(d);
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

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
    if (currentLang === 'en') {
        // English: Custom format to match style of other languages
        const options = { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true };
        const formatted = date.toLocaleString('en-US', options);
        // Format: "Tuesday, 01/20/2026, 08:03 PM" -> "Tuesday, 01/20/2026, 08:03 PM"
        return formatted;
    }
    const locale = getCurrentLocale();
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

// =======================================================
// ===== ÓRAÁTÁLLÍTÁS ÉSZLELÉSE ==========================
// =======================================================

/**
 * Ellenőrzi, hogy egy adott dátum óraátállítás napja-e
 * @param {string} dateStr - Dátum (YYYY-MM-DD)
 * @returns {Object} { isDSTChange: boolean, type: 'spring'|'fall'|null, hourDiff: number }
 */
function checkDSTChange(dateStr) {
    if (!dateStr) return { isDSTChange: false, type: null, hourDiff: 0 };
    
    try {
        const date = new Date(dateStr + 'T12:00:00');
        const dayBefore = new Date(date);
        dayBefore.setDate(dayBefore.getDate() - 1);
        
        // Offset különbség (percben)
        const offsetBefore = dayBefore.getTimezoneOffset();
        const offsetCurrent = date.getTimezoneOffset();
        const diff = offsetBefore - offsetCurrent;
        
        if (diff === 0) {
            return { isDSTChange: false, type: null, hourDiff: 0 };
        }
        
        // Tavaszi átállítás: offset csökken (pl. 60 -> 0, azaz -60 perc)
        // Őszi átállítás: offset nő (pl. 0 -> 60, azaz +60 perc)
        const hourDiff = Math.abs(diff) / 60;
        
        return {
            isDSTChange: true,
            type: diff > 0 ? 'spring' : 'fall',
            hourDiff: hourDiff
        };
    } catch (e) {
        console.warn('DST check failed:', e);
        return { isDSTChange: false, type: null, hourDiff: 0 };
    }
}

/**
 * Ellenőrzi, hogy már látta-e a felhasználó a DST értesítést
 * @param {string} dateStr - Dátum (YYYY-MM-DD)
 * @returns {boolean}
 */
function hasDSTNotificationBeenShown(dateStr) {
    if (!dateStr) return true;
    
    // Firestore-ból próbáljuk
    if (typeof window.userSettings !== 'undefined' && window.userSettings && window.userSettings.lastDSTNotification) {
        return window.userSettings.lastDSTNotification === dateStr;
    }
    
    // Fallback localStorage
    const lastShown = localStorage.getItem('lastDSTNotification');
    return lastShown === dateStr;
}

/**
 * Elmenti, hogy megjelent a DST értesítés
 * @param {string} dateStr - Dátum (YYYY-MM-DD)
 */
async function markDSTNotificationShown(dateStr) {
    if (!dateStr) return;
    
    try {
        // localStorage fallback
        localStorage.setItem('lastDSTNotification', dateStr);
        
        // Firestore mentés
        if (typeof window.saveSettingsToFirestore === 'function') {
            await window.saveSettingsToFirestore({ lastDSTNotification: dateStr });
        }
        
        // Helyi cache frissítés
        if (typeof window.userSettings !== 'undefined' && window.userSettings) {
            window.userSettings.lastDSTNotification = dateStr;
        }
    } catch (e) {
        console.error('Failed to mark DST notification as shown:', e);
    }
}

/**
 * Megjeleníti az óraátállítás tájékoztató üzenetet
 * @param {string} dateStr - Dátum (YYYY-MM-DD)
 * @param {Object} dstInfo - DST információ (checkDSTChange eredménye)
 */
function showDSTNotification(dateStr, dstInfo) {
    if (!dstInfo.isDSTChange) return;
    
    const i18n = translations[currentLang];

    // Segédfüggvény: sablon kitöltése {kulcs} helyőrzőkkel
    const fillTemplate = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
    const vars = {
        date: dateStr,
        hourDiff: dstInfo.hourDiff,
        dayHours: dstInfo.type === 'spring' ? (24 - dstInfo.hourDiff) : (24 + dstInfo.hourDiff)
    };
    
    let message = '';
    let emoji = '';
    
    if (dstInfo.type === 'spring') {
        // Tavaszi átállítás: óra előre
        emoji = '🌸';
        if (i18n?.dstSpringMessage) {
            message = fillTemplate(i18n.dstSpringMessage, vars);
        } else {
            message = `
            <div class="text-left">
                <p class="font-bold mb-3">${emoji} Tavaszi óraátállítás észlelve!</p>
                <p class="mb-2">
                    <strong>Dátum:</strong> ${dateStr}
                </p>
                <p class="mb-3">
                    Az órákat <strong>${dstInfo.hourDiff} órával előre állították</strong> az éjszaka során. 
                    Ez a nap <strong>${24 - dstInfo.hourDiff} órás</strong>.
                </p>
                <p class="text-sm bg-blue-50 dark:bg-blue-900/30 p-3 rounded">
                    ℹ️ A program automatikusan figyelembe veszi ezt a munkaidő és vezetési idő számításánál. 
                    A valós ledolgozott órák kerülnek rögzítésre.
                </p>
            </div>`;
        }
    } else {
        // Őszi átállítás: óra hátra
        emoji = '🍂';
        if (i18n?.dstFallMessage) {
            message = fillTemplate(i18n.dstFallMessage, vars);
        } else {
            message = `
            <div class="text-left">
                <p class="font-bold mb-3">${emoji} Őszi óraátállítás észlelve!</p>
                <p class="mb-2">
                    <strong>Dátum:</strong> ${dateStr}
                </p>
                <p class="mb-3">
                    Az órákat <strong>${dstInfo.hourDiff} órával hátra állították</strong> az éjszaka során. 
                    Ez a nap <strong>${24 + dstInfo.hourDiff} órás</strong>.
                </p>
                <p class="text-sm bg-blue-50 dark:bg-blue-900/30 p-3 rounded">
                    ℹ️ A program automatikusan figyelembe veszi ezt a munkaidő és vezetési idő számításánál. 
                    A valós ledolgozott órák kerülnek rögzítésre.
                </p>
            </div>`;
        }
    }
    
    if (typeof showCustomAlert === 'function') {
        showCustomAlert(message, 'info', async () => {
            await markDSTNotificationShown(dateStr);
        }, { 
            okText: i18n?.understood || 'Értettem',
            allowHTML: true
        });
    }
}

/**
 * Ellenőrzi és megjeleníti a DST értesítést, ha szükséges
 * @param {string} dateStr - Dátum (YYYY-MM-DD)
 */
async function checkAndShowDSTNotification(dateStr) {
    if (!dateStr) return;
    
    // Már látta?
    if (hasDSTNotificationBeenShown(dateStr)) return;
    
    // Van óraátállítás?
    const dstInfo = checkDSTChange(dateStr);
    if (!dstInfo.isDSTChange) return;
    
    // Megjelenítés
    showDSTNotification(dateStr, dstInfo);
}

// =======================================================
// ===== IDŐZÓNA VÁLTÁS ÉRZÉKELÉSE =======================
// =======================================================

/**
 * Ellenőrzi, hogy megváltozott-e a böngésző időzónája
 * @returns {boolean}
 */
function hasTimezoneChanged() {
    const preferredTz = getPreferredTimezone();
    const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    return preferredTz !== currentTz;
}

/**
 * Ellenőrzi, hogy kell-e időzóna figyelmeztetést mutatni
 */
function shouldShowTimezoneWarning() {
    // Ha le van tiltva a figyelmeztetés
    if (typeof window.userSettings !== 'undefined' && window.userSettings && window.userSettings.timezoneWarningDismissed) {
        return false;
    }
    
    // Ha változott az időzóna
    return hasTimezoneChanged();
}

/**
 * Megjeleníti az időzóna figyelmeztetést
 */
function showTimezoneWarning() {
    if (!shouldShowTimezoneWarning()) return;
    
    const preferredTz = getPreferredTimezone();
    const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const i18n = translations[currentLang];
    const message = `
        <div class="text-left">
            <p class="font-bold mb-2">⚠️ ${i18n?.timezoneWarningTitle || 'IDŐZÓNA VÁLTOZÁS ÉSZLELVE!'}</p>
            <p class="text-sm mb-2">
                <strong>${i18n?.timezoneCurrentLabel || 'Jelenleg'}:</strong> ${currentTz}<br>
                <strong>${i18n?.timezonePreferredLabel || 'Beállított'}:</strong> ${preferredTz}
            </p>
            <p class="text-sm mb-3">
                ${i18n?.timezoneWarningMessage || 'Fontos: Továbbra is a beállított időzóna szerint rögzítsd az időpontokat!'}
            </p>
            <div class="flex gap-2">
                <button onclick="dismissTimezoneWarning()" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm">
                    ${i18n?.timezoneWarningDismiss || 'Ne jelenjen meg többé'}
                </button>
                <button onclick="closeCustomAlert()" class="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm">
                    ${i18n?.timezoneWarningOk || 'Értettem'}
                </button>
            </div>
        </div>
    `;
    
    if (typeof showCustomAlert === 'function') {
        showCustomAlert(message, 'warning', null, { hideDefaultButtons: true });
    }
}

/**
 * Elutasítja az időzóna figyelmeztetést (ne jelenjen meg többé)
 */
async function dismissTimezoneWarning() {
    try {
        if (typeof window.saveSettingsToFirestore === 'function') {
            await window.saveSettingsToFirestore({ timezoneWarningDismissed: true });
        }
        
        // Frissítjük a helyi cache-t is
        if (typeof window.userSettings === 'undefined') {
            window.userSettings = {};
        }
        window.userSettings.timezoneWarningDismissed = true;
        
        if (typeof closeCustomAlert === 'function') {
            closeCustomAlert();
        }
    } catch (e) {
        console.error('Failed to dismiss timezone warning:', e);
    }
}

// =======================================================
// ===== GLOBÁLIS EXPORTÁLÁS =============================
// =======================================================

if (typeof window !== 'undefined') {
    window.parseTimeToMinutes = parseTimeToMinutes;
    window.formatDuration = formatDuration;
    window.formatAsHoursAndMinutes = formatAsHoursAndMinutes;
    window.formatTimeInput = formatTimeInput;
    window.calculateWorkMinutes = calculateWorkMinutes;
    window.calculateNightWorkMinutes = calculateNightWorkMinutes;
    window.getNightShiftConfig = getNightShiftConfig;
    window.getNightShiftLabel = getNightShiftLabel;
    window.checkDSTChange = checkDSTChange;
    window.hasDSTNotificationBeenShown = hasDSTNotificationBeenShown;
    window.markDSTNotificationShown = markDSTNotificationShown;
    window.getPreferredTimezone = getPreferredTimezone;
    window.createDateInPreferredTimezone = createDateInPreferredTimezone;
    window.getTimezoneOffset = getTimezoneOffset;
    window.getWeekRange = getWeekRange;
    window.getWeekIdentifier = getWeekIdentifier;
    window.getLocaleForLanguage = getLocaleForLanguage;
    window.getCurrentLocale = getCurrentLocale;
    window.parseDateOnlyString = parseDateOnlyString;
    window.formatLocalizedDate = formatLocalizedDate;
    window.formatLocalizedMonthYear = formatLocalizedMonthYear;
    window.getTimePlaceholderValue = getTimePlaceholderValue;
    window.getTimePlaceholderExampleValue = getTimePlaceholderExampleValue;
    window.getDurationUnitTokens = getDurationUnitTokens;
    window.showTimezoneWarning = showTimezoneWarning;
    window.dismissTimezoneWarning = dismissTimezoneWarning;
    window.checkDSTChange = checkDSTChange;
    window.hasDSTNotificationBeenShown = hasDSTNotificationBeenShown;
    window.markDSTNotificationShown = markDSTNotificationShown;
    window.showDSTNotification = showDSTNotification;
    window.checkAndShowDSTNotification = checkAndShowDSTNotification;
    window.getNightShiftConfig = getNightShiftConfig;
    window.getNightShiftLabel = getNightShiftLabel;
}
