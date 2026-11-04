/**
 * GuriGO – boot performance marks (no behavior change).
 */
(function (global) {
  'use strict';

  var marks = Object.create(null);

  function isDiagnosticConsole() {
    try {
      if (global.__GURIGO_BOOT_DEBUG__) return true;
      var loc = global.location;
      if (!loc) return false;
      var host = loc.hostname || '';
      var path = loc.pathname || '';
      var search = loc.search || '';
      if (host === 'localhost' || host === '127.0.0.1') return true;
      if (path.indexOf('/beta') === 0 || search.indexOf('beta=1') !== -1) return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  function mark(name) {
    if (!name || marks[name] != null) return marks[name];
    var t = Math.round(
      typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()
    );
    marks[name] = t;
    try {
      if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark('gurigo:' + name);
      }
    } catch (_) {}
    try {
      if (global.__GURIGO_BOOT_DEBUG__) {
        console.log('[GurigoBoot]', name, t + 'ms');
      }
    } catch (_) {}
    return t;
  }

  function getMarks() {
    var out = {};
    for (var k in marks) {
      if (Object.prototype.hasOwnProperty.call(marks, k)) out[k] = marks[k];
    }
    return out;
  }

  global.__gurigoBootMarks = marks;
  global.gurigoIsDiagnosticConsole = isDiagnosticConsole;
  global.GurigoBootMarks = { mark: mark, getMarks: getMarks, isDiagnosticConsole: isDiagnosticConsole };
  mark('boot_marks_ready');
})(typeof window !== 'undefined' ? window : this);
