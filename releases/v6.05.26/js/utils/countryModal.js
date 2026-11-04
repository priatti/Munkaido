// =========================================
// COUNTRY DETECTION MODULE - GuriGO
// Automatikus országfelismerés + manuális választó
// =========================================

// === ÖSSZES EU ORSZÁG ===
function getEUCountries() {
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  
  return [
    { code: 'AT', name: i18n.countryAT || 'Austria', flag: '🇦🇹', currency: 'EUR' },
    { code: 'BE', name: i18n.countryBE || 'Belgium', flag: '🇧🇪', currency: 'EUR' },
    { code: 'BG', name: i18n.countryBG || 'Bulgaria', flag: '🇧🇬', currency: 'BGN' },
    { code: 'HR', name: i18n.countryHR || 'Croatia', flag: '🇭🇷', currency: 'EUR' },
    { code: 'CY', name: i18n.countryCY || 'Cyprus', flag: '🇨🇾', currency: 'EUR' },
    { code: 'CZ', name: i18n.countryCZ || 'Czech Republic', flag: '🇨🇿', currency: 'CZK' },
    { code: 'DK', name: i18n.countryDK || 'Denmark', flag: '🇩🇰', currency: 'DKK' },
    { code: 'EE', name: i18n.countryEE || 'Estonia', flag: '🇪🇪', currency: 'EUR' },
    { code: 'FI', name: i18n.countryFI || 'Finland', flag: '🇫🇮', currency: 'EUR' },
    { code: 'FR', name: i18n.countryFR || 'France', flag: '🇫🇷', currency: 'EUR' },
    { code: 'DE', name: i18n.countryDE || 'Germany', flag: '🇩🇪', currency: 'EUR' },
    { code: 'GR', name: i18n.countryGR || 'Greece', flag: '🇬🇷', currency: 'EUR' },
    { code: 'HU', name: i18n.countryHU || 'Hungary', flag: '🇭🇺', currency: 'HUF' },
    { code: 'IE', name: i18n.countryIE || 'Ireland', flag: '🇮🇪', currency: 'EUR' },
    { code: 'IT', name: i18n.countryIT || 'Italy', flag: '🇮🇹', currency: 'EUR' },
    { code: 'LV', name: i18n.countryLV || 'Latvia', flag: '🇱🇻', currency: 'EUR' },
    { code: 'LT', name: i18n.countryLT || 'Lithuania', flag: '🇱🇹', currency: 'EUR' },
    { code: 'LU', name: i18n.countryLU || 'Luxembourg', flag: '🇱🇺', currency: 'EUR' },
    { code: 'MT', name: i18n.countryMT || 'Malta', flag: '🇲🇹', currency: 'EUR' },
    { code: 'NL', name: i18n.countryNL || 'Netherlands', flag: '🇳🇱', currency: 'EUR' },
    { code: 'NO', name: i18n.countryNO || 'Norway', flag: '🇳🇴', currency: 'NOK' },
    { code: 'PL', name: i18n.countryPL || 'Poland', flag: '🇵🇱', currency: 'PLN' },
    { code: 'PT', name: i18n.countryPT || 'Portugal', flag: '🇵🇹', currency: 'EUR' },
    { code: 'RO', name: i18n.countryRO || 'Romania', flag: '🇷🇴', currency: 'RON' },
    { code: 'SK', name: i18n.countrySK || 'Slovakia', flag: '🇸🇰', currency: 'EUR' },
    { code: 'SI', name: i18n.countrySI || 'Slovenia', flag: '🇸🇮', currency: 'EUR' },
    { code: 'ES', name: i18n.countryES || 'Spain', flag: '🇪🇸', currency: 'EUR' },
    { code: 'SE', name: i18n.countrySE || 'Sweden', flag: '🇸🇪', currency: 'SEK' }
  ];
}

const EU_COUNTRIES = getEUCountries();

