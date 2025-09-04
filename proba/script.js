// ============================
// Munkaidő – v9.11
// ============================

const APP_VERSION = '9.11';

// Kezdőkép elrejtése
function hideSplash() {
  const s = document.getElementById('splash-screen');
  if (s && !s.classList.contains('hide')) s.classList.add('hide');
}

// START gomb minta-esemény
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnStart');
  if (btn) btn.addEventListener('click', () => {
    console.log('Start pressed');
  });
});

// Annak biztosítása, hogy a splash mindig eltűnjön
window.addEventListener('load', () => {
  setTimeout(hideSplash, 500);
});

// ============================
// PWA – Service Worker regisztráció
// ============================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('sw.js', { scope: './' });
      console.log('Service Worker regisztrálva:', reg.scope);
    } catch (err) {
      console.warn('SW regisztráció sikertelen:', err);
    }
  });
}
