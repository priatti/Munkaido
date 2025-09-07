// js/firebase.js

// Firebase szolgáltatások inicializálása és exportálása, hogy más fájlok is elérjék
export const auth = firebase.auth();
export const db = firebase.firestore();

/**
 * Adatok letöltése a Firestore-ból (munkaidő vagy raklap).
 * @param {string} uid A felhasználó egyedi azonosítója.
 * @param {string} collectionName A gyűjtemény neve ('records' vagy 'pallets').
 * @returns {Promise<Array>} A letöltött adatok tömbje.
 */
export async function loadDataFromFirestore(uid, collectionName) {
    try {
        const snapshot = await db.collection('users').doc(uid).collection(collectionName).get();
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error(`Hiba a(z) ${collectionName} adatok letöltésekor:`, error);
        return []; // Hiba esetén üres tömbbel térünk vissza
    }
}

/**
 * Egyetlen rekord (munkaidő vagy raklap) mentése a Firestore-ba.
 * @param {string} uid A felhasználó egyedi azonosítója.
 * @param {string} collectionName A gyűjtemény neve.
 * @param {object} record A menteni kívánt adatobjektum.
 */
export async function saveDataToFirestore(uid, collectionName, record) {
    try {
        await db.collection('users').doc(uid).collection(collectionName).doc(String(record.id)).set(record);
    } catch (error) {
        console.error(`Hiba a(z) ${collectionName} adat mentésekor a Firestore-ba:`, error);
        throw error; // Dobjuk tovább a hibát, hogy a hívó fél tudjon róla
    }
}

/**
 * Egyetlen rekord (munkaidő vagy raklap) törlése a Firestore-ból.
 * @param {string} uid A felhasználó egyedi azonosítója.
 * @param {string} collectionName A gyűjtemény neve.
 * @param {string} id A törlendő rekord azonosítója.
 */
export async function deleteDataFromFirestore(uid, collectionName, id) {
    try {
        await db.collection('users').doc(uid).collection(collectionName).doc(String(id)).delete();
    } catch (error) {
        console.error(`Hiba a(z) ${collectionName} adat törlésekor a Firestore-ból:`, error);
        throw error;
    }
}

/**
 * Lokális adatok migrálása a Firestore-ba a legelső bejelentkezéskor.
 * @param {string} uid A felhasználó egyedi azonosítója.
 * @param {Array} localData A localStorage-ból beolvasott adatok.
 * @param {string} collectionName A cél gyűjtemény neve.
 */
export async function migrateLocalToFirestore(uid, localData, collectionName) {
    if (!localData || localData.length === 0) return;
    
    const batch = db.batch();
    localData.forEach(record => {
        const docRef = db.collection('users').doc(uid).collection(collectionName).doc(String(record.id));
        batch.set(docRef, record);
    });
    try {
        await batch.commit();
         console.log(`${collectionName} adatok sikeresen migrálva a felhőbe.`);
    } catch (error) {
        console.error(`Hiba a(z) ${collectionName} adatok migrálásakor:`, error);
    }
}