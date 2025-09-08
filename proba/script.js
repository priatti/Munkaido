const translations = {
    hu: {
        // Általános
        appTitle: "Munkaidő Nyilvántartó Pro",
        delete: "Törlés",
        ok: "Rendben",
        cancel: "Mégse",
        save: "Mentés",
        cityPlaceholder: "Város",
        fromPlaceholder: "Honnan",
        toPlaceholder: "Hova",
        // Fülek és menü
        tabOverview: "Áttekintés",
        tabFullDay: "Teljes nap",
        tabStart: "Indítás",
        tabList: "Lista",
        menuListDesc: "Mentett munkanapok",
        tabPallets: "Raklap",
        menuPalletsDesc: "Raklap egyenleg kezelése",
        menuMore: "Továbbiak",
        menuSummary: "Összesítő",
        menuSummaryDesc: "Napi, heti és havi adatok",
        menuStats: "Statisztika",
        menuStatsDesc: "Részletes, lapozható diagramok",
        menuTachograph: "Tachográf",
        menuTachographDesc: "Vezetési és pihenőidő elemzés",
        menuReport: "Riport",
        menuReportDesc: "Nyomtatható havi elszámolás",
        menuSettings: "Beállítások",
        menuSettingsDesc: "Adatmentés és személyes adatok",
        // Live nézet
        liveOverviewTitle: "Áttekintés",
        liveNewDayTitle: "Új munkanap indítása",
        date: "Dátum",
        time: "Idő",
        location: "Hely",
        weeklyDrive: "Heti vezetés",
        startKm: "Kezdő km",
        startWorkday: "Munkanap indítás",
        workdayInProgress: "Munkanap folyamatban",
        startedAt: "Elkezdve",
        newBorderCrossing: "Új Határátlépés",
        getCountryCodeGPS: "Országkód lekérése GPS alapján",
        addBorderCrossing: "Határátlépés hozzáadása",
        finishShift: "Műszak Befejezése",
        discardWorkday: "Munkanap elvetése",
        recordedCrossings: "Rögzített átlépések:",
        dashboardDriveThisWeek: "Vezetés ezen a héten",
        dashboardWorkThisWeek: "Munkaidő ezen a héten",
        dashboardDistanceThisMonth: "Távolság ebben a hónapban",
        dashboardDistanceLastWeek: "Múlt heti távolság",
        liveShiftDetailsTitle: "Műszak adatai",
        liveStartLocationLabel: "Kezdő hely:",
        liveStartDriveLabel: "Kezdő vezetés:",
        liveStartKmLabel: "Kezdő km:",
        // Teljes nap nézet
        fullDayTitle: "Teljes munkanap rögzítése",
        dateLabelFull: "Dátum (a munka befejezésének napja)",
        workTimeAndLocation: "Munkaidő és Helyszín",
        startTime: "Kezdés ideje",
        endTime: "Befejezés ideje",
        compensationLabel: "Kompenzáció / Szünet (levonódik)",
        startLocation: "Kezdés helye",
        endLocation: "Befejezés helye",
        getLocationGPS: "Helyszín lekérése GPS alapján",
        borderCrossings: "Határátlépések",
        addCrossing: "Új átlépés hozzáadása",
        weeklyDriveTimeHours: "Heti vezetési idő (óra)",
        atDayStart: "Nap elején (óó:pp)",
        atDayEnd: "Nap végén (óó:pp)",
        kmReading: "Kilométer állás",
        endKm: "Záró km",
        splitRestQuestion: "Volt 3+ órás egybefüggő pihenő? (Osztott)",
        saveEntry: "Bejegyzés Mentése",
        workTimeDisplay: "Munkaidő",
        nightWorkDisplay: "Éjszakai (20:00-05:00)",
        driveTimeTodayDisplay: "Mai vezetési idő",
        kmDrivenDisplay: "Megtett km",
        // Lista nézet
        listTitle: "Bejegyzések",
        noEntries: "Még nincsenek bejegyzések",
        entryDeparture: "Indulás",
        entryArrival: "Érkezés",
        entryWorkTime: "Munkaidő",
        entryCompensation: "Kompenzáció",
        entryNightTime: "Éjszakai",
        entryDriveTime: "Vezetés",
        entryDistance: "Távolság",
        entryCrossingsLabel: "Határátlépések",
        // Összesítő nézet
        summaryTitle: "Összesítések",
        summaryToday: "Ma",
        summaryYesterday: "Tegnap",
        summaryThisWeek: "Aktuális hét",
        summaryLastWeek: "Múlt hét",
        summaryThisMonth: "Aktuális hónap",
        summaryLastMonth: "Előző hónap",
        summaryDays: "nap",
        summaryWork: "Munka",
        summaryNight: "Éjszakai",
        summaryDrive: "Vezetés",
        summaryDistance: "Táv",
        summaryNoData: "Nincs adat",
        // Statisztika nézet
        statsTitle: "Részletes Statisztikák",
        statsDaily: "Napi",
        statsMonthly: "Havi",
        statsYearly: "Éves",
        statsWorkTime: "Munkaidő",
        statsDriveTime: "Vezetési idő",
        statsNightTime: "Éjszakai munka",
        statsKmDriven: "Megtett kilométer",
        statsNoDataPeriod: "Nincs adat a kiválasztott időszakban.",
        chartMonths: ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'],
        // Riport nézet
        reportTitle: "Havi riport",
        reportMonthSelect: "Hónap kiválasztása",
        reportGenerate: "Riport generálása",
        reportDownloadPDF: "PDF letöltés",
        reportSharePDF: "PDF megosztása",
        reportPrepared: "Riport előkészítve.",
        palletReportGenerate: "Raklap riport generálása",
        // Beállítások
        settingsTitle: "Beállítások és Adatkezelés",
        settingsSyncTitle: "Felhő Szinkronizáció",
        settingsSyncDesc: "Jelentkezz be a Google fiókoddal, hogy az adataidat a felhőbe mentsd és több eszközön is elérd.",
        settingsLoginGoogle: "Bejelentkezés Google-fiókkal",
        settingsLoggedInAs: "Bejelentkezve mint:",
        settingsLogout: "Kijelentkezés",
        settingsPersonalData: "Személyes adatok",
        settingsNameForReports: "Név (riportokhoz)",
        settingsNamePlaceholder: "Vezetéknév Keresztnév",
        settingsSaveData: "Adatok mentése",
        settingsAppearance: "Megjelenés",
        settingsLanguage: "Nyelv",
        settingsThemeSelect: "Válassz témát",
        settingsTheme: "Téma",
        settingsThemeAuto: "Automatikus",
        settingsThemeLight: "Nappali",
        settingsThemeDark: "Éjszakai",
        settingsSpecialFunctions: "Speciális funkciók",
        settingsFeatureKm: "Kilométer Nyilvántartás",
        settingsFeatureDriveTime: "Vezetési Idő Nyilvántartás",
        settingsFeaturePallets: "Raklap Nyilvántartás",
        settingsFeatureCompensation: "Szünet/Kompenzáció Levonása",
        settingsExportTitle: "Adatok exportálása (Backup)",
        settingsExportDesc: "Mentsd le az összes bejegyzésedet egy JSON fájlba.",
        settingsAutoExportFreq: "Automatikus mentés gyakorisága:",
        settingsFreqNever: "Soha",
        settingsFreqDaily: "Naponta",
        settingsFreqWeekly: "Hetente",
        settingsFreqMonthly: "Havonta",
        settingsAutoExportDesc: "Az alkalmazás indításakor ellenőrzi, hogy esedékes-e a mentés.",
        settingsDownloadData: "Adatok letöltése",
        settingsImportTitle: "Adatok importálása",
        settingsImportDesc: "Tölts vissza egy korábban lementett adatfájlt. Figyelem: ez felülírja a jelenlegi adatokat!",
        settingsUploadData: "Adatok visszatöltése",
        settingsAboutCreator: "Készítette: Princz Attila",
        settingsVersion: "Verzió:",
        settingsPalletTitle: "Raklap Beállítások",
        settingsPalletMultiMode: "Többféle raklap kezelése",
        settingsPalletCustomName1: "2. raklap neve (pl. EWP)",
        settingsPalletCustomName2: "3. raklap neve (pl. CHEP)",
        settingsPalletCustomName3: "4. raklap neve (pl. Gitterbox)",
        // Tachográf
        tachoTitle: "Tachográf Elemzés",
        tachoAllowanceDrive10h: "Fennmaradó 10 órás vezetés",
        tachoAllowanceReducedRest: "Fennmaradó csökk. pihenő",
        tachoCompensation: "Kompenzáció",
        tachoWeeklyRest: "Heti pihenő",
        tachoReducedWeeklyRest: "Csökkentett heti pihenő",
        tachoLongRest: "Hosszú pihenő",
        tachoIrregularRest: "Szabálytalan pihenő",
        tachoSplitRest: "Osztott pihenő",
        tachoRegularDailyRest: "Rendes napi pihenő",
        tachoReducedDailyRest: "csökkentett napi pihenő",
        tachoReason13h: "(13ó+ munka miatt)",
        tachoIrregularDrive: "Szabálytalan vezetés",
        tachoIncreasedDrive: "megnövelt vezetés",
        tachoNormalDrive: "Normál napi vezetés",
        tachoRestBeforeShift: "Műszak előtti pihenő",
        tachoDailyDriveTime: "Napi vezetési idő",
        tachoNoDriveTime: "Nincs vezetés rögzítve",
        tachoInProgress: "Folyamatban...",
        earliestStartTitle: "Legkorábbi indulás",
        latestRestStartTitle: "Legkésőbbi pihenő kezdés",
        with9hRest: "9 órás pihenővel",
        with11hRest: "11 órás pihenővel",
        reducedLabel: "(csökkentett):",
        regularLabel: "(rendes):",
        with11hRestLatest: "11 órás pihenőhöz (rendes):",
        with9hRestLatest: "9 órás pihenőhöz (csökkentett):",
        noMoreReducedRests: "Nincs több csökkentett pihenőd.",
        noMoreReducedRestsWarning: "Nincs több csökkentett pihenőd ebben a ciklusban!",
        earliestStartWarning: "Figyelem: A kalkuláció a napi pihenőidővel számol, a heti pihenőidőt nem veszi figyelembe.",
        // Raklapok
        palletsTitle: "Paletta Nyilvántartás",
        palletsBalance: "Aktuális egyenlegek:",
        palletsNewTransaction: "Új tranzakció",
        palletsLocationPlaceholder: "Város, cég...",
        palletsLicensePlate: "Rendszám (opcionális)",
        palletsLicensePlatePlaceholder: "Pl. ABC-123",
        palletsLicensePlateLabel: "Rendszám",
        palletsSaveTransaction: "Tranzakció mentése",
        palletsHistory: "Előzmények",
        palletsNoTransactions: "Még nincsenek paletta tranzakciók rögzítve.",
        palletsGivenLabel: "Leadott 🚛➡️",
        palletsTakenLabel: "Felvett 🚛⬅️",
        palletsTypeLabel: "Típus",
        pallets1to1Button: "1:1",
        palletReportHeaderDate: "Dátum",
        palletReportHeaderLocation: "Helyszín",
        palletReportHeaderGiven: "Leadott",
        palletReportHeaderTaken: "Felvett",
        palletReportHeaderType: "Típus",
        palletReportHeaderPlate: "Rendszám",
        palletReportHeaderBalance: "Egyenleg",
        palletReportFileName: "Raklap_Riport",
        palletReportTitle: "Raklapmozgás Riport",
        // Üzenetek
        alertRolloverTitle: "Áthúzódó műszak",
        alertRolloverPrompt: "Észleltük, hogy a műszakod a hétvégén áthúzódott (vasárnapi indulás, hétfői érkezés). Kérjük, add meg a műszak <strong>teljes vezetési idejét</strong> a tachográf alapján:",
        alertRolloverPlaceholder: "Vezetési idő (óó:pp)",
        alertLoginError: "Bejelentkezési hiba történt.",
        alertPopupClosed: "A bejelentkezési ablakot bezárta.",
        alertPopupBlocked: "A böngésző blokkolta a felugró ablakot. Kérjük, engedélyezze.",
        alertDataLoadError: "Hiba az adatok letöltésekor.",
        alertSaveToCloudError: "Hiba a felhőbe mentéskor.",
        alertMandatoryFields: "A dátum és a munkaidő megadása kötelező!",
        alertKmEndLower: "Hiba: A záró kilométer nem lehet kevesebb, mint a kezdő!",
        alertWeeklyDriveEndLower: "Hiba: A heti vezetési idő a nap végén nem lehet kevesebb, mint a nap elején!",
        alertConfirmZeroValues: "A vezetési idő vagy a megtett kilométer 0. Biztosan így szeretnéd menteni?",
        alertSaveSuccess: "Bejegyzés sikeresen mentve!",
        alertGeolocationNotSupported: "A böngésződ nem támogatja a helymeghatározást.",
        alertConfirmDelete: "Biztosan törölni szeretnéd?",
        alertFillAllFields: "Kérlek tölts ki minden mezőt!",
        alertNoDataToExport: "Nincsenek adatok az exportáláshoz!",
        alertChooseFile: "Kérlek válassz egy fájlt!",
        alertConfirmImport: "Biztosan importálod? A jelenlegi adatok felülíródnak!",
        alertImportSuccess: "Adatok sikeresen importálva!",
        alertImportInvalid: "Érvénytelen fájlformátum.",
        alertLocationFailed: "Helyszín lekérése sikertelen.",
        alertShareNotSupported: "A böngésződ nem támogatja ezt a funkciót.",
        alertGenerateReportFirst: "Először generálj riportot a megosztáshoz!",
        alertReportNameMissing: "A riport generálásához kérlek, add meg a nevedet a Beállítások menüben!",
        palletSaveSuccess: "Tranzakció mentve!",
        palletInvalidData: "Kérlek add meg a típust, helyszínt és legalább az egyik mennyiséget!",
        alertNoPalletData: "Nincs raklapmozgás, amiből riportot lehetne készíteni.",
        autoBackupOn: "Automatikus mentés bekapcsolva!",
        autoBackupOff: "Automatikus mentés kikapcsolva.",
        settingsSaved: "Beállítások mentve!",
        logRecalculatingNightWork: 'Éjszakai idők újraszámítása a 20:00-05:00 szabály szerint...',
        logEntriesUpdated: 'bejegyzés frissítve.',
        logAutoExportStarted: 'Automatikus mentés elindítva...',
        errorPdfGeneration: 'Hiba történt a PDF generálása közben:',
        errorSharing: 'Hiba a megosztás során:',
        shareAborted: 'Megosztás megszakítva.',
        errorImport: 'Hiba:',
        shareErrorCannotShare: 'Ezt a fájlt nem lehet megosztani.'
    },
    de: { /* ... Német fordítások itt ... */ }
};

