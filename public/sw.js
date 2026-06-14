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

  // Skip Service Worker for external domains — let browser handle directly
  const EXTERNAL_DOMAINS = [
    "google",
    "googletagmanager.com",
    "googlesyndication.com",
    "doubleclick.net",
    "google-analytics.com",
    "cloudflareinsights.com",
    "pollinations.ai",
    "picsum.photos",
    "yandex",
    "mc.yandex",
    "gstatic.com",
    "fonts.googleapis.com",
    "fonts.gstatic.com",
  ];
  if (EXTERNAL_DOMAINS.some((d) => url.hostname.includes(d))) {
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
  // Navigasyon hatalarında asla undefined dönme — "network error response" hatasını engeller
  if (
    event.request.mode === "navigate" ||
    event.request.headers.get("accept")?.includes("text/html")
  ) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cached = await caches.match("/");
        if (cached) return cached;
        return new Response(
          "<!DOCTYPE html><html><head><meta charset='utf-8'><title>AI Haberleri</title><meta name='viewport' content='width=device-width,initial-scale=1'><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#0a0a0f;color:#e2e8f0;text-align:center;padding:20px}div{max-width:400px}h1{font-size:1.5rem;margin-bottom:0.5rem}p{color:#94a3b8;font-size:0.9rem}</style></head><body><div><h1>Bağlantı Sorunu</h1><p>Sayfa yüklenirken bir hata oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.</p></div></body></html>",
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
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
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Never return Response.error() — causes "network error response" in console
        return new Response(null, { status: 503 });
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
