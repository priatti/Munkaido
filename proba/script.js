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
        // Tachográf
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
        // Raklapok
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
        palletReportTitle: 'Raklapmozgás Riport',
        palletReportFileName: 'Raklap_Riport',
        palletReportHeaderDate: 'Dátum',
        palletReportHeaderLocation: 'Helyszín',
        palletReportHeaderAction: 'Művelet',
        palletReportHeaderQuantity: 'Mennyiség',
        palletReportHeaderPlate: 'Rendszám',
        palletReportHeaderBalance: 'Egyenleg',
        // Üzenetek
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
        palletInvalidData: "Kérlek tölts ki minden mezőt (a mennyiségnek pozitívnak kell lennie)!",
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
    de: {
        // Allgemein
        appTitle: "Arbeitszeitnachweis Pro",
        delete: "Löschen",
        ok: "Okay",
        cancel: "Abbrechen",
        save: "Speichern",
        cityPlaceholder: "Stadt",
        fromPlaceholder: "Von",
        toPlaceholder: "Nach",
        // Tabs und Menü
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
        // Live-Ansicht
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
        // Ganzer Tag Ansicht
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
        splitRestQuestion: "Gab es eine zusammenhängende Pause von 3+ Stunden? (Geteilt)",
        saveEntry: "Eintrag speichern",
        workTimeDisplay: "Arbeitszeit",
        nightWorkDisplay: "Nachtarbeit (20:00-05:00)",
        driveTimeTodayDisplay: "Heutige Lenkzeit",
        kmDrivenDisplay: "Gefahrene km",
        // Listenansicht
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
        // Zusammenfassungsansicht
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
        // Statistikansicht
        statsTitle: "Detaillierte Statistiken",
        statsDaily: "Täglich",
        statsMonthly: "Monatlich",
        statsYearly: "Jährlich",
        statsWorkTime: "Arbeitszeit",
        statsDriveTime: "Lenkzeit",
        statsNightTime: "Nachtarbeit",
        statsKmDriven: "Gefahrene Kilometer",
        statsNoDataPeriod: "Keine Daten für den ausgewählten Zeitraum.",
        chartMonths: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
        // Berichtansicht
        reportTitle: "Monatlicher Bericht",
        reportMonthSelect: "Monat auswählen",
        reportGenerate: "Bericht erstellen",
        reportDownloadPDF: "PDF herunterladen",
        reportSharePDF: "PDF teilen",
        reportPrepared: "Bericht vorbereitet.",
        palletReportGenerate: "Palettenbericht erstellen",
        // Einstellungen
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
        // Tachograph
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
        // Paletten
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
        palletReportTitle: 'Palettenbewegungsbericht',
        palletReportFileName: 'Paletten_Bericht',
        palletReportHeaderDate: 'Datum',
        palletReportHeaderLocation: 'Ort',
        palletReportHeaderAction: 'Vorgang',
        palletReportHeaderQuantity: 'Menge',
        palletReportHeaderPlate: 'Kennzeichen',
        palletReportHeaderBalance: 'Saldo',
        // Meldungen
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
        alertConfirmDelete: "Möchten Sie dies wirklich löschen?",
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
        alertNoPalletData: "Keine Palettenbewegungen für einen Bericht vorhanden.",
        autoBackupOn: "Automatische Sicherung aktiviert!",
        autoBackupOff: "Automatische Sicherung deaktiviert.",
        settingsSaved: "Einstellungen gespeichert!",
        logRecalculatingNightWork: 'Neuberechnung der Nachtarbeitsstunden nach der 20:00-05:00-Regel...',
        logEntriesUpdated: 'Einträge aktualisiert.',
        logAutoExportStarted: 'Automatische Sicherung gestartet...',
        errorPdfGeneration: 'Fehler bei der PDF-Erstellung:',
        errorSharing: 'Fehler beim Teilen:',
        shareAborted: 'Teilen abgebrochen.',
        errorImport: 'Fehler:',
        shareErrorCannotShare: 'Diese Datei kann nicht geteilt werden.'
    }
};

// ====== TÖBBNYELVŰSÉGI RENDSZER ======

let currentLang = localStorage.getItem('language') || (navigator.language.startsWith('de') ? 'de' : 'hu');

function setLanguage(lang) {
    if (['hu', 'de'].includes(lang)) {
        currentLang = lang;
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang;
        updateAllTexts();
    }
}

function updateAllTexts() {
    const i18n = translations[currentLang];

    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.dataset.translateKey;
        const translation = i18n[key];
        
        if (translation !== undefined) {
            if (el.placeholder !== undefined) {
                el.placeholder = translation;
            } else if (el.title !== undefined && (el.tagName === 'BUTTON' || el.tagName === 'A')) {
                el.title = translation;
            } else {
                let targetNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0);
                
                if (targetNode) {
                    targetNode.textContent = translation;
                } else if (el.tagName === 'SPAN' || el.tagName === 'P' || el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'BUTTON') {
                    el.textContent = translation;
                }
            }
        }
    });

    document.title = i18n.appTitle;
    updateLanguageButtonStyles();
    
    // NYELVFÜGGŐ ELEMEK MEGJELENÍTÉSE/ELREJTÉSE
    const compensationSectionDe = document.getElementById('compensation-section-de');
    if(compensationSectionDe) {
        compensationSectionDe.style.display = currentLang === 'de' ? 'none' : 'block';
    }
    const compensationToggle = document.getElementById('toggleCompensation');
    if(compensationToggle && compensationToggle.parentElement && compensationToggle.parentElement.parentElement) {
        compensationToggle.parentElement.parentElement.style.display = currentLang === 'de' ? 'none' : 'flex';
    }

    // DINAMIKUS NÉZETEK FRISSÍTÉSE AZ ÚJ NYELVVEL
    renderDashboard();
    renderWeeklyAllowance();
    if (document.getElementById('content-list').style.display !== 'none') renderRecords();
    if (document.getElementById('content-summary').style.display !== 'none') renderSummary();
    if (document.getElementById('content-stats').style.display !== 'none') renderStats();
    if (document.getElementById('content-tachograph').style.display !== 'none') renderTachographAnalysis();
    if (document.getElementById('content-pallets').style.display !== 'none') renderPalletRecords();
    updateDisplays();
}

function updateLanguageButtonStyles() {
    const selector = document.getElementById('languageSelector');
    if (selector) {
        const buttons = selector.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.classList.remove('bg-blue-100', 'border-blue-500', 'font-bold');
            if ((currentLang === 'hu' && btn.innerText.includes('Magyar')) || (currentLang === 'de' && btn.innerText.includes('Deutsch'))) {
                btn.classList.add('bg-blue-100', 'border-blue-500', 'font-bold');
            }
        });
    }
}

// =======================================================
// ===== FIREBASE ÉS AUTHENTIKÁCIÓS LOGIKA (v8.03) =======
// =======================================================
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const loggedInView = document.getElementById('logged-in-view');
const loggedOutView = document.getElementById('logged-out-view');
const userNameEl = document.getElementById('user-name');
if (loginButton) {
    loginButton.addEventListener('click', async () => {
        const originalButtonContent = loginButton.innerHTML;
        loginButton.disabled = true;
        loginButton.innerHTML = `...`;
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await auth.signInWithPopup(provider);
        } catch (error) {
            const i18n = translations[currentLang];
            let errorMessage = i18n.alertLoginError;
            if (error.code === 'auth/popup-closed-by-user') { errorMessage = i18n.alertPopupClosed; } 
            else if (error.code === 'auth/popup-blocked') { errorMessage = i18n.alertPopupBlocked;}
            console.error('Login error:', error);
            showCustomAlert(errorMessage, 'info');
        } finally {
            loginButton.disabled = false;
            loginButton.innerHTML = originalButtonContent;
        }
    });
}
if (logoutButton) { logoutButton.addEventListener('click', () => { auth.signOut(); }); }

