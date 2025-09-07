// js/main.js

// ====== MODULOK IMPORTÁLÁSA ======
import { translations as huTranslations } from './lang/hu.js';
import { translations as deTranslations } from './lang/de.js';
import { auth, db, loadDataFromFirestore, migrateLocalToFirestore } from './firebase.js';
import * as ui from './ui.js';
import * as pallets from './features/pallets.js';
import * as tacho from './features/tachograph.js';
import * as report from './features/report.js';
import * as stats from './features/stats.js';
import * as summary from './features/summary.js';

// ====== GLOBÁLIS ÁLLAPOT (STATE) ======
export let currentUser = null;
export let records = [];
export let palletRecords = [];
export const translations = { ...huTranslations, ...deTranslations };
export let currentLang = localStorage.getItem('language') || (navigator.language.startsWith('de') ? 'de' : 'hu');

// ====== GLOBÁLIS FUNKCIÓK A HTML SZÁMÁRA ======
window.app = {
    ...ui,
    ...pallets,
    ...tacho,
    ...report,
    ...stats,
    ...summary
    // Itt gyűjtünk össze minden funkciót, amit a HTML-ből el akarunk érni
};
// A hideCustomAlert-et külön is kitesszük, mert a felugró ablakból közvetlenül hívódik
window.hideCustomAlert = ui.hideCustomAlert;


// ====== ALKALMAZÁS INDÍTÁSA ======

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.lang = currentLang;
    ui.initTheme();
    
    // Ide jönnek a többi, induláskor szükséges event listenerek
    document.getElementById('stats-view-daily').onclick = () => { stats.renderStats('daily'); };
    document.getElementById('stats-view-monthly').onclick = () => { stats.renderStats('monthly'); };
    document.getElementById('stats-view-yearly').onclick = () => { stats.renderStats('yearly'); };
    document.getElementById('stats-prev').onclick = () => { stats.navigateStats(-1); };
    document.getElementById('stats-next').onclick = () => { stats.navigateStats(1); };
});

auth.onAuthStateChanged(async user => {
    currentUser = user;
    
    if (user) {
        console.log("Bejelentkezve:", user.uid);
        const firestoreRecords = await loadDataFromFirestore(user.uid, 'records');
        const localRecords = JSON.parse(localStorage.getItem('workRecords') || '[]');
        
        if (firestoreRecords.length === 0 && localRecords.length > 0) {
            await migrateLocalToFirestore(user.uid, localRecords, 'records');
            records = localRecords;
        } else {
            records = firestoreRecords;
        }
        palletRecords = await loadDataFromFirestore(user.uid, 'pallets');
    } else {
        console.log("Kijelentkezve.");
        records = JSON.parse(localStorage.getItem('workRecords') || '[]');
        palletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');
    }

    renderApp();
});


function renderApp() {
    ui.updateAllTexts(); // Legelső a fordítás
    
    // Kezdeti állapot renderelése
    ui.showTab('live'); // Kezdő fül megjelenítése
    tacho.renderWeeklyAllowance();
    pallets.updateUniquePalletLocations();
    // ... (minden, aminek az induláskor meg kell jelennie) ...
}
