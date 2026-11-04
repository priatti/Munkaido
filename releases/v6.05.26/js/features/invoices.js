// ============================================
// INVOICES - Számláim lista
// ============================================

// Firebase 8.x globális használat (NEM ES6 module)

// ===== SZÁMLÁIM LISTA BETÖLTÉSE =====
function isInvoicesAuthPermissionDenied(error) {
  const code = error && error.code;
  const msg = String((error && error.message) || '');
  return code === 'permission-denied' || msg.indexOf('Missing or insufficient permissions') !== -1;
}

async function loadInvoices() {
  try {
    console.log('[Invoices] loadInvoices() called');
    
    // KRITIKUS: Ellenőrizzük hogy Firebase készen van-e
    if (typeof firebase === 'undefined' || !firebase.auth || !firebase.firestore) {
      console.warn('[Invoices] Firebase not ready in loadInvoices');
      return []; // NE crasheljen, csak térjen vissza üres tömbbel
    }

    const user = firebase.auth().currentUser;
    if (!user) {
      return [];
    }

    const loadCtx = (window.GurigoAuthSession && window.GurigoAuthSession.captureAuthScopedLoad)
      ? window.GurigoAuthSession.captureAuthScopedLoad()
      : { uid: user.uid, gen: 0 };
    
    console.log('[Invoices] Loading invoices');

    const db = firebase.firestore();
    const invoicesRef = db.collection('users').doc(user.uid).collection('invoices');
    
    // Próbáljuk orderBy nélkül is, hátha index probléma van
    let querySnapshot;
    try {
      querySnapshot = await invoicesRef.orderBy('createdAt', 'desc').get();
    } catch (orderByError) {
      console.warn('[Invoices] orderBy failed, trying without:', orderByError.message);
      // Fallback: orderBy nélkül
      querySnapshot = await invoicesRef.get();
    }

    if (window.GurigoAuthSession && window.GurigoAuthSession.shouldDiscardAuthScopedLoad(loadCtx)) {
      return [];
    }

    const invoices = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (typeof window.gurigoIsDiagnosticConsole === 'function' && window.gurigoIsDiagnosticConsole()) {
        console.log('[Invoices] Found invoice:', doc.id, data.invoiceNumber, data.publicUrl ? 'has publicUrl' : 'NO publicUrl');
      }
      invoices.push({
        id: doc.id,
        ...data
      });
    });

    console.log('[Invoices] Loaded:', invoices.length, 'invoices');
    return invoices;

  } catch (error) {
    const signedOut = typeof firebase !== 'undefined' && firebase.auth && !firebase.auth().currentUser;
    const signingOut = window.GurigoAuthSession && window.GurigoAuthSession.isSigningOut();
    if (isInvoicesAuthPermissionDenied(error) && (signedOut || signingOut)) {
      console.warn('[Invoices] Load aborted (auth):', error && error.message);
    } else {
      console.warn('[Invoices] Error loading:', error);
    }
    return [];
  }
}

// ===== i18n HELPER =====
function t(key, fallback) {
  const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
    ? (translations[currentLang] || {})
    : {};
  return (i18n && i18n[key]) ? i18n[key] : fallback;
}

function getInvoicePdfButtonInner(label = t('invoicePdfButton', 'PDF'), options = {}) {
  const {
    subtext = t('invoicePdfDownloadLabel', 'Letöltés'),
    showSpinner = false
  } = options;

  const iconSvg = showSpinner
    ? `
        <svg class="invoice-pdf-spinner" viewBox="0 0 24 24" role="presentation" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" opacity="0.25"></circle>
          <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" opacity="0.65"></path>
        </svg>
      `
    : `
        <svg class="invoice-pdf-icon-doc" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path d="M7 2h7l5 5v13a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z" stroke-width="1.5" />
          <path d="M14 2v4a1 1 0 001 1h4" stroke-width="1.5" />
          <path d="M9 13h6m-6 4h6" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      `;

  return `
    <span class="invoice-pdf-icon ${showSpinner ? 'invoice-pdf-icon--spinner' : ''}">
      ${iconSvg}
    </span>
    <span class="invoice-pdf-text">
      <span class="invoice-pdf-label">${label}</span>
      <span class="invoice-pdf-subtext">${subtext}</span>
    </span>
  `;
}

