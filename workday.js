// proba/js/features/workday.js
// Stabil, null-safe műszak-kezelés (start/finalize/cancel), dupla kattintás védelemmel.
// Nem támaszkodik buildre; UMD-szerűen a window-ra is felakasztja a publikus API-t.

(function () {
  'use strict';

  // ---- Kis segédek ----
  const now = () => new Date();
  const pad2 = n => String(n).padStart(2, '0');

  function fmtDateISO(d) {
    // YYYY-MM-DD helyi idő szerint
    const yr = d.getFullYear();
    const mo = pad2(d.getMonth() + 1);
    const da = pad2(d.getDate());
    return `${yr}-${mo}-${da}`;
  }
  function fmtTimeHM(d) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }

  const safeObj = v => (v && typeof v === 'object') ? v : {};
  const safeStr = v => (v == null ? '' : String(v));

  function parseTimeToMinutes(hhmm) {
    if (!hhmm) return 0;
    const m = String(hhmm).match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return 0;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }
  function diffMinutes(startHM, endHM) {
    const a = parseTimeToMinutes(startHM);
    const b = parseTimeToMinutes(endHM);
    if (!a || !b) return 0;
    let d = b - a;
    if (d < 0) d += 24 * 60; // éjfél átfordulás esetén
    return d;
  }

  // ---- Állapot ----
  // A régi kód sokszor a window.activeShift-et használta.
  // Meghagyjuk, de belső állapotot is kezelünk biztonságosan.
  let activeShift = null;
  let isFinishing = false;

  // ---- Adatmentés (tároló absztrakció) ----
  async function saveRecord(record) {
    // 1) Ha van saját DB réteg:
    try {
      if (window.db && typeof window.db.saveRecord === 'function') {
        await window.db.saveRecord(record);
        return true;
      }
      if (window.db && typeof window.db.addRecord === 'function') {
        await window.db.addRecord(record);
        return true;
      }
    } catch (e) {
      console.warn('[workday] db.saveRecord/addRecord hiba:', e);
      // esünk tovább fallbackre
    }

    // 2) localStorage fallback: workRecords tömb
    try {
      const key = 'workRecords';
      const raw = localStorage.getItem(key);
      const arr = Array.isArray(raw ? JSON.parse(raw) : []) ? JSON.parse(raw) : [];
      arr.push(record);
      localStorage.setItem(key, JSON.stringify(arr));
      return true;
    } catch (e) {
      console.warn('[workday] localStorage mentés hiba:', e);
    }

    // 3) Ha van Firestore réteg (nagyon alap, opcionális)
    try {
      const fb = window.firebase || window._firebase || null;
      if (fb && typeof fb.firestore === 'function' && fb.auth) {
        const uid = fb.auth().currentUser && fb.auth().currentUser.uid;
        if (uid) {
          const fs = fb.firestore();
          await fs.collection(`users/${uid}/records`).add(record);
          return true;
        }
      }
    } catch (e) {
      console.warn('[workday] Firestore mentés hiba:', e);
    }

    return false;
  }

  // ---- Publikus API ----
  async function startShift(opts = {}) {
    // Ha már fut, ne indítsunk újat
    if (activeShift || window.activeShift) {
      console.warn('[workday] Már van aktív műszak.');
      return;
    }

    const t = now();
    const shift = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date: fmtDateISO(t),
      startTime: fmtTimeHM(t),
      endTime: '',
      startLocation: safeStr(opts.startLocation || ''),
      endLocation: '',
      // opcionális mezők
      crossings: Array.isArray(opts.crossings) ? opts.crossings : [],
      nightWorkMinutes: 0,
      workMinutes: 0,
      meta: safeObj(opts.meta),
    };

    activeShift = shift;
    window.activeShift = shift; // visszafelé kompatibilitás
    updateUIState(true);
    console.log('[workday] Műszak indult:', shift);
  }

  async function finalizeShift(shiftArg) {
    if (isFinishing) return; // dupla kattintás ellen
    isFinishing = true;

    // gomb ideiglenes tiltása (ha van)
    const btn = document.getElementById('finishShiftBtn');
    if (btn) btn.disabled = true;

    try {
      // Elfogadjuk az argumentumot, vagy használjuk az aktív műszakot
      const base = (shiftArg && typeof shiftArg === 'object') ? shiftArg : (activeShift || window.activeShift);
      if (!base) {
        console.warn('[workday] finalizeShift aktív műszak nélkül');
        alert('Nincs aktív műszak a lezáráshoz.');
        return;
      }

      // Legyen minden mező biztonságosan kezelve
      const meta = safeObj(base.meta);
      // Itt korábban gyakran így volt: Object.keys(base.meta) -> ez dobhatott hibát
      // Mi így használjuk:
      const metaKeys = Object.keys(meta); // SOHA nem fog hibát dobni

      // Lezárási idő
      const t = now();
      const finished = {
        id: safeStr(base.id) || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        date: safeStr(base.date) || fmtDateISO(t),
        startTime: safeStr(base.startTime),
        endTime: safeStr(base.endTime) || fmtTimeHM(t),
        startLocation: safeStr(base.startLocation),
        endLocation: safeStr(base.endLocation) || safeStr(meta.lastKnownEndLocation || ''),
        crossings: Array.isArray(base.crossings) ? base.crossings : [],
        nightWorkMinutes: Number(base.nightWorkMinutes || 0),
        workMinutes: Number(base.workMinutes || 0),
        meta, // megőrizzük
      };

      // Munkaidő kiszámolása, ha nincs megadva
      if (!finished.workMinutes || finished.workMinutes <= 0) {
        const m = diffMinutes(finished.startTime, finished.endTime);
        if (m > 0 && m < 24 * 60) {
          finished.workMinutes = m;
        }
      }

      // Mentés
      const ok = await saveRecord(finished);
      if (!ok) {
        alert('Nem sikerült a mentés. Próbáld újra, vagy ellenőrizd az internetkapcsolatot.');
        return;
      }

      console.log('[workday] Műszak lezárva és mentve:', finished);

      // Állapot nullázása
      activeShift = null;
      if (window.activeShift) delete window.activeShift;

      updateUIState(false);
      toast('Műszak lezárva.');

    } catch (e) {
      console.error('[workday] finalizeShift hiba:', e);
      alert('Hiba történt a lezárás során: ' + e.message);
    } finally {
      isFinishing = false;
      if (btn) btn.disabled = false;
    }
  }

  function cancelShift() {
    if (!activeShift && !window.activeShift) return;
    activeShift = null;
    if (window.activeShift) delete window.activeShift;
    updateUIState(false);
    toast('Műszak megszakítva.');
  }

  // ---- UI segédek ----
  function updateUIState(running) {
    // Ha vannak standard gomb ID-k, kapcsoljuk őket
    const startBtn = document.getElementById('startShiftBtn');
    const finishBtn = document.getElementById('finishShiftBtn');
    const cancelBtn = document.getElementById('cancelShiftBtn');

    if (startBtn) startBtn.disabled = !!running;
    if (finishBtn) finishBtn.disabled = !running;
    if (cancelBtn) cancelBtn.disabled = !running;

    // Esetleg státusz jelzés
    const badge = document.getElementById('shiftStatus');
    if (badge) {
      badge.textContent = running ? 'Folyamatban' : 'Nincs aktív műszak';
      badge.classList.toggle('text-green-600', !!running);
      badge.classList.toggle('text-gray-500', !running);
    }
  }

  function toast(msg) {
    try {
      // Egyszerű beépített toast, ha nincs dedikált komponens
      const el = document.createElement('div');
      el.textContent = msg;
      el.style.position = 'fixed';
      el.style.left = '50%';
      el.style.transform = 'translateX(-50%)';
      el.style.bottom = '16px';
      el.style.background = 'rgba(0,0,0,.8)';
      el.style.color = '#fff';
      el.style.padding = '8px 12px';
      el.style.borderRadius = '8px';
      el.style.zIndex = 9999;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2200);
    } catch (_) { /* no-op */ }
  }

  // ---- Eseménykötés (ha van fix ID-jű gomb a DOM-ban) ----
  function bindDefaultButtons() {
    const startBtn = document.getElementById('startShiftBtn');
    const finishBtn = document.getElementById('finishShiftBtn');
    const cancelBtn = document.getElementById('cancelShiftBtn');

    if (startBtn && !startBtn.__bound) {
      startBtn.addEventListener('click', () => startShift(), { passive: true });
      startBtn.__bound = true;
    }
    if (finishBtn && !finishBtn.__bound) {
      finishBtn.addEventListener('click', () => finalizeShift(), { passive: true });
      finishBtn.__bound = true;
    }
    if (cancelBtn && !cancelBtn.__bound) {
      cancelBtn.addEventListener('click', () => cancelShift(), { passive: true });
      cancelBtn.__bound = true;
    }
  }

  // Első betöltéskor megpróbálunk gombokat kötni
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindDefaultButtons);
  } else {
    bindDefaultButtons();
  }

  // ---- Publikálás a window-ra (visszafelé kompatibilitás) ----
  const api = { startShift, finalizeShift, cancelShift };
  if (typeof window !== 'undefined') {
    window.startShift = window.startShift || startShift;
    window.finalizeShift = finalizeShift; // direktben elérhető legyen az onclick-ből
    window.cancelShift = window.cancelShift || cancelShift;
    window.workday = Object.assign(window.workday || {}, api);
  }

})();