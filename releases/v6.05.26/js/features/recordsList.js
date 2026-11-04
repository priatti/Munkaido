var ABSENCE_RANGE_MAX_DAYS = 60;

function getRecordPendingBadgeHtml(i18n, recordId) {
    if (typeof window.getRecordSyncStatusBadgesHtml === 'function') {
        return window.getRecordSyncStatusBadgesHtml(recordId, i18n);
    }
    if (typeof window.isRecordPendingSync !== 'function' || !window.isRecordPendingSync(recordId)) return '';
    if (typeof window.getRecordSyncPendingBadgeHtml === 'function') {
        return window.getRecordSyncPendingBadgeHtml(i18n);
    }
    return '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-800 border border-sky-200">☁️ ' + ((i18n && i18n.syncPending) || 'Szinkronizálásra vár') + '</span>';
}

function canShowRecordEditActions(record) {
    if (typeof navigator === 'undefined' || navigator.onLine) return true;
    if (typeof window.canEditRecordOffline === 'function') return window.canEditRecordOffline(record);
    return false;
}

function renderRecordEditActionsHtml(recordId, record) {
    if (!canShowRecordEditActions(record)) return '';
    return '<button onclick="editRecord(\'' + recordId + '\')" class="text-blue-500 p-1">✏️</button>'
        + '<button onclick="confirmDeleteRecord(\'' + recordId + '\')" class="text-red-500 p-1">🗑️</button>';
}

function notifyWorkdaySaveResult(result, i18n, fallbackSuccessKey) {
    if (typeof window.showWorkdaySaveResultAlert === 'function') {
        window.showWorkdaySaveResultAlert(result, i18n);
        return;
    }
    if (result && result.status === 'savedPendingSync') {
        showCustomAlert((i18n && i18n.savedOffline) || 'Mentve offline módban – online állapotban szinkronizálódik.', 'info');
        return;
    }
    showCustomAlert((i18n && i18n[fallbackSuccessKey]) || (i18n && i18n.alertSaveSuccess) || 'Mentés sikeres.', 'success');
}

function isFullDayAbsenceRangeKind(kind) {
    return kind === 'vacation' || kind === 'sick';
}

function getAbsenceRangeTexts(i18n, kind) {
    if (kind === 'sick') {
        return {
            startLabel: i18n.sickStartLabel || 'Betegség kezdete',
            endLabel: i18n.sickEndLabel || 'Betegség vége',
            endBeforeStart: i18n.sickEndBeforeStart || i18n.vacationEndBeforeStart || 'A záró dátum nem lehet korábbi, mint a kezdő dátum.',
            maxDays: i18n.sickMaxDays || 'Egyszerre legfeljebb 60 nap betegség rögzíthető.',
            rangeSummary: i18n.sickRangeSummary || 'Mentésre kerül: %COUNT% betegnap',
            saveRange: i18n.saveSickRange || 'Betegség mentése (%COUNT% nap)',
            conflictWorkday: i18n.sickConflictWorkday || 'A következő napokon már van munkanap rögzítve: %DATES%. Ezekre nem menthető betegség.',
            conflictNoteDay: i18n.sickConflictNoteDay || 'A következő napokon már van más típusú nap rögzítve: %DATES%. Ezekre nem menthető betegség.',
            allAlreadySaved: i18n.sickAllAlreadySaved || 'Minden kijelölt nap már betegségként van rögzítve.',
            saveSuccess: i18n.sickSaveSuccess || '%COUNT% betegnap mentve.',
            savingProgress: i18n.absenceRangeSaving || 'Mentés folyamatban… %CURRENT% / %TOTAL% nap'
        };
    }
    return {
        startLabel: i18n.vacationStartLabel || 'Szabadság kezdete',
        endLabel: i18n.vacationEndLabel || 'Szabadság vége',
        endBeforeStart: i18n.vacationEndBeforeStart || 'A záró dátum nem lehet korábbi, mint a kezdő dátum.',
        maxDays: i18n.vacationMaxDays || 'Egyszerre legfeljebb 60 nap szabadság rögzíthető.',
        rangeSummary: i18n.vacationRangeSummary || 'Mentésre kerül: %COUNT% szabadságnap',
        saveRange: i18n.saveVacationRange || 'Szabadság mentése (%COUNT% nap)',
        conflictWorkday: i18n.vacationConflictWorkday || 'A következő napokon már van munkanap rögzítve: %DATES%. Ezekre nem menthető szabadság.',
        conflictNoteDay: i18n.vacationConflictNoteDay || 'A következő napokon már van más típusú nap rögzítve: %DATES%. Ezekre nem menthető szabadság.',
        allAlreadySaved: i18n.vacationAllAlreadySaved || 'Minden kijelölt nap már szabadságként van rögzítve.',
        saveSuccess: i18n.vacationSaveSuccess || '%COUNT% szabadságnap mentve.',
        savingProgress: i18n.absenceRangeSaving || 'Mentés folyamatban… %CURRENT% / %TOTAL% nap'
    };
}

function enumerateIsoDatesInclusive(startIso, endIso) {
    const out = [];
    if (!startIso || !endIso) return out;
    const start = new Date(String(startIso) + 'T12:00:00');
    const end = new Date(String(endIso) + 'T12:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return out;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        out.push(y + '-' + m + '-' + day);
    }
    return out;
}

function formatAbsenceConflictDatesList(dates) {
    const locale = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'hu';
    return (dates || []).map(function (iso) {
        if (typeof formatHolidayClarifyDateLine === 'function') {
            return formatHolidayClarifyDateLine(iso, locale);
        }
        return iso;
    }).join(', ');
}

function analyzeAbsenceRangeDates(dates, excludeId, absenceType) {
    const list = Array.isArray(window.records) ? window.records : [];
    const workdayDates = [];
    const noteConflicts = [];
    const alreadySameAbsence = [];
    const toSave = [];
    const wantType = absenceType === 'sick' ? 'sick' : 'vacation';
    (dates || []).forEach(function (date) {
        const workday = list.find(function (r) {
            const rType = (r && r.entryType) ? r.entryType : 'workday';
            return String(r.date || '') === date && rType !== 'noteDay';
        });
        if (workday) {
            workdayDates.push(date);
            return;
        }
        const note = list.find(function (r) {
            if (!r || r.entryType !== 'noteDay') return false;
            if (String(r.date || '') !== date) return false;
            if (excludeId && String(r.id) === String(excludeId)) return false;
            return true;
        });
        if (note) {
            if (note.absenceType === wantType) {
                alreadySameAbsence.push(date);
                return;
            }
            noteConflicts.push(date);
            return;
        }
        toSave.push(date);
    });
    return { workdayDates: workdayDates, noteConflicts: noteConflicts, alreadySameAbsence: alreadySameAbsence, toSave: toSave };
}

function initAbsenceRangeFromMainDate() {
    const main = document.getElementById('date');
    const startEl = document.getElementById('vacationStartDate');
    const endEl = document.getElementById('vacationEndDate');
    if (!startEl || !endEl) return;
    const mainVal = main && main.value ? String(main.value) : '';
    if (mainVal) {
        startEl.value = mainVal;
        endEl.value = mainVal;
    } else if (startEl.value && !endEl.value) {
        endEl.value = startEl.value;
    } else if (!startEl.value && endEl.value) {
        startEl.value = endEl.value;
    }
}

function onFullDayMainDateChange() {
    const kindInput = document.querySelector('input[name="fullDayKind"]:checked');
    const kind = kindInput ? kindInput.value : 'work';
    if (isFullDayAbsenceRangeKind(kind) && !editingId) {
        initAbsenceRangeFromMainDate();
        updateVacationRangeUi();
    }
}

function updateAbsenceRangeLabels(kind) {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
        ? (translations[currentLang] || {})
        : {};
    const texts = getAbsenceRangeTexts(i18n, kind);
    const startLbl = document.getElementById('absenceRangeStartLabel');
    const endLbl = document.getElementById('absenceRangeEndLabel');
    if (startLbl) startLbl.textContent = texts.startLabel;
    if (endLbl) endLbl.textContent = texts.endLabel;
}

function updateVacationRangeUi() {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
        ? (translations[currentLang] || {})
        : {};
    const summaryEl = document.getElementById('full-day-vacation-summary');
    const btnLabel = document.getElementById('saveEntryBtnLabel');
    const kindInput = document.querySelector('input[name="fullDayKind"]:checked');
    const kind = kindInput ? kindInput.value : 'work';
    const showRange = isFullDayAbsenceRangeKind(kind) && !editingId;

    if (!showRange) {
        if (summaryEl) {
            summaryEl.classList.add('hidden');
            summaryEl.textContent = '';
        }
        if (btnLabel) {
            btnLabel.textContent = i18n.saveEntry || 'Bejegyzés Mentése';
        }
        return;
    }

    updateAbsenceRangeLabels(kind);
    const texts = getAbsenceRangeTexts(i18n, kind);

    const startIso = document.getElementById('vacationStartDate')?.value || '';
    const endIso = document.getElementById('vacationEndDate')?.value || '';
    if (!startIso || !endIso) {
        if (summaryEl) {
            summaryEl.classList.add('hidden');
            summaryEl.textContent = '';
        }
        if (btnLabel) {
            btnLabel.textContent = i18n.saveEntry || 'Bejegyzés Mentése';
        }
        return;
    }

    if (endIso < startIso) {
        if (summaryEl) {
            summaryEl.classList.remove('hidden');
            summaryEl.classList.add('text-red-600', 'dark:text-red-400');
            summaryEl.classList.remove('text-emerald-700', 'dark:text-emerald-300');
            summaryEl.textContent = texts.endBeforeStart;
        }
        if (btnLabel) {
            btnLabel.textContent = i18n.saveEntry || 'Bejegyzés Mentése';
        }
        return;
    }

    const dates = enumerateIsoDatesInclusive(startIso, endIso);
    const count = dates.length;

    if (summaryEl) {
        summaryEl.classList.remove('hidden', 'text-red-600', 'dark:text-red-400');
        summaryEl.classList.add('text-emerald-700', 'dark:text-emerald-300');
        if (count > ABSENCE_RANGE_MAX_DAYS) {
            summaryEl.classList.add('text-red-600', 'dark:text-red-400');
            summaryEl.classList.remove('text-emerald-700', 'dark:text-emerald-300');
            summaryEl.textContent = texts.maxDays;
        } else {
            summaryEl.textContent = texts.rangeSummary.replace('%COUNT%', String(count));
        }
    }

    if (btnLabel) {
        if (count <= 1) {
            btnLabel.textContent = i18n.saveEntry || 'Bejegyzés Mentése';
        } else {
            btnLabel.textContent = texts.saveRange.replace('%COUNT%', String(count));
        }
    }
}

function syncEntryDrivingModeVisuals() {
    const section = document.getElementById('driving-mode-options');
    if (!section) return;
    section.querySelectorAll('.driving-mode-option').forEach(function (row) {
        const input = row.querySelector('input[type="radio"]');
        const mark = row.querySelector('.enhanced-toggle-checkmark');
        if (input && input.checked) {
            row.classList.add('active');
            if (mark) mark.classList.remove('hidden');
        } else {
            row.classList.remove('active');
            if (mark) mark.classList.add('hidden');
        }
    });
}

function syncEntryDrivingModeFromInput() {
    syncEntryDrivingModeVisuals();
}

function selectEntryDrivingMode(val) {
    const mode = (val === 'team') ? 'team' : 'single';
    const inp = document.querySelector('input[name="entryDrivingMode"][value="' + mode + '"]');
    if (inp) {
        inp.checked = true;
        syncEntryDrivingModeFromInput();
    }
}

function entryDrivingModeRowKey(ev, val) {
    if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        selectEntryDrivingMode(val);
    }
}

function setEntryDrivingModeUi(mode) {
    selectEntryDrivingMode(mode === 'team' ? 'team' : 'single');
}

