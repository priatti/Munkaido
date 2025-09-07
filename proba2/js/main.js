// js/main.js

// ====== MODULOK IMPORTÁLÁSA ======
import { translations as huTranslations } from './lang/hu.js';
import { translations as deTranslations } from './lang/de.js';
import { auth, db, loadDataFromFirestore, migrateLocalToFirestore } from './firebase.js';
import * as ui from './ui.js';
import * as pallets from './features/pallets.js';
import * as tacho from './features/tachograph.js';
// Még nem létező, de a jövőben szükséges modulok importja
//import * as report from './features/report.js';
//import * as stats from './features/stats.js';
//import * as summary from './features/summary.js';
//import * as recordsModule from './features/records.js';

// ====== GLOBÁLIS ÁLLAPOT (STATE) ======
export let currentUser = null;
export let records = [];
export let palletRecords = [];
export const translations = { ...huTranslations.hu, ...deTranslations.de };
export let currentLang = localStorage.getItem('language') || (navigator.language.startsWith('de') ? 'de' : 'hu');
export const i18n = translations[currentLang];

// ====== GLOBÁLIS FUNKCIÓK A HTML SZÁMÁRA ======
window.app = {
    ...ui,
    ...pallets,
    ...tacho,
    //...report,
    //...stats,
    //...summary,
    //...recordsModule
};
// Néhány funkciónak át kell adni az i18n objektumot, mert most már paraméterként kérik
window.app.showCustomAlert = (message, type, callback) => ui.showCustomAlert(i18n, message, type, callback);
window.hideCustomAlert = ui.hideCustomAlert;


// ====== ALKALMAZÁS INDÍTÁSA ======
document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.lang = currentLang;
    ui.initTheme();
    // A többi event listener ide jöhet a jövőben
});

auth.onAuthStateChanged(async user => {
    currentUser = user;
    
    if (user) {
        console.log("Bejelentkezve:", user.uid);
        const [firestoreRecords, firestorePallets] = await Promise.all([
            loadDataFromFirestore(user.uid, 'records'),
            loadDataFromFirestore(user.uid, 'pallets')
        ]);

        const localRecords = JSON.parse(localStorage.getItem('workRecords') || '[]');
        if (firestoreRecords.length === 0 && localRecords.length > 0) {
            await migrateLocalToFirestore(user.uid, localRecords, 'records');
            records = localRecords;
        } else {
            records = firestoreRecords;
        }
        palletRecords = firestorePallets;
    } else {
        console.log("Kijelentkezve.");
        records = JSON.parse(localStorage.getItem('workRecords') || '[]');
        palletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');
    }

    renderApp();
});


function renderApp() {
    // A showTab mostantól nem létezik az ui modulban,
    // mert a teljes UI vezérlés a main.js-ben történik.
    // Létrehozunk egy egyszerűsített showTab-ot itt.
    
    const tabName = 'live'; // Kezdő fül
    document.querySelectorAll('[id^="content-"]').forEach(c => c.classList.add('hidden')); 
    document.getElementById(`content-${tabName}`).classList.remove('hidden'); 
    
    // Kezdeti állapot renderelése
    tacho.renderWeeklyAllowance();
    pallets.updateUniquePalletLocations();
    // ... egyéb induláskori renderelők ...

    ui.updateAllTexts(i18n, currentLang);
}
