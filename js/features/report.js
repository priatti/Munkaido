// report.js — v9.1 (ES5-safe)
(function () {

  function formatDurationForPDF(minutes) {
      if (typeof minutes !== 'number' || minutes < 0) return '00:00';
      
      const h = Math.floor(minutes / 60);
      const m = Math.round(minutes % 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

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

async function exportToPDF() {
    const i18n = translations[currentLang];
    const userName = document.getElementById('userNameInput').value;
    
    if (!userName || userName.trim() === '') {
        showCustomAlert(i18n.alertReportNameMissing || 'Kérlek add meg a nevedet a beállításokban!', 'info');
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            throw new Error('jsPDF könyvtár nem érhető el');
        }
        
        const monthSelector = document.getElementById('monthSelector');
        const selectedMonth = monthSelector ? monthSelector.value : '';
        const [year, month] = selectedMonth.split('-');
        
        const monthName = new Date(year, parseInt(month) - 1, 1).toLocaleDateString('de-DE', { 
            year: 'numeric', 
            month: 'long' 
        });
        
        // Adatok szűrése
        const monthRecords = records.filter(record => record.date && record.date.startsWith(selectedMonth));
        
        if (monthRecords.length === 0) {
            throw new Error('Nincs adat a kiválasztott hónaphoz');
        }
        
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Fejléc - pontosan a minta szerint
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('ARBEITSZEITNACHWEIS', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(monthName, 105, 30, { align: 'center' });
        doc.text(userName, 105, 38, { align: 'center' });
        
        // Táblázat pozícionálása
        let yPos = 55;
        const pageHeight = 290;
        
        // Táblázat fejléc
        const headers = ['Datum', 'Beginn', 'Ort', 'Ende', 'Ort', 'Grenzübergänge', 'Arbeit', 'Nacht'];
        const colWidths = [23, 15, 28, 15, 28, 35, 18, 18];
        const colX = [15, 38, 53, 81, 96, 124, 159, 177];
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        
        // Fejléc rajzolása
        headers.forEach((header, i) => {
            doc.rect(colX[i], yPos - 8, colWidths[i], 8);
            doc.text(header, colX[i] + colWidths[i]/2, yPos - 3, { align: 'center' });
        });
        
        // Adatok
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        const daysInMonth = new Date(year, month, 0).getDate();
        const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        
        let totalWork = 0;
        let totalNight = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            if (yPos > pageHeight - 20) {
                doc.addPage();
                yPos = 30;
                
                // Fejléc újra rajzolása új oldalon
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                headers.forEach((header, i) => {
                    doc.rect(colX[i], yPos - 8, colWidths[i], 8);
                    doc.text(header, colX[i] + colWidths[i]/2, yPos - 3, { align: 'center' });
                });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(8);
            }
            
            const dateStr = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
            const dayName = dayNames[dayOfWeek];
            const record = records.find(r => r.date === dateStr);
            
            const rowHeight = 12;
            
            // Datum oszlop
            doc.rect(colX[0], yPos, colWidths[0], rowHeight);
            doc.text(`${day.toString().padStart(2, '0')}.${month.padStart(2, '0')}.`, colX[0] + 1, yPos + 4);
            doc.text(dayName, colX[0] + 1, yPos + 9);
            
            if (record) {
                totalWork += record.workMinutes || 0;
                totalNight += record.nightWorkMinutes || 0;
                
                // Beginn
                doc.rect(colX[1], yPos, colWidths[1], rowHeight);
                doc.text(record.startTime || '-', colX[1] + colWidths[1]/2, yPos + 7, { align: 'center' });
                
                // Start Ort
                doc.rect(colX[2], yPos, colWidths[2], rowHeight);
                const startLoc = (record.startLocation || '').substring(0, 15);
                doc.text(startLoc, colX[2] + 1, yPos + 7);
                
                // Ende
                doc.rect(colX[3], yPos, colWidths[3], rowHeight);
                doc.text(record.endTime || '-', colX[3] + colWidths[3]/2, yPos + 7, { align: 'center' });
                
                // End Ort
                doc.rect(colX[4], yPos, colWidths[4], rowHeight);
                const endLoc = (record.endLocation || '').substring(0, 15);
                doc.text(endLoc, colX[4] + 1, yPos + 7);
                
                // Grenzübergänge
                doc.rect(colX[5], yPos, colWidths[5], rowHeight);
                if (record.crossings && record.crossings.length > 0) {
                    let crossingY = yPos + 4;
                    record.crossings.slice(0, 2).forEach(c => {
                        doc.text(`${c.from}-${c.to} (${c.time})`, colX[5] + 1, crossingY);
                        crossingY += 4;
                    });
                } else {
                    doc.text('-', colX[5] + colWidths[5]/2, yPos + 7, { align: 'center' });
                }
                
                // Arbeit - PDF formátumban
                doc.rect(colX[6], yPos, colWidths[6], rowHeight);
                doc.text(formatDurationForPDF(record.workMinutes || 0), colX[6] + colWidths[6] - 1, yPos + 7, { align: 'right' });
                
                // Nacht - PDF formátumban
                doc.rect(colX[7], yPos, colWidths[7], rowHeight);
                doc.text(formatDurationForPDF(record.nightWorkMinutes || 0), colX[7] + colWidths[7] - 1, yPos + 7, { align: 'right' });
                
            } else {
                // Üres nap
                for (let i = 1; i < headers.length; i++) {
                    doc.rect(colX[i], yPos, colWidths[i], rowHeight);
                    doc.text('-', colX[i] + colWidths[i]/2, yPos + 7, { align: 'center' });
                }
            }
            
            yPos += rowHeight;
        }
        
        // Összesítés
        yPos += 10;
        if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 30;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`Gesamt Arbeitszeit: ${formatDurationForPDF(totalWork)}`, 195, yPos, { align: 'right' });
        doc.text(`Gesamt Nachtzeit: ${formatDurationForPDF(totalNight)}`, 195, yPos + 8, { align: 'right' });
        
        // PDF mentése
        const fileName = `Arbeitszeitnachweis_${userName.replace(/ /g, "_")}_${selectedMonth}.pdf`;
        doc.save(fileName);
        
        console.log('PDF successfully generated');
        
    } catch (error) {
        console.error('PDF generation error:', error);
        showCustomAlert(`${i18n.errorPdfGeneration || 'Hiba a PDF készítése során:'} ${error.message}`, 'info');
    }
}
