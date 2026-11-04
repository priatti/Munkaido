// ============================================
// BILLING INFO - Számlázási adatok kezelése
// ============================================

// Firebase 8.x globális használat (NEM ES6 module)
// auth és db a globális firebase objektumból

// ===== ORSZÁGOK LISTÁJA =====
const COUNTRIES = {
  hu: {
    'HU': 'Magyarország',
    'AT': 'Ausztria',
    'DE': 'Németország',
    'SK': 'Szlovákia',
    'RO': 'Románia',
    'HR': 'Horvátország',
    'SI': 'Szlovénia',
    'CZ': 'Csehország',
    'PL': 'Lengyelország',
    'FR': 'Franciaország',
    'IT': 'Olaszország',
    'ES': 'Spanyolország',
    'BE': 'Belgium',
    'NL': 'Hollandia',
    'LU': 'Luxemburg',
    'IE': 'Írország',
    'PT': 'Portugália',
    'DK': 'Dánia',
    'SE': 'Svédország',
    'FI': 'Finnország',
    'EE': 'Észtország',
    'LV': 'Lettország',
    'LT': 'Litvánia',
    'GR': 'Görögország',
    'CY': 'Ciprus',
    'MT': 'Málta',
    'BG': 'Bulgária',
    'IS': 'Izland',
    'LI': 'Liechtenstein',
    'NO': 'Norvégia'
  },
  de: {
    'HU': 'Ungarn',
    'AT': 'Österreich',
    'DE': 'Deutschland',
    'SK': 'Slowakei',
    'RO': 'Rumänien',
    'HR': 'Kroatien',
    'SI': 'Slowenien',
    'CZ': 'Tschechien',
    'PL': 'Polen',
    'FR': 'Frankreich',
    'IT': 'Italien',
    'ES': 'Spanien',
    'BE': 'Belgien',
    'NL': 'Niederlande',
    'LU': 'Luxemburg',
    'IE': 'Irland',
    'PT': 'Portugal',
    'DK': 'Dänemark',
    'SE': 'Schweden',
    'FI': 'Finnland',
    'EE': 'Estland',
    'LV': 'Lettland',
    'LT': 'Litauen',
    'GR': 'Griechenland',
    'CY': 'Zypern',
    'MT': 'Malta',
    'BG': 'Bulgarien',
    'IS': 'Island',
    'LI': 'Liechtenstein',
    'NO': 'Norwegen'
  }
};

function resolveCurrentLanguage() {
  if (typeof window !== 'undefined' && typeof window.currentLang === 'string' && window.currentLang) {
    return window.currentLang;
  }
  try {
    const stored = (typeof localStorage !== 'undefined') ? localStorage.getItem('language') : null;
    if (stored) return stored;
  } catch (_) {}
  return 'hu';
}

function getBillingI18n() {
  const lang = resolveCurrentLanguage();
  const fallbackHu = (typeof translations !== 'undefined' && translations.hu) ? translations.hu : {};
  const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : fallbackHu;
  const t = (key, fallback) => (i18n && i18n[key]) ? i18n[key] : fallback;
  return { lang, i18n, t };
}

// ===== ZIPPOPOTAM API - Város lekérés ország + irányítószám alapján =====
const ZIPPOPOTAM_BASE = 'https://api.zippopotam.us';
let _zippopotamDebounceTimer = null;

async function fetchCitiesFromZippopotam(countryCode, postcode) {
  const cc = (countryCode || '').trim().toUpperCase();
  const pc = (postcode || '').trim();
  if (!cc || !pc) return { cities: [], error: null };

  try {
    const url = `${ZIPPOPOTAM_BASE}/${cc}/${encodeURIComponent(pc)}`;
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) return { cities: [], error: 'not_found' };
      return { cities: [], error: 'api_error' };
    }
    const data = await res.json();
    const places = data.places || [];
    const cities = [...new Set(places.map(p => (p['place name'] || p.place_name || '').trim()).filter(Boolean))];
    return { cities, error: null };
  } catch (err) {
    console.warn('[BillingInfo] Zippopotam API error:', err);
    return { cities: [], error: 'network' };
  }
}

