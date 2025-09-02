// =======================================================
// ===== GLOBÁLIS VÁLTOZÓK ÉS KONFIGURÁCIÓ ================
// =======================================================

const translations = {
    hu: {
        locale: 'hu-HU',
        months: ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'],
        appTitle: "Munkaidő Nyilvántartó Pro",
        delete: "Törlés",
        ok: "Rendben",
        cancel: "Mégse",
        save: "Mentés",
        cityPlaceholder: "Város",
        fromPlaceholder: "Honnan",
        toPlaceholder: "Hova",
        tabOverview: "Áttekintés",
        tabFullDay: "Teljes nap",
        tabList: "Lista",
        tabPallets: "Raklapok",
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
        saveEntry: "Bejegyzés Mentése",
        workTimeDisplay: "Munkaidő",
        nightWorkDisplay: "Éjszakai (22:00-06:00)",
        driveTimeTodayDisplay: "Mai vezetési idő",
        kmDrivenDisplay: "Megtett km",
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
        statsTitle: "Részletes Statisztikák",
        statsDaily: "Napi",
        statsMonthly: "Havi",
        statsYearly: "Éves",
        statsWorkTime: "Munkaidő",
        statsDriveTime: "Vezetési idő",
        statsNightTime: "Éjszakai munka",
        statsKmDriven: "Megtett kilométer",
        statsNoDataPeriod: "Nincs adat a kiválasztott időszakban.",
        reportTitle: "Havi riport",
        reportMonthSelect: "Hónap kiválasztása",
        reportGenerate: "Riport generálása",
        reportDownloadPDF: "PDF letöltés",
        reportSharePDF: "PDF megosztása",
        reportPrepared: "Riport előkészítve.",
        palletReportGenerate: "Raklap riport generálása",
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
        tachoTitle: "Tachográf Elemzés",
        tachoAllowanceDrive10h: "Fennmaradó 10 órás vezetés",
        tachoAllowanceReducedRest: "Fennmaradó csökk. pihenő",
        tachoCompensation: "Kompenzáció",
        tachoLongRest: "Hosszú pihenő",
        tachoRegularWeeklyRest: "Rendes heti pihenő",
        tachoReducedWeeklyRest: "Csökkentett heti pihenő",
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
        tachoWasWeeklyRest: "Heti pihenő volt?",
        palletsTitle: "Paletta Nyilvántartás",
        palletsBalance: "Aktuális egyenleg:",
        palletsNewTransaction: "Új tranzakció",
        palletsLocationPlaceholder: "Város, cég...",
        palletsQuantity: "Mennyiség",
        palletsQuantityPlaceholder: "Darabszám",
        palletsAction: "Művelet",
        palletsActionTaken: "Felvett",
        palletsActionGiven: "Leadott",
        palletsActionExchange: "1:1 Csere",
        palletsLicensePlate: "Rendszám (opcionális)",
        palletsLicensePlatePlaceholder: "Pl. ABC-123",
        palletsSaveTransaction: "Tranzakció mentése",
        palletsHistory: "Előzmények",
        palletsNoTransactions: "Még nincsenek paletta tranzakciók rögzítve.",
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
        alertConfirmDelete: "Biztosan törölni szeretnéd ezt az elemet?",
        alertConfirmDiscard: "Biztosan elveted a folyamatban lévő munkanapot?",
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
        palletInvalidData: "Kérlek tölts ki minden mezőt (a mennyiségnek pozitívnak kell lennie)!",
        autoBackupOn: "Automatikus mentés bekapcsolva!",
        autoBackupOff: "Automatikus mentés kikapcsolva.",
        settingsSaved: "Beállítások mentve!"
    },
    de: {
        locale: 'de-DE',
        months: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
        appTitle: "Arbeitszeitnachweis Pro",
        delete: "Löschen",
        ok: "Okay",
        cancel: "Abbrechen",
        save: "Speichern",
        cityPlaceholder: "Stadt",
        fromPlaceholder: "Von",
        toPlaceholder: "Nach",
        tabOverview: "Übersicht",
        tabFullDay: "Ganzer Tag",
        tabList: "Liste",
        tabPallets: "Paletten",
        menuMore: "Mehr",
        menuSummary: "Zusammenfassung",
        menuSummaryDesc: "Tägliche, wöchentliche, monatliche Daten",
        menuStats: "Statistik",
        menuStatsDesc: "Detaillierte, blätterbare Diagramme",
        menuTachograph: "Tachograph",
        menuTachographDesc: "Analyse der Lenk- und Ruhezeiten",
        menuReport: "Bericht",
        menuReportDesc: "Druckbare monatliche Abrechnung",
        menuSettings: "Einstellungen",
        menuSettingsDesc: "Datensicherung und persönliche Daten",
        liveOverviewTitle: "Übersicht",
        liveNewDayTitle: "Neuen Arbeitstag starten",
        date: "Datum",
        time: "Uhrzeit",
        location: "Ort",
        weeklyDrive: "Wöchentliche Lenkzeit",
        startKm: "Anfangs-km",
        startWorkday: "Arbeitstag starten",
        workdayInProgress: "Arbeitstag läuft",
        startedAt: "Gestartet am",
        newBorderCrossing: "Neuer Grenzübergang",
        getCountryCodeGPS: "Ländercode per GPS abrufen",
        addBorderCrossing: "Grenzübergang hinzufügen",
        finishShift: "Schicht beenden",
        discardWorkday: "Arbeitstag verwerfen",
        recordedCrossings: "Erfasste Übergänge:",
        dashboardDriveThisWeek: "Lenkzeit diese Woche",
        dashboardWorkThisWeek: "Arbeitszeit diese Woche",
        dashboardDistanceThisMonth: "Distanz diesen Monat",
        dashboardDistanceLastWeek: "Distanz letzte Woche",
        fullDayTitle: "Ganzer Arbeitstag erfassen",
        dateLabelFull: "Datum (Tag des Arbeitsendes)",
        workTimeAndLocation: "Arbeitszeit und Ort",
        startTime: "Startzeit",
        endTime: "Endzeit",
        compensationLabel: "Pauschale / Pause (wird abgezogen)",
        startLocation: "Startort",
        endLocation: "Endort",
        getLocationGPS: "Standort per GPS abrufen",
        borderCrossings: "Grenzübergänge",
        addCrossing: "Neuen Übergang hinzufügen",
        weeklyDriveTimeHours: "Wöchentliche Lenkzeit (Stunden)",
        atDayStart: "Bei Tagesbeginn (hh:mm)",
        atDayEnd: "Bei Tagesende (hh:mm)",
        kmReading: "Kilometerstand",
        endKm: "End-km",
        saveEntry: "Eintrag speichern",
        workTimeDisplay: "Arbeitszeit",
        nightWorkDisplay: "Nachtarbeit (22:00-06:00)",
        driveTimeTodayDisplay: "Heutige Lenkzeit",
        kmDrivenDisplay: "Gefahrene km",
        listTitle: "Einträge",
        noEntries: "Noch keine Einträge vorhanden",
        entryDeparture: "Abfahrt",
        entryArrival: "Ankunft",
        entryWorkTime: "Arbeitszeit",
        entryCompensation: "Pauschale",
        entryNightTime: "Nachtarbeit",
        entryDriveTime: "Lenkzeit",
        entryDistance: "Distanz",
        entryCrossingsLabel: "Grenzübergänge",
        summaryTitle: "Zusammenfassungen",
        summaryToday: "Heute",
        summaryYesterday: "Gestern",
        summaryThisWeek: "Aktuelle Woche",
        summaryLastWeek: "Letzte Woche",
        summaryThisMonth: "Aktueller Monat",
        summaryLastMonth: "Letzter Monat",
        summaryDays: "Tage",
        summaryWork: "Arbeit",
        summaryNight: "Nacht",
        summaryDrive: "Lenkzeit",
        summaryDistance: "Distanz",
        summaryNoData: "Keine Daten",
        statsTitle: "Detaillierte Statistiken",
        statsDaily: "Täglich",
        statsMonthly: "Monatlich",
        statsYearly: "Jährlich",
        statsWorkTime: "Arbeitszeit",
        statsDriveTime: "Lenkzeit",
        statsNightTime: "Nachtarbeit",
        statsKmDriven: "Gefahrene Kilometer",
        statsNoDataPeriod: "Keine Daten für den ausgewählten Zeitraum.",
        reportTitle: "Monatlicher Bericht",
        reportMonthSelect: "Monat auswählen",
        reportGenerate: "Bericht erstellen",
        reportDownloadPDF: "PDF herunterladen",
        reportSharePDF: "PDF teilen",
        reportPrepared: "Bericht vorbereitet.",
        palletReportGenerate: "Palettenbericht erstellen",
        settingsTitle: "Einstellungen und Datenverwaltung",
        settingsSyncTitle: "Cloud-Synchronisation",
        settingsSyncDesc: "Melden Sie sich mit Ihrem Google-Konto an, um Ihre Daten in der Cloud zu speichern und auf mehreren Geräten darauf zuzugreifen.",
        settingsLoginGoogle: "Mit Google-Konto anmelden",
        settingsLoggedInAs: "Angemeldet als:",
        settingsLogout: "Abmelden",
        settingsPersonalData: "Persönliche Daten",
        settingsNameForReports: "Name (für Berichte)",
        settingsNamePlaceholder: "Nachname Vorname",
        settingsSaveData: "Daten speichern",
        settingsAppearance: "Erscheinungsbild",
        settingsLanguage: "Sprache",
        settingsThemeSelect: "Thema auswählen",
        settingsTheme: "Thema",
        settingsThemeAuto: "Automatisch",
        settingsThemeLight: "Hell",
        settingsThemeDark: "Dunkel",
        settingsSpecialFunctions: "Sonderfunktionen",
        settingsFeatureKm: "Kilometererfassung",
        settingsFeatureDriveTime: "Lenkzeiterfassung",
        settingsFeaturePallets: "Palettenverwaltung",
        settingsFeatureCompensation: "Pausen-/Kompensationsabzug",
        settingsExportTitle: "Daten exportieren (Backup)",
        settingsExportDesc: "Speichern Sie alle Ihre Einträge in einer JSON-Datei.",
        settingsAutoExportFreq: "Häufigkeit der auto. Speicherung:",
        settingsFreqNever: "Nie",
        settingsFreqDaily: "Täglich",
        settingsFreqWeekly: "Wöchentlich",
        settingsFreqMonthly: "Monatlich",
        settingsAutoExportDesc: "Beim Start der App wird geprüft, ob eine Speicherung fällig ist.",
        settingsDownloadData: "Daten herunterladen",
        settingsImportTitle: "Daten importieren",
        settingsImportDesc: "Laden Sie eine zuvor gespeicherte Datendatei. Achtung: Dies überschreibt die aktuellen Daten!",
        settingsUploadData: "Daten wiederherstellen",
        settingsAboutCreator: "Erstellt von: Princz Attila",
        settingsVersion: "Version:",
        tachoTitle: "Tachographen-Analyse",
        tachoAllowanceDrive10h: "Verbleibende 10-Std-Fahrten",
        tachoAllowanceReducedRest: "Verbleibende verk. Ruhezeiten",
        tachoCompensation: "Ausgleich",
        tachoLongRest: "Lange Ruhezeit",
        tachoRegularWeeklyRest: "Regelmäßige wöchentliche Ruhezeit",
        tachoReducedWeeklyRest: "Reduzierte wöchentliche Ruhezeit",
        tachoIrregularRest: "Unregelmäßige Ruhezeit",
        tachoSplitRest: "Geteilte Ruhezeit",
        tachoRegularDailyRest: "Regelmäßige tägliche Ruhezeit",
        tachoReducedDailyRest: "reduzierte tägliche Ruhezeit",
        tachoReason13h: "(wegen 13h+ Arbeit)",
        tachoIrregularDrive: "Unregelmäßige Lenkzeit",
        tachoIncreasedDrive: "erhöhte Lenkzeit",
        tachoNormalDrive: "Normale tägliche Lenkzeit",
        tachoRestBeforeShift: "Ruhezeit vor der Schicht",
        tachoDailyDriveTime: "Tägliche Lenkzeit",
        tachoWasWeeklyRest: "War wöchentliche Ruhezeit?",
        palletsTitle: "Palettenverwaltung",
        palletsBalance: "Aktueller Saldo:",
        palletsNewTransaction: "Neue Transaktion",
        palletsLocationPlaceholder: "Stadt, Firma...",
        palletsQuantity: "Menge",
        palletsQuantityPlaceholder: "Stückzahl",
        palletsAction: "Vorgang",
        palletsActionTaken: "Aufgenommen",
        palletsActionGiven: "Abgegeben",
        palletsActionExchange: "1:1 Tausch",
        palletsLicensePlate: "Kennzeichen (optional)",
        palletsLicensePlatePlaceholder: "Z.B. S-AB123",
        palletsSaveTransaction: "Transaktion speichern",
        palletsHistory: "Verlauf",
        palletsNoTransactions: "Noch keine Palettentransaktionen erfasst.",
        alertLoginError: "Anmeldefehler aufgetreten.",
        alertPopupClosed: "Das Anmeldefenster wurde geschlossen.",
        alertPopupBlocked: "Der Browser hat das Pop-up-Fenster blockiert. Bitte erlauben Sie es.",
        alertDataLoadError: "Fehler beim Laden der Daten.",
        alertSaveToCloudError: "Fehler beim Speichern in der Cloud.",
        alertMandatoryFields: "Datum und Arbeitszeit sind erforderlich!",
        alertKmEndLower: "Fehler: Der End-Kilometerstand darf nicht niedriger sein als der Anfangs-Kilometerstand!",
        alertWeeklyDriveEndLower: "Fehler: Die wöchentliche Lenkzeit am Ende des Tages darf nicht geringer sein als am Anfang!",
        alertConfirmZeroValues: "Lenkzeit oder gefahrene Kilometer sind 0. Trotzdem speichern?",
        alertSaveSuccess: "Eintrag erfolgreich gespeichert!",
        alertGeolocationNotSupported: "Ihr Browser unterstützt keine Standortermittlung.",
        alertConfirmDelete: "Möchten Sie dieses Element wirklich löschen?",
        alertConfirmDiscard: "Möchten Sie den laufenden Arbeitstag wirklich verwerfen?",
        alertFillAllFields: "Bitte füllen Sie alle Felder aus!",
        alertNoDataToExport: "Keine Daten zum Exportieren vorhanden!",
        alertChooseFile: "Bitte wählen Sie eine Datei aus!",
        alertConfirmImport: "Möchten Sie wirklich importieren? Die aktuellen Daten werden überschrieben!",
        alertImportSuccess: "Daten erfolgreich importiert!",
        alertImportInvalid: "Ungültiges Dateiformat.",
        alertLocationFailed: "Standortermittlung fehlgeschlagen.",
        alertShareNotSupported: "Ihr Browser unterstützt diese Funktion nicht.",
        alertGenerateReportFirst: "Erstellen Sie zuerst einen Bericht, um ihn zu teilen!",
        alertReportNameMissing: "Um einen Bericht zu erstellen, geben Sie bitte Ihren Namen im Einstellungsmenü ein!",
        palletSaveSuccess: "Transaktion gespeichert!",
        palletInvalidData: "Bitte alle Felder ausfüllen (Menge muss positiv sein)!",
        autoBackupOn: "Automatische Sicherung aktiviert!",
        autoBackupOff: "Automatische Sicherung deaktiviert.",
        settingsSaved: "Einstellungen gespeichert!"
    }
};

