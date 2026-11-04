// === LOGGED-OUT UI RESET (centralizált) ===
console.log('[database.js] loaded build production-offline-shift1');
// A .bottom-nav, #moreMenu és #overlay a #app konténeren KÍVÜL van a DOM-ban.
// Láthatóság: body.gurigo-app-shell-active + #app:not(.hidden) (CSS), nem inline style.
function setAppShellChromeVisible(visible) {
  try {
    var body = document.body;
    if (body) {
      if (visible) {
        body.classList.remove('gurigo-logged-out', 'gurigo-auth-boot');
        body.classList.add('gurigo-app-shell-active');
      } else {
        body.classList.remove('gurigo-app-shell-active');
        if (!body.classList.contains('gurigo-auth-boot')) {
          body.classList.add('gurigo-logged-out');
        }
      }
    }
    var nav = document.querySelector('.bottom-nav');
    if (nav) nav.style.removeProperty('display');
    var moreMenu = document.getElementById('moreMenu');
    if (moreMenu) {
      moreMenu.classList.remove('show');
      moreMenu.style.removeProperty('display');
    }
    var overlay = document.getElementById('overlay');
    if (overlay) overlay.classList.remove('show');
    if (typeof window.closeSettingsMenu === 'function') {
      try { window.closeSettingsMenu(); } catch (_) {}
    }
    if (typeof window.closeMoreMenu === 'function') {
      try { window.closeMoreMenu(); } catch (_) {}
    }
    if (visible && typeof window.scheduleHeaderDateChipRender === 'function') {
      try { window.scheduleHeaderDateChipRender(); } catch (_) {}
    }
  } catch (e) {
    console.warn('[Auth][ui] setAppShellChromeVisible failed:', e);
  }
}

function setGurigoAuthBootState(active) {
  try {
    var body = document.body;
    if (!body) return;
    if (active) {
      body.classList.remove('gurigo-app-shell-active', 'gurigo-logged-out');
      body.classList.add('gurigo-auth-boot');
      var moreMenu = document.getElementById('moreMenu');
      if (moreMenu) {
        moreMenu.classList.remove('show');
        moreMenu.style.removeProperty('display');
      }
      var overlay = document.getElementById('overlay');
      if (overlay) overlay.classList.remove('show');
      if (typeof window.closeSettingsMenu === 'function') {
        try { window.closeSettingsMenu(); } catch (_) {}
      }
      if (typeof window.closeMoreMenu === 'function') {
        try { window.closeMoreMenu(); } catch (_) {}
      }
    } else {
      body.classList.remove('gurigo-auth-boot');
    }
  } catch (e) {
    console.warn('[Auth][ui] setGurigoAuthBootState failed:', e);
  }
}

// Központi logged-out render: nincs vendég mód, minden nem-authenticated
// állapotnak a teljes login/auth képernyőre kell vezetnie.
function renderLoggedOutState() {
  // OAuth redirect boot folyamatban – a boot flow rendezi a UI-t, ne villantsunk logint
  if (window.__oauthRedirectBootPending === true || window.__iosRedirectPending === true) {
    return;
  }
  try {
    var authScreen = document.getElementById('auth-screen');
    var appScreen = document.getElementById('app');
    if (authScreen) authScreen.classList.remove('hidden');
    if (appScreen) appScreen.classList.add('hidden');
    setAppShellChromeVisible(false);
    // Aktív nézet visszaállítása alapállapotra, hogy újra-bejelentkezéskor ne stale nézet fogadjon
    document.querySelectorAll('[id^="content-"]').forEach(function (c) { c.classList.add('hidden'); });
    var defaultTabContent = document.getElementById('content-live');
    if (defaultTabContent) defaultTabContent.classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(function (item) { item.classList.remove('active'); });
    var liveNavItem = document.querySelector('.nav-item[data-tab="live"]');
    if (liveNavItem) liveNavItem.classList.add('active');
    if (typeof updateAuthUI === 'function') updateAuthUI(null);
  } catch (e) {
    console.warn('[Auth][ui] renderLoggedOutState failed:', e);
  }
}
window.setAppShellChromeVisible = setAppShellChromeVisible;
window.setGurigoAuthBootState = setGurigoAuthBootState;
window.renderLoggedOutState = renderLoggedOutState;

// === AUTH STATE CHANGE HANDLER (integrated with subscriptions) ===
async function handleAuthStateChange(user) {
  window.currentUser = user;

  const splashScreen = document.getElementById('splash-screen');
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app');

  if (splashScreen && !splashScreen.classList.contains('hidden')) {
    splashScreen.classList.add('hidden');
    setTimeout(function(){ splashScreen.style.display = 'none'; }, 500);
  }

  if (user) {
    console.log('[Database] Signed in');
    // Start each session with an unresolved entitlement state; the old user's Pro must not leak.
    if (typeof window.resetEntitlementState === 'function') {
      try { window.resetEntitlementState(); } catch (_) {}
    }
    window.currentUserSubscription = { __entitlementResolved: false, __entitlementResolvedFor: user.uid };
    if (authScreen) authScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');
    setAppShellChromeVisible(true);
    if (typeof updateAuthUI === 'function') updateAuthUI(user);
    if (typeof window.updateWaybillMenuVisibility === 'function') window.updateWaybillMenuVisibility();
    if (typeof window.updateVehiclesMenuVisibility === 'function') window.updateVehiclesMenuVisibility();
    if (typeof window.updateFuelingMenuVisibility === 'function') window.updateFuelingMenuVisibility();
    try {
      if (typeof window.ensureFirestorePersistence === 'function') {
        await window.ensureFirestorePersistence();
      }
    } catch (persistErr) {
      console.warn('[Database] ensureFirestorePersistence failed:', persistErr && persistErr.message);
    }
    try {
      if (typeof loadUserSubscription === 'function') {
        await loadUserSubscription(user.uid);
      }
    } catch (e) {
      console.warn('[Database] loadUserSubscription failed (offline?), continuing:', e && e.message);
    }

    try {
      if (typeof window.checkAndShowTrialUpsellPrompt === 'function') {
        await window.checkAndShowTrialUpsellPrompt();
      }
    } catch (e) {
      console.warn('Trial upsell prompt check failed:', e);
    }
    
    // Track login (GDPR-compliant)
    if (window.ActivityTracker && typeof window.ActivityTracker.trackLogin === 'function') {
      window.ActivityTracker.trackLogin().catch(err => console.warn('Login tracking failed:', err));
    }

    if (typeof navigator !== 'undefined' && navigator.onLine && typeof window.reconcileWaybillPalletLinks === 'function') {
      var records = typeof window.getPalletRecords === 'function' ? window.getPalletRecords() : [];
      window.reconcileWaybillPalletLinks(user.uid, Array.isArray(records) ? records : []).catch(function(e) { console.warn('[Reconcile] waybill-pallet links:', e && e.message); });
    }

    // Tracking adatok mentése (UTM paraméterek - last-touch update)
    // Throttling: csak akkor írunk, ha van új adat és újabb timestamp
    try {
      if (typeof window.utmTracker !== 'undefined') {
        const localLastTouch = window.utmTracker.getLastTouch();
        
        // Ha nincs local last-touch, skip
        if (!localLastTouch || !localLastTouch.utm_source) {
          console.log('[Database] No local last-touch data, skipping update');
        } else {
          // Firestore tracking.lastTouch timestamp ellenőrzése
          const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
          const userData = userDoc.exists ? userDoc.data() : {};
          const remoteLastTouch = userData.tracking?.lastTouch;
          
          let shouldUpdate = true;
          
          if (remoteLastTouch && remoteLastTouch.timestamp && localLastTouch.timestamp) {
            const remoteTime = new Date(remoteLastTouch.timestamp).getTime();
            const localTime = new Date(localLastTouch.timestamp).getTime();
            
            // Csak akkor frissítünk, ha local újabb
            if (localTime <= remoteTime) {
              shouldUpdate = false;
              console.log('[Database] Local last-touch not newer than remote, skipping update');
            }
          }
          
          if (shouldUpdate && typeof window.utmTracker.updateLastTouchInFirestore === 'function') {
            await window.utmTracker.updateLastTouchInFirestore(user.uid);
            console.log('[Database] Last-touch tracking updated for returning user');
          }
        }
      }
    } catch (trackErr) {
      console.warn('[Database] Tracking update failed:', trackErr);
    }

    try {
      if (typeof loadSettingsFromFirestore === 'function') {
        await loadSettingsFromFirestore();
      }
    } catch (e) {
      console.warn('[Database] loadSettingsFromFirestore failed (offline?), using defaults:', e && e.message);
    }
    // Sync local UI language (and other settings) up so transactional emails use the right lang
    try {
      if (typeof uploadLocalSettings === 'function') {
        await uploadLocalSettings();
      }
    } catch (e) {
      console.warn('[Database] uploadLocalSettings after login failed:', e && e.message);
    }
    try {
      if (typeof subscribeRecordsFromFirestore === 'function') {
        subscribeRecordsFromFirestore();
      }
    } catch (e) {
      console.warn('[Database] subscribeRecordsFromFirestore failed (offline?):', e && e.message);
    }
    if (navigator.onLine && typeof refreshRecordsFromServer === 'function') {
      try {
        await refreshRecordsFromServer({ force: true });
      } catch (refreshErr) {
        console.warn('[Database] refreshRecordsFromServer on login failed (policy not extended):', refreshErr && refreshErr.message);
      }
    }

    // === ÚJ: Aktív műszak felhő szinkron betöltés + feliratkozás ===
    try {
      if (window.activeShiftUnsubscribe) { try { window.activeShiftUnsubscribe(); } catch(_) {} }
      if (typeof loadActiveShiftOnce === 'function') {
        await loadActiveShiftOnce();
      }
      if (typeof subscribeActiveShift === 'function') {
        window.activeShiftUnsubscribe = subscribeActiveShift();
      }
    } catch(_) {}

    if (typeof renderApp === 'function') await renderApp();
    if (typeof window.refreshOfflinePolicyUi === 'function') {
      try { window.refreshOfflinePolicyUi(); } catch (_) {}
    }

    // Újdonságok / közlemények piros pötty
    try {
      const runDots = function () {
        try {
          if (typeof window.refreshWhatsNewUnreadDots === 'function') {
            window.refreshWhatsNewUnreadDots();
          }
        } catch (_) {}
      };
      runDots();
      setTimeout(runDots, 500);
      setTimeout(runDots, 2000);
    } catch (_) {}

  } else {
    if (typeof window.awaitAuthBootIfNeeded === 'function') {
      await window.awaitAuthBootIfNeeded();
      if (firebase.auth().currentUser) {
        return handleAuthStateChange(firebase.auth().currentUser);
      }
    }
    // OAuth redirect boot folyamatban – ne mutassunk login képernyőt
    if (window.__oauthRedirectBootPending === true || window.__iosRedirectPending === true) {
      console.log('[auth][ui] redirect boot pending, defer login screen');
      return;
    }

    // EXTRA BIZTONSÁG: Ha URL-ben még mindig redirect paraméterek vannak, a login UI-t
    // késleltetjük, de a user-specifikus cache/listener cleanup ettől függetlenül lefut.
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code') || urlParams.has('state')) {
      console.log('[Auth] Redirect params still in URL, delaying login screen show');
      setTimeout(() => {
        if (!firebase.auth().currentUser && window.__iosRedirectPending !== true) {
          console.log('[Auth] Delayed login screen show - no user and redirect not pending');
          renderLoggedOutState();
        }
      }, 500);
    } else {
      console.log('Kijelentkezve, bejelentkezési képernyő mutatása.');
      renderLoggedOutState();
    }
    if (typeof window.updateWaybillMenuVisibility === 'function') window.updateWaybillMenuVisibility();
    if (typeof window.updateVehiclesMenuVisibility === 'function') window.updateVehiclesMenuVisibility();
    if (typeof window.updateFuelingMenuVisibility === 'function') window.updateFuelingMenuVisibility();

    // === ÚJ: ELŐFIZETÉS TÖRLÉSE ===
    if (typeof window.resetEntitlementState === 'function') {
      try { window.resetEntitlementState(); } catch (_) {}
    } else {
      window.currentUserSubscription = { __entitlementResolved: false };
      try { window.__gurigoLastNotifiedPresentation = 'unknown'; } catch (_) {}
    }
    window.records = [];
    window.palletRecords = [];
    window._palletsLoaded = false;
    window._palletsLoading = false;
    _palletsLoadPromise = null;
    window._recordsActiveList = [];
    try {
      if (typeof DocumentsDataService !== 'undefined' && DocumentsDataService.resetState) {
        DocumentsDataService.resetState();
      }
    } catch (_) {}
    try {
      if (typeof window.resetVehiclesCache === 'function') window.resetVehiclesCache();
    } catch (_) {}
    try {
      if (window.FuelingService && typeof window.FuelingService.resetCache === 'function') window.FuelingService.resetCache();
    } catch (_) {}
    try {
      if (typeof palletRecords !== 'undefined') {
        palletRecords = [];
      }
    } catch (_) {}

    // Records real-time listener leállítása
    try { if (window._recordsSnapshotUnsubscribe) { window._recordsSnapshotUnsubscribe(); } } catch(_) {}
    window._recordsSnapshotUnsubscribe = null;
    window._recordsListenerActive = false;
    window._recordsListenerUid = null;
    window._recordsActiveList = [];
    window._recordsOlderArchive = [];
    window._recordsOlderPaging = { hasMore: true, lastDoc: null, loading: false };
    window._recordsActiveCutoffDate = null;
    window._reportYearNoteDays = [];
    try {
      if (window.StatisticsDataService && typeof window.StatisticsDataService.invalidateStatisticsCache === 'function') {
        window.StatisticsDataService.invalidateStatisticsCache();
      } else {
        window._statisticsDataCache = {};
      }
    } catch (_) {}
    window._lastRefreshRecordsFromServerAt = 0;

    // === ÚJ: Aktív műszak feliratkozás leállítása és lokális tisztítás ===
    try { if (window.activeShiftUnsubscribe) { window.activeShiftUnsubscribe(); } } catch(_) {}
    window.activeShiftUnsubscribe = null;
    try { localStorage.removeItem('activeShift'); } catch(_) {}
    if (window.currentUser && typeof window.clearActiveShiftLocalCache === 'function') {
      try { window.clearActiveShiftLocalCache(window.currentUser.uid); } catch (_) {}
    }
    if (window.currentUser && window.currentUser.uid) {
      var uid = window.currentUser.uid;
      try {
        localStorage.removeItem('gurigo_failed_workday_sync_v1:' + uid);
        localStorage.removeItem('gurigo_failed_active_shift_sync_v1:' + uid);
        localStorage.removeItem('gurigo_pending_workday_sync_v1:' + uid);
      } catch (_) {}
      if (typeof window.clearOfflinePolicyForUid === 'function') {
        try { window.clearOfflinePolicyForUid(uid); } catch (_) {}
      }
    }
    window._syncConflictSuspects = {};
    window.activeShift = null;
    window._activeShiftClearPending = false;
  }
}

