// =======================================================
// ===== FELHASZNÁLÓI FELÜLET (UI) KOMPONENSEK =========
// =======================================================

let alertCallback = null;
let promptCallback = null;

// JAVÍTÁS: Autocomplete eseménykezelők nyilvántartása
let activeAutocompletePairs = new Map();

function showCustomAlert(message, type, callback, options = {}) {
    const overlay = document.getElementById('custom-alert-overlay');
    const box = document.getElementById('custom-alert-box');
    const iconContainer = document.getElementById('custom-alert-icon');
    const messageEl = document.getElementById('custom-alert-message');
    const buttonsContainer = document.getElementById('custom-alert-buttons');
    if(!overlay || !box || !iconContainer || !messageEl || !buttonsContainer) return;

    // JAVÍTÁS: Biztonságos translations elérés
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {
        save: 'Mentés',
        cancel: 'Mégse',
        ok: 'OK'
    };
    
    const confirmText = options.confirmText || i18n.save;
    const confirmClass = options.confirmClass || 'bg-yellow-400 hover:bg-yellow-500';

    messageEl.textContent = message;
    alertCallback = callback || null;
    iconContainer.className = 'w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center';
    buttonsContainer.innerHTML = '';
    const warningIcon = `<svg class="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    
    if (type === 'warning') {
        iconContainer.classList.add('bg-yellow-100');
        iconContainer.innerHTML = warningIcon;
        buttonsContainer.innerHTML = `<button onclick="hideCustomAlert(false)" class="py-2 px-6 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">${i18n.cancel}</button><button onclick="hideCustomAlert(true)" class="py-2 px-6 text-white rounded-lg font-semibold ${confirmClass}">${confirmText}</button>`;
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
    if(!overlay || !box) return;

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

function showCustomPrompt(title, message, placeholder, iconHTML, callback) {
    const overlay = document.getElementById('custom-prompt-overlay');
    const box = document.getElementById('custom-prompt-box');
    const iconContainer = document.getElementById('custom-prompt-icon');
    const titleEl = document.getElementById('custom-prompt-title');
    const messageEl = document.getElementById('custom-prompt-message');
    const inputEl = document.getElementById('custom-prompt-input');
    const buttonsContainer = document.getElementById('custom-prompt-buttons');
    if(!overlay || !box || !iconContainer || !titleEl || !messageEl || !inputEl || !buttonsContainer) return;

    // JAVÍTÁS: Biztonságos translations elérés
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {
        save: 'Mentés',
        cancel: 'Mégse'
    };
    
    titleEl.textContent = title;
    messageEl.innerHTML = message;
    inputEl.placeholder = placeholder;
    inputEl.value = '';
    iconContainer.innerHTML = iconHTML;
    promptCallback = callback || null;

    buttonsContainer.innerHTML = `
        <button onclick="hideCustomPrompt(false)" class="py-2 px-6 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">${i18n.cancel}</button>
        <button onclick="hideCustomPrompt(true)" class="py-2 px-6 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">${i18n.save}</button>
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
        }
        promptCallback = null;
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
            itemEl.innerHTML = item.replace(new RegExp(val, 'gi'), '<strong>$&</strong>');
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

