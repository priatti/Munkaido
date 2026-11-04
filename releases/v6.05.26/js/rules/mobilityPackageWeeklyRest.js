// =======================================================
// ===== MOBILITÁSI CSOMAG – HETI PIHENŐ (v2: 6×24 ablak) ====
// =======================================================
// triggerEnd + 144h ablak → első 24–45h = 24 órás; következő 24–45h = csökkentett; comp+45 resolver.
// Csak olvas records/blokkok; döntések: Firestore weeklyRest.mobilityPackage.decisions.

(function () {
  'use strict';

  const HOURS_90 = 90;
  const HOURS_24 = 24;
  const HOURS_45 = 45;
  const WINDOW_HOURS = 6 * 24;
  const MAX_MOBILITY_TRIGGER_GAP_HOURS = 14 * 24;
  const WEEKLY_REST_MINUTES = 45 * 60;
  const PROMPT_VERSION = 2;

  let cachedDecisions = {};
  let cachedEvaluation = null;
  let promptRenderGeneration = 0;
  let editingTriggerMs = null;

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

  /** Blokk tárolt és start→end számított gap órái közül a nagyobb (adathiányos gap védelem). */
  function gapDurationHours(block) {
    const stored = durationHoursOf(block);
    const s = block && block.start;
    const e = block && block.end;
    if (s && e) {
      const start = s instanceof Date ? s : new Date(s);
      const end = e instanceof Date ? e : new Date(e);
      if (!isNaN(start) && !isNaN(end) && end > start) {
        const computed = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (isFinite(computed) && computed > 0) return Math.max(stored, computed);
      }
    }
    return stored;
  }

  /**
   * Két naptári hét érintése: start < hétfő 00:00 < end (GuriGO hétkezdet).
   */
  function spansTwoCalendarWeeks(block) {
    if (!block || !block.start || !block.end) return false;
    const start = block.start instanceof Date ? block.start : new Date(block.start);
    const end = block.end instanceof Date ? block.end : new Date(block.end);
    if (isNaN(start) || isNaN(end) || start >= end) return false;

    const d = new Date(start);
    d.setHours(0, 0, 0, 0);
    while (d <= end) {
      if (d.getDay() === 1) {
        const mondayMidnight = new Date(d);
        if (start < mondayMidnight && end > mondayMidnight) return true;
      }
      d.setDate(d.getDate() + 1);
    }
    return false;
  }

  function isLongRest90Plus(block) {
    if (!block) return false;
    return durationHoursOf(block) >= HOURS_90 && spansTwoCalendarWeeks(block);
  }

  /** Adathiányból képzett óriási gap – nem mobilitási trigger (tachó továbbra is standard út). */
  function isSuspiciousLongGap(block) {
    if (!block || !isLongRest90Plus(block)) return false;
    return gapDurationHours(block) > MAX_MOBILITY_TRIGGER_GAP_HOURS;
  }

  function isValidMobilityTrigger(block) {
    if (!block || !isLongRest90Plus(block)) return false;
    if (isSuspiciousLongGap(block)) return false;
    return gapDurationHours(block) <= MAX_MOBILITY_TRIGGER_GAP_HOURS;
  }

  function blockForTriggerKey(blocks, keyMs) {
    const key = Number(keyMs);
    if (!isFinite(key) || !Array.isArray(blocks)) return null;
    for (const block of blocks) {
      const s = blockStartMs(block);
      if (s != null && s === key) return block;
    }
    return null;
  }

  /** Kártya / collectDecidedTriggers – csak érvényes mobilitási trigger blokkok. */
  function shouldIncludeDecidedTriggerOnCard(block) {
    if (!block) return false;
    if (isSuspiciousLongGap(block)) return false;
    if (!isValidMobilityTrigger(block)) return false;
    if (gapDurationHours(block) > MAX_MOBILITY_TRIGGER_GAP_HOURS) return false;
    return true;
  }

  function normalizeDecisions(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object') return out;
    for (const key of Object.keys(raw)) {
      const entry = raw[key];
      if (!entry || typeof entry !== 'object') continue;
      if (entry.applied !== true && entry.applied !== false) continue;
      out[String(key)] = { applied: entry.applied === true };
    }
    return out;
  }

  async function loadMobilityPackageDecisionsFromFirestore() {
    if (!window.currentUser || typeof db === 'undefined') {
      cachedDecisions = {};
      return cachedDecisions;
    }
    try {
      const doc = await db.collection('users').doc(window.currentUser.uid)
        .collection('settings').doc('config').get();
      if (!doc.exists) {
        cachedDecisions = {};
        return cachedDecisions;
      }
      const data = doc.data() || {};
      const mp = (data.weeklyRest || {}).mobilityPackage || {};
      cachedDecisions = normalizeDecisions(mp.decisions || {});
    } catch (e) {
      try { console.warn('[mobilityPackage] decisions load failed', e); } catch (_) {}
    }
    return cachedDecisions;
  }

  function windowEndFromTriggerEnd(triggerEnd) {
    const te = triggerEnd instanceof Date ? triggerEnd : new Date(triggerEnd);
    return new Date(te.getTime() + WINDOW_HOURS * 60 * 60 * 1000);
  }

  function expireWindowPhases(sequences, blockStartMs) {
    if (blockStartMs == null || !Array.isArray(sequences)) return;
    for (const seq of sequences) {
      if (seq.phase !== 'awaiting_24h_in_window' || !seq.windowEnd) continue;
      const we = seq.windowEnd instanceof Date ? seq.windowEnd.getTime() : new Date(seq.windowEnd).getTime();
      if (blockStartMs >= we) {
        seq.phase = 'window_expired';
        seq.doneReason = 'WINDOW_EXPIRED_NO_24H';
      }
    }
  }

  /**
   * v2: resolving → awaiting_reduced_weekly → awaiting_24h_in_window (nyitott láncok).
   */
  function findSequenceForBlock(sequences, block) {
    const start = block.start instanceof Date ? block.start : new Date(block.start);
    if (isNaN(start)) return null;
    const startMs = start.getTime();

    const active = sequences.filter((s) => s.phase !== 'closed' && s.phase !== 'window_expired');

    const resolving = active.filter((s) => s.phase === 'resolving' && s.debt);
    resolving.sort((a, b) => (a.debt.reducedStart || 0) - (b.debt.reducedStart || 0));
    for (const seq of resolving) {
      const afterMs = seq.debt.reducedEnd;
      if (afterMs != null && startMs > afterMs) return seq;
    }

    for (const seq of active) {
      if (seq.phase !== 'awaiting_reduced_weekly' || seq.rest24hEnd == null) continue;
      const afterMs = seq.rest24hEnd instanceof Date ? seq.rest24hEnd.getTime() : Number(seq.rest24hEnd);
      if (isFinite(afterMs) && startMs >= afterMs) return seq;
    }

    for (const seq of active) {
      if (seq.phase !== 'awaiting_24h_in_window' || !seq.triggerEnd) continue;
      const te = seq.triggerEnd instanceof Date ? seq.triggerEnd.getTime() : new Date(seq.triggerEnd).getTime();
      if (startMs >= te) return seq;
    }

    return null;
  }

  function isIn24hWindow(seq, blockStartMs) {
    if (!seq || seq.windowEnd == null || blockStartMs == null) return false;
    const we = seq.windowEnd instanceof Date ? seq.windowEnd.getTime() : new Date(seq.windowEnd).getTime();
    const te = seq.triggerEnd instanceof Date ? seq.triggerEnd.getTime() : new Date(seq.triggerEnd).getTime();
    return blockStartMs >= te && blockStartMs < we;
  }

  /**
   * v2 mobilitási osztályozás: 6×24 ablak + következő csökkentett + comp+45 resolver.
   */
  function computeMobilityEvaluation(blocks, decisions) {
    const dec = decisions || {};
    const result = {
      classificationsByStart: {},
      exemptRestStarts: [],
      mobilityCompensationBlocks: [],
      suppressStandardCompStarts: [],
      pendingPrompts: [],
      sequences: [],
      skippedMobilityTriggers: []
    };

    if (!Array.isArray(blocks) || blocks.length === 0) {
      cachedEvaluation = result;
      return result;
    }

    const chronological = [...blocks].sort((a, b) => {
      return blockStartMs(a) - blockStartMs(b);
    });

    const sequences = [];

    for (const block of chronological) {
      const startMs = blockStartMs(block);
      const end = blockEndDate(block);
      const h = gapDurationHours(block);
      if (startMs == null || !end) continue;

      expireWindowPhases(sequences, startMs);

      if (isSuspiciousLongGap(block)) {
        result.skippedMobilityTriggers.push({
          startMs,
          triggerStart: block.start,
          triggerEnd: block.end,
          durationHours: h,
          skippedReason: 'SUSPICIOUS_LONG_GAP',
          isValidMobilityTrigger: false,
          maxMobilityTriggerGapHours: MAX_MOBILITY_TRIGGER_GAP_HOURS
        });
        continue;
      }

      if (isValidMobilityTrigger(block)) {
        result.classificationsByStart[startMs] = {
          role: 'LONG_REST_90',
          triggerId: startMs,
          exemptFromCompensation: true,
          generateNewCompensation: false,
          matchedRule: 'LONG_REST_90'
        };

        const decision = dec[String(startMs)];
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
        } else if (!decision) {
          result.pendingPrompts.push({
            triggerStart: block.start,
            triggerEnd: block.end,
            triggerDurationHours: h
          });
        }
        continue;
      }

      if (h < HOURS_24) continue;

      const seq = findSequenceForBlock(sequences, block);
      if (!seq) continue;

      if (seq.phase === 'awaiting_24h_in_window') {
        if (h >= HOURS_45) {
          result.classificationsByStart[startMs] = {
            role: 'WEEKLY_45',
            triggerId: seq.triggerId,
            exemptFromCompensation: true,
            generateNewCompensation: false,
            qualifiesAsWeeklyRest: true,
            matchedRule: 'MOBILITY_WEEKLY_IN_WINDOW'
          };
        } else if (h >= HOURS_24 && isIn24hWindow(seq, startMs)) {
          result.classificationsByStart[startMs] = {
            role: 'REST_24H',
            triggerId: seq.triggerId,
            exemptFromCompensation: true,
            generateNewCompensation: false,
            matchedRule: 'MOBILITY_REST_24H_IN_WINDOW'
          };
          result.exemptRestStarts.push(startMs);
          seq.rest24hEnd = end.getTime();
          seq.phase = 'awaiting_reduced_weekly';
        }
        continue;
      }

      if (seq.phase === 'awaiting_reduced_weekly') {
        if (h >= HOURS_45) {
          result.classificationsByStart[startMs] = {
            role: 'WEEKLY_45',
            triggerId: seq.triggerId,
            exemptFromCompensation: true,
            generateNewCompensation: false,
            qualifiesAsWeeklyRest: true,
            matchedRule: 'MOBILITY_WEEKLY_BEFORE_REDUCED'
          };
        } else {
          const compHours = Math.max(0, HOURS_45 - h);
          result.classificationsByStart[startMs] = {
            role: 'REDUCED_WEEKLY',
            triggerId: seq.triggerId,
            exemptFromCompensation: false,
            generateNewCompensation: true,
            compensationHours: compHours,
            chainMode: 'mobility_package',
            matchedRule: 'MOBILITY_REDUCED_WEEKLY'
          };
          result.mobilityCompensationBlocks.push({
            start: block.start,
            end: block.end,
            durationHours: h,
            compensationHours: compHours,
            chainTriggerStart: seq.triggerId,
            chainMode: 'mobility_package'
          });
          seq.debt = {
            hours: compHours,
            reducedStart: startMs,
            reducedEnd: end.getTime()
          };
          seq.phase = 'resolving';
        }
        continue;
      }

      if (seq.phase === 'resolving' && seq.debt) {
        const compHours = seq.debt.hours;
        const minResolve = compHours + HOURS_45;
        result.suppressStandardCompStarts.push(startMs);

        if (h >= minResolve) {
          result.classificationsByStart[startMs] = {
            role: 'COMP_RESOLVED',
            triggerId: seq.triggerId,
            exemptFromCompensation: true,
            generateNewCompensation: false,
            qualifiesAsWeeklyRest: true,
            resolutionOutcome: 'RESOLVED',
            matchedRule: 'MOBILITY_COMP_RESOLVED'
          };
          seq.phase = 'closed';
          seq.doneReason = 'COMP_RESOLVED';
        } else if (h >= HOURS_45) {
          result.classificationsByStart[startMs] = {
            role: 'WEEKLY_INSUFFICIENT',
            triggerId: seq.triggerId,
            exemptFromCompensation: true,
            generateNewCompensation: false,
            qualifiesAsWeeklyRest: true,
            resolutionOutcome: 'WEEKLY_INSUFFICIENT',
            matchedRule: 'MOBILITY_WEEKLY_INSUFFICIENT'
          };
        } else {
          result.classificationsByStart[startMs] = {
            role: 'REST_INSUFFICIENT',
            triggerId: seq.triggerId,
            exemptFromCompensation: true,
            generateNewCompensation: false,
            qualifiesAsWeeklyRest: false,
            resolutionOutcome: 'REST_INSUFFICIENT',
            matchedRule: 'MOBILITY_REST_INSUFFICIENT'
          };
        }
      }
    }

    result.sequences = sequences;
    cachedEvaluation = result;
    return result;
  }

  function evaluateMobilityPackageChains(blocks, decisions) {
    const dec = decisions != null ? decisions : cachedDecisions;
    return computeMobilityEvaluation(blocks, dec);
  }

  function getMobilityPackageEvaluation() {
    return cachedEvaluation;
  }

  function getMobilityRestClassification(restStartMs) {
    if (restStartMs == null || !cachedEvaluation) return null;
    const key = typeof restStartMs === 'number' ? restStartMs : Number(restStartMs);
    return cachedEvaluation.classificationsByStart[key] || null;
  }

  function getI18n() {
    try {
      if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
        return translations[currentLang] || {};
      }
    } catch (_) {}
    return {};
  }

  function t(key, fallback) {
    const i18n = getI18n();
    const v = i18n[key];
    if (v === undefined || v === null || String(v).trim() === '') return fallback;
    return v;
  }

  /**
   * Badge szöveg + stílus mobilitási osztályozásból (HU fallback — i18n Fázis 3).
   */
  function buildMobilityRestDisplay(classification, i18n, durationMinutes) {
    const i = i18n || getI18n();
    const dur = typeof formatDuration === 'function' ? formatDuration(durationMinutes) : '';
    const durSuffix = dur ? ` (${dur})` : '';

    if (!classification) return null;

    const role = classification.role;
    let labelText = '';
    let colorClass = 'bg-green-700 text-white';
    let inlineStyle = '';
    let matchedRule = classification.matchedRule || 'MOBILITY';
    let isReducedWeeklyRest = false;
    let isWeeklyRest = false;

    switch (role) {
      case 'LONG_REST_90':
        labelText = t('tachoLongRest90Plus', '90+ órás hosszú pihenő');
        colorClass = 'bg-indigo-600 text-white';
        inlineStyle = 'background-color: #4f46e5 !important; color: #ffffff !important;';
        isWeeklyRest = true;
        break;
      case 'REST_24H':
        labelText = t('tacho24hRest', '24 órás pihenő');
        break;
      case 'REDUCED_WEEKLY':
        labelText = t('tachoReducedWeeklyRest', 'Csökkentett heti pihenő');
        isReducedWeeklyRest = true;
        break;
      case 'WEEKLY_45':
        labelText = t('tachoWeeklyRest', 'Heti pihenő');
        isWeeklyRest = true;
        break;
      case 'COMP_RESOLVED':
        labelText = t('mobilityPackageCompensationResolved', 'Visszapótlás rendezve');
        colorClass = 'bg-green-600 text-white';
        inlineStyle = 'background-color: #16a34a !important; color: #ffffff !important;';
        isWeeklyRest = true;
        break;
      case 'WEEKLY_INSUFFICIENT':
        labelText = t('mobilityPackageWeeklyInsufficientForComp', 'Heti pihenő – visszapótláshoz nem elegendő');
        colorClass = 'bg-slate-600 text-white';
        inlineStyle = 'background-color: #475569 !important; color: #ffffff !important;';
        isWeeklyRest = true;
        matchedRule = 'MOBILITY_WEEKLY_INSUFFICIENT';
        break;
      case 'REST_INSUFFICIENT':
        labelText = t('mobilityPackageInsufficientResolver', 'Nem elegendő rendező pihenő');
        colorClass = 'bg-amber-700 text-white';
        inlineStyle = 'background-color: #b45309 !important; color: #ffffff !important;';
        matchedRule = 'MOBILITY_REST_INSUFFICIENT';
        break;
      default:
        return null;
    }

    return {
      label: `${labelText}${durSuffix}`,
      colorClass,
      inlineStyle,
      matchedRule,
      isReducedWeeklyRest,
      isWeeklyRest,
      isIrregularRest: false,
      isInvalidRest: false,
      mobilityRole: role
    };
  }

  /**
   * Rekord-gap pihenő: mobilitás felülírás vagy null (standard classifyRest marad).
   */
  function applyMobilityToRestGap(prevEnd, restDurationMinutes, i18n) {
    if (!prevEnd || !cachedEvaluation) return null;
    const startMs = prevEnd.getTime();
    const mc = cachedEvaluation.classificationsByStart[startMs];
    if (!mc) return null;
    const display = buildMobilityRestDisplay(mc, i18n, restDurationMinutes);
    if (!display) return null;
    return {
      ...display,
      restType: mc.role,
      reducedDailySequenceNumber: 0
    };
  }

  async function refreshMobilityPackageDecisions() {
    await loadMobilityPackageDecisionsFromFirestore();
    return cachedDecisions;
  }

  function getRecordsSorted() {
    const src = (Array.isArray(window.records) && window.records.length > 0)
      ? window.records
      : (typeof demoRecords !== 'undefined' ? demoRecords : []);
    const arr = Array.isArray(src) ? [...src] : [];
    arr.sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
    return arr;
  }

  function getWeeklyRestBlocks() {
    const recordsSorted = getRecordsSorted();
    try {
      if (typeof window.getWeeklyRestBlocksFromTachograph === 'function') {
        return window.getWeeklyRestBlocksFromTachograph(recordsSorted) || [];
      }
    } catch (_) {}
    return [];
  }

  async function refreshMobilityEvaluation(blocks) {
    await refreshMobilityPackageDecisions();
    const blks = blocks || getWeeklyRestBlocks();
    return evaluateMobilityPackageChains(blks, cachedDecisions);
  }

  function escapeHtml(s) {
    if (s == null || s === '') return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatPromptDate(d) {
    if (!d) return '';
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date)) return '';
    try {
      const locale = typeof getCurrentLocale === 'function' ? getCurrentLocale() : 'hu-HU';
      return date.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (_) {
      return date.toLocaleDateString();
    }
  }

  function getMobilityPackageWeekdayShorts() {
    const raw = t('mobilityPackageWeekdayShort', 'V|H|K|Sze|Cs|P|Szo');
    return String(raw).split('|');
  }

  function formatMobilityPackageWeekdayShort(d) {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date)) return '';
    const shorts = getMobilityPackageWeekdayShorts();
    return shorts[date.getDay()] || '';
  }

  function formatMobilityPackageTime(d) {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date)) return '';
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  /** Kártya sor: dátum + nap rövidítés + óó:pp (csak megjelenítés). */
  function formatMobilityPackageDateTime(d) {
    const datePart = formatPromptDate(d);
    if (!datePart) return '';
    const dayPart = formatMobilityPackageWeekdayShort(d);
    const timePart = formatMobilityPackageTime(d);
    return `${datePart}, ${dayPart} ${timePart}`;
  }

  function formatMobilityPackageRestRange(start, end) {
    const fromStr = formatMobilityPackageDateTime(start);
    const toStr = formatMobilityPackageDateTime(end);
    if (!fromStr && !toStr) return '';
    if (!fromStr) return toStr;
    if (!toStr) return fromStr;
    return `${fromStr} → ${toStr}`;
  }

  /** Pihenőhossz perc pontossággal a start→end megjelenítéshez (nem számítási logika). */
  function restDurationMinutesForDisplay(start, end, fallbackHours) {
    const s = start instanceof Date ? start : new Date(start);
    const e = end instanceof Date ? end : new Date(end);
    if (!isNaN(s) && !isNaN(e) && e > s) {
      return Math.round((e.getTime() - s.getTime()) / (1000 * 60));
    }
    const h = Number(fallbackHours);
    return isFinite(h) ? Math.round(h * 60) : 0;
  }

  function formatMobilityPackageRestDurationLine(start, end, fallbackHours) {
    const minutes = restDurationMinutesForDisplay(start, end, fallbackHours);
    const durationStr = typeof formatDuration === 'function'
      ? formatDuration(minutes)
      : String(minutes);
    return t('mobilityPackageRestDuration', 'Pihenő hossza: {duration}')
      .replace('{duration}', durationStr);
  }

  function getLatestPendingPrompt() {
    const evalResult = cachedEvaluation || {};
    const pending = Array.isArray(evalResult.pendingPrompts) ? evalResult.pendingPrompts : [];
    if (!pending.length) return null;
    return pending[pending.length - 1];
  }

  function collectDecidedTriggers(blocks) {
    const dec = cachedDecisions || {};
    const chrono = [...(blocks || [])].sort((a, b) => blockStartMs(a) - blockStartMs(b));
    const rows = [];
    for (const block of chrono) {
      if (!shouldIncludeDecidedTriggerOnCard(block)) continue;
      const ms = String(blockStartMs(block));
      if (ms === 'null' || ms === 'undefined') continue;
      const d = dec[ms];
      if (!d || (d.applied !== true && d.applied !== false)) continue;
      rows.push({
        triggerStartMs: ms,
        triggerStart: block.start,
        triggerEnd: block.end,
        triggerDurationHours: gapDurationHours(block),
        applied: d.applied === true
      });
    }
    return rows.reverse();
  }

  function findSequenceForTrigger(sequences, triggerStartMs) {
    if (!Array.isArray(sequences)) return null;
    const ms = String(triggerStartMs);
    return sequences.find((s) => String(s.triggerId) === ms) || null;
  }

  /**
   * Egy eldöntött trigger még aktuális-e az Overview kártyán.
   * A Mobility Package 6×24 órás ablaka (triggerEnd + WINDOW_HOURS) határozza meg,
   * hogy a döntésnek még van-e aktuális hatása. Ablakon túli, illetve már
   * lezárt/window_expired láncot követő döntés historical, nem jelenik meg.
   */
  function isMobilityTriggerCurrentlyActive(row) {
    const triggerEnd = row.triggerEnd instanceof Date ? row.triggerEnd : new Date(row.triggerEnd);
    if (isNaN(triggerEnd)) return false;

    const now = Date.now();
    const windowEnd = triggerEnd.getTime() + WINDOW_HOURS * 60 * 60 * 1000;
    if (now > windowEnd) return false;

    const seq = findSequenceForTrigger((cachedEvaluation && cachedEvaluation.sequences) || [], row.triggerStartMs);
    if (seq && (seq.phase === 'closed' || seq.phase === 'window_expired')) return false;

    return true;
  }

  /** Áttekintés kártya: csak aktuálisan releváns döntött sor; szerkesztés közben a szerkesztett sor is benne marad. */
  function filterDecidedTriggersForOverview(decided, editingTriggerMs) {
    if (!Array.isArray(decided) || !decided.length) return [];
    const active = decided.filter((r) => isMobilityTriggerCurrentlyActive(r));
    const overview = active.slice(0, 1);
    if (editingTriggerMs) {
      const ms = String(editingTriggerMs);
      if (!overview.some((r) => r.triggerStartMs === ms)) {
        const editingRow = decided.find((r) => r.triggerStartMs === ms);
        if (editingRow) overview.unshift(editingRow);
      }
    }
    return overview;
  }

  function promptEntryFromTriggerRow(row) {
    if (!row) return null;
    return {
      triggerStart: row.triggerStart,
      triggerEnd: row.triggerEnd,
      triggerDurationHours: row.triggerDurationHours
    };
  }

  async function saveMobilityPackageDecision(promptEntry, applied) {
    if (!window.currentUser || typeof db === 'undefined' || !promptEntry) return false;

    const triggerStart = promptEntry.triggerStart instanceof Date
      ? promptEntry.triggerStart
      : new Date(promptEntry.triggerStart);
    const triggerEnd = promptEntry.triggerEnd instanceof Date
      ? promptEntry.triggerEnd
      : new Date(promptEntry.triggerEnd);
    if (isNaN(triggerStart) || isNaN(triggerEnd)) return false;

    const triggerStartMs = String(triggerStart.getTime());
    const durationHours = Number(promptEntry.triggerDurationHours);
    const nowApplied = applied === true;
    const prevEntry = cachedDecisions[triggerStartMs];
    const hadPrevious = prevEntry && (prevEntry.applied === true || prevEntry.applied === false);
    const previousApplied = hadPrevious ? prevEntry.applied : null;
    const appliedChanged = hadPrevious && previousApplied !== nowApplied;
    const isFirstDecision = !hadPrevious;
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    const dotPayload = {
      [`weeklyRest.mobilityPackage.decisions.${triggerStartMs}.applied`]: nowApplied,
      [`weeklyRest.mobilityPackage.decisions.${triggerStartMs}.triggerStart`]: triggerStart,
      [`weeklyRest.mobilityPackage.decisions.${triggerStartMs}.triggerEnd`]: triggerEnd,
      [`weeklyRest.mobilityPackage.decisions.${triggerStartMs}.triggerDurationHours`]: durationHours,
      [`weeklyRest.mobilityPackage.decisions.${triggerStartMs}.updatedAt`]: timestamp,
      [`weeklyRest.mobilityPackage.decisions.${triggerStartMs}.promptVersion`]: PROMPT_VERSION
    };
    if (isFirstDecision) {
      dotPayload[`weeklyRest.mobilityPackage.decisions.${triggerStartMs}.decidedAt`] = timestamp;
    }
    if (appliedChanged) {
      dotPayload[`weeklyRest.mobilityPackage.decisions.${triggerStartMs}.previousApplied`] = previousApplied;
    }

    const nestedEntry = {
      applied: nowApplied,
      triggerStart,
      triggerEnd,
      triggerDurationHours: durationHours,
      updatedAt: timestamp,
      promptVersion: PROMPT_VERSION
    };
    if (isFirstDecision) {
      nestedEntry.decidedAt = timestamp;
    }
    if (appliedChanged) {
      nestedEntry.previousApplied = previousApplied;
    }

    try {
      const docRef = db.collection('users').doc(window.currentUser.uid)
        .collection('settings').doc('config');
      try {
        await docRef.update(dotPayload);
      } catch (e) {
        await docRef.set({
          weeklyRest: {
            mobilityPackage: {
              decisions: {
                [triggerStartMs]: nestedEntry
              }
            }
          }
        }, { merge: true });
      }
      cachedDecisions[triggerStartMs] = { applied: nowApplied };

      if (appliedChanged && previousApplied === true && !nowApplied) {
        if (typeof window.revertMobilityCompensationsForTrigger === 'function') {
          await window.revertMobilityCompensationsForTrigger(triggerStart.getTime());
        }
      }

      editingTriggerMs = null;
      return true;
    } catch (e) {
      try { console.warn('[mobilityPackage] decision save failed', e); } catch (_) {}
      return false;
    }
  }

  async function afterMobilityDecisionSaved() {
    await refreshMobilityEvaluation();
    try {
      if (typeof window.weeklyRestCompensationSync === 'function') {
        await window.weeklyRestCompensationSync({ force: true });
      }
    } catch (_) {}
    try {
      if (typeof renderLiveTabView === 'function') renderLiveTabView();
    } catch (_) {}
    try {
      if (typeof window.renderTachographAnalysis === 'function') {
        await window.renderTachographAnalysis();
      }
    } catch (_) {}
  }

  function ensurePromptCardContainer() {
    const anchor = document.getElementById('live-allowance-display');
    if (!anchor) return null;

    let el = document.getElementById('mobility-package-prompt-card');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'mobility-package-prompt-card';
    el.className = 'mt-3';
    anchor.insertAdjacentElement('afterend', el);
    return el;
  }

  function getNoButtonStyle() {
    const isDarkUi = typeof document !== 'undefined' && document.documentElement
      && document.documentElement.classList.contains('dark');
    return isDarkUi
      ? 'min-width:100px;background-color:rgba(127,29,29,0.35);color:#fecdd3;border:1px solid rgba(190,18,60,0.45);'
      : 'min-width:100px;background-color:#ffe4e6;color:#9f1239;border:1px solid #fecdd3;';
  }

  function buildPromptQuestionHtml(promptEntry, options) {
    const opts = options || {};
    const isEdit = !!opts.isEdit;
    const uid = opts.uid || ('mp-prompt-' + Math.random().toString(36).slice(2, 9));
    const title = t('mobilityPackageCardTitle', 'Mobilitási Csomag – heti pihenő');
    const fromStr = formatPromptDate(promptEntry.triggerStart);
    const toStr = formatPromptDate(promptEntry.triggerEnd);
    const bodyTemplate = t(
      'mobilityPackagePromptBody',
      '90+ órás hosszú pihenő észlelve ({from} – {to}). Nemzetközi árufuvarozásban vettél részt, és szeretnéd alkalmazni a Mobilitási Csomag 2×24 órás heti pihenő logikáját?'
    );
    const body = bodyTemplate.replace('{from}', fromStr).replace('{to}', toStr);
    const note = isEdit
      ? t('mobilityPackageDecisionEditNote', 'Módosíthatod a választ; a kompenzációk automatikusan újraszámolódnak.')
      : t('mobilityPackageDecisionNote', 'A válaszod erre a pihenőre vonatkozik; később a Módosítás gombbal változtathatod.');
    const yesLabel = t('mobilityPackagePromptYes', t('okYes', 'Igen'));
    const noLabel = t('mobilityPackagePromptNo', t('okNo', 'Nem'));
    const noBtnStyle = getNoButtonStyle();

    return `
      <div class="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-lg p-3 space-y-3" data-mobility-prompt="${escapeHtml(uid)}">
        <div>
          <h3 class="font-medium text-slate-800 dark:text-slate-100 text-sm">${escapeHtml(title)}</h3>
          <p class="text-sm text-slate-700 dark:text-slate-300 mt-2">${escapeHtml(body)}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">${escapeHtml(note)}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="mobility-package-yes px-4 py-2 rounded-lg font-semibold text-sm" style="min-width:100px;background-color:#2563eb;color:#ffffff;" data-prompt-uid="${escapeHtml(uid)}">${escapeHtml(yesLabel)}</button>
          <button type="button" class="mobility-package-no px-4 py-2 rounded-lg font-semibold text-sm" style="${noBtnStyle}" data-prompt-uid="${escapeHtml(uid)}">${escapeHtml(noLabel)}</button>
        </div>
      </div>`;
  }

  function wirePromptButtons(container, promptEntry, promptUid) {
    if (!container || !promptEntry) return;
    const yesBtn = container.querySelector(`.mobility-package-yes[data-prompt-uid="${promptUid}"]`);
    const noBtn = container.querySelector(`.mobility-package-no[data-prompt-uid="${promptUid}"]`);
    const snapshot = { ...promptEntry };

    async function onChoice(applied) {
      if (yesBtn) yesBtn.disabled = true;
      if (noBtn) noBtn.disabled = true;
      const ok = await saveMobilityPackageDecision(snapshot, applied);
      if (ok) await afterMobilityDecisionSaved();
      else {
        if (yesBtn) yesBtn.disabled = false;
        if (noBtn) noBtn.disabled = false;
      }
    }

    if (yesBtn) yesBtn.addEventListener('click', function () { onChoice(true); });
    if (noBtn) noBtn.addEventListener('click', function () { onChoice(false); });
  }

  async function renderMobilityPackagePromptCard() {
    const gen = ++promptRenderGeneration;

    const tier = (typeof window.getEffectiveSubscriptionTier === 'function')
      ? window.getEffectiveSubscriptionTier()
      : 'free';
    if (tier === 'free') {
      const el = document.getElementById('mobility-package-prompt-card');
      if (el) {
        el.innerHTML = '';
        el.style.display = 'none';
      }
      editingTriggerMs = null;
      return;
    }

    const container = ensurePromptCardContainer();
    if (!container) return;

    const hasRealRecords = Array.isArray(window.records) && window.records.length > 0;
    if (!hasRealRecords) {
      container.innerHTML = '';
      container.style.display = 'none';
      editingTriggerMs = null;
      return;
    }

    const blocks = getWeeklyRestBlocks();
    await refreshMobilityEvaluation(blocks);
    if (gen !== promptRenderGeneration) return;

    if (editingTriggerMs && !shouldIncludeDecidedTriggerOnCard(blockForTriggerKey(blocks, editingTriggerMs))) {
      editingTriggerMs = null;
    }

    const decided = collectDecidedTriggers(blocks);
    const decidedForOverview = filterDecidedTriggersForOverview(decided, editingTriggerMs);
    const pending = getLatestPendingPrompt();
    const editingRow = editingTriggerMs
      ? decided.find((r) => r.triggerStartMs === editingTriggerMs)
      : null;
    const activePrompt = editingRow
      ? promptEntryFromTriggerRow(editingRow)
      : (pending || null);

    if (!decidedForOverview.length && !activePrompt) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.style.display = '';

    const title = t('mobilityPackageCardTitle', 'Mobilitási Csomag – heti pihenő');
    const editLabel = t('mobilityPackageEditDecision', 'Módosítás');
    const statusYes = t('mobilityPackageStatusYes', 'Mobilitási Csomag: Igen');
    const statusNo = t('mobilityPackageStatusNo', 'Mobilitási Csomag: Nem');
    const parts = [];
    const promptBindings = [];

    parts.push(`<div class="space-y-3" id="mobility-package-card-root">`);
    parts.push(`<h3 class="font-semibold text-slate-800 dark:text-slate-100 text-sm">${escapeHtml(title)}</h3>`);

    for (const row of decidedForOverview) {
      if (editingTriggerMs && row.triggerStartMs === editingTriggerMs) continue;
      const rangeStr = formatMobilityPackageRestRange(row.triggerStart, row.triggerEnd);
      const durationStr = formatMobilityPackageRestDurationLine(
        row.triggerStart,
        row.triggerEnd,
        row.triggerDurationHours
      );
      const statusText = row.applied ? statusYes : statusNo;
      parts.push(`
        <div class="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-slate-200 dark:border-slate-600 last:border-0">
          <div class="min-w-0">
            <p class="text-sm font-medium text-slate-800 dark:text-slate-100">${escapeHtml(statusText)}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(rangeStr)}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">${escapeHtml(durationStr)}</p>
          </div>
          <button type="button" class="mobility-package-edit px-3 py-1.5 rounded-lg text-sm font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50" data-trigger-ms="${escapeHtml(row.triggerStartMs)}">${escapeHtml(editLabel)}</button>
        </div>`);
    }

    if (activePrompt) {
      const promptUid = editingRow ? 'edit-' + editingTriggerMs : 'pending';
      parts.push(buildPromptQuestionHtml(activePrompt, { isEdit: !!editingRow, uid: promptUid }));
      promptBindings.push({ uid: promptUid, entry: activePrompt });
    }

    parts.push('</div>');
    container.innerHTML = parts.join('');

    container.querySelectorAll('.mobility-package-edit').forEach((btn) => {
      btn.addEventListener('click', function () {
        const ms = btn.getAttribute('data-trigger-ms');
        if (!ms) return;
        editingTriggerMs = ms;
        renderMobilityPackagePromptCard();
      });
    });

    for (const binding of promptBindings) {
      wirePromptButtons(container, binding.entry, binding.uid);
    }
  }

  window.spansTwoCalendarWeeks = spansTwoCalendarWeeks;
  window.isLongRest90Plus = isLongRest90Plus;
  window.isValidMobilityTrigger = isValidMobilityTrigger;
  window.isSuspiciousLongGap = isSuspiciousLongGap;
  window.shouldIncludeDecidedTriggerOnCard = shouldIncludeDecidedTriggerOnCard;
  window.collectDecidedTriggersForCard = collectDecidedTriggers;
  window.filterDecidedTriggersForOverview = filterDecidedTriggersForOverview;
  window.isMobilityTriggerCurrentlyActive = isMobilityTriggerCurrentlyActive;
  window.MAX_MOBILITY_TRIGGER_GAP_HOURS = MAX_MOBILITY_TRIGGER_GAP_HOURS;
  window.refreshMobilityPackageDecisions = refreshMobilityPackageDecisions;
  window.refreshMobilityEvaluation = refreshMobilityEvaluation;
  window.evaluateMobilityPackageChains = evaluateMobilityPackageChains;
  window.getMobilityPackageEvaluation = getMobilityPackageEvaluation;
  window.getMobilityRestClassification = getMobilityRestClassification;
  window.buildMobilityRestDisplay = buildMobilityRestDisplay;
  window.applyMobilityToRestGap = applyMobilityToRestGap;
  window.saveMobilityPackageDecision = saveMobilityPackageDecision;
  window.renderMobilityPackagePromptCard = renderMobilityPackagePromptCard;
  window.MOBILITY_WEEKLY_REST_MINUTES = WEEKLY_REST_MINUTES;
  window.MOBILITY_WINDOW_HOURS = WINDOW_HOURS;
})();
