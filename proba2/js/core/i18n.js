// Internationalization Core Module v9.00
class I18nManager {
    constructor() {
        this.translations = {
            hu: HU_TRANSLATIONS,
            de: DE_TRANSLATIONS
        };
        this.currentLang = this.getStoredLanguage();
        this.init();
    }

    getStoredLanguage() {
        const stored = localStorage.getItem('language');
        if (stored && this.translations[stored]) {
            return stored;
        }
        // Auto-detect based on browser language
        return navigator.language.startsWith('de') ? 'de' : 'hu';
    }

    init() {
        document.documentElement.lang = this.currentLang;
        this.updateAllTexts();
    }

    setLanguage(lang) {
        if (!this.translations[lang]) {
            console.warn(`Language "${lang}" not supported`);
            return false;
        }
        
        this.currentLang = lang;
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang;
        this.updateAllTexts();
        this.updateLanguageButtonStyles();
        
        // Trigger custom event for language change
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lang } 
        }));
        
        return true;
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    translate(key) {
        const translation = this.translations[this.currentLang][key];
        if (translation === undefined) {
            console.warn(`Translation key "${key}" not found for language "${this.currentLang}"`);
            return key; // Return key as fallback
        }
        return translation;
    }

    updateAllTexts() {
        const elements = document.querySelectorAll('[data-translate-key]');
        elements.forEach(el => {
            const key = el.dataset.translateKey;
            const translation = this.translate(key);
            
            if (el.placeholder !== undefined) {
                el.placeholder = translation;
            } else if (el.title && (el.tagName === 'BUTTON' || el.tagName === 'A')) {
                el.title = translation;
            } else {
                el.textContent = translation;
            }
        });

        // Update document title
        document.title = this.translate('appTitle');
        
        // Handle special cases for German language
        this.handleLanguageSpecificElements();
    }

    handleLanguageSpecificElements() {
        const compensationSectionDe = document.getElementById('compensation-section-de');
        if (compensationSectionDe) {
            compensationSectionDe.style.display = this.currentLang === 'de' ? 'none' : 'block';
        }
        
        const compensationToggle = document.getElementById('toggleCompensation');
        if (compensationToggle && compensationToggle.parentElement && compensationToggle.parentElement.parentElement) {
            compensationToggle.parentElement.parentElement.style.display = this.currentLang === 'de' ? 'none' : 'flex';
        }
    }

    updateLanguageButtonStyles() {
        const selector = document.getElementById('languageSelector');
        if (!selector) return;

        const buttons = selector.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.classList.remove('bg-blue-100', 'border-blue-500', 'font-bold');
            
            const isHungarian = this.currentLang === 'hu' && btn.innerText.includes('Magyar');
            const isGerman = this.currentLang === 'de' && btn.innerText.includes('Deutsch');
            
            if (isHungarian || isGerman) {
                btn.classList.add('bg-blue-100', 'border-blue-500', 'font-bold');
            }
        });
    }

    // Utility method to get localized date format
    getDateLocale() {
        return this.currentLang === 'de' ? 'de-DE' : 'hu-HU';
    }

    // Utility method to get month names for charts
    getMonthNames() {
        return this.translations[this.currentLang].chartMonths;
    }
}

// Global instance
window.i18n = new I18nManager();
