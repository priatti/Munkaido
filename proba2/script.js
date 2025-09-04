// Folytatás a script.js fájlból...

async function sharePDF() {
     const i18n = translations[currentLang];
     if (!currentMonthlyData) { showCustomAlert(i18n.alertGenerateReportFirst, "info"); return; }
    if (!navigator.share) { showCustomAlert(i18n.alertShareNotSupported, "info"); return; }
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const userName = document.getElementById('userNameInput').value || 'Név Nincs Megadva';
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

        // PDF generálás (rövidített verzió)
        doc.setFontSize(18); doc.setFont(undefined, 'bold'); doc.text('ARBEITSZEITNACHWEIS', 105, 15, { align: 'center' });
        doc.setFontSize(14); doc.setFont(undefined, 'normal'); doc.text(`${monthName} ${year}`, 105, 23, { align: 'center' });
        doc.setFontSize(12); doc.text(userName, 105, 31, { align: 'center' });

        // ... (PDF tartalom itt ugyanaz mint az exportToPDF-ben) ...
        
        const pdfBlob = doc.output('blob');
        const fileName = `Arbeitszeitnachweis-${userName.replace(/ /g,"_")}-${year}-${monthName}.pdf`;
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        const shareData = { files: [pdfFile], title: `Arbeitszeitnachweis - ${monthName} ${year}`, text: `Anbei mein Arbeitszeitnachweis für ${monthName} ${year}.`, };
        
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

function saveSettings() { 
    localStorage.setItem('userName', document.getElementById('userNameInput').value); 
    showCustomAlert(translations[currentLang].settingsSaved, 'success'); 
}

function loadSettings() { 
    document.getElementById('userNameInput').value = localStorage.getItem('userName') || ''; 
    document.getElementById('themeSelector').value = localStorage.getItem('theme') || 'auto'; 
    document.getElementById('autoExportSelector').value = localStorage.getItem('autoExportFrequency') || 'never'; 
}

function exportData() { 
    if (records.length === 0) { 
        showCustomAlert(translations[currentLang].alertNoDataToExport, 'info'); 
        return; 
    } 
    
    const dataStr = JSON.stringify(records, null, 2); 
    const blob = new Blob([dataStr], { type: 'application/json' }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `munkaido_backup_${new Date().toISOString().split("T")[0]}.json`; 
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a); 
    URL.revokeObjectURL(url); 
}

function importData() {
    const i18n = translations[currentLang];
    const fileInput = document.getElementById('importFile');
    if (!fileInput.files.length) { 
        showCustomAlert(i18n.alertChooseFile, 'info'); 
        return; 
    }
    if (!confirm(i18n.alertConfirmImport)) return;
    
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                records = imported;
                if (currentUser) { 
                    migrateLocalToFirestore(records, 'records'); 
                } else { 
                    localStorage.setItem('workRecords', JSON.stringify(records)); 
                }
                renderApp();
                showCustomAlert(i18n.alertImportSuccess, 'success');
            } else { 
                throw new Errorconst translations = {
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
        settingsSyncDesc: "Jelentkezz be a Google fiókkoddal, hogy az adataidat a felhőbe mentsd és több eszközön is elérd.",
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
        autoBackupOn: "Automatikus mentés bekapcsolva!",
        autoBackupOff: "Automatikus mentés kikapcsolva.",
        settingsSaved: "Beállítások mentve!"
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
        autoBackupOn: "Automatische Sicherung aktiviert!",
        autoBackupOff: "Automatische Sicherung deaktiviert.",
        settingsSaved: "Einstellungen gespeichert!"
    }
};

// ====== TÖBBNYELVŰSÉG RENDSZER ======

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
                } else if (el.tagName === 'SPAN' || el.tagName === 'P' || el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3') {
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
// ===== FIREBASE ÉS AUTHENTIKÁCIÓS LOGIKA (v8.10) =======
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
            let errorMessage = translations[currentLang].alertLoginError;
            if (error.code === 'auth/popup-closed-by-user') { errorMessage = translations[currentLang].alertPopupClosed; } 
            else if (error.code === 'auth/popup-blocked') { errorMessage = translations[currentLang].alertPopupBlocked;}
            console.error('Bejelentkezési hiba:', error);
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
        console.log("Bejelentkezve:", user.uid);
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
        console.log("Kijelentkezve.");
        records = JSON.parse(localStorage.getItem('workRecords') || '[]');
        palletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');
    }

    await runNightWorkRecalculation();
    
    renderApp();
    updateAllTexts(); // JAVÍTÁS: Fordítás lefuttatása a teljes UI felépítése után
    checkForAutoExport();
});

