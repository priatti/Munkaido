import { state } from '../state.js';
import { savePalletRecord, deletePalletRecord } from '../services/database.js';
import { showAlert } from '../utils/domHelpers.js';

function updatePalletBalance() {
    if (!window.translations) return;
    const i18n = window.translations;
    const balance = state.palletRecords
        .filter(p => p.action !== 'csere')
        .reduce((acc, curr) => curr.action === 'felvett' ? acc + curr.quantity : acc - curr.quantity, 0);
    
    const displayEl = document.getElementById('palletBalanceDisplay');
    if (!displayEl) return;
    
    let colorClass = 'text-gray-700 dark:text-gray-200';
    if (balance > 0) colorClass = 'text-green-600 dark:text-green-400';
    if (balance < 0) colorClass = 'text-red-500 dark:text-red-400';

    displayEl.innerHTML = `
        <p class="text-sm font-medium">${i18n.palletsBalance}</p>
        <p class="text-2xl font-bold ${colorClass}">${balance}</p>
    `;
}

export function renderPalletRecords() {
    if (!window.translations) return;
    const i18n = window.translations;
    const container = document.getElementById('palletRecordsContainer');
    if (!container) return;
    
    updatePalletBalance();

    if (state.palletRecords.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-4">${i18n.palletsNoTransactions}</p>`;
        return;
    }

    const sortedRecords = [...state.palletRecords].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = sortedRecords.map(p => {
        let actionClass, sign;
        switch (p.action) {
            case 'felvett': actionClass = 'border-green-500'; sign = '+'; break;
            case 'leadott': actionClass = 'border-red-500'; sign = '-'; break;
            case 'csere': actionClass = 'border-gray-500'; sign = '⇄'; break;
        }
        
        return `
        <div class="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border-l-4 ${actionClass} flex items-center justify-between">
            <div>
                <p class="font-semibold text-gray-800 dark:text-gray-100">${p.location}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${p.date}</p>
            </div>
            <div class="text-right">
                 <p class="font-bold text-lg">${sign}${p.quantity}</p>
                 <button data-delete-pallet-id="${p.id}" class="delete-pallet-btn text-xs text-gray-400 hover:text-red-500">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

async function savePalletEntry() {
    const i18n = window.translations;
    const newEntry = {
        id: String(Date.now()),
        date: document.getElementById('palletDate').value,
        location: document.getElementById('palletLocation').value.trim(),
        quantity: parseInt(document.getElementById('palletQuantity').value, 10),
        action: document.getElementById('palletAction').value,
        licensePlate: document.getElementById('palletLicensePlate').value.trim().toUpperCase()
    };

    if (!newEntry.date || !newEntry.location || !newEntry.quantity || newEntry.quantity <= 0) {
        showAlert(i18n.palletInvalidData, "info");
        return;
    }

    state.palletRecords.push(newEntry);
    await savePalletRecord(newEntry);
    renderPalletRecords();

    document.getElementById('palletLocation').value = '';
    document.getElementById('palletQuantity').value = '';
    showAlert(i18n.palletSaveSuccess, "success");
}

export function deletePalletEntry_UI(id) {
    const i18n = window.translations;
    showAlert(i18n.alertConfirmDelete, 'warning', async () => {
        state.palletRecords = state.palletRecords.filter(p => p.id !== id);
        await deletePalletRecord(id);
        renderPalletRecords();
    });
}

function generatePalletReport() {
    showAlert("Raklap riport generálása...", "info");
}

export function initializePalletsView() {
    document.getElementById('savePalletEntryBtn').addEventListener('click', savePalletEntry);
    document.getElementById('generatePalletReportBtn').addEventListener('click', generatePalletReport);
    
    document.getElementById('palletRecordsContainer').addEventListener('click', (event) => {
        const deleteBtn = event.target.closest('.delete-pallet-btn');
        if (deleteBtn) {
            deletePalletEntry_UI(deleteBtn.dataset.deletePalletId);
        }
    });
}
