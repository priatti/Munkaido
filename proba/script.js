// ============================
// Munkaidő – v9.11
// ============================

const APP_VERSION = '9.11';

// Splash elrejtése, amikor az app kész
function hideSplash() {
  const s = document.getElementById('splash-screen');
  if (s && !s.classList.contains('hide')) s.classList.add('hide');
}

// Demo UI: START gomb katt
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnStart');
  if (btn) btn.addEventListener('click', () => {
    // Itt futtathatod a saját induló logikád
    console.log('Start pressed');
  });
});

// Ha minden erőforrás betöltött, rejtsük a splash-t
window.addEventListener('load', () => {
  setTimeout(hideSplash, 250); // kis csúsztatás, hogy kellemesen tűnjön el
});

// ============================
// PWA – szervizmunkás
// ============================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('sw.js', { scope: './' });
      console.log('Service Worker regisztrálva.');
    } catch (err) {
      console.warn('SW regisztráció sikertelen:', err);
    }
  });
}