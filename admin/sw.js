const CACHE_NAME = 'liveasta-admin-mvp-0.1.0';
const APP_SHELL = ['./','./index.html','./styles.css','./config.js','./app.js','./manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

// Fase 2: il push handler verrà aggiunto dopo la validazione dell'MVP.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const absoluteTarget = new URL(target, self.registration.scope).href;
      for (const client of clients) {
        if ('focus' in client) {
          if ('navigate' in client) await client.navigate(absoluteTarget);
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(absoluteTarget) : undefined;
    })
  );
});