function getEntryDrivingModeFromUi() {
    const checked = document.querySelector('input[name="entryDrivingMode"]:checked');
    if (checked && (checked.value === 'team' || checked.value === 'single')) {
        return checked.value;
    }
    return 'single';
}

window.selectEntryDrivingMode = selectEntryDrivingMode;
window.syncEntryDrivingModeFromInput = syncEntryDrivingModeFromInput;
window.entryDrivingModeRowKey = entryDrivingModeRowKey;

function syncFullDayPanels() {
    const wrap = document.getElementById('full-day-workday-only');
    const singleWrap = document.getElementById('full-day-single-date-wrap');
    const vacationWrap = document.getElementById('full-day-vacation-range-wrap');
    const kindInput = document.querySelector('input[name="fullDayKind"]:checked');
    const v = kindInput ? kindInput.value : 'work';
    const showAbsenceRange = isFullDayAbsenceRangeKind(v) && !editingId;

    if (wrap) {
        if (v === 'work') wrap.classList.remove('hidden');
        else wrap.classList.add('hidden');
    }
    if (singleWrap) {
        if (showAbsenceRange) singleWrap.classList.add('hidden');
        else singleWrap.classList.remove('hidden');
    }
    if (vacationWrap) {
        if (showAbsenceRange) {
            vacationWrap.classList.remove('hidden');
            initAbsenceRangeFromMainDate();
            updateAbsenceRangeLabels(v);
        } else {
            vacationWrap.classList.add('hidden');
        }
    }
    updateVacationRangeUi();
}

window.updateVacationRangeUi = updateVacationRangeUi;
window.onFullDayMainDateChange = onFullDayMainDateChange;

function syncFullDayKindVisuals() {
    const section = document.getElementById('full-day-kind-section');
    if (!section) return;
    section.querySelectorAll('.full-day-kind-option').forEach(function (row) {
        const input = row.querySelector('input[type="radio"]');
        const mark = row.querySelector('.enhanced-toggle-checkmark');
        if (input && input.checked) {
            row.classList.add('active');
            if (mark) mark.classList.remove('hidden');
        } else {
            row.classList.remove('active');
            if (mark) mark.classList.add('hidden');
        }
    });
}

function syncFullDayKindFromInput() {
    syncFullDayKindVisuals();
    syncFullDayPanels();
}

function selectFullDayKind(val) {
    const inp = document.querySelector('input[name="fullDayKind"][value="' + val + '"]');
    if (inp) {
        inp.checked = true;
        syncFullDayKindFromInput();
    }
}

function fullDayKindRowKey(ev, val) {
    if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        selectFullDayKind(val);
    }
}

// Teljes nap pótkocsi/konténer vázlat. Nem az activeShift része.
let fullDayTrailerContainerEvents = [];

function fullDayTrailerLib() {
    return (typeof window !== 'undefined' && window.TrailerContainerLog) ? window.TrailerContainerLog : null;
}

function fullDayTrailerModuleOn() {
    try {
        if (typeof window.isTrailerContainerModuleEnabled === 'function') {
            return window.isTrailerContainerModuleEnabled();
        }
        return localStorage.getItem('toggleTrailerContainer') === 'true';
    } catch (_) {
        return false;
    }
}

function fullDayDateIsToday() {
    const dateEl = document.getElementById('date');
    const raw = dateEl && dateEl.value ? String(dateEl.value) : '';
    if (!raw) return true;
    let today = '';
    try {
        if (typeof toISODate === 'function') today = toISODate(new Date());
        else {
            const d = new Date();
            today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
    } catch (_) {
        return true;
    }
    return raw === today;
}

function suggestFullDayTrailerTime(timeEl) {
    if (!timeEl) return;
    if (fullDayDateIsToday() && typeof fmtTimeHM === 'function' && typeof now === 'function') {
        timeEl.value = fmtTimeHM(now());
    } else {
        timeEl.value = '';
    }
}

function renderFullDayTrailerContainer() {
    const section = document.getElementById('full-day-trailer-container-section');
    if (!section) return;
    const on = fullDayTrailerModuleOn();
    section.style.display = on ? '' : 'none';
    if (!on) return;
    const lib = fullDayTrailerLib();
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
    const events = lib ? lib.normalizeEvents(fullDayTrailerContainerEvents) : [];
    const activeEl = document.getElementById('full-day-trailer-container-active-list');
    const historyEl = document.getElementById('full-day-trailer-container-history');
    if (activeEl && lib) {
        var activeItems;
        if (fullDayDateIsToday() && typeof lib.overlayActiveItems === 'function' && window.TrailerContainerActive && typeof window.TrailerContainerActive.getItems === 'function') {
            activeItems = lib.overlayActiveItems(window.TrailerContainerActive.getItems(), events);
        } else if (!fullDayDateIsToday() && typeof lib.activeItemsAsOf === 'function' && window.TrailerContainerActive && typeof window.TrailerContainerActive.getHistoryRecords === 'function') {
            var asOfDate = document.getElementById('date') ? document.getElementById('date').value : '';
            activeItems = lib.activeItemsAsOf(window.TrailerContainerActive.getHistoryRecords(), asOfDate, events);
        } else {
            activeItems = lib.getActiveItems(events);
        }
        activeEl.innerHTML = lib.renderActiveCardsHtml(activeItems, i18n, { prepareFn: 'prepareFullDayTrailerContainerDrop' });
    }
    if (historyEl && lib) {
        historyEl.innerHTML = lib.renderHistoryHtml(events, i18n);
    }
    if (window.TrailerContainerActive && typeof window.TrailerContainerActive.isLoaded === 'function' && !window.TrailerContainerActive.isLoaded() && typeof window.TrailerContainerActive.load === 'function') {
        window.TrailerContainerActive.load().then(function () { renderFullDayTrailerContainer(); }).catch(function () {});
    }
    if (!fullDayDateIsToday() && window.TrailerContainerActive && typeof window.TrailerContainerActive.ensureHistory === 'function' && !renderFullDayTrailerContainer._historyAsked) {
        renderFullDayTrailerContainer._historyAsked = true;
        window.TrailerContainerActive.ensureHistory().then(function () { renderFullDayTrailerContainer(); }).catch(function () {});
    }
}

function clearFullDayTrailerFormFields() {
    ['fullDayTrailerContainerIdentifier', 'fullDayTrailerContainerOdometer', 'fullDayTrailerContainerLocation', 'fullDayTrailerContainerNote'].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const actionEl = document.getElementById('fullDayTrailerContainerAction');
    if (actionEl) actionEl.value = 'pickup';
    suggestFullDayTrailerTime(document.getElementById('fullDayTrailerContainerTime'));
}

function resetFullDayTrailerContainerDraft() {
    fullDayTrailerContainerEvents = [];
    clearFullDayTrailerFormFields();
    renderFullDayTrailerContainer();
}

function loadFullDayTrailerContainerDraft(events) {
    const lib = fullDayTrailerLib();
    fullDayTrailerContainerEvents = lib ? lib.normalizeEvents(events).slice() : (Array.isArray(events) ? events.slice() : []);
    clearFullDayTrailerFormFields();
    renderFullDayTrailerContainer();
}

function addFullDayTrailerContainerEvent() {
    const lib = fullDayTrailerLib();
    if (!lib || !fullDayTrailerModuleOn()) return;
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
    const typeEl = document.getElementById('fullDayTrailerContainerType');
    const actionEl = document.getElementById('fullDayTrailerContainerAction');
    const idEl = document.getElementById('fullDayTrailerContainerIdentifier');
    const timeEl = document.getElementById('fullDayTrailerContainerTime');
    const kmEl = document.getElementById('fullDayTrailerContainerOdometer');
    const locEl = document.getElementById('fullDayTrailerContainerLocation');
    const noteEl = document.getElementById('fullDayTrailerContainerNote');
    const result = lib.createEvent({
        type: typeEl ? typeEl.value : '',
        action: actionEl ? actionEl.value : '',
        identifier: idEl ? idEl.value : '',
        time: timeEl ? timeEl.value : '',
        odometerKm: kmEl ? kmEl.value : '',
        location: locEl ? locEl.value : '',
        note: noteEl ? noteEl.value : ''
    });
    if (!result.ok) {
        if (typeof showCustomAlert === 'function') {
            let msg = '';
            if (result.error === 'identifierRequired') msg = i18n.trailerContainerIdentifierRequired || '';
            else if (result.error === 'odometerInvalid') msg = i18n.trailerContainerOdometerInvalid || '';
            else msg = i18n.trailerContainerIdentifierRequired || '';
            showCustomAlert(msg, 'info');
        }
        return;
    }
    fullDayTrailerContainerEvents = lib.appendEvent(fullDayTrailerContainerEvents, result.event);
    clearFullDayTrailerFormFields();
    renderFullDayTrailerContainer();
}

function prepareFullDayTrailerContainerDrop(type, encodedIdentifier) {
    let identifier = encodedIdentifier;
    try { identifier = decodeURIComponent(encodedIdentifier); } catch (_) {}
    const typeEl = document.getElementById('fullDayTrailerContainerType');
    const actionEl = document.getElementById('fullDayTrailerContainerAction');
    const idEl = document.getElementById('fullDayTrailerContainerIdentifier');
    const timeEl = document.getElementById('fullDayTrailerContainerTime');
    const kmEl = document.getElementById('fullDayTrailerContainerOdometer');
    const locEl = document.getElementById('fullDayTrailerContainerLocation');
    const noteEl = document.getElementById('fullDayTrailerContainerNote');
    const form = document.getElementById('full-day-trailer-container-form');
    if (typeEl) typeEl.value = type === 'container' ? 'container' : 'trailer';
    if (actionEl) actionEl.value = 'drop';
    if (idEl) idEl.value = identifier || '';
    suggestFullDayTrailerTime(timeEl);
    if (kmEl) kmEl.value = '';
    if (locEl) locEl.value = '';
    if (noteEl) noteEl.value = '';
    if (form && typeof form.scrollIntoView === 'function') {
      try { form.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (_) {}
    }
    if (idEl && typeof idEl.focus === 'function') {
      try { idEl.focus({ preventScroll: true }); } catch (_) { try { idEl.focus(); } catch (__) {} }
    }
}

function resetEntryForm() {
    editingId = null;
    resetCrossingFormSyncState();
    
    const elements = [
        'date', 'vacationStartDate', 'vacationEndDate', 'startTime', 'endTime', 'startLocation', 'endLocation',
        'weeklyDriveStart', 'weeklyDriveEnd', 'kmStart', 'kmEnd', 'compensationTime',
        'note'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = '';
        }
    });
    
    const crossingsContainer = document.getElementById('crossingsContainer');
    if (crossingsContainer) {
        crossingsContainer.innerHTML = '';
    }
    
    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        splitRestToggle.checked = false;
        if (typeof updateEnhancedToggleVisuals === 'function') {
            updateEnhancedToggleVisuals(splitRestToggle);
        }
    }

    setEntryDrivingModeUi(
      (typeof window.getDefaultDrivingModeFromSettings === 'function')
        ? window.getDefaultDrivingModeFromSettings()
        : 'single'
    );

    const workRadio = document.querySelector('input[name="fullDayKind"][value="work"]');
    if (workRadio) {
        workRadio.checked = true;
    }
    const hol = document.getElementById('fullDayIsHoliday');
    if (hol) {
        hol.checked = false;
        if (typeof updateEnhancedToggleVisuals === 'function') {
            updateEnhancedToggleVisuals(hol);
        }
    }
    syncFullDayKindVisuals();
    syncFullDayPanels();
    if (typeof window.EntryVehicleField !== 'undefined' && typeof window.EntryVehicleField.resetSession === 'function') {
        window.EntryVehicleField.resetSession();
    }
    if (typeof window.FullDayVehicleSegments !== 'undefined' && typeof window.FullDayVehicleSegments.reset === 'function') {
        window.FullDayVehicleSegments.reset();
    }
    hideVhSplitSection();
    resetFullDayTrailerContainerDraft();
}