let currentLang = localStorage.getItem('language') || (navigator.language.startsWith('de') ? 'de' : 'hu');
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

let records = [];
let palletRecords = [];
let splitRestData = {};
let weeklyRestData = {};

let editingId = null;
let inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
let uniqueLocations = [];
let uniquePalletLocations = [];
let statsView = 'daily';
let statsDate = new Date();
let workTimeChart, driveTimeChart, nightTimeChart, kmChart;
let alertCallback = null;
let currentMonthlyData = null;
// ====== ALKALMAZÁS INDÍTÁSA ======
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadSettings();
    initializeFeatureToggles();
    initEventListeners();
    
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        updateAuthUI(user);
        if (user) {
            console.log("Bejelentkezve:", user.uid);
            const firestoreData = await loadAllFirestoreData();
            records = firestoreData.records;
            palletRecords = firestoreData.pallets;
            splitRestData = firestoreData.splitRest;
            weeklyRestData = firestoreData.weeklyRest;
            
            const localRecords = JSON.parse(localStorage.getItem('workRecords') || '[]');
            if (firestoreData.records.length === 0 && localRecords.length > 0) {
                console.log("Lokális adatok migrálása a felhőbe...");
                await migrateLocalToFirestore();
            }
        } else {
            console.log("Kijelentkezve vagy offline mód.");
            loadAllLocalData();
        }
    
        await runDataMigrations();
        renderApp();
        checkForAutoExport();
    });
});

