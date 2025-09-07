// Pallets Module v9.00
class PalletsManager {
    constructor() {
        this.init();
    }

    init() {
        // Listen for pallet record updates
        window.appState.on('change:palletRecords', () => {
            if (window.appState.getCurrentTab() === 'pallets') {
                this.renderPalletRecords();
            }
        });

        // Listen for language changes
        window.addEventListener('languageChanged', () => {
            if (window.appState.getCurrentTab() === 'pallets') {
                this.renderPalletRecords();
            }
        });
    }

    renderPalletRecords() {
        const container = domUtils.getElement('palletRecordsContainer');
        if (!container) return;

        this.updatePalletBalance();

        const palletRecords = window.appState.getState('palletRecords') || [];

        if (palletRecords.length === 0) {
            container.innerHTML = `
                <p class="text-center text-gray-500 py-4">
                    ${window.i18n.translate('palletsNoTransactions')}
                </p>
            `;
            return;
        }

        const sortedRecords = [...palletRecords].sort((a, b) => {
            const dateComparison = new Date(b.date) - new Date(a.date);
            if (dateComparison !== 0) return dateComparison;
            return Number(b.id) - Number(a.id);
        });

        container.innerHTML = sortedRecords.map(record => this.renderPalletRecord(record)).join('');
    }

    renderPalletRecord(record) {
        const taken = record.palletsTaken || 0;
        const given = record.palletsGiven || 0;
        const diff = taken - given;

        let colorClass, borderColorClass, quantityText;
        if (diff > 0) {
            borderColorClass = 'border-green-500';
            colorClass = 'text-green-700 dark:text-green-300';
            quantityText = `+${diff}`;
        } else if (diff < 0) {
            borderColorClass = 'border-red-500';
            colorClass = 'text-red-700 dark:text-red-300';
            quantityText = `${diff}`;
        } else {
            borderColorClass = 'border-gray-400';
            colorClass = 'text-gray-500 dark:text-gray-400';
            quantityText = `⇄ ${taken}`;
        }

        const detailsHTML = [
            record.type ? `<p class="text-xs text-gray-500 mt-1">${record.type}</p>` : '',
            record.licensePlate ? `<p class="text-xs text-gray-400 mt-1">${window.i18n.translate('palletsLicensePlateLabel')}: ${record.licensePlate}</p>` : ''
        ].filter(Boolean).join('');

        return `
            <div class="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border-l-4 ${borderColorClass} flex items-center justify-between">
                <div>
                    <p class="font-semibold text-gray-800 dark:text-gray-200">${record.location}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${record.date}</p>
                    ${detailsHTML}
                </div>
                <div class="text-right">
                    <p class="font-bold text-lg ${colorClass}">${quantityText} db</p>
                    <p class="text-xs text-gray-400">(+${taken} / -${given})</p>
                    <button onclick="window.palletsModule.deletePalletEntry('${record.id}')" 
                            class="text-xs text-gray-400 hover:text-red-500 mt-1">
                        🗑️ <span data-translate-key="delete">${window.i18n.translate('delete')}</span>
                    </button>
                </div>
            </div>
        `;
    }

    updatePalletBalance() {
        const palletRecords = window.appState.getState('palletRecords') || [];
        const balance = palletRecords.reduce((acc, curr) => {
            return acc + (curr.palletsTaken || 0) - (curr.palletsGiven || 0);
        }, 0);

        const displayEl = domUtils.getElement('palletBalanceDisplay');
        if (!displayEl) return;

        let colorClass = 'text-gray-700 dark:text-gray-200';
        if (balance > 0) colorClass = 'text-green-600 dark:text-green-400';
        if (balance < 0) colorClass = 'text-red-500 dark:text-red-400';

        displayEl.innerHTML = `
            <p class="text-sm font-medium">${window.i18n.translate('palletsBalance')}</p>
            <p class="text-2xl font-bold ${colorClass}">${balance} db</p>
        `;
    }

