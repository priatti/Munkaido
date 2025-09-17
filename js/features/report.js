// report.js — JAVÍTOTT, TELJES VERZIÓ
(function () {
  'use-strict';

  let currentMonthRecords = []; // A generált riport adatait itt tároljuk

  // === SEGÉDFÜGGVÉNYEK ===
  function t(key) {
    return (typeof translations !== 'undefined' && translations[currentLang] && translations[currentLang][key]) || key;
  }

  function getAllRecords() {
    return (typeof records !== 'undefined' && Array.isArray(records)) ? records : [];
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function getSelectedYearMonth() {
    const el = document.getElementById('monthSelector');
    let raw = el ? el.value : '';
    if (!raw) {
      const d = new Date();
      raw = d.getFullYear() + '-' + pad2(d.getMonth() + 1);
    }
    return raw;
  }

  function filterMonthly(arr, ym) {
    return arr.filter(r => r.date && r.date.startsWith(ym));
  }

  // === FŐ FUNKCIÓK ===

  /**
   * Kirajzolja a havi riportot HTML táblázatként a felületre.
   * @param {Array} monthRecords - A kiválasztott hónap bejegyzései
   */
  function renderMonthlyReport(monthRecords) {
    const container = document.getElementById('monthlyReportContent');
    if (!container) return;

    const pdfBtn = document.getElementById('pdfExportBtn');
    const shareBtn = document.getElementById('pdfShareBtn');

    if (!monthRecords || monthRecords.length === 0) {
      container.innerHTML = `<p class="text-center text-gray-500 py-4">${t('noEntries')}</p>`;
      if (pdfBtn) pdfBtn.classList.add('hidden');
      if (shareBtn) shareBtn.classList.add('hidden');
      return;
    }

    monthRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

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

    monthRecords.forEach(r => {
      tableHtml += `
        <tr class="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
          <td class="py-4 px-4 font-semibold">${r.date}</td>
          <td class="py-4 px-4">${formatDuration(r.workMinutes)}</td>
          <td class="py-4 px-4">${formatDuration(r.driveMinutes)}</td>
          <td class="py-4 px-4">${r.kmDriven} km</td>
          <td class="py-4 px-4 text-xs">${r.startTime} (${r.startLocation || 'N/A'})<br>${r.endTime} (${r.endLocation || 'N/A'})</td>
        </tr>
      `;
    });

    tableHtml += '</tbody></table></div>';
    container.innerHTML = tableHtml;

    if (pdfBtn) pdfBtn.classList.remove('hidden');
    if (shareBtn) shareBtn.classList.remove('hidden');
  }

  /**
   * Létrehoz egy PDF dokumentumot a riport adataiból.
   * @param {string} action - 'save' (mentés) vagy 'share' (megosztás)
   */
  async function generatePDF(action = 'save') {
    if (currentMonthRecords.length === 0) {
      showCustomAlert(t('noEntries'), 'info');
      return;
    }

    const userName = localStorage.getItem('userName') || '';
    if (!userName) {
      showCustomAlert(t('alertReportNameMissing'), 'info');
      return;
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Fejléc
      doc.setFontSize(18);
      doc.text('Havi Munkaidő Riport', 105, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text(userName, 105, 22, { align: 'center' });
      const selectedMonth = getSelectedYearMonth();
      doc.text(selectedMonth, 105, 29, { align: 'center' });

      // Táblázat adatok előkészítése az autoTable-hez
      const tableBody = currentMonthRecords.map(r => [
        r.date,
        formatDuration(r.workMinutes),
        formatDuration(r.driveMinutes),
        `${r.kmDriven} km`,
        `${r.startTime} (${r.startLocation || 'N/A'})\n${r.endTime} (${r.endLocation || 'N/A'})`
      ]);

      // Összesítések
      const totalWorkMinutes = currentMonthRecords.reduce((sum, r) => sum + r.workMinutes, 0);
      const totalDriveMinutes = currentMonthRecords.reduce((sum, r) => sum + r.driveMinutes, 0);
      const totalKm = currentMonthRecords.reduce((sum, r) => sum + r.kmDriven, 0);

      tableBody.push([
        { content: 'Összesen:', colSpan: 1, styles: { fontStyle: 'bold' } },
        { content: formatDuration(totalWorkMinutes), styles: { fontStyle: 'bold' } },
        { content: formatDuration(totalDriveMinutes), styles: { fontStyle: 'bold' } },
        { content: `${totalKm} km`, styles: { fontStyle: 'bold' } },
        ''
      ]);

      // jsPDF-AutoTable plugin használata a táblázat generálásához (ha be van töltve)
      // Mivel nincs betöltve, egy egyszerűbb szöveges táblázatot készítünk
      let y = 40;
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("Dátum", 14, y);
      doc.text("Munkaidő", 40, y);
      doc.text("Vezetés", 70, y);
      doc.text("Távolság", 100, y);
      doc.text("Helyszínek", 130, y);
      y += 7;
      doc.setFont(undefined, 'normal');

      currentMonthRecords.forEach(r => {
        if (y > 280) { // Oldaltörés, ha megtelt az oldal
            doc.addPage();
            y = 20;
        }
        doc.text(r.date, 14, y);
        doc.text(formatDuration(r.workMinutes), 40, y);
        doc.text(formatDuration(r.driveMinutes), 70, y);
        doc.text(`${r.kmDriven} km`, 100, y);
        doc.text(`${r.startTime} (${r.startLocation || 'N/A'}) - ${r.endTime} (${r.endLocation || 'N/A'})`, 130, y);
        y += 7;
      });
      
      doc.setLineWidth(0.5);
      doc.line(14, y, 200, y);
      y += 7;
      doc.setFont(undefined, 'bold');
      doc.text('Összesen:', 14, y);
      doc.text(formatDuration(totalWorkMinutes), 40, y);
      doc.text(formatDuration(totalDriveMinutes), 70, y);
      doc.text(`${totalKm} km`, 100, y);

      const fileName = `munkaido_riport_${userName.replace(/ /g, '_')}_${selectedMonth}.pdf`;

      if (action === 'save') {
        doc.save(fileName);
      } else if (action === 'share') {
        if (navigator.share && navigator.canShare) {
          const pdfBlob = doc.output('blob');
          const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
          try {
            await navigator.share({
              title: 'Munkaidő Riport',
              text: `Csatolva a(z) ${selectedMonth} havi munkaidő riport.`,
              files: [pdfFile]
            });
          } catch (error) {
            console.error('Megosztási hiba:', error);
          }
        } else {
          showCustomAlert(t('alertShareNotSupported'), 'info');
        }
      }

    } catch (error) {
      console.error("PDF generálási hiba:", error);
      showCustomAlert(`${t('errorPdfGeneration')} ${error.message}`, 'info');
    }
  }

  // === ESEMÉNYKEZELŐK ÉS INICIALIZÁLÁS ===

  function generateMonthlyReport() {
    try {
      const all = getAllRecords();
      const selectedYm = getSelectedYearMonth();
      currentMonthRecords = filterMonthly(all, selectedYm); // Adatok mentése a globális változóba
      
      renderMonthlyReport(currentMonthRecords);

      console.info('[REPORT_V9] összesen:', all.length, '— hónap:', currentMonthRecords.length, 'ym:', selectedYm);
    } catch (e) {
      console.error('[REPORT_V9] hiba:', e);
      const container = document.getElementById('monthlyReportContent');
      if (container) container.innerHTML = `<p class="text-center text-red-500 py-4">Hiba történt a riport generálása közben.</p>`;
    }
  }
  
  function initMonthlyReport() {
    const container = document.getElementById('monthlyReportContent');
    if (container) container.innerHTML = '';
    
    const pdfBtn = document.getElementById('pdfExportBtn');
    const shareBtn = document.getElementById('pdfShareBtn');
    if (pdfBtn) pdfBtn.classList.add('hidden');
    if (shareBtn) shareBtn.classList.add('hidden');

    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector && !monthSelector.value) {
        const now = new Date();
        monthSelector.value = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
    }
  }
  
  // Globálisan elérhetővé tesszük a függvényeket
  window.initMonthlyReport = initMonthlyReport;
  window.generateMonthlyReport = generateMonthlyReport;
  window.exportToPDF = () => generatePDF('save');
  window.sharePDF = () => generatePDF('share');

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