// ====== GLOBÁLIS VÁLTOZÓK ÉS ALAP BEÁLLÍTÁSOK ======
let records = [];
let palletRecords = [];
let editingId = null;
let inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
let uniqueLocations = [];
let statsView = 'daily';
let statsDate = new Date();
let workTimeChart, driveTimeChart, nightTimeChart, kmChart;
let alertCallback = null;
let promptCallback = null;
let currentActiveTab = 'live';
let selectedPalletType = 'EUR';

let userSettings = {
    userName: '',
    theme: 'auto',
    autoExportFrequency: 'never',
    showKm: true,
    showDriveTime: true,
    showPallets: true,
    showCompensation: true,
    palletMode: 'single', // 'single' vagy 'multi'
    palletCustomNames: ['EWP', 'CHEP', 'Gitterbox']
};

let currentLang = localStorage.getItem('language') || (navigator.language.startsWith('de') ? 'de' : 'hu');

// ====== TÖBBNYELVŰSÉGI RENDSZER ======

function setLanguage(lang) {
    if (['hu', 'de'].includes(lang)) {
        currentLang = lang;
        saveSettings();
        updateAllTexts();
    }
}

function updateAllTexts() {
    const i18n = translations[currentLang];
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.dataset.translateKey;
        const translation = i18n[key];
        if (translation !== undefined) {
            if (el.placeholder) {
                el.placeholder = translation;
            } else if (el.title && (el.tagName === 'BUTTON' || el.tagName === 'A')) {
                el.title = translation;
            } else {
                el.textContent = translation;
            }
        }
    });
    document.title = i18n.appTitle;
    updateLanguageButtonStyles();
}

function updateLanguageButtonStyles() {
    const selector = document.getElementById('languageSelector');
    if (selector) {
        const buttons = selector.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.classList.remove('bg-blue-100', 'dark:bg-blue-700', 'border-blue-500', 'font-bold');
            if ((currentLang === 'hu' && btn.innerText.includes('🇭🇺')) || (currentLang === 'de' && btn.innerText.includes('🇦🇹'))) {
                btn.classList.add('bg-blue-100', 'dark:bg-blue-700', 'border-blue-500', 'font-bold');
            }
        });
    }
}

// =======================================================
// ===== FIREBASE ÉS AUTHENTIKÁCIÓS LOGIKA ==============
// =======================================================
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

auth.onAuthStateChanged(async user => {
    currentUser = user;
    updateAuthUI(user);
    if (user) {
        console.log("Logged in:", user.uid);
        await loadSettingsFromFirestore();
        const firestoreRecords = await loadRecordsFromFirestore('records');
        const localRecords = JSON.parse(localStorage.getItem('workRecords') || '[]');
        if (firestoreRecords.length === 0 && localRecords.length > 0) {
            await migrateLocalToFirestore(localRecords, 'records');
            records = localRecords;
        } else {
            records = firestoreRecords;
        }
        palletRecords = await loadRecordsFromFirestore('pallets');
    } else {
        console.log("Logged out.");
        loadSettingsFromLocalStorage();
        records = JSON.parse(localStorage.getItem('workRecords') || '[]');
        palletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');
    }

    applyAllSettings();
    renderApp();
    checkForAutoExport();

    const splashScreen = document.getElementById('splash-screen');
    const appContainer = document.getElementById('app');
    setTimeout(() => {
        if (splashScreen) {
            splashScreen.classList.add('hidden');
            setTimeout(() => { splashScreen.style.display = 'none'; }, 500);
        }
        if (appContainer) { appContainer.classList.remove('hidden'); }
    }, 500);
});

function setupAuthListeners() {
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    if (loginButton) {
        loginButton.addEventListener('click', async () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            try { await auth.signInWithPopup(provider); } catch (error) {
                const i18n = translations[currentLang];
                let errorMessage = i18n.alertLoginError;
                if (error.code === 'auth/popup-closed-by-user') { errorMessage = i18n.alertPopupClosed; }
                else if (error.code === 'auth/popup-blocked') { errorMessage = i18n.alertPopupBlocked; }
                showCustomAlert(errorMessage, 'info');
            }
        });
    }
    if (logoutButton) { logoutButton.addEventListener('click', () => auth.signOut()); }
}

function updateAuthUI(user) {
    const loggedInView = document.getElementById('logged-in-view');
    const loggedOutView = document.getElementById('logged-out-view');
    const userNameEl = document.getElementById('user-name');
    if (user) {
        loggedInView.classList.remove('hidden');
        loggedOutView.classList.add('hidden');
        userNameEl.textContent = user.displayName || user.email;
    } else {
        loggedInView.classList.add('hidden');
        loggedOutView.classList.remove('hidden');
        userNameEl.textContent = '';
    }
}

async function loadRecordsFromFirestore(collectionName) {
    if (!currentUser) return [];
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection(collectionName).orderBy('id').get();
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        showCustomAlert(translations[currentLang].alertDataLoadError, 'info');
        return [];
    }
}

async function migrateLocalToFirestore(localData, collectionName) {
    if (!currentUser) return;
    const batch = db.batch();
    localData.forEach(record => {
        const docRef = db.collection('users').doc(currentUser.uid).collection(collectionName).doc(String(record.id));
        batch.set(docRef, record);
    });
    try { await batch.commit(); } catch (error) { console.error(`Error migrating ${collectionName} data:`, error); }
}

async function saveRecord(record) {
    if (editingId) {
        records = records.map(r => r.id === editingId ? record : r);
    } else {
        records.push(record);
    }
    if (currentUser) {
        try {
            await db.collection('users').doc(currentUser.uid).collection('records').doc(String(record.id)).set(record);
        } catch (error) { showCustomAlert(translations[currentLang].alertSaveToCloudError, 'info'); }
    } else {
        localStorage.setItem('workRecords', JSON.stringify(records));
    }
}

async function deleteRecordFromStorage(id) {
    if (currentUser) {
        try { await db.collection('users').doc(currentUser.uid).collection('records').doc(String(id)).delete(); } catch (error) { console.error("Error deleting from Firestore:", error); }
    }
}

// =======================================================
// ===== BEÁLLÍTÁSOK KEZELÉSE (SETTINGS) ==============
// =======================================================

async function saveSettings() {
    userSettings.userName = document.getElementById('userNameInput').value;
    userSettings.theme = document.getElementById('themeSelector').value;
    userSettings.autoExportFrequency = document.getElementById('autoExportSelector').value;
    userSettings.showKm = document.getElementById('toggleKm').checked;
    userSettings.showDriveTime = document.getElementById('toggleDriveTime').checked;
    userSettings.showPallets = document.getElementById('togglePallets').checked;
    userSettings.showCompensation = document.getElementById('toggleCompensation').checked;
    userSettings.palletMode = document.getElementById('togglePalletMode').checked ? 'multi' : 'single';
    userSettings.palletCustomNames = [
        document.getElementById('palletCustomName1').value.trim(),
        document.getElementById('palletCustomName2').value.trim(),
        document.getElementById('palletCustomName3').value.trim()
    ];

    localStorage.setItem('userSettings', JSON.stringify(userSettings));
    if (currentUser) {
        await saveSettingsToFirestore();
    }
    
    applyAllSettings();
    updateAllTexts();
    showCustomAlert(translations[currentLang].settingsSaved, 'success');
}

function loadSettingsFromLocalStorage() {
    const savedSettings = JSON.parse(localStorage.getItem('userSettings'));
    if (savedSettings) {
        // A régebbi verziókból való migrálás biztosítása
        userSettings = { ...userSettings, ...savedSettings };
    }
}

async function loadSettingsFromFirestore() {
    if (!currentUser) {
        loadSettingsFromLocalStorage();
        return;
    }
    try {
        const docRef = db.collection('users').doc(currentUser.uid).collection('settings').doc('main');
        const doc = await docRef.get();
        if (doc.exists) {
            userSettings = { ...userSettings, ...doc.data() };
        } else {
            const localSettings = JSON.parse(localStorage.getItem('userSettings'));
            if(localSettings) {
                userSettings = { ...userSettings, ...localSettings };
                await saveSettingsToFirestore();
            }
        }
        localStorage.setItem('userSettings', JSON.stringify(userSettings));
    } catch (error) {
        console.error("Error loading settings from Firestore, falling back to local:", error);
        loadSettingsFromLocalStorage();
    }
}

async function saveSettingsToFirestore() {
    if (!currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).collection('settings').doc('main').set(userSettings);
    } catch (error) {
        console.error("Error saving settings to Firestore:", error);
    }
}

function applyAllSettings() {
    applyTheme(userSettings.theme);
    
    document.getElementById('userNameInput').value = userSettings.userName;
    document.getElementById('themeSelector').value = userSettings.theme;
    document.getElementById('autoExportSelector').value = userSettings.autoExportFrequency;
    
    document.getElementById('toggleKm').checked = userSettings.showKm;
    document.getElementById('toggleDriveTime').checked = userSettings.showDriveTime;
    document.getElementById('togglePallets').checked = userSettings.showPallets;
    document.getElementById('toggleCompensation').checked = userSettings.showCompensation;
    document.getElementById('togglePalletMode').checked = userSettings.palletMode === 'multi';

    document.getElementById('palletCustomName1').value = userSettings.palletCustomNames[0] || '';
    document.getElementById('palletCustomName2').value = userSettings.palletCustomNames[1] || '';
    document.getElementById('palletCustomName3').value = userSettings.palletCustomNames[2] || '';

    updateAllToggleVisuals();
    applyFeatureToggles();
    renderPalletSettingsUI();
}

