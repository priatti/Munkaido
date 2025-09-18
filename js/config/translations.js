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
        menuHelp: "Súgó",
        menuHelpDesc: "Használati útmutató és tippek",
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
        settingsUploadData: "Adatok visszöltése",
        settingsAboutCreator: "Készítette: Princz Attila",
        slogan: "Egy kamionos, aki appot készít.",
        settingsVersion: "Verzió:",
        settingsInstallAppTitle: "Alkalmazás Telepítése",
        settingsInstallAppDesc: "Telepítse az alkalmazást a kezdőképernyőjére a gyorsabb elérés és az offline használat érdekében.",
        settingsInstallButton: "Telepítés",
        developerIntroTitle: "Egy sofőrtől a többi sofőrnek",
        developerIntroBody: "Szia! Princz Attila vagyok, és hozzád hasonlóan én is kamionsofőrként dolgozom.<br><br>Évekig használtam a füzetet és különféle, nem igazán felhasználóbarát alkalmazásokat a munkaidőm és a raklapjaim követésére. Tudtam, hogy létezik egy egyszerűbb, gyorsabb és megbízhatóbb módszer.<br><br>Ezért hoztam létre a Munkaidő Nyilvántartó Pro-t: egy olyan eszközt, ami a valós, mindennapi problémáinkra nyújt megoldást, felesleges bonyolítások nélkül. Minden funkciót – a hétvégi átforduló műszak kezelésétől a tachográf-elemzőig – a saját és a kollégáim tapasztalatai alapján fejlesztettem.<br><br>Remélem, neked is annyi időt és fejfájást spórol meg, mint nekem.<br><br>Biztonságos utat!",
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
        tachoDevWarning: "A tachográf funkciók kísérleti fázisban vannak. Ha hibát találsz, kérlek jelezd!",
        // Raklapok
        palletsTitle: "Paletta Nyilvántartás",
        palletsBalance: "Aktuális egyenleg:",
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
        palletsTypeLabel: "Típus / Megjegyzés",
        palletsTypePlaceholder: "Pl. EUR, DD, CHEP...",
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
        palletSettingsTitle: "📦 Raklap Beállítások",
        // Raklap beállítások
        toggleMultiPallet: "Több raklaptípus kezelése",
        multiPalletDesc: "Kapcsold be, ha az EUR mellett más típusokat is szeretnél nyilvántartani (pl. DD, CHEP).",
        addPalletType: "Hozzáadás",
        newPalletTypeLabel: "Egyedi raklaptípusok",
        newPalletTypePlaceholder: "Pl. DD, CHEP...",
        palletTypeName: "Típusnév",
        deletePalletTypeConfirm: "Biztosan törölni szeretnéd a(z) \"{type}\" típust?",
        palletTypeExists: "Ez a típus már létezik!",
        palletTypeNameEmpty: "A típusnév nem lehet üres!",
        // Üzenetek
        alertShareInAppBrowser: "A megosztás Messenger/Facebook böngészőben nem támogatott. A sikeres megosztáshoz, kérlek, nyisd meg a linket a telefonod rendes böngészőjében (pl. Chrome, Safari)!",
        alertConfirmReducedRest: "Figyelem: a pihenőidőd kevesebb, mint 11 óra volt. Ez csökkentett napi pihenőnek számít, és fel fog használni egyet a heti 3 keretből. Biztosan elindítod a műszakot?",
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
        palletInvalidData: "Kérlek add meg a helyszínt és legalább az egyik mennyiséget!",
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
        shareErrorCannotShare: 'Ezt a fájlt nem lehet megosztani.',
        // Súgó
        helpTitle: "Súgó és Gyakori Kérdések",
        // ... (a többi súgó szöveg)
    },
    de: {
        // ... (a többi német fordítás)
        // Meldungen
        alertShareInAppBrowser: "Das Teilen wird im Messenger/Facebook-Browser nicht unterstützt. Für ein erfolgreiches Teilen öffnen Sie den Link bitte im normalen Browser Ihres Telefons (z.B. Chrome, Safari)!",
        alertConfirmReducedRest: "Achtung: Ihre Ruhezeit betrug weniger als 11 Stunden. Dies zählt als reduzierte tägliche Ruhezeit und verbraucht eine Ihrer 3 wöchentlichen Gelegenheiten. Möchten Sie die Schicht wirklich starten?",
        alertRolloverTitle: "Schicht über das Wochenende",
        // ... (a többi német üzenet)
    }
};

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
            if (el.placeholder) {
                el.placeholder = translation;
            } else if (el.title && (el.tagName === 'BUTTON' || el.tagName === 'A')) {
                el.title = translation;
            } else {
                el.innerHTML = translation;
            }
        }
    });

    document.title = i18n.appTitle;
    updateLanguageButtonStyles();
    
    const compensationSectionDe = document.getElementById('compensation-section-de');
    if(compensationSectionDe) {
        compensationSectionDe.style.display = currentLang === 'de' ? 'none' : 'block';
    }
    const compensationToggle = document.getElementById('toggleCompensation');
    if(compensationToggle && compensationToggle.parentElement && compensationToggle.parentElement.parentElement) {
        const compCard = compensationToggle.closest('.enhanced-toggle-container'); if (compCard) { compCard.style.display = currentLang === 'de' ? 'none' : 'flex'; }
    }
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