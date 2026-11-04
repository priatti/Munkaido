// GuriGO – PDF viewer overlay (multi-page scroll + back navigation)
(function () {
  'use strict';

  var STYLE_ID = 'gurigo-pdf-viewer-styles';
  var PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  var PDFJS_WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  var activeBlobUrl = null;
  var pdfJsLoadPromise = null;

  function t(key, fallback) {
    try {
      if (
        typeof translations !== 'undefined' &&
        typeof currentLang !== 'undefined' &&
        translations[currentLang] &&
        translations[currentLang][key]
      ) {
        return translations[currentLang][key];
      }
    } catch (_) {}
    return fallback || key;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.gurigo-pdf-viewer-overlay{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;background:#f3f4f6}',
      '.gurigo-pdf-viewer-header{min-height:calc(52px + env(safe-area-inset-top,0px));padding-top:env(safe-area-inset-top,0px);padding-left:12px;padding-right:12px;display:flex;align-items:center;gap:12px;background:#ffffff;color:#111827;border-bottom:1px solid rgba(0,0,0,.14);box-shadow:0 1px 4px rgba(0,0,0,.10);flex-shrink:0}',
      '.gurigo-pdf-back-btn{min-height:40px;border:0;border-radius:10px;padding:8px 12px;background:transparent;color:inherit;font-size:16px;font-weight:700;cursor:pointer;flex-shrink:0}',
      '.gurigo-pdf-back-btn:active{opacity:.75}',
      '.gurigo-pdf-viewer-title{font-size:15px;font-weight:600;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1;min-width:0}',
      '.gurigo-pdf-viewer-body{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;background:#f3f4f6}',
      '.gurigo-pdf-viewer-pages{display:flex;flex-direction:column;align-items:center;gap:12px;padding:12px;padding-bottom:max(16px,env(safe-area-inset-bottom,0px))}',
      '.gurigo-pdf-viewer-page-canvas{display:block;max-width:100%;height:auto;box-shadow:0 1px 6px rgba(0,0,0,.14);background:#ffffff}',
      '.gurigo-pdf-viewer-loading{padding:24px;text-align:center;color:#6b7280;font-size:14px}',
      '.gurigo-pdf-viewer-frame{width:100%;flex:1;border:0;background:#f3f4f6}',
      'html.dark .gurigo-pdf-viewer-overlay{background:#111827}',
      'html.dark .gurigo-pdf-viewer-header{background:#1f2937;color:#f9fafb;border-bottom-color:rgba(255,255,255,.18)}',
      'html.dark .gurigo-pdf-viewer-body,html.dark .gurigo-pdf-viewer-frame{background:#111827}',
      'html.dark .gurigo-pdf-viewer-loading{color:#9ca3af}',
      'html.dark .gurigo-pdf-viewer-page-canvas{box-shadow:0 1px 6px rgba(0,0,0,.45)}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensurePdfJs() {
    if (window.pdfjsLib) {
      if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      }
      return Promise.resolve(window.pdfjsLib);
    }
    if (pdfJsLoadPromise) return pdfJsLoadPromise;
    pdfJsLoadPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = PDFJS_URL;
      script.async = true;
      script.onload = function () {
        if (!window.pdfjsLib) {
          reject(new Error('pdf.js failed to load'));
          return;
        }
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
        resolve(window.pdfjsLib);
      };
      script.onerror = function () {
        pdfJsLoadPromise = null;
        reject(new Error('pdf.js script error'));
      };
      document.head.appendChild(script);
    });
    return pdfJsLoadPromise;
  }

  function releaseTrackedBlobUrl() {
    if (!activeBlobUrl) return;
    try {
      URL.revokeObjectURL(activeBlobUrl);
    } catch (_) {}
    activeBlobUrl = null;
  }

  function closeGurigoPdfViewer() {
    var overlay = document.getElementById('gurigoPdfViewerOverlay');
    if (!overlay) return;
    var iframe = overlay.querySelector('iframe');
    if (iframe) iframe.src = 'about:blank';
    overlay.remove();
    if (document.body.dataset.gurigoPdfViewerScrollLock === '1') {
      document.body.style.overflow = '';
      delete document.body.dataset.gurigoPdfViewerScrollLock;
    }
    releaseTrackedBlobUrl();
  }

  function mountIframeFallback(bodyEl, pdfUrl, title) {
    bodyEl.innerHTML = '';
    bodyEl.className = 'gurigo-pdf-viewer-body';
    bodyEl.style.overflow = 'hidden';
    var iframe = document.createElement('iframe');
    iframe.className = 'gurigo-pdf-viewer-frame';
    iframe.setAttribute('title', title);
    iframe.src = pdfUrl;
    bodyEl.appendChild(iframe);
  }

  function renderPdfPages(bodyEl, pagesEl, pdfSource, title) {
    return ensurePdfJs().then(function (pdfjsLib) {
      var task = pdfSource.blob
        ? pdfjsLib.getDocument({ data: pdfSource.blob })
        : pdfjsLib.getDocument(pdfSource.url);
      return task.promise.then(function (pdf) {
        pagesEl.innerHTML = '';
        var renderChain = Promise.resolve();
        for (var pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          (function (n) {
            renderChain = renderChain.then(function () {
              return pdf.getPage(n).then(function (page) {
                var pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
                var baseViewport = page.getViewport({ scale: 1 });
                var containerWidth = Math.max(280, (pagesEl.clientWidth || bodyEl.clientWidth || window.innerWidth) - 24);
                var cssScale = containerWidth / baseViewport.width;
                var viewport = page.getViewport({ scale: cssScale });
                var canvas = document.createElement('canvas');
                canvas.className = 'gurigo-pdf-viewer-page-canvas';
                canvas.style.width = Math.floor(viewport.width) + 'px';
                canvas.style.height = Math.floor(viewport.height) + 'px';
                canvas.width = Math.floor(viewport.width * pixelRatio);
                canvas.height = Math.floor(viewport.height * pixelRatio);
                var ctx = canvas.getContext('2d');
                var transform = pixelRatio !== 1
                  ? [pixelRatio, 0, 0, pixelRatio, 0, 0]
                  : null;
                pagesEl.appendChild(canvas);
                return page.render({
                  canvasContext: ctx,
                  viewport: viewport,
                  transform: transform
                }).promise;
              });
            });
          })(pageNum);
        }
        return renderChain;
      });
    }).catch(function (err) {
      console.warn('[PdfViewer] PDF.js render failed, iframe fallback', err);
      if (pdfSource.url) {
        mountIframeFallback(bodyEl, pdfSource.url, title);
      } else {
        pagesEl.innerHTML = '<div class="gurigo-pdf-viewer-loading">' + t('pdfViewerLoadError', 'Could not display PDF.') + '</div>';
      }
    });
  }

  function openGurigoPdfViewer(pdfUrl, options) {
    if (!pdfUrl && !(options && options.blob)) return false;
    options = options || {};
    ensureStyles();
    closeGurigoPdfViewer();

    if (options.trackBlobUrl && pdfUrl) {
      activeBlobUrl = pdfUrl;
    }

    var title = options.title || t('pdfViewerTitle', 'Report');
    var backLabel = options.backLabel || t('pdfViewerBack', 'Back');

    var overlay = document.createElement('div');
    overlay.id = 'gurigoPdfViewerOverlay';
    overlay.className = 'gurigo-pdf-viewer-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);

    var header = document.createElement('div');
    header.className = 'gurigo-pdf-viewer-header';

    var backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'gurigo-pdf-back-btn';
    backBtn.id = 'gurigoPdfViewerBackBtn';
    backBtn.textContent = '\u2190 ' + backLabel;

    var titleEl = document.createElement('div');
    titleEl.className = 'gurigo-pdf-viewer-title';
    titleEl.textContent = title;

    var bodyEl = document.createElement('div');
    bodyEl.className = 'gurigo-pdf-viewer-body';

    var pagesEl = document.createElement('div');
    pagesEl.className = 'gurigo-pdf-viewer-pages';
    pagesEl.innerHTML = '<div class="gurigo-pdf-viewer-loading">' + t('pdfViewerLoading', 'Loading…') + '</div>';
    bodyEl.appendChild(pagesEl);

    header.appendChild(backBtn);
    header.appendChild(titleEl);
    overlay.appendChild(header);
    overlay.appendChild(bodyEl);
    document.body.appendChild(overlay);

    document.body.dataset.gurigoPdfViewerScrollLock = '1';
    document.body.style.overflow = 'hidden';

    function handleBack() {
      closeGurigoPdfViewer();
      if (typeof options.onBack === 'function') {
        options.onBack();
      }
    }

    backBtn.addEventListener('click', handleBack);

    function normalizePdfBlobInput(blobInput) {
      if (!blobInput) return Promise.resolve(null);
      if (blobInput instanceof ArrayBuffer) return Promise.resolve(blobInput);
      if (blobInput instanceof Blob && typeof blobInput.arrayBuffer === 'function') {
        return blobInput.arrayBuffer();
      }
      return Promise.resolve(blobInput);
    }

    normalizePdfBlobInput(options.blob).then(function (blobData) {
      return renderPdfPages(bodyEl, pagesEl, {
        url: pdfUrl || null,
        blob: blobData
      }, title);
    });

    return true;
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

  function triggerBlobPdfDownload(blob, fileName) {
    if (!blob || !fileName) return false;
    try {
      var downloadUrl = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () {
        try { URL.revokeObjectURL(downloadUrl); } catch (_) {}
      }, 1000);
      return true;
    } catch (err) {
      console.warn('[PdfViewer] Anchor download failed', err);
      return false;
    }
  }

  function openBlobInGurigoPdfViewer(blob, options) {
    if (!blob) return false;
    options = options || {};
    var blobUrl = URL.createObjectURL(blob);
    var opened = openGurigoPdfViewer(blobUrl, {
      title: options.title || t('pdfViewerTitle', 'Report'),
      backLabel: options.backLabel,
      trackBlobUrl: true,
      blob: blob,
      onBack: options.onBack
    });
    if (!opened) {
      try { URL.revokeObjectURL(blobUrl); } catch (_) {}
    }
    return opened;
  }

  function previewAndOptionallyDownloadPdfBlob(blob, fileName, options) {
    options = options || {};
    var opened = openBlobInGurigoPdfViewer(blob, options);
    if (opened) {
      if (!isIosPdfInlineOpenRisk()) {
        triggerBlobPdfDownload(blob, fileName);
      }
      return true;
    }
    if (triggerBlobPdfDownload(blob, fileName)) {
      return true;
    }
    if (typeof options.onSaveFallback === 'function') {
      options.onSaveFallback();
      return true;
    }
    return false;
  }

  window.openGurigoPdfViewer = openGurigoPdfViewer;
  window.closeGurigoPdfViewer = closeGurigoPdfViewer;
  window.isIosPdfInlineOpenRisk = isIosPdfInlineOpenRisk;
  window.triggerBlobPdfDownload = triggerBlobPdfDownload;
  window.openBlobInGurigoPdfViewer = openBlobInGurigoPdfViewer;
  window.previewAndOptionallyDownloadPdfBlob = previewAndOptionallyDownloadPdfBlob;
})();
