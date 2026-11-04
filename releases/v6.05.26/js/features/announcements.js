// =======================================================
// ===== ÚJDONSÁGOK & KÖZLEMÉNYEK (ANNOUNCEMENTS) ========
// =======================================================
// Firestore-based announcements, modal on login, Play test apply flow.

(function () {
  'use strict';

  let authListenerAttached = false;
  let initAttempts = 0;

  function t(key, fallback) {
    try {
      const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
      const v = i18n.announcements && i18n.announcements[key] !== undefined ? i18n.announcements[key] : (i18n[key] || fallback);
      return (v !== undefined && v !== null && String(v).trim() !== '') ? v : fallback;
    } catch (_) { return fallback; }
  }

  function getLang() {
    return (typeof currentLang === 'string' && currentLang) ? currentLang : (localStorage.getItem('language') || 'hu');
  }

  function getTranslation(item, field) {
    const lang = getLang();
    const tr = item.translations && item.translations[lang];
    if (tr && tr[field]) return tr[field];
    const fallback = item.translations && (item.translations.hu || item.translations.en);
    return (fallback && fallback[field]) ? fallback[field] : '';
  }

  function setDotVisible(id, visible) {
    try {
      const el = document.getElementById(id);
      if (!el) return;
      // A pötty méretét/pozícióját/színét a HTML-ben inline style adja meg (minden dot-ra
      // testre szabva: dot-gear a fogaskeréken, dot-settings/dot-more a 🎁 emoji mellett).
      // Itt csak a láthatóságot kapcsolgatjuk, hogy a HTML stílusok érvényben maradjanak.
      if (visible) {
        el.classList.remove('hidden');
        el.style.display = 'block';
        el.style.visibility = 'visible';
        el.style.opacity = '1';
      } else {
        el.classList.add('hidden');
        el.style.display = 'none';
      }
    } catch (_) {}
  }

  async function refreshUnreadDots() {
    const user = firebase.auth && firebase.auth().currentUser;
    if (!user || !window.announcementsService) return;

    const svc = window.announcementsService;
    let hasUnread = false;

    // 1) Minden aktív announcement (type=news ÉS type=announcement, modal vagy sem):
    //    akkor olvasatlan a user szemszögéből, ha nincs per-user state az
    //    `users/{uid}/announcementStates/{id}` alatt, vagy a status üres.
    //    Korábban csak `type==='announcement' && showAsModal===true` számított, ezért
    //    a legtöbb admin által létrehozott újdonság nem triggerelte a pöttyöt.
    try {
      const items = await svc.loadAnnouncements(true);
      const visible = items.filter(function (a) {
        if (isRatingRequest(a)) return false;
        if (svc && typeof svc.isPlayTestRecruitment === 'function' && svc.isPlayTestRecruitment(a) &&
            typeof svc.canSeePlayTestRecruitment === 'function' && !svc.canSeePlayTestRecruitment(user)) {
          return false;
        }
        return true;
      });
      for (const a of visible) {
        if (!a || !a.id) continue;
        try {
          const state = typeof svc.getUserAnnouncementState === 'function'
            ? await svc.getUserAnnouncementState(user.uid, a.id)
            : null;
          if (!state || !state.status) {
            hasUnread = true;
            break;
          }
        } catch (_) { /* state olvasási hiba: konzervatív, nem billentünk true-ra */ }
      }
    } catch (e) {
      try { console.warn('[Announcements] refreshUnreadDots loadAnnouncements:', e && (e.message || String(e))); } catch (_) {}
    }

    // 2) Legacy „whatsNew” collection (régi admin felület): globálisan legfrissebb doc kulcsa
    //    vs. localStorage.lastSeenWhatsNew.
    if (!hasUnread) {
      try {
        const newestKey = typeof svc.getNewestLegacyWhatsNewKey === 'function'
          ? await svc.getNewestLegacyWhatsNewKey(true)
          : '';
        const lastSeen = typeof localStorage !== 'undefined' ? localStorage.getItem('lastSeenWhatsNew') : '';
        if (newestKey && String(lastSeen || '').trim() !== String(newestKey).trim()) {
          hasUnread = true;
        }
      } catch (e) {
        try { console.warn('[Announcements] refreshUnreadDots legacy key:', e && (e.message || String(e))); } catch (_) {}
      }
    }

    try {
      setDotVisible('whatsnew-dot-gear', hasUnread);
      setDotVisible('whatsnew-dot-settings', hasUnread);
      setDotVisible('whatsnew-dot-more', hasUnread);
    } catch (_) {}
  }

  function isPlayTestRecruitment(ann) {
    try {
      const svc = window.announcementsService;
      if (svc && typeof svc.isPlayTestRecruitment === 'function') return svc.isPlayTestRecruitment(ann);
    } catch (_) {}
    return false;
  }

  function isRatingRequest(ann) {
    try {
      const targeting = window.announcementTargeting;
      if (targeting && typeof targeting.isRatingRequest === 'function') return targeting.isRatingRequest(ann);
      const svc = window.announcementsService;
      if (svc && typeof svc.isRatingRequest === 'function') return svc.isRatingRequest(ann);
    } catch (_) {}
    const sub = String(ann && ann.subtype || '').trim();
    const typ = String(ann && ann.type || '').trim();
    const act = String(ann && ann.ctaAction || '').trim();
    return sub === 'rating_request' || typ === 'rating_request' || act === 'rate_app';
  }

  function requestAppRating() {
    try {
      const targeting = window.announcementTargeting;
      if (targeting && typeof targeting.requestAppRating === 'function') {
        return targeting.requestAppRating();
      }
    } catch (_) {}
    return { method: 'none' };
  }

  async function markRatingRequestShown(announcement) {
    try {
      const uid = firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.uid;
      if (!uid || !announcement || !announcement.id || !window.announcementsService) return;
      await window.announcementsService.setUserAnnouncementState(uid, announcement.id, 'seen', {
        seen: true,
        action: 'shown'
      });
    } catch (e) {
      try { console.warn('[Announcements] markRatingRequestShown failed:', e); } catch (_) {}
    }
  }

  function ensureAnnouncementModalStyles() {
    if (document.getElementById('announcement-modal-styles')) return;
    const style = document.createElement('style');
    style.id = 'announcement-modal-styles';
    style.textContent = '#announcement-modal-wrap .announcement-modal-overlay{position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 12px max(72px,calc(12px + env(safe-area-inset-bottom))) 12px;background:rgba(15,23,42,.55);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);overflow-y:auto;overflow-x:hidden;box-sizing:border-box}#announcement-modal-wrap .announcement-modal-card{position:relative;z-index:1;display:flex;flex-direction:column;width:calc(100vw - 24px);max-width:520px;max-height:calc(100dvh - 110px);border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 25px 50px -12px rgba(0,0,0,.35);box-sizing:border-box;flex-shrink:0}html.dark #announcement-modal-wrap .announcement-modal-card{background:#1f2937}#announcement-modal-wrap .announcement-modal-layout{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;max-height:inherit}#announcement-modal-wrap .announcement-modal-hero{position:relative;flex-shrink:0;width:100%;padding:20px;box-sizing:border-box;background:linear-gradient(135deg,#2563eb 0%,#4f46e5 100%);color:#fff}#announcement-modal-wrap .announcement-modal-close{position:absolute;top:12px;right:12px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border:none;border-radius:9999px;background:rgba(255,255,255,.2);color:#fff;cursor:pointer;padding:0}#announcement-modal-wrap .announcement-modal-close:hover{background:rgba(255,255,255,.3)}#announcement-modal-wrap .announcement-modal-close svg{width:16px;height:16px}#announcement-modal-wrap .announcement-modal-hero-icon{display:block;font-size:1.5rem;line-height:1;margin-bottom:8px}#announcement-modal-wrap .announcement-modal-hero-title{margin:0;padding-right:40px;font-size:20px;font-weight:700;line-height:1.25}#announcement-modal-wrap .announcement-modal-main{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;min-width:0}#announcement-modal-wrap .announcement-modal-body{flex:1 1 auto;min-height:0;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:18px 20px;box-sizing:border-box}#announcement-modal-wrap .announcement-modal-body-text{margin:0;font-size:15px;line-height:1.5;color:#374151;white-space:pre-line;word-wrap:break-word;overflow-wrap:anywhere}html.dark #announcement-modal-wrap .announcement-modal-body-text{color:#e5e7eb}#announcement-modal-wrap .announcement-modal-footer{flex-shrink:0;display:flex;flex-direction:column;gap:10px;padding:14px 20px calc(16px + env(safe-area-inset-bottom));border-top:1px solid #e5e7eb;background:#fff;box-sizing:border-box}html.dark #announcement-modal-wrap .announcement-modal-footer{border-top-color:#374151;background:#1f2937}#announcement-modal-wrap .announcement-modal-footer-actions{display:flex;flex-direction:column;gap:10px;width:100%}#announcement-modal-wrap .announcement-modal-btn{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 16px;border-radius:12px;font-size:15px;font-weight:600;line-height:1.2;cursor:pointer;box-sizing:border-box;border:1.5px solid transparent}#announcement-modal-wrap .announcement-modal-btn--secondary{background:#fff;border-color:#d1d5db;color:#374151}html.dark #announcement-modal-wrap .announcement-modal-btn--secondary{background:#374151;border-color:#4b5563;color:#f3f4f6}#announcement-modal-wrap .announcement-modal-btn--primary{background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);border-color:#16a34a;color:#fff}#announcement-modal-wrap .announcement-modal-btn--ghost{background:transparent;border-color:#e5e7eb;color:#6b7280;font-weight:500}html.dark #announcement-modal-wrap .announcement-modal-btn--ghost{border-color:#4b5563;color:#9ca3af}@media (min-width:641px){#announcement-modal-wrap .announcement-modal-card{width:min(calc(100vw - 48px),680px);max-width:680px}#announcement-modal-wrap .announcement-modal-layout{flex-direction:row;align-items:stretch}#announcement-modal-wrap .announcement-modal-hero{flex:0 0 36%;max-width:38%;width:auto;min-height:0;display:flex;flex-direction:column;justify-content:center;padding:28px 24px}#announcement-modal-wrap .announcement-modal-hero-title{font-size:1.25rem;line-height:1.3}#announcement-modal-wrap .announcement-modal-body{padding:22px 24px}#announcement-modal-wrap .announcement-modal-body-text{font-size:16px;line-height:1.55}#announcement-modal-wrap .announcement-modal-footer{flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:12px;padding-bottom:18px}#announcement-modal-wrap .announcement-modal-btn--ghost{margin-right:auto;min-height:44px;width:auto;border-color:transparent}#announcement-modal-wrap .announcement-modal-footer-actions{flex-direction:row;flex-wrap:wrap;justify-content:flex-end;width:auto;gap:10px}#announcement-modal-wrap .announcement-modal-footer-actions .announcement-modal-btn{min-height:44px;min-width:120px;width:auto}}@media (max-width:640px){#announcement-modal-wrap .announcement-modal-footer .announcement-modal-btn,#announcement-modal-wrap .announcement-modal-footer-actions .announcement-modal-btn{width:100%}}';
    document.head.appendChild(style);
  }

  function showAnnouncementModal(announcement, onClose) {
    ensureAnnouncementModalStyles();
    const title = getTranslation(announcement, 'title');
    const body = getTranslation(announcement, 'body');
    const ctaLabel = getTranslation(announcement, 'ctaLabel');
    const ctaAction = announcement.ctaAction || 'none';

    const isPlayTest = isPlayTestRecruitment(announcement);
    const isRating = isRatingRequest(announcement);
    const isAndroid = typeof window.detectPlatform === 'function' && window.detectPlatform() === 'android';
    const showCta = ctaAction !== 'none' && (ctaLabel || (isPlayTest && isAndroid) || isRating);
    const showReject = announcement.showRejectButton !== false;
    const iconEmoji = isRating ? '⭐' : (isPlayTest ? '📱' : '📢');
    const closeLabel = t('ctaClose', 'Bezárás');
    const rejectLabel = t('ctaNotNow', 'Most kihagyom');
    const primaryLabel = (ctaLabel || (isRating ? t('ctaRateApp', 'Értékelés') : t('ctaApply', 'Jelentkezem'))).replace(/</g, '&lt;');
    const safeTitle = (title || '').replace(/</g, '&lt;');
    const safeBody = (body || '').replace(/</g, '&lt;');
    const closeAria = closeLabel.replace(/"/g, '&quot;');
    let ratingHref = '';
    try {
      const targeting = window.announcementTargeting;
      ratingHref = targeting && typeof targeting.getRatingStoreUrl === 'function'
        ? targeting.getRatingStoreUrl()
        : (targeting && typeof targeting.getPlayStoreListingUrl === 'function'
          ? targeting.getPlayStoreListingUrl()
          : 'https://play.google.com/store/apps/details?id=eu.gurigo.app&hl=hu');
    } catch (_) {
      ratingHref = 'https://play.google.com/store/apps/details?id=eu.gurigo.app&hl=hu';
    }
    const safeRatingHref = String(ratingHref || '').replace(/"/g, '&quot;');
    const ctaControl = !showCta ? '' : (isRating
      ? `<a class="announcement-modal-btn announcement-modal-btn--primary" href="${safeRatingHref}" target="_blank" rel="noopener noreferrer" data-action="cta" data-announcement-id="${announcement.id}" style="text-decoration:none">${primaryLabel}</a>`
      : `<button type="button" class="announcement-modal-btn announcement-modal-btn--primary" data-action="cta" data-announcement-id="${announcement.id}">${primaryLabel}</button>`);

    let modalHtml = `
      <div id="announcement-modal-overlay" class="announcement-modal-overlay" onclick="if(event.target===this)window.closeAnnouncementModal?.()">
        <div class="announcement-modal-card" role="dialog" aria-modal="true" aria-labelledby="announcement-modal-title" onclick="event.stopPropagation()">
          <div class="announcement-modal-layout">
            <aside class="announcement-modal-hero">
              <button type="button" class="announcement-modal-close" data-action="close" aria-label="${closeAria}">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
              <span class="announcement-modal-hero-icon" aria-hidden="true">${iconEmoji}</span>
              <h3 id="announcement-modal-title" class="announcement-modal-hero-title">${safeTitle}</h3>
            </aside>
            <div class="announcement-modal-main">
              <div class="announcement-modal-body">
                <p class="announcement-modal-body-text">${safeBody}</p>
              </div>
              <footer class="announcement-modal-footer">
                ${showReject ? `<button type="button" class="announcement-modal-btn announcement-modal-btn--ghost" data-action="reject">${rejectLabel}</button>` : ''}
                <div class="announcement-modal-footer-actions">
                  <button type="button" class="announcement-modal-btn announcement-modal-btn--secondary" data-action="close">${closeLabel}</button>
                  ${showCta ? ctaControl : ''}
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    `;

    const wrap = document.createElement('div');
    wrap.id = 'announcement-modal-wrap';
    wrap.innerHTML = modalHtml;
    document.body.appendChild(wrap);

    window.closeAnnouncementModal = function () {
      const w = document.getElementById('announcement-modal-wrap');
      if (w) w.remove();
      window.closeAnnouncementModal = null;
      if (typeof onClose === 'function') onClose();
    };

    if (isRating) {
      markRatingRequestShown(announcement);
    }

    wrap.querySelectorAll('button, a[data-action]').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        const action = btn.dataset.action;
        const uid = firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.uid;

        if (action === 'cta' && isRatingRequest(announcement)) {
          const href = (btn.getAttribute && btn.getAttribute('href')) || safeRatingHref;
          let opened = null;
          try { opened = href ? window.open(href, '_blank') : null; } catch (_) { opened = null; }
          if (!opened && href && String(btn.tagName || '').toUpperCase() !== 'A') {
            try { window.location.href = href; } catch (_) {}
          }
          if (opened && ev && typeof ev.preventDefault === 'function') ev.preventDefault();
          if (uid && window.announcementsService) {
            window.announcementsService.setUserAnnouncementState(uid, announcement.id, 'applied', {
              seen: true,
              action: 'rated',
              ctaClickedAt: true
            }).catch(function (e) {
              try { console.warn('[Announcements] setUserAnnouncementState (rate_app) failed:', e); } catch (_) {}
            });
          }
          setTimeout(function () {
            try { window.closeAnnouncementModal(); } catch (_) {}
          }, 350);
          return;
        }

        // Play teszt: második ablak — ctaAction=apply_play_test elég, nem kell hibásan kitöltött subtype
        if (action === 'cta' && isPlayTestRecruitment(announcement)) {
          if (uid && window.announcementsService) {
            try {
              await window.announcementsService.setUserAnnouncementState(uid, announcement.id, 'seen');
            } catch (e) {
              try { console.warn('[Announcements] setUserAnnouncementState (pre-play) failed:', e); } catch (_) {}
            }
          }
          window.closeAnnouncementModal();
          const ann = announcement;
          setTimeout(function () {
            if (typeof window.showPlayTestApplyDialog === 'function') {
              window.showPlayTestApplyDialog(ann);
            } else {
              try { console.error('[Announcements] showPlayTestApplyDialog is not defined'); } catch (_) {}
              try { alert('A jelentkezés ablak nem tölthető be. Frissítsd az oldalt.'); } catch (_) {}
            }
          }, 150);
          return;
        }

        if (uid && window.announcementsService) {
          if (action === 'close') {
            await window.announcementsService.setUserAnnouncementState(uid, announcement.id, 'seen');
          } else if (action === 'reject') {
            await window.announcementsService.setUserAnnouncementState(uid, announcement.id, 'rejected');
          } else if (action === 'cta') {
            if (announcement.ctaUrl) window.open(announcement.ctaUrl, '_blank');
            await window.announcementsService.setUserAnnouncementState(uid, announcement.id, 'applied', { ctaClickedAt: true });
          }
        }
        window.closeAnnouncementModal();
      });
    });
  }

  /** Play test apply modal – single mobile-first design. No alternate/legacy layout. */
  async function showPlayTestApplyDialog(announcement) {
    const user = firebase.auth && firebase.auth().currentUser;
    if (!user) return;

    const isAndroid = typeof window.detectPlatform === 'function' && window.detectPlatform() === 'android';
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
    const pt = i18n.playTest || {};

    const svc = window.announcementsService;
    if (svc && typeof svc.canSeePlayTestRecruitment === 'function' && !svc.canSeePlayTestRecruitment(user)) {
      const msg = pt.accountTooNew || 'A Play teszt toborzás csak legalább 2 hete regisztrált fiókoknak érhető el.';
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(msg, 'info');
      } else {
        try { alert(msg); } catch (_) {}
      }
      return;
    }

    if (!isAndroid) {
      const msg = pt.androidOnly || 'Ez a lehetőség csak Androidos eszközökre szól.';
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(msg, 'info');
      } else {
        try { alert(msg); } catch (_) {}
      }
      return;
    }

    try {
      const existing = await firebase.firestore().collection('playTestApplicants').doc(user.uid).get();
      if (existing.exists && existing.data().applicationStatus === 'applied') {
        const msg = pt.formAlreadyApplied || 'Már jelentkeztél.';
        if (typeof showCustomAlert === 'function') {
          showCustomAlert(msg, 'info');
        } else {
          try { alert(msg); } catch (_) {}
        }
        return;
      }
    } catch (_) {}

    const email = user.email || '';
    const displayName = user.displayName || '';

    const bodyText = (pt.body || '').replace(/</g, '&lt;');
    const bodyHtml = bodyText ? bodyText.split(/(?<=[.!?])\s+/).filter(Boolean).map(p => `<p class="play-test-body-p">${p.trim()}</p>`).join('') : '';

    let html = `
      <style>
        #play-test-apply-wrap .play-test-checkbox {
          appearance: none; -webkit-appearance: none;
          width: 22px; height: 22px; min-width: 22px; min-height: 22px;
          border: 2px solid #94a3b8; border-radius: 5px;
          background: #fff; cursor: pointer; flex-shrink: 0;
          position: relative; margin: 0;
        }
        #play-test-apply-wrap .play-test-checkbox:checked {
          background: #2563eb; border-color: #2563eb;
        }
        #play-test-apply-wrap .play-test-checkbox:checked::after {
          content: ''; position: absolute; left: 6px; top: 2px;
          width: 6px; height: 11px;
          border: solid #fff; border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        html.dark #play-test-apply-wrap .play-test-checkbox {
          border-color: #64748b; background: #1e293b;
        }
        html.dark #play-test-apply-wrap .play-test-checkbox:checked {
          background: #2563eb; border-color: #2563eb;
        }
        #play-test-apply-wrap .play-test-body-p {
          margin-bottom: 0.5rem; line-height: 1.75;
        }
        #play-test-apply-wrap .play-test-body-p:last-child { margin-bottom: 0; }
      </style>
      <div id="play-test-apply-overlay" class="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto overflow-x-hidden" style="padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); background: rgba(0,0,0,0.45); box-sizing: border-box;">
        <div id="play-test-modal-card" class="relative z-10 flex-shrink-0 w-full overflow-hidden bg-white dark:bg-gray-800" style="max-width: 28rem; width: calc(100vw - 24px); max-height: min(85vh, calc(100dvh - 48px)); border-radius: 22px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); display: flex; flex-direction: column; box-sizing: border-box;" onclick="event.stopPropagation()">
          <div class="flex-shrink-0 flex items-center gap-3 pt-6" style="padding: 24px 28px 12px;">
            <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl bg-blue-50 dark:bg-blue-900/30">
              📱
            </div>
            <h2 class="flex-1 text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug" style="font-size: 18px; min-width: 0;">${(pt.title || 'Androidos tesztelő keresése').replace(/</g, '&lt;')}</h2>
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto" style="padding: 0 28px 32px;">
            <div class="play-test-content" style="max-width: 94%; margin: 0 auto;">
              <div class="text-gray-500 dark:text-gray-400 mb-5" style="font-size: 15px; line-height: 1.75;">${bodyHtml || bodyText}</div>
              <div class="mb-5">
                <label for="play-test-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">${(pt.formEmail || 'E-mail cím').replace(/</g, '&lt;')}</label>
                <input type="email" id="play-test-email" class="w-full border rounded-xl box-border outline-none transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100" style="height: 48px; padding: 0 16px; border: 1.5px solid #d1d5db; font-size: 16px;" value="${(email || '').replace(/"/g, '&quot;')}" />
              </div>
              <div class="space-y-3 mb-8">
                <label for="play-test-android" class="flex items-start gap-3 cursor-pointer py-1 min-w-0">
                  <input type="checkbox" id="play-test-android" checked class="play-test-checkbox mt-0.5 flex-shrink-0" />
                  <span class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed shrink min-w-0" style="font-size: 14px;">${(pt.formAndroidConfirm || 'Androidot használok').replace(/</g, '&lt;')}</span>
                </label>
                <label for="play-test-consent" class="flex items-start gap-3 cursor-pointer py-1 min-w-0">
                  <input type="checkbox" id="play-test-consent" class="play-test-checkbox mt-0.5 flex-shrink-0" />
                  <span class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed shrink min-w-0" style="font-size: 14px;">${(pt.formConsent || 'Hozzájárulok...').replace(/</g, '&lt;')}</span>
                </label>
              </div>
              <div class="flex flex-col sm:flex-row gap-3 pt-1 pb-4">
                <button type="button" id="play-test-cancel" class="flex-1 min-h-[44px] py-3 px-4 text-sm font-medium rounded-xl border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">${t('ctaClose', 'Bezárás')}</button>
                <button type="button" id="play-test-submit" class="flex-1 min-h-[44px] py-3 px-4 text-sm font-bold rounded-xl text-white transition-colors" style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">${(pt.formSubmit || 'Jelentkezem').replace(/</g, '&lt;')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const wrap = document.createElement('div');
    wrap.id = 'play-test-apply-wrap';
    wrap.innerHTML = html;
    document.body.appendChild(wrap);

    const onEsc = (e) => { if (e.key === 'Escape') { document.removeEventListener('keydown', onEsc); wrap.remove(); } };
    const cancel = () => { document.removeEventListener('keydown', onEsc); wrap.remove(); };
    document.addEventListener('keydown', onEsc);
    wrap.querySelector('#play-test-apply-overlay').addEventListener('click', function(e) { if (e.target === this) cancel(); });
    wrap.querySelector('#play-test-cancel').addEventListener('click', cancel);

    wrap.querySelector('#play-test-submit').addEventListener('click', async () => {
      const emailVal = (document.getElementById('play-test-email')?.value || '').trim();
      const consent = document.getElementById('play-test-consent')?.checked;
      if (!emailVal || !consent) {
        if (typeof showCustomAlert === 'function') showCustomAlert('Kérlek töltsd ki az e-mailt és fogadd el a hozzájárulást.', 'info');
        return;
      }

      try {
        const db = firebase.firestore();
        const env = typeof window.detectAppEnvironment === 'function' ? window.detectAppEnvironment() : 'web';
        await db.collection('playTestApplicants').doc(user.uid).set({
          uid: user.uid,
          email: emailVal,
          displayName: displayName || '',
          language: getLang(),
          platform: 'android',
          consentToAddTesterList: true,
          consentAt: firebase.firestore.FieldValue.serverTimestamp(),
          sourceAnnouncementId: announcement.id || 'play_test_2026_03',
          sourceSurface: 'modal',
          applicationStatus: 'applied',
          adminStatus: 'pending',
          appliedAt: firebase.firestore.FieldValue.serverTimestamp(),
          environment: env
        }, { merge: true });

        await window.announcementsService.setUserAnnouncementState(user.uid, announcement.id, 'applied');

        document.removeEventListener('keydown', onEsc);
        wrap.remove();
        if (typeof showCustomAlert === 'function') showCustomAlert(pt.formSuccess || 'Köszönjük a jelentkezést!', 'success');
      } catch (err) {
        console.error('[PlayTest] apply error:', err);
        if (typeof showCustomAlert === 'function') showCustomAlert('Hiba történt. Próbáld újra később.', 'error');
      }
    });
  }

  window.showPlayTestApplyDialog = showPlayTestApplyDialog;

  async function maybeShowLoginModal() {
    try {
      const user = firebase.auth && firebase.auth().currentUser;
      if (!user || !window.announcementsService) return;

      const items = await window.announcementsService.loadAnnouncements(true);
      const first = await window.announcementsService.findFirstUnseenModalAnnouncement(user.uid, items);
      if (first) {
        showAnnouncementModal(first, () => { refreshUnreadDots(); });
      }
    } catch (_) {}
  }

  const ANNOUNCEMENT_BODY_COLLAPSE_CHARS = 700;

  function getAnnouncementDateLocale() {
    if (typeof getCurrentLocale === 'function') return getCurrentLocale();
    const map = { hu: 'hu-HU', de: 'de-DE', en: 'en-US', pl: 'pl-PL', ro: 'ro-RO' };
    return map[getLang()] || 'hu-HU';
  }

  function parseAnnouncementDateMs(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value.seconds === 'number') return value.seconds * 1000;

    const s = String(value).trim();
    if (!s) return null;

    const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (iso) {
      const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      return Number.isNaN(d.getTime()) ? null : d.getTime();
    }

    const dotted = s.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
    if (dotted) {
      const d = new Date(Number(dotted[1]), Number(dotted[2]) - 1, Number(dotted[3]));
      return Number.isNaN(d.getTime()) ? null : d.getTime();
    }

    const parsed = Date.parse(s);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function formatAnnouncementCardDate(item) {
    try {
      const locale = getAnnouncementDateLocale();
      const opts = { year: 'numeric', month: 'short', day: 'numeric' };
      const raw = item._legacyWhatsNewDate || item.startAt || item.createdAt || item.updatedAt;
      const ms = parseAnnouncementDateMs(raw);
      if (ms == null) {
        if (item._legacyWhatsNewDate) return String(item._legacyWhatsNewDate).trim();
        return '';
      }
      return new Date(ms).toLocaleDateString(locale, opts);
    } catch (_) { return ''; }
  }

  const ENTRY_TYPE_ICONS = {
    new: '✨',
    fix: '🛠️',
    improvement: '🚀',
    notice: 'ℹ️'
  };

  function normalizeEntryType(value) {
    const svc = window.announcementsService;
    if (svc && typeof svc.normalizeEntryType === 'function') return svc.normalizeEntryType(value);
    const v = String(value || '').toLowerCase().trim();
    const valid = ['new', 'fix', 'improvement', 'notice'];
    return valid.includes(v) ? v : 'new';
  }

  function getEntryType(item) {
    if (!item) return 'new';
    if (item.entryType) return normalizeEntryType(item.entryType);
    return 'new';
  }

  function getEntryTypeBadgeLabel(entryType) {
    const keys = {
      new: 'badgeTypeNew',
      fix: 'badgeTypeFix',
      improvement: 'badgeTypeImprovement',
      notice: 'badgeTypeNotice'
    };
    const fallbacks = {
      new: 'Újdonság',
      fix: 'Hibajavítás',
      improvement: 'Fejlesztés',
      notice: 'Közlemény'
    };
    const key = keys[entryType] || keys.new;
    return t(key, fallbacks[entryType] || fallbacks.new);
  }

  function getAnnouncementCardTone(item) {
    const type = String(item.type || 'news').toLowerCase();
    const subtype = String(item.subtype || '').toLowerCase();
    if (type === 'announcement' || subtype === 'maintenance') return 'announcement';
    return 'news';
  }

  function getAnnouncementCardIcon(item) {
    if (isPlayTestRecruitment(item)) return '📱';
    if (getAnnouncementCardTone(item) === 'announcement') return '📣';
    return ENTRY_TYPE_ICONS[getEntryType(item)] || ENTRY_TYPE_ICONS.new;
  }

  function renderAnnouncementCardHtml(item) {
    const title = getTranslation(item, 'title');
    const body = getTranslation(item, 'body');
    const ctaLabel = getTranslation(item, 'ctaLabel');
    const tone = getAnnouncementCardTone(item);
    const isAnnouncement = tone === 'announcement';
    const safeTitle = (title || '').replace(/</g, '&lt;');
    const safeBody = (body || '').replace(/</g, '&lt;');
    const dateLabel = formatAnnouncementCardDate(item);
    const legacyVersion = (item._legacyWhatsNewVersion || '').replace(/</g, '&lt;');
    const icon = getAnnouncementCardIcon(item);
    const needsExpand = (body || '').length > ANNOUNCEMENT_BODY_COLLAPSE_CHARS;
    const expandLabel = t('detailsExpand', 'Részletek');

    let badges = '';
    if (isAnnouncement) {
      badges += `<span class="announcement-card__badge announcement-card__badge--important">${t('badgeImportant', 'Fontos')}</span>`;
      badges += `<span class="announcement-card__badge announcement-card__badge--type-announcement">${t('badgeAnnouncement', 'Közlemény')}</span>`;
    } else {
      const entryType = getEntryType(item);
      badges += `<span class="announcement-card__badge announcement-card__badge--entry-${entryType}">${getEntryTypeBadgeLabel(entryType)}</span>`;
    }
    if (dateLabel) {
      badges += `<span class="announcement-card__badge announcement-card__badge--date">${dateLabel.replace(/</g, '&lt;')}</span>`;
    }

    let legacyMeta = '';
    if (legacyVersion) {
      legacyMeta = `<p class="announcement-card__meta">${legacyVersion}</p>`;
    }

    let ctaBtn = '';
    if (isPlayTestRecruitment(item)) {
      const isAndroid = typeof window.detectPlatform === 'function' && window.detectPlatform() === 'android';
      const aid = (item.id || '').replace(/"/g, '');
      if (isAndroid) {
        ctaBtn = `<div class="announcement-card__footer"><button type="button" class="announcement-card__cta announcement-card__cta--primary" data-play-test-id="${aid}">${(ctaLabel || t('ctaApply', 'Jelentkezem')).replace(/</g, '&lt;')}</button></div>`;
      } else {
        ctaBtn = `<p class="announcement-card__note">${(typeof translations !== 'undefined' && translations[currentLang]?.playTest?.androidOnly) || 'Csak Androidra'}</p>`;
      }
    } else if (item.ctaUrl) {
      ctaBtn = `<div class="announcement-card__footer"><a href="${item.ctaUrl.replace(/"/g, '&quot;')}" target="_blank" rel="noopener" class="announcement-card__cta announcement-card__cta--primary">${(ctaLabel || t('detailsExpand', 'Megnyitás')).replace(/</g, '&lt;')}</a></div>`;
    }

    const collapsedClass = needsExpand ? ' is-collapsed' : '';
    const expandBtn = needsExpand
      ? `<button type="button" class="announcement-card__expand" data-expand-card aria-expanded="false">${expandLabel}</button>`
      : '';

    return `
        <article class="announcement-card announcement-card--${tone}" data-announcement-id="${(item.id || '').replace(/"/g, '')}">
          <div class="announcement-card__accent" aria-hidden="true"></div>
          <div class="announcement-card__inner">
            <header class="announcement-card__header">
              <span class="announcement-card__icon" aria-hidden="true">${icon}</span>
              <div class="announcement-card__badges">${badges}</div>
            </header>
            <h3 class="announcement-card__title">${safeTitle}</h3>
            ${legacyMeta}
            <div class="announcement-card__body">
              <p class="announcement-card__body-text${collapsedClass}">${safeBody}</p>
              ${expandBtn}
            </div>
            ${ctaBtn}
          </div>
        </article>
      `;
  }



  async function renderAnnouncementsList() {
    const container = document.getElementById('whatsNewList');
    if (!container) return;

    let ann = window.announcementsService ? await window.announcementsService.loadAnnouncements(true) : [];
    const legacy = window.announcementsService ? await window.announcementsService.loadLegacyWhatsNew(true) : [];
    const listUser = firebase.auth && firebase.auth().currentUser;
    const svc = window.announcementsService;
    if (listUser && svc && typeof svc.isPlayTestRecruitment === 'function' && typeof svc.canSeePlayTestRecruitment === 'function') {
      ann = ann.filter(function (a) {
        if (isRatingRequest(a)) return false;
        if (!svc.isPlayTestRecruitment(a)) return true;
        return svc.canSeePlayTestRecruitment(listUser);
      });
    } else {
      ann = ann.filter(function (a) { return !isRatingRequest(a); });
    }
    const items = [...ann, ...legacy];

    try {
      const globalKey = svc && typeof svc.getNewestLegacyWhatsNewKey === 'function'
        ? await svc.getNewestLegacyWhatsNewKey(true)
        : (legacy.length > 0 ? legacy[0]._legacyWhatsNewKey : '');
      if (globalKey && typeof localStorage !== 'undefined') {
        localStorage.setItem('lastSeenWhatsNew', globalKey);
      }
    } catch (_) {}

    // Minden megjelenített (nem legacy) announcement-re jelöljük 'seen'-ré a user state-et,
    // így a piros pötty a lista megnyitása után eltűnik. Modal announcement-nél a külön modal flow
    // már lekezelte a state-et; itt csak a hiányzó state-eket írjuk be.
    try {
      const listUid = listUser && listUser.uid;
      if (listUid && svc && typeof svc.getUserAnnouncementState === 'function'
          && typeof svc.setUserAnnouncementState === 'function') {
        await Promise.all(ann.map(async function (a) {
          if (!a || !a.id) return;
          try {
            const state = await svc.getUserAnnouncementState(listUid, a.id);
            if (!state || !state.status) {
              await svc.setUserAnnouncementState(listUid, a.id, 'seen');
            }
          } catch (_) {}
        }));
      }
    } catch (_) {}

    try { refreshUnreadDots(); } catch (_) {}

    if (ann.length === 0 && legacy.length === 0) {
      container.innerHTML = `<div class="text-center text-gray-500 dark:text-gray-400 py-8">${t('empty', 'Nincs aktív közlemény vagy újdonság.')}</div>`;
      return;
    }

    let html = '';
    if (ann.length > 0) {
      html += `<section class="announcements-section mb-2" aria-label="${t('sectionAnnouncements', 'Közlemények')}">
        <h2 class="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">${t('sectionAnnouncements', 'Közlemények')}</h2>
        <div class="announcements-list">${ann.map(renderAnnouncementCardHtml).join('')}</div>
      </section>`;
    }
    if (legacy.length > 0) {
      html += `<section class="legacy-whatsnew-section ${ann.length > 0 ? 'mt-6' : ''}" aria-label="${t('sectionWhatsNew', 'Újdonságok')}">
        <h2 class="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">${t('sectionWhatsNew', 'Újdonságok')}</h2>
        <div class="announcements-list">${legacy.map(renderAnnouncementCardHtml).join('')}</div>
      </section>`;
    }

    container.innerHTML = html;

    setTimeout(function () {
      container.querySelectorAll('[data-expand-card]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const card = btn.closest('.announcement-card');
          if (!card) return;
          const textEl = card.querySelector('.announcement-card__body-text');
          if (!textEl) return;
          const collapsed = textEl.classList.toggle('is-collapsed');
          btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
          btn.textContent = collapsed
            ? t('detailsExpand', 'Részletek')
            : t('detailsCollapse', 'Összecsuk');
        });
      });
      container.querySelectorAll('[data-play-test-id]').forEach(function (btn) {
        const id = btn.getAttribute('data-play-test-id');
        const card = btn.closest('.announcement-card');
        const item = card ? items.find(function (a) { return a.id === id; }) : null;
        if (item) {
          btn.onclick = function () { window.showPlayTestApplyDialog?.(item); };
        }
      });
    }, 0);
  }

  function init() {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      if (initAttempts < 20) { initAttempts++; setTimeout(init, 500); }
      return;
    }
    if (authListenerAttached) return;
    authListenerAttached = true;

    firebase.auth().onAuthStateChanged(async (user) => {
      if (!user) {
        setDotVisible('whatsnew-dot-gear', false);
        setDotVisible('whatsnew-dot-settings', false);
        setDotVisible('whatsnew-dot-more', false);
        return;
      }
      refreshUnreadDots();
      if (window.announcementsService) {
        window.announcementsService.recordSessionStart();
        window.announcementsService.trackAppOpen();
      }
      setTimeout(maybeShowLoginModal, 800);
    });
  }

  window.renderAnnouncementsList = renderAnnouncementsList;
  window.renderWhatsNewList = renderAnnouncementsList;
  window.refreshAnnouncementsUnreadDots = refreshUnreadDots;
  window.refreshWhatsNewUnreadDots = refreshUnreadDots;

  try { init(); } catch (_) {}
})();
