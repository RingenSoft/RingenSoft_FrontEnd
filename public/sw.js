/**
 * FishRoute Pro — Service Worker
 * Estrategia: Cache-First para assets estáticos, Network-First para API.
 * Permite uso offline con la última ruta y condiciones guardadas.
 */

const CACHE_NAME     = 'fishroute-v1';
const API_CACHE_NAME = 'fishroute-api-v1';

// Assets del app shell que siempre se cachean
const SHELL_ASSETS = [
  '/',
  '/index.html',
];

// Rutas de la API que se cachean para uso offline
const API_CACHE_PATTERNS = [
  '/api/v2/puertos',
  '/api/v2/historial',
  '/api/v2/embarcaciones',
  '/api/v2/estadisticas',
];

// ── Instalación: cachear app shell ──────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ── Activación: limpiar caches antiguos ─────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== API_CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: estrategia según tipo de recurso ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Tiles del mapa: cache-first con TTL implícito
  if (url.hostname.includes('cartocdn.com') || url.hostname.includes('openseamap.org')) {
    event.respondWith(cacheFirst(event.request, CACHE_NAME));
    return;
  }

  // Llamadas API: network-first con fallback a cache
  if (url.pathname.startsWith('/api/v2/')) {
    event.respondWith(networkFirstWithCache(event.request));
    return;
  }

  // App shell: cache-first
  if (event.request.mode === 'navigate' || event.request.destination === 'script'
      || event.request.destination === 'style') {
    event.respondWith(cacheFirst(event.request, CACHE_NAME));
    return;
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return cached || new Response('Offline — sin datos en caché', { status: 503 });
  }
}

async function networkFirstWithCache(request) {
  const cache = await caches.open(API_CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      // Inyectar header para que el cliente sepa que viene de caché
      const headers = new Headers(cached.headers);
      headers.set('X-From-SW-Cache', 'true');
      return new Response(cached.body, { status: cached.status, headers });
    }
    return new Response(JSON.stringify({ error: 'Sin conexión', offline: true }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
