function initAuthScreen() {
    const logoutButton = document.getElementById('logout-button');

    document.getElementById('show-register-view')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('register-view').classList.remove('hidden');
    });

    document.getElementById('show-login-view')?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('register-view').classList.add('hidden');
        document.getElementById('login-view').classList.remove('hidden');
    });

    document.getElementById('login-button-google')?.addEventListener('click', signInWithGoogle);
    document.getElementById('guest-mode-button')?.addEventListener('click', handleGuestMode);

    document.getElementById('login-button-email')?.addEventListener('click', () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        handleEmailLogin(email, password);
    });

    document.getElementById('register-button')?.addEventListener('click', () => {
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-password-confirm').value;
        handleEmailRegistration(email, password, confirm);
    });
    
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('isGuestMode');
            firebase.auth().signOut();
        });
    }
    
    firebase.auth().onAuthStateChanged(handleAuthStateChange);
}

async function handleEmailRegistration(email, password, passwordConfirm) {
    if (!email || !password || !passwordConfirm) {
        showCustomAlert('Kérlek tölts ki minden mezőt a regisztrációhoz!', 'info');
        return;
    }
    if (password !== passwordConfirm) {
        showCustomAlert('A két jelszó nem egyezik!', 'info');
        return;
    }
    if (password.length < 6) {
        showCustomAlert('A jelszónak legalább 6 karakter hosszúnak kell lennie.', 'info');
        return;
    }

    try {
        await firebase.auth().createUserWithEmailAndPassword(email, password);
    } catch (error) {
        console.error("Regisztrációs hiba:", error);
        showCustomAlert(`Hiba a regisztráció során: ${error.message}`, 'info');
    }
}

async function handleEmailLogin(email, password) {
    if (!email || !password) {
        showCustomAlert('Kérlek add meg az e-mail címed és a jelszavad!', 'info');
        return;
    }

    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error("Bejelentkezési hiba:", error);
        showCustomAlert('Hibás e-mail cím vagy jelszó.', 'info');
    }
}

function handleGuestMode() {
    const i18n = translations[currentLang];
    showCustomAlert(
        'Vendég módban az adatai csak ezen az eszközön, a böngészőben tárolódnak. Az adatok elveszhetnek a böngésző gyorsítótárának törlésével. A biztonságos adatmentéshez regisztráljon.',
        'warning',
        () => {
            localStorage.setItem('isGuestMode', 'true');
            handleAuthStateChange(null);
        },
        { confirmText: 'Értem, tovább vendégként', confirmClass: 'bg-blue-500 hover:bg-blue-600' }
    );
}