function setupZippopotamListeners() {
  const countryEl = document.getElementById('billing-country');
  const postcodeEl = document.getElementById('billing-postcode');
  const cityContainer = document.getElementById('billing-city-container');
  const cityInput = document.getElementById('billing-city');
  if (!countryEl || !postcodeEl || !cityContainer || !cityInput) return;

  const { t } = getBillingI18n();
  const cityLabel = t('billingCityLabel', 'Város');
  const cityPlaceholder = t('billingCityPlaceholder', 'pl. Budapest');
  const cityManualEntry = t('billingCityManualEntry', 'Kézi megadás');
  const cityLookupLoading = t('billingCityLookupLoading', 'Város keresése...');
  const cityLookupNotFound = t('billingCityLookupNotFound', 'Nem található város ehhez az irányítószámhoz. Ellenőrizd az országot és irányítószámot, vagy add meg kézzel.');
  const cityLookupError = t('billingCityLookupError', 'A város lekérése sikertelen. Add meg kézzel.');

  function getCurrentCityValue() {
    const el = cityContainer.querySelector('#billing-city') || document.getElementById('billing-city');
    return (el && el.value) ? String(el.value).replace(/&/g, '&amp;').replace(/"/g, '&quot;') : '';
  }

  function renderCityField(mode, options = {}) {
    const { cities = [], loading = false, error = null, manualOverride = false, currentValue } = options;
    const val = currentValue !== undefined ? currentValue : getCurrentCityValue();
    const baseClasses = 'w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500';

    if (manualOverride || mode === 'input') {
      cityContainer.innerHTML = `
        <div>
          <input type="text" id="billing-city" name="city" value="${val}"
            required placeholder="${cityPlaceholder}" class="${baseClasses}" />
        </div>`;
      return;
    }

    if (loading) {
      cityContainer.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          <span class="text-sm text-gray-500">${cityLookupLoading}</span>
        </div>`;
      return;
    }

    if (error) {
      cityContainer.innerHTML = `
        <div>
          <input type="text" id="billing-city" name="city" value="" required placeholder="${cityPlaceholder}" class="${baseClasses} border-red-300 dark:border-red-600" />
          <p class="text-xs text-red-600 dark:text-red-400 mt-1">${error === 'not_found' ? cityLookupNotFound : cityLookupError}</p>
        </div>`;
      return;
    }

    if (cities.length === 1) {
      const safeCity = String(cities[0]).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      cityContainer.innerHTML = `
        <div>
          <input type="text" id="billing-city" name="city" value="${safeCity}" required readonly
            class="${baseClasses} bg-gray-50 dark:bg-gray-700" />
          <p class="text-xs text-gray-500 mt-1"><a href="#" class="underline" id="billing-city-edit">${cityManualEntry}</a></p>
        </div>`;
      document.getElementById('billing-city-edit')?.addEventListener('click', (e) => {
        e.preventDefault();
        renderCityField('input', { manualOverride: true });
      });
      return;
    }

    if (cities.length > 1) {
      const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const opts = cities.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
      cityContainer.innerHTML = `
        <div>
          <select id="billing-city" name="city" required class="${baseClasses}">
            <option value="">-- ${t('billingCityPlaceholderOption', 'Válassz várost')} --</option>
            ${opts}
          </select>
          <p class="text-xs text-gray-500 mt-1"><a href="#" class="underline" id="billing-city-edit">${cityManualEntry}</a></p>
        </div>`;
      document.getElementById('billing-city-edit')?.addEventListener('click', (e) => {
        e.preventDefault();
        renderCityField('input', { manualOverride: true });
      });
      return;
    }

    cityContainer.innerHTML = `
      <div>
        <input type="text" id="billing-city" name="city" value="" required placeholder="${cityPlaceholder}" class="${baseClasses}" />
      </div>`;
  }

  async function doLookup() {
    const country = countryEl.value;
    const postcode = postcodeEl.value.trim();
    if (!country || !postcode) {
      renderCityField('input', { manualOverride: true });
      return;
    }

    renderCityField('loading', { loading: true });
    const { cities, error } = await fetchCitiesFromZippopotam(country, postcode);
    renderCityField('result', { cities, error });
  }

  function debouncedLookup() {
    if (_zippopotamDebounceTimer) clearTimeout(_zippopotamDebounceTimer);
    const country = countryEl.value;
    const postcode = postcodeEl.value.trim();
    if (!country || !postcode) return;
    _zippopotamDebounceTimer = setTimeout(doLookup, 400);
  }

  postcodeEl.addEventListener('blur', debouncedLookup);
  countryEl.addEventListener('change', () => {
    const pc = postcodeEl.value.trim();
    if (pc) debouncedLookup();
    else renderCityField('input', { manualOverride: true });
  });
}

// ===== BILLING INFO BETÖLTÉSE =====
function isBillingAuthPermissionDenied(error) {
  const code = error && error.code;
  const msg = String((error && error.message) || '');
  return code === 'permission-denied' || msg.indexOf('Missing or insufficient permissions') !== -1;
}

async function loadBillingInfo() {
  try {
    // KRITIKUS: Ellenőrizzük hogy Firebase készen van-e
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
      console.warn('[BillingInfo] Firebase not ready in loadBillingInfo');
      return null; // NE crasheljen, csak térjen vissza null-lal
    }

    const user = firebase.auth().currentUser;
    if (!user) {
      return null;
    }

    const loadCtx = (window.GurigoAuthSession && window.GurigoAuthSession.captureAuthScopedLoad)
      ? window.GurigoAuthSession.captureAuthScopedLoad()
      : { uid: user.uid, gen: 0 };

    const db = firebase.firestore();
    const billingInfoRef = db.collection('users').doc(user.uid)
      .collection('billingInfo').doc('default');
    const billingInfoSnap = await billingInfoRef.get();

    if (window.GurigoAuthSession && window.GurigoAuthSession.shouldDiscardAuthScopedLoad(loadCtx)) {
      return null;
    }

    if (billingInfoSnap.exists) {
      const billingData = billingInfoSnap.data();
      console.log('[BillingInfo] Loaded', {
        country: billingData.country || null,
        customerType: billingData.customerType || null
      });
      
      // Számlázási ország külön mezőben — ne írja felül a regisztrációs országkódot (ár/checkout).
      if (billingData.country && window.currentUserSubscription) {
        const billingCountry = String(billingData.country).trim().toUpperCase();
        const currentBillingCountry = window.currentUserSubscription.billingCountryCode
          ? String(window.currentUserSubscription.billingCountryCode).trim().toUpperCase()
          : '';
        if (billingCountry && currentBillingCountry !== billingCountry) {
          window.currentUserSubscription.billingCountryCode = billingCountry;
          console.log('[BillingInfo] Updated billing country code:', billingCountry);

          if (window.__gurigoLastBillingCountryRendered !== billingCountry) {
            window.__gurigoLastBillingCountryRendered = billingCountry;
            if (typeof renderSubscriptionInfo === 'function') {
              setTimeout(function () { renderSubscriptionInfo(); }, 100);
            }
          }
        }
      }
      
      return billingData;
    } else {
      console.log('[BillingInfo] No billing info found');
      return null;
    }

  } catch (error) {
    const signedOut = typeof firebase !== 'undefined' && firebase.auth && !firebase.auth().currentUser;
    const signingOut = window.GurigoAuthSession && window.GurigoAuthSession.isSigningOut();
    if (isBillingAuthPermissionDenied(error) && (signedOut || signingOut)) {
      console.warn('[BillingInfo] Load aborted (auth):', error && error.message);
    } else {
      console.warn('[BillingInfo] Error loading:', error);
    }
    return null;
  }
}

// ===== BILLING INFO MENTÉSE =====
async function saveBillingInfo(billingData) {
  try {
    const { t } = getBillingI18n();
    // KRITIKUS: Ellenőrizzük hogy Firebase készen van-e
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
      throw new Error(t('billingFirebaseNotReadyError', 'Firebase még nem inicializálódott. Kérlek próbáld újra.'));
    }

    const user = firebase.auth().currentUser;
    if (!user) {
      throw new Error(t('billingNoUserError', 'Nincs bejelentkezve felhasználó'));
    }

    // Validáció
    if (!billingData.name || !billingData.country || !billingData.postCode || 
        !billingData.city || !billingData.address) {
      throw new Error(t('billingMissingFieldsError', 'Minden kötelező mezőt ki kell tölteni'));
    }

    // Céges előfizető esetén adószám kötelező
    if (billingData.customerType === 'business' && !billingData.taxNumber) {
      throw new Error(t('billingBusinessTaxError', 'Céges előfizetőknél az adószám megadása kötelező'));
    }

    const db = firebase.firestore();
    const billingInfoRef = db.collection('users').doc(user.uid)
      .collection('billingInfo').doc('default');
    const existingDoc = await billingInfoRef.get();

    const dataToSave = {
      name: billingData.name.trim(),
      email: user.email, // Auth email (nem szerkeszthető)
      customerType: billingData.customerType || 'individual', // Új mező
      country: billingData.country,
      postCode: billingData.postCode.trim(),
      city: billingData.city.trim(),
      address: billingData.address.trim(),
      taxNumber: billingData.taxNumber ? billingData.taxNumber.trim() : null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Ha új dokumentum, createdAt is kell
    if (!existingDoc.exists) {
      dataToSave.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    await billingInfoRef.set(dataToSave, { merge: true });

    console.log('[BillingInfo] Saved successfully');
    return true;

  } catch (error) {
    console.error('[BillingInfo] Error saving:', error);
    throw error;
  }
}

// ===== BILLING INFO FORM RENDER =====
async function renderBillingInfoForm() {
  const container = document.getElementById('billing-info-content');
  if (!container) {
    console.warn('[BillingInfo] Container not found');
    return;
  }

  const { t, lang } = getBillingI18n();

  // Ellenőrizzük, hogy Firebase inicializálódott-e
  if (typeof firebase === 'undefined' || !firebase.auth) {
    console.warn('[BillingInfo] Firebase not ready yet');
    container.innerHTML = `
      <div class="text-center text-gray-500 py-4">
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
        <p class="text-sm">${t('billingLoadingLabel', 'Számlázási adatok betöltése...')}</p>
      </div>
    `;
    // Próbáljuk újra 500ms múlva
    setTimeout(() => renderBillingInfoForm(), 500);
    return;
  }

  const user = firebase.auth().currentUser;
  if (!user) {
    container.innerHTML = `<p class="text-gray-600 dark:text-gray-400">${t('billingLoginRequiredMessage', 'Kérjük jelentkezz be.')}</p>`;
    return;
  }

  // Meglévő adatok betöltése
  const existingData = await loadBillingInfo();

  // Ha nincs még számlázási adat, próbáljuk meg a profile/info countryCode-ot használni
  let defaultCountry = existingData?.country;
  if (!defaultCountry && window.currentUserSubscription?.countryCode) {
    defaultCountry = window.currentUserSubscription.countryCode;
    console.log('[BillingInfo] Using countryCode from profile:', defaultCountry);
  }

  // Országok dropdown generálás (nyelv szerint)
  const countryList = COUNTRIES[lang] || COUNTRIES.hu;
  const countryOptions = Object.entries(countryList).map(([code, name]) => {
    const selected = defaultCountry === code ? 'selected' : '';
    return `<option value="${code}" ${selected}>${name}</option>`;
  }).join('');

  const formTitle = t('billingFormTitle', '💳 Számlázási adatok');
  const formInfo = t('billingFormInfo', '📋 <strong>Fontos:</strong> Ezek az adatok kerülnek a számlára. Minden vásárlás előtt kötelező kitölteni.');
  const emailLabel = t('billingEmailLabel', 'Email cím');
  const emailNote = t('billingEmailNote', '(számlára kerül)');
  const customerTypeLabel = t('billingCustomerTypeLabel', 'Előfizető típusa');
  const individualLabel = t('billingCustomerIndividualLabel', 'Magánszemély');
  const individualDesc = t('billingCustomerIndividualDesc', 'Egyéni előfizető');
  const businessLabel = t('billingCustomerBusinessLabel', 'Céges');
  const businessDesc = t('billingCustomerBusinessDesc', 'Vállalati előfizető');
  const nameLabel = t('billingNameLabel', 'Név');
  const nameHint = t('billingNameHint', '(magánszemély: teljes név, cég: cégnév)');
  const namePlaceholder = t('billingNamePlaceholder', 'pl. Kiss János vagy Példa Kft.');
  const countryLabel = t('billingCountryLabel', 'Ország');
  const countryPlaceholderOption = t('billingCountryPlaceholderOption', '-- Válassz országot --');
  const postCodeLabel = t('billingPostCodeLabel', 'Irányítószám');
  const postCodePlaceholder = t('billingPostCodePlaceholder', 'pl. 1011');
  const cityLabel = t('billingCityLabel', 'Város');
  const cityPlaceholder = t('billingCityPlaceholder', 'pl. Budapest');
  const addressLabel = t('billingAddressLabel', 'Cím');
  const addressHint = t('billingAddressHint', '(utca, házszám, emelet, ajtó)');
  const addressPlaceholder = t('billingAddressPlaceholder', 'pl. Fő utca 12. 3/4');
  const taxNumberLabel = t('billingTaxNumberLabel', 'Adószám');
  const taxNumberHint = t('billingTaxNumberHint', '💡 Céges előfizetőknél kötelező az ÁFA helyes számításához');
  const taxNumberPlaceholder = t('billingTaxNumberPlaceholder', 'pl. 12345678-1-23');
  const saveButtonLabel = t('billingSaveButton', '💾 Számlázási adatok mentése');

  container.innerHTML = `
    <div class="max-w-2xl mx-auto">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        ${formTitle}
      </h2>
      
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
        <p class="text-sm text-blue-800 dark:text-blue-300">
          ${formInfo}
        </p>
      </div>

      <form id="billing-info-form" class="space-y-4">
        <!-- Email (nem szerkeszthető) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ${emailLabel} <span class="text-gray-500">${emailNote}</span>
          </label>
          <input 
            type="email" 
            value="${user.email}" 
            disabled
            class="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg border border-gray-300 dark:border-gray-600 cursor-not-allowed"
          />
        </div>

        <!-- Ügyfél típusa -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ${customerTypeLabel} <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label class="relative flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
              (existingData?.customerType === 'individual' || !existingData?.customerType) 
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-sm' 
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            }">
              <input 
                type="radio" 
                name="customerType" 
                value="individual" 
                ${(existingData?.customerType === 'individual' || !existingData?.customerType) ? 'checked' : ''}
                class="sr-only peer"
                onchange="handleCustomerTypeChange(this)"
              />
              <div class="flex items-center gap-3 w-full">
                <div class="text-xl">👤</div>
                <div class="flex-1">
                  <div class="font-medium text-gray-900 dark:text-white text-sm">${individualLabel}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">${individualDesc}</div>
                </div>
                <div class="flex-shrink-0 ${
                  (existingData?.customerType === 'individual' || !existingData?.customerType) 
                    ? '' 
                    : 'opacity-0'
                }">
                  <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                </div>
              </div>
            </label>
            <label class="relative flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
              existingData?.customerType === 'business' 
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 shadow-sm' 
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            }">
              <input 
                type="radio" 
                name="customerType" 
                value="business" 
                ${existingData?.customerType === 'business' ? 'checked' : ''}
                class="sr-only peer"
                onchange="handleCustomerTypeChange(this)"
              />
              <div class="flex items-center gap-3 w-full">
                <div class="text-xl">🏢</div>
                <div class="flex-1">
                  <div class="font-medium text-gray-900 dark:text-white text-sm">${businessLabel}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">${businessDesc}</div>
                </div>
                <div class="flex-shrink-0 ${
                  existingData?.customerType === 'business' 
                    ? '' 
                    : 'opacity-0'
                }">
                  <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Név -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ${nameLabel} <span class="text-red-500">*</span>
            <span class="text-xs text-gray-500 ml-2">${nameHint}</span>
          </label>
          <input 
            type="text" 
            id="billing-name" 
            name="name"
            value="${existingData?.name || ''}"
            required
            placeholder="${namePlaceholder}"
            class="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <!-- Ország -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ${countryLabel} <span class="text-red-500">*</span>
          </label>
          <select 
            id="billing-country" 
            name="country"
            required
            class="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">${countryPlaceholderOption}</option>
            ${countryOptions}
          </select>
        </div>

        <!-- Irányítószám -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ${postCodeLabel} <span class="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            id="billing-postcode" 
            name="postCode"
            value="${existingData?.postCode || ''}"
            required
            placeholder="${postCodePlaceholder}"
            class="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <!-- Város (Zippopotam: ország + irányítószám alapján automatikus vagy legördülő) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ${cityLabel} <span class="text-red-500">*</span>
          </label>
          <div id="billing-city-container">
            <input 
              type="text" 
              id="billing-city" 
              name="city"
              value="${existingData?.city || ''}"
              required
              placeholder="${cityPlaceholder}"
              class="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${t('billingCityLookupHint', 'Írd be az irányítószámot, majd kattints ki – a város automatikusan betöltődik.')}</p>
          </div>
        </div>

        <!-- Cím -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ${addressLabel} <span class="text-red-500">*</span>
            <span class="text-xs text-gray-500 ml-2">${addressHint}</span>
          </label>
          <input 
            type="text" 
            id="billing-address" 
            name="address"
            value="${existingData?.address || ''}"
            required
            placeholder="${addressPlaceholder}"
            class="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <!-- Adószám (céges előfizetőknek) -->
        <div id="tax-number-container" class="${existingData?.customerType === 'business' ? '' : 'hidden'}">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ${taxNumberLabel} <span class="text-red-500" id="tax-number-required">*</span>
          </label>
          <input 
            type="text" 
            id="billing-taxnumber" 
            name="taxNumber"
            value="${existingData?.taxNumber || ''}"
            placeholder="${taxNumberPlaceholder}"
            class="w-full px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ${taxNumberHint}
          </p>
        </div>

        <!-- Mentés gomb -->
        <div class="pt-4">
          <button 
            type="submit" 
            id="save-billing-btn"
            class="w-full py-3 text-white font-semibold rounded-lg transition"
          >
            ${saveButtonLabel}
          </button>
        </div>

        <!-- Visszajelzés -->
        <div id="billing-feedback" class="hidden mt-4"></div>
      </form>
    </div>
  `;

  // Form submit kezelése
  const form = document.getElementById('billing-info-form');
  form.addEventListener('submit', handleBillingInfoSubmit);

  // HTML5 required validáció: böngésző nyelv helyett i18n üzenet
  form.addEventListener('invalid', function(e) {
    const el = e.target;
    if (el && el.validity && el.validity.valueMissing && el.setCustomValidity) {
      const { t } = getBillingI18n();
      el.setCustomValidity(t('billingFieldRequired', 'Kérjük, töltse ki ezt a mezőt.'));
    }
  }, true);
  form.addEventListener('input', function(e) {
    if (e.target && e.target.setCustomValidity) e.target.setCustomValidity('');
  });
  form.addEventListener('change', function(e) {
    if (e.target && e.target.setCustomValidity) e.target.setCustomValidity('');
  });

  // Zippopotam: város automatikus lekérés ország + irányítószám alapján
  setupZippopotamListeners();
}

// ===== FORM SUBMIT KEZELÉSE =====
async function handleBillingInfoSubmit(event) {
  event.preventDefault();

  const saveBtn = document.getElementById('save-billing-btn');
  const feedback = document.getElementById('billing-feedback');
  const { t } = getBillingI18n();
  
  // Button disable
  saveBtn.disabled = true;
  saveBtn.textContent = t('billingSavingState', '⏳ Mentés...');

  try {
    const formData = new FormData(event.target);
    const billingData = {
      name: formData.get('name'),
      customerType: formData.get('customerType'),
      country: formData.get('country'),
      postCode: formData.get('postCode'),
      city: formData.get('city'),
      address: formData.get('address'),
      taxNumber: formData.get('taxNumber')
    };

    await saveBillingInfo(billingData);

    // Siker
    feedback.className = 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-4 text-green-900 dark:text-green-200 font-semibold';
    feedback.innerHTML = t('billingSaveSuccess', '✅ <strong>Mentve!</strong> Számlázási adatok sikeresen frissítve.');
    feedback.classList.remove('hidden');
    try { feedback.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}

    // 2 mp múlva eltűnik
    setTimeout(() => {
      feedback.classList.add('hidden');
    }, 3000);

  } catch (error) {
    console.error('[BillingInfo] Submit error:', error);
    
    feedback.className = 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4 text-red-900 dark:text-red-200 font-semibold';
    const prefix = t('billingSaveErrorPrefix', '❌ <strong>Hiba:</strong>');
    feedback.innerHTML = `${prefix} ${error.message}`;
    feedback.classList.remove('hidden');
    try { feedback.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}

  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = t('billingSaveButton', '💾 Számlázási adatok mentése');
  }
}

// ===== BILLING INFO ELLENŐRZÉS (vásárlás előtt) =====
async function checkBillingInfoBeforePurchase() {
  try {
    const { t } = getBillingI18n();
    const billingInfo = await loadBillingInfo();
    
    if (!billingInfo) {
      // Nincs billing info → popup + átirányítás
      return {
        hasInfo: false,
        message: t('billingCheckMissingMessage', 'A vásárlás előtt kérjük töltsd ki a számlázási adataidat.')
      };
    }

    // Van billing info
    return {
      hasInfo: true,
      billingInfo: billingInfo
    };

  } catch (error) {
    console.error('[BillingInfo] Check error:', error);
    const { t } = getBillingI18n();
    return {
      hasInfo: false,
      message: t('billingCheckErrorMessage', 'Hiba történt a számlázási adatok ellenőrzésekor.')
    };
  }
}

// ===== CUSTOMER TYPE CHANGE HANDLER =====
function handleCustomerTypeChange(radio) {
  const taxNumberContainer = document.getElementById('tax-number-container');
  if (!taxNumberContainer) return;
  
  // Toggle tax number field visibility
  if (radio.value === 'business') {
    taxNumberContainer.classList.remove('hidden');
  } else {
    taxNumberContainer.classList.add('hidden');
  }
  
  // Update visual state of both radio button containers
  const allLabels = radio.closest('form').querySelectorAll('input[name="customerType"]');
  allLabels.forEach(input => {
    const label = input.closest('label');
    const checkmark = label.querySelector('.flex-shrink-0');
    
    if (input.checked) {
      // Selected state
      label.classList.remove('border-gray-200', 'dark:border-gray-700', 'bg-white', 'dark:bg-gray-800', 'hover:border-gray-300', 'dark:hover:border-gray-600');
      label.classList.add('border-indigo-600', 'bg-indigo-50', 'dark:bg-indigo-900/30', 'shadow-sm');
      if (checkmark) checkmark.classList.remove('opacity-0');
    } else {
      // Unselected state
      label.classList.remove('border-indigo-600', 'bg-indigo-50', 'dark:bg-indigo-900/30', 'shadow-sm');
      label.classList.add('border-gray-200', 'dark:border-gray-700', 'bg-white', 'dark:bg-gray-800', 'hover:border-gray-300', 'dark:hover:border-gray-600');
      if (checkmark) checkmark.classList.add('opacity-0');
    }
  });
}

// ===== GLOBÁLIS EXPORT (window scope) =====
if (typeof window !== 'undefined') {
  window.checkBillingInfoBeforePurchase = checkBillingInfoBeforePurchase;
  window.renderBillingInfoForm = renderBillingInfoForm;
  window.handleCustomerTypeChange = handleCustomerTypeChange;
}
