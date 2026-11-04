// =======================================================
// ===== MENETLEVÉL (WAYBILL / FRACHTBRIEF) ===============
// =======================================================
// Spec: Menetlevél Feature Specification v1.0
// Fázis 1: Kitöltő UI, bejegyzések, fejléc/lábléc, localStorage
// Láthatóság: csak WAYBILL_ALLOWED_EMAILS-ben megadott e-mail címek (js/config/waybillAllowlist.js).
// Megj.: A modul mindig betölt, mert a betöltéskor currentUser még nincs (auth aszinkron). A menü és showTab() szűri, ki látja.

(function() {
  'use strict';

  const WAYBILL_DRAFT_KEY = 'waybill-draft';
  const COUNTRY_MAP = {
    at: 'A', de: 'D', hu: 'H', sk: 'SK', si: 'SLO', it: 'I', pl: 'PL', cz: 'CZ', ro: 'RO', ch: 'CH',
    fr: 'F', nl: 'NL', gb: 'UK', es: 'E', hr: 'HR', rs: 'SRB', bg: 'BG', gr: 'GR', tr: 'TR', ua: 'UA'
  };

  function toCountryCode(iso2) {
    if (!iso2) return '';
    const key = String(iso2).toLowerCase().slice(0, 2);
    return COUNTRY_MAP[key] || key.toUpperCase();
  }

  function t(key, fallback) {
    try {
      const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
      const v = i18n[key];
      return (v != null && v !== '') ? v : (fallback || key);
    } catch (_) { return fallback || key; }
  }

  function generateStableId(prefix) {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return prefix + crypto.randomUUID().replace(/-/g, '');
      }
    } catch (_) {}
    return prefix + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  function createDefaultWaybill() {
    var now = Date.now();
    return {
      id: generateStableId('wbl_'),
      docType: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedAtMs: now,
      status: 'active',
      companyId: null,
      header: {
        companyName: '',
        companyAddress: '',
        logoUrl: null,
        logoBase64: null,
        truckPlate: '',
        trailerPlate: '',
        driverName: (typeof loadSettings === 'function' && window.gurigoSettings && window.gurigoSettings.reportDriverName) ? window.gurigoSettings.reportDriverName : '',
        client: '',
        departureDate: new Date().toISOString().slice(0, 10),
        departureLocation: { country: '', zip: '', city: '' },
        departureKm: null
      },
      entries: [],
      footer: {
        arrivalDate: '',
        arrivalKm: null,
        totalKm: null,
        remarks: '',
        standingDays: 0,
        freightPrice: null
      }
    };
  }

  function mapEntryToSection(entry) {
    let section;
    if (entry.isExport && entry.isImport) {
      section = 'exImport';
    } else if (entry.isExport) {
      section = 'export';
    } else if (entry.isImport) {
      section = 'import';
    } else {
      return [];
    }
    let subGroup;
    if (entry.actionType === 'loading') {
      subGroup = 'ladest';
    } else if (entry.actionType === 'unloading') {
      subGroup = 'endladest';
    } else if (entry.actionType === 'loadUnload') {
      return [
        { section, subGroup: 'endladest', entry },
        { section, subGroup: 'ladest', entry }
      ];
    } else {
      return [];
    }
    return [{ section, subGroup, entry }];
  }

  function getSectionLabel(section) {
    if (section === 'exImport') return 'Ex-Import';
    if (section === 'export') return 'Export';
    if (section === 'import') return 'Import';
    return section;
  }

  function getActionLabel(actionType) {
    if (actionType === 'loading') return '📦 ' + t('waybill.loading', 'Berakodás');
    if (actionType === 'unloading') return '📤 ' + t('waybill.unloading', 'Kirakodás');
    if (actionType === 'loadUnload') return '🔄 ' + t('waybill.loadUnload', 'Ki- és Berakodás');
    return actionType;
  }

  function formatDateEu(isoDate) {
    if (!isoDate) return '';
    const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return isoDate;
    return m[3] + '.' + m[2] + '.' + m[1].slice(-2);
  }

  let currentWaybill = null;
  let waybillPdfBlob = null;
  let waybillPdfFileName = '';

  function ensureWaybillShape(wb) {
    if (!wb) return;
    if (!wb.header) wb.header = { companyName: '', companyAddress: '', logoUrl: null, logoBase64: null, truckPlate: '', trailerPlate: '', driverName: '', client: '', departureDate: '', departureLocation: { country: '', zip: '', city: '' }, departureKm: null };
    else if (!wb.header.departureLocation) wb.header.departureLocation = { country: '', zip: '', city: '' };
    if (!wb.footer) wb.footer = { arrivalDate: '', arrivalKm: null, totalKm: null, remarks: '', standingDays: 0, freightPrice: null };
    if (!Array.isArray(wb.entries)) wb.entries = [];
  }

  function loadWaybillFromStorage() {
    try {
      const raw = localStorage.getItem(WAYBILL_DRAFT_KEY);
      if (raw) {
        currentWaybill = JSON.parse(raw);
        if (currentWaybill) {
          ensureWaybillShape(currentWaybill);
          if (Array.isArray(currentWaybill.entries)) {
            currentWaybill.entries.forEach(function(e) {
              if (!e.id) e.id = generateStableId('ent_');
              if (!Array.isArray(e.palletTxIds)) e.palletTxIds = [];
            });
          }
        }
        if (!currentWaybill) currentWaybill = createDefaultWaybill();
        return currentWaybill;
      }
    } catch (_) {}
    currentWaybill = createDefaultWaybill();
    return currentWaybill;
  }

  function saveWaybillToStorage() {
    if (!currentWaybill) return;
    var nowMs = Date.now();
    currentWaybill.updatedAt = new Date().toISOString();
    currentWaybill.updatedAtMs = nowMs;
    try {
      localStorage.setItem(WAYBILL_DRAFT_KEY, JSON.stringify(currentWaybill));
    } catch (e) {
      console.warn('[Waybill] Local save failed:', e);
    }
    if (typeof navigator !== 'undefined' && navigator.onLine && window.currentUser && window.db && typeof window.saveWaybillDraftToFirestore === 'function') {
      (function() {
        var uid = window.currentUser.uid;
        var wb = currentWaybill;
        Promise.resolve().then(async function() {
          try {
            var companyId = (window.userCompanyId != null && window.userCompanyId !== '') ? window.userCompanyId : (typeof window.getCompanyId === 'function' ? await window.getCompanyId(uid) : null);
            wb.companyId = companyId != null ? companyId : null;
            wb.updatedAtMs = wb.updatedAtMs || Date.now();
            await window.saveWaybillDraftToFirestore(uid, wb);
          } catch (e) {
            console.warn('[Waybill] Firestore save failed:', e && e.message);
          }
        });
      })();
    }
  }

  function fillPlaceFromGps(inputs, statusEl, onComplete) {
    if (!navigator.geolocation) {
      if (statusEl) statusEl.textContent = 'GPS nem támogatott.';
      return;
    }
    if (statusEl) statusEl.textContent = 'Helymeghatározás…';
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        fetch('https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json')
          .then(function(r) { return r.json(); })
          .then(function(data) {
            const addr = data.address || {};
            const country = (addr.country_code || '').toLowerCase().slice(0, 2);
            const code = toCountryCode(country);
            if (inputs.country) inputs.country.value = code;
            if (inputs.zip) inputs.zip.value = addr.postcode || '';
            if (inputs.city) inputs.city.value = addr.city || addr.town || addr.village || addr.municipality || '';
            if (statusEl) statusEl.textContent = 'Kitöltve';
            if (typeof onComplete === 'function') onComplete(inputs);
          })
          .catch(function() {
            if (statusEl) statusEl.textContent = 'Cím lekérés sikertelen.';
          });
      },
      function() {
        if (statusEl) statusEl.textContent = 'GPS megtagadva.';
      }
    );
  }

  function showPalletModal(entry, onSave, onSkip) {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? translations[currentLang] : {};
    const loadedLabel = t('waybill.palletLoaded', 'Felrakott');
    const unloadedLabel = t('waybill.palletUnloaded', 'Lerakott');
    const swappedLabel = t('waybill.palletSwapped', 'Cserélt');
    const skipLabel = t('waybill.palletSkip', 'Kihagyás');
    const saveLabel = t('save', 'Mentés');
    const titleLabel = t('waybill.palletExchange', 'Paletta csere');

    let geladene = 0, abgeladene = 0, getauschte = 0;
    if (entry.actionType === 'loading') {
      geladene = '';
    } else if (entry.actionType === 'unloading') {
      abgeladene = '';
      getauschte = '';
    } else if (entry.actionType === 'loadUnload') {
      geladene = '';
      abgeladene = '';
      getauschte = '';
    }

    const modal = document.createElement('div');
    modal.id = 'waybill-pallet-modal';
    modal.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-4">
        <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">${titleLabel}</h3>
        <div class="space-y-3">
          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">${loadedLabel} (Geladene)</label>
            <input type="number" id="wb-pallet-loaded" class="w-full p-2 border rounded-lg" min="0" value="${geladene}" placeholder="0" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">${unloadedLabel} (Abgeladene)</label>
            <input type="number" id="wb-pallet-unloaded" class="w-full p-2 border rounded-lg" min="0" value="${abgeladene}" placeholder="0" />
          </div>
          <div>
            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-1">${swappedLabel} (Getauschte)</label>
            <input type="number" id="wb-pallet-swapped" class="w-full p-2 border rounded-lg" min="0" value="${getauschte}" placeholder="0" />
          </div>
        </div>
        <div class="flex gap-2 mt-4">
          <button type="button" id="wb-pallet-skip" class="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold">${skipLabel}</button>
          <button type="button" id="wb-pallet-save" class="flex-1 py-2 bg-blue-500 text-white rounded-lg font-semibold">${saveLabel}</button>
        </div>
      </div>
    `;

    modal.addEventListener('click', function(e) {
      if (e.target === modal) { modal.remove(); if (onSkip) onSkip(); }
    });

    document.body.appendChild(modal);

    const skipBtn = modal.querySelector('#wb-pallet-skip');
    const saveBtn = modal.querySelector('#wb-pallet-save');
    if (skipBtn) {
      skipBtn.addEventListener('click', function() {
        modal.remove();
        if (onSkip) onSkip();
      });
    }
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        const loadedEl = modal.querySelector('#wb-pallet-loaded');
        const unloadedEl = modal.querySelector('#wb-pallet-unloaded');
        const swappedEl = modal.querySelector('#wb-pallet-swapped');
        const loaded = loadedEl ? (parseInt(loadedEl.value, 10) || 0) : 0;
        const unloaded = unloadedEl ? (parseInt(unloadedEl.value, 10) || 0) : 0;
        const swapped = swappedEl ? (parseInt(swappedEl.value, 10) || 0) : 0;
        entry.pallets = { loaded, unloaded, swapped };
        modal.remove();
        if (onSave) onSave(entry);
      });
    }
  }

  function addEntry(actionType, isExport, isImport) {
    loadWaybillFromStorage();
    const dateEl = document.getElementById('wb-date');
    const kmEl = document.getElementById('wb-km');
    const countryEl = document.getElementById('wb-country');
    const zipEl = document.getElementById('wb-zip');
    const cityEl = document.getElementById('wb-city');

    const date = dateEl ? dateEl.value : new Date().toISOString().slice(0, 10);
    const km = kmEl && kmEl.value.trim() !== '' ? parseInt(kmEl.value, 10) : null;
    const country = countryEl ? countryEl.value.trim() : '';
    const zip = zipEl ? zipEl.value.trim() : '';
    const city = cityEl ? cityEl.value.trim() : '';

    const entry = {
      id: generateStableId('ent_'),
      timestamp: new Date().toISOString(),
      date,
      km,
      location: { country, zip, city },
      isExport: !!isExport,
      isImport: !!isImport,
      actionType,
      pallets: { loaded: 0, unloaded: 0, swapped: 0 },
      palletTxIds: [],
      hasPalletSwap: false,
      palletSummary: null,
      palletPending: false
    };

    showPalletModal(entry, function(updatedEntry) {
      var hasSwap = updatedEntry.pallets && (updatedEntry.pallets.swapped || 0) > 0;
      updatedEntry.hasPalletSwap = !!hasSwap;
      var hasIds = Array.isArray(updatedEntry.palletTxIds) && updatedEntry.palletTxIds.length > 0;
      updatedEntry.palletPending = hasSwap && !hasIds;
      currentWaybill.entries.push(updatedEntry);
      sortEntriesNewestFirst(currentWaybill.entries);
      recomputeFooter();
      saveWaybillToStorage();
      renderWaybillEntries();
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(t('save', 'Mentés') + ' ✓', 'success');
      }
      if (updatedEntry.palletPending && currentWaybill && currentWaybill.id) {
        var locParts = [updatedEntry.location.country, updatedEntry.location.zip, updatedEntry.location.city].filter(Boolean);
        window.prefillPalletFromWaybill = {
          waybillId: currentWaybill.id,
          waybillEntryId: updatedEntry.id,
          date: updatedEntry.date || new Date().toISOString().slice(0, 10),
          location: locParts.length ? locParts.join(', ') : ''
        };
        window.pendingPalletWaybillLink = { waybillId: currentWaybill.id, waybillEntryId: updatedEntry.id };
        window.returnToWaybillEntryId = updatedEntry.id;
        if (typeof window.showTab === 'function') window.showTab('pallets');
      }
    }, function() {
      entry.hasPalletSwap = false;
      entry.palletSummary = null;
      entry.palletPending = false;
      currentWaybill.entries.push(entry);
      sortEntriesNewestFirst(currentWaybill.entries);
      recomputeFooter();
      saveWaybillToStorage();
      renderWaybillEntries();
    });
  }

  function recomputeFooter() {
    if (!currentWaybill || !currentWaybill.entries.length) return;
    const entries = currentWaybill.entries;
    var first = entries[0];
    var last = entries[0];
    for (var i = 1; i < entries.length; i++) {
      var d = entries[i].date || '';
      if (d && (!first.date || d.localeCompare(first.date || '') < 0)) first = entries[i];
      if (d && (!last.date || d.localeCompare(last.date || '') > 0)) last = entries[i];
    }
    if (!currentWaybill.header.departureDate && first.date) {
      currentWaybill.header.departureDate = first.date;
    }
    currentWaybill.footer.arrivalDate = last.date || currentWaybill.footer.arrivalDate;
    currentWaybill.footer.arrivalKm = last.km != null ? last.km : currentWaybill.footer.arrivalKm;
    const dep = currentWaybill.header.departureKm;
    const arr = currentWaybill.footer.arrivalKm;
    if (dep != null && arr != null) {
      currentWaybill.footer.totalKm = Math.max(0, arr - dep);
    }
  }

  /** Legfrissebb legfelül: dátum szerint csökkenő, majd km csökkenő. */
  function sortEntriesNewestFirst(entries) {
    if (!entries || !entries.length) return;
    entries.sort(function(a, b) {
      var da = a.date || '';
      var db = b.date || '';
      if (da !== db) return db.localeCompare(da);
      return (b.km || 0) - (a.km || 0);
    });
  }

  function renderWaybillEntries() {
    // #region agent log
    try { fetch('http://127.0.0.1:7747/ingest/b4713f45-5870-4241-a5a4-77a5b49ff57f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'866011'},body:JSON.stringify({sessionId:'866011',location:'waybill.js:renderWaybillEntries:entry',message:'renderWaybillEntries started',data:{},timestamp:Date.now(),hypothesisId:'H3'})}).catch(function(){}); } catch(_) {}
    // #endregion
    const container = document.getElementById('waybill-entries-list');
    if (!container) return;
    loadWaybillFromStorage();
    var entries = (currentWaybill && Array.isArray(currentWaybill.entries)) ? currentWaybill.entries : [];
    if (!entries.length) {
      container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">' + t('waybill.newEntry', 'Új bejegyzés') + ' – használd a mentés gombokat alább.</p>';
      return;
    }
    sortEntriesNewestFirst(entries);
    const html = entries.map(function(e) {
      const section = e.isExport && e.isImport ? 'Ex-Import' : (e.isExport ? 'Export' : 'Import');
      const actionLabel = getActionLabel(e.actionType);
      const loc = e.location && typeof e.location === 'object' ? e.location : {};
      const locStr = [loc.country, loc.zip, loc.city].filter(Boolean).join(' ') || '–';
      const palletStr = e.pallets ? `${e.pallets.loaded || 0} fel / ${e.pallets.unloaded || 0} le / ${e.pallets.swapped || 0} csere` : '';
      const linkCount = (e.palletTxIds && e.palletTxIds.length) ? e.palletTxIds.length : 0;
      const linkStr = linkCount > 0
        ? (' · <button type="button" class="waybill-pallet-link text-blue-600 dark:text-blue-400 hover:underline" data-entry-id="' + String(e.id).replace(/"/g, '&quot;') + '">Raklapjegy(ek): ' + linkCount + '</button>')
        : '';
      var raklapLine = '';
      var raklapBtn = '';
      if (e.palletPending) {
        raklapLine = 'Raklap: függő';
        raklapBtn = '<button type="button" class="waybill-pallet-record-btn ml-1 px-2 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50" data-entry-id="' + String(e.id).replace(/"/g, '&quot;') + '">' + (t('waybill.recordPallet', 'Raklap rögzítése') || 'Raklap rögzítése') + '</button>';
      } else if (e.palletSummary && (e.palletSummary.given != null || e.palletSummary.taken != null || e.palletSummary.location)) {
        var g = e.palletSummary.given != null ? e.palletSummary.given : '–';
        var takenVal = e.palletSummary.taken != null ? e.palletSummary.taken : '–';
        var palletLocStr = (e.palletSummary.location || '').toString().trim() || '–';
        raklapLine = 'Raklap: ' + g + '/' + takenVal + ' · ' + palletLocStr;
      }
      return `
        <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 waybill-entry-card" data-entry-id="${String(e.id).replace(/"/g, '&quot;')}">
          <div class="flex justify-between items-start">
            <div>
              <div class="font-semibold text-gray-900 dark:text-gray-100">${actionLabel} – ${section}</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">${toDateValue(e.date, '') || '–'} | ${e.km != null ? e.km + ' km' : '–'} | ${locStr}${linkStr}</div>
              ${palletStr ? '<div class="text-xs text-gray-500 dark:text-gray-500 mt-1">Paletta: ' + palletStr + '</div>' : ''}
              ${raklapLine ? '<div class="text-xs text-gray-600 dark:text-gray-400 mt-1">' + raklapLine + raklapBtn + '</div>' : ''}
            </div>
            <div class="flex items-center gap-1 flex-shrink-0 waybill-entry-actions">
              <button type="button" onclick="window.waybillEditEntry && window.waybillEditEntry('${String(e.id).replace(/'/g, "\\'")}')" class="waybill-btn-edit p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded" title="${t('edit', 'Szerkesztés')}" aria-label="${t('edit', 'Szerkesztés')}"><svg style="width:1rem;height:1rem;display:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
              <button type="button" onclick="window.waybillDeleteEntry && window.waybillDeleteEntry('${String(e.id).replace(/'/g, "\\'")}')" class="waybill-btn-delete p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded" title="${t('delete', 'Törlés')}" aria-label="${t('delete', 'Törlés')}"><svg style="width:1rem;height:1rem;display:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
            </div>
          </div>
        </div>
      `;
    }).join('');
    container.innerHTML = html;
    container.querySelectorAll('.waybill-pallet-link').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var entryId = btn.getAttribute('data-entry-id');
        if (entryId && typeof window.showWaybillEntryPalletTickets === 'function') window.showWaybillEntryPalletTickets(entryId);
      });
    });
    container.querySelectorAll('.waybill-pallet-record-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var entryId = btn.getAttribute('data-entry-id');
        if (entryId && typeof window.waybillOpenPalletForEntry === 'function') window.waybillOpenPalletForEntry(entryId);
      });
    });
    var prefillBtn = document.getElementById('wb-header-load-company-prefill');
    if (prefillBtn) prefillBtn.addEventListener('click', function() {
      if (typeof window.waybillLoadCompanyHeaderPrefill === 'function') window.waybillLoadCompanyHeaderPrefill();
    });
    var finalizeBtn = document.getElementById('wb-waybill-finalize');
    if (finalizeBtn) finalizeBtn.addEventListener('click', function() {
      if (typeof window.waybillFinalizeAndNew === 'function') window.waybillFinalizeAndNew();
    });
    if (typeof window.waybillRefreshActiveVehicle === 'function') {
      var p = window.waybillRefreshActiveVehicle();
      if (p && typeof p.catch === 'function') p.catch(function(e) { console.warn('[Waybill] refreshActiveVehicle:', e && e.message); });
    }
  }

  async function waybillLoadCompanyHeaderPrefill() {
    var uid = window.currentUser && window.currentUser.uid;
    if (!uid || !window.db) return;
    var companyId = (window.userCompanyId != null && window.userCompanyId !== '') ? window.userCompanyId : (typeof window.getCompanyId === 'function' ? await window.getCompanyId(uid) : null);
    if (!companyId) {
      if (typeof showCustomAlert === 'function') showCustomAlert('Nincs céges kapcsolat (companyId).', 'warning');
      return;
    }
    try {
      var mainSnap = await window.db.collection('companies').doc(companyId).collection('settings').doc('main').get();
      var driverSnap = await window.db.collection('companies').doc(companyId).collection('drivers').doc(uid).get();
      var assignSnap = await window.db.collection('companies').doc(companyId).collection('assignments').doc(uid).get();
      var main = mainSnap && mainSnap.exists ? (mainSnap.data() || {}) : {};
      var driver = driverSnap && driverSnap.exists ? (driverSnap.data() || {}) : {};
      var assign = assignSnap && assignSnap.exists ? (assignSnap.data() || {}) : {};
      var truckPlate = null;
      var trailerPlate = null;
      if (assign.truckId) {
        var truckSnap = await window.db.collection('companies').doc(companyId).collection('trucks').doc(assign.truckId).get();
        if (truckSnap && truckSnap.exists) truckPlate = (truckSnap.data() || {}).plate;
      }
      if (assign.trailerId) {
        var trailerSnap = await window.db.collection('companies').doc(companyId).collection('trailers').doc(assign.trailerId).get();
        if (trailerSnap && trailerSnap.exists) trailerPlate = (trailerSnap.data() || {}).plate;
      }
      if (truckPlate == null && driver.defaultTruckPlate) truckPlate = driver.defaultTruckPlate;
      if (trailerPlate == null && driver.defaultTrailerPlate) trailerPlate = driver.defaultTrailerPlate;
      loadWaybillFromStorage();
      if (!currentWaybill || !currentWaybill.header) return;
      var h = currentWaybill.header;
      function setIfEmpty(id, headerKey, value) {
        if (value == null || String(value).trim() === '') return;
        var el = document.getElementById(id);
        var currentVal = (h[headerKey] != null && String(h[headerKey]).trim() !== '') ? String(h[headerKey]).trim() : '';
        if (currentVal !== '') return;
        if (el) el.value = String(value).trim();
        h[headerKey] = String(value).trim();
      }
      setIfEmpty('wb-header-company', 'companyName', main.companyName);
      setIfEmpty('wb-header-address', 'companyAddress', main.address);
      setIfEmpty('wb-header-client', 'client', main.client);
      setIfEmpty('wb-header-driver', 'driverName', driver.displayName || (window.currentUser && window.currentUser.displayName));
      setIfEmpty('wb-header-truck', 'truckPlate', truckPlate);
      setIfEmpty('wb-header-trailer', 'trailerPlate', trailerPlate);
      saveWaybillToStorage();
      if (typeof window.waybillRefreshActiveVehicle === 'function') {
        var p2 = window.waybillRefreshActiveVehicle();
        if (p2 && typeof p2.catch === 'function') p2.catch(function(e) { console.warn('[Waybill] refreshActiveVehicle:', e && e.message); });
      }
      if (typeof showCustomAlert === 'function') showCustomAlert('Céges adatok betöltve (csak üres mezők).', 'success');
    } catch (e) {
      console.warn('[Waybill] Company header prefill failed:', e && e.message);
      if (typeof showCustomAlert === 'function') showCustomAlert('Betöltés sikertelen: ' + (e.message || e), 'error');
    }
  }
  window.waybillLoadCompanyHeaderPrefill = waybillLoadCompanyHeaderPrefill;

  async function waybillRefreshActiveVehicle() {
    var uid = window.currentUser && window.currentUser.uid;
    var el = document.getElementById('wb-active-vehicle');
    if (!el || !uid || !window.db) return Promise.resolve();
    var companyId = (window.userCompanyId != null && window.userCompanyId !== '') ? window.userCompanyId : (typeof window.getCompanyId === 'function' ? await window.getCompanyId(uid) : null);
    if (!companyId) {
      el.textContent = '';
      el.classList.add('hidden');
      return Promise.resolve();
    }
    try {
      var assignSnap = await window.db.collection('companies').doc(companyId).collection('assignments').doc(uid).get();
      var assign = assignSnap && assignSnap.exists ? (assignSnap.data() || {}) : {};
      var truckPlate = '';
      var trailerPlate = '';
      if (assign.truckId) {
        var truckSnap = await window.db.collection('companies').doc(companyId).collection('trucks').doc(assign.truckId).get();
        if (truckSnap && truckSnap.exists) truckPlate = (truckSnap.data() || {}).plate || '';
      }
      if (assign.trailerId) {
        var trailerSnap = await window.db.collection('companies').doc(companyId).collection('trailers').doc(assign.trailerId).get();
        if (trailerSnap && trailerSnap.exists) trailerPlate = (trailerSnap.data() || {}).plate || '';
      }
      if (!truckPlate && !trailerPlate) {
        el.textContent = 'Nincs hozzárendelt jármű. Office-ban állítsd be.';
        el.classList.remove('hidden');
      } else {
        el.textContent = 'Aktív jármű: ' + (truckPlate ? 'Kamion ' + truckPlate : '') + (truckPlate && trailerPlate ? ', ' : '') + (trailerPlate ? 'Pótkocsi ' + trailerPlate : '');
        el.classList.remove('hidden');
      }
    } catch (_) {
      el.textContent = '';
      el.classList.add('hidden');
    }
  }
  window.waybillRefreshActiveVehicle = waybillRefreshActiveVehicle;

  async function waybillFinalizeAndNew() {
    if (!window.currentUser || !window.currentUser.uid) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (typeof showCustomAlert === 'function') showCustomAlert('Menetlevél lezárása csak online lehet.', 'warning');
      return;
    }
    if (!window.db || typeof window.finalizeWaybill !== 'function') {
      if (typeof showCustomAlert === 'function') showCustomAlert('A szolgáltatás nem elérhető.', 'warning');
      return;
    }
    loadWaybillFromStorage();
    if (!currentWaybill) return;
    var entries = Array.isArray(currentWaybill.entries) ? currentWaybill.entries : [];
    if (entries.length === 0) {
      if (!confirm('Üres menetlevél. Lezárod így is?')) return;
    } else {
      var hasPending = entries.some(function(e) { return e.palletPending === true; });
      if (hasPending && !confirm('Függő raklap van. Lezárod így is?')) return;
    }
    var btn = document.getElementById('wb-waybill-finalize');
    if (btn) btn.disabled = true;
    try {
      var newDraft = await window.finalizeWaybill(window.currentUser.uid, currentWaybill);
      currentWaybill = newDraft;
      try {
        localStorage.setItem(WAYBILL_DRAFT_KEY, JSON.stringify(newDraft));
      } catch (e) {
        console.warn('[Waybill] LocalStorage reset failed:', e);
      }
      var listEl = document.getElementById('waybill-entries-list');
      if (listEl && typeof renderWaybillEntries === 'function') renderWaybillEntries();
      var headerContainer = document.getElementById('waybill-header-container');
      if (headerContainer && typeof renderWaybillTab === 'function') renderWaybillTab();
      if (typeof showCustomAlert === 'function') showCustomAlert('Lezárva, új menetlevél megnyitva.', 'success');
    } catch (e) {
      console.warn('[Waybill] Finalize failed:', e && e.message);
      if (typeof showCustomAlert === 'function') showCustomAlert('Lezárás sikertelen: ' + (e.message || e), 'error');
    }
    if (btn) btn.disabled = false;
  }
  window.waybillFinalizeAndNew = waybillFinalizeAndNew;

  function waybillOpenPalletForEntry(entryId) {
    var entry = currentWaybill && currentWaybill.entries && currentWaybill.entries.find(function(e) { return e && e.id === entryId; });
    if (!entry || !currentWaybill || !currentWaybill.id) return;
    var locParts = [entry.location && entry.location.country, entry.location && entry.location.zip, entry.location && entry.location.city].filter(Boolean);
    window.prefillPalletFromWaybill = {
      waybillId: currentWaybill.id,
      waybillEntryId: entry.id,
      date: entry.date || new Date().toISOString().slice(0, 10),
      location: locParts.length ? locParts.join(', ') : ''
    };
    window.pendingPalletWaybillLink = { waybillId: currentWaybill.id, waybillEntryId: entry.id };
    window.returnToWaybillEntryId = entry.id;
    if (typeof window.showTab === 'function') window.showTab('pallets');
  }
  window.waybillOpenPalletForEntry = waybillOpenPalletForEntry;

  function showEditEntryModal(entry, onSave) {
    const cancelLabel = t('cancel', 'Mégse');
    const saveLabel = t('save', 'Mentés');
    const loc = entry.location || {};
    const pal = entry.pallets || { loaded: 0, unloaded: 0, swapped: 0 };

    const modal = document.createElement('div');
    modal.id = 'waybill-edit-modal';
    modal.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-4 max-h-[90vh] overflow-y-auto">
        <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">${t('edit', 'Szerkesztés')} – ${getActionLabel(entry.actionType)}</h3>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">${t('waybill.date', 'Dátum')}</label>
              <input type="date" id="wb-edit-date" class="w-full p-2 border rounded-lg text-sm" value="${toDateValue(entry.date, '').replace(/"/g, '&quot;')}" />
            </div>
            <div>
              <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">${t('waybill.km', 'Km óra')}</label>
              <input type="number" id="wb-edit-km" class="w-full p-2 border rounded-lg text-sm" min="0" placeholder="0" value="${entry.km != null ? entry.km : ''}" />
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">${t('waybill.location', 'Helyszín')}</label>
            <div class="flex gap-2 mb-1">
              <input type="text" id="wb-edit-country" class="p-2 border rounded-lg text-sm uppercase w-14" maxlength="3" placeholder="Ország" value="${(loc.country || '').replace(/"/g, '&quot;')}" />
              <input type="text" id="wb-edit-zip" class="p-2 border rounded-lg text-sm flex-1" placeholder="PLZ" value="${(loc.zip || '').replace(/"/g, '&quot;')}" />
            </div>
            <input type="text" id="wb-edit-city" class="w-full p-2 border rounded-lg text-sm" placeholder="Város" value="${(loc.city || '').replace(/"/g, '&quot;')}" />
          </div>
          <div class="flex gap-2 flex-wrap">
            <label class="inline-flex items-center gap-1 text-sm"><input type="checkbox" id="wb-edit-export" ${entry.isExport ? 'checked' : ''} /> ${t('waybill.export', 'Export')}</label>
            <label class="inline-flex items-center gap-1 text-sm"><input type="checkbox" id="wb-edit-import" ${entry.isImport ? 'checked' : ''} /> ${t('waybill.import', 'Import')}</label>
          </div>
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">${t('waybill.palletExchange', 'Paletta')}</label>
            <div class="grid grid-cols-3 gap-2">
              <div><label class="block text-xs text-gray-500">${t('waybill.palletLoaded', 'Fel')}</label><input type="number" id="wb-edit-pallet-loaded" class="w-full p-2 border rounded text-sm" min="0" value="${pal.loaded != null ? pal.loaded : 0}" /></div>
              <div><label class="block text-xs text-gray-500">${t('waybill.palletUnloaded', 'Le')}</label><input type="number" id="wb-edit-pallet-unloaded" class="w-full p-2 border rounded text-sm" min="0" value="${pal.unloaded != null ? pal.unloaded : 0}" /></div>
              <div><label class="block text-xs text-gray-500">${t('waybill.palletSwapped', 'Csere')}</label><input type="number" id="wb-edit-pallet-swapped" class="w-full p-2 border rounded text-sm" min="0" value="${pal.swapped != null ? pal.swapped : 0}" /></div>
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">${t('waybill.loading', 'Berakodás')} / ${t('waybill.unloading', 'Kirakodás')}</label>
            <div class="flex gap-2 flex-wrap">
              <button type="button" data-action="loading" class="wb-edit-action py-2 px-3 rounded-lg text-sm font-medium ${entry.actionType === 'loading' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}">📦 ${t('waybill.loading', 'Berakodás')}</button>
              <button type="button" data-action="unloading" class="wb-edit-action py-2 px-3 rounded-lg text-sm font-medium ${entry.actionType === 'unloading' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}">📤 ${t('waybill.unloading', 'Kirakodás')}</button>
              <button type="button" data-action="loadUnload" class="wb-edit-action py-2 px-3 rounded-lg text-sm font-medium ${entry.actionType === 'loadUnload' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}">🔄 ${t('waybill.loadUnload', 'Ki- és Berakodás')}</button>
            </div>
          </div>
        </div>
        <div class="flex gap-2 mt-4">
          <button type="button" id="wb-edit-cancel" class="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold">${cancelLabel}</button>
          <button type="button" id="wb-edit-save" class="flex-1 py-2 bg-blue-500 text-white rounded-lg font-semibold">${saveLabel}</button>
        </div>
      </div>
    `;

    modal.addEventListener('click', function(e) {
      if (e.target === modal) { modal.remove(); }
    });

    document.body.appendChild(modal);

    let chosenAction = entry.actionType || 'loading';
    modal.querySelectorAll('.wb-edit-action').forEach(function(btn) {
      btn.addEventListener('click', function() {
        chosenAction = this.getAttribute('data-action');
        modal.querySelectorAll('.wb-edit-action').forEach(function(b) {
          b.classList.remove('bg-blue-500', 'bg-indigo-500', 'text-white');
          b.classList.add('bg-gray-200', 'dark:bg-gray-600', 'text-gray-800', 'dark:text-gray-200');
        });
        this.classList.remove('bg-gray-200', 'dark:bg-gray-600', 'text-gray-800', 'dark:text-gray-200');
        this.classList.add(chosenAction === 'loadUnload' ? 'bg-indigo-500' : 'bg-blue-500', 'text-white');
      });
    });

    modal.querySelector('#wb-edit-cancel').addEventListener('click', function() { modal.remove(); });
    modal.querySelector('#wb-edit-save').addEventListener('click', function() {
      var dateEl = modal.querySelector('#wb-edit-date');
      var kmEl = modal.querySelector('#wb-edit-km');
      var countryEl = modal.querySelector('#wb-edit-country');
      var zipEl = modal.querySelector('#wb-edit-zip');
      var cityEl = modal.querySelector('#wb-edit-city');
      var expEl = modal.querySelector('#wb-edit-export');
      var impEl = modal.querySelector('#wb-edit-import');
      var plEl = modal.querySelector('#wb-edit-pallet-loaded');
      var puEl = modal.querySelector('#wb-edit-pallet-unloaded');
      var psEl = modal.querySelector('#wb-edit-pallet-swapped');
      var updated = {
        id: entry.id,
        timestamp: entry.timestamp,
        date: dateEl ? dateEl.value : entry.date,
        km: kmEl && kmEl.value.trim() !== '' ? parseInt(kmEl.value, 10) : null,
        location: {
          country: countryEl ? countryEl.value.trim() : '',
          zip: zipEl ? zipEl.value.trim() : '',
          city: cityEl ? cityEl.value.trim() : ''
        },
        isExport: expEl ? expEl.checked : entry.isExport,
        isImport: impEl ? impEl.checked : entry.isImport,
        actionType: chosenAction,
        pallets: {
          loaded: plEl ? (parseInt(plEl.value, 10) || 0) : 0,
          unloaded: puEl ? (parseInt(puEl.value, 10) || 0) : 0,
          swapped: psEl ? (parseInt(psEl.value, 10) || 0) : 0
        },
        palletTxIds: Array.isArray(entry.palletTxIds) ? entry.palletTxIds : [],
        hasPalletSwap: entry.hasPalletSwap,
        palletSummary: entry.palletSummary,
        palletPending: entry.palletPending
      };
      updated.hasPalletSwap = !!(updated.pallets && (updated.pallets.swapped || 0) > 0);
      var hasIds = Array.isArray(updated.palletTxIds) && updated.palletTxIds.length > 0;
      updated.palletPending = updated.hasPalletSwap && !hasIds;
      if (!updated.palletSummary && !updated.palletPending) updated.palletSummary = entry.palletSummary || null;
      modal.remove();
      if (onSave) onSave(updated);
    });
  }

  window.waybillEditEntry = function(entryId) {
    loadWaybillFromStorage();
    if (!currentWaybill || !currentWaybill.entries) return;
    var entry = currentWaybill.entries.filter(function(e) { return e.id === entryId; })[0];
    if (!entry) return;
    showEditEntryModal(entry, function(updatedEntry) {
      var idx = currentWaybill.entries.findIndex(function(e) { return e.id === entryId; });
      if (idx === -1) return;
      currentWaybill.entries[idx] = updatedEntry;
      sortEntriesNewestFirst(currentWaybill.entries);
      recomputeFooter();
      saveWaybillToStorage();
      renderWaybillEntries();
      if (typeof showCustomAlert === 'function') showCustomAlert(t('save', 'Mentés') + ' ✓', 'success');
      if (updatedEntry.palletPending && currentWaybill && currentWaybill.id) {
        var locParts = [updatedEntry.location.country, updatedEntry.location.zip, updatedEntry.location.city].filter(Boolean);
        window.prefillPalletFromWaybill = { waybillId: currentWaybill.id, waybillEntryId: updatedEntry.id, date: updatedEntry.date || new Date().toISOString().slice(0, 10), location: locParts.length ? locParts.join(', ') : '' };
        window.pendingPalletWaybillLink = { waybillId: currentWaybill.id, waybillEntryId: updatedEntry.id };
        window.returnToWaybillEntryId = updatedEntry.id;
        if (typeof window.showTab === 'function') window.showTab('pallets');
      }
    });
  };

  window.waybillDeleteEntry = function(entryId) {
    loadWaybillFromStorage();
    if (!currentWaybill || !currentWaybill.entries) return;
    var entry = currentWaybill.entries.filter(function(e) { return e.id === entryId; })[0];
    if (!entry) return;
    var msg = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang] && translations[currentLang].alertConfirmDelete)
      ? translations[currentLang].alertConfirmDelete
      : 'Biztosan törölni szeretnéd?';
    if (typeof showCustomAlert === 'function') {
      showCustomAlert(msg, 'warning', function() {
        var idx = currentWaybill.entries.findIndex(function(e) { return e.id === entryId; });
        if (idx === -1) return;
        currentWaybill.entries.splice(idx, 1);
        recomputeFooter();
        saveWaybillToStorage();
        renderWaybillEntries();
        var okMsg = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang] && translations[currentLang].entryDeleteSuccess)
          ? translations[currentLang].entryDeleteSuccess
          : 'Bejegyzés törölve.';
        showCustomAlert(okMsg, 'success');
      }, { cancelText: t('cancel', 'Mégse'), confirmText: t('delete', 'Törlés') });
    } else {
      if (confirm(msg)) {
        var idx = currentWaybill.entries.findIndex(function(e) { return e.id === entryId; });
        if (idx !== -1) {
          currentWaybill.entries.splice(idx, 1);
          recomputeFooter();
          saveWaybillToStorage();
          renderWaybillEntries();
        }
      }
    }
  };

  /** Firestore Timestamp / Date → YYYY-MM-DD string (template-safe). */
  function toDateValue(val, fallback) {
    try {
      if (val == null) return fallback || '';
      if (typeof val === 'string') return val;
      if (typeof val.toDate === 'function') { var d = val.toDate(); return (d && d.toISOString) ? d.toISOString().slice(0, 10) : (fallback || ''); }
      if (typeof val.toMillis === 'function') return new Date(val.toMillis()).toISOString().slice(0, 10);
      if (val instanceof Date) return (val.toISOString && val.toISOString()) ? val.toISOString().slice(0, 10) : (fallback || '');
      return fallback || '';
    } catch (_) { return fallback || ''; }
  }

  /** Firestore Timestamp mezők normalizálása stringre (PDF és megjelenítés). */
  function normalizeWaybillDatesForDisplay(wb) {
    if (!wb) return;
    const h = wb.header;
    if (h && h.departureDate != null && typeof h.departureDate !== 'string') {
      h.departureDate = toDateValue(h.departureDate, '');
    }
    const f = wb.footer;
    if (f && f.arrivalDate != null && typeof f.arrivalDate !== 'string') {
      f.arrivalDate = toDateValue(f.arrivalDate, '');
    }
    (Array.isArray(wb.entries) ? wb.entries : []).forEach(function(e) {
      if (e && e.date != null && typeof e.date !== 'string') e.date = toDateValue(e.date, '');
    });
  }

  /** Lezárt menetlevél megtekintése (csak olvasható, PDF generálható). */
  function renderWaybillClosedView(closedDoc) {
    const container = document.getElementById('content-waybill');
    if (!container) return;
    ensureWaybillShape(closedDoc);
    normalizeWaybillDatesForDisplay(closedDoc);
    currentWaybill = closedDoc;
    window.__waybillViewingClosed = true;
    waybillPdfBlob = null;
    waybillPdfFileName = null;

    const w = currentWaybill;
    const h = (w.header && typeof w.header === 'object') ? w.header : {};
    const f = (w.footer && typeof w.footer === 'object') ? w.footer : {};
    const entries = Array.isArray(w.entries) ? w.entries : [];
    const depDate = toDateValue(h.departureDate, '');
    const arrDate = toDateValue(f.arrivalDate, '');
    const locStr = function(loc) {
      if (!loc || typeof loc !== 'object') return '';
      return [loc.country, loc.zip, loc.city].filter(Boolean).join(', ');
    };
    const entriesHtml = entries.length ? entries.map(function(e, i) {
      const loc = e.location || {};
      const plz = locStr(loc);
      const dateVal = toDateValue(e.date, '');
      const p = e.pallets || {};
      return '<div class="py-2 px-3 rounded border border-gray-200 dark:border-gray-600 text-sm">' +
        '<span class="font-medium">' + (i + 1) + '.</span> ' + dateVal + ' · ' + (plz || '–') + ' · ' +
        (t('waybill.loading', 'Berakodás') + ': ' + (p.loaded || '0') + ', ' + t('waybill.unloading', 'Kirakodás') + ': ' + (p.unloaded || '0') + (p.swapped ? ', ' + t('waybill.palletSwapped', 'Cserélt') + ': ' + p.swapped : '')) +
        '</div>';
    }).join('') : '<p class="text-gray-500 dark:text-gray-400 text-sm">' + (t('waybill.noEntries', 'Nincs bejegyzés') || 'Nincs bejegyzés') + '</p>';

    container.innerHTML = '<h2 class="text-xl font-bold mb-4">' + (t('waybill.title', 'Menetlevél') + ' (' + (t('waybill.closed', 'lezárva') || 'lezárva') + ')') + '</h2>' +
      '<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2 mb-4">' +
      '<p><strong>' + (h.companyName || '') + '</strong></p>' +
      '<p class="text-sm text-gray-600 dark:text-gray-400">' + (h.driverName || '') + ' · ' + (h.truckPlate || '') + ' / ' + (h.trailerPlate || '') + '</p>' +
      '<p class="text-sm">' + (t('waybill.client', 'Megbízó') + ': ' + (h.client || '') + ' · Abfahrt: ' + depDate + (h.departureKm != null ? ' · ' + h.departureKm + ' km' : '') + '</p>') +
      '<p class="text-xs text-gray-500">' + locStr(h.departureLocation || {}) + '</p>' +
      '</div>' +
      '<div class="mb-4"><h3 class="font-semibold mb-2">' + (t('waybill.entriesSection', 'Bejegyzések') || 'Bejegyzések') + '</h3><div class="space-y-2">' + entriesHtml + '</div></div>' +
      '<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4 text-sm">' +
      '<p>Ankunft: ' + arrDate + (f.arrivalKm != null ? ' · ' + f.arrivalKm + ' km' : '') + (f.totalKm != null ? ' · Össz. km: ' + f.totalKm : '') + '</p>' +
      (f.remarks ? '<p>Vermerk: ' + String(f.remarks).replace(/</g, '&lt;') + '</p>' : '') +
      '</div>' +
      '<div class="flex flex-col gap-2">' +
      '<button type="button" onclick="window.waybillGeneratePdf && window.waybillGeneratePdf()" class="w-full py-3 bg-green-500 text-white rounded-lg font-semibold">📋 <span data-translate-key="waybill.generatePdf">PDF generálás</span></button>' +
      '<div id="waybill-pdf-result" class="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg space-y-2" style="display:none;">' +
      '<p class="font-semibold text-green-800 dark:text-green-200 text-sm">PDF elkészült</p>' +
      '<button type="button" onclick="window.waybillPdfSave && window.waybillPdfSave()" class="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded text-sm font-semibold">📥 ' + (t('reportDownloadPDF', 'PDF letöltés') || 'PDF letöltés') + '</button>' +
      '<button type="button" onclick="window.waybillPdfShare && window.waybillPdfShare()" class="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-semibold">📲 ' + (t('reportSharePDF', 'PDF megosztása') || 'PDF megosztása') + '</button>' +
      '<button type="button" onclick="window.waybillPdfPrint && window.waybillPdfPrint()" class="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-semibold">🖨️ ' + (t('waybillPdfPrint', 'Nyomtatás') || 'Nyomtatás') + '</button>' +
      '</div>' +
      '<button type="button" id="wb-back-to-draft" class="w-full py-3 bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-semibold">← ' + (t('waybill.backToDraft', 'Vissza a piszkozathoz') || 'Vissza a piszkozathoz') + '</button>' +
      '</div>';

    document.getElementById('wb-back-to-draft').addEventListener('click', function() {
      window.__waybillViewingClosed = false;
      loadWaybillFromStorage();
      renderWaybillTab();
    });
  }

  function renderWaybillTab() {
    // #region agent log
    try { fetch('http://127.0.0.1:7747/ingest/b4713f45-5870-4241-a5a4-77a5b49ff57f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'866011'},body:JSON.stringify({sessionId:'866011',location:'waybill.js:renderWaybillTab:entry',message:'renderWaybillTab started',data:{},timestamp:Date.now(),hypothesisId:'H1'})}).catch(function(){}); } catch(_) {}
    // #endregion
    const container = document.getElementById('content-waybill');
    if (!container) return;
    window.__waybillViewingClosed = false;
    if (typeof window.canAccessWaybill !== 'function' || !window.canAccessWaybill()) {
      container.innerHTML = '';
      return;
    }
    try {
    try {
      loadWaybillFromStorage();
      if (!currentWaybill) currentWaybill = createDefaultWaybill();
      ensureWaybillShape(currentWaybill);
      if (!currentWaybill.header) currentWaybill.header = {};
      if (!currentWaybill.footer) currentWaybill.footer = {};
    } catch (e) {
      console.error('[Waybill] Init error:', e);
      container.innerHTML = '<p class="p-4 text-red-600 dark:text-red-400">Menetlevél betöltési hiba. Próbáld újra, vagy töröld a böngésző adatait ehhez a laphoz.</p>';
      return;
    }
    // #region agent log
    try { fetch('http://127.0.0.1:7747/ingest/b4713f45-5870-4241-a5a4-77a5b49ff57f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'866011'},body:JSON.stringify({sessionId:'866011',location:'waybill.js:afterInit',message:'after init block',data:{},timestamp:Date.now(),hypothesisId:'H1'})}).catch(function(){}); } catch(_) {}
    // #endregion
    if (typeof navigator !== 'undefined' && navigator.onLine && window.currentUser && window.db && typeof window.loadWaybillDraftFromFirestore === 'function') {
      window.loadWaybillDraftFromFirestore(window.currentUser.uid).then(function(draft) {
        if (!draft) return;
        ensureWaybillShape(draft);
        if (!Array.isArray(draft.entries)) draft.entries = [];
        var serverMs = (draft.updatedAt && typeof draft.updatedAt.toMillis === 'function')
          ? draft.updatedAt.toMillis()
          : ((draft.updatedAtMs != null && typeof draft.updatedAtMs === 'number') ? draft.updatedAtMs : 0);
        draft.entries.forEach(function(e) {
          if (!e.id) e.id = generateStableId('ent_');
          if (!Array.isArray(e.palletTxIds)) e.palletTxIds = [];
        });
        var localRaw = null;
        try { localRaw = localStorage.getItem(WAYBILL_DRAFT_KEY); } catch (_) {}
        var local = null;
        try { local = localRaw ? JSON.parse(localRaw) : null; } catch (_) {}
        var localMs = (local && local.updatedAtMs != null && typeof local.updatedAtMs === 'number') ? local.updatedAtMs : 0;
        if (serverMs > localMs) {
          var normalized = Object.assign({}, draft, {
            updatedAtMs: serverMs,
            updatedAt: (draft.updatedAt && typeof draft.updatedAt.toMillis === 'function')
              ? new Date(draft.updatedAt.toMillis()).toISOString()
              : (draft.updatedAt || new Date().toISOString()),
            createdAt: (draft.createdAt && typeof draft.createdAt.toDate === 'function')
              ? draft.createdAt.toDate().toISOString()
              : (draft.createdAt || new Date().toISOString())
          });
          currentWaybill = normalized;
          try { localStorage.setItem(WAYBILL_DRAFT_KEY, JSON.stringify(normalized)); } catch (_) {}
          recomputeFooter();
          var listEl = document.getElementById('waybill-entries-list');
          if (listEl && typeof renderWaybillEntries === 'function') renderWaybillEntries();
        } else if (localMs > serverMs && currentWaybill) {
          saveWaybillToStorage();
        }
      }).catch(function(e) { console.warn('[Waybill] Firestore load failed:', e && e.message); });
    }
    try {
      recomputeFooter();
    } catch (e) {
      console.warn('[Waybill] recomputeFooter:', e);
    }
    const w = currentWaybill;
    if (!w) return;
    if (!w.header || typeof w.header !== 'object') w.header = {};
    if (!w.footer || typeof w.footer !== 'object') w.footer = { arrivalDate: '', arrivalKm: null, totalKm: null, remarks: '', standingDays: 0, freightPrice: null };
    const h = w.header;
    const driverFromSettings = (typeof loadSettings === 'function' && window.gurigoSettings && window.gurigoSettings.reportDriverName) ? window.gurigoSettings.reportDriverName : '';
    const driverDisplay = h.driverName || driverFromSettings;
    const TODAY = new Date().toISOString().slice(0, 10);

    // #region agent log
    try { fetch('http://127.0.0.1:7747/ingest/b4713f45-5870-4241-a5a4-77a5b49ff57f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'866011'},body:JSON.stringify({sessionId:'866011',location:'waybill.js:beforeInnerHTML',message:'before container.innerHTML',data:{hasW:!!w,hasFooter:!!(w&&w.footer)},timestamp:Date.now(),hypothesisId:'H2'})}).catch(function(){}); } catch(_) {}
    // #endregion
    try {
    container.innerHTML = `
      <h2 class="text-xl font-bold mb-4" data-translate-key="waybill.title">Menetlevél</h2>

      <!-- Lezárt menetlevelek listája -->
      <details class="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50" id="wb-closed-waybills-wrap">
        <summary class="px-4 py-3 font-semibold cursor-pointer text-gray-900 dark:text-gray-100 select-none" data-translate-key="waybill.closedList">Lezárt menetlevelek</summary>
        <div id="wb-closed-list-container" class="px-4 pb-3 pt-1 space-y-2"></div>
      </details>

      <!-- Fejléc -->
      <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3 mb-4">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Fejléc</h3>
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2">
            <label class="block text-xs text-gray-500 mb-1" data-translate-key="waybill.companyName">Cégnév</label>
            <input type="text" id="wb-header-company" class="w-full p-2 border rounded text-sm" value="${(h.companyName || '').replace(/"/g, '&quot;')}" placeholder="Cégnév" />
          </div>
          <div class="col-span-2">
            <label class="block text-xs text-gray-500 mb-1">Cím (utca, irsz, település)</label>
            <input type="text" id="wb-header-address" class="w-full p-2 border rounded text-sm" value="${(h.companyAddress || '').replace(/"/g, '&quot;')}" placeholder="Pl. Mitterstrasse 57, A-8111 Gratwein-Strassengel" />
          </div>
          <div class="col-span-2">
            <label class="block text-xs text-gray-500 mb-1">Logó (PDF fejlécben)</label>
            <div class="flex items-center gap-2 flex-wrap">
              <input type="file" id="wb-logo-input" accept="image/png,image/jpeg,image/jpg,image/svg+xml" class="hidden" />
              <button type="button" onclick="document.getElementById('wb-logo-input').click()" class="py-2 px-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded text-sm">Logó feltöltése</button>
              <span id="wb-logo-preview-wrap" style="display:${h.logoBase64 ? 'inline-flex' : 'none'};align-items:center;gap:0.5rem;">
                <img id="wb-logo-preview" src="${h.logoBase64 || ''}" alt="Logó" style="max-height:40px;max-width:80px;object-fit:contain;" />
                <button type="button" onclick="window.waybillLogoRemove && window.waybillLogoRemove()" class="text-red-600 hover:text-red-700 text-sm">Törlés</button>
              </span>
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1" data-translate-key="waybill.driverName">Sofőr neve</label>
            <input type="text" id="wb-header-driver" class="w-full p-2 border rounded text-sm" value="${(driverDisplay || '').replace(/"/g, '&quot;')}" placeholder="Sofőr" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1" data-translate-key="waybill.truckPlate">Rendszám (kamion)</label>
            <input type="text" id="wb-header-truck" class="w-full p-2 border rounded text-sm" value="${(h.truckPlate || '').replace(/"/g, '&quot;')}" placeholder="LKW-Kz" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1" data-translate-key="waybill.trailerPlate">Rendszám (pótkocsi)</label>
            <input type="text" id="wb-header-trailer" class="w-full p-2 border rounded text-sm" value="${(h.trailerPlate || '').replace(/"/g, '&quot;')}" placeholder="Sattel-Kz" />
          </div>
          <div class="col-span-2">
            <label class="block text-xs text-gray-500 mb-1" data-translate-key="waybill.client">Megbízó</label>
            <input type="text" id="wb-header-client" class="w-full p-2 border rounded text-sm" value="${(h.client || '').replace(/"/g, '&quot;')}" placeholder="Auftraggeber" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Abfahrt am</label>
            <input type="date" id="wb-header-departure-date" class="w-full p-2 border rounded text-sm" value="${toDateValue(h.departureDate, TODAY).replace(/"/g, '&quot;')}" />
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Km-Abfahrt</label>
            <input type="number" id="wb-header-departure-km" class="w-full p-2 border rounded text-sm" min="0" placeholder="0" value="${h.departureKm != null ? h.departureKm : ''}" />
          </div>
          <div class="col-span-2">
            <label class="block text-xs text-gray-500 mb-1">PLZ + Ort (indulás)</label>
            <div style="display:flex;flex-direction:column;gap:0.5rem;">
              <div style="display:flex;gap:0.5rem;align-items:center;">
                <input type="text" id="wb-header-dep-country" style="width:3.5rem;min-width:3.5rem;" class="p-2 border rounded text-sm uppercase" maxlength="3" placeholder="Ország" value="${((h.departureLocation && h.departureLocation.country) || '').replace(/"/g, '&quot;')}" />
                <input type="text" id="wb-header-dep-zip" style="width:5rem;min-width:5rem;" class="p-2 border rounded text-sm" placeholder="PLZ/irsz" value="${((h.departureLocation && h.departureLocation.zip) || '').replace(/"/g, '&quot;')}" />
                <button type="button" onclick="window.waybillFillHeaderGps && window.waybillFillHeaderGps()" style="flex-shrink:0;" class="p-2 bg-green-500 text-white rounded text-sm" title="GPS">📍</button>
              </div>
              <input type="text" id="wb-header-dep-city" style="width:100%;box-sizing:border-box;" class="p-2 border rounded text-sm" placeholder="Ort / Város" value="${((h.departureLocation && h.departureLocation.city) || '').replace(/"/g, '&quot;')}" />
            </div>
            <div class="text-xs text-gray-500 mt-1" id="wb-header-gps-status"></div>
          </div>
        </div>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" id="wb-header-load-company-prefill" class="px-3 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800/60">Céges adatok betöltése</button>
          <button type="button" id="wb-waybill-finalize" class="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded text-sm font-medium hover:bg-amber-200 dark:hover:bg-amber-800/60">Menetlevél lezárása</button>
        </div>
        <div id="wb-active-vehicle" class="mt-2 text-sm text-gray-600 dark:text-gray-400 hidden"></div>
      </div>

      <!-- Új bejegyzés -->
      <div class="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg space-y-3 mb-4">
        <h3 class="font-semibold text-blue-900 dark:text-blue-100" data-translate-key="waybill.newEntry">Új bejegyzés</h3>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1" data-translate-key="waybill.date">Dátum</label>
            <input type="date" id="wb-date" class="w-full p-2 border rounded text-sm" value="${toDateValue(h.departureDate, TODAY)}" />
          </div>
          <div>
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1" data-translate-key="waybill.km">Km óra állás</label>
            <input type="number" id="wb-km" class="w-full p-2 border rounded text-sm" min="0" placeholder="0" />
          </div>
        </div>
        <div>
          <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1" data-translate-key="waybill.location">Helyszín</label>
          <div style="display:flex;flex-direction:column;gap:0.5rem;">
            <div style="display:flex;gap:0.5rem;align-items:center;">
              <input type="text" id="wb-country" style="width:3.5rem;min-width:3.5rem;" class="p-2 border rounded text-sm uppercase" maxlength="3" placeholder="Ország" value="${(h.departureLocation && h.departureLocation.country) || ''}" />
              <input type="text" id="wb-zip" style="width:5rem;min-width:5rem;" class="p-2 border rounded text-sm" placeholder="irsz" value="${(h.departureLocation && h.departureLocation.zip) || ''}" />
              <button type="button" onclick="window.waybillFillGps && window.waybillFillGps()" style="flex-shrink:0;" class="p-2 bg-green-500 text-white rounded text-sm" title="GPS">📍</button>
            </div>
            <input type="text" id="wb-city" style="width:100%;box-sizing:border-box;" class="p-2 border rounded text-sm" placeholder="Város" value="${(h.departureLocation && h.departureLocation.city) || ''}" />
          </div>
          <div class="text-xs text-gray-500 mt-1" id="wb-gps-status"></div>
        </div>
        <div class="flex flex-col gap-2">
          <div class="enhanced-toggle-container" id="wb-export-container" onclick="document.getElementById('wb-export').click()">
            <div class="enhanced-toggle-text">
              <span data-translate-key="waybill.export">Export</span>
              <span class="enhanced-toggle-checkmark hidden">✓</span>
            </div>
            <input class="sr-only" type="checkbox" id="wb-export" />
          </div>
          <div class="enhanced-toggle-container" id="wb-import-container" onclick="document.getElementById('wb-import').click()">
            <div class="enhanced-toggle-text">
              <span data-translate-key="waybill.import">Import</span>
              <span class="enhanced-toggle-checkmark hidden">✓</span>
            </div>
            <input class="sr-only" type="checkbox" id="wb-import" />
          </div>
        </div>
        <div class="flex flex-wrap gap-2 mt-3">
          <button type="button" onclick="window.waybillSaveLoading && window.waybillSaveLoading()" class="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm">📦 <span data-translate-key="waybill.loading">Berakodás</span></button>
          <button type="button" onclick="window.waybillSaveUnloading && window.waybillSaveUnloading()" class="py-2 px-4 text-white rounded-lg font-semibold text-sm waybill-unload-btn">📤 <span data-translate-key="waybill.unloading">Kirakodás</span></button>
          <button type="button" onclick="window.waybillSaveLoadUnload && window.waybillSaveLoadUnload()" class="py-2 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold text-sm">🔄 <span data-translate-key="waybill.loadUnload">Ki- és Berakodás</span></button>
        </div>
      </div>

      <!-- Bejegyzések listája -->
      <div class="mb-4">
        <h3 class="font-semibold mb-2 text-gray-900 dark:text-gray-100">Bejegyzések</h3>
        <div id="waybill-entries-list" class="space-y-2"></div>
      </div>

      <!-- Lábléc -->
      <details class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
        <summary class="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer">Lábléc (Ankunft, Vermerk, Frachtpreis)</summary>
        <div class="mt-3 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Ankunft am</label>
              <input type="date" id="wb-footer-arrival" class="w-full p-2 border rounded text-sm" value="${toDateValue(w.footer.arrivalDate, '').replace(/"/g, '&quot;')}" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Km-Stand-Ankunft</label>
              <input type="number" id="wb-footer-arrival-km" class="w-full p-2 border rounded text-sm" min="0" placeholder="0" value="${w.footer.arrivalKm != null ? w.footer.arrivalKm : ''}" />
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-500 mb-1">Vermerk (Megjegyzés)</label>
            <input type="text" id="wb-footer-remarks" class="w-full p-2 border rounded text-sm" value="${(w.footer.remarks || '').replace(/"/g, '&quot;')}" placeholder="Megjegyzés" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">Anzahl der Stehtage</label>
              <input type="number" id="wb-footer-standing" class="w-full p-2 border rounded text-sm" min="0" value="${w.footer.standingDays != null ? w.footer.standingDays : 0}" />
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">Frachtpreis €</label>
              <input type="number" id="wb-footer-freight" class="w-full p-2 border rounded text-sm" min="0" step="0.01" placeholder="0" value="${w.footer.freightPrice != null ? w.footer.freightPrice : ''}" />
            </div>
          </div>
        </div>
      </details>

      <!-- PDF gomb -->
      <button type="button" onclick="window.waybillGeneratePdf && window.waybillGeneratePdf()" class="w-full py-3 bg-green-500 text-white rounded-lg font-semibold">
        📋 <span data-translate-key="waybill.generatePdf">PDF generálás</span>
      </button>
      <div id="waybill-pdf-result" class="mt-3 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg space-y-2" style="display:none;">
        <p class="font-semibold text-green-800 dark:text-green-200 text-sm">PDF elkészült</p>
        <div style="display:flex;flex-direction:column;gap:0.5rem;">
          <button type="button" onclick="window.waybillPdfSave && window.waybillPdfSave()" class="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm">📥 <span data-translate-key="reportDownloadPDF">PDF letöltés</span></button>
          <button type="button" onclick="window.waybillPdfShare && window.waybillPdfShare()" class="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm">📲 <span data-translate-key="reportSharePDF">PDF megosztása</span></button>
          <button type="button" onclick="window.waybillPdfPrint && window.waybillPdfPrint()" class="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold text-sm">🖨️ <span data-translate-key="waybillPdfPrint">Nyomtatás</span></button>
        </div>
      </div>
    `;

    // #region agent log
    try { fetch('http://127.0.0.1:7747/ingest/b4713f45-5870-4241-a5a4-77a5b49ff57f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'866011'},body:JSON.stringify({sessionId:'866011',location:'waybill.js:afterInnerHTML',message:'after container.innerHTML',data:{},timestamp:Date.now(),hypothesisId:'H2'})}).catch(function(){}); } catch(_) {}
    // #endregion
    window.waybillFillHeaderGps = function() {
      const inputs = {
        country: document.getElementById('wb-header-dep-country'),
        zip: document.getElementById('wb-header-dep-zip'),
        city: document.getElementById('wb-header-dep-city')
      };
      fillPlaceFromGps(inputs, document.getElementById('wb-header-gps-status'), function() {
        loadWaybillFromStorage();
        currentWaybill.header.departureLocation = currentWaybill.header.departureLocation || {};
        currentWaybill.header.departureLocation.country = inputs.country ? inputs.country.value : '';
        currentWaybill.header.departureLocation.zip = inputs.zip ? inputs.zip.value : '';
        currentWaybill.header.departureLocation.city = inputs.city ? inputs.city.value : '';
        saveWaybillToStorage();
      });
    };
    window.waybillLogoUpload = function() {
      const input = document.getElementById('wb-logo-input');
      if (!input || !input.files || !input.files[0]) return;
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = function() {
        loadWaybillFromStorage();
        currentWaybill.header.logoBase64 = reader.result;
        saveWaybillToStorage();
        const preview = document.getElementById('wb-logo-preview');
        const wrap = document.getElementById('wb-logo-preview-wrap');
        if (preview) { preview.src = reader.result; preview.style.display = ''; }
        if (wrap) wrap.style.display = 'inline-flex';
        input.value = '';
      };
      reader.readAsDataURL(file);
    };
    window.waybillLogoRemove = function() {
      loadWaybillFromStorage();
      currentWaybill.header.logoBase64 = null;
      saveWaybillToStorage();
      const preview = document.getElementById('wb-logo-preview');
      const wrap = document.getElementById('wb-logo-preview-wrap');
      if (preview) { preview.src = ''; preview.style.display = 'none'; }
      if (wrap) wrap.style.display = 'none';
    };
    const logoInput = document.getElementById('wb-logo-input');
    if (logoInput) logoInput.addEventListener('change', window.waybillLogoUpload);

    window.waybillFillGps = function() {
      const inputs = {
        country: document.getElementById('wb-country'),
        zip: document.getElementById('wb-zip'),
        city: document.getElementById('wb-city')
      };
      fillPlaceFromGps(inputs, document.getElementById('wb-gps-status'));
    };

    window.waybillSaveLoading = function() {
      const isExport = !!document.getElementById('wb-export')?.checked;
      const isImport = !!document.getElementById('wb-import')?.checked;
      if (!isExport && !isImport) {
        if (typeof showCustomAlert === 'function') showCustomAlert('Jelöld be az Export vagy Import mezőt!', 'info');
        return;
      }
      addEntry('loading', isExport, isImport);
    };
    window.waybillSaveUnloading = function() {
      const isExport = !!document.getElementById('wb-export')?.checked;
      const isImport = !!document.getElementById('wb-import')?.checked;
      if (!isExport && !isImport) {
        if (typeof showCustomAlert === 'function') showCustomAlert('Jelöld be az Export vagy Import mezőt!', 'info');
        return;
      }
      addEntry('unloading', isExport, isImport);
    };
    window.waybillSaveLoadUnload = function() {
      const isExport = !!document.getElementById('wb-export')?.checked;
      const isImport = !!document.getElementById('wb-import')?.checked;
      if (!isExport && !isImport) {
        if (typeof showCustomAlert === 'function') showCustomAlert('Jelöld be az Export vagy Import mezőt!', 'info');
        return;
      }
      addEntry('loadUnload', isExport, isImport);
    };

    [document.getElementById('wb-export'), document.getElementById('wb-import')].forEach(function(cb) {
      if (cb && typeof updateEnhancedToggleVisuals === 'function') {
        cb.addEventListener('change', function() { updateEnhancedToggleVisuals(cb); });
        updateEnhancedToggleVisuals(cb);
      }
    });

    function syncWaybillFromDOM() {
      loadWaybillFromStorage();
      const get = function(id) { const el = document.getElementById(id); return el ? el.value : ''; };
      const getNum = function(id) { const v = get(id).trim(); return v !== '' ? parseInt(v, 10) : null; };
      const getFloat = function(id) { const v = get(id).trim(); return v !== '' ? parseFloat(v) : null; };
      currentWaybill.header.companyName = get('wb-header-company');
      currentWaybill.header.companyAddress = get('wb-header-address');
      currentWaybill.header.driverName = get('wb-header-driver');
      currentWaybill.header.truckPlate = get('wb-header-truck');
      currentWaybill.header.trailerPlate = get('wb-header-trailer');
      currentWaybill.header.client = get('wb-header-client');
      currentWaybill.header.departureDate = get('wb-header-departure-date') || new Date().toISOString().slice(0, 10);
      currentWaybill.header.departureKm = getNum('wb-header-departure-km');
      currentWaybill.header.departureLocation = currentWaybill.header.departureLocation || {};
      currentWaybill.header.departureLocation.country = get('wb-header-dep-country');
      currentWaybill.header.departureLocation.zip = get('wb-header-dep-zip');
      currentWaybill.header.departureLocation.city = get('wb-header-dep-city');
      currentWaybill.footer.arrivalDate = get('wb-footer-arrival');
      currentWaybill.footer.arrivalKm = getNum('wb-footer-arrival-km');
      currentWaybill.footer.remarks = get('wb-footer-remarks');
      currentWaybill.footer.standingDays = getNum('wb-footer-standing') || 0;
      currentWaybill.footer.freightPrice = getFloat('wb-footer-freight');
      const dep = currentWaybill.header.departureKm;
      const arr = currentWaybill.footer.arrivalKm;
      if (dep != null && arr != null) currentWaybill.footer.totalKm = Math.max(0, arr - dep);
      saveWaybillToStorage();
    }

    waybillPdfBlob = null;
    waybillPdfFileName = '';

    async function buildWaybillPdfDoc() {
      if (!window.__waybillViewingClosed) syncWaybillFromDOM();
      const w = currentWaybill;
      const h = w.header;
      const f = w.footer;
      const entries = w.entries || [];
      if (!entries.length) {
        if (typeof showCustomAlert === 'function') showCustomAlert(t('waybill.newEntry') + ' – legalább egy bejegyzés szükséges a PDF-hez.', 'info');
        return null;
      }
      if (typeof window.ensureJsPdf === 'function') {
        try { await window.ensureJsPdf(); } catch (e) {
          if (typeof showCustomAlert === 'function') showCustomAlert('PDF könyvtár betöltése sikertelen.', 'info');
          return null;
        }
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      let font = 'helvetica';
      try {
        const regUrl = 'assets/fonts/NotoSans-Regular.ttf';
        const res = await fetch(regUrl, { cache: 'force-cache' });
        if (res && res.ok) {
          const buf = await res.arrayBuffer();
          let binary = '';
          new Uint8Array(buf).forEach(b => { binary += String.fromCharCode(b); });
          doc.addFileToVFS('NotoSans-Regular.ttf', btoa(binary));
          doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
          font = 'NotoSans';
        }
      } catch (_) {}
      doc.setFont(font, 'normal');
      doc.setFontSize(9);
      let y = 10;
      var fontBold = (font === 'NotoSans') ? 'helvetica' : font;

      function text(x, txt) { if (txt) doc.text(String(txt), x, y); }
      function nl(h) { y += h || 5; }

      doc.setFontSize(11);
      doc.setFont(fontBold, 'bold');
      doc.text('Lade-Kilometer', 105, y, { align: 'center' });
      doc.text('Palettenliste', 105, y + 5, { align: 'center' });
      doc.setFont(font, 'normal');
      y += 18;

      const truckPlate = (h.truckPlate || '').replace(/\s/g, '');
      const trailerPlate = (h.trailerPlate || '').replace(/\s/g, '');
      const leftW = 55;
      const midW = 50;
      const pageW = doc.internal.pageSize.width;
      const leftX = 14;
      const midX = 14 + leftW;
      const rowH = 5;
      const headerStartY = y;

      doc.setFontSize(9);
      doc.text(h.companyName || '', leftX, y);
      y += rowH;
      const addrParts = (h.companyAddress || '').split(',').map(s => s.trim()).filter(Boolean);
      if (addrParts[0]) { doc.text(addrParts[0], leftX, y); y += rowH; }
      if (addrParts[1]) { doc.text(addrParts[1], leftX, y); y += rowH; }
      const leftBlockEnd = y;
      y = headerStartY;

      if (h.logoBase64 && (h.logoBase64.indexOf('data:image/') === 0)) {
        try {
          const fmt = (h.logoBase64.indexOf('data:image/jpeg') === 0 || h.logoBase64.indexOf('data:image/jpg') === 0) ? 'JPEG' : 'PNG';
          const imgW = 38;
          const imgH = 18;
          const blockH = Math.max(leftBlockEnd - headerStartY, rowH * 3);
          const logoY = headerStartY + (blockH - imgH) / 2;
          doc.addImage(h.logoBase64, fmt, midX + (midW - imgW) / 2, logoY, imgW, imgH);
        } catch (_) {}
      }
      y = leftBlockEnd;

      const rightEdge = pageW - 14;
      doc.setFont(fontBold, 'bold');
      doc.text('LKW-Kz: ' + truckPlate, rightEdge, headerStartY, { align: 'right' });
      doc.text('Sattel-Kz: ' + trailerPlate, rightEdge, headerStartY + rowH, { align: 'right' });
      doc.setFont(font, 'normal');
      doc.text(h.driverName || '', rightEdge, headerStartY + rowH * 2, { align: 'right' });
      y = Math.max(y, headerStartY + rowH * 2);

      const depLoc = h.departureLocation || {};
      const plzOrt = [depLoc.country, depLoc.zip, depLoc.city].filter(Boolean).join(' ') || '';
      const depDateFmt = formatDateEu(h.departureDate);
      const depKmVal = h.departureKm != null ? String(h.departureKm) : '';
      doc.autoTable({
        startY: y + 2,
        body: [
          ['Auftraggeber: ' + (h.client || ''), '', h.driverName || ''],
          ['Abfahrt am: ' + depDateFmt, 'PLZ + Ort: ' + plzOrt, 'Km-Abfahrt: ' + depKmVal]
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 56 }, 1: { cellWidth: 58 }, 2: { cellWidth: 56 } },
        margin: { left: 14 },
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.2
      });
      y = doc.lastAutoTable.finalY + 6;

      const sectionOrder = ['export', 'exImport', 'import'];
      const sectionLabels = { export: 'Export', exImport: 'Ex-Import', import: 'Import' };
      const mapped = [];
      entries.forEach(e => {
        const rows = mapEntryToSection(e);
        rows.forEach(r => mapped.push(r));
      });
      const tableHeaders = [['', 'Plz + Ort', 'Datum', 'Geladene Paletten', 'Abgeladene Paletten', 'Getauschte Paletten']];

      sectionOrder.forEach(sectionKey => {
        const sectionRows = mapped.filter(r => r.section === sectionKey);
        if (!sectionRows.length) return;
        const ladestRows = sectionRows.filter(r => r.subGroup === 'ladest');
        const endladestRows = sectionRows.filter(r => r.subGroup === 'endladest');
        const body = [];
        const headRow = [[sectionLabels[sectionKey], 'Plz + Ort', 'Datum', 'Geladene Paletten', 'Abgeladene Paletten', 'Getauschte Paletten']];
        ladestRows.forEach((r, i) => {
          const e = r.entry;
          const loc = e.location || {};
          const plz = [loc.country, loc.zip, loc.city].filter(Boolean).join(' ') || '';
          const p = e.pallets || {};
          const kmVal = e.km != null ? String(e.km) : '';
          const firstCol = (i + 1) + '. Ladest-Km' + (kmVal ? ' ' + kmVal : '');
          body.push([firstCol, plz, formatDateEu(e.date) || e.date || '', p.loaded || '', p.unloaded || '', p.swapped || '']);
        });
        endladestRows.forEach((r, i) => {
          const e = r.entry;
          const loc = e.location || {};
          const plz = [loc.country, loc.zip, loc.city].filter(Boolean).join(' ') || '';
          const p = e.pallets || {};
          const kmVal = e.km != null ? String(e.km) : '';
          const firstCol = (i + 1) + '. Endladest-Km' + (kmVal ? ' ' + kmVal : '');
          body.push([firstCol, plz, formatDateEu(e.date) || e.date || '', p.loaded || '', p.unloaded || '', p.swapped || '']);
        });
        if (body.length) {
          doc.setFont(fontBold, 'bold');
          doc.autoTable({
            startY: y,
            head: headRow,
            body: body,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fontSize: 8, fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
            margin: { left: 14 },
            columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 68 }, 2: { cellWidth: 20 }, 3: { cellWidth: 10 }, 4: { cellWidth: 11 }, 5: { cellWidth: 10 } },
            margin: { left: 14, right: 14 },
            tableLineColor: [0, 0, 0],
            tableLineWidth: 0.2
          });
          doc.setFont(font, 'normal');
          y = doc.lastAutoTable.finalY + 8;
        }
      });

      if (y > 235) doc.addPage();
      y = Math.max(y, doc.internal.pageSize.height - 55);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.line(14, y - 2, 196, y - 2);
      y += 6;
      doc.setFontSize(8);
      const arrDateFmt = formatDateEu(f.arrivalDate);
      const footBody = [
        ['Ankunft am: ' + arrDateFmt, 'Summe: ' + (f.totalKm != null ? String(f.totalKm) : ''), 'Anzahl der Stehtage: ' + (f.standingDays != null ? String(f.standingDays) : '')],
        ['Km-Stand-Ankunft: ' + (f.arrivalKm != null ? String(f.arrivalKm) : ''), 'Vermerk: ' + (f.remarks || ''), 'Frachtpreis: € ' + (f.freightPrice != null ? String(f.freightPrice) : '')],
        ['Gesamt-Kilometer: ' + (f.totalKm != null ? String(f.totalKm) : ''), '', '']
      ];
      doc.autoTable({
        startY: y,
        body: footBody,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 56 }, 1: { cellWidth: 58 }, 2: { cellWidth: 56 } },
        margin: { left: 14 },
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.2
      });
      y = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('GuriGO - gurigo.eu', 105, doc.internal.pageSize.height - 8, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      return doc;
    }

    window.waybillGeneratePdf = async function() {
      try {
        const doc = await buildWaybillPdfDoc();
        if (!doc) return;
        if (!window.__waybillViewingClosed) loadWaybillFromStorage();
        waybillPdfBlob = doc.output('blob');
        const depDate = currentWaybill && currentWaybill.header && currentWaybill.header.departureDate;
        const dateVal = typeof depDate === 'string' ? depDate : (depDate && typeof depDate.toDate === 'function' ? depDate.toDate().toISOString().slice(0, 10) : '');
        const dateStr = dateVal ? dateVal.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
        waybillPdfFileName = 'Menetlevel_' + dateStr + '.pdf';
        const resultEl = document.getElementById('waybill-pdf-result');
        if (resultEl) { resultEl.style.display = ''; resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        if (typeof showCustomAlert === 'function') showCustomAlert(t('waybill.generatePdf') + ' ✓', 'success', null, { okText: 'OK' });
      } catch (e) {
        console.error('[Waybill] PDF error:', e);
        if (typeof showCustomAlert === 'function') showCustomAlert('Hiba a PDF generálásakor: ' + (e && e.message ? e.message : ''), 'info');
      }
    };

    window.waybillPdfSave = function() {
      if (!waybillPdfBlob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(waybillPdfBlob);
      a.download = waybillPdfFileName || 'Menetlevel.pdf';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 500);
    };

    window.waybillPdfShare = function() {
      if (!waybillPdfBlob) return;
      const fileName = waybillPdfFileName || 'Menetlevel.pdf';
      const pdfFile = new File([waybillPdfBlob], fileName, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        navigator.share({ files: [pdfFile], title: 'Menetlevél', text: fileName }).catch(() => {
          const blobUrl = URL.createObjectURL(waybillPdfBlob);
          const w = window.open(blobUrl, '_blank');
          if (w) setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        });
      } else {
        const blobUrl = URL.createObjectURL(waybillPdfBlob);
        const w = window.open(blobUrl, '_blank');
        if (w) setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      }
    };

    window.waybillPdfPrint = function() {
      if (!waybillPdfBlob) return;
      const blobUrl = URL.createObjectURL(waybillPdfBlob);
      const w = window.open(blobUrl, '_blank', 'width=800,height=600');
      if (w) {
        w.onload = function() { try { w.print(); } catch (_) {} };
        setTimeout(function() { try { w.print(); } catch (_) {} URL.revokeObjectURL(blobUrl); }, 800);
      } else {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = waybillPdfFileName || 'Menetlevel.pdf';
        a.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 500);
      }
    };

    // Header mentés változáskor
    ['wb-header-company', 'wb-header-address', 'wb-header-driver', 'wb-header-truck', 'wb-header-trailer', 'wb-header-client', 'wb-header-departure-date', 'wb-header-departure-km', 'wb-header-dep-country', 'wb-header-dep-zip', 'wb-header-dep-city'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', function() {
          loadWaybillFromStorage();
          if (id === 'wb-header-company') currentWaybill.header.companyName = el.value;
          if (id === 'wb-header-address') currentWaybill.header.companyAddress = el.value;
          if (id === 'wb-header-driver') currentWaybill.header.driverName = el.value;
          if (id === 'wb-header-truck') currentWaybill.header.truckPlate = el.value;
          if (id === 'wb-header-trailer') currentWaybill.header.trailerPlate = el.value;
          if (id === 'wb-header-client') currentWaybill.header.client = el.value;
          if (id === 'wb-header-departure-date') currentWaybill.header.departureDate = el.value;
          if (id === 'wb-header-departure-km') currentWaybill.header.departureKm = el.value.trim() !== '' ? parseInt(el.value, 10) : null;
          if (id === 'wb-header-dep-country') { currentWaybill.header.departureLocation = currentWaybill.header.departureLocation || {}; currentWaybill.header.departureLocation.country = el.value; }
          if (id === 'wb-header-dep-zip') { currentWaybill.header.departureLocation = currentWaybill.header.departureLocation || {}; currentWaybill.header.departureLocation.zip = el.value; }
          if (id === 'wb-header-dep-city') { currentWaybill.header.departureLocation = currentWaybill.header.departureLocation || {}; currentWaybill.header.departureLocation.city = el.value; }
          saveWaybillToStorage();
        });
      }
    });

    // Lábléc mentés változáskor
    ['wb-footer-arrival', 'wb-footer-arrival-km', 'wb-footer-remarks', 'wb-footer-standing', 'wb-footer-freight'].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', function() {
          loadWaybillFromStorage();
          if (id === 'wb-footer-arrival') currentWaybill.footer.arrivalDate = el.value;
          if (id === 'wb-footer-arrival-km') currentWaybill.footer.arrivalKm = el.value.trim() !== '' ? parseInt(el.value, 10) : null;
          if (id === 'wb-footer-remarks') currentWaybill.footer.remarks = el.value;
          if (id === 'wb-footer-standing') currentWaybill.footer.standingDays = parseInt(el.value, 10) || 0;
          if (id === 'wb-footer-freight') currentWaybill.footer.freightPrice = el.value.trim() !== '' ? parseFloat(el.value) : null;
          saveWaybillToStorage();
        });
      }
    });

    renderWaybillEntries();

    if (waybillPdfBlob) {
      const resultEl = document.getElementById('waybill-pdf-result');
      if (resultEl) resultEl.style.display = '';
    }

    // Lezárt menetlevelek listájának betöltése
    (function loadClosedWaybillsList() {
      const wrap = document.getElementById('wb-closed-waybills-wrap');
      const listEl = document.getElementById('wb-closed-list-container');
      if (!listEl || !window.currentUser || typeof window.getClosedWaybills !== 'function') return;
      window.getClosedWaybills(window.currentUser.uid).then(function(list) {
        // #region agent log
        try { fetch('http://127.0.0.1:7747/ingest/b4713f45-5870-4241-a5a4-77a5b49ff57f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'866011'},body:JSON.stringify({sessionId:'866011',location:'waybill.js:closedListThen',message:'getClosedWaybills then',data:{listLen:(list&&list.length)|0},timestamp:Date.now(),hypothesisId:'H4'})}).catch(function(){}); } catch(_) {}
        // #endregion
        try {
          var arr = Array.isArray(list) ? list : [];
          if (!arr.length) {
            listEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">' + (t('waybill.closedListEmpty', 'Még nincs lezárt menetlevél.') || 'Még nincs lezárt menetlevél.') + '</p>';
            return;
          }
          listEl.innerHTML = arr.map(function(wb) {
            const h = (wb && wb.header && typeof wb.header === 'object') ? wb.header : {};
            const dateStr = toDateValue(h.departureDate, wb && wb.closedAtMs ? new Date(wb.closedAtMs).toISOString().slice(0, 10) : '');
            const label = (h.companyName || h.client || (wb && wb.id) || '').toString().replace(/"/g, '&quot;');
            const entryCount = Array.isArray(wb && wb.entries) ? wb.entries.length : 0;
            return '<button type="button" class="wb-closed-item w-full text-left px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-900 dark:text-gray-100" data-waybill-id="' + String(wb && wb.id || '').replace(/"/g, '&quot;') + '">' +
              '<span class="font-medium">' + (label || t('waybill.closedNoTitle', 'Menetlevél')) + '</span>' +
              ' <span class="text-gray-500 dark:text-gray-400">' + dateStr + '</span>' +
              (entryCount ? ' <span class="text-gray-400 dark:text-gray-500">(' + entryCount + ' ' + (t('waybill.entriesCount', 'bejegyzés') || 'bejegyzés') + ')</span>' : '') +
              '</button>';
          }).join('');
          listEl.querySelectorAll('.wb-closed-item').forEach(function(btn) {
            btn.addEventListener('click', function() {
              const id = this.getAttribute('data-waybill-id');
              const wb = arr.find(function(x) { return x && x.id === id; });
              if (wb && typeof renderWaybillClosedView === 'function') renderWaybillClosedView(wb);
            });
          });
        } catch (e) {
          console.error('[Waybill] closed list render:', e);
          listEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">' + (t('waybill.closedListEmpty', 'Még nincs lezárt menetlevél.') || 'Még nincs lezárt menetlevél.') + '</p>';
        }
      }).catch(function(e) {
        console.warn('[Waybill] getClosedWaybills failed:', e && e.message);
        if (listEl) listEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">' + (t('waybill.closedListEmpty', 'Még nincs lezárt menetlevél.') || 'Még nincs lezárt menetlevél.') + '</p>';
      });
    })();
    } catch (e) {
      console.error('[Waybill] render error:', e);
      container.innerHTML = '<p class="p-4 text-red-600 dark:text-red-400">' + (typeof t === 'function' ? t('waybill.error', 'Hiba') : 'Hiba') + ': ' + (e && (e.message || String(e))) + '</p>';
    }
    } catch (outerErr) {
      console.error('[Waybill] render error (outer):', outerErr);
      if (container) container.innerHTML = '<p class="p-4 text-red-600 dark:text-red-400">' + (typeof t === 'function' ? t('waybill.error', 'Hiba') : 'Hiba') + ': ' + (outerErr && (outerErr.message || String(outerErr))) + '</p>';
    }
  }

  function showWaybillEntryPalletTickets(entryId) {
    loadWaybillFromStorage();
    if (!currentWaybill || !currentWaybill.entries) return;
    var entry = currentWaybill.entries.find(function(e) { return e.id === entryId; });
    if (!entry || !entry.palletTxIds || !entry.palletTxIds.length) return;
    var ids = entry.palletTxIds.slice();
    var localRecords = typeof window.getPalletRecords === 'function' ? window.getPalletRecords() : [];
    var recordsById = {};
    (Array.isArray(localRecords) ? localRecords : []).forEach(function(r) { recordsById[String(r.id)] = r; });
    var missingIds = ids.filter(function(id) { return !recordsById[String(id)]; });
    function buildModal(records) {
      var rows = records.map(function(p) {
        var loc = (p && p.location) || '–';
        var given = (p && p.palletsGiven != null) ? p.palletsGiven : '–';
        var taken = (p && p.palletsTaken != null) ? p.palletsTaken : '–';
        var plate = (p && p.licensePlate) ? p.licensePlate : '';
        return '<tr><td class="px-2 py-1 text-sm">' + ((p && p.date) || '–') + '</td><td class="px-2 py-1 text-sm">' + loc + '</td><td class="px-2 py-1 text-sm">' + given + '</td><td class="px-2 py-1 text-sm">' + taken + '</td><td class="px-2 py-1 text-sm">' + plate + '</td></tr>';
      }).join('');
      var modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
      modal.innerHTML = '<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-auto"><div class="p-4 border-b border-gray-200 dark:border-gray-700"><h3 class="font-semibold text-gray-900 dark:text-gray-100">' + (t('waybill.palletTickets', 'Raklapjegyek') || 'Raklapjegyek') + '</h3></div><div class="p-4 overflow-x-auto"><table class="w-full text-left"><thead><tr><th class="px-2 py-1 text-xs text-gray-500">Dátum</th><th class="px-2 py-1 text-xs text-gray-500">Helyszín</th><th class="px-2 py-1 text-xs text-gray-500">Leadott</th><th class="px-2 py-1 text-xs text-gray-500">Átvett</th><th class="px-2 py-1 text-xs text-gray-500">Rendszám</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="p-4 border-t border-gray-200 dark:border-gray-700"><button type="button" class="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded">' + t('close', 'Bezárás') + '</button></div></div>';
      modal.addEventListener('click', function(ev) {
        if (ev.target === modal || ev.target.tagName === 'BUTTON') modal.remove();
      });
      document.body.appendChild(modal);
    }
    if (missingIds.length === 0 || !window.currentUser || !window.db) {
      var list = ids.map(function(id) { return recordsById[String(id)]; }).filter(Boolean);
      buildModal(list);
      return;
    }
    Promise.all(missingIds.map(function(id) {
      return window.db.collection('users').doc(window.currentUser.uid).collection('pallets').doc(String(id)).get().then(function(snap) {
        return snap.exists ? snap.data() : null;
      }).catch(function() { return null; });
    })).then(function(fetched) {
      fetched.forEach(function(p, i) { if (p && p.id) recordsById[String(p.id)] = p; });
      var list = ids.map(function(id) { return recordsById[String(id)]; }).filter(Boolean);
      buildModal(list);
    }).catch(function(e) {
      var list = ids.map(function(id) { return recordsById[String(id)]; }).filter(Boolean);
      buildModal(list);
    });
  }

  function addPalletIdToWaybillEntry(waybillId, entryId, palletTxId, palletRecord) {
    loadWaybillFromStorage();
    if (!currentWaybill || currentWaybill.id !== waybillId) return;
    var entry = currentWaybill.entries && currentWaybill.entries.find(function(e) { return e.id === entryId; });
    if (!entry) return;
    if (!Array.isArray(entry.palletTxIds)) entry.palletTxIds = [];
    if (entry.palletTxIds.indexOf(palletTxId) === -1) entry.palletTxIds.push(palletTxId);
    entry.palletPending = false;
    if (palletRecord) {
      entry.palletSummary = {
        given: palletRecord.palletsGiven,
        taken: palletRecord.palletsTaken,
        location: palletRecord.location,
        partner: palletRecord.partner,
        plate: palletRecord.licensePlate,
        updatedAtMs: Date.now()
      };
    }
    currentWaybill.updatedAtMs = Date.now();
    saveWaybillToStorage();
    if (window.currentUser && window.currentUser.uid && window.db && typeof window.saveWaybillDraftToFirestore === 'function') {
      window.saveWaybillDraftToFirestore(window.currentUser.uid, currentWaybill).catch(function(e) { console.warn('[Waybill] Link pallet to entry failed:', e && e.message); });
    }
  }

  function highlightWaybillEntryId(entryId) {
    if (!entryId) return;
    loadWaybillFromStorage();
    renderWaybillEntries();
    var card = document.querySelector('.waybill-entry-card[data-entry-id="' + String(entryId).replace(/"/g, '\\"') + '"]');
    if (!card) {
      var cards = document.querySelectorAll('.waybill-entry-card[data-entry-id]');
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].getAttribute('data-entry-id') === entryId) { card = cards[i]; break; }
      }
    }
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      card.style.backgroundColor = 'rgba(250, 204, 21, 0.35)';
      setTimeout(function() { card.style.backgroundColor = ''; }, 2000);
    }
  }

  /** Törlés/átlinkelés: eltávolítja a palletTxId-t az adott waybill entry-ből. TODO: hívni pallet törléskor; átlinkeléskor régi entry-ből remove, újban add. */
  function removePalletIdFromWaybillEntry(waybillId, entryId, palletTxId) {
    loadWaybillFromStorage();
    if (!currentWaybill || currentWaybill.id !== waybillId) return;
    var entry = currentWaybill.entries && currentWaybill.entries.find(function(e) { return e.id === entryId; });
    if (!entry || !Array.isArray(entry.palletTxIds)) return;
    var idx = entry.palletTxIds.indexOf(palletTxId);
    if (idx === -1) return;
    entry.palletTxIds.splice(idx, 1);
    currentWaybill.updatedAtMs = Date.now();
    saveWaybillToStorage();
    if (window.currentUser && window.currentUser.uid && window.db && typeof window.saveWaybillDraftToFirestore === 'function') {
      window.saveWaybillDraftToFirestore(window.currentUser.uid, currentWaybill).catch(function(e) { console.warn('[Waybill] Unlink pallet from entry failed:', e && e.message); });
    }
  }

  window.showWaybillEntryPalletTickets = showWaybillEntryPalletTickets;
  window.addPalletIdToWaybillEntry = addPalletIdToWaybillEntry;
  window.removePalletIdFromWaybillEntry = removePalletIdFromWaybillEntry;
  window.highlightWaybillEntryId = highlightWaybillEntryId;

  window.renderWaybillTab = renderWaybillTab;

  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      if (document.getElementById('content-waybill')) loadWaybillFromStorage();
    });
  }
})();
