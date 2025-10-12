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

document.addEventListener('DOMContentLoaded', () => {
    if (!checkCriticalDOMElements()) {
        document.body.innerHTML = '<p>Application Error: Critical components failed to load.</p>';
        return;
    }
    try {
        if (typeof initAuthScreen === 'function') { initAuthScreen(); } 
        else { console.error("Kritikus hiba: Az authentikációs modul (auth.js) nem töltődött be."); }

        if (typeof initTheme === 'function') initTheme();
        if (typeof loadSettings === 'function') loadSettings();
        if (typeof initializeFeatureToggles === 'function') initializeFeatureToggles();
        if (typeof initializePwaInstall === 'function') initializePwaInstall();
        if (typeof initializePalletSettings === 'function') initializePalletSettings();
        
        document.addEventListener('click', (event) => {
            const settingsContainer = safeQuerySelector('#app-header .flex-1.text-right', false);
            if (settingsContainer && !settingsContainer.contains(event.target)) { closeSettingsMenu(); }
            if (!event.target.closest('.autocomplete-list')) { if (typeof hideAutocomplete === 'function') hideAutocomplete(); }
        });

        setupEventListeners();

        const settingsLoginButton = document.getElementById('login-button');
        if (settingsLoginButton) { settingsLoginButton.addEventListener('click', signInWithGoogle); }

        const googleView = document.getElementById('settings-google-view');
        const emailView = document.getElementById('settings-email-view');
        const emailLoginForm = document.getElementById('settings-email-login-form');
        const emailRegisterForm = document.getElementById('settings-email-register-form');

        document.getElementById('show-email-forms')?.addEventListener('click', (e) => { e.preventDefault(); googleView.classList.add('hidden'); emailView.classList.remove('hidden'); });
        document.getElementById('show-google-form')?.addEventListener('click', (e) => { e.preventDefault(); emailView.classList.add('hidden'); googleView.classList.remove('hidden'); });
        document.getElementById('show-settings-register-form')?.addEventListener('click', (e) => { e.preventDefault(); emailLoginForm.classList.add('hidden'); emailRegisterForm.classList.remove('hidden'); });
        document.getElementById('show-settings-login-form')?.addEventListener('click', (e) => { e.preventDefault(); emailRegisterForm.classList.add('hidden'); emailLoginForm.classList.remove('hidden'); });

        document.getElementById('settings-login-email-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('settings-email-login').value.trim();
    const password = document.getElementById('settings-password-login').value;
    if (!email || !password) { showCustomAlert?.('Kérlek add meg az emailt és a jelszót!', 'info'); return; }
    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        showCustomAlert?.('✅ Sikeres bejelentkezés!', 'success');
    } catch (error) {
        console.error('Settings login error:', error);
        let msg = 'Ismeretlen hiba történt';
        switch (error.code) {
            case 'auth/user-not-found': msg = '❌ Nincs ilyen felhasználó.'; break;
            case 'auth/wrong-password': msg = '❌ Helytelen jelszó.'; break;
            case 'auth/invalid-email': msg = '❌ Érvénytelen email formátum.'; break;
        }
        showCustomAlert?.(msg, 'info');
    }
});
        document.getElementById('settings-register-email-btn')?.addEventListener('click', () => {
            const email = document.getElementById('settings-email-register').value;
            const password = document.getElementById('settings-password-register').value;
            handleEmailRegistration(email, password, password);
        });
        
        const versionSpan = document.getElementById('app-version');
        if (versionSpan && window.APP_INFO && window.APP_INFO.version) {
            versionSpan.textContent = 'v' + window.APP_INFO.version;
        }

        console.log('[Main] Application initialized successfully');
    } catch (error) {
        console.error('[Main] Error during application initialization:', error);
    }
});

