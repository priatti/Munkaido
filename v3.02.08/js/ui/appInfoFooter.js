(function(){
  function renderFooter(){
    try{
      var lang = (typeof currentLang !== 'undefined') ? currentLang : 'hu';
      var name = (lang === 'de') ? (APP_INFO.authorDe) : (APP_INFO.authorHu);
      var text = (lang === 'de') ? APP_INFO.copyrightDe() : APP_INFO.copyrightHu();
      var ver = APP_INFO.version;
      var el = document.getElementById('app-footer');
      if(!el){
        el = document.createElement('div');
        el.id = 'app-footer';
        el.style.cssText = "margin:24px 0 16px 0;text-align:center;font-size:12px;color:#6b7280;";
        document.body.appendChild(el);
      }
      el.textContent = (document.documentElement.lang === 'de' || lang==='de')
        ? ("Arbeitszeitnachweis Pro v" + ver + " — " + text.replace(APP_INFO.authorDe, name))
        : ("Munkaidő Nyilvántartó Pro v" + ver + " — " + text.replace(APP_INFO.authorHu, name));
    }catch(e){ console.warn(e); }
  }

  document.addEventListener('DOMContentLoaded', renderFooter);
  // Ha van nyelvváltó, próbáljunk reagálni:
  window.addEventListener('language:changed', renderFooter);
})();
