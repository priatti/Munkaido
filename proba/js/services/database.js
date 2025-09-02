import { db } from '../config.js';
import { state, setRecords, setPalletRecords } from '../state.js';
import { showAlert } from '../utils/domHelpers.js'; // <-- EZ VOLT A HIBA, MOST MÁR JÓ!

/**
 * Betölti a munkaidő és paletta bejegyzéseket a megfelelő forrásból
 * (Firestore bejelentkezett felhasználónál, LocalStorage vendégként).
 */
export async function loadAllRecords() {
    if (state.currentUser) {
        // Felhasználó be van jelentkezve -> Firestore
        const firestoreRecords = await loadCollectionFromFirestore('records');
        const localRecords = JSON.parse(localStorage.getItem('workRecords') || '[]');

        if (firestoreRecords.length === 0 && localRecords.length > 0) {
            // Első bejelentkezés: migráljuk a helyi adatokat a felhőbe
            await migrateLocalToFirestore(localRecords, 'records');
            setRecords(localRecords);
        } else {
            setRecords(firestoreRecords);
        }
        
        const palletRecords = await loadCollectionFromFirestore('pallets');
        setPalletRecords(palletRecords);
    } else {
        // Nincs felhasználó -> LocalStorage
        const localRecords = JSON.parse(localStorage.getItem('workRecords') || '[]');
        const localPalletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');
        setRecords(localRecords);
        setPalletRecords(localPalletRecords);
    }
}

/**
 * Elment egy munkaidő bejegyzést a megfelelő tárolóba.
 * @param {object} record - A menteni kívánt bejegyzés objektum.
 */
export async function saveRecord(record) {
    if (state.currentUser) {
        try {
            const docRef = db.collection('users').doc(state.currentUser.uid).collection('records').doc(String(record.id));
            await docRef.set(record);
        } catch (error) {
            console.error("Hiba a Firestore-ba mentéskor:", error);
            showAlert(window.translations[state.currentLang].alertSaveToCloudError, 'info');
        }
    } else {
        localStorage.setItem('workRecords', JSON.stringify(state.records));
    }
}

/**
 * Töröl egy munkaidő bejegyzést a megfelelő tárolóból.
 * @param {string} id - A törlendő bejegyzés azonosítója.
 */
export async function deleteRecord(id) {
    if (state.currentUser) {
        try {
            await db.collection('users').doc(state.currentUser.uid).collection('records').doc(String(id)).delete();
        } catch (error) {
            console.error("Hiba a Firestore-ból való törléskor:", error);
            showAlert(window.translations[state.currentLang].alertSaveToCloudError, 'info');
        }
    } else {
        localStorage.setItem('workRecords', JSON.stringify(state.records));
    }
}

/**
 * Elment egy paletta bejegyzést.
 * @param {object} palletRecord - A menteni kívánt paletta bejegyzés.
 */
export async function savePalletRecord(palletRecord) {
     if (state.currentUser) {
        try {
            const docRef = db.collection('users').doc(state.currentUser.uid).collection('pallets').doc(String(palletRecord.id));
            await docRef.set(palletRecord);
        } catch (error) {
            console.error("Hiba a paletta adat mentésekor:", error);
        }
    } else {
        localStorage.setItem('palletRecords', JSON.stringify(state.palletRecords));
    }
}

/**
 * Töröl egy paletta bejegyzést.
 * @param {string} id - A törlendő paletta bejegyzés azonosítója.
 */
export async function deletePalletRecord(id) {
    if (state.currentUser) {
        await db.collection('users').doc(state.currentUser.uid).collection('pallets').doc(String(id)).delete();
    } else {
        localStorage.setItem('palletRecords', JSON.stringify(state.palletRecords));
    }
}

// Belső segédfüggvények
async function loadCollectionFromFirestore(collectionName) {
    try {
        const snapshot = await db.collection('users').doc(state.currentUser.uid).collection(collectionName).get();
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error(`Hiba a(z) ${collectionName} adatok letöltésekor:`, error);
        showAlert(window.translations[state.currentLang].alertDataLoadError, 'info');
        return [];
    }
}

async function migrateLocalToFirestore(localData, collectionName) {
    const batch = db.batch();
    localData.forEach(record => {
        const docRef = db.collection('users').doc(state.currentUser.uid).collection(collectionName).doc(String(record.id));
        batch.set(docRef, record);
    });
    try {
        await batch.commit();
        console.log(`${collectionName} adatok sikeresen migrálva a felhőbe.`);
    } catch (error) {
        console.error(`Hiba a(z) ${collectionName} adatok feltöltésekor:`, error);
    }
}
