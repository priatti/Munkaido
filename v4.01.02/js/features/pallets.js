// =======================================================
// ===== RAKLAPKEZELÉS (FEATURE) - VÉGLEGES VERZIÓ =======
// =======================================================

let selectedPalletType = 'EUR';
let editingPalletId = null;

function resetPalletForm() {
    safeSetValue('palletLocation', '');
    safeSetValue('palletGiven', '');
    safeSetValue('palletTaken', '');
    safeSetValue('palletDate', new Date().toISOString().split('T')[0]);
    safeSetValue('palletLicensePlate', localStorage.getItem('lastPalletLicensePlate') || '');
    editingPalletId = null;
    selectedPalletType = 'EUR';
    renderPalletTypeSelector();
}

function editPalletEntry(id) {
    const record = palletRecords.find(p => p.id === String(id));
    if (!record) return;

    editingPalletId = String(id);
    safeSetValue('palletDate', record.date);
    safeSetValue('palletLocation', record.location);
    safeSetValue('palletGiven', record.palletsGiven || '');
    safeSetValue('palletTaken', record.palletsTaken || '');
    safeSetValue('palletLicensePlate', record.licensePlate || '');
    selectedPalletType = record.type || 'EUR';
    renderPalletTypeSelector();
    
    document.getElementById('palletsTitle')?.scrollIntoView({ behavior: 'smooth' });
}

async function savePalletEntry() {
    const i18n = translations[currentLang];
    const date = document.getElementById('palletDate')?.value;
    const location = document.getElementById('palletLocation')?.value.trim();
    const palletsGiven = parseInt(document.getElementById('palletGiven')?.value, 10) || 0;
    const palletsTaken = parseInt(document.getElementById('palletTaken')?.value, 10) || 0;
    const licensePlate = document.getElementById('palletLicensePlate')?.value.trim().toUpperCase();

    if (!date || !location || (palletsGiven === 0 && palletsTaken === 0)) {
        showCustomAlert(i18n.palletInvalidData, "info");
        return;
    }

    const recordToSave = {
        id: editingPalletId ? String(editingPalletId) : String(Date.now()),
        date, location, palletsGiven, palletsTaken, type: selectedPalletType, licensePlate
    };

    if (editingPalletId) {
        const recordIndex = palletRecords.findIndex(p => p.id === editingPalletId);
        if (recordIndex > -1) palletRecords[recordIndex] = recordToSave;
    } else {
        palletRecords.push(recordToSave);
    }
    
    if (licensePlate) localStorage.setItem('lastPalletLicensePlate', licensePlate);

    if (currentUser) {
        try {
            await db.collection('users').doc(currentUser.uid).collection('pallets').doc(recordToSave.id).set(recordToSave);
        } catch (error) {
            showCustomAlert('Hiba a felhőbe mentéskor: ' + error.message, 'info');
            return;
        }
    } else {
        localStorage.setItem('palletRecords', JSON.stringify(palletRecords));
    }
    
    const successMessage = editingPalletId ? i18n.palletEditSuccess : i18n.palletSaveSuccess;
    showCustomAlert(successMessage, "success");
    
    resetPalletForm();
    renderPalletRecords();
    updateUniquePalletLocations();
}

async function deletePalletEntry(id) {
    const i18n = translations[currentLang];
    showCustomAlert(
        i18n.alertConfirmDelete, 
        'warning', 
        async () => {
            if (currentUser) {
                try {
                    await db.collection('users').doc(currentUser.uid).collection('pallets').doc(String(id)).delete();
                } catch (error) {
                     showCustomAlert('Hiba a törléskor: ' + error.message, 'info');
                     return;
                }
            }
            palletRecords = palletRecords.filter(p => p.id !== String(id));
            if (!currentUser) {
                localStorage.setItem('palletRecords', JSON.stringify(palletRecords));
            }
            renderPalletRecords();
        },
        { confirmText: i18n.delete, confirmClass: 'bg-red-500 hover:bg-red-600' }
    );
}

