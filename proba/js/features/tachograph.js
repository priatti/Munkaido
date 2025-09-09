// =======================================================
// ===== TACHOGRÁF ELEMZŐ (FEATURE) ======================
// =======================================================

// A heti keretek (10 órás vezetés, csökkentett pihenő) kiszámítása
function calculateWeeklyAllowance() {
    const now = new Date();
    const { start, end } = getWeekRange(now);
    const startStr = toISODate(start);
    const endStr = toISODate(end);
    const recordsInWeek = records.filter(r => r.date >= startStr && r.date <= endStr);
    const extendedDrivesThisWeek = recordsInWeek.filter(r => r.driveMinutes > 540).length;
    const remainingDrives = Math.max(0, 2 - extendedDrivesThisWeek);
    
    let reducedRestsInCycle = 0;
    const sortedRecords = getSortedRecords();
    const splitData = getSplitRestData();

    // Visszafelé haladunk a bejegyzésekben, amíg heti pihenőt nem találunk
    for (let i = sortedRecords.length - 1; i > 0; i--) {
        const currentRecord = sortedRecords[i];
        const previousRecord = sortedRecords[i-1];
        const prevEnd = new Date(`${previousRecord.date}T${previousRecord.endTime}`);
        const currentStart = new Date(`${currentRecord.date}T${currentRecord.startTime}`);
        const restDurationHours = Math.round((currentStart - prevEnd) / 60000) / 60;
        
        // Megszakítjuk, ha 24 órás vagy hosszabb pihenőt (heti pihenőt) találunk
        if (restDurationHours >= 24) {
            break;
        }
        
        const isSplitRest = splitData[previousRecord.id] === true || previousRecord.isSplitRest;
        if (isSplitRest) continue; // Az osztott pihenőket nem számoljuk csökkentettnek
        
        const prevWorkDurationHours = previousRecord.workMinutes / 60;
        const isForcedReduced = prevWorkDurationHours > 13;

        // Csökkentett pihenőnek számít, ha 9-11 óra közötti VAGY ha a munkaidő 13 óránál több volt
        if ((restDurationHours >= 9 && restDurationHours < 11) || isForcedReduced) {
            reducedRestsInCycle++;
        }
    }
    const remainingRests = Math.max(0, 3 - reducedRestsInCycle);
    return { remainingDrives, remainingRests };
}

// A heti keretek megjelenítése a UI-on
function renderWeeklyAllowance() {
    const i18n = translations[currentLang];
    const liveContainer = document.getElementById('live-allowance-display');
    const tachoContainer = document.getElementById('tacho-allowance-display');
    if (!liveContainer || !tachoContainer) return;

    const allowance = calculateWeeklyAllowance();

    let driveIcons = '';
    for (let i = 0; i < 2; i++) {
        driveIcons += (i < allowance.remainingDrives) ? createAvailableIcon(10) : createUsedIcon(10);
    }

    let restIcons = '';
    for (let i = 0; i < 3; i++) {
        restIcons += (i < allowance.remainingRests) ? createAvailableIcon(9) : createUsedIcon(9);
    }

    const html = `
    <div class="flex flex-wrap gap-3">
        <div class="p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg border border-blue-200 dark:border-blue-800 text-center flex-1 min-w-[150px]">
            <p class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">${i18n.tachoAllowanceDrive10h}</p>
            <div class="flex justify-center gap-2">${driveIcons}</div>
        </div>
        <div class="p-2 bg-orange-50 dark:bg-orange-900/50 rounded-lg border border-orange-200 dark:border-orange-800 text-center flex-1 min-w-[150px]">
            <p class="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">${i18n.tachoAllowanceReducedRest}</p>
            <div class="flex justify-center gap-2">${restIcons}</div>
        </div>
    </div>`;
    
    // Az élő nézeten kisebb ikonokat használunk
    const liveHTML = html.replace(/width="45"/g, 'width="35"').replace(/height="45"/g, 'height="35"');

    liveContainer.innerHTML = liveHTML;
    tachoContainer.innerHTML = html;
}

// SVG ikon generálása a rendelkezésre álló keretekhez
function createAvailableIcon(number) {
    return `
    <svg width="45" height="45" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" class="stroke-green-600 dark:stroke-green-400" stroke-width="6" class="fill-green-50 dark:fill-green-900/50" />
        <text x="50" y="50" font-family="Arial, sans-serif" font-size="45" font-weight="bold" class="fill-green-700 dark:fill-green-200" text-anchor="middle" dy=".3em">${number}</text>
    </svg>`;
}

