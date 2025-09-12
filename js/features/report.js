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
async function generateMonthlyReport() {
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
    renderMonthlyReportPreview();

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


// -------------------------------------------------------
// On-page preview list (after "Riport generálása")
// -------------------------------------------------------
function renderMonthlyReportPreview() {
    if (!currentMonthlyData || !Array.isArray(currentMonthlyData.records)) return;
    const container = document.getElementById('monthlyReportContent');
    if (!container) return;

    const isDE = currentLang === 'de';
    const H = isDE
        ? ['Datum', 'Beginn', 'Ort', 'Ende', 'Ort', 'Grenzübergänge', 'Arbeit', 'Nacht']
        : ['Dátum', 'Kezdés', 'Hely', 'Befejezés', 'Hely', 'Határátlépések', 'Munka', 'Éjszaka'];

    // Build rows html
    let totalWork = 0, totalNight = 0;
    const rows = currentMonthlyData.records.map(rec => {
        const d = new Date(`${rec.date}T00:00:00`);
        const dayNamesHU = ['Vasárnap','Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat'];
        const dayNamesDE = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
        const weekday = (isDE ? dayNamesDE : dayNamesHU)[d.getDay()];

        const [yy, mm, dd] = (rec.date || '').split('-');
        const dateCell = `${dd}.${mm}.<div class="text-xs opacity-70">${weekday}</div>`;

        const begin = rec.startTime || '';
        const end   = rec.endTime || '';
        const beginPlace = (rec.startLocation || '').toString();
        const endPlace   = (rec.endLocation || '').toString();

        const workMin  = Number(rec.workMinutes || 0);
        const nightMin = Number(rec.nightWorkMinutes || 0);
        totalWork  += workMin;
        totalNight += nightMin;

        let crossingsText = '-';
        const arr = Array.isArray(rec.crossings) ? rec.crossings : (Array.isArray(rec.borderCrossings) ? rec.borderCrossings : []);
        if (arr.length) {
            crossingsText = arr.map(c => {
                const fr = (c.from || c.fr || '').toString().toUpperCase();
                const to = (c.to || '').toString().toUpperCase();
                const t  = (c.time || '').toString();
                return `${fr}-${to}${t ? ` (${t})` : ''}`;
            }).join('<br>');
        }

        return `<tr class="border-b border-gray-200 dark:border-gray-700">
            <td class="py-2 align-top">${dateCell}</td>
            <td class="py-2 align-top">${begin || ''}</td>
            <td class="py-2 align-top">${escapeHtml(beginPlace)}</td>
            <td class="py-2 align-top">${end || ''}</td>
            <td class="py-2 align-top">${escapeHtml(endPlace)}</td>
            <td class="py-2 align-top">${crossingsText}</td>
            <td class="py-2 align-top whitespace-nowrap">${formatAsHoursAndMinutes(workMin)}</td>
            <td class="py-2 align-top whitespace-nowrap">${formatAsHoursAndMinutes(nightMin)}</td>
        </tr>`;
    }).join('');

    const totalsHtml = `<div class="mt-3 text-right text-sm font-semibold">
        ${(isDE ? 'Gesamt Arbeitszeit' : 'Összes munkaidő')}: ${formatAsHoursAndMinutes(totalWork)} &nbsp; • &nbsp;
        ${(isDE ? 'Gesamt Nachtzeit' : 'Összes éjszaka')}: ${formatAsHoursAndMinutes(totalNight)}
    </div>`;

    container.innerHTML = `
        <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table class="min-w-full text-sm">
                <thead class="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                        ${H.map(h => `<th class="text-left font-semibold px-2 py-2">${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody class="bg-white dark:bg-gray-900/40">
                    ${rows || ''}
                </tbody>
            </table>
        </div>
        ${totalsHtml}
    `;
}

// Tiny util
function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"\\'":"&#39;"
    })[m]);
}


// -------------------------------------------------------
// IndexedDB scanner (async) — tries to read all DBs/stores
// -------------------------------------------------------
async function collectMonthRecordsAsync(monthStr /* 'YYYY-MM' */) {
    const results = [];
    const dbList = (indexedDB.databases ? await indexedDB.databases() : []) || [];
    const names = dbList.map(d => d.name).filter(Boolean);

    // Fallback: common DB names to try if enumeration not supported
    const guesses = ['MunkaidoDB','workdays-db','worklog','app-db','localforage','keyval-store'];
    for (const n of guesses) if (!names.includes(n)) names.push(n);

    for (const dbName of names) {
        if (!dbName) continue;
        try {
            const db = await openDb(dbName);
            if (!db) continue;
            for (let i = 0; i < db.objectStoreNames.length; i++) {
                const storeName = db.objectStoreNames[i];
                try {
                    const all = await getAllFromStore(db, storeName);
                    all.forEach(rec => tryPush(rec));
                } catch (e) {
                    // ignore store errors
                }
            }
            db.close();
        } catch (e) {
            // ignore db errors
        }
    }

    // sort and return
    results.sort((a,b) => (a.date || '').localeCompare(b.date || ''));
    console.log(`[Report] IDB collected ${results.length} rows for ${monthStr} from DBs:`, names);
    return results;

    // helpers
    function tryPush(obj) {
        if (!obj || typeof obj !== 'object') return;
        // direct record
        pushIfMonthGlobal(obj, results, monthStr);
        // also walk nested arrays/objects
        if (Array.isArray(obj)) {
            obj.forEach(o => tryPush(o));
        } else {
            Object.values(obj).forEach(v => tryPush(v));
        }
    }

    function openDb(name) {
        return new Promise(resolve => {
            let req;
            try { req = indexedDB.open(name); } catch(e) { resolve(null); return; }
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    }

    function getAllFromStore(db, store) {
        return new Promise(resolve => {
            try {
                const tx = db.transaction(store, 'readonly');
                const os = tx.objectStore(store);
                const req = os.getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            } catch(e) {
                resolve([]);
            }
        });
    }
}

// Standalone helpers shared with async collector
function pushIfMonthGlobal(obj, target, monthStr) {
    if (!obj || typeof obj !== 'object') return;
    let dateStr = guessGlobal(obj, ['date','datum','day','nap','dátum']);
    if (!dateStr && typeof obj.key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(obj.key)) dateStr = obj.key;
    if (!dateStr) return;
    dateStr = normalizeDateGlobal(dateStr);
    if (!dateStr || !dateStr.startsWith(monthStr)) return;

    const startTime = guessGlobal(obj, ['startTime','start','kezdes','kezdesIdo','kezdés','inditas','indítás']) || '';
    const endTime   = guessGlobal(obj, ['endTime','end','vege','vegeIdo','vég','befejezes','befejezés']) || '';
    const startLoc  = guessGlobal(obj, ['startLocation','from','honnan','hely','startPlace','start_city']) || '';
    const endLoc    = guessGlobal(obj, ['endLocation','to','hova','cel','endPlace','end_city']) || '';

    let workMinutes  = numGlobal(guessGlobal(obj, ['workMinutes','work','munkaPerc','munka','work_min']));
    let nightMinutes = numGlobal(guessGlobal(obj, ['nightWorkMinutes','night','ejPerc','éjPerc','night_min']));
    if (!workMinutes && startTime && endTime) {
        const m = diffMinutesGlobal(startTime, endTime);
        if (m > 0 && m < 18*60) workMinutes = m;
    }
    if (!nightMinutes) nightMinutes = 0;

    let crossings = guessGlobal(obj, ['crossings','borderCrossings','hatarAtlepesek','határátlépések']);
    if (!Array.isArray(crossings)) crossings = [];

    target.push({
        date: dateStr,
        startTime, endTime,
        startLocation: startLoc,
        endLocation: endLoc,
        workMinutes, nightWorkMinutes: nightMinutes,
        crossings
    });
}

function normalizeDateGlobal(s) {
    if (typeof s !== 'string') return null;
    s = s.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m1 = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;
    const m2 = s.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
    if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
    return null;
}

function guessGlobal(obj, names) {
    const keys = Object.keys(obj);
    for (const n of names) {
        const k = keys.find(k => k.toLowerCase() === n.toLowerCase());
        if (k && obj[k] != null && obj[k] !== '') return obj[k];
    }
    return undefined;
}

function numGlobal(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function diffMinutesGlobal(t1, t2) {
    const parse = t => {
        const m = String(t).match(/^(\d{1,2}):(\d{2})/);
        if (!m) return null;
        return parseInt(m[1])*60 + parseInt(m[2]);
    };
    const a = parse(t1), b = parse(t2);
    if (a==null || b==null) return 0;
    let d = b - a;
    if (d < 0) d += 24*60;
    return d;
}
