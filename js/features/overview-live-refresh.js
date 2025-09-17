// proba/js/features/overview-live-refresh.js
(function () {
  'use strict';
  async function refreshOverview(){
    if (typeof window.refreshOverview === 'function') return window.refreshOverview();
    if (typeof window.renderOverview  === 'function') return window.renderOverview();
    if (typeof window.initOverview    === 'function') return window.initOverview();
    // location.reload(); // ha nincs külön függvényed
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
