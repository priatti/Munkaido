(function(){
  function prefillFromLast(target) {
    try {
      if (typeof getLatestRecord !== 'function') return;
      const last = getLatestRecord();
      if (!last) return;
      if (target === 'live') {
        const weeklyDriveInput = document.getElementById('liveWeeklyDriveStart');
        if (weeklyDriveInput && last.weeklyDriveEndStr) { weeklyDriveInput.value = last.weeklyDriveEndStr; }
        const kmInput = document.getElementById('liveStartKm');
        if (kmInput && typeof last.kmEnd !== 'undefined' && last.kmEnd !== null) { kmInput.value = String(last.kmEnd); }
        const locationInput = document.getElementById('liveStartLocation');
        if (locationInput && last.endLocation) { locationInput.value = last.endLocation; }
      } else {
        const weeklyDriveInput = document.getElementById('weeklyDriveStart');
        if (weeklyDriveInput && last.weeklyDriveEndStr) { weeklyDriveInput.value = last.weeklyDriveEndStr; }
        const kmInput = document.getElementById('kmStart');
        if (kmInput && typeof last.kmEnd !== 'undefined' && last.kmEnd !== null) { kmInput.value = String(last.kmEnd); }
        const locationInput = document.getElementById('startLocation');
        if (locationInput && last.endLocation) { locationInput.value = last.endLocation; }
      }
    } catch (e) {
      console.warn('Hiba az utolsó értékek betöltésekor:', e);
    }
  }
  window.loadLastValues = function(isForLiveTab = false) { prefillFromLast(isForLiveTab ? 'live' : 'full'); };
})();

function gurigoDebugLog() {
  try {
    if (typeof window.gurigoIsDiagnosticConsole === 'function' && window.gurigoIsDiagnosticConsole()) {
      console.log.apply(console, arguments);
    }
  } catch (_) {}
}

function safeGetElement(id, warnIfMissing = true) {
  const element = document.getElementById(id);
  if (!element && warnIfMissing) { console.warn(`DOM element not found: ${id}`); }
  return element;
}
function safeQuerySelector(selector, warnIfMissing = true) {
  const element = document.querySelector(selector);
  if (!element && warnIfMissing) { console.warn(`DOM element not found: ${selector}`); }
  return element;
}
function safeAddEventListener(elementId, event, handler) {
  const element = safeGetElement(elementId, false);
  if (element) { element.addEventListener(event, handler); }
}
function safeSetTextContent(elementId, text) {
  const element = safeGetElement(elementId, false);
  if (element) { element.textContent = text; }
}
function safeSetValue(elementId, value) {
  const element = safeGetElement(elementId, false);
  if (element) { element.value = value; }
}

let records = [];
let palletRecords = [];
let editingId = null;
let uniqueLocations = [];
let uniquePalletLocations = [];
let currentActiveTab = 'live';

function checkCriticalDOMElements() {
  const criticalElements = ['app', 'auth-screen', 'content-live', 'content-start', 'content-full-day', 'content-list', 'content-settings'];
  const missingElements = criticalElements.filter(id => !document.getElementById(id));
  if (missingElements.length > 0) { console.error('Critical DOM elements missing:', missingElements); return false; }
  return true;
}