// === AUTOMATIKUS ORSZÁGFELISMERÉS ===
async function detectUserCountry() {
  console.log('🔍 Detecting user country...');
  
  // 1. Böngésző nyelvbeállítás (legmegbízhatóbb a célközönségnél)
  const browserLang = (navigator.language || navigator.userLanguage || '').toUpperCase();
  const langMatch = browserLang.match(/-([A-Z]{2})$/);
  if (langMatch && langMatch[1]) {
    const countryCode = langMatch[1];
    const countries = getEUCountries();
    if (countries.find(c => c.code === countryCode)) {
      console.log('✅ Country detected from browser:', countryCode);
      return countryCode;
    }
  }
  
  // 2. Timezone alapú becslés (fallback, de csak ha nem HU)
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneCountryMap = {
      'Europe/Budapest': 'HU',
      'Europe/Vienna': 'AT',
      'Europe/Berlin': 'DE',
      'Europe/Prague': 'CZ',
      'Europe/Warsaw': 'PL',
      'Europe/Bucharest': 'RO',
      'Europe/Sofia': 'BG',
      'Europe/Athens': 'GR',
      'Europe/Rome': 'IT',
      'Europe/Paris': 'FR',
      'Europe/Madrid': 'ES',
      'Europe/Lisbon': 'PT',
      'Europe/Amsterdam': 'NL',
      'Europe/Brussels': 'BE',
      'Europe/Stockholm': 'SE',
      'Europe/Copenhagen': 'DK',
      'Europe/Oslo': 'NO',
      'Europe/Helsinki': 'FI',
      'Europe/Dublin': 'IE',
      'Europe/Ljubljana': 'SI',
      'Europe/Bratislava': 'SK',
      'Europe/Zagreb': 'HR',
      'Europe/Tallinn': 'EE',
      'Europe/Riga': 'LV',
      'Europe/Vilnius': 'LT'
    };
    
    if (timezoneCountryMap[timezone]) {
      console.log('✅ Country detected from timezone:', timezoneCountryMap[timezone]);
      return timezoneCountryMap[timezone];
    }
  } catch (e) {
    console.warn('Timezone detection failed:', e);
  }

  // 3. IP-alapú geolokáció (utolsó fallback, csak ha semmi más nem működött)
  try {
    const response = await fetch('https://ipapi.co/json/', { timeout: 3000 });
    if (response.ok) {
      const data = await response.json();
      const countries = getEUCountries();
      if (data.country_code && countries.find(c => c.code === data.country_code)) {
        console.log('✅ Country detected from IP:', data.country_code);
        return data.country_code;
      }
    }
  } catch (e) {
    console.warn('IP geolocation failed:', e);
  }

  // 4. Ha semmi nem működött, alapértelmezett Magyarország
  console.log('⚠️ Could not detect country, defaulting to HU');
  return 'HU';
}

// === ORSZÁG MODÁL MEGNYITÁSA (csak ha szükséges) ===
function openCountryModal(detectedCountry = 'HU', isAutoDetected = false) {
  const modal = document.getElementById('country-modal');
  const select = document.getElementById('country-select');
  const detectionInfo = document.getElementById('country-detection-info');
  const modalTitle = document.getElementById('country-modal-title');
  const modalDescription = document.getElementById('country-modal-description');
  const confirmButton = document.getElementById('country-confirm-button');
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  
  if (modal && select) {
    // i18n szövegek betöltése
    if (modalTitle) {
      modalTitle.textContent = i18n.countryModalTitle || '🌍 Melyik országból használod az appot?';
    }
    if (modalDescription) {
      modalDescription.textContent = i18n.countryModalDescription || 'Ez szükséges az árak és pénznem helyes megjelenítéséhez.';
    }
    if (confirmButton) {
      confirmButton.textContent = i18n.countryConfirmButton || '✓ Megerősítés';
    }
    
    // Feltöltjük a select-et az összes EU országgal
    const countries = getEUCountries();
    select.innerHTML = countries
      .sort((a, b) => a.name.localeCompare(b.name, lang))
      .map(c => `<option value="${c.code}">${c.flag} ${c.name} (${c.currency})</option>`)
      .join('');
    
    select.value = detectedCountry;
    
    // Info szöveg frissítése
    if (detectionInfo && isAutoDetected) {
      const countries = getEUCountries();
      const countryInfo = countries.find(c => c.code === detectedCountry);
      const template = i18n.countryDetectionInfo || 'ℹ️ Automatikusan felismertük: <strong>{country}</strong>.<br>Ha ez nem helyes, válassz másik országot!';
      const countryLabel = `${countryInfo?.flag} ${countryInfo?.name}`;
      detectionInfo.innerHTML = template.replace('{country}', countryLabel);
      detectionInfo.classList.remove('hidden');
    } else if (detectionInfo) {
      detectionInfo.classList.add('hidden');
    }
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    console.log('Country modal opened with:', detectedCountry);
  }
}

