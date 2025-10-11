// ===========================
//  AUTH MODULE – GuriGO
//  (Firebase v8 API-hoz)
// ===========================

// Segédfüggvény: jelszó láthatóság váltása
function togglePasswordVisibility(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
}

// ---------------------------
//  Bejelentkezés (Email+Jelszó)
// ---------------------------
async function handleEmailLoginSubmit() {
  const emailEl = document.getElementById('email');
  const passEl  = document.getElementById('password');
  const btn     = document.getElementById('login-button-email');

  const email = emailEl?.value?.trim();
  const password = passEl?.value || '';

  if (!email || !password) {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('Kérlek töltsd ki az összes mezőt!', 'info');
    }
    return;
  }

  // Remember me (ha van checkbox)
  const rememberMe = document.getElementById('remember-me')?.checked || false;

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Bejelentkezés…';
    }

    const persistence = rememberMe
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;
    await firebase.auth().setPersistence(persistence);

    await firebase.auth().signInWithEmailAndPassword(email, password);

    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    // Siker esetén az onAuthStateChanged tovább visz
  } catch (error) {
    console.error('Login error:', error);
    let msg = 'Ismeretlen hiba történt';
    switch (error.code) {
      case 'auth/user-not-found':        msg = '❌ Nincs ilyen felhasználó. Regisztrálj!'; break;
      case 'auth/wrong-password':        msg = '❌ Helytelen jelszó'; break;
      case 'auth/invalid-email':         msg = '❌ Érvénytelen email formátum'; break;
      case 'auth/too-many-requests':     msg = '⏳ Túl sok próbálkozás. Próbáld újra később.'; break;
      case 'auth/user-disabled':         msg = '🚫 Ez a fiók le lett tiltva'; break;
      case 'auth/network-request-failed':msg = '📡 Nincs internetkapcsolat'; break;
    }
    if (typeof showCustomAlert === 'function') showCustomAlert(msg, 'info');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Bejelentkezés';
    }
  }
}

// ---------------------------
//  Regisztráció (Email+Jelszó)
// ---------------------------
async function handleEmailRegistrationSubmit() {
  const emailEl   = document.getElementById('register-email');
  const passEl    = document.getElementById('register-password');
  const pass2El   = document.getElementById('register-password-confirm');
  const btn       = document.getElementById('register-button');

  const email = emailEl?.value?.trim();
  const pass  = passEl?.value || '';
  const pass2 = pass2El?.value || '';

  if (!email || !pass || !pass2) {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('Kérlek töltsd ki az összes mezőt!', 'info');
    }
    return;
  }
  if (pass.length < 6) {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('A jelszónak legalább 6 karakter hosszúnak kell lennie.', 'info');
    }
    return;
  }
  if (pass !== pass2) {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('A két jelszó nem egyezik.', 'info');
    }
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Regisztráció…';
    }

    await firebase.auth().createUserWithEmailAndPassword(email, pass);
    // További profil-létrehozás az onAuthStateChanged-ben / userProfile.js-ben történik

  } catch (error) {
    console.error('Registration error:', error);
    let msg = 'Ismeretlen hiba történt';
    switch (error.code) {
      case 'auth/email-already-in-use':  msg = 'Ez az e-mail már használatban van.'; break;
      case 'auth/invalid-email':         msg = 'Érvénytelen e-mail cím.'; break;
      case 'auth/weak-password':         msg = 'Gyenge jelszó. (Min. 6 karakter)'; break;
      case 'auth/network-request-failed':msg = '📡 Nincs internetkapcsolat'; break;
    }
    if (typeof showCustomAlert === 'function') showCustomAlert(msg, 'info');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Regisztráció';
    }
  }
}

// ---------------------------
//  Google belépés – HIÁNYZÓ FUNKCIÓ PÓTLÁSA
// ---------------------------
async function signInWithGoogle() {
  const btn = document.getElementById('login-button-google');
  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Csatlakozás Google-lel…';
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    await firebase.auth().signInWithPopup(provider);
    // Siker: onAuthStateChanged visz tovább
  } catch (error) {
    console.error('Google sign-in error:', error);
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('A Google bejelentkezés nem sikerült.', 'info');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<svg class="w-5 h-5" viewBox="0 0 48 48"><path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00"></path><path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" fill="#4CAF50"></path><path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.215,44,30.035,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2"></path></svg><span>Folytatás Google fiókkal</span>';
    }
  }
}

