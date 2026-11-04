// =======================================================
// ===== TACHOGRÁF ELEMZŐ (FEATURE) ======================
// =======================================================

(function () {
  'use strict';

  

  // A TE ADATAIDBÓL KÉSZÍTETT DEMÓ ADATSOR (megmarad a későbbi használathoz)
  const demoRecords = [
    {"compensationMinutes":0,"kmDriven":597,"workMinutes":685,"kmStart":595985,"nightWorkMinutes":175,"endLocation":"Braunau","isSplitRest":false,"kmEnd":596582,"date":"2025-09-01","endTime":"13:30","weeklyDriveEndStr":"07:49","compensationTime":"","crossings":[{"time":"06:00","to":"D","from":"A"},{"time":"13:15","to":"A","from":"D"}],"weeklyDriveStartStr":"00:00","startLocation":"Gratwein-Straßengel","startTime":"02:05","driveMinutes":469,"id":"1756726240113"},
    {"crossings":[{"to":"D","time":"08:15","from":"A"}],"startTime":"05:15","id":"1756828895235","kmStart":596582,"compensationMinutes":0,"kmEnd":597339,"driveMinutes":569,"endTime":"18:00","startLocation":"Braunau","weeklyDriveEndStr":"17:18","kmDriven":757,"weeklyDriveStartStr":"07:49","date":"2025-09-02","nightWorkMinutes":0,"isSplitRest":false,"workMinutes":765,"endLocation":"Lehrte"},
    {"compensationMinutes":0,"kmDriven":444,"workMinutes":865,"kmStart":597339,"nightWorkMinutes":17,"endLocation":"Stolpe","isSplitRest":true,"kmEnd":597783,"date":"2025-09-03","endTime":"20:17","weeklyDriveEndStr":"24:13","compensationTime":"","crossings":[],"weeklyDriveStartStr":"17:18","startLocation":"Lehrte","startTime":"05:52","driveMinutes":415,"id":"1756923629815"},
    {"crossings":[{"to":"A","time":"17:45","from":"D"}],"nightWorkMinutes":0,"id":"1757002767279","weeklyDriveEndStr":"34:05","endTime":"18:16","kmStart":597783,"weeklyDriveStartStr":"24:13","startTime":"06:00","workMinutes":736,"endLocation":"Haag am Hausruck","isSplitRest":false,"kmEnd":598591,"driveMinutes":592,"compensationTime":"","startLocation":"Stolpe","compensationMinutes":0,"kmDriven":808,"date":"2025-09-04"},
    {"startLocation":"Haag am Hausruck","nightWorkMinutes":99,"isSplitRest":false,"compensationMinutes":0,"endTime":"14:36","date":"2025-09-05","endLocation":"Gratwein-Straßengel","workMinutes":675,"driveMinutes":396,"weeklyDriveEndStr":"40:41","kmDriven":445,"startTime":"03:21","kmStart":598591,"weeklyDriveStartStr":"34:05","crossings":[],"compensationTime":"","kmEnd":599036,"id":"1757075836318"}
  ];

  // VIP overlay eltávolítva - a korlátozás másképp lesz kezelve

  // 13+ munka = tárolt workMinutes (kompenzációval korrigált) alapján; nem nyers műszakhossz.
  const LONG_WORKDAY = typeof window !== 'undefined' && window.LONG_WORKDAY_THRESHOLD_MINUTES != null ? window.LONG_WORKDAY_THRESHOLD_MINUTES : 13 * 60;
  const REG_DAILY_REST = typeof window !== 'undefined' && window.REGULAR_DAILY_REST_MINUTES != null ? window.REGULAR_DAILY_REST_MINUTES : 11 * 60;
  const RED_DAILY_REST = typeof window !== 'undefined' && window.REDUCED_DAILY_REST_MINUTES != null ? window.REDUCED_DAILY_REST_MINUTES : 9 * 60;
  const RED_WEEKLY_REST = typeof window !== 'undefined' && window.REDUCED_WEEKLY_REST_MINUTES != null ? window.REDUCED_WEEKLY_REST_MINUTES : 24 * 60;
  const REG_WEEKLY_REST = typeof window !== 'undefined' && window.REGULAR_WEEKLY_REST_MINUTES != null ? window.REGULAR_WEEKLY_REST_MINUTES : 45 * 60;

  function resolveModeForRestGap(previousRecord, explicitMode) {
    if (typeof window.normalizeDrivingMode === 'function') {
      const explicit = window.normalizeDrivingMode(explicitMode);
      if (explicit) return explicit;
    } else if (explicitMode === 'team' || explicitMode === 'single') {
      return explicitMode;
    }
    if (typeof window.resolveDrivingMode === 'function') {
      return window.resolveDrivingMode(previousRecord);
    }
    return (previousRecord && previousRecord.drivingMode === 'team') ? 'team' : 'single';
  }

  /**
   * EU 561/2006: napi pihenő a műszak kezdetétől számított ciklusban
   * (single: 24h, team/multi-manning: 30h).
   * A pihenőnek csak az a része számít, ami a cikluson belül van.
   */
  function restMinutesInDailyCycle(previousRecord, prevEnd, currentStart, drivingMode) {
    if (!previousRecord || !prevEnd || !currentStart) return 0;
    const cycleStart = new Date(`${previousRecord.date}T${previousRecord.startTime || '00:00'}`);
    if (isNaN(cycleStart)) return 0;
    const cycleHours = (typeof window.getDailyRestCycleHours === 'function')
      ? window.getDailyRestCycleHours(drivingMode)
      : (drivingMode === 'team' ? 30 : 24);
    const cycleEnd = new Date(cycleStart.getTime() + cycleHours * 60 * 60 * 1000);
    const clipStart = prevEnd.getTime() > cycleStart.getTime() ? prevEnd : cycleStart;
    const clipEnd = currentStart.getTime() < cycleEnd.getTime() ? currentStart : cycleEnd;
    if (clipEnd.getTime() <= clipStart.getTime()) return 0;
    return Math.round((clipEnd.getTime() - clipStart.getTime()) / 60000);
  }

  /** Visszafelé kompatibilis alias (mindig 24h). Új kód: restMinutesInDailyCycle. */
  function restMinutesIn24hCycle(previousRecord, prevEnd, currentStart) {
    return restMinutesInDailyCycle(previousRecord, prevEnd, currentStart, 'single');
  }

  /**
   * Napi pihenő besoroláshoz használt effektív pihenő perc:
   * 24h+ gap esetén a teljes gap, egyébként a drivingMode szerinti cikluson belüli rész.
   */
  function effectiveRestMinutesForDaily(previousRecord, prevEnd, currentStart, drivingMode) {
    const fullMinutes = Math.round((currentStart - prevEnd) / 60000);
    if (fullMinutes >= RED_WEEKLY_REST) return fullMinutes; // 24h+: heti/csökkentett heti, teljes gap
    const mode = resolveModeForRestGap(previousRecord, drivingMode);
    return restMinutesInDailyCycle(previousRecord, prevEnd, currentStart, mode);
  }

  function isReducedDailyRest(restHours, precedingRecord) {
    if (!precedingRecord) return false;
    const isSplit = precedingRecord.isSplitRest;
    if (isSplit) return false;
    const restMins = restHours * 60;
    const isDurationReduced = restMins >= RED_DAILY_REST && restMins < REG_DAILY_REST;
    const isWorkdayForced = (precedingRecord.workMinutes || 0) > LONG_WORKDAY; // workMinutes = tárolt munkaidő
    return isDurationReduced || isWorkdayForced;
  }

  function buildRestResultBase(restDurationMinutes, reducedDailySequenceBefore) {
    return {
      restMinutes: restDurationMinutes,
      restType: 'IRREGULAR',
      label: '',
      colorClass: 'bg-red-500 text-white',
      inlineStyle: '',
      isIrregularRest: true,
      isReducedDaily: false,
      isRegularDaily: false,
      isSplitRest: false,
      isWeeklyRest: false,
      isReducedWeeklyRest: false,
      isInvalidRest: true,
      countsAsReducedDueToLongWorkday: false,
      reducedDailySequenceNumber: reducedDailySequenceBefore,
      matchedRule: 'IRREGULAR',
      drivingMode: 'single'
    };
  }

  function classifyWeeklyOrSplitRest(restDurationMinutes, previousRecord, reducedDailySequenceBefore, exemptRestStarts, prevEnd, i18n, drivingMode) {
    const i = i18n || {};
    const defaultRes = buildRestResultBase(restDurationMinutes, reducedDailySequenceBefore);
    defaultRes.drivingMode = drivingMode || 'single';
    const restMins = restDurationMinutes;

    if (restMins >= REG_WEEKLY_REST) {
      return {
        ...defaultRes,
        restType: 'WEEKLY',
        label: `${i.tachoWeeklyRest || 'Heti pihenő'} (${typeof formatDuration === 'function' ? formatDuration(restDurationMinutes) : ''})`,
        colorClass: 'bg-green-700 text-white',
        isIrregularRest: false,
        isWeeklyRest: true,
        isInvalidRest: false,
        reducedDailySequenceNumber: 0,
        matchedRule: 'WEEKLY_45'
      };
    }

    if (restMins >= RED_WEEKLY_REST) {
      const isExempt24h = (Array.isArray(exemptRestStarts) && prevEnd && exemptRestStarts.indexOf(prevEnd.getTime()) !== -1);
      const labelText = isExempt24h ? (i.tacho24hRest || '24 órás pihenő') : (i.tachoReducedWeeklyRest || 'Csökkentett heti pihenő');
      return {
        ...defaultRes,
        restType: 'REDUCED_WEEKLY',
        label: `${labelText} (${typeof formatDuration === 'function' ? formatDuration(restDurationMinutes) : ''})`,
        colorClass: 'bg-green-700 text-white',
        isIrregularRest: false,
        isReducedWeeklyRest: true,
        isInvalidRest: false,
        reducedDailySequenceNumber: 0,
        matchedRule: isExempt24h ? '24H_EXEMPT' : 'REDUCED_WEEKLY'
      };
    }

    if (previousRecord && previousRecord.isSplitRest) {
      return {
        ...defaultRes,
        restType: 'SPLIT',
        label: `${i.tachoSplitRest || 'Osztott pihenő'} (${typeof formatDuration === 'function' ? formatDuration(restDurationMinutes) : ''})`,
        colorClass: 'bg-green-200 text-green-800',
        isIrregularRest: false,
        isSplitRest: true,
        isInvalidRest: false,
        reducedDailySequenceNumber: reducedDailySequenceBefore,
        matchedRule: 'SPLIT'
      };
    }

    return null;
  }

  /**
   * Team (multi-manning) napi pihenő: 30h cikluson belül min. 9h = NORMÁL napi pihenő.
   * Nem csökkentett, nem terheli a heti 3-as keretet.
   */
  function classifyTeamDailyRest(restDurationMinutes, previousRecord, reducedDailySequenceBefore, exemptRestStarts, prevEnd, i18n) {
    const i = i18n || {};
    const shared = classifyWeeklyOrSplitRest(
      restDurationMinutes, previousRecord, reducedDailySequenceBefore, exemptRestStarts, prevEnd, i, 'team'
    );
    if (shared) return shared;

    const defaultRes = buildRestResultBase(restDurationMinutes, reducedDailySequenceBefore);
    defaultRes.drivingMode = 'team';

    if (restDurationMinutes >= RED_DAILY_REST) {
      return {
        ...defaultRes,
        restType: 'TEAM_DAILY',
        label: `${i.tachoTeamDailyRest || i.tachoRegularDailyRest || 'Négykezes napi pihenő'} (${typeof formatDuration === 'function' ? formatDuration(restDurationMinutes) : ''})`,
        colorClass: 'bg-green-500 text-white',
        isIrregularRest: false,
        isRegularDaily: true,
        isReducedDaily: false,
        isInvalidRest: false,
        reducedDailySequenceNumber: reducedDailySequenceBefore,
        matchedRule: 'TEAM_DAILY_9'
      };
    }

    return {
      ...defaultRes,
      label: `${i.tachoIrregularRest || 'Szabálytalan pihenő'} (${typeof formatDuration === 'function' ? formatDuration(restDurationMinutes) : ''})`,
      matchedRule: 'IRREGULAR_TEAM'
    };
  }

  /**
   * Solo napi pihenő szabályok (változatlan EU 561 single logika).
   */
  function classifySingleDailyRest(restDurationMinutes, previousRecord, reducedDailySequenceBefore, exemptRestStarts, prevEnd, i18n) {
    const i = i18n || {};
    const shared = classifyWeeklyOrSplitRest(
      restDurationMinutes, previousRecord, reducedDailySequenceBefore, exemptRestStarts, prevEnd, i, 'single'
    );
    if (shared) return shared;

    const defaultRes = buildRestResultBase(restDurationMinutes, reducedDailySequenceBefore);
    const prevWorkMinutes = previousRecord.workMinutes || 0;
    const restMins = restDurationMinutes;

    // Rendes napi pihenő (11h+, és előző munkaidő <= 13h)
    if (restMins >= REG_DAILY_REST && prevWorkMinutes <= LONG_WORKDAY) {
      return {
        ...defaultRes,
        restType: 'REGULAR_DAILY',
        label: `${i.tachoRegularDailyRest || 'Rendes napi pihenő'} (${typeof formatDuration === 'function' ? formatDuration(restDurationMinutes) : ''})`,
        colorClass: 'bg-green-500 text-white',
        isIrregularRest: false,
        isRegularDaily: true,
        isInvalidRest: false,
        reducedDailySequenceNumber: reducedDailySequenceBefore,
        matchedRule: 'REGULAR_DAILY'
      };
    }

    // Csökkentett napi pihenő (9–11h)
    if (restMins >= RED_DAILY_REST) {
      const seq = reducedDailySequenceBefore + 1;
      const isForcedReduced = prevWorkMinutes > LONG_WORKDAY;
      const reasonSuffix = isForcedReduced ? ` ${i.tachoReason13h || '(13ó+ munka miatt)'}` : '';
      let colorClass = 'bg-red-500 text-white';
      let inlineStyle = '';
      const isDark = typeof document !== 'undefined' && document.documentElement && document.documentElement.classList.contains('dark');
      if (seq === 1) {
        colorClass = 'bg-yellow-200 text-yellow-900';
        if (isDark) inlineStyle = 'background-color: #fef08a !important; color: #713f12 !important;';
      } else if (seq === 2) {
        colorClass = 'bg-yellow-400 text-black';
        if (isDark) inlineStyle = 'background-color: #facc15 !important; color: #000000 !important;';
      } else if (seq === 3) {
        colorClass = 'bg-orange-400 text-black';
        if (isDark) inlineStyle = 'background-color: #fb923c !important; color: #000000 !important;';
      } else if (isDark) {
        inlineStyle = 'background-color: #ef4444 !important; color: #fff !important;';
      }
      const label = `${seq}. ${i.tachoReducedDailyRest || 'csökkentett napi pihenő'}${reasonSuffix} (${typeof formatDuration === 'function' ? formatDuration(restDurationMinutes) : ''})`;
      return {
        ...defaultRes,
        restType: 'REDUCED_DAILY',
        label,
        colorClass,
        inlineStyle,
        isIrregularRest: seq > 3,
        isReducedDaily: true,
        isInvalidRest: false,
        countsAsReducedDueToLongWorkday: isForcedReduced,
        reducedDailySequenceNumber: seq,
        matchedRule: isForcedReduced ? 'REDUCED_13' : 'REDUCED_9_11'
      };
    }

    return {
      ...defaultRes,
      label: `${i.tachoIrregularRest || 'Szabálytalan pihenő'} (${typeof formatDuration === 'function' ? formatDuration(restDurationMinutes) : ''})`,
      matchedRule: 'IRREGULAR'
    };
  }

  /**
   * Központi pihenő-besorolás: heti szabályok közösek; napi pihenő single vs team ágon.
   * @param {string} [drivingMode] - explicit mód; ha nincs, previousRecord.drivingMode
   */
  function classifyRest(restDurationMinutes, previousRecord, reducedDailySequenceBefore, exemptRestStarts, prevEnd, i18n, drivingMode) {
    const i = i18n || {};
    const defaultRes = buildRestResultBase(restDurationMinutes, reducedDailySequenceBefore);

    if (!previousRecord) {
      return {
        ...defaultRes,
        restType: 'FIRST_ENTRY',
        label: i.tachoFirstEntry || 'Első rögzített nap',
        colorClass: 'bg-gray-200 text-gray-800',
        isIrregularRest: false,
        isInvalidRest: false,
        reducedDailySequenceNumber: 0,
        matchedRule: 'FIRST_ENTRY'
      };
    }

    const mode = resolveModeForRestGap(previousRecord, drivingMode);
    if (mode === 'team') {
      return classifyTeamDailyRest(
        restDurationMinutes, previousRecord, reducedDailySequenceBefore, exemptRestStarts, prevEnd, i
      );
    }
    return classifySingleDailyRest(
      restDurationMinutes, previousRecord, reducedDailySequenceBefore, exemptRestStarts, prevEnd, i
    );
  }

  window.classifyRest = classifyRest;
  window.classifyTeamDailyRest = classifyTeamDailyRest;
  window.classifySingleDailyRest = classifySingleDailyRest;
  window.effectiveRestMinutesForDaily = effectiveRestMinutesForDaily;
  window.restMinutesInDailyCycle = restMinutesInDailyCycle;

  function getMobilityExemptRestStarts(blocks) {
    if (typeof window.evaluateMobilityPackageChains !== 'function') return [];
    const evalResult = window.evaluateMobilityPackageChains(blocks);
    return evalResult.exemptRestStarts || [];
  }

  function classifyRestGap(restDurationMinutes, previousRecord, reducedDailySequenceBefore, prevEnd, i18n, blocks, drivingMode) {
    if (previousRecord && prevEnd && typeof window.applyMobilityToRestGap === 'function') {
      const mobility = window.applyMobilityToRestGap(prevEnd, restDurationMinutes, i18n);
      if (mobility) {
        mobility.drivingMode = resolveModeForRestGap(previousRecord, drivingMode);
        return mobility;
      }
    }
    const exemptRestStarts = getMobilityExemptRestStarts(blocks);
    return classifyRest(
      restDurationMinutes, previousRecord, reducedDailySequenceBefore, exemptRestStarts, prevEnd, i18n, drivingMode
    );
  }

  window.classifyRestGap = classifyRestGap;

  // =======================================================
  // ===== READ-ONLY EXPORT: Weekly Rest Blocks ============
  // =======================================================
  // Cél: a tachograph feature által használt (records közti pihenő-idő) detektálásból
  // publikálni heti pihenő blokkokat más modulok felé úgy, hogy a tachó motor logikáján
  // nem változtatunk. A blokkok csak olvasásra szolgálnak (UI / prompt gating).
  function getWeeklyRestBlocksFromTachograph(sourceRecords) {
    try {
      const src = (Array.isArray(sourceRecords) && sourceRecords.length > 0)
        ? sourceRecords
        : (Array.isArray(records) ? records : []);

      const sorted = [...src].sort(
        (a, b) => getRecordSortTime(a) - getRecordSortTime(b)
      );

      const blocks = [];
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (!prev || !curr) continue;

        const prevEndDateStr = prev.endDate || prev.date;
        const prevEnd = new Date(`${prevEndDateStr}T${prev.endTime}`);
        const currStart = new Date(`${curr.date}T${curr.startTime}`);
        if (isNaN(prevEnd) || isNaN(currStart)) continue;

        const durationHours = (currStart - prevEnd) / (1000 * 60 * 60);
        if (!isFinite(durationHours) || durationHours < 0) continue;

        // Heti pihenő határok: 24h (csökkentett), 45h (rendes)
        if (durationHours >= RED_WEEKLY_REST / 60) {
          let dataQuality = 'LOW';
          try {
            const prevPrev = sorted[i - 2];
            const next = sorted[i + 1];
            if (prevPrev && next) {
              const prevPrevEndDateStr = prevPrev.endDate || prevPrev.date;
              const prevPrevEnd = new Date(`${prevPrevEndDateStr}T${prevPrev.endTime}`);
              const prevStart = new Date(`${prev.date}T${prev.startTime}`);
              const currEndDateStr = curr.endDate || curr.date;
              const currEnd = new Date(`${currEndDateStr}T${curr.endTime}`);
              const nextStart = new Date(`${next.date}T${next.startTime}`);

              if (![prevPrevEnd, prevStart, currEnd, nextStart].some(d => isNaN(d))) {
                const gapBeforeHours = (prevStart - prevPrevEnd) / (1000 * 60 * 60);
                const gapAfterHours = (nextStart - currEnd) / (1000 * 60 * 60);
                const saneBefore = isFinite(gapBeforeHours) && gapBeforeHours >= 0 && gapBeforeHours <= 36;
                const saneAfter = isFinite(gapAfterHours) && gapAfterHours >= 0 && gapAfterHours <= 36;
                if (saneBefore && saneAfter) dataQuality = 'HIGH';
              }
            }
          } catch (_) {}

          blocks.push({
            start: prevEnd,
            end: currStart,
            durationHours,
            kind: durationHours >= REG_WEEKLY_REST / 60 ? 'REGULAR_WEEKLY_REST' : 'REDUCED_WEEKLY_REST',
            source: 'tachograph',
            dataQuality
          });
        }
      }

      return blocks.reverse();
    } catch (e) {
      try { console.warn('[tacho] getWeeklyRestBlocksFromTachograph failed', e); } catch (_) {}
      return [];
    }
  }

  window.getWeeklyRestBlocksFromTachograph = getWeeklyRestBlocksFromTachograph;

  function resolveDailyDriveSegments(record, drivingTimeMode) {
    if (typeof window.getDailyDriveSegmentsForRecord === 'function') {
      return window.getDailyDriveSegmentsForRecord(record, drivingTimeMode);
    }
    const total = Math.max(0, Number(record && record.driveMinutes) || 0);
    if (record && record.date) {
      return [{ date: String(record.date), minutes: total }];
    }
    return [];
  }

  /**
   * Napi vezetési szegmensek alapján driveAnalysis szöveg + színezés (10h szabály).
   */
  function buildDriveAnalysisFromSegments(segments, record, extendedDrivingInWeekCounter, i18n) {
    const activeSegs = (segments || []).filter(function (s) {
      return s && s.date && (Number(s.minutes) || 0) > 0;
    });
    const emptyClass = 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400';
    if (!activeSegs.length) {
      return { text: i18n.tachoNoDriveTime, colorClass: emptyClass, isIrregularDrive: false };
    }

    const sundayStr = String(record.date || '');
    const isVH = activeSegs.length > 1
      || !!record.isSundayMondayShift
      || (record.endDate && typeof window.isSundayMondayShift === 'function'
        && window.isSundayMondayShift(record.date, record.endDate));

    let isIrregularDrive = false;
    let hasExtended = false;
    let maxExtendedCount = 0;
    const classified = [];

    activeSegs.forEach(function (seg) {
      const mins = Number(seg.minutes) || 0;
      const hours = mins / 60;
      const isSundaySeg = seg.date === sundayStr;
      const prefix = isVH ? (isSundaySeg ? 'V' : 'H') : '';
      const dur = typeof formatDuration === 'function' ? formatDuration(mins) : (mins + 'p');
      let kind = 'normal';
      let countInWeek = 0;

      if (hours > 10) {
        kind = 'irregular';
        isIrregularDrive = true;
      } else if (hours > 9) {
        kind = 'extended';
        hasExtended = true;
        const weekKey = typeof window.getTachographWeekKey === 'function'
          ? window.getTachographWeekKey(seg.date)
          : '';
        if (weekKey) {
          extendedDrivingInWeekCounter[weekKey] = (extendedDrivingInWeekCounter[weekKey] || 0) + 1;
          countInWeek = extendedDrivingInWeekCounter[weekKey];
          if (countInWeek > 2) isIrregularDrive = true;
          if (countInWeek > maxExtendedCount) maxExtendedCount = countInWeek;
        }
      }

      classified.push({ kind: kind, prefix: prefix, dur: dur, countInWeek: countInWeek });
    });

    let text;
    if (!isVH && classified.length === 1) {
      const c = classified[0];
      const mins = activeSegs[0].minutes;
      if (c.kind === 'irregular') {
        text = `${i18n.tachoIrregularDrive} (${c.dur})`;
      } else if (c.kind === 'extended') {
        const irregularText = c.countInWeek > 2 ? '(szabálytalan) ' : '';
        text = `${c.countInWeek}. ${irregularText}${i18n.tachoIncreasedDrive} (${c.dur})`;
      } else {
        text = `${i18n.tachoNormalDrive} (${c.dur})`;
      }
    } else {
      const lineParts = classified.map(function (c) {
        if (!isVH && c.kind === 'irregular') {
          return `${i18n.tachoIrregularDrive} (${c.dur})`;
        }
        return c.prefix ? `${c.prefix}: ${c.dur}` : `${i18n.tachoNormalDrive} (${c.dur})`;
      });
      text = lineParts.join(' | ');
      if (hasExtended || isIrregularDrive) {
        const irregularText = isIrregularDrive && maxExtendedCount > 2 ? '(szabálytalan) ' : '';
        const countPrefix = maxExtendedCount > 0 ? `${maxExtendedCount}. ${irregularText}` : '';
        text = `${countPrefix}${i18n.tachoIncreasedDrive}: ${text}`;
      }
    }

    let colorClass;
    if (isIrregularDrive) {
      colorClass = 'bg-red-500 text-white';
    } else if (hasExtended) {
      colorClass = 'bg-blue-400 text-white';
    } else {
      const isDarkDrive = document.documentElement.classList.contains('dark');
      colorClass = isDarkDrive ? '" style="background-color: #bae6fd; color: #111827' : 'bg-sky-200 text-gray-900';
    }

    return { text: text, colorClass: colorClass, isIrregularDrive: isIrregularDrive };
  }

  /**
   * 9 órás csökkentett napi pihenő ciklus reset határa.
   * A Mobilitási csomag szerepcímkéitől függetlenül minden >= 24h gap reset pont.
   */
  function isWeeklyRestBoundaryForReducedDailyReset(classified, restDurationMinutes) {
    if (classified && (classified.isWeeklyRest || classified.isReducedWeeklyRest)) {
      return true;
    }
    return Number(restDurationMinutes) >= RED_WEEKLY_REST;
  }

  function getTachographStatus(sourceRecords) {
    const raw = sourceRecords || records;
    const src = Array.isArray(raw) ? raw : [];
    const meaningfulRecords = src.filter(r => r && r.entryType !== 'noteDay' && r.startTime && r.endTime);
    const drivingTimeMode = localStorage.getItem('drivingTimeMode') || 'weekly';

    const recordsSorted = [...meaningfulRecords].sort(
      (a, b) => getRecordSortTime(a) - getRecordSortTime(b)
    );
    const blocks = typeof window.getWeeklyRestBlocksFromTachograph === 'function'
      ? window.getWeeklyRestBlocksFromTachograph(recordsSorted)
      : [];
    if (typeof window.evaluateMobilityPackageChains === 'function') {
      window.evaluateMobilityPackageChains(blocks);
    }
    const i18nStatus = (typeof translations !== 'undefined' && currentLang && translations[currentLang]) ? translations[currentLang] : {};
    const now = new Date();
    
    const { start: weekStart, end: weekEnd } = getWeekRange(now);
    const weekStartStr = toISODate(weekStart);
    const weekEndStr = toISODate(weekEnd);

    let extendedDrivesThisWeek = 0;
    meaningfulRecords.forEach(function (r) {
      const segs = resolveDailyDriveSegments(r, drivingTimeMode);
      segs.forEach(function (seg) {
        const mins = Number(seg.minutes) || 0;
        const inCurrentWeek = typeof window.isDateInTachographWeek === 'function'
          ? window.isDateInTachographWeek(seg.date, weekStartStr, weekEndStr)
          : (seg.date >= weekStartStr && seg.date <= weekEndStr);
        if (mins > 540 && inCurrentWeek) {
          extendedDrivesThisWeek++;
        }
      });
    });
    const remainingDrives10h = Math.max(0, 2 - extendedDrivesThisWeek);

    let reducedRestsInCycle = 0;
    let pendingReducedRest = 0;
    let skipClosedRecordsForReducedRest = false;
    
    const activeShiftRaw = window.activeShift || (typeof getActiveShiftFromStorage === 'function' ? getActiveShiftFromStorage() : null);
    // Olvasás: resolveDrivingMode / isTeamDrivingMode — NEM ensureDrivingModeOnRecord
    // (az utóbbi mentési út; a hiányzó mezőt sticky migration defaulttal tölti, nem élő toggle-lal).
    const activeShift = activeShiftRaw ? Object.assign({}, activeShiftRaw) : null;
    const lastClosedRecord = recordsSorted.length > 0 ? recordsSorted[recordsSorted.length - 1] : null;
    const statusContextRecord = activeShift || lastClosedRecord;
    const usesTeamDailyRestRules = !!(statusContextRecord && (
      typeof window.isTeamDrivingMode === 'function'
        ? window.isTeamDrivingMode(statusContextRecord)
        : statusContextRecord.drivingMode === 'team'
    ));
    
    if (activeShift && activeShift.startTime && recordsSorted.length > 0) {
        const lastRecord = recordsSorted[recordsSorted.length - 1];
        const gapMode = resolveModeForRestGap(lastRecord);
        const lastEndDateStr = lastRecord.endDate || lastRecord.date;
        const lastEnd = new Date(`${lastEndDateStr}T${lastRecord.endTime}`);
        
        const currentStart = new Date(`${activeShift.date}T${activeShift.startTime}`);
        const restDurationMinutes = effectiveRestMinutesForDaily(lastRecord, lastEnd, currentStart, gapMode);
        const classified = typeof window.classifyRestGap === 'function'
          ? window.classifyRestGap(restDurationMinutes, lastRecord, 0, lastEnd, i18nStatus, blocks, gapMode)
          : null;

        if (isWeeklyRestBoundaryForReducedDailyReset(classified, restDurationMinutes)) {
            reducedRestsInCycle = 0;
            pendingReducedRest = 0;
            skipClosedRecordsForReducedRest = true;
            console.log('[tacho] Weekly rest detected between last record and active shift. Reduced rest cycle reset.');
        } else if (classified && classified.isReducedDaily && gapMode !== 'team') {
            reducedRestsInCycle++;
            pendingReducedRest = 0;
            console.log('[tacho] Aktív műszak csökkentett napi pihenő után indult:', restDurationMinutes / 60, 'óra');
        }
    }
    
    if (!skipClosedRecordsForReducedRest) {
        for (let i = recordsSorted.length - 1; i > 0; i--) {
            const previousRecord = recordsSorted[i - 1];
            const gapMode = resolveModeForRestGap(previousRecord);
            const prevEndDateStr = previousRecord.endDate || previousRecord.date;
            const prevEnd = new Date(`${prevEndDateStr}T${previousRecord.endTime}`);
            const currentRecord = recordsSorted[i];
            const currentStartDateStr = currentRecord.date;
            const currentStart = new Date(`${currentStartDateStr}T${currentRecord.startTime}`);
            const restDurationMinutes = effectiveRestMinutesForDaily(previousRecord, prevEnd, currentStart, gapMode);
            const classified = typeof window.classifyRestGap === 'function'
              ? window.classifyRestGap(restDurationMinutes, previousRecord, 0, prevEnd, i18nStatus, blocks, gapMode)
              : null;

            if (isWeeklyRestBoundaryForReducedDailyReset(classified, restDurationMinutes)) break;
            if (classified && classified.isReducedDaily && gapMode !== 'team') {
                reducedRestsInCycle++;
            }
        }
    }

    // PENDING (sárga ikon): csak single módú 13+ szolgálatnál értelmezett
    if (!usesTeamDailyRestRules) {
      if (activeShift && activeShift.startTime) {
          const shiftStart = new Date(`${activeShift.date}T${activeShift.startTime}`);
          const shiftDurationHours = (now - shiftStart) / (1000 * 60 * 60);
          if (shiftDurationHours > 13) {
              pendingReducedRest = 1;
          }
      } else if (lastClosedRecord) {
          if ((lastClosedRecord.workMinutes || 0) > LONG_WORKDAY && !lastClosedRecord.isSplitRest) {
              pendingReducedRest = 1;
          }
      }
    }

    const lastRecordForPending = (!activeShift && lastClosedRecord) ? lastClosedRecord : null;
    const safePendingReducedRest = (lastRecordForPending && lastRecordForPending.isSplitRest)
        ? 0
        : pendingReducedRest;

    const totalUsed = reducedRestsInCycle + safePendingReducedRest;
    // Team UI: nincs 3-as csökkentett keret → Infinity (nem 99 mágikus szám)
    let remainingRests9h = usesTeamDailyRestRules
      ? Number.POSITIVE_INFINITY
      : Math.max(0, 3 - totalUsed);

    // Heti és kétheti vezetési idők számítása napi szegmensekkel
    const currentWeekDriveMinutes = meaningfulRecords.reduce((sum, r) => {
      const segs = resolveDailyDriveSegments(r, drivingTimeMode);
      segs.forEach(seg => {
        if (seg.date >= weekStartStr && seg.date <= weekEndStr) sum += seg.minutes || 0;
      });
      return sum;
    }, 0);

    const { start: lastWeekStart, end: lastWeekEnd } = getWeekRange(now, -1);
    const lastWeekStartStr = toISODate(lastWeekStart);
    const lastWeekEndStr = toISODate(lastWeekEnd);

    const lastWeekDriveMinutes = meaningfulRecords.reduce((sum, r) => {
      const segs = resolveDailyDriveSegments(r, drivingTimeMode);
      segs.forEach(seg => {
        if (seg.date >= lastWeekStartStr && seg.date <= lastWeekEndStr) {
          sum += seg.minutes || 0;
        }
      });
      return sum;
    }, 0);

    const twoWeekDriveMinutes = currentWeekDriveMinutes + lastWeekDriveMinutes;

    let lastWeeklyRestEnd = null;
    for (let i = recordsSorted.length - 1; i > 0; i--) {
        const prevRecord = recordsSorted[i - 1];
        
        const prevEndDateStr = prevRecord.endDate || prevRecord.date;
        const prevEnd = new Date(`${prevEndDateStr}T${prevRecord.endTime}`);

        const currentRecord = recordsSorted[i];
        const currentStartDateStr = currentRecord.date;
        const currentStart = new Date(`${currentStartDateStr}T${currentRecord.startTime}`);

        const restHours = (currentStart - prevEnd) / (1000 * 60 * 60);
        if (restHours >= 24) {
            lastWeeklyRestEnd = currentStart;
            break;
        }
    }
    if (!lastWeeklyRestEnd && recordsSorted.length > 0) {
        const firstRecord = recordsSorted[0];
        const firstEndDateStr = firstRecord.endDate || firstRecord.date;
        lastWeeklyRestEnd = new Date(`${firstEndDateStr}T${firstRecord.endTime}`);
    }
    
    let weeklyRestDeadline = null;
    if (lastWeeklyRestEnd) {
        weeklyRestDeadline = new Date(lastWeeklyRestEnd.getTime() + 6 * 24 * 60 * 60 * 1000);
    }

    return {
        remainingDrives10h,
        remainingRests9h: usesTeamDailyRestRules ? Number.POSITIVE_INFINITY : Math.max(0, remainingRests9h),
        remainingRests9hUnlimited: usesTeamDailyRestRules,
        usesTeamDailyRestRules,
        statusDrivingMode: usesTeamDailyRestRules ? 'team' : 'single',
        pendingReducedRest: usesTeamDailyRestRules ? 0 : pendingReducedRest,
        currentWeekDriveMinutes,
        twoWeekDriveMinutes,
        weeklyRestDeadline
    };
  }

  function renderTachographStatusCard() {
    const i18n = translations[currentLang];
    const liveContainer = document.getElementById('live-allowance-display');
    const tachoContainer = document.getElementById('tacho-allowance-display');
    
    if (!liveContainer || !tachoContainer) {
        console.warn('Tachograph status containers not found');
        return;
    }

    let _statusCardPresentation = 'unknown';
    try {
      _statusCardPresentation = (typeof window.getEntitlementPresentationState === 'function')
        ? window.getEntitlementPresentationState()
        : 'free';
    } catch (_) { _statusCardPresentation = 'free'; }
    if (_statusCardPresentation === 'unknown' || _statusCardPresentation === 'offline') {
      const loadingHtml = `
    <div class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3 shadow-sm">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-lg text-gray-800 dark:text-gray-100">🗓️ ${i18n.tachoWeeklyStatus}</h3>
          <span class="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">⏳</span>
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">${i18n.weeklyStatusLoading || i18n.proFeatureStatusLoading || 'Betöltés...'}</div>
    </div>`;
      liveContainer.innerHTML = loadingHtml;
      tachoContainer.innerHTML = loadingHtml;
      return;
    }
    if (_statusCardPresentation === 'free') {
      const lockedHtml = `
    <div class="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 border border-indigo-200 dark:border-gray-700 rounded-xl p-4 space-y-3 shadow-sm">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-lg text-gray-800 dark:text-gray-100">🗓️ ${i18n.tachoWeeklyStatus}</h3>
          <span class="text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 rounded-full">🔒</span>
        </div>
        <div class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">${i18n.tachoWeeklyStatusLocked || 'A heti státusz Free csomagban korlátozott.'}</div>
        <button type="button" data-goto-tab="subscription" class="promo-upgrade-btn w-full py-3 px-4 rounded-xl font-bold text-base transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2" style="background-color: #4f46e5 !important; color: white !important;">
          <span>${i18n.subscriptionUpgradeCta || 'Pro csomagra váltok'}</span>
        </button>
    </div>`;
      liveContainer.innerHTML = lockedHtml;
      tachoContainer.innerHTML = lockedHtml;
      return;
    }

    const recordsToUse = (Array.isArray(records) && records.length > 0) ? records : demoRecords;
    const status = getTachographStatus(recordsToUse);
    const usesTeamDailyRestRules = !!status.usesTeamDailyRestRules;

    let driveIcons = Array.from({ length: 2 }, (_, i) => 
        (i < status.remainingDrives10h) ? createAvailableIcon(10, 35) : createUsedIcon(10, 35)
    ).join('');
    
    let restIcons = '';
    if (usesTeamDailyRestRules) {
        restIcons = '<div style="font-size: 28px; line-height: 1;">🚗🚗</div>';
    } else {
        let restIconsArray = [];
        const remainingFinite = Number.isFinite(status.remainingRests9h) ? status.remainingRests9h : 0;
        for (let i = 0; i < 3; i++) {
            if (i < remainingFinite) {
                restIconsArray.push(createAvailableIcon(9, 35));
            } else if (i === remainingFinite && status.pendingReducedRest > 0) {
                restIconsArray.push(createPendingIcon(9, 35));
            } else {
                restIconsArray.push(createUsedIcon(9, 35));
            }
        }
        restIcons = restIconsArray.join('');
    }

    const percent56h = Math.min(100, (status.currentWeekDriveMinutes / (56 * 60)) * 100);
    const percent90h = Math.min(100, (status.twoWeekDriveMinutes / (90 * 60)) * 100);
    const driveTooltip = (currentLang === 'de') ? `Verbleibend: ${status.remainingDrives10h}` : `Fennmaradó: ${status.remainingDrives10h}`;
    const restTooltip = usesTeamDailyRestRules 
        ? ((currentLang === 'de') ? '4 Hände Modus (Team Driving)' : '4 kézes mód (Team Driving)')
        : ((currentLang === 'de') ? 
            `Verbleibend: ${status.remainingRests9h}${status.pendingReducedRest>0?' • Ausstehend':''}` : 
            `Fennmaradó: ${status.remainingRests9h}${status.pendingReducedRest>0?' • Függőben':''}`);

    let deadlineHtml = `<p class="text-gray-500">${i18n.summaryNoData}</p>`;
    if (status.weeklyRestDeadline) {
        const now = new Date();
        const diffMinutes = (status.weeklyRestDeadline - now) / 60000;
        const absoluteDeadline = formatDateTime(status.weeklyRestDeadline);

        if (diffMinutes < 0) {
            deadlineHtml = `<p class="font-bold text-red-500">${i18n.tachoDeadlineExpired}</p><p class="text-xs text-gray-500">${absoluteDeadline}</p>`;
        } else {
            const days = Math.floor(diffMinutes / 1440);
            const hours = Math.floor((diffMinutes % 1440) / 60);
            const relativeTime = i18n.tachoRelativeTime.replace('{days}', days).replace('{hours}', hours);
            deadlineHtml = `<p class="font-bold text-lg">${absoluteDeadline}</p><p class="text-xs text-gray-500">${relativeTime}</p>`;
        }
    }

    let timeProgressHtml = '';
    try {
        const now = new Date();
        const activeShiftState = window.activeShift || (typeof getActiveShiftFromStorage === 'function' ? getActiveShiftFromStorage() : null);
        let mode = null; // 'shift' vagy 'rest'
        let elapsedMinutes = 0;
        let fillPercent = 0;
        let barColor = '';
        let scaleLabelsHtml = '';
        let markersHtml = '';

        if (activeShiftState && activeShiftState.date && activeShiftState.startTime) {
            const start = new Date(`${activeShiftState.date}T${activeShiftState.startTime}`);
            if (!isNaN(start)) {
                mode = 'shift';
                elapsedMinutes = Math.max(0, Math.round((now - start) / 60000));
                const hours = elapsedMinutes / 60;
                const hourUnit = i18n.tachoHourUnit || 'h';
                const activeMode = (typeof window.resolveDrivingMode === 'function')
                  ? window.resolveDrivingMode(activeShiftState)
                  : (activeShiftState.drivingMode === 'team' ? 'team' : 'single');
                const isTeamShift = activeMode === 'team';
                
                if (isTeamShift) {
                    const maxHours = (typeof window.MAX_TEAM_SHIFT_HOURS === 'number') ? window.MAX_TEAM_SHIFT_HOURS : 21;
                    fillPercent = Math.max(0, Math.min((hours / maxHours) * 100, 100));
                    
                    markersHtml = '';
                    scaleLabelsHtml = `
        <div class="relative mt-1 text-xs text-gray-500 dark:text-gray-400">
          <div class="flex justify-between">
            <span>0${hourUnit}</span>
            <span>${maxHours}${hourUnit}</span>
          </div>
        </div>`;
                    
                    if (hours <= maxHours) {
                        barColor = '#22c55e';
                    } else {
                        barColor = '#ef4444';
                    }
                } else {
                    // Normál mód: 0–15h skála (tachográf határ; konstans: MAX_TACHOGRAPH_SHIFT_MINUTES)
                    const maxHours = (typeof window !== 'undefined' && window.MAX_TACHOGRAPH_SHIFT_MINUTES != null)
                      ? window.MAX_TACHOGRAPH_SHIFT_MINUTES / 60 : 15;
                    fillPercent = Math.max(0, Math.min((hours / maxHours) * 100, 100));

                    // 13h marker (LONG_WORKDAY = 13+ munka határ, workMinutes alapján)
                    const thresholdHours = (typeof window !== 'undefined' && window.LONG_WORKDAY_THRESHOLD_MINUTES != null)
                      ? window.LONG_WORKDAY_THRESHOLD_MINUTES / 60 : 13;
                    const marker13 = (thresholdHours / maxHours) * 100;
                    markersHtml = `
        <div class="absolute inset-y-0" style="left:${marker13}%;width:3px;background-color:#000000;opacity:1;"></div>`;
                    scaleLabelsHtml = `
        <div class="relative mt-1 text-xs text-gray-500 dark:text-gray-400">
          <div class="flex justify-between">
            <span>0${hourUnit}</span>
            <span>${maxHours}${hourUnit}</span>
          </div>
          <div class="absolute" style="left:${marker13}%;transform:translateX(-50%);top:0;">
            <span>${thresholdHours}${hourUnit}</span>
          </div>
        </div>`;

                    if (hours <= thresholdHours) {
                        barColor = '#3b82f6'; // kék
                    } else if (hours <= maxHours) {
                        barColor = '#f97316'; // narancs
                    } else {
                        barColor = '#ef4444'; // piros
                    }
                }
            }
        } else {
            const lastRecord = (typeof getLatestRecord === 'function')
                ? getLatestRecord()
                : (Array.isArray(records) && records.length > 0 ? records[records.length - 1] : null);
            if (lastRecord && lastRecord.endTime) {
                const endDateStr = lastRecord.endDate || lastRecord.date;
                const endDate = new Date(`${endDateStr}T${lastRecord.endTime}`);
                if (!isNaN(endDate)) {
                    mode = 'rest';
                    elapsedMinutes = Math.max(0, Math.round((now - endDate) / 60000));
                    const hours = elapsedMinutes / 60;
                    const hourUnit = i18n.tachoHourUnit || 'h';
                    if (hours < 11) {
                        const maxHours = 11;
                        fillPercent = Math.max(0, Math.min((hours / maxHours) * 100, 100));
                        if (hours < 9) {
                            barColor = '#ef4444'; // 0-9h: piros
                        } else {
                            barColor = '#fbbf24'; // 9-11h: sárga
                        }
                        scaleLabelsHtml = `
        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>0${hourUnit}</span>
          <span>9${hourUnit}</span>
          <span>11${hourUnit}</span>
        </div>`;
                    } else {
                        const maxHours = 45;
                        fillPercent = Math.max(0, Math.min((hours / maxHours) * 100, 100));
                        barColor = '#22c55e'; // 11-45h: zöld
                        const marker24 = (24 / maxHours) * 100;
                        markersHtml = `
        <div class="absolute inset-y-0" style="left:${marker24}%;width:3px;background-color:#000000;opacity:1;"></div>`;
                        scaleLabelsHtml = `
        <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>0${hourUnit}</span>
          <span>24${hourUnit}</span>
          <span>45${hourUnit}</span>
        </div>`;
                    }
                }
            }
        }

        if (mode && barColor) {
            const safePercent = isFinite(fillPercent) && fillPercent >= 0 ? fillPercent : 0;
            const labelPrefix = mode === 'shift'
                ? (i18n.tachoTimeProgressShift || 'Active shift')
                : (i18n.tachoTimeProgressRest || 'Rest period');
            timeProgressHtml = `
        <div class="space-y-1 text-sm">
          <div class="flex justify-between items-center text-xs text-gray-600 dark:text-gray-300">
            <span class="font-medium">${labelPrefix}</span>
            <span>${formatDuration(elapsedMinutes)}</span>
          </div>
          <div class="progress-bar relative">
            <div class="progress-bar-fill" style="width: ${safePercent}%; background-color: ${barColor};"></div>
            ${markersHtml || ''}
          </div>
          ${scaleLabelsHtml || ''}
        </div>`;
        }
    } catch (e) {
        console.error('[tacho] time progress render error', e);
    }

    const html = `
    <div class="bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 space-y-3 cursor-pointer" data-goto-tab="tachograph" role="button" tabindex="0">
        <h3 class="font-semibold text-gray-800 dark:text-gray-100">🗓️ ${i18n.tachoWeeklyStatus}</h3>
        <div class="grid grid-cols-2 gap-3 text-center">
            <div class="p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                <p class="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">${i18n.tachoAllowanceDrive10h}</p>
                <div class="flex justify-center gap-2" title="${i18n.tachoAllowanceDrive10h} • ${driveTooltip}">${driveIcons.replace(/45/g, '35')}</div>
            </div>
            <div class="p-2 bg-orange-50 dark:bg-orange-900/50 rounded-lg">
                ${usesTeamDailyRestRules ? '' : `<p class="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1">${i18n.tachoAllowanceReducedRest}</p>`}
                <div class="flex justify-center gap-2" title="${usesTeamDailyRestRules ? restTooltip : (i18n.tachoAllowanceReducedRest + ' • ' + restTooltip)}">${restIcons.replace(/45/g, '35')}</div>
            </div>
        </div>
        <div class="space-y-2 text-sm">
            <div>
                <div class="flex justify-between mb-1">
                    <span class="font-medium">${i18n.tachoDriveThisWeek}</span>
                    <span>${formatDuration(status.currentWeekDriveMinutes)} / 56${i18n.tachoHourUnit}</span>
                </div>
                <div class="progress-bar"><div class="progress-bar-fill" style="width: ${percent56h}%;"></div></div>
            </div>
            <div>
                <div class="flex justify-between mb-1">
                    <span class="font-medium">${i18n.tachoDriveTwoWeeks}</span>
                    <span>${formatDuration(status.twoWeekDriveMinutes)} / 90${i18n.tachoHourUnit}</span>
                </div>
                <div class="progress-bar"><div class="progress-bar-fill" style="width: ${percent90h}%;"></div></div>
            </div>
        </div>
        ${timeProgressHtml}
        <div class="text-sm border-t dark:border-gray-700 pt-2 flex justify-between items-center">
            <span class="font-medium">${i18n.tachoNextWeeklyRestDue}</span>
            <div class="text-right">${deadlineHtml}</div>
        </div>
    </div>`;

    liveContainer.innerHTML = html;
    tachoContainer.innerHTML = html;
  }

  function getTachographListRecords() {
    if (typeof window.getRecordsForListDisplay === 'function') {
      return window.getRecordsForListDisplay();
    }
    return (Array.isArray(records) && records.length > 0) ? records : demoRecords;
  }

  function tachoRecordsOlderHasMore() {
    return typeof window.recordsOlderHasMore === 'function' ? window.recordsOlderHasMore() : false;
  }

  function tachoRecordsOlderIsLoading() {
    return typeof window.recordsOlderIsLoading === 'function' ? window.recordsOlderIsLoading() : false;
  }

  async function ensureTachoRecordsLoadedForPage(targetPage) {
    if (typeof window.ensureRecordsLoadedForPage === 'function') {
      return window.ensureRecordsLoadedForPage(targetPage, { pageSize: tachoPageSize });
    }
    return getTachographListRecords().length;
  }

  function showTachographListLoading(message) {
    const container = document.getElementById('tachograph-list');
    if (container) {
      container.innerHTML = '<p class="text-center text-gray-500 py-8">' + (message || 'Betöltés...') + '</p>';
    }
  }

  const TACHO_PAGE_SIZE_OPTIONS = (typeof ListPagination !== 'undefined' && ListPagination.DEFAULT_PAGE_SIZE_OPTIONS)
    ? ListPagination.DEFAULT_PAGE_SIZE_OPTIONS
    : [10, 20, 50, 100];
  const TACHO_PAGE_SIZE_STORAGE_KEY = 'tachographListPageSize';
  const TACHO_PAGINATION_SLOT_IDS = ['tachograph-pagination-top', 'tachograph-pagination-bottom'];
  const TACHO_JUMP_MODAL_IDS = {
    overlayId: 'tachograph-page-jump-overlay',
    gridId: 'tachograph-page-jump-grid',
    titleId: 'tachograph-page-jump-title',
    closeBtnId: 'tachograph-page-jump-close-btn',
    closeHandler: 'closeTachographPageJumpModal',
  };

  let tachoPageSize = (typeof ListPagination !== 'undefined' && ListPagination.getStoredPageSize)
    ? ListPagination.getStoredPageSize(TACHO_PAGE_SIZE_STORAGE_KEY, TACHO_PAGE_SIZE_OPTIONS, 10)
    : 10;
  let tachoCurrentPage = 1;

  function getTachographPaginationTotals(analysis) {
    const totalItems = Array.isArray(analysis) ? analysis.length : 0;
    if (typeof ListPagination !== 'undefined' && ListPagination.calcTotals) {
      return ListPagination.calcTotals(totalItems, tachoPageSize);
    }
    const totalPages = Math.max(1, Math.ceil(totalItems / tachoPageSize));
    return { totalItems, totalPages };
  }

  function clampTachographCurrentPage(totalPages) {
    if (typeof ListPagination !== 'undefined' && ListPagination.clampPage) {
      tachoCurrentPage = ListPagination.clampPage(tachoCurrentPage, totalPages);
      return;
    }
    if (tachoCurrentPage > totalPages) tachoCurrentPage = totalPages;
    if (tachoCurrentPage < 1) tachoCurrentPage = 1;
  }

  function scrollTachographListToTop() {
    const anchor = document.getElementById('tachograph-list-top-anchor')
      || document.getElementById('content-tachograph');
    if (!anchor || typeof anchor.scrollIntoView !== 'function') return;
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function buildTachographPaginationHtml(totalPages, totalItems, options) {
    if (typeof ListPagination !== 'undefined' && ListPagination.buildHtml) {
      return ListPagination.buildHtml({
        currentPage: tachoCurrentPage,
        totalPages: totalPages,
        totalItems: totalItems,
        pageSize: tachoPageSize,
        pageSizeOptions: TACHO_PAGE_SIZE_OPTIONS,
        changePageHandler: 'changeTachographPage',
        changePageSizeHandler: 'changeTachographPageSize',
        openJumpHandler: 'openTachographPageJumpModal',
        hasMoreBeyond: tachoRecordsOlderHasMore(),
        isLoadingOlder: tachoRecordsOlderIsLoading(),
        showLoadedCount: true,
        showMoreDataHint: !(options && options.showMoreDataHint === false),
      });
    }
    return '';
  }

  function renderTachographPaginationControls(totalPages, totalItems) {
    const showControls = totalItems > 0;
    if (!showControls) {
      if (typeof ListPagination !== 'undefined' && ListPagination.renderToSlots) {
        ListPagination.renderToSlots(TACHO_PAGINATION_SLOT_IDS, '', false);
      } else {
        TACHO_PAGINATION_SLOT_IDS.forEach(function (slotId) {
          const slot = document.getElementById(slotId);
          if (!slot) return;
          slot.innerHTML = '';
          slot.classList.add('hidden');
        });
      }
      return;
    }
    const topHtml = buildTachographPaginationHtml(totalPages, totalItems, { showMoreDataHint: false });
    const bottomHtml = buildTachographPaginationHtml(totalPages, totalItems, { showMoreDataHint: true });
    const topSlot = document.getElementById('tachograph-pagination-top');
    const bottomSlot = document.getElementById('tachograph-pagination-bottom');
    if (topSlot) {
      topSlot.innerHTML = topHtml;
      topSlot.classList.remove('hidden');
    }
    if (bottomSlot) {
      bottomSlot.innerHTML = bottomHtml;
      bottomSlot.classList.remove('hidden');
    }
  }

  function closeTachographPageJumpModal() {
    if (typeof ListPagination !== 'undefined' && ListPagination.closeJumpModal) {
      ListPagination.closeJumpModal({
        overlayId: TACHO_JUMP_MODAL_IDS.overlayId,
        bodyClass: 'records-page-jump-open',
      });
    }
  }

  function openTachographPageJumpModal() {
    const analysis = window.lastTachographAnalysis;
    if (!Array.isArray(analysis) || !analysis.length) return;
    const { totalPages } = getTachographPaginationTotals(analysis);
    if (typeof ListPagination === 'undefined' || !ListPagination.openJumpModal) return;
    ListPagination.openJumpModal({
      overlayId: TACHO_JUMP_MODAL_IDS.overlayId,
      gridId: TACHO_JUMP_MODAL_IDS.gridId,
      titleId: TACHO_JUMP_MODAL_IDS.titleId,
      closeBtnId: TACHO_JUMP_MODAL_IDS.closeBtnId,
      closeHandler: TACHO_JUMP_MODAL_IDS.closeHandler,
      currentPage: tachoCurrentPage,
      totalPages: totalPages,
      bodyClass: 'records-page-jump-open',
      onSelectPage: function (page) {
        jumpToTachographPage(page);
      },
    });
  }

  function initTachographPageJumpModal() {
    if (typeof ListPagination !== 'undefined' && ListPagination.initJumpModal) {
      ListPagination.initJumpModal(TACHO_JUMP_MODAL_IDS);
    }
  }

  async function changeTachographPage(direction) {
    const i18n = translations[currentLang];
    const analysis = window.lastTachographAnalysis;
    if (!Array.isArray(analysis) || !analysis.length) return;
    let { totalPages } = getTachographPaginationTotals(analysis);
    let nextPage = tachoCurrentPage;
    const loadingMsg = i18n.recordsLoadingOlder || 'Régebbi bejegyzések betöltése…';

    if (direction === 'first') {
      nextPage = 1;
    } else if (direction === 'last') {
      nextPage = totalPages;
    } else if (direction === -1) {
      nextPage = Math.max(1, tachoCurrentPage - 1);
    } else if (direction === 1) {
      if (tachoCurrentPage < totalPages) {
        nextPage = tachoCurrentPage + 1;
      } else if (tachoRecordsOlderHasMore()) {
        showTachographListLoading(loadingMsg);
        renderTachographPaginationControls(totalPages, analysis.length);
        await ensureTachoRecordsLoadedForPage(tachoCurrentPage + 1);
        tachoCurrentPage = tachoCurrentPage + 1;
        await renderTachographAnalysis({ scrollToTop: true });
        return;
      } else {
        return;
      }
    }

    if (nextPage === tachoCurrentPage) return;
    tachoCurrentPage = nextPage;
    renderTachographAnalysisPage({ scrollToTop: true });
  }

  function changeTachographPageSize(rawSize) {
    const size = parseInt(rawSize, 10);
    if (!TACHO_PAGE_SIZE_OPTIONS.includes(size) || size === tachoPageSize) return;
    tachoPageSize = size;
    try { localStorage.setItem(TACHO_PAGE_SIZE_STORAGE_KEY, String(size)); } catch (_) {}
    const analysis = window.lastTachographAnalysis;
    if (!Array.isArray(analysis) || !analysis.length) return;
    const { totalPages } = getTachographPaginationTotals(analysis);
    clampTachographCurrentPage(totalPages);
    renderTachographAnalysisPage({ scrollToTop: true });
  }

  async function jumpToTachographPage(rawPage) {
    const i18n = translations[currentLang];
    const analysis = window.lastTachographAnalysis;
    if (!Array.isArray(analysis) || !analysis.length) return;
    let { totalPages, totalItems } = getTachographPaginationTotals(analysis);
    let page = parseInt(rawPage, 10);
    if (isNaN(page)) page = tachoCurrentPage;
    page = Math.max(1, page);

    if (page > totalPages && tachoRecordsOlderHasMore()) {
      showTachographListLoading(i18n.recordsLoadingOlder || 'Régebbi bejegyzések betöltése…');
      await ensureTachoRecordsLoadedForPage(page);
      tachoCurrentPage = page;
      await renderTachographAnalysis({ scrollToTop: true });
      return;
    }

    page = Math.min(totalPages, page);
    if (page === tachoCurrentPage) {
      renderTachographPaginationControls(totalPages, totalItems);
      return;
    }
    tachoCurrentPage = page;
    renderTachographAnalysisPage({ scrollToTop: true });
  }

  function renderTachographCardHtml(res, i18n) {
    const locale = (typeof getCurrentLocale === 'function') ? getCurrentLocale() : (currentLang === 'de' ? 'de-DE' : (currentLang === 'en' ? 'en-US' : (currentLang === 'ro' ? 'ro-RO' : (currentLang === 'pl' ? 'pl-PL' : 'hu-HU'))));
    const d = new Date(res.record.date + 'T00:00:00');
    const dateString = d.toLocaleDateString(locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    if (res.isNoteDay) {
      return `
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 shadow-sm border-l-4 border-gray-300">
            <div class="flex justify-between items-start mb-3">
                <p class="font-bold text-base text-gray-800 dark:text-gray-100">${dateString}</p>
            </div>
            <div class="p-3 rounded text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                <p class="font-semibold">${i18n.tachoNoteDayTitle || 'Note / No work time'}</p>
                <p>${res.rest.text}</p>
            </div>
        </div>`;
    }
    const borderColorClass = res.rest.colorClass.split(' ')[0].replace('bg-', 'border-');
    const vehiclePlate = (typeof window.EntryVehicleField !== 'undefined' && window.EntryVehicleField.getRecordVehiclePlate)
      ? window.EntryVehicleField.getRecordVehiclePlate(res.record)
      : '';
    const vehicleEsc = vehiclePlate
      ? String(vehiclePlate).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      : '';
    const vehicleSegmentsHtml = (typeof window.VehicleSegments !== 'undefined' && window.VehicleSegments.formatListCardVehicleBlock)
      ? window.VehicleSegments.formatListCardVehicleBlock(res.record)
      : '';
    const vehicleLineHtml = vehicleSegmentsHtml
      ? '<div class="mb-2">' + vehicleSegmentsHtml + '</div>'
      : (vehiclePlate
        ? `<p class="text-xs text-gray-500 dark:text-gray-400 mb-2">${i18n.recordVehicleLabel || 'Jármű'}: ${vehicleEsc}</p>`
        : '');
    let compensationHtml = '';
    if (res.restStart && res.restEnd && typeof window.getResolvedCompensationsForRest === 'function') {
      const resolved = window.getResolvedCompensationsForRest(res.restStart, res.restEnd);
      if (resolved && resolved.length > 0) {
        const totalHours = resolved.reduce((s, c) => s + (Number(c.compensationHours) || 0), 0);
        const totalMins = Math.round(totalHours * 60);
        const formatted = typeof formatDuration === 'function' ? formatDuration(totalMins) : (Math.floor(totalHours) + 'h');
        const label = (i18n && i18n.compensationResolved) || 'visszapótlás rendezve';
        compensationHtml = `<div class="col-span-1 md:col-span-2 p-2 rounded text-sm bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 mt-1"><p>${formatted} ${label}</p></div>`;
      }
    }
    const pendingBadge = (typeof window.getRecordSyncStatusBadgesHtml === 'function')
      ? window.getRecordSyncStatusBadgesHtml(res.record.id, i18n)
      : ((typeof window.isRecordPendingSync === 'function' && window.isRecordPendingSync(res.record.id) && typeof window.getRecordSyncPendingBadgeHtml === 'function')
      ? window.getRecordSyncPendingBadgeHtml(i18n)
      : '');
    return `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border-l-4 ${borderColorClass}">
            <div class="flex justify-between items-start mb-3">
                <p class="font-bold text-base text-gray-800 dark:text-gray-100">${dateString}</p>
                <div class="flex flex-col items-end gap-1">
                ${pendingBadge}
                <div class="enhanced-toggle-container enhanced-toggle-primary ${res.isSplit ? 'active' : ''}" onclick="document.getElementById('split-${res.record.id}').click()">
                   <div class="enhanced-toggle-text">
                       <span class="text-sm">${i18n.tachoSplitRest}</span>
                       <span class="enhanced-toggle-checkmark ${res.isSplit ? '' : 'hidden'}">✓</span>
                   </div>
                   <input type="checkbox" id="split-${res.record.id}" onchange="handleTachographToggle(this, '${res.record.id}')" ${res.isSplit ? 'checked' : ''} class="sr-only">
                </div>
                </div>
            </div>
            ${vehicleLineHtml}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div class="p-2 rounded text-sm ${res.rest.colorClass}" ${res.rest.inlineStyle ? `style="${res.rest.inlineStyle}"` : ''}>
                    <p class="font-semibold" style="color: inherit !important">${i18n.tachoRestBeforeShift}</p>
                    <p style="color: inherit !important">${res.rest.text}</p>
                </div>
                <div class="p-2 rounded text-sm ${res.drive.colorClass}">
                    <p class="font-semibold" style="color: inherit !important">${i18n.tachoDailyDriveTime}</p>
                    <p style="color: inherit !important">${res.drive.text}</p>
                </div>
                ${compensationHtml}
            </div>
        </div>`;
  }

  function renderTachographAnalysisPage(options) {
    const i18n = translations[currentLang];
    const container = document.getElementById('tachograph-list');
    if (!container) return;

    const analysis = window.lastTachographAnalysis;
    const totalItems = Array.isArray(analysis) ? analysis.length : 0;

    if (!totalItems) {
      container.innerHTML = `<p class="text-center text-gray-500 py-8">${i18n.noEntries}</p>`;
      tachoCurrentPage = 1;
      renderTachographPaginationControls(1, 0);
      return;
    }

    const { totalPages } = getTachographPaginationTotals(analysis);
    clampTachographCurrentPage(totalPages);

    const startIndex = (tachoCurrentPage - 1) * tachoPageSize;
    const pageItems = analysis.slice(startIndex, startIndex + tachoPageSize);

    if (!pageItems.length && tachoCurrentPage > 1 && tachoRecordsOlderHasMore() && !(options && options._olderLoadRetried)) {
      showTachographListLoading(i18n.recordsLoadingOlder || 'Régebbi bejegyzések betöltése…');
      void ensureTachoRecordsLoadedForPage(tachoCurrentPage).then(function () {
        return renderTachographAnalysis(Object.assign({}, options || {}, { _olderLoadRetried: true }));
      });
      return;
    }

    container.innerHTML = pageItems.map(function (res) {
      return renderTachographCardHtml(res, i18n);
    }).join('');

    renderTachographPaginationControls(totalPages, totalItems);

    if (options && options.scrollToTop) {
      requestAnimationFrame(scrollTachographListToTop);
    }
  }

  async function renderTachographAnalysis(options) {
    if (typeof window.loadWeeklyRestCompensationResolved === 'function') {
      try { await window.loadWeeklyRestCompensationResolved(); } catch (_) {}
    }
    if (typeof window.refreshMobilityEvaluation === 'function') {
      try { await window.refreshMobilityEvaluation(); } catch (_) {}
    }
    const i18n = translations[currentLang];
    const container = document.getElementById('tachograph-list');
    if (!container) return;

    let _analysisPresentation = 'unknown';
    try {
      _analysisPresentation = (typeof window.getEntitlementPresentationState === 'function')
        ? window.getEntitlementPresentationState()
        : 'free';
    } catch (_) { _analysisPresentation = 'free'; }
    if (_analysisPresentation === 'unknown' || _analysisPresentation === 'offline') {
      container.innerHTML = `
          <div class="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div class="font-semibold text-gray-900 dark:text-gray-100">⏳ ${i18n.tachoAnalysisTitle || 'Tachográf elemzés'}</div>
            <div class="mt-2 text-sm text-gray-700 dark:text-gray-300">${i18n.proFeatureStatusLoading || 'Betöltés...'}</div>
          </div>`;
      renderTachographPaginationControls(1, 0);
      return;
    }
    if (_analysisPresentation === 'free') {
      container.innerHTML = `
          <div class="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div class="font-semibold text-gray-900 dark:text-gray-100">🔒 ${i18n.tachoAnalysisTitle || 'Tachográf elemzés'}</div>
            <div class="mt-2 text-sm text-gray-700 dark:text-gray-300">${i18n.tachoAnalysisLocked || 'Ez a funkció Free csomagban korlátozott. Alább egy mintanézetet látsz.'}</div>
            <div class="mt-3">
              <button type="button" data-goto-tab="subscription" class="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold">${i18n.subscriptionUpgradeCta || '⭐ Pro csomag'}</button>
            </div>
            <div class="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
              <div class="text-xs text-gray-500 dark:text-gray-400">${i18n.tachoSampleLabel || 'Minta'}</div>
              <div class="mt-2 space-y-2">
                <div class="p-3 bg-white dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div class="flex justify-between">
                    <div class="font-semibold">2025-09-01</div>
                    <div class="text-xs text-gray-500">🧪</div>
                  </div>
                  <div class="mt-1 text-sm text-gray-700 dark:text-gray-300">${i18n.tachoRegularDailyRest || 'Napi pihenő'} • ${i18n.tachoNormalDrive || 'Vezetés'}</div>
                </div>
                <div class="p-3 bg-white dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div class="flex justify-between">
                    <div class="font-semibold">2025-09-02</div>
                    <div class="text-xs text-gray-500">🧪</div>
                  </div>
                  <div class="mt-1 text-sm text-gray-700 dark:text-gray-300">${i18n.tachoReducedDailyRest || 'Csökkentett pihenő'} • ${i18n.tachoIncreasedDrive || 'Megnövelt vezetés'}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      renderTachographPaginationControls(1, 0);
      return;
    }
    const recordsToUse = getTachographListRecords();
    const sortedRecords = [...recordsToUse].sort((a, b) => getRecordSortTime(a) - getRecordSortTime(b));
    if (sortedRecords.length < 1) {
        window.lastTachographAnalysis = [];
        container.innerHTML = `<p class="text-center text-gray-500 py-8">${i18n.noEntries}</p>`;
        tachoCurrentPage = 1;
        renderTachographPaginationControls(1, 0);
        return;
    }
    
    let analysisResults = [];
    let reducedDailyRestCounter = 0;
    let extendedDrivingInWeekCounter = {};

    const blocks = typeof window.getWeeklyRestBlocksFromTachograph === 'function'
      ? window.getWeeklyRestBlocksFromTachograph(sortedRecords)
      : [];
    if (typeof window.evaluateMobilityPackageChains === 'function') {
      window.evaluateMobilityPackageChains(blocks);
    }

    function findPreviousValidRecord(idx) {
        for (let j = idx; j >= 0; j--) {
            const candidate = sortedRecords[j];
            if (candidate && candidate.entryType !== 'noteDay' && candidate.startTime && candidate.endTime) {
                return candidate;
            }
        }
        return null;
    }

    for (let i = 0; i < sortedRecords.length; i++) {
        const currentRecord = sortedRecords[i];
        const isNoteDay = !currentRecord || currentRecord.entryType === 'noteDay' || !currentRecord.startTime || !currentRecord.endTime;
        if (isNoteDay) {
            analysisResults.push({
                record: currentRecord,
                rest: { text: i18n.tachoNoteDayDesc || i18n.tachoNoDriveTime, colorClass: 'bg-gray-200 text-gray-700', isNoteDay: true },
                drive: { text: i18n.tachoNoDriveTime, colorClass: 'bg-gray-100 text-gray-500' },
                isSplit: false,
                isNoteDay: true
            });
            continue;
        }

        const previousRecord = findPreviousValidRecord(i - 1);
        let restAnalysis;
        let prevEnd = null;
        let currentStart = null;
        if (previousRecord) {
            const gapMode = resolveModeForRestGap(previousRecord);
            const prevEndDateStr = previousRecord.endDate || previousRecord.date;
            prevEnd = new Date(`${prevEndDateStr}T${previousRecord.endTime}`);
            const currentStartDateStr = currentRecord.date;
            currentStart = new Date(`${currentStartDateStr}T${currentRecord.startTime}`);
            const restDurationMinutes = effectiveRestMinutesForDaily(previousRecord, prevEnd, currentStart, gapMode);
            const classified = typeof window.classifyRestGap === 'function'
              ? window.classifyRestGap(restDurationMinutes, previousRecord, reducedDailyRestCounter, prevEnd, i18n, blocks, gapMode)
              : window.classifyRest(restDurationMinutes, previousRecord, reducedDailyRestCounter, [], prevEnd, i18n, gapMode);
            // Team napi pihenő nem növeli a csökkentett keretet (sequence változatlan marad a team ágon)
            reducedDailyRestCounter = classified.reducedDailySequenceNumber;
            restAnalysis = {
                text: classified.label,
                colorClass: classified.colorClass,
                inlineStyle: classified.inlineStyle || '',
                isIrregularRest: classified.isIrregularRest,
                drivingMode: classified.drivingMode || gapMode
            };
        } else {
            const classified = window.classifyRest(0, null, 0, [], null, i18n);
            restAnalysis = {
                text: classified.label,
                colorClass: classified.colorClass,
                inlineStyle: classified.inlineStyle || '',
                isIrregularRest: false
            };
            reducedDailyRestCounter = 0;
        }
        const drivingTimeMode = localStorage.getItem('drivingTimeMode') || 'weekly';
        const driveSegments = resolveDailyDriveSegments(currentRecord, drivingTimeMode);
        const driveAnalysis = buildDriveAnalysisFromSegments(
          driveSegments,
          currentRecord,
          extendedDrivingInWeekCounter,
          i18n
        );
        const restStart = previousRecord ? prevEnd : null;
        const restEnd = previousRecord ? currentStart : null;
        analysisResults.push({ record: currentRecord, rest: restAnalysis, drive: driveAnalysis, isSplit: currentRecord.isSplitRest, isNoteDay: false, restStart, restEnd });
    }
    analysisResults = analysisResults.reverse();
    window.lastTachographAnalysis = analysisResults;
    if (typeof window.renderTachographViolationsCard === 'function') {
      try { window.renderTachographViolationsCard(); } catch (_) {}
    }
    renderTachographAnalysisPage(options);
  }

  function createAvailableIcon(number, size = 45) { 
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" stroke-width="6" stroke="#16a34a" fill="#f0fdf4" /><text x="50" y="50" font-family="Arial" font-size="45" font-weight="bold" fill="#15803d" text-anchor="middle" dy=".3em">${number}</text></svg>`; 
  }
  
  function createUsedIcon(number, size = 45) { 
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" stroke-width="6" stroke="#ef4444" fill="#fef2f2" /><text x="50" y="50" font-family="Arial" font-size="45" font-weight="bold" fill="#dc2626" text-anchor="middle" dy=".3em">${number}</text><line x1="20" y1="20" x2="80" y2="80" stroke="#b91c1c" stroke-width="8" stroke-linecap="round" /></svg>`; 
  }

  // ÚJ FÜGGVÉNY: Sárga (pending) ikon
  function createPendingIcon(number, size = 45) { 
    // Elegánsabb sárga jelzés: szaggatott gyűrű, extra piktogram nélkül
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" stroke-width="6" stroke="#eab308" fill="#fefce8" stroke-dasharray="10 6" />
        <circle cx="50" cy="50" r="36" stroke-width="2" stroke="#ca8a04" fill="none" opacity="0.35" />
        <text x="50" y="50" font-family="Arial" font-size="45" font-weight="bold" fill="#ca8a04" text-anchor="middle" dy=".3em">${number}</text>
      </svg>`; 
  }

  function renderTachoHelperCards() {
    const container = document.getElementById('tacho-helper-display');
    if (!container) return;
    const effectiveTier = (typeof window.getEffectiveSubscriptionTier === 'function')
      ? window.getEffectiveSubscriptionTier()
      : 'free';
    if (effectiveTier === 'free') {
      container.innerHTML = '';
      return;
    }
    const i18n = translations[currentLang];
    let activeShift = null;
    try {
      activeShift = window.activeShift || JSON.parse(localStorage.getItem('activeShift') || 'null');
    } catch (_) {
      activeShift = window.activeShift || null;
    }
    // Ugyanaz a rekordforrás, mint a heti státusz kártyánál – eltérés elkerülése (9h elérhetőség).
    const recordsToUse = (Array.isArray(records) && records.length > 0) ? records : demoRecords;
    const status = getTachographStatus(recordsToUse);
    const teamMaxHours = (typeof window.MAX_TEAM_SHIFT_HOURS === 'number') ? window.MAX_TEAM_SHIFT_HOURS : 21;
    const hasSingleReducedAllowance = !status.usesTeamDailyRestRules
      && ((Number.isFinite(status.remainingRests9h) && status.remainingRests9h > 0) || status.pendingReducedRest > 0);

    if (activeShift) {
        const startDate = new Date(`${activeShift.date}T${activeShift.startTime}`);
        let htmlContent = '';
        const activeIsTeam = typeof window.isTeamDrivingMode === 'function'
          ? window.isTeamDrivingMode(activeShift)
          : activeShift.drivingMode === 'team';
        
        if (activeIsTeam) {
            const latestRestStart9h = new Date(startDate.getTime() + teamMaxHours * 60 * 60 * 1000);
            htmlContent = `<div class="bg-green-50 dark:bg-green-900/50 p-3 rounded-lg border-2 border-green-500"><span class="tag4k">4K</span><h3 class="font-semibold text-green-800 dark:text-green-200 text-base mt-2">${i18n.latestRestStartTitle}</h3><div class="text-sm"><strong>${i18n.fourHandsRestLabel}</strong> <div class="font-bold text-lg text-green-600 dark:text-green-300">${formatDateTime(latestRestStart9h)}</div></div><p class="text-xs text-green-700 dark:text-green-300 mt-2">${i18n.fourHandsMaxShiftInfo}</p></div>`;
        } else if (hasSingleReducedAllowance) {
            const latestRestStart11h = new Date(startDate.getTime() + 13 * 60 * 60 * 1000);
            const latestRestStart9h = new Date(startDate.getTime() + 15 * 60 * 60 * 1000);
            htmlContent = `<div class="bg-indigo-50 dark:bg-indigo-900/50 p-3 rounded-lg"><h3 class="font-semibold text-indigo-800 dark:text-indigo-200 text-base">${i18n.latestRestStartTitle}</h3><div class="text-sm"><strong>${i18n.with11hRestLatest}</strong> <div class="font-bold text-lg">${formatDateTime(latestRestStart11h)}</div></div><div class="text-sm"><strong>${i18n.with9hRestLatest}</strong> <div class="font-bold text-lg text-indigo-600 dark:text-indigo-300">${formatDateTime(latestRestStart9h)}</div></div></div>`;
        } else {
            const latestRestStart11h = new Date(startDate.getTime() + 13 * 60 * 60 * 1000);
            htmlContent = `<div class="bg-yellow-50 dark:bg-yellow-900/50 p-3 rounded-lg"><h3 class="font-semibold text-yellow-800 dark:text-yellow-200 text-base">${i18n.latestRestStartTitle}</h3><div class="text-sm"><strong>${i18n.with11hRestLatest}</strong> <div class="font-bold text-lg">${formatDateTime(latestRestStart11h)}</div></div><p class="text-sm text-red-600 dark:text-red-400 font-semibold p-2 bg-red-100 dark:bg-red-900/50 rounded mt-2">${i18n.noMoreReducedRestsWarning}</p></div>`;
        }
        container.innerHTML = htmlContent;
    } else {
        const lastRecord = getLatestRecord();
        if (!lastRecord || !lastRecord.endTime) { container.innerHTML = ''; return; }
        const endDateStr = lastRecord.endDate || lastRecord.date;
        const endDate = new Date(`${endDateStr}T${lastRecord.endTime}`);
        let htmlContent = '';
        const lastIsTeam = typeof window.isTeamDrivingMode === 'function'
          ? window.isTeamDrivingMode(lastRecord)
          : lastRecord.drivingMode === 'team';
        
        if (lastIsTeam) {
            const startTime9h = new Date(endDate.getTime() + 9 * 60 * 60 * 1000);
            htmlContent = `<div class="bg-green-50 dark:bg-green-900/50 p-3 rounded-lg border-2 border-green-500"><span class="tag4k">4K</span><h3 class="font-semibold text-green-800 dark:text-green-200 text-base mt-2">${i18n.earliestStartTitle}</h3><div class="text-sm"><strong>${i18n.fourHandsRestLabel}</strong> <div class="font-bold text-lg text-green-600 dark:text-green-300">${formatDateTime(startTime9h)}</div></div><p class="text-xs text-green-700 dark:text-green-300 mt-2">${i18n.fourHandsMaxShiftInfo}</p></div>`;
        } else if (hasSingleReducedAllowance) {
            const startTime11h = new Date(endDate.getTime() + 11 * 60 * 60 * 1000);
            const startTime9h = new Date(endDate.getTime() + 9 * 60 * 60 * 1000);
            htmlContent = `<div class="bg-indigo-50 dark:bg-indigo-900/50 p-3 rounded-lg"><h3 class="font-semibold text-indigo-800 dark:text-indigo-200 text-base">${i18n.earliestStartTitle}</h3><div class="text-sm"><strong>${i18n.with9hRest}</strong> ${i18n.reducedLabel} <div class="font-bold text-lg text-indigo-600 dark:text-indigo-300">${formatDateTime(startTime9h)}</div></div><div class="text-sm"><strong>${i18n.with11hRest}</strong> ${i18n.regularLabel} <div class="font-bold text-lg">${formatDateTime(startTime11h)}</div></div><p class="text-xs text-gray-500 italic pt-2 mt-2 border-t dark:border-gray-700">${i18n.earliestStartWarning}</p></div>`;
        } else {
            const startTime11h = new Date(endDate.getTime() + 11 * 60 * 60 * 1000);
            htmlContent = `<div class="bg-yellow-50 dark:bg-yellow-900/50 p-3 rounded-lg"><h3 class="font-semibold text-yellow-800 dark:text-yellow-200 text-base">${i18n.earliestStartTitle}</h3><p class="text-sm mt-1">${i18n.noMoreReducedRests}</p><div class="text-sm mt-2"><strong>${i18n.with11hRest}</strong> ${i18n.regularLabel} <div class="font-bold text-lg">${formatDateTime(startTime11h)}</div></div><p class="text-xs text-gray-500 italic pt-2 mt-2 border-t dark:border-gray-700">${i18n.earliestStartWarning}</p></div>`;
        }
        container.innerHTML = htmlContent;
    }
  }

  async function handleTachographToggle(checkbox, recordId) {
    const recordIndex = records.findIndex(r => r.id === String(recordId));
    if (recordIndex === -1) {
        console.error('Record not found for split rest toggle:', recordId);
        return;
    }

    records[recordIndex].isSplitRest = checkbox.checked;

    try {
        var toggleSaveResult = await saveWorkRecord(records[recordIndex]);
        updateEnhancedToggleVisuals(checkbox);
        renderTachographAnalysis();
        renderTachographStatusCard();
        if (toggleSaveResult && toggleSaveResult.status === 'savedPendingSync' && typeof window.showWorkdaySaveResultAlert === 'function') {
            var i18nToggle = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
            window.showWorkdaySaveResultAlert(toggleSaveResult, i18nToggle);
        }
    } catch (error) {
        console.error('Error saving split rest state:', error);
        checkbox.checked = !checkbox.checked;
        if (typeof window.showSyncFailedAlert === 'function') {
          var i18nTg = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
          window.showSyncFailedAlert(i18nTg, { localDataMayExist: true, context: 'save' });
        } else if (typeof showCustomAlert === 'function') {
          const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
          const prefix = i18n.alertSaveErrorPrefix || 'Error during save:';
          const message = (error && error.message) ? ` ${error.message}` : '';
          showCustomAlert(prefix + message, 'info');
        }
    }
  }

  function debugTachoStatus() {
      const pending = localStorage.getItem('pendingReducedRestUsage') || '0';
      const status = getTachographStatus();
      console.log('=== TACHOGRÁF DEBUG ===');
      console.log('Pending reduced rest usage:', pending);
      console.log('Remaining 9h rests:', status.remainingRests9h);
      console.log('Remaining 10h drives:', status.remainingDrives10h);
      console.log('=======================');
  }

  function setPendingReducedRest(value) {
      localStorage.setItem('pendingReducedRestUsage', String(value));
      renderTachographStatusCard();
      console.log(`Pending reduced rest set to: ${value}`);
  }

  window.isReducedDailyRest = isReducedDailyRest;
  window.renderTachographStatusCard = renderTachographStatusCard;
  window.renderTachoHelperCards = renderTachoHelperCards;
  window.renderTachographAnalysis = renderTachographAnalysis;
  window.renderTachographAnalysisPage = renderTachographAnalysisPage;
  window.changeTachographPage = changeTachographPage;
  window.changeTachographPageSize = changeTachographPageSize;
  window.jumpToTachographPage = jumpToTachographPage;
  window.openTachographPageJumpModal = openTachographPageJumpModal;
  window.closeTachographPageJumpModal = closeTachographPageJumpModal;
  window.handleTachographToggle = handleTachographToggle;
  window.debugTachoStatus = debugTachoStatus;
  window.setPendingReducedRest = setPendingReducedRest;

  // If entitlement already resolved by the time this module loads, paint immediately.
  if (typeof window.isEntitlementResolved === 'function' && window.isEntitlementResolved()) {
    try { renderTachographStatusCard(); } catch (_) {}
    try { renderTachoHelperCards(); } catch (_) {}
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initTachographPageJumpModal);
    } else {
      initTachographPageJumpModal();
    }
  }

})();