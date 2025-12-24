const CACHE_NAME = "infra-api-todo-v1";
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json"
  // puedes agregar CSS/JS si los tienes en archivos separados
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si está en cache, responde con cache. Si no, va a la red.
      return response || fetch(event.request);
    })
  );
});
