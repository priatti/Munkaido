// Bottom Navigation kezelése
class BottomNavigation {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.handleMoreMenu();
    }

    setupEventListeners() {
        // Fő navigációs elemek
        document.querySelectorAll('.nav-item:not(.more-button)').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = item.getAttribute('data-tab');
                this.switchTab(tab);
                this.setActiveNavItem(item);
            });
        });

        // More menü elemek
        document.querySelectorAll('.more-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = item.getAttribute('data-tab');
                this.switchTab(tab);
                this.hideMoreMenu();
                this.clearActiveNavItems();
            });
        });
    }

    handleMoreMenu() {
        const moreButton = document.querySelector('.more-button');
        const moreMenu = document.getElementById('moreMenu');
        const overlay = document.getElementById('overlay');
        const closeButton = document.getElementById('closeMoreMenu');

        moreButton?.addEventListener('click', () => this.toggleMoreMenu());
        closeButton?.addEventListener('click', () => this.hideMoreMenu());
        overlay?.addEventListener('click', () => this.hideMoreMenu());

        // ESC key support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideMoreMenu();
        });
    }

    switchTab(tabName) {
        // Használd a meglévő showTab függvényt
        if (typeof showTab === 'function') {
            showTab(tabName);
        }
    }

    setActiveNavItem(activeItem) {
        document.querySelectorAll('.nav-item:not(.more-button)').forEach(item => {
            item.classList.remove('active');
        });
        activeItem.classList.add('active');
    }

    clearActiveNavItems() {
        document.querySelectorAll('.nav-item:not(.more-button)').forEach(item => {
            item.classList.remove('active');
        });
    }

    toggleMoreMenu() {
        const moreMenu = document.getElementById('moreMenu');
        const overlay = document.getElementById('overlay');

        if (moreMenu.classList.contains('show')) {
            this.hideMoreMenu();
        } else {
            this.showMoreMenu();
        }
    }

    showMoreMenu() {
        const moreMenu = document.getElementById('moreMenu');
        const overlay = document.getElementById('overlay');

        moreMenu.classList.add('show');
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }

    hideMoreMenu() {
        const moreMenu = document.getElementById('moreMenu');
        const overlay = document.getElementById('overlay');

        moreMenu.classList.remove('show');
        overlay.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Inicializálás
document.addEventListener('DOMContentLoaded', () => {
    new BottomNavigation();
});