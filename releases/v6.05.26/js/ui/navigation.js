// =======================================================
// ===== BOTTOM NAVIGATION HANDLER (navigation.js) ======
// =======================================================
(function() {
    'use strict';

    function showTabStub(tabName) {
        var impl = window.__gurigoShowTabImpl;
        if (typeof impl === 'function') {
            return impl(tabName);
        }
        console.error('[Navigation] showTab not available yet:', tabName);
    }

    function invokeShowTab(targetTab) {
        if (!targetTab) return;
        closeMoreMenu();
        var fn = window.__gurigoShowTabImpl;
        if (typeof fn !== 'function') {
            fn = window.showTab;
        }
        if (typeof fn !== 'function') {
            console.error('[Navigation] showTab function not found!');
            return;
        }
        try {
            fn(targetTab);
        } catch (err) {
            console.error('[Navigation] showTab error:', targetTab, err);
        }
    }

    if (typeof window.showTab !== 'function') {
        window.showTab = showTabStub;
    }
    if (typeof window.navigateToTab !== 'function') {
        window.navigateToTab = window.showTab;
    }

    function initGotoTabDelegation() {
        document.addEventListener('click', function(e) {
            var el = e.target && e.target.closest ? e.target.closest('[data-goto-tab]') : null;
            if (!el) return;
            var tab = el.getAttribute('data-goto-tab');
            if (!tab) return;
            e.preventDefault();
            invokeShowTab(tab);
        });
    }

    function isAppShellChromeActive() {
        var body = document.body;
        if (!body) return false;
        if (body.classList.contains('gurigo-logged-out') || body.classList.contains('gurigo-auth-boot')) {
            return false;
        }
        if (!body.classList.contains('gurigo-app-shell-active')) return false;
        var app = document.getElementById('app');
        return !!(app && !app.classList.contains('hidden'));
    }

    function openMoreMenu() {
        if (!isAppShellChromeActive()) {
            console.warn('[Navigation] More menu blocked (not in authenticated app shell)');
            closeMoreMenu();
            return;
        }
        const moreMenu = document.getElementById('moreMenu');
        const overlay = document.getElementById('overlay');
        if (!moreMenu) return;
        console.log('[Navigation] Opening more menu');
        moreMenu.classList.add('show');
        if (overlay) overlay.classList.add('show');
    }

    function closeMoreMenu() {
        const moreMenu = document.getElementById('moreMenu');
        const overlay = document.getElementById('overlay');
        if (moreMenu) moreMenu.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
    }

    function initBottomNavigation() {
        console.log('[Navigation] Initializing bottom navigation...');
        
        // Összes nav-item gomb kezelése
        document.querySelectorAll('.nav-item[data-tab]').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const targetTab = this.getAttribute('data-tab');
                
                if (!targetTab) {
                    console.warn('[Navigation] Nav item without data-tab:', this);
                    return;
                }
                
                console.log('[Navigation] Clicked:', targetTab);
                
                // Active állapot beállítása
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                this.classList.add('active');
                
                invokeShowTab(targetTab);
            });
        });

        // "Továbbiak" (more) menü kezelése
        const moreButton = document.querySelector('.nav-item.more-button');
        const moreMenu = document.getElementById('moreMenu');
        const closeMoreBtn = document.getElementById('closeMoreMenu');
        const overlay = document.getElementById('overlay');

        if (moreButton && moreMenu) {
            moreButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (moreMenu.classList.contains('show')) {
                    console.log('[Navigation] Toggling more menu closed');
                    closeMoreMenu();
                    return;
                }
                openMoreMenu();
            });
        }

        if (closeMoreBtn) {
            closeMoreBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('[Navigation] Closing more menu');
                closeMoreMenu();
            });
        }

        if (overlay) {
            overlay.addEventListener('click', function() {
                console.log('[Navigation] Overlay clicked, closing menu');
                closeMoreMenu();
            });
        }

        // More menü elemek kezelése
        document.querySelectorAll('.more-menu-item[data-tab]').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const targetTab = this.getAttribute('data-tab');
                console.log('[Navigation] More menu item clicked:', targetTab);
                invokeShowTab(targetTab);
                closeMoreMenu();
            });
        });

        // Frissítsük az aktív műszak vizuális jelzését
        updateActiveShiftIndicator();

        console.log('[Navigation] Bottom navigation initialized successfully');
    }

    // Aktív műszak jelző frissítése az Indítás/Zárás gombon
    function updateActiveShiftIndicator() {
        try {
            const btn = document.querySelector('.nav-item[data-tab="start"]');
            if (!btn) return;
            const hasActive = !!(window.activeShift && window.activeShift.startTime);
            if (hasActive) {
                // Kicsit sötétebb zöld kiemelés
                btn.style.backgroundColor = '#dcfce7'; // green-100
                btn.style.border = '1px solid #86efac'; // green-300
            } else {
                btn.style.backgroundColor = '';
                btn.style.border = '';
            }
        } catch(_) {}
    }

    initGotoTabDelegation();

    // Inicializálás amikor a DOM betöltődött
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBottomNavigation);
    } else {
        initBottomNavigation();
    }

    // Globális függvény export
    window.closeMoreMenu = closeMoreMenu;
    window.openMoreMenu = openMoreMenu;
    window.initBottomNavigation = initBottomNavigation;
    window.updateActiveShiftIndicator = updateActiveShiftIndicator;
})();
