// UI Manager Module v9.00
class UIManager {
    constructor() {
        this.alertCallback = null;
        this.init();
    }

    init() {
        this.setupGlobalEventListeners();
        this.setupThemeSystem();
        this.setupFeatureToggles();
    }

    setupGlobalEventListeners() {
        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            const dropdownContainer = domUtils.getElement('dropdown-container');
            if (dropdownContainer && !dropdownContainer.contains(event.target)) {
                this.closeDropdown();
            }
            
            // Close autocomplete when clicking outside
            if (!event.target.closest('.autocomplete-list')) {
                this.hideAutocomplete();
            }
        });

        // Setup 1:1 button for pallets
        const pallet1to1Btn = domUtils.getElement('pallet-1to1-btn');
        if (pallet1to1Btn) {
            pallet1to1Btn.addEventListener('click', this.handlePallet1to1);
        }

        // Setup auto export selector
        const autoExportSelector = domUtils.getElement('autoExportSelector');
        if (autoExportSelector) {
            autoExportSelector.addEventListener('change', this.handleAutoExportChange);
        }
    }

    setupThemeSystem() {
        // Apply initial theme
        const savedTheme = localStorage.getItem('theme') || 'auto';
        this.applyTheme(savedTheme);

        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
                if (localStorage.getItem('theme') === 'auto') {
                    this.applyTheme('auto');
                }
            });
        }
    }

    setupFeatureToggles() {
        const featureToggles = ['toggleKm', 'toggleDriveTime', 'togglePallets', 'toggleCompensation'];
        
        featureToggles.forEach(toggleId => {
            const checkbox = domUtils.getElement(toggleId);
            if (checkbox) {
                const feature = toggleId.replace('toggle', '').toLowerCase();
                const savedState = window.appState.isFeatureEnabled(feature);
                
                checkbox.checked = savedState;
                this.updateToggleVisuals(checkbox);
                
                checkbox.addEventListener('change', (e) => {
                    window.appState.toggleFeature(feature, e.target.checked);
                    this.applyFeatureToggles();
                    this.updateToggleVisuals(e.target);
                });
            }
        });

        // Setup split rest toggle
        const splitRestToggle = domUtils.getElement('toggleSplitRest');
        if (splitRestToggle) {
            splitRestToggle.addEventListener('change', () => {
                this.updateToggleVisuals(splitRestToggle);
            });
        }

        this.applyFeatureToggles();
    }

    // Theme management
    applyTheme(theme) {
        const html = document.documentElement;
        
        if (theme === 'dark') {
            html.classList.add('dark');
        } else if (theme === 'light') {
            html.classList.remove('dark');
        } else { // auto
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            html.classList.toggle('dark', prefersDark);
        }
    }

    setTheme(theme) {
        this.applyTheme(theme);
        localStorage.setItem('theme', theme);
        window.appState.setState('theme', theme);
    }

    // Feature toggles
    updateToggleVisuals(checkbox) {
        const label = checkbox.closest('label');
        if (!label) return;

        const checkmark = label.querySelector('.toggle-checkmark');
        const onClasses = ['bg-green-100', 'dark:bg-green-800/50', 'font-semibold'];
        const offClasses = ['hover:bg-gray-200', 'dark:hover:bg-gray-700'];

        label.classList.remove(...onClasses, ...offClasses);

        if (checkbox.checked) {
            label.classList.add(...onClasses);
            if (checkmark) checkmark.classList.remove('hidden');
        } else {
            label.classList.add(...offClasses);
            if (checkmark) checkmark.classList.add('hidden');
        }
    }

    applyFeatureToggles() {
        const showKm = window.appState.isFeatureEnabled('km');
        const showDriveTime = window.appState.isFeatureEnabled('drivetime');
        const showPallets = window.appState.isFeatureEnabled('pallets');
        const showCompensation = window.appState.isFeatureEnabled('compensation');

        domUtils.toggleElement('km-section', showKm);
        domUtils.toggleElement('drivetime-section', showDriveTime);
        
        const compensationSection = domUtils.getElement('compensation-section-de');
        if (compensationSection) {
            compensationSection.style.display = showCompensation ? 'block' : 'none';
        }
        
        const palletTab = domUtils.getElement('tab-pallets');
        if (palletTab) {
            if (showPallets) {
                palletTab.classList.remove('hidden');
                palletTab.style.display = 'flex';
            } else {
                palletTab.classList.add('hidden');
                palletTab.style.display = 'none';
            }
        }

        // Clear compensation if disabled
        if (!showCompensation) {
            domUtils.setElementValue('compensationTime', '');
        }

        // Switch tab if pallets tab is active but disabled
        if (!showPallets && window.appState.getCurrentTab() === 'pallets') {
            this.showTab('live');
        }
    }

    // Tab management
    showTab(tabName) {
        // Update pallet form when switching to pallets
        if (tabName === 'pallets') {
            domUtils.setElementValue('palletDate', new Date().toISOString().split('T')[0]);
            domUtils.setElementValue('palletLicensePlate', localStorage.getItem('lastPalletLicensePlate') || '');
            domUtils.setElementValue('palletType', localStorage.getItem('lastPalletType') || '');
        }

        // Update tab styling
        const allTabs = document.querySelectorAll('.tab');
        const mainTabs = ['live', 'full-day', 'list', 'pallets'];
        const dropdownButton = domUtils.getElement('dropdown-button');
        const dropdownMenu = domUtils.getElement('dropdown-menu');

        allTabs.forEach(t => t.classList.remove('tab-active'));
        dropdownButton.classList.remove('tab-active');

        if (mainTabs.includes(tabName)) {
            const tabElement = domUtils.getElement(`tab-${tabName}`);
            if (tabElement) tabElement.classList.add('tab-active');
            dropdownButton.innerHTML = `<span data-translate-key="menuMore">${window.i18n.translate('menuMore')}</span> ▼`;
        } else {
            dropdownButton.classList.add('tab-active');
            const selectedTitleEl = dropdownMenu?.querySelector(`button[onclick="showTab('${tabName}')"] .dropdown-item-title`);
            if (selectedTitleEl) {
                const selectedTitle = selectedTitleEl.textContent;
                dropdownButton.innerHTML = `${selectedTitle} ▼`;
            }
        }

        // Show/hide content
        document.querySelectorAll('[id^="content-"]').forEach(c => c.classList.add('hidden'));
        const targetContent = domUtils.getElement(`content-${tabName}`);
        if (targetContent) targetContent.classList.remove('hidden');

        this.closeDropdown();
        window.appState.setCurrentTab(tabName);

        // Trigger tab-specific actions
        this.handleTabSwitch(tabName);
    }

    handleTabSwitch(tabName) {
        switch (tabName) {
            case 'list':
                window.recordsModule?.renderRecords();
                break;
            case 'summary':
                window.summaryModule?.renderSummary();
                break;
            case 'stats':
                window.appState.setStatsDate(new Date());
                window.statisticsModule?.renderStats();
                break;
            case 'report':
                window.reportsModule?.initMonthlyReport();
                break;
            case 'tachograph':
                window.tachographModule?.renderTachographAnalysis();
                break;
            case 'pallets':
                window.palletsModule?.renderPalletRecords();
                break;
        }

        // Update translations after tab switch
        window.i18n.updateAllTexts();
    }

    // Dropdown management
    toggleDropdown() {
        const dropdownMenu = domUtils.getElement('dropdown-menu');
        if (dropdownMenu) {
            dropdownMenu.classList.toggle('hidden');
        }
    }

    closeDropdown() {
        const dropdownMenu = domUtils.getElement('dropdown-menu');
        if (dropdownMenu) {
            dropdownMenu.classList.add('hidden');
        }
    }

    // Alert system
    showAlert(message, type = 'info', callback = null) {
        const overlay = domUtils.getElement('custom-alert-overlay');
        const box = domUtils.getElement('custom-alert-box');
        const iconContainer = domUtils.getElement('custom-alert-icon');
        const messageEl = domUtils.getElement('custom-alert-message');
        const buttonsContainer = domUtils.getElement('custom-alert-buttons');

        if (!overlay || !box || !iconContainer || !messageEl || !buttonsContainer) return;

        this.alertCallback = callback;
        messageEl.textContent = message;

        // Reset styling
        iconContainer.className = 'w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center';
        buttonsContainer.innerHTML = '';

        const warningIcon = `<svg class="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;

        switch (type) {
            case 'warning':
                iconContainer.classList.add('bg-yellow-100');
                iconContainer.innerHTML = warningIcon;
                buttonsContainer.innerHTML = `
                    <button onclick="window.uiManager.hideAlert(false)" class="py-2 px-6 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">${window.i18n.translate('cancel')}</button>
                    <button onclick="window.uiManager.hideAlert(true)" class="py-2 px-6 bg-yellow-400 text-white rounded-lg font-semibold hover:bg-yellow-500">${window.i18n.translate('save')}</button>
                `;
                break;
                
            case 'info':
                iconContainer.classList.add('bg-yellow-100');
                iconContainer.innerHTML = warningIcon;
                buttonsContainer.innerHTML = `
                    <button onclick="window.uiManager.hideAlert(true)" class="py-2 w-2/3 bg-yellow-400 text-white rounded-lg font-semibold hover:bg-yellow-500">${window.i18n.translate('ok')}</button>
                `;
                break;
                
            case 'success':
                iconContainer.classList.add('bg-green-100', 'success-icon');
                iconContainer.innerHTML = `<svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path class="checkmark-path" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
                buttonsContainer.innerHTML = `
                    <button onclick="window.uiManager.hideAlert(true)" class="py-2 w-2/3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600">${window.i18n.translate('ok')}</button>
                `;
                break;
        }

        // Show alert with animation
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        setTimeout(() => {
            overlay.classList.remove('opacity-0');
            box.classList.remove('scale-95');
        }, 10);
    }

    hideAlert(isConfirmed) {
        const overlay = domUtils.getElement('custom-alert-overlay');
        const box = domUtils.getElement('custom-alert-box');

        if (!overlay || !box) return;

        overlay.classList.add('opacity-0');
        box.classList.add('scale-95');

        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            
            if (isConfirmed && this.alertCallback) {
                this.alertCallback();
            }
            this.alertCallback = null;
        }, 300);
    }

    // Autocomplete system
    initAutocomplete(inputElement, dataArray) {
        if (!inputElement || !dataArray) return;

        inputElement.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            this.hideAutocomplete();
            
            if (!value) return;

            const suggestions = document.createElement('div');
            suggestions.id = 'autocomplete-list';
            suggestions.className = 'autocomplete-list absolute z-20 w-full border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto bg-white';
            suggestions.style.top = (inputElement.offsetHeight + 12) + 'px';

            const filteredData = dataArray.filter(item => 
                item.toLowerCase().includes(value.toLowerCase())
            );

            filteredData.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.innerHTML = item.replace(new RegExp(value, 'gi'), '<strong>        // Switch tab if pallets tab</strong>');
                itemEl.className = 'p-2 hover:bg-gray-100 cursor-pointer autocomplete-item';
                
                itemEl.addEventListener('click', () => {
                    inputElement.value = item;
                    this.hideAutocomplete();
                });
                
                suggestions.appendChild(itemEl);
            });

            if (filteredData.length > 0) {
                inputElement.parentNode.appendChild(suggestions);
            }
        });
    }

    hideAutocomplete() {
        document.querySelectorAll('#autocomplete-list').forEach(list => list.remove());
    }

    // Event handlers
    handlePallet1to1() {
        const givenInput = domUtils.getElement('palletGiven');
        const takenInput = domUtils.getElement('palletTaken');
        
        if (!givenInput || !takenInput) return;

        if (givenInput.value) {
            takenInput.value = givenInput.value;
        } else if (takenInput.value) {
            givenInput.value = takenInput.value;
        }
    }

    handleAutoExportChange(e) {
        const frequency = e.target.value;
        window.appState.setState('autoExportFrequency', frequency);
        
        if (frequency !== 'never') {
            localStorage.setItem('lastAutoExportDate', new Date().toISOString());
            this.showAlert(window.i18n.translate('autoBackupOn'), 'success');
        } else {
            this.showAlert(window.i18n.translate('autoBackupOff'), 'info');
        }
    }
}

// Global UI manager instance
window.uiManager = new UIManager();

// Global functions for HTML onclick handlers
window.showTab = (tabName) => window.uiManager.showTab(tabName);
window.toggleDropdown = () => window.uiManager.toggleDropdown();
window.setTheme = (theme) => window.uiManager.setTheme(theme);
