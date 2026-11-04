// =======================================================
// ===== RAKLAPKEZELÉS (FEATURE) - VÉGLEGES VERZIÓ =======
// =======================================================

let selectedPalletType = 'EUR';
let editingPalletId = null;

function escapePalletHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function normalizePalletPlateKey(plate) {
    return String(plate || '').trim().toUpperCase();
}

function getPalletVehiclePlate(vehicle) {
    return vehicle && vehicle.plateNumber ? String(vehicle.plateNumber).trim() : '';
}

function getActiveVehiclesForPalletPicker() {
    if (typeof window.canAccessVehicles !== 'function' || !window.canAccessVehicles() || !window.VehiclesService) {
        return [];
    }
    var cached = window.VehiclesService.getCachedVehicles ? window.VehiclesService.getCachedVehicles() : null;
    if (!Array.isArray(cached)) return [];
    return window.VehiclesService.getActiveVehiclesForPicker
        ? window.VehiclesService.getActiveVehiclesForPicker(cached)
        : cached.filter(function (v) { return v && v.active !== false && v.deleted !== true; });
}

function isPalletPlateAmongActiveVehicles(plate, activeVehicles) {
    var key = normalizePalletPlateKey(plate);
    if (!key) return false;
    return (activeVehicles || []).some(function (v) {
        return normalizePalletPlateKey(getPalletVehiclePlate(v)) === key;
    });
}

function getCurrentShiftVehiclePlateForPallet() {
    var shift = (typeof window.getActiveShiftFromStorage === 'function')
        ? window.getActiveShiftFromStorage()
        : (window.activeShift || null);
    if (!shift) return '';
    if (typeof window.EntryVehicleField !== 'undefined' && window.EntryVehicleField.formatVehiclePlateForDisplay) {
        return window.EntryVehicleField.formatVehiclePlateForDisplay(shift) || '';
    }
    return shift.vehiclePlateNumber || (shift.vehicleSnapshot && shift.vehicleSnapshot.plateNumber) || '';
}

function palletVehicleT(key, fallback) {
    try {
        var i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
            ? (translations[currentLang] || {})
            : {};
        var v = i18n[key];
        return (v != null && v !== '') ? v : (fallback || key);
    } catch (_) {
        return fallback || key;
    }
}

function formatPalletPlateDisplay(plate) {
    return normalizePalletPlateKey(plate);
}

function resolveSavedPalletPlateOptionLabel(plate) {
    var suffix = palletVehicleT('palletsSavedLicensePlateSuffix', palletVehicleT('entryVehicleFormerSuffix', 'mentett rendszám'));
    return formatPalletPlateDisplay(plate) + ' (' + suffix + ')';
}

function resolveDefaultPalletLicensePlate(activeVehicles) {
    activeVehicles = activeVehicles || getActiveVehiclesForPalletPicker();
    if (!activeVehicles.length) return '';

    var shiftPlateKey = normalizePalletPlateKey(getCurrentShiftVehiclePlateForPallet());
    if (shiftPlateKey) {
        var shiftVehicle = activeVehicles.find(function (v) {
            return normalizePalletPlateKey(getPalletVehiclePlate(v)) === shiftPlateKey;
        });
        if (shiftVehicle) return getPalletVehiclePlate(shiftVehicle);
    }

    var lastPlate = '';
    try { lastPlate = localStorage.getItem('lastPalletLicensePlate') || ''; } catch (_) {}
    if (lastPlate && isPalletPlateAmongActiveVehicles(lastPlate, activeVehicles)) {
        var lastVehicle = activeVehicles.find(function (v) {
            return normalizePalletPlateKey(getPalletVehiclePlate(v)) === normalizePalletPlateKey(lastPlate);
        });
        return lastVehicle ? getPalletVehiclePlate(lastVehicle) : String(lastPlate).trim();
    }

    var sorted = activeVehicles.slice().sort(function (a, b) {
        return String(getPalletVehiclePlate(a)).localeCompare(String(getPalletVehiclePlate(b)), undefined, { sensitivity: 'base' });
    });
    return getPalletVehiclePlate(sorted[0]);
}

async function ensurePalletVehiclesLoaded() {
    if (!window.currentUser || typeof window.canAccessVehicles !== 'function' || !window.canAccessVehicles() || !window.VehiclesService) {
        return [];
    }
    try {
        await window.VehiclesService.loadVehicles(false);
    } catch (_) {}
    return getActiveVehiclesForPalletPicker();
}

function findActiveVehiclePlateMatch(plate, activeVehicles) {
    var key = normalizePalletPlateKey(plate);
    if (!key) return '';
    var found = (activeVehicles || []).find(function (v) {
        return normalizePalletPlateKey(getPalletVehiclePlate(v)) === key;
    });
    return found ? getPalletVehiclePlate(found) : '';
}

function renderPalletLicensePlateSelect(activeVehicles, selectedPlate) {
    var select = document.getElementById('palletLicensePlate');
    if (!select) return;

    var sorted = (activeVehicles || []).slice().sort(function (a, b) {
        return String(getPalletVehiclePlate(a)).localeCompare(String(getPalletVehiclePlate(b)), undefined, { sensitivity: 'base' });
    });
    var html = '<option value="">' + escapePalletHtml(palletVehicleT('entryVehicleNone', 'Nincs jármű kiválasztva')) + '</option>';

    var trimmedPlate = selectedPlate != null ? String(selectedPlate).trim() : '';
    if (trimmedPlate && !isPalletPlateAmongActiveVehicles(trimmedPlate, activeVehicles)) {
        var savedValue = String(trimmedPlate).trim();
        html += '<option value="' + escapePalletHtml(savedValue) + '">' + escapePalletHtml(resolveSavedPalletPlateOptionLabel(savedValue)) + '</option>';
    }

    sorted.forEach(function (vehicle) {
        var plate = getPalletVehiclePlate(vehicle);
        if (!plate) return;
        var plateDisplay = formatPalletPlateDisplay(plate);
        html += '<option value="' + escapePalletHtml(plate) + '">' + escapePalletHtml(plateDisplay) + '</option>';
    });

    select.innerHTML = html;
    var valueToSet = trimmedPlate ? (findActiveVehiclePlateMatch(trimmedPlate, activeVehicles) || trimmedPlate) : '';
    select.value = valueToSet;
    if (trimmedPlate && !select.value) {
        select.value = trimmedPlate;
    }
}

function updatePalletLicensePlateHint(activeVehicles, selectedPlate) {
    var hint = document.getElementById('pallet-license-plate-hint');
    if (!hint) return;
    if ((activeVehicles || []).length || (selectedPlate && String(selectedPlate).trim())) {
        hint.classList.add('hidden');
        hint.textContent = '';
        return;
    }
    hint.textContent = palletVehicleT('entryVehicleHintNoVehicles', 'Járművet a Továbbiak > Járművek menüben adhatsz hozzá.');
    hint.classList.remove('hidden');
}