function updateToggleVisuals(checkbox) {
    const label = checkbox.closest('label');
    if (!label) return;
    const checkmark = label.querySelector('.toggle-checkmark');
    label.classList.remove('bg-green-100', 'dark:bg-green-800/50', 'font-semibold');
    if (checkbox.checked) {
        label.classList.add('bg-green-100', 'dark:bg-green-800/50', 'font-semibold');
        if (checkmark) checkmark.classList.remove('hidden');
    } else {
        if (checkmark) checkmark.classList.add('hidden');
    }
}

function updateAllToggleVisuals() {
    document.querySelectorAll('.toggle-label').forEach(updateToggleVisuals);
}

function applyTheme(theme) {
    document.documentElement.classList.remove('dark');
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else if (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
    }
}

function setTheme(theme) {
    userSettings.theme = theme;
    applyTheme(theme);
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
    if(currentUser) saveSettingsToFirestore();
}

function renderPalletSettingsUI() {
    const container = document.getElementById('pallet-custom-names-container');
    if (container) {
        container.style.display = userSettings.palletMode === 'multi' ? 'block' : 'none';
    }
}

function applyFeatureToggles() {
    document.getElementById('km-section').style.display = userSettings.showKm ? 'block' : 'none';
    document.getElementById('drivetime-section').style.display = userSettings.showDriveTime ? 'block' : 'none';
    document.getElementById('compensation-section-de').style.display = userSettings.showCompensation ? 'block' : 'none';
    document.getElementById('menu-item-pallets').style.display = userSettings.showPallets ? 'flex' : 'none';

    if (!userSettings.showCompensation) {
        document.getElementById('compensationTime').value = '';
    }
    const activePalletContent = document.getElementById('content-pallets');
    if (!userSettings.showPallets && activePalletContent && !activePalletContent.classList.contains('hidden')) {
        showTab('live');
    }
}
// =======================================================
// ===== ALKALMAZÁS INDÍTÁSA ÉS FŐ LOGIKA ==============
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    setupAuthListeners();
    document.querySelectorAll('.settings-input, [id^="toggle"]').forEach(input => {
        input.addEventListener('change', saveSettings);
    });

    document.addEventListener('click', (event) => {
        const dropdownContainer = document.getElementById('dropdown-container');
        if (dropdownContainer && !dropdownContainer.contains(event.target)) { closeDropdown(); }
        if (!event.target.closest('.autocomplete-list')) { hideAutocomplete(); }
    });
    
    const pallet1to1Btn = document.getElementById('pallet-1to1-btn');
    if (pallet1to1Btn) {
        pallet1to1Btn.addEventListener('click', () => {
            const givenInput = document.getElementById('palletGiven');
            const takenInput = document.getElementById('palletTaken');
            if (givenInput.value) {
                takenInput.value = givenInput.value;
            } else if (takenInput.value) {
                givenInput.value = takenInput.value;
            }
        });
    }

    document.getElementById('stats-view-daily').onclick = () => { statsView = 'daily'; renderStats(); updateAllTexts(); };
    document.getElementById('stats-view-monthly').onclick = () => { statsView = 'monthly'; renderStats(); updateAllTexts(); };
    document.getElementById('stats-view-yearly').onclick = () => { statsView = 'yearly'; renderStats(); updateAllTexts(); };
    document.getElementById('stats-prev').onclick = () => { navigateStats(-1); };
    document.getElementById('stats-next').onclick = () => { navigateStats(1); };
});

function renderApp() {
    renderLiveTabView();
    renderStartTab();
    updateUniqueLocations();
    updateUniquePalletLocations();
    initAllAutocomplete();
    updateAllTexts();
}

const isoToVehicleCode = { 'at': 'A', 'de': 'D', 'hu': 'H', 'sk': 'SK', 'si': 'SLO', 'it': 'I', 'pl': 'PL', 'cz': 'CZ', 'ro': 'RO', 'ch': 'CH', 'fr': 'F', 'nl': 'NL', 'be': 'B', 'lu': 'L', 'es': 'E', 'gb': 'UK' };
async function fetchCountryCodeFor(inputId) { const inputElement = document.getElementById(inputId); if (!inputElement || !navigator.geolocation) return; inputElement.value = "..."; try { const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })); const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=en`); if (!response.ok) throw new Error('API error'); const data = await response.json(); const countryCode = data.address.country_code; if (countryCode && isoToVehicleCode[countryCode]) { inputElement.value = isoToVehicleCode[countryCode]; } else { inputElement.value = (countryCode || 'N/A').toUpperCase(); } } catch (error) { inputElement.value = ""; showCustomAlert(translations[currentLang].alertLocationFailed, 'info'); } }
function toggleDropdown() { document.getElementById('dropdown-menu').classList.toggle('hidden'); }
function closeDropdown() { document.getElementById('dropdown-menu').classList.add('hidden'); }

function showCustomAlert(message, type, callback) { const overlay = document.getElementById('custom-alert-overlay'); const box = document.getElementById('custom-alert-box'); const iconContainer = document.getElementById('custom-alert-icon'); const messageEl = document.getElementById('custom-alert-message'); const buttonsContainer = document.getElementById('custom-alert-buttons'); const i18n = translations[currentLang]; messageEl.innerHTML = message; alertCallback = callback || null; iconContainer.className = 'w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center'; buttonsContainer.innerHTML = ''; const warningIcon = `<svg class="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`; if (type === 'warning') { iconContainer.classList.add('bg-yellow-100'); iconContainer.innerHTML = warningIcon; buttonsContainer.innerHTML = `<button onclick="hideCustomAlert(false)" class="py-2 px-6 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500">${i18n.cancel}</button><button onclick="hideCustomAlert(true)" class="py-2 px-6 bg-yellow-400 text-white rounded-lg font-semibold hover:bg-yellow-500">${i18n.ok}</button>`; } else if (type === 'info') { iconContainer.classList.add('bg-yellow-100'); iconContainer.innerHTML = warningIcon; buttonsContainer.innerHTML = `<button onclick="hideCustomAlert(true)" class="py-2 w-2/3 bg-yellow-400 text-white rounded-lg font-semibold hover:bg-yellow-500">${i18n.ok}</button>`; } else if (type === 'success') { iconContainer.classList.add('bg-green-100', 'success-icon'); iconContainer.innerHTML = `<svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path class="checkmark-path" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`; buttonsContainer.innerHTML = `<button onclick="hideCustomAlert(true)" class="py-2 w-2/3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600">${i18n.ok}</button>`; } overlay.classList.remove('hidden'); overlay.classList.add('flex'); setTimeout(() => { overlay.classList.remove('opacity-0'); box.classList.remove('scale-95'); }, 10); }
function hideCustomAlert(isConfirmed) { const overlay = document.getElementById('custom-alert-overlay'); const box = document.getElementById('custom-alert-box'); overlay.classList.add('opacity-0'); box.classList.add('scale-95'); setTimeout(() => { overlay.classList.add('hidden'); overlay.classList.remove('flex'); if (isConfirmed && alertCallback) { alertCallback(); } alertCallback = null; }, 300); }

function showCustomPrompt(title, message, placeholder, iconHTML, callback) {
    const overlay = document.getElementById('custom-prompt-overlay');
    const box = document.getElementById('custom-prompt-box');
    const iconContainer = document.getElementById('custom-prompt-icon');
    const titleEl = document.getElementById('custom-prompt-title');
    const messageEl = document.getElementById('custom-prompt-message');
    const inputEl = document.getElementById('custom-prompt-input');
    const buttonsContainer = document.getElementById('custom-prompt-buttons');
    const i18n = translations[currentLang];
    titleEl.textContent = title;
    messageEl.innerHTML = message;
    inputEl.placeholder = placeholder;
    inputEl.value = '';
    iconContainer.innerHTML = iconHTML;
    promptCallback = callback || null;
    buttonsContainer.innerHTML = `<button onclick="hideCustomPrompt(false)" class="py-2 px-6 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500">${i18n.cancel}</button><button onclick="hideCustomPrompt(true)" class="py-2 px-6 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">${i18n.save}</button>`;
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        box.classList.remove('scale-95');
        inputEl.focus();
    }, 10);
}

function hideCustomPrompt(isConfirmed) {
    const overlay = document.getElementById('custom-prompt-overlay');
    const box = document.getElementById('custom-prompt-box');
    const inputEl = document.getElementById('custom-prompt-input');
    overlay.classList.add('opacity-0');
    box.classList.add('scale-95');
    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        if (isConfirmed && promptCallback) {
            promptCallback(inputEl.value);
        }
        promptCallback = null;
    }, 300);
}

