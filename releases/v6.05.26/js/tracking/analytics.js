// ===========================
//  Google Analytics (GA4) – in-app screen tracking
//  Measurement ID: G-7XKCPHZNN2 (same as landing pages)
// ===========================

(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-7XKCPHZNN2';
  var lastTrackedTab = null;

  var TAB_TITLES = {
    live: 'Áttekintés',
    start: 'Indítás/Zárás',
    'full-day': 'Teljes nap',
    list: 'Lista',
    pallets: 'Raklapok',
    waybill: 'Menetlevél',
    vehicles: 'Járművek',
    fueling: 'Tankolás',
    summary: 'Összesítő',
    stats: 'Statisztika',
    tachograph: 'Tachográf',
    tachoLive: 'Élő tachográf',
    report: 'Riport',
    documents: 'Dokumentumok',
    documentsManager: 'Iratok',
    whatsNew: 'Újdonságok',
    settings: 'Beállítások',
    subscription: 'Előfizetés',
    referral: 'Ajánlás',
    help: 'Súgó',
    about: 'Névjegy'
  };

  function ensureGtag() {
    if (typeof window.gtag === 'function') return true;
    if (!window.dataLayer) window.dataLayer = [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    return typeof window.gtag === 'function';
  }

  function trackTab(tabName) {
    if (!tabName || typeof tabName !== 'string') return;
    if (tabName === lastTrackedTab) return;
    if (!ensureGtag()) return;

    lastTrackedTab = tabName;
    var path = '/app/' + tabName;
    var title = TAB_TITLES[tabName] || tabName;
    var origin = '';
    try { origin = window.location.origin || ''; } catch (_) {}

    try {
      window.gtag('event', 'page_view', {
        page_title: title,
        page_path: path,
        page_location: origin + path,
        send_to: MEASUREMENT_ID
      });
    } catch (e) {
      console.warn('[Analytics] page_view failed:', e && (e.message || String(e)));
    }
  }

  window.GurigoAnalytics = {
    trackTab: trackTab,
    measurementId: MEASUREMENT_ID
  };
})();
