const CACHE_NAME = 'mediurg-v11';

// Assets statiques précachés à l'install (offline complet)
const BASE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/asset-manifest.json',
  '/favicon-32x32.png',
  '/icon-192.png',
  '/icon-192-maskable.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Précache des assets de base (HTML, manifest, icônes)
      await Promise.all(
        BASE_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] Échec précache:', url, err))
        )
      );

      // Précache des bundles JS/CSS depuis asset-manifest.json (data drugs/protocols incluses dans le bundle)
      try {
        const manifestRes = await fetch('/asset-manifest.json', { cache: 'no-store' });
        const manifest = await manifestRes.json();

        const entrypoints = (manifest.entrypoints || []).map((e) => `/${e}`);
        const allFiles = Object.values(manifest.files || {}).filter(
          (url) =>
            typeof url === 'string' &&
            (url.endsWith('.js') || url.endsWith('.css') || url.endsWith('.json') || url.endsWith('.png') || url.endsWith('.svg') || url.endsWith('.ico')) &&
            !url.endsWith('.map')
        );

        const urlsToCache = [...new Set([...entrypoints, ...allFiles])];
        console.log('[SW] Précache de', urlsToCache.length, 'assets pour mode offline');

        await Promise.all(
          urlsToCache.map((url) =>
            cache.add(url).catch((err) => console.warn('[SW] Échec asset:', url, err))
          )
        );
      } catch (err) {
        console.warn('[SW] Impossible de lire asset-manifest.json:', err);
      }

      console.log('[SW] Installation terminée — app prête en offline complet');
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

  // Stratégie cache-first pour les assets hashés (/static/) — contenu immuable
  if (url.pathname.startsWith('/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // Stratégie network-first pour les documents HTML — fraîcheur
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

  // Stratégie cache-first pour icônes / images / manifest
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
      )
    );
    return;
  }

  // Stratégie stale-while-revalidate pour le reste
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
