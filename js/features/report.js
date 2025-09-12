// proba/js/features/report.js
// Robust monthly report (German-only), with record collection from multiple sources.
// Works even if data lives in window.records, localStorage('workRecords'), or IndexedDB.

(function(){
  const $ = (sel) => document.querySelector(sel);
  let currentMonthlyData = null;

  // --- helpers ---
  const germanMonths = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const germanFullDays = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];

  function fmtHM(mins){
    mins = Math.max(0, Math.round(mins||0));
    const h = Math.floor(mins/60);
    const m = mins%60;
    return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
  }
  function parseHM(str){
    if(!str) return 0;
    const m = String(str).trim().match(/^\s*(\d{1,2})\s*[:h]?(\d{0,2})\s*$/);
    if(!m) return 0;
    const hh = parseInt(m[1],10);
    const mm = m[2]?parseInt(m[2],10):0;
    return hh*60+mm;
  }
  function toISODateLoose(s){
    // try to normalize a few formats to YYYY-MM-DD
    if(!s) return null;
    s = String(s).trim();
    // already ISO
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // 2025. 09. 03 -> 2025-09-03
    let m = s.match(/^(\d{4})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})$/);
    if(m){
      const y = m[1], mo = String(m[2]).padStart(2,'0'), d = String(m[3]).padStart(2,'0');
      return `${y}-${mo}-${d}`;
    }
    // 03.09.2025 / 3.9.2025 -> 2025-09-03
    m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
    if(m){
      const d = String(m[1]).padStart(2,'0'), mo = String(m[2]).padStart(2,'0'), y = m[3];
      return `${y}-${mo}-${d}`;
    }
    return null;
  }

  // Heuristic to decide whether an object looks like a work record
  function looksLikeRecord(r){
    return r && typeof r==='object' &&
           r.date && (r.startTime || r.start) && (r.endTime || r.end) ;
  }
  // Normalize a record to the expected shape
  function normalizeRecord(r){
    const date = toISODateLoose(r.date) || r.date;
    const startTime = r.startTime || r.start || '';
    const endTime = r.endTime || r.end || '';
    const workMinutes = 'workMinutes' in r ? r.workMinutes :
        (('workTime' in r) ? parseHM(r.workTime) : 0);
    const nightWorkMinutes = r.nightWorkMinutes || r.night || 0;
    const driveMinutes = r.driveMinutes || r.drive || 0;
    const kmDriven = r.kmDriven || r.km || 0;
    const startLocation = r.startLocation || r.from || r.startLoc || '';
    const endLocation = r.endLocation || r.to || r.endLoc || '';
    const crossings = Array.isArray(r.crossings)? r.crossings : [];
    return { id: String(r.id||Date.now()), date, startTime, endTime, startLocation, endLocation, workMinutes, nightWorkMinutes, driveMinutes, kmDriven, crossings };
  }

  async function collectFromIndexedDB(){
    const acc = [];
    try{
      if (!('indexedDB' in window) || !indexedDB.databases) return [];
      const dbs = await indexedDB.databases();
      for(const info of dbs){
        if(!info || !info.name) continue;
        const db = await new Promise((resolve,reject)=>{
          const req = indexedDB.open(info.name);
          req.onsuccess = ()=>resolve(req.result);
          req.onerror = ()=>reject(req.error||new Error('IDB open error'));
        });
        try{
          const stores = Array.from(db.objectStoreNames || []);
          for(const storeName of stores){
            const rows = await new Promise((resolve,reject)=>{
              const tx = db.transaction(storeName,'readonly');
              const st = tx.objectStore(storeName);
              const req = st.getAll();
              req.onsuccess = ()=>resolve(req.result||[]);
              req.onerror = ()=>reject(req.error||new Error('IDB getAll error'));
            });
            for(const row of rows){
              if(looksLikeRecord(row)) acc.push(normalizeRecord(row));
            }
          }
        }finally{
          try{ db.close(); }catch(_){}
        }
      }
    }catch(e){
      console.warn('[Report] IDB scan failed:', e);
    }
    return acc;
  }

  function collectFromLocalStorage(){
    const out = [];
    try{
      const raw = localStorage.getItem('workRecords');
      if(!raw) return out;
      const arr = JSON.parse(raw);
      if(Array.isArray(arr)){
        for(const r of arr){ if(looksLikeRecord(r)) out.push(normalizeRecord(r)); }
      }
    }catch(e){ console.warn('[Report] localStorage parse failed:', e); }
    return out;
  }

  async function collectRecords(){
    // 1) window.records if available
    if (Array.isArray(window.records) && window.records.length){
      console.log('[Report] Using window.records:', window.records.length);
      return window.records.map(normalizeRecord);
    }
    // 2) module database getter (best guess)
    try{
      if (window.db && typeof window.db.getAllRecords==='function'){
        const arr = await window.db.getAllRecords();
        if (Array.isArray(arr) && arr.length){
          console.log('[Report] Using db.getAllRecords:', arr.length);
          return arr.map(normalizeRecord);
        }
      }
    }catch(e){ console.warn('[Report] db.getAllRecords failed:', e); }
    // 3) localStorage
    const ls = collectFromLocalStorage();
    if (ls.length){
      console.log('[Report] Using localStorage(workRecords):', ls.length);
      return ls;
    }
    // 4) IndexedDB scan
    const idb = await collectFromIndexedDB();
    if (idb.length){
      console.log('[Report] Using IndexedDB scan:', idb.length);
      return idb;
    }
    console.log('[Report] No records found.');
    return [];
  }

  // ----- Public API expected by the app -----
  window.initMonthlyReport = function(){
    const inp = $('#monthSelector');
    if (inp) inp.value = new Date().toISOString().slice(0,7);
    const cont = $('#monthlyReportContent');
    if (cont) cont.innerHTML = '';
    const dl = $('#pdfExportBtn'); if (dl) dl.classList.add('hidden');
    const sh = $('#pdfShareBtn'); if (sh) sh.classList.add('hidden');
  };

  window.generateMonthlyReport = async function(){
    const userName = $('#userNameInput') ? $('#userNameInput').value.trim() : '';
    if (!userName){
      alert('Bitte tragen Sie oben Ihren Namen ein (Einstellungen)');
      return;
    }
    const selectedMonth = $('#monthSelector').value; // 'YYYY-MM'
    const all = await collectRecords();
    const monthRecords = all.filter(r => r.date && String(r.date).startsWith(selectedMonth));
    monthRecords.sort((a,b)=> new Date(a.date) - new Date(b.date));

    currentMonthlyData = { month: selectedMonth, records: monthRecords };

    const cont = $('#monthlyReportContent');
    if (cont){
      if (monthRecords.length){
        const html = monthRecords.map(r=>{
          const cr = (r.crossings||[]).map(c=>`${c.from}-${c.to} (${c.time})`).join(', ');
          return `<div class="text-xs py-1 border-b">
            <strong>${r.date}</strong> &nbsp; ${r.startTime} ${r.startLocation||'-'} → ${r.endTime} ${r.endLocation||'-'} &nbsp; | Arbeit: ${fmtHM(r.workMinutes)} Nacht: ${fmtHM(r.nightWorkMinutes||0)} ${cr?('| '+cr):''}
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
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p','mm','a4');
      const userName = $('#userNameInput') ? $('#userNameInput').value : 'N/A';
      const [year, month] = currentMonthlyData.month.split('-');
      const monthName = germanMonths[parseInt(month)-1];
      const daysInMonth = new Date(year, month, 0).getDate();
      const recordsMap = new Map(currentMonthlyData.records.map(r => [r.date, r]));

      // header
      doc.setFontSize(18); doc.setFont(undefined,'bold'); doc.text('ARBEITSZEITNACHWEIS', 105, 15, {align:'center'});
      doc.setFontSize(14); doc.setFont(undefined,'normal'); doc.text(`${monthName} ${year}`, 105, 23, {align:'center'});
      doc.setFontSize(12); doc.text(userName, 105, 31, {align:'center'});

      let yPos = 40;
      const pageBottom = 280;
      const left = 15, tableW = 180;
      const headers = ['Datum','Beginn','Ort','Ende','Ort','Grenzübergänge','Arbeit','Nacht'];
      const colW = [25,15,30,15,30,35,15,15];

      const drawHeader = () => {
        doc.setFont('Helvetica','bold'); doc.setFontSize(9); doc.setTextColor(0,0,0); doc.setDrawColor(150,150,150);
        let x = left;
        headers.forEach((h,i)=>{ doc.rect(x,yPos,colW[i],7,'S'); doc.text(h, x+colW[i]/2, yPos+4.5, {align:'center'}); x+=colW[i]; });
        yPos += 7;
        doc.setFont('Helvetica','normal');
      };
      drawHeader();

      let totalWork = 0, totalNight = 0;
      for (let day=1; day<=daysInMonth; day++){
        const dateISO = new Date(Date.UTC(year, month-1, day)).toISOString().split('T')[0];
        const dayOfWeek = new Date(Date.UTC(year, month-1, day)).getUTCDay();
        const r = recordsMap.get(dateISO);

        const dateDisp = `${String(day).padStart(2,'0')}.${String(month).padStart(2,'0')}.\n${germanFullDays[dayOfWeek]}`;
        const crossings = (r && Array.isArray(r.crossings) && r.crossings.length)
          ? r.crossings.map(c=>`${c.from}-${c.to} (${c.time})`).join('\n') : '-';

        // row height auto
        const dateLines = doc.splitTextToSize(dateDisp, colW[0]-2);
        const sLocLines = doc.splitTextToSize(r?.startLocation || '-', colW[2]-2);
        const eLocLines = doc.splitTextToSize(r?.endLocation || '-', colW[4]-2);
        const crLines   = doc.splitTextToSize(crossings, colW[5]-2);
        const rowH = Math.max(dateLines.length, sLocLines.length, eLocLines.length, crLines.length)*4.5 + 4;

        if (yPos + rowH > pageBottom){ doc.addPage(); yPos = 20; drawHeader(); }

        const cells = r ? [dateDisp, r.startTime, r.startLocation||'-', r.endTime, r.endLocation||'-', crossings, fmtHM(r.workMinutes), fmtHM(r.nightWorkMinutes||0)]
                        : [dateDisp, '-', '-', '-', '-', '-', '-', '-'];

        let x = left;
        cells.forEach((text,i)=>{
          doc.setFillColor(255,255,255);
          if (i===0 && (dayOfWeek===6 || dayOfWeek===0)) doc.setFillColor(245,245,245);
          doc.setDrawColor(150,150,150);
          doc.rect(x, yPos, colW[i], rowH, 'FD');
          doc.setFontSize(8);
          doc.text(text, x + colW[i]/2, yPos + rowH/2, {align:'center', baseline:'middle'});
          x += colW[i];
        });
        yPos += rowH;

        if (r){ totalWork += (r.workMinutes||0); totalNight += (r.nightWorkMinutes||0); }
      }

      if (yPos > pageBottom - 20){ doc.addPage(); yPos = 20; }
      doc.setFontSize(10); doc.setFont(undefined,'bold');
      doc.text(`Gesamt Arbeitszeit: ${fmtHM(totalWork)}`, left+tableW, yPos+5, {align:'right'});
      doc.text(`Gesamt Nachtzeit: ${fmtHM(totalNight)}`, left+tableW, yPos+11, {align:'right'});

      doc.save(`Arbeitszeitnachweis-${(userName||'N/A').replace(/ /g,'_')}-${year}-${monthName}.pdf`);
    }catch(e){
      console.error('PDF generation error:', e);
      alert('Fehler bei der PDF-Erstellung: ' + e.message);
    }
  };

  window.sharePDF = async function(){
    if (!currentMonthlyData){ alert('Bitte zuerst den Bericht erstellen.'); return; }
    if (!navigator.share){ alert('Ihr Browser unterstützt diese Funktion nicht.'); return; }
    try{
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p','mm','a4');
      const userName = $('#userNameInput') ? $('#userNameInput').value : 'N/A';
      const [year, month] = currentMonthlyData.month.split('-');
      const monthName = germanMonths[parseInt(month)-1];
      const daysInMonth = new Date(year, month, 0).getDate();
      const recordsMap = new Map(currentMonthlyData.records.map(r => [r.date, r]));

      // Build same as export, but share as file
      let yPos=40; const left=15, tableW=180, pageBottom=280;
      const headers=['Datum','Beginn','Ort','Ende','Ort','Grenzübergänge','Arbeit','Nacht'];
      const colW=[25,15,30,15,30,35,15,15];
      const germanFullDays=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
      const drawHeader = ()=>{ doc.setFont('Helvetica','bold'); doc.setFontSize(9); doc.setDrawColor(150,150,150); let x=left; headers.forEach((h,i)=>{doc.rect(x,yPos,colW[i],7,'S'); doc.text(h, x+colW[i]/2, yPos+4.5, {align:'center'}); x+=colW[i];}); yPos+=7; doc.setFont('Helvetica','normal'); };
      doc.setFontSize(18); doc.setFont(undefined,'bold'); doc.text('ARBEITSZEITNACHWEIS',105,15,{align:'center'});
      doc.setFontSize(14); doc.text(`${monthName} ${year}`,105,23,{align:'center'});
      doc.setFontSize(12); doc.text(userName,105,31,{align:'center'});
      drawHeader();

      let totalWork=0, totalNight=0;
      for (let day=1; day<=daysInMonth; day++){
        const dateISO = new Date(Date.UTC(year, month-1, day)).toISOString().split('T')[0];
        const dayOfWeek = new Date(Date.UTC(year, month-1, day)).getUTCDay();
        const r = recordsMap.get(dateISO);
        const dateDisp = `${String(day).padStart(2,'0')}.${String(month).padStart(2,'0')}.\n${germanFullDays[dayOfWeek]}`;
        const crossings = (r && Array.isArray(r.crossings) && r.crossings.length)
          ? r.crossings.map(c=>`${c.from}-${c.to} (${c.time})`).join('\n') : '-';
        const dateLines = doc.splitTextToSize(dateDisp, colW[0]-2);
        const sLocLines = doc.splitTextToSize(r?.startLocation || '-', colW[2]-2);
        const eLocLines = doc.splitTextToSize(r?.endLocation || '-', colW[4]-2);
        const crLines   = doc.splitTextToSize(crossings, colW[5]-2);
        const rowH = Math.max(dateLines.length, sLocLines.length, eLocLines.length, crLines.length)*4.5 + 4;
        if (yPos + rowH > pageBottom){ doc.addPage(); yPos=20; drawHeader(); }
        const cells = r ? [dateDisp, r.startTime, r.startLocation||'-', r.endTime, r.endLocation||'-', crossings, fmtHM(r.workMinutes), fmtHM(r.nightWorkMinutes||0)]
                        : [dateDisp, '-', '-', '-', '-', '-', '-', '-'];
        let x=left; cells.forEach((text,i)=>{ doc.setFillColor(255,255,255); if(i===0 && (dayOfWeek===6||dayOfWeek===0)) doc.setFillColor(245,245,245); doc.rect(x,yPos,colW[i],rowH,'FD'); doc.setFontSize(8); doc.text(text, x+colW[i]/2, yPos+rowH/2, {align:'center', baseline:'middle'}); x+=colW[i]; });
        yPos += rowH;
        if (r){ totalWork += (r.workMinutes||0); totalNight += (r.nightWorkMinutes||0); }
      }
      if (yPos > pageBottom - 20){ doc.addPage(); yPos=20; }
      doc.setFontSize(10); doc.setFont(undefined,'bold');
      doc.text(`Gesamt Arbeitszeit: ${fmtHM(totalWork)}`, left+tableW, yPos+5, {align:'right'});
      doc.text(`Gesamt Nachtzeit: ${fmtHM(totalNight)}`, left+tableW, yPos+11, {align:'right'});

      const blob = doc.output('blob');
      const fileName = `Arbeitszeitnachweis-${(userName||'N/A').replace(/ /g,'_')}-${year}-${monthName}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const shareData = { files:[file], title:`Arbeitszeitnachweis - ${monthName} ${year}`, text:`Anbei mein Arbeitszeitnachweis für ${monthName} ${year}.` };
      if (navigator.canShare && navigator.canShare(shareData)){
        await navigator.share(shareData);
      } else {
        throw new Error('Diese Datei kann nicht geteilt werden.');
      }
    }catch(e){
      if (e.name==='AbortError'){ console.log('Teilen abgebrochen.'); }
      else { console.error('Sharing error:', e); alert('Fehler beim Teilen: ' + e.message); }
    }
  };
})(); 
