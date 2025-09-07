// Main Application v9.00
class MunkaidoApp {
    constructor() {
        this.version = '9.00';
        this.isInitialized = false;
        this.init();
    }

    async init() {
        console.log(`MunkaidÅ' Pro v${this.version} initializing...`);
        
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Initialize core systems first
            await this.initializeCore();
            
            // Initialize modules
            await this.initializeModules();
            
            // Setup global event listeners
            this.setupGlobalEvents();
            
            // Wait for storage to be ready
            await this.waitForStorage();
            
            // Run any necessary migrations
            await this.runMigrations();
            
            // Final setup
            await this.finalizeInitialization();
            
            this.isInitialized = true;
            console.log(`MunkaidÅ' Pro v${this.version} initialized successfully!`);
            
        } catch (error) {
            console.error('Error initializing application:', error);
            this.handleInitializationError(error);
        }
    }

    async initializeCore() {
        // Core systems are already initialized via their global instances
        // i18n, appState, storageManager, authManager, uiManager are ready
        
        // Initialize autocomplete systems
        this.setupAutocomplete();
        
        // Initialize theme
        this.initTheme();
    }

    async initializeModules() {
        // Modules initialize themselves via their global instances
        // All module event listeners are set up automatically
        
        // Render weekly allowance on the live tab
        if (window.tachographModule) {
            window.tachographModule.renderWeeklyAllowance();
        }
    }

    setupGlobalEvents() {
        // Global click handlers for tab switching and dropdowns are handled by UIManager
        
        // Setup input formatters for time fields
        this.setupTimeInputFormatters();
        
        // Setup form submission handlers
        this.setupFormHandlers();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    setupTimeInputFormatters() {
        // Time input formatting is handled in the full-day-entry module
        // but we can add global handlers here if needed
        
        document.addEventListener('input', (e) => {
            if (e.target.type === 'time' || e.target.classList.contains('time-input')) {
                // Auto-format time inputs on blur
                e.target.addEventListener('blur', function() {
                    const allowOver24 = this.dataset.allowOver24 === 'true';
                    timeUtils.formatTimeInput(this, allowOver24);
                }, { once: true });
            }
        });
    }

    setupFormHandlers() {
        // Prevent form submission on Enter key in input fields
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                // Allow Enter in specific cases
                const allowEnter = e.target.type === 'submit' || 
                                 e.target.classList.contains('allow-enter');
                
                if (!allowEnter) {
                    e.preventDefault();
                }
            }
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl/Cmd + number keys for tab switching
            if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
                e.preventDefault();
                const tabs = ['live', 'full-day', 'list', 'pallets'];
                const tabIndex = parseInt(e.key) - 1;
                if (tabs[tabIndex]) {
                    window.uiManager.showTab(tabs[tabIndex]);
                }
            }

            // Escape key to close modals/dropdowns
            if (e.key === 'Escape') {
                window.uiManager.closeDropdown();
                window.uiManager.hideAutocomplete();
                window.uiManager.hideAlert(false);
            }
        });
    }

    async waitForStorage() {
        // Wait for storage manager to initialize
        if (!window.storageManager.isInitialized) {
            await new Promise(resolve => {
                window.addEventListener('storageInitialized', resolve, { once: true });
            });
        }
    }

    async runMigrations() {
        // Run night work recalculation if needed
        if (window.settingsModule) {
            await window.settingsModule.runNightWorkRecalculation();
        }
    }

    async finalizeInitialization() {
        // Setup auto-export check
        if (window.storageManager) {
            window.storageManager.checkForAutoExport();
        }

        // Initialize autocomplete with loaded data
        this.initializeAutocompleteData();
        
        // Show default tab
        window.uiManager.showTab('live');
        
        // Update all UI texts
        window.i18n.updateAllTexts();
        
        // Apply feature toggles
        window.uiManager.applyFeatureToggles();
    }

    setupAutocomplete() {
        // Autocomplete is initialized when data is loaded
        window.addEventListener('storageInitialized', () => {
            this.initializeAutocompleteData();
        });
    }

    initializeAutocompleteData() {
        const uniqueLocations = window.appState.getState('uniqueLocations') || [];
        const uniquePalletLocations = window.appState.getState('uniquePalletLocations') || [];

        // Initialize autocomplete for location fields
        const locationFields = [
            'liveStartLocation',
            'startLocation', 
            'endLocation',
            'palletLocation'
        ];

        locationFields.forEach(fieldId => {
            const element = domUtils.getElement(fieldId);
            if (element) {
                const dataArray = fieldId === 'palletLocation' ? uniquePalletLocations : uniqueLocations;
                window.uiManager.initAutocomplete(element, dataArray);
            }
        });
    }

    initTheme() {
        // Theme initialization is handled by UIManager
        // but we ensure it's applied on app start
        const savedTheme = localStorage.getItem('theme') || 'auto';
        window.uiManager.applyTheme(savedTheme);
    }

    handleInitializationError(error) {
        console.error('Critical initialization error:', error);
        
        // Show a basic error message
        const errorContainer = document.createElement('div');
        errorContainer.className = 'fixed inset-0 bg-red-100 flex items-center justify-center z-50';
        errorContainer.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-lg max-w-md mx-4">
                <h2 class="text-xl font-bold text-red-600 mb-4">Initialization Error</h2>
                <p class="text-gray-700 mb-4">
                    The application failed to initialize properly. Please refresh the page and try again.
                </p>
                <p class="text-sm text-gray-500 mb-4">
                    Error: ${error.message}
                </p>
                <button onclick="window.location.reload()" 
                        class="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600">
                    Refresh Page
                </button>
            </div>
        `;
        
        document.body.appendChild(errorContainer);
    }

    // Public API methods
    getVersion() {
        return this.version;
    }

    isReady() {
        return this.isInitialized;
    }

    // Debug helpers
    getDebugInfo() {
        return {
            version: this.version,
            initialized: this.isInitialized,
            currentUser: window.appState.getCurrentUser()?.email || 'Not logged in',
            currentTab: window.appState.getCurrentTab(),
            recordCount: (window.appState.getState('records') || []).length,
            palletRecordCount: (window.appState.getState('palletRecords') || []).length,
            language: window.i18n.getCurrentLanguage(),
            theme: window.appState.getState('theme'),
            featureToggles: window.appState.getState('featureToggles')
        };
    }

    // Global error handler
    setupGlobalErrorHandler() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            
            // Don't show alerts for script loading errors
            if (event.error && event.error.message && 
                !event.error.message.includes('Script error')) {
                
                window.uiManager?.showAlert(
                    `Unexpected error: ${event.error.message}`, 
                    'info'
                );
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            
            window.uiManager?.showAlert(
                'An unexpected error occurred. Please try again.', 
                'info'
            );
        });
    }
}

// Global utility functions that need to be available for HTML onclick handlers
window.fetchCountryCodeFor = (inputId) => geoUtils.fetchCountryCodeFor(inputId);
window.fetchLocation = () => geoUtils.fetchLocation();
window.setLanguage = (lang) => window.i18n.setLanguage(lang);

// Initialize the application
window.munkaidoApp = new MunkaidoApp();

// Setup global error handling
window.munkaidoApp.setupGlobalErrorHandler();

// Expose debug info to console
console.log('MunkaidÅ' Pro Debug Info:', window.munkaidoApp.getDebugInfo());
