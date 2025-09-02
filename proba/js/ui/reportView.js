import { state } from '../state.js';
import { showAlert } from '../utils/domHelpers.js';
import { showTab } from './navigation.js';

let currentMonthlyData = null;
const germanMonths = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function formatAsHoursAndMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function initMonthlyReport() {
    document.getElementById('monthSelector').value = new Date().toISOString().slice(0, 7);
    document.getElementById('monthlyReportContent').innerHTML = '';
    document.getElementById('pdfExportBtn').classList.add('hidden');
    document.getElementById('pdfShareBtn').classList.add('hidden');
}

export function generateMonthlyReport() {
    const i18n = window.translations;
    const userName = document.getElementById('userNameInput').value.trim();
    if (!userName) {
        showAlert(i18n.alertReportNameMissing, 'info', () => showTab('settings'));
        return;
    }

    const selectedMonth = document.getElementById("monthSelector").value;
    const monthRecords = state.records.filter(record => record.date.startsWith(selectedMonth));
    monthRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
    currentMonthlyData = { month: selectedMonth, records: monthRecords, userName };

    document.getElementById('monthlyReportContent').innerHTML = `<div class="bg-white dark:bg-gray-700 p-4 text-xs rounded">${i18n.reportPrepared}</div>`;
    document.getElementById('pdfExportBtn').classList.remove('hidden');
    if (navigator.share) {
        document.getElementById('pdfShareBtn').classList.remove('hidden');
    }
}

async function createPDF(action = 'download') {
    const i18n = window.translations;
    if (!currentMonthlyData) {
        showAlert(i18n.alertGenerateReportFirst, "info");
        return;
    }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        // ... A PDF generálás teljes logikája itt van ...
        // (A rövidség kedvéért nem másolom be újra, a lényeg a hiányzó függvény volt)

        if (action === 'download') {
            doc.save(`Riport-${currentMonthlyData.userName}-${currentMonthlyData.month}.pdf`);
        } else if (action === 'share') {
            // Megosztás logika
        }
    } catch (e) {
        console.error("PDF generálási hiba:", e);
        showAlert("Hiba történt a PDF generálása közben: " + e.message, 'info');
    }
}

export const exportToPDF = () => createPDF('download');
export const sharePDF = () => createPDF('share');

/**
 * HIÁNYZÓ FÜGGVÉNY: Beállítja az eseménykezelőket a riport fül gombjaira.
 */
export function initializeReportView() {
    document.getElementById('generateReportBtn').addEventListener('click', generateMonthlyReport);
    document.getElementById('pdfExportBtn').addEventListener('click', exportToPDF);
    document.getElementById('pdfShareBtn').addEventListener('click', sharePDF);
}
