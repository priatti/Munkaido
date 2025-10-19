// =========================================
// COUNTRY DETECTION MODULE - GuriGO
// Automatikus országfelismerés + manuális választó
// =========================================

// === ÖSSZES EU ORSZÁG ===
const EU_COUNTRIES = [
  { code: 'AT', name: 'Ausztria', flag: '🇦🇹', currency: 'EUR' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', currency: 'EUR' },
  { code: 'BG', name: 'Bulgária', flag: '🇧🇬', currency: 'BGN' },
  { code: 'HR', name: 'Horvátország', flag: '🇭🇷', currency: 'EUR' },
  { code: 'CY', name: 'Ciprus', flag: '🇨🇾', currency: 'EUR' },
  { code: 'CZ', name: 'Csehország', flag: '🇨🇿', currency: 'CZK' },
  { code: 'DK', name: 'Dánia', flag: '🇩🇰', currency: 'DKK' },
  { code: 'EE', name: 'Észtország', flag: '🇪🇪', currency: 'EUR' },
  { code: 'FI', name: 'Finnország', flag: '🇫🇮', currency: 'EUR' },
  { code: 'FR', name: 'Franciaország', flag: '🇫🇷', currency: 'EUR' },
  { code: 'DE', name: 'Németország', flag: '🇩🇪', currency: 'EUR' },
  { code: 'GR', name: 'Görögország', flag: '🇬🇷', currency: 'EUR' },
  { code: 'HU', name: 'Magyarország', flag: '🇭🇺', currency: 'HUF' },
  { code: 'IE', name: 'Írország', flag: '🇮🇪', currency: 'EUR' },
  { code: 'IT', name: 'Olaszország', flag: '🇮🇹', currency: 'EUR' },
  { code: 'LV', name: 'Lettország', flag: '🇱🇻', currency: 'EUR' },
  { code: 'LT', name: 'Litvánia', flag: '🇱🇹', currency: 'EUR' },
  { code: 'LU', name: 'Luxemburg', flag: '🇱🇺', currency: 'EUR' },
  { code: 'MT', name: 'Málta', flag: '🇲🇹', currency: 'EUR' },
  { code: 'NL', name: 'Hollandia', flag: '🇳🇱', currency: 'EUR' },
  { code: 'PL', name: 'Lengyelország', flag: '🇵🇱', currency: 'PLN' },
  { code: 'PT', name: 'Portugália', flag: '🇵🇹', currency: 'EUR' },
  { code: 'RO', name: 'Románia', flag: '🇷🇴', currency: 'RON' },
  { code: 'SK', name: 'Szlovákia', flag: '🇸🇰', currency: 'EUR' },
  { code: 'SI', name: 'Szlovénia', flag: '🇸🇮', currency: 'EUR' },
  { code: 'ES', name: 'Spanyolország', flag: '🇪🇸', currency: 'EUR' },
  { code: 'SE', name: 'Svédország', flag: '🇸🇪', currency: 'SEK' }
];

// === AUTOMATIKUS ORSZÁGFELISMERÉS ===
async function detectUserCountry() {
  console.log('🔍 Detecting user country...');
  
  // 1. Böngésző nyelvbeállítás
  const browserLang = (navigator.language || navigator.userLanguage || '').toUpperCase();
  const langMatch = browserLang.match(/-([A-Z]{2})$/);
  if (langMatch && langMatch[1]) {
    const countryCode = langMatch[1];
    if (EU_COUNTRIES.find(c => c.code === countryCode)) {
      console.log('✅ Country detected from browser:', countryCode);
      return countryCode;
    }
  }

  // 2. Timezone alapú becslés
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

  // 3. IP-alapú geolokáció (külső API - opcionális)
  try {
    const response = await fetch('https://ipapi.co/json/', { timeout: 3000 });
    if (response.ok) {
      const data = await response.json();
      if (data.country_code && EU_COUNTRIES.find(c => c.code === data.country_code)) {
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
  
  if (modal && select) {
    // Feltöltjük a select-et az összes EU országgal
    select.innerHTML = EU_COUNTRIES
      .sort((a, b) => a.name.localeCompare(b.name, 'hu'))
      .map(c => `<option value="${c.code}">${c.flag} ${c.name} (${c.currency})</option>`)
      .join('');
    
    select.value = detectedCountry;
    
    // Info szöveg frissítése
    if (detectionInfo && isAutoDetected) {
      const countryInfo = EU_COUNTRIES.find(c => c.code === detectedCountry);
      detectionInfo.innerHTML = `
        ℹ️ Automatikusan felismertük: <strong>${countryInfo?.flag} ${countryInfo?.name}</strong>.<br>
        Ha ez nem helyes, válassz másik országot!
      `;
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
async function confirmCountry(countryCode) {
  const currentUser = firebase.auth().currentUser;
  
  if (!currentUser) {
    console.error('No user logged in!');
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('❌ Hiba: Nincs bejelentkezve felhasználó.', 'error');
    }
    return;
  }

  if (!countryCode || countryCode.length !== 2) {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('⚠️ Kérlek válassz egy országot!', 'warning');
    }
    return;
  }

  try {
    const button = event?.target;
    if (button) {
      button.disabled = true;
      button.innerHTML = '<span class="loading-spinner"></span> Mentés...';
    }

    await firebase.firestore()
      .collection('users')
      .doc(currentUser.uid)
      .collection('profile')
      .doc('info')
      .set({
        countryCode: countryCode.toUpperCase(),
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

    if (typeof renderApp === 'function') renderApp();

    if (typeof showToast === 'function') {
      const countryInfo = EU_COUNTRIES.find(c => c.code === countryCode);
      showToast('success', 'Ország mentve', `${countryInfo?.flag} ${countryInfo?.name}`);
    }

  } catch (error) {
    console.error('❌ Country save error:', error);
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('❌ Hiba történt a mentés során. Próbáld újra!', 'error');
    }
    const button = event?.target;
    if (button) {
      button.disabled = false;
      button.innerHTML = '✓ Megerősítés';
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

    // Felismerjük az országot
    const detectedCountry = await detectUserCountry();
    
    // Ha sikerült felismerni ÉS nem HU (mert HU az alapértelmezett fallback)
    // akkor automatikusan mentjük
    if (detectedCountry && detectedCountry !== 'HU') {
      await profileRef.set({
        countryCode: detectedCountry,
        countryConfirmed: true,
        autoDetected: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log('✅ Country auto-set:', detectedCountry);
      return true;
    }

    // Ha HU vagy nem sikerült felismerni, megkérdezzük
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
  
  if (!currentUser) {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('⚠️ Jelentkezz be az ország módosításához!', 'warning');
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
  return EU_COUNTRIES.find(c => c.code === countryCode) || 
         { code: 'HU', name: 'Magyarország', flag: '🇭🇺', currency: 'HUF' };
}

// === GLOBÁLIS EXPORTOK ===
window.detectUserCountry = detectUserCountry;
window.autoSetCountryForNewUser = autoSetCountryForNewUser;
window.openCountryModal = openCountryModal;
window.closeCountryModal = closeCountryModal;
window.confirmCountry = confirmCountry;
window.openCountryChangeModal = openCountryChangeModal;
window.getCountryInfo = getCountryInfo;
window.EU_COUNTRIES = EU_COUNTRIES;

console.log('✅ Country Detection Module loaded - 27 EU countries supported');
