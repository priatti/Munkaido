// =======================================================
// ===== PDF RIPORTOK (FEATURE) ==========================
// =======================================================

let currentMonthlyData = null;
const germanMonths = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const germanFullDays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

// Riport fül inicializálása
function initMonthlyReport() {
    document.getElementById('monthSelector').value = new Date().toISOString().slice(0, 7);
    document.getElementById('monthlyReportContent').innerHTML = '';
    document.getElementById('pdfExportBtn').classList.add('hidden');
    document.getElementById('pdfShareBtn').classList.add('hidden');
}

// Riport generálásának elindítása
function generateMonthlyReport() {
    const i18n = translations[currentLang];
    const userName = document.getElementById('userNameInput').value.trim();
    if (!userName && currentLang === 'de') {
        showCustomAlert(i18n.alertReportNameMissing, 'info', () => showTab('settings'));
        return;
    }

    const selectedMonth = document.getElementById("monthSelector").value;
    const monthRecords = records.filter(record => record.date.startsWith(selectedMonth));
    monthRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
    currentMonthlyData = { month: selectedMonth, records: monthRecords };

    document.getElementById('monthlyReportContent').innerHTML = `<div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-center">${i18n.reportPrepared}</div>`;
    document.getElementById('pdfExportBtn').classList.remove('hidden');
    if (navigator.share && navigator.canShare({ files: [] })) {
        document.getElementById('pdfShareBtn').classList.remove('hidden');
    }
}

// PDF generálása és letöltése
function exportToPDF() {
    generateAndProcessPDF('save');
}

// PDF generálása és megosztása
async function sharePDF() {
    generateAndProcessPDF('share');
}

// A közös PDF generáló logika
async function generateAndProcessPDF(action) {
    const i18n = translations[currentLang];
    if (!currentMonthlyData) {
        showCustomAlert(i18n.alertGenerateReportFirst, "info");
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const userName = document.getElementById('userNameInput').value || 'N/A';
        const [year, month] = currentMonthlyData.month.split('-');
        const monthName = germanMonths[parseInt(month) - 1];
        
        // --- PDF tartalom generálása ---
        doc.setFontSize(18); doc.setFont(undefined, 'bold'); doc.text('ARBEITSZEITNACHWEIS', 105, 15, { align: 'center' });
        doc.setFontSize(14); doc.setFont(undefined, 'normal'); doc.text(`${monthName} ${year}`, 105, 23, { align: 'center' });
        doc.setFontSize(12); doc.text(userName, 105, 31, { align: 'center' });
        
        // ... (A részletes táblázatrajzoló kód ide kerül)
        // A kód hossza miatt a lényeget emelem ki, a teljes logika az eredeti fájlban van
        
        const tableData = generateTableDataForMonth(year, month);
        let totalWorkMinutes = tableData.totalWorkMinutes;
        let totalNightWorkMinutes = tableData.totalNightWorkMinutes;

        // Táblázat kirajzolása (ez egy komplexebb logika, itt egyszerűsítve)
        drawPdfTable(doc, tableData.rows);

        let yPos = doc.autoTable.previous.finalY || 60;
        if (yPos > 260) { doc.addPage(); yPos = 20; }

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(`Gesamt Arbeitszeit: ${formatAsHoursAndMinutes(totalWorkMinutes)}`, 205, yPos + 10, { align: 'right' });
        doc.text(`Gesamt Nachtzeit: ${formatAsHoursAndMinutes(totalNightWorkMinutes)}`, 205, yPos + 16, { align: 'right' });
        // --- PDF generálás vége ---

        const fileName = `Arbeitszeitnachweis-${userName.replace(/ /g, "_")}-${year}-${monthName}.pdf`;
        
        if (action === 'save') {
            doc.save(fileName);
        } else if (action === 'share') {
            if (!navigator.share) {
                showCustomAlert(i18n.alertShareNotSupported, "info");
                return;
            }
            const pdfBlob = doc.output('blob');
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
            const shareData = {
                files: [pdfFile],
                title: `Arbeitszeitnachweis - ${monthName} ${year}`,
                text: `Anbei mein Arbeitszeitnachweis für ${monthName} ${year}.`,
            };
            if (navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                throw new Error(i18n.shareErrorCannotShare);
            }
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log(i18n.shareAborted);
        } else {
            console.error('PDF/Share error:', error);
            showCustomAlert(`${i18n.errorSharing} ${error.message}`, 'info');
        }
    }
}
// Megjegyzés: A teljes, részletes PDF táblázatrajzoló funkció (`drawPdfTable` és `generateTableDataForMonth`)
// az eredeti `script.js`-ből átemelhető ide a komplexitása miatt. 


// === IMPLEMENTATION ADDED (generateTableDataForMonth) ===

