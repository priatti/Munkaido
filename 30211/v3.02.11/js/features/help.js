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
            const v = (window.appInfo && appInfo.version) ? appInfo.version : '3.02.11b';
            legal.innerHTML = `© 2025 Princz Attila | GuriGO — <a href="mailto:info@gurigo.eu" class="underline">info@gurigo.eu</a> | v${v}`;
            cont.appendChild(legal);
        }
    }, 0);

    const container = document.getElementById('content-help');
    if (!container) return;
    const i18n = translations[currentLang];

    const createSection = (titleKey, content) => `
        <div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">${i18n[titleKey]}</h3>
            <div class="space-y-3 text-sm text-gray-600 dark:text-gray-300">${content}</div>
        </div>
    `;

    container.innerHTML = `
        <h2 class="text-xl font-bold mb-4 text-center">${i18n.helpTitle}</h2>
        ${createSection('helpSectionRecording', `
            <p>${i18n.helpRecordingIntro}</p>
            <ul class="list-disc pl-5 space-y-2 mt-2">
                <li><strong>${i18n.helpRecordingLiveTitle}:</strong> ${i18n.helpRecordingLiveDesc}</li>
                <li><strong>${i18n.helpRecordingFullTitle}:</strong> ${i18n.helpRecordingFullDesc}</li>
            </ul>
        `)}
        ${createSection('helpSectionUsingApp', `
            <p><strong>${i18n.helpListTitle}:</strong> ${i18n.helpListDesc}</p>
            <p class="mt-2"><strong>${i18n.helpReportTitle}:</strong> ${i18n.helpReportDesc}</p>
        `)}
        ${createSection('helpSectionPWA', `
            <p><strong>${i18n.helpPwaBenefitsTitle}</strong></p>
            <ul class="list-disc pl-5 space-y-1">${i18n.helpPwaBenefitsDesc}</ul>
            <p class="mt-2"><strong>${i18n.helpPwaInstallTitle}</strong></p>
            <ul class="list-disc pl-5 space-y-1">${i18n.helpPwaInstallDesc}</ul>
        `)}
        ${createSection('helpSectionConcepts', `
            <p><strong>${i18n.helpConceptDriveTime}:</strong> ${i18n.helpConceptDriveTimeDesc}</p>
            <p><strong>${i18n.helpRolloverTitle}:</strong> ${i18n.helpRolloverDesc}</p>
        `)}
        ${createSection('helpSectionTips', `
            <p><strong>${i18n.helpTipTimeEntry}:</strong> ${i18n.helpTipTimeEntryDesc}</p>
            <div>
                <p><strong>${i18n.helpTipGps}:</strong> ${i18n.helpTipGpsDesc}</p>
                <ul class="list-disc pl-5 mt-1">
                    <li>${i18n.helpTipGpsLocation}</li>
                    <li>${i18n.helpTipGpsCrossing}</li>
                </ul>
            </div>
        `)}
        ${createSection('helpSectionSpecial', `
            <p><strong>${i18n.helpSpecialStartCalc}:</strong> ${i18n.helpSpecialStartCalcDesc}</p>
            <p class="text-xs text-yellow-700 dark:text-yellow-400 p-2 bg-yellow-50 dark:bg-yellow-900/50 rounded mt-1 italic">${i18n.helpSpecialWarning}</p>
            <p class="mt-2"><strong>${i18n.helpSpecialLatestRest}:</strong> ${i18n.helpSpecialLatestRestDesc}</p>
        `)}
        ${createSection('helpSectionData', `
            <p><strong>${i18n.helpDataExport}:</strong> ${i18n.helpDataExportDesc}</p>
            <p><strong>${i18n.helpDataSync}:</strong> ${i18n.helpDataSyncDesc}</p>
        `)}
        <div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h3 class="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">${i18n.developerIntroTitle}</h3>
            <div class="space-y-3 text-sm text-gray-600 dark:text-gray-300">${i18n.developerIntroBody}</div>
        </div>
    `;
} 