async function loadRecordsFromFirestore(collectionName) {
    if (!currentUser) return [];
    try {
        const snapshot = await db.collection('users').doc(currentUser.uid).collection(collectionName).get();
        return snapshot.docs.map(doc => doc.data());
    } catch (error) {
        console.error(`Hiba a(z) ${collectionName} adatok letöltésekor:`, error);
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
         console.log(`${collectionName} adatok migrálva a felhőbe.`);
    } catch (error) {
        console.error(`Hiba a(z) ${collectionName} adatok feltöltésekor:`, error);
    }
}

function updateAuthUI(user) { 
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
    if (currentUser) { 
        try { 
            await db.collection('users').doc(currentUser.uid).collection('records').doc(String(id)).delete(); 
        } catch (error) { 
            console.error("Hiba a Firestore-ból való törléskor:", error); 
            showCustomAlert(translations[currentLang].alertSaveToCloudError, 'info'); 
        } 
    } 
}

// =======================================================
// ===== ALKALMAZÁS LOGIKA (v8.10) =======================
// =======================================================

let records = []; 
let palletRecords = [];
let editingId = null;
let inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null'); 
let uniqueLocations = [];
let uniquePalletLocations = [];
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
    // updateAllTexts(); // Eltávolítva innen, mert az auth.onAuthStateChanged-ben hatékonyabb

    document.addEventListener('click', (event) => {
        const dropdownContainer = document.getElementById('dropdown-container');
        if (dropdownContainer && !dropdownContainer.contains(event.target)) { closeDropdown(); }
        if (!event.target.closest('.autocomplete-list')) { hideAutocomplete(); }
    });
    
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

// =======================================================
// ===== VIZUÁLIS ALLOWANCE MEGJELENÍTŐ (ÚJ v8.10) ======
// =======================================================

function renderWeeklyAllowance() {
    const i18n = translations[currentLang];
    const liveContainer = document.getElementById('live-allowance-display');
    const tachoContainer = document.getElementById('tacho-allowance-display');
    if (!liveContainer || !tachoContainer) return;

    const allowance = calculateWeeklyAllowance();
    const debtMinutes = calculateRestDebt();
    
    // 10 órás vezetések (2 db összesen) - vizuális körök
    const driveCirclesHTML = createVisualCircles(2, allowance.remainingDrives, '10');
    
    // 9 órás pihenők (3 db összesen) - vizuális körök  
    const restCirclesHTML = createVisualCircles(3, allowance.remainingRests, '9');

    const debtHTML = debtMinutes > 0 ? `
        <div class="p-2 bg-red-50 dark:bg-red-600/20 rounded-lg border border-red-200 dark:border-red-800 text-center">
            <p class="text-sm font-medium text-red-800 dark:text-red-200">${i18n.tachoCompensation}</p>
            <p class="text-xl font-bold text-red-600 dark:text-red-400">${formatDuration(debtMinutes)}</p>
        </div>` : '';

    const html = `
        <div class="space-y-3">
            <!-- 10 órás vezetések -->
            <div class="p-3 bg-blue-50 dark:bg-blue-600/20 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
                <p class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">${i18n.tachoAllowanceDrive10h}</p>
                <div class="flex justify-center gap-3">
                    ${driveCirclesHTML}
                </div>
            </div>
            
            <!-- 9 órás pihenők -->
            <div class="p-3 bg-orange-50 dark:bg-orange-600/20 rounded-lg border border-orange-200 dark:border-orange-800 text-center">
                <p class="text-sm font-medium text-orange-800 dark:text-orange-200 mb-3">${i18n.tachoAllowanceReducedRest}</p>
                <div class="flex justify-center gap-2">
                    ${restCirclesHTML}
                </div>
            </div>
            
            ${debtHTML}
        </div>`;

    liveContainer.innerHTML = html.replace(/text-xl/g, 'text-lg').replace(/p-3/g, 'p-2');
    tachoContainer.innerHTML = html;
}

