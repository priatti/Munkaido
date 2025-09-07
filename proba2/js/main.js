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
// A többi, még létre nem hozott modul importját is betehetjük, hibát nem okoz
import * as recordsModule from './features/records.js';


// ====== GLOBÁLIS ÁLLAPOT (STATE) ======
export let currentUser = null;
export let records = [];
export let palletRecords = [];
export const translations = { ...huTranslations.hu, ...deTranslations.de }; // Fontos javítás: .hu és .de kulcsok alól vesszük ki
export let currentLang = localStorage.getItem('language') || (navigator.language.startsWith('de') ? 'de' : 'hu');

// ====== GLOBÁLIS FUNKCIÓK A HTML SZÁMÁRA ======
window.app = {
    ...ui,
    ...pallets,
    ...tacho,
    ...report,
    ...stats,
    ...summary,
    ...recordsModule
};
window.hideCustomAlert = ui.hideCustomAlert;


// ====== ALKALMAZÁS INDÍTÁSA ======

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.lang = currentLang;
    ui.initTheme();
    
    document.getElementById('stats-view-daily').onclick = () => { 
        stats.renderStats('daily'); 
        ui.updateAllTexts();
    };
    document.getElementById('stats-view-monthly').onclick = () => { 
        stats.renderStats('monthly'); 
        ui.updateAllTexts();
    };
    document.getElementById('stats-view-yearly').onclick = () => { 
        stats.renderStats('yearly'); 
        ui.updateAllTexts();
    };
    document.getElementById('stats-prev').onclick = () => { stats.navigateStats(-1); };
    document.getElementById('stats-next').onclick = () => { stats.navigateStats(1); };
});

auth.onAuthStateChanged(async user => {
    currentUser = user;
    
    if (user) {
        // ... (bejelentkezett logika)
    } else {
        // ... (kijelentkezett logika)
    }

    // Adatbetöltés (az egyszerűség kedvéért most kihagyva a hosszú kódot)
    records = JSON.parse(localStorage.getItem('workRecords') || '[]');
    palletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');


    renderApp();
});


function renderApp() {
    ui.showTab('live');
    tacho.renderWeeklyAllowance();
    pallets.updateUniquePalletLocations();
    ui.updateAllTexts();
}