const INVOICES_PAGE_SIZE_OPTIONS = (typeof ListPagination !== 'undefined' && ListPagination.DEFAULT_PAGE_SIZE_OPTIONS)
  ? ListPagination.DEFAULT_PAGE_SIZE_OPTIONS
  : [10, 20, 50, 100];
const INVOICES_PAGE_SIZE_STORAGE_KEY = 'invoicesListPageSize';
const INVOICES_PAGINATION_SLOT_IDS = ['invoices-pagination-top', 'invoices-pagination-bottom'];
const INVOICES_JUMP_MODAL_IDS = {
  overlayId: 'invoices-page-jump-overlay',
  gridId: 'invoices-page-jump-grid',
  titleId: 'invoices-page-jump-title',
  closeBtnId: 'invoices-page-jump-close-btn',
  closeHandler: 'closeInvoicesPageJumpModal',
};

let invoicesCache = [];
let invoicesCurrentPage = 1;
let invoicesPageSize = (typeof ListPagination !== 'undefined' && ListPagination.getStoredPageSize)
  ? ListPagination.getStoredPageSize(INVOICES_PAGE_SIZE_STORAGE_KEY, INVOICES_PAGE_SIZE_OPTIONS, 10)
  : 10;

function getInvoicesPaginationTotals() {
  const totalItems = invoicesCache.length;
  if (typeof ListPagination !== 'undefined' && ListPagination.calcTotals) {
    return ListPagination.calcTotals(totalItems, invoicesPageSize);
  }
  const totalPages = Math.max(1, Math.ceil(totalItems / invoicesPageSize));
  return { totalItems, totalPages };
}

function getInvoicesPageSlice() {
  const total = invoicesCache.length;
  if (!total) return [];
  const start = (invoicesCurrentPage - 1) * invoicesPageSize;
  return invoicesCache.slice(start, start + invoicesPageSize);
}

function initInvoicesPageJumpModal() {
  if (typeof ListPagination === 'undefined' || !ListPagination.initJumpModal) return;
  ListPagination.initJumpModal(INVOICES_JUMP_MODAL_IDS);
}

function closeInvoicesPageJumpModal() {
  if (typeof ListPagination === 'undefined' || !ListPagination.closeJumpModal) return;
  ListPagination.closeJumpModal({
    overlayId: INVOICES_JUMP_MODAL_IDS.overlayId,
    bodyClass: 'records-page-jump-open',
  });
}

function openInvoicesPageJumpModal() {
  if (!invoicesCache.length || typeof ListPagination === 'undefined' || !ListPagination.openJumpModal) return;
  const { totalPages } = getInvoicesPaginationTotals();
  ListPagination.openJumpModal({
    overlayId: INVOICES_JUMP_MODAL_IDS.overlayId,
    gridId: INVOICES_JUMP_MODAL_IDS.gridId,
    titleId: INVOICES_JUMP_MODAL_IDS.titleId,
    closeBtnId: INVOICES_JUMP_MODAL_IDS.closeBtnId,
    closeHandler: INVOICES_JUMP_MODAL_IDS.closeHandler,
    currentPage: invoicesCurrentPage,
    totalPages: totalPages,
    bodyClass: 'records-page-jump-open',
    onSelectPage: function (page) {
      jumpToInvoicesPage(page);
    },
  });
}

function renderInvoicesPaginationControls() {
  const { totalItems, totalPages } = getInvoicesPaginationTotals();
  const showControls = totalItems > 0;
  let html = '';
  if (showControls && typeof ListPagination !== 'undefined' && ListPagination.buildHtml) {
    html = ListPagination.buildHtml({
      currentPage: invoicesCurrentPage,
      totalPages: totalPages,
      totalItems: totalItems,
      pageSize: invoicesPageSize,
      pageSizeOptions: INVOICES_PAGE_SIZE_OPTIONS,
      changePageHandler: 'changeInvoicesPage',
      changePageSizeHandler: 'changeInvoicesPageSize',
      openJumpHandler: 'openInvoicesPageJumpModal',
    });
  }
  if (typeof ListPagination !== 'undefined' && ListPagination.renderToSlots) {
    ListPagination.renderToSlots(INVOICES_PAGINATION_SLOT_IDS, html, showControls);
  }
}

