const CACHE_VERSION = "sari-v4.1.1";
const CACHE_NAME = `sari-static-${CACHE_VERSION}`;
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icon-192.png",
  "/apple-touch-icon.png",
];
const NAVIGATION_FALLBACK = "/index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch(() => cache.add(NAVIGATION_FALLBACK))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("sari-") && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never intercept API calls — always go live
  if (url.pathname.startsWith("/api/")) return;

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const cacheAndReturn = async (req) => {
    const cached = await caches.match(req);
    const networkPromise = fetch(req)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return res;
      })
      .catch(() => null);

    // Navigation: network-first, fallback to cache, then shell
    if (req.mode === "navigate") {
      const net = await networkPromise;
      if (net && net.ok) return net;
      return cached || (await caches.match(NAVIGATION_FALLBACK));
    }

    // Assets: cache-first, background-refresh
    if (cached) {
      event.waitUntil(networkPromise);
      return cached;
    }
    return networkPromise || caches.match(NAVIGATION_FALLBACK);
  };

  event.respondWith(cacheAndReturn(event.request));
});

// Receive skip-waiting message from update prompt
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
