// =======================================================
// ===== FELHASZNÁLÓI FELÜLET (UI) KOMPONENSEK =========
// =======================================================

let alertCallback = null;
let promptCallback = null;

// Egyedi felugró ablak (alert) megjelenítése
function showCustomAlert(message, type, callback, options = {}) {
    const overlay = document.getElementById('custom-alert-overlay');
    const box = document.getElementById('custom-alert-box');
    const iconContainer = document.getElementById('custom-alert-icon');
    const messageEl = document.getElementById('custom-alert-message');
    const buttonsContainer = document.getElementById('custom-alert-buttons');
    const i18n = translations[currentLang];

    const confirmText = options.confirmText || i18n.save; // Ha nem adunk meg mást, a gomb "Mentés" lesz
    const confirmClass = options.confirmClass || 'bg-yellow-400 hover:bg-yellow-500'; // Alapértelmezett sárga gomb

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

// Felugró ablak elrejtése
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

// Egyedi beviteli ablak (prompt) megjelenítése
function showCustomPrompt(title, message, placeholder, iconHTML, callback) {
    const overlay = document.getElementById('custom-prompt-overlay');
    const box = document.getElementById('custom-prompt-box');
    const iconContainer = document.getElementById('custom-prompt-icon');
    const titleEl = document.getElementById('custom-prompt-title');
    const messageEl = document.getElementById('custom-prompt-message');
    const inputEl = document.getElementById('custom-prompt-input');
    const buttonsContainer = document.getElementById('custom-prompt-buttons');
    const i18n = translations[currentLang];

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

// Beviteli ablak elrejtése
function hideCustomPrompt(isConfirmed) {
    const overlay = document.getElementById('custom-prompt-overlay');
    const box = document.getElementById('custom-prompt-box');
    const inputEl = document.getElementById('custom-prompt-input');

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

// Automatikus kiegészítés inicializálása egy beviteli mezőhöz
function initAutocomplete(input, dataArray) {
    if (!input) return;
    input.addEventListener('input', function() {
        const val = this.value;
        hideAutocomplete();
        if (!val) return;

        const suggestions = document.createElement('div');
        suggestions.id = 'autocomplete-list';
        suggestions.className = 'autocomplete-list absolute z-20 w-full border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto bg-white';
        suggestions.style.top = (this.offsetHeight + 12) + 'px';

        const filteredData = dataArray.filter(item => item.toLowerCase().includes(val.toLowerCase()));
        filteredData.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.innerHTML = item.replace(new RegExp(val, 'gi'), '<strong>$&</strong>');
            itemEl.className = 'p-2 hover:bg-gray-100 cursor-pointer autocomplete-item';
            itemEl.addEventListener('click', () => {
                input.value = item;
                hideAutocomplete();
            });
            suggestions.appendChild(itemEl);
        });
        if (filteredData.length > 0) this.parentNode.appendChild(suggestions);
    });
}

// Az összes automatikus kiegészítéssel ellátott mező inicializálása
function initAllAutocomplete() {
    initAutocomplete(document.getElementById('liveStartLocation'), uniqueLocations);
    initAutocomplete(document.getElementById('startLocation'), uniqueLocations);
    initAutocomplete(document.getElementById('endLocation'), uniqueLocations);
    initAutocomplete(document.getElementById('palletLocation'), uniquePalletLocations);
}

// Automatikus kiegészítő lista elrejtése
function hideAutocomplete() {
    document.querySelectorAll('#autocomplete-list').forEach(list => list.remove());
}

// Téma (sötét/világos mód) kezelése
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
    uploadLocalSettings();
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

// ===== MŰSZAK BEFEJEZÉSE MODAL =====
function showFinalizationModal() {
    console.log('showFinalizationModal called');
    const i18n = translations[currentLang];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const existingModal = document.getElementById('finalize-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div id="finalize-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300" onclick="handleModalBackdropClick(event)">
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl w-11/12 max-w-md mx-auto transform transition-transform duration-300 scale-95">
                
                <div class="flex items-center gap-4 mb-6">
                    <div class="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                        <svg class="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6H8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"></path></svg>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100">Műszak befejezése</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Add meg a befejezési adatokat</p>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">⏰ Befejezés ideje</label>
                        <input type="time" id="finalizeEndTime" class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" value="${currentTime}">
                    </div>
                    <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">📍 Befejezés helye</label>
                        <div class="flex">
                            <input type="text" id="finalizeEndLocation" class="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="Város">
                            <button type="button" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-r-lg border border-blue-500" onclick="fetchLocation('finalizeEndLocation')">📍</button>
                        </div>
                    </div>
                    ${localStorage.getItem('toggleDriveTime') === 'true' ? `
                    <div class="bg-indigo-50 dark:bg-indigo-900/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-2">🚗 Heti vezetés vége</label>
                        <input type="text" id="finalizeWeeklyDriveEnd" class="w-full p-3 border border-indigo-300 dark:border-indigo-600 rounded-lg bg-white dark:bg-indigo-800/50 text-gray-900 dark:text-gray-100" placeholder="óó:pp" onblur="formatTimeInput(this, true)">
                    </div>
                    ` : ''}
                    ${localStorage.getItem('toggleKm') === 'true' ? `
                    <div class="bg-orange-50 dark:bg-orange-900/50 rounded-lg p-3">
                        <label class="block text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">📏 Záró km</label>
                        <input type="number" id="finalizeKmEnd" class="w-full p-3 border border-orange-300 dark:border-orange-600 rounded-lg bg-white dark:bg-orange-800/50 text-gray-900 dark:text-gray-100" placeholder="0">
                    </div>
                    ` : ''}
                </div>
                <div class="flex gap-3 mt-8">
                    <button type="button" onclick="closeFinalizeModal()" class="flex-1 py-3 px-4 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-500">Mégse</button>
                    <button type="button" onclick="completeFinalizeShift()" class="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-800">✅ Befejezés</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    setTimeout(() => {
        const modal = document.getElementById('finalize-modal');
        const box = modal.querySelector('div > div');
        if (modal && box) {
            modal.classList.remove('opacity-0');
            box.classList.remove('scale-95');
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
        modal.remove();
    }
}

async function completeFinalizeShift() {
    const i18n = translations[currentLang];
    const activeShift = window.activeShift;

    if (!activeShift) {
        showCustomAlert('Nincs aktív műszak a befejezéshez!', 'info');
        return;
    }

    const endTime = document.getElementById('finalizeEndTime').value;
    const endLocation = document.getElementById('finalizeEndLocation').value.trim();
    const weeklyDriveEnd = document.getElementById('finalizeWeeklyDriveEnd')?.value || '';
    const kmEnd = parseFloat(document.getElementById('finalizeKmEnd')?.value) || 0;

    if (!endTime) {
        showCustomAlert('Befejezés ideje kötelező!', 'info');
        return;
    }
    
    closeFinalizeModal();

    const workMinutes = calculateWorkMinutes(activeShift.startTime, endTime);
    const nightWorkMinutes = calculateNightWorkMinutes(activeShift.startTime, endTime);
    const driveMinutes = Math.max(0, parseTimeToMinutes(weeklyDriveEnd) - parseTimeToMinutes(activeShift.weeklyDriveStartStr || '0:0'));
    const kmDriven = Math.max(0, kmEnd - (activeShift.kmStart || 0));

    const completedRecord = {
        ...activeShift,
        endTime,
        endLocation,
        workMinutes,
        nightWorkMinutes,
        driveMinutes,
        kmDriven,
        weeklyDriveEndStr: weeklyDriveEnd,
        kmEnd
    };
    
    // A workday.js-ben lévő finalizeShift-et hívjuk meg a mentéshez
    if (typeof finalizeShift === 'function') {
        finalizeShift(completedRecord);
    } else {
        console.error('finalizeShift function not found!');
        showCustomAlert('Kritikus hiba: a mentési funkció nem érhető el.', 'info');
    }
}