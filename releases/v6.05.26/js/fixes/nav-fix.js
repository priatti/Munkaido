// GuriGO nav-fix: ensure bottom-nav doesn't block clicks and contains the nav items
(function(){
  try {
    // 1) Inject CSS once
    if (!document.getElementById('gurigo-nav-fix-style')) {
      var st = document.createElement('style');
      st.id = 'gurigo-nav-fix-style';
      st.textContent = '.bottom-nav{pointer-events:none;} .bottom-nav a,.bottom-nav button,.bottom-nav .nav-item{pointer-events:auto;}';
      document.head.appendChild(st);
    }
    // 2) If buttons are outside .bottom-nav, move them be inside (best-effort)
    var nav = document.querySelector('.bottom-nav');
    if (nav) {
      var sel = '[data-nav], .nav-item, #btnStart, #btnFullDay, #btnList, #btnMore';
      document.querySelectorAll(sel).forEach(function(el){
        var key = el.getAttribute('data-nav');
        var id = el.id || '';
        if (['overview','start','fullday','list','more'].includes(key) || ['btnStart','btnFullDay','btnList','btnMore'].includes(id)) {
          if (!el.closest('.bottom-nav')) nav.appendChild(el);
        }
      });
    }
  } catch(e) {
    console.error('nav-fix error', e);
  }
})();
