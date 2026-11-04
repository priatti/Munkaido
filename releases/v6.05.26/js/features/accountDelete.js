// NOTE: Uses Firebase v8 global SDK loaded on the page (firebase-auth.js, firebase-functions.js)

(async function(){
  'use strict';

  function getTranslationDicts() {
    try {
      if (typeof window !== 'undefined' && window.translations) {
        return window.translations;
      }
      if (typeof translations !== 'undefined') {
        return translations;
      }
    } catch (_) {}
    return null;
  }

  function getCurrentLang() {
    try {
      if (typeof currentLang === 'string' && currentLang) return currentLang;
      if (typeof window !== 'undefined' && window.currentLang) return window.currentLang;
      if (typeof localStorage !== 'undefined') {
        var stored = localStorage.getItem('language');
        if (stored) return stored;
      }
    } catch (_) {}
    return 'hu';
  }

  function t(key, fallback) {
    try {
      var dicts = getTranslationDicts();
      if (dicts) {
        var lang = getCurrentLang();
        var cur = dicts[lang] || {};
        var v = cur[key];
        if (v != null && v !== '') return v;
        var hu = dicts.hu || {};
        v = hu[key];
        if (v != null && v !== '') return v;
      }
    } catch (_) {}
    if (fallback != null && fallback !== '') return fallback;
    return key;
  }

  function getFunctionsInstance() {
    try {
      if (typeof window !== 'undefined' && window.functions) {
        return window.functions;
      }
      if (typeof firebase !== 'undefined' && firebase.app) {
        return firebase.app().functions('europe-west3');
      }
    } catch (e) {
      console.warn('[AccountDelete] functions init failed', e);
    }
    throw new Error(t('accountDeletionUnavailableError', 'A fiók törlése funkció jelenleg nem érhető el. Kérlek, vedd fel a kapcsolatot az ügyfélszolgálattal: info@gurigo.eu'));
  }

  async function call(name, data) {
    try {
      const functionsInstance = getFunctionsInstance();
      const f = functionsInstance.httpsCallable(name);
      const res = await f(data || {});
      return res.data;
    } catch (e) {
      // CORS vagy hálózati hiba kezelése
      if (e && e.message && (e.message.includes('CORS') || e.message.includes('internal') || e.message.includes('connection refused') || e.message.includes('ERR_CONNECTION_REFUSED'))) {
        throw new Error(t('accountDeletionUnavailableError', 'A fiók törlése funkció jelenleg nem érhető el. Kérlek, vedd fel a kapcsolatot az ügyfélszolgálattal: info@gurigo.eu'));
      }
      throw e;
    }
  }

  async function reauthenticateUser(user) {
    if (!user) throw new Error(t('accountDeletionNoUser', 'Nincs bejelentkezett felhasználó.'));
    try {
      const providers = user.providerData || [];
      const hasApple = providers.some(function(p){ return p && p.providerId === 'apple.com'; });
      if (hasApple && user.reauthenticateWithPopup && firebase.auth && firebase.auth.OAuthProvider) {
        await user.reauthenticateWithPopup(new firebase.auth.OAuthProvider('apple.com'));
        return true;
      }
      const hasGoogle = providers.some(function(p){ return p && p.providerId === 'google.com'; });
      if (hasGoogle && user.reauthenticateWithPopup) {
        await user.reauthenticateWithPopup(new firebase.auth.GoogleAuthProvider());
        return true;
      }

      const isPassword = providers.some(function(p){ return p && p.providerId === 'password'; });
      if (isPassword && firebase.auth && firebase.auth.EmailAuthProvider) {
        const email = user.email || '';
        if (!email) throw new Error(t('accountDeletionNoUser', 'Nincs bejelentkezett felhasználó.'));

        let pwd = null;
        if (typeof showCustomPrompt === 'function') {
          pwd = await new Promise((resolve, reject) => {
            const icon = '<svg class="w-10 h-10 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm0 0v4m6-2a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>';
            showCustomPrompt(
              t('accountDeletionReauthTitle', 'Jelszó megerősítés'),
              t('accountDeletionReauthPrompt', 'Biztonsági okokból add meg a jelszavadat a törléshez:'),
              t('accountDeletionReauthPlaceholder', 'Írd be a jelszavadat'),
              icon,
              (value) => {
                const trimmed = (value || '').trim();
                if (!trimmed) {
                  reject(new Error(t('accountDeletionReauthCancelled', 'A reautentikáció megszakítva.')));
                } else {
                  resolve(trimmed);
                }
              },
              () => reject(new Error(t('accountDeletionReauthCancelled', 'A reautentikáció megszakítva.'))),
              {
                inputType: 'password',
                allowHTML: false,
                confirmText: t('accountDeletionReauthConfirm', 'Megerősítés'),
                cancelText: t('cancel', 'Mégsem')
              }
            );
          });
        } else {
          pwd = prompt(t('accountDeletionReauthPrompt', 'Biztonsági okokból add meg a jelszavadat a törléshez:'));
        }

        if (!pwd) throw new Error(t('accountDeletionReauthCancelled', 'A reautentikáció megszakítva.'));
        var cred = firebase.auth.EmailAuthProvider.credential(email, pwd);
        if (user.reauthenticateWithCredential) {
          await user.reauthenticateWithCredential(cred);
          return true;
        }
      }

      if (user.reauthenticateWithPopup) {
        await user.reauthenticateWithPopup(new firebase.auth.GoogleAuthProvider());
        return true;
      }

      return true;
    } catch (e) {
      throw new Error(t('accountDeletionReauthError', 'Reautentikáció sikertelen: {error}').replace('{error}', (e && e.message ? e.message : e)));
    }
  }

  async function startAccountDeletionFlow() {
    try {
      if (typeof showCustomModal !== 'function') {
        alert('showCustomModal function not available');
        return;
      }

      if (typeof window.AccountDeletionGuards !== 'undefined' && window.AccountDeletionGuards.assertCanStartAccountDeletion) {
        try {
          const guard = await window.AccountDeletionGuards.assertCanStartAccountDeletion();
          if (!guard.ok) {
            window.AccountDeletionGuards.showActiveSubscriptionBlocksDeletionModal();
            return;
          }
        } catch (gErr) {
          console.warn('[AccountDelete] subscription guard', gErr);
        }
      }

      // 1. Első megerősítés
      await new Promise((resolve, reject) => {
        const warningIcon = '<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
        showCustomModal(
          '<p class="text-base text-gray-700 dark:text-gray-300 mb-3">' + t('accountDeletionConfirmMessage', 'Biztosan törölni szeretnéd a fiókodat és az összes adatodat?') + '</p><p class="text-sm text-gray-600 dark:text-gray-400">' + t('accountDeletionConfirmSubtext', 'Ez 14 nap múlva történik meg véglegesen. Addig bármikor visszavonhatod.') + '</p>',
          [
            { text: t('cancel', 'Mégsem'), className: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200', onClick: () => reject(new Error('cancelled')) },
            { text: t('accountDeletionConfirmYes', 'Igen, törlöm'), className: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md', onClick: () => resolve(true) }
          ],
          false,
          {
            icon: warningIcon,
            iconBg: 'bg-red-100 dark:bg-red-900/30',
            title: t('accountDeletionConfirmTitle', 'Fiók törlése'),
            subtitle: t('accountDeletionWarning', 'Figyelem! Ez a művelet visszafordíthatatlan.')
          }
        );
      });

      // 2. Kód beírása (prompt) — a kód a beállított nyelv szerinti i18n kulcsból jön (accountDeletionPromptCode)
      function normalizeDeletionConfirmCode(s) {
        return String(s || '')
          .trim()
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '');
      }
      var requiredCode = t('accountDeletionPromptCode', 'TORLES');
      var text = await new Promise((resolve) => {
        if (typeof showCustomPrompt === 'function') {
          var warningIcon = '<svg class="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
          showCustomPrompt(
            t('accountDeletionPromptTitle', 'Megerősítés szükséges'),
            t('accountDeletionPromptMessage', 'Írd be a következő kódot a megerősítéshez:') + '<br><br><div class="text-center text-2xl font-bold text-red-600 dark:text-red-400 my-3">' + requiredCode + '</div>',
            t('accountDeletionPromptPlaceholder', 'Írd be: {code}').replace('{code}', requiredCode),
            warningIcon,
            (value) => resolve(value)
          );
        } else {
          resolve(prompt(t('accountDeletionPromptInstruction', 'Megerősítéshez írd be: {code} (nagybetűkkel)').replace('{code}', requiredCode)));
        }
      });
      if (normalizeDeletionConfirmCode(text) !== normalizeDeletionConfirmCode(requiredCode)) { return; }

      if (typeof firebase === 'undefined' || !firebase.auth || !firebase.auth().currentUser) {
        throw new Error(t('accountDeletionNoUser', 'Nincs bejelentkezett felhasználó.'));
      }

      var user = firebase.auth().currentUser;
      await reauthenticateUser(user);

      var meta = {};
      try {
        if (typeof window !== 'undefined' && window.APP_INFO && window.APP_INFO.version) {
          meta.appVersion = String(window.APP_INFO.version);
        }
      } catch (_) {}
      try {
        if (typeof navigator !== 'undefined' && navigator.userAgent) {
          meta.appPlatform = 'web:' + navigator.userAgent.slice(0, 180);
        }
      } catch (_) {}
      var out = await call('requestAccountDeletion', meta);
      
      // Siker üzenet custom modallal
      showCustomModal(
        '<div class="text-center"><div class="text-5xl mb-4">✅</div><h2 class="text-xl font-bold text-green-700 dark:text-green-300 mb-3">' + t('accountDeletionSuccessTitle', 'Kérés rögzítve') + '</h2><p class="text-base">' + t('accountDeletionSuccessMessage', 'A törlés {date} időpontban történik. Addig bármikor visszavonhatod a Beállításokban.').replace('{date}', '<strong>' + out.deleteAt + '</strong>') + '</p></div>',
        [{ text: t('ok', 'OK'), className: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold transition', onClick: () => location.reload() }],
        false,
        {
          icon: '<svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>',
          iconBg: 'bg-green-100 dark:bg-green-900/30',
          title: t('accountDeletionSuccessTitle', 'Kérés rögzítve'),
          subtitle: t('accountDeletionSuccessSubtitle', 'A fiókod törlése folyamatban van.')
        }
      );
    } catch (e) {
      if (e && e.message === 'cancelled') { return; }
      var errMsg = e && e.message ? e.message : String(e);
      if (typeof errMsg === 'string' && (errMsg.indexOf('ACTIVE_SUBSCRIPTION') >= 0 || errMsg.indexOf('ACTIVE_ARCHIVAL') >= 0) && window.AccountDeletionGuards && window.AccountDeletionGuards.showActiveSubscriptionBlocksDeletionModal) {
        window.AccountDeletionGuards.showActiveSubscriptionBlocksDeletionModal();
        return;
      }
      showCustomModal(
        '<div class="text-center"><div class="text-5xl mb-4">❌</div><h2 class="text-xl font-bold text-red-700 dark:text-red-300 mb-3">' + t('error', 'Hiba') + '</h2><p class="text-base">' + t('errorGeneric', 'Hiba: {error}').replace('{error}', errMsg) + '</p></div>',
        [{ text: t('ok', 'OK'), className: 'bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-bold transition', onClick: () => {} }],
        false,
        {
          icon: '<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          title: t('error', 'Hiba'),
          subtitle: t('errorSubtitle', 'Valami hiba történt.')
        }
      );
    }
  }

  async function cancelAccountDeletionFlow() {
    try {
      if (typeof showCustomModal !== 'function') {
        alert('showCustomModal function not available');
        return;
      }

      // Megerősítés kérése
      await new Promise((resolve, reject) => {
        const cancelIcon = '<svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>';
        showCustomModal(
          '<p class="text-base text-gray-700 dark:text-gray-300">' + t('accountDeletionCancelMessage', 'Biztosan visszavonod a törlési kérelmet?') + '</p>',
          [
            { text: t('cancel', 'Mégsem'), className: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200', onClick: () => reject(new Error('cancelled')) },
            { text: t('accountDeletionCancelYes', 'Igen, visszavonom'), className: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md', onClick: () => resolve(true) }
          ],
          false,
          {
            icon: cancelIcon,
            iconBg: 'bg-blue-100 dark:bg-blue-900/30',
            title: t('accountDeletionCancelTitle', 'Törlés visszavonása'),
            subtitle: t('accountDeletionCancelSubtitle', 'A fiókod megmarad')
          }
        );
      });

      await reauthenticateUser(firebase.auth().currentUser);

      await call('cancelAccountDeletion', {});
      
      // 3. Sikeres visszajelzés
      const successIcon = '<svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
      showCustomModal(
        '<p class="text-base text-gray-700 dark:text-gray-300">' + t('accountDeletionCancelSuccessMessage', 'Törlési kérelem visszavonva.') + '</p>',
        [{ text: t('ok', 'OK'), className: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md', onClick: () => {} }],
        true,
        {
          icon: successIcon,
          iconBg: 'bg-green-100 dark:bg-green-900/30',
          title: t('accountDeletionCancelSuccessTitle', 'Visszavonva'),
          subtitle: t('accountDeletionCancelSuccessSubtitle', 'A fiókod biztonságban van')
        }
      );
    } catch (e) {
      if (e && e.message === 'cancelled') { return; }
      const errorIcon = '<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
      showCustomModal(
        '<p class="text-base text-gray-700 dark:text-gray-300">' + (e && e.message ? e.message : t('accountDeletionUnknownError', 'Ismeretlen hiba történt')) + '</p>',
        [{ text: t('ok', 'OK'), className: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all duration-200' }],
        false,
        {
          icon: errorIcon,
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          title: t('accountDeletionError', 'Hiba'),
          subtitle: t('accountDeletionCancelErrorSubtitle', 'A visszavonás nem sikerült')
        }
      );
    }
  }

  function renderDeletionStatus(containerId, status) {
    var el = document.getElementById(containerId);
    if (!el) { return; }

    try {
    var pending = status && status.pending;
    var deleteAt = status && status.deleteAt ? new Date(status.deleteAt) : null;
    var dateText = deleteAt ? deleteAt.toLocaleString() : '';
    var errorText = status && status.error ? String(status.error) : '';

    var infoBlock = '';
    if (pending) {
      infoBlock =
        '  <div class="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3 mb-3">' +
        '    <p class="text-sm text-green-800 dark:text-green-200 font-semibold mb-1">' + t('accountDeletionStatusPendingTitle', '✓ Törlési kérés rögzítve') + '</p>' +
        '    <p class="text-xs text-green-700 dark:text-green-300">' + t('accountDeletionStatusPendingSubtitle', 'Végleges törlés: {date}').replace('{date}', '<strong>' + dateText + '</strong>') + '</p>' +
        '  </div>';
    } else if (errorText) {
      infoBlock =
        '  <div class="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3 mb-3">' +
        '    <p class="text-sm text-yellow-800 dark:text-yellow-200 font-semibold mb-1">' + t('accountDeletionStatusErrorTitle', '⚠️ A fióktörlés státusza jelenleg nem érhető el.') + '</p>' +
        '    <p class="text-xs text-yellow-700 dark:text-yellow-300 break-words">' + t('accountDeletionStatusErrorDetails', '{error}').replace('{error}', errorText) + '</p>' +
        '    <p class="text-xs text-yellow-700 dark:text-yellow-300 mt-1">' + t('accountDeletionStatusErrorHelp', 'Próbáld újra később vagy írj a {email} címre.').replace('{email}', '<a class="underline" href="mailto:info@gurigo.eu">info@gurigo.eu</a>') + '</p>' +
        '  </div>';
    }

    el.innerHTML = '' +
      '<div class="space-y-3">' +
      infoBlock +
      (pending
        ? '  <button id="btn-cancel-del" class="w-full text-white font-bold py-3 px-4 rounded-lg text-base shadow-md" style="background-color: #eab308;">' + (t('accountDeletionCancelButton', '🔄 Törlési kérés visszavonása')) + '</button>'
        : '  <button id="btn-start-del" class="w-full text-white font-bold py-3 px-4 rounded-lg text-base shadow-md" style="background-color: #ef4444;">' + (t('accountDeletionStartButton', '🗑️ Fiók törlése…')) + '</button>'
      ) +
      '</div>';

    var startBtn = document.getElementById('btn-start-del');
    if (startBtn) {
      startBtn.addEventListener('click', startAccountDeletionFlow);
    }

    var cancelBtn = document.getElementById('btn-cancel-del');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', cancelAccountDeletionFlow);
    }
    } catch (renderErr) {
      console.warn('[AccountDelete] renderDeletionStatus failed', renderErr);
      try {
        el.innerHTML = '' +
          '<div class="space-y-3">' +
          '  <button id="btn-start-del" class="w-full text-white font-bold py-3 px-4 rounded-lg text-base shadow-md" style="background-color: #ef4444;">' + t('accountDeletionStartButton', '🗑️ Fiók törlése…') + '</button>' +
          '</div>';
        var fallbackStartBtn = document.getElementById('btn-start-del');
        if (fallbackStartBtn) {
          fallbackStartBtn.addEventListener('click', startAccountDeletionFlow);
        }
      } catch (_) {}
    }
  }

  async function loadDeletionStatusAndRender(containerId) {
    // Kijelentkezett állapotban nem hívunk callable-t (unauthenticated / 500 Internal zaj)
    var authUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;
    if (!authUser) {
      console.log('[AccountDelete] status load skipped (no authenticated user)');
      return;
    }
    try {
      var status = await call('getAccountDeletionStatus', {});
      renderDeletionStatus(containerId, status || {});
    } catch (e) {
      console.warn('[AccountDelete] status load failed', e);
      // Hiba esetén is mutassuk a szekciót, csak jelezzük a hibát
      renderDeletionStatus(containerId, { pending: false, error: e.message });
    }
  }

  if (typeof window !== 'undefined') {
    window.AccountDeletion = {
      startAccountDeletionFlow: startAccountDeletionFlow,
      cancelAccountDeletionFlow: cancelAccountDeletionFlow,
      renderDeletionStatus: renderDeletionStatus,
      loadDeletionStatusAndRender: loadDeletionStatusAndRender
    };
  }
})();
