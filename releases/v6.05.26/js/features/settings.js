// =======================================================
// ===== BEÁLLÍTÁSOK (FEATURE) - JAVÍTOTT ===============
// =======================================================

const NIGHT_SHIFT_DEFAULT_START = (typeof DEFAULT_NIGHT_SHIFT_START !== 'undefined')
    ? DEFAULT_NIGHT_SHIFT_START
    : '20:00';
const NIGHT_SHIFT_DEFAULT_END = (typeof DEFAULT_NIGHT_SHIFT_END !== 'undefined')
    ? DEFAULT_NIGHT_SHIFT_END
    : '05:00';
const NIGHT_SHIFT_TIME_PATTERN = /^(\d{2}):(\d{2})$/;

async function uploadLocalSettings() {
    const settingsToSync = {};
    const keysToSync = [
        'userName', 'theme', 'autoExportFrequency', 'language', 'reportLanguage',
        'toggleKm', 'toggleDriveTime', 'togglePallets', 'toggleCompensation', 'toggleTrailerContainer',
        'palletMode', 'customPalletTypes', 'preferredTimezone', 'timezoneWarningDismissed',
        'lastDSTNotification', 'drivingTimeMode', 'fourHandsEnabled', 'reportSettings',
        'toggleMultiPallet', 'defaultDocumentTypeName', 'customDocumentTypes', 'lastAutoExportDate',
        'nightShiftStart', 'nightShiftEnd'
    ];

    keysToSync.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
            settingsToSync[key] = value;
        }
    });

    if (typeof saveSettingsToFirestore === 'function') {
        await saveSettingsToFirestore(settingsToSync);
    }
}

function refreshToggleVisuals() {
    const togglesToRefresh = [
        'toggleKm', 'toggleDriveTime', 'togglePallets', 'toggleCompensation', 'toggleMultiPallet', 'toggleTrailerContainer'
    ];

    togglesToRefresh.forEach(toggleId => {
        const checkbox = document.getElementById(toggleId);
        if (checkbox) {
            const savedState = localStorage.getItem(toggleId) === 'true';
            checkbox.checked = savedState;
            if (typeof updateEnhancedToggleVisuals === 'function') {
                updateEnhancedToggleVisuals(checkbox);
            }
        }
    });
    
    // 4 kézes mód külön kezelése (fourHandsEnabled kulccsal)
    const fourHandsCheckbox = document.getElementById('toggleFourHands');
    if (fourHandsCheckbox) {
        const savedState = localStorage.getItem('fourHandsEnabled') === 'true';
        fourHandsCheckbox.checked = savedState;
        if (typeof updateEnhancedToggleVisuals === 'function') {
            updateEnhancedToggleVisuals(fourHandsCheckbox);
        }
    }
}

// Felhasználói beállítások mentése (pl. név)
function saveSettings() {
    const userNameInput = document.getElementById('userNameInput');
    if (userNameInput) {
        localStorage.setItem('userName', userNameInput.value);
        // Persist display name into profile/info so admin list can read it
        try {
            if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser && typeof db !== 'undefined') {
                const uid = firebase.auth().currentUser.uid;
                db.collection('users').doc(uid).collection('profile').doc('info')
                    .set({ displayName: String(userNameInput.value || ''), updatedAt: (firebase.firestore && firebase.firestore.FieldValue ? firebase.firestore.FieldValue.serverTimestamp() : new Date()) }, { merge: true })
                    .catch(function(e){ try { console.warn('[Settings] profile displayName update failed:', e && e.message ? e.message : e); } catch(_) {} });
            }
        } catch(_) {}
        if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
            const i18n = translations[currentLang];
            if (typeof showCustomAlert === 'function') {
                showCustomAlert(i18n.settingsSaved, 'success');
            }
        }
        if (typeof uploadLocalSettings === 'function') {
            uploadLocalSettings();
        }
    }
}

// Mentett beállítások betöltése az űrlapokba
function loadSettings() {
    const userNameInput = document.getElementById('userNameInput');
    if (userNameInput) {
        userNameInput.value = localStorage.getItem('userName') || '';
    }
    
    const nightShiftStartInput = document.getElementById('nightShiftStartInput');
    const nightShiftEndInput = document.getElementById('nightShiftEndInput');
    if (nightShiftStartInput && nightShiftEndInput) {
        nightShiftStartInput.value = localStorage.getItem('nightShiftStart') || NIGHT_SHIFT_DEFAULT_START;
        nightShiftEndInput.value = localStorage.getItem('nightShiftEnd') || NIGHT_SHIFT_DEFAULT_END;
        const nightShiftSaveButton = document.getElementById('nightShiftSaveButton');
        if (nightShiftSaveButton && !nightShiftSaveButton.dataset.nightShiftBound) {
            nightShiftSaveButton.addEventListener('click', handleNightShiftSave);
            nightShiftSaveButton.dataset.nightShiftBound = 'true';
        }
    }
    
    const themeSelector = document.getElementById('themeSelector');
    if (themeSelector) {
        themeSelector.value = localStorage.getItem('theme') || 'auto';
    }
    
    const autoExportSelector = document.getElementById('autoExportSelector');
    if (autoExportSelector) {
        autoExportSelector.value = localStorage.getItem('autoExportFrequency') || 'never';
    }

    // Report language + riport mezők: initReportSettingsUI

    // Timezone selector
    try {
        const tzSelector = document.getElementById('timezoneSelector');
        if (tzSelector) {
            const currentTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const saved = localStorage.getItem('preferredTimezone') || currentTz;
            tzSelector.value = saved;
            tzSelector.onchange = async (e) => {
                const val = e.target.value;
                localStorage.setItem('preferredTimezone', val);
                
                // Reset timezone warning when changing timezone
                localStorage.removeItem('timezoneWarningDismissed');
                if (typeof window.userSettings !== 'undefined' && window.userSettings) {
                    window.userSettings.timezoneWarningDismissed = false;
                }
                
                if (typeof uploadLocalSettings === 'function') { 
                    await uploadLocalSettings(); 
                }
                
                if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && typeof showCustomAlert === 'function') {
                    const i18n = translations[currentLang];
                    showCustomAlert(i18n.settingsSaved, 'success');
                }
            };
        }
    } catch(e) {
        console.warn('[Settings] Timezone selector setup failed:', e);
    }

    // Riport beállítások UI inicializálása
    if (typeof initReportSettingsUI === 'function') {
        initReportSettingsUI();
    }

    try {
        initCompanyJoinSection();
        updateCompanyJoinSectionVisibility();
    } catch (err) {
        console.error('[CompanyJoin] init failed', err);
    }

    try {
        initIosDebugToolsSection();
        updateIosDebugToolsSectionVisibility();
    } catch (err) {
        console.error('[IosDebugTools] init failed', err);
    }

    try {
        initReferralSection();
    } catch (err) {
        console.error('[Referral] init failed', err);
    }
}

function normalizeJoinCodeInput(val) {
    return String(val || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
}

function updateCompanyJoinUI(companyId) {
    var notLinked = document.getElementById('company-join-not-linked');
    var linked = document.getElementById('company-join-linked');
    var displayId = document.getElementById('company-join-display-id');
    if (!notLinked || !linked) return;
    if (companyId != null && companyId !== '') {
        notLinked.classList.add('hidden');
        linked.classList.remove('hidden');
        if (displayId) displayId.textContent = companyId;
    } else {
        notLinked.classList.remove('hidden');
        linked.classList.add('hidden');
        if (displayId) displayId.textContent = '';
    }
}

/** Céges csatlakozás blokk: csak info@gurigo.eu fióknál jelenik meg. */
var COMPANY_JOIN_ALLOWED_EMAIL = 'info@gurigo.eu';
function updateCompanyJoinSectionVisibility() {
    var section = document.getElementById('company-join-section');
    if (!section) return;
    var user = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    var email = (user && user.email) ? String(user.email).trim().toLowerCase() : '';
    if (email === String(COMPANY_JOIN_ALLOWED_EMAIL).toLowerCase()) {
        section.classList.remove('hidden');
    } else {
        section.classList.add('hidden');
    }
}
if (typeof window !== 'undefined') {
    window.updateCompanyJoinSectionVisibility = updateCompanyJoinSectionVisibility;
}

/** iOS natív shell: fejlesztői beta/cache eszközök (allowlistelt e-mail). */
function updateIosDebugToolsSectionVisibility() {
    var section = document.getElementById('ios-debug-tools-section');
    if (!section) return;
    var bridge = (typeof window !== 'undefined') ? window.GuriGONativeDebugBridge : null;
    var visible = !!(bridge && typeof bridge.canShowIosDebugTools === 'function' && bridge.canShowIosDebugTools());
    if (visible) {
        section.classList.remove('hidden');
    } else {
        section.classList.add('hidden');
    }
}

function initIosDebugToolsSection() {
    var section = document.getElementById('ios-debug-tools-section');
    var clearBtn = document.getElementById('ios-debug-clear-cache-btn');
    var reloadBtn = document.getElementById('ios-debug-reload-beta-btn');
    if (!section || !clearBtn || !reloadBtn) return;
    if (section.dataset.iosDebugBound === 'true') return;
    section.dataset.iosDebugBound = 'true';

    clearBtn.addEventListener('click', function () {
        var bridge = window.GuriGONativeDebugBridge;
        if (!bridge || typeof bridge.clearWebViewDataAndReloadBeta !== 'function') {
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Ez a funkció csak a natív iOS teszt appban érhető el.', 'info');
            }
            return;
        }
        bridge.clearWebViewDataAndReloadBeta();
    });

    reloadBtn.addEventListener('click', function () {
        var bridge = window.GuriGONativeDebugBridge;
        if (!bridge || typeof bridge.reloadBeta !== 'function') {
            if (typeof showCustomAlert === 'function') {
                showCustomAlert('Ez a funkció csak a natív iOS teszt appban érhető el.', 'info');
            }
            return;
        }
        bridge.reloadBeta();
    });
}

