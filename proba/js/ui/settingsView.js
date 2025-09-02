import { state } from '../state.js';
import { loginWithGoogle, logout } from '../services/auth.js';
import { setLanguage } from '../services/i18n.js';
import { updateToggleVisuals, showAlert } from '../utils/domHelpers.js';
import { migrateLocalToFirestore, saveRecord, savePalletRecord } from '../services/database.js';
import { showTab } from './navigation.js';

function saveSettings() {
    localStorage.setItem('userName', document.getElementById('userNameInput').value);
    showAlert(window.translations[state.currentLang].settingsSaved, 'success');
}

function loadSettings() {
    document.getElementById('userNameInput').value = localStorage.getItem('userName') || '';
    document.getElementById('themeSelector').value = localStorage.getItem('theme') || 'auto';
    document.getElementById('autoExportSelector').value = localStorage.getItem('autoExportFrequency') || 'never';
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
}

function setTheme(theme) {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
}

function exportData() {
    const i18n = window.translations[state.currentLang];
    const dataToExport = {
        workRecords: state.records,
        palletRecords: state.palletRecords
    };

    if (dataToExport.workRecords.length === 0 && dataToExport.palletRecords.length === 0) {
        showAlert(i18n.alertNoDataToExport, 'info');
        return;
    }
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `munkaido_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const i18n = window.translations[state.currentLang];
    const file = event.target.files[0];
    if (!file) {
        showAlert(i18n.alertChooseFile, 'info');
        return;
    }

    showAlert(i18n.alertConfirmImport, 'warning', () => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                // Kompatibilitás a régi és új mentésekkel
                state.records = Array.isArray(imported.workRecords) ? imported.workRecords : (Array.isArray(imported) ? imported : []);
                state.palletRecords = Array.isArray(imported.palletRecords) ? imported.palletRecords : [];

                if (state.currentUser) {
                    await migrateLocalToFirestore(state.records, 'records');
                    await migrateLocalToFirestore(state.palletRecords, 'pallets');
                } else {
                    localStorage.setItem('workRecords', JSON.stringify(state.records));
                    localStorage.setItem('palletRecords', JSON.stringify(state.palletRecords));
                }
                showAlert(i18n.alertImportSuccess, 'success', () => showTab('list'));
            } catch (err) {
                showAlert(`${i18n.alertImportInvalid}: ${err.message}`, 'info');
            }
        };
        reader.readAsText(file);
    });
}

const featureToggles = ['toggleKm', 'toggleDriveTime', 'togglePallets', 'toggleCompensation'];

export function applyFeatureToggles() {
    const showKm = localStorage.getItem('toggleKm') === 'true';
    const showDriveTime = localStorage.getItem('toggleDriveTime') === 'true';
    const showPallets = localStorage.getItem('togglePallets') === 'true';
    const showCompensation = localStorage.getItem('toggleCompensation') === 'true';

    document.getElementById('km-section').style.display = showKm ? 'block' : 'none';
    document.getElementById('drivetime-section').style.display = showDriveTime ? 'block' : 'none';
    document.getElementById('compensation-section-de').style.display = showCompensation ? 'block' : 'none';
    document.getElementById('tab-pallets').style.display = showPallets ? 'flex' : 'none';

    if (!showPallets && document.getElementById('tab-pallets').classList.contains('tab-active')) {
        showTab('live');
    }
}

export function initializeSettings() {
    // Beállítások betöltése
    loadSettings();
    setTheme(localStorage.getItem('theme') || 'auto');
    
    // Eseménykezelők
    document.getElementById('login-button').addEventListener('click', loginWithGoogle);
    document.getElementById('logout-button').addEventListener('click', logout);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('themeSelector').addEventListener('change', (e) => setTheme(e.target.value));
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importFile').addEventListener('change', importData);

    // Nyelvválasztó gombok
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
    });

    // Speciális funkciók kapcsolói
    featureToggles.forEach(toggleId => {
        const checkbox = document.getElementById(toggleId);
        if (checkbox) {
            checkbox.checked = localStorage.getItem(toggleId) === 'true';
            updateToggleVisuals(checkbox);
            checkbox.addEventListener('change', (e) => {
                localStorage.setItem(toggleId, e.target.checked);
                updateToggleVisuals(e.target);
                applyFeatureToggles();
            });
        }
    });
    applyFeatureToggles(); // Alkalmazás indításkori állapot beállítása
}