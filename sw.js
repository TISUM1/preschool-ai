var CACHE_NAME = 'preschool-ai-v11';
var CACHE_URLS = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/db.js',
  'js/api.js',
  'js/settings.js',
  'js/router.js',
  'js/prompt-builder.js',
  'js/resource-library.js',
  'js/generator-workflow.js',
  'js/paper-workflow.js',
  'js/template-parser.js',
  'js/docx-exporter.js',
  'pages/home.html',
  'pages/settings.html',
  'pages/library.html',
  'pages/documents.html',
  'pages/classes.html',
  'pages/generate-plan.html',
  'pages/generate-other.html',
  'pages/generate-paper.html',
  'pages/generate-paper-hastopic.html',
  'manifest.json',
  'https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.min.js',
  'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  'https://cdn.jsdelivr.net/npm/docx@8.2.3/build/index.umd.min.js'
];

// Install: pre-cache all resources
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS);
    })
  );
  // Activate immediately without waiting
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
          .map(function(n) { return caches.delete(n); })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch: network-first for HTML/JS/CSS, cache-first for CDN libs
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // CDN libraries: cache-first (they rarely change)
  if (url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          if (response.ok) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
          }
          return response;
        });
      })
    );
    return;
  }

  // App files: network-first (always try to get latest)
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request);
    })
  );
});
