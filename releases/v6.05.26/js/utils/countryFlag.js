(function () {
  var LANG_FLAGS = {
    hu: ['hu'],
    de: ['at', 'de'],
    en: ['gb'],
    ro: ['ro'],
    pl: ['pl'],
    da: ['dk'],
    no: ['no']
  };

  var LANG_LABELS = {
    hu: 'Magyar',
    de: 'Deutsch',
    en: 'English',
    ro: 'Română',
    pl: 'Polski',
    da: 'Dansk',
    no: 'Norsk'
  };

  function countryFlagImgHtml(code, width, height) {
    var c = String(code || '').toLowerCase();
    if (!c || c.length !== 2) return '';
    var w = width || 20;
    var h = height || 15;
    return (
      '<img src="https://flagcdn.com/w40/' + c + '.png"' +
      ' srcset="https://flagcdn.com/w80/' + c + '.png 2x"' +
      ' alt="" class="language-flag-img" width="' + w + '" height="' + h + '"' +
      ' loading="lazy" aria-hidden="true">'
    );
  }

  function decorateLanguageButtonFlags(root) {
    var scope = root || document;
    scope.querySelectorAll('.language-btn-modern[data-lang]').forEach(function (btn) {
      var lang = btn.getAttribute('data-lang');
      var label = btn.querySelector('.language-btn-label');
      if (!label || !lang) return;
      var codes = LANG_FLAGS[lang];
      if (!codes || !codes.length) return;
      var name = LANG_LABELS[lang] || label.textContent.replace(/[^\p{L}\p{M}\s]/gu, '').trim();
      label.innerHTML = codes.map(function (c) { return countryFlagImgHtml(c); }).join('') + ' ' + name;
    });
  }

  window.countryFlagImgHtml = countryFlagImgHtml;
  window.decorateLanguageButtonFlags = decorateLanguageButtonFlags;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { decorateLanguageButtonFlags(); });
  } else {
    decorateLanguageButtonFlags();
  }
})();
