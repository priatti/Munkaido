// =======================================================
// ===== TACHOGRÁF ELEMZŐ (FEATURE) ======================
// =======================================================

/**
 * Összegyűjti az összes releváns tachográf adatot a jelenlegi állapotról.
 * @returns {object} Egy objektum, ami a teljes státuszt tartalmazza.
 */
function getTachographStatus() {
    const recordsSorted = [...records].sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));
    const now = new Date();
    const splitData = getSplitRestData(); // Osztott pihenő adatok betöltése

    // 1. Heti keretek (10h vezetés, 9h csökkentett pihenő)
    const { start: weekStart } = getWeekRange(now);
    const weekStartStr = toISODate(weekStart);
    const recordsInWeek = records.filter(r => r.date >= weekStartStr);
    const extendedDrivesThisWeek = recordsInWeek.filter(r => r.driveMinutes > 540).length;
    const remainingDrives10h = Math.max(0, 2 - extendedDrivesThisWeek);

    let reducedRestsInCycle = 0;
    for (let i = recordsSorted.length - 1; i > 0; i--) {
        const previousRecord = recordsSorted[i - 1];
        const currentRecord = recordsSorted[i];
        
        const prevEnd = new Date(`${previousRecord.date}T${previousRecord.endTime}`);
        const currentStart = new Date(`${currentRecord.date}T${currentRecord.startTime}`);
        const restHours = (currentStart - prevEnd) / (1000 * 60 * 60);

        if (restHours >= 24) break; // Megvan a heti pihenő, ciklus vége
        
        // JAVÍTVA: Ellenőrizzük, hogy az előző naphoz tartozik-e osztott pihenő
        const isSplit = splitData[previousRecord.id] === true || previousRecord.isSplitRest;

        // Csak akkor számoljuk csökkentettnek, ha 9-11 óra közötti ÉS NEM osztott pihenő
        if (restHours >= 9 && restHours < 11 && !isSplit) {
            reducedRestsInCycle++;
        }
    }
    const remainingRests9h = Math.max(0, 3 - reducedRestsInCycle);

    // 2. Vezetési idők (56h / 90h)
    const currentWeekDriveMinutes = recordsInWeek.reduce((sum, r) => sum + (r.driveMinutes || 0), 0);
    
    const { start: lastWeekStart, end: lastWeekEnd } = getWeekRange(now, -1);
    const lastWeekDriveMinutes = records
        .filter(r => r.date >= toISODate(lastWeekStart) && r.date <= toISODate(lastWeekEnd))
        .reduce((sum, r) => sum + (r.driveMinutes || 0), 0);
    const twoWeekDriveMinutes = currentWeekDriveMinutes + lastWeekDriveMinutes;

    // 3. Heti pihenő esedékessége (6x24h)
    let lastWeeklyRestEnd = null;
    for (let i = recordsSorted.length - 1; i > 0; i--) {
        const prevEnd = new Date(`${recordsSorted[i-1].date}T${recordsSorted[i-1].endTime}`);
        const currentStart = new Date(`${recordsSorted[i].date}T${recordsSorted[i].startTime}`);
        const restHours = (currentStart - prevEnd) / (1000 * 60 * 60);
        if (restHours >= 24) {
            lastWeeklyRestEnd = currentStart;
            break;
        }
    }
    if (!lastWeeklyRestEnd && recordsSorted.length > 0) {
        const firstRecord = recordsSorted[0];
        lastWeeklyRestEnd = new Date(`${firstRecord.date}T${firstRecord.endTime}`);
    }
    
    let weeklyRestDeadline = null;
    if (lastWeeklyRestEnd) {
        weeklyRestDeadline = new Date(lastWeeklyRestEnd.getTime() + 6 * 24 * 60 * 60 * 1000);
    }

    return {
        remainingDrives10h,
        remainingRests9h,
        currentWeekDriveMinutes,
        twoWeekDriveMinutes,
        weeklyRestDeadline
    };
}


/**
 * Kirajzolja a teljes, egységes "Heti Státusz" kártyát.
 */