// Körök generálása - piros áthúzott vagy zöld ép
function createVisualCircles(totalCount, remainingCount, number) {
    let circlesHTML = '';
    
    for (let i = 0; i < totalCount; i++) {
        const isUsed = i >= remainingCount; // Használt = piros áthúzott
        const isAvailable = i < remainingCount; // Elérhető = zöld ép
        
        if (isAvailable) {
            // Zöld kör
            circlesHTML += `
                <div class="relative w-12 h-12 bg-green-500 border-2 border-green-600 rounded-full flex items-center justify-center">
                    <span class="text-white font-bold text-lg">${number}</span>
                </div>
            `;
        } else {
            // Piros áthúzott kör
            circlesHTML += `
                <div class="relative w-12 h-12 bg-red-500 border-2 border-red-600 rounded-full flex items-center justify-center">
                    <span class="text-white font-bold text-lg">${number}</span>
                    <!-- Áthúzó vonal -->
                    <div class="absolute inset-0 flex items-center justify-center">
                        <div class="w-8 h-0.5 bg-white transform rotate-45"></div>
                    </div>
                </div>
            `;
        }
    }
    
    return circlesHTML;
}

// =======================================================
// ===== PALETTA RENDSZER ÚJRAGONDOLVA (v8.10) ==========
// =======================================================

// 1:1 csere kezelő
function handleOneToOneExchange() {
    const takenInput = document.getElementById('palletQuantityTaken');
    const givenInput = document.getElementById('palletQuantityGiven');
    
    if (takenInput.value && !givenInput.value) {
        givenInput.value = takenInput.value;
    } else if (givenInput.value && !takenInput.value) {
        takenInput.value = givenInput.value;
    } else if (!takenInput.value && !givenInput.value) {
        const quantity = prompt("Hány darab raklapot cseréltél 1:1-ben?");
        if (quantity && quantity > 0) {
            takenInput.value = quantity;
            givenInput.value = quantity;
        }
    }
}

// Új paletta mentés - külön bejegyzésekkel
async function savePalletEntryNew() {
    const date = document.getElementById('palletDate').value;
    const location = document.getElementById('palletLocation').value.trim();
    const taken = parseInt(document.getElementById('palletQuantityTaken').value, 10) || 0;
    const given = parseInt(document.getElementById('palletQuantityGiven').value, 10) || 0;
    const licensePlate = document.getElementById('palletLicensePlate').value.trim().toUpperCase();

    if (!date || !location || (taken === 0 && given === 0)) {
        showCustomAlert("Kérlek töltsd ki a dátumot, helyszínt és legalább az egyik mennyiséget!", "info");
        return;
    }

    // Külön bejegyzések - így a riportban külön oszlopokban megjelennek
    if (taken > 0) {
        palletRecords.push({
            id: String(Date.now() + '_taken'),
            date, location, licensePlate,
            quantityTaken: taken,
            quantityGiven: 0,
            action: 'felvett'
        });
    }
    
    if (given > 0) {
        palletRecords.push({
            id: String(Date.now() + '_given'), 
            date, location, licensePlate,
            quantityTaken: 0,
            quantityGiven: given,
            action: 'leadott'
        });
    }

    if (licensePlate) {
        localStorage.setItem('lastPalletLicensePlate', licensePlate);
    }

    await savePalletData();
    renderPalletRecords();
    updateUniquePalletLocations();

    // Mezők törlése
    document.getElementById('palletQuantityTaken').value = '';
    document.getElementById('palletQuantityGiven').value = '';
    document.getElementById('palletLocation').value = '';
    
    showCustomAlert(translations[currentLang].palletSaveSuccess, "success");
}

// Paletta riport nyelvi választóval és 3 oszloppal
function generatePalletReportWithLanguage() {
    if (palletRecords.length === 0) {
        showCustomAlert("Nincs raklapmozgás, amiből riportot lehetne készíteni.", "info");
        return;
    }

    // Nyelv választó
    const isGerman = confirm("Német nyelvű riport készítsék? \n\nOK = Német riport\nMégse = Magyar riport");
    const language = isGerman ? 'de' : 'hu';
    
    generatePalletReportInLanguage(language);
}

