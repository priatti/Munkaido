/**
 * GuriGO – Pótkocsi / Konténer nyilvántartás (Trailer / Container shift event log).
 *
 * Pure logic only. No DOM, no network, no storage access here.
 * Modeled on the live border-crossing form: an ordered log of shift events.
 *
 * Event shape:
 *   { type: "trailer"|"container", action: "pickup"|"drop",
 *     identifier: string (required), time?: "HH:MM", odometerKm?: int,
 *     location?: string, note?: string }
 *
 * "pickup" is the single attach/take action, "drop" is the single detach/drop action.
 * History is append-only: a drop never overwrites a pickup.
 *
 * Loadable both as a browser global (window.TrailerContainerLog) and as a
 * CommonJS module (module.exports) so node tests can require it without a browser.
 */
(function (global) {
  'use strict';

  var VALID_TYPES = ['trailer', 'container'];
  var VALID_ACTIONS = ['pickup', 'drop'];

  /**
   * Normalize an identifier: trim, collapse internal whitespace to a single
   * space, uppercase. Returns '' for empty / whitespace-only input.
   * No country plate pattern, no ISO 6346 enforcement.
   */
  function normalizeIdentifier(raw) {
    if (raw == null) return '';
    var s = String(raw).trim().replace(/\s+/g, ' ').toUpperCase();
    return s;
  }

  function isValidType(type) {
    return VALID_TYPES.indexOf(type) !== -1;
  }

  function isValidAction(action) {
    return VALID_ACTIONS.indexOf(action) !== -1;
  }

  /**
   * Parse an optional "HH:MM" time. Returns the normalized "HH:MM" string,
   * or null when the input is empty / missing (missing time is valid).
   * Returns undefined for a malformed non-empty value (caller treats as invalid).
   */
  function parseTimeInput(raw) {
    if (raw == null) return null;
    var s = String(raw).trim();
    if (s === '') return null;
    var m = /^([0-9]{1,2}):([0-9]{2})$/.exec(s);
    if (!m) return undefined;
    var h = parseInt(m[1], 10);
    var min = parseInt(m[2], 10);
    if (!Number.isFinite(h) || !Number.isFinite(min)) return undefined;
    if (h < 0 || h > 23 || min < 0 || min > 59) return undefined;
    return (h < 10 ? '0' + h : '' + h) + ':' + (min < 10 ? '0' + min : '' + min);
  }

  /**
   * Parse an optional odometer km value. Reuses the shared parseOdometerKmInput
   * when available (same semantics as the border-crossing form). Empty km is
   * valid (returns null). An invalid non-empty km returns undefined so the
   * caller can reject that save.
   */
  function parseOdometerKm(raw) {
    if (raw == null) return null;
    var s = String(raw).trim();
    if (s === '') return null;
    var parser = (typeof global !== 'undefined' && typeof global.parseOdometerKmInput === 'function')
      ? global.parseOdometerKmInput
      : null;
    if (parser) {
      var parsed = parser(raw);
      // parseOdometerKmInput returns null for empty OR invalid. We already
      // handled empty above, so a null here means the non-empty input was invalid.
      return parsed == null ? undefined : parsed;
    }
    // Fallback parser mirrors crossingFormat.parseOdometerKmInput.
    var n = parseInt(s.replace(/\s/g, ''), 10);
    if (!Number.isFinite(n) || n < 0 || n > 9999999) return undefined;
    return n;
  }

  /**
   * Build a validated event object from raw input.
   * @returns {{ ok: true, event: object } | { ok: false, error: string }}
   *   error is one of: 'type', 'action', 'identifierRequired', 'odometerInvalid', 'timeInvalid'
   */
  function createEvent(input) {
    input = input || {};
    if (!isValidType(input.type)) {
      return { ok: false, error: 'type' };
    }
    if (!isValidAction(input.action)) {
      return { ok: false, error: 'action' };
    }
    var identifier = normalizeIdentifier(input.identifier);
    if (identifier === '') {
      return { ok: false, error: 'identifierRequired' };
    }

    var time = parseTimeInput(input.time);
    if (time === undefined) {
      return { ok: false, error: 'timeInvalid' };
    }

    var odometerKm = parseOdometerKm(input.odometerKm);
    if (odometerKm === undefined) {
      return { ok: false, error: 'odometerInvalid' };
    }

    var event = {
      type: input.type,
      action: input.action,
      identifier: identifier
    };
    if (time != null) event.time = time;
    if (odometerKm != null) event.odometerKm = odometerKm;

    if (input.note != null) {
      var note = String(input.note).trim();
      if (note !== '') event.note = note;
    }

    var location = parseLocation(input.location);
    if (location != null) event.location = location;

    // Stable id for multi-device merge / idempotent retries. Prefer caller-supplied id.
    event.eventId = (input.eventId != null && String(input.eventId).trim() !== '')
      ? String(input.eventId).trim()
      : makeEventId();
    if (input.createdAtMs != null && typeof input.createdAtMs === 'number' && Number.isFinite(input.createdAtMs)) {
      event.createdAtMs = input.createdAtMs;
    } else {
      event.createdAtMs = Date.now();
    }

    return { ok: true, event: event };
  }

  function makeEventId() {
    return 'ev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  /**
   * Deterministic fingerprint for legacy events that predate eventId.
   * Does not invent history — only identifies duplicates for merge/dedup.
   */
  function eventFingerprint(ev) {
    if (!ev || typeof ev !== 'object') return '';
    return [
      ev.type || '',
      ev.action || '',
      normalizeIdentifier(ev.identifier),
      ev.time || '',
      ev.odometerKm != null ? String(ev.odometerKm) : '',
      ev.location || '',
      ev.note || ''
    ].join('|');
  }

  function eventMergeKey(ev) {
    if (ev && ev.eventId != null && String(ev.eventId).trim() !== '') {
      return 'id:' + String(ev.eventId).trim();
    }
    return 'fp:' + eventFingerprint(ev);
  }

  /**
   * Union two event lists with deterministic dedup. Never drops a unique event.
   * Sort: createdAtMs asc, then time, then merge key (stable).
   */
  function mergeEventLists(a, b) {
    var map = {};
    var order = [];
    function add(list) {
      normalizeEvents(list).forEach(function (ev) {
        var key = eventMergeKey(ev);
        if (!map[key]) {
          map[key] = ev;
          order.push(key);
        } else {
          // Prefer the copy that already has eventId / richer optional fields.
          var prev = map[key];
          var next = Object.assign({}, prev, ev);
          if (prev.eventId && !ev.eventId) next.eventId = prev.eventId;
          if (ev.eventId) next.eventId = ev.eventId;
          if (prev.createdAtMs != null && next.createdAtMs == null) next.createdAtMs = prev.createdAtMs;
          map[key] = next;
        }
      });
    }
    add(a);
    add(b);
    return order.map(function (k) { return map[k]; }).sort(function (x, y) {
      var cx = typeof x.createdAtMs === 'number' ? x.createdAtMs : 0;
      var cy = typeof y.createdAtMs === 'number' ? y.createdAtMs : 0;
      if (cx !== cy) return cx - cy;
      var tx = x.time || '';
      var ty = y.time || '';
      if (tx !== ty) return tx < ty ? -1 : (tx > ty ? 1 : 0);
      var kx = eventMergeKey(x);
      var ky = eventMergeKey(y);
      return kx < ky ? -1 : (kx > ky ? 1 : 0);
    });
  }

  /**
   * Optional place name. Empty, whitespace-only, and the GPS loading sentinel
   * are omitted so old events and blank forms stay without a location key.
   */
  function parseLocation(value) {
    if (value == null) return null;
    var s = String(value).trim();
    if (s === '' || s === '...') return null;
    return s;
  }

  /**
   * Append a validated event to a history array (returns a new array).
   * History is never mutated in place and never has entries removed.
   */
  function appendEvent(events, event) {
    var list = normalizeEvents(events);
    return list.concat([event]);
  }

  /**
   * Treat a missing / non-array history as an empty list. Also tolerates old
   * records where the field is absent.
   */
  function normalizeEvents(events) {
    if (!Array.isArray(events)) return [];
    return events.filter(function (e) {
      return e && isValidType(e.type) && isValidAction(e.action) &&
        typeof e.identifier === 'string' && e.identifier !== '';
    });
  }

  function activeKey(type, identifier) {
    return type + '::' + normalizeIdentifier(identifier);
  }

  /**
   * Vehicle scope for cross-day active state. Empty string = unknown/unscoped
   * legacy events (still participate). Firm actives are filtered per current
   * vehicle when a vehicleId is provided by the caller.
   */
  function normalizeVehicleId(raw) {
    if (raw == null) return '';
    var s = String(raw).trim();
    return s;
  }

  function resolveVehicleScope(source, event, fallbackVehicleId) {
    if (source && source.vehicleId != null && String(source.vehicleId).trim() !== '') {
      return normalizeVehicleId(source.vehicleId);
    }
    if (event && event.vehicleId != null && String(event.vehicleId).trim() !== '') {
      return normalizeVehicleId(event.vehicleId);
    }
    if (fallbackVehicleId != null) return normalizeVehicleId(fallbackVehicleId);
    return '';
  }

  /**
   * Same vehicle + same type: a later pickup of a *different* identifier
   * supersedes prior active units without inventing a drop event. Superseded
   * units are excluded from the firm active set (ambiguous carry).
   */
  function applySameTypeSupersede(state, ev, vehicleId, order) {
    if (!ev || ev.action !== 'pickup') return;
    var vid = normalizeVehicleId(vehicleId);
    var id = normalizeIdentifier(ev.identifier);
    Object.keys(state).forEach(function (key) {
      var entry = state[key];
      if (!entry || !entry.active) return;
      if (entry.type !== ev.type) return;
      if (entry.identifier === id) return;
      var entryVid = normalizeVehicleId(entry.vehicleId);
      // Only supersede when both sides share a vehicle scope, or both unknown.
      if (entryVid !== vid) return;
      entry.active = false;
      entry.ambiguousSuperseded = true;
    });
  }

  function validateTransition(items, event) {
    var list = Array.isArray(items) ? items : [];
    if (!event || !isValidAction(event.action) || !isValidType(event.type)) {
      return { ok: false, warning: null, error: 'type' };
    }
    var id = normalizeIdentifier(event.identifier);
    if (!id) return { ok: false, warning: null, error: 'identifierRequired' };
    var currently = false;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].type === event.type && normalizeIdentifier(list[i].identifier) === id) {
        currently = true;
        break;
      }
    }
    if (event.action === 'pickup' && currently) {
      return { ok: true, warning: 'alreadyActive', error: null };
    }
    if (event.action === 'drop' && !currently) {
      return { ok: true, warning: 'dropInactive', error: null };
    }
    return { ok: true, warning: null, error: null };
  }

  /**
   * Soft validation of a remote canonical doc against history-derived items.
   * Does not write. Items present remotely but absent from history rebuild are
   * treated as stale and dropped from the trusted set. History-only firm items
   * are kept. Ambiguous superseded items never become firm actives.
   */
  function trustActiveItems(remoteItems, historyItems) {
    var hist = {};
    (Array.isArray(historyItems) ? historyItems : []).forEach(function (item) {
      if (!item) return;
      hist[activeKey(item.type, item.identifier) + '::' + normalizeVehicleId(item.vehicleId)] = item;
    });
    var trusted = [];
    var stale = [];
    (Array.isArray(remoteItems) ? remoteItems : []).forEach(function (item) {
      if (!item || !isValidType(item.type)) return;
      var key = activeKey(item.type, item.identifier) + '::' + normalizeVehicleId(item.vehicleId);
      if (hist[key]) trusted.push(hist[key]);
      else stale.push(item);
    });
    // Include history firm items missing from remote (repair path for display)
    Object.keys(hist).forEach(function (key) {
      var found = false;
      for (var i = 0; i < trusted.length; i++) {
        var t = trusted[i];
        if (activeKey(t.type, t.identifier) + '::' + normalizeVehicleId(t.vehicleId) === key) {
          found = true;
          break;
        }
      }
      if (!found) trusted.push(hist[key]);
    });
    return { items: trusted, staleRemote: stale, trustedFromHistory: true };
  }



  /**
   * Derive currently active items from history, in array (insertion) order,
   * keyed per type + normalized identifier.
   *   pickup  -> active
   *   a later drop -> inactive
   * More than one trailer and more than one container may be active together.
   * History is never consulted destructively.
   *
   * @returns {Array<{ type, identifier, pickup, lastEvent }>} active items in
   *          the insertion order of their activating pickup.
   */
  function getActiveItems(events) {
    var list = normalizeEvents(events);
    var state = {}; // key -> { active, type, identifier, pickup, order }
    var order = [];
    for (var i = 0; i < list.length; i++) {
      var ev = list[i];
      var key = activeKey(ev.type, ev.identifier);
      if (!(key in state)) {
        state[key] = { active: false, type: ev.type, identifier: normalizeIdentifier(ev.identifier), pickup: null, order: -1 };
      }
      var entry = state[key];
      if (ev.action === 'pickup') {
        entry.active = true;
        entry.pickup = ev;
        entry.order = i;
      } else if (ev.action === 'drop') {
        entry.active = false;
      }
    }
    var active = [];
    Object.keys(state).forEach(function (key) {
      if (state[key].active) active.push(state[key]);
    });
    active.sort(function (a, b) { return a.order - b.order; });
    return active.map(function (e) {
      return { type: e.type, identifier: e.identifier, pickup: e.pickup };
    });
  }

  /**
   * True when the given type + identifier is currently active in history.
   */
  function isActive(events, type, identifier) {
    var key = activeKey(type, identifier);
    var active = getActiveItems(events);
    for (var i = 0; i < active.length; i++) {
      if (activeKey(active[i].type, active[i].identifier) === key) return true;
    }
    return false;
  }

  /**
   * Quick drop: create a new drop event for an active item, reusing its type
   * and identifier. Time, km, and note are optional. The original pickup is
   * never mutated. Returns the same result shape as createEvent.
   */
  function createQuickDrop(activeItem, extra) {
    extra = extra || {};
    if (!activeItem) return { ok: false, error: 'type' };
    return createEvent({
      type: activeItem.type,
      action: 'drop',
      identifier: activeItem.identifier,
      time: extra.time,
      odometerKm: extra.odometerKm,
      location: extra.location,
      note: extra.note
    });
  }

  /**
   * Itemize a history list for display / report output, in insertion order.
   * Only present optional fields are included (no placeholder for absent ones).
   */
  function itemizeEvents(events) {
    var list = normalizeEvents(events);
    return list.map(function (ev) {
      var item = {
        type: ev.type,
        action: ev.action,
        identifier: ev.identifier
      };
      if (ev.time != null && ev.time !== '') item.time = ev.time;
      if (ev.odometerKm != null) item.odometerKm = ev.odometerKm;
      if (ev.location != null && ev.location !== '') item.location = ev.location;
      if (ev.note != null && ev.note !== '') item.note = ev.note;
      return item;
    });
  }

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function label(dict, key) {
    return (dict && dict[key]) || '';
  }

  function typeLabel(dict, type) {
    return type === 'trailer'
      ? label(dict, 'trailerContainerTypeTrailer')
      : label(dict, 'trailerContainerTypeContainer');
  }

  function actionLabel(dict, type, action) {
    var key;
    if (type === 'trailer') {
      key = action === 'pickup' ? 'trailerContainerTrailerPickup' : 'trailerContainerTrailerDrop';
    } else {
      key = action === 'pickup' ? 'trailerContainerContainerPickup' : 'trailerContainerContainerDrop';
    }
    return label(dict, key);
  }

  /**
   * One active item as a stacked card: type, identifier, optional pickup
   * time, then a separate drop button. Not a single inline row.
   */
  function renderActiveCardsHtml(activeItems, dict, options) {
    var items = Array.isArray(activeItems) ? activeItems : [];
    if (!items.length) return '';
    var prepareFn = (options && options.prepareFn) ? String(options.prepareFn) : 'prepareTrailerContainerDrop';
    var cards = items.map(function (item, idx) {
      var time = item && item.pickup && item.pickup.time != null && item.pickup.time !== ''
        ? String(item.pickup.time) : '';
      var timeHtml = time
        ? '<div class="text-xs text-gray-600 dark:text-gray-300 mt-1" data-trailer-container-active-time="1">' +
          escHtml(label(dict, 'trailerContainerActivePickedUpLabel')) + ': ' + escHtml(time) + '</div>'
        : '';
      var pickupLocation = item && item.pickup ? parseLocation(item.pickup.location) : null;
      var locationHtml = pickupLocation
        ? '<div class="text-xs text-gray-600 dark:text-gray-300 mt-0.5" data-trailer-container-active-location="1">' +
          escHtml(pickupLocation) + '</div>'
        : '';
      var id = item && item.identifier != null ? String(item.identifier) : '';
      var type = item && item.type != null ? String(item.type) : '';
      return '<div class="block rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-700 px-3 py-2" data-trailer-container-active-row="' + idx + '">' +
        '<div class="text-xs font-semibold text-indigo-700 dark:text-indigo-300" data-trailer-container-active-type="1">' + escHtml(typeLabel(dict, type)) + '</div>' +
        '<div class="text-base font-mono font-semibold break-all mt-0.5" data-trailer-container-active-id="1">' + escHtml(id) + '</div>' +
        timeHtml +
        locationHtml +
        '<button type="button" class="mt-2 inline-flex items-center justify-center w-full sm:w-auto px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 font-semibold text-sm" ' +
        'onclick="' + escHtml(prepareFn) + '(\'' + escHtml(type) + '\', \'' + escHtml(encodeURIComponent(id)) + '\')">' +
        escHtml(label(dict, 'trailerContainerQuickDrop')) + '</button>' +
        '</div>';
    }).join('');
    return '<div data-trailer-container-active="1">' +
      '<p class="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2">' + escHtml(label(dict, 'trailerContainerActiveTitle')) + '</p>' +
      '<div class="space-y-2">' + cards + '</div>' +
      '</div>';
  }

  /**
   * Itemized history rows in insertion order. Optional time, km and note are
   * omitted when absent. Returns '' when there is nothing to show.
   */
  function renderHistoryItemsHtml(events, dict) {
    var list = itemizeEvents(events);
    if (!list.length) return '';
    var unit = label(dict, 'crossingOdometerUnit') || 'km';
    return list.map(function (ev) {
      var head = typeLabel(dict, ev.type) + ' · ' + ev.identifier;
      var action = actionLabel(dict, ev.type, ev.action);
      var second = (ev.time != null && ev.time !== '') ? (action + ' · ' + ev.time) : action;
      var kmHtml = (ev.odometerKm != null)
        ? '<div class="text-xs mt-0.5 text-gray-600 dark:text-gray-300" data-trailer-container-km="1">' + escHtml(String(ev.odometerKm) + ' ' + unit) + '</div>'
        : '';
      var locationHtml = (ev.location != null && ev.location !== '')
        ? '<div class="text-xs mt-0.5 text-gray-600 dark:text-gray-300" data-trailer-container-location="1">' + escHtml(ev.location) + '</div>'
        : '';
      var noteHtml = (ev.note != null && ev.note !== '')
        ? '<div class="text-xs mt-0.5 italic text-gray-600 dark:text-gray-300" data-trailer-container-note="1">' +
          escHtml(label(dict, 'trailerContainerNoteLabel') + ': ' + ev.note) + '</div>'
        : '';
      return '<div class="block rounded-md border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-700 px-3 py-2" data-trailer-container-history-item="1">' +
        '<div class="text-sm font-semibold break-words" data-trailer-container-history-head="1">' + escHtml(head) + '</div>' +
        '<div class="text-xs mt-0.5 text-gray-700 dark:text-gray-200" data-trailer-container-history-action="1">' + escHtml(second) + '</div>' +
        kmHtml + locationHtml + noteHtml +
        '</div>';
    }).join('');
  }

  function renderHistoryHtml(events, dict) {
    var items = renderHistoryItemsHtml(events, dict);
    var body = items || (
      '<p class="text-xs text-gray-500 italic" data-trailer-container-empty="1">' +
      escHtml(label(dict, 'trailerContainerEmpty')) + '</p>'
    );
    return '<div data-trailer-container-history="1">' +
      '<p class="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2">' + escHtml(label(dict, 'trailerContainerHistoryTitle')) + '</p>' +
      '<div class="space-y-2">' + body + '</div>' +
      '</div>';
  }

  /** YYYY-MM-DD → previous calendar day (UTC), or null if invalid. */
  function previousCalendarDate(isoDate) {
    var s = isoDate != null ? String(isoDate) : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var parts = s.split('-');
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    if (!y || !m || !d) return null;
    var dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - 1);
    var yy = dt.getUTCFullYear();
    var mm = dt.getUTCMonth() + 1;
    var dd = dt.getUTCDate();
    return yy + '-' + (mm < 10 ? '0' : '') + mm + '-' + (dd < 10 ? '0' : '') + dd;
  }

  /**
   * Pure display planner for one workday card.
   * Real trailerContainerEvents stay untouched — carried rows are view-only.
   * Active-at-start-of-day comes from foldWorkdays(history, asOf=previous day).
   * Incomplete / contradictory history never invents a carried fact.
   *
   * @returns {{ rows: Array, status: string }}
   */
  function getDayTrailerDisplayRows(record, historyRecords, options) {
    options = options || {};
    var dayEvents = normalizeEvents(record && record.trailerContainerEvents);
    var date = record && record.date ? String(record.date) : '';
    var rows = [];
    dayEvents.forEach(function (ev) {
      rows.push({ kind: 'event', event: ev });
    });

    var dayKeys = {};
    dayEvents.forEach(function (ev) {
      dayKeys[activeKey(ev.type, ev.identifier)] = true;
    });

    if (!date) {
      return { rows: rows, status: 'ok' };
    }

    // Missing drop/pickup contradictions on this day alone: still show real events;
    // do not add carried for keys touched today.
    var history = Array.isArray(historyRecords) ? historyRecords : [];
    var prev = previousCalendarDate(date);
    var startActive = prev
      ? foldWorkdays(history, { asOfDate: prev })
      : [];

    // If historyIncomplete and there is no prior workday in the loaded set,
    // refuse to invent carried state (fold already returns empty without pickups).
    var hasPriorWorkday = history.some(function (r) {
      if (!r || r.entryType === 'noteDay') return false;
      var rd = r.date ? String(r.date) : '';
      return rd && rd < date;
    });
    if (options.historyIncomplete && !hasPriorWorkday && !dayEvents.length) {
      return {
        rows: rows,
        status: 'incomplete_history',
        uncertain: true
      };
    }

    startActive.forEach(function (item) {
      if (!item || !isValidType(item.type)) return;
      var id = normalizeIdentifier(item.identifier);
      if (!id) return;
      var key = activeKey(item.type, id);
      if (dayKeys[key]) return;
      // Provenance: require a persisted pickup source when available; never
      // treat a live-only remote active doc as historical proof.
      if (item.source && item.source.persisted === false) return;
      rows.push({
        kind: 'carried',
        type: item.type,
        identifier: id,
        vehicleId: item.vehicleId || null,
        source: item.source || null
      });
    });

    return {
      rows: rows,
      status: options.historyIncomplete && !hasPriorWorkday ? 'incomplete_history' : 'ok'
    };
  }

  function renderCarriedItemHtml(row, dict) {
    if (!row || row.kind !== 'carried') return '';
    var head = typeLabel(dict, row.type) + ' · ' + row.identifier;
    var still = label(dict, 'trailerContainerStillAttached') || 'Továbbra is felakasztva';
    return '<div class="block rounded-md border border-dashed border-indigo-200/80 dark:border-indigo-700/70 bg-indigo-50/40 dark:bg-indigo-950/20 px-3 py-1.5" data-trailer-container-carried-item="1">' +
      '<div class="text-sm font-semibold break-words text-indigo-800/90 dark:text-indigo-200" data-trailer-container-carried-head="1">' + escHtml(head) + '</div>' +
      '<div class="text-xs mt-0.5 italic text-indigo-700/80 dark:text-indigo-300/90" data-trailer-container-carried-action="1">' + escHtml(still) + '</div>' +
      '</div>';
  }

  function renderDayDisplayRowsHtml(display, dict) {
    if (!display || !Array.isArray(display.rows) || !display.rows.length) {
      if (display && display.uncertain) {
        return '<p class="text-xs text-amber-700 dark:text-amber-300 italic" data-trailer-container-uncertain="1">' +
          escHtml(label(dict, 'trailerContainerHistoryIncomplete') || label(dict, 'trailerContainerAmbiguousCarry') || '') +
          '</p>';
      }
      return '';
    }
    return display.rows.map(function (row) {
      if (row.kind === 'carried') return renderCarriedItemHtml(row, dict);
      if (row.kind === 'event' && row.event) {
        return renderHistoryItemsHtml([row.event], dict);
      }
      return '';
    }).join('');
  }

  /**
   * List-page block for one workday. Empty when the module is off or there is
   * nothing to show (no real events and no proven carried state).
   * historyRecords (optional) drives carried-over display without writing events.
   */
  function renderDaySectionHtml(record, dict, moduleOn, historyRecords, options) {
    if (!moduleOn) return '';
    var display = getDayTrailerDisplayRows(record, historyRecords, options || {});
    var items = renderDayDisplayRowsHtml(display, dict);
    if (!items) return '';
    return '<div class="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2" data-trailer-container-day="1">' +
      '<p class="font-semibold text-xs text-indigo-700 dark:text-indigo-300">' + escHtml(label(dict, 'trailerContainerListTitle')) + '</p>' +
      '<div class="space-y-2 mt-1">' + items + '</div>' +
      '</div>';
  }

  /**
   * Cross-day fold. Workdays sort by date, then id. Events stay in array
   * order. A missing time is not invented and is not used for ordering.
   * Note days are ignored. asOfDate keeps workdays on or before that date.
   * replacementEvents, when set, replace the saved events of replaceDate.
   */
  function foldWorkdays(records, options) {
    options = options || {};
    var asOf = options.asOfDate || null;
    var replaceDate = options.replaceDate || null;
    var replacement = Array.isArray(options.replacementEvents) ? options.replacementEvents : null;
    var omit = options.omitIds || null;
    var list = (Array.isArray(records) ? records : []).filter(function (r) {
      if (!r || r.entryType === 'noteDay') return false;
      if (omit && r.id != null && omit[String(r.id)]) return false;
      var date = r.date ? String(r.date) : '';
      if (asOf && (!date || date > asOf)) return false;
      return true;
    }).slice().sort(function (a, b) {
      var da = a.date ? String(a.date) : '';
      var db = b.date ? String(b.date) : '';
      if (da < db) return -1;
      if (da > db) return 1;
      var ia = a.id != null ? String(a.id) : '';
      var ib = b.id != null ? String(b.id) : '';
      if (ia < ib) return -1;
      if (ia > ib) return 1;
      return 0;
    });
    var annotated = [];
    var replaced = false;
    list.forEach(function (r) {
      var date = r.date ? String(r.date) : '';
      var events;
      if (replacement && replaceDate && date === replaceDate) {
        if (replaced) return;
        events = replacement;
        replaced = true;
      } else {
        events = r.trailerContainerEvents;
      }
      normalizeEvents(events).forEach(function (ev, index) {
        annotated.push({
          event: ev,
          source: {
            recordId: r.id != null ? String(r.id) : null,
            date: date || null,
            eventIndex: index,
            persisted: true,
            vehicleId: r.vehicleId != null ? String(r.vehicleId) : (r.vehicleSnapshot && r.vehicleSnapshot.vehicleId != null ? String(r.vehicleSnapshot.vehicleId) : '')
          }
        });
      });
    });
    if (replacement && replaceDate && !replaced && (!asOf || replaceDate <= asOf)) {
      normalizeEvents(replacement).forEach(function (ev, index) {
        annotated.push({
          event: ev,
          source: { recordId: null, date: replaceDate, eventIndex: index, persisted: false }
        });
      });
    }
    return foldAnnotated(annotated);
  }

  function foldAnnotated(annotated) {
    var state = {};
    for (var i = 0; i < annotated.length; i++) {
      var row = annotated[i];
      applyOntoState(state, row.event, row.source, i);
    }
    return stateToItems(state);
  }

  function applyOntoState(state, ev, source, order) {
    if (!ev || !isValidType(ev.type) || !isValidAction(ev.action)) return state;
    var identifier = normalizeIdentifier(ev.identifier);
    if (!identifier) return state;
    var vehicleId = resolveVehicleScope(source, ev, source && source.vehicleId);
    var key = activeKey(ev.type, identifier);
    if (!state[key]) {
      state[key] = { active: false, type: ev.type, identifier: identifier, pickup: null, source: null, order: -1, vehicleId: vehicleId };
    }
    var entry = state[key];
    if (ev.action === 'pickup') {
      applySameTypeSupersede(state, ev, vehicleId, order);
      entry.active = true;
      entry.ambiguousSuperseded = false;
      entry.pickup = ev;
      entry.source = source || null;
      entry.vehicleId = vehicleId;
      entry.order = order;
    } else if (ev.action === 'drop') {
      entry.active = false;
      entry.ambiguousSuperseded = false;
    }
    return state;
  }

  function stateToItems(state) {
    var active = [];
    Object.keys(state).forEach(function (key) {
      if (state[key].active) active.push(state[key]);
    });
    active.sort(function (a, b) { return a.order - b.order; });
    return active.map(function (e) {
      var item = { type: e.type, identifier: e.identifier, pickup: e.pickup };
      if (e.vehicleId) item.vehicleId = e.vehicleId;
      if (e.source) item.source = e.source;
      return item;
    });
  }

  function itemsToState(items) {
    var state = {};
    (Array.isArray(items) ? items : []).forEach(function (item, i) {
      if (!item || !isValidType(item.type)) return;
      var identifier = normalizeIdentifier(item.identifier);
      if (!identifier) return;
      var key = activeKey(item.type, identifier);
      state[key] = {
        active: true,
        type: item.type,
        identifier: identifier,
        pickup: item.pickup || null,
        source: item.source || null,
        vehicleId: normalizeVehicleId(item.vehicleId || (item.source && item.source.vehicleId) || ''),
        order: i
      };
    });
    return state;
  }

  /**
   * Apply one event onto the current active items. Does not create a history
   * row. Pickup activates. Drop deactivates. A second pickup keeps the item
   * active and refreshes its pickup provenance. A drop of an inactive item
   * does not create one.
   */
  function applyEventToItems(items, event, source) {
    var state = itemsToState(items);
    applyOntoState(state, event, source || null, 1000000);
    return stateToItems(state);
  }

  /**
   * Carried canonical items overlaid with the current shift or draft events.
   * The events array is not modified and no pickup is synthesized into it.
   */
  function overlayActiveItems(items, events) {
    var state = itemsToState(items);
    normalizeEvents(events).forEach(function (ev, index) {
      applyOntoState(state, ev, { recordId: null, date: null, eventIndex: index, persisted: false }, 1000000 + index);
    });
    return stateToItems(state);
  }

  /**
   * Active items as of the end of a workday date. Later days are ignored.
   * dayEvents replace that date's saved events (the Full Day draft).
   */
  function activeItemsAsOf(records, asOfDate, dayEvents) {
    return foldWorkdays(records, {
      asOfDate: asOfDate,
      replaceDate: asOfDate,
      replacementEvents: Array.isArray(dayEvents) ? dayEvents : []
    });
  }

  /**
   * Rebuild the current active set from saved workdays, then overlay an
   * open shift that has not been saved yet.
   */
  function reconcileActiveItems(records, openShiftEvents) {
    var base = foldWorkdays(records, {});
    if (!openShiftEvents || !normalizeEvents(openShiftEvents).length) return base;
    return overlayActiveItems(base, openShiftEvents);
  }

  /**
   * Keep another device's not-yet-saved active items. Persisted items are
   * owned by the history rebuild. A local drop wins over a remote in-progress item.
   */
  function mergeInProgressItems(rebuilt, serverItems, localEvents) {
    var dropped = {};
    normalizeEvents(localEvents).forEach(function (ev) {
      if (ev.action === 'drop') dropped[activeKey(ev.type, ev.identifier)] = true;
    });
    var have = {};
    (Array.isArray(rebuilt) ? rebuilt : []).forEach(function (item) {
      have[activeKey(item.type, item.identifier)] = true;
    });
    var extra = [];
    (Array.isArray(serverItems) ? serverItems : []).forEach(function (item) {
      if (!item || !isValidType(item.type)) return;
      var key = activeKey(item.type, item.identifier);
      if (have[key] || dropped[key]) return;
      if (!item.source || item.source.persisted === true) return;
      extra.push(item);
    });
    return (Array.isArray(rebuilt) ? rebuilt : []).concat(extra);
  }

  function projectActiveDocument(items, meta) {
    meta = meta || {};
    return {
      schemaVersion: 1,
      syncVersion: typeof meta.syncVersion === 'number' ? meta.syncVersion : 1,
      items: (Array.isArray(items) ? items : []).map(function (item) {
        var out = {
          type: item.type,
          identifier: item.identifier,
          pickup: item.pickup || null
        };
        if (item.source) out.source = item.source;
        return out;
      })
    };
  }

  var api = {
    VALID_TYPES: VALID_TYPES,
    VALID_ACTIONS: VALID_ACTIONS,
    normalizeIdentifier: normalizeIdentifier,
    isValidType: isValidType,
    isValidAction: isValidAction,
    parseTimeInput: parseTimeInput,
    parseOdometerKm: parseOdometerKm,
    parseLocation: parseLocation,
    createEvent: createEvent,
    appendEvent: appendEvent,
    normalizeEvents: normalizeEvents,
    makeEventId: makeEventId,
    eventFingerprint: eventFingerprint,
    eventMergeKey: eventMergeKey,
    mergeEventLists: mergeEventLists,
    getActiveItems: getActiveItems,
    isActive: isActive,
    createQuickDrop: createQuickDrop,
    itemizeEvents: itemizeEvents,
    renderActiveCardsHtml: renderActiveCardsHtml,
    renderHistoryItemsHtml: renderHistoryItemsHtml,
    renderHistoryHtml: renderHistoryHtml,
    previousCalendarDate: previousCalendarDate,
    getDayTrailerDisplayRows: getDayTrailerDisplayRows,
    renderCarriedItemHtml: renderCarriedItemHtml,
    renderDayDisplayRowsHtml: renderDayDisplayRowsHtml,
    renderDaySectionHtml: renderDaySectionHtml,
    foldWorkdays: foldWorkdays,
    applyEventToItems: applyEventToItems,
    overlayActiveItems: overlayActiveItems,
    activeItemsAsOf: activeItemsAsOf,
    reconcileActiveItems: reconcileActiveItems,
    mergeInProgressItems: mergeInProgressItems,
    projectActiveDocument: projectActiveDocument,
    normalizeVehicleId: normalizeVehicleId,
    resolveVehicleScope: resolveVehicleScope,
    validateTransition: validateTransition,
    trustActiveItems: trustActiveItems
  };

  // Browser global
  if (typeof global !== 'undefined') {
    global.TrailerContainerLog = api;
  }
  // CommonJS (node tests require this without a browser)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
