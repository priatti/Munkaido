// =======================================================
// ===== BEÁLLÍTÁSOK (FEATURE) - JAVÍTOTT ===============
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

    if (typeof saveSettingsToFirestore === 'function') {
        await saveSettingsToFirestore(settingsToSync);
    }
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
            if (typeof updateEnhancedToggleVisuals === 'function') {
                updateEnhancedToggleVisuals(checkbox);
            }
        }
    });
}

// Felhasználói beállítások mentése (pl. név)
function saveSettings() {
    const userNameInput = document.getElementById('userNameInput');
    if (userNameInput) {
        localStorage.setItem('userName', userNameInput.value);
        if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
            const i18n = translations[currentLang];
            if (typeof showCustomAlert === 'function') {
                showCustomAlert(i18n.settingsSaved, 'success');
            }
        }
        if (typeof uploadLocalSettings === 'function') {
            uploadLocalSettings();
        }
    }
}

// Mentett beállítások betöltése az űrlapokba
function loadSettings() {
    const userNameInput = document.getElementById('userNameInput');
    if (userNameInput) {
        userNameInput.value = localStorage.getItem('userName') || '';
    }
    
    const themeSelector = document.getElementById('themeSelector');
    if (themeSelector) {
        themeSelector.value = localStorage.getItem('theme') || 'auto';
    }

    const autoExportSelector = document.getElementById('autoExportSelector');
    if (autoExportSelector) {
        autoExportSelector.value = localStorage.getItem('autoExportFrequency') || 'never';
    }
}

// Adatok exportálása JSON fájlba
function exportData() {
    if (typeof records === 'undefined' || typeof palletRecords === 'undefined') {
        console.warn('[Settings] Records not available for export');
        return;
    }

    if (records.length === 0 && palletRecords.length === 0) {
        if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
            const i18n = translations[currentLang];
            if (typeof showCustomAlert === 'function') {
                showCustomAlert(i18n.alertNoDataToExport, 'info');
            }
        }
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
    if (typeof translations === 'undefined' || typeof currentLang === 'undefined') {
        console.warn('[Settings] Translations not available');
        return;
    }

    const i18n = translations[currentLang];
    const fileInput = document.getElementById('importFile');
    
    if (!fileInput || !fileInput.files.length) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.alertChooseFile, 'info');
        }
        return;
    }

    if (typeof showCustomAlert !== 'function') {
        console.error('[Settings] showCustomAlert function not available');
        return;
    }

    showCustomAlert(i18n.alertConfirmImport, 'warning', () => {
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const imported = JSON.parse(e.target.result);
                
                if (Array.isArray(imported)) {
                    // Visszafelé kompatibilitás a régi (csak workRecords) exporttal
                    if (typeof records !== 'undefined') {
                        records = imported;
                    }
                    if (typeof palletRecords !== 'undefined') {
                        palletRecords = [];
                    }
                } else if (imported.workRecords || imported.palletRecords) {
                    if (typeof records !== 'undefined') {
                        records = imported.workRecords || [];
                    }
                    if (typeof palletRecords !== 'undefined') {
                        palletRecords = imported.palletRecords || [];
                    }
                } else {
                    throw new Error(i18n.alertImportInvalid);
                }

                if (typeof currentUser !== 'undefined' && currentUser) {
                    if (typeof migrateLocalToFirestore === 'function') {
                        await migrateLocalToFirestore(records, 'records');
                        await migrateLocalToFirestore(palletRecords, 'pallets');
                    }
                } else {
                    localStorage.setItem('workRecords', JSON.stringify(records));
                    localStorage.setItem('palletRecords', JSON.stringify(palletRecords));
                }

                if (typeof renderApp === 'function') {
                    renderApp();
                }
                
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert(i18n.alertImportSuccess, 'success');
                }
            } catch (err) {
                console.error('[Settings] Import error:', err);
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert(i18n.errorImport + ' ' + err.message, 'info');
                }
            }
        };
        reader.readAsText(fileInput.files[0]);
    });
}

// Speciális funkciók (pl. km, vezetési idő) kapcsolóinak kezelése
const featureToggles = ['toggleKm', 'toggleDriveTime', 'togglePallets', 'toggleCompensation'];

