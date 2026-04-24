const CACHE_NAME = 'mediurg-v4';

const BASE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/asset-manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(BASE_URLS);

      try {
        const manifestRes = await fetch('/asset-manifest.json');
        const manifest = await manifestRes.json();

        const entrypoints = manifest.entrypoints || [];
        const allFiles = Object.values(manifest.files || {}).filter(
          (url) =>
            typeof url === 'string' &&
            (url.endsWith('.js') || url.endsWith('.css')) &&
            !url.endsWith('.map')
        );

        const urlsToCache = [...new Set([...entrypoints.map(e => `/${e}`), ...allFiles])];
        console.log('[SW] Assets à précacher:', urlsToCache);
        await cache.addAll(urlsToCache);
      } catch (err) {
        console.warn('[SW] Impossible de lire asset-manifest.json:', err);
      }

      console.log('[SW] Installation terminée');
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Suppression ancien cache:', name);
            return caches.delete(name);
          })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (!request.url.startsWith('http')) return;

  const url = new URL(request.url);

  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        }
        return response;
      }).catch(() => caches.match(request))
    );
    return;
  }

  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    )
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