// === ORSZÁG MODÁL BEZÁRÁSA ===
function closeCountryModal() {
  const modal = document.getElementById('country-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// === ORSZÁG MEGERŐSÍTÉSE ÉS MENTÉSE ===
async function confirmCountry(countryCode, event = null) {
  const currentUser = firebase.auth().currentUser;
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  
  if (!currentUser) {
    console.error('No user logged in!');
    if (typeof showCustomAlert === 'function') {
      const msg = i18n.countryNoUserError || '❌ Hiba: Nincs bejelentkezve felhasználó.';
      showCustomAlert(msg, 'error');
    }
    return;
  }

  if (!countryCode || countryCode.length !== 2) {
    if (typeof showCustomAlert === 'function') {
      const msg = i18n.countrySelectPrompt || '⚠️ Kérlek válassz egy országot!';
      showCustomAlert(msg, 'warning');
    }
    return;
  }

  try {
    const button = event?.target;
    if (button) {
      button.disabled = true;
      const saving = i18n.countrySavingLabel || 'Mentés...';
      button.innerHTML = `<span class="loading-spinner"></span> ${saving}`;
    }

    await firebase.firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('profile')
      .doc('info')
      .set({
        countryCode: countryCode.toUpperCase(),
        registrationCountryCode: countryCode.toUpperCase(),
        countryConfirmed: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

    console.log('✅ Country saved:', countryCode);
    closeCountryModal();

    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.classList.add('hidden');
      setTimeout(() => { splash.style.display = 'none'; }, 500);
    }

    const authScreen = document.getElementById('auth-screen');
    if (authScreen) authScreen.classList.add('hidden');

    const app = document.getElementById('app');
    if (app) app.classList.remove('hidden');
    if (typeof window.setAppShellChromeVisible === 'function') window.setAppShellChromeVisible(true);

    if (typeof renderApp === 'function') renderApp();

    if (typeof showToast === 'function') {
      const countries = getEUCountries();
      const countryInfo = countries.find(c => c.code === countryCode);
      const title = i18n.countrySavedTitle || 'Ország mentve';
      showToast('success', title, `${countryInfo?.flag} ${countryInfo?.name}`);
    }

  } catch (error) {
    console.error('❌ Country save error:', error);
    if (typeof showCustomAlert === 'function') {
      const msg = i18n.countrySaveError || '❌ Hiba történt a mentés során. Próbáld újra!';
      showCustomAlert(msg, 'error');
    }
    const button = event?.target;
    if (button) {
      button.disabled = false;
      button.innerHTML = i18n.countryConfirmButton || '✓ Megerősítés';
    }
  }
}

// === AUTOMATIKUS ORSZÁGBEÁLLÍTÁS (első regisztráció) ===
async function autoSetCountryForNewUser(userId) {
  try {
    const profileRef = firebase.firestore()
      .collection('users')
      .doc(userId)
      .collection('profile')
      .doc('info');
    
    const doc = await profileRef.get();
    
    // Ha már van countryCode és confirmed, nem csinálunk semmit
    if (doc.exists && doc.data().countryConfirmed) {
      console.log('✅ Country already confirmed for user');
      return true;
    }

    // Felismerjük az országot automatikusan
    const detectedCountry = await detectUserCountry();
    
    // MINDIG megkérdezzük a felhasználót, de a felismert országot ajánljuk fel
    // Ez megakadályozza a VPN vagy más detektálási hibák miatti rossz országbeállítást
    console.log('🔍 Detected country:', detectedCountry, '- asking user to confirm');
    openCountryModal(detectedCountry, true);
    return false;

  } catch (error) {
    console.error('Auto country detection error:', error);
    openCountryModal('HU', false);
    return false;
  }
}

// === ORSZÁG VÁLTOZTATÁSA (Settings menüből) ===
async function openCountryChangeModal() {
  const currentUser = firebase.auth().currentUser;
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  
  if (!currentUser) {
    if (typeof showCustomAlert === 'function') {
      const msg = i18n.countryChangeLoginRequired || '⚠️ Jelentkezz be az ország módosításához!';
      showCustomAlert(msg, 'warning');
    }
    return;
  }

  try {
    const doc = await firebase.firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('profile')
      .doc('info')
      .get();
    
    const currentCountry = doc.exists ? doc.data().countryCode : 'HU';
    openCountryModal(currentCountry, false);
  } catch (error) {
    console.error('Error loading country:', error);
    openCountryModal('HU', false);
  }
}

// === ORSZÁG INFORMÁCIÓ LEKÉRÉSE ===
function getCountryInfo(countryCode) {
  const countries = getEUCountries();
  const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
  return countries.find(c => c.code === countryCode) || 
         { code: 'HU', name: i18n.countryHU || 'Hungary', flag: '🇭🇺', currency: 'HUF' };
}

// === GLOBÁLIS EXPORTOK ===
window.detectUserCountry = detectUserCountry;
window.autoSetCountryForNewUser = autoSetCountryForNewUser;
window.openCountryModal = openCountryModal;
window.closeCountryModal = closeCountryModal;
window.confirmCountry = confirmCountry;
window.openCountryChangeModal = openCountryChangeModal;
window.getCountryInfo = getCountryInfo;
window.getEUCountries = getEUCountries;
window.EU_COUNTRIES = getEUCountries();

console.log('✅ Country Detection Module loaded - 27 EU countries supported');