function gurigoMainDomReady() {
  if (window.__gurigoMainDomReadyRan) return;
  window.__gurigoMainDomReadyRan = true;
  if (window.GurigoBootMarks && typeof window.GurigoBootMarks.mark === 'function') {
    try { window.GurigoBootMarks.mark('main_dom_ready'); } catch (_) {}
  }
  if (typeof window.handleStripeCheckoutReturnOnLoad === 'function') {
    void window.handleStripeCheckoutReturnOnLoad();
  }

  // === UTM TRACKING INIT (FIRST!) ===
  if (typeof window.utmTracker !== 'undefined' && typeof window.utmTracker.initUTMTracking === 'function') {
    window.utmTracker.initUTMTracking();
  }

  if (!checkCriticalDOMElements()) {
    document.body.innerHTML = '<p>Application Error: Critical components failed to load.</p>';
    return;
  }
  try {
    if (!window.__authScreenInited && typeof initAuthScreen === 'function') { initAuthScreen(); }
    else if (!window.__authScreenInited) { console.error("Kritikus hiba: Az authentikációs modul (auth.js) nem töltődött be."); }

    if (typeof initTheme === 'function') initTheme();
    if (typeof loadSettings === 'function') loadSettings();
    if (typeof initializeFeatureToggles === 'function') initializeFeatureToggles();

    var bootUser = null;
    try {
      bootUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    } catch (_) {}
    var loggedInShell = !!bootUser || document.body.classList.contains('gurigo-app-shell-active');

    // Logged-out: defer heavy feature inits until after login / Phase 3 warm
    function runDeferredShellInits() {
      if (typeof initializePwaInstall === 'function') initializePwaInstall();
      if (typeof initializeSwUpdateNotifications === 'function') initializeSwUpdateNotifications();
      if (typeof initializePalletSettings === 'function') initializePalletSettings();
      if (typeof initDocumentsView === 'function') initDocumentsView();
      if (typeof scheduleHeaderDateChipRender === 'function') scheduleHeaderDateChipRender();
      else if (typeof renderHeaderDateChip === 'function') renderHeaderDateChip();
    }
    if (loggedInShell) {
      runDeferredShellInits();
    } else {
      window.addEventListener('gurigo:phase2ready', function onP2() {
        // Still logged out: only light PWA/update hooks; docs/pallets wait for login
        if (typeof initializePwaInstall === 'function') initializePwaInstall();
        if (typeof initializeSwUpdateNotifications === 'function') initializeSwUpdateNotifications();
      }, { once: true });
      var prevAuth = firebase.auth().onAuthStateChanged(function (u) {
        if (!u) return;
        try { prevAuth(); } catch (_) {}
        runDeferredShellInits();
      });
    }

    document.addEventListener('click', (event) => {
      const settingsWrap = safeQuerySelector('#app-header .header-settings-wrap', false);
      const settingsDropdown = safeGetElement('settings-dropdown', false);
      const insideSettings = (settingsWrap && settingsWrap.contains(event.target))
        || (settingsDropdown && settingsDropdown.contains(event.target));
      if (!insideSettings) { closeSettingsMenu(); }
      if (!event.target.closest('.autocomplete-list')) {
        if (typeof hideAutocomplete === 'function') hideAutocomplete();
      }
    });

    setupEventListeners();

    window.addEventListener('online', function() {
      if (window.currentUser && window.currentUser.uid && typeof window.reconcileWaybillPalletLinks === 'function') {
        var records = typeof window.getPalletRecords === 'function' ? window.getPalletRecords() : [];
        window.reconcileWaybillPalletLinks(window.currentUser.uid, Array.isArray(records) ? records : []).catch(function(e) { console.warn('[Reconcile] waybill-pallet links (online):', e && e.message); });
      }
    });

    // === 2025 Évértékelő (HU-only, 2026-01-15-ig, egyszeri auto-popup) ===
    try {
      if (typeof window.maybeShowYearlySummary2025 === 'function') {
        setTimeout(() => {
          try { window.maybeShowYearlySummary2025(); } catch (_) {}
        }, 600);
      }
    } catch (_) {}

    const settingsLoginButton = document.getElementById('login-button');
    if (settingsLoginButton) { settingsLoginButton.addEventListener('click', signInWithGoogle); }

    const googleView = document.getElementById('settings-google-view');
    const emailView = document.getElementById('settings-email-view');
    const emailLoginForm = document.getElementById('settings-email-login-form');
    const emailRegisterForm = document.getElementById('settings-email-register-form');

    document.getElementById('show-email-forms')?.addEventListener('click', (e) => {
      e.preventDefault(); googleView.classList.add('hidden'); emailView.classList.remove('hidden');
    });
    document.getElementById('show-google-form')?.addEventListener('click', (e) => {
      e.preventDefault(); emailView.classList.add('hidden'); googleView.classList.remove('hidden');
    });
    document.getElementById('show-settings-register-form')?.addEventListener('click', (e) => {
      e.preventDefault(); emailLoginForm.classList.add('hidden'); emailRegisterForm.classList.remove('hidden');
    });
    document.getElementById('show-settings-login-form')?.addEventListener('click', (e) => {
      e.preventDefault(); emailRegisterForm.classList.add('hidden'); emailLoginForm.classList.remove('hidden');
    });

    // Settings – Email login/register buttons now call Firebase directly
    document.getElementById('settings-login-email-btn')?.addEventListener('click', async () => {
      const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
      const email = document.getElementById('settings-email-login').value;
      const password = document.getElementById('settings-password-login').value;
      if (!email || !password) {
        const msg = i18n.authEmailAndPasswordRequired || 'Kérlek add meg az emailt és a jelszót!';
        showCustomAlert?.(msg, 'info'); return;
      }
      if (typeof window.syncFirebaseAuthLanguageWithCurrentLang === 'function') {
        try { window.syncFirebaseAuthLanguageWithCurrentLang(); } catch (_) {}
      }
      try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        showCustomAlert?.(i18n.authLoginSuccess || '✅ Sikeres bejelentkezés!', 'success');
      } catch (error) {
        console.error('Settings login error:', error);
        let msg = i18n.authUnknownError || 'Ismeretlen hiba történt';
        
        switch (error.code) {
          case 'auth/user-not-found': msg = i18n.authUserNotFound || '❌ Nincs ilyen felhasználó. Regisztrálj!'; break;
          case 'auth/wrong-password': msg = i18n.authWrongPassword || '❌ Helytelen jelszó'; break;
          case 'auth/invalid-email': msg = i18n.authInvalidEmailFormat || '❌ Érvénytelen email formátum'; break;
          case 'auth/too-many-requests': msg = i18n.authTooManyRequests || '⏳ Túl sok próbálkozás. Próbáld később.'; break;
          case 'auth/user-disabled': msg = i18n.authUserDisabled || '🚫 Ez a fiók le lett tiltva'; break;
          case 'auth/network-request-failed': msg = i18n.authNoNetwork || '📡 Nincs internetkapcsolat'; break;
          default:
            break;
        }

        if (typeof window.showDetailedError === 'function') {
          window.showDetailedError(error, (i18n.mainAuthContextLogin || 'Bejelentkezés (Beállítások)'), { email: email, userFacing: true });
        } else {
          showCustomAlert?.(msg, 'info');
        }
      }
    });

    document.getElementById('settings-register-email-btn')?.addEventListener('click', async () => {
      const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
      const email = document.getElementById('settings-email-register').value;
      const password = document.getElementById('settings-password-register').value;
      if (!email || !password) {
        const msg = i18n.alertFillAllFields || 'Kérlek tölts ki minden mezőt!';
        showCustomAlert?.(msg, 'info'); return;
      }
      if (password.length < 6) {
        const msg = i18n.authPasswordTooShort || 'A jelszónak legalább 6 karakter hosszúnak kell lennie.';
        showCustomAlert?.(msg, 'info'); return;
      }
      if (typeof window.syncFirebaseAuthLanguageWithCurrentLang === 'function') {
        try { window.syncFirebaseAuthLanguageWithCurrentLang(); } catch (_) {}
      }
      try {
        await firebase.auth().createUserWithEmailAndPassword(email, password);
        showCustomAlert?.(i18n.authRegisterSuccess || '✅ Sikeres regisztráció!', 'success');
      } catch (error) {
        console.error('Settings register error:', error);
        let msg = i18n.authUnknownError || 'Ismeretlen hiba történt';
        const code = error && error.code;
        const isAuthError = code && typeof code === 'string' && code.indexOf('auth/') === 0;

        switch (code) {
          case 'auth/email-already-in-use': msg = i18n.authEmailInUse || 'Ez az e-mail már használatban van.'; break;
          case 'auth/invalid-email':        msg = i18n.authInvalidEmailFormat || '❌ Érvénytelen email formátum'; break;
          case 'auth/weak-password':        msg = i18n.authWeakPassword || 'Gyenge jelszó. (Min. 6 karakter)'; break;
          case 'auth/network-request-failed': msg = i18n.authNoNetwork || '📡 Nincs internetkapcsolat'; break;
          default:
            break;
        }

        // Expected auth hibák: csak felhasználói üzenet, nincs hibajegy
        const expectedAuthCodes = [
          'auth/email-already-in-use',
          'auth/invalid-email',
          'auth/weak-password',
          'auth/missing-password',
          'auth/too-many-requests',
          'auth/network-request-failed'
        ];
        const isExpectedAuthError = isAuthError && expectedAuthCodes.indexOf(code) !== -1;

        if (code === 'auth/email-already-in-use' && typeof window.showEmailAlreadyInUseRegistrationModal === 'function') {
          window.showEmailAlreadyInUseRegistrationModal(email, { source: 'settings' });
        } else if (isExpectedAuthError || typeof window.showDetailedError !== 'function') {
          showCustomAlert?.(msg, 'info');
        } else if (typeof window.showDetailedError === 'function') {
          window.showDetailedError(error, (i18n.mainAuthContextRegister || 'Regisztráció (Beállítások)'), { email: email, userFacing: true });
        }
      }
    });

    const versionSpan = document.getElementById('app-version');
    if (versionSpan && window.APP_INFO && window.APP_INFO.version) {
      versionSpan.textContent = 'v' + window.APP_INFO.version;
    }
    
    // Settings menü verziószám frissítése
    const settingsVersionSpan = document.getElementById('settings-app-version');
    if (settingsVersionSpan && window.APP_INFO && window.APP_INFO.version) {
      settingsVersionSpan.textContent = 'v' + window.APP_INFO.version;
    }

    console.log('[Main] Application initialized successfully');
  } catch (error) {
    console.error('[Main] Error during application initialization:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', gurigoMainDomReady);
} else {
  gurigoMainDomReady();
}