function initEventListeners() {
    document.getElementById('login-button')?.addEventListener('click', handleGoogleLogin);
    document.getElementById('logout-button')?.addEventListener('click', () => auth.signOut());

    document.getElementById('autoExportSelector').addEventListener('change', (e) => {
        localStorage.setItem('autoExportFrequency', e.target.value);
        if (e.target.value !== 'never') {
            localStorage.setItem('lastAutoExportDate', new Date().toISOString());
            showCustomAlert(translations[currentLang].autoBackupOn, 'success');
        } else {
            showCustomAlert(translations[currentLang].autoBackupOff, 'info');
        }
    });

    document.getElementById('stats-view-daily').onclick = () => { statsView = 'daily'; renderStats(); };
    document.getElementById('stats-view-monthly').onclick = () => { statsView = 'monthly'; renderStats(); };
    document.getElementById('stats-view-yearly').onclick = () => { statsView = 'yearly'; renderStats(); };
    document.getElementById('stats-prev').onclick = () => { navigateStats(-1); };
    document.getElementById('stats-next').onclick = () => { navigateStats(1); };

    document.addEventListener('click', (event) => {
        const dropdownContainer = document.getElementById('dropdown-container');
        if (dropdownContainer && !dropdownContainer.contains(event.target)) {
            closeDropdown();
        }
        if (!event.target.closest('.autocomplete-list')) {
            hideAutocomplete();
        }
    });

    // Input mezők eseménykezelői az azonnali frissítéshez
    ['startTime', 'endTime', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateDisplays);
    });
}

