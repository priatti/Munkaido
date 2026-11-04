/**
 * Havi PDF/HTML riport sorok normalizálása: éjfélen átnyúló műszakok bontása, háttértípus.
 */
(function (global) {
  'use strict';

  var BG_RGB = {
    sick: [232, 244, 255],
    vacation: [232, 248, 236],
    holiday: [255, 235, 235]
  };

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function isOvernightWorkRecord(record) {
    if (!record || record.entryType === 'noteDay') return false;
    if (!record.startTime || !record.endTime) return false;
    var startDate = String(record.date || '');
    var endDate = String(record.endDate || record.date || '');
    if (endDate > startDate) return true;
    if (endDate === startDate) {
      try {
        return new Date('1970-01-01T' + record.endTime) < new Date('1970-01-01T' + record.startTime);
      } catch (_) {
        return false;
      }
    }
    return false;
  }

  /** sick > vacation > holiday (holiday: rowDate alapján) */
  function getRowBackgroundType(record, rowDate) {
    if (!record) return null;
    var et = record.entryType || 'workday';
    var d = rowDate || record.date || '';
    if (et === 'noteDay' && String(record.date) === String(d)) {
      if (record.absenceType === 'sick') return 'sick';
      if (record.absenceType === 'vacation') return 'vacation';
    }
    if (typeof isHolidayOnDate === 'function' && isHolidayOnDate(record, d)) return 'holiday';
    return null;
  }

  function getCrossingsForSegment(crossings, record, segmentType) {
    if (!crossings || !crossings.length) return [];
    if (!isOvernightWorkRecord(record)) return crossings.slice();
    var startTime = record.startTime;
    return crossings.filter(function (c) {
      if (!c || !c.time) return false;
      var onNextDay = c.time < startTime;
      if (segmentType === 'overnight_start') return !onNextDay;
      if (segmentType === 'overnight_end') return onNextDay;
      return true;
    });
  }

  function calcWorkSegment(start, end, endDateIso) {
    if (typeof calculateWorkMinutes === 'function') {
      return calculateWorkMinutes(start, end, endDateIso) || 0;
    }
    return 0;
  }

  function calcNightSegment(start, end, endDateIso) {
    if (typeof calculateNightWorkMinutes === 'function') {
      return calculateNightWorkMinutes(start, end, endDateIso) || 0;
    }
    return 0;
  }

  function buildNoteDayRow(record) {
    return {
      date: record.date,
      weekday: null,
      entryType: 'noteDay',
      beginTime: '',
      beginLocation: '',
      endTime: '',
      endLocation: '',
      borderCrossings: [],
      workDurationMinutes: 0,
      nightDurationMinutes: 0,
      driveDurationMinutes: 0,
      kmStart: null,
      kmEnd: null,
      kmDriven: null,
      note: (record.note && String(record.note).trim()) ? String(record.note).trim() : '',
      originalEntryId: record.id || null,
      segmentType: 'normal',
      isSplitSegment: false,
      absenceType: record.absenceType || null,
      isHoliday: typeof isHolidayOnDate === 'function' ? isHolidayOnDate(record, record.date) : (record.isHoliday === true),
      rowBackgroundType: getRowBackgroundType(record, record.date),
      isEmpty: false,
      segmentOrder: 0,
      sourceRecord: record
    };
  }

  function buildWorkdayRow(record, opts) {
    var o = opts || {};
    var rowDate = o.date || record.date;
    return {
      date: rowDate,
      weekday: null,
      entryType: 'workday',
      beginTime: o.beginTime != null ? o.beginTime : (record.startTime || ''),
      beginLocation: o.beginLocation != null ? o.beginLocation : (record.startLocation || ''),
      endTime: o.endTime != null ? o.endTime : (record.endTime || ''),
      endLocation: o.endLocation != null ? o.endLocation : (record.endLocation || ''),
      borderCrossings: o.borderCrossings || (record.crossings ? record.crossings.slice() : []),
      workDurationMinutes: o.workDurationMinutes != null ? o.workDurationMinutes : (record.workMinutes || 0),
      nightDurationMinutes: o.nightDurationMinutes != null ? o.nightDurationMinutes : (record.nightWorkMinutes || 0),
      driveDurationMinutes: o.overrideDriveMinutes != null
        ? o.overrideDriveMinutes
        : (o.includeDrive ? (record.driveMinutes || 0) : 0),
      kmStart: o.includeKm ? record.kmStart : null,
      kmEnd: o.includeKm ? record.kmEnd : null,
      kmDriven: o.includeKm ? record.kmDriven : null,
      note: o.includeNote ? ((record.note && String(record.note).trim()) ? String(record.note).trim() : '') : '',
      originalEntryId: record.id || null,
      segmentType: o.segmentType || 'normal',
      isSplitSegment: !!o.isSplitSegment,
      absenceType: null,
      isHoliday: typeof isHolidayOnDate === 'function' ? isHolidayOnDate(record, rowDate) : false,
      rowBackgroundType: getRowBackgroundType(record, rowDate),
      isEmpty: false,
      segmentOrder: o.segmentOrder != null ? o.segmentOrder : 0,
      sourceRecord: record
    };
  }

  function expandEntryToReportSegments(entry) {
    if (!entry || !entry.date) return [];
    var et = entry.entryType || 'workday';
    if (et === 'noteDay') {
      return [buildNoteDayRow(entry)];
    }
    if (et !== 'workday' || !entry.startTime || !entry.endTime) {
      return [buildWorkdayRow(entry, { segmentType: 'normal', includeDrive: true, includeKm: true, includeNote: true })];
    }
    if (!isOvernightWorkRecord(entry)) {
      return [buildWorkdayRow(entry, {
        segmentType: 'normal',
        includeDrive: true,
        includeKm: true,
        includeNote: true,
        segmentOrder: 0
      })];
    }

    var endDateIso = entry.endDate || entry.date;
    var startCross = getCrossingsForSegment(entry.crossings, entry, 'overnight_start');
    var endCross = getCrossingsForSegment(entry.crossings, entry, 'overnight_end');

    // V-H (vasárnap–hétfő) átnyúlás: ha explicit bontás van, azt használjuk a szegmensekhez
    var isVHShift = !!(entry.isSundayMondayShift);
    var hasVHSplit = isVHShift && (Number(entry.sundayDriveMinutes) > 0 || Number(entry.mondayDriveMinutes) > 0);

    var startRow = buildWorkdayRow(entry, {
      date: entry.date,
      beginTime: entry.startTime,
      beginLocation: entry.startLocation || '',
      endTime: '24:00',
      endLocation: '',
      borderCrossings: startCross,
      workDurationMinutes: calcWorkSegment(entry.startTime, '00:00', endDateIso),
      nightDurationMinutes: calcNightSegment(entry.startTime, '00:00', endDateIso),
      segmentType: 'overnight_start',
      isSplitSegment: true,
      segmentOrder: 0,
      includeDrive: hasVHSplit,
      overrideDriveMinutes: hasVHSplit ? (Number(entry.sundayDriveMinutes) || 0) : null,
      includeKm: false,
      includeNote: false
    });

    var endRow = buildWorkdayRow(entry, {
      date: endDateIso,
      beginTime: '00:00',
      beginLocation: '',
      endTime: entry.endTime,
      endLocation: entry.endLocation || '',
      borderCrossings: endCross,
      workDurationMinutes: calcWorkSegment('00:00', entry.endTime, endDateIso),
      nightDurationMinutes: calcNightSegment('00:00', entry.endTime, endDateIso),
      segmentType: 'overnight_end',
      isSplitSegment: true,
      segmentOrder: 1,
      includeDrive: true,
      overrideDriveMinutes: hasVHSplit ? (Number(entry.mondayDriveMinutes) || 0) : null,
      includeKm: true,
      includeNote: true
    });

    return [startRow, endRow];
  }

  function segmentSortKey(row) {
    var order = { overnight_start: 0, overnight_end: 1, normal: 2 };
    return order[row.segmentType] != null ? order[row.segmentType] : 2;
  }

  /**
   * Összes hónap rekord → normalizált szegmensek (éjszakai bontás után).
   */
  function buildNormalizedReportSegments(monthRecords) {
    var out = [];
    (Array.isArray(monthRecords) ? monthRecords : []).forEach(function (entry) {
      expandEntryToReportSegments(entry).forEach(function (row) {
        out.push(row);
      });
    });
    out.sort(function (a, b) {
      if (a.date !== b.date) return String(a.date).localeCompare(String(b.date));
      var ta = a.beginTime || '99:99';
      var tb = b.beginTime || '99:99';
      if (ta !== tb) return ta.localeCompare(tb);
      if (a.segmentOrder !== b.segmentOrder) return a.segmentOrder - b.segmentOrder;
      return segmentSortKey(a) - segmentSortKey(b);
    });
    return out;
  }

  /**
   * Naptári napokra kiterjesztett sorlista (üres napokkal), PDF/HTML táblázathoz.
   */
  function buildMonthlyReportRows(monthRecords, year, month) {
    var y = String(year);
    var m = parseInt(month, 10);
    if (!isFinite(m) || m < 1 || m > 12) return [];
    var mStr = pad2(m);
    var daysInMonth = new Date(parseInt(y, 10), m, 0).getDate();
    var segments = buildNormalizedReportSegments(monthRecords);
    var byDate = {};
    segments.forEach(function (row) {
      if (!byDate[row.date]) byDate[row.date] = [];
      byDate[row.date].push(row);
    });

    var rows = [];
    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = y + '-' + mStr + '-' + pad2(day);
      var dayRows = byDate[dateStr];
      if (dayRows && dayRows.length) {
        dayRows.forEach(function (r) {
          rows.push(r);
        });
      } else {
        rows.push({
          date: dateStr,
          isEmpty: true,
          rowBackgroundType: null,
          entryType: null,
          isSplitSegment: false,
          segmentType: 'empty'
        });
      }
    }
    return rows;
  }

  function computeTotalsFromReportRows(rows) {
    return (Array.isArray(rows) ? rows : []).reduce(function (acc, row) {
      if (!row || row.isEmpty || row.entryType === 'noteDay') return acc;
      acc.workMinutes += row.workDurationMinutes || 0;
      acc.nightWorkMinutes += row.nightDurationMinutes || 0;
      acc.driveMinutes += row.driveDurationMinutes || 0;
      acc.kmDriven += typeof row.kmDriven === 'number' ? row.kmDriven : parseFloat(row.kmDriven || 0) || 0;
      return acc;
    }, { workMinutes: 0, nightWorkMinutes: 0, driveMinutes: 0, kmDriven: 0 });
  }

  function countWorkedDaysFromReportRows(rows) {
    var days = {};
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      if (!row || row.isEmpty || row.entryType === 'noteDay') return;
      var wm = Number(row.workDurationMinutes);
      if (isFinite(wm) && wm > 0) days[row.date] = true;
    });
    return Object.keys(days).length;
  }

  function getBackgroundRgb(type) {
    if (!type || !BG_RGB[type]) return null;
    return BG_RGB[type];
  }

  global.isOvernightWorkRecord = isOvernightWorkRecord;
  global.getRowBackgroundType = getRowBackgroundType;
  global.buildNormalizedReportSegments = buildNormalizedReportSegments;
  global.buildMonthlyReportRows = buildMonthlyReportRows;
  global.computeTotalsFromReportRows = computeTotalsFromReportRows;
  global.countWorkedDaysFromReportRows = countWorkedDaysFromReportRows;
  global.getReportRowBackgroundRgb = getBackgroundRgb;
})(typeof window !== 'undefined' ? window : global);
