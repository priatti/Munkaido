// PWA Service Worker regisztrációja
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => console.log('ServiceWorker sikeresen regisztrálva:', registration.scope))
      .catch(err => console.log('ServiceWorker regisztráció sikertelen:', err));
  });
}

// ------ FŐ MODULOK IMPORTÁLÁSA ------
import { initializeAuthentication } from './services/auth.js';
import { initializei18n } from './services/i18n.js';

// ------ UI MODULOK INICIALIZÁLÓ FÜGGVÉNYEINEK IMPORTÁLÁSA ------
import { initializeNavigation } from './ui/navigation.js';
import { initializeListView } from './ui/listView.js';
import { initializePalletsView } from './ui/palletsView.js';
import { initializeSettings } from './ui/settingsView.js';
// ...és a többi, amit később adunk hozzá

// ------ ALKALMAZÁS INDÍTÁSA ------
document.addEventListener('DOMContentLoaded', async () => {
  await initializei18n();
  
  // A navigáció és az összes többi UI modul eseménykezelőjének beállítása
  initializeNavigation();
  initializeListView();
  initializePalletsView();
  initializeSettings();
  
  initializeAuthentication();
});
