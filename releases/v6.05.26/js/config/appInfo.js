(function(){
  window.APP_INFO = {
    version: '6.05.26',
    releaseDate: '2026-11-04',
    year: "2025",
    authorHu: "Princz Attila",
    authorDe: "Attila Princz",
    copyrightHu: function(){ return " " + this.year + " " + this.authorHu + ". Minden jog fenntartva."; },
    copyrightDe: function(){ return " " + this.year + " " + this.authorDe + ". Alle Rechte vorbehalten."; },
    // Jogi dokumentum verziók (Felhasználási feltételek / Adatvédelmi tájékoztató)
    legalVersion: 'legal-2026-06-01',
    termsDocVersion: 'v6.04.02',
    privacyDocVersion: 'v6.04.02'
  };
  // Globális shorthand a jogi verzióhoz, ha szükséges
  try { window.LEGAL_INFO = { currentVersion: 'legal-2026-06-01', termsDocVersion: 'v6.04.02', privacyDocVersion: 'v6.04.02' }; } catch(_) {}
})();

// Copyright & Contact
const appCopyright = ' 2025 GuriGO';
const appContact = 'info@gurigo.eu';