auth.onAuthStateChanged(async user => {
    currentUser = user;
    updateAuthUI(user);
    if (user) {
        console.log("Logged in:", user.uid);
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
        records = JSON.parse(localStorage.getItem('workRecords') || '[]');
        palletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');
    }

    await runNightWorkRecalculation();
    
    renderApp();
    updateAllTexts(); 
    checkForAutoExport();
});

async function loadRecordsFromFirestore(collectionName) {
    if (!currentUser) return [];
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection(collectionName).get();
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error(`Error loading ${collectionName} data:`, error);
        showCustomAlert(translations[currentLang].alertDataLoadError, 'info');
        return [];
    }
}

async function migrateLocalToFirestore(localData, collectionName) {
    if (!currentUser) return;
    const batch = db.batch();
    const localKey = collectionName === 'records' ? 'workRecords' : 'palletRecords';
    const dataToMigrate = JSON.parse(localStorage.getItem(localKey) || '[]');

    dataToMigrate.forEach(record => {
        const docRef = db.collection('users').doc(currentUser.uid).collection(collectionName).doc(String(record.id));
        batch.set(docRef, record);
    });
    try {
        await batch.commit();
         console.log(`${collectionName} data migrated to Firestore.`);
    } catch (error) {
        console.error(`Error migrating ${collectionName} data:`, error);
    }
}

function updateAuthUI(user) { if (user) { loggedInView.classList.remove('hidden'); loggedOutView.classList.add('hidden'); userNameEl.textContent = user.displayName || user.email; } else { loggedInView.classList.add('hidden'); loggedOutView.classList.remove('hidden'); userNameEl.textContent = ''; } }
async function saveRecord(record) { if (editingId) { records = records.map(r => r.id === editingId ? record : r); } else { records.push(record); } if (currentUser) { try { await db.collection('users').doc(currentUser.uid).collection('records').doc(String(record.id)).set(record); } catch (error) { console.error("Error saving to Firestore:", error); showCustomAlert(translations[currentLang].alertSaveToCloudError, 'info'); } } else { localStorage.setItem('workRecords', JSON.stringify(records)); } }
async function deleteRecordFromStorage(id) { if (currentUser) { try { await db.collection('users').doc(currentUser.uid).collection('records').doc(String(id)).delete(); } catch (error) { console.error("Error deleting from Firestore:", error); showCustomAlert(translations[currentLang].alertSaveToCloudError, 'info'); } } }
// =======================================================
// ===== ALKALMAZÁS LOGIKA (v8.03) =======================
// =======================================================

let records = []; 
let palletRecords = [];
let editingId = null;
let inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null'); 
let uniqueLocations = [];
let statsView = 'daily';
let statsDate = new Date();
let workTimeChart, driveTimeChart, nightTimeChart, kmChart;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadSettings();
    initializeFeatureToggles();
    
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if(splitRestToggle) {
        splitRestToggle.addEventListener('change', () => updateToggleVisuals(splitRestToggle));
    }

    document.documentElement.lang = currentLang;

    document.addEventListener('click', (event) => {
        const dropdownContainer = document.getElementById('dropdown-container');
        if (dropdownContainer && !dropdownContainer.contains(event.target)) { closeDropdown(); }
        if (!event.target.closest('.autocomplete-list')) { hideAutocomplete(); }
    });
    document.getElementById('autoExportSelector').addEventListener('change', (e) => {
        const i18n = translations[currentLang];
        localStorage.setItem('autoExportFrequency', e.target.value);
        if (e.target.value !== 'never') {
            localStorage.setItem('lastAutoExportDate', new Date().toISOString());
            showCustomAlert(i18n.autoBackupOn, 'success');
        } else {
            showCustomAlert(i18n.autoBackupOff, 'info');
        }
    });
    document.getElementById('stats-view-daily').onclick = () => { statsView = 'daily'; renderStats(); };
    document.getElementById('stats-view-monthly').onclick = () => { statsView = 'monthly'; renderStats(); };
    document.getElementById('stats-view-yearly').onclick = () => { statsView = 'yearly'; renderStats(); };
    document.getElementById('stats-prev').onclick = () => { navigateStats(-1); };
    document.getElementById('stats-next').onclick = () => { navigateStats(1); };
});

function renderApp() {
    applyFeatureToggles();
    renderWeeklyAllowance();
    renderRecords();
    renderSummary();
    renderLiveTabView();
    updateUniqueLocations();
    renderPalletRecords(); 
    updateUniquePalletLocations();
    initAllAutocomplete();
}

