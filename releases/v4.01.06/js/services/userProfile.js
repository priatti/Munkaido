// === FELHASZNÁLÓI PROFIL KEZELÉS ===
window.currentUserSubscription = null;

// === ELŐFIZETÉS BETÖLTÉSE ===
async function loadUserSubscription(userId) {
  if (!userId) {
    window.currentUserSubscription = { tier: 'guest' };
    return;
  }
  try {
    const ref = firebase.firestore().collection('users').doc(userId).collection('profile').doc('info');
    const snap = await ref.get();
    if (snap.exists) {
      const data = snap.data();
      const expiry = data.subscriptionExpiry && typeof data.subscriptionExpiry.toDate === 'function'
        ? data.subscriptionExpiry.toDate()
        : (data.subscriptionExpiry || null);
      window.currentUserSubscription = {
        tier: data.subscriptionTier || 'free',
        expiry: expiry,
        isActive: data.isActive !== false
      };
      if (expiry && expiry < new Date()) {
        await downgradeToFree(userId);
      }
    } else {
      await createUserProfile(userId);
    }
    console.log('User subscription loaded:', window.currentUserSubscription);
  } catch (error) {
    console.error('Error loading subscription:', error);
    window.currentUserSubscription = { tier: 'free' };
  }
}

// === PROFIL LÉTREHOZÁSA (első bejelentkezés) ===
async function createUserProfile(userId) {
  try {
    const user = firebase.auth().currentUser;
    // +1 év MAX csomag
    const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    await firebase.firestore()
      .collection('users')
      .doc(userId)
      .collection('profile')
      .doc('info')
      .set({
        displayName: (user && user.displayName) || '',
        email: (user && user.email) || '',
        subscriptionTier: 'max',            // ← 'free' helyett 'max'
        subscriptionExpiry: expiryDate,     // ← új lejárati dátum
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
      });

    // Frissítsük a kliens oldali állapotot is
    window.currentUserSubscription = { tier: 'max', expiry: expiryDate, isActive: true };
    console.log('User profile created with MAX tier');
  } catch (error) {
    console.error('Error creating user profile:', error);
  }
}


// === ELŐFIZETÉS FRISSÍTÉSE ===
async function updateSubscription(userId, newTier, expiryDate) {
  try {
    await firebase.firestore().collection('users').doc(userId).collection('profile').doc('info').update({
      subscriptionTier: newTier,
      subscriptionExpiry: expiryDate || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    window.currentUserSubscription = { tier: newTier, expiry: expiryDate || null, isActive: true };
    console.log('Subscription updated:', newTier);
    if (typeof renderApp === 'function') renderApp();
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }
}

// === LEMONDÁS / LEJÁRAT KEZELÉS ===
async function downgradeToFree(userId) {
  try {
    await firebase.firestore().collection('users').doc(userId).collection('profile').doc('info').update({
      subscriptionTier: 'free',
      subscriptionExpiry: null,
      downgradedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    window.currentUserSubscription = { tier: 'free' };
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('ℹ️ Előfizetésed lejárt, visszaváltottunk Free csomagra.', 'info');
    }
  } catch (error) {
    console.error('Error downgrading:', error);
  }
}

// Globális export
window.loadUserSubscription = loadUserSubscription;
window.createUserProfile = createUserProfile;
window.updateSubscription = updateSubscription;
window.downgradeToFree = downgradeToFree;


// ===== Country inference =====
function inferCountryCode(){
  var lang = (navigator.language || '').toUpperCase();
  var m = lang.match(/-([A-Z]{2})$/);
  if (m && m[1]) return m[1];
  return 'HU';
}


// ===== Ensure user profile (create/patch) =====
async function ensureUserProfile(uid){
  var ref = db.collection('users').doc(uid).collection('profile').doc('info');
  var snap = await ref.get();
  if (!snap.exists){
    var u = firebase.auth().currentUser || {};
    var data = {
      userId: uid,
      displayName: u.displayName || '',
      email: u.email || '',
      subscriptionTier: 'max',
      countryCode: inferCountryCode(),
      countryConfirmed: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await ref.set(data, {merge:true});
    return data;
  } else {
    var d = snap.data() || {};
    // Backfill missing fields for legacy profiles
    var patch = {};
    var u2 = firebase.auth().currentUser || {};
    if (!d.email && u2.email) patch.email = u2.email;
    if (!d.displayName && u2.displayName) patch.displayName = u2.displayName;
    if (!d.subscriptionTier) patch.subscriptionTier = 'max';
    if (!d.createdAt) patch.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    if (Object.keys(patch).length) {
      patch.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await ref.set(patch, { merge: true });
      Object.assign(d, patch);
    }
    if (!d.countryCode){
      var cc = inferCountryCode();
      await ref.set({ countryCode: cc, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, {merge:true});
      d.countryCode = cc;
    }
    return d;
  }
}
window.ensureUserProfile = ensureUserProfile;
