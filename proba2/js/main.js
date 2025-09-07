// js/main.js

// ====== MODULOK IMPORTÁLÁSA ======
import { translations as huTranslations } from './lang/hu.js';
import { translations as deTranslations } from './lang/de.js';
import { auth, loadDataFromFirestore, migrateLocalToFirestore } from './firebase.js';
import * as ui from './ui.js';
import * as pallets from './features/pallets.js';
import * as tacho from './features/tachograph.js';
import * as report from './features/report.js';
import * as stats from './features/stats.js';
import * as summary from './features/summary.js';
import * as recordsModule from './features/records.js';

// ====== GLOBÁLIS ÁLLAPOT (STATE) ======
export let currentUser = null;
export let records = [];
export let palletRecords = [];
export const translations = { ...huTranslations.hu, ...deTranslations.de };
export let currentLang = localStorage.getItem('language') || (navigator.language.startsWith('de') ? 'de' : 'hu');
export const i18n = translations[currentLang];


// ====== GLOBÁLIS FUNKCIÓK A HTML SZÁMÁRA ======
// Ez a `window.app` objektum teszi a funkciókat elérhetővé az `onclick` események számára.
window.app = {
    // UI
    setLanguage: ui.setLanguage,
    toggleDropdown: ui.toggleDropdown,
    setTheme: ui.setTheme,
    hideCustomAlert: ui.hideCustomAlert,
    showTab: (tabName) => {
        // A showTab mostantól a main.js felelőssége, mert neki kell tudnia,
        // melyik renderelő függvényt hívja meg.
        document.querySelectorAll('[id^="content-"]').forEach(c => c.classList.add('hidden'));
        document.getElementById(`content-${tabName}`).classList.remove('hidden');
        ui.closeDropdown();

        // Tartalom-specifikus renderelők hívása a megfelelő adatokkal
        if (tabName === 'list') recordsModule.renderRecords(i18n, currentLang, records);
        if (tabName === 'summary') summary.renderSummary(i18n, currentLang, records);
        if (tabName === 'stats') stats.renderStats(i18n, currentLang, records);
        if (tabName === 'report') report.initMonthlyReport();
        if (tabName === 'tachograph') tacho.renderTachographAnalysis(i18n, currentLang, records);
        if (tabName === 'pallets') pallets.renderPalletRecords(i18n, palletRecords);
        
        ui.updateAllTexts(i18n, currentLang);
    },
    // Pallets
    savePalletEntry: () => pallets.savePalletEntry(i18n, currentUser, palletRecords),
    deletePalletEntry: (id) => pallets.deletePalletEntry(i18n, currentUser, palletRecords, id),
    generatePalletReport: () => pallets.generatePalletReport(i18n, palletRecords),
    // Tachograph
    handleTachographToggle: (checkbox, recordId, type) => tacho.handleTachographToggle(i18n, currentLang, records, checkbox, recordId, type),
    // ... és a többi funkció, amit a HTML-ből hívunk ...
};


// ====== ALKALMAZÁS INDÍTÁSA ======
document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.lang = currentLang;
    ui.initTheme();
    
    // Event listenerek
    document.getElementById('stats-prev').onclick = () => stats.navigateStats(-1, i18n, currentLang, records);
    document.getElementById('stats-next').onclick = () => stats.navigateStats(1, i18n, currentLang, records);
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
    ui.updateAllTexts(i18n, currentLang);
    
    // Kezdeti állapot renderelése
    window.app.showTab('live');
    
    tacho.renderWeeklyAllowance(i18n, currentLang, records);
    pallets.updateUniquePalletLocations(palletRecords);
}
