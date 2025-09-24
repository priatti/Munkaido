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
