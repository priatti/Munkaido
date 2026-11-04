/**
 * GuriGO boot phase orchestrator.
 * Phase 1 (sync in HTML): Firebase Auth + i18n + auth.js + earlyAuthWire
 * Phase 2: Firestore + shell stack + main.js
 * Phase 3: feature modules (idle warm + ensureFeature on tab)
 */
(function (global) {
  'use strict';

  var phase2Promise = null;
  var phase2Ready = false;
  var featurePromises = Object.create(null);
  var firestoreInited = false;

  function mark(name) {
    if (global.GurigoBootMarks && typeof global.GurigoBootMarks.mark === 'function') {
      global.GurigoBootMarks.mark(name);
    }
  }

  function loadSequential(urls, yieldMs) {
    return global.GurigoLoadScript.loadSequential(urls, {
      yieldMs: yieldMs,
      crossOrigin: undefined,
      phase: 'phase2'
    });
  }

  function initFirestoreAfterSdk() {
    if (firestoreInited) return Promise.resolve();
    firestoreInited = true;
    try {
      var db = firebase.firestore();
      global.db = db;
      global.__firestorePersistencePromise = (function () {
        if (global.__firestorePersistenceEnabled) return Promise.resolve();
        try {
          return db
            .enablePersistence({ synchronizeTabs: true })
            .then(function () {
              global.__firestorePersistenceEnabled = true;
              console.log('[Firestore] Offline persistence enabled (phase2)');
            })
            .catch(function (err) {
              if (err && err.code === 'failed-precondition') {
                console.warn('[Firestore] Persistence failed: multiple tabs open');
              } else if (err && err.code === 'unimplemented') {
                console.warn('[Firestore] Persistence not available in this browser');
              } else {
                console.warn('[Firestore] Persistence error:', err);
              }
            });
        } catch (e) {
          console.warn('[Firestore] Persistence init error:', e);
          return Promise.resolve();
        }
      })();
      global.ensureFirestorePersistence = function () {
        return global.__firestorePersistencePromise || Promise.resolve();
      };
      mark('firestore_ready');
    } catch (e) {
      console.error('[GurigoBoot] Firestore init failed:', e);
    }
    return Promise.resolve();
  }

  function loadSentrySdk() {
    if (global.Sentry || document.querySelector('script[src*="sentry-cdn"]')) {
      return Promise.resolve();
    }
    return global.GurigoLoadScript.load(
      'https://js-de.sentry-cdn.com/fbd6c74b8f2150cffb3f052ed6e84740.min.js',
      { crossOrigin: 'anonymous', phase: 'telemetry' }
    ).catch(function (e) {
      console.warn('[GurigoBoot] Sentry SDK load failed:', e);
    });
  }

  function runPhase2() {
    if (phase2Promise) return phase2Promise;
    mark('phase2_start');
    var manifest = global.GurigoBootManifest;
    if (!manifest) {
      phase2Promise = Promise.reject(new Error('GurigoBootManifest missing'));
      return phase2Promise;
    }

    var legacy =
      global.__GURIGO_BOOT_LEGACY === true ||
      (function () {
        try {
          return localStorage.getItem('__gurigo_boot_legacy') === '1';
        } catch (_) {
          return false;
        }
      })() ||
      /[?&]boot=legacy(?:&|$)/.test(location.search || '');

    var yieldMs = legacy ? -1 : 0;
    var urls = manifest.PHASE2_SHELL.slice();

    // Firestore SDK is first URL; after it loads, init before continuing.
    var first = urls[0];
    var rest = urls.slice(1);

    phase2Promise = global.GurigoLoadScript
      .load(first, { crossOrigin: 'anonymous', phase: 'phase2' })
      .then(function () {
        return initFirestoreAfterSdk();
      })
      .then(function () {
        return loadSentrySdk();
      })
      .then(function () {
        return loadSequential(rest, yieldMs);
      })
      .then(function () {
        phase2Ready = true;
        mark('phase2_ready');
        try {
          if (typeof global.dispatchEvent === 'function') {
            global.dispatchEvent(new CustomEvent('gurigo:phase2ready'));
          }
        } catch (_) {}
        schedulePhase3Warm(legacy);
        if (global.GurigoLazyLibs && typeof global.GurigoLazyLibs.warmupOtherI18n === 'function') {
          var lang = global.currentLang || global.__preferredLang || global.__forcedLang || 'hu';
          global.GurigoLazyLibs.warmupOtherI18n(lang);
        }
      })
      .catch(function (err) {
        console.error('[GurigoBoot] Phase 2 failed:', err);
        throw err;
      });

    return phase2Promise;
  }

  function whenReady(phase) {
    if (phase === 'phase2' || phase === 'shell') {
      if (phase2Ready) return Promise.resolve();
      return runPhase2();
    }
    return Promise.resolve();
  }

  function ensureFeature(name) {
    var manifest = global.GurigoBootManifest;
    if (!manifest || !manifest.PHASE3_FEATURES[name]) {
      return Promise.resolve();
    }
    if (featurePromises[name]) return featurePromises[name];
    var urls = manifest.PHASE3_FEATURES[name];
    if (!urls || !urls.length) {
      featurePromises[name] = Promise.resolve();
      return featurePromises[name];
    }
    featurePromises[name] = whenReady('phase2').then(function () {
      mark('feature_load_' + name);
      return global.GurigoLoadScript.loadSequential(urls, { yieldMs: 0, phase: 'phase3' });
    });
    return featurePromises[name];
  }

  function ensureFeaturesForTab(tabName) {
    var manifest = global.GurigoBootManifest;
    var names = (manifest && manifest.TAB_TO_FEATURES[tabName]) || [];
    var chain = Promise.resolve();
    names.forEach(function (n) {
      chain = chain.then(function () {
        return ensureFeature(n);
      });
    });
    return chain;
  }

  function schedulePhase3Warm(legacy) {
    var manifest = global.GurigoBootManifest;
    if (!manifest) return;
    var order = manifest.PHASE3_WARM_ORDER.slice();
    var i = 0;
    function next() {
      if (i >= order.length) {
        mark('phase3_warm_done');
        return;
      }
      var name = order[i++];
      ensureFeature(name)
        .catch(function () {})
        .then(function () {
          if (legacy) {
            next();
            return;
          }
          if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(
              function () {
                setTimeout(next, 0);
              },
              { timeout: 2500 }
            );
          } else {
            setTimeout(next, 200);
          }
        });
    }
    if (legacy) {
      next();
    } else if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(next, { timeout: 4000 });
    } else {
      setTimeout(next, 800);
    }
  }

  function start() {
    mark('boot_phases_start');
    // Logged-in session: start Phase 2 immediately. Logged-out: yield once so login can paint/type.
    var startPhase2 = function () {
      // Avoid unhandledrejection → Sentry when a shell script fails after retries.
      runPhase2().catch(function (err) {
        console.error('[GurigoBoot] Phase 2 start failed:', err);
      });
    };

    var maybeUser = null;
    try {
      maybeUser =
        typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser;
    } catch (_) {}

    var oauthPending =
      global.__oauthRedirectBootPending === true ||
      (global.__gurigoAuthBoot && !global.__gurigoAuthBoot.completed);

    if (maybeUser || oauthPending) {
      startPhase2();
    } else {
      // Let login UI process a frame, then warm the shell in background.
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () {
          setTimeout(startPhase2, 0);
        });
      } else {
        setTimeout(startPhase2, 0);
      }
    }
  }

  global.GurigoBoot = {
    start: start,
    whenReady: whenReady,
    runPhase2: runPhase2,
    ensureFeature: ensureFeature,
    ensureFeaturesForTab: ensureFeaturesForTab,
    isPhase2Ready: function () {
      return phase2Ready;
    }
  };
})(typeof window !== 'undefined' ? window : this);
