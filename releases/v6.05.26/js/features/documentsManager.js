(function () {
  'use strict';

  const DM_PAGE_SIZE_OPTIONS = (typeof ListPagination !== 'undefined' && ListPagination.DEFAULT_PAGE_SIZE_OPTIONS)
    ? ListPagination.DEFAULT_PAGE_SIZE_OPTIONS
    : [10, 20, 50, 100];
  const DM_PAGE_SIZE_STORAGE_KEY = 'documentsManagerListPageSize';
  const DM_PAGINATION_SLOT_IDS = ['documents-manager-pagination-top', 'documents-manager-pagination-bottom'];
  const DM_JUMP_MODAL_IDS = {
    overlayId: 'documents-manager-page-jump-overlay',
    gridId: 'documents-manager-page-jump-grid',
    titleId: 'documents-manager-page-jump-title',
    closeBtnId: 'documents-manager-page-jump-close-btn',
    closeHandler: 'closeDocumentsManagerPageJumpModal',
  };

  let documentsManagerSortedCache = [];
  let documentsManagerCurrentPage = 1;
  let documentsManagerPageSize = (typeof ListPagination !== 'undefined' && ListPagination.getStoredPageSize)
    ? ListPagination.getStoredPageSize(DM_PAGE_SIZE_STORAGE_KEY, DM_PAGE_SIZE_OPTIONS, 10)
    : 10;

  function getDocumentsManagerPaginationTotals() {
    const totalItems = documentsManagerSortedCache.length;
    if (typeof ListPagination !== 'undefined' && ListPagination.calcTotals) {
      return ListPagination.calcTotals(totalItems, documentsManagerPageSize);
    }
    const totalPages = Math.max(1, Math.ceil(totalItems / documentsManagerPageSize));
    return { totalItems, totalPages };
  }

  function clampDocumentsManagerCurrentPage(totalPages) {
    if (typeof ListPagination !== 'undefined' && ListPagination.clampPage) {
      documentsManagerCurrentPage = ListPagination.clampPage(documentsManagerCurrentPage, totalPages);
      return;
    }
    if (documentsManagerCurrentPage > totalPages) documentsManagerCurrentPage = totalPages;
    if (documentsManagerCurrentPage < 1) documentsManagerCurrentPage = 1;
  }

  function scrollDocumentsManagerListToTop() {
    const anchor = document.getElementById('documents-manager-list-top-anchor')
      || document.getElementById('content-documentsManager');
    if (!anchor || typeof anchor.scrollIntoView !== 'function') return;
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function buildDocumentsManagerPaginationHtml(totalPages, totalItems) {
    if (typeof ListPagination !== 'undefined' && ListPagination.buildHtml) {
      return ListPagination.buildHtml({
        currentPage: documentsManagerCurrentPage,
        totalPages: totalPages,
        totalItems: totalItems,
        pageSize: documentsManagerPageSize,
        pageSizeOptions: DM_PAGE_SIZE_OPTIONS,
        changePageHandler: 'changeDocumentsManagerPage',
        changePageSizeHandler: 'changeDocumentsManagerPageSize',
        openJumpHandler: 'openDocumentsManagerPageJumpModal',
      });
    }
    return '';
  }

  function renderDocumentsManagerPaginationControls(totalPages, totalItems) {
    const showControls = totalItems > 0;
    const html = showControls ? buildDocumentsManagerPaginationHtml(totalPages, totalItems) : '';
    if (typeof ListPagination !== 'undefined' && ListPagination.renderToSlots) {
      ListPagination.renderToSlots(DM_PAGINATION_SLOT_IDS, html, showControls);
      return;
    }
    DM_PAGINATION_SLOT_IDS.forEach(function (slotId) {
      const slot = document.getElementById(slotId);
      if (!slot) return;
      slot.innerHTML = html;
      slot.classList.toggle('hidden', !showControls);
    });
  }

  function closeDocumentsManagerPageJumpModal() {
    if (typeof ListPagination !== 'undefined' && ListPagination.closeJumpModal) {
      ListPagination.closeJumpModal({
        overlayId: DM_JUMP_MODAL_IDS.overlayId,
        bodyClass: 'records-page-jump-open',
      });
    }
  }

  function openDocumentsManagerPageJumpModal() {
    if (!documentsManagerSortedCache.length || typeof ListPagination === 'undefined' || !ListPagination.openJumpModal) return;
    const { totalPages } = getDocumentsManagerPaginationTotals();
    ListPagination.openJumpModal({
      overlayId: DM_JUMP_MODAL_IDS.overlayId,
      gridId: DM_JUMP_MODAL_IDS.gridId,
      titleId: DM_JUMP_MODAL_IDS.titleId,
      closeBtnId: DM_JUMP_MODAL_IDS.closeBtnId,
      closeHandler: DM_JUMP_MODAL_IDS.closeHandler,
      currentPage: documentsManagerCurrentPage,
      totalPages: totalPages,
      bodyClass: 'records-page-jump-open',
      onSelectPage: function (page) {
        jumpToDocumentsManagerPage(page);
      },
    });
  }

  function initDocumentsManagerPageJumpModal() {
    if (typeof ListPagination !== 'undefined' && ListPagination.initJumpModal) {
      ListPagination.initJumpModal(DM_JUMP_MODAL_IDS);
    }
  }

  function changeDocumentsManagerPage(direction) {
    if (!documentsManagerSortedCache.length) return;
    const { totalPages } = getDocumentsManagerPaginationTotals();
    let nextPage;
    if (direction === 'first') {
      nextPage = 1;
    } else if (direction === 'last') {
      nextPage = totalPages;
    } else {
      nextPage = Math.min(totalPages, Math.max(1, documentsManagerCurrentPage + direction));
    }
    if (nextPage === documentsManagerCurrentPage) return;
    documentsManagerCurrentPage = nextPage;
    renderDocumentsManagerListPage({ scrollToTop: true });
  }

  function changeDocumentsManagerPageSize(rawSize) {
    const size = parseInt(rawSize, 10);
    if (!DM_PAGE_SIZE_OPTIONS.includes(size) || size === documentsManagerPageSize) return;
    documentsManagerPageSize = size;
    try { localStorage.setItem(DM_PAGE_SIZE_STORAGE_KEY, String(size)); } catch (_) {}
    if (!documentsManagerSortedCache.length) return;
    const { totalPages } = getDocumentsManagerPaginationTotals();
    clampDocumentsManagerCurrentPage(totalPages);
    renderDocumentsManagerListPage({ scrollToTop: true });
  }

  function jumpToDocumentsManagerPage(rawPage) {
    if (!documentsManagerSortedCache.length) return;
    const { totalPages, totalItems } = getDocumentsManagerPaginationTotals();
    let page = parseInt(rawPage, 10);
    if (isNaN(page)) page = documentsManagerCurrentPage;
    page = Math.min(totalPages, Math.max(1, page));
    if (page === documentsManagerCurrentPage) {
      renderDocumentsManagerPaginationControls(totalPages, totalItems);
      return;
    }
    documentsManagerCurrentPage = page;
    renderDocumentsManagerListPage({ scrollToTop: true });
  }

  function getI18n() {
    try {
      if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
        return translations[currentLang] || translations.hu || {};
      }
    } catch (_) {}
    return {};
  }

  function canAccessDocumentsManager() {
    const tier = (typeof window.getEffectiveSubscriptionTier === 'function')
      ? window.getEffectiveSubscriptionTier()
      : 'free';
    if (tier === 'pro' || tier === 'tester') return true;

    // Feature-specific Documents Manager trial (independent from initial Pro trial)
    const sub = window.currentUserSubscription || {};
    if (sub.documentsManagerTrialUntil) {
      const now = new Date();
      const trialEnd = sub.documentsManagerTrialUntil instanceof Date
        ? sub.documentsManagerTrialUntil
        : new Date(sub.documentsManagerTrialUntil);
      if (now < trialEnd) return true;
    }

    return false;
  }

  async function activateDocumentsManagerTrial(uid) {
    // Activate 2-week trial for existing Free users (not needed for initial trial users, they already have access)
    if (!uid) {
      console.log('[DocumentsManager] Trial activation skipped: no uid');
      return false;
    }
    
    const sub = window.currentUserSubscription || {};
    console.log('[DocumentsManager] Trial activation check:', {
      tier: sub.tier,
      isTrial: sub.isTrial,
      hasDocumentsManagerTrial: !!sub.documentsManagerTrialUntil
    });
    
    // Don't activate if already PRO/tester (canonical tier) or already has Documents Manager trial
    const effectiveTier = (typeof window.getEffectiveSubscriptionTier === 'function')
      ? window.getEffectiveSubscriptionTier()
      : 'free';
    if (effectiveTier === 'pro' || effectiveTier === 'tester') {
      console.log('[DocumentsManager] Trial activation skipped: already PRO/tester');
      return false;
    }
    if (sub.documentsManagerTrialUntil) {
      console.log('[DocumentsManager] Trial activation skipped: already has Documents Manager trial');
      return false;
    }
    
    try {
      console.log('[DocumentsManager] Activating 2-week trial...');
      const db = firebase.firestore();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14); // 2 weeks from now
      
      await db.collection('users')
        .doc(uid)
        .collection('settings')
        .doc('subscription')
        .set({
          documentsManagerTrialUntil: firebase.firestore.Timestamp.fromDate(trialEnd)
        }, { merge: true });
      
      // Update local state
      if (window.currentUserSubscription) {
        window.currentUserSubscription.documentsManagerTrialUntil = trialEnd;
      }
      
      console.log('[DocumentsManager] Trial activated successfully until:', trialEnd);
      return true;
    } catch (e) {
      console.error('[DocumentsManager] Failed to activate trial:', e);
      return false;
    }
  }

  function renderProUpgradeCard(container) {
    const i18n = getI18n();
    const title = i18n.documentsManagerProTitle || '🔐 Iratok / Engedélyek kezelése – PRO funkció';
    const description = i18n.documentsManagerProDescription || 'Ne felejts el semmit – emlékeztető a következőkre:';
    const features = i18n.documentsManagerProFeatures || `• Jogosítvány érvényessége
• Sofőrkártya lejárata
• Jármű műszaki vizsgája
• Elsősegély csomag érvényessége
• ADR felszerelések lejárata
• Bármilyen engedély vagy irat`;
    const proTitle = i18n.documentsManagerProBenefitsTitle || '✨ PRO csomaggal:';
    const proBenefits = i18n.documentsManagerProBenefits || `• Automatikus figyelmeztetések az áttekintés oldalon
• Rugalmas emlékeztetők (nap/hét/hónap)
• Színkódolt állapotjelzés
• Korlátlan számú irat nyilvántartása`;
    const privacy = i18n.documentsManagerProPrivacy || '🛡️ Adatvédelem: Nem kell személyes adatokat megadnod – csak a dokumentum típusát és lejárati dátumát.';
    const upgradeBtn = i18n.documentsManagerProUpgrade || 'Frissítés PRO-ra';

    container.innerHTML = `
      <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #fbbf24;border-radius:16px;padding:24px;box-shadow:0 8px 24px rgba(251,191,36,0.2);max-width:600px;margin:20px auto">
        <h3 style="font-size:18px;font-weight:700;color:#78350f;margin:0 0 16px 0">${title}</h3>
        
        <p style="font-size:14px;color:#92400e;margin:0 0 12px 0;font-weight:600">${description}</p>
        <div style="font-size:13px;color:#92400e;margin:0 0 20px 0;line-height:1.8;white-space:pre-line">${features}</div>
        
        <div style="background:rgba(255,255,255,0.6);border-radius:12px;padding:16px;margin-bottom:20px">
          <p style="font-size:14px;color:#78350f;margin:0 0 10px 0;font-weight:700">${proTitle}</p>
          <div style="font-size:13px;color:#92400e;line-height:1.8;white-space:pre-line">${proBenefits}</div>
        </div>
        
        <div style="background:rgba(59,130,246,0.1);border-left:4px solid #3b82f6;border-radius:8px;padding:12px;margin-bottom:20px">
          <p style="font-size:12px;color:#1e40af;margin:0;line-height:1.6">${privacy}</p>
        </div>
        
        <button type="button" id="documents-manager-upgrade-btn" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:10px;padding:14px 28px;font-size:15px;font-weight:700;cursor:pointer;width:100%;box-shadow:0 4px 12px rgba(217,119,6,0.4);transition:transform 0.2s">
          ${upgradeBtn}
        </button>
      </div>
    `;

    const upgradeButton = container.querySelector('#documents-manager-upgrade-btn');
    if (upgradeButton) {
      upgradeButton.addEventListener('click', function() {
        // Navigate to subscription page
        if (typeof window.showTab === 'function') {
          window.showTab('subscription');
        }
      });
      upgradeButton.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
      });
      upgradeButton.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
      });
    }
  }

  function showTrialActivatedBanner() {
    const i18n = getI18n();
    const message = i18n.documentsManagerTrialActivated || '🎉 2 hetes próbaidő aktiválva! Próbáld ki az Iratok / Engedélyek funkciót.';
    const okButton = i18n.documentsManagerTrialActivatedOk || 'Rendben';
    
    // Remove existing popup if any
    const existing = document.getElementById('documents-trial-activated-popup');
    if (existing) existing.remove();
    
    const popup = document.createElement('div');
    popup.id = 'documents-trial-activated-popup';
    popup.className = 'fixed inset-0 z-50 flex items-center justify-center';
    popup.style.cssText = 'background:rgba(0,0,0,0.6)';
    
    popup.innerHTML = `
      <div style="background:#020617;border-radius:16px;max-width:420px;width:calc(100% - 32px);margin:0 auto;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.6)">
        <div style="background:linear-gradient(135deg,#10b981,#059669);padding:20px 24px">
          <h3 style="font-size:18px;font-weight:700;color:#fff;margin:0;text-align:center">🎉 Próbaidő aktiválva!</h3>
        </div>
        <div style="padding:24px 24px 20px 24px">
          <p style="font-size:14px;color:#e5e7eb;margin:0;line-height:1.6;text-align:center">${message}</p>
        </div>
        <div style="background:#020617;border-top:1px solid rgba(148,163,184,0.4);padding:16px 24px;display:flex;justify-content:center">
          <button type="button" id="trial-activated-ok-btn" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;padding:12px 32px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(16,185,129,0.4);transition:transform 0.2s">
            ${okButton}
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    const okBtn = popup.querySelector('#trial-activated-ok-btn');
    if (okBtn) {
      okBtn.addEventListener('click', function() {
        popup.remove();
      });
      okBtn.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-2px)';
      });
      okBtn.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
      });
    }
    
    // Close on backdrop click
    popup.addEventListener('click', function(ev) {
      if (ev.target === popup) {
        popup.remove();
      }
    });
  }

  function showTrialNotificationBanner() {
    const banner = document.getElementById('documents-manager-trial-banner');
    if (!banner) return;

    const sub = window.currentUserSubscription || {};
    
    // Only show if user has feature-specific trial (not effective PRO/tester)
    const effectiveTier = (typeof window.getEffectiveSubscriptionTier === 'function')
      ? window.getEffectiveSubscriptionTier()
      : 'free';
    if (effectiveTier === 'pro' || effectiveTier === 'tester' || (sub.isTrial && !sub.documentsManagerTrialUntil)) {
      banner.classList.add('hidden');
      return;
    }
    
    if (!sub.documentsManagerTrialUntil) {
      banner.classList.add('hidden');
      return;
    }

    // Calculate days remaining
    const now = new Date();
    const trialEnd = sub.documentsManagerTrialUntil instanceof Date 
      ? sub.documentsManagerTrialUntil 
      : new Date(sub.documentsManagerTrialUntil);
    
    if (now >= trialEnd) {
      // Trial expired
      banner.classList.add('hidden');
      return;
    }

    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const i18n = getI18n();
    
    const title = i18n.documentsManagerTrialNotificationTitle || '⏰ Próbaidőszak aktív';
    const message = (i18n.documentsManagerTrialNotificationMessage || 'Ez a funkció próbaidőszakban érhető el számodra. Még %DAYS% nap van hátra.')
      .replace('%DAYS%', daysRemaining);
    
    banner.classList.remove('hidden');
    banner.innerHTML = `
      <div class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-600 rounded-lg">
        <div class="flex items-start gap-3">
          <div class="text-xl">⏰</div>
          <div class="flex-1">
            <div class="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">${title}</div>
            <div class="text-xs text-blue-800 dark:text-blue-200">${message}</div>
          </div>
        </div>
      </div>
    `;
  }

  function showConfirmDialog(message, onConfirm, onCancel) {
    var existingConfirm = document.getElementById('documents-manager-confirm-dialog');
    if (existingConfirm) existingConfirm.remove();

    var confirmDialog = document.createElement('div');
    confirmDialog.id = 'documents-manager-confirm-dialog';
    confirmDialog.className = 'fixed inset-0 z-50 flex items-center justify-center';
    confirmDialog.style.cssText = 'background:rgba(0,0,0,0.6)';
    
    var i18n = getI18n();
    var okText = i18n.documentsManagerDeleteConfirmOk || 'Törlés';
    var cancelText = i18n.documentsManagerCancelButton || 'Mégse';
    
    confirmDialog.innerHTML = ''
      + '<div style="background:#020617;border-radius:16px;max-width:380px;width:calc(100% - 32px);margin:0 auto;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.6)">'
      + '  <div style="background:linear-gradient(135deg,#ef4444,#dc2626);padding:16px 20px">'
      + '    <h3 style="font-size:16px;font-weight:700;color:#fff;margin:0">⚠️ Megerősítés</h3>'
      + '  </div>'
      + '  <div style="padding:24px 20px">'
      + '    <p style="font-size:14px;color:#e5e7eb;margin:0;line-height:1.5">' + message + '</p>'
      + '  </div>'
      + '  <div style="background:#020617;border-top:1px solid rgba(148,163,184,0.4);padding:14px 20px;display:flex;justify-content:flex-end;gap:8px">'
      + '    <button type="button" id="confirm-cancel-btn" style="background:#1f2937;color:#e5e7eb;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer">' + cancelText + '</button>'
      + '    <button type="button" id="confirm-ok-btn" style="background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(239,68,68,0.4)">🗑️ ' + okText + '</button>'
      + '  </div>'
      + '</div>';
    
    document.body.appendChild(confirmDialog);
    
    var okBtn = confirmDialog.querySelector('#confirm-ok-btn');
    var cancelBtn = confirmDialog.querySelector('#confirm-cancel-btn');
    
    function close() {
      confirmDialog.remove();
    }
    
    if (okBtn) {
      okBtn.addEventListener('click', function() {
        close();
        if (onConfirm) onConfirm();
      });
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        close();
        if (onCancel) onCancel();
      });
    }
    
    confirmDialog.addEventListener('click', function(ev) {
      if (ev.target === confirmDialog) {
        close();
        if (onCancel) onCancel();
      }
    });
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

  function daysUntilExpiry(value) {
    if (typeof window.daysUntilDocumentExpiryLocal === 'function') {
      return window.daysUntilDocumentExpiryLocal(value, new Date());
    }
    var d = parseExpiryDate(value);
    if (!d) return null;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  }

  function formatDate(date) {
    if (!date) return '';
    const d = parseExpiryDate(date);
    if (!d) return '';
    try {
      const locale = (typeof currentLang === 'string' && currentLang) ? currentLang : 'hu-HU';
      return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    } catch (_) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    }
  }

  function ensureModal() {
    let modal = document.getElementById('documents-manager-modal');
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
    var reminderBg = isDark ? '#020617' : '#eff6ff';
    var reminderBorder = isDark ? '#1d4ed8' : '#bfdbfe';
    var reminderLabel = isDark ? '#bfdbfe' : '#1e3a8a';
    var reminderInputBorder = isDark ? '#60a5fa' : '#60a5fa';
    var footerBg = isDark ? '#020617' : '#f9fafb';
    var footerBorder = isDark ? 'rgba(148,163,184,0.4)' : 'rgba(209,213,219,1)';
    var cancelBg = isDark ? '#1f2937' : '#e5e7eb';
    var cancelText = isDark ? '#e5e7eb' : '#111827';

    modal = document.createElement('div');
    modal.id = 'documents-manager-modal';
    modal.className = 'fixed inset-0 z-50 hidden items-center justify-center';
    modal.style.cssText = 'background:rgba(0,0,0,0.5)';
    modal.innerHTML = ''
      + '<div style="background:' + cardBg + ';border-radius:16px;max-width:440px;width:calc(100% - 32px);margin:0 auto;box-shadow:' + cardShadow + ';max-height:calc(100vh - 160px);overflow-y:auto">'
      + '  <div style="background:linear-gradient(135deg,#f59e0b,#eab308);padding:18px 20px 20px 20px">'
      + '    <h2 id="documents-manager-modal-title" style="font-size:18px;font-weight:700;color:#fff;margin:0 0 8px 0">📋 <span></span></h2>'
      + '    <p id="documents-manager-modal-subtitle" style="font-size:12px;color:rgba(255,255,255,0.95);margin:0;line-height:1.6;white-space:pre-line"></p>'
      + '  </div>'
      + '  <div style="padding:20px;display:flex;flex-direction:column;gap:14px;color:' + bodyText + '">'
      + '    <div>'
      + '      <label style="display:block;font-size:13px;font-weight:600;color:' + labelText + ';margin-bottom:4px" for="documents-manager-name">🏷️ <span></span></label>'
      + '      <input id="documents-manager-name" type="text" style="width:100%;padding:10px 12px;border:2px solid ' + inputBorder + ';border-radius:10px;font-size:14px;outline:none;box-sizing:border-box;background:' + inputBg + ';color:' + bodyText + '" />'
      + '    </div>'
      + '    <div>'
      + '      <label style="display:block;font-size:13px;font-weight:600;color:' + labelText + ';margin-bottom:4px" for="documents-manager-category">📁 <span></span></label>'
      + '      <select id="documents-manager-category" style="width:100%;padding:10px 12px;border:2px solid ' + inputBorder + ';border-radius:10px;font-size:14px;outline:none;box-sizing:border-box;background:' + inputBg + ';color:' + bodyText + '"></select>'
      + '    </div>'
      + '    <div>'
      + '      <label style="display:block;font-size:13px;font-weight:600;color:' + labelText + ';margin-bottom:4px" for="documents-manager-expires">📅 <span></span></label>'
      + '      <input id="documents-manager-expires" type="date" style="width:100%;padding:10px 12px;border:2px solid ' + inputBorder + ';border-radius:10px;font-size:14px;outline:none;box-sizing:border-box;background:' + inputBg + ';color:' + bodyText + '" />'
      + '    </div>'
      + '    <div style="background:' + reminderBg + ';border:2px solid ' + reminderBorder + ';border-radius:12px;padding:14px">'
      + '      <div style="font-size:14px;font-weight:700;color:' + reminderLabel + ';margin-bottom:6px">🔔 <span id="documents-manager-remind-section-title"></span></div>'
      + '      <div>'
      + '        <label style="display:block;font-size:13px;font-weight:500;color:' + reminderLabel + ';margin-bottom:6px" for="documents-manager-remind-value" id="documents-manager-remind-value-label"></label>'
      + '        <div style="display:flex;align-items:center;gap:8px">'
      + '          <input id="documents-manager-remind-value" type="number" min="1" max="365" style="width:70px;padding:6px 8px;border:2px solid ' + reminderInputBorder + ';border-radius:8px;font-size:14px;font-weight:600;text-align:center;outline:none;background:' + inputBg + ';color:' + bodyText + '" />'
      + '          <select id="documents-manager-remind-unit" style="flex:1;padding:6px 8px;border:2px solid ' + reminderInputBorder + ';border-radius:8px;font-size:13px;font-weight:600;outline:none;background:' + inputBg + ';color:' + bodyText + '">'
      + '            <option value="days"></option>'
      + '            <option value="weeks"></option>'
      + '            <option value="months"></option>'
      + '          </select>'
      + '        </div>'
      + '      </div>'
      + '    </div>'
      + '  </div>'
      + '  <div style="background:' + footerBg + ';border-top:1px solid ' + footerBorder + ';padding:14px 20px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-shrink:0">'
      + '    <button type="button" id="documents-manager-delete" class="hidden" style="background:none;color:#dc2626;border:none;padding:8px 12px;font-size:13px;font-weight:700;cursor:pointer">🗑️ <span></span></button>'
      + '    <div style="display:flex;gap:8px;margin-left:auto">'
      + '      <button type="button" id="documents-manager-cancel" style="background:' + cancelBg + ';color:' + cancelText + ';border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer"></button>'
      + '      <button type="button" id="documents-manager-save" style="background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(34,197,94,0.4)">✅ <span></span></button>'
      + '    </div>'
      + '  </div>'
      + '</div>';

    document.body.appendChild(modal);
    return modal;
  }

  async function loadMetaDocuments(uid, options) {
    if (!uid) return [];
    if (typeof DocumentsDataService !== 'undefined' && DocumentsDataService.loadMetaDocumentsCached) {
      return DocumentsDataService.loadMetaDocumentsCached(uid, options || {});
    }
    if (typeof firebase === 'undefined' || !firebase.firestore) return [];
    try {
      const db = firebase.firestore();
      const snap = await db.collection('users')
        .doc(uid)
        .collection('documents')
        .get();
      return snap.docs.map(function (d) {
        return Object.assign({ id: d.id }, d.data() || {});
      });
    } catch (e) {
      console.warn('[DocumentsManager] Failed to load documents:', e && e.message);
      return [];
    }
  }

  function buildDocumentsManagerCardHtml(doc, i18n) {
    var categoryLabels = {
      driver: i18n.documentsManagerCategoryDriver || 'Gépjárművezető',
      truck: i18n.documentsManagerCategoryTruck || 'Teherautó',
      trailer: i18n.documentsManagerCategoryTrailer || 'Pótkocsi / félpótkocsi',
      adr: i18n.documentsManagerCategoryADR || 'ADR felszerelés',
      permits: i18n.documentsManagerCategoryPermits || 'Engedélyek',
      other: i18n.documentsManagerCategoryOther || 'Egyéb'
    };

    var name = doc.title || doc.name || (i18n.documentsTitle || 'Dokumentum');
    var category = categoryLabels[doc.category] || categoryLabels.other;
    var expiryStr = formatDate(doc.expiresAt);
    var remindEnabled = doc.remindEnabled !== false;
    var remindValue = (typeof doc.remindValue === 'number' && doc.remindValue > 0) ? doc.remindValue : 14;
    var remindUnit = doc.remindUnit || 'days';
    var unitLabel = remindUnit === 'weeks' ? (i18n.documentsManagerUnitWeeks || 'hét') : remindUnit === 'months' ? (i18n.documentsManagerUnitMonths || 'hónap') : (i18n.documentsManagerUnitDays || 'nap');
    var remindLabel = remindEnabled
      ? ((i18n.documentsManagerReminderOn || 'Figyelmeztetés bekapcsolva (%VALUE% %UNIT% előtte)').replace('%VALUE%', String(remindValue)).replace('%UNIT%', unitLabel))
      : (i18n.documentsManagerReminderOff || 'Figyelmeztetés kikapcsolva');

    var categoryEmojis = { driver: '👤', truck: '🚛', trailer: '🚚', adr: '⚠️', permits: '📜', other: '📄' };
    var categoryEmoji = categoryEmojis[doc.category] || categoryEmojis.other;

    var categoryColorMap = {
      driver: '#3b82f6',
      truck: '#f97316',
      trailer: '#a855f7',
      adr: '#eab308',
      permits: '#10b981',
      other: '#6b7280'
    };
    var borderColor = categoryColorMap[doc.category] || categoryColorMap.other;

    var remindBadge = remindEnabled
      ? '<span style="display:inline-block;background:#dcfce7;color:#15803d;border:1px solid #86efac;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600">🔔 ' + remindLabel + '</span>'
      : '<span style="display:inline-block;background:#f3f4f6;color:#6b7280;border:1px solid #d1d5db;border-radius:6px;padding:2px 8px;font-size:11px;font-weight:600">🔕 ' + remindLabel + '</span>';

    var expiryText = expiryStr
      ? ((i18n.documentsManagerExpiresLabel || 'Lejárat: %DATE%').replace('%DATE%', expiryStr))
      : (i18n.documentsManagerNoExpiry || 'Nincs beállított lejárati dátum');

    var timeRemainingText = '';
    var timeRemainingColor = '#059669';
    if (doc.expiresAt) {
      var days = daysUntilExpiry(doc.expiresAt);
      if (days === null) {
        days = 0;
      }

      var remindDays = remindValue;
      if (remindUnit === 'weeks') {
        remindDays = remindValue * 7;
      } else if (remindUnit === 'months') {
        remindDays = remindValue * 30;
      }

      if (days < 0) {
        timeRemainingColor = '#dc2626';
      } else if (days <= remindDays) {
        timeRemainingColor = '#eab308';
      } else {
        timeRemainingColor = '#059669';
      }

      if (typeof window.formatTimeRemaining === 'function') {
        timeRemainingText = window.formatTimeRemaining(days, i18n);
      } else {
        var absDays = Math.abs(days);
        var isPast = days < 0;
        var years = Math.floor(absDays / 365);
        var months = Math.floor((absDays % 365) / 30);
        var weeks = Math.floor(((absDays % 365) % 30) / 7);
        var remainingDays = ((absDays % 365) % 30) % 7;

        var parts = [];
        if (years > 0) parts.push(years + ' ' + (years === 1 ? (i18n.documentsReminderYear || 'év') : (i18n.documentsReminderYears || 'év')));
        if (months > 0) parts.push(months + ' ' + (i18n.documentsReminderMonth || 'hónap'));
        if (weeks > 0) parts.push(weeks + ' ' + (i18n.documentsReminderWeek || 'hét'));
        if (remainingDays > 0 || parts.length === 0) parts.push(remainingDays + ' ' + (i18n.documentsReminderDay || 'nap'));

        var timeStr = parts.join(' ');
        timeRemainingText = isPast
          ? ((i18n.documentsReminderExpiredAgo || '%TIME% ezelőtt lejárt').replace('%TIME%', timeStr))
          : ((i18n.documentsReminderExpiresIn || '%TIME% múlva jár le').replace('%TIME%', timeStr));
      }
    }

    var editBtnText = i18n.documentsManagerEditButton || 'Szerkesztés';

    var daysRemaining = daysUntilExpiry(doc.expiresAt);
    var isExpired = daysRemaining !== null && daysRemaining < 0;

    var remindDaysForCard = remindValue;
    if (remindUnit === 'weeks') {
      remindDaysForCard = remindValue * 7;
    } else if (remindUnit === 'months') {
      remindDaysForCard = remindValue * 30;
    }
    if (daysRemaining === null) {
      daysRemaining = 0;
    }
    var isWithinReminder = !isExpired && daysRemaining >= 0 && daysRemaining <= remindDaysForCard;

    var cardBackground = isExpired ? '#fee2e2' : (isWithinReminder ? '#fef3c7' : '#fff');
    var cardBorder = isExpired ? '#fca5a5' : (isWithinReminder ? '#fbbf24' : '#e5e7eb');

    return '<div data-doc-id="' + String(doc.id) + '" style="background:' + cardBackground + ';border:1px solid ' + cardBorder + ';border-left:4px solid ' + borderColor + ';border-radius:12px;padding:14px 16px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
            '<span style="font-size:20px">' + categoryEmoji + '</span>' +
            '<span style="font-weight:700;font-size:15px;color:#111827">' + name + '</span>' +
          '</div>' +
          '<div style="margin-bottom:6px">' +
            '<span style="display:inline-block;background:' + borderColor + ';color:#fff;border-radius:6px;padding:2px 10px;font-size:11px;font-weight:600">' + categoryEmoji + ' ' + category + '</span>' +
          '</div>' +
          '<div style="font-size:13px;color:#4b5563;margin-bottom:6px">📅 ' + expiryText + '</div>' +
          (timeRemainingText ? '<div style="font-size:12px;color:' + timeRemainingColor + ';font-weight:600;margin-bottom:6px">⏱️ ' + timeRemainingText + '</div>' : '') +
          '<div>' + remindBadge + '</div>' +
        '</div>' +
        '<button type="button" class="documents-manager-edit" style="background:#fffbeb;color:#d97706;border:1px solid #fcd34d;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">✏️ ' + editBtnText + '</button>' +
      '</div>' +
    '</div>';
  }

  function renderDocumentsManagerListPage(options) {
    var container = document.getElementById('documents-manager-list-container');
    var countEl = document.getElementById('documents-manager-count');
    var i18n = getI18n();
    if (!container) return;

    var totalItems = documentsManagerSortedCache.length;
    if (countEl) {
      var label = i18n.documentsManagerCountLabel || 'Összes irat / engedély: %COUNT% db';
      countEl.textContent = label.replace('%COUNT%', String(totalItems));
    }

    if (!totalItems) {
      container.innerHTML = '<div class="text-xs text-gray-500 dark:text-gray-400">' +
        (i18n.documentsManagerEmpty || 'Még nincs megadott irat vagy engedély. Kattints az „Új irat / engedély” gombra a hozzáadáshoz.') +
        '</div>';
      documentsManagerCurrentPage = 1;
      renderDocumentsManagerPaginationControls(1, 0);
      return;
    }

    var totals = getDocumentsManagerPaginationTotals();
    clampDocumentsManagerCurrentPage(totals.totalPages);

    var startIndex = (documentsManagerCurrentPage - 1) * documentsManagerPageSize;
    var pageDocs = documentsManagerSortedCache.slice(startIndex, startIndex + documentsManagerPageSize);

    container.innerHTML = pageDocs.map(function (doc) {
      return buildDocumentsManagerCardHtml(doc, i18n);
    }).join('');

    container.querySelectorAll('.documents-manager-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parent = btn.closest('[data-doc-id]');
        var id = parent && parent.getAttribute('data-doc-id');
        if (!id) return;
        var doc = documentsManagerSortedCache.find(function (d) { return String(d.id) === String(id); });
        if (doc) {
          openModal(doc);
        }
      });
    });

    renderDocumentsManagerPaginationControls(totals.totalPages, totals.totalItems);

    if (options && options.scrollToTop) {
      requestAnimationFrame(scrollDocumentsManagerListToTop);
    }
  }

  function renderList(docs) {
    var i18n = getI18n();

    documentsManagerSortedCache = (Array.isArray(docs) ? docs : []).slice().sort(function (a, b) {
      var ea = parseExpiryDate(a.expiresAt);
      var eb = parseExpiryDate(b.expiresAt);
      var ta = ea ? ea.getTime() : Infinity;
      var tb = eb ? eb.getTime() : Infinity;
      return ta - tb;
    });

    renderDocumentsManagerListPage();
  }

  async function saveDocument(existingId, values) {
    if (!window.currentUser || typeof firebase === 'undefined' || !firebase.firestore) {
      console.warn('[DocumentsManager] Cannot save meta document, missing user or Firestore');
      return;
    }
    var db = firebase.firestore();
    var uid = window.currentUser.uid;
    var col = db.collection('users').doc(uid).collection('documents');
    var payload = {
      name: values.name,
      category: values.category || 'other',
      expiresAt: values.expiresAt ? firebase.firestore.Timestamp.fromDate(values.expiresAt) : null,
      remindValue: values.remindValue || 14,
      remindUnit: values.remindUnit || 'days',
      remindEnabled: !!values.remindEnabled,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (!existingId) {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await col.add(payload);
      
      // Track document creation (GDPR-compliant anonymous statistics)
      if (window.documentsStats && typeof window.documentsStats.trackDocumentCreated === 'function') {
        window.documentsStats.trackDocumentCreated().catch(err => {
          console.warn('[DocumentsManager] Stats tracking failed:', err);
        });
      }
    } else {
      await col.doc(String(existingId)).set(payload, { merge: true });
    }
  }

  async function deleteDocument(id) {
    if (!id) return;
    if (!window.currentUser || typeof firebase === 'undefined' || !firebase.firestore) {
      console.warn('[DocumentsManager] Cannot delete meta document, missing user or Firestore');
      return;
    }
    var db = firebase.firestore();
    var uid = window.currentUser.uid;
    await db.collection('users')
      .doc(uid)
      .collection('documents')
      .doc(String(id))
      .delete();
  }

  async function openModal(doc) {
    var modal = ensureModal();
    var i18n = getI18n();

    var isEdit = !!(doc && doc.id);

    var titleEl = modal.querySelector('#documents-manager-modal-title');
    var subtitleEl = modal.querySelector('#documents-manager-modal-subtitle');
    var nameLabel = modal.querySelector('label[for="documents-manager-name"]');
    var categoryLabel = modal.querySelector('label[for="documents-manager-category"]');
    var expiresLabel = modal.querySelector('label[for="documents-manager-expires"]');
    var remindValueLabel = modal.querySelector('#documents-manager-remind-value-label');
    var remindSectionTitle = modal.querySelector('#documents-manager-remind-section-title');
    var nameInput = modal.querySelector('#documents-manager-name');
    var categorySelect = modal.querySelector('#documents-manager-category');
    var expiresInput = modal.querySelector('#documents-manager-expires');
    var remindValueInput = modal.querySelector('#documents-manager-remind-value');
    var remindUnitSelect = modal.querySelector('#documents-manager-remind-unit');
    var cancelBtn = modal.querySelector('#documents-manager-cancel');
    var saveBtn = modal.querySelector('#documents-manager-save');
    var deleteBtn = modal.querySelector('#documents-manager-delete');

    var titleNew = i18n.documentsManagerModalTitleNew || 'Új irat / engedély';
    var titleEdit = i18n.documentsManagerModalTitleEdit || 'Irat / engedély szerkesztése';
    var nameLbl = i18n.documentsManagerNameLabel || 'Megnevezés';
    var categoryLbl = i18n.documentsManagerCategoryLabel || 'Kategória';
    var expiresLbl = i18n.documentsManagerExpiresInputLabel || 'Lejárat dátuma';
    var remindValueLbl = i18n.documentsManagerRemindValueLabel || 'Figyelmeztetés ennyivel előtte:';
    var remindSectionLbl = i18n.documentsManagerRemindSectionTitle || 'Emlékeztető beállítások';
    var cancelLbl = i18n.documentsManagerCancelButton || 'Mégse';
    var saveLbl = i18n.documentsManagerSaveButton || 'Mentés';
    var deleteLbl = i18n.documentsManagerDeleteButton || 'Törlés';

    if (titleEl) {
      var titleSpan = titleEl.querySelector('span');
      if (titleSpan) titleSpan.textContent = isEdit ? titleEdit : titleNew;
    }
    if (subtitleEl) subtitleEl.textContent = i18n.documentsManagerModalSubtitle || 'Add meg az irat / engedély adatait. A lejárati dátum alapján kapod a figyelmeztetést.';
    if (nameLabel) {
      var nameLabelSpan = nameLabel.querySelector('span');
      if (nameLabelSpan) nameLabelSpan.textContent = nameLbl;
    }
    if (categoryLabel) {
      var categoryLabelSpan = categoryLabel.querySelector('span');
      if (categoryLabelSpan) categoryLabelSpan.textContent = categoryLbl;
    }
    if (expiresLabel) {
      var expiresLabelSpan = expiresLabel.querySelector('span');
      if (expiresLabelSpan) expiresLabelSpan.textContent = expiresLbl;
    }
    if (remindValueLabel) remindValueLabel.textContent = remindValueLbl;
    if (remindSectionTitle) remindSectionTitle.textContent = remindSectionLbl;
    
    if (remindUnitSelect) {
      var unitOptions = remindUnitSelect.querySelectorAll('option');
      if (unitOptions[0]) unitOptions[0].textContent = i18n.documentsManagerUnitDays || 'nap';
      if (unitOptions[1]) unitOptions[1].textContent = i18n.documentsManagerUnitWeeks || 'hét';
      if (unitOptions[2]) unitOptions[2].textContent = i18n.documentsManagerUnitMonths || 'hónap';
    }
    if (cancelBtn) cancelBtn.textContent = cancelLbl;
    if (saveBtn) {
      var saveBtnSpan = saveBtn.querySelector('span');
      if (saveBtnSpan) saveBtnSpan.textContent = saveLbl;
    }
    if (deleteBtn) {
      var deleteBtnSpan = deleteBtn.querySelector('span');
      if (deleteBtnSpan) deleteBtnSpan.textContent = deleteLbl;
    }

    if (categorySelect) {
      categorySelect.innerHTML = '';
      var options = [
        { value: 'driver', label: i18n.documentsManagerCategoryDriver || 'Gépjárművezető' },
        { value: 'truck', label: i18n.documentsManagerCategoryTruck || 'Teherautó' },
        { value: 'trailer', label: i18n.documentsManagerCategoryTrailer || 'Pótkocsi / félpótkocsi' },
        { value: 'adr', label: i18n.documentsManagerCategoryADR || 'ADR felszerelés' },
        { value: 'permits', label: i18n.documentsManagerCategoryPermits || 'Engedélyek' },
        { value: 'other', label: i18n.documentsManagerCategoryOther || 'Egyéb' }
      ];
      options.forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        categorySelect.appendChild(o);
      });
    }

    var initialName = (doc && (doc.title || doc.name)) || '';
    var initialCategory = (doc && doc.category) || 'other';
    var initialExpiry = doc && parseExpiryDate(doc.expiresAt);
    var initialRemindValue = (doc && typeof doc.remindValue === 'number' && doc.remindValue > 0) ? doc.remindValue : 14;
    var initialRemindUnit = (doc && doc.remindUnit) || 'days';

    if (nameInput) nameInput.value = initialName;
    if (categorySelect) categorySelect.value = initialCategory;
    if (expiresInput) {
      if (initialExpiry && !Number.isNaN(initialExpiry.getTime())) {
        var y = initialExpiry.getFullYear();
        var m = String(initialExpiry.getMonth() + 1).padStart(2, '0');
        var d = String(initialExpiry.getDate()).padStart(2, '0');
        expiresInput.value = y + '-' + m + '-' + d;
      } else {
        expiresInput.value = '';
      }
    }
    if (remindValueInput) remindValueInput.value = String(initialRemindValue);
    if (remindUnitSelect) remindUnitSelect.value = initialRemindUnit;

    function close() {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    function onCancel() {
      close();
    }

    async function onSave() {
      if (!nameInput || !nameInput.value.trim()) {
        nameInput && nameInput.focus();
        return;
      }
      
      // Disable save button to prevent double-click
      var currentSaveBtn = modal.querySelector('#documents-manager-save');
      if (currentSaveBtn) {
        currentSaveBtn.disabled = true;
        currentSaveBtn.style.opacity = '0.5';
        currentSaveBtn.style.cursor = 'not-allowed';
      }
      
      try {
        var expiresDate = null;
        if (expiresInput && expiresInput.value) {
          var d =
            (typeof window.parseIsoDateOnlyLocal === 'function'
              ? window.parseIsoDateOnlyLocal(expiresInput.value)
              : null) || new Date(expiresInput.value + 'T00:00:00');
          if (d && !Number.isNaN(d.getTime())) {
            expiresDate = d;
          }
        }
        var remindValue = 14;
        if (remindValueInput && remindValueInput.value) {
          var parsed = parseInt(remindValueInput.value, 10);
          if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 365) {
            remindValue = parsed;
          }
        }
        var remindUnit = (remindUnitSelect && remindUnitSelect.value) || 'days';

        await saveDocument(isEdit ? doc.id : null, {
          name: nameInput.value.trim(),
          category: categorySelect ? categorySelect.value : 'other',
          expiresAt: expiresDate,
          remindValue: remindValue,
          remindUnit: remindUnit,
          remindEnabled: true
        });

        close();
        try {
          if (typeof window.refreshDocumentsManager === 'function') {
            await window.refreshDocumentsManager();
          }
        } catch (_) {}
        try {
          if (typeof window.refreshDocumentsReminder === 'function') {
            await window.refreshDocumentsReminder({ force: true });
          }
        } catch (_) {}
      } finally {
        // Re-enable button in case of error
        if (currentSaveBtn) {
          currentSaveBtn.disabled = false;
          currentSaveBtn.style.opacity = '1';
          currentSaveBtn.style.cursor = 'pointer';
        }
      }
    }

    async function onDelete() {
      if (!isEdit || !doc || !doc.id) {
        close();
        return;
      }
      var confirmText = i18n.documentsManagerDeleteConfirm || 'Biztosan törlöd ezt az iratot / engedélyt?';
      
      showConfirmDialog(confirmText, async function() {
        await deleteDocument(doc.id);
        close();
        try {
          if (typeof window.refreshDocumentsManager === 'function') {
            await window.refreshDocumentsManager();
          }
        } catch (_) {}
        try {
          if (typeof window.refreshDocumentsReminder === 'function') {
            await window.refreshDocumentsReminder({ force: true });
          }
        } catch (_) {}
      });
    }

    // Clone buttons to remove all old event listeners
    if (cancelBtn) {
      var newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      newCancelBtn.addEventListener('click', onCancel);
    }
    if (saveBtn) {
      var newSaveBtn = saveBtn.cloneNode(true);
      saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
      newSaveBtn.addEventListener('click', onSave);
    }
    if (deleteBtn) {
      deleteBtn.classList.toggle('hidden', !isEdit);
      if (isEdit) {
        var newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
        newDeleteBtn.addEventListener('click', onDelete);
      }
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');

    modal.addEventListener('click', function (ev) {
      if (ev.target === modal) {
        close();
      }
    }, { once: true });
  }

  async function renderDocumentsManager() {
    console.log('[DocumentsManager] renderDocumentsManager called');
    try {
      var container = document.getElementById('documents-manager-list-container');
      if (!container) {
        console.log('[DocumentsManager] Container not found');
        return;
      }
      if (!window.currentUser || !window.currentUser.uid) {
        console.log('[DocumentsManager] No user logged in');
        var i18n = getI18n();
        var loginMsg = i18n.documentsManagerLoginRequired || 'Jelentkezz be, hogy kezeld az iratokat és engedélyeket.';
        container.innerHTML = '<div class="text-xs text-gray-500 dark:text-gray-400">' + loginMsg + '</div>';
        renderDocumentsManagerPaginationControls(1, 0);
        return;
      }

      // Do not render a false Free paywall while canonical entitlement is unresolved.
      var i18n = getI18n();
      if (typeof window.getEntitlementPresentationState === 'function') {
        var pres = window.getEntitlementPresentationState();
        if (pres === 'unknown' || pres === 'offline') {
          container.innerHTML = '<div class="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"><div class="font-semibold text-gray-900 dark:text-gray-100">⏳ ' + (i18n.documentsManagerTitle || 'Iratok / Engedélyek') + '</div><div class="mt-2 text-sm text-gray-700 dark:text-gray-300">' + (i18n.proFeatureStatusLoading || 'Betöltés...') + '</div></div>';
          renderDocumentsManagerPaginationControls(1, 0);
          return;
        }
      }

      // Check PRO access
      console.log('[DocumentsManager] Checking PRO access...');
      const hasAccess = canAccessDocumentsManager();
      console.log('[DocumentsManager] Has access:', hasAccess);
      
      // Track usage (GDPR-compliant anonymous statistics)
      if (hasAccess && window.documentsStats && typeof window.documentsStats.trackUsage === 'function') {
        // Only track once per session to avoid inflating numbers
        if (!window._documentsManagerTracked) {
          window._documentsManagerTracked = true;
          window.documentsStats.trackUsage().catch(err => {
            console.warn('[DocumentsManager] Stats tracking failed:', err);
          });
        }
      }
      
      if (!hasAccess) {
        // Try to activate trial for existing users (only once)
        const sub = window.currentUserSubscription || {};
        console.log('[DocumentsManager] Subscription state:', {
          tier: sub.tier,
          isTrial: sub.isTrial,
          documentsManagerTrialUntil: sub.documentsManagerTrialUntil,
          trialEnd: sub.trialEnd
        });
        console.log('[DocumentsManager] Trial activation condition check:', {
          hasDocumentsManagerTrial: !!sub.documentsManagerTrialUntil,
          hasIsTrial: !!sub.isTrial,
          willActivate: !sub.documentsManagerTrialUntil && !sub.isTrial
        });
        if (!sub.documentsManagerTrialUntil && !sub.isTrial) {
          const activated = await activateDocumentsManagerTrial(window.currentUser.uid);
          if (activated) {
            // Trial activated, reload subscription data and show banner
            if (typeof loadUserSubscription === 'function') {
              await loadUserSubscription(window.currentUser.uid, { forceRefresh: true });
            }
            showTrialActivatedBanner();
            // Reload the view with updated subscription
            setTimeout(() => {
              renderDocumentsManager();
            }, 100);
            return;
          }
        }
        
        // Show PRO upgrade card for Free users (if trial not activated)
        renderProUpgradeCard(container);
        renderDocumentsManagerPaginationControls(1, 0);
        return;
      }

      // Show trial notification banner if applicable
      showTrialNotificationBanner();

      var docs = await loadMetaDocuments(window.currentUser.uid);
      renderList(docs);
    } catch (e) {
      console.warn('[DocumentsManager] render failed:', e && e.message);
    }
  }

  function init() {
    var newBtn = document.getElementById('documents-manager-new-btn');
    if (newBtn) {
      // Hide button for Free users without PRO access
      const hasAccess = canAccessDocumentsManager();
      if (!hasAccess) {
        newBtn.style.display = 'none';
      } else {
        newBtn.style.display = '';
        newBtn.addEventListener('click', function () {
          openModal(null);
        });
      }
    }
  }

  window.renderDocumentsManager = async function () {
    init();
    await renderDocumentsManager();
  };

  window.refreshDocumentsManager = async function () {
    await renderDocumentsManager();
  };

  window.changeDocumentsManagerPage = changeDocumentsManagerPage;
  window.changeDocumentsManagerPageSize = changeDocumentsManagerPageSize;
  window.jumpToDocumentsManagerPage = jumpToDocumentsManagerPage;
  window.openDocumentsManagerPageJumpModal = openDocumentsManagerPageJumpModal;
  window.closeDocumentsManagerPageJumpModal = closeDocumentsManagerPageJumpModal;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDocumentsManagerPageJumpModal);
    } else {
      initDocumentsManagerPageJumpModal();
    }
  }
})();