// SVG ikon generálása az elhasznált keretekhez
function createUsedIcon(number) {
    return `
    <svg width="45" height="45" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" class="stroke-red-500 dark:stroke-red-400" stroke-width="6" class="fill-red-50 dark:fill-red-900/50" />
        <text x="50" y="50" font-family="Arial, sans-serif" font-size="45" font-weight="bold" class="fill-red-600 dark:fill-red-300" text-anchor="middle" dy=".3em">${number}</text>
        <line x1="20" y1="20" x2="80" y2="80" class="stroke-red-700 dark:stroke-red-500" stroke-width="8" stroke-linecap="round" />
    </svg>`;
}

// A tachográf segédkártyák (legkorábbi indulás / legkésőbbi pihenő) megjelenítése
function renderTachoHelperCards() {
    const container = document.getElementById('tacho-helper-display');
    if (!container) return;

    const i18n = translations[currentLang];
    inProgressEntry = JSON.parse(localStorage.getItem('inProgressEntry') || 'null');

    if (inProgressEntry) {
        // "Legkésőbbi pihenő kezdés" kártya kirajzolása, ha műszak van folyamatban
        const allowance = calculateWeeklyAllowance();
        const startDate = new Date(`${inProgressEntry.date}T${inProgressEntry.startTime}`);
        const latestRestStart11h = new Date(startDate.getTime());
        latestRestStart11h.setHours(latestRestStart11h.getHours() + 13);
        let htmlContent = '';

        if (allowance.remainingRests > 0) {
            const latestRestStart9h = new Date(startDate.getTime());
            latestRestStart9h.setHours(latestRestStart9h.getHours() + 15);
            htmlContent = `
            <div class="bg-indigo-50 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 space-y-2">
                <h3 class="font-semibold text-indigo-800 dark:text-indigo-200 text-base">${i18n.latestRestStartTitle}</h3>
                <div class="text-sm text-gray-700 dark:text-gray-200">
                    <strong>${i18n.with11hRestLatest}</strong>
                    <div class="font-bold text-lg">${formatDateTime(latestRestStart11h)}</div>
                </div>
                 <div class="text-sm text-gray-700 dark:text-gray-200">
                    <strong>${i18n.with9hRestLatest}</strong>
                    <div class="font-bold text-lg text-indigo-600 dark:text-indigo-300">${formatDateTime(latestRestStart9h)}</div>
                </div>
            </div>`;
        } else {
            htmlContent = `
            <div class="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                 <h3 class="font-semibold text-yellow-800 dark:text-yellow-200 text-base">${i18n.latestRestStartTitle}</h3>
                 <div class="text-sm text-gray-700 dark:text-gray-200 mt-2">
                    <strong>${i18n.with11hRestLatest}</strong>
                    <div class="font-bold text-lg">${formatDateTime(latestRestStart11h)}</div>
                 </div>
                 <p class="text-sm text-red-600 dark:text-red-400 font-semibold p-2 bg-red-100 dark:bg-red-900/50 rounded mt-2">${i18n.noMoreReducedRestsWarning}</p>
            </div>`;
        }
        container.innerHTML = htmlContent;

    } else {
        // "Legkorábbi indulás" kártya kirajzolása, ha nincs folyamatban lévő műszak
        const lastRecord = getLatestRecord();
        if (!lastRecord || !lastRecord.date || !lastRecord.endTime) {
            container.innerHTML = '';
            return;
        }

        const allowance = calculateWeeklyAllowance();
        const endDate = new Date(`${lastRecord.date}T${lastRecord.endTime}`);
        const startTime11h = new Date(endDate.getTime());
        startTime11h.setHours(startTime11h.getHours() + 11);
        let htmlContent = '';
        const warningText = i18n.earliestStartWarning;

        if (allowance.remainingRests > 0) {
            const startTime9h = new Date(endDate.getTime());
            startTime9h.setHours(startTime9h.getHours() + 9);
            htmlContent = `
            <div class="bg-indigo-50 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3 space-y-2">
                <h3 class="font-semibold text-indigo-800 dark:text-indigo-200 text-base">${i18n.earliestStartTitle}</h3>
                <div class="text-sm text-gray-700 dark:text-gray-200">
                    <strong>${i18n.with9hRest}</strong> ${i18n.reducedLabel} 
                    <div class="font-bold text-lg text-indigo-600 dark:text-indigo-300">${formatDateTime(startTime9h)}</div>
                </div>
                <div class="text-sm text-gray-700 dark:text-gray-200">
                    <strong>${i18n.with11hRest}</strong> ${i18n.regularLabel}
                    <div class="font-bold text-lg">${formatDateTime(startTime11h)}</div>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 italic pt-2 border-t border-indigo-200/50">${warningText}</p>
            </div>`;
        } else {
            htmlContent = `
            <div class="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                 <h3 class="font-semibold text-yellow-800 dark:text-yellow-200 text-base">${i18n.earliestStartTitle}</h3>
                 <p class="text-sm text-yellow-700 dark:text-yellow-300 mt-1">${i18n.noMoreReducedRests}</p>
                 <div class="text-sm text-gray-700 dark:text-gray-200 mt-2">
                    <strong>${i18n.with11hRest}</strong> ${i18n.regularLabel}
                    <div class="font-bold text-lg">${formatDateTime(startTime11h)}</div>
                 </div>
                 <p class="text-xs text-gray-500 dark:text-gray-400 italic pt-2 mt-2 border-t border-yellow-200/50">${warningText}</p>
            </div>`;
        }
        container.innerHTML = htmlContent;
    }
}

