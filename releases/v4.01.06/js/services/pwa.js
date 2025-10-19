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

// === SW Update Notification ===
function initializeSwUpdateNotifications() {
    if (!('serviceWorker' in navigator)) return;
    const ensureBanner = () => {
        let el = document.getElementById('pwa-update-banner');
        if (el) return el;
        el = document.createElement('div');
        el.id = 'pwa-update-banner';
        el.className = 'update-notification hidden';
        try {
            const i18n = (typeof translations !== 'undefined' && translations[(window.currentLang||'hu')]) || { pwaUpdateAvailable: 'Új verzió érhető el.', pwaUpdateReload: 'Frissítés' };
            el.innerHTML = '<p>'+ (i18n.pwaUpdateAvailable || 'Új verzió érhető el.') +'</p><button id="pwa-update-reload">'+ (i18n.pwaUpdateReload || 'Frissítés') +'</button>';
        } catch(_) {
            el.innerHTML = '<p>Új verzió érhető el.</p><button id="pwa-update-reload">Frissítés</button>';
        }
        document.body.appendChild(el);
        return el;
    };
    const showBanner = (reg) => {
        const banner = ensureBanner();
        banner.classList.remove('hidden');
        const btn = document.getElementById('pwa-update-reload');
        if (btn) {
            btn.onclick = () => {
                const waiting = reg.waiting || reg.installing;
                if (waiting) waiting.postMessage('SKIP_WAITING');
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    window.location.reload();
                }, { once: true });
            };
        }
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        reg.addEventListener('updatefound', () => {
            const sw = reg.installing;
            if (!sw) return;
            sw.addEventListener('statechange', () => {
                if (sw.state === 'installed' && navigator.serviceWorker.controller) {
                    showBanner(reg);
                }
            });
        });
        // Ha már van waiting worker (pl. háttérben frissült), mutassuk a bannert
        if (reg.waiting && navigator.serviceWorker.controller) {
            showBanner(reg);
        }
        // Időnkénti ellenőrzés: láthatóra váltáskor frissítés keresése
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') { try { reg.update(); } catch(_) {} }
        });
    }).catch(() => {});
}

if (typeof window !== 'undefined') {
    window.initializeSwUpdateNotifications = initializeSwUpdateNotifications;
}

// === MANUAL SW UPDATE CHECK ===
async function forceCheckForUpdate() {
    if (!('serviceWorker' in navigator)) {
        try { showCustomAlert?.('A készülék nem támogatja a frissítést.', 'info'); } catch(_) {}
        return;
    }
    try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) { showCustomAlert?.('Nincs telepített Service Worker.', 'info'); return; }
        // Indítsuk a frissítés keresését
        try { await reg.update(); } catch(_) {}

        const i18n = (typeof translations !== 'undefined' && translations[(window.currentLang||'hu')]) || {};
        const notify = (title, body, type='info') => {
            if (typeof showToast === 'function') showToast(title, body, type, { position: 'top-right', duration: 4200 });
            else if (typeof showCustomAlert === 'function') showCustomAlert(title + (body? ('\n'+body):''), type);
            else alert(title + (body? ('\n'+body):''));
        };

        // Ha már van waiting, azonnal aktiváljuk
        if (reg.waiting) {
            try { reg.waiting.postMessage('SKIP_WAITING'); } catch(_) {}
            navigator.serviceWorker.addEventListener('controllerchange', () => { try { location.reload(); } catch(_) {} }, { once: true });
            notify('Frissítés elérhető', i18n.pwaUpdateReload || 'Frissítés folyamatban...', 'success');
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
            notify('Frissítés telepítése', 'Kis türelmet...', 'info');
            return;
        }

        // Rövid késleltetés után ismét ellenőrzés, hátha most jött meg az update
        setTimeout(async () => {
            const latest = await navigator.serviceWorker.getRegistration();
            if (latest && latest.waiting) {
                try { latest.waiting.postMessage('SKIP_WAITING'); } catch(_) {}
                navigator.serviceWorker.addEventListener('controllerchange', () => { try { location.reload(); } catch(_) {} }, { once: true });
                notify('Frissítés elérhető', i18n.pwaUpdateReload || 'Frissítés folyamatban...', 'success');
            } else {
                notify('Nincs új frissítés', 'A legfrissebb verziót használod.');
            }
        }, 800);

    } catch (e) {
        console.error('[PWA] forceCheckForUpdate error:', e);
        try { showCustomAlert?.('Hiba történt: ' + e.message, 'info'); } catch(_) {}
    }
}

if (typeof window !== 'undefined') {
    window.forceCheckForUpdate = forceCheckForUpdate;
}

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        if (installContainer) {
            installContainer.classList.add('hidden');
        }
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
