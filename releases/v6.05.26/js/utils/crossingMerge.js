/**
 * GuriGO – határátlépés (crossings) merge / tombstone / authoritative replace.
 *
 * Rules:
 * - Empty / incomplete local must NOT wipe remote (unless crossingsAuthoritative).
 * - Intentional delete/edit uses crossingId + crossingTombstones and/or crossingsAuthoritative.
 * - Blind content-union must not resurrect tombstoned ids or duplicate edited rows.
 */
(function (global) {
  'use strict';

  function contentFingerprint(c) {
    if (!c || typeof c !== 'object') return String(c);
    return [c.from || '', c.to || '', c.time || '', c.odometerKm != null ? c.odometerKm : ''].join('|');
  }

  function newCrossingId() {
    return 'cx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function legacyCrossingId(c) {
    var fp = contentFingerprint(c);
    var h = 0;
    for (var i = 0; i < fp.length; i++) {
      h = ((h << 5) - h + fp.charCodeAt(i)) | 0;
    }
    return 'cx_leg_' + (h >>> 0).toString(36);
  }

  function ensureCrossingId(c) {
    if (!c || typeof c !== 'object') return c;
    if (c.crossingId && String(c.crossingId).trim()) return c;
    var out = Object.assign({}, c);
    out.crossingId = legacyCrossingId(c);
    return out;
  }

  function ensureCrossingIds(list) {
    return (Array.isArray(list) ? list : []).filter(Boolean).map(ensureCrossingId);
  }

  function normalizeTombs(list) {
    var out = [];
    var seen = {};
    (Array.isArray(list) ? list : []).forEach(function (t) {
      if (!t) return;
      var id = t.crossingId != null ? String(t.crossingId) : '';
      if (!id || seen[id]) return;
      seen[id] = true;
      out.push({
        crossingId: id,
        deletedAtMs: typeof t.deletedAtMs === 'number' ? t.deletedAtMs : Date.now()
      });
    });
    return out;
  }

  function tombSet(tombs) {
    var s = {};
    normalizeTombs(tombs).forEach(function (t) { s[t.crossingId] = t; });
    return s;
  }

  function mergeTombstoneLists(a, b) {
    var map = tombSet(a);
    normalizeTombs(b).forEach(function (t) {
      var prev = map[t.crossingId];
      if (!prev || (t.deletedAtMs || 0) >= (prev.deletedAtMs || 0)) map[t.crossingId] = t;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function stripDeleted(list, tombs) {
    var dead = tombSet(tombs);
    return ensureCrossingIds(list).filter(function (c) {
      return c && c.crossingId && !dead[String(c.crossingId)];
    });
  }

  /**
   * Union by crossingId. Same id → prefer `prefer` side (usually newer).
   * Does not resurrect tombstoned ids.
   */
  function mergeCrossingListsById(a, b, options) {
    options = options || {};
    var tombs = mergeTombstoneLists(options.tombstonesA, options.tombstonesB);
    var preferB = options.preferB !== false;
    var map = {};
    var order = [];

    function put(item, isB) {
      if (!item) return;
      var c = ensureCrossingId(item);
      var id = String(c.crossingId);
      if (!map[id]) {
        order.push(id);
        map[id] = c;
        return;
      }
      if (isB && preferB) map[id] = Object.assign({}, map[id], c);
      else if (!isB && !preferB) map[id] = Object.assign({}, map[id], c);
      else {
        var prevMs = typeof map[id].updatedAtMs === 'number' ? map[id].updatedAtMs : 0;
        var nextMs = typeof c.updatedAtMs === 'number' ? c.updatedAtMs : 0;
        if (nextMs >= prevMs) map[id] = Object.assign({}, map[id], c);
      }
    }

    ensureCrossingIds(a).forEach(function (c) { put(c, false); });
    ensureCrossingIds(b).forEach(function (c) { put(c, true); });

    return {
      crossings: stripDeleted(order.map(function (id) { return map[id]; }), tombs),
      crossingTombstones: tombs
    };
  }

  /** Legacy-compatible fingerprint union (no ids) — used only as fallback. */
  function mergeCrossingListsFingerprint(a, b) {
    var out = [];
    var seen = {};
    function add(list) {
      (Array.isArray(list) ? list : []).forEach(function (item) {
        if (item == null) return;
        var c = ensureCrossingId(item);
        var k = String(c.crossingId);
        if (seen[k]) return;
        seen[k] = true;
        out.push(c);
      });
    }
    add(a);
    add(b);
    return out;
  }

  function foldLegacyBorderCrossings(data) {
    if (!data || typeof data !== 'object') return [];
    return mergeCrossingListsFingerprint(data.crossings, data.borderCrossings);
  }

  /**
   * Workday record sync merge.
   * - crossingsAuthoritative: local list is the intended full set (edit/delete from form).
   * - empty local without authority: keep remote.
   * - otherwise: id-union + tombstones (no resurrection of deleted ids).
   */
  function mergeRecordCrossings(remoteData, localRecord) {
    remoteData = remoteData || {};
    localRecord = localRecord || {};
    var remoteList = foldLegacyBorderCrossings(remoteData);
    var localList = foldLegacyBorderCrossings(localRecord);
    var remoteTombs = remoteData.crossingTombstones;
    var localTombs = localRecord.crossingTombstones;
    var authoritative = !!localRecord.crossingsAuthoritative;

    if (authoritative) {
      var localIds = {};
      ensureCrossingIds(localList).forEach(function (c) { localIds[String(c.crossingId)] = true; });
      var impliedTombs = [];
      ensureCrossingIds(remoteList).forEach(function (c) {
        var id = String(c.crossingId);
        if (!localIds[id]) {
          impliedTombs.push({ crossingId: id, deletedAtMs: Date.now() });
        }
      });
      var tombs = mergeTombstoneLists(mergeTombstoneLists(remoteTombs, localTombs), impliedTombs);
      return {
        crossings: stripDeleted(localList, tombs),
        crossingTombstones: tombs
      };
    }

    if (!localList.length && remoteList.length) {
      // Incomplete/empty local must not wipe server data.
      return {
        crossings: stripDeleted(remoteList, mergeTombstoneLists(remoteTombs, localTombs)),
        crossingTombstones: mergeTombstoneLists(remoteTombs, localTombs)
      };
    }

    var localMs = typeof localRecord.clientUpdatedAtMs === 'number' ? localRecord.clientUpdatedAtMs : 0;
    var remoteMs = typeof remoteData.clientUpdatedAtMs === 'number' ? remoteData.clientUpdatedAtMs : 0;
    return mergeCrossingListsById(remoteList, localList, {
      tombstonesA: remoteTombs,
      tombstonesB: localTombs,
      preferB: localMs >= remoteMs
    });
  }

  /**
   * Active-shift merge: id-union + tombstones. Empty newer side without tombs keeps older crossings.
   */
  function mergeActiveShiftCrossings(older, newer) {
    older = older || {};
    newer = newer || {};
    var olderList = foldLegacyBorderCrossings(older);
    var newerList = foldLegacyBorderCrossings(newer);
    var olderTombs = older.crossingTombstones;
    var newerTombs = newer.crossingTombstones;
    var newerAuth = !!newer.crossingsAuthoritative;

    if (newerAuth) {
      return mergeRecordCrossings(older, Object.assign({}, newer, { crossingsAuthoritative: true }));
    }

    // Empty newer without any tombstones → incomplete snapshot, keep older via union.
    if (!newerList.length && !(Array.isArray(newerTombs) && newerTombs.length) && olderList.length) {
      return {
        crossings: stripDeleted(olderList, mergeTombstoneLists(olderTombs, newerTombs)),
        crossingTombstones: mergeTombstoneLists(olderTombs, newerTombs)
      };
    }

    var olderMs = typeof older.clientUpdatedAtMs === 'number' ? older.clientUpdatedAtMs : 0;
    var newerMs = typeof newer.clientUpdatedAtMs === 'number' ? newer.clientUpdatedAtMs : 0;
    return mergeCrossingListsById(olderList, newerList, {
      tombstonesA: olderTombs,
      tombstonesB: newerTombs,
      preferB: newerMs >= olderMs
    });
  }

  function makeTombstone(crossingId) {
    return {
      crossingId: String(crossingId || ''),
      deletedAtMs: Date.now()
    };
  }

  /**
   * Defense-in-depth write guard for new clients / server mirrors.
   * True when an update would replace a non-empty remote crossings list with []
   * without crossingsAuthoritative and without tombstones (classic v6.05.23 wipe).
   */
  function isUnsafeEmptyCrossingsOverwrite(existing, incoming) {
    existing = existing || {};
    incoming = incoming || {};
    if (incoming.crossingsAuthoritative === true || incoming.__crossingsAuthoritative === true) {
      return false;
    }
    var existingList = foldLegacyBorderCrossings(existing);
    var incomingList = foldLegacyBorderCrossings(incoming);
    var hasIncomingTombs = Array.isArray(incoming.crossingTombstones) && incoming.crossingTombstones.length > 0;
    return existingList.length > 0 && incomingList.length === 0 && !hasIncomingTombs;
  }

  function normalizeShiftCrossings(shift) {
    if (!shift || typeof shift !== 'object') return shift;
    var merged = mergeCrossingListsFingerprint(shift.crossings, shift.borderCrossings);
    shift.crossings = stripDeleted(merged, shift.crossingTombstones);
    shift.crossingTombstones = normalizeTombs(shift.crossingTombstones);
    if (Object.prototype.hasOwnProperty.call(shift, 'borderCrossings')) {
      delete shift.borderCrossings;
    }
    return shift;
  }

  var api = {
    newCrossingId: newCrossingId,
    ensureCrossingId: ensureCrossingId,
    ensureCrossingIds: ensureCrossingIds,
    contentFingerprint: contentFingerprint,
    mergeCrossingLists: mergeCrossingListsFingerprint,
    mergeCrossingListsById: mergeCrossingListsById,
    mergeRecordCrossings: mergeRecordCrossings,
    mergeActiveShiftCrossings: mergeActiveShiftCrossings,
    mergeTombstoneLists: mergeTombstoneLists,
    makeTombstone: makeTombstone,
    normalizeTombs: normalizeTombs,
    normalizeShiftCrossings: normalizeShiftCrossings,
    stripDeleted: stripDeleted,
    isUnsafeEmptyCrossingsOverwrite: isUnsafeEmptyCrossingsOverwrite
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  global.GurigoCrossingMerge = api;
  // Back-compat aliases used by sync modules / import merge.
  global.mergeCrossingLists = function (a, b) {
    return api.mergeCrossingLists(a, b);
  };
  global.mergeRecordCrossings = function (remoteData, localRecord) {
    var r = api.mergeRecordCrossings(remoteData, localRecord);
    return r.crossings;
  };
})(typeof window !== 'undefined' ? window : globalThis);
