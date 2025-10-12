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
    }

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
  }
}

// Globális export (ha szükséges más moduloknak)
window.handleAuthStateChange = handleAuthStateChange;

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

window.saveSettingsToFirestore = saveSettingsToFirestore;

window.saveWorkRecord = saveWorkRecord;
