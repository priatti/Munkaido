/**
 * GuriGO – lazy loaders for ON_DEMAND libs (jsPDF, Chart, Firebase Storage/Functions, i18n).
 */
(function (global) {
  'use strict';

  var I18N_VER = '60518oauth1';
  var SUPPORTED = ['hu', 'de', 'en', 'ro', 'pl', 'da', 'no'];
  var i18nPromises = Object.create(null);

  function load() {
    return global.GurigoLoadScript
      ? global.GurigoLoadScript.load.apply(null, arguments)
      : Promise.reject(new Error('GurigoLoadScript missing'));
  }

  function ensureJsPdf() {
    if (global.jspdf && global.jspdf.jsPDF) return Promise.resolve();
    return load(
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      { crossOrigin: 'anonymous', phase: 'ondemand' }
    ).then(function () {
      return load(
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
        { crossOrigin: 'anonymous', phase: 'ondemand' }
      );
    });
  }

  function ensureChart() {
    if (typeof global.Chart === 'function') return Promise.resolve();
    return load('https://cdn.jsdelivr.net/npm/chart.js', {
      crossOrigin: 'anonymous',
      phase: 'ondemand'
    });
  }

  var storagePromise = null;
  var functionsPromise = null;

  function ensureFirebaseStorage() {
    if (global.storage) return Promise.resolve(global.storage);
    if (storagePromise) return storagePromise;
    storagePromise = load(
      'https://www.gstatic.com/firebasejs/8.10.0/firebase-storage.js',
      { crossOrigin: 'anonymous', phase: 'ondemand' }
    ).then(function () {
      var storage = firebase.storage();
      global.storage = storage;
      return storage;
    });
    return storagePromise;
  }

  function ensureFirebaseFunctions() {
    if (global.functions) return Promise.resolve(global.functions);
    if (functionsPromise) return functionsPromise;
    functionsPromise = load(
      'https://www.gstatic.com/firebasejs/8.10.0/firebase-functions.js',
      { crossOrigin: 'anonymous', phase: 'ondemand' }
    ).then(function () {
      var functions = firebase.app().functions('europe-west3');
      global.functions = functions;
      return functions;
    });
    return functionsPromise;
  }

  function langFileUrl(lang) {
    return 'js/config/i18n/' + lang + '.js?v=' + I18N_VER;
  }

  function ensureI18nLang(lang) {
    if (!SUPPORTED.includes(lang)) lang = 'hu';
    var key = 'translations_' + lang;
    if (global[key] && Object.keys(global[key]).length) {
      if (typeof global.rebuildTranslations === 'function') global.rebuildTranslations();
      return Promise.resolve(lang);
    }
    if (i18nPromises[lang]) return i18nPromises[lang];
    i18nPromises[lang] = load(langFileUrl(lang), { phase: 'i18n' }).then(function () {
      if (typeof global.rebuildTranslations === 'function') global.rebuildTranslations();
      return lang;
    });
    return i18nPromises[lang];
  }

  function warmupOtherI18n(activeLang) {
    var rest = SUPPORTED.filter(function (l) {
      return l !== activeLang;
    });
    var i = 0;
    function tick() {
      if (i >= rest.length) return;
      var lang = rest[i++];
      ensureI18nLang(lang).catch(function () {}).then(function () {
        if (typeof requestIdleCallback === 'function') {
          requestIdleCallback(function () {
            setTimeout(tick, 0);
          }, { timeout: 2000 });
        } else {
          setTimeout(tick, 100);
        }
      });
    }
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(tick, { timeout: 3000 });
    } else {
      setTimeout(tick, 1500);
    }
  }

  global.GurigoLazyLibs = {
    ensureJsPdf: ensureJsPdf,
    ensureChart: ensureChart,
    ensureFirebaseStorage: ensureFirebaseStorage,
    ensureFirebaseFunctions: ensureFirebaseFunctions,
    ensureI18nLang: ensureI18nLang,
    warmupOtherI18n: warmupOtherI18n,
    SUPPORTED_LANGS: SUPPORTED
  };
  global.ensureJsPdf = ensureJsPdf;
  global.ensureChart = ensureChart;
  global.ensureFirebaseStorage = ensureFirebaseStorage;
  global.ensureFirebaseFunctions = ensureFirebaseFunctions;
  global.ensureI18nLang = ensureI18nLang;
})(typeof window !== 'undefined' ? window : this);
