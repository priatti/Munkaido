// report.js — v9, ES5-safe, defines initMonthlyReport() + generateMonthlyReport()
(function(){
  'use strict';

  // Lightweight i18n
  function t(key){
    var isDe = (typeof currentLang !== 'undefined' && currentLang === 'de') || (document.documentElement.lang === 'de');
    var dict = {
      noEntries: isDe ? 'Keine Einträge im gewählten Monat gefunden.' : 'A kiválasztott hónapban nincs bejegyzés.',
      count:     isDe ? 'Einträge gefunden: ' : 'Találatok száma: ',
      month:     isDe ? 'Monat' : 'Hónap'
    };
    return dict[key] || key;
  }

  // ---------- Records access (robust) ----------
  function getAllRecords(){
    try{
      if (Array.isArray(window.records) && window.records.length) return window.records;
      if (typeof window.getAllRecords === 'function'){
        var r = window.getAllRecords(); if (Array.isArray(r)) return r;
      }
      if (window.db && typeof window.db.getRecords === 'function'){
        var r2 = window.db.getRecords(); if (Array.isArray(r2)) return r2;
      }
    }catch(e){}
    try{
      var raw = localStorage.getItem('records');
      if (raw){ var parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed; }
    }catch(e){}
    return [];
  }

  // ---------- Date helpers ----------
  function pad2(n){ return (n<10?'0':'') + n; }

  // Normalize a variety of date-like values to "YYYY-MM"
  function normalizeYmFromDate(anyDate){
    if (anyDate && typeof anyDate.getFullYear === 'function'){
      return anyDate.getFullYear() + "-" + pad2(anyDate.getMonth()+1);
    }
    var s = String(anyDate || '').trim();
    if (!s) return '';

    // ISO-like: YYYY-MM or YYYY-MM-DD
    var m = s.match(/^\s*(\d{4})\D+(\d{1,2})(?:\D+(\d{1,2}))?\s*$/);
    if (m) return m[1] + "-" + pad2(parseInt(m[2],10));

    // HU: 2025. 09. 16.
    m = s.match(/^\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})?\.?\s*$/);
    if (m) return m[1] + "-" + pad2(parseInt(m[2],10));

    // DE: 16.09.2025
    m = s.match(/^\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*$/);
    if (m) return m[3] + "-" + pad2(parseInt(m[2],10));

    // timestamp
    var n = Number(s);
    if (!isNaN(n) && s.length >= 10){
      var d = new Date(n);
      if (!isNaN(d)) return d.getFullYear() + "-" + pad2(d.getMonth()+1);
    }
    return '';
  }

  function getSelectedYearMonth(){
    var el = document.querySelector('#reportMonth, input[type="month"]');
    var raw = el ? (el.value || el.getAttribute('value') || el.textContent || '') : '';
    if (!raw){
      var d = new Date();
      raw = d.getFullYear() + "-" + pad2(d.getMonth()+1);
    }
    var ym = normalizeYmFromDate(raw);
    if (!ym){
      var m = raw.match(/(\d{4}).*?(\d{1,2})/);
      if (m) ym = m[1] + "-" + pad2(parseInt(m[2],10));
    }
    return { y: ym.slice(0,4), m: ym.slice(5,7), ym: ym };
  }

  function pickRecordDate(r){
    if (!r) return '';
    return r.date || r.day || r.dt || r.startedAt || r.startDate || r.workdayDate || '';
  }

  function filterMonthly(records, ym){
    var out = [];
    var prefix = ym;
    for (var i=0;i<records.length;i++){
      var rec = records[i];
      var d = pickRecordDate(rec);
      var rym = normalizeYmFromDate(d);
      if (rym && rym === prefix) out.push(rec);
    }
    return out;
  }

  // ---------- Render / Actions ----------
  function renderCount(n){
    var out = document.getElementById('reportOutput') || document.querySelector('#reportOutput, #report-output');
    if (!out) return;
    out.textContent = (n>0) ? (t('count') + n) : t('noEntries');
  }

  function generateMonthlyReport(){
    try{
      var all = getAllRecords();
      var sel = getSelectedYearMonth();
      var month = filterMonthly(all, sel.ym);
      renderCount(month.length);
      window.__report_debug__ = { total: all.length, month: month.length, ym: sel.ym };
      console.info('[REPORT_V9] összes:', all.length, '— hónap:', month.length, 'ym:', sel.ym);
      // TODO: itt lehet bővíteni a tényleges PDF adat-előkészítéssel
    }catch(e){
      console.error('[REPORT_V9] hiba:', e);
      renderCount(0);
    }
  }

  function initMonthlyReport(){
    // opcionálisan auto-render a kiválasztott hónapra
    renderCount(0);
  }

  // Expose
  window.initMonthlyReport = window.initMonthlyReport || initMonthlyReport;
  window.generateMonthlyReport = window.generateMonthlyReport || generateMonthlyReport;
})();
