(function () {
  'use strict';

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  let documentsReminderGeneration = 0;

  window.documentsReminderCancelPending = function documentsReminderCancelPending() {
    documentsReminderGeneration += 1;
  };

  function getDocsI18n() {
    try {
      if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
        return translations[currentLang] || translations.hu || {};
      }
    } catch (_) {}
    return {};
  }

  function pickSubscriptionDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    try {
      if (typeof value.toDate === 'function') {
        const d = value.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
      }
    } catch (_) {}
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function normalizeStoredTier(rawTier) {
    const raw = String(rawTier || 'free').trim().toLowerCase();
    if (raw === 'max') return 'pro';
    if (raw === 'guest') return 'free';
    return raw;
  }

  /** Overview expiry banner: Pro entitlement only (not Archival, not documentsManager trial). */
  function canShowDocumentsExpiryReminder() {
    const sub = window.currentUserSubscription || {};
    const now = new Date();

    // Race: wait for canonical entitlement resolution before denying access.
    // refreshDocumentsReminder is re-invoked after entitlement_resolved.
    if (sub.__entitlementResolved !== true) {
      return false;
    }

    // Canonical / effective Pro wins over a possibly stale stored tier.
    if (typeof window.getProEntitlement === 'function') {
      const pro = window.getProEntitlement(sub);
      if (pro.isTester === true || pro.hasProFeatureAccess === true) return true;
    }

    const storedTier = normalizeStoredTier(sub.tier);
    if (storedTier === 'tester' || storedTier === 'pro') return true;

    if (sub.isTrial === true) {
      const trialEnd = pickSubscriptionDate(sub.trialEnd);
      if (!trialEnd || trialEnd > now) return true;
    }

    if (sub.entitlementsIsPro === true) {
      const entExpiry = pickSubscriptionDate(sub.entitlementsExpiresAt);
      if (!entExpiry || entExpiry > now) return true;
    }

    if (typeof window.isAppleProSignalActive === 'function' && window.isAppleProSignalActive(sub)) {
      return true;
    }

    return false;
  }

  function parseExpiryDate(value) {
    if (typeof window.parseDocumentExpiryDate === 'function') {
      return window.parseDocumentExpiryDate(value);
    }
    if (!value) return null;
    const d = value.toDate ? value.toDate() : (value instanceof Date ? value : null);
    if (!d || Number.isNaN(d.getTime())) return null;
    const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    local.setHours(0, 0, 0, 0);
    return local;
  }

  function daysUntil(expiry, now) {
    if (!expiry || !now) return null;
    if (typeof window.daysUntilDocumentExpiryLocal === 'function') {
      return window.daysUntilDocumentExpiryLocal(expiry, now);
    }
    const expiryDate = parseExpiryDate(expiry);
    if (!expiryDate) return null;
    const today = parseExpiryDate(now) || new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor((expiryDate.getTime() - today.getTime()) / MS_PER_DAY);
  }

  function formatTimeRemaining(days, i18n) {
    if (days === null || days === undefined) return '';
    
    const absDays = Math.abs(days);
    const isPast = days < 0;
    
    const months = Math.floor(absDays / 30);
    const weeks = Math.floor((absDays % 30) / 7);
    const remainingDays = absDays % 7;
    
    const parts = [];
    if (months > 0) {
      const monthLabel = months === 1 
        ? (i18n.documentsReminderMonth || 'hónap')
        : (i18n.documentsReminderMonths || 'hónap');
      parts.push(`${months} ${monthLabel}`);
    }
    if (weeks > 0) {
      const weekLabel = weeks === 1
        ? (i18n.documentsReminderWeek || 'hét')
        : (i18n.documentsReminderWeeks || 'hét');
      parts.push(`${weeks} ${weekLabel}`);
    }
    if (remainingDays > 0 || parts.length === 0) {
      const dayLabel = remainingDays === 1
        ? (i18n.documentsReminderDay || 'nap')
        : (i18n.documentsReminderDays || 'nap');
      parts.push(`${remainingDays} ${dayLabel}`);
    }
    
    const timeStr = parts.join(' ');
    
    if (isPast) {
      return (i18n.documentsReminderExpiredAgo || '%TIME% ezelőtt lejárt').replace('%TIME%', timeStr);
    } else {
      return (i18n.documentsReminderExpiresIn || '%TIME% múlva jár le').replace('%TIME%', timeStr);
    }
  }

  function isExpiring(doc, now) {
    if (!doc) return false;
    if (doc.remindEnabled === false) return false;
    if (!doc.expiresAt) return false;

    const remindValue = typeof doc.remindValue === 'number' && Number.isFinite(doc.remindValue)
      ? doc.remindValue
      : 14;
    const remindUnit = doc.remindUnit || 'days';

    let remindDays = remindValue;
    if (remindUnit === 'weeks') {
      remindDays = remindValue * 7;
    } else if (remindUnit === 'months') {
      remindDays = remindValue * 30;
    }

    const d = daysUntil(doc.expiresAt, now);
    if (d === null) return false;

    return d <= remindDays;
  }

  async function loadUserDocuments(uid, options) {
    if (!uid) return [];
    if (typeof DocumentsDataService !== 'undefined' && DocumentsDataService.loadAllDocumentsForExpiry) {
      return DocumentsDataService.loadAllDocumentsForExpiry(uid, options || {});
    }
    if (typeof firebase === 'undefined' || !firebase.firestore) return [];

    try {
      const db = firebase.firestore();
      const snap = await db.collection('users')
        .doc(uid)
        .collection('documents')
        .get();

      return snap.docs.map((d) => ({ id: d.id, ...d.data() || {} }));
    } catch (e) {
      console.warn('[DocumentsReminder] Failed to load documents:', e && e.message);
      return [];
    }
  }

  function getOverviewBannerContainer() {
    const overviewRoot = document.getElementById('content-live');
    if (!overviewRoot) return null;

    let banner = document.getElementById('documents-reminder-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'documents-reminder-banner';
      banner.className = 'mb-3';
      const paymentBanner = document.getElementById('subscription-payment-problem-banner');
      overviewRoot.insertBefore(banner, paymentBanner ? paymentBanner.nextSibling : (overviewRoot.firstChild || null));
    }
    return banner;
  }

  function renderDocumentsReminderBanner(expiringDocs) {
    const banner = getOverviewBannerContainer();
    if (!banner) return;

    if (!Array.isArray(expiringDocs) || expiringDocs.length === 0) {
      banner.classList.add('hidden');
      banner.innerHTML = '';
      return;
    }

    banner.classList.remove('hidden');
    const i18n = getDocsI18n();

    const count = expiringDocs.length;
    const first = expiringDocs[0];
    const name = first.title || first.name || i18n.documentsTitle || 'Dokumentum';

    const formatter = new Intl.DateTimeFormat(
      (typeof currentLang === 'string' && currentLang) ? currentLang : 'hu-HU',
      { year: 'numeric', month: '2-digit', day: '2-digit' }
    );

    const firstExpiry = parseExpiryDate(first.expiresAt);
    const firstExpiryStr = firstExpiry ? formatter.format(firstExpiry) : '';

    const titleSingle = i18n.documentsReminderTitleSingle || 'Lejáró irat/engedély';
    const titleMultiple = i18n.documentsReminderTitleMultiple || '%COUNT% lejáró irat/engedély';
    const ctaLabel = i18n.documentsReminderCta || 'Elintézem';

    const headerTitle = count === 1
      ? `${titleSingle}: ${name}`
      : titleMultiple.replace('%COUNT%', String(count));

    const listHtml = count > 1
      ? `<ul class="mt-2 space-y-1 text-sm text-gray-800 dark:text-gray-100">
          ${expiringDocs.slice(0, 3).map((doc) => {
            const d = parseExpiryDate(doc.expiresAt);
            const ds = d ? formatter.format(d) : '';
            const nm = doc.title || doc.name || name;
            return `<li class="flex items-center justify-between gap-2">
              <span class="truncate">${nm} – <span class="font-semibold">${ds}</span></span>
              <button type="button" class="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:underline documents-reminder-edit" data-doc-id="${doc.id}">
                ${ctaLabel}
              </button>
            </li>`;
          }).join('')}
          ${count > 3 ? `<li class="text-xs text-gray-600 dark:text-gray-300 mt-1">+ ${count - 3} további irat/engedély</li>` : ''}
        </ul>`
      : `<p class="mt-1 text-sm text-gray-800 dark:text-gray-100">
          <span class="font-semibold">${name}</span>${firstExpiryStr ? ` – ${firstExpiryStr}` : ''}
        </p>
        <div class="mt-2">
          <button type="button" class="documents-reminder-edit inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700" data-doc-id="${first.id}">
            ${ctaLabel}
          </button>
        </div>`;

    const detailsHtml = count > 1
      ? `<div style="margin-top:10px">
          ${expiringDocs.slice(0, 3).map((doc) => {
            const d = parseExpiryDate(doc.expiresAt);
            const ds = d ? formatter.format(d) : '';
            const nm = doc.title || doc.name || name;
            const timeRemaining = formatTimeRemaining(doc.__daysUntil, i18n);
            const isExpired = doc.__daysUntil < 0;
            const itemBg = isExpired ? 'rgba(220,38,38,0.1)' : 'rgba(251,191,36,0.1)';
            const itemBorder = isExpired ? 'rgba(220,38,38,0.3)' : 'rgba(251,191,36,0.3)';
            const nameColor = isExpired ? '#7f1d1d' : '#78350f';
            const dateColor = isExpired ? '#991b1b' : '#92400e';
            return `<div style="background:${itemBg};border:1px solid ${itemBorder};border-radius:8px;padding:10px 12px;margin-bottom:8px">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
                <span style="font-size:14px;color:${nameColor};font-weight:700;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nm}</span>
                <button type="button" class="documents-reminder-edit" data-doc-id="${doc.id}" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:6px;padding:5px 14px;font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.2)">✏️ ${ctaLabel}</button>
              </div>
              <div style="font-size:12px;color:${dateColor};font-weight:600">📅 ${ds}</div>
              <div style="font-size:11px;color:${dateColor};margin-top:2px">⏱️ ${timeRemaining}</div>
            </div>`;
          }).join('')}
          ${count > 3 ? `<div style="font-size:11px;color:#92400e;margin-top:4px;font-weight:600">+ ${count - 3} további irat/engedély</div>` : ''}
        </div>`
      : `<div style="margin-top:10px">
          <div style="background:${first.__daysUntil < 0 ? 'rgba(220,38,38,0.1)' : 'rgba(251,191,36,0.1)'};border:1px solid ${first.__daysUntil < 0 ? 'rgba(220,38,38,0.3)' : 'rgba(251,191,36,0.3)'};border-radius:8px;padding:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px">
              <div style="font-size:15px;color:${first.__daysUntil < 0 ? '#7f1d1d' : '#78350f'};font-weight:700">${name}</div>
              <button type="button" class="documents-reminder-edit" data-doc-id="${first.id}" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:8px;padding:6px 16px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;box-shadow:0 2px 6px rgba(217,119,6,0.3)">✏️ ${ctaLabel}</button>
            </div>
            <div style="font-size:13px;color:${first.__daysUntil < 0 ? '#991b1b' : '#92400e'};font-weight:600;margin-bottom:4px">📅 ${firstExpiryStr}</div>
            <div style="font-size:12px;color:${first.__daysUntil < 0 ? '#991b1b' : '#92400e'};font-weight:600">⏱️ ${formatTimeRemaining(first.__daysUntil, i18n)}</div>
          </div>
        </div>`;

    // Check if any document is expired
    const hasExpired = expiringDocs.some(doc => doc.__daysUntil < 0);
    const bannerBg = hasExpired ? 'linear-gradient(135deg,#fee2e2,#fecaca)' : 'linear-gradient(135deg,#fef3c7,#fde68a)';
    const bannerBorder = hasExpired ? '#fca5a5' : '#fbbf24';
    const bannerShadow = hasExpired ? 'rgba(220,38,38,0.2)' : 'rgba(251,191,36,0.2)';
    const textColor = hasExpired ? '#7f1d1d' : '#78350f';
    const emoji = hasExpired ? '🔴' : '⚠️';

    banner.innerHTML = `
      <div style="background:${bannerBg};border:2px solid ${bannerBorder};border-radius:12px;padding:14px 16px;box-shadow:0 4px 12px ${bannerShadow};margin-bottom:12px">
        <div style="display:flex;align-items:start;gap:10px">
          <div style="font-size:24px;line-height:1;flex-shrink:0">${emoji}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:15px;font-weight:700;color:${textColor};margin-bottom:2px">${headerTitle}</div>
            ${detailsHtml}
          </div>
        </div>
      </div>
    `;

    banner.querySelectorAll('.documents-reminder-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const docId = btn.getAttribute('data-doc-id');
        if (!docId) return;
        const target = expiringDocs.find((d) => String(d.id) === String(docId));
        if (target) {
          openDocumentsReminderModal(target);
        }
      });
    });
  }

  function ensureReminderModal() {
    let modal = document.getElementById('documents-reminder-modal');
    if (modal) {
      try { modal.remove(); } catch (_) {}
    }

    var isDark = document.documentElement.classList.contains('dark');
    var cardBg = isDark ? '#020617' : '#ffffff';
    var cardShadow = isDark ? '0 20px 60px rgba(0,0,0,0.7)' : '0 20px 60px rgba(15,23,42,0.25)';
    var bodyText = isDark ? '#e5e7eb' : '#111827';
    var labelText = isDark ? '#e5e7eb' : '#111827';
    var inputBg = isDark ? '#020617' : '#ffffff';
    var inputBorder = isDark ? '#4b5563' : '#e5e7eb';
    var footerBg = isDark ? '#020617' : '#f9fafb';
    var footerBorder = isDark ? 'rgba(148,163,184,0.5)' : 'rgba(209,213,219,1)';
    var cancelBg = isDark ? '#1f2937' : '#e5e7eb';
    var cancelText = isDark ? '#e5e7eb' : '#111827';

    modal = document.createElement('div');
    modal.id = 'documents-reminder-modal';
    modal.className = 'fixed inset-0 z-50 hidden items-center justify-center';
    modal.style.cssText = 'background:rgba(0,0,0,0.5)';
    modal.innerHTML = `
      <div style="background:${cardBg};border-radius:16px;max-width:400px;width:calc(100% - 32px);margin:0 auto;overflow:hidden;box-shadow:${cardShadow}">
        <div style="background:linear-gradient(135deg,#f59e0b,#eab308);padding:16px 20px">
          <h2 id="documents-reminder-modal-title" style="font-size:17px;font-weight:700;color:#fff;margin:0">📅 </h2>
        </div>
        <div style="padding:20px">
          <p id="documents-reminder-modal-desc" style="font-size:14px;color:${bodyText};margin:0 0 16px 0;font-weight:600"></p>
          <label style="display:block;font-size:13px;font-weight:600;color:${labelText};margin-bottom:6px" for="documents-reminder-date"></label>
          <input type="date" id="documents-reminder-date" style="width:100%;padding:10px 12px;border:2px solid ${inputBorder};border-radius:10px;font-size:14px;outline:none;box-sizing:border-box;margin-bottom:16px;background:${inputBg};color:${bodyText}"/>
        </div>
        <div style="background:${footerBg};border-top:1px solid ${footerBorder};padding:14px 20px;display:flex;justify-content:flex-end;gap:8px">
          <button type="button" id="documents-reminder-cancel" style="background:${cancelBg};color:${cancelText};border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer"></button>
          <button type="button" id="documents-reminder-save" style="background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(34,197,94,0.4)">✅ </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    return modal;
  }

  async function openDocumentsReminderModal(doc) {
    const modal = ensureReminderModal();
    const i18n = getDocsI18n();

    const titleEl = modal.querySelector('#documents-reminder-modal-title');
    const descEl = modal.querySelector('#documents-reminder-modal-desc');
    const labelEl = modal.querySelector('label[for="documents-reminder-date"]');
    const inputEl = modal.querySelector('#documents-reminder-date');
    const cancelBtn = modal.querySelector('#documents-reminder-cancel');
    const saveBtn = modal.querySelector('#documents-reminder-save');

    const name = doc.title || doc.name || i18n.documentsTitle || 'Dokumentum';
    const modalTitle = i18n.documentsReminderModalTitle || 'Lejárati dátum frissítése';
    const modalLabel = i18n.documentsReminderModalLabel || 'Új lejárati dátum';
    const cancelLabel = i18n.documentsReminderModalCancel || 'Mégse';
    const saveLabel = i18n.documentsReminderModalSave || 'Mentés';

    if (titleEl) titleEl.innerHTML = '📅 ' + modalTitle;
    if (descEl) descEl.textContent = `${name}`;
    if (labelEl) labelEl.textContent = modalLabel;
    if (cancelBtn) cancelBtn.textContent = cancelLabel;
    if (saveBtn) saveBtn.innerHTML = '✅ ' + saveLabel;

    const currentExpiry = parseExpiryDate(doc.expiresAt);
    if (inputEl) {
      if (currentExpiry) {
        const y = currentExpiry.getFullYear();
        const m = String(currentExpiry.getMonth() + 1).padStart(2, '0');
        const d = String(currentExpiry.getDate()).padStart(2, '0');
        inputEl.value = `${y}-${m}-${d}`;
      } else {
        inputEl.value = '';
      }
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    function close() {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    function onCancel() {
      close();
    }

    async function onSave() {
      try {
        if (!inputEl || !inputEl.value) {
          inputEl && inputEl.focus();
          return;
        }
        if (!window.currentUser || typeof firebase === 'undefined' || !firebase.firestore) {
          console.warn('[DocumentsReminder] Cannot save expiry date, missing user or Firestore');
          close();
          return;
        }
        const newDate =
          (typeof window.parseIsoDateOnlyLocal === 'function'
            ? window.parseIsoDateOnlyLocal(inputEl.value)
            : null) || new Date(inputEl.value + 'T00:00:00');
        if (!newDate || Number.isNaN(newDate.getTime())) {
          inputEl.focus();
          return;
        }

        const db = firebase.firestore();
        const uid = window.currentUser.uid;
        const docRef = db.collection('users').doc(uid).collection('documents').doc(String(doc.id));
        await docRef.set({
          expiresAt: firebase.firestore.Timestamp.fromDate(newDate),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        close();
        try {
          if (typeof DocumentsDataService !== 'undefined') {
            DocumentsDataService.invalidateExpiryCache();
            DocumentsDataService.patchLocalDoc(doc.id, { expiresAt: newDate.toISOString().slice(0, 10) });
          }
          await refreshDocumentsReminder({ force: true });
        } catch (_) {}
      } catch (e) {
        console.error('[DocumentsReminder] Failed to save new expiry date:', e && e.message);
        close();
      }
    }

    cancelBtn && cancelBtn.addEventListener('click', onCancel, { once: true });
    saveBtn && saveBtn.addEventListener('click', onSave, { once: true });

    modal.addEventListener('click', (ev) => {
      if (ev.target === modal) close();
    }, { once: true });
  }

  async function refreshDocumentsReminder(options) {
    const loadGen = documentsReminderGeneration;
    try {
      console.log('[DocumentsReminder] refreshDocumentsReminder called');
      const uid = window.currentUser && window.currentUser.uid;
      if (!uid) {
        console.log('[DocumentsReminder] No uid, hiding banner');
        renderDocumentsReminderBanner([]);
        return;
      }

      const loadCtx = (window.GurigoAuthSession && window.GurigoAuthSession.captureAuthScopedLoad)
        ? window.GurigoAuthSession.captureAuthScopedLoad()
        : { uid: uid, gen: 0 };

      const hasAccess = canShowDocumentsExpiryReminder();
      console.log('[DocumentsReminder] Has Pro access for expiry reminder:', hasAccess);
      if (!hasAccess) {
        console.log('[DocumentsReminder] No access, hiding banner');
        renderDocumentsReminderBanner([]);
        return;
      }

      const force = options && options.force;
      if (!force && typeof DocumentsDataService !== 'undefined') {
        const cached = DocumentsDataService.getCachedExpiryExpiring();
        if (cached) {
          renderDocumentsReminderBanner(cached);
          return;
        }
      }

      const docs = await loadUserDocuments(uid, { force: !!force });
      if (loadGen !== documentsReminderGeneration) return;
      if (window.GurigoAuthSession && window.GurigoAuthSession.shouldDiscardAuthScopedLoad(loadCtx)) {
        return;
      }
      console.log('[DocumentsReminder] Loaded documents:', docs.length);
      if (!Array.isArray(docs) || docs.length === 0) {
        console.log('[DocumentsReminder] No documents, hiding banner');
        renderDocumentsReminderBanner([]);
        if (typeof DocumentsDataService !== 'undefined' && DocumentsDataService.setExpiryCacheExpiring) {
          DocumentsDataService.setExpiryCacheExpiring([]);
        }
        return;
      }

      const now = new Date();

      const expiring = docs
        .filter((d) => isExpiring(d, now))
        .map((d) => {
          const du = daysUntil(d.expiresAt, now);
          return { ...d, __daysUntil: du };
        })
        .sort((a, b) => {
          if (a.__daysUntil == null && b.__daysUntil == null) return 0;
          if (a.__daysUntil == null) return 1;
          if (b.__daysUntil == null) return -1;
          if (a.__daysUntil === b.__daysUntil) {
            const ea = parseExpiryDate(a.expiresAt);
            const eb = parseExpiryDate(b.expiresAt);
            return (ea ? ea.getTime() : 0) - (eb ? eb.getTime() : 0);
          }
          return a.__daysUntil - b.__daysUntil;
        });

      console.log('[DocumentsReminder] Expiring documents:', expiring.length);
      window._documentsExpiring = expiring;
      if (typeof DocumentsDataService !== 'undefined' && DocumentsDataService.setExpiryCacheExpiring) {
        DocumentsDataService.setExpiryCacheExpiring(expiring);
      }
      renderDocumentsReminderBanner(expiring);
    } catch (e) {
      console.warn('[DocumentsReminder] refresh failed:', e && e.message);
    }
  }

  window.daysUntilDocumentExpiry = daysUntil;
  window.isDocumentExpiring = isExpiring;
  window.refreshDocumentsReminder = refreshDocumentsReminder;

  // Refresh on page show
  window.addEventListener('pageshow', () => {
    try { refreshDocumentsReminder(); } catch (_) {}
  });

  // Refresh when user logs in
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        console.log('[DocumentsReminder] User logged in, refreshing...');
        setTimeout(() => {
          try { refreshDocumentsReminder(); } catch (_) {}
        }, 500);
      }
    });
  }

})(); 

