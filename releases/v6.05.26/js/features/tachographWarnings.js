;(function() {
  'use strict';

  function getI18n() {
    try {
      if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
        return translations[currentLang] || translations.hu || {};
      }
    } catch (_) {}
    return {};
  }

  function getEffectiveTier() {
    try {
      if (typeof window.getEffectiveSubscriptionTier === 'function') {
        return window.getEffectiveSubscriptionTier();
      }
      return 'free';
    } catch (_) {
      return 'free';
    }
  }

  function escapeHtml(s) {
    if (s == null || s === '') return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** Betöltött rekordokból: dateKey (YYYY-MM-DD) → egyesített, duplikáció nélküli napi megjegyzés. */
  function buildDailyNotesMap(sourceRecords) {
    const map = {};
    const seenByDate = {};
    if (!Array.isArray(sourceRecords)) return map;

    for (let i = 0; i < sourceRecords.length; i++) {
      const r = sourceRecords[i];
      if (!r || !r.date) continue;
      const trimmed = r.note != null ? String(r.note).trim() : '';
      if (!trimmed) continue;

      const dateKey = String(r.date);
      if (!seenByDate[dateKey]) seenByDate[dateKey] = [];
      if (seenByDate[dateKey].indexOf(trimmed) !== -1) continue;
      seenByDate[dateKey].push(trimmed);
      map[dateKey] = seenByDate[dateKey].join(' · ');
    }
    return map;
  }

  function getRecordsForDailyNotesMap() {
    if (typeof window.getRecordsForListDisplay === 'function') {
      return window.getRecordsForListDisplay();
    }
    if (Array.isArray(window.records)) return window.records;
    return [];
  }

  /** A mai naphoz képest hány naptári napja volt az esemény — zárójeles, fordított szöveg. */
  function formatViolationDaysAgoLabel(eventDate, i18n) {
    const i = i18n || {};
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const d = new Date(eventDate);
      if (isNaN(d.getTime())) return '';
      d.setHours(0, 0, 0, 0);
      const days = Math.round((today.getTime() - d.getTime()) / 86400000);
      if (days < 0) return '';
      if (days === 0) return i.tachoDaysAgoToday || '(ma)';
      if (days === 1) return i.tachoDaysAgoOne || '(1 napja)';
      return (i.tachoDaysAgoMany || '({n} napja)').replace('{n}', String(days));
    } catch (_) {
      return '';
    }
  }

  function getOverviewContainer() {
    const live = document.getElementById('content-live');
    const anchor = document.getElementById('live-allowance-display');
    if (!live || !anchor) return null;

    let el = document.getElementById('tachograph-violations-card');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'tachograph-violations-card';
    el.className = 'mt-3';
    anchor.insertAdjacentElement('afterend', el);
    return el;
  }

  function countViolationsInWindow(analysisResults, daysBack) {
    if (!Array.isArray(analysisResults) || !analysisResults.length) {
      return { drive: 0, rest: 0 };
    }
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - daysBack);

    let drive = 0;
    let rest = 0;

    for (let i = 0; i < analysisResults.length; i++) {
      const res = analysisResults[i];
      if (!res || !res.record || !res.record.date) continue;
      const d = new Date(res.record.date + 'T00:00:00');
      if (isNaN(d) || d < cutoff || d > now) continue;

      if (res.rest && res.rest.isIrregularRest) {
        rest++;
      }
      if (res.drive && res.drive.isIrregularDrive) {
        drive++;
      }
    }

    return { drive, rest };
  }

  /** Szabálytalanságok listája: dátum + mi történt (56 napos ablak), dátum szerint rendezve (legújabb elől). */
  function getViolationsListInWindow(analysisResults, daysBack, dailyNotesMap) {
    if (!Array.isArray(analysisResults) || !analysisResults.length) {
      return [];
    }
    const notesMap = dailyNotesMap || {};
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - daysBack);

    const entries = [];
    for (let i = 0; i < analysisResults.length; i++) {
      const res = analysisResults[i];
      if (!res || !res.record || !res.record.date || res.isNoteDay) continue;
      const d = new Date(res.record.date + 'T00:00:00');
      if (isNaN(d) || d < cutoff || d > now) continue;

      const parts = [];
      if (res.rest && res.rest.isIrregularRest && res.rest.text) {
        parts.push(res.rest.text);
      }
      if (res.drive && res.drive.isIrregularDrive && res.drive.text) {
        parts.push(res.drive.text);
      }
      if (parts.length) {
        const dateKey = String(res.record.date);
        const note = notesMap[dateKey] || '';
        entries.push({ date: dateKey, dateObj: d, description: parts.join(' · '), note: note });
      }
    }
    entries.sort(function (a, b) { return b.dateObj.getTime() - a.dateObj.getTime(); });
    return entries;
  }

  function renderTachographViolationsCard() {
    try {
      const tier = getEffectiveTier();
      if (tier === 'free') {
        const existing = document.getElementById('tachograph-violations-card');
        if (existing) {
          existing.innerHTML = '';
          existing.style.display = 'none';
        }
        return;
      }

      const container = getOverviewContainer();
      if (!container) return;
      container.style.display = '';

      let analysis = Array.isArray(window.lastTachographAnalysis) ? window.lastTachographAnalysis : [];

      if ((!analysis || !analysis.length) && typeof window.renderTachographAnalysis === 'function') {
        try {
          const maybePromise = window.renderTachographAnalysis();
          if (maybePromise && typeof maybePromise.then === 'function') {
            maybePromise.then(function () {
              if (Array.isArray(window.lastTachographAnalysis) && window.lastTachographAnalysis.length) {
                window.renderTachographViolationsCard();
              }
            }).catch(function () {});
          }
        } catch (_) {}
        analysis = Array.isArray(window.lastTachographAnalysis) ? window.lastTachographAnalysis : [];
      }
      const violDays = 56;
      const counts = countViolationsInWindow(analysis, violDays);
      const hasViolations = counts.drive > 0 || counts.rest > 0;

      const i18n = getI18n();
      function trTmpl(s, n) {
        if (s == null || s === '') return null;
        return String(s).replace(/\{n\}/g, String(n));
      }
      const title = i18n.tachoViolationsCardTitle != null && i18n.tachoViolationsCardTitle !== '' ? i18n.tachoViolationsCardTitle : 'Tachograph violations';
      const driveLabel = i18n.tachoIrregularDrive != null && i18n.tachoIrregularDrive !== '' ? i18n.tachoIrregularDrive : 'Irregular driving';
      const restLabel = i18n.tachoIrregularRest != null && i18n.tachoIrregularRest !== '' ? i18n.tachoIrregularRest : 'Irregular rest';
      const daysLabel = trTmpl(i18n.tachoLast56Days, violDays) || trTmpl('in the last {n} days', violDays);
      const listHeader = i18n.tachoViolationsListHeader != null && i18n.tachoViolationsListHeader !== '' ? i18n.tachoViolationsListHeader : 'Date · What happened';
      const noViolationsText = trTmpl(i18n.tachoNoViolationsIn56Days, violDays) || trTmpl('No violations in the last {n} days.', violDays);
      const countTmpl = (i18n.tachoViolationsCount != null && i18n.tachoViolationsCount !== '') ? i18n.tachoViolationsCount : '{n}×';
      function trCount(n) { return String(countTmpl).replace(/\{n\}/g, String(n)); }

      const rows = [];
      if (counts.drive) {
        rows.push(`<div class="flex justify-between items-center">
  <span class="text-sm text-red-800 dark:text-red-200 font-medium">🚗 ${escapeHtml(driveLabel)}</span>
  <span class="text-sm font-semibold text-red-900 dark:text-red-100">${escapeHtml(trCount(counts.drive))}</span>
</div>`);
      }
      if (counts.rest) {
        rows.push(`<div class="flex justify-between items-center">
  <span class="text-sm text-amber-800 dark:text-amber-100 font-medium">😴 ${escapeHtml(restLabel)}</span>
  <span class="text-sm font-semibold text-amber-900 dark:text-amber-50">${escapeHtml(trCount(counts.rest))}</span>
</div>`);
      }

      const dailyNotesMap = buildDailyNotesMap(getRecordsForDailyNotesMap());
      const violationsList = getViolationsListInWindow(analysis, violDays, dailyNotesMap);
      const noteLabel = (i18n.entryNote != null && i18n.entryNote !== '') ? i18n.entryNote : 'Megjegyzés';
      const locale = (typeof getCurrentLocale === 'function') ? getCurrentLocale() : (typeof currentLang !== 'undefined' && currentLang === 'de' ? 'de-DE' : (currentLang === 'en' ? 'en-US' : (currentLang === 'ro' ? 'ro-RO' : (currentLang === 'pl' ? 'pl-PL' : 'hu-HU'))));
      let listHtml = '';
      if (violationsList.length > 0) {
        listHtml = `
  <div class="mt-3 pt-2 border-t border-red-200 dark:border-red-800">
    <p class="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">${escapeHtml(listHeader)}</p>
    <ul class="space-y-1.5 max-h-40 overflow-y-auto text-xs text-gray-700 dark:text-gray-300">`;
        for (let v = 0; v < violationsList.length; v++) {
          const item = violationsList[v];
          const dateStr = item.dateObj.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
          const daysAgoStr = formatViolationDaysAgoLabel(item.dateObj, i18n);
          const dateCol = daysAgoStr ? `${dateStr} ${daysAgoStr}` : dateStr;
          const noteLine = item.note
            ? `<p class="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400 break-words"><span class="font-medium">${escapeHtml(noteLabel)}:</span> ${escapeHtml(item.note)}</p>`
            : '';
          listHtml += `<li><div class="flex flex-wrap gap-x-2 gap-y-0.5"><span class="font-medium text-gray-600 dark:text-gray-400 shrink-0">${escapeHtml(dateCol)}</span><span class="min-w-0">${escapeHtml(item.description)}</span></div>${noteLine}</li>`;
        }
        listHtml += '</ul></div>';
      }

      const borderClass = hasViolations ? 'border-red-200 dark:border-red-700' : 'border-gray-200 dark:border-gray-600';
      const bodyContent = hasViolations
        ? `<div class="space-y-1 mt-1">${rows.join('')}</div>${listHtml}`
        : `<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${escapeHtml(noViolationsText)}</p>`;

      container.innerHTML = `
<button type="button"
  class="w-full text-left bg-white dark:bg-slate-900 border ${borderClass} rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer"
  data-goto-tab="tachograph">
  <div class="flex items-center justify-between mb-1">
    <div class="flex items-center gap-2">
      <span class="text-lg">${hasViolations ? '⚠️' : '✅'}</span>
      <span class="font-semibold text-gray-900 dark:text-gray-100">${escapeHtml(title)}</span>
    </div>
    <span class="text-xs text-gray-500 dark:text-gray-400">${escapeHtml(daysLabel)}</span>
  </div>
  ${bodyContent}
</button>`;
    } catch (e) {
      try { console.warn('[tachoWarnings] render failed', e); } catch (_) {}
    }
  }

  window.renderTachographViolationsCard = renderTachographViolationsCard;
})();