function loadAllLocalData() {
    records = JSON.parse(localStorage.getItem('workRecords') || '[]');
    palletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');
    splitRestData = JSON.parse(localStorage.getItem('splitRestData') || '{}');
    weeklyRestData = JSON.parse(localStorage.getItem('weeklyRestData') || '{}');
}

// ====== FŐ RENDERELŐ FÜGGVÉNY ======
function renderApp() {
    updateAllTexts();
    applyFeatureToggles();
    renderWeeklyAllowance();
    
    const activeTabId = document.querySelector('.tab-active')?.id;
    const activeTabName = activeTabId ? activeTabId.replace('tab-', '') : 'live';

    // Csak a releváns fül tartalmát rendereljük újra a teljesítmény optimalizálása érdekében
    switch(activeTabName) {
        case 'list': renderRecords(); break;
        case 'summary': renderSummary(); break;
        case 'stats': renderStats(); break;
        case 'report': initMonthlyReport(); break;
        case 'tachograph': renderTachographAnalysis(); break;
        case 'pallets': renderPalletRecords(); break;
        case 'live':
        default:
            renderLiveTabView(); break;
    }
    
    updateUniqueLocations();
    updateUniquePalletLocations();
    initAllAutocomplete();
}

// ====== ADATKEZELÉS (FIREBASE & LOCALSTORAGE) ======

async function loadAllFirestoreData() {
    if (!currentUser) return { records: [], pallets: [], splitRest: {}, weeklyRest: {} };
    try {
        const [recordsSnap, palletsSnap, tachoSnap] = await Promise.all([
            db.collection('users').doc(currentUser.uid).collection('records').get(),
            db.collection('users').doc(currentUser.uid).collection('pallets').get(),
            db.collection('users').doc(currentUser.uid).collection('tachograph').doc('settings').get()
        ]);
        const tachoData = tachoSnap.exists ? tachoSnap.data() : {};
        return {
            records: recordsSnap.docs.map(doc => doc.data()),
            pallets: palletsSnap.docs.map(doc => doc.data()),
            splitRest: tachoData.splitRestData || {},
            weeklyRest: tachoData.weeklyRestData || {}
        };
    } catch (error) {
        console.error("Hiba az adatok letöltésekor:", error);
        showCustomAlert(translations[currentLang].alertDataLoadError, 'info');
        return { records: [], pallets: [], splitRest: {}, weeklyRest: {} };
    }
}

async function migrateLocalToFirestore() {
    if (!currentUser) return;
    loadAllLocalData();
    const batch = db.batch();

    records.forEach(record => {
        const docRef = db.collection('users').doc(currentUser.uid).collection('records').doc(String(record.id));
        batch.set(docRef, record);
    });
    palletRecords.forEach(record => {
        const docRef = db.collection('users').doc(currentUser.uid).collection('pallets').doc(String(record.id));
        batch.set(docRef, record);
    });
    const tachoRef = db.collection('users').doc(currentUser.uid).collection('tachograph').doc('settings');
    batch.set(tachoRef, { splitRestData, weeklyRestData });
    
    try {
        await batch.commit();
        console.log("Lokális adatok migrálva a felhőbe.");
    } catch (error) {
        console.error("Hiba a migrálás során:", error);
    }
}

async function handleGoogleLogin() {
    const loginButton = document.getElementById('login-button');
    const originalContent = loginButton.innerHTML;
    loginButton.disabled = true;
    loginButton.innerHTML = '...';
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        let i18n = translations[currentLang];
        let message = i18n.alertLoginError;
        if (error.code === 'auth/popup-closed-by-user') message = i18n.alertPopupClosed;
        else if (error.code === 'auth/popup-blocked') message = i18n.alertPopupBlocked;
        showCustomAlert(message, 'info');
    } finally {
        loginButton.disabled = false;
        loginButton.innerHTML = originalContent;
        updateAllTexts(); // Frissítjük a szöveget a gombon
    }
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

async function saveRecord(record) {
    if (editingId) {
        records = records.map(r => r.id === editingId ? record : r);
    } else {
        records.push(record);
    }
    
    if (currentUser) {
        try {
            await db.collection('users').doc(currentUser.uid).collection('records').doc(String(record.id)).set(record);
        } catch (error) {
            console.error("Hiba a Firestore-ba mentéskor:", error);
            showCustomAlert(translations[currentLang].alertSaveToCloudError, 'info');
        }
    } else {
        localStorage.setItem('workRecords', JSON.stringify(records));
    }
}

async function deleteRecordFromStorage(id) {
    records = records.filter(r => r.id !== String(id));
    if (currentUser) {
        try {
            await db.collection('users').doc(currentUser.uid).collection('records').doc(String(id)).delete();
        } catch (error) {
            console.error("Hiba a Firestore-ból való törléskor:", error);
            showCustomAlert(translations[currentLang].alertSaveToCloudError, 'info');
        }
    } else {
        localStorage.setItem('workRecords', JSON.stringify(records));
    }
}

async function saveTachographData() {
    if (currentUser) {
        try {
            const tachoRef = db.collection('users').doc(currentUser.uid).collection('tachograph').doc('settings');
            await tachoRef.set({ splitRestData, weeklyRestData });
        } catch (error) {
            console.error("Hiba a tachográf adatok mentésekor:", error);
        }
    } else {
        localStorage.setItem('splitRestData', JSON.stringify(splitRestData));
        localStorage.setItem('weeklyRestData', JSON.stringify(weeklyRestData));
    }
}