const isoToVehicleCode = { 'at': 'A', 'de': 'D', 'hu': 'H', 'sk': 'SK', 'si': 'SLO', 'it': 'I', 'pl': 'PL', 'cz': 'CZ', 'ro': 'RO', 'ch': 'CH', 'fr': 'F', 'nl': 'NL', 'be': 'B', 'lu': 'L', 'es': 'E', 'gb': 'UK' };
async function fetchCountryCodeFor(inputId) { const inputElement = document.getElementById(inputId); if (!inputElement || !navigator.geolocation) return; inputElement.value = "..."; try { const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })); const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=en`); if (!response.ok) throw new Error('API error'); const data = await response.json(); const countryCode = data.address.country_code; if (countryCode && isoToVehicleCode[countryCode]) { inputElement.value = isoToVehicleCode[countryCode]; } else { inputElement.value = (countryCode || 'N/A').toUpperCase(); } } catch (error) { inputElement.value = ""; showCustomAlert(translations[currentLang].alertLocationFailed, 'info'); } }
function toggleDropdown() { document.getElementById('dropdown-menu').classList.toggle('hidden'); }
function closeDropdown() { document.getElementById('dropdown-menu').classList.add('hidden'); }
let alertCallback = null;
function showCustomAlert(message, type, callback) { const overlay = document.getElementById('custom-alert-overlay'); const box = document.getElementById('custom-alert-box'); const iconContainer = document.getElementById('custom-alert-icon'); const messageEl = document.getElementById('custom-alert-message'); const buttonsContainer = document.getElementById('custom-alert-buttons'); const i18n = translations[currentLang]; messageEl.textContent = message; alertCallback = callback || null; iconContainer.className = 'w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center'; buttonsContainer.innerHTML = ''; const warningIcon = `<svg class="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`; if (type === 'warning') { iconContainer.classList.add('bg-yellow-100'); iconContainer.innerHTML = warningIcon; buttonsContainer.innerHTML = `<button onclick="hideCustomAlert(false)" class="py-2 px-6 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">${i18n.cancel}</button><button onclick="hideCustomAlert(true)" class="py-2 px-6 bg-yellow-400 text-white rounded-lg font-semibold hover:bg-yellow-500">${i18n.save}</button>`; } else if (type === 'info') { iconContainer.classList.add('bg-yellow-100'); iconContainer.innerHTML = warningIcon; buttonsContainer.innerHTML = `<button onclick="hideCustomAlert(true)" class="py-2 w-2/3 bg-yellow-400 text-white rounded-lg font-semibold hover:bg-yellow-500">${i18n.ok}</button>`; } else if (type === 'success') { iconContainer.classList.add('bg-green-100', 'success-icon'); iconContainer.innerHTML = `<svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path class="checkmark-path" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`; buttonsContainer.innerHTML = `<button onclick="hideCustomAlert(true)" class="py-2 w-2/3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600">${i18n.ok}</button>`; } overlay.classList.remove('hidden'); overlay.classList.add('flex'); setTimeout(() => { overlay.classList.remove('opacity-0'); box.classList.remove('scale-95'); }, 10); }
function hideCustomAlert(isConfirmed) { const overlay = document.getElementById('custom-alert-overlay'); const box = document.getElementById('custom-alert-box'); overlay.classList.add('opacity-0'); box.classList.add('scale-95'); setTimeout(() => { overlay.classList.add('hidden'); overlay.classList.remove('flex'); if (isConfirmed && alertCallback) { alertCallback(); } alertCallback = null; }, 300); }
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

    if (!recordData.date || !recordData.startTime || !recordData.endTime) { showCustomAlert(i18n.alertMandatoryFields, 'info'); return; }
    if (recordData.kmEnd > 0 && recordData.kmEnd < recordData.kmStart) { showCustomAlert(i18n.alertKmEndLower, 'info'); return; }
    if (parseTimeToMinutes(recordData.weeklyDriveEndStr) > 0 && parseTimeToMinutes(recordData.weeklyDriveEndStr) < parseTimeToMinutes(recordData.weeklyDriveStartStr)) { showCustomAlert(i18n.alertWeeklyDriveEndLower, 'info'); return; }

    const compensationMinutes = parseTimeToMinutes(recordData.compensationTime) || 0;
    const grossWorkMinutes = calculateWorkMinutes(recordData.startTime, recordData.endTime);

    const newRecord = {
        ...recordData,
        id: editingId || String(Date.now()),
        workMinutes: Math.max(0, grossWorkMinutes - compensationMinutes),
        compensationMinutes: compensationMinutes,
        nightWorkMinutes: calculateNightWorkMinutes(recordData.startTime, recordData.endTime),
        driveMinutes: Math.max(0, parseTimeToMinutes(recordData.weeklyDriveEndStr) - parseTimeToMinutes(recordData.weeklyDriveStartStr)),
        kmDriven: Math.max(0, recordData.kmEnd - recordData.kmStart)
    };
    
    const splitData = getSplitRestData();
    if (newRecord.isSplitRest) {
        splitData[newRecord.id] = true;
    } else {
        delete splitData[newRecord.id];
    }
    saveSplitRestData(splitData);

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

    if (newRecord.driveMinutes === 0 || newRecord.kmDriven === 0) {
        showCustomAlert(i18n.alertConfirmZeroValues, 'warning', proceedWithSave);
    } else {
        proceedWithSave();
    }
}
function showTab(tabName) { 
    if(tabName === 'pallets') {
        document.getElementById('palletDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('palletLicensePlate').value = localStorage.getItem('lastPalletLicensePlate') || '';
    }
    const allTabs = document.querySelectorAll('.tab'); const mainTabs = ['live', 'full-day', 'list', 'pallets']; const dropdownButton = document.getElementById('dropdown-button'); const dropdownMenu = document.getElementById('dropdown-menu'); allTabs.forEach(t => t.classList.remove('tab-active')); dropdownButton.classList.remove('tab-active'); if (mainTabs.includes(tabName)) { document.getElementById(`tab-${tabName}`).classList.add('tab-active'); dropdownButton.innerHTML = `<span data-translate-key="menuMore">${translations[currentLang].menuMore}</span> ▼`; } else { dropdownButton.classList.add('tab-active'); const selectedTitleEl = dropdownMenu.querySelector(`button[onclick="showTab('${tabName}')"] .dropdown-item-title`); if(selectedTitleEl) { const selectedTitle = selectedTitleEl.innerText; dropdownButton.innerHTML = `${selectedTitle} ▼`; } } document.querySelectorAll('[id^="content-"]').forEach(c => c.classList.add('hidden')); document.getElementById(`content-${tabName}`).classList.remove('hidden'); closeDropdown(); if (tabName === 'list') renderRecords(); if (tabName === 'summary') renderSummary(); if (tabName === 'stats') { statsDate = new Date(); renderStats(); } if (tabName === 'report') initMonthlyReport(); if (tabName === 'tachograph') renderTachographAnalysis(); if (tabName === 'pallets') renderPalletRecords(); }
function renderDashboard() {
    const i18n = translations[currentLang];
    const container = document.getElementById('dashboard-cards');
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
        <div class="bg-${card.color}-50 border border-${card.color}-200 rounded-lg p-3 text-center">
            <p class="text-xs text-${card.color}-700 font-semibold">${i18n[card.labelKey]}</p>
            <p class="text-lg font-bold text-${card.color}-800 mt-1">${card.value}</p>
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
function startLiveShift() { inProgressEntry = { date: document.getElementById('liveStartDate').value, startTime: document.getElementById('liveStartTime').value, startLocation: document.getElementById('liveStartLocation').value.trim(), weeklyDriveStartStr: document.getElementById('liveWeeklyDriveStart').value.trim(), kmStart: parseFloat(document.getElementById('liveStartKm').value) || 0, crossings: [] }; if (!inProgressEntry.date || !inProgressEntry.startTime) { showCustomAlert(translations[currentLang].alertMandatoryFields, "info"); return; } localStorage.setItem('inProgressEntry', JSON.stringify(inProgressEntry)); renderLiveTabView(); updateAllTexts(); }
function addLiveCrossing() { const from = document.getElementById('liveCrossFrom').value.trim().toUpperCase(); const to = document.getElementById('liveCrossTo').value.trim().toUpperCase(); const time = document.getElementById('liveCrossTime').value; if (!from || !to || !time) { showCustomAlert(translations[currentLang].alertFillAllFields, "info"); return; } inProgressEntry.crossings.push({ from, to, time }); localStorage.setItem('inProgressEntry', JSON.stringify(inProgressEntry)); renderLiveTabView(); }
function finalizeShift() { showTab('full-day'); document.getElementById('date').value = new Date().toISOString().split('T')[0]; Object.keys(inProgressEntry).forEach(key => { const el = document.getElementById(key.replace('Str', '')); if (el) el.value = inProgressEntry[key]; }); (inProgressEntry.crossings || []).forEach(c => addCrossingRow(c.from, c.to, c.time)); document.getElementById('endTime').focus(); }
function discardShift() { if (confirm(translations[currentLang].alertConfirmDelete)) { localStorage.removeItem('inProgressEntry'); inProgressEntry = null; renderLiveTabView(); updateAllTexts(); } }
function getSortedRecords() { return [...(records || [])].sort((a, b) => new Date(`${b.date||"1970-01-01"}T${b.startTime||"00:00"}`) - new Date(`${a.date||"1970-01-01"}T${a.startTime||"00:00"}`)); }
function getLatestRecord() { if (!records || records.length === 0) return null; return getSortedRecords()[0]; }
function showFullFormView() { resetEntryForm(); loadLastValues(); }
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
['startTime', 'endTime', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd'].forEach(id => { if (document.getElementById(id)) document.getElementById(id).addEventListener('input', updateDisplays); });
function addCrossingRow(from = '', to = '', time = '') {
    const i18n = translations[currentLang];
    const container = document.getElementById('crossingsContainer');
    const lastToInput = container.querySelector('input[id^="crossTo-"]:last-of-type');
    const newFrom = from || (lastToInput ? lastToInput.value.toUpperCase() : '');
    const index = Date.now();
    const newRow = document.createElement('div');
    newRow.className = 'border-t pt-3 mt-2 space-y-2';
    newRow.innerHTML = `<div class="grid grid-cols-2 gap-2"><div><input type="text" id="crossFrom-${index}" value="${newFrom}" placeholder="${i18n.fromPlaceholder}" class="w-full p-2 border rounded text-sm uppercase"></div><div><div class="flex"><input type="text" id="crossTo-${index}" value="${to}" placeholder="${i18n.toPlaceholder}" class="w-full p-2 border rounded-l text-sm uppercase"><button type="button" onclick="fetchCountryCodeFor('crossTo-${index}')" class="bg-blue-500 text-white p-2 rounded-r text-xs" title="${i18n.getCountryCodeGPS}">📍</button></div></div></div><div class="grid grid-cols-2 gap-2"><input type="time" id="crossTime-${index}" value="${time}" onblur="formatTimeInput(this)" class="w-full p-2 border rounded text-sm"><button onclick="this.closest('.border-t').remove()" class="bg-red-500 text-white p-2 rounded text-sm hover:bg-red-600">${i18n.delete}</button></div>`;
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
async function deleteRecord(id) { if (confirm(translations[currentLang].alertConfirmDelete)) { const splitData = getSplitRestData(); delete splitData[id]; saveSplitRestData(splitData); const weeklyData = getWeeklyRestData(); delete weeklyData[id]; saveWeeklyRestData(weeklyData); await deleteRecordFromStorage(id); records = records.filter(r => r.id !== String(id)); if(!currentUser) { localStorage.setItem('workRecords', JSON.stringify(records)); } renderApp(); } }
function renderRecords() { const i18n = translations[currentLang]; const container = document.getElementById('recordsContent'); if (!container) return; const locale = currentLang === 'de' ? 'de-DE' : 'hu-HU'; container.innerHTML = records.length === 0 ? `<p class="text-center text-gray-500 py-8">${i18n.noEntries}</p>` : getSortedRecords().map(r => { const d = new Date(r.date); const day = d.getUTCDay(); const weekendClass = (day === 6 || day === 0) ? 'bg-red-50' : ''; const isOvernight = new Date(`1970-01-01T${r.endTime}`) < new Date(`1970-01-01T${r.startTime}`); const endDate = new Date(r.date + 'T00:00:00'); let startDate = new Date(r.date + 'T00:00:00'); if (isOvernight) { startDate.setDate(startDate.getDate() - 1); } const formatShortDate = (dt) => dt.toLocaleDateString(locale, { month: '2-digit', day: '2-digit' }); return `<div class="bg-gray-50 rounded-lg p-3 mb-3 text-sm ${weekendClass}"><div class="flex items-center justify-between mb-2"><div class="font-semibold">${isOvernight?`${startDate.toLocaleDateString(locale)} - ${endDate.toLocaleDateString(locale)}`:endDate.toLocaleDateString(locale)}</div><div><button onclick="editRecord('${r.id}')" class="text-blue-500 p-1">✏️</button><button onclick="deleteRecord('${r.id}')" class="text-red-500 p-1">🗑️</button></div></div><div class="space-y-1"><div class="flex justify-between"><span>${i18n.entryDeparture}:</span><span>${isOvernight?formatShortDate(startDate):""} ${r.startTime} (${r.startLocation||"N/A"})</span></div><div class="flex justify-between"><span>${i18n.entryArrival}:</span><span>${formatShortDate(endDate)} ${r.endTime} (${r.endLocation||"N/A"})</span></div><div class="flex justify-between border-t pt-1 mt-1"><span>${i18n.entryWorkTime}:</span><span class="font-bold">${formatDuration(r.workMinutes)}</span></div>${r.compensationMinutes > 0 ? `<div class="flex justify-between text-yellow-700 text-xs"><span>&nbsp;&nbsp;└ ${i18n.entryCompensation}:</span><span>-${formatDuration(r.compensationMinutes)}</span></div>` : ''}<div class="flex justify-between"><span>${i18n.entryNightTime}:</span><span class="text-purple-600">${formatDuration(r.nightWorkMinutes||0)}</span></div><div class="flex justify-between"><span>${i18n.entryDriveTime}:</span><span class="text-blue-700">${formatDuration(r.driveMinutes)}</span></div><div class="flex justify-between"><span>${i18n.entryDistance}:</span><span>${r.kmDriven} km</span></div>${(r.crossings&&r.crossings.length>0)?`<div class="border-t pt-2 mt-2"><p class="font-semibold text-xs text-indigo-700">${i18n.entryCrossingsLabel}:</p><div class="text-xs text-gray-600 pl-2">${r.crossings.map(c=>`<span>${c.from} - ${c.to} (${c.time})</span>`).join("<br>")}</div></div>`:""}</div></div>`; }).join(''); }
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
    container.innerHTML = summaries.map(s => `<div class="bg-blue-50 rounded-lg p-3"><h3 class="font-semibold mb-2">${s.title} ${s.data.days > 0 ? `(${s.data.days} ${i18n.summaryDays})` : ""}</h3>${s.data.days > 0 ? `<div class="grid grid-cols-2 gap-2 text-center text-sm"><div><div class="font-bold text-green-600">${formatDuration(s.data.workMinutes)}</div><div class="text-xs">${i18n.summaryWork}</div></div><div><div class="font-bold text-purple-600">${formatDuration(s.data.nightWorkMinutes)}</div><div class="text-xs">${i18n.summaryNight}</div></div><div><div class="font-bold text-blue-700">${formatDuration(s.data.driveMinutes)}</div><div class="text-xs">${i18n.summaryDrive}</div></div><div><div class="font-bold text-orange-600">${s.data.kmDriven} km</div><div class="text-xs">${i18n.summaryDistance}</div></div></div>` : `<p class="text-center text-xs text-gray-500">${i18n.summaryNoData}</p>`}</div>`).join('');
};

function navigateStats(direction) { if (statsView === 'daily') statsDate.setMonth(statsDate.getMonth() + direction); else if (statsView === 'monthly') statsDate.setFullYear(statsDate.getFullYear() + direction); else if (statsView === 'yearly') return; renderStats(); }
function renderStats() {
    const i18n = translations[currentLang];
    const locale = currentLang === 'de' ? 'de-DE' : 'hu-HU';
    const periodDisplay = document.getElementById('stats-period-display');
    document.querySelectorAll('.stats-view-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`stats-view-${statsView}`).classList.add('active');
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
    
    workTotalEl.className = 'text-sm font-bold text-green-600';
    driveTotalEl.className = 'text-sm font-bold text-blue-600';
    nightTotalEl.className = 'text-sm font-bold text-purple-600';
    kmTotalEl.className = 'text-sm font-bold text-orange-600';
    
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
function getMonthlyData(date) { const year = date.getFullYear(); const labels = translations[currentLang].chartMonths; const datasets = { work: Array(12).fill(0), drive: Array(12).fill(0), night: Array(12).fill(0), km: Array(12).fill(0) }; records.filter(r => r.date.startsWith(year)).forEach(r => { const monthIndex = new Date(r.date + 'T00:00:00').getMonth(); datasets.work[monthIndex] += r.workMinutes / 60; datasets.drive[monthIndex] += r.driveMinutes / 60; datasets.night[monthIndex] += r.nightWorkMinutes / 60; datasets.km[monthIndex] += r.kmDriven; }); return { labels, datasets }; }
function getYearlyData() { if (records.length === 0) return { labels: [], datasets: { work: [], drive: [], night: [], km: [] } }; const yearData = {}; records.forEach(r => { const year = r.date.substring(0, 4); if (!yearData[year]) yearData[year] = { work: 0, drive: 0, night: 0, km: 0 }; yearData[year].work += r.workMinutes / 60; yearData[year].drive += r.driveMinutes / 60; yearData[year].night += r.nightWorkMinutes / 60; yearData[year].km += r.kmDriven; }); const labels = Object.keys(yearData).sort(); const datasets = { work: [], drive: [], night: [], km: [] }; labels.forEach(year => { datasets.work.push(yearData[year].work); datasets.drive.push(yearData[year].drive); datasets.night.push(yearData[year].night); datasets.km.push(yearData[year].km); }); return { labels, datasets }; }
function createOrUpdateBarChart(chartInstance, canvasId, labels, data, labelText, color, tooltipCallback) { const ctx = document.getElementById(canvasId).getContext('2d'); if (chartInstance) { chartInstance.destroy(); } return new Chart(ctx, { type: 'bar', data: { labels: labels, datasets: [{ label: labelText, data: data, backgroundColor: color, borderRadius: 4 }] }, options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(context) { return tooltipCallback(context.parsed.y); } } } }, scales: { y: { beginAtZero: true } } } }); }

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
        const fileName = `Arbeitszeitnachweis-${userName.replace(/ /g,"_")}-${year}-${monthName}.pdf`;
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
function saveSettings() { localStorage.setItem('userName', document.getElementById('userNameInput').value); showCustomAlert(translations[currentLang].settingsSaved, 'success'); }
function loadSettings() { 
    document.getElementById('userNameInput').value = localStorage.getItem('userName') || ''; 
    document.getElementById('themeSelector').value = localStorage.getItem('theme') || 'auto'; 
    document.getElementById('autoExportSelector').value = localStorage.getItem('autoExportFrequency') || 'never'; 
}
function exportData() { if (records.length === 0) { showCustomAlert(translations[currentLang].alertNoDataToExport, 'info'); return; } const dataStr = JSON.stringify(records, null, 2); const blob = new Blob([dataStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `munkaido_backup_${new Date().toISOString().split("T")[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
function importData() {
    const i18n = translations[currentLang];
    const fileInput = document.getElementById('importFile');
    if (!fileInput.files.length) { showCustomAlert(i18n.alertChooseFile, 'info'); return; }
    if (!confirm(i18n.alertConfirmImport)) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                records = imported;
                if (currentUser) { migrateLocalToFirestore(records); } else { localStorage.setItem('workRecords', JSON.stringify(records)); }
                renderApp();
                showCustomAlert(i18n.alertImportSuccess, 'success');
            } else { throw new Error(i18n.alertImportInvalid); }
        } catch (err) { showCustomAlert(i18n.errorImport + ' ' + err.message, 'info'); }
    };
    reader.readAsText(fileInput.files[0]);
}
function applyTheme(theme) { if (theme === 'dark') { document.documentElement.classList.add('dark'); } else if (theme === 'light') { document.documentElement.classList.remove('dark'); } else { if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) { document.documentElement.classList.add('dark'); } else { document.documentElement.classList.remove('dark'); } } }
function setTheme(theme) { applyTheme(theme); localStorage.setItem('theme', theme); }
function initTheme() { const savedTheme = localStorage.getItem('theme') || 'auto'; applyTheme(savedTheme); window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if(localStorage.getItem('theme') === 'auto') { applyTheme('auto'); } }); }

async function runNightWorkRecalculation() {
    if (localStorage.getItem('nightWorkRecalculated_v20_05')) { return; }
    const i18n = translations[currentLang];
    console.log(i18n.logRecalculatingNightWork);
    let updatedCount = 0;
    const updatedRecords = records.map(record => {
        const newNightWorkMinutes = calculateNightWorkMinutes(record.startTime, record.endTime);
        if (record.nightWorkMinutes !== newNightWorkMinutes) {
            record.nightWorkMinutes = newNightWorkMinutes;
            updatedCount++;
        }
        return record;
    });
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
    localStorage.setItem('nightWorkRecalculated_v20_05', 'true');
    console.log(`${updatedCount} ${i18n.logEntriesUpdated}`);
    renderApp();
}

function updateUniqueLocations() { const locations = new Set(records.map(r => r.startLocation).concat(records.map(r => r.endLocation))); uniqueLocations = Array.from(locations).filter(Boolean).sort(); }
function initAutocomplete(input, dataArray) { if (!input) return; input.addEventListener('input', function() { const val = this.value; hideAutocomplete(); if (!val) return; const suggestions = document.createElement('div'); suggestions.id = 'autocomplete-list'; suggestions.className = 'autocomplete-list absolute z-20 w-full border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto bg-white'; suggestions.style.top = (this.offsetHeight + 12) + 'px'; const filteredData = dataArray.filter(item => item.toLowerCase().includes(val.toLowerCase())); filteredData.forEach(item => { const itemEl = document.createElement('div'); itemEl.innerHTML = item.replace(new RegExp(val, 'gi'), '<strong>$&</strong>'); itemEl.className = 'p-2 hover:bg-gray-100 cursor-pointer autocomplete-item'; itemEl.addEventListener('click', () => { input.value = item; hideAutocomplete(); }); suggestions.appendChild(itemEl); }); if(filteredData.length > 0) this.parentNode.appendChild(suggestions); }); }
function initAllAutocomplete() { initAutocomplete(document.getElementById('liveStartLocation'), uniqueLocations); initAutocomplete(document.getElementById('startLocation'), uniqueLocations); initAutocomplete(document.getElementById('endLocation'), uniqueLocations); initAutocomplete(document.getElementById('palletLocation'), uniquePalletLocations); }
function hideAutocomplete() { document.querySelectorAll('#autocomplete-list').forEach(list => list.remove()); }
function calculateWorkMinutes(start, end) { if (!start || !end) return 0; const s = new Date(`2000-01-01T${start}`); let e = new Date(`2000-01-01T${end}`); if (e < s) e.setDate(e.getDate() + 1); return Math.floor((e - s) / 60000); }
function calculateNightWorkMinutes(startTime, endTime) {
    if (!startTime || !endTime) return 0;
    const start = new Date(`1970-01-01T${startTime}`);
    let end = new Date(`1970-01-01T${endTime}`);
    if (end <= start) end.setDate(end.getDate() + 1);
    let nightMinutes = 0;
    let current = new Date(start);
    while (current < end) {
        const hour = current.getHours();
        if (hour >= 20 || hour < 5) {
            nightMinutes++;
        }
        current.setMinutes(current.getMinutes() + 1);
    }
    return nightMinutes;
}
function parseTimeToMinutes(timeStr) { if (!timeStr || !timeStr.includes(':')) return 0; const p = timeStr.split(':'); if (p.length !== 2) return 0; return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    const h_unit = currentLang === 'de' ? 'Std' : 'ó';
    const m_unit = currentLang === 'de' ? 'Min' : 'p';
    return `${h}${h_unit} ${m}${m_unit}`;
}
function formatTimeInput(inputElement, allowHoursOver24 = false) { let value = inputElement.value.replace(/[^0-9]/g, ''); if (value.length < 3) return; if (value.length === 3 && !allowHoursOver24) value = '0' + value; const hours = parseInt(value.substring(0, value.length - 2), 10); const minutes = parseInt(value.substring(value.length - 2), 10); if (minutes >= 0 && minutes <= 59 && hours >= 0 && (allowHoursOver24 || hours <= 23)) { inputElement.value = `${String(hours).padStart(2,"0")}:${String(minutes).padStart(2,"0")}`; } else { inputElement.value = ''; } updateDisplays(); }
function checkForAutoExport() {
    const frequency = localStorage.getItem('autoExportFrequency') || 'never';
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

// =======================================================
// ===== SPECIÁLIS FUNKCIÓK KEZELÉSE (v8.03) =============
// =======================================================

const featureToggles = ['toggleKm', 'toggleDriveTime', 'togglePallets', 'toggleCompensation'];

function updateToggleVisuals(checkbox) {
    const label = checkbox.closest('label');
    if (!label) return;
    const checkmark = label.querySelector('.toggle-checkmark');

    const onClasses = ['bg-green-100', 'dark:bg-green-800/50', 'font-semibold'];
    const offClasses = ['hover:bg-gray-200', 'dark:hover:bg-gray-700'];

    label.classList.remove(...onClasses, ...offClasses);

    if (checkbox.checked) {
        label.classList.add(...onClasses);
        if (checkmark) checkmark.classList.remove('hidden');
    } else {
        label.classList.add(...offClasses);
        if (checkmark) checkmark.classList.add('hidden');
    }
}

function initializeFeatureToggles() {
    featureToggles.forEach(toggleId => {
        const checkbox = document.getElementById(toggleId);
        if(checkbox) {
            const savedState = localStorage.getItem(toggleId) === 'true';
            checkbox.checked = savedState;
            updateToggleVisuals(checkbox);
            checkbox.addEventListener('change', (e) => {
                localStorage.setItem(toggleId, e.target.checked);
                applyFeatureToggles();
                updateToggleVisuals(e.target);
            });
        }
    });
    applyFeatureToggles();
}

function applyFeatureToggles() {
    const showKm = localStorage.getItem('toggleKm') === 'true';
    const showDriveTime = localStorage.getItem('toggleDriveTime') === 'true';
    const showPallets = localStorage.getItem('togglePallets') === 'true';
    const showCompensation = localStorage.getItem('toggleCompensation') === 'true';

    document.getElementById('km-section').style.display = showKm ? 'block' : 'none';
    document.getElementById('drivetime-section').style.display = showDriveTime ? 'block' : 'none';
    
    const compensationSection = document.getElementById('compensation-section-de');
    if (compensationSection) {
        compensationSection.style.display = showCompensation ? 'block' : 'none';
    }
    
    const palletTab = document.getElementById('tab-pallets');
    if(showPallets) {
        palletTab.classList.remove('hidden');
        palletTab.style.display = 'flex';
    } else {
        palletTab.classList.add('hidden');
        palletTab.style.display = 'none';
    }

    if (!showCompensation) {
        document.getElementById('compensationTime').value = '';
    }

    if (!showPallets && document.getElementById('tab-pallets').classList.contains('tab-active')) {
        showTab('live');
    }
}

// =======================================================
// ===== PALETTA NYILVÁNTARTÓ MODUL (v8.03) ==============
// =======================================================

let uniquePalletLocations = [];

function updateUniquePalletLocations() {
    const locations = new Set(palletRecords.map(r => r.location));
    uniquePalletLocations = Array.from(locations).sort();
}

async function savePalletData() {
    if (currentUser) {
        const batch = db.batch();
        palletRecords.forEach(record => {
            const docRef = db.collection('users').doc(currentUser.uid).collection('pallets').doc(String(record.id));
            batch.set(docRef, record);
        });
        await batch.commit().catch(e => console.error("Error saving pallet data:", e));
    } else {
        localStorage.setItem('palletRecords', JSON.stringify(palletRecords));
    }
}

async function savePalletEntry() {
    const date = document.getElementById('palletDate').value;
    const location = document.getElementById('palletLocation').value.trim();
    const quantity = parseInt(document.getElementById('palletQuantity').value, 10);
    const action = document.getElementById('palletAction').value;
    const licensePlate = document.getElementById('palletLicensePlate').value.trim().toUpperCase();

    if (!date || !location || !quantity || quantity <= 0) {
        showCustomAlert(translations[currentLang].palletInvalidData, "info");
        return;
    }

    const newEntry = {
        id: String(Date.now()),
        date,
        location,
        quantity,
        action,
        licensePlate: licensePlate
    };

    if (licensePlate) {
        localStorage.setItem('lastPalletLicensePlate', licensePlate);
    }

    palletRecords.push(newEntry);
    await savePalletData();
    renderPalletRecords();
    updateUniquePalletLocations();

    document.getElementById('palletLocation').value = '';
    document.getElementById('palletQuantity').value = '';
    document.getElementById('palletLicensePlate').value = localStorage.getItem('lastPalletLicensePlate') || '';
    showCustomAlert(translations[currentLang].palletSaveSuccess, "success");
}

async function deletePalletEntry(id) {
    if (confirm(translations[currentLang].alertConfirmDelete)) {
        palletRecords = palletRecords.filter(p => p.id !== id);
        if (currentUser) {
            await db.collection('users').doc(currentUser.uid).collection('pallets').doc(String(id)).delete();
        }
        await savePalletData();
        renderPalletRecords();
    }
}

function updatePalletBalance() {
    const i18n = translations[currentLang];
    const balance = palletRecords
        .filter(p => p.action !== 'csere')
        .reduce((acc, curr) => {
            return curr.action === 'felvett' ? acc + curr.quantity : acc - curr.quantity;
        }, 0);
    
    const displayEl = document.getElementById('palletBalanceDisplay');
    let colorClass = 'text-gray-700 dark:text-gray-200';
    if (balance > 0) colorClass = 'text-green-600 dark:text-green-400';
    if (balance < 0) colorClass = 'text-red-500 dark:text-red-400';

    displayEl.innerHTML = `
        <p class="text-sm font-medium">${i18n.palletsBalance}</p>
        <p class="text-2xl font-bold ${colorClass}">${balance} db</p>
    `;
}

function renderPalletRecords() {
    const i18n = translations[currentLang];
    const container = document.getElementById('palletRecordsContainer');
    if (!container) return;
    
    updatePalletBalance();

    if (palletRecords.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-4">${i18n.palletsNoTransactions}</p>`;
        return;
    }

    const sortedRecords = [...palletRecords].sort((a, b) => new Date(b.date) - new Date(a.date));

    container.innerHTML = sortedRecords.map(p => {
        let actionClass, textColor, sign;
        switch (p.action) {
            case 'felvett':
                actionClass = 'pallet-entry-felvett';
                textColor = 'text-green-700 dark:text-green-300';
                sign = '+';
                break;
            case 'leadott':
                actionClass = 'pallet-entry-leadott';
                textColor = 'text-red-700 dark:text-red-300';
                sign = '-';
                break;
            case 'csere':
                actionClass = 'pallet-entry-csere';
                textColor = 'text-gray-500 dark:text-gray-400';
                sign = '⇄';
                break;
        }
        
        const licensePlateHTML = p.licensePlate
            ? `<p class="text-xs text-gray-400 mt-1">${i18n.palletsLicensePlate}: ${p.licensePlate}</p>`
            : '';

        return `
        <div class="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border-l-4 ${actionClass} flex items-center justify-between">
            <div>
                <p class="font-semibold text-gray-800 dark:text-gray-100">${p.location}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${p.date}</p>
                ${licensePlateHTML}
            </div>
            <div class="text-right">
                 <p class="font-bold text-lg ${textColor}">${sign}${p.quantity} db</p>
                 <button onclick="deletePalletEntry('${p.id}')" class="text-xs text-gray-400 hover:text-red-500">🗑️ <span data-translate-key="delete">${i18n.delete}</span></button>
            </div>
        </div>
        `;
    }).join('');
}

function generatePalletReport() {
    const i18n = translations[currentLang];
    if (palletRecords.length === 0) {
        showCustomAlert(i18n.alertNoPalletData, "info");
        return;
    }
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const userName = document.getElementById('userNameInput').value || 'N/A';
        const sortedRecords = [...palletRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

        let currentBalance = 0;
        const balanceAfterEach = sortedRecords.map(p => {
            if (p.action === 'felvett') currentBalance += p.quantity;
            if (p.action === 'leadott') currentBalance -= p.quantity;
            return currentBalance;
        });

        doc.setFontSize(18); doc.setFont(undefined, 'bold'); doc.text(i18n.palletReportTitle, 105, 15, { align: 'center' });
        doc.setFontSize(12); doc.text(userName, 105, 23, { align: 'center' });
        doc.setFontSize(10); doc.text(`${i18n.palletsBalance} ${currentBalance} db`, 105, 31, { align: 'center' });

        let yPos = 40;
        const headers = [i18n.palletReportHeaderDate, i18n.palletReportHeaderLocation, i18n.palletReportHeaderAction, i18n.palletReportHeaderQuantity, i18n.palletReportHeaderPlate, i18n.palletReportHeaderBalance];
        const colWidths = [25, 65, 25, 20, 30, 20];

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        let xPos = 15;
        headers.forEach((h, i) => {
            doc.text(h, xPos, yPos);
            xPos += colWidths[i];
        });
        yPos += 7;
        doc.setLineWidth(0.5);
        doc.line(15, yPos - 5, 195, yPos - 5);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);

        sortedRecords.forEach((p, index) => {
            xPos = 15;
            let actionText = '';
            switch(p.action) {
                case 'felvett': actionText = i18n.palletsActionTaken; break;
                case 'leadott': actionText = i18n.palletsActionGiven; break;
                case 'csere': actionText = i18n.palletsActionExchange; break;
            }
            const row = [p.date, p.location, actionText, `${p.quantity} db`, p.licensePlate || '-', `${balanceAfterEach[index]} db`];
            row.forEach((cell, i) => {
                doc.text(String(cell), xPos, yPos);
                xPos += colWidths[i];
            });
            yPos += 6;
            if (yPos > 280) {
                doc.addPage();
                yPos = 20;
            }
        });

        doc.save(`${i18n.palletReportFileName}-${userName.replace(/ /g, "_")}-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (e) {
        console.error("PDF generation error:", e);
        showCustomAlert(i18n.errorPdfGeneration + " " + e.message, 'info');
    }
}

// =======================================================
// ===== TACHOGRÁF ELEMZŐ MODUL (v8.03) ==================
// =======================================================

function calculateRestDebt() {
    let totalDebtMinutes = 0;
    const sortedRecords = [...records].sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));
    if (sortedRecords.length < 2) return 0;

    const weeklyRestData = getWeeklyRestData();

    for (let i = 1; i < sortedRecords.length; i++) {
        const currentRecord = sortedRecords[i];
        const prevEnd = new Date(`${sortedRecords[i-1].date}T${sortedRecords[i-1].endTime}`);
        const currentStart = new Date(`${currentRecord.date}T${currentRecord.startTime}`);
        const restDurationMinutes = Math.round((currentStart - prevEnd) / 60000);

        if (weeklyRestData[currentRecord.id] && restDurationMinutes >= (24 * 60) && restDurationMinutes < (45 * 60)) {
            totalDebtMinutes += (45 * 60) - restDurationMinutes;
        }
    }
    return totalDebtMinutes;
}

function calculateWeeklyAllowance() {
    const now = new Date();
    const { start, end } = getWeekRange(now);
    const startStr = toISODate(start);
    const endStr = toISODate(end);
    const recordsInWeek = records.filter(r => r.date >= startStr && r.date <= endStr);
    const extendedDrivesThisWeek = recordsInWeek.filter(r => r.driveMinutes > 540).length;
    const remainingDrives = Math.max(0, 2 - extendedDrivesThisWeek);
    let reducedRestsInCycle = 0;
    const sortedRecords = [...records].sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));
    const splitData = getSplitRestData();

    for (let i = sortedRecords.length - 1; i > 0; i--) {
        const currentRecord = sortedRecords[i];
        const previousRecord = sortedRecords[i-1];
        const prevEnd = new Date(`${previousRecord.date}T${previousRecord.endTime}`);
        const currentStart = new Date(`${currentRecord.date}T${currentRecord.startTime}`);
        const restDurationHours = Math.round((currentStart - prevEnd) / 60000) / 60;
        if (restDurationHours >= 24) { break; }
        
        const isSplitRest = splitData[previousRecord.id] === true || previousRecord.isSplitRest;
        if (isSplitRest) continue;
        
        const prevWorkDurationHours = previousRecord.workMinutes / 60;
        const isForcedReduced = prevWorkDurationHours > 13;
        if ((restDurationHours >= 9 && restDurationHours < 11) || isForcedReduced) {
            reducedRestsInCycle++;
        }
    }
    const remainingRests = Math.max(0, 3 - reducedRestsInCycle);
    return { remainingDrives, remainingRests };
}

function renderWeeklyAllowance() {
    const i18n = translations[currentLang];
    const liveContainer = document.getElementById('live-allowance-display');
    const tachoContainer = document.getElementById('tacho-allowance-display');
    if (!liveContainer || !tachoContainer) return;

    const allowance = calculateWeeklyAllowance();
    const debtMinutes = calculateRestDebt();
    const debtHTML = debtMinutes > 0 ? `
        <div class="p-2 bg-red-50 dark:bg-red-600/20 rounded-lg border border-red-200 dark:border-red-800">
            <p class="text-sm font-medium text-red-800 dark:text-red-200">${i18n.tachoCompensation}</p>
            <p class="text-2xl font-bold text-red-600 dark:text-red-400">${formatDuration(debtMinutes)}</p>
        </div>` : '';

    const html = `
    <div class="grid ${debtMinutes > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-2 text-center">
        <div class="p-2 bg-blue-50 dark:bg-blue-600/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p class="text-sm font-medium text-blue-800 dark:text-blue-200">${i18n.tachoAllowanceDrive10h}</p>
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">${allowance.remainingDrives}</p>
        </div>
        <div class="p-2 bg-orange-50 dark:bg-orange-600/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <p class="text-sm font-medium text-orange-800 dark:text-orange-200">${i18n.tachoAllowanceReducedRest}</p>
            <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">${allowance.remainingRests}</p>
        </div>
        ${debtHTML}
    </div>`;

    liveContainer.innerHTML = html.replace(/text-2xl/g, 'text-xl').replace(/<p class="text-sm/g, '<p class="text-xs');
    tachoContainer.innerHTML = html;
}

function getWeekIdentifier(d) {
    const date = new Date(d.valueOf());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return date.getFullYear() + '-' + (1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7));
}

function getSplitRestData() { return JSON.parse(localStorage.getItem('splitRestData') || '{}'); }
function saveSplitRestData(data) { localStorage.setItem('splitRestData', JSON.stringify(data)); }
function getWeeklyRestData() { return JSON.parse(localStorage.getItem('weeklyRestData') || '{}'); }
function saveWeeklyRestData(data) { localStorage.setItem('weeklyRestData', JSON.stringify(data)); }

function handleTachographToggle(checkbox, recordId, type) {
    const data = type === 'split' ? getSplitRestData() : getWeeklyRestData();
    if (checkbox.checked) { data[recordId] = true; } else { delete data[recordId]; }
    if (type === 'split') saveSplitRestData(data); else saveWeeklyRestData(data);
    renderTachographAnalysis();
    renderWeeklyAllowance();
}

function renderTachographAnalysis() {
    const i18n = translations[currentLang];
    const container = document.getElementById('tachograph-list');
    if (!container) return;
    const sortedRecords = [...records].sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));
    if (sortedRecords.length < 1) { container.innerHTML = `<p class="text-center text-gray-500 py-8">${i18n.noEntries}</p>`; return; }

    const splitRestData = getSplitRestData();
    const weeklyRestData = getWeeklyRestData();
    let analysisResults = [];
    let reducedDailyRestCounter = 0;
    let extendedDrivingInWeekCounter = {};

    for (let i = 0; i < sortedRecords.length; i++) {
        const currentRecord = sortedRecords[i];
        const previousRecord = i > 0 ? sortedRecords[i-1] : null;
        let restAnalysis = { text: 'First recorded day', colorClass: 'bg-gray-200 text-gray-800', duration: 0 };
        
        if (previousRecord) {
            const prevEnd = new Date(`${previousRecord.date}T${previousRecord.endTime}`);
            const currentStart = new Date(`${currentRecord.date}T${currentRecord.startTime}`);
            const restDurationMinutes = Math.round((currentStart - prevEnd) / 60000);
            restAnalysis.duration = restDurationMinutes;
            const restDurationHours = restDurationMinutes / 60;
            const isSplitRest = splitRestData[previousRecord.id] === true || previousRecord.isSplitRest;
            const isMarkedAsWeekly = weeklyRestData[currentRecord.id] === true;
            const prevWorkDurationHours = previousRecord.workMinutes / 60;

            if (restDurationHours >= 24) {
                reducedDailyRestCounter = 0;
                if (isMarkedAsWeekly) {
                    if (restDurationHours >= 45) {
                        restAnalysis = { text: `${i18n.tachoRegularWeeklyRest} (${formatDuration(restDurationMinutes)})`, colorClass: 'bg-green-700 text-white' };
                    } else {
                        restAnalysis = { text: `${i18n.tachoReducedWeeklyRest} (${formatDuration(restDurationMinutes)})`, colorClass: 'bg-green-700 text-white' };
                    }
                } else {
                     restAnalysis = { text: `${i18n.tachoLongRest} (${formatDuration(restDurationMinutes)})`, colorClass: 'bg-gray-300 text-gray-800' };
                }
            } else if (restDurationHours < 9) {
                restAnalysis = { text: `${i18n.tachoIrregularRest} (${formatDuration(restDurationMinutes)})`, colorClass: 'bg-red-500 text-white' };
            } else if (isSplitRest) {
                restAnalysis = { text: `${i18n.tachoSplitRest} (${formatDuration(restDurationMinutes)})`, colorClass: 'bg-green-200 text-green-800' };
            } else if (restDurationHours >= 11 && prevWorkDurationHours <= 13) {
                restAnalysis = { text: `${i18n.tachoRegularDailyRest} (${formatDuration(restDurationMinutes)})`, colorClass: 'bg-green-500 text-white' };
            } else {
                reducedDailyRestCounter++;
                const isForcedReduced = prevWorkDurationHours > 13;
                const reason = isForcedReduced ? ` ${i18n.tachoReason13h}` : '';
                let colorClass, countText;
                switch(reducedDailyRestCounter) {
                    case 1: colorClass = 'bg-yellow-200 text-yellow-800'; countText = '1.'; break;
                    case 2: colorClass = 'bg-yellow-400 text-black'; countText = '2.'; break;
                    case 3: colorClass = 'bg-orange-400 text-black'; countText = '3.'; break;
                    default: colorClass = 'bg-red-500 text-white'; countText = `${reducedDailyRestCounter}.`; break;
                }
                restAnalysis = { text: `${countText} ${i18n.tachoReducedDailyRest}${reason} (${formatDuration(restDurationMinutes)})`, colorClass: colorClass };
            }
        }

        let driveAnalysis;
        const driveHours = currentRecord.driveMinutes / 60;
        if (driveHours > 10) {
            driveAnalysis = { text: `${i18n.tachoIrregularDrive} (${formatDuration(currentRecord.driveMinutes)})`, colorClass: 'bg-red-500 text-white' };
        } else if (driveHours > 9) {
            const weekId = getWeekIdentifier(new Date(currentRecord.date));
            extendedDrivingInWeekCounter[weekId] = (extendedDrivingInWeekCounter[weekId] || 0) + 1;
            const countInWeek = extendedDrivingInWeekCounter[weekId];
            driveAnalysis = { text: `${countInWeek}. ${countInWeek > 2 ? '(irregular) ' : ''}${i18n.tachoIncreasedDrive} (${formatDuration(currentRecord.driveMinutes)})`, colorClass: countInWeek > 2 ? 'bg-red-500 text-white' : 'bg-blue-400 text-white' };
        } else {
            driveAnalysis = { text: `${i18n.tachoNormalDrive} (${formatDuration(currentRecord.driveMinutes)})`, colorClass: 'bg-gray-300 text-gray-800' };
        }
        analysisResults.push({ record: currentRecord, rest: restAnalysis, drive: driveAnalysis, isSplit: splitRestData[currentRecord.id] === true || currentRecord.isSplitRest, isWeekly: weeklyRestData[currentRecord.id] === true });
    }

    container.innerHTML = analysisResults.reverse().map(res => {
        const d = new Date(res.record.date + 'T00:00:00');
        const dateString = d.toLocaleDateString(currentLang, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        const isSplitActiveClass = res.isSplit ? 'bg-green-200 dark:bg-green-800 font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700';
        const checkmark = res.isSplit ? '<span class="font-bold text-lg">✓</span>' : '';
        
        let weeklyRestCheckboxHTML = '';
        if (res.rest.duration >= (24 * 60)) {
            weeklyRestCheckboxHTML = `
                <label for="weekly-${res.record.id}" class="flex items-center gap-2 cursor-pointer text-xs p-1 rounded-md ${res.isWeekly ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-600'}">
                   <input type="checkbox" id="weekly-${res.record.id}" onchange="handleTachographToggle(this, '${res.record.id}', 'weekly')" ${res.isWeekly ? 'checked' : ''} class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                   <span class="text-gray-700 dark:text-gray-200">${i18n.tachoWasWeeklyRest}</span>
                </label>`;
        }

        return `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border-l-4 ${res.rest.colorClass.replace('bg-', 'border-').replace(/ text-\w+-?\d*/g, '')}">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <p class="font-bold text-base text-gray-800 dark:text-gray-100">${dateString}</p>
                    ${weeklyRestCheckboxHTML}
                </div>
                <label for="split-${res.record.id}" class="flex items-center gap-2 cursor-pointer p-2 rounded-lg transition-colors ${isSplitActiveClass}">
                   <input type="checkbox" id="split-${res.record.id}" onchange="handleTachographToggle(this, '${res.record.id}', 'split')" ${res.isSplit ? 'checked' : ''} class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                   <span class="text-sm text-gray-700 dark:text-gray-200">${i18n.tachoSplitRest} ${checkmark}</span>
                </label>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div class="p-2 rounded ${res.rest.colorClass}">
                    <p class="font-semibold">${i18n.tachoRestBeforeShift}</p>
                    <p>${res.rest.text}</p>
                </div>
                <div class="p-2 rounded ${res.drive.colorClass}">
                    <p class="font-semibold">${i18n.tachoDailyDriveTime}</p>
                    <p>${res.drive.text}</p>
                </div>
            </div>
        </div>`;
    }).join('');
}