async function renderApp() {
  if (window.GurigoBootMarks && typeof window.GurigoBootMarks.mark === 'function') {
    try { window.GurigoBootMarks.mark('render_app_start'); } catch (_) {}
  }
  if(typeof applyFeatureToggles === 'function') applyFeatureToggles();
  if(typeof updateUniqueLocations === 'function') updateUniqueLocations();
  if(typeof updateUniquePalletLocations === 'function') updateUniquePalletLocations();
  if(typeof initAllAutocomplete === 'function') initAllAutocomplete();
  if(typeof renderLiveTabView === 'function') renderLiveTabView();
  // v6.03.18 Fix #4: elsőként betöltjük a records-ot, hogy a renderStartTab már kész adattal fusson
  if (typeof ensureRecordsLoaded === 'function') {
    try { await ensureRecordsLoaded(); } catch(_) {}
  }
  if(typeof renderStartTab === 'function') renderStartTab();
  if(typeof renderRecords === 'function') renderRecords();
  if(typeof renderSummary === 'function') renderSummary();
  if (safeGetElement('content-stats', false)?.offsetParent !== null && typeof renderStats === 'function') renderStats();
  if (safeGetElement('content-tachograph', false)?.offsetParent !== null && typeof renderTachographAnalysis === 'function') renderTachographAnalysis();
  if (window._palletsLoaded && safeGetElement('content-pallets', false)?.offsetParent !== null && typeof renderPalletRecords === 'function') renderPalletRecords();
  if(typeof updateAllTexts === 'function') updateAllTexts();
  if (window.GurigoBootMarks && typeof window.GurigoBootMarks.mark === 'function') {
    try { window.GurigoBootMarks.mark('render_app_end'); } catch (_) {}
  }
}

