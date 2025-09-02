import { state } from '../state.js';
import { showAlert } from './domHelpers.js';

const isoToVehicleCode = { 'at': 'A', 'de': 'D', 'hu': 'H', 'sk': 'SK', 'si': 'SLO', 'it': 'I', 'pl': 'PL', 'cz': 'CZ', 'ro': 'RO', 'ch': 'CH', 'fr': 'F', 'nl': 'NL', 'be': 'B', 'lu': 'L', 'es': 'E', 'gb': 'UK' };

/**
 * Formázza a perceket "Xó Yp" vagy "Xh Ym" formátumra az aktuális nyelvnek megfelelően.
 * @param {number} minutes - A percek száma.
 * @returns {string} A formázott időtartam.
 */
export function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    const h_unit = state.currentLang === 'de' ? 'Std' : 'ó';
    const m_unit = state.currentLang === 'de' ? 'Min' : 'p';
    return `${h}${h_unit} ${m}${m_unit}`;
}

/**
 * Megformáz egy input mezőt "óó:pp" formátumra a fókuszt elhagyva.
 * @param {HTMLInputElement} inputElement - Az input mező, amit formázni kell.
 * @param {boolean} allowHoursOver24 - Engedélyezi a 24 óránál nagyobb értéket (pl. heti vezetés).
 */
export function formatTimeInput(inputElement, allowHoursOver24 = false) {
    let value = inputElement.value.replace(/[^0-9]/g, '');
    if (value.length < 3) return;
    if (value.length === 3 && !allowHoursOver24) value = '0' + value;

    const hours = parseInt(value.substring(0, value.length - 2), 10);
    const minutes = parseInt(value.substring(value.length - 2), 10);

    if (minutes >= 0 && minutes <= 59 && hours >= 0 && (allowHoursOver24 || hours <= 23)) {
        inputElement.value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    } else {
        inputElement.value = '';
    }
}

/**
 * Lekéri a GPS-pozíció alapján az országkódot és beírja egy input mezőbe.
 * @param {string} inputId - Az input mező ID-ja.
 */
export async function fetchCountryCodeFor(inputId) {
    const inputElement = document.getElementById(inputId);
    const i18n = window.translations[state.currentLang];
    if (!inputElement || !navigator.geolocation) return;

    inputElement.value = "...";
    try {
        const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }));
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=en`);
        if (!response.ok) throw new Error('API hiba');
        const data = await response.json();
        const countryCode = data.address.country_code;

        if (countryCode && isoToVehicleCode[countryCode]) {
            inputElement.value = isoToVehicleCode[countryCode];
        } else {
            inputElement.value = (countryCode || 'N/A').toUpperCase();
        }
    } catch (error) {
        inputElement.value = "";
        showAlert(i18n.alertLocationFailed, 'info');
    }
}

/**
 * Átalakít egy Dátum objektumot "YYYY-MM-DD" stringgé.
 * @param {Date} d - A dátum objektum.
 * @returns {string} A formázott dátum.
 */
export const toISODate = d => d.toISOString().split('T')[0];

/**
 * Visszaadja a hét első és utolsó napját egy adott dátumhoz képest.
 * @param {Date} date - A kiindulási dátum.
 * @param {number} offset - Eltolás hetekben (pl. -1 a múlt hét).
 * @returns {{start: Date, end: Date}} A hét kezdő és végdátuma.
 */
export function getWeekRange(date, offset = 0) {
    const d = new Date(date);
    d.setDate(d.getDate() + (offset * 7));
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // hétfő az első nap
    const start = new Date(d.setDate(diff));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
}