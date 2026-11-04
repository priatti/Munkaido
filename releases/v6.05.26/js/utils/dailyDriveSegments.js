// js/utils/dailyDriveSegments.js
// Napi vezetési szegmensek – közös logika tachográf 10h szabályhoz és összesítőkhöz.

(function () {
  'use strict';

  /**
   * V–H (vasárnap–hétfő) átnyúló műszak felismerése mentett flag vagy dátumok alapján.
   */
  function detectSundayMondayShift(record) {
    if (!record) return false;
    if (record.isSundayMondayShift) return true;
    if (!record.date || !record.endDate) return false;
    if (typeof window.isSundayMondayShift === 'function') {
      return window.isSundayMondayShift(record.date, record.endDate);
    }
    try {
      const start = new Date(String(record.date) + 'T12:00:00');
      const end = new Date(String(record.endDate) + 'T12:00:00');
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
      return start.getDay() === 0 && end.getDay() === 1;
    } catch (_) {
      return false;
    }
  }

  /**
   * Hétfői (záró) naptári nap – date = indulás (vasárnap), endDate = érkezés (hétfő).
   */
  function resolveMondayDate(record) {
    if (record && record.endDate) return String(record.endDate);
    if (!record || !record.date) return '';
    try {
      const d = new Date(String(record.date) + 'T12:00:00');
      if (isNaN(d.getTime())) return '';
      d.setDate(d.getDate() + 1);
      return typeof toISODate === 'function' ? toISODate(d) : d.toISOString().slice(0, 10);
    } catch (_) {
      return '';
    }
  }

  /**
   * Napi vezetési szegmensek egy rekordhoz.
   * @param {object} record
   * @param {string} [drivingTimeMode] - weekly | biweekly | daily
   * @returns {{ date: string, minutes: number }[]}
   */
  function getDailyDriveSegmentsForRecord(record, drivingTimeMode) {
    const segments = [];
    if (!record) return segments;

    const total = Math.max(0, Number(record.driveMinutes) || 0);
    const mode = drivingTimeMode
      || (typeof localStorage !== 'undefined' ? localStorage.getItem('drivingTimeMode') : null)
      || 'weekly';

    const isVH = detectSundayMondayShift(record);

    if (!isVH) {
      if (record.date) {
        segments.push({ date: String(record.date), minutes: total });
      }
      return segments;
    }

    const sundayStr = String(record.date || '');
    const mondayStr = resolveMondayDate(record);
    const sun = Math.max(0, Number(record.sundayDriveMinutes) || 0);
    const mon = Math.max(0, Number(record.mondayDriveMinutes) || 0);

    if (sun > 0 || mon > 0) {
      if (sun > 0 && sundayStr) segments.push({ date: sundayStr, minutes: sun });
      if (mon > 0 && mondayStr) segments.push({ date: mondayStr, minutes: mon });
      return segments;
    }

    // Legacy fallback: nincs sundayDriveMinutes / mondayDriveMinutes – ne számoljuk az egészet vasárnapra.
    // Napi/kétheti módban alapból hétfőre; heti módban is a záró nap a kevésbé agresszív választás.
    if (mode === 'daily' || mode === 'biweekly') {
      if (record.isSundayMondayManual) {
        // Kézi bontás jelölve, de adat hiányzik – hétfőre (auto default).
        if (mondayStr) segments.push({ date: mondayStr, minutes: total });
        else if (sundayStr) segments.push({ date: sundayStr, minutes: total });
        return segments;
      }
      if (mondayStr) segments.push({ date: mondayStr, minutes: total });
      else if (sundayStr) segments.push({ date: sundayStr, minutes: total });
      return segments;
    }

    // weekly + legacy V–H bontás nélkül
    if (mondayStr) segments.push({ date: mondayStr, minutes: total });
    else if (sundayStr) segments.push({ date: sundayStr, minutes: total });
    return segments;
  }

  /**
   * Tachográf-hét kulcs: a hét hétfőjének ISO dátuma (hétfő–vasárnap keret).
   */
  function getTachographWeekKey(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(String(dateStr) + 'T12:00:00');
      if (isNaN(d.getTime())) return '';
      if (typeof getWeekRange !== 'function' || typeof toISODate !== 'function') {
        return String(dateStr).slice(0, 10);
      }
      const range = getWeekRange(d);
      return toISODate(range.start);
    } catch (_) {
      return '';
    }
  }

  /** Szegmens dátuma az adott tachográf-hétben van-e (weekStartStr = hét hétfője). */
  function isDateInTachographWeek(dateStr, weekStartStr, weekEndStr) {
    if (!dateStr || !weekStartStr) return false;
    if (weekEndStr && dateStr > weekEndStr) return false;
    return dateStr >= weekStartStr;
  }

  window.getDailyDriveSegmentsForRecord = getDailyDriveSegmentsForRecord;
  window.getTachographWeekKey = getTachographWeekKey;
  window.isDateInTachographWeek = isDateInTachographWeek;
})();
