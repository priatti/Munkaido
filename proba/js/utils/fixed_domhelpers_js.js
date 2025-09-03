import { state } from '../state.js';

let alertCallback = null;

/**
 * Megjelenít egy egyedi tervezésű felugró ablakot.
 * @param {string} message - A megjelenítendő üzenet.
 * @param {string} type - A felugró ablak típusa ('success', 'warning', 'info').
 * @param {Function} callback - A függvény, ami lefut a "Megerősítés" gombra kattintás után.
 */
export function showAlert(message, type, callback) {
    const overlay = document.getElementById('custom-alert-overlay');
    const box = document.getElementById('custom-alert-box');
    const iconContainer = document.getElementById('custom-alert-icon');
    const messageEl = document.getElementById('custom-alert-message');
    const buttonsContainer = document.getElementById('custom-alert-buttons');
    const i18n = window.translations[state.currentLang] || window.translations['en'];

    messageEl.textContent = message;
    alertCallback = callback || null;
    iconContainer.className = 'w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center';
    buttonsContainer.innerHTML = '';

    const icons = {
        warning: `<svg class="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`,
        success: `<svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path class="checkmark-path" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`
    };

    if (type === 'warning') {
        iconContainer.classList.add('bg-yellow-100');
        iconContainer.innerHTML = icons.warning;
        buttonsContainer.innerHTML = `<button onclick="window.hideCustomAlert(false)" class="py-2 px-6 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">${i18n.cancel}</button><button onclick="window.hideCustomAlert(true)" class="py-2 px-6 bg-yellow-400 text-white rounded-lg font-semibold hover:bg-yellow-500">${i18n.ok}</button>`;
    } else if (type === 'info') {
        iconContainer.classList.add('bg-yellow-100');
        iconContainer.innerHTML = icons.warning;
        buttonsContainer.innerHTML = `<button onclick="window.hideCustomAlert(true)" class="py-2 w-2/3 bg-yellow-400 text-white rounded-lg font-semibold hover:bg-yellow-500">${i18n.ok}</button>`;
    } else if (type === 'success') {
        iconContainer.classList.add('bg-green-100', 'success-icon');
        iconContainer.innerHTML = icons.success;
        buttonsContainer.innerHTML = `<button onclick="window.hideCustomAlert(true)" class="py-2 w-2/3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600">${i18n.ok}</button>`;
    }

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    setTimeout(() => {
        overlay.classList.remove('opacity-0');
        box.classList.remove('scale-95');
    }, 10);
}

/**
 * Elrejti az egyedi felugró ablakot és lefuttatja a callback függvényt, ha van.
 * @param {boolean} isConfirmed - Igaz, ha a megerősítés gombra kattintottak.
 */
export function hideCustomAlert(isConfirmed) {
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

/**
 * Megjeleníti vagy elrejti a "Továbbiak" lenyíló menüt.
 */
export function toggleDropdown() {
    document.getElementById('dropdown-menu').classList.toggle('hidden');
}

/**
 * Bezárja a "Továbbiak" lenyíló menüt.
 */
export function closeDropdown() {
    document.getElementById('dropdown-menu').classList.add('hidden');
}

/**
 * Frissíti a beállításokban lévő kapcsolók (toggle) kinézetét.
 * @param {HTMLInputElement} checkbox - A kapcsoló checkbox eleme.
 */
export function updateToggleVisuals(checkbox) {
    const label = checkbox.closest('label');
    if (!label) return;
    const checkmark = label.querySelector('.toggle-checkmark');

    const onClasses = ['bg-green-100', 'dark:bg-green-800/50', 'font-semibold'];
    const offClasses = ['hover:bg-gray-200', 'dark:hover:bg-gray-700'];

    label.classList.remove(...onClasses, ...offClasses);

    if (checkbox.checked) {
        label.classList.add(...onClasses);
        if (checkmark) checkmark.classList.remove('hidden');
    } else {
        label.classList.add(...offClasses);
        if (checkmark) checkmark.classList.add('hidden');
    }
}

// JAVÍTVA: Globális függvény exportálása a window objektumra
window.hideCustomAlert = hideCustomAlert;