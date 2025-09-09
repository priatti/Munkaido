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
        type: selectedPalletType, // A régi input helyett a kiválasztott típust mentjük
        licensePlate
    };

    if (licensePlate) localStorage.setItem('lastPalletLicensePlate', licensePlate);

    palletRecords.push(newEntry);
    await savePalletRecords();
    renderPalletRecords(); // Újrarajzolja a listát és a gombokat is
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

// Aktuális raklap egyenleg frissítése a UI-on (TELJESEN ÚJ VERZIÓ)
function updatePalletBalance() {
    const i18n = translations[currentLang];
    const displayEl = document.getElementById('palletBalanceDisplay');
    if (!displayEl) return;

    const palletMode = localStorage.getItem('palletMode') || 'single';
    let balanceHTML = '';
    let totalBalance = 0;

    // Ha csak egy típust kezelünk, a régi logika marad
    if (palletMode === 'single') {
        const balance = palletRecords.reduce((acc, curr) => acc + (curr.palletsTaken || 0) - (curr.palletsGiven || 0), 0);
        const colorClass = balance > 0 ? 'text-green-600 dark:text-green-400' : (balance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-200');
        balanceHTML = `<p class="text-2xl font-bold ${colorClass}">${balance} db</p>`;
    } 
    // Ha több típust, akkor külön számolunk mindent
    else {
        const types = getPalletTypes();
        const balances = {};
        
        // Kiszámoljuk minden típus egyenlegét
        types.forEach(type => {
            const typeBalance = palletRecords
                .filter(record => record.type === type)
                .reduce((acc, curr) => acc + (curr.palletsTaken || 0) - (curr.palletsGiven || 0), 0);
            balances[type] = typeBalance;
            totalBalance += typeBalance;
        });

        // Előállítjuk a részletező HTML-t
        const balanceDetails = types.map(type => {
            const balance = balances[type];
            // Csak azokat a típusokat jelenítjük meg, amiknek volt már mozgása
            if (!palletRecords.some(r => r.type === type)) return ''; 
            const colorClass = balance > 0 ? 'text-green-600 dark:text-green-400' : (balance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400');
            return `<span class="font-semibold ${colorClass}">${type}: ${balance}</span>`;
        }).filter(Boolean).join(' / '); // A filter(Boolean) kiszűri az üres stringeket

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
    renderPalletTypeSelector(); // Kirajzoljuk a típusválasztó gombokat

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
        selectedPalletType = 'EUR'; // Egyszerűsített módban mindig EUR
        container.innerHTML = `
            <button class="w-full text-left font-semibold p-2 rounded-lg bg-green-100 dark:bg-green-800/50 text-gray-800 dark:text-gray-100 cursor-default">
                ✓ EUR
            </button>`;
    } else {
        const types = getPalletTypes();
        // Alapértelmezett kiválasztás, ha a jelenlegi nem létezik
        if (!types.includes(selectedPalletType)) {
            selectedPalletType = 'EUR';
        }

        container.innerHTML = types.map(type => {
            const isActive = type === selectedPalletType;
            const activeClass = isActive ? 'bg-green-100 dark:bg-green-800/50' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600';
            
            return `
                <button onclick="selectPalletType('${type}')" class="font-semibold p-2 rounded-lg text-sm ${activeClass} text-gray-800 dark:text-gray-100">
                    ${isActive ? '✓ ' : ''}${type}
                </button>`;
        }).join('');
    }
}

// A raklaptípus kiválasztását kezelő esemény
function selectPalletType(type) {
    selectedPalletType = type;
    renderPalletTypeSelector(); // Újrarajzoljuk a gombokat, hogy a vizuális állapot frissüljön
}


// Raklap riport generálása PDF-be (egyelőre változatlan)
function generatePalletReport() {
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
