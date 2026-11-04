// ===========================
//  VAT CONFIG – GuriGO
//  ÁFA beállítások országonként
// ===========================

(function(){
  window.VAT_CONFIG = {
    // Országonkénti ÁFA kulcsok (%)
    // MINDEN ORSZÁG AAM - Alanyi Adómentes számlázás
    rates: {
      'HU': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Magyarország)' },
      'AT': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Austria)' },
      'BE': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Belgium)' },
      'BG': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Bulgaria)' },
      'HR': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Croatia)' },
      'CY': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Cyprus)' },
      'CZ': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Czech Republic)' },
      'DK': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Denmark)' },
      'EE': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Estonia)' },
      'FI': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Finland)' },
      'FR': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (France)' },
      'DE': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Germany)' },
      'GR': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Greece)' },
      'IE': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Ireland)' },
      'IT': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Italy)' },
      'LV': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Latvia)' },
      'LT': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Lithuania)' },
      'LU': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Luxembourg)' },
      'MT': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Malta)' },
      'NL': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Netherlands)' },
      'PL': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Poland)' },
      'PT': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Portugal)' },
      'RO': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Romania)' },
      'SK': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Slovakia)' },
      'SI': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Slovenia)' },
      'ES': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Spain)' },
      'SE': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Sweden)' },
      // Non-EU countries
      'GB': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (UK)' },
      'CH': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Switzerland)' },
      'NO': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Norway)' },
      'US': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (USA)' },
      'CA': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Canada)' },
      'AU': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Australia)' },
      'DEFAULT': { rate: 0, code: 'AAM', description: 'Alanyi Adómentes (Other countries)' }
    },

    // Számlázási nyelv országonként
    invoiceLanguage: {
      'HU': 'hu',
      'AT': 'de',
      'DE': 'de',
      'DEFAULT': 'en'
    },

    // Helper: ÁFA kulcs lekérése országkód alapján
    getVatRate: function(countryCode) {
      const country = (countryCode || 'DEFAULT').toUpperCase();
      return this.rates[country] || this.rates['DEFAULT'];
    },

    // Helper: Számla nyelv lekérése országkód alapján
    getInvoiceLanguage: function(countryCode) {
      const country = (countryCode || 'DEFAULT').toUpperCase();
      return this.invoiceLanguage[country] || this.invoiceLanguage['DEFAULT'];
    },

    // Helper: Nettó ár számítása bruttó árból
    calculateNetFromGross: function(grossAmount, countryCode) {
      const vatInfo = this.getVatRate(countryCode);
      if (vatInfo.rate === 0) {
        // AAM, reverse charge, vagy no VAT esetén bruttó = nettó
        return {
          gross: grossAmount,
          net: grossAmount,
          vat: 0,
          vatRate: vatInfo.rate,
          vatCode: vatInfo.code
        };
      }
      // Normál ÁFA esetén: nettó = bruttó / (1 + ÁFA%)
      const vatMultiplier = 1 + (vatInfo.rate / 100);
      const net = grossAmount / vatMultiplier;
      const vat = grossAmount - net;
      return {
        gross: grossAmount,
        net: Math.round(net * 100) / 100, // 2 tizedesjegy
        vat: Math.round(vat * 100) / 100,
        vatRate: vatInfo.rate,
        vatCode: vatInfo.code
      };
    },

    // Helper: Bruttó ár számítása nettó árból
    calculateGrossFromNet: function(netAmount, countryCode) {
      const vatInfo = this.getVatRate(countryCode);
      if (vatInfo.rate === 0) {
        return {
          gross: netAmount,
          net: netAmount,
          vat: 0,
          vatRate: vatInfo.rate,
          vatCode: vatInfo.code
        };
      }
      const vatMultiplier = 1 + (vatInfo.rate / 100);
      const gross = netAmount * vatMultiplier;
      const vat = gross - netAmount;
      return {
        gross: Math.round(gross * 100) / 100,
        net: netAmount,
        vat: Math.round(vat * 100) / 100,
        vatRate: vatInfo.rate,
        vatCode: vatInfo.code
      };
    }
  };

  // Global helper functions
  window.getVatRate = function(countryCode) {
    return window.VAT_CONFIG.getVatRate(countryCode);
  };

  window.getInvoiceLanguage = function(countryCode) {
    return window.VAT_CONFIG.getInvoiceLanguage(countryCode);
  };

  window.calculateNetFromGross = function(grossAmount, countryCode) {
    return window.VAT_CONFIG.calculateNetFromGross(grossAmount, countryCode);
  };

  window.calculateGrossFromNet = function(netAmount, countryCode) {
    return window.VAT_CONFIG.calculateGrossFromNet(netAmount, countryCode);
  };
})();
