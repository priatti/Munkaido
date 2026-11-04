// =======================================================
// ===== FELHASZNÁLÓI FELÜLET (UI) KOMPONENSEK =========
// =======================================================
console.log('[ui.js] loaded build production-offline-shift1');

let alertCallback = null;
let alertCancelCallback = null;
let promptCallback = null;
let promptCancelCallback = null;

// JAVÍTVA: Autocomplete eseménykezelők nyilvántartása (jelenleg nem használt, de fenntartva jövőbeli használatra)
// Ha nem lesz használva, később törölhető
let activeAutocompletePairs = new Map();

function resolveAlertConfirmVariant(options) {
    if (options && options.confirmVariant) return options.confirmVariant;
    const cc = String((options && options.confirmClass) || '');
    if (/red/i.test(cc)) return 'danger';
    if (/indigo|blue/i.test(cc)) return 'neutral';
    if (/green/i.test(cc)) return 'primary';
    return 'primary';
}

function buildGurigoAlertButton(label, confirmed, variant) {
    const onclick = confirmed ? 'hideCustomAlert(true)' : 'hideCustomAlert(false)';
    let style = 'background-color:#facc15;color:#1f2937;';
    if (variant === 'primary' || variant === 'success') {
        style = 'background-color:#22c55e;color:#ffffff;';
    } else if (variant === 'danger') {
        style = 'background-color:#ef4444;color:#ffffff;';
    } else if (variant === 'neutral') {
        style = 'background-color:#4f46e5;color:#ffffff;';
    } else if (variant === 'cancel') {
        const dark = document.documentElement && document.documentElement.classList.contains('dark');
        style = dark
            ? 'background-color:#4b5563;color:#f9fafb;'
            : 'background-color:#e5e7eb;color:#374151;';
    }
    return '<button type="button" onclick="' + onclick + '" class="gurigo-alert-btn" style="' + style + '">' + label + '</button>';
}

function showCustomAlert(message, type, callback, options = {}) {
    const overlay = document.getElementById('custom-alert-overlay');
    const box = document.getElementById('custom-alert-box');
    const iconContainer = document.getElementById('custom-alert-icon');
    const titleEl = document.getElementById('custom-alert-title');
    const messageEl = document.getElementById('custom-alert-message');
    const buttonsContainer = document.getElementById('custom-alert-buttons');
    if(!overlay || !box || !iconContainer || !messageEl || !buttonsContainer) return;

    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {
        save: 'Mentés',
        cancel: 'Mégse',
        ok: 'OK'
    };

    const confirmText = options.confirmText || options.okText || i18n.save;
    const okText = options.okText || i18n.ok;

    if (titleEl) {
        if (options.title) {
            titleEl.textContent = options.title;
            titleEl.classList.remove('hidden');
        } else {
            titleEl.textContent = '';
            titleEl.classList.add('hidden');
        }
    }

    if (options && options.allowHTML) {
        messageEl.innerHTML = message;
    } else {
        messageEl.textContent = message;
    }
    alertCallback = callback || null;
    alertCancelCallback = (options && typeof options.cancelCallback === 'function') ? options.cancelCallback : null;
    iconContainer.className = 'w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center shrink-0';
    buttonsContainer.innerHTML = '';
    const warningIcon = '<svg class="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    const infoIcon = '<svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    const successIcon = '<svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';

    if (type === 'warning') {
        iconContainer.classList.add('bg-yellow-100');
        iconContainer.innerHTML = warningIcon;
        const cancelText = options.cancelText || i18n.cancel;
        const confirmVariant = resolveAlertConfirmVariant(options);
        buttonsContainer.innerHTML =
            buildGurigoAlertButton(cancelText, false, 'cancel') +
            buildGurigoAlertButton(confirmText, true, confirmVariant);
    } else if (type === 'info' || type === 'error') {
        iconContainer.classList.add('bg-blue-50');
        iconContainer.innerHTML = infoIcon;
        buttonsContainer.innerHTML = buildGurigoAlertButton(okText, true, 'ok');
    } else if (type === 'success') {
        iconContainer.classList.add('bg-green-100', 'success-icon');
        iconContainer.innerHTML = successIcon;
        buttonsContainer.innerHTML = buildGurigoAlertButton(okText, true, 'success');
    } else {
        iconContainer.classList.add('bg-yellow-100');
        iconContainer.innerHTML = warningIcon;
        buttonsContainer.innerHTML = buildGurigoAlertButton(okText, true, 'ok');
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
    if(!overlay || !box) return;

    overlay.classList.add('opacity-0');
    box.classList.add('scale-95');
    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        if (isConfirmed === true && alertCallback) {
            alertCallback();
        }
        if (isConfirmed === false && alertCancelCallback) {
            alertCancelCallback();
        }
        alertCallback = null;
        alertCancelCallback = null;
    }, 300);
}

// Alias for backwards compatibility
window.closeCustomAlert = hideCustomAlert;

function showCustomPrompt(title, message, placeholder, iconHTML, callback, cancelCallback, options) {
    const overlay = document.getElementById('custom-prompt-overlay');
    const box = document.getElementById('custom-prompt-box');
    const iconContainer = document.getElementById('custom-prompt-icon');
    const titleEl = document.getElementById('custom-prompt-title');
    const messageEl = document.getElementById('custom-prompt-message');
    const inputEl = document.getElementById('custom-prompt-input');
    const buttonsContainer = document.getElementById('custom-prompt-buttons');
    if(!overlay || !box || !iconContainer || !titleEl || !messageEl || !inputEl || !buttonsContainer) return;

    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {
        save: 'Mentés',
        cancel: 'Mégse'
    };
    const opts = options || {};
    const allowHTML = opts.allowHTML !== false;
    const inputType = opts.inputType || 'text';
    const defaultValue = (typeof opts.defaultValue === 'string') ? opts.defaultValue : '';
    const confirmText = opts.confirmText || i18n.save;
    const cancelText = opts.cancelText || i18n.cancel;
    
    titleEl.textContent = title;
    if (allowHTML) {
        messageEl.innerHTML = message;
    } else {
        messageEl.textContent = message;
    }
    inputEl.placeholder = placeholder || '';
    inputEl.value = defaultValue;
    inputEl.type = inputType;
    iconContainer.innerHTML = iconHTML;
    promptCallback = callback || null;
    promptCancelCallback = (typeof cancelCallback === 'function') ? cancelCallback : null;

    buttonsContainer.innerHTML = `
        <button onclick="hideCustomPrompt(false)" class="py-2.5 px-6 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm">${cancelText}</button>
        <button onclick="hideCustomPrompt(true)" class="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md">${confirmText}</button>
    `;

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        box.classList.remove('scale-95');
        inputEl.focus();
    }, 10);
}