// Az osztott pihenő kapcsoló eseménykezelője
function handleTachographToggle(checkbox, recordId) {
    const data = getSplitRestData();
    if (checkbox.checked) {
        data[recordId] = true;
    } else {
        delete data[recordId];
    }
    saveSplitRestData(data);
    renderTachographAnalysis();
    renderWeeklyAllowance();
}

// A tachográf elemzés fül teljes kirajzolása
function renderTachographAnalysis() {
    const i18n = translations[currentLang];
    const container = document.getElementById('tachograph-list');
    if (!container) return;

    const titleElement = document.querySelector('#content-tachograph h2');
    if (titleElement && !document.getElementById('tacho-warning-banner')) {
        const warningBanner = document.createElement('div');
        warningBanner.id = 'tacho-warning-banner';
        warningBanner.className = 'bg-yellow-50 dark:bg-yellow-900/50 border-l-4 border-yellow-400 text-yellow-700 dark:text-yellow-300 p-3 rounded-md mb-4 text-sm';
        warningBanner.innerHTML = i18n.tachoDevWarning;
        titleElement.after(warningBanner);
    }

    const sortedRecords = getSortedRecords();
    if (sortedRecords.length < 1) {
        container.innerHTML = `<p class="text-center text-gray-500 py-8">${i18n.noEntries}</p>`;
        return;
    }

    const splitRestData = getSplitRestData();
    let analysisResults = [];
    let reducedDailyRestCounter = 0;
    let extendedDrivingInWeekCounter = {};

    for (let i = 0; i < sortedRecords.length; i++) {
        const currentRecord = sortedRecords[i];
        const previousRecord = i > 0 ? sortedRecords[i - 1] : null;

        // 1. Pihenőidő elemzése (a MŰSZAK ELŐTTI pihenő)
        let restAnalysis;
        if (previousRecord) {
            const prevEnd = new Date(`${previousRecord.date}T${previousRecord.endTime}`);
            const currentStart = new Date(`${currentRecord.date}T${currentRecord.startTime}`);
            const restDurationMinutes = Math.round((currentStart - prevEnd) / 60000);
            const restDurationHours = restDurationMinutes / 60;
            const isSplitRest = splitRestData[previousRecord.id] === true || previousRecord.isSplitRest;
            const prevWorkDurationHours = previousRecord.workMinutes / 60;

            if (restDurationHours >= 45) {
                restAnalysis = { text: `${i18n.tachoWeeklyRest} (${formatDuration(restDurationMinutes)})`, colorClass: 'bg-green-700 text-white' };
                reducedDailyRestCounter = 0;
            } else if (restDurationHours >= 24) {
                restAnalysis = { text: `${i18n.tachoReducedWeeklyRest} (${formatDuration(restDurationMinutes)})`, colorClass: 'bg-green-700 text-white' };
                reducedDailyRestCounter = 0;
            } else if (isSplitRest) {
                restAnalysis = { text: `${i18n.tachoSplitRest} (${formatDuration(restDurationMinutes)})`, colorClass: 'bg-green-200 text-green-800' };
            } else if (restDurationHours >= 11 && prevWorkDurationHours <= 13) {
                restAnalysis = { text: `${i18n.tachoRegularDailyRest} (${formatDuration(restDurationMinutes)})`, colorClass: 'bg-green-500 text-white' };
                reducedDailyRestCounter = 0;
            } else if (restDurationHours >= 9) {
                reducedDailyRestCounter++;
                const isForcedReduced = prevWorkDurationHours > 13;
                const reason = isForcedReduced ? ` ${i18n.tachoReason13h}` : '';
                let colorClass, countText;
                switch (reducedDailyRestCounter) {
                    case 1: colorClass = 'bg-yellow-200 text-yellow-800'; countText = '1.'; break;
                    case 2: colorClass = 'bg-yellow-400 text-black'; countText = '2.'; break;
                    case 3: colorClass = 'bg-orange-400 text-black'; countText = '3.'; break;
                    default: colorClass = 'bg-red-500 text-white'; countText = `${reducedDailyRestCounter}.`; break;
                }
                restAnalysis = { text: `${countText} ${i18n.tachoReducedDailyRest}${reason} (${formatDuration(restDurationMinutes)})`, colorClass: colorClass };
            } else {
                 restAnalysis = { text: `${i18n.tachoIrregularRest} (${formatDuration(restDurationMinutes)})`, colorClass: 'bg-red-500 text-white' };
            }
        } else {
            restAnalysis = { text: 'Első rögzített nap', colorClass: 'bg-gray-200 text-gray-800' };
            reducedDailyRestCounter = 0;
        }

        // 2. Vezetési idő elemzése (az ADOTT NAPI vezetés)
        const driveMinutes = currentRecord.driveMinutes || 0;
        const driveHours = driveMinutes / 60;
        let driveAnalysis;
        
        if (driveMinutes <= 0) {
            driveAnalysis = { text: i18n.tachoNoDriveTime, colorClass: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400' };
        } else if (driveHours > 10) {
            driveAnalysis = { text: `${i18n.tachoIrregularDrive} (${formatDuration(driveMinutes)})`, colorClass: 'bg-red-500 text-white' };
        } else if (driveHours > 9) {
            const weekId = getWeekIdentifier(new Date(currentRecord.date));
            extendedDrivingInWeekCounter[weekId] = (extendedDrivingInWeekCounter[weekId] || 0) + 1;
            const countInWeek = extendedDrivingInWeekCounter[weekId];
            const irregularText = countInWeek > 2 ? '(szabálytalan) ' : '';
            driveAnalysis = { text: `${countInWeek}. ${irregularText}${i18n.tachoIncreasedDrive} (${formatDuration(driveMinutes)})`, colorClass: countInWeek > 2 ? 'bg-red-500 text-white' : 'bg-blue-400 text-white' };
        } else {
            driveAnalysis = { text: `${i18n.tachoNormalDrive} (${formatDuration(driveMinutes)})`, colorClass: 'bg-gray-300 text-gray-800' };
        }

        analysisResults.push({ record: currentRecord, rest: restAnalysis, drive: driveAnalysis, isSplit: splitRestData[currentRecord.id] === true || currentRecord.isSplitRest });
    }

    container.innerHTML = analysisResults.reverse().map(res => {
        const d = new Date(res.record.date + 'T00:00:00');
        const dateString = d.toLocaleDateString(currentLang, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        const isSplitActiveClass = res.isSplit ? 'bg-green-200 dark:bg-green-800/50 font-semibold' : 'hover:bg-gray-200 dark:hover:bg-gray-700';
        const checkmark = res.isSplit ? '<span class="font-bold text-lg">✓</span>' : '';
        
        const borderColorClass = res.rest.colorClass.split(' ')[0].replace('bg-', 'border-');

        return `
        <div class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border-l-4 ${borderColorClass}">
            <div class="flex justify-between items-start mb-3">
                <p class="font-bold text-base text-gray-800 dark:text-gray-100">${dateString}</p>
                <label for="split-${res.record.id}" class="flex items-center gap-2 cursor-pointer p-2 rounded-lg transition-colors ${isSplitActiveClass}">
                   <input type="checkbox" id="split-${res.record.id}" onchange="handleTachographToggle(this, '${res.record.id}')" ${res.isSplit ? 'checked' : ''} class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
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


// Segédfüggvények az osztott pihenő adatok mentéséhez/betöltéséhez
function getSplitRestData() { return JSON.parse(localStorage.getItem('splitRestData') || '{}'); }
function saveSplitRestData(data) { localStorage.setItem('splitRestData', JSON.stringify(data)); }
