(function(){
  // 16h: csak életszerűségi figyelmeztetés (nyers műszakhossz = indulás→érkezés); nem jogszabályi határ.
  const MAX_SHIFT_MINUTES = (typeof window !== 'undefined' && window.REALISM_SHIFT_WARNING_MINUTES != null)
    ? window.REALISM_SHIFT_WARNING_MINUTES
    : 16 * 60;
  const MINUTES_TOLERANCE = 10;
  const EXTREME_DISTANCE_THRESHOLD = 1500; // km
  const LONG_DRIVE_THRESHOLD = 10 * 60; // minutes
  const MIN_DISTANCE_FOR_LONG_DRIVE = 200; // km

  const defaultMessagesHu = {
    realismReasonDriveGtWork: "A vezetési idő hosszabb, mint a teljes munkaidő.",
    realismReasonDriveVsKm: "Nagyon hosszú vezetési időhöz kevés kilométer tartozik.",
    realismReasonArrivalBeforeDeparture: "Az érkezési idő korábban van, mint az indulási idő.",
    realismReasonExtremeDistance: "Nagyon nagy távolság lett megadva egy nap alatt.",
    realismReasonLongShift: "A nap teljes hossza meghaladja a 16 órát."
  };

  const defaultMessagesDe = {
    realismReasonDriveGtWork: "Die Fahrzeit ist länger als die gesamte Arbeitszeit.",
    realismReasonDriveVsKm: "Sehr lange Fahrzeit mit ungewöhnlich wenigen Kilometern.",
    realismReasonArrivalBeforeDeparture: "Ankunftszeit liegt vor der Abfahrtszeit.",
    realismReasonExtremeDistance: "Sehr großer Kilometer-Sprung an einem Tag.",
    realismReasonLongShift: "Die Tageslänge überschreitet 16 Stunden."
  };

  function getDefaultsByLang() {
    if (typeof currentLang === 'string' && currentLang === 'de') {
      return defaultMessagesDe;
    }
    return defaultMessagesHu;
  }

  function safeFormatDuration(minutes) {
    if (typeof formatDuration === 'function') {
      return formatDuration(Math.max(0, Math.round(minutes)));
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.abs(Math.round(minutes % 60));
    if (typeof getDurationUnitTokens === 'function') {
      const u = getDurationUnitTokens();
      return `${hours}${u.hours} ${mins}${u.minutes}`;
    }
    return `${hours}h ${mins}min`;
  }

  function evaluateRecordRealism(record) {
    if (!record || record.entryType === 'noteDay') {
      return [];
    }
    const issues = [];
    const drive = Number(record.driveMinutes) || 0;
    const work = Number(record.workMinutes) || 0;
    let km = Number(record.kmDriven) || 0;
    if (typeof window.VehicleSegments !== 'undefined' && window.VehicleSegments.getRecordDistanceKm) {
      const segments = window.VehicleSegments.getDisplaySegments(record);
      if (segments.length) {
        km = window.VehicleSegments.getRecordDistanceKm(record);
      }
    }
    const compensation = Number(record.compensationMinutes) || 0;
    const startTime = record.startTime || '';
    const endTime = record.endTime || '';
    const hasOvernight = record.endDate && record.endDate !== record.date;

    // 1) Vezetési idő > munkaidő
    if (drive > work + MINUTES_TOLERANCE) {
      issues.push({ key: 'realismReasonDriveGtWork', extra: { drive, work } });
    }

    // 2) Nagyon hosszú vezetési idő kevés km-rel
    if (drive >= LONG_DRIVE_THRESHOLD && km > 0 && km < MIN_DISTANCE_FOR_LONG_DRIVE) {
      issues.push({ key: 'realismReasonDriveVsKm', extra: { drive, km } });
    }

    // 3) Érkezés korábbi mint indulás ugyanazon a napon
    if (!hasOvernight && startTime && endTime && parseTime(startTime) > parseTime(endTime)) {
      issues.push({ key: 'realismReasonArrivalBeforeDeparture' });
    }

    // 4) Túl nagy km ugrás
    if (km >= EXTREME_DISTANCE_THRESHOLD) {
      issues.push({ key: 'realismReasonExtremeDistance', extra: { km } });
    }

    // 5) Hosszú műszak életszerűségi figyelmeztetés (nyers indulás→érkezés).
    // Team (multi-manning): 21h szolgálati ablak legális → magasabb küszöb.
    const shiftLengthMinutes = estimateShiftMinutes(record);
    const isTeam = (typeof window.isTeamDrivingMode === 'function')
      ? window.isTeamDrivingMode(record)
      : (record.drivingMode === 'team');
    const longShiftLimit = isTeam
      ? (((typeof window.MAX_TEAM_SHIFT_HOURS === 'number') ? window.MAX_TEAM_SHIFT_HOURS : 21) * 60 + 60)
      : MAX_SHIFT_MINUTES;
    if (shiftLengthMinutes > longShiftLimit) {
      issues.push({ key: 'realismReasonLongShift', extra: { minutes: shiftLengthMinutes } });
    }

    return issues;
  }

  function parseTime(value) {
    if (typeof parseTimeToMinutes === 'function') {
      return parseTimeToMinutes(value);
    }
    if (!value || value.indexOf(':') === -1) return 0;
    const [h, m] = value.split(':');
    return (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
  }

  // Nyers műszakhossz (indulás→érkezés, date-dal). A 16h figyelmeztetés erre vonatkozik.
  // workMinutes = tárolt érték (nyers - compensation); itt NEM azt használjuk.
  function estimateShiftMinutes(record) {
    if (typeof calculateWorkMinutes === 'function') {
      return calculateWorkMinutes(record.startTime, record.endTime, record.endDate || record.date);
    }
    return Number(record.workMinutes) || 0;
  }

  function getRealismIssueMessages(issues, i18n) {
    if (!Array.isArray(issues) || issues.length === 0) {
      return [];
    }
    const defaults = getDefaultsByLang();
    const map = {
      realismReasonDriveGtWork: i18n?.realismReasonDriveGtWork || defaults.realismReasonDriveGtWork,
      realismReasonDriveVsKm: i18n?.realismReasonDriveVsKm || defaults.realismReasonDriveVsKm,
      realismReasonArrivalBeforeDeparture: i18n?.realismReasonArrivalBeforeDeparture || defaults.realismReasonArrivalBeforeDeparture,
      realismReasonExtremeDistance: i18n?.realismReasonExtremeDistance || defaults.realismReasonExtremeDistance,
      realismReasonLongShift: i18n?.realismReasonLongShift || defaults.realismReasonLongShift
    };

    return issues.map(issue => {
      const template = map[issue.key] || '';
      if (!template) return '';
      const extra = issue.extra || {};
      return template
        .replace('{drive}', safeFormatDuration(extra.drive || 0))
        .replace('{work}', safeFormatDuration(extra.work || 0))
        .replace('{km}', `${Math.round(extra.km || 0)} km`)
        .replace('{minutes}', safeFormatDuration(extra.minutes || 0));
    }).filter(Boolean);
  }

  function renderRealismIssueList(issues, i18n) {
    const messages = getRealismIssueMessages(issues, i18n);
    if (!messages.length) return '';
    return `<ul class="mt-3 text-sm text-gray-700 dark:text-gray-200 list-disc pl-5 space-y-1">${messages.map(msg => `<li>${msg}</li>`).join('')}</ul>`;
  }

  if (typeof window !== 'undefined') {
    window.evaluateRecordRealism = evaluateRecordRealism;
    window.getRealismIssueMessages = getRealismIssueMessages;
    window.renderRealismIssueList = renderRealismIssueList;
  }
})();
