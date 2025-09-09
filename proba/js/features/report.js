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
