import { state } from '../state.js';
import { renderLiveTabView } from './liveView.js';
import { renderRecords } from './listView.js';
import { renderSummary } from './summaryView.js';
import { renderStats, initializeStatsView } from './statsView.js';
import { renderTachographAnalysis } from './tachographView.js';
import { renderPalletRecords } from './palletsView.js';
import { initMonthlyReport } from './reportView.js';
import { loadLastValues } from './fullDayView.js';
import { closeDropdown } from '../utils/domHelpers.js';

// Az összes létező fül (tab) azonosítója
const TABS = ['live', 'full-day', 'list', 'pallets', 'summary', 'stats', 'tachograph', 'report', 'settings'];

/**
 * Megjelenít egy adott fület és elrejti a többit.
 * @param {string} tabIdToShow - A megjelenítendő fül ID-ja.
 */
export function showTab(tabIdToShow) {
    // Aktív stílus beállítása a gombokon
    const mainTabs = ['live', 'full-day', 'list', 'pallets'];
    const dropdownButton = document.getElementById('dropdown-button');
    
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active'));
    dropdownButton.classList.remove('tab-active');

    if (mainTabs.includes(tabIdToShow)) {
        document.getElementById(`tab-${tabIdToShow}`).classList.add('tab-active');
        dropdownButton.querySelector('span').textContent = window.translations[state.currentLang].menuMore;
    } else {
        dropdownButton.classList.add('tab-active');
        const key = `menu${tabIdToShow.charAt(0).toUpperCase() + tabIdToShow.slice(1)}`;
        dropdownButton.querySelector('span').textContent = window.translations[state.currentLang][key];
    }

    // Tartalmi részek elrejtése/megjelenítése
    TABS.forEach(tabId => {
        const content = document.getElementById(`content-${tabId}`);
        if (content) {
            content.classList.toggle('hidden', tabId !== tabIdToShow);
        }
    });

    // Függvényspecifikus inicializálók/renderelők hívása
    switch (tabIdToShow) {
        case 'full-day': loadLastValues(); break;
        case 'list': renderRecords(); break;
        case 'summary': renderSummary(); break;
        case 'stats': renderStats(); break;
        case 'report': initMonthlyReport(); break;
        case 'tachograph': renderTachographAnalysis(); break;
        case 'pallets': renderPalletRecords(); break;
    }
    
    closeDropdown();
}

/**
 * A teljes alkalmazás újrarajzolása az aktuális állapot alapján.
 * Ez a függvény felelős azért, hogy adatváltozás vagy nyelvváltás után minden frissüljön.
 */
export function renderApp() {
    // Itt hívjuk meg azokat a renderelő függvényeket, amiknek mindig frissülniük kell.
    renderLiveTabView();
    renderRecords();
    renderPalletRecords();
    // A többi nézet renderelése akkor történik, amikor a felhasználó odalép (`showTab`).
}

/**
 * A navigációs elemek eseménykezelőinek beállítása.
 */
export function initializeNavigation() {
    // Fő fülek
    document.getElementById('tab-live').addEventListener('click', () => showTab('live'));
    document.getElementById('tab-full-day').addEventListener('click', () => showTab('full-day'));
    document.getElementById('tab-list').addEventListener('click', () => showTab('list'));
    document.getElementById('tab-pallets').addEventListener('click', () => showTab('pallets'));
    
    // Lenyíló menü
    document.getElementById('dropdown-button').addEventListener('click', (e) => {
        e.stopPropagation(); // Megakadályozza, hogy a document-re tett click bezárja
        document.getElementById('dropdown-menu').classList.toggle('hidden');
    });

    // Lenyíló menü elemei
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => showTab(item.dataset.tab));
    });

    // Bárhova kattintva bezáródik a menü
    document.addEventListener('click', () => closeDropdown());
}