// Járműszakaszok (vehicleSegments) – aktív műszak és napi rekord
(function () {
  'use strict';

  var MANUAL_VEHICLE_VALUE = '__manual__';

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function t(key, fallback) {
    try {
      var i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
        ? (translations[currentLang] || {})
        : {};
      var v = i18n[key];
      return (v != null && v !== '') ? v : (fallback || key);
    } catch (_) {
      return fallback || key;
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toSegmentIso(dateStr, timeStr) {
    if (!dateStr || !timeStr) return new Date().toISOString();
    try {
      var d = (typeof createDateInPreferredTimezone === 'function')
        ? createDateInPreferredTimezone(dateStr, timeStr)
        : new Date(dateStr + 'T' + timeStr);
      if (isNaN(d.getTime())) return new Date().toISOString();
      return d.toISOString();
    } catch (_) {
      return new Date().toISOString();
    }
  }

  function formatSegmentClock(isoStr) {
    if (!isoStr) return '';
    try {
      var d = new Date(isoStr);
      if (!isNaN(d.getTime())) {
        return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
      }
    } catch (_) {}
    if (/^\d{2}:\d{2}/.test(String(isoStr))) return String(isoStr).slice(0, 5);
    return '';
  }

  function normalizePlate(plate) {
    if (!plate) return null;
    if (window.VehiclesService && typeof window.VehiclesService.normalizePlateKey === 'function') {
      return window.VehiclesService.normalizePlateKey(plate);
    }
    return String(plate).toUpperCase().replace(/\s+/g, '');
  }

  function buildSnapshotFromFields(vehicleId, plate, normalized) {
    if (!vehicleId && !plate) return null;
    return {
      vehicleId: vehicleId ? String(vehicleId) : null,
      plateNumber: plate || '',
      plateNumberNormalized: normalized || normalizePlate(plate),
      vehicleScope: 'personal',
      companyId: null,
      officeManaged: false,
    };
  }

  function createSegment(fields) {
    return {
      vehicleId: fields.vehicleId != null ? String(fields.vehicleId) : null,
      vehiclePlateNumber: fields.vehiclePlateNumber || null,
      vehiclePlateNumberNormalized: fields.vehiclePlateNumberNormalized || null,
      vehicleSnapshot: fields.vehicleSnapshot || null,
      startKm: fields.startKm != null && fields.startKm !== '' ? Number(fields.startKm) : null,
      endKm: fields.endKm != null && fields.endKm !== '' ? Number(fields.endKm) : null,
      distanceKm: fields.distanceKm != null ? Number(fields.distanceKm) : null,
      startTime: fields.startTime || null,
      endTime: fields.endTime || null,
      source: fields.source || 'manual',
      note: fields.note || null,
    };
  }

  function computeSegmentDistance(segment) {
    if (!segment) return null;
    var start = segment.startKm;
    var end = segment.endKm;
    if (start == null || end == null || !Number.isFinite(start) || !Number.isFinite(end)) return null;
    return Math.max(0, end - start);
  }

  function getOpenSegment(segments) {
    if (!Array.isArray(segments) || !segments.length) return null;
    for (var i = segments.length - 1; i >= 0; i--) {
      if (!segments[i].endTime) return segments[i];
    }
    return null;
  }

  function computeTotalDistanceKm(segments) {
    if (!Array.isArray(segments) || !segments.length) return null;
    var sum = 0;
    var anyKnown = false;
    segments.forEach(function (seg) {
      var dist = seg.distanceKm != null ? Number(seg.distanceKm) : computeSegmentDistance(seg);
      if (dist != null && Number.isFinite(dist)) {
        sum += dist;
        anyKnown = true;
      }
    });
    return anyKnown ? sum : null;
  }

  function countUniqueVehicles(segments) {
    var seen = {};
    var count = 0;
    (segments || []).forEach(function (seg) {
      var key = seg.vehicleId
        || seg.vehiclePlateNumberNormalized
        || (seg.vehiclePlateNumber ? normalizePlate(seg.vehiclePlateNumber) : null)
        || '';
      if (!key) return;
      if (!seen[key]) {
        seen[key] = true;
        count++;
      }
    });
    return count;
  }

  function getSegmentPlate(seg) {
    if (!seg) return '';
    return seg.vehiclePlateNumber
      || (seg.vehicleSnapshot && seg.vehicleSnapshot.plateNumber)
      || '';
  }

  function hasIncompleteKm(segments) {
    if (!Array.isArray(segments) || !segments.length) return false;
    return segments.some(function (seg) {
      var hasKmData = seg.startKm != null || seg.endKm != null;
      if (!hasKmData) return false;
      return seg.distanceKm == null && computeSegmentDistance(seg) == null;
    });
  }

  function initOnShiftStart(shift) {
    if (!shift) return shift;
    var out = Object.assign({}, shift);
    var startKm = out.kmStart > 0 ? Number(out.kmStart) : null;
    var startIso = toSegmentIso(out.date, out.startTime);
    out.vehicleSegments = [
      createSegment({
        vehicleId: out.vehicleId || null,
        vehiclePlateNumber: out.vehiclePlateNumber || null,
        vehiclePlateNumberNormalized: out.vehiclePlateNumberNormalized || null,
        vehicleSnapshot: out.vehicleSnapshot || null,
        startKm: startKm,
        endKm: null,
        distanceKm: null,
        startTime: startIso,
        endTime: null,
        source: 'shift_start',
        note: null,
      }),
    ];
    return out;
  }

  function ensureSegmentsOnShift(shift) {
    if (!shift) return [];
    if (Array.isArray(shift.vehicleSegments) && shift.vehicleSegments.length) {
      return shift.vehicleSegments.slice();
    }
    var startKm = shift.kmStart > 0 ? Number(shift.kmStart) : null;
    if (!shift.vehicleId && !shift.vehiclePlateNumber && startKm == null) return [];
    return [
      createSegment({
        vehicleId: shift.vehicleId || null,
        vehiclePlateNumber: shift.vehiclePlateNumber || null,
        vehiclePlateNumberNormalized: shift.vehiclePlateNumberNormalized || null,
        vehicleSnapshot: shift.vehicleSnapshot || null,
        startKm: startKm,
        endKm: null,
        distanceKm: null,
        startTime: toSegmentIso(shift.date, shift.startTime),
        endTime: null,
        source: 'shift_start',
        note: null,
      }),
    ];
  }

  function closeOpenSegment(segments, endKm, endTimeIso) {
    var list = (segments || []).slice();
    var open = getOpenSegment(list);
    if (!open) return list;
    var idx = list.indexOf(open);
    var closed = Object.assign({}, open);
    if (endKm != null && endKm !== '' && Number.isFinite(Number(endKm))) {
      closed.endKm = Number(endKm);
    }
    closed.endTime = endTimeIso;
    closed.distanceKm = computeSegmentDistance(closed);
    list[idx] = closed;
    return list;
  }

  function applyVehicleChange(shift, payload) {
    if (!shift) return null;
    var changeTimeIso = payload.changeTimeIso || new Date().toISOString();
    var segments = ensureSegmentsOnShift(shift).slice();
    var open = getOpenSegment(segments);

    if (open) {
      var idx = segments.indexOf(open);
      var closed = Object.assign({}, open);
      if (payload.previousEndKm != null && payload.previousEndKm !== '' && Number.isFinite(Number(payload.previousEndKm))) {
        closed.endKm = Number(payload.previousEndKm);
      }
      closed.endTime = changeTimeIso;
      closed.distanceKm = computeSegmentDistance(closed);
      segments[idx] = closed;
    }

    var newSeg = createSegment({
      vehicleId: payload.vehicleId || null,
      vehiclePlateNumber: payload.vehiclePlateNumber || null,
      vehiclePlateNumberNormalized: payload.vehiclePlateNumberNormalized || null,
      vehicleSnapshot: payload.vehicleSnapshot || null,
      startKm: payload.newStartKm != null && payload.newStartKm !== '' ? Number(payload.newStartKm) : null,
      endKm: null,
      distanceKm: null,
      startTime: changeTimeIso,
      endTime: null,
      source: 'vehicle_change',
      note: null,
    });
    segments.push(newSeg);

    var out = Object.assign({}, shift, {
      vehicleSegments: segments,
      vehicleId: newSeg.vehicleId,
      vehiclePlateNumber: newSeg.vehiclePlateNumber,
      vehiclePlateNumberNormalized: newSeg.vehiclePlateNumberNormalized,
      vehicleSnapshot: newSeg.vehicleSnapshot,
    });
    return out;
  }

  function finalizeOnShiftClose(shift, lastVehicleEndKm, endTimeIso) {
    var segments = ensureSegmentsOnShift(shift).slice();
    segments = closeOpenSegment(segments, lastVehicleEndKm, endTimeIso);
    var totalDistanceKm = computeTotalDistanceKm(segments);
    var vehicleCount = countUniqueVehicles(segments);
    var lastEndKm = null;
    var open = getOpenSegment(segments);
    if (!open) {
      for (var i = segments.length - 1; i >= 0; i--) {
        if (segments[i].endKm != null) {
          lastEndKm = segments[i].endKm;
          break;
        }
      }
    }
    return {
      segments: segments,
      totalDistanceKm: totalDistanceKm,
      vehicleCount: vehicleCount,
      hasIncompleteKm: hasIncompleteKm(segments),
      lastEndKm: lastEndKm,
    };
  }

  function getDisplaySegments(record) {
    if (!record) return [];
    if (Array.isArray(record.vehicleSegments) && record.vehicleSegments.length) {
      return record.vehicleSegments;
    }
    return buildLegacyVirtualSegments(record);
  }

  function buildLegacyVirtualSegments(record) {
    if (!record) return [];
    var plate = record.vehiclePlateNumber
      || (record.vehicleSnapshot && record.vehicleSnapshot.plateNumber)
      || null;
    var startKm = record.kmStart > 0 ? Number(record.kmStart) : null;
    var endKm = record.kmEnd > 0 ? Number(record.kmEnd) : null;
    var kmDriven = record.kmDriven != null ? Number(record.kmDriven) : null;
    if (!plate && startKm == null && endKm == null && kmDriven == null) return [];
    var dist = kmDriven;
    if (dist == null && startKm != null && endKm != null) dist = Math.max(0, endKm - startKm);
    return [
      createSegment({
        vehicleId: record.vehicleId || null,
        vehiclePlateNumber: plate,
        vehiclePlateNumberNormalized: record.vehiclePlateNumberNormalized || null,
        vehicleSnapshot: record.vehicleSnapshot || null,
        startKm: startKm,
        endKm: endKm,
        distanceKm: dist,
        startTime: record.startTime ? toSegmentIso(record.date, record.startTime) : null,
        endTime: record.endTime ? toSegmentIso(record.endDate || record.date, record.endTime) : null,
        source: 'manual',
        note: null,
      }),
    ];
  }

  function getRecordDistanceKm(record) {
    if (!record) return 0;
    if (record.totalDistanceKm != null && Number.isFinite(Number(record.totalDistanceKm))) {
      return Number(record.totalDistanceKm);
    }
    var segs = getDisplaySegments(record);
    var total = computeTotalDistanceKm(segs);
    if (total != null) return total;
    return Number(record.kmDriven) || 0;
  }

  function formatSegmentLine(seg) {
    var plate = getSegmentPlate(seg) || t('vehicleChangeNoVehicle', 'Nincs jármű megadva');
    var start = formatSegmentClock(seg.startTime);
    var end = formatSegmentClock(seg.endTime);
    var timePart = start && end ? (start + '–' + end) : (start || end || '');
    var dist = seg.distanceKm != null ? seg.distanceKm : computeSegmentDistance(seg);
    var distPart = dist != null ? (dist + ' km') : '';
    if (!timePart) {
      if (distPart) return plate + ' — ' + distPart;
      return plate;
    }
    var parts = [plate];
    if (timePart) parts.push(timePart);
    if (distPart) parts.push(distPart);
    return parts.join(' — ');
  }

  function formatListSegmentLine(seg) {
    var plate = getSegmentPlate(seg) || t('vehicleChangeNoVehicle', 'Nincs jármű megadva');
    var dist = seg.distanceKm != null ? seg.distanceKm : computeSegmentDistance(seg);
    if (dist != null && Number.isFinite(dist)) {
      return plate + ' — ' + dist + ' km';
    }
    return plate;
  }

  function formatListCardVehicleBlock(record) {
    var segments = getDisplaySegments(record);
    if (!segments.length) return '';
    var i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
      ? (translations[currentLang] || {})
      : {};
    var title = i18n.vehicleSegmentsListTitle || 'Járművek';
    var totalLabel = i18n.vehicleSegmentsTotalDistance || 'Összes távolság';
    var missingLabel = i18n.vehicleSegmentsMissingKm || 'Hiányos km adat';
    var total = record.totalDistanceKm != null ? Number(record.totalDistanceKm) : computeTotalDistanceKm(segments);
    var incomplete = record.hasIncompleteKm === true || hasIncompleteKm(segments);
    var uniqueVehicleCount = countUniqueVehicles(segments);

    if (uniqueVehicleCount <= 1) {
      var plate = getSegmentPlate(segments[0]) || '';
      if (!plate && total == null) return '';
      var singlePlate = plate
        ? '<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400"><span>' + escapeHtml(i18n.recordVehicleLabel || 'Jármű') + ':</span><span>' + escapeHtml(plate) + '</span></div>'
        : '';
      var distLine = total != null
        ? '<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400"><span>' + escapeHtml(i18n.entryDistance || 'Távolság') + ':</span><span class="text-orange-600 dark:text-orange-400">' + total + ' km</span></div>'
        : '';
      var miss = incomplete
        ? '<div class="text-[11px] text-amber-600 dark:text-amber-400">' + escapeHtml(missingLabel) + '</div>'
        : '';
      return singlePlate + distLine + miss;
    }

    var lines = segments.map(function (seg) {
      return '<div class="text-xs text-gray-500 dark:text-gray-400 pl-1">' + escapeHtml(formatListSegmentLine(seg)) + '</div>';
    }).join('');
    var totalLine = total != null
      ? '<div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-600 pt-1 mt-1"><span>' + escapeHtml(totalLabel) + ':</span><span class="text-orange-600 dark:text-orange-400 font-medium">' + total + ' km</span></div>'
      : '';
    var missMulti = incomplete
      ? '<div class="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">' + escapeHtml(missingLabel) + '</div>'
      : '';
    return '<div class="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1"><p class="font-semibold text-xs text-gray-600 dark:text-gray-300 mb-0.5">' + escapeHtml(title) + ':</p>' + lines + totalLine + missMulti + '</div>';
  }

  function formatReportVehicleBlock(record) {
    var segments = getDisplaySegments(record);
    if (!segments.length) return { lines: [], totalKm: null, headerPlate: null, perRow: false };
    var total = record.totalDistanceKm != null ? Number(record.totalDistanceKm) : computeTotalDistanceKm(segments);
    var plates = [];
    segments.forEach(function (seg) {
      var p = getSegmentPlate(seg);
      if (p && plates.indexOf(p) === -1) plates.push(p);
    });
    return {
      lines: [],
      totalKm: total,
      headerPlate: plates.length === 1 ? plates[0] : null,
      perRow: plates.length > 1 || segments.length > 1,
    };
  }

  function formatReportVehicleCell(record, lineBreak) {
    var br = lineBreak || '\n';
    var segments = getDisplaySegments(record);
    if (!segments.length) {
      if (typeof window.EntryVehicleField !== 'undefined' && window.EntryVehicleField.getRecordVehiclePlate) {
        return window.EntryVehicleField.getRecordVehiclePlate(record) || '';
      }
      return '';
    }
    if (segments.length === 1) {
      return getSegmentPlate(segments[0]) || '';
    }
    return segments.map(function (seg) {
      return getSegmentPlate(seg) || '—';
    }).join(br);
  }

  function formatReportDistanceCell(record, lineBreak, i18nOverride) {
    var br = lineBreak || '\n';
    var empty = { content: '', boldLastLine: false, totalKm: null };
    if (!record) return empty;
    var i18n = i18nOverride || ((typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
      ? (translations[currentLang] || {})
      : {});
    var totalShort = i18n.reportDistanceTotalShort || 'Össz.:';
    var segments = getDisplaySegments(record);

    if (!segments.length) {
      var legacyKm = record.totalDistanceKm != null && Number.isFinite(Number(record.totalDistanceKm))
        ? Number(record.totalDistanceKm)
        : (record.kmDriven != null && Number.isFinite(Number(record.kmDriven)) ? Number(record.kmDriven) : null);
      if (legacyKm == null || legacyKm <= 0) return empty;
      return { content: legacyKm + ' km', boldLastLine: false, totalKm: legacyKm };
    }

    if (segments.length === 1) {
      var singleDist = segments[0].distanceKm != null
        ? segments[0].distanceKm
        : computeSegmentDistance(segments[0]);
      if (singleDist == null) return empty;
      return { content: singleDist + ' km', boldLastLine: false, totalKm: singleDist };
    }

    var lines = [];
    segments.forEach(function (seg) {
      var dist = seg.distanceKm != null ? seg.distanceKm : computeSegmentDistance(seg);
      lines.push(dist != null ? (dist + ' km') : '');
    });
    var total = record.totalDistanceKm != null ? Number(record.totalDistanceKm) : computeTotalDistanceKm(segments);
    if (total != null) {
      lines.push(totalShort + ' ' + total + ' km');
    }
    return {
      content: lines.filter(function (l) { return l !== ''; }).join(br),
      boldLastLine: total != null,
      totalKm: total,
    };
  }

  function applyFullDaySegmentsToRecord(record, segments) {
    if (!record || !Array.isArray(segments) || !segments.length) return record;
    var out = Object.assign({}, record);
    out.vehicleSegments = segments;
    out.totalDistanceKm = computeTotalDistanceKm(segments);
    out.vehicleCount = segments.length;
    out.hasIncompleteKm = hasIncompleteKm(segments);
    if (out.totalDistanceKm != null) {
      out.kmDriven = out.totalDistanceKm;
    }
    var first = segments[0];
    var last = segments[segments.length - 1];
    if (first) {
      out.vehicleId = first.vehicleId || null;
      out.vehiclePlateNumber = first.vehiclePlateNumber || null;
      out.vehiclePlateNumberNormalized = first.vehiclePlateNumberNormalized || null;
      out.vehicleSnapshot = first.vehicleSnapshot || null;
      out.kmStart = first.startKm != null ? first.startKm : 0;
    }
    if (last && last.endKm != null) {
      out.kmEnd = last.endKm;
    } else if (first && first.endKm != null) {
      out.kmEnd = first.endKm;
    } else {
      out.kmEnd = 0;
    }
    return out;
  }

  function enrichCompletedRecord(completedRecord, shift, lastVehicleEndKm, endTimeIso) {
    if (!completedRecord || !shift) return completedRecord;
    var segments = ensureSegmentsOnShift(shift);
    if (!segments.length) return completedRecord;
    var finalized = finalizeOnShiftClose(shift, lastVehicleEndKm, endTimeIso);
    completedRecord.vehicleSegments = finalized.segments;
    completedRecord.totalDistanceKm = finalized.totalDistanceKm;
    completedRecord.vehicleCount = finalized.vehicleCount;
    completedRecord.hasIncompleteKm = finalized.hasIncompleteKm;
    if (finalized.totalDistanceKm != null) {
      completedRecord.kmDriven = finalized.totalDistanceKm;
    }
    if (finalized.lastEndKm != null) {
      completedRecord.kmEnd = finalized.lastEndKm;
    }
    var first = finalized.segments[0];
    if (first) {
      completedRecord.vehicleId = first.vehicleId || null;
      completedRecord.vehiclePlateNumber = first.vehiclePlateNumber || null;
      completedRecord.vehiclePlateNumberNormalized = first.vehiclePlateNumberNormalized || null;
      completedRecord.vehicleSnapshot = first.vehicleSnapshot || null;
    }
    return completedRecord;
  }

  function needsVehicleEndKmOnFinalize(shift) {
    var segments = ensureSegmentsOnShift(shift);
    var open = getOpenSegment(segments);
    if (!open) return false;
    return open.startKm != null && Number(open.startKm) > 0;
  }

  function formatLiveSegmentsSummary(shift) {
    var segments = ensureSegmentsOnShift(shift);
    if (!segments.length) return '';
    var closed = segments.filter(function (s) { return !!s.endTime; });
    if (!closed.length) return '';
    return closed.map(function (seg) {
      return '<p class="text-xs text-gray-500 dark:text-gray-400">' + escapeHtml(formatSegmentLine(seg)) + '</p>';
    }).join('');
  }

  function isValidDisplayPlate(plate) {
    if (plate == null || plate === '') return false;
    var p = String(plate).trim();
    if (!p || p === '—' || p === '-' || p === '–') return false;
    return true;
  }

  function normalizedPlateKey(displayPlate, normalizedField) {
    if (normalizedField != null && String(normalizedField).trim() !== '') {
      var fromField = String(normalizedField).trim().toUpperCase().replace(/[\s-]+/g, '');
      return fromField || null;
    }
    if (!isValidDisplayPlate(displayPlate)) return null;
    if (window.VehiclesService && typeof window.VehiclesService.normalizePlateKey === 'function') {
      return window.VehiclesService.normalizePlateKey(displayPlate);
    }
    return String(displayPlate).trim().toUpperCase().replace(/[\s-]+/g, '');
  }

  function addUniqueReportVehicle(seen, vehicles, displayPlate, normalizedField) {
    if (!isValidDisplayPlate(displayPlate)) return;
    var norm = normalizedPlateKey(displayPlate, normalizedField);
    if (!norm) return;
    if (seen[norm]) return;
    seen[norm] = true;
    vehicles.push({
      normalizedPlate: norm,
      displayPlate: String(displayPlate).trim(),
    });
  }

  function collectPlatesFromReportRecord(record, seen, vehicles) {
    if (!record) return;
    if (record.entryType === 'noteDay') return;

    var segments = getDisplaySegments(record);
    if (segments.length) {
      segments.forEach(function (seg) {
        addUniqueReportVehicle(
          seen,
          vehicles,
          getSegmentPlate(seg),
          seg.vehiclePlateNumberNormalized
            || (seg.vehicleSnapshot && seg.vehicleSnapshot.plateNumberNormalized)
            || null
        );
      });
      return;
    }

    addUniqueReportVehicle(
      seen,
      vehicles,
      record.vehiclePlateNumber || (record.vehicleSnapshot && record.vehicleSnapshot.plateNumber),
      record.vehiclePlateNumberNormalized
        || (record.vehicleSnapshot && record.vehicleSnapshot.plateNumberNormalized)
        || null
    );
  }

  function getUniqueReportVehicles(recordsOrRows) {
    var seen = {};
    var vehicles = [];
    (recordsOrRows || []).forEach(function (item) {
      if (!item || item.isEmpty) return;
      var record = item.sourceRecord != null ? item.sourceRecord : item;
      collectPlatesFromReportRecord(record, seen, vehicles);
    });
    vehicles.sort(function (a, b) {
      return String(a.displayPlate).localeCompare(String(b.displayPlate), undefined, { sensitivity: 'base' });
    });
    return { count: vehicles.length, vehicles: vehicles };
  }

  function recordHasMultipleVehicleSegments(record) {
    return getDisplaySegments(record).length > 1;
  }

  window.VehicleSegments = {
    MANUAL_VEHICLE_VALUE: MANUAL_VEHICLE_VALUE,
    initOnShiftStart: initOnShiftStart,
    ensureSegmentsOnShift: ensureSegmentsOnShift,
    getOpenSegment: getOpenSegment,
    getDisplaySegments: getDisplaySegments,
    computeTotalDistanceKm: computeTotalDistanceKm,
    computeSegmentDistance: computeSegmentDistance,
    countUniqueVehicles: countUniqueVehicles,
    hasIncompleteKm: hasIncompleteKm,
    getRecordDistanceKm: getRecordDistanceKm,
    getSegmentPlate: getSegmentPlate,
    formatSegmentClock: formatSegmentClock,
    formatSegmentLine: formatSegmentLine,
    formatListCardVehicleBlock: formatListCardVehicleBlock,
    formatReportVehicleBlock: formatReportVehicleBlock,
    formatReportVehicleCell: formatReportVehicleCell,
    formatReportDistanceCell: formatReportDistanceCell,
    getUniqueReportVehicles: getUniqueReportVehicles,
    recordHasMultipleVehicleSegments: recordHasMultipleVehicleSegments,
    applyVehicleChange: applyVehicleChange,
    finalizeOnShiftClose: finalizeOnShiftClose,
    applyFullDaySegmentsToRecord: applyFullDaySegmentsToRecord,
    enrichCompletedRecord: enrichCompletedRecord,
    needsVehicleEndKmOnFinalize: needsVehicleEndKmOnFinalize,
    formatLiveSegmentsSummary: formatLiveSegmentsSummary,
    normalizePlate: normalizePlate,
    buildSnapshotFromFields: buildSnapshotFromFields,
    toSegmentIso: toSegmentIso,
  };
})();
