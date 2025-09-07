// js/main.js

// ====== MODULOK IMPORTÁLÁSA ======
import { hu } from './lang/hu.js';
import { de } from './lang/de.js';
import { auth, db, loadDataFromFirestore, migrateLocalToFirestore, saveDataToFirestore, deleteDataFromFirestore } from './firebase.js';
import { setLanguage, updateAllTexts, initTheme, setTheme, showTab, toggleDropdown, closeDropdown, showCustomAlert, hideCustomAlert, updateToggleVisuals } from './ui.js';
import { renderPalletRecords, savePalletEntry, deletePalletEntry, generatePalletReport, updateUniquePalletLocations } from './features/pallets.js';
import { renderTachographAnalysis, renderWeeklyAllowance, handleTachographToggle } from './features/tachograph.js';
import { renderStats, navigateStats } from './features/stats.js';
import { renderSummary } from './features/summary.js';
import { initMonthlyReport, generateMonthlyReport, exportToPDF, sharePDF } from './features/report.js';

// ====== GLOBÁLIS ÁLLAPOT (STATE) ======
// Ezeket a változókat exportáljuk, hogy a többi modul is elérje őket.
export let currentUser = null;
export let records = [];
export let palletRecords = [];
export const translations = { ...hu, ...de };
export let currentLang = localStorage.getItem('language') || (navigator.language.startsWith('de') ? 'de' : 'hu');

// ====== GLOBÁLIS FUNKCIÓK A HTML SZÁMÁRA ======
// A modulok miatt a HTML onclick eseményei nem érik el a funkciókat.
// Itt tesszük őket globálisan elérhetővé a window objektumon keresztül.
window.showTab = showTab;
window.setLanguage = setLanguage;
window.toggleDropdown = toggleDropdown;
window.hideCustomAlert = hideCustomAlert;
window.setTheme = setTheme;
// ... (minden más onclick=""-ben használt funkció)
// Például a `pallets.js`-ből importáltakat is:
window.savePalletEntry = savePalletEntry;
window.deletePalletEntry = deletePalletEntry;
window.generatePalletReport = generatePalletReport;
// És így tovább az összes többivel. Létrehozunk egy központi objektumot a jobb átláthatóságért.
window.app = {
    // UI
    showTab, setLanguage, toggleDropdown, hideCustomAlert, setTheme,
    // Pallets
    savePalletEntry, deletePalletEntry, generatePalletReport,
    // Tachograph
    handleTachographToggle,
    // Report
    initMonthlyReport, generateMonthlyReport, exportToPDF, sharePDF,
    // Stats
    navigateStats,
    // ... és a többi, ha szükséges ...
};

// ====== ALKALMAZÁS INDÍTÁSA ======

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.lang = currentLang;
    initTheme();
    // A DOMContentLoaded-ben lévő egyéb event listenerek ide jönnek
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

    // Fő renderelő függvény, ami elindítja az appot az adatok betöltése után
    renderApp();
});

function renderApp() {
    // Kezdeti állapot renderelése
    showTab('live'); // Kezdő fül megjelenítése
    renderWeeklyAllowance();
    updateUniquePalletLocations();
    // ... (minden, aminek az induláskor meg kell jelennie) ...

    updateAllTexts(); // A legvégén lefordítjuk a szövegeket
}