function generateTableDataForMonth(year, month) {
    const rows = [];
    let totalWorkMinutes = 0;
    let totalNightWorkMinutes = 0;

    if (!currentMonthlyData || !currentMonthlyData.records) {
        return { rows, totalWorkMinutes, totalNightWorkMinutes };
    }

    const daysHU = ['Vasárnap','Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat'];
    const daysDE = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

    currentMonthlyData.records.forEach(rec => {
        const d = new Date(rec.date + 'T00:00:00');
        const weekday = (currentLang === 'de' ? daysDE : daysHU)[d.getDay()];
        const dateLabel = `${rec.date}\n${weekday}`;

        const begin = rec.startTime || '';
        const beginPlace = (rec.startLocation || '').toString();
        const end = rec.endTime || '';
        const endPlace = (rec.endLocation || '').toString();

        let crossingsText = '-';
        try {
            const arr = rec.crossings || rec.borderCrossings || [];
            if (arr && arr.length) {
                crossingsText = arr.map(c => {
                    const fr = (c.from || c.fr || '').toString().toUpperCase();
                    const to = (c.to || '').toString().toUpperCase();
                    const t  = (c.time || '').toString();
                    return `${fr}-${to}${t ? ` (${t})` : ''}`;
                }).join('\n');
            }
        } catch(e) {}

        const work = formatAsHoursAndMinutes(rec.workMinutes || 0);
        const night = formatAsHoursAndMinutes(rec.nightWorkMinutes || 0);

        rows.push([dateLabel, begin, beginPlace, end, endPlace, crossingsText, work, night]);

        totalWorkMinutes += (rec.workMinutes || 0);
        totalNightWorkMinutes += (rec.nightWorkMinutes || 0);
    });

    return { rows, totalWorkMinutes, totalNightWorkMinutes };
}


// === IMPLEMENTATION ADDED (drawPdfTable) ===

// === STYLED TABLE (matches legacy report layout) ===
function drawPdfTable(doc, rows) {
    // Columns: Datum | Beginn | Ort | Ende | Ort | Grenzübergänge | Arbeit | Nacht
    const left = 12, right = 200;
    let y = 40;

    // Header bar
    function drawHeader() {
        doc.setFontSize(18); doc.setFont(undefined, 'bold');
        doc.text(currentLang === 'de' ? 'ARBEITSZEITNACHWEIS' : 'MUNKAIDŐ NYILVÁNTARTÓ', 105, 15, { align: 'center' });

        const [year, month] = currentMonthlyData.month.split('-');
        const mName = (currentLang === 'de' ? germanMonths : germanMonths)[parseInt(month) - 1];
        doc.setFontSize(12); doc.setFont(undefined, 'normal');
        doc.text(`${mName} ${year}`, 105, 22, { align: 'center' });

        const userName = document.getElementById('userNameInput').value || 'N/A';
        doc.text(userName, 105, 28, { align: 'center' });

        // Table header row
        y = 34;
        const headers = (currentLang === 'de') ?
            ['Datum', 'Beginn', 'Ort', 'Ende', 'Ort', 'Grenzübergänge', 'Arbeit', 'Nacht'] :
            ['Dátum', 'Kezdés', 'Hely', 'Befejezés', 'Hely', 'Határátlépések', 'Munka', 'Éjszaka'];
        const widths = [24, 18, 28, 18, 28, 36, 18, 18];
        let x = left;
        doc.setFillColor(245,245,245);
        doc.rect(left, y, right-left, 7, 'F');
        doc.setFontSize(10); doc.setFont(undefined, 'bold');
        headers.forEach((h, idx) => {
            doc.text(h, x + 2, y + 5);
            x += widths[idx];
        });
        doc.setDrawColor(200); doc.setLineWidth(0.2);
        doc.line(left, y+7, right, y+7);
        y += 9;
        return widths;
    }

    const widths = drawHeader();

    // helpers
    function drawRow(cols, zebra) {
        let x = left;
        const lineHeight = 5.5;

        // compute needed height (wrap text per cell)
        const wrapped = cols.map((txt, i) => {
            const maxW = widths[i] - 3;
            const lines = doc.splitTextToSize(String(txt ?? ''), maxW);
            return lines;
        });
        const h = Math.max(...wrapped.map(a => a.length)) * lineHeight;

        // background zebra
        if (zebra) {
            doc.setFillColor(248, 250, 252);
            doc.rect(left, y - 1.5, right-left, h+3, 'F');
        }

        // draw cell texts
        doc.setFontSize(9); doc.setFont(undefined, 'normal');
        wrapped.forEach((lines, i) => {
            let yy = y + 4;
            lines.forEach(ln => {
                doc.text(ln, x + 2, yy);
                yy += lineHeight;
            });
            x += widths[i];
        });

        // row bottom line
        doc.setDrawColor(230); doc.setLineWidth(0.2);
        doc.line(left, y + h + 1, right, y + h + 1);
        y += h + 3;

        // page break
        if (y > 270) {
            doc.addPage();
            y = 40;
            drawHeader();
        }
    }

    // render body rows
    for (let r = 0; r < rows.length; r++) {
        drawRow(rows[r], r % 2 === 0);
    }

    // expose final Y
    if (!doc.autoTable) doc.autoTable = { previous: {} };
    doc.autoTable.previous.finalY = y;
}

