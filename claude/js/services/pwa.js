// === PWA Telepítési Gomb Logika ===
let deferredPrompt;

function initializePwaInstall() {
    const installContainer = document.getElementById('pwa-install-container');
    const installButton = document.getElementById('install-pwa-button');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installContainer) {
            installContainer.classList.remove('hidden');
        }
    });

    if (installButton) {
        installButton.addEventListener('click', async () => {
            if (!deferredPrompt) {
                return;
            }
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User response to the install prompt: ${outcome}`);
            deferredPrompt = null;
            if (installContainer) {
                installContainer.classList.add('hidden');
            }
        });
    }

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        if (installContainer) {
            installContainer.classList.add('hidden');
        }
        console.log('PWA was installed');
    });
}

// === PWA FRISSÍTÉS KEZELÉSE (ÚJ, FELHASZNÁLÓBARÁT VERZIÓ) ===

/**
 * Megjelenít egy szolid értesítést, hogy frissítés történt.
 */
function showUpdateNotification() {
    const existingNotification = document.getElementById('update-notification');
    if (existingNotification) return;

    const notification = document.createElement('div');
    notification.id = 'update-notification';
    notification.className = 'update-notification';

    const message = document.createElement('p');
    message.innerHTML = '✅ Frissítés letöltve! A változások a következő újraindításkor lépnek érvénybe.';
    notification.appendChild(message);

    const okButton = document.createElement('button');
    okButton.textContent = 'OK';

    // Eltávolító függvény, hogy ne ismételjük a kódot
    const removeNotification = () => {
        if (document.getElementById('update-notification')) {
            document.getElementById('update-notification').remove();
        }
        clearTimeout(timeoutId);
    };

    okButton.onclick = removeNotification;
    notification.appendChild(okButton);

    const timeoutId = setTimeout(removeNotification, 10000); // 10 másodperc után eltűnik

    document.body.appendChild(notification);
}

/**
 * Inicializálja a PWA frissítések figyelését.
 */
function initializePwaUpdates() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
            if (!reg) return;

            // Figyeljük, ha egy új service worker települ
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    // Ha az új worker települt és várakozik, értesítjük a felhasználót.
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateNotification();
                    }
                });
            });
        });
    }
}