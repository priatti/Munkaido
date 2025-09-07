// Settings Module v9.00
class SettingsManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSettings();
    }

    setupEventListeners() {
        // Language buttons
        const languageSelector = domUtils.getElement('languageSelector');
        if (languageSelector) {
            const buttons = languageSelector.querySelectorAll('button');
            buttons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const lang = btn.innerText.includes('Magyar') ? 'hu' : 'de';
                    window.i18n.setLanguage(lang);
                });
            });
        }

        // Theme selector
        const themeSelector = domUtils.getElement('themeSelector');
        if (themeSelector) {
            themeSelector.addEventListener('change', (e) => {
                window.uiManager.setTheme(e.target.value);
            });
        }

        // Auto export selector is handled in UI manager

        // Import file input
        const importFile = domUtils.getElement('importFile');
        if (importFile) {
            importFile.addEventListener('change', () => {
                if (importFile.files.length > 0) {
                    this.importData();
                }
            });
        }

        // Listen for language changes to update buttons
        window.addEventListener('languageChanged', () => {
            this.updateLanguageButtonStyles();
        });
    }

    loadSettings() {
        // Load user name
        const userName = localStorage.getItem('userName') || '';
        domUtils.setElementValue('userNameInput', userName);
        window.appState.setState('userName', userName);

        // Load theme
        const theme = localStorage.getItem('theme') || 'auto';
        domUtils.setElementValue('themeSelector', theme);
        window.appState.setState('theme', theme);

        // Load auto export frequency
        const autoExportFreq = localStorage.getItem('autoExportFrequency') || 'never';
        domUtils.setElementValue('autoExportSelector', autoExportFreq);
        window.appState.setState('autoExportFrequency', autoExportFreq);

        this.updateLanguageButtonStyles();
    }

    updateLanguageButtonStyles() {
        const selector = domUtils.getElement('languageSelector');
        if (!selector) return;

        const buttons = selector.querySelectorAll('button');
        const currentLang = window.i18n.getCurrentLanguage();
        
        buttons.forEach(btn => {
            btn.classList.remove('bg-blue-100', 'border-blue-500', 'font-bold');
            
            const isHungarian = currentLang === 'hu' && btn.innerText.includes('Magyar');
            const isGerman = currentLang === 'de' && btn.innerText.includes('Deutsch');
            
            if (isHungarian || isGerman) {
                btn.classList.add('bg-blue-100', 'border-blue-500', 'font-bold');
            }
        });
    }

    saveSettings() {
        const userName = domUtils.getElementValue('userNameInput').trim();
        
        if (userName) {
            localStorage.setItem('userName', userName);
            window.appState.setState('userName', userName);
        }

        window.uiManager.showAlert(window.i18n.translate('settingsSaved'), 'success');
    }

    exportData() {
        const records = window.appState.getState('records') || [];
        
        if (records.length === 0) {
            window.uiManager.showAlert(window.i18n.translate('alertNoDataToExport'), 'info');
            return;
        }

        const dataStr = JSON.stringify(records, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `munkaido_backup_${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    importData() {
        const fileInput = domUtils.getElement('importFile');
        if (!fileInput || !fileInput.files.length) {
            window.uiManager.showAlert(window.i18n.translate('alertChooseFile'), 'info');
            return;
        }

        const confirmImport = () => {
            this.processImport(fileInput.files[0]);
        };

        window.uiManager.showAlert(
            window.i18n.translate('alertConfirmImport'), 
            'warning', 
            confirmImport
        );
    }

    async processImport(file) {
        try {
            const imported = await window.storageManager.importData(file);
            
            // Clear file input
            const fileInput = domUtils.getElement('importFile');
            if (fileInput) fileInput.value = '';
            
            // Refresh current view
            const currentTab = window.appState.getCurrentTab();
            if (currentTab === 'list') {
                window.recordsModule?.renderRecords();
            } else if (currentTab === 'summary') {
                window.summaryModule?.renderSummary();
            } else if (currentTab === 'stats') {
                window.statisticsModule?.renderStats();
            } else if (currentTab === 'tachograph') {
                window.tachographModule?.renderTachographAnalysis();
                window.tachographModule?.renderWeeklyAllowance();
            }
            
        } catch (error) {
            console.error('Import error:', error);
            // Error handling is done in storageManager.importData
        }
    }

    // Migration helper for night work recalculation
    async runNightWorkRecalculation() {
        if (localStorage.getItem('nightWorkRecalculated_v20_05')) {
            return;
        }

        console.log(window.i18n.translate('logRecalculatingNightWork'));
        
        let updatedCount = 0;
        const records = window.appState.getState('records') || [];
        
        const updatedRecords = records.map(record => {
            const newNightWorkMinutes = timeUtils.calculateNightWorkMinutes(record.startTime, record.endTime);
            if (record.nightWorkMinutes !== newNightWorkMinutes) {
                record.nightWorkMinutes = newNightWorkMinutes;
                updatedCount++;
            }
            return record;
        });

        if (updatedCount > 0) {
            window.appState.updateRecords(updatedRecords);

            // Save to storage
            if (window.appState.isLoggedIn()) {
                const user = window.appState.getCurrentUser();
                const batch = firebase.firestore().batch();
                
                updatedRecords.forEach(record => {
                    const docRef = firebase.firestore()
                        .collection('users')
                        .doc(user.uid)
                        .collection('records')
                        .doc(String(record.id));
                    batch.update(docRef, { nightWorkMinutes: record.nightWorkMinutes });
                });
                
                await batch.commit();
            } else {
                localStorage.setItem('workRecords', JSON.stringify(updatedRecords));
            }
        }

        localStorage.setItem('nightWorkRecalculated_v20_05', 'true');
        console.log(`${updatedCount} ${window.i18n.translate('logEntriesUpdated')}`);
    }
}

// Initialize settings module
window.settingsModule = new SettingsManager();

// Global functions for HTML onclick handlers
window.saveSettings = () => window.settingsModule.saveSettings();
window.exportData = () => window.settingsModule.exportData();
window.importData = () => window.settingsModule.importData();
