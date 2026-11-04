/**
 * Ünnepnap dátumok (holidayDates) — workday rekordok, legacy isHoliday fallback.
 */
(function (global) {
  'use strict';

  function isValidIsoDate(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  }

  function normalizeHolidayDates(arr) {
    if (!Array.isArray(arr)) return [];
    var seen = {};
    var out = [];
    arr.forEach(function (d) {
      var s = String(d || '').trim();
      if (!isValidIsoDate(s) || seen[s]) return;
      seen[s] = true;
      out.push(s);
    });
    out.sort();
    return out;
  }

  function getRecordEndDate(record) {
    if (!record) return '';
    return String(record.endDate || record.date || '');
  }

  function isOvernightWorkRecordForHoliday(record) {
    if (!record || record.entryType === 'noteDay') return false;
    var start = String(record.date || '');
    var end = getRecordEndDate(record);
    return !!(start && end && start !== end);
  }

  /** Legacy: noteDay / egy napos / éjféli workday → csak [date], soha automatikus endDate. */
  function getHolidayDatesForRecord(record) {
    if (!record) return [];
    if (Array.isArray(record.holidayDates) && record.holidayDates.length) {
      return normalizeHolidayDates(record.holidayDates);
    }
    if (record.isHoliday === true) {
      var d = String(record.date || '');
      if (isValidIsoDate(d)) return [d];
    }
    return [];
  }

  function isHolidayOnDate(record, dateStr) {
    if (!record || !isValidIsoDate(dateStr)) return false;
    return getHolidayDatesForRecord(record).indexOf(dateStr) !== -1;
  }

  function holidayDatesFromChoice(choice, startDate, endDate) {
    if (choice === 'none') return [];
    if (choice === 'start') return normalizeHolidayDates([startDate]);
    if (choice === 'end') return normalizeHolidayDates([endDate]);
    if (choice === 'both') return normalizeHolidayDates([startDate, endDate]);
    return [];
  }

  function applyHolidayFieldsToRecord(record, holidayDates) {
    var rec = Object.assign({}, record);
    var dates = normalizeHolidayDates(holidayDates || []);
    if (dates.length) {
      rec.holidayDates = dates;
      rec.isHoliday = true;
    } else {
      delete rec.holidayDates;
      delete rec.isHoliday;
    }
    return rec;
  }

  function formatHolidayClarifyDateLine(iso, locale) {
    if (!isValidIsoDate(iso)) return iso;
    try {
      var d = new Date(iso + 'T12:00:00');
      var loc = locale || 'hu-HU';
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      var wd = d.toLocaleDateString(loc, { weekday: 'long' });
      return y + '. ' + m + '. ' + day + '., ' + wd;
    } catch (_) {
      return iso;
    }
  }

  function ensureHolidayClarifyModalStyles() {
    if (document.getElementById('holiday-clarify-modal-styles')) return;
    var style = document.createElement('style');
    style.id = 'holiday-clarify-modal-styles';
    style.textContent = [
      '#holiday-clarify-modal.holiday-clarify-overlay{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 12px max(72px,calc(12px + env(safe-area-inset-bottom))) 12px;background:rgba(15,23,42,.48);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);overflow-y:auto;box-sizing:border-box}',
      '#holiday-clarify-modal .holiday-clarify-card{width:min(92vw,420px);max-width:420px;border-radius:18px;background:#fff;box-shadow:0 25px 50px -12px rgba(0,0,0,.32);overflow:hidden;box-sizing:border-box;flex-shrink:0}',
      'html.dark #holiday-clarify-modal .holiday-clarify-card{background:#1f2937;box-shadow:0 25px 50px -12px rgba(0,0,0,.55)}',
      '#holiday-clarify-modal .holiday-clarify-header{padding:20px 20px 16px;border-bottom:1px solid #f1f5f9;box-sizing:border-box}',
      'html.dark #holiday-clarify-modal .holiday-clarify-header{border-bottom-color:#374151}',
      '#holiday-clarify-modal .holiday-clarify-title{margin:0;font-size:22px;font-weight:700;line-height:1.25;color:#0f172a;letter-spacing:-.02em}',
      'html.dark #holiday-clarify-modal .holiday-clarify-title{color:#f9fafb}',
      '#holiday-clarify-modal .holiday-clarify-subtitle{margin:10px 0 0;font-size:15px;line-height:1.45;color:#64748b;font-weight:400}',
      'html.dark #holiday-clarify-modal .holiday-clarify-subtitle{color:#94a3b8}',
      '#holiday-clarify-modal .holiday-clarify-options{display:flex;flex-direction:column;gap:10px;padding:16px 20px 20px;box-sizing:border-box}',
      '#holiday-clarify-modal .holiday-clarify-option{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;width:100%;min-height:56px;padding:14px 16px;margin:0;border:1.5px solid #e2e8f0;border-radius:14px;background:#f8fafc;color:#0f172a;text-align:left;cursor:pointer;box-sizing:border-box;transition:background .15s ease,border-color .15s ease,box-shadow .15s ease,transform .1s ease;-webkit-tap-highlight-color:transparent}',
      'html.dark #holiday-clarify-modal .holiday-clarify-option{border-color:#475569;background:#111827;color:#f1f5f9}',
      '#holiday-clarify-modal .holiday-clarify-option:hover{border-color:#c7d2fe;background:#f5f3ff}',
      'html.dark #holiday-clarify-modal .holiday-clarify-option:hover{border-color:#6366f1;background:#1e1b4b}',
      '#holiday-clarify-modal .holiday-clarify-option:active,#holiday-clarify-modal .holiday-clarify-option.holiday-clarify-option--pressed{transform:scale(.98);border-color:#818cf8;background:#eef2ff;box-shadow:0 0 0 3px rgba(99,102,241,.2)}',
      'html.dark #holiday-clarify-modal .holiday-clarify-option:active,html.dark #holiday-clarify-modal .holiday-clarify-option.holiday-clarify-option--pressed{border-color:#818cf8;background:#312e81}',
      '#holiday-clarify-modal .holiday-clarify-option--accent{border-color:#ddd6fe;background:linear-gradient(135deg,#faf5ff 0%,#eef2ff 100%)}',
      'html.dark #holiday-clarify-modal .holiday-clarify-option--accent{border-color:#6d28d9;background:linear-gradient(135deg,#2e1065 0%,#1e1b4b 100%)}',
      '#holiday-clarify-modal .holiday-clarify-option--muted{border-color:#e5e7eb;background:#fff}',
      'html.dark #holiday-clarify-modal .holiday-clarify-option--muted{border-color:#4b5563;background:#1f2937}',
      '#holiday-clarify-modal .holiday-clarify-option-title{display:block;font-size:16px;font-weight:600;line-height:1.3;color:inherit}',
      '#holiday-clarify-modal .holiday-clarify-option-sub{display:block;margin-top:4px;font-size:13px;font-weight:400;line-height:1.35;color:#64748b}',
      'html.dark #holiday-clarify-modal .holiday-clarify-option-sub{color:#94a3b8}',
      '#holiday-clarify-modal .holiday-clarify-option--accent .holiday-clarify-option-sub{color:#6d28d9}',
      'html.dark #holiday-clarify-modal .holiday-clarify-option--accent .holiday-clarify-option-sub{color:#c4b5fd}'
    ].join('');
    document.head.appendChild(style);
  }

  function getUiLocale() {
    var lang = (typeof currentLang === 'string' && currentLang) ? currentLang : (localStorage.getItem('language') || 'hu');
    if (lang === 'de') return 'de-DE';
    if (lang === 'en') return 'en-US';
    if (lang === 'ro') return 'ro-RO';
    if (lang === 'pl') return 'pl-PL';
    if (lang === 'da') return 'da-DK';
    if (lang === 'no') return 'nb-NO';
    return 'hu-HU';
  }

  /**
   * @returns {Promise<'start'|'end'|'both'|'none'>}
   */
  function showHolidayClarificationModal(opts) {
    var startDate = opts && opts.startDate ? String(opts.startDate) : '';
    var endDate = opts && opts.endDate ? String(opts.endDate) : '';
    var locale = (opts && opts.locale) ? opts.locale : getUiLocale();
    var i18n = (opts && opts.i18n) ? opts.i18n : {};
    if (typeof document === 'undefined') return Promise.resolve('none');

    return new Promise(function (resolve) {
      ensureHolidayClarifyModalStyles();

      var existing = document.getElementById('holiday-clarify-modal');
      if (existing) existing.remove();

      var title = i18n.holidayClarifyTitle || 'Ünnepnap pontosítása';
      var subtitle = i18n.holidayClarifyBody || 'Ez a műszak két naptári napot érint. Melyik nap volt ünnepnap?';
      var lblStart = i18n.holidayClarifyStart || 'Kezdőnap';
      var lblEnd = i18n.holidayClarifyEnd || 'Zárónap';
      var lblBoth = i18n.holidayClarifyBoth || 'Mindkét nap';
      var lblBothSub = i18n.holidayClarifyBothSub || 'Mindkét érintett nap ünnepnap volt';
      var lblNone = i18n.holidayClarifyNone || 'Nem ünnepnap';
      var lblNoneSub = i18n.holidayClarifyNoneSub || 'Mégsem, ez a műszak nem ünnepnapos';

      var startLine = formatHolidayClarifyDateLine(startDate, locale);
      var endLine = formatHolidayClarifyDateLine(endDate, locale);
      var finished = false;

      function finish(choice) {
        if (finished) return;
        finished = true;
        var el = document.getElementById('holiday-clarify-modal');
        if (el) el.remove();
        resolve(choice);
      }

      function esc(s) { return String(s).replace(/</g, '&lt;'); }

      function optionBtn(choice, extraClass, optTitle, optSub) {
        return ''
          + '<button type="button" class="holiday-clarify-option' + (extraClass || '') + '" data-holiday-choice="' + choice + '">'
          + '<span class="holiday-clarify-option-title">' + esc(optTitle) + '</span>'
          + (optSub ? '<span class="holiday-clarify-option-sub">' + esc(optSub) + '</span>' : '')
          + '</button>';
      }

      var overlay = document.createElement('div');
      overlay.id = 'holiday-clarify-modal';
      overlay.className = 'holiday-clarify-overlay';

      overlay.innerHTML = ''
        + '<div class="holiday-clarify-card" role="dialog" aria-modal="true" aria-labelledby="holiday-clarify-title">'
        + '<header class="holiday-clarify-header">'
        + '<h3 id="holiday-clarify-title" class="holiday-clarify-title">' + esc(title) + '</h3>'
        + '<p class="holiday-clarify-subtitle">' + esc(subtitle) + '</p>'
        + '</header>'
        + '<div class="holiday-clarify-options">'
        + optionBtn('start', '', lblStart, startLine)
        + optionBtn('end', '', lblEnd, endLine)
        + optionBtn('both', ' holiday-clarify-option--accent', lblBoth, lblBothSub)
        + optionBtn('none', ' holiday-clarify-option--muted', lblNone, lblNoneSub)
        + '</div></div>';

      document.body.appendChild(overlay);

      overlay.querySelectorAll('[data-holiday-choice]').forEach(function (btn) {
        btn.addEventListener('pointerdown', function () {
          btn.classList.add('holiday-clarify-option--pressed');
        });
        btn.addEventListener('pointerup', function () {
          btn.classList.remove('holiday-clarify-option--pressed');
        });
        btn.addEventListener('pointerleave', function () {
          btn.classList.remove('holiday-clarify-option--pressed');
        });
        btn.addEventListener('click', function () {
          var c = btn.getAttribute('data-holiday-choice');
          if (c !== 'start' && c !== 'end' && c !== 'both' && c !== 'none') return;
          btn.classList.add('holiday-clarify-option--pressed');
          window.setTimeout(function () { finish(c); }, 120);
        });
      });
    });
  }

  async function resolveWorkdayHolidayFields(record, wantHoliday) {
    var rec = Object.assign({}, record);
    var startDate = String(rec.date || '');
    var endDate = getRecordEndDate(rec);
    if (!wantHoliday) {
      return applyHolidayFieldsToRecord(rec, []);
    }
    if (!isOvernightWorkRecordForHoliday(rec)) {
      return applyHolidayFieldsToRecord(rec, [startDate]);
    }
    var i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
      ? (translations[currentLang] || {})
      : {};
    var choice = await showHolidayClarificationModal({
      startDate: startDate,
      endDate: endDate,
      i18n: i18n
    });
    return applyHolidayFieldsToRecord(rec, holidayDatesFromChoice(choice, startDate, endDate));
  }

  global.normalizeHolidayDates = normalizeHolidayDates;
  global.getHolidayDatesForRecord = getHolidayDatesForRecord;
  global.isHolidayOnDate = isHolidayOnDate;
  global.holidayDatesFromChoice = holidayDatesFromChoice;
  global.applyHolidayFieldsToRecord = applyHolidayFieldsToRecord;
  global.isOvernightWorkRecordForHoliday = isOvernightWorkRecordForHoliday;
  global.showHolidayClarificationModal = showHolidayClarificationModal;
  global.resolveWorkdayHolidayFields = resolveWorkdayHolidayFields;
  global.formatHolidayClarifyDateLine = formatHolidayClarifyDateLine;
})(typeof window !== 'undefined' ? window : global);
