// Service worker do Grimório — modo offline pra mesa de jogo sem Wi-Fi.
//
// Estratégia em duas camadas:
//  · App shell (html/css/jsx): NETWORK-FIRST — online sempre pega o código
//    mais novo (inclusive em dev); offline cai pro cache.
//  · Dados e vendors (JSONs de magias, fontes, unpkg): stale-while-revalidate —
//    responde do cache na hora e atualiza em segundo plano (mudam raramente).
// Os JSONs de magias embutidos (a pasta packs/, listada em packs/index.js) são
// pré-cacheados no install (em background, não bloqueia o boot), então o app
// inteiro funciona offline já a partir da primeira visita.
// ponytail: a dispensa de bump vale só pra ACRÉSCIMO em PRECACHE —
// install() reabre o mesmo cache e só adiciona o que faltar, sem re-baixar
// o que já está cacheado. REMOÇÃO de entrada exige bump de CACHE_VERSION:
// só o activate() apaga cache cujo nome difere do atual.
//
// MUDAR O CONTEÚDO de um arquivo já listado no PRECACHE também exige bump, pelo
// mesmo motivo: install() não re-baixa o que já está no cache, e o navegador só
// reinstala o SW quando o próprio sw.js muda. Sem bump, quem já tinha o cache
// anterior continua servindo o arquivo antigo indefinidamente — foi o que
// aconteceu ao regenerar srd-2014-en.json com as listas de classe (v2 → v3).
// A lista de slugs reservados (srd-reserved-slugs.json) também é pré-cacheada —
// o import a exige pra validar slugs offline.
// packs/index.js define self.BUILTIN_PACKS — o PRECACHE dos pacotes embutidos sai dele.
importScripts('./packs/index.js');

const CACHE_VERSION = 'grimorio-v8';

// Extensões do app shell (código que muda a cada deploy) → network-first.
const SHELL_RE = /\.(html|css|jsx)$/;

const PRECACHE = [
  './',
  './index.html',
  './pack-docs.html',
  './hifi-tokens.css',
  './grimorio-helpers.jsx',
  './i18n.jsx',
  './spells-data-loader.jsx',
  './plugin-store.jsx',
  './pack-import.jsx',
  './v11-character-editor.jsx',
  './pack-import-dialog.jsx',
  './pack-rename-dialog.jsx',
  './pack-manager.jsx',
  './transition-banner.jsx',
  './v10-hifi.jsx',
  './favicon.svg',
  './manifest.json',
  './pack.schema.json',
  './fonts/texturina-latin.woff2',
  './fonts/texturina-latin-ext.woff2',
  './fonts/jetbrainsmono-latin.woff2',
  './fonts/jetbrainsmono-latin-ext.woff2',
  './packs/index.js',
  ...(self.BUILTIN_PACKS || []).flatMap((p) => [p.file, p.image && 'packs/' + p.image].filter(Boolean).map((f) => './' + f)),
  './srd-reserved-slugs.json',
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js',
  'https://unpkg.com/dompurify@3.4.13/dist/purify.min.js',
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
      // IN-04: offline pra um recurso NUNCA cacheado faz `cached` ser
      // undefined - sem o Response.error() de fallback, respondWith()
      // resolveria pra undefined e o navegador reportaria um NetworkError
      // genérico (com TypeError barulhento no console do SW) em vez de cair
      // no tratamento offline padrão dele.
      return isShell ? network.then((res) => res || cached || Response.error()) : (cached || network);
    })
  );
});
