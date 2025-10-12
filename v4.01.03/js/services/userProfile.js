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
