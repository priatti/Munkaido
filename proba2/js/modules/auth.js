// Authentication Module v9.00
class AuthManager {
    constructor() {
        this.auth = firebase.auth();
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const loginButton = domUtils.getElement('login-button');
        const logoutButton = domUtils.getElement('logout-button');

        if (loginButton) {
            loginButton.addEventListener('click', () => this.login());
        }

        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.logout());
        }
    }

    async login() {
        const loginButton = domUtils.getElement('login-button');
        if (!loginButton) return;

        const originalButtonContent = loginButton.innerHTML;
        loginButton.disabled = true;
        loginButton.innerHTML = '...';

        const provider = new firebase.auth.GoogleAuthProvider();
        
        try {
            await this.auth.signInWithPopup(provider);
        } catch (error) {
            this.handleLoginError(error);
        } finally {
            loginButton.disabled = false;
            loginButton.innerHTML = originalButtonContent;
        }
    }

    async logout() {
        try {
            await this.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    handleLoginError(error) {
        let errorMessage = window.i18n.translate('alertLoginError');
        
        switch(error.code) {
            case 'auth/popup-closed-by-user':
                errorMessage = window.i18n.translate('alertPopupClosed');
                break;
            case 'auth/popup-blocked':
                errorMessage = window.i18n.translate('alertPopupBlocked');
                break;
        }
        
        console.error('Login error:', error);
        window.uiManager.showAlert(errorMessage, 'info');
    }

    updateAuthUI(user) {
        const loggedInView = domUtils.getElement('logged-in-view');
        const loggedOutView = domUtils.getElement('logged-out-view');
        const userNameEl = domUtils.getElement('user-name');

        if (!loggedInView || !loggedOutView || !userNameEl) return;

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

    getCurrentUser() {
        return this.auth.currentUser;
    }

    isLoggedIn() {
        return !!this.getCurrentUser();
    }

    onAuthStateChange(callback) {
        return this.auth.onAuthStateChanged(callback);
    }
}

// Initialize auth manager
window.authManager = new AuthManager();

// Update UI when auth state changes
window.authManager.onAuthStateChange((user) => {
    window.authManager.updateAuthUI(user);
});
