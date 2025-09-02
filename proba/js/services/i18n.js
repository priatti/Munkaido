import { state } from '../state.js';
import { renderApp } from '../ui/navigation.js';

let fallbackTranslations = {}; // Az angol, mint végső mentsvár

/**
 * Betölt egy adott nyelvi JSON fájlt.
 * @param {string} lang - A nyelv kódja (pl. 'hu').
 * @returns {Promise<object>} A fordítási objektum.
 */
async function fetchTranslations(lang) {
    try {
        const response = await fetch(`js/data/locales/${lang}.json`);
        if (!response.ok) throw new Error(`A ${lang}.json nem található.`);
        return await response.json();
    } catch (error) {
        console.error(error);
        return {}; // Hiba esetén üres objektum
    }
}

/**
 * Frissíti az összes 'data-translate-key' attribútummal rendelkező elem szövegét.
 */
export function updateAllTexts() {
    const currentTranslations = window.translations;
    if (Object.keys(currentTranslations).length === 0) return;

    document.title = currentTranslations.appTitle || fallbackTranslations.appTitle;

    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.dataset.translateKey;
        // Ha a fordítás hiányzik, az angol (fallback) verziót használjuk,
        // ha az is hiányzik, magát a kulcsot írjuk ki.
        const translation = currentTranslations[key] || fallbackTranslations[key] || `[${key}]`;
        
        if (el.placeholder !== undefined && el.tagName === 'INPUT') {
            el.placeholder = translation;
        } else if (el.title !== undefined && el.tagName === 'BUTTON') {
             el.title = translation;
        } else {
            // Megkeressük a közvetlen szöveges gyermeket, hogy ne írjuk felül az ikonokat (pl. 📊)
            const textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0);
            if (textNode) {
                textNode.textContent = ` ${translation}`; // szóköz az ikon miatt
            } else if (el.firstElementChild && el.firstElementChild.tagName === 'SPAN') {
                 el.firstElementChild.textContent = translation;
            } else {
                el.textContent = translation;
            }
        }
    });
}

/**
 * Beállítja az új nyelvet, betölti a fordításokat és frissíti a teljes UI-t.
 * @param {string} lang - A beállítandó nyelv kódja.
 */
export async function setLanguage(lang) {
    state.currentLang = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;

    await loadAndSetTranslations(lang);
    
    // Az app újrarajzolása az új nyelvi adatokkal
    renderApp();
}

/**
 * Betölti a nyelvi fájlt és beállítja a globális fordítási objektumot.
 * @param {string} lang 
 */
async function loadAndSetTranslations(lang) {
    if (lang === 'en') {
        window.translations = fallbackTranslations;
    } else {
        window.translations = await fetchTranslations(lang);
    }
}

/**
 * Inicializálja a nyelvi rendszert, betölti az alap (angol) és a kiválasztott nyelvet.
 */
export async function initializei18n() {
    // Mindig betöltjük az angolt, mint végső fallback
    fallbackTranslations = await fetchTranslations('en');
    await loadAndSetTranslations(state.currentLang);
    updateAllTexts();
}