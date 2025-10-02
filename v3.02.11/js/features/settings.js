// =======================================================
// ===== BEÁLLÍTÁSOK (FEATURE) ===========================
// =======================================================

async function uploadLocalSettings() {
    const settingsToSync = {};
    const keysToSync = [
        'userName', 'theme', 'autoExportFrequency', 'language',
        'toggleKm', 'toggleDriveTime', 'togglePallets', 'toggleCompensation',
        'palletMode', 'customPalletTypes'
    ];

    keysToSync.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
            settingsToSync[key] = value;
        }
    });

    await saveSettingsToFirestore(settingsToSync);
}

function refreshToggleVisuals() {
    const togglesToRefresh = [
        'toggleKm', 'toggleDriveTime', 'togglePallets', 'toggleCompensation', 'toggleMultiPallet'
    ];

    togglesToRefresh.forEach(toggleId => {
        const checkbox = document.getElementById(toggleId);
        if (checkbox) {
            const savedState = localStorage.getItem(toggleId) === 'true';
            checkbox.checked = savedState;
            updateEnhancedToggleVisuals(checkbox);
        }
    });
}

// Felhasználói beállítások mentése (pl. név)
function saveSettings() {
    const userNameInput = document.getElementById('userNameInput');
    if (userNameInput) {
        localStorage.setItem('userName', userNameInput.value);
        showCustomAlert(translations[currentLang].settingsSaved, 'success');
        uploadLocalSettings();
    }
}

// Mentett beállítások betöltése az űrlapokba
function loadSettings() {
    const userNameInput = document.getElementById('userNameInput');
    if(userNameInput) userNameInput.value = localStorage.getItem('userName') || '';
    
    const themeSelector = document.getElementById('themeSelector');
    if(themeSelector) themeSelector.value = localStorage.getItem('theme') || 'auto';

    const autoExportSelector = document.getElementById('autoExportSelector');
    if(autoExportSelector) autoExportSelector.value = localStorage.getItem('autoExportFrequency') || 'never';
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
    if (!fileInput || !fileInput.files.length) {
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

function initializeFeatureToggles() {
    refreshToggleVisuals();

    featureToggles.forEach(toggleId => {
        const checkbox = document.getElementById(toggleId);
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                localStorage.setItem(toggleId, e.target.checked);
                updateEnhancedToggleVisuals(e.target);
                applyFeatureToggles();
                uploadLocalSettings();
            });
        }
    });
    
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        updateEnhancedToggleVisuals(splitRestToggle);
        splitRestToggle.addEventListener('change', (e) => {
            updateEnhancedToggleVisuals(e.target);
        });
    }
    
    const multiPalletToggle = document.getElementById('toggleMultiPallet');
    if(multiPalletToggle) {
        multiPalletToggle.addEventListener('change', (e) => {
            const newMode = e.target.checked ? 'multi' : 'single';
            localStorage.setItem('palletMode', newMode);
            updateEnhancedToggleVisuals(e.target);
            updateMultiPalletSettingsVisibility(e.target.checked);
            uploadLocalSettings();
        });
    }
    
    applyFeatureToggles();
}

function updateEnhancedToggleVisuals(checkbox) {
    const container = checkbox.closest('.enhanced-toggle-container');
    if (!container) return;
    
    const checkmark = container.querySelector('.enhanced-toggle-checkmark');
    
    if (checkbox.checked) {
        container.classList.add('active');
        if (checkmark) checkmark.classList.remove('hidden');
    } else {
        container.classList.remove('active');
        if (checkmark) checkmark.classList.add('hidden');
    }
}