function renderTachographStatusCard() {
    const i18n = translations[currentLang];
    const liveContainer = document.getElementById('live-allowance-display');
    const tachoContainer = document.getElementById('tacho-allowance-display');
    if (!liveContainer || !tachoContainer) return;

    const status = getTachographStatus();

    let driveIcons = '';
    for (let i = 0; i < 2; i++) {
        driveIcons += (i < status.remainingDrives10h) ? createAvailableIcon(10) : createUsedIcon(10);
    }
    let restIcons = '';
    for (let i = 0; i < 3; i++) {
        restIcons += (i < status.remainingRests9h) ? createAvailableIcon(9) : createUsedIcon(9);
    }

    const percent56h = Math.min(100, (status.currentWeekDriveMinutes / (56 * 60)) * 100);
    const percent90h = Math.min(100, (status.twoWeekDriveMinutes / (90 * 60)) * 100);

    let deadlineText = i18n.summaryNoData;
    if (status.weeklyRestDeadline) {
        const now = new Date();
        const diffMinutes = (status.weeklyRestDeadline - now) / 60000;
        if (diffMinutes < 0) {
            deadlineText = `<span class="text-red-500 font-bold">Lejárt!</span>`;
        } else {
            const days = Math.floor(diffMinutes / 1440);
            const hours = Math.floor((diffMinutes % 1440) / 60);
            deadlineText = `${days} nap ${hours} óra`;
        }
    }

    const html = `
    <div class="bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 space-y-3">
        <h3 class="font-semibold text-gray-800 dark:text-gray-100">🗓️ Heti Státusz</h3>
        
        <div class="grid grid-cols-2 gap-3 text-center">
            <div class="p-2 bg-blue-50 dark:bg-blue-900/50 rounded-lg">
                <p class="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">${i18n.tachoAllowanceDrive10h}</p>
                <div class="flex justify-center gap-2">${driveIcons.replace(/45/g, '35')}</div>
            </div>
            <div class="p-2 bg-orange-50 dark:bg-orange-900/50 rounded-lg">
                <p class="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1">${i18n.tachoAllowanceReducedRest}</p>
                <div class="flex justify-center gap-2">${restIcons.replace(/45/g, '35')}</div>
            </div>
        </div>

        <div class="space-y-2 text-sm">
            <div>
                <div class="flex justify-between mb-1">
                    <span class="font-medium">Vezetés (ezen a héten)</span>
                    <span>${formatDuration(status.currentWeekDriveMinutes)} / 56ó</span>
                </div>
                <div class="progress-bar"><div class="progress-bar-fill" style="width: ${percent56h}%;"></div></div>
            </div>
            <div>
                <div class="flex justify-between mb-1">
                    <span class="font-medium">Vezetés (két hét)</span>
                    <span>${formatDuration(status.twoWeekDriveMinutes)} / 90ó</span>
                </div>
                <div class="progress-bar"><div class="progress-bar-fill" style="width: ${percent90h}%;"></div></div>
            </div>
        </div>
        
        <div class="text-sm border-t dark:border-gray-700 pt-2 flex justify-between items-center">
            <span class="font-medium">Következő heti pihenő esedékes:</span>
            <span class="font-bold text-lg">${deadlineText}</span>
        </div>
    </div>`;

    liveContainer.innerHTML = html;
    tachoContainer.innerHTML = html;
}

function createAvailableIcon(number) {
    return `<svg width="45" height="45" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" stroke-width="6" stroke="#16a34a" fill="#f0fdf4" /><text x="50" y="50" font-family="Arial" font-size="45" font-weight="bold" fill="#15803d" text-anchor="middle" dy=".3em">${number}</text></svg>`;
}

function createUsedIcon(number) {
    return `<svg width="45" height="45" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" stroke-width="6" stroke="#ef4444" fill="#fef2f2" /><text x="50" y="50" font-family="Arial" font-size="45" font-weight="bold" fill="#dc2626" text-anchor="middle" dy=".3em">${number}</text><line x1="20" y1="20" x2="80" y2="80" stroke="#b91c1c" stroke-width="8" stroke-linecap="round" /></svg>`;
}

