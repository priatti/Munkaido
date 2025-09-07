// Reports Module v9.00
class ReportsManager {
    constructor() {
        this.currentMonthlyData = null;
        this.germanMonths = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 
                            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
        this.germanFullDays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 
                              'Donnerstag', 'Freitag', 'Samstag'];
        this.init();
    }

    init() {
        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            if (window.appState.getCurrentTab() === 'report') {
                this.initMonthlyReport();
            }
        });
    }

    initMonthlyReport() {
        const monthSelector = domUtils.getElement('monthSelector');
        const reportContent = domUtils.getElement('monthlyReportContent');
        const pdfExportBtn = domUtils.getElement('pdfExportBtn');
        const pdfShareBtn = domUtils.getElement('pdfShareBtn');

        if (monthSelector) {
            monthSelector.value = new Date().toISOString().slice(0, 7);
        }

        if (reportContent) {
            reportContent.innerHTML = '';
        }

        if (pdfExportBtn) {
            pdfExportBtn.classList.add('hidden');
        }

        if (pdfShareBtn) {
            pdfShareBtn.classList.add('hidden');
        }

        this.currentMonthlyData = null;
    }

    generateMonthlyReport() {
        const userName = window.appState.getState('userName') || domUtils.getElementValue('userNameInput');
        
        if (!userName.trim()) {
            window.uiManager.showAlert(window.i18n.translate('alertReportNameMissing'), 'info');
            window.uiManager.showTab('settings');
            return;
        }

        const selectedMonth = domUtils.getElementValue('monthSelector');
        const records = window.appState.getState('records') || [];
        const monthRecords = records.filter(record => record.date.startsWith(selectedMonth));
        
        monthRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

        this.currentMonthlyData = { month: selectedMonth, records: monthRecords };

        const reportContent = domUtils.getElement('monthlyReportContent');
        if (reportContent) {
            reportContent.innerHTML = `
                <div class="bg-white dark:bg-gray-800 p-4 text-xs">
                    ${window.i18n.translate('reportPrepared')}
                </div>
            `;
        }

        const pdfExportBtn = domUtils.getElement('pdfExportBtn');
        const pdfShareBtn = domUtils.getElement('pdfShareBtn');

        if (pdfExportBtn) {
            pdfExportBtn.classList.remove('hidden');
        }

        if (pdfShareBtn && navigator.share) {
            pdfShareBtn.classList.remove('hidden');
        }
    }

    exportToPDF() {
        if (!this.currentMonthlyData) {
            window.uiManager.showAlert(window.i18n.translate('alertGenerateReportFirst'), 'info');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const userName = window.appState.getState('userName') || domUtils.getElementValue('userNameInput') || 'N/A';
            
            this.generatePDFContent(doc, userName);
            
            const [year, month] = this.currentMonthlyData.month.split('-');
            const monthName = this.germanMonths[parseInt(month) - 1];
            
            doc.save(`Arbeitszeitnachweis-${userName.replace(/ /g, "_")}-${year}-${monthName}.pdf`);
        } catch (error) {
            console.error("PDF generation error:", error);
            window.uiManager.showAlert(
                `${window.i18n.translate('errorPdfGeneration')} ${error.message}`, 
                'info'
            );
        }
    }

    async sharePDF() {
        if (!this.currentMonthlyData) {
            window.uiManager.showAlert(window.i18n.translate('alertGenerateReportFirst'), 'info');
            return;
        }

        if (!navigator.share) {
            window.uiManager.showAlert(window.i18n.translate('alertShareNotSupported'), 'info');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const userName = window.appState.getState('userName') || domUtils.getElementValue('userNameInput') || 'N/A';
            
            this.generatePDFContent(doc, userName);
            
            const [year, month] = this.currentMonthlyData.month.split('-');
            const monthName = this.germanMonths[parseInt(month) - 1];
            
            const pdfBlob = doc.output('blob');
            const fileName = `Arbeitszeitnachweis-${userName.replace(/ /g, "_")}-${year}-${monthName}.pdf`;
            const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
            
            const shareData = {
                files: [pdfFile],
                title: `Arbeitszeitnachweis - ${monthName} ${year}`,
                text: `Anbei mein Arbeitszeitnachweis für ${monthName} ${year}.`
            };

            if (navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                throw new Error(window.i18n.translate('shareErrorCannotShare'));
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(window.i18n.translate('shareAborted'));
            } else {
                console.error('Sharing error:', error);
                window.uiManager.showAlert(
                    `${window.i18n.translate('errorSharing')} ${error.message}`, 
                    'info'
                );
            }
        }
    }

    generatePDFContent(doc, userName) {
        const [year, month] = this.currentMonthlyData.month.split('-');
        const monthName = this.germanMonths[parseInt(month) - 1];
        const daysInMonth = new Date(year, month, 0).getDate();
        const recordsMap = new Map(this.currentMonthlyData.records.map(r => [r.date, r]));

        let totalWorkMinutes = 0;
        let totalNightWorkMinutes = 0;
        
        recordsMap.forEach(record => {
            totalWorkMinutes += record.workMinutes || 0;
            totalNightWorkMinutes += record.nightWorkMinutes || 0;
        });

        // Header
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('ARBEITSZEITNACHWEIS', 105, 15, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'normal');
        doc.text(`${monthName} ${year}`, 105, 23, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(userName, 105, 31, { align: 'center' });

        // Table
        let yPos = 40;
        const pageBottom = 280;
        const leftMargin = 15;
        const tableWidth = 180;
        const headers = ['Datum', 'Beginn', 'Ort', 'Ende', 'Ort', 'Grenzübergänge', 'Arbeit', 'Nacht'];
        const colWidths = [25, 15, 30, 15, 30, 35, 15, 15];

        const drawHeader = () => {
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.setDrawColor(150, 150, 150);
            
            let xPos = leftMargin;
            headers.forEach((header, i) => {
                doc.rect(xPos, yPos, colWidths[i], 7, 'S');
                doc.text(header, xPos + colWidths[i] / 2, yPos + 4.5, { align: 'center' });
                xPos += colWidths[i];
            });
            yPos += 7;
            doc.setFont('Helvetica', 'normal');
        };

        drawHeader();

        // Generate table rows
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(Date.UTC(year, month - 1, day));
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getUTCDay();
            const record = recordsMap.get(dateStr);

            const dateDisplay = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.`;
            const dayNameDisplay = this.germanFullDays[dayOfWeek];
            const dateCellText = `${dateDisplay}\n${dayNameDisplay}`;

            const crossingsText = (record && record.crossings && record.crossings.length > 0)
                ? record.crossings.map(c => `${c.from}-${c.to} (${c.time})`).join("\n")
                : '-';

            const dateLines = doc.splitTextToSize(dateCellText, colWidths[0] - 2);
            const startLocLines = doc.splitTextToSize(record?.startLocation || '-', colWidths[2] - 2);
            const endLocLines = doc.splitTextToSize(record?.endLocation || '-', colWidths[4] - 2);
            const crossingsLines = doc.splitTextToSize(crossingsText, colWidths[5] - 2);
            
            const rowHeight = Math.max(
                dateLines.length, startLocLines.length, 
                endLocLines.length, crossingsLines.length
            ) * 4.5 + 4;

            if (yPos + rowHeight > pageBottom) {
                doc.addPage();
                yPos = 20;
                drawHeader();
            }

            const rowData = record ? [
                dateCellText,
                record.startTime,
                record.startLocation || "-",
                record.endTime,
                record.endLocation || "-",
                crossingsText,
                timeUtils.formatAsHoursAndMinutes(record.workMinutes),
                timeUtils.formatAsHoursAndMinutes(record.nightWorkMinutes || 0)
            ] : [
                dateCellText, '-', '-', '-', '-', '-', '-', '-'
            ];

            let xPos = leftMargin;
            rowData.forEach((data, i) => {
                doc.setFillColor(255, 255, 255);
                if (i === 0 && (dayOfWeek === 6 || dayOfWeek === 0)) {
                    doc.setFillColor(245, 245, 245);
                }

                doc.setDrawColor(150, 150, 150);
                doc.rect(xPos, yPos, colWidths[i], rowHeight, 'FD');
                doc.setFontSize(8);
                doc.text(data, xPos + colWidths[i] / 2, yPos + rowHeight / 2, { 
                    align: 'center', 
                    baseline: 'middle' 
                });
                xPos += colWidths[i];
            });
            yPos += rowHeight;
        }

        // Footer totals
        if (yPos > pageBottom - 20) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(
            `Gesamt Arbeitszeit: ${timeUtils.formatAsHoursAndMinutes(totalWorkMinutes)}`, 
            leftMargin + tableWidth, yPos + 5, { align: 'right' }
        );
        doc.text(
            `Gesamt Nachtzeit: ${timeUtils.formatAsHoursAndMinutes(totalNightWorkMinutes)}`, 
            leftMargin + tableWidth, yPos + 11, { align: 'right' }
        );
    }
}

// Initialize reports module
window.reportsModule = new ReportsManager();

// Global functions for HTML onclick handlers
window.generateMonthlyReport = () => window.reportsModule.generateMonthlyReport();
window.exportToPDF = () => window.reportsModule.exportToPDF();
window.sharePDF = () => window.reportsModule.sharePDF();
