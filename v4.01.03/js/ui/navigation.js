// =======================================================
// ===== BOTTOM NAVIGATION HANDLER (navigation.js) ======
// =======================================================
(function() {
    'use strict';

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
                
                // Tab váltás
                if (typeof showTab === 'function') {
                    showTab(targetTab);
                } else {
                    console.error('[Navigation] showTab function not found!');
                }
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
                console.log('[Navigation] Opening more menu');
                moreMenu.classList.add('show');
                if (overlay) overlay.classList.add('show');
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
                if (typeof showTab === 'function') {
                    showTab(targetTab);
                }
                closeMoreMenu();
            });
        });

        console.log('[Navigation] Bottom navigation initialized successfully');
    }

    function closeMoreMenu() {
        const moreMenu = document.getElementById('moreMenu');
        const overlay = document.getElementById('overlay');
        if (moreMenu) moreMenu.classList.remove('show');
        if (overlay) overlay.classList.remove('show');
    }

    // Inicializálás amikor a DOM betöltődött
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBottomNavigation);
    } else {
        // Ha már betöltődött, azonnal futtatjuk
        initBottomNavigation();
    }

    // Globális függvény export
    window.closeMoreMenu = closeMoreMenu;
    window.initBottomNavigation = initBottomNavigation;
})();