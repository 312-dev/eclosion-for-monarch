// Eclosion for Monarch - Service Worker for PWA functionality
const CACHE_NAME = 'eclosion-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Don't skip waiting - let user control when to update
});

// Activate event - clean up old caches and notify clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('eclosion-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Notify all clients that an update has been applied
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', cacheName: CACHE_NAME });
        });
      });
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
  // Verify the message origin matches our own origin to prevent cross-origin attacks
  // Service workers can only be registered by same-origin pages, but we validate anyway
  if (!event.origin || (event.origin !== self.location.origin && event.origin !== '')) {
    // In service workers, event.origin may be empty string for same-origin messages
    // Only allow messages from same origin or empty origin (same-origin case)
    if (event.origin !== '') {
      console.warn('Rejected message from unexpected origin:', event.origin);
      return;
    }
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Skip API requests - always go to network
  if (url.pathname.startsWith('/auth/') ||
      url.pathname.startsWith('/recurring/') ||
      url.pathname.startsWith('/security/')) {
    return;
  }

  // Version endpoints - always fetch from network (never cache)
  if (url.pathname === '/version' || url.pathname.startsWith('/version/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache on network failure
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // For navigation requests, return the cached index
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
