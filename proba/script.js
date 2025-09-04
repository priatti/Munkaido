// ============================
// Munkaidő – v9.11
// ============================

const APP_VERSION = '9.11';

// ---- Splash kezelése ----
(function(){
  const hide = () => {
    const s = document.getElementById('splash-screen');
    if (s && !s.classList.contains('hide')) s.classList.add('hide');
  };

  // 1) Alap: ha az oldal minden erőforrást betöltött, rejtsük el
  window.addEventListener('load', () => setTimeout(hide, 300));

  // 2) Ha az appod inicializáció végén hívod:
  //    window.appReady();  -> azonnal eltűnik
  window.appReady = hide;
})();

// ============================
// PWA – Service Worker regisztráció
// ============================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('sw.js', { scope: './' });
      console.log('Service Worker regisztrálva.');
    } catch (e) {
      console.warn('SW regisztráció sikertelen:', e);
    }
  });
}
