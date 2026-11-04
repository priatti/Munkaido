/**
 * GuriGO – Promise-based script loader (cached, with retries).
 * Retries absorb intermittent mobile / SW cache-miss failures that
 * otherwise surface as Sentry "Failed to load script: …".
 */
(function (global) {
  'use strict';

  var cache = Object.create(null);
  var DEFAULT_RETRIES = 3;

  function loadScriptOnce(src, opts) {
    return new Promise(function (resolve, reject) {
      try {
        var existing = document.querySelector('script[src="' + src.replace(/"/g, '\\"') + '"]');
        if (existing && existing.dataset.gurigoLoaded === '1') {
          resolve(src);
          return;
        }
      } catch (_) {}

      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      if (opts.crossOrigin) s.crossOrigin = opts.crossOrigin;
      s.dataset.gurigoBoot = opts.phase || '';
      s.onload = function () {
        s.dataset.gurigoLoaded = '1';
        resolve(src);
      };
      s.onerror = function () {
        try {
          if (s.parentNode) s.parentNode.removeChild(s);
        } catch (_) {}
        reject(new Error('Failed to load script: ' + src));
      };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  function loadScript(src, opts) {
    opts = opts || {};
    if (!src) return Promise.reject(new Error('loadScript: empty src'));
    if (cache[src]) return cache[src];

    var retries = opts.retries == null ? DEFAULT_RETRIES : opts.retries;
    var attempt = 0;

    cache[src] = (function tryLoad() {
      attempt += 1;
      return loadScriptOnce(src, opts).catch(function (err) {
        if (attempt >= retries) {
          delete cache[src];
          throw err;
        }
        var delay = Math.min(1200, 160 * Math.pow(2, attempt - 1));
        return new Promise(function (r) {
          setTimeout(r, delay);
        }).then(tryLoad);
      });
    })();

    return cache[src];
  }

  function loadScriptsSequential(urls, opts) {
    opts = opts || {};
    var yieldMs = opts.yieldMs == null ? 0 : opts.yieldMs;
    var i = 0;
    function next() {
      if (i >= urls.length) return Promise.resolve();
      var url = urls[i++];
      return loadScript(url, opts).then(function () {
        if (yieldMs < 0) return next();
        return new Promise(function (r) {
          setTimeout(function () {
            next().then(r);
          }, yieldMs);
        });
      });
    }
    return next();
  }

  global.GurigoLoadScript = {
    load: loadScript,
    loadSequential: loadScriptsSequential,
    _cache: cache
  };
  global.loadGurigoScript = loadScript;
})(typeof window !== 'undefined' ? window : this);
