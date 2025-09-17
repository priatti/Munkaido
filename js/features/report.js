// =======================================================
// ===== PONTOS PDF RIPORT A MINTA SZERINT ==============
// =======================================================

function generateMonthlyReport() {
    const i18n = translations[currentLang];
    const monthSelector = document.getElementById('monthSelector');
    const selectedMonth = monthSelector ? monthSelector.value : '';
    
    if (!selectedMonth) {
        showCustomAlert('Kérlek válassz egy hónapot!', 'info');
        return;
    }
    
    // Szűrjük ki a kiválasztott hónaphoz tartozó bejegyzéseket
    const monthRecords = records.filter(record => {
        return record.date && record.date.startsWith(selectedMonth);
    });
    
    if (monthRecords.length === 0) {
        showCustomAlert(i18n.noEntries || 'Nincs bejegyzés a kiválasztott hónapban.', 'info');
        return;
    }
    
    // Riport tartalom generálása
    renderMonthlyReportContent(monthRecords, selectedMonth);
    
    // PDF gombok megjelenítése
    const pdfExportBtn = document.getElementById('pdfExportBtn');
    const pdfShareBtn = document.getElementById('pdfShareBtn');
    if (pdfExportBtn) pdfExportBtn.classList.remove('hidden');
    if (pdfShareBtn) pdfShareBtn.classList.remove('hidden');
    
    showCustomAlert(i18n.reportPrepared || 'Riport elkészült!', 'success');
}