function findEditingOriginalRecord(editId) {
    if (!editId) return null;
    const id = String(editId);
    const fromList = (typeof getRecordsListSource === 'function') ? getRecordsListSource() : [];
    let found = fromList.find(function (r) { return r && String(r.id) === id; });
    if (!found && Array.isArray(window.records)) {
        found = window.records.find(function (r) { return r && String(r.id) === id; });
    }
    return found || null;
}

function getFullDayDriveMinutesFromForm() {
    const parseMins = (typeof parseTimeToMinutes === 'function') ? parseTimeToMinutes : function () { return 0; };
    const drivingTimeMode = localStorage.getItem('drivingTimeMode') || 'weekly';
    if (drivingTimeMode === 'weekly' || drivingTimeMode === 'biweekly') {
        const start = document.getElementById('weeklyDriveStart');
        const end = document.getElementById('weeklyDriveEnd');
        return Math.max(0, parseMins(end ? end.value : '') - parseMins(start ? start.value : ''));
    }
    const daily = document.getElementById('dailyDriveTime');
    return Math.max(0, parseMins(daily ? daily.value : ''));
}

function isVhEditRecord(record) {
    if (!record) return false;
    if (record.isSundayMondayShift === true) return true;
    if (record.sundayMondaySplitSource) return true;
    if (Number(record.sundayDriveMinutes) > 0 || Number(record.mondayDriveMinutes) > 0) return true;
    const dateStr = record.date ? String(record.date) : '';
    const endStr = record.endDate ? String(record.endDate) : '';
    if (dateStr && endStr && typeof isSundayMondayShift === 'function') {
        return isSundayMondayShift(dateStr, endStr);
    }
    if (dateStr && endStr) {
        try {
            const start = new Date(dateStr + 'T12:00:00');
            const end = new Date(endStr + 'T12:00:00');
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                return start.getDay() === 0 && end.getDay() === 1;
            }
        } catch (_) {}
    }
    return false;
}

function resolveVhSplitMinutes(record) {
    const total = Math.max(0, Number(record && record.driveMinutes) || 0);
    let monday = Math.max(0, Number(record && record.mondayDriveMinutes) || 0);
    let sunday = Math.max(0, Number(record && record.sundayDriveMinutes) || 0);

    if (total > 0 && sunday + monday === 0) {
        sunday = Math.max(0, total - monday);
    } else if (total > 0 && sunday + monday < total) {
        sunday += total - (sunday + monday);
    }

    return { total: total, monday: monday, sunday: sunday };
}

function showVhSplitSection() {
    const section = document.getElementById('vh-split-section');
    if (section) section.classList.remove('hidden');
}

function hideVhSplitSection() {
    const section = document.getElementById('vh-split-section');
    if (section) section.classList.add('hidden');
    const monEl = document.getElementById('vhMondayDriveTime');
    const sunEl = document.getElementById('vhSundayDriveTime');
    const errEl = document.getElementById('vh-split-error');
    if (monEl) monEl.value = '';
    if (sunEl) sunEl.value = '';
    if (errEl) {
        errEl.textContent = '';
        errEl.classList.add('hidden');
    }
}

function populateVhSplitFields(record) {
    const monEl = document.getElementById('vhMondayDriveTime');
    const resolved = resolveVhSplitMinutes(record);
    const monMins = resolved.monday;
    if (monEl && typeof formatAsHoursAndMinutes === 'function') {
        monEl.value = formatAsHoursAndMinutes(monMins);
    }
    if (typeof syncVhSplitSundayDisplay === 'function') {
        syncVhSplitSundayDisplay();
    }
}

function syncVhSplitSundayDisplay() {
    const section = document.getElementById('vh-split-section');
    if (!section || section.classList.contains('hidden')) return;
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
        ? (translations[currentLang] || {})
        : {};
    const total = getFullDayDriveMinutesFromForm();
    const monEl = document.getElementById('vhMondayDriveTime');
    const sunEl = document.getElementById('vhSundayDriveTime');
    const errEl = document.getElementById('vh-split-error');
    const parseMins = (typeof parseTimeToMinutes === 'function') ? parseTimeToMinutes : function () { return 0; };
    const mon = parseMins(monEl ? monEl.value : '');
    const sun = Math.max(0, total - mon);
    if (sunEl && typeof formatAsHoursAndMinutes === 'function') {
        sunEl.value = (sun > 0 || total > 0) ? formatAsHoursAndMinutes(sun) : '';
    }
    if (errEl) {
        if (Number.isFinite(mon) && mon > total && total > 0) {
            errEl.textContent = i18n.vhMondayExceedsTotalDrive
                || 'A hétfői vezetési idő nem lehet több, mint a teljes műszak vezetési ideje.';
            errEl.classList.remove('hidden');
        } else {
            errEl.textContent = '';
            errEl.classList.add('hidden');
        }
    }
}

function applyVhSplitFieldsToRecord(record, origRec, driveMinutes, date, endDateStr) {
    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
        ? (translations[currentLang] || {})
        : {};
    const parseMins = (typeof parseTimeToMinutes === 'function') ? parseTimeToMinutes : function () { return 0; };
    const isStillVH = (typeof isSundayMondayShift === 'function')
        ? isSundayMondayShift(date, endDateStr)
        : false;

    if (!origRec || !isVhEditRecord(origRec)) {
        return { ok: true, record: record };
    }

    if (!isStillVH) {
        record.isSundayMondayShift = false;
        record.sundayDriveMinutes = 0;
        record.mondayDriveMinutes = 0;
        record.sundayMondaySplitSource = '';
        record.isSundayMondayManual = false;
        return { ok: true, record: record };
    }

    const total = Math.max(0, Number(driveMinutes) || 0);
    const monEl = document.getElementById('vhMondayDriveTime');
    let mondayDriveMinutes = monEl && String(monEl.value || '').trim()
        ? parseMins(monEl.value)
        : (Number(origRec.mondayDriveMinutes) || 0);

    if (mondayDriveMinutes > total) {
        return {
            ok: false,
            error: i18n.vhMondayExceedsTotalDrive
                || 'A hétfői vezetési idő nem lehet több, mint a teljes műszak vezetési ideje.'
        };
    }

    let sundayDriveMinutes = total - mondayDriveMinutes;
    if (sundayDriveMinutes < 0) {
        return {
            ok: false,
            error: i18n.vhMondayExceedsTotalDrive
                || 'A hétfői vezetési idő nem lehet több, mint a teljes műszak vezetési ideje.'
        };
    }

    const splitSum = sundayDriveMinutes + mondayDriveMinutes;
    if (splitSum < total) {
        sundayDriveMinutes += (total - splitSum);
    } else if (splitSum > total) {
        return {
            ok: false,
            error: i18n.vhSplitExceedsTotal
                || 'A vasárnapi és hétfői vezetési idő összege nem lehet több a teljes műszak vezetési idejénél.'
        };
    }

    record.isSundayMondayShift = true;
    record.sundayDriveMinutes = sundayDriveMinutes;
    record.mondayDriveMinutes = mondayDriveMinutes;
    record.sundayMondaySplitSource = 'manual_edit';
    record.isSundayMondayManual = true;
    return { ok: true, record: record };
}

window.syncVhSplitSundayDisplay = syncVhSplitSundayDisplay;
window.hideVhSplitSection = hideVhSplitSection;

var _crossingsFormHydrated = false;
var _crossingFormTombstones = [];

function markCrossingsFormHydrated() {
    _crossingsFormHydrated = true;
}

function resetCrossingFormSyncState() {
    _crossingsFormHydrated = false;
    _crossingFormTombstones = [];
}