// --- Rekord típusok: noteDay + absenceType (szabadság/betegség) + isHoliday (ünnep) ---
var GURIGO_ABSENCE_TYPES = ['vacation', 'sick'];
function isWorkdayRecord(r) {
  return !r || !r.entryType || r.entryType === 'workday';
}
function isNoteDayRecord(r) {
  return r && r.entryType === 'noteDay';
}
function isTypedAbsenceNoteDay(r) {
  return isNoteDayRecord(r) && GURIGO_ABSENCE_TYPES.indexOf(r && r.absenceType) !== -1;
}
function isVacationNoteDay(r) {
  return isNoteDayRecord(r) && r.absenceType === 'vacation';
}
function isSickNoteDay(r) {
  return isNoteDayRecord(r) && r.absenceType === 'sick';
}
function isHolidayRecord(r) {
  return r && r.isHoliday === true;
}

function assertNoteDayDaySlot(list, date, i18n, excludeId) {
  const existingWorkday = list.find(function (r) {
    const rType = (r && r.entryType) ? r.entryType : 'workday';
    return String(r.date || '') === date && rType !== 'noteDay';
  });
  if (existingWorkday) {
    throw new Error(i18n.errorDayHasWork || 'Erre a napra már van munkaidő.');
  }
  const other = list.find(function (r) {
    if (!r || r.entryType !== 'noteDay') return false;
    if (String(r.date || '') !== date) return false;
    if (excludeId && String(r.id) === String(excludeId)) return false;
    return true;
  });
  if (other) {
    throw new Error(i18n.errorDuplicateNoteDaySameDate || 'Erre a napra már van másik megjegyzés-nap bejegyzés.');
  }
}

/** Lokális cache: nincs FieldValue; isHoliday csak ha true; absenceType csak vacation/sick noteDay-nél. */
function sanitizeRecordForLocalCache(r) {
  if (!r || typeof r !== 'object') return r;
  var c = Object.assign({}, r);
  if (!(c.absenceType === 'vacation' || c.absenceType === 'sick')) {
    delete c.absenceType;
  }
  if (!c.entryType || c.entryType === 'workday') {
    delete c.absenceType;
    if (typeof getHolidayDatesForRecord === 'function') {
      var wdDates = getHolidayDatesForRecord(c);
      if (wdDates.length) {
        c.holidayDates = wdDates;
        c.isHoliday = true;
      } else {
        delete c.holidayDates;
        delete c.isHoliday;
      }
    } else if (c.isHoliday !== true) {
      delete c.isHoliday;
      delete c.holidayDates;
    }
  } else if (c.isHoliday !== true) {
    delete c.isHoliday;
  }
  return c;
}

/** Firestore merge: absenceType / isHoliday törlése, ha nem tartjuk meg. */
function buildRecordFirestoreWritePayload(r) {
  var p = Object.assign({}, r);
  var fv = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
    ? firebase.firestore.FieldValue
    : null;
  var et = (r && r.entryType) ? r.entryType : 'workday';
  if (!fv) {
    if (!et || et === 'workday') {
      delete p.absenceType;
      var wdDates0 = (typeof getHolidayDatesForRecord === 'function') ? getHolidayDatesForRecord(r) : [];
      if (wdDates0.length) {
        p.holidayDates = wdDates0;
        p.isHoliday = true;
      } else {
        delete p.holidayDates;
        delete p.isHoliday;
      }
    } else if (et === 'noteDay') {
      if (!(p.absenceType === 'vacation' || p.absenceType === 'sick')) delete p.absenceType;
      if (p.isHoliday !== true) delete p.isHoliday;
    }
    return p;
  }
  if (!et || et === 'workday') {
    p.absenceType = fv.delete();
    var wdDates = (typeof getHolidayDatesForRecord === 'function') ? getHolidayDatesForRecord(r) : [];
    if (wdDates.length) {
      p.holidayDates = wdDates;
      p.isHoliday = true;
    } else {
      p.holidayDates = fv.delete();
      p.isHoliday = fv.delete();
    }
  } else if (et === 'noteDay') {
    if (r && (r.absenceType === 'vacation' || r.absenceType === 'sick')) {
      p.absenceType = r.absenceType;
    } else {
      p.absenceType = fv.delete();
    }
    if (r && r.isHoliday === true) {
      p.isHoliday = true;
    } else {
      p.isHoliday = fv.delete();
    }
  }
  return p;
}

async function saveNoteDayRecord(payload) {
  const dateRaw = payload && payload.date ? String(payload.date) : '';
  const noteRaw = payload && payload.note ? String(payload.note) : '';
  const absenceRaw = payload && payload.absenceType != null ? String(payload.absenceType).trim() : '';
  const absenceType = (absenceRaw === 'vacation' || absenceRaw === 'sick') ? absenceRaw : '';
  const wantHoliday = !!(payload && payload.isHoliday === true);

  const date = dateRaw.trim();
  const note = noteRaw.trim();

  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
  if (!date) {
    throw new Error(i18n.errorDateRequired || 'A dátum megadása kötelező.');
  }
  if (!absenceType) {
    if (!note || note.length < 3) {
      throw new Error(i18n.missingWorkTimeNoteHint || 'Írj egy rövid megjegyzést (pl. várakozás / hétvégi pihenő).');
    }
  }

  if (!window.currentUser) {
    throw new Error(i18n.errorLoginRequired || 'Bejelentkezés szükséges a rögzítéshez.');
  }

  try {
    if (typeof ensureRecordsLoaded === 'function') {
      await ensureRecordsLoaded();
    }
  } catch(_) {}

  const list = Array.isArray(window.records) ? window.records : [];
  const existingNoteDay = list.find(function (r) {
    return String(r.date || '') === date && r && r.entryType === 'noteDay';
  });
  const id = existingNoteDay && existingNoteDay.id ? String(existingNoteDay.id) : String(Date.now());
  assertNoteDayDaySlot(list, date, i18n, id);

  const noteDayRecord = {
    id: id,
    date: date,
    endDate: date,
    entryType: 'noteDay',
    startTime: null,
    endTime: null,
    startLocation: null,
    endLocation: null,
    kmStart: null,
    kmEnd: null,
    kmDriven: null,
    weeklyDriveStartStr: null,
    weeklyDriveEndStr: null,
    driveMinutes: null,
    workMinutes: null,
    compensationMinutes: null,
    nightWorkMinutes: null,
    crossings: null,
    isSplitRest: null,
    note: note || ''
  };
  if (absenceType) {
    noteDayRecord.absenceType = absenceType;
  }
  if (wantHoliday) {
    noteDayRecord.isHoliday = true;
  }

  var saveResult = await saveWorkRecord(noteDayRecord);
  return saveResult || noteDayRecord;
}

// Globális export (ha szükséges más moduloknak)
window.handleAuthStateChange = handleAuthStateChange;

