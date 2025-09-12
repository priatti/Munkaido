// =======================================================
// ===== PDF RIPORTOK (CLEAN IMPLEMENTATION) ============
// =======================================================


let currentMonthlyData = null;

// Try to collect month records from app state/localStorage in a robust way
function collectMonthRecords(selectedMonth) {
    const isRecord = (o) => o && typeof o === 'object' && typeof o.date === 'string';
    const pick = (arr) => Array.isArray(arr) ? arr.filter(r => isRecord(r) && r.date.startsWith(selectedMonth)) : [];

    // 1) Common globals
    const candidates = [
        window.records, window.workDays, window.workdays, window.entries, window.days,
        window.savedRecords, window.savedDays, window.data && window.data.workdays
    ];
    for (const c of candidates) {
        const hit = pick(c);
        if (hit.length) return hit.sort((a,b)=> (a.date>b.date?1:-1));
    }

    // 2) LocalStorage hunt
    try {
        const results = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const raw = localStorage.getItem(key);
            if (!raw || raw.length > 5_000_000) continue; // skip huge blobs
            try {
                const val = JSON.parse(raw);
                if (Array.isArray(val)) {
                    results.push(...pick(val));
                } else if (val && typeof val === 'object') {
                    // month map?
                    if (Array.isArray(val[selectedMonth])) {
                        results.push(...pick(val[selectedMonth]));
                    } else {
                        // nested arrays
                        for (const k in val) {
                            const v = val[k];
                            if (Array.isArray(v)) results.push(...pick(v));
                        }
                    }
                }
            } catch(_) { /* ignore non-JSON */ }
        }
        if (results.length) return results.sort((a,b)=> (a.date>b.date?1:-1));
    } catch(_) {}

    return [];
}

// Német hónapnevek és napnevek
const germanMonths = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
const germanFullDays = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

// Riport fül inicializálása
function initMonthlyReport() {
    const monthSel = document.getElementById('monthSelector');
    if (monthSel) monthSel.value = new Date().toISOString().slice(0, 7);

    const content = document.getElementById('monthlyReportContent');
    if (content) content.innerHTML = '';

    const exportBtn = document.getElementById('pdfExportBtn');
    const shareBtn  = document.getElementById('pdfShareBtn');
    if (exportBtn) exportBtn.classList.add('hidden');
    if (shareBtn)  shareBtn.classList.add('hidden');
}

// Havi riport előkészítése
function generateMonthlyReport() {
    const i18n = translations[currentLang];
    const userName = (document.getElementById('userNameInput')?.value || '').trim();

    // Német riporthoz a név legyen meg (DE-ben kérted, HU-ban nem kötelező, de itt nem tiltjuk)
    if (!userName && currentLang === 'de') {
        showCustomAlert(i18n?.alertReportNameMissing || 'Bitte geben Sie den Namen ein.', 'info', () => showTab('settings'));
        return;
    }

    const selectedMonth = document.getElementById('monthSelector')?.value || new Date().toISOString().slice(0,7);

    // `records` globál: az app fő adathalmaza
    const monthRecords = collectMonthRecords(selectedMonth);
    currentMonthlyData = { month: selectedMonth, records: monthRecords };

    const content = document.getElementById('monthlyReportContent');
    if (content) {
        content.innerHTML = `<div class="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100 p-4 rounded-lg text-center">
            ${i18n?.reportPrepared || 'Der Monatsbericht wurde vorbereitet.'}
        </div>`;
    }

    const exportBtn = document.getElementById('pdfExportBtn');
    const shareBtn  = document.getElementById('pdfShareBtn');
    if (exportBtn) exportBtn.classList.remove('hidden');
    if (shareBtn && navigator.share) shareBtn.classList.remove('hidden');
}

// PDF készítés + mentés/megosztás (mindig NÉMET nyelvű riport)
async function generateAndProcessPDF(action) {
    const i18n = translations[currentLang];
    if (!currentMonthlyData) {
        showCustomAlert(i18n?.alertGenerateReportFirst || 'Bitte bereiten Sie zuerst den Monatsbericht vor.', 'info');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p','mm','a4');

        const userName = (document.getElementById('userNameInput')?.value || 'N/A').trim() || 'N/A';
        const [year, month] = currentMonthlyData.month.split('-');
        const monthName = germanMonths[parseInt(month)-1];

        // Fejléc (mindig német)
        doc.setFontSize(18); doc.setFont(undefined,'bold'); doc.text('ARBEITSZEITNACHWEIS', 105, 15, { align: 'center' });
        doc.setFontSize(14); doc.setFont(undefined,'normal'); doc.text(`${monthName} ${year}`, 105, 23, { align: 'center' });
        doc.setFontSize(12); doc.text(userName, 105, 31, { align: 'center' });

        // Táblázat
        const tableData = generateTableDataForMonth(parseInt(year), parseInt(month));
        const { rows, totalWorkMinutes, totalNightWorkMinutes } = tableData;
        drawPdfTable(doc, rows);

        // Összesítők
        let yPos = (doc.autoTable && doc.autoTable.previous && doc.autoTable.previous.finalY) || 60;
        if (yPos > 260) { doc.addPage(); yPos = 20; }
        doc.setFontSize(10); doc.setFont(undefined,'bold');
        doc.text(`Gesamt Arbeitszeit: ${formatAsHoursAndMinutes(totalWorkMinutes)}`, 205, yPos + 10, { align: 'right' });
        doc.text(`Gesamt Nachtzeit: ${formatAsHoursAndMinutes(totalNightWorkMinutes)}`, 205, yPos + 16, { align: 'right' });

        const fileName = `Arbeitszeitnachweis-${userName.replace(/ /g, '_')}-${year}-${monthName}.pdf`;

        if (action === 'save') {
            doc.save(fileName);
            return;
        }

        if (action === 'share') {
            const blob = doc.output('blob');
            const file = new File([blob], fileName, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
                await navigator.share({ title: fileName, text: 'Arbeitszeitnachweis', files: [file] });
            } else if (navigator.share) {
                const url = URL.createObjectURL(blob);
                await navigator.share({ title: fileName, url });
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            } else {
                showCustomAlert(i18n?.alertShareNotSupported || 'Teilen wird nicht unterstützt. Bitte laden Sie die PDF herunter.', 'info');
            }
            return;
        }
    } catch (error) {
        if (error?.name === 'AbortError') {
            console.log('Share aborted');
        } else {
            console.error('PDF/Share error:', error);
            showCustomAlert(`${i18n?.errorSharing || 'Fehler beim Teilen:'} ${error?.message || ''}`, 'info');
        }
    }
}