async function saveEntry() {
    const i18n = translations[currentLang];
    const recordData = {
        date: document.getElementById('date').value,
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        startLocation: document.getElementById('startLocation').value.trim(),
        endLocation: document.getElementById('endLocation').value.trim(),
        weeklyDriveStartStr: document.getElementById('weeklyDriveStart').value.trim(),
        weeklyDriveEndStr: document.getElementById('weeklyDriveEnd').value.trim(),
        kmStart: parseFloat(document.getElementById('kmStart').value) || 0,
        kmEnd: parseFloat(document.getElementById('kmEnd').value) || 0,
        compensationTime: document.getElementById('compensationTime').value.trim(),
        isSplitRest: document.getElementById('toggleSplitRest').checked,
        crossings: Array.from(document.querySelectorAll('#crossingsContainer .border-t')).map(row => ({
            from: row.querySelector(`input[id^="crossFrom-"]`).value.trim().toUpperCase(),
            to: row.querySelector(`input[id^="crossTo-"]`).value.trim().toUpperCase(),
            time: row.querySelector(`input[id^="crossTime-"]`).value
        })).filter(c => c.from && c.to && c.time)
    };

    if (!recordData.date || !recordData.startTime || !recordData.endTime) {
        showCustomAlert(i18n.alertMandatoryFields, 'info');
        return;
    }

    const endDateTime = new Date(`${recordData.date}T${recordData.endTime}`);
    let startDateTime = new Date(`${recordData.date}T${recordData.startTime}`);
    if (endDateTime < startDateTime) {
        startDateTime.setDate(startDateTime.getDate() - 1);
    }
    const isDateRollover = startDateTime.getDay() === 0 && endDateTime.getDay() === 1;

    const finalizeSave = async (driveMinutes) => {
        const compensationMinutes = parseTimeToMinutes(recordData.compensationTime) || 0;
        const grossWorkMinutes = calculateWorkMinutes(recordData.startTime, recordData.endTime);

        const newRecord = {
            ...recordData,
            id: editingId || String(Date.now()),
            workMinutes: Math.max(0, grossWorkMinutes - compensationMinutes),
            compensationMinutes: compensationMinutes,
            nightWorkMinutes: calculateNightWorkMinutes(recordData.startTime, recordData.endTime),
            driveMinutes: driveMinutes,
            kmDriven: Math.max(0, recordData.kmEnd - recordData.kmStart)
        };

        const splitData = getSplitRestData();
        if (newRecord.isSplitRest) {
            splitData[newRecord.id] = true;
        } else {
            delete splitData[newRecord.id];
        }
        saveSplitRestData(splitData);

        await saveRecord(newRecord);
        showCustomAlert(i18n.alertSaveSuccess, 'success', () => {
            if (inProgressEntry && editingId === null) {
                localStorage.removeItem('inProgressEntry');
                inProgressEntry = null;
            }
            editingId = null;
            showTab('list');
        });
    };

    if (isDateRollover) {
        const tachoIcon = `<svg class="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
        showCustomPrompt(i18n.alertRolloverTitle, i18n.alertRolloverPrompt, i18n.alertRolloverPlaceholder, tachoIcon, async (driveTimeInput) => {
            if (driveTimeInput) {
                const manualMinutes = parseTimeToMinutes(driveTimeInput);
                if (manualMinutes >= 0) {
                    await finalizeSave(manualMinutes);
                }
            }
        });
    } else {
        if (recordData.kmEnd > 0 && recordData.kmEnd < recordData.kmStart) {
            showCustomAlert(i18n.alertKmEndLower, 'info');
            return;
        }
        if (parseTimeToMinutes(recordData.weeklyDriveEndStr) > 0 && parseTimeToMinutes(recordData.weeklyDriveEndStr) < parseTimeToMinutes(recordData.weeklyDriveStartStr)) {
            showCustomAlert(i18n.alertWeeklyDriveEndLower, 'info');
            return;
        }

        const calculatedDriveMinutes = Math.max(0, parseTimeToMinutes(recordData.weeklyDriveEndStr) - parseTimeToMinutes(recordData.weeklyDriveStartStr));
        
        const kmDriven = recordData.kmEnd - recordData.kmStart;
        if (calculatedDriveMinutes === 0 && kmDriven > 0) {
             showCustomAlert(i18n.alertConfirmZeroValues, 'warning', async () => {
                await finalizeSave(calculatedDriveMinutes);
            });
        } else {
            await finalizeSave(calculatedDriveMinutes);
        }
    }
}
function showTab(tabName) {
    currentActiveTab = tabName;

    if (tabName === 'pallets') {
        document.getElementById('palletDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('palletLicensePlate').value = localStorage.getItem('lastPalletLicensePlate') || '';
        renderPalletUI();
    }
    const allTabs = document.querySelectorAll('.tab');
    const mainTabs = ['live', 'start', 'full-day'];
    const dropdownButton = document.getElementById('dropdown-button');
    const dropdownMenu = document.getElementById('dropdown-menu');
    allTabs.forEach(t => t.classList.remove('tab-active'));
    dropdownButton.classList.remove('tab-active');
    if (mainTabs.includes(tabName)) {
        const tabButton = document.getElementById(`tab-${tabName}`);
        if (tabButton) tabButton.classList.add('tab-active');
        dropdownButton.innerHTML = `<span data-translate-key="menuMore">${translations[currentLang].menuMore}</span> ▼`;
    } else {
        dropdownButton.classList.add('tab-active');
        const selectedTitleEl = dropdownMenu.querySelector(`button[onclick="showTab('${tabName}')"] .dropdown-item-title`);
        if (selectedTitleEl) {
            const selectedTitle = selectedTitleEl.textContent;
            dropdownButton.innerHTML = `${selectedTitle} ▼`;
        }
    }
    document.querySelectorAll('[id^="content-"]').forEach(c => c.classList.add('hidden'));
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    closeDropdown();

    if (tabName === 'start') renderStartTab();
    if (tabName === 'list') renderRecords();
    if (tabName === 'summary') renderSummary();
    if (tabName === 'stats') { statsDate = new Date(); renderStats(); }
    if (tabName === 'report') initMonthlyReport();
    if (tabName === 'tachograph') renderTachographAnalysis();
    if (tabName === 'pallets') renderPalletUI();

    updateAllTexts();
}

function renderDashboard() {
    const i18n = translations[currentLang];
    const container = document.getElementById('dashboard-cards');
    if (!container) return;
    const now = new Date();
    const thisWeek = calculateSummaryForDateRange(getWeekRange(now));
    const lastWeek = calculateSummaryForDateRange(getWeekRange(now, -1));
    const thisMonth = calculateSummaryForMonth(now);

    const cards = [
        { labelKey: 'dashboardDriveThisWeek', value: formatDuration(thisWeek.driveMinutes), color: 'blue' },
        { labelKey: 'dashboardWorkThisWeek', value: formatDuration(thisWeek.workMinutes), color: 'green' },
        { labelKey: 'dashboardDistanceThisMonth', value: `${thisMonth.kmDriven} km`, color: 'orange' },
        { labelKey: 'dashboardDistanceLastWeek', value: `${lastWeek.kmDriven} km`, color: 'indigo' }
    ];

    container.innerHTML = cards.map(card => `
        <div class="bg-${card.color}-50 dark:bg-${card.color}-900/50 border border-${card.color}-200 dark:border-${card.color}-800 rounded-lg p-3 text-center">
            <p class="text-xs text-${card.color}-700 dark:text-${card.color}-200 font-semibold">${i18n[card.labelKey]}</p>
            <p class="text-lg font-bold text-${card.color}-800 dark:text-${card.color}-100 mt-1">${card.value}</p>
        </div>
    `).join('');
}

function renderLiveTabView() {
    renderWeeklyAllowance();
    renderEarliestStart();
    renderDashboard();
}

function renderStartTab() {
    const i18n = translations[currentLang];
    inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
    
    const startForm = document.getElementById('start-new-day-form');
    const progressView = document.getElementById('live-progress-view');
    const summaryContainer = document.getElementById('live-start-summary');

    if (inProgressEntry) {
        startForm.classList.add('hidden');
        progressView.classList.remove('hidden');

        document.getElementById('live-start-time').textContent = `${i18n.startedAt}: ${inProgressEntry.date} ${inProgressEntry.startTime}`;
        
        let summaryHTML = '';
        const hasDriveData = userSettings.showDriveTime && inProgressEntry.weeklyDriveStartStr;
        const hasKmData = userSettings.showKm && inProgressEntry.kmStart > 0;
        const hasLocationData = inProgressEntry.startLocation && inProgressEntry.startLocation.trim() !== '';

        if (hasDriveData || hasKmData || hasLocationData) {
            summaryHTML += `<div class="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg space-y-2">
                                <h3 class="font-semibold text-gray-800 dark:text-gray-100">${i18n.liveShiftDetailsTitle}</h3>
                                <div class="space-y-1 text-sm">`;

            if (hasLocationData) {
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartLocationLabel}</span>
                                    <span class="font-semibold">${inProgressEntry.startLocation}</span>
                                </div>`;
            }
            if (hasDriveData) {
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartDriveLabel}</span>
                                    <span class="font-semibold">${inProgressEntry.weeklyDriveStartStr}</span>
                                </div>`;
            }
            if (hasKmData) {
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartKmLabel}</span>
                                    <span class="font-semibold">${inProgressEntry.kmStart} km</span>
                                </div>`;
            }

            summaryHTML += `</div></div>`;
        }
        summaryContainer.innerHTML = summaryHTML;
        
        const liveCrossList = document.getElementById('live-crossings-list');
        const liveCrossFrom = document.getElementById('liveCrossFrom');
        if (inProgressEntry.crossings && inProgressEntry.crossings.length > 0) {
            const crossingsHTML = inProgressEntry.crossings.map(c => 
                `<div class="flex items-center justify-between bg-white dark:bg-gray-700/50 p-2 rounded-md shadow-sm">
                    <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        <span class="font-mono font-bold text-indigo-800 dark:text-indigo-200">${c.from}</span>
                        <span class="text-gray-400">→</span>
                        <span class="font-mono font-bold text-indigo-800 dark:text-indigo-200">${c.to}</span>
                    </div>
                    <span class="text-sm font-mono text-gray-600 dark:text-gray-400">${c.time}</span>
                </div>`
            ).join('');
            liveCrossList.innerHTML = `<div class="bg-indigo-50 dark:bg-indigo-900/50 p-3 rounded-lg">
                                        <h4 class="font-bold text-indigo-800 dark:text-indigo-200 text-sm mb-2">${i18n.recordedCrossings}</h4>
                                        <div class="space-y-2">${crossingsHTML}</div>
                                    </div>`;
            liveCrossFrom.value = inProgressEntry.crossings.slice(-1)[0].to;
        } else {
            liveCrossList.innerHTML = '';
            const lastRecordWithCrossing = getSortedRecords().find(r => r.crossings && r.crossings.length > 0);
            liveCrossFrom.value = lastRecordWithCrossing ? lastRecordWithCrossing.crossings.slice(-1)[0].to : '';
        }
        document.getElementById('liveCrossTo').value = '';
        document.getElementById('liveCrossTime').value = new Date().toTimeString().slice(0, 5);

    } else {
        progressView.classList.add('hidden');
        startForm.classList.remove('hidden');
        summaryContainer.innerHTML = ''; 
        loadLastValues(true);
    }
}

function startLiveShift() { 
    inProgressEntry = { 
        date: document.getElementById('liveStartDate').value, 
        startTime: document.getElementById('liveStartTime').value, 
        startLocation: document.getElementById('liveStartLocation').value.trim(), 
        weeklyDriveStartStr: document.getElementById('liveWeeklyDriveStart').value.trim(), 
        kmStart: parseFloat(document.getElementById('liveStartKm').value) || 0, 
        crossings: [] 
    }; 
    if (!inProgressEntry.date || !inProgressEntry.startTime) { 
        showCustomAlert(translations[currentLang].alertMandatoryFields, "info"); 
        return; 
    } 
    localStorage.setItem('inProgressEntry', JSON.stringify(inProgressEntry)); 
    renderStartTab();
    renderLiveTabView();
    updateAllTexts(); 
}

function addLiveCrossing() { const from = document.getElementById('liveCrossFrom').value.trim().toUpperCase(); const to = document.getElementById('liveCrossTo').value.trim().toUpperCase(); const time = document.getElementById('liveCrossTime').value; if (!from || !to || !time) { showCustomAlert(translations[currentLang].alertFillAllFields, "info"); return; } inProgressEntry.crossings.push({ from, to, time }); localStorage.setItem('inProgressEntry', JSON.stringify(inProgressEntry)); renderStartTab(); updateAllTexts(); }
function finalizeShift() { showTab('full-day'); document.getElementById('date').value = new Date().toISOString().split('T')[0]; Object.keys(inProgressEntry).forEach(key => { const el = document.getElementById(key.replace('Str', '')); if (el) el.value = inProgressEntry[key]; }); (inProgressEntry.crossings || []).forEach(c => addCrossingRow(c.from, c.to, c.time)); document.getElementById('endTime').focus(); }