// ====== ADAT MIGRÁCIÓK ======
async function runDataMigrations() {
    if (localStorage.getItem('nightWorkRecalculated_v22_06')) return;

    console.log('Éjszakai idők újraszámítása a 22:00-06:00 szabály szerint...');
    let updatedCount = 0;
    const updatedRecords = records.map(record => {
        const newNightWorkMinutes = calculateNightWorkMinutes(record.startTime, record.endTime);
        if (record.nightWorkMinutes !== newNightWorkMinutes) {
            record.nightWorkMinutes = newNightWorkMinutes;
            updatedCount++;
        }
        return record;
    });

    if (updatedCount > 0) {
        records = updatedRecords;
        if (currentUser) {
            const batch = db.batch();
            records.forEach(record => {
                const docRef = db.collection('users').doc(currentUser.uid).collection('records').doc(String(record.id));
                batch.update(docRef, { nightWorkMinutes: record.nightWorkMinutes });
            });
            await batch.commit();
        } else {
            localStorage.setItem('workRecords', JSON.stringify(records));
        }
        console.log(`${updatedCount} bejegyzés éjszakai ideje frissítve.`);
    }
    localStorage.setItem('nightWorkRecalculated_v22_06', 'true');
}

// ====== NYELVI ÉS UI FUNKCIÓK ======

function setLanguage(lang) {
    if (['hu', 'de'].includes(lang)) {
        currentLang = lang;
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang;
        renderApp();
    }
}

function updateAllTexts() {
    const i18n = translations[currentLang];
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.dataset.translateKey;
        const translation = i18n[key];
        if (translation !== undefined) {
            if (el.placeholder !== undefined) el.placeholder = translation;
            else if (el.title !== undefined && (el.tagName === 'BUTTON' || el.tagName === 'A')) el.title = translation;
            else el.textContent = translation;
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
            btn.classList.remove('bg-blue-600', 'border-blue-500', 'font-bold');
            if ((currentLang === 'hu' && btn.innerText.includes('Magyar')) || (currentLang === 'de' && btn.innerText.includes('Deutsch'))) {
                btn.classList.add('bg-blue-100', 'border-blue-500', 'font-bold');
            }
        });
    }
}
// ====== PDF GENERÁLÁS (REFAKTORÁLT) ======