async function initPalletLicensePlateField(options) {
    options = options || {};
    var select = document.getElementById('palletLicensePlate');
    if (!select) return;

    var activeVehicles = [];
    if (window.currentUser && typeof window.canAccessVehicles === 'function' && window.canAccessVehicles() && window.VehiclesService) {
        activeVehicles = await ensurePalletVehiclesLoaded();
    }

    var selectedPlate = '';
    if (options.plate != null) {
        selectedPlate = String(options.plate || '').trim();
    } else if (options.preserveValue && String(select.value || '').trim()) {
        selectedPlate = String(select.value || '').trim();
    } else {
        selectedPlate = resolveDefaultPalletLicensePlate(activeVehicles);
    }

    renderPalletLicensePlateSelect(activeVehicles, selectedPlate);
    updatePalletLicensePlateHint(activeVehicles, selectedPlate);
}

function readPalletLicensePlateFromField() {
    var select = document.getElementById('palletLicensePlate');
    if (!select) return '';
    return String(select.value || '').trim().toUpperCase();
}

const PALLETS_PAGE_SIZE_OPTIONS = (typeof ListPagination !== 'undefined' && ListPagination.DEFAULT_PAGE_SIZE_OPTIONS)
    ? ListPagination.DEFAULT_PAGE_SIZE_OPTIONS
    : [10, 20, 50, 100];
const PALLETS_PAGE_SIZE_STORAGE_KEY = 'palletsListPageSize';
const PALLETS_PAGINATION_SLOT_IDS = ['pallets-pagination-top', 'pallets-pagination-bottom'];
const PALLETS_JUMP_MODAL_IDS = {
    overlayId: 'pallets-page-jump-overlay',
    gridId: 'pallets-page-jump-grid',
    titleId: 'pallets-page-jump-title',
    closeBtnId: 'pallets-page-jump-close-btn',
    closeHandler: 'closePalletsPageJumpModal',
};

let palletsCurrentPage = 1;
let palletsPageSize = (typeof ListPagination !== 'undefined' && ListPagination.getStoredPageSize)
    ? ListPagination.getStoredPageSize(PALLETS_PAGE_SIZE_STORAGE_KEY, PALLETS_PAGE_SIZE_OPTIONS, 10)
    : 10;
let palletsSortedCache = [];

/** Régi 5 hetes ablak UI – teljes adatkörnél no-op (deploy/cache átmenet). */
function renderPalletsOlderLoadUi() {}

function getPalletsSortedRecords() {
    const source = (typeof palletRecords !== 'undefined' && Array.isArray(palletRecords)) ? palletRecords : [];
    if (!source.length) return [];
    return [...source].sort((a, b) => new Date(b.date) - new Date(a.date) || Number(b.id) - Number(a.id));
}

function getPalletsPaginationTotals() {
    const totalItems = palletsSortedCache.length;
    if (typeof ListPagination !== 'undefined' && ListPagination.calcTotals) {
        return ListPagination.calcTotals(totalItems, palletsPageSize);
    }
    const totalPages = Math.max(1, Math.ceil(totalItems / palletsPageSize));
    return { totalItems, totalPages };
}

function clampPalletsCurrentPage(totalPages) {
    if (typeof ListPagination !== 'undefined' && ListPagination.clampPage) {
        palletsCurrentPage = ListPagination.clampPage(palletsCurrentPage, totalPages);
        return;
    }
    if (palletsCurrentPage > totalPages) palletsCurrentPage = totalPages;
    if (palletsCurrentPage < 1) palletsCurrentPage = 1;
}

function scrollPalletsListToTop() {
    const anchor = document.getElementById('pallets-list-top-anchor')
        || document.getElementById('content-pallets');
    if (!anchor || typeof anchor.scrollIntoView !== 'function') return;
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildPalletsPaginationHtml(totalPages, totalItems) {
    if (typeof ListPagination !== 'undefined' && ListPagination.buildHtml) {
        return ListPagination.buildHtml({
            currentPage: palletsCurrentPage,
            totalPages: totalPages,
            totalItems: totalItems,
            pageSize: palletsPageSize,
            pageSizeOptions: PALLETS_PAGE_SIZE_OPTIONS,
            changePageHandler: 'changePalletsPage',
            changePageSizeHandler: 'changePalletsPageSize',
            openJumpHandler: 'openPalletsPageJumpModal',
        });
    }
    return '';
}

function renderPalletsPaginationControls(totalPages, totalItems) {
    const showControls = totalItems > 0;
    const html = showControls ? buildPalletsPaginationHtml(totalPages, totalItems) : '';
    if (typeof ListPagination !== 'undefined' && ListPagination.renderToSlots) {
        ListPagination.renderToSlots(PALLETS_PAGINATION_SLOT_IDS, html, showControls);
        return;
    }
    PALLETS_PAGINATION_SLOT_IDS.forEach(function (slotId) {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        slot.innerHTML = html;
        slot.classList.toggle('hidden', !showControls);
    });
}

function closePalletsPageJumpModal() {
    if (typeof ListPagination !== 'undefined' && ListPagination.closeJumpModal) {
        ListPagination.closeJumpModal({
            overlayId: PALLETS_JUMP_MODAL_IDS.overlayId,
            bodyClass: 'records-page-jump-open',
        });
    }
}

function openPalletsPageJumpModal() {
    if (!palletsSortedCache.length || typeof ListPagination === 'undefined' || !ListPagination.openJumpModal) return;
    const { totalPages } = getPalletsPaginationTotals();
    ListPagination.openJumpModal({
        overlayId: PALLETS_JUMP_MODAL_IDS.overlayId,
        gridId: PALLETS_JUMP_MODAL_IDS.gridId,
        titleId: PALLETS_JUMP_MODAL_IDS.titleId,
        closeBtnId: PALLETS_JUMP_MODAL_IDS.closeBtnId,
        closeHandler: PALLETS_JUMP_MODAL_IDS.closeHandler,
        currentPage: palletsCurrentPage,
        totalPages: totalPages,
        bodyClass: 'records-page-jump-open',
        onSelectPage: function (page) {
            jumpToPalletsPage(page);
        },
    });
}

function initPalletsPageJumpModal() {
    if (typeof ListPagination !== 'undefined' && ListPagination.initJumpModal) {
        ListPagination.initJumpModal(PALLETS_JUMP_MODAL_IDS);
    }
}

function changePalletsPage(direction) {
    if (!palletsSortedCache.length) return;
    const { totalPages } = getPalletsPaginationTotals();
    let nextPage;
    if (direction === 'first') {
        nextPage = 1;
    } else if (direction === 'last') {
        nextPage = totalPages;
    } else {
        nextPage = Math.min(totalPages, Math.max(1, palletsCurrentPage + direction));
    }
    if (nextPage === palletsCurrentPage) return;
    palletsCurrentPage = nextPage;
    renderPalletRecords({ pageOnly: true, scrollToTop: true });
}

function changePalletsPageSize(rawSize) {
    const size = parseInt(rawSize, 10);
    if (!PALLETS_PAGE_SIZE_OPTIONS.includes(size) || size === palletsPageSize) return;
    palletsPageSize = size;
    try { localStorage.setItem(PALLETS_PAGE_SIZE_STORAGE_KEY, String(size)); } catch (_) {}
    if (!palletsSortedCache.length) return;
    const { totalPages } = getPalletsPaginationTotals();
    clampPalletsCurrentPage(totalPages);
    renderPalletRecords({ pageOnly: true, scrollToTop: true });
}

function jumpToPalletsPage(rawPage) {
    if (!palletsSortedCache.length) return;
    const { totalPages, totalItems } = getPalletsPaginationTotals();
    let page = parseInt(rawPage, 10);
    if (isNaN(page)) page = palletsCurrentPage;
    page = Math.min(totalPages, Math.max(1, page));
    if (page === palletsCurrentPage) {
        renderPalletsPaginationControls(totalPages, totalItems);
        return;
    }
    palletsCurrentPage = page;
    renderPalletRecords({ pageOnly: true, scrollToTop: true });
}

if (typeof window !== 'undefined') {
    window.changePalletsPage = changePalletsPage;
    window.changePalletsPageSize = changePalletsPageSize;
    window.jumpToPalletsPage = jumpToPalletsPage;
    window.openPalletsPageJumpModal = openPalletsPageJumpModal;
    window.closePalletsPageJumpModal = closePalletsPageJumpModal;
    window.getPalletRecords = function() { return (typeof palletRecords !== 'undefined' && Array.isArray(palletRecords)) ? palletRecords : []; };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPalletsPageJumpModal);
    } else {
        initPalletsPageJumpModal();
    }
}

