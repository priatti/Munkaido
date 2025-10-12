// =======================================================
// ===== TACHOGRÁF ELEMZŐ (FEATURE) ======================
// =======================================================

(function () {
  'use-strict';

  

  // A TE ADATAIDBÓL KÉSZÍTETT DEMÓ ADATSOR (megmarad a későbbi használathoz)
  const demoRecords = [
    {"compensationMinutes":0,"kmDriven":597,"workMinutes":685,"kmStart":595985,"nightWorkMinutes":175,"endLocation":"Braunau","isSplitRest":false,"kmEnd":596582,"date":"2025-09-01","endTime":"13:30","weeklyDriveEndStr":"07:49","compensationTime":"","crossings":[{"time":"06:00","to":"D","from":"A"},{"time":"13:15","to":"A","from":"D"}],"weeklyDriveStartStr":"00:00","startLocation":"Gratwein-Straßengel","startTime":"02:05","driveMinutes":469,"id":"1756726240113"},
    {"crossings":[{"to":"D","time":"08:15","from":"A"}],"startTime":"05:15","id":"1756828895235","kmStart":596582,"compensationMinutes":0,"kmEnd":597339,"driveMinutes":569,"endTime":"18:00","startLocation":"Braunau","weeklyDriveEndStr":"17:18","kmDriven":757,"weeklyDriveStartStr":"07:49","date":"2025-09-02","nightWorkMinutes":0,"isSplitRest":false,"workMinutes":765,"endLocation":"Lehrte"},
    {"compensationMinutes":0,"kmDriven":444,"workMinutes":865,"kmStart":597339,"nightWorkMinutes":17,"endLocation":"Stolpe","isSplitRest":true,"kmEnd":597783,"date":"2025-09-03","endTime":"20:17","weeklyDriveEndStr":"24:13","compensationTime":"","crossings":[],"weeklyDriveStartStr":"17:18","startLocation":"Lehrte","startTime":"05:52","driveMinutes":415,"id":"1756923629815"},
    {"crossings":[{"to":"A","time":"17:45","from":"D"}],"nightWorkMinutes":0,"id":"1757002767279","weeklyDriveEndStr":"34:05","endTime":"18:16","kmStart":597783,"weeklyDriveStartStr":"24:13","startTime":"06:00","workMinutes":736,"endLocation":"Haag am Hausruck","isSplitRest":false,"kmEnd":598591,"driveMinutes":592,"compensationTime":"","startLocation":"Stolpe","compensationMinutes":0,"kmDriven":808,"date":"2025-09-04"},
    {"startLocation":"Haag am Hausruck","nightWorkMinutes":99,"isSplitRest":false,"compensationMinutes":0,"endTime":"14:36","date":"2025-09-05","endLocation":"Gratwein-Straßengel","workMinutes":675,"driveMinutes":396,"weeklyDriveEndStr":"40:41","kmDriven":445,"startTime":"03:21","kmStart":598591,"weeklyDriveStartStr":"34:05","crossings":[],"compensationTime":"","kmEnd":599036,"id":"1757075836318"}
  ];

  function createUpgradeOverlay() {
    const i18n = translations[currentLang];
    return `
      <div class="p-4 bg-blue-50 dark:bg-blue-900/50 border-l-4 border-blue-500 rounded-lg text-center mb-4 shadow-lg">
        <h3 class="font-bold text-lg text-blue-800 dark:text-blue-200">🔒 ${i18n.vipFeatureTitle || 'Ez egy VIP funkció'}</h3>
        <p class="text-sm text-blue-700 dark:text-blue-300 mt-1 mb-3">${i18n.vipFeatureDesc ||
          'A demó adatokkal megtekintheted, hogyan működik. A saját adataiddal való elemzéshez válts VIP csomagra!'}</p>
        <button class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">${i18n.upgradeButton || 'Tovább a VIP csomaghoz'}</button>
      </div>
    `;
  }

function isReducedDailyRest(restHours, precedingRecord) {
      if (!precedingRecord) return false;
      const isSplit = precedingRecord.isSplitRest;
      if (isSplit) return false;
      const isDurationReduced = restHours >= 9 && restHours < 11;
      const isWorkdayForced = precedingRecord.workMinutes > 13 * 60;
      return isDurationReduced || isWorkdayForced;
  }

  function getTachographStatus(sourceRecords) {
      const src = sourceRecords || records;
const recordsSorted = [...src].sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));
      const now = new Date();
      
      const { start: weekStart } = getWeekRange(now);
      const weekStartStr = toISODate(weekStart);
      const recordsInWeek = src.filter(r => r.date >= weekStartStr);
      const extendedDrivesThisWeek = recordsInWeek.filter(r => r.driveMinutes > 540).length;
      const remainingDrives10h = Math.max(0, 2 - extendedDrivesThisWeek);

      let reducedRestsInCycle = 0;
      for (let i = recordsSorted.length - 1; i > 0; i--) {
          const previousRecord = recordsSorted[i - 1];
          const prevEnd = new Date(`${previousRecord.date}T${previousRecord.endTime}`);
          const currentStart = new Date(`${recordsSorted[i].date}T${recordsSorted[i].startTime}`);
          const restHours = (currentStart - prevEnd) / (1000 * 60 * 60);

          if (restHours >= 24) break;
          if (isReducedDailyRest(restHours, previousRecord)) {
              reducedRestsInCycle++;
          }
      }

      const pendingUsage = parseInt(localStorage.getItem('pendingReducedRestUsage') || '0', 10);
      let remainingRests9h = Math.max(0, 3 - reducedRestsInCycle - pendingUsage);

      const currentWeekDriveMinutes = recordsInWeek.reduce((sum, r) => sum + (r.driveMinutes || 0), 0);
      const { start: lastWeekStart, end: lastWeekEnd } = getWeekRange(now, -1);
      const lastWeekDriveMinutes = src.filter(r => r.date >= toISODate(lastWeekStart) && r.date <= toISODate(lastWeekEnd))
          .reduce((sum, r) => sum + (r.driveMinutes || 0), 0);
      const twoWeekDriveMinutes = currentWeekDriveMinutes + lastWeekDriveMinutes;

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
          lastWeeklyRestEnd = new Date(`${recordsSorted[0].date}T${recordsSorted[0].endTime}`);
      }
      
      let weeklyRestDeadline = null;
      if (lastWeeklyRestEnd) {
          weeklyRestDeadline = new Date(lastWeeklyRestEnd.getTime() + 6 * 24 * 60 * 60 * 1000);
      }

      return {
          remainingDrives10h,
          remainingRests9h: Math.max(0, remainingRests9h),
          currentWeekDriveMinutes,
          twoWeekDriveMinutes,
          weeklyRestDeadline
      };
  }

  function renderTachographStatusCard() {
      const i18n = translations[currentLang];
      const liveContainer = document.getElementById('live-allowance-display');
      const tachoContainer = document.getElementById('tacho-allowance-display');
      
      if (!liveContainer || !tachoContainer) {
          console.warn('Tachograph status containers not found');
          return;
      }

      
      // === MÓDOSÍTÁS ITT ===
      const hasAccess = (typeof window.hasFeatureAccess === 'function') ? window.hasFeatureAccess('advancedStats') : false;
      const recordsToUse = hasAccess ? records : demoRecords;
const status = getTachographStatus(recordsToUse);

      let driveIcons = Array.from({ length: 2 }, (_, i) => 
          (i < status.remainingDrives10h) ? createAvailableIcon(10) : createUsedIcon(10)
      ).join('');
      
      let restIcons = Array.from({ length: 3 }, (_, i) =>
          (i < status.remainingRests9h) ? createAvailableIcon(9) : createUsedIcon(9)
      ).join('');

      const percent56h = Math.min(100, (status.currentWeekDriveMinutes / (56 * 60)) * 100);
      const percent90h = Math.min(100, (status.twoWeekDriveMinutes / (90 * 60)) * 100);

      let deadlineHtml = `<p class="text-gray-500">${i18n.summaryNoData}</p>`;
      if (status.weeklyRestDeadline) {
          const now = new Date();
          const diffMinutes = (status.weeklyRestDeadline - now) / 60000;
          const absoluteDeadline = formatDateTime(status.weeklyRestDeadline);

          if (diffMinutes < 0) {
              deadlineHtml = `<p class="font-bold text-red-500">${i18n.tachoDeadlineExpired}</p><p class="text-xs text-gray-500">${absoluteDeadline}</p>`;
          } else {
              const days = Math.floor(diffMinutes / 1440);
              const hours = Math.floor((diffMinutes % 1440) / 60);
              const relativeTime = i18n.tachoRelativeTime.replace('{days}', days).replace('{hours}', hours);
              deadlineHtml = `<p class="font-bold text-lg">${absoluteDeadline}</p><p class="text-xs text-gray-500">${relativeTime}</p>`;
          }
      }

      const html = `
      ${!hasAccess ? createUpgradeOverlay() : ''}
      <div class="bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-lg p-3 space-y-3">
          <h3 class="font-semibold text-gray-800 dark:text-gray-100">🗓️ ${i18n.tachoWeeklyStatus}</h3>
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
                      <span class="font-medium">${i18n.tachoDriveThisWeek}</span>
                      <span>${formatDuration(status.currentWeekDriveMinutes)} / 56${i18n.tachoHourUnit}</span>
                  </div>
                  <div class="progress-bar"><div class="progress-bar-fill" style="width: ${percent56h}%;"></div></div>
              </div>
              <div>
                  <div class="flex justify-between mb-1">
                      <span class="font-medium">${i18n.tachoDriveTwoWeeks}</span>
                      <span>${formatDuration(status.twoWeekDriveMinutes)} / 90${i18n.tachoHourUnit}</span>
                  </div>
                  <div class="progress-bar"><div class="progress-bar-fill" style="width: ${percent90h}%;"></div></div>
              </div>
          </div>
          <div class="text-sm border-t dark:border-gray-700 pt-2 flex justify-between items-center">
              <span class="font-medium">${i18n.tachoNextWeeklyRestDue}</span>
              <div class="text-right">${deadlineHtml}</div>
          </div>
      </div>`;

      liveContainer.innerHTML = html;
      tachoContainer.innerHTML = html;
  }

  function createAvailableIcon(number) { return `<svg width="45" height="45" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" stroke-width="6" stroke="#16a34a" fill="#f0fdf4" /><text x="50" y="50" font-family="Arial" font-size="45" font-weight="bold" fill="#15803d" text-anchor="middle" dy=".3em">${number}</text></svg>`; }
  function createUsedIcon(number) { return `<svg width="45" height="45" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" stroke-width="6" stroke="#ef4444" fill="#fef2f2" /><text x="50" y="50" font-family="Arial" font-size="45" font-weight="bold" fill="#dc2626" text-anchor="middle" dy=".3em">${number}</text><line x1="20" y1="20" x2="80" y2="80" stroke="#b91c1c" stroke-width="8" stroke-linecap="round" /></svg>`; }

  function renderTachoHelperCards() {
    const container = document.getElementById('tacho-helper-display');
    if (!container) return;
    const i18n = translations[currentLang];
    const activeShift = JSON.parse(localStorage.getItem('activeShift') || 'null');
    
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

  async function handleTachographToggle(checkbox, recordId) {
    const recordIndex = records.findIndex(r => r.id === String(recordId));
    if (recordIndex === -1) {
        console.error('Record not found for split rest toggle:', recordId);
        return;
    }

    records[recordIndex].isSplitRest = checkbox.checked;

    try {
        await saveWorkRecord(records[recordIndex]);
        updateEnhancedToggleVisuals(checkbox);
        renderTachographAnalysis();
        renderTachographStatusCard();
    } catch (error) {
        console.error('Error saving split rest state:', error);
        checkbox.checked = !checkbox.checked;
        showCustomAlert('Hiba történt a mentés során.', 'info');
    }
  }

  function renderTachographAnalysis() {
      const i18n = translations[currentLang];
      const container = document.getElementById('tachograph-list');
      if (!container) return;
      const hasAccess = (typeof window.hasFeatureAccess === 'function') ? window.hasFeatureAccess('advancedStats') : false;
      const recordsToUse = hasAccess ? records : demoRecords;
      const sortedRecords = [...recordsToUse].sort((a, b) => new Date(`${a.date}T${a.startTime}`) - new Date(`${b.date}T${b.startTime}`));
      if (sortedRecords.length < 1) {
          container.innerHTML = `<p class="text-center text-gray-500 py-8">${i18n.noEntries}</p>`;
          return;
      }
      
      let analysisResults = [];
      let reducedDailyRestCounter = 0;
      let extendedDrivingInWeekCounter = {};

      for (let i = 0; i < sortedRecords.length; i++) {
          const currentRecord = sortedRecords[i];
          const previousRecord = i > 0 ? sortedRecords[i - 1] : null;
          let restAnalysis;
          if (previousRecord) {
              const prevEnd = new Date(`${previousRecord.date}T${previousRecord.endTime}`);
              const currentStart = new Date(`${currentRecord.date}T${currentRecord.startTime}`);
              const restDurationMinutes = Math.round((currentStart - prevEnd) / 60000);
              const restDurationHours = restDurationMinutes / 60;
              const isSplitRest = previousRecord.isSplitRest;
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
          analysisResults.push({ record: currentRecord, rest: restAnalysis, drive: driveAnalysis, isSplit: currentRecord.isSplitRest });
      }
      container.innerHTML = (!hasAccess ? createUpgradeOverlay() : '') + analysisResults.reverse().map(res => {
          const d = new Date(res.record.date + 'T00:00:00');
          const locale = currentLang === 'de' ? 'de-DE' : 'hu-HU';
          const dateString = d.toLocaleDateString(locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
          const borderColorClass = res.rest.colorClass.split(' ')[0].replace('bg-', 'border-');
          return `
          <div class="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border-l-4 ${borderColorClass}">
              <div class="flex justify-between items-start mb-3">
                  <p class="font-bold text-base text-gray-800 dark:text-gray-100">${dateString}</p>
                  <div class="enhanced-toggle-container ${res.isSplit ? 'active' : ''}" onclick="document.getElementById('split-${res.record.id}').click()">
                     <div class="enhanced-toggle-text">
                         <span class="text-sm">${i18n.tachoSplitRest}</span>
                         <span class="enhanced-toggle-checkmark ${res.isSplit ? '' : 'hidden'}">✓</span>
                     </div>
                     <input type="checkbox" id="split-${res.record.id}" onchange="handleTachographToggle(this, '${res.record.id}')" ${res.isSplit ? 'checked' : ''} class="sr-only">
                  </div>
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

  function debugTachoStatus() {
      const pending = localStorage.getItem('pendingReducedRestUsage') || '0';
      const status = getTachographStatus();
      console.log('=== TACHOGRÁF DEBUG ===');
      console.log('Pending reduced rest usage:', pending);
      console.log('Remaining 9h rests:', status.remainingRests9h);
      console.log('Remaining 10h drives:', status.remainingDrives10h);
      console.log('=======================');
  }

  function setPendingReducedRest(value) {
      localStorage.setItem('pendingReducedRestUsage', String(value));
      renderTachographStatusCard();
      console.log(`Pending reduced rest set to: ${value}`);
  }

  window.isReducedDailyRest = isReducedDailyRest;
  window.renderTachographStatusCard = renderTachographStatusCard;
  window.renderTachoHelperCards = renderTachoHelperCards;
  window.renderTachographAnalysis = renderTachographAnalysis;
  window.handleTachographToggle = handleTachographToggle;
  window.debugTachoStatus = debugTachoStatus;
  window.setPendingReducedRest = setPendingReducedRest;

})();