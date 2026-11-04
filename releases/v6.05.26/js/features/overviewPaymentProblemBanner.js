// Áttekintés oldal — fizetési probléma (Pro / Archiválás) figyelmeztető banner
(function () {
  'use strict';

  const BANNER_ID = 'subscription-payment-problem-banner';

  function getI18n() {
    if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
      return translations[currentLang] || {};
    }
    return {};
  }

  function t(key, fallback) {
    const i18n = getI18n();
    const v = i18n[key];
    return (v != null && v !== '') ? v : fallback;
  }

  function formatTemplate(str, vars) {
    if (!str) return '';
    let out = str;
    const keys = vars && typeof vars === 'object' ? Object.keys(vars) : [];
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      out = out.split('%' + k + '%').join(String(vars[k]));
    }
    return out;
  }

  function formatDateLocalized(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '';
    const locale = (typeof getCurrentLocale === 'function') ? getCurrentLocale() : 'hu-HU';
    return date.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  function getOverviewBannerRoot() {
    return document.getElementById('content-live');
  }

  function getOrCreateBannerElement() {
    const root = getOverviewBannerRoot();
    if (!root) return null;

    let banner = document.getElementById(BANNER_ID);
    if (!banner) {
      banner = document.createElement('div');
      banner.id = BANNER_ID;
      banner.className = 'mb-3';
      root.insertBefore(banner, root.firstChild || null);
    }
    return banner;
  }

  function buildBannerCopy(summary) {
    const title = t('overviewPaymentProblemTitle', '⚠️ Fizetési probléma');
    const appleUi = summary.usesApplePaymentUi === true;
    let body;
    if (summary.proProblem && summary.archivalProblem) {
      body = appleUi
        ? t(
            'overviewPaymentProblemBodyBothApple',
            'Fizetési probléma van az Apple előfizetéseidnél. A hozzáférésed a türelmi idő alatt még aktív. Kérjük, ellenőrizd az Apple ID fizetési módodat.',
          )
        : t(
            'overviewPaymentProblemBodyBoth',
            'Egy vagy több előfizetésed megújítása sikertelen volt. Kérlek frissítsd a fizetési módot, hogy a hozzáférésed ne szűnjön meg.',
          );
    } else if (summary.proProblem) {
      body = appleUi
        ? t(
            'overviewPaymentProblemBodyProApple',
            'Fizetési probléma van a Pro előfizetésnél. A hozzáférésed a türelmi idő alatt még aktív. Kérjük, ellenőrizd az Apple ID fizetési módodat.',
          )
        : t(
            'overviewPaymentProblemBodyPro',
            'A Pro előfizetés legutóbbi megújítása sikertelen volt. Kérlek frissítsd a fizetési módot, hogy a Pro hozzáférésed ne szűnjön meg.',
          );
    } else {
      body = appleUi
        ? t(
            'overviewPaymentProblemBodyArchivalApple',
            'Fizetési probléma van az Archiválási csomagnál. A dokumentumok megőrzése a türelmi idő alatt még aktív. Kérjük, ellenőrizd az Apple ID fizetési módodat.',
          )
        : t(
            'overviewPaymentProblemBodyArchival',
            'Az Archiválási csomag legutóbbi megújítása sikertelen volt. Kérlek frissítsd a fizetési módot, hogy a dokumentumok hosszabb megőrzése ne szűnjön meg.',
          );
    }

    const detailLines = [];
    if (summary.proProblem) {
      const proAccessFmt = formatDateLocalized(summary.proAccessUntil);
      const proGraceFmt = formatDateLocalized(summary.proGraceUntil);
      detailLines.push(
        `<p class="m-0 font-medium">${t('overviewPaymentProblemProLine', 'Pro csomag: fizetési probléma')}</p>`,
      );
      if (proAccessFmt) {
        detailLines.push(
          `<p class="m-0">${formatTemplate(
            t('overviewPaymentProblemProAccessUntil', 'Hozzáférés aktív eddig: %DATE%'),
            { DATE: proAccessFmt },
          )}</p>`,
        );
      }
      if (proGraceFmt) {
        detailLines.push(
          `<p class="m-0">${formatTemplate(
            t('overviewPaymentProblemGraceUntil', 'Fizetési mód frissíthető eddig: %DATE%'),
            { DATE: proGraceFmt },
          )}</p>`,
        );
      }
    }
    if (summary.archivalProblem) {
      const archAccessFmt = formatDateLocalized(summary.archivalAccessUntil);
      const archGraceFmt = formatDateLocalized(summary.archivalGraceUntil);
      detailLines.push(
        `<p class="m-0 font-medium">${t('overviewPaymentProblemArchivalLine', 'Archiválási csomag: fizetési probléma')}</p>`,
      );
      if (archAccessFmt) {
        detailLines.push(
          `<p class="m-0">${formatTemplate(
            t('overviewPaymentProblemArchivalAccessUntil', 'Dokumentumok hosszabb megőrzése aktív eddig: %DATE%'),
            { DATE: archAccessFmt },
          )}</p>`,
        );
      }
      if (archGraceFmt && !summary.proProblem) {
        detailLines.push(
          `<p class="m-0">${formatTemplate(
            t('overviewPaymentProblemGraceUntil', 'Fizetési mód frissíthető eddig: %DATE%'),
            { DATE: archGraceFmt },
          )}</p>`,
        );
      } else if (archGraceFmt && summary.proProblem && archGraceFmt !== formatDateLocalized(summary.proGraceUntil)) {
        detailLines.push(
          `<p class="m-0">${formatTemplate(
            t('overviewPaymentProblemArchivalGraceUntil', 'Archiválás — fizetési mód frissíthető eddig: %DATE%'),
            { DATE: archGraceFmt },
          )}</p>`,
        );
      }
    }

    const ctaLabel = appleUi
      ? t('subscriptionAppleManageSubscriptionButton', 'Előfizetés kezelése')
      : t('overviewPaymentProblemCta', 'Fizetési mód frissítése');
    return { title, body, detailLines, ctaLabel, appleUi };
  }

  function renderOverviewPaymentProblemBanner() {
    const banner = getOrCreateBannerElement();
    if (!banner) return;

    const summary = typeof window.getSubscriptionPaymentProblemSummary === 'function'
      ? window.getSubscriptionPaymentProblemSummary()
      : { hasProblem: false };

    if (!summary.hasProblem) {
      banner.classList.add('hidden');
      banner.innerHTML = '';
      return;
    }

    banner.classList.remove('hidden');
    const copy = buildBannerCopy(summary);

    const tone = copy.appleUi ? 'amber' : 'red';
    const panelClass =
      tone === 'amber'
        ? 'p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg shadow-sm'
        : 'p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg shadow-sm';
    const titleClass =
      tone === 'amber'
        ? 'font-semibold text-amber-900 dark:text-amber-200 text-base mb-2'
        : 'font-semibold text-red-800 dark:text-red-200 text-base mb-2';
    const textClass =
      tone === 'amber'
        ? 'text-sm text-amber-800 dark:text-amber-300 mb-2'
        : 'text-sm text-red-700 dark:text-red-300 mb-2';
    const detailClass =
      tone === 'amber'
        ? 'text-xs sm:text-sm text-amber-800 dark:text-amber-300 space-y-1 mb-3'
        : 'text-xs sm:text-sm text-red-700 dark:text-red-300 space-y-1 mb-3';
    const btnClass =
      tone === 'amber'
        ? 'w-full py-2.5 border border-amber-500 bg-amber-100 text-amber-950 hover:bg-amber-200 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100 rounded-lg font-semibold text-sm transition'
        : 'w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition';

    banner.innerHTML = `
      <div class="${panelClass}">
        <div class="${titleClass}">${copy.title}</div>
        <p class="${textClass}">${copy.body}</p>
        <div class="${detailClass}">
          ${copy.detailLines.join('')}
        </div>
        <button type="button" id="overviewPaymentProblemCtaBtn" class="${btnClass}">
          ${copy.ctaLabel}
        </button>
      </div>`;

    const btn = banner.querySelector('#overviewPaymentProblemCtaBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        if (typeof window.handleSubscriptionPaymentProblemAction === 'function') {
          window.handleSubscriptionPaymentProblemAction(summary);
        }
      });
    }
  }

  function hasStripePortalCustomer(sub) {
    if (!sub || typeof sub !== 'object') return false;
    if (typeof window.hasActiveStripeProSubscription === 'function' && window.hasActiveStripeProSubscription(sub)) {
      return true;
    }
    const archSubId = sub.archivalStripeSubscriptionId && String(sub.archivalStripeSubscriptionId).trim();
    if (archSubId) return true;
    const custId = sub.stripeCustomerId && String(sub.stripeCustomerId).trim();
    return !!custId;
  }

  window.handleSubscriptionPaymentProblemAction = function (summaryOptional) {
    const summary = summaryOptional ||
      (typeof window.getSubscriptionPaymentProblemSummary === 'function'
        ? window.getSubscriptionPaymentProblemSummary()
        : null);
    if (!summary || !summary.hasProblem) return;

    const action = summary.preferredAction || { type: 'subscription_page' };
    const sub = window.currentUserSubscription || {};
    const i18n = getI18n();

    if (action.type === 'stripe_portal') {
      if (typeof window.handleUpdatePaymentMethod === 'function' && hasStripePortalCustomer(sub)) {
        window.handleUpdatePaymentMethod();
        return;
      }
      if (typeof window.showView === 'function') {
        window.showView('subscription');
      }
      return;
    }

    if (action.type === 'stripe_info_ios' || action.type === 'apple_info_web') {
      if (summary.proProblem && typeof window.handleProProviderManage === 'function') {
        window.handleProProviderManage();
        return;
      }
      if (summary.archivalProblem && typeof window.handleArchivalProviderManage === 'function') {
        window.handleArchivalProviderManage();
        return;
      }
      if (typeof window.showView === 'function') {
        window.showView('subscription');
      }
      return;
    }

    if (action.type === 'apple_manage') {
      const product = action.product === 'archival' ? 'archival' : 'pro';
      if (product === 'archival' && typeof window.handleArchivalProviderManage === 'function') {
        window.handleArchivalProviderManage();
      } else if (typeof window.handleProProviderManage === 'function') {
        window.handleProProviderManage();
      } else if (typeof window.showView === 'function') {
        window.showView('subscription');
      }
      return;
    }

    if (typeof window.showView === 'function') {
      window.showView('subscription');
    }
  };

  window.renderOverviewPaymentProblemBanner = renderOverviewPaymentProblemBanner;
  window.refreshOverviewPaymentProblemBanner = renderOverviewPaymentProblemBanner;
})();
