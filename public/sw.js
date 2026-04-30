// Service Worker for AI Haberleri PWA
const CACHE_NAME = "ai-haberleri-v3";
const urlsToCache = [
  "/manifest.json",
  "/logos/brand/logo-icon.png",
  "/logos/brand/ai-logo-dark.webp",
];

// Install event — cache only static assets, skip any that fail
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        urlsToCache.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[SW] Failed to cache:", url, err);
          })
        )
      );
    })
  );
  // Force activation without waiting for old SW to be unregistered
  self.skipWaiting();
});

// Fetch event - Network first, fallback to cache
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept non-http(s) requests (e.g. chrome-extension://)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return;
  }

  // Only cache GET requests, but still handle other methods
  if (event.request.method !== "GET") {
    event.respondWith(fetch(event.request));
    return;
  }

  // Skip caching for Next.js API routes and internal resources

  // Skip Service Worker for external scripts (Google Ads, GTM, Analytics)
  // Let browser handle these directly to avoid CSP violations
  if (
    url.hostname.includes("google") ||
    url.hostname.includes("googletagmanager.com") ||
    url.hostname.includes("googlesyndication.com") ||
    url.hostname.includes("doubleclick.net") ||
    url.hostname.includes("google-analytics.com") ||
    url.hostname.includes("cloudflareinsights.com")
  ) {
    // Don't intercept, let browser handle directly
    return;
  }

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin/") ||
    url.pathname.startsWith("/_next/")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // CRITICAL FIX: HTML dosyalarını ASLA cache'leme (hydration mismatch önleme)
  if (
    event.request.mode === "navigate" ||
    event.request.headers.get("accept")?.includes("text/html")
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Offline fallback (opsiyonel)
        return caches.match("/");
      }),
    );
    return;
  }

  const isImageRequest = event.request.destination === "image";

  event.respondWith(
    fetch(event.request)
      .then(async (response) => {
        const cachedResponse = isImageRequest
          ? await caches.match(event.request)
          : undefined;

        if (!response || response.status === 429) {
          return cachedResponse || response;
        }

        if (response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache).catch(() => {
            // Ignore non-cacheable requests safely
          });
        });

        return response;
      })
      .catch(async () => {
        return (await caches.match(event.request)) || Response.error();
      }),
  );
});

// Activate event - Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          }),
        );
      }),
    ]),
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