function generatePdfDocument(userName, monthlyData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const [year, month] = monthlyData.month.split('-');
    // A riport nyelve mindig német, a megadott sablon szerint.
    const monthName = translations.de.months[parseInt(month) - 1]; 
    const germanFullDays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const daysInMonth = new Date(year, month, 0).getDate();
    const recordsMap = new Map(monthlyData.records.map(r => [r.date, r]));
    let totalWorkMinutes = 0, totalNightWorkMinutes = 0;
    recordsMap.forEach(record => {
        totalWorkMinutes += record.workMinutes || 0;
        totalNightWorkMinutes += record.nightWorkMinutes || 0;
    });

    doc.setFontSize(18); doc.setFont(undefined, 'bold'); doc.text('ARBEITSZEITNACHWEIS', 105, 15, { align: 'center' });
    doc.setFontSize(14); doc.setFont(undefined, 'normal'); doc.text(`${monthName} ${year}`, 105, 23, { align: 'center' });
    doc.setFontSize(12); doc.text(userName, 105, 31, { align: 'center' });
    
    const head = [['Datum', 'Beginn', 'Ort', 'Ende', 'Ort', 'Grenzübergänge', 'Arbeit', 'Nacht']];
    const body = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(Date.UTC(year, month - 1, day));
        const dateStr = currentDate.toISOString().split('T')[0];
        const record = recordsMap.get(dateStr);
        const dayName = germanFullDays[currentDate.getUTCDay()];
        const dateCellText = `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.\n${dayName}`;

        if (record) {
            body.push([
                dateCellText,
                record.startTime || '-',
                record.startLocation || "-",
                record.endTime || '-',
                record.endLocation || "-",
                (record.crossings && record.crossings.length > 0) ? record.crossings.map(c => `${c.from}-${c.to} (${c.time})`).join("\n") : '-',
                formatAsHoursAndMinutes(record.workMinutes),
                formatAsHoursAndMinutes(record.nightWorkMinutes || 0)
            ]);
        } else {
            body.push([dateCellText, '-', '-', '-', '-', '-', '-', '-']);
        }
    }

    doc.autoTable({
        head: head,
        body: body,
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 20 }, 2: { cellWidth: 25 }, 4: { cellWidth: 25 }, 5: { cellWidth: 30 }
        }
    });

    const finalY = doc.lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Gesamt Arbeitszeit: ${formatAsHoursAndMinutes(totalWorkMinutes)}`, 195, finalY + 10, { align: 'right' });
    doc.text(`Gesamt Nachtzeit: ${formatAsHoursAndMinutes(totalNightWorkMinutes)}`, 195, finalY + 16, { align: 'right' });
    
    return doc;
}

function exportToPDF() {
    const i18n = translations[currentLang];
    if (!currentMonthlyData) {
        showCustomAlert(i18n.alertGenerateReportFirst, "info");
        return;
    }
    const userName = document.getElementById('userNameInput').value.trim();
    if (!userName) {
        showCustomAlert(i18n.alertReportNameMissing, 'info');
        showTab('settings');
        return;
    }
    
    try {
        const doc = generatePdfDocument(userName, currentMonthlyData);
        const [year, month] = currentMonthlyData.month.split('-');
        const monthName = translations.de.months[parseInt(month) - 1];
        doc.save(`Arbeitszeitnachweis-${userName.replace(/ /g, "_")}-${year}-${monthName}.pdf`);
    } catch (e) {
        console.error("PDF generálási hiba:", e);
        showCustomAlert("Hiba a PDF generálás közben: " + e.message, 'info');
    }
}

async function sharePDF() {
     const i18n = translations[currentLang];
     if (!currentMonthlyData) {
        showCustomAlert(i18n.alertGenerateReportFirst, "info");
        return;
     }
    if (!navigator.share) {
        showCustomAlert(i18n.alertShareNotSupported, "info");
        return;
    }
    const userName = document.getElementById('userNameInput').value.trim();
    if (!userName) {
        showCustomAlert(i18n.alertReportNameMissing, 'info');
        showTab('settings');
        return;
    }

    try {
        const doc = generatePdfDocument(userName, currentMonthlyData);
        const pdfBlob = doc.output('blob');
        const [year, month] = currentMonthlyData.month.split('-');
        const monthName = translations.de.months[parseInt(month) - 1];
        const fileName = `Arbeitszeitnachweis-${userName.replace(/ /g,"_")}-${year}-${monthName}.pdf`;
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        const shareData = {
            files: [pdfFile],
            title: `Arbeitszeitnachweis - ${monthName} ${year}`,
            text: `Anbei mein Arbeitszeitnachweis für ${monthName} ${year}.`,
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            throw new Error('Ezt a fájlt nem lehet megosztani.');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Megosztás megszakítva.');
        } else {
            console.error('Hiba a megosztás során:', error);
            showCustomAlert(`Hiba a megosztás során: ${error.message}`, 'info');
        }
    }
}

// ====== ADATBEVITEL ÉS MENTÉS ======
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
    if (recordData.kmEnd > 0 && recordData.kmEnd < recordData.kmStart) {
        showCustomAlert(i18n.alertKmEndLower, 'info');
        return;
    }
    if (parseTimeToMinutes(recordData.weeklyDriveEndStr) > 0 && parseTimeToMinutes(recordData.weeklyDriveEndStr) < parseTimeToMinutes(recordData.weeklyDriveStartStr)) {
        showCustomAlert(i18n.alertWeeklyDriveEndLower, 'info');
        return;
    }

    const compensationMinutes = parseTimeToMinutes(recordData.compensationTime) || 0;
    const grossWorkMinutes = calculateWorkMinutes(recordData.startTime, recordData.endTime);

    const newRecord = {
        id: editingId || String(Date.now()),
        date: recordData.date,
        startTime: recordData.startTime,
        endTime: recordData.endTime,
        startLocation: recordData.startLocation,
        endLocation: recordData.endLocation,
        weeklyDriveStartStr: recordData.weeklyDriveStartStr,
        weeklyDriveEndStr: recordData.weeklyDriveEndStr,
        kmStart: recordData.kmStart,
        kmEnd: recordData.kmEnd,
        isSplitRest: recordData.isSplitRest,
        crossings: recordData.crossings,
        workMinutes: Math.max(0, grossWorkMinutes - compensationMinutes),
        compensationMinutes: compensationMinutes,
        nightWorkMinutes: calculateNightWorkMinutes(recordData.startTime, recordData.endTime),
        driveMinutes: Math.max(0, parseTimeToMinutes(recordData.weeklyDriveEndStr) - parseTimeToMinutes(recordData.weeklyDriveStartStr)),
        kmDriven: Math.max(0, recordData.kmEnd - recordData.kmStart)
    };
    
    if (newRecord.isSplitRest) {
        splitRestData[newRecord.id] = true;
    } else {
        delete splitRestData[newRecord.id];
    }
    await saveTachographData();

    const proceedWithSave = async () => {
        await saveRecord(newRecord);
        showCustomAlert(i18n.alertSaveSuccess, 'success', () => {
            if (inProgressEntry) {
                localStorage.removeItem('inProgressEntry');
                inProgressEntry = null;
            }
            editingId = null;
            resetEntryForm();
            showTab('list');
        });
    };
    
    if ((newRecord.driveMinutes === 0 || newRecord.kmDriven === 0) && !isEditing) {
        showCustomAlert(i18n.alertConfirmZeroValues, 'warning', proceedWithSave);
    } else {
        await proceedWithSave();
    }
}

function discardShift() {
    showCustomAlert(translations[currentLang].alertConfirmDiscard, 'warning', () => {
        localStorage.removeItem('inProgressEntry');
        inProgressEntry = null;
        renderLiveTabView();
    });
}

function deleteRecord(id) {
    showCustomAlert(translations[currentLang].alertConfirmDelete, 'warning', async () => {
        delete splitRestData[id];
        delete weeklyRestData[id];
        await saveTachographData();
        await deleteRecordFromStorage(id);
        renderApp();
    });
}

function importData() {
    const i18n = translations[currentLang];
    const fileInput = document.getElementById('importFile');
    if (!fileInput.files.length) {
        showCustomAlert(i18n.alertChooseFile, 'info');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) { throw new Error(i18n.alertImportInvalid); }
            
            showCustomAlert(i18n.alertConfirmImport, 'warning', async () => {
                records = imported;
                if (currentUser) {
                    await migrateLocalToFirestore();
                } else {
                    localStorage.setItem('workRecords', JSON.stringify(records));
                }
                renderApp();
                showCustomAlert(i18n.alertImportSuccess, 'success');
            });
        } catch (err) {
            showCustomAlert('Hiba: ' + err.message, 'info');
        }
    };
    reader.readAsText(fileInput.files[0]);
}

// ====== LAPFÜLEK ÉS NÉZETEK LOGIKÁJA ======

function showTab(tabName, isUiRefreshOnly = false) {
    document.querySelectorAll('[id^="content-"]').forEach(c => c.classList.add('hidden'));
    document.getElementById(`content-${tabName}`).classList.remove('hidden');

    const allTabs = document.querySelectorAll('.tab');
    const mainTabs = ['live', 'full-day', 'list', 'pallets'];
    const dropdownButton = document.getElementById('dropdown-button');
    const dropdownMenu = document.getElementById('dropdown-menu');
    allTabs.forEach(t => t.classList.remove('tab-active'));
    dropdownButton.classList.remove('tab-active');

    if (mainTabs.includes(tabName)) {
        document.getElementById(`tab-${tabName}`).classList.add('tab-active');
        dropdownButton.innerHTML = `<span data-translate-key="menuMore">${translations[currentLang].menuMore}</span> ▼`;
    } else {
        dropdownButton.classList.add('tab-active');
        const selectedTitleEl = dropdownMenu.querySelector(`button[onclick="showTab('${tabName}')"] .dropdown-item-title`);
        if (selectedTitleEl) {
            const selectedTitle = selectedTitleEl.textContent;
            dropdownButton.innerHTML = `${selectedTitle} ▼`;
        }
    }
    
    closeDropdown();

    if (isUiRefreshOnly) return;

    // Logika futtatása csak akkor, ha a felhasználó aktívan váltott fület
    switch(tabName) {
        case 'list': renderRecords(); break;
        case 'summary': renderSummary(); break;
        case 'stats': statsDate = new Date(); renderStats(); break;
        case 'report': initMonthlyReport(); break;
        case 'tachograph': renderTachographAnalysis(); break;
        case 'pallets':
            document.getElementById('palletDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('palletLicensePlate').value = localStorage.getItem('lastPalletLicensePlate') || '';
            handlePalletActionChange();
            renderPalletRecords();
            break;
        case 'live':
        default:
             renderLiveTabView();
             break;
    }
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
        <div class="bg-${card.color}-50 dark:bg-${card.color}-900/50 border border-${card.color}-200 dark:border-${card.color}-700 rounded-lg p-3 text-center">
            <p class="text-xs text-${card.color}-700 dark:text-${card.color}-300 font-semibold">${i18n[card.labelKey]}</p>
            <p class="text-lg font-bold text-${card.color}-800 dark:text-${card.color}-200 mt-1">${card.value}</p>
        </div>
    `).join('');
}
function renderLiveTabView() {
    const i18n = translations[currentLang];
    inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
    const startView = document.getElementById('live-start-view');
    const progressView = document.getElementById('live-progress-view');
    if (inProgressEntry) {
        startView.classList.add('hidden');
        progressView.classList.remove('hidden');
        document.getElementById('live-start-time').textContent = `${i18n.startedAt}: ${inProgressEntry.date} ${inProgressEntry.startTime}`;
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
        startView.classList.remove('hidden');
        renderDashboard();
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
    renderLiveTabView();
    updateAllTexts();
}

function addLiveCrossing() {
    const from = document.getElementById('liveCrossFrom').value.trim().toUpperCase();
    const to = document.getElementById('liveCrossTo').value.trim().toUpperCase();
    const time = document.getElementById('liveCrossTime').value;
    if (!from || !to || !time) {
        showCustomAlert(translations[currentLang].alertFillAllFields, "info");
        return;
    }
    inProgressEntry.crossings.push({ from, to, time });
    localStorage.setItem('inProgressEntry', JSON.stringify(inProgressEntry));
    renderLiveTabView();
}

function finalizeShift() {
    showTab('full-day');
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    document.getElementById('startTime').value = inProgressEntry.startTime;
    document.getElementById('startLocation').value = inProgressEntry.startLocation;
    document.getElementById('weeklyDriveStart').value = inProgressEntry.weeklyDriveStartStr;
    document.getElementById('kmStart').value = inProgressEntry.kmStart;
    
    document.getElementById('crossingsContainer').innerHTML = '';
    (inProgressEntry.crossings || []).forEach(c => addCrossingRow(c.from, c.to, c.time));
    document.getElementById('endTime').focus();
    updateDisplays();
}

function getSortedRecords() {
    return [...(records || [])].sort((a, b) => new Date(`${b.date || "1970-01-01"}T${b.startTime || "00:00"}`) - new Date(`${a.date || "1970-01-01"}T${a.startTime || "00:00"}`));
}

function getLatestRecord() {
    if (!records || records.length === 0) return null;
    return getSortedRecords()[0];
}

function loadLastValues(forLiveForm = false) {
    const lastRecord = getLatestRecord();
    const now = new Date();
    if (forLiveForm) {
        document.getElementById('liveStartDate').value = now.toISOString().split('T')[0];
        document.getElementById('liveStartTime').value = now.toTimeString().slice(0, 5);
        if (lastRecord) {
            document.getElementById('liveStartLocation').value = lastRecord.endLocation || '';
            document.getElementById('liveWeeklyDriveStart').value = lastRecord.weeklyDriveEndStr || '';
            document.getElementById('liveStartKm').value = lastRecord.kmEnd || '';
        }
    } else {
        document.getElementById('date').value = now.toISOString().split('T')[0];
        if (lastRecord) {
            document.getElementById('weeklyDriveStart').value = lastRecord.weeklyDriveEndStr || '';
            document.getElementById('kmStart').value = lastRecord.kmEnd || '';
            document.getElementById('startLocation').value = lastRecord.endLocation || '';
        }
    }
}

function resetEntryForm() {
    ['date', 'startTime', 'endTime', 'startLocation', 'endLocation', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        splitRestToggle.checked = false;
        updateToggleVisuals(splitRestToggle);
    }
    document.getElementById('crossingsContainer').innerHTML = '';
    editingId = null;
    updateDisplays();
}

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

function addCrossingRow(from = '', to = '', time = '') {
    const i18n = translations[currentLang];
    const container = document.getElementById('crossingsContainer');
    const lastToInput = container.querySelector('input[id^="crossTo-"]:last-of-type');
    const newFrom = from || (lastToInput ? lastToInput.value.toUpperCase() : '');
    const index = Date.now();
    const newRow = document.createElement('div');
    newRow.className = 'border-t pt-3 mt-2 space-y-2';
    newRow.innerHTML = `<div class="grid grid-cols-2 gap-2"><div><input type="text" id="crossFrom-${index}" value="${newFrom}" placeholder="${i18n.fromPlaceholder}" class="w-full p-2 border rounded text-sm uppercase"></div><div><div class="flex"><input type="text" id="crossTo-${index}" value="${to}" placeholder="${i18n.toPlaceholder}" class="w-full p-2 border rounded-l text-sm uppercase"><button type="button" onclick="fetchCountryCodeFor('crossTo-${index}')" class="bg-blue-500 text-white p-2 rounded-r text-xs" title="${i18n.getCountryCodeGPS}">📍</button></div></div></div><div class="grid grid-cols-2 gap-2"><input type="time" id="crossTime-${index}" value="${time || new Date().toTimeString().slice(0, 5)}" onblur="formatTimeInput(this)" class="w-full p-2 border rounded text-sm"><button onclick="this.closest('.border-t').remove()" class="bg-red-500 text-white p-2 rounded text-sm hover:bg-red-600">${i18n.delete}</button></div>`;
    container.appendChild(newRow);
}

async function fetchLocation() {
    const i18n = translations[currentLang];
    if (!navigator.geolocation) {
        showCustomAlert(i18n.alertGeolocationNotSupported, 'info');
        return;
    }
    const endLocationInput = document.getElementById('endLocation');
    endLocationInput.value = "...";
    try {
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=${currentLang}`);
        if (!response.ok) throw new Error('API hiba');
        const data = await response.json();
        endLocationInput.value = data.address.city || data.address.town || data.address.village || 'Ismeretlen hely';
    } catch (error) {
        endLocationInput.value = "";
        showCustomAlert(i18n.alertLocationFailed, 'info');
    }
}

async function fetchCountryCodeFor(inputId) {
    const i18n = translations[currentLang];
    const inputElement = document.getElementById(inputId);
    if (!inputElement || !navigator.geolocation) return;
    inputElement.value = "...";
    try {
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=en`);
        if (!response.ok) throw new Error('API hiba');
        const data = await response.json();
        const countryCode = data.address.country_code;
        const isoToVehicleCode = { 'at': 'A', 'de': 'D', 'hu': 'H', 'sk': 'SK', 'si': 'SLO', 'it': 'I', 'pl': 'PL', 'cz': 'CZ', 'ro': 'RO', 'ch': 'CH', 'fr': 'F', 'nl': 'NL', 'be': 'B', 'lu': 'L', 'es': 'E', 'gb': 'UK' };
        inputElement.value = isoToVehicleCode[countryCode] || (countryCode || 'N/A').toUpperCase();
    } catch (error) {
        inputElement.value = "";
        showCustomAlert(i18n.alertLocationFailed, 'info');
    }
}

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
    if (compensationEl) {
        compensationEl.value = record.compensationMinutes ? formatAsHoursAndMinutes(record.compensationMinutes) : '';
    }

    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        splitRestToggle.checked = record.isSplitRest || false;
        updateToggleVisuals(splitRestToggle);
    }

    document.getElementById('crossingsContainer').innerHTML = '';
    (record.crossings || []).forEach(c => addCrossingRow(c.from, c.to, c.time));
    updateDisplays();
}