// === Active shift one-time loader (top-level) ===
async function loadUserSubscription(uid) {
  try {
    // 1) Ha nincs bejelentkezve, próbáljuk a lokális cache-t
    // Tier típusok: free, pro, tester (max eltávolítva, régi adatnál pro)
    if (!uid || !window.currentUser) {
      const cached = localStorage.getItem('currentUserSubscription');
      window.currentUserSubscription = cached ? JSON.parse(cached) : { tier: 'free' };
      return window.currentUserSubscription;
    }

    // 2) Próbáljuk különböző Firestore helyekről betölteni a csomagot
    // a) users/{uid}/settings/subscription (ajánlott)
    let tierDoc = await db.collection('users').doc(uid).collection('settings').doc('subscription').get();
    let sub = (tierDoc.exists ? tierDoc.data() : null);

    // b) users/{uid}/subscription
    if (!sub) {
      tierDoc = await db.collection('users').doc(uid).collection('subscription').doc('current').get();
      sub = (tierDoc.exists ? tierDoc.data() : null);
    }

    // c) users/{uid}/settings/userSettings dokumentum mezőként
    if (!sub) {
      const usDoc = await db.collection('users').doc(uid).collection('settings').doc('userSettings').get();
      if (usDoc.exists) {
        const data = usDoc.data() || {};
        if (data.subscriptionTier) sub = { tier: String(data.subscriptionTier) };
        else if (data.subscription && data.subscription.tier) sub = { tier: String(data.subscription.tier) };
      }
    }

    // d) users/{uid} fő dokumentum mezőként (pl. subscriptionTier)
    if (!sub) {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const data = userDoc.data() || {};
        if (data.subscriptionTier) sub = { tier: String(data.subscriptionTier) };
      }
    }

    // e) root 'subscriptions' gyűjtemény (pl. subscriptions/{uid})
    if (!sub) {
      tierDoc = await db.collection('subscriptions').doc(uid).get();
      sub = (tierDoc.exists ? tierDoc.data() : null);
    }

    // 3) Normalizálás és default
    let tier = (sub && sub.tier) ? String(sub.tier) : null;
    // Ha még nincs semmilyen információ, alapértelmezés: free
    if (!tier) tier = 'free';

    // Legacy kompatibilitás
    if (tier === 'max') tier = 'pro';
    if (tier === 'guest') tier = 'free';

    // 3/b) Kiegészítő mezők: expiry + cancel state (ha elérhető)
    let profileInfo = null;
    try {
      const p = await db.collection('users').doc(uid).collection('profile').doc('info').get();
      profileInfo = p.exists ? (p.data() || {}) : null;
    } catch (_) {
      profileInfo = null;
    }

    const pickDate = (v) => {
      try {
        if (!v) return null;
        if (typeof v.toDate === 'function') return v.toDate();
        if (v instanceof Date) return v;
        return new Date(v);
      } catch (_) {
        return null;
      }
    };

    const expiryFromProfile = profileInfo ? pickDate(profileInfo.subscriptionExpiry) : null;
    const expiryFromSettings = sub ? pickDate(sub.currentPeriodEnd) : null;
    const expiry = expiryFromProfile || expiryFromSettings || null;
    const cancelAtPeriodEnd = !!(sub && sub.cancelAtPeriodEnd);
    const isActive = profileInfo ? (profileInfo.isActive !== false) : true;

    const archivalTier = profileInfo ? (profileInfo.archivalTier || null) : null;
    let archivalExpiry = profileInfo ? pickDate(profileInfo.archivalExpiry) : null;
    let archivalActive = (profileInfo && typeof profileInfo.archivalActive === 'boolean') ? profileInfo.archivalActive : undefined;
    let archivalStatus = profileInfo ? (profileInfo.archivalStatus || null) : null;
    let archivalGracePeriodUntil = profileInfo ? pickDate(profileInfo.archivalGracePeriodUntil) : null;
    let archivalCancelAtPeriodEnd = profileInfo ? (profileInfo.archivalCancelAtPeriodEnd === true) : false;
    if (archivalStatus === 'grace_period') {
      archivalActive = false;
    }

    try {
      const archivalSettingsDoc = await db.collection('users').doc(uid).collection('settings').doc('archival').get();
      if (archivalSettingsDoc.exists) {
        const a = archivalSettingsDoc.data() || {};
        if (typeof a.status === 'string' && a.status.trim()) {
          archivalStatus = a.status.trim();
        }
        if (a.gracePeriodUntil) {
          const g = pickDate(a.gracePeriodUntil);
          if (g) archivalGracePeriodUntil = g;
        }
        if (typeof a.cancelAtPeriodEnd === 'boolean') {
          archivalCancelAtPeriodEnd = a.cancelAtPeriodEnd === true;
        }
        if (a.currentPeriodEnd) {
          const cpe = pickDate(a.currentPeriodEnd);
          if (cpe) {
            archivalExpiry = archivalExpiry || cpe;
          }
        }
        if (archivalStatus === 'grace_period' || (archivalGracePeriodUntil && archivalStatus !== 'cancel_at_period_end')) {
          archivalActive = false;
        } else if (archivalStatus === 'cancel_at_period_end' && a.active === true) {
          archivalActive = true;
        } else if (typeof a.active === 'boolean') {
          archivalActive = a.active;
        }
      }
    } catch (_) { /* ignore */ }

    const trialStartedAt = sub ? pickDate(sub.trialStartedAt) : null;
    const trialEnd = sub ? pickDate(sub.trialEnd) : null;
    const trialUpsellSnoozeUntil = sub ? pickDate(sub.trialUpsellSnoozeUntil) : null;
    const trialUpsellLastShownAt = sub ? pickDate(sub.trialUpsellLastShownAt) : null;
    const trialUpsellOptOut = (sub && typeof sub.trialUpsellOptOut === 'boolean') ? sub.trialUpsellOptOut : undefined;

    // Promo state
    const promoState = sub && sub.promoState ? {
      firstPopupShownAt: pickDate(sub.promoState.firstPopupShownAt),
      popup40ShownAt: pickDate(sub.promoState.popup40ShownAt || sub.promoState.firstPopupShownAt),
      popup20ShownAt: pickDate(sub.promoState.popup20ShownAt),
      promo40Eligible: sub.promoState.promo40Eligible !== false,
      promo20Eligible: sub.promoState.promo20Eligible !== false,
      reminderShown: !!sub.promoState.reminderShown,
      nextReminderAt: pickDate(sub.promoState.nextReminderAt),
      promoDeclined: !!sub.promoState.promoDeclined,
      promoUsed: !!sub.promoState.promoUsed,
      promoExpiresAt: pickDate(sub.promoState.promoExpiresAt),
      promoType: sub.promoState.promoType || null,
      currentPromoType: sub.promoState.currentPromoType || sub.promoState.promoType || null
    } : null;

    let effectiveTier = tier;
    try {
      // Only downgrade if expiry passed AND user has NO active Stripe subscription.
      // If stripeSubscriptionId exists, the Stripe webhook manages the tier — 
      // the frontend must NOT override it to avoid race conditions.
      const hasStripeSubscription = !!(sub && sub.stripeSubscriptionId);
      if (effectiveTier !== 'free' && effectiveTier !== 'tester' && expiry && expiry < new Date() && !hasStripeSubscription) {
        effectiveTier = 'free';
      }
    } catch (_) {}

    window.currentUserSubscription = (effectiveTier === 'tester')
      ? {
          tier: 'tester',
          expiry: null,
          isActive: true,
          cancelAtPeriodEnd: false,
          archivalTier,
          archivalActive,
          archivalStatus,
          archivalGracePeriodUntil,
          archivalExpiry,
          archivalCancelAtPeriodEnd,
          ...(trialStartedAt ? { trialStartedAt } : {}),
          ...(trialEnd ? { trialEnd } : {}),
          ...(typeof trialUpsellOptOut === 'boolean' ? { trialUpsellOptOut } : {}),
          ...(trialUpsellSnoozeUntil ? { trialUpsellSnoozeUntil } : {}),
          ...(trialUpsellLastShownAt ? { trialUpsellLastShownAt } : {}),
          ...(promoState ? { promoState } : {})
        }
      : {
          tier: effectiveTier,
          expiry,
          isActive,
          cancelAtPeriodEnd,
          archivalTier,
          archivalActive,
          archivalStatus,
          archivalGracePeriodUntil,
          archivalExpiry,
          archivalCancelAtPeriodEnd,
          ...(trialStartedAt ? { trialStartedAt } : {}),
          ...(trialEnd ? { trialEnd } : {}),
          ...(typeof trialUpsellOptOut === 'boolean' ? { trialUpsellOptOut } : {}),
          ...(trialUpsellSnoozeUntil ? { trialUpsellSnoozeUntil } : {}),
          ...(trialUpsellLastShownAt ? { trialUpsellLastShownAt } : {}),
          ...(promoState ? { promoState } : {})
        };
    try { localStorage.setItem('currentUserSubscription', JSON.stringify(window.currentUserSubscription)); } catch(_) {}
    // NOTE: Firestore write-back removed — tier management is handled by:
    // - createUserProfile / ensureUserProfile (new users → pro trial)
    // - Stripe webhook (paying users)
    // - downgradeToFree (expired trial without Stripe subscription)
    // Writing effectiveTier back here caused race conditions overwriting pro→free for new users.

    return window.currentUserSubscription;
  } catch (e) {
    console.warn('loadUserSubscription failed, fallback to cache/free:', e);
    try {
      const cached = localStorage.getItem('currentUserSubscription');
      window.currentUserSubscription = cached ? JSON.parse(cached) : { tier: 'free' };
    } catch(_) { window.currentUserSubscription = { tier: 'free' }; }
    return window.currentUserSubscription;
  }
}

async function loadActiveShiftOnce() {
  if (typeof window.loadActiveShiftOfflineAware === 'function') {
    return window.loadActiveShiftOfflineAware();
  }
  if (!window.currentUser) {
    window.activeShift = null;
    return { status: 'empty', shift: null };
  }
  try {
    const doc = await db.collection('users')
      .doc(window.currentUser.uid)
      .collection('state')
      .doc('activeShift')
      .get();
    const data = doc.exists && Object.keys(doc.data() || {}).length > 0 ? doc.data() : null;
    window.activeShift = data || null;
    try {
      if (data) localStorage.setItem('activeShift', JSON.stringify(data));
      else localStorage.removeItem('activeShift');
    } catch(_) {}
    try { if (typeof renderStartTab === 'function') renderStartTab(); } catch(_) {}
    try { if (typeof renderTachographStatusCard === 'function') renderTachographStatusCard(); } catch(_) {}
    try { if (typeof render90hWeekendRestCard === 'function') render90hWeekendRestCard(); } catch(_) {}
    return { status: data ? 'loadedFromFirestore' : 'empty', shift: data };
  } catch (e) {
    console.error('Active shift load failed:', e);
    return { status: 'failed', shift: null, error: e };
  }
}

// === Helper függvények (Opció A) ===
function updateAuthUI(user) {
  const loggedOutView = document.getElementById('logged-out-view');
  const loggedInView = document.getElementById('logged-in-view');
  const userNameEl = document.getElementById('user-name');
  const accountAuthSection = document.getElementById('account-auth-section');
  if (user) {
    loggedOutView && loggedOutView.classList.add('hidden');
    loggedInView && loggedInView.classList.remove('hidden');
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
    if (userNameEl) userNameEl.textContent = user.email || (i18n.userLabel || 'Felhasználó');
    if (typeof window.updateIosDebugToolsSectionVisibility === 'function') {
      try { window.updateIosDebugToolsSectionVisibility(); } catch (_) {}
    }
    if (accountAuthSection) accountAuthSection.classList.remove('hidden');
    try {
      if (typeof window.AccountLinking !== 'undefined' && typeof window.AccountLinking.refreshUI === 'function') {
        window.AccountLinking.refreshUI();
      }
    } catch (_) {}
  } else {
    loggedOutView && loggedOutView.classList.remove('hidden');
    loggedInView && loggedInView.classList.add('hidden');
    if (accountAuthSection) accountAuthSection.classList.add('hidden');
    if (typeof window.updateIosDebugToolsSectionVisibility === 'function') {
      try { window.updateIosDebugToolsSectionVisibility(); } catch (_) {}
    }
  }
}

async function loadSettingsFromFirestore() {
  if (!currentUser) return;
  try {
    const doc = await db.collection('users').doc(currentUser.uid).collection('settings').doc('config').get();
    if (doc.exists) {
      const settings = doc.data();
      Object.keys(settings).forEach(key => localStorage.setItem(key, settings[key]));
    }
  } catch (e) {
    console.warn('Settings load failed:', e);
  }
}

