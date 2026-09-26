const CACHE = 'liveasta-v1.07.7';
const OFFLINE = '/offline.html';
const CORE = [OFFLINE, '/manifest.webmanifest', '/icon-192.png', '/icon-512.png',
  '/icon-maskable-192.png', '/icon-maskable-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('liveasta-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Room state, credentials and API responses must never enter the PWA cache.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, {cache:'no-store'}).catch(async () =>
      (await caches.match(OFFLINE)) || Response.error()));
    return;
  }
  const staticFile = /^\/(scripts|styles|assets)\/.+\.(js|css|png|webp|svg|woff2?)$/i.test(url.pathname)
    || /^\/(icon[^/]*\.png|manifest\.webmanifest)$/.test(url.pathname);
  if (!staticFile) return;
  event.respondWith((async () => {
    try {
      const response = await fetch(request, {cache:'no-store'});
      if (response.ok && response.type !== 'opaque') {
        try { await (await caches.open(CACHE)).put(request, response.clone()); } catch (_) {}
      }
      return response;
    } catch (_) {
      return (await caches.match(request)) || Response.error();
    }
  })());
});
