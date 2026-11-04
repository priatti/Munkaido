// GuriGO open-in-app v3 (diagnosztikás, önállóan DOM-ba szúr)
(() => {
  const log = (...a)=>console.log('[open-in-app]', ...a);

  const isStandalone = (
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator.standalone === true)
  );
  log('standalone?', isStandalone);
  if (isStandalone) return;

  function makeCta(className) {
    const wrap = document.createElement('div');
    wrap.id = 'open-in-app-cta';
    wrap.style.marginTop = '0.75rem';

    const btn = document.createElement('button');
    btn.id = 'open-in-app-btn';
    btn.type = 'button';
    btn.textContent = 'Megnyitás az appban';

    if (className) {
      btn.className = className; // Telepítés gomb osztályai
    } else {
      // Fallback stílus
      btn.style.background = 'linear-gradient(90deg,#2563eb,#3b82f6)';
      btn.style.color = '#fff';
      btn.style.padding = '.75rem 1rem';
      btn.style.borderRadius = '0.5rem';
      btn.style.width = '100%';
      btn.style.fontWeight = '600';
      btn.style.boxShadow = '0 8px 24px rgba(37,99,235,.35)';
    }

    const help = document.createElement('p');
    help.className = 'text-sm mt-2 opacity-75';
    help.textContent = 'Ha fent kék böngészősáv látható, ezzel a gombbal app módban nyílik meg.';

    btn.addEventListener('click', () => {
      const startUrl = '/?source=pwa';
      window.open(startUrl, '_blank', 'noopener');
      setTimeout(() => { if (history.length > 1) history.back(); }, 800);
    });

    wrap.appendChild(btn);
    wrap.appendChild(help);
    return wrap;
  }

  function insertCta() {
    if (document.getElementById('open-in-app-cta')) return true;
    const installBtn = document.querySelector('#install-pwa-button');
    if (installBtn) {
      const className = installBtn.className;
      const cta = makeCta(className);
      installBtn.parentElement.appendChild(cta);
      log('CTA inserted after #install-pwa-button');
      return true;
    }
    // ha nincs install gomb, próbáljuk a kártya alá (container)
    const container = document.getElementById('pwa-install-container') || document.body;
    const cta = makeCta(null);
    container.appendChild(cta);
    log('CTA inserted fallback position');
    return true;
  }

  // Próbáljuk azonnal
  if (insertCta()) return;

  // Figyeljük a DOM-ot, ha később renderelődik
  const mo = new MutationObserver(() => {
    if (insertCta()) mo.disconnect();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // Biztos, ami biztos: 3s múlva is próbálkozzunk
  setTimeout(insertCta, 3000);
})();
