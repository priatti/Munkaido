import { auth } from '../config.js';
import { state, setCurrentUser } from '../state.js';
import { loadAllRecords } from './database.js';
import { renderApp } from '../ui/navigation.js';
// JAVÍTÁS: A hivatkozás a helyes fájlra, a domHelpers.js-re mutat
import { showAlert } from '../utils/domHelpers.js';

/**
 * Frissíti a felhasználói felületet a bejelentkezési állapot alapján
 * (pl. Bejelentkezés/Kijelentkezés gombok, felhasználónév megjelenítése).
 * @param {object|null} user - A Firebase user objektum vagy null.
 */
function updateAuthUI(user) {
    const loggedInView = document.getElementById('logged-in-view');
    const loggedOutView = document.getElementById('logged-out-view');
    const userNameEl = document.getElementById('user-name');

    if (user) {
        loggedInView.classList.remove('hidden');
        loggedOutView.classList.add('hidden');
        userNameEl.textContent = user.displayName || user.email;
    } else {
        loggedInView.classList.add('hidden');
        loggedOutView.classList.remove('hidden');
        userNameEl.textContent = '';
    }
}

/**
 * Bejelentkezési folyamat elindítása a Google felugró ablakkal.
 */
export async function loginWithGoogle() {
    const loginButton = document.getElementById('login-button');
    const originalContent = loginButton.innerHTML;
    loginButton.disabled = true;
    loginButton.innerHTML = `...`;

    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        await auth.signInWithPopup(provider);
    } catch (error) {
        const i18n = window.translations[state.currentLang] || window.translations['en'];
        let msg = i18n.alertLoginError;
        if (error.code === 'auth/popup-closed-by-user') msg = i18n.alertPopupClosed;
        else if (error.code === 'auth/popup-blocked') msg = i18n.alertPopupBlocked;
        showAlert(msg, 'info');
    } finally {
        loginButton.disabled = false;
        loginButton.innerHTML = originalContent;
    }
}

/**
 * Kijelentkezés a Firebase-ből.
 */
export function logout() {
    auth.signOut();
}

/**
 * Elindítja az authentikációs logikát: figyeli a bejelentkezési állapotot,
 * és beköti az eseménykezelőket a gombokra.
 */
export function initializeAuthentication() {
    // Figyeljük a bejelentkezési állapot változását. Ez a modul "lelke".
    auth.onAuthStateChanged(async user => {
        setCurrentUser(user);
        updateAuthUI(user);

        // Adatok betöltése a megfelelő forrásból (Firestore vagy LocalStorage)
        await loadAllRecords();
        
        // Teljes alkalmazás renderelése az új adatokkal és a megfelelő nyelvvel.
        renderApp();
    });
}