function applyFeatureToggles() {
    const special = document.getElementById('special-features');
    if (special) special.style.display = 'block';
    
    const showKm = localStorage.getItem('toggleKm') === 'true';
    const showDriveTime = localStorage.getItem('toggleDriveTime') === 'true';
    const showPallets = localStorage.getItem('togglePallets') === 'true';
    const showCompensation = localStorage.getItem('toggleCompensation') === 'true';

    const currentLangSafe = (typeof currentLang !== 'undefined') ? currentLang : 'hu';
    
    const sections = {
        'km-section': showKm,
        'drivetime-section': showDriveTime,
        'compensation-section-de': currentLangSafe !== 'de' && showCompensation,
        'split-rest-container': showDriveTime,
        'menu-item-pallets': showPallets,
        'tacho-helper-display': showDriveTime,
        'live-allowance-display': showDriveTime,
        'menu-item-tachograph': showDriveTime,
    };

    for (const id in sections) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = sections[id] ? '' : 'none';
        }
    }
    
    const compensationToggleContainer = document.getElementById('toggleCompensation')?.closest('.enhanced-toggle-container');
    if (compensationToggleContainer) {
        compensationToggleContainer.style.display = currentLangSafe === 'de' ? 'none' : 'flex';
    }

    if (typeof currentActiveTab !== 'undefined') {
        if (!showDriveTime && currentActiveTab === 'tachograph') showTab('live');
        if (!showPallets && currentActiveTab === 'pallets') showTab('live');
    }
}

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

function initializePalletSettings() {
    const toggle = document.getElementById('toggleMultiPallet');
    if (!toggle) return;

    const isMultiPalletMode = localStorage.getItem('palletMode') === 'multi';
    toggle.checked = isMultiPalletMode;
    updateEnhancedToggleVisuals(toggle);
    updateMultiPalletSettingsVisibility(isMultiPalletMode);

    renderPalletTypesList();
}

function updateMultiPalletSettingsVisibility(isVisible) {
    const container = document.getElementById('multi-pallet-settings-container');
    if (!container) {
        console.warn('multi-pallet-settings-container not found');
        return;
    }
    
    if (isVisible) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

function getPalletTypes() {
    const savedTypes = JSON.parse(localStorage.getItem('customPalletTypes') || '[]');
    const uniqueTypes = [...new Set(savedTypes)];
    return ['EUR', ...uniqueTypes.filter(t => t !== 'EUR')];
}

function savePalletTypes(types) {
    const customTypes = types.filter(t => t !== 'EUR');
    localStorage.setItem('customPalletTypes', JSON.stringify(customTypes));
}

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

function addPalletType() {
    const i18n = translations[currentLang];
    const input = document.getElementById('newPalletTypeName');
    if(!input) return;

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
    uploadLocalSettings();
}

function deletePalletType(typeToDelete) {
    const i18n = translations[currentLang];
    const confirmMessage = i18n.deletePalletTypeConfirm.replace('{type}', typeToDelete);
    showCustomAlert(confirmMessage, 'warning', () => {
        let currentTypes = getPalletTypes();
        currentTypes = currentTypes.filter(t => t !== typeToDelete);
        savePalletTypes(currentTypes);
        renderPalletTypesList();
        uploadLocalSettings();
    });
}

// === Append legal info to bottom of Settings tab (non-sticky) ===
(function() {
  function insertLegalIntoSettings() {
    try {
      const cont = document.getElementById('content-settings');
      if (!cont) return;
      if (document.getElementById('legal-info-settings')) return;
      const v = (window.appInfo && appInfo.version) ? appInfo.version : '3.02.11b';
      const legal = document.createElement('div');
      legal.id = 'legal-info-settings';
      legal.className = 'text-xs text-gray-400 my-3 text-center';
      legal.innerHTML = `© 2025 Princz Attila | GuriGO — <a href="mailto:info@gurigo.eu" class="underline">info@gurigo.eu</a> | v${v}`;
      cont.appendChild(legal);
    } catch(e){ console.warn('settings legal inject failed', e); }
  }
  // Run on load and whenever Settings tab is likely shown
  setTimeout(insertLegalIntoSettings, 0);
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t) return;
    // Catch clicks that open the settings tab
    if ((t.closest && t.closest('[onclick*="showTab('settings')"]')) || (t.dataset && t.dataset.tab === 'settings')) {
      setTimeout(insertLegalIntoSettings, 0);
    }
  });
  window.addEventListener('pageshow', () => setTimeout(insertLegalIntoSettings, 0));
})();