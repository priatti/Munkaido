// Meghatározza az alapértelmezett nyelvet a böngésző vagy a korábbi beállítás alapján
function getDefaultLanguage() {
    const browserLang = navigator.language.slice(0, 2);
    if (['hu', 'de'].includes(browserLang)) {
        return browserLang;
    }
    return 'en'; // Alapértelmezett nyelv az angol
}

// A központi állapot objektum, ami minden megosztott adatot tárol
export let state = {
    records: [],
    palletRecords: [],
    currentUser: null,
    editingId: null,
    inProgressEntry: JSON.parse(localStorage.getItem('inProgressEntry') || 'null'),
    uniqueLocations: [],
    uniquePalletLocations: [],
    stats: {
        view: 'daily',
        date: new Date(),
        charts: {},
    },
    currentLang: localStorage.getItem('language') || getDefaultLanguage(),
};

// Állapotot módosító segédfüggvények, hogy a változások
// követhetőek és egy helyen kezeltek legyenek.

export function setCurrentUser(user) {
    state.currentUser = user;
}

export function setRecords(newRecords) {
    state.records = newRecords;
}

export function setPalletRecords(newPalletRecords) {
    state.palletRecords = newPalletRecords;
}

export function setInProgressEntry(entry) {
    state.inProgressEntry = entry;
    if (entry) {
        localStorage.setItem('inProgressEntry', JSON.stringify(entry));
    } else {
        localStorage.removeItem('inProgressEntry');
    }
}