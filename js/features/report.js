
// proba/js/features/report.js
(function(){
  const $ = (sel) => document.querySelector(sel);
  let currentMonthlyData = null;

  const germanMonths = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const germanFullDays = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
  function fmtHM(mins){ mins=Math.max(0,Math.round(mins||0)); const h=Math.floor(mins/60), m=mins%60; return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }

  function toISODateLoose(s){
    if(!s && s!==0) return null;
    if (s instanceof Date) return s.toISOString().slice(0,10);
    if (typeof s === 'number' && isFinite(s)) return new Date(s).toISOString().slice(0,10);
    if (s && typeof s.toDate === 'function'){ try{ return s.toDate().toISOString().slice(0,10);}catch(_){ } }
    s = String(s).trim();
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return s;
    let m=s.match(/^(\\d{4})[.\\/\\-]\\s*(\\d{1,2})[.\\/\\-]\\s*(\\d{1,2})$/);
    if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
    m=s.match(/^(\\d{1,2})[.\\/\\-](\\d{1,2})[.\\/\\-](\\d{4})$/);
    if(m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
    m=s.match(/^(\\d{4})-(\\d{2})-(\\d{2})[T ]/);
    if(m) return `${m[1]}-${m[2]}-${m[3]}`;
    return null;
  }
  function looksLikeRecord(r){
    return r && typeof r==='object' && (r.date || r.day || r.key || r.ts) && (r.startTime || r.start) && (r.endTime || r.end);
  }
  function normalizeRecord(r){
    const dateIso = toISODateLoose(r.date) || toISODateLoose(r.day) || toISODateLoose(r.key) || toISODateLoose(r.ts);
    const startTime = r.startTime || r.start || '';
    const endTime   = r.endTime || r.end || '';
    const workMinutes  = ('workMinutes' in r) ? Number(r.workMinutes) : (('workTime' in r)? Number(r.workTime) : 0);
    const nightWorkMinutes = Number(r.nightWorkMinutes || r.night || 0);
    const startLocation = r.startLocation || r.from || r.startLoc || '';
    const endLocation   = r.endLocation || r.to || r.endLoc || '';
    const crossings = Array.isArray(r.crossings) ? r.crossings : (Array.isArray(r.borderCrossings)? r.borderCrossings : []);
    return { id: String(r.id || r.key || Date.now()+Math.random()), date: dateIso, startTime, endTime, startLocation, endLocation, workMinutes, nightWorkMinutes, crossings };
  }

  async function collectFromWindow(){
    if (Array.isArray(window.records) && window.records.length){
      return window.records.map(normalizeRecord);
    }
    const db = window.db || window.database || null;
    if (db){
      for (const fn of ['getAllRecords','getAllDays','getRecords','listAll']){
        if (typeof db[fn] === 'function'){
          try{
            const arr = await db[fn]();
            if (Array.isArray(arr) && arr.length){ return arr.map(normalizeRecord); }
          }catch(_){}
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
    }catch(_){ return []; }
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
          if (/^\\d{4}-\\d{2}-\\d{2}$/.test(k) && v && typeof v==='object'){
            const rec = Object.assign({date:k}, v); if (looksLikeRecord(rec)) out.push(normalizeRecord(rec));
          }
        }
        for (const [k,v] of Object.entries(node)){
          if (/^\\d{4}-\\d{2}$/.test(k) && v && typeof v==='object'){
            for (const [dk,dv] of Object.entries(v)){
              if (/^\\d{2}$/.test(dk) && dv && typeof dv==='object'){
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
    }catch(_){}
    return out;
  }
  async function collectFromIndexedDB(){
    const acc = [];
    try{
      if (!('indexedDB' in window)) return acc;
      const names = (indexedDB.databases ? (await indexedDB.databases()).map(d=>d&&d.name).filter(Boolean) : []);
      ['MunkaidoDB','workdays-db','worklog','app-db','localforage','keyval-store'].forEach(n=>{ if(!names.includes(n)) names.push(n); });
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
    }catch(_){}
    return acc;
  }
  async function collectFromFirestore(selectedMonth){
    const out = [];
    try{
      const fb = window.firebase || window._firebase || null;
      if (!fb) return out;
      const auth = (typeof fb.auth === 'function') ? fb.auth() : (fb.auth || null);
      let uid = auth && auth.currentUser ? auth.currentUser.uid : null;
      if (!uid && auth && typeof auth.onAuthStateChanged === 'function'){
        await new Promise(res => auth.onAuthStateChanged(u => { uid = u && u.uid; res(); }));
      }
      if (!uid) return out;
      const fs = (typeof fb.firestore === 'function') ? fb.firestore() : (fb.firestore || null);
      if (!fs || !fs.collection) return out;
      const paths = [`users/${uid}/records`,`users/${uid}/workdays`,`users/${uid}/days`,`users/${uid}/entries`,`records/${uid}/items`,`workdays/${uid}/items`];
      for (const p of paths){
        try{
          const snap = await fs.collection(p).get();
          const arr = []; snap.forEach(d=>arr.push({id:d.id, ...d.data()}));
          arr.forEach(r=>{
            const dateIso = toISODateLoose(r.date) || toISODateLoose(r.day) || toISODateLoose(r.key);
            if (dateIso && dateIso.startsWith(selectedMonth)) out.push(normalizeRecord(r));
          });
          if (out.length) break;
        }catch(_){}
      }
    }catch(_){}
    return out;
  }
  async function collectRecords(selectedMonth){
    const w = await collectFromWindow(); if (w.length) return w;
    const ls = [...collectFromLocalStorageFlat(), ...collectFromLocalStorageDeep()]; if (ls.length) return ls;
    const idb = await collectFromIndexedDB(); if (idb.length) return idb;
    const fsd = await collectFromFirestore(selectedMonth); return fsd;
  }

  window.initMonthlyReport = function(){
    const inp = $('#monthSelector'); if (inp) inp.value = new Date().toISOString().slice(0,7);
    const cont = $('#monthlyReportContent'); if (cont) cont.innerHTML = '';
    const dl = $('#pdfExportBtn'); if (dl) dl.classList.add('hidden');
    const sh = $('#pdfShareBtn'); if (sh) sh.classList.add('hidden');
  };

  window.generateMonthlyReport = async function(){
    const userName = $('#userNameInput') ? $('#userNameInput').value.trim() : '';
    if (!userName){ alert('Bitte tragen Sie oben Ihren Namen ein (Einstellungen)'); return; }
    const selectedMonth = $('#monthSelector').value;
    const all = await collectRecords(selectedMonth);
    const monthRecords = all.filter(r => r.date && String(r.date).slice(0,7) === selectedMonth)
                            .sort((a,b)=> String(a.date).localeCompare(String(b.date)));
    currentMonthlyData = { month: selectedMonth, records: monthRecords };

    const cont = $('#monthlyReportContent');
    if (cont){
      if (monthRecords.length){
        const html = monthRecords.map(r=> `<div class="text-xs py-1 border-b">
          <strong>${String(r.date).slice(0,10)}</strong> &nbsp; ${r.startTime||''} ${(r.startLocation||'-')}
          → ${r.endTime||''} ${(r.endLocation||'-')} &nbsp; | Arbeit: ${fmtHM(r.workMinutes||0)} Nacht: ${fmtHM(r.nightWorkMinutes||0)}
        </div>`).join('');
        cont.innerHTML = `<div class="bg-white p-3">${html}</div>`;
      } else {
        cont.innerHTML = `<div class="bg-white p-3 text-sm text-gray-600">Keine Einträge im gewählten Monat gefunden.</div>`;
      }
    }
    const dl = $('#pdfExportBtn'); if (dl) dl.classList.remove('hidden');
    if (navigator.share){ const sh = $('#pdfShareBtn'); if (sh) sh.classList.remove('hidden'); }
  };

  function renderMonthlyPdfTable(doc, recordsMap, year, month){
    const left = 15, pageBottom = 280;
    const headers = ['Datum','Beginn','Ort','Ende','Ort','Grenzübergänge','Arbeit','Nacht'];
    const colW = [25,15,30,15,30,35,15,15];
    const lineH = 4.8, padY = 2.2;

    const drawHeader = (y) => {
      doc.setFont('Helvetica','bold'); doc.setFontSize(9); doc.setDrawColor(150,150,150);
      let x=left; headers.forEach((h,i)=>{ doc.rect(x,y,colW[i],7,'S'); doc.text(h, x+colW[i]/2, y+4.5, {align:'center'}); x+=colW[i]; });
      return y+7;
    };

    let yPos = 40;
    yPos = drawHeader(yPos);
    let totalWork=0, totalNight=0;

    const germanFullDays = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day=1; day<=daysInMonth; day++){
      const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const r = recordsMap.get(key);
      const dayOfWeek = new Date(Date.UTC(year, month-1, day)).getUTCDay();

      const dateLines = [`${String(day).padStart(2,'0')}.${String(month).padStart(2,'0')}.`, germanFullDays[dayOfWeek]];
      const sLocLines = doc.splitTextToSize(r?.startLocation || '-', colW[2]-3);
      const eLocLines = doc.splitTextToSize(r?.endLocation || '-', colW[4]-3);
      const crossingsText = (r && Array.isArray(r.crossings) && r.crossings.length)
        ? r.crossings.map(c=>`${c.from}-${c.to}${c.time?(' ('+c.time+')'):''}`).join('\\n')
        : '-';
      const crLines = doc.splitTextToSize(crossingsText, colW[5]-3);

      const linesCount = Math.max(dateLines.length, sLocLines.length, eLocLines.length, crLines.length, 1);
      const rowH = linesCount*lineH + padY*2;

      if (yPos + rowH > pageBottom){ doc.addPage(); yPos = 20; yPos = drawHeader(yPos); }

      const cells = r
        ? [dateLines, [r.startTime||'-'], sLocLines, [r.endTime||'-'], eLocLines, crLines, [fmtHM(r.workMinutes||0)], [fmtHM(r.nightWorkMinutes||0)]]
        : [dateLines, ['-'], ['-'], ['-'], ['-'], ['-'], ['-'], ['-']];

      let x=left;
      cells.forEach((arr,i)=>{
        doc.setFillColor(255,255,255);
        if (i===0 && (dayOfWeek===6||dayOfWeek===0)) doc.setFillColor(245,245,245);
        doc.rect(x, yPos, colW[i], rowH, 'FD');
        doc.setFontSize(8);
        const lines = Array.isArray(arr) ? arr : [String(arr||'-')];
        let yText = yPos + padY;
        lines.forEach((ln, idx)=>{ doc.text(ln, x + colW[i]/2, yText + idx*lineH, {align:'center', baseline:'top'}); });
        x += colW[i];
      });
      yPos += rowH;

      if (r){ totalWork += (r.workMinutes||0); totalNight += (r.nightWorkMinutes||0); }
    }

    if (yPos > pageBottom - 20){ doc.addPage(); yPos = 20; }
    doc.setFontSize(10); doc.setFont(undefined,'bold');
    doc.text(`Gesamt Arbeitszeit: ${fmtHM(totalWork)}`, left+180, yPos+5, {align:'right'});
    doc.text(`Gesamt Nachtzeit: ${fmtHM(totalNight)}`, left+180, yPos+11, {align:'right'});
  }

  window.exportToPDF = function(){
    if (!currentMonthlyData){ alert('Bitte zuerst den Bericht erstellen.'); return; }
    try{
      const { jsPDF } = window.jspdf; const doc = new jsPDF('p','mm','a4');
      const userName = $('#userNameInput') ? $('#userNameInput').value : 'N/A';
      const [yearStr, monthStr] = currentMonthlyData.month.split('-');
      const year = parseInt(yearStr,10), month = parseInt(monthStr,10);
      const monthName = germanMonths[month-1];

      doc.setFontSize(18); doc.setFont(undefined,'bold'); doc.text('ARBEITSZEITNACHWEIS', 105, 15, {align:'center'});
      doc.setFontSize(14); doc.setFont(undefined,'normal'); doc.text(`${monthName} ${year}`, 105, 23, {align:'center'});
      doc.setFontSize(12); doc.text(userName, 105, 31, {align:'center'});

      const recordsMap = new Map(currentMonthlyData.records.map(r => [String(r.date).slice(0,10), r]));
      renderMonthlyPdfTable(doc, recordsMap, year, month);

      doc.save(`Arbeitszeitnachweis-${(userName||'N/A').replace(/ /g,'_')}-${year}-${monthName}.pdf`);
    }catch(e){ console.error('PDF generation error:', e); alert('Fehler bei der PDF-Erstellung: ' + e.message); }
  };

  window.sharePDF = async function(){
    if (!currentMonthlyData){ alert('Bitte zuerst den Bericht erstellen.'); return; }
    if (!navigator.share){ alert('Ihr Browser unterstützt diese Funktion nicht.'); return; }
    try{
      const { jsPDF } = window.jspdf; const doc = new jsPDF('p','mm','a4');
      const userName = $('#userNameInput') ? $('#userNameInput').value : 'N/A';
      const [yearStr, monthStr] = currentMonthlyData.month.split('-');
      const year = parseInt(yearStr,10), month = parseInt(monthStr,10);
      const monthName = germanMonths[month-1];

      doc.setFontSize(18); doc.setFont(undefined,'bold'); doc.text('ARBEITSZEITNACHWEIS',105,15,{align:'center'});
      doc.setFontSize(14); doc.text(`${monthName} ${year}`,105,23,{align:'center'});
      doc.setFontSize(12); doc.text(userName,105,31,{align:'center'});

      const recordsMap = new Map(currentMonthlyData.records.map(r => [String(r.date).slice(0,10), r]));
      renderMonthlyPdfTable(doc, recordsMap, year, month);

      const blob = doc.output('blob');
      const fname = `Arbeitszeitnachweis-${(userName||'N/A').replace(/ /g,'_')}-${year}-${monthName}.pdf`;
      const file = new File([blob], fname, { type: 'application/pdf' });
      const data = { files:[file], title:`Arbeitszeitnachweis - ${monthName} ${year}`, text:`Anbei mein Arbeitszeitnachweis für ${monthName} ${year}.` };
      if (navigator.canShare && navigator.canShare(data)) await navigator.share(data);
      else alert('Diese Datei kann nicht geteilt werden.');
    }catch(e){ console.error('Sharing error:', e); alert('Fehler beim Teilen: ' + e.message); }
  };
})(); 