// --- Firestore read scopes (v6.05.03) ---
var GURIGO_RECORDS_ACTIVE_DAYS = 70;
var GURIGO_REFRESH_RECORDS_THROTTLE_MS = 5 * 60 * 1000;
var GURIGO_RECORDS_OLDER_PAGE_SIZE = 50;
var _palletsLoadPromise = null;

function getIsoDateDaysAgo(days) {
  var d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function mergeRecordsById(olderList, activeList) {
  var map = {};
  (olderList || []).forEach(function (r) {
    if (r && r.id != null) map[String(r.id)] = r;
  });
  (activeList || []).forEach(function (r) {
    if (r && r.id != null) map[String(r.id)] = r;
  });
  return Object.values(map);
}

function collectLocalPendingRecordsForMerge() {
  var pendingIds = window._recordsPendingSyncIds || {};
  var sources = [];
  if (Array.isArray(window._recordsActiveList)) sources = sources.concat(window._recordsActiveList);
  if (Array.isArray(window.records)) sources = sources.concat(window.records);
  var seen = {};
  var out = [];
  sources.forEach(function (r) {
    if (!r || r.id == null) return;
    var id = String(r.id);
    if (seen[id]) return;
    var isPending = pendingIds[id] === true
      || r.syncStatus === 'pending'
      || (r.createdOffline === true && r.syncStatus !== 'synced');
    if (!isPending) return;
    seen[id] = true;
    out.push(r);
  });
  return out;
}

function addRecordToOlderArchive(record) {
  if (!record || record.id == null) return;
  window._recordsOlderArchive = Array.isArray(window._recordsOlderArchive) ? window._recordsOlderArchive : [];
  var id = String(record.id);
  var idx = window._recordsOlderArchive.findIndex(function (r) { return String(r.id) === id; });
  if (idx > -1) window._recordsOlderArchive[idx] = record;
  else window._recordsOlderArchive.push(record);
}

function publishActiveRecords(activeList) {
  window._recordsActiveList = Array.isArray(activeList) ? activeList.slice() : [];
  var stamped = [];
  try {
    if (typeof window.backfillMissingDrivingModes === 'function') {
      stamped = window.backfillMissingDrivingModes(window._recordsActiveList) || [];
    }
  } catch (e) {
    try { console.warn('[Database] drivingMode backfill failed:', e && e.message); } catch (_) {}
  }
  window.records = window._recordsActiveList.slice();
  try { if (typeof records !== 'undefined') { records = window.records; } } catch (_) {}
  if (stamped.length) {
    persistDrivingModeBackfill(stamped);
  }
}

/** Egyszeri soft persist: csak a drivingMode mező írása a hiányzó régi rekordokra. */
function persistDrivingModeBackfill(stampedRecords) {
  if (!window.currentUser || !Array.isArray(stampedRecords) || !stampedRecords.length) return;
  if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) return;
  try {
    var uid = window.currentUser.uid;
    var col = db.collection('users').doc(uid).collection('records');
    var batch = db.batch();
    var ops = 0;
    var maxOps = 400;
    for (var i = 0; i < stampedRecords.length && ops < maxOps; i++) {
      var r = stampedRecords[i];
      if (!r || r.id == null || (r.drivingMode !== 'team' && r.drivingMode !== 'single')) continue;
      batch.set(col.doc(String(r.id)), { drivingMode: r.drivingMode }, { merge: true });
      ops++;
    }
    if (ops > 0) {
      batch.commit().catch(function (err) {
        try { console.warn('[Database] drivingMode backfill persist failed:', err && err.message); } catch (_) {}
      });
    }
  } catch (e) {
    try { console.warn('[Database] drivingMode backfill persist error:', e && e.message); } catch (_) {}
  }
}

function publishPalletRecords(list) {
  window.palletRecords = Array.isArray(list) ? list.slice() : [];
  try { if (typeof palletRecords !== 'undefined') { palletRecords = window.palletRecords; } } catch (_) {}
}

async function loadAllPalletsFromFirestore(options) {
  if (!currentUser) return [];
  try {
    var ref = db.collection('users').doc(currentUser.uid).collection('pallets');
    var snapshot = options && options.source === 'server'
      ? await ref.get({ source: 'server' })
      : await ref.get();
    return snapshot.docs.map(function (doc) { return { id: doc.id, ...doc.data() }; });
  } catch (e) {
    console.warn('[Pallets] Full load failed:', e && e.message);
    return [];
  }
}

/** Raklapok: teljes adatkör, csak Raklapok tab megnyitásakor (session cache). */
async function ensurePalletsLoaded(options) {
  if (!window.currentUser && !currentUser) return;
  var force = options && options.force;
  if (window._palletsLoaded && !force) return;
  if (_palletsLoadPromise && !force) return _palletsLoadPromise;

  _palletsLoadPromise = (async function () {
    window._palletsLoading = true;
    try {
      var loaded = await loadAllPalletsFromFirestore(options);
      if (Array.isArray(window.palletRecords) && window.palletRecords.length) {
        loaded = mergeRecordsById(loaded, window.palletRecords.filter(function (p) {
          if (!p || p.id == null) return false;
          return p.syncStatus === 'pending' || (p.createdOffline === true && p.syncStatus !== 'synced');
        }));
      }
      publishPalletRecords(loaded);
      window._palletsLoaded = true;
    } catch (e) {
      console.warn('[Pallets] ensurePalletsLoaded failed:', e && e.message);
      throw e;
    } finally {
      window._palletsLoading = false;
      _palletsLoadPromise = null;
    }
  })();
  return _palletsLoadPromise;
}

function getRecordsForListDisplay() {
  return mergeRecordsById(window._recordsOlderArchive, window._recordsActiveList)
    .sort(function (a, b) {
      var ta = (typeof getRecordSortTime === 'function') ? getRecordSortTime(a) : 0;
      var tb = (typeof getRecordSortTime === 'function') ? getRecordSortTime(b) : 0;
      return tb - ta;
    });
}

function dispatchRecordsUpdated() {
  try { window.dispatchEvent(new Event('records:updated')); } catch (_) {}
}

function notifyRecordsUiRefresh() {
  dispatchRecordsUpdated();
  try { if (typeof renderRecords === 'function') renderRecords(); } catch (_) {}
  try { if (typeof renderTachographStatusCard === 'function') renderTachographStatusCard(); } catch (_) {}
  try { if (typeof render90hWeekendRestCard === 'function') render90hWeekendRestCard(); } catch (_) {}
}

function resetRecordsPagingState() {
  window._recordsOlderPaging = { hasMore: true, lastDoc: null, loading: false };
  window._recordsOlderArchive = [];
}

function resetRecordsPagingState() {
  window._recordsOlderPaging = { hasMore: true, lastDoc: null, loading: false };
  window._recordsOlderArchive = [];
}

async function loadActiveRecordsFromFirestore(options) {
  if (!currentUser) return [];
  var cutoff = getIsoDateDaysAgo(GURIGO_RECORDS_ACTIVE_DAYS);
  try {
    var ref = db.collection('users').doc(currentUser.uid).collection('records');
    var query = ref.where('date', '>=', cutoff).orderBy('date', 'desc');
    var snapshot = options && options.source === 'server'
      ? await query.get({ source: 'server' })
      : await query.get();
    var list = snapshot.docs.map(function (doc) { return { id: doc.id, ...doc.data() }; });
    if (options && options.source === 'server' && typeof window.markOfflinePolicyFromServerRead === 'function') {
      try { window.markOfflinePolicyFromServerRead(currentUser.uid); } catch (_) {}
    }
    return list;
  } catch (e) {
    console.warn('[Records] Active window load failed:', e && e.message);
    return [];
  }
}

/**
 * @param {string} collectionName - 'records' (raklapok: ensurePalletsLoaded)
 * @param {{ source?: 'server' | 'cache' }} [options]
 */
async function loadRecordsFromFirestore(collectionName, options) {
  if (collectionName === 'pallets') {
    return loadAllPalletsFromFirestore(options);
  }
  return loadActiveRecordsFromFirestore(options);
}

async function loadOlderRecordsPage() {
  if (!currentUser) return { added: 0, hasMore: false };
  var paging = window._recordsOlderPaging || {};
  if (paging.loading || paging.hasMore === false) {
    return { added: 0, hasMore: !!paging.hasMore };
  }
  window._recordsOlderPaging.loading = true;
  var cutoff = window._recordsActiveCutoffDate || getIsoDateDaysAgo(GURIGO_RECORDS_ACTIVE_DAYS);
  try {
    var ref = db.collection('users').doc(currentUser.uid).collection('records');
    var query = ref.where('date', '<', cutoff).orderBy('date', 'desc').limit(GURIGO_RECORDS_OLDER_PAGE_SIZE);
    if (paging.lastDoc) query = query.startAfter(paging.lastDoc);
    var snap = await query.get();
    var page = snap.docs.map(function (doc) { return { id: doc.id, ...doc.data() }; });
    if (snap.docs.length) window._recordsOlderPaging.lastDoc = snap.docs[snap.docs.length - 1];
    window._recordsOlderPaging.hasMore = snap.docs.length >= GURIGO_RECORDS_OLDER_PAGE_SIZE;
    var existing = {};
    (window._recordsOlderArchive || []).forEach(function (r) { existing[String(r.id)] = true; });
    var newlyAdded = [];
    page.forEach(function (r) {
      if (!existing[String(r.id)]) {
        window._recordsOlderArchive.push(r);
        newlyAdded.push(r);
      }
    });
    try {
      if (typeof window.backfillMissingDrivingModes === 'function' && newlyAdded.length) {
        var olderStamped = window.backfillMissingDrivingModes(newlyAdded) || [];
        if (olderStamped.length) persistDrivingModeBackfill(olderStamped);
      }
    } catch (_) {}
    notifyRecordsUiRefresh();
    return { added: page.length, hasMore: window._recordsOlderPaging.hasMore };
  } catch (e) {
    console.warn('[Records] Older page load failed:', e && e.message);
    window._recordsOlderPaging.hasMore = false;
    return { added: 0, hasMore: false, error: e };
  } finally {
    window._recordsOlderPaging.loading = false;
  }
}

/** Real-time előfizetés: csak records 70 napos aktív ablak (raklapok: tab-onkénti teljes get). */
function subscribeRecordsFromFirestore() {
  var user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
  if (!user || !db) return;
  var uid = user.uid;
  if (window._recordsSnapshotUnsubscribe && window._recordsListenerUid === uid) {
    return;
  }
  try {
    if (window._recordsSnapshotUnsubscribe) {
      try { window._recordsSnapshotUnsubscribe(); } catch (_) {}
      window._recordsSnapshotUnsubscribe = null;
    }

    resetRecordsPagingState();
    window._reportYearNoteDays = [];

    var recordsCutoff = getIsoDateDaysAgo(GURIGO_RECORDS_ACTIVE_DAYS);
    window._recordsActiveCutoffDate = recordsCutoff;

    var applyRecords = function (snapshot) {
      var prevPendingJson = JSON.stringify(window._recordsPendingSyncIds || {});
      if (typeof window.updateWorkdayPendingFromSnapshot === 'function') {
        window.updateWorkdayPendingFromSnapshot(snapshot);
      }
      var pendingChanged = JSON.stringify(window._recordsPendingSyncIds || {}) !== prevPendingJson;

      var list = snapshot.docs.map(function (doc) { return { id: doc.id, ...doc.data() }; });
      var localPending = collectLocalPendingRecordsForMerge();
      if (localPending.length) {
        list = mergeRecordsById(list, localPending);
      }
      var fromCache = snapshot.metadata && snapshot.metadata.fromCache;
      if (!pendingChanged && fromCache && Array.isArray(window._recordsActiveList) && window._recordsActiveList.length > list.length) return;
      publishActiveRecords(list);
      notifyRecordsUiRefresh();
    };

    window._recordsSnapshotUnsubscribe = db.collection('users').doc(uid).collection('records')
      .where('date', '>=', recordsCutoff)
      .orderBy('date', 'desc')
      .onSnapshot({ includeMetadataChanges: true }, applyRecords, function (err) { console.warn('[Records] Snapshot error:', err && err.message); });

    window._recordsListenerUid = uid;
    window._recordsListenerActive = true;
    console.log('[Firestore] Records (70d) scoped listener attached');
  } catch (e) {
    console.warn('[Firestore] subscribeRecordsFromFirestore failed:', e && e.message);
  }
}

