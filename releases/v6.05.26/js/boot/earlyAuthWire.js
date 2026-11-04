/**
 * Wire login UI as soon as auth.js is available (do not wait for main.js / Phase 2).
 */
(function (global) {
  'use strict';

  function mark(name) {
    if (global.GurigoBootMarks && typeof global.GurigoBootMarks.mark === 'function') {
      global.GurigoBootMarks.mark(name);
    }
  }

  function wire() {
    if (global.__authScreenInited) {
      mark('early_auth_wire_already');
      return;
    }
    if (typeof global.initAuthScreen !== 'function') {
      console.error('[GurigoBoot] earlyAuthWire: initAuthScreen missing');
      return;
    }
    try {
      global.initAuthScreen();
      mark('early_auth_wire_done');
    } catch (e) {
      console.error('[GurigoBoot] earlyAuthWire failed:', e);
    }
  }

  // #auth-screen is already in the DOM when this script runs (Phase 1, after auth HTML).
  try {
    wire();
  } catch (_) {}
})(typeof window !== 'undefined' ? window : this);
