const isoToVehicleCode = {
    'at': 'A', 'de': 'D', 'hu': 'H', 'sk': 'SK', 'si': 'SLO', 'it': 'I',
    'pl': 'PL', 'cz': 'CZ', 'ro': 'RO', 'ch': 'CH', 'fr': 'F', 'nl': 'NL',
    'be': 'B', 'lu': 'L', 'es': 'E', 'gb': 'UK'
};

async function fetchCountryCodeFor(inputId) {
    const inputElement = document.getElementById(inputId);
    if (!inputElement || !navigator.geolocation) return;

    inputElement.value = "...";
    try {
        const position = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=en`);
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        const countryCode = data.address.country_code;
        if (countryCode && isoToVehicleCode[countryCode]) {
            inputElement.value = isoToVehicleCode[countryCode];
        } else {
            inputElement.value = (countryCode || 'N/A').toUpperCase();
        }
    } catch (error) {
        inputElement.value = "";
        showCustomAlert(translations[currentLang].alertLocationFailed, 'info');
    }
}

async function fetchLocation(inputId) {
    if (!navigator.geolocation) {
        showCustomAlert(translations[currentLang].alertGeolocationNotSupported, 'info');
        return;
    }
    const locationInput = document.getElementById(inputId);
    locationInput.value = "...";
    try {
        const position = await new Promise((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
        );
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}&accept-language=${currentLang}`);
        if (!response.ok) throw new Error('API error');
        const data = await response.json();
        locationInput.value = data.address.city || data.address.town || data.address.village || 'Unknown location';
    } catch (error) {
        locationInput.value = "";
        showCustomAlert(translations[currentLang].alertLocationFailed, 'info');
    }
} 