function renderApp() {
    if(typeof applyFeatureToggles === 'function') applyFeatureToggles();
    if(typeof updateUniqueLocations === 'function') updateUniqueLocations();
    if(typeof updateUniquePalletLocations === 'function') updateUniquePalletLocations();
    if(typeof initAllAutocomplete === 'function') initAllAutocomplete();
    if(typeof renderLiveTabView === 'function') renderLiveTabView();
    if(typeof renderStartTab === 'function') renderStartTab();
    if(typeof renderRecords === 'function') renderRecords();
    if(typeof renderSummary === 'function') renderSummary();
    if (safeGetElement('content-stats', false)?.offsetParent !== null && typeof renderStats === 'function') renderStats();
    if (safeGetElement('content-tachograph', false)?.offsetParent !== null && typeof renderTachographAnalysis === 'function') renderTachographAnalysis();
    if (safeGetElement('content-pallets', false)?.offsetParent !== null && typeof renderPalletRecords === 'function') renderPalletRecords();
    if(typeof updateAllTexts === 'function') updateAllTexts(); 
}

function showTab(tabName) {
    currentActiveTab = tabName;
    if (tabName === 'full-day' && !editingId) {
        if(typeof resetEntryForm === 'function') resetEntryForm();
        if(typeof loadLastValues === 'function') loadLastValues();
        const dateInput = safeGetElement('date', false);
        if (dateInput && !dateInput.value) { dateInput.value = new Date().toISOString().split('T')[0]; }
    }
    if (tabName === 'pallets') { if (typeof renderPalletRecords === 'function') renderPalletRecords(); }
    if (tabName === 'report') { if (typeof initMonthlyReport === 'function') initMonthlyReport(); }
    if (tabName === 'list') { if (typeof renderRecords === 'function') renderRecords(); }
    if (tabName === 'summary') { if (typeof renderSummary === 'function') renderSummary(); }
    if (tabName === 'stats') { if (typeof setStatsView === 'function') { setStatsView('daily'); } }
    if (tabName === 'tachograph') { if (typeof renderTachographAnalysis === 'function') renderTachographAnalysis(); }
    if (tabName === 'help') { if (typeof renderHelp === 'function') renderHelp(); }
    if (tabName === 'start') { if (typeof renderStartTab === 'function') renderStartTab(); }
    document.querySelectorAll('[id^="content-"]').forEach(c => c.classList.add('hidden'));
    const contentTab = safeGetElement(`content-${tabName}`, false);
    if (contentTab) contentTab.classList.remove('hidden');
    closeSettingsMenu();
    if (typeof updateAllTexts === 'function') updateAllTexts();
}

function closeSettingsMenu() { 
    const dropdown = safeGetElement('settings-dropdown', false);
    if (dropdown) dropdown.classList.add('hidden');
}

function toggleSettingsMenu() { 
    const dropdown = safeGetElement('settings-dropdown', false);
    if (dropdown) dropdown.classList.toggle('hidden');
}

function updateDisplays() {
    if (typeof translations === 'undefined' || typeof currentLang === 'undefined') return;
    const i18n = translations[currentLang];
    const workMinutes = calculateWorkMinutes(safeGetElement('startTime')?.value, safeGetElement('endTime')?.value);
    safeSetTextContent('workTimeDisplay', workMinutes > 0 ? `${i18n.workTimeDisplay}: ${formatDuration(workMinutes)}` : '');
    const nightMinutes = calculateNightWorkMinutes(safeGetElement('startTime')?.value, safeGetElement('endTime')?.value);
    safeSetTextContent('nightWorkDisplay', nightMinutes > 0 ? `${i18n.nightWorkDisplay}: ${formatDuration(nightMinutes)}` : '');
    const driveMinutes = Math.max(0, parseTimeToMinutes(safeGetElement('weeklyDriveEnd')?.value) - parseTimeToMinutes(safeGetElement('weeklyDriveStart')?.value));
    safeSetTextContent('driveTimeDisplay', driveMinutes > 0 ? `${i18n.driveTimeTodayDisplay}: ${formatDuration(driveMinutes)}` : '');
    const kmDriven = Math.max(0, (parseFloat(safeGetElement('kmEnd')?.value) || 0) - (parseFloat(safeGetElement('kmStart')?.value) || 0));
    safeSetTextContent('kmDisplay', kmDriven > 0 ? `${i18n.kmDrivenDisplay}: ${kmDriven} km` : '');
}

