/* ============================================
   Service Worker — 幼师AI助手 PWA
   ============================================ */

var CACHE_NAME = 'preschool-ai-v1';
var STATIC_ASSETS = [
  './index.html',
  './css/style.css',
  './css/themes.css',
  './js/db.js',
  './js/router.js',
  './js/settings.js',
  './js/api.js',
  './js/voice-input.js',
  './js/template-parser.js',
  './js/resource-library.js',
  './js/prompt-builder.js',
  './js/docx-exporter.js',
  './js/paper-workflow.js',
  './js/generator-workflow.js',
  './js/app.js',
  './pages/home.html',
  './pages/library.html',
  './pages/settings.html',
  './pages/generate-plan.html',
  './pages/generate-paper.html',
  './pages/generate-paper-hastopic.html',
  './pages/generate-paper-notopic.html',
  './pages/generate-other.html',
  './pages/documents.html',
  './pages/document-view.html',
  './offline.html'
];

var CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/dexie/dist/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/mammoth/mammoth.browser.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/docx/build/index.min.js'
];

// Install: pre-cache static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS).catch(function(err) {
        console.log('SW install cache error (non-fatal):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
          .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Cache-first for static, Network-first for pages, Cache for CDN
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls (DeepSeek, etc.)
  if (url.includes('api.deepseek.com') || url.includes('dashscope.aliyuncs.com')) return;

  // CDN assets: cache-first
  if (CDN_ASSETS.some(function(cdn) { return url.includes(cdn.split('/').pop()); })) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        return cached || fetch(event.request).then(function(response) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
          return response;
        });
      })
    );
    return;
  }

  // HTML pages: network-first with offline fallback
  if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(event.request).then(function(cached) {
          return cached || caches.match('./offline.html');
        });
      })
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
        return response;
      });
    })
  );
});
