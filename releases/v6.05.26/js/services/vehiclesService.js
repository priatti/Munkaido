// Járművek Firestore szolgáltatás + session cache (csak Vehicles tab megnyitásakor olvas)
(function () {
  'use strict';

  var cache = {
    uid: null,
    vehicles: null,
    loaded: false,
    loadPromise: null,
  };

  function getDb() {
    if (typeof db !== 'undefined' && db) return db;
    if (typeof firebase !== 'undefined' && firebase.firestore) return firebase.firestore();
    return null;
  }

  function vehiclesColRef(uid) {
    var database = getDb();
    if (!database || !uid) return null;
    return database.collection('users').doc(uid).collection('vehicles');
  }

  function normalizePlateNumber(plate) {
    return String(plate || '').trim().toUpperCase();
  }

  function normalizePlateKey(plate) {
    return normalizePlateNumber(plate).replace(/[\s\-]/g, '');
  }

  function parseOptionalCapacity(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    var n = Number(String(value).trim().replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error('invalid_capacity');
    }
    return n;
  }

  var SUPPORTED_ENERGY_TYPES = ['diesel', 'adblue', 'hvo', 'lng', 'cng', 'electric', 'hybrid', 'other'];
  var DEFAULT_ENERGY_TYPES = ['diesel', 'adblue'];
  var SUPPORTED_CAPACITY_UNITS = ['liter', 'kg', 'kwh', 'other'];
  var ENERGY_TYPES_WITH_CAPACITY = ['diesel', 'hvo', 'adblue', 'lng', 'cng', 'electric', 'other'];

  var ENERGY_UNIT_BY_TYPE = {
    diesel: 'liter',
    hvo: 'liter',
    adblue: 'liter',
    lng: 'kg',
    cng: 'kg',
    electric: 'kwh',
    other: 'other',
  };

  var ENERGY_CAPACITY_LABEL_KEYS = {
    diesel: 'vehiclesCapacityDiesel',
    hvo: 'vehiclesCapacityHvo',
    adblue: 'vehiclesCapacityAdblue',
    lng: 'vehiclesCapacityLng',
    cng: 'vehiclesCapacityCng',
    electric: 'vehiclesCapacityElectric',
    other: 'vehiclesCapacityOther',
  };

  var ENERGY_CAPACITY_LIST_LABEL_KEYS = {
    diesel: 'vehiclesEnergyTypeDiesel',
    hvo: 'vehiclesEnergyTypeHvo',
    adblue: 'vehiclesEnergyTypeAdblue',
    lng: 'vehiclesEnergyTypeLng',
    cng: 'vehiclesEnergyTypeCng',
    electric: 'vehiclesCapacityListElectric',
    other: 'vehiclesCapacityOther',
  };

  function getEnergyUnit(type) {
    var key = String(type || '').toLowerCase();
    return ENERGY_UNIT_BY_TYPE[key] || null;
  }

  function getEnergyCapacityLabelKey(type) {
    return ENERGY_CAPACITY_LABEL_KEYS[String(type || '').toLowerCase()] || 'vehiclesCapacityOther';
  }

  function getEnergyCapacityListLabelKey(type) {
    return ENERGY_CAPACITY_LIST_LABEL_KEYS[String(type || '').toLowerCase()] || 'vehiclesCapacityOther';
  }

  function getCapacityTypesForEnergyTypes(energyTypes) {
    return ENERGY_TYPES_WITH_CAPACITY.filter(function (type) {
      return (energyTypes || []).indexOf(type) >= 0;
    });
  }

  function mapEnergyCapacitiesFromDoc(raw) {
    if (!raw || typeof raw !== 'object') return undefined;
    var result = {};
    ENERGY_TYPES_WITH_CAPACITY.forEach(function (type) {
      var entry = raw[type];
      if (!entry || entry.value == null) return;
      var value = Number(entry.value);
      if (!Number.isFinite(value) || value <= 0) return;
      var unit = String(entry.unit || getEnergyUnit(type) || 'other').toLowerCase();
      if (SUPPORTED_CAPACITY_UNITS.indexOf(unit) < 0) unit = getEnergyUnit(type) || 'other';
      result[type] = { value: value, unit: unit };
    });
    return Object.keys(result).length ? result : undefined;
  }

  function getVehicleEnergyCapacity(vehicle, type) {
    var energyType = String(type || '').toLowerCase();
    if (!energyType || ENERGY_TYPES_WITH_CAPACITY.indexOf(energyType) < 0) return null;

    if (vehicle && vehicle.energyCapacities && vehicle.energyCapacities[energyType]) {
      var stored = vehicle.energyCapacities[energyType];
      if (stored && stored.value != null) {
        return {
          value: stored.value,
          unit: stored.unit || getEnergyUnit(energyType),
        };
      }
    }

    if (energyType === 'adblue' && vehicle && vehicle.adBlueCapacityLiters != null) {
      return { value: vehicle.adBlueCapacityLiters, unit: 'liter' };
    }
    if ((energyType === 'diesel' || energyType === 'hvo') && vehicle && vehicle.tankCapacityLiters != null) {
      var types = getVehicleEnergyTypes(vehicle);
      if (energyType === 'diesel' || (energyType === 'hvo' && types.indexOf('diesel') < 0)) {
        return { value: vehicle.tankCapacityLiters, unit: 'liter' };
      }
    }
    return null;
  }

  function getVehicleCapacityDisplayLines(vehicle) {
    var types = getCapacityTypesForEnergyTypes(getVehicleEnergyTypes(vehicle));
    var lines = [];
    types.forEach(function (type) {
      var cap = getVehicleEnergyCapacity(vehicle, type);
      if (!cap || cap.value == null) return;
      lines.push({ type: type, value: cap.value, unit: cap.unit || getEnergyUnit(type) });
    });
    return lines;
  }

  function normalizeEnergyCapacities(rawCapacities, energyTypes) {
    var types = getCapacityTypesForEnergyTypes(energyTypes);
    var result = {};
    types.forEach(function (type) {
      var rawVal = rawCapacities && rawCapacities[type];
      if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') return;
      var value = parseOptionalCapacity(rawVal);
      if (value != null) {
        result[type] = { value: value, unit: getEnergyUnit(type) };
      }
    });
    return result;
  }

  function syncLegacyCapacityFields(energyCapacities) {
    var tankCapacityLiters = null;
    var adBlueCapacityLiters = null;
    if (energyCapacities && energyCapacities.diesel) {
      tankCapacityLiters = energyCapacities.diesel.value;
    } else if (energyCapacities && energyCapacities.hvo) {
      tankCapacityLiters = energyCapacities.hvo.value;
    }
    if (energyCapacities && energyCapacities.adblue) {
      adBlueCapacityLiters = energyCapacities.adblue.value;
    }
    return { tankCapacityLiters: tankCapacityLiters, adBlueCapacityLiters: adBlueCapacityLiters };
  }

  function mergeEnergyCapacitiesForSave(rawCapacities, energyTypes) {
    var types = getCapacityTypesForEnergyTypes(energyTypes);
    var mergedRaw = {};
    types.forEach(function (type) {
      var formVal = rawCapacities && rawCapacities[type];
      if (formVal !== undefined && formVal !== null && String(formVal).trim() !== '') {
        mergedRaw[type] = formVal;
      }
    });
    return normalizeEnergyCapacities(mergedRaw, energyTypes);
  }

  function getVehicleEnergyTypes(vehicle) {
    if (!vehicle) return DEFAULT_ENERGY_TYPES.slice();
    if (Array.isArray(vehicle.energyTypes) && vehicle.energyTypes.length) {
      return vehicle.energyTypes.slice();
    }
    return DEFAULT_ENERGY_TYPES.slice();
  }

  function isElectricOnlyVehicle(vehicle) {
    var types = getVehicleEnergyTypes(vehicle);
    return types.length === 1 && types[0] === 'electric';
  }

  function hasEnergyType(vehicle, type) {
    return getVehicleEnergyTypes(vehicle).indexOf(String(type || '').toLowerCase()) >= 0;
  }

  function normalizeEnergyTypes(raw, options) {
    options = options || {};
    var allowDefault = options.allowDefault !== false;
    if (!Array.isArray(raw) || !raw.length) {
      if (allowDefault) return DEFAULT_ENERGY_TYPES.slice();
      throw new Error('energy_types_required');
    }
    var seen = {};
    var result = [];
    raw.forEach(function (item) {
      var energyType = String(item || '').trim().toLowerCase();
      if (!energyType || SUPPORTED_ENERGY_TYPES.indexOf(energyType) < 0) {
        throw new Error('invalid_energy_type');
      }
      if (!seen[energyType]) {
        seen[energyType] = true;
        result.push(energyType);
      }
    });
    if (!result.length) throw new Error('energy_types_required');
    return result;
  }

  function vehicleShowsTankCapacity(energyTypes) {
    return getCapacityTypesForEnergyTypes(energyTypes).some(function (type) {
      return type !== 'adblue' && type !== 'electric';
    });
  }

  function vehicleShowsAdBlueCapacity(energyTypes) {
    return (energyTypes || []).indexOf('adblue') >= 0;
  }

  function resolveFuelingMenuLabelMode(activeVehicles) {
    if (!Array.isArray(activeVehicles) || !activeVehicles.length) return 'default';
    var allElectricOnly = activeVehicles.every(function (vehicle) {
      return isElectricOnlyVehicle(vehicle);
    });
    return allElectricOnly ? 'charging' : 'fueling';
  }

  function getFuelingMenuLabelKeys(mode) {
    if (mode === 'charging') {
      return { title: 'fuelingMenuTitleCharging', subtitle: 'fuelingMenuSubtitleCharging' };
    }
    return { title: 'fuelingMenuTitleFueling', subtitle: 'fuelingMenuSubtitleFueling' };
  }

  function mapVehicleDoc(doc) {
    var data = doc.data() || {};
    return {
      id: doc.id,
      uid: data.uid || null,
      ownerUid: data.ownerUid || null,
      companyId: data.companyId != null ? data.companyId : null,
      vehicleScope: data.vehicleScope || 'personal',
      officeManaged: data.officeManaged === true,
      plateNumber: data.plateNumber || '',
      plateNumberNormalized: data.plateNumberNormalized || normalizePlateKey(data.plateNumber),
      tankCapacityLiters: data.tankCapacityLiters != null ? data.tankCapacityLiters : null,
      adBlueCapacityLiters: data.adBlueCapacityLiters != null ? data.adBlueCapacityLiters : null,
      energyTypes: Array.isArray(data.energyTypes) && data.energyTypes.length ? data.energyTypes.slice() : undefined,
      energyCapacities: mapEnergyCapacitiesFromDoc(data.energyCapacities),
      active: data.active !== false,
      deleted: data.deleted === true,
      createdAt: data.createdAt || null,
      createdBy: data.createdBy || null,
      updatedAt: data.updatedAt || null,
      updatedBy: data.updatedBy || null,
      deletedAt: data.deletedAt || null,
      deletedBy: data.deletedBy || null,
    };
  }

  function sortVehicles(list) {
    return (list || []).slice().sort(function (a, b) {
      var pa = String(a.plateNumber || '').localeCompare(String(b.plateNumber || ''), undefined, { sensitivity: 'base' });
      if (pa !== 0) return pa;
      return String(a.id).localeCompare(String(b.id));
    });
  }

  function setCache(uid, vehicles) {
    cache.uid = uid;
    cache.vehicles = sortVehicles(vehicles);
    cache.loaded = true;
    cache.loadPromise = null;
  }

  function resetVehiclesCache() {
    cache.uid = null;
    cache.vehicles = null;
    cache.loaded = false;
    cache.loadPromise = null;
  }

  function getCachedVehicles() {
    if (!cache.loaded || !Array.isArray(cache.vehicles)) return null;
    return cache.vehicles.slice();
  }

  async function loadVehicles(forceRefresh) {
    var user = window.currentUser;
    if (!user || !user.uid) return [];

    var uid = user.uid;
    if (!forceRefresh && cache.loaded && cache.uid === uid && Array.isArray(cache.vehicles)) {
      return cache.vehicles.slice();
    }

    if (!forceRefresh && cache.loadPromise && cache.uid === uid) {
      return cache.loadPromise;
    }

    var colRef = vehiclesColRef(uid);
    if (!colRef) return [];

    cache.uid = uid;
    cache.loadPromise = colRef.get().then(function (snap) {
      var list = [];
      snap.forEach(function (doc) {
        var item = mapVehicleDoc(doc);
        if (item.deleted) return;
        list.push(item);
      });
      setCache(uid, list);
      return cache.vehicles.slice();
    }).catch(function (err) {
      cache.loadPromise = null;
      throw err;
    });

    return cache.loadPromise;
  }

  function upsertLocalVehicle(vehicle) {
    var uid = window.currentUser && window.currentUser.uid;
    if (!uid || !vehicle) return;
    if (!cache.uid) cache.uid = uid;
    if (!Array.isArray(cache.vehicles)) cache.vehicles = [];
    cache.loaded = true;
    var idx = cache.vehicles.findIndex(function (v) { return v.id === vehicle.id; });
    if (idx >= 0) {
      cache.vehicles[idx] = vehicle;
    } else {
      cache.vehicles.push(vehicle);
    }
    cache.vehicles = sortVehicles(cache.vehicles);
  }

  function removeLocalVehicle(id) {
    if (!Array.isArray(cache.vehicles)) return;
    cache.vehicles = cache.vehicles.filter(function (v) { return v.id !== id; });
    if (cache.uid) cache.loaded = true;
  }

  function notifyVehiclesChanged(detail) {
    try {
      window.dispatchEvent(new CustomEvent('gurigo:vehiclesChanged', {
        detail: detail || {},
      }));
    } catch (_) {}
  }

  async function fetchVehicleById(uid, vehicleId) {
    var colRef = vehiclesColRef(uid);
    if (!colRef) return null;
    var snap = await colRef.doc(vehicleId).get();
    if (!snap.exists) return null;
    return mapVehicleDoc(snap);
  }

  async function createVehicle(input) {
    var user = window.currentUser;
    if (!user || !user.uid) throw new Error('not_authenticated');
    var uid = user.uid;
    var colRef = vehiclesColRef(uid);
    if (!colRef) throw new Error('no_db');

    var plateNumber = normalizePlateNumber(input.plateNumber);
    if (!plateNumber) throw new Error('plate_required');

    var energyTypes = normalizeEnergyTypes(input.energyTypes, { allowDefault: false });
    var energyCapacities = mergeEnergyCapacitiesForSave(input.energyCapacities, energyTypes);
    var legacyCapacities = syncLegacyCapacityFields(energyCapacities);
    var tankCapacityLiters = legacyCapacities.tankCapacityLiters;
    var adBlueCapacityLiters = legacyCapacities.adBlueCapacityLiters;
    var docRef = colRef.doc();
    var unlimitedActive = hasUnlimitedActiveVehicles();
    var hadActiveBefore = getCachedActiveVehicleCount();
    var shouldBeActive = resolveNewVehicleActiveFlag();

    var payload = {
      uid: uid,
      ownerUid: uid,
      companyId: null,
      vehicleScope: 'personal',
      officeManaged: false,
      plateNumber: plateNumber,
      plateNumberNormalized: normalizePlateKey(plateNumber),
      tankCapacityLiters: tankCapacityLiters,
      adBlueCapacityLiters: adBlueCapacityLiters,
      energyTypes: energyTypes,
      energyCapacities: energyCapacities,
      active: shouldBeActive,
      deleted: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: uid,
      deletedAt: null,
      deletedBy: null,
    };

    await docRef.set(payload);
    var saved = await fetchVehicleById(uid, docRef.id);
    if (saved) {
      if (!unlimitedActive && hadActiveBefore >= 1 && saved.active === false) {
        saved.createdInactiveDueToFreeLimit = true;
      }
      upsertLocalVehicle(saved);
    }
    notifyVehiclesChanged({ action: 'create', vehicleId: saved && saved.id });
    if (typeof window.updateFuelingMenuLabels === 'function') {
      try { window.updateFuelingMenuLabels(); } catch (_) {}
    }
    return saved;
  }

  async function updateVehicle(vehicleId, input) {
    var user = window.currentUser;
    if (!user || !user.uid) throw new Error('not_authenticated');
    var uid = user.uid;
    var colRef = vehiclesColRef(uid);
    if (!colRef) throw new Error('no_db');

    var plateNumber = normalizePlateNumber(input.plateNumber);
    if (!plateNumber) throw new Error('plate_required');

    var energyTypes = normalizeEnergyTypes(input.energyTypes, { allowDefault: false });
    var energyCapacities = mergeEnergyCapacitiesForSave(input.energyCapacities, energyTypes);
    var legacyCapacities = syncLegacyCapacityFields(energyCapacities);
    var tankCapacityLiters = legacyCapacities.tankCapacityLiters;
    var adBlueCapacityLiters = legacyCapacities.adBlueCapacityLiters;

    var payload = {
      plateNumber: plateNumber,
      plateNumberNormalized: normalizePlateKey(plateNumber),
      tankCapacityLiters: tankCapacityLiters,
      adBlueCapacityLiters: adBlueCapacityLiters,
      energyTypes: energyTypes,
      energyCapacities: energyCapacities,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: uid,
    };

    await colRef.doc(vehicleId).update(payload);
    var saved = await fetchVehicleById(uid, vehicleId);
    if (saved && !saved.deleted) upsertLocalVehicle(saved);
    notifyVehiclesChanged({ action: 'update', vehicleId: vehicleId });
    if (typeof window.updateFuelingMenuLabels === 'function') {
      try { window.updateFuelingMenuLabels(); } catch (_) {}
    }
    return saved;
  }

  async function setVehicleActive(vehicleId, active) {
    var user = window.currentUser;
    if (!user || !user.uid) throw new Error('not_authenticated');
    var uid = user.uid;
    var colRef = vehiclesColRef(uid);
    if (!colRef) throw new Error('no_db');

    if (active === true) {
      var activationCheck = canActivateVehicle(vehicleId);
      if (!activationCheck.ok) {
        var limitErr = new Error('free_active_limit');
        limitErr.code = 'free_active_limit';
        throw limitErr;
      }
    }

    await colRef.doc(vehicleId).update({
      active: active === true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: uid,
    });

    var saved = await fetchVehicleById(uid, vehicleId);
    if (saved && !saved.deleted) upsertLocalVehicle(saved);
    notifyVehiclesChanged({ action: 'setActive', vehicleId: vehicleId, active: active === true });
    if (typeof window.updateFuelingMenuLabels === 'function') {
      try { window.updateFuelingMenuLabels(); } catch (_) {}
    }
    return saved;
  }

  async function softDeleteVehicle(vehicleId) {
    var user = window.currentUser;
    if (!user || !user.uid) throw new Error('not_authenticated');
    var uid = user.uid;
    var colRef = vehiclesColRef(uid);
    if (!colRef) throw new Error('no_db');

    await colRef.doc(vehicleId).update({
      deleted: true,
      deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
      deletedBy: uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: uid,
    });

    removeLocalVehicle(vehicleId);
    notifyVehiclesChanged({ action: 'delete', vehicleId: vehicleId });
  }

  function findDuplicatePlate(plateNumber, excludeId) {
    var key = normalizePlateKey(plateNumber);
    if (!key || !cache.loaded || !Array.isArray(cache.vehicles)) return null;
    return cache.vehicles.find(function (v) {
      if (excludeId && v.id === excludeId) return false;
      return v.plateNumberNormalized === key;
    }) || null;
  }

  function getActiveVehiclesForPicker(list) {
    return (list || []).filter(function (v) {
      return v && v.deleted !== true && v.active !== false;
    });
  }

  function getSubForVehicleLimits() {
    if (typeof window.currentUserSubscription !== 'undefined' && window.currentUserSubscription) {
      return window.currentUserSubscription;
    }
    return {};
  }

  function hasUnlimitedActiveVehicles(subOptional) {
    if (typeof window.getProEntitlement === 'function') {
      return window.getProEntitlement(subOptional != null ? subOptional : getSubForVehicleLimits()).hasProFeatureAccess === true;
    }
    var tier = typeof window.getEffectiveSubscriptionTier === 'function'
      ? window.getEffectiveSubscriptionTier()
      : 'free';
    return tier === 'pro' || tier === 'tester';
  }

  function isActiveVehicleRecord(vehicle) {
    return !!(vehicle && vehicle.deleted !== true && vehicle.active !== false);
  }

  function countActiveVehicles(vehicles, excludeId) {
    return (vehicles || []).filter(function (v) {
      if (excludeId && String(v.id) === String(excludeId)) return false;
      return isActiveVehicleRecord(v);
    }).length;
  }

  function getCachedActiveVehicleCount(excludeId) {
    var list = getCachedVehicles();
    if (!Array.isArray(list)) return 0;
    return countActiveVehicles(list, excludeId);
  }

  function resolveNewVehicleActiveFlag() {
    if (hasUnlimitedActiveVehicles()) return true;
    return getCachedActiveVehicleCount() < 1;
  }

  function canActivateVehicle(vehicleId) {
    if (hasUnlimitedActiveVehicles()) {
      return { ok: true };
    }
    if (getCachedActiveVehicleCount(vehicleId) >= 1) {
      return { ok: false, reason: 'free_active_limit' };
    }
    return { ok: true };
  }

  var lastVehicleCache = {
    uid: null,
    data: null,
    loaded: false,
    loadPromise: null,
  };

  function lastVehicleSettingsRef(uid) {
    var database = getDb();
    if (!database || !uid) return null;
    return database.collection('users').doc(uid).collection('settings').doc('vehicle');
  }

  function resetLastSelectedVehicleCache() {
    lastVehicleCache.uid = null;
    lastVehicleCache.data = null;
    lastVehicleCache.loaded = false;
    lastVehicleCache.loadPromise = null;
  }

  function getCachedLastSelectedVehicle() {
    if (!lastVehicleCache.loaded) return null;
    return lastVehicleCache.data ? Object.assign({}, lastVehicleCache.data) : null;
  }

  async function loadLastSelectedVehicle(forceRefresh) {
    var user = window.currentUser;
    if (!user || !user.uid) return null;

    var uid = user.uid;
    if (!forceRefresh && lastVehicleCache.loaded && lastVehicleCache.uid === uid) {
      return lastVehicleCache.data ? Object.assign({}, lastVehicleCache.data) : null;
    }
    if (!forceRefresh && lastVehicleCache.loadPromise && lastVehicleCache.uid === uid) {
      return lastVehicleCache.loadPromise;
    }

    var ref = lastVehicleSettingsRef(uid);
    if (!ref) return null;

    lastVehicleCache.uid = uid;
    lastVehicleCache.loadPromise = ref.get().then(function (snap) {
      var data = snap.exists ? (snap.data() || {}) : null;
      lastVehicleCache.data = data;
      lastVehicleCache.loaded = true;
      lastVehicleCache.loadPromise = null;
      return data ? Object.assign({}, data) : null;
    }).catch(function (err) {
      lastVehicleCache.loadPromise = null;
      throw err;
    });

    return lastVehicleCache.loadPromise;
  }

  async function saveLastSelectedVehicle(vehicle) {
    var user = window.currentUser;
    if (!user || !user.uid || !vehicle || !vehicle.id) return;
    var uid = user.uid;
    var ref = lastVehicleSettingsRef(uid);
    if (!ref) return;

    var payload = {
      lastSelectedVehicleId: String(vehicle.id),
      lastSelectedVehiclePlateNumber: vehicle.plateNumber || null,
      lastSelectedVehiclePlateNumberNormalized: vehicle.plateNumberNormalized || normalizePlateKey(vehicle.plateNumber),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: uid,
    };

    lastVehicleCache.uid = uid;
    lastVehicleCache.data = {
      lastSelectedVehicleId: payload.lastSelectedVehicleId,
      lastSelectedVehiclePlateNumber: payload.lastSelectedVehiclePlateNumber,
      lastSelectedVehiclePlateNumberNormalized: payload.lastSelectedVehiclePlateNumberNormalized,
      updatedBy: uid,
    };
    lastVehicleCache.loaded = true;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      ref.set(payload, { merge: true }).catch(function (err) {
        console.warn('[VehiclesService] offline last vehicle save queued:', err && err.message);
      });
      return;
    }

    await ref.set(payload, { merge: true });
  }

  function resetAllVehicleSessionCaches() {
    resetVehiclesCache();
    resetLastSelectedVehicleCache();
  }

  window.VehiclesService = {
    loadVehicles: loadVehicles,
    createVehicle: createVehicle,
    updateVehicle: updateVehicle,
    setVehicleActive: setVehicleActive,
    softDeleteVehicle: softDeleteVehicle,
    resetVehiclesCache: resetVehiclesCache,
    getCachedVehicles: getCachedVehicles,
    findDuplicatePlate: findDuplicatePlate,
    normalizePlateNumber: normalizePlateNumber,
    normalizePlateKey: normalizePlateKey,
    parseOptionalCapacity: parseOptionalCapacity,
    SUPPORTED_ENERGY_TYPES: SUPPORTED_ENERGY_TYPES,
    DEFAULT_ENERGY_TYPES: DEFAULT_ENERGY_TYPES,
    SUPPORTED_CAPACITY_UNITS: SUPPORTED_CAPACITY_UNITS,
    ENERGY_TYPES_WITH_CAPACITY: ENERGY_TYPES_WITH_CAPACITY,
    getEnergyUnit: getEnergyUnit,
    getEnergyCapacityLabelKey: getEnergyCapacityLabelKey,
    getEnergyCapacityLabel: getEnergyCapacityLabelKey,
    getEnergyCapacityListLabelKey: getEnergyCapacityListLabelKey,
    getCapacityTypesForEnergyTypes: getCapacityTypesForEnergyTypes,
    getVehicleEnergyCapacity: getVehicleEnergyCapacity,
    getVehicleCapacityDisplayLines: getVehicleCapacityDisplayLines,
    normalizeEnergyCapacities: normalizeEnergyCapacities,
    mergeEnergyCapacitiesForSave: mergeEnergyCapacitiesForSave,
    getVehicleEnergyTypes: getVehicleEnergyTypes,
    isElectricOnlyVehicle: isElectricOnlyVehicle,
    hasEnergyType: hasEnergyType,
    normalizeEnergyTypes: normalizeEnergyTypes,
    vehicleShowsTankCapacity: vehicleShowsTankCapacity,
    vehicleShowsAdBlueCapacity: vehicleShowsAdBlueCapacity,
    resolveFuelingMenuLabelMode: resolveFuelingMenuLabelMode,
    getFuelingMenuLabelKeys: getFuelingMenuLabelKeys,
    getActiveVehiclesForPicker: getActiveVehiclesForPicker,
    hasUnlimitedActiveVehicles: hasUnlimitedActiveVehicles,
    isActiveVehicleRecord: isActiveVehicleRecord,
    countActiveVehicles: countActiveVehicles,
    getCachedActiveVehicleCount: getCachedActiveVehicleCount,
    canActivateVehicle: canActivateVehicle,
    loadLastSelectedVehicle: loadLastSelectedVehicle,
    saveLastSelectedVehicle: saveLastSelectedVehicle,
    getCachedLastSelectedVehicle: getCachedLastSelectedVehicle,
    resetLastSelectedVehicleCache: resetLastSelectedVehicleCache,
    resetAllVehicleSessionCaches: resetAllVehicleSessionCaches,
    notifyVehiclesChanged: notifyVehiclesChanged,
  };

  window.resetVehiclesCache = resetAllVehicleSessionCaches;
})();
