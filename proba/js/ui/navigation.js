// js/ui/navigation.js - JAVÍTOTT VERZIÓ dinamikus fordításokkal
import { state } from '../state.js';
import { renderLiveTabView } from './liveView.js';
import { renderRecords } from './listView.js';
import { renderSummary } from './summaryView.js';
import { renderStats } from './statsView.js';
import { renderTachographAnalysis } from './tachographView.js';
import { renderPalletRecords } from './palletsView.js';
import { initMonthlyReport } from './reportView.js';
import { loadLastValues } from './fullDayView.js';
import { closeDropdown } from '../utils/domHelpers.js';

const TABS = ['live', 'full-day', 'list', 'pallets', 'summary', 'stats', 'tachograph', 'report', 'settings'];

/**
 * JAVÍTÁS: Frissíti a TAB szövegeket dinamikusan a jelenlegi nyelv alapján
 */
function updateTabTexts() {
    const i18n = window.translations;
    if (!i18n) return;
    
    // Fő fülszövegek frissítése
    const tabTexts = {
        'tab-live': i18n.tabOverview || 'Áttekintés',
        'tab-full-day': i18n.tabFullDay || 'Teljes nap', 
        'tab-list': i18n.tabList || 'Lista',
        'tab-pallets': i18n.tabPallets || 'Raklapok'
    };
    
    Object.keys(tabTexts).forEach(tabId => {
        const tab = document.getElementById(tabId);
        if (tab) {
            const span = tab.querySelector('span');
            if (span) {
                span.textContent = tabTexts[tabId];
            }
        }
    });
    
    // "Továbbiak" gomb frissítése
    const dropdownBtn = document.getElementById('dropdown-button');
    if (dropdownBtn) {
        const span = dropdownBtn.querySelector('span');
        if (span && span.textContent.includes('Továbbiak')) {
            span.textContent = i18n.menuMore || 'Továbbiak';
        }
    }
    
    console.log('🔄 Navigációs fülszövegek frissítve');
}

/**
 * Megjelenít egy adott fület és elrejti a többit.
 * @param {string} tabIdToShow - A megjelenítendő fül ID-ja.
 */
export function showTab(tabIdToShow) {
    const mainTabs = ['live', 'full-day', 'list', 'pallets'];
    const dropdownButton = document.getElementById('dropdown-button');
    const i18n = window.translations;

    if (!i18n) return;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active'));
    dropdownButton.classList.remove('tab-active');

    if (mainTabs.includes(tabIdToShow)) {
        document.getElementById(`tab-${tabIdToShow}`).classList.add('tab-active');
        const dropdownSpan = dropdownButton.querySelector('span');
        if (dropdownSpan) {
            dropdownSpan.textContent = i18n.menuMore || 'Továbbiak';
        }
    } else {
        dropdownButton.classList.add('tab-active');
        const key = `menu${tabIdToShow.charAt(0).toUpperCase() + tabIdToShow.slice(1)}`;
        const dropdownSpan = dropdownButton.querySelector('span');
        if (dropdownSpan) {
            dropdownSpan.textContent = i18n[key] || dropdownSpan.textContent;
        }
    }

    TABS.forEach(tabId => {
        const content = document.getElementById(`content-${tabId}`);
        if (content) {
            content.classList.toggle('hidden', tabId !== tabIdToShow);
        }
    });

    // Függvényspecifikus renderelők hívása fülváltáskor
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
 */
export function renderApp() {
    // JAVÍTÁS: Tab szövegek frissítése minden rendereléskor
    updateTabTexts();
    
    renderLiveTabView();
    renderRecords();
    renderPalletRecords();
}

/**
 * A navigációs elemek eseménykezelőinek beállítása.
 */
export function initializeNavigation() {
    document.getElementById('tab-live').addEventListener('click', () => showTab('live'));
    document.getElementById('tab-full-day').addEventListener('click', () => showTab('full-day'));
    document.getElementById('tab-list').addEventListener('click', () => showTab('list'));
    document.getElementById('tab-pallets').addEventListener('click', () => showTab('pallets'));
    
    document.getElementById('dropdown-button').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('dropdown-menu').classList.toggle('hidden');
    });

    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', () => showTab(item.dataset.tab));
    });

    document.addEventListener('click', (e) => {
        if (!document.getElementById('dropdown-container').contains(e.target)) {
            closeDropdown();
        }
    });
}