/** One-shot: prefill és link nullázva azonnal (prefill alkalmazásakor / mentéskor link kiolvasása után). */
function applyPalletWaybillPrefill() {
    if (!window.prefillPalletFromWaybill) return;
    var p = window.prefillPalletFromWaybill;
    window.prefillPalletFromWaybill = null;
    safeSetValue('palletDate', p.date || new Date().toISOString().split('T')[0]);
    safeSetValue('palletLocation', p.location || '');
    window.pendingPalletWaybillLink = { waybillId: p.waybillId, waybillEntryId: p.waybillEntryId };
    var formEl = document.getElementById('pallet-form-container') || document.getElementById('palletDate');
    if (formEl) formEl.scrollIntoView && formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    void initPalletLicensePlateField({ preserveValue: true });
}
if (typeof window !== 'undefined') window.applyPalletWaybillPrefill = applyPalletWaybillPrefill;

function resetPalletForm() {
    safeSetValue('palletLocation', '');
    safeSetValue('palletGiven', '');
    safeSetValue('palletTaken', '');
    safeSetValue('palletDate', new Date().toISOString().split('T')[0]);
    void initPalletLicensePlateField();
    editingPalletId = null;
    selectedPalletType = 'EUR';
    window.pendingPalletWaybillLink = null;
    renderPalletTypeSelector();
    // Edit mód UI visszaállítása
    const formContainer = document.getElementById('pallet-form-container');
    const saveBtn = document.getElementById('pallet-save-btn');
    const titleEl = document.getElementById('pallet-form-title');
    const cancelBtn = document.getElementById('pallet-cancel-btn');
    const i18n = translations[currentLang];
    if (formContainer) formContainer.classList.remove('editing');
    if (cancelBtn) cancelBtn.classList.add('hidden');
    if (saveBtn) {
        // Stílus változatlan szerkesztéshez képest; semmit nem állítunk át
        const span = saveBtn.querySelector('span[data-translate-key]');
        if (span) { span.dataset.translateKey = 'palletsSaveTransaction'; span.innerHTML = i18n.palletsSaveTransaction; }
    }
    if (titleEl) {
        titleEl.dataset.translateKey = 'palletsNewTransaction';
        titleEl.textContent = i18n.palletsNewTransaction;
    }
}

// 1:1 gomb működése – érték másolása a másik mezőbe
function copyPalletOneToOne() {
    const givenEl = document.getElementById('palletGiven');
    const takenEl = document.getElementById('palletTaken');
    if (!givenEl || !takenEl) return;

    const activeId = document.activeElement && document.activeElement.id ? document.activeElement.id : '';
    const givenVal = (givenEl.value || '').trim();
    const takenVal = (takenEl.value || '').trim();

    const dispatch = (el) => { try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch(_) {} };

    // Elsőbbség: a fókuszban lévő mező értéke megy át a másikba, ha nem üres
    if (activeId === 'palletGiven' && givenVal) {
        takenEl.value = givenVal;
        dispatch(takenEl);
        return;
    }
    if (activeId === 'palletTaken' && takenVal) {
        givenEl.value = takenVal;
        dispatch(givenEl);
        return;
    }

    // Második: ha csak az egyik mező nem üres, azt másoljuk át a másikba
    if (givenVal && !takenVal) {
        takenEl.value = givenVal;
        dispatch(takenEl);
        return;
    }
    if (takenVal && !givenVal) {
        givenEl.value = takenVal;
        dispatch(givenEl);
        return;
    }
    // Ha mindkettő üres vagy mindkettő kitöltött, nem írunk felül semmit
}

if (typeof window !== 'undefined') { window.copyPalletOneToOne = copyPalletOneToOne; }

async function resolvePalletCompanyId(uid) {
    var windowCompanyId = (window.userCompanyId != null && window.userCompanyId !== '')
        ? String(window.userCompanyId).trim() || null
        : null;

    if (!uid) {
        return { ok: true, usedCompanyId: null, profileCompanyId: null, windowCompanyId: windowCompanyId };
    }
    if (typeof window.getCompanyId !== 'function') {
        console.error('[Pallets] resolvePalletCompanyId: getCompanyId unavailable');
        return { ok: false, error: 'getCompanyId unavailable' };
    }

    var fromProfile;
    try {
        fromProfile = await window.getCompanyId(uid);
    } catch (e) {
        console.error('[Pallets] resolvePalletCompanyId profile read failed:', e && e.message);
        return {
            ok: false,
            error: (e && e.message) ? String(e.message) : 'profile read failed'
        };
    }

    var profileCompanyId = (fromProfile != null && fromProfile !== '')
        ? String(fromProfile).trim() || null
        : null;
    var usedCompanyId = profileCompanyId;

    if (!profileCompanyId && windowCompanyId) {
        console.warn('[Pallets] ignoring stale window.userCompanyId because profile/info.companyId is null', {
            windowCompanyId: windowCompanyId
        });
    }
    if (profileCompanyId && windowCompanyId && windowCompanyId !== profileCompanyId) {
        console.warn('[Pallets] companyId mismatch, using profile/info companyId', {
            windowCompanyId: windowCompanyId,
            profileCompanyId: profileCompanyId,
            usedCompanyId: usedCompanyId
        });
    }
    if (profileCompanyId) {
        window.userCompanyId = profileCompanyId;
    }

    return {
        ok: true,
        usedCompanyId: usedCompanyId,
        profileCompanyId: profileCompanyId,
        windowCompanyId: windowCompanyId
    };
}

function applyPalletRecordLocally(recordToSave, isEdit) {
    if (isEdit) {
        const recordIndex = palletRecords.findIndex(function (p) { return String(p.id) === String(recordToSave.id); });
        if (recordIndex > -1) palletRecords[recordIndex] = recordToSave;
        else palletRecords.push(recordToSave);
    } else {
        palletRecords.push(recordToSave);
    }
    window.palletRecords = palletRecords;
}

