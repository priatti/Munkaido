// js/features/pallets.js

import { translations, currentLang, palletRecords, currentUser } from '../main.js';
import { db, saveDataToFirestore, deleteDataFromFirestore } from '../firebase.js';
import { showCustomAlert } from '../ui.js';

export let uniquePalletLocations = [];

export function updateUniquePalletLocations() {
    const locations = new Set(palletRecords.map(r => r.location));
    uniquePalletLocations = Array.from(locations).sort();
}

export async function savePalletEntry() {
    const i18n = translations[currentLang];
    const date = document.getElementById('palletDate').value;
    const location = document.getElementById('palletLocation').value.trim();
    const palletsGiven = parseInt(document.getElementById('palletGiven').value, 10) || 0;
    const palletsTaken = parseInt(document.getElementById('palletTaken').value, 10) || 0;
    const palletType = document.getElementById('palletType').value.trim();
    const licensePlate = document.getElementById('palletLicensePlate').value.trim().toUpperCase();

    if (!date || !location || (palletsGiven === 0 && palletsTaken === 0)) {
        showCustomAlert(i18n.palletInvalidData, "info");
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

    if (licensePlate) localStorage.setItem('lastPalletLicensePlate', licensePlate);
    if (palletType) localStorage.setItem('lastPalletType', palletType);

    palletRecords.push(newEntry);
    
    try {
        if (currentUser) {
            await saveDataToFirestore(currentUser.uid, 'pallets', newEntry);
        } else {
            localStorage.setItem('palletRecords', JSON.stringify(palletRecords));
        }
        
        renderPalletRecords();
        updateUniquePalletLocations();

        document.getElementById('palletLocation').value = '';
        document.getElementById('palletGiven').value = '';
        document.getElementById('palletTaken').value = '';
        document.getElementById('palletType').value = localStorage.getItem('lastPalletType') || '';
        document.getElementById('palletLicensePlate').value = localStorage.getItem('lastPalletLicensePlate') || '';
        showCustomAlert(i18n.palletSaveSuccess, "success");

    } catch (error) {
        showCustomAlert(i18n.alertSaveToCloudError, 'info');
    }
}

export async function deletePalletEntry(id) {
    const i18n = translations[currentLang];
    if (confirm(i18n.alertConfirmDelete)) {
        const entryToDelete = palletRecords.find(p => p.id === id);
        if (!entryToDelete) return;

        palletRecords = palletRecords.filter(p => p.id !== id);
        
        try {
            if (currentUser) {
                await deleteDataFromFirestore(currentUser.uid, 'pallets', id);
            } else {
                localStorage.setItem('palletRecords', JSON.stringify(palletRecords));
            }
            renderPalletRecords();
        } catch (error) {
             showCustomAlert(i18n.alertSaveToCloudError, 'info');
             palletRecords.push(entryToDelete); // Hiba esetén visszatesszük az elemet
        }
    }
}

export function updatePalletBalance() {
    const i18n = translations[currentLang];
    const balance = palletRecords.reduce((acc, curr) => {
        return acc + (curr.palletsTaken || 0) - (curr.palletsGiven || 0);
    }, 0);
    
    const displayEl = document.getElementById('palletBalanceDisplay');
    if (!displayEl) return;

    let colorClass = 'text-gray-700 dark:text-gray-200';
    if (balance > 0) colorClass = 'text-green-600 dark:text-green-400';
    if (balance < 0) colorClass = 'text-red-500 dark:text-red-400';

    displayEl.innerHTML = `
        <p class="text-sm font-medium">${i18n.palletsBalance}</p>
        <p class="text-2xl font-bold ${colorClass}">${balance} db</p>
    `;
}

export function renderPalletRecords() {
    const i18n = translations[currentLang];
    const container = document.getElementById('palletRecordsContainer');
    if (!container) return;
    
    updatePalletBalance();

    if (palletRecords.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-4">${i18n.palletsNoTransactions}</p>`;
        return;
    }

    const sortedRecords = [...palletRecords].sort((a, b) => {
        const dateComparison = new Date(b.date) - new Date(a.date);
        if (dateComparison !== 0) return dateComparison;
        return Number(b.id) - Number(a.id);
    });

    container.innerHTML = sortedRecords.map(p => {
        const taken = p.palletsTaken || 0;
        const given = p.palletsGiven || 0;
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
            p.type ? `<p class="text-xs text-gray-500 mt-1">${p.type}</p>` : '',
            p.licensePlate ? `<p class="text-xs text-gray-400 mt-1">${i18n.palletsLicensePlateLabel}: ${p.licensePlate}</p>` : ''
        ].filter(Boolean).join('');

        return `
        <div class="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border-l-4 ${borderColorClass} flex items-center justify-between">
            <div>
                <p class="font-semibold dropdown-item-title">${p.location}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${p.date}</p>
                ${detailsHTML}
            </div>
            <div class="text-right">
                 <p class="font-bold text-lg ${colorClass}">${quantityText} db</p>
                 <p class="text-xs text-gray-400">(+${taken} / -${given})</p>
                 <button onclick="deletePalletEntry('${p.id}')" class="text-xs text-gray-400 hover:text-red-500 mt-1">🗑️ <span data-translate-key="delete">${i18n.delete}</span></button>
            </div>
        </div>
        `;
    }).join('');
}

export function generatePalletReport() {
    const i18n = translations[currentLang];
    if (palletRecords.length === 0) {
        showCustomAlert(i18n.alertNoPalletData, "info");
        return;
    }
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const userName = document.getElementById('userNameInput').value || 'N/A';
        const sortedRecords = [...palletRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

        let currentBalance = 0;
        const balanceAfterEach = sortedRecords.map(p => {
            currentBalance += (p.palletsTaken || 0) - (p.palletsGiven || 0);
            return currentBalance;
        });

        doc.setFontSize(18); doc.setFont(undefined, 'bold'); doc.text(i18n.palletReportTitle, 105, 15, { align: 'center' });
        doc.setFontSize(12); doc.text(userName, 105, 23, { align: 'center' });
        doc.setFontSize(10); doc.text(`${i18n.palletsBalance} ${currentBalance} db`, 105, 31, { align: 'center' });

        let yPos = 40;
        const headers = [i18n.palletReportHeaderDate, i18n.palletReportHeaderLocation, i18n.palletReportHeaderGiven, i18n.palletReportHeaderTaken, i18n.palletReportHeaderType, i18n.palletReportHeaderPlate, i18n.palletReportHeaderBalance];
        const colWidths = [25, 55, 18, 18, 22, 22, 20];

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        let xPos = 15;
        headers.forEach((h, i) => {
            doc.text(h, xPos, yPos);
            xPos += colWidths[i];
        });
        yPos += 7;
        doc.setLineWidth(0.5);
        doc.line(15, yPos - 5, 195, yPos - 5);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);

        sortedRecords.forEach((p, index) => {
            xPos = 15;
            const row = [p.date, p.location, p.palletsGiven || '0', p.palletsTaken || '0', p.type || '-', p.licensePlate || '-', `${balanceAfterEach[index]} db`];
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

        doc.save(`${i18n.palletReportFileName}-${userName.replace(/ /g, "_")}-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (e) {
        console.error("PDF generation error:", e);
        showCustomAlert(i18n.errorPdfGeneration + " " + e.message, 'info');
    }
}