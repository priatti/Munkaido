(function () {
  'use strict';

  const SEEN_KEY = 'yearly_2025_seen';
  const CUTOFF = new Date('2026-01-15T23:59:59');

  function isWithinWindow() {
    try {
      return new Date() <= CUTOFF;
    } catch (_) {
      return false;
    }
  }

  function isHuLanguage() {
    try {
      return (typeof window.currentLang === 'string' ? window.currentLang : (localStorage.getItem('language') || 'hu')) === 'hu';
    } catch (_) {
      return true;
    }
  }

  function hasSeen() {
    try {
      return localStorage.getItem(SEEN_KEY) === '1';
    } catch (_) {
      return false;
    }
  }

  function markSeen() {
    try {
      localStorage.setItem(SEEN_KEY, '1');
      localStorage.setItem(SEEN_KEY + '_at', String(Date.now()));
    } catch (_) {}
  }

  function toISODateLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  function parseISODate(dateStr) {
    try {
      if (!dateStr || typeof dateStr !== 'string') return null;
      const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return null;
      return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
    } catch (_) {
      return null;
    }
  }

  function computeStats() {
    const all = (typeof window.records !== 'undefined' && Array.isArray(window.records))
      ? window.records
      : ((typeof records !== 'undefined' && Array.isArray(records)) ? records : []);

    const records2025 = all.filter(r => r && typeof r.date === 'string' && r.date.startsWith('2025-'));

    let firstDateStr = null;
    for (const r of all) {
      const d = (r && typeof r.date === 'string') ? r.date : null;
      if (!d) continue;
      if (!firstDateStr || d < firstDateStr) firstDateStr = d;
    }

    const firstDate = firstDateStr ? parseISODate(firstDateStr) : null;
    const today = new Date();
    const todayStr = toISODateLocal(today);
    const todayDate = parseISODate(todayStr);

    let daysWithGuriGO = 0;
    if (firstDate && todayDate) {
      const diffDays = Math.floor((todayDate.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000));
      daysWithGuriGO = Math.max(0, diffDays + 1);
    }

    const workdays2025 = records2025.filter(r => {
      const t = (r && r.entryType) ? r.entryType : 'workday';
      return t !== 'noteDay';
    });

    const workdayCount = workdays2025.length;

    const totalKm = workdays2025.reduce((acc, r) => {
      const v = (r && typeof r.kmDriven === 'number') ? r.kmDriven : (parseFloat(r && r.kmDriven) || 0);
      return acc + (Number.isFinite(v) ? v : 0);
    }, 0);

    const totalDriveMinutes = workdays2025.reduce((acc, r) => {
      const v = (r && typeof r.driveMinutes === 'number') ? r.driveMinutes : (parseFloat(r && r.driveMinutes) || 0);
      return acc + (Number.isFinite(v) ? v : 0);
    }, 0);

    const totalDriveHours = Math.round((totalDriveMinutes / 60) * 10) / 10;

    return {
      firstDateStr: firstDateStr || '',
      daysWithGuriGO,
      workdayCount,
      totalKm: Math.round(totalKm),
      totalDriveHours
    };
  }

  async function drawSummaryCanvas(canvas, stats) {
    const ctx = canvas.getContext('2d');

    function wrapText(text, x, y, maxWidth, lineHeight) {
      const words = String(text || '').split(' ');
      let line = '';
      let drawY = y;
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = line ? (line + ' ' + word) : word;
        const metrics = ctx.measureText(testLine);

        // If even a single word is longer than the max width, break it by characters.
        if (!line && ctx.measureText(word).width > maxWidth) {
          let chunk = '';
          for (let c = 0; c < word.length; c++) {
            const testChunk = chunk + word[c];
            if (ctx.measureText(testChunk).width > maxWidth && chunk) {
              ctx.fillText(chunk, x, drawY);
              drawY += lineHeight;
              chunk = word[c];
            } else {
              chunk = testChunk;
            }
          }
          if (chunk) {
            ctx.fillText(chunk, x, drawY);
            drawY += lineHeight;
          }
          line = '';
          continue;
        }

        if (metrics.width > maxWidth && line) {
          ctx.fillText(line, x, drawY);
          line = word;
          drawY += lineHeight;
        } else {
          line = testLine;
        }
      }
      if (line) ctx.fillText(line, x, drawY);
      return drawY + lineHeight;
    }

    function splitTextToLines(text, maxWidth) {
      const words = String(text || '').split(' ');
      const lines = [];
      let line = '';

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testLine = line ? (line + ' ' + word) : word;

        if (!line && ctx.measureText(word).width > maxWidth) {
          let chunk = '';
          for (let c = 0; c < word.length; c++) {
            const testChunk = chunk + word[c];
            if (ctx.measureText(testChunk).width > maxWidth && chunk) {
              lines.push(chunk);
              chunk = word[c];
            } else {
              chunk = testChunk;
            }
          }
          if (chunk) lines.push(chunk);
          line = '';
          continue;
        }

        if (ctx.measureText(testLine).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      }

      if (line) lines.push(line);
      return lines;
    }

    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = 'assets/images/yearly2025.jpg';

    await new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Kép betöltése sikertelen'));
    });

    const w = img.naturalWidth || 1200;
    const h = img.naturalHeight || 675;
    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(img, 0, 0, w, h);

    const panelW = Math.round(w * 0.44);
    const panelX = w - panelW;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(panelX, 0, panelW, h);

    const pad = Math.round(panelW * 0.08);
    let x = panelX + pad;
    let y = Math.round(h * 0.10);
    const maxTextWidth = panelW - (pad * 2);

    const title = '🎄 2025 Összefoglaló';

    const lineGap = Math.round(h * 0.055);

    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';

    const titleSize = Math.max(28, Math.round(h * 0.055));
    ctx.font = `700 ${titleSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    const titleLineHeight = Math.round(titleSize * 1.2);
    y = wrapText(title, x, y, maxTextWidth, titleLineHeight) + Math.round(titleSize * 0.6);

    const labelSize = Math.max(18, Math.round(h * 0.032));
    ctx.font = `600 ${labelSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;

    const items = [
      `📅 GuriGO-val töltött napok: ${stats.daysWithGuriGO}`,
      `🚚 Rögzített munkanapok (2025): ${stats.workdayCount}`,
      `🛣️ Megtett km (2025): ${stats.totalKm}`,
      `⏱️ Vezetési idő (2025): ${stats.totalDriveHours} óra`
    ];

    const itemLineHeight = Math.round(labelSize * 1.25);
    for (const line of items) {
      const endY = wrapText(line, x, y, maxTextWidth, itemLineHeight);
      y = endY + Math.round(itemLineHeight * 0.55);
    }

    const footerSize = Math.max(16, Math.round(h * 0.026));
    const footerLineHeight = Math.round(footerSize * 1.25);
    const bottomPad = Math.max(14, Math.round(h * 0.05));
    ctx.font = `600 ${footerSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    const footerText = 'Köszönöm, hogy 2025-ben velem voltál!';
    const footerLines = splitTextToLines(footerText, maxTextWidth);
    y = Math.max(0, h - bottomPad - (footerLines.length * footerLineHeight));
    for (let i = 0; i < footerLines.length; i++) {
      ctx.fillText(footerLines[i], x, y + (i * footerLineHeight));
    }
  }

  function ensureModal() {
    const existing = document.getElementById('yearly-2025-overlay');
    if (existing) return existing;

    const modalHTML = `
      <div id="yearly-2025-overlay" class="fixed inset-0 bg-black bg-opacity-60 hidden items-start justify-center transition-opacity duration-300" style="z-index:9999; padding:12px; padding-bottom: calc(12px + env(safe-area-inset-bottom)); overflow:auto; -webkit-overflow-scrolling:touch;">
        <div id="yearly-2025-box" class="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-2xl w-11/12 max-w-lg mx-auto transform transition-transform duration-300 scale-95" style="max-height:90vh; overflow-y:auto;">
          <div style="padding:12px; border-radius:12px; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.06); margin-bottom:12px; position:relative;">
            <button id="yearly-2025-close" class="text-gray-500 hover:text-gray-800 dark:hover:text-gray-100" style="position:absolute; right:10px; top:10px; padding:6px 10px; border-radius:10px;">✕</button>
            <div style="text-align:center; padding: 4px 34px 2px 34px;">
              <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100" style="line-height:1.25; margin:0;">🎄 2025-ös GuriGO összefoglalód</h3>
              <p class="text-xs text-gray-600 dark:text-gray-300" style="margin:8px 0 0 0; line-height:1.4;">(csak 2026. január 15-ig elérhető)</p>
            </div>
          </div>

          <div class="space-y-3">
            <div class="text-sm text-gray-700 dark:text-gray-200 leading-relaxed" style="padding:12px; border-radius:12px; background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.08);">
              <div style="max-width: 520px; margin: 0 auto;">
                <p style="margin:0 0 8px 0;">Köszönöm, hogy idén tesztelőként segítettél a GuriGO építésében!</p>
                <p style="margin:0 0 8px 0;">A visszajelzéseid és a rögzített adataid nélkül nem tartanánk itt.</p>
                <p style="margin:0 0 8px 0;">Kellemes ünnepeket, és balesetmentes, nyugodt utat kívánok!</p>
                <p style="margin:10px 0 0 0;">– Attis 🚚</p>
              </div>
            </div>

            <div class="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-black">
              <canvas id="yearly-2025-canvas" class="w-full h-auto block"></canvas>
            </div>

            <div class="flex gap-3" style="position:sticky; bottom:0; background:inherit; padding-top:12px; padding-bottom:2px;">
              <button id="yearly-2025-download" class="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">Letöltés JPG</button>
              <button id="yearly-2025-ok" class="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold">Bezárás</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const overlay = document.getElementById('yearly-2025-overlay');
    const closeBtn = document.getElementById('yearly-2025-close');
    const okBtn = document.getElementById('yearly-2025-ok');

    function close() {
      try {
        overlay.classList.add('opacity-0');
        const box = document.getElementById('yearly-2025-box');
        if (box) box.classList.add('scale-95');
        setTimeout(() => {
          overlay.classList.add('hidden');
          overlay.classList.remove('flex');
          overlay.classList.remove('opacity-0');
        }, 200);
      } catch (_) {}
    }

    overlay.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'yearly-2025-overlay') close();
    });
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (okBtn) okBtn.addEventListener('click', close);

    return overlay;
  }

  async function openYearlySummary2025(options = {}) {
    if (!isWithinWindow()) return;
    if (!isHuLanguage()) return;

    const overlay = ensureModal();
    const box = document.getElementById('yearly-2025-box');
    const canvas = document.getElementById('yearly-2025-canvas');
    const downloadBtn = document.getElementById('yearly-2025-download');

    if (!overlay || !canvas) return;

    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
    setTimeout(() => {
      overlay.classList.remove('opacity-0');
      if (box) box.classList.remove('scale-95');
    }, 10);

    if (options && options.markSeen) markSeen();

    try {
      if (typeof window.ensureRecordsLoaded === 'function') {
        await window.ensureRecordsLoaded();
      }
    } catch (_) {}

    const stats = computeStats();

    try {
      await drawSummaryCanvas(canvas, stats);
    } catch (e) {
      try {
        const ctx = canvas.getContext('2d');
        canvas.width = 1200;
        canvas.height = 675;
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 32px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText('🎄 2025 Összefoglaló', 40, 60);
        ctx.font = '500 22px system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.fillText('Nem sikerült betölteni a képet, de a letöltés így is működik.', 40, 120);
      } catch (_) {}
    }

    if (downloadBtn) {
      downloadBtn.onclick = async () => {
        try {
          canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'GuriGO_2025_osszefoglalo.jpg';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }, 'image/jpeg', 0.9);
        } catch (_) {}
      };
    }
  }

  function maybeAutoShow() {
    if (!isWithinWindow()) return;
    if (!isHuLanguage()) return;
    if (hasSeen()) return;
    openYearlySummary2025({ markSeen: true }).catch(() => {});
  }

  function initMenuItem() {
    const btn = document.getElementById('menu-item-yearly-2025');
    if (!btn) return;

    if (!isWithinWindow() || !isHuLanguage()) {
      btn.style.display = 'none';
      return;
    }

    btn.style.display = '';
    btn.addEventListener('click', (e) => {
      try { e.preventDefault(); } catch (_) {}
      try { if (typeof window.closeMoreMenu === 'function') window.closeMoreMenu(); } catch (_) {}
      openYearlySummary2025({ markSeen: false }).catch(() => {});
    });
  }

  function init() {
    try { initMenuItem(); } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.openYearlySummary2025 = openYearlySummary2025;
  window.maybeShowYearlySummary2025 = maybeAutoShow;
})();
