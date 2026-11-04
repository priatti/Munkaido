// =======================================================
// ===== DEBUG: Mobilitási kompenzáció – 2026.06.01 / .06 eset ====
// =======================================================
// Csak diagnosztika. Nem módosít Firestore-t, nem javít logikát.
// Futtatás: await debugMobilityCompensationCase()
//           await debugMobilityCompensationCase({ reducedWorkday: '2026-06-01', resolverWorkday: '2026-06-06' })

(function () {
  'use strict';

  const MIN_REST_FOR_RESOLUTION = 9;

  function ts(d) {
    if (!d) return null;
    const x = d instanceof Date ? d : (d.toDate ? d.toDate() : new Date(d));
    return isNaN(x) ? null : x.getTime();
  }

  function iso(d) {
    if (!d) return null;
    const x = d instanceof Date ? d : new Date(d);
    return isNaN(x) ? null : x.toISOString();
  }

  function formatPromptDateHu(d) {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date)) return '';
    return date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function hoursBetween(start, end) {
    if (!start || !end) return null;
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  function minResolutionFromDoc(doc) {
    const compHours = Number(doc.compensationHours) || 0;
    const mode = doc.chainMode === 'mobility_package' ? 'mobility_package' : 'standard';
    if (mode === 'mobility_package') {
      const stored = Number(doc.minResolutionHours);
      if (isFinite(stored) && stored > 0) return { mode, hours: stored, formula: 'minResolutionHours (stored) or comp+45' };
      return { mode, hours: compHours + 45, formula: 'compensationHours + 45' };
    }
    return { mode, hours: compHours + MIN_REST_FOR_RESOLUTION, formula: 'compensationHours + 9 (standard)' };
  }

  function findWorkdayRecord(records, datePrefix) {
    if (!Array.isArray(records)) return null;
    return records.find((r) => {
      if (!r || r.entryType === 'noteDay') return false;
      const d = String(r.date || '');
      return d === datePrefix || d.startsWith(datePrefix);
    }) || null;
  }

  function findPreviousWorkday(records, idx) {
    for (let j = idx - 1; j >= 0; j--) {
      const r = records[j];
      if (r && r.entryType !== 'noteDay' && r.startTime && r.endTime) return r;
    }
    return null;
  }

  function gapBeforeWorkday(records, workday) {
    const sorted = [...records].sort((a, b) => {
      const ta = typeof getRecordSortTime === 'function' ? getRecordSortTime(a) : 0;
      const tb = typeof getRecordSortTime === 'function' ? getRecordSortTime(b) : 0;
      return ta - tb;
    });
    const idx = sorted.indexOf(workday);
    if (idx < 0) return null;
    const prev = findPreviousWorkday(sorted, idx);
    if (!prev || !workday.startTime) return null;
    const prevEnd = new Date(`${prev.endDate || prev.date}T${prev.endTime}`);
    const currStart = new Date(`${workday.date}T${workday.startTime}`);
    if (isNaN(prevEnd) || isNaN(currStart)) return null;
    const durationHours = hoursBetween(prevEnd, currStart);
    return {
      previousRecord: prev,
      workdayRecord: workday,
      restStart: prevEnd,
      restEnd: currStart,
      durationHours,
      durationMinutes: Math.round(durationHours * 60),
      expectedCompId: `comp_${prevEnd.getTime()}`
    };
  }

  function matchBlockByStart(blocks, restStart) {
    if (!restStart || !Array.isArray(blocks)) return null;
    const t = restStart.getTime();
    const tol = 5 * 60 * 1000;
    return blocks.find((b) => {
      const s = b.start instanceof Date ? b.start : new Date(b.start);
      return Math.abs(s.getTime() - t) <= tol;
    }) || null;
  }

  function summarizeDoc(d, id) {
    const data = d.data ? d.data() : d;
    const reducedStart = data.reducedRestStart?.toDate ? data.reducedRestStart.toDate() : (data.reducedRestStart ? new Date(data.reducedRestStart) : null);
    const reducedEnd = data.reducedRestEnd?.toDate ? data.reducedRestEnd.toDate() : (data.reducedRestEnd ? new Date(data.reducedRestEnd) : null);
    const resolvedStart = data.resolvedRestStart?.toDate ? data.resolvedRestStart.toDate() : (data.resolvedRestStart ? new Date(data.resolvedRestStart) : null);
    const resolvedEnd = data.resolvedRestEnd?.toDate ? data.resolvedRestEnd.toDate() : (data.resolvedRestEnd ? new Date(data.resolvedRestEnd) : null);
    const triggerStart = data.chainTriggerStart?.toDate ? data.chainTriggerStart.toDate() : (data.chainTriggerStart ? new Date(data.chainTriggerStart) : null);
    const thr = minResolutionFromDoc(data);
    return {
      docId: id || d.id,
      chainMode: data.chainMode == null ? '(missing → standard)' : data.chainMode,
      compensationHours: Number(data.compensationHours),
      minResolutionHours: data.minResolutionHours,
      minResolutionEffective: thr.hours,
      minResolutionFormula: thr.formula,
      resolved: !!data.resolved,
      resolvedByWeeklyRest: !!data.resolvedByWeeklyRest,
      resolvedRestStart: iso(resolvedStart),
      resolvedRestEnd: iso(resolvedEnd),
      reducedRestStart: iso(reducedStart),
      reducedRestEnd: iso(reducedEnd),
      reducedRestDurationHours: Number(data.reducedRestDurationHours),
      chainTriggerStart: iso(triggerStart),
      chainTriggerStartMs: ts(triggerStart),
      previousApplied: data.previousApplied,
      decidedAt: data.decidedAt,
      updatedAt: data.updatedAt
    };
  }

  function getFirestore() {
    try {
      if (typeof db !== 'undefined' && db) return db;
      if (typeof firebase !== 'undefined' && firebase.firestore) return firebase.firestore();
    } catch (_) {}
    return null;
  }

  async function loadAllCompensationDocs() {
    const uid = window.currentUser?.uid;
    const firestore = getFirestore();
    if (!uid || !firestore) return { error: 'no user or firestore', docs: [] };
    const snap = await firestore.collection('users').doc(uid).collection('compensations').get();
    return {
      docs: snap.docs.map((doc) => summarizeDoc(doc, doc.id))
    };
  }

  async function loadMobilityDecisions() {
    const uid = window.currentUser?.uid;
    const firestore = getFirestore();
    if (!uid || !firestore) return {};
    const doc = await firestore.collection('users').doc(uid).collection('settings').doc('config').get();
    if (!doc.exists) return {};
    const mp = (doc.data().weeklyRest || {}).mobilityPackage || {};
    return mp.decisions || {};
  }

  function evaluateResolverUi(resolverGap, docSummary, mobilityClass) {
    const blockHours = resolverGap.durationHours;
    const thr = docSummary
      ? { hours: docSummary.minResolutionEffective, mode: docSummary.chainMode === 'mobility_package' ? 'mobility_package' : 'standard', formula: docSummary.minResolutionFormula }
      : minResolutionFromDoc({ chainMode: 'standard', compensationHours: 45 - 30.5833 });

    const mobility = docSummary && docSummary.chainMode === 'mobility_package';
    const tryResolveWouldPass = blockHours >= thr.hours && (!mobility || blockHours >= 45);
    const reverifyWouldKeep = docSummary && docSummary.resolved && blockHours >= thr.hours && (!mobility || blockHours >= 45);

    return {
      blockDurationHours: blockHours,
      blockDurationMinutes: resolverGap.durationMinutes,
      thresholdMode: thr.mode,
      thresholdHours: thr.hours,
      thresholdFormula: thr.formula,
      mobilityPackageMin: mobility ? thr.hours : null,
      standardMinWouldBe: docSummary ? (Number(docSummary.compensationHours) || 0) + MIN_REST_FOR_RESOLUTION : null,
      tryResolveCompensations_wouldResolve: tryResolveWouldPass,
      reverifyResolvedCompensations_wouldKeepResolved: reverifyWouldKeep,
      mobilityClassification: mobilityClass || null,
      mobilitySaysInsufficient: mobilityClass && (mobilityClass.role === 'WEEKLY_INSUFFICIENT' || mobilityClass.resolutionOutcome === 'WEEKLY_INSUFFICIENT'),
      mobilitySaysResolved: mobilityClass && (mobilityClass.role === 'COMP_RESOLVED' || mobilityClass.resolutionOutcome === 'RESOLVED')
    };
  }

  /**
   * @param {object} opts - { reducedWorkday: '2026-06-01', resolverWorkday: '2026-06-06' }
   */
  async function debugMobilityCompensationCase(opts) {
    const options = opts || {};
    const reducedWorkdayDate = options.reducedWorkday || '2026-06-01';
    const resolverWorkdayDate = options.resolverWorkday || '2026-06-06';

    console.group('[GuriGO DEBUG] Mobilitási kompenzáció – ' + reducedWorkdayDate + ' / ' + resolverWorkdayDate);

    const report = {
      meta: {
        reducedWorkdayDate,
        resolverWorkdayDate,
        generatedAt: new Date().toISOString(),
        bundleHint: 'v6.05.20+ debugMobilityCompensationCase'
      },
      gaps: {},
      compensationDoc: null,
      allCompensationDocs: [],
      mobility: {},
      resolverAnalysis: {},
      uiBadge: {},
      renderPath: {},
      verdict: []
    };

    const records = Array.isArray(window.records) ? window.records : [];
    if (!records.length) {
      console.warn('Nincs window.records');
      report.verdict.push('NO_RECORDS');
      console.log(report);
      console.groupEnd();
      return report;
    }

    const reducedWd = findWorkdayRecord(records, reducedWorkdayDate);
    const resolverWd = findWorkdayRecord(records, resolverWorkdayDate);
    report.gaps.reduced = reducedWd ? gapBeforeWorkday(records, reducedWd) : null;
    report.gaps.resolver = resolverWd ? gapBeforeWorkday(records, resolverWd) : null;

    if (!report.gaps.reduced) {
      console.warn('Nem található gap a ' + reducedWorkdayDate + ' munkanaphoz');
      report.verdict.push('REDUCED_GAP_NOT_FOUND');
    }
    if (!report.gaps.resolver) {
      console.warn('Nem található gap a ' + resolverWorkdayDate + ' munkanaphoz');
      report.verdict.push('RESOLVER_GAP_NOT_FOUND');
    }

    let blocks = [];
    try {
      if (typeof window.getWeeklyRestBlocksFromTachograph === 'function') {
        blocks = window.getWeeklyRestBlocksFromTachograph(records) || [];
      }
    } catch (e) {
      report.blocksError = String(e);
    }
    report.weeklyRestBlockCount = blocks.length;

    if (typeof window.refreshMobilityPackageDecisions === 'function') {
      try { await window.refreshMobilityPackageDecisions(); } catch (e) { report.mobility.refreshDecisionsError = String(e); }
    }
    let mobilityEval = null;
    if (typeof window.evaluateMobilityPackageChains === 'function') {
      mobilityEval = window.evaluateMobilityPackageChains(blocks);
    }
    report.mobility.decisions = await loadMobilityDecisions();
    report.mobility.compensationBlocks = (mobilityEval && mobilityEval.mobilityCompensationBlocks) || [];
    report.mobility.sequences = (mobilityEval && mobilityEval.sequences) || [];
    report.mobility.exemptRestStarts = (mobilityEval && mobilityEval.exemptRestStarts) || [];
    report.mobility.skippedMobilityTriggers = (mobilityEval && mobilityEval.skippedMobilityTriggers) || [];

    if (report.gaps.reduced && report.gaps.reduced.restStart) {
      const startMs = report.gaps.reduced.restStart.getTime();
      report.mobility.classificationReduced = mobilityEval && mobilityEval.classificationsByStart
        ? mobilityEval.classificationsByStart[startMs] : null;
      report.mobility.isInMobilityCompBlocks = report.mobility.compensationBlocks.some((b) => {
        const s = b.start instanceof Date ? b.start : new Date(b.start);
        return Math.abs(s.getTime() - startMs) < 60000;
      });
    }

    const compLoad = await loadAllCompensationDocs();
    report.allCompensationDocs = compLoad.docs || [];
    if (compLoad.error) report.compLoadError = compLoad.error;

    const expectedId = report.gaps.reduced && report.gaps.reduced.expectedCompId;
    report.compensationDoc = expectedId
      ? report.allCompensationDocs.find((d) => d.docId === expectedId) || null
      : null;

    if (!report.compensationDoc && report.gaps.reduced) {
      const rs = report.gaps.reduced.restStart.getTime();
      report.compensationDoc = report.allCompensationDocs.find((d) => {
        const ds = d.reducedRestStart ? new Date(d.reducedRestStart).getTime() : null;
        return ds != null && Math.abs(ds - rs) < 5 * 60 * 1000;
      }) || null;
      if (report.compensationDoc) report.compensationDocMatchedBy = 'reducedRestStart tolerance';
    }

    if (!report.compensationDoc) {
      report.verdict.push('COMP_DOC_NOT_FOUND');
    } else {
      console.log('1–2. Compensation doc (06.01 csökkentett heti):', report.compensationDoc);
    }

    let mobilityClassResolver = null;
    if (report.gaps.resolver && report.gaps.resolver.restStart && mobilityEval) {
      const rms = report.gaps.resolver.restStart.getTime();
      mobilityClassResolver = mobilityEval.classificationsByStart ? mobilityEval.classificationsByStart[rms] : null;
      if (typeof window.getMobilityRestClassification === 'function') {
        report.mobility.classificationResolverViaApi = window.getMobilityRestClassification(rms);
      }
    }

    if (report.gaps.resolver && report.compensationDoc) {
      report.resolverAnalysis = evaluateResolverUi(
        report.gaps.resolver,
        report.compensationDoc,
        mobilityClassResolver
      );
      report.resolverAnalysis.decisionFunctions = {
        firestoreResolve: 'tryResolveCompensations() in weeklyRestCompensation.js',
        firestoreReverify: 'reverifyResolvedCompensations() in weeklyRestCompensation.js',
        mobilityClassification: 'computeMobilityEvaluation() in mobilityPackageWeeklyRest.js',
        mainBadge: 'classifyRestGap() → applyMobilityToRestGap() in tachograph.js',
        notUsedForResolvedBadge: 'applyMobilityToRestGap does NOT drive the green "visszapótlás rendezve" row'
      };
      console.log('3. 06.06 pihenő – resolved döntés elemzés:', report.resolverAnalysis);
    }

    report.renderPath = {
      file: 'js/features/tachograph.js',
      function: 'renderTachographAnalysis()',
      compensationRow: 'getResolvedCompensationsForRest(restStart, restEnd)',
      compensationRowLines: '957–964',
      dataSource: 'loadWeeklyRestCompensationResolved() → Firestore where resolved==true → cachedResolvedByRest',
      mainBadge: 'classifyRestGap() → applyMobilityToRestGap() or classifyRest()',
      labelKey: 'i18n.compensationResolved → "visszapótlás rendezve"'
    };
    console.log('4. UI render útvonal:', report.renderPath);

    if (typeof window.loadWeeklyRestCompensationResolved === 'function') {
      try { await window.loadWeeklyRestCompensationResolved(); } catch (e) { report.uiBadge.loadError = String(e); }
    }
    if (report.gaps.resolver && typeof window.getResolvedCompensationsForRest === 'function') {
      const uiResolved = window.getResolvedCompensationsForRest(
        report.gaps.resolver.restStart,
        report.gaps.resolver.restEnd
      );
      report.uiBadge.getResolvedCompensationsForRest = uiResolved;
      report.uiBadge.wouldShowGreenRow = Array.isArray(uiResolved) && uiResolved.length > 0;
      const totalH = (uiResolved || []).reduce((s, c) => s + (Number(c.compensationHours) || 0), 0);
      report.uiBadge.displayedHours = totalH;
      console.log('4b. UI cache (getResolvedCompensationsForRest):', report.uiBadge);
    }

    // --- Verdict ---
    const doc = report.compensationDoc;
    const uiShows = report.uiBadge.wouldShowGreenRow;
    const mobClass = mobilityClassResolver;
    const resolverH = report.gaps.resolver && report.gaps.resolver.durationHours;
    const mobMin = doc && doc.chainMode === 'mobility_package' ? doc.minResolutionEffective : null;

    if (doc && doc.chainMode !== 'mobility_package') {
      report.verdict.push('FIRESTORE_CHAINMODE_NOT_MOBILITY (doc: ' + doc.chainMode + ')');
    }
    if (doc && doc.resolved === true && mobMin != null && resolverH < mobMin) {
      report.verdict.push('FIRESTORE_RESOLVED_TRUE_BUT_MOBILITY_THRESHOLD_FAILS');
    }
    if (uiShows && doc && doc.resolved !== true) {
      report.verdict.push('UI_CACHE_STALE_OR_MISMATCH (UI shows resolved, Firestore resolved=false)');
    }
    if (uiShows && doc && doc.resolved === true && doc.chainMode !== 'mobility_package') {
      report.verdict.push('UI_SHOWS_STANDARD_RESOLVED (Firestore standard/min+9; UI ignores chainMode)');
    }
    if (!report.mobility.isInMobilityCompBlocks && report.mobility.decisions && Object.keys(report.mobility.decisions).length) {
      report.verdict.push('CLASSIFICATION_NOT_REDUCED_WEEKLY (v2: not in mobilityCompensationBlocks)');
    }
    if (mobClass && mobClass.role === 'WEEKLY_INSUFFICIENT' && uiShows) {
      report.verdict.push('UI_BADGE_CONTRADICTS_MOBILITY_CLASSIFICATION');
    }
    if (report.verdict.length === 0) {
      report.verdict.push('NO_OBVIOUS_MISMATCH – nézd a részletes reportot');
    }

    console.log('5. Összegző verdict:', report.verdict);
    console.log('Full report object → window.__lastMobilityCompDebug', report);
    window.__lastMobilityCompDebug = report;
    console.groupEnd();
    return report;
  }

  const HOURS_24 = 24;
  const HOURS_45 = 45;
  const HOURS_90 = 90;
  const WINDOW_HOURS = typeof window.MOBILITY_WINDOW_HOURS === 'number' ? window.MOBILITY_WINDOW_HOURS : 6 * 24;

  function blockStartMs(block) {
    const s = block && block.start;
    const d = s instanceof Date ? s : new Date(s);
    return isNaN(d) ? null : d.getTime();
  }

  function blockEndDate(block) {
    const e = block && block.end;
    const d = e instanceof Date ? e : new Date(e);
    return isNaN(d) ? null : d;
  }

  function durationHoursOf(block) {
    const h = Number(block && block.durationHours);
    return isFinite(h) ? h : 0;
  }

  function spansTwoCalendarWeeks(block) {
    if (typeof window.spansTwoCalendarWeeks === 'function') {
      return window.spansTwoCalendarWeeks(block);
    }
    return false;
  }

  function isLongRest90Plus(block) {
    return durationHoursOf(block) >= HOURS_90 && spansTwoCalendarWeeks(block);
  }

  function maxMobilityTriggerGapHours() {
    return typeof window.MAX_MOBILITY_TRIGGER_GAP_HOURS === 'number'
      ? window.MAX_MOBILITY_TRIGGER_GAP_HOURS
      : 14 * 24;
  }

  function isValidMobilityTriggerBlock(block) {
    if (typeof window.isValidMobilityTrigger === 'function') {
      return window.isValidMobilityTrigger(block);
    }
    return isLongRest90Plus(block) && durationHoursOf(block) <= maxMobilityTriggerGapHours();
  }

  function isSuspiciousLongGapBlock(block) {
    if (typeof window.isSuspiciousLongGap === 'function') {
      return window.isSuspiciousLongGap(block);
    }
    return isLongRest90Plus(block) && durationHoursOf(block) > maxMobilityTriggerGapHours();
  }

  function windowEndFromTriggerEnd(triggerEnd) {
    const te = triggerEnd instanceof Date ? triggerEnd : new Date(triggerEnd);
    return new Date(te.getTime() + WINDOW_HOURS * 60 * 60 * 1000);
  }

  function expireWindowPhasesTrace(sequences, blockStartMs) {
    for (const seq of sequences) {
      if (seq.phase !== 'awaiting_24h_in_window' || !seq.windowEnd) continue;
      const we = seq.windowEnd instanceof Date ? seq.windowEnd.getTime() : new Date(seq.windowEnd).getTime();
      if (blockStartMs >= we) {
        seq.phase = 'window_expired';
        seq.doneReason = 'WINDOW_EXPIRED_NO_24H';
      }
    }
  }

  function isIn24hWindowTrace(seq, blockStartMs) {
    if (!seq || !seq.windowEnd || blockStartMs == null) return false;
    const we = seq.windowEnd instanceof Date ? seq.windowEnd.getTime() : new Date(seq.windowEnd).getTime();
    const te = seq.triggerEnd instanceof Date ? seq.triggerEnd.getTime() : new Date(seq.triggerEnd).getTime();
    return blockStartMs >= te && blockStartMs < we;
  }

  function findSequenceForBlockTrace(sequences, block) {
    const start = block.start instanceof Date ? block.start : new Date(block.start);
    if (isNaN(start)) return { seq: null, matchedPhase: null, matchedAfter: null };
    const startMs = start.getTime();
    const active = sequences.filter((s) => s.phase !== 'closed' && s.phase !== 'window_expired');

    const resolving = active.filter((s) => s.phase === 'resolving' && s.debt);
    resolving.sort((a, b) => (a.debt.reducedStart || 0) - (b.debt.reducedStart || 0));
    for (const seq of resolving) {
      if (seq.debt.reducedEnd != null && startMs > seq.debt.reducedEnd) {
        return { seq, matchedPhase: 'resolving', matchedAfter: new Date(seq.debt.reducedEnd) };
      }
    }
    for (const seq of active) {
      if (seq.phase !== 'awaiting_reduced_weekly' || seq.rest24hEnd == null) continue;
      if (startMs >= seq.rest24hEnd) {
        return { seq, matchedPhase: 'awaiting_reduced_weekly', matchedAfter: new Date(seq.rest24hEnd) };
      }
    }
    for (const seq of active) {
      if (seq.phase !== 'awaiting_24h_in_window' || !seq.triggerEnd) continue;
      const te = seq.triggerEnd instanceof Date ? seq.triggerEnd.getTime() : new Date(seq.triggerEnd).getTime();
      if (startMs >= te) {
        return { seq, matchedPhase: 'awaiting_24h_in_window', matchedAfter: seq.triggerEnd };
      }
    }
    return { seq: null, matchedPhase: null, matchedAfter: null };
  }

  function cloneSeq(seq) {
    if (!seq) return null;
    return {
      triggerId: seq.triggerId,
      triggerEnd: seq.triggerEnd ? new Date(seq.triggerEnd) : null,
      windowEnd: seq.windowEnd ? new Date(seq.windowEnd) : null,
      phase: seq.phase,
      doneReason: seq.doneReason || null,
      rest24hEnd: seq.rest24hEnd != null ? new Date(seq.rest24hEnd) : null,
      debt: seq.debt ? { ...seq.debt } : null
    };
  }

  /** Cél blokk előtti utolsó érvényes mobilitási trigger (isValidMobilityTrigger, nem phantom gap). */
  function findNearestValidMobilityTriggerBefore(chronological, blockStart) {
    if (!blockStart) return null;
    const targetStartMs = blockStart instanceof Date ? blockStart.getTime() : new Date(blockStart).getTime();
    if (!isFinite(targetStartMs)) return null;

    let nearest = null;
    let nearestStartMs = -Infinity;
    for (const block of chronological) {
      if (!isValidMobilityTriggerBlock(block)) continue;
      const tStart = blockStartMs(block);
      if (tStart == null || tStart >= targetStartMs) continue;
      if (tStart > nearestStartMs) {
        nearestStartMs = tStart;
        nearest = block;
      }
    }
    return nearest;
  }

  function findSkippedLongGapsBefore(chronological, blockStart) {
    if (!blockStart) return [];
    const targetStartMs = blockStart instanceof Date ? blockStart.getTime() : new Date(blockStart).getTime();
    if (!isFinite(targetStartMs)) return [];
    const out = [];
    for (const block of chronological) {
      if (!isSuspiciousLongGapBlock(block)) continue;
      const tStart = blockStartMs(block);
      if (tStart == null || tStart >= targetStartMs) continue;
      out.push({
        triggerStart: iso(block.start),
        triggerEnd: iso(block.end),
        triggerStartMs: tStart,
        durationHours: durationHoursOf(block),
        skippedReason: 'SUSPICIOUS_LONG_GAP'
      });
    }
    return out;
  }

  function sequenceForTriggerId(sequences, triggerId) {
    if (triggerId == null || !Array.isArray(sequences)) return null;
    const tid = Number(triggerId);
    return sequences.find((s) => s && Number(s.triggerId) === tid) || null;
  }

  function resolutionModeFromClassification(c) {
    if (!c) return null;
    if (c.role === 'COMP_RESOLVED' || c.resolutionOutcome === 'RESOLVED') return 'RESOLVED';
    if (c.role === 'WEEKLY_INSUFFICIENT' || c.resolutionOutcome === 'WEEKLY_INSUFFICIENT') return 'WEEKLY_INSUFFICIENT';
    if (c.role === 'REST_INSUFFICIENT' || c.resolutionOutcome === 'REST_INSUFFICIENT') return 'REST_INSUFFICIENT';
    if (c.role === 'REDUCED_WEEKLY') return 'REDUCED_WEEKLY_DEBT_OPEN';
    if (c.role === 'REST_24H') return 'REST_24H_IN_WINDOW_NO_DEBT';
    if (c.role === 'WEEKLY_45') return 'WEEKLY_45_NO_DEBT';
    return c.role || null;
  }

  function analyzeMobilityCompBlocksFilterFailure(classification, traceStep, mobilityCompBlocks, targetStartMs) {
    const reasons = [];
    if (!traceStep) {
      reasons.push('BLOCK_NOT_PROCESSED_IN_CHAIN');
      return reasons;
    }
    if (traceStep.skippedReason) {
      reasons.push(traceStep.skippedReason);
    }
    if (traceStep.outcome === 'LONG_REST_90') {
      reasons.push('FILTER_FAIL: block is 90+ trigger, not a slot candidate');
    }
    if (traceStep.outcome === 'SKIPPED_LT_24H') {
      reasons.push('FILTER_FAIL: duration < 24h — not evaluated in mobility chain');
    }
    if (traceStep.outcome === 'NO_SEQUENCE') {
      reasons.push('FILTER_FAIL: findSequenceForBlock() returned null — no active sequence (done / no trigger / start before triggerEnd)');
    }
    if (traceStep.outcome === 'REST_24H_IN_WINDOW') {
      reasons.push('FILTER_FAIL (v2 expected): REST_24H in 6×24 window — exempt, no mobilityCompensationBlocks');
    }
    if (traceStep.outcome === 'WEEKLY_IN_WINDOW') {
      reasons.push('FILTER_FAIL: WEEKLY_45 in window — chain stays open, no comp');
    }
    if (traceStep.outcome === 'WEEKLY_BEFORE_REDUCED') {
      reasons.push('FILTER_FAIL: WEEKLY_45 before reduced — chain stays open');
    }
    if (traceStep.outcome === 'RESOLVING_PHASE') {
      reasons.push('FILTER_FAIL: resolver block — not REDUCED_WEEKLY source');
    }
    if (traceStep.outcome === 'REDUCED_WEEKLY_PUSHED') {
      reasons.push('FILTER_PASS: pushed to mobilityCompensationBlocks');
    }
    const inList = (mobilityCompBlocks || []).some((b) => {
      const s = b.start instanceof Date ? b.start : new Date(b.start);
      return Math.abs(s.getTime() - targetStartMs) < 60000;
    });
    if (traceStep.outcome === 'REDUCED_WEEKLY_PUSHED' && !inList) {
      reasons.push('UNEXPECTED: trace says pushed but block missing from mobilityCompensationBlocks array');
    }
    if (classification && classification.role !== 'REDUCED_WEEKLY') {
      reasons.push('ROLE_NOT_REDUCED_WEEKLY: role=' + classification.role);
    }
    return reasons;
  }

  /**
   * Lánc-trace: miért nincs a blokk a mobilityCompensationBlocks-ban?
   * Futtatás: await debugMobilitySlotClassification('2026-06-01')
   */
  async function debugMobilitySlotClassification(workdayOrOpts) {
    const opts = typeof workdayOrOpts === 'string'
      ? { reducedWorkday: workdayOrOpts }
      : (workdayOrOpts || {});
    const reducedWorkdayDate = opts.reducedWorkday || '2026-06-01';

    console.group('[GuriGO DEBUG] Mobility slot classification – ' + reducedWorkdayDate);

    const report = {
      meta: { reducedWorkdayDate, generatedAt: new Date().toISOString() },
      decisions: {},
      triggers90Plus: [],
      targetGap: null,
      targetBlock: null,
      evaluateMobilityPackageChains: null,
      classification: null,
      slotIndex: null,
      role: null,
      triggerStart: null,
      triggerStartMs: null,
      resolutionMode: null,
      mobilityCompensationBlocks: [],
      sequenceAtTarget: null,
      chainTrace: [],
      filterFailure: [],
      syncPathExplanation: null,
      answers: {},
      nearest90PlusTrigger: null
    };

    const records = Array.isArray(window.records) ? window.records : [];
    const reducedWd = findWorkdayRecord(records, reducedWorkdayDate);
    report.targetGap = reducedWd ? gapBeforeWorkday(records, reducedWd) : null;

    if (typeof window.refreshMobilityPackageDecisions === 'function') {
      await window.refreshMobilityPackageDecisions();
    }
    report.decisions = await loadMobilityDecisions();

    let blocks = [];
    if (typeof window.getWeeklyRestBlocksFromTachograph === 'function') {
      blocks = window.getWeeklyRestBlocksFromTachograph(records) || [];
    }

    const chronological = [...blocks].sort((a, b) => blockStartMs(a) - blockStartMs(b));

    for (const block of chronological) {
      const ms = blockStartMs(block);
      if (ms == null) continue;
      if (!isLongRest90Plus(block)) continue;
      const key = String(ms);
      const dec = report.decisions[key];
      const suspicious = isSuspiciousLongGapBlock(block);
      report.triggers90Plus.push({
        triggerStart: iso(block.start),
        triggerEnd: iso(block.end),
        triggerStartMs: ms,
        decisionKey: key,
        durationHours: durationHoursOf(block),
        spansTwoCalendarWeeks: spansTwoCalendarWeeks(block),
        applied: dec ? dec.applied : null,
        hasDecision: !!dec,
        isValidMobilityTrigger: isValidMobilityTriggerBlock(block),
        skippedReason: suspicious ? 'SUSPICIOUS_LONG_GAP' : null,
        maxMobilityTriggerGapHours: maxMobilityTriggerGapHours(),
        wouldCreateSequence: !suspicious && !!(dec && dec.applied === true)
      });
    }

    if (report.targetGap && report.targetGap.restStart) {
      const tms = report.targetGap.restStart.getTime();
      report.targetBlock = matchBlockByStart(blocks, report.targetGap.restStart) || {
        start: report.targetGap.restStart,
        end: report.targetGap.restEnd,
        durationHours: report.targetGap.durationHours,
        source: 'gapBeforeWorkday (not in weeklyRestBlocks?)'
      };
    }

    const dec = report.decisions;
    const sequences = [];
    const mobilityCompensationBlocks = [];
    const classificationsByStart = {};
    let targetTraceStep = null;

    for (const block of chronological) {
      const startMs = blockStartMs(block);
      const end = blockEndDate(block);
      const h = durationHoursOf(block);
      const step = {
        blockStart: iso(block.start),
        blockEnd: iso(block.end),
        durationHours: h,
        kind: block.kind || null,
        sequencesBefore: sequences.map(cloneSeq),
        isTarget: report.targetGap && report.targetGap.restStart
          && Math.abs(startMs - report.targetGap.restStart.getTime()) < 60000
      };

      if (startMs == null || !end) {
        step.outcome = 'SKIP_INVALID';
        step.skippedReason = 'invalid start/end';
        if (step.isTarget) targetTraceStep = step;
        report.chainTrace.push(step);
        continue;
      }

      expireWindowPhasesTrace(sequences, startMs);

      if (isSuspiciousLongGapBlock(block)) {
        step.outcome = 'SUSPICIOUS_LONG_GAP';
        step.skippedReason = 'SUSPICIOUS_LONG_GAP';
        step.maxMobilityTriggerGapHours = maxMobilityTriggerGapHours();
        if (step.isTarget) targetTraceStep = step;
        report.chainTrace.push(step);
        continue;
      }

      if (isValidMobilityTriggerBlock(block)) {
        const decision = dec[String(startMs)];
        step.outcome = 'LONG_REST_90';
        step.decisionApplied = decision ? decision.applied : null;
        if (decision && decision.applied === true) {
          sequences.push({
            triggerId: startMs,
            triggerEnd: end,
            windowEnd: windowEndFromTriggerEnd(end),
            phase: 'awaiting_24h_in_window',
            rest24hEnd: null,
            debt: null,
            doneReason: null
          });
          step.sequenceAction = 'NEW_SEQUENCE awaiting_24h_in_window';
          step.windowEnd = iso(windowEndFromTriggerEnd(end));
        } else if (!decision) {
          step.sequenceAction = 'NO_DECISION — no sequence';
        } else {
          step.sequenceAction = 'DECISION_NEM — no sequence';
        }
        step.sequencesAfter = sequences.map(cloneSeq);
        if (step.isTarget) targetTraceStep = step;
        report.chainTrace.push(step);
        continue;
      }

      if (h < HOURS_24) {
        step.outcome = 'SKIPPED_LT_24H';
        step.skippedReason = 'h < 24 — mobility chain ignores this block';
        if (step.isTarget) targetTraceStep = step;
        report.chainTrace.push(step);
        continue;
      }

      const match = findSequenceForBlockTrace(sequences, block);
      step.matchedPhase = match.matchedPhase;
      step.matchedAfter = match.matchedAfter ? iso(match.matchedAfter) : null;
      step.matchedTriggerId = match.seq ? match.seq.triggerId : null;
      if (match.seq && match.seq.windowEnd) {
        step.windowEnd = iso(match.seq.windowEnd);
        step.in24hWindow = isIn24hWindowTrace(match.seq, startMs);
      }

      if (!match.seq) {
        step.outcome = 'NO_SEQUENCE';
        step.skippedReason = 'findSequenceForBlock null — closed/expired/no IGEN trigger';
        step.sequencesAfter = sequences.map(cloneSeq);
        if (step.isTarget) targetTraceStep = step;
        report.chainTrace.push(step);
        continue;
      }

      const seq = match.seq;

      if (seq.phase === 'awaiting_24h_in_window') {
        if (h >= HOURS_45) {
          classificationsByStart[startMs] = { role: 'WEEKLY_45', triggerId: seq.triggerId, matchedRule: 'MOBILITY_WEEKLY_IN_WINDOW' };
          step.outcome = 'WEEKLY_IN_WINDOW';
        } else if (h >= HOURS_24 && isIn24hWindowTrace(seq, startMs)) {
          classificationsByStart[startMs] = { role: 'REST_24H', triggerId: seq.triggerId, matchedRule: 'MOBILITY_REST_24H_IN_WINDOW' };
          seq.rest24hEnd = end.getTime();
          seq.phase = 'awaiting_reduced_weekly';
          step.outcome = 'REST_24H_IN_WINDOW';
        } else {
          step.outcome = 'OUTSIDE_WINDOW_OR_UNHANDLED';
        }
        step.sequencesAfter = sequences.map(cloneSeq);
        if (step.isTarget) targetTraceStep = step;
        report.chainTrace.push(step);
        continue;
      }

      if (seq.phase === 'awaiting_reduced_weekly') {
        if (h >= HOURS_45) {
          classificationsByStart[startMs] = { role: 'WEEKLY_45', triggerId: seq.triggerId, matchedRule: 'MOBILITY_WEEKLY_BEFORE_REDUCED' };
          step.outcome = 'WEEKLY_BEFORE_REDUCED';
        } else {
          const compHours = Math.max(0, HOURS_45 - h);
          classificationsByStart[startMs] = {
            role: 'REDUCED_WEEKLY',
            triggerId: seq.triggerId,
            compensationHours: compHours,
            chainMode: 'mobility_package',
            matchedRule: 'MOBILITY_REDUCED_WEEKLY'
          };
          mobilityCompensationBlocks.push({
            start: block.start,
            end: block.end,
            durationHours: h,
            compensationHours: compHours,
            chainTriggerStart: seq.triggerId,
            chainMode: 'mobility_package'
          });
          seq.debt = { hours: compHours, reducedStart: startMs, reducedEnd: end.getTime() };
          seq.phase = 'resolving';
          step.outcome = 'REDUCED_WEEKLY_PUSHED';
          step.pushedToMobilityCompBlocks = true;
        }
        step.sequencesAfter = sequences.map(cloneSeq);
        if (step.isTarget) targetTraceStep = step;
        report.chainTrace.push(step);
        continue;
      }

      if (seq.phase === 'resolving' && seq.debt) {
        const compHours = seq.debt.hours;
        const minResolve = compHours + HOURS_45;
        if (h >= minResolve) {
          classificationsByStart[startMs] = { role: 'COMP_RESOLVED', triggerId: seq.triggerId, resolutionOutcome: 'RESOLVED', matchedRule: 'MOBILITY_COMP_RESOLVED' };
          seq.phase = 'closed';
          seq.doneReason = 'COMP_RESOLVED';
        } else if (h >= HOURS_45) {
          classificationsByStart[startMs] = { role: 'WEEKLY_INSUFFICIENT', triggerId: seq.triggerId, resolutionOutcome: 'WEEKLY_INSUFFICIENT', matchedRule: 'MOBILITY_WEEKLY_INSUFFICIENT' };
        } else {
          classificationsByStart[startMs] = { role: 'REST_INSUFFICIENT', triggerId: seq.triggerId, resolutionOutcome: 'REST_INSUFFICIENT', matchedRule: 'MOBILITY_REST_INSUFFICIENT' };
        }
        step.outcome = 'RESOLVING_PHASE';
        step.minResolveHours = minResolve;
        step.sequencesAfter = sequences.map(cloneSeq);
        if (step.isTarget) targetTraceStep = step;
        report.chainTrace.push(step);
        continue;
      }

      step.outcome = 'UNHANDLED';
      if (step.isTarget) targetTraceStep = step;
      report.chainTrace.push(step);
    }

    let mobilityEval = null;
    if (typeof window.evaluateMobilityPackageChains === 'function') {
      mobilityEval = window.evaluateMobilityPackageChains(blocks);
    }

    report.mobilityCompensationBlocks = (mobilityEval && mobilityEval.mobilityCompensationBlocks) || mobilityCompensationBlocks;
    report.evaluateMobilityPackageChains = {
      mobilityCompensationBlocks: report.mobilityCompensationBlocks,
      sequences: (mobilityEval && mobilityEval.sequences) || sequences.map(cloneSeq),
      exemptRestStarts: (mobilityEval && mobilityEval.exemptRestStarts) || [],
      suppressStandardCompStarts: (mobilityEval && mobilityEval.suppressStandardCompStarts) || [],
      skippedMobilityTriggers: (mobilityEval && mobilityEval.skippedMobilityTriggers) || []
    };
    report.validTriggers90Plus = report.triggers90Plus.filter((t) => t.isValidMobilityTrigger);
    report.skippedTriggers90Plus = report.triggers90Plus.filter((t) => t.skippedReason === 'SUSPICIOUS_LONG_GAP');

    const targetMs = report.targetGap && report.targetGap.restStart
      ? report.targetGap.restStart.getTime() : null;

    if (targetMs != null && mobilityEval && mobilityEval.classificationsByStart) {
      report.classification = mobilityEval.classificationsByStart[targetMs] || classificationsByStart[targetMs] || null;
    } else {
      report.classification = targetMs != null ? (classificationsByStart[targetMs] || null) : null;
    }

    report.slotIndex = report.classification ? report.classification.slot : null;
    report.role = report.classification ? report.classification.role : null;
    report.triggerStartMs = report.classification ? report.classification.triggerId : (targetTraceStep && targetTraceStep.matchedTriggerId);
    report.triggerStart = report.triggerStartMs != null ? iso(new Date(report.triggerStartMs)) : null;
    report.resolutionMode = resolutionModeFromClassification(report.classification);
    report.sequenceAtTarget = targetTraceStep;

    const targetBlockStart = report.targetGap && report.targetGap.restStart;
    const ignoredSuspicious = findSkippedLongGapsBefore(chronological, targetBlockStart);
    const nearestBlock = findNearestValidMobilityTriggerBefore(chronological, targetBlockStart);
    if (nearestBlock && targetBlockStart) {
      const nStart = nearestBlock.start instanceof Date ? nearestBlock.start : new Date(nearestBlock.start);
      const nEnd = nearestBlock.end instanceof Date ? nearestBlock.end : new Date(nearestBlock.end);
      const nStartMs = nStart.getTime();
      const decKey = String(nStartMs);
      const decision = report.decisions[decKey];
      const seqAtTarget = targetTraceStep
        ? sequenceForTriggerId(targetTraceStep.sequencesBefore || [], nStartMs)
        : sequenceForTriggerId(sequences, nStartMs);
      const blockStartGteTriggerEnd = nEnd && targetBlockStart
        ? targetBlockStart.getTime() >= nEnd.getTime()
        : null;

      const wEnd = windowEndFromTriggerEnd(nEnd);
      report.nearest90PlusTrigger = {
        source: 'findNearestValidMobilityTriggerBefore (isValidMobilityTrigger)',
        isValidMobilityTrigger: true,
        ignoredSuspiciousGapsBeforeTarget: ignoredSuspicious,
        triggerStart: iso(nStart),
        triggerEnd: iso(nEnd),
        windowEnd: iso(wEnd),
        triggerStartMs: nStartMs,
        durationHours: durationHoursOf(nearestBlock),
        spansTwoCalendarWeeks: spansTwoCalendarWeeks(nearestBlock),
        decision: {
          applied: decision ? decision.applied : null,
          hasDecision: !!decision,
          decisionKey: decKey
        },
        sequence: seqAtTarget ? {
          phase: seqAtTarget.phase,
          doneReason: seqAtTarget.doneReason || null,
          slot1End: seqAtTarget.slot1End ? iso(seqAtTarget.slot1End) : null,
          slot2End: seqAtTarget.slot2End ? iso(seqAtTarget.slot2End) : null
        } : {
          phase: null,
          doneReason: 'NO_SEQUENCE_FOR_THIS_TRIGGER_AT_TARGET',
          note: 'trigger után nem jött létre sequence (applied!=true vagy nincs döntés)'
        },
        blockStart: iso(targetBlockStart),
        blockStartGteTriggerEnd: blockStartGteTriggerEnd,
        blockStartGteTriggerEndLabel: blockStartGteTriggerEnd === null
          ? 'n/a'
          : (blockStartGteTriggerEnd ? 'true' : 'false'),
        awaitingSlot1Requires: 'blockStart >= triggerEnd (findSequenceForBlock awaiting_slot1)'
      };
    } else {
      report.nearest90PlusTrigger = {
        error: targetBlockStart ? 'NO_VALID_MOBILITY_TRIGGER_BEFORE_TARGET' : 'TARGET_BLOCK_NOT_FOUND',
        ignoredSuspiciousGapsBeforeTarget: ignoredSuspicious,
        note: 'Phantom SUSPICIOUS_LONG_GAP gap-ok nem számítanak (isValidMobilityTrigger)'
      };
    }

    report.filterFailure = analyzeMobilityCompBlocksFilterFailure(
      report.classification,
      targetTraceStep,
      report.mobilityCompensationBlocks,
      targetMs
    );

    const inMobilityComp = targetMs != null && report.mobilityCompensationBlocks.some((b) => {
      const s = b.start instanceof Date ? b.start : new Date(b.start);
      return Math.abs(s.getTime() - targetMs) < 60000;
    });

    report.syncPathExplanation = inMobilityComp
      ? 'syncCompensations → ensureCompensationExists(mBlock, { chainMode: mobility_package }) → migrateExistingDocToMobility()'
      : 'syncCompensations → standard loop: isReducedWeeklyRest && !exempt && !suppressed → ensureCompensationExists(block, { chainMode: standard }) — migrateExistingDocToMobility NEM hívódik';

    report.answers = {
      q1_whyNotInMobilityCompBlocks: report.filterFailure.join(' | '),
      q2_evaluateMobilityPackageChainsForBlock: report.classification,
      q3_roleAndSlot: { role: report.role, slotIndex: report.slotIndex, resolutionMode: report.resolutionMode },
      q4_whyNotSlot2: report.filterFailure.filter((r) => r.startsWith('FILTER_FAIL') || r.startsWith('ROLE_')).join(' | ') || (inMobilityComp ? 'IS slot2' : 'see sequenceAtTarget.outcome'),
      q5_whyStandardDespiteAppliedTrue: !report.classification
        ? 'Nincs mobilitási classification → standard tachograph classifyRest + standard sync path'
        : (report.classification.slot === 1
          ? 'Mobilitás slot 1-nek osztotta (24h/45h), nem slot 2 csökkentett — nincs mobility_comp doc'
          : (inMobilityComp ? 'Benne van mobilityCompBlocks — sync hibája külön kérdés' : 'Classification van, de nem slot2 reduced push'))
    };

    console.log('=== Legközelebbi ÉRVÉNYES mobilitási trigger (isValidMobilityTrigger) ===');
    console.log(report.nearest90PlusTrigger);
    if (report.skippedTriggers90Plus && report.skippedTriggers90Plus.length) {
      console.log('Kiszűrt phantom gap-ok (SUSPICIOUS_LONG_GAP):', report.skippedTriggers90Plus);
    }
    if (report.evaluateMobilityPackageChains.skippedMobilityTriggers.length) {
      console.log('evaluateMobilityPackageChains skipped:', report.evaluateMobilityPackageChains.skippedMobilityTriggers);
    }
    if (report.nearest90PlusTrigger && report.nearest90PlusTrigger.blockStartGteTriggerEndLabel) {
      console.log(
        'blockStart >= triggerEnd ?',
        report.nearest90PlusTrigger.blockStartGteTriggerEndLabel
      );
    }
    console.log('Firestore decisions:', report.decisions);
    console.log('90+ triggerek + döntés kulcs:', report.triggers90Plus);
    console.table(report.mobilityCompensationBlocks.map((b) => ({
      start: iso(b.start),
      durationHours: b.durationHours,
      compensationHours: b.compensationHours,
      chainTriggerStart: b.chainTriggerStart
    })));
    console.log('06.01 classification:', report.classification);
    console.log('slotIndex:', report.slotIndex, '| role:', report.role, '| resolutionMode:', report.resolutionMode);
    console.log('triggerStart:', report.triggerStart);
    console.log('Target block chain step:', report.sequenceAtTarget);
    console.log('Filter failure reasons:', report.filterFailure);
    console.log('Sync path:', report.syncPathExplanation);
    console.log('Answers:', report.answers);

    window.__lastMobilitySlotDebug = report;
    console.groupEnd();
    return report;
  }

  /**
   * Csak a legközelebbi 90+ trigger + blockStart >= triggerEnd.
   * Futtatás: await debugNearest90Trigger('2026-06-01')
   */
  async function debugNearest90Trigger(workday) {
    const r = await debugMobilitySlotClassification(workday || '2026-06-01');
    const n = r.nearest90PlusTrigger;
    if (!n || n.error) {
      console.warn('[GuriGO] nearest90PlusTrigger:', n);
      return n;
    }
    const summary = {
      triggerStart: n.triggerStart,
      triggerEnd: n.triggerEnd,
      durationHours: n.durationHours,
      'decision.applied': n.decision.applied,
      'sequence.phase': n.sequence.phase,
      'sequence.doneReason': n.sequence.doneReason,
      'blockStart >= triggerEnd': n.blockStartGteTriggerEndLabel
    };
    console.log('[GuriGO] nearest 90+ trigger →', summary);
    return summary;
  }

  async function loadMobilityDecisionsRaw() {
    const uid = window.currentUser?.uid;
    const firestore = getFirestore();
    if (!uid || !firestore) return { error: 'no user', decisions: {} };
    const doc = await firestore.collection('users').doc(uid).collection('settings').doc('config').get();
    if (!doc.exists) return { decisions: {} };
    const mp = (doc.data().weeklyRest || {}).mobilityPackage || {};
    return { decisions: mp.decisions || {} };
  }

  function tsToIso(v) {
    if (!v) return null;
    if (v.toDate) return iso(v.toDate());
    return iso(v);
  }

  function findGapRecordsForBlock(records, block) {
    if (!block || !Array.isArray(records)) return null;
    const bStart = block.start instanceof Date ? block.start.getTime() : new Date(block.start).getTime();
    const bEnd = block.end instanceof Date ? block.end.getTime() : new Date(block.end).getTime();
    const sorted = [...records].sort((a, b) => {
      const ta = typeof getRecordSortTime === 'function' ? getRecordSortTime(a) : 0;
      const tb = typeof getRecordSortTime === 'function' ? getRecordSortTime(b) : 0;
      return ta - tb;
    });
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (!prev || !curr) continue;
      const prevEndDateStr = prev.endDate || prev.date;
      const prevEnd = new Date(`${prevEndDateStr}T${prev.endTime}`);
      const currStart = new Date(`${curr.date}T${curr.startTime}`);
      if (isNaN(prevEnd) || isNaN(currStart)) continue;
      if (Math.abs(prevEnd.getTime() - bStart) < 60000 && Math.abs(currStart.getTime() - bEnd) < 60000) {
        return {
          previousRecord: {
            id: prev.id,
            date: prev.date,
            endDate: prev.endDate || prev.date,
            endTime: prev.endTime,
            entryType: prev.entryType
          },
          currentRecord: {
            id: curr.id,
            date: curr.date,
            startTime: curr.startTime,
            entryType: curr.entryType
          }
        };
      }
    }
    return null;
  }

  /**
   * Mobilitási Csomag kártya – dátumtartomány forrása.
   * Futtatás: await debugMobilityPackageCardTriggers()
   */
  async function debugMobilityPackageCardTriggers() {
    console.group('[GuriGO DEBUG] Mobilitási Csomag kártya – trigger/dátum forrás');

    const report = {
      meta: {
        generatedAt: new Date().toISOString(),
        cardDateSource: 'collectDecidedTriggersForCard() → shouldIncludeDecidedTriggerOnCard + block.start/end (NEM Firestore, NEM sequence)'
      },
      firestoreDecisionKeys: [],
      triggers90Plus: [],
      cardRows: [],
      summary: {}
    };

    const records = Array.isArray(window.records) ? window.records : [];
    if (typeof window.refreshMobilityPackageDecisions === 'function') {
      await window.refreshMobilityPackageDecisions();
    }

    const raw = await loadMobilityDecisionsRaw();
    const rawDec = raw.decisions || {};

    for (const key of Object.keys(rawDec)) {
      const e = rawDec[key] || {};
      report.firestoreDecisionKeys.push({
        decisionKey: key,
        applied: e.applied,
        firestoreTriggerStart: tsToIso(e.triggerStart),
        firestoreTriggerEnd: tsToIso(e.triggerEnd),
        firestoreTriggerDurationHours: e.triggerDurationHours,
        promptVersion: e.promptVersion
      });
    }

    let blocks = [];
    if (typeof window.getWeeklyRestBlocksFromTachograph === 'function') {
      blocks = window.getWeeklyRestBlocksFromTachograph(records) || [];
    }

    const spansTwo = typeof window.spansTwoCalendarWeeks === 'function'
      ? window.spansTwoCalendarWeeks
      : () => false;
    const isLong90 = typeof window.isLongRest90Plus === 'function'
      ? window.isLongRest90Plus
      : (b) => durationHoursOf(b) >= 90 && spansTwo(b);
    const isValidTrigger = typeof window.isValidMobilityTrigger === 'function'
      ? window.isValidMobilityTrigger
      : isValidMobilityTriggerBlock;
    const isSuspicious = typeof window.isSuspiciousLongGap === 'function'
      ? window.isSuspiciousLongGap
      : isSuspiciousLongGapBlock;

    let appliedDecisions = {};
    try {
      if (typeof window.refreshMobilityPackageDecisions === 'function') {
        appliedDecisions = await window.refreshMobilityPackageDecisions();
      }
    } catch (_) {}

    const chrono = [...blocks].sort((a, b) => blockStartMs(a) - blockStartMs(b));
    const triggers90 = [];

    const skippedTriggers = [];

    for (const block of chrono) {
      if (!isLong90(block)) continue;
      const ms = String(blockStartMs(block));
      const gap = findGapRecordsForBlock(records, block);
      const fs = rawDec[ms];
      const suspiciousGap = isSuspicious(block);
      const row = {
        decisionKey: ms,
        decisionApplied: appliedDecisions[ms] ? appliedDecisions[ms].applied : (fs ? fs.applied : null),
        blockTriggerStart: iso(block.start),
        blockTriggerEnd: iso(block.end),
        blockDurationHours: durationHoursOf(block),
        spansTwoCalendarWeeks: spansTwo(block),
        isValidMobilityTrigger: isValidTrigger(block),
        skippedReason: suspiciousGap ? 'SUSPICIOUS_LONG_GAP' : null,
        maxMobilityTriggerGapHours: maxMobilityTriggerGapHours(),
        displayedRangeSource: 'block.start → block.end',
        firestoreTriggerStart: fs ? tsToIso(fs.triggerStart) : null,
        firestoreTriggerEnd: fs ? tsToIso(fs.triggerEnd) : null,
        firestoreMatchesBlock: fs
          ? (tsToIso(fs.triggerStart) === iso(block.start) && tsToIso(fs.triggerEnd) === iso(block.end))
          : null,
        gapRecords: gap
      };
      if (suspiciousGap) {
        skippedTriggers.push(row);
        continue;
      }
      triggers90.push(row);
    }

    report.triggers90Plus = triggers90;
    report.skippedMobilityTriggers = skippedTriggers;
    report.triggerCount90Plus = triggers90.length;
    report.skippedTriggerCount = skippedTriggers.length;
    report.decisionKeyCount = report.firestoreDecisionKeys.length;

    const collectForCard = typeof window.collectDecidedTriggersForCard === 'function'
      ? window.collectDecidedTriggersForCard
      : null;
    if (collectForCard) {
      const prodRows = collectForCard(blocks) || [];
      for (const row of prodRows) {
        const fromStr = formatPromptDateHu(row.triggerStart);
        const toStr = formatPromptDateHu(row.triggerEnd);
        report.cardRows.push({
          decisionKey: row.triggerStartMs,
          decisionApplied: row.applied,
          blockTriggerStart: iso(row.triggerStart),
          blockTriggerEnd: iso(row.triggerEnd),
          blockDurationHours: row.triggerDurationHours,
          isValidMobilityTrigger: true,
          skippedReason: null,
          displayedOnCard: fromStr + ' – ' + toStr,
          status: row.applied ? 'Mobilitási Csomag: Igen' : 'Mobilitási Csomag: Nem',
          cardRowSource: 'collectDecidedTriggersForCard'
        });
      }
    } else {
      for (const row of [...triggers90].reverse()) {
        if (row.decisionApplied !== true && row.decisionApplied !== false) continue;
        const fromStr = row.blockTriggerStart ? new Date(row.blockTriggerStart).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
        const toStr = row.blockTriggerEnd ? new Date(row.blockTriggerEnd).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
        report.cardRows.push({
          ...row,
          displayedOnCard: fromStr + ' – ' + toStr,
          status: row.decisionApplied ? 'Mobilitási Csomag: Igen' : 'Mobilitási Csomag: Nem',
          cardRowSource: 'debug-fallback'
        });
      }
    }

    report.summary = {
      q1_dateRangeFields: 'block.start (= előző rekord vége), block.end (= következő rekord kezdete)',
      q2_notSequence: 'NEM sequence/lánc dátum; NEM windowEnd; kártya NEM a Firestore-ból olvas display-hez',
      q3_triggerCount90Plus: report.triggerCount90Plus,
      q3b_skippedSuspiciousGaps: report.skippedTriggerCount,
      q4_firestoreKeys: report.firestoreDecisionKeys.map((d) => d.decisionKey),
      q5_verdict: report.skippedTriggerCount
        ? 'SUSPICIOUS_LONG_GAP kiszűrve (>' + maxMobilityTriggerGapHours() + 'h) – nem jelenik meg kártyán'
        : 'Dátumok a blokk-detektálásból; ellenőrizd firestoreMatchesBlock',
      maxMobilityTriggerGapHours: maxMobilityTriggerGapHours()
    };

    console.log('Kártya dátum forrás:', report.meta.cardDateSource);
    console.log('90+ trigger szám:', report.triggerCount90Plus);
    console.table(report.cardRows.map((r) => ({
      status: r.status,
      displayedOnCard: r.displayedOnCard,
      decisionKey: r.decisionKey,
      blockHours: Math.round(r.blockDurationHours * 10) / 10,
      firestoreMatchesBlock: r.firestoreMatchesBlock,
      prevRecord: r.gapRecords ? (r.gapRecords.previousRecord.date + ' ' + r.gapRecords.previousRecord.endTime) : null,
      currRecord: r.gapRecords ? (r.gapRecords.currentRecord.date + ' ' + r.gapRecords.currentRecord.startTime) : null
    })));
    console.log('Firestore decision kulcsok (teljes):', report.firestoreDecisionKeys);
    console.log('Kiszűrt SUSPICIOUS_LONG_GAP trigger-ek:', skippedTriggers);
    console.log('Összefoglaló:', report.summary);

    window.__lastMobilityCardDebug = report;
    console.groupEnd();
    return report;
  }

  window.debugMobilityCompensationCase = debugMobilityCompensationCase;
  window.debugMobilitySlotClassification = debugMobilitySlotClassification;
  window.debugNearest90Trigger = debugNearest90Trigger;
  window.debugMobilityPackageCardTriggers = debugMobilityPackageCardTriggers;
})();