if (typeof window !== 'undefined') {
    window.updateIosDebugToolsSectionVisibility = updateIosDebugToolsSectionVisibility;
    window.initIosDebugToolsSection = initIosDebugToolsSection;
}

function initCompanyJoinSection() {
    var section = document.getElementById('company-join-section');
    var input = document.getElementById('company-join-code-input');
    var joinBtn = document.getElementById('company-join-btn');
    var leaveBtn = document.getElementById('company-leave-btn');
    var errEl = document.getElementById('company-join-error');
    if (!section || !input || !joinBtn || !leaveBtn) return;

    updateCompanyJoinUI(typeof window.userCompanyId !== 'undefined' ? window.userCompanyId : null);

    if (!input.dataset.companyJoinBound) {
        input.addEventListener('input', function() {
            input.value = normalizeJoinCodeInput(input.value);
        });
        input.dataset.companyJoinBound = 'true';
    }

    joinBtn.addEventListener('click', async function() {
        if (errEl) { errEl.classList.add('hidden'); errEl.textContent = ''; }
        var code = normalizeJoinCodeInput(input.value);
        if (!code) {
            if (errEl) { errEl.textContent = 'Add meg a csatlakozási kódot.'; errEl.classList.remove('hidden'); }
            return;
        }
        if (typeof firebase === 'undefined' || !firebase.app) {
            if (errEl) { errEl.textContent = 'A szolgáltatás nem elérhető.'; errEl.classList.remove('hidden'); }
            return;
        }
        joinBtn.disabled = true;
        try {
            var fnSvc = (typeof window !== 'undefined' && window.functions) ? window.functions : firebase.app().functions('europe-west3');
            var joinCompanyByCode = fnSvc.httpsCallable('joinCompanyByCode');
            var result = await joinCompanyByCode({ code: code });
            var cid = result && result.data && result.data.companyId;
            if (cid) {
                window.userCompanyId = cid;
                updateCompanyJoinUI(cid);
                input.value = '';
                if (typeof showCustomAlert === 'function') showCustomAlert('Sikeresen csatlakoztál a céghez.', 'success');
            }
        } catch (e) {
            var msg = (e && e.message) || (e && e.code) || 'Hiba';
            if (e && e.details) msg = e.details;
            if (msg === 'INVALID_CODE_FORMAT' || (e && e.code === 'invalid-argument')) msg = 'Érvénytelen kód formátum (3 betű + 3 szám, pl. KFT482).';
            if (msg === 'INVALID_CODE' || (e && e.code === 'failed-precondition')) msg = 'Érvénytelen vagy lejárt kód.';
            if (msg === 'RATE_LIMIT' || (e && e.code === 'resource-exhausted')) msg = 'Túl sok próbálkozás. Várj 15 percet.';
            if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
        }
        joinBtn.disabled = false;
    });

    leaveBtn.addEventListener('click', async function() {
        if (typeof firebase === 'undefined' || !firebase.app) return;
        if (typeof showCustomAlert === 'function' && !confirm('Kilépsz a cégből. Folytatod?')) return;
        leaveBtn.disabled = true;
        try {
            var fnSvcLeave = (typeof window !== 'undefined' && window.functions) ? window.functions : firebase.app().functions('europe-west3');
            var leaveCompany = fnSvcLeave.httpsCallable('leaveCompany');
            await leaveCompany({});
            window.userCompanyId = null;
            updateCompanyJoinUI(null);
            if (typeof showCustomAlert === 'function') showCustomAlert('Kiléptél a cégből.', 'success');
        } catch (e) {
            if (typeof showCustomAlert === 'function') showCustomAlert((e && e.message) || 'Hiba történt.', 'info');
        }
        leaveBtn.disabled = false;
    });
}

function normalizeReferralCodeInput(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

let referralInvitesUnsubscribe = null;
let referralIncomingUnsubscribe = null;
let referralIncomingRetryTimer = null;
let referralIncomingRetryUid = null;
const REFERRAL_POPUP_FIRST_DELAY_DAYS = 43;
const REFERRAL_POPUP_SECOND_DELAY_DAYS = 14;

function getReferralI18n() {
    if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
        return translations[currentLang] || {};
    }
    return {};
}

function getReferralStatusLabel(status, i18n) {
    if (status === 'granted') return referralTr('settingsReferralStatusGranted', i18n.settingsReferralStatusGranted);
    if (status === 'rejected') return referralTr('settingsReferralStatusRejected', i18n.settingsReferralStatusRejected);
    return referralTr('settingsReferralStatusPending', i18n.settingsReferralStatusPending);
}

function getReferralIncomingStatusLabel(status, i18n) {
    if (status === 'granted') return referralTr('settingsReferralIncomingGranted', i18n.settingsReferralIncomingGranted);
    if (status === 'rejected') return referralTr('settingsReferralIncomingRejected', i18n.settingsReferralIncomingRejected);
    return referralTr('settingsReferralIncomingPending', i18n.settingsReferralIncomingPending);
}

function getReferralDateLocale() {
    const lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'hu';
    const map = { hu: 'hu-HU', en: 'en-GB', de: 'de-DE', pl: 'pl-PL', ro: 'ro-RO' };
    return map[lang] || 'hu-HU';
}

function referralTr(key, fallback) {
    const i18n = getReferralI18n();
    const val = i18n[key];
    return (val !== undefined && val !== '') ? val : (fallback || '');
}

function formatReferralDate(ts) {
    const locale = getReferralDateLocale();
    try {
        if (ts && typeof ts.toDate === 'function') return ts.toDate().toLocaleDateString(locale);
        if (ts && typeof ts.seconds === 'number') return new Date(ts.seconds * 1000).toLocaleDateString(locale);
    } catch (_) {}
    return '—';
}