function ensureInvoicesListLayout() {
  const container = document.getElementById('invoices-content');
  if (!container) return null;
  if (container.dataset.invoicesLayoutReady === '1') {
    return container.querySelector('#invoices-list-body');
  }
  container.dataset.invoicesLayoutReady = '1';
  container.innerHTML =
    '<div class="max-w-4xl mx-auto">'
    + '<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">'
    + t('invoicesSectionTitle', '📄 Számláim')
    + '</h2>'
    + '<div id="invoices-pagination-top" class="records-pagination-slot hidden mb-3"></div>'
    + '<div id="invoices-list-body" class="space-y-3"></div>'
    + '<div id="invoices-pagination-bottom" class="records-pagination-slot hidden mt-3"></div>'
    + '</div>';
  initInvoicesPageJumpModal();
  return document.getElementById('invoices-list-body');
}

function buildInvoiceCard(invoice) {
  const date = formatInvoiceDate(invoice.createdAt);
  const amount = formatAmount(invoice.amountGross, invoice.currency);
  const type = getInvoiceTypeLabel(invoice.type, invoice.tier);
  const pdfUrl = invoice.pdfUrl || invoice.publicUrl;
  const statusText = invoice.status === 'sent' 
    ? t('invoiceStatusSent', '✅ Elküldve') 
    : t('invoiceStatusProcessing', '📧 Feldolgozás alatt');

  return `
    <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-2">
            <span class="text-lg font-semibold text-gray-900 dark:text-white">
              ${invoice.invoiceNumber || t('invoiceNumberNA', 'Számlaszám N/A')}
            </span>
            <span class="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
              ${statusText}
            </span>
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p><strong>${t('invoiceTypeLabel', 'Típus:')}</strong> ${type}</p>
            <p><strong>${t('invoiceAmountLabel', 'Összeg:')}</strong> ${amount}</p>
            <p><strong>${t('invoiceDateLabel', 'Dátum:')}</strong> ${date}</p>
          </div>
        </div>
        <div class="ml-4 flex-shrink-0">
          ${pdfUrl ? `
            <a 
              href="${pdfUrl}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="invoice-pdf-button"
              aria-label="${t('invoicePdfButton', 'PDF')}"
            >
              ${getInvoicePdfButtonInner()}
            </a>
          ` : (invoice.billingoId ? `
            <button 
              onclick="fetchAndOpenInvoicePdf('${invoice.billingoId}', '${invoice.id}')"
              class="invoice-pdf-button"
              id="pdf-btn-${invoice.id}"
              type="button"
              aria-live="polite"
            >
              ${getInvoicePdfButtonInner()}
            </button>
          ` : `
            <span class="invoice-pdf-placeholder">
              <span class="invoice-pdf-placeholder-dot"></span>
              ${t('invoicePdfPending', 'PDF készül...')}
            </span>
          `)}
        </div>
      </div>
    </div>
  `;
}

function renderInvoicesPage() {
  const container = document.getElementById('invoices-content');
  if (!container) return;

  if (!invoicesCache.length) {
    container.dataset.invoicesLayoutReady = '';
    container.innerHTML = `
      <div class="text-center py-12">
        <p class="text-gray-600 dark:text-gray-400 mb-4">${t('invoicesEmpty', '📄 Még nincs számlád.')}</p>
        <p class="text-sm text-gray-500 dark:text-gray-500">
          ${t('invoicesEmptyHint', 'Első vásárlás után automatikusan megjelenik itt.')}
        </p>
      </div>
    `;
    return;
  }

  const { totalPages } = getInvoicesPaginationTotals();
  if (typeof ListPagination !== 'undefined' && ListPagination.clampPage) {
    invoicesCurrentPage = ListPagination.clampPage(invoicesCurrentPage, totalPages);
  } else {
    if (invoicesCurrentPage > totalPages) invoicesCurrentPage = totalPages;
    if (invoicesCurrentPage < 1) invoicesCurrentPage = 1;
  }

  const listBody = ensureInvoicesListLayout();
  if (!listBody) return;

  const pageInvoices = getInvoicesPageSlice();
  listBody.innerHTML = pageInvoices.map(buildInvoiceCard).join('');
  renderInvoicesPaginationControls();
}

