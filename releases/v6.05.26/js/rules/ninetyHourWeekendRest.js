// =======================================================
// ===== 90 ÓRÁS HÉTVÉGI PIHENŐ SZABÁLY – ÖNÁLLÓ MODUL ====
// =======================================================
// FONTOS: Nem módosít semmilyen meglévő pihenőidő-szabályt, függvényt vagy komponenst.
// Csak olvas (records, getWeeklyRestBlocksFromTachograph). Új fájl, új függvények.

(function () {
  'use strict';

  const HOURS_90 = 90;
  const HOURS_24 = 24;
  const HOURS_45 = 45;
  const NEXT_REST_DEADLINE_HOURS = 6 * 24; // 144 óra

  function safeNow(now) {
    try {
      if (!now) return new Date();
      if (now instanceof Date) return now;
      return new Date(now);
    } catch (_) {
      return new Date();
    }
  }

  /**
   * Ellenőrzi, hogy a pihenő átnyúlik-e a vasárnap→hétfő éjfélre (héthatár).
   * Feltétel: start < valamely hétfő 00:00 < end
   */
  function spansSundayMondayMidnight(block) {
    if (!block || !block.start || !block.end) return false;
    const start = block.start instanceof Date ? block.start : new Date(block.start);
    const end = block.end instanceof Date ? block.end : new Date(block.end);
    if (isNaN(start) || isNaN(end) || start >= end) return false;

    let d = new Date(start);
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

  /**
   * 90 órás hétvégi pihenő: ≥90h ÉS vasárnap→hétfő átnyúlás
   */
  function is90hWeekendRest(block) {
    if (!block) return false;
    const h = Number(block.durationHours);
    return isFinite(h) && h >= HOURS_90 && spansSundayMondayMidnight(block);
  }

  /**
   * Pihenő blokkok lekérése – a tachográf exportját használja, fallback saját detektálás.
   */
  function getRestBlocks(recordsSorted) {
    let blocks = [];
    try {
      if (typeof window.getWeeklyRestBlocksFromTachograph === 'function') {
        blocks = window.getWeeklyRestBlocksFromTachograph(recordsSorted) || [];
      }
    } catch (_) {}
    if (!Array.isArray(blocks) || blocks.length === 0) {
      blocks = detectRestBlocksFromRecords(recordsSorted);
    }
    return blocks;
  }

  /**
   * Fallback: records alapján ≥24h pihenő blokkok detektálása
   */
  function detectRestBlocksFromRecords(recordsSorted) {
    const blocks = [];
    if (!Array.isArray(recordsSorted) || recordsSorted.length < 2) return blocks;

    for (let i = 1; i < recordsSorted.length; i++) {
      const prev = recordsSorted[i - 1];
      const curr = recordsSorted[i];
      if (!prev || !curr) continue;
      if (!prev.endTime || !curr.startTime) continue;
      const prevEndDateStr = prev.endDate || prev.date;
      const prevEnd = new Date(`${prevEndDateStr}T${prev.endTime}`);
      const currStart = new Date(`${curr.date}T${curr.startTime}`);
      if (isNaN(prevEnd) || isNaN(currStart)) continue;

      const durationHours = (currStart - prevEnd) / (1000 * 60 * 60);
      if (durationHours >= HOURS_24) {
        blocks.push({
          start: prevEnd,
          end: currStart,
          durationHours,
          kind: durationHours >= HOURS_45 ? 'REGULAR_WEEKLY_REST' : 'REDUCED_WEEKLY_REST',
          source: 'heuristic'
        });
      }
    }
    return blocks;
  }

  /**
   * Step 3 visszapótlás határideje: csökkentett pihenő hetétől számított 3. vasárnap 23:59:59
   */
  function getStep3Deadline(reducedRestEnd) {
    if (!reducedRestEnd) return null;
    const d = reducedRestEnd instanceof Date ? new Date(reducedRestEnd.getTime()) : new Date(reducedRestEnd);
    if (isNaN(d)) return null;
    const daysSinceMonday = (d.getDay() + 6) % 7;
    const monday = new Date(d);
    monday.setDate(monday.getDate() - daysSinceMonday);
    const sundayOfWeek = new Date(monday);
    sundayOfWeek.setDate(sundayOfWeek.getDate() + 6);
    const thirdSunday = new Date(sundayOfWeek);
    thirdSunday.setDate(thirdSunday.getDate() + 21);
    thirdSunday.setHours(23, 59, 59, 999);
    return thirdSunday;
  }

  /**
   * Láncolat állapot: melyik lépésnél tart a sofőr.
   * step: 0 = nem aktív, 1 = trigger után (vár 24h), 2 = 24h után (vár csökkentett 24h), 3 = vár 45h visszapótlást
   * lastRestEnd: utolsó pihenő vége (countdown számításához, step 1–2)
   * reducedRestEnd: csökkentett heti pihenő vége (step 3 határidő számításához)
   */
  function compute90hChainState(blocks) {
    const result = { active: false, step: 0, lastRestEnd: null, reducedRestEnd: null, nextDeadline: null, exemptRestStarts: [], compensationHours: 0, step3Block: null };

    if (!Array.isArray(blocks) || blocks.length === 0) return result;

    // Legrégebbitől a legfrissebbig (chronological) – start szerint növekvő, függetlenül a forrás sorrendjétől
    const chronological = [...blocks].sort((a, b) => {
      const sa = (a.start instanceof Date ? a.start : new Date(a.start)).getTime();
      const sb = (b.start instanceof Date ? b.start : new Date(b.start)).getTime();
      return sa - sb;
    });

    let chainStep = 0;
    let lastRestEnd = null;
    let reducedRestEnd = null;
    let step3Block = null;
    const exemptRestStarts = [];

    for (const block of chronological) {
      const h = Number(block.durationHours);
      if (!isFinite(h) || h < HOURS_24) continue;

      const is90 = is90hWeekendRest(block);
      const end = block.end instanceof Date ? block.end : new Date(block.end);
      const start = block.start instanceof Date ? block.start : new Date(block.start);

      if (chainStep === 0) {
        if (is90) {
          chainStep = 1;
          lastRestEnd = end;
        }
        continue;
      }

      if (chainStep === 1) {
        if (is90) {
          chainStep = 1;
          lastRestEnd = end;
          continue;
        }
        if (h >= HOURS_45) {
          chainStep = 0;
          lastRestEnd = null;
        } else if (h >= HOURS_24) {
          chainStep = 2;
          lastRestEnd = end;
          exemptRestStarts.push(start.getTime());
        }
        continue;
      }

      if (chainStep === 2) {
        if (is90) {
          chainStep = 1;
          lastRestEnd = end;
          reducedRestEnd = null;
          step3Block = null;
          continue;
        }
        if (h >= HOURS_24 && h < HOURS_45) {
          chainStep = 3;
          lastRestEnd = end;
          reducedRestEnd = end;
          step3Block = { start, end, durationHours: h };
        } else if (h >= HOURS_45) {
          chainStep = 0;
          lastRestEnd = null;
          reducedRestEnd = null;
          step3Block = null;
        }
        continue;
      }

      if (chainStep === 3) {
        if (is90) {
          chainStep = 1;
          lastRestEnd = end;
          reducedRestEnd = null;
          step3Block = null;
          continue;
        }
        if (h >= HOURS_45) {
          chainStep = 0;
          lastRestEnd = null;
          reducedRestEnd = null;
          step3Block = null;
        }
        continue;
      }
    }

    result.active = chainStep >= 1 && chainStep <= 3;
    result.step = chainStep;
    result.lastRestEnd = lastRestEnd;
    result.reducedRestEnd = reducedRestEnd;
    result.exemptRestStarts = exemptRestStarts;
    result.step3Block = step3Block;
    result.compensationHours = step3Block ? Math.max(0, HOURS_45 - (Number(step3Block.durationHours) || 0)) : 0;

    if (chainStep >= 1 && chainStep <= 3) {
      if (chainStep === 3 && reducedRestEnd) {
        result.nextDeadline = getStep3Deadline(reducedRestEnd);
      } else if (lastRestEnd && (chainStep === 1 || chainStep === 2)) {
        result.nextDeadline = new Date(lastRestEnd.getTime() + NEXT_REST_DEADLINE_HOURS * 60 * 60 * 1000);
      }
    }
    return result;
  }

  function getRecordsSorted() {
    const src = (Array.isArray(window.records) && window.records.length > 0)
      ? window.records
      : (typeof demoRecords !== 'undefined' ? demoRecords : []);
    const arr = Array.isArray(src) ? [...src] : [];
    arr.sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
    return arr;
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
    try {
      const v = i18n[key];
      if (v === undefined || v === null || String(v).trim() === '') return fallback;
      return v;
    } catch (_) {
      return fallback;
    }
  }

  function ensureCardContainer() {
    const live = document.getElementById('content-live');
    const anchor = document.getElementById('live-allowance-display');
    if (!live || !anchor) return null;

    let el = document.getElementById('ninety-hour-weekend-rest-card');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'ninety-hour-weekend-rest-card';
    el.className = 'mt-3';
    anchor.insertAdjacentElement('afterend', el);
    return el;
  }

  function setTachoDeadlineRowVisible(visible) {
    const display = visible ? '' : 'none';
    const liveRow = document.querySelector('#live-allowance-display .border-t.pt-2');
    const tachoRow = document.querySelector('#tacho-allowance-display .border-t.pt-2');
    if (liveRow) liveRow.style.display = display;
    if (tachoRow) tachoRow.style.display = display;
  }

  function setTwoReducedCardVisible(visible) {
    const el = document.getElementById('two-reduced-weekly-rest-card');
    if (el) el.style.display = visible ? '' : 'none';
  }

  async function render90hWeekendRestCard() {
    const tier = (typeof window.getEffectiveSubscriptionTier === 'function')
      ? window.getEffectiveSubscriptionTier()
      : 'free';
    if (tier === 'free') {
      const el = document.getElementById('ninety-hour-weekend-rest-card');
      if (el) {
        el.innerHTML = '';
        el.style.display = 'none';
      }
      setTachoDeadlineRowVisible(true);
      setTwoReducedCardVisible(true);
      return;
    }
    const container = ensureCardContainer();
    if (!container) return;
    container.style.display = '';

    const hasRealRecords = Array.isArray(window.records) && window.records.length > 0;
    if (!hasRealRecords) {
      container.innerHTML = '';
      setTachoDeadlineRowVisible(true);
      setTwoReducedCardVisible(true);
      return;
    }

    const recordsSorted = [...window.records].slice().sort(
      (a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime()
    );
    const blocks = getRestBlocks(recordsSorted);
    const state = compute90hChainState(blocks);
    const now = safeNow();

    if (!state.active) {
      container.innerHTML = '';
      setTachoDeadlineRowVisible(true);
      setTwoReducedCardVisible(true);
      return;
    }
    setTachoDeadlineRowVisible(false);
    setTwoReducedCardVisible(false);

    const title = t('ninetyHourCardTitle', '90 órás hétvégi pihenő');
    let message;
    let messageClass = 'text-gray-700 dark:text-gray-300';
    if (state.step === 1) {
      message = t('ninetyHour24hSufficient', '24 órás pihenő elegendő');
    } else if (state.step === 2) {
      message = t('ninetyHourStep2Message', 'Csökkentett heti pihenő lehetséges');
    } else {
      if (state.step === 3 && state.step3Block) {
        if (typeof window.loadWeeklyRestCompensationResolved === 'function') {
          try { await window.loadWeeklyRestCompensationResolved(); } catch (_) {}
        }
        const resolved = typeof window.getIsCompensationResolvedForReducedRest === 'function'
          ? window.getIsCompensationResolvedForReducedRest(state.step3Block.start)
          : false;
        if (resolved) {
          message = t('ninetyHourCompensationResolved', 'Visszapótlás rendezve') + ' ✓';
          messageClass = 'text-green-600 dark:text-green-400 font-semibold';
        } else {
          const compH = Number(state.compensationHours) || 0;
          const units = typeof getDurationUnitTokens === 'function' ? getDurationUnitTokens() : { hours: 'ó', minutes: 'p' };
          const h = Math.floor(compH);
          const m = Math.round((compH - h) * 60);
          const formatted = m > 0 ? `${h}${units.hours} ${m}${units.minutes}` : `${h}${units.hours}`;
          message = formatted + ' ' + t('ninetyHourCompensationRequired', 'visszapótlás szükséges');
        }
      } else {
        message = t('ninetyHourStep3Message', '45 órás visszapótlás szükséges');
      }
    }

    let deadlineHtml = '';
    if (state.nextDeadline) {
      const diffMs = state.nextDeadline - now;
      const diffHours = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
      const diffDays = Math.floor(diffHours / 24);
      const remHours = diffHours % 24;

      if (diffMs <= 0) {
        const expiredText = t('ninetyHourDeadlineExpired', 'A pihenő határideje lejárt');
        deadlineHtml = `<p class="text-sm font-semibold text-amber-600 dark:text-amber-400">${expiredText}</p>`;
      } else {
        const days = diffDays;
        const hours = diffHours >= 24 ? remHours : diffHours;
        const countdownText = diffHours >= 24
          ? t('tachoRelativeTime', '({days} nap {hours} óra múlva)').replace('{days}', String(days)).replace('{hours}', String(hours))
          : t('ninetyHourCountdown', 'Következő pihenő határideje: {hours} óra múlva').replace('{hours}', String(diffHours));
        deadlineHtml = `<p class="text-sm text-gray-700 dark:text-gray-300">${countdownText}</p>`;
      }
    }

    container.innerHTML = `
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">🛌 ${title}</h3>
            <p class="text-sm ${messageClass} mt-1">${message}</p>
            ${deadlineHtml}
          </div>
        </div>
      </div>
    `;
  }

  window.evaluate90hWeekendRest = function (blocks) {
    return compute90hChainState(blocks || []);
  };
  window.render90hWeekendRestCard = render90hWeekendRestCard;

})();
