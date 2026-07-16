// Service worker do Grimório — modo offline pra mesa de jogo sem Wi-Fi.
//
// Estratégia em duas camadas:
//  · App shell (html/css/jsx): NETWORK-FIRST — online sempre pega o código
//    mais novo (inclusive em dev); offline cai pro cache.
//  · Dados e vendors (JSONs de magias, fontes, unpkg): stale-while-revalidate —
//    responde do cache na hora e atualiza em segundo plano (mudam raramente).
// Os 4 JSONs são pré-cacheados no install (em background, não bloqueia o boot),
// então o app inteiro funciona offline já a partir da primeira visita.
const CACHE_VERSION = 'grimorio-v1';

// Extensões do app shell (código que muda a cada deploy) → network-first.
const SHELL_RE = /\.(html|css|jsx)$/;

const PRECACHE = [
  './',
  './index.html',
  './hifi-tokens.css',
  './grimorio-helpers.jsx',
  './i18n.jsx',
  './spells-data-loader.jsx',
  './v11-character-editor.jsx',
  './v10-hifi.jsx',
  './favicon.svg',
  './manifest.json',
  './fonts/texturina-latin.woff2',
  './fonts/texturina-latin-ext.woff2',
  './fonts/jetbrainsmono-latin.woff2',
  './fonts/jetbrainsmono-latin-ext.woff2',
  './spells-5E-2024-PTBR.json',
  './spells-5E-2014-PTBR.json',
  './spells-5E-2024-EN.json',
  './spells-5E-2014-EN.json',
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      // addAll falharia tudo se UM recurso falhar; cacheia um a um e ignora
      // os que não vierem — o fetch handler cobre o que faltar depois.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Só mesma origem + unpkg (React/Babel). Outros domínios passam direto.
  if (url.origin !== self.location.origin && url.hostname !== 'unpkg.com') return;

  const isShell = request.mode === 'navigate' || SHELL_RE.test(url.pathname);

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((res) => {
          if (res && res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => cached); // offline: fica com o cache (ou falha se nunca visto)
      // Shell: rede primeiro (código sempre fresco); dados: cache primeiro.
      return isShell ? network.then((res) => res || cached) : (cached || network);
    })
  );
});
