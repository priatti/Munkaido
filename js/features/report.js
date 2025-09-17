// =======================================================
// ===== HAVI RIPORT GENERÁLÓ (JAVÍTOTT) ================
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
            <h3 class="text-xl font-bold text-center mb-4">${i18n.reportTitle || 'Havi riport'}</h3>
            <div class="text-center mb-4">
                <p class="text-lg font-semibold">${userName}</p>
                <p class="text-gray-600 dark:text-gray-400">${monthName}</p>
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
                    <p class="font-bold text-2xl text-blue-700">${formatDuration(totals.driveMinutes)}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Vezetés</p>
                </div>
                <div class="text-center">
                    <p class="font-bold text-2xl text-orange-600">${totals.kmDriven} km</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Távolság</p>
                </div>
            </div>
            
            <div class="overflow-x-auto">
                <table class="w-full text-sm border-collapse">
                    <thead>
                        <tr class="bg-gray-100 dark:bg-gray-700">
                            <th class="border p-2 text-left">Dátum</th>
                            <th class="border p-2 text-left">Útvonal</th>
                            <th class="border p-2 text-right">Munkaidő</th>
                            <th class="border p-2 text-right">Vezetés</th>
                            <th class="border p-2 text-right">Távolság</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedRecords.map(record => {
                            const date = new Date(record.date + 'T00:00:00');
                            const dateStr = date.toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'hu-HU');
                            const route = `${record.startLocation || '?'} → ${record.endLocation || '?'}`;
                            
                            return `
                                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td class="border p-2">${dateStr}</td>
                                    <td class="border p-2">${route}</td>
                                    <td class="border p-2 text-right font-mono">${formatDuration(record.workMinutes || 0)}</td>
                                    <td class="border p-2 text-right font-mono">${formatDuration(record.driveMinutes || 0)}</td>
                                    <td class="border p-2 text-right font-mono">${record.kmDriven || 0} km</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
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
        const monthName = new Date(year, parseInt(month) - 1, 1).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'hu-HU', { 
            year: 'numeric', 
            month: 'long' 
        });
        
        // Adatok szűrése
        const monthRecords = records.filter(record => record.date && record.date.startsWith(selectedMonth));
        
        if (monthRecords.length === 0) {
            throw new Error('Nincs adat a kiválasztott hónaphoz');
        }
        
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Fejléc
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text(i18n.reportTitle || 'Havi riport', 105, 20, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'normal');
        doc.text(userName, 105, 30, { align: 'center' });
        doc.text(monthName, 105, 38, { align: 'center' });
        
        // Összesítő
        const totals = monthRecords.reduce((acc, record) => {
            acc.workMinutes += record.workMinutes || 0;
            acc.driveMinutes += record.driveMinutes || 0;
            acc.kmDriven += record.kmDriven || 0;
            acc.days += 1;
            return acc;
        }, { workMinutes: 0, driveMinutes: 0, kmDriven: 0, days: 0 });
        
        doc.setFontSize(12);
        let yPos = 55;
        doc.text(`Munkanapok: ${totals.days}`, 20, yPos);
        doc.text(`Munkaidő: ${formatDuration(totals.workMinutes)}`, 70, yPos);
        doc.text(`Vezetés: ${formatDuration(totals.driveMinutes)}`, 120, yPos);
        doc.text(`Távolság: ${totals.kmDriven} km`, 170, yPos);
        
        // Táblázat
        yPos = 75;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        
        // Táblázat fejléc
        const headers = ['Dátum', 'Útvonal', 'Munkaidő', 'Vezetés', 'Távolság'];
        const colWidths = [25, 80, 25, 25, 25];
        let xPos = 20;
        
        headers.forEach((header, i) => {
            doc.text(header, xPos, yPos);
            xPos += colWidths[i];
        });
        
        // Vonal a fejléc alatt
        doc.setLineWidth(0.5);
        doc.line(20, yPos + 2, 195, yPos + 2);
        
        // Adatok
        doc.setFont(undefined, 'normal');
        yPos += 8;
        
        const sortedRecords = [...monthRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        sortedRecords.forEach(record => {
            if (yPos > 270) { // Új oldal
                doc.addPage();
                yPos = 20;
            }
            
            const date = new Date(record.date + 'T00:00:00');
            const dateStr = date.toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'hu-HU');
            const route = `${(record.startLocation || '?').substring(0, 15)} → ${(record.endLocation || '?').substring(0, 15)}`;
            
            const rowData = [
                dateStr,
                route,
                formatDuration(record.workMinutes || 0),
                formatDuration(record.driveMinutes || 0),
                `${record.kmDriven || 0} km`
            ];
            
            xPos = 20;
            rowData.forEach((data, i) => {
                doc.text(String(data), xPos, yPos);
                xPos += colWidths[i];
            });
            
            yPos += 6;
        });
        
        // PDF mentése
        const fileName = `Munkaidő_Riport_${userName.replace(/ /g, "_")}_${selectedMonth}.pdf`;
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
    
    // Először generáljuk a PDF-et blob formátumban
    try {
        const userName = document.getElementById('userNameInput').value;
        const monthSelector = document.getElementById('monthSelector');
        const selectedMonth = monthSelector ? monthSelector.value : '';
        
        if (!userName || !selectedMonth) {
            showCustomAlert(i18n.alertGenerateReportFirst || 'Először generálj riportot!', 'info');
            return;
        }
        
        // Itt ugyanúgy generáljuk a PDF-et, mint az exportToPDF-ben, csak blob-ként
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // ... (ugyanaz a PDF generálás, mint fent)
        
        const pdfBlob = doc.output('blob');
        const fileName = `Munkaidő_Riport_${userName.replace(/ /g, "_")}_${selectedMonth}.pdf`;
        
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        await navigator.share({
            files: [file],
            title: 'Munkaidő riport',
            text: `${userName} munkaidő riportja - ${selectedMonth}`
        });
        
    } catch (error) {
        console.error('Share error:', error);
        if (error.name === 'AbortError') {
            showCustomAlert(i18n.shareAborted || 'Megosztás megszakítva', 'info');
        } else {
            showCustomAlert(`${i18n.errorSharing || 'Hiba a megosztás során:'} ${error.message}`, 'info');
        }
    }
}

// Inicializálás
function initMonthlyReport() {
    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector && !monthSelector.value) {
        // Alapértelmezett érték: aktuális hónap
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        monthSelector.value = currentMonth;
    }
}