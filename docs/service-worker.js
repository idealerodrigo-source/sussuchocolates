const CACHE_VERSION = 'sussu-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

// Assets essenciais para cache
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
];

// Instalar
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Ativa imediatamente sem aguardar
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

// Ativar — limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim()) // Assume controle imediato
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar não-GET
  if (request.method !== 'GET') return;

  // Ignorar cross-origin (Railway API, CDNs externos)
  if (url.origin !== self.location.origin) return;

  // Ignorar rotas do sistema de gestão
  if (url.pathname.startsWith('/sistema') || url.pathname.startsWith('/api')) return;

  // HTML — sempre buscar na rede (garante atualização automática)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          // Avisar clientes sobre nova versão disponível
          self.clients.matchAll().then(clients =>
            clients.forEach(client => client.postMessage({ type: 'NEW_VERSION' }))
          );
          return res;
        })
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Imagens e assets JS/CSS — cache first, atualiza em background
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request).then(res => {
          if (res.ok) {
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, res.clone()));
          }
          return res;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }
});

// Mensagem do cliente para pular waiting
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
