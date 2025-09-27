// =======================================================
// ===== FIREBASE ÉS AUTHENTIKÁCIÓS LOGIKA (v8.03) =======
// =======================================================
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

function initializeAuth() {
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');

    if (loginButton) {
        loginButton.addEventListener('click', signInWithGoogle);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', () => auth.signOut());
    }

    auth.onAuthStateChanged(handleAuthStateChange);
}

async function signInWithGoogle() {
    const loginButton = document.getElementById('login-button');
    const originalButtonContent = loginButton.innerHTML;
    loginButton.disabled = true;
    loginButton.innerHTML = `...`;
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        const i18n = translations[currentLang];
        let errorMessage = i18n.alertLoginError;
        if (error.code === 'auth/popup-closed-by-user') { errorMessage = i18n.alertPopupClosed; } 
        else if (error.code === 'auth/popup-blocked') { errorMessage = i18n.alertPopupBlocked;}
        console.error('Login error:', error);
        showCustomAlert(errorMessage, 'info');
    } finally {
        loginButton.disabled = false;
        loginButton.innerHTML = originalButtonContent;
    }
}

async function handleAuthStateChange(user) {
    currentUser = user;
    updateAuthUI(user);

    if (user) {
        console.log("Logged in:", user.uid);
        
        // Beállítások szinkronizálása
        await loadSettingsFromFirestore(); 
        
        const firestoreRecords = await loadRecordsFromFirestore('records');
        const localRecords = JSON.parse(localStorage.getItem('workRecords') || '[]');

        if (firestoreRecords.length === 0 && localRecords.length > 0) {
            await migrateLocalToFirestore(localRecords, 'records');
            records = localRecords;
        } else {
            records = firestoreRecords;
        }
        palletRecords = await loadRecordsFromFirestore('pallets');
    } else {
        console.log("Logged out.");
        records = JSON.parse(localStorage.getItem('workRecords') || '[]');
        palletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');
    }

    await runNightWorkRecalculation();
    
    // Kezdőkép elrejtése és az app megjelenítése
    const splashScreen = document.getElementById('splash-screen');
    const appContainer = document.getElementById('app');
    
    // Adjunk egy kis időt, hogy minden biztosan betöltődjön
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.classList.add('hidden');
            setTimeout(() => {
                splashScreen.style.display = 'none';
            }, 500);
        }
        if (appContainer) {
            appContainer.classList.remove('hidden');
        }
        renderApp(); // Itt hívjuk meg a renderelést, miután minden adat betöltődött
        checkForAutoExport();
    }, 500);
}

function updateAuthUI(user) {
    const loggedInView = document.getElementById('logged-in-view');
    const loggedOutView = document.getElementById('logged-out-view');
    const userNameEl = document.getElementById('user-name');
    if (user) {
        loggedInView.classList.remove('hidden');
        loggedOutView.classList.add('hidden');
        userNameEl.textContent = user.displayName || user.email;
    } else {
        loggedInView.classList.add('hidden');
        loggedOutView.classList.remove('hidden');
        userNameEl.textContent = '';
    }
}

async function loadRecordsFromFirestore(collectionName) {
    if (!currentUser) return [];
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection(collectionName).get();
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error(`Error loading ${collectionName} data:`, error);
        showCustomAlert(translations[currentLang].alertDataLoadError, 'info');
        return [];
    }
}

async function migrateLocalToFirestore(localData, collectionName) {
    if (!currentUser) return;
    const batch = db.batch();
    const localKey = collectionName === 'records' ? 'workRecords' : 'palletRecords';
    const dataToMigrate = JSON.parse(localStorage.getItem(localKey) || '[]');

    dataToMigrate.forEach(record => {
        const docRef = db.collection('users').doc(currentUser.uid).collection(collectionName).doc(String(record.id));
        batch.set(docRef, record);
    });
    try {
        await batch.commit();
        console.log(`${collectionName} data migrated to Firestore.`);
    } catch (error) {
        console.error(`Error migrating ${collectionName} data:`, error);
    }
}

async function saveWorkRecord(record) {
    if (editingId) {
        records = records.map(r => r.id === editingId ? record : r);
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

async function savePalletRecords() {
    if (!currentUser) {
        localStorage.setItem('palletRecords', JSON.stringify(palletRecords));
        return;
    }
    try {
        const batch = db.batch();
        const collectionRef = db.collection('users').doc(currentUser.uid).collection('pallets');
        
        // Letöröljük a régieket és feltöltjük az újakat, hogy a törlés is szinkronizálódjon
        const snapshot = await collectionRef.get();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));

        palletRecords.forEach(record => {
            const docRef = collectionRef.doc(String(record.id));
            batch.set(docRef, record);
        });

        await batch.commit();
    } catch (e) {
        console.error("Error saving pallet data:", e);
        showCustomAlert(translations[currentLang].alertSaveToCloudError, 'info');
    }
}

async function saveSettingsToFirestore(settings) {
    if (!currentUser) return;
    try {
        // A 'settings' kollekción belül egy 'userSettings' nevű dokumentumba mentünk.
        // Így később akár több beállítás-csomag is lehet.
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
            console.log('Beállítások betöltve a felhőből:', settings);
            // Végigmegyünk a letöltött beállításokon és frissítjük a helyi tárolót
            Object.keys(settings).forEach(key => {
                localStorage.setItem(key, settings[key]);
            });
            
            // Frissítjük a UI-t
            loadSettings();
            applyFeatureToggles();
            setTheme(localStorage.getItem('theme') || 'auto');
            setLanguage(localStorage.getItem('language') || 'hu');
            
            // A kapcsolók vizuális állapotának frissítése
            refreshToggleVisuals();

        } else {
            console.log('Nincsenek mentett beállítások a felhőben. A helyi beállítások feltöltése...');
            // Ha a felhőben nincs semmi, feltöltjük az aktuális helyi beállításokat
            await uploadLocalSettings();
        }
    } catch (error) {
        console.error("Hiba a beállítások betöltésekor:", error);
    }
}