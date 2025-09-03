// js/ui/settingsView.js - CSAK a nyelvi rész javítása
import { state } from '../state.js';
import { loginWithGoogle, logout } from '../services/auth.js';
import { setLanguage } from '../services/i18n.js';
import { updateToggleVisuals, showAlert } from '../utils/domHelpers.js';
import { migrateLocalToFirestore } from '../services/database.js';
import { showTab } from './navigation.js';

function saveSettings() {
    if (!window.translations) return;
    localStorage.setItem('userName', document.getElementById('userNameInput').value);
    showAlert(window.translations.settingsSaved, 'success');
}

function loadSettings() {
    document.getElementById('userNameInput').value = localStorage.getItem('userName') || '';
    document.getElementById('themeSelector').value = localStorage.getItem('theme') || 'auto';
    document.getElementById('autoExportSelector').value = localStorage.getItem('autoExportFrequency') || 'never';
}

function applyTheme(theme) {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else if (theme === 'light') document.documentElement.classList.remove('dark');
    else {
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
    const i18n = window.translations;
    const dataToExport = {
        workRecords: state.records,
        palletRecords: state.palletRecords,
        exportDate: new Date().toISOString(),
        version: '9.01'
    };

    if (dataToExport.workRecords.length === 0 && dataToExport.palletRecords.length === 0) {
        showAlert(i18n.alertNoDataToExport, 'info');
        return;
    }

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `munkaidopro_backup_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importData(event) {
    const i18n = window.translations;
    const file = event.target.files[0];
    
    if (!file) {
        showAlert(i18n.alertChooseFile, 'info');
        return;
    }

    showAlert(i18n.alertConfirmImport, 'warning', () => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (importedData.workRecords) {
                    state.records.length = 0;
                    state.records.push(...importedData.workRecords);
                    localStorage.setItem('workRecords', JSON.stringify(state.records));
                }
                
                if (importedData.palletRecords) {
                    state.palletRecords.length = 0;
                    state.palletRecords.push(...importedData.palletRecords);
                    localStorage.setItem('palletRecords', JSON.stringify(state.palletRecords));
                }

                showAlert(i18n.alertImportSuccess, 'success');
                showTab('list');
            } catch (error) {
                showAlert(i18n.alertImportInvalid, 'info');
            }
        };
        reader.readAsText(file);
    });
    
    event.target.value = '';
}

const featureToggles = ['toggleKm', 'toggleDriveTime', 'togglePallets', 'toggleCompensation'];

export function applyFeatureToggles() {
    const isKmEnabled = localStorage.getItem('toggleKm') === 'true';
    const isDriveTimeEnabled = localStorage.getItem('toggleDriveTime') === 'true';
    const isPalletsEnabled = localStorage.getItem('togglePallets') === 'true';
    const isCompensationEnabled = localStorage.getItem('toggleCompensation') === 'true';

    // Km nyilvántartás
    const kmSection = document.getElementById('km-section');
    if (kmSection) kmSection.style.display = isKmEnabled ? 'block' : 'none';

    // Vezetési idő
    const driveSection = document.getElementById('drivetime-section');
    if (driveSection) driveSection.style.display = isDriveTimeEnabled ? 'block' : 'none';

    // Raklapok fül
    const palletTab = document.getElementById('tab-pallets');
    if (palletTab) palletTab.classList.toggle('hidden', !isPalletsEnabled);

    // Kompenzáció/szünet
    const compensationSection = document.getElementById('compensation-section-de');
    if (compensationSection) compensationSection.style.display = isCompensationEnabled ? 'block' : 'none';
}

export function initializeSettings() {
    loadSettings();
    setTheme(localStorage.getItem('theme') || 'auto');
    
    document.getElementById('login-button').addEventListener('click', loginWithGoogle);
    document.getElementById('logout-button').addEventListener('click', logout);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('themeSelector').addEventListener('change', (e) => setTheme(e.target.value));
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', importData);

    // KRITIKUS JAVÍTÁS: Nyelvi gombok eseménykezelője
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('Nyelv gomb kattintás:', btn.dataset.lang);
            
            // Vizuális feedback azonnal
            document.querySelectorAll('.lang-btn').forEach(b => {
                b.classList.remove('bg-blue-100', 'dark:bg-blue-800', 'border-blue-500', 'font-bold');
            });
            btn.classList.add('bg-blue-100', 'dark:bg-blue-800', 'border-blue-500', 'font-bold');
            
            // Nyelv váltás
            localStorage.setItem('language', btn.dataset.lang);
window.location.reload(); // Teljes oldal újratöltés
            
            // EXTRA: Kényszerített frissítés
            setTimeout(() => {
                location.reload();
            }, 500);
        });
    });

    featureToggles.forEach(toggleId => {
        const checkbox = document.getElementById(toggleId);
        if (checkbox) {
            checkbox.checked = localStorage.getItem(toggleId) === 'true';
            updateToggleVisuals(checkbox);
            checkbox.addEventListener('change', (e) => {
                localStorage.setItem(toggleId, e.target.checked);
                updateToggleVisuals(e.target);
                applyFeatureToggles();
                
                if (toggleId === 'toggleCompensation') {
                    showAlert(e.target.checked ? 
                        (window.translations?.autoBackupOn || 'Automatikus mentés bekapcsolva!') : 
                        (window.translations?.autoBackupOff || 'Automatikus mentés kikapcsolva.'), 
                        'info');
                }
            });
        }
    });
    applyFeatureToggles();
}
