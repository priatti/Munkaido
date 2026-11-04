// =======================================================
// ===== PONTOS PDF RIPORT - GURIGO LÁBLÉCCEL =========
// =======================================================

(function () {
  'use strict';

  let currentMonthRecords = [];
  let generatedPdfBlob = null;

  // === SEGÉDFÜGGVÉNYEK ===

  function t(key) {
    return (typeof translations !== 'undefined' && translations[currentLang] && translations[currentLang][key]) || key;
  }

  // Lokális Unicode font betöltés (ő/ű támogatás minden riporthoz)
  async function loadLocalReportFont(doc) {
    try {
      const regUrl = 'assets/fonts/NotoSans-Regular.ttf';
      const boldUrl = 'assets/fonts/NotoSans-Bold.ttf';
      const [resReg, resBold] = await Promise.all([
        fetch(regUrl, { cache: 'force-cache' }),
        fetch(boldUrl, { cache: 'force-cache' }).catch(() => null)
      ]);
      if (!resReg || !resReg.ok) throw new Error('Regular font fetch failed');
      const bufReg = await resReg.arrayBuffer();
      const base64Reg = arrayBufferToBase64(bufReg);
      doc.addFileToVFS('NotoSans-Regular.ttf', base64Reg);
      doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');

      if (resBold && resBold.ok) {
        const bufBold = await resBold.arrayBuffer();
        const base64Bold = arrayBufferToBase64(bufBold);
        doc.addFileToVFS('NotoSans-Bold.ttf', base64Bold);
        doc.addFont('NotoSans-Bold.ttf', 'NotoSans', 'bold');
      }
      return 'NotoSans';
    } catch (e) {
      console.warn('[Report] Local font load failed, falling back to helvetica', e);
      return 'helvetica';
    }
  }

  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function getAllRecords() {
    return (typeof records !== 'undefined' && Array.isArray(records)) ? records : [];
  }

  function isWorkdayEntryForTotals(r) {
    return !r || !r.entryType || r.entryType === 'workday';
  }

  /** Hónap: szabadság/betegség napok száma; ünnep: egyedi dátumok; év: szabadság napok száma az adott naptári évben (összes rekord). */
  function computeReportAbsenceStats(monthRecords, reportYearStr) {
    const y = String(reportYearStr || '');
    let vacationDaysMonth = 0;
    let sickDaysMonth = 0;
    const holidayDatesMonth = new Set();
    (Array.isArray(monthRecords) ? monthRecords : []).forEach(function (r) {
      if (!r || !r.date) return;
      if (r.entryType === 'noteDay' && r.absenceType === 'vacation') vacationDaysMonth++;
      if (r.entryType === 'noteDay' && r.absenceType === 'sick') sickDaysMonth++;
      if (typeof getHolidayDatesForRecord === 'function') {
        getHolidayDatesForRecord(r).forEach(function (hd) { holidayDatesMonth.add(String(hd)); });
      } else if (r.isHoliday === true) {
        holidayDatesMonth.add(String(r.date));
      }
    });
    let vacationDaysYear = 0;
    getAllRecords().forEach(function (r) {
      if (!r || !r.date || y === '' || !String(r.date).startsWith(y)) return;
      if (r.entryType === 'noteDay' && r.absenceType === 'vacation') vacationDaysYear++;
    });
    return {
      vacationDaysMonth: vacationDaysMonth,
      sickDaysMonth: sickDaysMonth,
      holidayUniqueMonth: holidayDatesMonth.size,
      vacationDaysYear: vacationDaysYear
    };
  }

  /**
   * Ledolgozott napok: ugyanazzal a napi illesztéssel, mint a riport táblázat (PDF/HTML).
   * Minden naptári napra legfeljebb 1 — a táblázat `records.find(r => r.date === dateStr)` szerint egy rekord;
   * ha ugyanarra a dátumra több munkanap van, a lábléc korábban duplán számolt.
   * Számít: munkanap jellegű rekord és a munkaidő percben (szám) > 0.
   */
  function countWorkedShiftDaysInMonth(monthRecords, yearStr, monthStr) {
    var y = String(yearStr || '');
    var mRaw = String(monthStr || '');
    if (!y || !mRaw) return 0;
    var monthNum = parseInt(mRaw, 10);
    if (!isFinite(monthNum) || monthNum < 1 || monthNum > 12) return 0;
    var m = String(monthNum).padStart(2, '0');
    var daysInMonth = new Date(parseInt(y, 10), monthNum, 0).getDate();
    if (!isFinite(daysInMonth) || daysInMonth < 1) return 0;
    var list = Array.isArray(monthRecords) ? monthRecords : [];
    var n = 0;
    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = y + '-' + m + '-' + String(day).padStart(2, '0');
      var record = list.find(function (r) { return r && String(r.date) === dateStr; });
      if (!record) continue;
      if (!isWorkdayEntryForTotals(record)) continue;
      var wm = Number(record.workMinutes);
      if (!isFinite(wm) || wm <= 0) continue;
      n++;
    }
    return n;
  }

  /** Mely napstátusz-ikonok illenek a rekordhoz (sorrend: szabadság, betegség, ünnep, megjegyzés nap).
   *  rowDate = a riport sor naptári napja (YYYY-MM-DD). Éjszakai bontásnál ne essünk vissza record.date-ra (kezdő nap). */
  function getReportStatusIconKinds(record, entryType, rowDate) {
    if (!record) return [];
    const et = entryType || (record.entryType || 'workday');
    const kinds = [];
    const d = (rowDate != null && String(rowDate).trim() !== '') ? String(rowDate).trim().slice(0, 10) : '';
    if (et === 'noteDay' && d && String(record.date) === d && record.absenceType === 'vacation') kinds.push('vacation');
    if (et === 'noteDay' && d && String(record.date) === d && record.absenceType === 'sick') kinds.push('sick');
    if (d && typeof isHolidayOnDate === 'function' && isHolidayOnDate(record, d)) kinds.push('holiday');
    if (et === 'noteDay' && d && String(record.date) === d && record.absenceType !== 'vacation' && record.absenceType !== 'sick') {
      kinds.push('noteDay');
    }
    return kinds;
  }

  var reportStatusIconDataUrlCache = {};

  /** Kis PNG (data URL) böngészőben canvasról — PDF + HTML egyező ikon. */
  function buildReportStatusIconDataUrl(kind) {
    if (reportStatusIconDataUrlCache[kind]) return reportStatusIconDataUrlCache[kind];
    if (typeof document === 'undefined' || !document.createElement) return '';
    var c = document.createElement('canvas');
    var s = 24;
    c.width = s;
    c.height = s;
    var ctx = c.getContext('2d');
    if (!ctx) return '';
    var w = s;
    var h = s;
    ctx.clearRect(0, 0, w, h);
    if (kind === 'vacation') {
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.moveTo(3, 21);
      ctx.lineTo(3, 8);
      ctx.quadraticCurveTo(3, 3, 8, 3);
      ctx.lineTo(16, 3);
      ctx.quadraticCurveTo(21, 3, 21, 8);
      ctx.lineTo(21, 21);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fcd34d';
      ctx.beginPath();
      ctx.arc(12, 9, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#6ee7b7';
      ctx.fillRect(5, 14, 14, 6);
    } else if (kind === 'sick') {
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(12, 12, 9.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(12, 7);
      ctx.lineTo(12, 17);
      ctx.moveTo(7, 12);
      ctx.lineTo(17, 12);
      ctx.stroke();
    } else if (kind === 'holiday') {
      ctx.fillStyle = '#7c3aed';
      ctx.beginPath();
      ctx.moveTo(3, 21);
      ctx.lineTo(3, 8);
      ctx.quadraticCurveTo(3, 3, 8, 3);
      ctx.lineTo(16, 3);
      ctx.quadraticCurveTo(21, 3, 21, 8);
      ctx.lineTo(21, 21);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(12, 5);
      ctx.lineTo(14, 10);
      ctx.lineTo(19, 10);
      ctx.lineTo(15, 13.5);
      ctx.lineTo(16.5, 19);
      ctx.lineTo(12, 15.5);
      ctx.lineTo(7.5, 19);
      ctx.lineTo(9, 13.5);
      ctx.lineTo(5, 10);
      ctx.lineTo(10, 10);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'noteDay') {
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(3, 21);
      ctx.lineTo(3, 8);
      ctx.quadraticCurveTo(3, 3, 8, 3);
      ctx.lineTo(16, 3);
      ctx.quadraticCurveTo(21, 3, 21, 8);
      ctx.lineTo(21, 21);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fffbeb';
      ctx.fillRect(7, 8, 10, 2.2);
      ctx.fillRect(7, 12, 10, 2.2);
      ctx.fillRect(7, 16, 7, 2.2);
    } else {
      return '';
    }
    try {
      reportStatusIconDataUrlCache[kind] = c.toDataURL('image/png');
    } catch (e) {
      return '';
    }
    return reportStatusIconDataUrlCache[kind];
  }

  function buildReportStatusIconsHtml(kinds) {
    if (!kinds || !kinds.length) return '';
    var parts = [];
    for (var i = 0; i < kinds.length; i++) {
      var url = buildReportStatusIconDataUrl(kinds[i]);
      if (!url) continue;
      var esc = String(url).replace(/"/g, '&quot;');
      parts.push('<img src="' + esc + '" width="22" height="22" alt="" class="inline-block align-middle" style="vertical-align:middle"/>');
    }
    if (!parts.length) return '';
    return '<span class="inline-flex flex-wrap items-center gap-0.5 align-middle ml-1">' + parts.join('') + '</span>';
  }

  /** A hónap rekordjai alapján mely ikon-típusok fordulnak elő (fix sorrend). */
  function collectReportStatusKindsUsedInMonth(monthRecords) {
    var order = ['vacation', 'sick', 'holiday', 'noteDay'];
    var used = {};
    (Array.isArray(monthRecords) ? monthRecords : []).forEach(function (r) {
      if (!r) return;
      var et = (r.entryType) ? r.entryType : 'workday';
      if (typeof getHolidayDatesForRecord === 'function' && getHolidayDatesForRecord(r).length) {
        used.holiday = true;
      }
      getReportStatusIconKinds(r, et, r.date).forEach(function (k) {
        used[k] = true;
      });
    });
    return order.filter(function (k) {
      return !!used[k];
    });
  }

  function reportLegendLabelForKind(i18n, kind) {
    var L = i18n || {};
    if (kind === 'vacation') return L.reportLegendIconLabelVacation || L.reportAbsenceVacationShort || 'Vacation';
    if (kind === 'sick') return L.reportLegendIconLabelSick || L.reportAbsenceSickShort || 'Sick leave';
    if (kind === 'holiday') return L.reportLegendIconLabelHoliday || L.reportHolidayShort || 'Holiday';
    if (kind === 'noteDay') return L.reportLegendIconLabelNoteDay || 'Note day';
    return '';
  }

  function buildReportHtmlLegendRows(i18n, kindsUsed) {
    var L = i18n || {};
    var order = kindsUsed && kindsUsed.length ? kindsUsed : ['vacation', 'sick', 'holiday', 'noteDay'];
    var rows = order.map(function (kind) {
      return { kind: kind, label: reportLegendLabelForKind(L, kind) };
    });
    return rows.map(function (row) {
      var url = buildReportStatusIconDataUrl(row.kind);
      var escUrl = url ? String(url).replace(/"/g, '&quot;') : '';
      var escLabel = String(row.label || '').replace(/</g, '&lt;');
      var img = escUrl
        ? '<img src="' + escUrl + '" width="22" height="22" alt="" class="inline-block align-middle mr-1.5" style="vertical-align:middle"/>'
        : '';
      return '<p class="text-xs flex items-center gap-1">' + img + '<span>' + escLabel + '</span></p>';
    }).join('');
  }

  function buildReportPdfLegendIconRows(i18n, kindsUsed) {
    var order = kindsUsed && kindsUsed.length ? kindsUsed : ['vacation', 'sick', 'holiday', 'noteDay'];
    return order.map(function (kind) {
      return { kind: kind, label: reportLegendLabelForKind(i18n, kind) };
    });
  }

  /** Csak felhasználói megjegyzés; típusjel az emojikkal a dátum oszlopban van. */
  function buildReportNoteCell(record, entryType, noteText, i18n) {
    const nt = (noteText && String(noteText).trim()) ? String(noteText).trim() : '';
    return nt;
  }
  
  // Simple time format for table columns (h:mm)
  function formatDurationSimple(minutes) {
    if (minutes === null || typeof minutes === 'undefined' || minutes < 0) minutes = 0;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  }

  // Language-specific format for summary totals
  function formatDuration(minutes, lang) {
    if (minutes === null || typeof minutes === 'undefined' || minutes < 0) minutes = 0;
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    
    // Language-specific formatting
    if (lang === 'hu') {
      return `${h}ó ${m}p`;
    } else if (lang === 'de') {
      return `${h}Std ${String(m).padStart(2, '0')}Min`;
    } else if (lang === 'en') {
      return `${h}h ${String(m).padStart(2, '0')}min`;
    } else if (lang === 'ro') {
      return `${h}o ${String(m).padStart(2, '0')}min`;
    } else if (lang === 'pl') {
      return `${h}g ${String(m).padStart(2, '0')}min`;
    } else if (lang === 'da' || lang === 'no') {
      return `${h}t ${String(m).padStart(2, '0')}min`;
    } else {
      // Fallback to Hungarian
      return `${h}ó ${m}p`;
    }
  }

  function getDefaultReportSettings() {
    return {
      showStartTime: true,
      showStartLocation: true,
      showEndTime: true,
      showEndLocation: true,
      showCrossings: true,
      showWorkTime: true,
      showNightTime: true,
      showDriveTime: true,
      showKmBlock: false,
      showNote: false,
      showVehicle: false,
      showTrailerContainerEvents: false
    };
  }

  // ===== Pótkocsi / Konténer riport kimenet =====
  // Minden tárolt eseményt külön tételként ír ki, beszúrási sorrendben.
  // A showTrailerContainerEvents riport kapcsoló vezérli. Átlépő (overnight)
  // bontásnál a blokk nem duplikálódik: rekord-azonosító szerint deduplikálunk.
  function collectTrailerContainerReportItems(records) {
    var lib = (typeof window !== 'undefined' && window.TrailerContainerLog) ? window.TrailerContainerLog : null;
    if (!lib || !Array.isArray(records)) return [];
    var seen = {};
    var out = [];
    records.forEach(function (rec) {
      if (!rec) return;
      var key = rec.id != null ? ('id:' + String(rec.id)) : ('ref:' + out.length);
      if (seen[key]) return;
      seen[key] = true;
      var items = lib.itemizeEvents(rec.trailerContainerEvents);
      if (items.length === 0) return;
      out.push({ record: rec, items: items });
    });
    return out;
  }

  function trailerContainerActionLabel(i18n, type, action) {
    var key;
    if (type === 'trailer') {
      key = action === 'pickup' ? 'trailerContainerTrailerPickup' : 'trailerContainerTrailerDrop';
    } else {
      key = action === 'pickup' ? 'trailerContainerContainerPickup' : 'trailerContainerContainerDrop';
    }
    return (i18n && i18n[key]) || '';
  }

  function trailerContainerEventTextParts(i18n, ev) {
    var typeLabel = ev.type === 'trailer'
      ? ((i18n && i18n.trailerContainerTypeTrailer) || '')
      : ((i18n && i18n.trailerContainerTypeContainer) || '');
    var actionLabel = trailerContainerActionLabel(i18n, ev.type, ev.action);
    var unit = (i18n && i18n.crossingOdometerUnit) || 'km';
    var parts = [typeLabel, actionLabel, ev.identifier];
    if (ev.time != null && ev.time !== '') parts.push(ev.time);
    if (ev.odometerKm != null) parts.push(String(ev.odometerKm) + ' ' + unit);
    if (ev.location != null && ev.location !== '') parts.push(ev.location);
    if (ev.note != null && ev.note !== '') parts.push(ev.note);
    return parts.filter(function (p) { return p != null && p !== ''; });
  }

  function buildTrailerContainerReportHtml(records, i18n, reportSettings) {
    if (!reportSettings || !reportSettings.showTrailerContainerEvents) return '';
    var groups = collectTrailerContainerReportItems(records);
    if (groups.length === 0) return '';
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    var title = (i18n && i18n.reportTrailerContainerTitle) || '';
    var rows = '';
    groups.forEach(function (g) {
      g.items.forEach(function (ev) {
        var parts = trailerContainerEventTextParts(i18n, ev).map(esc);
        rows += '<p data-trailer-container-report-item="1">' + parts.join(' · ') + '</p>';
      });
    });
    return '<div class="mt-4 text-sm text-gray-700 dark:text-gray-200 border-t border-gray-200 dark:border-gray-600 pt-3">' +
      '<p class="font-semibold mb-1 text-gray-800 dark:text-gray-100">' + esc(title) + '</p>' +
      '<div class="space-y-1">' + rows + '</div></div>';
  }

  // PDF: lapos szöveges sorok a tételekhez (vagy üres tömb, ha a kapcsoló KI).
  function buildTrailerContainerReportLines(records, i18n, reportSettings) {
    if (!reportSettings || !reportSettings.showTrailerContainerEvents) return [];
    var groups = collectTrailerContainerReportItems(records);
    var lines = [];
    groups.forEach(function (g) {
      g.items.forEach(function (ev) {
        lines.push(trailerContainerEventTextParts(i18n, ev).join(' · '));
      });
    });
    return lines;
  }


  function getMonthReportRows(year, month) {
    if (typeof buildMonthlyReportRows === 'function') {
      return buildMonthlyReportRows(currentMonthRecords, year, month);
    }
    return [];
  }

  function formatCrossingsForReportRow(row, record, i18n, lineBreak) {
    var crossings = (row && row.borderCrossings) ? row.borderCrossings : [];
    var rec = (row && row.sourceRecord) ? row.sourceRecord : record;
    if (!crossings.length) return '';
    var lb = lineBreak == null ? '\n' : lineBreak;
    return crossings.map(function (c) {
      if (typeof formatCrossingReportBlock === 'function') {
        return formatCrossingReportBlock(c, rec, i18n, lb);
      }
      var inner = typeof formatCrossingParenthetical === 'function'
        ? formatCrossingParenthetical(c, rec, i18n)
        : c.time;
      return c.from + '-' + c.to + ' (' + inner + ')';
    }).join(lb);
  }

  /** Éjféli bontás: csak megjelenítés — belső beginTime/endTime változatlan. */
  function getReportRowDisplayBeginTime(row) {
    if (!row || row.isEmpty || row.entryType === 'noteDay') return '';
    if (row.segmentType === 'overnight_end') return '';
    return row.beginTime || '';
  }

  function getReportRowDisplayEndTime(row) {
    if (!row || row.isEmpty || row.entryType === 'noteDay') return '';
    if (row.segmentType === 'overnight_start') return '';
    return row.endTime || '';
  }

  function htmlRowBackgroundStyle(row) {
    if (!row || !row.rowBackgroundType) return '';
    var rgb = typeof getReportRowBackgroundRgb === 'function'
      ? getReportRowBackgroundRgb(row.rowBackgroundType)
      : null;
    if (!rgb) return '';
    return ' style="background-color: rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ');"';
  }

  function getEffectiveReportSettings() {
    if (typeof window.getReportSettings === 'function') {
      return window.getReportSettings();
    }
    return getDefaultReportSettings();
  }
  
  // === FŐ FUNKCIÓK ===

  function generateMonthlyReport() {
    const selectedMonth = document.getElementById('monthSelector').value;
    if (!selectedMonth) {
      const msg = (typeof t === 'function')
        ? t('reportSelectMonthRequired', 'Kérlek válassz egy hónapot!')
        : 'Kérlek válassz egy hónapot!';
      if (typeof showCustomAlert === 'function') {
        showCustomAlert(msg, 'info');
      }
      return;
    }
    
    currentMonthRecords = getAllRecords().filter(record => {
      if (!record || !record.date) return false;
      if (record.date.startsWith(selectedMonth)) return true;
      // Éjszakai / V-H átnyúló műszak: endDate a következő hónapban
      if (record.endDate && record.endDate !== record.date && record.endDate.startsWith(selectedMonth)) return true;
      return false;
    });
    const reportContainer = document.getElementById('monthlyReportContent');
    
    if (currentMonthRecords.length === 0) {
      showCustomAlert(t('noEntries'), 'info');
      reportContainer.innerHTML = `<p class="text-center text-gray-500 py-4">${t('noEntries')}</p>`;
      document.getElementById('pdfExportBtn').classList.add('hidden');
      document.getElementById('pdfShareBtn').classList.add('hidden');
      return;
    }

    // Biztonságos fordítási objektum létrehozása, ami garantáltan működik
    const langPref = (typeof currentLang === 'string' && currentLang) ? currentLang : (localStorage.getItem('language') || 'hu');
    const i18nReport = (typeof translations !== 'undefined' && translations[langPref])
      ? translations[langPref]
      : { reportReady: 'A riport elkészült!', reportUseButtons: 'A letöltéshez vagy megosztáshoz használd a fenti gombokat.' };

    // Toast értesítés a biztonságos objektummal
    if (typeof showToast === 'function') {
      showToast(i18nReport.reportReady, i18nReport.reportUseButtons, 'success', { position: 'top-right', duration: 6000 });
    }

    // JAVÍTOTT HTML RÉSZ A HELYES VÁLTOZÓ BEHELYETTESÍTÉSSEL (a '\' karakterek eltávolítva)
    reportContainer.innerHTML = `
      <div class="mt-3 rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700 p-6 text-center shadow-md">
        <div class="mx-auto mb-3 w-full flex items-center justify-center">
          <svg viewBox="0 0 120 120" width="112" height="112" class="block">
            <circle cx="60" cy="60" r="56" fill="#22c55e"></circle>
            <path d="M38 62l14 14 30-34" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </div>
        <p class="font-semibold text-green-700 dark:text-green-300 text-base">${i18nReport.reportReady}</p>
        <p class="text-sm text-green-700/80 dark:text-green-300/80 mt-1">${i18nReport.reportUseButtons}</p>
      </div>
    `;

    document.getElementById('pdfExportBtn').classList.remove('hidden');
    document.getElementById('pdfShareBtn').classList.remove('hidden');
  }

  // Ez a függvény már nem hívódik meg a riport generálásakor, de a PDF készítéshez még kellhet
  function renderMonthlyReportContent(records, selectedMonth) {
    const container = document.getElementById('monthlyReportContent');
    const userName = localStorage.getItem('userName') || 'N/A';
    const [year, month] = selectedMonth.split('-');

    const reportLang = (typeof window !== 'undefined' && typeof window.getReportLanguage === 'function')
      ? window.getReportLanguage()
      : ((typeof currentLang === 'string' && currentLang) ? currentLang : (localStorage.getItem('language') || 'hu'));

    const i18n = (typeof translations !== 'undefined' && translations[reportLang])
      ? translations[reportLang]
      : ((typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang])
        ? translations[currentLang]
        : {});

    const locale = (reportLang === 'de'
      ? 'de-DE'
      : reportLang === 'en'
        ? 'en-US'
        : reportLang === 'ro'
          ? 'ro-RO'
          : reportLang === 'pl'
            ? 'pl-PL'
            : reportLang === 'da'
              ? 'da-DK'
              : reportLang === 'no'
                ? 'nb-NO'
                : 'hu-HU');

    const monthName = new Date(year, parseInt(month, 10) - 1, 1).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long'
    });

    const monthReportRowsPreview = getMonthReportRows(year, month);
    const totals = (typeof computeTotalsFromReportRows === 'function')
      ? computeTotalsFromReportRows(monthReportRowsPreview)
      : records.reduce(function (acc, record) {
          if (isWorkdayEntryForTotals(record)) {
            acc.workMinutes += record.workMinutes || 0;
            acc.nightWorkMinutes += record.nightWorkMinutes || 0;
          }
          return acc;
        }, { workMinutes: 0, nightWorkMinutes: 0 });
    if (!totals.driveMinutes) totals.driveMinutes = 0;
    if (!totals.kmDriven) totals.kmDriven = 0;

    const absStats = computeReportAbsenceStats(records, year);
    const footerVacTpl = (i18n && i18n.reportFooterVacation) || 'Vacation: {{m}} days (in {{y}}: {{z}})';
    const footerSickTpl = (i18n && i18n.reportFooterSick) || 'Sick leave: {{m}} days';
    const footerHolTpl = (i18n && i18n.reportFooterHolidayUnique) || 'Public holidays (unique days): {{m}} days';
    const subst = function (tpl, vars) {
      let s = String(tpl);
      Object.keys(vars).forEach(function (k) {
        s = s.split('{{' + k + '}}').join(String(vars[k]));
      });
      return s;
    };
    const absenceFooterLines = [];
    if (absStats.vacationDaysMonth > 0) {
      absenceFooterLines.push(subst(footerVacTpl, { m: absStats.vacationDaysMonth, y: year, z: absStats.vacationDaysYear }));
    }
    if (absStats.sickDaysMonth > 0) {
      absenceFooterLines.push(subst(footerSickTpl, { m: absStats.sickDaysMonth }));
    }
    if (absStats.holidayUniqueMonth > 0) {
      absenceFooterLines.push(subst(footerHolTpl, { m: absStats.holidayUniqueMonth }));
    }
    const absenceFooterHtml = absenceFooterLines.length
      ? `<div class="mt-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200 space-y-1">${absenceFooterLines.map(function (l) {
        return `<p>${String(l).replace(/</g, '&lt;')}</p>`;
      }).join('')}</div>`
      : '';

    const workedDaysMonth = (typeof countWorkedDaysFromReportRows === 'function')
      ? countWorkedDaysFromReportRows(monthReportRowsPreview)
      : countWorkedShiftDaysInMonth(records, year, month);
    const footerWorkedTpl = (i18n && i18n.reportFooterWorkedDays) || 'Days worked: {{m}}';
    const workedDaysLine = subst(footerWorkedTpl, { m: workedDaysMonth });
    const workedDaysHtml = `<div class="mt-3 text-right text-sm font-semibold text-gray-700 dark:text-gray-200"><p>${String(workedDaysLine).replace(/</g, '&lt;')}</p></div>`;

    const kindsUsedHtmlLegend = collectReportStatusKindsUsedInMonth(records);
    const legendTitleEsc = String((i18n && i18n.reportIconLegendTitle) || (i18n && i18n.reportEmojiLegendTitle) || 'Legend').replace(/</g, '&lt;');
    const legendBodyHtml = kindsUsedHtmlLegend.length ? buildReportHtmlLegendRows(i18n, kindsUsedHtmlLegend) : '';
    const reportEmojiLegendHtml = legendBodyHtml
      ? `<div class="mt-4 text-sm text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-600 pt-3">
      <p class="font-semibold mb-1 text-gray-800 dark:text-gray-100">${legendTitleEsc}</p>
      ${legendBodyHtml}
    </div>`
      : '';

    const fmtTable = formatDurationSimple;
    const fmtTotal = (mins) => formatDuration(mins, reportLang);
    const totalWorkLabel = i18n.reportTotalWork || (reportLang === 'de' ? 'Gesamt Arbeitszeit' : 'Total work time');
    const totalNightLabel = i18n.reportTotalNight || (reportLang === 'de' ? 'Gesamt Nachtzeit' : 'Total night time');

    const rsHtml = getEffectiveReportSettings();
    const includeNoteColumn = !!(rsHtml.showNote && Array.isArray(records) && records.some(function (r) {
      return !!(r && r.note && String(r.note).trim().length > 0);
    }));
    const includeDistanceColumn = !!rsHtml.showKmBlock;
    const vehicleDisplayHtml = (typeof window.EntryVehicleField !== 'undefined' && window.EntryVehicleField.computeReportVehicleDisplay)
      ? window.EntryVehicleField.computeReportVehicleDisplay(monthReportRowsPreview, rsHtml)
      : { headerPlate: null, perRow: false };
    const hasMultiSegmentDays = !!(rsHtml.showVehicle && Array.isArray(monthReportRowsPreview) && monthReportRowsPreview.some(function (row) {
      return row && row.sourceRecord && typeof window.VehicleSegments !== 'undefined'
        && window.VehicleSegments.recordHasMultipleVehicleSegments(row.sourceRecord);
    }));
    const includeVehicleColumn = !!(rsHtml.showVehicle && (vehicleDisplayHtml.perRow || hasMultiSegmentDays));
    const vehicleHeaderHtml = (rsHtml.showVehicle && vehicleDisplayHtml.headerPlate)
      ? `<p class="text-gray-700 dark:text-gray-300 font-medium">${String((i18n.reportVehicleHeaderLabel || i18n.recordVehicleLabel || 'Jármű') + ': ' + vehicleDisplayHtml.headerPlate).replace(/</g, '&lt;')}</p>`
      : '';

    container.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 mb-4">
        <h3 class="text-xl font-bold text-center mb-4">${i18n.reportHeaderTitle || 'Working time record'}</h3>
        <div class="text-center mb-4">
          <p class="text-lg font-semibold">${monthName}</p>
          <p class="text-gray-600 dark:text-gray-400">${userName}</p>
          ${vehicleHeaderHtml}
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm border-collapse">
            <thead class="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th class="border p-2 text-left">${i18n.reportColDate || 'Date'}</th>
                <th class="border p-2 text-left">${i18n.reportColStart || 'Start'}</th>
                <th class="border p-2 text-left">${i18n.reportColLocation || 'Location'}</th>
                <th class="border p-2 text-left">${i18n.reportColEnd || 'End'}</th>
                <th class="border p-2 text-left">${i18n.reportColLocation || 'Location'}</th>
                <th class="border p-2 text-left">${i18n.reportColCrossings || 'Border crossings'}</th>
                <th class="border p-2 text-right">${i18n.reportColWork || 'Work'}</th>
                <th class="border p-2 text-right">${i18n.reportColNight || 'Night'}</th>
                ${includeDistanceColumn ? `<th class="border p-2 text-right">${i18n.reportColKm || 'Distance'}</th>` : ''}
                ${includeVehicleColumn ? `<th class="border p-2 text-left min-w-[5.5rem]">${i18n.reportFieldVehicle || 'Vehicle'}</th>` : ''}
                ${includeNoteColumn ? `<th class="border p-2 text-left">${i18n.reportColNote || 'Note'}</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${generateMonthTableHTML(records, year, month, i18n, reportLang, includeNoteColumn, includeVehicleColumn, includeDistanceColumn)}
            </tbody>
          </table>
        </div>
        <div class="mt-4 text-right font-bold">
          <p>${totalWorkLabel}: ${fmtTotal(totals.workMinutes)}</p>
          <p>${totalNightLabel}: ${fmtTotal(totals.nightWorkMinutes)}</p>
        </div>
        ${absenceFooterHtml}
        ${workedDaysHtml}
        ${reportEmojiLegendHtml}
        ${buildTrailerContainerReportHtml(records, i18n, getEffectiveReportSettings())}
      </div>`;
  }

  function generateMonthTableHTML(records, year, month, i18n, reportLang, includeNoteColumn, includeVehicleColumn, includeDistanceColumn) {
    var monthRows = getMonthReportRows(year, month);
    var dayNames = [
      (i18n && i18n.reportDaySunday) || 'Sunday',
      (i18n && i18n.reportDayMonday) || 'Monday',
      (i18n && i18n.reportDayTuesday) || 'Tuesday',
      (i18n && i18n.reportDayWednesday) || 'Wednesday',
      (i18n && i18n.reportDayThursday) || 'Thursday',
      (i18n && i18n.reportDayFriday) || 'Friday',
      (i18n && i18n.reportDaySaturday) || 'Saturday'
    ];
    var fmtTable = formatDurationSimple;
    var html = '';
    var mStr = String(month).padStart(2, '0');

    monthRows.forEach(function (row) {
      var dateStr = row.date;
      var dayParts = dateStr.split('-');
      var dayNum = parseInt(dayParts[2], 10);
      var dayOfWeek = new Date(dateStr + 'T00:00:00').getDay();
      var isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      var rowClass = isWeekend ? 'bg-gray-50 dark:bg-gray-900/50' : '';
      var bgAttr = htmlRowBackgroundStyle(row);
      var record = row.sourceRecord;
      var entryType = row.isEmpty ? '' : (row.entryType || 'workday');
      var dayKinds = (!row.isEmpty && record) ? getReportStatusIconKinds(record, entryType, row.date) : [];
      var iconsHtml = buildReportStatusIconsHtml(dayKinds);
      var dateLine1 = String(dayNum).padStart(2, '0') + '.' + mStr + '.' + (iconsHtml ? ' ' + iconsHtml : '');

      html += '<tr class="' + rowClass + '"' + bgAttr + '>';
      html += '<td class="border p-2 font-semibold">' + dateLine1 + '<br><span class="text-xs font-normal text-gray-600">' + dayNames[dayOfWeek] + '</span></td>';

      if (row.isEmpty) {
        html += '<td class="border p-2" colspan="' + (7 + (includeDistanceColumn ? 1 : 0) + (includeVehicleColumn ? 1 : 0) + (includeNoteColumn ? 1 : 0)) + '"></td></tr>';
        return;
      }

      var isNoteDay = entryType === 'noteDay';
      var crossingsText = isNoteDay ? '' : formatCrossingsForReportRow(row, record, i18n, '<br>');
      var noteText = (row.note && String(row.note).trim()) ? String(row.note).trim() : '';
      var noteCell = includeNoteColumn ? buildReportNoteCell(record, entryType, noteText, i18n) : '';
      var workText = isNoteDay ? '' : fmtTable(row.workDurationMinutes || 0);
      var nightText = isNoteDay ? '' : fmtTable(row.nightDurationMinutes || 0);

      html += '<td class="border p-2">' + (isNoteDay ? '' : getReportRowDisplayBeginTime(row)) + '</td>';
      html += '<td class="border p-2">' + (isNoteDay ? '' : (row.beginLocation || '')) + '</td>';
      html += '<td class="border p-2">' + (isNoteDay ? '' : getReportRowDisplayEndTime(row)) + '</td>';
      html += '<td class="border p-2">' + (isNoteDay ? '' : (row.endLocation || '')) + '</td>';
      html += '<td class="border p-2 text-xs">' + crossingsText + '</td>';
      html += '<td class="border p-2 text-right font-mono">' + workText + '</td>';
      html += '<td class="border p-2 text-right font-mono">' + nightText + '</td>';
      if (includeDistanceColumn) {
        var distCell = isNoteDay ? { content: '' } : ((typeof window.VehicleSegments !== 'undefined' && window.VehicleSegments.formatReportDistanceCell)
          ? window.VehicleSegments.formatReportDistanceCell(record, '<br>', i18n)
          : { content: (record && record.kmDriven > 0) ? (record.kmDriven + ' km') : '' });
        var distHtml = distCell.content ? String(distCell.content).replace(/</g, '&lt;') : '';
        if (distCell.boldLastLine && distCell.content) {
          var distParts = String(distCell.content).split('\n');
          if (distParts.length > 1) {
            var distHead = distParts.slice(0, -1).join('<br>').replace(/</g, '&lt;');
            var distTail = distParts[distParts.length - 1].replace(/</g, '&lt;');
            distHtml = distHead + '<br><span class="font-semibold">' + distTail + '</span>';
          }
        }
        html += '<td class="border p-2 text-xs text-right font-mono whitespace-nowrap">' + distHtml + '</td>';
      }
      if (includeVehicleColumn) {
        var vehiclePlate = isNoteDay ? '' : ((typeof window.VehicleSegments !== 'undefined' && window.VehicleSegments.formatReportVehicleCell)
          ? window.VehicleSegments.formatReportVehicleCell(record, '<br>')
          : ((typeof window.EntryVehicleField !== 'undefined' && window.EntryVehicleField.getRecordVehiclePlate)
            ? window.EntryVehicleField.getRecordVehiclePlate(record)
            : ''));
        html += '<td class="border p-2 text-xs whitespace-nowrap">' + (vehiclePlate ? String(vehiclePlate).replace(/</g, '&lt;') : '') + '</td>';
      }
      if (includeNoteColumn) {
        html += '<td class="border p-2 text-xs">' + noteCell + '</td>';
      }
      html += '</tr>';
    });
    return html;
  }

  async function generateAndProcessPDF(action = 'save') {
    if (typeof window.ensureJsPdf === 'function') {
      try { await window.ensureJsPdf(); } catch (pdfLoadErr) {
        console.error('[Report] jsPDF load failed:', pdfLoadErr);
        if (typeof showCustomAlert === 'function') {
          showCustomAlert('PDF könyvtár betöltése sikertelen. Ellenőrizd a hálózatot.', 'info');
        }
        return;
      }
    }
    const reportLang = (typeof window !== 'undefined' && typeof window.getReportLanguage === 'function')
      ? window.getReportLanguage()
      : ((typeof currentLang === 'string' && currentLang) ? currentLang : (localStorage.getItem('language') || 'hu'));
    const i18n = (typeof translations !== 'undefined' && translations[reportLang]) ? translations[reportLang] : (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang]) ? translations[currentLang] : {};
    const userName = localStorage.getItem('userName');
    if (!userName || userName.trim() === '') {
      showCustomAlert(t('alertReportNameMissing'), 'info');
      return;
    }
    if (currentMonthRecords.length === 0) {
        showCustomAlert(t('noEntries'), 'info');
        return;
    }

    let reportSettings = getEffectiveReportSettings();

    const selectedMonth = document.getElementById('monthSelector') ? document.getElementById('monthSelector').value : '';
    const yearMonthParts = selectedMonth ? selectedMonth.split('-') : ['', ''];
    const year = yearMonthParts[0];
    const month = yearMonthParts[1];
    const monthReportRowsPdf = getMonthReportRows(year, month);

    try {
      const hasAnyUserNote = Array.isArray(currentMonthRecords) && currentMonthRecords.some(function (r) {
        return !!(r && r.note && String(r.note).trim().length > 0);
      });
      reportSettings = Object.assign({}, reportSettings, {
        showNote: !!(reportSettings.showNote && hasAnyUserNote)
      });
    } catch (_) {}

    const vehicleDisplay = (typeof window.EntryVehicleField !== 'undefined' && window.EntryVehicleField.computeReportVehicleDisplay)
      ? window.EntryVehicleField.computeReportVehicleDisplay(monthReportRowsPdf, reportSettings)
      : { uniquePlates: [], headerPlate: null, perRow: false };
    const hasMultiSegmentDaysPdf = !!(reportSettings.showVehicle && Array.isArray(monthReportRowsPdf) && monthReportRowsPdf.some(function (row) {
      return row && row.sourceRecord && typeof window.VehicleSegments !== 'undefined'
        && window.VehicleSegments.recordHasMultipleVehicleSegments(row.sourceRecord);
    }));
    const vehiclePerRowMode = !!(reportSettings.showVehicle && (vehicleDisplay.perRow || hasMultiSegmentDaysPdf));
    const reportVehicleHeaderLine = (reportSettings.showVehicle && vehicleDisplay.headerPlate)
      ? ((i18n.reportVehicleHeaderLabel || i18n.recordVehicleLabel || 'Jármű') + ': ' + vehicleDisplay.headerPlate)
      : null;
    const tableStartY = reportVehicleHeaderLine ? 46 : 40;
    const tableMarginTop = reportVehicleHeaderLine ? 41 : 35;

    // Oszlopszám meghatározása: alap 8 + opcionális vezetés + km-blokk + jármű + megjegyzés
    const extraColumns = (reportSettings.showDriveTime ? 1 : 0) + (reportSettings.showKmBlock ? 1 : 0) + (vehiclePerRowMode ? 1 : 0) + (reportSettings.showNote ? 1 : 0);
    const totalColumns = 8 + extraColumns;
    // Ha 9+ oszlop van, fekvő (landscape) elrendezés
    const orientation = totalColumns >= 9 ? 'l' : 'p';

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF(orientation, 'mm', 'a4');
      const preferredFont = await loadLocalReportFont(doc);
      const monthIndex = parseInt(month, 10) - 1;
      const locale = (reportLang === 'de'
        ? 'de-DE'
        : reportLang === 'en'
          ? 'en-US'
          : reportLang === 'ro'
            ? 'ro-RO'
            : reportLang === 'pl'
              ? 'pl-PL'
              : reportLang === 'da'
                ? 'da-DK'
                : reportLang === 'no'
                  ? 'nb-NO'
                  : 'hu-HU');
      const monthName = new Date(year, monthIndex, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      
      // Fekvő módban a középpont más (A4 landscape: 297mm széles)
      const pageCenterX = orientation === 'l' ? 148.5 : 105;

      function addHeader(doc) {
        try { doc.setFont(preferredFont, 'bold'); } catch(_) { try { doc.setFont(preferredFont, 'normal'); } catch(_) {} }
        doc.setFontSize(16);
        const headerTitle = i18n.reportHeaderTitle || 'Working time record';
        doc.text(headerTitle, pageCenterX, 15, { align: 'center' });
        try { doc.setFont(preferredFont, 'normal'); } catch(_) {}
        doc.setFontSize(12);
        doc.text(userName, pageCenterX, 22, { align: 'center' });
        doc.text(monthName, pageCenterX, 29, { align: 'center' });
        if (reportVehicleHeaderLine) {
          doc.setFontSize(11);
          doc.text(reportVehicleHeaderLine, pageCenterX, 36, { align: 'center' });
        }
      }

      function addFooter(doc) {
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        
        try { doc.setFont(preferredFont, 'normal'); } catch(_) {}
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        
        const footerText = i18n.reportFooter || (reportLang === 'de' ? 'Erstellt mit GuriGO - gurigo.eu' : (reportLang === 'en' ? 'Created with GuriGO - gurigo.eu' : 'Készült a GuriGO-val - gurigo.eu'));
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
        
        doc.setTextColor(0, 0, 0);
      }

      addHeader(doc);

      // Dinamikus fejlécek a reportSettings alapján (i18n)
      let headers = [
        i18n.reportColDate || 'Date',
        i18n.reportColStart || 'Start',
        i18n.reportColLocation || 'Location',
        i18n.reportColEnd || 'End',
        i18n.reportColLocation || 'Location',
        i18n.reportColCrossings || 'Border crossings',
        i18n.reportColWork || 'Work',
        i18n.reportColNight || 'Night'
      ];
      if (!reportSettings.showStartTime) headers[1] = '';
      if (!reportSettings.showStartLocation) headers[2] = '';
      if (!reportSettings.showEndTime) headers[3] = '';
      if (!reportSettings.showEndLocation) headers[4] = '';
      if (!reportSettings.showCrossings) headers[5] = '';
      if (!reportSettings.showWorkTime) headers[6] = '';
      if (!reportSettings.showNightTime) headers[7] = '';

      if (reportSettings.showDriveTime) {
        headers.push(i18n.reportColDrive || 'Driving');
      }
      if (reportSettings.showKmBlock) {
        headers.push(i18n.reportColKm || 'Distance');
      }
      if (vehiclePerRowMode) {
        headers.push(i18n.reportFieldVehicle || 'Vehicle');
      }
      if (reportSettings.showNote) {
        headers.push(i18n.reportColNote || 'Note');
      }

      const autoTableBody = [];
      const reportRowsMeta = [];
      const dayNames = [
        i18n.reportDaySunday || 'Sunday',
        i18n.reportDayMonday || 'Monday',
        i18n.reportDayTuesday || 'Tuesday',
        i18n.reportDayWednesday || 'Wednesday',
        i18n.reportDayThursday || 'Thursday',
        i18n.reportDayFriday || 'Friday',
        i18n.reportDaySaturday || 'Saturday'
      ];
      const fmtTable = formatDurationSimple;

      monthReportRowsPdf.forEach(function (row) {
          reportRowsMeta.push(row);
          var dateStr = row.date;
          var dayParts = dateStr.split('-');
          var dayNum = parseInt(dayParts[2], 10);
          var mPad = String(month).padStart(2, '0');
          var dow = new Date(dateStr + 'T00:00:00').getDay();
          var dateCell = String(dayNum).padStart(2, '0') + '.' + mPad + '.\n' + dayNames[dow];

          if (row.isEmpty) {
              var emptyRow = [dateCell, '', '', '', '', '', '', ''];
              if (reportSettings.showDriveTime) emptyRow.push('');
              if (reportSettings.showKmBlock) emptyRow.push('');
              if (vehiclePerRowMode) emptyRow.push('');
              if (reportSettings.showNote) emptyRow.push('');
              autoTableBody.push(emptyRow);
              return;
          }

          var record = row.sourceRecord;
          var entryType = row.entryType || 'workday';
          var isNoteDay = entryType === 'noteDay';
          var crossingsText = isNoteDay ? '' : formatCrossingsForReportRow(row, record, i18n, '\n');
          var noteText = (row.note && String(row.note).trim()) ? String(row.note).trim() : '';
          var notePdfCell = buildReportNoteCell(record, entryType, noteText, i18n);
          var workText = isNoteDay ? '' : fmtTable(row.workDurationMinutes || 0);
          var nightText = isNoteDay ? '' : fmtTable(row.nightDurationMinutes || 0);
          var driveText = isNoteDay ? '' : fmtTable(row.driveDurationMinutes || 0);

          var tableRow = [
              dateCell,
              reportSettings.showStartTime ? (isNoteDay ? '' : getReportRowDisplayBeginTime(row)) : '',
              reportSettings.showStartLocation ? (isNoteDay ? '' : (row.beginLocation || '')) : '',
              reportSettings.showEndTime ? (isNoteDay ? '' : getReportRowDisplayEndTime(row)) : '',
              reportSettings.showEndLocation ? (isNoteDay ? '' : (row.endLocation || '')) : '',
              reportSettings.showCrossings ? crossingsText : '',
              { content: reportSettings.showWorkTime ? workText : '', styles: { halign: 'right' } },
              { content: reportSettings.showNightTime ? nightText : '', styles: { halign: 'right' } }
          ];

          if (reportSettings.showDriveTime) {
              tableRow.push({ content: driveText, styles: { halign: 'right' } });
          }

          if (reportSettings.showKmBlock) {
              var distCellPdf = isNoteDay
                ? { content: '', boldLastLine: false, totalKm: null }
                : ((typeof window.VehicleSegments !== 'undefined' && window.VehicleSegments.formatReportDistanceCell)
                  ? window.VehicleSegments.formatReportDistanceCell(record, '\n', i18n)
                  : { content: (record && record.kmDriven > 0) ? (record.kmDriven + ' km') : '', boldLastLine: false, totalKm: (record && record.kmDriven) || null });
              tableRow.push({
                  content: distCellPdf.content || '',
                  styles: { halign: 'right' },
                  _distanceBoldLastLine: !!distCellPdf.boldLastLine,
                  _kmDriven: distCellPdf.totalKm
              });
          }

          if (vehiclePerRowMode) {
              var vehiclePlate = isNoteDay ? '' : ((typeof window.VehicleSegments !== 'undefined' && window.VehicleSegments.formatReportVehicleCell)
                ? window.VehicleSegments.formatReportVehicleCell(record, '\n')
                : ((typeof window.EntryVehicleField !== 'undefined' && window.EntryVehicleField.getRecordVehiclePlate)
                  ? window.EntryVehicleField.getRecordVehiclePlate(record)
                  : ''));
              tableRow.push(vehiclePlate || '');
          }

          if (reportSettings.showNote) {
              tableRow.push(notePdfCell ? String(notePdfCell) : '');
          }

          autoTableBody.push(tableRow);
      });

      ['vacation', 'sick', 'holiday', 'noteDay'].forEach(function (k) {
        try { buildReportStatusIconDataUrl(k); } catch (_) {}
      });

      const columnStyles = {
          0: { cellWidth: 22 },
          5: { cellWidth: 30 },
          6: { cellWidth: 18 },
          7: { cellWidth: 18 }
      };
      var optionalColIdx = 8;
      if (reportSettings.showDriveTime) {
          columnStyles[optionalColIdx] = { cellWidth: 18 };
          optionalColIdx++;
      }
      if (reportSettings.showKmBlock) {
          columnStyles[optionalColIdx] = { cellWidth: 26, halign: 'right' };
          optionalColIdx++;
      }
      if (vehiclePerRowMode) {
          columnStyles[optionalColIdx] = { cellWidth: 30, minCellWidth: 28 };
          optionalColIdx++;
      }

      doc.autoTable({
          startY: tableStartY,
          head: [headers],
          body: autoTableBody,
          theme: 'grid',
          headStyles: { fillColor: [230, 230, 230], textColor: 20, fontStyle: 'bold', font: preferredFont },
          styles: { font: preferredFont, fontSize: 8, cellPadding: 1.5, valign: 'middle' },
          columnStyles: columnStyles,
          didParseCell: function(data) {
              if (data.section === 'body') {
                  var meta = reportRowsMeta[data.row.index];
                  if (meta && meta.rowBackgroundType && typeof getReportRowBackgroundRgb === 'function') {
                      var rgb = getReportRowBackgroundRgb(meta.rowBackgroundType);
                      if (rgb) {
                          data.cell.styles.fillColor = rgb;
                          return;
                      }
                  }
                  if (meta && !meta.isEmpty) {
                      var dow = new Date(meta.date + 'T00:00:00').getDay();
                      if (dow === 0 || dow === 6) {
                          data.cell.styles.fillColor = '#f2f2f2';
                      }
                  }
              }
          },
          didDrawCell: function(data) {
              if (data.section === 'body' && data.column.index === 0) {
                  var metaIcon = reportRowsMeta[data.row.index];
                  var rec0 = metaIcon && metaIcon.sourceRecord ? metaIcon.sourceRecord : null;
                  if (rec0) {
                    var et0 = (metaIcon && metaIcon.entryType) ? metaIcon.entryType : ((rec0.entryType) ? rec0.entryType : 'workday');
                    var kinds0 = getReportStatusIconKinds(rec0, et0, metaIcon.date);
                    if (kinds0.length) {
                      var iconMm = 3.9;
                      var gapMm = 0.45;
                      var padR = data.cell.padding('right');
                      var xI = data.cell.x + data.cell.width - padR;
                      var yI = data.cell.y + data.cell.padding('top') + 0.6;
                      for (var ii = kinds0.length - 1; ii >= 0; ii--) {
                        var durl = buildReportStatusIconDataUrl(kinds0[ii]);
                        if (!durl) continue;
                        xI -= iconMm;
                        try { doc.addImage(durl, 'PNG', xI, yI, iconMm, iconMm); } catch (_) {}
                        xI -= gapMm;
                      }
                    }
                  }
              }
              // Távolság oszlop: összesítő sor vastagon (több szakasz)
              if (data.section === 'body' && data.cell.raw && data.cell.raw._distanceBoldLastLine) {
                  const cellText = String(data.cell.raw.content || '');
                  const lines = cellText.split('\n');
                  if (lines.length > 1) {
                      const fontSize = data.cell.styles.fontSize || 8;
                      const mmPerPt = 0.3527777778;
                      const lineHeight = fontSize * mmPerPt * 1.15;

                      const textX = data.cell.x + data.cell.width - data.cell.padding('right');
                      const firstLineY = (data.cell && data.cell.textPos && typeof data.cell.textPos.y === 'number')
                        ? data.cell.textPos.y
                        : (data.cell.y + data.cell.padding('top') + lineHeight);
                      const lastLineY = firstLineY + (lineHeight * (lines.length - 1));
                      const cellBottomY = (data.cell.y + data.cell.height) - data.cell.padding('bottom');

                      if (lastLineY <= cellBottomY) {
                          try { doc.setFont(preferredFont, 'bold'); } catch(_) {}
                          doc.setFontSize(fontSize);
                          doc.setTextColor(0, 0, 0);
                          doc.text(lines[lines.length - 1], textX, lastLineY, { align: 'right' });
                          try { doc.setFont(preferredFont, 'normal'); } catch(_) {}
                      }
                  }
              }
          },
          didDrawPage: function(data) {
              if (data.pageNumber > 1) {
                  addHeader(doc);
              }
              addFooter(doc);
          },
          margin: { top: tableMarginTop, bottom: 20 },
          pageBreak: 'auto',
          rowPageBreak: 'avoid',
          showHead: 'everyPage'
      });
      
      const finalY = doc.lastAutoTable.finalY + 10;
      const totalsFromRows = (typeof computeTotalsFromReportRows === 'function')
        ? computeTotalsFromReportRows(monthReportRowsPdf)
        : { workMinutes: 0, nightWorkMinutes: 0, driveMinutes: 0, kmDriven: 0 };
      const totals = {
        work: totalsFromRows.workMinutes || 0,
        night: totalsFromRows.nightWorkMinutes || 0,
        drive: totalsFromRows.driveMinutes || 0,
        kmDriven: totalsFromRows.kmDriven || 0
      };

      const absStatsPdf = computeReportAbsenceStats(currentMonthRecords, year);
      const workedDaysPdf = (typeof countWorkedDaysFromReportRows === 'function')
        ? countWorkedDaysFromReportRows(monthReportRowsPdf)
        : countWorkedShiftDaysInMonth(currentMonthRecords, year, month);
      const pdfKindsUsedInLegend = collectReportStatusKindsUsedInMonth(currentMonthRecords);
      const footerVacTplP = (i18n && i18n.reportFooterVacation) || 'Vacation: {{m}} days (in {{y}}: {{z}})';
      const footerSickTplP = (i18n && i18n.reportFooterSick) || 'Sick leave: {{m}} days';
      const footerHolTplP = (i18n && i18n.reportFooterHolidayUnique) || 'Public holidays (unique days): {{m}} days';
      const footerWorkedTplP = (i18n && i18n.reportFooterWorkedDays) || 'Days worked: {{m}}';
      const substP = function (tpl, vars) {
        let s = String(tpl);
        Object.keys(vars).forEach(function (k) {
          s = s.split('{{' + k + '}}').join(String(vars[k]));
        });
        return s;
      };

      const pageHeight = doc.internal.pageSize.height;
      // Km összesítés szöveg (ha be van kapcsolva)
      const totalKmLabel = i18n.reportTotalKm || 'Total distance';

      function drawTotalsBlock(doc, y0) {
        try { doc.setFont(preferredFont, 'bold'); } catch(_) { try { doc.setFont(preferredFont, 'normal'); } catch(_) {} }
        doc.setFontSize(10);
        const totalWorkLabel = i18n.reportTotalWork || 'Total work time';
        const totalNightLabel = i18n.reportTotalNight || 'Total night time';
        const totalDriveLabel = i18n.reportTotalDrive || 'Total driving time';
        const fmt = function (mins) { return formatDuration(mins, reportLang); };
        let y = y0;
        doc.text(`${totalWorkLabel}: ${fmt(totals.work)}`, 14, y);
        y += 7;
        doc.text(`${totalNightLabel}: ${fmt(totals.night)}`, 14, y);
        y += 7;
        if (reportSettings.showDriveTime) {
          doc.text(`${totalDriveLabel}: ${fmt(totals.drive)}`, 14, y);
          y += 7;
        }
        if (reportSettings.showKmBlock) {
          doc.text(`${totalKmLabel}: ${totals.kmDriven} km`, 14, y);
          y += 7;
        }
        if (absStatsPdf.vacationDaysMonth > 0) {
          doc.text(substP(footerVacTplP, { m: absStatsPdf.vacationDaysMonth, y: year, z: absStatsPdf.vacationDaysYear }), 14, y);
          y += 7;
        }
        if (absStatsPdf.sickDaysMonth > 0) {
          doc.text(substP(footerSickTplP, { m: absStatsPdf.sickDaysMonth }), 14, y);
          y += 7;
        }
        if (absStatsPdf.holidayUniqueMonth > 0) {
          doc.text(substP(footerHolTplP, { m: absStatsPdf.holidayUniqueMonth }), 14, y);
          y += 7;
        }
        doc.text(substP(footerWorkedTplP, { m: workedDaysPdf }), 14, y);
        y += 7;
        try { doc.setFont(preferredFont, 'normal'); } catch (_) {}
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        function ensureLegendSpace() {
          if (y > pageHeight - 28) {
            doc.addPage();
            addHeader(doc);
            addFooter(doc);
            y = reportVehicleHeaderLine ? 56 : 50;
          }
        }
        ensureLegendSpace();
        y += 2;
        ensureLegendSpace();
        if (pdfKindsUsedInLegend.length) {
          const legTitle = (i18n && i18n.reportIconLegendTitle) || (i18n && i18n.reportEmojiLegendTitle) || 'Legend';
          doc.text(legTitle, 14, y);
          y += 5;
          var iconLegMm = 4;
          buildReportPdfLegendIconRows(i18n, pdfKindsUsedInLegend).forEach(function (row) {
            ensureLegendSpace();
            var durl = buildReportStatusIconDataUrl(row.kind);
            var textY = y + iconLegMm * 0.74;
            if (durl) {
              try { doc.addImage(durl, 'PNG', 14, y, iconLegMm, iconLegMm); } catch (_) {}
              try { doc.setFont(preferredFont, 'normal'); } catch (_) {}
              doc.setFontSize(8);
              doc.text(String(row.label || ''), 14 + iconLegMm + 1.6, textY);
            } else {
              doc.text(String(row.label || ''), 14, textY);
            }
            y += 5.6;
          });
        }
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);

        // Pótkocsi / Konténer események (riport kapcsoló szerint)
        var tcLines = buildTrailerContainerReportLines(currentMonthRecords, i18n, reportSettings);
        if (tcLines.length) {
          ensureLegendSpace();
          y += 2;
          ensureLegendSpace();
          try { doc.setFont(preferredFont, 'bold'); } catch (_) {}
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          doc.text(String((i18n && i18n.reportTrailerContainerTitle) || ''), 14, y);
          y += 5;
          try { doc.setFont(preferredFont, 'normal'); } catch (_) {}
          doc.setFontSize(8);
          tcLines.forEach(function (line) {
            ensureLegendSpace();
            doc.text(String(line), 14, y);
            y += 5;
          });
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(10);
        }
        return y;
      }

      if (finalY > pageHeight - 30) {
        doc.addPage();
        addHeader(doc);
        addFooter(doc);
        drawTotalsBlock(doc, 50);
      } else {
        drawTotalsBlock(doc, finalY);
      }

      const filePrefix = i18n.reportFileNamePrefix || 'Work_record';
      const fileName = `${filePrefix}_${userName.replace(/ /g, "_")}_${selectedMonth}.pdf`;
      
      if (action === 'save') {
        generatedPdfBlob = doc.output('blob');
        const openedInViewer = openReportPdfInViewer();
        if (openedInViewer) {
          // iOS-on a blob letöltés közvetlen PDF-megnyitást okoz, overlay elé kerülne
          if (!isIosPdfInlineOpenRisk()) {
            triggerReportPdfDownload(fileName);
          }
        } else if (!triggerReportPdfDownload(fileName)) {
          doc.save(fileName);
        }
      } else if (action === 'prepare_share') {
        generatedPdfBlob = doc.output('blob');
        const shareContainer = document.getElementById('monthlyReportContent');
        
        const shareText = i18n.reportPdfReady || 'PDF created successfully!';
        const shareButtonText = i18n.reportShareButton || '📲 Share / Open';
        const downloadButtonText = i18n.reportDownloadButton || '📥 Download';
        
        shareContainer.innerHTML = `
          <div class="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg text-center space-y-3">
            <p class="font-semibold mb-2">${shareText}</p>
            <button class="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold" onclick="sharePreparedPDF('${fileName}')">
              ${shareButtonText}
            </button>
            <button class="w-full bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg text-sm" onclick="window.exportToPDF()">
              ${downloadButtonText}
            </button>
          </div>
        `;
      }
    } catch (e) {
      console.error("PDF Hiba:", e);
      const prefix = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang] && translations[currentLang].errorPdfGeneration) ? translations[currentLang].errorPdfGeneration : 'Hiba történt a PDF generálása közben:';
      const msg = `${prefix} ${e && e.message ? e.message : ''}`.trim();
      showCustomAlert(msg, 'info');
    }
  }

  function isIosPdfInlineOpenRisk() {
    try {
      if (typeof window.isNativeIosAppShell === 'function' && window.isNativeIosAppShell()) {
        return true;
      }
      if (typeof window.detectPlatform === 'function' && window.detectPlatform() === 'ios') {
        return true;
      }
    } catch (_) {}
    return /iphone|ipad|ipod/i.test((navigator.userAgent || ''));
  }

  function triggerReportPdfDownload(fileName) {
    if (!generatedPdfBlob) return false;
    try {
      const downloadUrl = URL.createObjectURL(generatedPdfBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      return true;
    } catch (downloadErr) {
      console.warn('[Report] Anchor download failed', downloadErr);
      return false;
    }
  }

  function getReportPdfViewerTitle() {
    if (t('pdfViewerTitle') !== 'pdfViewerTitle') {
      return t('pdfViewerTitle');
    }
    return (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang])
      ? (translations[currentLang].reportMonthlyReportTitle || 'Report')
      : 'Report';
  }

  function openReportPdfInViewer() {
    if (!generatedPdfBlob) return false;
    const blobUrl = URL.createObjectURL(generatedPdfBlob);
    const viewerOptions = {
      title: getReportPdfViewerTitle(),
      trackBlobUrl: true,
      blob: generatedPdfBlob
    };
    if (typeof window.openGurigoPdfViewer === 'function') {
      return window.openGurigoPdfViewer(blobUrl, viewerOptions);
    }

    // Tartalék, ha a pdfViewer.js script cache miatt nem töltődött be
    const backLabel = t('pdfViewerBack') !== 'pdfViewerBack' ? t('pdfViewerBack') : 'Back';
    const existing = document.getElementById('gurigoPdfViewerOverlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'gurigoPdfViewerOverlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;background:#f3f4f6';
    overlay.innerHTML =
      '<div style="min-height:calc(52px + env(safe-area-inset-top,0px));padding-top:env(safe-area-inset-top,0px);padding:env(safe-area-inset-top,0px) 12px 0 12px;display:flex;align-items:center;gap:12px;background:#fff;color:#111;border-bottom:1px solid rgba(0,0,0,.14);box-shadow:0 1px 4px rgba(0,0,0,.1);flex-shrink:0">' +
        '<button type="button" id="gurigoPdfViewerBackBtn" style="min-height:40px;border:0;border-radius:10px;padding:8px 12px;background:transparent;color:inherit;font-size:16px;font-weight:700;cursor:pointer">\u2190 ' + backLabel + '</button>' +
        '<div style="font-size:15px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1">' + viewerOptions.title + '</div>' +
      '</div>' +
      '<iframe title="' + viewerOptions.title + '" style="width:100%;flex:1;border:0;background:#f3f4f6" src="' + blobUrl + '"></iframe>';
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.querySelector('#gurigoPdfViewerBackBtn').addEventListener('click', function () {
      const iframe = overlay.querySelector('iframe');
      if (iframe) iframe.src = 'about:blank';
      overlay.remove();
      document.body.style.overflow = '';
      try { URL.revokeObjectURL(blobUrl); } catch (_) {}
    });
    return true;
  }

  async function sharePreparedPDF(fileName) {
    if (!generatedPdfBlob) {
        const i18nShare = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang]) ? translations[currentLang] : {};
        const msg = i18nShare.reportNoPreparedPdf || 'Error: No prepared PDF available for sharing.';
        showCustomAlert(msg, 'info');
        return;
    }

    if (openReportPdfInViewer()) {
        return;
    }

    if (navigator.share && navigator.canShare) {
        const pdfFile = new File([generatedPdfBlob], fileName, { type: 'application/pdf' });
        
        if (navigator.canShare({ files: [pdfFile] })) {
            try {
                const shareTitle = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined' && translations[currentLang]) ? (translations[currentLang].reportMonthlyReportTitle || 'Havi Riport') : 'Havi Riport';
                await navigator.share({
                    files: [pdfFile],
                    title: shareTitle,
                    text: fileName
                });
                return;
            } catch (error) {
                console.error("Megosztási hiba:", error);
                
                if (error.name === 'AbortError') {
                    return;
                }
                
                console.log('[Report] Share failed, trying fallback method...');
            }
        }
    }
    
    try {
        const blobUrl = URL.createObjectURL(generatedPdfBlob);
        const openedWindow = window.open(blobUrl, '_blank');
        if (openedWindow) {
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            return;
        }
    } catch (e) {
        console.error('[Report] Fallback 1 failed:', e);
    }
    
    try {
        const blobUrl = URL.createObjectURL(generatedPdfBlob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        const successMsg = (typeof t === 'function')
          ? t('reportDownloadStarted', 'PDF letöltése megkezdődött. Letöltés után megoszthatod.')
          : 'PDF letöltése megkezdődött. Letöltés után megoszthatod.';
        if (typeof showCustomAlert === 'function') {
          showCustomAlert(successMsg, 'success');
        }
        
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
        console.error('[Report] Fallback 2 failed:', e);
        const errorMsg = (typeof t === 'function')
          ? t('reportShareErrorUseDownload', 'Megosztás nem sikerült. Kérlek használd a Letöltés gombot.')
          : 'Megosztás nem sikerült. Kérlek használd a Letöltés gombot.';
        if (typeof showCustomAlert === 'function') {
          showCustomAlert(errorMsg, 'info');
        }
    }
}

  function initMonthlyReport() {
    const monthSelector = document.getElementById('monthSelector');
    if (monthSelector && !monthSelector.value) {
      const now = new Date();
      monthSelector.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    if (typeof window.initReportPageSettingsUI === 'function') {
      window.initReportPageSettingsUI();
    }
    const reportContent = document.getElementById('monthlyReportContent');
    if (reportContent) reportContent.innerHTML = '';
    
    const pdfExportBtn = document.getElementById('pdfExportBtn');
    const pdfShareBtn = document.getElementById('pdfShareBtn');
    if (pdfExportBtn) pdfExportBtn.classList.add('hidden');
    if (pdfShareBtn) pdfShareBtn.classList.add('hidden');
  }

  // Globális függvények
  window.initMonthlyReport = initMonthlyReport;
  window.generateMonthlyReport = generateMonthlyReport;
  window.exportToPDF = () => generateAndProcessPDF('save');
  window.sharePDF = () => generateAndProcessPDF('prepare_share');
  window.sharePreparedPDF = sharePreparedPDF;
  // Pótkocsi / Konténer riport építők (tesztelhetőség)
  window.buildTrailerContainerReportHtml = buildTrailerContainerReportHtml;
  window.buildTrailerContainerReportLines = buildTrailerContainerReportLines;

// === MODERN TOAST ÉRTESÍTÉS ===
function showToast(title, message = '', type = 'success', options = {}) {
  const { position = 'top', duration = 4200, action } = options;
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  container.dataset.position = position;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon" aria-hidden="true">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    ${action ? `<button class="toast-action">${action.label}</button>` : ''}
    <button class="toast-close" aria-label="Close">✖</button>
  `;

  const close = () => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 250);
  };
  toast.querySelector('.toast-close').addEventListener('click', close);
  if (action && typeof action.onClick === 'function') {
    toast.querySelector('.toast-action')?.addEventListener('click', (e) => {
      e.stopPropagation();
      action.onClick();
      close();
    });
  }
  setTimeout(close, duration);

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
}

})();