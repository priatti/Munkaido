// ===========================
//  TRIAL RESET HANDLER - GuriGO
//  Login-trigger pending reset aktiváláshoz
//  Backend HTTP endpoint hívás (admin jogosultságokkal)
// ===========================

// Backend endpoint URL
const ACTIVATE_TRIAL_ENDPOINT = 'https://europe-west3-munkaido-3cc44.cloudfunctions.net/activateTrialOnLogin';

/**
 * Ellenőrzi és aktiválja a pending trial reset-et login-kor
 * Backend HTTP endpoint hívással (admin jogosultságokkal)
 * @param {string} uid - User UID
 * @returns {Promise<Object>} Aktiválás eredmény
 */
async function checkAndActivatePendingTrialReset(uid) {
  if (!uid) {
    console.warn('[TrialReset] No UID provided');
    return { activated: false };
  }

  try {
    console.log('[TrialReset] Calling backend to activate trial');
    
    const token = window.currentUser && window.currentUser.getIdToken
      ? await window.currentUser.getIdToken()
      : await firebase.auth().currentUser.getIdToken();
    const response = await fetch(ACTIVATE_TRIAL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ uid })
    });
    
    const result = await response.json();
    
    if (result.activated) {
      console.log('[TrialReset] Activated on login:', result);
      
      // Frissítsük a kliens oldali állapotot is
      if (window.currentUserSubscription) {
        window.currentUserSubscription.tier = 'pro';
        window.currentUserSubscription.isTrial = true;
        window.currentUserSubscription.trialStartedAt = new Date(result.trialStartAt);
        window.currentUserSubscription.trialEnd = new Date(result.trialEndsAt);
        window.currentUserSubscription.expiry = new Date(result.trialEndsAt);
      }
    } else {
      console.log('[TrialReset] Not activated:', result.reason || 'unknown');
    }
    
    return result;

  } catch (error) {
    console.error('[TrialReset] Error activating pending reset:', error);
    return { activated: false, error: error.message };
  }
}

// Global scope export
window.checkAndActivatePendingTrialReset = checkAndActivatePendingTrialReset;
