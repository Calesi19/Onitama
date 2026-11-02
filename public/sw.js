// Hand-rolled service worker: cache-first for same-origin requests so the
// game works fully offline after the first load. Bump CACHE_VERSION to
// invalidate old caches on deploy.
const CACHE_VERSION = 'onitama-v5';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './fonts/shippori-mincho-500.woff2',
  './fonts/shippori-mincho-700.woff2',
  './fonts/zen-kaku-gothic-new-400.woff2',
  './fonts/zen-kaku-gothic-new-700.woff2',
];

// The built script and stylesheet have hashed names, so read them from the
// page. Without this they would only be cached on the second visit.
async function precache() {
  const cache = await caches.open(CACHE_VERSION);
  await cache.addAll(CORE_ASSETS);
  const page = await (await cache.match('./index.html')).text();
  const built = [...page.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)].map((m) => m[1]);
  await cache.addAll(built);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => {
          if (request.mode === 'navigate') return caches.match('./index.html', { ignoreSearch: true });
          throw new Error('offline and not cached');
        });
    }),
  );
});
