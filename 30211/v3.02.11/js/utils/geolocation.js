// =======================================================
// ===== GEOLOCATION SEGÉDFÜGGVÉNYEK (JAVÍTOTT) =========
// =======================================================

const isoToVehicleCode = {
    'at': 'A', 'de': 'D', 'hu': 'H', 'sk': 'SK', 'si': 'SLO', 'it': 'I',
    'pl': 'PL', 'cz': 'CZ', 'ro': 'RO', 'ch': 'CH', 'fr': 'F', 'nl': 'NL',
    'be': 'B', 'lu': 'L', 'es': 'E', 'gb': 'UK', 'hr': 'HR', 'rs': 'SRB',
    'ba': 'BIH', 'me': 'MNE', 'mk': 'MK', 'bg': 'BG', 'gr': 'GR', 'tr': 'TR',
    'ua': 'UA', 'md': 'MD', 'dk': 'DK', 'se': 'S', 'no': 'N', 'fi': 'FIN',
    'ee': 'EST', 'lv': 'LV', 'lt': 'LT', 'by': 'BY', 'ru': 'RUS', 'pt': 'P',
    'ie': 'IRL', 'is': 'IS', 'li': 'FL', 'mc': 'MC', 'sm': 'RSM', 'va': 'V'
};

/**
 * Országkód lekérése GPS koordináták alapján
 * @param {string} rowIdOrInputId - Lehet crossing-row ID vagy közvetlenül input ID
 */