function discardShift() { 
    showCustomAlert(translations[currentLang].discardWorkday + "?", 'warning', () => {
        localStorage.removeItem('inProgressEntry');
        inProgressEntry = null;
        renderStartTab();
        renderLiveTabView();
        updateAllTexts();
    });
}
function getSortedRecords() { return [...(records || [])].sort((a, b) => new Date(`${b.date}T${b.startTime}`) - new Date(`${a.date}T${a.startTime}`)); }
function getLatestRecord() { if (!records || records.length === 0) return null; return getSortedRecords()[0]; }
function loadLastValues(forLiveForm = false) { const lastRecord = getLatestRecord(); const now = new Date(); if (forLiveForm) { document.getElementById('liveStartDate').value = now.toISOString().split('T')[0]; document.getElementById('liveStartTime').value = now.toTimeString().slice(0, 5); if (lastRecord) { document.getElementById('liveStartLocation').value = lastRecord.endLocation || ''; document.getElementById('liveWeeklyDriveStart').value = lastRecord.weeklyDriveEndStr || ''; document.getElementById('liveStartKm').value = lastRecord.kmEnd || ''; } } else { document.getElementById('date').value = now.toISOString().split('T')[0]; if (lastRecord) { document.getElementById('weeklyDriveStart').value = lastRecord.weeklyDriveEndStr || ''; document.getElementById('kmStart').value = lastRecord.kmEnd || ''; document.getElementById('startLocation').value = lastRecord.endLocation || ''; } } }
function resetEntryForm() { ['date', 'startTime', 'endTime', 'startLocation', 'endLocation', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd'].forEach(id => document.getElementById(id).value = ''); const splitRestToggle = document.getElementById('toggleSplitRest'); if(splitRestToggle) { splitRestToggle.checked = false; updateToggleVisuals(splitRestToggle); } document.getElementById('crossingsContainer').innerHTML = ''; editingId = null; updateDisplays(); }
function updateDisplays() {
    const i18n = translations[currentLang];
    const workMinutes = calculateWorkMinutes(document.getElementById('startTime').value, document.getElementById('endTime').value); 
    document.getElementById('workTimeDisplay').textContent = workMinutes > 0 ? `${i18n.workTimeDisplay}: ${formatDuration(workMinutes)}` : ''; 
    const nightMinutes = calculateNightWorkMinutes(document.getElementById('startTime').value, document.getElementById('endTime').value); 
    document.getElementById('nightWorkDisplay').textContent = nightMinutes > 0 ? `${i18n.nightWorkDisplay}: ${formatDuration(nightMinutes)}` : ''; 
    const driveMinutes = Math.max(0, parseTimeToMinutes(document.getElementById('weeklyDriveEnd').value) - parseTimeToMinutes(document.getElementById('weeklyDriveStart').value)); 
    document.getElementById('driveTimeDisplay').textContent = driveMinutes > 0 ? `${i18n.driveTimeTodayDisplay}: ${formatDuration(driveMinutes)}` : ''; 
    const kmDriven = Math.max(0, (parseFloat(document.getElementById('kmEnd').value) || 0) - (parseFloat(document.getElementById('kmStart').value) || 0)); 
    document.getElementById('kmDisplay').textContent = kmDriven > 0 ? `${i18n.kmDrivenDisplay}: ${kmDriven} km` : ''; 
}
['startTime', 'endTime', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime'].forEach(id => { if (document.getElementById(id)) document.getElementById(id).addEventListener('input', updateDisplays); });
function addCrossingRow(from = '', to = '', time = '') {
    const i18n = translations[currentLang];
    const container = document.getElementById('crossingsContainer');
    const lastToInput = container.querySelector('input[id^="crossTo-"]:last-of-type');
    const newFrom = from || (lastToInput ? lastToInput.value.toUpperCase() : '');
    const index = Date.now();
    const newRow = document.createElement('div');
    newRow.className = 'border-t border-gray-200 dark:border-gray-700 pt-3 mt-2 space-y-2';
    newRow.innerHTML = `<div class="grid grid-cols-2 gap-2"><div><input type="text" id="crossFrom-${index}" value="${newFrom}" placeholder="${i18n.fromPlaceholder}" class="w-full p-2 border rounded text-sm uppercase dark:bg-gray-600 dark:border-gray-500"></div><div><div class="flex"><input type="text" id="crossTo-${index}" value="${to}" placeholder="${i18n.toPlaceholder}" class="w-full p-2 border rounded-l text-sm uppercase dark:bg-gray-600 dark:border-gray-500"><button type="button" onclick="fetchCountryCodeFor('crossTo-${index}')" class="bg-blue-500 text-white p-2 rounded-r text-xs" title="${i18n.getCountryCodeGPS}">📍</button></div></div></div><div class="grid grid-cols-2 gap-2"><input type="time" id="crossTime-${index}" value="${time}" onblur="formatTimeInput(this)" class="w-full p-2 border rounded text-sm dark:bg-gray-600 dark:border-gray-500"><button type="button" onclick="this.closest('div.border-t').remove()" class="bg-red-500 text-white p-2 rounded text-sm hover:bg-red-600">${i18n.delete}</button></div>`;
    container.appendChild(newRow);
}
async function fetchLocation() { if (!navigator.geolocation) { showCustomAlert(translations[currentLang].alertGeolocationNotSupported, 'info'); return; } const endLocationInput = document.getElementById('endLocation'); endLocationInput.value = "..."; try { const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })); const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=hu`); if (!response.ok) throw new Error('API error'); const data = await response.json(); endLocationInput.value = data.address.city || data.address.town || data.address.village || 'Unknown location'; } catch (error) { endLocationInput.value = ""; showCustomAlert(translations[currentLang].alertLocationFailed, 'info'); } }

function editRecord(id) {
    const record = records.find(r => r.id === String(id));
    if (!record) return;
    editingId = String(id);
    showTab('full-day');
    Object.keys(record).forEach(key => {
        const el = document.getElementById(key.replace('Str', ''));
        if (el) el.value = record[key] || '';
    });
    const compensationEl = document.getElementById('compensationTime');
    if (compensationEl) { compensationEl.value = record.compensationMinutes ? formatAsHoursAndMinutes(record.compensationMinutes) : ''; }
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) { splitRestToggle.checked = record.isSplitRest || false; updateToggleVisuals(splitRestToggle); }
    document.getElementById('crossingsContainer').innerHTML = '';
    (record.crossings || []).forEach(c => addCrossingRow(c.from, c.to, c.time));
    updateDisplays();
}

async function deleteRecord(id) {
    showCustomAlert(translations[currentLang].alertConfirmDelete, 'warning', async () => {
        const splitData = getSplitRestData();
        delete splitData[id];
        saveSplitRestData(splitData);
        await deleteRecordFromStorage(id);
        records = records.filter(r => r.id !== String(id));
        if (!currentUser) {
            localStorage.setItem('workRecords', JSON.stringify(records));
        }
        renderApp();
        showTab(currentActiveTab);
    });
}

function renderRecords() { const i18n = translations[currentLang]; const container = document.getElementById('recordsContent'); if (!container) return; const locale = currentLang === 'de' ? 'de-DE' : 'hu-HU'; container.innerHTML = records.length === 0 ? `<p class="text-center text-gray-500 py-8">${i18n.noEntries}</p>` : getSortedRecords().map(r => { const d = new Date(r.date); const day = d.getUTCDay(); const weekendClass = (day === 6 || day === 0) ? 'bg-red-50 dark:bg-red-900/20' : ''; const isOvernight = new Date(`1970-01-01T${r.endTime}`) < new Date(`1970-01-01T${r.startTime}`); const endDate = new Date(r.date + 'T00:00:00'); let startDate = new Date(r.date + 'T00:00:00'); if (isOvernight) { startDate.setDate(startDate.getDate() - 1); } const formatShortDate = (dt) => dt.toLocaleDateString(locale, { month: '2-digit', day: '2-digit' }); return `<div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-3 text-sm ${weekendClass}"><div class="flex items-center justify-between mb-2"><div class="font-semibold">${isOvernight?`${startDate.toLocaleDateString(locale)} - ${endDate.toLocaleDateString(locale)}`:endDate.toLocaleDateString(locale)}</div><div><button onclick="editRecord('${r.id}')" class="text-blue-500 p-1">✏️</button><button onclick="deleteRecord('${r.id}')" class="text-red-500 p-1">🗑️</button></div></div><div class="space-y-1"><div class="flex justify-between"><span>${i18n.entryDeparture}:</span><span>${isOvernight?formatShortDate(startDate):""} ${r.startTime} (${r.startLocation||"N/A"})</span></div><div class="flex justify-between"><span>${i18n.entryArrival}:</span><span>${formatShortDate(endDate)} ${r.endTime} (${r.endLocation||"N/A"})</span></div><div class="flex justify-between border-t pt-1 mt-1 dark:border-gray-600"><span>${i18n.entryWorkTime}:</span><span class="font-bold">${formatDuration(r.workMinutes)}</span></div>${r.compensationMinutes > 0 ? `<div class="flex justify-between text-yellow-700 dark:text-yellow-400 text-xs"><span>&nbsp;&nbsp;└ ${i18n.entryCompensation}:</span><span>-${formatDuration(r.compensationMinutes)}</span></div>` : ''}<div class="flex justify-between"><span>${i18n.entryNightTime}:</span><span class="text-purple-600 dark:text-purple-400">${formatDuration(r.nightWorkMinutes||0)}</span></div><div class="flex justify-between"><span>${i18n.entryDriveTime}:</span><span class="text-blue-700 dark:text-blue-400">${formatDuration(r.driveMinutes)}</span></div><div class="flex justify-between"><span>${i18n.entryDistance}:</span><span>${r.kmDriven} km</span></div>${(r.crossings&&r.crossings.length>0)?`<div class="border-t pt-2 mt-2 dark:border-gray-600"><p class="font-semibold text-xs text-indigo-700 dark:text-indigo-300">${i18n.entryCrossingsLabel}:</p><div class="text-xs text-gray-600 dark:text-gray-400 pl-2">${r.crossings.map(c=>`<span>${c.from} - ${c.to} (${c.time})</span>`).join("<br>")}</div></div>`:""}</div></div>`; }).join(''); }
function renderSummary() {
    const i18n = translations[currentLang];
    const container = document.getElementById('summaryContent');
    if (!container) return;
    const today = new Date();
    const summaries = [
        { title: i18n.summaryToday, data: calculateSummaryForDate(new Date()) }, 
        { title: i18n.summaryYesterday, data: calculateSummaryForDate(new Date(new Date().setDate(today.getDate() - 1))) }, 
        { title: i18n.summaryThisWeek, data: calculateSummaryForDateRange(getWeekRange(new Date())) }, 
        { title: i18n.summaryLastWeek, data: calculateSummaryForDateRange(getWeekRange(new Date(), -1)) }, 
        { title: i18n.summaryThisMonth, data: calculateSummaryForMonth(new Date()) }, 
        { title: i18n.summaryLastMonth, data: calculateSummaryForMonth(new Date(new Date().setMonth(today.getMonth() - 1))) }
    ];
    container.innerHTML = summaries.map(s => `<div class="bg-blue-50 dark:bg-blue-900/50 rounded-lg p-3"><h3 class="font-semibold mb-2">${s.title} ${s.data.days > 0 ? `(${s.data.days} ${i18n.summaryDays})` : ""}</h3>${s.data.days > 0 ? `<div class="grid grid-cols-2 gap-2 text-center text-sm"><div><div class="font-bold text-green-600 dark:text-green-400">${formatDuration(s.data.workMinutes)}</div><div class="text-xs">${i18n.summaryWork}</div></div><div><div class="font-bold text-purple-600 dark:text-purple-400">${formatDuration(s.data.nightWorkMinutes)}</div><div class="text-xs">${i18n.summaryNight}</div></div><div><div class="font-bold text-blue-700 dark:text-blue-400">${formatDuration(s.data.driveMinutes)}</div><div class="text-xs">${i18n.summaryDrive}</div></div><div><div class="font-bold text-orange-600 dark:text-orange-400">${s.data.kmDriven} km</div><div class="text-xs">${i18n.summaryDistance}</div></div></div>` : `<p class="text-center text-xs text-gray-500">${i18n.summaryNoData}</p>`}</div>`).join('');
};

function navigateStats(direction) { if (statsView === 'daily') statsDate.setMonth(statsDate.getMonth() + direction); else if (statsView === 'monthly') statsDate.setFullYear(statsDate.getFullYear() + direction); else if (statsView === 'yearly') return; renderStats(); }
function renderStats() {
    const i18n = translations[currentLang];
    const locale = currentLang === 'de' ? 'de-DE' : 'hu-HU';
    const periodDisplay = document.getElementById('stats-period-display');
    document.querySelectorAll('.stats-view-btn').forEach(btn => btn.classList.remove('active', 'bg-blue-500', 'text-white'));
    document.getElementById(`stats-view-${statsView}`).classList.add('active', 'bg-blue-500', 'text-white');
    let data;
    if (statsView === 'daily') {
        periodDisplay.textContent = `${statsDate.getFullYear()}. ${statsDate.toLocaleString(locale, { month: 'long' })}`;
        data = getDailyData(statsDate);
    } else if (statsView === 'monthly') {
        periodDisplay.textContent = `${statsDate.getFullYear()}`;
        data = getMonthlyData(statsDate);
    } else { // yearly
        data = getYearlyData();
        periodDisplay.textContent = data.labels.length > 0 ? `${data.labels[0]} - ${data.labels[data.labels.length - 1]}` : i18n.summaryNoData;
    }
    const noDataEl = document.getElementById('stats-no-data');
    const chartsContainer = document.getElementById('stats-charts-container');
    const hasData = data.datasets.work.some(d => d > 0) || data.datasets.km.some(d => d > 0);
    
    const totals = {
        work: data.datasets.work.reduce((a, b) => a + b, 0) * 60,
        drive: data.datasets.drive.reduce((a, b) => a + b, 0) * 60,
        night: data.datasets.night.reduce((a, b) => a + b, 0) * 60,
        km: data.datasets.km.reduce((a, b) => a + b, 0)
    };

    const workTotalEl = document.getElementById('workTimeTotal');
    const driveTotalEl = document.getElementById('driveTimeTotal');
    const nightTotalEl = document.getElementById('nightTimeTotal');
    const kmTotalEl = document.getElementById('kmTotal');
    
    workTotalEl.className = 'text-sm font-bold text-green-600 dark:text-green-400';
    driveTotalEl.className = 'text-sm font-bold text-blue-600 dark:text-blue-400';
    nightTotalEl.className = 'text-sm font-bold text-purple-600 dark:text-purple-400';
    kmTotalEl.className = 'text-sm font-bold text-orange-600 dark:text-orange-400';
    
    if (!hasData) {
        noDataEl.classList.remove('hidden');
        chartsContainer.classList.add('hidden');
        workTotalEl.textContent = ''; driveTotalEl.textContent = ''; nightTotalEl.textContent = ''; kmTotalEl.textContent = '';
    } else {
        noDataEl.classList.add('hidden');
        chartsContainer.classList.remove('hidden');

        workTotalEl.textContent = formatDuration(totals.work);
        driveTotalEl.textContent = formatDuration(totals.drive);
        nightTotalEl.textContent = formatDuration(totals.night);
        kmTotalEl.textContent = `${Math.round(totals.km)} km`;

        workTimeChart = createOrUpdateBarChart(workTimeChart, 'workTimeChart', data.labels, data.datasets.work, i18n.statsWorkTime, '#22c55e', (value) => `${value.toFixed(1)} h`);
        driveTimeChart = createOrUpdateBarChart(driveTimeChart, 'driveTimeChart', data.labels, data.datasets.drive, i18n.statsDriveTime, '#3b82f6', (value) => `${value.toFixed(1)} h`);
        nightTimeChart = createOrUpdateBarChart(nightTimeChart, 'nightTimeChart', data.labels, data.datasets.night, i18n.statsNightTime, '#8b5cf6', (value) => `${value.toFixed(1)} h`);
        kmChart = createOrUpdateBarChart(kmChart, 'kmChart', data.labels, data.datasets.km, i18n.statsKmDriven, '#f97316', (value) => `${Math.round(value)} km`);
    }
}
function getDailyData(date) { const year = date.getFullYear(); const month = date.getMonth(); const daysInMonth = new Date(year, month + 1, 0).getDate(); const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1)); const datasets = { work: Array(daysInMonth).fill(0), drive: Array(daysInMonth).fill(0), night: Array(daysInMonth).fill(0), km: Array(daysInMonth).fill(0) }; records.filter(r => r.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).forEach(r => { const dayIndex = new Date(r.date + 'T00:00:00').getDate() - 1; datasets.work[dayIndex] += r.workMinutes / 60; datasets.drive[dayIndex] += r.driveMinutes / 60; datasets.night[dayIndex] += r.nightWorkMinutes / 60; datasets.km[dayIndex] += r.kmDriven; }); return { labels, datasets }; }
function getMonthlyData(date) { const year = date.getFullYear(); const labels = translations[currentLang].chartMonths; const datasets = { work: Array(12).fill(0), drive: Array(12).fill(0), night: Array(12).fill(0), km: Array(12).fill(0) }; records.filter(r => r.date.startsWith(String(year))).forEach(r => { const monthIndex = new Date(r.date + 'T00:00:00').getMonth(); datasets.work[monthIndex] += r.workMinutes / 60; datasets.drive[monthIndex] += r.driveMinutes / 60; datasets.night[monthIndex] += r.nightWorkMinutes / 60; datasets.km[monthIndex] += r.kmDriven; }); return { labels, datasets }; }
function getYearlyData() { if (records.length === 0) return { labels: [], datasets: { work: [], drive: [], night: [], km: [] } }; const yearData = {}; records.forEach(r => { const year = r.date.substring(0, 4); if (!yearData[year]) yearData[year] = { work: 0, drive: 0, night: 0, km: 0 }; yearData[year].work += r.workMinutes / 60; yearData[year].drive += r.driveMinutes / 60; yearData[year].night += r.nightWorkMinutes / 60; yearData[year].km += r.kmDriven; }); const labels = Object.keys(yearData).sort(); const datasets = { work: [], drive: [], night: [], km: [] }; labels.forEach(year => { datasets.work.push(yearData[year].work); datasets.drive.push(yearData[year].drive); datasets.night.push(yearData[year].night); datasets.km.push(yearData[year].km); }); return { labels, datasets }; }
function createOrUpdateBarChart(chartInstance, canvasId, labels, data, labelText, color, tooltipCallback) { const ctx = document.getElementById(canvasId).getContext('2d'); if (chartInstance) { chartInstance.destroy(); } Chart.defaults.color = document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#4b5563'; return new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: labelText, data: data, backgroundColor: color, borderRadius: 4 }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { return tooltipCallback(context.parsed.y); } } } }, scales: { y: { beginAtZero: true } } } }); }

const toISODate = d => d.toISOString().split('T')[0];
function calculateSummary(filterFn) { return (records || []).filter(filterFn).reduce((acc, r) => ({ workMinutes: acc.workMinutes + (r.workMinutes || 0), nightWorkMinutes: acc.nightWorkMinutes + (r.nightWorkMinutes || 0), driveMinutes: acc.driveMinutes + (r.driveMinutes || 0), kmDriven: acc.kmDriven + (r.kmDriven || 0), days: acc.days + 1 }), { workMinutes: 0, nightWorkMinutes: 0, driveMinutes: 0, kmDriven: 0, days: 0 }); }
function calculateSummaryForDate(date) { const dateStr = toISODate(date); return calculateSummary(r => r.date === dateStr); }
function calculateSummaryForDateRange({ start, end }) { const startStr = toISODate(start); const endStr = toISODate(end); return calculateSummary(r => r.date >= startStr && r.date <= endStr); }
function calculateSummaryForMonth(date) { const monthStr = date.toISOString().slice(0, 7); return calculateSummary(r => r.date.startsWith(monthStr)); }
function getWeekRange(date, offset = 0) { const d = new Date(date); d.setDate(d.getDate() + (offset * 7)); const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1); const start = new Date(d.setDate(diff)); const end = new Date(start); end.setDate(start.getDate() + 6); return { start, end }; }

