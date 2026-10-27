/* ===========================================================================
   GGM Retailer Hub — service worker
   Makes the app installable on mobile and desktop and gives it a usable
   offline shell.

   Strategy
     • navigations  → network first (a fresh deploy is picked up immediately),
                      falling back to the cached shell when offline
     • static files  → cache first (Vite's /assets/* filenames are content
                      hashed, so a cached copy is always the right one)
     • everything else, and any cross-origin request (Supabase), goes straight
       to the network and is never cached.
   =========================================================================== */

const CACHE = "ggm-hub-v1";

/* The offline shell: enough to boot the app with no connection. */
const SHELL = ["/", "/index.html", "/manifest.json"];

/* Same-origin paths worth keeping a copy of. */
const CACHEABLE = ["/assets/", "/vendor/", "/icon/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  /* Page loads: prefer the network so a new release is never masked. */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/index.html", copy));
          return response;
        })
        .catch(() =>
          caches.match("/index.html").then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  /* Static files: serve from the cache, fill it in on first request. */
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const path = new URL(request.url).pathname;
        if (response.ok && CACHEABLE.some((prefix) => path.startsWith(prefix))) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
