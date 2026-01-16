// Service Worker for PTT System
const CACHE_NAME = 'manaka-kura-v1.0.1';
const RUNTIME_CACHE = 'manaka-kura-runtime';

// Assets to cache immediately
const PRECACHE_ASSETS = [
  // '/',
  // '/index.html',
  // '/css/styles.css',
  // '/js/main.js',
  // '/workers/ws-worker.js',
  // '/manifest.json'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Precaching complete');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Precaching failed:', err);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip WebSocket connections
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // Skip API calls - always go to network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(err => {
          console.error('[SW] API fetch failed:', err);
          return new Response(
            JSON.stringify({ error: 'Network error' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }
if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Update the cache with the fresh index.html
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request)) // Fallback to cache ONLY if offline
    );
    return;
  }
  // For static assets: Cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cached version and update cache in background
          fetchAndCache(request);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetchAndCache(request);
      })
      .catch(err => {
        console.error('[SW] Fetch failed:', err);

        // Return offline page if available
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }

        throw err;
      })
  );
});

// Helper function to fetch and cache
async function fetchAndCache(request) {
  return fetch(request)
    .then(response => {
      // Don't cache non-successful responses
      if (!response || response.status !== 200 || response.type === 'error') {
        return response;
      }

      // Clone response for caching
      const responseToCache = response.clone();

      caches.open(RUNTIME_CACHE)
        .then(cache => {
          cache.put(request, responseToCache);
        });

      return response;
    });
}

// Push notification support (future feature)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const data = event.data ? event.data.json() : {};
  const title = data.title || 'PTT System';
  const options = {
    body: data.body || 'New message',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'ptt-notification',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If app is already open, focus it
        for (let client of clientList) {
          if (client.url === self.registration.scope && 'focus' in client) {
            return client.focus();
          }
        }

        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Periodic background sync support (future feature)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-messages') {
    console.log('[SW] Periodic sync: checking messages');
    event.waitUntil(checkForMessages());
  }
});

async function checkForMessages() {
  // Future: Check for new messages while app is closed
  console.log('[SW] Checking for messages...');
}

// Message handling from client
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(RUNTIME_CACHE)
        .then(cache => cache.addAll(event.data.urls))
    );
  }
});

console.log('[SW] Service Worker loaded');