function initializeFeatureToggles() {
    if (typeof refreshToggleVisuals === 'function') {
        refreshToggleVisuals();
    }

    featureToggles.forEach(toggleId => {
        const checkbox = document.getElementById(toggleId);
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                localStorage.setItem(toggleId, e.target.checked);
                if (typeof updateEnhancedToggleVisuals === 'function') {
                    updateEnhancedToggleVisuals(e.target);
                }
                if (typeof applyFeatureToggles === 'function') {
                    applyFeatureToggles();
                }
                if (typeof uploadLocalSettings === 'function') {
                    uploadLocalSettings();
                }
            });
        }
    });
    
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        if (typeof updateEnhancedToggleVisuals === 'function') {
            updateEnhancedToggleVisuals(splitRestToggle);
        }
        splitRestToggle.addEventListener('change', (e) => {
            if (typeof updateEnhancedToggleVisuals === 'function') {
                updateEnhancedToggleVisuals(e.target);
            }
        });
    }
    
    const multiPalletToggle = document.getElementById('toggleMultiPallet');
    if (multiPalletToggle) {
        multiPalletToggle.addEventListener('change', (e) => {
            const newMode = e.target.checked ? 'multi' : 'single';
            localStorage.setItem('palletMode', newMode);
            if (typeof updateEnhancedToggleVisuals === 'function') {
                updateEnhancedToggleVisuals(e.target);
            }
            if (typeof updateMultiPalletSettingsVisibility === 'function') {
                updateMultiPalletSettingsVisibility(e.target.checked);
            }
            if (typeof uploadLocalSettings === 'function') {
                uploadLocalSettings();
            }
        });
    }
    
    if (typeof applyFeatureToggles === 'function') {
        applyFeatureToggles();
    }
}

function updateEnhancedToggleVisuals(checkbox) {
    if (!checkbox) return;
    
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
    if (special) {
        special.style.display = 'block';
    }
    
    const showKm = localStorage.getItem('toggleKm') === 'true';
    const showDriveTime = localStorage.getItem('toggleDriveTime') === 'true';
    const showPallets = localStorage.getItem('togglePallets') === 'true';
    const showCompensation = localStorage.getItem('toggleCompensation') === 'true';

    const currentLangSafe = (typeof currentLang !== 'undefined') ? currentLang : 'hu';
    
    // JAVÍTÁS: A kompenzáció mező csak akkor látható, ha BE van kapcsolva ÉS nem német nyelven vagyunk
    const sections = {
        'km-section': showKm,
        'drivetime-section': showDriveTime,
        'compensation-section-de': showCompensation && currentLangSafe !== 'de',
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
    
    // A kompenzáció toggle konténer láthatósága a beállításokban
    const compensationToggleContainer = document.getElementById('toggleCompensation')?.closest('.enhanced-toggle-container');
    if (compensationToggleContainer) {
        compensationToggleContainer.style.display = currentLangSafe === 'de' ? 'none' : 'flex';
    }

    if (typeof currentActiveTab !== 'undefined') {
        if (!showDriveTime && currentActiveTab === 'tachograph') {
            if (typeof showTab === 'function') {
                showTab('live');
            }
        }
        if (!showPallets && currentActiveTab === 'pallets') {
            if (typeof showTab === 'function') {
                showTab('live');
            }
        }
    }
}

function checkForAutoExport() {
    const frequency = localStorage.getItem('autoExportFrequency') || 'never';
    
    if (frequency === 'never') {
        return;
    }

    if (typeof records === 'undefined' || typeof palletRecords === 'undefined') {
        console.warn('[Settings] Records not available for auto export check');
        return;
    }

    if (records.length === 0 && palletRecords.length === 0) {
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
        case 'daily':
            requiredInterval = 24 * 60 * 60 * 1000;
            break;
        case 'weekly':
            requiredInterval = 7 * 24 * 60 * 60 * 1000;
            break;
        case 'monthly':
            requiredInterval = 30 * 24 * 60 * 60 * 1000;
            break;
    }

    if (diffTime > requiredInterval) {
        if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
            const i18n = translations[currentLang];
            console.log(`${i18n.logAutoExportStarted} (${frequency})`);
        }
        
        if (typeof exportData === 'function') {
            exportData();
        }
        localStorage.setItem('lastAutoExportDate', new Date().toISOString());
    }
}

function initializePalletSettings() {
    const toggle = document.getElementById('toggleMultiPallet');
    if (!toggle) return;

    const isMultiPalletMode = localStorage.getItem('palletMode') === 'multi';
    toggle.checked = isMultiPalletMode;
    
    if (typeof updateEnhancedToggleVisuals === 'function') {
        updateEnhancedToggleVisuals(toggle);
    }
    
    if (typeof updateMultiPalletSettingsVisibility === 'function') {
        updateMultiPalletSettingsVisibility(isMultiPalletMode);
    }

    if (typeof renderPalletTypesList === 'function') {
        renderPalletTypesList();
    }
}

