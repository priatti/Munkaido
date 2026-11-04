// ===========================
//  UTM TRACKER – GuriGO
//  First-touch & Last-touch Attribution
//  + Stripe Conversion Tracking
// ===========================

(function() {
  'use strict';

  const FIRST_TOUCH_KEY = 'gurigo_utm_first';
  const LAST_TOUCH_KEY = 'gurigo_utm_last';

  // === NORMALIZE VALUE ===
  // Trim, lowercase, replace spaces with underscore, remove accents
  function normalize(value) {
    if (!value || typeof value !== 'string') return null;
    
    let normalized = value.trim().toLowerCase();
    
    // Replace spaces with underscores
    normalized = normalized.replace(/\s+/g, '_');
    
    // Remove accents (basic implementation)
    const accents = {
      'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ö': 'o', 'ő': 'o', 'ú': 'u', 'ü': 'u', 'ű': 'u',
      'Á': 'a', 'É': 'e', 'Í': 'i', 'Ó': 'o', 'Ö': 'o', 'Ő': 'o', 'Ú': 'u', 'Ü': 'u', 'Ű': 'u'
    };
    
    normalized = normalized.split('').map(char => accents[char] || char).join('');
    
    return normalized;
  }

  // === PARSE UTM FROM URL ===
  function parseUTMFromUrl() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      
      const utmData = {
        utm_source: normalize(urlParams.get('utm_source')),
        utm_medium: normalize(urlParams.get('utm_medium')),
        utm_campaign: normalize(urlParams.get('utm_campaign')),
        utm_content: normalize(urlParams.get('utm_content')),
        utm_term: normalize(urlParams.get('utm_term')),
        fbclid: urlParams.get('fbclid') || null,
        landingUrl: window.location.href,
        referrer: document.referrer || null,
        timestamp: new Date().toISOString()
      };

      // Check if at least one UTM parameter or fbclid exists
      const hasData = utmData.utm_source || utmData.utm_medium || utmData.utm_campaign || 
                      utmData.utm_content || utmData.utm_term || utmData.fbclid;

      return hasData ? utmData : null;
    } catch (e) {
      console.error('[UTM Tracker] Error parsing URL:', e);
      return null;
    }
  }

  // === SAVE FIRST TOUCH (only if missing) ===
  function saveFirstTouchIfMissing(payload) {
    try {
      const existing = localStorage.getItem(FIRST_TOUCH_KEY);
      if (existing) {
        console.log('[UTM Tracker] First-touch already exists, skipping');
        return false;
      }

      localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(payload));
      console.log('[UTM Tracker] First-touch saved:', payload);
      return true;
    } catch (e) {
      console.error('[UTM Tracker] Error saving first-touch:', e);
      return false;
    }
  }

  // === SAVE LAST TOUCH (always updates) ===
  function saveLastTouch(payload) {
    try {
      localStorage.setItem(LAST_TOUCH_KEY, JSON.stringify(payload));
      console.log('[UTM Tracker] Last-touch saved:', payload);
      return true;
    } catch (e) {
      console.error('[UTM Tracker] Error saving last-touch:', e);
      return false;
    }
  }

  // === GET FIRST TOUCH ===
  function getFirstTouch() {
    try {
      const stored = localStorage.getItem(FIRST_TOUCH_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('[UTM Tracker] Error getting first-touch:', e);
      return null;
    }
  }

  // === GET LAST TOUCH ===
  function getLastTouch() {
    try {
      const stored = localStorage.getItem(LAST_TOUCH_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('[UTM Tracker] Error getting last-touch:', e);
      return null;
    }
  }

  // === CLEAR UTM (debug/admin only) ===
  function clearUTM() {
    try {
      localStorage.removeItem(FIRST_TOUCH_KEY);
      localStorage.removeItem(LAST_TOUCH_KEY);
      console.log('[UTM Tracker] UTM data cleared');
      return true;
    } catch (e) {
      console.error('[UTM Tracker] Error clearing UTM:', e);
      return false;
    }
  }

  // === INIT UTM TRACKING ===
  function initUTMTracking() {
    console.log('[UTM Tracker] Initializing...');
    
    const utmData = parseUTMFromUrl();
    
    if (utmData) {
      console.log('[UTM Tracker] UTM parameters detected:', utmData);
      
      // Always save last-touch
      saveLastTouch(utmData);
      
      // Save first-touch only if missing
      saveFirstTouchIfMissing(utmData);
    } else {
      console.log('[UTM Tracker] No UTM parameters found');
    }
  }

  // === SAVE TRACKING TO FIRESTORE ===
  async function saveTrackingToFirestore(uid) {
    if (!uid) {
      console.warn('[UTM Tracker] No UID provided');
      return false;
    }

    try {
      if (typeof firebase === 'undefined' || !firebase.firestore) {
        console.warn('[UTM Tracker] Firebase not available');
        return false;
      }

      const firstTouch = getFirstTouch();
      const lastTouch = getLastTouch();

      const trackingData = {
        firstTouch: firstTouch || null,
        lastTouch: lastTouch || null,
        registeredAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await firebase.firestore().collection('users').doc(uid).set({
        tracking: trackingData
      }, { merge: true });

      console.log('[UTM Tracker] Tracking data saved to Firestore');
      return true;
    } catch (e) {
      console.error('[UTM Tracker] Error saving to Firestore:', e);
      return false;
    }
  }

  // === UPDATE LAST TOUCH IN FIRESTORE (for returning users) ===
  async function updateLastTouchInFirestore(uid) {
    if (!uid) return false;

    try {
      if (typeof firebase === 'undefined' || !firebase.firestore) {
        return false;
      }

      const lastTouch = getLastTouch();
      if (!lastTouch) return false;

      await firebase.firestore().collection('users').doc(uid).set({
        tracking: {
          lastTouch: lastTouch
        }
      }, { merge: true });

      console.log('[UTM Tracker] Last-touch updated in Firestore');
      return true;
    } catch (e) {
      console.error('[UTM Tracker] Error updating last-touch:', e);
      return false;
    }
  }

  // === GET TRACKING DATA FOR STRIPE ===
  function getTrackingForStripe() {
    const firstTouch = getFirstTouch();
    const lastTouch = getLastTouch();

    return {
      firstTouch: firstTouch || {},
      lastTouch: lastTouch || {}
    };
  }

  // === FLATTEN TRACKING FOR STRIPE METADATA ===
  // Stripe metadata only accepts strings, so we flatten the object
  // IMPORTANT: Only UTM params + fbclid, NO URLs (metadata size limit)
  function flattenTrackingForStripe() {
    const tracking = getTrackingForStripe();
    const metadata = {};

    // First-touch (csak UTM + fbclid, NO URLs)
    if (tracking.firstTouch && tracking.firstTouch.utm_source) {
      metadata.utm_source_first = tracking.firstTouch.utm_source || '';
      metadata.utm_medium_first = tracking.firstTouch.utm_medium || '';
      metadata.utm_campaign_first = tracking.firstTouch.utm_campaign || '';
      metadata.utm_content_first = tracking.firstTouch.utm_content || '';
      metadata.utm_term_first = tracking.firstTouch.utm_term || '';
      metadata.fbclid_first = tracking.firstTouch.fbclid || '';
      // landing_url és referrer NEM kerül Stripe-ba (csak Firestore)
    }

    // Last-touch (csak UTM + fbclid, NO URLs)
    if (tracking.lastTouch && tracking.lastTouch.utm_source) {
      metadata.utm_source_last = tracking.lastTouch.utm_source || '';
      metadata.utm_medium_last = tracking.lastTouch.utm_medium || '';
      metadata.utm_campaign_last = tracking.lastTouch.utm_campaign || '';
      metadata.utm_content_last = tracking.lastTouch.utm_content || '';
      metadata.utm_term_last = tracking.lastTouch.utm_term || '';
      metadata.fbclid_last = tracking.lastTouch.fbclid || '';
      // landing_url és referrer NEM kerül Stripe-ba (csak Firestore)
    }

    return metadata;
  }

  // === EXPORT FUNCTIONS ===
  window.utmTracker = {
    // Core functions
    parseUTMFromUrl,
    normalize,
    initUTMTracking,
    
    // Storage functions
    saveFirstTouchIfMissing,
    saveLastTouch,
    getFirstTouch,
    getLastTouch,
    clearUTM,
    
    // Firestore functions
    saveTrackingToFirestore,
    updateLastTouchInFirestore,
    
    // Stripe functions
    getTrackingForStripe,
    flattenTrackingForStripe
  };

  console.log('[UTM Tracker] Module loaded');
})();