/** Szerver refresh – throttle, csak records aktív ablak. */
async function refreshRecordsFromServer(options) {
  if (!currentUser) return;
  var force = options && options.force;
  var now = Date.now();
  if (!force && window._recordsListenerActive && (now - (window._lastRefreshRecordsFromServerAt || 0)) < GURIGO_REFRESH_RECORDS_THROTTLE_MS) {
    return;
  }
  window._lastRefreshRecordsFromServerAt = now;
  try {
    var recordsList = await loadActiveRecordsFromFirestore({ source: 'server' });
    if (Array.isArray(recordsList)) publishActiveRecords(recordsList);
    notifyRecordsUiRefresh();
  } catch (e) {
    console.warn('[Records] refreshRecordsFromServer failed:', e && e.message);
  }
}

async function loadRecordsForMonth(monthStr) {
  if (!currentUser || !monthStr) return [];
  var parts = String(monthStr).split('-');
  if (parts.length < 2) return [];
  var year = parts[0];
  var month = parts[1];
  var start = year + '-' + month + '-01';
  var endDate = new Date(parseInt(year, 10), parseInt(month, 10), 0);
  var end = year + '-' + month + '-' + String(endDate.getDate()).padStart(2, '0');
  try {
    var snap = await db.collection('users').doc(currentUser.uid).collection('records')
      .where('date', '>=', start)
      .where('date', '<=', end)
      .get();
    return snap.docs.map(function (doc) { return { id: doc.id, ...doc.data() }; });
  } catch (e) {
    console.warn('[Report] Month records load failed:', e && e.message);
    return [];
  }
}

async function ensureReportYearNoteDaysLoaded(yearStr) {
  if (!currentUser || !yearStr) return;
  var year = String(yearStr);
  var start = year + '-01-01';
  var end = year + '-12-31';
  try {
    var snap = await db.collection('users').doc(currentUser.uid).collection('records')
      .where('date', '>=', start)
      .where('date', '<=', end)
      .get();
    var noteDays = snap.docs.map(function (doc) { return { id: doc.id, ...doc.data() }; })
      .filter(function (r) { return r && r.entryType === 'noteDay'; });
    window._reportYearNoteDays = noteDays;
    noteDays.forEach(function (nd) {
      if (!window.records.some(function (r) { return String(r.id) === String(nd.id); })) {
        window.records.push(nd);
      }
    });
    try { if (typeof records !== 'undefined') { records = window.records; } } catch (_) {}
  } catch (e) {
    console.warn('[Report] Year noteDay load failed:', e && e.message);
  }
}

async function ensureReportRecordsForMonth(monthStr) {
  if (!monthStr) return [];
  var year = String(monthStr).split('-')[0];
  await ensureReportYearNoteDaysLoaded(year);
  return loadRecordsForMonth(monthStr);
}

function installReportGenerateWrapper() {
  if (window.__reportGenerateWrapped) return;
  var orig = window.generateMonthlyReport;
  if (typeof orig !== 'function') return;
  window.generateMonthlyReport = async function () {
    var month = document.getElementById('monthSelector') && document.getElementById('monthSelector').value;
    var injectedIds = [];
    try {
      if (month) {
        var monthRecords = await ensureReportRecordsForMonth(month);
        monthRecords.forEach(function (r) {
          if (!r || r.entryType === 'noteDay') return;
          if (!window.records.some(function (x) { return String(x.id) === String(r.id); })) {
            window.records.push(r);
            injectedIds.push(String(r.id));
          }
        });
        try { if (typeof records !== 'undefined') { records = window.records; } } catch (_) {}
      }
      return orig.apply(this, arguments);
    } finally {
      injectedIds.forEach(function (id) {
        var found = window.records.find(function (x) { return String(x.id) === id; });
        window.records = window.records.filter(function (x) { return String(x.id) !== id; });
        if (found) addRecordToOlderArchive(found);
      });
      publishActiveRecords(window._recordsActiveList);
    }
  };
  window.__reportGenerateWrapped = true;
}

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installReportGenerateWrapper);
  } else {
    installReportGenerateWrapper();
  }
  setTimeout(installReportGenerateWrapper, 1500);
} catch (_) {}

/**
 * Field-preserving record merge for backup import.
 * Never deletes newer trailerContainerEvents or other fields missing from the backup.
 * Uncertain scalar/array conflicts without timestamps → reject.
 */
function mergeWorkRecordForImport(existing, incoming) {
  if (!incoming || typeof incoming !== 'object') {
    return { ok: false, reason: 'invalid_incoming' };
  }
  if (!existing || typeof existing !== 'object') {
    return { ok: true, record: Object.assign({}, incoming), created: true };
  }

  var conflictFields = [];
  var out = Object.assign({}, existing);
  var lib = (typeof window !== 'undefined' && window.TrailerContainerLog) ? window.TrailerContainerLog : null;

  Object.keys(incoming).forEach(function (key) {
    if (key === 'id') return;
    var iv = incoming[key];
    var ev = existing[key];

    if (key === 'trailerContainerEvents') {
      if (lib && typeof lib.mergeEventLists === 'function') {
        out.trailerContainerEvents = lib.mergeEventLists(ev, iv);
      } else {
        var seen = {};
        var union = [];
        (Array.isArray(ev) ? ev : []).concat(Array.isArray(iv) ? iv : []).forEach(function (item) {
          if (!item) return;
          var k = item.eventId ? 'id:' + item.eventId : JSON.stringify(item);
          if (seen[k]) return;
          seen[k] = true;
          union.push(item);
        });
        out.trailerContainerEvents = union;
      }
      return;
    }

    if (key === 'crossings' || key === 'borderCrossings' || key === 'crossingTombstones') {
      var cm = (typeof window !== 'undefined' && window.GurigoCrossingMerge) ? window.GurigoCrossingMerge : null;
      if (cm && typeof cm.mergeRecordCrossings === 'function') {
        var mergedCross = cm.mergeRecordCrossings(existing, incoming);
        out.crossings = mergedCross.crossings;
        out.crossingTombstones = mergedCross.crossingTombstones;
      } else {
        var mergeFn = (typeof window !== 'undefined' && typeof window.mergeCrossingLists === 'function')
          ? window.mergeCrossingLists
          : null;
        var existingCross = mergeFn
          ? mergeFn(existing.crossings, existing.borderCrossings)
          : [].concat(Array.isArray(existing.crossings) ? existing.crossings : [], Array.isArray(existing.borderCrossings) ? existing.borderCrossings : []);
        var incomingCross = mergeFn
          ? mergeFn(incoming.crossings, incoming.borderCrossings)
          : [].concat(Array.isArray(incoming.crossings) ? incoming.crossings : [], Array.isArray(incoming.borderCrossings) ? incoming.borderCrossings : []);
        out.crossings = mergeFn ? mergeFn(existingCross, incomingCross) : existingCross.concat(incomingCross);
      }
      if (Object.prototype.hasOwnProperty.call(out, 'borderCrossings')) delete out.borderCrossings;
      return;
    }

    if (ev === undefined || ev === null) {
      out[key] = iv;
      return;
    }
    // Incoming null/undefined must not wipe an existing value.
    if (iv === undefined || iv === null) {
      return;
    }

    var same = false;
    try {
      same = JSON.stringify(ev) === JSON.stringify(iv);
    } catch (_) {
      same = ev === iv;
    }
    if (same) return;

    var eMs = existing.clientUpdatedAtMs;
    var iMs = incoming.clientUpdatedAtMs;
    if (typeof eMs === 'number' && typeof iMs === 'number') {
      out[key] = iMs >= eMs ? iv : ev;
      return;
    }

    // Arrays of primitives: union. Complex divergences → conflict.
    if (Array.isArray(ev) && Array.isArray(iv)) {
      var allPrimitive = ev.concat(iv).every(function (x) {
        return x == null || typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean';
      });
      if (allPrimitive) {
        var set = {};
        var arr = [];
        ev.concat(iv).forEach(function (x) {
          var k = String(x);
          if (set[k]) return;
          set[k] = true;
          arr.push(x);
        });
        out[key] = arr;
        return;
      }
      conflictFields.push(key);
      return;
    }

    if (typeof ev === 'object' || typeof iv === 'object') {
      conflictFields.push(key);
      return;
    }

    conflictFields.push(key);
  });

  if (conflictFields.length) {
    return { ok: false, reason: 'conflict', conflictFields: conflictFields, recordId: String(existing.id || incoming.id || '') };
  }

  var maxMs = Math.max(
    typeof existing.clientUpdatedAtMs === 'number' ? existing.clientUpdatedAtMs : 0,
    typeof incoming.clientUpdatedAtMs === 'number' ? incoming.clientUpdatedAtMs : 0,
    Date.now()
  );
  out.clientUpdatedAtMs = maxMs;
  out.clientUpdatedAt = new Date(maxMs).toISOString();
  if (incoming.id != null) out.id = incoming.id;
  else if (existing.id != null) out.id = existing.id;
  return { ok: true, record: out, created: false };
}

async function migrateLocalToFirestore(records, collectionName, options) {
  options = options || {};
  if (!currentUser || !Array.isArray(records) || records.length === 0) {
    return { status: 'empty' };
  }
  var safeMerge = options.safeMerge !== false;
  var rejectOnConflict = options.rejectOnConflict !== false;

  try {
    if (!safeMerge) {
      const batch = db.batch();
      records.forEach(record => {
        const docRef = db.collection('users').doc(currentUser.uid).collection(collectionName).doc(String(record.id));
        batch.set(docRef, record);
      });
      await batch.commit();
      console.log(`Migrated ${records.length} ${collectionName} to Firestore`);
      return { status: 'ok', count: records.length, mode: 'overwrite' };
    }

    var prepared = [];
    for (var i = 0; i < records.length; i++) {
      var record = records[i];
      if (!record || record.id == null) continue;
      var docRef = db.collection('users').doc(currentUser.uid).collection(collectionName).doc(String(record.id));
      var snap;
      try {
        if (options.requireServerRead && typeof docRef.get === 'function') {
          // Prefer server so offline cache-miss cannot look like "doc does not exist".
          snap = await docRef.get({ source: 'server' });
        } else {
          snap = await docRef.get();
        }
      } catch (readErr) {
        if (options.requireServerRead) {
          return {
            status: 'rejected',
            reason: 'server_read_required',
            conflictFields: [],
            recordId: String(record.id),
            error: readErr
          };
        }
        throw readErr;
      }
      var existing = snap && snap.exists ? Object.assign({ id: snap.id }, snap.data()) : null;
      var merged = mergeWorkRecordForImport(existing, record);
      if (!merged.ok) {
        if (rejectOnConflict) {
          console.warn('[migrateLocalToFirestore] rejected:', merged.reason, merged.conflictFields);
          return {
            status: 'rejected',
            reason: merged.reason,
            conflictFields: merged.conflictFields || [],
            recordId: merged.recordId || String(record.id)
          };
        }
        continue;
      }
      prepared.push({ ref: docRef, data: merged.record });
    }

    if (!prepared.length) return { status: 'empty' };

    // Firestore batches max 500.
    for (var offset = 0; offset < prepared.length; offset += 450) {
      var slice = prepared.slice(offset, offset + 450);
      var batch2 = db.batch();
      slice.forEach(function (item) {
        var payload = typeof stripUndefinedForFirestore === 'function'
          ? stripUndefinedForFirestore(item.data)
          : item.data;
        // merge:true is belt-and-suspenders; payload is already field-preserving.
        batch2.set(item.ref, payload, { merge: true });
      });
      await batch2.commit();
    }

    console.log(`Safe-merged ${prepared.length} ${collectionName} to Firestore`);
    return { status: 'ok', count: prepared.length, mode: 'safeMerge' };
  } catch (e) {
    console.error('Migration failed:', e);
    return { status: 'failed', error: e };
  }
}

