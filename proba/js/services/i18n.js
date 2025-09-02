import { state } from '../state.js';
import { renderApp } from '../ui/navigation.js';

let fallbackTranslations = {}; // Az angol, mint végső mentsvár

/**
 * ÚJ FUNKCIÓ: Frissíti a nyelvválasztó gombok stílusát.
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
        const response = await fetch(`js/data/locales/${lang}.json`);
        if (!response.ok) throw new Error(`A ${lang}.json nem található.`);
        return await response.json();
    } catch (error) {
        console.error(error);
        return {};
    }
}

export function updateAllTexts() {
    const currentTranslations = window.translations;
    if (!currentTranslations || Object.keys(currentTranslations).length === 0) return;

    document.title = currentTranslations.appTitle || fallbackTranslations.appTitle;

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
    });

    // BIZTOSÍTJA, HOGY A GOMBOK STÍLUSA IS FRISSÜLJÖN
    updateLanguageButtonStyles();
}

export async function setLanguage(lang) {
    state.currentLang = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    await loadAndSetTranslations(lang);
    
    // A renderApp() újrarajzolja a dinamikus részeket,
    // míg az updateAllTexts() a statikusakat
    renderApp();
    updateAllTexts();
}

async function loadAndSetTranslations(lang) {
    if (lang === 'en') {
        window.translations = fallbackTranslations;
    } else {
        window.translations = await fetchTranslations(lang);
    }
}

export async function initializei18n() {
    fallbackTranslations = await fetchTranslations('en');
    await loadAndSetTranslations(state.currentLang); 
    updateAllTexts();
}