function escapeReferralHtml(text) {
    return String(text == null ? '' : text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function stopReferralListeners() {
    if (typeof referralInvitesUnsubscribe === 'function') {
        referralInvitesUnsubscribe();
    }
    if (typeof referralIncomingUnsubscribe === 'function') {
        referralIncomingUnsubscribe();
    }
    if (referralIncomingRetryTimer) {
        clearTimeout(referralIncomingRetryTimer);
    }
    referralInvitesUnsubscribe = null;
    referralIncomingUnsubscribe = null;
    referralIncomingRetryTimer = null;
    referralIncomingRetryUid = null;
}

function isReferralAuthGone() {
    try {
        if (window.GurigoAuthSession && window.GurigoAuthSession.isSigningOut()) return true;
        if (typeof firebase !== 'undefined' && firebase.auth && !firebase.auth().currentUser) return true;
    } catch (_) {}
    return false;
}

window.stopReferralListeners = stopReferralListeners;

function closeReferralPromoModal() {
    const modal = document.getElementById('referral-promo-modal');
    if (modal) modal.remove();
}

function showReferralPromoModal(i18n, onOpenReferral, onDismiss) {
    closeReferralPromoModal();
    if (!document.getElementById('referral-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'referral-modal-styles';
        style.textContent = `
          .referral-modal { z-index: 9999; }
          .referral-modal .modal-card {
            width: calc(100% - 32px);
            max-width: 420px;
            max-height: calc(100vh - 120px);
            overflow-y: auto;
            border-radius: 14px;
          }
          .referral-modal .btn-primary {
            background-color: #2ecc71;
            color: #ffffff;
            opacity: 1;
            visibility: visible;
            border: none;
          }
          .referral-modal .btn-primary:hover { background-color: #29b765; }
          .referral-modal .btn-secondary {
            background-color: #e0e0e0;
            color: #333333;
            opacity: 1;
            visibility: visible;
            border: none;
          }
          .referral-modal .btn-secondary:hover { background-color: #d4d4d4; }
        `;
        document.head.appendChild(style);
    }
    const title = referralTr('referralPopupTitle', i18n.referralPopupTitle);
    const body = referralTr('referralPopupBody', i18n.referralPopupBody);
    const openBtn = referralTr('referralPopupOpenButton', i18n.referralPopupOpenButton);
    const laterBtn = referralTr('referralPopupLaterButton', i18n.referralPopupLaterButton);

    const modal = document.createElement('div');
    modal.id = 'referral-promo-modal';
    modal.className = 'referral-modal fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 p-4';
    modal.innerHTML = `
      <div class="modal-card bg-white dark:bg-gray-800 shadow-2xl p-4 sm:p-5">
        <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">${escapeReferralHtml(title)}</h3>
        <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line mb-4">${escapeReferralHtml(body)}</p>
        <div class="flex flex-col gap-3">
          <button id="referral-promo-open" class="btn-primary w-full font-semibold py-2 px-4 rounded-lg">${escapeReferralHtml(openBtn)}</button>
          <button id="referral-promo-dismiss" class="btn-secondary w-full font-semibold py-2 px-4 rounded-lg">${escapeReferralHtml(laterBtn)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const open = document.getElementById('referral-promo-open');
    const dismiss = document.getElementById('referral-promo-dismiss');
    if (open) {
        open.addEventListener('click', function() {
            closeReferralPromoModal();
            if (typeof onOpenReferral === 'function') onOpenReferral();
        });
    }
    if (dismiss) {
        dismiss.addEventListener('click', function() {
            closeReferralPromoModal();
            if (typeof onDismiss === 'function') onDismiss();
        });
    }
}

function toMillisSafe(value) {
    try {
        if (!value) return 0;
        if (typeof value.toMillis === 'function') return value.toMillis();
        const d = new Date(value);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    } catch (_) {
        return 0;
    }
}

async function checkAndShowReferralPopup() {
    if (typeof window === 'undefined') return;
    if (window.__referralPopupShownInSession || window.__referralPopupCheckRunning) return;
    window.__referralPopupCheckRunning = true;
    try {
        if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) return;
        const user = firebase.auth().currentUser;
        if (!user || !user.uid) return;
        const firestoreDb = (window.db || firebase.firestore());

        const referralsSnap = await firestoreDb.collection('referrals')
            .where('referrerUid', '==', user.uid)
            .limit(1)
            .get();
        if (referralsSnap && !referralsSnap.empty) return; // van meghívott -> soha ne mutassuk

        const createdAtMs = toMillisSafe(user.metadata && user.metadata.creationTime);
        if (!createdAtMs) return;
        const nowMs = Date.now();
        const daysSinceRegistration = (nowMs - createdAtMs) / (24 * 60 * 60 * 1000);

        const popupRef = firestoreDb.collection('users').doc(user.uid).collection('meta').doc('referralPopup');
        const popupSnap = await popupRef.get();
        const popupData = popupSnap.exists ? (popupSnap.data() || {}) : {};
        const firstShownMs = toMillisSafe(popupData.firstShownAt);
        const secondShownMs = toMillisSafe(popupData.secondShownAt);

        let showStage = null;
        if (!firstShownMs && daysSinceRegistration >= REFERRAL_POPUP_FIRST_DELAY_DAYS) {
            showStage = 'first';
        } else if (firstShownMs && !secondShownMs) {
            const daysSinceFirst = (nowMs - firstShownMs) / (24 * 60 * 60 * 1000);
            if (daysSinceFirst >= REFERRAL_POPUP_SECOND_DELAY_DAYS) {
                showStage = 'second';
            }
        }
        if (!showStage) return;

        const i18n = getReferralI18n();
        const markShown = async function() {
            const payload = {
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (showStage === 'first') payload.firstShownAt = firebase.firestore.FieldValue.serverTimestamp();
            if (showStage === 'second') payload.secondShownAt = firebase.firestore.FieldValue.serverTimestamp();
            await popupRef.set(payload, { merge: true });
        };

        window.__referralPopupShownInSession = true;
        showReferralPromoModal(i18n, async function() {
            try { await markShown(); } catch (_) {}
            if (typeof window.showTab === 'function') window.showTab('referral');
        }, async function() {
            try { await markShown(); } catch (_) {}
        });
    } catch (error) {
        console.warn('[ReferralPopup] check failed:', error && error.message ? error.message : error);
    }
    window.__referralPopupCheckRunning = false;
}

function bindReferralRealtime(uid) {
    const invitesList = document.getElementById('referral-invites-list');
    const incomingSection = document.getElementById('referral-incoming-section');
    const incomingText = document.getElementById('referral-incoming-text');
    const incomingStatus = document.getElementById('referral-incoming-status');
    if (!invitesList || !incomingSection || !incomingText || !incomingStatus) return;

    const i18n = getReferralI18n();
    const firestoreDb = (typeof window !== 'undefined' && window.db) ? window.db : (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
    if (!firestoreDb) return;

    stopReferralListeners();

    function isPermissionDenied(error) {
        const code = error && (error.code || error.name);
        const message = String((error && error.message) || '');
        return code === 'permission-denied' || message.indexOf('Missing or insufficient permissions') !== -1;
    }

    function stopIncomingListenerOnly() {
        if (typeof referralIncomingUnsubscribe === 'function') {
            referralIncomingUnsubscribe();
        }
        referralIncomingUnsubscribe = null;
    }

    referralInvitesUnsubscribe = firestoreDb.collection('referrals')
        .where('referrerUid', '==', uid)
        .limit(20)
        .onSnapshot(function(snapshot) {
            if (!snapshot || snapshot.empty) {
                invitesList.innerHTML = `<p>${escapeReferralHtml(i18n.settingsReferralInvitesEmpty || 'Még nem hívtál meg senkit.')}</p>`;
                return;
            }
            const sortedDocs = snapshot.docs.slice().sort(function(a, b) {
                const ad = (a.data() || {}).createdAt;
                const bd = (b.data() || {}).createdAt;
                const at = ad && typeof ad.toMillis === 'function' ? ad.toMillis() : 0;
                const bt = bd && typeof bd.toMillis === 'function' ? bd.toMillis() : 0;
                return bt - at;
            });
            invitesList.innerHTML = sortedDocs.map(function(doc) {
                const d = doc.data() || {};
                const referredName = d.referredDisplayName || d.referredEmail || '—';
                const dateText = formatReferralDate(d.createdAt);
                const statusText = getReferralStatusLabel(d.rewardStatus, i18n);
                return `
                    <div class="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2">
                        <div>
                            <p class="font-semibold text-gray-800 dark:text-gray-100">${escapeReferralHtml(referredName)}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">${escapeReferralHtml(dateText)}</p>
                        </div>
                        <span class="text-xs font-semibold px-2 py-1 rounded bg-gray-100 dark:bg-gray-700">${escapeReferralHtml(statusText)}</span>
                    </div>
                `;
            }).join('');
        }, function(error) {
            if (isPermissionDenied(error)) {
                if (typeof referralInvitesUnsubscribe === 'function') {
                    referralInvitesUnsubscribe();
                    referralInvitesUnsubscribe = null;
                }
                if (isReferralAuthGone()) {
                    console.warn('[Referral] Invites listener permission-denied after sign-out (ignored)');
                    return;
                }
                invitesList.innerHTML = `<p>${escapeReferralHtml(i18n.settingsReferralLoadFailed || 'Az ajánlási adatok betöltése nem sikerült.')}</p>`;
                console.info('[Referral] Permission denied on invites listener. code:', error && error.code, 'message:', error && error.message);
                return;
            }
            console.error('[Referral] invites listener failed:', error);
            invitesList.innerHTML = `<p>${escapeReferralHtml(i18n.settingsReferralLoadFailed || 'Az ajánlási adatok betöltése nem sikerült.')}</p>`;
        });

    referralIncomingUnsubscribe = firestoreDb.collection('referrals')
        .where('referredUid', '==', uid)
        .limit(20)
        .onSnapshot(function(snapshot) {
            if (!snapshot || snapshot.empty) {
                incomingSection.classList.add('hidden');
                incomingText.textContent = '';
                incomingStatus.textContent = '';
                return;
            }
            const latestDoc = snapshot.docs.slice().sort(function(a, b) {
                const ad = (a.data() || {}).createdAt;
                const bd = (b.data() || {}).createdAt;
                const at = ad && typeof ad.toMillis === 'function' ? ad.toMillis() : 0;
                const bt = bd && typeof bd.toMillis === 'function' ? bd.toMillis() : 0;
                return bt - at;
            })[0];
            const d = latestDoc ? (latestDoc.data() || {}) : {};
            const referrerName = d.referrerDisplayName || d.referrerEmail || '—';
            incomingText.textContent = (i18n.settingsReferralIncomingBy || 'Téged meghívott: {name}').replace('{name}', referrerName);
            incomingStatus.textContent = getReferralIncomingStatusLabel(d.rewardStatus, i18n);
            incomingSection.classList.remove('hidden');
        }, function(error) {
            if (isPermissionDenied(error)) {
                stopIncomingListenerOnly();
                if (isReferralAuthGone()) {
                    console.warn('[Referral] Incoming listener permission-denied after sign-out (ignored)');
                    return;
                }
                incomingSection.classList.add('hidden');
                incomingText.textContent = '';
                incomingStatus.textContent = '';
                console.info('[Referral] Permission denied on incoming listener. code:', error && error.code, 'message:', error && error.message);
                const currentUid = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser)
                    ? firebase.auth().currentUser.uid
                    : null;
                if (currentUid === uid && referralIncomingRetryUid !== uid) {
                    referralIncomingRetryUid = uid;
                    referralIncomingRetryTimer = setTimeout(function() {
                        referralIncomingRetryTimer = null;
                        const latestUid = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser)
                            ? firebase.auth().currentUser.uid
                            : null;
                        if (latestUid === uid) {
                            bindReferralRealtime(uid);
                        }
                    }, 2000);
                }
                return;
            }
            console.error('[Referral] incoming listener failed:', error);
        });
}

async function ensureReferralFunctions() {
    var fnSvc = (typeof window !== 'undefined' && window.functions) ? window.functions : null;
    if (!fnSvc && typeof window.ensureFirebaseFunctions === 'function') {
        fnSvc = await window.ensureFirebaseFunctions();
    }
    if (!fnSvc && typeof firebase !== 'undefined' && firebase.app && typeof firebase.app().functions === 'function') {
        fnSvc = firebase.app().functions('europe-west3');
    }
    if (!fnSvc || typeof fnSvc.httpsCallable !== 'function') {
        throw new Error('Firebase Functions SDK is not available');
    }
    return fnSvc;
}

async function loadReferralSectionData() {
    const ownCodeInput = document.getElementById('referral-own-code');
    const redeemWrap = document.getElementById('referral-redeem-wrap');
    const lockedInfo = document.getElementById('referral-locked-info');
    if (!ownCodeInput || !redeemWrap || !lockedInfo) return;

    const i18n = getReferralI18n();
    const fnSvc = await ensureReferralFunctions();
    const getOrCreateReferralCode = fnSvc.httpsCallable('getOrCreateReferralCode');
    const result = await getOrCreateReferralCode({});
    const data = (result && result.data) ? result.data : {};
    ownCodeInput.value = data.code || '';
    const user = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if (user && user.uid) {
        bindReferralRealtime(user.uid);
    }

    if (data.hasIncoming) {
        redeemWrap.classList.add('hidden');
        lockedInfo.classList.remove('hidden');
        const usedCode = data.referredByCode ? ` (${data.referredByCode})` : '';
        lockedInfo.textContent = (i18n.settingsReferralAlreadyLocked || 'Ehhez a fiókhoz már rögzítve van ajánlókód.') + usedCode;
    } else {
        redeemWrap.classList.remove('hidden');
        lockedInfo.classList.add('hidden');
        lockedInfo.textContent = '';
    }
}

async function copyReferralCode() {
    const ownCodeInput = document.getElementById('referral-own-code');
    if (!ownCodeInput || !ownCodeInput.value) return;
    const i18n = getReferralI18n();
    try {
        await navigator.clipboard.writeText(ownCodeInput.value);
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.settingsReferralCopied || 'Ajánlókód másolva.', 'success');
        }
    } catch (_) {
        window.prompt(referralTr('settingsReferralCopyPrompt', i18n.settingsReferralCopyPrompt), ownCodeInput.value);
    }
}

async function saveReferralCode() {
    const input = document.getElementById('referral-input');
    const saveBtn = document.getElementById('referral-save-btn');
    const ownCodeInput = document.getElementById('referral-own-code');
    const redeemWrap = document.getElementById('referral-redeem-wrap');
    if (!input || !saveBtn) return;
    const i18n = getReferralI18n();
    const code = normalizeReferralCodeInput(input.value);
    const ownCode = normalizeReferralCodeInput(ownCodeInput ? ownCodeInput.value : '');
    const referralPattern = /^[A-HJ-NP-Z2-9]{6}$/;

    if (redeemWrap && redeemWrap.classList.contains('hidden')) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.settingsReferralAlreadyLocked || 'Ehhez a fiókhoz már rögzítve van ajánlókód.', 'info');
        }
        return;
    }

    if (!code) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.settingsReferralNotFound || 'Ez az ajánlókód nem található.', 'info');
        }
        return;
    }
    if (!referralPattern.test(code)) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.settingsReferralNotFound || 'Ez az ajánlókód nem található.', 'info');
        }
        return;
    }
    if (ownCode && code === ownCode) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.settingsReferralSelfCode || 'Saját ajánlókódot nem adhatsz meg.', 'info');
        }
        return;
    }

    saveBtn.disabled = true;
    try {
        const fnSvc = await ensureReferralFunctions();
        const applyReferralCode = fnSvc.httpsCallable('applyReferralCode');
        await applyReferralCode({ code });
        input.value = '';
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.settingsReferralSaveSuccess || 'Ajánlókód rögzítve. Köszönjük!', 'success');
        }
        await loadReferralSectionData();
    } catch (e) {
        const raw = String([
            e && e.code,
            e && e.message,
            e && e.details
        ].filter(Boolean).join(' | ')).toUpperCase();
        let message = i18n.settingsReferralSaveFailed || 'Az ajánlókód mentése nem sikerült. Próbáld újra.';
        if (raw.includes('REFERRAL_CODE_NOT_FOUND') || raw.includes('NOT-FOUND')) message = i18n.settingsReferralNotFound || 'Ez az ajánlókód nem található.';
        if (raw.includes('REFERRAL_SELF_CODE') || raw.includes('SELF')) message = i18n.settingsReferralSelfCode || 'Saját ajánlókódot nem adhatsz meg.';
        if (raw.includes('REFERRAL_ALREADY_SET') || raw.includes('ALREADY')) message = i18n.settingsReferralAlreadyLocked || 'Ehhez a fiókhoz már rögzítve van ajánlókód.';
        console.warn('[Referral] apply code failed:', e && e.code, e && e.message, e && e.details);
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(message, 'info');
        }
    }
    saveBtn.disabled = false;
}

function initReferralSection() {
    const section = document.getElementById('referral-section');
    const input = document.getElementById('referral-input');
    const copyBtn = document.getElementById('referral-copy-btn');
    const saveBtn = document.getElementById('referral-save-btn');
    if (!section || !input || !copyBtn || !saveBtn) return;
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.auth().currentUser) {
        stopReferralListeners();
        return;
    }

    if (!input.dataset.referralBound) {
        input.addEventListener('input', function() {
            input.value = normalizeReferralCodeInput(input.value);
        });
        input.dataset.referralBound = 'true';
    }
    if (!copyBtn.dataset.referralBound) {
        copyBtn.addEventListener('click', copyReferralCode);
        copyBtn.dataset.referralBound = 'true';
    }
    if (!saveBtn.dataset.referralBound) {
        saveBtn.addEventListener('click', saveReferralCode);
        saveBtn.dataset.referralBound = 'true';
    }

    loadReferralSectionData().catch(function(err) {
        console.error('[Referral] load failed:', err);
    });
}

function normalizeNightShiftInput(value) {
    if (!value) return null;
    const trimmed = String(value).trim();
    const match = trimmed.match(NIGHT_SHIFT_TIME_PATTERN);
    if (!match) return null;
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return `${match[1]}:${match[2]}`;
}

function clearNightWorkRecalculationFlags() {
    if (typeof localStorage === 'undefined') return;
    try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('nightWorkRecalculated_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.warn('[Settings] Failed to clear night work recalculation flags:', error);
    }
}

async function handleNightShiftSave(event) {
    if (event) event.preventDefault();
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
        ? (translations[currentLang] || {})
        : {};
    const startInput = document.getElementById('nightShiftStartInput');
    const endInput = document.getElementById('nightShiftEndInput');
    if (!startInput || !endInput) {
        return;
    }

    const normalizedStart = normalizeNightShiftInput(startInput.value) || NIGHT_SHIFT_DEFAULT_START;
    const normalizedEnd = normalizeNightShiftInput(endInput.value) || NIGHT_SHIFT_DEFAULT_END;

    if (!normalizedStart || !normalizedEnd) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.nightShiftInvalidMessage || 'Adj meg érvényes időpontokat (HH:MM)!', 'info');
        }
        return;
    }

    try {
        localStorage.setItem('nightShiftStart', normalizedStart);
        localStorage.setItem('nightShiftEnd', normalizedEnd);
        if (typeof window !== 'undefined') {
            window.userSettings = window.userSettings || {};
            window.userSettings.nightShiftStart = normalizedStart;
            window.userSettings.nightShiftEnd = normalizedEnd;
        }
    } catch (error) {
        console.error('[Settings] Failed to store night shift settings locally:', error);
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.nightShiftSaveError || 'Nem sikerült menteni az éjszakai idősávot. Próbáld újra.', 'info');
        }
        return;
    }

    try {
        if (typeof uploadLocalSettings === 'function') {
            await uploadLocalSettings();
        }
    } catch (error) {
        console.error('[Settings] Failed to sync night shift settings:', error);
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.nightShiftSaveError || 'Nem sikerült menteni az éjszakai idősávot. Próbáld újra.', 'info');
        }
        return;
    }

    clearNightWorkRecalculationFlags();

    if (typeof runNightWorkRecalculation === 'function') {
        try {
            await runNightWorkRecalculation();
        } catch (error) {
            console.error('[Settings] Night work recalculation failed:', error);
        }
    }

    if (typeof showCustomAlert === 'function') {
        showCustomAlert(i18n.nightShiftSaveSuccess || i18n.settingsSaved || 'Beállítások mentve!', 'success');
    }
}

// Adatok exportálása JSON fájlba
function exportData() {
    if (typeof records === 'undefined' || typeof palletRecords === 'undefined') {
        console.warn('[Settings] Records not available for export');
        return;
    }

    if (records.length === 0 && palletRecords.length === 0) {
        if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
            const i18n = translations[currentLang];
            if (typeof showCustomAlert === 'function') {
                showCustomAlert(i18n.alertNoDataToExport, 'info');
            }
        }
        return;
    }

    const dataToExport = {
        workRecords: records,
        palletRecords: palletRecords
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gurigo_backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Adatok importálása JSON fájlból
function importData() {
    if (typeof translations === 'undefined' || typeof currentLang === 'undefined') {
        console.warn('[Settings] Translations not available');
        return;
    }

    const i18n = translations[currentLang];
    const fileInput = document.getElementById('importFile');
    
    if (!fileInput || !fileInput.files.length) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.alertChooseFile, 'info');
        }
        return;
    }

    if (typeof showCustomAlert !== 'function') {
        console.error('[Settings] showCustomAlert function not available');
        return;
    }

    showCustomAlert(i18n.alertConfirmImport, 'warning', () => {
        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const imported = JSON.parse(e.target.result);
                let incomingWork = [];
                let incomingPallets = [];

                if (Array.isArray(imported)) {
                    incomingWork = imported;
                    incomingPallets = [];
                } else if (imported.workRecords || imported.palletRecords) {
                    incomingWork = imported.workRecords || [];
                    incomingPallets = imported.palletRecords || [];
                } else {
                    throw new Error(i18n.alertImportInvalid);
                }

                if (typeof currentUser !== 'undefined' && currentUser) {
                    // Logged-in import requires online server reads — cache-miss must not
                    // be treated as "doc missing" and overwrite newer remote data on reconnect.
                    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                        throw new Error(i18n.alertImportRequiresOnline || 'Az importáláshoz online kapcsolat kell (bejelentkezve).');
                    }
                    if (typeof migrateLocalToFirestore === 'function') {
                        const workResult = await migrateLocalToFirestore(incomingWork, 'records', {
                            safeMerge: true,
                            rejectOnConflict: true,
                            requireServerRead: true
                        });
                        if (workResult && workResult.status === 'rejected') {
                            const fields = (workResult.conflictFields || []).join(', ');
                            throw new Error(
                                (i18n.alertImportConflict || 'Import elutasítva konfliktus miatt.') +
                                (fields ? ' (' + fields + ')' : '') +
                                (workResult.recordId ? ' #' + workResult.recordId : '')
                            );
                        }
                        if (workResult && workResult.status === 'failed') {
                            throw workResult.error || new Error(i18n.errorImport || 'Import failed');
                        }
                        const palletResult = await migrateLocalToFirestore(incomingPallets, 'pallets', {
                            safeMerge: true,
                            rejectOnConflict: true,
                            requireServerRead: true
                        });
                        if (palletResult && palletResult.status === 'rejected') {
                            throw new Error(i18n.alertImportConflict || 'Import elutasítva konfliktus miatt.');
                        }
                        if (palletResult && palletResult.status === 'failed') {
                            throw palletResult.error || new Error(i18n.errorImport || 'Import failed');
                        }
                    }
                    // Refresh in-memory lists from authoritative merge path only after successful migrate.
                    if (typeof ensureRecordsLoaded === 'function') {
                        try { await ensureRecordsLoaded(); } catch (_) {}
                    }
                } else {
                    // Offline / logged-out: merge into localStorage rather than blind replace.
                    let existingWork = [];
                    let existingPallets = [];
                    try { existingWork = JSON.parse(localStorage.getItem('workRecords') || '[]'); } catch (_) {}
                    try { existingPallets = JSON.parse(localStorage.getItem('palletRecords') || '[]'); } catch (_) {}
                    const byId = {};
                    (Array.isArray(existingWork) ? existingWork : []).forEach(function (r) {
                        if (r && r.id != null) byId[String(r.id)] = r;
                    });
                    for (let i = 0; i < incomingWork.length; i++) {
                        const inc = incomingWork[i];
                        if (!inc || inc.id == null) continue;
                        const mergeFn = (typeof window.mergeWorkRecordForImport === 'function')
                            ? window.mergeWorkRecordForImport
                            : null;
                        if (mergeFn) {
                            const m = mergeFn(byId[String(inc.id)] || null, inc);
                            if (!m.ok) {
                                throw new Error(i18n.alertImportConflict || 'Import elutasítva konfliktus miatt.');
                            }
                            byId[String(inc.id)] = m.record;
                        } else {
                            byId[String(inc.id)] = Object.assign({}, byId[String(inc.id)] || {}, inc);
                        }
                    }
                    if (typeof records !== 'undefined') {
                        records = Object.keys(byId).map(function (k) { return byId[k]; });
                    }
                    localStorage.setItem('workRecords', JSON.stringify(Object.keys(byId).map(function (k) { return byId[k]; })));
                    // Merge pallets by id — never blind-replace (old backup must not drop newer local pallets).
                    const palletById = {};
                    (Array.isArray(existingPallets) ? existingPallets : []).forEach(function (r) {
                        if (r && r.id != null) palletById[String(r.id)] = r;
                    });
                    for (let pi = 0; pi < incomingPallets.length; pi++) {
                        const pInc = incomingPallets[pi];
                        if (!pInc || pInc.id == null) continue;
                        const pMergeFn = (typeof window.mergeWorkRecordForImport === 'function')
                            ? window.mergeWorkRecordForImport
                            : null;
                        if (pMergeFn) {
                            const pm = pMergeFn(palletById[String(pInc.id)] || null, pInc);
                            if (!pm.ok) {
                                throw new Error(i18n.alertImportConflict || 'Import elutasítva konfliktus miatt.');
                            }
                            palletById[String(pInc.id)] = pm.record;
                        } else {
                            palletById[String(pInc.id)] = Object.assign({}, palletById[String(pInc.id)] || {}, pInc);
                        }
                    }
                    const mergedPallets = Object.keys(palletById).map(function (k) { return palletById[k]; });
                    if (typeof palletRecords !== 'undefined') {
                        palletRecords = mergedPallets;
                    }
                    localStorage.setItem('palletRecords', JSON.stringify(mergedPallets));
                }

                if (typeof renderApp === 'function') {
                    renderApp();
                }

                if (typeof showCustomAlert === 'function') {
                    showCustomAlert(i18n.alertImportSuccess, 'success');
                }
            } catch (err) {
                console.error('[Settings] Import error:', err);
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert(i18n.errorImport + ' ' + err.message, 'info');
                }
            }
        };
        reader.readAsText(fileInput.files[0]);
    });
}

// Speciális funkciók (pl. km, vezetési idő) kapcsolóinak kezelése
const featureToggles = ['toggleKm', 'toggleDriveTime', 'togglePallets', 'toggleCompensation', 'toggleTrailerContainer'];

function initializeFeatureToggles() {
    if (typeof refreshToggleVisuals === 'function') {
        refreshToggleVisuals();
    }

    featureToggles.forEach(toggleId => {
        const checkbox = document.getElementById(toggleId);
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                localStorage.setItem(toggleId, e.target.checked);
                if (typeof updateEnhancedToggleVisuals === 'function') {
                    updateEnhancedToggleVisuals(e.target);
                }
                if (typeof applyFeatureToggles === 'function') {
                    applyFeatureToggles();
                }
                if (typeof uploadLocalSettings === 'function') {
                    uploadLocalSettings();
                }
            });
        }
    });
    
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        if (typeof updateEnhancedToggleVisuals === 'function') {
            updateEnhancedToggleVisuals(splitRestToggle);
        }
        splitRestToggle.addEventListener('change', (e) => {
            if (typeof updateEnhancedToggleVisuals === 'function') {
                updateEnhancedToggleVisuals(e.target);
            }
        });
    }
    
    const multiPalletToggle = document.getElementById('toggleMultiPallet');
    if (multiPalletToggle) {
        multiPalletToggle.addEventListener('change', (e) => {
            const newMode = e.target.checked ? 'multi' : 'single';
            localStorage.setItem('palletMode', newMode);
            if (typeof updateEnhancedToggleVisuals === 'function') {
                updateEnhancedToggleVisuals(e.target);
            }
            if (typeof updateMultiPalletSettingsVisibility === 'function') {
                updateMultiPalletSettingsVisibility(e.target.checked);
            }
            if (typeof uploadLocalSettings === 'function') {
                uploadLocalSettings();
            }
        });
    }
    
    if (typeof applyFeatureToggles === 'function') {
        applyFeatureToggles();
    }
}

function updateEnhancedToggleVisuals(checkbox) {
    if (!checkbox) return;
    
    const container = checkbox.closest('.enhanced-toggle-container');
    if (!container) return;
    
    const checkmark = container.querySelector('.enhanced-toggle-checkmark');
    
    if (checkbox.checked) {
        container.classList.add('active');
        if (checkmark) checkmark.classList.remove('hidden');
    } else {
        container.classList.remove('active');
        if (checkmark) checkmark.classList.add('hidden');
    }
}

// Pótkocsi / Konténer modul kapcsoló – alapérték KI.
// Hiányzó kulcs és a "true" sztringtől eltérő bármely érték KI (kompenzáció minta).
function isTrailerContainerModuleEnabled() {
    try {
        return localStorage.getItem('toggleTrailerContainer') === 'true';
    } catch (_) {
        return false;
    }
}

// A live modul és a mentett napi lista láthatóságát állítja a modul kapcsoló szerint.
// Kikapcsolt állapotban csak elrejt, tárolt eseményt nem töröl.
function applyTrailerContainerVisibility() {
    const enabled = isTrailerContainerModuleEnabled();
    const ids = ['trailer-container-section', 'full-day-trailer-container-section'];
    ids.forEach(function (id) {
        const el = (typeof document !== 'undefined') ? document.getElementById(id) : null;
        if (el) {
            el.style.display = enabled ? '' : 'none';
        }
    });
    return enabled;
}

function applyFeatureToggles() {
    const special = document.getElementById('special-features');
    if (special) {
        special.style.display = 'block';
    }
    
    // Alapértékek: km, drivetime, pallets → BE; compensation, fourHands → KI
    // Ha nincs beállítva a localStorage-ban (új felhasználó), az alapérték érvényes
    const showKm = localStorage.getItem('toggleKm') !== 'false'; // Alapérték: BE
    const showDriveTime = localStorage.getItem('toggleDriveTime') !== 'false'; // Alapérték: BE
    const showPallets = localStorage.getItem('togglePallets') !== 'false'; // Alapérték: BE
    const showCompensation = localStorage.getItem('toggleCompensation') === 'true'; // Alapérték: KI
    const showTrailerContainer = localStorage.getItem('toggleTrailerContainer') === 'true'; // Alapérték: KI

    const currentLangSafe = (typeof currentLang !== 'undefined') ? currentLang : 'hu';
    const showTachograph = showDriveTime && (typeof window.hasFeatureAccess === 'function' && window.hasFeatureAccess('tachograph'));

    const sections = {
        'km-section': showKm,
        'full-day-vehicle-segments-wrap': showKm,
        'start-km-container': showKm,
        'drivetime-section': showDriveTime,
        'compensation-section-de': showCompensation && currentLangSafe !== 'de',
        'split-rest-container': showDriveTime,
        'driving-mode-section': showDriveTime,
        'menu-item-pallets': showPallets,
        'trailer-container-section': showTrailerContainer,
        'full-day-trailer-container-section': showTrailerContainer,
        'tacho-helper-display': showTachograph,
        'live-allowance-display': showTachograph,
        'menu-item-tachograph': showTachograph,
    };

    for (const id in sections) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = sections[id] ? '' : 'none';
        }
    }

    if (typeof window.FullDayVehicleSegments !== 'undefined' && typeof window.FullDayVehicleSegments.syncVisibility === 'function') {
        window.FullDayVehicleSegments.syncVisibility();
    }

    // Pótkocsi / Konténer modul láthatóság
    applyTrailerContainerVisibility();

    const tachoCardIds = ['tachograph-violations-card', 'weekly-rest-compensation-card', 'mobility-package-prompt-card', 'ninety-hour-weekend-rest-card', 'two-reduced-weekly-rest-card'];
    tachoCardIds.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.style.display = showTachograph ? '' : 'none';
    });
    
    // A kompenzáció toggle konténer láthatósága a beállításokban
    const compensationToggleContainer = document.getElementById('toggleCompensation')?.closest('.enhanced-toggle-container');
    if (compensationToggleContainer) {
        compensationToggleContainer.style.display = currentLangSafe === 'de' ? 'none' : 'flex';
    }

    if (typeof currentActiveTab !== 'undefined') {
        if (!showTachograph && currentActiveTab === 'tachograph') {
            if (typeof window.showTab === 'function') {
                window.showTab('live');
            }
        }
        if (!showPallets && currentActiveTab === 'pallets') {
            if (typeof window.showTab === 'function') {
                window.showTab('live');
            }
        }
    }
}

function checkForAutoExport() {
    const frequency = localStorage.getItem('autoExportFrequency') || 'never';
    
    if (frequency === 'never') {
        return;
    }

    if (typeof records === 'undefined' || typeof palletRecords === 'undefined') {
        console.warn('[Settings] Records not available for auto export check');
        return;
    }

    if (records.length === 0 && palletRecords.length === 0) {
        return;
    }

    const lastExportDateStr = localStorage.getItem('lastAutoExportDate');
    if (!lastExportDateStr) {
        localStorage.setItem('lastAutoExportDate', new Date().toISOString());
        return;
    }

    const lastExportDate = new Date(lastExportDateStr);
    const today = new Date();
    const diffTime = today - lastExportDate;
    let requiredInterval = 0;

    switch (frequency) {
        case 'daily':
            requiredInterval = 24 * 60 * 60 * 1000;
            break;
        case 'weekly':
            requiredInterval = 7 * 24 * 60 * 60 * 1000;
            break;
        case 'monthly':
            requiredInterval = 30 * 24 * 60 * 60 * 1000;
            break;
    }

    if (diffTime > requiredInterval) {
        if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
            const i18n = translations[currentLang];
            console.log(`${i18n.logAutoExportStarted} (${frequency})`);
        }
        
        if (typeof exportData === 'function') {
            exportData();
        }
        localStorage.setItem('lastAutoExportDate', new Date().toISOString());
    }
}

function initializePalletSettings() {
    const toggle = document.getElementById('toggleMultiPallet');
    if (!toggle) return;

    const isMultiPalletMode = localStorage.getItem('palletMode') === 'multi';
    toggle.checked = isMultiPalletMode;
    
    if (typeof updateEnhancedToggleVisuals === 'function') {
        updateEnhancedToggleVisuals(toggle);
    }
    
    if (typeof updateMultiPalletSettingsVisibility === 'function') {
        updateMultiPalletSettingsVisibility(isMultiPalletMode);
    }

    if (typeof renderPalletTypesList === 'function') {
        renderPalletTypesList();
    }
    
    if (typeof renderDocumentTypesList === 'function') {
        renderDocumentTypesList();
    }
}

function updateMultiPalletSettingsVisibility(isVisible) {
    const container = document.getElementById('multi-pallet-settings-container');
    if (!container) {
        console.warn('[Settings] multi-pallet-settings-container not found');
        return;
    }
    
    if (isVisible) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

function getPalletTypes() {
    const savedTypes = JSON.parse(localStorage.getItem('customPalletTypes') || '[]');
    const uniqueTypes = [...new Set(savedTypes)];
    return ['EUR', ...uniqueTypes.filter(t => t !== 'EUR')];
}

function savePalletTypes(types) {
    const customTypes = types.filter(t => t !== 'EUR');
    localStorage.setItem('customPalletTypes', JSON.stringify(customTypes));
}

// === DOCUMENT TYPES MANAGEMENT ===
function getDefaultDocumentTypeName() {
    return localStorage.getItem('defaultDocumentTypeName') || 'Dokumentum';
}

function saveDefaultDocumentTypeName(name) {
    localStorage.setItem('defaultDocumentTypeName', name);
}

function getDocumentTypes() {
    const defaultTypeName = getDefaultDocumentTypeName();
    const savedTypes = JSON.parse(localStorage.getItem('customDocumentTypes') || '[]');
    const uniqueTypes = [...new Set(savedTypes)];
    // Első elem mindig az alapértelmezett (szerkeszthető név)
    return [defaultTypeName, ...uniqueTypes.filter(t => t !== defaultTypeName)];
}

function saveDocumentTypes(types) {
    // Az első típus az alapértelmezett, azt külön tároljuk
    const defaultType = types[0] || 'Dokumentum';
    saveDefaultDocumentTypeName(defaultType);
    
    // A többi egyedi típus
    const customTypes = types.slice(1);
    localStorage.setItem('customDocumentTypes', JSON.stringify(customTypes));
}

function renderPalletTypesList() {
    const listContainer = document.getElementById('pallet-types-list');
    if (!listContainer) return;

    const types = getPalletTypes();
    listContainer.innerHTML = types.map(type => `
        <div class="flex items-center justify-between bg-gray-100 dark:bg-gray-600 p-2 rounded-lg">
            <span class="font-semibold text-gray-800 dark:text-gray-100">${type}</span>
            ${type !== 'EUR' ? `<button onclick="deletePalletType('${type}')" class="text-red-500 hover:text-red-700 text-xl font-bold">×</button>` : ''}
        </div>
    `).join('');
}

function addPalletType() {
    if (typeof translations === 'undefined' || typeof currentLang === 'undefined') {
        console.warn('[Settings] Translations not available');
        return;
    }

    const i18n = translations[currentLang];
    const input = document.getElementById('newPalletTypeName');
    if (!input) return;

    const newType = input.value.trim().toUpperCase();

    if (!newType) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.palletTypeNameEmpty, 'info');
        }
        return;
    }

    const currentTypes = getPalletTypes();
    if (currentTypes.includes(newType)) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.palletTypeExists, 'info');
        }
        return;
    }

    currentTypes.push(newType);
    savePalletTypes(currentTypes);
    
    if (typeof renderPalletTypesList === 'function') {
        renderPalletTypesList();
    }
    
    input.value = '';
    
    if (typeof uploadLocalSettings === 'function') {
        uploadLocalSettings();
    }
}

function deletePalletType(typeToDelete) {
    if (typeof translations === 'undefined' || typeof currentLang === 'undefined') {
        console.warn('[Settings] Translations not available');
        return;
    }

    const i18n = translations[currentLang];
    const confirmMessage = i18n.deletePalletTypeConfirm.replace('{type}', typeToDelete);
    
    if (typeof showCustomAlert === 'function') {
        showCustomAlert(confirmMessage, 'warning', () => {
            let currentTypes = getPalletTypes();
            currentTypes = currentTypes.filter(t => t !== typeToDelete);
            savePalletTypes(currentTypes);
            
            if (typeof renderPalletTypesList === 'function') {
                renderPalletTypesList();
            }
            
            if (typeof uploadLocalSettings === 'function') {
                uploadLocalSettings();
            }
        });
    }
}

function updateDefaultDocumentTypeName(newName) {
    const trimmedName = newName.trim();
    if (!trimmedName) {
        if (typeof showCustomAlert === 'function') {
            const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
            showCustomAlert(i18n.settingsDefaultTypeNameEmpty || 'The default type name cannot be empty!', 'info');
        }
        renderDocumentTypesList();
        return;
    }
    
    saveDefaultDocumentTypeName(trimmedName);
    renderDocumentTypesList();
    
    if (typeof uploadLocalSettings === 'function') {
        uploadLocalSettings();
    }
}

function renderDocumentTypesList() {
    const listContainer = document.getElementById('document-types-list');
    if (!listContainer) return;

    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || translations['en'] || {}) : {};
    const defaultPlaceholder = i18n.settingsDefaultTypePlaceholder || 'Default type name';
    const defaultBadge = i18n.settingsDefaultTypeBadge || 'default';

    const types = getDocumentTypes();
    
    listContainer.innerHTML = types.map((type, index) => {
        const isDefault = index === 0; // Első elem az alapértelmezett
        const displayName = type;
        
        if (isDefault) {
            // Alapértelmezett típus - szerkeszthető, de nem törölhető
            return `
            <div class="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-2 rounded-lg">
                <input type="text" value="${displayName}" 
                       onchange="updateDefaultDocumentTypeName(this.value)"
                       class="flex-1 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm font-semibold text-gray-800 dark:text-gray-100"
                       placeholder="${defaultPlaceholder}" />
                <span class="text-xs text-blue-600 dark:text-blue-400 whitespace-nowrap">${defaultBadge}</span>
            </div>`;
        } else {
            // Egyedi típusok - törölhetők
            return `
            <div class="flex items-center justify-between bg-gray-100 dark:bg-gray-600 p-2 rounded-lg">
                <span class="font-semibold text-gray-800 dark:text-gray-100">${displayName}</span>
                <button onclick="deleteDocumentType('${type}')" class="text-red-500 hover:text-red-700 text-xl font-bold">×</button>
            </div>`;
        }
    }).join('');
}

function addDocumentType() {
    if (typeof translations === 'undefined' || typeof currentLang === 'undefined') {
        console.warn('[Settings] Translations not available');
        return;
    }

    const i18n = translations[currentLang];
    const input = document.getElementById('newDocumentTypeName');
    if (!input) return;

    const newType = input.value.trim();

    if (!newType) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.documentTypeNameEmpty || 'Adj meg egy típusnevet!', 'info');
        }
        return;
    }

    const currentTypes = getDocumentTypes();
    if (currentTypes.some(t => t.toLowerCase() === newType.toLowerCase())) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(i18n.documentTypeExists || 'Ez a típus már létezik!', 'info');
        }
        return;
    }

    currentTypes.push(newType);
    saveDocumentTypes(currentTypes);
    
    if (typeof renderDocumentTypesList === 'function') {
        renderDocumentTypesList();
    }
    
    input.value = '';
    
    if (typeof uploadLocalSettings === 'function') {
        uploadLocalSettings();
    }
}

function renameDocumentType(oldName, newName) {
    const trimmed = (newName || '').trim();
    if (!trimmed) return false;

    const types = getDocumentTypes();
    const idx = types.findIndex(t => t === oldName);
    if (idx < 0) return false;

    if (types.some((t, i) => i !== idx && String(t).toLowerCase() === trimmed.toLowerCase())) {
        return false;
    }

    types[idx] = trimmed;
    saveDocumentTypes(types);

    if (typeof renderDocumentTypesList === 'function') {
        renderDocumentTypesList();
    }

    if (typeof uploadLocalSettings === 'function') {
        uploadLocalSettings();
    }

    return true;
}

function deleteDocumentType(typeToDelete) {
    if (typeof translations === 'undefined' || typeof currentLang === 'undefined') {
        console.warn('[Settings] Translations not available');
        return;
    }

    const i18n = translations[currentLang];
    const confirmMessage = (i18n.deleteDocumentTypeConfirm || 'Biztosan törlöd a(z) {type} típust?').replace('{type}', typeToDelete);
    
    if (typeof showCustomAlert === 'function') {
        showCustomAlert(confirmMessage, 'warning', () => {
            let currentTypes = getDocumentTypes();
            currentTypes = currentTypes.filter(t => t !== typeToDelete);
            saveDocumentTypes(currentTypes);
            
            if (typeof renderDocumentTypesList === 'function') {
                renderDocumentTypesList();
            }
            
            if (typeof uploadLocalSettings === 'function') {
                uploadLocalSettings();
            }

            if (typeof window.onDocumentTypesChanged === 'function') {
                try { window.onDocumentTypesChanged({ action: 'delete', type: typeToDelete }); } catch (_) {}
            }
        });
    }
}

// =======================================================
// ===== TIMEZONE WARNING RESET ==========================
// =======================================================

/**
 * Visszaállítja az időzóna figyelmeztetést
 */
async function resetTimezoneWarning() {
    try {
        // Töröljük a localStorage-ból
        localStorage.removeItem('timezoneWarningDismissed');
        
        // Frissítjük a Firestore-ban
        if (typeof window.saveSettingsToFirestore === 'function') {
            await window.saveSettingsToFirestore({ timezoneWarningDismissed: false });
        }
        
        // Frissítjük a helyi cache-t is
        if (typeof window.userSettings !== 'undefined' && window.userSettings) {
            window.userSettings.timezoneWarningDismissed = false;
        }
        
        if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && typeof showCustomAlert === 'function') {
            const i18n = translations[currentLang];
            showCustomAlert(i18n?.timezoneWarningReset || 'Időzóna figyelmeztetés visszaállítva.', 'success');
        }
    } catch (e) {
        console.error('Failed to reset timezone warning:', e);
        if (typeof showCustomAlert === 'function') {
            const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
                ? (translations[currentLang] || {})
                : {};
            const msg = i18n.timezoneWarningResetError || 'Hiba történt a visszaállítás során.';
            showCustomAlert(msg, 'info');
        }
    }
}

// === Append legal info to bottom of Settings tab (non-sticky) ===
(function() {
    function insertLegalIntoSettings() {
        try {
            const cont = document.getElementById('content-settings');
            if (!cont) return;
            if (document.getElementById('legal-info-settings')) return;
            
            const v = (typeof window !== 'undefined' && window.APP_INFO && window.APP_INFO.version) 
                ? window.APP_INFO.version 
                : '4.01.28';
            
            const legal = document.createElement('div');
            legal.id = 'legal-info-settings';
            legal.className = 'text-xs text-gray-400 my-3 text-center';
            legal.innerHTML = `© 2025 Princz Attila | GuriGO — <a href="mailto:info@gurigo.eu" class="underline">info@gurigo.eu</a> | v${v}`;
            cont.appendChild(legal);
        } catch(e) { 
            console.warn('[Settings] Legal info injection failed', e); 
        }
    }
    
    // Run on load and whenever Settings tab is likely shown
    setTimeout(insertLegalIntoSettings, 0);
    
    document.addEventListener('click', (e) => {
        const t = e.target;
        if (!t) return;
        
        // Catch clicks that open the settings tab
        if ((t.closest && t.closest('[data-goto-tab="settings"]')) || (t.dataset && t.dataset.tab === 'settings')) {
            setTimeout(insertLegalIntoSettings, 0);
        }
    });
    
    if (typeof window !== 'undefined') {
        window.addEventListener('pageshow', () => setTimeout(insertLegalIntoSettings, 0));
    }
})();

// Vezetési idő mód inicializálása
function initializeDrivingTimeMode() {
    const selector = document.getElementById('drivingTimeModeSelector');
    if (!selector) return;
    
    // Betöltés localStorage-ból vagy default 'weekly'
    const savedMode = localStorage.getItem('drivingTimeMode') || 'weekly';
    selector.value = savedMode;
    
    // Event listener: mentés változáskor
    selector.addEventListener('change', (e) => {
        const newMode = e.target.value;
        localStorage.setItem('drivingTimeMode', newMode);
        console.log('[Settings] Driving time mode changed to:', newMode);
        
        // Sync to Firebase
        if (typeof uploadLocalSettings === 'function') {
            uploadLocalSettings();
        }
        
        // Frissítsd a UI-t ha szükséges
        if (typeof updateDriveTimeInputVisibility === 'function') {
            updateDriveTimeInputVisibility(newMode);
        }
        
        // Értesítés
        if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && typeof showCustomAlert === 'function') {
            const i18n = translations[currentLang];
            showCustomAlert(i18n.settingsSaved || 'Beállítás mentve!', 'success');
        }
    });
}

// Globális függvények exportálása
if (typeof window !== 'undefined') {
    window.uploadLocalSettings = uploadLocalSettings;
    window.refreshToggleVisuals = refreshToggleVisuals;
    window.saveSettings = saveSettings;
    window.loadSettings = loadSettings;
    window.exportData = exportData;
    window.importData = importData;
    window.initializeFeatureToggles = initializeFeatureToggles;
    window.updateEnhancedToggleVisuals = updateEnhancedToggleVisuals;
    window.applyFeatureToggles = applyFeatureToggles;
    window.isTrailerContainerModuleEnabled = isTrailerContainerModuleEnabled;
    window.applyTrailerContainerVisibility = applyTrailerContainerVisibility;
    window.checkForAutoExport = checkForAutoExport;
    window.initializePalletSettings = initializePalletSettings;
    window.updateMultiPalletSettingsVisibility = updateMultiPalletSettingsVisibility;
    window.getPalletTypes = getPalletTypes;
    window.savePalletTypes = savePalletTypes;
    window.renderPalletTypesList = renderPalletTypesList;
    window.addPalletType = addPalletType;
    window.deletePalletType = deletePalletType;
    
    window.getDocumentTypes = getDocumentTypes;
    window.saveDocumentTypes = saveDocumentTypes;
    window.getDefaultDocumentTypeName = getDefaultDocumentTypeName;
    window.saveDefaultDocumentTypeName = saveDefaultDocumentTypeName;
    window.updateDefaultDocumentTypeName = updateDefaultDocumentTypeName;
    window.renderDocumentTypesList = renderDocumentTypesList;
    window.addDocumentType = addDocumentType;
    window.renameDocumentType = renameDocumentType;
    window.deleteDocumentType = deleteDocumentType;
    window.resetTimezoneWarning = resetTimezoneWarning;
    window.initReferralSection = initReferralSection;
    window.checkAndShowReferralPopup = checkAndShowReferralPopup;
    window.getReportLanguage = function getReportLanguage() {
        const uiLang = (typeof currentLang === 'string' && currentLang) ? currentLang : (localStorage.getItem('language') || 'hu');
        return localStorage.getItem('reportLanguage') || uiLang;
    };
    window.initializeDrivingTimeMode = initializeDrivingTimeMode;
    window.toggleFourHandsMode = toggleFourHandsMode;
}

// 4 kézes mód toggle kezelése
function toggleFourHandsMode(checkbox) {
    const isEnabled = checkbox.checked;
    localStorage.setItem('fourHandsEnabled', isEnabled ? 'true' : 'false');
    
    if (typeof updateEnhancedToggleVisuals === 'function') {
        updateEnhancedToggleVisuals(checkbox);
    }
    
    if (typeof uploadLocalSettings === 'function') {
        uploadLocalSettings();
    }
    
    if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && typeof showCustomAlert === 'function') {
        const i18n = translations[currentLang];
        const message = isEnabled ? i18n.fourHandsPopupOn : i18n.fourHandsPopupOff;
        showCustomAlert(message, 'success');
    }

    // Szándékosan NINCS tacho status/helper újrarajzolás:
    // a kapcsoló csak a következő műszak alapértelmezését menti (fourHandsEnabled).
    // Státusz/helper/elemzés kizárólag record.drivingMode (+ sticky migration) alapján számol;
    // lezárt és már elindított műszak UI-ja a toggle-től nem változhat.
}

// =======================================================
// ===== RIPORT BEÁLLÍTÁSOK ==============================
// =======================================================

function getDefaultReportSettings() {
    return {
        showStartTime: true,
        showStartLocation: true,
        showEndTime: true,
        showEndLocation: true,
        showCrossings: true,
        showWorkTime: true,
        showNightTime: true,
        showDriveTime: true,
        showKmBlock: false,
        showNote: false,
        showVehicle: false,
        showTrailerContainerEvents: false
    };
}

function getReportSettings() {
    try {
        const stored = localStorage.getItem('reportSettings');
        if (stored) {
            return { ...getDefaultReportSettings(), ...JSON.parse(stored) };
        }
    } catch (e) {
        console.warn('[Settings] Error parsing reportSettings:', e);
    }
    return getDefaultReportSettings();
}

function saveReportSettings(settings) {
    try {
        localStorage.setItem('reportSettings', JSON.stringify(settings));
        if (typeof uploadLocalSettings === 'function') {
            uploadLocalSettings();
        }
    } catch (e) {
        console.warn('[Settings] Error saving reportSettings:', e);
    }
}

var REPORT_SETTINGS_FIELD_ID_MAP = {
    reportFieldStartTime: 'showStartTime',
    reportFieldStartLocation: 'showStartLocation',
    reportFieldEndTime: 'showEndTime',
    reportFieldEndLocation: 'showEndLocation',
    reportFieldCrossings: 'showCrossings',
    reportFieldWorkTime: 'showWorkTime',
    reportFieldNightTime: 'showNightTime',
    reportFieldDriveTime: 'showDriveTime',
    reportFieldKmBlock: 'showKmBlock',
    reportFieldNote: 'showNote',
    reportFieldVehicle: 'showVehicle',
    reportFieldTrailerContainer: 'showTrailerContainerEvents'
};

var REPORT_PAGE_FIELD_ID_MAP = {
    reportPageFieldStartTime: 'showStartTime',
    reportPageFieldStartLocation: 'showStartLocation',
    reportPageFieldEndTime: 'showEndTime',
    reportPageFieldEndLocation: 'showEndLocation',
    reportPageFieldCrossings: 'showCrossings',
    reportPageFieldWorkTime: 'showWorkTime',
    reportPageFieldNightTime: 'showNightTime',
    reportPageFieldDriveTime: 'showDriveTime',
    reportPageFieldKmBlock: 'showKmBlock',
    reportPageFieldNote: 'showNote',
    reportPageFieldVehicle: 'showVehicle',
    reportPageFieldTrailerContainer: 'showTrailerContainerEvents'
};

function syncReportLanguageSelectorsFromStorage() {
    const uiLang = (typeof currentLang === 'string' && currentLang) ? currentLang : (localStorage.getItem('language') || 'hu');
    const saved = localStorage.getItem('reportLanguage') || uiLang;
    ['reportLanguageSelector', 'reportPageLanguageSelector'].forEach(function (selId) {
        const sel = document.getElementById(selId);
        if (sel) sel.value = saved;
    });
}

function syncReportFieldTogglesFromStorage() {
    const s = getReportSettings();
    [REPORT_SETTINGS_FIELD_ID_MAP, REPORT_PAGE_FIELD_ID_MAP].forEach(function (map) {
        Object.keys(map).forEach(function (id) {
            const cb = document.getElementById(id);
            if (!cb) return;
            const key = map[id];
            const val = !!s[key];
            if (cb.checked !== val) {
                cb.checked = val;
                if (typeof updateEnhancedToggleVisuals === 'function') {
                    updateEnhancedToggleVisuals(cb);
                }
            }
        });
    });
}

function bindReportLanguageSelector(selectId, showSavedToast) {
    try {
        const sel = document.getElementById(selectId);
        if (!sel || sel.dataset.reportLangBound === '1') return;
        sel.dataset.reportLangBound = '1';
        const uiLang = (typeof currentLang === 'string' && currentLang) ? currentLang : (localStorage.getItem('language') || 'hu');
        const saved = localStorage.getItem('reportLanguage') || uiLang;
        sel.value = saved;
        sel.addEventListener('change', function (e) {
            const val = e.target.value || uiLang;
            localStorage.setItem('reportLanguage', val);
            if (typeof uploadLocalSettings === 'function') { uploadLocalSettings(); }
            syncReportLanguageSelectorsFromStorage();
            if (showSavedToast && typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && typeof showCustomAlert === 'function') {
                const i18n = translations[currentLang];
                showCustomAlert(i18n.settingsSaved, 'success');
            }
        });
    } catch (_) {}
}

function bindReportFieldToggles(idMap) {
    Object.keys(idMap).forEach(function (id) {
        const key = idMap[id];
        const checkbox = document.getElementById(id);
        if (!checkbox || checkbox.dataset.reportFieldBound === '1') return;
        checkbox.dataset.reportFieldBound = '1';
        checkbox.addEventListener('change', function (e) {
            const latest = getReportSettings();
            latest[key] = !!e.target.checked;
            saveReportSettings(latest);
            if (typeof updateEnhancedToggleVisuals === 'function') {
                updateEnhancedToggleVisuals(e.target);
            }
            syncReportFieldTogglesFromStorage();
        });
    });
}

function initReportSettingsUI() {
    bindReportLanguageSelector('reportLanguageSelector', true);
    bindReportFieldToggles(REPORT_SETTINGS_FIELD_ID_MAP);
    syncReportFieldTogglesFromStorage();
    syncReportLanguageSelectorsFromStorage();
}

function initReportPageSettingsUI() {
    bindReportLanguageSelector('reportPageLanguageSelector', false);
    bindReportFieldToggles(REPORT_PAGE_FIELD_ID_MAP);
    syncReportFieldTogglesFromStorage();
    syncReportLanguageSelectorsFromStorage();
}

// Globális elérhetőség
window.getReportSettings = getReportSettings;
window.saveReportSettings = saveReportSettings;
window.initReportPageSettingsUI = initReportPageSettingsUI;