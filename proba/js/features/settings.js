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
    if (records.length === 0) {
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
                // Visszafelé kompatibilitás a régi (csak workRecords) exporttal
                if (Array.isArray(imported)) {
                    records = imported;
                    palletRecords = []; // Régi import esetén töröljük a raklapokat
                } else if (imported.workRecords && imported.palletRecords) {
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

function updateToggleVisuals(checkbox) {
    const label = checkbox.closest('label');
    if (!label) return;
    const checkmark = label.querySelector('.toggle-checkmark');
    if (checkbox.checked) {
        if (checkmark) checkmark.classList.remove('hidden');
    } else {
        if (checkmark) checkmark.classList.add('hidden');
    }
}

function initializeFeatureToggles() {
    featureToggles.forEach(toggleId => {
        const checkbox = document.getElementById(toggleId);
        if (checkbox) {
            const savedState = localStorage.getItem(toggleId) === 'true';
            checkbox.checked = savedState;
            updateToggleVisuals(checkbox);
            checkbox.addEventListener('change', (e) => {
                localStorage.setItem(toggleId, e.target.checked);
                applyFeatureToggles();
                updateToggleVisuals(e.target);
            });
        }
    });
    applyFeatureToggles();
}

// A speciális funkciók állapotának érvényesítése a UI-on
function applyFeatureToggles() {
    const showKm = localStorage.getItem('toggleKm') === 'true';
    const showDriveTime = localStorage.getItem('toggleDriveTime') === 'true';
    const showPallets = localStorage.getItem('togglePallets') === 'true';
    const showCompensation = localStorage.getItem('toggleCompensation') === 'true';

    document.getElementById('km-section').style.display = showKm ? 'block' : 'none';
    document.getElementById('drivetime-section').style.display = showDriveTime ? 'block' : 'none';
    
    const compensationSection = document.getElementById('compensation-section-de');
    if (compensationSection) {
        compensationSection.style.display = showCompensation ? 'block' : 'none';
    }
    
    const palletMenuItem = document.getElementById('menu-item-pallets');
    if(palletMenuItem) {
        palletMenuItem.style.display = showPallets ? 'flex' : 'none';
    }

    const tachoHelperDisplay = document.getElementById('tacho-helper-display');
    const liveAllowanceDisplay = document.getElementById('live-allowance-display');
    const tachographMenuItem = document.getElementById('menu-item-tachograph');

    if (tachoHelperDisplay) tachoHelperDisplay.style.display = showDriveTime ? 'block' : 'none';
    if (liveAllowanceDisplay) liveAllowanceDisplay.style.display = showDriveTime ? 'block' : 'none';
    if (tachographMenuItem) tachographMenuItem.style.display = showDriveTime ? 'flex' : 'none';
    
    // Ha a felhasználó kikapcsol egy aktív fület, váltsunk vissza az áttekintésre
    if (!showDriveTime && currentActiveTab === 'tachograph') showTab('live');
    if (!showPallets && currentActiveTab === 'pallets') showTab('live');
}

// Automatikus mentés (export) ellenőrzése
function checkForAutoExport() {
    const frequency = localStorage.getItem('autoExportFrequency') || 'never';
    if (frequency === 'never' || records.length === 0) {
        return;
    }
    const lastExportDateStr = localStorage.getItem('lastAutoExportDate');
    if (!lastExportDateStr) {
        // Ha van beállítás, de még nem volt mentés, mentsünk most
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
