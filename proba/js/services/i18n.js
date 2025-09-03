// js/services/i18n.js - TELJES JAVÍTOTT VERZIÓ
import { state } from '../state.js';
import { renderApp } from '../ui/navigation.js';

let fallbackTranslations = {};

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
        console.log(`🔍 Fordítási fájl betöltése: ${lang}.json`);
        const response = await fetch(`js/data/locales/${lang}.json`);
        if (!response.ok) {
            console.error(`❌ HTTP hiba ${response.status}: A ${lang}.json nem található.`);
            throw new Error(`HTTP ${response.status}`);
        }
        const translations = await response.json();
        console.log(`✅ ${lang} betöltve:`, Object.keys(translations).length, 'kulcs');
        
        // DEBUG: Kiírjuk az első 10 kulcsot
        console.log('📋 Első fordítások:', Object.keys(translations).slice(0, 10).map(k => `${k}: ${translations[k]}`));
        
        return translations;
    } catch (error) {
        console.error(`❌ Hiba a ${lang}.json betöltésekor:`, error);
        return {};
    }
}

export function updateAllTexts() {
    const currentTranslations = window.translations;
    if (!currentTranslations || Object.keys(currentTranslations).length === 0) {
        console.warn('⚠️ Nincs elérhető fordítás!');
        return;
    }

    console.log('🔄 Szövegek frissítése kezdődik...', Object.keys(currentTranslations).length, 'fordítási kulcs elérhető');

    // Dokumentum címének frissítése
    document.title = currentTranslations.appTitle || fallbackTranslations.appTitle || 'Munkaidő Pro';

    // KRITIKUS: Várjunk a DOM renderelésre, majd frissítsük a szövegeket
    setTimeout(() => {
        let updatedCount = 0;
        let notFoundKeys = [];
        
        // Minden data-translate-key attribútummal rendelkező elem megkeresése
        const elementsToTranslate = document.querySelectorAll('[data-translate-key]');
        console.log(`🎯 ${elementsToTranslate.length} fordítandó elem találva`);
        
        elementsToTranslate.forEach((el, index) => {
            const key = el.dataset.translateKey;
            const translation = currentTranslations[key] || fallbackTranslations[key];
            
            if (!translation) {
                notFoundKeys.push(key);
                console.warn(`🔑 Hiányzó fordítási kulcs: "${key}"`);
                return;
            }
            
            // Különböző elem típusok kezelése
            try {
                if (el.placeholder !== undefined && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
                    el.placeholder = translation;
                } else if (el.title !== undefined) {
                    el.title = translation;
                } else {
                    // Span elemek keresése (gomboknál gyakori)
                    const span = el.querySelector('span');
                    if (span) {
                        span.textContent = translation;
                    } else if (el.children.length === 0) {
                        // Ha nincs gyerek elem, közvetlenül frissítjük
                        el.textContent = translation;
                    } else {
                        // Komplex elemek esetén próbáljuk megtalálni a szöveges részt
                        const textNode = Array.from(el.childNodes).find(node => 
                            node.nodeType === 3 && node.textContent.trim().length > 0
                        );
                        if (textNode) {
                            textNode.textContent = translation;
                        } else {
                            // Utolsó esély: innerHTML használata (óvatosan)
                            const innerHTML = el.innerHTML;
                            if (innerHTML.includes('>') && innerHTML.includes('<')) {
                                // Ha van HTML tartalom, csak a span-okat cseréljük
                                const spans = el.querySelectorAll('span');
                                if (spans.length === 1) {
                                    spans[0].textContent = translation;
                                }
                            } else {
                                el.textContent = translation;
                            }
                        }
                    }
                }
                updatedCount++;
                
                // DEBUG: Részletes logolás az első 5 elemről
                if (index < 5) {
                    console.log(`🔄 [${index}] "${key}" → "${translation}" (${el.tagName})`);
                }
                
            } catch (error) {
                console.error(`❌ Hiba a(z) "${key}" kulcs frissítésekor:`, error);
            }
        });
        
        console.log(`✅ ${updatedCount} elem frissítve, ${notFoundKeys.length} kulcs hiányzik`);
        
        if (notFoundKeys.length > 0) {
            console.warn('🔍 Hiányzó kulcsok:', notFoundKeys.slice(0, 10));
        }
        
        updateLanguageButtonStyles();
        
        // EXTRA: Kényszerített újra-renderelés a navigációs elemekre
        setTimeout(() => {
            renderApp();
        }, 100);
        
    }, 50);
}

export async function setLanguage(lang) {
    console.log(`🌐 Nyelv váltás kezdeményezve: ${state.currentLang} → ${lang}`);
    
    state.currentLang = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    
    await loadAndSetTranslations(lang);
    
    // TRIPLA BIZTOSÍTÁS: Több renderelési ciklus különböző késleltetéssel
    console.log('🔄 DOM frissítések indítása...');
    
    renderApp();
    updateAllTexts();
    
    setTimeout(() => {
        console.log('🔄 Második frissítési kör...');
        renderApp();
        updateAllTexts();
    }, 150);
    
    setTimeout(() => {
        console.log('🔄 Harmadik frissítési kör...');
        updateAllTexts();
    }, 300);
    
    setTimeout(() => {
        console.log('🔄 Végső frissítés...');
        updateAllTexts();
    }, 500);
    
    console.log(`✅ Nyelv sikeresen váltva: ${lang}`);
}

async function loadAndSetTranslations(lang) {
    console.log(`📚 Fordítások betöltése: ${lang}`);
    
    if (lang === 'en') {
        window.translations = fallbackTranslations;
        console.log('🇬🇧 Angol fordítások beállítva (fallback)');
    } else {
        const translations = await fetchTranslations(lang);
        if (Object.keys(translations).length > 0) {
            window.translations = translations;
            console.log(`🇩🇪 ${lang} fordítások sikeresen beállítva`);
        } else {
            console.warn(`⚠️ ${lang} fordítások betöltése sikertelen, angol használata`);
            window.translations = fallbackTranslations;
        }
    }
    
    // DEBUG: Kiírjuk néhány fontos kulcs értékét
    const testKeys = ['appTitle', 'tabOverview', 'tabList', 'workdayInProgress', 'finishShift'];
    console.log('🧪 Teszt kulcsok:', testKeys.map(k => `${k}: ${window.translations[k] || 'HIÁNYZIK'}`));
}

export async function initializei18n() {
    console.log('🚀 i18n inicializálás kezdődik...');
    
    // Angol fordítások betöltése fallback-ként
    fallbackTranslations = await fetchTranslations('en');
    console.log('🇬🇧 Fallback fordítások betöltve:', Object.keys(fallbackTranslations).length, 'kulcs');
    
    // Aktuális nyelv fordításainak betöltése
    await loadAndSetTranslations(state.currentLang);
    
    // Kezdeti szövegek frissítése
    updateAllTexts();
    
    console.log('✅ i18n inicializálás befejezve');
}
