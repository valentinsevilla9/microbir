const CACHE_NAME = 'bir-prep-v1';

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activación y limpieza de cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(clients.claim());
});

// Interceptar peticiones de red (Estrategia: Network First, falling back to cache)
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones a la API de Supabase o extensiones de Chrome
  if (event.request.url.includes('supabase.co') || event.request.url.startsWith('chrome-extension')) {
    return;
  }

  // Para navegación y assets estáticos, intentar red y si falla usar caché
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Solo cachear peticiones GET válidas
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Si no hay red ni caché, devolvemos un fallo gracioso (se podría devolver un offline.html)
        return new Response('Estás sin conexión a internet y esta página no está en caché.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
  );
});
