// proba/js/features/report.js
(function(){
  const $ = (sel) => document.querySelector(sel);
  let currentMonthlyData = null;

  const germanMonths = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const germanFullDays = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

  function fmtHM(mins){ mins=Math.max(0,Math.round(mins||0)); const h=Math.floor(mins/60), m=mins%60; return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }
  function parseHM(str){ if(!str) return 0; const m=String(str).trim().match(/^(\d{1,2})[:h]?(\d{0,2})$/); if(!m) return 0; return parseInt(m[1])*60+(m[2]?parseInt(m[2]):0); }
  function toISODateLoose(s){
    if(!s) return null; s=String(s).trim();
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    let m=s.match(/^(\d{4})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})$/);
    if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    m=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
    if(m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
    return null;
  }

  function looksLikeRecord(r){
    return r && typeof r==='object' &&
           (r.date || r.day || r.key) &&
           (r.startTime || r.start) &&
           (r.endTime || r.end);
  }
  function normalizeRecord(r){
    const date = toISODateLoose(r.date || r.day || r.key) || (r.date || r.day || r.key);
    const startTime = r.startTime || r.start || '';
    const endTime   = r.endTime || r.end || '';
    const workMinutes  = ('workMinutes' in r) ? Number(r.workMinutes) : (('workTime' in r)? parseHM(r.workTime) : 0);
    const nightWorkMinutes = Number(r.nightWorkMinutes || r.night || 0);
    const startLocation = r.startLocation || r.from || r.startLoc || '';
    const endLocation   = r.endLocation || r.to || r.endLoc || '';
    const crossings = Array.isArray(r.crossings) ? r.crossings : (Array.isArray(r.borderCrossings)? r.borderCrossings : []);
    return { id: String(r.id || r.key || Date.now()+Math.random()), date, startTime, endTime, startLocation, endLocation, workMinutes, nightWorkMinutes, crossings };
  }

  // ---- Collectors ----
  async function collectFromWindow(){
    if (Array.isArray(window.records) && window.records.length){
      console.log('[Report] Using window.records:', window.records.length);
      return window.records.map(normalizeRecord);
    }
    const db = window.db || window.database || null;
    if (db){
      for (const fn of ['getAllRecords','getAllDays','getRecords','listAll']){
        if (typeof db[fn] === 'function'){
          try{
            const arr = await db[fn]();
            if (Array.isArray(arr) && arr.length){
              console.log('[Report] Using db.'+fn+':', arr.length);
              return arr.map(normalizeRecord);
            }
          }catch(e){ console.warn('[Report] db.'+fn+' failed:', e); }
        }
      }
    }
    return [];
  }

  function collectFromLocalStorageFlat(){
    try{
      const raw = localStorage.getItem('workRecords');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(looksLikeRecord).map(normalizeRecord) : [];
    }catch(e){ return []; }
  }
  function collectFromLocalStorageDeep(){
    const out = []; const visited = new Set();
    function walk(node){
      if (!node || visited.has(node)) return;
      if (typeof node === 'object') visited.add(node);
      if (looksLikeRecord(node)) { out.push(normalizeRecord(node)); return; }
      if (Array.isArray(node)){ node.forEach(walk); return; }
      if (typeof node === 'object'){
        for (const [k,v] of Object.entries(node)){
          if (/^\d{4}-\d{2}-\d{2}$/.test(k) && v && typeof v==='object'){
            const rec = Object.assign({date:k}, v); if (looksLikeRecord(rec)) out.push(normalizeRecord(rec));
          }
        }
        for (const [k,v] of Object.entries(node)){
          if (/^\d{4}-\d{2}$/.test(k) && v && typeof v==='object'){
            for (const [dk,dv] of Object.entries(v)){
              if (/^\d{2}$/.test(dk) && dv && typeof dv==='object'){
                const rec = Object.assign({date:`${k}-${dk}`}, dv); if (looksLikeRecord(rec)) out.push(normalizeRecord(rec));
              }
            }
          }
        }
        Object.values(node).forEach(walk);
      }
    }
    try{
      for (let i=0;i<localStorage.length;i++){
        const key = localStorage.key(i);
        try{ const raw = localStorage.getItem(key); if(!raw) continue; const val = JSON.parse(raw); walk(val); }catch(_){}
      }
    }catch(e){ console.warn('[Report] localStorage deep scan error:', e); }
    console.log('[Report] localStorage deep found:', out.length);
    return out;
  }

  async function collectFromIndexedDB(){
    const acc = [];
    try{
      if (!('indexedDB' in window)) return acc;
      const names = (indexedDB.databases ? (await indexedDB.databases()).map(d=>d&&d.name).filter(Boolean) : []);
      const guesses = ['MunkaidoDB','workdays-db','worklog','app-db','localforage','keyval-store'];
      guesses.forEach(n => { if (!names.includes(n)) names.push(n); });
      for (const name of names){
        try{
          const db = await new Promise(resolve=>{ let req; try{req=indexedDB.open(name);}catch(e){resolve(null);return;} req.onsuccess=()=>resolve(req.result); req.onerror=()=>resolve(null); });
          if (!db) continue;
          const stores = Array.from(db.objectStoreNames||[]);
          for (const st of stores){
            const rows = await new Promise(res=>{ try{ const tx=db.transaction(st,'readonly'); const os=tx.objectStore(st); const rq=os.getAll(); rq.onsuccess=()=>res(rq.result||[]); rq.onerror=()=>res([]);}catch(e){res([]);} });
            rows.forEach(r=>{ if (looksLikeRecord(r)) acc.push(normalizeRecord(r)); });
          }
          try{ db.close(); }catch(_){}
        }catch(_){}
      }
    }catch(e){ console.warn('[Report] IDB scan failed:', e); }
    console.log('[Report] IDB found:', acc.length);
    return acc;
  }

  async function collectFromFirestore(selectedMonth){
    const out = [];
    try{
      const fb = window.firebase || window._firebase || null;
      if (!fb) { console.log('[Report] Firestore: firebase global not found'); return out; }
      const auth = (typeof fb.auth === 'function') ? fb.auth() : (fb.auth || null);
      let uid = auth && auth.currentUser ? auth.currentUser.uid : null;
      if (!uid && auth && typeof auth.onAuthStateChanged === 'function'){
        await new Promise(res => auth.onAuthStateChanged(u => { uid = u && u.uid; res(); }));
      }
      if (!uid) { console.log('[Report] Firestore: no user'); return out; }
      const fs = (typeof fb.firestore === 'function') ? fb.firestore() : (fb.firestore || null);
      if (!fs || !fs.collection) { console.log('[Report] Firestore: no firestore()'); return out; }

      const paths = [`users/${uid}/records`,`users/${uid}/workdays`,`users/${uid}/days`,`users/${uid}/entries`,`records/${uid}/items`,`workdays/${uid}/items`];
      const [y,m] = selectedMonth.split('-'); const start=`${y}-${m}-01`; const end=`${y}-${m}-31`;

      async function getAllDocs(path){
        try{
          const ref=fs.collection(path); let snap;
          try{ snap=await ref.where('date','>=',start).where('date','<=',end).get(); }
          catch(e){ snap=await ref.get(); }
          const arr=[]; snap.forEach(d=>arr.push({id:d.id,...d.data()})); return arr;
        }catch(e){ console.log('[Report] Firestore read failed for', path, e); return []; }
      }

      for (const p of paths){
        const arr = await getAllDocs(p);
        for (const r of arr){
          if (!r || !r.date) continue;
          if (!String(r.date).startsWith(selectedMonth)) continue;
          out.push(normalizeRecord(r));
        }
        if (out.length){ console.log('[Report] Firestore used path:', p, 'rows:', out.length); break; }
      }
    }catch(e){ console.warn('[Report] Firestore collector error:', e); }
    return out;
  }

  async function collectRecords(selectedMonth){
    // Window / DB facade
    const w = await collectFromWindow(); if (w.length) return w;
    // localStorage (flat + deep)
    const ls = [...collectFromLocalStorageFlat(), ...collectFromLocalStorageDeep()];
    if (ls.length) return ls;
    // IndexedDB
    const idb = await collectFromIndexedDB(); if (idb.length) return idb;
    // Firestore
    const fsd = await collectFromFirestore(selectedMonth); if (fsd.length) return fsd;
    return [];
  }

  // ----- Public API expected by the app -----
  window.initMonthlyReport = function(){
    const inp = $('#monthSelector'); if (inp) inp.value = new Date().toISOString().slice(0,7);
    const cont = $('#monthlyReportContent'); if (cont) cont.innerHTML = '';
    const dl = $('#pdfExportBtn'); if (dl) dl.classList.add('hidden');
    const sh = $('#pdfShareBtn'); if (sh) sh.classList.add('hidden');
  };

  window.generateMonthlyReport = async function(){
    const userName = $('#userNameInput') ? $('#userNameInput').value.trim() : '';
    if (!userName){ alert('Bitte tragen Sie oben Ihren Namen ein (Einstellungen)'); return; }
    const selectedMonth = $('#monthSelector').value; // YYYY-MM

    const all = await collectRecords(selectedMonth);
    const monthRecords = all.filter(r => r.date && String(r.date).slice(0,7) === selectedMonth);
    monthRecords.sort((a,b)=> String(a.date).localeCompare(String(b.date)));
    console.log('[Report] month selected:', selectedMonth, 'total records:', all.length, 'month matches:', monthRecords.length);

    currentMonthlyData = { month: selectedMonth, records: monthRecords };

    const cont = $('#monthlyReportContent');
    if (cont){
      if (monthRecords.length){
        const html = monthRecords.map(r=>{
          const cr = (r.crossings||[]).map(c=>`${c.from}-${c.to}${c.time?(' ('+c.time+')'):''}`).join(', ');
          return `<div class="text-xs py-1 border-b">
            <strong>${String(r.date).slice(0,10)}</strong> &nbsp; ${r.startTime||''} ${(r.startLocation||'-')} → ${r.endTime||''} ${(r.endLocation||'-')} &nbsp; | Arbeit: ${fmtHM(r.workMinutes||0)} Nacht: ${fmtHM(r.nightWorkMinutes||0)} ${cr?('| '+cr):''}
          </div>`;
        }).join('');
        cont.innerHTML = `<div class="bg-white p-3">${html}</div>`;
      } else {
        cont.innerHTML = `<div class="bg-white p-3 text-sm text-gray-600">Keine Einträge im gewählten Monat gefunden.</div>`;
      }
    }
    const dl = $('#pdfExportBtn'); if (dl) dl.classList.remove('hidden');
    if (navigator.share){ const sh = $('#pdfShareBtn'); if (sh) sh.classList.remove('hidden'); }
  };

  window.exportToPDF = function(){
    if (!currentMonthlyData){ alert('Bitte zuerst den Bericht erstellen.'); return; }
    try{
      const { jsPDF } = window.jspdf; const doc = new jsPDF('p','mm','a4');
      const userName = $('#userNameInput') ? $('#userNameInput').value : 'N/A';
      const [year, month] = currentMonthlyData.month.split('-'); const monthName = germanMonths[parseInt(month)-1];
      const daysInMonth = new Date(year, month, 0).getDate();
      const recordsMap = new Map(currentMonthlyData.records.map(r => [String(r.date).slice(0,10), r]));

      doc.setFontSize(18); doc.setFont(undefined,'bold'); doc.text('ARBEITSZEITNACHWEIS', 105, 15, {align:'center'});
      doc.setFontSize(14); doc.setFont(undefined,'normal'); doc.text(`${monthName} ${year}`, 105, 23, {align:'center'});
      doc.setFontSize(12); doc.text(userName, 105, 31, {align:'center'});

      let yPos = 40; const pageBottom = 280; const left = 15;
      const headers = ['Datum','Beginn','Ort','Ende','Ort','Grenzübergänge','Arbeit','Nacht'];
      const colW = [25,15,30,15,30,35,15,15];
      const drawHeader = () => { doc.setFont('Helvetica','bold'); doc.setFontSize(9); doc.setDrawColor(150,150,150); let x=left; headers.forEach((h,i)=>{ doc.rect(x,yPos,colW[i],7,'S'); doc.text(h, x+colW[i]/2, yPos+4.5, {align:'center'}); x+=colW[i]; }); yPos+=7; doc.setFont('Helvetica','normal'); };
      drawHeader();

      let totalWork=0, totalNight=0;
      for (let day=1; day<=daysInMonth; day++){
        const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const r = recordsMap.get(key);
        const dayOfWeek = new Date(Date.UTC(year, month-1, day)).getUTCDay();
        const dateDisp = `${String(day).padStart(2,'0')}.${String(month).padStart(2,'0')}.
${germanFullDays[dayOfWeek]}`;
        const crossings = (r && Array.isArray(r.crossings) && r.crossings.length) ? r.crossings.map(c=>`${c.from}-${c.to}${c.time?(' ('+c.time+')'):''}`).join('\n') : '-';

        const { jsPDF } = window.jspdf;
        const sLocLines = doc.splitTextToSize(r?.startLocation || '-', colW[2]-2);
        const eLocLines = doc.splitTextToSize(r?.endLocation || '-', colW[4]-2);
        const crLines   = doc.splitTextToSize(crossings, colW[5]-2);
        const maxLines = Math.max(sLocLines.length, eLocLines.length, crLines.length, 1);
        const rowH = maxLines*4.5 + 4;
        if (yPos + rowH > pageBottom){ doc.addPage(); yPos=20; drawHeader(); }

        const cells = r ? [dateDisp, r.startTime||'-', r.startLocation||'-', r.endTime||'-', r.endLocation||'-', crossings, fmtHM(r.workMinutes||0), fmtHM(r.nightWorkMinutes||0)]
                        : [dateDisp, '-', '-', '-', '-', '-', '-', '-'];
        let x=left;
        cells.forEach((text,i)=>{ doc.setFillColor(255,255,255); if(i===0 && (dayOfWeek===6||dayOfWeek===0)) doc.setFillColor(245,245,245); doc.rect(x,yPos,colW[i],rowH,'FD'); doc.setFontSize(8); doc.text(text, x+colW[i]/2, yPos+rowH/2, {align:'center', baseline:'middle'}); x+=colW[i]; });
        yPos += rowH;
        if (r){ totalWork += (r.workMinutes||0); totalNight += (r.nightWorkMinutes||0); }
      }
      if (yPos > pageBottom - 20){ doc.addPage(); yPos=20; }
      doc.setFontSize(10); doc.setFont(undefined,'bold');
      doc.text(`Gesamt Arbeitszeit: ${fmtHM(totalWork)}`, left+180, yPos+5, {align:'right'});
      doc.text(`Gesamt Nachtzeit: ${fmtHM(totalNight)}`, left+180, yPos+11, {align:'right'});
      doc.save(`Arbeitszeitnachweis-${(userName||'N/A').replace(/ /g,'_')}-${year}-${monthName}.pdf`);
    }catch(e){ console.error('PDF generation error:', e); alert('Fehler bei der PDF-Erstellung: '+e.message); }
  };

  window.sharePDF = async function(){
    if (!currentMonthlyData){ alert('Bitte zuerst den Bericht erstellen.'); return; }
    if (!navigator.share){ alert('Ihr Browser unterstützt diese Funktion nicht.'); return; }
    const { jsPDF } = window.jspdf; const doc = new jsPDF('p','mm','a4');
    const userName = $('#userNameInput') ? $('#userNameInput').value : 'N/A';
    const [year, month] = currentMonthlyData.month.split('-'); const monthName = germanMonths[parseInt(month)-1];
    const daysInMonth = new Date(year, month, 0).getDate();
    const recordsMap = new Map(currentMonthlyData.records.map(r => [String(r.date).slice(0,10), r]));

    doc.setFontSize(18); doc.setFont(undefined,'bold'); doc.text('ARBEITSZEITNACHWEIS',105,15,{align:'center'});
    doc.setFontSize(14); doc.text(`${monthName} ${year}`,105,23,{align:'center'});
    doc.setFontSize(12); doc.text(userName,105,31,{align:'center'});
    let yPos=40; const left=15, pageBottom=280; const headers=['Datum','Beginn','Ort','Ende','Ort','Grenzübergänge','Arbeit','Nacht']; const colW=[25,15,30,15,30,35,15,15];
    const drawHeader=()=>{ doc.setFont('Helvetica','bold'); doc.setFontSize(9); doc.setDrawColor(150,150,150); let x=left; headers.forEach((h,i)=>{doc.rect(x,yPos,colW[i],7,'S'); doc.text(h,x+colW[i]/2,yPos+4.5,{align:'center'}); x+=colW[i];}); yPos+=7; doc.setFont('Helvetica','normal'); };
    drawHeader();
    let totalWork=0,totalNight=0;
    for(let day=1;day<=daysInMonth;day++){
      const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const r = recordsMap.get(key);
      const dayOfWeek = new Date(Date.UTC(year, month-1, day)).getUTCDay();
      const dateDisp = `${String(day).padStart(2,'0')}.${String(month).padStart(2,'0')}.
${germanFullDays[dayOfWeek]}`;
      const crossings = (r && Array.isArray(r.crossings) && r.crossings.length)?r.crossings.map(c=>`${c.from}-${c.to}${c.time?(' ('+c.time+')'):''}`).join('\n'):'-';
      const sLocLines = doc.splitTextToSize(r?.startLocation || '-', colW[2]-2);
      const eLocLines = doc.splitTextToSize(r?.endLocation || '-', colW[4]-2);
      const crLines = doc.splitTextToSize(crossings, colW[5]-2);
      const rowH = Math.max(sLocLines.length, eLocLines.length, crLines.length, 1)*4.5 + 4;
      if (yPos+rowH>pageBottom){ doc.addPage(); yPos=20; drawHeader(); }
      const cells = r ? [dateDisp, r.startTime||'-', r.startLocation||'-', r.endTime||'-', r.endLocation||'-', crossings, fmtHM(r.workMinutes||0), fmtHM(r.nightWorkMinutes||0)] : [dateDisp,'-','-','-','-','-','-','-'];
      let x=left; cells.forEach((text,i)=>{ doc.setFillColor(255,255,255); if(i===0&&(dayOfWeek===6||dayOfWeek===0)) doc.setFillColor(245,245,245); doc.rect(x,yPos,colW[i],rowH,'FD'); doc.setFontSize(8); doc.text(text, x+colW[i]/2,yPos+rowH/2,{align:'center',baseline:'middle'}); x+=colW[i]; }); yPos+=rowH;
      if (r){ totalWork+=(r.workMinutes||0); totalNight+=(r.nightWorkMinutes||0); }
    }
    if (yPos>pageBottom-20){ doc.addPage(); yPos=20; }
    doc.setFontSize(10); doc.setFont(undefined,'bold'); doc.text(`Gesamt Arbeitszeit: ${fmtHM(totalWork)}`, left+180,yPos+5, {align:'right'});
    doc.text(`Gesamt Nachtzeit: ${fmtHM(totalNight)}`, left+180,yPos+11, {align:'right'});
    const blob = doc.output('blob'); const fname=`Arbeitszeitnachweis-${(userName||'N/A').replace(/ /g,'_')}-${year}-${monthName}.pdf`; const file=new File([blob], fname,{type:'application/pdf'});
    const data={files:[file],title:`Arbeitszeitnachweis - ${monthName} ${year}`,text:`Anbei mein Arbeitszeitnachweis für ${monthName} ${year}.`};
    if (navigator.canShare && navigator.canShare(data)) await navigator.share(data);
    else alert('Diese Datei kann nicht geteilt werden.');
  };
})(); 