function showTab(tabName) {
  // Nincs vendég mód: kijelentkezett állapotban a navigáció nem futtathat app nézeteket,
  // helyette a teljes login állapotot állítjuk vissza.
  var showTabAuthUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
  if (!showTabAuthUser || (window.GurigoAuthSession && typeof window.GurigoAuthSession.isSigningOut === 'function' && window.GurigoAuthSession.isSigningOut())) {
    console.log('[Navigation] showTab blocked (no authenticated user):', tabName);
    if (typeof window.renderLoggedOutState === 'function') window.renderLoggedOutState();
    return;
  }
  // Phase 3: ensure feature modules for this tab before rendering
  if (window.GurigoBoot && typeof window.GurigoBoot.ensureFeaturesForTab === 'function') {
    window.__gurigoTabFeat = window.__gurigoTabFeat || {};
    var featState = window.__gurigoTabFeat[tabName];
    if (featState === 'loading') return;
    if (featState !== 'ready') {
      window.__gurigoTabFeat[tabName] = 'loading';
      window.GurigoBoot.ensureFeaturesForTab(tabName).then(function () {
        window.__gurigoTabFeat[tabName] = 'ready';
        showTab(tabName);
      }).catch(function (err) {
        console.warn('[Boot] ensureFeaturesForTab failed:', tabName, err);
        window.__gurigoTabFeat[tabName] = 'ready';
        showTab(tabName);
      });
      return;
    }
  }
  if (tabName === 'waybill' && typeof window.canAccessWaybill === 'function' && !window.canAccessWaybill()) {
    return;
  }
  if (tabName === 'vehicles' && typeof window.canAccessVehicles === 'function' && !window.canAccessVehicles()) {
    var vehiclesI18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(vehiclesI18n.vehiclesNotAvailable || 'A Járművek modul jelenleg nem elérhető a fiókodhoz.', 'info', function () {
        showTab('live');
      });
    } else {
      showTab('live');
    }
    return;
  }
  currentActiveTab = tabName;
  if (tabName === 'full-day' && !editingId) {
    if(typeof resetEntryForm === 'function') resetEntryForm();
    if(typeof loadLastValues === 'function') loadLastValues();
    const dateInput = safeGetElement('date', false);
    if (dateInput && !dateInput.value) { dateInput.value = new Date().toISOString().split('T')[0]; }
    if (typeof window.FullDayVehicleSegments !== 'undefined' && window.FullDayVehicleSegments.isActive()) {
      if (typeof window.FullDayVehicleSegments.syncVisibility === 'function') {
        window.FullDayVehicleSegments.syncVisibility();
      }
    } else if (typeof window.EntryVehicleField !== 'undefined' && typeof window.EntryVehicleField.initEntryVehicleField === 'function') {
      window.EntryVehicleField.initEntryVehicleField({ record: null });
    }
  }
  if (tabName === 'pallets') {
    (async function () {
      const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
      const container = document.getElementById('palletRecordsContainer');
      if (window.currentUser && typeof window.ensurePalletsLoaded === 'function' && !window._palletsLoaded) {
        if (container && !window._palletsLoading) {
          container.innerHTML = '<p class="text-center text-gray-500 py-4">' + (i18n.loading || 'Betöltés...') + '</p>';
        }
        try { await window.ensurePalletsLoaded(); } catch (_) {}
      }
      if (typeof renderPalletRecords === 'function') renderPalletRecords();
      if (typeof window.applyPalletWaybillPrefill === 'function') window.applyPalletWaybillPrefill();
    })();
  }
  if (tabName === 'report') {
    (async function () {
      try {
        const monthSel = document.getElementById('monthSelector');
        const monthVal = monthSel && monthSel.value
          ? monthSel.value
          : (new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0'));
        const year = String(monthVal).split('-')[0];
        if (typeof window.ensureReportYearNoteDaysLoaded === 'function') {
          await window.ensureReportYearNoteDaysLoaded(year);
        }
      } catch (_) {}
      if (typeof initMonthlyReport === 'function') initMonthlyReport();
    })();
  }
  if (tabName === 'list') { 
    if (typeof ensureRecordsLoaded === 'function') { try { ensureRecordsLoaded(); } catch(_) {} }
    if (typeof renderRecords === 'function') renderRecords();
    // Szerverről frissítés (cache/részleges adat ellen – Android/Safari hiányzó bejegyzések javítás)
    if (typeof window.refreshRecordsFromServer === 'function') { window.refreshRecordsFromServer().catch(function() {}); }
  }
  if (tabName === 'summary') { if (typeof renderSummary === 'function') renderSummary(); }
  if (tabName === 'stats') { if (typeof setStatsView === 'function') { setStatsView('daily'); } }
  if (tabName === 'tachograph') { if (typeof renderTachographAnalysis === 'function') renderTachographAnalysis(); }
  if (tabName === 'help') { if (typeof renderHelp === 'function') renderHelp(); }
  if (tabName === 'subscription') { if (typeof renderSubscriptionInfo === 'function') renderSubscriptionInfo(); }
  if (tabName === 'settings') {
    if (window.AccountDeletion && typeof window.AccountDeletion.loadDeletionStatusAndRender === 'function') {
      try {
        window.AccountDeletion.loadDeletionStatusAndRender('account-deletion-status');
      } catch (e) {
        console.warn('[Settings] Account deletion status load failed:', e);
      }
    }
  }
  if (tabName === 'referral') { if (typeof window.initReferralSection === 'function') window.initReferralSection(); }
  if (tabName === 'start') {
    // v6.03.22 Fix: a 'start' fülre váltáskor biztosítjuk, hogy a records be legyen töltve,
    // különben a `loadLastValuesForLiveTab` `lastRecord = null` miatt korai return-nel üresen
    // hagyja a kezdő km / kezdő hely / heti vezetés mezőket. A `refreshRecordsFromServer`
    // sikeres lefutása `records:updated` eventet dispatch-el → a Start tab újrarenderelődik
    // és a `!kmInput.value` guard alatt feltöltődik a hiányzó kezdő km érték.
    if (typeof ensureRecordsLoaded === 'function') { try { ensureRecordsLoaded(); } catch(_) {} }
    if (typeof renderStartTab === 'function') renderStartTab();
    if (typeof window.refreshRecordsFromServer === 'function') { window.refreshRecordsFromServer().catch(function() {}); }
  }
  if (tabName === 'live') { if (typeof renderLiveTabView === 'function') renderLiveTabView(); }
  if (tabName === 'whatsNew') { if (typeof renderWhatsNewList === 'function') renderWhatsNewList(); }
  if (tabName === 'documents') { if (typeof window.refreshDocumentsView === 'function') { try { window.refreshDocumentsView(); } catch(_) {} } }
  if (tabName === 'documentsManager') { if (typeof window.renderDocumentsManager === 'function') { try { window.renderDocumentsManager(); } catch(_) {} } }
  if (tabName === 'waybill') {
    if (typeof renderWaybillTab === 'function') {
      try { renderWaybillTab(); } catch (e) {
        console.error('[Waybill] showTab render error:', e);
        var wb = document.getElementById('content-waybill');
        if (wb) wb.innerHTML = '<p class="p-4 text-red-600 dark:text-red-400">Menetlevél hiba: ' + (e && (e.message || String(e))) + '</p>';
      }
    }
  }
  if (tabName === 'vehicles') {
    if (typeof renderVehiclesTab === 'function') {
      try { renderVehiclesTab(false); } catch (e) {
        console.error('[Vehicles] showTab render error:', e);
        var vc = document.getElementById('content-vehicles');
        if (vc) vc.innerHTML = '<p class="p-4 text-red-600 dark:text-red-400">Járművek hiba: ' + (e && (e.message || String(e))) + '</p>';
      }
    }
  }
  if (tabName === 'fueling') {
    if (typeof renderFuelingTab === 'function') {
      try { renderFuelingTab(false); } catch (e) {
        console.error('[Fueling] showTab render error:', e);
        var fc = document.getElementById('content-fueling');
        if (fc) fc.innerHTML = '<p class="p-4 text-red-600 dark:text-red-400">Tankolás hiba: ' + (e && (e.message || String(e))) + '</p>';
      }
    }
  }
  if (tabName === 'settings') {
    if (typeof loadSettings === 'function') {
      try { loadSettings(); } catch (_) {}
    } else if (typeof window.updateIosDebugToolsSectionVisibility === 'function') {
      try { window.updateIosDebugToolsSectionVisibility(); } catch (_) {}
    }
  }

  // Vezetési idő mód frissítése tab váltáskor
  if (tabName === 'full-day' || tabName === 'start') {
    if (typeof updateDriveTimeInputVisibility === 'function') {
      const savedMode = localStorage.getItem('drivingTimeMode') || 'weekly';
      updateDriveTimeInputVisibility(savedMode);
    }
  }
  
  document.querySelectorAll('[id^="content-"]').forEach(c => c.classList.add('hidden'));
  const contentTab = safeGetElement(`content-${tabName}`, false);
  if (contentTab) {
    contentTab.classList.remove('hidden');
    if (tabName === 'about') {
      try { contentTab.scrollIntoView({ block: 'start' }); window.scrollTo(0, 0); } catch(_) {}
    }
  }
  closeSettingsMenu();
  if (typeof updateAllTexts === 'function') {
    try { updateAllTexts(); } catch (e) {
      console.warn('[Main] updateAllTexts after showTab:', e && (e.message || String(e)));
    }
  }
  if (window.GurigoAnalytics && typeof window.GurigoAnalytics.trackTab === 'function') {
    try { window.GurigoAnalytics.trackTab(tabName); } catch (_) {}
  }
}

function closeSettingsMenu() {
  const dropdown = safeGetElement('settings-dropdown', false);
  if (dropdown) dropdown.classList.add('hidden');
}

