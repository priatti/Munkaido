// =======================================================
// ===== CSÖKKENTETT HETI PIHENŐ VISSZAPÓTLÁS (KOMPENZÁCIÓ) ====
// =======================================================
// Globális rendszer: minden csökkentett heti pihenőre (≥24h, <45h) érvényes.
// Firestore: users/{uid}/compensations/{id}

(function () {
  'use strict';

  const MIN_REST_FOR_RESOLUTION = 9; // pihenő ≥ adósság + 9 óra
  const REGULAR_WEEKLY_REST_HOURS = 45; // heti pihenő alsó határa (óra)
  const REVERIFY_TOLERANCE_MS = 60 * 1000; // ±1 perc az időpont egyezésnél
  const MATCH_COMP_TOLERANCE_MS = 5 * 60 * 1000; // ±5 perc: kompenzáció–blokk illesztés (Firestore időbélyeg, megjelenítés)

  function getDb() {
    try {
      if (typeof db !== 'undefined') return db;
      if (typeof firebase !== 'undefined' && firebase.firestore) return firebase.firestore();
    } catch (_) {}
    return null;
  }

  function getCurrentUser() {
    try {
      if (window.currentUser) return window.currentUser;
      if (typeof firebase !== 'undefined' && firebase.auth) return firebase.auth().currentUser;
    } catch (_) {}
    return null;
  }

  function timestamp(date) {
    if (date instanceof Date) return date;
    if (date && date.toDate) return date.toDate();
    return new Date(date);
  }

  function getRecordsSorted() {
    const src = (Array.isArray(window.records) && window.records.length > 0)
      ? window.records
      : (typeof demoRecords !== 'undefined' ? demoRecords : []);
    const arr = Array.isArray(src) ? [...src] : [];
    arr.sort((a, b) => getRecordSortTime(a) - getRecordSortTime(b));
    return arr;
  }

  function getRestBlocksChronological() {
    const records = getRecordsSorted();
    let blocks = [];
    try {
      if (typeof window.getWeeklyRestBlocksFromTachograph === 'function') {
        blocks = window.getWeeklyRestBlocksFromTachograph(records) || [];
      }
    } catch (_) {}
    return [...blocks].sort((a, b) => {
      const sa = (a.start instanceof Date ? a.start : new Date(a.start)).getTime();
      const sb = (b.start instanceof Date ? b.start : new Date(b.start)).getTime();
      return sa - sb;
    });
  }

  function getAllRestBlocksFromRecords() {
    const records = getRecordsSorted();
    const blocks = [];
    if (!Array.isArray(records) || records.length < 2) return blocks;
    for (let i = 1; i < records.length; i++) {
      const prev = records[i - 1];
      const curr = records[i];
      if (!prev || !curr) continue;
      if (prev.entryType === 'noteDay' || curr.entryType === 'noteDay') continue;
      if (!prev.endTime || !curr.startTime) continue;
      const prevEndDateStr = prev.endDate || prev.date;
      const prevEnd = new Date(`${prevEndDateStr}T${prev.endTime}`);
      const currStart = new Date(`${curr.date}T${curr.startTime}`);
      if (isNaN(prevEnd) || isNaN(currStart)) continue;
      const durationHours = (currStart - prevEnd) / (1000 * 60 * 60);
      if (durationHours < MIN_REST_FOR_RESOLUTION) continue;
      blocks.push({
        start: prevEnd,
        end: currStart,
        durationHours
      });
    }
    return blocks;
  }

  function getAllRestBlocksChronological() {
    const weeklyBlocks = getRestBlocksChronological();
    const allRests = getAllRestBlocksFromRecords();
    const byStart = new Map();
    for (const b of weeklyBlocks) {
      const start = (b.start instanceof Date ? b.start : new Date(b.start)).getTime();
      const h = Number(b.durationHours) || 0;
      const existing = byStart.get(start);
      if (!existing || (Number(existing.durationHours) || 0) < h) byStart.set(start, { ...b, durationHours: h });
    }
    for (const b of allRests) {
      const start = (b.start instanceof Date ? b.start : new Date(b.start)).getTime();
      const h = Number(b.durationHours) || 0;
      const existing = byStart.get(start);
      if (!existing || (Number(existing.durationHours) || 0) < h) byStart.set(start, { ...b, durationHours: h });
    }
    return Array.from(byStart.values()).sort((a, b) => {
      const sa = (a.start instanceof Date ? a.start : new Date(a.start)).getTime();
      const sb = (b.start instanceof Date ? b.start : new Date(b.start)).getTime();
      return sa - sb;
    });
  }

  function getDeadlineForReducedRest(reducedRestEnd) {
    const d = reducedRestEnd instanceof Date ? new Date(reducedRestEnd.getTime()) : new Date(reducedRestEnd);
    if (isNaN(d)) return null;
    const daysSinceMonday = (d.getDay() + 6) % 7;
    const monday = new Date(d);
    monday.setDate(monday.getDate() - daysSinceMonday);
    const sundayOfWeek = new Date(monday);
    sundayOfWeek.setDate(sundayOfWeek.getDate() + 6);
    const thirdSunday = new Date(sundayOfWeek);
    thirdSunday.setDate(thirdSunday.getDate() + 21);
    thirdSunday.setHours(23, 59, 59, 999);
    return thirdSunday;
  }

  function isReducedWeeklyRest(block) {
    if (!block) return false;
    const h = Number(block.durationHours);
    return isFinite(h) && h >= 24 && h < 45;
  }

  /** Csak akkor true, ha a pihenő már befejeződött (van következő munkakezdés és az már múltban van). */
  function isRestBlockEnded(block) {
    if (!block || !block.end) return false;
    const end = block.end instanceof Date ? block.end : new Date(block.end);
    if (isNaN(end)) return false;
    return end.getTime() <= Date.now();
  }

  /** Kompenzációhoz tartozó blokk még létezik a jelenlegi rekordok alapján és lezárt? Ha a pihenőt követő műszak törölve lett, nincs illeszkedő blokk → ne jelenítsük meg a kompenzációt. */
  function findBlockMatchingComp(blocks, comp) {
    if (!Array.isArray(blocks) || !comp) return null;
    const compStart = comp.reducedRestStart?.toDate ? comp.reducedRestStart.toDate() : new Date(comp.reducedRestStart);
    const compEnd = comp.reducedRestEnd?.toDate ? comp.reducedRestEnd.toDate() : new Date(comp.reducedRestEnd);
    if (isNaN(compStart) || isNaN(compEnd)) return null;
    const ts = compStart.getTime();
    const te = compEnd.getTime();
    const tol = MATCH_COMP_TOLERANCE_MS;
    for (const b of blocks) {
      const bs = (b.start instanceof Date ? b.start : new Date(b.start)).getTime();
      const be = (b.end instanceof Date ? b.end : new Date(b.end)).getTime();
      if (Math.abs(bs - ts) <= tol && Math.abs(be - te) <= tol) return b;
    }
    return null;
  }

  function compIdFromStart(start) {
    const t = (start instanceof Date ? start : new Date(start)).getTime();
    return `comp_${t}`;
  }

  /** v2: REST_24H / exempt blokk — tévesen létrejött comp doc törlése. */
  async function removeCompensationDocForRestStart(restStartMs) {
    const uid = getCurrentUser()?.uid;
    const db = getDb();
    if (!uid || !db || restStartMs == null) return;
    const id = compIdFromStart(new Date(Number(restStartMs)));
    try {
      const docRef = db.collection('users').doc(uid).collection('compensations').doc(id);
      const doc = await docRef.get();
      if (doc.exists) await docRef.delete();
    } catch (e) {
      try { console.warn('[weeklyRestCompensation] remove exempt comp failed', e); } catch (_) {}
    }
  }

  function getMinResolutionHours(comp) {
    const compHours = Number(comp.compensationHours) || 0;
    const mode = comp.chainMode === 'mobility_package' ? 'mobility_package' : 'standard';
    if (mode === 'mobility_package') {
      const stored = Number(comp.minResolutionHours);
      if (isFinite(stored) && stored > 0) return stored;
      return compHours + 45;
    }
    return compHours + MIN_REST_FOR_RESOLUTION;
  }

  function getBlockMinutes(block) {
    const start = block.start instanceof Date ? block.start : new Date(block.start);
    const end = block.end instanceof Date ? block.end : new Date(block.end);
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }

  function getBlockKey(block) {
    const start = block.start instanceof Date ? block.start : new Date(block.start);
    const end = block.end instanceof Date ? block.end : new Date(block.end);
    return `${start.getTime()}_${end.getTime()}`;
  }

  /**
   * Valid, pozitív kompenzációs adósság percekben.
   * Invalid / nem pozitív input esetén null.
   * Nem fallback-el 0 percre, mert azt később resolved-ként kezelhetnék.
   */
  function getValidatedCompensationMinutes(value) {
    const num = Number(value);
    if (!Number.isFinite(num) || num <= 0) return null;
    const minutes = Math.round(num * 60);
    return minutes > 0 ? minutes : null;
  }

  function getCompensationMinutes(comp) {
    return getValidatedCompensationMinutes(comp && comp.compensationHours);
  }

  /**
   * Determinisztikus sorrend a kompenzációs dokumentumokhoz:
   * reducedRestEnd növekvő, majd dokumentum-azonosító növekvő.
   * A Firestore visszaadási sorrendet nem használjuk implicit prioritásként.
   */
  function sortCompensationDocs(docs) {
    return [...docs].sort((a, b) => {
      const aEnd = a.reducedRestEnd
        ? (a.reducedRestEnd.toDate ? a.reducedRestEnd.toDate().getTime() : new Date(a.reducedRestEnd).getTime())
        : 0;
      const bEnd = b.reducedRestEnd
        ? (b.reducedRestEnd.toDate ? b.reducedRestEnd.toDate().getTime() : new Date(b.reducedRestEnd).getTime())
        : 0;
      if (aEnd !== bEnd) return aEnd - bEnd;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
  }

  /**
   * Közös allokációs modell >=45h standard rest blokkokhoz.
   * A 45h a regular weekly resthez tartozik, a felette lévő többlet percek
   * közös compensation capacity. Fogyasztás után csökken.
   */
  function buildStandardBlockCapacityMap(blocks) {
    const map = new Map();
    for (const block of blocks) {
      const blockMinutes = getBlockMinutes(block);
      if (blockMinutes >= REGULAR_WEEKLY_REST_HOURS * 60) {
        map.set(getBlockKey(block), blockMinutes - REGULAR_WEEKLY_REST_HOURS * 60);
      }
    }
    return map;
  }

  function canAllocateStandardCompToBlock(comp, block, capacityMap) {
    const blockMinutes = getBlockMinutes(block);
    const debtMinutes = getCompensationMinutes(comp);
    if (debtMinutes === null) return false;

    if (comp.chainMode === 'mobility_package') {
      return blockMinutes >= getMinResolutionHours(comp) * 60;
    }

    // Standard, nem rendes heti pihenő blokk: legacy comp+9h szabály.
    if (blockMinutes < REGULAR_WEEKLY_REST_HOURS * 60) {
      return blockMinutes >= debtMinutes + MIN_REST_FOR_RESOLUTION * 60;
    }

    // Standard, rendes heti pihenő is lehet: csak a 45h feletti többletből.
    const available = capacityMap.get(getBlockKey(block)) || 0;
    return available >= debtMinutes;
  }

  function consumeStandardCompCapacity(comp, block, capacityMap) {
    const blockMinutes = getBlockMinutes(block);
    if (blockMinutes < REGULAR_WEEKLY_REST_HOURS * 60) return;
    const debtMinutes = getCompensationMinutes(comp);
    if (debtMinutes === null) return;
    const key = getBlockKey(block);
    const available = capacityMap.get(key) || 0;
    if (available <= 0) return;
    capacityMap.set(key, Math.max(0, available - debtMinutes));
  }

  /**
   * Egyszerű, single-comp védelem a UI getter számára (defense-in-depth).
   * Nem allokátor, csak annyit ellenőriz, hogy ez az egy kompenzáció elférne
   * a blokk 45h feletti többletében.
   */
  function canResolveCompensationWithBlock(comp, blockHours) {
    const blockMinutes = Math.round(blockHours * 60);
    const debtMinutes = getCompensationMinutes(comp);
    if (debtMinutes === null) return false;

    if (comp.chainMode === 'mobility_package') {
      return blockMinutes >= getMinResolutionHours(comp) * 60;
    }

    if (blockMinutes < debtMinutes + MIN_REST_FOR_RESOLUTION * 60) return false;

    if (blockMinutes >= REGULAR_WEEKLY_REST_HOURS * 60) {
      return (blockMinutes - REGULAR_WEEKLY_REST_HOURS * 60) >= debtMinutes;
    }

    return true;
  }

  function isMobilityPackageComp(comp) {
    return comp && comp.chainMode === 'mobility_package';
  }

  function chainTriggerStartMs(comp) {
    if (!comp || comp.chainTriggerStart == null) return null;
    const d = comp.chainTriggerStart.toDate ? comp.chainTriggerStart.toDate() : new Date(comp.chainTriggerStart);
    return isNaN(d) ? null : d.getTime();
  }

  /**
   * Meglévő (standard / chainMode nélküli) doc → mobility_package.
   * Nem nyitja vissza itt a resolved-et: azt a következő reverify végzi.
   */
  async function migrateExistingDocToMobility(docRef, existing, fields) {
    if (!docRef || !existing || !fields) return false;
    const updates = {};
    const existingMode = existing.chainMode === 'mobility_package' ? 'mobility_package' : 'standard';
    const targetMin = Number(fields.minResolutionHours);
    const targetComp = Number(fields.compensationHours);

    if (existingMode !== 'mobility_package') {
      updates.chainMode = 'mobility_package';
    }
    if (isFinite(targetMin) && targetMin > 0) {
      const existingMin = Number(existing.minResolutionHours);
      if (!isFinite(existingMin) || Math.abs(existingMin - targetMin) > 0.001) {
        updates.minResolutionHours = targetMin;
      }
    }
    if (fields.chainTriggerStart != null) {
      const targetTriggerMs = fields.chainTriggerStart.getTime();
      const existingTriggerMs = chainTriggerStartMs(existing);
      if (existingTriggerMs == null || existingTriggerMs !== targetTriggerMs) {
        updates.chainTriggerStart = fields.chainTriggerStart;
      }
    }
    if (isFinite(targetComp)) {
      const existingComp = Number(existing.compensationHours);
      if (!isFinite(existingComp) || Math.abs(existingComp - targetComp) > 0.001) {
        updates.compensationHours = targetComp;
      }
    }
    if (isFinite(Number(fields.durationHours))) {
      const existingDur = Number(existing.reducedRestDurationHours);
      const targetDur = Number(fields.durationHours);
      if (!isFinite(existingDur) || Math.abs(existingDur - targetDur) > 0.001) {
        updates.reducedRestDurationHours = targetDur;
      }
    }

    if (Object.keys(updates).length === 0) return false;

    try {
      await docRef.update(updates);
      return true;
    } catch (e) {
      try { console.warn('[weeklyRestCompensation] mobility migrate failed', e); } catch (_) {}
      return false;
    }
  }

  /**
   * mobility_package doc → standard (Igen→Nem döntésváltás).
   */
  async function migrateExistingDocToStandard(docRef, existing, fields) {
    if (!docRef || !existing) return false;
    const compHours = Number(fields.compensationHours ?? existing.compensationHours) || 0;
    const targetMin = compHours + MIN_REST_FOR_RESOLUTION;
    const updates = {};
    if (existing.chainMode !== 'standard') {
      updates.chainMode = 'standard';
    }
    const existingMin = Number(existing.minResolutionHours);
    if (!isFinite(existingMin) || Math.abs(existingMin - targetMin) > 0.001) {
      updates.minResolutionHours = targetMin;
    }
    if (existing.chainTriggerStart != null) {
      updates.chainTriggerStart = firebase.firestore.FieldValue.delete();
    }
    if (existing.resolvedByWeeklyRest === true) {
      updates.resolvedByWeeklyRest = false;
    }
    if (isFinite(Number(fields.durationHours))) {
      const existingDur = Number(existing.reducedRestDurationHours);
      const targetDur = Number(fields.durationHours);
      if (!isFinite(existingDur) || Math.abs(existingDur - targetDur) > 0.001) {
        updates.reducedRestDurationHours = targetDur;
      }
    }
    if (Object.keys(updates).length === 0) return false;
    try {
      await docRef.update(updates);
      return true;
    } catch (e) {
      try { console.warn('[weeklyRestCompensation] standard migrate failed', e); } catch (_) {}
      return false;
    }
  }

  /**
   * Adott 90+ triggerhez tartozó mobilitási kompenzációk visszaállítása standard módra.
   */
  async function revertMobilityCompensationsForTrigger(triggerStartMs) {
    const uid = getCurrentUser()?.uid;
    const db = getDb();
    if (!uid || !db || triggerStartMs == null) return;

    const targetMs = Number(triggerStartMs);
    if (!isFinite(targetMs)) return;

    try {
      const snap = await db.collection('users').doc(uid).collection('compensations').get();
      for (const docSnap of snap.docs) {
        const data = docSnap.data() || {};
        if (data.chainMode !== 'mobility_package') continue;
        const triggerMs = chainTriggerStartMs(data);
        if (triggerMs == null || triggerMs !== targetMs) continue;

        const compHours = Number(data.compensationHours) || 0;
        const durationHours = Number(data.reducedRestDurationHours);
        await migrateExistingDocToStandard(docSnap.ref, data, {
          compensationHours: compHours,
          durationHours: isFinite(durationHours) ? durationHours : undefined
        });
      }
    } catch (e) {
      try { console.warn('[weeklyRestCompensation] revert mobility for trigger failed', e); } catch (_) {}
    }
  }

  async function ensureCompensationExists(block, chainMeta) {
    const uid = getCurrentUser()?.uid;
    const db = getDb();
    if (!uid || !db) return null;

    const start = block.start instanceof Date ? block.start : new Date(block.start);
    const end = block.end instanceof Date ? block.end : new Date(block.end);
    const durationHours = Number(block.durationHours);
    const compensationHours = Math.max(0, 45 - durationHours);
    const deadline = getDeadlineForReducedRest(end);
    const id = compIdFromStart(start);
    const meta = chainMeta || {};
    const chainMode = meta.chainMode === 'mobility_package' ? 'mobility_package' : 'standard';
    const minResolutionHours = chainMode === 'mobility_package'
      ? (Number(meta.minResolutionHours) || (compensationHours + 45))
      : (compensationHours + MIN_REST_FOR_RESOLUTION);
    const chainTriggerStart = meta.chainTriggerStart != null
      ? (meta.chainTriggerStart instanceof Date ? meta.chainTriggerStart : new Date(meta.chainTriggerStart))
      : null;

    try {
      const docRef = db.collection('users').doc(uid).collection('compensations').doc(id);
      const doc = await docRef.get();
      if (doc.exists) {
        const existing = doc.data();
        if (chainMode === 'mobility_package') {
          await migrateExistingDocToMobility(docRef, existing, {
            minResolutionHours,
            chainTriggerStart,
            compensationHours,
            durationHours
          });
        } else if (existing.chainMode === 'mobility_package') {
          await migrateExistingDocToStandard(docRef, existing, {
            compensationHours,
            durationHours
          });
        }
        return id;
      }

      const payload = {
        reducedRestStart: start,
        reducedRestEnd: end,
        reducedRestDurationHours: durationHours,
        compensationHours,
        deadline,
        resolved: false,
        resolvedAt: null,
        resolvedRestStart: null,
        resolvedRestEnd: null,
        chainMode,
        minResolutionHours,
        chainTriggerStart: chainTriggerStart,
        resolvedByWeeklyRest: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await docRef.set(payload);
      return id;
    } catch (e) {
      try { console.warn('[weeklyRestCompensation] ensure failed', e); } catch (_) {}
      return null;
    }
  }

  function findMatchingBlock(allBlocks, resolvedStart, resolvedEnd) {
    const rs = (resolvedStart instanceof Date ? resolvedStart : new Date(resolvedStart)).getTime();
    const re = (resolvedEnd instanceof Date ? resolvedEnd : new Date(resolvedEnd)).getTime();
    for (const b of allBlocks) {
      const bs = (b.start instanceof Date ? b.start : new Date(b.start)).getTime();
      const be = (b.end instanceof Date ? b.end : new Date(b.end)).getTime();
      if (Math.abs(bs - rs) <= REVERIFY_TOLERANCE_MS && Math.abs(be - re) <= REVERIFY_TOLERANCE_MS) {
        return b;
      }
    }
    return null;
  }

  async function reverifyResolvedCompensations(allBlocks) {
    const uid = getCurrentUser()?.uid;
    const db = getDb();
    if (!uid || !db) return { ok: false, capacityMap: null };

    const loadCtx = (window.GurigoAuthSession && window.GurigoAuthSession.captureAuthScopedLoad)
      ? window.GurigoAuthSession.captureAuthScopedLoad()
      : { uid: uid, gen: 0 };

    let resolvedComps = [];
    try {
      const snap = await db.collection('users').doc(uid).collection('compensations')
        .where('resolved', '==', true)
        .get();
      if (window.GurigoAuthSession && window.GurigoAuthSession.shouldDiscardAuthScopedLoad(loadCtx)) {
        return { ok: false, capacityMap: null };
      }
      resolvedComps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      try { console.warn('[weeklyRestCompensation] reverify load failed', e); } catch (_) {}
      return { ok: false, capacityMap: null };
    }

    const sortedResolvedComps = sortCompensationDocs(resolvedComps);
    const capacityMap = buildStandardBlockCapacityMap(allBlocks);

    for (const comp of sortedResolvedComps) {
      const resolvedStart = comp.resolvedRestStart?.toDate ? comp.resolvedRestStart.toDate() : new Date(comp.resolvedRestStart);
      const resolvedEnd = comp.resolvedRestEnd?.toDate ? comp.resolvedRestEnd.toDate() : new Date(comp.resolvedRestEnd);
      const mobility = isMobilityPackageComp(comp);

      const block = findMatchingBlock(allBlocks, resolvedStart, resolvedEnd);
      let keepResolved = false;
      if (block) {
        keepResolved = canAllocateStandardCompToBlock(comp, block, capacityMap);
        if (keepResolved && !mobility) {
          consumeStandardCompCapacity(comp, block, capacityMap);
        }
      }

      if (!keepResolved) {
        try {
          await db.collection('users').doc(uid).collection('compensations').doc(comp.id).update({
            resolved: false,
            resolvedAt: null,
            resolvedRestStart: null,
            resolvedRestEnd: null,
            resolvedByWeeklyRest: false
          });
        } catch (e) {
          try { console.warn('[weeklyRestCompensation] reverify revert failed', e); } catch (_) {}
        }
      }
    }

    return { ok: true, capacityMap };
  }

  async function tryResolveCompensations(blocks, initialCapacityMap) {
    const uid = getCurrentUser()?.uid;
    const db = getDb();
    if (!uid || !db) return;

    let openComps = [];
    try {
      const snap = await db.collection('users').doc(uid).collection('compensations')
        .where('resolved', '==', false)
        .get();
      openComps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      try { console.warn('[weeklyRestCompensation] load open failed', e); } catch (_) {}
      return;
    }

    const sortedOpenComps = sortCompensationDocs(openComps);
    const standardCapacityMap = initialCapacityMap || buildStandardBlockCapacityMap(blocks);
    const resolvedIds = new Set();
    const weeklyBlocks = getRestBlocksChronological();

    for (const comp of sortedOpenComps) {
      if (resolvedIds.has(comp.id)) continue;
      const mobility = isMobilityPackageComp(comp);
      const reducedEnd = comp.reducedRestEnd?.toDate ? comp.reducedRestEnd.toDate() : new Date(comp.reducedRestEnd);
      const resolvePool = mobility ? weeklyBlocks : blocks;

      for (const block of resolvePool) {
        const blockStart = block.start instanceof Date ? block.start : new Date(block.start);
        const blockEnd = block.end instanceof Date ? block.end : new Date(block.end);
        if (blockStart <= reducedEnd) continue;
        if (mobility && getBlockMinutes(block) < 45 * 60) continue;

        if (canAllocateStandardCompToBlock(comp, block, standardCapacityMap)) {
          try {
            await db.collection('users').doc(uid).collection('compensations').doc(comp.id).update({
              resolved: true,
              resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
              resolvedRestStart: blockStart,
              resolvedRestEnd: blockEnd,
              resolvedByWeeklyRest: mobility
            });
            resolvedIds.add(comp.id);
            if (!mobility) {
              consumeStandardCompCapacity(comp, block, standardCapacityMap);
            }
          } catch (e) {
            try { console.warn('[weeklyRestCompensation] resolve failed', e); } catch (_) {}
          }
          break;
        }
      }
    }
  }

  let cachedOpenCompensations = [];
  let cachedResolvedByRest = {};
  let cachedResolvedByReducedStart = {};
  let lastSyncTime = 0;
  let lastSyncRecordsHash = '';

  function getRecordsHash() {
    const recs = getRecordsSorted();
    if (!recs || recs.length === 0) return '0';
    const last = recs[recs.length - 1];
    const lastDate = last && (last.endDate || last.date) ? String(last.endDate || last.date) : '';
    return recs.length + '_' + lastDate;
  }

  const SYNC_COOLDOWN_MS = 30000;

  function isExemptFromCompensation(block, exemptRestStarts) {
    if (!Array.isArray(exemptRestStarts) || exemptRestStarts.length === 0) return false;
    const start = block.start instanceof Date ? block.start : new Date(block.start);
    return exemptRestStarts.indexOf(start.getTime()) !== -1;
  }

  function isSuppressedFromStandardComp(block, suppressStarts) {
    if (!Array.isArray(suppressStarts) || suppressStarts.length === 0) return false;
    const start = block.start instanceof Date ? block.start : new Date(block.start);
    return suppressStarts.indexOf(start.getTime()) !== -1;
  }

  function getMobilityEvaluationForSync(blocks) {
    if (typeof window.evaluateMobilityPackageChains === 'function') {
      return window.evaluateMobilityPackageChains(blocks);
    }
    return {
      exemptRestStarts: [],
      mobilityCompensationBlocks: [],
      suppressStandardCompStarts: []
    };
  }

  async function syncCompensations(options) {
    const uid = getCurrentUser()?.uid;
    if (!uid) return;

    const loadCtx = (window.GurigoAuthSession && window.GurigoAuthSession.captureAuthScopedLoad)
      ? window.GurigoAuthSession.captureAuthScopedLoad()
      : { uid: uid, gen: 0 };

    const force = !!(options && options.force);
    const now = Date.now();
    const hash = getRecordsHash();
    if (!force && lastSyncRecordsHash === hash && (now - lastSyncTime) < SYNC_COOLDOWN_MS) return;
    lastSyncTime = now;
    lastSyncRecordsHash = hash;

    const blocks = getRestBlocksChronological();
    if (typeof window.refreshMobilityPackageDecisions === 'function') {
      try { await window.refreshMobilityPackageDecisions(); } catch (_) {}
    }
    const mobilityEval = getMobilityEvaluationForSync(blocks);
    const exemptRestStarts = mobilityEval.exemptRestStarts || [];
    const suppressStarts = mobilityEval.suppressStandardCompStarts || [];
    const mobilityCompBlocks = mobilityEval.mobilityCompensationBlocks || [];
    const mobilityCompStartSet = new Set(
      mobilityCompBlocks.map((b) => {
        const s = b.start instanceof Date ? b.start : new Date(b.start);
        return s.getTime();
      })
    );

    for (const mBlock of mobilityCompBlocks) {
      if (!isRestBlockEnded(mBlock)) continue;
      await ensureCompensationExists(mBlock, {
        chainMode: 'mobility_package',
        minResolutionHours: (Number(mBlock.compensationHours) || 0) + 45,
        chainTriggerStart: mBlock.chainTriggerStart != null ? new Date(mBlock.chainTriggerStart) : null
      });
    }

    for (const exemptMs of exemptRestStarts) {
      if (!mobilityCompStartSet.has(exemptMs)) {
        await removeCompensationDocForRestStart(exemptMs);
      }
    }

    for (const block of blocks) {
      const startMs = (block.start instanceof Date ? block.start : new Date(block.start)).getTime();
      if (mobilityCompStartSet.has(startMs)) continue;
      const reduced = isReducedWeeklyRest(block);
      const exempt = isExemptFromCompensation(block, exemptRestStarts);
      const suppressed = isSuppressedFromStandardComp(block, suppressStarts);
      const restEnded = isRestBlockEnded(block);
      if (reduced && !exempt && !suppressed && restEnded) {
        await ensureCompensationExists(block, { chainMode: 'standard' });
      }
    }
    const allRestBlocks = getAllRestBlocksChronological();
    const reverifyResult = await reverifyResolvedCompensations(allRestBlocks);
    if (window.GurigoAuthSession && window.GurigoAuthSession.shouldDiscardAuthScopedLoad(loadCtx)) return;
    if (reverifyResult && reverifyResult.ok) {
      await tryResolveCompensations(allRestBlocks, reverifyResult.capacityMap);
    }
  }

  async function loadOpenCompensations() {
    const uid = getCurrentUser()?.uid;
    const db = getDb();
    if (!uid || !db) {
      cachedOpenCompensations = [];
      cachedResolvedByRest = {};
      return cachedOpenCompensations;
    }
    try {
      const snap = await db.collection('users').doc(uid).collection('compensations')
        .where('resolved', '==', false)
        .get();
      cachedOpenCompensations = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        deadlineDate: (d.data().deadline?.toDate ? d.data().deadline.toDate() : new Date(d.data().deadline))
      }));
    } catch (e) {
      cachedOpenCompensations = [];
    }
    return cachedOpenCompensations;
  }

  async function loadResolvedByRest() {
    const uid = getCurrentUser()?.uid;
    const db = getDb();
    if (!uid || !db) {
      cachedResolvedByRest = {};
      cachedResolvedByReducedStart = {};
      return cachedResolvedByRest;
    }
    try {
      const snap = await db.collection('users').doc(uid).collection('compensations')
        .where('resolved', '==', true)
        .get();
      const map = {};
      const byReduced = {};
      for (const doc of snap.docs) {
        const d = doc.data();
        const start = d.resolvedRestStart?.toDate ? d.resolvedRestStart.toDate() : new Date(d.resolvedRestStart);
        const end = d.resolvedRestEnd?.toDate ? d.resolvedRestEnd.toDate() : new Date(d.resolvedRestEnd);
        const key = `${start.getTime()}_${end.getTime()}`;
        if (!map[key]) map[key] = [];
        map[key].push({ compensationHours: Number(d.compensationHours) || 0 });
        const reducedStart = d.reducedRestStart?.toDate ? d.reducedRestStart.toDate() : new Date(d.reducedRestStart);
        byReduced[reducedStart.getTime()] = true;
      }
      cachedResolvedByRest = map;
      cachedResolvedByReducedStart = byReduced;
    } catch (e) {
      cachedResolvedByRest = {};
      cachedResolvedByReducedStart = {};
    }
    return cachedResolvedByRest;
  }

  function getIsCompensationResolvedForReducedRest(reducedRestStart) {
    const ts = (reducedRestStart instanceof Date ? reducedRestStart : new Date(reducedRestStart)).getTime();
    return !!cachedResolvedByReducedStart[ts];
  }

  function getResolvedCompensationsForRest(restStart, restEnd) {
    const start = restStart instanceof Date ? restStart : new Date(restStart);
    const end = restEnd instanceof Date ? restEnd : new Date(restEnd);
    const key = `${start.getTime()}_${end.getTime()}`;
    const cached = cachedResolvedByRest[key] || [];
    if (!cached.length) return [];

    if (typeof window.getMobilityRestClassification === 'function') {
      const mc = window.getMobilityRestClassification(start.getTime());
      if (mc) {
        return mc.role === 'COMP_RESOLVED' ? cached : [];
      }
    }

    // Védelem a dupla elszámolás ellen: ha a pihenő ugyanakkora, mint a
    // rendes heti pihenő, a visszapótlás csak a 45 órán felüli többletből
    // számolható. Stale cache esetén se jelenjen meg tévesen a zöld sor.
    const blockHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return cached.filter((c) => {
      const compLike = {
        compensationHours: c.compensationHours,
        chainMode: c.chainMode || 'standard'
      };
      return canResolveCompensationWithBlock(compLike, blockHours);
    });
  }

  function formatCompensationHours(hours) {
    if (!Number.isFinite(hours)) return '';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    const units = typeof getDurationUnitTokens === 'function' ? getDurationUnitTokens() : { hours: 'ó', minutes: 'p' };
    if (m > 0) return `${h} ${units.hours} ${m} ${units.minutes}`;
    return `${h} ${units.hours}`;
  }

  function getI18n() {
    try {
      if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
        return translations[currentLang] || {};
      }
    } catch (_) {}
    return {};
  }

  function t(key, fallback) {
    const i18n = getI18n();
    try {
      const v = i18n[key];
      if (v === undefined || v === null || String(v).trim() === '') return fallback;
      return v;
    } catch (_) {
      return fallback;
    }
  }

  function escapeHtml(s) {
    if (s == null || s === '') return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  let compensationRenderGeneration = 0;

  function areRecordsReadyForCompensation() {
    if (!getCurrentUser()?.uid) return true;
    return Array.isArray(window.records);
  }

  function setCompensationCardState(loading, ready) {
    window.weeklyRestCompensationLoading = !!loading;
    window.weeklyRestCompensationReady = !!ready;
  }

  function renderCompensationLoadingCard(container) {
    const title = t('compensationLoadingTitle', 'Visszapótlások számolása...');
    const desc = t('compensationLoadingDesc', 'A rendszer ellenőrzi a heti pihenőket és az esetleges visszapótlásokat.');
    container.innerHTML = `
      <div class="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-600 rounded-lg p-3">
        <div class="flex gap-3 items-start">
          <div class="inline-block w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" aria-hidden="true"></div>
          <div class="min-w-0">
            <h3 class="font-medium text-slate-800 dark:text-slate-100 text-sm">${escapeHtml(title)}</h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 mt-1">${escapeHtml(desc)}</p>
          </div>
        </div>
      </div>`;
    container.style.display = '';
  }

  function filterOpenCompensationsForDisplay(open) {
    if (!Array.isArray(open) || open.length === 0) return [];
    const allBlocks = getAllRestBlocksChronological();
    return open.filter((c) => {
      const block = findBlockMatchingComp(allBlocks, c);
      return block && isRestBlockEnded(block);
    });
  }

  function ensureCardContainer() {
    const anchor90 = document.getElementById('ninety-hour-weekend-rest-card');
    const anchor = anchor90 || document.getElementById('live-allowance-display');
    if (!anchor) return null;
    let el = document.getElementById('weekly-rest-compensation-card');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'weekly-rest-compensation-card';
    el.className = 'mt-3';
    anchor.insertAdjacentElement('afterend', el);
    return el;
  }

  async function renderWeeklyRestCompensationCard() {
    const tier = (typeof window.getEffectiveSubscriptionTier === 'function')
      ? window.getEffectiveSubscriptionTier()
      : 'free';
    if (tier === 'free') {
      const el = document.getElementById('weekly-rest-compensation-card');
      if (el) {
        el.innerHTML = '';
        el.style.display = 'none';
      }
      setCompensationCardState(false, false);
      return;
    }

    const gen = ++compensationRenderGeneration;
    setCompensationCardState(true, false);

    const container = ensureCardContainer();
    if (!container) {
      setCompensationCardState(false, false);
      return;
    }

    renderCompensationLoadingCard(container);

    if (!areRecordsReadyForCompensation()) {
      return;
    }

    try {
      await syncCompensations();
      if (gen !== compensationRenderGeneration) return;
      await loadResolvedByRest();
      if (gen !== compensationRenderGeneration) return;
      const open = await loadOpenCompensations();
      if (gen !== compensationRenderGeneration) return;

      setCompensationCardState(false, true);

      const displayOpen = filterOpenCompensationsForDisplay(open);
      if (!displayOpen.length) {
        container.innerHTML = '';
        return;
      }

      const now = new Date();
      const title = t('compensationCardTitle', 'Visszapótlás szükséges');
      let rows = [];
      for (const c of displayOpen) {
      const compHours = Number(c.compensationHours) || 0;
      const formatted = formatCompensationHours(compHours);
      const deadline = c.deadlineDate || (c.deadline?.toDate ? c.deadline.toDate() : new Date(c.deadline));
      const diffMs = deadline - now;
      const diffHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      const remHours = diffHours % 24;

      const restEnd = c.reducedRestEnd?.toDate ? c.reducedRestEnd.toDate() : new Date(c.reducedRestEnd);
      const restDurationHours = Number(c.reducedRestDurationHours);
      const restDurationFormatted = Number.isFinite(restDurationHours) ? formatCompensationHours(restDurationHours) : '–';
      const whenStr = typeof formatDateTime === 'function' ? formatDateTime(restEnd) : restEnd.toLocaleString();
      const reasonText = t('compensationReason', 'Csökkentett heti pihenő (24–45 óra): a teljes heti pihenő 45 óra.');
      const whenLabel = t('compensationWhen', 'Mikor:');
      const shortfallLabel = t('compensationShortfall', 'Mennyivel kevesebb:');
      const actualRestLabel = t('compensationActualRest', 'A pihenő hossza volt:');

      if (diffMs <= 0) {
        const expiredText = t('compensationExpired', 'Visszapótlás határideje lejárt!');
        rows.push(`
          <div class="space-y-1 border-b border-amber-200 dark:border-amber-700 pb-2 last:border-0 last:pb-0">
            <p class="text-sm font-semibold text-red-600 dark:text-red-400">${expiredText} <strong>${formatted}</strong> ${t('compensationUnresolved', 'rendezetlen')}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">${reasonText}</p>
            <p class="text-xs text-gray-500 dark:text-gray-500">${whenLabel} ${whenStr}</p>
            <p class="text-xs text-gray-500 dark:text-gray-500">${shortfallLabel} <strong>${formatted}</strong></p>
            <p class="text-xs text-gray-500 dark:text-gray-500">${actualRestLabel} ${restDurationFormatted}</p>
          </div>
        `);
      } else {
        const neededText = t('compensationNeeded', 'Visszapótlás szükséges:');
        const deadlineLabel = t('compensationDeadline', 'Határidő:');
        const absDate = typeof formatDateTime === 'function' ? formatDateTime(deadline) : deadline.toLocaleString();
        const relText = t('tachoRelativeTime', '({days} nap {hours} óra múlva)').replace('{days}', diffDays).replace('{hours}', remHours);
        rows.push(`
          <div class="space-y-1 border-b border-amber-200 dark:border-amber-700 pb-2 last:border-0 last:pb-0">
            <p class="text-sm text-gray-700 dark:text-gray-300">${neededText} <strong>${formatted}</strong></p>
            <p class="text-xs text-gray-600 dark:text-gray-400">${reasonText}</p>
            <p class="text-xs text-gray-500 dark:text-gray-500">${whenLabel} ${whenStr}</p>
            <p class="text-xs text-gray-500 dark:text-gray-500">${shortfallLabel} <strong>${formatted}</strong></p>
            <p class="text-xs text-gray-500 dark:text-gray-500">${actualRestLabel} ${restDurationFormatted}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${deadlineLabel} ${absDate} (${relText})</p>
          </div>
        `);
      }
    }

      container.innerHTML = `
      <div class="bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2">
        <h3 class="font-semibold text-amber-800 dark:text-amber-200">⚠ ${title}</h3>
        <div class="space-y-3">${rows.join('')}</div>
      </div>
    `;
    } catch (_) {
      if (gen !== compensationRenderGeneration) return;
      setCompensationCardState(false, true);
      container.innerHTML = '';
    }
  }

  window.weeklyRestCompensationLoading = false;
  window.weeklyRestCompensationReady = false;
  window.weeklyRestCompensationCancelPending = function weeklyRestCompensationCancelPending() {
    compensationRenderGeneration += 1;
  };
  window.weeklyRestCompensationSync = syncCompensations;
  window.weeklyRestCompensationRender = renderWeeklyRestCompensationCard;
  window.loadWeeklyRestCompensationResolved = loadResolvedByRest;
  window.getResolvedCompensationsForRest = getResolvedCompensationsForRest;
  window.getIsCompensationResolvedForReducedRest = getIsCompensationResolvedForReducedRest;
  window.revertMobilityCompensationsForTrigger = revertMobilityCompensationsForTrigger;
})();
