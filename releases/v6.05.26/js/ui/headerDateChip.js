(function () {
  'use strict';

  function getAppLocaleForDate() {
    const lang =
      window.currentLang ||
      window.currentLanguage ||
      window.selectedLanguage ||
      localStorage.getItem('language') ||
      localStorage.getItem('appLanguage') ||
      'hu';

    const map = {
      hu: 'hu-HU',
      de: 'de-DE',
      en: 'en-GB',
      pl: 'pl-PL',
      ro: 'ro-RO',
      da: 'da-DK',
      no: 'nb-NO',
      nb: 'nb-NO'
    };

    return map[String(lang).toLowerCase()] || 'hu-HU';
  }

  function renderHeaderDateChip() {
    const chip = document.getElementById('headerDateChip');
    const mainEl = document.getElementById('headerDateMain');
    const weekdayEl = document.getElementById('headerDateWeekday');
    if (!chip || !mainEl || !weekdayEl) return;

    try {
      const now = new Date();
      const locale = getAppLocaleForDate();

      const dateText = new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(now);

      const weekdayText = new Intl.DateTimeFormat(locale, {
        weekday: 'long'
      }).format(now);

      mainEl.textContent = dateText;
      weekdayEl.textContent = weekdayText;

      const aria = `${dateText}, ${weekdayText}`;
      chip.setAttribute('aria-label', aria);
      chip.setAttribute('title', aria);
    } catch (err) {
      try { console.warn('[headerDateChip] render failed:', err); } catch (_) {}
    }
  }

  function scheduleHeaderDateChipRender() {
    try { renderHeaderDateChip(); } catch (_) {}
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(function () {
        try { renderHeaderDateChip(); } catch (_) {}
      });
    }
  }

  window.getAppLocaleForDate = getAppLocaleForDate;
  window.renderHeaderDateChip = renderHeaderDateChip;
  window.scheduleHeaderDateChipRender = scheduleHeaderDateChipRender;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleHeaderDateChipRender);
  } else {
    scheduleHeaderDateChipRender();
  }
})();
