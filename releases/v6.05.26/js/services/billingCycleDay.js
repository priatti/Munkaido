/**
 * Stripe számlázási nap módosítás – modal + API (v6.05.20 beta)
 * Csak Stripe Pro; Apple IAP esetén nem jelenik meg / nem hívható.
 */
(function () {
  'use strict';

  const DAY_MIN = 1;
  const DAY_MAX = 31;

  let activeSession = null;
  let previewTimer = null;
  let lastPreview = null;

  function getI18n() {
    const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
    const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
    const t = (key, fallback) => {
      if (typeof getI18nValue === 'function') {
        const v = getI18nValue(i18n, key);
        if (v != null && v !== '') return v;
      }
      const v = i18n && i18n[key];
      return (v != null && v !== '') ? v : fallback;
    };
    return { t, i18n, lang };
  }

  function getLocale() {
    if (typeof getActiveLocale === 'function') {
      try { return getActiveLocale(); } catch (_) { /* ignore */ }
    }
    const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
    const map = { hu: 'hu-HU', de: 'de-DE', en: 'en-GB', pl: 'pl-PL', ro: 'ro-RO', da: 'da-DK', no: 'nb-NO' };
    return map[lang] || 'hu-HU';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatMoney(amount, currency) {
    const cur = String(currency || 'huf').toUpperCase();
    const n = Math.round(Number(amount) || 0);
    // HUF: a backend már egész forintot küld (96). Tilos /100 vagy *100.
    if (cur === 'HUF') {
      try {
        return new Intl.NumberFormat('hu-HU').format(n) + ' Ft';
      } catch (_) {
        return n + ' Ft';
      }
    }
    const zeroDecimal = { JPY: 1, KRW: 1 };
    const major = zeroDecimal[cur] ? n : n / 100;
    try {
      return new Intl.NumberFormat(getLocale(), {
        style: 'currency',
        currency: cur,
        maximumFractionDigits: zeroDecimal[cur] ? 0 : 2,
      }).format(major);
    } catch (_) {
      return major + ' ' + cur;
    }
  }

  /** Billing anchor dátum: UTC naptári nap (egyezik a billingCycleDay-jel). */
  function formatDateUnix(unixSeconds) {
    if (!unixSeconds) return '';
    try {
      return new Date(Number(unixSeconds) * 1000).toLocaleDateString(getLocale(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
    } catch (_) {
      return '';
    }
  }

  function formatDayOfMonthLabel(day, t) {
    const template = t('subscriptionBillingDayEveryMonthTemplate', 'minden hónap %DAY%. napja');
    const label = template.replace('%DAY%', String(day));
    if (!label) return label;
    return label.charAt(0).toLocaleUpperCase() + label.slice(1);
  }

  function formatDayOfMonthHtml(day, t) {
    const template = t('subscriptionBillingDayEveryMonthTemplate', 'minden hónap %DAY%. napja');
    const marker = '\u0000';
    return escapeHtml(template.replace('%DAY%', marker)).replace(
      marker,
      '<span class="billing-cycle-day-card__day">' + escapeHtml(String(day)) + '</span>'
    );
  }

  function deriveBillingDayFromSub(sub) {
    if (!sub) return null;
    // Egységes forrás: backend/Firestore billingCycleDay — ne dátumkonverzióból számoljunk.
    if (sub.billingCycleDay != null) {
      const n = Number(sub.billingCycleDay);
      if (Number.isInteger(n) && n >= DAY_MIN && n <= DAY_MAX) return n;
    }
    return null;
  }

  function isPreviewPaymentReady(data) {
    if (!data || !data.ok || data.previewValid !== true) return false;
    if (data.error === 'BILLING_CYCLE_STATE_MISMATCH') return false;
    const newAnchor = Number(data.newAnchorUnix);
    const periodEnd = Number(data.currentPeriodEnd);
    const bridgeDays = Number(data.daysDelta);
    const amount = data.displayAmount != null
      ? Number(data.displayAmount)
      : (data.displayAmountMinor != null
        ? Number(data.displayAmountMinor)
        : Number(data.bridgeAmountDisplay != null ? data.bridgeAmountDisplay : data.bridgeAmountMinor));
    if (!(newAnchor > periodEnd)) return false;
    if (!(bridgeDays > 0)) return false;
    if (!(amount > 0) || !Number.isFinite(amount)) return false;
    // HUF ×100 regresszió: rövid híd ne érje el a teljes havidíjat
    const cur = String(data.currency || '').toLowerCase();
    const monthly = Number(data.monthlyAmountDisplay != null ? data.monthlyAmountDisplay : data.effectiveUnitAmount);
    if (cur === 'huf' && bridgeDays <= 3 && monthly > 0 && amount >= monthly) return false;
    if (data.error === 'INVALID_BRIDGE_AMOUNT' || data.error === 'INVALID_NEW_BILLING_ANCHOR') return false;
    return true;
  }

  function canShowBillingCycleDayCard(sub) {
    if (!sub) return false;
    if (typeof window.isNativeIosAppShell === 'function' && window.isNativeIosAppShell()) return false;
    if (typeof window.getProManagementMode === 'function') {
      const mgmt = window.getProManagementMode(sub);
      if (!mgmt || mgmt.mode !== 'stripe_manage') return false;
    } else if (typeof window.isProBilledViaStripe === 'function') {
      if (!window.isProBilledViaStripe(sub)) return false;
    } else {
      return false;
    }
    if (typeof window.hasActiveStripeProSubscription === 'function') {
      if (!window.hasActiveStripeProSubscription(sub)) return false;
    }
    const cancelPending = !!(sub.cancelAtPeriodEnd);
    if (cancelPending) return false;
    return true;
  }

  function buildBillingCycleDayCardHtml(sub, t) {
    if (!canShowBillingCycleDayCard(sub)) return '';
    const day = deriveBillingDayFromSub(sub);
    const dayHtml = day
      ? formatDayOfMonthHtml(day, t)
      : escapeHtml(t('subscriptionBillingDayUnknown', 'Ismeretlen'));
    const title = t('subscriptionBillingDayCardTitle', 'Számlázási nap');
    const currentLabel = t('subscriptionBillingDayCurrentLabel', 'Jelenleg:');
    const changeBtn = t('subscriptionBillingDayChangeButton', 'Módosítás');
    const btnIcon =
      '<svg class="billing-cycle-day-card__btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" ' +
          'd="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>' +
      '</svg>';
    return (
      '<div class="billing-cycle-day-card" id="billing-cycle-day-card">' +
        '<div class="billing-cycle-day-card__row">' +
          '<div class="billing-cycle-day-card__info">' +
            '<div class="billing-cycle-day-card__title">' + escapeHtml(title) + '</div>' +
            '<div class="billing-cycle-day-card__current">' +
              '<span class="billing-cycle-day-card__label">' + escapeHtml(currentLabel) + '</span> ' +
              '<span class="billing-cycle-day-card__value">' + dayHtml + '</span>' +
            '</div>' +
          '</div>' +
          '<button type="button" id="billing-cycle-day-change-btn" class="billing-cycle-day-card__btn" ' +
            'onclick="openBillingCycleDayModal()">' +
            btnIcon +
            '<span>' + escapeHtml(changeBtn) + '</span>' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function getEls() {
    return {
      overlay: document.getElementById('billing-cycle-day-overlay'),
      title: document.getElementById('billing-cycle-day-title'),
      intro: document.getElementById('billing-cycle-day-intro'),
      daySelect: document.getElementById('billing-cycle-day-select'),
      preview: document.getElementById('billing-cycle-day-preview'),
      backBtn: document.getElementById('billing-cycle-day-back-btn'),
      confirmBtn: document.getElementById('billing-cycle-day-confirm-btn'),
      processing: document.getElementById('billing-cycle-day-processing'),
      processingText: document.getElementById('billing-cycle-day-processing-text'),
    };
  }

  function setLoading(isLoading) {
    const els = getEls();
    if (activeSession) activeSession.isLoading = !!isLoading;
    if (els.processing) {
      els.processing.classList.toggle('hidden', !isLoading);
      els.processing.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    }
    if (els.daySelect) els.daySelect.disabled = !!isLoading;
    if (els.backBtn) els.backBtn.disabled = !!isLoading;
    syncConfirmEnabled();
  }

  function syncConfirmEnabled() {
    const els = getEls();
    if (!els.confirmBtn) return;
    const day = els.daySelect ? Number(els.daySelect.value) : NaN;
    const currentDay = activeSession && activeSession.currentDay;
    const ok =
      !(activeSession && activeSession.isLoading) &&
      Number.isInteger(day) &&
      day >= DAY_MIN &&
      day <= DAY_MAX &&
      day !== currentDay &&
      lastPreview &&
      lastPreview.newDay === day &&
      isPreviewPaymentReady(lastPreview);
    els.confirmBtn.disabled = !ok;
    els.confirmBtn.classList.toggle('is-disabled', !ok);
    els.confirmBtn.setAttribute('aria-disabled', ok ? 'false' : 'true');
  }

  function fillDaySelect(currentDay) {
    const els = getEls();
    if (!els.daySelect) return;
    const { t } = getI18n();
    const options = [];
    for (let d = DAY_MIN; d <= DAY_MAX; d++) {
      if (d === currentDay) continue;
      options.push('<option value="' + d + '">' + escapeHtml(formatDayOfMonthLabel(d, t)) + '</option>');
    }
    els.daySelect.innerHTML = options.join('');
    // Alapértelmezett: current+1 vagy 1
    let preferred = (currentDay % DAY_MAX) + 1;
    if (preferred === currentDay) preferred = currentDay === DAY_MAX ? 1 : currentDay + 1;
    if (els.daySelect.querySelector('option[value="' + preferred + '"]')) {
      els.daySelect.value = String(preferred);
    } else if (els.daySelect.options.length) {
      els.daySelect.selectedIndex = 0;
    }
  }

  function renderPreviewLoading() {
    const els = getEls();
    if (!els.preview) return;
    const { t } = getI18n();
    els.preview.innerHTML =
      '<p class="text-sm text-gray-500 dark:text-gray-400 m-0">' +
      escapeHtml(t('subscriptionBillingDayPreviewLoading', 'Előnézet számítása…')) +
      '</p>';
  }

  function renderPreviewError(message) {
    const els = getEls();
    if (!els.preview) return;
    els.preview.innerHTML =
      '<p class="text-sm text-red-600 dark:text-red-400 m-0">' + escapeHtml(message || '') + '</p>';
  }

  function renderPreview(data) {
    const els = getEls();
    if (!els.preview) return;
    const { t } = getI18n();
    const currentDate = formatDateUnix(data.currentPeriodEnd);
    const newDate = formatDateUnix(data.newAnchorUnix);
    const currency = data.stripePreviewCurrency || data.currency;
    let amountAbs;
    if (data.displayAmount != null && Number.isFinite(Number(data.displayAmount))) {
      amountAbs = Math.max(0, Math.round(Number(data.displayAmount)));
    } else if (data.bridgeAmountDisplay != null && Number.isFinite(Number(data.bridgeAmountDisplay))) {
      amountAbs = Math.max(0, Math.round(Number(data.bridgeAmountDisplay)));
    } else if (data.displayAmountMinor != null && Number.isFinite(Number(data.displayAmountMinor))) {
      amountAbs = Math.max(0, Math.round(Number(data.displayAmountMinor)));
    } else if (data.bridgeAmountMinor != null && Number.isFinite(Number(data.bridgeAmountMinor))) {
      amountAbs = Math.max(0, Math.round(Number(data.bridgeAmountMinor)));
    } else {
      amountAbs = 0;
    }
    const amountLabel = formatMoney(amountAbs, currency);
    const amountLine = t(
      'subscriptionBillingDayPreviewChargeTemplate',
      'Most fizetendő időarányos díj: %AMOUNT%'
    ).replace('%AMOUNT%', amountLabel);

    const chargeNote = t(
      'subscriptionBillingDayPreviewChargeNote',
      'Ez az összeg a jelenlegi forduló és az új forduló közötti időszak díja.\n\nEzután minden hónap %DAY%. napján történik a számlázás.'
    ).replace('%DAY%', String(data.newDay));

    const billingDay = data.stripeCurrentBillingDay != null
      ? data.stripeCurrentBillingDay
      : (data.billingCycleDay != null ? data.billingCycleDay : data.currentDay);
    const billingDayLabel = billingDay != null ? String(billingDay) : '';

    const nextMonthNote = data.rolledToNextMonth
      ? t(
          'subscriptionBillingDayRolledToNextMonthTemplate',
          'Mivel ebben a hónapban a %DAY%-a már elmúlt, az új fordulónap %DATE% lesz.'
        )
          .replace('%DAY%', String(data.newDay))
          .replace('%DATE%', newDate)
      : '';

    els.preview.innerHTML =
      '<div class="billing-cycle-preview-block space-y-2 text-sm text-gray-700 dark:text-gray-200">' +
        (billingDayLabel
          ? ('<div><span class="text-gray-500 dark:text-gray-400">' +
              escapeHtml(t('subscriptionBillingDayCurrentLabel', 'Jelenleg:')) +
            '</span> <strong>' +
              escapeHtml(formatDayOfMonthLabel(Number(billingDayLabel), t)) +
            '</strong></div>')
          : '') +
        '<div><span class="text-gray-500 dark:text-gray-400">' +
          escapeHtml(t('subscriptionBillingDayPreviewCurrentAnchor', 'Jelenlegi forduló:')) +
        '</span><br><strong>' + escapeHtml(currentDate) + '</strong></div>' +
        '<div><span class="text-gray-500 dark:text-gray-400">' +
          escapeHtml(t('subscriptionBillingDayPreviewNewAnchor', 'Új forduló:')) +
        '</span><br><strong>' + escapeHtml(newDate) + '</strong></div>' +
        (nextMonthNote
          ? ('<div class="text-xs text-amber-800 dark:text-amber-200 whitespace-pre-line">' +
              escapeHtml(nextMonthNote) +
            '</div>')
          : '') +
        '<div class="pt-1 border-t border-gray-200 dark:border-gray-600 whitespace-pre-line"><strong>' +
          escapeHtml(amountLine) +
        '</strong></div>' +
        '<div class="whitespace-pre-line text-xs text-gray-600 dark:text-gray-400">' +
          escapeHtml(chargeNote) +
        '</div>' +
      '</div>';
  }

  async function fetchBillingCycleApi(endpointKey, payload) {
    const cfg = window.BILLING_CONFIG || {};
    const url = cfg.cloudFunctions && cfg.cloudFunctions[endpointKey];
    if (!url) throw new Error('MISSING_ENDPOINT');
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('NOT_AUTHENTICATED');
    const token = await user.getIdToken();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify(Object.assign({
        uid: user.uid,
        product: 'pro',
        testMode: !!cfg.testMode,
      }, payload || {})),
    });
    let data = null;
    try { data = await res.json(); } catch (_) { data = null; }
    return { res, data };
  }

  async function runPreview() {
    const els = getEls();
    if (!els.daySelect || !activeSession) return;
    const newDay = Number(els.daySelect.value);
    lastPreview = null;
    syncConfirmEnabled();
    if (!Number.isInteger(newDay) || newDay === activeSession.currentDay) {
      renderPreviewError(getI18n().t('subscriptionBillingDaySameDayError', 'Válassz egy másik napot.'));
      return;
    }
    renderPreviewLoading();
    try {
      const { res, data } = await fetchBillingCycleApi('previewBillingCycleChange', { newDay: newDay });
      if (!res.ok || !data || !data.ok) {
        const code = data && data.error ? data.error : 'PREVIEW_FAILED';
        lastPreview = data;
        renderPreviewError(mapErrorMessage(code, data));
        // Mismatch esetén a Stripe napot vegyük session forrásnak, ne a hibás Firestore-t
        if (data && data.stripeCurrentBillingDay != null && activeSession) {
          const bd = Number(data.stripeCurrentBillingDay);
          if (Number.isInteger(bd) && bd >= DAY_MIN && bd <= DAY_MAX) {
            activeSession.currentDay = bd;
          }
        }
        syncConfirmEnabled();
        return;
      }
      if (!isPreviewPaymentReady(data)) {
        lastPreview = data;
        renderPreviewError(mapErrorMessage(
          data.error || 'INVALID_BRIDGE_AMOUNT',
          data
        ));
        syncConfirmEnabled();
        return;
      }
      lastPreview = data;
      if (activeSession) {
        const bd = Number(
          data.stripeCurrentBillingDay != null ? data.stripeCurrentBillingDay : data.billingCycleDay
        );
        if (Number.isInteger(bd) && bd >= DAY_MIN && bd <= DAY_MAX) {
          activeSession.currentDay = bd;
        }
      }
      renderPreview(data);
      syncConfirmEnabled();
    } catch (err) {
      console.warn('[billingCycleDay] preview failed', err);
      renderPreviewError(getI18n().t('subscriptionBillingDayPreviewError', 'Nem sikerült az előnézet. Próbáld újra.'));
      syncConfirmEnabled();
    }
  }

  function schedulePreview() {
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(function () { runPreview(); }, 200);
  }

  function mapErrorMessage(code, data) {
    const { t } = getI18n();
    switch (code) {
      case 'APPLE_IAP_NOT_SUPPORTED':
        return t(
          'subscriptionBillingDayAppleOnlyStripe',
          'Ez a funkció jelenleg csak Stripe előfizetés esetén érhető el.'
        );
      case 'SAME_BILLING_DAY':
        return t('subscriptionBillingDaySameDayError', 'Válassz egy másik napot.');
      case 'INVALID_BILLING_DAY':
        return t('subscriptionBillingDayInvalidDay', 'Érvénytelen nap. Válassz 1 és 31 között.');
      case 'CANCEL_PENDING':
        return t(
          'subscriptionBillingDayCancelPending',
          'Lemondás alatt álló előfizetésnél a számlázási nap nem módosítható.'
        );
      case 'REQUIRES_ACTION':
        return t(
          'subscriptionBillingDayRequiresAction',
          'A bankod további hitelesítést kér. Fejezd be a megerősítést.'
        );
      case 'CHANGE_NOT_APPLIED':
        return t(
          'subscriptionBillingDayNotApplied',
          'A módosítás nem fejeződött be. A számlázási nap nem változott.'
        );
      case 'PAYMENT_FAILED':
        return t(
          'subscriptionBillingDayPaymentFailed',
          'A fizetés nem sikerült. Semmi sem módosult.'
        );
      case 'UNSUPPORTED_PAYMENT_METHOD':
        return t(
          'subscriptionBillingDayUnsupportedPaymentMethod',
          'Ez a fizetési mód nem támogatott a számlázási nap módosításához. Próbáld bankkártyával, Linkkel vagy Revolut Pay-jel.'
        );
      case 'INVALID_NEW_BILLING_ANCHOR':
        return t(
          'subscriptionBillingDayInvalidAnchor',
          'Érvénytelen új fordulónap. A fizetés nem indítható.'
        );
      case 'INVALID_BRIDGE_AMOUNT':
        return t(
          'subscriptionBillingDayInvalidAmount',
          'Az időarányos díj érvénytelen vagy gyanús. A fizetés nem indítható.'
        );
      case 'BILLING_CYCLE_UPDATE_LOCKED':
        return t(
          'subscriptionBillingDayUpdateLocked',
          'A számlázási nap módosítása átmenetileg zárolva van. Fizetés nem indítható.'
        );
      case 'BILLING_CYCLE_STATE_MISMATCH':
        return t(
          'subscriptionBillingDayStateMismatch',
          'Az előfizetés számlázási adatai jelenleg nem egyeznek. A módosítás átmenetileg nem hajtható végre.'
        );
      case 'YEARLY_LIMIT':
        return t(
          'subscriptionBillingDayYearlyLimit',
          'A számlázási napot évente csak egyszer módosíthatod.'
        );
      case 'SUBSCRIPTION_NOT_ACTIVE':
        if (hasOutstandingSubscriptionPayment(window.currentUserSubscription || {}, data)) {
          return t(
            'subscriptionBillingDayPastDueBody',
            'Jelenleg van egy rendezetlen előfizetési díjad. Kérjük, előbb fizesd ki a korábbi számlát, utána tudod módosítani a számlázási napot.'
          );
        }
        return t(
          'subscriptionBillingDayGenericError',
          'Nem sikerült módosítani a számlázási napot. Próbáld újra később.'
        );
      case 'NO_STRIPE_SUBSCRIPTION':
      case 'STRIPE_SUBSCRIPTION_NOT_FOUND':
        return t(
          'subscriptionBillingDayNoStripe',
          'Nem találtunk Stripe előfizetést ehhez a fiókhoz.'
        );
      default:
        return (data && data.message) ||
          t('subscriptionBillingDayGenericError', 'Nem sikerült módosítani a számlázási napot. Próbáld újra később.');
    }
  }

  function isPaymentProblemStatus(status) {
    const st = String(status || '').toLowerCase();
    return st === 'past_due' || st === 'unpaid' || st === 'payment_failed' || st === 'billing_retry';
  }

  function hasOutstandingSubscriptionPayment(sub, data) {
    if (data && isPaymentProblemStatus(data.status)) return true;
    const s = sub || {};
    const settingsSub = s.settingsSubscription && typeof s.settingsSubscription === 'object'
      ? s.settingsSubscription
      : null;
    if (s.subscriptionPaymentFailed === true) return true;
    if (settingsSub && settingsSub.paymentFailed === true) return true;
    if (
      isPaymentProblemStatus(s.status) ||
      isPaymentProblemStatus(s.subscriptionStatus) ||
      (settingsSub && (
        isPaymentProblemStatus(settingsSub.status) ||
        isPaymentProblemStatus(settingsSub.subscriptionStatus)
      ))
    ) {
      return true;
    }
    const ent = window.currentUserEntitlements;
    if (ent && (ent.isPaymentFailed === true || isPaymentProblemStatus(ent.status))) return true;
    return false;
  }

  function showPastDueBillingDayAlert() {
    const { t } = getI18n();
    if (typeof window.showSubscriptionTitleBodyAlert === 'function') {
      window.showSubscriptionTitleBodyAlert(
        t('subscriptionBillingDayPastDueTitle', 'Előbb rendezd a fizetést'),
        t(
          'subscriptionBillingDayPastDueBody',
          'Jelenleg van egy rendezetlen előfizetési díjad. Kérjük, előbb fizesd ki a korábbi számlát, utána tudod módosítani a számlázási napot.'
        )
      );
    }
  }

  function closeModal() {
    const els = getEls();
    if (!els.overlay) return;
    els.overlay.classList.add('opacity-0');
    setTimeout(function () {
      els.overlay.classList.add('hidden');
    }, 220);
    activeSession = null;
    lastPreview = null;
    if (previewTimer) {
      clearTimeout(previewTimer);
      previewTimer = null;
    }
  }

  async function openModal() {
    const sub = window.currentUserSubscription || {};
    if (!canShowBillingCycleDayCard(sub)) {
      const { t } = getI18n();
      if (typeof window.showSubscriptionTitleBodyAlert === 'function') {
        window.showSubscriptionTitleBodyAlert(
          t('subscriptionBillingDayAppleOnlyStripeTitle', 'Nem elérhető'),
          t(
            'subscriptionBillingDayAppleOnlyStripe',
            'Ez a funkció jelenleg csak Stripe előfizetés esetén érhető el.'
          )
        );
      }
      return;
    }

    if (hasOutstandingSubscriptionPayment(sub)) {
      showPastDueBillingDayAlert();
      return;
    }

    const els = getEls();
    if (!els.overlay) return;
    const { t } = getI18n();
    const currentDay = deriveBillingDayFromSub(sub);
    if (!currentDay) {
      if (typeof window.showSubscriptionTitleBodyAlert === 'function') {
        window.showSubscriptionTitleBodyAlert(
          t('subscriptionBillingDayErrorTitle', 'Nem sikerült'),
          t('subscriptionBillingDayUnknownCurrent', 'Nem tudjuk meghatározni a jelenlegi számlázási napot.')
        );
      }
      return;
    }

    activeSession = { currentDay: currentDay, isLoading: false };
    lastPreview = null;

    if (els.title) els.title.textContent = t('subscriptionBillingDayModalTitle', 'Számlázási nap módosítása');
    if (els.intro) {
      els.intro.textContent = t(
        'subscriptionBillingDayModalIntro',
        'Ha a fizetésed más időpontban érkezik, itt áthelyezheted az előfizetés havi fordulónapját.'
      );
    }
    const selectLabel = document.getElementById('billing-cycle-day-select-label');
    if (selectLabel) {
      selectLabel.textContent = t('subscriptionBillingDaySelectLabel', 'Új számlázási nap');
    }
    if (els.backBtn) els.backBtn.textContent = t('subscriptionBillingDayBack', 'Mégse');
    if (els.confirmBtn) {
      els.confirmBtn.textContent = t('subscriptionBillingDayConfirm', 'Módosítás és fizetés');
    }
    if (els.processingText) {
      els.processingText.textContent = t('subscriptionBillingDayProcessing', 'Fizetés és módosítás folyamatban…');
    }

    fillDaySelect(currentDay);
    setLoading(false);
    renderPreviewLoading();

    els.overlay.classList.remove('hidden');
    requestAnimationFrame(function () {
      els.overlay.classList.remove('opacity-0');
    });

    schedulePreview();
  }

  function newOperationId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (_) { /* ignore */ }
    return 'op_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
  }

  function loadStripeJs() {
    return new Promise(function (resolve, reject) {
      if (window.Stripe) {
        resolve(window.Stripe);
        return;
      }
      const existing = document.querySelector('script[data-gurigo-stripe-js="1"]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(window.Stripe); });
        existing.addEventListener('error', function () { reject(new Error('STRIPE_JS_LOAD_FAILED')); });
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      s.async = true;
      s.dataset.gurigoStripeJs = '1';
      s.onload = function () { resolve(window.Stripe); };
      s.onerror = function () { reject(new Error('STRIPE_JS_LOAD_FAILED')); };
      document.head.appendChild(s);
    });
  }

  /**
   * SCA / redirect: card → confirmCardPayment; Link / Revolut / redirect → confirmPayment.
   * Ismeretlen payment method → nem jelez sikert.
   */
  function resolveBillingCycleConfirmStrategy(data) {
    const pmType = data && data.paymentMethodType ? String(data.paymentMethodType) : '';
    const nextActionType = data && data.nextActionType ? String(data.nextActionType) : '';
    const redirectLike = nextActionType.indexOf('redirect') === 0
      || nextActionType === 'alipay_handle_redirect';

    if (pmType === 'card' && !redirectLike) {
      return { mode: 'card' };
    }
    if (pmType === 'link' || pmType === 'revolut_pay' || redirectLike) {
      return { mode: 'confirmPayment' };
    }
    // Hiányzó típus + nincs redirect next_action → card 3DS (use_stripe_sdk) tipikus út
    if (!pmType && (nextActionType === 'use_stripe_sdk' || !nextActionType)) {
      return { mode: 'card' };
    }
    if (!pmType) {
      return { mode: 'confirmPayment' };
    }
    return { mode: 'unsupported', paymentMethodType: pmType || 'unknown' };
  }

  async function handleRequiresAction(data, newDay, operationId) {
    const clientSecret = data && data.clientSecret;
    if (!clientSecret) {
      throw new Error('MISSING_CLIENT_SECRET');
    }
    const pk = (window.BILLING_CONFIG && window.BILLING_CONFIG.stripePublishableKey) || '';
    if (!pk) throw new Error('MISSING_PUBLISHABLE_KEY');

    const strategy = resolveBillingCycleConfirmStrategy(data);
    if (strategy.mode === 'unsupported') {
      const err = new Error('UNSUPPORTED_PAYMENT_METHOD');
      err.code = 'UNSUPPORTED_PAYMENT_METHOD';
      throw err;
    }

    const StripeCtor = await loadStripeJs();
    const stripe = StripeCtor(pk);
    let result;

    if (strategy.mode === 'card') {
      result = await stripe.confirmCardPayment(clientSecret);
    } else {
      const returnUrl = (typeof window !== 'undefined' && window.location && window.location.href)
        ? String(window.location.href).split('#')[0]
        : 'https://gurigo.eu/';
      result = await stripe.confirmPayment({
        clientSecret: clientSecret,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: 'if_required',
      });
    }

    if (result.error) {
      const err = new Error(result.error.message || 'PAYMENT_FAILED');
      err.code = 'PAYMENT_FAILED';
      throw err;
    }

    // Redirectes flow: a böngésző elnavigálhat; ha visszajöttünk, complete-et hívunk.
    const { res, data: completeData } = await fetchBillingCycleApi('completeBillingCycleDayChange', {
      newDay: newDay,
      operationId: operationId,
    });
    if (!res.ok || !completeData || !completeData.ok) {
      const code = completeData && completeData.error ? completeData.error : 'CHANGE_NOT_APPLIED';
      const err = new Error(mapErrorMessage(code, completeData));
      err.code = code;
      throw err;
    }
    return completeData;
  }

  function showBillingDaySuccess(data, newDay) {
    const { t } = getI18n();
    const successBody = t(
      'subscriptionBillingDaySuccessBodyTemplate',
      'Sikeres.\n\nAz új számlázási nap:\nminden hónap %DAY%.'
    ).replace('%DAY%', String((data && data.newDay) || newDay));

    if (typeof window.loadUserSubscription === 'function' && firebase.auth().currentUser) {
      window.loadUserSubscription(firebase.auth().currentUser.uid, { forceRefresh: true }).then(function () {
        if (typeof window.renderSubscriptionInfo === 'function') window.renderSubscriptionInfo();
      }).catch(function () {
        if (typeof window.renderSubscriptionInfo === 'function') window.renderSubscriptionInfo();
      });
    } else if (typeof window.renderSubscriptionInfo === 'function') {
      window.renderSubscriptionInfo();
    }

    if (typeof window.showSubscriptionTitleBodyAlert === 'function') {
      window.showSubscriptionTitleBodyAlert(
        t('subscriptionBillingDaySuccessTitle', 'Számlázási nap frissítve'),
        successBody
      );
    }
  }

  async function confirmChange() {
    if (!activeSession || activeSession.isLoading) return;
    const els = getEls();
    const newDay = els.daySelect ? Number(els.daySelect.value) : NaN;
    if (!lastPreview || lastPreview.newDay !== newDay) {
      await runPreview();
      return;
    }
    const { t } = getI18n();
    const operationId = newOperationId();
    setLoading(true);
    try {
      if (!isPreviewPaymentReady(lastPreview) || lastPreview.newDay !== newDay) {
        setLoading(false);
        if (typeof window.showSubscriptionTitleBodyAlert === 'function') {
          window.showSubscriptionTitleBodyAlert(
            t('subscriptionBillingDayErrorTitle', 'Nem sikerült'),
            mapErrorMessage('INVALID_BRIDGE_AMOUNT', lastPreview)
          );
        }
        return;
      }

      const { res, data } = await fetchBillingCycleApi('updateBillingCycleDay', {
        newDay: newDay,
        operationId: operationId,
      });

      // SCA / 3DS
      if (data && (data.requiresAction || data.error === 'REQUIRES_ACTION') && data.clientSecret) {
        try {
          const completed = await handleRequiresAction(data, newDay, operationId);
          setLoading(false);
          closeModal();
          showBillingDaySuccess(completed, newDay);
          return;
        } catch (scaErr) {
          setLoading(false);
          closeModal();
          if (typeof window.showSubscriptionTitleBodyAlert === 'function') {
            window.showSubscriptionTitleBodyAlert(
              t('subscriptionBillingDayErrorTitle', 'Nem sikerült'),
              scaErr.code ? mapErrorMessage(scaErr.code, null) : (scaErr.message || mapErrorMessage('PAYMENT_FAILED'))
            );
          }
          return;
        }
      }

      if (!res.ok || !data || !data.ok) {
        const code = data && data.error ? data.error : 'UPDATE_FAILED';
        setLoading(false);
        closeModal();
        if (typeof window.showSubscriptionTitleBodyAlert === 'function') {
          window.showSubscriptionTitleBodyAlert(
            t('subscriptionBillingDayErrorTitle', 'Nem sikerült'),
            mapErrorMessage(code, data)
          );
        }
        return;
      }

      setLoading(false);
      closeModal();
      showBillingDaySuccess(data, newDay);
    } catch (err) {
      console.error('[billingCycleDay] update failed', err);
      setLoading(false);
      closeModal();
      if (typeof window.showSubscriptionTitleBodyAlert === 'function') {
        window.showSubscriptionTitleBodyAlert(
          t('subscriptionBillingDayErrorTitle', 'Nem sikerült'),
          t('subscriptionBillingDayGenericError', 'Nem sikerült módosítani a számlázási napot. Próbáld újra később.')
        );
      }
    }
  }

  function bindOnce() {
    const els = getEls();
    if (!els.overlay || els.overlay.dataset.bound === '1') return;
    els.overlay.dataset.bound = '1';
    if (els.backBtn) els.backBtn.addEventListener('click', function () {
      if (activeSession && activeSession.isLoading) return;
      closeModal();
    });
    if (els.confirmBtn) els.confirmBtn.addEventListener('click', function () {
      confirmChange();
    });
    if (els.daySelect) els.daySelect.addEventListener('change', function () {
      schedulePreview();
    });
    els.overlay.addEventListener('click', function (e) {
      if (e.target === els.overlay && !(activeSession && activeSession.isLoading)) closeModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindOnce);
  } else {
    bindOnce();
  }

  window.buildBillingCycleDayCardHtml = buildBillingCycleDayCardHtml;
  window.canShowBillingCycleDayCard = canShowBillingCycleDayCard;
  window.openBillingCycleDayModal = openModal;
  window.deriveBillingCycleDayFromSub = deriveBillingDayFromSub;
})();
