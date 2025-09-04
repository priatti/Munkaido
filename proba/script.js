/* --- Firebase init --- */
const firebaseConfig = {
  apiKey: "AIzaSyDGgG3y0ppl4639bzjzKA7Yq8BmSkhR-LU",
  authDomain: "munkaido-3cc44.firebaseapp.com",
  projectId: "munkaido-3cc44",
  storageBucket: "munkaido-3cc44.appspot.com",
  messagingSenderId: "706081294435",
  appId: "1:706081294435:web:c8ae57cbe45477de415056"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

let currentUser = null;
let currentLang = localStorage.getItem('lang') || 'hu';
let records = [];

/* --- Fordítások --- */
const translations = {
  hu: {
    appTitle: "Munkaidő Nyilvántartó Pro",
    loginWithGoogle: "Bejelentkezés Google-lel",
    logout: "Kijelentkezés",
    startDay: "Munkanap indítása",
    endDay: "Munkanap lezárása",
    odometerStart: "Km-óra induláskor",
    odometerEnd: "Km-óra érkezéskor",
    drivingStart: "Vezetési idő a nap elején",
    drivingEnd: "Vezetési idő a nap végén",
    calcDriving: "Számol",
    summary: "Áttekintés",
    startTime: "Kezdés",
    endTime: "Vége",
    totalDriving: "Vezetési idő",
    start: "START",
    stop: "STOP",
    dataTitle: "Adatok",
    export: "Export",
    import: "Import",
    copy: "Másol",
    history: "Előzmények",
    settingsVersion: "Verzió:",
    autoExport: "Automatikus mentés",
    never: "Soha",
    daily: "Naponta",
    weekly: "Hetente",
    alertChooseFile: "Válassz ki egy JSON fájlt!",
    alertConfirmImport: "Biztosan beimportálod? A meglévő adatok felülíródnak.",
    alertImportSuccess: "Sikeres import.",
    alertImportError: "Import hiba"
  },
  de: {
    appTitle: "Arbeitszeiterfassung Pro",
    loginWithGoogle: "Mit Google anmelden",
    logout: "Abmelden",
    startDay: "Arbeitstag starten",
    endDay: "Arbeitstag beenden",
    odometerStart: "Kilometerstand (Start)",
    odometerEnd: "Kilometerstand (Ende)",
    drivingStart: "Fahrzeit (Tagesbeginn)",
    drivingEnd: "Fahrzeit (Tagesende)",
    calcDriving: "Berechnen",
    summary: "Übersicht",
    startTime: "Start",
    endTime: "Ende",
    totalDriving: "Fahrzeit",
    start: "START",
    stop: "STOPP",
    dataTitle: "Daten",
    export: "Export",
    import: "Import",
    copy: "Kopieren",
    history: "Verlauf",
    settingsVersion: "Version:",
    autoExport: "Automatische Sicherung",
    never: "Nie",
    daily: "Täglich",
    weekly: "Wöchentlich",
    alertChooseFile: "Wähle eine JSON-Datei!",
    alertConfirmImport: "Wirklich importieren? Bestehende Daten werden überschrieben.",
    alertImportSuccess: "Import erfolgreich.",
    alertImportError: "Importfehler"
  }
};

/* --- UI szövegek frissítése --- */
function updateAllTexts(){
  const dict = translations[currentLang];
  document.querySelectorAll('[data-translate-key]').forEach(el=>{
    const k = el.getAttribute('data-translate-key');
    if (dict[k]) el.textContent = dict[k];
  });
  document.documentElement.lang = currentLang;
  document.title = translations[currentLang].appTitle;
}

/* --- Riasztás --- */
function showCustomAlert(msg,type='info'){
  const wrap = document.getElementById('alertContainer'); if(!wrap) return;
  const el=document.createElement('div'); el.className=`alert ${type}`; el.textContent=msg;
  wrap.appendChild(el); setTimeout(()=>el.remove(),3000);
}

/* ====== SZINTAXIS FIX: importData() ====== */
function importData() {
  const i18n = translations[currentLang];
  const fileInput = document.getElementById('importFile');
  if (!fileInput || !fileInput.files || !fileInput.files.length) {
    showCustomAlert(i18n.alertChooseFile, 'info'); return;
  }
  if (!confirm(i18n.alertConfirmImport)) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        records = imported;
        if (currentUser) {
          migrateLocalToFirestore(records, 'records');
        } else {
          localStorage.setItem('workRecords', JSON.stringify(records));
        }
        renderApp();
        showCustomAlert(i18n.alertImportSuccess, 'success');
      } else {
        throw new Error('Hibás fájlformátum.');
      }
    } catch (err) {
      console.error('Import hiba:', err);
      showCustomAlert(`${i18n.alertImportError}: ${err.message}`, 'info');
    }
  };
  reader.readAsText(fileInput.files[0]);
}

/* --- DOM Ready --- */
document.addEventListener('DOMContentLoaded', ()=>{
  updateAllTexts();

  const langSel=document.getElementById('languageSelector');
  if (langSel){ langSel.value=currentLang; langSel.addEventListener('change',e=>{
    currentLang=e.target.value; localStorage.setItem('lang',currentLang); updateAllTexts();
  });}

  const expBtn=document.getElementById('exportBtn');
  if (expBtn) expBtn.addEventListener('click', ()=>{
    const blob=new Blob([JSON.stringify(records,null,2)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    a.download='munkaido-export.json'; a.click(); URL.revokeObjectURL(a.href);
  });

  const fileInput=document.getElementById('importFile');
  if (fileInput) fileInput.addEventListener('change', importData);
});

/* --- Auth állapot figyelés --- */
auth.onAuthStateChanged(async (user)=>{
  currentUser=user||null;
  const content=document.getElementById('appContent');
  const logoutBtn=document.getElementById('logoutBtn');
  const loginBtn=document.getElementById('googleLoginBtn');
  const emailLbl=document.getElementById('userEmailDisplay');

  if (user){
    if (content) content.style.display='';
    if (logoutBtn) logoutBtn.style.display='';
    if (loginBtn) loginBtn.style.display='none';
    if (emailLbl) emailLbl.textContent=user.email||'';
    // ide jöhet a Firestore betöltés
    window.appReady(); // splash elrejtése
  } else {
    if (content) content.style.display='none';
    if (logoutBtn) logoutBtn.style.display='none';
    if (loginBtn) loginBtn.style.display='';
    if (emailLbl) emailLbl.textContent='';
    window.appReady(); // splash elrejtése akkor is
  }
});

/* --- PWA SW regisztráció --- */
if ('serviceWorker' in navigator){
  window.addEventListener('load', async ()=>{
    try{
      await navigator.serviceWorker.register('sw.js',{scope:'./'});
      console.log('Service Worker regisztrálva.');
    }catch(e){ console.warn('SW regisztráció sikertelen:',e); }
  });
}

/* --- Splash kezelése --- */
(function(){
  const hide=()=>{ const s=document.getElementById('splash-screen');
    if(s && !s.classList.contains('hide')) s.classList.add('hide'); };
  window.addEventListener('load', ()=>setTimeout(hide,300));
  window.appReady = hide;
})();
