// js/features/tachograph.js

import { translations, currentLang, records } from '../main.js';

//======================================================================
// ===== SEGÉDFÜGGVÉNYEK (csak ehhez a modulhoz) =======================
//======================================================================

function formatDuration(minutes) {
    const i18n = translations[currentLang];
    if (!i18n) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    const h_unit = currentLang === 'de' ? 'Std' : 'ó';
    const m_unit = currentLang === 'de' ? 'Min' : 'p';
    return `${h}${h_unit} ${m}${m_unit}`;
}

const toISODate = d => d.toISOString().split('T')[0];

function getWeekRange(date, offset = 0) {
    const d = new Date(date);
    d.setDate(d.getDate() + (offset * 7));
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
}

//======================================================================
// ===== FŐ TACHOGRÁF FUNKCIÓK =========================================
//======================================================================

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

export function renderWeeklyAllowance() {
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

export function handleTachographToggle(checkbox, recordId, type) {
    const data = type === 'split' ? getSplitRestData() : getWeeklyRestData();
    if (checkbox.checked) { data[recordId] = true; } else { delete data[recordId]; }
    if (type === 'split') saveSplitRestData(data); else saveWeeklyRestData(data);
    renderTachographAnalysis();
    renderWeeklyAllowance();
}

export function renderTachographAnalysis() {
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
                   <input type="checkbox" id="weekly-${res.record.id}" onchange="handleTachographToggle('${res.record.id}', 'weekly')" ${res.isWeekly ? 'checked' : ''} class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
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
                   <input type="checkbox" id="split-${res.record.id}" onchange="handleTachographToggle('${res.record.id}', 'split')" ${res.isSplit ? 'checked' : ''} class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
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