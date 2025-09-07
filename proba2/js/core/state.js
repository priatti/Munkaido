// Application State Manager v9.00
class StateManager {
    constructor() {
        this.state = {
            // Core data
            records: [],
            palletRecords: [],
            
            // UI state
            currentTab: 'live',
            editingId: null,
            inProgressEntry: null,
            
            // User data
            currentUser: null,
            
            // Settings
            featureToggles: {
                km: false,
                driveTime: false,
                pallets: false,
                compensation: false
            },
            theme: 'auto',
            autoExportFrequency: 'never',
            userName: '',
            
            // Statistics
            statsView: 'daily',
            statsDate: new Date(),
            
            // Cache
            uniqueLocations: [],
            uniquePalletLocations: [],
            
            // Charts
            charts: {
                workTime: null,
                driveTime: null,
                nightTime: null,
                km: null
            }
        };
        
        this.listeners = {};
        this.loadPersistedState();
    }

    // State management methods
    setState(path, value) {
        const keys = path.split('.');
        let current = this.state;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        const oldValue = current[keys[keys.length - 1]];
        current[keys[keys.length - 1]] = value;
        
        // Trigger listeners
        this.notifyListeners(path, value, oldValue);
        
        // Auto-persist certain state changes
        this.autoPersist(path, value);
    }

    getState(path) {
        const keys = path.split('.');
        let current = this.state;
        
        for (const key of keys) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = current[key];
        }
        
        return current;
    }

    // Event system
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    notifyListeners(path, newValue, oldValue) {
        const event = `change:${path}`;
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                callback(newValue, oldValue);
            });
        }
        
        // Also trigger generic change event
        if (this.listeners['change']) {
            this.listeners['change'].forEach(callback => {
                callback(path, newValue, oldValue);
            });
        }
    }

    // Persistence
    loadPersistedState() {
        try {
            // Load feature toggles
            const toggles = ['toggleKm', 'toggleDriveTime', 'togglePallets', 'toggleCompensation'];
            toggles.forEach(toggleId => {
                const key = toggleId.replace('toggle', '').toLowerCase();
                this.state.featureToggles[key] = localStorage.getItem(toggleId) === 'true';
            });

            // Load other settings
            this.state.theme = localStorage.getItem('theme') || 'auto';
            this.state.autoExportFrequency = localStorage.getItem('autoExportFrequency') || 'never';
            this.state.userName = localStorage.getItem('userName') || '';
            
            // Load in-progress entry
            this.state.inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
            
        } catch (error) {
            console.error('Error loading persisted state:', error);
        }
    }

    autoPersist(path, value) {
        // Auto-persist certain state changes
        const persistMap = {
            'featureToggles.km': 'toggleKm',
            'featureToggles.driveTime': 'toggleDriveTime',
            'featureToggles.pallets': 'togglePallets',
            'featureToggles.compensation': 'toggleCompensation',
            'theme': 'theme',
            'autoExportFrequency': 'autoExportFrequency',
            'userName': 'userName',
            'inProgressEntry': 'inProgressEntry'
        };

        if (persistMap[path]) {
            const storageKey = persistMap[path];
            if (typeof value === 'object') {
                localStorage.setItem(storageKey, JSON.stringify(value));
            } else {
                localStorage.setItem(storageKey, value);
            }
        }
    }

    // Helper methods for common operations
    updateRecords(records) {
        this.setState('records', records);
        this.updateUniqueLocations();
    }

    updatePalletRecords(palletRecords) {
        this.setState('palletRecords', palletRecords);
        this.updateUniquePalletLocations();
    }

    updateUniqueLocations() {
        const records = this.getState('records') || [];
        const locations = new Set();
        
        records.forEach(record => {
            if (record.startLocation) locations.add(record.startLocation);
            if (record.endLocation) locations.add(record.endLocation);
        });
        
        this.setState('uniqueLocations', Array.from(locations).sort());
    }

    updateUniquePalletLocations() {
        const palletRecords = this.getState('palletRecords') || [];
        const locations = new Set(palletRecords.map(r => r.location).filter(Boolean));
        this.setState('uniquePalletLocations', Array.from(locations).sort());
    }

    // Feature toggle helpers
    isFeatureEnabled(feature) {
        return this.getState(`featureToggles.${feature}`) || false;
    }

    toggleFeature(feature, enabled) {
        this.setState(`featureToggles.${feature}`, enabled);
    }

    // User session helpers
    setCurrentUser(user) {
        this.setState('currentUser', user);
    }

    getCurrentUser() {
        return this.getState('currentUser');
    }

    isLoggedIn() {
        return !!this.getCurrentUser();
    }

    // Statistics helpers
    setStatsView(view) {
        this.setState('statsView', view);
    }

    setStatsDate(date) {
        this.setState('statsDate', date);
    }

    // UI helpers
    setCurrentTab(tab) {
        this.setState('currentTab', tab);
    }

    getCurrentTab() {
        return this.getState('currentTab');
    }

    setEditingId(id) {
        this.setState('editingId', id);
    }

    getEditingId() {
        return this.getState('editingId');
    }

    // Charts helpers
    setChart(type, chart) {
        this.setState(`charts.${type}`, chart);
    }

    getChart(type) {
        return this.getState(`charts.${type}`);
    }

    destroyChart(type) {
        const chart = this.getChart(type);
        if (chart) {
            chart.destroy();
            this.setChart(type, null);
        }
    }

    destroyAllCharts() {
        ['workTime', 'driveTime', 'nightTime', 'km'].forEach(type => {
            this.destroyChart(type);
        });
    }
}

// Global state instance
window.appState = new StateManager();
