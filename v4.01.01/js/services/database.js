const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        const i18n = translations[currentLang];
        let errorMessage = i18n.alertLoginError;
        if (error.code === 'auth/popup-closed-by-user') { return; }
        if (error.code === 'auth/popup-blocked') { errorMessage = i18n.alertPopupBlocked;}
        console.error('Google bejelentkezési hiba:', error);
        showCustomAlert(errorMessage, 'info');
    }
}

async function handleAuthStateChange(user) {
    const isGuest = localStorage.getItem('isGuestMode') === 'true';
    currentUser = user;

    const splashScreen = document.getElementById('splash-screen');
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app');

    if (splashScreen && !splashScreen.classList.contains('hidden')) {
        splashScreen.classList.add('hidden');
        setTimeout(() => { splashScreen.style.display = 'none'; }, 500);
    }

    if (user) {
        console.log("Bejelentkezve:", user.uid);
        authScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        updateAuthUI(user);

        const localRecords = JSON.parse(localStorage.getItem('workRecords') || '[]');
        const localPallets = JSON.parse(localStorage.getItem('palletRecords') || '[]');

        if (isGuest && (localRecords.length > 0 || localPallets.length > 0)) {
            console.log("Vendég adatok migrálása...");
            await migrateLocalToFirestore(localRecords, 'records');
            await migrateLocalToFirestore(localPallets, 'pallets');
            localStorage.removeItem('workRecords');
            localStorage.removeItem('palletRecords');
            localStorage.removeItem('isGuestMode');
            console.log("Migrálás kész.");
        }

        await loadSettingsFromFirestore();
        records = await loadRecordsFromFirestore('records');
        palletRecords = await loadRecordsFromFirestore('pallets');
        renderApp();
        
    } else if (isGuest) {
        console.log("Vendég mód aktív.");
        authScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        updateAuthUI(null);
        records = JSON.parse(localStorage.getItem('workRecords') || '[]');
        palletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');
        renderApp();

    } else {
        console.log("Kijelentkezve, bejelentkezési képernyő mutatása.");
        authScreen.classList.remove('hidden');
        appScreen.classList.add('hidden');
        updateAuthUI(null);
        records = [];
        palletRecords = [];
    }
}

function updateAuthUI(user) {
    const loggedInView = document.getElementById('logged-in-view');
    const loggedOutView = document.getElementById('logged-out-view');
    const userNameEl = document.getElementById('user-name');
    if (user) {
        if(loggedInView) loggedInView.classList.remove('hidden');
        if(loggedOutView) loggedOutView.classList.add('hidden');
        if(userNameEl) userNameEl.textContent = user.displayName || user.email;
    } else {
        if(loggedInView) loggedInView.classList.add('hidden');
        if(loggedOutView) loggedOutView.classList.remove('hidden');
        if(userNameEl) userNameEl.textContent = '';
    }
}

async function loadRecordsFromFirestore(collectionName) {
    if (!currentUser) return [];
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection(collectionName).get();
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error(`Hiba az adatok letöltésekor (${collectionName}):`, error);
        showCustomAlert(translations[currentLang].alertDataLoadError, 'info');
        return [];
    }
}

async function migrateLocalToFirestore(localData, collectionName) {
    if (!currentUser || !localData || localData.length === 0) return;
    const batch = db.batch();
    const collectionRef = db.collection('users').doc(currentUser.uid).collection(collectionName);
    localData.forEach(record => {
        const docRef = collectionRef.doc(String(record.id));
        batch.set(docRef, record);
    });
    try {
        await batch.commit();
        console.log(`${collectionName} adatok migrálva.`);
    } catch (error) {
        console.error(`Hiba a ${collectionName} adatok migrálása során:`, error);
    }
}

async function saveWorkRecord(record) {
    if (editingId) {
        const recordIndex = records.findIndex(r => r.id === editingId);
        if(recordIndex > -1) records[recordIndex] = record;
    } else {
        records.push(record);
    }

    if (currentUser) {
        try {
            await db.collection('users').doc(currentUser.uid).collection('records').doc(String(record.id)).set(record);
        } catch (error) {
            console.error("Error saving to Firestore:", error);
            showCustomAlert(translations[currentLang].alertSaveToCloudError, 'info');
        }
    } else {
        localStorage.setItem('workRecords', JSON.stringify(records));
    }
}

async function deleteWorkRecord(id) {
    records = records.filter(r => r.id !== String(id));
    if (currentUser) {
        try {
            await db.collection('users').doc(currentUser.uid).collection('records').doc(String(id)).delete();
        } catch (error) {
            console.error("Error deleting from Firestore:", error);
            showCustomAlert(translations[currentLang].alertSaveToCloudError, 'info');
        }
    } else {
        localStorage.setItem('workRecords', JSON.stringify(records));
    }
}

async function saveSettingsToFirestore(settings) {
    if (!currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).collection('settings').doc('userSettings').set(settings);
        console.log('Beállítások sikeresen mentve a felhőbe.');
    } catch (error) {
        console.error("Hiba a beállítások mentésekor:", error);
        showCustomAlert('A beállítások szinkronizálása nem sikerült.', 'info');
    }
}

async function loadSettingsFromFirestore() {
    if (!currentUser) return;
    try {
        const doc = await db.collection('users').doc(currentUser.uid).collection('settings').doc('userSettings').get();
        if (doc.exists) {
            const settings = doc.data();
            Object.keys(settings).forEach(key => {
                localStorage.setItem(key, settings[key]);
            });
            loadSettings();
            applyFeatureToggles();
            setTheme(localStorage.getItem('theme') || 'auto');
            setLanguage(localStorage.getItem('language') || 'hu');
            refreshToggleVisuals();
        } else {
            console.log('Nincsenek mentett beállítások a felhőben. Feltöltés...');
            await uploadLocalSettings();
        }
    } catch (error) {
        console.error("Hiba a beállítások betöltésekor:", error);
    }
}