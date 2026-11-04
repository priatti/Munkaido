// === PWA Telepítési Gomb Logika ===
let deferredPrompt;

function initializePwaInstall() {
    const installContainer = document.getElementById('pwa-install-container');
    const installButton = document.getElementById('install-pwa-button');
    const checkUpdateButton = document.getElementById('check-update-button');

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

    // Kézi frissítés-ellenőrzés gomb
    if (checkUpdateButton && 'serviceWorker' in navigator) {
        checkUpdateButton.addEventListener('click', () => forceCheckForUpdate());
    }
    // Telepítés utáni esemény – lokális elemek elérése biztonságosan
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        try {
            const container = document.getElementById('pwa-install-container');
            if (container) { container.classList.add('hidden'); }
        } catch(_) {}
        try {
            const i18n = (typeof translations !== 'undefined' && translations[(window.currentLang||'hu')]) || {
                pwaInstalledTitle: 'Telepítés sikeres!',
                pwaInstalledBody: 'Az alkalmazást a Kezdőképernyőn találod GuriGO néven.',
                pwaOpenButton: 'Megnyitás'
            };
            if (typeof showCustomAlert === 'function') {
                showCustomAlert(i18n.pwaInstalledBody, 'success', null, { okText: i18n.pwaOpenButton });
            } else {
                alert(i18n.pwaInstalledTitle + '\n' + i18n.pwaInstalledBody);
            }
        } catch (_) {}
        console.log('PWA was installed');
    });
}

// === SW Update Notification ===
function initializeSwUpdateNotifications() {
    // Silent background update check (PWA only, no aggressive reload)
    if (!('serviceWorker' in navigator)) return;
    
    const isStandalone = (window.navigator.standalone === true) || 
                         (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    
    if (isStandalone) {
        // PWA mode: silent update check in background
        setTimeout(async () => {
            try {
                const reg = await navigator.serviceWorker.getRegistration();
                if (reg) {
                    console.log('[PWA] Silent SW update check...');
                    await reg.update();
                    
                    // If update found, notify user (no auto-reload!)
                    if (reg.waiting) {
                        console.log('[PWA] New version available');
                        const i18n = (typeof translations !== 'undefined' && translations[(window.currentLang||'hu')]) || {};
                        const msg = i18n.pwaNewVersionAvailableBody || 'Új verzió elérhető! Zárd be és nyisd meg újra az appot a frissítéshez.';
                        if (typeof showCustomAlert === 'function') {
                            showCustomAlert(msg, 'info');
                        }
                    }
                }
            } catch (err) {
                console.warn('[PWA] Update check failed:', err);
            }
        }, 2000); // 2 sec késleltetés hogy az app betöltődjön
    }
}

if (typeof window !== 'undefined') {
    window.initializeSwUpdateNotifications = initializeSwUpdateNotifications;
}

// === MANUAL SW UPDATE CHECK ===
async function forceCheckForUpdate() {
    const i18n = (typeof translations !== 'undefined' && translations[(window.currentLang||'hu')]) || {};
    if (!('serviceWorker' in navigator)) {
        try { showCustomAlert?.(i18n.pwaDeviceNoUpdate || 'A készülék nem támogatja a frissítést.', 'info'); } catch(_) {}
        return;
    }
    try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) { showCustomAlert?.(i18n.pwaNoServiceWorker || 'Nincs telepített Service Worker.', 'info'); return; }
        // Indítsuk a frissítés keresését
        try { await reg.update(); } catch(_) {}

        const notify = (title, body, type='info') => {
            if (typeof showToast === 'function') showToast(title, body, type, { position: 'top-right', duration: 4200 });
            else if (typeof showCustomAlert === 'function') showCustomAlert(title + (body? ('\n'+body):''), type);
            else alert(title + (body? ('\n'+body):''));
        };

        // Ha már van waiting, azonnal aktiváljuk
        if (reg.waiting) {
            try { reg.waiting.postMessage('SKIP_WAITING'); } catch(_) {}
            navigator.serviceWorker.addEventListener('controllerchange', () => { try { location.reload(); } catch(_) {} }, { once: true });
            notify(i18n.pwaUpdateAvailableTitle || 'Frissítés elérhető', i18n.pwaUpdateReload || 'Frissítés folyamatban...', 'success');
            return;
        }

        // Ha települőben van, várjuk meg, majd aktiváljuk
        if (reg.installing) {
            const sw = reg.installing;
            sw.addEventListener('statechange', () => {
                if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                    try { sw.postMessage('SKIP_WAITING'); } catch(_) {}
                }
            });
            navigator.serviceWorker.addEventListener('controllerchange', () => { try { location.reload(); } catch(_) {} }, { once: true });
            notify(i18n.pwaUpdateInstallingTitle || 'Frissítés telepítése', i18n.pwaUpdateInstallingBody || 'Kis türelmet...', 'info');
            return;
        }

        // Rövid késleltetés után ismét ellenőrzés, hátha most jött meg az update
        setTimeout(async () => {
            const latest = await navigator.serviceWorker.getRegistration();
            if (latest && latest.waiting) {
                try { latest.waiting.postMessage('SKIP_WAITING'); } catch(_) {}
                navigator.serviceWorker.addEventListener('controllerchange', () => { try { location.reload(); } catch(_) {} }, { once: true });
                notify(
                    i18n.pwaUpdateAvailableTitle || 'Frissítés elérhető',
                    i18n.pwaUpdateReload || 'Frissítés folyamatban...',
                    'success'
                );
            } else {
                notify(
                    i18n.pwaNoUpdateTitle || 'Nincs új frissítés',
                    i18n.pwaNoUpdateBody || 'A legfrissebb verziót használod.'
                );
            }
        }, 800);

    } catch (e) {
        console.error('[PWA] forceCheckForUpdate error:', e);
        try {
            const prefix = i18n.pwaUpdateErrorPrefix || 'Hiba történt:';
            const message = (e && e.message) ? ` ${e.message}` : '';
            showCustomAlert?.(prefix + message, 'info');
        } catch(_) {}
    }
}

if (typeof window !== 'undefined') {
    window.forceCheckForUpdate = forceCheckForUpdate;
}
