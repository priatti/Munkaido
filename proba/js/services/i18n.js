// js/services/i18n.js - VÉGSŐ VERZIÓ minden szöveggel
import { state } from '../state.js';
import { renderApp } from '../ui/navigation.js';

let fallbackTranslations = {};

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

    // Dokumentum címének frissítése
    document.title = currentTranslations.appTitle || fallbackTranslations.appTitle || 'Munkaidő Pro';
    
    // FŐ CÍM frissítése a header-ben
    const mainTitle = document.querySelector('h1[data-translate-key="appTitle"]');
    if (mainTitle) {
        mainTitle.textContent = currentTranslations.appTitle || 'Munkaidő Nyilvántartó Pro';
    }

    setTimeout(() => {
        let updatedCount = 0;
        
        // Minden data-translate-key elem frissítése
        document.querySelectorAll('[data-translate-key]').forEach((el) => {
            const key = el.dataset.translateKey;
            const translation = currentTranslations[key] || fallbackTranslations[key];
            
            if (!translation) return;
            
            try {
                if (el.placeholder !== undefined && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                    el.placeholder = translation;
                } else if (el.title !== undefined) {
                    el.title = translation;
                } else {
                    const span = el.querySelector('span');
                    if (span) {
                        span.textContent = translation;
                    } else if (el.children.length === 0) {
                        el.textContent = translation;
                    } else {
                        // Komplex elemek kezelése
                        const textNode = Array.from(el.childNodes).find(node => 
                            node.nodeType === 3 && node.textContent.trim().length > 0
                        );
                        if (textNode) {
                            textNode.textContent = translation;
                        } else {
                            const spans = el.querySelectorAll('span');
                            if (spans.length === 1) {
                                spans[0].textContent = translation;
                            }
                        }
                    }
                }
                updatedCount++;
            } catch (error) {
                console.error(`Hiba a "${key}" kulcs frissítésekor:`, error);
            }
        });
        
        // EXTRA: Speciális elemek keresése és frissítése CSS szelektorokkal
        updateSpecialElements(currentTranslations);
        
        updateLanguageButtonStyles();
        console.log(`✅ ${updatedCount} statikus elem frissítve`);
        
    }, 50);
}

/**
 * Speciális, dinamikusan generált elemek frissítése
 */
function updateSpecialElements(translations) {
    // "Munkanap folyamatban" szöveg keresése és cseréje
    const progressElements = document.querySelectorAll('.font-bold');
    progressElements.forEach(el => {
        if (el.textContent.includes('folyamatban')) {
            el.textContent = translations.workdayInProgress || 'Munkanap folyamatban';
        }
    });
    
    // Egyéb dinamikus szövegek
    const elementsToUpdate = [
        { selector: '.text-indigo-800', contains: 'Határátlépés', key: 'newBorderCrossing' },
        { selector: '.bg-blue-100 .font-bold', contains: 'folyamatban', key: 'workdayInProgress' }
    ];
    
    elementsToUpdate.forEach(item => {
        const elements = document.querySelectorAll(item.selector);
        elements.forEach(el => {
            if (el.textContent.includes(item.contains)) {
                el.textContent = translations[item.key] || el.textContent;
            }
        });
    });
    
    console.log('🔄 Speciális elemek frissítve');
}

export async function setLanguage(lang) {
    console.log(`🌐 Nyelv váltás: ${state.currentLang} → ${lang}`);
    
    state.currentLang = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    
    await loadAndSetTranslations(lang);
    
    // NÉGYSZERES BIZTOSÍTÁS különböző időzítésekkel
    renderApp();
    updateAllTexts();
    
    setTimeout(() => {
        renderApp();
        updateAllTexts();
    }, 100);
    
    setTimeout(() => {
        updateAllTexts();
    }, 250);
    
    setTimeout(() => {
        updateAllTexts();
        // EXTRA: Kényszerített frissítés az összes elemre
        const event = new Event('languageChanged');
        document.dispatchEvent(event);
    }, 500);
    
    console.log(`✅ Nyelv váltás befejezve: ${lang}`);
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
    
    // Nyelv változás eseményre figyelés
    document.addEventListener('languageChanged', updateAllTexts);
}
