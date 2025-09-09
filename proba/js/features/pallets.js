// =======================================================
// ===== RAKLAPKEZELÉS (FEATURE) =========================
// =======================================================

// Globális változó a kiválasztott raklaptípus tárolására
let selectedPalletType = 'EUR';

// Új raklap tranzakció mentése
async function savePalletEntry() {
    const i18n = translations[currentLang];
    const date = document.getElementById('palletDate').value;
    const location = document.getElementById('palletLocation').value.trim();
    const palletsGiven = parseInt(document.getElementById('palletGiven').value, 10) || 0;
    const palletsTaken = parseInt(document.getElementById('palletTaken').value, 10) || 0;
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
        type: selectedPalletType,
        licensePlate
    };

    if (licensePlate) localStorage.setItem('lastPalletLicensePlate', licensePlate);

    palletRecords.push(newEntry);
    await savePalletRecords();
    renderPalletRecords();
    updateUniquePalletLocations();

    document.getElementById('palletLocation').value = '';
    document.getElementById('palletGiven').value = '';
    document.getElementById('palletTaken').value = '';
    document.getElementById('palletLicensePlate').value = localStorage.getItem('lastPalletLicensePlate') || '';
    showCustomAlert(i18n.palletSaveSuccess, "success");
}

// Raklap tranzakció törlése
async function deletePalletEntry(id) {
    showCustomAlert(translations[currentLang].alertConfirmDelete, 'warning', async () => {
        palletRecords = palletRecords.filter(p => p.id !== id);
        await savePalletRecords();
        renderPalletRecords();
    });
}