    async savePalletEntry() {
        const date = domUtils.getElementValue('palletDate');
        const location = domUtils.getElementValue('palletLocation').trim();
        const palletsGiven = parseInt(domUtils.getElementValue('palletGiven'), 10) || 0;
        const palletsTaken = parseInt(domUtils.getElementValue('palletTaken'), 10) || 0;
        const palletType = domUtils.getElementValue('palletType').trim();
        const licensePlate = domUtils.getElementValue('palletLicensePlate').trim().toUpperCase();

        if (!date || !location || (palletsGiven === 0 && palletsTaken === 0)) {
            window.uiManager.showAlert(window.i18n.translate('palletInvalidData'), 'info');
            return;
        }

        const newEntry = {
            id: String(Date.now()),
            date,
            location,
            palletsGiven,
            palletsTaken,
            type: palletType,
            licensePlate
        };

        // Save last used values
        if (licensePlate) localStorage.setItem('lastPalletLicensePlate', licensePlate);
        if (palletType) localStorage.setItem('lastPalletType', palletType);

        try {
            await window.storageManager.savePalletRecord(newEntry);
            window.appState.updateUniquePalletLocations();

            // Clear form
            domUtils.setElementValue('palletLocation', '');
            domUtils.setElementValue('palletGiven', '');
            domUtils.setElementValue('palletTaken', '');
            domUtils.setElementValue('palletType', localStorage.getItem('lastPalletType') || '');
            domUtils.setElementValue('palletLicensePlate', localStorage.getItem('lastPalletLicensePlate') || '');

            window.uiManager.showAlert(window.i18n.translate('palletSaveSuccess'), 'success');
        } catch (error) {
            console.error('Error saving pallet record:', error);
            window.uiManager.showAlert(window.i18n.translate('alertSaveToCloudError'), 'info');
        }
    }

    async deletePalletEntry(id) {
        const confirmDelete = confirm(window.i18n.translate('alertConfirmDelete'));
        if (!confirmDelete) return;

        try {
            await window.storageManager.deletePalletRecord(id);
            this.renderPalletRecords();
        } catch (error) {
            console.error('Error deleting pallet record:', error);
            window.uiManager.showAlert(window.i18n.translate('alertSaveToCloudError'), 'info');
        }
    }

    generatePalletReport() {
        const palletRecords = window.appState.getState('palletRecords') || [];
        
        if (palletRecords.length === 0) {
            window.uiManager.showAlert(window.i18n.translate('alertNoPalletData'), 'info');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const userName = window.appState.getState('userName') || domUtils.getElementValue('userNameInput') || 'N/A';
            const sortedRecords = [...palletRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

            let currentBalance = 0;
            const balanceAfterEach = sortedRecords.map(p => {
                currentBalance += (p.palletsTaken || 0) - (p.palletsGiven || 0);
                return currentBalance;
            });

            // Header
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text(window.i18n.translate('palletReportTitle'), 105, 15, { align: 'center' });
            
            doc.setFontSize(12);
            doc.text(userName, 105, 23, { align: 'center' });
            
            doc.setFontSize(10);
            doc.text(`${window.i18n.translate('palletsBalance')} ${currentBalance} db`, 105, 31, { align: 'center' });

            // Table
            let yPos = 40;
            const headers = [
                window.i18n.translate('palletReportHeaderDate'),
                window.i18n.translate('palletReportHeaderLocation'),
                window.i18n.translate('palletReportHeaderGiven'),
                window.i18n.translate('palletReportHeaderTaken'),
                window.i18n.translate('palletReportHeaderType'),
                window.i18n.translate('palletReportHeaderPlate'),
                window.i18n.translate('palletReportHeaderBalance')
            ];
            const colWidths = [25, 55, 18, 18, 22, 22, 20];

            // Table header
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(10);
            let xPos = 15;
            headers.forEach((header, i) => {
                doc.text(header, xPos, yPos);
                xPos += colWidths[i];
            });
            yPos += 7;
            doc.setLineWidth(0.5);
            doc.line(15, yPos - 5, 195, yPos - 5);
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9);

            // Table rows
            sortedRecords.forEach((record, index) => {
                xPos = 15;
                const row = [
                    record.date,
                    record.location,
                    record.palletsGiven || '0',
                    record.palletsTaken || '0',
                    record.type || '-',
                    record.licensePlate || '-',
                    `${balanceAfterEach[index]} db`
                ];
                
                row.forEach((cell, i) => {
                    doc.text(String(cell), xPos, yPos);
                    xPos += colWidths[i];
                });
                yPos += 6;
                
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                }
            });

            const fileName = `${window.i18n.translate('palletReportFileName')}-${userName.replace(/ /g, "_")}-${new Date().toISOString().split("T")[0]}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error("PDF generation error:", error);
            window.uiManager.showAlert(
                `${window.i18n.translate('errorPdfGeneration')} ${error.message}`, 
                'info'
            );
        }
    }
}

// Initialize pallets module
window.palletsModule = new PalletsManager();

// Global functions for HTML onclick handlers
window.savePalletEntry = () => window.palletsModule.savePalletEntry();
window.generatePalletReport = () => window.palletsModule.generatePalletReport();
