// js/main.js

// ====== MODULOK IMPORTÁLÁSA ======
import { translations as huTranslations } from './lang/hu.js';
import { translations as deTranslations } from './lang/de.js';
import { auth, loadDataFromFirestore, migrateLocalToFirestore } from './firebase.js';
import * as ui from './ui.js';
import * as pallets from './features/pallets.js';
import * as tacho from './features/tachograph.js';

// IDEIGLENESEN, amíg a többi fájl nincs kész, ezeket kikommenteljük
// import * as report from './features/report.js';
// import * as stats from './features/stats.js';
// import * as summary from './features/summary.js';
// import * as recordsModule from './features/records.js';

// ====== GLOBÁLIS ÁLLAPOT (STATE) ======
let currentUser = null;
let records = [];
let palletRecords = [];
const translations = { ...huTranslations.hu, ...deTranslations.de };
let currentLang = localStorage.getItem('language') || (navigator.language.startsWith('de') ? 'de' : 'hu');
const i18n = translations[currentLang];

// ====== FŐ ALKALMAZÁS LOGIKA ======

function showTab(tabName) {
    const allTabs = document.querySelectorAll('.tab'); 
    const mainTabs = ['live', 'full-day', 'list', 'pallets']; 
    const dropdownButton = document.getElementById('dropdown-button'); 
    
    allTabs.forEach(t => t.classList.remove('tab-active')); 
    dropdownButton.classList.remove('tab-active'); 
    
    if (mainTabs.includes(tabName)) { 
        document.getElementById(`tab-${tabName}`).classList.add('tab-active'); 
        const moreMenuText = i18n.menuMore || 'More';
        dropdownButton.innerHTML = `<span>${moreMenuText}</span> ▼`; 
    } else { 
        dropdownButton.classList.add('tab-active'); 
        const selectedTitleEl = document.querySelector(`button[onclick="window.app.showTab('${tabName}')"] .dropdown-item-title`); 
        if(selectedTitleEl) { 
            const selectedTitle = selectedTitleEl.textContent; 
            dropdownButton.innerHTML = `${selectedTitle} ▼`; 
        } 
    } 
    
    document.querySelectorAll('[id^="content-"]').forEach(c => c.classList.add('hidden')); 
    document.getElementById(`content-${tabName}`).classList.remove('hidden'); 
    ui.closeDropdown(); 

    // Tartalom-specifikus renderelők hívása
    // if (tabName === 'list') recordsModule.renderRecords(i18n, currentLang, records);
    // if (tabName === 'summary') summary.renderSummary(i18n, currentLang, records);
    // if (tabName === 'stats') stats.renderStats(i18n, currentLang, records);
    // if (tabName === 'report') report.initMonthlyReport();
    if (tabName === 'tachograph') tacho.renderTachographAnalysis(i18n, currentLang, records);
    if (tabName === 'pallets') pallets.renderPalletRecords(i18n, palletRecords);
    
    ui.updateAllTexts(i18n, currentLang);
}

// ====== GLOBÁLIS FUNKCIÓK A HTML SZÁMÁRA ======
window.app = {
    showTab: showTab,
    setLanguage: ui.setLanguage,
    toggleDropdown: ui.toggleDropdown,
    setTheme: ui.setTheme,
    hideCustomAlert: ui.hideCustomAlert,
    showCustomAlert: (message, type, callback) => ui.showCustomAlert(i18n, message, type, callback),
    
    // Pallets
    savePalletEntry: () => pallets.savePalletEntry(i18n, currentUser, palletRecords),
    deletePalletEntry: (id) => pallets.deletePalletEntry(i18n, currentUser, palletRecords, id),
    generatePalletReport: () => pallets.generatePalletReport(i18n, palletRecords),
    
    // Tachograph
    handleTachographToggle: (checkbox, recordId, type) => tacho.handleTachographToggle(i18n, currentLang, records, checkbox.target, recordId, type),
};

// ====== ALKALMAZÁS INDÍTÁSA ======
document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.lang = currentLang;
    ui.initTheme();
    // Ide jöhetnek a többi, induláskor szükséges event listenerek
});

auth.onAuthStateChanged(async user => {
    currentUser = user;
    if (user) {
        console.log("Bejelentkezve:", user.uid);
        [records, palletRecords] = await Promise.all([
            loadDataFromFirestore(user.uid, 'records'),
            loadDataFromFirestore(user.uid, 'pallets')
        ]);
    } else {
        console.log("Kijelentkezve.");
        records = JSON.parse(localStorage.getItem('workRecords') || '[]');
        palletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');
    }
    renderApp();
});

function renderApp() {
    ui.updateAllTexts(i18n, currentLang);
    showTab('live');
    tacho.renderWeeklyAllowance(i18n, currentLang, records);
    pallets.updateUniquePalletLocations(palletRecords);
}
