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

// ------ FŐ MODULOK IMPORTÁLÁSA ------
import { initializeAuthentication } from './services/auth.js';
import { initializei18n } from './services/i18n.js';

// ------ UI MODULOK INICIALIZÁLÓ FÜGGVÉNYEINEK IMPORTÁLÁSA ------
// Ezek a függvények felelnek az adott modul eseménykezelőinek beállításáért
import { initializeNavigation } from './ui/navigation.js';
import { initializeSettings } from './ui/settingsView.js';
import { initializePalletsView } from './ui/palletsView.js';
// ... és a többi UI modul inicializálója, amiket később adunk hozzá


// ------ ALKALMAZÁS INDÍTÁSA ------
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Nyelvi beállítások betöltése, hogy minden a helyes nyelven jelenjen meg
  await initializei18n();

  // 2. A fő navigációs elemek (fülek, menü) eseménykezelőinek beállítása
  initializeNavigation();

  // 3. Az összes többi UI modul eseménykezelőjének beállítása
  initializeSettings();
  initializePalletsView();
  // ... ide jönnek majd a további initialize hívások...


  // 4. Firebase authentikáció elindítása, ami betölti a felhasználói adatokat
  //    és elindítja az app első renderelését.
  initializeAuthentication();
});