function hideCustomPrompt(isConfirmed) {
    const overlay = document.getElementById('custom-prompt-overlay');
    const box = document.getElementById('custom-prompt-box');
    const inputEl = document.getElementById('custom-prompt-input');
    if(!overlay || !box || !inputEl) return;

    overlay.classList.add('opacity-0');
    box.classList.add('scale-95');

    setTimeout(() => {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        
        if (isConfirmed && promptCallback) {
            promptCallback(inputEl.value);
        } else if (!isConfirmed && promptCancelCallback) {
            promptCancelCallback();
        }
        promptCallback = null;
        promptCancelCallback = null;
        inputEl.type = 'text';
    }, 300);
}

// JAVÍTÁS: Autocomplete eseménykezelők proper cleanup-pal
function initAutocomplete(input, dataArray) {
    if (!input) {
        console.warn('Autocomplete input element not found');
        return;
    }
    
    if (!Array.isArray(dataArray)) {
        console.warn('Autocomplete data is not an array');
        return;
    }

    // Meglévő eseménykezelő eltávolítása
    if (activeAutocompletePairs.has(input)) {
        const oldHandler = activeAutocompletePairs.get(input);
        input.removeEventListener('input', oldHandler);
    }

    const inputHandler = function() {
        const val = this.value;
        hideAutocomplete();
        if (!val) return;

        const suggestions = document.createElement('div');
        suggestions.id = 'autocomplete-list';
        suggestions.className = 'autocomplete-list absolute z-20 w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto bg-white dark:bg-gray-800';
        suggestions.style.top = (this.offsetHeight + 2) + 'px';

        const filteredData = dataArray.filter(item => 
            item.toLowerCase().includes(val.toLowerCase())
        ).slice(0, 10); // Max 10 javaslat a teljesítmény miatt

        filteredData.forEach(item => {
            const itemEl = document.createElement('div');
            const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            try {
              itemEl.innerHTML = item.replace(new RegExp(escapeRegExp(val), 'gi'), '<strong>$&</strong>');
            } catch (_) {
              itemEl.textContent = item;
            }
            itemEl.className = 'p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer autocomplete-item text-gray-900 dark:text-gray-100';
            itemEl.addEventListener('click', () => {
                input.value = item;
                hideAutocomplete();
                // Trigger input event for other listeners
                input.dispatchEvent(new Event('input', { bubbles: true }));
            });
            suggestions.appendChild(itemEl);
        });
        
        if (filteredData.length > 0 && this.parentNode) {
            // Ellenőrizzük, hogy a parent pozicionálva van-e
            const parent = this.parentNode;
            const computedStyle = window.getComputedStyle(parent);
            if (computedStyle.position === 'static') {
                parent.style.position = 'relative';
            }
            parent.appendChild(suggestions);
        }
    };

    input.addEventListener('input', inputHandler);
    activeAutocompletePairs.set(input, inputHandler);

    // Blur eseményen is elrejtjük az autocomplete-et (kis késéssel)
    input.addEventListener('blur', () => {
        setTimeout(hideAutocomplete, 150);
    });
}

function initAllAutocomplete() {
    // JAVÍTÁS: Biztonságos ellenőrzés az egyedi helyszínek létezésére
    const uniqueLocationsArray = (typeof uniqueLocations !== 'undefined') ? uniqueLocations : [];
    const uniquePalletLocationsArray = (typeof uniquePalletLocations !== 'undefined') ? uniquePalletLocations : [];
    
    initAutocomplete(document.getElementById('liveStartLocation'), uniqueLocationsArray);
    initAutocomplete(document.getElementById('startLocation'), uniqueLocationsArray);
    initAutocomplete(document.getElementById('endLocation'), uniqueLocationsArray);
    initAutocomplete(document.getElementById('palletLocation'), uniquePalletLocationsArray);
}

function hideAutocomplete() {
    document.querySelectorAll('#autocomplete-list').forEach(list => {
        // JAVÍTÁS: Smooth eltűnési animáció
        list.style.opacity = '0';
        setTimeout(() => {
            if (list.parentNode) {
                list.parentNode.removeChild(list);
            }
        }, 150);
    });
}

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
}

function setTheme(theme) {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
    if(typeof uploadLocalSettings === 'function') uploadLocalSettings();
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'auto';
    applyTheme(savedTheme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (localStorage.getItem('theme') === 'auto') {
            applyTheme('auto');
        }
    });
} 

function clearFinalizeVehicleEndKmError() {
    const errEl = document.getElementById('finalizeVehicleEndKmError');
    const input = document.getElementById('finalizeVehicleEndKm');
    const wrap = document.getElementById('finalize-vehicle-end-km-wrap');
    if (errEl) {
        errEl.textContent = '';
        errEl.classList.add('hidden');
    }
    if (input) input.classList.remove('finalize-input-invalid');
    if (wrap) wrap.classList.remove('finalize-field-highlight');
}

