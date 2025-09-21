/* Safer cache strategy + cache bump */
const CACHE_NAME = 'conectadosx-v2';
const ASSETS = [
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
];

/* Instala e faz cache dos assets principais */
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

/* Remove caches antigos */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k !== CACHE_NAME && caches.delete(k)))))
  );
  self.clients.claim();
});

/* Estratégia:
   - Navegação (HTML): network-first, fallback para index.html offline
   - Demais GET same-origin: cache-first, atualiza em 2º plano
*/
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('index.html', copy));
          return res;
        })
        .catch(() => caches.match('index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});
