/**
 * Közös lapozó UI – Lista, számlák, tachográf, dokumentumok, iratok/engedélyek, raklapok.
 * Vizuális osztályok: records-pagination* (main.css).
 */
(function (global) {
  'use strict';

  var DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

  function getI18n() {
    return (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
      ? (translations[currentLang] || {})
      : {};
  }

  function disabledAttrs(disabled) {
    return {
      attr: disabled ? ' disabled' : '',
      cls: disabled ? ' is-disabled' : '',
    };
  }

  function buildPageIndicatorHtml(currentPage, totalPages, openJumpHandler, jumpLabel, ofLabel, totalPagesDisplay) {
    var totalStr = (totalPagesDisplay != null && totalPagesDisplay !== '') ? String(totalPagesDisplay) : String(totalPages);
    return ''
      + '<button type="button" class="records-pagination__page-btn" onclick="' + openJumpHandler + '()" aria-label="' + jumpLabel + '">'
      + '<span class="records-pagination__page-current">' + currentPage + '</span>'
      + '<span class="records-pagination__page-sep">' + ofLabel + '</span>'
      + '<span class="records-pagination__page-total">' + totalStr + '</span>'
      + '</button>';
  }

  function buildHtml(config) {
    var currentPage = config.currentPage;
    var totalPages = config.totalPages;
    var pageSize = config.pageSize;
    var pageSizeOptions = config.pageSizeOptions || DEFAULT_PAGE_SIZE_OPTIONS;
    var changePageHandler = config.changePageHandler;
    var changePageSizeHandler = config.changePageSizeHandler;
    var openJumpHandler = config.openJumpHandler;

    var i18n = getI18n();
    var prevLabel = i18n['list.pagination.previous'] || 'Előző';
    var nextLabel = i18n['list.pagination.next'] || 'Következő';
    var pageLabel = i18n['list.pagination.page'] || 'Oldal';
    var ofLabel = i18n['list.pagination.of'] || '/';
    var perPageSuffix = i18n['list.pagination.perPageSuffix'] || '/ oldal';
    var jumpLabel = i18n['list.pagination.jumpToPage'] || 'Ugrás oldalra';
    var firstLabel = i18n['list.pagination.first'] || 'Első oldal';
    var lastLabel = i18n['list.pagination.last'] || 'Utolsó oldal';
    var isFirst = currentPage <= 1;
    var loadedTotalPages = Math.max(1, totalPages);
    var isLastLoadedPage = currentPage >= loadedTotalPages;
    var hasMoreBeyond = !!config.hasMoreBeyond;
    var isLoadingOlder = !!config.isLoadingOlder;
    var firstState = disabledAttrs(isFirst);
    var prevState = disabledAttrs(isFirst);
    var nextDisabled = isLoadingOlder || (isLastLoadedPage && !hasMoreBeyond);
    var nextState = disabledAttrs(nextDisabled);
    var lastState = disabledAttrs(isLastLoadedPage);
    var pageTotalDisplay = hasMoreBeyond ? (String(loadedTotalPages) + '+') : String(loadedTotalPages);
    var pageIndicator = buildPageIndicatorHtml(currentPage, loadedTotalPages, openJumpHandler, jumpLabel, ofLabel, pageTotalDisplay);
    var pageSizeOptionsHtml = pageSizeOptions.map(function (size) {
      var selected = size === pageSize ? ' selected' : '';
      return '<option value="' + size + '"' + selected + '>' + size + '</option>';
    }).join('');

    var totalItemsHtml = '';
    if (typeof config.totalItems === 'number' && config.totalItems >= 0) {
      var countStr = String(config.totalItems);
      var totalTpl;
      if (config.showLoadedCount) {
        totalTpl = hasMoreBeyond
          ? (i18n['list.pagination.loadedMore'] || 'Betöltve: %COUNT%+')
          : (i18n['list.pagination.loaded'] || 'Betöltve: %COUNT%');
      } else {
        totalTpl = i18n['list.pagination.totalItems'] || 'Összesen: %COUNT%';
      }
      totalItemsHtml = '<span class="records-pagination__total">' + totalTpl.replace('%COUNT%', countStr) + '</span>';
    }

    var moreDataHintHtml = '';
    if (hasMoreBeyond && config.showMoreDataHint !== false) {
      var hintText = i18n['pagination.moreDataHint']
        || 'Van még régebbi adat. A további oldalak a Következő gombbal tölthetők be.';
      moreDataHintHtml = '<p class="records-pagination__more-hint">' + hintText + '</p>';
    }

    return ''
      + '<nav class="records-pagination" aria-label="' + pageLabel + '">'
      + '<div class="records-pagination__bar">'
      + '<div class="records-pagination__size-row">'
      + '<label class="records-pagination__size">'
      + '<select class="records-pagination__size-select" onchange="' + changePageSizeHandler + '(this.value)">'
      + pageSizeOptionsHtml
      + '</select>'
      + '<span class="records-pagination__size-suffix">' + perPageSuffix + '</span>'
      + '</label>'
      + '<div class="records-pagination__page-indicator records-pagination__page-indicator--mobile">' + pageIndicator + '</div>'
      + totalItemsHtml
      + '</div>'
      + '<div class="records-pagination__nav-row">'
      + '<button type="button" class="records-pagination__nav-btn records-pagination__nav-btn--icon' + firstState.cls + '" onclick="' + changePageHandler + '(\'first\')"' + firstState.attr + ' aria-label="' + firstLabel + '">⏮</button>'
      + '<button type="button" class="records-pagination__nav-btn records-pagination__nav-btn--text' + prevState.cls + '" onclick="' + changePageHandler + '(-1)"' + prevState.attr + '>'
      + '<span class="records-pagination__nav-icon" aria-hidden="true">◀</span>'
      + '<span class="records-pagination__nav-label">' + prevLabel + '</span>'
      + '</button>'
      + '<div class="records-pagination__page-indicator records-pagination__page-indicator--desktop">' + pageIndicator + '</div>'
      + '<button type="button" class="records-pagination__nav-btn records-pagination__nav-btn--text' + nextState.cls + '" onclick="' + changePageHandler + '(1)"' + nextState.attr + '>'
      + '<span class="records-pagination__nav-label">' + nextLabel + '</span>'
      + '<span class="records-pagination__nav-icon" aria-hidden="true">▶</span>'
      + '</button>'
      + '<button type="button" class="records-pagination__nav-btn records-pagination__nav-btn--icon' + lastState.cls + '" onclick="' + changePageHandler + '(\'last\')"' + lastState.attr + ' aria-label="' + lastLabel + '">⏭</button>'
      + '</div>'
      + '<button type="button" class="records-pagination__jump-link" onclick="' + openJumpHandler + '()">' + jumpLabel + '</button>'
      + '</div>'
      + '</nav>'
      + moreDataHintHtml;
  }

  function renderToSlots(slotIds, html, show) {
    (slotIds || []).forEach(function (slotId) {
      var slot = document.getElementById(slotId);
      if (!slot) return;
      slot.innerHTML = html || '';
      slot.classList.toggle('hidden', !show);
    });
  }

  function getStoredPageSize(storageKey, options, fallback) {
    var opts = options || DEFAULT_PAGE_SIZE_OPTIONS;
    var fb = fallback || opts[0] || 10;
    try {
      var stored = parseInt(localStorage.getItem(storageKey), 10);
      if (opts.indexOf(stored) !== -1) return stored;
    } catch (_) { /* ignore */ }
    return fb;
  }

  function calcTotals(totalItems, pageSize) {
    var count = Math.max(0, Number(totalItems) || 0);
    var size = Math.max(1, Number(pageSize) || 10);
    var totalPages = Math.max(1, Math.ceil(count / size));
    return { totalItems: count, totalPages: totalPages };
  }

  function clampPage(currentPage, totalPages) {
    return Math.min(totalPages, Math.max(1, currentPage));
  }

  function ensureJumpModalDOM(ids) {
    if (!ids || !ids.overlayId) return;
    if (document.getElementById(ids.overlayId)) return;
    var closeHandler = ids.closeHandler || '';
    var overlay = document.createElement('div');
    overlay.id = ids.overlayId;
    overlay.className = 'records-page-jump-overlay hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', ids.titleId || '');
    overlay.innerHTML =
      '<div class="records-page-jump-card">'
      + '<h3 class="records-page-jump__title" id="' + ids.titleId + '"></h3>'
      + '<div class="records-page-jump__grid" id="' + ids.gridId + '"></div>'
      + '<button type="button" class="records-page-jump__close" id="' + ids.closeBtnId + '"' + (closeHandler ? ' onclick="' + closeHandler + '()"' : '') + '></button>'
      + '</div>';
    document.body.appendChild(overlay);
  }

  function initJumpModal(config) {
    if (!config || !config.overlayId) return;
    ensureJumpModalDOM(config);
    var overlay = document.getElementById(config.overlayId);
    if (!overlay || overlay.dataset.bound === '1') return;
    overlay.dataset.bound = '1';
    var closeBtn = config.closeBtnId ? document.getElementById(config.closeBtnId) : null;
    if (closeBtn && config.closeHandler && !closeBtn.getAttribute('onclick')) {
      closeBtn.onclick = function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        if (typeof global[config.closeHandler] === 'function') {
          global[config.closeHandler]();
        }
      };
    }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay && config.closeHandler && typeof global[config.closeHandler] === 'function') {
        global[config.closeHandler]();
      }
    });
  }

  function closeJumpModal(config) {
    if (!config || !config.overlayId) return;
    var overlay = document.getElementById(config.overlayId);
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    var bodyClass = config.bodyClass || 'records-page-jump-open';
    document.body.classList.remove(bodyClass);
  }

  function openJumpModal(config) {
    if (!config || !config.overlayId || !config.gridId) return;
    ensureJumpModalDOM(config);
    var overlay = document.getElementById(config.overlayId);
    var grid = document.getElementById(config.gridId);
    var title = config.titleId ? document.getElementById(config.titleId) : null;
    var closeBtn = config.closeBtnId ? document.getElementById(config.closeBtnId) : null;
    if (!overlay || !grid) return;

    var i18n = getI18n();
    var totalPages = Math.max(1, config.totalPages || 1);
    var currentPage = config.currentPage || 1;

    if (title) {
      title.textContent = i18n['list.pagination.jumpToPage'] || 'Ugrás oldalra';
    }
    if (closeBtn) {
      closeBtn.textContent = i18n.cancel || 'Mégse';
    }

    grid.innerHTML = '';
    for (var p = 1; p <= totalPages; p++) {
      (function (pageNum) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'records-page-jump__page' + (pageNum === currentPage ? ' is-active' : '');
        btn.textContent = String(pageNum);
        btn.addEventListener('click', function () {
          if (typeof config.onSelectPage === 'function') {
            config.onSelectPage(pageNum);
          }
          closeJumpModal(config);
        });
        grid.appendChild(btn);
      })(p);
    }

    overlay.classList.remove('hidden');
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    var bodyClass = config.bodyClass || 'records-page-jump-open';
    document.body.classList.add(bodyClass);
  }

  global.ListPagination = {
    DEFAULT_PAGE_SIZE_OPTIONS: DEFAULT_PAGE_SIZE_OPTIONS,
    getI18n: getI18n,
    buildHtml: buildHtml,
    renderToSlots: renderToSlots,
    getStoredPageSize: getStoredPageSize,
    calcTotals: calcTotals,
    clampPage: clampPage,
    ensureJumpModalDOM: ensureJumpModalDOM,
    initJumpModal: initJumpModal,
    openJumpModal: openJumpModal,
    closeJumpModal: closeJumpModal,
  };
})(typeof window !== 'undefined' ? window : this);
