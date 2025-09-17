// report.js — v9.1 (ES5-safe)
(function () {
  'use strict';
  function t(key) {
    var isDe = (typeof currentLang !== 'undefined' && currentLang === 'de') || (document.documentElement.lang === 'de');
    var dict = {
      noEntries: isDe ? 'Keine Einträge im gewählten Monat gefunden.' : 'A kiválasztott hónapban nincs bejegyzés.',
      count:     isDe ? 'Einträge gefunden: ' : 'Találatok száma: ',
      month:     isDe ? 'Monat' : 'Hónap'
    };
    return dict[key] || key;
  }
  function getAllRecords() {
    try {
      if (typeof records !== 'undefined' && Array.isArray(records) && records.length) return records;
      if (typeof window !== 'undefined' && Array.isArray(window.records) && window.records.length) return window.records;
    } catch (e) {}
    try {
      var raw = localStorage.getItem('workRecords') || localStorage.getItem('records');
      if (raw) { var parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed; }
    } catch (e) {}
    return [];
  }
  function pad2(n){return (n<10?'0':'')+n;}
  function normalizeYmFromDate(anyDate){
    if (anyDate && typeof anyDate.getFullYear==='function'){return anyDate.getFullYear()+'-'+pad2(anyDate.getMonth()+1);}
    var s=String(anyDate||'').trim(); if(!s) return '';
    var m=s.match(/^\s*(\d{4})\D+(\d{1,2})(?:\D+\d{1,2})?\s*$/); if(m) return m[1]+'-'+pad2(parseInt(m[2],10));
    m=s.match(/^\s*(\d{4})\.\s*(\d{1,2})\.(?:\s*\d{1,2}\.?)?\s*$/); if(m) return m[1]+'-'+pad2(parseInt(m[2],10));
    m=s.match(/^\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})\s*$/); if(m) return m[3]+'-'+pad2(parseInt(m[2],10));
    var n=Number(s); if(!isNaN(n) && n>1e9){ var d1=new Date(n); if(!isNaN(d1)) return d1.getFullYear()+'-'+pad2(d1.getMonth()+1); }
    var d2=new Date(s); if(!isNaN(d2)) return d2.getFullYear()+'-'+pad2(d2.getMonth()+1);
    return '';
  }
  function getSelectedYearMonth(){
    var el=document.querySelector('#reportMonth, input[type="month"]');
    var raw=el?(el.value||el.getAttribute('value')||el.textContent||''):'';
    if(!raw){ var d=new Date(); raw=d.getFullYear()+'-'+pad2(d.getMonth()+1); }
    var ym=normalizeYmFromDate(raw);
    if(!ym){ var m=raw.match(/(\d{4}).*?(\d{1,2})/); if(m) ym=m[1]+'-'+pad2(parseInt(m[2],10)); }
    return {y:ym.slice(0,4), m:ym.slice(5,7), ym:ym};
  }
  function pickRecordDate(r){ if(!r) return ''; return r.date||r.day||r.dt||r.startedAt||r.startDate||r.workdayDate||''; }
  function filterMonthly(arr,ym){ var out=[]; for(var i=0;i<arr.length;i++){ var d=pickRecordDate(arr[i]); if(normalizeYmFromDate(d)===ym) out.push(arr[i]); } return out; }
  function renderCount(n){ var out=document.getElementById('reportOutput')||document.querySelector('#reportOutput, #report-output'); if(!out) return; out.textContent=(n>0)?(t('count')+n):t('noEntries'); }
  function generateMonthlyReport(){ try{ var all=getAllRecords(); var sel=getSelectedYearMonth(); var month=filterMonthly(all,sel.ym); renderCount(month.length); window.__report_debug__={total:all.length,month:month.length,ym:sel.ym}; console.info('[REPORT_V9] összes:',all.length,'— hónap:',month.length,'ym:',sel.ym);}catch(e){ console.error('[REPORT_V9] hiba:',e); renderCount(0);} }
  function initMonthlyReport(){ renderCount(0); }
  window.initMonthlyReport=window.initMonthlyReport||initMonthlyReport;
  window.generateMonthlyReport=window.generateMonthlyReport||generateMonthlyReport;
})();