// Storage Manager v9.00
class StorageManager {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.isInitialized = false;
        this.init();
    }

    async init() {
        // Wait for auth state to be determined
        return new Promise((resolve) => {
            this.auth.onAuthStateChanged(async (user) => {
                window.appState.setCurrentUser(user);
                
                if (user) {
                    console.log("Logged in:", user.uid);
                    await this.loadUserData();
                } else {
                    console.log("Logged out.");
                    await this.loadLocalData();
                }
                
                this.isInitialized = true;
                window.dispatchEvent(new CustomEvent('storageInitialized'));
                resolve();
            });
        });
    }

    // Firebase operations
    async loadUserData() {
        try {
            const user = window.appState.getCurrentUser();
            if (!user) return;

            // Load work records
            const recordsSnapshot = await this.db
                .collection('users')
                .doc(user.uid)
                .collection('records')
                .get();
            
            const records = recordsSnapshot.docs.map(doc => doc.data());

            // Load pallet records
            const palletsSnapshot = await this.db
                .collection('users')
                .doc(user.uid)
                .collection('pallets')
                .get();
            
            const palletRecords = palletsSnapshot.docs.map(doc => doc.data());

            // Migrate local data if cloud is empty
            const localRecords = this.getLocalRecords();
            const localPalletRecords = this.getLocalPalletRecords();

            if (records.length === 0 && localRecords.length > 0) {
                await this.migrateLocalToFirestore(localRecords, 'records');
                window.appState.updateRecords(localRecords);
            } else {
                window.appState.updateRecords(records);
            }

            if (palletRecords.length === 0 && localPalletRecords.length > 0) {
                await this.migrateLocalToFirestore(localPalletRecords, 'pallets');
                window.appState.updatePalletRecords(localPalletRecords);
            } else {
                window.appState.updatePalletRecords(palletRecords);
            }

        } catch (error) {
            console.error('Error loading user data:', error);
            window.uiManager.showAlert(window.i18n.translate('alertDataLoadError'), 'info');
            // Fallback to local data
            await this.loadLocalData();
        }
    }

    async loadLocalData() {
        const records = this.getLocalRecords();
        const palletRecords = this.getLocalPalletRecords();
        
        window.appState.updateRecords(records);
        window.appState.updatePalletRecords(palletRecords);
    }

    getLocalRecords() {
        try {
            return JSON.parse(localStorage.getItem('workRecords') || '[]');
        } catch (error) {
            console.error('Error loading local records:', error);
            return [];
        }
    }

    getLocalPalletRecords() {
        try {
            return JSON.parse(localStorage.getItem('palletRecords') || '[]');
        } catch (error) {
            console.error('Error loading local pallet records:', error);
            return [];
        }
    }

    async migrateLocalToFirestore(data, collectionName) {
        const user = window.appState.getCurrentUser();
        if (!user) return;

        try {
            const batch = this.db.batch();
            
            data.forEach(record => {
                const docRef = this.db
                    .collection('users')
                    .doc(user.uid)
                    .collection(collectionName)
                    .doc(String(record.id));
                batch.set(docRef, record);
            });

            await batch.commit();
            console.log(`${collectionName} data migrated to Firestore.`);
        } catch (error) {
            console.error(`Error migrating ${collectionName} data:`, error);
        }
    }

    // Save operations
    async saveRecord(record) {
        const records = window.appState.getState('records') || [];
        const editingId = window.appState.getEditingId();

        let updatedRecords;
        if (editingId) {
            updatedRecords = records.map(r => r.id === editingId ? record : r);
        } else {
            updatedRecords = [...records, record];
        }

        // Update state first
        window.appState.updateRecords(updatedRecords);

        // Save to storage
        if (window.appState.isLoggedIn()) {
            try {
                await this.db
                    .collection('users')
                    .doc(window.appState.getCurrentUser().uid)
                    .collection('records')
                    .doc(String(record.id))
                    .set(record);
            } catch (error) {
                console.error("Error saving to Firestore:", error);
                window.uiManager.showAlert(window.i18n.translate('alertSaveToCloudError'), 'info');
            }
        } else {
            localStorage.setItem('workRecords', JSON.stringify(updatedRecords));
        }
    }

    async deleteRecord(id) {
        const records = window.appState.getState('records') || [];
        const updatedRecords = records.filter(r => r.id !== String(id));

        // Update state
        window.appState.updateRecords(updatedRecords);

        // Delete from storage
        if (window.appState.isLoggedIn()) {
            try {
                await this.db
                    .collection('users')
                    .doc(window.appState.getCurrentUser().uid)
                    .collection('records')
                    .doc(String(id))
                    .delete();
            } catch (error) {
                console.error("Error deleting from Firestore:", error);
            }
        } else {
            localStorage.setItem('workRecords', JSON.stringify(updatedRecords));
        }
    }

    async savePalletRecord(record) {
        const palletRecords = window.appState.getState('palletRecords') || [];
        const updatedRecords = [...palletRecords, record];

        // Update state
        window.appState.updatePalletRecords(updatedRecords);

        // Save to storage
        if (window.appState.isLoggedIn()) {
            try {
                await this.db
                    .collection('users')
                    .doc(window.appState.getCurrentUser().uid)
                    .collection('pallets')
                    .doc(String(record.id))
                    .set(record);
            } catch (error) {
                console.error("Error saving pallet to Firestore:", error);
            }
        } else {
            localStorage.setItem('palletRecords', JSON.stringify(updatedRecords));
        }
    }

    async deletePalletRecord(id) {
        const palletRecords = window.appState.getState('palletRecords') || [];
        const updatedRecords = palletRecords.filter(r => r.id !== String(id));

        // Update state
        window.appState.updatePalletRecords(updatedRecords);

        // Delete from storage
        if (window.appState.isLoggedIn()) {
            try {
                await this.db
                    .collection('users')
                    .doc(window.appState.getCurrentUser().uid)
                    .collection('pallets')
                    .doc(String(id))
                    .delete();
            } catch (error) {
                console.error("Error deleting pallet from Firestore:", error);
            }
        } else {
            localStorage.setItem('palletRecords', JSON.stringify(updatedRecords));
        }
    }

    // Export/Import operations
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

    async importData(file) {
        if (!file) {
            window.uiManager.showAlert(window.i18n.translate('alertChooseFile'), 'info');
            return;
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    
                    if (!Array.isArray(imported)) {
                        throw new Error(window.i18n.translate('alertImportInvalid'));
                    }

                    // Update state
                    window.appState.updateRecords(imported);

                    // Save to storage
                    if (window.appState.isLoggedIn()) {
                        await this.migrateLocalToFirestore(imported, 'records');
                    } else {
                        localStorage.setItem('workRecords', JSON.stringify(imported));
                    }

                    window.uiManager.showAlert(window.i18n.translate('alertImportSuccess'), 'success');
                    resolve(imported);
                } catch (err) {
                    const errorMsg = `${window.i18n.translate('errorImport')} ${err.message}`;
                    window.uiManager.showAlert(errorMsg, 'info');
                    reject(err);
                }
            };

            reader.readAsText(file);
        });
    }

    // Auto-export functionality
    checkForAutoExport() {
        const frequency = window.appState.getState('autoExportFrequency') || 'never';
        const records = window.appState.getState('records') || [];
        
        if (frequency === 'never' || records.length === 0) {
            return;
        }

        const lastExportDateStr = localStorage.getItem('lastAutoExportDate');
        if (!lastExportDateStr) {
            return;
        }

        const lastExportDate = new Date(lastExportDateStr);
        const today = new Date();
        const diffTime = today - lastExportDate;
        
        let requiredInterval = 0;
        switch(frequency) {
            case 'daily':   requiredInterval = 24 * 60 * 60 * 1000; break;
            case 'weekly':  requiredInterval = 7 * 24 * 60 * 60 * 1000; break;
            case 'monthly': requiredInterval = 30 * 24 * 60 * 60 * 1000; break;
        }

        if (diffTime > requiredInterval) {
            console.log(`${window.i18n.translate('logAutoExportStarted')} (${frequency})`);
            this.exportData();
            localStorage.setItem('lastAutoExportDate', new Date().toISOString());
        }
    }
}

// Global storage manager instance
window.storageManager = new StorageManager();
