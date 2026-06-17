// ATLAS Service Worker for PWA functionality
const CACHE_NAME = 'atlas-v1.0.0';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/enhanced-dashboard', 
  '/health-insights',
  '/future-me',
  '/decision-hub',
  '/memory',
  '/copilot',
  '/settings',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('ATLAS: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('ATLAS: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request).then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Add to cache for future use
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // Fallback for navigation requests when offline
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Background sync for health data
self.addEventListener('sync', (event) => {
  if (event.tag === 'health-data-sync') {
    event.waitUntil(syncHealthData());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New health insight available!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 'health-notification'
    },
    actions: [
      {
        action: 'view-insights',
        title: 'View Insights',
        icon: '/icons/insights-96x96.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('ATLAS Health OS', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view-insights') {
    event.waitUntil(
      clients.openWindow('/health-insights')
    );
  } else if (event.action === 'dismiss') {
    // Just close the notification
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Sync health data function
async function syncHealthData() {
  try {
    // Get pending health data from IndexedDB
    const pendingData = await getPendingHealthData();
    
    if (pendingData.length > 0) {
      // Sync with server
      const response = await fetch('/api/health/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pendingData)
      });

      if (response.ok) {
        // Clear synced data
        await clearSyncedHealthData();
        console.log('ATLAS: Health data synced successfully');
      }
    }
  } catch (error) {
    console.error('ATLAS: Health data sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingHealthData() {
  // Implementation would use IndexedDB to get pending sync data
  return [];
}

async function clearSyncedHealthData() {
  // Implementation would clear synced data from IndexedDB
}