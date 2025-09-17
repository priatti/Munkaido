// report.js — JAVÍTOTT, TELJES VERZIÓ
(function () {
  'use-strict';

  let currentMonthRecords = []; // A generált riport adatait itt tároljuk

  // === SEGÉDFÜGGVÉNYEK ===

  const germanDays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const germanMonths = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

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

  function formatDuration(minutes) {
    if (typeof window.formatDuration === 'function') {
        return window.formatDuration(minutes);
    }
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}ó ${m}p`;
  }

  function formatDurationGerman(minutes) {
    if (minutes === null || typeof minutes === 'undefined' || minutes < 0) minutes = 0;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${pad2(m)}p`;
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
   * Létrehoz egy PDF dokumentumot a szigorú német formátum alapján.
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
      const doc = new jsPDF('p', 'mm', 'a4');

      const selectedYm = getSelectedYearMonth();
      const year = parseInt(selectedYm.slice(0, 4), 10);
      const monthIndex = parseInt(selectedYm.slice(5, 7), 10) - 1;

      doc.setFont(undefined, 'bold');
      doc.setFontSize(16);
      doc.text('ARBEITSZEITNACHWEIS', 105, 15, { align: 'center' });
      doc.setFont(undefined, 'normal');
      doc.setFontSize(12);
      doc.text(`${germanMonths[monthIndex]} ${year}`, 105, 22, { align: 'center' });
      doc.text(userName, 105, 29, { align: 'center' });

      let y = 40;
      const pageBottom = 280;
      const xPos = { datum: 14, beginn: 38, ort1: 52, ende: 80, ort2: 94, grenz: 125, arbeit: 168, nacht: 188 };

      function drawTableHeader() {
        doc.setFont(undefined, 'bold');
        doc.setFontSize(9);
        doc.text("Datum", xPos.datum, y);
        doc.text("Beginn", xPos.beginn, y);
        doc.text("Ort", xPos.ort1, y);
        doc.text("Ende", xPos.ende, y);
        doc.text("Ort", xPos.ort2, y);
        doc.text("Grenzübergänge", xPos.grenz, y);
        doc.text("Arbeit", xPos.arbeit, y);
        doc.text("Nacht", xPos.nacht, y);
        y += 3;
        doc.setLineWidth(0.2);
        doc.line(14, y, 200, y);
        y += 6;
      }
      drawTableHeader();

      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, monthIndex, day);
        const dateString = `${pad2(day)}.${pad2(monthIndex + 1)}.`;
        const dayName = germanDays[currentDate.getDay()];
        const record = currentMonthRecords.find(r => r.date === `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`);
        
        const crossingsText = (record && record.crossings && record.crossings.length > 0)
          ? record.crossings.map(c => `${c.from}-${c.to} (${c.time})`).join('\n')
          : '';
        const crossingsLines = doc.splitTextToSize(crossingsText, 30);
        const rowHeight = Math.max(10, crossingsLines.length * 4 + 2);

        if (y + rowHeight > pageBottom) {
          doc.addPage();
          y = 20;
          drawTableHeader();
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);
        }

        doc.text(dateString, xPos.datum, y);
        doc.text(dayName, xPos.datum, y + 4);

        if (record) {
          doc.text(record.startTime || '', xPos.beginn, y);
          doc.text(doc.splitTextToSize(record.startLocation || '', 25), xPos.ort1, y);
          doc.text(record.endTime || '', xPos.ende, y);
          doc.text(doc.splitTextToSize(record.endLocation || '', 28), xPos.ort2, y);
          doc.text(crossingsLines, xPos.grenz, y);
          doc.text(formatDurationGerman(record.workMinutes), xPos.arbeit, y);
          doc.text(formatDurationGerman(record.nightWorkMinutes), xPos.nacht, y);
        }
        y += rowHeight;
        doc.line(14, y - 2, 200, y - 2);
      }

      y += 5;
       if (y > pageBottom - 20) {
          doc.addPage();
          y = 20;
       }
      const totalWorkMinutes = currentMonthRecords.reduce((sum, r) => sum + r.workMinutes, 0);
      const totalNightMinutes = currentMonthRecords.reduce((sum, r) => sum + r.nightWorkMinutes, 0);

      doc.setFont(undefined, 'bold');
      doc.text(`Gesamt Arbeitszeit: ${formatDurationGerman(totalWorkMinutes)}`, 14, y);
      y += 5;
      doc.text(`Gesamt Nachtzeit: ${formatDurationGerman(totalNightMinutes)}`, 14, y);

      const fileName = `Arbeitszeitnachweis_${userName.replace(/ /g, '_')}_${selectedYm}.pdf`;

      if (action === 'save') {
        doc.save(fileName);
      } else if (action === 'share') {
        if (navigator.share && navigator.canShare) {
          const pdfFile = new File([doc.output('blob')], fileName, { type: 'application/pdf' });
          await navigator.share({ files: [pdfFile], title: 'Havi Riport', text: fileName });
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
      currentMonthRecords = filterMonthly(all, selectedYm);
      
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

})();