function openSettingsPalletSection() {
  if (typeof window.showTab !== 'function') return;
  window.showTab('settings');
  var scrollToPallet = function () {
    var el = document.getElementById('settings-pallet-section');
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_) {
      try { el.scrollIntoView(true); } catch (_) {}
    }
  };
  requestAnimationFrame(function () {
    requestAnimationFrame(scrollToPallet);
  });
}

function toggleSettingsMenu() {
  const dropdown = safeGetElement('settings-dropdown', false);
  if (!dropdown) return;
  dropdown.classList.toggle('hidden');
  if (!dropdown.classList.contains('hidden')) {
    const inner = dropdown.querySelector('.p-2');
    if (inner) inner.scrollTop = 0;
  }
}

function updateDisplays() {
  if (typeof translations === 'undefined' || typeof currentLang === 'undefined') return;
  const i18n = translations[currentLang];
  const nightLabel = (typeof getNightShiftLabel === 'function')
    ? getNightShiftLabel(i18n.nightWorkDisplay)
    : (i18n.nightWorkDisplay || 'Éjszakai idő');
  // P0: date kötelező a calculateWorkMinutes / calculateNightWorkMinutes híváshoz (time.js 0-t ad date nélkül)
  const dateEl = safeGetElement('date', false);
  const dateStr = (dateEl && dateEl.value) ? dateEl.value : (typeof getNowLocalDateInputValue === 'function' ? getNowLocalDateInputValue() : new Date().toISOString().slice(0, 10));
  const startTime = safeGetElement('startTime')?.value;
  const endTime = safeGetElement('endTime')?.value;
  const workMinutes = calculateWorkMinutes(startTime, endTime, dateStr);
  safeSetTextContent('workTimeDisplay', workMinutes > 0 ? `${i18n.workTimeDisplay}: ${formatDuration(workMinutes)}` : '');
  const nightMinutes = calculateNightWorkMinutes(startTime, endTime, dateStr);
  safeSetTextContent('nightWorkDisplay', nightMinutes > 0 ? `${nightLabel}: ${formatDuration(nightMinutes)}` : '');
  
  // Vezetési idő számítása mód szerint
  const drivingTimeMode = localStorage.getItem('drivingTimeMode') || 'weekly';
  let driveMinutes = 0;
  if (drivingTimeMode === 'weekly' || drivingTimeMode === 'biweekly') {
    driveMinutes = Math.max(0, parseTimeToMinutes(safeGetElement('weeklyDriveEnd')?.value) - parseTimeToMinutes(safeGetElement('weeklyDriveStart')?.value));
  } else {
    driveMinutes = parseTimeToMinutes(safeGetElement('dailyDriveTime')?.value);
  }
  safeSetTextContent('driveTimeDisplay', driveMinutes > 0 ? `${i18n.driveTimeTodayDisplay}: ${formatDuration(driveMinutes)}` : '');
  
  try {
    if (typeof window.syncVhSplitSundayDisplay === 'function') {
      window.syncVhSplitSundayDisplay();
    }
  } catch (_) {}

  const kmDriven = (window.FullDayVehicleSegments && window.FullDayVehicleSegments.isActive())
    ? (function () {
        if (typeof window.FullDayVehicleSegments.updateTotalDisplay === 'function') {
          window.FullDayVehicleSegments.updateTotalDisplay();
        }
        return null;
      })()
    : Math.max(0, (parseFloat(safeGetElement('kmEnd')?.value) || 0) - (parseFloat(safeGetElement('kmStart')?.value) || 0));
  if (!(window.FullDayVehicleSegments && window.FullDayVehicleSegments.isActive())) {
    safeSetTextContent('kmDisplay', kmDriven > 0 ? `${i18n.kmDrivenDisplay}: ${kmDriven} km` : '');
  }
}

async function runNightWorkRecalculation() {
  const recalcKey = (typeof getNightShiftRecalcKey === 'function')
    ? getNightShiftRecalcKey()
    : 'nightWorkRecalculated_v20_05';
  if (localStorage.getItem(recalcKey)) { return; }
  if (typeof translations === 'undefined' || typeof currentLang === 'undefined') return;
  const i18n = translations[currentLang];
  console.log(i18n.logRecalculatingNightWork);
  // JAVÍTVA: records undefined check
  if (!records || !Array.isArray(records)) {
    console.warn('[NightWorkRecalc] Records not available, skipping recalculation');
    return;
  }
  let updatedCount = 0;
  records = records.map(record => {
    const recordDate = record.endDate || record.date;
    const newNightWorkMinutes = calculateNightWorkMinutes(record.startTime, record.endTime, recordDate);
    if (record.nightWorkMinutes !== newNightWorkMinutes) {
      updatedCount++;
      return { ...record, nightWorkMinutes: newNightWorkMinutes };
    }
    return record;
  });
  if (updatedCount > 0 && currentUser) {
    if (typeof db !== 'undefined') {
      const batch = db.batch();
      records.forEach(record => {
        const docRef = db.collection('users').doc(currentUser.uid).collection('records').doc(String(record.id));
        batch.update(docRef, { nightWorkMinutes: record.nightWorkMinutes });
      });
      await batch.commit();
    }
  } else if (updatedCount > 0) {
    localStorage.setItem('workRecords', JSON.stringify(records));
  }
  localStorage.setItem(recalcKey, 'true');
  console.log(`${updatedCount} ${i18n.logEntriesUpdated}`);
}

function renderLiveTabView() {
  if (typeof window.renderOverviewPaymentProblemBanner === 'function') {
    try { window.renderOverviewPaymentProblemBanner(); } catch (_) {}
  }
  if (typeof renderTachographStatusCard === 'function') renderTachographStatusCard();
  if (typeof renderTachoHelperCards === 'function') renderTachoHelperCards();
  if (typeof renderDashboard === 'function') renderDashboard();
  try { if (typeof renderMobilityPackagePromptCard === 'function') renderMobilityPackagePromptCard(); } catch (_) {}
  try { if (typeof renderTwoReducedWeeklyRestCard === 'function') renderTwoReducedWeeklyRestCard(); } catch (_) {}
  try { if (typeof render90hWeekendRestCard === 'function') render90hWeekendRestCard(); } catch (_) {}
  try { if (typeof window.weeklyRestCompensationRender === 'function') window.weeklyRestCompensationRender(); } catch (_) {}
  try { if (typeof window.renderTachographViolationsCard === 'function') window.renderTachographViolationsCard(); } catch (_) {}
}

