// =======================================================
// ===== BEÁLLÍTÁSOK (FEATURE) ===========================
// =======================================================

// Felhasználói beállítások mentése (pl. név)
function saveSettings() {
    localStorage.setItem('userName', document.getElementById('userNameInput').value);
    showCustomAlert(translations[currentLang].settingsSaved, 'success');
}

// Mentett beállítások betöltése az űrlapokba
function loadSettings() {
    document.getElementById('userNameInput').value = localStorage.getItem('userName') || '';
    document.getElementById('themeSelector').value = localStorage.getItem('theme') || 'auto';
    document.getElementById('autoExportSelector').value = localStorage.getItem('autoExportFrequency') || 'never';
}

// Adatok exportálása JSON fájlba
function exportData() {
    if (records.length === 0 && palletRecords.length === 0) {
        showCustomAlert(translations[currentLang].alertNoDataToExport, 'info');
        return;
    }
    const dataToExport = {
        workRecords: records,
        palletRecords: palletRecords
    };
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `munkaido_pro_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Adatok importálása JSON fájlból
function importData() {
    const i18n = translations[currentLang];
    const fileInput = document.getElementById('importFile');
    if (!fileInput.files.length) {
        showCustomAlert(i18n.alertChooseFile, 'info');
        return;
    }

    showCustomAlert(i18n.alertConfirmImport, 'warning', () => {
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) { // Visszafelé kompatibilitás a régi (csak workRecords) exporttal
                    records = imported;
                    palletRecords = []; 
                } else if (imported.workRecords || imported.palletRecords) {
                    records = imported.workRecords || [];
                    palletRecords = imported.palletRecords || [];
                } else {
                    throw new Error(i18n.alertImportInvalid);
                }

                if (currentUser) {
                    await migrateLocalToFirestore(records, 'records');
                    await migrateLocalToFirestore(palletRecords, 'pallets');
                } else {
                    localStorage.setItem('workRecords', JSON.stringify(records));
                    localStorage.setItem('palletRecords', JSON.stringify(palletRecords));
                }
                renderApp();
                showCustomAlert(i18n.alertImportSuccess, 'success');
            } catch (err) {
                showCustomAlert(i18n.errorImport + ' ' + err.message, 'info');
            }
        };
        reader.readAsText(fileInput.files[0]);
    });
}

// Speciális funkciók (pl. km, vezetési idő) kapcsolóinak kezelése
const featureToggles = ['toggleKm', 'toggleDriveTime', 'togglePallets', 'toggleCompensation'];

// ENHANCED: Új vizuális kapcsoló kezelés - JAVÍTOTT (nincs csúszka)
function updateEnhancedToggleVisuals(checkbox) {
    const container = checkbox.closest('.enhanced-toggle-container');
    const checkmark = container.querySelector('.enhanced-toggle-checkmark');
    
    if (!container) return;

    if (checkbox.checked) {
        // Aktív állapot
        container.classList.add('active');
        if (checkmark) checkmark.classList.remove('hidden');
    } else {
        // Inaktív állapot
        container.classList.remove('active');
        if (checkmark) checkmark.classList.add('hidden');
    }
}

// Speciális funkciók kapcsolóinak inicializálása
function initializeFeatureToggles() {
    featureToggles.forEach(toggleId => {
        const checkbox = document.getElementById(toggleId);
        if (checkbox) {
            const savedState = localStorage.getItem(toggleId) === 'true';
            checkbox.checked = savedState;
            updateEnhancedToggleVisuals(checkbox);
            checkbox.addEventListener('change', (e) => {
                localStorage.setItem(toggleId, e.target.checked);
                applyFeatureToggles();
                updateEnhancedToggleVisuals(e.target);
            });
        }
    });
    
    // Osztott pihenő kapcsoló inicializálása
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        splitRestToggle.addEventListener('change', (e) => {
            updateEnhancedToggleVisuals(e.target);
        });
    }
    
    applyFeatureToggles();
}

// A speciális funkciók állapotának érvényesítése a UI-on - JAVÍTOTT
function applyFeatureToggles() {
    const showKm = localStorage.getItem('toggleKm') === 'true';
    const showDriveTime = localStorage.getItem('toggleDriveTime') === 'true';
    const showPallets = localStorage.getItem('togglePallets') === 'true';
    const showCompensation = localStorage.getItem('toggleCompensation') === 'true';

    // KM és vezetési idő szekciók
    const kmSection = document.getElementById('km-section');
    const drivetimeSection = document.getElementById('drivetime-section');
    if (kmSection) kmSection.style.display = showKm ? 'block' : 'none';
    if (drivetimeSection) drivetimeSection.style.display = showDriveTime ? 'block' : 'none';
    
    // JAVÍTVA: Kompenzáció szekció - csak akkor rejtjük el, ha német nyelv VAGY ki van kapcsolva
    const compensationSection = document.getElementById('compensation-section-de');
    if (compensationSection) {
        // Német nyelven mindig rejtve, magyaron a beállítás szerint
        compensationSection.style.display = (currentLang === 'de' || !showCompensation) ? 'none' : 'block';
    }
    
    // JAVÍTVA: Kompenzáció kapcsoló a beállításokban - csak németnél rejtjük el
    const compensationToggleContainer = document.getElementById('toggleCompensation')?.closest('.enhanced-toggle-container');
    if (compensationToggleContainer) {
        compensationToggleContainer.style.display = currentLang === 'de' ? 'none' : 'flex';
    }
    
    // Osztott pihenő gomb megjelenítése/elrejtése - JAVÍTOTT LOGIKA
    const splitRestContainer = document.getElementById('split-rest-container');
    if (splitRestContainer) {
        splitRestContainer.style.display = showDriveTime ? 'flex' : 'none';
    }
    
    // Raklap menüpont
    const palletMenuItem = document.getElementById('menu-item-pallets');
    if (palletMenuItem) {
        palletMenuItem.style.display = showPallets ? 'flex' : 'none';
    }

    // Tachográf elemek
    const tachoHelperDisplay = document.getElementById('tacho-helper-display');
    const liveAllowanceDisplay = document.getElementById('live-allowance-display');
    const tachographMenuItem = document.getElementById('menu-item-tachograph');

    if (tachoHelperDisplay) tachoHelperDisplay.style.display = showDriveTime ? 'block' : 'none';
    if (liveAllowanceDisplay) liveAllowanceDisplay.style.display = showDriveTime ? 'block' : 'none';
    if (tachographMenuItem) tachographMenuItem.style.display = showDriveTime ? 'flex' : 'none';
    
    // Fülváltás ha egy kikapcsolt funkció aktív
    if (!showDriveTime && currentActiveTab === 'tachograph') showTab('live');
    if (!showPallets && currentActiveTab === 'pallets') showTab('live');
}

// Automatikus mentés (export) ellenőrzése
function checkForAutoExport() {
    const frequency = localStorage.getItem('autoExportFrequency') || 'never';
    if (frequency === 'never' || (records.length === 0 && palletRecords.length === 0)) {
        return;
    }
    const lastExportDateStr = localStorage.getItem('lastAutoExportDate');
    if (!lastExportDateStr) {
        localStorage.setItem('lastAutoExportDate', new Date().toISOString());
        return;
    }

    const lastExportDate = new Date(lastExportDateStr);
    const today = new Date();
    const diffTime = today - lastExportDate;
    let requiredInterval = 0;

    switch (frequency) {
        case 'daily':   requiredInterval = 24 * 60 * 60 * 1000; break;
        case 'weekly':  requiredInterval = 7 * 24 * 60 * 60 * 1000; break;
        case 'monthly': requiredInterval = 30 * 24 * 60 * 60 * 1000; break;
    }

    if (diffTime > requiredInterval) {
        console.log(`${translations[currentLang].logAutoExportStarted} (${frequency})`);
        exportData();
        localStorage.setItem('lastAutoExportDate', new Date().toISOString());
    }
}

// =======================================================
// ===== RAKLAP BEÁLLÍTÁSOK (SETTINGS) ===================
// =======================================================

// Inicializálja a raklap beállítások eseménykezelőit
function initializePalletSettings() {
    const toggle = document.getElementById('toggleMultiPallet');
    if (!toggle) return;

    // Beállítás betöltése és eseményfigyelő hozzáadása a kapcsolóhoz
    const isMultiPalletMode = localStorage.getItem('palletMode') === 'multi';
    toggle.checked = isMultiPalletMode;
    updateEnhancedToggleVisuals(toggle); // ENHANCED: Új vizuális kezelés
    updateMultiPalletSettingsVisibility(isMultiPalletMode);

    toggle.addEventListener('change', (e) => {
        const newMode = e.target.checked ? 'multi' : 'single';
        localStorage.setItem('palletMode', newMode);
        updateEnhancedToggleVisuals(e.target); // ENHANCED: Új vizuális kezelés
        updateMultiPalletSettingsVisibility(e.target.checked);
    });

    // Raklaptípusok renderelése
    renderPalletTypesList();
}

// Megjeleníti vagy elrejti a több-raklapos beállításokat
function updateMultiPalletSettingsVisibility(isVisible) {
    const container = document.getElementById('multi-pallet-settings-container');
    if (isVisible) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

// Kiolvassa a raklaptípusokat a mentésből (EUR mindig az első)
function getPalletTypes() {
    const savedTypes = JSON.parse(localStorage.getItem('customPalletTypes') || '[]');
    // Biztosítjuk, hogy az 'EUR' csak egyszer szerepeljen és mindig az elején
    const uniqueTypes = [...new Set(savedTypes)];
    return ['EUR', ...uniqueTypes.filter(t => t !== 'EUR')];
}

// Elmenti az egyedi raklaptípusokat
function savePalletTypes(types) {
    // Az 'EUR'-t sosem mentjük, mert az fix
    const customTypes = types.filter(t => t !== 'EUR');
    localStorage.setItem('customPalletTypes', JSON.stringify(customTypes));
}

// Megjeleníti a beállításokban a raklaptípusok listáját
function renderPalletTypesList() {
    const listContainer = document.getElementById('pallet-types-list');
    if (!listContainer) return;

    const types = getPalletTypes();
    listContainer.innerHTML = types.map(type => `
        <div class="flex items-center justify-between bg-gray-100 dark:bg-gray-600 p-2 rounded-lg">
            <span class="font-semibold text-gray-800 dark:text-gray-100">${type}</span>
            ${type !== 'EUR' ? `<button onclick="deletePalletType('${type}')" class="text-red-500 hover:text-red-700 text-xl font-bold">×</button>` : ''}
        </div>
    `).join('');
}

// Új raklaptípus hozzáadása
function addPalletType() {
    const i18n = translations[currentLang];
    const input = document.getElementById('newPalletTypeName');
    const newType = input.value.trim().toUpperCase();

    if (!newType) {
        showCustomAlert(i18n.palletTypeNameEmpty, 'info');
        return;
    }

    const currentTypes = getPalletTypes();
    if (currentTypes.includes(newType)) {
        showCustomAlert(i18n.palletTypeExists, 'info');
        return;
    }

    currentTypes.push(newType);
    savePalletTypes(currentTypes);
    renderPalletTypesList();
    input.value = '';
}

// Raklaptípus törlése
function deletePalletType(typeToDelete) {
    const i18n = translations[currentLang];
    const confirmMessage = i18n.deletePalletTypeConfirm.replace('{type}', typeToDelete);
    showCustomAlert(confirmMessage, 'warning', () => {
        let currentTypes = getPalletTypes();
        currentTypes = currentTypes.filter(t => t !== typeToDelete);
        savePalletTypes(currentTypes);
        renderPalletTypesList();
    });
}