let currentMonthlyData = null;
function initMonthlyReport() { 
    document.getElementById('monthSelector').value = new Date().toISOString().slice(0, 7); 
    document.getElementById('monthlyReportContent').innerHTML = ''; 
    document.getElementById('pdfExportBtn').classList.add('hidden'); 
    document.getElementById('pdfShareBtn').classList.add('hidden');
}
function generateMonthlyReport() { 
    const i18n = translations[currentLang];
    const userName = document.getElementById('userNameInput').value.trim();
    if (!userName) {
        showCustomAlert(i18n.alertReportNameMissing, 'info');
        showTab('settings');
        return;
    }

    const selectedMonth = document.getElementById("monthSelector").value; 
    const monthRecords = records.filter(record => record.date.startsWith(selectedMonth)); 
    monthRecords.sort((a, b) => new Date(a.date) - new Date(b.date)); 
    currentMonthlyData = { month: selectedMonth, records: monthRecords };
    document.getElementById('monthlyReportContent').innerHTML = `<div class="bg-white p-4 text-xs">${i18n.reportPrepared}</div>`;
    document.getElementById('pdfExportBtn').classList.remove('hidden');
    if (navigator.share) {
        document.getElementById('pdfShareBtn').classList.remove('hidden');
    }
}
const germanMonths = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const germanFullDays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
function formatAsHoursAndMinutes(minutes) { const h = Math.floor(minutes / 60), m = minutes % 60; return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}` } 

function exportToPDF() {
    try {
        const i18n = translations[currentLang];
        if (!currentMonthlyData) { showCustomAlert(i18n.alertGenerateReportFirst, 'info'); return; }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const userName = document.getElementById('userNameInput').value || 'N/A';
        const [year, month] = currentMonthlyData.month.split('-');
        const monthName = germanMonths[parseInt(month) - 1];
        const daysInMonth = new Date(year, month, 0).getDate();
        const recordsMap = new Map(currentMonthlyData.records.map(r => [r.date, r]));
        let totalWorkMinutes = 0;
        let totalNightWorkMinutes = 0;
        recordsMap.forEach(record => {
            totalWorkMinutes += record.workMinutes || 0;
            totalNightWorkMinutes += record.nightWorkMinutes || 0;
        });

        doc.setFontSize(18); doc.setFont(undefined, 'bold'); doc.text('ARBEITSZEITNACHWEIS', 105, 15, { align: 'center' });
        doc.setFontSize(14); doc.setFont(undefined, 'normal'); doc.text(`${monthName} ${year}`, 105, 23, { align: 'center' });
        doc.setFontSize(12); doc.text(userName, 105, 31, { align: 'center' });

        let yPos = 40;
        const pageBottom = 280;
        const leftMargin = 15;
        const tableWidth = 180;
        const headers = ['Datum', 'Beginn', 'Ort', 'Ende', 'Ort', 'Grenzübergänge', 'Arbeit', 'Nacht'];
        const colWidths = [25, 15, 30, 15, 30, 35, 15, 15];

        const drawHeader = () => {
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.setDrawColor(150, 150, 150);
            let xPos = leftMargin;
            headers.forEach((h, i) => {
                doc.rect(xPos, yPos, colWidths[i], 7, 'S');
                doc.text(h, xPos + colWidths[i] / 2, yPos + 4.5, { align: 'center' });
                xPos += colWidths[i];
            });
            yPos += 7;
            doc.setFont('Helvetica', 'normal');
        };

        drawHeader();

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(Date.UTC(year, month - 1, day));
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getUTCDay();
            const record = recordsMap.get(dateStr);
            
            const dateDisplay = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.`;
            const dayNameDisplay = germanFullDays[dayOfWeek];
            const dateCellText = `${dateDisplay}\n${dayNameDisplay}`;
            
            const crossingsText = (record && record.crossings && record.crossings.length > 0)
                ? record.crossings.map(c => `${c.from}-${c.to} (${c.time})`).join("\n")
                : '-';

            const dateLines = doc.splitTextToSize(dateCellText, colWidths[0] - 2);
            const startLocLines = doc.splitTextToSize(record?.startLocation || '-', colWidths[2] - 2);
            const endLocLines = doc.splitTextToSize(record?.endLocation || '-', colWidths[4] - 2);
            const crossingsLines = doc.splitTextToSize(crossingsText, colWidths[5] - 2);
            const rowHeight = Math.max(dateLines.length, startLocLines.length, endLocLines.length, crossingsLines.length) * 4.5 + 4;

            if (yPos + rowHeight > pageBottom) {
                doc.addPage();
                yPos = 20;
                drawHeader();
            }
            
            const rowData = record ? [
                dateCellText, record.startTime, record.startLocation || "-", record.endTime, record.endLocation || "-", crossingsText,
                formatAsHoursAndMinutes(record.workMinutes), formatAsHoursAndMinutes(record.nightWorkMinutes || 0)
            ] : [dateCellText, '-', '-', '-', '-', '-', '-', '-'];
            
            let xPos = leftMargin;
            rowData.forEach((data, i) => {
                doc.setFillColor(255, 255, 255);
                if (i === 0 && (dayOfWeek === 6 || dayOfWeek === 0)) {
                    doc.setFillColor(245, 245, 245);
                }
                
                doc.setDrawColor(150, 150, 150);
                doc.rect(xPos, yPos, colWidths[i], rowHeight, 'FD');
                doc.setFontSize(8);
                doc.text(data, xPos + colWidths[i] / 2, yPos + rowHeight / 2, { align: 'center', baseline: 'middle' });
                xPos += colWidths[i];
            });
            yPos += rowHeight;
        }
        
        if (yPos > pageBottom - 20) { doc.addPage(); yPos = 20; }
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(`Gesamt Arbeitszeit: ${formatAsHoursAndMinutes(totalWorkMinutes)}`, leftMargin + tableWidth, yPos + 5, { align: 'right' });
        doc.text(`Gesamt Nachtzeit: ${formatAsHoursAndMinutes(totalNightWorkMinutes)}`, leftMargin + tableWidth, yPos + 11, { align: 'right' });

        doc.save(`Arbeitszeitnachweis-${userName.replace(/ /g,"_")}-${year}-${monthName}.pdf`);
    } catch (e) {
        console.error("PDF generation error:", e);
        showCustomAlert(translations[currentLang].errorPdfGeneration + " " + e.message, 'info');
    }
}
async function sharePDF() {
     const i18n = translations[currentLang];
     if (!currentMonthlyData) { showCustomAlert(i18n.alertGenerateReportFirst, "info"); return; }
    if (!navigator.share) { showCustomAlert(i18n.alertShareNotSupported, "info"); return; }
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const userName = document.getElementById('userNameInput').value || 'N/A';
        const [year, month] = currentMonthlyData.month.split('-');
        const monthName = germanMonths[parseInt(month) - 1];
        const daysInMonth = new Date(year, month, 0).getDate();
        const recordsMap = new Map(currentMonthlyData.records.map(r => [r.date, r]));
        let totalWorkMinutes = 0;
        let totalNightWorkMinutes = 0;
        recordsMap.forEach(record => {
            totalWorkMinutes += record.workMinutes || 0;
            totalNightWorkMinutes += record.nightWorkMinutes || 0;
        });

        doc.setFontSize(18); doc.setFont(undefined, 'bold'); doc.text('ARBEITSZEITNACHWEIS', 105, 15, { align: 'center' });
        doc.setFontSize(14); doc.setFont(undefined, 'normal'); doc.text(`${monthName} ${year}`, 105, 23, { align: 'center' });
        doc.setFontSize(12); doc.text(userName, 105, 31, { align: 'center' });

        let yPos = 40;
        const pageBottom = 280;
        const leftMargin = 15;
        const tableWidth = 180;
        const headers = ['Datum', 'Beginn', 'Ort', 'Ende', 'Ort', 'Grenzübergänge', 'Arbeit', 'Nacht'];
        const colWidths = [25, 15, 30, 15, 30, 35, 15, 15];

        const drawHeader = () => {
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.setDrawColor(150, 150, 150);
            let xPos = leftMargin;
            headers.forEach((h, i) => {
                doc.rect(xPos, yPos, colWidths[i], 7, 'S');
                doc.text(h, xPos + colWidths[i] / 2, yPos + 4.5, { align: 'center' });
                xPos += colWidths[i];
            });
            yPos += 7;
            doc.setFont('Helvetica', 'normal');
        };

        drawHeader();

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(Date.UTC(year, month - 1, day));
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getUTCDay();
            const record = recordsMap.get(dateStr);
            
            const dateDisplay = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.`;
            const dayNameDisplay = germanFullDays[dayOfWeek];
            const dateCellText = `${dateDisplay}\n${dayNameDisplay}`;
            
            const crossingsText = (record && record.crossings && record.crossings.length > 0)
                ? record.crossings.map(c => `${c.from}-${c.to} (${c.time})`).join("\n")
                : '-';

            const dateLines = doc.splitTextToSize(dateCellText, colWidths[0] - 2);
            const startLocLines = doc.splitTextToSize(record?.startLocation || '-', colWidths[2] - 2);
            const endLocLines = doc.splitTextToSize(record?.endLocation || '-', colWidths[4] - 2);
            const crossingsLines = doc.splitTextToSize(crossingsText, colWidths[5] - 2);
            const rowHeight = Math.max(dateLines.length, startLocLines.length, endLocLines.length, crossingsLines.length) * 4.5 + 4;

            if (yPos + rowHeight > pageBottom) {
                doc.addPage();
                yPos = 20;
                drawHeader();
            }
            
            const rowData = record ? [
                dateCellText, record.startTime, record.startLocation || "-", record.endTime, record.endLocation || "-", crossingsText,
                formatAsHoursAndMinutes(record.workMinutes), formatAsHoursAndMinutes(record.nightWorkMinutes || 0)
            ] : [dateCellText, '-', '-', '-', '-', '-', '-', '-'];
            
            let xPos = leftMargin;
            rowData.forEach((data, i) => {
                doc.setFillColor(255, 255, 255);
                if (i === 0 && (dayOfWeek === 6 || dayOfWeek === 0)) {
                    doc.setFillColor(245, 245, 245);
                }
                
                doc.setDrawColor(150, 150, 150);
                doc.rect(xPos, yPos, colWidths[i], rowHeight, 'FD');
                doc.setFontSize(8);
                doc.text(data, xPos + colWidths[i] / 2, yPos + rowHeight / 2, { align: 'center', baseline: 'middle' });
                xPos += colWidths[i];
            });
            yPos += rowHeight;
        }
        
        if (yPos > pageBottom - 20) { doc.addPage(); yPos = 20; }
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(`Gesamt Arbeitszeit: ${formatAsHoursAndMinutes(totalWorkMinutes)}`, leftMargin + tableWidth, yPos + 5, { align: 'right' });
        doc.text(`Gesamt Nachtzeit: ${formatAsHoursAndMinutes(totalNightWorkMinutes)}`, leftMargin + tableWidth, yPos + 11, { align: 'right' });
        
        const pdfBlob = doc.output('blob');
        const fileName = `Arbeitszeitnachweis-${userSettings.userName.replace(/ /g,"_")}-${year}-${monthName}.pdf`;
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        const shareData = { files: [pdfFile], title: `Arbeitszeitnachweis - ${monthName} ${year}`, text: `Anbei mein Arbeitszeitnachweis für ${monthName} ${year}.`, };
        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else { throw new Error(i18n.shareErrorCannotShare); }
    } catch (error) {
        if (error.name === 'AbortError') { console.log(i18n.shareAborted); } 
        else { console.error('Sharing error:', error); showCustomAlert(`${i18n.errorSharing} ${error.message}`, 'info'); }
    }
}

function exportData() { if (records.length === 0) { showCustomAlert(translations[currentLang].alertNoDataToExport, 'info'); return; } const dataStr = JSON.stringify({records, palletRecords, userSettings}, null, 2); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `munkaido_backup_${new Date().toISOString().split("T")[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
function importData() {
    const i18n = translations[currentLang];
    const fileInput = document.getElementById('importFile');
    if (!fileInput.files.length) { showCustomAlert(i18n.alertChooseFile, 'info'); return; }
    showCustomAlert(i18n.alertConfirmImport, 'warning', () => {
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (imported.records && imported.palletRecords && imported.userSettings) {
                    records = imported.records;
                    palletRecords = imported.palletRecords;
                    userSettings = imported.userSettings;
                    
                    localStorage.setItem('workRecords', JSON.stringify(records));
                    localStorage.setItem('palletRecords', JSON.stringify(palletRecords));
                    localStorage.setItem('userSettings', JSON.stringify(userSettings));

                    if (currentUser) {
                        await migrateLocalToFirestore(records, 'records');
                        await migrateLocalToFirestore(palletRecords, 'pallets');
                        await saveSettingsToFirestore();
                    }
                    
                    applyAllSettings();
                    renderApp();
                    showCustomAlert(i18n.alertImportSuccess, 'success');
                } else { throw new Error(i18n.alertImportInvalid); }
            } catch (err) { showCustomAlert(i18n.errorImport + ' ' + err.message, 'info'); }
        };
        reader.readAsText(fileInput.files[0]);
    });
}

function checkForAutoExport() {
    const frequency = userSettings.autoExportFrequency || 'never';
    if (frequency === 'never' || records.length === 0) { return; }
    const lastExportDateStr = localStorage.getItem('lastAutoExportDate');
    if (!lastExportDateStr) { return; }
    const lastExportDate = new Date(lastExportDateStr);
    const today = new Date();
    const diffTime = today - lastExportDate;
    let requiredInterval = 0;
    switch(frequency) {
        case 'daily':   requiredInterval = 24 * 60 * 60 * 1000; break;
        case 'weekly':  requiredInterval = 7 * 24 * 60 * 60 * 1000; break;
        case 'monthly': requiredInterval = 30 * 24 * 60 * 60 * 1000; break;
    }
    if (diffTime > requiredInterval) {
        console.log(`${translations[currentLang].logAutoExportStarted} (${frequency})`);
        exportData();
        localStorage.setItem('lastAutoExportDate', new Date().toISOString());
    }
}
function showTab(tabName) {
    currentActiveTab = tabName;

    if (tabName === 'pallets') {
        document.getElementById('palletDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('palletLicensePlate').value = localStorage.getItem('lastPalletLicensePlate') || '';
        renderPalletUI();
    }
    const allTabs = document.querySelectorAll('.tab');
    const mainTabs = ['live', 'start', 'full-day'];
    const dropdownButton = document.getElementById('dropdown-button');
    const dropdownMenu = document.getElementById('dropdown-menu');
    allTabs.forEach(t => t.classList.remove('tab-active'));
    dropdownButton.classList.remove('tab-active');
    if (mainTabs.includes(tabName)) {
        const tabButton = document.getElementById(`tab-${tabName}`);
        if (tabButton) tabButton.classList.add('tab-active');
        dropdownButton.innerHTML = `<span data-translate-key="menuMore">${translations[currentLang].menuMore}</span> ▼`;
    } else {
        dropdownButton.classList.add('tab-active');
        const selectedTitleEl = dropdownMenu.querySelector(`button[onclick="showTab('${tabName}')"] .dropdown-item-title`);
        if (selectedTitleEl) {
            const selectedTitle = selectedTitleEl.textContent;
            dropdownButton.innerHTML = `${selectedTitle} ▼`;
        }
    }
    document.querySelectorAll('[id^="content-"]').forEach(c => c.classList.add('hidden'));
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    closeDropdown();

    if (tabName === 'start') renderStartTab();
    if (tabName === 'list') renderRecords();
    if (tabName === 'summary') renderSummary();
    if (tabName === 'stats') { statsDate = new Date(); renderStats(); }
    if (tabName === 'report') initMonthlyReport();
    if (tabName === 'tachograph') renderTachographAnalysis();
    if (tabName === 'pallets') renderPalletUI();
    if (tabName === 'help') renderHelp();

    updateAllTexts();
}

function renderDashboard() {
    const i18n = translations[currentLang];
    const container = document.getElementById('dashboard-cards');
    if (!container) return;
    const now = new Date();
    const thisWeek = calculateSummaryForDateRange(getWeekRange(now));
    const lastWeek = calculateSummaryForDateRange(getWeekRange(now, -1));
    const thisMonth = calculateSummaryForMonth(now);

    const cards = [
        { labelKey: 'dashboardDriveThisWeek', value: formatDuration(thisWeek.driveMinutes), color: 'blue' },
        { labelKey: 'dashboardWorkThisWeek', value: formatDuration(thisWeek.workMinutes), color: 'green' },
        { labelKey: 'dashboardDistanceThisMonth', value: `${thisMonth.kmDriven} km`, color: 'orange' },
        { labelKey: 'dashboardDistanceLastWeek', value: `${lastWeek.kmDriven} km`, color: 'indigo' }
    ];

    container.innerHTML = cards.map(card => `
        <div class="bg-${card.color}-50 dark:bg-${card.color}-900/50 border border-${card.color}-200 dark:border-${card.color}-800 rounded-lg p-3 text-center">
            <p class="text-xs text-${card.color}-700 dark:text-${card.color}-200 font-semibold">${i18n[card.labelKey]}</p>
            <p class="text-lg font-bold text-${card.color}-800 dark:text-${card.color}-100 mt-1">${card.value}</p>
        </div>
    `).join('');
}

function renderLiveTabView() {
    renderWeeklyAllowance();
    renderEarliestStart();
    renderDashboard();
}

function renderStartTab() {
    const i18n = translations[currentLang];
    inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
    
    const startForm = document.getElementById('start-new-day-form');
    const progressView = document.getElementById('live-progress-view');
    const summaryContainer = document.getElementById('live-start-summary');

    if (inProgressEntry) {
        startForm.classList.add('hidden');
        progressView.classList.remove('hidden');

        document.getElementById('live-start-time').textContent = `${i18n.startedAt}: ${inProgressEntry.date} ${inProgressEntry.startTime}`;
        
        let summaryHTML = '';
        const hasDriveData = userSettings.showDriveTime && inProgressEntry.weeklyDriveStartStr;
        const hasKmData = userSettings.showKm && inProgressEntry.kmStart > 0;
        const hasLocationData = inProgressEntry.startLocation && inProgressEntry.startLocation.trim() !== '';

        if (hasDriveData || hasKmData || hasLocationData) {
            summaryHTML += `<div class="p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg space-y-2">
                                <h3 class="font-semibold text-gray-800 dark:text-gray-100">${i18n.liveShiftDetailsTitle}</h3>
                                <div class="space-y-1 text-sm">`;

            if (hasLocationData) {
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartLocationLabel}</span>
                                    <span class="font-semibold">${inProgressEntry.startLocation}</span>
                                </div>`;
            }
            if (hasDriveData) {
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartDriveLabel}</span>
                                    <span class="font-semibold">${inProgressEntry.weeklyDriveStartStr}</span>
                                </div>`;
            }
            if (hasKmData) {
                summaryHTML += `<div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1">
                                    <span class="text-gray-500 dark:text-gray-400">${i18n.liveStartKmLabel}</span>
                                    <span class="font-semibold">${inProgressEntry.kmStart} km</span>
                                </div>`;
            }

            summaryHTML += `</div></div>`;
        }
        summaryContainer.innerHTML = summaryHTML;
        
        const liveCrossList = document.getElementById('live-crossings-list');
        const liveCrossFrom = document.getElementById('liveCrossFrom');
        if (inProgressEntry.crossings && inProgressEntry.crossings.length > 0) {
            const crossingsHTML = inProgressEntry.crossings.map(c => 
                `<div class="flex items-center justify-between bg-white dark:bg-gray-700/50 p-2 rounded-md shadow-sm">
                    <div class="flex items-center gap-2">
                        <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        <span class="font-mono font-bold text-indigo-800 dark:text-indigo-200">${c.from}</span>
                        <span class="text-gray-400">→</span>
                        <span class="font-mono font-bold text-indigo-800 dark:text-indigo-200">${c.to}</span>
                    </div>
                    <span class="text-sm font-mono text-gray-600 dark:text-gray-400">${c.time}</span>
                </div>`
            ).join('');
            liveCrossList.innerHTML = `<div class="bg-indigo-50 dark:bg-indigo-900/50 p-3 rounded-lg">
                                        <h4 class="font-bold text-indigo-800 dark:text-indigo-200 text-sm mb-2">${i18n.recordedCrossings}</h4>
                                        <div class="space-y-2">${crossingsHTML}</div>
                                    </div>`;
            liveCrossFrom.value = inProgressEntry.crossings.slice(-1)[0].to;
        } else {
            liveCrossList.innerHTML = '';
            const lastRecordWithCrossing = getSortedRecords().find(r => r.crossings && r.crossings.length > 0);
            liveCrossFrom.value = lastRecordWithCrossing ? lastRecordWithCrossing.crossings.slice(-1)[0].to : '';
        }
        document.getElementById('liveCrossTo').value = '';
        document.getElementById('liveCrossTime').value = new Date().toTimeString().slice(0, 5);

    } else {
        progressView.classList.add('hidden');
        startForm.classList.remove('hidden');
        summaryContainer.innerHTML = ''; 
        loadLastValues(true);
    }
}

function startLiveShift() { 
    inProgressEntry = { 
        date: document.getElementById('liveStartDate').value, 
        startTime: document.getElementById('liveStartTime').value, 
        startLocation: document.getElementById('liveStartLocation').value.trim(), 
        weeklyDriveStartStr: document.getElementById('liveWeeklyDriveStart').value.trim(), 
        kmStart: parseFloat(document.getElementById('liveStartKm').value) || 0, 
        crossings: [] 
    }; 
    if (!inProgressEntry.date || !inProgressEntry.startTime) { 
        showCustomAlert(translations[currentLang].alertMandatoryFields, "info"); 
        return; 
    } 
    localStorage.setItem('inProgressEntry', JSON.stringify(inProgressEntry)); 
    renderStartTab();
    renderLiveTabView();
    updateAllTexts(); 
}

function addLiveCrossing() { const from = document.getElementById('liveCrossFrom').value.trim().toUpperCase(); const to = document.getElementById('liveCrossTo').value.trim().toUpperCase(); const time = document.getElementById('liveCrossTime').value; if (!from || !to || !time) { showCustomAlert(translations[currentLang].alertFillAllFields, "info"); return; } inProgressEntry.crossings.push({ from, to, time }); localStorage.setItem('inProgressEntry', JSON.stringify(inProgressEntry)); renderStartTab(); updateAllTexts(); }
function finalizeShift() { showTab('full-day'); document.getElementById('date').value = new Date().toISOString().split('T')[0]; Object.keys(inProgressEntry).forEach(key => { const el = document.getElementById(key.replace('Str', '')); if (el) el.value = inProgressEntry[key]; }); (inProgressEntry.crossings || []).forEach(c => addCrossingRow(c.from, c.to, c.time)); document.getElementById('endTime').focus(); }

function discardShift() { 
    showCustomAlert(translations[currentLang].discardWorkday + "?", 'warning', () => {
        localStorage.removeItem('inProgressEntry');
        inProgressEntry = null;
        renderStartTab();
        renderLiveTabView();
        updateAllTexts();
    });
}
function getSortedRecords() { return [...(records || [])].sort((a, b) => new Date(`${b.date}T${b.startTime}`) - new Date(`${a.date}T${a.startTime}`)); }
function getLatestRecord() { if (!records || records.length === 0) return null; return getSortedRecords()[0]; }
function loadLastValues(forLiveForm = false) { const lastRecord = getLatestRecord(); const now = new Date(); if (forLiveForm) { document.getElementById('liveStartDate').value = now.toISOString().split('T')[0]; document.getElementById('liveStartTime').value = now.toTimeString().slice(0, 5); if (lastRecord) { document.getElementById('liveStartLocation').value = lastRecord.endLocation || ''; document.getElementById('liveWeeklyDriveStart').value = lastRecord.weeklyDriveEndStr || ''; document.getElementById('liveStartKm').value = lastRecord.kmEnd || ''; } } else { document.getElementById('date').value = now.toISOString().split('T')[0]; if (lastRecord) { document.getElementById('weeklyDriveStart').value = lastRecord.weeklyDriveEndStr || ''; document.getElementById('kmStart').value = lastRecord.kmEnd || ''; document.getElementById('startLocation').value = lastRecord.endLocation || ''; } } }
function resetEntryForm() { ['date', 'startTime', 'endTime', 'startLocation', 'endLocation', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd'].forEach(id => document.getElementById(id).value = ''); const splitRestToggle = document.getElementById('toggleSplitRest'); if(splitRestToggle) { splitRestToggle.checked = false; updateToggleVisuals(splitRestToggle); } document.getElementById('crossingsContainer').innerHTML = ''; editingId = null; updateDisplays(); }
function updateDisplays() {
    const i18n = translations[currentLang];
    const workMinutes = calculateWorkMinutes(document.getElementById('startTime').value, document.getElementById('endTime').value); 
    document.getElementById('workTimeDisplay').textContent = workMinutes > 0 ? `${i18n.workTimeDisplay}: ${formatDuration(workMinutes)}` : ''; 
    const nightMinutes = calculateNightWorkMinutes(document.getElementById('startTime').value, document.getElementById('endTime').value); 
    document.getElementById('nightWorkDisplay').textContent = nightMinutes > 0 ? `${i18n.nightWorkDisplay}: ${formatDuration(nightMinutes)}` : ''; 
    const driveMinutes = Math.max(0, parseTimeToMinutes(document.getElementById('weeklyDriveEnd').value) - parseTimeToMinutes(document.getElementById('weeklyDriveStart').value)); 
    document.getElementById('driveTimeDisplay').textContent = driveMinutes > 0 ? `${i18n.driveTimeTodayDisplay}: ${formatDuration(driveMinutes)}` : ''; 
    const kmDriven = Math.max(0, (parseFloat(document.getElementById('kmEnd').value) || 0) - (parseFloat(document.getElementById('kmStart').value) || 0)); 
    document.getElementById('kmDisplay').textContent = kmDriven > 0 ? `${i18n.kmDrivenDisplay}: ${kmDriven} km` : ''; 
}
['startTime', 'endTime', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime'].forEach(id => { if (document.getElementById(id)) document.getElementById(id).addEventListener('input', updateDisplays); });
function addCrossingRow(from = '', to = '', time = '') {
    const i18n = translations[currentLang];
    const container = document.getElementById('crossingsContainer');
    const lastToInput = container.querySelector('input[id^="crossTo-"]:last-of-type');
    const newFrom = from || (lastToInput ? lastToInput.value.toUpperCase() : '');
    const index = Date.now();
    const newRow = document.createElement('div');
    newRow.className = 'border-t border-gray-200 dark:border-gray-700 pt-3 mt-2 space-y-2';
    newRow.innerHTML = `<div class="grid grid-cols-2 gap-2"><div><input type="text" id="crossFrom-${index}" value="${newFrom}" placeholder="${i18n.fromPlaceholder}" class="w-full p-2 border rounded text-sm uppercase dark:bg-gray-600 dark:border-gray-500"></div><div><div class="flex"><input type="text" id="crossTo-${index}" value="${to}" placeholder="${i18n.toPlaceholder}" class="w-full p-2 border rounded-l text-sm uppercase dark:bg-gray-600 dark:border-gray-500"><button type="button" onclick="fetchCountryCodeFor('crossTo-${index}')" class="bg-blue-500 text-white p-2 rounded-r text-xs" title="${i18n.getCountryCodeGPS}">📍</button></div></div></div><div class="grid grid-cols-2 gap-2"><input type="time" id="crossTime-${index}" value="${time}" onblur="formatTimeInput(this)" class="w-full p-2 border rounded text-sm dark:bg-gray-600 dark:border-gray-500"><button type="button" onclick="this.closest('div.border-t').remove()" class="bg-red-500 text-white p-2 rounded text-sm hover:bg-red-600">${i18n.delete}</button></div>`;
    container.appendChild(newRow);
}
async function fetchLocation() { if (!navigator.geolocation) { showCustomAlert(translations[currentLang].alertGeolocationNotSupported, 'info'); return; } const endLocationInput = document.getElementById('endLocation'); endLocationInput.value = "..."; try { const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })); const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=hu`); if (!response.ok) throw new Error('API error'); const data = await response.json(); endLocationInput.value = data.address.city || data.address.town || data.address.village || 'Unknown location'; } catch (error) { endLocationInput.value = ""; showCustomAlert(translations[currentLang].alertLocationFailed, 'info'); } }

function editRecord(id) {
    const record = records.find(r => r.id === String(id));
    if (!record) return;
    editingId = String(id);
    showTab('full-day');
    Object.keys(record).forEach(key => {
        const el = document.getElementById(key.replace('Str', ''));
        if (el) el.value = record[key] || '';
    });
    const compensationEl = document.getElementById('compensationTime');
    if (compensationEl) { compensationEl.value = record.compensationMinutes ? formatAsHoursAndMinutes(record.compensationMinutes) : ''; }
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) { splitRestToggle.checked = record.isSplitRest || false; updateToggleVisuals(splitRestToggle); }
    document.getElementById('crossingsContainer').innerHTML = '';
    (record.crossings || []).forEach(c => addCrossingRow(c.from, c.to, c.time));
    updateDisplays();
}

async function deleteRecord(id) {
    showCustomAlert(translations[currentLang].alertConfirmDelete, 'warning', async () => {
        const splitData = getSplitRestData();
        delete splitData[id];
        saveSplitRestData(splitData);
        await deleteRecordFromStorage(id);
        records = records.filter(r => r.id !== String(id));
        if (!currentUser) {
            localStorage.setItem('workRecords', JSON.stringify(records));
        }
        renderApp();
        showTab(currentActiveTab);
    });
}
// ...