function renderDashboard() {
  if (typeof translations === 'undefined' || typeof currentLang === 'undefined') return;
  const i18n = translations[currentLang];
  const container = safeGetElement('dashboard-cards');
  if (!container) return;
  const now = new Date();
  const thisWeek = calculateSummaryForDateRange(getWeekRange(now));
  const lastWeek = calculateSummaryForDateRange(getWeekRange(now, -1));
  const thisMonth = calculateSummaryForMonth(new Date());
  const cards = [
    { labelKey: 'dashboardDriveThisWeek', value: formatDuration(thisWeek.driveMinutes), color: 'blue' },
    { labelKey: 'dashboardWorkThisWeek', value: formatDuration(thisWeek.workMinutes), color: 'green' },
    { labelKey: 'dashboardDistanceThisMonth', value: `${thisMonth.kmDriven} km`, color: 'orange' },
    { labelKey: 'dashboardDistanceLastWeek', value: `${lastWeek.kmDriven} km`, color: 'indigo' }
  ];
  container.innerHTML = cards.map(card => `
    <div class="bg-${card.color}-50 dark:bg-${card.color}-900/50 border border-${card.color}-200 dark:border-${card.color}-800 rounded-lg p-3 text-center">
      <p class="text-xs text-${card.color}-700 dark:text-${card.color}-200 font-semibold">${i18n[card.labelKey]}</p>
      <p class="text-lg font-bold text-${card.color}-800 dark:text-${card.color}-100 mt-1">${card.value}</p>
    </div>
  `).join('');
}

function setupEventListeners() {
  ['date', 'startTime', 'endTime', 'weeklyDriveStart', 'weeklyDriveEnd', 'dailyDriveTime', 'vhMondayDriveTime', 'kmStart', 'kmEnd', 'compensationTime'].forEach(id => {
    safeAddEventListener(id, 'input', updateDisplays);
  });
  ['date', 'startTime', 'endTime', 'weeklyDriveStart', 'weeklyDriveEnd', 'dailyDriveTime', 'vhMondayDriveTime'].forEach(id => {
    safeAddEventListener(id, 'change', updateDisplays);
  });
  // Pallet 1:1 button
  safeAddEventListener('pallet-1to1-btn', 'click', () => { if (typeof copyPalletOneToOne === 'function') copyPalletOneToOne(); });
  safeAddEventListener('stats-view-daily', 'click', () => { if (typeof setStatsView === 'function') setStatsView('daily'); });
  safeAddEventListener('stats-view-monthly', 'click', () => { if (typeof setStatsView === 'function') setStatsView('monthly'); });
  safeAddEventListener('stats-view-yearly', 'click', () => { if (typeof setStatsView === 'function') setStatsView('yearly'); });
  safeAddEventListener('stats-prev', 'click', () => { if (typeof navigateStats === 'function') navigateStats(-1); });
  safeAddEventListener('stats-next', 'click', () => { if (typeof navigateStats === 'function') navigateStats(1); });
  safeAddEventListener('autoExportSelector', 'change', (e) => {
    if (typeof translations === 'undefined' || typeof currentLang === 'undefined') return;
    const i18n = translations[currentLang];
    localStorage.setItem('autoExportFrequency', e.target.value);
    if (e.target.value !== 'never') {
      localStorage.setItem('lastAutoExportDate', new Date().toISOString());
      if (typeof showCustomAlert === 'function') showCustomAlert(i18n.autoBackupOn, 'success');
    } else {
      if (typeof showCustomAlert === 'function') showCustomAlert(i18n.autoBackupOff, 'info');
    }
  });
}

window.renderApp = renderApp;
window.__gurigoShowTabImpl = showTab;
window.showTab = showTab;
window.navigateToTab = showTab;
window.openSettingsPalletSection = openSettingsPalletSection;
window.toggleSettingsMenu = toggleSettingsMenu;
window.closeSettingsMenu = closeSettingsMenu;
window.updateDisplays = updateDisplays;
window.runNightWorkRecalculation = runNightWorkRecalculation;
window.renderLiveTabView = renderLiveTabView;
window.renderDashboard = renderDashboard;

// Live overview + summary refresh whenever records change
window.addEventListener('records:updated', () => {
  try { if (typeof window.lastTachographAnalysis !== 'undefined') window.lastTachographAnalysis = []; } catch(_) {}
  try { if (typeof renderLiveTabView === 'function') renderLiveTabView(); } catch(_) {}
  try { if (typeof window.refreshOverviewPaymentProblemBanner === 'function') window.refreshOverviewPaymentProblemBanner(); } catch(_) {}
  try { if (typeof renderSummary === 'function') renderSummary(); } catch(_) {}
  try { if (typeof window.renderTachographViolationsCard === 'function') window.renderTachographViolationsCard(); } catch(_) {}
  // v6.03.18 Fix #2: indítás ablak kezdő értékeinek frissítése records változáskor
  try { if (typeof renderStartTab === 'function') renderStartTab(); } catch(_) {}
});

function documentsDemoAction(action) {
  try {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
    const msg = i18n.mainDocumentsInDevelopment || i18n.documentsActionComingSoon || 'Document management is still under development.';
    if (typeof translations === 'undefined' || typeof currentLang === 'undefined') {
      alert(msg);
      return;
    }
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(msg, 'info');
    } else {
      alert(msg);
    }
  } catch (e) {
    try { console.warn('[Documents] demo action error:', e); } catch (_) {}
  }
}

// === PASSWORD VISIBILITY TOGGLE ===

// === PASSWORD STRENGTH CHECKER ===
function checkPasswordStrength(password) {
  const container = document.getElementById('password-strength-container');
  const bar = document.getElementById('password-strength-bar');
  const text = document.getElementById('password-strength-text');

  if (!password) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');

  let strength = 0;
  let feedback = '';

  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
    ? (translations[currentLang] || {})
    : {};

  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 15;

  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

  bar.className = 'h-full transition-all duration-300';
  if (strength < 40) {
    bar.classList.add('strength-weak');
    feedback = i18n.passwordStrengthWeak || '❌ Gyenge jelszó';
    text.className = 'text-xs mt-1 text-red-600 dark:text-red-400';
  } else if (strength < 70) {
    bar.classList.add('strength-medium');
    feedback = i18n.passwordStrengthMedium || '⚠️ Közepes erősségű';
    text.className = 'text-xs mt-1 text-yellow-600 dark:text-yellow-400';
  } else {
    bar.classList.add('strength-strong');
    feedback = i18n.passwordStrengthStrong || '✅ Erős jelszó';
    text.className = 'text-xs mt-1 text-green-600 dark:text-green-400';
  }

  bar.style.width = strength + '%';
  text.textContent = feedback;
}

