// proba/js/features/workday.js
(function () {
  'use strict';
  const now = () => new Date();
  const pad2 = n => String(n).padStart(2, '0');
  function fmtDateISO(d){return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;}
  function fmtTimeHM(d){return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;}
  const safeObj = v => (v && typeof v === 'object') ? v : {};
  const safeStr = v => (v == null ? '' : String(v));
  function parseTimeToMinutes(hhmm){if(!hhmm)return 0;const m=String(hhmm).match(/^(\d{1,2}):(\d{2})$/);if(!m)return 0;return parseInt(m[1],10)*60+parseInt(m[2],10);}
  function diffMinutes(a,b){const A=parseTimeToMinutes(a),B=parseTimeToMinutes(b);if(!A||!B)return 0;let d=B-A; if(d<0)d+=1440; return d;}

  // Realtime notify
  const __recordsBC = ('BroadcastChannel' in window) ? new BroadcastChannel('munkaido-records') : null;
  function notifyRecordsUpdated(event, payload){
    const detail = { event, payload, t: Date.now() };
    try{ window.dispatchEvent(new CustomEvent('records:updated',{detail})); }catch{}
    try{ __recordsBC && __recordsBC.postMessage({ type:'records:updated', ...detail }); }catch{}
    try{ localStorage.setItem('records_updated_ping', String(detail.t)); localStorage.removeItem('records_updated_ping'); }catch{}
  }

  let activeShift = null;
  let isFinishing = false;

  async function saveRecord(record){
    try{ if(window.db && typeof window.db.saveRecord==='function'){ await window.db.saveRecord(record); return true; }
         if(window.db && typeof window.db.addRecord==='function'){ await window.db.addRecord(record); return true; } }catch(e){ console.warn('[workday] db save error', e); }
    try{ const key='workRecords'; const raw=localStorage.getItem(key); const arr=raw?JSON.parse(raw):[]; if(Array.isArray(arr)){ arr.push(record); localStorage.setItem(key, JSON.stringify(arr)); return true; } }catch(e){ console.warn('[workday] ls save error', e); }
    try{ const fb=window.firebase||window._firebase||null; if(fb && typeof fb.firestore==='function' && fb.auth){ const uid=fb.auth().currentUser && fb.auth().currentUser.uid; if(uid){ const fs=fb.firestore(); await fs.collection(`users/${uid}/records`).add(record); return true; } } }catch(e){ console.warn('[workday] fs save error', e); }
    return false;
  }

  function showShiftStartedPopup(shift){
    const prev=document.getElementById('shift-start-modal'); if(prev) prev.remove();
    const overlay=document.createElement('div'); overlay.id='shift-start-modal'; overlay.setAttribute('role','dialog');
    overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
    const card=document.createElement('div'); card.style.cssText='background:#fff;color:#111;padding:16px 18px;border-radius:12px;width:min(90vw,420px);box-shadow:0 10px 30px rgba(0,0,0,.3);text-align:center;';
    const icon=document.createElement('div'); icon.textContent='✅'; icon.style.cssText='font-size:30px;line-height:1;';
    const title=document.createElement('div'); title.textContent='Műszak elindítva'; title.style.cssText='font-size:18px;font-weight:600;margin-top:6px;';
    const sub=document.createElement('div'); const extra=shift.startLocation?` • ${shift.startLocation}`:''; sub.textContent=`${shift.date} • ${shift.startTime}${extra}`; sub.style.cssText='margin-top:6px;opacity:.8;font-size:14px;';
    const ok=document.createElement('button'); ok.textContent='OK'; ok.style.cssText='margin-top:12px;padding:8px 14px;border:0;background:#2563eb;color:#fff;border-radius:10px;font-weight:600;cursor:pointer;';
    function close(){ overlay.remove(); }
    ok.addEventListener('click', close); overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });
    card.append(icon,title,sub,ok); overlay.appendChild(card); document.body.appendChild(overlay);
    setTimeout(()=>{ try{ close(); }catch{} }, 2500);
  }

  function toast(msg){ try{ const el=document.createElement('div'); el.textContent=msg; el.style.position='fixed'; el.style.left='50%'; el.style.transform='translateX(-50%)'; el.style.bottom='16px'; el.style.background='rgba(0,0,0,.8)'; el.style.color='#fff'; el.style.padding='8px 12px'; el.style.borderRadius='8px'; el.style.zIndex=9999; document.body.appendChild(el); setTimeout(()=>el.remove(),2200);}catch{} }

  async function startShift(opts={}){
    if(activeShift || window.activeShift){ console.warn('[workday] Már van aktív műszak.'); return; }
    const t=now();
    const shift={ id:`${Date.now()}-${Math.random().toString(36).slice(2)}`, date:fmtDateISO(t), startTime:fmtTimeHM(t), endTime:'',
      startLocation:safeStr(opts.startLocation||''), endLocation:'', crossings:Array.isArray(opts.crossings)?opts.crossings:[],
      nightWorkMinutes:0, workMinutes:0, meta:safeObj(opts.meta) };
    activeShift=shift; window.activeShift=shift;
    updateUIState(true);
    try{ showShiftStartedPopup(shift);}catch{ toast('Műszak elindítva.'); }
    notifyRecordsUpdated('start', shift);
    console.log('[workday] Műszak indult:', shift);
  }

  async function finalizeShift(shiftArg){
    if(isFinishing) return; isFinishing=true;
    const btn=document.getElementById('finishShiftBtn'); if(btn) btn.disabled=true;
    try{
      const base=(shiftArg && typeof shiftArg==='object')?shiftArg:(activeShift||window.activeShift);
      if(!base){ console.warn('[workday] finalizeShift aktív műszak nélkül'); alert('Nincs aktív műszak a lezáráshoz.'); return; }
      const meta=safeObj(base.meta); const _k=Object.keys(meta);
      const t=now();
      const finished={ id:safeStr(base.id)||`${Date.now()}-${Math.random().toString(36).slice(2)}`, date:safeStr(base.date)||fmtDateISO(t),
        startTime:safeStr(base.startTime), endTime:safeStr(base.endTime)||fmtTimeHM(t),
        startLocation:safeStr(base.startLocation), endLocation:safeStr(base.endLocation)||safeStr(meta.lastKnownEndLocation||''),
        crossings:Array.isArray(base.crossings)?base.crossings:[], nightWorkMinutes:Number(base.nightWorkMinutes||0),
        workMinutes:Number(base.workMinutes||0), meta };
      if(!finished.workMinutes || finished.workMinutes<=0){ const m=diffMinutes(finished.startTime, finished.endTime); if(m>0 && m<1440) finished.workMinutes=m; }
      const ok=await saveRecord(finished);
      if(!ok){ alert('Nem sikerült a mentés. Próbáld újra, vagy ellenőrizd az internetkapcsolatot.'); return; }
      notifyRecordsUpdated('finalize', finished);
      console.log('[workday] Műszak lezárva és mentve:', finished);
      activeShift=null; if(window.activeShift) delete window.activeShift;
      updateUIState(false); toast('Műszak lezárva.');
    }catch(e){ console.error('[workday] finalizeShift hiba:', e); alert('Hiba történt a lezárás során: '+e.message); }
    finally{ isFinishing=false; if(btn) btn.disabled=false; }
  }

  function cancelShift(){
    if(!activeShift && !window.activeShift) return;
    activeShift=null; if(window.activeShift) delete window.activeShift;
    updateUIState(false); notifyRecordsUpdated('cancel'); toast('Műszak megszakítva.');
  }

  function updateUIState(running){
    const startBtn=document.getElementById('startShiftBtn');
    const finishBtn=document.getElementById('finishShiftBtn');
    const cancelBtn=document.getElementById('cancelShiftBtn');
    if(startBtn) startBtn.disabled=!!running;
    if(finishBtn) finishBtn.disabled=!running;
    if(cancelBtn) cancelBtn.disabled=!running;
    const badge=document.getElementById('shiftStatus');
    if(badge){ badge.textContent=running?'Folyamatban':'Nincs aktív műszak'; badge.classList.toggle('text-green-600', !!running); badge.classList.toggle('text-gray-500', !running); }
  }

  function bindDefaultButtons(){
    const startBtn=document.getElementById('startShiftBtn');
    const finishBtn=document.getElementById('finishShiftBtn');
    const cancelBtn=document.getElementById('cancelShiftBtn');
    if(startBtn && !startBtn.__bound){ startBtn.addEventListener('click', ()=>startShift(), {passive:true}); startBtn.__bound=true; }
    if(finishBtn && !finishBtn.__bound){ finishBtn.addEventListener('click', ()=>finalizeShift(), {passive:true}); finishBtn.__bound=true; }
    if(cancelBtn && !cancelBtn.__bound){ cancelBtn.addEventListener('click', ()=>cancelShift(), {passive:true}); cancelBtn.__bound=true; }
  }
  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', bindDefaultButtons); } else { bindDefaultButtons(); }

  const api={ startShift, finalizeShift, cancelShift };
  if(typeof window!=='undefined'){ window.startShift=window.startShift||startShift; window.finalizeShift=finalizeShift; window.cancelShift=window.cancelShift||cancelShift; window.workday=Object.assign(window.workday||{}, api); }
})();