if (typeof window !== 'undefined') {
  window.mergeWorkRecordForImport = mergeWorkRecordForImport;
  window.migrateLocalToFirestore = migrateLocalToFirestore;
}


// === ADDED: missing persistence helpers ===
async function saveSettingsToFirestore(settings) {
  if (!window.currentUser) return;
  try {
    await db.collection('users')
      .doc(window.currentUser.uid)
      .collection('settings')
      .doc('config')
      .set(settings, { merge: true });
  } catch (e) {
    console.error('Settings save failed:', e);
  }
}


async function saveWorkRecord(record) {
  if (!window.currentUser) {
    console.warn('[saveWorkRecord] No user logged in');
    return { status: 'failed', error: new Error('No user') };
  }

  function toLocalYMD(dLike){ const d = (dLike instanceof Date) ? dLike : new Date(dLike); const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; }
  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
  const startDateNorm = toLocalYMD(record.date);
  let endDateNorm = toLocalYMD(record.endDate || record.date);
  if (new Date(endDateNorm) < new Date(startDateNorm)) { endDateNorm = startDateNorm; }
  record = Object.assign({}, record, { date: startDateNorm, endDate: endDateNorm, entryType: (record && record.entryType) ? record.entryType : 'workday' });
  if (record.entryType !== 'noteDay' && typeof window.ensureDrivingModeOnRecord === 'function') {
    record = window.ensureDrivingModeOnRecord(record);
  }
  window.records = Array.isArray(window.records) ? window.records : [];
  try {
    try {
      if ((!Array.isArray(window.records) || window.records.length === 0) && typeof ensureRecordsLoaded === 'function') {
        await ensureRecordsLoaded();
      }
    } catch(_) {}

    var list = Array.isArray(window.records) ? window.records : [];

    if (record.entryType === 'workday') {
      var typedSameDay = list.find(function (r) {
        return String(r.date || '') === startDateNorm && isTypedAbsenceNoteDay(r);
      });
      if (typedSameDay) {
        throw new Error(i18n.errorWorkdayBlockedTypedAbsence || 'Erre a napra szabadság/betegség van rögzítve; előbb módosítsd vagy töröld azt a bejegyzést.');
      }
      var existingNoteDay = list.find(function (r) {
        var rType = (r && r.entryType) ? r.entryType : 'workday';
        return String(r.date || '') === startDateNorm && rType === 'noteDay';
      });
      if (existingNoteDay && existingNoteDay.id && String(existingNoteDay.id) !== String(record.id)) {
        var oldNote = (existingNoteDay.note && String(existingNoteDay.note).trim()) ? String(existingNoteDay.note).trim() : '';
        var newNote = (record.note && String(record.note).trim()) ? String(record.note).trim() : '';
        record = Object.assign({}, record, {
          id: String(existingNoteDay.id),
          note: newNote || oldNote,
          entryType: 'workday'
        });
        if (record.isHoliday !== true) {
          delete record.isHoliday;
        }
      }
    }

    var saveFn = typeof window.saveWorkdayRecordOfflineAware === 'function'
      ? window.saveWorkdayRecordOfflineAware
      : null;

    if (!saveFn) {
      throw new Error('Workday sync layer unavailable');
    }

    var result = await saveFn(record, {
      buildWritePayload: buildRecordFirestoreWritePayload,
      stripUndefined: stripUndefinedForFirestore,
      sanitizeForCache: sanitizeRecordForLocalCache,
      afterSave: async function (ctx) {
        var cached = ctx.record;
        var isUpdate = ctx.isUpdate;
        if (window.ActivityTracker) {
          if (isUpdate && typeof window.ActivityTracker.trackRecordUpdated === 'function') {
            window.ActivityTracker.trackRecordUpdated().catch(function (err) { console.warn('Record update tracking failed:', err); });
          } else if (!isUpdate && typeof window.ActivityTracker.trackRecordCreated === 'function') {
            window.ActivityTracker.trackRecordCreated(1).catch(function (err) { console.warn('Record creation tracking failed:', err); });
          }
        }
        try {
          if (window.StatisticsDataService && typeof window.StatisticsDataService.invalidateStatisticsCache === 'function') {
            window.StatisticsDataService.invalidateStatisticsCache(cached.date);
          }
        } catch (_) {}
        try { localStorage.setItem('records_updated_ping', String(Date.now())); } catch(_) {}
        try {
          if ('BroadcastChannel' in window) {
            var bc = new BroadcastChannel('munkaido-records');
            bc.postMessage({ type: 'records:updated', ts: Date.now() });
            try { bc.close(); } catch(_) {}
          }
        } catch(_) {}
        if (window.announcementsService && typeof window.announcementsService.trackMeaningfulSave === 'function') {
          try {
            window.announcementsService.trackMeaningfulSave().catch(function (err) {
              console.warn('[saveWorkRecord] trackMeaningfulSave failed:', err);
            });
          } catch (_) {}
        }
      }
    });

    if (result.status === 'failed') {
      return result;
    }

    return result;
  } catch (e) {
    console.error('Record save failed:', e);
    return { status: 'failed', error: e, record: record };
  }
}

// === ÚJ: Aktív műszak felhő szinkron helper függvények ===
let activeShiftUnsubscribe = null;

async function saveActiveShift(shift) {
  if (typeof window.saveActiveShiftOfflineAware === 'function') {
    return window.saveActiveShiftOfflineAware(shift);
  }
  try {
    if (!window.currentUser) {
      try { localStorage.setItem('activeShift', JSON.stringify(shift)); } catch(_) {}
      window.activeShift = shift;
      return { status: 'savedOnline', shift: shift };
    }
    await db.collection('users')
      .doc(window.currentUser.uid)
      .collection('state')
      .doc('activeShift')
      .set(shift);
    window.activeShift = shift;
    try { localStorage.setItem('activeShift', JSON.stringify(shift)); } catch(_) {}
    return { status: 'savedOnline', shift: shift };
  } catch (e) {
    console.error('Active shift save failed:', e);
    return { status: 'failed', shift: shift, error: e };
  }
}

async function deleteActiveShift() {
  if (typeof window.clearActiveShiftOfflineAware === 'function') {
    return window.clearActiveShiftOfflineAware();
  }
  try {
    if (!window.currentUser) {
      try { localStorage.removeItem('activeShift'); } catch(_) {}
      window.activeShift = null;
      return { status: 'clearedOnline', shift: null };
    }
    await db.collection('users')
      .doc(window.currentUser.uid)
      .collection('state')
      .doc('activeShift')
      .delete()
      .catch(async () => {
        await db.collection('users')
          .doc(window.currentUser.uid)
          .collection('state')
          .doc('activeShift')
          .set({}, { merge: true });
      });
    window.activeShift = null;
    try { localStorage.removeItem('activeShift'); } catch(_) {}
    return { status: 'clearedOnline', shift: null };
  } catch (e) {
    console.error('Active shift delete failed:', e);
    return { status: 'failed', shift: null, error: e };
  }
}

function subscribeActiveShift() {
  if (!window.currentUser) return null;
  try {
    const docRef = db.collection('users')
      .doc(window.currentUser.uid)
      .collection('state')
      .doc('activeShift');
    const unsub = docRef.onSnapshot({ includeMetadataChanges: true }, (snap) => {
      if (typeof window.handleActiveShiftSnapshot === 'function') {
        window.handleActiveShiftSnapshot(snap);
        return;
      }
      const data = snap.exists && Object.keys(snap.data() || {}).length > 0 ? snap.data() : null;
      window.activeShift = data || null;
      try {
        if (data) localStorage.setItem('activeShift', JSON.stringify(data));
        else localStorage.removeItem('activeShift');
      } catch(_) {}
      try { if (typeof renderStartTab === 'function') renderStartTab(); } catch(_) {}
      try { if (typeof renderTachographStatusCard === 'function') renderTachographStatusCard(); } catch(_) {}
      try { if (typeof render90hWeekendRestCard === 'function') render90hWeekendRestCard(); } catch(_) {}
    });
    return unsub;
  } catch (e) {
    console.error('Active shift subscribe failed:', e);
    return null;
  }
}

window.saveSettingsToFirestore = saveSettingsToFirestore;

window.saveWorkRecord = saveWorkRecord;

window.saveNoteDay = saveNoteDayRecord;

window.isTypedAbsenceNoteDay = isTypedAbsenceNoteDay;
window.isVacationNoteDay = isVacationNoteDay;
window.isSickNoteDay = isSickNoteDay;
window.isHolidayRecord = isHolidayRecord;
window.isNoteDayRecord = isNoteDayRecord;