function focusFinalizeVehicleEndKm(message) {
    const wrap = document.getElementById('finalize-vehicle-end-km-wrap');
    const input = document.getElementById('finalizeVehicleEndKm');
    const errEl = document.getElementById('finalizeVehicleEndKmError');
    if (errEl && message) {
        errEl.textContent = message;
        errEl.classList.remove('hidden');
    }
    if (wrap) {
        wrap.classList.add('finalize-field-highlight');
        try {
            wrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (_) {
            wrap.scrollIntoView();
        }
    }
    if (input) {
        input.classList.add('finalize-input-invalid');
        setTimeout(function () {
            try {
                input.focus();
                if (typeof input.select === 'function') input.select();
            } catch (_) {}
        }, 280);
    }
}

function showVehicleEndKmRequiredFeedback(i18n) {
    const msg = i18n.finalizeVehicleEndKmRequired || 'Add meg a jármű záró km óra állását.';
    focusFinalizeVehicleEndKm(msg);
    if (typeof showCustomAlert === 'function') {
        showCustomAlert(msg, 'info', function () {
            focusFinalizeVehicleEndKm(msg);
        });
    }
}

function showFinalizationModal() {
    // JAVÍTÁS: Biztonságos translations elérés; fallback EN ha nincs translations (mind az 5 nyelv konzisztens)
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
        ? (translations[currentLang] || translations['en'] || {})
        : (typeof translations !== 'undefined' && translations['en'] ? translations['en'] : {
            finalizeShiftTitle: 'Finish shift',
            finalizeShiftDesc: 'Enter the end details',
            finalizeEndTimeLabel: 'End time',
            finalizeEndLocationLabel: 'End location',
            finalizeWeeklyDriveEndLabel: 'Weekly driving end',
            finalizeKmEndLabel: 'Closing km',
            cityPlaceholder: 'City',
            cancel: 'Cancel',
            finalizeButton: 'Finish',
            compensationLabel: 'Compensation / Break (deducted)',
            splitRestQuestion: 'Did you take a continuous 3+ hour break? (Split)',
            finalizeDailyDriveLabel: '🚗 Daily driving time',
            finalizeDailyDriveHint: '💡 How much did you drive today?'
        });
    const splitRestQuestionText = i18n.splitRestQuestion || 'Did you take a continuous 3+ hour break? (Split)';
    const holidayLabelText = (i18n.fullDayIsHolidayLabel != null) ? String(i18n.fullDayIsHolidayLabel) : 'Public holiday / non-working day';
    const drivingModeTitleText = i18n.entryDrivingModeTitle || 'Vezetési mód';
    const drivingModeHelpText = i18n.entryDrivingModeHelp || '';
    const drivingModeSingleText = i18n.entryDrivingModeSingle || 'Egyedüli vezetés';
    const drivingModeTeamText = i18n.entryDrivingModeTeam || 'Négykezes vezetés';
    
    // === UX FIX: Mindig aktuális idő (modal open-kor) ===
    const currentTime = getNowLocalTimeInputValue();
    
    const existingModal = document.getElementById('finalize-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Alapértékek: drivetime, km → BE; compensation → KI
    const showDriveTime = localStorage.getItem('toggleDriveTime') !== 'false'; // Alapérték: BE
    const showKm = localStorage.getItem('toggleKm') !== 'false'; // Alapérték: BE
    const showCompensation = localStorage.getItem('toggleCompensation') === 'true' && (typeof currentLang !== 'undefined' && currentLang !== 'de');
    const activeShiftForModal = (typeof window !== 'undefined') ? window.activeShift : null;
    const finalizeDrivingMode = (typeof window.resolveDrivingMode === 'function' && activeShiftForModal)
      ? window.resolveDrivingMode(activeShiftForModal)
      : ((activeShiftForModal && activeShiftForModal.drivingMode === 'team') ? 'team' : (
          (typeof window.getDefaultDrivingModeFromSettings === 'function')
            ? window.getDefaultDrivingModeFromSettings()
            : 'single'
        ));
    const finalizeModeSingleChecked = finalizeDrivingMode === 'single' ? 'checked' : '';
    const finalizeModeTeamChecked = finalizeDrivingMode === 'team' ? 'checked' : '';
    const useVehicleSegmentsKm = !!(activeShiftForModal && typeof window.VehicleSegments !== 'undefined'
      && window.VehicleSegments.ensureSegmentsOnShift(activeShiftForModal).length);
    const needVehicleEndKm = useVehicleSegmentsKm && window.VehicleSegments.needsVehicleEndKmOnFinalize(activeShiftForModal);
    const showVehicleKmField = useVehicleSegmentsKm && (showKm || needVehicleEndKm);
    
    const timePlaceholder = i18n.timePlaceholder || (typeof getTimePlaceholderValue === 'function' ? getTimePlaceholderValue() : 'hh:mm');
    const timePlaceholderExample = i18n.timePlaceholderExample || (typeof getTimePlaceholderExampleValue === 'function' ? getTimePlaceholderExampleValue() : 'hh:mm (e.g. 02:30)');
    const compensationPlaceholder = i18n.compensationPlaceholder || timePlaceholder;

    let vehicleEndKmBlockHtml = '';
    if (showVehicleKmField) {
        let startKmNote = '';
        if (needVehicleEndKm && activeShiftForModal && typeof window.VehicleSegments !== 'undefined') {
            const openSegForHint = window.VehicleSegments.getOpenSegment(
                window.VehicleSegments.ensureSegmentsOnShift(activeShiftForModal)
            );
            if (openSegForHint && openSegForHint.startKm != null && Number(openSegForHint.startKm) > 0) {
                const plate = openSegForHint.vehiclePlateNumber
                    || (openSegForHint.vehicleSnapshot && openSegForHint.vehicleSnapshot.plateNumber)
                    || '';
                const startPrefix = i18n.finalizeVehicleEndKmStartPrefix || 'Induló km ezen a járműn:';
                startKmNote = plate
                    ? `${startPrefix} <strong>${openSegForHint.startKm}</strong> (${String(plate).replace(/</g, '&lt;')})`
                    : `${startPrefix} <strong>${openSegForHint.startKm}</strong>`;
            }
        }
        const vehicleLabel = needVehicleEndKm
            ? ((i18n.finalizeVehicleEndKmLabel || 'Aktuális jármű záró km óra állása') + ' *')
            : (i18n.finalizeVehicleEndKmLabel || 'Aktuális jármű záró km óra állása');
        vehicleEndKmBlockHtml = `
                    <div class="bg-orange-50 dark:bg-orange-900/50 rounded-lg p-3${needVehicleEndKm ? ' ring-2 ring-orange-400 dark:ring-orange-500' : ''}" id="finalize-vehicle-end-km-wrap">
                        <label class="block text-sm font-medium text-orange-700 dark:text-orange-300 mb-2" for="finalizeVehicleEndKm">📏 ${vehicleLabel}</label>
                        ${needVehicleEndKm ? `<p class="text-xs text-orange-800 dark:text-orange-200 mb-2 font-medium">${i18n.finalizeVehicleEndKmRequiredShort || 'A műszak lezárásához add meg a záró km óra állást.'}</p>` : ''}
                        ${startKmNote ? `<p class="text-xs text-orange-700 dark:text-orange-300 mb-2">${startKmNote}</p>` : ''}
                        <input type="number" id="finalizeVehicleEndKm" class="w-full p-3 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-orange-800/50 text-gray-900 dark:text-gray-100" placeholder="0" min="0" step="1" inputmode="numeric" ${needVehicleEndKm ? 'required aria-required="true"' : ''} oninput="clearFinalizeVehicleEndKmError()">
                        <p id="finalizeVehicleEndKmError" class="hidden text-xs text-red-600 dark:text-red-400 mt-2 font-medium" role="alert"></p>
                        <p class="text-xs text-orange-600 dark:text-orange-300 mt-2">${i18n.finalizeVehicleEndKmHint || 'A járműszakaszok km adatai alapján számoljuk az összesített távolságot.'}</p>
                    </div>`;
    }
    const vehicleKmAfterLocation = needVehicleEndKm ? vehicleEndKmBlockHtml : '';
    const vehicleKmAfterDriveTime = (showVehicleKmField && !needVehicleEndKm) ? vehicleEndKmBlockHtml : '';

    const modalHTML = `
        <div id="finalize-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300" onclick="handleModalBackdropClick(event)">
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto transform transition-transform duration-300 scale-95 modal-card">
                
                <div class="modal-header">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                            <svg class="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100">${i18n.finalizeShiftTitle}</h3>
                            <p class="text-sm text-gray-600 dark:text-gray-400">${i18n.finalizeShiftDesc}</p>
                        </div>
                    </div>
                </div>

                <div class="space-y-4 modal-body">
                    <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">⏰ ${i18n.finalizeEndTimeLabel}</label>
                        <input type="time" id="finalizeEndTime" class="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value="${currentTime}" required>
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">📍 ${i18n.finalizeEndLocationLabel}</label>
                        <div class="input-wrap">
                            <input type="text" id="finalizeEndLocation" class="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="${i18n.cityPlaceholder}">
                            <button type="button" class="gps-btn bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg" onclick="fetchLocation('finalizeEndLocation')" title="${i18n.getLocationGpsTitle || 'Get location via GPS'}">📍</button>
                        </div>
                    </div>
                    ${vehicleKmAfterLocation}
                    ${showDriveTime ? (function(){
                        const drivingTimeMode = localStorage.getItem('drivingTimeMode') || 'weekly';
                        if (drivingTimeMode === 'weekly' || drivingTimeMode === 'biweekly') {
                            return `<div class="bg-indigo-50 dark:bg-indigo-900/50 rounded-lg p-3">
                                <label class="block text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">🚗 ${i18n.finalizeWeeklyDriveEndLabel}</label>
                                <input type="text" id="finalizeWeeklyDriveEnd" class="w-full p-3 text-sm border border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-indigo-800/50 text-gray-900 dark:text-gray-100" placeholder="${timePlaceholder}" onblur="formatTimeInput(this, true)">
                            </div>`;
                        } else {
                            const dailyLabel = i18n.finalizeDailyDriveLabel || '🚗 Daily driving time';
                            const dailyHint = i18n.finalizeDailyDriveHint || '💡 How much did you drive today?';
                            return `<div class="bg-indigo-50 dark:bg-indigo-900/50 rounded-lg p-3">
                                <label class="block text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">${dailyLabel}</label>
                                <input type="text" id="finalizeDailyDriveTime" class="w-full p-3 text-sm border border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-indigo-800/50 text-gray-900 dark:text-gray-100" placeholder="${timePlaceholder}" onblur="formatTimeInput(this, true)">
                                <p class="text-xs text-indigo-600 dark:text-indigo-300 mt-2">${dailyHint}</p>
                            </div>`;
                        }
                    })() : ''}
                    ${showKm && !useVehicleSegmentsKm ? `
                    <div class="bg-orange-50 dark:bg-orange-900/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">📏 ${i18n.finalizeKmEndLabel}</label>
                        <input type="number" id="finalizeKmEnd" class="w-full p-3 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-orange-800/50 text-gray-900 dark:text-gray-100" placeholder="0" min="0" step="1">
                    </div>
                    ` : ''}
                    ${vehicleKmAfterDriveTime}
                    ${showDriveTime ? `
                    <div class="enhanced-toggle-container enhanced-toggle-primary mt-2" id="finalize-split-rest-container" onclick="document.getElementById('finalizeSplitRestToggle').click()">
                        <div class="enhanced-toggle-text">
                            <span>${splitRestQuestionText}</span>
                            <span class="enhanced-toggle-checkmark hidden">✓</span>
                        </div>
                        <input type="checkbox" id="finalizeSplitRestToggle" class="sr-only">
                    </div>
                    <div class="bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 mt-2 space-y-2" id="finalize-driving-mode-section">
                        <p class="text-sm font-semibold text-emerald-800 dark:text-emerald-200">${drivingModeTitleText.replace(/</g, '&lt;')}</p>
                        ${drivingModeHelpText ? `<p class="text-xs text-emerald-700 dark:text-emerald-300 mb-1">${String(drivingModeHelpText).replace(/</g, '&lt;')}</p>` : ''}
                        <div class="space-y-2" id="finalize-driving-mode-options">
                            <div class="enhanced-toggle-container enhanced-toggle-primary driving-mode-option ${finalizeDrivingMode === 'single' ? 'active' : ''}" data-driving-mode="single" role="button" tabindex="0" onclick="selectFinalizeDrivingMode('single')">
                                <div class="enhanced-toggle-text">
                                    <span>${drivingModeSingleText.replace(/</g, '&lt;')}</span>
                                    <span class="enhanced-toggle-checkmark ${finalizeDrivingMode === 'single' ? '' : 'hidden'}">✓</span>
                                </div>
                                <input type="radio" name="finalizeDrivingMode" id="finalizeDrivingModeSingle" value="single" class="sr-only" ${finalizeModeSingleChecked} onchange="syncFinalizeDrivingModeVisuals()">
                            </div>
                            <div class="enhanced-toggle-container enhanced-toggle-primary driving-mode-option ${finalizeDrivingMode === 'team' ? 'active' : ''}" data-driving-mode="team" role="button" tabindex="0" onclick="selectFinalizeDrivingMode('team')">
                                <div class="enhanced-toggle-text">
                                    <span>${drivingModeTeamText.replace(/</g, '&lt;')}</span>
                                    <span class="enhanced-toggle-checkmark ${finalizeDrivingMode === 'team' ? '' : 'hidden'}">✓</span>
                                </div>
                                <input type="radio" name="finalizeDrivingMode" id="finalizeDrivingModeTeam" value="team" class="sr-only" ${finalizeModeTeamChecked} onchange="syncFinalizeDrivingModeVisuals()">
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    ${showCompensation ? `
                    <div class="bg-yellow-50 dark:bg-yellow-900/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">⏱️ ${i18n.compensationLabel}</label>
                        <input type="text" id="finalizeCompensationTime" class="w-full p-3 text-sm border border-yellow-400 rounded-lg bg-white dark:bg-yellow-800/50 text-gray-900 dark:text-gray-100" placeholder="${compensationPlaceholder}" onblur="formatTimeInput(this, true)">
                    </div>
                    ` : ''}
                    <div class="enhanced-toggle-container enhanced-toggle-primary mt-2" id="finalize-holiday-container" onclick="document.getElementById('finalizeIsHoliday').click()">
                        <div class="enhanced-toggle-text">
                            <span>${holidayLabelText.replace(/</g, '&lt;')}</span>
                            <span class="enhanced-toggle-checkmark hidden">✓</span>
                        </div>
                        <input type="checkbox" id="finalizeIsHoliday" class="sr-only">
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">📝 ${i18n.finalizeNoteLabel || 'Note (optional)'}</label>
                        <textarea id="finalizeNote" class="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" rows="2" placeholder="${i18n.dayNotePlaceholder || ''}"></textarea>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <div class="flex gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button type="button" onclick="closeFinalizeModal()" class="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors duration-200">${i18n.cancel}</button>
                        <button type="button" onclick="completeFinalizeShift()" class="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-800 transition-all duration-200">✅ ${i18n.finalizeButton}</button>
                    </div>
                </div>

            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const splitRestToggle = document.getElementById('finalizeSplitRestToggle');
    if (splitRestToggle && typeof updateEnhancedToggleVisuals === 'function') {
        updateEnhancedToggleVisuals(splitRestToggle);
        splitRestToggle.addEventListener('change', (e) => {
            updateEnhancedToggleVisuals(e.target);
        });
    }

    const finalizeHol = document.getElementById('finalizeIsHoliday');
    const actForHol = (typeof window !== 'undefined') ? window.activeShift : null;
    if (finalizeHol && actForHol && actForHol.isHoliday === true) {
        finalizeHol.checked = true;
    }
    if (finalizeHol && typeof updateEnhancedToggleVisuals === 'function') {
        updateEnhancedToggleVisuals(finalizeHol);
        finalizeHol.addEventListener('change', (e) => {
            updateEnhancedToggleVisuals(e.target);
        });
    }

    // Modal animáció
    setTimeout(() => {
        const modal = document.getElementById('finalize-modal');
        if (modal) {
            const box = modal.querySelector('div > div');
            modal.classList.remove('opacity-0');
            if(box) box.classList.remove('scale-95');
        }
    }, 10);
}


function syncFinalizeDrivingModeVisuals() {
    const section = document.getElementById('finalize-driving-mode-options');
    if (!section) return;
    section.querySelectorAll('.driving-mode-option').forEach(function (row) {
        const input = row.querySelector('input[type="radio"]');
        const mark = row.querySelector('.enhanced-toggle-checkmark');
        if (input && input.checked) {
            row.classList.add('active');
            if (mark) mark.classList.remove('hidden');
        } else {
            row.classList.remove('active');
            if (mark) mark.classList.add('hidden');
        }
    });
}

function selectFinalizeDrivingMode(val) {
    const mode = (val === 'team') ? 'team' : 'single';
    const inp = document.querySelector('input[name="finalizeDrivingMode"][value="' + mode + '"]');
    if (inp) {
        inp.checked = true;
        syncFinalizeDrivingModeVisuals();
    }
}

window.syncFinalizeDrivingModeVisuals = syncFinalizeDrivingModeVisuals;
window.selectFinalizeDrivingMode = selectFinalizeDrivingMode;

function handleModalBackdropClick(event) {
    if (event.target.id === 'finalize-modal') {
        closeFinalizeModal();
    }
}

function closeFinalizeModal() {
    const modal = document.getElementById('finalize-modal');
    if (modal) {
        const box = modal.querySelector('div > div');
        modal.classList.add('opacity-0');
        if(box) box.classList.add('scale-95');
        
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

async function completeFinalizeShift() {
    console.log('[endShift] finish clicked');
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || translations['en'] || {}) : {};
    let activeShift = (typeof window !== 'undefined') ? window.activeShift : null;

    if (!activeShift && window.currentUser && typeof window.readActiveShiftLocalCacheQuick === 'function') {
        var cachedEntry = window.readActiveShiftLocalCacheQuick(window.currentUser.uid);
        if (cachedEntry && cachedEntry.data && cachedEntry.data.date) {
            activeShift = cachedEntry.data;
            window.activeShift = cachedEntry.data;
        }
    }
    if (!activeShift && typeof window.getActiveShiftFromStorage === 'function') {
        activeShift = window.getActiveShiftFromStorage();
        if (activeShift) window.activeShift = activeShift;
    }

    if (!activeShift) {
        console.warn('[endShift] validation failed: no active shift');
        if (typeof showCustomAlert === 'function') {
            const msg = i18n.alertNoActiveShiftFinalize || 'No active shift to finish!';
            showCustomAlert(msg, 'info');
        }
        return;
    }

    try {
        // Összes modal mező kiolvasása MIELŐTT a DOM-ból eltávolítjuk a finalize modalt
        const endTimeEl = document.getElementById('finalizeEndTime');
        const endLocationEl = document.getElementById('finalizeEndLocation');
        const kmEndEl = document.getElementById('finalizeKmEnd');
        const vehicleEndKmEl = document.getElementById('finalizeVehicleEndKm');
        const compensationTimeEl = document.getElementById('finalizeCompensationTime');
        const splitRestToggleEl = document.getElementById('finalizeSplitRestToggle');
        const weeklyDriveEndEl = document.getElementById('finalizeWeeklyDriveEnd');
        const dailyDriveTimeEl = document.getElementById('finalizeDailyDriveTime');
        const noteEl = document.getElementById('finalizeNote');
        const finalizeHolEl = document.getElementById('finalizeIsHoliday');

        const endTime = endTimeEl ? endTimeEl.value : '';
        const endLocation = endLocationEl ? endLocationEl.value.trim() : '';
        const kmEnd = kmEndEl ? parseFloat(kmEndEl.value) || 0 : 0;
        const vehicleEndKmRaw = vehicleEndKmEl ? vehicleEndKmEl.value : '';
        const vehicleEndKm = vehicleEndKmRaw !== '' ? parseFloat(vehicleEndKmRaw) : null;
        const compensationTime = compensationTimeEl ? compensationTimeEl.value || '' : '';
        const isSplitRest = splitRestToggleEl ? !!splitRestToggleEl.checked : false;
        const note = noteEl ? noteEl.value.trim() : '';
        const wantHolidayFinalize = !!(finalizeHolEl && finalizeHolEl.checked);
        const weeklyDriveEnd = weeklyDriveEndEl ? weeklyDriveEndEl.value || '' : '';
        const dailyDriveTime = dailyDriveTimeEl ? dailyDriveTimeEl.value || '' : '';
        const finalizeDrivingModeEl = document.querySelector('input[name="finalizeDrivingMode"]:checked');
        const finalizeDrivingModeValue = (finalizeDrivingModeEl && (finalizeDrivingModeEl.value === 'team' || finalizeDrivingModeEl.value === 'single'))
          ? finalizeDrivingModeEl.value
          : ((typeof window.resolveDrivingMode === 'function')
              ? window.resolveDrivingMode(activeShift)
              : (activeShift.drivingMode === 'team' ? 'team' : 'single'));

        const drivingTimeMode = localStorage.getItem('drivingTimeMode') || 'weekly';
        const useVehicleSegmentsKm = !!(activeShift && typeof window.VehicleSegments !== 'undefined'
          && window.VehicleSegments.ensureSegmentsOnShift(activeShift).length);
        const parseMins = (typeof parseTimeToMinutes === 'function') ? parseTimeToMinutes : function () { return 0; };

        let driveMinutes = 0;
        if (drivingTimeMode === 'weekly' || drivingTimeMode === 'biweekly') {
            driveMinutes = Math.max(0, parseMins(weeklyDriveEnd) - parseMins(activeShift.weeklyDriveStartStr || '0:0'));
        } else {
            driveMinutes = parseMins(dailyDriveTime);
        }

        // Befejezés dátumának meghatározása (preferált időzóna + éjfél átlépés)
        let endDateObj = (typeof createDateInPreferredTimezone === 'function')
            ? createDateInPreferredTimezone(activeShift.date, endTime)
            : new Date(`${activeShift.date}T${endTime}`);
        const startDateObj = (typeof createDateInPreferredTimezone === 'function')
            ? createDateInPreferredTimezone(activeShift.date, activeShift.startTime)
            : new Date(`${activeShift.date}T${activeShift.startTime}`);
        if (endDateObj <= startDateObj) {
            endDateObj = new Date(endDateObj);
            endDateObj.setDate(endDateObj.getDate() + 1);
        }
        const endDateISO = (typeof toISODate === 'function') ? toISODate(endDateObj) : endDateObj.toISOString().split('T')[0];

        console.log('[endShift] values read', { endTime, endDateISO, dailyDriveTime, weeklyDriveEnd });
        console.log('[endShift] drive minutes parsed', { drivingTimeMode, driveMinutes });

        if (!endTime) {
            console.warn('[endShift] validation failed: missing endTime');
            if (typeof showCustomAlert === 'function') {
                const msg = i18n.finalizeEndTimeRequired || 'End time is required!';
                showCustomAlert(msg, 'info');
            }
            return;
        }

        const openingKm = activeShift.kmStart || 0;
        const skipWarning = window._skipKmWarning || false;

        if (!useVehicleSegmentsKm && openingKm > 0 && kmEnd === 0 && !skipWarning) {
            console.warn('[endShift] validation failed: missing kmEnd with kmStart', { kmStart: openingKm });
            showKmWarningModal(kmEndEl);
            return;
        }

        if (useVehicleSegmentsKm && typeof window.VehicleSegments !== 'undefined'
            && window.VehicleSegments.needsVehicleEndKmOnFinalize(activeShift)) {
            var openSeg = window.VehicleSegments.getOpenSegment(window.VehicleSegments.ensureSegmentsOnShift(activeShift));
            if ((vehicleEndKm == null || !Number.isFinite(vehicleEndKm)) && !skipWarning) {
                console.warn('[endShift] validation failed: missing vehicleEndKm', {
                    segment: openSeg ? {
                        startKm: openSeg.startKm,
                        endKm: openSeg.endKm,
                        vehicleId: openSeg.vehicleId,
                        vehiclePlateNumber: openSeg.vehiclePlateNumber
                    } : null,
                    fieldInDom: !!vehicleEndKmEl
                });
                showVehicleEndKmRequiredFeedback(i18n);
                return;
            }
            if (vehicleEndKm != null && Number.isFinite(vehicleEndKm)) {
                if (openSeg && openSeg.startKm != null && vehicleEndKm < Number(openSeg.startKm)) {
                    const tooLowMsg = i18n.vehicleChangeEndKmTooLow || 'A záró km nem lehet kisebb az induló km-nél.';
                    console.warn('[endShift] validation failed: endKm lower than startKm', {
                        startKm: openSeg.startKm,
                        endKm: vehicleEndKm
                    });
                    focusFinalizeVehicleEndKm(tooLowMsg);
                    if (typeof showCustomAlert === 'function') {
                        showCustomAlert(tooLowMsg, 'warning', function () {
                            focusFinalizeVehicleEndKm(tooLowMsg);
                        });
                    }
                    return;
                }
            }
        }

        window._skipKmWarning = false;

        closeFinalizeModal();

        const workMinutes = (typeof calculateWorkMinutes === 'function')
            ? calculateWorkMinutes(activeShift.startTime, endTime, endDateISO) : 0;
        const nightWorkMinutes = (typeof calculateNightWorkMinutes === 'function')
            ? calculateNightWorkMinutes(activeShift.startTime, endTime, endDateISO) : 0;
        const endTimeIso = (typeof createDateInPreferredTimezone === 'function')
            ? createDateInPreferredTimezone(endDateISO, endTime).toISOString()
            : new Date(endDateISO + 'T' + endTime).toISOString();
        let kmDriven;
        if (useVehicleSegmentsKm && typeof window.VehicleSegments !== 'undefined') {
            const finalizedPreview = window.VehicleSegments.finalizeOnShiftClose(activeShift, vehicleEndKm, endTimeIso);
            kmDriven = finalizedPreview.totalDistanceKm != null ? finalizedPreview.totalDistanceKm : 0;
        } else {
            kmDriven = Math.max(0, kmEnd - (activeShift.kmStart || 0));
        }
        const compensationMinutes = parseMins(compensationTime);

        // ===== VASÁRNAP-HÉTFŐ ÁTNYÚLÓ MŰSZAK KEZELÉSE =====
        const isSundayMonday = (typeof isSundayMondayShift === 'function')
            ? isSundayMondayShift(activeShift.date, endDateISO)
            : false;

        console.log('[endShift] sunday-monday check', { isSundayMonday, drivingTimeMode, driveMinutes });

        let sundayDriveMinutes = 0;
        let mondayDriveMinutes = 0;
        let isSundayMondayManual = false;
        let sundayMondaySplitSource = '';

        if (isSundayMonday) {
            if (drivingTimeMode === 'weekly' || drivingTimeMode === 'biweekly') {
                const mondayMinsFromCounter = Math.max(0, parseMins(weeklyDriveEnd) - parseMins(activeShift.weeklyDriveStartStr || '0:0'));
                await new Promise((resolve) => {
                    if (typeof showSundayMondayCloseModalWeekly === 'function') {
                        showSundayMondayCloseModalWeekly(mondayMinsFromCounter, (result) => {
                            driveMinutes = Number(result && result.totalDriveMinutes) || 0;
                            if (!driveMinutes && result) {
                                driveMinutes = (Number(result.mondayDriveMinutes) || 0) + (Number(result.sundayDriveMinutes) || 0);
                            }
                            mondayDriveMinutes = Number(result && result.mondayDriveMinutes) || mondayMinsFromCounter;
                            sundayDriveMinutes = Number(result && result.sundayDriveMinutes) || 0;
                            isSundayMondayManual = (result && result.source === 'manual_monday_after_midnight');
                            sundayMondaySplitSource = (result && result.source) || 'vehicle_weekly_display';
                            console.log('[VH WEEKLY] total:', driveMinutes, 'V:', sundayDriveMinutes, 'H:', mondayDriveMinutes, 'forrás:', sundayMondaySplitSource);
                            resolve();
                        });
                    } else if (typeof showSundayMondayCloseTotalModal === 'function') {
                        showSundayMondayCloseTotalModal((totalMins) => {
                            driveMinutes = totalMins;
                            mondayDriveMinutes = mondayMinsFromCounter;
                            sundayDriveMinutes = Math.max(0, totalMins - mondayMinsFromCounter);
                            sundayMondaySplitSource = 'vehicle_weekly_display_fallback';
                            console.log('[VH WEEKLY] total modal fallback:', driveMinutes, 'V:', sundayDriveMinutes, 'H:', mondayDriveMinutes);
                            resolve();
                        });
                    } else {
                        mondayDriveMinutes = mondayMinsFromCounter;
                        sundayDriveMinutes = 0;
                        sundayMondaySplitSource = 'fallback';
                        resolve();
                    }
                });
            } else if (driveMinutes > 0) {
                console.log('[endShift] opening V-H close modal', { driveMinutes });
                await new Promise((resolve) => {
                    if (typeof showSundayMondayCloseModal === 'function') {
                        showSundayMondayCloseModal(driveMinutes, (result) => {
                            mondayDriveMinutes = result.mondayDriveMinutes || 0;
                            sundayDriveMinutes = result.sundayDriveMinutes || 0;
                            isSundayMondayManual = (result.source === 'manual_monday_after_midnight');
                            sundayMondaySplitSource = result.source || '';
                            console.log('[VH DAILY] Bontás:', sundayDriveMinutes, 'V /', mondayDriveMinutes, 'H, forrás:', sundayMondaySplitSource);
                            resolve();
                        });
                    } else {
                        mondayDriveMinutes = driveMinutes;
                        sundayDriveMinutes = 0;
                        sundayMondaySplitSource = 'fallback';
                        resolve();
                    }
                });
            } else {
                mondayDriveMinutes = 0;
                sundayDriveMinutes = 0;
                sundayMondaySplitSource = 'zero_drive';
            }
        }
        // ===== VASÁRNAP-HÉTFŐ KEZELÉS VÉGE =====

        if (isSundayMonday && driveMinutes > 0) {
            if (mondayDriveMinutes > driveMinutes) {
                const mondayTooHighMsg = i18n.vhMondayExceedsTotalDrive
                    || 'A hétfői vezetési idő nem lehet több, mint a teljes műszak vezetési ideje.';
                console.warn('[endShift][VH] validation failed: monday exceeds total', {
                    driveMinutes,
                    mondayDriveMinutes,
                    sundayDriveMinutes
                });
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert(mondayTooHighMsg, 'warning');
                }
                return;
            }
            const splitSum = (Number(sundayDriveMinutes) || 0) + (Number(mondayDriveMinutes) || 0);
            if (splitSum < driveMinutes) {
                const missing = driveMinutes - splitSum;
                sundayDriveMinutes = (Number(sundayDriveMinutes) || 0) + missing;
                console.warn('[endShift][VH] split repaired before save', {
                    driveMinutes,
                    sundayDriveMinutes,
                    mondayDriveMinutes,
                    missing
                });
            }
        }

        let completedRecord = {
            ...activeShift,
            endTime,
            endLocation,
            endDate: endDateISO,
            workMinutes: workMinutes - compensationMinutes,
            nightWorkMinutes,
            driveMinutes,
            kmDriven,
            weeklyDriveEndStr: weeklyDriveEnd,
            kmEnd,
            compensationMinutes: compensationMinutes,
            isSplitRest,
            drivingMode: finalizeDrivingModeValue,
            isSundayMondayShift: isSundayMonday,
            isSundayMondayManual: !!isSundayMondayManual,
            sundayDriveMinutes: sundayDriveMinutes || 0,
            mondayDriveMinutes: mondayDriveMinutes || 0,
            sundayMondaySplitSource: sundayMondaySplitSource || '',
            note
        };

        if (typeof resolveWorkdayHolidayFields === 'function') {
            completedRecord = await resolveWorkdayHolidayFields(completedRecord, wantHolidayFinalize);
        } else if (wantHolidayFinalize) {
            completedRecord.isHoliday = true;
            completedRecord.holidayDates = [activeShift.date];
        } else {
            delete completedRecord.isHoliday;
            delete completedRecord.holidayDates;
        }

        if (useVehicleSegmentsKm && typeof window.VehicleSegments !== 'undefined' && typeof window.VehicleSegments.enrichCompletedRecord === 'function') {
            completedRecord = window.VehicleSegments.enrichCompletedRecord(completedRecord, activeShift, vehicleEndKm, endTimeIso);
        }

        console.log('[endShift] before finalizeShift', {
            date: completedRecord.date,
            endDate: completedRecord.endDate,
            endTime: completedRecord.endTime,
            driveMinutes: completedRecord.driveMinutes,
            isSundayMondayShift: completedRecord.isSundayMondayShift,
            sundayDriveMinutes: completedRecord.sundayDriveMinutes,
            mondayDriveMinutes: completedRecord.mondayDriveMinutes
        });

        if (typeof window.finalizeShift === 'function') {
            await window.finalizeShift(completedRecord);
        } else {
            console.error('[endShift] finalizeShift function not found (window.finalizeShift missing)');
            if (typeof showCustomAlert === 'function') {
                const msg = i18n.finalizeCriticalError || 'Critical error: saving is unavailable.';
                showCustomAlert(msg, 'info');
            }
        }
    } catch (error) {
        console.error('[endShift] finalize failed', error);
        if (typeof showCustomAlert === 'function') {
            const prefix = i18n.alertSaveErrorPrefix || 'Hiba történt a mentés során:';
            showCustomAlert(prefix + ' ' + (error && error.message ? error.message : String(error)), 'info');
        }
    }
}

// JAVÍTÁS: Cleanup függvény az autocomplete eseménykezelőknek
function cleanupAutocomplete() {
    activeAutocompletePairs.forEach((handler, input) => {
        if (input && typeof input.removeEventListener === 'function') {
            input.removeEventListener('input', handler);
        }
    });
    activeAutocompletePairs.clear();
}

// Globális függvények exportálása
window.showCustomAlert = showCustomAlert;
window.hideCustomAlert = hideCustomAlert;
window.showCustomPrompt = showCustomPrompt;
window.hideCustomPrompt = hideCustomPrompt;
window.initAutocomplete = initAutocomplete;
window.initAllAutocomplete = initAllAutocomplete;
window.hideAutocomplete = hideAutocomplete;
// === ÁLTALÁNOS CUSTOM MODAL ===
/**
 * Általános custom modal megjelenítése
 * @param {string} content - HTML tartalom
 * @param {Array} buttons - Gombok tömbje: [{ text, className, onClick }]
 * @param {boolean} closeOnBackdrop - Bezárható-e háttérre kattintással
 */
function showCustomModal(content, buttons, closeOnBackdrop, options) {
  const opts = options || {};
  const allowBackdropClose = !!closeOnBackdrop || opts.forceCloseable === true;
  const allowEscClose = opts.allowEscClose !== false;
  const modalId = 'custom-modal-' + Date.now();
  const modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 transition-opacity duration-300 overflow-y-auto';
  modal.style.opacity = '0';

  const modalContent = document.createElement('div');
  modalContent.className = 'bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-95';
  
  // Header (ha van ikon vagy cím)
  if (opts.icon || opts.title) {
    const header = document.createElement('div');
    header.className = 'flex items-center gap-4 p-6 pb-4';
    
    if (opts.icon) {
      const iconContainer = document.createElement('div');
      iconContainer.className = 'w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ' + (opts.iconBg || 'bg-blue-100 dark:bg-blue-900/50');
      iconContainer.innerHTML = opts.icon;
      header.appendChild(iconContainer);
    }
    
    if (opts.title) {
      const titleContainer = document.createElement('div');
      titleContainer.className = 'flex-1';
      const title = document.createElement('h3');
      title.className = 'text-xl font-bold text-gray-900 dark:text-gray-100';
      title.textContent = opts.title;
      titleContainer.appendChild(title);
      if (opts.subtitle) {
        const subtitle = document.createElement('p');
        subtitle.className = 'text-sm text-gray-600 dark:text-gray-400 mt-1';
        subtitle.textContent = opts.subtitle;
        titleContainer.appendChild(subtitle);
      }
      header.appendChild(titleContainer);
    }
    
    modalContent.appendChild(header);
  }
  
  // Content
  const contentDiv = document.createElement('div');
  contentDiv.className = 'px-6 ' + (opts.icon || opts.title ? 'pb-4' : 'py-6');
  contentDiv.innerHTML = content;
  modalContent.appendChild(contentDiv);

  // Gombok
  if (buttons && buttons.length > 0) {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'flex gap-3 px-6 pb-6 pt-2 justify-end';
    
    buttons.forEach(function(btn) {
      const button = document.createElement('button');
      button.textContent = btn.text || 'OK';
      button.className = btn.className || 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md';
      button.onclick = function() {
        closeCustomModal(modalId);
        if (typeof btn.onClick === 'function') {
          btn.onClick();
        }
      };
      buttonContainer.appendChild(button);
    });
    
    modalContent.appendChild(buttonContainer);
  }

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  if (allowBackdropClose) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeCustomModal(modalId);
      }
    });
  }

  if (allowEscClose) {
    const escHandler = function(e) {
      if (e && e.key === 'Escape') closeCustomModal(modalId);
    };
    modal._escHandler = escHandler;
    document.addEventListener('keydown', escHandler);
  }

  setTimeout(function() {
    modal.style.opacity = '1';
    modalContent.classList.remove('scale-95');
    modalContent.classList.add('scale-100');
  }, 10);
}

function closeCustomModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    if (modal._escHandler) {
      document.removeEventListener('keydown', modal._escHandler);
      modal._escHandler = null;
    }
    modal.style.opacity = '0';
    const content = modal.querySelector('div > div');
    if (content) {
      content.classList.remove('scale-100');
      content.classList.add('scale-95');
    }
    setTimeout(function() {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    }, 300);
  }
}

// === KM WARNING MODAL ===
function showKmWarningModal(kmEndInputEl) {
  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
  
  const modal = document.createElement('div');
  modal.id = 'km-warning-modal';
  modal.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9997]';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md">
      <div class="flex items-start gap-4 mb-4">
        <div class="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/50 flex items-center justify-center flex-shrink-0">
          <span class="text-3xl">⚠️</span>
        </div>
        <div>
          <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            ${i18n.kmWarningTitle || 'Záró km hiányzik'}
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            ${i18n.kmWarningMessage || 'A nap indításakor megadtad a KEZDŐ km-t. A napi km számításhoz a nap végén a ZÁRÓ km óra állást is meg kell adnod.'}
          </p>
        </div>
      </div>
      
      <div class="space-y-3">
        <button onclick="focusKmEndInput()" style="background-color: #4f46e5; color: white;" class="w-full py-3 px-4 hover:bg-indigo-700 rounded-lg font-semibold transition-colors duration-200">
          📏 ${i18n.kmWarningFocusButton || 'Záró km megadása'}
        </button>
        
        <button onclick="openKmHelp()" style="background-color: #dbeafe; color: #1e40af;" class="w-full py-3 px-4 hover:bg-blue-200 dark:bg-blue-900/50 dark:hover:bg-blue-900 dark:text-blue-200 rounded-lg font-semibold transition-colors duration-200">
          ❓ ${i18n.kmWarningHelpButton || 'Help: odometer reading'}
        </button>
        
        <button onclick="saveWithoutClosingKm()" style="background-color: #e5e7eb; color: #374151;" class="w-full py-3 px-4 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200 rounded-lg font-semibold transition-colors duration-200">
          ${i18n.kmWarningSaveAnywayButton || 'Save without closing km'}
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Store kmEndInputEl for later use
  window._kmEndInputEl = kmEndInputEl;
}