function renderMonthlyReportContent(monthRecords, selectedMonth) {
    const i18n = translations[currentLang];
    const container = document.getElementById('monthlyReportContent');
    const userName = document.getElementById('userNameInput').value || 'N/A';
    
    if (!container) return;
    
    // Hónap név formázása
    const [year, month] = selectedMonth.split('-');
    const monthName = new Date(year, parseInt(month) - 1, 1).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'hu-HU', { 
        year: 'numeric', 
        month: 'long' 
    });
    
    // Összesítő adatok számítása
    const totals = monthRecords.reduce((acc, record) => {
        acc.workMinutes += record.workMinutes || 0;
        acc.driveMinutes += record.driveMinutes || 0;
        acc.nightWorkMinutes += record.nightWorkMinutes || 0;
        acc.kmDriven += record.kmDriven || 0;
        acc.days += 1;
        return acc;
    }, { workMinutes: 0, driveMinutes: 0, nightWorkMinutes: 0, kmDriven: 0, days: 0 });
    
    // Rendezés dátum szerint
    const sortedRecords = [...monthRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    container.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 mb-4">
            <h3 class="text-xl font-bold text-center mb-4">${currentLang === 'de' ? 'ARBEITSZEITNACHWEIS' : 'MUNKAIDŐ KIMUTATÁS'}</h3>
            <div class="text-center mb-4">
                <p class="text-lg font-semibold">${monthName}</p>
                <p class="text-gray-600 dark:text-gray-400">${userName}</p>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                <div class="text-center">
                    <p class="font-bold text-2xl text-blue-600">${totals.days}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Munkanapok</p>
                </div>
                <div class="text-center">
                    <p class="font-bold text-2xl text-green-600">${formatDuration(totals.workMinutes)}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Munkaidő</p>
                </div>
                <div class="text-center">
                    <p class="font-bold text-2xl text-purple-600">${formatDuration(totals.nightWorkMinutes)}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Éjszakai</p>
                </div>
                <div class="text-center">
                    <p class="font-bold text-2xl text-blue-700">${formatDuration(totals.driveMinutes)}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Vezetés</p>
                </div>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse border">
                    <thead>
                        <tr class="bg-gray-100 dark:bg-gray-700">
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
                        ${generateMonthTable(sortedRecords, year, month)}
                    </tbody>
                </table>
            </div>
            
            <div class="mt-4 text-right font-bold">
                <p>Gesamt Arbeitszeit: ${formatDuration(totals.workMinutes)}</p>
                <p>Gesamt Nachtzeit: ${formatDuration(totals.nightWorkMinutes)}</p>
            </div>
        </div>
    `;
}

function generateMonthTable(records, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const locale = currentLang === 'de' ? 'de-DE' : 'hu-HU';
    const dayNames = currentLang === 'de' ? 
        ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'] :
        ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
    
    let html = '';
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
        const dayName = dayNames[dayOfWeek];
        
        const record = records.find(r => r.date === dateStr);
        
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const rowClass = isWeekend ? 'bg-red-50 dark:bg-red-900/20' : '';
        
        html += `<tr class="${rowClass}">`;
        
        // Dátum és nap
        html += `<td class="border p-2 font-semibold">
            ${day.toString().padStart(2, '0')}.${month.padStart(2, '0')}.<br>
            <span class="text-xs text-gray-600">${dayName}</span>
        </td>`;
        
        if (record) {
            // Van bejegyzés
            const startTime = record.startTime || '-';
            const endTime = record.endTime || '-';
            const startLocation = (record.startLocation || '').substring(0, 20);
            const endLocation = (record.endLocation || '').substring(0, 20);
            
            // Határátlépések formázása
            let crossingsText = '-';
            if (record.crossings && record.crossings.length > 0) {
                crossingsText = record.crossings.map(c => `${c.from}-${c.to} (${c.time})`).join('<br>');
            }
            
            html += `
                <td class="border p-2 text-center">${startTime}</td>
                <td class="border p-2">${startLocation}</td>
                <td class="border p-2 text-center">${endTime}</td>
                <td class="border p-2">${endLocation}</td>
                <td class="border p-2 text-xs">${crossingsText}</td>
                <td class="border p-2 text-right font-mono">${formatDuration(record.workMinutes || 0)}</td>
                <td class="border p-2 text-right font-mono">${formatDuration(record.nightWorkMinutes || 0)}</td>
            `;
        } else {
            // Nincs bejegyzés
            html += `
                <td class="border p-2 text-center">-</td>
                <td class="border p-2">-</td>
                <td class="border p-2 text-center">-</td>
                <td class="border p-2">-</td>
                <td class="border p-2">-</td>
                <td class="border p-2 text-center">-</td>
                <td class="border p-2 text-center">-</td>
            `;
        }
        
        html += '</tr>';
    }
    
    return html;
}

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
                
                // Arbeit
                doc.rect(colX[6], yPos, colWidths[6], rowHeight);
                doc.text(formatDuration(record.workMinutes || 0), colX[6] + colWidths[6] - 1, yPos + 7, { align: 'right' });
                
                // Nacht
                doc.rect(colX[7], yPos, colWidths[7], rowHeight);
                doc.text(formatDuration(record.nightWorkMinutes || 0), colX[7] + colWidths[7] - 1, yPos + 7, { align: 'right' });
                
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
        doc.text(`Gesamt Arbeitszeit: ${formatDuration(totalWork)}`, 195, yPos, { align: 'right' });
        doc.text(`Gesamt Nachtzeit: ${formatDuration(totalNight)}`, 195, yPos + 8, { align: 'right' });
        
        // PDF mentése
        const fileName = `Arbeitszeitnachweis_${userName.replace(/ /g, "_")}_${selectedMonth}.pdf`;
        doc.save(fileName);
        
    } catch (error) {
        console.error('PDF generation error:', error);
        showCustomAlert(`${i18n.errorPdfGeneration || 'Hiba a PDF készítése során:'} ${error.message}`, 'info');
    }
}

async function sharePDF() {
    const i18n = translations[currentLang];
    
    if (!navigator.share) {
        showCustomAlert(i18n.alertShareNotSupported || 'A böngésző nem támogatja a megosztást', 'info');
        return;
    }
    
    try {
        // Először generáljuk a PDF-et, majd osszuk meg
        await exportToPDF();
    } catch (error) {
        console.error('Share error:', error);
        showCustomAlert(`${i18n.errorSharing || 'Hiba a megosztás során:'} ${error.message}`, 'info');
    }
}

// Inicializálás
function initMonthlyReport() {
    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector && !monthSelector.value) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        monthSelector.value = currentMonth;
    }
}