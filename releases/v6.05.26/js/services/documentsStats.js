/**
 * Documents Manager Statistics Tracker
 * GDPR-compliant anonymous usage statistics
 * Only tracks aggregated, anonymous data - no personal information
 */

(function() {
  'use strict';

  const STATS_DOC_PATH = 'statistics/documentsManager';
  
  /**
   * Track that a user has used the Documents Manager feature
   * This increments anonymous counters only - no personal data stored
   */
  async function trackDocumentsManagerUsage() {
    try {
      if (!firebase || !firebase.firestore) {
        console.warn('[DocumentsStats] Firebase not available');
        return;
      }

      const db = firebase.firestore();
      const statsRef = db.doc(STATS_DOC_PATH);
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const dailyRef = db.doc(`${STATS_DOC_PATH}/daily/${today}`);

      // Check if main stats doc exists, if not create it first
      const statsDoc = await statsRef.get();
      if (!statsDoc.exists) {
        await statsRef.set({
          totalUsers: 1,
          totalDocuments: 0,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Update main statistics (atomic increment)
        await statsRef.update({
          totalUsers: firebase.firestore.FieldValue.increment(1),
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      // Update daily statistics
      await dailyRef.set({
        activeUsers: firebase.firestore.FieldValue.increment(1),
        date: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log('[DocumentsStats] Usage tracked (anonymous)');
    } catch (error) {
      console.warn('[DocumentsStats] Failed to track usage:', error.message);
    }
  }

  /**
   * Track document creation (anonymous counter only)
   */
  async function trackDocumentCreated() {
    try {
      if (!firebase || !firebase.firestore) return;

      const db = firebase.firestore();
      const statsRef = db.doc(STATS_DOC_PATH);
      const today = new Date().toISOString().split('T')[0];
      const dailyRef = db.doc(`${STATS_DOC_PATH}/daily/${today}`);

      // Update counters
      await statsRef.set({
        totalDocuments: firebase.firestore.FieldValue.increment(1),
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      await dailyRef.set({
        newDocuments: firebase.firestore.FieldValue.increment(1),
        date: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log('[DocumentsStats] Document creation tracked (anonymous)');
    } catch (error) {
      console.warn('[DocumentsStats] Failed to track document:', error.message);
    }
  }

  /**
   * Get statistics for admin dashboard
   * @returns {Promise<Object>} Statistics object
   */
  async function getDocumentsManagerStats() {
    try {
      if (!firebase || !firebase.firestore) {
        throw new Error('Firebase not available');
      }

      const db = firebase.firestore();
      const statsRef = db.doc(STATS_DOC_PATH);
      
      try {
        const doc = await statsRef.get();

        if (!doc.exists) {
          // Initialize statistics document if it doesn't exist
          await statsRef.set({
            totalUsers: 0,
            totalDocuments: 0,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          return {
            totalUsers: 0,
            totalDocuments: 0,
            lastUpdated: new Date()
          };
        }

        const data = doc.data();
        return {
          totalUsers: data.totalUsers || 0,
          totalDocuments: data.totalDocuments || 0,
          lastUpdated: data.lastUpdated ? data.lastUpdated.toDate() : null
        };
      } catch (permissionError) {
        // If permission denied, return empty stats (admin will see zeros)
        console.warn('[DocumentsStats] Permission denied, returning empty stats');
        return {
          totalUsers: 0,
          totalDocuments: 0,
          lastUpdated: null
        };
      }
    } catch (error) {
      console.error('[DocumentsStats] Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Get daily statistics for a date range
   * @param {number} days - Number of days to retrieve (default: 30)
   * @returns {Promise<Array>} Array of daily statistics
   */
  async function getDailyStats(days = 30) {
    try {
      if (!firebase || !firebase.firestore) {
        throw new Error('Firebase not available');
      }

      const db = firebase.firestore();
      
      try {
        // Try to get all daily stats (no date filter to avoid index issues)
        const snapshot = await db.collection(`${STATS_DOC_PATH}/daily`)
          .orderBy('date', 'desc')
          .limit(days)
          .get();

        const dailyStats = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          dailyStats.push({
            date: doc.id,
            activeUsers: data.activeUsers || 0,
            newDocuments: data.newDocuments || 0,
            timestamp: data.date ? data.date.toDate() : null
          });
        });

        return dailyStats;
      } catch (permissionError) {
        // If permission denied or no data, return empty array
        console.warn('[DocumentsStats] Permission denied or no daily stats, returning empty array');
        return [];
      }
    } catch (error) {
      console.error('[DocumentsStats] Failed to get daily stats:', error);
      return [];
    }
  }

  // Export functions
  window.documentsStats = {
    trackUsage: trackDocumentsManagerUsage,
    trackDocumentCreated: trackDocumentCreated,
    getStats: getDocumentsManagerStats,
    getDailyStats: getDailyStats
  };

  console.log('[DocumentsStats] Module loaded (GDPR-compliant)');
})();