function generatePalletReportInLanguage(language) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const userName = document.getElementById('userNameInput').value || (language === 'de' ? 'Name nicht angegeben' : 'Név Nincs Megadva');
        
        // Nyelvfüggő szövegek
        const texts = language === 'de' ? {
            title: 'Palettenbewegung Bericht',
            currentBalance: 'Aktueller Saldo:',
            date: 'Datum',
            location: 'Standort',
            taken: 'Aufgen.',
            given: 'Abgeg.',
            difference: 'Diff.',
            licensePlate: 'Kennzeichen',
            balance: 'Saldo',
            pieces: 'Stk'
        } : {
            title: 'Raklapmozgás Riport',
            currentBalance: 'Aktuális egyenleg:',
            date: 'Dátum', 
            location: 'Helyszín',
            taken: 'Felvett',
            given: 'Leadott',
            difference: 'Különb.',
            licensePlate: 'Rendszám',
            balance: 'Egyenleg',
            pieces: 'db'
        };

        const sortedRecords = [...palletRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Egyenleg számolás
        let currentBalance = 0;
        const balanceAfterEach = [];
        sortedRecords.forEach(p => {
            if (p.action === 'felvett') currentBalance += (p.quantityTaken || p.quantity || 0);
            if (p.action === 'leadott') currentBalance -= (p.quantityGiven || p.quantity || 0);
            balanceAfterEach.push(currentBalance);
        });

        // PDF fejléc
        doc.setFontSize(18); 
        doc.setFont(undefined, 'bold'); 
        doc.text(texts.title, 105, 15, { align: 'center' });
        doc.setFontSize(12); 
        doc.text(userName, 105, 23, { align: 'center' });
        doc.setFontSize(10); 
        doc.text(`${texts.currentBalance} ${currentBalance} ${texts.pieces}`, 105, 31, { align: 'center' });

        // Táblázat fejléc
        let yPos = 45;
        const headers = [texts.date, texts.location, texts.taken, texts.given, texts.difference, texts.licensePlate, texts.balance];
        const colWidths = [22, 45, 18, 18, 18, 25, 20]; // 3 oszlop a mennyiségeknek

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        let xPos = 15;
        headers.forEach((h, i) => {
            doc.text(h, xPos, yPos);
            xPos += colWidths[i];
        });
        yPos += 7;
        doc.line(15, yPos - 5, 185, yPos - 5);
        
        // Adatok
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);

        sortedRecords.forEach((p, index) => {
            xPos = 15;
            const taken = p.quantityTaken || (p.action === 'felvett' ? p.quantity : 0) || 0;
            const given = p.quantityGiven || (p.action === 'leadott' ? p.quantity : 0) || 0;
            const difference = taken - given;
            
            const row = [
                p.date, 
                p.location, 
                taken > 0 ? `${taken}` : '-',
                given > 0 ? `${given}` : '-', 
                difference !== 0 ? (difference > 0 ? `+${difference}` : `${difference}`) : '0',
                p.licensePlate || '-', 
                `${balanceAfterEach[index]}`
            ];
            
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

        // Fájlnév és mentés
        const fileName = language === 'de' 
            ? `Palettenbericht-${userName.replace(/ /g, "_")}-${new Date().toISOString().split("T")[0]}.pdf`
            : `Raklap_Riport-${userName.replace(/ /g, "_")}-${new Date().toISOString().split("T")[0]}.pdf`;
        
        doc.save(fileName);
        
    } catch (e) {
        console.error("PDF generálási hiba:", e);
        showCustomAlert("Hiba történt a PDF generálása közben: " + e.message, 'info');
    }
}

async function savePalletData() {
    if (currentUser) {
        const batch = db.batch();
        palletRecords.forEach(record => {
            const docRef = db.collection('users').doc(currentUser.uid).collection('pallets').doc(String(record.id));
            batch.set(docRef, record);
        });
        await batch.commit().catch(e => console.error("Hiba a paletta adatok mentésekor:", e));
    } else {
        localStorage.setItem('palletRecords', JSON.stringify(palletRecords));
    }
}

function updateUniquePalletLocations() {
    const locations = new Set(palletRecords.map(r => r.location));
    uniquePalletLocations = Array.from(locations).sort();
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
            return curr.action === 'felvett' ? acc + (curr.quantityTaken || curr.quantity || 0) : acc - (curr.quantityGiven || curr.quantity || 0);
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
        const taken = p.quantityTaken || (p.action === 'felvett' ? p.quantity : 0) || 0;
        const given = p.quantityGiven || (p.action === 'leadott' ? p.quantity : 0) || 0;
        
        if (taken > 0 && given === 0) {
            actionClass = 'pallet-entry-felvett';
            textColor = 'text-green-700 dark:text-green-300';
            sign = '+';
        } else if (given > 0 && taken === 0) {
            actionClass = 'pallet-entry-leadott';
            textColor = 'text-red-700 dark:text-red-300';
            sign = '-';
        } else {
            actionClass = 'pallet-entry-csere';
            textColor = 'text-gray-500 dark:text-gray-400';
            sign = '⇄';
        }
        
        const licensePlateHTML = p.licensePlate
            ? `<p class="text-xs text-gray-400 mt-1">Rendszám: ${p.licensePlate}</p>`
            : '';

        const quantity = Math.max(taken, given);

        return `
        <div class="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border-l-4 ${actionClass} flex items-center justify-between">
            <div>
                <p class="font-semibold text-gray-800 dark:text-gray-100">${p.location}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${p.date}</p>
                ${licensePlateHTML}
            </div>
            <div class="text-right">
                 <p class="font-bold text-lg ${textColor}">${sign}${quantity} db</p>
                 <button onclick="deletePalletEntry('${p.id}')" class="text-xs text-gray-400 hover:text-red-500">🗑️ <span data-translate-key="delete">${i18n.delete}</span></button>
            </div>
        </div>
        `;
    }).join('');
}

