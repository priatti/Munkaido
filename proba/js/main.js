// PWA Service Worker regisztrációja
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker sikeresen regisztrálva:', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker regisztráció sikertelen:', err);
      });
  });
}

// Fő modulok importálása
import { initializeAuthentication } from './services/auth.js';
import { initializeNavigation } from './ui/navigation.js';
import { initializei18n } from './services/i18n.js';
import { initializeEventListeners } from './ui/events.js';

// Az alkalmazás elindítása, miután a DOM betöltődött
document.addEventListener('DOMContentLoaded', async () => {
  // Először a nyelvi beállításokat töltjük be, hogy a felület a helyes nyelven jelenjen meg
  await initializei18n();

  // Eseménykezelők (gombnyomások, stb.) beállítása
  initializeEventListeners();

  // Navigáció és fülek közötti váltás logikájának indítása
  initializeNavigation();

  // Firebase authentikáció elindítása, ami betölti a felhasználói adatokat és elindítja az appot
  initializeAuthentication();
});