// ---------------------------
//  Email validáció (valós idő)
// ---------------------------
function initEmailValidation() {
  const emailInputs = ['email', 'register-email'];
  emailInputs.forEach((inputId) => {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('blur', function () {
      const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
      if (this.value && !emailRegex.test(this.value)) {
        this.classList.add('border-red-500', 'border-2');
        this.classList.remove('border-gray-200', 'focus:border-blue-500');
        if (!this.nextElementSibling || !this.nextElementSibling.classList?.contains('email-error')) {
          this.insertAdjacentHTML(
            'afterend',
            '<p class="text-xs text-red-600 dark:text-red-400 mt-1 email-error">❌ Érvénytelen email formátum</p>'
          );
        }
      } else if (this.value) {
        this.classList.remove('border-red-500');
        this.classList.add('border-green-500', 'border-2');
        const errorMsg = this.nextElementSibling;
        if (errorMsg?.classList?.contains('email-error')) errorMsg.remove();
      } else {
        this.classList.remove('border-red-500', 'border-green-500', 'border-2');
        this.classList.add('border-gray-200');
        const errorMsg = this.nextElementSibling;
        if (errorMsg?.classList?.contains('email-error')) errorMsg.remove();
      }
    });

    input.addEventListener('input', function () {
      const errorMsg = this.nextElementSibling;
      if (errorMsg?.classList?.contains('email-error')) errorMsg.remove();
      this.classList.remove('border-red-500', 'border-green-500', 'border-2');
      this.classList.add('border-gray-200');
    });
  });
}
window.initEmailValidation = initEmailValidation;

// ---------------------------
//  Caps Lock figyelmeztetés
// ---------------------------
function initCapsLockWarning() {
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  passwordInputs.forEach((input) => {
    let warningElement = null;

    input.addEventListener('keyup', (e) => {
      const isCapsLockOn = e.getModifierState && e.getModifierState('CapsLock');
      if (isCapsLockOn && !warningElement) {
        warningElement = document.createElement('p');
        warningElement.className =
          'text-xs text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1 caps-warning';
        warningElement.innerHTML = '⚠️ <span>Caps Lock be van kapcsolva</span>';
        input.parentElement.insertAdjacentElement('afterend', warningElement);
      } else if (!isCapsLockOn && warningElement) {
        warningElement.remove();
        warningElement = null;
      }
    });

    input.addEventListener('blur', () => {
      if (warningElement) {
        warningElement.remove();
        warningElement = null;
      }
    });
  });
}
window.initCapsLockWarning = initCapsLockWarning;

// ---------------------------
//  Forgot password
// ---------------------------
async function handleForgotPassword() {
  const email = document.getElementById('email')?.value?.trim();
  if (!email) {
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('Írd be az e-mail címed a jelszó visszaállításához.', 'info');
    }
    return;
  }
  try {
    await firebase.auth().sendPasswordResetEmail(email);
    if (typeof showCustomAlert === 'function') showCustomAlert('📧 Visszaállító e-mail elküldve.', 'info');
  } catch (e) {
    console.error('Reset error:', e);
    if (typeof showCustomAlert === 'function') showCustomAlert('Nem sikerült a visszaállítás.', 'info');
  }
}

// ---------------------------
//  Auth képernyő inicializálása
// ---------------------------
function initAuthScreen() {
  // Email login form (submit)
  const loginForm = document.querySelector('#login-view form');
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleEmailLoginSubmit();
  });

  // Google gomb
  const googleBtn = document.getElementById('login-button-google');
  googleBtn?.addEventListener('click', signInWithGoogle);

  // Register nézet megjelenítése
  const showReg = document.getElementById('show-register-view');
  const showLog = document.getElementById('show-login-view');
  const loginView = document.getElementById('login-view');
  const registerView = document.getElementById('register-view');

  showReg?.addEventListener('click', (e) => {
    e.preventDefault();
    loginView?.classList.add('hidden');
    registerView?.classList.remove('hidden');
  });

  showLog?.addEventListener('click', (e) => {
    e.preventDefault();
    registerView?.classList.add('hidden');
    loginView?.classList.remove('hidden');
  });

  // Regisztráció form
  const regForm = document.querySelector('#register-view form');
  regForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleEmailRegistrationSubmit();
  });

  // Forgot password
  const forgot = document.getElementById('forgot-password-link');
  forgot?.addEventListener('click', (e) => {
    e.preventDefault();
    handleForgotPassword();
  });

  // Vendég mód
  const guestBtn = document.getElementById('guest-mode-button');
  guestBtn?.addEventListener('click', () => {
    localStorage.setItem('isGuestMode', 'true');
    if (typeof showCustomAlert === 'function') {
      showCustomAlert('Vendég mód aktiválva. Funkciók korlátozva.', 'info');
    }
  });

  // Mentett email visszatöltése (ha van)
  const rememberedEmail = localStorage.getItem('rememberedEmail');
  if (rememberedEmail) {
    const emailInput = document.getElementById('email');
    const rememberCheckbox = document.getElementById('remember-me');
    if (emailInput) emailInput.value = rememberedEmail;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  // Realtime kiegészítők
  if (typeof initEmailValidation === 'function') initEmailValidation();
  if (typeof initCapsLockWarning === 'function') initCapsLockWarning();

  // Auth állapot figyelése (külső modulban implementált handlerrel)
  if (firebase?.auth) {
    firebase.auth().onAuthStateChanged(function (user) {
      if (typeof handleAuthStateChange === 'function') {
        handleAuthStateChange(user);
      }
    });
  }
}

// Globális exportok
window.handleEmailLoginSubmit = handleEmailLoginSubmit;
window.handleEmailRegistrationSubmit = handleEmailRegistrationSubmit;
window.signInWithGoogle = signInWithGoogle;
window.togglePasswordVisibility = togglePasswordVisibility;
window.initAuthScreen = initAuthScreen;