function addCrossingRow(from = '', to = '', time = '', odometerKm = '', crossingId = '') {
    const container = document.getElementById('crossingsContainer');
    if (!container) {
        console.error('crossingsContainer not found');
        return;
    }

    const i18n = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') ? (translations[currentLang] || {}) : {};
    const fromPh = i18n.fromPlaceholder || 'From';
    const toPh = i18n.toPlaceholder || 'To';
    const gpsTitle = i18n.getCountryCodeGPS || 'Fetch country code via GPS';
    const deleteRowTitle = i18n.delete || 'Delete';
    const odomPh = i18n.crossingOdometerPlaceholder || '';
    const odomTitle = i18n.crossingOdometerHint || '';
    const timeLabel = i18n.crossingTimeLabel || 'Time';
    const odomFieldLabel = i18n.crossingOdometerFieldLabel || 'Odometer';
    const odomVal =
      odometerKm !== '' && odometerKm != null ? String(odometerKm) : '';

    // Ha új sor hozzáadása (gombnyomásra) és nincs megadva "from" paraméter
    if (from === '') {
        // 1. Prioritás: Az aktuális form többi sorából az utolsó "Hova" érték
        const allCrossingRows = container.querySelectorAll('.crossing-row');
        if (allCrossingRows.length > 0) {
            const lastRow = allCrossingRows[allCrossingRows.length - 1];
            const lastToInput = lastRow.querySelector('.crossing-to');
            
            if (lastToInput && lastToInput.value.trim() !== '') {
                from = lastToInput.value.trim().toUpperCase();
            }
        }
        
        // 2. Prioritás: Ha még nincs sor, akkor az utolsó mentett rekordból
        if (!from && typeof window.getLatestRecord === 'function') {
            const lastRecord = window.getLatestRecord();
            if (lastRecord && lastRecord.crossings && lastRecord.crossings.length > 0) {
                const lastRecordCrossing = lastRecord.crossings[lastRecord.crossings.length - 1];
                from = lastRecordCrossing.to || '';
            }
        }
    }

    const rowId = 'crossing-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const currentTime = time || new Date().toTimeString().slice(0, 5);
    var stableId = crossingId && String(crossingId).trim()
      ? String(crossingId).trim()
      : ((window.GurigoCrossingMerge && typeof window.GurigoCrossingMerge.newCrossingId === 'function')
          ? window.GurigoCrossingMerge.newCrossingId()
          : ('cx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)));
    
    // JAVÍTOTT: teljes blokk egy div-ben, space-y-2 a belső térközökhöz; placeholder/title i18n
    const rowHTML = `
        <div class="crossing-row space-y-2 border-t border-indigo-200/50 dark:border-indigo-700/50 pt-2 first:border-t-0 first:pt-0" id="${rowId}" data-crossing-id="${stableId}">
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <input class="crossing-from w-full p-2 border rounded text-sm uppercase" placeholder="${fromPh}" type="text" value="${from}">
                </div>
                <div>
                    <div class="flex">
                        <input class="crossing-to w-full p-2 border rounded-l text-sm uppercase" placeholder="${toPh}" type="text" value="${to}">
                        <button class="bg-blue-500 text-white p-2 rounded-r text-xs" type="button" onclick="fetchCountryCodeFor('${rowId}')" title="${gpsTitle}">📍</button>
                    </div>
                </div>
            </div>
            <div class="space-y-2">
                <div class="flex gap-2 items-end">
                    <div class="flex-1 min-w-0">
                        <label class="block text-xs mb-1 text-gray-600 dark:text-gray-400">${timeLabel}</label>
                        <input class="crossing-time w-full p-2 border rounded text-sm" type="time" value="${currentTime}" onblur="formatTimeInput(this)">
                    </div>
                    <button type="button" class="text-red-500 hover:text-red-700 p-1 text-xl flex-shrink-0 mb-0.5" onclick="removeCrossingRow('${rowId}')" title="${deleteRowTitle}">🗑️</button>
                </div>
                <div>
                    <label class="block text-xs mb-1 text-gray-600 dark:text-gray-400">${odomFieldLabel}</label>
                    <input class="crossing-odometer w-full p-2 border rounded text-sm" type="number" min="0" max="9999999" step="1" inputmode="numeric" placeholder="${odomPh}" title="${odomTitle}" value="${odomVal}">
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', rowHTML);
    markCrossingsFormHydrated();
    
    // Focus kezelés: ha van előre kitöltött "Honnan", akkor "Hova"-ra, különben "Honnan"-ra
    setTimeout(() => {
        const newRow = document.getElementById(rowId);
        if (newRow) {
            const fromInput = newRow.querySelector('.crossing-from');
            const toInput = newRow.querySelector('.crossing-to');
            
            if (from && toInput) {
                toInput.focus();
            } else if (fromInput) {
                fromInput.focus();
            }
        }
    }, 0);
}

function removeCrossingRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        var cid = row.getAttribute('data-crossing-id');
        if (cid) {
            var tomb = (window.GurigoCrossingMerge && typeof window.GurigoCrossingMerge.makeTombstone === 'function')
              ? window.GurigoCrossingMerge.makeTombstone(cid)
              : { crossingId: String(cid), deletedAtMs: Date.now() };
            _crossingFormTombstones.push(tomb);
        }
        row.remove();
        markCrossingsFormHydrated();
    }
}

const RECORDS_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const RECORDS_PAGE_SIZE_STORAGE_KEY = 'recordsListPageSize';
const RECORDS_PAGINATION_SLOT_IDS = ['records-pagination-top', 'records-pagination-bottom'];

function getStoredRecordsPageSize() {
    try {
        const stored = parseInt(localStorage.getItem(RECORDS_PAGE_SIZE_STORAGE_KEY), 10);
        if (RECORDS_PAGE_SIZE_OPTIONS.includes(stored)) return stored;
    } catch (_) {}
    return 10;
}

let recordsPageSize = getStoredRecordsPageSize();
let recordsCurrentPage = 1;

function getRecordsListI18n() {
    return (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
        ? (translations[currentLang] || {})
        : {};
}

function getRecordsPaginationTotals(sorted) {
    const totalItems = Array.isArray(sorted) ? sorted.length : 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / recordsPageSize));
    return { totalItems, totalPages };
}

function clampRecordsCurrentPage(totalPages) {
    if (recordsCurrentPage > totalPages) recordsCurrentPage = totalPages;
    if (recordsCurrentPage < 1) recordsCurrentPage = 1;
}

function scrollRecordsListToTop() {
    const anchor = document.getElementById('records-list-top-anchor')
        || document.getElementById('content-list');
    if (!anchor || typeof anchor.scrollIntoView !== 'function') return;
    anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getRecordsListSource() {
    if (typeof window.getRecordsForListDisplay === 'function') {
        return window.getRecordsForListDisplay();
    }
    return (typeof getSortedRecords === 'function') ? getSortedRecords() : (Array.isArray(window.records) ? window.records : []);
}

function recordsOlderHasMore() {
    var user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    if (!user) return false;
    var paging = window._recordsOlderPaging;
    if (!paging) return true;
    if (paging.hasMore === false) return false;
    return true;
}

function recordsOlderIsLoading() {
    var paging = window._recordsOlderPaging || {};
    return !!paging.loading;
}

function buildRecordsPaginationHtml(totalPages, totalItems, options) {
    if (typeof ListPagination !== 'undefined' && ListPagination.buildHtml) {
        return ListPagination.buildHtml({
            currentPage: recordsCurrentPage,
            totalPages: totalPages,
            totalItems: totalItems,
            pageSize: recordsPageSize,
            pageSizeOptions: RECORDS_PAGE_SIZE_OPTIONS,
            changePageHandler: 'changeRecordsPage',
            changePageSizeHandler: 'changeRecordsPageSize',
            openJumpHandler: 'openRecordsPageJumpModal',
            hasMoreBeyond: recordsOlderHasMore(),
            isLoadingOlder: recordsOlderIsLoading(),
            showLoadedCount: true,
            showMoreDataHint: !(options && options.showMoreDataHint === false),
        });
    }
    return '';
}

function closeRecordsPageJumpModal() {
    if (typeof ListPagination !== 'undefined' && ListPagination.closeJumpModal) {
        ListPagination.closeJumpModal({
            overlayId: 'records-page-jump-overlay',
            bodyClass: 'records-page-jump-open',
        });
    }
}

function openRecordsPageJumpModal() {
    const i18n = getRecordsListI18n();
    const sorted = getRecordsListSource();
    const { totalPages } = getRecordsPaginationTotals(sorted);
    if (typeof ListPagination === 'undefined' || !ListPagination.openJumpModal) return;
    ListPagination.openJumpModal({
        overlayId: 'records-page-jump-overlay',
        gridId: 'records-page-jump-grid',
        titleId: 'records-page-jump-title',
        closeBtnId: 'records-page-jump-close-btn',
        closeHandler: 'closeRecordsPageJumpModal',
        currentPage: recordsCurrentPage,
        totalPages: totalPages,
        bodyClass: 'records-page-jump-open',
        onSelectPage: function (page) {
            jumpToRecordsPage(page);
        },
    });
}

function initRecordsPageJumpModal() {
    if (typeof ListPagination !== 'undefined' && ListPagination.initJumpModal) {
        ListPagination.initJumpModal({
            overlayId: 'records-page-jump-overlay',
            gridId: 'records-page-jump-grid',
            titleId: 'records-page-jump-title',
            closeBtnId: 'records-page-jump-close-btn',
            closeHandler: 'closeRecordsPageJumpModal',
        });
    }
}

function showRecordsListLoading(message) {
    var container = safeGetElement('recordsContent', false);
    if (container) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">' + (message || 'Betöltés...') + '</p>';
    }
}

var _recordsEnsureLoadPromise = null;

async function ensureRecordsLoadedForPage(targetPage, options) {
    var user = window.currentUser || (typeof currentUser !== 'undefined' ? currentUser : null);
    if (!user || typeof window.loadOlderRecordsPage !== 'function') {
        return getRecordsListSource().length;
    }
    var pageSize = (options && options.pageSize) ? options.pageSize : recordsPageSize;
    var needed = Math.max(1, targetPage) * pageSize;
    if (_recordsEnsureLoadPromise) {
        await _recordsEnsureLoadPromise;
        return getRecordsListSource().length;
    }
    _recordsEnsureLoadPromise = (async function () {
        var safety = 0;
        try {
            while (safety++ < 40) {
                var sorted = getRecordsListSource();
                if (sorted.length >= needed) break;
                var paging = window._recordsOlderPaging || {};
                if (paging.hasMore === false) break;
                while (paging.loading) {
                    await new Promise(function (r) { setTimeout(r, 40); });
                    paging = window._recordsOlderPaging || {};
                }
                if (paging.hasMore === false) break;
                var result = await window.loadOlderRecordsPage();
                if (!result || !result.added) break;
            }
        } finally {
            _recordsEnsureLoadPromise = null;
        }
        return getRecordsListSource().length;
    })();
    await _recordsEnsureLoadPromise;
    return getRecordsListSource().length;
}

function renderPaginationControls(totalPages, totalItems) {
    const showControls = totalItems > 0;
    if (!showControls) {
        if (typeof ListPagination !== 'undefined' && ListPagination.renderToSlots) {
            ListPagination.renderToSlots(RECORDS_PAGINATION_SLOT_IDS, '', false);
        } else {
            RECORDS_PAGINATION_SLOT_IDS.forEach(function (slotId) {
                const slot = document.getElementById(slotId);
                if (!slot) return;
                slot.innerHTML = '';
                slot.classList.add('hidden');
            });
        }
        return;
    }
    const topHtml = buildRecordsPaginationHtml(totalPages, totalItems, { showMoreDataHint: false });
    const bottomHtml = buildRecordsPaginationHtml(totalPages, totalItems, { showMoreDataHint: true });
    const topSlot = document.getElementById('records-pagination-top');
    const bottomSlot = document.getElementById('records-pagination-bottom');
    if (topSlot) {
        topSlot.innerHTML = topHtml;
        topSlot.classList.remove('hidden');
    }
    if (bottomSlot) {
        bottomSlot.innerHTML = bottomHtml;
        bottomSlot.classList.remove('hidden');
    }
}

async function changeRecordsPage(direction) {
    const i18n = getRecordsListI18n();
    let sorted = getRecordsListSource();
    let { totalPages } = getRecordsPaginationTotals(sorted);
    let nextPage = recordsCurrentPage;
    const loadingMsg = i18n.recordsLoadingOlder || 'Régebbi bejegyzések betöltése…';

    if (direction === 'first') {
        nextPage = 1;
    } else if (direction === 'last') {
        nextPage = totalPages;
    } else if (direction === -1) {
        nextPage = Math.max(1, recordsCurrentPage - 1);
    } else if (direction === 1) {
        if (recordsCurrentPage < totalPages) {
            nextPage = recordsCurrentPage + 1;
        } else if (recordsOlderHasMore()) {
            showRecordsListLoading(loadingMsg);
            renderPaginationControls(totalPages, sorted.length);
            await ensureRecordsLoadedForPage(recordsCurrentPage + 1);
            sorted = getRecordsListSource();
            ({ totalPages } = getRecordsPaginationTotals(sorted));
            if (recordsCurrentPage >= totalPages) return;
            nextPage = recordsCurrentPage + 1;
        } else {
            return;
        }
    }

    if (nextPage === recordsCurrentPage) return;
    recordsCurrentPage = nextPage;
    renderRecords({ scrollToTop: true });
}

function changeRecordsPageSize(rawSize) {
    const size = parseInt(rawSize, 10);
    if (!RECORDS_PAGE_SIZE_OPTIONS.includes(size) || size === recordsPageSize) return;
    recordsPageSize = size;
    try { localStorage.setItem(RECORDS_PAGE_SIZE_STORAGE_KEY, String(size)); } catch (_) {}
    const sorted = getRecordsListSource();
    const { totalPages } = getRecordsPaginationTotals(sorted);
    clampRecordsCurrentPage(totalPages);
    renderRecords({ scrollToTop: true });
}

async function jumpToRecordsPage(rawPage) {
    const i18n = getRecordsListI18n();
    let sorted = getRecordsListSource();
    let { totalPages, totalItems } = getRecordsPaginationTotals(sorted);
    let page = parseInt(rawPage, 10);
    if (isNaN(page)) page = recordsCurrentPage;
    page = Math.max(1, page);

    if (page > totalPages && recordsOlderHasMore()) {
        showRecordsListLoading(i18n.recordsLoadingOlder || 'Régebbi bejegyzések betöltése…');
        await ensureRecordsLoadedForPage(page);
        sorted = getRecordsListSource();
        ({ totalPages, totalItems } = getRecordsPaginationTotals(sorted));
        page = Math.min(page, totalPages);
    } else {
        page = Math.min(totalPages, page);
    }

    if (page === recordsCurrentPage) {
        renderPaginationControls(totalPages, totalItems);
        return;
    }
    recordsCurrentPage = page;
    renderRecords({ scrollToTop: true });
}

if (typeof window !== 'undefined') {
    window.changeRecordsPage = changeRecordsPage;
    window.changeRecordsPageSize = changeRecordsPageSize;
    window.jumpToRecordsPage = jumpToRecordsPage;
    window.openRecordsPageJumpModal = openRecordsPageJumpModal;
    window.closeRecordsPageJumpModal = closeRecordsPageJumpModal;
    window.recordsOlderHasMore = recordsOlderHasMore;
    window.recordsOlderIsLoading = recordsOlderIsLoading;
    window.ensureRecordsLoadedForPage = ensureRecordsLoadedForPage;
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initRecordsPageJumpModal);
    } else {
        initRecordsPageJumpModal();
    }
}

// =======================================================
// ===== BEJEGYZÉSEK LISTÁZÁSA (FEATURE) ================
// =======================================================

window.getSplitRestData = window.getSplitRestData || function() {
    return JSON.parse(localStorage.getItem('splitRestData') || '{}');
};

window.saveSplitRestData = window.saveSplitRestData || function(data) {
    localStorage.setItem('splitRestData', JSON.stringify(data));
};

function getRealismIssues(record) {
    if (typeof evaluateRecordRealism !== 'function') {
        return [];
    }
    try {
        const result = evaluateRecordRealism(record);
        return Array.isArray(result) ? result : [];
    } catch (error) {
        console.warn('[RealismCheck] evaluation failed:', error);
        return [];
    }
}

function confirmRealismOverride(issues, i18n) {
    if (!Array.isArray(issues) || issues.length === 0) {
        return Promise.resolve(true);
    }
    if (typeof showCustomAlert !== 'function') {
        return Promise.resolve(true);
    }
    const title = i18n?.realismWarningTitle || 'Gyors ellenőrzés';
    const body = i18n?.realismWarningBody || 'Ez az adat szokatlannak tűnik. Biztosan így szeretnéd menteni?';
    const confirmText = i18n?.realismWarningConfirm || 'Mentés így is';
    const cancelText = i18n?.realismWarningCancel || 'Vissza a szerkesztéshez';
    const issuesList = (typeof renderRealismIssueList === 'function')
        ? renderRealismIssueList(issues, i18n)
        : '';
    const message = `
        <span class="block text-base font-semibold mb-2">${title}</span>
        <span class="block text-sm leading-relaxed">${body}</span>
        ${issuesList}
    `;
    return new Promise(resolve => {
        let finished = false;
        const finish = (result) => {
            if (finished) return;
            finished = true;
            resolve(result);
        };
        showCustomAlert(
            message,
            'warning',
            () => finish(true),
            {
                allowHTML: true,
                confirmText,
                cancelText,
                cancelCallback: () => finish(false),
                confirmClass: 'bg-green-500 hover:bg-green-600 text-white',
                cancelClass: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }
        );
    });
}

async function saveWorkdayEntry() {
    const i18n = translations[currentLang];

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (editingId) {
            var editRec = (window.records || []).find(function (r) { return String(r.id) === String(editingId); });
            if (editRec && typeof window.canEditRecordOffline === 'function' && !window.canEditRecordOffline(editRec)) {
                if (typeof window.isRecordSynced === 'function' && window.isRecordSynced(editRec) && typeof window.showSyncedRecordReadOnlyAlert === 'function') {
                    window.showSyncedRecordReadOnlyAlert();
                } else if (typeof window.showOfflineLimitExpiredAlert === 'function') {
                    window.showOfflineLimitExpiredAlert();
                }
                return;
            }
        } else if (typeof window.gateOfflineCreate === 'function' && !window.gateOfflineCreate('fullDay')) {
            return;
        }
    }

    const date = document.getElementById('date')?.value;
    const kindInput = document.querySelector('input[name="fullDayKind"]:checked');
    const fullDayKind = kindInput ? kindInput.value : 'work';
    const fullDayIsHoliday = !!(document.getElementById('fullDayIsHoliday') && document.getElementById('fullDayIsHoliday').checked);

    const startTime = document.getElementById('startTime')?.value;
    const endTime = document.getElementById('endTime')?.value;
    const startLocation = document.getElementById('startLocation')?.value.trim();
    const endLocation = document.getElementById('endLocation')?.value.trim();
    let kmStart = parseFloat(document.getElementById('kmStart')?.value) || 0;
    let kmEnd = parseFloat(document.getElementById('kmEnd')?.value) || 0;
    const compensationTime = document.getElementById('compensationTime')?.value;
    const note = document.getElementById('note')?.value.trim() || '';
    const isSplitRest = document.getElementById('toggleSplitRest')?.checked;
    const drivingMode = getEntryDrivingModeFromUi();
    
    // Vezetési idő mód ellenőrzése
    const drivingTimeMode = localStorage.getItem('drivingTimeMode') || 'weekly';
    let weeklyDriveStart = '';
    let weeklyDriveEnd = '';
    let driveMinutes = 0;
    
    if (drivingTimeMode === 'weekly' || drivingTimeMode === 'biweekly') {
        // HETI MÓD: Két érték (start & end)
        weeklyDriveStart = document.getElementById('weeklyDriveStart')?.value || '';
        weeklyDriveEnd = document.getElementById('weeklyDriveEnd')?.value || '';
    } else {
        // NAPI MÓD: Közvetlen napi idő megadása
        const dailyDriveTime = document.getElementById('dailyDriveTime')?.value || '';
        driveMinutes = parseTimeToMinutes(dailyDriveTime);
        // weeklyDriveStart és weeklyDriveEnd maradnak üresek napi módban
    }

    if (isFullDayAbsenceRangeKind(fullDayKind) && !editingId) {
        const noteTrim = String(note || '').trim();
        const texts = getAbsenceRangeTexts(i18n, fullDayKind);
        const absenceType = fullDayKind === 'sick' ? 'sick' : 'vacation';
        const startIso = document.getElementById('vacationStartDate')?.value || '';
        const endIso = document.getElementById('vacationEndDate')?.value || '';
        if (!startIso || !endIso) {
            showCustomAlert(i18n.alertMandatoryFields, 'info');
            return;
        }
        if (endIso < startIso) {
            showCustomAlert(texts.endBeforeStart, 'info');
            return;
        }
        const dates = enumerateIsoDatesInclusive(startIso, endIso);
        if (!dates.length) {
            showCustomAlert(i18n.alertMandatoryFields, 'info');
            return;
        }
        if (dates.length > ABSENCE_RANGE_MAX_DAYS) {
            showCustomAlert(texts.maxDays, 'info');
            return;
        }
        try {
            if (typeof ensureRecordsLoaded === 'function') {
                await ensureRecordsLoaded();
            }
        } catch (_) {}
        const analysis = analyzeAbsenceRangeDates(dates, null, absenceType);
        if (analysis.workdayDates.length) {
            showCustomAlert(texts.conflictWorkday.replace('%DATES%', formatAbsenceConflictDatesList(analysis.workdayDates)), 'info');
            return;
        }
        if (analysis.noteConflicts.length) {
            showCustomAlert(texts.conflictNoteDay.replace('%DATES%', formatAbsenceConflictDatesList(analysis.noteConflicts)), 'info');
            return;
        }
        if (!analysis.toSave.length) {
            showCustomAlert(texts.allAlreadySaved, 'info');
            return;
        }
        try {
            if (typeof window.saveNoteDay !== 'function') {
                throw new Error(i18n.missingWorkTimeSaveError || 'A mentési funkció nem érhető el.');
            }
            var totalToSave = analysis.toSave.length;
            var progressTpl = texts.savingProgress || 'Mentés folyamatban… %CURRENT% / %TOTAL% nap';
            var formatProgress = function (cur) {
                return progressTpl.replace('%CURRENT%', String(cur)).replace('%TOTAL%', String(totalToSave));
            };
            var saveBtn = document.querySelector('#content-full-day button[onclick="saveWorkdayEntry()"]');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.setAttribute('aria-busy', 'true');
            }
            if (typeof showSubscriptionProcessingOverlay === 'function') {
                showSubscriptionProcessingOverlay(formatProgress(0));
            }
            // Overlay legyen látható, mielőtt a hosszú mentési ciklus elindul
            await new Promise(function (resolve) {
                if (typeof requestAnimationFrame === 'function') {
                    requestAnimationFrame(function () { setTimeout(resolve, 40); });
                } else {
                    setTimeout(resolve, 40);
                }
            });
            var lastSaveResult = null;
            for (let i = 0; i < analysis.toSave.length; i++) {
                var progressText = formatProgress(i + 1);
                var progressEl = document.getElementById('subscription-processing-text');
                if (progressEl) {
                    progressEl.textContent = progressText;
                } else if (typeof showSubscriptionProcessingOverlay === 'function') {
                    showSubscriptionProcessingOverlay(progressText);
                }
                lastSaveResult = await window.saveNoteDay({
                    date: analysis.toSave[i],
                    note: noteTrim,
                    absenceType: absenceType,
                    isHoliday: fullDayIsHoliday
                });
            }
            if (lastSaveResult && lastSaveResult.status === 'savedPendingSync') {
                notifyWorkdaySaveResult(lastSaveResult, i18n, 'alertSaveSuccess');
            } else {
                showCustomAlert(texts.saveSuccess.replace('%COUNT%', String(analysis.toSave.length)), 'success');
            }
            editingId = null;
            renderApp();
            window.showTab('list');
        } catch (error) {
            const msg = (error && error.message) ? error.message : 'Hiba történt a mentés során.';
            showCustomAlert(msg, 'info');
        } finally {
            if (typeof hideSubscriptionProcessingOverlay === 'function') {
                hideSubscriptionProcessingOverlay();
            }
            var saveBtnDone = document.querySelector('#content-full-day button[onclick="saveWorkdayEntry()"]');
            if (saveBtnDone) {
                saveBtnDone.disabled = false;
                saveBtnDone.removeAttribute('aria-busy');
            }
        }
        return;
    }

    if (!date) {
        showCustomAlert(i18n.alertMandatoryFields, 'info');
        return;
    }

    if (fullDayKind === 'vacation' || fullDayKind === 'sick') {
        const noteTrim = String(note || '').trim();
        try {
            if (typeof window.saveNoteDay !== 'function') {
                throw new Error(i18n.missingWorkTimeSaveError || 'A mentési funkció nem érhető el.');
            }
            var noteSaveResult = await window.saveNoteDay({
                date: date,
                note: noteTrim,
                absenceType: fullDayKind,
                isHoliday: fullDayIsHoliday
            });
            notifyWorkdaySaveResult(noteSaveResult, i18n, 'alertSaveSuccess');
            editingId = null;
            renderApp();
            window.showTab('list');
        } catch (error) {
            const msg = (error && error.message) ? error.message : 'Hiba történt a mentés során.';
            showCustomAlert(msg, 'info');
        }
        return;
    }

    if (fullDayKind === 'note') {
        const noteTrim = String(note || '').trim();
        if (!noteTrim || noteTrim.length < 3) {
            showCustomAlert(i18n.missingWorkTimeNoteHint || 'Írj egy rövid megjegyzést.', 'info');
            return;
        }
        try {
            if (typeof window.saveNoteDay !== 'function') {
                throw new Error(i18n.missingWorkTimeSaveError || 'A mentési funkció nem érhető el.');
            }
            var noteOnlyResult = await window.saveNoteDay({
                date: date,
                note: noteTrim,
                isHoliday: fullDayIsHoliday
            });
            notifyWorkdaySaveResult(noteOnlyResult, i18n, 'alertSaveSuccess');
            editingId = null;
            renderApp();
            window.showTab('list');
        } catch (error) {
            const msg = (error && error.message) ? error.message : 'Hiba történt a mentés során.';
            showCustomAlert(msg, 'info');
        }
        return;
    }

    // ÚJ: munkaidő hiányzik → döntés: marad a felületen VAGY mentés munkaidő nélkül (noteDay)
    if (!startTime || !endTime) {
        const title = i18n.missingWorkTimeTitle || 'Hiányzó munkaidő';
        const body = i18n.missingWorkTimeBody || 'Nem adtál meg munkaidőt. Mit szeretnél?';
        showCustomAlert(
            `<span class="block text-base font-semibold mb-2">${title}</span><span class="block text-sm">${body}</span>`,
            'warning',
            async () => {
                if (!note || String(note).trim().length < 3) {
                    showCustomAlert(i18n.missingWorkTimeNoteHint || 'Írj egy rövid megjegyzést (pl. várakozás / hétvégi pihenő).', 'info');
                    return;
                }
                try {
                    if (typeof window.saveNoteDay !== 'function') {
                        throw new Error(i18n.missingWorkTimeSaveError || 'A mentési funkció nem érhető el. Frissítsd az oldalt (Ctrl+F5) és próbáld újra.');
                    }
                    const hol = !!(document.getElementById('fullDayIsHoliday') && document.getElementById('fullDayIsHoliday').checked);
                    var holNoteResult = await window.saveNoteDay({ date: date, note: note, isHoliday: hol });
                    notifyWorkdaySaveResult(holNoteResult, i18n, 'alertSaveSuccess');
                    editingId = null;
                    renderApp();
                    window.showTab('list');
                } catch (error) {
                    const msg = (error && error.message) ? error.message : 'Hiba történt a mentés során.';
                    showCustomAlert(msg, 'info');
                }
            },
            {
                allowHTML: true,
                cancelText: i18n.missingWorkTimeCancel || 'Munkaidő megadása',
                cancelCallback: function(){},
                cancelClass: 'bg-blue-600 hover:bg-blue-700 text-white',
                confirmText: i18n.missingWorkTimeConfirm || 'Mentés munkaidő nélkül',
                confirmClass: 'bg-blue-600 hover:bg-blue-700'
            }
        );
        return;
    }
    if (kmEnd > 0 && kmStart > kmEnd && !(window.FullDayVehicleSegments && window.FullDayVehicleSegments.isActive())) {
        showCustomAlert(i18n.alertKmEndLower, 'info');
        return;
    }
    // Validáció csak heti módban
    if (drivingTimeMode === 'weekly' && parseTimeToMinutes(weeklyDriveEnd) > 0 && 
        parseTimeToMinutes(weeklyDriveStart) > parseTimeToMinutes(weeklyDriveEnd)) {
        showCustomAlert(i18n.alertWeeklyDriveEndLower, 'info');
        return;
    }

    // A számításokat az endDateStr meghatározása után végezzük el (éjszakai műszak támogatás)
    let workMinutes, nightWorkMinutes, kmDriven, compensationMinutes;

    let crossings = [];
    let crossingTombstones = _crossingFormTombstones.slice();
    let crossingsAuthoritative = false;
    const crossingsContainerEl = document.getElementById('crossingsContainer');
    const crossingRows = crossingsContainerEl
        ? crossingsContainerEl.querySelectorAll('.crossing-row')
        : document.querySelectorAll('#crossingsContainer .crossing-row');
    for (let ri = 0; ri < crossingRows.length; ri++) {
        const row = crossingRows[ri];
        const fromInput = row.querySelector('.crossing-from');
        const toInput = row.querySelector('.crossing-to');
        const timeInput = row.querySelector('.crossing-time');

        const from = fromInput ? fromInput.value.trim().toUpperCase() : '';
        const to = toInput ? toInput.value.trim().toUpperCase() : '';
        const time = timeInput ? timeInput.value : '';
        const odomInput = row.querySelector('.crossing-odometer');
        const odomRaw = odomInput ? String(odomInput.value || '').trim() : '';

        if (from && to && time) {
            let odometerKm = null;
            if (odomRaw !== '') {
                const km = typeof parseOdometerKmInput === 'function' ? parseOdometerKmInput(odomRaw) : null;
                if (km == null) {
                    const i18nErr = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
                        ? (translations[currentLang] || {})
                        : {};
                    showCustomAlert(i18nErr.alertCrossingOdometerInvalid || 'Érvénytelen km óra érték.', 'info');
                    return;
                }
                odometerKm = km;
            }
            const rowObj = { from, to, time };
            if (odometerKm != null) rowObj.odometerKm = odometerKm;
            var rowCid = row.getAttribute('data-crossing-id');
            if (rowCid) rowObj.crossingId = rowCid;
            else if (window.GurigoCrossingMerge && typeof window.GurigoCrossingMerge.newCrossingId === 'function') {
                rowObj.crossingId = window.GurigoCrossingMerge.newCrossingId();
            }
            rowObj.updatedAtMs = Date.now();
            crossings.push(rowObj);
        }
    }
    // Hydrated form = user-facing list is authoritative (supports intentional delete/edit).
    // Unhydrated / missing DOM = incomplete local — do not wipe previously saved crossings.
    if (_crossingsFormHydrated && crossingsContainerEl) {
        crossingsAuthoritative = true;
        if (editingId) {
            try {
                const _origCross = findEditingOriginalRecord(editingId);
                if (_origCross && Array.isArray(_origCross.crossingTombstones)) {
                    crossingTombstones = (window.GurigoCrossingMerge && window.GurigoCrossingMerge.mergeTombstoneLists)
                      ? window.GurigoCrossingMerge.mergeTombstoneLists(_origCross.crossingTombstones, crossingTombstones)
                      : crossingTombstones.concat(_origCross.crossingTombstones);
                }
            } catch (_) {}
        }
    } else if (editingId && crossings.length === 0) {
        try {
            const _origCross = findEditingOriginalRecord(editingId);
            if (_origCross && Array.isArray(_origCross.crossings) && _origCross.crossings.length > 0) {
                const formMissing = !crossingsContainerEl;
                if (formMissing || !_crossingsFormHydrated) {
                    crossings = _origCross.crossings.slice();
                    if (Array.isArray(_origCross.crossingTombstones)) {
                        crossingTombstones = _origCross.crossingTombstones.slice();
                    }
                }
            }
        } catch (_) {}
    }

    const isOvernight = new Date(`1970-01-01T${endTime}`) < new Date(`1970-01-01T${startTime}`);
    const endDateStr = (() => {
        const d = new Date(date + 'T00:00:00');
        if (isOvernight) d.setDate(d.getDate() + 1);
        return (typeof toISODate === 'function') ? toISODate(d) : d.toISOString().split('T')[0];
    })();

    // DÁTUM-ALAPÚ SZÁMÍTÁSOK (éjszakai műszak helyes kezelése)
    workMinutes = calculateWorkMinutes(startTime, endTime, endDateStr);
    nightWorkMinutes = calculateNightWorkMinutes(startTime, endTime, endDateStr);
    // driveMinutes már kiszámolva fent (mód szerint)
    if (drivingTimeMode === 'weekly' || drivingTimeMode === 'biweekly') {
        driveMinutes = Math.max(0, parseTimeToMinutes(weeklyDriveEnd) - parseTimeToMinutes(weeklyDriveStart));
    }
    kmDriven = Math.max(0, kmEnd - kmStart);
    compensationMinutes = parseTimeToMinutes(compensationTime);

    var useSegmentKm = window.FullDayVehicleSegments && window.FullDayVehicleSegments.isActive();
    var segmentPayload = null;
    if (useSegmentKm) {
        segmentPayload = window.FullDayVehicleSegments.readSegmentsForSave();
        if (segmentPayload.error) {
            showCustomAlert(segmentPayload.error, 'info');
            return;
        }
        if (window.VehicleSegments && window.VehicleSegments.computeTotalDistanceKm) {
            var segTotal = window.VehicleSegments.computeTotalDistanceKm(segmentPayload.segments);
            kmDriven = segTotal != null ? segTotal : 0;
            var firstSeg = segmentPayload.segments[0];
            var lastSeg = segmentPayload.segments[segmentPayload.segments.length - 1];
            kmStart = firstSeg && firstSeg.startKm != null ? firstSeg.startKm : 0;
            kmEnd = lastSeg && lastSeg.endKm != null ? lastSeg.endKm : 0;
        }
    }

    let record = {
        id: editingId ? String(editingId) : String(Date.now()),
        entryType: 'workday',
        date, endDate: endDateStr, startTime, endTime, startLocation, endLocation, kmStart, kmEnd,
        kmDriven,
        weeklyDriveStartStr: weeklyDriveStart,
        weeklyDriveEndStr: weeklyDriveEnd,
        driveMinutes,
        workMinutes: Math.max(0, workMinutes - compensationMinutes),
        compensationMinutes,
        nightWorkMinutes,
        crossings,
        crossingTombstones,
        isSplitRest,
        drivingMode,
        note
    };
    if (crossingsAuthoritative) record.crossingsAuthoritative = true;
    // Pótkocsi / Konténer: a Teljes nap vázlat a canonical workday mezőbe kerül.
    // A modul kikapcsolva nem töröl: szerkesztéskor az eredeti tömböt megőrizzük.
    if (fullDayTrailerModuleOn()) {
        const _tcLib = fullDayTrailerLib();
        const _draft = _tcLib ? _tcLib.normalizeEvents(fullDayTrailerContainerEvents) : [];
        record.trailerContainerEvents = _draft.slice();
    } else if (editingId) {
        try {
            const _origForEvents = findEditingOriginalRecord(editingId);
            if (_origForEvents && Array.isArray(_origForEvents.trailerContainerEvents)) {
                record.trailerContainerEvents = _origForEvents.trailerContainerEvents.slice();
            }
        } catch (_) {}
    }
    // V-H split adatok szerkesztéskor
    if (editingId) {
        const _origRec = findEditingOriginalRecord(editingId);
        if (_origRec && isVhEditRecord(_origRec)) {
            const vhResult = applyVhSplitFieldsToRecord(record, _origRec, driveMinutes, date, endDateStr);
            if (!vhResult.ok) {
                if (typeof showCustomAlert === 'function') {
                    showCustomAlert(vhResult.error, 'warning');
                }
                return;
            }
            record = vhResult.record;
        }
    }

    if (typeof resolveWorkdayHolidayFields === 'function') {
        record = await resolveWorkdayHolidayFields(record, fullDayIsHoliday);
    } else if (fullDayIsHoliday) {
        record.isHoliday = true;
        record.holidayDates = [date];
    }

    if (useSegmentKm && segmentPayload && segmentPayload.segments && window.VehicleSegments && window.VehicleSegments.applyFullDaySegmentsToRecord) {
        record = window.VehicleSegments.applyFullDaySegmentsToRecord(record, segmentPayload.segments);
    } else if (typeof window.EntryVehicleField !== 'undefined' && typeof window.EntryVehicleField.readSelectionForSave === 'function') {
        record = window.EntryVehicleField.readSelectionForSave(record);
    }

    const realismIssues = getRealismIssues(record);
    if (realismIssues.length) {
        const proceed = await confirmRealismOverride(realismIssues, i18n);
        if (!proceed) {
            return;
        }
    }

    try {
        var saveResult = await saveWorkRecord(record);
        if (useSegmentKm && segmentPayload && segmentPayload.segments && window.VehiclesService) {
            var lastWithVehicle = null;
            for (var si = segmentPayload.segments.length - 1; si >= 0; si--) {
                if (segmentPayload.segments[si].vehicleId) {
                    lastWithVehicle = segmentPayload.segments[si];
                    break;
                }
            }
            if (lastWithVehicle) {
                try {
                    await window.VehiclesService.saveLastSelectedVehicle({
                        id: lastWithVehicle.vehicleId,
                        plateNumber: lastWithVehicle.vehiclePlateNumber,
                        plateNumberNormalized: lastWithVehicle.vehiclePlateNumberNormalized,
                    });
                } catch (_) {}
            }
        } else if (typeof window.EntryVehicleField !== 'undefined' && typeof window.EntryVehicleField.afterSaveSuccess === 'function') {
            try { await window.EntryVehicleField.afterSaveSuccess(record); } catch (_) {}
        }
        notifyWorkdaySaveResult(saveResult, i18n, 'alertSaveSuccess');
        
        editingId = null;
        resetFullDayTrailerContainerDraft();
        if (window.TrailerContainerActive && typeof window.TrailerContainerActive.reconcile === 'function') {
            try { await window.TrailerContainerActive.reconcile({ reason: 'workday-save' }); } catch (_) {}
        }
        renderApp();
        if (typeof window.renderTachographAnalysis === 'function') {
            try { window.renderTachographAnalysis(); } catch (_) {}
        }
        if (typeof window.renderTachographStatusCard === 'function') {
            try { window.renderTachographStatusCard(); } catch (_) {}
        }
        if (typeof window.renderTachoHelperCards === 'function') {
            try { window.renderTachoHelperCards(); } catch (_) {}
        }
        if (typeof window.renderTachographViolationsCard === 'function') {
            try { window.renderTachographViolationsCard(); } catch (_) {}
        }
        window.showTab('list');
    } catch (error) {
        console.error("Hiba a mentés során:", error);
        if (typeof window.showSyncFailedAlert === 'function') {
            var i18nLocal = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
                ? (translations[currentLang] || {})
                : {};
            window.showSyncFailedAlert(i18nLocal, { localDataMayExist: false, context: 'save' });
        } else if (typeof showCustomAlert === 'function') {
            const i18nLocal = (typeof translations !== 'undefined' && typeof currentLang !== 'undefined')
                ? (translations[currentLang] || {})
                : {};
            const prefix = i18nLocal.alertSaveErrorPrefix || 'Hiba történt a mentés során:';
            const message = (error && error.message) ? ` ${error.message}` : '';
            showCustomAlert(prefix + message, 'info');
        }
    }
}

function renderRecords(options) {
    try {
        const current = Array.isArray(window.records) ? window.records : [];
        if ((!current.length) && localStorage.getItem('workRecords')) {
            const maybe = JSON.parse(localStorage.getItem('workRecords') || '[]');
            if (Array.isArray(maybe) && maybe.length > 0) {
                window.records = maybe;
                try { if (typeof records !== 'undefined') records = maybe; } catch (_) {}
            }
        }
    } catch(e) { 
        console.warn('fallback load workRecords failed', e); 
    }
    
    const i18n = translations[currentLang];
    const container = safeGetElement('recordsContent');
    if (!container) return;
    
    const locale = (typeof getCurrentLocale === 'function') ? getCurrentLocale() : (currentLang === 'de' ? 'de-DE' : (currentLang === 'en' ? 'en-US' : (currentLang === 'ro' ? 'ro-RO' : (currentLang === 'pl' ? 'pl-PL' : 'hu-HU'))));
    const sorted = (typeof window.getRecordsForListDisplay === 'function')
        ? window.getRecordsForListDisplay()
        : getSortedRecords();
    const totalItems = Array.isArray(sorted) ? sorted.length : 0;

    const drivingTimeMode = localStorage.getItem('drivingTimeMode') || 'weekly';

    if (!totalItems) {
        container.innerHTML = `<p class="text-center text-gray-500 py-8">${i18n.noEntries}</p>`;
        recordsCurrentPage = 1;
        renderPaginationControls(1, 0);
        return;
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / recordsPageSize));
    clampRecordsCurrentPage(totalPages);

    const startIndex = (recordsCurrentPage - 1) * recordsPageSize;
    let pageRecords = sorted.slice(startIndex, startIndex + recordsPageSize);

    if (!pageRecords.length && recordsCurrentPage > 1 && recordsOlderHasMore() && !(options && options._olderLoadRetried)) {
        showRecordsListLoading(i18n.recordsLoadingOlder || 'Régebbi bejegyzések betöltése…');
        void ensureRecordsLoadedForPage(recordsCurrentPage).then(function () {
            renderRecords(Object.assign({}, options || {}, { _olderLoadRetried: true }));
        });
        return;
    }

    // Trailer carried-day display needs full event history, not only the current page.
    if (typeof window.isTrailerContainerModuleEnabled === 'function' && window.isTrailerContainerModuleEnabled()
        && window.TrailerContainerActive && typeof window.TrailerContainerActive.ensureHistory === 'function'
        && !renderRecords._trailerHistoryAsked) {
        renderRecords._trailerHistoryAsked = true;
        window.TrailerContainerActive.ensureHistory().then(function () {
            renderRecords(Object.assign({}, options || {}, { _trailerHistoryRefresh: true }));
        }).catch(function () {});
    }

    if (!pageRecords.length) {
        container.innerHTML = `<p class="text-center text-gray-500 py-8">${i18n.noEntries}</p>`;
        renderPaginationControls(totalPages, totalItems);
        if (options && options.scrollToTop) {
            requestAnimationFrame(scrollRecordsListToTop);
        }
        return;
    }

    container.innerHTML = pageRecords.map(r => {
            const entryType = (r && r.entryType) ? r.entryType : 'workday';
            const d = new Date(r.date);
            const day = d.getUTCDay();
            const weekendClass = (day === 6 || day === 0) ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/50';
            const realismIssues = entryType === 'workday' ? getRealismIssues(r) : [];
            const hasRealismIssues = realismIssues.length > 0;
            
            // Km óra állás figyelmeztetés: van kezdő km de nincs záró km
            const hasKmWarning = entryType === 'workday' && (r.kmStart > 0 && (!r.kmEnd || r.kmEnd === 0));
            
            const holDatesWork = (typeof getHolidayDatesForRecord === 'function') ? getHolidayDatesForRecord(r) : (r.isHoliday === true ? [r.date] : []);
            const holWorkBadge = holDatesWork.length > 0
                ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 dark:bg-violet-900/40 text-violet-800 dark:text-violet-200 border border-violet-300 dark:border-violet-700">${i18n.badgeHoliday || 'Ünnep'}</span>`
                : '';

            const realismBadge = hasRealismIssues ? `
                <button type="button"
                    onclick="editRecord('${r.id}')"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300 dark:border-amber-700"
                    title="${i18n.realismListHint || ''}">
                    ⚠️ ${(i18n.realismListBadge || 'Gyanús adat')}
                </button>
            ` : '';
            
            const kmWarningBadge = hasKmWarning ? `
                <button type="button"
                    onclick="editRecord('${r.id}')"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200 border border-orange-300 dark:border-orange-700"
                    title="${i18n.kmWarningListHint || 'Kezdő km megadva, de záró km hiányzik'}">
                    ⚠️ ${(i18n.kmWarningListBadge || 'Záró km hiányzik')}
                </button>
            ` : '';
            
            const realismHint = hasRealismIssues && i18n.realismListHint
                ? `<p class="text-[11px] text-amber-700 dark:text-amber-300 mt-1">${i18n.realismListHint}</p>`
                : '';
            const realismCardClass = hasRealismIssues ? 'ring-1 ring-amber-300 dark:ring-amber-600' : '';

            if (entryType === 'noteDay') {
                const absVac = r.absenceType === 'vacation';
                const absSick = r.absenceType === 'sick';
                const hol = r.isHoliday === true;
                const absBadge = absVac
                    ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200">${i18n.badgeVacation || 'Szabadság'}</span>`
                    : (absSick
                        ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200">${i18n.badgeSick || 'Betegség'}</span>`
                        : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100">${i18n.noWorkTime || 'Nincs munkaidő'}</span>`);
                const holBadge = hol
                    ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 dark:bg-violet-900/40 border border-violet-300 dark:border-violet-700 text-violet-800 dark:text-violet-200">${i18n.badgeHoliday || 'Ünnep'}</span>`
                    : '';
                const pendingBadge = getRecordPendingBadgeHtml(i18n, r.id);
                const noteDayDateStr = new Date(r.date + 'T00:00:00').toLocaleDateString(locale);
                return `
                <div class="${weekendClass} rounded-lg p-3 mb-3 text-sm shadow-sm">
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <div class="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                            <span class="font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">${noteDayDateStr}</span>
                            ${absBadge}
                            ${holBadge}
                            ${pendingBadge}
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0">
                            ${renderRecordEditActionsHtml(r.id, r)}
                        </div>
                    </div>
                    ${r.pallets && r.pallets.length > 0 ? r.pallets.map(p => {
                            const detailsHTML = [
                                p.type ? `<span class="mt-1 text-xs font-semibold bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-full">${p.type}</span>` : '',
                                p.licensePlate ? `<p class="text-xs text-gray-400 mt-1">${i18n.palletsLicensePlateLabel || ''}: ${p.licensePlate || '-'}</p>` : ''
                            ].filter(Boolean).join('');
                            return `<div class="mt-2 text-sm text-gray-600 dark:text-gray-400">${detailsHTML}</div>`;
                        }).join('') : ''}
                    ${r.note ? `<div class="mt-1 text-xs text-gray-600 dark:text-gray-400"><span class="font-semibold">${(i18n.entryNote || 'Megjegyzés')}:</span> ${r.note}</div>` : ''}
                </div>`;
            }

            const isOvernight = new Date(`1970-01-01T${r.endTime}`) < new Date(`1970-01-01T${r.startTime}`);

            const endDateStr = r.endDate || r.date;
            const endDate = new Date(endDateStr + 'T00:00:00');
            let startDate = new Date(endDateStr + 'T00:00:00');
            if (isOvernight) {
                startDate.setDate(startDate.getDate() - 1);
            }

            const formatShortDate = (dt) => dt.toLocaleDateString(locale, { month: '2-digit', day: '2-digit' });

            // V-H (vasárnap–hétfő) jelölés
            let vhBadgeHtml = '';
            if (r.isSundayMondayShift) {
                const vhSrc = r.sundayMondaySplitSource || '';
                if (vhSrc === 'vehicle_weekly_display') {
                    vhBadgeHtml = `
                      <div class="mt-1 text-[11px] text-green-700 dark:text-green-300">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/40 border border-green-300 dark:border-green-700" title="${(i18n.vhBadgeVehicleDisplayTitle || 'A vasárnap–hétfő bontás a kamion kijelzőjén látható heti vezetési idő alapján történt.').replace(/"/g, '&quot;')}">
                          🚛 ${i18n.vhBadgeVehicleDisplay || 'V-H kamion kijelző alapján'}
                        </span>
                      </div>`;
                } else if (vhSrc === 'manual_monday_after_midnight' || vhSrc === 'manual_edit' || r.isSundayMondayManual) {
                    vhBadgeHtml = `
                      <div class="mt-1 text-[11px] text-amber-700 dark:text-amber-300">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700" title="${(i18n.vhBadgeManualSplitTitle || 'A vasárnap–hétfő műszak bontása sofőr által kézzel megadott hétfői adat alapján történt.').replace(/"/g, '&quot;')}">
                          ${i18n.vhBadgeManualSplit || 'V-H kézi bontás'}
                        </span>
                      </div>`;
                } else {
                    vhBadgeHtml = `
                      <div class="mt-1 text-[11px] text-sky-700 dark:text-sky-300">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/40 border border-sky-300 dark:border-sky-700" title="${(i18n.vhBadgeClosingDayTitle || 'A vasárnap–hétfő műszak teljes vezetési ideje a hétfői naphoz számolódik.').replace(/"/g, '&quot;')}">
                          ${i18n.vhBadgeClosingDay || 'V-H zárónapra számolva'}
                        </span>
                      </div>`;
                }
            }

            const workdayDateLabel = isOvernight ? `${startDate.toLocaleDateString(locale)} - ${endDate.toLocaleDateString(locale)}` : endDate.toLocaleDateString(locale);
            const pendingBadge = getRecordPendingBadgeHtml(i18n, r.id);
            const workdayBadgeCluster = [holWorkBadge, realismBadge, kmWarningBadge, pendingBadge].filter(Boolean).join('');
            const recordDistanceKm = (typeof window.VehicleSegments !== 'undefined' && window.VehicleSegments.getRecordDistanceKm)
                ? window.VehicleSegments.getRecordDistanceKm(r)
                : (r.kmDriven || 0);
            const vehicleLineHtml = (typeof window.VehicleSegments !== 'undefined' && window.VehicleSegments.formatListCardVehicleBlock)
                ? window.VehicleSegments.formatListCardVehicleBlock(r)
                : ((typeof window.EntryVehicleField !== 'undefined' && window.EntryVehicleField.getRecordVehiclePlate)
                    ? (function () {
                        var vehiclePlate = window.EntryVehicleField.getRecordVehiclePlate(r);
                        return vehiclePlate
                            ? '<div class="flex justify-between text-xs text-gray-500 dark:text-gray-400"><span>' + (i18n.recordVehicleLabel || 'Jármű') + ':</span><span>' + String(vehiclePlate).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</span></div>'
                            : '';
                    })()
                    : '');
            const hideEntryDistanceLine = !!vehicleLineHtml;
            return `
            <div class="${weekendClass} ${realismCardClass} rounded-lg p-3 mb-3 text-sm shadow-sm">
                <div class="flex items-start justify-between mb-2 gap-2">
                    <div class="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                        <span class="font-semibold text-gray-800 dark:text-gray-100">${workdayDateLabel}</span>
                        ${workdayBadgeCluster}
                    </div>
                    <div class="flex items-center gap-1 flex-shrink-0">
                        ${renderRecordEditActionsHtml(r.id, r)}
                    </div>
                </div>
                <div class="space-y-1 text-gray-600 dark:text-gray-300">
                    <div class="flex justify-between"><span>${i18n.entryDeparture}:</span><span>${isOvernight ? formatShortDate(startDate) : ""} ${r.startTime} (${r.startLocation || "N/A"})</span></div>
                    <div class="flex justify-between"><span>${i18n.entryArrival}:</span><span>${formatShortDate(endDate)} ${r.endTime} (${r.endLocation || "N/A"})</span></div>
                    <div class="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-1 mt-1"><span>${i18n.entryWorkTime}:</span><span class="font-bold text-gray-800 dark:text-gray-100">${formatDuration(r.workMinutes)}</span></div>
                    ${r.compensationMinutes > 0 ? `<div class="flex justify-between text-yellow-700 dark:text-yellow-400 text-xs"><span>&nbsp;&nbsp;└ ${i18n.entryCompensation}:</span><span>-${formatDuration(r.compensationMinutes)}</span></div>` : ''}
                    <div class="flex justify-between"><span>${i18n.entryNightTime}:</span><span class="text-purple-600 dark:text-purple-400">${formatDuration(r.nightWorkMinutes || 0)}</span></div>
                    <div class="flex justify-between"><span>${i18n.entryDriveTime}:</span><span class="text-blue-700 dark:text-blue-300">${formatDuration(r.driveMinutes)}</span></div>
                    ${vhBadgeHtml}
                    ${hideEntryDistanceLine ? '' : `<div class="flex justify-between"><span>${i18n.entryDistance}:</span><span class="text-orange-600 dark:text-orange-400">${recordDistanceKm} km</span></div>`}
                    ${vehicleLineHtml}
                    ${(r.crossings && r.crossings.length > 0) ? `<div class="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2"><p class="font-semibold text-xs text-indigo-700 dark:text-indigo-300">${i18n.entryCrossingsLabel}:</p><div class="text-xs pl-2">${r.crossings.map(c => {
                        const inner = typeof formatCrossingParenthetical === 'function'
                            ? formatCrossingParenthetical(c, r, i18n)
                            : (c.time || '');
                        return `<span>${c.from} - ${c.to} (${inner})</span>`;
                    }).join("<br>")}</div></div>` : ""}
                    ${r.note ? `<div class="mt-1 text-xs text-gray-600 dark:text-gray-400"><span class="font-semibold">${(i18n.entryNote || 'Megjegyzés')}:</span> ${r.note}</div>` : ''}
                    ${(function () {
                        if (typeof window.TrailerContainerLog === 'undefined' || typeof window.TrailerContainerLog.renderDaySectionHtml !== 'function') return '';
                        var moduleOn = (typeof window.isTrailerContainerModuleEnabled === 'function' && window.isTrailerContainerModuleEnabled());
                        if (!moduleOn) return '';
                        var hist = (window.TrailerContainerActive && typeof window.TrailerContainerActive.getHistoryRecords === 'function')
                            ? window.TrailerContainerActive.getHistoryRecords()
                            : (Array.isArray(window.records) ? window.records : sorted);
                        var histOpts = {};
                        var histComplete = window.TrailerContainerActive
                            && typeof window.TrailerContainerActive.isHistoryComplete === 'function'
                            && window.TrailerContainerActive.isHistoryComplete();
                        if (!histComplete && typeof recordsOlderHasMore === 'function' && recordsOlderHasMore()) {
                            histOpts.historyIncomplete = true;
                        } else if (!histComplete && !(window.TrailerContainerActive && window.TrailerContainerActive.getHistoryRecords)) {
                            histOpts.historyIncomplete = true;
                        }
                        return window.TrailerContainerLog.renderDaySectionHtml(r, i18n, true, hist, histOpts);
                    })()}
                    ${realismHint}
                </div>
            </div>`;
        }).join('');

    renderPaginationControls(totalPages, totalItems);

    if (options && options.scrollToTop) {
        requestAnimationFrame(scrollRecordsListToTop);
    }
    if (typeof window.refreshOfflinePolicyUi === 'function') {
        try { window.refreshOfflinePolicyUi(); } catch (_) {}
    }
}

function editRecord(id) {
    const listSource = getRecordsListSource();
    const fallback = Array.isArray(window.records) ? window.records : [];
    const record = listSource.find(r => r.id === String(id)) || fallback.find(r => r.id === String(id));
    if (!record) return;
    if (!canShowRecordEditActions(record)) {
        if (typeof window.showSyncedRecordReadOnlyAlert === 'function') window.showSyncedRecordReadOnlyAlert();
        return;
    }

    editingId = String(id);
    window.showTab('full-day');

    hideVhSplitSection();
    
    Object.keys(record).forEach(key => {
        const el = document.getElementById(key.replace('Str', ''));
        if (el) el.value = record[key] || '';
    });
    
    const compensationEl = document.getElementById('compensationTime');
    if (compensationEl) {
        compensationEl.value = record.compensationMinutes ? formatAsHoursAndMinutes(record.compensationMinutes) : '';
    }

    const drivingTimeMode = localStorage.getItem('drivingTimeMode') || 'weekly';
    if (drivingTimeMode === 'daily') {
        const dailyDriveInput = document.getElementById('dailyDriveTime');
        if (dailyDriveInput && typeof formatAsHoursAndMinutes === 'function') {
            const minutes = typeof record.driveMinutes === 'number' ? record.driveMinutes : 0;
            dailyDriveInput.value = minutes > 0 ? formatAsHoursAndMinutes(minutes) : '';
        }
    }

    const splitRestToggle = document.getElementById('toggleSplitRest');
    if (splitRestToggle) {
        splitRestToggle.checked = record.isSplitRest || false;
        updateEnhancedToggleVisuals(splitRestToggle);
    }

    {
        const mode = (typeof window.resolveDrivingMode === 'function')
          ? window.resolveDrivingMode(record)
          : (record.drivingMode === 'team' ? 'team' : 'single');
        const hasStoredMode = (typeof window.normalizeDrivingMode === 'function')
          ? !!window.normalizeDrivingMode(record.drivingMode)
          : (record.drivingMode === 'team' || record.drivingMode === 'single');
        const editMode = hasStoredMode
          ? mode
          : ((typeof window.getDefaultDrivingModeFromSettings === 'function')
              ? window.getDefaultDrivingModeFromSettings()
              : mode);
        setEntryDrivingModeUi(editMode);
    }

    const crossingsContainer = document.getElementById('crossingsContainer');
    if(crossingsContainer) {
        crossingsContainer.innerHTML = '';
        resetCrossingFormSyncState();
        (record.crossings || []).forEach(c => {
            var cid = c && c.crossingId ? c.crossingId : '';
            if (!cid && window.GurigoCrossingMerge && typeof window.GurigoCrossingMerge.ensureCrossingId === 'function') {
                cid = window.GurigoCrossingMerge.ensureCrossingId(c).crossingId;
            }
            addCrossingRow(c.from, c.to, c.time, c.odometerKm != null && c.odometerKm !== '' ? c.odometerKm : '', cid);
        });
        markCrossingsFormHydrated();
    }

    const entryTypeEd = (record && record.entryType) ? record.entryType : 'workday';
    const holEl = document.getElementById('fullDayIsHoliday');
    if (holEl) {
        holEl.checked = record.isHoliday === true;
    }
    const vacStartEl = document.getElementById('vacationStartDate');
    const vacEndEl = document.getElementById('vacationEndDate');
    if (vacStartEl) vacStartEl.value = record.date || '';
    if (vacEndEl) vacEndEl.value = record.date || '';

    if (entryTypeEd === 'noteDay') {
        var kindVal = 'note';
        if (record.absenceType === 'vacation') kindVal = 'vacation';
        else if (record.absenceType === 'sick') kindVal = 'sick';
        var kindRadio = document.querySelector('input[name="fullDayKind"][value="' + kindVal + '"]');
        if (kindRadio) kindRadio.checked = true;
    } else {
        var workRadio = document.querySelector('input[name="fullDayKind"][value="work"]');
        if (workRadio) workRadio.checked = true;
    }
    syncFullDayKindVisuals();
    syncFullDayPanels();
    if (entryTypeEd === 'workday') {
        loadFullDayTrailerContainerDraft(record.trailerContainerEvents);
    } else {
        resetFullDayTrailerContainerDraft();
    }
    if (holEl && typeof updateEnhancedToggleVisuals === 'function') {
        updateEnhancedToggleVisuals(holEl);
    }

    if (isVhEditRecord(record)) {
        showVhSplitSection();
        populateVhSplitFields(record);
    } else {
        hideVhSplitSection();
    }

    updateDisplays();

    if (typeof window.FullDayVehicleSegments !== 'undefined' && typeof window.FullDayVehicleSegments.init === 'function') {
        window.FullDayVehicleSegments.init(record);
    } else if (typeof window.EntryVehicleField !== 'undefined' && typeof window.EntryVehicleField.initEntryVehicleField === 'function') {
        window.EntryVehicleField.initEntryVehicleField({ record: record });
    }
}

function confirmDeleteRecord(id) {
    const i18n = translations[currentLang];
    const listSource = getRecordsListSource();
    const fallback = Array.isArray(window.records) ? window.records : [];
    const record = listSource.find(r => r.id === String(id)) || fallback.find(r => r.id === String(id));
    if (record && !canShowRecordEditActions(record)) {
        if (typeof window.showSyncedRecordReadOnlyAlert === 'function') window.showSyncedRecordReadOnlyAlert();
        return;
    }
    showCustomAlert(
        i18n.alertConfirmDelete, 
        'warning', 
        async () => {
            try {
                if (typeof window.deleteWorkRecord !== 'function') {
                    throw new Error(i18n.recordsListDeleteNotLoaded || 'A törlési függvény még nem töltődött be. Frissítsd az oldalt (Ctrl+F5), vagy próbáld újra később.');
                }
                await window.deleteWorkRecord(id);
                if (window.TrailerContainerActive && typeof window.TrailerContainerActive.reconcile === 'function') {
                    try { await window.TrailerContainerActive.reconcile({ reason: 'workday-delete' }); } catch (_) {}
                }
                // Minimális UI frissítés: SPA újrarajzolás (nem teljes oldal reload)
                if (typeof renderApp === 'function') renderApp();
                if (typeof window.showTab === 'function') window.showTab(window.currentActiveTab || 'list');
                try {
                    if (typeof showCustomAlert === 'function') {
                        const successMsg = i18n.entryDeleteSuccess || 'Bejegyzés törölve.';
                        showCustomAlert(successMsg, 'success');
                    }
                } catch(_) {}
            } catch (e) {
                try { console.error('Delete failed:', e); } catch(_) {}
                try {
                    if (typeof showCustomAlert === 'function') {
                        const errMsg = i18n.deleteErrorTryLater || i18n.deleteErrorGeneric || 'A törlés nem sikerült. Próbáld újra később.';
                        showCustomAlert(errMsg, 'info');
                    }
                } catch(_) {}
            }
        },
        { confirmText: i18n.delete, confirmClass: 'bg-red-500 hover:bg-red-600' }
    );
}

if (typeof window !== 'undefined') {
    window.saveWorkdayEntry = saveWorkdayEntry;
    window.addFullDayTrailerContainerEvent = addFullDayTrailerContainerEvent;
    window.prepareFullDayTrailerContainerDrop = prepareFullDayTrailerContainerDrop;
    window.resetFullDayTrailerContainerDraft = resetFullDayTrailerContainerDraft;
    window.loadFullDayTrailerContainerDraft = loadFullDayTrailerContainerDraft;
    window.renderFullDayTrailerContainer = renderFullDayTrailerContainer;
}