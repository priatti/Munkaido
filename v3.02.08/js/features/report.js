// =======================================================
// ===== PONTOS PDF RIPORT A MINTA SZERINT (JAVÍTOTT) ====
// =======================================================

(function () {
  'use-strict';

  let currentMonthRecords = [];

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
    
    if (currentMonthRecords.length === 0) {
      showCustomAlert(t('noEntries'), 'info');
      document.getElementById('monthlyReportContent').innerHTML = `<p class="text-center text-gray-500 py-4">${t('noEntries')}</p>`;
      document.getElementById('pdfExportBtn').classList.add('hidden');
      document.getElementById('pdfShareBtn').classList.add('hidden');
      return;
    }
    
    renderMonthlyReportContent(currentMonthRecords, selectedMonth);
    
    document.getElementById('pdfExportBtn').classList.remove('hidden');
    document.getElementById('pdfShareBtn').classList.remove('hidden');
  }

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
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('ARBEITSZEITNACHWEIS', 105, 15, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(userName, 105, 22, { align: 'center' });
      doc.text(monthName, 105, 29, { align: 'center' });

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
          }
      });
      
      const finalY = doc.lastAutoTable.finalY + 10;
      const totals = currentMonthRecords.reduce((acc, r) => {
        acc.work += r.workMinutes || 0;
        acc.night += r.nightWorkMinutes || 0;
        return acc;
      }, { work: 0, night: 0 });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Gesamt Arbeitszeit: ${formatDurationGerman(totals.work)}`, 14, finalY);
      doc.text(`Gesamt Nachtzeit: ${formatDurationGerman(totals.night)}`, 14, finalY + 7);

      const fileName = `Arbeitszeitnachweis_${userName.replace(/ /g, "_")}_${selectedMonth}.pdf`;
      
      if (action === 'save') {
        doc.save(fileName);
      } else if (action === 'share') {
        if (navigator.share && navigator.canShare) {
            const pdfFile = new File([doc.output('blob')], fileName, { type: 'application/pdf' });
            try {
              await sharePdfSafe(pdfFile, 'Munkaidő riport'); /* replaced direct share */
/* navigator.share({ */ files: [pdfFile], title: 'Havi Riport', text: fileName });
            } catch (error) {
                console.error("Megosztási hiba:", error);
                // JAVÍTOTT, OKOSABB HIBAKEZELÉS
                const userAgent = navigator.userAgent || navigator.vendor || window.opera;
                const isFacebookBrowser = (userAgent.indexOf("FBAV") > -1) || (userAgent.indexOf("Messenger") > -1);
                
                if ((error.name === 'NotAllowedError' || error.message.includes('Permission denied')) && isFacebookBrowser) {
                    showCustomAlert(t('alertShareInAppBrowser'), 'info');
                } else {
                    showCustomAlert(`${t('errorSharing')} ${error.message}`, 'info');
                }
            }
        } else {
            showCustomAlert(t('alertShareNotSupported'), 'info');
        }
      }
    } catch (e) {
      console.error("PDF Hiba:", e);
      showCustomAlert(`PDF generálási hiba: ${e.message}`, 'info');
    }
  }

  function initMonthlyReport() {
    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector && !monthSelector.value) {
      const now = new Date();
      monthSelector.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    document.getElementById('monthlyReportContent').innerHTML = '';
    document.getElementById('pdfExportBtn').classList.add('hidden');
    document.getElementById('pdfShareBtn').classList.add('hidden');
  }

  // Globális függvények
  window.initMonthlyReport = initMonthlyReport;
  window.generateMonthlyReport = generateMonthlyReport;
  window.exportToPDF = () => generateAndProcessPDF('save');
  window.sharePDF = () => generateAndProcessPDF('share');

})();

    } catch (err) {
        console.error("Megosztási hiba:", err);
        alert("Sajnálom, a megosztás nem sikerült. Próbáld a letöltés gombbal, majd onnan megosztva. 🙂");
    }
}


// ---- Added: multilingual safe share for PWA/unsupported devices ----
function t(msgHu, msgDe) {
    return (navigator.language && navigator.language.startsWith("de")) ? msgDe : msgHu;
}

async function sharePdfSafe(pdfFile, titleText = 'Munkaidő riport') {
    try {
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            await sharePdfSafe(pdfFile, pdfFileName || 'Arbeitszeitnachweis');
        } else {
            alert(t("Ezen az eszközön nem támogatott a közvetlen megosztás. Megpróbáljam megnyitni a rendszer PDF-nézőben? Ha nem működik, használd a Letöltés gombot. 🙂", "Auf diesem Gerät wird das direkte Teilen nicht unterstützt. Soll ich versuchen, die PDF im System-Viewer zu öffnen? Wenn das nicht funktioniert, nutze bitte 'Herunterladen'. 🙂"));
openPdfInSystemViewer(pdfFile, 'report.pdf');
}
    } catch (err) {
        console.error("Megosztási hiba:", err);
        alert(t(
            "Sajnálom, a megosztás nem sikerült. Próbáld a letöltés gombbal, majd onnan megosztva. 🙂",
            "Entschuldigung, das Teilen ist fehlgeschlagen. Bitte nutze die Schaltfläche 'Herunterladen' und teile die Datei von dort. 🙂"
        ));
    }
}


// ---- Added: open PDF in system viewer (fallback for PWA) ----
function openPdfInSystemViewer(pdfFile, fileName = 'report.pdf') {
    try {
        const blob = pdfFile instanceof Blob ? pdfFile : new Blob([pdfFile], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const opened = window.open(url, '_blank'); // many Android devices open built-in viewer here
        if (!opened) {
            // Fallback: trigger download if popup blocked
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
        console.error("PDF megnyitás hiba:", e);
        alert(t(
            "Sajnálom, nem sikerült megnyitni a PDF-et. Próbáld a letöltés gombbal, majd onnan megnyitva. 🙂",
            "Entschuldigung, die PDF konnte nicht geöffnet werden. Bitte nutze 'Herunterladen' und öffne die Datei von dort. 🙂"
        ));
    }
}
