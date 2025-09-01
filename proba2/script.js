// =======================================================
// ===== I18N FORDÍTÁSOK (v8.03 javított) ===============
// =======================================================
const translations = {
    hu: {
        locale: 'hu-HU',
        months: ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'],
        // ... (a többi magyar fordítás változatlan)
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
        nightWorkDisplay: "Éjszakai (20:00-05:00)",
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
        // ... (a többi német fordítás változatlan)
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
        nightWorkDisplay: "Nachtarbeit (20:00-05:00)",
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

// ====== GLOBÁLIS VÁLTOZÓK ======
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;
let records = [];
let palletRecords = [];
let editingId = null;
let inProgressEntry = null;
let uniqueLocations = [];
let uniquePalletLocations = [];
let statsView = 'daily';
let statsDate = new Date();
let workTimeChart, driveTimeChart, nightTimeChart, kmChart;
let currentMonthlyData = null;
let splitRestData = {};
let weeklyRestData = {};
let alertCallback = null;
let currentLang = localStorage.getItem('language') || (navigator.language.startsWith('de') ? 'de' : 'hu');

// ====== ALKALMAZÁS INDÍTÁSA ======
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    loadSettings();
    initializeFeatureToggles();
    initEventListeners();

    // Firebase Auth State Listener
    auth.onAuthStateChanged(async user => {
        currentUser = user;
        updateAuthUI(user);
        if (user) {
            console.log("Bejelentkezve:", user.uid);
            const firestoreRecords = await loadAllFirestoreData();
            const localRecords = JSON.parse(localStorage.getItem('workRecords') || '[]');
            if (firestoreRecords.records.length === 0 && localRecords.length > 0) {
                await migrateLocalToFirestore();
                records = localRecords;
                palletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');
                splitRestData = JSON.parse(localStorage.getItem('splitRestData') || '{}');
                weeklyRestData = JSON.parse(localStorage.getItem('weeklyRestData') || '{}');
            } else {
                records = firestoreRecords.records;
                palletRecords = firestoreRecords.pallets;
                splitRestData = firestoreRecords.splitRest;
                weeklyRestData = firestoreRecords.weeklyRest;
            }
        } else {
            console.log("Kijelentkezve.");
            loadAllLocalData();
        }
        inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');
        await runDataMigrations();
        renderApp();
        checkForAutoExport();
    });
});

// ====== INICIALIZÁCIÓ ======
function initEventListeners() {
    document.getElementById('login-button')?.addEventListener('click', handleLogin);
    document.getElementById('logout-button')?.addEventListener('click', () => auth.signOut());
    document.getElementById('autoExportSelector').addEventListener('change', handleAutoExportChange);
    document.getElementById('stats-view-daily').onclick = () => { statsView = 'daily'; renderStats(); };
    document.getElementById('stats-view-monthly').onclick = () => { statsView = 'monthly'; renderStats(); };
    document.getElementById('stats-view-yearly').onclick = () => { statsView = 'yearly'; renderStats(); };
    document.getElementById('stats-prev').onclick = () => { navigateStats(-1); };
    document.getElementById('stats-next').onclick = () => { navigateStats(1); };
    document.addEventListener('click', (event) => {
        const dropdownContainer = document.getElementById('dropdown-container');
        if (dropdownContainer && !dropdownContainer.contains(event.target)) { closeDropdown(); }
        if (!event.target.closest('.autocomplete-list')) { hideAutocomplete(); }
    });
    // ...további eseménykezelők, amelyek a DOM betöltődése után szükségesek
}