function renderRecords() {
    const i18n = translations[currentLang];
    const container = document.getElementById('recordsContent');
    if (!container) return;
    
    const sorted = getSortedRecords();
    if (sorted.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-8">${i18n.noEntries}</p>`;
        return;
    }

    const locale = i18n.locale;
    const shortDateOpts = { month: '2-digit', day: '2-digit' };
    const longDateOpts = { year: 'numeric', month: 'long', day: 'numeric' };

    container.innerHTML = sorted.map(r => {
        const d = new Date(r.date);
        const day = d.getUTCDay();
        const weekendClass = (day === 6 || day === 0) ? 'bg-red-50 dark:bg-red-900/20' : '';
        const isOvernight = new Date(`1970-01-01T${r.endTime}`) < new Date(`1970-01-01T${r.startTime}`);
        let startDate = new Date(r.date + 'T00:00:00');
        const endDate = new Date(r.date + 'T00:00:00');
        if (isOvernight) { startDate.setDate(startDate.getDate() - 1); }
        
        const formatShortDate = (dt) => dt.toLocaleDateString(locale, shortDateOpts);
        const dateDisplay = isOvernight 
            ? `${startDate.toLocaleDateString(locale, longDateOpts)} - ${endDate.toLocaleDateString(locale, longDateOpts)}` 
            : endDate.toLocaleDateString(locale, longDateOpts);

        return `<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3 text-sm shadow-sm ${weekendClass}">
            <div class="flex items-center justify-between mb-2">
                <div class="font-semibold">${dateDisplay}</div>
                <div>
                    <button onclick="editRecord('${r.id}')" class="text-blue-500 p-1">✏️</button>
                    <button onclick="deleteRecord('${r.id}')" class="text-red-500 p-1">🗑️</button>
                </div>
            </div>
            <div class="space-y-1">
                <div class="flex justify-between"><span>${i18n.entryDeparture}:</span><span>${isOvernight ? formatShortDate(startDate) : ''} ${r.startTime} (${r.startLocation || "N/A"})</span></div>
                <div class="flex justify-between"><span>${i18n.entryArrival}:</span><span>${formatShortDate(endDate)} ${r.endTime} (${r.endLocation || "N/A"})</span></div>
                <div class="flex justify-between border-t pt-1 mt-1 dark:border-gray-700"><span>${i18n.entryWorkTime}:</span><span class="font-bold">${formatDuration(r.workMinutes)}</span></div>
                ${r.compensationMinutes > 0 ? `<div class="flex justify-between text-yellow-700 dark:text-yellow-500 text-xs"><span>&nbsp;&nbsp;└ ${i18n.entryCompensation}:</span><span>-${formatDuration(r.compensationMinutes)}</span></div>` : ''}
                <div class="flex justify-between"><span>${i18n.entryNightTime}:</span><span class="text-purple-600 dark:text-purple-400">${formatDuration(r.nightWorkMinutes || 0)}</span></div>
                <div class="flex justify-between"><span>${i18n.entryDriveTime}:</span><span class="text-blue-700 dark:text-blue-400">${formatDuration(r.driveMinutes)}</span></div>
                <div class="flex justify-between"><span>${i18n.entryDistance}:</span><span>${r.kmDriven} km</span></div>
                ${(r.crossings && r.crossings.length > 0) ? `<div class="border-t pt-2 mt-2 dark:border-gray-700"><p class="font-semibold text-xs text-indigo-700 dark:text-indigo-400">${i18n.entryCrossingsLabel}:</p><div class="text-xs text-gray-600 dark:text-gray-400 pl-2">${r.crossings.map(c => `<span>${c.from} - ${c.to} (${c.time})</span>`).join("<br>")}</div></div>` : ""}
            </div>
        </div>`;
    }).join('');
}

// ====== A FÁJL VÉGE ======