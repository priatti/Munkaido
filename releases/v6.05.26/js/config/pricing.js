// ===========================
//  PRICING CONFIG – GuriGO
//  Kanonikus árazási adatok
//  FONTOS: Az árak BRUTTÓ árak!
//  Az ÁFA országonként változik (lásd vatConfig.js)
// ===========================

(function(){
  window.PRICING_CONFIG = {
    // Pro csomag árak (havi előfizetés) - BRUTTÓ ÁRAK
    pro: {
      HUF: {
        amount: 1490, // Bruttó ár (ÁFA: AAM - Magyarország)
        currency: 'HUF',
        fractionDigits: 0,
        formatted: '1490 Ft',
        perMonth: {
          hu: '1490 Ft/hó',
          de: '1490 Ft/Monat'
        }
      },
      EUR: {
        amount: 4.90, // Bruttó ár (ÁFA országonként változik)
        currency: 'EUR',
        fractionDigits: 2,
        formatted: '€4.90',
        perMonth: {
          hu: '€4.90/hó',
          de: '€4.90/Monat'
        }
      },
      PLN: {
        amount: 19.90, // Bruttó ár (Lengyelország)
        currency: 'PLN',
        fractionDigits: 2,
        formatted: '19,90 zł',
        perMonth: {
          hu: '19,90 zł/hó',
          de: '19,90 zł/Monat',
          pl: '19,90 zł/mies.'
        }
      },
      RON: {
        amount: 19.90, // Bruttó ár (Románia)
        currency: 'RON',
        fractionDigits: 2,
        formatted: '19,90 lei',
        perMonth: {
          hu: '19,90 lei/hó',
          de: '19,90 lei/Monat',
          ro: '19,90 lei/lună'
        }
      },
      DKK: {
        amount: 49,
        currency: 'DKK',
        fractionDigits: 0,
        formatted: '49 kr',
        perMonth: {
          hu: '49 kr/hó',
          de: '49 kr/Monat',
          da: '49 kr/måned'
        }
      },
      NOK: {
        amount: 69,
        currency: 'NOK',
        fractionDigits: 0,
        formatted: '69 kr',
        perMonth: {
          hu: '69 kr/hó',
          de: '69 kr/Monat',
          no: '69 kr/måned'
        }
      }
    },
    
    // Archiválási csomag (havi előfizetés) – korábbi 1 éves csomag ára
    archival: {
      archival: {
        HUF: { amount: 499, currency: 'HUF', fractionDigits: 0, formatted: '499 Ft', perMonth: { hu: '499 Ft/hó', de: '499 Ft/Monat' } },
        EUR: { amount: 1.49, currency: 'EUR', fractionDigits: 2, formatted: '€1.49', perMonth: { hu: '1,49 €/hó', de: '1,49 €/Monat' } },
        PLN: { amount: 6.49, currency: 'PLN', fractionDigits: 2, formatted: '6,49 zł', perMonth: { hu: '6,49 zł/hó', de: '6,49 zł/Monat', pl: '6,49 zł/mies.' } },
        RON: { amount: 6.49, currency: 'RON', fractionDigits: 2, formatted: '6,49 lei', perMonth: { hu: '6,49 lei/hó', de: '6,49 lei/Monat', ro: '6,49 lei/lună' } },
        DKK: { amount: 19, currency: 'DKK', fractionDigits: 0, formatted: '19 kr', perMonth: { hu: '19 kr/hó', de: '19 kr/Monat', da: '19 kr/måned' } },
        NOK: { amount: 29, currency: 'NOK', fractionDigits: 0, formatted: '29 kr', perMonth: { hu: '29 kr/hó', de: '29 kr/Monat', no: '29 kr/måned' } }
      },
      '6month': {
        HUF: { amount: 349, currency: 'HUF', fractionDigits: 0, formatted: '349 Ft' },
        EUR: { amount: 0.99, currency: 'EUR', fractionDigits: 2, formatted: '€0.99' }
      },
      '1year': {
        HUF: { amount: 499, currency: 'HUF', fractionDigits: 0, formatted: '499 Ft' },
        EUR: { amount: 1.49, currency: 'EUR', fractionDigits: 2, formatted: '€1.49' }
      },
      '2year': {
        HUF: { amount: 699, currency: 'HUF', fractionDigits: 0, formatted: '699 Ft' },
        EUR: { amount: 1.99, currency: 'EUR', fractionDigits: 2, formatted: '€1.99' }
      },
      '5year': {
        HUF: { amount: 899, currency: 'HUF', fractionDigits: 0, formatted: '899 Ft' },
        EUR: { amount: 2.49, currency: 'EUR', fractionDigits: 2, formatted: '€2.49' }
      }
    }
  };

  // Helper: országkód alapján Pro ár lekérése (regisztrációkor megadott ország)
  // countryCode: 'HU'|'PL'|'RO'|... ; backward compat: boolean → true=HUF, false=EUR
  window.getProPrice = function(countryCodeOrIsHu) {
    let key = 'EUR';
    if (typeof countryCodeOrIsHu === 'boolean') {
      key = countryCodeOrIsHu ? 'HUF' : 'EUR';
    } else if (countryCodeOrIsHu) {
      const cc = String(countryCodeOrIsHu).toUpperCase();
      if (cc === 'HU') key = 'HUF';
      else if (cc === 'PL') key = 'PLN';
      else if (cc === 'RO') key = 'RON';
      else if (cc === 'DK') key = 'DKK';
      else if (cc === 'NO') key = 'NOK';
    }
    return window.PRICING_CONFIG.pro[key] || window.PRICING_CONFIG.pro.EUR;
  };

  // Helper: országkód és csomag alapján archival ár lekérése (HU→HUF, PL→PLN, RO→RON, egyéb→EUR)
  window.getArchivalPrice = function(tier, countryCodeOrIsHu) {
    let currencyKey = 'EUR';
    if (typeof countryCodeOrIsHu === 'boolean') {
      currencyKey = countryCodeOrIsHu ? 'HUF' : 'EUR';
    } else if (countryCodeOrIsHu) {
      const cc = String(countryCodeOrIsHu).toUpperCase();
      if (cc === 'HU') currencyKey = 'HUF';
      else if (cc === 'PL') currencyKey = 'PLN';
      else if (cc === 'RO') currencyKey = 'RON';
      else if (cc === 'DK') currencyKey = 'DKK';
      else if (cc === 'NO') currencyKey = 'NOK';
    }
    const tierKey = (tier && tier.replace) ? tier.replace('archival_', '') : (tier || 'archival');
    const key = tierKey === '' ? 'archival' : tierKey;
    return window.PRICING_CONFIG.archival[key]
      ? window.PRICING_CONFIG.archival[key][currencyKey]
      : (window.PRICING_CONFIG.archival.archival ? window.PRICING_CONFIG.archival.archival[currencyKey] : null);
  };

  // Helper: currency formázás
  window.formatPrice = function(amount, currency, fractionDigits) {
    const locale = currency === 'HUF' ? 'hu-HU' : currency === 'PLN' ? 'pl-PL' : currency === 'RON' ? 'ro-RO' : currency === 'DKK' ? 'da-DK' : currency === 'NOK' ? 'nb-NO' :
                   (typeof currentLang !== 'undefined' && currentLang === 'de') ? 'de-DE' : (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en-US' : (typeof currentLang !== 'undefined' && currentLang === 'ro') ? 'ro-RO' : (typeof currentLang !== 'undefined' && currentLang === 'pl') ? 'pl-PL' : (typeof currentLang !== 'undefined' && currentLang === 'da') ? 'da-DK' : (typeof currentLang !== 'undefined' && currentLang === 'no') ? 'nb-NO' : 'hu-HU';
    try {
      if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits
        }).format(amount);
      }
    } catch (_) {}
    return currency === 'HUF' ? `${amount} Ft` : currency === 'PLN' ? `${amount} zł` : currency === 'RON' ? `${amount} lei` : currency === 'DKK' || currency === 'NOK' ? `${amount} kr` : `${currency}${amount}`;
  };
})();