async function runNightWorkRecalculation() {
    if (localStorage.getItem('nightWorkRecalculated_v20_05')) { return; }
    if (typeof translations === 'undefined' || typeof currentLang === 'undefined') return;
    const i18n = translations[currentLang];
    console.log(i18n.logRecalculatingNightWork);
    let updatedCount = 0;
    records = records.map(record => {
        const newNightWorkMinutes = calculateNightWorkMinutes(record.startTime, record.endTime);
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
    localStorage.setItem('nightWorkRecalculated_v20_05', 'true');
    console.log(`${updatedCount} ${i18n.logEntriesUpdated}`);
}

function renderLiveTabView() {
    if (typeof renderTachographStatusCard === 'function') renderTachographStatusCard();
    if (typeof renderTachoHelperCards === 'function') renderTachoHelperCards();
    if (typeof renderDashboard === 'function') renderDashboard();
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
    ['startTime', 'endTime', 'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime'].forEach(id => {
        safeAddEventListener(id, 'input', updateDisplays);
    });
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
window.showTab = showTab;
window.toggleSettingsMenu = toggleSettingsMenu;
window.closeSettingsMenu = closeSettingsMenu;
window.updateDisplays = updateDisplays;
window.runNightWorkRecalculation = runNightWorkRecalculation;
window.renderLiveTabView = renderLiveTabView;
window.renderDashboard = renderDashboard;
// === PASSWORD VISIBILITY TOGGLE ===
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    
    if (input.type === 'password') {
        input.type = 'text';
        button.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
            </svg>
        `;
    } else {
        input.type = 'password';
        button.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
        `;
    }
}

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
    
    // Length check
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 15;
    
    // Character variety
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
    
    // Set color and text
    bar.className = 'h-full transition-all duration-300';
    if (strength < 40) {
        bar.classList.add('strength-weak');
        feedback = '❌ Gyenge jelszó';
        text.className = 'text-xs mt-1 text-red-600 dark:text-red-400';
    } else if (strength < 70) {
        bar.classList.add('strength-medium');
        feedback = '⚠️ Közepes erősségű';
        text.className = 'text-xs mt-1 text-yellow-600 dark:text-yellow-400';
    } else {
        bar.classList.add('strength-strong');
        feedback = '✅ Erős jelszó';
        text.className = 'text-xs mt-1 text-green-600 dark:text-green-400';
    }
    
    bar.style.width = strength + '%';
    text.textContent = feedback;
}

// === ENHANCED LOGIN WITH LOADING STATE ===
async function handleEmailLoginSubmit() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const button = document.getElementById('login-button-email');
    
    if (!email || !password) {
        showCustomAlert('Kérlek töltsd ki az összes mezőt!', 'info');
        return;
    }
    
    // Show loading
    button.disabled = true;
    button.innerHTML = '<span class="loading-spinner"></span> Bejelentkezés...';
    
    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        // Success handled by onAuthStateChanged
    } catch (error) {
        console.error("Login error:", error);
        
        let errorMsg = 'Ismeretlen hiba történt';
        switch(error.code) {
            case 'auth/user-not-found':
                errorMsg = '❌ Nincs ilyen felhasználó. Regisztrálj!';
                break;
            case 'auth/wrong-password':
                errorMsg = '❌ Helytelen jelszó';
                break;
            case 'auth/invalid-email':
                errorMsg = '❌ Érvénytelen email formátum';
                break;
            case 'auth/too-many-requests':
                errorMsg = '⏳ Túl sok próbálkozás. Próbáld újra később.';
                break;
            case 'auth/user-disabled':
                errorMsg = '🚫 Ez a fiók le lett tiltva';
                break;
            case 'auth/network-request-failed':
                errorMsg = '📡 Nincs internetkapcsolat';
                break;
        }
        
        showCustomAlert(errorMsg, 'info');
    } finally {
        button.disabled = false;
        button.innerHTML = 'Bejelentkezés';
    }
}