// === TÖRLÉS: bejegyzés eltávolítása Firestore-ból és lokális cache-ből (TOP-LEVEL) ===
// Megjegyzés: itt definiáljuk, hogy biztosan elérhető legyen az export előtt.
async function deleteWorkRecord(recordId) {
  const id = String(recordId || '');
  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
  if (!id) return Promise.reject('Érvénytelen azonosító.');
  try {
    if (!window.currentUser) {
      try {
        window.records = Array.isArray(window.records) ? window.records : [];
        window.records = window.records.filter(r => String(r.id) !== id);
        try { localStorage.setItem('workRecords', JSON.stringify(window.records)); } catch(_) {}
        try { if (typeof records !== 'undefined') { records = window.records; } } catch(_) {}
        try { if (typeof renderRecords === 'function') renderRecords(); } catch(_) {}
        try { if (typeof renderApp === 'function') renderApp(); } catch(_) {}
      } catch (e) {
        console.error('Local delete failed:', e);
        throw new Error(i18n.deleteErrorGeneric || 'A törlés nem sikerült.');
      }
      return;
    }

    var deletedRecord = null;
    try {
      var activeList = Array.isArray(window._recordsActiveList) ? window._recordsActiveList : [];
      var olderList = Array.isArray(window._recordsOlderArchive) ? window._recordsOlderArchive : [];
      deletedRecord = activeList.find(function (r) { return String(r.id) === id; })
        || olderList.find(function (r) { return String(r.id) === id; })
        || (Array.isArray(window.records) ? window.records.find(function (r) { return String(r.id) === id; }) : null);
    } catch (_) {}

    var deleteFn = typeof window.deleteWorkdayRecordOfflineAware === 'function'
      ? window.deleteWorkdayRecordOfflineAware
      : null;
    if (!deleteFn) {
      throw new Error('Workday sync layer unavailable');
    }

    var result = await deleteFn(id);
    if (result.status === 'failed') {
      throw result.error || new Error(i18n.deleteErrorGeneric || 'A törlés nem sikerült.');
    }

    if (window.ActivityTracker && typeof window.ActivityTracker.trackRecordDeleted === 'function') {
      window.ActivityTracker.trackRecordDeleted().catch(err => console.warn('Record deletion tracking failed:', err));
    }

    try {
      window.records = Array.isArray(window.records) ? window.records : [];
      window.records = window.records.filter(r => String(r.id) !== id);
      window._recordsActiveList = window.records.slice();
      try { localStorage.setItem('workRecords', JSON.stringify(window.records)); } catch(_) {}
      try { if (typeof records !== 'undefined') { records = window.records; } } catch(_) {}
      try { if (typeof renderRecords === 'function') renderRecords(); } catch(_) {}
      try { if (typeof renderApp === 'function') renderApp(); } catch(_) {}
      try {
        if (window.StatisticsDataService && typeof window.StatisticsDataService.invalidateStatisticsCache === 'function') {
          window.StatisticsDataService.invalidateStatisticsCache(deletedRecord && deletedRecord.date);
        }
      } catch (_) {}
      try { window.dispatchEvent(new Event('records:updated')); } catch (_) {}
    } catch (e) {
      console.warn('Local cache update failed after delete:', e);
    }

    if (result.status === 'savedPendingSync' && typeof showCustomAlert === 'function') {
      try {
        showCustomAlert(i18n.savedOffline || 'Mentve offline módban – online állapotban szinkronizálódik.', 'info');
      } catch (_) {}
    }

  } catch (e) {
    console.error('Record delete failed:', e);
    safeCaptureException(e, { module: 'deleteWorkRecord' });
    return Promise.reject('A törlés nem sikerült. Próbáld újra később.');
  }
}

// Export: törlés
try { if (typeof window.deleteWorkRecord !== 'function') { window.deleteWorkRecord = deleteWorkRecord; } } catch(_) {}

// Export új helper függvények
window.saveActiveShift = saveActiveShift;
window.deleteActiveShift = deleteActiveShift;
window.subscribeActiveShift = subscribeActiveShift;
window.loadActiveShiftOnce = loadActiveShiftOnce;

// Ensure records are present when UI needs them
async function ensureRecordsLoaded() {
  try {
    if (!window.currentUser) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (!Array.isArray(window.records)) window.records = [];
      return;
    }
    if (window._recordsListenerActive && Array.isArray(window._recordsActiveList) && window._recordsActiveList.length > 0) {
      return;
    }
    if (!window._recordsListenerActive && typeof subscribeRecordsFromFirestore === 'function') {
      subscribeRecordsFromFirestore();
      return;
    }
    if (!Array.isArray(window.records) || window.records.length === 0) {
      const loaded = await loadRecordsFromFirestore('records');
      if (Array.isArray(loaded) && loaded.length) {
        publishActiveRecords(loaded);
        notifyRecordsUiRefresh();
        try { if (typeof renderTachoHelperCards === 'function') renderTachoHelperCards(); } catch (_) {}
      }
    }
  } catch (e) {
    console.warn('ensureRecordsLoaded failed:', e);
  }
}

window.ensureRecordsLoaded = ensureRecordsLoaded;
window.ensurePalletsLoaded = ensurePalletsLoaded;
window.refreshRecordsFromServer = refreshRecordsFromServer;
window.loadOlderRecordsPage = loadOlderRecordsPage;
window.getRecordsForListDisplay = getRecordsForListDisplay;
window.ensureReportYearNoteDaysLoaded = ensureReportYearNoteDaysLoaded;

function getLocalDayKey(dateLike) {
  try {
    const d = (dateLike instanceof Date) ? dateLike : new Date(dateLike || Date.now());
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  } catch (_) {
    return new Date().toISOString().slice(0, 10);
  }
}

async function tryConsumeDailyQuota(uid, field, amount, limit, dayKey) {
  try {
    if (!uid || !field || !amount || amount <= 0) return { ok: true, used: null, limit: limit || null };
    if (typeof limit !== 'number' || limit < 0) return { ok: true, used: null, limit: limit || null };
    if (!db || typeof db.collection !== 'function') return { ok: true, used: null, limit: limit };

    const key = dayKey || getLocalDayKey(new Date());
    const usageRef = db.collection('users').doc(uid).collection('usageDaily').doc(String(key));
    const inc = (firebase && firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.increment)
      ? firebase.firestore.FieldValue.increment(amount)
      : null;
    const serverTs = (firebase && firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.serverTimestamp)
      ? firebase.firestore.FieldValue.serverTimestamp()
      : new Date();

    if (!inc || typeof db.runTransaction !== 'function') {
      const snap = await usageRef.get();
      const used = snap.exists ? (Number((snap.data() || {})[field]) || 0) : 0;
      if (used + amount > limit) return { ok: false, used: used, limit: limit };
      await usageRef.set({ dayKey: key, updatedAt: serverTs, [field]: used + amount }, { merge: true });
      return { ok: true, used: used + amount, limit: limit };
    }

    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(usageRef);
      const used = snap.exists ? (Number((snap.data() || {})[field]) || 0) : 0;
      if (used + amount > limit) {
        return { ok: false, used: used, limit: limit };
      }
      tx.set(usageRef, { dayKey: key, updatedAt: serverTs, [field]: inc }, { merge: true });
      return { ok: true, used: used + amount, limit: limit };
    });

    return result;
  } catch (e) {
    return { ok: false, used: null, limit: limit || null, error: e };
  }
}

window.getLocalDayKey = getLocalDayKey;
window.tryConsumeDailyQuota = tryConsumeDailyQuota;

async function getDailyUsage(uid, dayKey) {
  try {
    if (!uid) return null;
    if (!db || typeof db.collection !== 'function') return null;
    const key = dayKey || getLocalDayKey(new Date());
    const usageRef = db.collection('users').doc(uid).collection('usageDaily').doc(String(key));
    const snap = await usageRef.get();
    if (!snap.exists) return { dayKey: key };
    return Object.assign({ dayKey: key }, (snap.data() || {}));
  } catch (_) {
    return null;
  }
}

window.getDailyUsage = getDailyUsage;

// === WAYBILL FIRESTORE (céges előkészítés: companyId) ===
const WAYBILL_DRAFT_DOC_ID = 'draft';

/** Firestore nem fogad el undefined mezőt; rekurzívan kihagyjuk. FieldValue/Timestamp sentinel-eket visszaadjuk változatlanul. */
function stripUndefinedForFirestore(obj) {
  if (obj === null) return null;
  if (obj === undefined) return undefined;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefinedForFirestore);
  if (obj.constructor && (obj.constructor.name === 'FieldValue' || obj.constructor.name === 'Timestamp')) return obj;
  var out = {};
  for (var key in obj) if (Object.prototype.hasOwnProperty.call(obj, key)) {
    var v = obj[key];
    if (v === undefined) continue;
    out[key] = stripUndefinedForFirestore(v);
  }
  return out;
}
var lastReconcileAtMs = 0;
const RECONCILE_THROTTLE_MS = 60000;

/** Felhasználó cég azonosítója (profile/info). Office / céges lekérdezéshez. */
async function getCompanyId(uid) {
  if (!uid || !db) return null;
  try {
    const snap = await db.collection('users').doc(uid).collection('profile').doc('info').get();
    const data = snap.exists ? snap.data() : {};
    return data.companyId != null ? String(data.companyId).trim() || null : null;
  } catch (e) {
    console.warn('[getCompanyId]', e && e.message);
    return null;
  }
}
window.getCompanyId = getCompanyId;

/** Menetlevél piszkozat betöltése Firestore-ból. Offline: localStorage. */
async function loadWaybillDraftFromFirestore(uid) {
  if (!uid || !db) return null;
  try {
    const ref = db.collection('users').doc(uid).collection('waybills').doc(WAYBILL_DRAFT_DOC_ID);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    return data;
  } catch (e) {
    console.warn('[Waybill] Firestore load failed:', e && e.message);
    return null;
  }
}
window.loadWaybillDraftFromFirestore = loadWaybillDraftFromFirestore;

/** Menetlevél piszkozat mentése Firestore-ba. Online: azonnal; offline: csak local, később sync. */
async function saveWaybillDraftToFirestore(uid, waybill) {
  if (!uid || !db || !waybill) return;
  try {
    const nowMs = waybill.updatedAtMs != null && typeof waybill.updatedAtMs === 'number' ? waybill.updatedAtMs : Date.now();
    const payload = {
      id: waybill.id,
      docType: 'draft',
      createdAt: waybill.createdAt || new Date().toISOString(),
      updatedAtMs: nowMs,
      status: waybill.status || 'active',
      header: waybill.header || {},
      entries: Array.isArray(waybill.entries) ? waybill.entries : [],
      footer: waybill.footer || {},
      companyId: waybill.companyId != null ? waybill.companyId : null
    };
    if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
      payload.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    }
    const ref = db.collection('users').doc(uid).collection('waybills').doc(WAYBILL_DRAFT_DOC_ID);
    await ref.set(stripUndefinedForFirestore(payload), { merge: true });
  } catch (e) {
    console.warn('[Waybill] Firestore save failed:', e && e.message);
    throw e;
  }
}
window.saveWaybillDraftToFirestore = saveWaybillDraftToFirestore;

/**
 * Menetlevél lezárása + új piszkozat: final doc = waybills/{waybillId}, draft reset = waybills/draft.
 * Visszatérés: az új draft objektum (localStorage-be mentendő).
 */