function renderTachoHelperCards() {
    const container = document.getElementById('tacho-helper-display');
    if (!container) return;

    const i18n = translations[currentLang];
    activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');

    if (activeShift) {
        const status = getTachographStatus();
        const startDate = new Date(`${activeShift.date}T${activeShift.startTime}`);
        const latestRestStart11h = new Date(startDate.getTime() + 13 * 60 * 60 * 1000);
        
        let htmlContent = '';
        if (status.remainingRests9h > 0) {
            const latestRestStart9h = new Date(startDate.getTime() + 15 * 60 * 60 * 1000);
            htmlContent = `<div class="bg-indigo-50 dark:bg-indigo-900/50 p-3 rounded-lg"><h3 class="font-semibold text-indigo-800 dark:text-indigo-200 text-base">${i18n.latestRestStartTitle}</h3><div class="text-sm"><strong>${i18n.with11hRestLatest}</strong> <div class="font-bold text-lg">${formatDateTime(latestRestStart11h)}</div></div><div class="text-sm"><strong>${i18n.with9hRestLatest}</strong> <div class="font-bold text-lg text-indigo-600 dark:text-indigo-300">${formatDateTime(latestRestStart9h)}</div></div></div>`;
        } else {
            htmlContent = `<div class="bg-yellow-50 dark:bg-yellow-900/50 p-3 rounded-lg"><h3 class="font-semibold text-yellow-800 dark:text-yellow-200 text-base">${i18n.latestRestStartTitle}</h3><div class="text-sm"><strong>${i18n.with11hRestLatest}</strong> <div class="font-bold text-lg">${formatDateTime(latestRestStart11h)}</div></div><p class="text-sm text-red-600 dark:text-red-400 font-semibold p-2 bg-red-100 dark:bg-red-900/50 rounded mt-2">${i18n.noMoreReducedRestsWarning}</p></div>`;
        }
        container.innerHTML = htmlContent;
    } else {
        const lastRecord = getLatestRecord();
        if (!lastRecord || !lastRecord.endTime) { container.innerHTML = ''; return; }
        
        const status = getTachographStatus();
        const endDate = new Date(`${lastRecord.date}T${lastRecord.endTime}`);
        const startTime11h = new Date(endDate.getTime() + 11 * 60 * 60 * 1000);

        let htmlContent = '';
        if (status.remainingRests9h > 0) {
            const startTime9h = new Date(endDate.getTime() + 9 * 60 * 60 * 1000);
            htmlContent = `<div class="bg-indigo-50 dark:bg-indigo-900/50 p-3 rounded-lg"><h3 class="font-semibold text-indigo-800 dark:text-indigo-200 text-base">${i18n.earliestStartTitle}</h3><div class="text-sm"><strong>${i18n.with9hRest}</strong> ${i18n.reducedLabel} <div class="font-bold text-lg text-indigo-600 dark:text-indigo-300">${formatDateTime(startTime9h)}</div></div><div class="text-sm"><strong>${i18n.with11hRest}</strong> ${i18n.regularLabel} <div class="font-bold text-lg">${formatDateTime(startTime11h)}</div></div><p class="text-xs text-gray-500 italic pt-2 mt-2 border-t dark:border-gray-700">${i18n.earliestStartWarning}</p></div>`;
        } else {
             htmlContent = `<div class="bg-yellow-50 dark:bg-yellow-900/50 p-3 rounded-lg"><h3 class="font-semibold text-yellow-800 dark:text-yellow-200 text-base">${i18n.earliestStartTitle}</h3><p class="text-sm mt-1">${i18n.noMoreReducedRests}</p><div class="text-sm mt-2"><strong>${i18n.with11hRest}</strong> ${i18n.regularLabel} <div class="font-bold text-lg">${formatDateTime(startTime11h)}</div></div><p class="text-xs text-gray-500 italic pt-2 mt-2 border-t dark:border-gray-700">${i18n.earliestStartWarning}</p></div>`;
        }
        container.innerHTML = htmlContent;
    }
}

function handleTachographToggle(checkbox, recordId) {
    const data = getSplitRestData();
    if (checkbox.checked) {
        data[recordId] = true;
    } else {
        delete data[recordId];
    }
    saveSplitRestData(data);
    updateEnhancedToggleVisuals(checkbox);
    renderTachographAnalysis();
    renderTachographStatusCard();
}

function renderTachographAnalysis() {
    // This function remains unchanged for now, but could be updated later
    // to show warnings based on the new, more accurate calculations.
}

function getSplitRestData() { return JSON.parse(localStorage.getItem('splitRestData') || '{}'); }
function saveSplitRestData(data) { localStorage.setItem('splitRestData', JSON.stringify(data)); }