function focusKmEndInput() {
  closeKmWarningModal();
  
  // Scroll to and focus the km input
  const kmEndInput = window._kmEndInputEl || document.getElementById('finalizeKmEnd');
  if (kmEndInput) {
    kmEndInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      kmEndInput.focus();
      kmEndInput.select();
    }, 300);
  }
}

function openKmHelp() {
  closeKmWarningModal();
  closeFinalizeModal();
  
  // Open help tab and scroll to km section
  if (typeof window.showTab === 'function') {
    window.showTab('help');
    setTimeout(() => {
      const kmSection = document.getElementById('km-oraallas');
      if (kmSection) {
        // Find the parent details element and open it
        const detailsElement = kmSection.closest('details');
        if (detailsElement) {
          detailsElement.open = true;
        }
        // Scroll to the section
        kmSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  }
}

function saveWithoutClosingKm() {
  closeKmWarningModal();
  
  // Set a flag to skip the warning on next attempt
  window._skipKmWarning = true;
  
  // Retry the finalize
  completeFinalizeShift();
}

function closeKmWarningModal() {
  const modal = document.getElementById('km-warning-modal');
  if (modal) {
    modal.remove();
  }
  window._kmEndInputEl = null;
}

window.applyTheme = applyTheme;
window.setTheme = setTheme;
window.initTheme = initTheme;
window.showKmWarningModal = showKmWarningModal;
window.focusKmEndInput = focusKmEndInput;
window.openKmHelp = openKmHelp;
window.saveWithoutClosingKm = saveWithoutClosingKm;
window.closeKmWarningModal = closeKmWarningModal;
window.showFinalizationModal = showFinalizationModal;
window.handleModalBackdropClick = handleModalBackdropClick;
window.closeFinalizeModal = closeFinalizeModal;
window.clearFinalizeVehicleEndKmError = clearFinalizeVehicleEndKmError;
window.focusFinalizeVehicleEndKm = focusFinalizeVehicleEndKm;
window.completeFinalizeShift = completeFinalizeShift;
window.cleanupAutocomplete = cleanupAutocomplete;
window.showCustomModal = showCustomModal;
window.closeCustomModal = closeCustomModal;