function generateWaybillId() {
  return 'wbl_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

async function finalizeWaybill(uid, currentDraft) {
  if (!uid || !db || !currentDraft || !currentDraft.id) {
    throw new Error('finalizeWaybill: hiányzó uid/db/draft vagy draft.id');
  }
  var waybillId = currentDraft.id;
  var nowMs = Date.now();
  var serverTs = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
    ? firebase.firestore.FieldValue.serverTimestamp()
    : null;
  var finalDoc = {
    id: waybillId,
    docType: 'final',
    createdAt: currentDraft.createdAt || new Date().toISOString(),
    updatedAtMs: nowMs,
    status: 'closed',
    header: currentDraft.header || {},
    entries: Array.isArray(currentDraft.entries) ? currentDraft.entries : [],
    footer: currentDraft.footer || {},
    companyId: currentDraft.companyId != null ? currentDraft.companyId : null,
    closedAtMs: nowMs
  };
  if (serverTs) finalDoc.closedAt = serverTs;

  var newId = generateWaybillId();
  var newDraft = {
    id: newId,
    docType: 'draft',
    createdAt: new Date().toISOString(),
    updatedAtMs: nowMs,
    status: 'active',
    header: currentDraft.header ? Object.assign({}, currentDraft.header) : {},
    entries: [],
    footer: currentDraft.footer ? Object.assign({}, currentDraft.footer) : {},
    companyId: currentDraft.companyId != null ? currentDraft.companyId : null
  };
  if (newDraft.header && newDraft.header.logoBase64) newDraft.header.logoBase64 = null;
  var payloadForFirestore = Object.assign({}, newDraft);
  if (serverTs) payloadForFirestore.updatedAt = serverTs;

  var waybillsRef = db.collection('users').doc(uid).collection('waybills');
  var finalRef = waybillsRef.doc(waybillId);
  var draftRef = waybillsRef.doc(WAYBILL_DRAFT_DOC_ID);

  await db.runTransaction(async function(tx) {
    tx.set(finalRef, stripUndefinedForFirestore(finalDoc));
    tx.set(draftRef, stripUndefinedForFirestore(payloadForFirestore));
  });

  var forClient = Object.assign({}, newDraft, { updatedAt: new Date(nowMs).toISOString() });
  return forClient;
}
window.finalizeWaybill = finalizeWaybill;

/**
 * Raklap mentése + waybill entry palletTxIds frissítése egy tranzakcióban (konzisztens, idempotens).
 * Ha a waybill draft vagy az entry nem létezik, csak a pallet doc kerül mentésre.
 */
async function savePalletAndLinkWaybillTransaction(uid, palletRecord) {
  if (!uid || !db || !palletRecord) return;
  const waybillId = palletRecord.waybillId;
  const waybillEntryId = palletRecord.waybillEntryId;
  const palletId = palletRecord.id;
  if (!waybillId || !waybillEntryId) {
    await db.collection('users').doc(uid).collection('pallets').doc(String(palletId)).set(palletRecord);
    return;
  }
  const waybillRef = db.collection('users').doc(uid).collection('waybills').doc(WAYBILL_DRAFT_DOC_ID);
  const palletRef = db.collection('users').doc(uid).collection('pallets').doc(String(palletId));
  const serverTs = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
    ? firebase.firestore.FieldValue.serverTimestamp()
    : null;
  const nowMs = Date.now();

  await db.runTransaction(async (tx) => {
    const waybillSnap = await tx.get(waybillRef);
    const waybillData = waybillSnap.exists ? waybillSnap.data() : null;
    let entries = Array.isArray(waybillData && waybillData.entries) ? waybillData.entries : [];
    let entry = entries.find(function(e) { return e && e.id === waybillEntryId; });
    if (entry) {
      var ids = Array.isArray(entry.palletTxIds) ? entry.palletTxIds.slice() : [];
      if (ids.indexOf(palletId) === -1) ids.push(palletId);
      var summary = {
        given: palletRecord.palletsGiven != null ? palletRecord.palletsGiven : null,
        taken: palletRecord.palletsTaken != null ? palletRecord.palletsTaken : null,
        location: palletRecord.location != null ? palletRecord.location : null,
        partner: palletRecord.partner != null ? palletRecord.partner : null,
        plate: palletRecord.licensePlate != null ? palletRecord.licensePlate : null,
        updatedAtMs: nowMs
      };
      entry = Object.assign({}, entry, { palletTxIds: ids, palletSummary: summary, palletPending: false });
      entries = entries.map(function(e) { return e.id === waybillEntryId ? entry : e; });
    }
    tx.set(palletRef, palletRecord);
    if (waybillData && waybillData.id === waybillId) {
      var payload = Object.assign({}, waybillData, { entries: entries, updatedAtMs: nowMs });
      if (serverTs) payload.updatedAt = serverTs;
      tx.set(waybillRef, stripUndefinedForFirestore(payload), { merge: true });
    }
  });
}
window.savePalletAndLinkWaybillTransaction = savePalletAndLinkWaybillTransaction;

/**
 * OFFLINE→ONLINE: fél-linkek javítása. palletRecords paraméter (guard: ha nincs/nem tömb, kilép).
 * Throttle: ne fusson gyakrabban RECONCILE_THROTTLE_MS-nál (login + online trigger).
 * Payload mindig a tranzakcióban beolvasott docból, csak entries + updatedAtMs/updatedAt módosul.
 */
async function reconcileWaybillPalletLinks(uid, palletRecords) {
  if (!uid || !db) return;
  if (!Array.isArray(palletRecords)) return;
  var now = Date.now();
  if (now - lastReconcileAtMs < RECONCILE_THROTTLE_MS) return;
  var linked = palletRecords.filter(function(p) {
    return p && p.id && p.waybillId && p.waybillEntryId;
  });
  if (linked.length === 0) return;
  const waybillRef = db.collection('users').doc(uid).collection('waybills').doc(WAYBILL_DRAFT_DOC_ID);
  const serverTs = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
    ? firebase.firestore.FieldValue.serverTimestamp()
    : null;
  const nowMs = now;

  await db.runTransaction(async (tx) => {
    const waybillSnap = await tx.get(waybillRef);
    const waybillData = waybillSnap.exists ? waybillSnap.data() : null;
    if (!waybillData || !waybillData.id) return;
    var waybillId = waybillData.id;
    var entryIdToPalletIds = {};
    linked.forEach(function(p) {
      if (p.waybillId !== waybillId) return;
      var eid = p.waybillEntryId;
      if (!eid) return;
      if (!entryIdToPalletIds[eid]) entryIdToPalletIds[eid] = [];
      if (entryIdToPalletIds[eid].indexOf(String(p.id)) === -1) entryIdToPalletIds[eid].push(String(p.id));
    });
    var entries = Array.isArray(waybillData.entries) ? waybillData.entries.map(function(entry) {
      if (!entry || !entry.id) return entry;
      var addIds = entryIdToPalletIds[entry.id];
      if (!addIds || addIds.length === 0) return entry;
      var ids = Array.isArray(entry.palletTxIds) ? entry.palletTxIds.slice() : [];
      addIds.forEach(function(pid) { if (ids.indexOf(pid) === -1) ids.push(pid); });
      return Object.assign({}, entry, { palletTxIds: ids });
    }) : [];
    var payload = Object.assign({}, waybillData, { entries: entries, updatedAtMs: nowMs });
    if (serverTs) payload.updatedAt = serverTs;
    tx.set(waybillRef, stripUndefinedForFirestore(payload), { merge: true });
  });
  lastReconcileAtMs = Date.now();
}
window.reconcileWaybillPalletLinks = reconcileWaybillPalletLinks;

/**
 * Törlés + unlink egy tranzakcióban: waybill entry-ből palletId kivétele, majd pallet doc törlése.
 */
async function deletePalletAndUnlinkWaybillTransaction(uid, palletId, waybillId, waybillEntryId) {
  if (!uid || !db) return;
  const waybillRef = db.collection('users').doc(uid).collection('waybills').doc(WAYBILL_DRAFT_DOC_ID);
  const palletRef = db.collection('users').doc(uid).collection('pallets').doc(String(palletId));
  const serverTs = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
    ? firebase.firestore.FieldValue.serverTimestamp()
    : null;
  const nowMs = Date.now();

  await db.runTransaction(async (tx) => {
    const waybillSnap = await tx.get(waybillRef);
    const waybillData = waybillSnap.exists ? waybillSnap.data() : null;
    var entries = Array.isArray(waybillData && waybillData.entries) ? waybillData.entries : [];
    if (waybillData && waybillData.id === waybillId && waybillEntryId) {
      var entry = entries.find(function(e) { return e && e.id === waybillEntryId; });
      if (entry && Array.isArray(entry.palletTxIds)) {
        var ids = entry.palletTxIds.filter(function(id) { return id !== String(palletId); });
        var updatedEntry = Object.assign({}, entry, {
          palletTxIds: ids,
          palletSummary: ids.length ? entry.palletSummary : null,
          palletPending: ids.length === 0 && !!entry.hasPalletSwap
        });
        entries = entries.map(function(e) {
          return e.id === waybillEntryId ? updatedEntry : e;
        });
        var payload = Object.assign({}, waybillData, { entries: entries, updatedAtMs: nowMs });
        if (serverTs) payload.updatedAt = serverTs;
        tx.set(waybillRef, stripUndefinedForFirestore(payload), { merge: true });
      }
    }
    tx.delete(palletRef);
  });
}
window.deletePalletAndUnlinkWaybillTransaction = deletePalletAndUnlinkWaybillTransaction;

/**
 * Szerkesztés: régi link remove + új link add (ha kell) + pallet doc frissítés, egy tranzakcióban.
 */
async function updatePalletAndRelinkWaybillTransaction(uid, palletId, existingRecord, recordToSave) {
  if (!uid || !db || !recordToSave) return;
  const waybillRef = db.collection('users').doc(uid).collection('waybills').doc(WAYBILL_DRAFT_DOC_ID);
  const palletRef = db.collection('users').doc(uid).collection('pallets').doc(String(palletId));
  const serverTs = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
    ? firebase.firestore.FieldValue.serverTimestamp()
    : null;
  const nowMs = Date.now();
  var oldWbl = existingRecord && existingRecord.waybillId && existingRecord.waybillEntryId
    ? { waybillId: existingRecord.waybillId, waybillEntryId: existingRecord.waybillEntryId }
    : null;
  var newWbl = recordToSave.waybillId && recordToSave.waybillEntryId
    ? { waybillId: recordToSave.waybillId, waybillEntryId: recordToSave.waybillEntryId }
    : null;
  var needRemove = oldWbl && (!newWbl || newWbl.waybillId !== oldWbl.waybillId || newWbl.waybillEntryId !== oldWbl.waybillEntryId);
  var needAdd = !!newWbl;

  await db.runTransaction(async (tx) => {
    const waybillSnap = await tx.get(waybillRef);
    const waybillData = waybillSnap.exists ? waybillSnap.data() : null;
    if (!waybillData || !waybillData.id) {
      tx.set(palletRef, recordToSave);
      return;
    }
    var entries = Array.isArray(waybillData.entries) ? waybillData.entries.slice() : [];
    if (needRemove && oldWbl && waybillData.id === oldWbl.waybillId) {
      var oldEntry = entries.find(function(e) { return e && e.id === oldWbl.waybillEntryId; });
      if (oldEntry && Array.isArray(oldEntry.palletTxIds)) {
        var ids = oldEntry.palletTxIds.filter(function(id) { return id !== String(palletId); });
        var oldUpdated = Object.assign({}, oldEntry, {
          palletTxIds: ids,
          palletSummary: ids.length ? oldEntry.palletSummary : null,
          palletPending: ids.length === 0 && !!oldEntry.hasPalletSwap
        });
        entries = entries.map(function(e) {
          return e.id === oldWbl.waybillEntryId ? oldUpdated : e;
        });
      }
    }
    if (needAdd && newWbl && waybillData.id === newWbl.waybillId) {
      var newEntry = entries.find(function(e) { return e && e.id === newWbl.waybillEntryId; });
      if (newEntry) {
        var ids = Array.isArray(newEntry.palletTxIds) ? newEntry.palletTxIds.slice() : [];
        if (ids.indexOf(String(palletId)) === -1) ids.push(String(palletId));
        var summary = {
          given: recordToSave.palletsGiven != null ? recordToSave.palletsGiven : null,
          taken: recordToSave.palletsTaken != null ? recordToSave.palletsTaken : null,
          location: recordToSave.location != null ? recordToSave.location : null,
          partner: recordToSave.partner != null ? recordToSave.partner : null,
          plate: recordToSave.licensePlate != null ? recordToSave.licensePlate : null,
          updatedAtMs: nowMs
        };
        var newUpdated = Object.assign({}, newEntry, { palletTxIds: ids, palletSummary: summary, palletPending: false });
        entries = entries.map(function(e) {
          return e.id === newWbl.waybillEntryId ? newUpdated : e;
        });
      }
    }
    var payload = Object.assign({}, waybillData, { entries: entries, updatedAtMs: nowMs });
    if (serverTs) payload.updatedAt = serverTs;
    tx.set(waybillRef, stripUndefinedForFirestore(payload), { merge: true });
    tx.set(palletRef, recordToSave);
  });
}
window.updatePalletAndRelinkWaybillTransaction = updatePalletAndRelinkWaybillTransaction;
