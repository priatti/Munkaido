// report.js — v9.1 (ES5-safe) - JAVÍTOTT
(function () {
  'use strict';
  
  // Fordítási segédfüggvény (a meglévő alapján)
  function t(key) {
    if (typeof translations !== 'undefined' && translations[currentLang] && translations[currentLang][key]) {
      return translations[currentLang][key];
    }
    const dict = {
      noEntries: 'A kiválasztott hónapban nincs bejegyzés.',
      count: 'Találatok száma: ',
      month: 'Hónap'
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

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function normalizeYmFromDate(anyDate) {
    if (anyDate && typeof anyDate.getFullYear === 'function') { return anyDate.getFullYear() + '-' + pad2(anyDate.getMonth() + 1); }
    var s = String(anyDate || '').trim();
    if (!s) return '';
    var m = s.match(/^\s*(\d{4})\D+(\d{1,2})(?:\D+\d{1,2})?\s*$/);
    if (m) return m[1] + '-' + pad2(parseInt(m[2], 10));
    return new Date(s).getFullYear() + '-' + pad2(new Date(s).getMonth() + 1);
  }

  function getSelectedYearMonth() {
    var el = document.getElementById('monthSelector'); // ID javítva 'reportMonth'-ról
    var raw = el ? (el.value || el.getAttribute('value') || el.textContent || '') : '';
    if (!raw) {
      var d = new Date();
      raw = d.getFullYear() + '-' + pad2(d.getMonth() + 1);
    }
    var ym = normalizeYmFromDate(raw);
    if (!ym) {
      var m = raw.match(/(\d{4}).*?(\d{1,2})/);
      if (m) ym = m[1] + '-' + pad2(parseInt(m[2], 10));
    }
    // Biztosítjuk, hogy az elavult 'reportMonth' ID-val is működjön
    if (!ym) {
        el = document.getElementById('reportMonth');
        raw = el ? el.value : '';
        ym = normalizeYmFromDate(raw);
    }
    return { y: ym.slice(0, 4), m: ym.slice(5, 7), ym: ym };
  }

  function pickRecordDate(r) {
    if (!r) return '';
    return r.date || r.day || r.dt || r.startedAt || r.startDate || r.workdayDate || '';
  }

  function filterMonthly(arr, ym) {
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var d = pickRecordDate(arr[i]);
      if (normalizeYmFromDate(d) === ym) out.push(arr[i]);
    }
    return out;
  }

  /**
   * ÚJ FUNKCIÓ: A riport táblázatának kirajzolása a képernyőre
   * @param {Array} monthRecords - A kiválasztott hónap bejegyzései
   */
  function renderMonthlyReport(monthRecords) {
    var container = document.getElementById('monthlyReportContent');
    if (!container) return;

    if (!monthRecords || monthRecords.length === 0) {
      container.innerHTML = `<p class="text-center text-gray-500 py-4">${t('noEntries')}</p>`;
      // Gombok elrejtése, ha nincs adat
      document.getElementById('pdfExportBtn').classList.add('hidden');
      document.getElementById('pdfShareBtn').classList.add('hidden');
      return;
    }

    // Bejegyzések sorba rendezése dátum szerint
    monthRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Táblázat fejléc
    let tableHtml = `
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <th scope="col" class="py-3 px-4">${t('date')}</th>
              <th scope="col" class="py-3 px-4">${t('entryWorkTime')}</th>
              <th scope="col" class="py-3 px-4">${t('entryDriveTime')}</th>
              <th scope="col" class="py-3 px-4">${t('entryDistance')}</th>
              <th scope="col" class="py-3 px-4">${t('entryDeparture')} / ${t('entryArrival')}</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Táblázat sorai
    monthRecords.forEach(r => {
      tableHtml += `
        <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
          <td class="py-4 px-4 font-semibold">${r.date}</td>
          <td class="py-4 px-4">${formatDuration(r.workMinutes)}</td>
          <td class="py-4 px-4">${formatDuration(r.driveMinutes)}</td>
          <td class="py-4 px-4">${r.kmDriven} km</td>
          <td class="py-4 px-4 text-xs">${r.startTime} (${r.startLocation})<br>${r.endTime} (${r.endLocation})</td>
        </tr>
      `;
    });

    tableHtml += '</tbody></table></div>';
    container.innerHTML = tableHtml;
    
    // PDF gombok megjelenítése
    document.getElementById('pdfExportBtn').classList.remove('hidden');
    document.getElementById('pdfShareBtn').classList.remove('hidden');
  }

  // A fő riport generáló függvény JAVÍTVA
  function generateMonthlyReport() {
    try {
      var all = getAllRecords();
      var sel = getSelectedYearMonth();
      var month = filterMonthly(all, sel.ym);
      
      // A régi renderCount helyett az új, teljes riportot renderelő függvényt hívjuk
      renderMonthlyReport(month);

      console.info('[REPORT_V9] összesen:', all.length, '— hónap:', month.length, 'ym:', sel.ym);
    } catch (e) {
      console.error('[REPORT_V9] hiba:', e);
      var container = document.getElementById('monthlyReportContent');
      if (container) container.innerHTML = `<p class="text-center text-red-500 py-4">Hiba történt a riport generálása közben.</p>`;
    }
  }

  function initMonthlyReport() {
    var container = document.getElementById('monthlyReportContent');
    if (container) container.innerHTML = '';
    
    // Alaphelyzetben a PDF gombok rejtve vannak
    const pdfBtn = document.getElementById('pdfExportBtn');
    const shareBtn = document.getElementById('pdfShareBtn');
    if (pdfBtn) pdfBtn.classList.add('hidden');
    if (shareBtn) shareBtn.classList.add('hidden');

    // Hónapválasztó beállítása az aktuális hónapra
    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector && !monthSelector.value) {
        const now = new Date();
        monthSelector.value = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
    }
  }
  
  // Globálisan elérhetővé tesszük a függvényeket
  window.initMonthlyReport = window.initMonthlyReport || initMonthlyReport;
  window.generateMonthlyReport = window.generateMonthlyReport || generateMonthlyReport;

  // Segédfüggvény a `formatDuration`-höz, ha máshol nem lenne elérhető
  if (typeof window.formatDuration !== 'function') {
    window.formatDuration = function(minutes) {
      var h = Math.floor(minutes / 60);
      var m = Math.round(minutes % 60);
      var lang = (typeof currentLang !== 'undefined' && currentLang === 'de') ? 'de' : 'hu';
      var h_unit = lang === 'de' ? 'Std' : 'ó';
      var m_unit = lang === 'de' ? 'Min' : 'p';
      return `${h}${h_unit} ${m}${m_unit}`;
    }
  }

})();