function updateMultiPalletSettingsVisibility(isVisible) {
    const container = document.getElementById('multi-pallet-settings-container');
    if (!container) {
        console.warn('[Settings] multi-pallet-settings-container not found');
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
    if (typeof translations === 'undefined' || typeof currentLang === 'undefined') {
        console.warn('[Settings] Translations not available');
        return;
    }

    const i18n = translations[currentLang];
    const input = document.getElementById('newPalletTypeName');
    if (!input) return;

    const newType = input.value.trim().toUpperCase();

    if (!newType) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.palletTypeNameEmpty, 'info');
        }
        return;
    }

    const currentTypes = getPalletTypes();
    if (currentTypes.includes(newType)) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.palletTypeExists, 'info');
        }
        return;
    }

    currentTypes.push(newType);
    savePalletTypes(currentTypes);
    
    if (typeof renderPalletTypesList === 'function') {
        renderPalletTypesList();
    }
    
    input.value = '';
    
    if (typeof uploadLocalSettings === 'function') {
        uploadLocalSettings();
    }
}

function deletePalletType(typeToDelete) {
    if (typeof translations === 'undefined' || typeof currentLang === 'undefined') {
        console.warn('[Settings] Translations not available');
        return;
    }

    const i18n = translations[currentLang];
    const confirmMessage = i18n.deletePalletTypeConfirm.replace('{type}', typeToDelete);
    
    if (typeof showCustomAlert === 'function') {
        showCustomAlert(confirmMessage, 'warning', () => {
            let currentTypes = getPalletTypes();
            currentTypes = currentTypes.filter(t => t !== typeToDelete);
            savePalletTypes(currentTypes);
            
            if (typeof renderPalletTypesList === 'function') {
                renderPalletTypesList();
            }
            
            if (typeof uploadLocalSettings === 'function') {
                uploadLocalSettings();
            }
        });
    }
}

// === Append legal info to bottom of Settings tab (non-sticky) ===
(function() {
    function insertLegalIntoSettings() {
        try {
            const cont = document.getElementById('content-settings');
            if (!cont) return;
            if (document.getElementById('legal-info-settings')) return;
            
            const v = (typeof window !== 'undefined' && window.APP_INFO && window.APP_INFO.version) 
                ? window.APP_INFO.version 
                : '3.02.11f';
            
            const legal = document.createElement('div');
            legal.id = 'legal-info-settings';
            legal.className = 'text-xs text-gray-400 my-3 text-center';
            legal.innerHTML = `© 2025 Princz Attila | GuriGO — <a href="mailto:info@gurigo.eu" class="underline">info@gurigo.eu</a> | v${v}`;
            cont.appendChild(legal);
        } catch(e) { 
            console.warn('[Settings] Legal info injection failed', e); 
        }
    }
    
    // Run on load and whenever Settings tab is likely shown
    setTimeout(insertLegalIntoSettings, 0);
    
    document.addEventListener('click', (e) => {
        const t = e.target;
        if (!t) return;
        
        // Catch clicks that open the settings tab
        if ((t.closest && t.closest('[onclick*="showTab(\'settings\')"]')) || (t.dataset && t.dataset.tab === 'settings')) {
            setTimeout(insertLegalIntoSettings, 0);
        }
    });
    
    if (typeof window !== 'undefined') {
        window.addEventListener('pageshow', () => setTimeout(insertLegalIntoSettings, 0));
    }
})();

// Globális függvények exportálása
if (typeof window !== 'undefined') {
    window.uploadLocalSettings = uploadLocalSettings;
    window.refreshToggleVisuals = refreshToggleVisuals;
    window.saveSettings = saveSettings;
    window.loadSettings = loadSettings;
    window.exportData = exportData;
    window.importData = importData;
    window.initializeFeatureToggles = initializeFeatureToggles;
    window.updateEnhancedToggleVisuals = updateEnhancedToggleVisuals;
    window.applyFeatureToggles = applyFeatureToggles;
    window.checkForAutoExport = checkForAutoExport;
    window.initializePalletSettings = initializePalletSettings;
    window.updateMultiPalletSettingsVisibility = updateMultiPalletSettingsVisibility;
    window.getPalletTypes = getPalletTypes;
    window.savePalletTypes = savePalletTypes;
    window.renderPalletTypesList = renderPalletTypesList;
    window.addPalletType = addPalletType;
    window.deletePalletType = deletePalletType;
}