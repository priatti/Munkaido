// =======================================================
// ===== FIREBASE ÉS AUTHENTIKÁCIÓS LOGIKA (v3.03) =======
// =======================================================
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;
let isGuestMode = false;

function initializeAuth() {
    // E-mail/Jelszó gombok
    const emailLoginBtn = document.getElementById('login-button-email');
    const emailRegisterBtn = document.getElementById('register-button-email');
    if (emailLoginBtn) emailLoginBtn.addEventListener('click', signInWithEmail);
    if (emailRegisterBtn) emailRegisterBtn.addEventListener('click', registerWithEmail);

    // Google gomb (az új helyen)
    const googleLoginBtn = document.getElementById('login-button-google');
    if (googleLoginBtn) googleLoginBtn.addEventListener('click', signInWithGoogle);

    // Vendég mód gomb
    const guestModeBtn = document.getElementById('guest-mode-button');
    if (guestModeBtn) guestModeBtn.addEventListener('click', enterGuestMode);
    
    // Figyeljük a bejelentkezési állapot változását
    auth.onAuthStateChanged(handleAuthStateChange);
}

// ÚJ: E-mail regisztráció
async function registerWithEmail() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('auth-error');
    const i18n = (typeof translations !== 'undefined') ? translations[currentLang] : {};
    
    try {
        errorDiv.classList.add('hidden');
        await auth.createUserWithEmailAndPassword(email, password);
        // A bejelentkezést az onAuthStateChanged fogja kezelni
    } catch (error) {
        console.error("Registration error:", error.code, error.message);
        errorDiv.textContent = i18n.authRegisterError || "Hiba a regisztráció során: " + error.message;
        errorDiv.classList.remove('hidden');
    }
}

// ÚJ: E-mail bejelentkezés
async function signInWithEmail() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('auth-error');
    const i18n = (typeof translations !== 'undefined') ? translations[currentLang] : {};

    try {
        errorDiv.classList.add('hidden');
        await auth.signInWithEmailAndPassword(email, password);
        // A bejelentkezést az onAuthStateChanged fogja kezelni
    } catch (error) {
        console.error("Login error:", error.code, error.message);
        errorDiv.textContent = i18n.authLoginError || "Hiba a bejelentkezés során: " + error.message;
        errorDiv.classList.remove('hidden');
    }
}

// MÓDOSÍTOTT: Google bejelentkezés, hogy kezelje a hibákat
async function signInWithGoogle() {
    const errorDiv = document.getElementById('auth-error');
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        errorDiv.classList.add('hidden');
        await auth.signInWithPopup(provider);
    } catch (error) {
        const i18n = (typeof translations !== 'undefined') ? translations[currentLang] : {};
        let errorMessage = i18n.alertLoginError || 'Bejelentkezési hiba történt.';
        if (error.code === 'auth/popup-closed-by-user') { errorMessage = i18n.alertPopupClosed || 'A bejelentkezési ablakot bezárta.'; } 
        else if (error.code === 'auth/popup-blocked') { errorMessage = i18n.alertPopupBlocked || 'A böngésző blokkolta a felugró ablakot.'; }
        console.error('Google Login error:', error);
        errorDiv.textContent = errorMessage;
        errorDiv.classList.remove('hidden');
    }
}

// ÚJ: Vendég mód
function enterGuestMode() {
    isGuestMode = true;
    handleAuthStateChange(null);
}

// NAGYMÉRTÉKBEN MÓDOSÍTOTT: Az állapotváltozás kezelése
async function handleAuthStateChange(user) {
    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app');
    const splashScreen = document.getElementById('splash-screen');
    const loggedOutView = document.getElementById('logged-out-view'); // Ezt is kezeljük

    if (splashScreen) splashScreen.style.display = 'none';

    // Ha van felhasználó (bejelentkezve)
    if (user) {
        currentUser = user;
        isGuestMode = false;
        
        if (authScreen) authScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');

        console.log("Logged in:", user.uid);
        
        // Adatok betöltése Firestore-ból
        await loadSettingsFromFirestore(); 
        const firestoreRecords = await loadRecordsFromFirestore('records');
        const localRecords = JSON.parse(localStorage.getItem('workRecords') || '[]');

        if (firestoreRecords.length === 0 && localRecords.length > 0) {
            await migrateLocalToFirestore(localRecords, 'records');
            records = localRecords;
        } else {
            records = firestoreRecords;
        }
        palletRecords = await loadRecordsFromFirestore('pallets');
        
    // Ha vendég módban vagyunk
    } else if (isGuestMode) {
        currentUser = null;
        if (authScreen) authScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        if (loggedOutView) loggedOutView.classList.add('hidden'); // Rejtsük el a "Bejelentkezés Google-fiókkal" gombot a beállításokból

        console.log("Entering Guest Mode.");
        records = JSON.parse(localStorage.getItem('workRecords') || '[]');
        palletRecords = JSON.parse(localStorage.getItem('palletRecords') || '[]');

    // Ha se felhasználó, se vendég mód -> bejelentkező képernyő
    } else {
        currentUser = null;
        if (appContainer) appContainer.classList.add('hidden');
        if (authScreen) {
            authScreen.classList.remove('hidden');
            authScreen.classList.add('flex');
        }
        return; // Itt megállunk, nem rendereljük az appot
    }

    // Csak akkor fusson le, ha be vagyunk lépve (user vagy vendég)
    await runNightWorkRecalculation();
    renderApp();
    checkForAutoExport();
}

// ... a fájl többi része (updateAuthUI, loadRecordsFromFirestore, stb.) változatlan marad ...