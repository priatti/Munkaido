// GuriGO - Translation System
// v5.03.11
// Translations are now loaded from separate language files in js/config/i18n/

// Placeholder object - will be populated by language files
window.translations = {
    hu: window.translations_hu || {},
    de: window.translations_de || {},
    en: window.translations_en || {},
    ro: window.translations_ro || {},
    pl: window.translations_pl || {},
    da: window.translations_da || {},
    no: window.translations_no || {}
};

// Language files will populate window.translations_hu, _de, _en, _ro, _pl
// After language files load, rebuild the translations object
function rebuildTranslations() {
    window.translations = {
        hu: window.translations_hu || {},
        de: window.translations_de || {},
        en: window.translations_en || {},
        ro: window.translations_ro || {},
        pl: window.translations_pl || {},
        da: window.translations_da || {},
        no: window.translations_no || {}
    };
}

// Expose rebuild function globally
window.rebuildTranslations = rebuildTranslations;

// JAVÍTÁS: currentLang inicializálása itt történik, AZONNAL a translations betöltése után
const supportedLanguages = ['hu', 'de', 'en', 'ro', 'pl', 'da', 'no'];
const fallbackLang = 'hu';
let currentLang = localStorage.getItem('language');
if (!currentLang) {
    const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (browserLang.startsWith('de')) currentLang = 'de';
    else if (browserLang.startsWith('en')) currentLang = 'en';
    else if (browserLang.startsWith('ro')) currentLang = 'ro';
    else if (browserLang.startsWith('pl')) currentLang = 'pl';
    else if (browserLang.startsWith('da')) currentLang = 'da';
    else if (browserLang.startsWith('nb') || browserLang.startsWith('no') || browserLang.startsWith('nn')) currentLang = 'no';
}
if (!supportedLanguages.includes(currentLang)) {
    currentLang = fallbackLang;
}

// BIZTONSÁGI ELLENŐRZÉS: Ha a currentLang még mindig undefined lenne
if (typeof currentLang === 'undefined' || !currentLang) {
    currentLang = fallbackLang; // alapértelmezett magyar
}

// Tükrözzük az aktuális UI-nyelvet a globális window.currentLang-ben is
if (typeof window !== 'undefined') {
    window.currentLang = currentLang;
}

// Firebase Auth nyelvének szinkronizálása a GuriGO UI nyelvére
function syncFirebaseAuthLanguageWithCurrentLang() {
    try {
        if (typeof firebase === 'undefined' || !firebase.auth) return;

        var uiLang = fallbackLang;
        if (typeof window !== 'undefined' && supportedLanguages.includes(window.currentLang)) {
            uiLang = window.currentLang;
        }

        firebase.auth().languageCode = uiLang;
    } catch (e) {
        try { console.warn('[Auth] Failed to sync Firebase auth language', e); } catch (_) {}
    }
}

// Első szinkronizálás betöltéskor (app initkor) – mindig explicit a GuriGO választott nyelve alapján
try { syncFirebaseAuthLanguageWithCurrentLang(); } catch (_) {}

function applyLanguage(lang) {
    currentLang = lang;
    if (typeof window !== 'undefined') {
        window.currentLang = currentLang;
    }
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    updateAllTexts();
    if (typeof uploadLocalSettings === 'function') {
        try { uploadLocalSettings(); } catch (_) {}
    }
    if (typeof syncFirebaseAuthLanguageWithCurrentLang === 'function') {
        try { syncFirebaseAuthLanguageWithCurrentLang(); } catch (_) {}
    }
    try {
        if (typeof window.refreshWhatsNewUnreadDots === 'function') {
            window.refreshWhatsNewUnreadDots();
        }
    } catch (_) {}
    if (typeof window.renderHeaderDateChip === 'function') {
        try { window.renderHeaderDateChip(); } catch (_) {}
    }
}

function setLanguage(lang) {
    if (!supportedLanguages.includes(lang)) return;

    function done() {
        applyLanguage(lang);
    }

    // Lazy i18n: load language pack on demand (Phase 1 only ships the active lang)
    if (typeof window.ensureI18nLang === 'function') {
        window.ensureI18nLang(lang).then(done).catch(function (err) {
            console.warn('[i18n] ensureI18nLang failed:', lang, err);
            done();
        });
        return;
    }
    done();
}
window.applyLanguage = applyLanguage;