function editPalletEntry(id) {
    const record = palletRecords.find(p => p.id === String(id));
    if (!record) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (typeof window.canEditQueuedEntryOffline === 'function' && !window.canEditQueuedEntryOffline(record)) {
            if (typeof window.showSyncedRecordReadOnlyAlert === 'function') window.showSyncedRecordReadOnlyAlert();
            return;
        }
    }

    editingPalletId = String(id);
    safeSetValue('palletDate', record.date);
    safeSetValue('palletLocation', record.location);
    safeSetValue('palletGiven', record.palletsGiven || '');
    safeSetValue('palletTaken', record.palletsTaken || '');
    selectedPalletType = record.type || 'EUR';
    renderPalletTypeSelector();
    
    document.getElementById('palletsTitle')?.scrollIntoView({ behavior: 'smooth' });

    // Edit mód UI jelzés
    const formContainer = document.getElementById('pallet-form-container');
    const cancelBtn = document.getElementById('pallet-cancel-btn');
    const saveBtn = document.getElementById('pallet-save-btn');
    const titleEl = document.getElementById('pallet-form-title');
    const i18n = translations[currentLang];
    if (formContainer) { formContainer.classList.add('editing'); }
    if (cancelBtn) { cancelBtn.classList.remove('hidden'); cancelBtn.onclick = () => resetPalletForm(); }
    if (saveBtn) {
        // Stílus változatlan marad; csak felirat lehetne változó igény szerint – most is marad az eredeti
        const span = saveBtn.querySelector('span[data-translate-key]');
        if (span) { span.dataset.translateKey = 'palletsSaveTransaction'; span.innerHTML = i18n.palletsSaveTransaction; }
    }
    if (titleEl) {
        titleEl.removeAttribute('data-translate-key');
        titleEl.textContent = i18n.edit || 'Edit';
    }
    const firstInput = document.getElementById('palletLocation') || document.getElementById('palletGiven') || document.getElementById('palletTaken');
    if (firstInput && typeof firstInput.focus === 'function') { firstInput.focus(); }
    void initPalletLicensePlateField({ plate: record.licensePlate || '' });
}

async function savePalletEntry() {
    
    // Előfizetés ellenőrzés
    if (!window.hasFeatureAccess('maxPallets')) { window.showUpgradePrompt?.('maxPallets'); return; }
const i18n = translations[currentLang];

    try {
        const effectiveTier = (typeof window.getEffectiveSubscriptionTier === 'function')
            ? window.getEffectiveSubscriptionTier()
            : 'free';
        if (effectiveTier === 'free') {
            selectedPalletType = 'EUR';
        }
    } catch (_) {}
    const date = document.getElementById('palletDate')?.value;
    const location = document.getElementById('palletLocation')?.value.trim();
    const palletsGiven = parseInt(document.getElementById('palletGiven')?.value, 10) || 0;
    const palletsTaken = parseInt(document.getElementById('palletTaken')?.value, 10) || 0;
    const licensePlate = readPalletLicensePlateFromField();

    if (!date || !location || (palletsGiven === 0 && palletsTaken === 0)) {
        showCustomAlert(i18n.palletInvalidData, "info");
        return;
    }

    var pendingLink = window.pendingPalletWaybillLink || null;
    window.pendingPalletWaybillLink = null;
    var existingRecord = editingPalletId ? palletRecords.find(p => p.id === String(editingPalletId)) : null;
    var resolvedCompanyId = null;
    if (currentUser && currentUser.uid) {
        var companyResolve = await resolvePalletCompanyId(currentUser.uid);
        if (!companyResolve.ok) {
            console.error('[Pallets] companyId resolve failed', companyResolve.error);
            showCustomAlert((i18n.palletCloudSaveErrorPrefix || 'Hiba a felhőbe mentéskor: ') + (companyResolve.error || 'Nem sikerült beolvasni a profil cégazonosítóját.'), 'info');
            return;
        }
        resolvedCompanyId = companyResolve.usedCompanyId;
        console.log('[Pallets] rules companyId check', {
            windowCompanyId: companyResolve.windowCompanyId,
            profileCompanyId: companyResolve.profileCompanyId,
            usedCompanyId: companyResolve.usedCompanyId,
            rulesWouldAccept: companyResolve.usedCompanyId === companyResolve.profileCompanyId
        });
    }
    let recordToSave = {
        id: editingPalletId ? String(editingPalletId) : String(Date.now()),
        date, location, palletsGiven, palletsTaken, type: selectedPalletType, licensePlate,
        companyId: resolvedCompanyId,
        waybillId: (pendingLink && pendingLink.waybillId) || (existingRecord && existingRecord.waybillId) || null,
        waybillEntryId: (pendingLink && pendingLink.waybillEntryId) || (existingRecord && existingRecord.waybillEntryId) || null
    };

    try {
        const effectiveTier = (typeof window.getEffectiveSubscriptionTier === 'function')
            ? window.getEffectiveSubscriptionTier()
            : 'free';
        if (effectiveTier === 'free' && !editingPalletId && window.currentUser && typeof window.tryConsumeDailyQuota === 'function') {
            const dailyLimit = 3;
            const r = await window.tryConsumeDailyQuota(window.currentUser.uid, 'palletEntries', 1, dailyLimit);
            if (!r || r.ok !== true) {
                showCustomAlert(i18n.pallets_daily_quota_reached || 'Elérted a napi raklap rögzítési limitet. (Free: 3/nap)', 'info');
                return;
            }
        }
    } catch (_) {}

    const isEdit = !!editingPalletId;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (isEdit) {
            if (typeof window.canEditQueuedEntryOffline === 'function' && existingRecord && !window.canEditQueuedEntryOffline(existingRecord)) {
                if (typeof window.showSyncedRecordReadOnlyAlert === 'function') window.showSyncedRecordReadOnlyAlert();
                return;
            }
        } else if (typeof window.gateOfflineCreate === 'function' && !window.gateOfflineCreate('pallet')) {
            return;
        }
    }

    if (licensePlate) localStorage.setItem('lastPalletLicensePlate', licensePlate);

    if (currentUser) {
        var uid = currentUser.uid;
        var hasOldLink = existingRecord && existingRecord.waybillId && existingRecord.waybillEntryId;
        var hasNewLink = !!(recordToSave.waybillId && recordToSave.waybillEntryId);
        var needRelink = isEdit && (hasOldLink || hasNewLink);
        var firestorePath = 'users/' + uid + '/pallets/' + recordToSave.id;

        console.log('[Pallets] savePalletEntry start', {
            id: recordToSave.id,
            uid: uid,
            pendingLink: pendingLink,
            hasNewLink: hasNewLink,
            needRelink: needRelink,
            isEdit: isEdit,
            resolvedCompanyId: recordToSave.companyId,
            firestorePath: firestorePath
        });

        try {
            if (needRelink && typeof window.updatePalletAndRelinkWaybillTransaction === 'function') {
                console.log('[Pallets] save branch: updatePalletAndRelinkWaybillTransaction', firestorePath);
                await window.updatePalletAndRelinkWaybillTransaction(uid, recordToSave.id, existingRecord, recordToSave);
            } else if (hasNewLink && typeof window.savePalletAndLinkWaybillTransaction === 'function') {
                console.log('[Pallets] save branch: savePalletAndLinkWaybillTransaction', firestorePath);
                await window.savePalletAndLinkWaybillTransaction(uid, recordToSave);
            } else {
                console.log('[Pallets] save branch: saveSyncedEntry', firestorePath);
                if (typeof window.saveSyncedEntry !== 'function') {
                    throw new Error('saveSyncedEntry unavailable (syncManager not loaded)');
                }
                var payload = Object.assign({}, recordToSave, { _collection: 'pallets', _docId: recordToSave.id });
                var result = await window.saveSyncedEntry(payload, db, uid);
                result = result && typeof result.status === 'string' ? result : { status: 'failed', errorCode: 'unknown' };
                console.log('[Pallets] save result', {
                    status: result.status,
                    errorCode: result.errorCode || null,
                    firestorePath: firestorePath
                });
                if (result.status === 'failed') {
                    console.error('[Pallets] save failed', result.errorCode, result.errorMessage);
                    var failMsg = i18n.palletCloudSaveErrorPrefix || 'Hiba a felhőbe mentéskor: ';
                    if (result.errorCode === 'permission-denied') {
                        failMsg = (i18n.palletPermissionDenied || 'A raklap mentése nem engedélyezett (jogosultság / cégazonosító). Ellenőrizd a profil beállításokat, vagy próbáld újra bejelentkezés után.');
                    } else if (result.errorMessage) {
                        failMsg += result.errorMessage;
                    }
                    showCustomAlert(failMsg, 'info');
                    return;
                }
                if (result.status === 'queued') {
                    if (typeof window.stampQueuedEntryFields === 'function') {
                        recordToSave = window.stampQueuedEntryFields(recordToSave);
                    }
                    showCustomAlert((translations && translations[currentLang] && translations[currentLang].offlineEntryQueued) || 'Raklap offline mentve, szinkronizálás később.', 'info');
                    if (typeof window.updatePendingBadge === 'function') window.updatePendingBadge();
                }
            }

            console.log('[Pallets] local array update before, count:', palletRecords.length);
            applyPalletRecordLocally(recordToSave, isEdit);
            console.log('[Pallets] local array update after, count:', palletRecords.length);

            if (!isEdit && window.ActivityTracker && typeof window.ActivityTracker.trackPalletCreated === 'function') {
                window.ActivityTracker.trackPalletCreated(1).catch(function (err) { console.warn('[Pallets] Activity tracking failed:', err); });
            }
        } catch (error) {
            console.error('[Pallets] Firestore save failed', error && error.code, error);
            showCustomAlert((i18n.palletCloudSaveErrorPrefix || 'Hiba a felhőbe mentéskor: ') + (error && error.message ? error.message : String(error)), 'info');
            return;
        }
    } else {
        applyPalletRecordLocally(recordToSave, isEdit);
        localStorage.setItem('palletRecords', JSON.stringify(palletRecords));
        if (existingRecord && existingRecord.waybillId && existingRecord.waybillEntryId && (!recordToSave.waybillId || !recordToSave.waybillEntryId || recordToSave.waybillId !== existingRecord.waybillId || recordToSave.waybillEntryId !== existingRecord.waybillEntryId) && typeof window.removePalletIdFromWaybillEntry === 'function') {
            try { window.removePalletIdFromWaybillEntry(existingRecord.waybillId, existingRecord.waybillEntryId, recordToSave.id); } catch (e) { console.warn('[Pallets] Unlink on edit failed:', e); }
        }
        if (recordToSave.waybillId && recordToSave.waybillEntryId && typeof window.addPalletIdToWaybillEntry === 'function') {
            try { window.addPalletIdToWaybillEntry(recordToSave.waybillId, recordToSave.waybillEntryId, recordToSave.id, recordToSave); } catch (e) { console.warn('[Pallets] Link to waybill entry failed:', e); }
        }
    }
    
    const successMessage = editingPalletId ? i18n.palletEditSuccess : i18n.palletSaveSuccess;
    showCustomAlert(successMessage, "success");
    resetPalletForm();
    renderPalletRecords();
    updateUniquePalletLocations();

    if (window.returnToWaybillEntryId && typeof window.showTab === 'function' && typeof window.highlightWaybillEntryId === 'function') {
        var entryIdToHighlight = window.returnToWaybillEntryId;
        window.returnToWaybillEntryId = null;
        window.showTab('waybill');
        setTimeout(function() { window.highlightWaybillEntryId(entryIdToHighlight); }, 350);
    }
}

