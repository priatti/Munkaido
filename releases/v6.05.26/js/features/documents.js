(function(){
  'use strict';

  const DOCUMENTS_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
  const DOCUMENTS_LAST_PLATE_KEY = 'gurigo_documents_last_plate';
  const DOCUMENTS_FREE_DAILY_LIMIT = 2;
  const DOCUMENTS_ARCHIVAL_CACHE_KEY = 'gurigo_documents_archival_unlocked';

  function getDocumentsI18n() {
    try {
      if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
        return translations[currentLang] || translations.hu || {};
      }
    } catch (_) {}
    return {};
  }

  function initDocumentsView() {
    try {
      const dateInput = document.getElementById('documents-date');
      const todayBtn = document.getElementById('documents-today-btn');
      const uploadBtn = document.getElementById('documents-upload-btn');
      const cameraBtn = document.getElementById('documents-camera-btn');
      const saveBtn = document.getElementById('documents-save-btn');
      const fileInput = document.getElementById('documents-file-input');
      const cameraInput = document.getElementById('documents-camera-input');
      const typeFilter = document.getElementById('documents-type-filter');
      const listContainer = document.getElementById('documents-list-container');
      const emptyStateCard = document.getElementById('documents-empty-state-card');
      const typeSelectorContainer = document.getElementById('documents-type-selector');
      const typeActionsContainer = document.getElementById('documents-type-actions');
      const plateInput = document.getElementById('documents-plate-input');
      const noteInput = document.getElementById('documents-note-input');
      const selectedFilesInfo = document.getElementById('documents-selected-files-info');
      const uploadProgressEl = document.getElementById('documents-upload-progress');
      const uploadProgressFill = uploadProgressEl ? uploadProgressEl.querySelector('.documents-upload-progress-fill') : null;
      const uploadProgressText = uploadProgressEl ? uploadProgressEl.querySelector('.documents-upload-progress-text') : null;
      const modal = document.getElementById('documents-type-modal');
      const modalTitle = document.getElementById('documents-type-modal-title');
      const modalHint = modal ? modal.querySelector('.documents-type-modal__hint') : null;
      const modalInput = document.getElementById('documents-type-name-input');
      const modalSave = document.getElementById('documents-type-save-btn');
      const modalCancel = document.getElementById('documents-type-cancel-btn');
      const modalOverlay = document.getElementById('documents-type-modal-overlay');
      const deleteModalOverlay = document.getElementById('documents-type-delete-modal-overlay');
      const deleteModalMessage = document.getElementById('documents-type-delete-modal-message');
      const deleteModalCancel = document.getElementById('documents-type-delete-cancel-btn');
      const deleteModalConfirm = document.getElementById('documents-type-delete-confirm-btn');
      var typeModalMode = 'add';
      var typeModalEditingName = null;
      var typePendingDeleteName = null;
      const quotaBanner = document.getElementById('documents-quota-banner');
      const pendingFilesWrap = document.getElementById('documents-pending-files-wrap');
      const pendingFilesList = document.getElementById('documents-pending-files-list');
      const pendingFilesSummary = document.getElementById('documents-pending-files-summary');
      const pendingFilesLimitWarning = document.getElementById('documents-pending-files-limit-warning');

      if (!dateInput || !listContainer) {
        return;
      }

      let selectedDocumentType = (typeof getDocumentTypes === 'function' && getDocumentTypes().length)
        ? getDocumentTypes()[0]
        : 'Dokumentum';
      let pendingDocumentFiles = [];
      let allDocuments = [];
      let allDocumentsRaw = [];
      const DOCUMENTS_PAGE_SIZE_OPTIONS = (typeof ListPagination !== 'undefined' && ListPagination.DEFAULT_PAGE_SIZE_OPTIONS)
        ? ListPagination.DEFAULT_PAGE_SIZE_OPTIONS
        : [10, 20, 50, 100];
      const DOCUMENTS_PAGE_SIZE_STORAGE_KEY = 'documentsListPageSize';
      const DOCUMENTS_PAGINATION_SLOT_IDS = ['documents-pagination-top', 'documents-pagination-bottom'];
      const DOCUMENTS_JUMP_MODAL_IDS = {
        overlayId: 'documents-page-jump-overlay',
        gridId: 'documents-page-jump-grid',
        titleId: 'documents-page-jump-title',
        closeBtnId: 'documents-page-jump-close-btn',
        closeHandler: 'closeDocumentsPageJumpModal',
      };
      let documentsCurrentPage = 1;
      let documentsPageSize = (typeof ListPagination !== 'undefined' && ListPagination.getStoredPageSize)
        ? ListPagination.getStoredPageSize(DOCUMENTS_PAGE_SIZE_STORAGE_KEY, DOCUMENTS_PAGE_SIZE_OPTIONS, 10)
        : 10;
      let selectedDocumentIds = new Set();
      let documentsEntitlementCtx = {
        ready: false,
        archivalUnlocked: false,
        effectiveTier: 'free',
        used: 0,
        dailyLimit: DOCUMENTS_FREE_DAILY_LIMIT
      };
      let isLoadingDocumentsView = false;
      let isRenderingDocumentsQuotaBanner = false;
      let isLoadingDocumentsEntitlement = false;
      let documentsEntitlementLoadPromise = null;

      if (uploadProgressEl) {
        try { uploadProgressEl.classList.add('hidden'); } catch (_) {}
      }

      let documentsUploadBar = null;
      function ensureDocumentsUploadBar() {
        if (documentsUploadBar) return documentsUploadBar;

        try {
          if (!document.getElementById('documents-upload-truckbar-style')) {
            const style = document.createElement('style');
            style.id = 'documents-upload-truckbar-style';
            style.textContent = "\n" +
              "#documents-upload-truckbar{position:fixed;left:50%;top:50%;z-index:9999;display:none;opacity:0;transform:translate(-50%,-50%) translateY(8px);transition:opacity .18s ease,transform .18s ease;max-width:760px;width:calc(100vw - 24px);}\n" +
              "#documents-upload-truckbar.is-visible{display:block;opacity:1;transform:translate(-50%,-50%) translateY(0);}\n" +
              "#documents-upload-truckbar .truckbar-card{background:linear-gradient(180deg,rgba(17,24,39,.92),rgba(3,7,18,.92));backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:12px 14px;box-shadow:0 18px 55px rgba(0,0,0,.45);}\n" +
              "#documents-upload-truckbar .truckbar-top{display:flex;align-items:center;gap:12px;}\n" +
              "#documents-upload-truckbar .truckbar-left{display:flex;align-items:center;gap:10px;min-width:0;}\n" +
              "#documents-upload-truckbar .truckbar-icon{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.07);color:#e5e7eb;font-size:20px;flex:0 0 auto;}\n" +
              "#documents-upload-truckbar .truckbar-text{min-width:0;color:#e5e7eb;font-weight:700;line-height:1.1;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\n" +
              "#documents-upload-truckbar .truckbar-subtext{color:rgba(229,231,235,.78);font-size:12px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}\n" +
              "#documents-upload-truckbar .truckbar-flag{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.07);color:#e5e7eb;font-size:20px;flex:0 0 auto;}\n" +
              "#documents-upload-truckbar .truckbar-road{flex:1;min-width:90px;}\n" +
              "#documents-upload-truckbar .truckbar-track{position:relative;height:10px;border-radius:9999px;background:rgba(255,255,255,.10);overflow:hidden;}\n" +
              "#documents-upload-truckbar .truckbar-progress{position:absolute;left:0;top:0;bottom:0;width:0%;background:linear-gradient(90deg,#f97316,#fb923c);transition:width .12s linear;}\n" +
              "#documents-upload-truckbar .truckbar-truck{position:absolute;top:50%;left:0;transform:translate(-12px,-50%);width:28px;height:28px;border-radius:10px;background:rgba(249,115,22,.18);display:flex;align-items:center;justify-content:center;color:#fb923c;transition:left .12s linear;}\n" +
              "#documents-upload-truckbar .truckbar-truck svg{width:20px;height:20px;display:block;}\n" +
              "#documents-upload-truckbar .truckbar-bottom{display:flex;align-items:center;justify-content:flex-end;margin-top:8px;}\n" +
              "#documents-upload-truckbar .truckbar-retry{display:none;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#e5e7eb;border-radius:10px;padding:8px 12px;font-weight:700;font-size:13px;}\n" +
              "#documents-upload-truckbar .truckbar-retry.is-visible{display:inline-flex;}\n";
            document.head.appendChild(style);
          }

          let root = document.getElementById('documents-upload-truckbar');
          if (!root) {
            root = document.createElement('div');
            root.id = 'documents-upload-truckbar';
            root.setAttribute('role', 'status');
            root.setAttribute('aria-live', 'polite');
            root.innerHTML =
              '<div class="truckbar-card">' +
                '<div class="truckbar-top">' +
                  '<div class="truckbar-left">' +
                    '<div class="truckbar-icon" aria-hidden="true">📄</div>' +
                    '<div style="min-width:0;">' +
                      '<div class="truckbar-text" id="documents-upload-truckbar-text">Dokumentum feltöltése…</div>' +
                      '<div class="truckbar-subtext" id="documents-upload-truckbar-subtext"></div>' +
                    '</div>' +
                  '</div>' +
                  '<div class="truckbar-road">' +
                    '<div class="truckbar-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
                      '<div class="truckbar-progress"></div>' +
                      '<div class="truckbar-truck" aria-hidden="true">' +
                        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                          '<path d="M3 7.5c0-.828.672-1.5 1.5-1.5H14c.552 0 1 .448 1 1v9.5H4.5C3.672 16.5 3 15.828 3 15V7.5Z" fill="currentColor" opacity="0.9"/>' +
                          '<path d="M15 10h3.6c.318 0 .62.152.81.41l1.59 2.12c.129.172.2.38.2.595V16.5H15V10Z" fill="currentColor" opacity="0.7"/>' +
                          '<circle cx="7" cy="17" r="2" fill="#111827"/>' +
                          '<circle cx="7" cy="17" r="1" fill="#9CA3AF"/>' +
                          '<circle cx="18" cy="17" r="2" fill="#111827"/>' +
                          '<circle cx="18" cy="17" r="1" fill="#9CA3AF"/>' +
                          '<path d="M16.2 11.3h2.1l1.2 1.6h-3.3v-1.6Z" fill="#111827" opacity="0.35"/>' +
                        '</svg>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +
                  '<div class="truckbar-flag" aria-hidden="true">🏁</div>' +
                '</div>' +
                '<div class="truckbar-bottom">' +
                  '<button type="button" class="truckbar-retry" id="documents-upload-truckbar-retry">Újra</button>' +
                '</div>' +
              '</div>';
            document.body.appendChild(root);
          }

          const textEl = root.querySelector('#documents-upload-truckbar-text');
          const subTextEl = root.querySelector('#documents-upload-truckbar-subtext');
          const trackEl = root.querySelector('.truckbar-track');
          const progressEl = root.querySelector('.truckbar-progress');
          const truckEl = root.querySelector('.truckbar-truck');
          const retryBtn = root.querySelector('#documents-upload-truckbar-retry');

          let hideTimer = null;
          let retryHandler = null;

          function setVisible(visible) {
            if (hideTimer) {
              clearTimeout(hideTimer);
              hideTimer = null;
            }
            if (visible) {
              root.classList.add('is-visible');
            } else {
              root.classList.remove('is-visible');
              root.style.display = 'none';
              root.style.opacity = '0';
              root.style.transform = 'translate(-50%,-50%) translateY(8px)';
            }
          }

          function show() {
            try {
              root.style.display = 'block';
              requestAnimationFrame(function() {
                root.classList.add('is-visible');
              });
            } catch (_) {}
          }

          function setProgress(percent) {
            const p = Math.max(0, Math.min(100, Math.round(percent || 0)));
            if (progressEl) progressEl.style.width = p + '%';
            if (trackEl) trackEl.setAttribute('aria-valuenow', String(p));
            if (truckEl) {
              const clamped = Math.max(0, Math.min(100, p));
              truckEl.style.left = clamped + '%';
            }
          }

          function setRetry(visible, handler) {
            retryHandler = handler || null;
            if (!retryBtn) return;
            if (visible) {
              retryBtn.classList.add('is-visible');
            } else {
              retryBtn.classList.remove('is-visible');
            }
          }

          if (retryBtn && !retryBtn.__documentsUploadTruckbarBound) {
            retryBtn.__documentsUploadTruckbarBound = true;
            retryBtn.addEventListener('click', function() {
              try {
                if (typeof retryHandler === 'function') {
                  retryHandler();
                }
              } catch (_) {}
            });
          }

          documentsUploadBar = {
            show: show,
            hide: function(delayMs) {
              const d = typeof delayMs === 'number' ? delayMs : 0;
              if (hideTimer) {
                clearTimeout(hideTimer);
                hideTimer = null;
              }
              hideTimer = setTimeout(function() {
                try { setVisible(false); } catch (_) {}
              }, Math.max(0, d));
            },
            setUploading: function(percent, uploaded, total) {
              try { show(); } catch (_) {}
              setRetry(false, null);
              setProgress(percent);
              const i18n = getDocumentsI18n();
              if (textEl) textEl.textContent = (i18n.documents_upload_in_progress || 'Feltöltés folyamatban…') + ' ' + String(Math.max(0, Math.min(100, Math.round(percent || 0)))) + '%';
              if (subTextEl && total) {
                const progressText = i18n.documents_upload_progress_text || '%UPLOADED% / %TOTAL% feltöltve';
                subTextEl.textContent = progressText.replace('%UPLOADED%', String(uploaded || 0)).replace('%TOTAL%', String(total));
              } else if (subTextEl) {
                subTextEl.textContent = '';
              }
            },
            setStarting: function() {
              try { show(); } catch (_) {}
              setRetry(false, null);
              setProgress(0);
              const i18n = getDocumentsI18n();
              if (textEl) textEl.textContent = i18n.documents_upload_in_progress || 'Feltöltés folyamatban…';
              if (subTextEl) subTextEl.textContent = '';
            },
            setSuccess: function() {
              setRetry(false, null);
              setProgress(100);
              const i18n = getDocumentsI18n();
              if (textEl) textEl.textContent = i18n.documents_upload_done || 'Sikeresen feltöltve';
              if (subTextEl) subTextEl.textContent = '';
              try {
                if (navigator && navigator.vibrate) {
                  navigator.vibrate(30);
                }
              } catch (_) {}
              this.hide(1300);
            },
            setError: function(retryFn) {
              setRetry(true, retryFn);
              const i18n = getDocumentsI18n();
              if (textEl) textEl.textContent = i18n.documentsUploadError || 'Feltöltési hiba';
              if (subTextEl) subTextEl.textContent = '';
              try { show(); } catch (_) {}
            }
          };

          return documentsUploadBar;
        } catch (_) {
          return null;
        }
      }

      const selectAllBtn = document.getElementById('documents-select-all-btn');
      const deleteSelectedBtn = document.getElementById('documents-delete-selected-btn');

      function getDocumentsPaginationTotals() {
        const totalItems = allDocuments.length;
        if (typeof ListPagination !== 'undefined' && ListPagination.calcTotals) {
          return ListPagination.calcTotals(totalItems, documentsPageSize);
        }
        const totalPages = Math.max(1, Math.ceil(totalItems / documentsPageSize));
        return { totalItems, totalPages };
      }

      function clampDocumentsCurrentPage(totalPages) {
        if (typeof ListPagination !== 'undefined' && ListPagination.clampPage) {
          documentsCurrentPage = ListPagination.clampPage(documentsCurrentPage, totalPages);
          return;
        }
        if (documentsCurrentPage > totalPages) documentsCurrentPage = totalPages;
        if (documentsCurrentPage < 1) documentsCurrentPage = 1;
      }

      function scrollDocumentsListToTop() {
        const anchor = document.getElementById('documents-list-top-anchor')
          || document.getElementById('content-documents');
        if (!anchor || typeof anchor.scrollIntoView !== 'function') return;
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      function buildDocumentsPaginationHtml(totalPages, totalItems) {
        if (typeof ListPagination !== 'undefined' && ListPagination.buildHtml) {
          return ListPagination.buildHtml({
            currentPage: documentsCurrentPage,
            totalPages: totalPages,
            totalItems: totalItems,
            pageSize: documentsPageSize,
            pageSizeOptions: DOCUMENTS_PAGE_SIZE_OPTIONS,
            changePageHandler: 'changeDocumentsPage',
            changePageSizeHandler: 'changeDocumentsPageSize',
            openJumpHandler: 'openDocumentsPageJumpModal',
          });
        }
        return '';
      }

      function renderDocumentsPaginationControls(totalPages, totalItems) {
        const showControls = totalItems > 0;
        const html = showControls ? buildDocumentsPaginationHtml(totalPages, totalItems) : '';
        if (typeof ListPagination !== 'undefined' && ListPagination.renderToSlots) {
          ListPagination.renderToSlots(DOCUMENTS_PAGINATION_SLOT_IDS, html, showControls);
          return;
        }
        DOCUMENTS_PAGINATION_SLOT_IDS.forEach(function (slotId) {
          const slot = document.getElementById(slotId);
          if (!slot) return;
          slot.innerHTML = html;
          slot.classList.toggle('hidden', !showControls);
        });
      }

      function closeDocumentsPageJumpModal() {
        if (typeof ListPagination !== 'undefined' && ListPagination.closeJumpModal) {
          ListPagination.closeJumpModal({
            overlayId: DOCUMENTS_JUMP_MODAL_IDS.overlayId,
            bodyClass: 'records-page-jump-open',
          });
        }
      }

      function openDocumentsPageJumpModal() {
        if (!allDocuments.length || typeof ListPagination === 'undefined' || !ListPagination.openJumpModal) return;
        const { totalPages } = getDocumentsPaginationTotals();
        ListPagination.openJumpModal({
          overlayId: DOCUMENTS_JUMP_MODAL_IDS.overlayId,
          gridId: DOCUMENTS_JUMP_MODAL_IDS.gridId,
          titleId: DOCUMENTS_JUMP_MODAL_IDS.titleId,
          closeBtnId: DOCUMENTS_JUMP_MODAL_IDS.closeBtnId,
          closeHandler: DOCUMENTS_JUMP_MODAL_IDS.closeHandler,
          currentPage: documentsCurrentPage,
          totalPages: totalPages,
          bodyClass: 'records-page-jump-open',
          onSelectPage: function (page) {
            jumpToDocumentsPage(page);
          },
        });
      }

      function initDocumentsPageJumpModal() {
        if (typeof ListPagination !== 'undefined' && ListPagination.initJumpModal) {
          ListPagination.initJumpModal(DOCUMENTS_JUMP_MODAL_IDS);
        }
      }

      function changeDocumentsPage(direction) {
        if (!allDocuments.length) return;
        const { totalPages } = getDocumentsPaginationTotals();
        let nextPage;
        if (direction === 'first') {
          nextPage = 1;
        } else if (direction === 'last') {
          nextPage = totalPages;
        } else {
          nextPage = Math.min(totalPages, Math.max(1, documentsCurrentPage + direction));
        }
        if (nextPage === documentsCurrentPage) return;
        documentsCurrentPage = nextPage;
        renderDocumentsList(allDocuments, { scrollToTop: true });
      }

      function changeDocumentsPageSize(rawSize) {
        const size = parseInt(rawSize, 10);
        if (!DOCUMENTS_PAGE_SIZE_OPTIONS.includes(size) || size === documentsPageSize) return;
        documentsPageSize = size;
        try { localStorage.setItem(DOCUMENTS_PAGE_SIZE_STORAGE_KEY, String(size)); } catch (_) {}
        if (!allDocuments.length) return;
        const { totalPages } = getDocumentsPaginationTotals();
        clampDocumentsCurrentPage(totalPages);
        renderDocumentsList(allDocuments, { scrollToTop: true });
      }

      function jumpToDocumentsPage(rawPage) {
        if (!allDocuments.length) return;
        const { totalPages, totalItems } = getDocumentsPaginationTotals();
        let page = parseInt(rawPage, 10);
        if (isNaN(page)) page = documentsCurrentPage;
        page = Math.min(totalPages, Math.max(1, page));
        if (page === documentsCurrentPage) {
          renderDocumentsPaginationControls(totalPages, totalItems);
          return;
        }
        documentsCurrentPage = page;
        renderDocumentsList(allDocuments, { scrollToTop: true });
      }

      window.changeDocumentsPage = changeDocumentsPage;
      window.changeDocumentsPageSize = changeDocumentsPageSize;
      window.jumpToDocumentsPage = jumpToDocumentsPage;
      window.openDocumentsPageJumpModal = openDocumentsPageJumpModal;
      window.closeDocumentsPageJumpModal = closeDocumentsPageJumpModal;
      initDocumentsPageJumpModal();

      try {
        if (plateInput && typeof window !== 'undefined' && window.localStorage) {
          const savedPlate = localStorage.getItem(DOCUMENTS_LAST_PLATE_KEY);
          if (savedPlate) {
            plateInput.value = savedPlate;
          }
        }
      } catch (_) {}

      function readCachedArchivalUnlocked() {
        try {
          const v = sessionStorage.getItem(DOCUMENTS_ARCHIVAL_CACHE_KEY);
          if (v === '1') return true;
          if (v === '0') return false;
        } catch (_) {}
        return null;
      }

      function writeCachedArchivalUnlocked(isActive) {
        try {
          sessionStorage.setItem(DOCUMENTS_ARCHIVAL_CACHE_KEY, isActive ? '1' : '0');
        } catch (_) {}
      }

      function getEffectiveTierForDocuments() {
        if (typeof window.getEffectiveSubscriptionTier === 'function') {
          return window.getEffectiveSubscriptionTier();
        }
        return 'free';
      }

      function isArchivalUnlockedForDocuments(subOptional) {
        const sub = subOptional || window.currentUserSubscription || {};
        if (typeof window.getArchivalEntitlement === 'function') {
          return !!window.getArchivalEntitlement(sub).hasActiveArchival;
        }
        if (typeof window.isArchivalUnlocked === 'function') {
          return window.isArchivalUnlocked(sub);
        }
        return sub.archivalActive === true;
      }

      function buildDocumentsEntitlementContextFromState(usedOverride) {
        const sub = window.currentUserSubscription || {};
        const effectiveTier = getEffectiveTierForDocuments();
        const archivalUnlocked = isArchivalUnlockedForDocuments(sub);
        const used = typeof usedOverride === 'number'
          ? Math.max(0, usedOverride)
          : (documentsEntitlementCtx && typeof documentsEntitlementCtx.used === 'number'
            ? documentsEntitlementCtx.used
            : 0);
        return {
          ready: true,
          archivalUnlocked: archivalUnlocked,
          effectiveTier: effectiveTier,
          used: used,
          dailyLimit: DOCUMENTS_FREE_DAILY_LIMIT
        };
      }

      async function refreshDocumentsDailyUsageCount() {
        const uid = window.currentUser && window.currentUser.uid;
        if (!uid || typeof window.getDailyUsage !== 'function') {
          return documentsEntitlementCtx.used || 0;
        }
        try {
          const usage = await window.getDailyUsage(uid);
          const used = usage && typeof usage.documentUploads === 'number'
            ? usage.documentUploads
            : (usage && usage.documentUploads ? Number(usage.documentUploads) : 0);
          return Math.max(0, used || 0);
        } catch (_) {
          return documentsEntitlementCtx.used || 0;
        }
      }

      async function loadDocumentsEntitlementOnce(forceRefresh) {
        const uid = window.currentUser && window.currentUser.uid;
        if (!uid) {
          documentsEntitlementCtx = {
            ready: false,
            archivalUnlocked: false,
            effectiveTier: 'free',
            used: 0,
            dailyLimit: DOCUMENTS_FREE_DAILY_LIMIT
          };
          return documentsEntitlementCtx;
        }

        if (documentsEntitlementCtx.ready && !forceRefresh) {
          return documentsEntitlementCtx;
        }

        if (isLoadingDocumentsEntitlement && documentsEntitlementLoadPromise) {
          return documentsEntitlementLoadPromise;
        }

        isLoadingDocumentsEntitlement = true;
        documentsEntitlementLoadPromise = (async function () {
          try {
            window.__gurigoSuppressDocumentsViewRefresh = true;
            try {
              if (typeof loadUserSubscription === 'function') {
                await loadUserSubscription(uid, { refreshDocuments: false });
              }
            } catch (_) {}

            try {
              if (typeof hydrateSubscriptionBillingMirror === 'function') {
                const sub = window.currentUserSubscription || {};
                if (!sub.__billingMirrorHydrated) {
                  await hydrateSubscriptionBillingMirror(uid);
                }
              }
            } catch (_) {}

            const effectiveTier = getEffectiveTierForDocuments();
            const archivalUnlocked = isArchivalUnlockedForDocuments(window.currentUserSubscription || {});
            writeCachedArchivalUnlocked(archivalUnlocked);

            let used = 0;
            if (effectiveTier === 'free' && !archivalUnlocked) {
              used = await refreshDocumentsDailyUsageCount();
            }

            documentsEntitlementCtx = {
              ready: true,
              archivalUnlocked: archivalUnlocked,
              effectiveTier: effectiveTier,
              used: used,
              dailyLimit: DOCUMENTS_FREE_DAILY_LIMIT
            };
            return documentsEntitlementCtx;
          } finally {
            isLoadingDocumentsEntitlement = false;
            window.__gurigoSuppressDocumentsViewRefresh = false;
            documentsEntitlementLoadPromise = null;
          }
        })();

        return documentsEntitlementLoadPromise;
      }

      function buildArchivalQuotaBannerHtml(i18n) {
        const title = i18n.documentsArchivalQuotaTitle || '📦 Archiválási csomag aktív';
        const body = i18n.documentsArchivalQuotaBody || 'Dokumentum feltöltés: <strong>Korlátlan</strong>, megőrzés: archiválás lejárata + 7 nap.';
        return '<div class="font-semibold text-gray-900 dark:text-gray-100">' + escapeHtml(title) + '</div>' +
          '<div class="mt-1 text-sm text-gray-700 dark:text-gray-300">' + body + '</div>';
      }

      function buildFreeQuotaBannerHtml(i18n, used, limit) {
        const freeLimitLabel = i18n.documentFreeLimitLabel || '🆓 Free napi limit';
        const uploadTodayLabel = i18n.documentUploadTodayLabel || 'Dokumentum feltöltés ma:';
        const proUnlimitedHint = i18n.documentArchivalUnlimitedHint || 'Archiválási csomaggal korlátlan feltöltés, dokumentumok az archiválás + 7 napig megmaradnak.';
        return '<div class="font-semibold text-gray-900 dark:text-gray-100">' + escapeHtml(freeLimitLabel) + '</div>' +
          '<div class="mt-1 text-sm text-gray-700 dark:text-gray-300">' + escapeHtml(uploadTodayLabel) + ' <strong>' + String(Math.max(0, used || 0)) + ' / ' + String(limit) + '</strong></div>' +
          '<div class="mt-1 text-xs text-gray-600 dark:text-gray-400">' + escapeHtml(proUnlimitedHint) + '</div>';
      }

      function renderDocumentsQuotaBanner() {
        if (isRenderingDocumentsQuotaBanner) return;
        isRenderingDocumentsQuotaBanner = true;
        try {
          if (!quotaBanner) return;
          if (!window.currentUser || !window.currentUser.uid) {
            quotaBanner.classList.add('hidden');
            quotaBanner.innerHTML = '';
            return;
          }

          const i18n = getDocumentsI18n();
          const checkingLabel = i18n.documentsQuotaChecking || 'Előfizetés ellenőrzése…';
          const cachedArchival = readCachedArchivalUnlocked();

          if (!documentsEntitlementCtx.ready) {
            quotaBanner.classList.remove('hidden');
            if (cachedArchival === true) {
              quotaBanner.innerHTML = buildArchivalQuotaBannerHtml(i18n);
            } else {
              quotaBanner.innerHTML = '<div class="text-sm text-gray-600 dark:text-gray-400 animate-pulse">' + escapeHtml(checkingLabel) + '</div>';
            }
            return;
          }

          const ctx = documentsEntitlementCtx;
          if (ctx.effectiveTier !== 'free') {
            quotaBanner.classList.add('hidden');
            quotaBanner.innerHTML = '';
            return;
          }

          if (ctx.archivalUnlocked) {
            quotaBanner.classList.remove('hidden');
            quotaBanner.innerHTML = buildArchivalQuotaBannerHtml(i18n);
            return;
          }

          quotaBanner.classList.remove('hidden');
          quotaBanner.innerHTML = buildFreeQuotaBannerHtml(i18n, ctx.used, ctx.dailyLimit);
        } catch (_) {} finally {
          isRenderingDocumentsQuotaBanner = false;
        }
      }

      function formatHumanFileSize(sizeInBytes) {
        if (!sizeInBytes || sizeInBytes <= 0) return '0 B';
        const kb = sizeInBytes / 1024;
        if (kb < 1024) return kb.toFixed(kb < 10 ? 1 : 0) + ' KB';
        const mb = kb / 1024;
        return mb.toFixed(mb < 10 ? 1 : 0) + ' MB';
      }

      function getPendingFileTypeLabel(file) {
        if (!file) return '';
        const contentType = file.type ? String(file.type) : '';
        if (contentType.indexOf('pdf') !== -1) return 'PDF';
        if (contentType.indexOf('png') !== -1) return 'PNG';
        if (contentType.indexOf('jpeg') !== -1 || contentType.indexOf('jpg') !== -1) return 'JPG';
        if (contentType.indexOf('image') !== -1) return 'IMG';
        const name = file.name || '';
        const dot = name.lastIndexOf('.');
        if (dot >= 0 && dot < name.length - 1) {
          return name.slice(dot + 1).toUpperCase();
        }
        return contentType || '—';
      }

      function clearDocumentFileInputs() {
        try { if (fileInput) fileInput.value = ''; } catch (_) {}
        try { if (cameraInput) cameraInput.value = ''; } catch (_) {}
      }

      function updateSaveButtonState() {
        const hasValid = Array.isArray(pendingDocumentFiles) && pendingDocumentFiles.length > 0;
        const ctx = documentsEntitlementCtx || {};
        const overFreeLimit =
          hasValid &&
          ctx.ready &&
          ctx.effectiveTier === 'free' &&
          !ctx.archivalUnlocked &&
          (ctx.used + pendingDocumentFiles.length > (ctx.dailyLimit || DOCUMENTS_FREE_DAILY_LIMIT));
        const enabled = hasValid && !overFreeLimit;
        if (saveBtn) {
          saveBtn.disabled = !enabled;
          saveBtn.classList.toggle('opacity-50', !enabled);
          saveBtn.classList.toggle('cursor-not-allowed', !enabled);
        }
      }

      function removePendingDocumentFile(index) {
        if (!Array.isArray(pendingDocumentFiles)) return;
        pendingDocumentFiles.splice(index, 1);
        if (!pendingDocumentFiles.length) {
          clearDocumentFileInputs();
        }
        renderPendingFilesPanel();
      }

      function renderPendingFilesPanel() {
        const files = Array.isArray(pendingDocumentFiles) ? pendingDocumentFiles : [];
        const count = files.length;
        const i18n = getDocumentsI18n();

        if (selectedFilesInfo) {
          selectedFilesInfo.classList.add('hidden');
          selectedFilesInfo.textContent = '';
        }

        if (!pendingFilesWrap || !pendingFilesList) {
          if (selectedFilesInfo) {
            selectedFilesInfo.classList.remove('hidden');
            if (!count) {
              selectedFilesInfo.textContent = i18n.documents_selected_files_info_none || 'Nincs kiválasztott fájl.';
            } else {
              const tpl = i18n.documents_selected_files_info_some || '%COUNT% fájl kiválasztva.';
              selectedFilesInfo.textContent = tpl.replace('%COUNT%', String(count));
            }
          }
          updateSaveButtonState();
          return;
        }

        if (!count) {
          pendingFilesWrap.classList.add('hidden');
          pendingFilesList.innerHTML = '';
          if (pendingFilesSummary) pendingFilesSummary.textContent = '';
          if (pendingFilesLimitWarning) {
            pendingFilesLimitWarning.classList.add('hidden');
            pendingFilesLimitWarning.textContent = '';
          }
          updateSaveButtonState();
          return;
        }

        let totalBytes = 0;
        const removeLabel = i18n.documentsPendingFileRemove || 'Eltávolítás';
        let listHtml = '';

        files.forEach(function(file, idx) {
          if (!file) return;
          const size = file.size || 0;
          totalBytes += size;
          const name = file.name || ('file-' + String(idx + 1));
          const typeLabel = getPendingFileTypeLabel(file);
          listHtml +=
            '<li class="flex items-start gap-2 py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">' +
              '<div class="flex-1 min-w-0">' +
                '<p class="text-sm font-medium text-gray-900 dark:text-gray-100 break-words" style="overflow-wrap:anywhere;word-break:break-word;">' + escapeHtml(name) + '</p>' +
                '<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">' +
                  escapeHtml(formatHumanFileSize(size)) + ' · ' + escapeHtml(typeLabel) +
                '</p>' +
              '</div>' +
              '<button type="button" class="documents-pending-file-remove shrink-0 px-2 py-1 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition" data-pending-index="' + String(idx) + '">' +
                escapeHtml(removeLabel) +
              '</button>' +
            '</li>';
        });

        pendingFilesWrap.classList.remove('hidden');
        pendingFilesList.innerHTML = listHtml;

        const summaryTpl = i18n.documentsPendingFilesSummary || '%COUNT% fájl · összesen %SIZE%';
        if (pendingFilesSummary) {
          pendingFilesSummary.textContent = summaryTpl
            .replace('%COUNT%', String(count))
            .replace('%SIZE%', formatHumanFileSize(totalBytes));
        }

        const ctx = documentsEntitlementCtx || {};
        const showLimitWarning =
          ctx.ready &&
          ctx.effectiveTier === 'free' &&
          !ctx.archivalUnlocked &&
          (ctx.used + count > (ctx.dailyLimit || DOCUMENTS_FREE_DAILY_LIMIT));

        if (pendingFilesLimitWarning) {
          if (showLimitWarning) {
            const warnTpl = i18n.documentsPendingLimitWarning ||
              'A kiválasztott fájlok száma meghaladja a Free napi limitet (%USED%/%LIMIT% már feltöltve).';
            pendingFilesLimitWarning.textContent = warnTpl
              .replace('%USED%', String(ctx.used || 0))
              .replace('%LIMIT%', String(ctx.dailyLimit || DOCUMENTS_FREE_DAILY_LIMIT))
              .replace('%SELECTED%', String(count));
            pendingFilesLimitWarning.classList.remove('hidden');
          } else {
            pendingFilesLimitWarning.classList.add('hidden');
            pendingFilesLimitWarning.textContent = '';
          }
        }

        const removeButtons = pendingFilesList.querySelectorAll('.documents-pending-file-remove');
        Array.prototype.forEach.call(removeButtons, function(btn) {
          btn.addEventListener('click', function(e) {
            e.preventDefault();
            const raw = btn.getAttribute('data-pending-index');
            const index = parseInt(raw, 10);
            if (!isNaN(index)) removePendingDocumentFile(index);
          });
        });

        updateSaveButtonState();
      }

      function updateSelectedFilesInfo(count) {
        renderPendingFilesPanel();
      }

      function getTodayIso() {
        try {
          const today = new Date();
          return today.toISOString().split('T')[0];
        } catch (_) {
          return '';
        }
      }

      function ensureDateSet() {
        if (!dateInput.value) {
          const iso = getTodayIso();
          if (iso) {
            dateInput.value = iso;
          }
        }
      }

      function getSelectedDateIso() {
        if (dateInput && dateInput.value) {
          return dateInput.value;
        }
        const iso = getTodayIso();
        if (iso && dateInput) {
          dateInput.value = iso;
        }
        return iso;
      }

      function escapeHtml(str) {
        if (!str) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function getIconForDocument(meta) {
        const name = (meta && meta.originalName) || meta.fileName || '';
        const contentType = meta && meta.contentType ? String(meta.contentType) : '';
        if (contentType.indexOf('pdf') !== -1 || name.toLowerCase().endsWith('.pdf')) return '📄';
        if (contentType.indexOf('image') !== -1 || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(name)) return '🧾';
        return '📎';
      }

      function getTypeBadge(meta) {
        const type = (meta && meta.type) || 'Dokumentum';
        
        // Találjuk meg a típus indexét a színhez
        const allTypes = typeof getDocumentTypes === 'function' ? getDocumentTypes() : ['Dokumentum'];
        const typeIndex = allTypes.findIndex(t => t === type);
        const idx = typeIndex >= 0 ? typeIndex : 0;
        
        // Ugyanazok a színek, mint a gomboknál
        const color = getTypeColor(type, idx);
        
        const style = 'display: inline-flex; align-items: center; padding: 0.125rem 0.5rem; border-radius: 9999px; font-weight: 600; font-size: 0.75rem; background-color: ' + color.bg + '; color: ' + color.text + ';';
        
        return {
          label: type,
          classes: '',
          style: style
        };
      }

      function formatFileSize(sizeInBytes) {
        if (!sizeInBytes || sizeInBytes <= 0) return '';
        const kb = sizeInBytes / 1024;
        if (kb < 1024) return kb.toFixed(0) + ' KB';
        const mb = kb / 1024;
        return mb.toFixed(1) + ' MB';
      }

      // Thumbnail betöltés Firebase Storage-ból
      async function loadThumbnail(card, thumbnailPath, fallbackIcon) {
        try {
          if (typeof window.ensureFirebaseStorage === 'function' && !(window.storage || (firebase && firebase.storage))) {
            try { await window.ensureFirebaseStorage(); } catch (_) { return; }
          }
          if (typeof firebase === 'undefined' || !firebase.storage) return;
          const container = card.querySelector('.document-thumbnail-container');
          if (!container) return;
          
          const storageRef = firebase.storage().ref();
          const thumbnailRef = storageRef.child(thumbnailPath);
          
          // Próbáljuk meg lekérni a thumbnail URL-t
          const url = await thumbnailRef.getDownloadURL();
          
          // Ha sikerült, cseréljük le az ikont képpel
          container.innerHTML = '<img src="' + url + '" alt="Thumbnail" class="w-full h-full object-cover" style="border-radius: 0.5rem;" />';
        } catch (err) {
          // Ha nincs thumbnail (még nem generálódott vagy hiba), megtartjuk az ikont
          // Nem kell semmi, az ikon már benne van a HTML-ben
          try { console.log('[Documents] Thumbnail not available yet for:', thumbnailPath); } catch(_) {}
        }
      }

      function renderDocumentsList(docs, options) {
        if (!listContainer) return;
        listContainer.innerHTML = '';
        allDocuments = Array.isArray(docs) ? docs : [];
        const hasDocs = allDocuments.length > 0;
        
        if (emptyStateCard) {
          if (hasDocs) {
            emptyStateCard.classList.add('hidden');
          } else {
            emptyStateCard.classList.remove('hidden');
          }
        }
        
        if (!hasDocs) {
          if (selectAllBtn) selectAllBtn.classList.add('hidden');
          if (deleteSelectedBtn) deleteSelectedBtn.classList.add('hidden');
          documentsCurrentPage = 1;
          renderDocumentsPaginationControls(1, 0);
          return;
        }
        
        const { totalPages, totalItems } = getDocumentsPaginationTotals();
        clampDocumentsCurrentPage(totalPages);

        const startIdx = (documentsCurrentPage - 1) * documentsPageSize;
        const endIdx = startIdx + documentsPageSize;
        const pageDocuments = allDocuments.slice(startIdx, endIdx);
        
        if (selectAllBtn) selectAllBtn.classList.remove('hidden');
        // A törlés gomb láthatóságát az updateBulkDeleteUI() kezeli
        
        const i18n = getDocumentsI18n();
        pageDocuments.forEach(function(doc) {
          const meta = doc && doc.data ? doc.data : doc;
          const id = doc && doc.id ? doc.id : meta.id;
          if (!id || !meta) return;
          const icon = getIconForDocument(meta);
          const badge = getTypeBadge(meta);
          const dateStr = meta.date || '';
          const fileName = meta.originalName || meta.fileName || '';
          const sizeStr = formatFileSize(meta.size || meta.fileSize || 0);
          
          // Thumbnail kezelés - Firebase Resize Images extension
          const storagePath = meta.storagePath || '';
          const mimeType = meta.mimeType || meta.contentType || '';
          const isImage = mimeType.startsWith('image/');
          let thumbnailPath = null;
          if (isImage && storagePath) {
            // A Resize Images extension _200x200 suffixet ad hozzá ÉS jpeg-re konvertál
            const lastDot = storagePath.lastIndexOf('.');
            if (lastDot > -1) {
              // Kiterjesztés eltávolítása és _200x200.jpeg hozzáadása
              thumbnailPath = storagePath.substring(0, lastDot) + '_200x200.jpeg';
            }
          }

          var rawPlate = (typeof meta.licensePlate !== 'undefined' && meta.licensePlate !== null)
            ? meta.licensePlate
            : (typeof meta.plate !== 'undefined' && meta.plate !== null ? meta.plate : '');
          var plateStr = '';
          if (typeof rawPlate === 'string') {
            plateStr = rawPlate.trim();
          } else if (rawPlate) {
            plateStr = String(rawPlate);
          }

          var rawNote = (typeof meta.note !== 'undefined' && meta.note !== null) ? meta.note : '';
          var noteStr = '';
          if (typeof rawNote === 'string') {
            noteStr = rawNote.trim();
          } else if (rawNote) {
            noteStr = String(rawNote);
          }

          // Vertikális elrendezés: dátum, típus, rendszám (méret nélkül)
          let dateHtml = '<p class="text-xs text-gray-500 dark:text-gray-400 mb-1">' + escapeHtml(dateStr) + '</p>';
          let badgeHtml = '<div class="mb-1"><span style="' + badge.style + '">' + escapeHtml(badge.label) + '</span></div>';
          let plateHtml = '';
          if (plateStr) {
            plateHtml = '<p class="text-xs text-gray-500 dark:text-gray-400">' + escapeHtml(plateStr) + '</p>';
          }

          let noteHtml = '';
          if (noteStr) {
            const notePrefix = i18n.documents_note_prefix || 'Megjegyzés:';
            noteHtml = '<p class="mt-2 text-xs text-gray-600 dark:text-gray-300">' + escapeHtml(notePrefix) + ' ' + escapeHtml(noteStr) + '</p>';
          }

          // Megőrzés / törlés UI — provider-független archiválás entitlement (legacy expiresAt nem dönt aktív archiválásnál)
          let expiresHtml = '';
          try {
            const retentionUi = typeof window.getDocumentRetentionUi === 'function'
              ? window.getDocumentRetentionUi({ data: meta, meta: meta })
              : null;
            if (retentionUi && retentionUi.text) {
              let retentionClass = 'text-gray-500 dark:text-gray-400';
              let retentionIcon = '📦';
              if (retentionUi.type === 'protected') {
                retentionClass = 'text-emerald-700 dark:text-emerald-400';
                retentionIcon = '🛡️';
              } else if (retentionUi.type === 'grace') {
                retentionClass = 'text-blue-700 dark:text-blue-400';
                retentionIcon = '⏳';
              } else if (retentionUi.type === 'free') {
                retentionClass = retentionUi.expiryClass || retentionClass;
                retentionIcon = retentionUi.expiryIcon || '📅';
              }
              expiresHtml =
                '<p class="text-xs italic ' + retentionClass + ' mt-1">' +
                retentionIcon + ' ' + escapeHtml(retentionUi.text) +
                '</p>';
            }
          } catch (retentionUiError) {
            console.warn('[Documents] retention UI error:', retentionUiError);
          }

          const card = document.createElement('div');
          card.className = 'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3 shadow-sm hover:shadow-md transition-shadow';
          const isChecked = selectedDocumentIds.has(id);
          
          // Thumbnail vagy ikon placeholder - eredeti méret
          let previewHtml = '';
          if (thumbnailPath) {
            previewHtml = '<div class="w-14 h-14 rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center document-thumbnail-container shadow-inner" data-thumbnail-path="' + escapeHtml(thumbnailPath) + '" data-doc-id="' + escapeHtml(String(id)) + '">' +
              '<div class="text-gray-400 text-xl">' + icon + '</div>' +
            '</div>';
          } else {
            previewHtml = '<div class="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-400 text-xl shadow-inner">' + icon + '</div>';
          }
          
          card.innerHTML =
            '<div class="flex items-start gap-3">' +
              '<div class="flex items-center pt-1">' +
                '<input type="checkbox" class="document-checkbox cursor-pointer" data-doc-id="' + escapeHtml(String(id)) + '" ' + (isChecked ? 'checked' : '') + ' style="width: 18px; height: 18px; min-width: 18px; min-height: 18px; border: 2px solid #9ca3af; border-radius: 4px; background-color: white; cursor: pointer; appearance: auto; -webkit-appearance: checkbox; -moz-appearance: checkbox;" />' +
              '</div>' +
              previewHtml +
              '<div class="flex-1 min-w-0">' +
                '<p class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 leading-tight break-words" style="overflow-wrap:anywhere; word-break:break-word;">' + escapeHtml(fileName) + '</p>' +
                dateHtml +
                badgeHtml +
                plateHtml +
                noteHtml +
                expiresHtml +
                '<div class="flex flex-col sm:flex-row gap-2 mt-3">' +
                  '<button class="w-full sm:flex-1 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 transition" data-doc-action="open">' +
                    '<span data-translate-key="documentsOpenButton">' + (i18n.documentsOpenButton || 'Megnyitás') + '</span>' +
                  '</button>' +
                  '<button class="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-medium text-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition" data-doc-action="delete">' +
                    '<span data-translate-key="documentsDeleteButton">' + (i18n.documentsDeleteButton || 'Törlés') + '</span>' +
                  '</button>' +
                '</div>' +
              '</div>' +
            '</div>';

          const openBtn = card.querySelector('[data-doc-action="open"]');
          const deleteBtn = card.querySelector('[data-doc-action="delete"]');

          if (openBtn) {
            openBtn.addEventListener('click', function() {
              try {
                openDocument({ id: id, meta: meta });
              } catch (_) {}
            });
          }

          if (deleteBtn) {
            deleteBtn.addEventListener('click', function() {
              try {
                deleteDocument({ id: id, meta: meta });
              } catch (_) {}
            });
          }

          const checkbox = card.querySelector('.document-checkbox');
          if (checkbox) {
            checkbox.addEventListener('change', function() {
              try {
                const docId = this.getAttribute('data-doc-id');
                if (this.checked) {
                  selectedDocumentIds.add(docId);
                } else {
                  selectedDocumentIds.delete(docId);
                }
                updateBulkDeleteUI();
              } catch (_) {}
            });
          }

          listContainer.appendChild(card);
          
          // Thumbnail betöltés aszinkron (ha van)
          if (thumbnailPath) {
            loadThumbnail(card, thumbnailPath, icon);
          }
        });
        
        // Frissítjük a törlés gomb láthatóságát a kijelölések alapján
        updateBulkDeleteUI();
        renderDocumentsPaginationControls(totalPages, totalItems);

        if (options && options.scrollToTop) {
          requestAnimationFrame(scrollDocumentsListToTop);
        }
      }

      function updateBulkDeleteUI() {
        const count = selectedDocumentIds.size;
        if (deleteSelectedBtn) {
          if (count > 0) {
            deleteSelectedBtn.textContent = `Kijelöltek törlése (${count})`;
            deleteSelectedBtn.classList.remove('hidden');
          } else {
            deleteSelectedBtn.classList.add('hidden');
          }
        }
      }

      async function loadDocumentsListForCurrentDate() {
        try {
          if (typeof db === 'undefined' || !window.currentUser) {
            renderDocumentsList([]);
            return;
          }
          const uid = window.currentUser && window.currentUser.uid;
          if (!uid) {
            renderDocumentsList([]);
            return;
          }

          let docs = [];
          if (typeof DocumentsDataService !== 'undefined' && DocumentsDataService.loadActiveDocumentsWindow) {
            await DocumentsDataService.loadActiveDocumentsWindow(uid);
            docs = DocumentsDataService.getDocumentsForListDisplay();
          } else {
            const colRef = db.collection('users').doc(uid).collection('documents');
            const snap = await colRef.orderBy('date', 'desc').orderBy('createdAt', 'desc').get();
            docs = snap.docs.map(function (d) {
              return { id: d.id, data: d.data() };
            });
          }

          allDocumentsRaw = docs;

          if (typeFilter && typeFilter.value && typeFilter.value !== 'all') {
            const selectedType = typeFilter.value;
            docs = docs.filter(function (d) {
              var dt = d.data && d.data.type ? d.data.type : (d.data ? d.data.type : null);
              return dt === selectedType;
            });
          }

          renderDocumentsList(docs);
          renderDocumentsOlderLoadUi();
        } catch (e) {
          try {
            console.warn('[Documents] loadDocumentsForCurrentDate error:', e);
            const i18n = getDocumentsI18n();
            if (typeof showCustomAlert === 'function') {
              const msg = i18n.alertDataLoadError || 'Hiba az adatok betöltésekor.';
              showCustomAlert(msg, 'info');
            }
          } catch (_) {}
          renderDocumentsList([]);
          renderDocumentsOlderLoadUi();
        }
      }

      function renderDocumentsOlderLoadUi() {
        const slot = document.getElementById('documents-older-load-slot');
        if (!slot) return;
        const i18n = getDocumentsI18n();
        if (typeof DocumentsDataService === 'undefined') {
          slot.classList.add('hidden');
          slot.innerHTML = '';
          return;
        }
        const hasMore = DocumentsDataService.hasOlderDocuments();
        const loading = DocumentsDataService.isOlderDocumentsLoading();
        if (!hasMore) {
          slot.innerHTML = '';
          slot.classList.add('hidden');
          return;
        }
        slot.classList.remove('hidden');
        slot.innerHTML = '<button type="button" id="documents-load-older-btn" class="w-full py-2.5 px-4 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-semibold disabled:opacity-50"' + (loading ? ' disabled' : '') + '>'
          + (loading ? (i18n.loading || 'Betöltés...') : (i18n.documentsLoadOlder || 'Régebbi dokumentumok betöltése'))
          + '</button>';
        const btn = document.getElementById('documents-load-older-btn');
        if (btn && !loading) {
          btn.onclick = async function () {
            btn.disabled = true;
            btn.textContent = i18n.loading || 'Betöltés...';
            try {
              const uid = window.currentUser && window.currentUser.uid;
              if (uid) await DocumentsDataService.loadOlderDocumentsPage(uid);
              await loadDocumentsListForCurrentDate();
            } catch (_) {
              renderDocumentsOlderLoadUi();
            }
          };
        }
      }

      async function loadDocumentsForCurrentDate() {
        try { renderDocumentsQuotaBanner(); } catch (_) {}
        return loadDocumentsListForCurrentDate();
      }

      async function saveDocumentMetaFromPending(uid, docId, storagePath, file, iso, docType, plateValue, noteValue, downloadURL) {
        var colRef = db.collection('users').doc(uid).collection('documents');
        var docRef = colRef.doc(docId);
        var now = new Date();
        var expiresAt = (typeof calculateDocumentExpiry === 'function')
          ? calculateDocumentExpiry(now)
          : new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000);
        var meta = {
          userId: uid,
          date: iso,
          type: docType,
          fileName: file.name,
          originalName: file.name,
          contentType: file.type || null,
          mimeType: file.type || null,
          size: file.size || null,
          storagePath: storagePath,
          downloadURL: downloadURL || null,
          licensePlate: plateValue || null,
          note: noteValue || null,
          uploadedAt: (firebase && firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.serverTimestamp)
            ? firebase.firestore.FieldValue.serverTimestamp()
            : new Date().toISOString(),
          createdAt: (firebase && firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.serverTimestamp)
            ? firebase.firestore.FieldValue.serverTimestamp()
            : new Date().toISOString()
        };
        if (expiresAt) {
          meta.expiresAt = expiresAt;
        } else if (firebase && firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.delete) {
          meta.expiresAt = firebase.firestore.FieldValue.delete();
        }
        await docRef.set(meta, { merge: true });
        return true;
      }

      async function uploadFileAndSaveMeta(file, uid, iso, docType, plateValue, noteValue, onProgress) {
        try {
          const colRef = db.collection('users').doc(uid).collection('documents');
          const docRef = colRef.doc();
          const docId = docRef.id;
          const storagePath = 'users/' + uid + '/documents/' + docId + '/' + file.name;
          const storageRef = storage.ref().child(storagePath);

          const uploadTask = storageRef.put(file);

          uploadTask.on('state_changed', function(snapshot) {
            try {
              if (!snapshot || !snapshot.totalBytes) return;
              if (typeof onProgress === 'function') {
                onProgress(snapshot, file);
              }
            } catch (_) {}
          });

          const snapshot = await uploadTask;
          let downloadURL = null;
          try {
            downloadURL = await snapshot.ref.getDownloadURL();
          } catch (_) {}

          await saveDocumentMetaFromPending(uid, docId, storagePath, file, iso, docType, plateValue, noteValue, downloadURL);
          return true;
        } catch (e) {
          try { console.error('[Documents] uploadFileAndSaveMeta error:', e); } catch (_) {}
          return false;
        }
      }

      window.uploadPendingDocumentItem = async function (item) {
        if (!item || !item.uid) return false;
        var uid = item.uid;
        var iso = item.date;
        var docType = item.type || 'other';
        var plateValue = item.licensePlate || '';
        var noteValue = item.note || '';
        var file = null;
        if (item.blob instanceof File) {
          file = item.blob;
        } else if (item.blob instanceof Blob) {
          file = new File([item.blob], item.fileName || 'document', { type: item.mimeType || 'application/octet-stream' });
        }
        var docId = item.docId || null;
        var storagePath = item.storagePath || null;
        var downloadURL = item.downloadURL || null;
        var uploadedPendingMeta = item.syncStatus === 'uploadedPendingMeta';

        try {
          if (!uploadedPendingMeta) {
            if (!file) return false;
            if (!docId) {
              docId = db.collection('users').doc(uid).collection('documents').doc().id;
            }
            if (!storagePath) {
              storagePath = 'users/' + uid + '/documents/' + docId + '/' + (item.fileName || file.name);
            }
            var storageRef = storage.ref().child(storagePath);
            var uploadSnap = await storageRef.put(file);
            try {
              downloadURL = await uploadSnap.ref.getDownloadURL();
            } catch (_) {}
            if (typeof window.updatePendingDocument === 'function') {
              await window.updatePendingDocument(item.id, {
                docId: docId,
                storagePath: storagePath,
                downloadURL: downloadURL,
                syncStatus: 'uploadedPendingMeta'
              });
            }
          } else if (!file && item.fileName) {
            file = { name: item.fileName, type: item.mimeType || null, size: item.size || null };
          }

          if (!docId || !storagePath || !file) {
            throw new Error('pending document missing upload metadata');
          }

          await saveDocumentMetaFromPending(uid, docId, storagePath, file, iso, docType, plateValue, noteValue, downloadURL);
          return true;
        } catch (e) {
          try { console.error('[Documents] uploadPendingDocumentItem error:', e); } catch (_) {}
          if (storagePath && docId && typeof window.updatePendingDocument === 'function') {
            try {
              await window.updatePendingDocument(item.id, {
                docId: docId,
                storagePath: storagePath,
                downloadURL: downloadURL,
                syncStatus: 'uploadedPendingMeta',
                lastMetaError: e && e.message ? e.message : String(e)
              });
            } catch (_) {}
          }
          return false;
        }
      };

      async function handleSaveDocuments() {
        const i18n = getDocumentsI18n();
        try {
          const files = Array.isArray(pendingDocumentFiles) ? pendingDocumentFiles.slice() : [];
          if (!files.length) {
            if (typeof showCustomAlert === 'function') {
              const noFilesMsg = i18n.documents_error_no_files || 'Először válassz ki legalább egy fájlt.';
              showCustomAlert(noFilesMsg, 'info');
            }
            return;
          }

          if (typeof db === 'undefined' || typeof storage === 'undefined' || !window.currentUser) {
            if (typeof showCustomAlert === 'function') {
              const msg = i18n.documentsLoginRequired || 'A dokumentumok feltöltéséhez be kell jelentkezned.';
              showCustomAlert(msg, 'info');
            }
            return;
          }

          const uid = window.currentUser && window.currentUser.uid;
          if (!uid) {
            return;
          }

          const iso = getSelectedDateIso();
          if (!iso) {
            if (typeof showCustomAlert === 'function') {
              const msg = i18n.documentsUploadDateRequired || 'Kérlek válaszd ki, melyik naphoz töltöd fel a dokumentumot.';
              showCustomAlert(msg, 'info');
            }
            return;
          }

          let docType = selectedDocumentType || 'other';

          const plateValue = plateInput && plateInput.value ? plateInput.value.trim() : '';
          const noteValue = noteInput && noteInput.value ? noteInput.value.trim() : '';

          if (plateValue && typeof window !== 'undefined' && window.localStorage) {
            try { localStorage.setItem(DOCUMENTS_LAST_PLATE_KEY, plateValue); } catch (_) {}
          }

          const validFiles = [];
          for (var i = 0; i < files.length; i++) {
            const f = files[i];
            if (!f) continue;
            if (f.size && DOCUMENTS_MAX_FILE_SIZE_BYTES && f.size > DOCUMENTS_MAX_FILE_SIZE_BYTES) {
              if (typeof showCustomAlert === 'function') {
                const errMsg = i18n.documents_error_file_too_large || 'A fájl túl nagy. Maximum 10 MB tölthető fel.';
                showCustomAlert(errMsg, 'info');
              }
              continue;
            }
            validFiles.push(f);
          }

          const totalFiles = validFiles.length;
          const totalBytesAll = validFiles.reduce(function(acc, f) {
            try { return acc + (f && f.size ? f.size : 0); } catch (_) { return acc; }
          }, 0);

          if (!totalFiles) {
            if (uploadProgressEl && uploadProgressFill) {
              uploadProgressEl.classList.add('hidden');
              uploadProgressFill.style.width = '0%';
            }
            if (uploadProgressText) {
              uploadProgressText.textContent = '';
            }
            pendingDocumentFiles = [];
            clearDocumentFileInputs();
            renderPendingFilesPanel();
            return;
          }

          if (!navigator.onLine) {
            if (typeof window.gateOfflineCreate === 'function' && !window.gateOfflineCreate('document')) {
              return;
            }
            for (var pf = 0; pf < validFiles.length; pf++) {
              var pfile = validFiles[pf];
              if (typeof window.savePendingDocument === 'function') {
                await window.savePendingDocument({
                  uid: uid,
                  date: iso,
                  type: docType,
                  licensePlate: plateValue || null,
                  note: noteValue || null,
                  fileName: pfile.name,
                  mimeType: pfile.type || null,
                  size: pfile.size || null,
                  blob: pfile,
                  syncStatus: 'pendingUpload'
                });
              }
            }
            pendingDocumentFiles = [];
            clearDocumentFileInputs();
            renderPendingFilesPanel();
            if (typeof window.updateConnectionStatus === 'function') window.updateConnectionStatus();
            if (typeof showCustomAlert === 'function') {
              showCustomAlert(i18n.offlineDocumentPendingNoticeText || i18n.savedOffline || 'A dokumentum feltöltésre vár.', 'info');
            }
            return;
          }

          try {
            const quotaCtx = documentsEntitlementCtx.ready
              ? documentsEntitlementCtx
              : await loadDocumentsEntitlementOnce(false);
            documentsEntitlementCtx = quotaCtx;
            if (quotaCtx.effectiveTier === 'free' && !quotaCtx.archivalUnlocked) {
              const dailyLimit = quotaCtx.dailyLimit || DOCUMENTS_FREE_DAILY_LIMIT;
              const amountToUpload = totalFiles;
              if (typeof window.tryConsumeDailyQuota === 'function') {
                const r = await window.tryConsumeDailyQuota(uid, 'documentUploads', amountToUpload, dailyLimit);
                if (!r || r.ok !== true) {
                  if (typeof showCustomAlert === 'function') {
                    const msg = (i18n.documents_daily_quota_reached || 'Elérted a napi dokumentum feltöltési limitet. (Free: 2/nap)');
                    showCustomAlert(msg, 'info');
                  }
                  return;
                }
              }
            }
          } catch (_) {}

          if (uploadBtn) {
            uploadBtn.disabled = true;
            uploadBtn.classList.add('opacity-50', 'cursor-not-allowed');
          }
          if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
          }

          const bar = ensureDocumentsUploadBar();
          if (bar) {
            try { bar.setStarting(); } catch (_) {}
          }

          if (uploadProgressEl) {
            try { uploadProgressEl.classList.add('hidden'); } catch (_) {}
          }

          let uploadController = {
            isUploading: false,
            index: 0,
            successCount: 0,
            bytesCompleted: 0,
            lastPercent: 0
          };

          const setUploadingState = function(overallPercent, uploadedCount) {
            if (bar) {
              try { bar.setUploading(overallPercent, uploadedCount, totalFiles); } catch (_) {}
            }
          };

          const finishSuccess = async function() {
            pendingDocumentFiles = [];
            clearDocumentFileInputs();
            renderPendingFilesPanel();

            if (bar) {
              try { bar.setSuccess(); } catch (_) {}
            }

            if (uploadController.successCount > 0) {
              if (documentsEntitlementCtx.ready && documentsEntitlementCtx.effectiveTier === 'free' && !documentsEntitlementCtx.archivalUnlocked) {
                try {
                  const used = await refreshDocumentsDailyUsageCount();
                  documentsEntitlementCtx = buildDocumentsEntitlementContextFromState(used);
                } catch (_) {}
              }
              try { renderDocumentsQuotaBanner(); } catch (_) {}
              await loadDocumentsListForCurrentDate();
              if (typeof hideCustomAlert === 'function') {
                try { hideCustomAlert(false); } catch (_) {}
              }
              if (typeof showCustomAlert === 'function') {
                const doneMsg = i18n.documents_upload_done || (uploadController.successCount > 1 ? 'Documents uploaded successfully.' : 'Document uploaded successfully.');
                showCustomAlert(doneMsg, 'success');
              }
            } else {
              if (typeof hideCustomAlert === 'function') {
                try { hideCustomAlert(false); } catch (_) {}
              }
              if (typeof showCustomAlert === 'function') {
                const errMsg2 = i18n.documentsUploadError || 'Nem sikerült a dokumentum(ok) feltöltése.';
                showCustomAlert(errMsg2, 'info');
              }
            }
          };

          const finishError = function() {
            if (bar) {
              try {
                bar.setError(function() {
                  try {
                    startUpload();
                  } catch (_) {}
                });
              } catch (_) {}
            }
          };

          const startUpload = async function() {
            if (uploadController.isUploading) return;
            uploadController.isUploading = true;
            if (uploadBtn) {
              uploadBtn.disabled = true;
              uploadBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
            if (saveBtn) {
              saveBtn.disabled = true;
              saveBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }

            try {
              for (var j = uploadController.index; j < validFiles.length; j++) {
                uploadController.index = j;
                const file = validFiles[j];
                const fileSize = file && file.size ? file.size : 0;
                const ok = await uploadFileAndSaveMeta(file, uid, iso, docType, plateValue, noteValue, function(snapshot) {
                  try {
                    const transferred = snapshot && snapshot.bytesTransferred ? snapshot.bytesTransferred : 0;
                    const total = snapshot && snapshot.totalBytes ? snapshot.totalBytes : 0;
                    const effectiveTransferred = total > 0 ? transferred : 0;
                    const overall = totalBytesAll > 0
                      ? ((uploadController.bytesCompleted + effectiveTransferred) / totalBytesAll) * 100
                      : (total > 0 ? (effectiveTransferred / total) * 100 : 0);
                    const p = Math.max(0, Math.min(100, Math.round(overall)));
                    uploadController.lastPercent = p;
                    setUploadingState(p, uploadController.successCount);
                  } catch (_) {}
                });

                if (!ok) {
                  uploadController.isUploading = false;
                  if (uploadBtn) {
                    uploadBtn.disabled = false;
                    uploadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                  }
                  if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                  }
                  finishError();
                  return;
                }

                uploadController.successCount++;
                uploadController.bytesCompleted += fileSize;
                const donePercent = totalBytesAll > 0
                  ? Math.round((uploadController.bytesCompleted / totalBytesAll) * 100)
                  : Math.round((uploadController.successCount / totalFiles) * 100);
                setUploadingState(donePercent, uploadController.successCount);
              }

              uploadController.index = validFiles.length;
              uploadController.isUploading = false;
              await finishSuccess();
            } catch (_) {
              uploadController.isUploading = false;
              if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
              }
              if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
              }
              finishError();
            }
          };

          await startUpload();
        } catch (e) {
          try {
            console.error('[Documents] handleSaveDocuments error:', e);
            if (typeof window.showDetailedError === 'function') {
              window.showDetailedError(e, 'Dokumentum feltöltés', { userFacing: true });
            } else if (typeof showCustomAlert === 'function') {
              const i18n2 = getDocumentsI18n();
              const msg = i18n2.documentsUploadError || 'Nem sikerült a dokumentum(ok) feltöltése.';
              showCustomAlert(msg, 'info');
            }
          } catch (_) {}
        } finally {
          if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          }
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          }
        }
      }

      async function handleFileSelected(event) {
        try {
          const input = event && event.target ? event.target : fileInput;
          if (!input || !input.files) {
            pendingDocumentFiles = [];
            updateSelectedFilesInfo(0);
            return;
          }

          const files = Array.prototype.slice.call(input.files);
          if (!files.length) {
            pendingDocumentFiles = [];
            updateSelectedFilesInfo(0);
            return;
          }

          pendingDocumentFiles = files;
          renderPendingFilesPanel();
        } catch (e) {
          try { console.error('[Documents] handleFileSelected error:', e); } catch (_) {}
        }
      }

      async function openDocument(payload) {
        try {
          const meta = payload && payload.meta ? payload.meta : {};
          const i18n = getDocumentsI18n();
          let url = meta.downloadURL || null;
          if (!url && meta.storagePath && typeof storage !== 'undefined') {
            try {
              url = await storage.ref(meta.storagePath).getDownloadURL();
            } catch (e) {
              console.warn('[Documents] getDownloadURL failed:', e);
            }
          }
          if (!url) {
            if (typeof showCustomAlert === 'function') {
              const msg = i18n.documentsOpenError || 'Nem sikerült megnyitni a dokumentumot.';
              showCustomAlert(msg, 'info');
            }
            return;
          }
          window.open(url, '_blank');
        } catch (e) {
          try {
            console.error('[Documents] openDocument error:', e);
          } catch (_) {}
        }
      }

      async function deleteDocument(payload) {
        const i18n = getDocumentsI18n();
        const meta = payload && payload.meta ? payload.meta : {};
        const id = payload && payload.id ? payload.id : null;
        if (!id) return;

        if (!navigator.onLine) {
          if (typeof window.showSyncedRecordReadOnlyAlert === 'function') {
            window.showSyncedRecordReadOnlyAlert();
          }
          return;
        }

        if (typeof window.currentUser === 'undefined' || typeof db === 'undefined') {
          return;
        }
        const uid = window.currentUser && window.currentUser.uid;
        if (!uid) return;

        const confirmText = i18n.alertConfirmDelete || 'Biztosan törölni szeretnéd?';
        const confirmButtonText = (i18n.delete || (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang] && translations[currentLang].delete) || 'Törlés');

        async function performDelete() {
          try {
            // Töröljük a teljes mappát a Storage-ból (eredeti fájl + thumbnail-ek)
            if (id && uid && typeof storage !== 'undefined') {
              try {
                const folderPath = 'users/' + uid + '/documents/' + id + '/';
                const folderRef = storage.ref(folderPath);
                
                // Listázzuk ki az összes fájlt a mappában
                const listResult = await folderRef.listAll();
                
                // Töröljük az összes fájlt
                const deletePromises = listResult.items.map(function(itemRef) {
                  return itemRef.delete().catch(function(e) {
                    try { console.warn('[Documents] Failed to delete file:', itemRef.fullPath, e); } catch (_) {}
                  });
                });
                
                await Promise.all(deletePromises);
              } catch (e) {
                try { console.warn('[Documents] storage folder delete failed:', e); } catch (_) {}
              }
            }

            await db.collection('users').doc(uid).collection('documents').doc(String(id)).delete();
            await loadDocumentsForCurrentDate();

            if (typeof showCustomAlert === 'function') {
              const msg = i18n.documentsDeleteSuccess || 'Dokumentum törölve.';
              showCustomAlert(msg, 'success');
            }
          } catch (e) {
            try {
              console.error('[Documents] deleteDocument error:', e);
              if (typeof showCustomAlert === 'function') {
                const msg = i18n.documentsDeleteError || 'Nem sikerült törölni a dokumentumot.';
                showCustomAlert(msg, 'info');
              }
            } catch (_) {}
          }
        }

        // Elsődleges: saját megerősítő popup
        if (typeof showCustomAlert === 'function') {
          showCustomAlert(confirmText, 'warning', function () {
            performDelete();
          }, {
            confirmText: confirmButtonText,
            confirmClass: 'bg-red-500 hover:bg-red-600'
          });
          return;
        }

        // Fallback: böngésző confirm (ha a saját popup nem érhető el)
        if (typeof window.confirm === 'function') {
          const ok = window.confirm(confirmText);
          if (!ok) return;
        }

        await performDelete();
      }

      if (todayBtn && dateInput) {
        todayBtn.addEventListener('click', function(e) {
          e.preventDefault();
          try {
            const iso = getTodayIso();
            if (iso) {
              dateInput.value = iso;
              loadDocumentsForCurrentDate();
            }
          } catch (_) {}
        });
      }

      function canUploadDocuments() {
        try {
          const sub = window.currentUserSubscription || {};
          const rawTier = sub.tier || 'free';
          const tier = (rawTier === 'guest') ? 'free' : rawTier;
          // Egyelőre nincs korlátozás: Free/Pro/Tester mind engedélyezett
          if (tier === 'free' || tier === 'pro' || tier === 'tester') return true;
          return true;
        } catch (_) {
          return false;
        }
      }

      if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', function(e) {
          e.preventDefault();
          try {
            if (!window.currentUser) {
              const i18n = getDocumentsI18n();
              if (typeof showCustomAlert === 'function') {
                const msg = i18n.documentsLoginRequired || 'A dokumentumok feltöltéséhez be kell jelentkezned.';
                showCustomAlert(msg, 'info');
              }
              return;
            }
            if (!canUploadDocuments()) {
              const i18n2 = getDocumentsI18n();
              if (typeof showCustomAlert === 'function') {
                const planMsg = i18n2.documents_upload_plan_required || 'Napi limit elérve (Free: 2/nap). Pro csomaggal korlátlan feltöltés.';
                showCustomAlert(planMsg, 'info');
              }
              return;
            }
            fileInput.click();
          } catch (_) {}
        });
        fileInput.addEventListener('change', handleFileSelected);
      }

      if (cameraBtn && cameraInput) {
        cameraBtn.addEventListener('click', function(e) {
          e.preventDefault();
          try {
            if (!window.currentUser) {
              const i18n = getDocumentsI18n();
              if (typeof showCustomAlert === 'function') {
                const msg = i18n.documentsLoginRequired || 'A dokumentumok feltöltéséhez be kell jelentkezned.';
                showCustomAlert(msg, 'info');
              }
              return;
            }
            if (!canUploadDocuments()) {
              const i18n2 = getDocumentsI18n();
              if (typeof showCustomAlert === 'function') {
                const planMsg = i18n2.documents_upload_plan_required || 'Napi limit elérve (Free: 2/nap). Pro csomaggal korlátlan feltöltés.';
                showCustomAlert(planMsg, 'info');
              }
              return;
            }
            cameraInput.click();
          } catch (_) {}
        });
        cameraInput.addEventListener('change', handleFileSelected);
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', function(e) {
          e.preventDefault();
          try {
            const i18n = getDocumentsI18n();
            if (!window.currentUser) {
              if (typeof showCustomAlert === 'function') {
                const msg = i18n.documentsLoginRequired || 'A dokumentumok feltöltéséhez be kell jelentkezned.';
                showCustomAlert(msg, 'info');
              }
              return;
            }
            if (!canUploadDocuments()) {
              if (typeof showCustomAlert === 'function') {
                const planMsg = i18n.documents_upload_plan_required || 'Napi limit elérve (Free: 2/nap). Pro csomaggal korlátlan feltöltés.';
                showCustomAlert(planMsg, 'info');
              }
              return;
            }
            if (!pendingDocumentFiles || !pendingDocumentFiles.length) {
              if (typeof showCustomAlert === 'function') {
                const noFilesMsg = i18n.documents_error_no_files || 'Először válassz ki legalább egy fájlt.';
                showCustomAlert(noFilesMsg, 'info');
              }
              return;
            }
            handleSaveDocuments();
          } catch (_) {}
        });
      }

      function getTypeColor(type, index) {
        // RGB színek - garantáltan láthatóak mind világos, mind sötét módban
        const colors = [
          { bg: '#3B82F6', hover: '#2563EB', text: '#FFFFFF' },  // Kék
          { bg: '#10B981', hover: '#059669', text: '#FFFFFF' },  // Zöld
          { bg: '#F59E0B', hover: '#D97706', text: '#000000' },  // Narancssárga
          { bg: '#8B5CF6', hover: '#7C3AED', text: '#FFFFFF' },  // Lila
          { bg: '#EC4899', hover: '#DB2777', text: '#FFFFFF' },  // Pink
          { bg: '#6366F1', hover: '#4F46E5', text: '#FFFFFF' },  // Indigo
          { bg: '#EF4444', hover: '#DC2626', text: '#FFFFFF' },  // Piros
          { bg: '#06B6D4', hover: '#0891B2', text: '#FFFFFF' },  // Cyan
          { bg: '#F97316', hover: '#EA580C', text: '#FFFFFF' },  // Narancs
          { bg: '#14B8A6', hover: '#0D9488', text: '#FFFFFF' }   // Teal
        ];
        return colors[index % colors.length];
      }

      function renderDocumentTypeFilter() {
        if (!typeFilter) return;
        const i18n = getDocumentsI18n();
        
        // Lekérjük az összes típust (default + egyedi)
        const allTypeIds = typeof getDocumentTypes === 'function' ? getDocumentTypes() : ['Dokumentum'];
        
        // Mentjük el az aktuális kijelölést
        const currentValue = typeFilter.value || 'all';
        
        const allLabel = i18n.documentsTypeAll || 'Összes típus';
        let optionsHtml = '<option value="all">' + escapeHtml(allLabel) + '</option>';
        allTypeIds.forEach(function(typeId) {
          optionsHtml += '<option value="' + escapeHtml(typeId) + '">' + escapeHtml(typeId) + '</option>';
        });
        
        typeFilter.innerHTML = optionsHtml;
        
        // Visszaállítjuk a korábbi kijelölést, ha még létezik
        if (currentValue && (currentValue === 'all' || allTypeIds.indexOf(currentValue) >= 0)) {
          typeFilter.value = currentValue;
        }
      }

      function getDefaultDocumentTypeId() {
        const types = typeof getDocumentTypes === 'function' ? getDocumentTypes() : ['Dokumentum'];
        return types.length ? types[0] : 'Dokumentum';
      }

      function isDefaultDocumentType(typeName) {
        return typeName === getDefaultDocumentTypeId();
      }

      function countDocumentsWithType(typeName) {
        if (!typeName || !Array.isArray(allDocumentsRaw)) return 0;
        var count = 0;
        allDocumentsRaw.forEach(function(d) {
          var t = d.data && d.data.type ? d.data.type : null;
          if (t === typeName) count++;
        });
        return count;
      }

      function renderDocumentTypeActions() {
        if (!typeActionsContainer) return;
        const i18n = getDocumentsI18n();
        const isDefault = isDefaultDocumentType(selectedDocumentType);
        const selectedParts = (i18n.documentsTypeSelectedLabel || 'Kiválasztott típus: {type}').split('{type}');
        const renameLabel = i18n.documentsTypeActionRename || 'Átnevezés';
        const deleteLabel = i18n.documentsTypeActionDelete || 'Törlés';

        var buttonsHtml =
          '<button type="button" class="documents-type-actions__btn documents-type-actions__btn--secondary" data-doc-type-action="rename">' + escapeHtml(renameLabel) + '</button>';
        if (!isDefault) {
          buttonsHtml +=
            '<button type="button" class="documents-type-actions__btn documents-type-actions__btn--danger" data-doc-type-action="delete">' + escapeHtml(deleteLabel) + '</button>';
        }
        var hintHtml = '';
        if (isDefault) {
          var noDeleteHint = i18n.documentsTypeDefaultProtectedHint || 'Az alapértelmezett típus nem törölhető.';
          hintHtml = '<p class="documents-type-actions__hint">' + escapeHtml(noDeleteHint) + '</p>';
        }

        typeActionsContainer.classList.remove('hidden');
        typeActionsContainer.innerHTML =
          '<p class="documents-type-actions__label">' + escapeHtml(selectedParts[0] || '') + '<strong>' + escapeHtml(selectedDocumentType) + '</strong>' + escapeHtml(selectedParts[1] || '') + '</p>' +
          '<div class="documents-type-actions__buttons">' + buttonsHtml + '</div>' +
          hintHtml;

        var renameBtn = typeActionsContainer.querySelector('[data-doc-type-action="rename"]');
        var deleteBtn = typeActionsContainer.querySelector('[data-doc-type-action="delete"]');
        if (renameBtn) {
          renameBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openTypeModal({ mode: 'rename', name: selectedDocumentType });
          });
        }
        if (deleteBtn) {
          deleteBtn.addEventListener('click', function(e) {
            e.preventDefault();
            openDeleteTypeModal(selectedDocumentType);
          });
        }
      }

      function renderDocumentTypeSelector() {
        if (!typeSelectorContainer) return;
        const i18n = getDocumentsI18n();
        const allTypeIds = typeof getDocumentTypes === 'function' ? getDocumentTypes() : ['Dokumentum'];

        var chipsHtml = allTypeIds.map(function(typeId) {
          var isActive = typeId === selectedDocumentType;
          var check = isActive ? '<span class="documents-type-chip__check" aria-hidden="true">✓</span>' : '';
          return '<button type="button" class="documents-type-chip' + (isActive ? ' is-active' : '') + '" data-doc-type="' + escapeHtml(typeId) + '" aria-pressed="' + (isActive ? 'true' : 'false') + '">' + check + escapeHtml(typeId) + '</button>';
        }).join('');

        var addLabel = i18n.documentsAddTypeChipShort || i18n.documentsAddTypeButton || '+ Új típus';
        chipsHtml += '<button type="button" class="documents-type-chip documents-type-chip--add" data-doc-type-add="1" aria-label="' + escapeHtml(addLabel) + '">' + escapeHtml(addLabel) + '</button>';

        typeSelectorContainer.innerHTML = chipsHtml;

        var addChip = typeSelectorContainer.querySelector('[data-doc-type-add]');
        if (addChip) {
          addChip.addEventListener('click', function(e) {
            e.preventDefault();
            openTypeModal({ mode: 'add' });
          });
        }

        var buttons = typeSelectorContainer.querySelectorAll('[data-doc-type]');
        Array.prototype.forEach.call(buttons, function(btn) {
          btn.addEventListener('click', function() {
            selectedDocumentType = btn.getAttribute('data-doc-type');
            renderDocumentTypeSelector();
            renderDocumentTypeActions();
          });
        });

        renderDocumentTypeActions();
      }

      // A dátum mező már csak a feltöltéshez kell, nem szűréshez
      // ezért nem kell reload a dátum változásakor

      if (typeFilter) {
        typeFilter.addEventListener('change', function() {
          documentsCurrentPage = 1;
          selectedDocumentIds.clear();
          loadDocumentsForCurrentDate();
        });
      }

      if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
          try {
            const checkboxes = listContainer.querySelectorAll('.document-checkbox');
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            checkboxes.forEach(function(cb) {
              cb.checked = !allChecked;
              const docId = cb.getAttribute('data-doc-id');
              if (!allChecked) {
                selectedDocumentIds.add(docId);
              } else {
                selectedDocumentIds.delete(docId);
              }
            });
            updateBulkDeleteUI();
          } catch (_) {}
        });
      }

      if (deleteSelectedBtn) {
        deleteSelectedBtn.addEventListener('click', function() {
          try {
            if (selectedDocumentIds.size === 0) return;
            const i18n = getDocumentsI18n();
            const confirmText = i18n.alertConfirmDeleteMultiple || 'Biztosan törölni szeretnéd a kijelölt dokumentumokat?';
            const confirmButtonText = (i18n.delete || (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang] && translations[currentLang].delete) || 'Törlés');
            const uid = window.currentUser && window.currentUser.uid;
            if (!uid) return;

            async function performBulkDelete() {
              try {
                for (const docId of selectedDocumentIds) {
                  try {
                    // Töröljük a teljes mappát a Storage-ból (eredeti fájl + thumbnail-ek)
                    if (docId && uid && typeof storage !== 'undefined') {
                      try {
                        const folderPath = 'users/' + uid + '/documents/' + docId + '/';
                        const folderRef = storage.ref(folderPath);
                        
                        // Listázzuk ki az összes fájlt a mappában
                        const listResult = await folderRef.listAll();
                        
                        // Töröljük az összes fájlt
                        const deletePromises = listResult.items.map(function(itemRef) {
                          return itemRef.delete().catch(function(e) {
                            try { console.warn('[Documents] Failed to delete file:', itemRef.fullPath, e); } catch (_) {}
                          });
                        });
                        
                        await Promise.all(deletePromises);
                      } catch (e) {
                        try { console.warn('[Documents] storage folder delete failed for', docId, e); } catch (_) {}
                      }
                    }
                    
                    // Töröljük a Firestore dokumentumot
                    await db.collection('users').doc(uid).collection('documents').doc(docId).delete();
                  } catch (e) {
                    console.error('[Documents] delete error for', docId, e);
                  }
                }

                selectedDocumentIds.clear();
                await loadDocumentsForCurrentDate();

                if (typeof showCustomAlert === 'function') {
                  const msg = i18n.documentsDeleteSuccess || 'Dokumentumok törölve.';
                  showCustomAlert(msg, 'success');
                }
              } catch (e) {
                console.error('[Documents] bulk delete error:', e);
                const i18n2 = getDocumentsI18n();
                if (typeof showCustomAlert === 'function') {
                  const msg = i18n2.documentsDeleteError || 'Nem sikerült törölni a dokumentumokat.';
                  showCustomAlert(msg, 'info');
                }
              }
            }

            // Elsődleges: saját megerősítő popup
            if (typeof showCustomAlert === 'function') {
              showCustomAlert(confirmText, 'warning', function () {
                performBulkDelete();
              }, {
                confirmText: confirmButtonText,
                confirmClass: 'bg-red-500 hover:bg-red-600'
              });
              return;
            }

            // Fallback: böngésző confirm, ha a saját popup nem elérhető
            if (typeof window.confirm === 'function') {
              const ok = window.confirm(confirmText);
              if (!ok) return;
            }

            performBulkDelete();
          } catch (e) {
            console.error('[Documents] bulk delete error:', e);
            const i18n2 = getDocumentsI18n();
            if (typeof showCustomAlert === 'function') {
              const msg = i18n2.documentsDeleteError || 'Nem sikerült törölni a dokumentumokat.';
              showCustomAlert(msg, 'info');
            }
          }
        });
      }

      var documentsTypeModalEscapeHandler = null;

      function refreshDocumentTypesUi() {
        renderDocumentTypeSelector();
        renderDocumentTypeFilter();
        if (typeof renderDocumentTypesList === 'function') {
          renderDocumentTypesList();
        }
      }

      function updateTypeModalPresentation() {
        const i18n = getDocumentsI18n();
        const isRename = typeModalMode === 'rename';

        if (modalTitle) {
          modalTitle.textContent = isRename
            ? (i18n.documentsTypeModalTitleRename || 'Dokumentumtípus átnevezése')
            : (i18n.documentsTypeModalTitle || 'Új dokumentumtípus');
        }
        if (modalHint) {
          modalHint.textContent = isRename
            ? (i18n.documentsTypeModalHintRename || 'Add meg az új nevet. A korábbi dokumentumoknál is ez a típusnév fog megjelenni, ha a rendszer név alapján tárolja.')
            : (i18n.documentsTypeModalHint || 'Adj meg egy saját dokumentumtípust, amit később gyorsan kiválaszthatsz.');
        }
      }

      function openTypeModal(options) {
        if (!modalOverlay) return;
        const opts = options || {};
        typeModalMode = opts.mode === 'rename' ? 'rename' : 'add';
        typeModalEditingName = opts.name || null;

        if (modalInput) {
          modalInput.value = typeModalMode === 'rename' && typeModalEditingName ? typeModalEditingName : '';
        }
        updateTypeModalPresentation();

        modalOverlay.classList.remove('hidden');
        modalOverlay.classList.add('is-open');
        try { document.body.classList.add('documents-type-modal-open'); } catch (_) {}
        try { modalInput && modalInput.focus(); } catch (_) {}

        if (!documentsTypeModalEscapeHandler) {
          documentsTypeModalEscapeHandler = function(e) {
            if (e.key === 'Escape' || e.key === 'Esc') {
              e.preventDefault();
              closeTypeModal();
            }
          };
        }
        try { document.addEventListener('keydown', documentsTypeModalEscapeHandler); } catch (_) {}
      }

      function closeTypeModal() {
        if (modalOverlay) {
          modalOverlay.classList.add('hidden');
          modalOverlay.classList.remove('is-open');
        }
        if (modalInput) modalInput.value = '';
        typeModalMode = 'add';
        typeModalEditingName = null;
        try { document.body.classList.remove('documents-type-modal-open'); } catch (_) {}
        try { document.removeEventListener('keydown', documentsTypeModalEscapeHandler); } catch (_) {}
      }

      var documentsTypeDeleteEscapeHandler = null;

      function openDeleteTypeModal(typeName) {
        if (!deleteModalOverlay || !typeName || isDefaultDocumentType(typeName)) return;
        typePendingDeleteName = typeName;
        const i18n = getDocumentsI18n();
        if (deleteModalMessage) {
          const msg = (i18n.documentsTypeDeleteModalText || 'Biztosan törölni szeretnéd ezt a dokumentumtípust: „{type}”?')
            .replace('{type}', typeName);
          deleteModalMessage.textContent = msg;
        }
        deleteModalOverlay.classList.remove('hidden');
        deleteModalOverlay.classList.add('is-open');
        try { document.body.classList.add('documents-type-modal-open'); } catch (_) {}
        if (!documentsTypeDeleteEscapeHandler) {
          documentsTypeDeleteEscapeHandler = function(e) {
            if (e.key === 'Escape' || e.key === 'Esc') {
              e.preventDefault();
              closeDeleteTypeModal();
            }
          };
        }
        try { document.addEventListener('keydown', documentsTypeDeleteEscapeHandler); } catch (_) {}
      }

      function closeDeleteTypeModal() {
        if (deleteModalOverlay) {
          deleteModalOverlay.classList.add('hidden');
          deleteModalOverlay.classList.remove('is-open');
        }
        typePendingDeleteName = null;
        try { document.body.classList.remove('documents-type-modal-open'); } catch (_) {}
        try { document.removeEventListener('keydown', documentsTypeDeleteEscapeHandler); } catch (_) {}
      }

      function saveRenameDocumentTypeFromModal(newName) {
        const trimmed = (newName || '').trim();
        if (!trimmed || !typeModalEditingName) return false;

        if (String(trimmed).toLowerCase() === String(typeModalEditingName).toLowerCase()) {
          selectedDocumentType = typeModalEditingName;
          return true;
        }

        if (typeof renameDocumentType === 'function') {
          if (!renameDocumentType(typeModalEditingName, trimmed)) {
            return false;
          }
        } else {
          const currentTypes = typeof getDocumentTypes === 'function' ? getDocumentTypes() : [];
          const idx = currentTypes.indexOf(typeModalEditingName);
          if (idx < 0) return false;
          if (currentTypes.some(function(t, i) {
            return i !== idx && String(t).toLowerCase() === trimmed.toLowerCase();
          })) {
            return false;
          }
          currentTypes[idx] = trimmed;
          if (typeof saveDocumentTypes === 'function') saveDocumentTypes(currentTypes);
          if (typeof uploadLocalSettings === 'function') uploadLocalSettings();
        }

        if (selectedDocumentType === typeModalEditingName) {
          selectedDocumentType = trimmed;
        }
        refreshDocumentTypesUi();
        return true;
      }

      function performDeleteDocumentType(typeName) {
        if (!typeName || isDefaultDocumentType(typeName)) return false;

        if (countDocumentsWithType(typeName) > 0) {
          const i18n = getDocumentsI18n();
          const inUseMsg = i18n.documentsTypeDeleteInUse || 'Ez a típus már használatban van, ezért nem törölhető.';
          if (typeof showCustomAlert === 'function') {
            showCustomAlert(inUseMsg, 'info');
          } else {
            alert(inUseMsg);
          }
          return false;
        }

        const currentTypes = typeof getDocumentTypes === 'function' ? getDocumentTypes() : [];
        const updated = currentTypes.filter(function(t) { return t !== typeName; });
        if (typeof saveDocumentTypes === 'function') {
          saveDocumentTypes(updated);
        }
        if (typeof uploadLocalSettings === 'function') {
          uploadLocalSettings();
        }

        selectedDocumentType = getDefaultDocumentTypeId();
        if (typeFilter && typeFilter.value === typeName) {
          typeFilter.value = 'all';
        }

        refreshDocumentTypesUi();
        loadDocumentsForCurrentDate();
        return true;
      }

      function saveNewDocumentTypeFromModal(name) {
        const trimmed = (name || '').trim();
        if (!trimmed) return false;

        const currentTypes = typeof getDocumentTypes === 'function' ? getDocumentTypes() : ['Dokumentum'];
        var existingType = null;
        for (var i = 0; i < currentTypes.length; i++) {
          if (String(currentTypes[i]).toLowerCase() === trimmed.toLowerCase()) {
            existingType = currentTypes[i];
            break;
          }
        }

        if (!existingType) {
          const updatedTypes = currentTypes.slice();
          updatedTypes.push(trimmed);
          if (typeof saveDocumentTypes === 'function') {
            saveDocumentTypes(updatedTypes);
          }
          existingType = trimmed;
          if (typeof renderDocumentTypesList === 'function') {
            renderDocumentTypesList();
          }
          if (typeof uploadLocalSettings === 'function') {
            uploadLocalSettings();
          }
        }

        selectedDocumentType = existingType;
        refreshDocumentTypesUi();
        return true;
      }

      if (deleteModalCancel) {
        deleteModalCancel.addEventListener('click', function(e) {
          e.preventDefault();
          closeDeleteTypeModal();
        });
      }

      if (deleteModalConfirm) {
        deleteModalConfirm.addEventListener('click', function(e) {
          e.preventDefault();
          if (!typePendingDeleteName) return;
          if (performDeleteDocumentType(typePendingDeleteName)) {
            closeDeleteTypeModal();
          }
        });
      }

      if (deleteModalOverlay) {
        deleteModalOverlay.addEventListener('click', function(e) {
          if (e.target === deleteModalOverlay) {
            closeDeleteTypeModal();
          }
        });
        var deleteModalCard = document.getElementById('documents-type-delete-modal');
        if (deleteModalCard) {
          deleteModalCard.addEventListener('click', function(e) {
            e.stopPropagation();
          });
        }
      }

      if (modalCancel) {
        modalCancel.addEventListener('click', function(e) {
          e.preventDefault();
          closeTypeModal();
        });
      }

      try { renderPendingFilesPanel(); } catch (_) {}

      if (modal) {
        modal.addEventListener('click', function(e) {
          e.stopPropagation();
        });
      }

      if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
          if (e.target === modalOverlay) {
            closeTypeModal();
          }
        });
      }

      if (modalInput) {
        modalInput.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (modalSave) modalSave.click();
          }
        });
      }

      if (modalSave) {
        modalSave.addEventListener('click', function(e) {
          e.preventDefault();
          const i18n = getDocumentsI18n();
          const name = (modalInput && modalInput.value ? modalInput.value.trim() : '');
          if (!name) {
            const errMsg = i18n.documentsTypeModalNameRequired || 'Kérlek adj meg egy típusnevet!';
            if (typeof showCustomAlert === 'function') {
              showCustomAlert(errMsg, 'info');
            } else {
              alert(errMsg);
            }
            try { modalInput && modalInput.focus(); } catch (_) {}
            return;
          }

          var saved = false;
          if (typeModalMode === 'rename') {
            saved = saveRenameDocumentTypeFromModal(name);
            if (!saved) {
              const existsMsg = i18n.documentTypeExists || 'Ez a dokumentumtípus már létezik!';
              if (typeof showCustomAlert === 'function') {
                showCustomAlert(existsMsg, 'info');
              } else {
                alert(existsMsg);
              }
              try { modalInput && modalInput.focus(); } catch (_) {}
              return;
            }
          } else {
            saved = saveNewDocumentTypeFromModal(name);
            if (!saved) {
              try { modalInput && modalInput.focus(); } catch (_) {}
              return;
            }
          }

          closeTypeModal();
        });
      }

      ensureDateSet();
      
      window.refreshDocumentsView = async function() {
        if (isLoadingDocumentsView) return;
        isLoadingDocumentsView = true;
        try {
          await loadDocumentsEntitlementOnce(false);
          renderDocumentsQuotaBanner();
          await loadDocumentsListForCurrentDate();
        } catch (e) {
          try { console.warn('[Documents] refreshDocumentsView error:', e); } catch (_) {}
        } finally {
          isLoadingDocumentsView = false;
        }
      };

      if (typeSelectorContainer) {
        renderDocumentTypeSelector();
      }
      
      if (typeFilter) {
        renderDocumentTypeFilter();
      }
      if (typeof window.refreshOfflinePolicyUi === 'function') {
        try { window.refreshOfflinePolicyUi(); } catch (_) {}
      }
    } catch (e) {
      try { console.warn('[Documents] initDocumentsView error:', e); } catch (_) {}
    }
  }

  window.initDocumentsView = initDocumentsView;
})();
