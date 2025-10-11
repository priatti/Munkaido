// =======================================================
// ===== PONTOS PDF RIPORT - GURIGO LÁBLÉCCEL =========
// =======================================================

(function () {
  'use strict';

  let currentMonthRecords = [];
  let generatedPdfBlob = null;

  // === SEGÉDFÜGGVÉNYEK ===

  function t(key) {
    return (typeof translations !== 'undefined' && translations[currentLang] && translations[currentLang][key]) || key;
  }

  function getAllRecords() {
    return (typeof records !== 'undefined' && Array.isArray(records)) ? records : [];
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
    return `${h}h ${String(m).padStart(2, '0')}p`;
  }
  
  // === FŐ FUNKCIÓK ===

  function generateMonthlyReport() {
    const selectedMonth = document.getElementById('monthSelector').value;
    if (!selectedMonth) {
      showCustomAlert('Kérlek válassz egy hónapot!', 'info');
      return;
    }
    
    currentMonthRecords = getAllRecords().filter(record => record.date && record.date.startsWith(selectedMonth));
    const reportContainer = document.getElementById('monthlyReportContent');
    
    if (currentMonthRecords.length === 0) {
      showCustomAlert(t('noEntries'), 'info');
      reportContainer.innerHTML = `<p class="text-center text-gray-500 py-4">${t('noEntries')}</p>`;
      document.getElementById('pdfExportBtn').classList.add('hidden');
      document.getElementById('pdfShareBtn').classList.add('hidden');
      return;
    }

    // Biztonságos fordítási objektum létrehozása, ami garantáltan működik
    const langPref = (typeof currentLang === 'string' && currentLang) ? currentLang : (localStorage.getItem('language') || 'hu');
    const i18nReport = (typeof translations !== 'undefined' && translations[langPref])
      ? translations[langPref]
      : { reportReady: 'A riport elkészült!', reportUseButtons: 'A letöltéshez vagy megosztáshoz használd a fenti gombokat.' };

    // Toast értesítés a biztonságos objektummal
    if (typeof showToast === 'function') {
      showToast(i18nReport.reportReady, i18nReport.reportUseButtons, 'success', { position: 'top-right', duration: 6000 });
    }

    // JAVÍTOTT HTML RÉSZ A HELYES VÁLTOZÓ BEHELYETTESÍTÉSSEL (a '\' karakterek eltávolítva)
    reportContainer.innerHTML = `
      <div class="mt-3 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700 p-6 text-center shadow-md">
        <div class="mx-auto mb-3 w-full flex items-center justify-center">
          <svg viewBox="0 0 120 120" width="112" height="112" class="block">
            <circle cx="60" cy="60" r="56" fill="#22c55e"></circle>
            <path d="M38 62l14 14 30-34" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </div>
        <p class="font-semibold text-green-700 dark:text-green-300 text-base">${i18nReport.reportReady}</p>
        <p class="text-sm text-green-700/80 dark:text-green-300/80 mt-1">${i18nReport.reportUseButtons}</p>
      </div>
    `;

    document.getElementById('pdfExportBtn').classList.remove('hidden');
    document.getElementById('pdfShareBtn').classList.remove('hidden');
  }

  // Ez a függvény már nem hívódik meg a riport generálásakor, de a PDF készítéshez még kellhet
  function renderMonthlyReportContent(records, selectedMonth) {
    const container = document.getElementById('monthlyReportContent');
    const userName = localStorage.getItem('userName') || 'N/A';
    const [year, month] = selectedMonth.split('-');
    const monthName = new Date(year, parseInt(month) - 1, 1).toLocaleDateString('de-DE', { year: 'numeric', month: 'long' });

    const totals = records.reduce((acc, record) => {
      acc.workMinutes += record.workMinutes || 0;
      acc.nightWorkMinutes += record.nightWorkMinutes || 0;
      return acc;
    }, { workMinutes: 0, nightWorkMinutes: 0 });

    container.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 mb-4">
        <h3 class="text-xl font-bold text-center mb-4">ARBEITSZEITNACHWEIS</h3>
        <div class="text-center mb-4">
          <p class="text-lg font-semibold">${monthName}</p>
          <p class="text-gray-600 dark:text-gray-400">${userName}</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead class="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th class="border p-2 text-left">Datum</th>
                <th class="border p-2 text-left">Beginn</th>
                <th class="border p-2 text-left">Ort</th>
                <th class="border p-2 text-left">Ende</th>
                <th class="border p-2 text-left">Ort</th>
                <th class="border p-2 text-left">Grenzübergänge</th>
                <th class="border p-2 text-right">Arbeit</th>
                <th class="border p-2 text-right">Nacht</th>
              </tr>
            </thead>
            <tbody>
              ${generateMonthTableHTML(records, year, month)}
            </tbody>
          </table>
        </div>
        <div class="mt-4 text-right font-bold">
          <p>Gesamt Arbeitszeit: ${formatDurationGerman(totals.workMinutes)}</p>
          <p>Gesamt Nachtzeit: ${formatDurationGerman(totals.nightWorkMinutes)}</p>
        </div>
      </div>`;
  }

  function generateMonthTableHTML(records, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    let html = '';

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
      const record = records.find(r => r.date === dateStr);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const rowClass = isWeekend ? 'bg-gray-50 dark:bg-gray-900/50' : '';

      html += `<tr class="${rowClass}">
        <td class="border p-2 font-semibold">${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.<br><span class="text-xs font-normal text-gray-600">${dayNames[dayOfWeek]}</span></td>`;

      if (record) {
        const crossingsText = (record.crossings && record.crossings.length > 0)
          ? record.crossings.map(c => `${c.from}-${c.to} (${c.time})`).join('<br>')
          : '';
        html += `
          <td class="border p-2">${record.startTime || ''}</td>
          <td class="border p-2">${record.startLocation || ''}</td>
          <td class="border p-2">${record.endTime || ''}</td>
          <td class="border p-2">${record.endLocation || ''}</td>
          <td class="border p-2 text-xs">${crossingsText}</td>
          <td class="border p-2 text-right font-mono">${formatDurationGerman(record.workMinutes || 0)}</td>
          <td class="border p-2 text-right font-mono">${formatDurationGerman(record.nightWorkMinutes || 0)}</td>`;
      } else {
        html += `<td class="border p-2" colspan="7"></td>`;
      }
      html += '</tr>';
    }
    return html;
  }

  async function generateAndProcessPDF(action = 'save') {
    const userName = localStorage.getItem('userName');
    if (!userName || userName.trim() === '') {
      showCustomAlert(t('alertReportNameMissing'), 'info');
      return;
    }
    if (currentMonthRecords.length === 0) {
        showCustomAlert(t('noEntries'), 'info');
        return;
    }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      const selectedMonth = document.getElementById('monthSelector').value;
      const [year, month] = selectedMonth.split('-');
      const monthIndex = parseInt(month, 10) - 1;
      const monthName = new Date(year, monthIndex, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
      
      function addHeader(doc) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('ARBEITSZEITNACHWEIS', 105, 15, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text(userName, 105, 22, { align: 'center' });
        doc.text(monthName, 105, 29, { align: 'center' });
      }

      function addFooter(doc) {
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        
        const footerText = 'Erstellt mit GuriGO - gurigo.eu';
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
        
        doc.setTextColor(0, 0, 0);
      }

      addHeader(doc);

      const headers = ['Datum', 'Beginn', 'Ort', 'Ende', 'Ort', 'Grenzübergänge', 'Arbeit', 'Nacht'];
      const autoTableBody = [];
      const daysInMonth = new Date(year, month, 0).getDate();
      const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

      for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, monthIndex, day);
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const record = currentMonthRecords.find(r => r.date === dateStr);
          const dateCell = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.\n${dayNames[date.getDay()]}`;

          if (record) {
              const crossingsText = record.crossings && record.crossings.length > 0 
                  ? record.crossings.map(c => `${c.from}-${c.to} (${c.time})`).join('\n') 
                  : '';
              autoTableBody.push([
                  dateCell,
                  record.startTime || '',
                  record.startLocation || '',
                  record.endTime || '',
                  record.endLocation || '',
                  crossingsText,
                  { content: formatDurationGerman(record.workMinutes || 0), styles: { halign: 'right' } },
                  { content: formatDurationGerman(record.nightWorkMinutes || 0), styles: { halign: 'right' } }
              ]);
          } else {
              autoTableBody.push([dateCell, '', '', '', '', '', '', '']);
          }
      }

      doc.autoTable({
          startY: 40,
          head: [headers],
          body: autoTableBody,
          theme: 'grid',
          headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 1.5, valign: 'middle' },
          columnStyles: {
              0: { cellWidth: 22 }, 
              5: { cellWidth: 30 },
              6: { cellWidth: 18 },
              7: { cellWidth: 18 }
          },
          didParseCell: function(data) {
              if (data.section === 'body') {
                  const currentDay = new Date(year, monthIndex, data.row.index + 1).getDay();
                  if (currentDay === 0 || currentDay === 6) {
                      data.cell.styles.fillColor = '#f2f2f2';
                  }
              }
          },
          didDrawPage: function(data) {
              if (data.pageNumber > 1) {
                  addHeader(doc);
              }
              addFooter(doc);
          },
          margin: { top: 35, bottom: 20 },
          pageBreak: 'auto',
          rowPageBreak: 'avoid',
          showHead: 'everyPage'
      });
      
      const finalY = doc.lastAutoTable.finalY + 10;
      const totals = currentMonthRecords.reduce((acc, r) => {
        acc.work += r.workMinutes || 0;
        acc.night += r.nightWorkMinutes || 0;
        return acc;
      }, { work: 0, night: 0 });

      const pageHeight = doc.internal.pageSize.height;
      if (finalY > pageHeight - 30) {
        doc.addPage();
        addHeader(doc);
        addFooter(doc);
        const newY = 50;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`Gesamt Arbeitszeit: ${formatDurationGerman(totals.work)}`, 14, newY);
        doc.text(`Gesamt Nachtzeit: ${formatDurationGerman(totals.night)}`, 14, newY + 7);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`Gesamt Arbeitszeit: ${formatDurationGerman(totals.work)}`, 14, finalY);
        doc.text(`Gesamt Nachtzeit: ${formatDurationGerman(totals.night)}`, 14, finalY + 7);
      }

      const fileName = `Arbeitszeitnachweis_${userName.replace(/ /g, "_")}_${selectedMonth}.pdf`;
      
      if (action === 'save') {
        doc.save(fileName);
      } else if (action === 'prepare_share') {
        generatedPdfBlob = doc.output('blob');
        const shareContainer = document.getElementById('monthlyReportContent');
        
        const shareText = currentLang === 'de' 
            ? 'PDF erfolgreich erstellt!'
            : 'A PDF elkészült!';
        const shareButtonText = currentLang === 'de'
            ? '📲 Teilen / Öffnen'
            : '📲 Megosztás / Megnyitás';
        const downloadButtonText = currentLang === 'de'
            ? '📥 Herunterladen'
            : '📥 Letöltés';
        
        shareContainer.innerHTML = `
          <div class="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg text-center space-y-3">
            <p class="font-semibold mb-2">${shareText}</p>
            <button class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold" onclick="sharePreparedPDF('${fileName}')">
              ${shareButtonText}
            </button>
            <button class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg text-sm" onclick="window.exportToPDF()">
              ${downloadButtonText}
            </button>
          </div>
        `;
      }
    } catch (e) {
      console.error("PDF Hiba:", e);
      showCustomAlert(`PDF generálási hiba: ${e.message}`, 'info');
    }
  }

  async function sharePreparedPDF(fileName) {
    if (!generatedPdfBlob) {
        showCustomAlert('Hiba: Nincs előkészített PDF a megosztáshoz.', 'info');
        return;
    }

    if (navigator.share && navigator.canShare) {
        const pdfFile = new File([generatedPdfBlob], fileName, { type: 'application/pdf' });
        
        if (navigator.canShare({ files: [pdfFile] })) {
            try {
                await navigator.share({
                    files: [pdfFile],
                    title: 'Havi Riport',
                    text: fileName
                });
                return;
            } catch (error) {
                console.error("Megosztási hiba:", error);
                
                if (error.name === 'AbortError') {
                    return;
                }
                
                console.log('[Report] Share failed, trying fallback method...');
            }
        }
    }
    
    try {
        const blobUrl = URL.createObjectURL(generatedPdfBlob);
        const openedWindow = window.open(blobUrl, '_blank');
        
        if (openedWindow) {
            showCustomAlert(
                currentLang === 'de' 
                    ? 'PDF geöffnet. Sie können es nun aus dem PDF-Viewer teilen oder herunterladen.' 
                    : 'PDF megnyitva. Most megoszthatod vagy letöltheted a PDF nézegetőből.',
                'success'
            );
            
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            return;
        }
    } catch (e) {
        console.error('[Report] Fallback 1 failed:', e);
    }
    
    try {
        const blobUrl = URL.createObjectURL(generatedPdfBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showCustomAlert(
            currentLang === 'de' 
                ? 'PDF wird heruntergeladen. Nach dem Download können Sie es teilen.' 
                : 'PDF letöltése megkezdődött. Letöltés után megoszthatod.',
            'success'
        );
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
        console.error('[Report] Fallback 2 failed:', e);
        showCustomAlert(
            currentLang === 'de'
                ? 'Fehler beim Teilen. Bitte verwenden Sie die Download-Schaltfläche.'
                : 'Megosztás nem sikerült. Kérlek használd a Letöltés gombot.',
            'info'
        );
    }
}

  function initMonthlyReport() {
    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector && !monthSelector.value) {
      const now = new Date();
      monthSelector.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const reportContent = document.getElementById('monthlyReportContent');
    if (reportContent) reportContent.innerHTML = '';
    
    const pdfExportBtn = document.getElementById('pdfExportBtn');
    const pdfShareBtn = document.getElementById('pdfShareBtn');
    if (pdfExportBtn) pdfExportBtn.classList.add('hidden');
    if (pdfShareBtn) pdfShareBtn.classList.add('hidden');
  }

  // Globális függvények
  window.initMonthlyReport = initMonthlyReport;
  window.generateMonthlyReport = generateMonthlyReport;
  window.exportToPDF = () => generateAndProcessPDF('save');
  window.sharePDF = () => generateAndProcessPDF('prepare_share');
  window.sharePreparedPDF = sharePreparedPDF;

// === MODERN TOAST ÉRTESÍTÉS ===
function showToast(title, message = '', type = 'success', options = {}) {
  const { position = 'top', duration = 4200, action } = options;
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  container.dataset.position = position;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon" aria-hidden="true">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    ${action ? `<button class="toast-action">${action.label}</button>` : ''}
    <button class="toast-close" aria-label="Close">✖</button>
  `;

  const close = () => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 250);
  };
  toast.querySelector('.toast-close').addEventListener('click', close);
  if (action && typeof action.onClick === 'function') {
    toast.querySelector('.toast-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      action.onClick();
      close();
    });
  }
  setTimeout(close, duration);

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
}

})();