async function deletePalletEntry(id) {
    const i18n = translations[currentLang];
    const record = palletRecords.find(p => p.id === String(id));
    if (typeof navigator !== 'undefined' && !navigator.onLine && record) {
        if (typeof window.canEditQueuedEntryOffline === 'function' && !window.canEditQueuedEntryOffline(record)) {
            if (typeof window.showSyncedRecordReadOnlyAlert === 'function') window.showSyncedRecordReadOnlyAlert();
            return;
        }
    }
    showCustomAlert(
        i18n.alertConfirmDelete, 
        'warning', 
        async () => {
            if (currentUser) {
                try {
                    if (record && record.waybillId && record.waybillEntryId && typeof window.deletePalletAndUnlinkWaybillTransaction === 'function') {
                        await window.deletePalletAndUnlinkWaybillTransaction(currentUser.uid, String(id), record.waybillId, record.waybillEntryId);
                    } else {
                        await db.collection('users').doc(currentUser.uid).collection('pallets').doc(String(id)).delete();
                    }
                } catch (error) {
                    showCustomAlert((i18n.palletDeleteErrorPrefix || 'Hiba a törléskor: ') + error.message, 'info');
                    return;
                }
            } else {
                if (record && record.waybillId && record.waybillEntryId && typeof window.removePalletIdFromWaybillEntry === 'function') {
                    try { window.removePalletIdFromWaybillEntry(record.waybillId, record.waybillEntryId, String(id)); } catch (e) { console.warn('[Pallets] Unlink from waybill on delete failed:', e); }
                }
            }
            palletRecords = palletRecords.filter(p => p.id !== String(id));
            window.palletRecords = palletRecords;
            if (!currentUser) {
                localStorage.setItem('palletRecords', JSON.stringify(palletRecords));
            }
            renderPalletRecords();
        },
        { confirmText: i18n.delete, confirmClass: 'bg-red-500 hover:bg-red-600' }
    );
}

