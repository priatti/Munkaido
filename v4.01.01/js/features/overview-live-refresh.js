
// proba/js/features/overview-live-refresh.js
(function () {
  'use strict';
  async function refreshOverview(){
    if (typeof window.refreshOverview === 'function') return window.refreshOverview();
    if (typeof window.renderOverview  === 'function') return window.renderOverview();
    if (typeof window.initOverview    === 'function') return window.initOverview();
    // location.reload(); // végső fallback, ha kell
  }
  window.addEventListener('records:updated', refreshOverview);
  if ('BroadcastChannel' in window) {
    const bc = new BroadcastChannel('munkaido-records');
    bc.onmessage = (e) => { if (e && e.data && e.data.type === 'records:updated') refreshOverview(); };
  }
  window.addEventListener('storage', (e) => { if (e.key === 'records_updated_ping') refreshOverview(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshOverview(); });
  window.addEventListener('pageshow', () => setTimeout(refreshOverview, 0));
})();


// --- Insert legal info at bottom of Overview tab ---
(function(){
  function injectLegalIntoOverview(){
    try {
      const cont = document.getElementById('content-overview');
      if (!cont) return;
      if (document.getElementById('legal-info-overview')) return;
      const v = (window.appInfo && appInfo.version) ? appInfo.version : '3.02.11d';
      const legal = document.createElement('div');
      legal.id = 'legal-info-overview';
      legal.className = 'text-xs text-gray-400 my-3 text-center';
      legal.innerHTML = `© 2025 Princz Attila | GuriGO — <a href="mailto:info@gurigo.eu" class="underline">info@gurigo.eu</a> | v${v}`;
      cont.appendChild(legal);
    } catch(e){ console.warn('overview legal inject failed', e); }
  }
  window.addEventListener('pageshow', () => setTimeout(injectLegalIntoOverview, 0));
  document.addEventListener('click', (e) => {
    const t = e.target;
    if ((t && t.closest && t.closest('[data-tab="live"]')) || (t && t.dataset && t.dataset.tab === 'live')) {
        setTimeout(injectLegalIntoOverview, 0);
    }
  });
  setTimeout(injectLegalIntoOverview, 0);
})();
// --- end legal insert ---