async function fetchCountryCodeFor(rowIdOrInputId) {
    let inputElement;
    
    // Ha crossing-row ID-t kaptunk, keressük meg benne a .crossing-to inputot
    if (rowIdOrInputId.startsWith('crossing-')) {
        const row = document.getElementById(rowIdOrInputId);
        if (!row) {
            console.warn('[Geolocation] Crossing row not found:', rowIdOrInputId);
            return;
        }
        inputElement = row.querySelector('.crossing-to');
        if (!inputElement) {
            console.warn('[Geolocation] .crossing-to input not found in row:', rowIdOrInputId);
            return;
        }
    } else {
        // Közvetlenül input ID
        inputElement = document.getElementById(rowIdOrInputId);
    }
    
    if (!inputElement) {
        console.warn('[Geolocation] Input element not found:', rowIdOrInputId);
        return;
    }

    if (!navigator.geolocation) {
        if (typeof showCustomAlert === 'function' && typeof translations !== 'undefined') {
            showCustomAlert(translations[currentLang]?.alertGeolocationNotSupported || 'Geolocation nem támogatott', 'info');
        }
        return;
    }

    // Loading indikátor
    const originalValue = inputElement.value;
    inputElement.value = "...";
    inputElement.disabled = true;

    try {
        // GPS pozíció lekérése
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
                timeout: 15000,
                enableHighAccuracy: true,
                maximumAge: 0
            });
        });

        // Reverse geocoding - országkód lekérése
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=en`,
            {
                headers: {
                    'User-Agent': 'GuriGO/3.02.11 (Truck Driver Work Time App)'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.address || !data.address.country_code) {
            throw new Error('No country code in response');
        }

        const countryCode = data.address.country_code.toLowerCase();
        
        // Országkód konvertálása járműrendszám kódra
        if (isoToVehicleCode[countryCode]) {
            inputElement.value = isoToVehicleCode[countryCode];
        } else {
            // Ha nincs mapping, használjuk az ISO kódot nagybetűvel
            inputElement.value = countryCode.toUpperCase();
            console.log('[Geolocation] Unknown country code, using ISO:', countryCode);
        }

        inputElement.disabled = false;
        
        // Trigger input event for other listeners (pl. autocomplete)
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));

    } catch (error) {
        console.error('[Geolocation] Error fetching country code:', error);
        
        inputElement.value = originalValue; // Visszaállítjuk az eredeti értéket
        inputElement.disabled = false;
        
        if (typeof showCustomAlert === 'function' && typeof translations !== 'undefined') {
            const i18n = translations[currentLang];
            let errorMessage = i18n?.alertLocationFailed || 'Helyszín lekérése sikertelen';
            
            if (error.code === 1) {
                errorMessage = i18n?.alertGeolocationDenied || 'GPS hozzáférés megtagadva. Engedélyezd a böngésző beállításaiban!';
            } else if (error.code === 2) {
                errorMessage = i18n?.alertGeolocationUnavailable || 'GPS nem elérhető';
            } else if (error.code === 3) {
                errorMessage = i18n?.alertGeolocationTimeout || 'GPS időtúllépés';
            }
            
            showCustomAlert(errorMessage, 'info');
        }
    }
}

/**
 * Városnév lekérése GPS koordináták alapján
 * @param {string} inputId - Az input mező ID-ja
 */
async function fetchLocation(inputId) {
    const locationInput = document.getElementById(inputId);
    
    if (!locationInput) {
        console.warn('[Geolocation] Input element not found:', inputId);
        return;
    }

    if (!navigator.geolocation) {
        if (typeof showCustomAlert === 'function' && typeof translations !== 'undefined') {
            showCustomAlert(translations[currentLang]?.alertGeolocationNotSupported || 'Geolocation nem támogatott', 'info');
        }
        return;
    }

    // Loading indikátor
    const originalValue = locationInput.value;
    locationInput.value = "...";
    locationInput.disabled = true;

    try {
        // GPS pozíció lekérése
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
                timeout: 15000,
                enableHighAccuracy: true,
                maximumAge: 0
            });
        });

        // Nyelv beállítás a fordításhoz
        const lang = (typeof currentLang !== 'undefined') ? currentLang : 'hu';

        // Reverse geocoding - címadatok lekérése
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=${lang}`,
            {
                headers: {
                    'User-Agent': 'GuriGO/3.02.11 (Truck Driver Work Time App)'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.address) {
            throw new Error('No address data in response');
        }

        // Próbáljunk meg várost találni (prioritási sorrend)
        const city = data.address.city 
                  || data.address.town 
                  || data.address.village 
                  || data.address.municipality
                  || data.address.county
                  || 'Unknown location';

        locationInput.value = city;
        locationInput.disabled = false;
        
        // Trigger input event for other listeners (pl. autocomplete)
        locationInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        console.log('[Geolocation] Location found:', city);

    } catch (error) {
        console.error('[Geolocation] Error fetching location:', error);
        
        locationInput.value = originalValue; // Visszaállítjuk az eredeti értéket
        locationInput.disabled = false;
        
        if (typeof showCustomAlert === 'function' && typeof translations !== 'undefined') {
            const i18n = translations[currentLang];
            let errorMessage = i18n?.alertLocationFailed || 'Helyszín lekérése sikertelen';
            
            if (error.code === 1) {
                errorMessage = i18n?.alertGeolocationDenied || 'GPS hozzáférés megtagadva. Engedélyezd a böngésző beállításaiban!';
            } else if (error.code === 2) {
                errorMessage = i18n?.alertGeolocationUnavailable || 'GPS nem elérhető';
            } else if (error.code === 3) {
                errorMessage = i18n?.alertGeolocationTimeout || 'GPS időtúllépés';
            }
            
            showCustomAlert(errorMessage, 'info');
        }
    }
}

/**
 * Ellenőrzi, hogy a geolocation API elérhető-e
 * @returns {boolean}
 */
function isGeolocationAvailable() {
    return 'geolocation' in navigator;
}

/**
 * Ellenőrzi a geolocation engedélyeket
 * @returns {Promise<string>} 'granted', 'denied', vagy 'prompt'
 */
async function checkGeolocationPermission() {
    if (!navigator.permissions) {
        return 'unknown';
    }
    
    try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state;
    } catch (error) {
        console.warn('[Geolocation] Permission check failed:', error);
        return 'unknown';
    }
}

// Globális függvények exportálása
if (typeof window !== 'undefined') {
    window.fetchCountryCodeFor = fetchCountryCodeFor;
    window.fetchLocation = fetchLocation;
    window.isGeolocationAvailable = isGeolocationAvailable;
    window.checkGeolocationPermission = checkGeolocationPermission;
}