// Táblázat adatok a hónapra (mindig német formátum)
function generateTableDataForMonth(year, month) {
    const rows = [];
    let totalWorkMinutes = 0;
    let totalNightWorkMinutes = 0;

    if (!currentMonthlyData || !Array.isArray(currentMonthlyData.records)) {
        return { rows, totalWorkMinutes, totalNightWorkMinutes };
    }

    currentMonthlyData.records.forEach(rec => {
        const d = new Date(`${rec.date}T00:00:00`);
        const weekday = germanFullDays[d.getDay()];
        const [yy, mm, dd] = (rec.date || '').split('-');
        const dateLabel = `${dd}.${mm}.\n${weekday}`;

        const begin      = rec.startTime || '';
        const beginPlace = (rec.startLocation || '').toString();
        const end        = rec.endTime || '';
        const endPlace   = (rec.endLocation || '').toString();

        let crossingsText = '-';
        try {
            const arr = rec.crossings || rec.borderCrossings || [];
            if (arr && arr.length) {
                crossingsText = arr.map(c => {
                    const fr = (c.from || c.fr || '').toString().toUpperCase();
                    const to = (c.to || '').toString().toUpperCase();
                    const t  = (c.time || '').toString();
                    return `${fr}-${to}${t ? ` (${t})` : ''}`;
                }).join('\\n');
            }
        } catch(e) {}

        const work  = formatAsHoursAndMinutes(rec.workMinutes || 0);
        const night = formatAsHoursAndMinutes(rec.nightWorkMinutes || 0);

        rows.push([dateLabel, begin, beginPlace, end, endPlace, crossingsText, work, night]);

        totalWorkMinutes      += (rec.workMinutes || 0);
        totalNightWorkMinutes += (rec.nightWorkMinutes || 0);
    });

    return { rows, totalWorkMinutes, totalNightWorkMinutes };
}

// Táblázat rajzolás (német fejléccel)
function drawPdfTable(doc, rows) {
    const left = 12, right = 200;
    let y = 40;

    function drawHeaderRow() {
        // Only the table header row (no big title here)
        y = 34;
        const headers = ['Datum','Beginn','Ort','Ende','Ort','Grenzübergänge','Arbeit','Nacht'];
        const widths = [24, 18, 28, 18, 28, 36, 18, 18];
        let x = left;
        doc.setFillColor(245,245,245);
        doc.rect(left, y, right-left, 7, 'F');
        doc.setFontSize(10); doc.setFont(undefined, 'bold');
        headers.forEach((h, idx) => { doc.text(h, x + 2, y + 5); x += widths[idx]; });
        doc.setDrawColor(200); doc.setLineWidth(0.2); doc.line(left, y+7, right, y+7);
        y += 9;
        return widths;
    }

    const widths = drawHeaderRow();

    function drawRow(cols, zebra) {
        let x = left;
        const lineHeight = 5.5;

        const wrapped = cols.map((txt, i) => {
            const maxW = widths[i] - 3;
            return doc.splitTextToSize(String(txt ?? ''), maxW);
        });
        const h = Math.max(...wrapped.map(a => a.length)) * lineHeight;

        if (zebra) {
            doc.setFillColor(248, 250, 252);
            doc.rect(left, y - 1.5, right-left, h+3, 'F');
        }

        doc.setFontSize(9); doc.setFont(undefined, 'normal');
        wrapped.forEach((lines, i) => {
            let yy = y + 4;
            lines.forEach(ln => { doc.text(ln, x + 2, yy); yy += lineHeight; });
            x += widths[i];
        });

        doc.setDrawColor(230); doc.setLineWidth(0.2);
        doc.line(left, y + h + 1, right, y + h + 1);
        y += h + 3;

        if (y > 270) {
            doc.addPage(); y = 40; drawHeaderRow();
        }
    }

    for (let r = 0; r < rows.length; r++) drawRow(rows[r], r % 2 === 0);

    if (!doc.autoTable) doc.autoTable = { previous: {} };
    doc.autoTable.previous.finalY = y;
}


// === Global bindings for legacy onclick handlers ===
window.initMonthlyReport      = initMonthlyReport;
window.generateMonthlyReport  = generateMonthlyReport;
window.generateAndProcessPDF  = generateAndProcessPDF;
window.exportToPDF            = function(){ return generateAndProcessPDF('save'); };
window.sharePDF               = function(){ return generateAndProcessPDF('share'); };