function updatePalletBalance() {
    const i18n = translations[currentLang];
    const displayEl = document.getElementById('palletBalanceDisplay');
    if (!displayEl) return;

    const palletMode = localStorage.getItem('palletMode') || 'single';
    let balanceHTML = '';
    const unitLabel = i18n.palletsUnitPieces || 'db';

    if (palletMode === 'single') {
        const balance = palletRecords.reduce((acc, curr) => acc + (curr.palletsTaken || 0) - (curr.palletsGiven || 0), 0);
        const colorClass = balance > 0 ? 'text-green-600 dark:text-green-400' : (balance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-200');
        balanceHTML = `<p class="text-2xl font-bold ${colorClass}">${balance} ${unitLabel}</p>`;
    } else {
        const types = getPalletTypes();
        let totalBalance = 0;
        const balanceDetails = types.map(type => {
            if (!palletRecords.some(r => r.type === type)) return ''; 
            const balance = palletRecords
                .filter(record => record.type === type)
                .reduce((acc, curr) => acc + (curr.palletsTaken || 0) - (curr.palletsGiven || 0), 0);
            totalBalance += balance;
            const colorClass = balance > 0 ? 'text-green-600 dark:text-green-400' : (balance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400');
            return `<span class="font-semibold ${colorClass}">${type}: ${balance} ${unitLabel}</span>`;
        }).filter(Boolean).join(' / ');

        const totalColorClass = totalBalance > 0 ? 'text-green-600 dark:text-green-400' : (totalBalance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-700 dark:text-gray-200');
        balanceHTML = `
            <p class="text-2xl font-bold ${totalColorClass}">${totalBalance} ${unitLabel}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${balanceDetails}</p>
        `;
    }
    displayEl.innerHTML = `<p class="text-sm font-medium">${i18n.palletsBalance}</p>${balanceHTML}`;
}

async function renderPalletsQuotaBanner() {
    try {
        const banner = document.getElementById('pallets-quota-banner');
        if (!banner) return;
        if (!window.currentUser || !window.currentUser.uid) {
            banner.classList.add('hidden');
            banner.innerHTML = '';
            return;
        }

        const effectiveTier = (typeof window.getEffectiveSubscriptionTier === 'function')
            ? window.getEffectiveSubscriptionTier()
            : 'free';
        if (effectiveTier !== 'free') {
            banner.classList.add('hidden');
            banner.innerHTML = '';
            return;
        }

        const uid = window.currentUser.uid;
        const usage = (typeof window.getDailyUsage === 'function') ? await window.getDailyUsage(uid) : null;
        const used = usage && typeof usage.palletEntries === 'number'
            ? usage.palletEntries
            : (usage && usage.palletEntries ? Number(usage.palletEntries) : 0);
        const limit = 3;
        banner.classList.remove('hidden');
        banner.innerHTML = '<div class="font-semibold text-gray-900 dark:text-gray-100">🆓 Free napi limit</div>' +
            '<div class="mt-1 text-sm text-gray-700 dark:text-gray-300">Raklap tranzakció ma: <strong>' + String(Math.max(0, used || 0)) + ' / ' + String(limit) + '</strong></div>';
    } catch (_) {}
}

function renderPalletRecords(options) {
    const pageOnly = options && options.pageOnly;

    if (!pageOnly) {
        renderPalletTypeSelector();
        try { renderPalletsQuotaBanner(); } catch (_) {}
        if (typeof window.refreshOfflinePolicyUi === 'function') {
            try { window.refreshOfflinePolicyUi(); } catch (_) {}
        }
        updatePalletBalance();
        if (!editingPalletId) {
            safeSetValue('palletDate', new Date().toISOString().split('T')[0]);
            void initPalletLicensePlateField();
        } else {
            void initPalletLicensePlateField({ preserveValue: true });
        }
    }

    const i18n = translations[currentLang];
    const container = document.getElementById('palletRecordsContainer');
    if (!container) return;

    palletsSortedCache = getPalletsSortedRecords();
    const totalItems = palletsSortedCache.length;

    if (totalItems === 0) {
        container.innerHTML = `<p class="text-center text-gray-500 py-4">${i18n.palletsNoTransactions}</p>`;
        palletsCurrentPage = 1;
        renderPalletsPaginationControls(1, 0);
        return;
    }

    const { totalPages } = getPalletsPaginationTotals();
    clampPalletsCurrentPage(totalPages);

    const startIndex = (palletsCurrentPage - 1) * palletsPageSize;
    const pageRecords = palletsSortedCache.slice(startIndex, startIndex + palletsPageSize);

    if (!pageRecords.length) {
        container.innerHTML = `<p class="text-center text-gray-500 py-4">${i18n.palletsNoTransactions}</p>`;
        renderPalletsPaginationControls(totalPages, totalItems);
        if (options && options.scrollToTop) {
            requestAnimationFrame(scrollPalletsListToTop);
        }
        return;
    }

    const unitLabel = i18n.palletsUnitPieces || 'db';
    container.innerHTML = pageRecords.map(p => {
        const taken = p.palletsTaken || 0;
        const given = p.palletsGiven || 0;
        const diff = taken - given;
        let colorClass, borderColorClass, quantityText;
        if (diff > 0) {
            borderColorClass = 'border-green-500'; colorClass = 'text-green-700 dark:text-green-300'; quantityText = `+${diff}`;
        } else if (diff < 0) {
            borderColorClass = 'border-red-500'; colorClass = 'text-red-700 dark:text-red-300'; quantityText = `${diff}`;
        } else {
            borderColorClass = 'border-gray-400'; colorClass = 'text-gray-500 dark:text-gray-400'; quantityText = `⇄ ${taken}`;
        }
        const detailsHTML = [
            p.type ? `<span class="mt-1 text-xs font-semibold bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-full">${p.type}</span>` : '',
            p.licensePlate ? `<p class="text-xs text-gray-400 mt-1">${i18n.palletsLicensePlateLabel}: ${p.licensePlate}</p>` : ''
        ].filter(Boolean).join('');
        const waybillInfo = (p.waybillId || p.waybillEntryId) ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Menetlevél: ${(p.waybillId || '').toString().slice(0, 12)}${p.waybillEntryId ? ' · ' + (p.waybillEntryId || '').toString().slice(0, 12) : ''}</p>` : '';
        const canEditPallet = (typeof navigator === 'undefined' || navigator.onLine || (typeof window.canEditQueuedEntryOffline === 'function' && window.canEditQueuedEntryOffline(p)));
        const actionBtns = canEditPallet
            ? `<button onclick="editPalletEntry('${p.id}')" title="${i18n.edit || 'Szerkesztés'}" class="text-blue-500 hover:text-blue-700 p-1 text-lg">✏️</button>
                 <button onclick="deletePalletEntry('${p.id}')" title="${i18n.delete || 'Törlés'}" class="text-gray-400 hover:text-red-500 p-1 text-lg">🗑️</button>`
            : '';
        return `
        <div class="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border-l-4 ${borderColorClass} flex items-center justify-between">
            <div>
                <p class="font-semibold">${p.location}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">${p.date}</p>
                <div class="flex items-center gap-2 mt-1">${detailsHTML}</div>
                ${waybillInfo}
            </div>
            <div class="text-right">
                 <p class="font-bold text-lg ${colorClass}">${quantityText} ${unitLabel}</p>
                 <p class="text-xs text-gray-400">(+${taken} / -${given}) ${unitLabel}</p>
                 ${actionBtns}
            </div>
        </div>`;
    }).join('');

    renderPalletsPaginationControls(totalPages, totalItems);

    if (options && options.scrollToTop) {
        requestAnimationFrame(scrollPalletsListToTop);
    }
}

function renderPalletTypeSelector() {
    const container = document.getElementById('pallet-type-selector');
    if (!container) return;

    try {
        const effectiveTier = (typeof window.getEffectiveSubscriptionTier === 'function')
            ? window.getEffectiveSubscriptionTier()
            : 'free';
        if (effectiveTier === 'free') {
            selectedPalletType = 'EUR';
            container.innerHTML = `<button class="w-full text-left font-semibold p-2 rounded-lg bg-green-100 dark:bg-green-800/50 text-gray-800 dark:text-gray-100 cursor-default">✓ EUR</button>`;
            return;
        }
    } catch (_) {}

    const palletMode = localStorage.getItem('palletMode') || 'single';
    if (palletMode === 'single') {
        selectedPalletType = 'EUR';
        container.innerHTML = `<button class="w-full text-left font-semibold p-2 rounded-lg bg-green-100 dark:bg-green-800/50 text-gray-800 dark:text-gray-100 cursor-default">✓ EUR</button>`;
    } else {
        const types = getPalletTypes();
        if (!types.includes(selectedPalletType)) selectedPalletType = 'EUR';
        container.innerHTML = types.map(type => {
            const isActive = type === selectedPalletType;
            const activeClass = isActive ? 'bg-green-100 dark:bg-green-800/50' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600';
            return `<button onclick="selectPalletType('${type}')" class="font-semibold p-2 rounded-lg text-sm ${activeClass} text-gray-800 dark:text-gray-100">${isActive ? '✓ ' : ''}${type}</button>`;
        }).join('');
    }
}

function selectPalletType(type) {
    try {
        const effectiveTier = (typeof window.getEffectiveSubscriptionTier === 'function')
            ? window.getEffectiveSubscriptionTier()
            : 'free';
        if (effectiveTier === 'free') {
            selectedPalletType = 'EUR';
            renderPalletTypeSelector();
            return;
        }
    } catch (_) {}
    selectedPalletType = type;
    renderPalletTypeSelector();
}

function generatePalletReport() {
    const i18n = translations[currentLang];
    if (palletRecords.length === 0) {
        showCustomAlert(i18n.alertNoPalletData, "info");
        return;
    }
    const now = new Date();
    const monthSelector = document.getElementById('palletReportMonthSelector');
    if (monthSelector) monthSelector.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dateFrom = document.getElementById('palletReportDateFrom');
    if (dateFrom) dateFrom.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const dateTo = document.getElementById('palletReportDateTo');
    if (dateTo) dateTo.value = now.toISOString().split('T')[0];

    const tabMonthly = document.getElementById('pallet-report-tab-monthly');
    const tabCustom = document.getElementById('pallet-report-tab-custom');
    const monthlyView = document.getElementById('pallet-report-monthly-view');
    const customView = document.getElementById('pallet-report-custom-view');

    const toggleTabs = (isMonthlyActive) => {
        tabMonthly.classList.toggle('active', isMonthlyActive);
        tabCustom.classList.toggle('active', !isMonthlyActive);
        monthlyView.classList.toggle('hidden', !isMonthlyActive);
        customView.classList.toggle('hidden', isMonthlyActive);
    };
    tabMonthly?.addEventListener('click', () => toggleTabs(true));
    tabCustom?.addEventListener('click', () => toggleTabs(false));
    toggleTabs(true);

    const palletMode = localStorage.getItem('palletMode') || 'single';
    const container = document.getElementById('pallet-report-types-container');
    if(!container) return;

    if (palletMode === 'single') {
        container.innerHTML = `<label class="hidden"><input type="checkbox" value="EUR" checked class="pallet-report-checkbox"></label>`;
    } else {
        const types = getPalletTypes().filter(type => palletRecords.some(r => r.type === type));
        if (types.length === 0) {
            showCustomAlert(i18n.alertNoPalletData, "info");
            return;
        }
        container.innerHTML = types.map(type => `
            <label class="pallet-report-label">
                <span class="pallet-report-label-text font-bold text-lg">${type}</span>
                <input type="checkbox" value="${type}" class="pallet-report-checkbox" checked>
            </label>`).join('');
    }
    document.querySelectorAll('.pallet-report-checkbox').forEach(checkbox => {
        togglePalletReportLabel(checkbox);
        checkbox.addEventListener('change', () => togglePalletReportLabel(checkbox));
    });
    showPalletReportModal();
}

function togglePalletReportLabel(checkbox) {
    const label = checkbox.closest('.pallet-report-label');
    if (!label) return;
    const span = label.querySelector('.pallet-report-label-text') || label.querySelector('span');
    if (!span) return;
    label.classList.toggle('is-selected', checkbox.checked);
    label.classList.toggle('border-green-500', checkbox.checked);
    label.classList.toggle('bg-green-100', checkbox.checked);
    label.classList.toggle('dark:bg-green-900/50', checkbox.checked);
    label.classList.toggle('border-gray-200', !checkbox.checked);
    label.classList.toggle('dark:border-gray-600', !checkbox.checked);
    if (checkbox.checked && !span.textContent.startsWith('✓')) {
        span.textContent = '✓ ' + span.textContent;
    } else if (!checkbox.checked && span.textContent.startsWith('✓')) {
        span.textContent = span.textContent.substring(2);
    }
}

function showPalletReportModal() {
    const overlay = document.getElementById('pallet-report-modal-overlay');
    if (!overlay) return;
    overlay.classList.add('flex');
    overlay.classList.remove('hidden');
    try {
        overlay.dataset.prevBodyOverflow = document.body.style.overflow || '';
        document.body.style.overflow = 'hidden';
    } catch (_) {}
    try { overlay.scrollTop = 0; } catch (_) {}
}

function hidePalletReportModal() {
    const overlay = document.getElementById('pallet-report-modal-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.classList.remove('flex');
    try {
        document.body.style.overflow = overlay.dataset.prevBodyOverflow || '';
        delete overlay.dataset.prevBodyOverflow;
    } catch (_) {}
}

// Lokális Unicode font betöltés (ő/ű támogatás)
async function loadLocalReportFontForPallets(doc) {
    try {
        const fontUrl = 'assets/fonts/NotoSans-Regular.ttf';
        const res = await fetch(fontUrl, { cache: 'force-cache' });
        if (!res.ok) throw new Error('Font fetch failed');
        const buf = await res.arrayBuffer();
        const base64 = (function arrayBufferToBase64(buffer) {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
            return btoa(binary);
        })(buf);
        doc.addFileToVFS('NotoSans-Regular.ttf', base64);
        doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
        return 'NotoSans';
    } catch (e) {
        console.warn('[Pallets Report] Local font load failed, falling back to helvetica', e);
        return 'helvetica';
    }
}

async function createSelectedPalletReport() {
    const reportLang = (typeof window !== 'undefined' && typeof window.getReportLanguage === 'function')
        ? window.getReportLanguage()
        : ((typeof currentLang === 'string' && currentLang) ? currentLang : (localStorage.getItem('language') || 'hu'));
    const i18n = (translations[reportLang] || translations[currentLang] || translations['hu'] || {});
    const t = (key, fallback) => (i18n && typeof i18n[key] === 'string' && i18n[key]) ? i18n[key] : fallback;
    const s = (v, fb = '') => {
        const val = (v === undefined || v === null || v === false) ? fb : v;
        return String(val);
    };
    const unitLabel = t('palletsUnitPieces', 'db');

    const userName = localStorage.getItem('userName') || 'N/A';
    let startDate, endDate, dateRangeTitle;
    const isMonthly = !!document.getElementById('pallet-report-tab-monthly')?.classList.contains('active');

    if (isMonthly) {
        const monthEl = document.getElementById('palletReportMonthSelector');
        const monthValue = monthEl && monthEl.value ? monthEl.value : new Date().toISOString().slice(0,7);
        startDate = `${monthValue}-01`;
        const [year, month] = monthValue.split('-');
        endDate = `${monthValue}-${new Date(year, month, 0).getDate()}`;
        const locale = (typeof getCurrentLocale === 'function') ? getCurrentLocale() : (reportLang === 'de' ? 'de-DE' : (reportLang === 'en' ? 'en-US' : (reportLang === 'ro' ? 'ro-RO' : (reportLang === 'pl' ? 'pl-PL' : 'hu-HU'))));
        dateRangeTitle = new Date(startDate).toLocaleDateString(locale, { year: 'numeric', month: 'long' });
    } else {
        const fromEl = document.getElementById('palletReportDateFrom');
        const toEl = document.getElementById('palletReportDateTo');
        startDate = fromEl && fromEl.value ? fromEl.value : '';
        endDate = toEl && toEl.value ? toEl.value : '';
        if (!startDate || !endDate) {
            showCustomAlert(t('palletsSelectValidRange','Kérlek válassz érvényes időszakot!'), 'info');
            return;
        }
        dateRangeTitle = `${startDate} - ${endDate}`;
    }

    const selectedTypes = Array.from(document.querySelectorAll('.pallet-report-checkbox:checked')).map(cb => cb.value);
    if (selectedTypes.length === 0) {
        showCustomAlert(t('palletsSelectTypeRequired','Kérlek, válassz legalább egy raklaptípust!'), 'info');
        return;
    }
    hidePalletReportModal();

    try {
        if (typeof window.ensureJsPdf === 'function') {
          try { await window.ensureJsPdf(); } catch (pdfErr) {
            showCustomAlert(t('palletsPdfLoadFailed', 'PDF könyvtár betöltése sikertelen.'), 'info');
            return;
          }
        }
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const preferredFont = (typeof loadLocalReportFontForPallets === 'function') ? await loadLocalReportFontForPallets(doc) : 'helvetica';
        doc.setFontSize(18);
        try { doc.setFont(preferredFont, 'bold'); } catch(_) { doc.setFont(preferredFont, 'normal'); }
        doc.text(s(t('palletReportTitle','Raklap riport')), 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont(preferredFont, 'normal');
        doc.text(s(userName,'N/A'), 105, 23, { align: 'center' });
        doc.text(s(dateRangeTitle,''), 105, 30, { align: 'center' });

        let yPos = 45;
        let hasData = false;
        selectedTypes.forEach((type, typeIndex) => {
            const typeRecords = palletRecords
                .filter(r => r.type === type && r.date >= startDate && r.date <= endDate)
                .sort((a, b) => new Date(a.date) - new Date(b.date));
            if (typeRecords.length === 0) return;
            hasData = true;
            if (yPos > 220 && typeIndex > 0) { doc.addPage(); yPos = 20; }
            if (typeIndex > 0) { yPos += 10; }
            const finalBalance = typeRecords.reduce((acc, p) => acc + (p.palletsTaken || 0) - (p.palletsGiven || 0), 0);
            doc.setFontSize(14);
            try { doc.setFont(preferredFont, 'bold'); } catch(_) { doc.setFont(preferredFont, 'normal'); }
            doc.text(`${s(type)} - ${s(t('palletsBalance','Egyenleg'))} ${finalBalance >= 0 ? '+' : ''}${finalBalance} ${unitLabel}`, 15, yPos);
            yPos += 10;
            const headers = [
                s(t('palletReportHeaderDate','Dátum')),
                s(t('palletReportHeaderLocation','Helyszín')),
                s(t('palletReportHeaderGiven','Leadott')),
                s(t('palletReportHeaderTaken','Átvett')),
                s(t('palletReportHeaderPlate','Rendszám')),
                s(t('palletReportHeaderBalance','Egyenleg'))
            ];
            let runningBalance = 0;
            const tableBody = typeRecords.map(record => {
                runningBalance += (record.palletsTaken || 0) - (record.palletsGiven || 0);
                return [record.date, record.location, String(record.palletsGiven || 0), String(record.palletsTaken || 0), record.licensePlate || '-', `${runningBalance >= 0 ? '+' : ''}${runningBalance} ${unitLabel}`];
            });
            doc.autoTable({
                head: [headers],
                body: tableBody,
                startY: yPos,
                theme: 'grid',
                headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold', font: preferredFont },
                styles: { font: preferredFont },
                didDrawPage: (data) => { yPos = data.cursor.y; }
            });
        });
        if (!hasData) {
            showCustomAlert(i18n.alertNoPalletData, "info");
            return;
        }
        const fileBase = s(t('palletReportFileName','Raklap_riport'));
        const fileName = `${fileBase}-${s(userName,'N_A').replace(/\s+/g, "_")}-${new Date().toISOString().split("T")[0]}.pdf`;
        const pdfBlob = doc.output('blob');
        const viewerTitle = s(t('palletReportTitle', 'Raklap riport'));

        if (typeof window.previewAndOptionallyDownloadPdfBlob === 'function') {
            window.previewAndOptionallyDownloadPdfBlob(pdfBlob, fileName, {
                title: viewerTitle,
                onSaveFallback: function () { doc.save(fileName); }
            });
        } else {
            doc.save(fileName);
        }
    } catch (error) {
        console.error("PDF generation error:", error);
        const errPrefix = s(t('errorPdfGeneration','Hiba a PDF generálásakor:'));
        showCustomAlert(`${errPrefix} ${error && error.message ? error.message : ''}`, 'info');
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('gurigo:vehiclesChanged', function () {
        var palletsTab = document.getElementById('content-pallets');
        if (!palletsTab || palletsTab.offsetParent === null) return;
        void initPalletLicensePlateField({ preserveValue: true });
    });
}

async function debugPalletCompanyIdCheck(uid) {
    uid = uid || (typeof currentUser !== 'undefined' && currentUser && currentUser.uid) || (firebase.auth().currentUser && firebase.auth().currentUser.uid);
    if (!uid || !db) {
        console.warn('[Pallets] debugPalletCompanyIdCheck: missing uid or db');
        return null;
    }
    var snap = await db.collection('users').doc(uid).collection('profile').doc('info').get();
    var profileData = snap.exists ? (snap.data() || {}) : {};
    var profileCompanyId = profileData.companyId != null ? String(profileData.companyId) : null;
    var getCompanyIdResult = typeof window.getCompanyId === 'function' ? await window.getCompanyId(uid) : null;
    var report = {
        uid: uid,
        profileExists: snap.exists,
        profileInfoPath: 'users/' + uid + '/profile/info',
        profileCompanyId: profileCompanyId,
        profileCompanyFieldNames: Object.keys(profileData).filter(function (k) { return /company/i.test(k); }),
        getCompanyIdResult: getCompanyIdResult,
        windowUserCompanyId: window.userCompanyId,
        rulesUserCompanyIdWouldBe: profileCompanyId,
        payloadWouldMatchRules: profileCompanyId === getCompanyIdResult
    };
    console.log('[Pallets] debugPalletCompanyIdCheck', report);
    return report;
}
if (typeof window !== 'undefined') { window.debugPalletCompanyIdCheck = debugPalletCompanyIdCheck; }