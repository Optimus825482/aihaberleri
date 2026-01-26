// Service Worker for AI Haberleri PWA
const CACHE_NAME = "ai-haberleri-v2";
const urlsToCache = [
  "/",
  "/manifest.json",
  "/logos/brand/logo-icon.png",
  "/logos/brand/logo-primary.png",
];

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)),
  );
});

// Fetch event - Network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Only cache GET requests, but still handle other methods
  if (event.request.method !== "GET") {
    event.respondWith(fetch(event.request));
    return;
  }

  // Skip caching for Next.js API routes and internal resources
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.includes("extension:")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      }),
  );
});

// Activate event - Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

// Push notification event
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "AI Haberleri";
  const options = {
    body: data.body || "Yeni bir haber yayınlandı!",
    icon: "/logos/brand/logo-icon.png",
    badge: "/logos/brand/logo-icon.png",
    data: data.url || "/",
    vibrate: [200, 100, 200],
    tag: "ai-news-notification",
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(clients.openWindow(event.notification.data));
});
