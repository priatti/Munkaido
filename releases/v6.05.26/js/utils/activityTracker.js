/**
 * Activity Tracker - GDPR Compliant User Activity Tracking
 * 
 * GDPR Compliance:
 * - Only tracks authenticated users
 * - Users own their data
 * - No cookies, no third-party tracking
 * - Data is functional (part of the service)
 * - Users can request deletion via account deletion
 * 
 * @version 1.0.0
 * @date 2025-11-01
 */

window.ActivityTracker = (function() {
  'use strict';

  const ACTIVITY_TYPES = {
    RECORD_CREATED: 'record_created',
    RECORD_UPDATED: 'record_updated',
    RECORD_DELETED: 'record_deleted',
    PALLET_CREATED: 'pallet_created',
    PALLET_UPDATED: 'pallet_updated',
    PALLET_DELETED: 'pallet_deleted',
    SHIFT_STARTED: 'shift_started',
    SHIFT_ENDED: 'shift_ended',
    FULL_DAY_RECORDED: 'full_day_recorded',
    LOGIN: 'login',
    REPORT_GENERATED: 'report_generated',
    EXPORT_DATA: 'export_data'
  };

  /**
   * Track user activity
   * @param {string} activityType - Type of activity (from ACTIVITY_TYPES)
   * @param {object} metadata - Optional metadata
   */
  async function trackActivity(activityType, metadata = {}) {
    try {
      // GDPR: Only track authenticated users
      if (!window.currentUser || !window.currentUser.uid) {
        console.log('[ActivityTracker] No authenticated user, skipping track');
        return;
      }

      const uid = window.currentUser.uid;
      const db = firebase.firestore();
      const now = new Date();
      const dateStr = formatDate(now); // YYYY-MM-DD

      // Batch update for performance
      const batch = db.batch();

      // 1. Update user_activity summary
      const activityRef = db.doc(`user_activity/${uid}`);
      batch.set(activityRef, {
        lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
        lastActivityType: activityType,
        [`total_${activityType}`]: firebase.firestore.FieldValue.increment(1)
      }, { merge: true });

      // 2. Update daily activity
      const dailyRef = db.doc(`user_activity/${uid}/daily/${dateStr}`);
      batch.set(dailyRef, {
        date: dateStr,
        [`${activityType}_count`]: firebase.firestore.FieldValue.increment(1),
        lastActivity: firebase.firestore.FieldValue.serverTimestamp(),
        ...metadata
      }, { merge: true });

      // === V6.03.21 BUG FIX ===
      // KORÁBBAN: a batch.set(profileRef, {...}, {merge:true}) ÚJ usernél létrehozott egy
      // 'csontváz' profile/info dokot, amit az ensureUserProfile ELSE-ága később
      // 'subscriptionTier:free'-re patch-elt (legacy backfill), így a friss regisztráló
      // free csomagba került trial helyett. Lásd: BUG_AUDIT_v6.03.20_FREE_TIER_RACE.md
      // JAVÍTÁS: nem írunk profile/info-ba; az admin.html user_activity/{uid}-ből olvas.
      await batch.commit();

      console.log(`[ActivityTracker] Tracked: ${activityType}`);
    } catch (error) {
      console.error('[ActivityTracker] Error tracking activity:', error);
      // Don't throw - tracking should never break the app
    }
  }

  /**
   * Track record creation
   * @param {number} count - Number of records created (default: 1)
   */
  async function trackRecordCreated(count = 1) {
    await trackActivity(ACTIVITY_TYPES.RECORD_CREATED, { count });
  }

  /**
   * Track record update
   */
  async function trackRecordUpdated() {
    await trackActivity(ACTIVITY_TYPES.RECORD_UPDATED);
  }

  /**
   * Track record deletion
   */
  async function trackRecordDeleted() {
    await trackActivity(ACTIVITY_TYPES.RECORD_DELETED);
  }

  /**
   * Track pallet creation
   * @param {number} count - Number of pallets created (default: 1)
   */
  async function trackPalletCreated(count = 1) {
    await trackActivity(ACTIVITY_TYPES.PALLET_CREATED, { count });
  }

  /**
   * Track pallet update
   */
  async function trackPalletUpdated() {
    await trackActivity(ACTIVITY_TYPES.PALLET_UPDATED);
  }

  /**
   * Track pallet deletion
   */
  async function trackPalletDeleted() {
    await trackActivity(ACTIVITY_TYPES.PALLET_DELETED);
  }

  /**
   * Track shift start
   */
  async function trackShiftStarted() {
    await trackActivity(ACTIVITY_TYPES.SHIFT_STARTED);
  }

  /**
   * Track shift end
   */
  async function trackShiftEnded() {
    await trackActivity(ACTIVITY_TYPES.SHIFT_ENDED);
  }

  /**
   * Track full day recording
   */
  async function trackFullDayRecorded() {
    await trackActivity(ACTIVITY_TYPES.FULL_DAY_RECORDED);
  }

  /**
   * Track login
   */
  async function trackLogin() {
    await trackActivity(ACTIVITY_TYPES.LOGIN);
  }

  /**
   * Track report generation
   * @param {string} reportType - Type of report generated
   */
  async function trackReportGenerated(reportType = 'unknown') {
    await trackActivity(ACTIVITY_TYPES.REPORT_GENERATED, { reportType });
  }

  /**
   * Track data export
   * @param {string} exportType - Type of export (e.g., 'csv', 'pdf')
   */
  async function trackExportData(exportType = 'unknown') {
    await trackActivity(ACTIVITY_TYPES.EXPORT_DATA, { exportType });
  }

  /**
   * Get user activity summary
   * @param {string} uid - User ID (optional, defaults to current user)
   * @returns {Promise<object>} Activity summary
   */
  async function getUserActivitySummary(uid = null) {
    try {
      const targetUid = uid || (window.currentUser && window.currentUser.uid);
      if (!targetUid) {
        throw new Error('No user ID provided');
      }

      const db = firebase.firestore();
      const activitySnap = await db.doc(`user_activity/${targetUid}`).get();

      if (!activitySnap.exists) {
        return {
          uid: targetUid,
          totalRecords: 0,
          totalPallets: 0,
          lastActivity: null,
          exists: false
        };
      }

      return {
        uid: targetUid,
        ...activitySnap.data(),
        exists: true
      };
    } catch (error) {
      console.error('[ActivityTracker] Error getting activity summary:', error);
      return { error: error.message };
    }
  }

  /**
   * Get user daily activity for a date range
   * @param {string} uid - User ID
   * @param {number} days - Number of days to fetch (default: 30)
   * @returns {Promise<array>} Array of daily activity objects
   */
  async function getUserDailyActivity(uid, days = 30) {
    try {
      const db = firebase.firestore();
      const dailyRef = db.collection(`user_activity/${uid}/daily`)
        .orderBy('date', 'desc')
        .limit(days);

      const snapshot = await dailyRef.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('[ActivityTracker] Error getting daily activity:', error);
      return [];
    }
  }

  /**
   * Format date to YYYY-MM-DD
   */
  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Public API
  return {
    ACTIVITY_TYPES,
    trackActivity,
    trackRecordCreated,
    trackRecordUpdated,
    trackRecordDeleted,
    trackPalletCreated,
    trackPalletUpdated,
    trackPalletDeleted,
    trackShiftStarted,
    trackShiftEnded,
    trackFullDayRecorded,
    trackLogin,
    trackReportGenerated,
    trackExportData,
    getUserActivitySummary,
    getUserDailyActivity
  };
})();

console.log('[ActivityTracker] Initialized (GDPR-compliant)');
