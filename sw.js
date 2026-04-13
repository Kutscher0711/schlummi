// Schlummi Service Worker
const CACHE = 'schlummi-v1';
const OFFLINE_URL = '/';

// Bei Install: App-Shell cachen
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([OFFLINE_URL, '/favicon.ico'])
        .catch(() => {}) // Fehler ignorieren falls Assets nicht da
    )
  );
  self.skipWaiting();
});

// Bei Activate: alte Caches löschen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Network-first für API-Calls, Cache-first für Assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Supabase API + Edge Functions → immer Netzwerk
  if (url.hostname.includes('supabase.co')) return;

  // Navigation → Network-first, Fallback auf gecachte Root
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r ?? Response.error())
      )
    );
    return;
  }

  // Statische Assets → Cache-first
  event.respondWith(
    caches.match(request).then(
      (cached) => cached ?? fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
        }
        return response;
      })
    )
  );
});