// === ENHANCED LOGIN WITH LOADING STATE ===

// === ENHANCED REGISTRATION WITH LOADING STATE ===

// === FORGOT PASSWORD ===

// === AUTO-FOCUS ON VIEW CHANGE ===

// === IMPROVED GUEST MODE ===

// === GLOBAL EXPORT ===
window.checkPasswordStrength = checkPasswordStrength;

// === CACHE INVALIDATION & SERVICE WORKER UPDATE ===
(async function() {
  try {
    // Töröljük a régi cache-eket
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => 
        name.includes('v4.01.0') || 
        name.includes('v4.01.1') && !name.includes('v4.01.19') ||
        name.startsWith('gurigo-v4.01.0') ||
        name.startsWith('gurigo-v4.01.1')
      );
      
      if (oldCaches.length > 0) {
        console.log('[Cache Clean] Removing old caches:', oldCaches);
        await Promise.all(oldCaches.map(name => caches.delete(name)));
      }
    }
    
    // Service Worker frissítés
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          
          // Figyelés a SW frissítésre
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SW_UPDATED') {
              console.log('[SW Update] New version available:', event.data.version);
              // Opcionális: reload javaslat a felhasználónak
            }
          });
        }
      } catch(e) {
        console.warn('[SW Update] Failed:', e);
      }
    }
  } catch(e) {
    console.warn('[Cache Clean] Error:', e);
  }
})();

/** Korai kedvezmény modal — csak app boot + jogi flow után (ne jelöljön „megtekintett” rejtve). */
function isEarlyBirdPromoAuthActive() {
  try {
    if (window.GurigoAuthSession && window.GurigoAuthSession.isSigningOut()) return false;
    if (typeof firebase === 'undefined' || !firebase.auth) return false;
    const authUser = firebase.auth().currentUser;
    if (!authUser || !authUser.uid) return false;
    if (window.currentUser && window.currentUser.uid && window.currentUser.uid !== authUser.uid) return false;
    return true;
  } catch (_) {
    return false;
  }
}

function scheduleEarlyBirdPromoModalCheck() {
  if (!isEarlyBirdPromoAuthActive()) return;
  if (typeof window.canShowEarlyBirdOffer === 'function' && !window.canShowEarlyBirdOffer()) {
    if (typeof window.installEarlyBirdNativeIosGuards === 'function') {
      window.installEarlyBirdNativeIosGuards();
    }
    return;
  }
  if (typeof window.checkAndShowPromoModal !== 'function') return;
  if (window.__gurigoEarlyBirdPromoModalTimer) return;

  window.__gurigoEarlyBirdPromoModalTimer = setTimeout(async function () {
    window.__gurigoEarlyBirdPromoModalTimer = null;
    if (!isEarlyBirdPromoAuthActive()) return;
    if (window.__termsConsentModalOpen) {
      scheduleEarlyBirdPromoModalCheck();
      return;
    }
    var appEl = document.getElementById('app');
    if (appEl && appEl.classList.contains('hidden')) {
      scheduleEarlyBirdPromoModalCheck();
      return;
    }
    try {
      const promoUid = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser)
        ? firebase.auth().currentUser.uid
        : null;
      if (
        promoUid &&
        isEarlyBirdPromoAuthActive() &&
        typeof loadUserSubscription === 'function' &&
        (!window.currentUserSubscription || !window.currentUserSubscription.promoState)
      ) {
        await loadUserSubscription(promoUid);
      }
      if (!isEarlyBirdPromoAuthActive()) return;
      await window.checkAndShowPromoModal();
    } catch (promoError) {
      console.warn('[PromoModal] Error checking promo eligibility:', promoError && (promoError.message || promoError));
    }
  }, 800);
}
window.scheduleEarlyBirdPromoModalCheck = scheduleEarlyBirdPromoModalCheck;