function changeInvoicesPage(direction) {
  if (!invoicesCache.length) return;
  const { totalPages } = getInvoicesPaginationTotals();
  let nextPage;
  if (direction === 'first') {
    nextPage = 1;
  } else if (direction === 'last') {
    nextPage = totalPages;
  } else {
    nextPage = Math.min(totalPages, Math.max(1, invoicesCurrentPage + direction));
  }
  if (nextPage === invoicesCurrentPage) return;
  invoicesCurrentPage = nextPage;
  renderInvoicesPage();
}

function changeInvoicesPageSize(rawSize) {
  const size = parseInt(rawSize, 10);
  if (!INVOICES_PAGE_SIZE_OPTIONS.includes(size) || size === invoicesPageSize) return;
  invoicesPageSize = size;
  try { localStorage.setItem(INVOICES_PAGE_SIZE_STORAGE_KEY, String(size)); } catch (_) { /* ignore */ }
  const { totalPages } = getInvoicesPaginationTotals();
  if (typeof ListPagination !== 'undefined' && ListPagination.clampPage) {
    invoicesCurrentPage = ListPagination.clampPage(invoicesCurrentPage, totalPages);
  }
  renderInvoicesPage();
}

function jumpToInvoicesPage(rawPage) {
  if (!invoicesCache.length) return;
  const { totalPages } = getInvoicesPaginationTotals();
  let page = parseInt(rawPage, 10);
  if (isNaN(page)) page = invoicesCurrentPage;
  page = Math.min(totalPages, Math.max(1, page));
  if (page === invoicesCurrentPage) {
    renderInvoicesPaginationControls();
    return;
  }
  invoicesCurrentPage = page;
  renderInvoicesPage();
}

// ===== SZÁMLÁIM LISTA RENDER =====
async function renderInvoicesList() {
  console.log('[Invoices] renderInvoicesList() called');
  
  const container = document.getElementById('invoices-content');
  if (!container) {
    console.warn('[Invoices] Container #invoices-content not found');
    return;
  }
  
  console.log('[Invoices] Container found, proceeding...');

  if (typeof firebase === 'undefined' || !firebase.auth) {
    console.warn('[Invoices] Firebase not ready yet');
    container.innerHTML = `
      <div class="text-center text-gray-500 py-4">
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
        <p class="text-sm">${t('invoicesLoading', 'Számlák betöltése...')}</p>
      </div>
    `;
    setTimeout(() => renderInvoicesList(), 500);
    return;
  }

  const user = firebase.auth().currentUser;
  if (!user) {
    container.innerHTML = `<p class="text-gray-600 dark:text-gray-400">${t('invoicesLoginRequired', 'Kérjük jelentkezz be.')}</p>`;
    return;
  }

  container.innerHTML = `
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  `;
  container.dataset.invoicesLayoutReady = '';

  const loadCtx = (window.GurigoAuthSession && window.GurigoAuthSession.captureAuthScopedLoad)
    ? window.GurigoAuthSession.captureAuthScopedLoad()
    : { uid: user.uid, gen: 0 };
  const invoices = await loadInvoices();
  if (window.GurigoAuthSession && window.GurigoAuthSession.shouldDiscardAuthScopedLoad(loadCtx)) {
    return;
  }
  invoicesCache = invoices;
  invoicesCurrentPage = 1;
  renderInvoicesPage();
}

// ===== DÁTUM FORMÁZÁS =====
function formatInvoiceDate(timestamp) {
  if (!timestamp) return 'N/A';
  
  let date;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }

  // Nyelv alapján lokalizált dátum formázás
  const locale = (typeof currentLang !== 'undefined' && currentLang === 'de') ? 'de-DE' : (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en-US' : (typeof currentLang !== 'undefined' && currentLang === 'ro') ? 'ro-RO' : (typeof currentLang !== 'undefined' && currentLang === 'pl') ? 'pl-PL' : (typeof currentLang !== 'undefined' && currentLang === 'da') ? 'da-DK' : (typeof currentLang !== 'undefined' && currentLang === 'no') ? 'nb-NO' : 'hu-HU';
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ===== ÖSSZEG FORMÁZÁS =====
function formatAmount(amount, currency) {
  const formatted = new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: currency || 'HUF'
  }).format(amount);
  
  return formatted;
}

