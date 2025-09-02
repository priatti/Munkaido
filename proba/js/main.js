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
import { initializeNavigation } from './ui/navigation.js';
import { initializeLiveView } from './ui/liveView.js';
import { initializeFullDayView } from './ui/fullDayView.js';
import { initializeListView } from './ui/listView.js';
import { initializeStatsView } from './ui/statsView.js';
import { initializeReportView } from './ui/reportView.js';
import { initializeSettings } from './ui/settingsView.js';
import { initializeTachographView } from './ui/tachographView.js';
import { initializePalletsView } from './ui/palletsView.js';

// ------ ALKALMAZÁS INDÍTÁSA ------
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Nyelvi beállítások betöltése, hogy minden a helyes nyelven jelenjen meg
  await initializei18n();

  // 2. A fő navigációs elemek (fülek, menü) eseménykezelőinek beállítása
  initializeNavigation();

  // 3. Az összes többi UI modul eseménykezelőjének beállítása
  initializeLiveView();
  initializeFullDayView();
  initializeListView();
  initializeStatsView();
  initializeReportView();
  initializeSettings();
  initializeTachographView();
  initializePalletsView();

  // 4. Firebase authentikáció elindítása, ami betölti a felhasználói adatokat
  //    és elindítja az app első renderelését.
  initializeAuthentication();
});