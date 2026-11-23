/* =====================================================================
   Space Edu 3D — Service Worker (Offline PWA + Update Detection Engine)
   ===================================================================== */

const CACHE_VERSION = 'space3d-v3.1.0';
const STATIC_CACHE = `space3d-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `space3d-runtime-${CACHE_VERSION}`;
const ASSET_CACHE = `space3d-assets-${CACHE_VERSION}`;

// Core application assets precached for offline experience
const PRECACHE_URLS = [
  '/',
  '/discovery',
  '/buran',
  '/satria-1',
  '/rascube',
  '/kratos',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/vendor/three.min.js',
  '/_shuttle/scan/scan-data.js',
  '/_shuttle/scan/buran-data.js',
  '/_shuttle/scan-orbiter.js',
  '/_shuttle/model.js',
  '/_shuttle/orbiter.js',
  '/_shuttle/buran-model.js',
  '/_shuttle/energia.js',
  '/_satria/satria-data.js',
  '/_satria/satria-model.js',
  '/_shuttle/three-stack-viewer.js',
  '/_nano/rascube-model.js',
  '/_nano/rascube-poin.js',
  '/_nano/kratos-model.js',
  '/_nano/kratos-poin.js',
  '/_nano/viewer.js',
  '/orbiter-usa.glb',
];

function getScopePath() {
  try {
    var path = new URL(self.registration.scope).pathname;
    return path.replace(/\/+$/, '');
  } catch (e) {
    return '';
  }
}

function toScopeUrl(urlPath) {
  var prefix = getScopePath();
  if (!prefix || urlPath.indexOf(prefix) === 0) return urlPath;
  return prefix + (urlPath.charAt(0) === '/' ? urlPath : '/' + urlPath);
}

// Install: Pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      const urls = PRECACHE_URLS.map(toScopeUrl);
      return cache.addAll(urls).catch((err) => {
        console.warn('[Service Worker] Pre-cache partial warning:', err);
      });
    })
  );
});

// Activate: Clean old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (
            key !== STATIC_CACHE &&
            key !== RUNTIME_CACHE &&
            key !== ASSET_CACHE
          ) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Listen for message to skip waiting (Triggered when user clicks "Perbarui Sekarang")
self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data.action === 'skipWaiting')) {
    self.skipWaiting();
  }
});

// Fetch event handler with intelligent routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin or non-GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 1. Navigation requests (HTML pages): Network First, fallback to Cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: match page from cache or fallback to root '/'
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match(toScopeUrl('/'));
          });
        })
    );
    return;
  }

  // 2. 3D Model files, GLB, audio, textures: Cache First with network fallback
  if (
    url.pathname.includes('/models/') ||
    url.pathname.includes('/shuttle/') ||
    url.pathname.includes('/_shuttle/') ||
    url.pathname.includes('/_satria/') ||
    url.pathname.includes('/_nano/') ||
    url.pathname.includes('/vendor/') ||
    url.pathname.endsWith('.glb') ||
    url.pathname.endsWith('.bin') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) {
            return cached;
          }
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Graceful return for missing asset while offline
              return new Response(null, { status: 503, statusText: 'Offline' });
            });
        });
      })
    );
    return;
  }

  // 3. Static scripts, CSS bundles, Next.js chunk files: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
