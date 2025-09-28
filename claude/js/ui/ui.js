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

    messageEl.textContent = message;
    alertCallback = callback || null;
    iconContainer.className = 'w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center';
    buttonsContainer.innerHTML = '';
    const warningIcon = `<svg class="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
    
    if (type === 'warning') {
        iconContainer.classList.add('bg-yellow-100');
        iconContainer.innerHTML = warningIcon;
        
        // Testreszabható gombok warning típushoz
        const confirmText = options.confirmText || i18n.ok;
        const confirmClass = options.confirmClass || 'bg-red-500 hover:bg-red-600';
        
        buttonsContainer.innerHTML = `<button onclick="hideCustomAlert(false)" class="py-2 px-6 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">${i18n.cancel}</button><button onclick="hideCustomAlert(true)" class="py-2 px-6 ${confirmClass} text-white rounded-lg font-semibold">${confirmText}</button>`;
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