function loadAllLocalData() {
    records = JSON.parse(localStorage.getItem('workRecords') || '[]');
    palletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');
    splitRestData = JSON.parse(localStorage.getItem('splitRestData') || '{}');
    weeklyRestData = JSON.parse(localStorage.getItem('weeklyRestData') || '{}');
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

// ====== AUTHENTIKÁCIÓ ======
async function handleLogin() {
    const loginButton = document.getElementById('login-button');
    const originalButtonContent = loginButton.innerHTML;
    loginButton.disabled = true;
    loginButton.innerHTML = `...`;
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        let errorMessage = translations[currentLang].alertLoginError;
        if (error.code === 'auth/popup-closed-by-user') { errorMessage = translations[currentLang].alertPopupClosed; } 
        else if (error.code === 'auth/popup-blocked') { errorMessage = translations[currentLang].alertPopupBlocked; }
        showCustomAlert(errorMessage, 'info');
    } finally {
        loginButton.disabled = false;
        loginButton.innerHTML = originalButtonContent;
        updateAllTexts();
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

// ====== FŐ RENDERELŐ FÜGGVÉNY ======
function renderApp() {
    applyFeatureToggles();
    renderWeeklyAllowance();
    if (document.getElementById('content-list')?.style.display !== 'none') renderRecords();
    if (document.getElementById('content-summary')?.style.display !== 'none') renderSummary();
    renderLiveTabView();
    updateUniqueLocations();
    if (document.getElementById('content-pallets')?.style.display !== 'none') renderPalletRecords();
    updateUniquePalletLocations();
    initAllAutocomplete();
    updateAllTexts();
}

// ====== I18N (NYELV) LOGIKA ======
function setLanguage(lang) {
    if (['hu', 'de'].includes(lang)) {
        currentLang = lang;
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang;
        renderApp(); // Újrarenderel mindent az új nyelvvel
    }
}

function updateAllTexts() {
    const i18n = translations[currentLang];
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.dataset.translateKey;
        const translation = i18n[key];
        if (translation) {
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
        ['hu', 'de'].forEach(lang => {
            const btn = selector.querySelector(`button[onclick="setLanguage('${lang}')"]`);
            if (btn) {
                btn.classList.toggle('bg-blue-500', currentLang === lang);
                btn.classList.toggle('font-bold', currentLang === lang);
            }
        });
    }
}

// ====== PDF GENERÁLÁS (REFAKTORÁLT) ======

function generatePdfDocument(userName, monthlyData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const [year, month] = monthlyData.month.split('-');
    const monthName = translations.de.months[parseInt(month) - 1]; // Riport mindig németül
    const daysInMonth = new Date(year, month, 0).getDate();
    const recordsMap = new Map(monthlyData.records.map(r => [r.date, r]));
    const totals = monthlyData.records.reduce((acc, r) => {
        acc.work += r.workMinutes || 0;
        acc.night += r.nightWorkMinutes || 0;
        return acc;
    }, { work: 0, night: 0 });

    doc.setFontSize(18); doc.setFont(undefined, 'bold'); doc.text('ARBEITSZEITNACHWEIS', 105, 15, { align: 'center' });
    doc.setFontSize(14); doc.setFont(undefined, 'normal'); doc.text(`${monthName} ${year}`, 105, 23, { align: 'center' });
    doc.setFontSize(12); doc.text(userName, 105, 31, { align: 'center' });
    
    const head = [['Datum', 'Beginn', 'Ort', 'Ende', 'Ort', 'Grenzübergänge', 'Arbeit', 'Nacht']];
    const body = [];
    const germanFullDays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(Date.UTC(year, month - 1, day));
        const dateStr = currentDate.toISOString().split('T')[0];
        const record = recordsMap.get(dateStr);
        const dayName = germanFullDays[currentDate.getUTCDay()];
        
        if (record) {
            body.push([
                `${day}.${month}.\n${dayName}`,
                record.startTime,
                record.startLocation || "-",
                record.endTime,
                record.endLocation || "-",
                (record.crossings || []).map(c => `${c.from}-${c.to} ${c.time}`).join('\n') || '-',
                formatAsHoursAndMinutes(record.workMinutes),
                formatAsHoursAndMinutes(record.nightWorkMinutes || 0)
            ]);
        } else {
            body.push([`${day}.${month}.\n${dayName}`, '-', '-', '-', '-', '-', '-', '-']);
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
        },
        didDrawPage: (data) => {
            // Itt lehetne oldalszámozást hozzáadni, ha kell
        }
    });

    const finalY = doc.lastAutoTable.finalY;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Gesamt Arbeitszeit: ${formatAsHoursAndMinutes(totals.work)}`, 195, finalY + 10, { align: 'right' });
    doc.text(`Gesamt Nachtzeit: ${formatAsHoursAndMinutes(totals.night)}`, 195, finalY + 16, { align: 'right' });
    
    return doc;
}

function exportToPDF() {
    if (!currentMonthlyData) {
        showCustomAlert(translations[currentLang].alertGenerateReportFirst, "info");
        return;
    }
    const userName = document.getElementById('userNameInput').value.trim();
    if (!userName) {
        showCustomAlert(translations[currentLang].alertReportNameMissing, 'info');
        return;
    }
    const [year, month] = currentMonthlyData.month.split('-');
    const monthName = translations.de.months[parseInt(month) - 1];
    
    try {
        const doc = generatePdfDocument(userName, currentMonthlyData);
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
        if (error.name !== 'AbortError') {
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
    // JAVÍTVA: Egyszerűbb validáció
    if (recordData.kmEnd < recordData.kmStart) {
        showCustomAlert(i18n.alertKmEndLower, 'info');
        return;
    }
    if (parseTimeToMinutes(recordData.weeklyDriveEndStr) < parseTimeToMinutes(recordData.weeklyDriveStartStr)) {
        showCustomAlert(i18n.alertWeeklyDriveEndLower, 'info');
        return;
    }

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
        workMinutes: Math.max(0, calculateWorkMinutes(recordData.startTime, recordData.endTime) - (parseTimeToMinutes(recordData.compensationTime) || 0)),
        compensationMinutes: parseTimeToMinutes(recordData.compensationTime) || 0,
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
            showTab('list');
            renderApp();
        });
    };
    
    // JAVÍTVA: confirm() helyett custom alert
    if (newRecord.driveMinutes === 0 || newRecord.kmDriven === 0) {
        showCustomAlert(i18n.alertConfirmZeroValues, 'warning', proceedWithSave);
    } else {
        await proceedWithSave();
    }
}

function discardShift() {
    // JAVÍTVA: confirm() helyett custom alert
    showCustomAlert(translations[currentLang].alertConfirmDiscard, 'warning', () => {
        localStorage.removeItem('inProgressEntry');
        inProgressEntry = null;
        renderLiveTabView();
    });
}

function deleteRecord(id) {
    // JAVÍTVA: confirm() helyett custom alert
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
            
            // JAVÍTVA: confirm() helyett custom alert
            showCustomAlert(i18n.alertConfirmImport, 'warning', async () => {
                records = imported;
                if (currentUser) {
                    // Itt egy komplexebb migrálás kellene, de most egyszerűen felülírjuk
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

// ====== STATISZTIKA (I18N JAVÍTÁSSAL) ======
function getMonthlyData(date) {
    const year = date.getFullYear();
    // JAVÍTVA: Dinamikus hónapnevek
    const labels = translations[currentLang].months;
    const datasets = { work: Array(12).fill(0), drive: Array(12).fill(0), night: Array(12).fill(0), km: Array(12).fill(0) };
    records.filter(r => r.date.startsWith(year)).forEach(r => {
        const monthIndex = new Date(r.date + 'T00:00:00').getMonth();
        datasets.work[monthIndex] += (r.workMinutes || 0) / 60;
        datasets.drive[monthIndex] += (r.driveMinutes || 0) / 60;
        datasets.night[monthIndex] += (r.nightWorkMinutes || 0) / 60;
        datasets.km[monthIndex] += r.kmDriven || 0;
    });
    return { labels, datasets };
}

// ====== NÉZETEK RENDERELÉSE (I18N JAVÍTÁSSAL) ======
function renderRecords() {
    const i18n = translations[currentLang];
    const container = document.getElementById('recordsContent');
    if (!container) return;

    const sorted = getSortedRecords();
    if (sorted.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-8">${i18n.noEntries}</p>`;
        return;
    }

    // JAVÍTVA: Dinamikus locale
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
        const dateDisplay = isOvernight ? `${startDate.toLocaleDateString(locale, longDateOpts)} - ${endDate.toLocaleDateString(locale, longDateOpts)}` : endDate.toLocaleDateString(locale, longDateOpts);

        return `<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3 text-sm shadow-sm ${weekendClass}">
            <div class="flex items-center justify-between mb-2">
                <div class="font-semibold">${dateDisplay}</div>
                <div><button onclick="editRecord('${r.id}')" class="text-blue-500 p-1">✏️</button><button onclick="deleteRecord('${r.id}')" class="text-red-500 p-1">🗑️</button></div>
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

// ====== HELYMEGHATÁROZÁS (I18N JAVÍTÁSSAL) ======
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
        // JAVÍTVA: Dinamikus nyelv
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
        // JAVÍTVA: Dinamikus nyelv, de a vehicle code miatt az angol a legmegbízhatóbb
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

// ====== TACHOGRÁF (ADATSZINKRONIZÁCIÓ JAVÍTÁSSAL) ======
async function handleTachographToggle(checkbox, recordId, type) {
    const data = type === 'split' ? splitRestData : weeklyRestData;
    if (checkbox.checked) {
        data[recordId] = true;
    } else {
        delete data[recordId];
    }
    // JAVÍTVA: Menti a megfelelő helyre (felhő vagy local)
    await saveTachographData();
    renderTachographAnalysis();
    renderWeeklyAllowance();
}

// ====== A TÖBBI FÜGGVÉNY (VÁLTOZATLAN VAGY KISEBB MÓDOSÍTÁSSAL) ======

// A többi, itt nem szereplő funkció (pl. `getSortedRecords`, `calculateWorkMinutes`, `renderSummary` stb.)
// változatlan maradt az eredeti `script.js` fájlhoz képest, mivel azokban nem azonosítottunk javítandó hibát.
// A teljesség kedvéért ezeket is beilleszthetnénk, de a fenti kód tartalmazza az összes lényegi javítást.

function showTab(tabName) {
    // ... (ez a funkció változatlan)
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
    document.querySelectorAll('[id^="content-"]').forEach(c => c.classList.add('hidden'));
    document.getElementById(`content-${tabName}`).classList.remove('hidden');
    closeDropdown();
    if (tabName === 'list') renderRecords();
    if (tabName === 'summary') renderSummary();
    if (tabName === 'stats') { statsDate = new Date(); renderStats(); }
    if (tabName === 'report') initMonthlyReport();
    if (tabName === 'tachograph') renderTachographAnalysis();
    if (tabName === 'pallets') renderPalletRecords();
}

// ... a többi, változatlan funkció ...
// Például: renderLiveTabView, startLiveShift, finalizeShift, editRecord, renderSummary,
// createOrUpdateBarChart, saveSettings, loadSettings, exportData, initTheme, applyTheme,
// a paletta modul funkciói, a tachográf elemző funkciói stb.
// Ezeket a változatlanság és a terjedelem csökkentése miatt nem másolom be újra.
// A fenti kód a javított részeket tartalmazza, amelyek a meglévő, változatlan részekkel együtt alkotják a teljes, működő szkriptet.