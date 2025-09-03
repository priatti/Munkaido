// PWA Service Worker regisztrációja
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // JAVÍTVA: Relatív útvonal használata a proba mappában
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => console.log('ServiceWorker sikeresen regisztrálva:', registration.scope))
      .catch(err => console.log('ServiceWorker regisztráció sikertelen:', err));
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
  await initializei18n();
  
  initializeNavigation();
  initializeLiveView();
  initializeFullDayView();
  initializeListView();
  initializeStatsView();
  initializeReportView();
  initializeSettings();
  initializeTachographView();
  initializePalletsView();
  
  initializeAuthentication();
});