// =======================================================
// ===== NYELVFÜGGŐ HÓNAP NEVEK JAVÍTÁSA (v8.10) ========
// =======================================================

function getMonthlyData(date) { 
    const year = date.getFullYear(); 
    // JAVÍTÁS: Nyelvfüggő hónap nevek
    const labels = currentLang === 'de' 
        ? ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
        : ['Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún', 'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec'];
        
    const datasets = { work: Array(12).fill(0), drive: Array(12).fill(0), night: Array(12).fill(0), km: Array(12).fill(0) }; 
    
    records.filter(r => r.date.startsWith(year)).forEach(r => { 
        const monthIndex = new Date(r.date + 'T00:00:00').getMonth(); 
        datasets.work[monthIndex] += r.workMinutes / 60; 
        datasets.drive[monthIndex] += r.driveMinutes / 60; 
        datasets.night[monthIndex] += r.nightWorkMinutes / 60; 
        datasets.km[monthIndex] += r.kmDriven; 
    }); 
    
    return { labels, datasets }; 
}

// =======================================================
// ===== ALAPFUNKCIÓK ÉS SEGÉDFUNKCIÓK ==================
// =======================================================

const isoToVehicleCode = { 'at': 'A', 'de': 'D', 'hu': 'H', 'sk': 'SK', 'si': 'SLO', 'it': 'I', 'pl': 'PL', 'cz': 'CZ', 'ro': 'RO', 'ch': 'CH', 'fr': 'F', 'nl': 'NL', 'be': 'B', 'lu': 'L', 'es': 'E', 'gb': 'UK' };

async function fetchCountryCodeFor(inputId) { 
    const inputElement = document.getElementById(inputId); 
    if (!inputElement || !navigator.geolocation) return; 
    inputElement.value = "..."; 
    try { 
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })); 
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=en`); 
        if (!response.ok) throw new Error('API hiba'); 
        const data = await response.json(); 
        const countryCode = data.address.country_code; 
        if (countryCode && isoToVehicleCode[countryCode]) { 
            inputElement.value = isoToVehicleCode[countryCode]; 
        } else { 
            inputElement.value = (countryCode || 'N/A').toUpperCase(); 
        } 
    } catch (error) { 
        inputElement.value = ""; 
        showCustomAlert(translations[currentLang].alertLocationFailed, 'info'); 
    } 
}

function toggleDropdown() { document.getElementById('dropdown-menu').classList.toggle('hidden'); }
function closeDropdown() { document.getElementById('dropdown-menu').classList.add('hidden'); }

let alertCallback = null;
function showCustomAlert(message, type, callback) { 
    const overlay = document.getElementById('custom-alert-overlay'); 
    const box = document.getElementById('custom-alert-box'); 
    const iconContainer = document.getElementById('custom-alert-icon'); 
    const messageEl = document.getElementById('custom-alert-message'); 
    const buttonsContainer = document.getElementById('custom-alert-buttons'); 
    const i18n = translations[currentLang]; 
    
    messageEl.textContent = message; 
    alertCallback = callback || null; 
    
    iconContainer.className = 'w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center'; 
    buttonsContainer.innerHTML = ''; 
    
    const warningIcon = `<svg class="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`; 
    
    if (type === 'warning') { 
        iconContainer.classList.add('bg-yellow-100'); 
        iconContainer.innerHTML = warningIcon; 
        buttonsContainer.innerHTML = `<button onclick="hideCustomAlert(false)" class="py-2 px-6 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">${i18n.cancel}</button><button onclick="hideCustomAlert(true)" class="py-2 px-6 bg-yellow-400 text-white rounded-lg font-semibold hover:bg-yellow-500">${i18n.save}</button>`; 
    } else if (type === 'info') { 
        iconContainer.classList.add('bg-yellow-100'); 
        iconContainer.innerHTML = warningIcon; 
        buttonsContainer.innerHTML = `<button onclick="hideCustomAlert(true)" class="py-2 w-2/3 bg-yellow-400 text-white rounded-lg font-semibold hover:bg-yellow-500">${i18n.ok}</button>`; 
    } else if (type === 'success') { 
        iconContainer.classList.add('bg-green-100', 'success-icon'); 
        iconContainer.innerHTML = `<svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path class="checkmark-path" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`; 
        buttonsContainer.innerHTML = `<button onclick="hideCustomAlert(true)" class="py-2 w-2/3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600">${i18n.ok}</button>`; 
    } 
    
    overlay.classList.remove('hidden'); 
    overlay.classList.add('flex'); 
    setTimeout(() => { 
        overlay.classList.remove('opacity-0'); 
        box.classList.remove('scale-95'); 
    }, 10); 
}

