// === AUTH STATE CHANGE HANDLER (integrated with subscriptions) ===
async function handleAuthStateChange(user) {
  const isGuest = localStorage.getItem('isGuestMode') === 'true';
  window.currentUser = user;

  const splashScreen = document.getElementById('splash-screen');
  const authScreen = document.getElementById('auth-screen');
  const appScreen = document.getElementById('app');

  if (splashScreen && !splashScreen.classList.contains('hidden')) {
    splashScreen.classList.add('hidden');
    setTimeout(function(){ splashScreen.style.display = 'none'; }, 500);
  }

// === Helper: admin/program frissítheti a csomagot ===
async function setUserSubscriptionTier(tier) {
  const uid = window.currentUser && window.currentUser.uid;
  if (!uid) { console.warn('No logged-in user; cannot set subscription tier'); return false; }
  try {
    await db.collection('users').doc(uid).collection('settings').doc('subscription').set({ tier: String(tier), updatedAt: new Date().toISOString() }, { merge: true });
    window.currentUserSubscription = { tier: String(tier) };
    try { localStorage.setItem('currentUserSubscription', JSON.stringify(window.currentUserSubscription)); } catch(_) {}
    if (typeof renderApp === 'function') renderApp();
    if (typeof renderTachographStatusCard === 'function') renderTachographStatusCard();
    return true;
  } catch (e) {
    console.error('Failed to set subscription tier:', e);
    return false;
  }
}
window.setUserSubscriptionTier = setUserSubscriptionTier;


  if (user) {
    console.log('Bejelentkezve:', user.uid);
    if (authScreen) authScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');
    if (typeof updateAuthUI === 'function') updateAuthUI(user);

    // === ÚJ: ELŐFIZETÉS BETÖLTÉSE ===
    if (typeof loadUserSubscription === 'function') {
      await loadUserSubscription(user.uid);
    }

    const localRecords = JSON.parse(localStorage.getItem('workRecords') || '[]');
    const localPallets = JSON.parse(localStorage.getItem('palletRecords') || '[]');

    if (isGuest && (localRecords.length > 0 || localPallets.length > 0)) {
      console.log('Vendég adatok migrálása...');
      if (typeof migrateLocalToFirestore === 'function') {
        await migrateLocalToFirestore(localRecords, 'records');
        await migrateLocalToFirestore(localPallets, 'pallets');
      }
      localStorage.removeItem('workRecords');
      localStorage.removeItem('palletRecords');
      localStorage.removeItem('isGuestMode');
      console.log('Migrálás kész.');
    }

    if (typeof loadSettingsFromFirestore === 'function') {
      await loadSettingsFromFirestore();
    }
    if (typeof loadRecordsFromFirestore === 'function') {
      window.records = await loadRecordsFromFirestore('records');
      window.palletRecords = await loadRecordsFromFirestore('pallets');
      // Sync into module-scoped variables if they exist in other modules
      if (typeof records !== 'undefined') { try { records = window.records; } catch(_) {} }
      if (typeof palletRecords !== 'undefined') { try { palletRecords = window.palletRecords; } catch(_) {} }
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

    if (typeof renderApp === 'function') renderApp();

  } else if (isGuest) {
    console.log('Vendég mód aktív.');
    // === ÚJ: VENDÉG MODUS ELŐFIZETÉS ===
    window.currentUserSubscription = { tier: 'guest' };

    if (authScreen) authScreen.classList.add('hidden');
    if (appScreen) appScreen.classList.remove('hidden');
    if (typeof updateAuthUI === 'function') updateAuthUI(null);

    window.records = JSON.parse(localStorage.getItem('workRecords') || '[]');
    window.palletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');

    if (typeof renderApp === 'function') renderApp();

  } else {
    console.log('Kijelentkezve, bejelentkezési képernyő mutatása.');
    if (authScreen) authScreen.classList.remove('hidden');
    if (appScreen) appScreen.classList.add('hidden');
    if (typeof updateAuthUI === 'function') updateAuthUI(null);

    // === ÚJ: ELŐFIZETÉS TÖRLÉSE ===
    window.currentUserSubscription = null;
    window.records = [];
    window.palletRecords = [];

    // === ÚJ: Aktív műszak feliratkozás leállítása és lokális tisztítás ===
    try { if (window.activeShiftUnsubscribe) { window.activeShiftUnsubscribe(); } } catch(_) {}
    window.activeShiftUnsubscribe = null;
    try { localStorage.removeItem('activeShift'); } catch(_) {}
    window.activeShift = null;
  }
}

// Globális export (ha szükséges más moduloknak)
window.handleAuthStateChange = handleAuthStateChange;

// === Active shift one-time loader (top-level) ===
async function loadUserSubscription(uid) {
  try {
    // 1) Ha nincs bejelentkezve, próbáljuk a lokális cache-t
    if (!uid || !window.currentUser) {
      const cached = localStorage.getItem('currentUserSubscription');
      window.currentUserSubscription = cached ? JSON.parse(cached) : { tier: 'guest' };
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

    // d) users/{uid} fő dokumentum mezőként (pl. { subscriptionTier: 'max' })
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
    // Ha még nincs semmilyen információ, állítsunk "max"-ra a bejelentkezett felhasználóknál (később korlátozható), különben guest
    if (!tier) tier = window.currentUser ? 'max' : 'guest';
    window.currentUserSubscription = { tier };
    try { localStorage.setItem('currentUserSubscription', JSON.stringify(window.currentUserSubscription)); } catch(_) {}
    // 4) Kanonikus tárolás: users/{uid}/settings/subscription
    try {
      const userRef = db.collection('users').doc(uid);
      await userRef.collection('settings').doc('subscription').set({ tier, updatedAt: new Date().toISOString() }, { merge: true });
      // Kompatibilitás: írjuk a profilba is
      await userRef.collection('profile').doc('info').set({ subscriptionTier: tier, updatedAt: new Date(), updatedBy: (window.currentUser && window.currentUser.email) || 'system' }, { merge: true });
    } catch(e) { console.warn('Failed to persist canonical subscription doc:', e); }

    return window.currentUserSubscription;
  } catch (e) {
    console.warn('loadUserSubscription failed, fallback to cache/guest:', e);
    try {
      const cached = localStorage.getItem('currentUserSubscription');
      window.currentUserSubscription = cached ? JSON.parse(cached) : { tier: 'guest' };
    } catch(_) { window.currentUserSubscription = { tier: 'guest' }; }
    return window.currentUserSubscription;
  }
}

async function loadActiveShiftOnce() {
  if (!window.currentUser) {
    // Vendég mód: csak localStorage
    try {
      const raw = localStorage.getItem('activeShift');
      window.activeShift = raw ? JSON.parse(raw) : null;
    } catch(_) { window.activeShift = null; }
    return window.activeShift;
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
    return data;
  } catch (e) {
    console.error('Active shift load failed:', e);
    return null;
  }
}

// === Helper függvények (Opció A) ===
function updateAuthUI(user) {
  const loggedOutView = document.getElementById('logged-out-view');
  const loggedInView = document.getElementById('logged-in-view');
  const userNameEl = document.getElementById('user-name');
  if (user) {
    loggedOutView && loggedOutView.classList.add('hidden');
    loggedInView && loggedInView.classList.remove('hidden');
    if (userNameEl) userNameEl.textContent = user.email || 'Felhasználó';
  } else {
    loggedOutView && loggedOutView.classList.remove('hidden');
    loggedInView && loggedInView.classList.add('hidden');
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

async function loadRecordsFromFirestore(collectionName) {
  if (!currentUser) return [];
  try {
    const snapshot = await db.collection('users').doc(currentUser.uid).collection(collectionName).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('Records load failed:', e);
    return [];
  }
}

async function migrateLocalToFirestore(records, collectionName) {
  if (!currentUser || !Array.isArray(records) || records.length === 0) return;
  try {
    const batch = db.batch();
    records.forEach(record => {
      const docRef = db.collection('users').doc(currentUser.uid).collection(collectionName).doc(String(record.id));
      batch.set(docRef, record);
    });
    await batch.commit();
    console.log(`Migrated ${records.length} ${collectionName} to Firestore`);
  } catch (e) {
    console.error('Migration failed:', e);
  }
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
  // Local fall-back for guests / offline
  window.records = Array.isArray(window.records) ? window.records : [];
  if (!window.currentUser) {
    // keep unique by id
    window.records = window.records.filter(r => r.id !== record.id);
    window.records.push(record);
    try { localStorage.setItem('workRecords', JSON.stringify(window.records)); } catch(_) {}
    return;
  }
  try {
    await db.collection('users')
      .doc(window.currentUser.uid)
      .collection('records')
      .doc(String(record.id))
      .set(record);
    const idx = window.records.findIndex(r => r.id === record.id);
    if (idx > -1) window.records[idx] = record; else window.records.push(record);
  } catch (e) {
    console.error('Record save failed:', e);
    throw e;
  }
}

// === ÚJ: Aktív műszak felhő szinkron helper függvények ===
let activeShiftUnsubscribe = null;

async function saveActiveShift(shift) {
  try {
    // Ha nincs bejelentkezett felhasználó, marad lokális tárolás
    if (!window.currentUser) {
      try { localStorage.setItem('activeShift', JSON.stringify(shift)); } catch(_) {}
      window.activeShift = shift;
      return;
    }
    await db.collection('users')
      .doc(window.currentUser.uid)
      .collection('state')
      .doc('activeShift')
      .set(shift);
    window.activeShift = shift;
    try { console.log('[activeShift] saved to Firestore for uid:', window.currentUser.uid, shift); } catch(_) {}
    try { localStorage.setItem('activeShift', JSON.stringify(shift)); } catch(_) {}
  } catch (e) {
    console.error('Active shift save failed:', e);
  }
}

async function deleteActiveShift() {
  try {
    if (!window.currentUser) {
      try { localStorage.removeItem('activeShift'); } catch(_) {}
      window.activeShift = null;
      return;
    }
    await db.collection('users')
      .doc(window.currentUser.uid)
      .collection('state')
      .doc('activeShift')
      .delete()
      .catch(async () => {
        // Ha nem létezett, idempotens viselkedés
        await db.collection('users')
          .doc(window.currentUser.uid)
          .collection('state')
          .doc('activeShift')
          .set({}, { merge: true });
      });
    window.activeShift = null;
    try { localStorage.removeItem('activeShift'); } catch(_) {}
    try { console.log('[activeShift] deleted from Firestore for uid:', window.currentUser.uid); } catch(_) {}
  } catch (e) {
    console.error('Active shift delete failed:', e);
  }
}

function subscribeActiveShift() {
  if (!window.currentUser) return null;
  try {
    const docRef = db.collection('users')
      .doc(window.currentUser.uid)
      .collection('state')
      .doc('activeShift');
    const unsub = docRef.onSnapshot((snap) => {
      const data = snap.exists && Object.keys(snap.data() || {}).length > 0 ? snap.data() : null;
      window.activeShift = data || null;
      try {
        if (data) localStorage.setItem('activeShift', JSON.stringify(data));
        else localStorage.removeItem('activeShift');
      } catch(_) {}
      try { console.log('[activeShift] snapshot received:', !!data, data); } catch(_) {}
      try { if (typeof renderStartTab === 'function') renderStartTab(); } catch(_) {}
      try { if (typeof renderTachographStatusCard === 'function') renderTachographStatusCard(); } catch(_) {}
    });
    return unsub;
  } catch (e) {
    console.error('Active shift subscribe failed:', e);
    return null;
  }
}

window.saveSettingsToFirestore = saveSettingsToFirestore;

window.saveWorkRecord = saveWorkRecord;

// Export új helper függvények
window.saveActiveShift = saveActiveShift;
window.deleteActiveShift = deleteActiveShift;
window.subscribeActiveShift = subscribeActiveShift;
window.loadActiveShiftOnce = loadActiveShiftOnce;

// Ensure records are present when UI needs them
async function ensureRecordsLoaded() {
  try {
    if (window.currentUser && (!Array.isArray(window.records) || window.records.length === 0)) {
      const loaded = await loadRecordsFromFirestore('records');
      if (Array.isArray(loaded)) {
        window.records = loaded;
        if (typeof records !== 'undefined') { try { records = window.records; } catch(_) {} }
        if (typeof renderRecords === 'function') { renderRecords(); }
        try { if (typeof renderTachographStatusCard === 'function') renderTachographStatusCard(); } catch(_) {}
        try { if (typeof renderTachoHelperCards === 'function') renderTachoHelperCards(); } catch(_) {}
      }
    }
  } catch (e) {
    console.warn('ensureRecordsLoaded failed:', e);
  }
}

window.ensureRecordsLoaded = ensureRecordsLoaded;