// Aktuális raklap egyenleg frissítése a UI-on
function updatePalletBalance() {
    const i18n = translations[currentLang];
    const displayEl = document.getElementById('palletBalanceDisplay');
    if (!displayEl) return;

    const palletMode = localStorage.getItem('palletMode') || 'single';
    let balanceHTML = '';
    let totalBalance = 0;

    if (palletMode === 'single') {
        const balance = palletRecords.reduce((acc, curr) => acc + (curr.palletsTaken || 0) - (curr.palletsGiven || 0), 0);
        const colorClass = balance > 0 ? 'text-green-600 dark:text-green-400' : (balance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-200');
        balanceHTML = `<p class="text-2xl font-bold ${colorClass}">${balance} db</p>`;
    } else {
        const types = getPalletTypes();
        const balances = {};
        
        types.forEach(type => {
            const typeBalance = palletRecords
                .filter(record => record.type === type)
                .reduce((acc, curr) => acc + (curr.palletsTaken || 0) - (curr.palletsGiven || 0), 0);
            balances[type] = typeBalance;
            totalBalance += typeBalance;
        });

        const balanceDetails = types.map(type => {
            if (!palletRecords.some(r => r.type === type)) return ''; 
            const balance = balances[type];
            const colorClass = balance > 0 ? 'text-green-600 dark:text-green-400' : (balance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400');
            return `<span class="font-semibold ${colorClass}">${type}: ${balance}</span>`;
        }).filter(Boolean).join(' / ');

        const totalColorClass = totalBalance > 0 ? 'text-green-600 dark:text-green-400' : (totalBalance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-200');
        balanceHTML = `
            <p class="text-2xl font-bold ${totalColorClass}">${totalBalance} db</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${balanceDetails}</p>
        `;
    }

    displayEl.innerHTML = `
        <p class="text-sm font-medium">${i18n.palletsBalance}</p>
        ${balanceHTML}
    `;
}

// A raklap tranzakciók listájának és a teljes felületnek a kirajzolása
function renderPalletRecords() {
    renderPalletTypeSelector(); 

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
            p.type ? `<span class="mt-1 text-xs font-semibold bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-full">${p.type}</span>` : '',
            p.licensePlate ? `<p class="text-xs text-gray-400 mt-1">${i18n.palletsLicensePlateLabel}: ${p.licensePlate}</p>` : ''
        ].filter(Boolean).join('');

        return `
        <div class="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border-l-4 ${borderColorClass} flex items-center justify-between">
            <div>
                <p class="font-semibold dropdown-item-title">${p.location}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${p.date}</p>
                <div class="flex items-center gap-2 mt-1">${detailsHTML}</div>
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

// A típusválasztó gombok kirajzolása a beállítások alapján
function renderPalletTypeSelector() {
    const container = document.getElementById('pallet-type-selector');
    if (!container) return;

    const palletMode = localStorage.getItem('palletMode') || 'single';

    if (palletMode === 'single') {
        selectedPalletType = 'EUR';
        container.innerHTML = `<button class="w-full text-left font-semibold p-2 rounded-lg bg-green-100 dark:bg-green-800/50 text-gray-800 dark:text-gray-100 cursor-default">✓ EUR</button>`;
    } else {
        const types = getPalletTypes();
        if (!types.includes(selectedPalletType)) {
            selectedPalletType = 'EUR';
        }
        container.innerHTML = types.map(type => {
            const isActive = type === selectedPalletType;
            const activeClass = isActive ? 'bg-green-100 dark:bg-green-800/50' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600';
            return `<button onclick="selectPalletType('${type}')" class="font-semibold p-2 rounded-lg text-sm ${activeClass} text-gray-800 dark:text-gray-100">${isActive ? '✓ ' : ''}${type}</button>`;
        }).join('');
    }
}

// A raklaptípus kiválasztását kezelő esemény
function selectPalletType(type) {
    selectedPalletType = type;
    renderPalletTypeSelector();
}

// ======== ÚJ RIPORTGENERÁLÓ LOGIKA ========

// 1. A régi funkció mostantól a felugró ablakot nyitja meg
function generatePalletReport() {
    const i18n = translations[currentLang];
    if (palletRecords.length === 0) {
        showCustomAlert(i18n.alertNoPalletData, "info");
        return;
    }
    
    // Egyszerűsített módban azonnal generálunk, csak az EUR-ról
    const palletMode = localStorage.getItem('palletMode') || 'single';
    if (palletMode === 'single') {
        createSelectedPalletReport(['EUR']);
        return;
    }

    // Részletes módban: felugró ablak tartalmának feltöltése és megjelenítése
    const types = getPalletTypes().filter(type => palletRecords.some(r => r.type === type)); // Csak azokat, amikhez van bejegyzés
    const container = document.getElementById('pallet-report-types-container');
    container.innerHTML = types.map(type => `
        <label class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <span class="font-semibold text-gray-800 dark:text-gray-100">${type}</span>
            <input type="checkbox" value="${type}" class="pallet-report-checkbox h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked>
        </label>
    `).join('');

    showPalletReportModal();
}

// 2. Új funkciók a felugró ablak megjelenítésére/elrejtésére
function showPalletReportModal() {
    const overlay = document.getElementById('pallet-report-modal-overlay');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}

function hidePalletReportModal() {
    const overlay = document.getElementById('pallet-report-modal-overlay');
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
}

// 3. Ez az új funkció generálja le a PDF-et a kiválasztott típusok alapján
function createSelectedPalletReport(selectedTypesArray = null) {
    const i18n = translations[currentLang];
    const userName = document.getElementById('userNameInput').value || 'N/A';
    
    let selectedTypes;
    if (selectedTypesArray) { // Ha közvetlenül kapunk típusokat (pl. egyszerűsített módból)
        selectedTypes = selectedTypesArray;
    } else { // Ha a felugró ablakból olvassuk ki
        selectedTypes = Array.from(document.querySelectorAll('.pallet-report-checkbox:checked')).map(cb => cb.value);
    }
    
    if (selectedTypes.length === 0) {
        showCustomAlert("Kérlek, válassz legalább egy raklaptípust a riport elkészítéséhez!", "info");
        return;
    }

    hidePalletReportModal();

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        doc.setFontSize(18); doc.setFont(undefined, 'bold'); doc.text(i18n.palletReportTitle, 105, 15, { align: 'center' });
        doc.setFontSize(12); doc.text(userName, 105, 23, { align: 'center' });

        let yPos = 35;
        const pageBottom = 280;

        selectedTypes.forEach((type, typeIndex) => {
            const typeRecords = palletRecords.filter(r => r.type === type).sort((a, b) => new Date(a.date) - new Date(b.date));
            if (typeRecords.length === 0) return;

            // Oldaltörés, ha már nincs elég hely
            if (yPos > pageBottom - 40) {
                doc.addPage();
                yPos = 20;
            }
            // Szeparátor az egyes típusok között
            if (typeIndex > 0) {
                doc.setLineWidth(0.5);
                doc.line(15, yPos, 195, yPos);
                yPos += 10;
            }

            // Típus-specifikus fejléc
            const finalBalance = typeRecords.reduce((acc, p) => acc + (p.palletsTaken || 0) - (p.palletsGiven || 0), 0);
            doc.setFontSize(14); doc.setFont(undefined, 'bold');
            doc.text(`${type} Egyenleg: ${finalBalance > 0 ? '+' : ''}${finalBalance} db`, 15, yPos);
            yPos += 10;

            // Táblázat fejléce
            const headers = [i18n.palletReportHeaderDate, i18n.palletReportHeaderLocation, i18n.palletReportHeaderGiven, i18n.palletReportHeaderTaken, i18n.palletReportHeaderPlate, i18n.palletReportHeaderBalance];
            const colWidths = [25, 65, 20, 20, 30, 20];
            doc.setFont('Helvetica', 'bold'); doc.setFontSize(10);
            let xPos = 15;
            headers.forEach((h, i) => { doc.text(h, xPos, yPos); xPos += colWidths[i]; });
            yPos += 2;
            doc.setLineWidth(0.2); doc.line(15, yPos, 195, yPos);
            yPos += 5;

            // Táblázat tartalma
            doc.setFont('Helvetica', 'normal'); doc.setFontSize(9);
            let runningBalance = 0;
            typeRecords.forEach(p => {
                if (yPos > pageBottom - 10) {
                    doc.addPage();
                    yPos = 20;
                }
                runningBalance += (p.palletsTaken || 0) - (p.palletsGiven || 0);
                xPos = 15;
                const row = [p.date, p.location, p.palletsGiven || '0', p.palletsTaken || '0', p.licensePlate || '-', `${runningBalance > 0 ? '+' : ''}${runningBalance}`];
                row.forEach((cell, i) => { doc.text(String(cell), xPos, yPos); xPos += colWidths[i]; });
                yPos += 6;
            });
            yPos += 5; // Térköz a következő típus előtt
        });

        doc.save(`${i18n.palletReportFileName}-${userName.replace(/ /g, "_")}-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (e) {
        console.error("PDF generation error:", e);
        showCustomAlert(i18n.errorPdfGeneration + " " + e.message, 'info');
    }
}
