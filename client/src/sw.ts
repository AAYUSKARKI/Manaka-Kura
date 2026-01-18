import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

// This line is where Vite/Workbox injects the list of files to cache
precacheAndRoute(self.__WB_MANIFEST);

cleanupOutdatedCaches();

// --- Your Custom PTT Logic ---

// Push notification support
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'New message in Manaka Kura',
    icon: '/image.png',
    badge: '/image.png',
    vibrate: [200, 100, 200],
    data: data.data || {}
  };

  event.waitUntil(self.registration.showNotification(data.title || 'PTT System', options));
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});