// === ENHANCED REGISTRATION WITH LOADING STATE ===
async function handleEmailRegistrationSubmit() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    const button = document.getElementById('register-button');
    
    if (!email || !password || !passwordConfirm) {
        showCustomAlert('Kérlek töltsd ki az összes mezőt!', 'info');
        return;
    }
    
    if (password !== passwordConfirm) {
        showCustomAlert('❌ A két jelszó nem egyezik!', 'info');
        return;
    }
    
    if (password.length < 6) {
        showCustomAlert('❌ A jelszónak legalább 6 karakter hosszúnak kell lennie.', 'info');
        return;
    }
    
    // Show loading
    button.disabled = true;
    button.innerHTML = '<span class="loading-spinner"></span> Regisztráció...';
    
    try {
        await firebase.auth().createUserWithEmailAndPassword(email, password);
        showCustomAlert('✅ Sikeres regisztráció! Üdvözlünk!', 'success');
    } catch (error) {
        console.error("Registration error:", error);
        
        let errorMsg = 'Ismeretlen hiba történt';
        switch(error.code) {
            case 'auth/email-already-in-use':
                errorMsg = '❌ Ez az email cím már használatban van';
                break;
            case 'auth/invalid-email':
                errorMsg = '❌ Érvénytelen email formátum';
                break;
            case 'auth/weak-password':
                errorMsg = '❌ Túl gyenge jelszó. Használj legalább 6 karaktert!';
                break;
            case 'auth/network-request-failed':
                errorMsg = '📡 Nincs internetkapcsolat';
                break;
        }
        
        showCustomAlert(errorMsg, 'info');
    } finally {
        button.disabled = false;
        button.innerHTML = 'Regisztráció';
    }
}

// === FORGOT PASSWORD ===
document.getElementById('forgot-password-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    
    if (!email) {
        showCustomAlert('⚠️ Kérlek add meg az email címedet a jelszó visszaállításához!', 'info');
        document.getElementById('email').focus();
        return;
    }
    
    try {
        await firebase.auth().sendPasswordResetEmail(email);
        showCustomAlert(
            '✅ Jelszó visszaállító email elküldve!\n\nEllenőrizd a postaládádat (és a spam mappát is).',
            'success'
        );
    } catch (error) {
        console.error("Password reset error:", error);
        
        let errorMsg = 'Hiba történt';
        switch(error.code) {
            case 'auth/user-not-found':
                errorMsg = '❌ Nincs ilyen email cím regisztrálva';
                break;
            case 'auth/invalid-email':
                errorMsg = '❌ Érvénytelen email formátum';
                break;
            default:
                errorMsg = '❌ Nem sikerült elküldeni az emailt. Próbáld újra később.';
        }
        showCustomAlert(errorMsg, 'info');
    }
});

// === AUTO-FOCUS ON VIEW CHANGE ===
document.getElementById('show-register-view')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('register-view').classList.remove('hidden');
    setTimeout(() => document.getElementById('register-email')?.focus(), 100);
});

document.getElementById('show-login-view')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
    setTimeout(() => document.getElementById('email')?.focus(), 100);
});

// === IMPROVED GUEST MODE ===
document.getElementById('guest-mode-button')?.addEventListener('click', () => {
    showCustomAlert(
        '⚠️ Vendég módban az adataid csak ezen az eszközön maradnak.\n\n' +
        'A böngésző gyorsítótárának törlése vagy másik eszköz használata esetén az adatok elvesznek.\n\n' +
        '💡 Biztonságos mentéshez regisztrálj később!',
        'warning',
        () => {
            localStorage.setItem('isGuestMode', 'true');
            handleAuthStateChange(null);
        },
        { 
            confirmText: '✓ Értem, indulhat!',
            confirmClass: 'bg-blue-500 hover:bg-blue-600' 
        }
    );
});

// === GLOBAL EXPORT ===
window.togglePasswordVisibility = togglePasswordVisibility;
window.checkPasswordStrength = checkPasswordStrength;
window.handleEmailLoginSubmit = handleEmailLoginSubmit;
window.handleEmailRegistrationSubmit = handleEmailRegistrationSubmit;