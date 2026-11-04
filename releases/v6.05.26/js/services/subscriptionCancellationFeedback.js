// Lemondási ok bekérése (appon belüli Stripe lemondás) + Firestore mentés
(function () {
  'use strict';

  const REASON_OPTIONS = [
    { key: 'no_longer_needed', labelKey: 'cancelReasonNoLongerNeeded', icon: 'clipboard' },
    { key: 'too_expensive', labelKey: 'cancelReasonTooExpensive', icon: 'tag' },
    { key: 'missing_feature', labelKey: 'cancelReasonMissingFeature', icon: 'star' },
    { key: 'technical_problem', labelKey: 'cancelReasonTechnicalProblem', icon: 'warning' },
    { key: 'using_alternative', labelKey: 'cancelReasonUsingAlternative', icon: 'switch' },
    { key: 'just_testing', labelKey: 'cancelReasonJustTesting', icon: 'flask' },
    { key: 'other', labelKey: 'cancelReasonOther', icon: 'message' },
  ];

  const REASON_ICON_SVGS = {
    clipboard: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>',
    tag: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M3 11l8.59 8.59a2 2 0 002.83 0l6.17-6.17a2 2 0 000-2.83L12 2.41a2 2 0 00-2.83 0L3 8.59a2 2 0 000 2.82z"></path></svg>',
    star: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.963 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"></path></svg>',
    warning: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
    switch: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>',
    flask: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 5.935a1.5 1.5 0 01-1.38.965H8.85a1.5 1.5 0 01-1.38-.965L5 14.5m14 0H5"></path></svg>',
    message: '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>',
  };

  let activeSession = null;

  function tFromKey(i18n, key, fallback) {
    if (typeof getI18nValue === 'function') {
      const v = getI18nValue(i18n, key);
      if (v != null && v !== '') return v;
    }
    const v = i18n && i18n[key];
    return (v != null && v !== '') ? v : fallback;
  }

  function getCancelReasonI18n() {
    const lang = (typeof currentLang === 'string') ? currentLang : 'hu';
    const i18n = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
    const t = (key, fallback) => tFromKey(i18n, key, fallback);
    return { t, i18n, lang };
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getReasonIconSvg(iconKey) {
    return REASON_ICON_SVGS[iconKey] || REASON_ICON_SVGS.message;
  }

  function getModalElements() {
    return {
      overlay: document.getElementById('cancel-reason-overlay'),
      box: document.getElementById('cancel-reason-box'),
      processing: document.getElementById('cancel-reason-processing'),
      processingText: document.getElementById('cancel-reason-processing-text'),
      commentEl: document.getElementById('cancel-reason-comment'),
      backBtn: document.getElementById('cancel-reason-back-btn'),
      continueBtn: document.getElementById('cancel-reason-continue-btn'),
      optionsContainer: document.getElementById('cancel-reason-options'),
    };
  }

  function setContinueButtonEnabled(enabled) {
    const btn = document.getElementById('cancel-reason-continue-btn');
    if (!btn) return;
    if (activeSession && activeSession.isLoading) return;
    btn.disabled = !enabled;
    btn.classList.toggle('is-disabled', !enabled);
    btn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
  }

  function syncSelectedReasonCards(container) {
    if (!container) return;
    const checked = container.querySelector('input[type="radio"]:checked');
    container.querySelectorAll('.cancel-reason-option').forEach(function (row) {
      const input = row.querySelector('input[type="radio"]');
      row.classList.toggle('is-selected', !!(checked && input === checked));
    });
  }

  function populateReasonRadios(t) {
    const container = document.getElementById('cancel-reason-options');
    if (!container) return;
    const name = 'subscription-cancel-reason';
    container.innerHTML = REASON_OPTIONS.map(function (opt) {
      const id = 'cancel-reason-' + opt.key;
      const label = t(opt.labelKey, opt.key);
      const iconSvg = getReasonIconSvg(opt.icon);
      return (
        '<label for="' + id + '" class="cancel-reason-option">' +
          '<input type="radio" name="' + name + '" id="' + id + '" value="' + opt.key + '" />' +
          '<span class="cancel-reason-option-icon">' + iconSvg + '</span>' +
          '<span class="cancel-reason-option-text">' + escapeHtml(label) + '</span>' +
          '<span class="cancel-reason-option-radio" aria-hidden="true"></span>' +
        '</label>'
      );
    }).join('');

    container.querySelectorAll('input[type="radio"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        syncSelectedReasonCards(container);
        setContinueButtonEnabled(true);
      });
    });
    syncSelectedReasonCards(container);
  }

  function setCancelReasonLoading(isLoading) {
    const els = getModalElements();
    if (!els.box) return;

    const t = getCancelReasonI18n().t;
    const processingLabel = t('cancelReasonProcessing', 'Lemondás feldolgozása…');

    if (activeSession) activeSession.isLoading = !!isLoading;

    els.box.classList.toggle('is-loading', !!isLoading);

    if (els.processing) {
      els.processing.classList.toggle('hidden', !isLoading);
      els.processing.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    }
    if (els.processingText) {
      els.processingText.textContent = processingLabel;
    }
    if (els.commentEl) {
      els.commentEl.disabled = !!isLoading;
    }
    if (els.optionsContainer) {
      els.optionsContainer.querySelectorAll('input[type="radio"]').forEach(function (radio) {
        radio.disabled = !!isLoading;
      });
    }
    if (els.backBtn) {
      els.backBtn.disabled = !!isLoading;
      els.backBtn.classList.toggle('hidden', !!isLoading);
    }
    if (els.continueBtn) {
      els.continueBtn.disabled = true;
      els.continueBtn.classList.add('is-disabled');
      els.continueBtn.setAttribute('aria-disabled', 'true');
      els.continueBtn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
      if (isLoading) {
        els.continueBtn.textContent = processingLabel;
      }
    }
  }

  function closeSubscriptionCancelReasonModal() {
    const els = getModalElements();
    if (!els.overlay || !els.box) return;

    if (activeSession) {
      if (activeSession.onOverlayClick) {
        els.overlay.removeEventListener('click', activeSession.onOverlayClick);
      }
      if (activeSession.onKeyDown) {
        document.removeEventListener('keydown', activeSession.onKeyDown);
      }
      activeSession = null;
    }

    setCancelReasonLoading(false);

    if (els.backBtn) {
      els.backBtn.classList.remove('hidden');
      els.backBtn.disabled = false;
    }
    if (els.continueBtn) {
      els.continueBtn.removeAttribute('aria-busy');
    }

    els.overlay.classList.add('opacity-0');
    els.box.classList.add('scale-95');
    setTimeout(function () {
      els.overlay.classList.add('hidden');
    }, 280);
  }

  function showSubscriptionCancelReasonModal() {
    return new Promise(function (resolve) {
      const els = getModalElements();
      if (!els.overlay || !els.box) {
        console.warn('[CancelReason] Modal elements missing');
        resolve(null);
        return;
      }

      const t = getCancelReasonI18n().t;
      const titleEl = document.getElementById('cancel-reason-title');
      const introEl = document.getElementById('cancel-reason-intro');
      const warningEl = document.getElementById('cancel-reason-warning');

      if (titleEl) titleEl.textContent = t('cancelReasonTitle', 'Miért mondod le az előfizetést?');
      if (introEl) introEl.textContent = t(
        'cancelReasonIntro',
        'A válaszod segít javítani a GuriGO-t. A lemondást természetesen nem akadályozza.',
      );
      if (els.commentEl) {
        els.commentEl.value = '';
        els.commentEl.disabled = false;
        els.commentEl.placeholder = t('cancelReasonCommentPlaceholder', 'Írhatsz pár szót, ha szeretnél.');
      }
      if (warningEl) {
        const warningText = t('cancelReasonWarning', '');
        if (warningText) {
          warningEl.textContent = warningText;
          warningEl.style.display = '';
        } else {
          warningEl.textContent = '';
          warningEl.style.display = 'none';
        }
      }
      if (els.backBtn) {
        els.backBtn.textContent = t('cancelReasonBackButton', 'Mégsem');
        els.backBtn.classList.remove('hidden');
        els.backBtn.disabled = false;
      }
      if (els.continueBtn) {
        els.continueBtn.textContent = t('cancelReasonContinueButton', 'Lemondom az előfizetést');
        els.continueBtn.removeAttribute('aria-busy');
      }

      els.box.classList.remove('is-loading');
      if (els.processing) els.processing.classList.add('hidden');

      populateReasonRadios(t);
      setContinueButtonEnabled(false);

      function finishCancel() {
        closeSubscriptionCancelReasonModal();
        resolve(null);
      }

      function onOverlayClick(e) {
        if (activeSession && activeSession.isLoading) return;
        if (e.target === els.overlay) finishCancel();
      }

      function onKeyDown(e) {
        if (e.key !== 'Escape') return;
        if (activeSession && activeSession.isLoading) return;
        finishCancel();
      }

      activeSession = {
        isLoading: false,
        onOverlayClick: onOverlayClick,
        onKeyDown: onKeyDown,
      };

      if (els.backBtn) {
        els.backBtn.onclick = function () {
          if (activeSession && activeSession.isLoading) return;
          finishCancel();
        };
      }

      if (els.continueBtn) {
        els.continueBtn.onclick = function () {
          if (activeSession && activeSession.isLoading) return;
          if (els.continueBtn.disabled || !els.optionsContainer) return;
          const selected = els.optionsContainer.querySelector('input[name="subscription-cancel-reason"]:checked');
          if (!selected) return;
          const opt = REASON_OPTIONS.find(function (o) { return o.key === selected.value; });
          const reasonKey = selected.value;
          const reasonLabel = opt ? t(opt.labelKey, reasonKey) : reasonKey;
          const comment = els.commentEl ? String(els.commentEl.value || '').trim() : '';

          setCancelReasonLoading(true);
          resolve({
            reasonKey: reasonKey,
            reasonLabel: reasonLabel,
            comment: comment,
          });
        };
      }

      els.overlay.addEventListener('click', onOverlayClick);
      document.addEventListener('keydown', onKeyDown);

      els.overlay.classList.remove('hidden');
      requestAnimationFrame(function () {
        els.overlay.classList.remove('opacity-0');
        els.box.classList.remove('scale-95');
      });
    });
  }

  async function saveSubscriptionCancellationFeedback(payload) {
    try {
      if (!firebase || !firebase.firestore || !firebase.auth || !firebase.auth().currentUser) {
        console.warn('[CancelReason] Firebase not available for feedback save');
        return false;
      }

      const uid = firebase.auth().currentUser.uid;
      const email = (window.currentUser && window.currentUser.email)
        || firebase.auth().currentUser.email
        || null;
      const rawVersion = window.APP_INFO && window.APP_INFO.version;
      const appVersion = rawVersion ? ('v' + rawVersion) : null;

      const doc = {
        uid: uid,
        email: email || null,
        subscriptionType: payload.subscriptionType || null,
        plan: payload.subscriptionType || null,
        platform: payload.platform || 'stripe',
        reasonKey: payload.reasonKey,
        reasonLabel: payload.reasonLabel,
        comment: payload.comment || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        appVersion: appVersion,
        source: 'in_app_cancel_flow',
      };

      await firebase.firestore().collection('subscriptionCancellationFeedback').add(doc);
      return true;
    } catch (err) {
      console.warn('[CancelReason] Feedback save failed:', err);
      return false;
    }
  }

  window.showSubscriptionCancelReasonModal = showSubscriptionCancelReasonModal;
  window.saveSubscriptionCancellationFeedback = saveSubscriptionCancellationFeedback;
  window.setCancelReasonLoading = setCancelReasonLoading;
  window.closeSubscriptionCancelReasonModal = closeSubscriptionCancelReasonModal;
})();