function updatePalletBalance() {
    const i18n = translations[currentLang];
    const displayEl = document.getElementById('palletBalanceDisplay');
    if (!displayEl) return;

    const palletMode = localStorage.getItem('palletMode') || 'single';
    let balanceHTML = '';

    if (palletMode === 'single') {
        const balance = palletRecords.reduce((acc, curr) => acc + (curr.palletsTaken || 0) - (curr.palletsGiven || 0), 0);
        const colorClass = balance > 0 ? 'text-green-600 dark:text-green-400' : (balance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-200');
        balanceHTML = `<p class="text-2xl font-bold ${colorClass}">${balance} db</p>`;
    } else {
        const types = getPalletTypes();
        let totalBalance = 0;
        const balanceDetails = types.map(type => {
            if (!palletRecords.some(r => r.type === type)) return ''; 
            const balance = palletRecords
                .filter(record => record.type === type)
                .reduce((acc, curr) => acc + (curr.palletsTaken || 0) - (curr.palletsGiven || 0), 0);
            totalBalance += balance;
            const colorClass = balance > 0 ? 'text-green-600 dark:text-green-400' : (balance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400');
            return `<span class="font-semibold ${colorClass}">${type}: ${balance}</span>`;
        }).filter(Boolean).join(' / ');

        const totalColorClass = totalBalance > 0 ? 'text-green-600 dark:text-green-400' : (totalBalance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-200');
        balanceHTML = `
            <p class="text-2xl font-bold ${totalColorClass}">${totalBalance} db</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${balanceDetails}</p>
        `;
    }
    displayEl.innerHTML = `<p class="text-sm font-medium">${i18n.palletsBalance}</p>${balanceHTML}`;
}

function renderPalletRecords() {
    renderPalletTypeSelector(); 
    const i18n = translations[currentLang];
    const container = document.getElementById('palletRecordsContainer');
    if (!container) return;
    
    updatePalletBalance();
    
    if (!editingPalletId) {
        safeSetValue('palletDate', new Date().toISOString().split('T')[0]);
        safeSetValue('palletLicensePlate', localStorage.getItem('lastPalletLicensePlate') || '');
    }

    if (palletRecords.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-4">${i18n.palletsNoTransactions}</p>`;
        return;
    }

    const sortedRecords = [...palletRecords].sort((a, b) => new Date(b.date) - new Date(a.date) || Number(b.id) - Number(a.id));

    container.innerHTML = sortedRecords.map(p => {
        const taken = p.palletsTaken || 0;
        const given = p.palletsGiven || 0;
        const diff = taken - given;
        let colorClass, borderColorClass, quantityText;
        if (diff > 0) {
            borderColorClass = 'border-green-500'; colorClass = 'text-green-700 dark:text-green-300'; quantityText = `+${diff}`;
        } else if (diff < 0) {
            borderColorClass = 'border-red-500'; colorClass = 'text-red-700 dark:text-red-300'; quantityText = `${diff}`;
        } else {
            borderColorClass = 'border-gray-400'; colorClass = 'text-gray-500 dark:text-gray-400'; quantityText = `⇄ ${taken}`;
        }
        const detailsHTML = [
            p.type ? `<span class="mt-1 text-xs font-semibold bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-full">${p.type}</span>` : '',
            p.licensePlate ? `<p class="text-xs text-gray-400 mt-1">${i18n.palletsLicensePlateLabel}: ${p.licensePlate}</p>` : ''
        ].filter(Boolean).join('');
        return `
        <div class="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border-l-4 ${borderColorClass} flex items-center justify-between">
            <div>
                <p class="font-semibold">${p.location}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${p.date}</p>
                <div class="flex items-center gap-2 mt-1">${detailsHTML}</div>
            </div>
            <div class="text-right">
                 <p class="font-bold text-lg ${colorClass}">${quantityText} db</p>
                 <p class="text-xs text-gray-400">(+${taken} / -${given})</p>
                 <button onclick="editPalletEntry('${p.id}')" title="${i18n.edit || 'Szerkesztés'}" class="text-blue-500 hover:text-blue-700 p-1 text-lg">✏️</button>
                 <button onclick="deletePalletEntry('${p.id}')" title="${i18n.delete || 'Törlés'}" class="text-gray-400 hover:text-red-500 p-1 text-lg">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

function renderPalletTypeSelector() {
    const container = document.getElementById('pallet-type-selector');
    if (!container) return;

    const palletMode = localStorage.getItem('palletMode') || 'single';
    if (palletMode === 'single') {
        selectedPalletType = 'EUR';
        container.innerHTML = `<button class="w-full text-left font-semibold p-2 rounded-lg bg-green-100 dark:bg-green-800/50 text-gray-800 dark:text-gray-100 cursor-default">✓ EUR</button>`;
    } else {
        const types = getPalletTypes();
        if (!types.includes(selectedPalletType)) selectedPalletType = 'EUR';
        container.innerHTML = types.map(type => {
            const isActive = type === selectedPalletType;
            const activeClass = isActive ? 'bg-green-100 dark:bg-green-800/50' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600';
            return `<button onclick="selectPalletType('${type}')" class="font-semibold p-2 rounded-lg text-sm ${activeClass} text-gray-800 dark:text-gray-100">${isActive ? '✓ ' : ''}${type}</button>`;
        }).join('');
    }
}

function selectPalletType(type) {
    selectedPalletType = type;
    renderPalletTypeSelector();
}

function generatePalletReport() {
    const i18n = translations[currentLang];
    if (palletRecords.length === 0) {
        showCustomAlert(i18n.alertNoPalletData, "info");
        return;
    }
    const now = new Date();
    const monthSelector = document.getElementById('palletReportMonthSelector');
    if (monthSelector) monthSelector.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dateFrom = document.getElementById('palletReportDateFrom');
    if (dateFrom) dateFrom.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const dateTo = document.getElementById('palletReportDateTo');
    if (dateTo) dateTo.value = now.toISOString().split('T')[0];

    const tabMonthly = document.getElementById('pallet-report-tab-monthly');
    const tabCustom = document.getElementById('pallet-report-tab-custom');
    const monthlyView = document.getElementById('pallet-report-monthly-view');
    const customView = document.getElementById('pallet-report-custom-view');

    const toggleTabs = (isMonthlyActive) => {
        tabMonthly.classList.toggle('active', isMonthlyActive);
        tabCustom.classList.toggle('active', !isMonthlyActive);
        monthlyView.classList.toggle('hidden', !isMonthlyActive);
        customView.classList.toggle('hidden', isMonthlyActive);
    };
    tabMonthly?.addEventListener('click', () => toggleTabs(true));
    tabCustom?.addEventListener('click', () => toggleTabs(false));
    toggleTabs(true);

    const palletMode = localStorage.getItem('palletMode') || 'single';
    const container = document.getElementById('pallet-report-types-container');
    if(!container) return;

    if (palletMode === 'single') {
        container.innerHTML = `<label class="hidden"><input type="checkbox" value="EUR" checked class="pallet-report-checkbox"></label>`;
    } else {
        const types = getPalletTypes().filter(type => palletRecords.some(r => r.type === type));
        if (types.length === 0) {
            showCustomAlert(i18n.alertNoPalletData, "info");
            return;
        }
        container.innerHTML = types.map(type => `
            <label class="pallet-report-label flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer">
                <span class="font-bold text-lg">${type}</span>
                <input type="checkbox" value="${type}" class="pallet-report-checkbox h-6 w-6 rounded border-2" checked>
            </label>`).join('');
    }
    document.querySelectorAll('.pallet-report-checkbox').forEach(checkbox => {
        togglePalletReportLabel(checkbox);
        checkbox.addEventListener('change', () => togglePalletReportLabel(checkbox));
    });
    showPalletReportModal();
}

function togglePalletReportLabel(checkbox) {
    const label = checkbox.closest('.pallet-report-label');
    if (!label) return;
    const span = label.querySelector('span');
    if (!span) return;
    label.classList.toggle('border-green-500', checkbox.checked);
    label.classList.toggle('bg-green-100', checkbox.checked);
    label.classList.toggle('dark:bg-green-900/50', checkbox.checked);
    label.classList.toggle('border-gray-200', !checkbox.checked);
    label.classList.toggle('dark:border-gray-600', !checkbox.checked);
    if (checkbox.checked && !span.textContent.startsWith('✓')) {
        span.textContent = '✓ ' + span.textContent;
    } else if (!checkbox.checked && span.textContent.startsWith('✓')) {
        span.textContent = span.textContent.substring(2);
    }
}

function showPalletReportModal() {
    document.getElementById('pallet-report-modal-overlay')?.classList.add('flex');
    document.getElementById('pallet-report-modal-overlay')?.classList.remove('hidden');
}

function hidePalletReportModal() {
    document.getElementById('pallet-report-modal-overlay')?.classList.add('hidden');
    document.getElementById('pallet-report-modal-overlay')?.classList.remove('flex');
}

function createSelectedPalletReport() {
    const i18n = translations[currentLang];
    const userName = localStorage.getItem('userName') || 'N/A';
    let startDate, endDate, dateRangeTitle;
    const isMonthly = document.getElementById('pallet-report-tab-monthly')?.classList.contains('active');

    if (isMonthly) {
        const monthValue = document.getElementById('palletReportMonthSelector').value;
        startDate = `${monthValue}-01`;
        const [year, month] = monthValue.split('-');
        endDate = `${monthValue}-${new Date(year, month, 0).getDate()}`;
        dateRangeTitle = new Date(startDate).toLocaleDateString(currentLang === 'de' ? 'de-DE' : 'hu-HU', { year: 'numeric', month: 'long' });
    } else {
        startDate = document.getElementById('palletReportDateFrom').value;
        endDate = document.getElementById('palletReportDateTo').value;
        if (!startDate || !endDate) {
            showCustomAlert('Kérlek válassz érvényes időszakot!', 'info');
            return;
        }
        dateRangeTitle = `${startDate} - ${endDate}`;
    }

    const selectedTypes = Array.from(document.querySelectorAll('.pallet-report-checkbox:checked')).map(cb => cb.value);
    if (selectedTypes.length === 0) {
        showCustomAlert("Kérlek, válassz legalább egy raklaptípust!", "info");
        return;
    }
    hidePalletReportModal();

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text(i18n.palletReportTitle, 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(userName, 105, 23, { align: 'center' });
        doc.text(dateRangeTitle, 105, 30, { align: 'center' });

        let yPos = 45;
        let hasData = false;
        selectedTypes.forEach((type, typeIndex) => {
            const typeRecords = palletRecords
                .filter(r => r.type === type && r.date >= startDate && r.date <= endDate)
                .sort((a, b) => new Date(a.date) - new Date(b.date));
            if (typeRecords.length === 0) return;
            hasData = true;
            if (yPos > 220 && typeIndex > 0) { doc.addPage(); yPos = 20; }
            if (typeIndex > 0) { yPos += 10; }
            const finalBalance = typeRecords.reduce((acc, p) => acc + (p.palletsTaken || 0) - (p.palletsGiven || 0), 0);
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text(`${type} - ${i18n.palletsBalance} ${finalBalance >= 0 ? '+' : ''}${finalBalance} db`, 15, yPos);
            yPos += 10;
            const headers = [i18n.palletReportHeaderDate, i18n.palletReportHeaderLocation, i18n.palletReportHeaderGiven, i18n.palletReportHeaderTaken, i18n.palletReportHeaderPlate, i18n.palletReportHeaderBalance];
            let runningBalance = 0;
            const tableBody = typeRecords.map(record => {
                runningBalance += (record.palletsTaken || 0) - (record.palletsGiven || 0);
                return [record.date, record.location, String(record.palletsGiven || 0), String(record.palletsTaken || 0), record.licensePlate || '-', `${runningBalance >= 0 ? '+' : ''}${runningBalance}`];
            });
            doc.autoTable({
                head: [headers],
                body: tableBody,
                startY: yPos,
                theme: 'grid',
                headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold' },
                didDrawPage: (data) => { yPos = data.cursor.y; }
            });
        });
        if (!hasData) {
            showCustomAlert(i18n.alertNoPalletData, "info");
            return;
        }
        doc.save(`${i18n.palletReportFileName}-${userName.replace(/ /g, "_")}-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
        console.error("PDF generation error:", error);
        showCustomAlert(`${i18n.errorPdfGeneration} ${error.message}`, 'info');
    }
}