/*
 * Service worker de BIR Prep.
 *
 * Sólo cachea recursos estáticos (JS/CSS con hash, iconos, imágenes) y una
 * página offline. NUNCA las páginas ni los datos: son privados y quedarían
 * accesibles tras cerrar sesión. Al activarse borra cualquier caché
 * anterior (la v1 guardaba páginas autenticadas).
 */
const CACHE_NAME = 'bir-prep-static-v2';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

function esEstatico(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/')
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegaciones: siempre red; sin conexión, página offline genérica
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Estáticos con hash: caché primero (no cambian nunca)
  if (esEstatico(url)) {
    event.respondWith(
      caches.match(request).then(
        (cacheada) =>
          cacheada ||
          fetch(request).then((respuesta) => {
            if (respuesta.ok) {
              const copia = respuesta.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copia));
            }
            return respuesta;
          })
      )
    );
  }
  // Todo lo demás (RSC, API, datos): directo a la red, sin cachear
});

// Al tocar una notificación del Pomodoro, volver a la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => 'focus' in v);
      return abierta ? abierta.focus() : self.clients.openWindow('/dashboard');
    })
  );
});