// ===== Auth flow + country confirm =====
firebase.auth().onAuthStateChanged(async function(user){
  if (typeof window.updateCompanyJoinSectionVisibility === 'function') {
    try { window.updateCompanyJoinSectionVisibility(); } catch (_) {}
  }
  if (typeof window.updateIosDebugToolsSectionVisibility === 'function') {
    try { window.updateIosDebugToolsSectionVisibility(); } catch (_) {}
  }
  if (typeof window.awaitAuthBootIfNeeded === 'function') {
    await window.awaitAuthBootIfNeeded();
    user = firebase.auth().currentUser;
  }
  if (user && window.GurigoBoot && typeof window.GurigoBoot.whenReady === 'function') {
    try { await window.GurigoBoot.whenReady('phase2'); } catch (_) {}
  }
  if (!user) {
    if (window.__oauthRedirectBootPending === true || window.__iosRedirectPending === true) {
      console.log('[auth][ui] main.js defer login (redirect boot pending)');
      return;
    }
    console.log('[auth][ui] main.js rendering login (no user)');
    if (typeof window.renderLoggedOutState === 'function') {
      window.renderLoggedOutState();
    } else {
      var auth = document.getElementById('auth-screen'); if (auth) auth.classList.remove('hidden');
      var app = document.getElementById('app'); if (app) app.classList.add('hidden');
    }
    return;
  }
  // === OFFLINE HIDEG INDULÁS: ne blokkoljuk a profile/country/legal flow-val ===
  // Ha nincs hálózat, az appot azonnal megjelenítjük; a handleAuthStateChange (auth.js) már
  // betölti a cache-ből az adatokat. A profile/ország/jogi ellenőrzés online folytatódhat.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    var authOff = document.getElementById('auth-screen'); if (authOff) authOff.classList.add('hidden');
    var appOff = document.getElementById('app'); if (appOff) appOff.classList.remove('hidden');
    if (typeof window.setAppShellChromeVisible === 'function') window.setAppShellChromeVisible(true);
    if (typeof renderApp === 'function') renderApp();
    scheduleEarlyBirdPromoModalCheck();
    return;
  }
  try {
    var profile = (typeof ensureUserProfile==='function') ? await ensureUserProfile(user.uid) : null;

    // === KLIENS / PLATFORM KÖVETÉS (Admin diagnosztika) ===
    // Bejelentkezéskor / app induláskor frissítjük a clientInfo-t. A modul 24 órás
    // throttle-t alkalmaz, így oldalbetöltésenként nem termelünk felesleges írást.
    if (typeof updateClientInfo === 'function') {
      try { updateClientInfo(user.uid); } catch (_) {}
    }

    // === TRIAL SOFT RESET - Check and activate pending reset on login ===
    if (typeof checkAndActivatePendingTrialReset === 'function') {
      try {
        const resetResult = await checkAndActivatePendingTrialReset(user.uid);
        if (resetResult.activated) {
          console.log('[TrialReset] Activated on login:', resetResult);
        }
      } catch (resetError) {
        console.error('[TrialReset] Error checking pending reset:', resetError);
      }
    }

    // === AUTO COUNTRY DETECT INTEGRATION ===
    gurigoDebugLog('[DEBUG] Country check: profile=', profile);
    if (!profile || !profile.countryConfirmed || !profile.countryCode) {
      gurigoDebugLog('[DEBUG] Country NOT confirmed - showing modal');
      if (typeof autoSetCountryForNewUser === 'function') {
        const autoOk = await autoSetCountryForNewUser(user.uid);
        if (!autoOk) {
          const guess = (typeof detectUserCountry === 'function') ? await detectUserCountry() : (profile && profile.countryCode ? profile.countryCode : 'HU');
          openCountryModal(guess, true);
          return; // várjuk a felhasználói megerősítést
        }
      } else {
        openCountryModal(profile && profile.countryCode ? profile.countryCode : 'HU', false);
        return;
      }
    }
    gurigoDebugLog('[DEBUG] Country confirmed - proceeding to legal check');
    // === END AUTO COUNTRY DETECT ===

    // === LEGAL TERMS ACCEPTANCE CHECK ===
    gurigoDebugLog('[DEBUG] === LEGAL CHECK START ===');
    try {
      var legalInfo = (window.LEGAL_INFO) || (window.APP_INFO ? { currentVersion: window.APP_INFO.legalVersion } : {});
      var requiredVersion = legalInfo.currentVersion || null;
      gurigoDebugLog('[DEBUG] Required legal version:', requiredVersion);

      // Ha nincs beállítva jogi verzió, nem kényszerítünk elfogadást
      if (!requiredVersion) {
        var auth = document.getElementById('auth-screen'); if (auth) auth.classList.add('hidden');
        var app = document.getElementById('app'); if (app) app.classList.remove('hidden');
        if (typeof window.setAppShellChromeVisible === 'function') window.setAppShellChromeVisible(true);
        if (typeof renderApp === 'function') renderApp();
        scheduleEarlyBirdPromoModalCheck();
        return;
      }

      var alreadyAccepted = false;
      if (typeof window.hasUserAcceptedRequiredLegalVersion === 'function') {
        alreadyAccepted = await window.hasUserAcceptedRequiredLegalVersion(user.uid, requiredVersion, profile);
      } else {
        alreadyAccepted = profile && typeof window.isLegalVersionSatisfied === 'function'
          ? window.isLegalVersionSatisfied(profile.termsLegalVersionAccepted, requiredVersion)
          : (profile && profile.termsLegalVersionAccepted === requiredVersion);
      }
      gurigoDebugLog('[DEBUG] Profile termsLegalVersionAccepted:', profile ? profile.termsLegalVersionAccepted : 'NO PROFILE');
      gurigoDebugLog('[DEBUG] Required version:', requiredVersion);
      gurigoDebugLog('[DEBUG] Already accepted?', alreadyAccepted);

      if (!alreadyAccepted && window.__termsConsentModalOpen) {
        gurigoDebugLog('[DEBUG] Terms modal already open — skip duplicate auth callback');
        return;
      }

      if (!alreadyAccepted) {
        gurigoDebugLog('[DEBUG] NOT accepted - showing modal');
        window.__termsConsentModalOpen = true;
        try {
          if (typeof window.showTermsConsentModal === 'function') {
            gurigoDebugLog('[DEBUG] Calling showTermsConsentModal...');
            await window.showTermsConsentModal({ user: user, profile: profile, requiredVersion: requiredVersion });
            gurigoDebugLog('[DEBUG] Modal accepted!');
            if (typeof window.logTermsAcceptanceForUser === 'function') {
              gurigoDebugLog('[DEBUG] Logging acceptance to Firestore...');
              await window.logTermsAcceptanceForUser(user.uid, profile || {});
              gurigoDebugLog('[DEBUG] Acceptance logged!');
            }
            if (typeof window.rememberTermsAcceptedForSession === 'function') {
              window.rememberTermsAcceptedForSession(user.uid, requiredVersion);
            }
          } else {
            console.error('[DEBUG] showTermsConsentModal is NOT defined!');
          }
        } finally {
          window.__termsConsentModalOpen = false;
        }
      } else {
        gurigoDebugLog('[DEBUG] Already accepted - skipping modal');
      }

      // App megjelenítése (csak ha elfogadta vagy korábban már elfogadta)
      gurigoDebugLog('[DEBUG] Showing app...');
      var authEl = document.getElementById('auth-screen'); if (authEl) authEl.classList.add('hidden');
      var appEl = document.getElementById('app'); if (appEl) appEl.classList.remove('hidden');
      if (typeof window.setAppShellChromeVisible === 'function') window.setAppShellChromeVisible(true);
      if (typeof renderApp === 'function') renderApp();
      scheduleEarlyBirdPromoModalCheck();
      return;
    } catch (termsErr) {
      console.error('Terms acceptance flow error (user rejected or error):', termsErr);
      // Ha a felhasználó elutasította vagy hiba történt, NE jelenítsük meg az appot
      // Auth screen marad látható
      console.log('User rejected terms or error occurred - staying on auth screen');
      return;
    }
    
  } catch (e) { 
    console.error('Country confirm flow error:', e);
    // Offline vagy hálózati hiba: az appot mégis megjelenítjük (korábban bejelentkezett user)
    var authFallback = document.getElementById('auth-screen'); if (authFallback) authFallback.classList.add('hidden');
    var appFallback = document.getElementById('app'); if (appFallback) appFallback.classList.remove('hidden');
    if (typeof window.setAppShellChromeVisible === 'function') window.setAppShellChromeVisible(true);
    if (typeof renderApp === 'function') renderApp();
    scheduleEarlyBirdPromoModalCheck();
  }
});
