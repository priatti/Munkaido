// =======================================================
// ===== 2×24 (KÉT CSÖKKENTETT HETI PIHENŐ) – READ-ONLY ===
// =======================================================
// SZIGORÚ KORLÁTOK:
// - Nem módosít műszak rekordokat / napi eseményeket / tachó aggregációt / meglévő heti pihenő logikát.
// - Csak olvas (records-ból gap-eket, settings docból twoReduced mezőket).
// - Csak a saját Firestore mezőit írja: weeklyRest.twoReduced.* (merge update).

(function () {
  'use strict';

  const SETTINGS_DEFAULT = {
    optedIn: false,
    internationalConfirmed: null,
    confirmedAt: null,
    lastPromptRestEndIso: null
  };

  function safeNow(now) {
    try {
      if (!now) return new Date();
      if (now instanceof Date) return now;
      return new Date(now);
    } catch (_) {
      return new Date();
    }
  }

  function normalizeTwoReducedSettings(settings) {
    const s = settings || {};
    return {
      optedIn: !!s.optedIn,
      internationalConfirmed: (s.internationalConfirmed === true) ? true : (s.internationalConfirmed === false ? false : null),
      confirmedAt: s.confirmedAt || null,
      lastPromptRestEndIso: (typeof s.lastPromptRestEndIso === 'string' && s.lastPromptRestEndIso) ? s.lastPromptRestEndIso : null
    };
  }

  function isReducedWeeklyRestBlock(block) {
    if (!block) return false;
    const h = Number(block.durationHours);
    return isFinite(h) && h >= 24 && h < 45;
  }

  function restEndToIso(block) {
    try {
      if (!block || !block.end) return null;
      const d = (block.end instanceof Date) ? block.end : new Date(block.end);
      if (isNaN(d)) return null;
      return d.toISOString();
    } catch (_) {
      return null;
    }
  }

  function evaluateTwoReducedWeeklyRest({ weeklyRestBlocks, now, settings }) {
    const currentNow = safeNow(now);
    const s = normalizeTwoReducedSettings(settings);

    const blocks = Array.isArray(weeklyRestBlocks) ? weeklyRestBlocks : [];

    const lastBlock = blocks.length > 0 ? blocks[0] : null;
    const reducedDetected = isReducedWeeklyRestBlock(lastBlock);

    if (!reducedDetected) {
      return {
        shouldPrompt: false,
        promptReason: 'NONE',
        status: 'NO',
        allowed: null,
        messageKey: 'twoReducedNotRelevant',
        detailsKey: null,
        actions: { canEnable: false, canDisable: false, canEdit: false }
      };
    }

    const editLabelKey = (s.internationalConfirmed === null) ? 'twoReducedAnswerButton' : 'twoReducedEditButton';

    if (s.internationalConfirmed === null) {
      return {
        shouldPrompt: true,
        promptReason: 'FIRST_REDUCED_DETECTED',
        status: 'INFO',
        allowed: null,
        messageKey: 'twoReducedDetectedAskInternationalBody',
        detailsKey: 'twoReducedDetectedAskInternationalDetails',
        actions: { canEnable: false, canDisable: false, canEdit: true, editLabelKey }
      };
    }

    if (s.internationalConfirmed === false) {
      return {
        shouldPrompt: false,
        promptReason: 'NONE',
        status: 'INFO',
        allowed: false,
        messageKey: 'twoReducedNotAllowedDomestic',
        detailsKey: 'twoReducedAnytimeChangeNote',
        actions: { canEnable: false, canDisable: false, canEdit: true, editLabelKey }
      };
    }

    if (!s.optedIn) {
      return {
        shouldPrompt: false,
        promptReason: 'NONE',
        status: 'INFO',
        allowed: true,
        messageKey: 'twoReducedAvailableEnablePrompt',
        detailsKey: 'twoReducedAnytimeChangeNote',
        actions: { canEnable: true, canDisable: false, canEdit: true, editLabelKey }
      };
    }

    return {
      shouldPrompt: false,
      promptReason: 'NONE',
      status: 'OK',
      allowed: true,
      messageKey: 'twoReducedEnabledLabel',
      detailsKey: 'twoReducedAnytimeChangeNote',
      actions: { canEnable: false, canDisable: true, canEdit: true, editLabelKey }
    };
  }

  function getI18n() {
    try {
      if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
        return translations[currentLang] || {};
      }
    } catch (_) {}
    return {};
  }

  function t(key, fallback) {
    const i18n = getI18n();
    try {
      const v = i18n[key];
      if (v === undefined || v === null || String(v).trim() === '') return fallback;
      return v;
    } catch (_) {
      return fallback;
    }
  }

  function getRecordsSorted() {
    const src = (Array.isArray(window.records) && window.records.length > 0) ? window.records : (typeof demoRecords !== 'undefined' ? demoRecords : []);
    const arr = Array.isArray(src) ? [...src] : [];
    arr.sort((a, b) => new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${b.startTime}`).getTime());
    return arr;
  }

  function detectWeeklyRestBlocksFromRecords(recordsSorted) {
    const blocks = [];
    if (!Array.isArray(recordsSorted) || recordsSorted.length < 2) return blocks;

    for (let i = recordsSorted.length - 1; i > 0; i--) {
      const prev = recordsSorted[i - 1];
      const curr = recordsSorted[i];
      if (!prev || !curr) continue;
      const prevEndDateStr = prev.endDate || prev.date;
      const prevEnd = new Date(`${prevEndDateStr}T${prev.endTime}`);
      const currStart = new Date(`${curr.date}T${curr.startTime}`);
      if (isNaN(prevEnd) || isNaN(currStart)) continue;

      const durationHours = (currStart - prevEnd) / (1000 * 60 * 60);
      if (durationHours >= 24) {
        blocks.push({
          start: prevEnd,
          end: currStart,
          durationHours,
          kind: durationHours >= 45 ? 'REGULAR_WEEKLY_REST' : 'REDUCED_WEEKLY_REST',
          source: 'heuristic',
          dataQuality: 'LOW'
        });
        break;
      }
    }

    return blocks;
  }

  async function loadTwoReducedSettingsFromFirestore() {
    if (!window.currentUser || typeof db === 'undefined') {
      return { ...SETTINGS_DEFAULT };
    }

    try {
      const doc = await db
        .collection('users')
        .doc(window.currentUser.uid)
        .collection('settings')
        .doc('config')
        .get();

      if (!doc.exists) return { ...SETTINGS_DEFAULT };

      const data = doc.data() || {};
      const tr = (((data.weeklyRest || {}).twoReduced) || {});
      return normalizeTwoReducedSettings(tr);
    } catch (e) {
      try { console.warn('[twoReduced] settings load failed', e); } catch (_) {}
      return { ...SETTINGS_DEFAULT };
    }
  }

  async function saveTwoReducedSettingsToFirestore(partial) {
    if (!window.currentUser || typeof db === 'undefined') return;

    const p = partial || {};
    const payload = {};
    if (Object.prototype.hasOwnProperty.call(p, 'optedIn')) payload['weeklyRest.twoReduced.optedIn'] = !!p.optedIn;
    if (Object.prototype.hasOwnProperty.call(p, 'internationalConfirmed')) {
      payload['weeklyRest.twoReduced.internationalConfirmed'] = (p.internationalConfirmed === true)
        ? true
        : (p.internationalConfirmed === false ? false : null);
    }
    if (Object.prototype.hasOwnProperty.call(p, 'confirmedAt')) payload['weeklyRest.twoReduced.confirmedAt'] = p.confirmedAt;
    if (Object.prototype.hasOwnProperty.call(p, 'lastPromptRestEndIso')) payload['weeklyRest.twoReduced.lastPromptRestEndIso'] = p.lastPromptRestEndIso;

    try {
      const docRef = db
        .collection('users')
        .doc(window.currentUser.uid)
        .collection('settings')
        .doc('config');

      try {
        await docRef.update(payload);
      } catch (e) {
        const nested = { weeklyRest: { twoReduced: {} } };
        if (Object.prototype.hasOwnProperty.call(p, 'optedIn')) nested.weeklyRest.twoReduced.optedIn = !!p.optedIn;
        if (Object.prototype.hasOwnProperty.call(p, 'internationalConfirmed')) {
          nested.weeklyRest.twoReduced.internationalConfirmed = (p.internationalConfirmed === true)
            ? true
            : (p.internationalConfirmed === false ? false : null);
        }
        if (Object.prototype.hasOwnProperty.call(p, 'confirmedAt')) nested.weeklyRest.twoReduced.confirmedAt = p.confirmedAt;
        if (Object.prototype.hasOwnProperty.call(p, 'lastPromptRestEndIso')) nested.weeklyRest.twoReduced.lastPromptRestEndIso = p.lastPromptRestEndIso;
        await docRef.set(nested, { merge: true });
      }
    } catch (e) {
      try { console.warn('[twoReduced] settings save failed', e); } catch (_) {}
    }
  }

  function ensureCardContainer() {
    const live = document.getElementById('content-live');
    const anchor = document.getElementById('live-allowance-display');
    if (!live || !anchor) return null;

    let el = document.getElementById('two-reduced-weekly-rest-card');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'two-reduced-weekly-rest-card';
    el.className = 'mt-3';
    anchor.insertAdjacentElement('afterend', el);
    return el;
  }

  function closeModal() {
    try {
      const modal = document.getElementById('two-reduced-weekly-rest-modal');
      if (modal) modal.remove();
    } catch (_) {}
  }

  function openModal(state) {
    closeModal();

    const i18n = getI18n();
    const lang = (typeof window !== 'undefined' && window.currentLang) ? window.currentLang : 'hu';

    const modal = document.createElement('div');
    modal.id = 'two-reduced-weekly-rest-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';

    const title = t('twoReducedModalTitle', '2×24 könnyítés');
    const q1 = t('twoReducedAskInternational', 'Ez a csökkentett heti pihenő nemzetközi fuvarhoz kapcsolódott?');
    const q2 = t('twoReducedEnableQuestion', 'Szeretnéd használni a 2×24 könnyítést a következő heti pihenőre?');
    const yes = i18n.okYes || 'Yes';
    const no = i18n.okNo || 'No';
    const note = t('twoReducedAnytimeChangeNote', 'Bármikor megváltoztathatod ezen a kártyán.');

    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-[420px] w-full overflow-hidden" style="max-height:90vh;">
        <div id="two-reduced-modal-header" class="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 id="two-reduced-modal-title" class="text-lg font-bold text-gray-900 dark:text-gray-100">${title}</h3>
          <p id="two-reduced-modal-step" class="text-xs text-gray-500 dark:text-gray-400 mt-1"></p>
        </div>
        <div class="p-4 space-y-4" id="two-reduced-modal-body" style="overflow-y:auto; max-height:calc(90vh - 110px);"></div>
        <div class="p-3 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button id="two-reduced-close" class="px-4 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold" style="min-width:110px;">${i18n.cancel || 'Cancel'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = document.getElementById('two-reduced-close');
    closeBtn && closeBtn.addEventListener('click', function () { closeModal(); });

    function setStepUi(step) {
      try {
        const header = document.getElementById('two-reduced-modal-header');
        const stepEl = document.getElementById('two-reduced-modal-step');
        if (stepEl) stepEl.textContent = (step === 1) ? '1/2' : '2/2';
        if (header) {
          if (step === 1) {
            header.style.backgroundColor = 'rgba(37,99,235,0.12)';
          } else {
            header.style.backgroundColor = 'rgba(22,163,74,0.12)';
          }
        }
      } catch (_) {}
    }

    function renderStep1() {
      setStepUi(1);
      const body = document.getElementById('two-reduced-modal-body');
      if (!body) return;
      body.innerHTML = `
        <div class="rounded-lg p-3" style="background-color:rgba(37,99,235,0.08);">
          <p class="text-sm text-gray-700 dark:text-gray-300">${q1}</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button id="two-reduced-q1-yes" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold" style="background-color:#2563eb;color:#ffffff;">${yes}</button>
          <button id="two-reduced-q1-no" class="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold">${no}</button>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">${note}</p>
      `;

      const q1Yes = document.getElementById('two-reduced-q1-yes');
      const q1No = document.getElementById('two-reduced-q1-no');

      q1No && q1No.addEventListener('click', async function () {
        try {
          const payload = {
            internationalConfirmed: false,
            optedIn: false,
            confirmedAt: Date.now()
          };
          if (state && typeof state.lastRestEndIso === 'string' && state.lastRestEndIso) {
            payload.lastPromptRestEndIso = state.lastRestEndIso;
          }
          await saveTwoReducedSettingsToFirestore(payload);
        } catch (_) {}
        closeModal();
        try { window.renderTwoReducedWeeklyRestCard && window.renderTwoReducedWeeklyRestCard(); } catch (_) {}
      });

      q1Yes && q1Yes.addEventListener('click', function () {
        try { renderStep2(); } catch (e) { try { console.warn('[twoReduced] modal yes click failed', e); } catch (_) {} }
      });
    }

    function renderStep2() {
      setStepUi(2);
      const body = document.getElementById('two-reduced-modal-body');
      if (!body) return;
      body.innerHTML = `
        <div class="rounded-lg p-3" style="background-color:rgba(22,163,74,0.08);">
          <p class="text-sm text-gray-700 dark:text-gray-300">${q2}</p>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <button id="two-reduced-q2-yes" class="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold" style="background-color:#16a34a;color:#ffffff;">${yes}</button>
          <button id="two-reduced-q2-no" class="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold">${no}</button>
        </div>
        <div class="flex justify-between items-center pt-1">
          <button id="two-reduced-back" class="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700" style="display:flex;align-items:center;gap:8px;min-width:120px;justify-content:center;">
            <span aria-hidden="true">←</span>
            <span>${lang === 'de' ? 'Zurück' : 'Vissza'}</span>
          </button>
          <span class="text-xs text-gray-500 dark:text-gray-400">${note}</span>
        </div>
      `;

      const backBtn = document.getElementById('two-reduced-back');
      backBtn && backBtn.addEventListener('click', function () { renderStep1(); });

      const q2Yes = document.getElementById('two-reduced-q2-yes');
      const q2No = document.getElementById('two-reduced-q2-no');

      q2Yes && q2Yes.addEventListener('click', async function () {
        try {
          const payload = {
            internationalConfirmed: true,
            optedIn: true,
            confirmedAt: Date.now()
          };
          if (state && typeof state.lastRestEndIso === 'string' && state.lastRestEndIso) {
            payload.lastPromptRestEndIso = state.lastRestEndIso;
          }
          await saveTwoReducedSettingsToFirestore(payload);
        } catch (_) {}
        closeModal();
        try { window.renderTwoReducedWeeklyRestCard && window.renderTwoReducedWeeklyRestCard(); } catch (_) {}
      });

      q2No && q2No.addEventListener('click', async function () {
        try {
          const payload = {
            internationalConfirmed: true,
            optedIn: false,
            confirmedAt: Date.now()
          };
          if (state && typeof state.lastRestEndIso === 'string' && state.lastRestEndIso) {
            payload.lastPromptRestEndIso = state.lastRestEndIso;
          }
          await saveTwoReducedSettingsToFirestore(payload);
        } catch (_) {}
        closeModal();
        try { window.renderTwoReducedWeeklyRestCard && window.renderTwoReducedWeeklyRestCard(); } catch (_) {}
      });
    }

    renderStep1();
  }

  async function renderTwoReducedWeeklyRestCard() {
    const tier = (typeof window.getEffectiveSubscriptionTier === 'function')
      ? window.getEffectiveSubscriptionTier()
      : 'free';
    if (tier === 'free') {
      const el = document.getElementById('two-reduced-weekly-rest-card');
      if (el) {
        el.innerHTML = '';
        el.style.display = 'none';
      }
      return;
    }
    const container = ensureCardContainer();
    if (!container) return;
    container.style.display = '';

    const recordsSorted = getRecordsSorted();

    let weeklyRestBlocks = [];
    try {
      if (typeof window.getWeeklyRestBlocksFromTachograph === 'function') {
        weeklyRestBlocks = window.getWeeklyRestBlocksFromTachograph(recordsSorted);
      }
    } catch (_) {
      weeklyRestBlocks = [];
    }

    const fallbackBlocks = detectWeeklyRestBlocksFromRecords(recordsSorted);
    if (!Array.isArray(weeklyRestBlocks) || weeklyRestBlocks.length === 0) {
      weeklyRestBlocks = fallbackBlocks;
    }

    const settings = await loadTwoReducedSettingsFromFirestore();
    const decision = evaluateTwoReducedWeeklyRest({
      weeklyRestBlocks: weeklyRestBlocks,
      now: Date.now(),
      settings
    });

    const lastBlock = (Array.isArray(weeklyRestBlocks) && weeklyRestBlocks.length > 0) ? weeklyRestBlocks[0] : null;
    const lastRestEndIso = restEndToIso(lastBlock);

    const reliableForPrompt = !!(
      lastBlock &&
      lastRestEndIso &&
      lastBlock.source === 'tachograph' &&
      lastBlock.dataQuality === 'HIGH' &&
      settings &&
      settings.lastPromptRestEndIso !== lastRestEndIso
    );

    if (!weeklyRestBlocks || weeklyRestBlocks.length === 0 || decision.messageKey === 'twoReducedNotRelevant') {
      container.innerHTML = '';
      return;
    }

    const title = t('twoReducedCardTitle', '2×24 könnyítés');
    const body = t(decision.messageKey, '');
    const infoNote = decision.detailsKey ? t(decision.detailsKey, '') : '';

    let actionHtml = '';
    const allowEditAnytime = !!(settings && settings.internationalConfirmed !== null);
    const canShowEditButton = !!(decision.actions && decision.actions.canEdit && (reliableForPrompt || allowEditAnytime));
    if (canShowEditButton) {
      const labelKey = (decision.actions && decision.actions.editLabelKey) ? decision.actions.editLabelKey : 'twoReducedAnswerButton';
      actionHtml += `<button id="two-reduced-edit" class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm" style="min-width:120px;">${t(labelKey, 'Módosítás')}</button>`;
    }
    if (decision.actions && decision.actions.canEnable) {
      actionHtml += `<button id="two-reduced-enable" class="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm" style="background-color:#16a34a;color:#ffffff;">${t('twoReducedEnableButton', 'Aktiválom')}</button>`;
    }
    if (decision.actions && decision.actions.canDisable) {
      actionHtml += `<button id="two-reduced-disable" class="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-gray-900 dark:bg-yellow-500 dark:hover:bg-yellow-400 dark:text-gray-900 font-semibold text-sm" style="background-color:#facc15;color:#111827;border:1px solid rgba(0,0,0,0.10);min-width:120px;">${t('twoReducedDisableButton', 'Kikapcsolás')}</button>`;
    }

    container.innerHTML = `
      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-gray-100">🛌 ${title}</h3>
            <p class="text-sm text-gray-700 dark:text-gray-300 mt-1">${body}</p>
            ${infoNote ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-2">${infoNote}</p>` : ''}
          </div>
        </div>
        <div class="flex flex-wrap gap-2">${actionHtml}</div>
      </div>
    `;

    const editBtn = document.getElementById('two-reduced-edit');
    editBtn && editBtn.addEventListener('click', function () {
      openModal({ settings, decision, lastRestEndIso: reliableForPrompt ? lastRestEndIso : null });
    });

    const enableBtn = document.getElementById('two-reduced-enable');
    enableBtn && enableBtn.addEventListener('click', async function () {
      try {
        await saveTwoReducedSettingsToFirestore({
          optedIn: true,
          confirmedAt: Date.now()
        });
      } catch (_) {}
      try { renderTwoReducedWeeklyRestCard(); } catch (_) {}
    });

    const disableBtn = document.getElementById('two-reduced-disable');
    disableBtn && disableBtn.addEventListener('click', async function () {
      try {
        await saveTwoReducedSettingsToFirestore({
          optedIn: false,
          confirmedAt: Date.now()
        });
      } catch (_) {}
      try { renderTwoReducedWeeklyRestCard(); } catch (_) {}
    });
  }

  window.evaluateTwoReducedWeeklyRest = evaluateTwoReducedWeeklyRest;
  window.renderTwoReducedWeeklyRestCard = renderTwoReducedWeeklyRestCard;

})();