function updateAllTexts() {
    try {
        var i18n = (typeof translations !== 'undefined' && translations && typeof currentLang !== 'undefined')
            ? (translations[currentLang] || translations[fallbackLang] || {})
            : {};
    } catch (_) {
        var i18n = {};
    }
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        try {
            const key = el.dataset.translateKey;
            const translation = i18n[key];
            if (translation !== undefined) {
                if (el.placeholder) {
                    el.placeholder = translation;
                } else if (el.title && (el.tagName === 'BUTTON' || el.tagName === 'A')) {
                    el.title = translation;
                } else {
                    el.innerHTML = typeof translation === 'string' ? translation : String(translation);
                }
            }
        } catch (err) {
            console.warn('[updateAllTexts] element failed:', (el.dataset && el.dataset.translateKey) || key, err && err.message);
        }
    });

    document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
        const key = el.dataset.translatePlaceholder;
        const translation = i18n[key];
        if (translation !== undefined) {
            el.placeholder = translation;
        }
    });

    try {
        if (i18n && i18n.appTitle) document.title = i18n.appTitle;
        if (typeof updateLanguageButtonStyles === 'function') updateLanguageButtonStyles();
        if (typeof window.refreshTermsConsentVersionInfo === 'function') {
            window.refreshTermsConsentVersionInfo();
        }
        if (typeof window.updateFuelingMenuLabels === 'function') {
            window.updateFuelingMenuLabels();
        }
        if (typeof window.renderHeaderDateChip === 'function') {
            try { window.renderHeaderDateChip(); } catch (_) {}
        }
        const listTab = document.getElementById('content-list');
        if (listTab && !listTab.classList.contains('hidden') && typeof renderRecords === 'function') {
            renderRecords();
        }
        const fuelingTab = document.getElementById('content-fueling');
        if (fuelingTab && !fuelingTab.classList.contains('hidden') && typeof renderFuelingTab === 'function') {
            renderFuelingTab(false);
        }
        updateAuthPublicLinks();
    } catch (err) {
        console.warn('[updateAllTexts]', err && err.message);
    }
}

function updateAuthPublicLinks() {
    var lang = (typeof currentLang === 'string' && currentLang) ? currentLang : 'hu';
    var landingByLang = {
        hu: '/landing/',
        de: '/landing-de/',
        en: '/what-is-gurigo-en/',
        pl: '/landing-pl/',
        ro: '/landing-ro/',
        da: '/landing-dk/',
        no: '/landing-no/'
    };
    var legalByLang = { hu: 'hu', de: 'de', en: 'en', pl: 'pl', ro: 'ro', da: 'da', no: 'no' };
    var legalLang = legalByLang[lang] || 'hu';
    var discover = document.getElementById('auth-link-discover');
    var privacy = document.getElementById('auth-link-privacy');
    var terms = document.getElementById('auth-link-terms');
    if (discover) discover.setAttribute('href', landingByLang[lang] || '/landing/');
    if (privacy) privacy.setAttribute('href', '/legal/privacy-' + legalLang + '.html');
    if (terms) terms.setAttribute('href', '/legal/terms-' + legalLang + '.html');
}

function updateLanguageButtonStyles() {
    // Beállítások nyelvválasztó
    const selector = document.getElementById('languageSelector');
    if (selector) {
        const buttons = selector.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');

            const btnLang = btn.dataset.lang;
            if (btnLang === currentLang) {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            }
        });
    }

    // Bejelentkezési oldal nyelvválasztó
    const selectorAuth = document.getElementById('languageSelectorAuth');
    if (selectorAuth) {
        const buttons = selectorAuth.querySelectorAll('button');
        buttons.forEach(btn => {
            const btnLang = btn.dataset.lang;
            if (btnLang === currentLang) {
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-pressed', 'false');
            }
        });
    }
}

// GLOBÁLIS HOZZÁFÉRHETŐSÉG BIZTOSÍTÁSA
window.currentLang = currentLang;
window.setLanguage = setLanguage;
window.updateAllTexts = updateAllTexts;
window.updateLanguageButtonStyles = updateLanguageButtonStyles;
window.syncFirebaseAuthLanguageWithCurrentLang = syncFirebaseAuthLanguageWithCurrentLang;