function showFinalizationModal() {
    // JAVÍTÁS: Biztonságos translations elérés
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {
        finalizeShiftTitle: 'Műszak befejezése',
        finalizeShiftDesc: 'Add meg a befejezési adatokat',
        finalizeEndTimeLabel: 'Befejezés ideje',
        finalizeEndLocationLabel: 'Befejezés helye',
        finalizeWeeklyDriveEndLabel: 'Heti vezetés vége',
        finalizeKmEndLabel: 'Záró km',
        cityPlaceholder: 'Város',
        cancel: 'Mégse',
        finalizeButton: 'Befejezés',
        compensationLabel: 'Kompenzáció / Szünet (levonódik)'
    };
    
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const existingModal = document.getElementById('finalize-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const showDriveTime = localStorage.getItem('toggleDriveTime') === 'true';
    const showKm = localStorage.getItem('toggleKm') === 'true';
    const showCompensation = localStorage.getItem('toggleCompensation') === 'true' && (typeof currentLang !== 'undefined' && currentLang !== 'de');
    
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
                        <div class="flex items-stretch min-w-0 gap-2">
                            <input type="text" id="finalizeEndLocation" class="flex-1 min-w-0 p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 overflow-hidden text-ellipsis" placeholder="${i18n.cityPlaceholder}">
                            <button type="button" class="shrink-0 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 text-base rounded-lg border border-blue-500 transition-colors duration-200" onclick="fetchLocation('finalizeEndLocation')" title="Helyszín lekérése GPS alapján">📍</button>
                        </div>
                    </div>
                    ${showDriveTime ? `
                    <div class="bg-indigo-50 dark:bg-indigo-900/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">🚗 ${i18n.finalizeWeeklyDriveEndLabel}</label>
                        <input type="text" id="finalizeWeeklyDriveEnd" class="w-full p-3 text-sm border border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-indigo-800/50 text-gray-900 dark:text-gray-100" placeholder="óó:pp" onblur="formatTimeInput(this, true)">
                    </div>
                    ` : ''}
                    ${showKm ? `
                    <div class="bg-orange-50 dark:bg-orange-900/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">📏 ${i18n.finalizeKmEndLabel}</label>
                        <input type="number" id="finalizeKmEnd" class="w-full p-3 text-sm border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-orange-800/50 text-gray-900 dark:text-gray-100" placeholder="0" min="0" step="1">
                    </div>
                    ` : ''}
                    ${showCompensation ? `
                    <div class="bg-yellow-50 dark:bg-yellow-900/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">⏱️ ${i18n.compensationLabel}</label>
                        <input type="text" id="finalizeCompensationTime" class="w-full p-3 text-sm border border-yellow-400 rounded-lg bg-white dark:bg-yellow-800/50 text-gray-900 dark:text-gray-100" placeholder="óó:pp" onblur="formatTimeInput(this, true)">
                    </div>
                    ` : ''}
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
    // JAVÍTÁS: Biztonságos ellenőrzések
    const activeShift = (typeof window !== 'undefined') ? window.activeShift : null;

    if (!activeShift) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Nincs aktív műszak a befejezéshez!', 'info');
        }
        return;
    }

    const endTimeEl = document.getElementById('finalizeEndTime');
    const endLocationEl = document.getElementById('finalizeEndLocation');
    const weeklyDriveEndEl = document.getElementById('finalizeWeeklyDriveEnd');
    const kmEndEl = document.getElementById('finalizeKmEnd');
    // <<< MÓDOSÍTÁS KEZDETE: Kompenzációs mező elérése >>>
    const compensationTimeEl = document.getElementById('finalizeCompensationTime');
    // <<< MÓDOSÍTÁS VÉGE >>>

    const endTime = endTimeEl ? endTimeEl.value : '';
    const endLocation = endLocationEl ? endLocationEl.value.trim() : '';
    const weeklyDriveEnd = weeklyDriveEndEl ? weeklyDriveEndEl.value || '' : '';
    const kmEnd = kmEndEl ? parseFloat(kmEndEl.value) || 0 : 0;
    // <<< MÓDOSÍTÁS KEZDETE: Kompenzációs idő kiolvasása >>>
    const compensationTime = compensationTimeEl ? compensationTimeEl.value || '' : '';
    // <<< MÓDOSÍTÁS VÉGE >>>

    if (!endTime) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Befejezés ideje kötelező!', 'info');
        }
        return;
    }
    
    closeFinalizeModal();

    // JAVÍTÁS: Biztonságos függvényhívások
    const workMinutes = (typeof calculateWorkMinutes === 'function') ? 
        calculateWorkMinutes(activeShift.startTime, endTime) : 0;
    const nightWorkMinutes = (typeof calculateNightWorkMinutes === 'function') ? 
        calculateNightWorkMinutes(activeShift.startTime, endTime) : 0;
    const driveMinutes = (typeof parseTimeToMinutes === 'function') ? 
        Math.max(0, parseTimeToMinutes(weeklyDriveEnd) - parseTimeToMinutes(activeShift.weeklyDriveStartStr || '0:0')) : 0;
    const kmDriven = Math.max(0, kmEnd - (activeShift.kmStart || 0));
    // <<< MÓDOSÍTÁS KEZDETE: Kompenzációs percek kiszámítása >>>
    const compensationMinutes = (typeof parseTimeToMinutes === 'function') ? 
        parseTimeToMinutes(compensationTime) : 0;
    // <<< MÓDOSÍTÁS VÉGE >>>

    const completedRecord = {
        ...activeShift,
        endTime, 
        endLocation, 
        workMinutes: workMinutes - compensationMinutes, // MÓDOSÍTVA: Itt vonjuk le
        nightWorkMinutes, 
        driveMinutes, 
        kmDriven,
        weeklyDriveEndStr: weeklyDriveEnd,
        kmEnd,
        compensationMinutes: compensationMinutes // ÚJ: Hozzáadjuk a mentéshez
    };
    
    if (typeof finalizeShift === 'function') {
        finalizeShift(completedRecord);
    } else {
        console.error('finalizeShift function not found!');
        if (typeof showCustomAlert === 'function') {
            showCustomAlert('Kritikus hiba: a mentési funkció nem érhető el.', 'info');
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
window.applyTheme = applyTheme;
window.setTheme = setTheme;
window.initTheme = initTheme;
window.showFinalizationModal = showFinalizationModal;
window.handleModalBackdropClick = handleModalBackdropClick;
window.closeFinalizeModal = closeFinalizeModal;
window.completeFinalizeShift = completeFinalizeShift;
window.cleanupAutocomplete = cleanupAutocomplete;