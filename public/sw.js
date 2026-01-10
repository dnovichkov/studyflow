// StudyFlow Service Worker for Push Notifications

const CACHE_NAME = 'studyflow-v1'
const STATIC_ASSETS = ['/', '/index.html']

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Push notification event
self.addEventListener('push', (event) => {
  let data = {
    title: 'StudyFlow',
    body: 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'studyflow-notification',
  }

  if (event.data) {
    try {
      const payload = event.data.json()
      data = {
        ...data,
        ...payload,
      }
    } catch {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data || {},
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen)
          return client.focus()
        }
      }
      // Open new window if none exists
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    })
  )
})

// Fetch event - network first strategy for API, cache first for static
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip external requests
  if (!request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone response for caching
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone)
        })
        return response
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(request)
      })
  )
})