// ===== TÍPUS CÍMKE =====
function getInvoiceTypeLabel(type, tier) {
  if (type === 'archival') {
    const archivalNames = {
      'archival_6month': t('invoiceTypeArchival6month', '📦 Archív - 6 hónap'),
      'archival_1year': t('invoiceTypeArchival1year', '📦 Archív - 1 év'),
      'archival_2year': t('invoiceTypeArchival2year', '📦 Archív - 2 év'),
      'archival_5year': t('invoiceTypeArchival5year', '📦 Archív - 5 év')
    };
    return archivalNames[tier] || t('invoiceTypeArchivalDefault', '📦 Archív csomag');
  } else if (type === 'tier') {
    const tierNames = {
      'pro': t('invoiceTypePro', '⭐ GuriGO PRO')
    };
    return tierNames[tier] || (tier === 'max' ? tierNames['pro'] : t('invoiceTypeSubscription', '⭐ Előfizetés'));
  }
  return t('invoiceTypeSubscription', 'Előfizetés');
}

// ===== PDF LEKÉRÉS CLOUD FUNCTION-NEL =====
async function fetchAndOpenInvoicePdf(billingoId, invoiceDocId) {
  if (typeof window.gurigoIsDiagnosticConsole === 'function' && window.gurigoIsDiagnosticConsole()) {
    console.log('[Invoices] fetchAndOpenInvoicePdf called:', billingoId, invoiceDocId);
  }
  
  const btn = document.getElementById(`pdf-btn-${invoiceDocId}`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = getInvoicePdfButtonInner(t('invoicePdfButton', 'PDF'), {
      subtext: t('invoicePdfLoading', 'Betöltés...'),
      showSpinner: true
    });
  }
  
  try {
    // Firebase Cloud Function hívás (europe-west1 régió)
    const functionsInstance = firebase.app().functions('europe-west1');
    const getInvoicePdfUrl = functionsInstance.httpsCallable('getInvoicePdfUrl');
    const result = await getInvoicePdfUrl({ billingoId, invoiceDocId });
    
    if (typeof window.gurigoIsDiagnosticConsole === 'function' && window.gurigoIsDiagnosticConsole()) {
      console.log('[Invoices] getInvoicePdfUrl result:', result.data);
    }
    
    if (result.data && result.data.success) {
      if (result.data.pdfUrl) {
        // Van publikus URL - megnyitjuk
        window.open(result.data.pdfUrl, '_blank');
        
        // Gomb frissítése link-re
        if (btn) {
          const parent = btn.parentElement;
          parent.innerHTML = `
            <a 
              href="${result.data.pdfUrl}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="invoice-pdf-button"
              aria-label="${t('invoicePdfButton', 'PDF')}"
            >
              ${getInvoicePdfButtonInner()}
            </a>
          `;
        }
      } else if (result.data.pdfBase64) {
        // Base64 PDF - blob-ból megnyitjuk
        const byteCharacters = atob(result.data.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        
        // PDF megnyitása új ablakban
        window.open(blobUrl, '_blank');
        
        // Gomb visszaállítása (blob URL nem perzisztens)
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = getInvoicePdfButtonInner();
        }
      } else {
        throw new Error('No PDF data received');
      }
    } else {
      throw new Error(result.data?.error || 'PDF lekérés sikertelen');
    }
    
  } catch (error) {
    console.error('[Invoices] fetchAndOpenInvoicePdf error:', error);
    
    // Gomb visszaállítása
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = getInvoicePdfButtonInner();
    }
    
    // Hiba üzenet
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(t('invoicePdfError', '❌ Nem sikerült betölteni a számlát. Kérjük próbáld újra később.'));
    } else {
      alert(t('invoicePdfError', '❌ Nem sikerült betölteni a számlát. Kérjük próbáld újra később.'));
    }
  }
}

// ===== GLOBÁLIS EXPORT (window scope) =====
if (typeof window !== 'undefined') {
  window.renderInvoicesList = renderInvoicesList;
  window.fetchAndOpenInvoicePdf = fetchAndOpenInvoicePdf;
  window.changeInvoicesPage = changeInvoicesPage;
  window.changeInvoicesPageSize = changeInvoicesPageSize;
  window.openInvoicesPageJumpModal = openInvoicesPageJumpModal;
  window.closeInvoicesPageJumpModal = closeInvoicesPageJumpModal;
  window.jumpToInvoicesPage = jumpToInvoicesPage;
}