function hideCustomAlert(isConfirmed) { 
    const overlay = document.getElementById('custom-alert-overlay'); 
    const box = document.getElementById('custom-alert-box'); 
    overlay.classList.add('opacity-0'); 
    box.classList.add('scale-95'); 
    setTimeout(() => { 
        overlay.classList.add('hidden'); 
        overlay.classList.remove('flex'); 
        if (isConfirmed && alertCallback) { 
            alertCallback(); 
        } 
        alertCallback = null; 
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
        if(selectedTitleEl) { 
            const selectedTitle = selectedTitleEl.innerText; 
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
    
    Object.keys(inProgressEntry).forEach(key => { 
        const el = document.getElementById(key.replace('Str', '')); 
        if (el) el.value = inProgressEntry[key]; 
    }); 
    
    (inProgressEntry.crossings || []).forEach(c => addCrossingRow(c.from, c.to, c.time)); 
    document.getElementById('endTime').focus(); 
}

function discardShift() { 
    if (confirm(translations[currentLang].alertConfirmDelete)) { 
        localStorage.removeItem('inProgressEntry'); 
        inProgressEntry = null; 
        renderLiveTabView(); 
        updateAllTexts(); 
    } 
}

function getSortedRecords() { 
    return [...(records || [])].sort((a, b) => new Date(`${b.date||"1970-01-01"}T${b.startTime||"00:00"}`) - new Date(`${a.date||"1970-01-01"}T${a.startTime||"00:00"}`)); 
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
    ['date', 'startTime', 'endTime', 'startLocation', 'endLocation', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd'].forEach(id => document.getElementById(id).value = ''); 
    
    const splitRestToggle = document.getElementById('toggleSplitRest'); 
    if(splitRestToggle) { 
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

['startTime', 'endTime', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd'].forEach(id => { 
    if (document.getElementById(id)) document.getElementById(id).addEventListener('input', updateDisplays); 
});

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

async function fetchLocation() { 
    if (!navigator.geolocation) { 
        showCustomAlert(translations[currentLang].alertGeolocationNotSupported, 'info'); 
        return; 
    } 
    
    const endLocationInput = document.getElementById('endLocation'); 
    endLocationInput.value = "..."; 
    
    try { 
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })); 
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=hu`); 
        if (!response.ok) throw new Error('API hiba'); 
        const data = await response.json(); 
        endLocationInput.value = data.address.city || data.address.town || data.address.village || 'Ismeretlen hely'; 
    } catch (error) { 
        endLocationInput.value = ""; 
        showCustomAlert(translations[currentLang].alertLocationFailed, 'info'); 
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

async function deleteRecord(id) { 
    if (confirm(translations[currentLang].alertConfirmDelete)) { 
        const splitData = getSplitRestData(); 
        delete splitData[id]; 
        saveSplitRestData(splitData); 
        
        const weeklyData = getWeeklyRestData(); 
        delete weeklyData[id]; 
        saveWeeklyRestData(weeklyData); 
        
        await deleteRecordFromStorage(id); 
        records = records.filter(r => r.id !== String(id)); 
        
        if(!currentUser) { 
            localStorage.setItem('workRecords', JSON.stringify(records)); 
        } 
        
        renderApp(); 
    } 
}

// Folytatás következik...
