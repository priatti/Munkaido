// js/ui.js

// KIVETTEM AZ IMPORTOT A MAIN.JS-BŐL, MEGSZÜNTETVE A KÖRKÖRÖS HIVATKOZÁST
// import { translations, currentLang } from './main.js'; 

// A FUNKCIÓK MOST MÁR PARAMÉTERKÉNT KAPJÁK MEG A SZÜKSÉGES ADATOKAT

export function setLanguage(lang) {
    if (['hu', 'de'].includes(lang)) {
        localStorage.setItem('language', lang);
        window.location.reload(); 
    }
}

export function updateAllTexts(i18n, currentLang) {
    if (!i18n) return; 

    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.dataset.translateKey;
        const translation = i18n[key];
        
        if (translation !== undefined) {
            if (el.placeholder) {
                el.placeholder = translation;
            } else if (el.title && (el.tagName === 'BUTTON' || el.tagName === 'A')) {
                el.title = translation;
            } else {
                el.textContent = translation;
            }
        }
    });

    document.title = i18n.appTitle || "Munkaidő Nyilvántartó Pro";
    updateLanguageButtonStyles(currentLang);
    
    const compensationSectionDe = document.getElementById('compensation-section-de');
    if(compensationSectionDe) {
        compensationSectionDe.style.display = currentLang === 'de' ? 'none' : 'block';
    }
    const compensationToggle = document.getElementById('toggleCompensation');
    if(compensationToggle && compensationToggle.parentElement && compensationToggle.parentElement.parentElement) {
        compensationToggle.parentElement.parentElement.style.display = currentLang === 'de' ? 'none' : 'flex';
    }
}

function updateLanguageButtonStyles(currentLang) {
    const selector = document.getElementById('languageSelector');
    if (selector) {
        const buttons = selector.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.classList.remove('bg-blue-100', 'border-blue-500', 'font-bold');
            if ((currentLang === 'hu' && btn.innerText.includes('Magyar')) || (currentLang === 'de' && btn.innerText.includes('Deutsch'))) {
                btn.classList.add('bg-blue-100', 'border-blue-500', 'font-bold');
            }
        });
    }
}

export function applyTheme(theme) { 
    if (theme === 'dark') { 
        document.documentElement.classList.add('dark'); 
    } else if (theme === 'light') { 
        document.documentElement.classList.remove('dark'); 
    } else { 
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) { 
            document.documentElement.classList.add('dark'); 
        } else { 
            document.documentElement.classList.remove('dark'); 
        } 
    } 
}

export function setTheme(theme) { 
    applyTheme(theme); 
    localStorage.setItem('theme', theme); 
}

export function initTheme() { 
    const savedTheme = localStorage.getItem('theme') || 'auto'; 
    applyTheme(savedTheme); 
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { 
        if(localStorage.getItem('theme') === 'auto') { 
            applyTheme('auto'); 
        } 
    }); 
}

export function toggleDropdown() { 
    document.getElementById('dropdown-menu').classList.toggle('hidden'); 
}

export function closeDropdown() { 
    document.getElementById('dropdown-menu').classList.add('hidden'); 
}

let alertCallback = null;
export function showCustomAlert(i18n, message, type, callback) { 
    const overlay = document.getElementById('custom-alert-overlay'); 
    const box = document.getElementById('custom-alert-box'); 
    const iconContainer = document.getElementById('custom-alert-icon'); 
    const messageEl = document.getElementById('custom-alert-message'); 
    const buttonsContainer = document.getElementById('custom-alert-buttons'); 
    messageEl.textContent = message; 
    alertCallback = callback || null; 
    iconContainer.className = 'w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center'; 
    buttonsContainer.innerHTML = ''; 
    const warningIcon = `<svg class="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`; 
    if (type === 'warning') { 
        iconContainer.classList.add('bg-yellow-100'); 
        iconContainer.innerHTML = warningIcon; 
        buttonsContainer.innerHTML = `<button onclick="window.app.hideCustomAlert(false)" class="py-2 px-6 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">${i18n.cancel}</button><button onclick="window.app.hideCustomAlert(true)" class="py-2 px-6 bg-yellow-400 text-white rounded-lg font-semibold hover:bg-yellow-500">${i18n.save}</button>`; 
    } else if (type === 'info') { 
        iconContainer.classList.add('bg-yellow-100'); 
        iconContainer.innerHTML = warningIcon; 
        buttonsContainer.innerHTML = `<button onclick="window.app.hideCustomAlert(true)" class="py-2 w-2/3 bg-yellow-400 text-white rounded-lg font-semibold hover:bg-yellow-500">${i18n.ok}</button>`; 
    } else if (type === 'success') { 
        iconContainer.classList.add('bg-green-100', 'success-icon'); 
        iconContainer.innerHTML = `<svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path class="checkmark-path" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`; 
        buttonsContainer.innerHTML = `<button onclick="window.app.hideCustomAlert(true)" class="py-2 w-2/3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600">${i18n.ok}</button>`; 
    } 
    overlay.classList.remove('hidden'); 
    overlay.classList.add('flex'); 
    setTimeout(() => { 
        overlay.classList.remove('opacity-0'); 
        box.classList.remove('scale-95'); 
    }, 10); 
}

export function hideCustomAlert(isConfirmed) { 
    const overlay = document.getElementById('custom-alert-overlay'); 
    const box = document.getElementById('custom-alert-box'); 
    overlay.classList.add('opacity-0'); 
    box.classList.add('scale-95'); 
    setTimeout(() => { 
        overlay.classList.add('hidden'); 
        overlay.classList.remove('flex'); 
        if (isConfirmed && alertCallback) { 
            alertCallback(); 
        } 
        alertCallback = null; 
    }, 300); 
}

export function updateToggleVisuals(checkbox) {
    const label = checkbox.closest('label');
    if (!label) return;
    const checkmark = label.querySelector('.toggle-checkmark');

    const onClasses = ['bg-green-100', 'dark:bg-green-800/50', 'font-semibold'];
    const offClasses = ['hover:bg-gray-200', 'dark:hover:bg-gray-700'];

    label.classList.remove(...onClasses, ...offClasses);

    if (checkbox.checked) {
        label.classList.add(...onClasses);
        if (checkmark) checkmark.classList.remove('hidden');
    } else {
        label.classList.add(...offClasses);
        if (checkmark) checkmark.classList.add('hidden');
    }
}
