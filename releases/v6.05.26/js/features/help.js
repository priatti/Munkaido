// =======================================================
// ===== SÚGÓ (FEATURE) ==================================
// =======================================================

function renderHelp() {
    // Append legal info at bottom (non-sticky)
    setTimeout(() => {
        const cont = document.getElementById('content-help');
        if (cont && !document.getElementById('legal-info-help')) {
            const legal = document.createElement('div');
            legal.id = 'legal-info-help';
            legal.className = 'text-xs text-gray-400 my-3 text-center';
            const v = (window.APP_INFO && APP_INFO.version) ? APP_INFO.version : '';
            const year = (window.APP_INFO && APP_INFO.year) ? APP_INFO.year : '2025';
            const versionStr = v ? ` | v${v}` : '';
            legal.innerHTML = `© ${year} Princz Attila | GuriGO — <a href="mailto:info@gurigo.eu" class="underline">info@gurigo.eu</a>${versionStr}`;
            cont.appendChild(legal);
        }
    }, 0);

    const container = document.getElementById('content-help');
    if (!container) return;
    const i18n = translations[currentLang];

    const t = (key, fallback) => {
        try {
            const v = i18n && i18n[key];
            if (v === undefined || v === null || String(v).trim() === '') return fallback;
            return v;
        } catch (_) {
            return fallback;
        }
    };

    const createSection = (titleKey, content) => `
        <div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">${t(titleKey, '')}</h3>
            <div class="space-y-3 text-sm text-gray-600 dark:text-gray-300">${content}</div>
        </div>
    `;

    const createAccordionItem = (title, content) => `
        <details class="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden">
            <summary class="cursor-pointer select-none px-4 py-3 font-semibold text-gray-800 dark:text-gray-100 flex items-center justify-between">
                <span>${title}</span>
                <span class="text-gray-400">▾</span>
            </summary>
            <div class="px-4 pb-4 pt-1 space-y-3 text-sm text-gray-600 dark:text-gray-300">${content}</div>
        </details>
    `;

    container.innerHTML = `
        <h2 class="text-xl font-bold mb-4 text-center">${t('helpTitle', 'Súgó és Gyakori Kérdések')}</h2>
        
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-5 mb-6 text-center shadow-sm">
            <h3 class="text-xl font-bold text-blue-900 dark:text-blue-100">GuriGO</h3>
            <p class="text-sm text-gray-700 dark:text-gray-300 italic mt-2">${t('slogan', 'Egy kamionos, aki appot készít.')}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2"> ${(window.APP_INFO && APP_INFO.year) ? APP_INFO.year : '2025'} ${currentLang === 'de' ? (window.APP_INFO && APP_INFO.authorDe ? APP_INFO.authorDe : 'Attila Princz') : (window.APP_INFO && APP_INFO.authorHu ? APP_INFO.authorHu : 'Princz Attila')}</p>
        </div>

        <div class="bg-yellow-50 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <p class="text-sm text-gray-700 dark:text-gray-200">
                <strong>${t('helpSafetyTitle', 'Fontos')}:</strong> ${t('helpSafetyBody', 'Vezetés közben az alkalmazás kezelése tilos! A GuriGO nem hivatalos tachográf; mindig a tachográf adatai az elsődlegesek.')}
            </p>
        </div>

        <div class="space-y-3 mb-6">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">${t('helpQuickStartTitle', 'Gyors indítás (1 perc)')}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <div class="flex items-start justify-between gap-2">
                        <div>
                            <p class="font-semibold text-gray-800 dark:text-gray-100">${t('helpQuickStartLiveTitle', 'Élő indítás (ajánlott)')}</p>
                            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">${t('helpQuickStartLiveDesc', 'Műszak elején indítsd el, a végén csak a záró adatokat add meg.')}</p>
                        </div>
                        <button type="button" class="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700" data-goto-tab="start">${t('helpOpenStartTab', 'Megnyitás')}</button>
                    </div>
                </div>
                <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <div class="flex items-start justify-between gap-2">
                        <div>
                            <p class="font-semibold text-gray-800 dark:text-gray-100">${t('helpQuickStartFullTitle', 'Teljes nap (utólag)')}</p>
                            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">${t('helpQuickStartFullDesc', 'Ha nem indítottad el időben, egyben is rögzítheted a napot.')}</p>
                        </div>
                        <button type="button" class="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700" data-goto-tab="full-day">${t('helpOpenFullDayTab', 'Megnyitás')}</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="space-y-3 mb-6">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">${t('helpManualTitle', 'Részletes kézikönyv / Gyakori kérdések')}</h3>
            <div class="space-y-3">
                ${createAccordionItem(
                    t('helpSectionRecording', 'Munkanap rögzítése'),
                    `
                        <p>${t('helpRecordingIntro', 'Két fő módja van a munkanapok rögzítésének:')}</p>
                        <ul class="list-disc pl-5 space-y-2 mt-2">
                            <li><strong>${t('helpRecordingLiveTitle', "Élő indítás ('Indítás' fül)")}:</strong> ${t('helpRecordingLiveDesc', 'Használd ezt, amikor elkezded a műszakot. Az app rögzíti a kezdési adatokat, és a nap végén a \'Műszak befejezése\' gombra kattintva csak a záró adatokat kell megadnod.')}</li>
                            <li><strong>${t('helpRecordingFullTitle', "Utólagos rögzítés ('Teljes nap' fül)")}:</strong> ${t('helpRecordingFullDesc', 'Ezzel utólag, egyben is felviheted a teljes munkanapot, ha például elfelejtetted időben elindítani.')}</li>
                        </ul>
                    `
                )}
                ${createAccordionItem(
                    t('helpDriveTimeRecordingTitle', 'Vezetési idő rögzítése (3 mód)'),
                    `${t('helpDriveTimeRecordingBody', '<p>A vezetési időt háromféleképpen rögzítheted. Válaszd azt, ami a szokásaidhoz és a tachográf kijelzéséhez a legjobban illik, és maradj következetes.</p>')}`
                )}
                ${createAccordionItem(
                    t('helpSectionUsingApp', 'A program használata'),
                    `
                        <p><strong>${t('helpListTitle', 'Lista nézet')}:</strong> ${t('helpListDesc', 'A Lista menüpontban láthatod az összes mentett munkanapodat.')}</p>
                        <p class="mt-2"><strong>${t('helpReportTitle', 'Riportok és export')}:</strong> ${t('helpReportDesc', 'A Riport menüpontban nyomtatható havi elszámolást generálhatsz.')}</p>
                    `
                )}
                ${createAccordionItem(
                    t('helpDocumentsTitle', 'Dokumentumok (új)'),
                    `${t('helpDocumentsBody', '<p>A Dokumentumok fülön képeket és PDF-eket tudsz feltölteni.</p>')}`
                )}
                ${createAccordionItem(
                    t('helpDocumentsManagerTitle', 'Iratok / Engedélyek kezelése (új)'),
                    `${t('helpDocumentsManagerBody', '<p>Az Iratok / Engedélyek funkcióval nyomon követheted a fontos lejáratokat.</p>')}`
                )}
                ${createAccordionItem(
                    t('helpSectionPWA', 'Telepítés (PWA)'),
                    `
                        <p><strong>${t('helpPwaBenefitsTitle', 'Miért érdemes telepíteni?')}</strong></p>
                        <ul class="list-disc pl-5 space-y-1">${t('helpPwaBenefitsDesc', '<li>Gyorsabb elérés</li><li>Offline működés</li><li>Jobb teljesítmény</li>')}</ul>
                        <p class="mt-2"><strong>${t('helpPwaInstallTitle', 'Hogyan telepítsem?')}</strong></p>
                        <ul class="list-disc pl-5 space-y-1">${t('helpPwaInstallDesc', '<li>A Beállítások menüben kattints a Telepítés gombra.</li>')}</ul>
                        <p class="mt-3 font-semibold">${t('helpPwaInstallIOSTitle', 'iOS (iPhone/iPad) telepítés')}</p>
                        <ul class="list-disc pl-5 space-y-1">${t('helpPwaInstallIOSDesc', '<li>Nyisd meg a Safarit</li><li>Koppints a Megosztás ikonra</li>')}</ul>
                    `
                )}
                ${createAccordionItem(
                    t('helpSectionConcepts', 'Fontos fogalmak'),
                    `
                        <p><strong>${t('helpConceptDriveTime', 'Heti vezetési idő')}:</strong> ${t('helpConceptDriveTimeDesc', 'A program a megadott kezdő és záró értékek alapján számolja a napi vezetési időt.')}</p>
                        <p class="mt-2"><strong>${t('helpRolloverTitle', 'Áthúzódó (hétvégi) műszak')}:</strong> ${t('helpRolloverDesc', 'Ha egy műszakod vasárnap kezdődik és hétfőn ér véget, a program ezt érzékeli.')}</p>
                    `
                )}
                ${createAccordionItem(
                    t('helpKmOraallasTitle', 'Km óra állás rögzítése'),
                    `
                        <div id="km-oraallas">
                            <p><strong>${t('helpKmOraallasIntro', 'Hogyan működik a km óra állás rögzítése?')}</strong></p>
                            <p class="mt-2">${t('helpKmOraallasDesc1', 'A GuriGO-ban elég a nap végén megadni a ZÁRÓ km óra állást. A program automatikusan felajánlja ezt KEZDŐ km-ként a következő munkanap indításakor.')}</p>
                            
                            <div class="p-3 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded mt-3">
                                <p class="font-semibold text-blue-900 dark:text-blue-100">${t('helpKmOraallasExample', '📋 Példa:')}</p>
                                <ul class="list-disc pl-5 mt-2 space-y-1 text-sm">
                                    <li>${t('helpKmOraallasStep1', 'Hétfő reggel: Indítás, kezdő km = 10.000 km')}</li>
                                    <li>${t('helpKmOraallasStep2', 'Hétfő este: Zárás, záró km = 10.450 km → napi km = 450 km')}</li>
                                    <li>${t('helpKmOraallasStep3', 'Kedd reggel: Indítás, kezdő km = 10.450 km (automatikusan felajánlva)')}</li>
                                    <li>${t('helpKmOraallasStep4', 'Kedd este: Zárás, záró km = 10.820 km → napi km = 370 km')}</li>
                                </ul>
                            </div>
                            
                            <div class="p-3 bg-yellow-50 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-800 rounded mt-3">
                                <p class="font-semibold text-yellow-900 dark:text-yellow-100">⚠️ ${t('helpKmOraallasWarning', 'Fontos!')}</p>
                                <p class="mt-1 text-sm">${t('helpKmOraallasWarningDesc', 'Ha a nap indításakor megadod a kezdő km-t, akkor a nap végén a záró km-t is meg KELL adnod! Különben nem tudja a program kiszámolni a napi km-t.')}</p>
                            </div>
                            
                            <p class="mt-3"><strong>${t('helpKmOraallasOptional', 'A km óra állás rögzítése opcionális')}</strong></p>
                            <p class="mt-1 text-sm">${t('helpKmOraallasOptionalDesc', 'Ha nem használod a km óra állás funkciót, egyszerűen hagyd üresen mindkét mezőt (kezdő és záró km). A program ettől még tökéletesen működik.')}</p>
                            <p class="mt-2 text-sm">${t('helpKmOraallasDisable', 'Ha egyáltalán nem szeretnéd használni a km funkciót, kikapcsolhatod a <strong>Beállítások → Speciális funkciók → Km nyilvántartás</strong> menüpontban.')}</p>
                        </div>
                    `
                )}
                ${createAccordionItem(
                    t('helpFuelingTitle', 'Tankolás / Töltés'),
                    `${t('helpFuelingBody', '<p>A Tankolás/Töltés modulban járművenként rögzítheted az üzemanyag-tankolásokat, AdBlue feltöltéseket vagy elektromos töltéseket.</p>')}`
                )}
                ${createAccordionItem(
                    t('helpSectionTips', 'Hasznos tippek'),
                    `
                        <p><strong>${t('helpTipTimeEntry', 'Gyors időpont bevitel')}:</strong> ${t('helpTipTimeEntryDesc', 'Az időpontokat nem csak a kis órára kattintva adhatod meg.')}</p>
                        <div>
                            <p class="mt-2"><strong>${t('helpTipGps', 'GPS alapú helymeghatározás')}:</strong> ${t('helpTipGpsDesc', 'A helyszín mezők melletti ikonra kattintva a program GPS alapján kitölti a helyet.')}</p>
                            <ul class="list-disc pl-5 mt-1">
                                <li>${t('helpTipGpsLocation', 'A Teljes nap űrlapon a várost írja be.')}</li>
                                <li>${t('helpTipGpsCrossing', 'Az élő műszaknál az országkódot illeszti be.')}</li>
                            </ul>
                        </div>
                        <div class="p-3 bg-yellow-50 dark:bg-yellow-900/40 border border-yellow-200 dark:border-yellow-800 rounded mt-2">
                            <p class="font-semibold">${t('helpTipWeeklyDriveTitle', 'Tipp – Heti vezetési idő ellenőrzése')}</p>
                            <p class="mt-1">${t('helpTipWeeklyDriveDesc', 'Az Áttekintés oldalon látható heti vezetési idő a tachográfban szereplő adatokkal is összevethető.')}</p>
                        </div>
                    `
                )}
                ${createAccordionItem(
                    t('helpSectionSpecial', 'Speciális Tachográf funkciók'),
                    `
                        <p><strong>${t('helpSpecialStartCalc', 'Legkorábbi indulás számítása')}:</strong> ${t('helpSpecialStartCalcDesc', 'Amikor nincs aktív műszakod, a program kiszámolja, mikor indulhatsz legközelebb.')}</p>
                        <p class="text-xs text-yellow-700 dark:text-yellow-400 p-2 bg-yellow-50 dark:bg-yellow-900/50 rounded mt-2 italic">${t('helpSpecialWarning', 'Figyelem: Ez a kalkuláció csak a napi pihenőidőt veszi alapul.')}</p>
                        <p class="mt-2"><strong>${t('helpSpecialLatestRest', 'Legkésőbbi pihenő kezdés')}:</strong> ${t('helpSpecialLatestRestDesc', 'Amikor aktív műszakod van, a program kiszámolja, legkésőbb meddig kell megkezdened a következő pihenődet.')}</p>
                    `
                )}
                ${createAccordionItem(
                    t('helpFourHandsTitle', '4 kezes mód (Team Driving)'),
                    `${t('helpFourHandsBody', '<p>A 4 kezes mód akkor hasznos, ha két sofőr vezeti ugyanazt a járművet.</p>')}`
                )}
                ${createAccordionItem(
                    t('helpContactTitle', 'Kapcsolat és visszajelzés'),
                    `
                        <p>${t('helpContactBody', 'Kérdés, hiba vagy ötlet esetén írj nekem:')}</p>
                        <p class="mt-1"><a href="mailto:info@gurigo.eu" class="text-blue-600 dark:text-blue-400 underline">info@gurigo.eu</a></p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">${t('helpContactHint', 'Ha hibát látsz, kérlek küldj egy képernyőképet is.')}</p>
                    `
                )}
                ${createAccordionItem(
                    t('developerIntroTitle', 'Fejlesztői információ'),
                    `${t('developerIntroBody', 'Szia! Princz Attila vagyok, és hozzád hasonlóan én is kamionsofőrként dolgozom.')}`
                )}
                ${createAccordionItem(
                    t('helpLegalTitle', 'Jogi dokumentumok'),
                    `
                        <div class="space-y-2">
                            <button onclick="openLegalDoc('terms')" class="w-full text-left px-4 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-blue-700 dark:text-blue-300 transition">
                                ${t('helpLegalTerms', 'Felhasználási feltételek')}
                            </button>
                            <button onclick="openLegalDoc('privacy')" class="w-full text-left px-4 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-blue-700 dark:text-blue-300 transition">
                                ${t('helpLegalPrivacy', 'Adatvédelmi tájékoztató')}
                            </button>
                        </div>
                    `
                )}
            </div>
        </div>
    `;
}
 
