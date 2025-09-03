// js/services/i18n.js
import { state } from '../state.js';
import { renderApp } from '../ui/navigation.js';

let fallbackTranslations = {}; // Az angol, mint végső mentsvár

/**
 * Frissíti a nyelvválasztó gombok stílusát.
 */
function updateLanguageButtonStyles() {
    const selector = document.getElementById('languageSelector');
    if (selector) {
        const buttons = selector.querySelectorAll('.lang-btn');
        buttons.forEach(btn => {
            btn.classList.remove('bg-blue-100', 'dark:bg-blue-800', 'border-blue-500', 'font-bold');
            if (state.currentLang === btn.dataset.lang) {
                btn.classList.add('bg-blue-100', 'dark:bg-blue-800', 'border-blue-500', 'font-bold');
            }
        });
    }
}

async function fetchTranslations(lang) {
    try {
        console.log(`Fordítási fájl betöltése: ${lang}.json`);
        const response = await fetch(`js/data/locales/${lang}.json`);
        if (!response.ok) {
            console.error(`HTTP hiba ${response.status}: A ${lang}.json nem található.`);
            throw new Error(`HTTP ${response.status}`);
        }
        const translations = await response.json();
        console.log(`Sikeresen betöltve ${lang}:`, Object.keys(translations).length, 'kulcs');
        return translations;
    } catch (error) {
        console.error(`Hiba a ${lang}.json betöltésekor:`, error);
        return {};
    }
}

export function updateAllTexts() {
    const currentTranslations = window.translations;
    if (!currentTranslations || Object.keys(currentTranslations).length === 0) {
        console.warn('Nincs elérhető fordítás!');
        return;
    }

    console.log('Szövegek frissítése...', Object.keys(currentTranslations).length, 'fordítási kulcs');

    document.title = currentTranslations.appTitle || fallbackTranslations.appTitle || 'Munkaidő Pro';

    let updatedCount = 0;
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.dataset.translateKey;
        const translation = currentTranslations[key] || fallbackTranslations[key] || `[${key}]`;
        
        if (el.placeholder !== undefined && el.tagName === 'INPUT') {
            el.placeholder = translation;
        } else if (el.title !== undefined) {
            el.title = translation;
        } else {
            const span = el.querySelector('span');
            if (span) {
                span.textContent = translation;
            } else {
                el.textContent = translation;
            }
        }
        updatedCount++;
    });

    console.log(`${updatedCount} elem szövege frissítve.`);
    updateLanguageButtonStyles();
}

export async function setLanguage(lang) {
    console.log(`Nyelv váltás kezdeményezve: ${lang}`);
    
    state.currentLang = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    
    await loadAndSetTranslations(lang);
    
    // DUPLA RENDERELÉS BIZTOSÍTÁSA
    renderApp();
    updateAllTexts();
    
    // EXTRA: Késleltetett újra-renderelés esetleges aszinkron problémák elkerüléséhez
    setTimeout(() => {
        updateAllTexts();
    }, 100);
    
    console.log(`Nyelv sikeresen váltva: ${lang}`);
}

async function loadAndSetTranslations(lang) {
    console.log(`Fordítások betöltése: ${lang}`);
    
    if (lang === 'en') {
        window.translations = fallbackTranslations;
        console.log('Angol fordítások beállítva (fallback)');
    } else {
        const translations = await fetchTranslations(lang);
        if (Object.keys(translations).length > 0) {
            window.translations = translations;
            console.log(`${lang} fordítások sikeresen beállítva`);
        } else {
            console.warn(`${lang} fordítások betöltése sikertelen, angol használata`);
            window.translations = fallbackTranslations;
        }
    }
    
    console.log('Aktuális fordítások:', window.translations ? Object.keys(window.translations).length : 0, 'kulcs');
}

export async function initializei18n() {
    console.log('i18n inicializálás...');
    
    // Angol fordítások betöltése fallback-ként
    fallbackTranslations = await fetchTranslations('en');
    console.log('Fallback fordítások betöltve:', Object.keys(fallbackTranslations).length, 'kulcs');
    
    // Aktuális nyelv fordításainak betöltése
    await loadAndSetTranslations(state.currentLang);
    
    // Kezdeti szövegek frissítése
    updateAllTexts();
    
    console.log('i18n inicializálás befejezve');
}
