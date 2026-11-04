// =======================================================
// ===== ANNOUNCEMENTS SERVICE ===========================
// =======================================================
// Loads announcements from Firestore, manages user state, session tracking.

(function () {
  'use strict';

  const APP_VERSION = (window.APP_INFO && window.APP_INFO.version) ? window.APP_INFO.version : '6.05.26';
  const VALID_ENTRY_TYPES = ['new', 'fix', 'improvement', 'notice'];

  function normalizeEntryType(value) {
    const v = String(value || '').toLowerCase().trim();
    return VALID_ENTRY_TYPES.includes(v) ? v : 'new';
  }

  /** Play Áruház belső teszt toborzás: csak ennyi napja regisztrált (vagy idősebb) fiókok láthatják. */
  const PLAY_TEST_MIN_ACCOUNT_AGE_DAYS = 14;
  const PLAY_TEST_MIN_ACCOUNT_AGE_MS = PLAY_TEST_MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000;

  /**
   * Közlemény Play teszt toborzás-e (modal + lista + jelentkezés).
   */
  function isPlayTestRecruitment(ann) {
    if (!ann) return false;
    const sub = String(ann.subtype || '').trim();
    const act = String(ann.ctaAction || '').trim();
    return sub === 'play_internal_test' || sub === 'play_test_toborzo' || act === 'apply_play_test';
  }

  /**
   * Firebase Auth alapján: a fiók legalább PLAY_TEST_MIN_ACCOUNT_AGE_DAYS napja létezik-e.
   * Ha nincs creationTime, biztonságosan false (nem mutatjuk a toborzást).
   */
  function canSeePlayTestRecruitment(user) {
    try {
      if (!user || !user.metadata) return false;
      const raw = user.metadata.creationTime;
      if (!raw) return false;
      const created = new Date(raw).getTime();
      if (!Number.isFinite(created)) return false;
      return (Date.now() - created) >= PLAY_TEST_MIN_ACCOUNT_AGE_MS;
    } catch (_) {
      return false;
    }
  }

  /**
   * Load active announcements from Firestore.
   * @param {boolean} requireAuth - if true, only load when user is signed in
   * @returns {Promise<Array>}
   */
  async function loadAnnouncements(requireAuth = true) {
    try {
      if (typeof firebase === 'undefined' || !firebase.firestore) return [];
      const db = firebase.firestore();
      const now = firebase.firestore.Timestamp.now();
      const nowSec = now.seconds;

      let q = db.collection('announcements')
        .where('active', '==', true);

      if (requireAuth && (!firebase.auth || !firebase.auth().currentUser)) return [];

      const snapshot = await q.get();
      const items = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        const startOk = !d.startAt || (d.startAt && d.startAt.seconds <= nowSec);
        const endOk = !d.endAt || (d.endAt && d.endAt.seconds >= nowSec);
        if (startOk && endOk) {
          items.push({
            id: doc.id,
            ...d,
            entryType: normalizeEntryType(d.entryType)
          });
        }
      });

      items.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      return items;
    } catch (err) {
      console.error('[Announcements] loadAnnouncements error:', err);
      return [];
    }
  }

  /** Same key as legacy whatsNew.js (unread red dot); includes admin title_hu/content_hu. */
  function buildLegacyWhatsNewKey(item) {
    try {
      if (!item) return '';
      const idPart = item.id ? `id:${String(item.id)}` : '';
      const datePart = (typeof item.date !== 'undefined') ? `date:${String(item.date)}` : '';
      const titlePart = (typeof item.title !== 'undefined') ? `title:${String(item.title)}` : '';
      const contentPart = (typeof item.content !== 'undefined') ? `content:${String(item.content)}` : '';
      const titleHuPart = (typeof item.title_hu !== 'undefined') ? `title_hu:${String(item.title_hu)}` : '';
      const contentHuPart = (typeof item.content_hu !== 'undefined') ? `content_hu:${String(item.content_hu)}` : '';
      const versionPart = (typeof item.version !== 'undefined') ? `version:${String(item.version)}` : '';
      return [idPart, datePart, titlePart, contentPart, titleHuPart, contentHuPart, versionPart].filter(Boolean).join('|');
    } catch (_) {
      return '';
    }
  }

  /**
   * Legfrissebb whatsNew dokumentum kulcsa (nyelvi szűrés nélkül), ugyanaz a rendezés mint loadLegacyWhatsNew.
   * A piros pöttynek egyezzen a régi whatsNew.js viselkedésével: minden nyelven látszik, ha van új bejegyzés.
   */
  async function getNewestLegacyWhatsNewKey(requireAuth = true) {
    try {
      if (typeof firebase === 'undefined' || !firebase.firestore) return '';
      if (requireAuth && (!firebase.auth || !firebase.auth().currentUser)) return '';
      const db = firebase.firestore();
      const snapshot = await db.collection('whatsNew').get();
      if (snapshot.empty) return '';
      const raw = [];
      snapshot.forEach(doc => raw.push({ id: doc.id, ...doc.data() }));
      raw.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA);
      });
      return buildLegacyWhatsNewKey(raw[0]) || '';
    } catch (err) {
      console.error('[Announcements] getNewestLegacyWhatsNewKey error:', err);
      return '';
    }
  }

  function legacyWhatsNewVisibleForLang(d, lang) {
    const title = d[`title_${lang}`];
    const content = d[`content_${lang}`];
    if (lang === 'de' || lang === 'en' || lang === 'da' || lang === 'no') {
      return !!(title && content);
    }
    return !!(title || d.title);
  }

  /**
   * Legacy újdonságok a Firestore `whatsNew` gyűjteményből (admin „Újdonságok” fül).
   * Ugyanaz a szűrés, mint a régi whatsNew.js – translations mezőre normalizálva.
   */
  async function loadLegacyWhatsNew(requireAuth = true) {
    try {
      if (typeof firebase === 'undefined' || !firebase.firestore) return [];
      if (requireAuth && (!firebase.auth || !firebase.auth().currentUser)) return [];

      const lang = (typeof currentLang === 'string' && currentLang)
        ? currentLang
        : (typeof localStorage !== 'undefined' && localStorage.getItem('language')) || 'hu';

      const db = firebase.firestore();
      const snapshot = await db.collection('whatsNew').get();
      const raw = [];
      snapshot.forEach(doc => raw.push({ id: doc.id, ...doc.data() }));
      raw.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA);
      });

      const out = [];
      for (const d of raw) {
        if (!legacyWhatsNewVisibleForLang(d, lang)) continue;

        const translations = {};
        const langs = ['hu', 'de', 'en', 'ro', 'pl', 'da', 'no'];
        for (const lg of langs) {
          const tit = d[`title_${lg}`] || (lg === 'hu' ? d.title : undefined);
          const bod = d[`content_${lg}`] || (lg === 'hu' ? d.content : undefined);
          if (tit || bod) {
            translations[lg] = {
              title: String(tit || '').trim(),
              body: String(bod || '').trim()
            };
          }
        }
        if (!Object.keys(translations).length) continue;

        out.push({
          id: 'legacy_whatsnew_' + d.id,
          type: 'news',
          entryType: normalizeEntryType(d.type),
          translations,
          active: true,
          _legacyWhatsNewDate: d.date || '',
          _legacyWhatsNewVersion: d.version || '',
          _legacyWhatsNewKey: buildLegacyWhatsNewKey(d),
          priority: -999999
        });
      }
      return out;
    } catch (err) {
      console.error('[Announcements] loadLegacyWhatsNew error:', err);
      return [];
    }
  }

  /**
   * Közlemények + régi whatsNew egy listában (Újdonságok fül).
   */
  async function loadAnnouncementsAndLegacy(requireAuth = true) {
    const ann = await loadAnnouncements(requireAuth);
    const legacy = await loadLegacyWhatsNew(requireAuth);
    return [...ann, ...legacy];
  }

  /**
   * Get user's state for an announcement.
   * @param {string} uid
   * @param {string} announcementId
   * @returns {Promise<object|null>}
   */
  async function getUserAnnouncementState(uid, announcementId) {
    try {
      if (!uid || !announcementId || typeof firebase === 'undefined') return null;
      const db = firebase.firestore();
      const doc = await db.collection('users').doc(uid).collection('announcementStates').doc(announcementId).get();
      return doc.exists ? doc.data() : null;
    } catch (err) {
      console.error('[Announcements] getUserAnnouncementState error:', err);
      return null;
    }
  }

  /**
   * Set user's state for an announcement.
   * @param {string} uid
   * @param {string} announcementId
   * @param {string} status - seen | dismissed | rejected | applied
   * @param {object} extra - optional extra fields
   */
  async function setUserAnnouncementState(uid, announcementId, status, extra = {}) {
    try {
      if (!uid || !announcementId || typeof firebase === 'undefined') return;
      const db = firebase.firestore();
      const ref = db.collection('users').doc(uid).collection('announcementStates').doc(announcementId);
      const data = {
        status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        ...extra
      };
      if (status === 'seen') data.seenAt = firebase.firestore.FieldValue.serverTimestamp();
      if (status === 'dismissed') data.dismissedAt = firebase.firestore.FieldValue.serverTimestamp();
      if (status === 'rejected') data.rejectedAt = firebase.firestore.FieldValue.serverTimestamp();
      if (status === 'applied') data.appliedAt = firebase.firestore.FieldValue.serverTimestamp();
      await ref.set(data, { merge: true });
    } catch (err) {
      console.error('[Announcements] setUserAnnouncementState error:', err);
    }
  }

  /**
   * Record session start (for usage stats).
   */
  async function recordSessionStart() {
    try {
      const user = firebase.auth && firebase.auth().currentUser;
      if (!user || typeof firebase === 'undefined') return;

      const env = typeof window.detectAppEnvironment === 'function' ? window.detectAppEnvironment() : 'web';
      const platform = typeof window.detectPlatform === 'function' ? window.detectPlatform() : 'unknown';
      const lang = (typeof currentLang === 'string' && currentLang) ? currentLang : (localStorage.getItem('language') || 'hu');

      const db = firebase.firestore();
      const now = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('userSessions').add({
        uid: user.uid,
        startedAt: now,
        lastSeenAt: now,
        environment: env,
        platform,
        appVersion: APP_VERSION,
        language: lang
      });
    } catch (err) {
      console.warn('[Announcements] recordSessionStart error:', err);
    }
  }

  function getTargetingApi() {
    try {
      if (typeof window !== 'undefined' && window.announcementTargeting) return window.announcementTargeting;
    } catch (_) {}
    return null;
  }

  function isRatingRequest(ann) {
    const api = getTargetingApi();
    if (api && typeof api.isRatingRequest === 'function') return api.isRatingRequest(ann);
    const sub = String(ann && ann.subtype || '').trim();
    const typ = String(ann && ann.type || '').trim();
    const act = String(ann && ann.ctaAction || '').trim();
    return sub === 'rating_request' || typ === 'rating_request' || act === 'rate_app';
  }

  function isModalAnnouncement(ann) {
    const api = getTargetingApi();
    if (api && typeof api.isModalAnnouncement === 'function') return api.isModalAnnouncement(ann);
    if (!ann) return false;
    if (isRatingRequest(ann)) return true;
    return ann.type === 'announcement' && (ann.showAsModal === true || ann.loginModal === true);
  }

  /**
   * Find first unseen modal-worthy announcement for user.
   * Rating request popups use targeting.minRegistrationAgeDays / targeting.platforms /
   * display.oncePerUser. Legacy news/announcement docs stay on the previous path.
   * @param {string} uid
   * @param {Array} announcements
   * @returns {Promise<object|null>}
   */
  async function findFirstUnseenModalAnnouncement(uid, announcements) {
    if (!announcements || announcements.length === 0) return null;
    const user = firebase.auth && firebase.auth().currentUser;
    const targeting = getTargetingApi();
    const ctxExtra = targeting && typeof targeting.detectRatingContext === 'function'
      ? targeting.detectRatingContext()
      : {
          platform: typeof window.detectPlatform === 'function' ? window.detectPlatform() : 'unknown',
          environment: typeof window.detectAppEnvironment === 'function' ? window.detectAppEnvironment() : 'web',
          isNativeIos: typeof window.isNativeIosAppShell === 'function' && window.isNativeIosAppShell(),
          isNativeAppShell: !!(window.GuriGONative && window.GuriGONative.appShell === true)
        };

    const modalCandidates = announcements.filter(a => a && a.active !== false && isModalAnnouncement(a));
    for (const a of modalCandidates) {
      const state = await getUserAnnouncementState(uid, a.id);
      if (isRatingRequest(a)) {
        const show = targeting && typeof targeting.shouldShowRatingRequest === 'function'
          ? targeting.shouldShowRatingRequest(a, Object.assign({ user: user, state: state }, ctxExtra))
          : false;
        if (!show) continue;
        return a;
      }
      if (state && state.status) continue;
      if (isPlayTestRecruitment(a) && !canSeePlayTestRecruitment(user)) continue;
      return a;
    }
    return null;
  }

  /**
   * Call when user opens the app (once per session, when logged in).
   * Increments appOpenCount via Cloud Function.
   */
  async function trackAppOpen() {
    try {
      const user = firebase.auth && firebase.auth().currentUser;
      if (!user || typeof firebase.functions === 'undefined') return;
      const key = 'gurigo_app_open_tracked_' + user.uid;
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return;
      const env = typeof window.detectAppEnvironment === 'function' ? window.detectAppEnvironment() : 'web';
      const functionsInstance = firebase.app().functions('europe-west3');
      const fn = functionsInstance.httpsCallable('incrementAppOpen');
      await fn({ environment: env });
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, '1');
    } catch (err) {
      try { console.warn('[trackAppOpen] error:', err); } catch (_) {}
    }
  }

  /**
   * Call when user performs a meaningful save (workday, document, waybill, pallet).
   * Increments meaningfulSaveCount via Cloud Function.
   */
  async function trackMeaningfulSave() {
    try {
      const user = firebase.auth && firebase.auth().currentUser;
      if (!user || typeof firebase.functions === 'undefined') return;
      const env = typeof window.detectAppEnvironment === 'function' ? window.detectAppEnvironment() : 'web';
      try { console.log('[trackMeaningfulSave] calling incrementMeaningfulSave for uid:', user.uid, 'env:', env); } catch (_) {}
      const functionsInstance = firebase.app().functions('europe-west3');
      const fn = functionsInstance.httpsCallable('incrementMeaningfulSave');
      await fn({ environment: env });
      try { console.log('[trackMeaningfulSave] incrementMeaningfulSave success'); } catch (_) {}
    } catch (err) {
      try { console.warn('[trackMeaningfulSave] error:', err); } catch (_) {}
    }
  }

  window.announcementsService = {
    VALID_ENTRY_TYPES,
    normalizeEntryType,
    loadAnnouncements,
    loadLegacyWhatsNew,
    getNewestLegacyWhatsNewKey,
    loadAnnouncementsAndLegacy,
    isPlayTestRecruitment,
    canSeePlayTestRecruitment,
    isRatingRequest,
    isModalAnnouncement,
    PLAY_TEST_MIN_ACCOUNT_AGE_DAYS,
    getUserAnnouncementState,
    setUserAnnouncementState,
    recordSessionStart,
    findFirstUnseenModalAnnouncement,
    trackAppOpen,
    trackMeaningfulSave
  };
})();
