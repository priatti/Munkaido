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
    // ... (ez a függvény változatlan)
}

function importData(event) {
    // ... (ez a függvény változatlan)
}

const featureToggles = ['toggleKm', 'toggleDriveTime', 'togglePallets', 'toggleCompensation'];

export function applyFeatureToggles() {
    // ... (ez a függvény változatlan)
}

export function initializeSettings() {
    loadSettings();
    setTheme(localStorage.getItem('theme') || 'auto');
    
    document.getElementById('login-button').addEventListener('click', loginWithGoogle);
    document.getElementById('logout-button').addEventListener('click', logout);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('themeSelector').addEventListener('change', (e) => setTheme(e.target.value));
    document.getElementById('exportDataBtn').addEventListener('click', exportData);
    document.getElementById('importFile').addEventListener('change', importData);

    // EZ A LÉNYEGES RÉSZ
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
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
            });
        }
    });
    applyFeatureToggles();
}
